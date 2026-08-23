const $ = (s) => document.querySelector(s);
let CONFIG = null, account = null, tokensCache = {};
// --- ウォレット選択(EIP-6963)。複数拡張(MetaMask / Coinbase / Rabby 等)があるとき window.ethereum は 1 つに占有されるため、
//     announce されたプロバイダー一覧から選ばせ、選択(rdns)を記憶する。
const providers = new Map(); // rdns -> { info, provider }
let selectedProvider = null;
window.addEventListener("eip6963:announceProvider", (ev) => { const { info, provider } = ev.detail; const key = `${info.rdns}|${info.uuid || ""}`; if (!providers.has(key)) providers.set(key, { info: { ...info, key }, provider }); }); // M-08: rdns は自己申告なので uuid も含めて識別
window.dispatchEvent(new Event("eip6963:requestProvider"));
function providerList() {
  const list = [...providers.values()];
  if (!list.length && window.ethereum) {
    const arr = window.ethereum.providers || [window.ethereum];
    arr.forEach((p, i) => list.push({ info: { rdns: "legacy" + i, name: p.isMetaMask ? "MetaMask" : p.isCoinbaseWallet ? "Coinbase Wallet" : p.isRabby ? "Rabby" : "ウォレット " + (i + 1), icon: "" }, provider: p }));
  }
  return list;
}
function chooseProvider(silent) {
  const list = providerList();
  if (!list.length) return null;
  const remembered = localStorage.getItem("pnouns-voter-wallet");
  const hit = list.find((x) => (x.info.key || x.info.rdns) === remembered);
  if (hit) return hit;
  if (list.length === 1) return list[0];
  if (silent) return null;
  return new Promise((resolve) => {
    const box = document.createElement("div");
    box.className = "card";
    box.style.cssText = "position:fixed;top:70px;right:20px;z-index:10;box-shadow:0 8px 30px rgba(0,0,0,.15);min-width:240px";
    box.innerHTML = `<div style="font-weight:600;margin-bottom:8px">接続するウォレットを選択</div>` +
      list.map((x, i) => `<button data-i="${i}" style="display:flex;align-items:center;gap:8px;width:100%;margin:4px 0;text-align:left">${safeIcon(x.info.icon) ? `<img src="${escapeHtml(x.info.icon)}" width="20" height="20" alt="">` : ""}${escapeHtml(x.info.name)}</button>`).join("") +
      `<button data-i="-1" style="width:100%;margin-top:6px;color:var(--muted)">キャンセル</button>`;
    document.body.appendChild(box);
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { box.remove(); const i = Number(b.dataset.i); resolve(i >= 0 ? list[i] : null); }));
  });
}
const SUPPORT = { 0: "反対", 1: "賛成", 2: "棄権" };
async function api(path, opt) { const r = await fetch(path, opt); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); return j; }
function msg(t, err) { $("#msg").textContent = t; $("#msg").className = err ? "err" : "muted"; }
const eth = () => selectedProvider || window.ethereum;

async function ensureChain() {
  const chainHex = "0x" + CONFIG.chainId.toString(16);
  const cur = await eth().request({ method: "eth_chainId" });
  if (cur === chainHex) return true;
  try { await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] }); return true; }
  catch (e) { msg(`ウォレットのネットワークを ${CONFIG.network} (chainId ${CONFIG.chainId}) に切り替えてください`, true); return false; }
}
function setAccount(a) {
  account = a || null;
  $("#addr").textContent = account ? account.slice(0, 6) + "…" + account.slice(-4) : "";
  $("#connect").style.display = account ? "none" : "";
  $("#disconnect").style.display = account ? "" : "none";
  localStorage.setItem("pnouns-voter-connected", account ? "1" : "");
}
async function connect(silent) {
  const chosen = await chooseProvider(silent);
  if (chosen) { selectedProvider = chosen.provider; localStorage.setItem("pnouns-voter-wallet", chosen.info.key || chosen.info.rdns); bindProviderEvents(); }
  else if (!silent) { if (!providerList().length) msg("MetaMask 等のウォレット拡張が見つかりません", true); return; }
  if (!eth()) return;
  // silent: 既に承認済みの接続を無プロンプトで復元(eth_accounts)。手動: eth_requestAccounts
  const accs = await eth().request({ method: silent ? "eth_accounts" : "eth_requestAccounts" });
  if (!accs || !accs.length) return;
  setAccount(accs[0]);
  if (!(await ensureChain())) return;
  await render();
}
async function disconnect() {
  try { await eth().request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch (e) { /* 未対応ウォレットはローカル状態のみ解除 */ }
  localStorage.removeItem("pnouns-voter-wallet"); // 次回は選び直せる
  selectedProvider = null;
  setAccount(null);
  await render();
  msg("ウォレットの接続を解除しました。");
}

async function render() {
  const { block, proposals: all } = await api("/api/proposals?closed=8");
  const proposals = all.filter((p) => p.votable);
  const closed = all.filter((p) => !p.votable);
  const snapMode = CONFIG.snapshotSpace;
  const root = $("#proposals");
  root.innerHTML = "";
  if (!proposals.length) root.innerHTML = `<div class="card">現在、投票受付中の Nouns 提案はありません。(block ${block})</div>`;
  for (const p of proposals) {
    const mg = p.metagov;
    const blocksLeft = (mg.acceptDeadline || mg.deadline) - block; // 署名受付の残り
    if (snapMode && !p.snapshotProposalId) {
      // 対応表未登録の議案は集計対象外なのでカードにしない(開始直後なら自動作成待ち・時間不足なら対象外)
      const d = document.createElement("div"); d.className = "muted"; d.style.margin = "6px 2px";
      d.innerHTML = `Prop ${p.id} ${escapeHtml(p.title)} — この仕組みでは未登録(Nouns: ${p.stateName}。投票開始直後は数十分以内に自動作成されます。投票期間の残りが足りない議案は対象外) <a href="https://nouns.wtf/vote/${p.id}" target="_blank" rel="noopener">nouns.wtf</a>`;
      root.appendChild(d); continue;
    }
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div><b>Prop ${p.id}</b> ${escapeHtml(p.title)}</div>
        <span class="badge ${p.votable ? "active" : ""}">${p.votable ? "受付中" : "締切"} / Nouns: ${p.stateName}</span>
      </div>
      <div class="muted">${snapMode ? "投票締切(オンチェーン反映)" : "署名受付締切"}: block ${mg.acceptDeadline || mg.deadline}(残り約 ${blocksLeft > 0 ? Math.round(blocksLeft * 12 / 60) : 0} 分, ${blocksLeft} ブロック)${snapMode ? "" : ` ・ オンチェーン締切: block ${mg.deadline}(この間は自分で投函する場合のみ可)`} ・ 投函待ち署名 ${p.pendingSignatures} 件 ・ 投函済み ${p.submittedVoters} 名 ・ pNouns Voter の Nouns 投票力 ${mg.metagovVotes}
        <a href="https://nouns.wtf/vote/${p.id}" target="_blank" rel="noopener">nouns.wtf</a></div>
      <div class="tally">
        <div class="for">賛成 ${mg.tokens[1]} <small>(${mg.voters[1]}名)</small></div>
        <div class="against">反対 ${mg.tokens[0]} <small>(${mg.voters[0]}名)</small></div>
        <div class="abstain">棄権 ${mg.tokens[2]} <small>(${mg.voters[2]}名)</small></div>
      </div>
      ${snapMode ? "" : (p.pendingSignatures ? `<div class="row" style="margin-top:6px"><button class="submitall" data-p="${p.id}">投函待ちの署名 ${p.pendingSignatures} 件を自分で投函する(誰でも可・ガス自己負担)</button><a class="muted" href="/api/signatures/${p.id}" target="_blank">署名一覧(公開)</a></div>` : `<div class="muted"><a href="/api/signatures/${p.id}" target="_blank">署名一覧(公開)</a></div>`)}
      <div class="muted">現時点の判定: <b>${mg.executed ? "確定 → " : ""}${mg.tokens[0] + mg.tokens[1] + mg.tokens[2] ? SUPPORT[mg.result] : "投票なし(このままなら Nouns DAO には投票しません)"}</b>${mg.executed ? "(Nouns DAO に投票済み)" : ""}</div>
      <div id="my-${p.id}"></div>`;
    root.appendChild(el);
    el.querySelectorAll("button.submitall").forEach((b) => b.addEventListener("click", () => manualSubmit(Number(b.dataset.p))));
    if (snapMode && p.votable) {
      const d = document.createElement("div"); d.className = "muted";
      if (p.snapshotProposalId) {
        const url = `https://snapshot.box/#/s:${CONFIG.snapshotSpace}/proposal/${p.snapshotProposalId}`;
        const waiting = p.stateName === "Pending" || p.stateName === "Updatable";
        d.innerHTML = `投票は <a href="${url}" target="_blank" rel="noopener">Snapshot(${escapeHtml(CONFIG.snapshotSpace)})</a> から(票の一覧もここで公開)。` +
          (waiting ? `票は Snapshot に保管され、<b>Nouns 本体の投票開始後</b>に数分ごとへオンチェーン反映されます(上の集計はそれまで 0 のままです)。` : `票は数分ごとに自動でオンチェーンへ反映されます。`);
      } else {
        d.innerHTML = `この議案はまだ対応表に未登録です(Nouns の投票開始後、自動処理が Snapshot 提案を作成・登録します)。`;
      }
      el.appendChild(d);
    }
    else if (account && p.votable) await renderMine(p);
  }
  if (closed.length) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<b>最近の結果</b>` + closed.map((p) => {
      const mg = p.metagov, ex = p.executed;
      const nr = mg.nounsReceipt;
      const hasVotes = mg.tokens[0] + mg.tokens[1] + mg.tokens[2] > 0;
      const canExecute = hasVotes && !mg.executed && mg.deadline && block >= mg.deadline && (p.stateName === "Active" || p.stateName === "Pending");
      const r = mg.executed ? `pNouns Voter → Nouns DAO: <b>${SUPPORT[mg.result]}</b>${ex && ex.tx ? ` <a href="${CONFIG.explorer}/tx/${ex.tx}" target="_blank">tx</a>${CONFIG.blockscout ? ` / <a href="${CONFIG.blockscout}/tx/${ex.tx}?tab=logs" target="_blank">イベント</a>` : ""}` : ""}` : (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] ? "未実行" : "投票なし");
      const nouns = nr && nr.hasVoted ? `<br><span style="color:var(--for)">✔ Nouns DAO 側の記録: pNouns Voter が「${SUPPORT[nr.support]}」${nr.votes} 票(提案全体: 賛成 ${p.forVotes} / 反対 ${p.againstVotes} / 棄権 ${p.abstainVotes})</span>` : "";
      const exec = canExecute ? `<br><button class="exec" data-p="${p.id}" style="margin-top:4px">締切済み — 手動で execute する(誰でも可、ガスは Nouns DAO から払い戻し)</button>` : "";
      return `<div class="muted" style="margin-top:6px">Prop ${p.id} ${escapeHtml(p.title)} — 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]}(投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]}) ・ ${r} ・ Nouns: ${p.stateName}${nouns}${exec}</div>`;
    }).join("");
    root.appendChild(el);
    el.querySelectorAll("button.exec").forEach((b) => b.addEventListener("click", () => manualExecute(Number(b.dataset.p))));
  }
  msg(`更新: block ${block}`);
}
async function renderMine(p) {
  const box = $(`#my-${p.id}`);
  const t = await api(`/api/tokens/${account}?proposalId=${p.id}`);
  tokensCache[p.id] = t;
  if (!t.tokenIds.length) { box.innerHTML = `<div class="muted" style="margin-top:8px">このアドレスは pNouns を保有していません。</div>`; return; }
  const usable = t.tokenIds.filter((id) => !t.voted[id]);
  const chips = t.tokenIds.map((id) => `<span class="${t.voted[id] ? "voted" : ""}">#${id}</span>`).join("");
  let status = "";
  if (t.hasVoted) status = `<div class="muted">この提案には投票済みです(オンチェーン)。</div>`;
  else if (t.pending) status = `<div class="muted">署名受付済み: <b>${SUPPORT[t.pending.support]}</b>(${t.pending.tokenIds.length} 枚)。${t.pending.tx ? `投函済み <a href="${CONFIG.explorer}/tx/${t.pending.tx}" target="_blank">tx</a>` : "まもなくリレイヤーが投函します"}</div>`;
  box.innerHTML = `
    <div style="margin-top:10px">あなたの pNouns(${t.tokenIds.length} 枚、投票可能 ${usable.length} 枚): <span class="tokens">${chips}</span></div>
    ${status}
    ${!t.hasVoted && !t.pending && usable.length ? `<div class="row votebtns" style="margin-top:10px">
      <button class="for" data-p="${p.id}" data-s="1">賛成</button>
      <button class="against" data-p="${p.id}" data-s="0">反対</button>
      <button class="abstain" data-p="${p.id}" data-s="2">棄権</button></div>` : ""}`;
  box.querySelectorAll("button[data-s]").forEach((b) => b.addEventListener("click", () => vote(Number(b.dataset.p), Number(b.dataset.s))));
}
async function vote(proposalId, support) {
  try {
    const t = tokensCache[proposalId];
    const tokenIds = t.tokenIds.filter((id) => !t.voted[id]).map(String);
    const typed = {
      types: { EIP712Domain: [{ name: "name", type: "string" }, { name: "version", type: "string" }, { name: "chainId", type: "uint256" }, { name: "verifyingContract", type: "address" }], ...CONFIG.types },
      primaryType: "Vote",
      domain: CONFIG.domain,
      message: { proposalId: String(proposalId), support, tokenIds },
    };
    msg(`Prop ${proposalId} に「${SUPPORT[support]}」で署名します。ウォレットで承認してください…`);
    const signature = await eth().request({ method: "eth_signTypedData_v4", params: [account, JSON.stringify(typed)] });
    const r = await api("/api/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: String(proposalId), support, tokenIds, signature }) });
    msg(`受け付けました: Prop ${r.proposalId} ${SUPPORT[r.support]} (${r.tokenIds.length} 枚)。リレイヤーが投函するとここに反映されます。`);
    await render();
  } catch (e) { msg("エラー: " + (e.message || e), true); }
}
// 手動 execute: pNouns Voter.execute(uint256) を接続中ウォレットから直接送る(リレイヤー停止時の保険)。
// selector 0xfe0d94c1 = keccak256("execute(uint256)")[:4]。ガスは Nouns の refund が見積りに乗らないため固定で多めに指定。
async function manualExecute(proposalId) {
  try {
    if (!account) { await connect(false); if (!account) return; }
    if (!(await ensureChain())) return;
    const data = "0xfe0d94c1" + BigInt(proposalId).toString(16).padStart(64, "0");
    msg(`Prop ${proposalId} の execute をウォレットから送信します。承認してください…`);
    const hash = await eth().request({ method: "eth_sendTransaction", params: [{ from: account, to: CONFIG.metagov, data, gas: "0x" + (300000).toString(16) }] });
    msg(`送信しました: ${CONFIG.explorer}/tx/${hash}\n数十秒後に「最近の結果」に反映されます。`);
    setTimeout(render, 20000);
  } catch (e) { msg("エラー: " + (e.message || e), true); }
}
const boundProviders = new WeakSet();
function bindProviderEvents() {
  const p = eth();
  if (!p || boundProviders.has(p)) return;
  boundProviders.add(p);
  // リロードせず状態だけ更新(接続を維持)
  p.on?.("accountsChanged", (accs) => { if (p !== eth()) return; setAccount(accs && accs[0]); render(); });
  p.on?.("chainChanged", async () => { if (p !== eth()) return; if (account && (await ensureChain())) render(); });
}
// 誰でも投函: 公開 API から「いま通る投函待ち署名」の calldata を取り、接続中ウォレットから castVotesBySig を送る(ガス自己負担)
async function manualSubmit(proposalId) {
  try {
    if (!account) { await connect(false); if (!account) return; }
    if (!(await ensureChain())) return;
    const r = await api(`/api/signatures/${proposalId}?calldata=1`);
    if (!r.calldata) return msg("いま投函できる署名がありません(既に投函済み、または無効化)。", true);
    msg(`${r.submittable} 件の署名を投函します${r.remaining ? `(残り ${r.remaining} 件は次回)` : ""}。ウォレットで承認してください…`);
    const hash = await eth().request({ method: "eth_sendTransaction", params: [{ from: account, to: CONFIG.metagov, data: r.calldata, gas: "0x" + r.gasHint.toString(16) }] });
    msg(`送信しました: ${CONFIG.explorer}/tx/${hash}\n数十秒後に集計へ反映されます。`);
    setTimeout(render, 20000);
  } catch (e) { msg("エラー: " + (e.message || e), true); }
}
// M-08: EIP-6963 の icon は data:image/* の URI だけ許可(自己申告値を無検証で属性に入れない)
function safeIcon(u) { return typeof u === "string" && /^data:image\/(png|svg\+xml|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 200000; }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
(async () => {
  CONFIG = await api("/api/config");
  $("#net").textContent = `${CONFIG.network} · pNouns Voter ${CONFIG.metagov.slice(0, 8)}…`;
  $("#connect").addEventListener("click", () => connect(false));
  $("#disconnect").addEventListener("click", disconnect);
  // EIP-6963 の announce を少し待ってから自動復元
  await new Promise((r) => setTimeout(r, 300));
  if (localStorage.getItem("pnouns-voter-connected")) await connect(true); // 前回接続していれば自動復元
  await render();
  setInterval(render, 60000);
})();
