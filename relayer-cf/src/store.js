// KV ストア — Cloudflare 無料枠(書込み 1,000/日、list 1,000/日、読取 100,000/日、サブリクエスト 50/呼び出し)に収める設計
//  - 票: vote:{pid}:{voter}(本文)。list は **ワーカーだけ** が、しかも dirty フラグが立っている提案だけ実行する
//  - 集計サマリー: sum:{pid}(単一 JSON、ワーカーが list 結果から生成)。公開 API は get だけで応答する
//  - dirty:{pid}: API が署名を受け付けたときに立てる(1 write)。ワーカーが list 後に消す
//  - inflight: 送信中 tx を持つ提案 ID の集合(単一キー、ワーカーが tick 末尾に 1 回だけ書く)
export function makeStore(kv) {
  const voteKey = (pid, voter) => `vote:${pid}:${voter.toLowerCase()}`;
  const summarize = (voter, rec) => ({ voter, support: rec.support, tokenCount: rec.tokenIds.length, tx: rec.tx || undefined, txStatus: rec.txStatus || undefined, dropped: rec.dropped ? true : undefined, receivedAt: rec.receivedAt, sentAt: rec.sentAt || undefined });
  return {
    kvRaw: kv,
    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec)); },
    /// list(高コスト)。ワーカー専用
    async listVotesFull(pid) {
      const out = []; let cursor;
      do {
        const r = await kv.list({ prefix: `vote:${pid}:`, cursor });
        for (const k of r.keys) { const v = await kv.get(k.name, "json"); if (v) out.push({ voter: k.name.split(":")[2], ...v }); }
        cursor = r.list_complete ? undefined : r.cursor;
      } while (cursor);
      return out;
    },
    summarize,
    async getSummary(pid) { return (await kv.get(`sum:${pid}`, "json")) || []; },
    async putSummary(pid, list) { await kv.put(`sum:${pid}`, JSON.stringify(list)); },
    async markDirty(pid) { await kv.put(`dirty:${pid}`, "1", { expirationTtl: 86400 * 7 }); },
    async isDirty(pid) { return !!(await kv.get(`dirty:${pid}`)); },
    async clearDirty(pid) { await kv.delete(`dirty:${pid}`); },
    async getExecuted(pid) { return kv.get(`executed:${pid}`, "json"); },
    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`executed:${pid}`); await kv.put(`executed:${pid}`, JSON.stringify(rec)); },
    async getAnnounced(pid) { return kv.get(`announced:${pid}`); },
    async putAnnounced(pid, v) { await kv.put(`announced:${pid}`, v); },
    async getInflight() { return (await kv.get("inflight", "json")) || []; },
    async putInflight(list) { await kv.put("inflight", JSON.stringify(list)); },
    async getFlag(k) { return kv.get(`flag:${k}`); },
    async setFlag(k, ttl) { await kv.put(`flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
  };
}
