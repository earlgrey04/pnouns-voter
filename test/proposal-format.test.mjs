// 提案本文の整形(全文転記・超過時の切り詰め)の検証。実際の Nouns 提案の長さで確認する。
import test from "node:test";
import assert from "node:assert/strict";
import { buildProposal, extractTitle, truncateBody, DEFAULT_BODY_LIMIT } from "../scripts/lib/proposal-format.mjs";

test("タイトルは Markdown 見出しから取り出す", () => {
  assert.equal(extractTitle("# Nouns Treasury Management - USDC\n\n本文", 989), "Nouns Treasury Management - USDC");
  assert.equal(extractTitle("\n\nタイトルなし本文", 12), "タイトルなし本文");
  assert.equal(extractTitle("", 12), "Proposal 12");
});

test("上限内なら全文をそのまま入れる(Prop 989 相当 6,224 文字)", () => {
  const desc = "# T\n\n" + "あ".repeat(6000);
  const p = buildProposal({ nounsId: 989, description: desc });
  assert.equal(p.truncated, false);
  assert.equal(p.body, desc.trim());
  assert.equal(p.discussion, "https://nouns.wtf/vote/989");
  assert.deepEqual(p.choices, ["賛成", "反対", "棄権"]);
});

test("上限超過(Prop 986 相当 14,029 文字)なら切って案内を付ける", () => {
  const desc = "# Long\n\n" + Array.from({ length: 700 }, (_, i) => `段落 ${i} ${"x".repeat(18)}`).join("\n\n");
  assert.ok(desc.length > DEFAULT_BODY_LIMIT);
  const p = buildProposal({ nounsId: 986, description: desc });
  assert.equal(p.truncated, true);
  assert.ok(p.body.length <= DEFAULT_BODY_LIMIT, `本文 ${p.body.length} <= ${DEFAULT_BODY_LIMIT}`);
  assert.ok(p.body.includes("https://nouns.wtf/vote/986"), "全文への導線がある");
  assert.ok(p.body.includes("省略"), "省略していることを明示");
  assert.equal(p.originalLength, desc.length);
});

test("切り詰めは段落境界を優先する", () => {
  const desc = "# T\n\n" + Array.from({ length: 400 }, (_, i) => `p${i} ${"y".repeat(20)}`).join("\n\n");
  const { body } = truncateBody(desc, "https://nouns.wtf/vote/1", 2000);
  assert.ok(body.length <= 2000);
  assert.ok(!/\ny\d*$/.test(body), "行の途中で切れていない");
});
