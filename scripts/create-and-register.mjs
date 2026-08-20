// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
//
// 使い方:
//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
import snapshot from "@snapshot-labs/snapshot.js";
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { buildProposal } from "./lib/proposal-format.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);

const NETWORK = process.env.NETWORK || "sepolia";
const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function nounsDescription(id) {
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
  const d = r?.data?.proposal?.description;
  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
  return d;
}
async function hubVotingPeriod() {
  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
  return r?.data?.space?.voting?.period || 172800;
}

async function main() {
  const nounsId = Number(arg("nouns"));
  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
  const description = await nounsDescription(descId);
  const p = buildProposal({ nounsId: descId, description });
  const period = await hubVotingPeriod();
  console.log(`space=${SPACE} network=${NETWORK}`);
  console.log(`title: ${p.title}`);
  console.log(`discussion: ${p.discussion}`);
  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }

  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const now = Math.floor(Date.now() / 1000);
  const client = new snapshot.Client712(SEQ);
  const receipt = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
    plugins: "{}", app: "pnouns-voter",
  });
  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);

  // オンチェーンの対応付け(registrar)
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
  const voter = dep.snapVoter || dep.voter;
  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
  const w = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
  const c = new ethers.Contract(voter, abi, w);
  const tx = await c.registerProposal(receipt.id, nounsId);
  await tx.wait();
  const delay = Number(await c.registrationDelayBlocks());
  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
