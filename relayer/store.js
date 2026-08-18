// 署名の保管(JSON ファイル)。votes[proposalId][voter] = {support, tokenIds, signature, receivedAt, tx?, error?}
const fs = require("fs");
const path = require("path");
const cfg = require("./config");
const FILE = path.join(cfg.dataDir, "votes.json");
function load() {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  if (!fs.existsSync(FILE)) return { votes: {}, executed: {}, log: [] };
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
function save(db) {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}
function addVote(db, proposalId, voter, rec) {
  db.votes[proposalId] ||= {};
  db.votes[proposalId][voter.toLowerCase()] = { ...rec, receivedAt: new Date().toISOString() };
  db.log.push({ at: new Date().toISOString(), type: "vote", proposalId, voter, support: rec.support, tokenIds: rec.tokenIds });
  save(db);
}
function pendingVotes(db, proposalId) {
  return Object.entries(db.votes[proposalId] || {}).filter(([, v]) => !v.tx && !v.dropped).map(([voter, v]) => ({ voter, ...v }));
}
module.exports = { load, save, addVote, pendingVotes, FILE };
