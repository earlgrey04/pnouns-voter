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
try { // ローカル実行では .env を読む。CI(GitHub Actions)では secret が env に入るため .env は無くてよい
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch (e) { if (e.code !== "ENOENT") throw e; }
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
  const nounsArg = String(arg("nouns") || "");
  if (!/^[1-9][0-9]*$/.test(nounsArg)) throw new Error("--nouns は正の整数で指定してください");
  const nounsId = Number(nounsArg);
  if (!Number.isSafeInteger(nounsId)) throw new Error("--nouns が大きすぎます");
  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
  const description = await nounsDescription(descId);
  // 本文は descId から借りても、対応表・discussion は必ず登録対象の nounsId で作る(第22回監査)
  const p = buildProposal({ nounsId, description });
  const period = await hubVotingPeriod();
  console.log(`space=${SPACE} network=${NETWORK}`);
  console.log(`title: ${p.title}`);
  console.log(`discussion: ${p.discussion}`);
  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }

  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
  // 提案単位のチェックポイント(第23-24回監査): TDZ を避けるため preflight より前に定義。
  // 「不存在(ファイルなし)」と「破損(不正 JSON・schema 不一致)」を区別し、破損時は停止する。
  const pendingPath = path.join(ROOT, "deployments", `${NETWORK}-pending-${nounsId}.json`);
  const isValidCkpt = (j) => j && typeof j === "object"
    && /^0x[0-9a-fA-F]{64}$/.test(j.id || "")
    && Number.isSafeInteger(Number(j.start)) && Number.isSafeInteger(Number(j.end)) && Number.isSafeInteger(Number(j.snapshot))
    && Number(j.start) < Number(j.end) && Number(j.snapshot) >= 0;
  const readPending = () => {
    if (!fs.existsSync(pendingPath)) return null;
    let j; try { j = JSON.parse(fs.readFileSync(pendingPath, "utf8")); } catch { throw new Error(`チェックポイント ${pendingPath} が壊れています(不正 JSON)。中身を確認し、問題なければ削除してください。`); }
    if (!isValidCkpt(j)) throw new Error(`チェックポイント ${pendingPath} の内容が不正です。中身を確認してください。`);
    return j;
  };
  const writePending = (obj) => { const tmp = pendingPath + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(obj, null, 2)); fs.renameSync(tmp, pendingPath); };
  const clearPending = () => { try { fs.unlinkSync(pendingPath); } catch {} };
  const voter = dep.snapVoter || dep.voter;
  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
  if (!process.env.MAINNET_RPC_URL) throw new Error("MAINNET_RPC_URL が未設定です(Snapshot の基準ブロック取得に全 network で必要)");
  if (NETWORK !== "mainnet" && NETWORK !== "sepolia") throw new Error(`NETWORK は sepolia か mainnet(got ${NETWORK})`);
  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);

  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
  const provider = new ethers.JsonRpcProvider(rpc);
  const code = await provider.getCode(voter);
  if (code === "0x") throw new Error(`${voter} にコントラクトがありません(deployments/${NETWORK}.json が古い可能性)`);
  const expectedChainId = NETWORK === "mainnet" ? 1n : 11155111n;
  const gotChainId = (await provider.getNetwork()).chainId;
  if (gotChainId !== expectedChainId) throw new Error(`RPC の chainId(${gotChainId}) が ${NETWORK}(${expectedChainId}) と一致しません`);
  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)", "function spaceHash() view returns (bytes32)", "function nounsDAO() view returns (address)", "function marginBlocks() view returns (uint256)"], provider);
  const [reg, own, existing, spaceHash, daoAddr, marginBlocks] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId), pre.spaceHash(), pre.nounsDAO(), pre.marginBlocks()]);

  if (spaceHash !== ethers.keccak256(ethers.toUtf8Bytes(SPACE))) throw new Error(`コントラクトの spaceHash が SPACE="${SPACE}" と一致しません`);
  const rAddr = registrarWallet.address.toLowerCase();
  // 通常ジョブでは registrar アドレスとの一致のみ許可(第21回監査)。owner 鍵での登録は緊急用の別フラグ
  const allowOwner = flag("allow-owner-registrar");
  if (rAddr !== reg.toLowerCase() && !(allowOwner && rAddr === own.toLowerCase())) throw new Error(`registrar 鍵 ${registrarWallet.address} が登録係(${reg})と一致しません${own.toLowerCase() === rAddr ? "(owner 鍵での登録は --allow-owner-registrar が必要)" : ""}`);
  // bot と registrar と owner が相互に異なることを確認(役割分離)
  const addrs = [bot.address, registrarWallet.address, own].map((a) => a.toLowerCase());
  if (NETWORK === "mainnet" && new Set(addrs).size < addrs.length) throw new Error(`mainnet では bot / registrar / owner を別アドレスにしてください: ${addrs.join(", ")}`);
  if (existing !== ethers.ZeroHash) {
    const ck = readPending();
    if (ck && existing === ethers.keccak256(ethers.toUtf8Bytes(ck.id))) { clearPending(); console.log(`Nouns #${nounsId} は既にこの提案(${ck.id.slice(0, 14)}…)で登録済みです。チェックポイントを解消しました。`); return; }
    throw new Error(`Nouns #${nounsId} には既に対応表が登録されています(${existing.slice(0, 18)}…)`);
  }

  // タイミング検査(2026-08-23、mainnet リハーサル #991 の教訓):
  // ① Updatable(本文更新可能)中は作らない — メンバーが確定前の本文に投票してしまう
  // ② Snapshot の締切が「Nouns 締切 − マージン」に収まることを事前に確認する
  const dao = new ethers.Contract(daoAddr, ["function state(uint256) view returns (uint8)", "function proposals(uint256) view returns (uint256,address,uint256,uint256,uint256,uint256 startBlock,uint256 endBlock,uint256,uint256,uint256,bool,bool,bool,uint256,uint256)"], provider);
  const [nState, nProp, curBlock] = await Promise.all([dao.state(nounsId), dao.proposals(nounsId), provider.getBlockNumber()]);
  const STATE_NAMES = ["Pending","Active","Canceled","Defeated","Succeeded","Queued","Expired","Executed","Vetoed","ObjectionPeriod","Updatable"];
  const st = Number(nState);
  if (st !== 0 && st !== 1) throw new Error(`Nouns #${nounsId} の状態が ${STATE_NAMES[st] ?? st} です。本文が凍結される Pending/Active になってから作成してください(Updatable 中は提案者が本文を変更できます)`);
  const endBlock = Number(nProp[6]);
  const deadlineSec = (endBlock - Number(marginBlocks) - Number(curBlock)) * 12; // 集計締切までの概算秒
  const drainSec = 1800; // 排出余裕 30 分
  if (period + drainSec > deadlineSec) throw new Error(`時間が足りません: Snapshot ${period/3600}h + 排出余裕が、集計締切(Nouns 締切24h前)まで ${Math.max(0,deadlineSec/3600).toFixed(1)}h に収まりません`);
  console.log(`Nouns #${nounsId}: ${STATE_NAMES[st]}、集計締切まで約 ${(deadlineSec/3600).toFixed(1)} 時間(Snapshot ${period/3600}h + 余裕が収まることを確認)`);

  // 冪等チェックポイント(第22回監査): 作成後・登録前に失敗して再実行した場合、Snapshot 提案を
  // 再作成せず、記録済みの ID から読み戻し→登録を再開する(孤児提案の量産を防ぐ)。
  // 提案単位のチェックポイント(第23回監査: network 単位の read-modify-write による競合を避ける)
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const now = Math.floor(Date.now() / 1000);
  let receipt, sentStart, sentEnd, sentSnapshot;
  const ckpt = readPending();
  if (ckpt) {
    receipt = { id: ckpt.id }; sentStart = ckpt.start; sentEnd = ckpt.end; sentSnapshot = ckpt.snapshot;
    if (Number(sentEnd) <= Math.floor(Date.now() / 1000)) { clearPending(); throw new Error(`記録済みの Snapshot 提案 ${ckpt.id} は投票期間が終了済みです。チェックポイントを破棄しました。--nouns ${nounsId} を再実行すると新しい提案を作成します。`); }
    console.log(`再開: 記録済みの Snapshot 提案 ${ckpt.id} を読み戻して登録します(再作成しません)`);
  } else {
    sentStart = now; sentEnd = now + period; sentSnapshot = await mainnetProvider.getBlockNumber();
    const client = new snapshot.Client712(SEQ);
    receipt = await client.proposal(adapt(bot), bot.address, {
      space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
      choices: p.choices, start: sentStart, end: sentEnd, snapshot: sentSnapshot,
      plugins: "{}", app: "pnouns-voter",
    });
    if (!/^0x[0-9a-fA-F]{64}$/.test(String(receipt.id || ""))) throw new Error(`sequencer が想定外の提案 ID を返しました: ${receipt.id}`);
    writePending({ id: receipt.id, start: sentStart, end: sentEnd, snapshot: sentSnapshot, at: new Date().toISOString() });
    console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
  }

  // 登録前の読み戻し検算(第17回監査の推奨): 作成した提案をハブから再取得し、
  // 「これから登録しようとしている対応」が提案の実体と一致することを確認してから登録する。
  // sequencer の応答(receipt.id)を無検証で registerProposal に渡さない。
  // ハブの索引反映に数秒かかるため、最大 90 秒リトライする。
  // discussion が nouns.wtf/vote/N を厳密に指すか(部分文字列でなく URL 解析。/vote/12 が /vote/123 に化けない)
  const discussionRefsProposal = (text) => {
    for (const raw of String(text || "").match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
      let u; try { u = new URL(raw.replace(/[)\]}>,.;:!?、。」』】）]+$/u, "")); } catch { continue; }
      if (u.hostname.toLowerCase().replace(/^www\./, "") === "nouns.wtf" && u.pathname.replace(/\/+$/, "") === `/vote/${nounsId}`) return true;
    }
    return false;
  };
  let verified = null;
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const rb = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `query($id:String!){ proposal(id:$id) { id author type space { id } title body discussion choices start end snapshot } }`, variables: { id: receipt.id } }) })).json();
    const pr = rb?.data?.proposal;
    if (!pr) continue; // まだ索引されていない
    const problems = [];
    if (pr.id !== receipt.id) problems.push(`id 不一致: ${pr.id}`);
    if (String(pr.author || "").toLowerCase() !== bot.address.toLowerCase()) problems.push(`author 不一致: ${pr.author}`);
    if (pr.type !== "single-choice") problems.push(`type 不一致: ${pr.type}`);
    if (pr.space?.id !== SPACE) problems.push(`space 不一致: ${pr.space?.id}`);
    if (pr.title !== p.title) problems.push("title 不一致");
    if ((pr.body || "") !== p.body) problems.push("body 不一致");
    if ((pr.discussion || "") !== p.discussion) problems.push("discussion 不一致");
    if (!discussionRefsProposal(pr.discussion)) problems.push(`discussion が nouns.wtf/vote/${nounsId} を厳密に指していない`);
    if (JSON.stringify(pr.choices) !== JSON.stringify(p.choices)) problems.push(`choices 不一致: ${JSON.stringify(pr.choices)}`);
    if (Number(pr.start) !== sentStart) problems.push(`start 不一致: ${pr.start} != ${sentStart}`);
    if (Number(pr.end) !== sentEnd) problems.push(`end 不一致: ${pr.end} != ${sentEnd}`);
    if (Number(pr.snapshot) !== Number(sentSnapshot)) problems.push(`snapshot 不一致: ${pr.snapshot} != ${sentSnapshot}`);
    { const nS = Math.floor(Date.now() / 1000); if (!(Number(pr.start) <= nS && nS < Number(pr.end))) problems.push("読み戻し時点で投票期間外(start<=now<end でない)"); }
    if (problems.length) throw new Error(`読み戻し検算に失敗(登録を中止。Snapshot 提案 ${receipt.id} は孤児として残るため確認してください): ${problems.join(" / ")}`);
    verified = pr;
    break;
  }
  if (!verified) throw new Error(`ハブから提案 ${receipt.id} を 90 秒以内に読み戻せませんでした(登録を中止。ハブの遅延なら後で手動登録できます)`);
  console.log(`読み戻し検算 OK(id/author/type/space/title/body/discussion/choices 完全一致) → 登録します`);
  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
  const w = registrarWallet.connect(provider);
  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
  const c = new ethers.Contract(voter, abi, w);
  const tx = await c.registerProposal(receipt.id, nounsId);
  await tx.wait();
  clearPending(); // チェックポイントを解消
  const delay = Number(await c.registrationDelayBlocks());
  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
