// 登録係の Cloudflare 実装のライブ E2E:
//  ① Sepolia Nouns DAO に提案を作成(この本文が Worker の検証基準)
//  ② bot が新フォーマットで Snapshot に提案を作成(登録はしない)
//  ③ テスト投票者が即座に Snapshot で投票
//  ④ Worker が自動登録(内容一致検証) → 猶予明けに投函 → 締切後に execute、を監視
const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
const { buildProposal } = require("../lib/proposal-format.mjs");

const SPACE = "earl-grey.eth";
const SEQ = "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();

  // 本文: 実物の Nouns 提案(989)の Markdown を使用
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"989") { description } }` }) })).json();
  const D = r.data.proposal.description;
  console.log(`本文: mainnet Prop 989 (${D.length.toLocaleString()} 文字)`);

  // ① Sepolia Nouns 提案(オンチェーン本文 = D)
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address], [0], [""], ["0x"], D)).wait();
  const nounsId = Number(await dao.proposalCount());
  console.log(`① Nouns 提案 #${nounsId} を作成`);

  // ② 新フォーマットで Snapshot 提案(登録しない — Worker に任せる)
  const p = buildProposal({ nounsId, description: D });
  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
  const now = Math.floor(Date.now() / 1000);
  const client = new snapshot.Client712(SEQ);
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const receipt = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    choices: p.choices, start: now, end: now + 172800, snapshot: await mainnetProvider.getBlockNumber(),
    plugins: "{}", app: "pnouns-voter",
  });
  console.log(`② Snapshot 提案: ${receipt.id} ${p.truncated ? "(切り詰めあり)" : "(全文)"}`);

  // ③ 即座に投票(A=賛成2枚, B=反対1枚, C=棄権1枚 想定)
  for (const [w, choice] of [[voterA, 1], [voterB, 2], [voterC, 3]]) {
    try { await client.vote(adapt(w), w.address, { space: SPACE, proposal: receipt.id, type: "single-choice", choice, reason: "", app: "pnouns-voter" }); console.log(`③ ${w.address.slice(0, 10)} → choice ${choice}`); }
    catch (e) { console.log(`③ ${w.address.slice(0, 10)} 投票失敗: ${e.error_description || e.message}`); }
  }

  // ④ 監視: 自動登録 → 受理 → execute
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  const h = ethers.keccak256(ethers.toUtf8Bytes(receipt.id));
  let registered = false;
  for (let i = 0; i < 40; i++) {
    const [mapped, blk] = await Promise.all([c.snapToNouns(h), ethers.provider.getBlockNumber()]);
    let line = `[${new Date().toISOString().slice(11, 19)}] block=${blk}`;
    if (!registered && Number(mapped) === nounsId) { registered = true; line += ` ✅ 自動登録を確認 (eligibleAt=${await c.eligibleAtBlock(nounsId)})`; }
    if (registered) {
      const [t, acc] = await Promise.all([c.tally(nounsId), c.snapshotVotesAccepted(nounsId)]);
      line += ` accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]} result=${t[3]}`;
      console.log(line);
      if (t[2]) { console.log("✅ E2E 完了(execute 済み)"); return; }
    } else console.log(line + " (登録待ち)");
    await sleep(20000);
  }
  console.log("⏱ タイムアウト — Worker のログ/Discord を確認してください");
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
