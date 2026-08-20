// Snapshot の日次提案上限を避けるテスト: 既に投票が入っている過去の Snapshot 提案を
// 新しい Sepolia Nouns 提案に対応付けて、署名の取得〜反映〜execute を検証する
const { ethers } = require("hardhat");
const { SEPOLIA, DAO_ABI, loadDeployments } = require("./lib");
async function main() {
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  const snapId = process.env.SNAP_ID;
  if (!snapId) throw new Error("SNAP_ID を指定してください");
  const r = await (await fetch("https://hub.snapshot.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${snapId}") { title votes space { id } } }` }) })).json();
  const pr0 = r.data.proposal;
  if (!pr0) throw new Error("Snapshot 提案が見つかりません");
  console.log(`再利用する Snapshot 提案: ${pr0.title} (${pr0.votes} 票, space ${pr0.space.id})`);
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# reuse test\nsnapshot: ${snapId}`)).wait();
  const nounsId = await dao.proposalCount();
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
  await (await c.registerProposal(snapId, nounsId)).wait();
  const pr = await dao.proposals(nounsId);
  console.log(`nouns proposal #${nounsId} start=${pr.startBlock} end=${pr.endBlock} deadline=${await c.voteDeadline(nounsId)} → Worker が処理します`);
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
