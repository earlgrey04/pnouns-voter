// Snapshot 提案の内容を Nouns の提案からそのまま作る(要約・人の承認は行わない)
//  - title: [Prop N] <Nouns 提案のタイトル>
//  - body : Nouns 提案の Markdown 全文。上限を超える場合のみ末尾を切って案内を付ける
//  - discussion: https://nouns.wtf/vote/N
//  - choices: 賛成 / 反対 / 棄権(コントラクトが choice 1/2/3 をこの順で解釈する)
export const CHOICES = ["賛成", "反対", "棄権"];
// 通常スペースの本文上限は約 10,000 文字(実測で 11,273 の投稿を確認)。余裕を見て既定 9,500。
export const DEFAULT_BODY_LIMIT = 9500;

/// Markdown の 1 行目からタイトルを取り出す("# Title" → "Title")
export function extractTitle(description, fallbackId) {
  const first = String(description || "").split("\n").find((l) => l.trim()) || "";
  const t = first.replace(/^#+\s*/, "").trim();
  return t || `Proposal ${fallbackId}`;
}

/// 本文を上限内に収める。切る場合は「途中で切れている」ことと全文の場所を明示する
export function truncateBody(description, url, limit = DEFAULT_BODY_LIMIT) {
  const body = String(description || "").trim();
  if (body.length <= limit) return { body, truncated: false };
  const notice = `\n\n---\n\n**⚠️ 本文が長いため、ここで省略しています。全文は Nouns DAO の提案ページをご覧ください:**\n${url}\n`;
  // 途中の行で切れないよう、直前の改行までで切る
  const cut = body.slice(0, limit - notice.length);
  const lastBreak = cut.lastIndexOf("\n\n");
  const head = lastBreak > limit * 0.5 ? cut.slice(0, lastBreak) : cut;
  return { body: head.trimEnd() + notice, truncated: true };
}

export function buildProposal({ nounsId, description, limit = DEFAULT_BODY_LIMIT }) {
  const url = `https://nouns.wtf/vote/${nounsId}`;
  const title = `[Prop ${nounsId}] ${extractTitle(description, nounsId)}`;
  const { body, truncated } = truncateBody(description, url, limit);
  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
}
