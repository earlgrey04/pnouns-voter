// メンバー向け下書き文面が現行の pnouns-announce / 結果報告テンプレと一致すること
import test from "node:test";
import assert from "node:assert/strict";
import { memberAnnounceText, memberResultText, formatDeadlineJst, wrapDraft } from "../src/member-draft.js";

test("締切時刻の JST 表記(現行: 8月28日14時7分ごろ)", () => {
  // pnounsdao.eth Prop 992 の end = 1787893630 → 2026-08-28 14:07 JST
  assert.equal(formatDeadlineJst(1787893630), "8月28日14時7分ごろ");
  assert.equal(formatDeadlineJst(1787580171), "8月24日23時2分ごろ"); // 0 埋めしない
});
test("受付開始の告知文(メンションは末尾フッター形式・2026-09-15 指定)", () => {
  assert.equal(memberAnnounceText("pnounsdao.eth", 992, 1787893630), [
    "Prop 992をsnapshotにあげました！",
    "投票よろしくお願いします！",
    "締切時間：8月28日14時7分ごろ",
    " https://snapshot.box/#/s:pnounsdao.eth",
    "☝️",
    "よろしくお願いします！",
    "<@&1030636444726865991>",
    "<@&1069748233166917672>",
  ].join("\n"));
});
test("結果報告文(メンションは末尾フッター形式)", () => {
  assert.equal(memberResultText(992, 2), [
    "結果をNouns DAOに投票しました！", "",
    "✅Prop 992 棄権", "",
    "https://nouns.wtf/vote",
    "☝️",
    "よろしくお願いします！",
    "<@&1030636444726865991>",
    "<@&1069748233166917672>",
  ].join("\n"));
  assert.match(memberResultText(1, 0), /✅Prop 1 反対/);
  assert.match(memberResultText(1, 1), /✅Prop 1 賛成/);
});
test("運営チャンネル向けはコードブロックで包む(メンションを発火させない)", () => {
  const t = wrapDraft("Prop 1 の告知文", "x");
  assert.ok(t.startsWith("📝 Prop 1 の告知文"));
  assert.ok(t.includes("```\nx\n```"));
});

test("シャドー判定の報告文: 一致・不一致・未投票の 3 パターン", async () => {
  const { memberShadowResultText, memberNoVotesText } = await import("../src/member-draft.js");
  const t1 = memberShadowResultText(997, 1, [0, 36, 5], [0, 3, 1], "https://x/tx/0xabc", 1);
  assert.ok(t1.startsWith("🕶️【並走テスト中の自動システムからの報告です"));
  assert.match(t1, /「賛成」— 手動での投票と一致しました ✅/);
  assert.match(t1, /賛成 36枚 \/ 反対 0枚 \/ 棄権 5枚\(投票者 3\/0\/1 名\)/);
  const t2 = memberShadowResultText(997, 1, [0, 36, 5], [0, 3, 1], "https://x/tx/0xabc", 0);
  assert.ok(t2.startsWith("⚠️"));
  assert.match(t2, /相違があったため/);
  assert.match(t2, /委任先の変更は、一致が確認できるまで行いません/);
  const t3 = memberShadowResultText(997, 2, [0, 0, 5], [0, 0, 1], "https://x/tx/0xabc", null);
  assert.match(t3, /手動投票の完了後に一致を確認します/);
  assert.match(memberNoVotesText(998), /「投票しない」でした/);
});
