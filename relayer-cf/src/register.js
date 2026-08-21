// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
// 安全設計(第18回監査で強化):
//  - ハブ上の提案を「URL の自己申告」だけで登録しない。Nouns のオンチェーン本文から
//    buildProposal で期待内容を再計算し、title/body/discussion/choices の完全一致を要求
//  - 候補の選別(author=正規 bot / type=single-choice / 投票期間が現在有効)を通過した提案だけ
//    本文を 1 件ずつ取得(本文の一括取得は 64KiB 上限 DoS になるため行わない)
//  - 完全一致がちょうど 1 件のときだけ登録(0 件: 警告して保留 / 2 件以上: 曖昧として保留)
//  - 送信は {tx, at} を KV に記録し、10 分未採掘なら再試行。AlreadyRegistered は競合として扱う
import { DAO_ABI, METAGOV_ABI, revertErrorName } from "./chain.js";
import { hubGql, referencesNounsProposal } from "./snap.js";
import { keccak256, stringToBytes } from "viem";

// ---- scripts/lib/proposal-format.mjs と同一ロジック(同値性は回帰テストで担保) ----
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

/// Nouns 提案のオンチェーン本文(作成イベント + 更新イベントの最新)。
/// Pending/Active では本文は凍結済みのため、KV に 1 回だけ保存して再利用する(RPC ログ取得の節約)。
export async function nounsDescription(c, pc, store, id, creationBlock) {
  const ck = `${store.prefix}desc:${id}`;
  const cached = await store.kvRaw.get(ck);
  if (cached !== null) return cached;
  const events = DAO_ABI.filter((x) => x.type === "event");
  const latest = await pc.getBlockNumber();
  const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
  let desc = null;
  for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === Number(id)) desc = String(l.args.description || "");
  if (desc === null) return null;
  const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
  for (const l of updates) if (Number(l.args.id) === Number(id)) desc = String(l.args.description ?? desc); // 空文字への更新も有効な最新値(第18回監査)
  await store.kvRaw.put(ck, desc, { expirationTtl: 86400 * 14 });
  return desc;
}

async function warnOnce(c, store, notify, key, ttl, text) {
  if (await store.getFlag(key)) return;
  const sent = await notify(c, text);
  if (sent !== false) await store.setFlag(key, ttl);
}

/// 未登録の active な Nouns 提案について、対応する Snapshot 提案を探し、検証して登録する。
export async function autoRegister(c, pc, registrar, store, notify, p) {
  // 送信済み記録: 10 分は再送しない。それを過ぎたら receipt を確認して再試行を判断
  const sentK = `${store.prefix}regsent2:${p.id}`;
  const pending = await store.kvRaw.get(sentK, "json");
  if (pending) {
    if (Date.now() - pending.at < 10 * 60 * 1000) return;
    let rcpt = null;
    try { rcpt = await pc.getTransactionReceipt({ hash: pending.tx }); } catch { rcpt = null; }
    await store.kvRaw.delete(sentK);
    if (rcpt && rcpt.status === "success") return; // 成功していれば次 tick で snapInfo が現れ、ここには来なくなる
    console.warn(`[register] prop ${p.id}: 前回の登録 tx が${rcpt ? "revert" : "未採掘"}のため再試行します`);
  }

  // 1) 候補の列挙: GraphQL 側で正規 bot に絞る(攻撃者の巨大 discussion 提案は来ない = 64KiB DoS 対策)。
  //    small フィールドのみ。author が未設定の運用では自動登録しない(cfg で必須化済み)。
  const LIST = 100; // 一覧上限。これを超える bot 提案が該当する状況は異常なので、超過は一意性不明として保留する
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
  const all = data.proposals || [];
  const refs = all.filter((x) => referencesNounsProposal(x.discussion, p.id));
  if (!refs.length) return; // bot がまだ提案を作っていない — 次 tick に再確認
  if (all.length >= LIST && refs.length > 1) { // 一覧が上限に達し、かつ複数候補 = 範囲外に更なる候補がある恐れ
    await warnOnce(c, store, notify, `reglist:${p.id}`, 86400, `⚠️ Prop ${p.id}: bot の提案が多く、候補の一意性を確認できないため自動登録を保留しました。`);
    return;
  }

  // 2) 選別: single-choice・投票期間が現在有効で、残り時間が投函に必要な余裕を上回る
  const now = Date.now() / 1000;
  const minRemainSec = c.cronSec + c.submitBufferSec + 300; // 猶予明け後に投函・採掘できる最小残り時間
  const screened = refs.filter((x) =>
    x.type === "single-choice" &&
    Number(x.start) <= now && Number(x.end) - now > minRemainSec && Number(x.end) - Number(x.start) <= 8 * 86400);
  if (!screened.length) {
    await warnOnce(c, store, notify, `regscreen:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 ${refs.length} 件)。`);
    return;
  }

  // 3) オンチェーン本文から期待内容を再計算
  const desc = await nounsDescription(c, pc, store, p.id, p.creationBlock);
  if (desc === null) { console.warn(`[register] prop ${p.id}: オンチェーン本文を取得できず登録を見送り`); return; }
  const expected = buildProposal({ nounsId: p.id, description: desc });

  // 4) 候補を 1 件ずつ取得して完全一致を数える。取得失敗(64KiB 超過等)はその候補だけスキップし走査を続ける
  const matches = [];
  let skipped = 0;
  for (const cand of screened) {
    let x = null;
    try { x = (await hubGql(c, `{ proposal(id:"${cand.id}") { id title body discussion choices } }`))?.proposal; }
    catch (e) { skipped++; console.warn(`[register] prop ${p.id}: 候補 ${cand.id.slice(0, 12)} の取得に失敗(スキップ): ${(e.message || "").slice(0, 60)}`); continue; }
    if (!x) continue;
    if (x.title === expected.title && (x.discussion || "") === expected.discussion && (x.body || "") === expected.body && JSON.stringify(x.choices) === JSON.stringify(expected.choices)) matches.push(x.id);
  }
  if (skipped) await warnOnce(c, store, notify, `regskip:${p.id}`, 86400, `⚠️ Prop ${p.id}: 候補 ${skipped} 件を取得できず(サイズ超過など)検証をスキップしました。`);
  if (matches.length === 0) {
    await warnOnce(c, store, notify, `regmismatch:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。`);
    return;
  }
  if (matches.length > 1) {
    await warnOnce(c, store, notify, `regambig:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 内容が完全一致する Snapshot 提案が ${matches.length} 件あり、一意に決められないため自動登録を保留しました。`);
    return;
  }

  // 5) 登録(AlreadyRegistered は手動登録等との競合として静かに退く)
  try {
    const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [matches[0], BigInt(p.id)] });
    await store.kvRaw.put(sentK, JSON.stringify({ tx: hash, at: Date.now() }), { expirationTtl: 86400 * 3 }); // 提案期間以上(第19回監査: 1h では Worker 長時間停止で tx を見失う)
    await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。`, `Snapshot: ${matches[0]}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
  } catch (e) {
    if (revertErrorName(e) === "AlreadyRegistered") {
      // 実際に登録された対応(nounsToSnap)を読み戻し、期待した Snapshot 提案のハッシュと一致するか確認する。
      // 別 ID が割り込んで登録された場合は高優先度で警告して止める(静かに退かない)。
      const expectedHash = keccak256(stringToBytes(matches[0]));
      let got = null;
      try { got = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(p.id)] }); } catch {}
      if (got && got.toLowerCase() === expectedHash.toLowerCase()) { console.log(`[register] prop ${p.id}: 期待どおり登録済み(競合)`); return; }
      await warnOnce(c, store, notify, `regconflict:${p.id}`, 86400, `⚠️ Prop ${p.id}: 対応表が既に登録済みですが、登録されたハッシュ(${got ? String(got).slice(0, 14) : "取得失敗"}…)が期待した Snapshot 提案 ${matches[0].slice(0, 14)}… のハッシュ(${expectedHash.slice(0, 14)}…)と一致しません。誤登録の可能性 — 手動で確認してください。`);
      return;
    }
    await warnOnce(c, store, notify, `regerr:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 対応表の自動登録の送信に失敗しました(${(e.shortMessage || e.message || "").slice(0, 120)})。registrar の残高・RPC を確認してください。`);
  }
}
