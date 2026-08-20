// Sepolia ENS に Snapshot テストスペース用の .eth 名を登録する(commit → 60s → register)
// 注意(2026-08-20): ENS が Sepolia でコントラクト移行中(block 11522776 で NameWrapper が
// base registrar のコントローラーから外された)のため、現在 .eth の新規登録は全体的に失敗する。
// このスクリプトは移行完了後に再実行する。ENS_LABEL で名前指定(既定 pnouns-test)。
// 使う controller は ENS アプリと同じ 0xFED6…(旧型 I/F)。register は毎回 static で確認してから送る。
const { ethers } = require("hardhat");
const CONTROLLER = "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72";
const ABI = [
  "function available(string) view returns (bool)",
  "function minCommitmentAge() view returns (uint256)",
  "function rentPrice(string,uint256) view returns (tuple(uint256 base,uint256 premium))",
  "function makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint16) pure returns (bytes32)",
  "function commit(bytes32)",
  "function register(string,address,uint256,bytes32,address,bytes[],bool,uint16) payable",
];
async function main() {
  const [deployer] = await ethers.getSigners();
  const label = process.env.ENS_LABEL || "pnouns-test";
  const c = new ethers.Contract(CONTROLLER, ABI, deployer);
  if (!(await c.available(label))) { console.log(`${label}.eth is NOT available`); return; }
  const duration = Number(process.env.ENS_DURATION || 365 * 24 * 3600);
  const pr = await c.rentPrice(label, duration);
  const total = (pr.base + pr.premium) * 110n / 100n;
  console.log(`registering ${label}.eth (${duration / 86400}d) price ${ethers.formatEther(pr.base + pr.premium)} ETH`);
  const secret = ethers.hexlify(ethers.randomBytes(32));
  const args = [label, deployer.address, duration, secret, ethers.ZeroAddress, [], false, 0];
  await (await c.commit(await c.makeCommitment(...args))).wait();
  const wait = Number(await c.minCommitmentAge()) + 15;
  console.log(`committed; waiting ${wait}s...`);
  await new Promise((r) => setTimeout(r, wait * 1000));
  try { await c.register.staticCall(...args, { value: total }); }
  catch (e) { console.log("register would revert (ENS Sepolia 移行が未完了の可能性):", e.shortMessage); process.exit(2); }
  const rc = await (await c.register(...args, { value: total })).wait();
  console.log(`registered ${label}.eth (status ${rc.status})`);
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
