// メンバー向け下書き文面が現行の pnouns-announce / 結果報告テンプレと一致すること
import test from "node:test";
import assert from "node:assert/strict";
import { memberAnnounceText, memberResultText, formatDeadlineJst, wrapDraft } from "../src/member-draft.js";

test("締切時刻の JST 表記(現行: 8月28日14時7分ごろ)", () => {
  // pnounsdao.eth Prop 992 の end = 1787893630 → 2026-08-28 14:07 JST
  assert.equal(formatDeadlineJst(1787893630), "8月28日14時7分ごろ");
  assert.equal(formatDeadlineJst(1787580171), "8月24日23時2分ごろ"); // 0 埋めしない
});
test("受付開始の告知文(Prop 992・現行 bot の出力と同一)", () => {
  assert.equal(memberAnnounceText("pnounsdao.eth", 992, 1787893630), [
    "<@&1030636444726865991> <@&1069748233166917672>",
    "Prop 992をsnapshotにあげました！",
    "投票よろしくお願いします！",
    "締切時間：8月28日14時7分ごろ",
    " https://snapshot.box/#/s:pnounsdao.eth",
  ].join("\n"));
});
test("結果報告文(Prop 992 棄権・2026-08-28 に投稿した文面と同一)", () => {
  assert.equal(memberResultText(992, 2), [
    "<@&1030636444726865991>", "<@&1069748233166917672>", "",
    "結果をNouns DAOに投票しました！", "",
    "✅Prop 992 棄権", "",
    "引き続きよろしくお願いします。", "",
    "https://nouns.wtf/vote",
  ].join("\n"));
  assert.match(memberResultText(1, 0), /✅Prop 1 反対/);
  assert.match(memberResultText(1, 1), /✅Prop 1 賛成/);
});
test("運営チャンネル向けはコードブロックで包む(メンションを発火させない)", () => {
  const t = wrapDraft("Prop 1 の告知文", "x");
  assert.ok(t.startsWith("📝 Prop 1 の告知文"));
  assert.ok(t.includes("```\nx\n```"));
});
