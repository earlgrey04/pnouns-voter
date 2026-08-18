require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const FORK_URL = process.env.MAINNET_RPC_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {
      chainId: 1,
      forking: FORK_URL ? { url: FORK_URL } : undefined,
      // 大量マイニングを速くする
      allowUnlimitedContractSize: false,
    },
  },
  mocha: { timeout: 600000 },
  gasReporter: { enabled: !!process.env.REPORT_GAS, showMethodSig: true },
};
