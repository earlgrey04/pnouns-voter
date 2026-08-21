// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
// 監査対応:
//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
import { METAGOV_ABI } from "./chain.js";
import { keccak256, stringToBytes, parseAbiItem } from "viem";

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
export async function hubGql(c, query, variables) {
  const body = variables ? { query, variables } : { query };
  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  if (!j.data) throw new Error("hub graphql: no data");
  return j.data;
}

/// ハブ上の投票者数(1 人 1 レコード)。締切時の「未反映の票が残っていないか」の最終確認に使う(第15回監査)
export async function snapshotVoterCount(c, snapId) {
  const d = await hubGql(c, `{ proposal(id:"${snapId}") { votes } }`);
  const n = Number(d?.proposal?.votes);
  if (!Number.isFinite(n)) throw new Error("hub: votes count shape");
  return n;
}

/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
// 仕様上の割り切り(第13回監査で文書化): URL 直後の非 ASCII(日本語など)は「後置の文」とみなして
// 除去するため、"…/vote/989偽" は 989 への参照として受理される(緩い側)。この照合は
// 「取り違え事故の検出」が目的の補助チェックであり、厳密な誤登録防止は猶予+取消+公開が担う。
// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
export function referencesNounsProposal(text, nounsId) {
  const id = Number(nounsId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const s = String(text || "");
  if (!s) return false;
  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
    let u;
    try { u = new URL(trimmed); } catch { continue; }
    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
  }
  return false;
}

export async function resolveMappings(c, pc, activeNounsIds = []) {
  // 直近提案は id のみ取得(title/discussion を一括で取ると 64KiB 応答上限に達し tick 全体が
  // fail-closed するため。第24回監査)。title/end/discussion は確定した snapId ごとに個別照会する。
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id } }`);
  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
  const meta = new Map();
  const found = new Map(); // nounsId -> snapId
  if (data.proposals.length) {
    const res = await pc.multicall({
      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
      allowFailure: false,
    });
    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
  }
  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
  if (missing.length) {
    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    const need = [];
    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    // 第24回監査: 200 件一括取得(64KiB 応答上限に達すると tick 全体が fail-closed)を廃止し、
    // ProposalRegistered イベント(nounsProposalId は indexed)から確定 snapId を復元して個別照会する。
    const ev = parseAbiItem("event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal)");
    for (const n of need) {
      let snapId = null;
      try {
        const logs = await pc.getLogs({ address: c.metagov, event: ev, args: { nounsProposalId: BigInt(n.id) }, fromBlock: c.deployBlock || 0n, toBlock: "latest" });
        // 最新の登録イベントを採用し、現在の対応表ハッシュと一致するものだけを信頼する(再登録に追従)
        for (let i = logs.length - 1; i >= 0; i--) {
          const cand = logs[i].args.snapshotProposal;
          if (cand && keccak256(stringToBytes(cand)) === n.hash) { snapId = cand; break; }
        }
      } catch (e) { console.warn(`[snap] prop ${n.id}: ProposalRegistered ログ取得に失敗: ${(e.message || "").slice(0, 80)}`); }
      if (!snapId) { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応表の登録イベントから Snapshot ID を復元できません`); continue; }
      // 確定した snapId の title/end/discussion を個別に取得(1 件なので 64KiB を超えない)
      try {
        const d = await hubGql(c, `query($id:String!){ proposal(id:$id) { id title end discussion } }`, { id: snapId });
        const pr = d?.proposal;
        if (pr) { found.set(n.id, snapId); meta.set(snapId, pr); }
        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: Snapshot 提案 ${snapId} をハブで取得できません`); }
      } catch (e) { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: Snapshot 提案の個別取得に失敗: ${(e.message || "").slice(0, 80)}`); }
    }
  }
  // 直近20件由来の found について、まだ meta が無い snapId を個別照会(1 件ずつなので 64KiB を超えない)
  for (const snapId of new Set(found.values())) {
    if (meta.has(snapId)) continue;
    try {
      const d = await hubGql(c, `query($id:String!){ proposal(id:$id) { id title end discussion } }`, { id: snapId });
      if (d?.proposal) meta.set(snapId, d.proposal);
    } catch (e) { console.warn(`[snap] snap ${snapId.slice(0, 12)} の個別取得に失敗: ${(e.message || "").slice(0, 60)}`); }
  }
  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    const m = meta.get(snapId) || {};
    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
    const linkOk = referencesNounsProposal(m.discussion, nounsId);
    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
  });
  return { mappings, unresolved };
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
