// Sepolia 段階2 共通: アドレス・ABI・デプロイ記録
const fs = require("fs");
const path = require("path");

const SEPOLIA = {
  NOUNS_DAO: "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57",
  NOUNS_TOKEN: "0x4C4674bb72a096855496a7204962297bd7e12b85",
  AUCTION_HOUSE: "0x488609b7113FCf3B761A05956300d605E8f6BcAf",
  PNOUNS_TREASURY: "0x8ae80e0b44205904be18869240c2ec62d2342785", // 本物ソースがコンストラクタで 100 枚をここに mint する定数
};

const DAO_ABI = [
  "function propose(address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,string description) returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function proposalThreshold() view returns (uint256)",
  "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
];
const NOUNS_ABI = [
  "function delegate(address)",
  "function delegates(address) view returns (address)",
  "function getCurrentVotes(address) view returns (uint96)",
  "function getPriorVotes(address,uint256) view returns (uint96)",
  "function balanceOf(address) view returns (uint256)",
];
const AH_ABI = [
  "function auction() view returns (uint96 nounId,uint128 amount,uint40 startTime,uint40 endTime,address bidder,bool settled)",
  "function createBid(uint256 nounId) payable",
  "function settleCurrentAndCreateNewAuction()",
  "function reservePrice() view returns (uint192)",
  "function minBidIncrementPercentage() view returns (uint8)",
  "function duration() view returns (uint256)",
];
const PNOUNS_ABI = [
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function adminMint(address[] to,uint256[] num)",
  "function transferFrom(address,address,uint256)",
];

const FILE = path.join(__dirname, "../../deployments/sepolia.json");
function loadDeployments() {
  return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
}
function saveDeployments(obj) {
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2) + "\n");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { SEPOLIA, DAO_ABI, NOUNS_ABI, AH_ABI, PNOUNS_ABI, loadDeployments, saveDeployments, sleep };
