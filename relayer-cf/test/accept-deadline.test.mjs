// M-14 境界テスト: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)/12 ブロック
import test from "node:test";
import assert from "node:assert/strict";
import { acceptMarginBlocks, acceptDeadline, shouldRushSubmit } from "../src/chain.js";

const mainnet = { minPendingAgeSec: 120, cronSec: 120, submitBufferSec: 120 };
const sepolia = { minPendingAgeSec: 20, cronSec: 60, submitBufferSec: 120 };

test("mainnet: 受付締切はオンチェーン締切の 30 ブロック前", () => {
  assert.equal(acceptMarginBlocks(mainnet), 30);
  assert.equal(acceptDeadline(mainnet, 1_000_000), 999_970);
});
test("受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード", () => {
  const dl = 1_000_000;
  assert.equal(shouldRushSubmit(mainnet, 999_969, dl), false);
  assert.equal(shouldRushSubmit(mainnet, 999_970, dl), true);
});
test("最小待機 + cron 間隔 が受付締切〜オンチェーン締切の間に収まる", () => {
  for (const c of [mainnet, sepolia]) {
    const marginSec = acceptMarginBlocks(c) * 12;
    assert.ok(marginSec >= c.minPendingAgeSec + c.cronSec, `${marginSec}s >= ${c.minPendingAgeSec + c.cronSec}s`);
  }
});
test("sepolia テスト設定でも受付窓が残る(投票期間 25 ブロック、margin 5)", () => {
  const start = 100, onchain = start + 25 - 5;
  assert.ok(acceptDeadline(sepolia, onchain) > start);
});
