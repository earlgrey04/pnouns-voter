// B3 E2E: 本物の Snapshot(earl-grey.eth, メインネットハブ)で投票 → Sepolia の SnapVoter で検証・集計 → Sepolia Nouns DAO に投票
// 手順: ①Snapshot 提案作成(bot) ②voter A/B/C が snapshot.js で投票 ③Sepolia Nouns 提案作成 ④registerProposal
//       ⑤hub から署名取得 → castSnapshotVotes ⑥締切待ち → execute → getReceipt
const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, PNOUNS_ABI, loadDeployments, sleep } = require("./lib");

const HUB = "https://hub.snapshot.org";
const SEQ = "https://seq.snapshot.org";
const SPACE = "earl-grey.eth";
const IPFS = (cid) => `https://snapshot.4everland.link/ipfs/${cid}`;

// snapshot.js は ethers v5 の _signTypedData を呼ぶため、v6 Wallet にアダプタを噛ませる
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function gql(query) {
  const r = await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}
async function tokensOf(pnouns, addr) {
  const total = Number(await pnouns.totalSupply());
  const out = [];
  for (let id = 101; id <= total; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === addr.toLowerCase()) out.push(id);
  return out;
}
async function waitForBlock(provider, target, label) {
  for (;;) { const b = await provider.getBlockNumber(); if (b >= target) return; process.stdout.write(`\r  ${label}: ${b}/${target} `); await sleep(6000); }
}

async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();
  const snapVoter = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  const pnouns = new ethers.Contract(dep.pnouns, PNOUNS_ABI, ethers.provider);
  const client = new snapshot.Client712(SEQ);

  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const snapBlock = await mainnetProvider.getBlockNumber();
  const now = Math.floor(Date.now() / 1000);
  const botWallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
  console.log("① Snapshot 提案を作成...");
  const receipt = await client.proposal(adapt(botWallet), botWallet.address, {
    space: SPACE, type: "single-choice",
    title: `[Sepolia E2E] pNouns Snap Voter test ${new Date().toISOString()}`,
    body: "B3 方式の通しテスト。結果は Sepolia の Nouns DAO に自動反映されます。",
    choices: ["賛成", "反対", "棄権"],
    start: now, end: now + 300, snapshot: snapBlock,
    plugins: "{}", app: "pnouns-voter-test", discussion: "",
  });
  const snapId = receipt.id;
  console.log("   snapshot proposal:", snapId);

  // ② voter A/B/C が投票(choice: 1=賛成 2=反対 3=棄権)
  const votes = process.env.PLAN || "1,2,1"; // A,B,C
  const plan = votes.split(",").map(Number);
  for (const [i, [w, choice]] of [[voterA, plan[0]], [voterB, plan[1]], [voterC, plan[2]]].entries()) {
    const wallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
    await client.vote(adapt(wallet), wallet.address, { space: SPACE, proposal: snapId, type: "single-choice", choice, reason: "", app: "pnouns-voter-test" });
    console.log(`② voted: ${wallet.address.slice(0, 10)} choice=${choice}`);
  }
  if (process.env.WAIT_UI) { console.log(`   ${process.env.WAIT_UI} 秒待機中 — UI から投票できます: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`); await sleep(Number(process.env.WAIT_UI) * 1000); }

  // ③ Sepolia Nouns 提案
  console.log("③ Sepolia Nouns 提案を作成...");
  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# pNouns Snap Voter E2E\nsnapshot: ${snapId}`)).wait();
  const nounsId = await dao.proposalCount();
  const pr = await dao.proposals(nounsId);
  console.log(`   nouns proposal #${nounsId} start=${pr.startBlock} end=${pr.endBlock}`);

  // ④ 対応付け登録
  await (await snapVoter.registerProposal(snapId, nounsId)).wait();
  console.log("④ registered mapping");

  // ⑤ hub から投票(署名)を取得して送信
  await sleep(10000); // hub の反映待ち
  const data = await gql(`{ votes(where:{proposal:"${snapId}"}, first: 50) { voter ipfs choice created } }`);
  console.log(`⑤ hub votes: ${data.votes.length}`);
  const args = [];
  for (const v of data.votes) {
    const env = await (await fetch(IPFS(v.ipfs))).json();
    const m = env.data.message;
    const tokenIds = await tokensOf(pnouns, v.voter);
    if (!tokenIds.length) { console.log(`   skip ${v.voter.slice(0, 10)} (no clone tokens)`); continue; }
    args.push({ from: m.from, timestamp: m.timestamp, proposal: m.proposal, choice: m.choice, reason: m.reason, app: m.app, metadata: m.metadata ?? "", signature: env.sig, tokenIds });
    console.log(`   vote: ${v.voter.slice(0, 10)} choice=${m.choice} tokens=[${tokenIds}]`);
  }
  await waitForBlock(ethers.provider, Number(pr.startBlock) + 1, "waiting Active");
  const est = await snapVoter.castSnapshotVotes.estimateGas(args);
  const tx = await snapVoter.castSnapshotVotes(args, { gasLimit: (est * 13n) / 10n }); // 返金分は見積りに乗らない
  const rc = await tx.wait();
  console.log(`\n   castSnapshotVotes: ${args.length} votes, gas ${rc.gasUsed}, tx ${tx.hash}`);
  const t = await snapVoter.tally(nounsId);
  console.log(`   tally tokens(against,for,abstain)=[${t.tokens}] voters=[${t.voters}]`);

  // ⑥ 締切 → execute
  const dl = await snapVoter.voteDeadline(nounsId);
  await waitForBlock(ethers.provider, Number(dl), "waiting deadline");
  const est2 = await snapVoter.execute.estimateGas(nounsId);
  const tx2 = await snapVoter.execute(nounsId, { gasLimit: (est2 * 13n) / 10n });
  await tx2.wait();
  const receipt2 = await dao.getReceipt(nounsId, dep.snapVoter);
  console.log(`\n⑥ executed: Nouns DAO receipt hasVoted=${receipt2.hasVoted} support=${receipt2.support} votes=${receipt2.votes}`);
  console.log(`   https://sepolia.etherscan.io/tx/${tx2.hash}`);
  console.log(`   snapshot: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message || e); process.exit(1); });
