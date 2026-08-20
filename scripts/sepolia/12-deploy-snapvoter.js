// PNounsSnapVoter を Sepolia にデプロイ(space=earl-grey.eth、margin=5、registrar=deployer)し、返金プールを入れて委任を切り替える
const { ethers } = require("hardhat");
const { SEPOLIA, NOUNS_ABI, loadDeployments, saveDeployments } = require("./lib");
async function main() {
  const [deployer, delegator] = await ethers.getSigners();
  const dep = loadDeployments();
  const F = await ethers.getContractFactory("PNounsSnapVoter");
  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5));
  await c.waitForDeployment();
  dep.snapVoter = await c.getAddress();
  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
  saveDeployments(dep);
  await (await c.setLiveMode(true)).wait();
  await (await deployer.sendTransaction({ to: dep.snapVoter, value: ethers.parseEther(process.env.FUND_ETH || "0.02") })).wait();
  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
  await (await nouns.delegate(dep.snapVoter)).wait();
  console.log("SnapVoter:", dep.snapVoter, "votes:", String(await nouns.getCurrentVotes(dep.snapVoter)));
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
