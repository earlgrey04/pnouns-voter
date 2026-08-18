// リレイヤー API + 署名 dApp 配信
const express = require("express");
const path = require("path");
const { cfg, ethers, contracts, eip712Domain, VOTE_TYPES, tokensOf, recentProposals, proposalTitle, metagovInfo, withFallback } = require("./chain");
const store = require("./store");

function createApp() {
  const app = express();
  app.use(express.json({ limit: "64kb" }));
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/config", (req, res) => {
    res.json({ network: cfg.network, chainId: cfg.chainId, metagov: cfg.metagov, pnouns: cfg.pnouns, nounsDAO: cfg.nounsDAO, explorer: cfg.explorer, blockscout: cfg.blockscout, domain: eip712Domain(), types: VOTE_TYPES });
  });

  // 投票対象になりうる提案(Pending/Active)+ MetaGov の集計。closed=1 で直近の終了分も返す
  app.get("/api/proposals", async (req, res) => {
    try {
      const { block, proposals } = await recentProposals();
      const db = store.load();
      const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || req.query.closed);
      const limited = req.query.closed ? wanted.slice(0, Number(req.query.closed) || 8) : wanted;
      const list = await Promise.all(limited.map(async (p) => {
        const votable = p.state === 0 || p.state === 1;
        const [title, mg] = await Promise.all([proposalTitle(p.id, p.creationBlock), metagovInfo(p.id)]);
        const pending = store.pendingVotes(db, p.id).length;
        return { ...p, title, metagov: mg, votable: votable && block < mg.deadline, pendingSignatures: pending, submittedVoters: Object.values(db.votes[p.id] || {}).filter((v) => v.tx).length, executed: db.executed[p.id] || null };
      }));
      res.json({ block, proposals: list });
    } catch (e) { res.status(500).json({ error: e.shortMessage || e.message }); }
  });

  // 保有 tokenId と、指定提案での投票済み状態
  app.get("/api/tokens/:address", async (req, res) => {
    try {
      const address = ethers.getAddress(req.params.address);
      const ids = await tokensOf(address);
      let voted = {};
      let hasVoted = false;
      if (req.query.proposalId) {
        const pid = BigInt(req.query.proposalId);
        await withFallback(async (p) => {
          const c = contracts(p);
          hasVoted = await c.metagov.hasVoted(pid, address);
          for (const id of ids) voted[id] = await c.metagov.hasTokenVoted(pid, id);
        });
      }
      const db = store.load();
      const pending = req.query.proposalId ? (db.votes[req.query.proposalId] || {})[address.toLowerCase()] || null : null;
      res.json({ address, tokenIds: ids, voted, hasVoted, pending });
    } catch (e) { res.status(500).json({ error: e.shortMessage || e.message }); }
  });

  // 署名付き投票の受付
  app.post("/api/vote", async (req, res) => {
    try {
      const { proposalId, support, tokenIds, signature } = req.body || {};
      if (!proposalId || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || tokenIds.length === 0 || typeof signature !== "string") {
        return res.status(400).json({ error: "bad request" });
      }
      const pid = BigInt(proposalId);
      const ids = tokenIds.map((x) => BigInt(x));
      const voter = ethers.verifyTypedData(eip712Domain(), VOTE_TYPES, { proposalId: pid, support: Number(support), tokenIds: ids }, signature);
      // 事前検証(コントラクトと同じ条件): 所有・除外・重複・提案状態・締切
      const check = await withFallback(async (p) => {
        const c = contracts(p);
        const [state, block, deadline, hasVoted, excluded] = await Promise.all([c.dao.state(pid), p.getBlockNumber(), c.metagov.voteDeadline(pid), c.metagov.hasVoted(pid, voter), c.metagov.excluded(voter)]);
        const owners = await require("./chain").allOwners();
        for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return `token ${id} is not owned by ${voter}`;
        if (excluded) return "voter is excluded";
        if (hasVoted) return "already voted on-chain";
        if (Number(state) !== 0 && Number(state) !== 1) return `proposal not votable (state ${state})`;
        if (block >= Number(deadline)) return "voting closed";
        return null;
      });
      if (check) return res.status(400).json({ error: check });
      const db = store.load();
      const existing = (db.votes[proposalId] || {})[voter.toLowerCase()];
      if (existing && existing.tx) return res.status(400).json({ error: "already submitted" });
      store.addVote(db, String(proposalId), voter, { support: Number(support), tokenIds: ids.map(String), signature });
      console.log(`[api] vote received: prop ${proposalId} ${voter} support=${support} tokens=${ids.length}`);
      res.json({ ok: true, voter, proposalId: String(proposalId), support: Number(support), tokenIds: ids.map(String) });
    } catch (e) { res.status(400).json({ error: e.shortMessage || e.message }); }
  });

  app.get("/api/proposal/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const db = store.load();
      const mg = await metagovInfo(id);
      res.json({ id, metagov: mg, votes: db.votes[id] || {}, executed: db.executed[id] || null });
    } catch (e) { res.status(500).json({ error: e.shortMessage || e.message }); }
  });
  return app;
}
module.exports = { createApp };
