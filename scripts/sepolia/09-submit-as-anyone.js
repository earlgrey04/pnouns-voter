// 「誰でも投函」の実地確認: 公開 API の calldata を取り、リレイヤーではない任意のウォレット(voter A)から castVotesBySig を送る
const { ethers } = require("hardhat");
const API = process.env.API || "https://pnouns-voter.x402-adsb-worker.workers.dev";
async function main() {
  const [, , anyone] = await ethers.getSigners();
  const id = process.env.PROPOSAL_ID;
  const r = await (await fetch(`${API}/api/signatures/${id}?calldata=1`)).json();
  console.log(`prop ${id}: pending ${r.pending.length} submitted ${r.submitted.length} submittable ${r.submittable}`);
  if (!r.calldata) return console.log("nothing to submit");
  const tx = await anyone.sendTransaction({ to: r.contract, data: r.calldata, gasLimit: r.gasHint });
  console.log("sent by", anyone.address, tx.hash);
  const rc = await tx.wait();
  console.log("status", rc.status, "gasUsed", String(rc.gasUsed));
}
main().catch((e) => { console.error(e); process.exit(1); });
