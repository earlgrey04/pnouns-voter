// B3-H04 の回帰テスト: cursor は未解決票より先に進まない / 同一秒の票を取りこぼさない
import test from "node:test";
import assert from "node:assert/strict";
import { planSubmission } from "../src/snap.js";

const row = (voter, created, ipfs) => ({ voter, created, ipfs: ipfs || `cid-${voter}-${created}` });
const recNone = [false, 0, 0, 0, "0x"];
const recDone = (ts, counted = 1) => [true, 1, counted, ts, "0x"];

test("同一秒に 21 票あっても、送れなかった票の手前で cursor が止まる", () => {
  const T = 1000;
  const rows = Array.from({ length: 21 }, (_, i) => row(`0x${i}`, T));
  const recs = rows.map(() => recNone);
  const r = planSubmission(rows, recs, { tokenCounts: rows.map(() => 1), limit: 20, cursor: 0 });
  assert.equal(r.send.length, 20);
  assert.equal(r.advance, 0, "1 票も解決していないので cursor は進まない");
  // 20 票が確定した次の tick: 21 票目が必ず拾われる。
  // cursor は「未解決票の created を超えない」ことが不変条件(取得は created_gte = 境界を含むため同値は安全)
  const recs2 = rows.map((_, i) => (i < 20 ? recDone(T) : recNone));
  const r2 = planSubmission(rows, recs2, { tokenCounts: rows.map(() => 1), limit: 20, cursor: 0 });
  assert.equal(r2.send.length, 1, "21 票目が拾われる(取りこぼさない)");
  assert.ok(r2.advance <= T, "未解決票の created を超えて進まない");
  // 全部確定したら T まで進む
  const recs3 = rows.map(() => recDone(T));
  const r3 = planSubmission(rows, recs3, { tokenCounts: rows.map(() => 1), limit: 20, cursor: 0 });
  assert.equal(r3.send.length, 0);
  assert.equal(r3.advance, T);
});

test("未解決票の後ろに反映済みの行があっても、cursor は追い越さない(部分 revert 対策)", () => {
  const rows = [row("0xa", 100), row("0xb", 200), row("0xc", 300)];
  // b だけ失敗(未反映)、a と c は反映済み
  const recs = [recDone(100), recNone, recDone(300)];
  const r = planSubmission(rows, recs, { tokenCounts: [1, 1, 1], limit: 10, cursor: 0 });
  assert.equal(r.advance, 100, "b を追い越さない");
  assert.equal(r.send.length, 1);
  assert.equal(r.send[0].row.voter, "0xb");
});

test("pNouns 未保有・デッドレターの票は skip 扱いで cursor を進めてよい", () => {
  const rows = [row("0xa", 100), row("0xb", 200, "deadcid"), row("0xc", 300)];
  const recs = [recDone(100), recNone, recNone];
  const r = planSubmission(rows, recs, { tokenCounts: [1, 0, 1], deadLetters: new Set(["deadcid"]), limit: 10, cursor: 0 });
  assert.equal(r.advance, 200, "保有ゼロ/デッドレターは飛ばして進める");
  assert.equal(r.send.length, 1);
  assert.equal(r.send[0].row.voter, "0xc");
});

test("やり直し(新しい timestamp)と補完(同 timestamp・token 増)を検出する", () => {
  const rows = [row("0xa", 500), row("0xb", 600)];
  // a: 既に ts=400 で反映済み → 500 は新しいのでやり直し扱い / b: ts=600 で 1 枚計上済み、いま 3 枚保有 → 補完
  const recs = [recDone(400), recDone(600, 1)];
  const r = planSubmission(rows, recs, { tokenCounts: [2, 3], uncountedTokens: [0, 2], limit: 10, cursor: 0 });
  assert.equal(r.send.length, 2);
  assert.equal(r.advance, 0);
});

test("すべて反映済みなら最大 created まで進む", () => {
  const rows = [row("0xa", 100), row("0xb", 200)];
  const r = planSubmission(rows, [recDone(100), recDone(200)], { tokenCounts: [1, 1], limit: 10, cursor: 50 });
  assert.equal(r.send.length, 0);
  assert.equal(r.advance, 200);
});

test("指摘1: ページを読み切れない(complete=false)ときは cursor を一切進めない", () => {
  const T = 1000;
  const rows = Array.from({ length: 300 }, (_, i) => row(`0x${i}`, T));
  const recs = rows.map(() => recDone(T)); // 300 件すべて処理済みでも…
  const r = planSubmission(rows, recs, { tokenCounts: rows.map(() => 1), limit: 20, cursor: 0, complete: false });
  assert.equal(r.advance, 0, "読み切れていないので cursor を進めない(301 件目に到達できなくなるのを防ぐ)");
  const r2 = planSubmission(rows, recs, { tokenCounts: rows.map(() => 1), limit: 20, cursor: 0, complete: true });
  assert.equal(r2.advance, T, "読み切れていれば進めてよい");
});

test("指摘2: token を入れ替えた場合(保有数 < 計上数)でも補完対象として検出する", () => {
  const rows = [row("0xa", 700)];
  // 過去に 5 枚計上済み。その後手放し、未計上の 1 枚を取得 → 保有 1 枚・未計上 1 枚
  const recs = [recDone(700, 5)];
  const r = planSubmission(rows, recs, { tokenCounts: [1], uncountedTokens: [1], limit: 10, cursor: 0 });
  assert.equal(r.send.length, 1, "枚数比較(1>5=偽)ではなく未計上 token の有無で判定する");
  // 未計上がなければ送らない
  const r2 = planSubmission(rows, recs, { tokenCounts: [1], uncountedTokens: [0], limit: 10, cursor: 0 });
  assert.equal(r2.send.length, 0);
  assert.equal(r2.advance, 700);
});
