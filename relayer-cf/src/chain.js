// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { METAGOV_ABI } from "./abi.js";

export const DAO_ABI = parseAbi([
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
]);
export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };

export function cfg(env) {
  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
  if (env.NETWORK === "mainnet") {
    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
  }
  return {
    network: env.NETWORK || "sepolia",
    chain,
    chainId: chain.id,
    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
    metagov: getAddress(env.VOTER),
    pnouns: getAddress(env.PNOUNS),
    nounsDAO: getAddress(env.NOUNS_DAO),
    nounsToken: getAddress(env.NOUNS_TOKEN),
    explorer: env.EXPLORER,
    blockscout: env.BLOCKSCOUT || null,
    publicUrl: env.PUBLIC_URL || "",
    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
    scanProposals: Number(env.SCAN_PROPOSALS || 30),
    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
    announce: env.ANNOUNCE !== "0",
    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
    relayerKey: env.RELAYER_PRIVATE_KEY || null,
    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
  };
}
export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
export function clients(c) {
  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
  return { publicClient, walletClient, account };
}
export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });

// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
let ownersCache = { at: 0, owners: [] };
export async function allOwners(c, pc) {
  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
  const owners = [];
  const CH = 500;
  for (let start = 1; start <= total; start += CH) {
    const ids = [];
    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
  }
  ownersCache = { at: Date.now(), owners };
  return owners;
}
export async function tokensOf(c, pc, address) {
  const owners = await allOwners(c, pc);
  const a = address.toLowerCase();
  const out = [];
  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
  return out;
}
export async function recentProposals(c, pc) {
  const [count, block] = await Promise.all([
    pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
    pc.getBlockNumber(),
  ]);
  const ids = [];
  for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
  const res = await pc.multicall({
    contracts: ids.flatMap((id) => [
      { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
      { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
    ]),
    allowFailure: false,
  });
  const out = [];
  ids.forEach((id, i) => {
    const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
    // proposals() は名前付きタプルではなく配列で返る
    const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
    out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
  });
  return { block: Number(block), proposals: out };
}
// H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
//  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
//  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
const titleMem = new Map();
export async function proposalTitle(c, pc, store, id, creationBlock, state) {
  const frozen = state === 0 || state === 1;
  const kv = store ? store.kvRaw : null;
  if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
  const m = titleMem.get(id);
  if (!frozen && m && Date.now() - m.at < 30000) return m.title;
  let title = `Proposal ${id}`;
  try {
    const events = DAO_ABI.filter((x) => x.type === "event");
    const latest = await pc.getBlockNumber();
    const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
    const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
    let desc = "";
    for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === id) desc = String(l.args.description || "");
    for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description || desc);
    const first = desc.split("\n").find((x) => x.trim()) || "";
    title = first.replace(/^#+\s*/, "").trim() || title;
    if (updates.length) title += " (更新あり)";
  } catch (e) { /* タイトルは必須でない */ }
  if (frozen && kv) await kv.put(`title:${id}:final`, title, { expirationTtl: 86400 * 30 });
  else titleMem.set(id, { at: Date.now(), title });
  return title;
}
// pNouns 所有者キャッシュはメモリ(isolate 内)+ 60 秒。KV には書かない
export async function metagovInfo(c, pc, proposalId) {
  const pid = BigInt(proposalId);
  const t0 = await pc.multicall({
    contracts: [
      { address: c.metagov, abi: METAGOV_ABI, functionName: "tally", args: [pid] },
      { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
      { address: c.nounsToken, abi: NOUNS_ABI, functionName: "getCurrentVotes", args: [c.metagov] },
      { address: c.metagov, abi: METAGOV_ABI, functionName: "currentResult", args: [pid] },
      { address: c.nounsDAO, abi: DAO_ABI, functionName: "getReceipt", args: [pid, c.metagov] },
      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
    ],
    allowFailure: true,
  }).then((r) => r.map((x) => (x.status === "success" ? x.result : null)));
  const [t, deadline, votes, cur, rcpt, live] = [t0[0], t0[1], t0[2], t0[3], t0[4], t0[5]];
  const tally = t || [[0n, 0n, 0n], [0n, 0n, 0n], false, 0];
  const [tokens, voters, executed, result] = tally;
  return {
    tokens: tokens.map(Number), voters: voters.map(Number), executed, result: Number(executed ? result : cur ?? 2),
    deadline: Number(deadline || 0n), metagovVotes: Number(votes || 0n),
    nounsReceipt: rcpt ? { hasVoted: rcpt.hasVoted, support: Number(rcpt.support), votes: Number(rcpt.votes) } : null,
    liveMode: !!live,
  };
}
export { verifyTypedData, getAddress, METAGOV_ABI };
