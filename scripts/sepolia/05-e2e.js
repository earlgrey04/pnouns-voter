// 通しテスト: 提案作成 → 投票開始待ち → 3 名が EIP-712 署名 → relayer が castVotesBySig → 締切待ち → execute → getReceipt 確認
// Sepolia は votingDelay 3 / votingPeriod 25 ブロック(≈5 分)なので、全体で 6〜7 分。
const { ethers } = require("hardhat");
const { SEPOLIA, DAO_ABI, NOUNS_ABI, PNOUNS_ABI, loadDeployments, sleep } = require("./lib");

async function waitForBlock(target, label) {
  while (true) {
    const b = await ethers.provider.getBlockNumber();
    if (b >= target) return b;
    process.stdout.write(`\r  ${label}: block ${b}/${target}   `);
    await sleep(6000);
  }
}
async function tokensOf(pnouns, owner, maxId) {
  const out = [];
  for (let id = 101; id <= maxId; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === owner.toLowerCase()) out.push(BigInt(id));
  return out;
}
async function main() {
  const [deployer, delegator, voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
  const pnouns = new ethers.Contract(dep.pnouns, PNOUNS_ABI, ethers.provider);
  const metagov = await ethers.getContractAt("PNounsMetaGov", dep.metagov, deployer);

  console.log("MetaGov votes:", String(await nouns.getCurrentVotes(dep.metagov)), "| deployer Nouns:", String(await nouns.balanceOf(deployer.address)), "threshold:", String(await dao.proposalThreshold()));

  // 1. 提案作成(no-op)
  const supportPlan = { A: Number(process.env.A ?? 1), B: Number(process.env.B ?? 0), C: Number(process.env.C ?? 0) };
  const tx = await dao.propose([deployer.address], [0], [""], ["0x"], `# pNouns MetaGov Sepolia E2E\nplan A=${supportPlan.A} B=${supportPlan.B} C=${supportPlan.C}`);
  console.log("propose tx:", tx.hash);
  const rc = await tx.wait();
  const proposalId = await dao.proposalCount();
  const pr = await dao.proposals(proposalId);
  console.log(`proposal #${proposalId} creation=${pr.creationBlock} start=${pr.startBlock} end=${pr.endBlock}`);
  console.log("MetaGov prior votes @creation:", String(await nouns.getPriorVotes(dep.metagov, pr.creationBlock)));

  // 2. Active まで待つ
  await waitForBlock(Number(pr.startBlock) + 1, "waiting Active");
  console.log("\n  state:", String(await dao.state(proposalId)), "deadline:", String(await metagov.voteDeadline(proposalId)));

  // 3. 署名(投票者はガス不要)
  const total = Number(await pnouns.totalSupply());
  const domain = { name: "pNouns MetaGov", version: "1", chainId: 11155111, verifyingContract: dep.metagov };
  const types = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
  const votes = [];
  for (const [s, sup] of [[voterA, supportPlan.A], [voterB, supportPlan.B], [voterC, supportPlan.C]]) {
    const tokenIds = await tokensOf(pnouns, s.address, total);
    const signature = await s.signTypedData(domain, types, { proposalId, support: sup, tokenIds });
    votes.push({ proposalId, support: sup, tokenIds, signature });
    console.log(`  ${s.address} signs support=${sup} tokens=[${tokenIds}]`);
  }
  // 4. relayer が投函
  const tx2 = await metagov.castVotesBySig(votes);
  console.log("castVotesBySig tx:", tx2.hash);
  const rc2 = await tx2.wait();
  console.log("  gasUsed:", String(rc2.gasUsed));
  const t = await metagov.tally(proposalId);
  console.log("  tally tokens(against,for,abstain):", t.tokens.map(String), "voters:", t.voters.map(String), "result:", String(await metagov.currentResult(proposalId)));

  // 5. 締切まで待って execute
  const dl = await metagov.voteDeadline(proposalId);
  await waitForBlock(Number(dl), "waiting deadline");
  const bal0 = await ethers.provider.getBalance(deployer.address);
  const tx3 = await metagov.execute(proposalId);
  console.log("\nexecute tx:", tx3.hash);
  const rc3 = await tx3.wait();
  const bal1 = await ethers.provider.getBalance(deployer.address);
  console.log("  gasUsed:", String(rc3.gasUsed), "executor ETH delta:", ethers.formatEther(bal1 - bal0));
  const r = await dao.getReceipt(proposalId, dep.metagov);
  console.log(`  Nouns DAO receipt for MetaGov: hasVoted=${r.hasVoted} support=${r.support} votes=${r.votes}`);
  console.log(`  https://sepolia.etherscan.io/tx/${tx3.hash}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
