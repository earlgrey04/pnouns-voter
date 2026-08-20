// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
// 第10回監査の指摘: 前方一致・偽ドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null を検証すること。
import { test } from "node:test";
import assert from "node:assert/strict";
import { referencesNounsProposal as ref } from "../src/snap.js";

test("正規の URL を検出する", () => {
  assert.equal(ref("https://nouns.wtf/vote/989", 989), true);
  assert.equal(ref("Source: https://nouns.wtf/vote/989\n本文", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989/", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989?tab=activity", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989#comments", 989), true);
  assert.equal(ref("https://www.nouns.wtf/vote/989", 989), true);
  assert.equal(ref("HTTPS://NOUNS.WTF/vote/989", 989), true, "ホスト名は大文字小文字を区別しない");
  assert.equal(ref("(https://nouns.wtf/vote/989)", 989), true, "括弧で閉じられていても拾う");
  assert.equal(ref("http://nouns.wtf/vote/989", 989), true);
});

test("前方一致で誤検出しない", () => {
  assert.equal(ref("https://nouns.wtf/vote/123", 12), false);
  assert.equal(ref("https://nouns.wtf/vote/12", 123), false);
  assert.equal(ref("https://nouns.wtf/vote/9890", 989), false);
});

test("別ドメイン・別パスを拒否する", () => {
  assert.equal(ref("https://evilnouns.wtf/vote/989", 989), false);
  assert.equal(ref("https://nouns.wtf.evil.com/vote/989", 989), false);
  assert.equal(ref("https://fake.nouns.wtf/vote/989", 989), false, "サブドメインは別ホスト");
  assert.equal(ref("https://nouns.wtf/vote/989/extra", 989), false);
  assert.equal(ref("https://nouns.wtf/proposal/989", 989), false);
  assert.equal(ref("nouns.wtf/vote/989", 989), false, "スキームなしの裸文字列は URL として扱わない");
});

test("空・null・不正な入力で例外を投げず false を返す", () => {
  for (const v of [null, undefined, "", 0, {}, []]) assert.equal(ref(v, 989), false);
  for (const id of [null, undefined, 0, -1, NaN, "abc", 1e21]) assert.equal(ref("https://nouns.wtf/vote/989", id), false);
});

test("正規表現メタ文字を含む入力で壊れない", () => {
  assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
  assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
});

// 第11回監査 M-3: URL 解析化による検出回帰(末尾句読点・全角後置文字・Markdown)
test("URL の直後に句読点や日本語が続いても検出する", () => {
  assert.equal(ref("詳細は https://nouns.wtf/vote/989。", 989), true, "全角句点");
  assert.equal(ref("詳細は https://nouns.wtf/vote/989.", 989), true, "半角ピリオド");
  assert.equal(ref("https://nouns.wtf/vote/989, および他", 989), true, "カンマ");
  assert.equal(ref("https://nouns.wtf/vote/989、他", 989), true, "読点");
  assert.equal(ref("https://nouns.wtf/vote/989後に投票", 989), true, "直後に日本語");
  assert.equal(ref("「https://nouns.wtf/vote/989」を参照", 989), true, "全角かぎ括弧で囲む");
  assert.equal(ref("[議案](https://nouns.wtf/vote/989)", 989), true, "Markdown リンク");
  assert.equal(ref("https://nouns.wtf/vote/989\n次の行", 989), true, "改行が続く");
  assert.equal(ref("https://nouns.wtf/vote/989?tab=x。", 989), true, "クエリ + 句点");
});

test("末尾処理で別 ID に化けない", () => {
  assert.equal(ref("https://nouns.wtf/vote/9890。", 989), false);
  assert.equal(ref("https://nouns.wtf/vote/989。", 9890), false);
  assert.equal(ref("https://evilnouns.wtf/vote/989。", 989), false, "末尾処理をしてもドメイン判定は維持");
});

test("改行で分断された URL は検出しない(仕様)", () => {
  assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
});
