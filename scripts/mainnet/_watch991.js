const { ethers } = require("hardhat");
const { setTimeout: sleep } = require("timers/promises");
async function main(){
  const c = await ethers.getContractAt("PNounsSnapVoter", "0x77a503db95a58Cd452bf47814f35D7733a283502");
  let prev = -1;
  for (let i = 0; i < 20; i++) {
    const [t, acc, blk] = await Promise.all([c.tally(991), c.snapshotVotesAccepted(991), ethers.provider.getBlockNumber()]);
    if (Number(acc) !== prev) { console.log(`[${new Date().toISOString().slice(11,19)}] block=${blk} accepted=${acc} tokens[against,for,abstain]=${t[0].map(String)} voters=${t[1].map(String)}`); prev = Number(acc); }
    if (Number(acc) >= 2) { console.log("✅ 2 票ともオンチェーン反映"); return; }
    await sleep(30000);
  }
  console.log("⏱ まだ反映されず(10分)。Worker ログの確認が必要");
}
main().catch(e=>{console.error(e.shortMessage||e.message);process.exit(1);});
