// メンバー向け告知の「下書き」文面(現行の pnouns-announce / 結果報告と同一テンプレ)。
// 2026-08-29 決定: 新しい仕組みからの通知は #pnouns-mirror(運営用 webhook)のみに出す。
// ここで作る文面はメンバーチャンネルへ自動投稿せず、参考として運営チャンネルに添える。

// pNouns⚡DAO のロール ID(現行の告知と同じ 2 つ)
export const MEMBER_ROLE_IDS = ["1030636444726865991", "1069748233166917672"];
export const SUPPORT_WORDS = ["反対", "賛成", "棄権"]; // Nouns の support 値順

// "8月28日14時7分ごろ"(現行: TZ=Asia/Tokyo date +'%-m月%-d日%-H時%-M分ごろ')
export function formatDeadlineJst(unixSec) {
  const d = new Date(unixSec * 1000);
  const p = Object.fromEntries(new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${Number(p.month)}月${Number(p.day)}日${Number(p.hour)}時${Number(p.minute)}分ごろ`;
}

// 受付開始の告知(現行テンプレ: メンション 1 行 + 4 行。URL 行頭の半角スペースも慣例どおり)
export function memberAnnounceText(space, nounsId, snapEndSec) {
  return [
    MEMBER_ROLE_IDS.map((id) => `<@&${id}>`).join(" "),
    `Prop ${nounsId}をsnapshotにあげました！`,
    `投票よろしくお願いします！`,
    `締切時間：${formatDeadlineJst(snapEndSec)}`,
    ` https://snapshot.box/#/s:${space}`,
  ].join("\n");
}

// 投票完了の結果報告(現行テンプレ: メンションは 2 行、空行区切り)
export function memberResultText(nounsId, support) {
  return [
    ...MEMBER_ROLE_IDS.map((id) => `<@&${id}>`),
    ``,
    `結果をNouns DAOに投票しました！`,
    ``,
    `✅Prop ${nounsId} ${SUPPORT_WORDS[support]}`,
    ``,
    `引き続きよろしくお願いします。`,
    ``,
    `https://nouns.wtf/vote`,
  ].join("\n");
}

// 運営チャンネル向けの包み(コードブロックで囲み、メンションが発火しないようにする)
export function wrapDraft(label, body) {
  return [`📝 ${label}(現行の告知と同じ形式。参考用・自動投稿はしません):`, "```", body, "```"].join("\n");
}
