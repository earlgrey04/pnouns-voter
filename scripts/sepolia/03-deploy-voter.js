// pNouns Voter を Sepolia にデプロイ(Nouns 公式 Sepolia、pNouns 複製、margin=MARGIN(既定 5 ブロック: 投票期間 25 ブロックのため))
const { ethers } = require("hardhat");
const { SEPOLIA, loadDeployments, saveDeployments } = require("./lib");
async function main() {
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  if (!dep.pnouns) throw new Error("run 01-deploy-pnouns first");
  const margin = BigInt(process.env.MARGIN || 5);
  const F = await ethers.getContractFactory("PNounsVoter");
  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
  console.log("deploy tx:", c.deploymentTransaction().hash);
  await c.waitForDeployment();
  dep.voter = await c.getAddress();
  dep.voterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
  dep.marginBlocks = Number(margin);
  saveDeployments(dep);
  const tx = await c.setLiveMode(true);
  await tx.wait();
  console.log("pNouns Voter:", dep.voter, "liveMode=true margin=", String(margin));
}
main().catch((e) => { console.error(e); process.exit(1); });
