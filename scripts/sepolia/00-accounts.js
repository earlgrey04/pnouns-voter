// 役割別アカウントと残高を表示。deployer に十分あれば他アカウントへ配る(--fund)
const { ethers } = require("hardhat");
const ROLES = ["deployer/proposer/relayer", "delegator(Nouns→pNouns Voter 委任)", "voter A", "voter B", "voter C"];
async function main() {
  const signers = await ethers.getSigners();
  for (let i = 0; i < signers.length; i++) {
    console.log(i, signers[i].address, ethers.formatEther(await ethers.provider.getBalance(signers[i].address)), "ETH", ROLES[i]);
  }
  if (process.env.FUND) {
    const amt = ethers.parseEther(process.env.FUND); // 各アカウントへ配る額
    for (let i = 1; i < signers.length; i++) {
      const bal = await ethers.provider.getBalance(signers[i].address);
      if (bal >= amt) continue;
      const tx = await signers[0].sendTransaction({ to: signers[i].address, value: amt - bal });
      console.log(`fund ${i}: ${tx.hash}`);
      await tx.wait();
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
