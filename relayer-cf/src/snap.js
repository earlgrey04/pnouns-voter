// B3 モード: Snapshot(本物のハブ)に投じられた投票署名を取得し、PNounsSnapVoter に送信する
// 監査対応: M01(0 値を KV に保存しない) / M02(cursor + ページング) / M06(ハブ/IPFS の防御的取得・照合・ゲートウェイ冗長化)
import { cfg, clients, metagovInfo, tokensOf, METAGOV_ABI } from "./chain.js";
import { keccak256, stringToBytes } from "viem";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY = 64 * 1024;

async function fetchJson(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX_BODY) throw new Error("body too large");
    const text = await r.text();
    if (text.length > MAX_BODY) throw new Error("body too large");
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}
async function hubGql(c, query) {
  const j = await fetchJson(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  if (!j.data) throw new Error("hub graphql: no data");
  return j.data;
}

/// IPFS からエンベロープを取得(ゲートウェイ冗長化)し、GraphQL 行と照合する。失敗は null(次 tick 再試行)
const cidFails = new Map(); // メモリ内 backoff
async function fetchEnvelope(c, row, snapId) {
  if ((cidFails.get(row.ipfs) || 0) >= 5) return { giveUp: true }; // 恒久的に壊れた CID は諦めて先へ
  for (const gw of [c.ipfsGateway, "https://ipfs.io/ipfs"]) {
    try {
      const env = await fetchJson(`${gw}/${row.ipfs}`);
      const m = env?.data?.message;
      if (!m || typeof env.sig !== "string" || !/^0x[0-9a-fA-F]+$/.test(env.sig)) throw new Error("bad envelope shape");
      // GraphQL 行との照合(改ざん・取り違えの検出。最終的な真正性はコントラクトの署名検証が保証)
      if (String(m.from).toLowerCase() !== String(row.voter).toLowerCase()) throw new Error("envelope voter mismatch");
      if (m.proposal !== snapId) throw new Error("envelope proposal mismatch");
      if (Number(m.timestamp) !== Number(row.created)) throw new Error("envelope timestamp mismatch");
      cidFails.delete(row.ipfs);
      return { env };
    } catch (e) { /* 次のゲートウェイへ */ }
  }
  cidFails.set(row.ipfs, (cidFails.get(row.ipfs) || 0) + 1);
  return null;
}

/// Snapshot スペースの直近提案と、オンチェーンの対応付け(snapToNouns)を突き合わせて {snapId → {nounsId,end,title}} を得る
/// M01: 正の対応だけ KV に保存。未登録(0)は保存せず毎 tick 再照会する
export async function resolveMappings(c, pc, store) {
  const cached = (await store.kvRaw.get(`${store.prefix}snapmap`, "json")) || {};
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 15, orderBy: "created", orderDirection: desc) { id title end } }`);
  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
  const unknown = data.proposals.filter((p) => !(p.id in cached));
  if (unknown.length) {
    const res = await pc.multicall({ contracts: unknown.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })), allowFailure: false });
    let changed = false;
    unknown.forEach((p, i) => { const n = Number(res[i]); if (n > 0) { cached[p.id] = n; changed = true; } });
    if (changed) await store.kvRaw.put(`${store.prefix}snapmap`, JSON.stringify(cached));
  }
  const meta = Object.fromEntries(data.proposals.map((p) => [p.id, p]));
  return { mappings: Object.entries(cached).map(([snapId, nounsId]) => ({ snapId, nounsId, title: meta[snapId]?.title, snapEnd: Number(meta[snapId]?.end || 0) })) };
}

/// M02: cursor(created_gt) + ページングで未反映の投票を取得。cursor は呼び出し側が採掘確定後に進める
export async function collectVotes(c, pc, store, snapId, nounsId, limit) {
  const cursorKey = `${store.prefix}snapcursor:${nounsId}`;
  const cursor = Number(await store.kvRaw.get(cursorKey)) || 0;
  let rows = [];
  for (let page = 0; page < 3; page++) {
    const d = await hubGql(c, `{ votes(where:{proposal:"${snapId}", created_gt:${cursor}}, first: 100, skip: ${page * 100}, orderBy: "created", orderDirection: asc) { voter ipfs choice created } }`);
    if (!Array.isArray(d.votes)) throw new Error("hub: votes shape");
    rows.push(...d.votes);
    if (d.votes.length < 100) break;
  }
  if (!rows.length) return { args: [], advanceNow: 0, submittedMax: 0 };
  // オンチェーンの投票記録と比較
  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
  const args = []; let advanceNow = cursor; let submittedMax = 0;
  for (let i = 0; i < rows.length && args.length < limit; i++) {
    const v = rows[i]; const r = recs[i]; // [exists, support, counted, timestamp, digest]
    const tokenIds = await tokensOf(c, pc, v.voter);
    const needSupplement = r[0] && Number(r[3]) === Number(v.created) && tokenIds.length > Number(r[2]);
    const isNew = !r[0] || Number(v.created) > Number(r[3]);
    if (!isNew && !needSupplement) { advanceNow = Math.max(advanceNow, Number(v.created)); continue; } // 反映済み → cursor を進めてよい
    if (!tokenIds.length) { advanceNow = Math.max(advanceNow, Number(v.created)); continue; } // pNouns 未保有 → 集計対象外
    const got = await fetchEnvelope(c, v, snapId);
    if (!got) { break; } // 一時失敗 → この票以降は次 tick に再試行(順序維持のためここで打ち切り)
    if (got.giveUp) { advanceNow = Math.max(advanceNow, Number(v.created)); console.warn(`[snap] give up CID ${v.ipfs}`); continue; }
    const m = got.env.data.message;
    args.push({ from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: got.env.sig, tokenIds: tokenIds.map(BigInt) });
    submittedMax = Math.max(submittedMax, Number(v.created));
  }
  return { args, advanceNow, submittedMax };
}
export async function setCursor(store, nounsId, value) {
  const key = `${store.prefix}snapcursor:${nounsId}`;
  const cur = Number(await store.kvRaw.get(key)) || 0;
  if (value > cur) await store.kvRaw.put(key, String(value));
}
