// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
// 監査対応:
//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
import { METAGOV_ABI } from "./chain.js";
import { keccak256, stringToBytes } from "viem";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY = 64 * 1024;
const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り

async function fetchLimited(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const reader = r.body?.getReader();
    if (!reader) throw new Error("no body");
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
      chunks.push(value);
    }
    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
    return JSON.parse(new TextDecoder().decode(buf));
  } finally { clearTimeout(t); }
}
async function hubGql(c, query) {
  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  if (!j.data) throw new Error("hub graphql: no data");
  return j.data;
}

/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
export function referencesNounsProposal(text, nounsId) {
  const id = Number(nounsId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const s = String(text || "");
  if (!s) return false;
  for (const raw of s.match(/https?:\/\/[^\s<>"'`)\]]+/gi) || []) {
    let u;
    try { u = new URL(raw); } catch { continue; }
    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
  }
  return false;
}

export async function resolveMappings(c, pc, activeNounsIds = []) {
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
  const meta = new Map(data.proposals.map((p) => [p.id, p]));
  const found = new Map(); // nounsId -> snapId
  if (data.proposals.length) {
    const res = await pc.multicall({
      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
      allowFailure: false,
    });
    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
  }
  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
  if (missing.length) {
    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    const need = [];
    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    if (need.length) {
      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
      for (const n of need) {
        const p = byHash.get(n.hash);
        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
        else console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`);
      }
    }
  }
  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    const m = meta.get(snapId) || {};
    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
    // 侵害)は検出できない。過信しないこと。
    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
  });
  return { mappings };
}

/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
  const send = []; const skipped = [];
  let advance = cursor; let blocked = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const rec = recs[i];
    const created = Number(r.created);
    const tokens = tokenCounts[i] ?? 0;
    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
    const exists = !!rec[0];
    const recTs = Number(rec[3] ?? 0);
    const isNew = !exists || created > recTs;
    const needSupplement = exists && created === recTs && uncounted > 0;
    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
    if (isSkippable) {
      if (tokens === 0 || deadLetters.has(r.ipfs)) skipped.push(r);
      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
      continue;
    }
    blocked = true; // これ以降は cursor を進めない
    if (send.length < limit) send.push({ row: r, index: i });
  }
  return { send, skipped, advance, blocked };
}

/// IPFS からエンベロープを取得(ゲートウェイ冗長化 + GraphQL 行との照合)
export async function fetchEnvelope(c, row, snapId) {
  for (const gw of [c.ipfsGateway, "https://ipfs.io/ipfs", "https://cloudflare-ipfs.com/ipfs"]) {
    try {
      const env = await fetchLimited(`${gw}/${row.ipfs}`);
      const m = env?.data?.message;
      if (!m || typeof env.sig !== "string" || !/^0x[0-9a-fA-F]{2,600}$/.test(env.sig)) throw new Error("bad envelope shape");
      if (String(m.from).toLowerCase() !== String(row.voter).toLowerCase()) throw new Error("voter mismatch");
      if (m.proposal !== snapId) throw new Error("proposal mismatch");
      if (Number(m.timestamp) !== Number(row.created)) throw new Error("timestamp mismatch");
      return env;
    } catch (e) { /* 次のゲートウェイ */ }
  }
  return null;
}

/// ハブの投票を固定幅の window で取得する。
/// timestamp cursor は同一秒の大量投稿を一意に走査できないため使わず、KV に保存した skip offset を
/// 複数 tick で進め、末尾まで到達したら 0 に戻して全体を再走査する。途中で行が追加・削除されても、
/// 次の周回で on-chain voterRec と突き合わせるため恒久的な取りこぼしにはならない。
export const PAGE_SIZE = 100;
export const PAGES_PER_TICK = 3;
export async function fetchRows(c, snapId, offset = 0) {
  const rows = [];
  for (let page = 0; page < PAGES_PER_TICK; page++) {
    const skip = offset + page * PAGE_SIZE;
    const d = await hubGql(c, `{ votes(where:{proposal:"${snapId}"}, first: ${PAGE_SIZE}, skip: ${skip}, orderBy: "created", orderDirection: asc) { voter ipfs choice created } }`);
    if (!Array.isArray(d.votes)) throw new Error("hub: votes shape");
    rows.push(...d.votes);
    if (d.votes.length < PAGE_SIZE) return { rows, nextOffset: 0, wrapped: true };
  }
  return { rows, nextOffset: offset + rows.length, wrapped: false };
}

/// 補完判定に必要な tokenId を重複排除する。hasTokenVoted は proposalId/tokenId のみで決まり、
/// 同じ投票者の複数行ごとに再照会する必要はない。
export function supplementCheckPlan(rows, recs, tokensByRow) {
  const rowIndexes = [];
  const unique = new Set();
  rows.forEach((r, i) => {
    if (!recs[i]?.[0] || Number(r.created) !== Number(recs[i]?.[3] ?? 0) || !tokensByRow[i]?.length) return;
    rowIndexes.push(i);
    for (const id of tokensByRow[i]) unique.add(Number(id));
  });
  return { rowIndexes, tokenIds: [...unique].sort((a, b) => a - b) };
}

/// 同じ voter の候補を 1 バッチに複数入れると、個別 simulate は成功しても組合せで
/// StaleVote になりうる。voter ごとに created が新しく、同値なら CID が大きい 1 行へ正規化する。
export function uniqueVoterCandidates(send, limit) {
  const byVoter = new Map();
  for (const item of send) {
    const key = item.row.voter.toLowerCase();
    const prev = byVoter.get(key);
    if (!prev || Number(item.row.created) > Number(prev.row.created)
      || (Number(item.row.created) === Number(prev.row.created) && String(item.row.ipfs) > String(prev.row.ipfs))) byVoter.set(key, item);
  }
  return [...byVoter.values()].sort((a, b) => Number(a.row.created) - Number(b.row.created) || String(a.row.ipfs).localeCompare(String(b.row.ipfs))).slice(0, limit);
}

export const scanKey = (store, nounsId, snapId) => `${store.prefix}snapscan:${nounsId}:${snapId}`;
export const deadKey = (store, nounsId) => `${store.prefix}snapdead:${nounsId}`;
export const failKey = (store, nounsId) => `${store.prefix}snapfail:${nounsId}`;
