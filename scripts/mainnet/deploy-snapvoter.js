// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
// 使い方(アドレスは必須・明示。REG_DELAY/MARGIN には運用既定値 10/7200 がある):
//   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
//     REG_DELAY=10 MARGIN=7200 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
//   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const MAINNET = {
  NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
  PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
};
async function main() {
  const owner = process.env.OWNER, registrar = process.env.REGISTRAR;
  const space = process.env.SPACE || "pnounsdao.eth"; // リハーサルでは SPACE=earl-grey.eth を明示(2026-08-22)
  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
  const delay = Number(process.env.REG_DELAY || 10); // 約 2 分 = 受付前に自動照合が 1 周する間隔(2026-08-21 決定)
  const margin = Number(process.env.MARGIN || 7200); // 運用決定値: 締切 = Nouns 投票終了の約 24 時間前
  if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
  // アドレスの厳格検証(第14回監査): checksum 不正・ゼロアドレスをデプロイ前に弾く
  for (const [k, a] of [["OWNER", owner], ["REGISTRAR", registrar], ...excluded.map((a, i) => [`EXCLUDED[${i}]`, a])]) {
    const norm = ethers.getAddress(a); // 不正なら throw
    if (norm === ethers.ZeroAddress) throw new Error(`${k} がゼロアドレスです`);
  }
  if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
  if (!Number.isInteger(delay) || delay < 10) throw new Error("REG_DELAY は 10 以上(運用値 10 = 約 2 分)");
  if (!Number.isInteger(margin) || margin < 10 || margin > 7200) throw new Error("MARGIN は 10〜7200 の整数(運用値 7200 = 約 24 時間)");
  const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
  if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("デプロイ用アカウントがありません(MAINNET_DEPLOYER_KEY を設定)");
  console.log(`network=${network.name} deployer=${deployer.address}`);
  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=${space}`);
  if (process.env.DRY_RUN === "1") { console.log("--- DRY_RUN: デプロイしません ---"); return; }
  if (network.name === "hardhat") await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x1"]); // フォークでのテスト実行用
  const F = await ethers.getContractFactory("PNounsSnapVoter");
  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, space, excluded, margin, delay);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  // 読み戻し検証(設定漏れをその場で検出)
  const checks = [
    ["space", await c.space(), space],
    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
    ["marginBlocks", Number(await c.marginBlocks()), margin],
    ["owner", (await c.owner()).toLowerCase(), owner.toLowerCase()],
    ["registrar", (await c.registrar()).toLowerCase(), registrar.toLowerCase()],
    ["liveMode", await c.liveMode(), false],
  ];
  for (const [k, got, want] of checks) if (String(got) !== String(want)) throw new Error(`読み戻し不一致 ${k}: ${got} != ${want}`);
  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
  const dep = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
  dep.snapVoter = addr;
  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(dep, null, 2));
  console.log(`デプロイ完了: ${addr} (block ${dep.snapVoterDeployBlock}) → ${out}`);
  console.log("次: Sourcify 検証 → NETWORK=mainnet node scripts/check-deploy.mjs --stage deployed");
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
