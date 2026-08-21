// B: Worker tick 全体で逆引き経路を検証(第27回 live化条件②)。
// RESOLVE_RECENT_LIMIT=1 の Worker 下で、提案 X を作り、直後に提案 Y を作って
// X を「直近1件外」に押し出す。Worker が X を ProposalRegistered イベントから
// 逆引きで解決し、投函 → execute するかを監視する。
const { ethers } = require("hardhat");
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
const SPACE = "earl-grey.eth", SEQ = "https://seq.snapshot.org";
const SUB = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function makeNouns(dao, deployer, descId) {
  const r = await (await fetch(SUB, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${descId}") { description } }` }) })).json();
  await (await dao.propose([deployer.address], [0], [""], ["0x"], r.data.proposal.description)).wait();
  return Number(await dao.proposalCount());
}
async function reg(nounsId) {
  execFileSync("node", ["scripts/create-and-register.mjs", "--nouns", String(nounsId)], { cwd: path.join(__dirname, "..", ".."), stdio: "inherit", env: { ...process.env, NETWORK: "sepolia", DESC_FROM: "989" } });
}
async function snapIdOf(nounsId) {
  const q = await (await fetch("https://hub.snapshot.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposals(where:{space:"${SPACE}"}, first: 8, orderBy: "created", orderDirection: desc) { id title } }` }) })).json();
  return q.data.proposals.find((x) => x.title.includes(`[Prop ${nounsId}]`))?.id;
}

async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  const client = new snapshot.Client712(SEQ);

  // 提案 X(逆引き対象)を作成・登録・投票
  const X = await makeNouns(dao, deployer, "989");
  console.log(`① 提案 X = Nouns #${X}`);
  await reg(X);
  const snapX = await snapIdOf(X);
  for (const [w, ch] of [[voterA, 1], [voterB, 1], [voterC, 2]]) {
    try { await client.vote(adapt(w), w.address, { space: SPACE, proposal: snapX, type: "single-choice", choice: ch, reason: "", app: "pnouns-voter" }); } catch (e) { console.log("投票失敗", e.message?.slice(0, 40)); }
  }
  console.log(`② X に投票済み(賛成2/反対1)。snapX=${snapX.slice(0, 16)}…`);

  // 提案 Y(押し出し役)を作成・登録 → recentLimit=1 で X が直近取得外になる
  const Y = await makeNouns(dao, deployer, "989");
  await reg(Y);
  console.log(`③ 提案 Y = Nouns #${Y} を作成(X が直近1件外に押し出される)`);

  // ④ Worker が X を逆引きで解決 → 投函 → execute するか監視
  console.log("④ Worker(RESOLVE_RECENT_LIMIT=1)が X を逆引き経由で処理するか監視...");
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  let prev = -1;
  for (let i = 0; i < 45; i++) {
    const [t, acc, blk] = await Promise.all([c.tally(X), c.snapshotVotesAccepted(X), ethers.provider.getBlockNumber()]);
    if (Number(acc) !== prev) { console.log(`[${new Date().toISOString().slice(11, 19)}] block=${blk} X: accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]}`); prev = Number(acc); }
    if (t[2]) { console.log(`✅ B 完了: X(#${X})が逆引き経由で投函・execute された。result=${t[3]}`); return; }
    await sleep(15000);
  }
  console.log("⏱ タイムアウト");
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
