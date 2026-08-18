require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const FORK_URL = process.env.MAINNET_RPC_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
      // pNouns NFT 本物ソース(contracts/vendor/pnouns、Sourcify 検証済み)用
      { version: "0.8.14", settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
    overrides: {},
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: process.env.SEPOLIA_MNEMONIC ? { mnemonic: process.env.SEPOLIA_MNEMONIC, count: 5 } : [],
    },
    hardhat: {
      chainId: 1,
      forking: FORK_URL ? { url: FORK_URL } : undefined,
      // 大量マイニングを速くする
      allowUnlimitedContractSize: false,
    },
  },
  mocha: { timeout: 600000 },
  sourcify: { enabled: true },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
  gasReporter: { enabled: !!process.env.REPORT_GAS, showMethodSig: true },
};
