// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
//
// 使い方:
//   NETWORK=sepolia node scripts/check-deploy.mjs
//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const NETWORK = process.env.NETWORK || "sepolia";
const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
const VOTER_ABI = [
  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
  "function owner() view returns (address)", "function registrar() view returns (address)",
  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
  "function excluded(address) view returns (bool)",
];
const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];

let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);

async function main() {
  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
  const p = new ethers.JsonRpcProvider(RPC);
  const voterAddr = dep.snapVoter || dep.voter;
  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
  console.log(`network=${NETWORK} voter=${voterAddr}\n`);

  // 1. コントラクトの実値
  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
  ]);
  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
  check("refundEnabled", refund === true);

  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
  let workerCfg = null;
  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
  const relayer = workerCfg?.relayer || null;
  const roles = { owner, registrar, relayer };
  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
  const distinct = new Set(addrs).size === addrs.length;
  if (NETWORK === "mainnet") {
    check("owner / registrar / relayer がすべて別アドレス", distinct);
    check("relayer が Worker から取得できた", !!relayer);
    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);

  // 3. Worker と deployments の一致
  if (workerCfg) {
    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
  }

  // 4. 委任と残高
  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
  try {
    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
    const votes = await t.getCurrentVotes(voterAddr);
    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
  const pool = await p.getBalance(voterAddr);
  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
  if (relayer) {
    const rb = await p.getBalance(relayer);
    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
  }

  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
