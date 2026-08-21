// デプロイ後の機械照合(RUNBOOK-MAINNET 用)。段階(--stage)ごとに期待状態を fail-closed で照合する。
//
//   --stage deployed  … コントラクトの実値のみ(Worker・入金・委任はまだ)
//   --stage worker    … + Worker /api/config の一致・relayer の分離
//   --stage funded    … + プール・relayer の残高
//   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
//
// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED / EXPECT_MARGIN が必須。
// worker 段階以降は EXPECT_RELAYER と EXPECT_BOT(4 者分離)、delegated 以降は EXPECT_DELEGATOR も必須。
// EXPECT_DELAY は既定 10(約 2 分)。
//
//   NETWORK=sepolia node scripts/check-deploy.mjs
//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_EXCLUDED=0x… node scripts/check-deploy.mjs --stage deployed
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const argStage = (() => { const i = process.argv.indexOf("--stage"); return i >= 0 ? process.argv[i + 1] : "live"; })();
const STAGES = ["deployed", "worker", "funded", "delegated", "live"];
const stageN = STAGES.indexOf(argStage);
if (stageN < 0) { console.error(`--stage は ${STAGES.join("|")}`); process.exit(2); }
const NETWORK = process.env.NETWORK || "sepolia";
const MAIN = NETWORK === "mainnet";
const RPC = MAIN ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
const WORKER_URL = process.env.WORKER_URL || (MAIN
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
const E = (k) => process.env[k] || null;
const low = (a) => (a ? a.toLowerCase() : a);

let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
const requireEnv = (k, why) => { if (MAIN && !E(k)) { check(`${k} の指定(${why})`, false, "mainnet では必須"); return false; } return true; };

async function main() {
  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
  const p = new ethers.JsonRpcProvider(RPC);
  const voterAddr = dep.snapVoter || dep.voter;
  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
  console.log(`network=${NETWORK} stage=${argStage} voter=${voterAddr}\n`);

  // ---- stage: deployed(常に) ----
  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
  ]);
  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
  const expSpace = MAIN ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
  const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 10 : 1));
  check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
  if (requireEnv("EXPECT_MARGIN", "締切マージン")) if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
  check("refundEnabled", refund === true);
  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);

  if (requireEnv("EXPECT_OWNER", "マルチシグ")) if (E("EXPECT_OWNER")) check("owner が想定どおり", low(owner) === low(E("EXPECT_OWNER")), owner);
  if (requireEnv("EXPECT_REGISTRAR", "登録係")) if (E("EXPECT_REGISTRAR")) check("registrar が想定どおり", low(registrar) === low(E("EXPECT_REGISTRAR")), registrar);
  if (requireEnv("EXPECT_EXCLUDED", "トレジャリー除外")) {
    for (const a of (E("EXPECT_EXCLUDED") || "").split(",").filter(Boolean)) {
      check(`excluded(${a.slice(0, 10)}…)`, await v.excluded(a), "");
    }
  }
  if (!MAIN && !E("EXPECT_EXCLUDED")) {
    // テストネット既定: Sepolia の pNouns トレジャリー
    const t = "0x8ae80e0b44205904be18869240c2ec62d2342785";
    check("excluded(トレジャリー)", await v.excluded(t), t);
  }

  // ---- stage: worker ----
  let relayer = null;
  if (stageN >= STAGES.indexOf("worker")) {
    let workerCfg = null;
    try {
      const r = await fetch(`${WORKER_URL}/api/config?cb=${Date.now()}`);
      check("Worker /api/config が HTTP 200", r.ok, String(r.status));
      workerCfg = await r.json();
    } catch (e) { check("Worker /api/config の取得", false, e.message); }
    if (workerCfg) {
      check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
      check("Worker の metagov 一致", low(workerCfg.metagov) === low(voterAddr), workerCfg.metagov);
      check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
      relayer = workerCfg.relayer || null;
      check("relayer が Worker から取得できた", !!relayer, relayer || "(デプロイ伝搬直後は旧版が返ることがある → 再実行)");
      if (requireEnv("EXPECT_RELAYER", "リレイヤー")) if (E("EXPECT_RELAYER") && relayer) check("relayer が想定どおり", low(relayer) === low(E("EXPECT_RELAYER")), relayer);
    }
    if (requireEnv("EXPECT_BOT", "Snapshot bot(4 者分離)")) { /* 下の分離検査で使う */ }
    const roles = { owner, registrar, relayer, bot: E("EXPECT_BOT") };
    const addrs = Object.values(roles).filter(Boolean).map(low);
    const distinct = new Set(addrs).size === addrs.length;
    if (MAIN) check(`役割の分離(${addrs.length} 者すべて別アドレス)`, distinct);
    else check(`役割の分離(${addrs.length} 者・リハーサル)`, distinct);
  }

  // ---- stage: funded ----
  if (stageN >= STAGES.indexOf("funded")) {
    const pool = await p.getBalance(voterAddr);
    check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
    if (relayer) { const rb = await p.getBalance(relayer); check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`); }
    else if (MAIN) check("relayer 残高(アドレス不明のため確認不能)", false);
  }

  // ---- stage: delegated ----
  if (stageN >= STAGES.indexOf("delegated")) {
    const tokenAddr = MAIN ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || "0x4C4674bb72a096855496a7204962297bd7e12b85");
    try {
      const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
      const votes = await t.getCurrentVotes(voterAddr);
      check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
      if (requireEnv("EXPECT_DELEGATOR", "Nouns 保有マルチシグ")) if (E("EXPECT_DELEGATOR")) {
        const d = await t.delegates(E("EXPECT_DELEGATOR"));
        check("delegates(保有マルチシグ) = voter", low(d) === low(voterAddr), d);
      }
    } catch (e) { check("委任の確認", false, `token ${tokenAddr}: ${e.shortMessage || e.message}`); } // 照会失敗も fail(第13回監査)
  }

  console.log(failed ? `\n❌ ${failed} 件の不一致` : `\n✅ stage=${argStage} まですべて一致`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
