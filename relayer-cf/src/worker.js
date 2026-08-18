// cron ワーカー: 告知 / 投函 / execute / 残高警告。
// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI } from "./chain.js";
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

// 票一覧を取得。dirty(新規署名あり)または force のときだけ KV list を実行し、サマリーを書き直す。それ以外はサマリー(get 1 回)
async function loadVotes(store, proposalId, force) {
  const dirty = await store.isDirty(proposalId);
  if (!dirty && !force) return { summaries: await store.getSummary(proposalId), fulls: null };
  const fulls = await store.listVotesFull(proposalId);
  const summaries = fulls.map((v) => store.summarize(v.voter, v));
  await store.putSummary(proposalId, summaries);
  if (dirty) await store.clearDirty(proposalId);
  return { summaries, fulls };
}
async function saveVote(store, proposalId, voter, rec, summaries) {
  await store.putVote(proposalId, voter, rec);
  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
  const sm = store.summarize(voter, rec);
  if (i >= 0) summaries[i] = sm; else summaries.push(sm);
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
      const full = await store.getVote(proposalId, v.voter);
      if (!full) continue;
      if (rc && rc.status === "success") await saveVote(store, proposalId, v.voter, { ...full, txStatus: "success" }, summaries);
      else await saveVote(store, proposalId, v.voter, { ...full, tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined }, summaries);
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
  if (changed) await store.putSummary(proposalId, summaries);
  return changed;
}

async function submitPending(c, pc, wc, store, proposalId, inflight) {
  const { summaries, fulls } = await loadVotes(store, proposalId, false);
  if (summaries.some((v) => v.txStatus === "sent")) { if (!inflight.has(proposalId)) inflight.add(proposalId); return; } // 送信中は新規投函しない(確定は reconcileInflight)
  const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000).slice(0, c.maxBatch);
  if (!pendingSummaries.length) return;
  // 本文(署名)を取得(list 済みならその結果を使う)
  const pending = [];
  for (const s of pendingSummaries) { const v = fulls ? fulls.find((f) => f.voter.toLowerCase() === s.voter.toLowerCase()) : await store.getVote(proposalId, s.voter); if (v) pending.push({ ...v, voter: s.voter }); }
  // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
  const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
  const cands = [];
  let touched = false;
  for (let i = 0; i < pending.length; i++) {
    if (voted[i]) { await saveVote(store, proposalId, pending[i].voter, { ...pending[i], voter: undefined, tx: "external" }, summaries); touched = true; continue; }
    cands.push(pending[i]);
  }
  if (!cands.length) { if (touched) await store.putSummary(proposalId, summaries); return; }
  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
  // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
  let good = cands;
  try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
  catch (e) {
    if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); return; }
    good = [];
    for (const v of cands.slice(0, 10)) { // 個別確認は上限 10 件(サブリクエスト節約)
      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
      catch (e2) {
        if (isContractRevert(e2)) {
          const reason = (e2.shortMessage || e2.message || "").slice(0, 200);
          await saveVote(store, proposalId, v.voter, { ...v, voter: undefined, dropped: reason }, summaries); touched = true;
          console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`);
        }
      }
    }
    if (!good.length) { if (touched) await store.putSummary(proposalId, summaries); return; }
  }
  const args = good.map(toArg);
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
  console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}`);
  const sentAt = new Date().toISOString();
  for (const v of good) await saveVote(store, proposalId, v.voter, { ...v, voter: undefined, tx: hash, txStatus: "sent", sentAt }, summaries);
  await store.putSummary(proposalId, summaries);
  inflight.add(proposalId);
  // receipt は待たない(次回 tick の reconcileSent で確定・通知)
}

async function maybeExecute(c, pc, wc, store, p, block, mg, inflight) {
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
  inflight.add(String(p.id));
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

// 送信中 tx の確定処理(提案の Nouns 側 state に関係なく実行)。inflight はメモリで管理し tick 末尾に 1 回だけ書く
async function reconcileInflight(c, pc, wc, store, proposalsById, inflight) {
  for (const pid of [...inflight]) {
    try {
      const { summaries } = await loadVotes(store, pid, false);
      await reconcileSent(c, pc, store, pid, summaries);
      const p = proposalsById.get(Number(pid)) || { id: Number(pid), state: -1, stateName: "unknown", endBlock: 0 };
      const ex = await store.getExecuted(pid);
      if (ex && ex.pending && ex.tx) {
        const mg = await metagovInfo(c, pc, pid);
        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg, inflight); // pending 分岐だけが走る
      }
      const stillVotes = (await store.getSummary(pid)).some((v) => v.txStatus === "sent");
      const ex2 = await store.getExecuted(pid);
      if (!stillVotes && !(ex2 && ex2.pending)) inflight.delete(pid);
    } catch (e) { console.error(`[worker] reconcile prop ${pid} error:`, e.shortMessage || e.message); }
  }
}

let tickCount = 0;
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = clients(c);
  const store = makeStore(env.STATE);
  tickCount++;
  if (tickCount % 10 === 1) { try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
  const { block, proposals } = await recentProposals(c, pc);
  const inflightBefore = await store.getInflight();
  const inflight = new Set(inflightBefore.map(String));
  await reconcileInflight(c, pc, wc, store, new Map(proposals.map((p) => [p.id, p])), inflight);
  for (const p of proposals) {
    if (p.state !== 0 && p.state !== 1) continue;
    try {
      if (c.announce) await announceNew(c, pc, store, p, block);
      const mg = await metagovInfo(c, pc, p.id);
      if (!wc) continue;
      if (block < mg.deadline) await submitPending(c, pc, wc, store, String(p.id), inflight);
      else await maybeExecute(c, pc, wc, store, p, block, mg, inflight);
    } catch (e) {
      console.error(`[worker] prop ${p.id} error:`, e.shortMessage || e.message);
    }
  }
  // 回復: 30 tick に 1 回、直近提案のサマリー(get)に txStatus:sent が残っていれば inflight に戻す(単一キー消失対策)
  if (tickCount % 30 === 0) {
    for (const p of proposals.slice(0, 10)) {
      const sm = await store.getSummary(p.id);
      const ex = await store.getExecuted(p.id);
      if (sm.some((v) => v.txStatus === "sent") || (ex && ex.pending)) inflight.add(String(p.id));
    }
  }
  const after = [...inflight].sort();
  if (JSON.stringify(after) !== JSON.stringify([...inflightBefore.map(String)].sort())) await store.putInflight(after); // 1 tick 1 回だけ書く
}
export { notify };
