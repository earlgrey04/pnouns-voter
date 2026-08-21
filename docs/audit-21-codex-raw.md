Reading additional input from stdin...
OpenAI Codex v0.145.0-alpha.7
--------
workdir: /mnt/data/pnouns-voter
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a0225d-6c5b-7671-8537-bc3e5c90797c
--------
user
# 監査依頼 (第21回) — 登録の確定引き継ぎ方式への一本化の検証

第18-20回で指摘された Cloudflare 自動探索登録(autoRegister)を撤去し、登録は
「作成した処理が Snapshot 提案 ID をそのまま登録する」確定引き継ぎ方式
(scripts/create-and-register.mjs)に一本化しました(commit 047d8aa。`git show 047d8aa`)。
ファイル変更禁止。日本語。relayer-cf で npm test を実行し結果を含めること。

## 検証してほしいこと
1. **撤去の完全性と安全性**: relayer-cf/src から autoRegister・registrarClient・
   AUTO_REGISTER・snapshotBot が残らず消え、resolveMappings が探索方式導入前の
   状態に正しく戻っているか。撤去で新たな不整合(未定義参照・cfg の欠落・
   snap.js の linkOk や worker の tick フロー)がないか。コア(投函・execute・
   照合)の挙動が第15回クローズ時と同一か
2. **create-and-register.mjs の確定引き継ぎ方式の安全性**: これが唯一の登録経路に
   なる。作成 → 読み戻し検算(space/URL/choices) → registerProposal の流れに、
   探索方式で問題になった論点(取り違え・二重登録・内容不一致)が再発しないか。
   - 読み戻し検算(第17回で追加)が全経路で必ず実行されるか。dry-run/skip-register
     との組合せ、fetch 失敗時に登録まで進まないか
   - preflight(registrar 権限・未登録・getCode)の十分性
   - sequencer が返す receipt.id を信用して登録するが、その ID が実際に作成された
     提案か(ハブ読み戻しで担保されるか)
   - 本番で GitHub Actions から実行する前提の運用リスク(RUNBOOK §11)
3. **鍵配置**: registrar 鍵が Cloudflare から消え、GitHub 側に移ることの是非。
   「運ぶ人=Cloudflare / 作る+登録する人=GitHub」の分離は、以前の
   「bot と登録係を別サービスに」より弱いのか強いのか、率直な評価
4. **資料 §2 / RUNBOOK §11** の記述が実装・運用と一致するか

## 出力
[重大度]/該当箇所/何が起きるか/推奨。問題なしも根拠つき。最後に
「この構成(コア + 確定引き継ぎ登録)で Sepolia E2E → 本番準備へ進んでよいか」を判定。
codex
第21回監査として、まず `047d8aa` の差分と現行ツリー、関連資料・RUNBOOK・第15回相当のコア差分を突き合わせます。その後 `relayer-cf` で `npm test` を実行し、登録経路の全分岐をコード上で追跡して、重大度順に報告します。ファイル変更は行いません。
exec
/bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g '"'!node_modules'"' -g '"'!vendor'"' | sed -n '1,80p' && git status --short && git show --stat --oneline --decorate --no-renames 047d8aa && git show --format=fuller --no-ext-diff --no-renames 047d8aa --" in /mnt/data/pnouns-voter
 succeeded in 0ms:
/mnt/data/pnouns-voter
047d8aa (HEAD -> main) 登録係を確定引き継ぎ方式に一本化(ユーザー決定): Cloudflare 探索方式を撤去
 docs/RUNBOOK-MAINNET.md                     |  15 +++
 docs/member-proposal-unified.html           |  10 +-
 relayer-cf/src/chain.js                     |   8 +-
 relayer-cf/src/register.js                  | 145 -----------------------
 relayer-cf/src/snap.js                      |   6 +-
 relayer-cf/src/worker.js                    |  12 +-
 relayer-cf/test/format-equivalence.test.mjs |  36 ------
 relayer-cf/test/worker-tick.test.mjs        | 174 ----------------------------
 relayer-cf/wrangler.toml                    |   2 -
 9 files changed, 24 insertions(+), 384 deletions(-)
commit 047d8aafb0846ec2e8ce9c33effb68b6abac127f
Author:     earlgrey <[redacted-email]>
AuthorDate: Fri Aug 21 12:28:27 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Fri Aug 21 12:28:27 2026 +0900

    登録係を確定引き継ぎ方式に一本化(ユーザー決定): Cloudflare 探索方式を撤去
    
    第18-20回監査で、Worker がハブから対応する Snapshot 提案を「探索」して
    登録する方式は、探索の曖昧さ(複数候補・範囲外・author フィルタの信頼性・
    詳細取得失敗)が繰り返し穴を生み、3 回連続でクローズできなかった。
    ユーザー決定により、探索方式を撤去し「作成した処理が提案 ID をそのまま
    登録する」確定引き継ぎ方式(create-and-register・第17回で読み戻し検算済み)
    に一本化する。
    
    - relayer-cf/src/register.js を削除。worker/chain から autoRegister・
      registrarClient・snapshotBot・AUTO_REGISTER を撤去
    - resolveMappings の author 絞りも撤去(登録済み対応表の解決を別 author で
      見落とす副作用があり、既存挙動を壊さないため元に戻す)
    - Cloudflare の REGISTRAR_PRIVATE_KEY secret を削除
    - 結果: 運ぶ人=Cloudflare / 作る+登録する人=GitHub の自然な分離。
      registrar 鍵は Cloudflare から無くなる
    - 資料 §2 と RUNBOOK §11 をこの運用に更新
    
    テスト 46 pass(探索方式のテストは削除)。Worker 再デプロイ済み。
    autoRegister 撤去によりコア(第15回クローズ)への影響なし。
    
    Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
index 483921a..7b33970 100644
--- a/docs/RUNBOOK-MAINNET.md
+++ b/docs/RUNBOOK-MAINNET.md
@@ -138,3 +138,18 @@ npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Disc
 リポジトリ公開後、Worker のデプロイは GitHub Actions 経由(`wrangler deploy` を CI で実行)に
 切り替える。これにより「どのコミットをいつ Cloudflare に配備したか」の公開実行ログが残り、
 実行コードとリポジトリの対応が(暗号学的な証明ではないが)追跡可能になる。
+
+
+## 11. 対応表の登録運用(確定引き継ぎ方式)
+
+対応表(Snapshot 提案 = Nouns 第 N 号)の登録は、**提案を作成した処理が、作成した Snapshot
+提案 ID をそのまま登録する**方式に一本化する(scripts/create-and-register.mjs)。
+Cloudflare の Worker からハブを探索して登録する方式は、探索の曖昧さ(複数候補・範囲外・
+author フィルタの信頼性)が繰り返し監査指摘を生んだため採用しない(第18-20回監査)。
+
+- 実行場所: GitHub Actions(bot の作成ジョブに続けて登録まで行う)。自宅 PC 非依存。
+- registrar の鍵は GitHub の secret に置き、Cloudflare には置かない
+  (運ぶ人=Cloudflare、作る+登録する人=GitHub の分離)。
+- create-and-register は送信前に鍵・権限・未登録を確認し、作成後・登録前に
+  Snapshot から提案を読み戻して内容(space/URL/choices)一致を検証する(第17回監査)。
+- Cloudflare の Worker は登録には関与せず、対応表を読んで照合・投函・execute のみ行う。
diff --git a/docs/member-proposal-unified.html b/docs/member-proposal-unified.html
index 0b6c529..b87c0ba 100644
--- a/docs/member-proposal-unified.html
+++ b/docs/member-proposal-unified.html
@@ -156,11 +156,11 @@
 <div class="kv"><span class="k can">できること</span>Snapshot の署名をチェーンに運ぶ</div>
 <div class="kv"><span class="k cant">できないこと</span>票の偽造・改変・投票結果の指定(コントラクト上の専用権限は持たない)</div>
 </div>
-<div class="keycard"><div class="keyhead"><b>登録係</b><span class="pill local">自宅 PC</span> または <span class="pill cloud">Cloudflare</span><span class="freq">出番: 提案ごとに 1 回</span></div>
+<div class="keycard"><div class="keyhead"><b>登録係</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
 <div class="kv"><span class="k can">できること</span>「この Snapshot 投票は Nouns の第 N 号議案のもの」と登録する(<b>自動処理</b>。提案作成と同じプログラムが続けて行うので、人が ID を書き写す場面はありません)</div>
 <div class="kv" style="color:var(--ink-2);font-size:13px">この「どの Snapshot 投票が、どの Nouns 議案に対応するか」を記録した一覧を、本資料では<b>対応表</b>と呼びます。コントラクトの中(オンチェーン)に保存され、誰でも見られます。コントラクトはこの対応表を引いて「届いた票をどの議案に数えるか」を決めます。</div>
 <div class="kv"><span class="k cant">できないこと</span>票に関する一切の操作</div>
-<div class="kv" style="color:var(--ink-2);font-size:13px">置き場所は<b>Snapshot bot と同じ場所には置かない</b>方針(理由は下記)です。Cloudflare 版を実装済みで、テストネットで検証中 — この方式では、登録の前に<b> Nouns のオンチェーン本文から「あるべき提案内容」を再計算し、タイトル・本文・URL・選択肢が完全一致した場合だけ登録</b>します(bot の鍵が単独で盗まれても、忠実な内容の提案しか登録されません)。</div>
+<div class="kv" style="color:var(--ink-2);font-size:13px">登録は<b>提案の作成と同じ処理(GitHub 上の自動処理)がそのまま続けて行います</b>。作った本人が提案 ID を知っているので、後から「どれがどれか」を探す曖昧さがありません。登録の直前に、作成した提案を Snapshot から読み戻して内容が一致するかを確認します(取り違え防止)。</div>
 </div>
 <div class="keycard"><div class="keyhead"><b>Snapshot bot</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
 <div class="kv"><span class="k can">できること</span>Snapshot に投票ページを作る(現行から引き続き。pNouns 1 枚保有)</div>
@@ -193,8 +193,8 @@
 
 <h3>置き場所を分ける理由 — 特に bot と登録係</h3>
 <ul style="font-size:14px">
-  <li><b>Snapshot bot と登録係は同じ場所に置きません。</b>両方が同時に盗まれると「偽の投票ページを作り、それを対応表に登録する」攻撃 — §3 の自動検算で見抜けない唯一のケース — が、1 箇所への侵入だけで成立してしまうためです。</li>
-  <li>別々のサービスに分けておけば、攻撃者は<b>独立した 2 箇所を同時に破る</b>必要があります。</li>
+  <li><b>投票を「運ぶ人」(Cloudflare)と「作る+登録する人」(GitHub)を分けます。</b>Cloudflare が盗まれても対応表の登録はできず、GitHub が盗まれても票を運ぶ鍵は別にあります。bot と登録係を一体にしているのは、作成と登録を同じ処理にすると「どの Snapshot 提案がどの議案か」を探す曖昧さがなくなり、取り違えや乗っ取りの経路が減るためです。</li>
+  <li>「偽の投票ページを作って登録する」攻撃には GitHub 側の鍵が必要で、票を勝手に投函するには Cloudflare 側の鍵が必要 — <b>攻撃者は独立した 2 箇所を同時に破る</b>必要があります。</li>
   <li>管理者権限の移管(委任アドレス → マルチシグ)は 1 トランザクションで完了し、テストネットで移管の往復を演習済みです。</li>
 </ul>
 
@@ -216,7 +216,7 @@
 <div class="tbl"><table>
 <tr><th></th><th>テスト段階(現在)</th><th>本番(移行時に実施)</th></tr>
 <tr><td>アドレス(権限)の分離</td><td>管理者・登録係・リレイヤーの 3 者は別アドレスで検証済み。テストで Snapshot に提案を作る bot だけは専用鍵を作っておらず、<b>テストの管理者が使っている開発鍵(Sepolia 専用・実資産なし)を共用</b></td><td><b>4 つすべてを新しい鍵として作り直し、完全に分離</b></td></tr>
-<tr><td>保管場所の分離</td><td>リレイヤーは Cloudflare。登録係は Cloudflare 版を実装しテスト中(bot は GitHub/自宅 PC)</td><td><b>役割ごとに別の場所へ</b>(bot=GitHub、登録係=Cloudflare、で分離)</td></tr>
+<tr><td>保管場所の分離</td><td>リレイヤーは Cloudflare。bot と登録係は GitHub の自動処理(作成と登録を一体で実行)</td><td><b>運ぶ人=Cloudflare、作る+登録する人=GitHub</b>に分離(registrar の鍵は Cloudflare に置かない)</td></tr>
 </table></div>
 <p style="margin:4px 0 0">本番の鍵の作り直しと配置は手順書に組み込み済みで、導入時の機械チェックでも照合します。</p></div>
 
diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
index d1d4568..fb0a9d7 100644
--- a/relayer-cf/src/chain.js
+++ b/relayer-cf/src/chain.js
@@ -29,7 +29,6 @@ export function cfg(env) {
     for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
     if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
   }
-  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
   return {
     network: env.NETWORK || "sepolia",
     chain,
@@ -57,9 +56,6 @@ export function cfg(env) {
     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
     relayerKey: env.RELAYER_PRIVATE_KEY || null,
-    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
-    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
-    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
     lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
   };
 }
@@ -93,9 +89,7 @@ export function clients(c) {
   const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
   const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
   const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
-  const registrarAccount = c.registrarKey ? privateKeyToAccount(c.registrarKey) : null;
-  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
-  return { publicClient, walletClient, account, registrarClient };
+  return { publicClient, walletClient, account };
 }
 export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
 
diff --git a/relayer-cf/src/register.js b/relayer-cf/src/register.js
deleted file mode 100644
index 110b6eb..0000000
--- a/relayer-cf/src/register.js
+++ /dev/null
@@ -1,145 +0,0 @@
-// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
-// 安全設計(第18回監査で強化):
-//  - ハブ上の提案を「URL の自己申告」だけで登録しない。Nouns のオンチェーン本文から
-//    buildProposal で期待内容を再計算し、title/body/discussion/choices の完全一致を要求
-//  - 候補の選別(author=正規 bot / type=single-choice / 投票期間が現在有効)を通過した提案だけ
-//    本文を 1 件ずつ取得(本文の一括取得は 64KiB 上限 DoS になるため行わない)
-//  - 完全一致がちょうど 1 件のときだけ登録(0 件: 警告して保留 / 2 件以上: 曖昧として保留)
-//  - 送信は {tx, at} を KV に記録し、10 分未採掘なら再試行。AlreadyRegistered は競合として扱う
-import { DAO_ABI, METAGOV_ABI, revertErrorName } from "./chain.js";
-import { hubGql, referencesNounsProposal } from "./snap.js";
-import { keccak256, stringToBytes } from "viem";
-
-// ---- scripts/lib/proposal-format.mjs と同一ロジック(同値性は回帰テストで担保) ----
-export const CHOICES = ["賛成", "反対", "棄権"];
-export const DEFAULT_BODY_LIMIT = 9500;
-export function extractTitle(description, fallbackId) {
-  const first = String(description || "").split("\n").find((l) => l.trim()) || "";
-  const t = first.replace(/^#+\s*/, "").trim();
-  return t || `Proposal ${fallbackId}`;
-}
-export function truncateBody(description, url, limit = DEFAULT_BODY_LIMIT) {
-  const body = String(description || "").trim();
-  if (body.length <= limit) return { body, truncated: false };
-  const notice = `\n\n---\n\n**⚠️ 本文が長いため、ここで省略しています。全文は Nouns DAO の提案ページをご覧ください:**\n${url}\n`;
-  const cut = body.slice(0, limit - notice.length);
-  const lastBreak = cut.lastIndexOf("\n\n");
-  const head = lastBreak > limit * 0.5 ? cut.slice(0, lastBreak) : cut;
-  return { body: head.trimEnd() + notice, truncated: true };
-}
-export function buildProposal({ nounsId, description, limit = DEFAULT_BODY_LIMIT }) {
-  const url = `https://nouns.wtf/vote/${nounsId}`;
-  const title = `[Prop ${nounsId}] ${extractTitle(description, nounsId)}`;
-  const { body, truncated } = truncateBody(description, url, limit);
-  return { title, body, discussion: url, choices: [...CHOICES], truncated };
-}
-
-/// Nouns 提案のオンチェーン本文(作成イベント + 更新イベントの最新)。
-/// Pending/Active では本文は凍結済みのため、KV に 1 回だけ保存して再利用する(RPC ログ取得の節約)。
-export async function nounsDescription(c, pc, store, id, creationBlock) {
-  const ck = `${store.prefix}desc:${id}`;
-  const cached = await store.kvRaw.get(ck);
-  if (cached !== null) return cached;
-  const events = DAO_ABI.filter((x) => x.type === "event");
-  const latest = await pc.getBlockNumber();
-  const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
-  let desc = null;
-  for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === Number(id)) desc = String(l.args.description || "");
-  if (desc === null) return null;
-  const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
-  for (const l of updates) if (Number(l.args.id) === Number(id)) desc = String(l.args.description ?? desc); // 空文字への更新も有効な最新値(第18回監査)
-  await store.kvRaw.put(ck, desc, { expirationTtl: 86400 * 14 });
-  return desc;
-}
-
-async function warnOnce(c, store, notify, key, ttl, text) {
-  if (await store.getFlag(key)) return;
-  const sent = await notify(c, text);
-  if (sent !== false) await store.setFlag(key, ttl);
-}
-
-/// 未登録の active な Nouns 提案について、対応する Snapshot 提案を探し、検証して登録する。
-export async function autoRegister(c, pc, registrar, store, notify, p) {
-  // 送信済み記録: 10 分は再送しない。それを過ぎたら receipt を確認して再試行を判断
-  const sentK = `${store.prefix}regsent2:${p.id}`;
-  const pending = await store.kvRaw.get(sentK, "json");
-  if (pending) {
-    if (Date.now() - pending.at < 10 * 60 * 1000) return;
-    let rcpt = null;
-    try { rcpt = await pc.getTransactionReceipt({ hash: pending.tx }); } catch { rcpt = null; }
-    await store.kvRaw.delete(sentK);
-    if (rcpt && rcpt.status === "success") return; // 成功していれば次 tick で snapInfo が現れ、ここには来なくなる
-    console.warn(`[register] prop ${p.id}: 前回の登録 tx が${rcpt ? "revert" : "未採掘"}のため再試行します`);
-  }
-
-  // 1) 候補の列挙: GraphQL 側で正規 bot に絞る(攻撃者の巨大 discussion 提案は来ない = 64KiB DoS 対策)。
-  //    small フィールドのみ。author が未設定の運用では自動登録しない(cfg で必須化済み)。
-  const LIST = 100; // 一覧上限。これを超える bot 提案が該当する状況は異常なので、超過は一意性不明として保留する
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
-  const all = data.proposals || [];
-  const refs = all.filter((x) => referencesNounsProposal(x.discussion, p.id));
-  if (!refs.length) return; // bot がまだ提案を作っていない — 次 tick に再確認
-  if (all.length >= LIST && refs.length > 1) { // 一覧が上限に達し、かつ複数候補 = 範囲外に更なる候補がある恐れ
-    await warnOnce(c, store, notify, `reglist:${p.id}`, 86400, `⚠️ Prop ${p.id}: bot の提案が多く、候補の一意性を確認できないため自動登録を保留しました。`);
-    return;
-  }
-
-  // 2) 選別: single-choice・投票期間が現在有効で、残り時間が投函に必要な余裕を上回る
-  const now = Date.now() / 1000;
-  const minRemainSec = c.cronSec + c.submitBufferSec + 300; // 猶予明け後に投函・採掘できる最小残り時間
-  const screened = refs.filter((x) =>
-    x.type === "single-choice" &&
-    Number(x.start) <= now && Number(x.end) - now > minRemainSec && Number(x.end) - Number(x.start) <= 8 * 86400);
-  if (!screened.length) {
-    await warnOnce(c, store, notify, `regscreen:${p.id}`, 86400,
-      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 ${refs.length} 件)。`);
-    return;
-  }
-
-  // 3) オンチェーン本文から期待内容を再計算
-  const desc = await nounsDescription(c, pc, store, p.id, p.creationBlock);
-  if (desc === null) { console.warn(`[register] prop ${p.id}: オンチェーン本文を取得できず登録を見送り`); return; }
-  const expected = buildProposal({ nounsId: p.id, description: desc });
-
-  // 4) 候補を 1 件ずつ取得して完全一致を数える。取得失敗(64KiB 超過等)はその候補だけスキップし走査を続ける
-  const matches = [];
-  let skipped = 0;
-  for (const cand of screened) {
-    let x = null;
-    try { x = (await hubGql(c, `{ proposal(id:"${cand.id}") { id title body discussion choices } }`))?.proposal; }
-    catch (e) { skipped++; console.warn(`[register] prop ${p.id}: 候補 ${cand.id.slice(0, 12)} の取得に失敗(スキップ): ${(e.message || "").slice(0, 60)}`); continue; }
-    if (!x) continue;
-    if (x.title === expected.title && (x.discussion || "") === expected.discussion && (x.body || "") === expected.body && JSON.stringify(x.choices) === JSON.stringify(expected.choices)) matches.push(x.id);
-  }
-  if (skipped) await warnOnce(c, store, notify, `regskip:${p.id}`, 86400, `⚠️ Prop ${p.id}: 候補 ${skipped} 件を取得できず(サイズ超過など)検証をスキップしました。`);
-  if (matches.length === 0) {
-    await warnOnce(c, store, notify, `regmismatch:${p.id}`, 86400,
-      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。`);
-    return;
-  }
-  if (matches.length > 1) {
-    await warnOnce(c, store, notify, `regambig:${p.id}`, 86400,
-      `⚠️ Prop ${p.id}: 内容が完全一致する Snapshot 提案が ${matches.length} 件あり、一意に決められないため自動登録を保留しました。`);
-    return;
-  }
-
-  // 5) 登録(AlreadyRegistered は手動登録等との競合として静かに退く)
-  try {
-    const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [matches[0], BigInt(p.id)] });
-    await store.kvRaw.put(sentK, JSON.stringify({ tx: hash, at: Date.now() }), { expirationTtl: 86400 * 3 }); // 提案期間以上(第19回監査: 1h では Worker 長時間停止で tx を見失う)
-    await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。`, `Snapshot: ${matches[0]}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
-  } catch (e) {
-    if (revertErrorName(e) === "AlreadyRegistered") {
-      // 実際に登録された対応(nounsToSnap)を読み戻し、期待した Snapshot 提案のハッシュと一致するか確認する。
-      // 別 ID が割り込んで登録された場合は高優先度で警告して止める(静かに退かない)。
-      const expectedHash = keccak256(stringToBytes(matches[0]));
-      let got = null;
-      try { got = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(p.id)] }); } catch {}
-      if (got && got.toLowerCase() === expectedHash.toLowerCase()) { console.log(`[register] prop ${p.id}: 期待どおり登録済み(競合)`); return; }
-      await warnOnce(c, store, notify, `regconflict:${p.id}`, 86400, `⚠️ Prop ${p.id}: 対応表が既に登録済みですが、登録されたハッシュ(${got ? String(got).slice(0, 14) : "取得失敗"}…)が期待した Snapshot 提案 ${matches[0].slice(0, 14)}… のハッシュ(${expectedHash.slice(0, 14)}…)と一致しません。誤登録の可能性 — 手動で確認してください。`);
-      return;
-    }
-    await warnOnce(c, store, notify, `regerr:${p.id}`, 86400,
-      `⚠️ Prop ${p.id}: 対応表の自動登録の送信に失敗しました(${(e.shortMessage || e.message || "").slice(0, 120)})。registrar の残高・RPC を確認してください。`);
-  }
-}
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 2f7af49..727db0c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -75,9 +75,7 @@ export function referencesNounsProposal(text, nounsId) {
 }
 
 export async function resolveMappings(c, pc, activeNounsIds = []) {
-  // 正規 bot が設定されていれば author で絞る(攻撃者の巨大 discussion 提案を候補から排除 = 64KiB DoS 対策・第19回監査)
-  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
   const meta = new Map(data.proposals.map((p) => [p.id, p]));
   const found = new Map(); // nounsId -> snapId
@@ -97,7 +95,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
     if (need.length) {
       // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
-      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
+      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
       const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
       for (const n of need) {
         const p = byHash.get(n.hash);
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index 06f5f75..63854f8 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -4,7 +4,6 @@ import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI,
 import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey, snapshotVoterCount } from "./snap.js";
 import { keccak256, stringToBytes } from "viem";
 import { makeStore } from "./store.js";
-import { autoRegister } from "./register.js";
 
 async function notify(c, text) {
   console.log("[notify]", text.replace(/\n/g, " ⏎ "));
@@ -439,7 +438,7 @@ export function __resetWorkerStateForTests(o = {}) {
 const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
 export async function tick(env) {
   const c = cfg(env);
-  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
+  const { publicClient: pc, walletClient: wc } = _clients(c);
   const store = makeStore(env.STATE, storeNs(c));
   try {
     try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
@@ -460,11 +459,6 @@ export async function tick(env) {
           { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
           { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
         ], allowFailure: false });
-        // 第18回監査: 自動登録が有効なら、設定された鍵がオンチェーンの registrar と一致することを確認(fail-closed)
-        if (c.autoRegister) {
-          const rcAddr = rc?.account?.address;
-          if (!rcAddr || String(rcAddr).toLowerCase() !== String(registrarAddr).toLowerCase()) { await notifyError(c, "config", new Error(`REGISTRAR_PRIVATE_KEY のアドレス(${rcAddr}) がオンチェーンの registrar(${registrarAddr}) と一致しません`)); return; }
-        }
         // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
         // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
         if (c.network === "mainnet") {
@@ -496,10 +490,6 @@ export async function tick(env) {
       if (p.state !== 0 && p.state !== 1) continue;
       try {
         const snapInfo = snapByNouns.get(p.id) || null;
-        // 登録係の Cloudflare 実装: 未登録の提案について、内容一致を検証したうえで対応表を自動登録
-        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
-          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
-        }
         // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
         // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
         // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
diff --git a/relayer-cf/test/format-equivalence.test.mjs b/relayer-cf/test/format-equivalence.test.mjs
deleted file mode 100644
index 497d305..0000000
--- a/relayer-cf/test/format-equivalence.test.mjs
+++ /dev/null
@@ -1,36 +0,0 @@
-// 第18回監査: register.js の formatter が scripts/lib/proposal-format.mjs と同値であることの回帰テスト。
-// コピー実装のため、片方だけ修正すると全提案が「不一致で保留」になる。ここで乖離を検知する。
-import { test } from "node:test";
-import assert from "node:assert/strict";
-import * as w from "../src/register.js";
-import * as l from "../../scripts/lib/proposal-format.mjs";
-
-const LONG = "# Long Proposal\n\n" + Array.from({ length: 400 }, (_, i) => `パラグラフ ${i} — ${"内容".repeat(20)}`).join("\n\n");
-const FIXTURES = [
-  { name: "通常", d: "# Title\n\nHello world" },
-  { name: "空", d: "" },
-  { name: "CRLF", d: "# T\r\n\r\nline1\r\nline2" },
-  { name: "Unicode 結合・絵文字", d: "# 日本語タイトル ⚡\n\nガ(結合濁点) 👨‍👩‍👧‍👦 サロゲート𠮷" },
-  { name: "9500 ちょうど", d: "x".repeat(9500) },
-  { name: "9501", d: "x".repeat(9501) },
-  { name: "長文(段落境界)", d: LONG },
-  { name: "見出しなし", d: "no heading first line\n\nbody" },
-];
-
-test("buildProposal が両実装で完全一致する", () => {
-  for (const f of FIXTURES) {
-    for (const id of [1, 989]) {
-      const a = w.buildProposal({ nounsId: id, description: f.d });
-      const b = l.buildProposal({ nounsId: id, description: f.d });
-      assert.equal(a.title, b.title, `${f.name}/title`);
-      assert.equal(a.body, b.body, `${f.name}/body`);
-      assert.equal(a.discussion, b.discussion, `${f.name}/discussion`);
-      assert.deepEqual(a.choices, b.choices, `${f.name}/choices`);
-    }
-  }
-});
-
-test("定数も一致する", () => {
-  assert.deepEqual(w.CHOICES, l.CHOICES);
-  assert.equal(w.DEFAULT_BODY_LIMIT, l.DEFAULT_BODY_LIMIT);
-});
diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
index 096a219..ba31a63 100644
--- a/relayer-cf/test/worker-tick.test.mjs
+++ b/relayer-cf/test/worker-tick.test.mjs
@@ -403,178 +403,4 @@ test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があ
   assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
 });
 
-// ---- 登録係の Cloudflare 実装(autoRegister) ----
-import { buildProposal } from "../src/register.js";
-const DESC = "# Test Prop\n\nHello pNouns members. This is the proposal body.";
 
-function regSetup(h, candOverride = {}, envOver = {}) {
-  const expected = buildProposal({ nounsId: 1, description: DESC });
-  const nowS = Math.floor(Date.now() / 1000);
-  // 候補一覧(小フィールド)と詳細(本文)の 2 段階
-  const small = { id: SNAP_ID, author: REGISTRAR_BOT, type: "single-choice", start: nowS - 100, end: nowS + 86400, discussion: expected.discussion, ...(candOverride.small || {}) };
-  const detail = { id: SNAP_ID, title: expected.title, body: expected.body, discussion: expected.discussion, choices: expected.choices, ...(candOverride.detail || {}) };
-  const regWrites = [];
-  const registrar = { account: { address: REGISTRAR }, writeContract: candOverride.writeContract || (async (x) => { regWrites.push(x); return "0x" + "cd".repeat(32); }) };
-  const kv = fakeKV(); const pc = fakePC(h);
-  __setClientsForTests(() => ({ publicClient: pc, walletClient: null, registrarClient: registrar }));
-  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() });
-  const env = baseEnv(kv, { AUTO_REGISTER: "1", REGISTRAR_PRIVATE_KEY: "0x" + "11".repeat(32), SNAPSHOT_BOT: REGISTRAR_BOT, ...envOver });
-  return { kv, pc, env, small, detail, regWrites, expected };
-}
-const REGISTRAR_BOT = "0x4000000000000000000000000000000000000001";
-const unregHandlers = (over = {}) => handlers({
-  snapToNouns: () => 0n,
-  nounsToSnap: () => "0x" + "00".repeat(32),
-  registrar: () => REGISTRAR, // 起動時照合(rc.address == registrar)を通す
-  getLogs: (x) => (x.toBlock === x.fromBlock ? [{ eventName: "ProposalCreated", args: { id: 1n, description: DESC } }] : []),
-  ...over,
-});
-
-// ハブ応答: [対応表解決(small 相当), 候補一覧(small), 詳細(detail)] の 3 段
-const regHub = (small, detail) => [{ proposals: [small] }, { proposals: [small] }, { proposal: detail }];
-
-test("自動登録: 検証をすべて通過した提案だけを登録する", async () => {
-  const { kv, env, small, detail, regWrites } = regSetup(unregHandlers());
-  F.hub = regHub(small, detail);
-  await tick(env);
-  assert.equal(regWrites.length, 1, "registerProposal が送られる");
-  assert.deepEqual(regWrites[0].args, [SNAP_ID, 1n]);
-  assert.equal(putsOf(kv, "regsent2:1").length, 1, "送信記録(tx+時刻)");
-  assert.ok(F.discordBodies.some((b) => b.includes("自動登録しました")));
-});
-
-test("自動登録: 本文がオンチェーンの期待値と一致しなければ登録せず警告", async () => {
-  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { body: "改ざんされた本文" } });
-  F.hub = regHub(small, detail);
-  await tick(env);
-  assert.equal(regWrites.length, 0, "登録しない");
-  assert.ok(F.discordBodies.some((b) => b.includes("自動登録を保留")), "不一致の警告");
-});
-
-test("自動登録: title の不一致も拒否する", async () => {
-  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { title: "[Prop 1] 偽のタイトル" } });
-  F.hub = regHub(small, detail);
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-});
-
-test("自動登録: choices の違いも拒否する(賛成/反対の入れ替え等)", async () => {
-  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { choices: ["反対", "賛成", "棄権"] } });
-  F.hub = regHub(small, detail);
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-});
-
-test("自動登録: 正規 bot の候補が無ければ(GraphQL author 絞りで 0 件)登録も詳細取得もしない", async () => {
-  const { env, regWrites } = regSetup(unregHandlers());
-  F.hub = [{ proposals: [] }, { proposals: [] }];
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-  assert.equal(F.hubCalls, 2, "詳細クエリに進まない");
-});
-
-test("自動登録: 残り投票時間が短すぎる候補は選別で落とす", async () => {
-  const nowS = Math.floor(Date.now() / 1000);
-  const { env, small, regWrites } = regSetup(unregHandlers(), { small: { end: nowS + 60 } });
-  F.hub = [{ proposals: [small] }, { proposals: [small] }];
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-  assert.ok(F.discordBodies.some((b) => b.includes("残り時間")));
-});
-
-test("自動登録: 詳細取得が失敗した候補はスキップし、走査を止めない", async () => {
-  const { env, small, detail, regWrites } = regSetup(unregHandlers());
-  const small2 = { ...small, id: "0x" + "cc".repeat(32) };
-  const detail2 = { ...detail, id: small2.id };
-  F.hub = [{ proposals: [small, small2] }, { proposals: [small, small2] }];
-  const orig = globalThis.fetch;
-  globalThis.fetch = async (url, init) => {
-    const u = String(url);
-    if (u.startsWith(HUB)) {
-      const q = JSON.parse(init.body).query; F.hubCalls++;
-      if (q.includes("proposals(")) return new Response(JSON.stringify({ data: F.hub.shift() }), { status: 200 });
-      if (q.includes(small.id)) throw new Error("body too large"); // 1件目の詳細取得が失敗
-      return new Response(JSON.stringify({ data: { proposal: detail2 } }), { status: 200 });
-    }
-    return orig(url, init);
-  };
-  try { await tick(env); } finally { globalThis.fetch = orig; }
-  assert.equal(regWrites.length, 1, "2件目で登録される");
-  assert.deepEqual(regWrites[0].args, [small2.id, 1n]);
-  assert.ok(F.discordBodies.some((b) => b.includes("スキップ")));
-});
-
-test("自動登録: 投票が終了した候補は選別で落とす", async () => {
-  const nowS = Math.floor(Date.now() / 1000);
-  const { env, small, regWrites } = regSetup(unregHandlers(), { small: { end: nowS - 10 } });
-  F.hub = [{ proposals: [small] }, { proposals: [small] }];
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-});
-
-test("自動登録: 完全一致が 2 件あると曖昧として保留する", async () => {
-  const { env, small, detail, regWrites } = regSetup(unregHandlers());
-  const small2 = { ...small, id: "0x" + "bb".repeat(32) };
-  const detail2 = { ...detail, id: small2.id };
-  F.hub = [{ proposals: [small, small2] }, { proposals: [small, small2] }, { proposal: detail }, { proposal: detail2 }];
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-  assert.ok(F.discordBodies.some((b) => b.includes("一意に決められない")));
-});
-
-test("自動登録: 送信記録が新しい間は再送しない", async () => {
-  const { kv, env, small, detail, regWrites } = regSetup(unregHandlers());
-  const ns = `11155111:${VOTER.toLowerCase()}:`;
-  kv.data.set(`${ns}regsent2:1`, JSON.stringify({ tx: "0x" + "cd".repeat(32), at: Date.now() }));
-  F.hub = regHub(small, detail);
-  await tick(env);
-  assert.equal(regWrites.length, 0);
-});
-
-// AlreadyRegistered の分岐は autoRegister を直接呼んで検証する
-// (tick 経由だと nounsToSnap 非ゼロが手前の unresolved 分岐に吸われ、autoRegister に届かないため)
-async function callAutoRegister(nounsToSnapHash, throwErr = true) {
-  const { autoRegister } = await import("../src/register.js");
-  const err = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3a81d6fc", functionName: "registerProposal" });
-  const expected = buildProposal({ nounsId: 1, description: DESC });
-  const nowS = Math.floor(Date.now() / 1000);
-  const small = { id: SNAP_ID, type: "single-choice", start: nowS - 100, end: nowS + 86400, discussion: expected.discussion };
-  const detail = { id: SNAP_ID, title: expected.title, body: expected.body, discussion: expected.discussion, choices: expected.choices };
-  F.hub = [{ proposals: [small] }, { proposal: detail }];
-  const kv = fakeKV();
-  const store = makeStoreLike(kv);
-  const pc = fakePC(handlers({ getLogs: (x) => (x.toBlock === x.fromBlock ? [{ eventName: "ProposalCreated", args: { id: 1n, description: DESC } }] : []), nounsToSnap: () => nounsToSnapHash }));
-  const notify = async (_c, text) => { F.discordBodies.push(text); return true; };
-  const registrar = { account: { address: REGISTRAR }, writeContract: async () => { throw err; } };
-  const c = { snapshotSpace: SPACE, snapshotBot: REGISTRAR_BOT, snapshotHub: HUB, metagov: VOTER, nounsDAO: DAO, explorer: "https://x", cronSec: 60, submitBufferSec: 120 };
-  await autoRegister(c, pc, registrar, store, notify, { id: 1, creationBlock: 50 });
-  return kv;
-}
-function makeStoreLike(kv) {
-  const P = "";
-  return { prefix: P, kvRaw: kv, getFlag: async (k) => kv.data.get(`flag:${k}`) || null, setFlag: async (k) => kv.data.set(`flag:${k}`, "1") };
-}
-
-test("自動登録(直接): AlreadyRegistered で期待どおりの登録なら静かに退く", async () => {
-  await callAutoRegister(keccak256(stringToBytes(SNAP_ID)));
-  assert.ok(!F.discordBodies.some((b) => b.includes("一致しません")), "期待どおりなら警告しない");
-});
-
-test("自動登録(直接): AlreadyRegistered だが別 ID が登録済みなら高優先度で警告", async () => {
-  await callAutoRegister(keccak256(stringToBytes("0x" + "ff".repeat(32))));
-  assert.ok(F.discordBodies.some((b) => b.includes("一致しません")), "別 ID 登録は警告する");
-});
-
-test("nounsDescription: 空文字への更新イベントを最新値として扱う(第18回監査の中)", async () => {
-  const { nounsDescription } = await import("../src/register.js");
-  const kv = fakeKV();
-  const store = { prefix: "t:", kvRaw: kv, getFlag: async () => null, setFlag: async () => {} };
-  const pc = fakePC(handlers({
-    getLogs: (x) => (x.toBlock === x.fromBlock
-      ? [{ eventName: "ProposalCreated", args: { id: 1n, description: "元の本文" } }]
-      : [{ eventName: "ProposalDescriptionUpdated", args: { id: 1n, description: "" } }]),
-  }));
-  const c = { nounsDAO: DAO };
-  const d = await nounsDescription(c, pc, store, 1, 50);
-  assert.equal(d, "", "空文字が最新の本文として返る(旧本文に戻さない)");
-});
diff --git a/relayer-cf/wrangler.toml b/relayer-cf/wrangler.toml
index ff87175..5bae960 100644
--- a/relayer-cf/wrangler.toml
+++ b/relayer-cf/wrangler.toml
@@ -18,8 +18,6 @@ id = "4c2f1c683fe94191b456e0c1fc70cc2f"
 NETWORK = "sepolia"
 VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
 SNAPSHOT_SPACE = "earl-grey.eth"
-AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
-SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
 PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
 NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
 NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"

codex
差分上、Cloudflare 側の探索登録実装と設定は削除されています。次に、単なる文字列削除だけでなく、現行 `tick`・`resolveMappings` の制御フロー、`create-and-register.mjs` の例外経路、GitHub Actions と資料の実際の接続状況まで確認します。特に「RUNBOOK に書かれているが workflow が存在しない／安全に固定されていない」類を重点確認します。
exec
/bin/bash -lc "rg -n --hidden -S 'autoRegister|registrarClient|AUTO_REGISTER|snapshotBot|SNAPSHOT_BOT|REGISTRAR_PRIVATE_KEY' relayer-cf/src relayer-cf/test relayer-cf/wrangler.toml scripts .github docs package.json 2>/dev/null || true
rg --files scripts .github docs relayer-cf/src relayer-cf/test | sort
sed -n '1,280p' scripts/create-and-register.mjs
sed -n '280,620p' scripts/create-and-register.mjs
sed -n '1,240p' scripts/lib/proposal-format.mjs
sed -n '1,240p' relayer-cf/src/snap.js
sed -n '420,540p' relayer-cf/src/worker.js" in /mnt/data/pnouns-voter
 succeeded in 0ms:
docs/RUNBOOK-MAINNET.md:18:| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-20-codex-raw.md:23:1. [高・64KiB DoS] resolveMappings と autoRegister の一覧取得を GraphQL の author 絞り
docs/audit-20-codex-raw.md:24:   (where に author:SNAPSHOT_BOT)にした。詳細取得は候補単位 try/catch でスキップ。
docs/audit-20-codex-raw.md:26:     SNAPSHOT_BOT 未設定時 = resolveMappings の authorFilter が空文字になる経路、
docs/audit-20-codex-raw.md:39:  登録された提案の扱いを壊さないか。SNAPSHOT_BOT 未設定の既存 Sepolia 運用への影響
docs/audit-20-codex-raw.md:406:  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
docs/audit-20-codex-raw.md:541:// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
docs/audit-20-codex-raw.md:602:export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-20-codex-raw.md:618:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
docs/audit-20-codex-raw.md:690:/bin/bash -lc 'rg -n "snapshotBot|SNAPSHOT_BOT|resolveMappings|autoRegister|regsent2|registerProposal|nounsToSnap|snapToNouns|strategy|snapshot|block|reorg|confirm|cronSec|submitBufferSec" relayer-cf/src relayer-cf/test contracts scripts/sepolia package.json relayer-cf/package.json wrangler.toml relayer-cf/wrangler.toml 2>/dev/null' in /mnt/data/pnouns-voter
docs/audit-20-codex-raw.md:692:relayer-cf/wrangler.toml:22:SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
docs/audit-20-codex-raw.md:707:relayer-cf/test/worker-tick.test.mjs:406:// ---- 登録係の Cloudflare 実装(autoRegister) ----
docs/audit-20-codex-raw.md:708:relayer-cf/test/worker-tick.test.mjs:421:  const env = baseEnv(kv, { AUTO_REGISTER: "1", REGISTRAR_PRIVATE_KEY: "0x" + "11".repeat(32), SNAPSHOT_BOT: REGISTRAR_BOT, ...envOver });
docs/audit-20-codex-raw.md:714:relayer-cf/test/worker-tick.test.mjs:534:// AlreadyRegistered の分岐は autoRegister を直接呼んで検証する
docs/audit-20-codex-raw.md:715:relayer-cf/test/worker-tick.test.mjs:535:// (tick 経由だと nounsToSnap 非ゼロが手前の unresolved 分岐に吸われ、autoRegister に届かないため)
docs/audit-20-codex-raw.md:717:relayer-cf/test/worker-tick.test.mjs:537:  const { autoRegister } = await import("../src/register.js");
docs/audit-20-codex-raw.md:720:relayer-cf/test/worker-tick.test.mjs:549:  const c = { snapshotSpace: SPACE, snapshotBot: REGISTRAR_BOT, snapshotHub: HUB, metagov: VOTER, nounsDAO: DAO, explorer: "https://x", cronSec: 60, submitBufferSec: 120 };
docs/audit-20-codex-raw.md:721:relayer-cf/test/worker-tick.test.mjs:550:  await autoRegister(c, pc, registrar, store, notify, { id: 1, creationBlock: 50 });
docs/audit-20-codex-raw.md:727:relayer-cf/src/worker.js:7:import { autoRegister } from "./register.js";
docs/audit-20-codex-raw.md:744:relayer-cf/src/worker.js:464:        if (c.autoRegister) {
docs/audit-20-codex-raw.md:748:relayer-cf/src/worker.js:500:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-20-codex-raw.md:749:relayer-cf/src/worker.js:501:          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-20-codex-raw.md:793:relayer-cf/src/snap.js:79:  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
docs/audit-20-codex-raw.md:831:relayer-cf/src/register.js:1:// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
docs/audit-20-codex-raw.md:832:relayer-cf/src/register.js:62:export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-20-codex-raw.md:834:relayer-cf/src/register.js:78:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
docs/audit-20-codex-raw.md:879:relayer-cf/src/chain.js:32:  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
docs/audit-20-codex-raw.md:886:relayer-cf/src/chain.js:61:    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-20-codex-raw.md:887:relayer-cf/src/chain.js:62:    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
docs/audit-20-codex-raw.md:996:  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
docs/audit-20-codex-raw.md:1024:    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-20-codex-raw.md:1025:    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-20-codex-raw.md:1026:    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
docs/audit-20-codex-raw.md:1061:  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
docs/audit-20-codex-raw.md:1062:  return { publicClient, walletClient, account, registrarClient };
docs/audit-20-codex-raw.md:1097:  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
docs/audit-20-codex-raw.md:1119:        if (c.autoRegister) {
docs/audit-20-codex-raw.md:1121:          if (!rcAddr || String(rcAddr).toLowerCase() !== String(registrarAddr).toLowerCase()) { await notifyError(c, "config", new Error(`REGISTRAR_PRIVATE_KEY のアドレス(${rcAddr}) がオンチェーンの registrar(${registrarAddr}) と一致しません`)); return; }
docs/audit-20-codex-raw.md:1155:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-20-codex-raw.md:1156:          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-20-codex-raw.md:1713:    62	export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-20-codex-raw.md:1729:    78	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
docs/audit-20-codex-raw.md:1804:    79	  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
docs/audit-20-codex-raw.md:1858:    32	  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
docs/audit-20-codex-raw.md:1886:    60	    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-20-codex-raw.md:1887:    61	    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-20-codex-raw.md:1888:    62	    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
docs/audit-20-codex-raw.md:2020:   534	// AlreadyRegistered の分岐は autoRegister を直接呼んで検証する
docs/audit-20-codex-raw.md:2021:   535	// (tick 経由だと nounsToSnap 非ゼロが手前の unresolved 分岐に吸われ、autoRegister に届かないため)
docs/audit-20-codex-raw.md:2023:   537	  const { autoRegister } = await import("../src/register.js");
docs/audit-20-codex-raw.md:2035:   549	  const c = { snapshotSpace: SPACE, snapshotBot: REGISTRAR_BOT, snapshotHub: HUB, metagov: VOTER, nounsDAO: DAO, explorer: "https://x", cronSec: 60, submitBufferSec: 120 };
docs/audit-20-codex-raw.md:2036:   550	  await autoRegister(c, pc, registrar, store, notify, { id: 1, creationBlock: 50 });
docs/audit-20-codex-raw.md:2099:    21	AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
docs/audit-20-codex-raw.md:2100:    22	SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
docs/audit-20-codex-raw.md:2479:- [中] / [snap.js:79](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:79)、[chain.js:32](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:32) / `SNAPSHOT_BOT` は `AUTO_REGISTER=1` の場合だけ必須です。したがって、自動登録を無効にした既存 Snapshot 運用では `authorFilter=""` となり、resolveMappings の 64 KiB DoS は残ります。一方、設定されている場合は、過去に別 author が作成してオンチェーン登録された正当な提案も 20/200 件検索から消え、`unresolved` として停止します。現行 Sepolia の `wrangler.toml` には bot が設定されているため「未設定経路」は現在のデプロイ設定には該当しません / Snapshot モード全体で必須化するか、既存対応表の解決は author に依存せず `ProposalRegistered` イベントの文字列から ID を復元してください。ライブ前に稼働中の既存登録すべての author を照合する必要があります。
docs/audit-20-codex-raw.md:2489:- [問題なし・軽微な注記] / [register.js:129](/mnt/data/pnouns-voter/relayer-cf/src/register.js:129) / `regsent2` の3日 TTL は、提案当たり1キーなので通常の KV 容量・書込予算への影響は軽微です。古い成功記録も10分経過後に receipt を確認して削除され、再登録を恒久阻害しません。ただし成功後は autoRegister が呼ばれなくなるためキーは3日残り得ます。また「提案期間以上」というコメントは、コードが最大8日を許すことと一致しません。
docs/audit-20-codex-raw.md:2520:- author フィルタ無視・誤author混入・`SNAPSHOT_BOT` 未設定・過去の別author登録
docs/audit-20-codex-raw.md:2553:- [中] / [snap.js:79](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:79)、[chain.js:32](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:32) / `SNAPSHOT_BOT` は `AUTO_REGISTER=1` の場合だけ必須です。したがって、自動登録を無効にした既存 Snapshot 運用では `authorFilter=""` となり、resolveMappings の 64 KiB DoS は残ります。一方、設定されている場合は、過去に別 author が作成してオンチェーン登録された正当な提案も 20/200 件検索から消え、`unresolved` として停止します。現行 Sepolia の `wrangler.toml` には bot が設定されているため「未設定経路」は現在のデプロイ設定には該当しません / Snapshot モード全体で必須化するか、既存対応表の解決は author に依存せず `ProposalRegistered` イベントの文字列から ID を復元してください。ライブ前に稼働中の既存登録すべての author を照合する必要があります。
docs/audit-20-codex-raw.md:2563:- [問題なし・軽微な注記] / [register.js:129](/mnt/data/pnouns-voter/relayer-cf/src/register.js:129) / `regsent2` の3日 TTL は、提案当たり1キーなので通常の KV 容量・書込予算への影響は軽微です。古い成功記録も10分経過後に receipt を確認して削除され、再登録を恒久阻害しません。ただし成功後は autoRegister が呼ばれなくなるためキーは3日残り得ます。また「提案期間以上」というコメントは、コードが最大8日を許すことと一致しません。
docs/audit-20-codex-raw.md:2594:- author フィルタ無視・誤author混入・`SNAPSHOT_BOT` 未設定・過去の別author登録
docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/AUDIT-RESPONSE-2026-08-18.md:375:| 1 | **高** | 内容 4 項目しか検証せず、bot 単独で「本文は忠実だが投票不能」な提案(終了済み・未開始・別 type 等)を登録させ投票妨害できる | 修正: 候補の選別段階で author(=SNAPSHOT_BOT・env 必須化)・type=single-choice・start<=now<end・期間<=8日 を検査。envelope 署名の検証まではせず「ハブを信頼する運用前提」を明記(下記 #5) |
docs/AUDIT-RESPONSE-2026-08-18.md:382:| 8 | 中 | registrar 秘密鍵とオンチェーン registrar の一致を起動時検証していない | 修正: spaceCheck で rc.address == registrar() を fail-closed 検証。AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT を cfg レベルで必須化 |
docs/AUDIT-RESPONSE-2026-08-18.md:402:**判断**: 自動探索方式(register.js の autoRegister)は本番非採用とし、要修正のまま
docs/audit-16-codex-raw.md:2348:+   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-16-codex-raw.md:2455:+      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-16-codex-raw.md:2619:++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:2620:++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:2707:++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-16-codex-raw.md:3301:+    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:3302:+    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:5258:+    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-16-codex-raw.md:5922:+docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-16-codex-raw.md:8024:+++   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-16-codex-raw.md:8131:+++      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-16-codex-raw.md:8295:++++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:8296:++++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:8383:++++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-16-codex-raw.md:8977:+++    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:8978:+++    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:11238:+    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-16-codex-raw.md:11541:+   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-16-codex-raw.md:11612:+docs/audit-13-codex-raw.md:30:   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-16-codex-raw.md:11624:+docs/audit-13-codex-raw.md:137:      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-16-codex-raw.md:11636:+docs/audit-13-codex-raw.md:301:+  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:11637:+docs/audit-13-codex-raw.md:302:+  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:11694:+docs/audit-13-codex-raw.md:983:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-16-codex-raw.md:11695:+docs/audit-13-codex-raw.md:984:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-16-codex-raw.md:11842:+docs/audit-13-codex-raw.md:3604:docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-16-codex-raw.md:12037:+docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-16-codex-raw.md:12203:+   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-16-codex-raw.md:13480:      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-16-codex-raw.md:13520:+| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-17-codex-raw.md:3079:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-17-codex-raw.md:3080:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
scripts/create-and-register.mjs:62:  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
scripts/create-and-register.mjs:63:  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-13-codex-raw.md:30:   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-13-codex-raw.md:137:      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-13-codex-raw.md:301:+  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-13-codex-raw.md:302:+  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-13-codex-raw.md:389:+| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-13-codex-raw.md:983:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-13-codex-raw.md:984:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-13-codex-raw.md:2940:    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-13-codex-raw.md:3604:docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-15-codex-raw.md:551:++   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-15-codex-raw.md:658:++      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-15-codex-raw.md:822:+++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-15-codex-raw.md:823:+++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-15-codex-raw.md:910:+++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-15-codex-raw.md:1504:++    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-15-codex-raw.md:1505:++    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-15-codex-raw.md:4666:    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-15-codex-raw.md:4969:   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-15-codex-raw.md:5040:docs/audit-13-codex-raw.md:30:   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-15-codex-raw.md:5052:docs/audit-13-codex-raw.md:137:      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-15-codex-raw.md:5064:docs/audit-13-codex-raw.md:301:+  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-15-codex-raw.md:5065:docs/audit-13-codex-raw.md:302:+  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-15-codex-raw.md:5122:docs/audit-13-codex-raw.md:983:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-15-codex-raw.md:5123:docs/audit-13-codex-raw.md:984:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-15-codex-raw.md:5270:docs/audit-13-codex-raw.md:3604:docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-15-codex-raw.md:5465:docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-15-codex-raw.md:5631:   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-14-codex-raw.md:147:+   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-14-codex-raw.md:254:+      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-14-codex-raw.md:418:++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-14-codex-raw.md:419:++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-14-codex-raw.md:506:++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-14-codex-raw.md:1100:+    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-14-codex-raw.md:1101:+    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-14-codex-raw.md:3057:+    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-14-codex-raw.md:3721:+docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-14-codex-raw.md:7432:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-14-codex-raw.md:7433:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-14-codex-raw.md:7625:    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/audit-14-codex-raw.md:7819:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-14-codex-raw.md:7820:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-18-codex-raw.md:45:6. **worker への組み込み位置**: unresolvedIds との相互作用、autoRegister の例外が
docs/audit-18-codex-raw.md:90:    - cfg に AUTO_REGISTER/REGISTRAR_PRIVATE_KEY、clients に registrarClient、
docs/audit-18-codex-raw.md:129:+    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-18-codex-raw.md:130:+    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-18-codex-raw.md:140:+  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
docs/audit-18-codex-raw.md:141:+  return { publicClient, walletClient, account, registrarClient };
docs/audit-18-codex-raw.md:151:+// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY で有効)。
docs/audit-18-codex-raw.md:197:+/// 呼び出し条件(worker 側): snapshotSpace 設定済み・対応表なし・autoRegister 有効・registrar 鍵あり。
docs/audit-18-codex-raw.md:198:+export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-18-codex-raw.md:230:+import { autoRegister } from "./register.js";
docs/audit-18-codex-raw.md:239:+  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
docs/audit-18-codex-raw.md:248:+        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-18-codex-raw.md:249:+          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-18-codex-raw.md:271:+// ---- 登録係の Cloudflare 実装(autoRegister) ----
docs/audit-18-codex-raw.md:281:+  __setClientsForTests(() => ({ publicClient: pc, walletClient: null, registrarClient: registrar }));
docs/audit-18-codex-raw.md:283:+  const env = baseEnv(kv, { AUTO_REGISTER: "1", ...envOver });
docs/audit-18-codex-raw.md:295:+  F.hub = [{ proposals: [cand] }, { proposals: [cand] }]; // 1回目=対応表解決、2回目=autoRegister の候補探索
docs/audit-18-codex-raw.md:335:+AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
docs/audit-18-codex-raw.md:370:+// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY で有効)。
docs/audit-18-codex-raw.md:424:+/// 呼び出し条件(worker 側): snapshotSpace 設定済み・対応表なし・autoRegister 有効・registrar 鍵あり。
docs/audit-18-codex-raw.md:425:+export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-18-codex-raw.md:478:relayer-cf/test/worker-tick.test.mjs:416:  __setClientsForTests(() => ({ publicClient: pc, walletClient: null, registrarClient: registrar }));
docs/audit-18-codex-raw.md:489:relayer-cf/src/worker.js:448:  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
docs/audit-18-codex-raw.md:498:relayer-cf/src/worker.js:501:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-18-codex-raw.md:538:relayer-cf/src/register.js:1:// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY で有効)。
docs/audit-18-codex-raw.md:550:relayer-cf/src/register.js:47:/// 呼び出し条件(worker 側): snapshotSpace 設定済み・対応表なし・autoRegister 有効・registrar 鍵あり。
docs/audit-18-codex-raw.md:551:relayer-cf/src/register.js:48:export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-18-codex-raw.md:583:relayer-cf/src/chain.js:59:    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-18-codex-raw.md:585:relayer-cf/src/chain.js:95:  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
docs/audit-18-codex-raw.md:586:relayer-cf/src/chain.js:96:  return { publicClient, walletClient, account, registrarClient };
docs/audit-18-codex-raw.md:727:    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-18-codex-raw.md:728:    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-18-codex-raw.md:763:  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
docs/audit-18-codex-raw.md:764:  return { publicClient, walletClient, account, registrarClient };
docs/audit-18-codex-raw.md:1002:  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
docs/audit-18-codex-raw.md:1055:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-18-codex-raw.md:1056:          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-18-codex-raw.md:1273:  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-18-codex-raw.md:1274:  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-18-codex-raw.md:1716:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-18-codex-raw.md:1717:          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-18-codex-raw.md:2158:     1	// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY で有効)。
docs/audit-18-codex-raw.md:2204:    47	/// 呼び出し条件(worker 側): snapshotSpace 設定済み・対応表なし・autoRegister 有効・registrar 鍵あり。
docs/audit-18-codex-raw.md:2205:    48	export async function autoRegister(c, pc, registrar, store, notify, p) {
docs/audit-18-codex-raw.md:2307:   448	  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
docs/audit-18-codex-raw.md:2360:   501	        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
docs/audit-18-codex-raw.md:2361:   502	          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
docs/audit-18-codex-raw.md:2505:    59	    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
docs/audit-18-codex-raw.md:2506:    60	    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
docs/audit-18-codex-raw.md:2541:    95	  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
docs/audit-18-codex-raw.md:2542:    96	  return { publicClient, walletClient, account, registrarClient };
docs/audit-18-codex-raw.md:2709:rg -n \"REGISTRAR_PRIVATE_KEY|AUTO_REGISTER\" README.md docs relayer-cf scripts .github -g '*'" in /mnt/data/pnouns-voter
docs/audit-18-codex-raw.md:2745:- `author == EXPECTED_SNAPSHOT_BOT`
docs/audit-18-codex-raw.md:2898:残高監視もオンチェーンregistrarの残高を見ているため、実際に設定された `REGISTRAR_PRIVATE_KEY` のアドレスが異なる場合、その資金不足を検出できません。
docs/audit-18-codex-raw.md:2907:- `AUTO_REGISTER=1` ならregistrar key必須
docs/audit-18-codex-raw.md:2938:`autoRegister()` は提案単位の内側の`try/catch`で囲われているため、登録係のRPC・Hub・送信失敗は当該提案の登録処理だけに留まり、同tickの他提案処理は継続します。
docs/audit-18-codex-raw.md:3026:- autoRegister例外後も他提案を処理する
docs/audit-18-codex-raw.md:3080:- `author == EXPECTED_SNAPSHOT_BOT`
docs/audit-18-codex-raw.md:3233:残高監視もオンチェーンregistrarの残高を見ているため、実際に設定された `REGISTRAR_PRIVATE_KEY` のアドレスが異なる場合、その資金不足を検出できません。
docs/audit-18-codex-raw.md:3242:- `AUTO_REGISTER=1` ならregistrar key必須
docs/audit-18-codex-raw.md:3273:`autoRegister()` は提案単位の内側の`try/catch`で囲われているため、登録係のRPC・Hub・送信失敗は当該提案の登録処理だけに留まり、同tickの他提案処理は継続します。
docs/audit-18-codex-raw.md:3361:- autoRegister例外後も他提案を処理する
rg: .github: No such file or directory (os error 2)
docs/AUDIT-BRIEF-2.md
docs/AUDIT-BRIEF.md
docs/AUDIT-RESPONSE-2026-08-18.md
docs/RUNBOOK-MAINNET.md
docs/audit-10-codex-raw.md
docs/audit-11-codex-raw.md
docs/audit-12-codex-raw.md
docs/audit-13-codex-raw.md
docs/audit-14-codex-raw.md
docs/audit-15-codex-raw.md
docs/audit-16-codex-raw.md
docs/audit-17-codex-raw.md
docs/audit-18-codex-raw.md
docs/audit-20-codex-raw.md
docs/diagram/system-overview.svg
docs/member-doc1-current-ops.html
docs/member-doc2-pnouns-voter.html
docs/member-doc3-b3-plan.html
docs/member-proposal-unified.html
docs/qwen-review-2026-08-21.md
docs/report-2026-08-18.html
relayer-cf/src/abi.js
relayer-cf/src/chain.js
relayer-cf/src/index.js
relayer-cf/src/snap.js
relayer-cf/src/store.js
relayer-cf/src/worker.js
relayer-cf/test/accept-deadline.test.mjs
relayer-cf/test/cursor.test.mjs
relayer-cf/test/link-check.test.mjs
relayer-cf/test/worker-tick.test.mjs
scripts/check-deploy.mjs
scripts/compare-chains.js
scripts/create-and-register.mjs
scripts/lib/proposal-format.mjs
scripts/mainnet/deploy-snapvoter.js
scripts/sepolia/00-accounts.js
scripts/sepolia/01-deploy-pnouns.js
scripts/sepolia/02-buy-nouns.js
scripts/sepolia/03-deploy-voter.js
scripts/sepolia/04-delegate.js
scripts/sepolia/05-e2e.js
scripts/sepolia/06-propose.js
scripts/sepolia/07-sign-post.js
scripts/sepolia/08-mint-to.js
scripts/sepolia/09-submit-as-anyone.js
scripts/sepolia/10-register-ens.js
scripts/sepolia/12-deploy-snapvoter.js
scripts/sepolia/13-snap-e2e.js
scripts/sepolia/14-snap-setup-only.js
scripts/sepolia/15-reuse-snap.js
scripts/sepolia/16-cf-registrar-e2e.js
scripts/sepolia/_rehearse-keys.js
scripts/sepolia/_watch527.js
scripts/sepolia/ens-controller-abi.json
scripts/sepolia/lib.js
// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
//
// 使い方:
//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
import snapshot from "@snapshot-labs/snapshot.js";
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { buildProposal } from "./lib/proposal-format.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);

const NETWORK = process.env.NETWORK || "sepolia";
const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function nounsDescription(id) {
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
  const d = r?.data?.proposal?.description;
  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
  return d;
}
async function hubVotingPeriod() {
  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
  return r?.data?.space?.voting?.period || 172800;
}

async function main() {
  const nounsId = Number(arg("nouns"));
  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
  const description = await nounsDescription(descId);
  const p = buildProposal({ nounsId: descId, description });
  const period = await hubVotingPeriod();
  console.log(`space=${SPACE} network=${NETWORK}`);
  console.log(`title: ${p.title}`);
  console.log(`discussion: ${p.discussion}`);
  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }

  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
  const voter = dep.snapVoter || dep.voter;
  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);

  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
  const provider = new ethers.JsonRpcProvider(rpc);
  const code = await provider.getCode(voter);
  if (code === "0x") throw new Error(`${voter} にコントラクトがありません(deployments/${NETWORK}.json が古い可能性)`);
  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)"], provider);
  const [reg, own, existing] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId)]);
  const rAddr = registrarWallet.address.toLowerCase();
  if (rAddr !== reg.toLowerCase() && rAddr !== own.toLowerCase()) throw new Error(`registrar 鍵 ${registrarWallet.address} は registrar(${reg}) でも owner(${own}) でもなく、登録できません`);
  if (existing !== ethers.ZeroHash) throw new Error(`Nouns #${nounsId} には既に対応表が登録されています(${existing.slice(0, 18)}…)`);

  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const now = Math.floor(Date.now() / 1000);
  const client = new snapshot.Client712(SEQ);
  const receipt = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
    plugins: "{}", app: "pnouns-voter",
  });
  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);

  // 登録前の読み戻し検算(第17回監査の推奨): 作成した提案をハブから再取得し、
  // 「これから登録しようとしている対応」が提案の実体と一致することを確認してから登録する。
  // sequencer の応答(receipt.id)を無検証で registerProposal に渡さない。
  // ハブの索引反映に数秒かかるため、最大 90 秒リトライする。
  const expectedUrl = `https://nouns.wtf/vote/${nounsId}`;
  let verified = null;
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const rb = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${receipt.id}") { id space { id } discussion body choices state } }` }) })).json();
    const pr = rb?.data?.proposal;
    if (!pr) continue; // まだ索引されていない
    const problems = [];
    if (pr.space?.id !== SPACE) problems.push(`space 不一致: ${pr.space?.id}`);
    if (!String(pr.discussion || "").includes(expectedUrl) && !String(pr.body || "").includes(expectedUrl)) problems.push(`本文/URL が ${expectedUrl} を指していない`);
    if (JSON.stringify(pr.choices) !== JSON.stringify(p.choices)) problems.push(`choices 不一致: ${JSON.stringify(pr.choices)}`);
    if (problems.length) throw new Error(`読み戻し検算に失敗(登録を中止。Snapshot 提案 ${receipt.id} は孤児として残るため確認してください): ${problems.join(" / ")}`);
    verified = pr;
    break;
  }
  if (!verified) throw new Error(`ハブから提案 ${receipt.id} を 90 秒以内に読み戻せませんでした(登録を中止。ハブの遅延なら後で手動登録できます)`);
  console.log(`読み戻し検算 OK: space=${verified.space.id} / URL 一致 / choices 一致 → 登録します`);

  if (flag("skip-register")) { console.log("--skip-register: オンチェーン登録は行いません(Worker の自動登録に任せます)"); return; }
  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
  const w = registrarWallet.connect(provider);
  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
  const c = new ethers.Contract(voter, abi, w);
  const tx = await c.registerProposal(receipt.id, nounsId);
  await tx.wait();
  const delay = Number(await c.registrationDelayBlocks());
  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
// Snapshot 提案の内容を Nouns の提案からそのまま作る(要約・人の承認は行わない)
//  - title: [Prop N] <Nouns 提案のタイトル>
//  - body : Nouns 提案の Markdown 全文。上限を超える場合のみ末尾を切って案内を付ける
//  - discussion: https://nouns.wtf/vote/N
//  - choices: 賛成 / 反対 / 棄権(コントラクトが choice 1/2/3 をこの順で解釈する)
export const CHOICES = ["賛成", "反対", "棄権"];
// 通常スペースの本文上限は約 10,000 文字(実測で 11,273 の投稿を確認)。余裕を見て既定 9,500。
export const DEFAULT_BODY_LIMIT = 9500;

/// Markdown の 1 行目からタイトルを取り出す("# Title" → "Title")
export function extractTitle(description, fallbackId) {
  const first = String(description || "").split("\n").find((l) => l.trim()) || "";
  const t = first.replace(/^#+\s*/, "").trim();
  return t || `Proposal ${fallbackId}`;
}

/// 本文を上限内に収める。切る場合は「途中で切れている」ことと全文の場所を明示する
export function truncateBody(description, url, limit = DEFAULT_BODY_LIMIT) {
  const body = String(description || "").trim();
  if (body.length <= limit) return { body, truncated: false };
  const notice = `\n\n---\n\n**⚠️ 本文が長いため、ここで省略しています。全文は Nouns DAO の提案ページをご覧ください:**\n${url}\n`;
  // 途中の行で切れないよう、直前の改行までで切る
  const cut = body.slice(0, limit - notice.length);
  const lastBreak = cut.lastIndexOf("\n\n");
  const head = lastBreak > limit * 0.5 ? cut.slice(0, lastBreak) : cut;
  return { body: head.trimEnd() + notice, truncated: true };
}

export function buildProposal({ nounsId, description, limit = DEFAULT_BODY_LIMIT }) {
  const url = `https://nouns.wtf/vote/${nounsId}`;
  const title = `[Prop ${nounsId}] ${extractTitle(description, nounsId)}`;
  const { body, truncated } = truncateBody(description, url, limit);
  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
}
// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
// 監査対応:
//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
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
export async function hubGql(c, query) {
  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
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
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
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
  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
  if (missing.length) {
    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    const need = [];
    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    if (need.length) {
      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
      for (const n of need) {
        const p = byHash.get(n.hash);
        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
      }
    }
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
  if (Date.now() - lastErrNotify < 3600 * 1000) return;
  lastErrNotify = Date.now();
  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
}

let lastBalanceCheck = 0;
let spaceCheckedAt = 0;

// ---- テスト用フック(本番経路では未使用) ----
// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
let _clients = clients;
export function __setClientsForTests(f) { _clients = f || clients; }
export function __resetWorkerStateForTests(o = {}) {
  lastErrNotify = o.errNotifiedAt ?? 0;
  lastBalanceCheck = o.balanceCheckedAt ?? 0;
  spaceCheckedAt = o.spaceCheckedAt ?? 0;
}
const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = _clients(c);
  const store = makeStore(env.STATE, storeNs(c));
  try {
    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
    const { block, proposals } = await recentProposals(c, pc);
    await reconcileRecent(c, pc, wc, store, proposals);
    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
    let snapByNouns = new Map();
    let unresolvedIds = new Set();
    let mappingsResolved = false;
    if (c.snapshotSpace) {
      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
        ], allowFailure: false });
        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
        if (c.network === "mainnet") {
          const relayerAddr = wc?.account?.address || null;
          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
        }
        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
        spaceCheckedAt = Date.now();
      }
      try {
        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
        const { mappings, unresolved } = await resolveMappings(c, pc, active);
        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
        unresolvedIds = new Set((unresolved || []).map(Number));
        mappingsResolved = true;
      }
      catch (e) { await notifyError(c, "snapshot hub", e); }
      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
      // 最終結果として確定してしまう。
      if (!mappingsResolved) return;
    }
    for (const p of proposals) {
      if (p.state !== 0 && p.state !== 1) continue;
      try {
        const snapInfo = snapByNouns.get(p.id) || null;
        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
          if (!(await store.getFlag(`unresolved:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
          }
          continue;
        }
        const mg = await metagovInfo(c, pc, p.id);
        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
        }
        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
        let timelineBad = false;
        if (c.snapshotSpace && snapInfo) {
          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
          }
        }
        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
        let graceBad = false;
        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
          }
        }
        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
        // 「告知済み」が記録されて正しい URL の再告知も止まる。
        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
          await announceNew(c, pc, store, p, block, snapInfo);
        }
        if (linkBad && c.network === "mainnet") continue;
        if (timelineBad && c.network === "mainnet") continue;
        if (graceBad && c.network === "mainnet") continue;
        if (!wc) continue;

exec
/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,360p'
nl -ba docs/RUNBOOK-MAINNET.md | sed -n '1,190p'
find .github -maxdepth 3 -type f -print -exec sh -c 'echo FILE:"'$1; nl -ba "$1" | sed -n "1,260p"'"' _ {} \\; 2>/dev/null
cat package.json
cat relayer-cf/package.json" in /mnt/data/pnouns-voter
 succeeded in 0ms:
     1	// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
     2	// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
     3	//
     4	// 使い方:
     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
     8	// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
     9	import snapshot from "@snapshot-labs/snapshot.js";
    10	import { ethers } from "ethers";
    11	import fs from "node:fs";
    12	import path from "node:path";
    13	import { buildProposal } from "./lib/proposal-format.mjs";
    14	
    15	const ROOT = path.resolve(import.meta.dirname, "..");
    16	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    17	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    18	}
    19	const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
    20	const flag = (k) => process.argv.includes(`--${k}`);
    21	
    22	const NETWORK = process.env.NETWORK || "sepolia";
    23	const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
    24	const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
    25	const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
    26	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
    27	const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
    28	
    29	async function nounsDescription(id) {
    30	  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
    31	  const d = r?.data?.proposal?.description;
    32	  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
    33	  return d;
    34	}
    35	async function hubVotingPeriod() {
    36	  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
    37	  return r?.data?.space?.voting?.period || 172800;
    38	}
    39	
    40	async function main() {
    41	  const nounsId = Number(arg("nouns"));
    42	  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
    43	  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
    44	  const description = await nounsDescription(descId);
    45	  const p = buildProposal({ nounsId: descId, description });
    46	  const period = await hubVotingPeriod();
    47	  console.log(`space=${SPACE} network=${NETWORK}`);
    48	  console.log(`title: ${p.title}`);
    49	  console.log(`discussion: ${p.discussion}`);
    50	  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
    51	  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
    52	  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
    53	
    54	  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
    55	  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
    56	  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    57	  const voter = dep.snapVoter || dep.voter;
    58	  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
    59	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    60	  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
    61	  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
    64	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
    65	  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
    66	  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
    67	  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
    68	  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
    69	  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
    70	
    71	  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
    72	  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
    73	  const provider = new ethers.JsonRpcProvider(rpc);
    74	  const code = await provider.getCode(voter);
    75	  if (code === "0x") throw new Error(`${voter} にコントラクトがありません(deployments/${NETWORK}.json が古い可能性)`);
    76	  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)"], provider);
    77	  const [reg, own, existing] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId)]);
    78	  const rAddr = registrarWallet.address.toLowerCase();
    79	  if (rAddr !== reg.toLowerCase() && rAddr !== own.toLowerCase()) throw new Error(`registrar 鍵 ${registrarWallet.address} は registrar(${reg}) でも owner(${own}) でもなく、登録できません`);
    80	  if (existing !== ethers.ZeroHash) throw new Error(`Nouns #${nounsId} には既に対応表が登録されています(${existing.slice(0, 18)}…)`);
    81	
    82	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
    83	  const now = Math.floor(Date.now() / 1000);
    84	  const client = new snapshot.Client712(SEQ);
    85	  const receipt = await client.proposal(adapt(bot), bot.address, {
    86	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    87	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
    88	    plugins: "{}", app: "pnouns-voter",
    89	  });
    90	  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
    91	
    92	  // 登録前の読み戻し検算(第17回監査の推奨): 作成した提案をハブから再取得し、
    93	  // 「これから登録しようとしている対応」が提案の実体と一致することを確認してから登録する。
    94	  // sequencer の応答(receipt.id)を無検証で registerProposal に渡さない。
    95	  // ハブの索引反映に数秒かかるため、最大 90 秒リトライする。
    96	  const expectedUrl = `https://nouns.wtf/vote/${nounsId}`;
    97	  let verified = null;
    98	  for (let i = 0; i < 18; i++) {
    99	    await new Promise((r) => setTimeout(r, 5000));
   100	    const rb = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${receipt.id}") { id space { id } discussion body choices state } }` }) })).json();
   101	    const pr = rb?.data?.proposal;
   102	    if (!pr) continue; // まだ索引されていない
   103	    const problems = [];
   104	    if (pr.space?.id !== SPACE) problems.push(`space 不一致: ${pr.space?.id}`);
   105	    if (!String(pr.discussion || "").includes(expectedUrl) && !String(pr.body || "").includes(expectedUrl)) problems.push(`本文/URL が ${expectedUrl} を指していない`);
   106	    if (JSON.stringify(pr.choices) !== JSON.stringify(p.choices)) problems.push(`choices 不一致: ${JSON.stringify(pr.choices)}`);
   107	    if (problems.length) throw new Error(`読み戻し検算に失敗(登録を中止。Snapshot 提案 ${receipt.id} は孤児として残るため確認してください): ${problems.join(" / ")}`);
   108	    verified = pr;
   109	    break;
   110	  }
   111	  if (!verified) throw new Error(`ハブから提案 ${receipt.id} を 90 秒以内に読み戻せませんでした(登録を中止。ハブの遅延なら後で手動登録できます)`);
   112	  console.log(`読み戻し検算 OK: space=${verified.space.id} / URL 一致 / choices 一致 → 登録します`);
   113	
   114	  if (flag("skip-register")) { console.log("--skip-register: オンチェーン登録は行いません(Worker の自動登録に任せます)"); return; }
   115	  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
   116	  const w = registrarWallet.connect(provider);
   117	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
   118	  const c = new ethers.Contract(voter, abi, w);
   119	  const tx = await c.registerProposal(receipt.id, nounsId);
   120	  await tx.wait();
   121	  const delay = Number(await c.registrationDelayBlocks());
   122	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
   123	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
   124	}
   125	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
     1	# mainnet 移行 runbook (pNouns Voter)
     2	
     3	第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
     4	Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
     5	
     6	## 0. 前提
     7	
     8	- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
     9	- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
    10	
    11	## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵
    12	
    13	| 役割 | 鍵 | 保管 | 資金 |
    14	|---|---|---|---|
    15	| owner | **当初**: 現行の委任アドレス(アールグレイ管理・0.111 ETH 保有) → **安定稼働後に pNouns マルチシグへ移管**(2026-08-21 決定) | 当初はローカル、移管後はマルチシグ | 不要 |
    16	| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
    17	| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
    19	
    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
    21	同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。
    22	
    23	## 2. デプロイ (liveMode=false で開始)
    24	
    25	```bash
    26	OWNER=0x<当初は委任アドレス> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
    27	REG_DELAY=10 MARGIN=7200 \
    28	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
    29	```
    30	
    31	(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
    32	
    33	- `REG_DELAY=10` (約 2 分)。登録の tick と受付開始の tick を分けるための最小間隔(通常運用では受付前に自動照合が走るが、cron 遅延等があるためコード上の保証ではない)。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
    34	- `MARGIN=7200` (約 24 時間 — 決定済みの運用値。締切 = Nouns 投票終了の 24 時間前)
    35	- `OWNER` は当初、現行の委任アドレス(手順 7 で安定稼働後にマルチシグへ移管する。**移管を忘れないこと** — check-deploy の EXPECT_OWNER をマルチシグに切り替えて照合する)
    36	- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
    37	- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
    38	- Sourcify でソース検証 → exact_match を確認
    39	
    40	## 3. 機械照合(段階ごとに実行する)
    41	
    42	`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
    43	**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**
    44	
    45	```bash
    46	ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
    47	     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> \
    48	     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=7200"
    49	# (シェルの制約上、変数展開をコマンドとして実行できないため env を前置する)
    50	# 手順 2 の後:            env $ENV node scripts/check-deploy.mjs --stage deployed
    51	# 手順 4 の後:            env $ENV node scripts/check-deploy.mjs --stage worker
    52	# プール入金の後:         env $ENV node scripts/check-deploy.mjs --stage funded
    53	# 手順 6-1(委任)の後:     env $ENV node scripts/check-deploy.mjs --stage delegated
    54	# 手順 6-3(live 化)の後:  env $ENV node scripts/check-deploy.mjs --stage live
    55	```
    56	
    57	mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
    58	あることも確認される(先走りの live 化を検出)。Worker のデプロイ直後は伝搬遅延で
    59	旧版の応答が返ることがある — その場合は 1 分待って再実行する。
    60	
    61	## 4. Worker (Cloudflare) 設定
    62	
    63	```bash
    64	cd relayer-cf
    65	# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
    66	npx wrangler kv namespace create STATE --env mainnet
    67	npx wrangler deploy --env mainnet
    68	npx wrangler secret put RPC_URL --env mainnet
    69	npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
    70	npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
    71	```
    72	
    73	- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
    74	- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
    75	
    76	## 5. シャドー運用 (liveMode=false)
    77	
    78	- 委任アドレス(0.111 ETH 保有)から 3 箇所へ送金(トレジャリーの新規支出なし):
    79	  プール(コントラクト自体) 0.05 ETH / relayer 0.01 ETH / registrar 0.005 ETH = 計 0.065 ETH。
    80	  残り約 0.046 ETH は委任アドレス(当初 owner)の管理操作用に残す
    81	- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
    82	  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
    83	- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
    84	
    85	## 6. 委任切替 → 本番化 (この順のみ)
    86	
    87	1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
    88	2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
    89	3. owner(当初は委任アドレス)から `setLiveMode(true)`(マルチシグ移管後は マルチシグから)
    90	4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
    91	
    92	## 6.5 管理者権限のマルチシグ移管(安定稼働後)
    93	
    94	本番で数提案が問題なく流れたら:
    95	
    96	1. 委任アドレスから `transferOwnership(マルチシグ)` を送信し、採掘を確認
    97	2. `env $ENV node scripts/check-deploy.mjs --stage live` を **EXPECT_OWNER=マルチシグ** で再実行し✅を確認
    98	3. 以後、緊急停止・sweep・鍵交代はマルチシグ承認が必要になる(単独では不可)
    99	
   100	## 7. ロールバック(この順で)
   101	
   102	1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
   103	2. マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
   104	3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
   105	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
   106	5. 未処理の状態を確認: 投函待ちの票・pending の execute が残っていないか(`/api/proposals`、KV)
   107	6. 誤登録が原因なら、票が入る前に `unregisterProposal`
   108	7. `sweep(トレジャリー)` → プール残額を回収
   109	8. 鍵の漏洩が疑われる場合: relayer secret・Discord webhook をローテーション、`setRegistrar` で差し替え
   110	
   111	## 8. 障害時
   112	
   113	- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
   114	  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
   115	- 誤登録の疑い: **解禁前、または解禁後でも `snapshotVotesAccepted == 0` の間**は registrar/owner から
   116	  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
   117	  食い違う間は Worker は投函しない)。第三者の直接投函で 1 票でも受理されたら取消不能 →
   118	  `setLiveMode(false)` + 当該議案は手動投票へ
   119	- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
   120	  (再登録すると猶予がその時点から再カウントされ、さらに遅くなる)。この提案は自動反映を
   121	  諦め、**手動運用に切り替える**(従来どおり委任元から手動投票)。締切時に未反映の票が
   122	  残った場合(backlogwarn 警告)も同様に、自動 execute は止まるので手動で判断する
   123	- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
   124	
   125	## 9. 停止対応の実効性確認(第17回監査の推奨)
   126	
   127	最後の防壁が「管理者が締切前に停止できること」である以上、次を本番前に実施する:
   128	
   129	- **停止訓練**: マルチシグ移管後、`setLiveMode(false)` の提案 → 必要署名 → 採掘までの
   130	  所要時間を実測し、内部締切(margin 24h)に対して十分短いことを確認する
   131	- **停止 SLA**: 夜間・週末の対応者と必要署名者数を決めておく
   132	- **登録前の読み戻し検算**: create-and-register は Snapshot 提案をハブから再取得し、
   133	  space・本文 URL・choices の一致を確認してから registerProposal を呼ぶ(実装済み)。
   134	  検算失敗時は登録せずに中止する(孤児提案は残るため手動確認)
   135	
   136	## 10. デプロイの透明性(公開時に設定)
   137	
   138	リポジトリ公開後、Worker のデプロイは GitHub Actions 経由(`wrangler deploy` を CI で実行)に
   139	切り替える。これにより「どのコミットをいつ Cloudflare に配備したか」の公開実行ログが残り、
   140	実行コードとリポジトリの対応が(暗号学的な証明ではないが)追跡可能になる。
   141	
   142	
   143	## 11. 対応表の登録運用(確定引き継ぎ方式)
   144	
   145	対応表(Snapshot 提案 = Nouns 第 N 号)の登録は、**提案を作成した処理が、作成した Snapshot
   146	提案 ID をそのまま登録する**方式に一本化する(scripts/create-and-register.mjs)。
   147	Cloudflare の Worker からハブを探索して登録する方式は、探索の曖昧さ(複数候補・範囲外・
   148	author フィルタの信頼性)が繰り返し監査指摘を生んだため採用しない(第18-20回監査)。
   149	
   150	- 実行場所: GitHub Actions(bot の作成ジョブに続けて登録まで行う)。自宅 PC 非依存。
   151	- registrar の鍵は GitHub の secret に置き、Cloudflare には置かない
   152	  (運ぶ人=Cloudflare、作る+登録する人=GitHub の分離)。
   153	- create-and-register は送信前に鍵・権限・未登録を確認し、作成後・登録前に
   154	  Snapshot から提案を読み戻して内容(space/URL/choices)一致を検証する(第17回監査)。
   155	- Cloudflare の Worker は登録には関与せず、対応表を読んで照合・投函・execute のみ行う。
{
  "name": "pnouns-metagov",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^6.1.2",
    "@openzeppelin/contracts": "^5.6.1",
    "dotenv": "^17.4.2",
    "hardhat": "^2.29.0",
    "@snapshot-labs/snapshot.js": "^0.17.0"
  },
  "dependencies": {
    "express": "^5.2.1"
  }
}{
  "name": "pnouns-metagov-relayer-cf",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}

codex
現時点で重要な運用不一致が見えています。リポジトリ内に GitHub Actions workflow が見当たらず、スクリプトも起動時に `.env` を無条件で読むため、RUNBOOK §11 の「GitHub Actions で実行」は現状そのままでは成立しない可能性があります。ここはファイル実在、鍵の注入方法、コントラクトの二重登録防止まで証拠を詰めます。あわせて指定のテストを実行します。
exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 855ms:
✔ test/accept-deadline.test.mjs (750.634457ms)
✔ test/cursor.test.mjs (750.288559ms)
✔ test/link-check.test.mjs (748.001682ms)
✔ test/worker-tick.test.mjs (792.925459ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 808.20547

exec
/bin/bash -lc "git log --oneline --decorate -30
ls -la . .github 2>&1 | sed -n '1,160p'
git ls-files | rg '("'^|/)'"\\.env("'$|'"\\.)|"'^'"\\.github/|create-and-register|SnapVoter|snapvoter|member-proposal-unified|RUNBOOK'
rg -n 'function registerProposal|registerProposal\\(|AlreadyRegistered|nounsToSnap|snapToNouns|unregisterProposal' contracts test scripts relayer-cf/src relayer-cf/test -g '"'!**/node_modules/**'"'
rg -n 'create-and-register|SNAPSHOT_BOT_MNEMONIC|REGISTRAR_MNEMONIC|skip-register|dry-run' . -g '"'!node_modules/**'"' -g '"'!docs/audit-*-raw.md'"'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
047d8aa (HEAD -> main) 登録係を確定引き継ぎ方式に一本化(ユーザー決定): Cloudflare 探索方式を撤去
3e1521d 第19-20回監査を記録: 登録係の自動探索方式は未クローズ(方針再検討)
2bc1ddc 第19回監査(Codex)対応: 自動登録の残存 4 件を修正、資料の照合記述を整合
78225a9 第18回監査(Codex)対応: 自動登録の必須修正 7 件 + 低 2 件を実装
0467988 資料: 「以前の案では」の経緯記述を削除、デプロイ透明性の緩和策を追記
39df9c0 資料修正 6 点 + 登録係の Cloudflare 実装(内容一致検証つき自動登録)
ca3daeb 資料 §8: 監査回数を 17 回・指摘 101 件に更新、Qwen 独立レビューを追記
cb22af7 第17回 Codex + Qwen 独立確認の完了を記録、資料に微修正 1 件
cca91f7 第17回監査(Codex)対応: 登録前の読み戻し検算を実装ほか
d23ed75 第16回監査(Codex)対応: 猶予短縮の資料主張を訂正・限界を明記
e152a34 登録猶予を 24 時間 → 10 ブロック(約 2 分)へ短縮(ユーザー決定)
56eb3c4 資料 §4: 譲受人の投票可否の誤りを訂正 + 基本ルールを冒頭に明示
346af31 資料 §4: 「反映」の定義と、票が反映されない可能性の正直な一覧を新設
ba59ad9 資料 §4: 投票後に NFT を移転した場合の挙動を追記
5ac8a1f 資料: 「対応表」の定義を初出前(登録係カード)に追加
e346b58 資料修正 7 点: 日本語要約の記載整理・コントロール主体の明確化・折りたたみ廃止ほか
cb3ff2d Codex 作成の仕組み図解(SVG)を追加
b1ac188 Qwen(ローカル LLM)による独立検証を実施・記録し、資料指摘 5 件を反映
507f92c Codex による資料検証・修正 24 件を採用 + 要確認 2 件を解決
7b0cdd3 資料 §2 の長文 3 段落を構造化 + 第三者向けの文脈補足
0998d86 資料 §2: 4 つの鍵の表をカード形式に変更(5 列で各列が狭すぎたため)
8b9f134 資料 §2: リレイヤー鍵漏洩でも払い戻しを悪用できない理由を追記
fb68b68 資料/runbook: 本番の送金 3 箇所の明記と、登録係に払い戻しを付けない理由
5b824ac 登録係の残高監視を追加 + 資料にガス保有と鍵の現在地の注記
d3472c2 資料修正 5 点: EIP-1271 の自動応答・§5 表の整理・残高切れの明確化・役割分離の理由・公開表に GitHub 追加
64a4be5 資料の明確化 8 点: EIP-1271 の問い合わせ先・暗号説明の再構成・運び屋の具体化ほか
81c8960 資料§3に折りたたみ 2 つを追加: 検証の仕組みの詳解と暗号の堅牢性
5d36adc 資料§7ほか改訂: ETH併記・手作業時間の根拠明示・プール所在とガス原資の方針・管理者の段階移管
980f0cb 資料全面改訂: 事実の更新・検証手引きの追加・レイアウト刷新 + margin を決定値 24h に統一
c7aecd6 第15回監査(Codex)対応: 締切時の未反映票を検出する最終防壁を追加
ls: cannot access '.github': No such file or directory
.:
total 474
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 21 08:12 .
drwxrwxrwx 1 earlgrey earlgrey  20480 Aug 18 19:38 ..
-rwxrwxrwx 1 earlgrey earlgrey    817 Aug 20 23:18 .env
-rwxrwxrwx 1 earlgrey earlgrey     59 Aug 18 09:36 .env.example
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 21 12:28 .git
-rwxrwxrwx 1 earlgrey earlgrey    125 Aug 18 13:55 .gitignore
-rwxrwxrwx 1 earlgrey earlgrey  12990 Aug 20 18:06 README.md
drwxrwxrwx 1 earlgrey earlgrey      0 Aug 18 09:31 artifacts
drwxrwxrwx 1 earlgrey earlgrey      0 Aug 18 09:32 cache
drwxrwxrwx 1 earlgrey earlgrey      0 Aug 20 13:43 contracts
drwxrwxrwx 1 earlgrey earlgrey      0 Aug 18 15:43 deploy
drwxrwxrwx 1 earlgrey earlgrey      0 Aug 18 09:58 deployments
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 21 12:18 docs
-rwxrwxrwx 1 earlgrey earlgrey   1384 Aug 20 23:33 hardhat.config.js
drwxrwxrwx 1 earlgrey earlgrey  69632 Aug 20 11:52 node_modules
-rwxrwxrwx 1 earlgrey earlgrey 337864 Aug 20 11:52 package-lock.json
-rwxrwxrwx 1 earlgrey earlgrey    512 Aug 20 13:46 package.json
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 18 15:44 relayer
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 20 21:31 relayer-cf
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 21 01:22 scripts
drwxrwxrwx 1 earlgrey earlgrey   4096 Aug 20 18:33 test
.env.example
contracts/PNounsSnapVoter.sol
docs/RUNBOOK-MAINNET.md
docs/member-proposal-unified.html
scripts/create-and-register.mjs
scripts/mainnet/deploy-snapvoter.js
scripts/sepolia/12-deploy-snapvoter.js
relayer-cf/test/worker-tick.test.mjs:88:    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
relayer-cf/test/worker-tick.test.mjs:89:    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
relayer-cf/test/worker-tick.test.mjs:222:    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
test/snap.fork.test.js:82:    await voterC.registerProposal(SNAP_989, 989);
test/snap.fork.test.js:112:      await voterC.registerProposal(SNAP_TEST, proposalId);
test/snap.fork.test.js:179:      await voterC.registerProposal(snap, id);
test/snap.fork.test.js:217:      await voterC.registerProposal(SNAP_X, 999999);
test/snap.fork.test.js:222:      await voterC.unregisterProposal(999999);
test/snap.fork.test.js:223:      await voterC.registerProposal(SNAP_X, 999998);
test/snap.fork.test.js:224:      expect(await voterC.snapToNouns(ethers.keccak256(ethers.toUtf8Bytes(SNAP_X)))).to.equal(999998n);
test/snap.fork.test.js:227:      await expect(voterC.unregisterProposal(proposalId)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
test/snap.fork.test.js:233:      await voterC.registerProposal(SNAP_Z, 777777);
test/snap.fork.test.js:246:      await voterC.unregisterProposal(777777).catch(() => {});
test/snap.fork.test.js:252:      await voterC.registerProposal(SNAP_A, 666666);
test/snap.fork.test.js:254:      await voterC.unregisterProposal(666666);
test/snap.fork.test.js:257:      await voterC.registerProposal(SNAP_B, 666666); // 別の Snapshot 提案に張り替え
test/snap.fork.test.js:261:      await voterC.unregisterProposal(666666);
test/snap.fork.test.js:269:      await voterC.registerProposal(SNAP_Y, 888888);
test/snap.fork.test.js:280:      await voterC.unregisterProposal(888888); // 妨害されずに取消できる
test/snap.fork.test.js:286:      await voterC.unregisterProposal(pid4); // 直接投票は取消を妨げない
test/snap.fork.test.js:287:      expect(await voterC.nounsToSnap(pid4)).to.equal(ethers.ZeroHash);
test/snap.fork.test.js:311:      await expect(voterC.unregisterProposal(pid5)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
relayer-cf/src/snap.js:84:      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
relayer-cf/src/snap.js:89:  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
relayer-cf/src/snap.js:93:    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
contracts/PNounsSnapVoter.sol:95:    mapping(bytes32 => uint256) public snapToNouns;
contracts/PNounsSnapVoter.sol:97:    mapping(uint256 => bytes32) public nounsToSnap;
contracts/PNounsSnapVoter.sol:129:    error AlreadyRegistered();
contracts/PNounsSnapVoter.sol:179:    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:182:        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
contracts/PNounsSnapVoter.sol:184:        snapToNouns[h] = nounsProposalId;
contracts/PNounsSnapVoter.sol:185:        nounsToSnap[nounsProposalId] = h;
contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:196:        bytes32 h = nounsToSnap[nounsProposalId];
contracts/PNounsSnapVoter.sol:199:        delete snapToNouns[h];
contracts/PNounsSnapVoter.sol:200:        delete nounsToSnap[nounsProposalId];
contracts/PNounsSnapVoter.sol:256:        uint256 nounsId = snapToNouns[firstProp];
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
relayer-cf/src/abi.js:6: {"inputs": [], "name": "AlreadyRegistered", "type": "error"},
relayer-cf/src/abi.js:392:  "name": "nounsToSnap",
relayer-cf/src/abi.js:506:  "name": "snapToNouns",
scripts/sepolia/16-cf-registrar-e2e.js:55:    const [mapped, blk] = await Promise.all([c.snapToNouns(h), ethers.provider.getBlockNumber()]);
scripts/create-and-register.mjs:76:  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)"], provider);
scripts/create-and-register.mjs:77:  const [reg, own, existing] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId)]);
scripts/create-and-register.mjs:117:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
scripts/create-and-register.mjs:119:  const tx = await c.registerProposal(receipt.id, nounsId);
scripts/sepolia/15-reuse-snap.js:18:  await (await c.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/14-snap-setup-only.js:34:  await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
scripts/sepolia/13-snap-e2e.js:75:  await (await snapVoter.registerProposal(snapId, nounsId)).wait();
./docs/RUNBOOK-MAINNET.md:16:| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
./docs/RUNBOOK-MAINNET.md:18:| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
./docs/RUNBOOK-MAINNET.md:20:**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/RUNBOOK-MAINNET.md:105:4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/RUNBOOK-MAINNET.md:132:- **登録前の読み戻し検算**: create-and-register は Snapshot 提案をハブから再取得し、
./docs/RUNBOOK-MAINNET.md:146:提案 ID をそのまま登録する**方式に一本化する(scripts/create-and-register.mjs)。
./docs/RUNBOOK-MAINNET.md:153:- create-and-register は送信前に鍵・権限・未登録を確認し、作成後・登録前に
./docs/AUDIT-RESPONSE-2026-08-18.md:90:再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
./docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
./docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
./docs/AUDIT-RESPONSE-2026-08-18.md:237:create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/AUDIT-RESPONSE-2026-08-18.md:289:2. create-and-register 後、対応表・registeredAtBlock・eligibleAtBlock が期待値
./docs/AUDIT-RESPONSE-2026-08-18.md:358:(create-and-register がハブから提案を再取得し space/URL/choices を照合してから登録。
./scripts/create-and-register.mjs:5://   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./scripts/create-and-register.mjs:6://   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./scripts/create-and-register.mjs:7://   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./scripts/create-and-register.mjs:52:  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
./scripts/create-and-register.mjs:62:  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
./scripts/create-and-register.mjs:63:  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
./scripts/create-and-register.mjs:64:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
./scripts/create-and-register.mjs:65:  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
./scripts/create-and-register.mjs:114:  if (flag("skip-register")) { console.log("--skip-register: オンチェーン登録は行いません(Worker の自動登録に任せます)"); return; }
./scripts/sepolia/_rehearse-keys.js:16:  if (!env.includes("REGISTRAR_MNEMONIC=")) {
./scripts/sepolia/_rehearse-keys.js:19:    env += `\n# Sepolia リハーサル用(2026-08-20 生成、実資産なし): registrar / relayer の分離鍵\nREGISTRAR_MNEMONIC="${reg.mnemonic.phrase}"\nSEPOLIA_RELAYER_KEY=${relay.privateKey}\n`;
./scripts/sepolia/_rehearse-keys.js:25:    regAddr = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC, undefined, "m/44'/60'/0'/0/0").address;

exec
/bin/bash -lc "nl -ba contracts/PNounsSnapVoter.sol | sed -n '110,220p'
git diff c7aecd6..047d8aa -- relayer-cf/src relayer-cf/test ':"'!relayer-cf/src/register.js'"' ':"'!relayer-cf/test/format-equivalence.test.mjs'"' | sed -n '1,300p'
git diff c7aecd6..39df9c0 -- relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/wrangler.toml
stat -c '%a %n' .env .env.example
cat .gitignore
rg -n 'class Client712|proposal\\(' node_modules/@snapshot-labs/snapshot.js -g '*.js' | sed -n '1,100p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   110	        string metadata;
   111	        bytes signature;
   112	        uint256[] tokenIds; // リレイヤーが添える投票者の保有 tokenId(所有はコントラクトが検証)
   113	    }
   114	
   115	    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
   116	    event ProposalUnregistered(uint256 indexed nounsProposalId, bytes32 snapHash);
   117	    event RegistrationDelaySet(uint256 blocks_);
   118	    event SnapVoteCounted(uint256 indexed nounsProposalId, address indexed voter, uint8 support, uint32 counted, uint64 timestamp, bool revote);
   119	    event Executed(uint256 indexed proposalId, uint8 support, uint256[3] tokens, uint256[3] voters, bool live);
   120	    event ExcludedSet(address indexed account, bool isExcluded);
   121	    event MarginBlocksSet(uint256 marginBlocks);
   122	    event LiveModeSet(bool live);
   123	    event RegistrarSet(address registrar);
   124	    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
   125	    event RefundEnabledSet(bool enabled);
   126	    event RefundCapPerProposalSet(uint256 cap);
   127	
   128	    error NotRegistrar();
   129	    error AlreadyRegistered();
   130	    error NotRegistered();
   131	    error InvalidChoice();
   132	    error WrongSpace();
   133	    error FromMismatch();
   134	    error NoTokenIds();
   135	    error ProposalNotVotable(uint8 state);
   136	    error VotingClosed();
   137	    error VotingNotClosed();
   138	    error StaleVote();
   139	    error RegistrationTooRecent();
   140	    error InvalidSpace();
   141	    error VotesAlreadyCounted();
   142	    error InvalidFromAddress();
   143	    error InvalidContractSignature();
   144	    error NotTokenOwner(uint256 tokenId, address owner);
   145	    error ExcludedVoter(address voter);
   146	    error NothingCounted();
   147	    error AlreadyExecuted();
   148	    error NoVotes();
   149	    error MixedProposals();
   150	
   151	    constructor(
   152	        address pnouns_, address nounsDAO_, address owner_, address registrar_,
   153	        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
   154	    ) Ownable(owner_) {
   155	        pnouns = IERC721(pnouns_);
   156	        nounsDAO = INounsDAO(nounsDAO_);
   157	        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
   158	        spaceHash = keccak256(bytes(space_));
   159	        space = space_;
   160	        registrar = registrar_;
   161	        marginBlocks = marginBlocks_;
   162	        registrationDelayBlocks = registrationDelayBlocks_;
   163	        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
   164	    }
   165	
   166	    // ---- 設定 ----
   167	    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
   168	    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
   169	    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
   170	    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
   173	    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
   174	    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
   175	    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
   176	    receive() external payable {}
   177	
   178	    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
   179	    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
   180	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
   181	        bytes32 h = keccak256(bytes(snapshotProposal));
   182	        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
   183	        if (nounsProposalId == 0) revert NotRegistered();
   184	        snapToNouns[h] = nounsProposalId;
   185	        nounsToSnap[nounsProposalId] = h;
   186	        registeredAtBlock[nounsProposalId] = block.number;
   187	        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
   188	        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
   190	        emit ProposalRegistered(nounsProposalId, snapshotProposal);
   191	    }
   192	
   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
   194	    function unregisterProposal(uint256 nounsProposalId) external {
   195	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
   196	        bytes32 h = nounsToSnap[nounsProposalId];
   197	        if (h == bytes32(0)) revert NotRegistered();
   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
   199	        delete snapToNouns[h];
   200	        delete nounsToSnap[nounsProposalId];
   201	        delete registeredAtBlock[nounsProposalId];
   202	        delete eligibleAtBlock[nounsProposalId];
   203	        emit ProposalUnregistered(nounsProposalId, h);
   204	    }
   205	
   206	    // ---- 参照 ----
   207	    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
   208	        Tally storage t = _tallies[proposalId];
   209	        (tokens, voters) = _arrays(t);
   210	        return (tokens, voters, t.executed, t.result);
   211	    }
   212	    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
   213	        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
   214	    }
   215	    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }
   216	
   217	    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
   218	        (bool ok, bytes memory data) = address(nounsDAO).staticcall(abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId));
   219	        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
   220	        uint256 id; uint256 startBlock; uint256 endBlock;
diff --git a/relayer-cf/src/abi.js b/relayer-cf/src/abi.js
index 77f6fe8..6ffaf0a 100644
--- a/relayer-cf/src/abi.js
+++ b/relayer-cf/src/abi.js
@@ -451,6 +451,16 @@ export const METAGOV_ABI = [
   "stateMutability": "view",
   "type": "function"
  },
+ {
+  "inputs": [
+   { "internalType": "string", "name": "snapshotProposal", "type": "string" },
+   { "internalType": "uint256", "name": "nounsProposalId", "type": "uint256" }
+  ],
+  "name": "registerProposal",
+  "outputs": [],
+  "stateMutability": "nonpayable",
+  "type": "function"
+ },
  {
   "inputs": [],
   "name": "owner",
diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
index 95a55e0..fb0a9d7 100644
--- a/relayer-cf/src/chain.js
+++ b/relayer-cf/src/chain.js
@@ -51,7 +51,7 @@ export function cfg(env) {
     snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
     ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
     cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
-    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
+    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
     rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
@@ -93,6 +93,13 @@ export function clients(c) {
 }
 export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
 
+// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
+export function revertErrorName(e) {
+  let x = e;
+  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
+  return null;
+}
+
 // pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
 let ownersCache = { at: 0, owners: [] };
 export async function allOwners(c, pc) {
@@ -158,7 +165,7 @@ export async function proposalTitle(c, pc, store, id, creationBlock, state) {
     const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
     let desc = "";
     for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === id) desc = String(l.args.description || "");
-    for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description || desc);
+    for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description ?? desc); // 空文字への更新も有効な最新値(第18回監査)
     const first = desc.split("\n").find((x) => x.trim()) || "";
     title = first.replace(/^#+\s*/, "").trim() || title;
     if (updates.length) title += " (更新あり)";
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index c89ce02..727db0c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -32,7 +32,7 @@ async function fetchLimited(url, init) {
     return JSON.parse(new TextDecoder().decode(buf));
   } finally { clearTimeout(t); }
 }
-async function hubGql(c, query) {
+export async function hubGql(c, query) {
   const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
   if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
   if (!j.data) throw new Error("hub graphql: no data");
@@ -75,7 +75,7 @@ export function referencesNounsProposal(text, nounsId) {
 }
 
 export async function resolveMappings(c, pc, activeNounsIds = []) {
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
   const meta = new Map(data.proposals.map((p) => [p.id, p]));
   const found = new Map(); // nounsId -> snapId
@@ -95,7 +95,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
     if (need.length) {
       // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
-      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
       const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
       for (const n of need) {
         const p = byHash.get(n.hash);
@@ -106,11 +106,12 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
   }
   const mappings = [...found.entries()].map(([nounsId, snapId]) => {
     const m = meta.get(snapId) || {};
-    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
-    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
-    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
-    // 侵害)は検出できない。過信しないこと。
-    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
+    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
+    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
+    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
+    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
+    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
+    const linkOk = referencesNounsProposal(m.discussion, nounsId);
     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   });
   return { mappings, unresolved };
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index d127905..63854f8 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -1,6 +1,6 @@
 // cron ワーカー: 告知 / 投函 / execute / 残高警告。
 // 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
-import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
+import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners, revertErrorName } from "./chain.js";
 import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey, snapshotVoterCount } from "./snap.js";
 import { keccak256, stringToBytes } from "viem";
 import { makeStore } from "./store.js";
@@ -46,12 +46,6 @@ async function flushPendingNotes(c, store) {
 }
 const WORDS = ["反対", "賛成", "棄権"];
 
-// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
-function revertErrorName(e) {
-  let x = e;
-  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
-  return null;
-}
 function isContractRevert(e) {
   // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
   let x = e;
@@ -384,11 +378,17 @@ async function checkBalance(c, pc, wc, store) {
   const checks = [];
   if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
+  // 登録係は返金がなく自分のガスを消費していくため、少額の下限(通常の 1/10)で監視する
+  try {
+    const reg = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" });
+    checks.push({ key: "lowreg", label: "登録係(registrar)残高", address: reg, hint: "残高が尽きると新しい提案の対応付け登録が失敗します(登録操作には返金がありません)。少額を補充してください。", threshold: Number(c.lowBalanceEth) / 10 });
+  } catch (e) { console.warn("[worker] registrar balance check skipped", e.message); }
   for (const ck of checks) {
+    const th = ck.threshold ?? threshold;
     const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
-    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
+    if (eth >= th) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
     if (await store.getFlag(ck.key)) continue;
-    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
+    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${ck.threshold ?? threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
     if (sent) await store.setFlag(ck.key, 86400);
   }
 }
@@ -468,7 +468,7 @@ export async function tick(env) {
         }
         if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
         // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
-        const floor = Math.max(300, c.minRegistrationDelay);
+        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
         if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
         spaceCheckedAt = Date.now();
       }
diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
index abc6162..ba31a63 100644
--- a/relayer-cf/test/worker-tick.test.mjs
+++ b/relayer-cf/test/worker-tick.test.mjs
@@ -47,6 +47,7 @@ function fakePC(h) {
     async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
     async getBalance() { calls.push("getBalance"); return parseEther("1"); },
     async getTransactionReceipt() { throw new Error("not found"); },
+    async getLogs(x) { calls.push("getLogs"); return h.getLogs ? h.getLogs(x) : []; },
     async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
     async simulateContract(x) { calls.push("simulate:" + x.functionName); if (h.simulateContract) return h.simulateContract(x); return { request: {} }; },
   };
@@ -154,17 +155,27 @@ test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick 
   assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
 });
 
-test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
-  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
+test("mainnet: 猶予がコード下限 10 未満なら何もせず停止(ハブにも触れない)", async () => {
+  const { env } = setup(handlers({ registrationDelayBlocks: () => 5n }), {
     NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
     NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
-    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
+    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(10, …) が効くことの確認
   });
   await tick(env);
   assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
   assert.equal(F.hubCalls, 0, "ハブに到達しない");
 });
 
+test("mainnet: 猶予が運用値 10 ちょうどなら処理に進む", async () => {
+  const { env } = setup(handlers({ registrationDelayBlocks: () => 10n }), {
+    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+  });
+  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+  await tick(env);
+  assert.ok(F.hubCalls >= 1, "ハブに到達する(fail-closed が誤発動しない)");
+});
+
 test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
   const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
     NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
@@ -373,3 +384,23 @@ test("第15回監査: 締切時に未反映の票が残っていれば mainnet 
     assert.equal(putsOf(kv, "executed").length, 1, "未反映ゼロなら mainnet も確定する");
   }
 });
+
+test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
+  const writes = [];
+  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
+  const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
+  const { kv, env } = setup(submitHandlers({ eligibleAtBlock: () => 50n }), mainnetEnv, wallet); // 解禁済み
+  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false。
+  // 実票も用意する(ゲートが破れていれば votes クエリ→投函まで到達してしまう構成)
+  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] },
+           { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
+  F.envelope = goodEnvelope();
+  await tick(env);
+  assert.equal(F.hubCalls, 1, "votes クエリにすら到達しない(linkBad で停止)");
+  assert.equal(writes.length, 0, "投函 tx を送らない");
+  assert.equal(kv.ops.filter(([op, k]) => op === "put" && k.includes("snapsent")).length, 0, "送信中レコードも作らない");
+  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
+});
+
+
diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
index 95a55e0..ee3596b 100644
--- a/relayer-cf/src/chain.js
+++ b/relayer-cf/src/chain.js
@@ -51,11 +51,13 @@ export function cfg(env) {
     snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
     ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
     cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
-    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
+    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
     rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
     relayerKey: env.RELAYER_PRIVATE_KEY || null,
+    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
+    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
     lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
   };
 }
@@ -89,7 +91,9 @@ export function clients(c) {
   const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
   const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
   const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
-  return { publicClient, walletClient, account };
+  const registrarAccount = c.registrarKey ? privateKeyToAccount(c.registrarKey) : null;
+  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
+  return { publicClient, walletClient, account, registrarClient };
 }
 export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
 
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index c89ce02..64b882c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -32,7 +32,7 @@ async function fetchLimited(url, init) {
     return JSON.parse(new TextDecoder().decode(buf));
   } finally { clearTimeout(t); }
 }
-async function hubGql(c, query) {
+export async function hubGql(c, query) {
   const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
   if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
   if (!j.data) throw new Error("hub graphql: no data");
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index d127905..15741cc 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -4,6 +4,7 @@ import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI,
 import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey, snapshotVoterCount } from "./snap.js";
 import { keccak256, stringToBytes } from "viem";
 import { makeStore } from "./store.js";
+import { autoRegister } from "./register.js";
 
 async function notify(c, text) {
   console.log("[notify]", text.replace(/\n/g, " ⏎ "));
@@ -384,11 +385,17 @@ async function checkBalance(c, pc, wc, store) {
   const checks = [];
   if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
+  // 登録係は返金がなく自分のガスを消費していくため、少額の下限(通常の 1/10)で監視する
+  try {
+    const reg = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" });
+    checks.push({ key: "lowreg", label: "登録係(registrar)残高", address: reg, hint: "残高が尽きると新しい提案の対応付け登録が失敗します(登録操作には返金がありません)。少額を補充してください。", threshold: Number(c.lowBalanceEth) / 10 });
+  } catch (e) { console.warn("[worker] registrar balance check skipped", e.message); }
   for (const ck of checks) {
+    const th = ck.threshold ?? threshold;
     const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
-    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
+    if (eth >= th) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
     if (await store.getFlag(ck.key)) continue;
-    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
+    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${ck.threshold ?? threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
     if (sent) await store.setFlag(ck.key, 86400);
   }
 }
@@ -438,7 +445,7 @@ export function __resetWorkerStateForTests(o = {}) {
 const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
 export async function tick(env) {
   const c = cfg(env);
-  const { publicClient: pc, walletClient: wc } = _clients(c);
+  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
   const store = makeStore(env.STATE, storeNs(c));
   try {
     try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
@@ -468,7 +475,7 @@ export async function tick(env) {
         }
         if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
         // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
-        const floor = Math.max(300, c.minRegistrationDelay);
+        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
         if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
         spaceCheckedAt = Date.now();
       }
@@ -490,6 +497,10 @@ export async function tick(env) {
       if (p.state !== 0 && p.state !== 1) continue;
       try {
         const snapInfo = snapByNouns.get(p.id) || null;
+        // 登録係の Cloudflare 実装: 未登録の提案について、内容一致を検証したうえで対応表を自動登録
+        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
+          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
+        }
         // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
         // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
         // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
diff --git a/relayer-cf/wrangler.toml b/relayer-cf/wrangler.toml
index 5bae960..d0aad0b 100644
--- a/relayer-cf/wrangler.toml
+++ b/relayer-cf/wrangler.toml
@@ -18,6 +18,7 @@ id = "4c2f1c683fe94191b456e0c1fc70cc2f"
 NETWORK = "sepolia"
 VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
 SNAPSHOT_SPACE = "earl-grey.eth"
+AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
 PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
 NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
 NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
777 .env
777 .env.example
node_modules
.env
cache
artifacts
typechain-types
coverage
relayer-cf/node_modules
relayer-cf/.wrangler
relayer-cf/.dev.vars
node_modules/@snapshot-labs/snapshot.js/dist/snapshot.esm.js:4619:    proposal(web3, address, message) {
node_modules/@snapshot-labs/snapshot.js/dist/snapshot.cjs.js:4629:    proposal(web3, address, message) {
node_modules/@snapshot-labs/snapshot.js/dist/snapshot.min.js:239:/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */const UK=BigInt(0),qK=BigInt(1);function VK(t){return t instanceof Uint8Array||ArrayBuffer.isView(t)&&"Uint8Array"===t.constructor.name}function HK(t){if(!VK(t))throw new Error("Uint8Array expected")}function GK(t,e){if("boolean"!=typeof e)throw new Error(t+" boolean expected, got "+e)}function ZK(t){const e=t.toString(16);return 1&e.length?"0"+e:e}function KK(t){if("string"!=typeof t)throw new Error("hex string expected, got "+typeof t);return""===t?UK:BigInt("0x"+t)}const WK="function"==typeof Uint8Array.from([]).toHex&&"function"==typeof Uint8Array.fromHex,JK=Array.from({length:256},((t,e)=>e.toString(16).padStart(2,"0")));function YK(t){if(HK(t),WK)return t.toHex();let e="";for(let r=0;r<t.length;r++)e+=JK[t[r]];return e}const QK=48,XK=57,tW=65,eW=70,rW=97,nW=102;function iW(t){return t>=QK&&t<=XK?t-QK:t>=tW&&t<=eW?t-(tW-10):t>=rW&&t<=nW?t-(rW-10):void 0}function oW(t){if("string"!=typeof t)throw new Error("hex string expected, got "+typeof t);if(WK)return Uint8Array.fromHex(t);const e=t.length,r=e/2;if(e%2)throw new Error("hex string expected, got unpadded hex of length "+e);const n=new Uint8Array(r);for(let e=0,i=0;e<r;e++,i+=2){const r=iW(t.charCodeAt(i)),o=iW(t.charCodeAt(i+1));if(void 0===r||void 0===o){const e=t[i]+t[i+1];throw new Error('hex string expected, got non-hex character "'+e+'" at index '+i)}n[e]=16*r+o}return n}function aW(t){return KK(YK(t))}function sW(t){return HK(t),KK(YK(Uint8Array.from(t).reverse()))}function uW(t,e){return oW(t.toString(16).padStart(2*e,"0"))}function hW(t,e){return uW(t,e).reverse()}function cW(t,e,r){let n;if("string"==typeof e)try{n=oW(e)}catch(e){throw new Error(t+" must be hex string or Uint8Array, cause: "+e)}else{if(!VK(e))throw new Error(t+" must be hex string or Uint8Array");n=Uint8Array.from(e)}const i=n.length;if("number"==typeof r&&i!==r)throw new Error(t+" of length "+r+" expected, got "+i);return n}function lW(...t){let e=0;for(let r=0;r<t.length;r++){const n=t[r];HK(n),e+=n.length}const r=new Uint8Array(e);for(let e=0,n=0;e<t.length;e++){const i=t[e];r.set(i,n),n+=i.length}return r}function dW(t){if("string"!=typeof t)throw new Error("string expected");return new Uint8Array((new TextEncoder).encode(t))}const fW=t=>"bigint"==typeof t&&UK<=t;function mW(t,e,r){return fW(t)&&fW(e)&&fW(r)&&e<=t&&t<r}function pW(t,e,r,n){if(!mW(e,r,n))throw new Error("expected valid "+t+": "+r+" <= n < "+n+", got "+e)}const gW=t=>(qK<<BigInt(t))-qK,yW=t=>new Uint8Array(t),bW=t=>Uint8Array.from(t);const wW={bigint:t=>"bigint"==typeof t,function:t=>"function"==typeof t,boolean:t=>"boolean"==typeof t,string:t=>"string"==typeof t,stringOrUint8Array:t=>"string"==typeof t||VK(t),isSafeInteger:t=>Number.isSafeInteger(t),array:t=>Array.isArray(t),field:(t,e)=>e.Fp.isValid(t),hash:t=>"function"==typeof t&&Number.isSafeInteger(t.outputLen)};function vW(t,e,r={}){const n=(e,r,n)=>{const i=wW[r];if("function"!=typeof i)throw new Error("invalid validator function");const o=t[e];if(!(n&&void 0===o||i(o,t)))throw new Error("param "+String(e)+" is invalid. Expected "+r+", got "+o)};for(const[t,r]of Object.entries(e))n(t,r,!1);for(const[t,e]of Object.entries(r))n(t,e,!0);return t}function kW(t){const e=new WeakMap;return(r,...n)=>{const i=e.get(r);if(void 0!==i)return i;const o=t(r,...n);return e.set(r,o),o}}const _W=BigInt(0),MW=BigInt(1),EW=BigInt(2),AW=BigInt(3),xW=BigInt(4),jW=BigInt(5),SW=BigInt(8);function NW(t,e){const r=t%e;return r>=_W?r:e+r}function PW(t,e,r){let n=t;for(;e-- >_W;)n*=n,n%=r;return n}function IW(t,e){if(t===_W)throw new Error("invert: expected non-zero number");if(e<=_W)throw new Error("invert: expected positive modulus, got "+e);let r=NW(t,e),n=e,i=_W,o=MW,a=MW,s=_W;for(;r!==_W;){const t=n/r,e=n%r,u=i-a*t,h=o-s*t;n=r,r=e,i=a,o=s,a=u,s=h}if(n!==MW)throw new Error("invert: does not exist");return NW(i,e)}function TW(t,e){const r=(t.ORDER+MW)/xW,n=t.pow(e,r);if(!t.eql(t.sqr(n),e))throw new Error("Cannot find square root");return n}function $W(t,e){const r=(t.ORDER-jW)/SW,n=t.mul(e,EW),i=t.pow(n,r),o=t.mul(e,i),a=t.mul(t.mul(o,EW),i),s=t.mul(o,t.sub(a,t.ONE));if(!t.eql(t.sqr(s),e))throw new Error("Cannot find square root");return s}function OW(t){return t%xW===AW?TW:t%SW===jW?$W:function(t){if(t<BigInt(3))throw new Error("sqrt is not defined for small field");let e=t-MW,r=0;for(;e%EW===_W;)e/=EW,r++;let n=EW;const i=FW(t);for(;1===BW(i,n);)if(n++>1e3)throw new Error("Cannot find square root: probably non-prime P");if(1===r)return TW;let o=i.pow(n,e);const a=(e+MW)/EW;return function(t,n){if(t.is0(n))return n;if(1!==BW(t,n))throw new Error("Cannot find square root");let i=r,s=t.mul(t.ONE,o),u=t.pow(n,e),h=t.pow(n,a);for(;!t.eql(u,t.ONE);){if(t.is0(u))return t.ZERO;let e=1,r=t.sqr(u);for(;!t.eql(r,t.ONE);)if(e++,r=t.sqr(r),e===i)throw new Error("Cannot find square root");const n=MW<<BigInt(i-e-1),o=t.pow(s,n);i=e,s=t.sqr(o),u=t.mul(u,s),h=t.mul(h,o)}return h}}(t)}const CW=["create","isValid","is0","neg","inv","sqrt","sqr","eql","add","sub","mul","pow","div","addN","subN","mulN","sqrN"];function zW(t){const e=CW.reduce(((t,e)=>(t[e]="function",t)),{ORDER:"bigint",MASK:"bigint",BYTES:"isSafeInteger",BITS:"isSafeInteger"});return vW(t,e)}function RW(t,e,r=!1){const n=new Array(e.length).fill(r?t.ZERO:void 0),i=e.reduce(((e,r,i)=>t.is0(r)?e:(n[i]=e,t.mul(e,r))),t.ONE),o=t.inv(i);return e.reduceRight(((e,r,i)=>t.is0(r)?e:(n[i]=t.mul(e,n[i]),t.mul(e,r))),o),n}function BW(t,e){const r=(t.ORDER-MW)/EW,n=t.pow(e,r),i=t.eql(n,t.ONE),o=t.eql(n,t.ZERO),a=t.eql(n,t.neg(t.ONE));if(!i&&!o&&!a)throw new Error("invalid Legendre symbol result");return i?1:o?0:-1}function DW(t,e){void 0!==e&&_D(e);const r=void 0!==e?e:t.toString(2).length;return{nBitLength:r,nByteLength:Math.ceil(r/8)}}function FW(t,e,r=!1,n={}){if(t<=_W)throw new Error("invalid field: expected ORDER > 0, got "+t);const{nBitLength:i,nByteLength:o}=DW(t,e);if(o>2048)throw new Error("invalid field: expected ORDER of <= 2048 bytes");let a;const s=Object.freeze({ORDER:t,isLE:r,BITS:i,BYTES:o,MASK:gW(i),ZERO:_W,ONE:MW,create:e=>NW(e,t),isValid:e=>{if("bigint"!=typeof e)throw new Error("invalid field element: expected bigint, got "+typeof e);return _W<=e&&e<t},is0:t=>t===_W,isOdd:t=>(t&MW)===MW,neg:e=>NW(-e,t),eql:(t,e)=>t===e,sqr:e=>NW(e*e,t),add:(e,r)=>NW(e+r,t),sub:(e,r)=>NW(e-r,t),mul:(e,r)=>NW(e*r,t),pow:(t,e)=>function(t,e,r){if(r<_W)throw new Error("invalid exponent, negatives unsupported");if(r===_W)return t.ONE;if(r===MW)return e;let n=t.ONE,i=e;for(;r>_W;)r&MW&&(n=t.mul(n,i)),i=t.sqr(i),r>>=MW;return n}(s,t,e),div:(e,r)=>NW(e*IW(r,t),t),sqrN:t=>t*t,addN:(t,e)=>t+e,subN:(t,e)=>t-e,mulN:(t,e)=>t*e,inv:e=>IW(e,t),sqrt:n.sqrt||(e=>(a||(a=OW(t)),a(s,e))),toBytes:t=>r?hW(t,o):uW(t,o),fromBytes:t=>{if(t.length!==o)throw new Error("Field.fromBytes: expected "+o+" bytes, got "+t.length);return r?sW(t):aW(t)},invertBatch:t=>RW(s,t),cmov:(t,e,r)=>r?e:t});return Object.freeze(s)}function LW(t){if("bigint"!=typeof t)throw new Error("field order must be bigint");const e=t.toString(2).length;return Math.ceil(e/8)}function UW(t){const e=LW(t);return e+Math.ceil(e/2)}const qW=BigInt(0),VW=BigInt(1);function HW(t,e){const r=e.negate();return t?r:e}function GW(t,e){if(!Number.isSafeInteger(t)||t<=0||t>e)throw new Error("invalid window size, expected [1.."+e+"], got W="+t)}function ZW(t,e){GW(t,e);const r=2**t;return{windows:Math.ceil(e/t)+1,windowSize:2**(t-1),mask:gW(t),maxNumber:r,shiftBy:BigInt(t)}}function KW(t,e,r){const{windowSize:n,mask:i,maxNumber:o,shiftBy:a}=r;let s=Number(t&i),u=t>>a;s>n&&(s-=o,u+=VW);const h=e*n;return{nextN:u,offset:h+Math.abs(s)-1,isZero:0===s,isNeg:s<0,isNegF:e%2!=0,offsetF:h}}const WW=new WeakMap,JW=new WeakMap;function YW(t){return JW.get(t)||1}function QW(t,e,r,n){!function(t,e){if(!Array.isArray(t))throw new Error("array expected");t.forEach(((t,r)=>{if(!(t instanceof e))throw new Error("invalid point at index "+r)}))}(r,t),function(t,e){if(!Array.isArray(t))throw new Error("array of scalars expected");t.forEach(((t,r)=>{if(!e.isValid(t))throw new Error("invalid scalar at index "+r)}))}(n,e);const i=r.length,o=n.length;if(i!==o)throw new Error("arrays of points and scalars must have equal length");const a=t.ZERO,s=function(t){let e;for(e=0;t>UK;t>>=qK,e+=1);return e}(BigInt(i));let u=1;s>12?u=s-3:s>4?u=s-2:s>0&&(u=2);const h=gW(u),c=new Array(Number(h)+1).fill(a);let l=a;for(let t=Math.floor((e.BITS-1)/u)*u;t>=0;t-=u){c.fill(a);for(let e=0;e<o;e++){const i=n[e],o=Number(i>>BigInt(t)&h);c[o]=c[o].add(r[e])}let e=a;for(let t=c.length-1,r=a;t>0;t--)r=r.add(c[t]),e=e.add(r);if(l=l.add(e),0!==t)for(let t=0;t<u;t++)l=l.double()}return l}function XW(t){return zW(t.Fp),vW(t,{n:"bigint",h:"bigint",Gx:"field",Gy:"field"},{nBitLength:"isSafeInteger",nByteLength:"isSafeInteger"}),Object.freeze({...DW(t.n,t.nBitLength),...t,p:t.Fp.ORDER})}function tJ(t){void 0!==t.lowS&&GK("lowS",t.lowS),void 0!==t.prehash&&GK("prehash",t.prehash)}class eJ extends Error{constructor(t=""){super(t)}}const rJ={Err:eJ,_tlv:{encode:(t,e)=>{const{Err:r}=rJ;if(t<0||t>256)throw new r("tlv.encode: wrong tag");if(1&e.length)throw new r("tlv.encode: unpadded data");const n=e.length/2,i=ZK(n);if(i.length/2&128)throw new r("tlv.encode: long form length too big");const o=n>127?ZK(i.length/2|128):"";return ZK(t)+o+i+e},decode(t,e){const{Err:r}=rJ;let n=0;if(t<0||t>256)throw new r("tlv.encode: wrong tag");if(e.length<2||e[n++]!==t)throw new r("tlv.decode: wrong tlv");const i=e[n++];let o=0;if(!!(128&i)){const t=127&i;if(!t)throw new r("tlv.decode(long): indefinite length not supported");if(t>4)throw new r("tlv.decode(long): byte length is too big");const a=e.subarray(n,n+t);if(a.length!==t)throw new r("tlv.decode: length bytes not complete");if(0===a[0])throw new r("tlv.decode(long): zero leftmost byte");for(const t of a)o=o<<8|t;if(n+=t,o<128)throw new r("tlv.decode(long): not minimal encoding")}else o=i;const a=e.subarray(n,n+o);if(a.length!==o)throw new r("tlv.decode: wrong value length");return{v:a,l:e.subarray(n+o)}}},_int:{encode(t){const{Err:e}=rJ;if(t<iJ)throw new e("integer: negative integers are not allowed");let r=ZK(t);if(8&Number.parseInt(r[0],16)&&(r="00"+r),1&r.length)throw new e("unexpected DER parsing assertion: unpadded hex");return r},decode(t){const{Err:e}=rJ;if(128&t[0])throw new e("invalid signature integer: negative");if(0===t[0]&&!(128&t[1]))throw new e("invalid signature integer: unnecessary leading zero");return aW(t)}},toSig(t){const{Err:e,_int:r,_tlv:n}=rJ,i=cW("signature",t),{v:o,l:a}=n.decode(48,i);if(a.length)throw new e("invalid signature: left bytes after parsing");const{v:s,l:u}=n.decode(2,o),{v:h,l:c}=n.decode(2,u);if(c.length)throw new e("invalid signature: left bytes after parsing");return{r:r.decode(s),s:r.decode(h)}},hexFromSig(t){const{_tlv:e,_int:r}=rJ,n=e.encode(2,r.encode(t.r))+e.encode(2,r.encode(t.s));return e.encode(48,n)}};function nJ(t,e){return YK(uW(t,e))}const iJ=BigInt(0),oJ=BigInt(1),aJ=BigInt(2),sJ=BigInt(3),uJ=BigInt(4);function hJ(t){const e=function(t){const e=XW(t);vW(e,{a:"field",b:"field"},{allowInfinityPoint:"boolean",allowedPrivateKeyLengths:"array",clearCofactor:"function",fromBytes:"function",isTorsionFree:"function",toBytes:"function",wrapPrivateKey:"boolean"});const{endo:r,Fp:n,a:i}=e;if(r){if(!n.eql(i,n.ZERO))throw new Error("invalid endo: CURVE.a must be 0");if("object"!=typeof r||"bigint"!=typeof r.beta||"function"!=typeof r.splitScalar)throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function')}return Object.freeze({...e})}(t),{Fp:r}=e,n=FW(e.n,e.nBitLength),i=e.toBytes||((t,e,n)=>{const i=e.toAffine();return lW(Uint8Array.from([4]),r.toBytes(i.x),r.toBytes(i.y))}),o=e.fromBytes||(t=>{const e=t.subarray(1);return{x:r.fromBytes(e.subarray(0,r.BYTES)),y:r.fromBytes(e.subarray(r.BYTES,2*r.BYTES))}});function a(t){const{a:n,b:i}=e,o=r.sqr(t),a=r.mul(o,t);return r.add(r.add(a,r.mul(t,n)),i)}function s(t,e){const n=r.sqr(e),i=a(t);return r.eql(n,i)}if(!s(e.Gx,e.Gy))throw new Error("bad curve params: generator point");const u=r.mul(r.pow(e.a,sJ),uJ),h=r.mul(r.sqr(e.b),BigInt(27));if(r.is0(r.add(u,h)))throw new Error("bad curve params: a or b");function c(t){const{allowedPrivateKeyLengths:r,nByteLength:n,wrapPrivateKey:i,n:o}=e;if(r&&"bigint"!=typeof t){if(VK(t)&&(t=YK(t)),"string"!=typeof t||!r.includes(t.length))throw new Error("invalid private key");t=t.padStart(2*n,"0")}let a;try{a="bigint"==typeof t?t:aW(cW("private key",t,n))}catch(e){throw new Error("invalid private key, expected hex or "+n+" bytes, got "+typeof t)}return i&&(a=NW(a,o)),pW("private key",a,oJ,o),a}function l(t){if(!(t instanceof m))throw new Error("ProjectivePoint expected")}const d=kW(((t,e)=>{const{px:n,py:i,pz:o}=t;if(r.eql(o,r.ONE))return{x:n,y:i};const a=t.is0();null==e&&(e=a?r.ONE:r.inv(o));const s=r.mul(n,e),u=r.mul(i,e),h=r.mul(o,e);if(a)return{x:r.ZERO,y:r.ZERO};if(!r.eql(h,r.ONE))throw new Error("invZ was invalid");return{x:s,y:u}})),f=kW((t=>{if(t.is0()){if(e.allowInfinityPoint&&!r.is0(t.py))return;throw new Error("bad point: ZERO")}const{x:n,y:i}=t.toAffine();if(!r.isValid(n)||!r.isValid(i))throw new Error("bad point: x or y not FE");if(!s(n,i))throw new Error("bad point: equation left != right");if(!t.isTorsionFree())throw new Error("bad point: not in prime-order subgroup");return!0}));class m{constructor(t,e,n){if(null==t||!r.isValid(t))throw new Error("x required");if(null==e||!r.isValid(e)||r.is0(e))throw new Error("y required");if(null==n||!r.isValid(n))throw new Error("z required");this.px=t,this.py=e,this.pz=n,Object.freeze(this)}static fromAffine(t){const{x:e,y:n}=t||{};if(!t||!r.isValid(e)||!r.isValid(n))throw new Error("invalid affine point");if(t instanceof m)throw new Error("projective point not allowed");const i=t=>r.eql(t,r.ZERO);return i(e)&&i(n)?m.ZERO:new m(e,n,r.ONE)}get x(){return this.toAffine().x}get y(){return this.toAffine().y}static normalizeZ(t){const e=RW(r,t.map((t=>t.pz)));return t.map(((t,r)=>t.toAffine(e[r]))).map(m.fromAffine)}static fromHex(t){const e=m.fromAffine(o(cW("pointHex",t)));return e.assertValidity(),e}static fromPrivateKey(t){return m.BASE.multiply(c(t))}static msm(t,e){return QW(m,n,t,e)}_setWindowSize(t){y.setWindowSize(this,t)}assertValidity(){f(this)}hasEvenY(){const{y:t}=this.toAffine();if(r.isOdd)return!r.isOdd(t);throw new Error("Field doesn't support isOdd")}equals(t){l(t);const{px:e,py:n,pz:i}=this,{px:o,py:a,pz:s}=t,u=r.eql(r.mul(e,s),r.mul(o,i)),h=r.eql(r.mul(n,s),r.mul(a,i));return u&&h}negate(){return new m(this.px,r.neg(this.py),this.pz)}double(){const{a:t,b:n}=e,i=r.mul(n,sJ),{px:o,py:a,pz:s}=this;let u=r.ZERO,h=r.ZERO,c=r.ZERO,l=r.mul(o,o),d=r.mul(a,a),f=r.mul(s,s),p=r.mul(o,a);return p=r.add(p,p),c=r.mul(o,s),c=r.add(c,c),u=r.mul(t,c),h=r.mul(i,f),h=r.add(u,h),u=r.sub(d,h),h=r.add(d,h),h=r.mul(u,h),u=r.mul(p,u),c=r.mul(i,c),f=r.mul(t,f),p=r.sub(l,f),p=r.mul(t,p),p=r.add(p,c),c=r.add(l,l),l=r.add(c,l),l=r.add(l,f),l=r.mul(l,p),h=r.add(h,l),f=r.mul(a,s),f=r.add(f,f),l=r.mul(f,p),u=r.sub(u,l),c=r.mul(f,d),c=r.add(c,c),c=r.add(c,c),new m(u,h,c)}add(t){l(t);const{px:n,py:i,pz:o}=this,{px:a,py:s,pz:u}=t;let h=r.ZERO,c=r.ZERO,d=r.ZERO;const f=e.a,p=r.mul(e.b,sJ);let g=r.mul(n,a),y=r.mul(i,s),b=r.mul(o,u),w=r.add(n,i),v=r.add(a,s);w=r.mul(w,v),v=r.add(g,y),w=r.sub(w,v),v=r.add(n,o);let k=r.add(a,u);return v=r.mul(v,k),k=r.add(g,b),v=r.sub(v,k),k=r.add(i,o),h=r.add(s,u),k=r.mul(k,h),h=r.add(y,b),k=r.sub(k,h),d=r.mul(f,v),h=r.mul(p,b),d=r.add(h,d),h=r.sub(y,d),d=r.add(y,d),c=r.mul(h,d),y=r.add(g,g),y=r.add(y,g),b=r.mul(f,b),v=r.mul(p,v),y=r.add(y,b),b=r.sub(g,b),b=r.mul(f,b),v=r.add(v,b),g=r.mul(y,v),c=r.add(c,g),g=r.mul(k,v),h=r.mul(w,h),h=r.sub(h,g),g=r.mul(w,y),d=r.mul(k,d),d=r.add(d,g),new m(h,c,d)}subtract(t){return this.add(t.negate())}is0(){return this.equals(m.ZERO)}wNAF(t){return y.wNAFCached(this,t,m.normalizeZ)}multiplyUnsafe(t){const{endo:n,n:i}=e;pW("scalar",t,iJ,i);const o=m.ZERO;if(t===iJ)return o;if(this.is0()||t===oJ)return this;if(!n||y.hasPrecomputes(this))return y.wNAFCachedUnsafe(this,t,m.normalizeZ);let{k1neg:a,k1:s,k2neg:u,k2:h}=n.splitScalar(t),c=o,l=o,d=this;for(;s>iJ||h>iJ;)s&oJ&&(c=c.add(d)),h&oJ&&(l=l.add(d)),d=d.double(),s>>=oJ,h>>=oJ;return a&&(c=c.negate()),u&&(l=l.negate()),l=new m(r.mul(l.px,n.beta),l.py,l.pz),c.add(l)}multiply(t){const{endo:n,n:i}=e;let o,a;if(pW("scalar",t,oJ,i),n){const{k1neg:e,k1:i,k2neg:s,k2:u}=n.splitScalar(t);let{p:h,f:c}=this.wNAF(i),{p:l,f:d}=this.wNAF(u);h=y.constTimeNegate(e,h),l=y.constTimeNegate(s,l),l=new m(r.mul(l.px,n.beta),l.py,l.pz),o=h.add(l),a=c.add(d)}else{const{p:e,f:r}=this.wNAF(t);o=e,a=r}return m.normalizeZ([o,a])[0]}multiplyAndAddUnsafe(t,e,r){const n=m.BASE,i=(t,e)=>e!==iJ&&e!==oJ&&t.equals(n)?t.multiply(e):t.multiplyUnsafe(e),o=i(this,e).add(i(t,r));return o.is0()?void 0:o}toAffine(t){return d(this,t)}isTorsionFree(){const{h:t,isTorsionFree:r}=e;if(t===oJ)return!0;if(r)return r(m,this);throw new Error("isTorsionFree() has not been declared for the elliptic curve")}clearCofactor(){const{h:t,clearCofactor:r}=e;return t===oJ?this:r?r(m,this):this.multiplyUnsafe(e.h)}toRawBytes(t=!0){return GK("isCompressed",t),this.assertValidity(),i(m,this,t)}toHex(t=!0){return GK("isCompressed",t),YK(this.toRawBytes(t))}}m.BASE=new m(e.Gx,e.Gy,r.ONE),m.ZERO=new m(r.ZERO,r.ONE,r.ZERO);const{endo:p,nBitLength:g}=e,y=(b=m,w=p?Math.ceil(g/2):g,{constTimeNegate:HW,hasPrecomputes:t=>1!==YW(t),unsafeLadder(t,e,r=b.ZERO){let n=t;for(;e>qW;)e&VW&&(r=r.add(n)),n=n.double(),e>>=VW;return r},precomputeWindow(t,e){const{windows:r,windowSize:n}=ZW(e,w),i=[];let o=t,a=o;for(let t=0;t<r;t++){a=o,i.push(a);for(let t=1;t<n;t++)a=a.add(o),i.push(a);o=a.double()}return i},wNAF(t,e,r){let n=b.ZERO,i=b.BASE;const o=ZW(t,w);for(let t=0;t<o.windows;t++){const{nextN:a,offset:s,isZero:u,isNeg:h,isNegF:c,offsetF:l}=KW(r,t,o);r=a,u?i=i.add(HW(c,e[l])):n=n.add(HW(h,e[s]))}return{p:n,f:i}},wNAFUnsafe(t,e,r,n=b.ZERO){const i=ZW(t,w);for(let t=0;t<i.windows&&r!==qW;t++){const{nextN:o,offset:a,isZero:s,isNeg:u}=KW(r,t,i);if(r=o,!s){const t=e[a];n=n.add(u?t.negate():t)}}return n},getPrecomputes(t,e,r){let n=WW.get(e);return n||(n=this.precomputeWindow(e,t),1!==t&&WW.set(e,r(n))),n},wNAFCached(t,e,r){const n=YW(t);return this.wNAF(n,this.getPrecomputes(n,t,r),e)},wNAFCachedUnsafe(t,e,r,n){const i=YW(t);return 1===i?this.unsafeLadder(t,e,n):this.wNAFUnsafe(i,this.getPrecomputes(i,t,r),e,n)},setWindowSize(t,e){GW(e,w),JW.set(t,e),WW.delete(t)}});var b,w;return{CURVE:e,ProjectivePoint:m,normPrivateKeyToScalar:c,weierstrassEquation:a,isWithinCurveOrder:function(t){return mW(t,oJ,e.n)}}}function cJ(t){const e=function(t){const e=XW(t);return vW(e,{hash:"hash",hmac:"function",randomBytes:"function"},{bits2int:"function",bits2int_modN:"function",lowS:"boolean"}),Object.freeze({lowS:!0,...e})}(t),{Fp:r,n:n,nByteLength:i,nBitLength:o}=e,a=r.BYTES+1,s=2*r.BYTES+1;function u(t){return NW(t,n)}function h(t){return IW(t,n)}const{ProjectivePoint:c,normPrivateKeyToScalar:l,weierstrassEquation:d,isWithinCurveOrder:f}=hJ({...e,toBytes(t,e,n){const i=e.toAffine(),o=r.toBytes(i.x),a=lW;return GK("isCompressed",n),n?a(Uint8Array.from([e.hasEvenY()?2:3]),o):a(Uint8Array.from([4]),o,r.toBytes(i.y))},fromBytes(t){const e=t.length,n=t[0],i=t.subarray(1);if(e!==a||2!==n&&3!==n){if(e===s&&4===n){return{x:r.fromBytes(i.subarray(0,r.BYTES)),y:r.fromBytes(i.subarray(r.BYTES,2*r.BYTES))}}throw new Error("invalid Point, expected length of "+a+", or uncompressed "+s+", got "+e)}{const t=aW(i);if(!mW(t,oJ,r.ORDER))throw new Error("Point is not on curve");const e=d(t);let o;try{o=r.sqrt(e)}catch(t){const e=t instanceof Error?": "+t.message:"";throw new Error("Point is not on curve"+e)}return 1==(1&n)!==((o&oJ)===oJ)&&(o=r.neg(o)),{x:t,y:o}}}});function m(t){return t>n>>oJ}const p=(t,e,r)=>aW(t.slice(e,r));class g{constructor(t,e,r){pW("r",t,oJ,n),pW("s",e,oJ,n),this.r=t,this.s=e,null!=r&&(this.recovery=r),Object.freeze(this)}static fromCompact(t){const e=i;return t=cW("compactSignature",t,2*e),new g(p(t,0,e),p(t,e,2*e))}static fromDER(t){const{r:e,s:r}=rJ.toSig(cW("DER",t));return new g(e,r)}assertValidity(){}addRecoveryBit(t){return new g(this.r,this.s,t)}recoverPublicKey(t){const{r:n,s:i,recovery:o}=this,a=v(cW("msgHash",t));if(null==o||![0,1,2,3].includes(o))throw new Error("recovery id invalid");const s=2===o||3===o?n+e.n:n;if(s>=r.ORDER)throw new Error("recovery id 2 or 3 invalid");const l=0==(1&o)?"02":"03",d=c.fromHex(l+nJ(s,r.BYTES)),f=h(s),m=u(-a*f),p=u(i*f),g=c.BASE.multiplyAndAddUnsafe(d,m,p);if(!g)throw new Error("point at infinify");return g.assertValidity(),g}hasHighS(){return m(this.s)}normalizeS(){return this.hasHighS()?new g(this.r,u(-this.s),this.recovery):this}toDERRawBytes(){return oW(this.toDERHex())}toDERHex(){return rJ.hexFromSig(this)}toCompactRawBytes(){return oW(this.toCompactHex())}toCompactHex(){const t=i;return nJ(this.r,t)+nJ(this.s,t)}}const y={isValidPrivateKey(t){try{return l(t),!0}catch(t){return!1}},normPrivateKeyToScalar:l,randomPrivateKey:()=>{const t=UW(e.n);return function(t,e,r=!1){const n=t.length,i=LW(e),o=UW(e);if(n<16||n<o||n>1024)throw new Error("expected "+o+"-1024 bytes of input, got "+n);const a=NW(r?sW(t):aW(t),e-MW)+MW;return r?hW(a,i):uW(a,i)}(e.randomBytes(t),e.n)},precompute:(t=8,e=c.BASE)=>(e._setWindowSize(t),e.multiply(BigInt(3)),e)};function b(t){if("bigint"==typeof t)return!1;if(t instanceof c)return!0;const n=cW("key",t).length,o=r.BYTES,a=o+1,s=2*o+1;return e.allowedPrivateKeyLengths||i===a?void 0:n===a||n===s}const w=e.bits2int||function(t){if(t.length>8192)throw new Error("input is too large");const e=aW(t),r=8*t.length-o;return r>0?e>>BigInt(r):e},v=e.bits2int_modN||function(t){return u(w(t))},k=gW(o);function _(t){return pW("num < 2^"+o,t,iJ,k),uW(t,i)}function M(t,n,i=E){if(["recovered","canonical"].some((t=>t in i)))throw new Error("sign() legacy options not supported");const{hash:o,randomBytes:a}=e;let{lowS:s,prehash:d,extraEntropy:p}=i;null==s&&(s=!0),t=cW("msgHash",t),tJ(i),d&&(t=cW("prehashed msgHash",o(t)));const y=v(t),b=l(n),k=[_(b),_(y)];if(null!=p&&!1!==p){const t=!0===p?a(r.BYTES):p;k.push(cW("extraEntropy",t))}const M=lW(...k),A=y;return{seed:M,k2sig:function(t){const e=w(t);if(!f(e))return;const r=h(e),n=c.BASE.multiply(e).toAffine(),i=u(n.x);if(i===iJ)return;const o=u(r*u(A+i*b));if(o===iJ)return;let a=(n.x===i?0:2)|Number(n.y&oJ),l=o;return s&&m(o)&&(l=function(t){return m(t)?u(-t):t}(o),a^=1),new g(i,l,a)}}}const E={lowS:e.lowS,prehash:!1},A={lowS:e.lowS,prehash:!1};return c.BASE._setWindowSize(8),{CURVE:e,getPublicKey:function(t,e=!0){return c.fromPrivateKey(t).toRawBytes(e)},getSharedSecret:function(t,e,r=!0){if(!0===b(t))throw new Error("first arg must be private key");if(!1===b(e))throw new Error("second arg must be public key");return c.fromHex(e).multiply(l(t)).toRawBytes(r)},sign:function(t,r,n=E){const{seed:i,k2sig:o}=M(t,r,n),a=e,s=function(t,e,r){if("number"!=typeof t||t<2)throw new Error("hashLen must be a number");if("number"!=typeof e||e<2)throw new Error("qByteLen must be a number");if("function"!=typeof r)throw new Error("hmacFn must be a function");let n=yW(t),i=yW(t),o=0;const a=()=>{n.fill(1),i.fill(0),o=0},s=(...t)=>r(i,n,...t),u=(t=yW(0))=>{i=s(bW([0]),t),n=s(),0!==t.length&&(i=s(bW([1]),t),n=s())},h=()=>{if(o++>=1e3)throw new Error("drbg: tried 1000 values");let t=0;const r=[];for(;t<e;){n=s();const e=n.slice();r.push(e),t+=n.length}return lW(...r)};return(t,e)=>{let r;for(a(),u(t);!(r=e(h()));)u();return a(),r}}(a.hash.outputLen,a.nByteLength,a.hmac);return s(i,o)},verify:function(t,r,n,i=A){const o=t;r=cW("msgHash",r),n=cW("publicKey",n);const{lowS:a,prehash:s,format:l}=i;if(tJ(i),"strict"in i)throw new Error("options.strict was renamed to lowS");if(void 0!==l&&"compact"!==l&&"der"!==l)throw new Error("format must be compact or der");const d="string"==typeof o||VK(o),f=!d&&!l&&"object"==typeof o&&null!==o&&"bigint"==typeof o.r&&"bigint"==typeof o.s;if(!d&&!f)throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");let m,p;try{if(f&&(m=new g(o.r,o.s)),d){try{"compact"!==l&&(m=g.fromDER(o))}catch(t){if(!(t instanceof rJ.Err))throw t}m||"der"===l||(m=g.fromCompact(o))}p=c.fromHex(n)}catch(t){return!1}if(!m)return!1;if(a&&m.hasHighS())return!1;s&&(r=e.hash(r));const{r:y,s:b}=m,w=v(r),k=h(b),_=u(w*k),M=u(y*k),E=c.BASE.multiplyAndAddUnsafe(p,_,M)?.toAffine();return!!E&&u(E.x)===y},ProjectivePoint:c,Signature:g,utils:y}}function lJ(t,e){if(zW(t),!t.isValid(e.A)||!t.isValid(e.B)||!t.isValid(e.Z))throw new Error("mapToCurveSimpleSWU: invalid opts");const r=function(t,e){const r=t.ORDER;let n=iJ;for(let t=r-oJ;t%aJ===iJ;t/=aJ)n+=oJ;const i=n,o=aJ<<i-oJ-oJ,a=o*aJ,s=(r-oJ)/a,u=(s-oJ)/aJ,h=a-oJ,c=o,l=t.pow(e,s),d=t.pow(e,(s+oJ)/aJ);let f=(e,r)=>{let n=l,o=t.pow(r,h),a=t.sqr(o);a=t.mul(a,r);let s=t.mul(e,a);s=t.pow(s,u),s=t.mul(s,o),o=t.mul(s,r),a=t.mul(s,e);let f=t.mul(a,o);s=t.pow(f,c);let m=t.eql(s,t.ONE);o=t.mul(a,d),s=t.mul(f,n),a=t.cmov(o,a,m),f=t.cmov(s,f,m);for(let e=i;e>oJ;e--){let r=e-aJ;r=aJ<<r-oJ;let i=t.pow(f,r);const s=t.eql(i,t.ONE);o=t.mul(a,n),n=t.mul(n,n),i=t.mul(f,n),a=t.cmov(o,a,s),f=t.cmov(i,f,s)}return{isValid:m,value:a}};if(t.ORDER%uJ===sJ){const r=(t.ORDER-sJ)/uJ,n=t.sqrt(t.neg(e));f=(e,i)=>{let o=t.sqr(i);const a=t.mul(e,i);o=t.mul(o,a);let s=t.pow(o,r);s=t.mul(s,a);const u=t.mul(s,n),h=t.mul(t.sqr(s),i),c=t.eql(h,e);return{isValid:c,value:t.cmov(u,s,c)}}}return f}(t,e.Z);if(!t.isOdd)throw new Error("Fp.isOdd is not implemented!");return n=>{let i,o,a,s,u,h,c,l;i=t.sqr(n),i=t.mul(i,e.Z),o=t.sqr(i),o=t.add(o,i),a=t.add(o,t.ONE),a=t.mul(a,e.B),s=t.cmov(e.Z,t.neg(o),!t.eql(o,t.ZERO)),s=t.mul(s,e.A),o=t.sqr(a),h=t.sqr(s),u=t.mul(h,e.A),o=t.add(o,u),o=t.mul(o,a),h=t.mul(h,s),u=t.mul(h,e.B),o=t.add(o,u),c=t.mul(i,a);const{isValid:d,value:f}=r(o,h);l=t.mul(i,n),l=t.mul(l,f),c=t.cmov(c,a,d),l=t.cmov(l,f,d);const m=t.isOdd(n)===t.isOdd(l);l=t.cmov(t.neg(l),l,m);const p=RW(t,[s],!0)[0];return c=t.mul(c,p),{x:c,y:l}}}function dJ(t){return{hash:t,hmac:(e,...r)=>EZ(t,e,function(...t){let e=0;for(let r=0;r<t.length;r++){const n=t[r];MD(n),e+=n.length}const r=new Uint8Array(e);for(let e=0,n=0;e<t.length;e++){const i=t[e];r.set(i,n),n+=i.length}return r}(...r)),randomBytes:$D}}const fJ=aW;function mJ(t,e){if(gJ(t),gJ(e),t<0||t>=1<<8*e)throw new Error("invalid I2OSP input: "+t);const r=Array.from({length:e}).fill(0);for(let n=e-1;n>=0;n--)r[n]=255&t,t>>>=8;return new Uint8Array(r)}function pJ(t,e){const r=new Uint8Array(t.length);for(let n=0;n<t.length;n++)r[n]=t[n]^e[n];return r}function gJ(t){if(!Number.isSafeInteger(t))throw new Error("number expected")}function yJ(t,e,r){vW(r,{DST:"stringOrUint8Array",p:"bigint",m:"isSafeInteger",k:"isSafeInteger",hash:"hash"});const{p:n,k:i,m:o,hash:a,expand:s,DST:u}=r;HK(t),gJ(e);const h="string"==typeof u?dW(u):u,c=n.toString(2).length,l=Math.ceil((c+i)/8),d=e*o*l;let f;if("xmd"===s)f=function(t,e,r,n){HK(t),HK(e),gJ(r),e.length>255&&(e=n(lW(dW("H2C-OVERSIZE-DST-"),e)));const{outputLen:i,blockLen:o}=n,a=Math.ceil(r/i);if(r>65535||a>255)throw new Error("expand_message_xmd: invalid lenInBytes");const s=lW(e,mJ(e.length,1)),u=mJ(0,o),h=mJ(r,2),c=new Array(a),l=n(lW(u,t,h,mJ(0,1),s));c[0]=n(lW(l,mJ(1,1),s));for(let t=1;t<=a;t++){const e=[pJ(l,c[t-1]),mJ(t+1,1),s];c[t]=n(lW(...e))}return lW(...c).slice(0,r)}(t,h,d,a);else if("xof"===s)f=function(t,e,r,n,i){if(HK(t),HK(e),gJ(r),e.length>255){const t=Math.ceil(2*n/8);e=i.create({dkLen:t}).update(dW("H2C-OVERSIZE-DST-")).update(e).digest()}if(r>65535||e.length>255)throw new Error("expand_message_xof: invalid lenInBytes");return i.create({dkLen:r}).update(t).update(mJ(r,2)).update(e).update(mJ(e.length,1)).digest()}(t,h,d,i,a);else{if("_internal_pass"!==s)throw new Error('expand must be "xmd" or "xof"');f=t}const m=new Array(e);for(let t=0;t<e;t++){const e=new Array(o);for(let r=0;r<o;r++){const i=l*(r+t*o),a=f.subarray(i,i+l);e[r]=NW(fJ(a),n)}m[t]=e}return m}const bJ=BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),wJ=BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),vJ=BigInt(0),kJ=BigInt(1),_J=BigInt(2),MJ=(t,e)=>(t+e/_J)/e;function EJ(t){const e=bJ,r=BigInt(3),n=BigInt(6),i=BigInt(11),o=BigInt(22),a=BigInt(23),s=BigInt(44),u=BigInt(88),h=t*t*t%e,c=h*h*t%e,l=PW(c,r,e)*c%e,d=PW(l,r,e)*c%e,f=PW(d,_J,e)*h%e,m=PW(f,i,e)*f%e,p=PW(m,o,e)*m%e,g=PW(p,s,e)*p%e,y=PW(g,u,e)*g%e,b=PW(y,s,e)*p%e,w=PW(b,r,e)*c%e,v=PW(w,a,e)*m%e,k=PW(v,n,e)*h%e,_=PW(k,_J,e);if(!AJ.eql(AJ.sqr(_),t))throw new Error("Cannot find square root");return _}const AJ=FW(bJ,void 0,void 0,{sqrt:EJ}),xJ=function(t,e){const r=e=>cJ({...t,...dJ(e)});return{...r(e),create:r}}({a:vJ,b:BigInt(7),Fp:AJ,n:wJ,Gx:BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),Gy:BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),h:BigInt(1),lowS:!0,endo:{beta:BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),splitScalar:t=>{const e=wJ,r=BigInt("0x3086d221a7d46bcde86c90e49284eb15"),n=-kJ*BigInt("0xe4437ed6010e88286f547fa90abfe4c3"),i=BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"),o=r,a=BigInt("0x100000000000000000000000000000000"),s=MJ(o*t,e),u=MJ(-n*t,e);let h=NW(t-s*r-u*i,e),c=NW(-s*n-u*o,e);const l=h>a,d=c>a;if(l&&(h=e-h),d&&(c=e-c),h>a||c>a)throw new Error("splitScalar: Endomorphism failed, k="+t);return{k1neg:l,k1:h,k2neg:d,k2:c}}}},XU),jJ={};function SJ(t,...e){let r=jJ[t];if(void 0===r){const e=XU(Uint8Array.from(t,(t=>t.charCodeAt(0))));r=lW(e,e),jJ[t]=r}return XU(lW(r,...e))}const NJ=t=>t.toRawBytes(!0).slice(1),PJ=t=>uW(t,32),IJ=t=>NW(t,bJ),TJ=t=>NW(t,wJ),$J=(()=>xJ.ProjectivePoint)();function OJ(t){let e=xJ.utils.normPrivateKeyToScalar(t),r=$J.fromPrivateKey(e);return{scalar:r.hasEvenY()?e:TJ(-e),bytes:NJ(r)}}function CJ(t){pW("x",t,kJ,bJ);const e=IJ(t*t);let r=EJ(IJ(e*t+BigInt(7)));r%_J!==vJ&&(r=IJ(-r));const n=new $J(t,r,kJ);return n.assertValidity(),n}const zJ=aW;function RJ(...t){return TJ(zJ(SJ("BIP0340/challenge",...t)))}function BJ(t){return OJ(t).bytes}function DJ(t,e,r=$D(32)){const n=cW("message",t),{bytes:i,scalar:o}=OJ(e),a=cW("auxRand",r,32),s=PJ(o^zJ(SJ("BIP0340/aux",a))),u=SJ("BIP0340/nonce",s,i,n),h=TJ(zJ(u));if(h===vJ)throw new Error("sign failed: k is zero");const{bytes:c,scalar:l}=OJ(h),d=RJ(c,i,n),f=new Uint8Array(64);if(f.set(c,0),f.set(PJ(TJ(l+d*o)),32),!FJ(f,n,i))throw new Error("sign: Invalid signature produced");return f}function FJ(t,e,r){const n=cW("signature",t,64),i=cW("message",e),o=cW("publicKey",r,32);try{const t=CJ(zJ(o)),e=zJ(n.subarray(0,32));if(!mW(e,kJ,bJ))return!1;const r=zJ(n.subarray(32,64));if(!mW(r,kJ,wJ))return!1;const h=RJ(PJ(e),NJ(t),i),c=(a=t,s=r,u=TJ(-h),$J.BASE.multiplyAndAddUnsafe(a,s,u));return!(!c||!c.hasEvenY()||c.toAffine().x!==e)}catch(t){return!1}var a,s,u}const LJ=(()=>({getPublicKey:BJ,sign:DJ,verify:FJ,utils:{randomPrivateKey:xJ.utils.randomPrivateKey,lift_x:CJ,pointToBytes:NJ,numberToBytesBE:uW,bytesToNumberBE:aW,taggedHash:SJ,mod:NW}}))(),UJ=(()=>function(t,e){const r=e.map((t=>Array.from(t).reverse()));return(e,n)=>{const[i,o,a,s]=r.map((r=>r.reduce(((r,n)=>t.add(t.mul(r,e),n))))),[u,h]=RW(t,[o,s],!0);return e=t.mul(i,u),n=t.mul(n,t.mul(a,h)),{x:e,y:n}}}(AJ,[["0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7","0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581","0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262","0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"],["0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b","0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14","0x0000000000000000000000000000000000000000000000000000000000000001"],["0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c","0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3","0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931","0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"],["0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b","0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573","0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f","0x0000000000000000000000000000000000000000000000000000000000000001"]].map((t=>t.map((t=>BigInt(t)))))))(),qJ=(()=>lJ(AJ,{A:BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),B:BigInt("1771"),Z:AJ.create(BigInt("-11"))}))(),VJ=(()=>function(t,e,r){if("function"!=typeof e)throw new Error("mapToCurve() must be defined");function n(r){return t.fromAffine(e(r))}function i(e){const r=e.clearCofactor();return r.equals(t.ZERO)?t.ZERO:(r.assertValidity(),r)}return{defaults:r,hashToCurve(t,e){const o=yJ(t,2,{...r,DST:r.DST,...e}),a=n(o[0]),s=n(o[1]);return i(a.add(s))},encodeToCurve:(t,e)=>i(n(yJ(t,1,{...r,DST:r.encodeDST,...e})[0])),mapToCurve(t){if(!Array.isArray(t))throw new Error("expected array of bigints");for(const e of t)if("bigint"!=typeof e)throw new Error("expected array of bigints");return i(n(t))}}}(xJ.ProjectivePoint,(t=>{const{x:e,y:r}=qJ(AJ.create(t[0]));return UJ(e,r)}),{DST:"secp256k1_XMD:SHA-256_SSWU_RO_",encodeDST:"secp256k1_XMD:SHA-256_SSWU_NU_",p:AJ.ORDER,m:1,k:128,expand:"xmd",hash:XU}))(),HJ=(()=>VJ.hashToCurve)(),GJ=(()=>VJ.encodeToCurve)();var ZJ=Object.freeze({__proto__:null,secp256k1:xJ,schnorr:LJ,secp256k1_hasher:VJ,hashToCurve:HJ,encodeToCurve:GJ});async function KJ(t,e){const{address:r,chain:n=t.chain,hash:i,erc6492VerifierAddress:o=e.universalSignatureVerifierAddress??n?.contracts?.erc6492Verifier?.address,multicallAddress:a=e.multicallAddress??n?.contracts?.multicall3?.address,mode:s="auto"}=e;if(n?.verifyHash)return await n.verifyHash(t,e);const u=(()=>{const t=e.signature;return hB(t)?t:"object"==typeof t&&"r"in t&&"s"in t?function({r:t,s:e,to:r="hex",v:n,yParity:i}){const o=(()=>{if(0===i||1===i)return i;if(n&&(27n===n||28n===n||n>=35n))return n%2n===0n?1:0;throw new Error("Invalid `v` or `yParity` value")})(),a=`0x${new xJ.Signature(QB(t),QB(e)).toCompactHex()}${0===o?"1b":"1c"}`;return"hex"===r?a:gD(a)}(t):nD(t)})();try{if("eoa"===s)try{if(pq(oF(r),await iU({hash:i,signature:u})))return!0}catch{}return function(t){try{return gK(t),!0}catch{return!1}}(u)?await async function(t,e){const{address:r,blockHash:n,blockNumber:i,blockTag:o,hash:a,multicallAddress:s,requireCanonical:u}=e,{authorization:h,data:c,signature:l,to:d}=function(t){gK(t);const e=fV(cV(t,-64,-32)),r=cV(t,-e-64,-64),n=cV(t,0,-e-64),[i,o,a]=ZZ(pK,r);return{authorization:mK({address:i.delegation,chainId:Number(i.chainId),nonce:i.nonce,yParity:i.yParity,r:i.r,s:i.s}),signature:n,...a&&"0x"!==a?{data:a,to:o}:{}}}(e.signature);if(await YH(t,{address:r,blockHash:n,blockNumber:i,blockTag:o,requireCanonical:u})===cF(["0xef0100",h.address]))return await async function(t,e){const{address:r,blockHash:n,blockNumber:i,blockTag:o,hash:a,requireCanonical:s,signature:u}=e,h=await aB(t,XV,"readContract")({address:r,abi:PV,args:[a,u],blockHash:n,blockNumber:i,blockTag:o,functionName:"isValidSignature",requireCanonical:s}).catch((t=>{if(t instanceof yL)throw new WJ;throw t}));if(h.startsWith("0x1626ba7e"))return!0;throw new WJ}(t,{...e,signature:l});const f={address:h.address,chainId:Number(h.chainId),nonce:Number(h.nonce),r:iD(h.r,{size:32}),s:iD(h.s,{size:32}),yParity:h.yParity};if(!await async function({address:t,authorization:e,signature:r}){return pq(oF(t),await hU({authorization:e,signature:r}))}({address:r,authorization:f}))throw new WJ;const m=await aB(t,XV,"readContract")({...s?{address:s}:{code:RV},authorizationList:[f],abi:MV,blockHash:n,blockNumber:i,blockTag:"pending",functionName:"aggregate3",requireCanonical:u,args:[[...c?[{allowFailure:!0,target:d??r,callData:c}]:[],{allowFailure:!0,target:r,callData:$F({abi:PV,functionName:"isValidSignature",args:[a,l]})}]]}),p=m[m.length-1]?.returnData;if(p?.startsWith("0x1626ba7e"))return!0;throw new WJ}(t,{...e,multicallAddress:a,signature:u}):await async function(t,e){const{address:r,factory:n,factoryData:i,hash:o,signature:a,verifierAddress:s,...u}=e,h=await(async()=>n||i?FK(a)?a:function(t){const{data:e,signature:r,to:n}=t;return nV(KZ(JZ("address, bytes, bytes"),[n,e,r]),DK)}({data:i,signature:a,to:n}):a)(),c=s?{to:s,data:$F({abi:IV,functionName:"isValidSig",args:[r,o,h]}),...u}:{data:LV({abi:IV,args:[r,o,h],bytecode:zV}),...u},{data:l}=await aB(t,ZV,"call")(c).catch((t=>{if(t instanceof gL)throw new WJ;throw t}));if(function(t,e={}){let r=t;if(e.size&&(YB(r,{size:e.size}),r=JB(r)),"0x00"===JB(r))return!1;if("0x01"===JB(r))return!0;throw new KB(r)}(l??"0x0"))return!0;throw new WJ}(t,{...e,verifierAddress:o,signature:u})}catch(t){if("eoa"!==s)try{if(pq(oF(r),await iU({hash:i,signature:u})))return!0}catch{}if(t instanceof WJ)return!1;throw t}}class WJ extends Error{}function JJ(t,{emitOnBegin:e=!1,emitMissed:r=!1,onBlockNumber:n,onError:i,poll:o,pollingInterval:a=t.pollingInterval}){let s;return(void 0!==o?o:"webSocket"!==t.transport.type&&"ipc"!==t.transport.type&&("fallback"!==t.transport.type||"webSocket"!==t.transport.transports[0].config.type&&"ipc"!==t.transport.transports[0].config.type))?nH(JF(["watchBlockNumber",t.uid,e,r,a]),{onBlockNumber:n,onError:i},(n=>oH((async()=>{try{const e=await aB(t,cH,"getBlockNumber")({cacheTime:0});if(void 0!==s){if(e===s)return;if(e-s>1&&r)for(let t=s+1n;t<e;t++)n.onBlockNumber(t,s),s=t}(void 0===s||e>s)&&(n.onBlockNumber(e,s),s=e)}catch(t){n.onError?.(t)}}),{emitOnBegin:e,interval:a}))):nH(JF(["watchBlockNumber",t.uid,e,r]),{onBlockNumber:n,onError:i},(e=>{let r=!0,n=()=>r=!1;return(async()=>{try{const i=(()=>{if("fallback"===t.transport.type){const e=t.transport.transports.find((t=>"webSocket"===t.config.type||"ipc"===t.config.type));return e?e.value:t.transport}return t.transport})(),{unsubscribe:o}=await i.subscribe({params:["newHeads"],onData(t){if(!r)return;const n=QB(t.result?.number);e.onBlockNumber(n,s),s=n},onError(t){e.onError?.(t)}});n=o,r||n()}catch(t){i?.(t)}})(),()=>n()}))}const YJ=/^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Ethereum account:\n)(?<address>0x[a-fA-F0-9]{40})\n\n(?:(?<statement>.*)\n\n)?/,QJ=/(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.+))?/;async function XJ(t,e){const{address:r,domain:n,message:i,nonce:o,scheme:a,signature:s,time:u=new Date,...h}=e,c=function(t){const{scheme:e,statement:r,...n}=t.match(YJ)?.groups??{},{chainId:i,expirationTime:o,issuedAt:a,notBefore:s,requestId:u,...h}=t.match(QJ)?.groups??{},c=t.split("Resources:")[1]?.split("\n- ").slice(1);return{...n,...h,...i?{chainId:Number(i)}:{},...o?{expirationTime:new Date(o)}:{},...a?{issuedAt:new Date(a)}:{},...s?{notBefore:new Date(s)}:{},...u?{requestId:u}:{},...c?{resources:c}:{},...e?{scheme:e}:{},...r?{statement:r}:{}}}(i);if(!c.address)return!1;const l=function(t){const{address:e,domain:r,message:n,nonce:i,scheme:o,time:a=new Date}=t;if(r&&n.domain!==r)return!1;if(i&&n.nonce!==i)return!1;if(o&&n.scheme!==o)return!1;if(n.expirationTime&&a>=n.expirationTime)return!1;if(n.notBefore&&a<n.notBefore)return!1;try{if(!n.address)return!1;if(!uF(n.address,{strict:!1}))return!1;if(e&&!pq(n.address,e))return!1}catch{return!1}return!0}({address:r,domain:n,message:c,nonce:o,scheme:a,time:u});if(!l)return!1;const d=fG(i);return KJ(t,{address:c.address,hash:d,signature:s,...h})}function tY(t,e){return{amount:t,decimals:e,formatted:bK(t,e)}}function eY(t,e){const{decimals:r,token:n}=e,i=rY(t,n);if(i)return{address:i.address,decimals:r??i.decimals};if(uF(n,{strict:!1}))return{address:n,decimals:r??iY(t,n)};throw new Error(`Token "${n}" is not a declared ERC-20 token on the client's \`tokens\` array (with an address for the client's chain), and is not a valid address.`)}function rY(t,e){const r=t.tokens,n=t.chain?.id;if(!r||void 0===n)return;const i=function(t,e){const r=e.toLowerCase();for(const e of t)if(e.symbol?.toLowerCase()===r)return e;return}(r,e);if(i)return nY(i,n);if(uF(e,{strict:!1}))for(const t of r){const r=nY(t,n);if(r&&pq(r.address,e))return r}}function nY(t,e){const r=t.addresses[e];if(r)return{address:r,currency:t.currency,decimals:t.decimals,name:t.name,popular:t.popular,symbol:t.symbol}}function iY(t,e){const r=t.tokens,n=t.chain?.id;if(r&&void 0!==n)for(const t of r){const r=nY(t,n);if(r&&pq(r.address,e))return r.decimals}}async function oY(t,e){const{address:r,decimals:n}=eY(t,e);return void 0!==n?{address:r,decimals:n}:{address:r,decimals:await XV(t,{abi:TV,address:r,functionName:"decimals"})}}function aY(t){return{...t,data:$F(t),to:t.address}}async function sY(t,e){const{account:r,decimals:n,spender:i,token:o,...a}=e,[s,{decimals:u}]=await Promise.all([XV(t,{...a,...sY.call(t,{account:r,spender:i,token:o})}),oY(t,{decimals:n,token:o})]);return tY(s,u)}async function uY(t,e){const{account:r=t.account,decimals:n,token:i,...o}=e;if(!r)throw new fH;const a=IF(r).address,[s,{decimals:u}]=await Promise.all([XV(t,{...o,...uY.call(t,{account:a,token:i})}),oY(t,{decimals:n,token:i})]);return tY(s,u)}async function hY(t,e){const{token:r,...n}=e,{address:i}=eY(t,{token:r}),o=rY(t,r),[a,s,u]=await Promise.all([o?.decimals??XV(t,{...n,abi:TV,address:i,functionName:"decimals"}),o?.name??XV(t,{...n,abi:TV,address:i,functionName:"name"}),o?.symbol??XV(t,{...n,abi:TV,address:i,functionName:"symbol"})]);return{decimals:a,name:s,symbol:u}}async function cY(t,e){const{decimals:r,token:n,...i}=e,[o,{decimals:a}]=await Promise.all([XV(t,{...i,...cY.call(t,{token:n})}),oY(t,{decimals:r,token:n})]);return tY(o,a)}function lY(t){return{call:e=>ZV(t,e),createAccessList:e=>KH(t,e),createBlockFilter:()=>async function(t){const e=NF(t,{method:"eth_newBlockFilter"}),r=await t.request({method:"eth_newBlockFilter"});return{id:r,request:e(r),type:"block"}}(t),createContractEventFilter:e=>PF(t,e),createEventFilter:e=>WH(t,e),createPendingTransactionFilter:()=>JH(t),estimateContractGas:e=>async function(t,e){const{abi:r,address:n,args:i,functionName:o,dataSuffix:a=("string"==typeof t.dataSuffix?t.dataSuffix:t.dataSuffix?.value),...s}=e,u=$F({abi:r,args:i,functionName:o});try{return await aB(t,mq,"estimateGas")({data:`${u}${a?a.replace("0x",""):""}`,to:n,...s})}catch(t){throw rU(t,{abi:r,address:n,args:i,docsPath:"/docs/contract/estimateContractGas",functionName:o,sender:(s.account?IF(s.account):void 0)?.address})}}(t,e),estimateGas:e=>mq(t,e),getBalance:e=>async function(t,{address:e,blockHash:r,blockNumber:n,blockTag:i=t.experimental_blockTag??"latest",requireCanonical:o}){const a=qU({blockHash:r,blockNumber:n,blockTag:i,requireCanonical:o});if(t.batch?.multicall&&t.chain?.contracts?.multicall3){const a=t.chain.contracts.multicall3.address,s=$F({abi:MV,functionName:"getEthBalance",args:[e]}),{data:u}=await aB(t,ZV,"call")({to:a,data:s,blockHash:r,blockNumber:n,blockTag:i,requireCanonical:o});return Eq({abi:MV,functionName:"getEthBalance",args:[e],data:u||"0x"})}const s=await t.request({method:"eth_getBalance",params:[e,a]});return BigInt(s)}(t,e),getBlobBaseFee:()=>async function(t){const e=await t.request({method:"eth_blobBaseFee"});return BigInt(e)}(t),getBlock:e=>DU(t,e),getBlockNumber:e=>cH(t,e),getBlockReceipts:e=>async function(t,{blockHash:e,blockNumber:r,blockTag:n=t.experimental_blockTag??"latest"}={}){const i=void 0!==r?iD(r):void 0,o=await t.request({method:"eth_getBlockReceipts",params:[e||i||n]},{dedupe:Boolean(e||i)});if(!o)throw new CU({blockHash:e,blockNumber:r});const a=t.chain?.formatters?.transactionReceipt?.format||gH;return o.map((t=>a(t,"getBlockReceipts")))}(t,e),getBlockTransactionCount:e=>async function(t,{blockHash:e,blockNumber:r,blockTag:n="latest"}={}){const i=void 0!==r?iD(r):void 0;let o;return o=e?await t.request({method:"eth_getBlockTransactionCountByHash",params:[e]},{dedupe:!0}):await t.request({method:"eth_getBlockTransactionCountByNumber",params:[i||n]},{dedupe:Boolean(i)}),XB(o)}(t,e),getBytecode:e=>YH(t,e),getChainId:()=>uq(t),getCode:e=>YH(t,e),getContractEvents:e=>_q(t,e),getDelegation:e=>async function(t,{address:e,blockNumber:r,blockTag:n="latest"}){const i=await YH(t,{address:e,...void 0!==r?{blockNumber:r}:{blockTag:n}});if(i&&23===cB(i)&&i.startsWith("0xef0100"))return oF(lF(i,3,23))}(t,e),getEip712Domain:e=>async function(t,e){const{address:r,factory:n,factoryData:i}=e;try{const[e,o,a,s,u,h,c]=await aB(t,XV,"readContract")({abi:XH,address:r,functionName:"eip712Domain",factory:n,factoryData:i});return{domain:{name:o,version:a,chainId:Number(s),verifyingContract:u,salt:h},extensions:c,fields:e}}catch(t){const e=t;if("ContractFunctionExecutionError"===e.name&&"ContractFunctionZeroDataError"===e.cause.name)throw new QH({address:r});throw e}}(t,e),getEnsAddress:e=>$H(t,e),getEnsAvatar:e=>async function(t,{blockNumber:e,blockTag:r,assetGatewayUrls:n,name:i,gatewayUrls:o,strict:a,universalResolverAddress:s}){const u=await aB(t,ZH,"getEnsText")({blockNumber:e,blockTag:r,key:"avatar",name:i,universalResolverAddress:s,gatewayUrls:o,strict:a});if(!u)return null;try{return await GH(t,{record:u,gatewayUrls:n})}catch{return null}}(t,e),getEnsName:e=>async function(t,e){const{address:r,blockNumber:n,blockTag:i,coinType:o=60n,gatewayUrls:a,strict:s}=e,{chain:u}=t,h=(()=>{if(e.universalResolverAddress)return e.universalResolverAddress;if(!u)throw new Error("client chain not configured. universalResolverAddress is required.");return UV({blockNumber:n,chain:u,contract:"ensUniversalResolver"})})();try{const e={address:h,abi:jV,args:[r,o,a??[xH]],functionName:"reverseWithGateways",blockNumber:n,blockTag:i},s=aB(t,XV,"readContract"),[u]=await s(e);return u||null}catch(t){if(s)throw t;if(_H(t))return null;throw t}}(t,e),getEnsResolver:e=>async function(t,e){const{blockNumber:r,blockTag:n,name:i}=e,{chain:o}=t,a=(()=>{if(e.universalResolverAddress)return e.universalResolverAddress;if(!o)throw new Error("client chain not configured. universalResolverAddress is required.");return UV({blockNumber:r,chain:o,contract:"ensUniversalResolver"})})(),s=o?.ensTlds;if(s&&!s.some((t=>i.endsWith(t))))throw new Error(`${i} is not a valid ENS TLD (${s?.join(", ")}) for chain "${o.name}" (id: ${o.id}).`);const[u]=await aB(t,XV,"readContract")({address:a,abi:[{inputs:[{type:"bytes"}],name:"findResolver",outputs:[{type:"address"},{type:"bytes32"},{type:"uint256"}],stateMutability:"view",type:"function"}],functionName:"findResolver",args:[eD(TH(i))],blockNumber:r,blockTag:n});return u}(t,e),getEnsText:e=>ZH(t,e),getFeeHistory:e=>tG(t,e),estimateFeesPerGas:e=>async function(t,e){return UU(t,e)}(t,e),getFilterChanges:t=>lH(0,t),getFilterLogs:t=>async function(t,{filter:e}){const r=e.strict??!1,n=(await e.request({method:"eth_getFilterLogs",params:[e.id]})).map((t=>gq(t)));return e.abi?vq({abi:e.abi,logs:n,strict:r}):n}(0,t),getGasPrice:()=>FU(t),getLogs:e=>kq(t,e),getProof:e=>wK(t,e),estimateMaxPriorityFeePerGas:e=>async function(t,e){return LU(t,e)}(t,e),fillTransaction:e=>hq(t,e),getRawTransaction:e=>async function(t,{hash:e}){const r=await t.request({method:"eth_getRawTransactionByHash",params:[e]},{dedupe:!0});if(!r)throw new hL({hash:e});return r}(t,e),getStorageAt:e=>async function(t,{address:e,blockHash:r,blockNumber:n,blockTag:i="latest",requireCanonical:o,slot:a}){const s=qU({blockHash:r,blockNumber:n,blockTag:i,requireCanonical:o});return await t.request({method:"eth_getStorageAt",params:[e,a,s]})}(t,e),getTransaction:e=>vK(t,e),getTransactionConfirmations:e=>async function(t,{hash:e,transactionReceipt:r}){const[n,i]=await Promise.all([aB(t,cH,"getBlockNumber")({}),e?aB(t,vK,"getTransaction")({hash:e}):void 0]),o=r?.blockNumber||i?.blockNumber;return o?n-o+1n:0n}(t,e),getTransactionCount:e=>VU(t,e),getTransactionReceipt:e=>kK(t,e),multicall:e=>_K(t,e),prepareTransactionRequest:e=>fq(t,e),readContract:e=>XV(t,e),sendRawTransaction:e=>async function(t,{serializedTransaction:e}){return t.request({method:"eth_sendRawTransaction",params:[e]},{retryCount:0})}(t,e),sendRawTransactionSync:e=>async function(t,{serializedTransaction:e,throwOnReceiptRevert:r,timeout:n}){const i=await t.request({method:"eth_sendRawTransactionSync",params:n?[e,n]:[e]},{retryCount:0}),o=(t.chain?.formatters?.transactionReceipt?.format||gH)(i);if("reverted"===o.status&&r)throw new lL({receipt:o});return o}(t,e),simulate:e=>MK(t,e),simulateBlocks:e=>MK(t,e),simulateCalls:e=>BK(t,e),simulateContract:e=>async function(t,e){const{abi:r,address:n,args:i,functionName:o,dataSuffix:a=("string"==typeof t.dataSuffix?t.dataSuffix:t.dataSuffix?.value),...s}=e,u=s.account?IF(s.account):t.account,h=$F({abi:r,args:i,functionName:o});try{const{data:c}=await aB(t,ZV,"call")({batch:!1,data:`${h}${a?a.replace("0x",""):""}`,to:n,...s,account:u});return{result:Eq({abi:r,args:i,functionName:o,data:c||"0x"}),request:{abi:r.filter((t=>"name"in t&&t.name===e.functionName)),address:n,args:i,dataSuffix:a,functionName:o,...s,account:u}}}catch(t){throw rU(t,{abi:r,address:n,args:i,docsPath:"/docs/contract/simulateContract",functionName:o,sender:u?.address})}}(t,e),verifyHash:e=>KJ(t,e),verifyMessage:e=>async function(t,{address:e,message:r,factory:n,factoryData:i,signature:o,...a}){const s=fG(r);return aB(t,KJ,"verifyHash")({address:e,factory:n,factoryData:i,hash:s,signature:o,...a})}(t,e),verifySiweMessage:e=>XJ(t,e),verifyTypedData:e=>async function(t,e){const{address:r,factory:n,factoryData:i,signature:o,message:a,primaryType:s,types:u,domain:h,...c}=e,l=vG({message:a,primaryType:s,types:u,domain:h});return aB(t,KJ,"verifyHash")({address:r,factory:n,factoryData:i,hash:l,signature:o,...c})}(t,e),uninstallFilter:t=>dH(0,t),waitForTransactionReceipt:e=>async function(t,e){const{checkReplacement:r=t.chain?.supportsTransactionReplacementDetection??!0,confirmations:n=1,hash:i,onReplaced:o,retryCount:a=6,retryDelay:s=(({count:t})=>200*~~(1<<t)),timeout:u=18e4}=e,h=JF(["waitForTransactionReceipt",t.uid,i]),c=e.pollingInterval?e.pollingInterval:t.chain?.experimental_preconfirmationTime?t.chain.experimental_preconfirmationTime:t.pollingInterval;let l,d,f,m,p,g=!1;const{promise:y,resolve:b,reject:w}=VV(),v=u?setTimeout((()=>{p?.(),m?.(),w(new dL({hash:i}))}),u):void 0;return m=nH(h,{onReplaced:o,resolve:b,reject:w},(async e=>{if(f=await aB(t,kK,"getTransactionReceipt")({hash:i}).catch((()=>{})),f&&n<=1)return clearTimeout(v),e.resolve(f),void m?.();p=aB(t,JJ,"watchBlockNumber")({emitMissed:!0,emitOnBegin:!0,poll:!0,pollingInterval:c,async onBlockNumber(o){const u=t=>{clearTimeout(v),p?.(),t(),m?.()};let h=o;if(!g)try{if(f){if(n>1&&(!f.blockNumber||h-f.blockNumber+1n<n))return;return void u((()=>e.resolve(f)))}if(r&&!l&&(g=!0,await mH((async()=>{l=await aB(t,vK,"getTransaction")({hash:i}),l.blockNumber&&(h=l.blockNumber)}),{delay:s,retryCount:a}),g=!1),f=await aB(t,kK,"getTransactionReceipt")({hash:i}),n>1&&(!f.blockNumber||h-f.blockNumber+1n<n))return;u((()=>e.resolve(f)))}catch(r){if(r instanceof hL||r instanceof cL){if(!l)return void(g=!1);try{d=l,g=!0;const r=await mH((()=>aB(t,DU,"getBlock")({blockNumber:h,includeTransactions:!0})),{delay:s,retryCount:a,shouldRetry:({error:t})=>t instanceof CU});g=!1;const i=r.transactions.find((({from:t,nonce:e})=>t===d.from&&e===d.nonce));if(!i)return;if(f=await aB(t,kK,"getTransactionReceipt")({hash:i.hash}),n>1&&(!f.blockNumber||h-f.blockNumber+1n<n))return;let o="replaced";i.to===d.to&&i.value===d.value&&i.input===d.input?o="repriced":i.from===i.to&&0n===i.value&&(o="cancelled"),u((()=>{e.onReplaced?.({reason:o,replacedTransaction:d,transaction:i,transactionReceipt:f}),e.resolve(f)}))}catch(t){u((()=>e.reject(t)))}}else u((()=>e.reject(r)))}}})})),y}(t,e),watchBlocks:e=>function(t,{blockTag:e=t.experimental_blockTag??"latest",emitMissed:r=!1,emitOnBegin:n=!1,onBlock:i,onError:o,includeTransactions:a,poll:s,pollingInterval:u=t.pollingInterval}){const h=void 0!==s?s:"webSocket"!==t.transport.type&&"ipc"!==t.transport.type&&("fallback"!==t.transport.type||"webSocket"!==t.transport.transports[0].config.type&&"ipc"!==t.transport.transports[0].config.type),c=a??!1;let l;return h?nH(JF(["watchBlocks",t.uid,e,r,n,c,u]),{onBlock:i,onError:o},(i=>oH((async()=>{try{const n=await aB(t,DU,"getBlock")({blockTag:e,includeTransactions:c});if(null!==n.number&&null!=l?.number){if(n.number===l.number)return;if(n.number-l.number>1&&r)for(let e=l?.number+1n;e<n.number;e++){const r=await aB(t,DU,"getBlock")({blockNumber:e,includeTransactions:c});i.onBlock(r,l),l=r}}(null==l?.number||"pending"===e&&null==n?.number||null!==n.number&&n.number>l.number)&&(i.onBlock(n,l),l=n)}catch(t){i.onError?.(t)}}),{emitOnBegin:n,interval:u}))):(()=>{let r=!0,a=!0,s=()=>r=!1;return(async()=>{try{n&&aB(t,DU,"getBlock")({blockTag:e,includeTransactions:c}).then((t=>{r&&a&&(i(t,void 0),a=!1)})).catch(o);const u=(()=>{if("fallback"===t.transport.type){const e=t.transport.transports.find((t=>"webSocket"===t.config.type||"ipc"===t.config.type));return e?e.value:t.transport}return t.transport})(),{unsubscribe:h}=await u.subscribe({params:["newHeads"],async onData(e){if(!r)return;const n=await aB(t,DU,"getBlock")({blockNumber:e.result?.number,includeTransactions:c}).catch((()=>{}));r&&(i(n,l),a=!1,l=n)},onError(t){o?.(t)}});s=h,r||s()}catch(t){o?.(t)}})(),()=>s()})()}(t,e),watchBlockNumber:e=>JJ(t,e),watchContractEvent:e=>function(t,e){const{abi:r,address:n,args:i,batch:o=!0,eventName:a,fromBlock:s,onError:u,onLogs:h,poll:c,pollingInterval:l=t.pollingInterval,strict:d}=e;return(void 0!==c?c:"bigint"==typeof s||"webSocket"!==t.transport.type&&"ipc"!==t.transport.type&&("fallback"!==t.transport.type||"webSocket"!==t.transport.transports[0].config.type&&"ipc"!==t.transport.transports[0].config.type))?(()=>{const e=d??!1;return nH(JF(["watchContractEvent",n,i,o,t.uid,a,l,e,s]),{onLogs:h,onError:u},(u=>{let h,c;void 0!==s&&(h=s-1n);let d=!1;const f=oH((async()=>{if(d)try{let s;if(c)s=await aB(t,lH,"getFilterChanges")({filter:c});else{const o=await aB(t,cH,"getBlockNumber")({});s=h&&h<o?await aB(t,_q,"getContractEvents")({abi:r,address:n,args:i,eventName:a,fromBlock:h+1n,toBlock:o,strict:e}):[],h=o}if(0===s.length)return;if(o)u.onLogs(s);else for(const t of s)u.onLogs([t])}catch(t){c&&t instanceof $L&&(d=!1),u.onError?.(t)}else{try{c=await aB(t,PF,"createContractEventFilter")({abi:r,address:n,args:i,eventName:a,strict:e,fromBlock:s})}catch{}d=!0}}),{emitOnBegin:!0,interval:l});return async()=>{c&&await aB(t,dH,"uninstallFilter")({filter:c}),f()}}))})():(()=>{const e=d??!1,s=JF(["watchContractEvent",n,i,o,t.uid,a,l,e]);let c=!0,f=()=>c=!1;return nH(s,{onLogs:h,onError:u},(e=>((async()=>{try{const o=(()=>{if("fallback"===t.transport.type){const e=t.transport.transports.find((t=>"webSocket"===t.config.type||"ipc"===t.config.type));return e?e.value:t.transport}return t.transport})(),s=a?jF({abi:r,eventName:a,args:i}):[],{unsubscribe:u}=await o.subscribe({params:["logs",{address:n,topics:s}],onData(t){if(!c)return;const n=t.result;try{const{eventName:t,args:i}=bq({abi:r,data:n.data,topics:n.topics,strict:d}),o=gq(n,{args:i,eventName:t});e.onLogs([o])}catch(t){let r,i;if(t instanceof OB||t instanceof CB){if(d)return;r=t.abiItem.name,i=t.abiItem.inputs?.some((t=>!("name"in t&&t.name)))}const o=gq(n,{args:i?[]:{},eventName:r});e.onLogs([o])}},onError(t){e.onError?.(t)}});f=u,c||f()}catch(t){u?.(t)}})(),()=>f())))})()}(t,e),watchEvent:e=>function(t,{address:e,args:r,batch:n=!0,event:i,events:o,fromBlock:a,onError:s,onLogs:u,poll:h,pollingInterval:c=t.pollingInterval,strict:l}){const d=void 0!==h?h:"bigint"==typeof a||"webSocket"!==t.transport.type&&"ipc"!==t.transport.type&&("fallback"!==t.transport.type||"webSocket"!==t.transport.transports[0].config.type&&"ipc"!==t.transport.transports[0].config.type),f=l??!1;return d?nH(JF(["watchEvent",e,r,n,t.uid,i,c,a]),{onLogs:u,onError:s},(s=>{let u,h;void 0!==a&&(u=a-1n);let l=!1;const d=oH((async()=>{if(l)try{let a;if(h)a=await aB(t,lH,"getFilterChanges")({filter:h});else{const n=await aB(t,cH,"getBlockNumber")({});a=u&&u!==n?await aB(t,kq,"getLogs")({address:e,args:r,event:i,events:o,fromBlock:u+1n,toBlock:n}):[],u=n}if(0===a.length)return;if(n)s.onLogs(a);else for(const t of a)s.onLogs([t])}catch(t){h&&t instanceof $L&&(l=!1),s.onError?.(t)}else{try{h=await aB(t,WH,"createEventFilter")({address:e,args:r,event:i,events:o,strict:f,fromBlock:a})}catch{}l=!0}}),{emitOnBegin:!0,interval:c});return async()=>{h&&await aB(t,dH,"uninstallFilter")({filter:h}),d()}})):(()=>{let n=!0,a=()=>n=!1;return(async()=>{try{const h=(()=>{if("fallback"===t.transport.type){const e=t.transport.transports.find((t=>"webSocket"===t.config.type||"ipc"===t.config.type));return e?e.value:t.transport}return t.transport})(),c=o??(i?[i]:void 0);let d=[];if(c){const t=c.flatMap((t=>jF({abi:[t],eventName:t.name,args:r})));d=[t],i&&(d=d[0])}const{unsubscribe:m}=await h.subscribe({params:["logs",{address:e,topics:d}],onData(t){if(!n)return;const e=t.result;try{const{eventName:t,args:r}=bq({abi:c??[],data:e.data,topics:e.topics,strict:f}),n=gq(e,{args:r,eventName:t});u([n])}catch(t){let r,n;if(t instanceof OB||t instanceof CB){if(l)return;r=t.abiItem.name,n=t.abiItem.inputs?.some((t=>!("name"in t&&t.name)))}const i=gq(e,{args:n?[]:{},eventName:r});u([i])}},onError(t){s?.(t)}});a=m,n||a()}catch(t){s?.(t)}})(),()=>a()})()}(t,e),watchPendingTransactions:e=>function(t,{batch:e=!0,onError:r,onTransactions:n,poll:i,pollingInterval:o=t.pollingInterval}){return(void 0!==i?i:"webSocket"!==t.transport.type&&"ipc"!==t.transport.type)?nH(JF(["watchPendingTransactions",t.uid,e,o]),{onTransactions:n,onError:r},(r=>{let n;const i=oH((async()=>{try{if(!n)try{return void(n=await aB(t,JH,"createPendingTransactionFilter")({}))}catch(t){throw i(),t}const o=await aB(t,lH,"getFilterChanges")({filter:n});if(0===o.length)return;if(e)r.onTransactions(o);else for(const t of o)r.onTransactions([t])}catch(t){r.onError?.(t)}}),{emitOnBegin:!0,interval:o});return async()=>{n&&await aB(t,dH,"uninstallFilter")({filter:n}),i()}})):(()=>{let e=!0,i=()=>e=!1;return(async()=>{try{const{unsubscribe:o}=await t.transport.subscribe({params:["newPendingTransactions"],onData(t){if(!e)return;const r=t.result;n([r])},onError(t){r?.(t)}});i=o,e||i()}catch(t){r?.(t)}})(),()=>i()})()}(t,e),token:dY(t)}}function dY(t){return{getAllowance:kH(t,sY),getBalance:kH(t,uY),getMetadata:kH(t,hY),getTotalSupply:kH(t,cY)}}function fY(t){const{key:e="public",name:r="Public Client"}=t,n=function(t){const{batch:e,chain:r,ccipRead:n,dataSuffix:i,key:o="base",name:a="Base Client",tokens:s,type:u="base"}=t,h=t.experimental_blockTag??("number"==typeof r?.experimental_preconfirmationTime?"pending":void 0),c=r?.blockTime??12e3,l=Math.min(Math.max(Math.floor(c/2),500),4e3),d=t.pollingInterval??l,f=t.cacheTime??d,m=t.account?IF(t.account):void 0,{config:p,request:g,value:y}=t.transport({account:m,chain:r,pollingInterval:d}),b={account:m,batch:e,cacheTime:f,ccipRead:n,chain:r,dataSuffix:i,key:o,name:a,pollingInterval:d,request:g,tokens:s,transport:{...p,...y},type:u,uid:wH(),...h?{experimental_blockTag:h}:{}};return Object.assign(b,{extend:function t(e){return r=>{const n=r(e);for(const t in b)delete n[t];const i={...e,...n};for(const t in n){const r=e[t],o=n[t];vH(r)&&vH(o)&&(i[t]={...r,...o})}return Object.assign(i,{extend:t(i)})}}(b)})}({...t,key:e,name:r,type:"publicClient"});return n.extend(lY)}!function(t){t.call=function(t,e){return aY({address:eY(t,e).address,abi:TV,functionName:"allowance",args:[e.account,e.spender]})}}(sY||(sY={})),function(t){t.call=function(t,e){const r=e.account??t.account;if(!r)throw new fH;const n=IF(r).address;return aY({address:eY(t,e).address,abi:TV,functionName:"balanceOf",args:[n]})}}(uY||(uY={})),function(t){t.call=function(t,e){return aY({address:eY(t,e).address,abi:TV,args:[],functionName:"totalSupply"})}}(cY||(cY={}));class mY extends mB{constructor(){super("No URL was provided to the Transport. Please provide a valid RPC URL to the Transport.",{docsPath:"/docs/clients/intro",name:"UrlRequiredError"})}}let pY=0;const gY=new WeakMap;function yY(t){if(!t)return"default";const e=gY.get(t);if(void 0!==e)return e;const r=pY++;return gY.set(t,r),r}function bY(t,e={}){const{batch:r,fetchFn:n,fetchOptions:i,key:o="http",maxResponseBodySize:a,methods:s,name:u="HTTP JSON-RPC",onFetchRequest:h,onFetchResponse:c,retryDelay:l,raw:d}=e;return({chain:f,retryCount:m,timeout:p})=>{const{batchSize:g=1e3,wait:y=0}="object"==typeof r?r:{},b=e.retryCount??m,w=p??e.timeout??1e4,v=t||f?.rpcUrls.default.http[0];if(!v)throw new mY;const k=dG(v,{fetchFn:n,fetchOptions:i,maxResponseBodySize:a,onRequest:h,onResponse:c,timeout:w});return function({key:t,methods:e,name:r,request:n,retryCount:i=3,retryDelay:o=150,timeout:a,type:s},u){return{config:{key:t,methods:e,name:r,request:n,retryCount:i,retryDelay:o,timeout:a,type:s},request:rG(n,{methods:e,retryCount:i,retryDelay:o,uid:wH()}),value:u}}({key:o,methods:s,name:u,async request({method:t,params:e},n){const i={method:t,params:e},o=n?.signal?{signal:n.signal}:void 0,{schedule:a}=GV({id:`${v}.${yY(n?.signal)}`,wait:y,shouldSplitBatch:t=>t.length>g,fn:t=>k.request({body:t,fetchOptions:o}),sort:(t,e)=>t.id-e.id}),[{error:s,result:u}]=await(async t=>r?a(t):[await k.request({body:t,fetchOptions:o})])(i);if(d)return{error:s,result:u};if(s)throw new EL({body:i,error:s,url:v});return u},retryCount:b,retryDelay:l,timeout:w,type:"http"},{fetchOptions:i,url:v})}}const wY=new Map;function vY(t,e={}){if("evm"!==fR(t))throw new Error(`Network '${t}' is not supported`);const r=dR(t),n=lR(e),i=mR(r,n),o=wY.get(i);if(o)return o;const a=fY({ccipRead:n.timeout>0?(s=n.timeout,{request:t=>{const e=new AbortController,r=setTimeout((()=>e.abort()),s);return"object"==typeof r&&"unref"in r&&r.unref(),sG(Object.assign(Object.assign({},t),{requestOptions:{signal:e.signal}})).finally((()=>clearTimeout(r)))}}):void 0,transport:bY(`${n.broviderUrl}/${r}`,{retryCount:0,timeout:n.timeout})});var s;return wY.set(i,a),a}const kY="0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",_Y=oB(["function owner(bytes32 node) view returns (address)"]),MY=oB(["function ownerOf(uint256 id) view returns (address)"]),EY=oB(["error DNSDecodingFailed(bytes dns)","error DNSEncodingFailed(string ens)","error EmptyAddress()","error HttpError(uint16 status, string message)","error InvalidBatchGatewayResponse()","error ResolverError(bytes errorData)","error ResolverNotContract(bytes name, address resolver)","error ResolverNotFound(bytes name)","error ReverseAddressMismatch(string primary, bytes primaryAddress)","error UnsupportedResolverProfile(bytes4 selector)","function findOwner(bytes name) view returns (address owner)"]),AY="0x0000000000000000000000000000000000000000";function xY(t){const e=t.endsWith(".eth"),r=t.split(".");if(1===r.length)return"tld";if(2!==r.length||e){if(r.length>2)return"subdomain";if(e)return"ens";throw new Error("Invalid domain")}return"other-tld"}function jY(t,e){var r,n;const i="function"==typeof(null==e?void 0:e.walk)?e.walk((t=>t instanceof bL)):void 0,o=null===(r=null==i?void 0:i.data)||void 0===r?void 0:r.errorName,a=null===(n=null==i?void 0:i.data)||void 0===n?void 0:n.args;return"ResolverNotFound"===o||"ResolverNotContract"===o||"UnsupportedResolverProfile"===o||"ResolverError"===o&&("0xd6234725"===(null==a?void 0:a[0])||"other-tld"===t)||"HttpError"===o&&404===(null==a?void 0:a[0])}function SY(t,e,n){return r(this,void 0,void 0,(function*(){try{return yield t.getEnsAddress({name:e,universalResolverAddress:n,strict:!0})}catch(t){if(jY(xY(e),t))return null;throw t}}))}function NY(t){return r(this,void 0,void 0,(function*(){var e;const r=yield QX(`https://cloudflare-dns.com/dns-query?name=${t}&type=TXT`,{headers:{accept:"application/dns-json"}}),n=yield r.json();if(3===n.Status)return AY;if(0!==n.Status)throw new Error("Failed to fetch DNS Owner");const i=null===(e=n.Answer)||void 0===e?void 0:e.find((t=>t.data.includes("ENS1")));return i?or(i.data.replace(new RegExp('"',"g"),"").split(" ").pop()):AY}))}function PY(t,e){return r(this,arguments,void 0,(function*(t,e,r="1",n={}){var i;let o;try{o=ph(t)}catch(t){return null}const a=null===(i=sR[r])||void 0===i?void 0:i.ensUniversalResolver;if(!a)throw new Error("Network not supported");const s=vY(r,n);try{return yield s.getEnsText({name:o,key:e,universalResolverAddress:a,blockNumber:n.blockNumber,blockTag:n.blockTag,strict:!0})}catch(t){if(jY(xY(o),t))return null;throw t}}))}function IY(t){return r(this,arguments,void 0,(function*(t,e="1",r={}){var n;const i=null===(n=sR[e])||void 0===n?void 0:n.ensUniversalResolver;if(!i)throw new Error("Network not supported");const o=xY(t),a=vY(e,r);let s,u;try{s=ph(t),u=NH(s)}catch(t){return AY}const h=r.ensNameWrapper||sR[e].ensNameWrapper;let c=AY;if("11155111"===String(e)&&(c=yield a.readContract({address:i,abi:EY,functionName:"findOwner",args:[eD(TH(s))]})),c&&c!==AY||(c=yield a.readContract({address:kY,abi:_Y,functionName:"owner",args:[u]})),c===h&&(c=yield a.readContract({address:h,abi:MY,functionName:"ownerOf",args:[BigInt(u)]})),c===AY&&"other-tld"===o){(yield SY(a,s,i))&&(c=yield NY(t))}return c===AY&&"subdomain"===o&&(c=(yield SY(a,s,i))||AY),c||AY}))}function TY(t){return!!t.primaryType&&!!t.types.StarkNetDomain}function $Y(t,e,n){return r(this,arguments,void 0,(function*(t,e,r,n="0x534e5f4d41494e",i={}){try{const o=pR(n,i);return yield o.getClassAt(t),o.verifyMessageInStarknet(r,e,t)}catch(t){if(t.message.includes("Contract not found"))throw new Error("Contract not deployed");throw t}}))}var OY=Object.freeze({__proto__:null,isStarknetMessage:TY,getHash:function(t,e){const{domain:r,types:n,primaryType:i,message:o}=t;return CC.getMessageHash({types:n,primaryType:i,domain:r,message:o},e)},default:$Y});function CY(t){return Ge(Lr(t))}var zY=a((function(t){!function(t,e){function r(t,e){if(!t)throw new Error(e||"Assertion failed")}function n(t,e){t.super_=e;var r=function(){};r.prototype=e.prototype,t.prototype=new r,t.prototype.constructor=t}function i(t,e,r){if(i.isBN(t))return t;this.negative=0,this.words=null,this.length=0,this.red=null,null!==t&&("le"!==e&&"be"!==e||(r=e,e=10),this._init(t||0,e||10,r||"be"))}var o;"object"==typeof t?t.exports=i:e.BN=i,i.BN=i,i.wordSize=26;try{o="undefined"!=typeof window&&void 0!==window.Buffer?window.Buffer:ht.Buffer}catch(t){}function a(t,e){var n=t.charCodeAt(e);return n>=48&&n<=57?n-48:n>=65&&n<=70?n-55:n>=97&&n<=102?n-87:void r(!1,"Invalid character in "+t)}function s(t,e,r){var n=a(t,r);return r-1>=e&&(n|=a(t,r-1)<<4),n}function u(t,e,n,i){for(var o=0,a=0,s=Math.min(t.length,n),u=e;u<s;u++){var h=t.charCodeAt(u)-48;o*=i,a=h>=49?h-49+10:h>=17?h-17+10:h,r(h>=0&&a<i,"Invalid character"),o+=a}return o}function h(t,e){t.words=e.words,t.length=e.length,t.negative=e.negative,t.red=e.red}if(i.isBN=function(t){return t instanceof i||null!==t&&"object"==typeof t&&t.constructor.wordSize===i.wordSize&&Array.isArray(t.words)},i.max=function(t,e){return t.cmp(e)>0?t:e},i.min=function(t,e){return t.cmp(e)<0?t:e},i.prototype._init=function(t,e,n){if("number"==typeof t)return this._initNumber(t,e,n);if("object"==typeof t)return this._initArray(t,e,n);"hex"===e&&(e=16),r(e===(0|e)&&e>=2&&e<=36);var i=0;"-"===(t=t.toString().replace(/\s+/g,""))[0]&&(i++,this.negative=1),i<t.length&&(16===e?this._parseHex(t,i,n):(this._parseBase(t,e,i),"le"===n&&this._initArray(this.toArray(),e,n)))},i.prototype._initNumber=function(t,e,n){t<0&&(this.negative=1,t=-t),t<67108864?(this.words=[67108863&t],this.length=1):t<4503599627370496?(this.words=[67108863&t,t/67108864&67108863],this.length=2):(r(t<9007199254740992),this.words=[67108863&t,t/67108864&67108863,1],this.length=3),"le"===n&&this._initArray(this.toArray(),e,n)},i.prototype._initArray=function(t,e,n){if(r("number"==typeof t.length),t.length<=0)return this.words=[0],this.length=1,this;this.length=Math.ceil(t.length/3),this.words=new Array(this.length);for(var i=0;i<this.length;i++)this.words[i]=0;var o,a,s=0;if("be"===n)for(i=t.length-1,o=0;i>=0;i-=3)a=t[i]|t[i-1]<<8|t[i-2]<<16,this.words[o]|=a<<s&67108863,this.words[o+1]=a>>>26-s&67108863,(s+=24)>=26&&(s-=26,o++);else if("le"===n)for(i=0,o=0;i<t.length;i+=3)a=t[i]|t[i+1]<<8|t[i+2]<<16,this.words[o]|=a<<s&67108863,this.words[o+1]=a>>>26-s&67108863,(s+=24)>=26&&(s-=26,o++);return this._strip()},i.prototype._parseHex=function(t,e,r){this.length=Math.ceil((t.length-e)/6),this.words=new Array(this.length);for(var n=0;n<this.length;n++)this.words[n]=0;var i,o=0,a=0;if("be"===r)for(n=t.length-1;n>=e;n-=2)i=s(t,e,n)<<o,this.words[a]|=67108863&i,o>=18?(o-=18,a+=1,this.words[a]|=i>>>26):o+=8;else for(n=(t.length-e)%2==0?e+1:e;n<t.length;n+=2)i=s(t,e,n)<<o,this.words[a]|=67108863&i,o>=18?(o-=18,a+=1,this.words[a]|=i>>>26):o+=8;this._strip()},i.prototype._parseBase=function(t,e,r){this.words=[0],this.length=1;for(var n=0,i=1;i<=67108863;i*=e)n++;n--,i=i/e|0;for(var o=t.length-r,a=o%n,s=Math.min(o,o-a)+r,h=0,c=r;c<s;c+=n)h=u(t,c,c+n,e),this.imuln(i),this.words[0]+h<67108864?this.words[0]+=h:this._iaddn(h);if(0!==a){var l=1;for(h=u(t,c,t.length,e),c=0;c<a;c++)l*=e;this.imuln(l),this.words[0]+h<67108864?this.words[0]+=h:this._iaddn(h)}this._strip()},i.prototype.copy=function(t){t.words=new Array(this.length);for(var e=0;e<this.length;e++)t.words[e]=this.words[e];t.length=this.length,t.negative=this.negative,t.red=this.red},i.prototype._move=function(t){h(t,this)},i.prototype.clone=function(){var t=new i(null);return this.copy(t),t},i.prototype._expand=function(t){for(;this.length<t;)this.words[this.length++]=0;return this},i.prototype._strip=function(){for(;this.length>1&&0===this.words[this.length-1];)this.length--;return this._normSign()},i.prototype._normSign=function(){return 1===this.length&&0===this.words[0]&&(this.negative=0),this},"undefined"!=typeof Symbol&&"function"==typeof Symbol.for)try{i.prototype[Symbol.for("nodejs.util.inspect.custom")]=c}catch(t){i.prototype.inspect=c}else i.prototype.inspect=c;function c(){return(this.red?"<BN-R: ":"<BN: ")+this.toString(16)+">"}var l=["","0","00","000","0000","00000","000000","0000000","00000000","000000000","0000000000","00000000000","000000000000","0000000000000","00000000000000","000000000000000","0000000000000000","00000000000000000","000000000000000000","0000000000000000000","00000000000000000000","000000000000000000000","0000000000000000000000","00000000000000000000000","000000000000000000000000","0000000000000000000000000"],d=[0,0,25,16,12,11,10,9,8,8,7,7,7,7,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],f=[0,0,33554432,43046721,16777216,48828125,60466176,40353607,16777216,43046721,1e7,19487171,35831808,62748517,7529536,11390625,16777216,24137569,34012224,47045881,64e6,4084101,5153632,6436343,7962624,9765625,11881376,14348907,17210368,20511149,243e5,28629151,33554432,39135393,45435424,52521875,60466176];i.prototype.toString=function(t,e){var n;if(e=0|e||1,16===(t=t||10)||"hex"===t){n="";for(var i=0,o=0,a=0;a<this.length;a++){var s=this.words[a],u=(16777215&(s<<i|o)).toString(16);o=s>>>24-i&16777215,(i+=2)>=26&&(i-=26,a--),n=0!==o||a!==this.length-1?l[6-u.length]+u+n:u+n}for(0!==o&&(n=o.toString(16)+n);n.length%e!=0;)n="0"+n;return 0!==this.negative&&(n="-"+n),n}if(t===(0|t)&&t>=2&&t<=36){var h=d[t],c=f[t];n="";var m=this.clone();for(m.negative=0;!m.isZero();){var p=m.modrn(c).toString(t);n=(m=m.idivn(c)).isZero()?p+n:l[h-p.length]+p+n}for(this.isZero()&&(n="0"+n);n.length%e!=0;)n="0"+n;return 0!==this.negative&&(n="-"+n),n}r(!1,"Base should be between 2 and 36")},i.prototype.toNumber=function(){var t=this.words[0];return 2===this.length?t+=67108864*this.words[1]:3===this.length&&1===this.words[2]?t+=4503599627370496+67108864*this.words[1]:this.length>2&&r(!1,"Number can only safely store up to 53 bits"),0!==this.negative?-t:t},i.prototype.toJSON=function(){return this.toString(16,2)},o&&(i.prototype.toBuffer=function(t,e){return this.toArrayLike(o,t,e)}),i.prototype.toArray=function(t,e){return this.toArrayLike(Array,t,e)};function m(t,e,r){r.negative=e.negative^t.negative;var n=t.length+e.length|0;r.length=n,n=n-1|0;var i=0|t.words[0],o=0|e.words[0],a=i*o,s=67108863&a,u=a/67108864|0;r.words[0]=s;for(var h=1;h<n;h++){for(var c=u>>>26,l=67108863&u,d=Math.min(h,e.length-1),f=Math.max(0,h-t.length+1);f<=d;f++){var m=h-f|0;c+=(a=(i=0|t.words[m])*(o=0|e.words[f])+l)/67108864|0,l=67108863&a}r.words[h]=0|l,u=0|c}return 0!==u?r.words[h]=0|u:r.length--,r._strip()}i.prototype.toArrayLike=function(t,e,n){this._strip();var i=this.byteLength(),o=n||Math.max(1,i);r(i<=o,"byte array longer than desired length"),r(o>0,"Requested array length <= 0");var a=function(t,e){return t.allocUnsafe?t.allocUnsafe(e):new t(e)}(t,o);return this["_toArrayLike"+("le"===e?"LE":"BE")](a,i),a},i.prototype._toArrayLikeLE=function(t,e){for(var r=0,n=0,i=0,o=0;i<this.length;i++){var a=this.words[i]<<o|n;t[r++]=255&a,r<t.length&&(t[r++]=a>>8&255),r<t.length&&(t[r++]=a>>16&255),6===o?(r<t.length&&(t[r++]=a>>24&255),n=0,o=0):(n=a>>>24,o+=2)}if(r<t.length)for(t[r++]=n;r<t.length;)t[r++]=0},i.prototype._toArrayLikeBE=function(t,e){for(var r=t.length-1,n=0,i=0,o=0;i<this.length;i++){var a=this.words[i]<<o|n;t[r--]=255&a,r>=0&&(t[r--]=a>>8&255),r>=0&&(t[r--]=a>>16&255),6===o?(r>=0&&(t[r--]=a>>24&255),n=0,o=0):(n=a>>>24,o+=2)}if(r>=0)for(t[r--]=n;r>=0;)t[r--]=0},Math.clz32?i.prototype._countBits=function(t){return 32-Math.clz32(t)}:i.prototype._countBits=function(t){var e=t,r=0;return e>=4096&&(r+=13,e>>>=13),e>=64&&(r+=7,e>>>=7),e>=8&&(r+=4,e>>>=4),e>=2&&(r+=2,e>>>=2),r+e},i.prototype._zeroBits=function(t){if(0===t)return 26;var e=t,r=0;return 0==(8191&e)&&(r+=13,e>>>=13),0==(127&e)&&(r+=7,e>>>=7),0==(15&e)&&(r+=4,e>>>=4),0==(3&e)&&(r+=2,e>>>=2),0==(1&e)&&r++,r},i.prototype.bitLength=function(){var t=this.words[this.length-1],e=this._countBits(t);return 26*(this.length-1)+e},i.prototype.zeroBits=function(){if(this.isZero())return 0;for(var t=0,e=0;e<this.length;e++){var r=this._zeroBits(this.words[e]);if(t+=r,26!==r)break}return t},i.prototype.byteLength=function(){return Math.ceil(this.bitLength()/8)},i.prototype.toTwos=function(t){return 0!==this.negative?this.abs().inotn(t).iaddn(1):this.clone()},i.prototype.fromTwos=function(t){return this.testn(t-1)?this.notn(t).iaddn(1).ineg():this.clone()},i.prototype.isNeg=function(){return 0!==this.negative},i.prototype.neg=function(){return this.clone().ineg()},i.prototype.ineg=function(){return this.isZero()||(this.negative^=1),this},i.prototype.iuor=function(t){for(;this.length<t.length;)this.words[this.length++]=0;for(var e=0;e<t.length;e++)this.words[e]=this.words[e]|t.words[e];return this._strip()},i.prototype.ior=function(t){return r(0==(this.negative|t.negative)),this.iuor(t)},i.prototype.or=function(t){return this.length>t.length?this.clone().ior(t):t.clone().ior(this)},i.prototype.uor=function(t){return this.length>t.length?this.clone().iuor(t):t.clone().iuor(this)},i.prototype.iuand=function(t){var e;e=this.length>t.length?t:this;for(var r=0;r<e.length;r++)this.words[r]=this.words[r]&t.words[r];return this.length=e.length,this._strip()},i.prototype.iand=function(t){return r(0==(this.negative|t.negative)),this.iuand(t)},i.prototype.and=function(t){return this.length>t.length?this.clone().iand(t):t.clone().iand(this)},i.prototype.uand=function(t){return this.length>t.length?this.clone().iuand(t):t.clone().iuand(this)},i.prototype.iuxor=function(t){var e,r;this.length>t.length?(e=this,r=t):(e=t,r=this);for(var n=0;n<r.length;n++)this.words[n]=e.words[n]^r.words[n];if(this!==e)for(;n<e.length;n++)this.words[n]=e.words[n];return this.length=e.length,this._strip()},i.prototype.ixor=function(t){return r(0==(this.negative|t.negative)),this.iuxor(t)},i.prototype.xor=function(t){return this.length>t.length?this.clone().ixor(t):t.clone().ixor(this)},i.prototype.uxor=function(t){return this.length>t.length?this.clone().iuxor(t):t.clone().iuxor(this)},i.prototype.inotn=function(t){r("number"==typeof t&&t>=0);var e=0|Math.ceil(t/26),n=t%26;this._expand(e),n>0&&e--;for(var i=0;i<e;i++)this.words[i]=67108863&~this.words[i];return n>0&&(this.words[i]=~this.words[i]&67108863>>26-n),this._strip()},i.prototype.notn=function(t){return this.clone().inotn(t)},i.prototype.setn=function(t,e){r("number"==typeof t&&t>=0);var n=t/26|0,i=t%26;return this._expand(n+1),this.words[n]=e?this.words[n]|1<<i:this.words[n]&~(1<<i),this._strip()},i.prototype.iadd=function(t){var e,r,n;if(0!==this.negative&&0===t.negative)return this.negative=0,e=this.isub(t),this.negative^=1,this._normSign();if(0===this.negative&&0!==t.negative)return t.negative=0,e=this.isub(t),t.negative=1,e._normSign();this.length>t.length?(r=this,n=t):(r=t,n=this);for(var i=0,o=0;o<n.length;o++)e=(0|r.words[o])+(0|n.words[o])+i,this.words[o]=67108863&e,i=e>>>26;for(;0!==i&&o<r.length;o++)e=(0|r.words[o])+i,this.words[o]=67108863&e,i=e>>>26;if(this.length=r.length,0!==i)this.words[this.length]=i,this.length++;else if(r!==this)for(;o<r.length;o++)this.words[o]=r.words[o];return this},i.prototype.add=function(t){var e;return 0!==t.negative&&0===this.negative?(t.negative=0,e=this.sub(t),t.negative^=1,e):0===t.negative&&0!==this.negative?(this.negative=0,e=t.sub(this),this.negative=1,e):this.length>t.length?this.clone().iadd(t):t.clone().iadd(this)},i.prototype.isub=function(t){if(0!==t.negative){t.negative=0;var e=this.iadd(t);return t.negative=1,e._normSign()}if(0!==this.negative)return this.negative=0,this.iadd(t),this.negative=1,this._normSign();var r,n,i=this.cmp(t);if(0===i)return this.negative=0,this.length=1,this.words[0]=0,this;i>0?(r=this,n=t):(r=t,n=this);for(var o=0,a=0;a<n.length;a++)o=(e=(0|r.words[a])-(0|n.words[a])+o)>>26,this.words[a]=67108863&e;for(;0!==o&&a<r.length;a++)o=(e=(0|r.words[a])+o)>>26,this.words[a]=67108863&e;if(0===o&&a<r.length&&r!==this)for(;a<r.length;a++)this.words[a]=r.words[a];return this.length=Math.max(this.length,a),r!==this&&(this.negative=1),this._strip()},i.prototype.sub=function(t){return this.clone().isub(t)};var p=function(t,e,r){var n,i,o,a=t.words,s=e.words,u=r.words,h=0,c=0|a[0],l=8191&c,d=c>>>13,f=0|a[1],m=8191&f,p=f>>>13,g=0|a[2],y=8191&g,b=g>>>13,w=0|a[3],v=8191&w,k=w>>>13,_=0|a[4],M=8191&_,E=_>>>13,A=0|a[5],x=8191&A,j=A>>>13,S=0|a[6],N=8191&S,P=S>>>13,I=0|a[7],T=8191&I,$=I>>>13,O=0|a[8],C=8191&O,z=O>>>13,R=0|a[9],B=8191&R,D=R>>>13,F=0|s[0],L=8191&F,U=F>>>13,q=0|s[1],V=8191&q,H=q>>>13,G=0|s[2],Z=8191&G,K=G>>>13,W=0|s[3],J=8191&W,Y=W>>>13,Q=0|s[4],X=8191&Q,tt=Q>>>13,et=0|s[5],rt=8191&et,nt=et>>>13,it=0|s[6],ot=8191&it,at=it>>>13,st=0|s[7],ut=8191&st,ht=st>>>13,ct=0|s[8],lt=8191&ct,dt=ct>>>13,ft=0|s[9],mt=8191&ft,pt=ft>>>13;r.negative=t.negative^e.negative,r.length=19;var gt=(h+(n=Math.imul(l,L))|0)+((8191&(i=(i=Math.imul(l,U))+Math.imul(d,L)|0))<<13)|0;h=((o=Math.imul(d,U))+(i>>>13)|0)+(gt>>>26)|0,gt&=67108863,n=Math.imul(m,L),i=(i=Math.imul(m,U))+Math.imul(p,L)|0,o=Math.imul(p,U);var yt=(h+(n=n+Math.imul(l,V)|0)|0)+((8191&(i=(i=i+Math.imul(l,H)|0)+Math.imul(d,V)|0))<<13)|0;h=((o=o+Math.imul(d,H)|0)+(i>>>13)|0)+(yt>>>26)|0,yt&=67108863,n=Math.imul(y,L),i=(i=Math.imul(y,U))+Math.imul(b,L)|0,o=Math.imul(b,U),n=n+Math.imul(m,V)|0,i=(i=i+Math.imul(m,H)|0)+Math.imul(p,V)|0,o=o+Math.imul(p,H)|0;var bt=(h+(n=n+Math.imul(l,Z)|0)|0)+((8191&(i=(i=i+Math.imul(l,K)|0)+Math.imul(d,Z)|0))<<13)|0;h=((o=o+Math.imul(d,K)|0)+(i>>>13)|0)+(bt>>>26)|0,bt&=67108863,n=Math.imul(v,L),i=(i=Math.imul(v,U))+Math.imul(k,L)|0,o=Math.imul(k,U),n=n+Math.imul(y,V)|0,i=(i=i+Math.imul(y,H)|0)+Math.imul(b,V)|0,o=o+Math.imul(b,H)|0,n=n+Math.imul(m,Z)|0,i=(i=i+Math.imul(m,K)|0)+Math.imul(p,Z)|0,o=o+Math.imul(p,K)|0;var wt=(h+(n=n+Math.imul(l,J)|0)|0)+((8191&(i=(i=i+Math.imul(l,Y)|0)+Math.imul(d,J)|0))<<13)|0;h=((o=o+Math.imul(d,Y)|0)+(i>>>13)|0)+(wt>>>26)|0,wt&=67108863,n=Math.imul(M,L),i=(i=Math.imul(M,U))+Math.imul(E,L)|0,o=Math.imul(E,U),n=n+Math.imul(v,V)|0,i=(i=i+Math.imul(v,H)|0)+Math.imul(k,V)|0,o=o+Math.imul(k,H)|0,n=n+Math.imul(y,Z)|0,i=(i=i+Math.imul(y,K)|0)+Math.imul(b,Z)|0,o=o+Math.imul(b,K)|0,n=n+Math.imul(m,J)|0,i=(i=i+Math.imul(m,Y)|0)+Math.imul(p,J)|0,o=o+Math.imul(p,Y)|0;var vt=(h+(n=n+Math.imul(l,X)|0)|0)+((8191&(i=(i=i+Math.imul(l,tt)|0)+Math.imul(d,X)|0))<<13)|0;h=((o=o+Math.imul(d,tt)|0)+(i>>>13)|0)+(vt>>>26)|0,vt&=67108863,n=Math.imul(x,L),i=(i=Math.imul(x,U))+Math.imul(j,L)|0,o=Math.imul(j,U),n=n+Math.imul(M,V)|0,i=(i=i+Math.imul(M,H)|0)+Math.imul(E,V)|0,o=o+Math.imul(E,H)|0,n=n+Math.imul(v,Z)|0,i=(i=i+Math.imul(v,K)|0)+Math.imul(k,Z)|0,o=o+Math.imul(k,K)|0,n=n+Math.imul(y,J)|0,i=(i=i+Math.imul(y,Y)|0)+Math.imul(b,J)|0,o=o+Math.imul(b,Y)|0,n=n+Math.imul(m,X)|0,i=(i=i+Math.imul(m,tt)|0)+Math.imul(p,X)|0,o=o+Math.imul(p,tt)|0;var kt=(h+(n=n+Math.imul(l,rt)|0)|0)+((8191&(i=(i=i+Math.imul(l,nt)|0)+Math.imul(d,rt)|0))<<13)|0;h=((o=o+Math.imul(d,nt)|0)+(i>>>13)|0)+(kt>>>26)|0,kt&=67108863,n=Math.imul(N,L),i=(i=Math.imul(N,U))+Math.imul(P,L)|0,o=Math.imul(P,U),n=n+Math.imul(x,V)|0,i=(i=i+Math.imul(x,H)|0)+Math.imul(j,V)|0,o=o+Math.imul(j,H)|0,n=n+Math.imul(M,Z)|0,i=(i=i+Math.imul(M,K)|0)+Math.imul(E,Z)|0,o=o+Math.imul(E,K)|0,n=n+Math.imul(v,J)|0,i=(i=i+Math.imul(v,Y)|0)+Math.imul(k,J)|0,o=o+Math.imul(k,Y)|0,n=n+Math.imul(y,X)|0,i=(i=i+Math.imul(y,tt)|0)+Math.imul(b,X)|0,o=o+Math.imul(b,tt)|0,n=n+Math.imul(m,rt)|0,i=(i=i+Math.imul(m,nt)|0)+Math.imul(p,rt)|0,o=o+Math.imul(p,nt)|0;var _t=(h+(n=n+Math.imul(l,ot)|0)|0)+((8191&(i=(i=i+Math.imul(l,at)|0)+Math.imul(d,ot)|0))<<13)|0;h=((o=o+Math.imul(d,at)|0)+(i>>>13)|0)+(_t>>>26)|0,_t&=67108863,n=Math.imul(T,L),i=(i=Math.imul(T,U))+Math.imul($,L)|0,o=Math.imul($,U),n=n+Math.imul(N,V)|0,i=(i=i+Math.imul(N,H)|0)+Math.imul(P,V)|0,o=o+Math.imul(P,H)|0,n=n+Math.imul(x,Z)|0,i=(i=i+Math.imul(x,K)|0)+Math.imul(j,Z)|0,o=o+Math.imul(j,K)|0,n=n+Math.imul(M,J)|0,i=(i=i+Math.imul(M,Y)|0)+Math.imul(E,J)|0,o=o+Math.imul(E,Y)|0,n=n+Math.imul(v,X)|0,i=(i=i+Math.imul(v,tt)|0)+Math.imul(k,X)|0,o=o+Math.imul(k,tt)|0,n=n+Math.imul(y,rt)|0,i=(i=i+Math.imul(y,nt)|0)+Math.imul(b,rt)|0,o=o+Math.imul(b,nt)|0,n=n+Math.imul(m,ot)|0,i=(i=i+Math.imul(m,at)|0)+Math.imul(p,ot)|0,o=o+Math.imul(p,at)|0;var Mt=(h+(n=n+Math.imul(l,ut)|0)|0)+((8191&(i=(i=i+Math.imul(l,ht)|0)+Math.imul(d,ut)|0))<<13)|0;h=((o=o+Math.imul(d,ht)|0)+(i>>>13)|0)+(Mt>>>26)|0,Mt&=67108863,n=Math.imul(C,L),i=(i=Math.imul(C,U))+Math.imul(z,L)|0,o=Math.imul(z,U),n=n+Math.imul(T,V)|0,i=(i=i+Math.imul(T,H)|0)+Math.imul($,V)|0,o=o+Math.imul($,H)|0,n=n+Math.imul(N,Z)|0,i=(i=i+Math.imul(N,K)|0)+Math.imul(P,Z)|0,o=o+Math.imul(P,K)|0,n=n+Math.imul(x,J)|0,i=(i=i+Math.imul(x,Y)|0)+Math.imul(j,J)|0,o=o+Math.imul(j,Y)|0,n=n+Math.imul(M,X)|0,i=(i=i+Math.imul(M,tt)|0)+Math.imul(E,X)|0,o=o+Math.imul(E,tt)|0,n=n+Math.imul(v,rt)|0,i=(i=i+Math.imul(v,nt)|0)+Math.imul(k,rt)|0,o=o+Math.imul(k,nt)|0,n=n+Math.imul(y,ot)|0,i=(i=i+Math.imul(y,at)|0)+Math.imul(b,ot)|0,o=o+Math.imul(b,at)|0,n=n+Math.imul(m,ut)|0,i=(i=i+Math.imul(m,ht)|0)+Math.imul(p,ut)|0,o=o+Math.imul(p,ht)|0;var Et=(h+(n=n+Math.imul(l,lt)|0)|0)+((8191&(i=(i=i+Math.imul(l,dt)|0)+Math.imul(d,lt)|0))<<13)|0;h=((o=o+Math.imul(d,dt)|0)+(i>>>13)|0)+(Et>>>26)|0,Et&=67108863,n=Math.imul(B,L),i=(i=Math.imul(B,U))+Math.imul(D,L)|0,o=Math.imul(D,U),n=n+Math.imul(C,V)|0,i=(i=i+Math.imul(C,H)|0)+Math.imul(z,V)|0,o=o+Math.imul(z,H)|0,n=n+Math.imul(T,Z)|0,i=(i=i+Math.imul(T,K)|0)+Math.imul($,Z)|0,o=o+Math.imul($,K)|0,n=n+Math.imul(N,J)|0,i=(i=i+Math.imul(N,Y)|0)+Math.imul(P,J)|0,o=o+Math.imul(P,Y)|0,n=n+Math.imul(x,X)|0,i=(i=i+Math.imul(x,tt)|0)+Math.imul(j,X)|0,o=o+Math.imul(j,tt)|0,n=n+Math.imul(M,rt)|0,i=(i=i+Math.imul(M,nt)|0)+Math.imul(E,rt)|0,o=o+Math.imul(E,nt)|0,n=n+Math.imul(v,ot)|0,i=(i=i+Math.imul(v,at)|0)+Math.imul(k,ot)|0,o=o+Math.imul(k,at)|0,n=n+Math.imul(y,ut)|0,i=(i=i+Math.imul(y,ht)|0)+Math.imul(b,ut)|0,o=o+Math.imul(b,ht)|0,n=n+Math.imul(m,lt)|0,i=(i=i+Math.imul(m,dt)|0)+Math.imul(p,lt)|0,o=o+Math.imul(p,dt)|0;var At=(h+(n=n+Math.imul(l,mt)|0)|0)+((8191&(i=(i=i+Math.imul(l,pt)|0)+Math.imul(d,mt)|0))<<13)|0;h=((o=o+Math.imul(d,pt)|0)+(i>>>13)|0)+(At>>>26)|0,At&=67108863,n=Math.imul(B,V),i=(i=Math.imul(B,H))+Math.imul(D,V)|0,o=Math.imul(D,H),n=n+Math.imul(C,Z)|0,i=(i=i+Math.imul(C,K)|0)+Math.imul(z,Z)|0,o=o+Math.imul(z,K)|0,n=n+Math.imul(T,J)|0,i=(i=i+Math.imul(T,Y)|0)+Math.imul($,J)|0,o=o+Math.imul($,Y)|0,n=n+Math.imul(N,X)|0,i=(i=i+Math.imul(N,tt)|0)+Math.imul(P,X)|0,o=o+Math.imul(P,tt)|0,n=n+Math.imul(x,rt)|0,i=(i=i+Math.imul(x,nt)|0)+Math.imul(j,rt)|0,o=o+Math.imul(j,nt)|0,n=n+Math.imul(M,ot)|0,i=(i=i+Math.imul(M,at)|0)+Math.imul(E,ot)|0,o=o+Math.imul(E,at)|0,n=n+Math.imul(v,ut)|0,i=(i=i+Math.imul(v,ht)|0)+Math.imul(k,ut)|0,o=o+Math.imul(k,ht)|0,n=n+Math.imul(y,lt)|0,i=(i=i+Math.imul(y,dt)|0)+Math.imul(b,lt)|0,o=o+Math.imul(b,dt)|0;var xt=(h+(n=n+Math.imul(m,mt)|0)|0)+((8191&(i=(i=i+Math.imul(m,pt)|0)+Math.imul(p,mt)|0))<<13)|0;h=((o=o+Math.imul(p,pt)|0)+(i>>>13)|0)+(xt>>>26)|0,xt&=67108863,n=Math.imul(B,Z),i=(i=Math.imul(B,K))+Math.imul(D,Z)|0,o=Math.imul(D,K),n=n+Math.imul(C,J)|0,i=(i=i+Math.imul(C,Y)|0)+Math.imul(z,J)|0,o=o+Math.imul(z,Y)|0,n=n+Math.imul(T,X)|0,i=(i=i+Math.imul(T,tt)|0)+Math.imul($,X)|0,o=o+Math.imul($,tt)|0,n=n+Math.imul(N,rt)|0,i=(i=i+Math.imul(N,nt)|0)+Math.imul(P,rt)|0,o=o+Math.imul(P,nt)|0,n=n+Math.imul(x,ot)|0,i=(i=i+Math.imul(x,at)|0)+Math.imul(j,ot)|0,o=o+Math.imul(j,at)|0,n=n+Math.imul(M,ut)|0,i=(i=i+Math.imul(M,ht)|0)+Math.imul(E,ut)|0,o=o+Math.imul(E,ht)|0,n=n+Math.imul(v,lt)|0,i=(i=i+Math.imul(v,dt)|0)+Math.imul(k,lt)|0,o=o+Math.imul(k,dt)|0;var jt=(h+(n=n+Math.imul(y,mt)|0)|0)+((8191&(i=(i=i+Math.imul(y,pt)|0)+Math.imul(b,mt)|0))<<13)|0;h=((o=o+Math.imul(b,pt)|0)+(i>>>13)|0)+(jt>>>26)|0,jt&=67108863,n=Math.imul(B,J),i=(i=Math.imul(B,Y))+Math.imul(D,J)|0,o=Math.imul(D,Y),n=n+Math.imul(C,X)|0,i=(i=i+Math.imul(C,tt)|0)+Math.imul(z,X)|0,o=o+Math.imul(z,tt)|0,n=n+Math.imul(T,rt)|0,i=(i=i+Math.imul(T,nt)|0)+Math.imul($,rt)|0,o=o+Math.imul($,nt)|0,n=n+Math.imul(N,ot)|0,i=(i=i+Math.imul(N,at)|0)+Math.imul(P,ot)|0,o=o+Math.imul(P,at)|0,n=n+Math.imul(x,ut)|0,i=(i=i+Math.imul(x,ht)|0)+Math.imul(j,ut)|0,o=o+Math.imul(j,ht)|0,n=n+Math.imul(M,lt)|0,i=(i=i+Math.imul(M,dt)|0)+Math.imul(E,lt)|0,o=o+Math.imul(E,dt)|0;var St=(h+(n=n+Math.imul(v,mt)|0)|0)+((8191&(i=(i=i+Math.imul(v,pt)|0)+Math.imul(k,mt)|0))<<13)|0;h=((o=o+Math.imul(k,pt)|0)+(i>>>13)|0)+(St>>>26)|0,St&=67108863,n=Math.imul(B,X),i=(i=Math.imul(B,tt))+Math.imul(D,X)|0,o=Math.imul(D,tt),n=n+Math.imul(C,rt)|0,i=(i=i+Math.imul(C,nt)|0)+Math.imul(z,rt)|0,o=o+Math.imul(z,nt)|0,n=n+Math.imul(T,ot)|0,i=(i=i+Math.imul(T,at)|0)+Math.imul($,ot)|0,o=o+Math.imul($,at)|0,n=n+Math.imul(N,ut)|0,i=(i=i+Math.imul(N,ht)|0)+Math.imul(P,ut)|0,o=o+Math.imul(P,ht)|0,n=n+Math.imul(x,lt)|0,i=(i=i+Math.imul(x,dt)|0)+Math.imul(j,lt)|0,o=o+Math.imul(j,dt)|0;var Nt=(h+(n=n+Math.imul(M,mt)|0)|0)+((8191&(i=(i=i+Math.imul(M,pt)|0)+Math.imul(E,mt)|0))<<13)|0;h=((o=o+Math.imul(E,pt)|0)+(i>>>13)|0)+(Nt>>>26)|0,Nt&=67108863,n=Math.imul(B,rt),i=(i=Math.imul(B,nt))+Math.imul(D,rt)|0,o=Math.imul(D,nt),n=n+Math.imul(C,ot)|0,i=(i=i+Math.imul(C,at)|0)+Math.imul(z,ot)|0,o=o+Math.imul(z,at)|0,n=n+Math.imul(T,ut)|0,i=(i=i+Math.imul(T,ht)|0)+Math.imul($,ut)|0,o=o+Math.imul($,ht)|0,n=n+Math.imul(N,lt)|0,i=(i=i+Math.imul(N,dt)|0)+Math.imul(P,lt)|0,o=o+Math.imul(P,dt)|0;var Pt=(h+(n=n+Math.imul(x,mt)|0)|0)+((8191&(i=(i=i+Math.imul(x,pt)|0)+Math.imul(j,mt)|0))<<13)|0;h=((o=o+Math.imul(j,pt)|0)+(i>>>13)|0)+(Pt>>>26)|0,Pt&=67108863,n=Math.imul(B,ot),i=(i=Math.imul(B,at))+Math.imul(D,ot)|0,o=Math.imul(D,at),n=n+Math.imul(C,ut)|0,i=(i=i+Math.imul(C,ht)|0)+Math.imul(z,ut)|0,o=o+Math.imul(z,ht)|0,n=n+Math.imul(T,lt)|0,i=(i=i+Math.imul(T,dt)|0)+Math.imul($,lt)|0,o=o+Math.imul($,dt)|0;var It=(h+(n=n+Math.imul(N,mt)|0)|0)+((8191&(i=(i=i+Math.imul(N,pt)|0)+Math.imul(P,mt)|0))<<13)|0;h=((o=o+Math.imul(P,pt)|0)+(i>>>13)|0)+(It>>>26)|0,It&=67108863,n=Math.imul(B,ut),i=(i=Math.imul(B,ht))+Math.imul(D,ut)|0,o=Math.imul(D,ht),n=n+Math.imul(C,lt)|0,i=(i=i+Math.imul(C,dt)|0)+Math.imul(z,lt)|0,o=o+Math.imul(z,dt)|0;var Tt=(h+(n=n+Math.imul(T,mt)|0)|0)+((8191&(i=(i=i+Math.imul(T,pt)|0)+Math.imul($,mt)|0))<<13)|0;h=((o=o+Math.imul($,pt)|0)+(i>>>13)|0)+(Tt>>>26)|0,Tt&=67108863,n=Math.imul(B,lt),i=(i=Math.imul(B,dt))+Math.imul(D,lt)|0,o=Math.imul(D,dt);var $t=(h+(n=n+Math.imul(C,mt)|0)|0)+((8191&(i=(i=i+Math.imul(C,pt)|0)+Math.imul(z,mt)|0))<<13)|0;h=((o=o+Math.imul(z,pt)|0)+(i>>>13)|0)+($t>>>26)|0,$t&=67108863;var Ot=(h+(n=Math.imul(B,mt))|0)+((8191&(i=(i=Math.imul(B,pt))+Math.imul(D,mt)|0))<<13)|0;return h=((o=Math.imul(D,pt))+(i>>>13)|0)+(Ot>>>26)|0,Ot&=67108863,u[0]=gt,u[1]=yt,u[2]=bt,u[3]=wt,u[4]=vt,u[5]=kt,u[6]=_t,u[7]=Mt,u[8]=Et,u[9]=At,u[10]=xt,u[11]=jt,u[12]=St,u[13]=Nt,u[14]=Pt,u[15]=It,u[16]=Tt,u[17]=$t,u[18]=Ot,0!==h&&(u[19]=h,r.length++),r};function g(t,e,r){r.negative=e.negative^t.negative,r.length=t.length+e.length;for(var n=0,i=0,o=0;o<r.length-1;o++){var a=i;i=0;for(var s=67108863&n,u=Math.min(o,e.length-1),h=Math.max(0,o-t.length+1);h<=u;h++){var c=o-h,l=(0|t.words[c])*(0|e.words[h]),d=67108863&l;s=67108863&(d=d+s|0),i+=(a=(a=a+(l/67108864|0)|0)+(d>>>26)|0)>>>26,a&=67108863}r.words[o]=s,n=a,a=i}return 0!==n?r.words[o]=n:r.length--,r._strip()}function y(t,e,r){return g(t,e,r)}Math.imul||(p=m),i.prototype.mulTo=function(t,e){var r=this.length+t.length;return 10===this.length&&10===t.length?p(this,t,e):r<63?m(this,t,e):r<1024?g(this,t,e):y(this,t,e)},i.prototype.mul=function(t){var e=new i(null);return e.words=new Array(this.length+t.length),this.mulTo(t,e)},i.prototype.mulf=function(t){var e=new i(null);return e.words=new Array(this.length+t.length),y(this,t,e)},i.prototype.imul=function(t){return this.clone().mulTo(t,this)},i.prototype.imuln=function(t){var e=t<0;e&&(t=-t),r("number"==typeof t),r(t<67108864);for(var n=0,i=0;i<this.length;i++){var o=(0|this.words[i])*t,a=(67108863&o)+(67108863&n);n>>=26,n+=o/67108864|0,n+=a>>>26,this.words[i]=67108863&a}return 0!==n&&(this.words[i]=n,this.length++),e?this.ineg():this},i.prototype.muln=function(t){return this.clone().imuln(t)},i.prototype.sqr=function(){return this.mul(this)},i.prototype.isqr=function(){return this.imul(this.clone())},i.prototype.pow=function(t){var e=function(t){for(var e=new Array(t.bitLength()),r=0;r<e.length;r++){var n=r/26|0,i=r%26;e[r]=t.words[n]>>>i&1}return e}(t);if(0===e.length)return new i(1);for(var r=this,n=0;n<e.length&&0===e[n];n++,r=r.sqr());if(++n<e.length)for(var o=r.sqr();n<e.length;n++,o=o.sqr())0!==e[n]&&(r=r.mul(o));return r},i.prototype.iushln=function(t){r("number"==typeof t&&t>=0);var e,n=t%26,i=(t-n)/26,o=67108863>>>26-n<<26-n;if(0!==n){var a=0;for(e=0;e<this.length;e++){var s=this.words[e]&o,u=(0|this.words[e])-s<<n;this.words[e]=u|a,a=s>>>26-n}a&&(this.words[e]=a,this.length++)}if(0!==i){for(e=this.length-1;e>=0;e--)this.words[e+i]=this.words[e];for(e=0;e<i;e++)this.words[e]=0;this.length+=i}return this._strip()},i.prototype.ishln=function(t){return r(0===this.negative),this.iushln(t)},i.prototype.iushrn=function(t,e,n){var i;r("number"==typeof t&&t>=0),i=e?(e-e%26)/26:0;var o=t%26,a=Math.min((t-o)/26,this.length),s=67108863^67108863>>>o<<o,u=n;if(i-=a,i=Math.max(0,i),u){for(var h=0;h<a;h++)u.words[h]=this.words[h];u.length=a}if(0===a);else if(this.length>a)for(this.length-=a,h=0;h<this.length;h++)this.words[h]=this.words[h+a];else this.words[0]=0,this.length=1;var c=0;for(h=this.length-1;h>=0&&(0!==c||h>=i);h--){var l=0|this.words[h];this.words[h]=c<<26-o|l>>>o,c=l&s}return u&&0!==c&&(u.words[u.length++]=c),0===this.length&&(this.words[0]=0,this.length=1),this._strip()},i.prototype.ishrn=function(t,e,n){return r(0===this.negative),this.iushrn(t,e,n)},i.prototype.shln=function(t){return this.clone().ishln(t)},i.prototype.ushln=function(t){return this.clone().iushln(t)},i.prototype.shrn=function(t){return this.clone().ishrn(t)},i.prototype.ushrn=function(t){return this.clone().iushrn(t)},i.prototype.testn=function(t){r("number"==typeof t&&t>=0);var e=t%26,n=(t-e)/26,i=1<<e;return!(this.length<=n)&&!!(this.words[n]&i)},i.prototype.imaskn=function(t){r("number"==typeof t&&t>=0);var e=t%26,n=(t-e)/26;if(r(0===this.negative,"imaskn works only with positive numbers"),this.length<=n)return this;if(0!==e&&n++,this.length=Math.min(n,this.length),0!==e){var i=67108863^67108863>>>e<<e;this.words[this.length-1]&=i}return this._strip()},i.prototype.maskn=function(t){return this.clone().imaskn(t)},i.prototype.iaddn=function(t){return r("number"==typeof t),r(t<67108864),t<0?this.isubn(-t):0!==this.negative?1===this.length&&(0|this.words[0])<=t?(this.words[0]=t-(0|this.words[0]),this.negative=0,this):(this.negative=0,this.isubn(t),this.negative=1,this):this._iaddn(t)},i.prototype._iaddn=function(t){this.words[0]+=t;for(var e=0;e<this.length&&this.words[e]>=67108864;e++)this.words[e]-=67108864,e===this.length-1?this.words[e+1]=1:this.words[e+1]++;return this.length=Math.max(this.length,e+1),this},i.prototype.isubn=function(t){if(r("number"==typeof t),r(t<67108864),t<0)return this.iaddn(-t);if(0!==this.negative)return this.negative=0,this.iaddn(t),this.negative=1,this;if(this.words[0]-=t,1===this.length&&this.words[0]<0)this.words[0]=-this.words[0],this.negative=1;else for(var e=0;e<this.length&&this.words[e]<0;e++)this.words[e]+=67108864,this.words[e+1]-=1;return this._strip()},i.prototype.addn=function(t){return this.clone().iaddn(t)},i.prototype.subn=function(t){return this.clone().isubn(t)},i.prototype.iabs=function(){return this.negative=0,this},i.prototype.abs=function(){return this.clone().iabs()},i.prototype._ishlnsubmul=function(t,e,n){var i,o,a=t.length+n;this._expand(a);var s=0;for(i=0;i<t.length;i++){o=(0|this.words[i+n])+s;var u=(0|t.words[i])*e;s=((o-=67108863&u)>>26)-(u/67108864|0),this.words[i+n]=67108863&o}for(;i<this.length-n;i++)s=(o=(0|this.words[i+n])+s)>>26,this.words[i+n]=67108863&o;if(0===s)return this._strip();for(r(-1===s),s=0,i=0;i<this.length;i++)s=(o=-(0|this.words[i])+s)>>26,this.words[i]=67108863&o;return this.negative=1,this._strip()},i.prototype._wordDiv=function(t,e){var r=(this.length,t.length),n=this.clone(),o=t,a=0|o.words[o.length-1];0!==(r=26-this._countBits(a))&&(o=o.ushln(r),n.iushln(r),a=0|o.words[o.length-1]);var s,u=n.length-o.length;if("mod"!==e){(s=new i(null)).length=u+1,s.words=new Array(s.length);for(var h=0;h<s.length;h++)s.words[h]=0}var c=n.clone()._ishlnsubmul(o,1,u);0===c.negative&&(n=c,s&&(s.words[u]=1));for(var l=u-1;l>=0;l--){var d=67108864*(0|n.words[o.length+l])+(0|n.words[o.length+l-1]);for(d=Math.min(d/a|0,67108863),n._ishlnsubmul(o,d,l);0!==n.negative;)d--,n.negative=0,n._ishlnsubmul(o,1,l),n.isZero()||(n.negative^=1);s&&(s.words[l]=d)}return s&&s._strip(),n._strip(),"div"!==e&&0!==r&&n.iushrn(r),{div:s||null,mod:n}},i.prototype.divmod=function(t,e,n){return r(!t.isZero()),this.isZero()?{div:new i(0),mod:new i(0)}:0!==this.negative&&0===t.negative?(s=this.neg().divmod(t,e),"mod"!==e&&(o=s.div.neg()),"div"!==e&&(a=s.mod.neg(),n&&0!==a.negative&&a.iadd(t)),{div:o,mod:a}):0===this.negative&&0!==t.negative?(s=this.divmod(t.neg(),e),"mod"!==e&&(o=s.div.neg()),{div:o,mod:s.mod}):0!=(this.negative&t.negative)?(s=this.neg().divmod(t.neg(),e),"div"!==e&&(a=s.mod.neg(),n&&0!==a.negative&&a.isub(t)),{div:s.div,mod:a}):t.length>this.length||this.cmp(t)<0?{div:new i(0),mod:this}:1===t.length?"div"===e?{div:this.divn(t.words[0]),mod:null}:"mod"===e?{div:null,mod:new i(this.modrn(t.words[0]))}:{div:this.divn(t.words[0]),mod:new i(this.modrn(t.words[0]))}:this._wordDiv(t,e);var o,a,s},i.prototype.div=function(t){return this.divmod(t,"div",!1).div},i.prototype.mod=function(t){return this.divmod(t,"mod",!1).mod},i.prototype.umod=function(t){return this.divmod(t,"mod",!0).mod},i.prototype.divRound=function(t){var e=this.divmod(t);if(e.mod.isZero())return e.div;var r=0!==e.div.negative?e.mod.isub(t):e.mod,n=t.ushrn(1),i=t.andln(1),o=r.cmp(n);return o<0||1===i&&0===o?e.div:0!==e.div.negative?e.div.isubn(1):e.div.iaddn(1)},i.prototype.modrn=function(t){var e=t<0;e&&(t=-t),r(t<=67108863);for(var n=(1<<26)%t,i=0,o=this.length-1;o>=0;o--)i=(n*i+(0|this.words[o]))%t;return e?-i:i},i.prototype.modn=function(t){return this.modrn(t)},i.prototype.idivn=function(t){var e=t<0;e&&(t=-t),r(t<=67108863);for(var n=0,i=this.length-1;i>=0;i--){var o=(0|this.words[i])+67108864*n;this.words[i]=o/t|0,n=o%t}return this._strip(),e?this.ineg():this},i.prototype.divn=function(t){return this.clone().idivn(t)},i.prototype.egcd=function(t){r(0===t.negative),r(!t.isZero());var e=this,n=t.clone();e=0!==e.negative?e.umod(t):e.clone();for(var o=new i(1),a=new i(0),s=new i(0),u=new i(1),h=0;e.isEven()&&n.isEven();)e.iushrn(1),n.iushrn(1),++h;for(var c=n.clone(),l=e.clone();!e.isZero();){for(var d=0,f=1;0==(e.words[0]&f)&&d<26;++d,f<<=1);if(d>0)for(e.iushrn(d);d-- >0;)(o.isOdd()||a.isOdd())&&(o.iadd(c),a.isub(l)),o.iushrn(1),a.iushrn(1);for(var m=0,p=1;0==(n.words[0]&p)&&m<26;++m,p<<=1);if(m>0)for(n.iushrn(m);m-- >0;)(s.isOdd()||u.isOdd())&&(s.iadd(c),u.isub(l)),s.iushrn(1),u.iushrn(1);e.cmp(n)>=0?(e.isub(n),o.isub(s),a.isub(u)):(n.isub(e),s.isub(o),u.isub(a))}return{a:s,b:u,gcd:n.iushln(h)}},i.prototype._invmp=function(t){r(0===t.negative),r(!t.isZero());var e=this,n=t.clone();e=0!==e.negative?e.umod(t):e.clone();for(var o,a=new i(1),s=new i(0),u=n.clone();e.cmpn(1)>0&&n.cmpn(1)>0;){for(var h=0,c=1;0==(e.words[0]&c)&&h<26;++h,c<<=1);if(h>0)for(e.iushrn(h);h-- >0;)a.isOdd()&&a.iadd(u),a.iushrn(1);for(var l=0,d=1;0==(n.words[0]&d)&&l<26;++l,d<<=1);if(l>0)for(n.iushrn(l);l-- >0;)s.isOdd()&&s.iadd(u),s.iushrn(1);e.cmp(n)>=0?(e.isub(n),a.isub(s)):(n.isub(e),s.isub(a))}return(o=0===e.cmpn(1)?a:s).cmpn(0)<0&&o.iadd(t),o},i.prototype.gcd=function(t){if(this.isZero())return t.abs();if(t.isZero())return this.abs();var e=this.clone(),r=t.clone();e.negative=0,r.negative=0;for(var n=0;e.isEven()&&r.isEven();n++)e.iushrn(1),r.iushrn(1);for(;;){for(;e.isEven();)e.iushrn(1);for(;r.isEven();)r.iushrn(1);var i=e.cmp(r);if(i<0){var o=e;e=r,r=o}else if(0===i||0===r.cmpn(1))break;e.isub(r)}return r.iushln(n)},i.prototype.invm=function(t){return this.egcd(t).a.umod(t)},i.prototype.isEven=function(){return 0==(1&this.words[0])},i.prototype.isOdd=function(){return 1==(1&this.words[0])},i.prototype.andln=function(t){return this.words[0]&t},i.prototype.bincn=function(t){r("number"==typeof t);var e=t%26,n=(t-e)/26,i=1<<e;if(this.length<=n)return this._expand(n+1),this.words[n]|=i,this;for(var o=i,a=n;0!==o&&a<this.length;a++){var s=0|this.words[a];o=(s+=o)>>>26,s&=67108863,this.words[a]=s}return 0!==o&&(this.words[a]=o,this.length++),this},i.prototype.isZero=function(){return 1===this.length&&0===this.words[0]},i.prototype.cmpn=function(t){var e,n=t<0;if(0!==this.negative&&!n)return-1;if(0===this.negative&&n)return 1;if(this._strip(),this.length>1)e=1;else{n&&(t=-t),r(t<=67108863,"Number is too big");var i=0|this.words[0];e=i===t?0:i<t?-1:1}return 0!==this.negative?0|-e:e},i.prototype.cmp=function(t){if(0!==this.negative&&0===t.negative)return-1;if(0===this.negative&&0!==t.negative)return 1;var e=this.ucmp(t);return 0!==this.negative?0|-e:e},i.prototype.ucmp=function(t){if(this.length>t.length)return 1;if(this.length<t.length)return-1;for(var e=0,r=this.length-1;r>=0;r--){var n=0|this.words[r],i=0|t.words[r];if(n!==i){n<i?e=-1:n>i&&(e=1);break}}return e},i.prototype.gtn=function(t){return 1===this.cmpn(t)},i.prototype.gt=function(t){return 1===this.cmp(t)},i.prototype.gten=function(t){return this.cmpn(t)>=0},i.prototype.gte=function(t){return this.cmp(t)>=0},i.prototype.ltn=function(t){return-1===this.cmpn(t)},i.prototype.lt=function(t){return-1===this.cmp(t)},i.prototype.lten=function(t){return this.cmpn(t)<=0},i.prototype.lte=function(t){return this.cmp(t)<=0},i.prototype.eqn=function(t){return 0===this.cmpn(t)},i.prototype.eq=function(t){return 0===this.cmp(t)},i.red=function(t){return new E(t)},i.prototype.toRed=function(t){return r(!this.red,"Already a number in reduction context"),r(0===this.negative,"red works only with positives"),t.convertTo(this)._forceRed(t)},i.prototype.fromRed=function(){return r(this.red,"fromRed works only with numbers in reduction context"),this.red.convertFrom(this)},i.prototype._forceRed=function(t){return this.red=t,this},i.prototype.forceRed=function(t){return r(!this.red,"Already a number in reduction context"),this._forceRed(t)},i.prototype.redAdd=function(t){return r(this.red,"redAdd works only with red numbers"),this.red.add(this,t)},i.prototype.redIAdd=function(t){return r(this.red,"redIAdd works only with red numbers"),this.red.iadd(this,t)},i.prototype.redSub=function(t){return r(this.red,"redSub works only with red numbers"),this.red.sub(this,t)},i.prototype.redISub=function(t){return r(this.red,"redISub works only with red numbers"),this.red.isub(this,t)},i.prototype.redShl=function(t){return r(this.red,"redShl works only with red numbers"),this.red.shl(this,t)},i.prototype.redMul=function(t){return r(this.red,"redMul works only with red numbers"),this.red._verify2(this,t),this.red.mul(this,t)},i.prototype.redIMul=function(t){return r(this.red,"redMul works only with red numbers"),this.red._verify2(this,t),this.red.imul(this,t)},i.prototype.redSqr=function(){return r(this.red,"redSqr works only with red numbers"),this.red._verify1(this),this.red.sqr(this)},i.prototype.redISqr=function(){return r(this.red,"redISqr works only with red numbers"),this.red._verify1(this),this.red.isqr(this)},i.prototype.redSqrt=function(){return r(this.red,"redSqrt works only with red numbers"),this.red._verify1(this),this.red.sqrt(this)},i.prototype.redInvm=function(){return r(this.red,"redInvm works only with red numbers"),this.red._verify1(this),this.red.invm(this)},i.prototype.redNeg=function(){return r(this.red,"redNeg works only with red numbers"),this.red._verify1(this),this.red.neg(this)},i.prototype.redPow=function(t){return r(this.red&&!t.red,"redPow(normalNum)"),this.red._verify1(this),this.red.pow(this,t)};var b={k256:null,p224:null,p192:null,p25519:null};function w(t,e){this.name=t,this.p=new i(e,16),this.n=this.p.bitLength(),this.k=new i(1).iushln(this.n).isub(this.p),this.tmp=this._tmp()}function v(){w.call(this,"k256","ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f")}function k(){w.call(this,"p224","ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001")}function _(){w.call(this,"p192","ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff")}function M(){w.call(this,"25519","7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed")}function E(t){if("string"==typeof t){var e=i._prime(t);this.m=e.p,this.prime=e}else r(t.gtn(1),"modulus must be greater than 1"),this.m=t,this.prime=null}function A(t){E.call(this,t),this.shift=this.m.bitLength(),this.shift%26!=0&&(this.shift+=26-this.shift%26),this.r=new i(1).iushln(this.shift),this.r2=this.imod(this.r.sqr()),this.rinv=this.r._invmp(this.m),this.minv=this.rinv.mul(this.r).isubn(1).div(this.m),this.minv=this.minv.umod(this.r),this.minv=this.r.sub(this.minv)}w.prototype._tmp=function(){var t=new i(null);return t.words=new Array(Math.ceil(this.n/13)),t},w.prototype.ireduce=function(t){var e,r=t;do{this.split(r,this.tmp),e=(r=(r=this.imulK(r)).iadd(this.tmp)).bitLength()}while(e>this.n);var n=e<this.n?-1:r.ucmp(this.p);return 0===n?(r.words[0]=0,r.length=1):n>0?r.isub(this.p):void 0!==r.strip?r.strip():r._strip(),r},w.prototype.split=function(t,e){t.iushrn(this.n,0,e)},w.prototype.imulK=function(t){return t.imul(this.k)},n(v,w),v.prototype.split=function(t,e){for(var r=4194303,n=Math.min(t.length,9),i=0;i<n;i++)e.words[i]=t.words[i];if(e.length=n,t.length<=9)return t.words[0]=0,void(t.length=1);var o=t.words[9];for(e.words[e.length++]=o&r,i=10;i<t.length;i++){var a=0|t.words[i];t.words[i-10]=(a&r)<<4|o>>>22,o=a}o>>>=22,t.words[i-10]=o,0===o&&t.length>10?t.length-=10:t.length-=9},v.prototype.imulK=function(t){t.words[t.length]=0,t.words[t.length+1]=0,t.length+=2;for(var e=0,r=0;r<t.length;r++){var n=0|t.words[r];e+=977*n,t.words[r]=67108863&e,e=64*n+(e/67108864|0)}return 0===t.words[t.length-1]&&(t.length--,0===t.words[t.length-1]&&t.length--),t},n(k,w),n(_,w),n(M,w),M.prototype.imulK=function(t){for(var e=0,r=0;r<t.length;r++){var n=19*(0|t.words[r])+e,i=67108863&n;n>>>=26,t.words[r]=i,e=n}return 0!==e&&(t.words[t.length++]=e),t},i._prime=function(t){if(b[t])return b[t];var e;if("k256"===t)e=new v;else if("p224"===t)e=new k;else if("p192"===t)e=new _;else{if("p25519"!==t)throw new Error("Unknown prime "+t);e=new M}return b[t]=e,e},E.prototype._verify1=function(t){r(0===t.negative,"red works only with positives"),r(t.red,"red works only with red numbers")},E.prototype._verify2=function(t,e){r(0==(t.negative|e.negative),"red works only with positives"),r(t.red&&t.red===e.red,"red works only with red numbers")},E.prototype.imod=function(t){return this.prime?this.prime.ireduce(t)._forceRed(this):(h(t,t.umod(this.m)._forceRed(this)),t)},E.prototype.neg=function(t){return t.isZero()?t.clone():this.m.sub(t)._forceRed(this)},E.prototype.add=function(t,e){this._verify2(t,e);var r=t.add(e);return r.cmp(this.m)>=0&&r.isub(this.m),r._forceRed(this)},E.prototype.iadd=function(t,e){this._verify2(t,e);var r=t.iadd(e);return r.cmp(this.m)>=0&&r.isub(this.m),r},E.prototype.sub=function(t,e){this._verify2(t,e);var r=t.sub(e);return r.cmpn(0)<0&&r.iadd(this.m),r._forceRed(this)},E.prototype.isub=function(t,e){this._verify2(t,e);var r=t.isub(e);return r.cmpn(0)<0&&r.iadd(this.m),r},E.prototype.shl=function(t,e){return this._verify1(t),this.imod(t.ushln(e))},E.prototype.imul=function(t,e){return this._verify2(t,e),this.imod(t.imul(e))},E.prototype.mul=function(t,e){return this._verify2(t,e),this.imod(t.mul(e))},E.prototype.isqr=function(t){return this.imul(t,t.clone())},E.prototype.sqr=function(t){return this.mul(t,t)},E.prototype.sqrt=function(t){if(t.isZero())return t.clone();var e=this.m.andln(3);if(r(e%2==1),3===e){var n=this.m.add(new i(1)).iushrn(2);return this.pow(t,n)}for(var o=this.m.subn(1),a=0;!o.isZero()&&0===o.andln(1);)a++,o.iushrn(1);r(!o.isZero());var s=new i(1).toRed(this),u=s.redNeg(),h=this.m.subn(1).iushrn(1),c=this.m.bitLength();for(c=new i(2*c*c).toRed(this);0!==this.pow(c,h).cmp(u);)c.redIAdd(u);for(var l=this.pow(c,o),d=this.pow(t,o.addn(1).iushrn(1)),f=this.pow(t,o),m=a;0!==f.cmp(s);){for(var p=f,g=0;0!==p.cmp(s);g++)p=p.redSqr();r(g<m);var y=this.pow(l,new i(1).iushln(m-g-1));d=d.redMul(y),l=y.redSqr(),f=f.redMul(l),m=g}return d},E.prototype.invm=function(t){var e=t._invmp(this.m);return 0!==e.negative?(e.negative=0,this.imod(e).redNeg()):this.imod(e)},E.prototype.pow=function(t,e){if(e.isZero())return new i(1).toRed(this);if(0===e.cmpn(1))return t.clone();var r=new Array(16);r[0]=new i(1).toRed(this),r[1]=t;for(var n=2;n<r.length;n++)r[n]=this.mul(r[n-1],t);var o=r[0],a=0,s=0,u=e.bitLength()%26;for(0===u&&(u=26),n=e.length-1;n>=0;n--){for(var h=e.words[n],c=u-1;c>=0;c--){var l=h>>c&1;o!==r[0]&&(o=this.sqr(o)),0!==l||0!==a?(a<<=1,a|=l,(4===++s||0===n&&0===c)&&(o=this.mul(o,r[a]),s=0,a=0)):s=0}u=26}return o},E.prototype.convertTo=function(t){var e=t.umod(this.m);return e===t?e.clone():e},E.prototype.convertFrom=function(t){var e=t.clone();return e.red=null,e},i.mont=function(t){return new A(t)},n(A,E),A.prototype.convertTo=function(t){return this.imod(t.ushln(this.shift))},A.prototype.convertFrom=function(t){var e=this.imod(t.mul(this.rinv));return e.red=null,e},A.prototype.imul=function(t,e){if(t.isZero()||e.isZero())return t.words[0]=0,t.length=1,t;var r=t.imul(e),n=r.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),i=r.isub(n).iushrn(this.shift),o=i;return i.cmp(this.m)>=0?o=i.isub(this.m):i.cmpn(0)<0&&(o=i.iadd(this.m)),o._forceRed(this)},A.prototype.mul=function(t,e){if(t.isZero()||e.isZero())return new i(0)._forceRed(this);var r=t.mul(e),n=r.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),o=r.isub(n).iushrn(this.shift),a=o;return o.cmp(this.m)>=0?a=o.isub(this.m):o.cmpn(0)<0&&(a=o.iadd(this.m)),a._forceRed(this)},A.prototype.invm=function(t){return this.imod(t._invmp(this.m).mul(this.r2))._forceRed(this)}}(t,n)}));var RY=zY.BN;const BY=new vt("bignumber/5.6.2"),DY={},FY=9007199254740991;let LY=!1;class UY{constructor(t,e){t!==DY&&BY.throwError("cannot call constructor directly; use BigNumber.from",vt.errors.UNSUPPORTED_OPERATION,{operation:"new (BigNumber)"}),this._hex=e,this._isBigNumber=!0,Object.freeze(this)}fromTwos(t){return VY(HY(this).fromTwos(t))}toTwos(t){return VY(HY(this).toTwos(t))}abs(){return"-"===this._hex[0]?UY.from(this._hex.substring(1)):this}add(t){return VY(HY(this).add(HY(t)))}sub(t){return VY(HY(this).sub(HY(t)))}div(t){return UY.from(t).isZero()&&GY("division-by-zero","div"),VY(HY(this).div(HY(t)))}mul(t){return VY(HY(this).mul(HY(t)))}mod(t){const e=HY(t);return e.isNeg()&&GY("division-by-zero","mod"),VY(HY(this).umod(e))}pow(t){const e=HY(t);return e.isNeg()&&GY("negative-power","pow"),VY(HY(this).pow(e))}and(t){const e=HY(t);return(this.isNegative()||e.isNeg())&&GY("unbound-bitwise-result","and"),VY(HY(this).and(e))}or(t){const e=HY(t);return(this.isNegative()||e.isNeg())&&GY("unbound-bitwise-result","or"),VY(HY(this).or(e))}xor(t){const e=HY(t);return(this.isNegative()||e.isNeg())&&GY("unbound-bitwise-result","xor"),VY(HY(this).xor(e))}mask(t){return(this.isNegative()||t<0)&&GY("negative-width","mask"),VY(HY(this).maskn(t))}shl(t){return(this.isNegative()||t<0)&&GY("negative-width","shl"),VY(HY(this).shln(t))}shr(t){return(this.isNegative()||t<0)&&GY("negative-width","shr"),VY(HY(this).shrn(t))}eq(t){return HY(this).eq(HY(t))}lt(t){return HY(this).lt(HY(t))}lte(t){return HY(this).lte(HY(t))}gt(t){return HY(this).gt(HY(t))}gte(t){return HY(this).gte(HY(t))}isNegative(){return"-"===this._hex[0]}isZero(){return HY(this).isZero()}toNumber(){try{return HY(this).toNumber()}catch(t){GY("overflow","toNumber",this.toString())}return null}toBigInt(){try{return BigInt(this.toString())}catch(t){}return BY.throwError("this platform does not support BigInt",vt.errors.UNSUPPORTED_OPERATION,{value:this.toString()})}toString(){return arguments.length>0&&(10===arguments[0]?LY||(LY=!0,BY.warn("BigNumber.toString does not accept any parameters; base-10 is assumed")):16===arguments[0]?BY.throwError("BigNumber.toString does not accept any parameters; use bigNumber.toHexString()",vt.errors.UNEXPECTED_ARGUMENT,{}):BY.throwError("BigNumber.toString does not accept parameters",vt.errors.UNEXPECTED_ARGUMENT,{})),HY(this).toString(10)}toHexString(){return this._hex}toJSON(t){return{type:"BigNumber",hex:this.toHexString()}}static from(t){if(t instanceof UY)return t;if("string"==typeof t)return t.match(/^-?0x[0-9a-f]+$/i)?new UY(DY,qY(t)):t.match(/^-?[0-9]+$/)?new UY(DY,qY(new RY(t))):BY.throwArgumentError("invalid BigNumber string","value",t);if("number"==typeof t)return t%1&&GY("underflow","BigNumber.from",t),(t>=FY||t<=-FY)&&GY("overflow","BigNumber.from",t),UY.from(String(t));const e=t;if("bigint"==typeof e)return UY.from(e.toString());if(xt(e))return UY.from(Tt(e));if(e)if(e.toHexString){const t=e.toHexString();if("string"==typeof t)return UY.from(t)}else{let t=e._hex;if(null==t&&"BigNumber"===e.type&&(t=e.hex),"string"==typeof t&&(Pt(t)||"-"===t[0]&&Pt(t.substring(1))))return UY.from(t)}return BY.throwArgumentError("invalid BigNumber value","value",t)}static isBigNumber(t){return!(!t||!t._isBigNumber)}}function qY(t){if("string"!=typeof t)return qY(t.toString(16));if("-"===t[0])return"-"===(t=t.substring(1))[0]&&BY.throwArgumentError("invalid hex","value",t),"0x00"===(t=qY(t))?t:"-"+t;if("0x"!==t.substring(0,2)&&(t="0x"+t),"0x"===t)return"0x00";for(t.length%2&&(t="0x0"+t.substring(2));t.length>4&&"0x00"===t.substring(0,4);)t="0x"+t.substring(4);return t}function VY(t){return UY.from(qY(t))}function HY(t){const e=UY.from(t).toHexString();return"-"===e[0]?new RY("-"+e.substring(3),16):new RY(e.substring(2),16)}function GY(t,e,r){const n={fault:t,operation:e};return null!=r&&(n.value=r),BY.throwError(t,vt.errors.NUMERIC_FAULT,n)}var ZY=window&&window.__awaiter||function(t,e,r,n){return new(r||(r=Promise))((function(i,o){function a(t){try{u(n.next(t))}catch(t){o(t)}}function s(t){try{u(n.throw(t))}catch(t){o(t)}}function u(t){var e;t.done?i(t.value):(e=t.value,e instanceof r?e:new r((function(t){t(e)}))).then(a,s)}u((n=n.apply(t,e||[])).next())}))};const KY=new vt("hash/5.6.1"),WY=new Uint8Array(32);WY.fill(0);const JY=UY.from(-1),YY=UY.from(0),QY=UY.from(1),XY=UY.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");const tQ=Rt(QY.toHexString(),32),eQ=Rt(YY.toHexString(),32),rQ={name:"string",version:"string",chainId:"uint256",verifyingContract:"address",salt:"bytes32"},nQ=["name","version","chainId","verifyingContract","salt"];function iQ(t){return function(e){return"string"!=typeof e&&KY.throwArgumentError(`invalid domain value for ${JSON.stringify(t)}`,`domain.${t}`,e),e}}const oQ={name:iQ("name"),version:iQ("version"),chainId:function(t){try{return UY.from(t).toString()}catch(t){}return KY.throwArgumentError('invalid domain value for "chainId"',"domain.chainId",t)},verifyingContract:function(t){try{return or(t).toLowerCase()}catch(t){}return KY.throwArgumentError('invalid domain value "verifyingContract"',"domain.verifyingContract",t)},salt:function(t){try{const e=jt(t);if(32!==e.length)throw new Error("bad length");return Tt(e)}catch(t){}return KY.throwArgumentError('invalid domain value "salt"',"domain.salt",t)}};function aQ(t){{const e=t.match(/^(u?)int(\d*)$/);if(e){const r=""===e[1],n=parseInt(e[2]||"256");(n%8!=0||n>256||e[2]&&e[2]!==String(n))&&KY.throwArgumentError("invalid numeric width","type",t);const i=XY.mask(r?n-1:n),o=r?i.add(QY).mul(JY):YY;return function(e){const r=UY.from(e);return(r.lt(o)||r.gt(i))&&KY.throwArgumentError(`value out-of-bounds for ${t}`,"value",e),Rt(r.toTwos(256).toHexString(),32)}}}{const e=t.match(/^bytes(\d+)$/);if(e){const r=parseInt(e[1]);return(0===r||r>32||e[1]!==String(r))&&KY.throwArgumentError("invalid bytes width","type",t),function(e){return jt(e).length!==r&&KY.throwArgumentError(`invalid length for ${t}`,"value",e),function(t){const e=jt(t),r=e.length%32;return r?Ct([e,WY.slice(r)]):Tt(e)}(e)}}}switch(t){case"address":return function(t){return Rt(or(t),32)};case"bool":return function(t){return t?tQ:eQ};case"bytes":return function(t){return Ge(t)};case"string":return function(t){return CY(t)}}return null}function sQ(t,e){return`${t}(${e.map((({name:t,type:e})=>e+" "+t)).join(",")})`}class uQ{constructor(t){Yt(this,"types",Object.freeze(ie(t))),Yt(this,"_encoderCache",{}),Yt(this,"_types",{});const e={},r={},n={};Object.keys(t).forEach((t=>{e[t]={},r[t]=[],n[t]={}}));for(const n in t){const i={};t[n].forEach((o=>{i[o.name]&&KY.throwArgumentError(`duplicate variable name ${JSON.stringify(o.name)} in ${JSON.stringify(n)}`,"types",t),i[o.name]=!0;const a=o.type.match(/^([^\x5b]*)(\x5b|$)/)[1];a===n&&KY.throwArgumentError(`circular type reference to ${JSON.stringify(a)}`,"types",t);aQ(a)||(r[a]||KY.throwArgumentError(`unknown type ${JSON.stringify(a)}`,"types",t),r[a].push(n),e[n][a]=!0)}))}const i=Object.keys(r).filter((t=>0===r[t].length));0===i.length?KY.throwArgumentError("missing primary type","types",t):i.length>1&&KY.throwArgumentError(`ambiguous primary types or unused types: ${i.map((t=>JSON.stringify(t))).join(", ")}`,"types",t),Yt(this,"primaryType",i[0]),function i(o,a){a[o]&&KY.throwArgumentError(`circular type reference to ${JSON.stringify(o)}`,"types",t),a[o]=!0,Object.keys(e[o]).forEach((t=>{r[t]&&(i(t,a),Object.keys(a).forEach((e=>{n[e][t]=!0})))})),delete a[o]}(this.primaryType,{});for(const e in n){const r=Object.keys(n[e]);r.sort(),this._types[e]=sQ(e,t[e])+r.map((e=>sQ(e,t[e]))).join("")}}getEncoder(t){let e=this._encoderCache[t];return e||(e=this._encoderCache[t]=this._getEncoder(t)),e}_getEncoder(t){{const e=aQ(t);if(e)return e}const e=t.match(/^(.*)(\x5b(\d*)\x5d)$/);if(e){const t=e[1],r=this.getEncoder(t),n=parseInt(e[3]);return e=>{n>=0&&e.length!==n&&KY.throwArgumentError("array length mismatch; expected length ${ arrayLength }","value",e);let i=e.map(r);return this._types[t]&&(i=i.map(Ge)),Ge(Ct(i))}}const r=this.types[t];if(r){const e=CY(this._types[t]);return t=>{const n=r.map((({name:e,type:r})=>{const n=this.getEncoder(r)(t[e]);return this._types[r]?Ge(n):n}));return n.unshift(e),Ct(n)}}return KY.throwArgumentError(`unknown type: ${t}`,"type",t)}encodeType(t){const e=this._types[t];return e||KY.throwArgumentError(`unknown type: ${JSON.stringify(t)}`,"name",t),e}encodeData(t,e){return this.getEncoder(t)(e)}hashStruct(t,e){return Ge(this.encodeData(t,e))}encode(t){return this.encodeData(this.primaryType,t)}hash(t){return this.hashStruct(this.primaryType,t)}_visit(t,e,r){if(aQ(t))return r(t,e);const n=t.match(/^(.*)(\x5b(\d*)\x5d)$/);if(n){const t=n[1],i=parseInt(n[3]);return i>=0&&e.length!==i&&KY.throwArgumentError("array length mismatch; expected length ${ arrayLength }","value",e),e.map((e=>this._visit(t,e,r)))}const i=this.types[t];return i?i.reduce(((t,{name:n,type:i})=>(t[n]=this._visit(i,e[n],r),t)),{}):KY.throwArgumentError(`unknown type: ${t}`,"type",t)}visit(t,e){return this._visit(this.primaryType,t,e)}static from(t){return new uQ(t)}static getPrimaryType(t){return uQ.from(t).primaryType}static hashStruct(t,e,r){return uQ.from(e).hashStruct(t,r)}static hashDomain(t){const e=[];for(const r in t){const n=rQ[r];n||KY.throwArgumentError(`invalid typed-data domain key: ${JSON.stringify(r)}`,"domain",t),e.push({name:r,type:n})}return e.sort(((t,e)=>nQ.indexOf(t.name)-nQ.indexOf(e.name))),uQ.hashStruct("EIP712Domain",{EIP712Domain:e},t)}static encode(t,e,r){return Ct(["0x1901",uQ.hashDomain(t),uQ.from(e).hash(r)])}static hash(t,e,r){return Ge(uQ.encode(t,e,r))}static resolveNames(t,e,r,n){return ZY(this,void 0,void 0,(function*(){t=te(t);const i={};t.verifyingContract&&!Pt(t.verifyingContract,20)&&(i[t.verifyingContract]="0x");const o=uQ.from(e);o.visit(r,((t,e)=>("address"!==t||Pt(e,20)||(i[e]="0x"),e)));for(const t in i)i[t]=yield n(t);return t.verifyingContract&&i[t.verifyingContract]&&(t.verifyingContract=i[t.verifyingContract]),r=o.visit(r,((t,e)=>"address"===t&&i[e]?i[e]:e)),{domain:t,value:r}}))}static getPayload(t,e,r){uQ.hashDomain(t);const n={},i=[];nQ.forEach((e=>{const r=t[e];null!=r&&(n[e]=oQ[e](r),i.push({name:e,type:rQ[e]}))}));const o=uQ.from(e),a=te(e);return a.EIP712Domain?KY.throwArgumentError("types must not contain EIP712Domain type","types.EIP712Domain",e):a.EIP712Domain=i,o.encode(r),{types:a,domain:n,primaryType:o.primaryType,message:o.visit(r,((t,e)=>{if(t.match(/^bytes(\d*)/))return Tt(jt(e));if(t.match(/^u?int/))return UY.from(e).toString();switch(t){case"address":return e.toLowerCase();case"bool":return!!e;case"string":return"string"!=typeof e&&KY.throwArgumentError("invalid string","value",e),e}return KY.throwArgumentError("unsupported type","type",t)}))}}}window&&window.__awaiter;new vt("wallet/5.6.2");function hQ(t,e,r,n){return Ua(uQ.hash(t,e,r),n)}const cQ="6492649264926492649264926492649264926492649264926492649264926492";function lQ(t,e){return t.toLowerCase()===e.toLowerCase()}function dQ(t){const{domain:e,types:r,message:n}=t;return qh.hash(e,r,n)}function fQ(t,e,n){return r(this,arguments,void 0,(function*(t,e,r,n="1",i={}){const{domain:o,types:a,message:s}=r;try{if(lQ(t,hQ(o,a,s,e)))return!0}catch(t){}const u=pR(n,i),h=dQ(r);if(e.endsWith(cQ))try{return"0x01"===(yield u.call({data:St(["0x60806040523480156200001157600080fd5b50604051620007003803806200070083398101604081905262000034916200056f565b6000620000438484846200004f565b9050806000526001601ff35b600080846001600160a01b0316803b806020016040519081016040528181526000908060200190933c90507f6492649264926492649264926492649264926492649264926492649264926492620000a68462000451565b036200021f57600060608085806020019051810190620000c79190620005ce565b8651929550909350915060000362000192576000836001600160a01b031683604051620000f5919062000643565b6000604051808303816000865af19150503d806000811462000134576040519150601f19603f3d011682016040523d82523d6000602084013e62000139565b606091505b5050905080620001905760405162461bcd60e51b815260206004820152601e60248201527f5369676e617475726556616c696461746f723a206465706c6f796d656e74000060448201526064015b60405180910390fd5b505b604051630b135d3f60e11b808252906001600160a01b038a1690631626ba7e90620001c4908b90869060040162000661565b602060405180830381865afa158015620001e2573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906200020891906200069d565b6001600160e01b031916149450505050506200044a565b805115620002b157604051630b135d3f60e11b808252906001600160a01b03871690631626ba7e9062000259908890889060040162000661565b602060405180830381865afa15801562000277573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906200029d91906200069d565b6001600160e01b031916149150506200044a565b8251604114620003195760405162461bcd60e51b815260206004820152603a6024820152600080516020620006e083398151915260448201527f3a20696e76616c6964207369676e6174757265206c656e677468000000000000606482015260840162000187565b620003236200046b565b506020830151604080850151855186939260009185919081106200034b576200034b620006c9565b016020015160f81c9050601b81148015906200036b57508060ff16601c14155b15620003cf5760405162461bcd60e51b815260206004820152603b6024820152600080516020620006e083398151915260448201527f3a20696e76616c6964207369676e617475726520762076616c75650000000000606482015260840162000187565b6040805160008152602081018083528a905260ff83169181019190915260608101849052608081018390526001600160a01b038a169060019060a0016020604051602081039080840390855afa1580156200042e573d6000803e3d6000fd5b505050602060405103516001600160a01b031614955050505050505b9392505050565b60006020825110156200046357600080fd5b508051015190565b60405180606001604052806003906020820280368337509192915050565b6001600160a01b03811681146200049f57600080fd5b50565b634e487b7160e01b600052604160045260246000fd5b60005b83811015620004d5578181015183820152602001620004bb565b50506000910152565b600082601f830112620004f057600080fd5b81516001600160401b03808211156200050d576200050d620004a2565b604051601f8301601f19908116603f01168101908282118183101715620005385762000538620004a2565b816040528381528660208588010111156200055257600080fd5b62000565846020830160208901620004b8565b9695505050505050565b6000806000606084860312156200058557600080fd5b8351620005928162000489565b6020850151604086015191945092506001600160401b03811115620005b657600080fd5b620005c486828701620004de565b9150509250925092565b600080600060608486031215620005e457600080fd5b8351620005f18162000489565b60208501519093506001600160401b03808211156200060f57600080fd5b6200061d87838801620004de565b935060408601519150808211156200063457600080fd5b50620005c486828701620004de565b6000825162000657818460208701620004b8565b9190910192915050565b828152604060208201526000825180604084015262000688816060850160208701620004b8565b601f01601f1916919091016060019392505050565b600060208284031215620006b057600080fd5b81516001600160e01b0319811681146200044a57600080fd5b634e487b7160e01b600052603260045260246000fdfe5369676e617475726556616c696461746f72237265636f7665725369676e6572",(new un).encode(["address","bytes32","bytes"],[t,jt(h),e])])}))}catch(t){return!1}return!!(yield mQ(t,e,h,u))||(yield pQ(t,e,h,u))}))}function mQ(t,e,n,i){return r(this,void 0,void 0,(function*(){let r;try{r=yield WX(i,["function isValidSignature(bytes32 _hash, bytes memory _signature) public view returns (bytes4 magicValue)"],[t,"isValidSignature",[jt(n),e]])}catch(t){if(t.message.startsWith("missing revert data in call exception"))return!1;throw t}return lQ(r,"0x1626ba7e")}))}function pQ(t,e,n,i){return r(this,void 0,void 0,(function*(){return lQ(yield WX(i,["function isValidSignature(bytes _hash, bytes memory _signature) public view returns (bytes4 magicValue)"],[t,"isValidSignature",[jt(n),e]]),"0x20c13b0b")}))}var gQ=Object.freeze({__proto__:null,getHash:dQ,default:fQ});var yQ=["ipfs.snapshot.box","snapshot.4everland.link","ipfs.io","ipfs.fleek.co","gateway.pinata.cloud","dweb.link","ipfs.infura.io"];class bQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return"number"==typeof t&&void 0!==(null==e?void 0:e[t-1])}getValidVotes(){return this.votes.filter((t=>bQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){return this.proposal.choices.map(((t,e)=>{const r=this.getValidVotes().filter((t=>t.choice===e+1));return r.reduce(((t,e)=>t+e.balance),0)}))}getScoresByStrategy(){return this.proposal.choices.map(((t,e)=>{const r=this.strategies.map(((t,r)=>{const n=this.getValidVotes().filter((t=>t.choice===e+1));return n.reduce(((t,e)=>t+e.scores[r]),0)}));return r}))}getScoresTotal(){return this.votes.reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.proposal.choices[this.selected-1]}}class wQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return Array.isArray(t)&&t.every((t=>void 0!==(null==e?void 0:e[t-1])))&&t.length===new Set(t).size}getValidVotes(){return this.votes.filter((t=>wQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){return this.proposal.choices.map(((t,e)=>this.getValidVotes().filter((t=>t.choice.includes(e+1))).reduce(((t,e)=>t+e.balance),0)))}getScoresByStrategy(){return this.proposal.choices.map(((t,e)=>this.strategies.map(((t,r)=>this.getValidVotes().filter((t=>t.choice.includes(e+1))).reduce(((t,e)=>t+e.scores[r]),0)))))}getScoresTotal(){return this.votes.reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.selected?this.proposal.choices.filter(((t,e)=>this.selected.includes(e+1))).join(", "):""}}function vQ(t,e){const r=t/e.reduce(((t,e)=>t+e),0);return isNaN(r)?0:r}function kQ(t,e){return Math.sqrt(t*e)}function _Q(t){return t*t}function MQ(t,e){return t.map((t=>e*t))}class EQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return"object"==typeof t&&!Array.isArray(t)&&null!==t&&Object.keys(t).every((t=>void 0!==(null==e?void 0:e[Number(t)-1])))&&Object.keys(t).length>0&&Object.values(t).every((t=>"number"==typeof t&&t>=0))&&Object.values(t).some((t=>"number"==typeof t&&t>0))}getValidVotes(){return this.votes.filter((t=>EQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){const t=this.getValidVotes(),e=this.getValidVotes().reduce(((t,e)=>t+e.balance),0),r=this.proposal.choices.map(((e,r)=>{const n=t.map((t=>kQ(vQ(t.choice[r+1],Object.values(t.choice)),t.balance))).reduce(((t,e)=>t+e),0);return _Q(n)}));return MQ(r.map(((t,e)=>vQ(r[e],r))),e)}getScoresByStrategy(){const t=this.getValidVotes(),e=this.getValidVotes().reduce(((t,e)=>t+e.balance),0),r=this.proposal.choices.map(((e,r)=>this.strategies.map(((e,n)=>t.map((t=>kQ(vQ(t.choice[r+1],Object.values(t.choice)),t.scores[n]))).reduce(((t,e)=>t+e),0))))).map((t=>t.map((t=>[_Q(t)]))));return r.map(((t,n)=>MQ(this.strategies.map(((t,e)=>vQ(r[n][e][0],r.flat(2)))),e)))}getScoresTotal(){return this.votes.reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.proposal.choices.map(((t,e)=>{if(this.selected[e+1]){const r=vQ(this.selected[e+1],Object.values(this.selected));return`${Math.round(1e3*r)/10}% for ${t}`}})).filter((t=>null!=t)).join(", ")}}function AQ(t,e){const r=[...new Set(t.map((t=>t[0])).flat())],n=Object.entries(t.reduce(((t,[e],r,n)=>{const i=n[r][1];t[e[0]][0]+=i;const o=n[r][2];return o.length>1?t[e[0]][1]=o.map(((r,n)=>r+t[e[0]][1][n]||r)):t[e[0]][1]=[t[e[0]][1].concat(o).reduce(((t,e)=>t+e),0)],t}),Object.assign({},...r.map((t=>({[t]:[0,[]]})))))),i=n.map((t=>[t[0],t[1][0]])),[o,a]=i.reduce((([t,e],[r,n])=>n>e?[r,n]:[t,e]),["?",-1/0]),[s,u]=i.reduce((([t,e],[r,n])=>n<e?[r,n]:[t,e]),["?",1/0]),h=n.sort(((t,e)=>e[1][0]-t[1][0])),c=t.map((t=>t[1])).reduce(((t,e)=>t+e),0);return e.push({round:e.length+1,sortedByHighest:h}),a>c/2||h.length<3?e:AQ(t.map((t=>[t[0].filter((t=>t!=s)),t[1],t[2]])).filter((t=>t[0].length>0)),e)}function xQ(t){const e=AQ(t.map((t=>[t.choice,t.balance,t.scores])),[]);return e[e.length-1].sortedByHighest}class jQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return Array.isArray(t)&&t.every((t=>void 0!==(null==e?void 0:e[t-1])))&&t.length===new Set(t).size&&t.length>0&&t.length===e.length}getValidVotes(){return this.votes.filter((t=>jQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){return function(t,e){const r=xQ(t);return e.choices.map(((t,e)=>r.filter((t=>Number(t[0])===e+1)).reduce(((t,e)=>t+e[1][0]),0)))}(this.getValidVotes(),this.proposal)}getScoresByStrategy(){const t=xQ(this.getValidVotes());return this.proposal.choices.map(((e,r)=>this.strategies.map(((e,n)=>t.filter((t=>Number(t[0])===r+1)).reduce(((t,e)=>t+(e[1][1][n]||0)),0)))))}getScoresTotal(){return this.votes.reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.selected.map((t=>this.proposal.choices[t-1])).filter(Boolean).map(((t,e)=>`(${n0(e+1)}) ${t}`)).join(", ")}}class SQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return!(!Array.isArray(t)||0===t.length||t.length!=e.length||new Set(t).size!==t.length)&&t.every((t=>Number.isInteger(t)&&t>=1&&t<=e.length))}getValidVotes(){return this.votes.filter((t=>SQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){const t=this.getValidVotes(),e=this.proposal.choices.length,r=Array.from({length:e},(()=>Array(e).fill(0))),n=Array(e).fill(0),i=this.getScoresTotal();for(const e of t)for(let t=0;t<e.choice.length;t++)for(let i=t+1;i<e.choice.length;i++){const o=e.choice[t]-1,a=e.choice[i]-1;r[o][a]+=e.balance,r[a][o]-=e.balance,n[o]+=e.balance}const o=Array(e).fill(0);let a=0;for(let t=0;t<e;t++)for(let n=0;n<e;n++)if(t!==n){const e=r[t][n];e>0?o[t]++:e<0?o[n]++:(o[t]+=.5,o[n]+=.5)}const s=e-1;if(i>0&&s>0)for(let t=0;t<e;t++){const e=n[t]/(s*i);o[t]+=.5*e}return a=o.reduce(((t,e)=>t+e),0),a>0?o.map((t=>t/a*i)):o.map((()=>i/e))}getScoresByStrategy(){const t=this.getValidVotes(),e=this.proposal.choices.length,r=this.strategies.length,n=Array.from({length:e},(()=>Array.from({length:e},(()=>Array(r).fill(0))))),i=Array(r).fill(0);for(const e of t)for(let t=0;t<r;t++)i[t]+=e.scores[t];const o=Array.from({length:e},(()=>Array(r).fill(0)));for(const e of t)for(let t=0;t<e.choice.length;t++)for(let i=t+1;i<e.choice.length;i++){const a=e.choice[t]-1,s=e.choice[i]-1;for(let t=0;t<r;t++)n[a][s][t]+=e.scores[t],n[s][a][t]-=e.scores[t],o[a][t]+=e.scores[t]}const a=Array.from({length:e},(()=>Array(r).fill(0)));for(let t=0;t<e;t++)for(let i=0;i<e;i++)if(t!==i)for(let e=0;e<r;e++){const r=n[t][i][e];r>0?a[t][e]++:r<0?a[i][e]++:(a[t][e]+=.5,a[i][e]+=.5)}const s=e-1;if(s>0)for(let t=0;t<r;t++)if(!(i[t]<=0))for(let r=0;r<e;r++){const e=o[r][t]/(s*i[t]);a[r][t]+=.5*e}const u=Array.from({length:e},(()=>Array(r).fill(0)));for(let t=0;t<r;t++){let r=0;for(let n=0;n<e;n++)r+=a[n][t];if(r>0)for(let n=0;n<e;n++)u[n][t]=a[n][t]/r*i[t];else if(i[t]>0)for(let r=0;r<e;r++)u[r][t]=i[t]/e}return u}getScoresTotal(){return this.getValidVotes().reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.selected.map((t=>this.proposal.choices[t-1])).join(", ")}}function NQ(t,e,r){const n=r.reduce(((t,e)=>t+e),0),i=e[t]/n*100;return isNaN(i)?0:i}function PQ(t,e,r){return NQ(t+1,e,Object.values(e))/100*r}class IQ{constructor(t,e,r,n){this.proposal=t,this.votes=e,this.strategies=r,this.selected=n}static isValidChoice(t,e){return"object"==typeof t&&!Array.isArray(t)&&null!==t&&Object.keys(t).every((t=>void 0!==(null==e?void 0:e[Number(t)-1])))&&Object.keys(t).length>0&&Object.values(t).every((t=>"number"==typeof t&&t>=0))&&Object.values(t).some((t=>"number"==typeof t&&t>0))}getValidVotes(){return this.votes.filter((t=>IQ.isValidChoice(t.choice,this.proposal.choices)))}getScores(){const t=this.proposal.choices.map(((t,e)=>this.getValidVotes().map((t=>PQ(e,t.choice,t.balance))).reduce(((t,e)=>t+e),0))),e=this.getValidVotes().reduce(((t,e)=>t+e.balance),0);return t.map(((e,r)=>NQ(r,t,t))).map((t=>e/100*t))}getScoresByStrategy(){const t=this.proposal.choices.map(((t,e)=>this.strategies.map(((t,r)=>this.getValidVotes().map((t=>PQ(e,t.choice,t.scores[r]))).reduce(((t,e)=>t+e),0))))).map((t=>t.map((t=>[t])))),e=this.getValidVotes().reduce(((t,e)=>t+e.balance),0);return t.map(((r,n)=>this.strategies.map(((e,r)=>NQ(0,t[n][r],t.flat(2)))).map((t=>[e/100*t])).flat()))}getScoresTotal(){return this.votes.reduce(((t,e)=>t+e.balance),0)}getChoiceString(){return this.proposal.choices.map(((t,e)=>{if(this.selected[e+1])return`${Math.round(10*NQ(e+1,this.selected,Object.values(this.selected)))/10}% for ${t}`})).filter((t=>null!=t)).join(", ")}}var TQ={"single-choice":bQ,approval:wQ,quadratic:EQ,"ranked-choice":jQ,copeland:SQ,weighted:IQ,basic:bQ};const $Q={1:"https://subgrapher.snapshot.org/delegation/1",10:"https://subgrapher.snapshot.org/delegation/10",56:"https://subgrapher.snapshot.org/delegation/56",100:"https://subgrapher.snapshot.org/delegation/100",137:"https://subgrapher.snapshot.org/delegation/137",146:"https://subgrapher.snapshot.org/delegation/146",250:"https://subgrapher.snapshot.org/delegation/250",5e3:"https://subgrapher.snapshot.org/delegation/5000",8453:"https://subgrapher.snapshot.org/delegation/8453",42161:"https://subgrapher.snapshot.org/delegation/42161",43114:"https://subgrapher.snapshot.org/delegation/43114",59144:"https://subgrapher.snapshot.org/delegation/59144",81457:"https://subgrapher.snapshot.org/delegation/81457",84532:"https://subgrapher.snapshot.org/delegation/84532",11155111:"https://subgrapher.snapshot.org/delegation/11155111"},OQ=1e3;function CQ(t){return t.length===OQ&&t[0].timestamp===t[t.length-1].timestamp}function zQ(t,e){const r=function(t){return`${t.delegator}-${t.delegate}-${t.space}`}(e);t.has(r)||t.set(r,e)}function RQ(t){const e=["",t];return t.includes(".eth")&&e.push(t.replace(".eth","")),e}function BQ(t){return r(this,arguments,void 0,(function*({url:t,spaces:e,pivot:r,snapshot:n}){const i={delegations:{__args:{where:{timestamp_gte:r},first:OQ,skip:0,orderBy:"timestamp",orderDirection:"asc"},delegator:!0,space:!0,delegate:!0,timestamp:!0}};return"latest"!==n&&(i.delegations.__args.block={number:n}),null!==e&&(i.delegations.__args.where.space_in=e),(yield JX(t,i)).delegations||[]}))}const DQ=["function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)"];function FQ(t){try{const e=NT.decodeShortString(t),r=function(t){if(0===t.length)return;let e="";for(let r=0;r<t.length;r++){const n=t.charCodeAt(r);if(n>127)return;e+=n.toString(16).padStart(2,"0")}return`0x${e}`}(e);return void 0!==r&&JI.toBigInt(r)===JI.toBigInt(t)?e:t}catch(e){return t}}function LQ(t,e){if(!e||!e.outputs||!Array.isArray(t)||0===t.length)return t;const r=e.outputs,n=[];let i=0;try{for(let e=0;e<r.length;e++){const o=r[e],a=t[i];switch(o.type){case"core::felt252":n.push(FQ(a)),i++;break;case"core::array::Span::<core::felt252>":case"core::array::Array::<core::felt252>":{if(void 0===a){n.push(void 0),i++;break}const e=Number(JI.toBigInt(a));n.push(t.slice(i+1,i+1+e)),i+=1+e;break}case"core::integer::u8":case"core::integer::u16":case"core::integer::u32":case"core::integer::u64":case"core::integer::i8":case"core::integer::i16":case"core::integer::i32":case"core::integer::i64":n.push(parseInt(a,16)),i++;break;case"core::integer::u128":case"core::integer::usize":case"core::integer::i128":n.push(BigInt(a).toString()),i++;break;case"core::integer::u256":n.push(jz.uint256ToBN({low:a,high:t[i+1]||"0x0"})),i+=2;break;case"core::bool":n.push("0x1"===a||"0x01"===a),i++;break;default:n.push(a),i++}}return n}catch(e){return t}}const UQ=t=>{if(0===t.length)return[];const[e,...r]=t,n=Number(JI.toBigInt(e)),i=r.slice(0,n),o=r.slice(n);return[i,...UQ(o)]};var qQ="__lodash_hash_undefined__",VQ="[object Function]",HQ="[object GeneratorFunction]",GQ=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,ZQ=/^\w*$/,KQ=/^\./,WQ=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,JQ=/\\(\\)?/g,YQ=/^\[object .+?Constructor\]$/,QQ=/^(?:0|[1-9]\d*)$/,XQ="object"==typeof n&&n&&n.Object===Object&&n,tX="object"==typeof self&&self&&self.Object===Object&&self,eX=XQ||tX||Function("return this")();var rX=Array.prototype,nX=Function.prototype,iX=Object.prototype,oX=eX["__core-js_shared__"],aX=function(){var t=/[^.]+$/.exec(oX&&oX.keys&&oX.keys.IE_PROTO||"");return t?"Symbol(src)_1."+t:""}(),sX=nX.toString,uX=iX.hasOwnProperty,hX=iX.toString,cX=RegExp("^"+sX.call(uX).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),lX=eX.Symbol,dX=rX.splice,fX=AX(eX,"Map"),mX=AX(Object,"create"),pX=lX?lX.prototype:void 0,gX=pX?pX.toString:void 0;function yX(t){var e=-1,r=t?t.length:0;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function bX(t){var e=-1,r=t?t.length:0;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function wX(t){var e=-1,r=t?t.length:0;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function vX(t,e,r){var n=t[e];uX.call(t,e)&&PX(n,r)&&(void 0!==r||e in t)||(t[e]=r)}function kX(t,e){for(var r=t.length;r--;)if(PX(t[r][0],e))return r;return-1}function _X(t){if(!TX(t)||(e=t,aX&&aX in e))return!1;var e,r=function(t){var e=TX(t)?hX.call(t):"";return e==VQ||e==HQ}(t)||function(t){var e=!1;if(null!=t&&"function"!=typeof t.toString)try{e=!!(t+"")}catch(t){}return e}(t)?cX:YQ;return r.test(function(t){if(null!=t){try{return sX.call(t)}catch(t){}try{return t+""}catch(t){}}return""}(t))}function MX(t,e,r,n){if(!TX(t))return t;e=function(t,e){if(IX(t))return!1;var r=typeof t;if("number"==r||"symbol"==r||"boolean"==r||null==t||$X(t))return!0;return ZQ.test(t)||!GQ.test(t)||null!=e&&t in Object(e)}(e,t)?[e]:function(t){return IX(t)?t:jX(t)}(e);for(var i=-1,o=e.length,a=o-1,s=t;null!=s&&++i<o;){var u=SX(e[i]),h=r;if(i!=a){var c=s[u];void 0===(h=n?n(c,u,s):void 0)&&(h=TX(c)?c:xX(e[i+1])?[]:{})}vX(s,u,h),s=s[u]}return t}function EX(t,e){var r=t.__data__;return function(t){var e=typeof t;return"string"==e||"number"==e||"symbol"==e||"boolean"==e?"__proto__"!==t:null===t}(e)?r["string"==typeof e?"string":"hash"]:r.map}function AX(t,e){var r=function(t,e){return null==t?void 0:t[e]}(t,e);return _X(r)?r:void 0}function xX(t,e){return!!(e=null==e?9007199254740991:e)&&("number"==typeof t||QQ.test(t))&&t>-1&&t%1==0&&t<e}yX.prototype.clear=function(){this.__data__=mX?mX(null):{}},yX.prototype.delete=function(t){return this.has(t)&&delete this.__data__[t]},yX.prototype.get=function(t){var e=this.__data__;if(mX){var r=e[t];return r===qQ?void 0:r}return uX.call(e,t)?e[t]:void 0},yX.prototype.has=function(t){var e=this.__data__;return mX?void 0!==e[t]:uX.call(e,t)},yX.prototype.set=function(t,e){return this.__data__[t]=mX&&void 0===e?qQ:e,this},bX.prototype.clear=function(){this.__data__=[]},bX.prototype.delete=function(t){var e=this.__data__,r=kX(e,t);return!(r<0)&&(r==e.length-1?e.pop():dX.call(e,r,1),!0)},bX.prototype.get=function(t){var e=this.__data__,r=kX(e,t);return r<0?void 0:e[r][1]},bX.prototype.has=function(t){return kX(this.__data__,t)>-1},bX.prototype.set=function(t,e){var r=this.__data__,n=kX(r,t);return n<0?r.push([t,e]):r[n][1]=e,this},wX.prototype.clear=function(){this.__data__={hash:new yX,map:new(fX||bX),string:new yX}},wX.prototype.delete=function(t){return EX(this,t).delete(t)},wX.prototype.get=function(t){return EX(this,t).get(t)},wX.prototype.has=function(t){return EX(this,t).has(t)},wX.prototype.set=function(t,e){return EX(this,t).set(t,e),this};var jX=NX((function(t){var e;t=null==(e=t)?"":function(t){if("string"==typeof t)return t;if($X(t))return gX?gX.call(t):"";var e=t+"";return"0"==e&&1/t==-1/0?"-0":e}(e);var r=[];return KQ.test(t)&&r.push(""),t.replace(WQ,(function(t,e,n,i){r.push(n?i.replace(JQ,"$1"):e||t)})),r}));function SX(t){if("string"==typeof t||$X(t))return t;var e=t+"";return"0"==e&&1/t==-1/0?"-0":e}function NX(t,e){if("function"!=typeof t||e&&"function"!=typeof e)throw new TypeError("Expected a function");var r=function(){var n=arguments,i=e?e.apply(this,n):n[0],o=r.cache;if(o.has(i))return o.get(i);var a=t.apply(this,n);return r.cache=o.set(i,a),a};return r.cache=new(NX.Cache||wX),r}function PX(t,e){return t===e||t!=t&&e!=e}NX.Cache=wX;var IX=Array.isArray;function TX(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}function $X(t){return"symbol"==typeof t||function(t){return!!t&&"object"==typeof t}(t)&&"[object Symbol]"==hX.call(t)}var OX=function(t,e,r){return null==t?t:MX(t,e,r)};const CX={evm:function(t,e,n,i,o){return r(this,arguments,void 0,(function*(t,e,r,n,i,o={}){const a=new cs(t,DQ,e),s=new bn(r);try{const t=Math.ceil(n.length/i),e=[];Array.from(Array(t)).forEach(((t,r)=>{const u=n.slice(i*r,i*(r+1));e.push(a.aggregate(u.map((t=>[t[0].toLowerCase(),s.encodeFunctionData(t[1],t[2])])),o))}));let r=yield Promise.all(e);return r=r.reduce(((t,[,e])=>t.concat(e)),[]),r.map(((t,e)=>s.decodeFunctionResult(n[e][1],t)))}catch(t){return Promise.reject(t)}}))},starknet:function(t,e,n,i,o){return r(this,arguments,void 0,(function*(t,e,r,n,i,o={}){const a=n.map((t=>({contractAddress:t[0],entrypoint:t[1],calldata:t[2]||[]}))),s=[];for(let t=0;t<a.length;t+=i)s.push(a.slice(t,t+i));return(yield Promise.all(s.map((r=>{var n;return e.callContract({contractAddress:t,entrypoint:"aggregate",calldata:vC.fromCallsToExecuteCalldata(r)},null!==(n=o.blockTag)&&void 0!==n?n:"latest")})))).map((t=>{const[e,r,...n]=t;return UQ(n)})).flat().map(((t,e)=>{const[,i]=n[e];return LQ(t,r.find((t=>t.name===i)))}))}))}};function zX(t,e,n,i){return r(this,arguments,void 0,(function*(t,e,r,n,i={}){var o;const a=(null==i?void 0:i.multicallAddress)||sR[t].multicall;if(!a)throw new Error("missing multicall address");const s=Object.assign({},i),u=(null==s?void 0:s.limit)||500;delete s.limit,delete s.multicallAddress;const h=(null===(o=sR[t])||void 0===o?void 0:o.starknet)?"starknet":"evm";return CX[h](a,e,r,n,u,s)}))}const RX={146:{tlds:[".sonic"],registryContract:"0xde1dadcf11a7447c3d093e97fdbd513f488ce3b4"}},BX=["function ownerOf(uint256 tokenId) view returns (address owner)"],DX=["1","11155111"],FX=["109","157"],LX="0x0000000000000000000000000000000000000000",UX={Accept:"application/json","Content-Type":"application/json"},qX="https://score.snapshot.org";function VX(t=qX,e={path:""}){const r=new URL(t);e.path&&(r.pathname=e.path);const n=r.searchParams.get("apiKey");let i=Object.assign({},UX);return n&&(r.searchParams.delete("apiKey"),i=Object.assign(Object.assign({},UX),{"X-API-KEY":n})),{url:r.toString(),headers:i}}function HX(t){return r(this,void 0,void 0,(function*(){let e=yield t.text();try{e=JSON.parse(e)}catch(r){return Promise.reject({code:t.status||500,message:"Failed to parse response from score API",data:e})}return e.error?Promise.reject(e.error):e}))}const GX=new Md({allErrors:!0,allowUnionTypes:!0,$data:!0,passContext:!0});Jm(GX),Qm(GX),GX.addFormat("address",{validate:t=>{try{return t===or(t)}catch(t){return!1}}}),GX.addFormat("evmAddress",{validate:t=>{try{return or(t),!0}catch(t){return!1}}}),GX.addFormat("starknetAddress",{validate:t=>{try{return Iz(t).toLowerCase()===t.toLowerCase()}catch(t){return!1}}}),GX.addFormat("long",{validate:()=>!0}),GX.addFormat("lowercase",{validate:t=>t===t.toLowerCase()}),GX.addFormat("color",{validate:t=>!!t&&!!t.match(/^#[0-9A-F]{6}$/)}),GX.addFormat("ethValue",{validate:t=>{if(!t.match(/^([0-9]|[1-9][0-9]+)(\.[0-9]+)?$/))return!1;try{return function(t,e){if("string"!=typeof t&&lu.throwArgumentError("value must be a string","value",t),"string"==typeof e){const t=du.indexOf(e);-1!==t&&(e=3*t)}Js(t,null!=e?e:18)}(t,18),!0}catch(t){return!1}}});const ZX=Object.keys(sR),KX=Object.keys(sR).filter((t=>!sR[t].testnet));function WX(t,e,n,i){return r(this,void 0,void 0,(function*(){const r=new cs(n[0],e,t);try{const t=n[2]||[];return yield r[n[1]](...t,i||{})}catch(t){return Promise.reject(t)}}))}function JX(t,e){return r(this,arguments,void 0,(function*(t,e,r={}){const n={query:Wh.jsonToGraphQLQuery({query:e})};r.variables&&(n.variables=r.variables);const i=yield QX(t,{method:"POST",headers:Object.assign({Accept:"application/json","Content-Type":"application/json"},null==r?void 0:r.headers),body:JSON.stringify(n)});let o=yield i.text();try{o=JSON.parse(o)}catch(e){throw new Error(`Errors found in subgraphRequest: URL: ${t}, Status: ${i.status}, Response: ${o.substring(0,400)}`)}if(o.errors)throw new Error(`Errors found in subgraphRequest: URL: ${t}, Status: ${i.status},  Response: ${JSON.stringify(o.errors).substring(0,400)}`);const{data:a}=o;return a||{}}))}function YX(t,e=yQ[0]){const r=`https://${e}`;if(!t)return null;if(!(t.startsWith("ipfs://")||t.startsWith("ipns://")||t.startsWith("https://")||t.startsWith("http://")))return`${r}/ipfs/${t}`;const n=t.split("://")[0];return"ipfs"===n?t.replace("ipfs://",`${r}/ipfs/`):"ipns"===n?t.replace("ipns://",`${r}/ipns/`):t}function QX(t){return r(this,arguments,void 0,(function*(t,r={}){const{timeout:n=3e4}=r,i=e(r,["timeout"]);if(n>0){const e=new AbortController,r=setTimeout((()=>e.abort()),n);try{return yield u(t,Object.assign(Object.assign({},i),{signal:e.signal}))}catch(t){if(t instanceof Error&&"AbortError"===t.name)throw new Error(`Request timeout after ${n}ms`);throw t}finally{clearTimeout(r)}}const o=e(i,["signal"]);return u(t,o)}))}function XX(t){return r(this,arguments,void 0,(function*(t,e="1",r={}){return yield PY(t,"snapshot",e,r)}))}function t0(t,e){return r(this,arguments,void 0,(function*(t,e,r={}){const n=yield XX(t,e,r);if(n){if(ar(n))return or(n);const t=n.split("/"),e=t.includes("testnet")?5:4,r=t[e];if(ar(r))return or(r)}return yield IY(t,e,r)}))}function e0(t,e){return r(this,void 0,void 0,(function*(){if(!t.endsWith(".shib"))return LX;const r=yield QX("https://stamp.fyi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({method:"get_owner",params:t,network:e})});return(yield r.json()).result}))}function r0(t,e){return r(this,void 0,void 0,(function*(){var r;if(!((null===(r=RX[e])||void 0===r?void 0:r.tlds)||[]).some((e=>t.endsWith(e))))return Promise.resolve(LX);try{const r=function(t){"string"!=typeof t&&lh.throwArgumentError("invalid ENS name; not a string","name",t);let e=dh;const r=mh(t);for(;r.length;)e=Cu(Nu([e,Cu(r.pop())]));return Tu(e)}(ph(t)),n=BigInt(r),i=pR(e);return yield WX(i,BX,[RX[e].registryContract,"ownerOf",[n]],{blockTag:"latest"})}catch(t){return LX}}))}function n0(t){const e=["th","st","nd","rd"],r=t%100;return t+(e[(r-20)%10]||e[r]||e[0])}function i0(t){return!!sR[t]}function o0(t){return t!==LX&&(ar(t)||s0(t))}function a0(t,e){return"latest"===t||"number"==typeof t&&t>=sR[e].start}function s0(t){if(!t)return!1;try{return Iz(t),!0}catch(t){return!1}}function u0(t){return ar(t)}function h0(t,e){if("string"!=typeof t||!/^0[xX]/.test(t))throw new Error(`Invalid address: ${t}`);const r=null!=e?e:42===t.length?"evm":"starknet";if("evm"===r&&u0(t))return or(t);if("starknet"===r&&s0(t))return Iz(t);throw new Error(`Invalid ${r} address: ${t}`)}function c0(t){return Promise.reject(new Error(t))}GX.addKeyword({keyword:"snapshotNetwork",validate:function(t,e){return"mainnet"===(this.snapshotEnv||"default")?KX.includes(e):ZX.includes(e)},error:{message:"network not allowed"}}),GX.addFormat("customUrl",{type:"string",validate:t=>!t.length||(t.startsWith("http://")||t.startsWith("https://")||t.startsWith("ipfs://")||t.startsWith("ipns://")||t.startsWith("snapshot://"))}),GX.addFormat("domain",{validate:t=>!!t&&!!t.match(/^(https:\/\/)?([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(\/)?$/)});var l0={call:WX,multicall:zX,fetch:QX,subgraphRequest:JX,ipfsGet:function(t,e){return r(this,arguments,void 0,(function*(t,e,r="ipfs"){return QX(`https://${t}/${r}/${e}`).then((t=>t.json()))}))},getUrl:YX,getJSON:function(t){return r(this,arguments,void 0,(function*(t,e={}){const r=YX(t,e.gateways);return(yield QX(r,e)).json()}))},sendTransaction:function(t,e,n,i,o){return r(this,arguments,void 0,(function*(t,e,r,n,i,o={}){const a=t.getSigner(),s=new cs(e,r,t).connect(a);return yield s[n](...i,o)}))},getScores:function(t,e,n,i){return r(this,arguments,void 0,(function*(t,e,r,n,i="latest",o=qX,a={}){if(!Array.isArray(n))return c0("addresses should be an array of addresses");if(0===n.length)return c0("addresses can not be empty");const s=n.find((t=>!o0(t)));if(s)return c0(`Invalid address: ${s}`);if(!i0(r))return c0(`Invalid network: ${r}`);const u=e.find((t=>t.network&&!i0(t.network)));if(u)return c0(`Invalid network (${u.network}) in strategy ${u.name}`);if(!a0(i,r))return c0(`Snapshot (${i}) must be 'latest' or greater than network start block (${sR[r].start})`);new URL(o).pathname="/api/scores";const{url:h,headers:c}=VX(o,{path:"/api/scores"});try{const o={space:t,network:r,snapshot:i,strategies:e,addresses:n},s=yield QX(h,{method:"POST",headers:c,body:JSON.stringify({params:o})}),u=yield HX(s);return"all"===a.returnValue?u.result:u.result[a.returnValue||"scores"]}catch(t){return t.errno?Promise.reject({code:t.errno,message:t.toString(),data:""}):Promise.reject(t)}}))},getVp:function(t,e,n,i,o,a,s){return r(this,void 0,void 0,(function*(){const{url:r,headers:a}=VX(null==s?void 0:s.url);if(!o0(t))return c0(`Invalid voter address: ${t}`);if(!i0(e))return c0(`Invalid network: ${e}`);const u=n.find((t=>t.network&&!i0(t.network)));if(u)return c0(`Invalid network (${u.network}) in strategy ${u.name}`);if(!a0(i,e))return c0(`Snapshot (${i}) must be 'latest' or greater than network start block (${sR[e].start})`);const h={method:"POST",headers:a,body:JSON.stringify({jsonrpc:"2.0",method:"get_vp",params:{address:t,network:e,strategies:n,snapshot:i,space:o}})};try{const t=yield QX(r,h);return(yield HX(t)).result}catch(t){return t.errno?Promise.reject({code:t.errno,message:t.toString(),data:""}):Promise.reject(t)}}))},validateSchema:function(t,e,r={snapshotEnv:"default",spaceType:"default"}){const n=GX.compile(t),i=n.call(r,e);return i||n.errors},getEnsTextRecord:PY,getSpaceUri:XX,getEnsOwner:IY,getSpaceController:function(t){return r(this,arguments,void 0,(function*(t,e="1",r={}){if(DX.includes(e))return t0(t,e,r);if(FX.includes(e))return e0(t,e);if(RX[String(e)])return r0(t,e);throw new Error(`Network not supported: ${e}`)}))},getDelegatesBySpace:function(t,e){return r(this,arguments,void 0,(function*(t,e,r="latest",n={}){const i=n.subgraphUrl||$Q[t];if(!i)return Promise.reject(`Delegation subgraph not available for network ${t}`);let o=0;const a=new Map,s=e?RQ(e):null;for(;;){const t=yield BQ({url:i,spaces:s,pivot:o,snapshot:r});if(CQ(t))throw new Error("Unable to paginate delegation");if(t.forEach((t=>{zQ(a,t),o=t.timestamp})),t.length<OQ)break}return[...a.values()]}))},clone:function(t){return JSON.parse(JSON.stringify(t))},sleep:function(t){return r(this,void 0,void 0,(function*(){return new Promise((e=>{setTimeout(e,t)}))}))},getNumberWithOrdinal:n0,voting:TQ,getProvider:pR,signMessage:function(t,e,n){return r(this,void 0,void 0,(function*(){return e=Tt(new E(e,"utf8")),yield t.send("personal_sign",[e,n])}))},getBlockNumber:function(t){return r(this,void 0,void 0,(function*(){try{const e=yield t.getBlockNumber();return parseInt(e)}catch(t){return Promise.reject()}}))},Multicaller:class{constructor(t,e,r,n={}){this.options={},this.calls=[],this.paths=[],this.network=t,this.provider=e,this.abi=r,this.options=n}call(t,e,r,n){return this.calls.push([e,r,n]),this.paths.push(t),this}execute(t){return r(this,void 0,void 0,(function*(){const e=t||{};return(yield zX(this.network,this.provider,this.abi,this.calls,this.options)).forEach(((t,r)=>OX(e,this.paths[r],t.length>1?t:t[0]))),this.calls=[],this.paths=[],e}))}},getSnapshots:function(t,e,n,i){return r(this,arguments,void 0,(function*(t,e,r,n,i={}){const o={};if(n.forEach((t=>o[t]="latest")),"latest"===e)return o;const a=`${t}-${e}-${n.join("-")}`,s=Xm[a],u=Date.now();if(s&&tp>u)return s;tp<u&&(Xm={},tp=u+36e5-u%36e5),o[t]=e;const h=Object.keys(o).filter((e=>t!==e));if(0===h.length)return o;const c={blocks:{__args:{where:{ts:(yield r.getBlock(e)).timestamp,network_in:h}},network:!0,number:!0}},l=i.blockFinderUrl||"https://blockfinder.snapshot.org";return(yield JX(l,c)).blocks.forEach((t=>o[t.network]=t.number)),Xm[a]=o,o}))},getHash:function(t,e){return(TY(t)?OY:gQ).getHash(t,e)},verify:function(t,e,n){return r(this,arguments,void 0,(function*(t,e,r,n="1",i={}){if(!s0(t)&&!u0(t))throw new Error("Invalid address");if(TY(r)){if(!uR.includes(n))throw new Error(`Invalid Starknet network: ${n}`);return $Y(t,e,r,n,i)}return fQ(t,e,r,n,i)}))},validate:function(t,e,n,i,o,a,s){return r(this,void 0,void 0,(function*(){if(!o0(e))return c0(`Invalid author: ${e}`);if(!i0(i))return c0(`Invalid network: ${i}`);if(!a0(o,i))return c0(`Snapshot (${o}) must be 'latest' or greater than network start block (${sR[i].start})`);s||(s={});const{url:r,headers:u}=VX(s.url),h={method:"POST",headers:u,body:JSON.stringify({jsonrpc:"2.0",method:"validate",params:{validation:t,author:e,space:n,network:i,snapshot:o,params:a}})};try{const t=yield QX(r,h);return(yield HX(t)).result}catch(t){return t.errno?Promise.reject({code:t.errno,message:t.toString(),data:""}):Promise.reject(t)}}))},isStarknetAddress:s0,isEvmAddress:u0,getFormattedAddress:h0,SNAPSHOT_SUBGRAPH_URL:$Q};const d0={Space:[{name:"from",type:"address"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"settings",type:"string"}]},f0={Proposal:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"type",type:"string"},{name:"title",type:"string"},{name:"body",type:"string"},{name:"discussion",type:"string"},{name:"choices",type:"string[]"},{name:"labels",type:"string[]"},{name:"start",type:"uint64"},{name:"end",type:"uint64"},{name:"snapshot",type:"uint64"},{name:"plugins",type:"string"},{name:"privacy",type:"string"},{name:"app",type:"string"}]},m0={UpdateProposal:[{name:"proposal",type:"string"},{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"type",type:"string"},{name:"title",type:"string"},{name:"body",type:"string"},{name:"discussion",type:"string"},{name:"choices",type:"string[]"},{name:"labels",type:"string[]"},{name:"plugins",type:"string"},{name:"privacy",type:"string"}]},p0={FlagProposal:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"proposal",type:"string"},{name:"timestamp",type:"uint64"}]},g0={CancelProposal:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"proposal",type:"string"}]},y0={CancelProposal:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"proposal",type:"string"}]},b0={Vote:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"proposal",type:"string"},{name:"choice",type:"uint32"},{name:"reason",type:"string"},{name:"app",type:"string"},{name:"metadata",type:"string"}]},w0={Vote:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"proposal",type:"string"},{name:"choice",type:"uint32[]"},{name:"reason",type:"string"},{name:"app",type:"string"},{name:"metadata",type:"string"}]},v0={Vote:[{name:"from",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"},{name:"proposal",type:"string"},{name:"choice",type:"string"},{name:"reason",type:"string"},{name:"app",type:"string"},{name:"metadata",type:"string"}]},k0={Follow:[{name:"from",type:"address"},{name:"network",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"}]},_0={Unfollow:[{name:"from",type:"address"},{name:"network",type:"string"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"}]},M0={Subscribe:[{name:"from",type:"address"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"}]},E0={Unsubscribe:[{name:"from",type:"address"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"}]},A0={Profile:[{name:"from",type:"address"},{name:"timestamp",type:"uint64"},{name:"profile",type:"string"}]},x0={Statement:[{name:"from",type:"address"},{name:"timestamp",type:"uint64"},{name:"space",type:"string"},{name:"about",type:"string"},{name:"statement",type:"string"},{name:"discourse",type:"string"},{name:"status",type:"string"},{name:"network",type:"string"}]},j0={Alias:[{name:"from",type:"address"},{name:"alias",type:"address"},{name:"timestamp",type:"uint64"}]},S0={DeleteSpace:[{name:"from",type:"address"},{name:"space",type:"string"},{name:"timestamp",type:"uint64"}]};var N0={hub:"https://hub.snapshot.org",sequencer:"https://seq.snapshot.org"},P0={hub:"https://testnet.hub.snapshot.org",sequencer:"https://testnet.seq.snapshot.org"},I0={hub:"http://localhost:3000",sequencer:"http://localhost:3001"};const T0={name:"snapshot",version:"0.1.4"};class $0{constructor(t=N0.sequencer,e={}){t=(t=(t=t.replace(N0.hub,N0.sequencer)).replace(P0.hub,P0.sequencer)).replace(I0.hub,I0.sequencer),this.address=t,this.options=e}sign(t,e,n,i){return r(this,void 0,void 0,(function*(){var r;const o=(null==t?void 0:t.getSigner)?t.getSigner():t,a=h0(e,"evm");n.from=n.from?h0(n.from):a,n.timestamp||(n.timestamp=parseInt((Date.now()/1e3).toFixed()));const s=Object.assign({},T0);"undefined"!=typeof window&&(null===(r=window.ethereum)||void 0===r?void 0:r.isTrust)&&(s.chainId=(yield o.provider.getNetwork()).chainId);const u={domain:s,types:i,message:n},h=yield o._signTypedData(s,u.types,n);return yield this.send({address:a,sig:h,data:u})}))}send(t){return r(this,void 0,void 0,(function*(){let e=this.address;"0x"===t.sig&&this.options.relayerURL&&(e=this.options.relayerURL);const r={method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(t)};return new Promise(((t,n)=>{QX(e,r).then((e=>{var r;if(e.ok)return t(e.json());if(null===(r=e.headers.get("content-type"))||void 0===r?void 0:r.includes("application/json"))return e.json().then(n).catch(n);throw e})).catch(n)}))}))}space(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,d0)}))}proposal(t,e,n){return r(this,void 0,void 0,(function*(){return n.labels||(n.labels=[]),n.discussion||(n.discussion=""),n.app||(n.app=""),n.privacy||(n.privacy=""),yield this.sign(t,e,n,f0)}))}updateProposal(t,e,n){return r(this,void 0,void 0,(function*(){return n.privacy||(n.privacy=""),yield this.sign(t,e,n,m0)}))}flagProposal(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,p0)}))}cancelProposal(t,e,n){return r(this,void 0,void 0,(function*(){const r=n.proposal.startsWith("0x");return yield this.sign(t,e,n,r?y0:g0)}))}vote(t,e,n){return r(this,void 0,void 0,(function*(){const r="shutter"===(null==n?void 0:n.privacy);n.reason||(n.reason=""),n.app||(n.app=""),n.metadata||(n.metadata="{}");let i=b0;return["approval","ranked-choice"].includes(n.type)&&(i=w0),!r&&["quadratic","weighted"].includes(n.type)&&(i=v0,n.choice=JSON.stringify(n.choice)),r&&(i=v0),delete n.privacy,delete n.type,yield this.sign(t,e,n,i)}))}follow(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,k0)}))}unfollow(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,_0)}))}subscribe(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,M0)}))}unsubscribe(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,E0)}))}profile(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,A0)}))}statement(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,x0)}))}alias(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,j0)}))}deleteSpace(t,e,n){return r(this,void 0,void 0,(function*(){return yield this.sign(t,e,n,S0)}))}}var O0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Proposal",definitions:{Proposal:{title:"Proposal",type:"object",properties:{name:{type:"string",title:"name",minLength:1,maxLength:256},body:{type:"string",title:"body",minLength:0},discussion:{type:"string",format:"customUrl",title:"discussion",maxLength:256},choices:{type:"array",title:"choices",minItems:1,items:{type:"string",minLength:1,maxLength:256}},labels:{type:"array",title:"labels",maxItems:10,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:8,pattern:"^[a-zA-Z0-9]+$"}},type:{type:"string",enum:["single-choice","approval","ranked-choice","quadratic","copeland","weighted","custom","basic"]},snapshot:{type:"number",title:"snapshot"},start:{type:"number",title:"start",minimum:1e9,maximum:2e9},end:{type:"number",title:"end",minimum:1e9,maximum:2e9},metadata:{type:"object",title:"metadata"},app:{type:"string",title:"app",maxLength:24},privacy:{type:"string",enum:["","shutter"]}},required:["name","body","choices","snapshot","start","end"],additionalProperties:!1}}},C0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/UpdateProposal",definitions:{UpdateProposal:{title:"Update Proposal",type:"object",properties:{proposal:{type:"string",title:"proposal id"},name:{type:"string",title:"name",minLength:1,maxLength:256},body:{type:"string",title:"body",minLength:0},discussion:{type:"string",format:"customUrl",title:"discussion",maxLength:256},choices:{type:"array",title:"choices",minItems:1},labels:{type:"array",title:"labels",maxItems:10,uniqueItems:!0,items:{type:"string",minLength:1,maxLength:8,pattern:"^[a-zA-Z0-9]+$"}},type:{enum:["single-choice","approval","ranked-choice","quadratic","weighted","custom","basic"]},metadata:{type:"object",title:"metadata"},privacy:{type:"string",enum:["","shutter"]}},required:["proposal","name","body","discussion","choices","type","metadata"],additionalProperties:!1}}},z0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Vote",definitions:{Vote:{title:"Vote",type:"object",properties:{proposal:{type:"string",title:"proposal"},choice:{type:["number","array","object","boolean","string"],title:"choice"},metadata:{type:"object",title:"metadata"},reason:{type:"string",title:"reason",maxLength:5e3},app:{type:"string",title:"app",maxLength:24}},required:["proposal","choice"],additionalProperties:!1}}},R0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Profile",definitions:{Profile:{title:"Profile",type:"object",properties:{name:{type:"string",title:"name",maxLength:32},about:{type:"string",title:"about",maxLength:256},avatar:{type:"string",title:"avatar",format:"customUrl",maxLength:256},cover:{type:"string",title:"avatar",format:"customUrl",maxLength:256},twitter:{type:"string",title:"twitter",pattern:"^[A-Za-z0-9_]*$",maxLength:15},github:{type:"string",title:"github",pattern:"^[A-Za-z0-9_-]*$",maxLength:39},lens:{type:"string",title:"lens",pattern:"^[A-Za-z0-9_]*$",maxLength:26},farcaster:{type:"string",title:"farcaster",pattern:"^[a-z0-9-]*$",maxLength:17}},required:[],additionalProperties:!1}}},B0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Statement",definitions:{Statement:{title:"Statement",type:"object",properties:{about:{type:"string",format:"long",title:"About",maxLength:140},statement:{type:"string",format:"long",title:"Statement",maxLength:1e4},discourse:{type:"string",title:"discourse",pattern:"^[A-Za-z0-9-_.]*$",maxLength:30},network:{type:"string",title:"network",pattern:"^[a-z0-9-]*$",maxLength:24},status:{enum:["ACTIVE","INACTIVE"],title:"status"}},required:[],additionalProperties:!1}}},D0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Zodiac",definitions:{Zodiac:{title:"Zodiac",type:"object",properties:{safes:{title:"Safe(s)",type:"array",maxItems:8,items:{type:"object",properties:{network:{title:"Network",type:"string",snapshotNetwork:!0},multisend:{title:"Multisend contract address",type:"string"},realityAddress:{title:"Reality module address",type:"string"},umaAddress:{title:"UMA module address",type:"string"}},additionalProperties:!1}},additionalProperties:!1}}}},F0={$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Alias",definitions:{Alias:{title:"Alias",type:"object",properties:{alias:{type:"string",format:"address"}},required:["alias"],additionalProperties:!1}}};return{Client:$0,Client712:$0,schemas:{space:{$schema:"http://json-schema.org/draft-07/schema#",$ref:"#/definitions/Space",definitions:{Space:{title:"Space",type:"object",properties:{name:{type:"string",title:"name",minLength:1,maxLength:32},private:{type:"boolean"},about:{type:"string",title:"about",maxLength:160},guidelines:{type:"string",format:"customUrl",title:"guidelines",maxLength:256},template:{type:"string",title:"template",maxLength:1024},terms:{type:"string",title:"terms",format:"customUrl",maxLength:256},avatar:{type:"string",title:"avatar",format:"customUrl",maxLength:256},cover:{type:"string",title:"avatar",format:"customUrl",maxLength:256},location:{type:"string",title:"location",maxLength:24},website:{type:"string",title:"website",format:"customUrl",maxLength:256},twitter:{type:"string",title:"twitter",pattern:"^[A-Za-z0-9_]*$",maxLength:15},coingecko:{type:"string",title:"coingecko",pattern:"^[a-z0-9-]*$",maxLength:32},github:{type:"string",title:"github",pattern:"^[A-Za-z0-9_-]*$",maxLength:39},farcaster:{type:"string",title:"farcaster"},email:{type:"string",title:"email",maxLength:32},network:{type:"string",snapshotNetwork:!0,title:"network",minLength:1},symbol:{type:"string",title:"symbol",maxLength:16},skin:{type:"string",title:"skin",maxLength:32},domain:{type:"string",title:"domain",maxLength:64,format:"domain"},discussions:{type:"string",format:"uri",title:"Discussions link",maxLength:256},discourseCategory:{type:"integer",minimum:1,title:"Discourse category"},strategies:{type:"array",minItems:1,uniqueItems:!0,items:{type:"object",properties:{name:{type:"string",maxLength:64,title:"name"},network:{type:"string",title:"network",snapshotNetwork:!0},params:{type:"object",title:"params"}},required:["name"],additionalProperties:!1},title:"strategies"},members:{type:"array",maxItems:100,items:{type:"string",anyOf:[{type:"string",format:"evmAddress"},{type:"string",format:"starknetAddress"}],errorMessage:"Must be a valid address"},title:"members",uniqueItems:!0},admins:{type:"array",maxItems:100,items:{type:"string",anyOf:[{type:"string",format:"evmAddress"},{type:"string",format:"starknetAddress"}],errorMessage:"Must be a valid address"},title:"admins",uniqueItems:!0},moderators:{type:"array",maxItems:100,items:{type:"string",anyOf:[{type:"string",format:"evmAddress"},{type:"string",format:"starknetAddress"}],errorMessage:"Must be a valid address"},title:"moderators",uniqueItems:!0},filters:{type:"object",properties:{defaultTab:{type:"string"},minScore:{type:"number",minimum:0},onlyMembers:{type:"boolean"},invalids:{type:"array",items:{type:"string",maxLength:64},title:"invalids"}},additionalProperties:!1},validation:{type:"object",properties:{name:{type:"string",maxLength:64,title:"name"},params:{type:"object",title:"params"}},required:["name"],additionalProperties:!1},voteValidation:{type:"object",properties:{name:{type:"string",maxLength:32,title:"name"},params:{type:"object",title:"params"}},required:["name"],additionalProperties:!1},followValidation:{type:"object",properties:{name:{type:"string",maxLength:32,title:"name"},params:{type:"object",title:"params"}},required:["name"],additionalProperties:!1},delegationPortal:{type:"object",properties:{delegationType:{type:"string",title:"Delegation type",description:"Specify the type of delegation that you are using",anyOf:[{const:"compound-governor",title:"Compound governor"},{const:"split-delegation",title:"Split Delegation"},{const:"apechain-delegate-registry",title:"ApeChain Delegate Registry"}]},delegationContract:{type:"string",title:"Contract address",description:"The address of your delegation contract",examples:["0x3901D0fDe202aF1427216b79f5243f8A022d68cf"],anyOf:[{type:"string",format:"evmAddress"},{type:"string",format:"starknetAddress"}],errorMessage:"Must be a valid EVM of Starknet address"},delegationNetwork:{type:"string",title:"Delegation network",description:"The network of your delegation contract",snapshotNetwork:!0},delegationApi:{type:"string",format:"uri",title:"Delegation API",description:"The URL of your delegation API (e.g a subgraph)",examples:["https://subgrapher.snapshot.org/subgraph/arbitrum/FTzC6VrZd8JhJgWfTJnwWgH1Z1dS3GxaosKkRbCqkZAZ"]}},required:["delegationType","delegationApi","delegationContract"],additionalProperties:!1},allowAlias:{type:"boolean"},plugins:{type:"object"},voting:{type:"object",properties:{delay:{type:"integer",minimum:0,maximum:2592e3,errorMessage:{maximum:"Delay must be less than 30 days"}},period:{type:"integer",minimum:0,maximum:31622400,errorMessage:{maximum:"Delay must be less than a year"}},type:{type:"string",title:"type"},quorum:{type:"number",minimum:0},quorumType:{type:"string",enum:["rejection"]},blind:{type:"boolean"},hideAbstain:{type:"boolean"},aliased:{type:"boolean"},privacy:{type:"string",enum:["","shutter","any"]}},additionalProperties:!1},categories:{type:"array",maxItems:2,items:{type:"string",enum:["protocol","social","investment","grant","service","media","creator","collector","ai-agent","gaming","wallet","music","layer-2","defai","defi","rwa","depin","meme"]}},treasuries:{type:"array",maxItems:10,uniqueItems:!0,items:{type:"object",properties:{name:{type:"string",title:"Name",examples:["e.g. Balancer DAO 1"],minLength:1,maxLength:64},address:{type:"string",title:"Contract address",examples:["e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"],anyOf:[{type:"string",format:"evmAddress"},{type:"string",format:"starknetAddress"}],errorMessage:"Must be a valid EVM of Starknet address"},network:{type:"string",title:"Network",snapshotNetwork:!0}},required:["name","address","network"],additionalProperties:!1}},labels:{type:"array",maxItems:10,uniqueItems:!0,items:{type:"object",properties:{id:{type:"string",title:"Id",minLength:1,maxLength:8},name:{type:"string",title:"Name",minLength:1,maxLength:32},description:{type:"string",title:"Description",maxLength:100},color:{type:"string",title:"Color",format:"color"}},required:["id","name","color"],additionalProperties:!1}},parent:{type:"string",title:"parent"},children:{type:"array",maxItems:16,title:"children",items:{type:"string"},uniqueItems:!0},boost:{type:"object",properties:{enabled:{type:"boolean"},bribeEnabled:{type:"boolean"}},required:["enabled","bribeEnabled"],additionalProperties:!1},skinSettings:{type:"object",properties:{bg_color:{type:"string",format:"color"},link_color:{type:"string",format:"color"},text_color:{type:"string",format:"color"},content_color:{type:"string",format:"color"},border_color:{type:"string",format:"color"},heading_color:{type:"string",format:"color"},primary_color:{type:"string",format:"color"},header_color:{type:"string",format:"color"},theme:{type:"string",enum:["light","dark"]},logo:{type:"string",title:"logo",format:"customUrl",maxLength:256}},additionalProperties:!1}},required:["name","network","strategies"],additionalProperties:!1}}}.definitions.Space,proposal:O0.definitions.Proposal,updateProposal:C0.definitions.UpdateProposal,vote:z0.definitions.Vote,profile:R0.definitions.Profile,statement:B0.definitions.Statement,zodiac:D0.definitions.Zodiac,alias:F0.definitions.Alias},utils:l0}}));

exec
/bin/bash -lc "rg -n 'function submit|RELAYER|relayer|onlyRelayer|refundee|submitSnapshotVote|submitBatch' contracts/PNounsSnapVoter.sol relayer-cf/src/worker.js | sed -n '1,220p'
nl -ba contracts/PNounsSnapVoter.sol | sed -n '235,335p'
nl -ba docs/member-proposal-unified.html | sed -n '135,235p'
git diff --exit-code 0467988:relayer-cf/src/snap.js 047d8aa:relayer-cf/src/snap.js; true
git diff 0467988:relayer-cf/src/snap.js 047d8aa:relayer-cf/src/snap.js | sed -n '1,220p'
git diff 047d8aa"'^ 047d8aa -- relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/wrangler.toml' in /mnt/data/pnouns-voter
 succeeded in 0ms:
contracts/PNounsSnapVoter.sol:124:    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
relayer-cf/src/worker.js:154:async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
relayer-cf/src/worker.js:279:async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
relayer-cf/src/worker.js:465:          const relayerAddr = wc?.account?.address || null;
relayer-cf/src/worker.js:466:          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
relayer-cf/src/worker.js:467:          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
   235	    function snapVoteDigest(SnapVote calldata v) public view returns (bytes32) {
   236	        bytes32 structHash = keccak256(abi.encode(
   237	            SNAP_VOTE_TYPEHASH,
   238	            keccak256(bytes(v.from)),
   239	            spaceHash, // space は本コントラクトのスペースに固定(異なる space の署名は復元アドレスが一致しない)
   240	            v.timestamp,
   241	            keccak256(bytes(v.proposal)),
   242	            v.choice,
   243	            keccak256(bytes(v.reason)),
   244	            keccak256(bytes(v.app)),
   245	            keccak256(bytes(v.metadata))
   246	        ));
   247	        return keccak256(abi.encodePacked("\x19\x01", SNAP_DOMAIN_SEPARATOR, structHash));
   248	    }
   249	
   250	    // ---- 投票 ----
   251	    /// @notice Snapshot の投票署名をまとめて検証・集計する。誰でも呼べ、ガスは預け金から払い戻し。1 バッチ 1 提案。
   252	    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
   253	        uint256 startGas = gasleft();
   254	        if (votes.length == 0) return;
   255	        bytes32 firstProp = keccak256(bytes(votes[0].proposal));
   256	        uint256 nounsId = snapToNouns[firstProp];
   257	        if (nounsId == 0) revert NotRegistered();
   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
   259	        uint32 snapCounted;
   260	        for (uint256 i = 0; i < votes.length; i++) {
   261	            SnapVote calldata v = votes[i];
   262	            if (keccak256(bytes(v.proposal)) != firstProp) revert MixedProposals();
   263	            bytes32 digest = snapVoteDigest(v);
   264	            address fromAddr = _parseAddress(v.from);
   265	            if (fromAddr.code.length == 0) {
   266	                // EOA: ECDSA 復元が from と一致すること
   267	                if (ECDSA.recover(digest, v.signature) != fromAddr) revert FromMismatch();
   268	            } else {
   269	                // スマートウォレット(Safe 等): EIP-1271 で検証
   270	                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
   271	            }
   272	            uint8 support = _choiceToSupport(v.choice);
   273	            snapCounted += _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
   274	        }
   275	        snapshotVotesCounted[nounsId] += snapCounted;
   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
   277	        _refundGas(startGas, votes.length, nounsId);
   278	    }
   279	
   280	    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
   281	    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
   282	        uint256 startGas = gasleft();
   283	        if (support > ABSTAIN) revert InvalidChoice();
   284	        // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
   286	        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
   287	        _refundGas(startGas, 1, nounsProposalId);
   288	    }
   289	
   290	    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal returns (uint32) {
   291	        if (tokenIds.length == 0) revert NoTokenIds();
   292	        if (excluded[voter]) revert ExcludedVoter(voter);
   293	
   294	        Tally storage t = _tallies[proposalId];
   295	        uint256 deadline = t.deadline;
   296	        if (deadline == 0) {
   297	            uint8 st = nounsDAO.state(proposalId);
   298	            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
   299	            deadline = voteDeadline(proposalId);
   300	            t.deadline = uint48(deadline);
   301	        }
   302	        if (block.number >= deadline) revert VotingClosed();
   303	
   304	        VoterRec storage rec = voterRec[proposalId][voter];
   305	        bool supplement = rec.exists && timestamp == rec.timestamp && digest == rec.digest; // 同一署名の再提出 = token の補完(先回り 1 枚投函への対策)
   306	        if (rec.exists && !supplement && timestamp <= rec.timestamp) revert StaleVote(); // やり直しは新しい署名のみ
   307	
   308	        uint256 counted = _countTokens(proposalId, voter, tokenIds);
   309	
   310	        if (!rec.exists) {
   311	            if (counted == 0) revert NothingCounted();
   312	            _addTally(t, support, uint32(counted), 1);
   313	            voterRec[proposalId][voter] = VoterRec(true, support, uint32(counted), timestamp, digest);
   314	            emit SnapVoteCounted(proposalId, voter, support, uint32(counted), timestamp, false);
   315	            return uint32(counted);
   316	        } else if (supplement) {
   317	            // 同じ署名で未計上の token だけ追加(support は変わらず、投票者数も増やさない)
   318	            if (counted == 0) revert NothingCounted();
   319	            _addTally(t, rec.support, uint32(counted), 0);
   320	            rec.counted += uint32(counted);
   321	            emit SnapVoteCounted(proposalId, voter, rec.support, rec.counted, timestamp, false);
   322	            return uint32(counted);
   323	        } else {
   324	            // やり直し: 既存の counted を新しい support へ移し、新たに数えられた token があれば加算
   325	            _subTally(t, rec.support, rec.counted, 1);
   326	            uint32 newCounted = rec.counted + uint32(counted);
   327	            _addTally(t, support, newCounted, 1);
   328	            rec.support = support; rec.counted = newCounted; rec.timestamp = timestamp; rec.digest = digest;
   329	            emit SnapVoteCounted(proposalId, voter, support, newCounted, timestamp, true);
   330	            return uint32(counted);
   331	        }
   332	    }
   333	
   334	    /// @dev voter が所有する未カウントの tokenId をビットマップに立てて数える
   335	    function _countTokens(uint256 proposalId, address voter, uint256[] calldata tokenIds) internal returns (uint256 counted) {
   135	<div class="card ok" style="margin-top:8px"><b>変わらないこと</b>: メンバーの投票体験。今までどおり Snapshot で、署名だけ・ガス代 0 円で投票します(ETH を持っていないウォレットでも投票できます)。</div>
   136	
   137	<h2 id="keys"><span class="no">2.</span>誰が何を持つか — 権限と鍵</h2>
   138	<div class="cmp">
   139	  <div class="col now"><h3>いまの仕組み</h3><div class="body"><ul>
   140	    <li><b>Nouns の投票権</b> … マルチシグ → <b>アールグレイ個人のウォレット</b>に委任</li>
   141	    <li><b>投票の判断</b> … 人が Snapshot の結果を読んで手で実行</li>
   142	    <li>Snapshot の結果と Nouns への投票の一致は、<b>人が正しくやったと信じるしかない</b></li>
   143	    <li>アールグレイが不在・多忙だと止まる</li>
   144	  </ul></div></div>
   145	  <div class="col new"><h3>新しい仕組み</h3><div class="body"><ul>
   146	    <li><b>Nouns の投票権</b> … マルチシグ → <b>コントラクト</b>に委任(個人は持たない)</li>
   147	    <li><b>投票の判断</b> … コントラクトが署名を検証して自動集計。<b>運営もクラウドも受理済みの票や集計値を書き換えられない</b></li>
   148	    <li><b>集計の内訳が Nouns DAO の記録に残る</b>(<a href="#record">§5</a>)。誰でも検算できる</li>
   149	    <li>クラウドが止まっても投票は無効にならない。<b>運営以外の第三者でも代わりに反映・実行できる</b>(ウォレット操作などの技術的スキルは必要 — <a href="#outage">§6</a>)</li>
   150	  </ul></div></div>
   151	</div>
   152	
   153	<h3>この仕組みを動かす 4 つの鍵 — 誰が何をでき、何をできないか</h3>
   154	<p>自動化にはチェーンや Snapshot へ送信するための鍵(ウォレット)が要ります。大事なのは<b>1 本の万能な鍵を作らないこと</b>です。役割ごとに独立した鍵に分け、それぞれに「できること」を最小限だけ持たせます。この分担はテストネット上で実際に構成して動作確認済みです。</p>
   155	<div class="keycard"><div class="keyhead"><b>リレイヤー</b><span class="pill cloud">Cloudflare</span><span class="freq">出番: 本番は 2 分ごと</span></div>
   156	<div class="kv"><span class="k can">できること</span>Snapshot の署名をチェーンに運ぶ</div>
   157	<div class="kv"><span class="k cant">できないこと</span>票の偽造・改変・投票結果の指定(コントラクト上の専用権限は持たない)</div>
   158	</div>
   159	<div class="keycard"><div class="keyhead"><b>登録係</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
   160	<div class="kv"><span class="k can">できること</span>「この Snapshot 投票は Nouns の第 N 号議案のもの」と登録する(<b>自動処理</b>。提案作成と同じプログラムが続けて行うので、人が ID を書き写す場面はありません)</div>
   161	<div class="kv" style="color:var(--ink-2);font-size:13px">この「どの Snapshot 投票が、どの Nouns 議案に対応するか」を記録した一覧を、本資料では<b>対応表</b>と呼びます。コントラクトの中(オンチェーン)に保存され、誰でも見られます。コントラクトはこの対応表を引いて「届いた票をどの議案に数えるか」を決めます。</div>
   162	<div class="kv"><span class="k cant">できないこと</span>票に関する一切の操作</div>
   163	<div class="kv" style="color:var(--ink-2);font-size:13px">登録は<b>提案の作成と同じ処理(GitHub 上の自動処理)がそのまま続けて行います</b>。作った本人が提案 ID を知っているので、後から「どれがどれか」を探す曖昧さがありません。登録の直前に、作成した提案を Snapshot から読み戻して内容が一致するかを確認します(取り違え防止)。</div>
   164	</div>
   165	<div class="keycard"><div class="keyhead"><b>Snapshot bot</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
   166	<div class="kv"><span class="k can">できること</span>Snapshot に投票ページを作る(現行から引き続き。pNouns 1 枚保有)</div>
   167	<div class="kv"><span class="k cant">できないこと</span>オンチェーンの一切の操作</div>
   168	</div>
   169	<div class="keycard"><div class="keyhead"><b>管理者</b><span class="pill human">当初: 委任アドレス → 移管後: pNouns マルチシグ <b>(提案)</b></span><span class="freq">出番: ほぼなし</span></div>
   170	<div class="kv"><span class="k can">できること</span>Nouns DAO への自動投票の停止、ガス代の回収、除外設定、締切余裕・登録猶予・返金設定の変更、対応表の登録・未受理時の取消、登録係の交代、管理者権限の移管・放棄</div>
   171	<div class="kv"><span class="k cant">できないこと</span>票の作成・改変、Nouns への任意の投票</div>
   172	<div class="kv" style="color:var(--ink-2);font-size:13px">「委任アドレス」= いま Nouns の投票権を委任されている、アールグレイ管理の運用ウォレットのことです(上の「いまの仕組み」参照)。</div>
   173	</div>
   174	<div class="card accent" style="font-size:14px"><b>コントラクトのコントロールは誰が持つのか</b>: コントラクトの設定変更・停止・資金回収ができるのは<b>管理者ただ 1 人</b>です(当初はアールグレイの委任アドレス、安定稼働後は pNouns マルチシグ)。リレイヤー・登録係・Snapshot bot にコントラクトの設定を変える権限はありません。そして日常の投票処理(検証・集計・Nouns への投票)は<b>誰のコントロールも受けず、書き込まれたコードのとおり自動で動きます</b> — 管理者にも、進行中の集計へ介入する手段はありません(§3)。</div>
   175	<h3>鍵が盗まれたら何が起きるか — 「いちばん漏れやすい場所に、いちばん弱い権限」</h3>
   176	<p style="font-size:14px">最も漏えいリスクが高いのは、ネットに常時つながっているクラウドです。そこで、クラウドに置くリレイヤーの鍵にはコントラクト上の特別な権限を持たせていません。<b>仮にリレイヤーの鍵が盗まれた場合の主な被害は次のとおりです。</b></p>
   177	<ul style="font-size:14px">
   178	  <li><b>自動投函を妨害・遅延させる</b>(対策は §3 — 誰でも代わりに運べ、締切時の照合で検出されます)</li>
   179	  <li><b>リレイヤー用ウォレットの残高を盗む</b>(本番想定は 0.01 ETH。返金プールやトレジャリーを直接引き出す権限はありません)</li>
   180	</ul>
   181	<p style="font-size:14px;margin-bottom:6px">逆に、<b>できないこと</b>:</p>
   182	<ul style="font-size:14px">
   183	  <li><b>票の偽造・改変・勝手な投票</b> — §3 のとおり、署名の数学的性質により成立しません。</li>
   184	  <li><b>ガス払い戻しでプールを吸い出すこと</b> — 理由は 3 つあります。
   185	    <ul>
   186	      <li>払い戻しは「本物の署名を実際に反映できた仕事」にしか出ません。同じ票の再提出は失敗し、失敗には 1 円も出ません。</li>
   187	      <li>使った以上の額は戻りません(攻撃者の利益はゼロ)。さらに提案ごとの累計上限 0.02 ETH と、管理者の無効化スイッチで頭打ちです。</li>
   188	      <li>そもそも票をチェーンに送る操作(投函)は誰でも実行できる設計なので、鍵が漏れても「払い戻しを受けられる」能力は何も増えません。</li>
   189	    </ul>
   190	  </li>
   191	</ul>
   192	<p style="font-size:14px">つまりコントラクト上の票を偽造・改変する権限は増えませんが、<b>自動処理の停止と、リレイヤー残高(本番想定 0.01 ETH)の損失</b>は起こり得ます。対処は鍵の差し替えと残高の補充です。加えて本番では、4 つの役割に同一アドレスが混ざっていないかを導入時のチェックで照合し、Worker 自身も owner・登録係・リレイヤーの重複を検出すると停止します。</p>
   193	
   194	<h3>置き場所を分ける理由 — 特に bot と登録係</h3>
   195	<ul style="font-size:14px">
   196	  <li><b>投票を「運ぶ人」(Cloudflare)と「作る+登録する人」(GitHub)を分けます。</b>Cloudflare が盗まれても対応表の登録はできず、GitHub が盗まれても票を運ぶ鍵は別にあります。bot と登録係を一体にしているのは、作成と登録を同じ処理にすると「どの Snapshot 提案がどの議案か」を探す曖昧さがなくなり、取り違えや乗っ取りの経路が減るためです。</li>
   197	  <li>「偽の投票ページを作って登録する」攻撃には GitHub 側の鍵が必要で、票を勝手に投函するには Cloudflare 側の鍵が必要 — <b>攻撃者は独立した 2 箇所を同時に破る</b>必要があります。</li>
   198	  <li>管理者権限の移管(委任アドレス → マルチシグ)は 1 トランザクションで完了し、テストネットで移管の往復を演習済みです。</li>
   199	</ul>
   200	
   201	<h3>ガス代(ETH)をどこに入れておくか — 配分の全体像</h3>
   202	<div class="tbl"><table>
   203	<tr><th>入れる先</th><th>額(本番想定)</th><th>役割・減り方</th></tr>
   204	<tr><td><b>コントラクト自体(返金プール)</b></td><td>0.05 ETH</td><td>投函ガスの払い戻しの原資。<b>払い戻しはコントラクトが自分の残高から、投函と同じトランザクションの中で送金します</b>(人手を介しません)</td></tr>
   205	<tr><td>リレイヤー</td><td>0.01 ETH</td><td>投函のたびに立て替えるが、同じ処理の中で<b>コントラクト(プール)から</b>払い戻されるため<b>ほぼ減らない</b>(回転資金)</td></tr>
   206	<tr><td>登録係</td><td>0.005 ETH</td><td>登録には払い戻しがなく自分の残高を消費。ただし 1 回 約 1 円 × 年 50〜110 回なので<b>数年もつ</b></td></tr>
   207	<tr><td>Snapshot bot</td><td>—</td><td>署名だけでガス不要</td></tr>
   208	<tr><td>管理者(当初の委任アドレス)</td><td>約 0.046 ETH(3 箇所への配分後の残額)</td><td>見学モードの開始・本番化・権限移管などの管理操作に使用。マルチシグへ移管した後は、<b>マルチシグが自分のウォレットにある ETH でガスを払う</b>ため、こちらから新たに送金しておく必要はありません</td></tr>
   209	</table></div>
   210	<ul style="font-size:14px">
   211	  <li>登録係に払い戻しを付けないのは意図的です。払い戻しの対象を「誰でも実行できる救済操作」に限ることで、万一登録係の鍵が漏れても、登録の繰り返しでプールを吸い出す抜け道を作らないためです。</li>
   212	  <li>リレイヤー・登録係・プールの残高はいずれも自動プログラムが監視し、少なくなると Discord に⚠️警告を出します。</li>
   213	</ul>
   214	
   215	<div class="card warn" style="font-size:14px"><b>正直な注記 — 鍵の分離の「テスト段階(現在)」と「本番」</b>
   216	<div class="tbl"><table>
   217	<tr><th></th><th>テスト段階(現在)</th><th>本番(移行時に実施)</th></tr>
   218	<tr><td>アドレス(権限)の分離</td><td>管理者・登録係・リレイヤーの 3 者は別アドレスで検証済み。テストで Snapshot に提案を作る bot だけは専用鍵を作っておらず、<b>テストの管理者が使っている開発鍵(Sepolia 専用・実資産なし)を共用</b></td><td><b>4 つすべてを新しい鍵として作り直し、完全に分離</b></td></tr>
   219	<tr><td>保管場所の分離</td><td>リレイヤーは Cloudflare。bot と登録係は GitHub の自動処理(作成と登録を一体で実行)</td><td><b>運ぶ人=Cloudflare、作る+登録する人=GitHub</b>に分離(registrar の鍵は Cloudflare に置かない)</td></tr>
   220	</table></div>
   221	<p style="margin:4px 0 0">本番の鍵の作り直しと配置は手順書に組み込み済みで、導入時の機械チェックでも照合します。</p></div>
   222	
   223	<h2 id="proof"><span class="no">3.</span>「集計が正しい」と言える理由</h2>
   224	<p>いちばん大事な前提: <b>コントラクトは「集計結果」を受け取りません</b>。受け取るのは<b>1 票ずつの署名データ</b>で、正しさを自分で確かめ、集計も自分で行います。「誰かが計算した結果を信じる」場面がそもそも存在しません。</p>
   225	
   226	<h4 class="sub">そもそもコントラクトは Snapshot を読めないのに、どう検証するのか</h4>
   227	<p style="margin-top:10px"><b>コントラクトは外部のインターネットに一切アクセスできません</b>(あらゆるスマートコントラクト共通の制約)。Snapshot から署名データをダウンロードするのはリレイヤー(クラウドの自動プログラム)で、トランザクションの引数としてコントラクトに「手渡し」します。つまり運び屋です。</p>
   228	<p><b>「運び屋が渡すデータなど信用できるのか?」</b> — ここが設計の核心で、<b>信用しなくていい</b>ようにできています。メンバーが snapshot.box で「賛成」を押すと、ウォレットが「誰が・どの投票所の・どの提案に・どの選択肢を・いつ」という<b>構造化されたメッセージ全体に電子署名</b>を作ります(チェーンに書き込まないのでガス代 0 円)。この「メッセージ+署名」の組が Snapshot と IPFS に公開保存され、誰でもダウンロードできます。</p>
   229	<p>電子署名には次の性質があります: <b>署名とメッセージがあれば、「誰が署名したか」を純粋な計算だけで復元できる</b>(誰かに問い合わせる必要がない)。コントラクトは受け取ったデータから、①メッセージのハッシュ値を自分で計算し直し(このとき投票所名は焼き込み済みの pnounsdao.eth を使う)、②署名から署名者のアドレスを数学的に復元し、③申告された投票者と一致するか照合します。Ethereum 本体が全トランザクションの検証に使っているのと同じ仕組みです。</p>
   230	<p>リレイヤーが途中で「賛成」を「反対」に書き換えると、①のハッシュが変わり、②で復元されるアドレスが<b>まったく別の(実在すらしない)アドレス</b>になり、票は拒否されます。改ざんは「バレる」のではなく<b>数学的に成立しない</b>のです。偽の票をゼロから作るには本人の秘密鍵が必要で、それは本人のウォレットの外に出ません。</p>
   231	<p style="margin-bottom:4px"><b>たとえるなら</b>: Snapshot は「実印を押した投票はがきが貼り出される<b>公開掲示板</b>」、リレイヤーは「はがきを役所に運ぶだけの<b>配達員</b>」、コントラクトは「印影を自前で照合できる<b>役所</b>」です。役所は掲示板にも配達員にも「本物ですか?」と聞く必要がなく、はがきそのものを検査すれば真贋が分かります。配達員にできるのは配達をサボることだけで、それも掲示板が公開なので誰にでも露見します。</p>
   232	
   233	
   234	<h4 class="sub">1 票が通る 8 つの確認(実装そのまま)</h4>
   235	<div class="tbl"><table>
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 64b882c..727db0c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -75,7 +75,7 @@ export function referencesNounsProposal(text, nounsId) {
 }
 
 export async function resolveMappings(c, pc, activeNounsIds = []) {
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
   const meta = new Map(data.proposals.map((p) => [p.id, p]));
   const found = new Map(); // nounsId -> snapId
@@ -95,7 +95,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
     if (need.length) {
       // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
-      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
       const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
       for (const n of need) {
         const p = byHash.get(n.hash);
@@ -106,11 +106,12 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
   }
   const mappings = [...found.entries()].map(([nounsId, snapId]) => {
     const m = meta.get(snapId) || {};
-    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
-    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
-    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
-    // 侵害)は検出できない。過信しないこと。
-    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
+    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
+    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
+    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
+    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
+    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
+    const linkOk = referencesNounsProposal(m.discussion, nounsId);
     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   });
   return { mappings, unresolved };
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 64b882c..727db0c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -75,7 +75,7 @@ export function referencesNounsProposal(text, nounsId) {
 }
 
 export async function resolveMappings(c, pc, activeNounsIds = []) {
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
   const meta = new Map(data.proposals.map((p) => [p.id, p]));
   const found = new Map(); // nounsId -> snapId
@@ -95,7 +95,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
     if (need.length) {
       // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
-      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
       const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
       for (const n of need) {
         const p = byHash.get(n.hash);
@@ -106,11 +106,12 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
   }
   const mappings = [...found.entries()].map(([nounsId, snapId]) => {
     const m = meta.get(snapId) || {};
-    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
-    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
-    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
-    // 侵害)は検出できない。過信しないこと。
-    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
+    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
+    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
+    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
+    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
+    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
+    const linkOk = referencesNounsProposal(m.discussion, nounsId);
     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   });
   return { mappings, unresolved };
diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
index d1d4568..fb0a9d7 100644
--- a/relayer-cf/src/chain.js
+++ b/relayer-cf/src/chain.js
@@ -29,7 +29,6 @@ export function cfg(env) {
     for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
     if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
   }
-  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
   return {
     network: env.NETWORK || "sepolia",
     chain,
@@ -57,9 +56,6 @@ export function cfg(env) {
     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
     relayerKey: env.RELAYER_PRIVATE_KEY || null,
-    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
-    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
-    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
     lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
   };
 }
@@ -93,9 +89,7 @@ export function clients(c) {
   const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
   const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
   const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
-  const registrarAccount = c.registrarKey ? privateKeyToAccount(c.registrarKey) : null;
-  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
-  return { publicClient, walletClient, account, registrarClient };
+  return { publicClient, walletClient, account };
 }
 export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
 
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 2f7af49..727db0c 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -75,9 +75,7 @@ export function referencesNounsProposal(text, nounsId) {
 }
 
 export async function resolveMappings(c, pc, activeNounsIds = []) {
-  // 正規 bot が設定されていれば author で絞る(攻撃者の巨大 discussion 提案を候補から排除 = 64KiB DoS 対策・第19回監査)
-  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
-  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
   const meta = new Map(data.proposals.map((p) => [p.id, p]));
   const found = new Map(); // nounsId -> snapId
@@ -97,7 +95,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
     if (need.length) {
       // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
-      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
+      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
       const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
       for (const n of need) {
         const p = byHash.get(n.hash);
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index 06f5f75..63854f8 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -4,7 +4,6 @@ import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI,
 import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey, snapshotVoterCount } from "./snap.js";
 import { keccak256, stringToBytes } from "viem";
 import { makeStore } from "./store.js";
-import { autoRegister } from "./register.js";
 
 async function notify(c, text) {
   console.log("[notify]", text.replace(/\n/g, " ⏎ "));
@@ -439,7 +438,7 @@ export function __resetWorkerStateForTests(o = {}) {
 const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
 export async function tick(env) {
   const c = cfg(env);
-  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
+  const { publicClient: pc, walletClient: wc } = _clients(c);
   const store = makeStore(env.STATE, storeNs(c));
   try {
     try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
@@ -460,11 +459,6 @@ export async function tick(env) {
           { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
           { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
         ], allowFailure: false });
-        // 第18回監査: 自動登録が有効なら、設定された鍵がオンチェーンの registrar と一致することを確認(fail-closed)
-        if (c.autoRegister) {
-          const rcAddr = rc?.account?.address;
-          if (!rcAddr || String(rcAddr).toLowerCase() !== String(registrarAddr).toLowerCase()) { await notifyError(c, "config", new Error(`REGISTRAR_PRIVATE_KEY のアドレス(${rcAddr}) がオンチェーンの registrar(${registrarAddr}) と一致しません`)); return; }
-        }
         // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
         // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
         if (c.network === "mainnet") {
@@ -496,10 +490,6 @@ export async function tick(env) {
       if (p.state !== 0 && p.state !== 1) continue;
       try {
         const snapInfo = snapByNouns.get(p.id) || null;
-        // 登録係の Cloudflare 実装: 未登録の提案について、内容一致を検証したうえで対応表を自動登録
-        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
-          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
-        }
         // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
         // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
         // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
diff --git a/relayer-cf/wrangler.toml b/relayer-cf/wrangler.toml
index ff87175..5bae960 100644
--- a/relayer-cf/wrangler.toml
+++ b/relayer-cf/wrangler.toml
@@ -18,8 +18,6 @@ id = "4c2f1c683fe94191b456e0c1fc70cc2f"
 NETWORK = "sepolia"
 VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
 SNAPSHOT_SPACE = "earl-grey.eth"
-AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
-SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
 PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
 NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
 NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"

codex
テストは成功しました（`4/4` のテストファイル、失敗 0）。ただし commit メッセージの「46 pass」と表示形式が異なるため、実際の `test()` ケース数も数えて整合を確認します。設計面では、コントラクトの投函関数が「誰でも呼べる」ため、資料 §2 の「偽ページ登録と投函には GitHub と Cloudflare の両方を破る必要がある」は成立しません。この点は鍵分離評価に直結します。
exec
/bin/bash -lc "node --version
rg -n '"'^test'"\\(' test/*.mjs | wc -l
for f in test/*.mjs; do printf '%s ' \""'$f"; rg -c '"'"'^test'"\\(' \""'$f"; done
node --test --test-reporter=tap test/*.mjs' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 793ms:
# Subtest: test/accept-deadline.test.mjs
ok 1 - test/accept-deadline.test.mjs
  ---
  duration_ms: 781.591879
  type: 'test'
  ...
# Subtest: test/cursor.test.mjs
ok 2 - test/cursor.test.mjs
  ---
  duration_ms: 766.850214
  type: 'test'
  ...
# Subtest: test/link-check.test.mjs
ok 3 - test/link-check.test.mjs
  ---
  duration_ms: 751.065977
  type: 'test'
  ...
# Subtest: test/worker-tick.test.mjs
ok 4 - test/worker-tick.test.mjs
  ---
  duration_ms: 764.165045
  type: 'test'
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 785.694756

exec
/bin/bash -lc "rg -n -S '登録係|registerProposal|create-and-register|Cloudflare|GitHub Actions|自動登録|探索' README.md docs/RUNBOOK-MAINNET.md docs/member-proposal-unified.html scripts/mainnet scripts/sepolia -g '"'!docs/audit*'"' | sed -n '1,260p'
nl -ba relayer-cf/src/chain.js | sed -n '20,110p'
nl -ba relayer-cf/src/snap.js | sed -n '65,130p'
nl -ba relayer-cf/src/worker.js | sed -n '438,535p'
nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '360,430p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
docs/RUNBOOK-MAINNET.md:17:| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
docs/RUNBOOK-MAINNET.md:18:| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
docs/RUNBOOK-MAINNET.md:20:**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
docs/RUNBOOK-MAINNET.md:61:## 4. Worker (Cloudflare) 設定
docs/RUNBOOK-MAINNET.md:105:4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
docs/RUNBOOK-MAINNET.md:107:6. 誤登録が原因なら、票が入る前に `unregisterProposal`
docs/RUNBOOK-MAINNET.md:116:  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
docs/RUNBOOK-MAINNET.md:132:- **登録前の読み戻し検算**: create-and-register は Snapshot 提案をハブから再取得し、
docs/RUNBOOK-MAINNET.md:133:  space・本文 URL・choices の一致を確認してから registerProposal を呼ぶ(実装済み)。
docs/RUNBOOK-MAINNET.md:138:リポジトリ公開後、Worker のデプロイは GitHub Actions 経由(`wrangler deploy` を CI で実行)に
docs/RUNBOOK-MAINNET.md:139:切り替える。これにより「どのコミットをいつ Cloudflare に配備したか」の公開実行ログが残り、
docs/RUNBOOK-MAINNET.md:146:提案 ID をそのまま登録する**方式に一本化する(scripts/create-and-register.mjs)。
docs/RUNBOOK-MAINNET.md:147:Cloudflare の Worker からハブを探索して登録する方式は、探索の曖昧さ(複数候補・範囲外・
docs/RUNBOOK-MAINNET.md:150:- 実行場所: GitHub Actions(bot の作成ジョブに続けて登録まで行う)。自宅 PC 非依存。
docs/RUNBOOK-MAINNET.md:151:- registrar の鍵は GitHub の secret に置き、Cloudflare には置かない
docs/RUNBOOK-MAINNET.md:152:  (運ぶ人=Cloudflare、作る+登録する人=GitHub の分離)。
docs/RUNBOOK-MAINNET.md:153:- create-and-register は送信前に鍵・権限・未登録を確認し、作成後・登録前に
docs/RUNBOOK-MAINNET.md:155:- Cloudflare の Worker は登録には関与せず、対応表を読んで照合・投函・execute のみ行う。
README.md:85:## Cloudflare Workers 版リレイヤー(`relayer-cf/`、2026-08-18 デプロイ・クラウドのみで通し成功)
README.md:91:- 実績: Prop 505 = 📢 告知 → 3 票投函 → execute → Nouns DAO に賛成 2 票、すべて Cloudflare 上の cron で実行(ローカルは停止状態)
README.md:96:第 1 回 High 3 / Medium 8、第 2 回 High 1 / Medium 5 / Low 4、第 3 回 High 2 / Medium 1 / Low 1、第 4 回 Medium 3 / Low 1、第 5 回 Medium 1 / Low 1、第 6 回 Medium 1(M-14R: 受付容量 + rush 複数バッチ)→ すべて対応済み。Cloudflare 無料枠(KV 書込み・list 1,000/日、サブリクエスト 50/呼び出し)を意識した設計(list はワーカーの dirty 提案のみ、公開 API は get のみ、Cache API)。運用は**無料枠で開始し、KV エラー時の Discord ⚠️ 警告と Cloudflare の KV Metrics を見て必要なら Workers Paid($5/月)へ**(プラン変更は再デプロイ不要・無停止)。注: 1 呼び出しあたり KV 1,000 操作の上限は Paid でも同じなので、設計側で list を metadata のみ・get を投函対象のみに抑えている。詳細は `docs/AUDIT-BRIEF.md`(依頼)と `docs/AUDIT-RESPONSE-2026-08-18.md`(対応)。
docs/member-proposal-unified.html:89:<span><span class="pill cloud">クラウド</span> ネット上のサービス(Snapshot / Cloudflare / GitHub / Discord)</span>
docs/member-proposal-unified.html:120:    <li><span class="tag a">自動</span><span class="pill cloud">クラウド</span> Nouns の新提案を検知(Cloudflare 上・自宅 PC 不要)</li>
docs/member-proposal-unified.html:155:<div class="keycard"><div class="keyhead"><b>リレイヤー</b><span class="pill cloud">Cloudflare</span><span class="freq">出番: 本番は 2 分ごと</span></div>
docs/member-proposal-unified.html:159:<div class="keycard"><div class="keyhead"><b>登録係</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
docs/member-proposal-unified.html:170:<div class="kv"><span class="k can">できること</span>Nouns DAO への自動投票の停止、ガス代の回収、除外設定、締切余裕・登録猶予・返金設定の変更、対応表の登録・未受理時の取消、登録係の交代、管理者権限の移管・放棄</div>
docs/member-proposal-unified.html:174:<div class="card accent" style="font-size:14px"><b>コントラクトのコントロールは誰が持つのか</b>: コントラクトの設定変更・停止・資金回収ができるのは<b>管理者ただ 1 人</b>です(当初はアールグレイの委任アドレス、安定稼働後は pNouns マルチシグ)。リレイヤー・登録係・Snapshot bot にコントラクトの設定を変える権限はありません。そして日常の投票処理(検証・集計・Nouns への投票)は<b>誰のコントロールも受けず、書き込まれたコードのとおり自動で動きます</b> — 管理者にも、進行中の集計へ介入する手段はありません(§3)。</div>
docs/member-proposal-unified.html:192:<p style="font-size:14px">つまりコントラクト上の票を偽造・改変する権限は増えませんが、<b>自動処理の停止と、リレイヤー残高(本番想定 0.01 ETH)の損失</b>は起こり得ます。対処は鍵の差し替えと残高の補充です。加えて本番では、4 つの役割に同一アドレスが混ざっていないかを導入時のチェックで照合し、Worker 自身も owner・登録係・リレイヤーの重複を検出すると停止します。</p>
docs/member-proposal-unified.html:194:<h3>置き場所を分ける理由 — 特に bot と登録係</h3>
docs/member-proposal-unified.html:196:  <li><b>投票を「運ぶ人」(Cloudflare)と「作る+登録する人」(GitHub)を分けます。</b>Cloudflare が盗まれても対応表の登録はできず、GitHub が盗まれても票を運ぶ鍵は別にあります。bot と登録係を一体にしているのは、作成と登録を同じ処理にすると「どの Snapshot 提案がどの議案か」を探す曖昧さがなくなり、取り違えや乗っ取りの経路が減るためです。</li>
docs/member-proposal-unified.html:197:  <li>「偽の投票ページを作って登録する」攻撃には GitHub 側の鍵が必要で、票を勝手に投函するには Cloudflare 側の鍵が必要 — <b>攻撃者は独立した 2 箇所を同時に破る</b>必要があります。</li>
docs/member-proposal-unified.html:206:<tr><td>登録係</td><td>0.005 ETH</td><td>登録には払い戻しがなく自分の残高を消費。ただし 1 回 約 1 円 × 年 50〜110 回なので<b>数年もつ</b></td></tr>
docs/member-proposal-unified.html:211:  <li>登録係に払い戻しを付けないのは意図的です。払い戻しの対象を「誰でも実行できる救済操作」に限ることで、万一登録係の鍵が漏れても、登録の繰り返しでプールを吸い出す抜け道を作らないためです。</li>
docs/member-proposal-unified.html:212:  <li>リレイヤー・登録係・プールの残高はいずれも自動プログラムが監視し、少なくなると Discord に⚠️警告を出します。</li>
docs/member-proposal-unified.html:218:<tr><td>アドレス(権限)の分離</td><td>管理者・登録係・リレイヤーの 3 者は別アドレスで検証済み。テストで Snapshot に提案を作る bot だけは専用鍵を作っておらず、<b>テストの管理者が使っている開発鍵(Sepolia 専用・実資産なし)を共用</b></td><td><b>4 つすべてを新しい鍵として作り直し、完全に分離</b></td></tr>
docs/member-proposal-unified.html:219:<tr><td>保管場所の分離</td><td>リレイヤーは Cloudflare。bot と登録係は GitHub の自動処理(作成と登録を一体で実行)</td><td><b>運ぶ人=Cloudflare、作る+登録する人=GitHub</b>に分離(registrar の鍵は Cloudflare に置かない)</td></tr>
docs/member-proposal-unified.html:237:<tr><td>1</td><td>この投票はどの Nouns 議案のものか</td><td>署名に含まれる Snapshot 提案 ID から、事前に登録された対応表(§2 の登録係が提案ごとに登録する「この Snapshot 投票 = 第 N 号議案」の一覧)を引く。未登録なら受け付けない</td></tr>
docs/member-proposal-unified.html:288:  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
docs/member-proposal-unified.html:330:<h2 id="outage"><span class="no">6.</span>クラウド(Cloudflare)が止まったらどうなるか</h2>
docs/member-proposal-unified.html:331:<p>票そのものは Snapshot に残るため、Cloudflare の停止だけで署名が消えるわけではありません。集計の締切は <b>Nouns の投票終了より 7,200 ブロック(約 24 時間)早く</b>設定し、その後の Nouns DAO への確定操作に余裕を持たせます。ただし、<b>Snapshot の票をコントラクトへ反映できるのはこの集計締切まで</b>です。締切後に未反映票が見つかった場合、自動確定は停止しますが、その票を遅れて追加することはできません。</p>
docs/member-proposal-unified.html:335:<tr><td>リレイヤーの不具合、またはリレイヤーのウォレットの<b>ガス代(ETH)切れ</b><br>(Snapshot での投票は通常どおり可能)</td><td>リレイヤー・返金プール・登録係の残高低下は Discord に⚠️警告が出ます。集計締切までに、公開された署名を使って第三者が代わりに投函することは可能ですが、現在の Snapshot モードの状況ページには、その投函を 1 ボタンで行う機能はありません</td><td>リレイヤーを復旧・補充。急ぐ場合の代理投函は開発者向けの操作</td></tr>
docs/member-proposal-unified.html:336:<tr><td>Cloudflare が止まったまま集計締切を迎えた</td><td>全票が反映済みなら、状況ページや Etherscan から誰でも <code>execute</code> できます。未反映票が残る場合、Worker は自動確定を止めます。<code>execute</code> は未反映票を追加せず、その時点の部分集計を確定する操作なので、実行前に人の確認が必要です</td><td><b>技術的な操作と判断が必要</b>: 反映状況を確認し、必要なら従来の手動運用へ切り替える</td></tr>
docs/member-proposal-unified.html:341:<h3>Cloudflare の中身は検証できるのか(正直な答え)</h3>
docs/member-proposal-unified.html:342:<p style="font-size:14.5px"><b>直接は検証できません。</b>Cloudflare 上で実際に動いているプログラムが、公開しているソースコードと同一であることを第三者が証明する方法はありません(これは世の中のあらゆるサーバーに共通の限界です)。<b>だからこそ、この設計はクラウドを信頼しないことを前提にしています</b>: クラウドは署名の投函、誰でも呼べる確定操作、通知を自動実行しますが、票の中身はオンチェーンのコントラクト(こちらは<b>ソースコードとの一致を誰でも検証可能</b>)が確かめます。クラウドの動きも外から観測はできます — 送信したトランザクションは全部チェーン上に残り、設定は公開 API(<a href="#verify">§10</a>)で見えます。<b>「中身は見えないが、票の偽造・改変はコントラクトが拒否し、運び漏れは公開データとの照合で検出する」</b>という位置づけです。</p>
docs/member-proposal-unified.html:351:<tr><td>サーバー費用</td><td>0 円(自宅 PC)</td><td>0 円(Cloudflare 無料枠)</td></tr>
docs/member-proposal-unified.html:356:<p><b>ガス代の置き場所</b>: 投函ガスの返金原資については、<b>新しいコントラクト(pNouns Voter)自体がプールです</b>。コントラクトのアドレスに送った ETH がそのまま返金の原資になります。<b>原資の方針(提案)</b>: アールグレイが管理する現行の委任アドレスにガス代として <b>0.111 ETH</b> があるため、プール 0.05 ETH、リレイヤー 0.01 ETH、登録係 0.005 ETH の<b>計 0.065 ETH をここから配分</b>します(新たなトレジャリー支出は発生しません)。プールに預けた ETH は<b>管理者がいつでも全額回収できます</b>(詳細は下の「ガス代はどこから出て、誰の負担になるのか」)。</p>
docs/member-proposal-unified.html:363:<p style="margin-top:10px">新しく増える費用は「投票をチェーンに記録するガス」と「議案の対応付けのガス」の 2 つです。前者は<b>pNouns Voter に預け入れる 0.05 ETH(約 1.5 万円)の返金プール</b>から投函者へ払い戻します。後者は返金対象ではなく、<b>登録係に持たせる 0.005 ETH</b>から支払います。また、リレイヤーには立て替え用として 0.01 ETH を持たせます。当初の合計配分 0.065 ETH は、委任アドレスにある 0.111 ETH から充てます(提案)。</p>
docs/member-proposal-unified.html:387:    <li><b>本番相当の鍵の分離を実施済み</b>: 管理者・登録係・リレイヤーを別々の鍵にした構成でテストネット稼働中。管理者権限の移管(マルチシグへの引き継ぎ相当)の往復も演習済み。</li>
docs/member-proposal-unified.html:423:  <li><b>見学モードで設置</b> — Nouns には投票せず、集計だけを実際の提案で数回行い、手動運用の結果と一致するか確認します。<b>この間も現行の手動運用は継続する</b>ため、メンバーの投票の流れと Nouns への反映は今までどおりです(裏で自動集計が並走し、一致を Discord で報告します)。この段階で委任アドレスから、返金プールへ 0.05 ETH、リレイヤーへ 0.01 ETH、登録係へ 0.005 ETH を配分します。<b>この時点のコントラクト管理者はアールグレイの委任アドレス</b>です。</li>
docs/member-proposal-unified.html:433:  <li><b>4 つの鍵の準備</b>: 管理者(当初はアールグレイの委任アドレス → 安定稼働後にマルチシグへ移管)・登録係・リレイヤー・Snapshot bot を別々に用意(テストネットでは構成済み)。</li>
docs/member-proposal-unified.html:434:  <li><b>ガス代の配分</b>: 委任アドレスのガス代 0.111 ETH から、0.05 ETH をコントラクト、0.01 ETH をリレイヤー、0.005 ETH を登録係へ(見学モード開始時、計 0.065 ETH)。</li>
docs/member-proposal-unified.html:449:<tr><td>登録係(独立鍵)</td><td><code>0xfE07E953BfdBbDA576551e047Bb9166C34d7c9ae</code></td></tr>
docs/member-proposal-unified.html:450:<tr><td>リレイヤー(独立鍵・Cloudflare)</td><td><code>0xBbE0b0fe2181586a947cF8660D7704926A9eD561</code></td></tr>
docs/member-proposal-unified.html:481:  → ソースの registerProposal() で eligibleAtBlock = block.number + registrationDelayBlocks、
docs/member-proposal-unified.html:482:    unregisterProposal() は snapshotVotesAccepted != 0 なら revert、
docs/member-proposal-unified.html:491:    (registerProposal / unregisterProposal は owner も呼べるが、猶予と取消不能条件は §3 のとおり)
docs/member-proposal-unified.html:512:- Cloudflare 上で動くプログラム(リレイヤー)の実行コードは外部から証明できません。
docs/member-proposal-unified.html:527:<tr><td>GitHub 上の提案作成ジョブ(Snapshot bot・登録係)</td><td>リポジトリ公開後は<b>コードも実行ログも公開</b>(鍵そのものは GitHub の secret 機能で非公開)</td><td>いつ・どのコード(コミット)で提案作成と登録が実行されたかの記録。実行ログが残って誰でも見られる点で、Cloudflare より検証性が一段高い</td></tr>
docs/member-proposal-unified.html:528:<tr><td>Cloudflare 上で実際に動くコード</td><td><b>非公開・証明不能</b>(あらゆるサーバー共通の限界)。緩和策として、デプロイを GitHub 経由にし「どのコードをいつ配備したか」の公開記録を残すことを予定</td><td>挙動の観測のみ(送信 tx・公開 API・通知)。<b>信頼しなくても票が守られる設計</b>で補います(§6)</td></tr>
scripts/sepolia/16-cf-registrar-e2e.js:1:// 登録係の Cloudflare 実装のライブ E2E:
scripts/sepolia/16-cf-registrar-e2e.js:5://  ④ Worker が自動登録(内容一致検証) → 猶予明けに投函 → 締切後に execute、を監視
scripts/sepolia/16-cf-registrar-e2e.js:50:  // ④ 監視: 自動登録 → 受理 → execute
scripts/sepolia/16-cf-registrar-e2e.js:57:    if (!registered && Number(mapped) === nounsId) { registered = true; line += ` ✅ 自動登録を確認 (eligibleAt=${await c.eligibleAtBlock(nounsId)})`; }
scripts/sepolia/15-reuse-snap.js:18:  await (await c.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/14-snap-setup-only.js:1:// Worker 主導 E2E の準備だけ行う: ①Snapshot 提案 ②voter A/B/C 投票 ③Sepolia Nouns 提案 ④registerProposal
scripts/sepolia/14-snap-setup-only.js:2:// 以降(署名取得→送信→execute→Discord 通知)は Cloudflare Worker が無人で行う
scripts/sepolia/14-snap-setup-only.js:18:    body: "Cloudflare Worker が無人で Nouns DAO に反映するテスト。",
scripts/sepolia/14-snap-setup-only.js:34:  await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
scripts/sepolia/13-snap-e2e.js:2:// 手順: ①Snapshot 提案作成(bot) ②voter A/B/C が snapshot.js で投票 ③Sepolia Nouns 提案作成 ④registerProposal
scripts/sepolia/13-snap-e2e.js:75:  await (await snapVoter.registerProposal(snapId, nounsId)).wait();
    20	export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
    21	
    22	export function cfg(env) {
    23	  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
    24	  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
    25	  if (env.NETWORK === "mainnet") {
    26	    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
    27	    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
    28	    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
    29	    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
    30	    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
    31	  }
    32	  return {
    33	    network: env.NETWORK || "sepolia",
    34	    chain,
    35	    chainId: chain.id,
    36	    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
    37	    metagov: getAddress(env.VOTER),
    38	    pnouns: getAddress(env.PNOUNS),
    39	    nounsDAO: getAddress(env.NOUNS_DAO),
    40	    nounsToken: getAddress(env.NOUNS_TOKEN),
    41	    explorer: env.EXPLORER,
    42	    blockscout: env.BLOCKSCOUT || null,
    43	    publicUrl: env.PUBLIC_URL || "",
    44	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
    45	    scanProposals: Number(env.SCAN_PROPOSALS || 30),
    46	    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
    47	    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
    48	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
    49	    announce: env.ANNOUNCE !== "0",
    50	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
    51	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
    52	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
    55	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
    56	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
    57	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
    58	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
    60	  };
    61	}
    62	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
    63	export function acceptMarginBlocks(c) {
    64	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
    65	}
    66	export function acceptDeadline(c, onchainDeadline) {
    67	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
    68	}
    69	// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
    70	export function shouldRushSubmit(c, block, onchainDeadline) {
    71	  return Number(block) >= acceptDeadline(c, onchainDeadline);
    72	}
    73	// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
    75	export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
    76	  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
    77	  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
    78	  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
    79	}
    80	// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
    81	//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
    82	export function submitCapacity(c, block, onchainDeadline) {
    83	  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
    84	  const ticks = Math.floor(secsLeft / c.cronSec);
    85	  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
    86	}
    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
    88	export function clients(c) {
    89	  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
    90	  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
    91	  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
    92	  return { publicClient, walletClient, account };
    93	}
    94	export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
    95	
    96	// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
    97	export function revertErrorName(e) {
    98	  let x = e;
    99	  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
   100	  return null;
   101	}
   102	
   103	// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
   104	let ownersCache = { at: 0, owners: [] };
   105	export async function allOwners(c, pc) {
   106	  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
   107	  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
   108	  const owners = [];
   109	  const CH = 500;
   110	  for (let start = 1; start <= total; start += CH) {
    65	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
    66	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
    67	    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
    68	    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
    69	    let u;
    70	    try { u = new URL(trimmed); } catch { continue; }
    71	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    72	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
    73	  }
    74	  return false;
    75	}
    76	
    77	export async function resolveMappings(c, pc, activeNounsIds = []) {
    78	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
    79	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
    80	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
    81	  const found = new Map(); // nounsId -> snapId
    82	  if (data.proposals.length) {
    83	    const res = await pc.multicall({
    84	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
    85	      allowFailure: false,
    86	    });
    87	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
    88	  }
    89	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
    90	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
    91	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
    92	  if (missing.length) {
    93	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    94	    const need = [];
    95	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    96	    if (need.length) {
    97	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
    98	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
    99	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
   100	      for (const n of need) {
   101	        const p = byHash.get(n.hash);
   102	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
   103	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
   104	      }
   105	    }
   106	  }
   107	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
   108	    const m = meta.get(snapId) || {};
   109	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
   110	    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
   111	    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
   112	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
   113	    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
   114	    const linkOk = referencesNounsProposal(m.discussion, nounsId);
   115	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   116	  });
   117	  return { mappings, unresolved };
   118	}
   119	
   120	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
   121	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
   122	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
   123	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
   124	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
   125	  const send = []; const skipped = [];
   126	  let advance = cursor; let blocked = false;
   127	  for (let i = 0; i < rows.length; i++) {
   128	    const r = rows[i]; const rec = recs[i];
   129	    const created = Number(r.created);
   130	    const tokens = tokenCounts[i] ?? 0;
   438	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
   439	export async function tick(env) {
   440	  const c = cfg(env);
   441	  const { publicClient: pc, walletClient: wc } = _clients(c);
   442	  const store = makeStore(env.STATE, storeNs(c));
   443	  try {
   444	    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
   445	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
   446	    const { block, proposals } = await recentProposals(c, pc);
   447	    await reconcileRecent(c, pc, wc, store, proposals);
   448	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
   449	    let snapByNouns = new Map();
   450	    let unresolvedIds = new Set();
   451	    let mappingsResolved = false;
   452	    if (c.snapshotSpace) {
   453	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
   454	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
   455	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
   456	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
   457	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
   458	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
   459	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
   460	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
   461	        ], allowFailure: false });
   462	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
   463	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
   464	        if (c.network === "mainnet") {
   465	          const relayerAddr = wc?.account?.address || null;
   466	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
   467	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
   468	        }
   469	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
   470	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
   471	        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
   472	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
   473	        spaceCheckedAt = Date.now();
   474	      }
   475	      try {
   476	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
   477	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
   478	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
   479	        unresolvedIds = new Set((unresolved || []).map(Number));
   480	        mappingsResolved = true;
   481	      }
   482	      catch (e) { await notifyError(c, "snapshot hub", e); }
   483	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
   484	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
   485	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
   486	      // 最終結果として確定してしまう。
   487	      if (!mappingsResolved) return;
   488	    }
   489	    for (const p of proposals) {
   490	      if (p.state !== 0 && p.state !== 1) continue;
   491	      try {
   492	        const snapInfo = snapByNouns.get(p.id) || null;
   493	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
   494	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
   495	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
   496	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
   497	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
   498	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
   499	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
   500	          }
   501	          continue;
   502	        }
   503	        const mg = await metagovInfo(c, pc, p.id);
   504	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
   505	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
   506	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
   507	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
   508	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
   509	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
   510	        }
   511	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
   512	        let timelineBad = false;
   513	        if (c.snapshotSpace && snapInfo) {
   514	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
   515	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
   516	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
   517	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
   518	          }
   519	        }
   520	        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
   521	        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
   522	        let graceBad = false;
   523	        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
   524	          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
   525	          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
   526	          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
   527	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
   528	            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
   529	          }
   530	        }
   531	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   532	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   533	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   534	        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
   535	          await announceNew(c, pc, store, p, block, snapInfo);
   360	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
   361	  // ハブは 3 名が投票、オンチェーン計上は 1 名、dead-letter なし → 2 名分が未反映
   362	  const h = handlers({ __block: 196, tally: () => [[0n, 0n, 0n], [1n, 0n, 0n], false, 0] });
   363	  // Snapshot は締切前に終了済み(過去の end)。未来だと timelineBad が先に止めてしまい防壁を検証できない
   364	  const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
   365	  {
   366	    const { kv, env } = setup(h, mainnetEnv, wallet);
   367	    F.hub = [pastProposal, { proposal: { votes: 3 } }];
   368	    await tick(env);
   369	    assert.ok(F.discordBodies.some((b) => b.includes("反映されていない票")), "警告が出る");
   370	    assert.equal(putsOf(kv, "executed").length, 0, "mainnet は部分集計を確定しない");
   371	  }
   372	  // sepolia は警告のみで続行(確定される)
   373	  {
   374	    const { kv, env } = setup(h, {}, wallet);
   375	    F.hub = [pastProposal, { proposal: { votes: 3 } }];
   376	    await tick(env);
   377	    assert.equal(putsOf(kv, "executed").length, 1, "テストネットは続行");
   378	  }
   379	  // 全票反映済み(hub 1 名 = 計上 1 名)なら mainnet でも確定する
   380	  {
   381	    const { kv, env } = setup(h, mainnetEnv, wallet);
   382	    F.hub = [pastProposal, { proposal: { votes: 1 } }];
   383	    await tick(env);
   384	    assert.equal(putsOf(kv, "executed").length, 1, "未反映ゼロなら mainnet も確定する");
   385	  }
   386	});
   387	
   388	test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
   389	  const writes = [];
   390	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   391	  const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   392	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
   393	  const { kv, env } = setup(submitHandlers({ eligibleAtBlock: () => 50n }), mainnetEnv, wallet); // 解禁済み
   394	  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false。
   395	  // 実票も用意する(ゲートが破れていれば votes クエリ→投函まで到達してしまう構成)
   396	  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] },
   397	           { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
   398	  F.envelope = goodEnvelope();
   399	  await tick(env);
   400	  assert.equal(F.hubCalls, 1, "votes クエリにすら到達しない(linkBad で停止)");
   401	  assert.equal(writes.length, 0, "投函 tx を送らない");
   402	  assert.equal(kv.ops.filter(([op, k]) => op === "put" && k.includes("snapsent")).length, 0, "送信中レコードも作らない");
   403	  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
   404	});
   405	
   406	

exec
/bin/bash -lc "cut -d= -f1 .env | sed '/"'^[[:space:]]*#/d;/''^[[:space:]]*$/d'"' | sort
nl -ba scripts/sepolia/16-cf-registrar-e2e.js | sed -n '1,110p'
git status --short
git ls-files relayer-cf/src/register.js .github workflows 2>/dev/null" in /mnt/data/pnouns-voter
 succeeded in 0ms:
DISCORD_WEBHOOK_URL
MAINNET_RPC_URL
REGISTRAR_MNEMONIC
SEPOLIA_MNEMONIC
SEPOLIA_RELAYER_KEY
SEPOLIA_RPC_URL
     1	// 登録係の Cloudflare 実装のライブ E2E:
     2	//  ① Sepolia Nouns DAO に提案を作成(この本文が Worker の検証基準)
     3	//  ② bot が新フォーマットで Snapshot に提案を作成(登録はしない)
     4	//  ③ テスト投票者が即座に Snapshot で投票
     5	//  ④ Worker が自動登録(内容一致検証) → 猶予明けに投函 → 締切後に execute、を監視
     6	const { ethers } = require("hardhat");
     7	const snapshot = require("@snapshot-labs/snapshot.js");
     8	const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
     9	const { buildProposal } = require("../lib/proposal-format.mjs");
    10	
    11	const SPACE = "earl-grey.eth";
    12	const SEQ = "https://seq.snapshot.org";
    13	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
    14	const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
    15	
    16	async function main() {
    17	  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
    18	  const dep = loadDeployments();
    19	
    20	  // 本文: 実物の Nouns 提案(989)の Markdown を使用
    21	  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"989") { description } }` }) })).json();
    22	  const D = r.data.proposal.description;
    23	  console.log(`本文: mainnet Prop 989 (${D.length.toLocaleString()} 文字)`);
    24	
    25	  // ① Sepolia Nouns 提案(オンチェーン本文 = D)
    26	  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
    27	  await (await dao.propose([deployer.address], [0], [""], ["0x"], D)).wait();
    28	  const nounsId = Number(await dao.proposalCount());
    29	  console.log(`① Nouns 提案 #${nounsId} を作成`);
    30	
    31	  // ② 新フォーマットで Snapshot 提案(登録しない — Worker に任せる)
    32	  const p = buildProposal({ nounsId, description: D });
    33	  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
    34	  const now = Math.floor(Date.now() / 1000);
    35	  const client = new snapshot.Client712(SEQ);
    36	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
    37	  const receipt = await client.proposal(adapt(bot), bot.address, {
    38	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    39	    choices: p.choices, start: now, end: now + 172800, snapshot: await mainnetProvider.getBlockNumber(),
    40	    plugins: "{}", app: "pnouns-voter",
    41	  });
    42	  console.log(`② Snapshot 提案: ${receipt.id} ${p.truncated ? "(切り詰めあり)" : "(全文)"}`);
    43	
    44	  // ③ 即座に投票(A=賛成2枚, B=反対1枚, C=棄権1枚 想定)
    45	  for (const [w, choice] of [[voterA, 1], [voterB, 2], [voterC, 3]]) {
    46	    try { await client.vote(adapt(w), w.address, { space: SPACE, proposal: receipt.id, type: "single-choice", choice, reason: "", app: "pnouns-voter" }); console.log(`③ ${w.address.slice(0, 10)} → choice ${choice}`); }
    47	    catch (e) { console.log(`③ ${w.address.slice(0, 10)} 投票失敗: ${e.error_description || e.message}`); }
    48	  }
    49	
    50	  // ④ 監視: 自動登録 → 受理 → execute
    51	  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
    52	  const h = ethers.keccak256(ethers.toUtf8Bytes(receipt.id));
    53	  let registered = false;
    54	  for (let i = 0; i < 40; i++) {
    55	    const [mapped, blk] = await Promise.all([c.snapToNouns(h), ethers.provider.getBlockNumber()]);
    56	    let line = `[${new Date().toISOString().slice(11, 19)}] block=${blk}`;
    57	    if (!registered && Number(mapped) === nounsId) { registered = true; line += ` ✅ 自動登録を確認 (eligibleAt=${await c.eligibleAtBlock(nounsId)})`; }
    58	    if (registered) {
    59	      const [t, acc] = await Promise.all([c.tally(nounsId), c.snapshotVotesAccepted(nounsId)]);
    60	      line += ` accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]} result=${t[3]}`;
    61	      console.log(line);
    62	      if (t[2]) { console.log("✅ E2E 完了(execute 済み)"); return; }
    63	    } else console.log(line + " (登録待ち)");
    64	    await sleep(20000);
    65	  }
    66	  console.log("⏱ タイムアウト — Worker のログ/Discord を確認してください");
    67	}
    68	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });

exec
/bin/bash -lc "nl -ba relayer-cf/src/snap.js | sed -n '1,65p'
nl -ba docs/member-proposal-unified.html | sed -n '280,295p'
nl -ba docs/member-proposal-unified.html | sed -n '518,532p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
     1	// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
     2	// 監査対応:
     3	//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
     4	//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
     5	//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
     6	//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
     8	import { METAGOV_ABI } from "./chain.js";
     9	import { keccak256, stringToBytes } from "viem";
    10	
    11	const FETCH_TIMEOUT_MS = 8000;
    12	const MAX_BODY = 64 * 1024;
    13	const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り
    14	
    15	async function fetchLimited(url, init) {
    16	  const ctrl = new AbortController();
    17	  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
    18	  try {
    19	    const r = await fetch(url, { ...init, signal: ctrl.signal });
    20	    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    21	    const reader = r.body?.getReader();
    22	    if (!reader) throw new Error("no body");
    23	    const chunks = []; let total = 0;
    24	    for (;;) {
    25	      const { done, value } = await reader.read();
    26	      if (done) break;
    27	      total += value.byteLength;
    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
    29	      chunks.push(value);
    30	    }
    31	    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
    32	    return JSON.parse(new TextDecoder().decode(buf));
    33	  } finally { clearTimeout(t); }
    34	}
    35	export async function hubGql(c, query) {
    36	  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
    37	  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
    38	  if (!j.data) throw new Error("hub graphql: no data");
    39	  return j.data;
    40	}
    41	
    42	/// ハブ上の投票者数(1 人 1 レコード)。締切時の「未反映の票が残っていないか」の最終確認に使う(第15回監査)
    43	export async function snapshotVoterCount(c, snapId) {
    44	  const d = await hubGql(c, `{ proposal(id:"${snapId}") { votes } }`);
    45	  const n = Number(d?.proposal?.votes);
    46	  if (!Number.isFinite(n)) throw new Error("hub: votes count shape");
    47	  return n;
    48	}
    49	
    50	/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
    51	/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
    52	///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
    53	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
    54	// 仕様上の割り切り(第13回監査で文書化): URL 直後の非 ASCII(日本語など)は「後置の文」とみなして
    55	// 除去するため、"…/vote/989偽" は 989 への参照として受理される(緩い側)。この照合は
    56	// 「取り違え事故の検出」が目的の補助チェックであり、厳密な誤登録防止は猶予+取消+公開が担う。
    57	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
    58	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
    59	export function referencesNounsProposal(text, nounsId) {
    60	  const id = Number(nounsId);
    61	  if (!Number.isSafeInteger(id) || id <= 0) return false;
    62	  const s = String(text || "");
    63	  if (!s) return false;
    64	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    65	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
   280	    <li><b>登録の直後(約 2 分)は票を受け付けない</b> — 登録と受付開始を同じ瞬間にしないための最小間隔です。</li>
   281	    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
   282	    <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
   283	    <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   284	  </ol>
   285	</div>
   286	<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
   287	  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の間隔」について</b>: 誤登録への守りは、自動検算(食い違いを検出している間は票を流さない)と管理者による停止が担います。<b>正直な限界</b>: 投函は誰でも実行できる操作のため、悪意の第三者が解禁後に公開署名を直接投函すると、対応表はその時点で取消不能になります。その場合も、誤った投票が Nouns DAO に確定する前に管理者が停止でき(警告は通常数分で出るため、登録が締切間際でない限り数日の余裕があります)、当該議案は従来の手動投票に切り替えます(停止は全議案の最終投票を止め、集計は続きます)。受付解禁の時点は登録時に固定され、管理者にも前倒しできません。</p>
   288	  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
   289	
   290	
   291	<h2 id="limits"><span class="no">4.</span>補えること・補えないこと</h2>
   292	<p>Snapshot には「署名だけ・ガス代 0 円」という大きな長所がある一方、結果がブロックチェーンの外にあることから来る弱点もあります。新しい仕組みは<b>長所を残したまま弱点を補う</b>ことを狙っていますが、<b>すべては補えません</b>。分けて書きます。</p>
   293	<h3>A. 補えるもの</h3>
   294	<div class="tbl"><table>
   295	<tr><th>いまの弱点</th><th>新しい仕組みでどうなるか</th></tr>
   518	
   519	
   520	<h3>公開されているもの・いないもの</h3>
   521	<div class="tbl"><table>
   522	<tr><th>もの</th><th>公開状態</th><th>検証できること</th></tr>
   523	<tr><td>コントラクトのソースコード</td><td><b>公開済み</b>(Sourcify・完全一致検証つき)</td><td>票の検証・集計・投票のロジック全部。<b>ここが信頼の本体です</b></td></tr>
   524	<tr><td>Snapshot の提案・票・署名</td><td><b>公開</b>(Snapshot の公開 API)</td><td>誰が・何に・いつ投票したか。集計の検算</td></tr>
   525	<tr><td>オンチェーンの全記録</td><td><b>公開</b>(Etherscan 等)</td><td>対応表の登録・1 票ごとの反映・最終投票・ガスの出入り</td></tr>
   526	<tr><td>自動処理(リレイヤー等)のソースコード</td><td>リポジトリは<b>公開準備中</b>(導入までに GitHub で公開します)</td><td>公開後: 検知・投函・通知のロジック。ただし「実際に動いているものがこのコードか」は下記のとおり証明不能</td></tr>
   527	<tr><td>GitHub 上の提案作成ジョブ(Snapshot bot・登録係)</td><td>リポジトリ公開後は<b>コードも実行ログも公開</b>(鍵そのものは GitHub の secret 機能で非公開)</td><td>いつ・どのコード(コミット)で提案作成と登録が実行されたかの記録。実行ログが残って誰でも見られる点で、Cloudflare より検証性が一段高い</td></tr>
   528	<tr><td>Cloudflare 上で実際に動くコード</td><td><b>非公開・証明不能</b>(あらゆるサーバー共通の限界)。緩和策として、デプロイを GitHub 経由にし「どのコードをいつ配備したか」の公開記録を残すことを予定</td><td>挙動の観測のみ(送信 tx・公開 API・通知)。<b>信頼しなくても票が守られる設計</b>で補います(§6)</td></tr>
   529	</table></div>
   530	
   531	<footer>コントラクトの全ソースは Sourcify で公開・検証済み(上記リンク)。自動処理側のリポジトリと運用手順書・監査記録 17 回分は導入までに公開します。質問は #🔥｜p⚡雑談 かアールグレイまで。</footer>
   532	</div>

codex
## 結論

`047d8aa` による Cloudflare 自動探索登録の撤去自体は完全で、リレイヤーのコア経路にも新しい未定義参照や制御フロー破損はありません。

一方、確定引き継ぎ登録には重大な読み戻し検算不足があり、GitHub Actions 運用も未実装です。また資料 §2 の鍵分離に関する安全性説明は、コントラクトの実装と一致しません。

したがって、**現状のまま「Sepolia E2E 完了後、そのまま本番準備へ進む」は不可**です。

## 指摘事項

- **[高] / [create-and-register.mjs:92](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:92) / 読み戻し検算が取り違えを完全には防がない**

  検算対象は `space`、URL の部分文字列、`choices` だけです。特に URL は次の条件です。

  ```js
  String(pr.discussion).includes(expectedUrl)
  ```

  このため、Nouns #12 に対して別提案が `https://nouns.wtf/vote/123` を含んでいても、`/vote/12` の部分文字列として合格します。

  加えて、取得した次の項目を検証していません。

  - `pr.id === receipt.id`
  - author が実際の bot アドレスか
  - `type === "single-choice"`
  - `title`、`body`、`discussion` の完全一致
  - start/end/state
  - Snapshot 提案が今回の署名済み作成要求に由来すること

  sequencer が誤った ID を返した場合や、Hub/Sequencer の不整合時に、同一 space・同じ choices・似た URL の別提案を登録できる余地があります。探索方式の「取り違え」問題を十分には閉じていません。

  **推奨:** `receipt.id` の形式検証、GraphQL variables の使用、ID・author・type・title・body・discussion・choices・start・end の完全一致を必須にしてください。URL は `URL` として解析し、pathname を完全一致させるべきです。

- **[高] / [資料 §2:196](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:196)、[PNounsSnapVoter.sol:250](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:250) / 「GitHub と Cloudflare の両方を破る必要がある」は誤り**

  `castSnapshotVotes` はコメント・実装ともに「誰でも呼べる」関数です。Cloudflare のリレイヤー鍵には専用権限がありません。

  したがって GitHub が侵害され、bot と registrar の両鍵で偽の投票ページを作成・登録された場合、攻撃者は Cloudflare を侵害する必要がありません。メンバーがそのページに署名すれば、正直な Cloudflare または任意の第三者が署名を投函できます。

  以前の「bot と registrar を別サービスに置く」方式と比べると、今回の方式は次の評価です。

  - 取り違え・探索曖昧性への強さ: **今回の方式が強い**
  - 単一サービス侵害への耐性: **今回の方式が明確に弱い**
  - GitHub 一箇所の侵害で偽提案作成と登録が成立する点: **以前より弱い**

  **推奨:** 少なくとも資料から「独立した2箇所を破る必要がある」という主張を削除してください。強い分離を維持するなら、探索に戻すのではなく、作成ジョブが確定 ID と署名済み内容を別の registrar signer に渡し、別信頼境界で完全一致検証して署名する方式が適切です。

- **[中] / [RUNBOOK §11:150](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:150) / GitHub Actions 運用がリポジトリに存在しない**

  `.github` ディレクトリおよび workflow がありません。さらにスクリプトは [create-and-register.mjs:16](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:16) で `.env` を無条件に読みます。通常の GitHub Actions checkout には無視対象の `.env` がないため、そのままでは起動時に `ENOENT` で終了します。

  以下も未定義です。

  - Nouns ID の安全な入力・検出方法
  - workflow の同時実行防止
  - branch/environment protection
  - secret から環境変数へのマッピング
  - 失敗後の再開方法
  - 実行コミットの固定
  - 作成済み・未登録状態からの復旧

  **推奨:** `.env` を任意読込にし、GitHub Environment、最小 permissions、固定コミット、Nouns ID ごとの concurrency、手動承認または安全な起動条件、失敗時の再開経路を備えた workflow を実装してください。

- **[中] / [create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / preflight は最低限あるが本番安全性として不足**

  `getCode`、registrar/owner 権限、`nounsToSnap` 未登録は作成前に確認されます。ここは有効です。

  ただし、registrar 鍵がオンチェーン `owner` でも許可しています。RUNBOOK の「4つの独立鍵」に反して、誤って owner 鍵を `REGISTRAR_MNEMONIC` に設定しても処理が通ります。また次を確認していません。

  - RPC の chain ID
  - コントラクトの `spaceHash`
  - bot/registrar/owner の全アドレス分離
  - `registrationDelayBlocks`
  - 対象 Nouns 提案の存在・状態

  **推奨:** 通常ジョブでは registrar アドレスとの一致だけを許可し、owner fallback は緊急用の別手順に分離してください。chain ID、spaceHash、役割分離も Snapshot 作成前に検査すべきです。

- **[中] / [create-and-register.mjs:77](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:77) / 並行実行・再試行で重複 Snapshot 提案が残る**

  未登録確認は Snapshot 作成前の1回だけです。2ジョブが同時に走ると、両方が未登録確認を通過して提案を2件作成できます。

  コントラクトの [registerProposal](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179) は両方向の重複を `AlreadyRegistered` で拒否するため、二重登録や上書きは起きません。しかし片方は孤児提案となり、メンバーが誤って孤児側に投票する運用事故が残ります。Snapshot 作成成功後・登録前にジョブを再実行した場合も同様です。

  **推奨:** workflow concurrency と、作成済み ID を保存して「再作成せず読み戻し→登録から再開」できる冪等なチェックポイントを設けてください。

- **[中] / [snap.js:77](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:77) / resolveMappings の200件探索による可用性問題は残る**

  author フィルタは正しく撤去され、別 author の過去登録を見失う副作用は解消しています。ただし対応表の逆引き時に Hub の最新200件を取得し、応答全体には [64 KiB制限](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:11)があります。

  同一 space に長い title/discussion の提案が多数作られると64 KiBを超え、`tick` 全体が fail-closed で停止します。誤投函や誤 execute は起きませんが、投函・確定の可用性 DoS は可能です。

  **推奨:** `ProposalRegistered` イベントに含まれる確定 Snapshot ID を取得し、その ID を個別にHubへ照会する方式へ変更してください。

- **[中] / [create-and-register.mjs:114](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:114) / `--skip-register` が一本化方針と矛盾**

  `--skip-register` でも作成後の読み戻し検算は必ず実行されます。その点は安全です。しかし、その後登録せず終了し、メッセージは「Worker の自動登録に任せます」となっています。Worker の自動登録は既に撤去済みなので、提案は恒久的に未登録になります。

  `--dry-run --skip-register` は dry-run が先に終了するため、作成・読み戻し・登録のすべてを行いません。これは正常です。

  **推奨:** `--skip-register` を削除するか、Sepolia限定の明示的な孤児提案作成モードに変更してください。

- **[中] / [Sepolia E2Eスクリプト](/mnt/data/pnouns-voter/scripts/sepolia/16-cf-registrar-e2e.js:1) / 現行E2Eが撤去済み方式を待ち続ける**

  `16-cf-registrar-e2e.js` は「Worker が自動登録する」前提で登録を待ちます。現在の Worker では永久に登録されず、タイムアウトします。

  **推奨:** `create-and-register.mjs` による作成・読み戻し・登録を入口とする新しい Sepolia E2E に更新してください。

- **[中] / RUNBOOK鍵配置・現在の作業環境 / GitHub移行の記述と現状が不一致**

  [RUNBOOK §1](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:16) は registrar を「ローカル `.env`」保管、§11 は「GitHub secret」としており矛盾します。

  現在の `.env` には `REGISTRAR_MNEMONIC` が存在し、ファイルモードは `0777` でした。Git管理対象外ではありますが、RUNBOOK の「600」と一致しません。

  Cloudflare ソースから registrar 鍵の読込は消えていますが、実際の Cloudflare secret store から削除済みか、GitHub secret に登録済みかはリポジトリだけでは確認できません。

  **推奨:** 本番の正本を GitHub Environment secret に統一し、ローカル複製の有無・保管条件をRUNBOOKに明記してください。Cloudflare側は `wrangler secret list` 等で削除を別途証跡化してください。

## 問題なしと確認できた点

- **[問題なし] / 自動探索登録の撤去**

  `relayer-cf/src` には `autoRegister`、`registrarClient`、`AUTO_REGISTER`、`snapshotBot`、`SNAPSHOT_BOT`、`REGISTRAR_PRIVATE_KEY` の残存参照はありません。`register.js` も削除されています。

  履歴監査資料内の文字列は実行コードではありません。

- **[問題なし] / resolveMappings の author フィルタ撤去**

  `snapshotBot` による author 絞りは20件・200件の両方から消えています。別 author が作成した既存登録を見失う問題は解消しています。

  探索方式導入前との完全なバイト一致ではなく、本文を一覧取得しない64 KiB対策と `discussion` による `linkOk` は残っています。これは意図された安全変更で、未定義参照ではありません。

- **[問題なし] / Worker tick・linkOk・コア経路**

  `tick` は通常の `publicClient` / `walletClient` のみを取得し、対応表解決後に `linkOk`、timeline、graceを検査して投函・executeへ進みます。registrar client 削除による未定義参照はありません。

  `047d8aa` 自体は投函、署名照合、execute の本体を変更していません。第15回以降に採用された締切・照合変更があるためソース全体が第15回時点と完全同一ではありませんが、今回の撤去によるコア挙動の変化はありません。

- **[問題なし] / fetch失敗時のfail-closed**

  読み戻しのネットワーク例外、JSON不正、検算不一致、90秒以内に未取得の場合はいずれも `registerProposal` へ進みません。ただし一時的な fetch 例外はループ内で再試行されず即終了し、孤児提案が残る点は運用上改善余地があります。

- **[問題なし] / オンチェーン二重登録防止**

  コントラクトは Snapshot ID と Nouns ID の両方向について既登録なら revert するため、上書きや二重対応表は作れません。競合時に孤児提案が残る問題とは区別できます。

## テスト結果

`relayer-cf` で指定どおり実行しました。

```text
npm test
tests 4
pass 4
fail 0
duration 約0.8秒
```

Node.js v24 の表示では4テストファイル単位ですが、ソース上の `test()` は合計46件です。

- accept-deadline: 7件
- cursor: 10件
- link-check: 9件
- worker-tick: 20件

作業ツリーは変更していません。

## 最終判定

**否 — 現状のまま「Sepolia E2E → 本番準備」へ進むことは推奨しません。**

Cloudflare自動探索登録の撤去とコアの健全性はクローズ可能です。しかし、少なくとも以下を直してから、新しい確定引き継ぎ経路でSepolia E2Eをやり直す必要があります。

1. 読み戻しを完全一致検証にする。
2. GitHub Actions workflowと再試行・同時実行防止を実装する。
3. `--skip-register` と旧Cloudflare E2Eを廃止・更新する。
4. 資料の「2箇所同時侵害が必要」という誤説明を訂正する。
5. GitHubにbotとregistrarを同居させるリスクを明示的に受容するか、確定IDを別信頼境界のregistrarへ渡す方式にする。
tokens used
119,338
## 結論

`047d8aa` による Cloudflare 自動探索登録の撤去自体は完全で、リレイヤーのコア経路にも新しい未定義参照や制御フロー破損はありません。

一方、確定引き継ぎ登録には重大な読み戻し検算不足があり、GitHub Actions 運用も未実装です。また資料 §2 の鍵分離に関する安全性説明は、コントラクトの実装と一致しません。

したがって、**現状のまま「Sepolia E2E 完了後、そのまま本番準備へ進む」は不可**です。

## 指摘事項

- **[高] / [create-and-register.mjs:92](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:92) / 読み戻し検算が取り違えを完全には防がない**

  検算対象は `space`、URL の部分文字列、`choices` だけです。特に URL は次の条件です。

  ```js
  String(pr.discussion).includes(expectedUrl)
  ```

  このため、Nouns #12 に対して別提案が `https://nouns.wtf/vote/123` を含んでいても、`/vote/12` の部分文字列として合格します。

  加えて、取得した次の項目を検証していません。

  - `pr.id === receipt.id`
  - author が実際の bot アドレスか
  - `type === "single-choice"`
  - `title`、`body`、`discussion` の完全一致
  - start/end/state
  - Snapshot 提案が今回の署名済み作成要求に由来すること

  sequencer が誤った ID を返した場合や、Hub/Sequencer の不整合時に、同一 space・同じ choices・似た URL の別提案を登録できる余地があります。探索方式の「取り違え」問題を十分には閉じていません。

  **推奨:** `receipt.id` の形式検証、GraphQL variables の使用、ID・author・type・title・body・discussion・choices・start・end の完全一致を必須にしてください。URL は `URL` として解析し、pathname を完全一致させるべきです。

- **[高] / [資料 §2:196](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:196)、[PNounsSnapVoter.sol:250](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:250) / 「GitHub と Cloudflare の両方を破る必要がある」は誤り**

  `castSnapshotVotes` はコメント・実装ともに「誰でも呼べる」関数です。Cloudflare のリレイヤー鍵には専用権限がありません。

  したがって GitHub が侵害され、bot と registrar の両鍵で偽の投票ページを作成・登録された場合、攻撃者は Cloudflare を侵害する必要がありません。メンバーがそのページに署名すれば、正直な Cloudflare または任意の第三者が署名を投函できます。

  以前の「bot と registrar を別サービスに置く」方式と比べると、今回の方式は次の評価です。

  - 取り違え・探索曖昧性への強さ: **今回の方式が強い**
  - 単一サービス侵害への耐性: **今回の方式が明確に弱い**
  - GitHub 一箇所の侵害で偽提案作成と登録が成立する点: **以前より弱い**

  **推奨:** 少なくとも資料から「独立した2箇所を破る必要がある」という主張を削除してください。強い分離を維持するなら、探索に戻すのではなく、作成ジョブが確定 ID と署名済み内容を別の registrar signer に渡し、別信頼境界で完全一致検証して署名する方式が適切です。

- **[中] / [RUNBOOK §11:150](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:150) / GitHub Actions 運用がリポジトリに存在しない**

  `.github` ディレクトリおよび workflow がありません。さらにスクリプトは [create-and-register.mjs:16](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:16) で `.env` を無条件に読みます。通常の GitHub Actions checkout には無視対象の `.env` がないため、そのままでは起動時に `ENOENT` で終了します。

  以下も未定義です。

  - Nouns ID の安全な入力・検出方法
  - workflow の同時実行防止
  - branch/environment protection
  - secret から環境変数へのマッピング
  - 失敗後の再開方法
  - 実行コミットの固定
  - 作成済み・未登録状態からの復旧

  **推奨:** `.env` を任意読込にし、GitHub Environment、最小 permissions、固定コミット、Nouns ID ごとの concurrency、手動承認または安全な起動条件、失敗時の再開経路を備えた workflow を実装してください。

- **[中] / [create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / preflight は最低限あるが本番安全性として不足**

  `getCode`、registrar/owner 権限、`nounsToSnap` 未登録は作成前に確認されます。ここは有効です。

  ただし、registrar 鍵がオンチェーン `owner` でも許可しています。RUNBOOK の「4つの独立鍵」に反して、誤って owner 鍵を `REGISTRAR_MNEMONIC` に設定しても処理が通ります。また次を確認していません。

  - RPC の chain ID
  - コントラクトの `spaceHash`
  - bot/registrar/owner の全アドレス分離
  - `registrationDelayBlocks`
  - 対象 Nouns 提案の存在・状態

  **推奨:** 通常ジョブでは registrar アドレスとの一致だけを許可し、owner fallback は緊急用の別手順に分離してください。chain ID、spaceHash、役割分離も Snapshot 作成前に検査すべきです。

- **[中] / [create-and-register.mjs:77](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:77) / 並行実行・再試行で重複 Snapshot 提案が残る**

  未登録確認は Snapshot 作成前の1回だけです。2ジョブが同時に走ると、両方が未登録確認を通過して提案を2件作成できます。

  コントラクトの [registerProposal](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179) は両方向の重複を `AlreadyRegistered` で拒否するため、二重登録や上書きは起きません。しかし片方は孤児提案となり、メンバーが誤って孤児側に投票する運用事故が残ります。Snapshot 作成成功後・登録前にジョブを再実行した場合も同様です。

  **推奨:** workflow concurrency と、作成済み ID を保存して「再作成せず読み戻し→登録から再開」できる冪等なチェックポイントを設けてください。

- **[中] / [snap.js:77](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:77) / resolveMappings の200件探索による可用性問題は残る**

  author フィルタは正しく撤去され、別 author の過去登録を見失う副作用は解消しています。ただし対応表の逆引き時に Hub の最新200件を取得し、応答全体には [64 KiB制限](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:11)があります。

  同一 space に長い title/discussion の提案が多数作られると64 KiBを超え、`tick` 全体が fail-closed で停止します。誤投函や誤 execute は起きませんが、投函・確定の可用性 DoS は可能です。

  **推奨:** `ProposalRegistered` イベントに含まれる確定 Snapshot ID を取得し、その ID を個別にHubへ照会する方式へ変更してください。

- **[中] / [create-and-register.mjs:114](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:114) / `--skip-register` が一本化方針と矛盾**

  `--skip-register` でも作成後の読み戻し検算は必ず実行されます。その点は安全です。しかし、その後登録せず終了し、メッセージは「Worker の自動登録に任せます」となっています。Worker の自動登録は既に撤去済みなので、提案は恒久的に未登録になります。

  `--dry-run --skip-register` は dry-run が先に終了するため、作成・読み戻し・登録のすべてを行いません。これは正常です。

  **推奨:** `--skip-register` を削除するか、Sepolia限定の明示的な孤児提案作成モードに変更してください。

- **[中] / [Sepolia E2Eスクリプト](/mnt/data/pnouns-voter/scripts/sepolia/16-cf-registrar-e2e.js:1) / 現行E2Eが撤去済み方式を待ち続ける**

  `16-cf-registrar-e2e.js` は「Worker が自動登録する」前提で登録を待ちます。現在の Worker では永久に登録されず、タイムアウトします。

  **推奨:** `create-and-register.mjs` による作成・読み戻し・登録を入口とする新しい Sepolia E2E に更新してください。

- **[中] / RUNBOOK鍵配置・現在の作業環境 / GitHub移行の記述と現状が不一致**

  [RUNBOOK §1](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:16) は registrar を「ローカル `.env`」保管、§11 は「GitHub secret」としており矛盾します。

  現在の `.env` には `REGISTRAR_MNEMONIC` が存在し、ファイルモードは `0777` でした。Git管理対象外ではありますが、RUNBOOK の「600」と一致しません。

  Cloudflare ソースから registrar 鍵の読込は消えていますが、実際の Cloudflare secret store から削除済みか、GitHub secret に登録済みかはリポジトリだけでは確認できません。

  **推奨:** 本番の正本を GitHub Environment secret に統一し、ローカル複製の有無・保管条件をRUNBOOKに明記してください。Cloudflare側は `wrangler secret list` 等で削除を別途証跡化してください。

## 問題なしと確認できた点

- **[問題なし] / 自動探索登録の撤去**

  `relayer-cf/src` には `autoRegister`、`registrarClient`、`AUTO_REGISTER`、`snapshotBot`、`SNAPSHOT_BOT`、`REGISTRAR_PRIVATE_KEY` の残存参照はありません。`register.js` も削除されています。

  履歴監査資料内の文字列は実行コードではありません。

- **[問題なし] / resolveMappings の author フィルタ撤去**

  `snapshotBot` による author 絞りは20件・200件の両方から消えています。別 author が作成した既存登録を見失う問題は解消しています。

  探索方式導入前との完全なバイト一致ではなく、本文を一覧取得しない64 KiB対策と `discussion` による `linkOk` は残っています。これは意図された安全変更で、未定義参照ではありません。

- **[問題なし] / Worker tick・linkOk・コア経路**

  `tick` は通常の `publicClient` / `walletClient` のみを取得し、対応表解決後に `linkOk`、timeline、graceを検査して投函・executeへ進みます。registrar client 削除による未定義参照はありません。

  `047d8aa` 自体は投函、署名照合、execute の本体を変更していません。第15回以降に採用された締切・照合変更があるためソース全体が第15回時点と完全同一ではありませんが、今回の撤去によるコア挙動の変化はありません。

- **[問題なし] / fetch失敗時のfail-closed**

  読み戻しのネットワーク例外、JSON不正、検算不一致、90秒以内に未取得の場合はいずれも `registerProposal` へ進みません。ただし一時的な fetch 例外はループ内で再試行されず即終了し、孤児提案が残る点は運用上改善余地があります。

- **[問題なし] / オンチェーン二重登録防止**

  コントラクトは Snapshot ID と Nouns ID の両方向について既登録なら revert するため、上書きや二重対応表は作れません。競合時に孤児提案が残る問題とは区別できます。

## テスト結果

`relayer-cf` で指定どおり実行しました。

```text
npm test
tests 4
pass 4
fail 0
duration 約0.8秒
```

Node.js v24 の表示では4テストファイル単位ですが、ソース上の `test()` は合計46件です。

- accept-deadline: 7件
- cursor: 10件
- link-check: 9件
- worker-tick: 20件

作業ツリーは変更していません。

## 最終判定

**否 — 現状のまま「Sepolia E2E → 本番準備」へ進むことは推奨しません。**

Cloudflare自動探索登録の撤去とコアの健全性はクローズ可能です。しかし、少なくとも以下を直してから、新しい確定引き継ぎ経路でSepolia E2Eをやり直す必要があります。

1. 読み戻しを完全一致検証にする。
2. GitHub Actions workflowと再試行・同時実行防止を実装する。
3. `--skip-register` と旧Cloudflare E2Eを廃止・更新する。
4. 資料の「2箇所同時侵害が必要」という誤説明を訂正する。
5. GitHubにbotとregistrarを同居させるリスクを明示的に受容するか、確定IDを別信頼境界のregistrarへ渡す方式にする。
