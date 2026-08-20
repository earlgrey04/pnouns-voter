// PNounsSnapVoter の mainnet フォークテスト。
// A: Prop 989 に実際に投じられた本物の Snapshot 署名 3 票をリプレイして集計されることを確認(締切前のブロックに固定)
// B: 新規提案 + 自作の Snapshot 形式署名で、投票・やり直し・不正系・execute を確認
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80";
const PNOUNS_TREASURY = "0x8ae80e0b44205904be18869240c2ec62d2342785";
const NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d";
const NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03";
// Nouns は 1 提案者につき同時 1 提案までなので、テストの本数ぶん候補を用意する
const PROPOSER_CANDIDATES = [
  "0x094b3226c7f55de7038b5be9bbac0866b3f6c8b8", "0x322956ea3f126a68fa6103965a75f6f4da7affc9",
  "0x14c86d9255d5b9768704b670c57f30662aff41f0", "0xf64642b49886ba8fee006767c3b1303df25c5211",
  "0x83fcfe8ba2fece9578f0bbafed4ebf5e915045b9", "0xcc2688350d29623e2a0844cc8885f9050f0f6ed5",
  "0x39a7ea92f59d74a950e4a08990519ee44ef3abc0", "0x00fb8a99188c6083df04abeb0f7066e8ffb1f124",
];
const usedProposers = new Set();
const NOUN_HOLDER_2 = "0x09960871a7ec7a5f1956c3e29ad69f906f4fb264";
const SPACE = "pnounsdao.eth";
const SNAP_989 = "0x8fd3dd2ab3961f5b8de95815b39b93b9ed5fbc8dbae8e8d542581541aaa8fdce";
const PINNED_BLOCK = 25790000; // 989 が Active(endBlock 25798311)の時点

// Prop 989 の本物の投票(IPFS から取得した署名エンベロープ)
const REAL_VOTES = [
  { from: "0x0bC7fd075906C3A14428f9745743b5945d556896", timestamp: 1786965267, choice: 1, app: "snapshot-v2", sig: "0x3828668a86d3b80ba12107e818fb1af8ddc7b7e03826fbdc0f10d4832bd352a968020c2ca79aa1e95e80aa53c040ecc46cc6bc0e547a53c4545fbe5e92607d671c" },
];

const SNAP_DOMAIN = { name: "snapshot", version: "0.1.4" };
const SNAP_TYPES = { Vote: [
  { name: "from", type: "string" }, { name: "space", type: "string" }, { name: "timestamp", type: "uint64" },
  { name: "proposal", type: "string" }, { name: "choice", type: "uint32" }, { name: "reason", type: "string" },
  { name: "app", type: "string" }, { name: "metadata", type: "string" },
] };

async function impersonate(addr) {
  await network.provider.send("hardhat_impersonateAccount", [addr]);
  await network.provider.send("hardhat_setBalance", [addr, "0x56BC75E2D63100000"]);
  return ethers.getSigner(addr);
}
async function mine(n) { if (n > 0n) await network.provider.send("hardhat_mine", ["0x" + BigInt(n).toString(16)]); }
async function tokensOf(pnouns, addr, max = 2100) {
  const out = [];
  for (let id = 1; id <= max; id++) { try { if ((await pnouns.ownerOf(id)).toLowerCase() === addr.toLowerCase()) out.push(BigInt(id)); } catch {} if (out.length >= 20) break; }
  return out;
}
function snapVoteArg(v, tokenIds) {
  return { from: v.from, timestamp: v.timestamp, proposal: v.proposal, choice: v.choice, reason: v.reason ?? "", app: v.app ?? "test", metadata: v.metadata ?? "", signature: v.sig, tokenIds };
}
async function signSnapVote(signer, proposalStr, choice, timestamp) {
  const message = { from: signer.address, space: SPACE, timestamp, proposal: proposalStr, choice, reason: "", app: "test", metadata: "" };
  const sig = await signer.signTypedData(SNAP_DOMAIN, SNAP_TYPES, message);
  return { from: signer.address, timestamp, proposal: proposalStr, choice, reason: "", app: "test", metadata: "", sig };
}

describe("PNounsSnapVoter (mainnet fork)", function () {
  let deployer, relayer, alice, bob, carol, executor;
  let voterC, dao, nouns, pnouns;

  before(async function () {
    // 989 の投票期間内のブロックに固定
    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: process.env.MAINNET_RPC_URL, blockNumber: PINNED_BLOCK } }] });
    await network.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x3b9aca00"]); // 1 gwei(固定ブロックの高い basefee を引き継がない)
    await network.provider.send("hardhat_mine", ["0x1"]);
    [deployer, relayer, alice, bob, carol, executor] = await ethers.getSigners();
    dao = new ethers.Contract(NOUNS_DAO, [
      "function propose(address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,string description) returns (uint256)",
      "function proposalCount() view returns (uint256)", "function state(uint256) view returns (uint8)",
      "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
      "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
    ], ethers.provider);
    nouns = new ethers.Contract(NOUNS_TOKEN, ["function delegate(address)", "function getCurrentVotes(address) view returns (uint96)", "function balanceOf(address) view returns (uint256)"], ethers.provider);
    pnouns = new ethers.Contract(PNOUNS, ["function ownerOf(uint256) view returns (address)", "function transferFrom(address,address,uint256)"], ethers.provider);
    const F = await ethers.getContractFactory("PNounsSnapVoter");
    voterC = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, deployer.address, SPACE, [PNOUNS_TREASURY], 10, 0);
    await voterC.waitForDeployment();
    await voterC.setLiveMode(true);
    await deployer.sendTransaction({ to: await voterC.getAddress(), value: ethers.parseEther("0.05") });
  });

  it("A: Prop 989 の本物の Snapshot 署名をオンチェーン検証して集計できる", async function () {
    await voterC.registerProposal(SNAP_989, 989);
    const v = REAL_VOTES[0];
    const ids = await tokensOf(pnouns, v.from, 2100);
    expect(ids.length).to.be.greaterThan(0);
    const arg = snapVoteArg({ ...v, proposal: SNAP_989, reason: "", metadata: "" }, ids);
    const rc = await (await voterC.connect(relayer).castSnapshotVotes([arg])).wait();
    console.log(`      real vote replayed: voter ${v.from.slice(0, 10)} tokens ${ids.length} gas ${rc.gasUsed}`);
    const t = await voterC.tally(989);
    expect(t.tokens[1]).to.equal(BigInt(ids.length)); // choice 1 = 賛成
    expect(t.voters[1]).to.equal(1n);
    // 同じ署名の再提出(補完対象の token なし)は NothingCounted
    await expect(voterC.castSnapshotVotes([arg])).to.be.revertedWithCustomError(voterC, "NothingCounted");
    // 改ざん(choice 書き換え)は拒否される(EOA なら FromMismatch、EIP-7702 コード付き EOA なら InvalidContractSignature)
    const bad = { ...arg, choice: 2 };
    await expect(voterC.castSnapshotVotes([bad])).to.be.reverted;
  });

  describe("B: 新規提案 + 自作 Snapshot 形式署名", function () {
    let proposalId; const SNAP_TEST = "0x" + "ab".repeat(32);
    before(async function () {
      const holder = await impersonate(NOUN_HOLDER_2);
      await nouns.connect(holder).delegate(await voterC.getAddress());
      await mine(1n);
      let created = false;
      for (const p of PROPOSER_CANDIDATES) {
        if (usedProposers.has(p)) continue;
        try { const s = await impersonate(p); await dao.connect(s).propose([NOUN_HOLDER_2], [0], [""], ["0x"], "# snap voter test"); usedProposers.add(p); created = true; break; } catch (e) {}
      }
      expect(created).to.equal(true);
      proposalId = await dao.proposalCount();
      await voterC.registerProposal(SNAP_TEST, proposalId);
      // pNouns をテスト署名者へ(トレジャリー以外の実保有者から)
      const assign = [[alice, 2], [bob, 2], [carol, 1]];
      let id = 1;
      for (const [signer, count] of assign) {
        let got = 0;
        for (; id <= 2100 && got < count; id++) {
          const owner = (await pnouns.ownerOf(id)).toLowerCase();
          if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
          const s = await impersonate(owner);
          await pnouns.connect(s).transferFrom(owner, signer.address, id);
          (signer.tokenIds ||= []).push(BigInt(id));
          got++;
        }
      }
      const pr = await dao.proposals(proposalId);
      await mine(pr.startBlock - BigInt(await ethers.provider.getBlockNumber()) + 1n);
      expect(await dao.state(proposalId)).to.equal(1n);
    });

    it("投票 → やり直し(新 timestamp・choice 変更) → 古い署名は拒否 → execute で Nouns DAO に記録", async function () {
      const t0 = 1786900000;
      const va = await signSnapVote(alice, SNAP_TEST, 1, t0);      // 賛成 2 枚
      const vb1 = await signSnapVote(bob, SNAP_TEST, 1, t0);       // 賛成 2 枚
      const vc = await signSnapVote(carol, SNAP_TEST, 3, t0);      // 棄権 1 枚
      await voterC.connect(relayer).castSnapshotVotes([snapVoteArg(va, alice.tokenIds), snapVoteArg(vb1, bob.tokenIds), snapVoteArg(vc, carol.tokenIds)]);
      let t = await voterC.tally(proposalId);
      expect(t.tokens[1]).to.equal(4n); expect(t.tokens[2]).to.equal(1n);
      // bob がやり直し: 賛成 → 反対(新しい timestamp)
      const vb2 = await signSnapVote(bob, SNAP_TEST, 2, t0 + 100);
      const rc = await (await voterC.connect(relayer).castSnapshotVotes([snapVoteArg(vb2, bob.tokenIds)])).wait();
      const ev = rc.logs.map((l) => { try { return voterC.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "SnapVoteCounted");
      expect(ev.args.revote).to.equal(true);
      t = await voterC.tally(proposalId);
      expect(t.tokens[1]).to.equal(2n); expect(t.tokens[0]).to.equal(2n); expect(t.tokens[2]).to.equal(1n);
      expect(t.voters[1]).to.equal(1n); expect(t.voters[0]).to.equal(1n);
      // 古い署名(最初の賛成)を再提出しても戻せない
      await expect(voterC.castSnapshotVotes([snapVoteArg(vb1, bob.tokenIds)])).to.be.revertedWithCustomError(voterC, "StaleVote");
      // 不正系: choice 4 / 未登録提案 / 他人の from
      const v4 = await signSnapVote(alice, SNAP_TEST, 4, t0 + 200);
      await expect(voterC.castSnapshotVotes([snapVoteArg(v4, alice.tokenIds)])).to.be.revertedWithCustomError(voterC, "InvalidChoice");
      const vu = await signSnapVote(alice, "0x" + "cd".repeat(32), 1, t0 + 200);
      await expect(voterC.castSnapshotVotes([snapVoteArg(vu, alice.tokenIds)])).to.be.revertedWithCustomError(voterC, "NotRegistered");
      const spoof = await signSnapVote(alice, SNAP_TEST, 1, t0 + 300);
      spoof.from = bob.address; // from を別人に
      await expect(voterC.castSnapshotVotes([snapVoteArg(spoof, alice.tokenIds)])).to.be.revertedWithCustomError(voterC, "FromMismatch");
      // 締切 → execute → Nouns DAO の記録(賛成 2 = 反対 2 → 投票者 1:1 → 棄権?)
      // tokens: 賛成2 反対2 棄権1 → 最多同数(2,2) → voters 1:1 → 同数 → 棄権
      const dl = await voterC.voteDeadline(proposalId);
      await mine(dl - BigInt(await ethers.provider.getBlockNumber()));
      await voterC.connect(executor).execute(proposalId);
      const receipt = await dao.getReceipt(proposalId, await voterC.getAddress());
      expect(receipt.hasVoted).to.equal(true);
      expect(receipt.support).to.equal(2n); // 棄権
      expect(receipt.votes).to.equal(2n);
      console.log("      executed: ABSTAIN with 2 Nouns votes (tie -> tie -> abstain)");
    });

    async function newProposalWithSnap(tag) {
      let created = false;
      for (const p of PROPOSER_CANDIDATES) {
        if (usedProposers.has(p)) continue;
        try { const s = await impersonate(p); await dao.connect(s).propose([NOUN_HOLDER_2], [0], [""], ["0x"], "# " + tag); usedProposers.add(p); created = true; break; } catch {}
      }
      expect(created, "提案者候補が枯渇").to.equal(true);
      const id = await dao.proposalCount();
      const snap = "0x" + tag.charCodeAt(0).toString(16).padStart(2, "0").repeat(32);
      await voterC.registerProposal(snap, id);
      const pr = await dao.proposals(id);
      await mine(pr.startBlock - BigInt(await ethers.provider.getBlockNumber()) + 1n);
      return { id, snap };
    }

    it("H01 対策: 先回りの 1 枚投函後、同じ署名で残り token を補完できる(投票者数は増えない)", async function () {
      const { id: pid2, snap: SNAP2 } = await newProposalWithSnap("h");
      this.pid2 = pid2; this.SNAP2 = SNAP2;
      const t1 = 1786901000;
      // dave に 3 枚移す
      const [, , , , , , dave] = await ethers.getSigners();
      let got = 0;
      for (let id = 1; id <= 2100 && got < 3; id++) {
        const owner = (await pnouns.ownerOf(id)).toLowerCase();
        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
        const s = await impersonate(owner);
        try { await pnouns.connect(s).transferFrom(owner, dave.address, id); (dave.tokenIds ||= []).push(BigInt(id)); got++; } catch {}
      }
      const vd = await signSnapVote(dave, SNAP2, 1, t1);
      const before = await voterC.tally(pid2);
      // 攻撃者が 1 枚だけ添えて先に投函
      await voterC.castSnapshotVotes([snapVoteArg(vd, [dave.tokenIds[0]])]);
      let t = await voterC.tally(pid2);
      expect(t.tokens[1] - before.tokens[1]).to.equal(1n);
      // 同じ署名で全 token を補完 → 残り 2 枚が同じ賛成に加算、投票者数は据え置き
      const votersBefore = t.voters[1];
      await voterC.castSnapshotVotes([snapVoteArg(vd, dave.tokenIds)]);
      t = await voterC.tally(pid2);
      expect(t.tokens[1] - before.tokens[1]).to.equal(3n);
      expect(t.voters[1]).to.equal(votersBefore);
      // 追加できる token がない再提出は NothingCounted
      await expect(voterC.castSnapshotVotes([snapVoteArg(vd, dave.tokenIds)])).to.be.revertedWithCustomError(voterC, "NothingCounted");
    });

    it("H02 対策: 登録直後は受け付けず(delay)、未計上なら取消して登録し直せる", async function () {
      await voterC.setRegistrationDelayBlocks(1000);
      const SNAP_X = "0x" + "ee".repeat(32);
      await voterC.registerProposal(SNAP_X, 999999);
      const [, , , , , , , eve] = await ethers.getSigners();
      const ve = await signSnapVote(eve, SNAP_X, 1, 1786902000);
      await expect(voterC.castSnapshotVotes([snapVoteArg(ve, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
      // 未計上なので取消可能 → 別の Nouns 提案に登録し直せる
      await voterC.unregisterProposal(999999);
      await voterC.registerProposal(SNAP_X, 999998);
      expect(await voterC.snapToNouns(ethers.keccak256(ethers.toUtf8Bytes(SNAP_X)))).to.equal(999998n);
      await voterC.setRegistrationDelayBlocks(0);
      // 計上済みの提案(proposalId)は取消不可
      await expect(voterC.unregisterProposal(proposalId)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
    });

    it("H02R 対策: 猶予期間中は直接投票も不可。直接投票だけなら取消できる", async function () {
      const { id: pid4, snap: SNAP4 } = await newProposalWithSnap("r");
      await voterC.setRegistrationDelayBlocks(1000);
      const SNAP_Y = "0x" + "77".repeat(32);
      await voterC.registerProposal(SNAP_Y, 888888);
      // 猶予中は直接投票(castVote)も拒否される → 取消の妨害ができない
      const [, , , , , , , , , frank] = await ethers.getSigners();
      let fid;
      for (let id = 1; id <= 2100; id++) {
        const owner = (await pnouns.ownerOf(id)).toLowerCase();
        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
        const s2 = await impersonate(owner);
        try { await pnouns.connect(s2).transferFrom(owner, frank.address, id); fid = BigInt(id); break; } catch {}
      }
      await expect(voterC.connect(frank).castVote(888888, 1, [fid])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
      await voterC.unregisterProposal(888888); // 妨害されずに取消できる
      // 猶予ゼロの提案に直接投票しても、Snapshot 票がなければ取消できる
      await voterC.setRegistrationDelayBlocks(0);
      await voterC.connect(frank).castVote(pid4, 1, [fid]);
      expect((await voterC.tally(pid4)).tokens[1]).to.equal(1n);
      expect(await voterC.snapshotVotesCounted(pid4)).to.equal(0n);
      await voterC.unregisterProposal(pid4); // 直接投票は取消を妨げない
      expect(await voterC.nounsToSnap(pid4)).to.equal(ethers.ZeroHash);
    });

    it("指摘3 対策: 直接投票の後に Snapshot 署名でやり直しても(新規 token 0 でも)取消は不可になる", async function () {
      const { id: pid5, snap: SNAP5 } = await newProposalWithSnap("s");
      const [, , , , , , , , , , grace] = await ethers.getSigners();
      let gid;
      for (let id = 1; id <= 2100; id++) {
        const owner = (await pnouns.ownerOf(id)).toLowerCase();
        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
        const s2 = await impersonate(owner);
        try { await pnouns.connect(s2).transferFrom(owner, grace.address, id); gid = BigInt(id); break; } catch {}
      }
      // まず直接投票(この時点では取消できる)
      await voterC.connect(grace).castVote(pid5, 1, [gid]);
      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(0n);
      // 次に「より新しい」Snapshot 署名で choice を変更(新規 token は 0 枚)
      const later = Number((await ethers.provider.getBlock("latest")).timestamp) + 1000; // フォークのブロック時刻を基準にする
      const vg = await signSnapVote(grace, SNAP5, 2, later);
      await voterC.castSnapshotVotes([snapVoteArg(vg, [gid])]);
      const t = await voterC.tally(pid5);
      expect(t.tokens[0]).to.equal(1n); // 反対に移った
      expect(await voterC.snapshotVotesCounted(pid5)).to.equal(0n); // 新規 token は 0
      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(1n); // だが受理は 1 件
      await expect(voterC.unregisterProposal(pid5)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
    });

    it("M04 対策: EIP-1271 スマートウォレットの Snapshot 投票を検証できる", async function () {
      const { id: pid3, snap: SNAP3 } = await newProposalWithSnap("m");
      const [, , , , , , , , walletOwner] = await ethers.getSigners();
      const MW = await ethers.getContractFactory("Mock1271Wallet");
      const mw = await MW.deploy(walletOwner.address);
      await mw.waitForDeployment();
      // pNouns を 1 枚ウォレットコントラクトへ
      let tokenId;
      for (let id = 1; id <= 2100; id++) {
        const owner = (await pnouns.ownerOf(id)).toLowerCase();
        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
        const s = await impersonate(owner);
        try { await pnouns.connect(s).transferFrom(owner, await mw.getAddress(), id); tokenId = BigInt(id); break; } catch {}
      }
      // owner 鍵で snapshot 形式の署名(from = ウォレットコントラクトのアドレス)
      const message = { from: await mw.getAddress(), space: SPACE, timestamp: 1786903000, proposal: SNAP3, choice: 2, reason: "", app: "test", metadata: "" };
      const sig = await walletOwner.signTypedData(SNAP_DOMAIN, SNAP_TYPES, message);
      const arg = { from: message.from, timestamp: message.timestamp, proposal: SNAP3, choice: 2, reason: "", app: "test", metadata: "", signature: sig, tokenIds: [tokenId] };
      const before = await voterC.tally(pid3);
      await voterC.castSnapshotVotes([arg]);
      const t = await voterC.tally(pid3);
      expect(t.tokens[0] - before.tokens[0]).to.equal(1n);
    });

  });


  after(async function () {
    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: process.env.MAINNET_RPC_URL } }] });
  });
});
