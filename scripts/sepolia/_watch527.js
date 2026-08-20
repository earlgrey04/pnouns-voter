const { ethers } = require("hardhat");
const { loadDeployments } = require("./lib");
async function main() {
  const dep = loadDeployments();
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  const id = 527n;
  for (let i = 0; i < 25; i++) {
    const [t, acc, blk] = await Promise.all([c.tally(id), c.snapshotVotesAccepted(id), ethers.provider.getBlockNumber()]);
    const [tokens, voters, executed, result] = [t[0], t[1], t[2], t[3]];
    console.log(`[${new Date().toISOString().slice(11, 19)}] block=${blk} accepted=${acc} tokens=${tokens.map(String)} voters=${voters.map(String)} executed=${executed} result=${result}`);
    if (executed) { console.log("✅ execute 完了"); return; }
    await new Promise((r) => setTimeout(r, 60000));
  }
  console.log("⏱ 25 分でタイムアウト(未 execute)");
}
main().catch(e => { console.error(e.shortMessage || e.message); process.exit(1); });
