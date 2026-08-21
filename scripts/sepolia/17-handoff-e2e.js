// 確定引き継ぎ方式のライブ E2E(第23回監査で「条件付き可」):
//  ① Sepolia Nouns DAO に提案作成 ② create-and-register で Snapshot 作成+読み戻し検算+対応表登録
//  ③ テスト投票者が Snapshot 投票 ④ Worker が投函→execute するのを監視
const { ethers } = require("hardhat");
const { execFileSync } = require("child_process");
const path = require("path");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");

const SPACE = "earl-grey.eth";
const SEQ = "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
const DESC_FROM = process.env.DESC_FROM || "989";

async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();

  // ① 本文(mainnet の実提案)で Sepolia Nouns 提案を作成
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${DESC_FROM}") { description } }` }) })).json();
  const D = r.data.proposal.description;
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address], [0], [""], ["0x"], D)).wait();
  const nounsId = Number(await dao.proposalCount());
  console.log(`① Sepolia Nouns 提案 #${nounsId} を作成(本文 = mainnet #${DESC_FROM})`);

  // ② create-and-register(作成 + 読み戻し検算 + 登録)を主経路として実行
  console.log(`② create-and-register --nouns ${nounsId} を実行...`);
  execFileSync("node", ["scripts/create-and-register.mjs", "--nouns", String(nounsId)],
    { cwd: path.join(__dirname, "..", ".."), stdio: "inherit", env: { ...process.env, NETWORK: "sepolia", DESC_FROM } });

  // 対応表から snapId を取得
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  const snapHash = await c.nounsToSnap(nounsId);
  if (snapHash === ethers.ZeroHash) throw new Error("登録されていません");
  // snapId は KV/ログにあるが、投票には Snapshot 提案 ID が要る。ハブから取得
  const q = await (await fetch("https://hub.snapshot.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposals(where:{space:"${SPACE}"}, first: 5, orderBy: "created", orderDirection: desc) { id title } }` }) })).json();
  const snapId = q.data.proposals.find((x) => x.title.includes(`[Prop ${nounsId}]`))?.id;
  console.log(`   登録済み。Snapshot 提案 = ${snapId}`);

  // ③ 投票
  const client = new snapshot.Client712(SEQ);
  for (const [w, choice] of [[voterA, 1], [voterB, 2], [voterC, 3]]) {
    try { await client.vote(adapt(w), w.address, { space: SPACE, proposal: snapId, type: "single-choice", choice, reason: "", app: "pnouns-voter" }); console.log(`③ ${w.address.slice(0, 10)} → ${["", "賛成", "反対", "棄権"][choice]}`); }
    catch (e) { console.log(`③ ${w.address.slice(0, 10)} 投票失敗: ${e.error_description || e.message}`); }
  }

  // ④ 監視: 猶予明け(delay=5) → 投函 → execute
  console.log("④ Worker の自動処理を監視(投函 → 締切後 execute)...");
  for (let i = 0; i < 40; i++) {
    const [t, acc, blk] = await Promise.all([c.tally(nounsId), c.snapshotVotesAccepted(nounsId), ethers.provider.getBlockNumber()]);
    console.log(`[${new Date().toISOString().slice(11, 19)}] block=${blk} accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]} result=${t[3]}`);
    if (t[2]) { console.log("✅ E2E 完了(execute 済み)"); return; }
    await sleep(20000);
  }
  console.log("⏱ タイムアウト — Worker のログ/Discord を確認してください");
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
