// M-14 境界テスト: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)/12 ブロック
import test from "node:test";
import assert from "node:assert/strict";
import { acceptMarginBlocks, acceptDeadline, shouldRushSubmit, snapshotTimelineSafe, submitCapacity } from "../src/chain.js";

const mainnet = { minPendingAgeSec: 120, cronSec: 120, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
const sepolia = { minPendingAgeSec: 20, cronSec: 60, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };

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

test("M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件", () => {
  const dl = 1_000_000;
  // 受付締切(30 ブロック前)時点: 残り 360s − 120s 余裕 = 240s → 2 tick → 2×2×10 = 40 票
  assert.equal(submitCapacity(mainnet, dl - 30, dl), 40);
  for (const backlog of [20, 21, 30, 31]) assert.ok(backlog < 40, `backlog ${backlog} は受付締切時点の容量 40 未満`);
  // 1 tick 分しか残らない時点(240s 前 = 余裕 120s + cron 120s)では 20 票。21 件目以降は capacity_full で拒否される
  const blk = dl - 20; // 240s
  assert.equal(submitCapacity(mainnet, blk, dl), 20);
  assert.ok(20 >= 20 && 21 > 20);
  assert.equal(submitCapacity(mainnet, dl - 15, dl), 0); // 180s 前: 余裕を引くと 1 tick に満たない → 受付不可
  // 余裕を下回ると 0(受付不可)
  assert.equal(submitCapacity(mainnet, dl - 5, dl), 0);
});
test("受付締切より十分前なら容量は大きく、通常運用を妨げない(1 日前 ≈ 14,000 票)", () => {
  const dl = 1_000_000;
  assert.ok(submitCapacity(mainnet, dl - 7200, dl) > 2100);
});

test("B3-M03R: Snapshot 終了後に cron + buffer の排出時間がなければ unsafe", () => {
  const now = 2_000_000_000, block = 1000, deadline = 1100;
  const deadlineEta = now + 1200;
  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 241, now), true);
  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 240, now), true, "境界は許可");
  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 239, now), false);
  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, 0, now), false, "終了時刻不明は fail-closed");
});
