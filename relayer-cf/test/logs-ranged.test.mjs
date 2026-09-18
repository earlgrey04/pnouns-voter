import test from "node:test";
import assert from "node:assert/strict";
import { getLogsRanged } from "../src/chain.js";

function fakePc(latest) {
  const calls = [];
  return { calls, async getBlockNumber() { return BigInt(latest); }, async getLogs(p) { calls.push([p.fromBlock, p.toBlock]); return [{ from: p.fromBlock, to: p.toBlock, event: p.event }]; } };
}

test("GETLOGS_MAX_RANGE=0 は従来どおり 1 回で取得する", async () => {
  const pc = fakePc(100);
  const logs = await getLogsRanged({ logsMaxRange: 0 }, pc, { fromBlock: 10n, toBlock: "latest" });
  assert.equal(logs.length, 1);
  assert.deepEqual(pc.calls, [[10n, "latest"]]);
});

test("上限あり: latest を解決して範囲を分割し、端数と 1 ブロックの範囲も正しく扱う", async () => {
  const pc = fakePc(100);
  const logs = await getLogsRanged({ logsMaxRange: 40 }, pc, { fromBlock: 10n, toBlock: "latest", event: "ev" });
  assert.deepEqual(pc.calls, [[10n, 49n], [50n, 89n], [90n, 100n]]);
  assert.equal(logs.length, 3);
  assert.equal(logs[0].event, "ev", "元のフィルタ(event/args)は引き継ぐ");
  const pc2 = fakePc(100);
  await getLogsRanged({ logsMaxRange: 40 }, pc2, { fromBlock: 100n, toBlock: 100n });
  assert.deepEqual(pc2.calls, [[100n, 100n]]);
  const pc3 = fakePc(100);
  await getLogsRanged({ logsMaxRange: 40 }, pc3, { fromBlock: 101n, toBlock: 100n });
  assert.deepEqual(pc3.calls, [], "from > to なら呼ばない");
});
