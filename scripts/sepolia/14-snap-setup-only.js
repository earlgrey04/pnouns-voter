// Worker 主導 E2E の準備だけ行う: ①Snapshot 提案 ②voter A/B/C 投票 ③Sepolia Nouns 提案 ④registerProposal
// 以降(署名取得→送信→execute→Discord 通知)は Cloudflare Worker が無人で行う
const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
const SPACE = "earl-grey.eth";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
async function main() {
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  const client = new snapshot.Client712("https://seq.snapshot.org");
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const now = Math.floor(Date.now() / 1000);
  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
  const receipt = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice",
    title: `[Worker E2E] pNouns Snap Voter ${new Date().toISOString().slice(11, 19)}`,
    body: "Cloudflare Worker が無人で Nouns DAO に反映するテスト。",
    choices: ["賛成", "反対", "棄権"], start: now, end: now + 300,
    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
  });
  console.log("snapshot proposal:", receipt.id);
  const plan = (process.env.PLAN || "3,1,1").split(",").map(Number); // 既定: A=棄権 B=賛成 C=賛成
  for (const [i, choice] of plan.entries()) {
    const w = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
    await client.vote(adapt(w), w.address, { space: SPACE, proposal: receipt.id, type: "single-choice", choice, reason: "", app: "pnouns-voter-test" });
    console.log("voted:", w.address.slice(0, 10), "choice", choice);
  }
  if (process.env.WAIT_UI) { console.log(`UI 投票の待機 ${process.env.WAIT_UI}s: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`); await sleep(Number(process.env.WAIT_UI) * 1000); }
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# Snap Voter worker E2E\nsnapshot: ${receipt.id}`)).wait();
  const nounsId = await dao.proposalCount();
  const snapVoter = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
  await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
  console.log(`nouns proposal #${nounsId} registered → あとは Worker が処理`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
