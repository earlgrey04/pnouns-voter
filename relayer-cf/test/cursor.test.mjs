// B3-H04 の回帰テスト: cursor は未解決票より先に進まない / 同一秒の票を取りこぼさない
import test from "node:test";
import assert from "node:assert/strict";
import { fetchRows, planSubmission, scanKey, supplementCheckPlan, uniqueVoterCandidates } from "../src/snap.js";

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

test("指摘1R: 601 件を複数 tick の offset 走査で末尾まで取得して先頭へ戻る", async () => {
  const votes = Array.from({ length: 601 }, (_, i) => row(`0x${i}`, 1000, `cid-${i}`));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const query = JSON.parse(init.body).query;
    const first = Number(query.match(/first:\s*(\d+)/)?.[1]);
    const skip = Number(query.match(/skip:\s*(\d+)/)?.[1]);
    return new Response(JSON.stringify({ data: { votes: votes.slice(skip, skip + first) } }), { status: 200 });
  };
  try {
    let offset = 0; const got = [];
    for (let tick = 0; tick < 3; tick++) {
      const r = await fetchRows({ snapshotHub: "https://hub.invalid" }, "snap", offset);
      got.push(...r.rows.map((v) => v.ipfs)); offset = r.nextOffset;
    }
    assert.equal(got.length, 601);
    assert.equal(new Set(got).size, 601);
    assert.equal(got.at(-1), "cid-600");
    assert.equal(offset, 0, "末尾に到達したら全体再走査のため先頭へ戻る");
  } finally { globalThis.fetch = originalFetch; }
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

test("指摘3R: 補完用 token 照会は行数ではなく一意な tokenId 数に制限される", () => {
  const rows = Array.from({ length: 600 }, (_, i) => row("0xaaa", 700, `cid-${i}`));
  const recs = rows.map(() => recDone(700, 100));
  const tokensByRow = rows.map(() => Array.from({ length: 100 }, (_, i) => i + 1));
  const p = supplementCheckPlan(rows, recs, tokensByRow);
  assert.equal(p.rowIndexes.length, 600);
  assert.equal(p.tokenIds.length, 100, "60,000 回ではなく一意な 100 token だけ照会する");
});

test("指摘2R: 同一 voter の候補は最新 1 件だけをバッチへ入れる", () => {
  const send = [
    { row: row("0xaaa", 100, "cid-a"), index: 0 },
    { row: row("0xaaa", 100, "cid-b"), index: 1 },
    { row: row("0xbbb", 101, "cid-c"), index: 2 },
  ];
  const selected = uniqueVoterCandidates(send, 10);
  assert.equal(selected.length, 2);
  assert.equal(selected.find((x) => x.row.voter === "0xaaa").row.ipfs, "cid-b");
});

test("再登録した Snapshot 提案は別の scan offset を使う", () => {
  const store = { prefix: "1:voter:" };
  assert.notEqual(scanKey(store, 42, "snap-a"), scanKey(store, 42, "snap-b"));
});
