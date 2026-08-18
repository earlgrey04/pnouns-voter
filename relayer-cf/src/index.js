// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信。
import { Hono } from "hono";
import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI } from "./chain.js";
import { recoverTypedDataAddress, encodeFunctionData } from "viem";
import { makeStore } from "./store.js";
import { tick } from "./worker.js";

const app = new Hono();

app.get("/api/config", (ctx) => {
  const c = cfg(ctx.env);
  return ctx.json({ network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, domain: domain(c), types: VOTE_TYPES });
});

app.get("/api/proposals", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE);
  const closedN = Number(ctx.req.query("closed") || 0);
  const { block, proposals } = await recentProposals(c, pc);
  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
  const limited = closedN ? wanted.slice(0, closedN) : wanted;
  const list = await Promise.all(limited.map(async (p) => {
    const votable = p.state === 0 || p.state === 1;
    const [title, mg, votes, executed] = await Promise.all([proposalTitle(c, pc, ctx.env.STATE, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.listVotes(p.id), store.getExecuted(p.id)]);
    return { ...p, title, metagov: mg, votable: votable && block < mg.deadline, pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
  }));
  return ctx.json({ block, proposals: list });
});

app.get("/api/tokens/:address", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE);
  const address = getAddress(ctx.req.param("address"));
  const ids = await tokensOf(c, pc, ctx.env.STATE, address);
  const proposalId = ctx.req.query("proposalId");
  let voted = {}, hasVoted = false, pending = null;
  if (proposalId) {
    const pid = BigInt(proposalId);
    const res = await pc.multicall({ contracts: [
      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
    ], allowFailure: false });
    hasVoted = res[0];
    ids.forEach((id, i) => { voted[id] = res[i + 1]; });
    pending = await store.getVote(proposalId, address);
  }
  return ctx.json({ address, tokenIds: ids, voted, hasVoted, pending });
});

app.post("/api/vote", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE);
  if (Number(ctx.req.header("content-length") || 0) > 65536) return ctx.json({ error: "payload too large" }, 413); // M-01
  let body;
  try { body = await ctx.req.json(); } catch { return ctx.json({ error: "bad json" }, 400); }
  const { proposalId, support, tokenIds, signature } = body || {};
  if (!proposalId || !/^\d{1,10}$/.test(String(proposalId)) || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || !tokenIds.length || typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return ctx.json({ error: "bad request" }, 400);
  // M-01: tokenIds は 1..2100 の整数、重複なし、最大 300 件
  if (tokenIds.length > 300) return ctx.json({ error: "too many tokenIds" }, 400);
  const seen = new Set();
  for (const x of tokenIds) {
    if (!/^\d{1,5}$/.test(String(x)) || Number(x) < 1 || Number(x) > 2100 || seen.has(String(x))) return ctx.json({ error: `invalid or duplicate tokenId ${x}` }, 400);
    seen.add(String(x));
  }
  const pid = BigInt(proposalId);
  const ids = tokenIds.map((x) => BigInt(x));
  // 署名者を復元 → 所有・除外・重複・状態・締切をコントラクトと同条件で事前チェック
  let voter;
  try { voter = await recoverTypedDataAddress({ domain: domain(c), types: VOTE_TYPES, primaryType: "Vote", message: { proposalId: pid, support: Number(support), tokenIds: ids }, signature }); }
  catch { return ctx.json({ error: "invalid signature" }, 400); }
  // M-01: 署名者ごとの簡易レート制限(10 秒に 1 回)
  const rl = `rl:${voter.toLowerCase()}`;
  if (await ctx.env.STATE.get(rl)) return ctx.json({ error: "too many requests, retry in 10s" }, 429);
  await ctx.env.STATE.put(rl, "1", { expirationTtl: 60 }); // KV の最小 TTL は 60 秒
  const owners = await allOwners(c, pc, ctx.env.STATE);
  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
  const [state, block, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
    { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [pid] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
  ], allowFailure: false }).then(async (r) => [Number(r[0]), Number(await pc.getBlockNumber()), Number(r[1]), r[2], r[3]]);
  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
  if (hasVoted) return ctx.json({ error: "already voted on-chain" }, 400);
  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
  const existing = await store.getVote(proposalId, voter);
  if (existing && existing.tx) return ctx.json({ error: "already submitted" }, 400);
  await store.putVote(proposalId, voter, { support: Number(support), tokenIds: ids.map(String), signature, receivedAt: new Date().toISOString() });
  await store.log({ at: new Date().toISOString(), type: "vote", proposalId, voter, support: Number(support), tokenIds: ids.map(String) });
  console.log(`[api] vote received: prop ${proposalId} ${voter} support=${support} tokens=${ids.length}`);
  return ctx.json({ ok: true, voter, proposalId: String(proposalId), support: Number(support), tokenIds: ids.map(String) });
});

// 署名の公開: 提案ごとの署名一覧(投函待ち / 投函済み)。誰でも取得でき、誰でも投函できる。
// ?calldata=1 で、投函待ちのうちいま on-chain で通る署名だけを castVotesBySig の calldata にして返す(そのまま eth_sendTransaction 可)。
app.get("/api/signatures/:id", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE);
  const id = String(Number(ctx.req.param("id")));
  const votes = await store.listVotes(id);
  const pending = votes.filter((v) => !v.tx && !v.dropped);
  const submitted = votes.filter((v) => v.tx);
  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES, pending, submitted, dropped: votes.filter((v) => v.dropped) };
  if (ctx.req.query("calldata") && pending.length) {
    const good = [];
    for (const v of pending) {
      const arg = { proposalId: BigInt(id), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature };
      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[arg]] }); good.push(arg); }
      catch (e) { /* いま通らない署名(所有者変更など)は除外 */ }
    }
    const chunk = good.slice(0, Number(ctx.env.MAX_BATCH || 25)); // M-03: 1 tx の上限
    out.submittable = chunk.length;
    out.remaining = good.length - chunk.length;
    out.calldata = chunk.length ? encodeFunctionData({ abi: METAGOV_ABI, functionName: "castVotesBySig", args: [chunk] }) : null;
    if (chunk.length) {
      try {
        const { account } = clients(c);
        const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [chunk], account: account || undefined });
        out.gasHint = Number((est * 14n) / 10n); // 実見積り ×1.4(返金の送金分は見積りに乗らない)
      } catch { out.gasHint = 200000 + 80000 * chunk.length + 8000 * chunk.reduce((a, v) => a + v.tokenIds.length, 0); }
    } else out.gasHint = 0;
  }
  return ctx.json(out);
});

app.get("/api/proposal/:id", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE);
  const id = Number(ctx.req.param("id"));
  const [mg, votes, executed] = await Promise.all([metagovInfo(c, pc, id), store.listVotes(id), store.getExecuted(id)]);
  return ctx.json({ id, metagov: mg, votes, executed });
});

// 手動トリガ(デバッグ用。cron と同じ処理)
app.post("/api/tick", async (ctx) => {
  // H-01: TICK_TOKEN 未設定なら無効(公開トリガを許さない)。設定時もトークン一致が必須
  if (!ctx.env.TICK_TOKEN) return ctx.json({ error: "disabled" }, 404);
  if (ctx.req.header("x-tick-token") !== ctx.env.TICK_TOKEN) return ctx.json({ error: "forbidden" }, 403);
  await tick(ctx.env);
  return ctx.json({ ok: true });
});

app.onError((e, ctx) => { console.error(e); return ctx.json({ error: e.shortMessage || e.message }, 500); });

export default {
  fetch: app.fetch,
  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
};
