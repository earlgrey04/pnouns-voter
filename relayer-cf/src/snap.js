// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
// 監査対応:
//  H04 — cursor は「オンチェーンの voterRec が真実」という前提で保守的に進める。
//        取得は created_gte(境界の秒を含む)。未解決の票より先には絶対に進めない。
//        同一秒に何票あっても、オンチェーン状態でしか「済み」と判定しないので取りこぼさない。
//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では cursor を進めず、
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
export async function resolveMappings(c, pc, activeNounsIds = []) {
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end } }`);
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
      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end } }`);
      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
      for (const n of need) {
        const p = byHash.get(n.hash);
        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
        else console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`);
      }
    }
  }
  const mappings = [...found.entries()].map(([nounsId, snapId]) => ({ snapId, nounsId, title: meta.get(snapId)?.title, snapEnd: Number(meta.get(snapId)?.end || 0) }));
  return { mappings };
}

/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0, complete = true }) {
  const send = []; const skipped = [];
  let advance = cursor; let blocked = !complete; // 指摘1: 読み切れていないなら cursor を一切進めない
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

/// ハブから未反映の投票を取得する(cursor は境界の秒を含めて取得 = 取りこぼさない)。
/// 指摘1: ページを読み切れなかった場合(同一秒に大量の票がある等)は complete=false を返し、
///        呼び出し側は cursor を進めない(進めると 301 件目以降へ到達できなくなるため)。
export const MAX_PAGES = 6; // 100 件 × 6 = 600 件/tick
export async function fetchRows(c, snapId, cursor) {
  const rows = [];
  let complete = true;
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await hubGql(c, `{ votes(where:{proposal:"${snapId}", created_gte:${cursor}}, first: 100, skip: ${page * 100}, orderBy: "created", orderDirection: asc) { voter ipfs choice created } }`);
    if (!Array.isArray(d.votes)) throw new Error("hub: votes shape");
    rows.push(...d.votes);
    if (d.votes.length < 100) break;
    if (page === MAX_PAGES - 1) complete = false; // 最終ページも満杯 = 読み切れていない
  }
  return { rows, complete };
}

export const cursorKey = (store, nounsId) => `${store.prefix}snapcursor:${nounsId}`;
export const deadKey = (store, nounsId) => `${store.prefix}snapdead:${nounsId}`;
export const failKey = (store, nounsId) => `${store.prefix}snapfail:${nounsId}`;
