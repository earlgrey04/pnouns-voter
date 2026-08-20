// B3 モード: Snapshot(本物のハブ)に投じられた投票署名を取得し、PNounsSnapVoter に送信する
import { cfg, clients, metagovInfo, tokensOf, METAGOV_ABI } from "./chain.js";
import { keccak256, stringToBytes } from "viem";

async function hubGql(c, query) {
  const r = await fetch(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  return j.data;
}

/// Snapshot スペースの直近提案と、オンチェーンの対応付け(snapToNouns)を突き合わせて {snapId → nounsId} を得る
export async function resolveMappings(c, pc, store) {
  const cached = (await store.kvRaw.get(`${store.prefix}snapmap`, "json")) || {};
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 15, orderBy: "created", orderDirection: desc) { id title } }`);
  const unknown = data.proposals.filter((p) => !(p.id in cached));
  if (unknown.length) {
    const res = await pc.multicall({ contracts: unknown.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })), allowFailure: false });
    let changed = false;
    unknown.forEach((p, i) => { const n = Number(res[i]); cached[p.id] = n; if (n) changed = true; });
    // 登録済み(nounsId>0)を見つけたときだけ KV に書く(未登録 0 はメモリ扱いにしたいが、簡便のためまとめて保存・上限 15 件)
    if (changed) await store.kvRaw.put(`${store.prefix}snapmap`, JSON.stringify(cached));
  }
  const titles = Object.fromEntries(data.proposals.map((p) => [p.id, p.title]));
  return { mappings: Object.entries(cached).filter(([, n]) => n > 0).map(([snapId, nounsId]) => ({ snapId, nounsId, title: titles[snapId] })), titles };
}

/// ハブから未反映の投票(新規 or やり直し)を取得して SnapVote 引数を組み立てる
export async function collectVotes(c, pc, snapId, nounsId, maxBatch) {
  const data = await hubGql(c, `{ votes(where:{proposal:"${snapId}"}, first: 100, orderBy: "created", orderDirection: asc) { voter ipfs created } }`);
  if (!data.votes.length) return { args: [], skipped: 0 };
  // オンチェーンの投票記録(voterRec)と比較し、新規 or より新しい timestamp のものだけ
  const recs = await pc.multicall({ contracts: data.votes.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
  const fresh = data.votes.filter((v, i) => { const r = recs[i]; return !r[0] || Number(v.created) > Number(r[3]); });
  const args = []; let skipped = 0;
  for (const v of fresh.slice(0, maxBatch)) {
    const tokenIds = await tokensOf(c, pc, v.voter);
    if (!tokenIds.length) { skipped++; continue; } // pNouns 未保有(集計対象外)
    const env = await (await fetch(`${c.ipfsGateway}/${v.ipfs}`)).json();
    const m = env.data.message;
    args.push({ from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds: tokenIds.map(BigInt) });
  }
  return { args, skipped };
}
