// 多数票の複数 tick 分割排出テスト(第27回監査・live化条件①):
// 15 投票者 + MAX_BATCH=5 → 締切前の通常投函で複数 tick に分割される。
// 取りこぼし・二重計上なく全 15 票が反映され execute されることを確認する。
const { ethers } = require("hardhat");
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");

const SPACE = "earl-grey.eth", SEQ = "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
const DESC_FROM = process.env.DESC_FROM || "989";

async function main(){
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  const mnem = process.env.SEPOLIA_MNEMONIC || fs.readFileSync(path.join(__dirname,"..","..",".env"),"utf8").match(/SEPOLIA_MNEMONIC="?(.*?)"?\n/)[1];
  // 15 投票者: 既存 A/B/C(index 2,3,4) + 派生 5..16
  const idxs = [2,3,4, ...Array.from({length:12},(_,i)=>i+5)];
  const voters = idxs.map((i)=>ethers.HDNodeWallet.fromPhrase(mnem, undefined, `m/44'/60'/0'/0/${i}`));
  console.log(`投票者 ${voters.length} 人`);

  // ① Nouns 提案
  const r = await (await fetch(MAINNET_SUBGRAPH,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:`{ proposal(id:"${DESC_FROM}") { description } }`})})).json();
  const D = r.data.proposal.description;
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address],[0],[""],["0x"], D)).wait();
  const nounsId = Number(await dao.proposalCount());
  console.log(`① Nouns 提案 #${nounsId}`);

  // ② create-and-register
  console.log(`② create-and-register --nouns ${nounsId}`);
  execFileSync("node",["scripts/create-and-register.mjs","--nouns",String(nounsId)],{cwd:path.join(__dirname,"..",".."),stdio:"inherit",env:{...process.env,NETWORK:"sepolia",DESC_FROM}});
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  const q = await (await fetch("https://hub.snapshot.org/graphql",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:`{ proposals(where:{space:"${SPACE}"}, first: 5, orderBy: "created", orderDirection: desc) { id title } }`})})).json();
  const snapId = q.data.proposals.find((x)=>x.title.includes(`[Prop ${nounsId}]`))?.id;

  // ③ 15 人投票(賛成10/反対3/棄権2)
  const client = new snapshot.Client712(SEQ);
  let ok=0;
  for (let i=0;i<voters.length;i++){
    const choice = i<10?1:(i<13?2:3);
    try { await client.vote(adapt(voters[i]), voters[i].address, {space:SPACE,proposal:snapId,type:"single-choice",choice,reason:"",app:"pnouns-voter"}); ok++; }
    catch(e){ console.log(`  投票失敗 ${voters[i].address.slice(0,10)}: ${(e.error_description||e.message||"").slice(0,60)}`); }
  }
  console.log(`③ ${ok}/${voters.length} 票を投票(賛成10/反対3/棄権2)`);

  // ④ 監視: accepted が段階的(複数 tick)に増え、最終 15、取りこぼしなく execute
  console.log("④ 複数 tick 分割排出を監視...");
  let prevAcc=-1, ticks=0;
  for (let i=0;i<45;i++){
    const [t,acc,blk]=await Promise.all([c.tally(nounsId),c.snapshotVotesAccepted(nounsId),ethers.provider.getBlockNumber()]);
    if (Number(acc)!==prevAcc){ ticks++; console.log(`[${new Date().toISOString().slice(11,19)}] block=${blk} accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]}`); prevAcc=Number(acc); }
    if (t[2]){ const totalVoters=Number(t[1][0])+Number(t[1][1])+Number(t[1][2]); console.log(`✅ 完了: execute 済み。投票者数=${totalVoters}(期待 ${ok})、result=${t[3]}、accepted 変化=${ticks} 段階`); return; }
    await sleep(15000);
  }
  console.log("⏱ タイムアウト");
}
main().catch(e=>{console.error(e.error_description||e.shortMessage||e.message);process.exit(1);});
