// ワーカー: 保留中の署名をまとめて castVotesBySig、締切後の提案を execute。Discord webhook で通知。
const { cfg, ethers, contracts, relayerWallet, recentProposals, metagovInfo, proposalTitle, withFallback, getProvider } = require("./chain");
const store = require("./store");

async function notify(text) {
  console.log("[notify]", text);
  if (!cfg.discordWebhook) return;
  try { await fetch(cfg.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }); } catch (e) { console.warn("discord notify failed", e.message); }
}
const explorerTx = (h) => `${cfg.explorer}/tx/${h}`;

async function submitPending(db, proposalId) {
  const pending = store.pendingVotes(db, proposalId).filter((v) => Date.now() - Date.parse(v.receivedAt) >= cfg.minPendingAgeSec * 1000);
  if (!pending.length) return;
  const wallet = relayerWallet();
  const c = contracts(wallet);
  // 個別に staticCall して通らない署名(所有権が変わった等)を落とす
  const good = [];
  for (const v of pending) {
    const arg = { proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature };
    try { await c.metagov.castVotesBySig.staticCall([arg]); good.push({ v, arg }); }
    catch (e) {
      const reason = e.shortMessage || e.message;
      db.votes[proposalId][v.voter].dropped = reason;
      db.log.push({ at: new Date().toISOString(), type: "drop", proposalId, voter: v.voter, reason });
      console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`);
    }
  }
  store.save(db);
  if (!good.length) return;
  const args = good.map((g) => g.arg);
  const est = await c.metagov.castVotesBySig.estimateGas(args);
  const tx = await c.metagov.castVotesBySig(args, { gasLimit: (est * 12n) / 10n });
  console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${tx.hash}`);
  const rc = await tx.wait();
  for (const g of good) db.votes[proposalId][g.v.voter].tx = tx.hash;
  db.log.push({ at: new Date().toISOString(), type: "submit", proposalId, voters: good.map((g) => g.v.voter), tx: tx.hash, gasUsed: String(rc.gasUsed) });
  store.save(db);
  const mg = await metagovInfo(proposalId);
  await notify([
    `🗳️ Prop ${proposalId}: ${args.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
    `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
    `tx: ${explorerTx(tx.hash)}`,
  ].join("\n"));
}

async function maybeExecute(db, p, block) {
  const mg = await metagovInfo(p.id);
  if (mg.executed || db.executed[p.id]) return;
  if (mg.deadline === 0 || block < mg.deadline) return;
  if (p.state !== 1 && p.state !== 0) { // Nouns 側がもう Active でない(取消等)なら記録だけ
    db.executed[p.id] = { skipped: `nouns state ${p.stateName}` }; store.save(db); return;
  }
  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) { // 票ゼロ → 投票しない
    db.executed[p.id] = { skipped: "no votes" }; store.save(db);
    await notify(`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。\n提案の内容: https://nouns.wtf/vote/${p.id}`);
    return;
  }
  const wallet = relayerWallet();
  const c = contracts(wallet);
  const est = await c.metagov.execute.estimateGas(p.id);
  const gasLimit = BigInt(Math.ceil(Number(est) * cfg.executeGasMult)); // Nouns refund 分は見積りに乗らない
  const tx = await c.metagov.execute(p.id, { gasLimit });
  console.log(`[worker] execute prop ${p.id} tx ${tx.hash} (est ${est}, limit ${gasLimit})`);
  const rc = await tx.wait();
  const after = await metagovInfo(p.id);
  const receipt = await withFallback(async (pr) => contracts(pr).dao.getReceipt(p.id, cfg.metagov));
  db.executed[p.id] = { tx: tx.hash, result: after.result, gasUsed: String(rc.gasUsed), nounsReceipt: { hasVoted: receipt.hasVoted, support: Number(receipt.support), votes: String(receipt.votes) }, at: new Date().toISOString() };
  db.log.push({ at: new Date().toISOString(), type: "execute", proposalId: p.id, tx: tx.hash });
  store.save(db);
  const word = ["反対", "賛成", "棄権"][after.result];
  await notify([
    `✅ Prop ${p.id} を Nouns DAO に **${word}** で投票しました (${receipt.votes} 票)。`,
    `最終集計: 賛成 ${after.tokens[1]} / 反対 ${after.tokens[0]} / 棄権 ${after.tokens[2]} (投票者 ${after.voters[1]}/${after.voters[0]}/${after.voters[2]} 名)`,
    `Nouns DAO の記録: hasVoted=${receipt.hasVoted} support=${word} votes=${receipt.votes}`,
    `tx: ${explorerTx(tx.hash)}`,
    cfg.blockscout ? `イベント(VoteCast の reason に集計を記載): ${cfg.blockscout}/tx/${tx.hash}?tab=logs` : null,
  ].filter(Boolean).join("\n"));
}

// 新しく投票可能(Pending/Active)になった提案を告知
async function announceNew(db, p, block) {
  db.announced ||= {};
  if (db.announced[p.id]) return;
  const mg = await metagovInfo(p.id);
  if (mg.deadline && block >= mg.deadline) { db.announced[p.id] = "late"; store.save(db); return; }
  const title = await proposalTitle(p.id, p.creationBlock);
  const endBlock = p.endBlock;
  const deadlineBlock = mg.deadline || endBlock - 0; // 初回投票前は voteDeadline が endBlock-margin を返す
  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
  const eta = new Date(Date.now() + minutes * 60000);
  const jst = eta.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
  db.announced[p.id] = new Date().toISOString();
  store.save(db);
  await notify([
    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    `投票ページ: ${cfg.publicUrl}`,
    `提案の内容: https://nouns.wtf/vote/${p.id}`,
  ].join("\n"));
}

async function tick() {
  const db = store.load();
  const { block, proposals } = await recentProposals();
  for (const p of proposals) {
    try {
      if (p.state === 0 || p.state === 1) {
        if (cfg.announce) await announceNew(db, p, block);
        const mg = await metagovInfo(p.id);
        if (block < mg.deadline) await submitPending(db, String(p.id));
        else await maybeExecute(db, p, block);
      }
    } catch (e) {
      console.error(`[worker] prop ${p.id} error:`, e.shortMessage || e.message);
    }
  }
}
function startWorker() {
  let running = false;
  const loop = async () => {
    if (running) return; running = true;
    try { await tick(); } catch (e) { console.error("[worker] tick error", e.shortMessage || e.message); }
    running = false;
  };
  loop();
  return setInterval(loop, cfg.submitIntervalSec * 1000);
}
module.exports = { startWorker, tick, notify };
