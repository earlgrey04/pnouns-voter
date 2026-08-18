// RPC フォールバック付き provider・コントラクト・補助関数
const { ethers } = require("ethers");
const cfg = require("./config");
const metagovArtifact = require("../artifacts/contracts/PNounsMetaGov.sol/PNounsMetaGov.json");

const DAO_ABI = [
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
];
const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)"];
const PNOUNS_ABI = ["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"];
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL_ABI = ["function aggregate3(tuple(address target,bool allowFailure,bytes callData)[] calls) view returns (tuple(bool success,bytes returnData)[])"];

const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];

let providerIdx = 0;
function makeProvider(i) {
  return new ethers.JsonRpcProvider(cfg.rpcUrls[i], cfg.chainId, { staticNetwork: true, batchMaxCount: 1 });
}
let provider = makeProvider(0);
async function withFallback(fn) {
  let lastErr;
  for (let n = 0; n < cfg.rpcUrls.length; n++) {
    try {
      return await fn(provider);
    } catch (e) {
      lastErr = e;
      providerIdx = (providerIdx + 1) % cfg.rpcUrls.length;
      provider = makeProvider(providerIdx);
      console.warn(`[chain] rpc failover -> ${cfg.rpcUrls[providerIdx]} (${(e.shortMessage || e.message || "").slice(0, 80)})`);
    }
  }
  throw lastErr;
}
function getProvider() { return provider; }
function relayerWallet() {
  const w = cfg.relayerKey ? new ethers.Wallet(cfg.relayerKey) : ethers.HDNodeWallet.fromPhrase(cfg.relayerMnemonic, undefined, "m/44'/60'/0'/0/0");
  return w.connect(provider);
}
function contracts(signerOrProvider = provider) {
  return {
    dao: new ethers.Contract(cfg.nounsDAO, DAO_ABI, signerOrProvider),
    nouns: new ethers.Contract(cfg.nounsToken, NOUNS_ABI, signerOrProvider),
    pnouns: new ethers.Contract(cfg.pnouns, PNOUNS_ABI, signerOrProvider),
    metagov: new ethers.Contract(cfg.metagov, metagovArtifact.abi, signerOrProvider),
    multicall: new ethers.Contract(MULTICALL3, MULTICALL_ABI, signerOrProvider),
  };
}

const eip712Domain = () => ({ name: "pNouns MetaGov", version: "1", chainId: cfg.chainId, verifyingContract: cfg.metagov });
const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };

// pNouns 全 tokenId の所有者を multicall で取得(2100 件でも数回の呼び出し)
let ownersCache = { block: 0, owners: [] };
async function allOwners() {
  return withFallback(async (p) => {
    const c = contracts(p);
    const block = await p.getBlockNumber();
    if (ownersCache.block === block) return ownersCache.owners;
    const total = Number(await c.pnouns.totalSupply());
    const iface = c.pnouns.interface;
    const owners = [];
    const CH = 400;
    for (let start = 1; start <= total; start += CH) {
      const ids = [];
      for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
      const calls = ids.map((id) => ({ target: cfg.pnouns, allowFailure: true, callData: iface.encodeFunctionData("ownerOf", [id]) }));
      const res = await c.multicall.aggregate3.staticCall(calls);
      res.forEach((r, i) => { owners[ids[i]] = r.success ? iface.decodeFunctionResult("ownerOf", r.returnData)[0].toLowerCase() : null; });
    }
    ownersCache = { block, owners };
    return owners;
  });
}
async function tokensOf(address) {
  const owners = await allOwners();
  const a = address.toLowerCase();
  const out = [];
  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
  return out;
}

// 直近 N 本の Nouns 提案(Pending/Active を中心に)を取得
let proposalsCache = { at: 0, value: null };
async function recentProposals(n = cfg.scanProposals) {
  if (proposalsCache.value && Date.now() - proposalsCache.at < cfg.cacheSec * 1000) return proposalsCache.value;
  const value = await withFallback(async (p) => {
    const c = contracts(p);
    const [count, block] = await Promise.all([c.dao.proposalCount(), p.getBlockNumber()]);
    const ids = [];
    for (let id = Number(count); id > Math.max(0, Number(count) - n); id--) ids.push(id);
    // multicall で proposals()/state() をまとめて取得
    const iface = c.dao.interface;
    const calls = ids.flatMap((id) => [
      { target: cfg.nounsDAO, allowFailure: false, callData: iface.encodeFunctionData("proposals", [id]) },
      { target: cfg.nounsDAO, allowFailure: false, callData: iface.encodeFunctionData("state", [id]) },
    ]);
    const res = await c.multicall.aggregate3.staticCall(calls);
    const out = [];
    ids.forEach((id, i) => {
      const pr = iface.decodeFunctionResult("proposals", res[i * 2].returnData);
      const st = Number(iface.decodeFunctionResult("state", res[i * 2 + 1].returnData)[0]);
      if (cfg.onlyProposer && pr.proposer.toLowerCase() !== cfg.onlyProposer) return;
      out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), startBlock: Number(pr.startBlock), endBlock: Number(pr.endBlock), creationBlock: Number(pr.creationBlock), proposer: pr.proposer, forVotes: String(pr.forVotes), againstVotes: String(pr.againstVotes), abstainVotes: String(pr.abstainVotes) });
    });
    return { block, proposals: out };
  });
  proposalsCache = { at: Date.now(), value };
  return value;
}
// 提案タイトル: ProposalCreated 系イベントの description の 1 行目(creationBlock のログだけ見る)
const titleCache = new Map();
async function proposalTitle(id, creationBlock) {
  if (titleCache.has(id)) return titleCache.get(id);
  return withFallback(async (p) => {
    const c = contracts(p);
    let title = `Proposal ${id}`;
    try {
      const logs = await p.getLogs({ address: cfg.nounsDAO, fromBlock: creationBlock, toBlock: creationBlock });
      for (const l of logs) {
        let parsed = null;
        try { parsed = c.dao.interface.parseLog(l); } catch {}
        if (parsed && parsed.name.startsWith("ProposalCreated") && Number(parsed.args.id) === id) {
          const first = String(parsed.args.description || "").split("\n").find((x) => x.trim()) || "";
          title = first.replace(/^#+\s*/, "").trim() || title;
        }
      }
    } catch (e) { /* タイトル取得失敗は致命的でない */ }
    titleCache.set(id, title);
    return title;
  });
}
async function metagovInfo(proposalId) {
  return withFallback(async (p) => {
    const c = contracts(p);
    const [t, deadline, votes, cur, rcpt] = await Promise.all([c.metagov.tally(proposalId), c.metagov.voteDeadline(proposalId).catch(() => 0n), c.nouns.getCurrentVotes(cfg.metagov), c.metagov.currentResult(proposalId), c.dao.getReceipt(proposalId, cfg.metagov)]);
    // 未実行のあいだは currentResult(現時点の判定)、実行後は確定した result。nounsReceipt = Nouns DAO 側に記録された MetaGov の投票
    return { tokens: t.tokens.map(Number), voters: t.voters.map(Number), executed: t.executed, result: Number(t.executed ? t.result : cur), deadline: Number(deadline), metagovVotes: Number(votes), nounsReceipt: { hasVoted: rcpt.hasVoted, support: Number(rcpt.support), votes: Number(rcpt.votes) } };
  });
}

module.exports = { cfg, ethers, getProvider, withFallback, relayerWallet, contracts, eip712Domain, VOTE_TYPES, allOwners, tokensOf, recentProposals, proposalTitle, metagovInfo, STATE_NAMES };
