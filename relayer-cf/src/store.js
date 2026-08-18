// KV ストア。競合を避けるため 1 票 = 1 キー(vote:{pid}:{voter})。
export function makeStore(kv) {
  const voteKey = (pid, voter) => `vote:${pid}:${voter.toLowerCase()}`;
  return {
    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec)); },
    async listVotes(pid) {
      const out = [];
      let cursor;
      do {
        const r = await kv.list({ prefix: `vote:${pid}:`, cursor });
        for (const k of r.keys) { const v = await kv.get(k.name, "json"); if (v) out.push({ voter: k.name.split(":")[2], ...v }); }
        cursor = r.list_complete ? undefined : r.cursor;
      } while (cursor);
      return out;
    },
    async getExecuted(pid) { return kv.get(`executed:${pid}`, "json"); },
    async putExecuted(pid, rec) { await kv.put(`executed:${pid}`, JSON.stringify(rec)); },
    async getAnnounced(pid) { return kv.get(`announced:${pid}`); },
    async putAnnounced(pid, v) { await kv.put(`announced:${pid}`, v); },
    async log(entry) { await kv.put(`log:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`, JSON.stringify(entry), { expirationTtl: 86400 * 90 }); },
    async lock(name, ttlSec) { // 簡易ロック(cron 多重起動防止)
      const k = `lock:${name}`;
      if (await kv.get(k)) return false;
      await kv.put(k, "1", { expirationTtl: ttlSec });
      return true;
    },
    async unlock(name) { await kv.delete(`lock:${name}`); },
  };
}
