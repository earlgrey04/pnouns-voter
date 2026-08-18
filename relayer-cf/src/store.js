// KV ストア(Cloudflare 無料枠: 書込み 1,000/日、読取 100,000/日、サブリクエスト 50/呼び出し を意識)
//  - 1 票 = 1 キー(vote:{pid}:{voter})。値に全レコード、metadata に要約(support/枚数/状態)を持ち、一覧は list の metadata だけで済ませる
//  - 書込みは「署名受付・投函・確定・execute・告知」などイベント時のみ。ロックやキャッシュには KV を使わない
export function makeStore(kv) {
  const voteKey = (pid, voter) => `vote:${pid}:${voter.toLowerCase()}`;
  const meta = (rec) => ({ s: rec.support, n: rec.tokenIds.length, tx: rec.tx || null, st: rec.txStatus || null, d: rec.dropped ? 1 : 0, at: rec.receivedAt, sa: rec.sentAt || null });
  return {
    kvRaw: kv,
    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec), { metadata: meta(rec) }); },
    /// metadata ベースの一覧(読取 1 回)。full=true のときだけ本文(署名)を取りに行く(pending 分だけ)
    async listVotes(pid, { full = false, onlyPending = false } = {}) {
      const out = [];
      let cursor;
      do {
        const r = await kv.list({ prefix: `vote:${pid}:`, cursor });
        for (const k of r.keys) {
          const m = k.metadata || {};
          const summary = { voter: k.name.split(":")[2], support: m.s, tokenCount: m.n, tx: m.tx || undefined, txStatus: m.st || undefined, dropped: m.d ? true : undefined, receivedAt: m.at, sentAt: m.sa || undefined };
          if (onlyPending && (summary.tx || summary.dropped)) continue;
          out.push(summary);
        }
        cursor = r.list_complete ? undefined : r.cursor;
      } while (cursor);
      if (!full) return out;
      // 本文が必要なものだけ取得
      const fulls = [];
      for (const s of out) { const v = await kv.get(voteKey(pid, s.voter), "json"); if (v) fulls.push({ voter: s.voter, ...v }); }
      return fulls;
    },
    async getExecuted(pid) { return kv.get(`executed:${pid}`, "json"); },
    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`executed:${pid}`); await kv.put(`executed:${pid}`, JSON.stringify(rec)); },
    async getAnnounced(pid) { return kv.get(`announced:${pid}`); },
    async putAnnounced(pid, v) { await kv.put(`announced:${pid}`, v); },
    async log(entry) { await kv.put(`log:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`, JSON.stringify(entry), { expirationTtl: 86400 * 90 }); },
    // 送信中(未確定)の tx を持つ提案 ID の集合(1 キー)。状態に関係なく次回 tick で確定処理するため
    async getInflight() { return (await kv.get("inflight", "json")) || []; },
    async addInflight(pid) { const cur = await this.getInflight(); if (!cur.includes(String(pid))) await kv.put("inflight", JSON.stringify([...cur, String(pid)])); },
    async removeInflight(pid) { const cur = await this.getInflight(); if (cur.includes(String(pid))) await kv.put("inflight", JSON.stringify(cur.filter((x) => x !== String(pid)))); },
    async getFlag(k) { return kv.get(`flag:${k}`); },
    async setFlag(k, ttl) { await kv.put(`flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
    async clearFlag(k) { await kv.delete(`flag:${k}`); },
  };
}
