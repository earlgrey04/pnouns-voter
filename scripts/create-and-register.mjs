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

// RPC URL はカンマ区切りで複数指定できる(2026-09-22)。先頭から順に eth_chainId が通るものを採用する
// (Infura の日次クレジット上限 429 などで先頭が使えないときに、次の URL へ切り替える)。
const _rpcPick = new Map();
const rpcHost = (u) => { try { return new URL(u).host; } catch { return "?"; } };
// ethers の既定は 429 を指数バックオフで最大 12 回再試行し、十数分止まりうる(Infura の日次上限時に発生)。
// 20 秒タイムアウト・429 は 2 回までにして速やかに失敗させ、pickRpc で次の URL に切り替える。
function rpcRequest(u) {
  const req = new ethers.FetchRequest(u);
  req.timeout = 20000;
  req.retryFunc = async (_req, _resp, attempt) => attempt < 2;
  return req;
}
// 実行中の切り替え(2026-09-23): pickRpc の検証を通った Infura が直後の読み取りで 429(毎秒上限。Worker の tick と
// 共用キー)になり run が落ちたため、429・5xx・タイムアウトで残りの URL へ切り替えて同じ要求を再送する。
// 送信(eth_sendRawTransaction)は二重送信を避けるため、未処理が確実な 429 のときだけ切り替える。
class FailoverProvider extends ethers.JsonRpcProvider {
  #urls; #i = 0;
  constructor(urls, opts) { super(rpcRequest(urls[0]), undefined, opts); this.#urls = urls; }
  _getConnection() { return rpcRequest(this.#urls[this.#i]); }
  async _send(payload) {
    for (;;) {
      const used = this.#i;
      try { return await super._send(payload); } catch (e) {
        const status = e?.response?.statusCode;
        const isSend = [].concat(payload).some((p) => p.method === "eth_sendRawTransaction");
        const retryable = status === 429 || (!isSend && (status >= 500 || e?.code === "TIMEOUT"));
        if (!retryable) throw e;
        if (used !== this.#i) continue; // 並行中の別要求が既に切り替えた → 新しい URL で再送
        if (this.#i + 1 >= this.#urls.length) throw e;
        this.#i++;
        console.log(`RPC: ${rpcHost(this.#urls[used])} が ${status || e.code} のため ${rpcHost(this.#urls[this.#i])} に切り替えます`);
      }
    }
  }
  // 呼び出し側の判断で次の URL へ切り替える(送信の再試行用)。最後の URL なら先頭に戻る
  rotate(reason) {
    if (this.#urls.length <= 1) return;
    const from = this.#i;
    this.#i = (this.#i + 1) % this.#urls.length;
    console.log(`RPC: ${rpcHost(this.#urls[from])} で ${reason} のため ${rpcHost(this.#urls[this.#i])} に切り替えます`);
  }
}
// u はカンマ区切りの URL 列でもよい(pickRpc は採用した URL を先頭に並べ替えた列を返す)
const makeProvider = (u, opts = {}) => {
  const urls = String(u).split(",").map((x) => x.trim()).filter(Boolean);
  return new FailoverProvider(urls, { staticNetwork: true, batchMaxCount: 1, ...opts });
};
// 全体の見張り(10 分で強制終了。GitHub の runner を最大 6 時間占有しない)
setTimeout(() => { console.error("watchdog: 10 分経過のため中断します(RPC/ハブの停滞)"); process.exit(2); }, 10 * 60 * 1000).unref();
async function pickRpc(raw) {
  const urls = String(raw || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (urls.length <= 1) return urls[0] || raw;
  if (_rpcPick.has(raw)) return _rpcPick.get(raw);
  const failures = [];
  for (const u of urls) {
    // 実際に使う ethers の provider で eth_blockNumber を 3 回続けて試す(1 回通っても毎秒制限/日次上限で以後 429 になる RPC を除外)
    const prov = makeProvider(u);
    try {
      let bn = 0;
      for (let i = 0; i < 3; i++) bn = await Promise.race([prov.getBlockNumber(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 8s")), 8000))]);
      prov.destroy();
      console.log(`RPC: ${rpcHost(u)} を使用(block ${bn})`);
      const ordered = [u, ...urls.filter((x) => x !== u)].join(","); // 残りは実行中の切り替え先
      _rpcPick.set(raw, ordered);
      return ordered;
    } catch (e) {
      prov.destroy();
      failures.push(`${rpcHost(u)}: ${String(e.shortMessage || e.message).slice(0, 60)}`);
    }
  }
  throw new Error(`RPC に接続できません: ${failures.join(" / ")}`);
}

async function nounsDescription(id) {
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
  const d = r?.data?.proposal?.description;
  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
  return d;
}
// ハブ上の「Nouns #N を指す未終了の提案」(2026-10-01、#999 の重複作成未遂の教訓):
// チェックポイントが失われても、既に作成済みの提案があれば新規作成しない。
// title が [Prop N] で始まる(mirror の "[Prop N]xxx" 形式も含む)提案のうち、投票終了前のもの。
// ハブに問い合わせられない場合は例外(作成しない側に倒す)。
async function openHubProposals(nounsId) {
  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `query($space:String!,$t:String!){ proposals(first:20, where:{ space:$space, title_contains:$t }, orderBy:"created", orderDirection:desc) { id author title end created } }`, variables: { space: SPACE, t: `[Prop ${nounsId}]` } }) })).json();
  const list = r?.data?.proposals;
  if (!Array.isArray(list)) throw new Error(`ハブで既存提案を確認できません(重複作成を避けるため中止): ${JSON.stringify(r?.errors || r).slice(0, 200)}`);
  const now = Math.floor(Date.now() / 1000);
  return list.filter((p) => String(p.title || "").startsWith(`[Prop ${nounsId}]`) && Number(p.end) > now);
}
async function hubVotingPeriod() {
  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
  return r?.data?.space?.voting?.period || 172800;
}

// 自動検知(2026-08-23 実装): 「投票中(Active)で、対応表が未登録で、48h+余裕が締切に収まる」
// Nouns 提案のうち最も新しい 1 件を選ぶ(1 回の実行で 1 件だけ = Snapshot の日次上限を守る)。
// 該当がなければ null(正常終了)。個別の詳細検査は main の preflight が改めて行う。
// bot(Snapshot 提案の作成者)の鍵。mainnet は SNAPSHOT_BOT_PRIVATE_KEY(秘密鍵、優先)または SNAPSHOT_BOT_MNEMONIC(ニーモニック)。
// 2026-09-21: 空間の作成条件(pNouns 保有)を満たす pnouns-mirror の bot(秘密鍵形式)を共用するため秘密鍵に対応
function loadBot() {
  const botKey = NETWORK === "mainnet" ? (process.env.SNAPSHOT_BOT_PRIVATE_KEY || "").trim() : "";
  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
  if (botKey && !/^(0x)?[0-9a-fA-F]{64}$/.test(botKey)) throw new Error("SNAPSHOT_BOT_PRIVATE_KEY の形式が不正です(64 hex)");
  if (!botKey && !botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_PRIVATE_KEY か SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
  const bot = botKey ? new ethers.Wallet(botKey.startsWith("0x") ? botKey : `0x${botKey}`) : ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
  return { bot, fromKey: !!botKey };
}

async function detectTarget(botAddr) {
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
  const voter = dep.snapVoter;
  const rpc = await pickRpc(NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL);
  const provider = makeProvider(rpc); // Infura はバッチの 429 応答に id が無く ethers が照合できないためバッチ無効
  const c = new ethers.Contract(voter, ["function nounsToSnap(uint256) view returns (bytes32)", "function nounsDAO() view returns (address)", "function marginBlocks() view returns (uint256)"], provider);
  const daoAddr = await c.nounsDAO();
  const dao = new ethers.Contract(daoAddr, ["function proposalCount() view returns (uint256)", "function state(uint256) view returns (uint8)", "function proposals(uint256) view returns (uint256,address,uint256,uint256,uint256,uint256 startBlock,uint256 endBlock,uint256,uint256,uint256,bool,bool,bool,uint256,uint256)"], provider);
  const [count, margin, curBlock, period] = await Promise.all([dao.proposalCount(), c.marginBlocks(), provider.getBlockNumber(), hubVotingPeriod()]);
  for (let id = Number(count); id > Math.max(0, Number(count) - 15); id--) {
    // 逐次に呼ぶ(並列だと Infura の毎秒上限に当たりやすい。state が Active でなければ対応表は読まない)
    if (Number(await dao.state(id)) !== 1) continue;      // 投票中(Active)のみ
    if ((await c.nounsToSnap(id)) !== ethers.ZeroHash) continue; // 登録済みは対象外
    // 作成済みの提案がハブにあれば新規作成しない(チェックポイント喪失時の重複作成防止)。
    // bot 自身が作った提案なら main が再利用して登録する(残り時間の検査は作成時のものなので適用しない)
    const open = await openHubProposals(id);
    if (open.some((p) => p.author.toLowerCase() === botAddr.toLowerCase())) return id;
    if (open.length) { console.log(`#${id}: bot 以外が作成した未終了の Snapshot 提案があるためスキップ(${open.map((p) => `${p.id.slice(0, 10)}… by ${p.author}`).join(", ")})。登録する場合は snapshot_id と author を指定した登録のみモードで`); continue; }
    const pr = await dao.proposals(id);
    const deadlineSec = (Number(pr[6]) - Number(margin) - Number(curBlock)) * 12;
    if (period + 1800 > deadlineSec) { console.log(`#${id}: 投票中だが残り時間不足のためスキップ(締切まで ${(deadlineSec/3600).toFixed(1)}h)`); continue; }
    return id;
  }
  return null;
}

async function main() {
  let nounsArg = String(arg("nouns") || "");
  // 登録のみモード(2026-09-21): 外部(pnouns-mirror 等)が作成した Snapshot 提案を、読み戻し検算のうえ対応表に登録する。
  // 作成 bot が空間の作成条件(pNouns 保有)を満たせない場合の運用経路。--author で作成者アドレスを明示させ、検算で照合する。
  const registerId = String(arg("register") || "");
  const expectAuthor = String(arg("author") || "");
  if (registerId) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(registerId)) throw new Error("--register は Snapshot 提案 ID(0x + 64 hex)で指定してください");
    if (!ethers.isAddress(expectAuthor)) throw new Error("--register には --author <作成者アドレス> が必要です");
    if (process.argv.includes("--auto")) throw new Error("--register と --auto は併用できません(--nouns を明示)");
  }
  const MIRROR_CHOICES = ["賛成", "反対", "棄権"]; // 登録のみモードで許容する選択肢(コントラクトは 1/2/3 をこの順で解釈)
  if (process.argv.includes("--auto")) {
    // Actions は直前 run の状態(チェックポイント)を毎回引き継ぐため、投票終了済みの古いものはここで捨てる
    for (const f of fs.readdirSync(path.join(ROOT, "deployments")).filter((x) => x.startsWith(`${NETWORK}-pending-`) && x.endsWith(".json"))) {
      try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", f), "utf8")); if (Number(j.end) > Math.floor(Date.now() / 1000)) continue; } catch {}
      fs.unlinkSync(path.join(ROOT, "deployments", f)); console.log(`チェックポイント ${f} を破棄(投票終了済みまたは破損)`);
    }
    const found = await detectTarget(loadBot().bot.address);
    if (found === null) { console.log("自動検知: 作成対象の提案はありません"); return; }
    console.log(`自動検知: Nouns #${found} を作成対象に選定`);
    nounsArg = String(found);
  }
  if (!/^[1-9][0-9]*$/.test(nounsArg)) throw new Error("--nouns は正の整数で指定してください(または --auto)");
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
  const rpcRaw = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
  if (!rpcRaw) throw new Error(`${NETWORK} の RPC URL が未設定です`);
  const rpc = await pickRpc(rpcRaw);
  if (!process.env.MAINNET_RPC_URL) throw new Error("MAINNET_RPC_URL が未設定です(Snapshot の基準ブロック取得に全 network で必要)");
  if (NETWORK !== "mainnet" && NETWORK !== "sepolia") throw new Error(`NETWORK は sepolia か mainnet(got ${NETWORK})`);
  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
  const { bot, fromKey: botFromKey } = loadBot();
  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
  // --check-keys: 鍵の導出結果と作成資格だけを確認して終了する(2026-09-21。mirror の「Verify bot wallet key」相当)
  if (flag("check-keys")) {
    const prov = makeProvider(rpc);
    const v = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)"], prov);
    const [reg, own] = await Promise.all([v.registrar(), v.owner()]);
    const pn = new ethers.Contract("0x4bE962499cE295b1ed180F923bf9c73b6357DE80", ["function balanceOf(address) view returns (uint256)"], prov);
    const vp = NETWORK === "mainnet" ? Number(await pn.balanceOf(bot.address)) : -1;
    console.log(`bot: ${bot.address}(${botFromKey ? "SNAPSHOT_BOT_PRIVATE_KEY" : "mnemonic"}) pNouns=${vp}`);
    console.log(`registrar 鍵: ${registrarWallet.address} / on-chain registrar: ${reg} / owner: ${own}`);
    const distinct = new Set([bot.address, registrarWallet.address, own].map((a) => a.toLowerCase())).size === 3;
    console.log(`registrar 一致: ${registrarWallet.address.toLowerCase() === reg.toLowerCase()} / 役割分離: ${distinct} / 作成資格(pNouns>=1): ${vp >= 1}`);
    if (registrarWallet.address.toLowerCase() !== reg.toLowerCase() || !distinct || (NETWORK === "mainnet" && vp < 1)) { console.error("check-keys: NG"); process.exit(1); }
    console.log("check-keys: OK"); return;
  }
  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);

  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
  const provider = makeProvider(rpc); // 自動検出の再試行ループを避ける。chainId は直後に getNetwork で検証
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
  // 作成済み提案の再利用(2026-10-01): チェックポイントが無くても、bot が作った未終了の提案がハブにあれば
  // 新規作成せず、それを登録する(#999 で作成後の登録失敗 → 次回の自動実行が再作成しかけた)。
  // bot 以外の作成分は自動では登録しない(登録のみモードで人が作成者を確認して指定する)。
  const ckpt = registerId ? null : readPending();
  let reuseId = "";
  if (!registerId && !ckpt) {
    const open = await openHubProposals(nounsId);
    const mine = open.filter((x) => x.author.toLowerCase() === bot.address.toLowerCase());
    if (mine.length > 1) throw new Error(`bot 作成の未終了提案が複数あります(${mine.map((x) => x.id).join(", ")})。どれを登録するか人が決めて、登録のみモードで指定してください`);
    if (mine.length === 1) reuseId = mine[0].id;
    else if (open.length) throw new Error(`bot 以外が作成した未終了の Snapshot 提案があります(${open.map((x) => `${x.id} by ${x.author}`).join(", ")})。重複を避けるため作成しません。登録する場合は snapshot_id と author を指定した登録のみモードで`);
  }
  const externalId = registerId || reuseId; // 作成時の start/end/snapshot を知らない提案(締切に収まるかで検査)

  // タイミング検査(2026-08-23、mainnet リハーサル #991 の教訓):
  // ① Updatable(本文更新可能)中は作らない — メンバーが確定前の本文に投票してしまう
  // ② Snapshot の締切が「Nouns 締切 − マージン」に収まることを事前に確認する
  const dao = new ethers.Contract(daoAddr, ["function state(uint256) view returns (uint8)", "function proposals(uint256) view returns (uint256,address,uint256,uint256,uint256,uint256 startBlock,uint256 endBlock,uint256,uint256,uint256,bool,bool,bool,uint256,uint256)"], provider);
  const [nState, nProp, curBlock] = await Promise.all([dao.state(nounsId), dao.proposals(nounsId), provider.getBlockNumber()]);
  const STATE_NAMES = ["Pending","Active","Canceled","Defeated","Succeeded","Queued","Expired","Executed","Vetoed","ObjectionPeriod","Updatable"];
  const st = Number(nState);
  // 現行 pnouns-mirror と同じルール(2026-08-23 ユーザー決定): Nouns の投票が始まって(Active)から作る。
  // Updatable 中は本文が変わり得る。Pending 中は投函もできない(ProposalNotVotable)。
  if (st !== 1) {
    const startBlock = Number(nProp[5]);
    const untilStart = st === 0 || st === 10 ? `(投票開始まで約 ${(((startBlock - Number(curBlock)) * 12) / 3600).toFixed(1)} 時間)` : "";
    throw new Error(`Nouns #${nounsId} の状態が ${STATE_NAMES[st] ?? st} です。投票開始(Active)後に作成してください${untilStart}`);
  }
  const endBlock = Number(nProp[6]);
  const deadlineSec = (endBlock - Number(marginBlocks) - Number(curBlock)) * 12; // 集計締切までの概算秒
  const drainSec = 1800; // 排出余裕 30 分
  if (!externalId && period + drainSec > deadlineSec) throw new Error(`時間が足りません: Snapshot ${period/3600}h + 排出余裕が、集計締切(Nouns 締切24h前)まで ${Math.max(0,deadlineSec/3600).toFixed(1)}h に収まりません`);
  console.log(`Nouns #${nounsId}: ${STATE_NAMES[st]}、集計締切まで約 ${(deadlineSec/3600).toFixed(1)} 時間(Snapshot ${period/3600}h + 余裕が収まることを確認)`);

  // 冪等チェックポイント(第22回監査): 作成後・登録前に失敗して再実行した場合、Snapshot 提案を
  // 再作成せず、記録済みの ID から読み戻し→登録を再開する(孤児提案の量産を防ぐ)。
  // 提案単位のチェックポイント(第23回監査: network 単位の read-modify-write による競合を避ける)
  const mainnetProvider = makeProvider(await pickRpc(process.env.MAINNET_RPC_URL));
  const now = Math.floor(Date.now() / 1000);
  let receipt, sentStart, sentEnd, sentSnapshot;
  if (registerId) {
    receipt = { id: registerId };
    console.log(`登録のみ: Snapshot 提案 ${registerId} を読み戻して検算します(作成しません)`);
  } else if (reuseId) {
    receipt = { id: reuseId };
    console.log(`再利用: bot 作成済みの Snapshot 提案 ${reuseId} を読み戻して登録します(再作成しません)`);
  } else if (ckpt) {
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
    const wantAuthor = registerId ? expectAuthor : bot.address;
    if (String(pr.author || "").toLowerCase() !== wantAuthor.toLowerCase()) problems.push(`author 不一致: ${pr.author}`);
    if (pr.type !== "single-choice") problems.push(`type 不一致: ${pr.type}`);
    if (pr.space?.id !== SPACE) problems.push(`space 不一致: ${pr.space?.id}`);
    if (externalId) {
      if (!String(pr.title || "").startsWith(`[Prop ${nounsId}]`)) problems.push(`title が [Prop ${nounsId}] で始まらない: ${pr.title}`);
    } else {
      if (pr.title !== p.title) problems.push("title 不一致");
      if ((pr.body || "") !== p.body) problems.push("body 不一致");
      if ((pr.discussion || "") !== p.discussion) problems.push("discussion 不一致");
    }
    if (!discussionRefsProposal(pr.discussion)) problems.push(`discussion が nouns.wtf/vote/${nounsId} を厳密に指していない`);
    const wantChoices = externalId ? MIRROR_CHOICES : p.choices;
    if (JSON.stringify(pr.choices) !== JSON.stringify(wantChoices)) problems.push(`choices 不一致: ${JSON.stringify(pr.choices)}`);
    if (externalId) {
      // 外部作成・再利用: start/end/snapshot は作成時の値を知らないので、締切に収まるかで検査する
      const nS = Math.floor(Date.now() / 1000);
      if (Number(pr.end) + drainSec > nS + deadlineSec) problems.push(`Snapshot 終了(${pr.end})+排出余裕が集計締切に収まらない`);
      if (!(Number(pr.snapshot) > 0)) problems.push(`snapshot ブロックが不正: ${pr.snapshot}`);
    } else {
      if (Number(pr.start) !== sentStart) problems.push(`start 不一致: ${pr.start} != ${sentStart}`);
      if (Number(pr.end) !== sentEnd) problems.push(`end 不一致: ${pr.end} != ${sentEnd}`);
      if (Number(pr.snapshot) !== Number(sentSnapshot)) problems.push(`snapshot 不一致: ${pr.snapshot} != ${sentSnapshot}`);
    }
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
  // 送信の再試行(2026-10-01): #999 で送信が RPC の "could not coalesce error" で落ち、未送信のまま終わった。
  // nonce を固定して最大 3 回、RPC を切り替えて再送する。同じ nonce なので二重登録にはならない
  // (先の送信が届いていれば後の送信は nonce too low 等で弾かれる)。失敗のたびに対応表を読んで登録済みなら成功とする。
  const wantHash = ethers.keccak256(ethers.toUtf8Bytes(receipt.id));
  const isRegistered = async () => { try { return (await pre.nounsToSnap(nounsId)) === wantHash; } catch { return false; } };
  const waitRegistered = async (ms) => {
    for (const end = Date.now() + ms; Date.now() < end; ) { if (await isRegistered()) return true; await new Promise((r) => setTimeout(r, 10000)); }
    return isRegistered();
  };
  const nonce = await provider.getTransactionCount(w.address, "pending");
  let txHash = "";
  for (let attempt = 1; ; attempt++) {
    try {
      const tx = await c.registerProposal(receipt.id, nounsId, { nonce });
      txHash = tx.hash;
      const rc = await tx.wait(1, 90000); // 10 分の watchdog に収まるよう短め(未確定は下の照合で拾う)
      if (rc && rc.status !== 1) throw new Error(`登録 tx が revert しました(${tx.hash})`);
      break;
    } catch (e) {
      const msg = String(e.shortMessage || e.message).slice(0, 120);
      console.log(`登録の送信/確認に失敗(${attempt} 回目): ${msg}`);
      if (await waitRegistered(15000)) { console.log("対応表を確認したところ登録済みでした(先の送信が反映)"); break; }
      if (attempt >= 3) {
        // 送信済みで未採掘の可能性(nonce が進んでいる)なら、採掘を最大 2 分待つ
        const pendingNonce = await provider.getTransactionCount(w.address, "pending").catch(() => nonce);
        if (pendingNonce > nonce && await waitRegistered(120000)) { console.log("対応表を確認したところ登録済みでした(採掘待ち後)"); break; }
        throw e;
      }
      provider.rotate(msg);
    }
  }
  clearPending(); // チェックポイントを解消
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: `🆕 Prop ${nounsId} の Snapshot 投票を作成・登録しました(${NETWORK})\nhttps://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}` }) });
    } catch (e) { console.warn("Discord 通知失敗:", e.message); }
  }
  const delay = Number(await c.registrationDelayBlocks());
  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${txHash || "不明(再送前の送信が反映)"})`);
  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
