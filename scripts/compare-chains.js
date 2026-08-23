const { ethers } = require("ethers");
require("dotenv").config();
const abi = require("./abi/nouns-dao-impl.json").abi; // 事前に Etherscan 等から取得して配置
const CH = {
  mainnet: { rpc: process.env.MAINNET_RPC_URL, dao: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", token: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", ah: "0x830BD73E4184ceF73443C15111a1DF14e495C706" },
  sepolia: { rpc: "https://ethereum-sepolia-rpc.publicnode.com", dao: "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57", token: "0x4C4674bb72a096855496a7204962297bd7e12b85", ah: "0x488609b7113FCf3B761A05956300d605E8f6BcAf" },
};
const daoGetters = ["votingDelay","votingPeriod","proposalThresholdBPS","proposalThreshold","minQuorumVotesBPS","maxQuorumVotesBPS","quorumVotesBPS","objectionPeriodDurationInBlocks","proposalUpdatablePeriodInBlocks","lastMinuteWindowInBlocks","forkPeriod","forkThresholdBPS","forkThreshold","proposalCount","adjustedTotalSupply","timelock","timelockV1","vetoer","admin","forkEscrow","forkDAODeployer","nouns","voteSnapshotBlockSwitchProposalId","MAX_REFUND_PRIORITY_FEE","MAX_REFUND_BASE_FEE","MAX_REFUND_GAS_USED","REFUND_BASE_GAS"];
const tokenAbi = ["function totalSupply() view returns (uint256)","function minter() view returns (address)","function noundersDAO() view returns (address)","function isMinterLocked() view returns (bool)","function owner() view returns (address)","function descriptor() view returns (address)"];
const ahAbi = ["function duration() view returns (uint256)","function reservePrice() view returns (uint192)","function timeBuffer() view returns (uint56)","function minBidIncrementPercentage() view returns (uint8)","function paused() view returns (bool)","function auction() view returns (uint96 nounId,uint128 amount,uint40 startTime,uint40 endTime,address bidder,bool settled)"];
(async () => {
  const out = {};
  for (const [name, c] of Object.entries(CH)) {
    const p = new ethers.JsonRpcProvider(c.rpc, undefined, { staticNetwork: true });
    const dao = new ethers.Contract(c.dao, abi, p);
    const tok = new ethers.Contract(c.token, tokenAbi, p);
    const ah = new ethers.Contract(c.ah, ahAbi, p);
    const r = {};
    for (const g of daoGetters) { try { r["dao." + g] = String(await dao[g]()); } catch (e) { r["dao." + g] = "ERR " + (e.shortMessage || "").slice(0, 40); } }
    try { const q = await dao.getDynamicQuorumParamsAt(await p.getBlockNumber()); r["dao.dynamicQuorum(min,max,coef)"] = `${q[0]},${q[1]},${q[2]}`; } catch (e) { r["dao.dynamicQuorum"] = "ERR"; }
    for (const g of ["totalSupply","minter","noundersDAO","isMinterLocked","owner","descriptor"]) { try { r["token." + g] = String(await tok[g]()); } catch { r["token." + g] = "ERR"; } }
    for (const g of ["duration","reservePrice","timeBuffer","minBidIncrementPercentage","paused"]) { try { r["auction." + g] = String(await ah[g]()); } catch { r["auction." + g] = "ERR"; } }
    try { const a = await ah.auction(); r["auction.current"] = `noun#${a.nounId} amount=${ethers.formatEther(a.amount)} ETH settled=${a.settled}`; } catch { r["auction.current"] = "ERR"; }
    r["chain.blockNumber"] = String(await p.getBlockNumber());
    // timelock balance
    try { r["timelock.balanceETH"] = ethers.formatEther(await p.getBalance(r["dao.timelock"])); } catch {}
    out[name] = r;
  }
  const keys = [...new Set([...Object.keys(out.mainnet), ...Object.keys(out.sepolia)])];
  console.log("| 項目 | mainnet | sepolia |\n|---|---|---|");
  for (const k of keys) console.log(`| ${k} | ${out.mainnet[k]} | ${out.sepolia[k]} |`);
})();
