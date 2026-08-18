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
  const title = await proposalTitle(c, pc, kv, p.id, p.creationBlock);
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

async function submitPending(c, pc, wc, store, proposalId) {
  const all = await store.listVotes(proposalId);
  const pending = all.filter((v) => !v.tx && !v.dropped && Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000);
  if (!pending.length) return;
  const good = [];
  for (const v of pending) {
    const arg = { proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature };
    try {
      await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[arg]], account: wc.account });
      good.push({ v, arg });
    } catch (e) {
      const reason = (e.shortMessage || e.message || "").slice(0, 200);
      await store.putVote(proposalId, v.voter, { ...v, voter: undefined, dropped: reason });
      await store.log({ at: new Date().toISOString(), type: "drop", proposalId, voter: v.voter, reason });
      console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`);
    }
  }
  if (!good.length) return;
  const args = good.map((g) => g.arg);
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 12n) / 10n });
  console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}`);
  // 先に tx を記録(二重投函防止)、その後 receipt を待つ
  for (const g of good) await store.putVote(proposalId, g.v.voter, { ...g.v, voter: undefined, tx: hash });
  const rc = await pc.waitForTransactionReceipt({ hash, timeout: 60000 });
  await store.log({ at: new Date().toISOString(), type: "submit", proposalId, voters: good.map((g) => g.v.voter), tx: hash, gasUsed: String(rc.gasUsed), status: rc.status });
  const mg = await metagovInfo(c, pc, proposalId);
  await notify(c, [
    `🗳️ Prop ${proposalId}: ${args.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
    `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
    `tx: ${explorerTx(c, hash)}`,
  ].join("\n"));
}

async function maybeExecute(c, pc, wc, store, p, block) {
  if (await store.getExecuted(p.id)) return;
  const mg = await metagovInfo(c, pc, p.id);
  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
  if (mg.deadline === 0 || block < mg.deadline) return;
  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult)); // Nouns refund 分は見積りに乗らない
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
  const rc = await pc.waitForTransactionReceipt({ hash, timeout: 60000 });
  const after = await metagovInfo(c, pc, p.id);
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
  if (!wc) return;
  const bal = await pc.getBalance({ address: wc.account.address });
  const eth = Number(bal) / 1e18;
  const threshold = Number(c.lowBalanceEth);
  if (eth >= threshold) { await kv.delete("lowbal"); return; }
  if (await kv.get("lowbal")) return; // 警告済み(24h)
  await kv.put("lowbal", new Date().toISOString(), { expirationTtl: 86400 });
  await notify(c, [
    `⚠️ リレイヤー残高が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`,
    `アドレス: ${wc.account.address} (${c.network})`,
    `投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。`,
  ].join("\n"));
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
