// PNounsSnapVoter を Sepolia にデプロイ(space=earl-grey.eth、margin=5、registrar=deployer)し、返金プールを入れて委任を切り替える
const { ethers } = require("hardhat");
const { SEPOLIA, NOUNS_ABI, loadDeployments, saveDeployments } = require("./lib");
async function main() {
  const [deployer, delegator] = await ethers.getSigners();
  const dep = loadDeployments();
  const F = await ethers.getContractFactory("PNounsSnapVoter");
  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
  await c.waitForDeployment();
  // 読み戻して検証(監査 B3-H02R: 設定漏れを起こさない)
  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
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
