// pNouns 複製を任意アドレスに mint(MetaMask での手動テスト用)。TO=0x... N=3
const { ethers } = require("hardhat");
const { loadDeployments, PNOUNS_ABI } = require("./lib");
async function main() {
  const [deployer] = await ethers.getSigners();
  const to = ethers.getAddress(process.env.TO);
  const n = Number(process.env.N || 3);
  const pnouns = new ethers.Contract(loadDeployments().pnouns, PNOUNS_ABI, deployer);
  const tx = await pnouns.adminMint([to], [n]);
  await tx.wait();
  console.log(`minted ${n} to ${to}; balance now ${await pnouns.balanceOf(to)} totalSupply ${await pnouns.totalSupply()}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
