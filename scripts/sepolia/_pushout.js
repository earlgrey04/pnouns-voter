// X を直近取得(first:1)外に押し出す用の Snapshot 提案を 1 本作り、X(#531)を監視。
const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const { loadDeployments, sleep } = require("./lib");
const SPACE = "earl-grey.eth", SEQ = "https://seq.snapshot.org";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
async function main(){
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  const bot = deployer; // Sepolia の bot = 開発鍵
  const mp = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const now = Math.floor(Date.now()/1000);
  const client = new snapshot.Client712(SEQ);
  const r = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice", title: "[pushout] recentLimit test", body: "pushout", discussion: "",
    choices: ["a","b"], start: now, end: now+300, snapshot: await mp.getBlockNumber(), plugins: "{}", app: "pnouns-voter",
  });
  console.log("押し出し提案を作成:", r.id.slice(0,20), "→ #531 が直近1件外に");
  // X(#531)を監視
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  let prev=-1;
  for(let i=0;i<40;i++){
    const [t,acc,blk]=await Promise.all([c.tally(531),c.snapshotVotesAccepted(531),ethers.provider.getBlockNumber()]);
    if(Number(acc)!==prev){console.log(`[${new Date().toISOString().slice(11,19)}] block=${blk} #531: accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]}`);prev=Number(acc);}
    if(t[2]){console.log(`✅ B 完了: #531 が逆引き(RESOLVE_RECENT_LIMIT=1)経由で投函・execute。result=${t[3]}`);return;}
    await sleep(15000);
  }
  console.log("⏱ タイムアウト(#531 の締切超過なら手動確認)");
}
main().catch(e=>{console.error(e.error_description||e.shortMessage||e.message);process.exit(1);});
