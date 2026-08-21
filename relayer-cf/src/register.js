// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY で有効)。
// 安全設計: ハブ上の提案を「URL の自己申告」だけで信用せず、Nouns のオンチェーン本文
// (ProposalCreated/Updated イベント)から「あるべき Snapshot 提案の内容」を再計算し、
// title・body・discussion・choices が完全一致した場合のみ登録する。
// これにより bot の鍵が単独で侵害されても、忠実な内容の提案しか対応表に載らない
// (自己申告 URL だけで登録すると、bot 単独侵害で偽内容の提案が登録まで通ってしまう)。
import { DAO_ABI, METAGOV_ABI } from "./chain.js";
import { hubGql, referencesNounsProposal } from "./snap.js";

// ---- scripts/lib/proposal-format.mjs と同一ロジック(bot 側と一致していることが検証の前提) ----
export const CHOICES = ["賛成", "反対", "棄権"];
export const DEFAULT_BODY_LIMIT = 9500;
export function extractTitle(description, fallbackId) {
  const first = String(description || "").split("\n").find((l) => l.trim()) || "";
  const t = first.replace(/^#+\s*/, "").trim();
  return t || `Proposal ${fallbackId}`;
}
export function truncateBody(description, url, limit = DEFAULT_BODY_LIMIT) {
  const body = String(description || "").trim();
  if (body.length <= limit) return { body, truncated: false };
  const notice = `\n\n---\n\n**⚠️ 本文が長いため、ここで省略しています。全文は Nouns DAO の提案ページをご覧ください:**\n${url}\n`;
  const cut = body.slice(0, limit - notice.length);
  const lastBreak = cut.lastIndexOf("\n\n");
  const head = lastBreak > limit * 0.5 ? cut.slice(0, lastBreak) : cut;
  return { body: head.trimEnd() + notice, truncated: true };
}
export function buildProposal({ nounsId, description, limit = DEFAULT_BODY_LIMIT }) {
  const url = `https://nouns.wtf/vote/${nounsId}`;
  const title = `[Prop ${nounsId}] ${extractTitle(description, nounsId)}`;
  const { body, truncated } = truncateBody(description, url, limit);
  return { title, body, discussion: url, choices: [...CHOICES], truncated };
}

/// Nouns 提案のオンチェーン本文(作成イベント + 更新イベントの最新)
export async function nounsDescription(c, pc, id, creationBlock) {
  const events = DAO_ABI.filter((x) => x.type === "event");
  const latest = await pc.getBlockNumber();
  const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
  let desc = null;
  for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === Number(id)) desc = String(l.args.description || "");
  const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
  for (const l of updates) if (Number(l.args.id) === Number(id)) desc = String(l.args.description || desc);
  return desc;
}

/// 未登録の active な Nouns 提案について、対応する Snapshot 提案を探し、内容一致を検証して登録する。
/// 呼び出し条件(worker 側): snapshotSpace 設定済み・対応表なし・autoRegister 有効・registrar 鍵あり。
export async function autoRegister(c, pc, registrar, store, notify, p) {
  if (await store.getFlag(`regsent:${p.id}`)) return; // 送信済み・採掘待ち
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title body discussion choices } }`);
  const cand = (data.proposals || []).find((x) => referencesNounsProposal(x.discussion, p.id) || referencesNounsProposal(x.body, p.id));
  if (!cand) return; // bot がまだ提案を作っていない — 次 tick に再確認
  const desc = await nounsDescription(c, pc, p.id, p.creationBlock);
  if (desc === null) { console.warn(`[register] prop ${p.id}: オンチェーン本文を取得できず登録を見送り`); return; }
  const expected = buildProposal({ nounsId: p.id, description: desc });
  const problems = [];
  if (cand.title !== expected.title) problems.push("title");
  if ((cand.discussion || "") !== expected.discussion) problems.push("discussion");
  if ((cand.body || "") !== expected.body) problems.push("body");
  if (JSON.stringify(cand.choices) !== JSON.stringify(expected.choices)) problems.push("choices");
  if (problems.length) {
    if (!(await store.getFlag(`regmismatch:${p.id}`))) {
      const sent = await notify(c, [`⚠️ Prop ${p.id}: Snapshot 提案 ${cand.id.slice(0, 14)}… は本議案を参照していますが、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました(不一致: ${problems.join(", ")})。`, `bot の作成内容を確認してください(一致するまで登録されません)。`].join("\n"));
      if (sent) await store.setFlag(`regmismatch:${p.id}`, 86400);
    }
    return;
  }
  const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [cand.id, BigInt(p.id)] });
  await store.setFlag(`regsent:${p.id}`, 600);
  await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。`, `Snapshot: ${cand.id}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
}
