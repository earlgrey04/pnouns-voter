// pNouns NFT 本物ソース(contracts/vendor/pnouns)を Sepolia にデプロイし、テスト保有者に adminMint する
const { ethers } = require("hardhat");
const { loadDeployments, saveDeployments, PNOUNS_ABI } = require("./lib");
async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();
  let pnounsAddr = dep.pnouns;
  if (!pnounsAddr) {
    const F = await ethers.getContractFactory("contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:pNounsToken");
    // assetProvider は tokenURI 用なのでダミー(deployer)、管理者 = deployer
    const c = await F.deploy(deployer.address, [deployer.address]);
    console.log("deploy tx:", c.deploymentTransaction().hash);
    await c.waitForDeployment();
    pnounsAddr = await c.getAddress();
    dep.pnouns = pnounsAddr;
    dep.pnounsDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
    saveDeployments(dep);
  }
  console.log("pNouns (Sepolia clone):", pnounsAddr);
  const pnouns = new ethers.Contract(pnounsAddr, PNOUNS_ABI, deployer);
  console.log("totalSupply:", String(await pnouns.totalSupply()), "(コンストラクタでトレジャリー定数へ 100 枚)");
  // voter A: 3 枚 / B: 2 枚 / C: 1 枚 / deployer: 4 枚(dApp 手動テスト用に後で配る)
  const plan = [[voterA.address, 3], [voterB.address, 2], [voterC.address, 1], [deployer.address, 4]];
  if ((await pnouns.balanceOf(voterA.address)) === 0n) {
    const tx = await pnouns.adminMint(plan.map((p) => p[0]), plan.map((p) => p[1]));
    console.log("adminMint tx:", tx.hash);
    await tx.wait();
  }
  for (const [a] of plan) console.log(a, "balance", String(await pnouns.balanceOf(a)));
  console.log("totalSupply:", String(await pnouns.totalSupply()));
}
main().catch((e) => { console.error(e); process.exit(1); });
