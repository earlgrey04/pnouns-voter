// リレイヤー設定(env)。NETWORK=sepolia|mainnet で既定アドレスを切替、個別 env で上書き可。
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const os = require("os");

const PRESETS = {
  sepolia: {
    chainId: 11155111,
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com", "https://sepolia.drpc.org", "https://1rpc.io/sepolia"],
    nounsDAO: "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57",
    nounsToken: "0x4C4674bb72a096855496a7204962297bd7e12b85",
    explorer: "https://sepolia.etherscan.io",
    blockscout: "https://eth-sepolia.blockscout.com",
    ...require("../deployments/sepolia.json"), // pnouns, metagov
  },
  mainnet: {
    chainId: 1,
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org", "https://1rpc.io/eth"],
    nounsDAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
    nounsToken: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
    pnouns: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    voter: process.env.VOTER_ADDRESS, // mainnet デプロイ後に設定
    explorer: "https://etherscan.io",
    blockscout: "https://eth.blockscout.com",
  },
};

const network = process.env.NETWORK || "sepolia";
const preset = PRESETS[network];
if (!preset) throw new Error(`unknown NETWORK ${network}`);

module.exports = {
  network,
  chainId: preset.chainId,
  rpcUrls: (process.env.RPC_URLS ? process.env.RPC_URLS.split(",") : []).concat(preset.rpcUrls),
  nounsDAO: process.env.NOUNS_DAO_ADDRESS || preset.nounsDAO,
  nounsToken: process.env.NOUNS_TOKEN_ADDRESS || preset.nounsToken,
  pnouns: process.env.PNOUNS_ADDRESS || preset.pnouns,
  voter: process.env.VOTER_ADDRESS || preset.voter,
  explorer: preset.explorer,
  blockscout: preset.blockscout,
  // 署名鍵: RELAYER_PRIVATE_KEY 優先、なければ SEPOLIA_MNEMONIC の #0
  relayerKey: process.env.RELAYER_PRIVATE_KEY || null,
  relayerMnemonic: process.env.SEPOLIA_MNEMONIC || null,
  port: Number(process.env.PORT || 8790),
  dataDir: process.env.DATA_DIR || path.join(os.homedir(), ".config", "pnouns-voter", network),
  discordWebhook: process.env.DISCORD_WEBHOOK_URL || null,
  submitIntervalSec: Number(process.env.SUBMIT_INTERVAL_SEC || 30),
  executeGasMult: Number(process.env.EXECUTE_GAS_MULT || 1.3),
  scanProposals: Number(process.env.SCAN_PROPOSALS || 30), // proposalCount から遡って見る本数
  onlyProposer: process.env.ONLY_PROPOSER ? process.env.ONLY_PROPOSER.toLowerCase() : null, // テスト用: この提案者の提案だけ扱う
  cacheSec: Number(process.env.CACHE_SEC || 10),
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 8790)}`, // 告知に載せる dApp の URL
  announce: process.env.ANNOUNCE !== "0", // 新提案の受付開始を Discord に告知
  minPendingAgeSec: Number(process.env.MIN_PENDING_AGE_SEC || 20), // 受付から投函までの最短待ち(まとめ効率のため)
};
