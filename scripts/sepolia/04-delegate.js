// delegator(pNouns マルチシグ代役)が Nouns の投票権を MetaGov に委任する
const { ethers } = require("hardhat");
const { SEPOLIA, NOUNS_ABI, loadDeployments } = require("./lib");
async function main() {
  const [, delegator] = await ethers.getSigners();
  const dep = loadDeployments();
  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
  console.log("delegator", delegator.address, "Nouns:", String(await nouns.balanceOf(delegator.address)), "current delegate:", await nouns.delegates(delegator.address));
  if ((await nouns.delegates(delegator.address)).toLowerCase() !== dep.metagov.toLowerCase()) {
    const tx = await nouns.delegate(dep.metagov);
    console.log("delegate tx:", tx.hash);
    await tx.wait();
  }
  console.log("MetaGov current votes:", String(await nouns.getCurrentVotes(dep.metagov)));
}
main().catch((e) => { console.error(e); process.exit(1); });
