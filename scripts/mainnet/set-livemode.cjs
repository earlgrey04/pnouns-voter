// #992 投票Txテスト用: liveMode を切り替える(owner = デプロイ鍵 0x21cb…)
// 使い方: node scripts/mainnet/set-livemode.cjs true   … ON(投票Txテスト)
//         node scripts/mainnet/set-livemode.cjs false  … OFF(見学モードへ戻す)
require("dotenv").config({ path: require("path").join(__dirname, "../../.env.mainnet") });
const { ethers } = require("ethers");
(async () => {
  const target = process.argv[2] === "true";
  const RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com"];
  let pr; for (const u of RPCS) { try { const p = new ethers.JsonRpcProvider(u); await p.getBlockNumber(); pr = p; break; } catch {} }
  const mn = process.env.MAINNET_DEPLOYER_MNEMONIC;
  if (!mn) throw new Error(".env.mainnet に MAINNET_DEPLOYER_MNEMONIC がありません");
  const wallet = ethers.Wallet.fromPhrase(mn).connect(pr);
  const VOTER = "0x77a503db95a58Cd452bf47814f35D7733a283502";
  const c = new ethers.Contract(VOTER, ["function owner() view returns (address)", "function liveMode() view returns (bool)", "function setLiveMode(bool)"], wallet);
  const [owner, lm, bal] = await Promise.all([c.owner(), c.liveMode(), pr.getBalance(wallet.address)]);
  console.log("wallet:", wallet.address, "| owner:", owner, "| 一致:", owner.toLowerCase() === wallet.address.toLowerCase());
  console.log("現在 liveMode:", lm, "→ 目標:", target, "| 残高:", ethers.formatEther(bal), "ETH");
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("owner 不一致");
  if (lm === target) { console.log("変更不要(既に目標値)"); return; }
  const tx = await c.setLiveMode(target);
  console.log("tx 送信:", tx.hash);
  const rc = await tx.wait();
  console.log("status:", rc.status === 1 ? "success" : "failed", "| gasUsed:", rc.gasUsed.toString());
  console.log("liveMode(再読込):", await c.liveMode());
})().catch((e) => { console.error("エラー:", e.message); process.exit(1); });
