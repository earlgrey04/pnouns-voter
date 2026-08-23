// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信(public/_headers で CSP)。
import { Hono } from "hono";
import { recoverTypedDataAddress, encodeFunctionData } from "viem";
import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
import { makeStore } from "./store.js";
import { tick, notifyError } from "./worker.js";

const app = new Hono();

// API 応答の防御ヘッダー
app.use("*", async (ctx, next) => {
  await next();
  ctx.header("X-Content-Type-Options", "nosniff");
  ctx.header("X-Frame-Options", "DENY");
  ctx.header("Referrer-Policy", "no-referrer");
  ctx.header("Cache-Control", "no-store");
});

app.get("/api/config", (ctx) => {
  const c = cfg(ctx.env);
  const snap = !!c.snapshotSpace;
  // relayer アドレスは tx 送信時にオンチェーンで公開される情報。照合スクリプト(check-deploy)が
  // 「稼働中 Worker の鍵」と「意図した鍵」の一致を機械確認できるよう返す(秘密鍵は含まない)。
  const relayer = clients(c).account?.address || null;
  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
});

app.get("/api/proposals", async (ctx) => {
  const c = cfg(ctx.env);
  // Cache API(コロ単位)で 30 秒キャッシュ。クエリ差でキャッシュを迂回されないよう closed は 0/8 に正規化してキーにする
  const closedN = ctx.req.query("closed") ? 8 : 0;
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/api/proposals?closed=${closedN}&n=${c.network}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE, storeNs(c));
  const { block, proposals } = await recentProposals(c, pc);
  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
  const limited = closedN ? wanted.slice(0, closedN) : wanted;
  const snapmap = c.snapshotSpace ? ((await ctx.env.STATE.get(`${store.prefix}snapmap`, "json")) || {}) : {};
  const snapByNouns = Object.fromEntries(Object.entries(snapmap).map(([k, v]) => [v, k]));
  const list = (await Promise.all(limited.map(async (p) => {
    try {
    const votable = p.state === 0 || p.state === 1;
    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
    const snapshotProposalId = snapByNouns[p.id] || null;
    const votes = sum.votes;
    const acceptUntil = mg.deadline ? acceptDeadline(c, mg.deadline) : 0;
    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
    } catch (e) { console.warn(`[api] prop ${p.id} skipped: ${(e.shortMessage || e.message || "").slice(0, 80)}`); return null; }
  }))).filter(Boolean);
  const res = ctx.json({ block, proposals: list });
  const toCache = new Response(res.body, res); toCache.headers.set("Cache-Control", "public, max-age=30");
  ctx.executionCtx.waitUntil(cache.put(cacheKey, toCache.clone()));
  return toCache;
});

app.get("/api/tokens/:address", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE, storeNs(c));
  if (!/^0x[0-9a-fA-F]{40}$/.test(ctx.req.param("address"))) return ctx.json({ error: "bad address" }, 400); // L-08: 入力エラーは 400、障害通知しない
  const address = getAddress(ctx.req.param("address"));
  const ids = await tokensOf(c, pc, address);
  const proposalId = ctx.req.query("proposalId");
  let voted = {}, hasVoted = false, pending = null;
  if (proposalId && /^\d{1,10}$/.test(proposalId)) {
    const pid = BigInt(proposalId);
    const res = await pc.multicall({ contracts: [
      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
    ], allowFailure: false });
    hasVoted = res[0];
    ids.forEach((id, i) => { voted[id] = res[i + 1]; });
    const rec = await store.getVote(String(pid), address);
    if (rec) {
      const st = (await store.getSummary(String(pid))).votes.find((v) => v.voter.toLowerCase() === address.toLowerCase()) || {};
      pending = { support: rec.support, tokenIds: rec.tokenIds, tx: st.tx, txStatus: st.txStatus, receivedAt: rec.receivedAt };
    }
  }
  return ctx.json({ address, tokenIds: ids, voted, hasVoted, pending });
});

// M-01R: 本文をストリームで最大 64KB まで読む(Content-Length に依存しない)
async function readJsonLimited(req, limit = 65536) {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
    chunks.push(value);
  }
  const buf = new Uint8Array(total); let o = 0; for (const ch of chunks) { buf.set(ch, o); o += ch.byteLength; }
  return JSON.parse(new TextDecoder().decode(buf));
}

app.post("/api/vote", async (ctx) => {
  const c = cfg(ctx.env);
  if (c.snapshotSpace) return ctx.json({ error: `voting happens on Snapshot: https://snapshot.box/#/s:${c.snapshotSpace}`, code: "snapshot_mode" }, 410);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE, storeNs(c));
  let body;
  try { body = await readJsonLimited(ctx.req.raw); } catch (e) { return ctx.json({ error: e.message === "payload too large" ? "payload too large" : "bad json" }, e.message === "payload too large" ? 413 : 400); }
  const { proposalId, support, tokenIds, signature } = body || {};
  if (proposalId === undefined || !/^\d{1,10}$/.test(String(proposalId)) || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || !tokenIds.length || typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return ctx.json({ error: "bad request" }, 400);
  if (tokenIds.length > 300) return ctx.json({ error: "too many tokenIds" }, 400);
  // Low: 正規化(BigInt 化した正規値で検証・保存)
  const pid = BigInt(String(proposalId));
  const pidKey = pid.toString();
  const seen = new Set(); const ids = [];
  for (const x of tokenIds) {
    if (!/^\d{1,5}$/.test(String(x))) return ctx.json({ error: `invalid tokenId ${x}` }, 400);
    const n = BigInt(String(x));
    if (n < 1n || n > 2100n || seen.has(n.toString())) return ctx.json({ error: `invalid or duplicate tokenId ${x}` }, 400);
    seen.add(n.toString()); ids.push(n);
  }
  let voter;
  try { voter = await recoverTypedDataAddress({ domain: domain(c), types: VOTE_TYPES, primaryType: "Vote", message: { proposalId: pid, support: Number(support), tokenIds: ids }, signature }); }
  catch { return ctx.json({ error: "invalid signature" }, 400); }
  // 署名者ごとの簡易レート制限(60 秒に 1 回。KV 最小 TTL)
  if (await store.getFlag(`rl:${voter.toLowerCase()}`)) return ctx.json({ error: "too many requests, retry later" }, 429);
  const owners = await allOwners(c, pc);
  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
  const [state, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
    { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [pid] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
  ], allowFailure: false }).then((r) => [Number(r[0]), Number(r[1]), r[2], r[3]]);
  const block = Number(await pc.getBlockNumber());
  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
  if (hasVoted) return ctx.json({ error: "already voted on-chain" }, 400);
  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
  // M-14R: 受付容量(締切までに確実に投函できる数)を超える場合は受け付けない
  const sumNow = await store.getSummary(pidKey);
  const pendingNow = sumNow.votes.filter((v) => !v.tx && !v.dropped).length;
  const capacity = submitCapacity(c, block, deadline);
  if (pendingNow >= capacity) return ctx.json({ error: "relayer capacity before the deadline is full; please submit on-chain yourself (manual submit button / castVote)", code: "capacity_full", pending: pendingNow, capacity }, 400);
  const existing = await store.getVote(pidKey, voter);
  if (existing) { const st = sumNow.votes.find((v) => v.voter.toLowerCase() === voter.toLowerCase()); if (st && st.tx) return ctx.json({ error: "already submitted" }, 400); }
  await store.setFlag(`rl:${voter.toLowerCase()}`, 60);
  await store.putVote(pidKey, voter, { support: Number(support), tokenIds: ids.map(String), signature, receivedAt: new Date().toISOString() });
  await store.markDirty(pidKey); // ワーカーが次回 tick で list → サマリー更新
  console.log(`[api] vote received: prop ${pidKey} ${voter} support=${support} tokens=${ids.length}`);
  return ctx.json({ ok: true, voter, proposalId: pidKey, support: Number(support), tokenIds: ids.map(String) });
});

// 署名の公開: 誰でも取得・投函できる。?calldata=1 でいま通る署名(最大 MAX_BATCH 件)の calldata と実見積りガス
app.get("/api/signatures/:id", async (ctx) => {
  const c = cfg(ctx.env);
  if (c.snapshotSpace) return ctx.json({ error: "snapshot mode: votes are public on the Snapshot hub", code: "snapshot_mode" }, 410);
  const { publicClient: pc, account } = clients(c);
  const store = makeStore(ctx.env.STATE, storeNs(c));
  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
  const id = BigInt(ctx.req.param("id")).toString();
  const summaries = (await store.getSummary(id)).votes; // 公開 API は list しない(サマリーはワーカーが更新)
  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES,
    pending: summaries.filter((v) => !v.tx && !v.dropped), submitted: summaries.filter((v) => v.tx), dropped: summaries.filter((v) => v.dropped) };
  if (ctx.req.query("calldata") && out.pending.length) {
    const cand = out.pending.slice(0, c.maxBatch);
    const fulls = [];
    for (const s of cand) { const v = await store.getVote(id, s.voter); if (v) fulls.push({ voter: s.voter, ...v }); }
    const args = fulls.map((v) => ({ proposalId: BigInt(id), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature }));
    let good = args;
    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args] }); }
    catch { good = []; for (const a of args.slice(0, 10)) { try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[a]] }); good.push(a); } catch {} } }
    out.submittable = good.length;
    out.remaining = out.pending.length - good.length;
    out.calldata = good.length ? encodeFunctionData({ abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good] }) : null;
    if (good.length) {
      try { const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good], account: account || undefined }); out.gasHint = Number((est * 14n) / 10n); }
      catch { out.gasHint = 200000 + 80000 * good.length + 8000 * good.reduce((a, v) => a + v.tokenIds.length, 0); }
    } else out.gasHint = 0;
  }
  // 署名本文も公開(誰でも投函できるように)。get のみ
  if (ctx.req.query("full")) { out.pendingFull = []; for (const s of out.pending.slice(0, c.maxBatch)) { const v = await store.getVote(id, s.voter); if (v) out.pendingFull.push({ voter: s.voter, ...v }); } }
  return ctx.json(out);
});

app.get("/api/proposal/:id", async (ctx) => {
  const c = cfg(ctx.env);
  const { publicClient: pc } = clients(c);
  const store = makeStore(ctx.env.STATE, storeNs(c));
  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
  const id = Number(ctx.req.param("id"));
  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
  return ctx.json({ id, metagov: mg, votes: sum.votes, executed });
});

// 手動トリガ(TICK_TOKEN 設定時のみ有効)
app.post("/api/tick", async (ctx) => {
  if (!ctx.env.TICK_TOKEN) return ctx.json({ error: "disabled" }, 404);
  if (ctx.req.header("x-tick-token") !== ctx.env.TICK_TOKEN) return ctx.json({ error: "forbidden" }, 403);
  await tick(ctx.env);
  return ctx.json({ ok: true });
});

// L-08: 内部障害(KV / RPC / 送信)だけ Discord 通知。入力起因の例外は 400 で返し通知しない
const INTERNAL_ERR = new Set(["HttpRequestError", "TimeoutError", "RpcRequestError", "InternalRpcError", "LimitExceededRpcError", "ResourceUnavailableRpcError"]);
function isInternalError(e) { return INTERNAL_ERR.has(e?.name) || /KV|Too many|limit|exceeded|network|fetch failed/i.test(e?.message || ""); }
function isClientError(e) { return ["InvalidAddressError", "SyntaxError", "SizeExceedsPaddingSizeError", "InvalidHexValueError"].includes(e?.name) || /^Address ".*" is invalid/.test(e?.message || ""); }
app.onError((e, ctx) => {
  if (isClientError(e)) return ctx.json({ error: "bad request" }, 400);
  console.error(e);
  if (isInternalError(e)) { try { const c = cfg(ctx.env); ctx.executionCtx.waitUntil(notifyError(c, `api ${new URL(ctx.req.url).pathname}`, e)); } catch {} }
  return ctx.json({ error: e.shortMessage || e.message }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
};
