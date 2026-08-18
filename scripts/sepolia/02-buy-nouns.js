// Sepolia の Nouns オークション(2分/最低1wei)で Nouns を落札する。
// 目標: deployer(提案者) 4 枚以上、delegator 2 枚。TARGET_DEPLOYER / TARGET_DELEGATOR で変更可。
const { ethers } = require("hardhat");
const { SEPOLIA, AH_ABI, NOUNS_ABI, sleep } = require("./lib");
async function main() {
  const [deployer, delegator] = await ethers.getSigners();
  const targets = [
    [deployer, Number(process.env.TARGET_DEPLOYER || 4)],
    [delegator, Number(process.env.TARGET_DELEGATOR || 2)],
  ];
  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
  const ah = new ethers.Contract(SEPOLIA.AUCTION_HOUSE, AH_ABI, deployer);
  const reserve = await ah.reservePrice();
  const incPct = await ah.minBidIncrementPercentage();
  for (const [signer, target] of targets) {
    while (true) {
      const bal = await nouns.balanceOf(signer.address);
      console.log(`${signer.address} has ${bal} Nouns (target ${target})`);
      if (bal >= BigInt(target)) break;
      let a = await ah.auction();
      const now = Math.floor(Date.now() / 1000);
      if (a.settled || Number(a.endTime) <= now) {
        console.log(`settle #${a.nounId} & create new`);
        const tx = await ah.connect(signer).settleCurrentAndCreateNewAuction();
        await tx.wait();
        a = await ah.auction();
      }
      // 現在のオークションに入札(未入札なら reserve、入札済みなら +minIncrement)
      const minBid = a.amount === 0n ? reserve : a.amount + (a.amount * BigInt(incPct)) / 100n + 1n;
      if (a.bidder.toLowerCase() !== signer.address.toLowerCase()) {
        console.log(`bid #${a.nounId} ${minBid} wei (ends in ${Number(a.endTime) - now}s)`);
        const tx = await ah.connect(signer).createBid(a.nounId, { value: minBid });
        await tx.wait();
      }
      // 終了まで待って決済(決済すると落札者に mint される)
      const wait = Number(a.endTime) - Math.floor(Date.now() / 1000) + 3;
      if (wait > 0) { console.log(`waiting ${wait}s for auction end`); await sleep(wait * 1000); }
      const cur = await ah.auction();
      if (cur.nounId === a.nounId && !cur.settled) {
        console.log(`settle #${a.nounId}`);
        const tx = await ah.connect(signer).settleCurrentAndCreateNewAuction();
        await tx.wait();
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
