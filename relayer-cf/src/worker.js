// cron ワーカー: 告知 / 投函 / execute / 残高警告。
// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
import { keccak256, stringToBytes } from "viem";
import { makeStore } from "./store.js";

async function notify(c, text) {
  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
  try {
    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
    return true;
  }
  catch (e) { console.warn("discord notify failed", e.message); return false; }
}
const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;

// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
async function queueNotify(c, store, text, id = null) {
  if (await notify(c, text)) return true;
  const k = `${store.prefix}pendingnotes`;
  const arr = (await store.kvRaw.get(k, "json")) || [];
  if (id && arr.some((n) => n.id === id)) return false; // 同一 tx の通知は積み直さない(第13回監査)
  arr.push({ id, text, at: Date.now() });
  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
  return false;
}
async function flushPendingNotes(c, store) {
  const k = `${store.prefix}pendingnotes`;
  let arr;
  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
  if (!Array.isArray(arr) || !arr.length) return;
  const rest = []; const seen = new Set();
  for (const n of arr) {
    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
    if (n.id) { if (seen.has(n.id)) continue; seen.add(n.id); }
    if (!(await notify(c, n.text))) rest.push(n);
  }
  if (rest.length !== arr.length) {
    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
    else await store.kvRaw.delete(k);
  }
}
const WORDS = ["反対", "賛成", "棄権"];

// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
function revertErrorName(e) {
  let x = e;
  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
  return null;
}
function isContractRevert(e) {
  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
  let x = e;
  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
  return false;
}

async function announceNew(c, pc, store, p, block, snapInfo) {
  const prev = await store.getAnnounced(p.id);
  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
  const mg = await metagovInfo(c, pc, p.id);
  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
  if (c.snapshotSpace) {
    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    const lines = [
      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
      `締切: ${jst} ごろ (block ${mg.deadline})`,
      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    ];
    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    return;
  }
  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
  const deadlineBlock = mg.deadline || p.endBlock;
  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
  if (await notify(c, [
    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    `投票ページ: ${c.publicUrl}`,
    `提案の内容: https://nouns.wtf/vote/${p.id}`,
  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
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
      const mg = await metagovInfo(c, pc, proposalId);
      const sent = await queueNotify(c, store, [
        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
        `tx: ${explorerTx(c, tx)}`,
      ].join("\n"), tx);
      if (sent) await store.setFlag(`notified:${tx}`, 86400);
    } else {
      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
    }
  }
  if (changed) await flushSummary(store, proposalId, summaries);
  return changed;
}

// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
  const sentK = `${store.prefix}snapsent:${nounsId}`;
  const pending = await store.kvRaw.get(sentK, "json");
  if (pending) {
    let allMined = true, anySuccess = false, gasTotal = 0n;
    for (const tx of pending.txs) {
      let rc = null;
      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
      if (!rc) { allMined = false; continue; }
      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
    }
    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
    await store.kvRaw.delete(sentK);
    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
      const mg = await metagovInfo(c, pc, nounsId);
      const sent = await queueNotify(c, store, [
        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
        `tx: ${explorerTx(c, pending.txs[0])}`,
      ].join("\n"), pending.txs[0]);
      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
    }
    return;
  }

  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
  const scanK = scanKey(store, nounsId, snapInfo.snapId);
  const offset = Number(await store.kvRaw.get(scanK)) || 0;
  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
  const deadLetters = new Set(deadArr);
  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
  const owners = await allOwners(c, pc);
  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
  const tokenCounts = tokensByRow.map((ids) => ids.length);
  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
  const votedByToken = new Map();
  for (let start = 0; start < checkTokenIds.length; start += 200) {
    const ids = checkTokenIds.slice(start, start + 200);
    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
  }
  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
  const batches = rush ? c.rushBatches : 1;
  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }

  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
  for (const { row, index } of send) {
    const env = await fetchEnvelope(c, row, snapInfo.snapId);
    if (!env) {
      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
      if (fails[row.ipfs] >= 20) {
        deadArr.push(row.ipfs); deadChanged = true;
        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
      }
      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
    }
    const m = env.data.message;
    const tokenIds = [];
    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
    args.push(arg); cidOf.set(arg, row.ipfs);
  }
  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
  if (!args.length) return;

  const txs = []; let count = 0;
  for (let b = 0; b < batches; b++) {
    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
    if (!chunk.length) break;
    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
    catch (e) {
      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
      // 第13回監査 High の二重防御: 猶予境界の競合など、票の欠陥ではない revert は数えずに次 tick へ
      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
      const good = [];
      for (const a2 of chunk.slice(0, 10)) {
        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
        catch (e2) {
          const cid = cidOf.get(a2);
          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
          }
          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
        }
      }
      if (!good.length) continue;
      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
      catch (e3) {
        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
        good.length = 1;
      }
      chunk.length = 0; chunk.push(...good);
    }
    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
    txs.push(hash); count += chunk.length;
  }
  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
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
    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
    if (sent) await store.setFlag(ck.key, 86400);
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
let spaceCheckedAt = 0;

// ---- テスト用フック(本番経路では未使用) ----
// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
let _clients = clients;
export function __setClientsForTests(f) { _clients = f || clients; }
export function __resetWorkerStateForTests(o = {}) {
  lastErrNotify = o.errNotifiedAt ?? 0;
  lastBalanceCheck = o.balanceCheckedAt ?? 0;
  spaceCheckedAt = o.spaceCheckedAt ?? 0;
}
const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = _clients(c);
  const store = makeStore(env.STATE, storeNs(c));
  try {
    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
    const { block, proposals } = await recentProposals(c, pc);
    await reconcileRecent(c, pc, wc, store, proposals);
    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
    let snapByNouns = new Map();
    let unresolvedIds = new Set();
    let mappingsResolved = false;
    if (c.snapshotSpace) {
      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
        ], allowFailure: false });
        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
        if (c.network === "mainnet") {
          const relayerAddr = wc?.account?.address || null;
          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
        }
        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
        const floor = Math.max(300, c.minRegistrationDelay);
        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
        spaceCheckedAt = Date.now();
      }
      try {
        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
        const { mappings, unresolved } = await resolveMappings(c, pc, active);
        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
        unresolvedIds = new Set((unresolved || []).map(Number));
        mappingsResolved = true;
      }
      catch (e) { await notifyError(c, "snapshot hub", e); }
      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
      // 最終結果として確定してしまう。
      if (!mappingsResolved) return;
    }
    for (const p of proposals) {
      if (p.state !== 0 && p.state !== 1) continue;
      try {
        const snapInfo = snapByNouns.get(p.id) || null;
        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
          if (!(await store.getFlag(`unresolved:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
          }
          continue;
        }
        const mg = await metagovInfo(c, pc, p.id);
        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
        }
        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
        let timelineBad = false;
        if (c.snapshotSpace && snapInfo) {
          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
          }
        }
        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
        let graceBad = false;
        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
          }
        }
        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
        // 「告知済み」が記録されて正しい URL の再告知も止まる。
        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
          await announceNew(c, pc, store, p, block, snapInfo);
        }
        if (linkBad && c.network === "mainnet") continue;
        if (timelineBad && c.network === "mainnet") continue;
        if (graceBad && c.network === "mainnet") continue;
        if (!wc) continue;
        if (block < mg.deadline) {
          if (c.snapshotSpace) {
            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
            // これを投函失敗として数えると、猶予中(24h)に届いた正常票が dead-letter 化されるため、
            // 解禁ブロックまで投函自体を行わない(票は Snapshot に残り、解禁後に投函される)。
            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
              const rush = shouldRushSubmit(c, block, mg.deadline);
              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
            }
          }
          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
        } else if (!c.snapshotSpace || snapInfo) {
          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
          await maybeExecute(c, pc, wc, store, p, block, mg);
        }
      } catch (e) {
        await notifyError(c, `worker prop ${p.id}`, e);
      }
    }
  } catch (e) {
    await notifyError(c, "worker tick", e);
  }
}
export { notify };
