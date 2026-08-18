// cron ワーカー: 告知 / 投函 / execute。ローカル版 relayer/worker.js と同じロジック。
import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, DAO_ABI } from "./chain.js";
import { makeStore } from "./store.js";

async function notify(c, text) {
  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
  if (!c.discordWebhook) return;
  try { await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }); }
  catch (e) { console.warn("discord notify failed", e.message); }
}
const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;

async function announceNew(c, pc, store, kv, p, block) {
  if (await store.getAnnounced(p.id)) return;
  const mg = await metagovInfo(c, pc, p.id);
  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
  const title = await proposalTitle(c, pc, kv, p.id, p.creationBlock, p.state);
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

function isContractRevert(e) {
  // viem: ContractFunctionExecutionError → cause ContractFunctionRevertedError / 明示的な revert のみ「無効な署名」とみなす
  let x = e;
  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError" || x.name === "ContractFunctionZeroDataError") return true; x = x.cause; }
  return false;
}

// H-02: 送信済み(tx あり・未確定)の記録を receipt で確定させる。receipt が取れず一定時間経過なら on-chain 状態で判断して戻す
async function reconcileSent(c, pc, store, proposalId, all) {
  for (const v of all) {
    if (!v.tx || v.tx === "external" || v.txStatus === "success" || v.txStatus === "reverted") continue;
    let rc = null;
    try { rc = await pc.getTransactionReceipt({ hash: v.tx }); } catch { rc = null; }
    if (rc) {
      if (rc.status === "success") { await store.putVote(proposalId, v.voter, { ...v, voter: undefined, txStatus: "success" }); continue; }
      const already = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] });
      await store.putVote(proposalId, v.voter, { ...v, voter: undefined, tx: already ? "external" : undefined, txStatus: undefined, sentAt: undefined });
      continue;
    }
    // receipt なし: 10 分以上たっていれば on-chain 状態で判断(投票済みなら external、未投票なら再投函へ戻す)
    if (Date.now() - Date.parse(v.sentAt || v.receivedAt) > 10 * 60 * 1000) {
      const already = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] });
      await store.putVote(proposalId, v.voter, { ...v, voter: undefined, tx: already ? "external" : undefined, txStatus: undefined, sentAt: undefined });
      console.warn(`[worker] prop ${proposalId} ${v.voter}: tx ${v.tx} not mined in 10 min → ${already ? "external" : "requeue"}`);
    }
  }
}

async function submitPending(c, pc, wc, store, proposalId) {
  const all = await store.listVotes(proposalId);
  await reconcileSent(c, pc, store, proposalId, all);
  const fresh = await store.listVotes(proposalId);
  const pending = fresh.filter((v) => !v.tx && !v.dropped && Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000).slice(0, c.maxBatch);
  if (!pending.length) return;
  const good = [];
  for (const v of pending) {
    const arg = { proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature };
    // 署名は公開されており誰でも投函できる。既に他者が投函済み(on-chain hasVoted)なら external として記録
    const already = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] });
    if (already) { await store.putVote(proposalId, v.voter, { ...v, voter: undefined, tx: "external" }); continue; }
    try {
      await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[arg]], account: wc.account });
      good.push({ v, arg });
    } catch (e) {
      const reason = (e.shortMessage || e.message || "").slice(0, 200);
      if (isContractRevert(e)) { // M-02: コントラクトの revert だけ永久 drop。RPC 障害は次回再試行
        await store.putVote(proposalId, v.voter, { ...v, voter: undefined, dropped: reason });
        await store.log({ at: new Date().toISOString(), type: "drop", proposalId, voter: v.voter, reason });
        console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`);
      } else {
        console.warn(`[worker] simulate transient error prop ${proposalId} ${v.voter}: ${reason} (will retry)`);
      }
    }
  }
  if (!good.length) return;
  const args = good.map((g) => g.arg);
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
  console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}`);
  // 先に tx を「送信済み(未確定)」として記録。確定は receipt で(取れなければ次回 reconcileSent が処理)
  const sentAt = new Date().toISOString();
  for (const g of good) await store.putVote(proposalId, g.v.voter, { ...g.v, voter: undefined, tx: hash, txStatus: "sent", sentAt });
  let rc;
  try { rc = await pc.waitForTransactionReceipt({ hash, timeout: 60000 }); }
  catch (e) { console.warn(`[worker] receipt wait failed for ${hash}: ${e.shortMessage || e.message} (reconcile later)`); return; }
  await store.log({ at: new Date().toISOString(), type: "submit", proposalId, voters: good.map((g) => g.v.voter), tx: hash, gasUsed: String(rc.gasUsed), status: rc.status });
  if (rc.status !== "success") {
    for (const g of good) {
      const already = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), g.v.voter] });
      await store.putVote(proposalId, g.v.voter, { ...g.v, voter: undefined, tx: already ? "external" : undefined, txStatus: undefined, sentAt: undefined });
    }
    console.warn(`[worker] castVotesBySig prop ${proposalId} reverted (${hash}); re-evaluated ${good.length} votes`);
    return;
  }
  for (const g of good) await store.putVote(proposalId, g.v.voter, { ...g.v, voter: undefined, tx: hash, txStatus: "success", sentAt });
  const mg = await metagovInfo(c, pc, proposalId);
  await notify(c, [
    `🗳️ Prop ${proposalId}: ${args.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
    `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
    `tx: ${explorerTx(c, hash)}`,
  ].join("\n"));
}

async function maybeExecute(c, pc, wc, store, p, block) {
  const ex = await store.getExecuted(p.id);
  if (ex && ex.pending && ex.tx) {
    // H-02: 送信済み・未確定の execute を確定させる
    let rc = null;
    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
    const info = await metagovInfo(c, pc, p.id);
    if (rc && rc.status === "success") { await store.putExecuted(p.id, { ...ex, pending: false, status: "success", result: info.result, nounsReceipt: info.nounsReceipt }); return; }
    if (rc || Date.now() - Date.parse(ex.at) > 10 * 60 * 1000) {
      if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
      else await store.putExecuted(p.id, null); // 未実行のまま → 再試行
    }
    return;
  }
  if (ex) return;
  const mg = await metagovInfo(c, pc, p.id);
  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
  if (mg.deadline === 0 || block < mg.deadline) return;
  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) { // 票ゼロ → 投票しない(コントラクトも NoVotes で拒否する)
    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
    return;
  }
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult)); // Nouns refund 分は見積りに乗らない
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
  let rc;
  try { rc = await pc.waitForTransactionReceipt({ hash, timeout: 60000 }); }
  catch (e) { console.warn(`[worker] execute receipt wait failed for ${hash}: ${e.shortMessage || e.message} (reconcile later)`); return; }
  const after = await metagovInfo(c, pc, p.id);
  if (rc.status !== "success") {
    // 他者が先に execute した等。on-chain 済みなら external、そうでなければ記録を消して次回再試行
    if (after.executed) await store.putExecuted(p.id, { external: true, revertedTx: hash });
    else await store.putExecuted(p.id, null);
    console.warn(`[worker] execute prop ${p.id} reverted (${hash})`);
    return;
  }
  const receipt = after.nounsReceipt || { hasVoted: false, support: 0, votes: 0 };
  await store.putExecuted(p.id, { tx: hash, status: rc.status, result: after.result, gasUsed: String(rc.gasUsed), nounsReceipt: receipt, at: new Date().toISOString() });
  const word = ["反対", "賛成", "棄権"][after.result];
  await notify(c, [
    `✅ Prop ${p.id} を Nouns DAO に **${word}** で投票しました (${receipt.votes} 票)。`,
    `最終集計: 賛成 ${after.tokens[1]} / 反対 ${after.tokens[0]} / 棄権 ${after.tokens[2]} (投票者 ${after.voters[1]}/${after.voters[0]}/${after.voters[2]} 名)`,
    `Nouns DAO の記録: hasVoted=${receipt.hasVoted} support=${word} votes=${receipt.votes}`,
    `tx: ${explorerTx(c, hash)}`,
    c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${hash}?tab=logs` : null,
  ].filter(Boolean).join("\n"));
}

// リレイヤー残高が閾値未満なら 1 日 1 回 Discord に警告
async function checkBalance(c, pc, wc, kv) {
  const threshold = Number(c.lowBalanceEth);
  const checks = [];
  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
  for (const ck of checks) {
    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
    if (eth >= threshold) { await kv.delete(ck.key); continue; }
    if (await kv.get(ck.key)) continue; // 警告済み(24h)
    await kv.put(ck.key, new Date().toISOString(), { expirationTtl: 86400 });
    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
  }
}

export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = clients(c);
  const store = makeStore(env.STATE);
  if (!(await store.lock("tick", 60))) { console.log("[worker] tick skipped (locked)"); return; }
  try {
    try { await checkBalance(c, pc, wc, env.STATE); } catch (e) { console.warn("[worker] balance check failed", e.message); }
    const { block, proposals } = await recentProposals(c, pc);
    for (const p of proposals) {
      if (p.state !== 0 && p.state !== 1) continue;
      try {
        if (c.announce) await announceNew(c, pc, store, env.STATE, p, block);
        const mg = await metagovInfo(c, pc, p.id);
        if (!wc) continue;
        if (block < mg.deadline) await submitPending(c, pc, wc, store, String(p.id));
        else await maybeExecute(c, pc, wc, store, p, block);
      } catch (e) {
        console.error(`[worker] prop ${p.id} error:`, e.shortMessage || e.message);
      }
    }
  } finally {
    await store.unlock("tick");
  }
}
export { notify };
