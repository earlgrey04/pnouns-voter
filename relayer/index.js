// 起動: API サーバー + ワーカー。NETWORK=sepolia|mainnet
const { cfg, relayerWallet, getProvider } = require("./chain");
const { createApp } = require("./server");
const { startWorker } = require("./worker");
(async () => {
  const w = relayerWallet();
  const bal = await getProvider().getBalance(w.address);
  console.log(`[relayer] network=${cfg.network} metagov=${cfg.metagov} pnouns=${cfg.pnouns} relayer=${w.address} balance=${Number(bal) / 1e18} ETH data=${cfg.dataDir}`);
  createApp().listen(cfg.port, () => console.log(`[relayer] http://localhost:${cfg.port}`));
  if (process.env.NO_WORKER !== "1") startWorker();
})();
