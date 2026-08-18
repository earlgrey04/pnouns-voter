// mainnet フォーク上での E2E テスト。
// 本物の pNouns NFT / Nouns DAO / Nouns Token をそのまま使い、
// 「署名 → バッチ投函 → 締切 → execute → Nouns DAO に投票が記録される」まで通す。
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80";
const PNOUNS_TREASURY = "0x8ae80e0b44205904be18869240c2ec62d2342785";
const NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d";
const NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03";
// 提案作成に使う大口 delegate(候補順に試す)と、Nouns 2 枚を自己委任しているホルダー(= pNouns マルチシグの代役)
const PROPOSER_CANDIDATES = [
  "0x094b3226c7f55de7038b5be9bbac0866b3f6c8b8",
  "0x322956ea3f126a68fa6103965a75f6f4da7affc9",
  "0x14c86d9255d5b9768704b670c57f30662aff41f0",
  "0xf64642b49886ba8fee006767c3b1303df25c5211",
];
const NOUN_HOLDER_2 = "0x09960871a7ec7a5f1956c3e29ad69f906f4fb264";
const MARGIN = 3600n;

const DAO_ABI = [
  "function propose(address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,string description) returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event RefundableVote(address indexed voter, uint256 refundAmount, bool refundSent)",
];
const NOUNS_ABI = [
  "function delegate(address)",
  "function delegates(address) view returns (address)",
  "function getCurrentVotes(address) view returns (uint96)",
  "function getPriorVotes(address,uint256) view returns (uint96)",
  "function balanceOf(address) view returns (uint256)",
];
const ERC721_ABI = [
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function transferFrom(address,address,uint256)",
];

async function impersonate(addr) {
  await network.provider.send("hardhat_impersonateAccount", [addr]);
  await network.provider.send("hardhat_setBalance", [addr, "0x56BC75E2D63100000"]); // 100 ETH
  return ethers.getSigner(addr);
}
async function mine(n) {
  await network.provider.send("hardhat_mine", ["0x" + BigInt(n).toString(16)]);
}

// pNouns の tokenId を昇順に走査し、トレジャリー以外が持つ token を count 個集めて signers に移す
async function collectPNouns(pnouns, assignments, startId = 1) {
  const need = assignments.reduce((a, b) => a + b.count, 0);
  const got = [];
  for (let id = startId; got.length < need && id <= 2100; id++) {
    const owner = (await pnouns.ownerOf(id)).toLowerCase();
    if (owner === PNOUNS_TREASURY) continue;
    got.push({ id, owner });
  }
  let k = 0;
  for (const a of assignments) {
    a.tokenIds = [];
    for (let i = 0; i < a.count; i++, k++) {
      const { id, owner } = got[k];
      const s = await impersonate(owner);
      await pnouns.connect(s).transferFrom(owner, a.signer.address, id);
      a.tokenIds.push(BigInt(id));
    }
  }
}

async function signVote(signer, metagov, proposalId, support, tokenIds) {
  const domain = {
    name: "pNouns Voter",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: await metagov.getAddress(),
  };
  const types = {
    Vote: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "tokenIds", type: "uint256[]" },
    ],
  };
  const value = { proposalId, support, tokenIds };
  const signature = await signer.signTypedData(domain, types, value);
  return { proposalId, support, tokenIds, signature };
}

describe("PNounsVoter (mainnet fork E2E)", function () {
  let deployer, relayer, alice, bob, carol, executor;
  let metagov, dao, nouns, pnouns, proposalId, snapshotId;

  before(async function () {
    [deployer, relayer, alice, bob, carol, executor] = await ethers.getSigners();
    dao = new ethers.Contract(NOUNS_DAO, DAO_ABI, ethers.provider);
    nouns = new ethers.Contract(NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
    pnouns = new ethers.Contract(PNOUNS, ERC721_ABI, ethers.provider);

    // 1. pNouns Voter デプロイ(owner=deployer、トレジャリー除外、締切余裕 3600 ブロック)
    const F = await ethers.getContractFactory("PNounsVoter");
    metagov = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, [PNOUNS_TREASURY], MARGIN);
    await metagov.waitForDeployment();
    await metagov.setLiveMode(true);
    console.log("      pNouns Voter:", await metagov.getAddress());

    // 2. Nouns 2 枚ホルダー(マルチシグ代役)が pNouns Voter に委任
    const holder = await impersonate(NOUN_HOLDER_2);
    expect(await nouns.balanceOf(NOUN_HOLDER_2)).to.equal(2n);
    await nouns.connect(holder).delegate(await metagov.getAddress());
    expect(await nouns.getCurrentVotes(await metagov.getAddress())).to.equal(2n);
    await mine(1);

    // 3. 大口 delegate になりすまして提案を作る(委任の後に作成 → creationBlock 時点で pNouns Voter が 2 票持つ)
    let created = false;
    for (const p of PROPOSER_CANDIDATES) {
      try {
        const s = await impersonate(p);
        await dao.connect(s).propose([NOUN_HOLDER_2], [0], [""], ["0x"], "# pNouns Voter fork test\nno-op");
        created = true;
        console.log("      proposer:", p);
        break;
      } catch (e) {
        console.log("      proposer failed:", p, (e.shortMessage || e.message).slice(0, 80));
      }
    }
    expect(created, "no proposer candidate worked").to.equal(true);
    proposalId = await dao.proposalCount();
    const pr = await dao.proposals(proposalId);
    console.log(`      proposal #${proposalId} startBlock=${pr.startBlock} endBlock=${pr.endBlock} creation=${pr.creationBlock}`);
    await mine(1);
    expect(await nouns.getPriorVotes(await metagov.getAddress(), pr.creationBlock)).to.equal(2n);

    // 4. pNouns を実ホルダーからテスト署名者へ移す: alice 2 枚、bob 1 枚、carol 1 枚
    const assign = [
      { signer: alice, count: 2 },
      { signer: bob, count: 1 },
      { signer: carol, count: 1 },
    ];
    await collectPNouns(pnouns, assign);
    alice.tokenIds = assign[0].tokenIds;
    bob.tokenIds = assign[1].tokenIds;
    carol.tokenIds = assign[2].tokenIds;
    console.log("      pNouns: alice", alice.tokenIds, "bob", bob.tokenIds, "carol", carol.tokenIds);

    // 5. 投票開始(Active)までマイニング
    const cur = BigInt(await ethers.provider.getBlockNumber());
    await mine(pr.startBlock - cur + 1n);
    expect(await dao.state(proposalId)).to.equal(1n);
    snapshotId = await network.provider.send("evm_snapshot");
  });

  beforeEach(async function () {
    await network.provider.send("evm_revert", [snapshotId]);
    snapshotId = await network.provider.send("evm_snapshot");
  });

  it("deadline = endBlock - margin", async function () {
    const pr = await dao.proposals(proposalId);
    expect(await metagov.voteDeadline(proposalId)).to.equal(pr.endBlock - MARGIN);
  });

  it("同数(tokens 2:2)は投票者数で決まり(1:2)、AGAINST が Nouns DAO に記録される", async function () {
    const votes = [
      await signVote(alice, metagov, proposalId, 1, alice.tokenIds), // FOR 2 tokens
      await signVote(bob, metagov, proposalId, 0, bob.tokenIds), // AGAINST 1
      await signVote(carol, metagov, proposalId, 0, carol.tokenIds), // AGAINST 1
    ];
    const tx = await metagov.connect(relayer).castVotesBySig(votes);
    const rc = await tx.wait();
    console.log(`      castVotesBySig(3 votes / 4 tokens) gasUsed = ${rc.gasUsed}`);

    const t = await metagov.tally(proposalId);
    expect(t.tokens[1]).to.equal(2n);
    expect(t.tokens[0]).to.equal(2n);
    expect(t.voters[1]).to.equal(1n);
    expect(t.voters[0]).to.equal(2n);
    expect(await metagov.currentResult(proposalId)).to.equal(0);

    // 締切前は execute 不可
    await expect(metagov.execute(proposalId)).to.be.revertedWithCustomError(metagov, "VotingNotClosed");

    // 締切までマイニング → 誰でも execute
    const dl = await metagov.voteDeadline(proposalId);
    await mine(dl - BigInt(await ethers.provider.getBlockNumber()));
    expect(await dao.state(proposalId)).to.equal(1n); // まだ Nouns は Active

    const balBefore = await ethers.provider.getBalance(executor.address);
    const tx2 = await metagov.connect(executor).execute(proposalId);
    const rc2 = await tx2.wait();
    const balAfter = await ethers.provider.getBalance(executor.address);
    console.log(`      execute gasUsed = ${rc2.gasUsed}, executor ETH delta = ${ethers.formatEther(balAfter - balBefore)} (refund from Nouns DAO)`);
    const refundLog = rc2.logs.map((l) => { try { return dao.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "RefundableVote");
    console.log("      RefundableVote:", refundLog ? `to=${refundLog.args.voter} amount=${ethers.formatEther(refundLog.args.refundAmount)} sent=${refundLog.args.refundSent}` : "(none)");

    const receipt = await dao.getReceipt(proposalId, await metagov.getAddress());
    expect(receipt.hasVoted).to.equal(true);
    expect(receipt.support).to.equal(0n);
    expect(receipt.votes).to.equal(2n);
    const pr = await dao.proposals(proposalId);
    expect(pr.againstVotes).to.equal(2n);

    await expect(metagov.execute(proposalId)).to.be.revertedWithCustomError(metagov, "AlreadyExecuted");
  });

  it("多数(tokens 3:1)なら FOR。締切後の投票は拒否", async function () {
    const votes = [
      await signVote(alice, metagov, proposalId, 1, alice.tokenIds),
      await signVote(bob, metagov, proposalId, 1, bob.tokenIds),
      await signVote(carol, metagov, proposalId, 0, carol.tokenIds),
    ];
    await metagov.connect(relayer).castVotesBySig(votes);
    expect(await metagov.currentResult(proposalId)).to.equal(1);
    const dl = await metagov.voteDeadline(proposalId);
    await mine(dl - BigInt(await ethers.provider.getBlockNumber()));
    // 締切後の投票(未投票者が新たに)は VotingClosed
    const late = await signVote(executor, metagov, proposalId, 1, [alice.tokenIds[0]]);
    await expect(metagov.castVotesBySig([late])).to.be.revertedWithCustomError(metagov, "VotingClosed");
    await metagov.connect(executor).execute(proposalId);
    const receipt = await dao.getReceipt(proposalId, await metagov.getAddress());
    expect(receipt.support).to.equal(1n);
    expect(receipt.votes).to.equal(2n);
  });

  it("票ゼロなら ABSTAIN", async function () {
    const dl = await metagov.voteDeadline(proposalId);
    await mine(dl - BigInt(await ethers.provider.getBlockNumber()));
    await metagov.connect(executor).execute(proposalId);
    const receipt = await dao.getReceipt(proposalId, await metagov.getAddress());
    expect(receipt.support).to.equal(2n);
  });

  it("不正系: 他人の token / 二重投票 / 除外アドレス / 移転後の再投票 / 署名改ざん", async function () {
    // 他人の token
    const bad = await signVote(bob, metagov, proposalId, 1, [alice.tokenIds[0]]);
    await expect(metagov.castVotesBySig([bad])).to.be.revertedWithCustomError(metagov, "NotTokenOwner");
    // 正常投票 → 同じ人の二重投票
    const ok = await signVote(alice, metagov, proposalId, 1, alice.tokenIds);
    await metagov.castVotesBySig([ok]);
    await expect(metagov.castVotesBySig([ok])).to.be.revertedWithCustomError(metagov, "AlreadyVoted");
    // 除外アドレス(トレジャリー): 直接 castVote で確認
    const treasury = await impersonate(PNOUNS_TREASURY);
    const treasuryToken = await (async () => { for (let id = 1; id <= 2100; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === PNOUNS_TREASURY) return id; })();
    await expect(metagov.connect(treasury).castVote(proposalId, 1, [treasuryToken])).to.be.revertedWithCustomError(metagov, "ExcludedVoter");
    // alice が投票済み token を bob に移しても、bob はその token で投票できない(NothingCounted)
    await pnouns.connect(alice).transferFrom(alice.address, bob.address, alice.tokenIds[0]);
    const reuse = await signVote(bob, metagov, proposalId, 0, [alice.tokenIds[0]]);
    await expect(metagov.castVotesBySig([reuse])).to.be.revertedWithCustomError(metagov, "NothingCounted");
    // bob 自身の token と混ぜれば、自分の token 分だけ数えられる
    const mixed = await signVote(bob, metagov, proposalId, 0, [alice.tokenIds[0], ...bob.tokenIds]);
    await metagov.castVotesBySig([mixed]);
    const t = await metagov.tally(proposalId);
    expect(t.tokens[0]).to.equal(1n);
    // 署名改ざん(support を書き換え)→ 復元アドレスが変わり NotTokenOwner
    const c = await signVote(carol, metagov, proposalId, 1, carol.tokenIds);
    c.support = 0;
    await expect(metagov.castVotesBySig([c])).to.be.revertedWithCustomError(metagov, "NotTokenOwner");
  });

  it("シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ", async function () {
    await metagov.setLiveMode(false);
    await metagov.castVotesBySig([await signVote(alice, metagov, proposalId, 1, alice.tokenIds)]);
    const dl = await metagov.voteDeadline(proposalId);
    await mine(dl - BigInt(await ethers.provider.getBlockNumber()));
    await expect(metagov.connect(executor).execute(proposalId)).to.emit(metagov, "Executed").withArgs(proposalId, 1, [0n, 2n, 0n], [0n, 1n, 0n], false);
    const receipt = await dao.getReceipt(proposalId, await metagov.getAddress());
    expect(receipt.hasVoted).to.equal(false);
  });

  it("本人が自分でガスを払って castVote できる(リレイヤー不要の退路)", async function () {
    await metagov.connect(carol).castVote(proposalId, 2, carol.tokenIds);
    const t = await metagov.tally(proposalId);
    expect(t.tokens[2]).to.equal(1n);
  });

  it("ガス実測: 10 名×1枚 のバッチと 1 名×5枚", async function () {
    const signers = await ethers.getSigners();
    const ten = signers.slice(6, 16).map((s) => ({ signer: s, count: 1 }));
    const five = [{ signer: signers[16], count: 5 }];
    await collectPNouns(pnouns, [...ten, ...five], 30); // 既に移した token(1..~17)は避ける
    const votes = [];
    for (const a of ten) votes.push(await signVote(a.signer, metagov, proposalId, 1, a.tokenIds));
    // 1 票目(コールド初期化込み)
    const rc1 = await (await metagov.connect(relayer).castVotesBySig([votes[0]])).wait();
    // 残り 9 票
    const rc9 = await (await metagov.connect(relayer).castVotesBySig(votes.slice(1))).wait();
    const rc5 = await (await metagov.connect(relayer).castVotesBySig([await signVote(five[0].signer, metagov, proposalId, 0, five[0].tokenIds)])).wait();
    console.log(`      first vote (cold) = ${rc1.gasUsed}, next 9 votes = ${rc9.gasUsed} (${rc9.gasUsed / 9n}/vote), 1 voter x 5 tokens = ${rc5.gasUsed}`);
    const t = await metagov.tally(proposalId);
    expect(t.tokens[1]).to.equal(10n);
    expect(t.voters[1]).to.equal(10n);
    expect(t.tokens[0]).to.equal(5n);
  });
});
