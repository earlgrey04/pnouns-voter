// 本番構成リハーサル(Sepolia): registrar / relayer を新規鍵に分離し、transferOwnership の往復を演習する
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { loadDeployments } = require("./lib");
async function main() {
  const [deployer, delegator] = await ethers.getSigners();
  const dep = loadDeployments();
  const v = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
  console.log("開始残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. 新規鍵の生成(mainnet と同じ手順: 役割ごとに独立したシードを新規生成)
  const envPath = path.join(__dirname, "..", "..", ".env");
  let env = fs.readFileSync(envPath, "utf8");
  let regAddr, relayAddr;
  if (!env.includes("REGISTRAR_MNEMONIC=")) {
    const reg = ethers.Wallet.createRandom();
    const relay = ethers.Wallet.createRandom();
    env += `\n# Sepolia リハーサル用(2026-08-20 生成、実資産なし): registrar / relayer の分離鍵\nREGISTRAR_MNEMONIC="${reg.mnemonic.phrase}"\nSEPOLIA_RELAYER_KEY=${relay.privateKey}\n`;
    fs.writeFileSync(envPath, env);
    regAddr = ethers.HDNodeWallet.fromPhrase(reg.mnemonic.phrase, undefined, "m/44'/60'/0'/0/0").address;
    relayAddr = relay.address;
    console.log("新規生成: registrar", regAddr, "/ relayer", relayAddr);
  } else {
    regAddr = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC, undefined, "m/44'/60'/0'/0/0").address;
    relayAddr = new ethers.Wallet(process.env.SEPOLIA_RELAYER_KEY).address;
    console.log("既存の鍵を使用: registrar", regAddr, "/ relayer", relayAddr);
  }

  // 2. 資金供給(ガス用の小額。relayer の投函ガスはプールから返金される)
  for (const [to, eth] of [[regAddr, "0.002"], [relayAddr, "0.004"]]) {
    if ((await ethers.provider.getBalance(to)) === 0n) { await (await deployer.sendTransaction({ to, value: ethers.parseEther(eth) })).wait(); console.log(`funded ${to} ${eth} ETH`); }
  }

  // 3. registrar を分離鍵に切替
  if ((await v.registrar()).toLowerCase() !== regAddr.toLowerCase()) {
    await (await v.setRegistrar(regAddr)).wait();
  }
  console.log("registrar =", await v.registrar());

  // 4. transferOwnership の往復演習(mainnet ではマルチシグへ移す操作の予行)
  await (await v.transferOwnership(delegator.address)).wait();
  console.log("owner →", await v.owner(), "(マルチシグ役に移管)");
  const vAsNewOwner = v.connect(delegator);
  await (await vAsNewOwner.setMarginBlocks(await v.marginBlocks())).wait(); // onlyOwner 操作が新オーナーで通ることを確認
  console.log("新オーナーで onlyOwner 操作 OK");
  let rejected = false;
  try { await v.setLiveMode.staticCall(true); } catch { rejected = true; } // 旧オーナー(deployer)は拒否されること
  console.log("旧オーナーの操作は拒否:", rejected ? "OK" : "NG!");
  await (await vAsNewOwner.transferOwnership(deployer.address)).wait();
  console.log("owner →", await v.owner(), "(復帰)");

  console.log("終了残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
