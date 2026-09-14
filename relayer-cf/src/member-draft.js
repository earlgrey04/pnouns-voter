// メンバー向け告知の「下書き」文面(現行の pnouns-announce / 結果報告と同一テンプレ)。
// 2026-08-29 決定: 新しい仕組みからの通知は #pnouns-mirror(運営用 webhook)のみに出す。
// ここで作る文面はメンバーチャンネルへ自動投稿せず、参考として運営チャンネルに添える。

// pNouns⚡DAO のロール ID(現行の告知と同じ 2 つ)
export const MEMBER_ROLE_IDS = ["1030636444726865991", "1069748233166917672"];
// メンションは文頭に 2 行で置き、締めに ☝️ + よろしくお願いします！(2026-09-15 ユーザー指定の形式)
export const MEMBER_HEADER = MEMBER_ROLE_IDS.map((id) => `<@&${id}>`).join("\n");
export const MEMBER_FOOTER = ["☝️", "よろしくお願いします！"].join("\n");
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
    MEMBER_HEADER,
    `Prop ${nounsId}をsnapshotにあげました！`,
    `投票よろしくお願いします！`,
    `締切時間：${formatDeadlineJst(snapEndSec)}`,
    ` https://snapshot.box/#/s:${space}`,
    MEMBER_FOOTER,
  ].join("\n");
}

// 投票完了の結果報告(現行テンプレ: メンションは 2 行、空行区切り)
export function memberResultText(nounsId, support) {
  return [
    MEMBER_HEADER,
    `結果をNouns DAOに投票しました！`,
    ``,
    `✅Prop ${nounsId} ${SUPPORT_WORDS[support]}`,
    ``,
    `https://nouns.wtf/vote`,
    MEMBER_FOOTER,
  ].join("\n");
}

// 運営チャンネル向けの包み(コードブロックで囲み、メンションが発火しないようにする)
export function wrapDraft(label, body) {
  return [`📝 ${label}(現行の告知と同じ形式。参考用・自動投稿はしません):`, "```", body, "```"].join("\n");
}

// ---- シャドー運用中のメンバー向け自動通知(2026-09-14 決定) ----
// 1 行目に「テスト中・実運用は従来どおり」を明示する(メンバーの誤解防止)
const SHADOW_HEADER = "【並走テスト中の自動システムからの報告です。実際の投票運用は従来どおり手動で行っています】";

/// シャドー判定の報告。manualSupport: 現行委任先の on-chain 投票(null = 未投票)
export function memberShadowResultText(nounsId, result, tokens, voters, txUrl, manualSupport) {
  const head = manualSupport === null
    ? `Prop ${nounsId}: 自動システムの集計結果は「${SUPPORT_WORDS[result]}」でした(手動投票の完了後に一致を確認します)`
    : manualSupport === result
      ? `Prop ${nounsId}: 自動システムの集計結果は「${SUPPORT_WORDS[result]}」— 手動での投票と一致しました ✅`
      : `Prop ${nounsId}: 自動集計(${SUPPORT_WORDS[result]})と手動投票(${SUPPORT_WORDS[manualSupport]})の内容に相違があったため、原因を確認して改めてご報告します。委任先の変更は、一致が確認できるまで行いません。`;
  const icon = manualSupport !== null && manualSupport !== result ? "⚠️" : "🕶️";
  return [
    MEMBER_HEADER,
    `${icon}${SHADOW_HEADER}`,
    head,
    `集計: 賛成 ${tokens[1]}枚 / 反対 ${tokens[0]}枚 / 棄権 ${tokens[2]}枚(投票者 ${voters[1]}/${voters[0]}/${voters[2]} 名)`,
    `ブロックチェーン上の記録: ${txUrl}`,
    MEMBER_FOOTER,
  ].join("\n");
}

export function memberNoVotesText(nounsId) {
  return [MEMBER_HEADER, `🕶️${SHADOW_HEADER}`, `Prop ${nounsId}: pNouns からの投票がなかったため、自動判定は「投票しない」でした(手動運用と同じ判断です)`, MEMBER_FOOTER].join("\n");
}

export function memberCancelText(nounsId, word) {
  return [
    MEMBER_HEADER,
    `🚫【テスト中の自動システムが検知したお知らせです】`,
    `Prop ${nounsId} は Nouns 側で${word}されました。この提案への投票は不要になりました。`,
    `提案の内容: https://nouns.wtf/vote/${nounsId}`,
    MEMBER_FOOTER,
  ].join("\n");
}
