// ブラウザ(dApp)の代わり: voter A/B/C が EIP-712 署名してリレイヤー API に POST する
const { ethers } = require("hardhat");
const API = process.env.API || "http://localhost:8790";
async function main() {
  const [, , voterA, voterB, voterC] = await ethers.getSigners();
  const cfg = await (await fetch(`${API}/api/config`)).json();
  const { proposals } = await (await fetch(`${API}/api/proposals`)).json();
  const target = process.env.PROPOSAL_ID ? proposals.find((p) => p.id === Number(process.env.PROPOSAL_ID)) : proposals.find((p) => p.votable);
  if (!target) throw new Error("no votable proposal");
  console.log(`voting on Prop ${target.id} "${target.title}" deadline ${target.metagov.deadline}`);
  const plan = [[voterA, Number(process.env.A ?? 1)], [voterB, Number(process.env.B ?? 1)], [voterC, Number(process.env.C ?? 0)]];
  for (const [s, support] of plan) {
    const t = await (await fetch(`${API}/api/tokens/${s.address}?proposalId=${target.id}`)).json();
    const tokenIds = t.tokenIds.filter((id) => !t.voted[id]).map(String);
    const signature = await s.signTypedData(cfg.domain, cfg.types, { proposalId: String(target.id), support, tokenIds });
    const r = await fetch(`${API}/api/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: String(target.id), support, tokenIds, signature }) });
    console.log(s.address, "support", support, "tokens", tokenIds, "->", r.status, await r.text());
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
