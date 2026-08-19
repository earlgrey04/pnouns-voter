// cron ワーカー: 告知 / 投函 / execute / 残高警告。
// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit } from "./chain.js";
import { makeStore } from "./store.js";

async function notify(c, text) {
  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
  if (!c.discordWebhook) return;
  try { await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }); }
  catch (e) { console.warn("discord notify failed", e.message); }
}
const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
const WORDS = ["反対", "賛成", "棄権"];

function isContractRevert(e) {
  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
  let x = e;
  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
  return false;
}

async function announceNew(c, pc, store, p, block) {
  if (await store.getAnnounced(p.id)) return;
  const mg = await metagovInfo(c, pc, p.id);
  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
  const deadlineBlock = mg.deadline || p.endBlock;
  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
  await store.putAnnounced(p.id, new Date().toISOString());
  await notify(c, [
    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    `投票ページ: ${c.publicUrl}`,
    `提案の内容: https://nouns.wtf/vote/${p.id}`,
  ].join("\n"));
}

// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
const FORCE_LIST_MS = 20 * 60 * 1000;
async function loadVotes(store, proposalId, force) {
  const sum = await store.getSummary(proposalId);
  const dirty = await store.dirtyAt(proposalId);
  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
  const listed = await store.listVoteSummaries(proposalId);
  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
  await store.putSummary(proposalId, summaries, listedAt);
  return { summaries, listedAt };
}
// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
function setStatus(summaries, voter, patch) {
  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
}
async function flushSummary(store, proposalId, summaries) {
  const sum = await store.getSummary(proposalId);
  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
}

// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
async function reconcileSent(c, pc, store, proposalId, summaries) {
  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
  if (!sent.length) return false;
  const byTx = new Map();
  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
  let changed = false;
  for (const [tx, vs] of byTx) {
    let rc = null;
    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
    }
    changed = true;
    if (rc && rc.status === "success") {
      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
      await store.setFlag(`notified:${tx}`, 86400);
      const mg = await metagovInfo(c, pc, proposalId);
      await notify(c, [
        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
        `tx: ${explorerTx(c, tx)}`,
      ].join("\n"));
    } else {
      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
    }
  }
  if (changed) await flushSummary(store, proposalId, summaries);
  return changed;
}

async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
  const { summaries } = await loadVotes(store, proposalId, rush);
  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
  let touched = false;
  for (let b = 0; b < batches; b++) {
    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
    if (!pendingSummaries.length) break;
    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
    const pending = [];
    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
    const cands = [];
    for (let i = 0; i < pending.length; i++) {
      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
      cands.push(pending[i]);
    }
    if (!cands.length) continue;
    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
    let good = cands;
    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
    catch (e) {
      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
      good = [];
      for (const v of cands.slice(0, 10)) {
        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
        catch (e2) {
          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
        }
      }
      if (!good.length) continue;
    }
    const args = good.map(toArg);
    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
    const sentAt = new Date().toISOString();
    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
    touched = true;
    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
      await new Promise((r) => setTimeout(r, 1500));
      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
    }
  }
  if (touched) await flushSummary(store, proposalId, summaries);
  // receipt は待たない(次回 tick の reconcile で確定・通知)
}

async function maybeExecute(c, pc, wc, store, p, block, mg) {
  const ex = await store.getExecuted(p.id);
  if (ex && ex.pending && ex.tx) {
    // 送信済み・未確定の execute を確定
    let rc = null;
    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
    const info = await metagovInfo(c, pc, p.id);
    if (rc && rc.status === "success") {
      if (info.executed) {
        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
        await notify(c, [
          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
          `tx: ${explorerTx(c, ex.tx)}`,
          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
        ].filter(Boolean).join("\n"));
      } else {
        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
      }
    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
    else await store.putExecuted(p.id, null); // 未実行 → 再試行
    return;
  }
  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
  if (ex && !ex.shadow) return;
  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
  if (mg.deadline === 0 || block < mg.deadline) return;
  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
    return;
  }
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
}

// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
async function checkBalance(c, pc, wc, store) {
  const threshold = Number(c.lowBalanceEth);
  const checks = [];
  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
  for (const ck of checks) {
    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
    if (await store.getFlag(ck.key)) continue;
    await store.setFlag(ck.key, 86400);
    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
  }
}

// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
async function reconcileRecent(c, pc, wc, store, proposals) {
  for (const p of proposals.slice(0, 15)) {
    try {
      const pid = String(p.id);
      const sum = await store.getSummary(pid);
      if (sum.votes.some((v) => v.txStatus === "sent")) {
        const summaries = [...sum.votes];
        await reconcileSent(c, pc, store, pid, summaries);
      }
      const ex = await store.getExecuted(pid);
      if (ex && ex.pending && ex.tx) {
        const mg = await metagovInfo(c, pc, pid);
        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
      }
    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
  }
}

// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
let lastErrNotify = 0;
export async function notifyError(c, where, e) {
  const msg = (e && (e.shortMessage || e.message)) || String(e);
  console.error(`[${where}]`, msg);
  if (Date.now() - lastErrNotify < 3600 * 1000) return;
  lastErrNotify = Date.now();
  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
}

let lastBalanceCheck = 0;
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = clients(c);
  const store = makeStore(env.STATE, storeNs(c));
  try {
    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
    const { block, proposals } = await recentProposals(c, pc);
    await reconcileRecent(c, pc, wc, store, proposals);
    for (const p of proposals) {
      if (p.state !== 0 && p.state !== 1) continue;
      try {
        if (c.announce) await announceNew(c, pc, store, p, block);
        const mg = await metagovInfo(c, pc, p.id);
        if (!wc) continue;
        if (block < mg.deadline) await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
        else await maybeExecute(c, pc, wc, store, p, block, mg);
      } catch (e) {
        await notifyError(c, `worker prop ${p.id}`, e);
      }
    }
  } catch (e) {
    await notifyError(c, "worker tick", e);
  }
}
export { notify };
