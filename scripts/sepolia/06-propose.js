// テスト用 no-op 提案を 1 本作る(deployer=提案者)
const { ethers } = require("hardhat");
const { SEPOLIA, DAO_ABI } = require("./lib");
async function main() {
  const [deployer] = await ethers.getSigners();
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  const tx = await dao.propose([deployer.address], [0], [""], ["0x"], `# pNouns MetaGov relayer test ${new Date().toISOString()}\nno-op`);
  await tx.wait();
  const id = await dao.proposalCount();
  const pr = await dao.proposals(id);
  console.log(`proposal #${id} start=${pr.startBlock} end=${pr.endBlock}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
