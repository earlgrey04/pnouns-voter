// 第18回監査: register.js の formatter が scripts/lib/proposal-format.mjs と同値であることの回帰テスト。
// コピー実装のため、片方だけ修正すると全提案が「不一致で保留」になる。ここで乖離を検知する。
import { test } from "node:test";
import assert from "node:assert/strict";
import * as w from "../src/register.js";
import * as l from "../../scripts/lib/proposal-format.mjs";

const LONG = "# Long Proposal\n\n" + Array.from({ length: 400 }, (_, i) => `パラグラフ ${i} — ${"内容".repeat(20)}`).join("\n\n");
const FIXTURES = [
  { name: "通常", d: "# Title\n\nHello world" },
  { name: "空", d: "" },
  { name: "CRLF", d: "# T\r\n\r\nline1\r\nline2" },
  { name: "Unicode 結合・絵文字", d: "# 日本語タイトル ⚡\n\nガ(結合濁点) 👨‍👩‍👧‍👦 サロゲート𠮷" },
  { name: "9500 ちょうど", d: "x".repeat(9500) },
  { name: "9501", d: "x".repeat(9501) },
  { name: "長文(段落境界)", d: LONG },
  { name: "見出しなし", d: "no heading first line\n\nbody" },
];

test("buildProposal が両実装で完全一致する", () => {
  for (const f of FIXTURES) {
    for (const id of [1, 989]) {
      const a = w.buildProposal({ nounsId: id, description: f.d });
      const b = l.buildProposal({ nounsId: id, description: f.d });
      assert.equal(a.title, b.title, `${f.name}/title`);
      assert.equal(a.body, b.body, `${f.name}/body`);
      assert.equal(a.discussion, b.discussion, `${f.name}/discussion`);
      assert.deepEqual(a.choices, b.choices, `${f.name}/choices`);
    }
  }
});

test("定数も一致する", () => {
  assert.deepEqual(w.CHOICES, l.CHOICES);
  assert.equal(w.DEFAULT_BODY_LIMIT, l.DEFAULT_BODY_LIMIT);
});
