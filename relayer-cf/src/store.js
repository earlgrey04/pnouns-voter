// KV ストア(Cloudflare 無料枠: 書込み 1,000/日、list 1,000/日、読取 100,000/日、1 呼び出し 1,000 操作)
//  - 全キーは "<chainId>:<voter>:" で名前空間化(コントラクト再デプロイで混ざらない)
//  - 票: vote:{pid}:{voter}。値=本文(署名)、metadata=要約。一覧は list の metadata だけで作る(get は投函対象 ≤ MAX_BATCH 件のみ)
//  - サマリー sum:{pid}: ワーカーが list 結果から書く(listedAt 付き)。公開 API は get のみ
//  - dirty:{pid}: API が署名受付時に受付時刻を書く。ワーカーは「dirty > 前回 listedAt」なら再 list(削除しないので競合しない)
//  - inflight キーは持たない: 送信中は sum の txStatus:"sent" / executed.pending から毎 tick 検出
export function makeStore(kv, ns) {
  const P = ns ? `${ns}:` : "";
  const voteKey = (pid, voter) => `${P}vote:${pid}:${voter.toLowerCase()}`;
  // metadata は受付時の不変情報だけ(support/枚数/受付時刻)。投函状態(tx/txStatus/dropped/sentAt)は sum:{pid} だけが持つ(書込み削減・競合回避)
  const meta = (rec) => ({ s: rec.support, n: rec.tokenIds.length, at: rec.receivedAt });
  const fromMeta = (voter, m) => ({ voter, support: m.s, tokenCount: m.n, receivedAt: m.at });
  return {
    kvRaw: kv, prefix: P,
    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec), { metadata: meta(rec) }); },
    /// list(metadata のみ、get なし)。ワーカー専用
    async listVoteSummaries(pid) {
      const out = []; let cursor;
      do {
        const r = await kv.list({ prefix: `${P}vote:${pid}:`, cursor });
        for (const k of r.keys) if (k.metadata) out.push(fromMeta(k.name.split(":").pop(), k.metadata));
        cursor = r.list_complete ? undefined : r.cursor;
      } while (cursor);
      return out;
    },
    summarize(voter, rec) { return fromMeta(voter, meta(rec)); },
    /// list 結果(新規 voter を含む)と既存サマリー(状態を含む)をマージ
    mergeSummaries(listed, existing) {
      const byVoter = new Map(existing.map((v) => [v.voter.toLowerCase(), v]));
      return listed.map((l) => { const e = byVoter.get(l.voter.toLowerCase()); return e ? { ...l, tx: e.tx, txStatus: e.txStatus, dropped: e.dropped, sentAt: e.sentAt } : l; });
    },
    async getSummary(pid) { return (await kv.get(`${P}sum:${pid}`, "json")) || { listedAt: 0, votes: [] }; },
    async putSummary(pid, votes, listedAt) { await kv.put(`${P}sum:${pid}`, JSON.stringify({ listedAt, votes })); },
    async markDirty(pid) { await kv.put(`${P}dirty:${pid}`, String(Date.now()), { expirationTtl: 86400 * 7 }); },
    async dirtyAt(pid) { return Number(await kv.get(`${P}dirty:${pid}`)) || 0; },
    async getExecuted(pid) { return kv.get(`${P}executed:${pid}`, "json"); },
    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`${P}executed:${pid}`); await kv.put(`${P}executed:${pid}`, JSON.stringify(rec)); },
    async getAnnounced(pid) { return kv.get(`${P}announced:${pid}`); },
    async putAnnounced(pid, v) { await kv.put(`${P}announced:${pid}`, v); },
    async getFlag(k) { return kv.get(`${P}flag:${k}`); },
    async setFlag(k, ttl) { await kv.put(`${P}flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
  };
}
