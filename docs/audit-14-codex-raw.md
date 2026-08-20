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
session id: 01a01f9b-ce94-7dc1-a187-62252c933533
--------
user
# 監査依頼 (第14回・最終確認) — 第13回指摘への修正の検証

あなたは pNouns Voter の第三者監査者です。第13回監査 (docs/audit-13-codex-raw.md) の
指摘に対する修正が commit `1be9d16` に入っています。`git show 1be9d16` で差分を確認し、
**修正が正しいか・新しい欠陥を持ち込んでいないか**だけに絞って検証してください。
明日、Sepolia での実機 E2E を控えており、これがコード面の最終確認です。

リポジトリ: /mnt/data/pnouns-voter (読み取りのみ。ファイル変更禁止)

## 検証項目 (優先順)

1. **[前回 High] 猶予中の dead-letter 化の修正**:
   - chain.js: metagovInfo に eligibleAtBlock を追加 (allowFailure なので旧コントラクトでは 0)
   - worker.js: `if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt))` で投函をゲート
   - worker.js: revertErrorName() で RegistrationTooRecent を一括・個別 simulate とも transient 扱い
   検証観点:
   a. ゲート条件のバグ: eligibleAt=0 (旧コントラクト/未登録) のとき投函が止まらないこと、
      block == eligibleAt ちょうどのときコントラクト側 (`block.number < eligibleAtBlock` で revert)
      と Worker 側の不等号が整合すること (off-by-one で 1 tick 無駄 revert しないか)
   b. revertErrorName の実装: viem の ContractFunctionRevertedError で
      `x.data?.errorName` が取れる条件。ABI に RegistrationTooRecent エラーが
      定義されていないと errorName は復号できないのでは? relayer-cf/src/abi.js に
      error 定義が含まれているか確認すること。**含まれていなければ二重防御②は機能しない。**
   c. 猶予ゲートで投函をスキップしている間、告知だけが先に出る設計は妥当としたが、
      締切間際に登録された提案 (eligibleAt が deadline を超える) の票は
      永遠に投函されない。この場合に警告は出るか? timelineSafe の検査で捕まるか?
2. **[前回 Medium] create-and-register の preflight**: registrar()/owner() 照合、
   nounsToSnap 未登録確認、getCode。逆に「registrar 権限はあるが owner が別」等の
   正常系を誤って弾かないか。preflight の RPC 呼び出しが dry-run 経路に影響しないか
3. **[前回 Medium] scripts/mainnet/deploy-snapvoter.js**: 引数検証・読み戻し・FORCE 保護・
   OUT 上書き経路。hardhat.config の mainnet ネットワーク追加が既存に影響しないか
4. **[前回 Medium] check-deploy の --stage 分割**: 各段階の要求が RUNBOOK の手順と
   整合するか。EXPECT 必須化のロジック (requireEnv) にバグはないか
   (EXPECT が未指定のとき check 自体がスキップされて成功扱いになる経路が残っていないか)
5. **[前回 Low] pendingnotes の id 重複排除**: queueNotify(…, id) と flush の seen 処理。
   id=null (announce 等では使わない) の従来経路に影響しないか
6. 新テスト 3 本 (猶予ゲート/hub errors/pendingnotes 再送) の妥当性。
   特に猶予テストのケース B が「本当に投函経路に入った」ことをどこまで保証するか

## 出力形式
日本語。[重大度] / 該当箇所 / 何が起きるか / 推奨する修正。「問題なし」も根拠つきで。
`relayer-cf` で `npm test` を実行し結果を含めること。
codex
読み取り専用で、commit 差分・前回監査・関連 ABI/実装/RUNBOOK/新規テストを突き合わせます。最後に `relayer-cf` の `npm test` を実行し、指摘は今回の修正起因・未解消点だけに限定します。
  → 第13回監査と commit 1be9d16 の差分を確認する
  • 6検証項目を関連コード・RUNBOOK・テストまで追跡する
  • relayer-cf で npm test を実行し結果を評価する
  • 重大度順の日本語監査結果をまとめる
exec
/bin/bash -lc 'git status --short && git show --stat --oneline --decorate --no-renames 1be9d16 && git show --no-ext-diff --unified=80 --no-renames 1be9d16 -- docs/audit-13-codex-raw.md relayer-cf/src/chain.js relayer-cf/src/worker.js relayer-cf/src/abi.js scripts/mainnet/deploy-snapvoter.js hardhat.config.js scripts/mainnet/check-deploy.js docs/RUNBOOK.md' in /mnt/data/pnouns-voter
 succeeded in 0ms:
1be9d16 (HEAD -> main) 第13回監査(Codex)対応: 登録猶予中の票の dead-letter 化を修正ほか
 docs/AUDIT-RESPONSE-2026-08-18.md    |   22 +
 docs/RUNBOOK-MAINNET.md              |   42 +-
 docs/audit-13-codex-raw.md           | 4575 ++++++++++++++++++++++++++++++++++
 hardhat.config.js                    |    5 +
 relayer-cf/src/chain.js              |    4 +-
 relayer-cf/src/snap.js               |    3 +
 relayer-cf/src/worker.js             |   27 +-
 relayer-cf/test/worker-tick.test.mjs |   59 +
 scripts/check-deploy.mjs             |  134 +-
 scripts/create-and-register.mjs      |   15 +-
 scripts/mainnet/deploy-snapvoter.js  |   53 +
 11 files changed, 4870 insertions(+), 69 deletions(-)
commit 1be9d1658bbf7acb85c6eff646d7ee7c8569c79c
Author: earlgrey <[redacted-email]>
Date:   Thu Aug 20 23:37:44 2026 +0900

    第13回監査(Codex)対応: 登録猶予中の票の dead-letter 化を修正ほか
    
    High:
    - mainnet の登録猶予(24h)中に届いた正常票が dead-letter 化される問題。
      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
      revert を恒久失敗として snapdrop に数えていた(約10分で除外)。
      ①猶予中は submitFromSnapshot を呼ばない ②revert 名を復号し
      RegistrationTooRecent は一括・個別とも数えない、の二重防御。
      Worker テスト(猶予中/解禁後)を必須化どおり追加
    
    Medium:
    - create-and-register にオンチェーン preflight(コントラクト実在・
      registrar 権限・未登録)を追加。孤児提案の設定起因経路を閉鎖
    - scripts/mainnet/deploy-snapvoter.js を実装、フォークで実デプロイ検証。
      hardhat.config に mainnet ネットワークを追加
    - check-deploy を --stage 分割(deployed/worker/funded/delegated/live)。
      mainnet は EXPECT_* 必須・excluded/delegates 照合・照会失敗 fail・
      live 前は liveMode=false 要求。runbook を段階照合に書き換え、
      ロールバックを 8 手順の固定順序に拡充
    
    Low:
    - pendingnotes に tx id を導入し重複送信を排除(残余は accepted risk)
    - URL 照合の 989偽=true を仕様として文書化
    - テスト追加: hub errors 応答の fail-closed / pendingnotes 再送
    
    テスト: relayer 38 pass / contracts 19 pass。Worker 再デプロイ済み。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/docs/audit-13-codex-raw.md b/docs/audit-13-codex-raw.md
new file mode 100644
index 0000000..0815d85
--- /dev/null
+++ b/docs/audit-13-codex-raw.md
@@ -0,0 +1,4575 @@
+Reading additional input from stdin...
+OpenAI Codex v0.145.0-alpha.7
+--------
+workdir: /mnt/data/pnouns-voter
+model: gpt-5.6-sol
+provider: openai
+approval: never
+sandbox: read-only
+reasoning effort: medium
+reasoning summaries: none
+session id: 01a01f8d-7b08-7332-b18b-e91b3c2fd7b9
+--------
+user
+# 監査依頼 (第13回) — 第12回修正と mainnet 前提課題(テスト・runbook・3者分離)の検証
+
+あなたは pNouns Voter の第三者監査者です。第12回監査 (docs/audit-12-codex-raw.md /
+docs/AUDIT-RESPONSE-2026-08-18.md 末尾) のあと、2 つのコミットを積みました。
+
+- `3e02162` … 第12回のあなたの指摘 5 件への修正
+- `cc423e3` … 残課題 2 点: Worker 状態遷移テストの追加、mainnet runbook + Sepolia での 3 者分離リハーサル
+
+`git show 3e02162` と `git show cc423e3` で差分を確認してください。
+リポジトリ: /mnt/data/pnouns-voter (読み取りのみ。ファイルを変更しないこと)。
+オンチェーン確認は不要 (Sepolia の実測は済み: registrar 0xfE07E953…c9ae /
+relayer 0xBbE0b0fe…D561 / owner 0x10849D31…8925 の 3 者分離、check-deploy 全項目一致)。
+
+## A. 第12回指摘への修正 (3e02162) の検証
+
+1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
+   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
+   個別必須化、導出アドレス同士で比較するようになったか。
+   - 前回指摘した「孤児提案」(送信後に検証失敗) の経路は完全に塞がったか。
+     dry-run 経路、nounsDescription/hubVotingPeriod の fetch 失敗時に副作用がないかも確認
+   - sepolia 経路のフォールバック (SEPOLIA_MNEMONIC) は従来どおり動くか (明日の E2E で使う)
+2. **[前回 Medium] MIN_REGISTRATION_DELAY 検証**: cfg() の `Number(env.… ?? 300)` +
+   Number.isInteger + n>=0。`""`(空文字) のとき `Number("")=0` で下限 0 になるが、
+   worker 側 `Math.max(300, 0)` で 300 が効くか。その他の縁ケース ("300.5", " 300 ", null)
+3. **[前回 Low] URL 末尾除去の統合**: 1 つの選択式 `(?:[句読点]|[^!-~])+$` で
+   前回列挙した全ケース (989abc / %20foo / 989偽 / 989.後 / Markdown / クエリ内括弧) が
+   期待どおりか。テストの期待値そのものが仕様として妥当かも述べること
+4. **[前回 Low] pendingnotes キュー**: queueNotify / flushPendingNotes の実装。
+   - KV write 収支: 失敗のたびに put(上限 20 件・TTL 1日)。Discord が長時間死んだ場合の
+     1 日あたり write 数の上限を見積もり、無料枠 1,000/日 を圧迫しないか
+   - flush が tick 冒頭で毎回 get する (reads 1,440/日) は問題ないか
+   - 重複送信リスク (送信成功したのに false が返るケース) と、text だけ持ち回す設計の妥当性
+5. **[前回 Low] 非 Snapshot 告知の順序**: 統一されたか
+
+## B. Worker 状態遷移テスト (cc423e3) の検証
+
+6. `relayer-cf/src/worker.js` のテストフック (__setClientsForTests /
+   __resetWorkerStateForTests) が**本番経路の挙動を一切変えていない**こと。
+   フックの露出による危険 (本番 Worker 上で誤って呼ばれる経路) はないか
+7. `relayer-cf/test/worker-tick.test.mjs` の 9 シナリオは、第11回で私が挙げた
+   未検証経路 (GraphQL error 時の抑止 / 成功0件 / 告知順序 / Discord 失敗時の KV write /
+   mainnet/testnet 差分 / delay 再確認) をどこまで塞いだか。**まだ穴のままの経路**を
+   具体的に列挙すること (例: 実投函 submitFromSnapshot の経路、rush、supplement、
+   dead-letter、reconcile、非 Snapshot モード全般)
+8. 偽 publicClient / 偽 KV / fetch mock の忠実度: 本物と挙動が食い違い、
+   テストが偽の安心を与える箇所はないか (例: multicall の allowFailure、
+   KV の結果整合性、Response の body ストリーム)
+
+## C. runbook と照合スクリプト (cc423e3) の検証
+
+9. `docs/RUNBOOK-MAINNET.md`: 手順の順序に危険はないか。特に
+   - liveMode=false で開始 → シャドー → 委任 → liveMode=true の順序で、
+     途中段階に「片側だけ有効」の危険な状態がないか
+   - REG_DELAY=7200 (24h) と Worker cron・Snapshot 48h 期間・margin 300 の整合
+   - ロールバック手順の完全性 (戻し忘れが残る資産・状態はないか)
+   - 参照しているスクリプト (scripts/mainnet/deploy-snapvoter.js) は**まだ存在しない**。
+     runbook が実在しないものを指している問題をどう扱うべきか
+10. `scripts/check-deploy.mjs`: 照合の網羅性と誤判定。
+    - excluded (トレジャリー除外) を確認していないのでは?
+    - Worker /api/config が古い版を返す伝搬遅延で誤判定しうる点
+    - EXPECT_OWNER 等が未指定のとき mainnet で素通りする項目はないか
+11. `/api/config` への relayer アドレス追加は情報公開として問題ないか
+
+## 出力形式
+日本語。[重大度] / 該当箇所 (file:line) / 何が起きるか / 推奨する修正。
+「問題なし」も根拠つきで。`relayer-cf` で `npm test`、ルートで可能なら
+`npx hardhat test` を実行し結果を含めること (fork テストが RPC 不達で失敗する場合は
+その旨を明記)。
+codex
+第13回監査として、まずリポジトリ内の指示・対象2コミット・現行ファイルを照合し、その後に指定テストを実行します。差分だけでなく現在の行番号に紐づけ、各指摘について副作用経路とテストの忠実度まで追います。ファイルは変更しません。
+exec
+/bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g '"'!node_modules'"' -g '"'!artifacts'"' -g '"'!cache'"' && git status --short && git show --stat --oneline 3e02162 && git show --stat --oneline cc423e3" in /mnt/data/pnouns-voter
+ exited 1 in 0ms:
+/mnt/data/pnouns-voter
+
+exec
+/bin/bash -lc 'find .. -name AGENTS.md -print' in /mnt/data/pnouns-voter
+ succeeded in 7640ms:
+../RuView/repo/plugins/ruview/codex/AGENTS.md
+../zotero/zotero_auto_ingest/translation-server/modules/translators/AGENTS.md
+../EC_site/AGENTS.md
+../EC_site/node_modules/next/AGENTS.md
+../LineHernes/line-harness-oss/AGENTS.md
+
+exec
+/bin/bash -lc 'git status --short
+git show --stat --oneline 3e02162
+git show --stat --oneline cc423e3' in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+3e02162 第12回監査(Codex)対応: 3者分離チェックの死にコード修正ほか
+ docs/AUDIT-RESPONSE-2026-08-18.md   |   24 +
+ docs/audit-12-codex-raw.md          | 2971 +++++++++++++++++++++++++++++++++++
+ relayer-cf/src/chain.js             |    2 +-
+ relayer-cf/src/snap.js              |    3 +-
+ relayer-cf/src/worker.js            |   37 +-
+ relayer-cf/test/link-check.test.mjs |   11 +
+ scripts/create-and-register.mjs     |   30 +-
+ 7 files changed, 3060 insertions(+), 18 deletions(-)
+cc423e3 mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
+ docs/RUNBOOK-MAINNET.md              |  86 ++++++++++++++
+ relayer-cf/src/index.js              |   5 +-
+ relayer-cf/src/worker.js             |  13 ++-
+ relayer-cf/test/worker-tick.test.mjs | 212 +++++++++++++++++++++++++++++++++++
+ scripts/check-deploy.mjs             |  95 ++++++++++++++++
+ scripts/sepolia/_rehearse-keys.js    |  55 +++++++++
+ 6 files changed, 464 insertions(+), 2 deletions(-)
+
+exec
+/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
+git show --format=fuller --find-renames cc423e3 -- docs/RUNBOOK-MAINNET.md relayer-cf/src/index.js relayer-cf/src/worker.js relayer-cf/test/worker-tick.test.mjs scripts/check-deploy.mjs scripts/sepolia/_rehearse-keys.js' in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+commit 3e021624c40269ea9ed12341c57352ce69290d2f
+Author:     earlgrey <[redacted-email]>
+AuthorDate: Thu Aug 20 22:19:14 2026 +0900
+Commit:     earlgrey <[redacted-email]>
+CommitDate: Thu Aug 20 22:19:14 2026 +0900
+
+    第12回監査(Codex)対応: 3者分離チェックの死にコード修正ほか
+    
+    Medium:
+    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
+      MAINNET_PROPOSER_MNEMONIC と比較する死にコードだった。鍵・RPC・
+      deployments の検証を Snapshot 送信前に移動し(孤児提案の防止)、
+      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
+      導出アドレス同士で比較するよう修正
+    - MIN_REGISTRATION_DELAY に不正値(NaN)を与えると Math.max(300, NaN)=NaN
+      で絶対下限が消える。cfg() で非負整数を検証し throw
+    
+    Low:
+    - URL 末尾除去を 1 パスの選択式に統合("989.後" の取りこぼし解消)。
+      第12回指定の 6 ケースをテスト追加
+    - 確定 tx 通知の送信失敗分を pendingnotes キューに積んで次 tick で再送
+      (トリガー消失による通知の恒久喪失を解消。list API 不使用)
+    - 非 Snapshot モードの告知も送信成功後に「告知済み」を記録
+    
+    確認済み(問題なし): 第11回 High の提案単位 fail-closed、締切後の自己 DoS
+    不在、unresolved 4 分類、3者 Set 判定、KV 負荷。
+    
+    テスト: relayer 26 pass / contracts 19 pass。コントラクト無変更。
+    
+    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5
+
+diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
+index c92555b..a5d926f 100644
+--- a/relayer-cf/src/chain.js
++++ b/relayer-cf/src/chain.js
+@@ -51,7 +51,7 @@ export function cfg(env) {
+     snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
+     ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
+     cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
+-    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
++    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
+     rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
+     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
+     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
+diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
+index d19cb3a..e140327 100644
+--- a/relayer-cf/src/snap.js
++++ b/relayer-cf/src/snap.js
+@@ -53,7 +53,8 @@ export function referencesNounsProposal(text, nounsId) {
+   for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
+     // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
+     // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
+-    const trimmed = raw.replace(/[)\]}>,.;:!?、。」』】）〕｝＞…]+$/u, "").replace(/[^\u0021-\u007e]+$/u, "");
++    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
++    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
+     let u;
+     try { u = new URL(trimmed); } catch { continue; }
+     if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
+diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
+index 49d4856..4ecd93b 100644
+--- a/relayer-cf/src/worker.js
++++ b/relayer-cf/src/worker.js
+@@ -16,6 +16,32 @@ async function notify(c, text) {
+   catch (e) { console.warn("discord notify failed", e.message); return false; }
+ }
+ const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
++
++// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
++// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
++async function queueNotify(c, store, text) {
++  if (await notify(c, text)) return true;
++  const k = `${store.prefix}pendingnotes`;
++  const arr = (await store.kvRaw.get(k, "json")) || [];
++  arr.push({ text, at: Date.now() });
++  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
++  return false;
++}
++async function flushPendingNotes(c, store) {
++  const k = `${store.prefix}pendingnotes`;
++  let arr;
++  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
++  if (!Array.isArray(arr) || !arr.length) return;
++  const rest = [];
++  for (const n of arr) {
++    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
++    if (!(await notify(c, n.text))) rest.push(n);
++  }
++  if (rest.length !== arr.length) {
++    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
++    else await store.kvRaw.delete(k);
++  }
++}
+ const WORDS = ["反対", "賛成", "棄権"];
+ 
+ function isContractRevert(e) {
+@@ -50,14 +76,14 @@ async function announceNew(c, pc, store, p, block, snapInfo) {
+   const deadlineBlock = mg.deadline || p.endBlock;
+   const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
+   const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
+-  await store.putAnnounced(p.id, new Date().toISOString());
+-  await notify(c, [
++  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
++  if (await notify(c, [
+     `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
+     `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
+     `締切: ${jst} ごろ (block ${deadlineBlock})`,
+     `投票ページ: ${c.publicUrl}`,
+     `提案の内容: https://nouns.wtf/vote/${p.id}`,
+-  ].join("\n"));
++  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
+ }
+ 
+ // 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
+@@ -105,7 +131,7 @@ async function reconcileSent(c, pc, store, proposalId, summaries) {
+     if (rc && rc.status === "success") {
+       if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
+       const mg = await metagovInfo(c, pc, proposalId);
+-      const sent = await notify(c, [
++      const sent = await queueNotify(c, store, [
+         `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
+         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+         `tx: ${explorerTx(c, tx)}`,
+@@ -140,7 +166,7 @@ async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
+     // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
+     if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
+       const mg = await metagovInfo(c, pc, nounsId);
+-      const sent = await notify(c, [
++      const sent = await queueNotify(c, store, [
+         `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
+         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+         `tx: ${explorerTx(c, pending.txs[0])}`,
+@@ -394,6 +420,7 @@ export async function tick(env) {
+   const { publicClient: pc, walletClient: wc } = clients(c);
+   const store = makeStore(env.STATE, storeNs(c));
+   try {
++    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
+     if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
+     const { block, proposals } = await recentProposals(c, pc);
+     await reconcileRecent(c, pc, wc, store, proposals);
+diff --git a/relayer-cf/test/link-check.test.mjs b/relayer-cf/test/link-check.test.mjs
+index 4f7eddd..9eaa872 100644
+--- a/relayer-cf/test/link-check.test.mjs
++++ b/relayer-cf/test/link-check.test.mjs
+@@ -63,3 +63,14 @@ test("末尾処理で別 ID に化けない", () => {
+ test("改行で分断された URL は検出しない(仕様)", () => {
+   assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
+ });
++
++// 第12回監査: 末尾処理の仕様確認ケース
++test("第12回監査の追加ケース", () => {
++  assert.equal(ref("https://nouns.wtf/vote/989abc", 989), false, "パスに英字が続けば別パス");
++  assert.equal(ref("https://nouns.wtf/vote/989%20foo", 989), false, "エンコード済み文字も別パス");
++  // 仕様: URL 直後の非 ASCII は「後置の文」とみなす。/vote/989偽 という提案パスは実在しないため安全側
++  assert.equal(ref("https://nouns.wtf/vote/989偽", 989), true);
++  assert.equal(ref("https://nouns.wtf/vote/989.後", 989), true, "句読点と日本語が交互でも 1 パスで除去");
++  assert.equal(ref("[t](https://nouns.wtf/vote/989)", 989), true);
++  assert.equal(ref("[t](https://nouns.wtf/vote/989?x=(y))", 989), true, "クエリ内括弧つき Markdown");
++});
+diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
+index 3ce4f6f..95139a0 100644
+--- a/scripts/create-and-register.mjs
++++ b/scripts/create-and-register.mjs
+@@ -51,7 +51,23 @@ async function main() {
+   console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
+   if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
+ 
+-  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
++  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
++  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
++  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
++  const voter = dep.snapVoter || dep.voter;
++  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
++  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
++  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
++  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
++  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
++  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
++  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
++  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
++  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
++  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
++
+   const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
+   const now = Math.floor(Date.now() / 1000);
+   const client = new snapshot.Client712(SEQ);
+@@ -62,16 +78,8 @@ async function main() {
+   });
+   console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
+ 
+-  // オンチェーンの対応付け(registrar)
+-  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
+-  const voter = dep.snapVoter || dep.voter;
+-  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+-  // 第11回監査 M-14: mainnet で registrar 用の鍵が未設定のまま提案作成鍵に fallback すると、
+-  // 3 者分離したつもりで同一鍵に戻ってしまう。mainnet では明示指定を必須にする。
+-  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
+-  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
+-  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
+-  const w = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
++  // オンチェーンの対応付け(registrar) — 鍵と設定は送信前に検証済み
++  const w = registrarWallet.connect(new ethers.JsonRpcProvider(rpc));
+   const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
+   const c = new ethers.Contract(voter, abi, w);
+   const tx = await c.registerProposal(receipt.id, nounsId);
+commit cc423e311b7584c1261a220192b36785b518bf64
+Author:     earlgrey <[redacted-email]>
+AuthorDate: Thu Aug 20 23:21:49 2026 +0900
+Commit:     earlgrey <[redacted-email]>
+CommitDate: Thu Aug 20 23:21:49 2026 +0900
+
+    mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
+    
+    1. Worker レベルの状態遷移テスト (第11回監査 指摘7):
+    - worker.js にテストフックを追加(clients 差し替えとモジュール状態リセット。
+      本番経路は不変)。KV は偽 env.STATE、ハブ/Discord は fetch mock で注入
+    - test/worker-tick.test.mjs に 9 シナリオ: ハブ障害の fail-closed /
+      ハブ正常0件+登録済み=unresolved 停止と KV write 抑制 / linkOk=false で
+      告知抑止 / 告知は Discord 2xx 後にのみ記録(失敗→次 tick 再送) /
+      mainnet 猶予下限(環境変数で下げても 300 が効く) / 3 者同一で停止 /
+      MIN_REGISTRATION_DELAY 不正値で throw / spaceCheck キャッシュ /
+      締切後の "no votes" 確定は対応付け済みのみ
+    
+    2. 本番構成 runbook と 3 者分離リハーサル (第11回監査 指摘14):
+    - docs/RUNBOOK-MAINNET.md: 鍵 4 役の分離、liveMode=false 開始 →
+      機械照合 → シャドー → 委任 → liveMode=true の順序固定、ロールバック手順
+    - scripts/check-deploy.mjs: オンチェーン実値・委任・Worker /api/config・
+      残高・3 者分離を機械照合(不一致で非ゼロ終了)
+    - /api/config に relayer アドレスを追加(照合用。秘密は含まない)
+    - Sepolia で実施: registrar/relayer を新規独立鍵に分離
+      (registrar 0xfE07…c9ae / relayer 0xBbE0…D561)、Worker secret 差し替え、
+      transferOwnership 往復演習(新 owner で onlyOwner 通過・旧 owner 拒否を確認)、
+      check-deploy 全項目一致
+    
+    テスト: relayer 35 pass / contracts 19 pass
+    
+    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5
+
+diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
+new file mode 100644
+index 0000000..b91cb22
+--- /dev/null
++++ b/docs/RUNBOOK-MAINNET.md
+@@ -0,0 +1,86 @@
++# mainnet 移行 runbook (pNouns Voter)
++
++第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
++Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
++
++## 0. 前提
++
++- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
++- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
++
++## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵
++
++| 役割 | 鍵 | 保管 | 資金 |
++|---|---|---|---|
++| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
++| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
++| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
++
++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
++同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。
++
++## 2. デプロイ (liveMode=false で開始)
++
++```bash
++NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
++  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
++```
++
++- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
++- `owner_` は**最初からマルチシグを指定**(EOA を経由しない)。registrar_ は上記の registrar アドレス
++- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
++- Sourcify でソース検証 → exact_match を確認
++
++## 3. 機械照合
++
++```bash
++NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
++```
++
++全項目 ✅ になるまで進まない。確認内容: spaceHash 一致 / delay >= 300 /
++3 者分離 / Worker 設定一致 / 残高。
++
++## 4. Worker (Cloudflare) 設定
++
++```bash
++cd relayer-cf
++# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
++npx wrangler kv namespace create STATE --env mainnet
++npx wrangler deploy --env mainnet
++npx wrangler secret put RPC_URL --env mainnet
++npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
++npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
++```
++
++- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
++- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
++
++## 5. シャドー運用 (liveMode=false)
++
++- トレジャリーからプールへ 0.05 ETH 送金
++- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
++  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
++- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
++
++## 6. 委任切替 → 本番化 (この順のみ)
++
++1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
++2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
++3. マルチシグから `setLiveMode(true)`
++4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
++
++## 7. ロールバック
++
++いつでも可能・即時:
++- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
++- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
++- `sweep(トレジャリー)` → プール残額を回収
++
++## 8. 障害時
++
++- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
++  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
++- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
++  (Worker の自動照合が Discord に⚠️を出す)
++- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
+diff --git a/relayer-cf/src/index.js b/relayer-cf/src/index.js
+index 1108018..f9cd3b2 100644
+--- a/relayer-cf/src/index.js
++++ b/relayer-cf/src/index.js
+@@ -19,7 +19,10 @@ app.use("*", async (ctx, next) => {
+ app.get("/api/config", (ctx) => {
+   const c = cfg(ctx.env);
+   const snap = !!c.snapshotSpace;
+-  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
++  // relayer アドレスは tx 送信時にオンチェーンで公開される情報。照合スクリプト(check-deploy)が
++  // 「稼働中 Worker の鍵」と「意図した鍵」の一致を機械確認できるよう返す(秘密鍵は含まない)。
++  const relayer = clients(c).account?.address || null;
++  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
+ });
+ 
+ app.get("/api/proposals", async (ctx) => {
+diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
+index 4ecd93b..e6c3e37 100644
+--- a/relayer-cf/src/worker.js
++++ b/relayer-cf/src/worker.js
+@@ -414,10 +414,21 @@ export async function notifyError(c, where, e) {
+ 
+ let lastBalanceCheck = 0;
+ let spaceCheckedAt = 0;
++
++// ---- テスト用フック(本番経路では未使用) ----
++// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
++// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
++let _clients = clients;
++export function __setClientsForTests(f) { _clients = f || clients; }
++export function __resetWorkerStateForTests(o = {}) {
++  lastErrNotify = o.errNotifiedAt ?? 0;
++  lastBalanceCheck = o.balanceCheckedAt ?? 0;
++  spaceCheckedAt = o.spaceCheckedAt ?? 0;
++}
+ const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
+ export async function tick(env) {
+   const c = cfg(env);
+-  const { publicClient: pc, walletClient: wc } = clients(c);
++  const { publicClient: pc, walletClient: wc } = _clients(c);
+   const store = makeStore(env.STATE, storeNs(c));
+   try {
+     try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
+diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
+new file mode 100644
+index 0000000..a69aa05
+--- /dev/null
++++ b/relayer-cf/test/worker-tick.test.mjs
+@@ -0,0 +1,212 @@
++// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
++// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
++import { test, beforeEach } from "node:test";
++import assert from "node:assert/strict";
++import { keccak256, stringToBytes, parseEther } from "viem";
++import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";
++
++const VOTER = "0x1000000000000000000000000000000000000001";
++const PNOUNS = "0x1000000000000000000000000000000000000002";
++const DAO = "0x1000000000000000000000000000000000000003";
++const TOKEN = "0x1000000000000000000000000000000000000004";
++const OWNER = "0x2000000000000000000000000000000000000001";
++const REGISTRAR = "0x2000000000000000000000000000000000000002";
++const RELAYER = "0x2000000000000000000000000000000000000003";
++const SPACE = "earl-grey.eth";
++const SNAP_ID = "0x" + "ab".repeat(32);
++const SNAP_HASH = keccak256(stringToBytes(SNAP_ID));
++const WEBHOOK = "https://discord.test/webhook";
++const HUB = "https://hub.test";
++
++// ---- 偽 KV ----
++function fakeKV() {
++  const data = new Map(); const ops = [];
++  return {
++    data, ops,
++    async get(k, type) { ops.push(["get", k]); const v = data.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
++    async put(k, v) { ops.push(["put", k]); data.set(k, String(v)); },
++    async delete(k) { ops.push(["delete", k]); data.delete(k); },
++    async list({ prefix }) { ops.push(["list", prefix]); return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: null })), list_complete: true }; },
++  };
++}
++
++// ---- 偽 publicClient: functionName で応答を引く ----
++function fakePC(h) {
++  const calls = [];
++  const one = (x) => { calls.push(x.functionName); const f = h[x.functionName]; if (!f) throw new Error(`fakePC: no handler for ${x.functionName}`); return f(x.args || []); };
++  return {
++    calls,
++    async readContract(x) { return one(x); },
++    async multicall({ contracts, allowFailure }) {
++      return contracts.map((x) => {
++        try { const r = one(x); return allowFailure ? { status: "success", result: r } : r; }
++        catch (e) { if (allowFailure) return { status: "failure", error: e }; throw e; }
++      });
++    },
++    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
++    async getBalance() { calls.push("getBalance"); return parseEther("1"); },
++    async getTransactionReceipt() { throw new Error("not found"); },
++    async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
++  };
++}
++
++// ---- fetch mock: ハブと Discord を演じる ----
++const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
++globalThis.fetch = async (url, init) => {
++  const u = String(url);
++  if (u.startsWith(HUB)) {
++    F.hubCalls++;
++    const r = F.hub.shift();
++    if (r instanceof Error) throw r;
++    if (typeof r === "number") return new Response("error", { status: r });
++    return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
++  }
++  if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
++  throw new Error("unexpected fetch: " + u);
++};
++
++function baseEnv(kv, over = {}) {
++  return { NETWORK: "sepolia", RPC_URL: "http://rpc.test", VOTER, PNOUNS: PNOUNS, NOUNS_DAO: DAO, NOUNS_TOKEN: TOKEN,
++    EXPLORER: "https://sepolia.etherscan.io", SNAPSHOT_SPACE: SPACE, SNAPSHOT_HUB: HUB,
++    DISCORD_WEBHOOK_URL: WEBHOOK, STATE: kv, SCAN_PROPOSALS: "3", ...over };
++}
++// 提案 1 件(state Active、mg.deadline=195)を返す標準ハンドラ
++function handlers(over = {}) {
++  return {
++    __block: 100,
++    proposalCount: () => 1n,
++    proposals: () => [1n, OWNER, 0n, 0n, 0n, 90n, 200n, 0n, 0n, 0n, false, false, false, 0n, 50n],
++    state: () => 1,
++    spaceHash: () => keccak256(stringToBytes(SPACE)),
++    registrationDelayBlocks: () => 400n,
++    owner: () => OWNER,
++    registrar: () => REGISTRAR,
++    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
++    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
++    tally: () => [[0n, 0n, 0n], [0n, 0n, 0n], false, 0],
++    voteDeadline: () => 195n,
++    getCurrentVotes: () => 2n,
++    currentResult: () => 2,
++    getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
++    liveMode: () => true,
++    ...over,
++  };
++}
++const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
++const setup = (h, envOver = {}, wallet = null) => {
++  const kv = fakeKV(); const pc = fakePC(h);
++  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
++  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() }); // 残高チェックは対象外の tick が既定
++  return { kv, pc, env: baseEnv(kv, envOver) };
++};
++const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));
++
++beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });
++
++test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
++  const { kv, env } = setup(handlers());
++  F.hub = [new Error("network down")];
++  await tick(env);
++  assert.equal(F.discordBodies.filter((b) => b.includes("投票受付を開始")).length, 0, "告知しない");
++  assert.equal(putsOf(kv, "announced").length, 0);
++  assert.equal(putsOf(kv, "executed").length, 0);
++  assert.ok(F.discordBodies.some((b) => b.includes("エラー")), "エラー通知は出る");
++});
++
++test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
++  const { kv, env } = setup(handlers());
++  F.hub = [{ proposals: [] }, { proposals: [] }]; // 1 回目 20 件クエリ・2 回目 逆引き 200 件クエリ
++  await tick(env);
++  assert.ok(F.discordBodies.some((b) => b.includes("取得できません")), "unresolved 警告");
++  assert.equal(putsOf(kv, "flag:unresolved:1").length, 1);
++  assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
++  // 2 tick 目: フラグ済みなので再警告なし・追加書き込みなし
++  F.hub = [{ proposals: [] }, { proposals: [] }];
++  const n = F.discordBodies.length; const w = kv.ops.filter(([op]) => op === "put").length;
++  await tick(env);
++  assert.equal(F.discordBodies.length, n, "再警告しない");
++  assert.equal(kv.ops.filter(([op]) => op === "put").length, w, "KV write が増えない");
++});
++
++test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
++  const { kv, env } = setup(handlers());
++  F.hub = [hubProposal("https://nouns.wtf/vote/999")]; // 別議案を指す
++  await tick(env);
++  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
++  assert.equal(putsOf(kv, "announced").length, 0, "誤った URL を告知しない");
++});
++
++test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
++  const { kv, env } = setup(handlers());
++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
++  F.discordStatus = 500;
++  await tick(env);
++  assert.equal(putsOf(kv, "announced").length, 0, "送信失敗なら告知済みにしない");
++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
++  F.discordStatus = 200;
++  await tick(env);
++  assert.ok(F.discordBodies.some((b) => b.includes("投票受付を開始")));
++  assert.equal(putsOf(kv, "announced").length, 1, "成功した tick で告知済みになる");
++  assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
++});
++
++test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
++  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
++    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
++  });
++  await tick(env);
++  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
++  assert.equal(F.hubCalls, 0, "ハブに到達しない");
++});
++
++test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
++  const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
++  }, { account: { address: OWNER } });
++  await tick(env);
++  assert.ok(F.discordBodies.some((b) => b.includes("同一アドレス")), "分離違反の通知");
++  assert.equal(F.hubCalls, 0);
++});
++
++test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
++  const { env } = setup(handlers(), {
++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
++    MIN_REGISTRATION_DELAY: "abc",
++  });
++  await assert.rejects(() => tick(env), /MIN_REGISTRATION_DELAY/);
++});
++
++test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
++  const { pc, env } = setup(handlers());
++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
++  await tick(env);
++  const first = pc.calls.filter((f) => f === "spaceHash").length;
++  assert.equal(first, 1);
++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
++  await tick(env); // __reset していないので spaceCheckedAt は保持される
++  assert.equal(pc.calls.filter((f) => f === "spaceHash").length, 1, "2 tick 目は確認しない");
++});
++
++test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
++  const wallet = { account: { address: RELAYER } };
++  // ケース A: 登録済み + 解決済み → maybeExecute が "no votes" を記録
++  {
++    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
++    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
++    await tick(env);
++    const put = putsOf(kv, "executed:1");
++    assert.equal(put.length, 1, "no votes が確定される");
++    assert.ok(kv.data.get(put[0][1]).includes("no votes"));
++  }
++  // ケース B: 未登録(対応表なし) → execute もスキップ(登録遅れの提案を票ゼロで切り捨てない)
++  {
++    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
++    F.hub = [{ proposals: [] }]; // 登録なしなので逆引きは発生しない
++    await tick(env);
++    assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
++  }
++});
+diff --git a/scripts/check-deploy.mjs b/scripts/check-deploy.mjs
+new file mode 100644
+index 0000000..bb886c5
+--- /dev/null
++++ b/scripts/check-deploy.mjs
+@@ -0,0 +1,95 @@
++// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
++// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
++// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
++//
++// 使い方:
++//   NETWORK=sepolia node scripts/check-deploy.mjs
++//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
++import { ethers } from "ethers";
++import fs from "node:fs";
++import path from "node:path";
++
++const ROOT = path.resolve(import.meta.dirname, "..");
++for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
++  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
++}
++const NETWORK = process.env.NETWORK || "sepolia";
++const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
++const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
++  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
++  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
++const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
++const VOTER_ABI = [
++  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
++  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
++  "function owner() view returns (address)", "function registrar() view returns (address)",
++  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
++  "function excluded(address) view returns (bool)",
++];
++const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
++
++let failed = 0;
++const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
++const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
++
++async function main() {
++  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
++  const p = new ethers.JsonRpcProvider(RPC);
++  const voterAddr = dep.snapVoter || dep.voter;
++  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
++  console.log(`network=${NETWORK} voter=${voterAddr}\n`);
++
++  // 1. コントラクトの実値
++  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
++    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
++  ]);
++  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
++  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
++  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
++  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
++  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
++  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
++  check("refundEnabled", refund === true);
++
++  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
++  let workerCfg = null;
++  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
++  const relayer = workerCfg?.relayer || null;
++  const roles = { owner, registrar, relayer };
++  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
++  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
++  const distinct = new Set(addrs).size === addrs.length;
++  if (NETWORK === "mainnet") {
++    check("owner / registrar / relayer がすべて別アドレス", distinct);
++    check("relayer が Worker から取得できた", !!relayer);
++    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
++    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
++  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
++  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);
++
++  // 3. Worker と deployments の一致
++  if (workerCfg) {
++    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
++    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
++    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
++  }
++
++  // 4. 委任と残高
++  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
++  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
++  try {
++    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
++    const votes = await t.getCurrentVotes(voterAddr);
++    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
++  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
++  const pool = await p.getBalance(voterAddr);
++  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
++  if (relayer) {
++    const rb = await p.getBalance(relayer);
++    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
++  }
++
++  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
++  process.exit(failed ? 1 : 0);
++}
++main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
+diff --git a/scripts/sepolia/_rehearse-keys.js b/scripts/sepolia/_rehearse-keys.js
+new file mode 100644
+index 0000000..90a5d2f
+--- /dev/null
++++ b/scripts/sepolia/_rehearse-keys.js
+@@ -0,0 +1,55 @@
++// 本番構成リハーサル(Sepolia): registrar / relayer を新規鍵に分離し、transferOwnership の往復を演習する
++const { ethers } = require("hardhat");
++const fs = require("fs");
++const path = require("path");
++const { loadDeployments } = require("./lib");
++async function main() {
++  const [deployer, delegator] = await ethers.getSigners();
++  const dep = loadDeployments();
++  const v = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
++  console.log("開始残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
++
++  // 1. 新規鍵の生成(mainnet と同じ手順: 役割ごとに独立したシードを新規生成)
++  const envPath = path.join(__dirname, "..", "..", ".env");
++  let env = fs.readFileSync(envPath, "utf8");
++  let regAddr, relayAddr;
++  if (!env.includes("REGISTRAR_MNEMONIC=")) {
++    const reg = ethers.Wallet.createRandom();
++    const relay = ethers.Wallet.createRandom();
++    env += `\n# Sepolia リハーサル用(2026-08-20 生成、実資産なし): registrar / relayer の分離鍵\nREGISTRAR_MNEMONIC="${reg.mnemonic.phrase}"\nSEPOLIA_RELAYER_KEY=${relay.privateKey}\n`;
++    fs.writeFileSync(envPath, env);
++    regAddr = ethers.HDNodeWallet.fromPhrase(reg.mnemonic.phrase, undefined, "m/44'/60'/0'/0/0").address;
++    relayAddr = relay.address;
++    console.log("新規生成: registrar", regAddr, "/ relayer", relayAddr);
++  } else {
++    regAddr = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC, undefined, "m/44'/60'/0'/0/0").address;
++    relayAddr = new ethers.Wallet(process.env.SEPOLIA_RELAYER_KEY).address;
++    console.log("既存の鍵を使用: registrar", regAddr, "/ relayer", relayAddr);
++  }
++
++  // 2. 資金供給(ガス用の小額。relayer の投函ガスはプールから返金される)
++  for (const [to, eth] of [[regAddr, "0.002"], [relayAddr, "0.004"]]) {
++    if ((await ethers.provider.getBalance(to)) === 0n) { await (await deployer.sendTransaction({ to, value: ethers.parseEther(eth) })).wait(); console.log(`funded ${to} ${eth} ETH`); }
++  }
++
++  // 3. registrar を分離鍵に切替
++  if ((await v.registrar()).toLowerCase() !== regAddr.toLowerCase()) {
++    await (await v.setRegistrar(regAddr)).wait();
++  }
++  console.log("registrar =", await v.registrar());
++
++  // 4. transferOwnership の往復演習(mainnet ではマルチシグへ移す操作の予行)
++  await (await v.transferOwnership(delegator.address)).wait();
++  console.log("owner →", await v.owner(), "(マルチシグ役に移管)");
++  const vAsNewOwner = v.connect(delegator);
++  await (await vAsNewOwner.setMarginBlocks(await v.marginBlocks())).wait(); // onlyOwner 操作が新オーナーで通ることを確認
++  console.log("新オーナーで onlyOwner 操作 OK");
++  let rejected = false;
++  try { await v.setLiveMode.staticCall(true); } catch { rejected = true; } // 旧オーナー(deployer)は拒否されること
++  console.log("旧オーナーの操作は拒否:", rejected ? "OK" : "NG!");
++  await (await vAsNewOwner.transferOwnership(deployer.address)).wait();
++  console.log("owner →", await v.owner(), "(復帰)");
++
++  console.log("終了残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
++}
++main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
+
+codex
+差分の主要意図は確認できました。ここからは、現行コード全体との組合せ（特に `tick` の例外処理、mainnet 検証のキャッシュ、KV API 契約、runbook の各段階）を追い、差分だけでは見えない抜けを確認します。併せてテストを実行します。
+exec
+/bin/bash -lc "node -e \"console.log(require('./package.json').scripts)\"
+node -e \"console.log(require('./relayer-cf/package.json').scripts)\"
+npm test" in /mnt/data/pnouns-voter/relayer-cf
+ succeeded in 860ms:
+✔ test/accept-deadline.test.mjs (729.942081ms)
+✔ test/cursor.test.mjs (726.132647ms)
+✔ test/link-check.test.mjs (725.243263ms)
+✔ test/worker-tick.test.mjs (764.577014ms)
+ℹ tests 4
+ℹ suites 0
+ℹ pass 4
+ℹ fail 0
+ℹ cancelled 0
+ℹ skipped 0
+ℹ todo 0
+ℹ duration_ms 779.897117
+
+exec
+/bin/bash -lc "node -e \"console.log(require('./package.json').scripts)\"
+npx hardhat test" in /mnt/data/pnouns-voter
+ exited 1 in 944ms:
+◇ injected env (6) from .env // tip: ⌘ enable debugging { debug: true }
+An unexpected error occurred:
+
+[Error: EROFS: read-only file system, open '/mnt/data/pnouns-voter/cache/solidity-files-cache.json'] {
+  errno: -30,
+  code: 'EROFS',
+  syscall: 'open',
+  path: '/mnt/data/pnouns-voter/cache/solidity-files-cache.json'
+}
+
+exec
+/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
+nl -ba relayer-cf/src/chain.js | sed -n '1,150p'
+nl -ba relayer-cf/src/snap.js | sed -n '1,130p'
+nl -ba relayer-cf/src/worker.js | sed -n '1,520p'" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+     1	// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
+     2	// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
+     3	//
+     4	// 使い方:
+     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
+     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
+     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
+     8	// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
+     9	import snapshot from "@snapshot-labs/snapshot.js";
+    10	import { ethers } from "ethers";
+    11	import fs from "node:fs";
+    12	import path from "node:path";
+    13	import { buildProposal } from "./lib/proposal-format.mjs";
+    14	
+    15	const ROOT = path.resolve(import.meta.dirname, "..");
+    16	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
+    17	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
+    18	}
+    19	const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
+    20	const flag = (k) => process.argv.includes(`--${k}`);
+    21	
+    22	const NETWORK = process.env.NETWORK || "sepolia";
+    23	const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
+    24	const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
+    25	const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
+    26	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
+    27	const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
+    28	
+    29	async function nounsDescription(id) {
+    30	  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
+    31	  const d = r?.data?.proposal?.description;
+    32	  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
+    33	  return d;
+    34	}
+    35	async function hubVotingPeriod() {
+    36	  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
+    37	  return r?.data?.space?.voting?.period || 172800;
+    38	}
+    39	
+    40	async function main() {
+    41	  const nounsId = Number(arg("nouns"));
+    42	  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
+    43	  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
+    44	  const description = await nounsDescription(descId);
+    45	  const p = buildProposal({ nounsId: descId, description });
+    46	  const period = await hubVotingPeriod();
+    47	  console.log(`space=${SPACE} network=${NETWORK}`);
+    48	  console.log(`title: ${p.title}`);
+    49	  console.log(`discussion: ${p.discussion}`);
+    50	  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
+    51	  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
+    52	  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
+    53	
+    54	  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
+    55	  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
+    56	  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
+    57	  const voter = dep.snapVoter || dep.voter;
+    58	  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
+    59	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+    60	  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
+    61	  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
+    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
+    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
+    64	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
+    65	  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
+    66	  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
+    67	  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
+    68	  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
+    69	  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
+    70	
+    71	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
+    72	  const now = Math.floor(Date.now() / 1000);
+    73	  const client = new snapshot.Client712(SEQ);
+    74	  const receipt = await client.proposal(adapt(bot), bot.address, {
+    75	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
+    76	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
+    77	    plugins: "{}", app: "pnouns-voter",
+    78	  });
+    79	  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
+    80	
+    81	  // オンチェーンの対応付け(registrar) — 鍵と設定は送信前に検証済み
+    82	  const w = registrarWallet.connect(new ethers.JsonRpcProvider(rpc));
+    83	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
+    84	  const c = new ethers.Contract(voter, abi, w);
+    85	  const tx = await c.registerProposal(receipt.id, nounsId);
+    86	  await tx.wait();
+    87	  const delay = Number(await c.registrationDelayBlocks());
+    88	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
+    89	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
+    90	}
+    91	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
+     1	// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
+     2	import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
+     3	import { privateKeyToAccount } from "viem/accounts";
+     4	import { mainnet, sepolia } from "viem/chains";
+     5	import { METAGOV_ABI } from "./abi.js";
+     6	
+     7	export const DAO_ABI = parseAbi([
+     8	  "function proposalCount() view returns (uint256)",
+     9	  "function state(uint256) view returns (uint8)",
+    10	  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
+    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
+    12	  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
+    13	  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
+    14	  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
+    15	  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
+    16	]);
+    17	export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
+    18	export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
+    19	export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
+    20	export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
+    21	
+    22	export function cfg(env) {
+    23	  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
+    24	  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
+    25	  if (env.NETWORK === "mainnet") {
+    26	    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
+    27	    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
+    28	    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
+    29	    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
+    30	    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
+    31	  }
+    32	  return {
+    33	    network: env.NETWORK || "sepolia",
+    34	    chain,
+    35	    chainId: chain.id,
+    36	    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
+    37	    metagov: getAddress(env.VOTER),
+    38	    pnouns: getAddress(env.PNOUNS),
+    39	    nounsDAO: getAddress(env.NOUNS_DAO),
+    40	    nounsToken: getAddress(env.NOUNS_TOKEN),
+    41	    explorer: env.EXPLORER,
+    42	    blockscout: env.BLOCKSCOUT || null,
+    43	    publicUrl: env.PUBLIC_URL || "",
+    44	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
+    45	    scanProposals: Number(env.SCAN_PROPOSALS || 30),
+    46	    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
+    47	    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
+    48	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
+    49	    announce: env.ANNOUNCE !== "0",
+    50	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
+    51	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
+    52	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
+    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
+    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
+    55	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
+    56	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
+    57	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
+    58	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
+    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
+    60	  };
+    61	}
+    62	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
+    63	export function acceptMarginBlocks(c) {
+    64	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
+    65	}
+    66	export function acceptDeadline(c, onchainDeadline) {
+    67	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
+    68	}
+    69	// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
+    70	export function shouldRushSubmit(c, block, onchainDeadline) {
+    71	  return Number(block) >= acceptDeadline(c, onchainDeadline);
+    72	}
+    73	// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
+    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
+    75	export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
+    76	  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
+    77	  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
+    78	  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
+    79	}
+    80	// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
+    81	//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
+    82	export function submitCapacity(c, block, onchainDeadline) {
+    83	  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
+    84	  const ticks = Math.floor(secsLeft / c.cronSec);
+    85	  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
+    86	}
+    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
+    88	export function clients(c) {
+    89	  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
+    90	  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
+    91	  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
+    92	  return { publicClient, walletClient, account };
+    93	}
+    94	export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
+    95	
+    96	// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
+    97	let ownersCache = { at: 0, owners: [] };
+    98	export async function allOwners(c, pc) {
+    99	  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
+   100	  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
+   101	  const owners = [];
+   102	  const CH = 500;
+   103	  for (let start = 1; start <= total; start += CH) {
+   104	    const ids = [];
+   105	    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
+   106	    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
+   107	    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
+   108	  }
+   109	  ownersCache = { at: Date.now(), owners };
+   110	  return owners;
+   111	}
+   112	export async function tokensOf(c, pc, address) {
+   113	  const owners = await allOwners(c, pc);
+   114	  const a = address.toLowerCase();
+   115	  const out = [];
+   116	  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
+   117	  return out;
+   118	}
+   119	export async function recentProposals(c, pc) {
+   120	  const [count, block] = await Promise.all([
+   121	    pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
+   122	    pc.getBlockNumber(),
+   123	  ]);
+   124	  const ids = [];
+   125	  for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
+   126	  const res = await pc.multicall({
+   127	    contracts: ids.flatMap((id) => [
+   128	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
+   129	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
+   130	    ]),
+   131	    allowFailure: false,
+   132	  });
+   133	  const out = [];
+   134	  ids.forEach((id, i) => {
+   135	    const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
+   136	    // proposals() は名前付きタプルではなく配列で返る
+   137	    const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
+   138	    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
+   139	    out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
+   140	  });
+   141	  return { block: Number(block), proposals: out };
+   142	}
+   143	// H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
+   144	//  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
+   145	//  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
+   146	const titleMem = new Map();
+   147	export async function proposalTitle(c, pc, store, id, creationBlock, state) {
+   148	  const frozen = state === 0 || state === 1;
+   149	  const kv = store ? store.kvRaw : null;
+   150	  if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
+     1	// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
+     2	// 監査対応:
+     3	//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
+     4	//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
+     5	//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
+     6	//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
+     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
+     8	import { METAGOV_ABI } from "./chain.js";
+     9	import { keccak256, stringToBytes } from "viem";
+    10	
+    11	const FETCH_TIMEOUT_MS = 8000;
+    12	const MAX_BODY = 64 * 1024;
+    13	const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り
+    14	
+    15	async function fetchLimited(url, init) {
+    16	  const ctrl = new AbortController();
+    17	  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
+    18	  try {
+    19	    const r = await fetch(url, { ...init, signal: ctrl.signal });
+    20	    if (!r.ok) throw new Error(`HTTP ${r.status}`);
+    21	    const reader = r.body?.getReader();
+    22	    if (!reader) throw new Error("no body");
+    23	    const chunks = []; let total = 0;
+    24	    for (;;) {
+    25	      const { done, value } = await reader.read();
+    26	      if (done) break;
+    27	      total += value.byteLength;
+    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
+    29	      chunks.push(value);
+    30	    }
+    31	    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
+    32	    return JSON.parse(new TextDecoder().decode(buf));
+    33	  } finally { clearTimeout(t); }
+    34	}
+    35	async function hubGql(c, query) {
+    36	  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
+    37	  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
+    38	  if (!j.data) throw new Error("hub graphql: no data");
+    39	  return j.data;
+    40	}
+    41	
+    42	/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
+    43	/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
+    44	///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
+    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
+    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
+    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
+    48	export function referencesNounsProposal(text, nounsId) {
+    49	  const id = Number(nounsId);
+    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
+    51	  const s = String(text || "");
+    52	  if (!s) return false;
+    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
+    54	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
+    55	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
+    56	    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
+    57	    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
+    58	    let u;
+    59	    try { u = new URL(trimmed); } catch { continue; }
+    60	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
+    61	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
+    62	  }
+    63	  return false;
+    64	}
+    65	
+    66	export async function resolveMappings(c, pc, activeNounsIds = []) {
+    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+    68	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
+    69	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
+    70	  const found = new Map(); // nounsId -> snapId
+    71	  if (data.proposals.length) {
+    72	    const res = await pc.multicall({
+    73	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
+    74	      allowFailure: false,
+    75	    });
+    76	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
+    77	  }
+    78	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
+    79	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
+    80	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
+    81	  if (missing.length) {
+    82	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
+    83	    const need = [];
+    84	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
+    85	    if (need.length) {
+    86	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
+    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+    88	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
+    89	      for (const n of need) {
+    90	        const p = byHash.get(n.hash);
+    91	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
+    92	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
+    93	      }
+    94	    }
+    95	  }
+    96	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
+    97	    const m = meta.get(snapId) || {};
+    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
+    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
+   100	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
+   101	    // 侵害)は検出できない。過信しないこと。
+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
+   104	  });
+   105	  return { mappings, unresolved };
+   106	}
+   107	
+   108	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
+   109	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
+   110	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
+   111	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
+   112	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
+   113	  const send = []; const skipped = [];
+   114	  let advance = cursor; let blocked = false;
+   115	  for (let i = 0; i < rows.length; i++) {
+   116	    const r = rows[i]; const rec = recs[i];
+   117	    const created = Number(r.created);
+   118	    const tokens = tokenCounts[i] ?? 0;
+   119	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
+   120	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
+   121	    const exists = !!rec[0];
+   122	    const recTs = Number(rec[3] ?? 0);
+   123	    const isNew = !exists || created > recTs;
+   124	    const needSupplement = exists && created === recTs && uncounted > 0;
+   125	    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
+   126	    if (isSkippable) {
+   127	      if (tokens === 0 || deadLetters.has(r.ipfs)) skipped.push(r);
+   128	      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
+   129	      continue;
+   130	    }
+     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
+     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
+     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
+     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
+     5	import { keccak256, stringToBytes } from "viem";
+     6	import { makeStore } from "./store.js";
+     7	
+     8	async function notify(c, text) {
+     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
+    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
+    11	  try {
+    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
+    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
+    14	    return true;
+    15	  }
+    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
+    17	}
+    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
+    19	
+    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
+    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
+    22	async function queueNotify(c, store, text) {
+    23	  if (await notify(c, text)) return true;
+    24	  const k = `${store.prefix}pendingnotes`;
+    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
+    26	  arr.push({ text, at: Date.now() });
+    27	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
+    28	  return false;
+    29	}
+    30	async function flushPendingNotes(c, store) {
+    31	  const k = `${store.prefix}pendingnotes`;
+    32	  let arr;
+    33	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
+    34	  if (!Array.isArray(arr) || !arr.length) return;
+    35	  const rest = [];
+    36	  for (const n of arr) {
+    37	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
+    38	    if (!(await notify(c, n.text))) rest.push(n);
+    39	  }
+    40	  if (rest.length !== arr.length) {
+    41	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
+    42	    else await store.kvRaw.delete(k);
+    43	  }
+    44	}
+    45	const WORDS = ["反対", "賛成", "棄権"];
+    46	
+    47	function isContractRevert(e) {
+    48	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
+    49	  let x = e;
+    50	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
+    51	  return false;
+    52	}
+    53	
+    54	async function announceNew(c, pc, store, p, block, snapInfo) {
+    55	  const prev = await store.getAnnounced(p.id);
+    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
+    57	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
+    58	  const mg = await metagovInfo(c, pc, p.id);
+    59	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
+    60	  if (c.snapshotSpace) {
+    61	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
+    62	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
+    63	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
+    64	    const lines = [
+    65	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
+    66	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
+    67	      `締切: ${jst} ごろ (block ${mg.deadline})`,
+    68	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
+    69	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
+    70	    ];
+    71	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
+    72	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
+    73	    return;
+    74	  }
+    75	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
+    76	  const deadlineBlock = mg.deadline || p.endBlock;
+    77	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
+    78	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
+    79	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
+    80	  if (await notify(c, [
+    81	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
+    82	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
+    83	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
+    84	    `投票ページ: ${c.publicUrl}`,
+    85	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
+    86	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
+    87	}
+    88	
+    89	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
+    90	const FORCE_LIST_MS = 20 * 60 * 1000;
+    91	async function loadVotes(store, proposalId, force) {
+    92	  const sum = await store.getSummary(proposalId);
+    93	  const dirty = await store.dirtyAt(proposalId);
+    94	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
+    95	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
+    96	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
+    97	  const listed = await store.listVoteSummaries(proposalId);
+    98	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
+    99	  await store.putSummary(proposalId, summaries, listedAt);
+   100	  return { summaries, listedAt };
+   101	}
+   102	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
+   103	function setStatus(summaries, voter, patch) {
+   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
+   105	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
+   106	}
+   107	async function flushSummary(store, proposalId, summaries) {
+   108	  const sum = await store.getSummary(proposalId);
+   109	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
+   110	}
+   111	
+   112	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
+   113	async function reconcileSent(c, pc, store, proposalId, summaries) {
+   114	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
+   115	  if (!sent.length) return false;
+   116	  const byTx = new Map();
+   117	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
+   118	  let changed = false;
+   119	  for (const [tx, vs] of byTx) {
+   120	    let rc = null;
+   121	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
+   122	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
+   123	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
+   124	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
+   125	    for (let i = 0; i < vs.length; i++) {
+   126	      const v = vs[i];
+   127	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
+   128	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
+   129	    }
+   130	    changed = true;
+   131	    if (rc && rc.status === "success") {
+   132	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
+   133	      const mg = await metagovInfo(c, pc, proposalId);
+   134	      const sent = await queueNotify(c, store, [
+   135	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
+   136	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+   137	        `tx: ${explorerTx(c, tx)}`,
+   138	      ].join("\n"));
+   139	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
+   140	    } else {
+   141	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
+   142	    }
+   143	  }
+   144	  if (changed) await flushSummary(store, proposalId, summaries);
+   145	  return changed;
+   146	}
+   147	
+   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
+   149	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
+   150	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
+   151	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
+   152	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
+   153	  const sentK = `${store.prefix}snapsent:${nounsId}`;
+   154	  const pending = await store.kvRaw.get(sentK, "json");
+   155	  if (pending) {
+   156	    let allMined = true, anySuccess = false, gasTotal = 0n;
+   157	    for (const tx of pending.txs) {
+   158	      let rc = null;
+   159	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
+   160	      if (!rc) { allMined = false; continue; }
+   161	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
+   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
+   163	    }
+   164	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
+   165	    await store.kvRaw.delete(sentK);
+   166	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
+   167	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
+   168	      const mg = await metagovInfo(c, pc, nounsId);
+   169	      const sent = await queueNotify(c, store, [
+   170	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
+   171	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+   172	        `tx: ${explorerTx(c, pending.txs[0])}`,
+   173	      ].join("\n"));
+   174	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
+   175	    }
+   176	    return;
+   177	  }
+   178	
+   179	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
+   180	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
+   181	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
+   182	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
+   183	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
+   184	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
+   185	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
+   186	  const deadLetters = new Set(deadArr);
+   187	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
+   188	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
+   189	  const owners = await allOwners(c, pc);
+   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
+   191	  const tokenCounts = tokensByRow.map((ids) => ids.length);
+   192	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
+   193	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
+   194	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
+   195	  const votedByToken = new Map();
+   196	  for (let start = 0; start < checkTokenIds.length; start += 200) {
+   197	    const ids = checkTokenIds.slice(start, start + 200);
+   198	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
+   199	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
+   200	  }
+   201	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
+   202	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
+   203	  const batches = rush ? c.rushBatches : 1;
+   204	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
+   205	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
+   206	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
+   207	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
+   208	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
+   209	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
+   210	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
+   211	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
+   212	
+   213	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
+   214	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
+   215	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
+   216	  for (const { row, index } of send) {
+   217	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
+   218	    if (!env) {
+   219	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
+   220	      if (fails[row.ipfs] >= 20) {
+   221	        deadArr.push(row.ipfs); deadChanged = true;
+   222	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
+   223	      }
+   224	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
+   225	    }
+   226	    const m = env.data.message;
+   227	    const tokenIds = [];
+   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
+   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
+   230	    args.push(arg); cidOf.set(arg, row.ipfs);
+   231	  }
+   232	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
+   233	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
+   234	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
+   235	  if (!args.length) return;
+   236	
+   237	  const txs = []; let count = 0;
+   238	  for (let b = 0; b < batches; b++) {
+   239	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
+   240	    if (!chunk.length) break;
+   241	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
+   242	    catch (e) {
+   243	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
+   244	      const good = [];
+   245	      for (const a2 of chunk.slice(0, 10)) {
+   246	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
+   247	        catch (e2) {
+   248	          const cid = cidOf.get(a2);
+   249	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
+   250	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
+   251	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
+   252	          }
+   253	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
+   254	        }
+   255	      }
+   256	      if (!good.length) continue;
+   257	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
+   258	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
+   259	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
+   260	      catch (e3) {
+   261	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
+   262	        good.length = 1;
+   263	      }
+   264	      chunk.length = 0; chunk.push(...good);
+   265	    }
+   266	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
+   267	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
+   268	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
+   269	    txs.push(hash); count += chunk.length;
+   270	  }
+   271	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
+   272	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
+   273	}
+   274	
+   275	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
+   276	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
+   277	  const { summaries } = await loadVotes(store, proposalId, rush);
+   278	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
+   279	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
+   280	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
+   281	  let touched = false;
+   282	  for (let b = 0; b < batches; b++) {
+   283	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
+   284	    if (!pendingSummaries.length) break;
+   285	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
+   286	    const pending = [];
+   287	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
+   288	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
+   289	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
+   290	    const cands = [];
+   291	    for (let i = 0; i < pending.length; i++) {
+   292	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
+   293	      cands.push(pending[i]);
+   294	    }
+   295	    if (!cands.length) continue;
+   296	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
+   297	    let good = cands;
+   298	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
+   299	    catch (e) {
+   300	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
+   301	      good = [];
+   302	      for (const v of cands.slice(0, 10)) {
+   303	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
+   304	        catch (e2) {
+   305	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
+   306	        }
+   307	      }
+   308	      if (!good.length) continue;
+   309	    }
+   310	    const args = good.map(toArg);
+   311	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
+   312	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
+   313	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
+   314	    const sentAt = new Date().toISOString();
+   315	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
+   316	    touched = true;
+   317	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
+   318	      await new Promise((r) => setTimeout(r, 1500));
+   319	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
+   320	    }
+   321	  }
+   322	  if (touched) await flushSummary(store, proposalId, summaries);
+   323	  // receipt は待たない(次回 tick の reconcile で確定・通知)
+   324	}
+   325	
+   326	async function maybeExecute(c, pc, wc, store, p, block, mg) {
+   327	  const ex = await store.getExecuted(p.id);
+   328	  if (ex && ex.pending && ex.tx) {
+   329	    // 送信済み・未確定の execute を確定
+   330	    let rc = null;
+   331	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
+   332	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
+   333	    const info = await metagovInfo(c, pc, p.id);
+   334	    if (rc && rc.status === "success") {
+   335	      if (info.executed) {
+   336	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
+   337	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
+   338	        await notify(c, [
+   339	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
+   340	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
+   341	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
+   342	          `tx: ${explorerTx(c, ex.tx)}`,
+   343	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
+   344	        ].filter(Boolean).join("\n"));
+   345	      } else {
+   346	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
+   347	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
+   348	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
+   349	      }
+   350	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
+   351	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
+   352	    return;
+   353	  }
+   354	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
+   355	  if (ex && !ex.shadow) return;
+   356	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
+   357	  if (mg.deadline === 0 || block < mg.deadline) return;
+   358	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
+   359	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
+   360	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
+   361	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
+   362	    return;
+   363	  }
+   364	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
+   365	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
+   366	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
+   367	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
+   368	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
+   369	}
+   370	
+   371	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
+   372	async function checkBalance(c, pc, wc, store) {
+   373	  const threshold = Number(c.lowBalanceEth);
+   374	  const checks = [];
+   375	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
+   376	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
+   377	  for (const ck of checks) {
+   378	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
+   379	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
+   380	    if (await store.getFlag(ck.key)) continue;
+   381	    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
+   382	    if (sent) await store.setFlag(ck.key, 86400);
+   383	  }
+   384	}
+   385	
+   386	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
+   387	async function reconcileRecent(c, pc, wc, store, proposals) {
+   388	  for (const p of proposals.slice(0, 15)) {
+   389	    try {
+   390	      const pid = String(p.id);
+   391	      const sum = await store.getSummary(pid);
+   392	      if (sum.votes.some((v) => v.txStatus === "sent")) {
+   393	        const summaries = [...sum.votes];
+   394	        await reconcileSent(c, pc, store, pid, summaries);
+   395	      }
+   396	      const ex = await store.getExecuted(pid);
+   397	      if (ex && ex.pending && ex.tx) {
+   398	        const mg = await metagovInfo(c, pc, pid);
+   399	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
+   400	      }
+   401	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
+   402	  }
+   403	}
+   404	
+   405	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
+   406	let lastErrNotify = 0;
+   407	export async function notifyError(c, where, e) {
+   408	  const msg = (e && (e.shortMessage || e.message)) || String(e);
+   409	  console.error(`[${where}]`, msg);
+   410	  if (Date.now() - lastErrNotify < 3600 * 1000) return;
+   411	  lastErrNotify = Date.now();
+   412	  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
+   413	}
+   414	
+   415	let lastBalanceCheck = 0;
+   416	let spaceCheckedAt = 0;
+   417	
+   418	// ---- テスト用フック(本番経路では未使用) ----
+   419	// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
+   420	// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
+   421	let _clients = clients;
+   422	export function __setClientsForTests(f) { _clients = f || clients; }
+   423	export function __resetWorkerStateForTests(o = {}) {
+   424	  lastErrNotify = o.errNotifiedAt ?? 0;
+   425	  lastBalanceCheck = o.balanceCheckedAt ?? 0;
+   426	  spaceCheckedAt = o.spaceCheckedAt ?? 0;
+   427	}
+   428	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
+   429	export async function tick(env) {
+   430	  const c = cfg(env);
+   431	  const { publicClient: pc, walletClient: wc } = _clients(c);
+   432	  const store = makeStore(env.STATE, storeNs(c));
+   433	  try {
+   434	    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
+   435	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
+   436	    const { block, proposals } = await recentProposals(c, pc);
+   437	    await reconcileRecent(c, pc, wc, store, proposals);
+   438	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
+   439	    let snapByNouns = new Map();
+   440	    let unresolvedIds = new Set();
+   441	    let mappingsResolved = false;
+   442	    if (c.snapshotSpace) {
+   443	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
+   444	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
+   445	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
+   446	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
+   447	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
+   448	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
+   449	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
+   450	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
+   451	        ], allowFailure: false });
+   452	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
+   453	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
+   454	        if (c.network === "mainnet") {
+   455	          const relayerAddr = wc?.account?.address || null;
+   456	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
+   457	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
+   458	        }
+   459	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
+   460	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
+   461	        const floor = Math.max(300, c.minRegistrationDelay);
+   462	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
+   463	        spaceCheckedAt = Date.now();
+   464	      }
+   465	      try {
+   466	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
+   467	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
+   468	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
+   469	        unresolvedIds = new Set((unresolved || []).map(Number));
+   470	        mappingsResolved = true;
+   471	      }
+   472	      catch (e) { await notifyError(c, "snapshot hub", e); }
+   473	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
+   474	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
+   475	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
+   476	      // 最終結果として確定してしまう。
+   477	      if (!mappingsResolved) return;
+   478	    }
+   479	    for (const p of proposals) {
+   480	      if (p.state !== 0 && p.state !== 1) continue;
+   481	      try {
+   482	        const snapInfo = snapByNouns.get(p.id) || null;
+   483	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
+   484	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
+   485	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
+   486	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
+   487	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
+   488	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
+   489	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
+   490	          }
+   491	          continue;
+   492	        }
+   493	        const mg = await metagovInfo(c, pc, p.id);
+   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
+   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
+   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
+   497	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
+   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
+   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
+   500	        }
+   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
+   502	        let timelineBad = false;
+   503	        if (c.snapshotSpace && snapInfo) {
+   504	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
+   505	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
+   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
+   507	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
+   508	          }
+   509	        }
+   510	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
+   511	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
+   512	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
+   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
+   514	          await announceNew(c, pc, store, p, block, snapInfo);
+   515	        }
+   516	        if (linkBad && c.network === "mainnet") continue;
+   517	        if (timelineBad && c.network === "mainnet") continue;
+   518	        if (!wc) continue;
+   519	        if (block < mg.deadline) {
+   520	          if (c.snapshotSpace) {
+
+exec
+/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '1,230p'
+nl -ba relayer-cf/src/worker.js | sed -n '479,590p'
+nl -ba relayer-cf/src/index.js | sed -n '1,220p'
+nl -ba relayer-cf/src/store.js | sed -n '1,280p'" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
+     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
+     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
+     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
+     5	import { keccak256, stringToBytes } from "viem";
+     6	import { makeStore } from "./store.js";
+     7	
+     8	async function notify(c, text) {
+     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
+    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
+    11	  try {
+    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
+    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
+    14	    return true;
+    15	  }
+    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
+    17	}
+    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
+    19	
+    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
+    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
+    22	async function queueNotify(c, store, text) {
+    23	  if (await notify(c, text)) return true;
+    24	  const k = `${store.prefix}pendingnotes`;
+    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
+    26	  arr.push({ text, at: Date.now() });
+    27	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
+    28	  return false;
+    29	}
+    30	async function flushPendingNotes(c, store) {
+    31	  const k = `${store.prefix}pendingnotes`;
+    32	  let arr;
+    33	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
+    34	  if (!Array.isArray(arr) || !arr.length) return;
+    35	  const rest = [];
+    36	  for (const n of arr) {
+    37	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
+    38	    if (!(await notify(c, n.text))) rest.push(n);
+    39	  }
+    40	  if (rest.length !== arr.length) {
+    41	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
+    42	    else await store.kvRaw.delete(k);
+    43	  }
+    44	}
+    45	const WORDS = ["反対", "賛成", "棄権"];
+    46	
+    47	function isContractRevert(e) {
+    48	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
+    49	  let x = e;
+    50	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
+    51	  return false;
+    52	}
+    53	
+    54	async function announceNew(c, pc, store, p, block, snapInfo) {
+    55	  const prev = await store.getAnnounced(p.id);
+    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
+    57	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
+    58	  const mg = await metagovInfo(c, pc, p.id);
+    59	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
+    60	  if (c.snapshotSpace) {
+    61	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
+    62	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
+    63	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
+    64	    const lines = [
+    65	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
+    66	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
+    67	      `締切: ${jst} ごろ (block ${mg.deadline})`,
+    68	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
+    69	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
+    70	    ];
+    71	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
+    72	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
+    73	    return;
+    74	  }
+    75	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
+    76	  const deadlineBlock = mg.deadline || p.endBlock;
+    77	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
+    78	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
+    79	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
+    80	  if (await notify(c, [
+    81	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
+    82	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
+    83	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
+    84	    `投票ページ: ${c.publicUrl}`,
+    85	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
+    86	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
+    87	}
+    88	
+    89	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
+    90	const FORCE_LIST_MS = 20 * 60 * 1000;
+    91	async function loadVotes(store, proposalId, force) {
+    92	  const sum = await store.getSummary(proposalId);
+    93	  const dirty = await store.dirtyAt(proposalId);
+    94	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
+    95	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
+    96	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
+    97	  const listed = await store.listVoteSummaries(proposalId);
+    98	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
+    99	  await store.putSummary(proposalId, summaries, listedAt);
+   100	  return { summaries, listedAt };
+   101	}
+   102	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
+   103	function setStatus(summaries, voter, patch) {
+   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
+   105	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
+   106	}
+   107	async function flushSummary(store, proposalId, summaries) {
+   108	  const sum = await store.getSummary(proposalId);
+   109	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
+   110	}
+   111	
+   112	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
+   113	async function reconcileSent(c, pc, store, proposalId, summaries) {
+   114	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
+   115	  if (!sent.length) return false;
+   116	  const byTx = new Map();
+   117	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
+   118	  let changed = false;
+   119	  for (const [tx, vs] of byTx) {
+   120	    let rc = null;
+   121	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
+   122	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
+   123	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
+   124	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
+   125	    for (let i = 0; i < vs.length; i++) {
+   126	      const v = vs[i];
+   127	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
+   128	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
+   129	    }
+   130	    changed = true;
+   131	    if (rc && rc.status === "success") {
+   132	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
+   133	      const mg = await metagovInfo(c, pc, proposalId);
+   134	      const sent = await queueNotify(c, store, [
+   135	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
+   136	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+   137	        `tx: ${explorerTx(c, tx)}`,
+   138	      ].join("\n"));
+   139	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
+   140	    } else {
+   141	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
+   142	    }
+   143	  }
+   144	  if (changed) await flushSummary(store, proposalId, summaries);
+   145	  return changed;
+   146	}
+   147	
+   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
+   149	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
+   150	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
+   151	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
+   152	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
+   153	  const sentK = `${store.prefix}snapsent:${nounsId}`;
+   154	  const pending = await store.kvRaw.get(sentK, "json");
+   155	  if (pending) {
+   156	    let allMined = true, anySuccess = false, gasTotal = 0n;
+   157	    for (const tx of pending.txs) {
+   158	      let rc = null;
+   159	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
+   160	      if (!rc) { allMined = false; continue; }
+   161	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
+   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
+   163	    }
+   164	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
+   165	    await store.kvRaw.delete(sentK);
+   166	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
+   167	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
+   168	      const mg = await metagovInfo(c, pc, nounsId);
+   169	      const sent = await queueNotify(c, store, [
+   170	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
+   171	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
+   172	        `tx: ${explorerTx(c, pending.txs[0])}`,
+   173	      ].join("\n"));
+   174	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
+   175	    }
+   176	    return;
+   177	  }
+   178	
+   179	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
+   180	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
+   181	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
+   182	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
+   183	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
+   184	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
+   185	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
+   186	  const deadLetters = new Set(deadArr);
+   187	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
+   188	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
+   189	  const owners = await allOwners(c, pc);
+   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
+   191	  const tokenCounts = tokensByRow.map((ids) => ids.length);
+   192	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
+   193	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
+   194	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
+   195	  const votedByToken = new Map();
+   196	  for (let start = 0; start < checkTokenIds.length; start += 200) {
+   197	    const ids = checkTokenIds.slice(start, start + 200);
+   198	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
+   199	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
+   200	  }
+   201	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
+   202	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
+   203	  const batches = rush ? c.rushBatches : 1;
+   204	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
+   205	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
+   206	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
+   207	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
+   208	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
+   209	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
+   210	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
+   211	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
+   212	
+   213	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
+   214	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
+   215	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
+   216	  for (const { row, index } of send) {
+   217	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
+   218	    if (!env) {
+   219	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
+   220	      if (fails[row.ipfs] >= 20) {
+   221	        deadArr.push(row.ipfs); deadChanged = true;
+   222	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
+   223	      }
+   224	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
+   225	    }
+   226	    const m = env.data.message;
+   227	    const tokenIds = [];
+   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
+   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
+   230	    args.push(arg); cidOf.set(arg, row.ipfs);
+   479	    for (const p of proposals) {
+   480	      if (p.state !== 0 && p.state !== 1) continue;
+   481	      try {
+   482	        const snapInfo = snapByNouns.get(p.id) || null;
+   483	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
+   484	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
+   485	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
+   486	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
+   487	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
+   488	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
+   489	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
+   490	          }
+   491	          continue;
+   492	        }
+   493	        const mg = await metagovInfo(c, pc, p.id);
+   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
+   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
+   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
+   497	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
+   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
+   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
+   500	        }
+   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
+   502	        let timelineBad = false;
+   503	        if (c.snapshotSpace && snapInfo) {
+   504	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
+   505	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
+   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
+   507	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
+   508	          }
+   509	        }
+   510	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
+   511	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
+   512	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
+   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
+   514	          await announceNew(c, pc, store, p, block, snapInfo);
+   515	        }
+   516	        if (linkBad && c.network === "mainnet") continue;
+   517	        if (timelineBad && c.network === "mainnet") continue;
+   518	        if (!wc) continue;
+   519	        if (block < mg.deadline) {
+   520	          if (c.snapshotSpace) {
+   521	            if (snapInfo) {
+   522	              const rush = shouldRushSubmit(c, block, mg.deadline);
+   523	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
+   524	            }
+   525	          }
+   526	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
+   527	        } else if (!c.snapshotSpace || snapInfo) {
+   528	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
+   529	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
+   530	          await maybeExecute(c, pc, wc, store, p, block, mg);
+   531	        }
+   532	      } catch (e) {
+   533	        await notifyError(c, `worker prop ${p.id}`, e);
+   534	      }
+   535	    }
+   536	  } catch (e) {
+   537	    await notifyError(c, "worker tick", e);
+   538	  }
+   539	}
+   540	export { notify };
+     1	// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信(public/_headers で CSP)。
+     2	import { Hono } from "hono";
+     3	import { recoverTypedDataAddress, encodeFunctionData } from "viem";
+     4	import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
+     5	import { makeStore } from "./store.js";
+     6	import { tick, notifyError } from "./worker.js";
+     7	
+     8	const app = new Hono();
+     9	
+    10	// API 応答の防御ヘッダー
+    11	app.use("*", async (ctx, next) => {
+    12	  await next();
+    13	  ctx.header("X-Content-Type-Options", "nosniff");
+    14	  ctx.header("X-Frame-Options", "DENY");
+    15	  ctx.header("Referrer-Policy", "no-referrer");
+    16	  ctx.header("Cache-Control", "no-store");
+    17	});
+    18	
+    19	app.get("/api/config", (ctx) => {
+    20	  const c = cfg(ctx.env);
+    21	  const snap = !!c.snapshotSpace;
+    22	  // relayer アドレスは tx 送信時にオンチェーンで公開される情報。照合スクリプト(check-deploy)が
+    23	  // 「稼働中 Worker の鍵」と「意図した鍵」の一致を機械確認できるよう返す(秘密鍵は含まない)。
+    24	  const relayer = clients(c).account?.address || null;
+    25	  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
+    26	});
+    27	
+    28	app.get("/api/proposals", async (ctx) => {
+    29	  const c = cfg(ctx.env);
+    30	  // Cache API(コロ単位)で 30 秒キャッシュ。クエリ差でキャッシュを迂回されないよう closed は 0/8 に正規化してキーにする
+    31	  const closedN = ctx.req.query("closed") ? 8 : 0;
+    32	  const cache = caches.default;
+    33	  const cacheKey = new Request(`https://cache.local/api/proposals?closed=${closedN}&n=${c.network}`);
+    34	  const hit = await cache.match(cacheKey);
+    35	  if (hit) return hit;
+    36	  const { publicClient: pc } = clients(c);
+    37	  const store = makeStore(ctx.env.STATE, storeNs(c));
+    38	  const { block, proposals } = await recentProposals(c, pc);
+    39	  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
+    40	  const limited = closedN ? wanted.slice(0, closedN) : wanted;
+    41	  const snapmap = c.snapshotSpace ? ((await ctx.env.STATE.get(`${store.prefix}snapmap`, "json")) || {}) : {};
+    42	  const snapByNouns = Object.fromEntries(Object.entries(snapmap).map(([k, v]) => [v, k]));
+    43	  const list = await Promise.all(limited.map(async (p) => {
+    44	    const votable = p.state === 0 || p.state === 1;
+    45	    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
+    46	    const snapshotProposalId = snapByNouns[p.id] || null;
+    47	    const votes = sum.votes;
+    48	    const acceptUntil = mg.deadline ? acceptDeadline(c, mg.deadline) : 0;
+    49	    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
+    50	  }));
+    51	  const res = ctx.json({ block, proposals: list });
+    52	  const toCache = new Response(res.body, res); toCache.headers.set("Cache-Control", "public, max-age=30");
+    53	  ctx.executionCtx.waitUntil(cache.put(cacheKey, toCache.clone()));
+    54	  return toCache;
+    55	});
+    56	
+    57	app.get("/api/tokens/:address", async (ctx) => {
+    58	  const c = cfg(ctx.env);
+    59	  const { publicClient: pc } = clients(c);
+    60	  const store = makeStore(ctx.env.STATE, storeNs(c));
+    61	  if (!/^0x[0-9a-fA-F]{40}$/.test(ctx.req.param("address"))) return ctx.json({ error: "bad address" }, 400); // L-08: 入力エラーは 400、障害通知しない
+    62	  const address = getAddress(ctx.req.param("address"));
+    63	  const ids = await tokensOf(c, pc, address);
+    64	  const proposalId = ctx.req.query("proposalId");
+    65	  let voted = {}, hasVoted = false, pending = null;
+    66	  if (proposalId && /^\d{1,10}$/.test(proposalId)) {
+    67	    const pid = BigInt(proposalId);
+    68	    const res = await pc.multicall({ contracts: [
+    69	      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
+    70	      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
+    71	    ], allowFailure: false });
+    72	    hasVoted = res[0];
+    73	    ids.forEach((id, i) => { voted[id] = res[i + 1]; });
+    74	    const rec = await store.getVote(String(pid), address);
+    75	    if (rec) {
+    76	      const st = (await store.getSummary(String(pid))).votes.find((v) => v.voter.toLowerCase() === address.toLowerCase()) || {};
+    77	      pending = { support: rec.support, tokenIds: rec.tokenIds, tx: st.tx, txStatus: st.txStatus, receivedAt: rec.receivedAt };
+    78	    }
+    79	  }
+    80	  return ctx.json({ address, tokenIds: ids, voted, hasVoted, pending });
+    81	});
+    82	
+    83	// M-01R: 本文をストリームで最大 64KB まで読む(Content-Length に依存しない)
+    84	async function readJsonLimited(req, limit = 65536) {
+    85	  const reader = req.body?.getReader();
+    86	  if (!reader) return null;
+    87	  const chunks = []; let total = 0;
+    88	  while (true) {
+    89	    const { done, value } = await reader.read();
+    90	    if (done) break;
+    91	    total += value.byteLength;
+    92	    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
+    93	    chunks.push(value);
+    94	  }
+    95	  const buf = new Uint8Array(total); let o = 0; for (const ch of chunks) { buf.set(ch, o); o += ch.byteLength; }
+    96	  return JSON.parse(new TextDecoder().decode(buf));
+    97	}
+    98	
+    99	app.post("/api/vote", async (ctx) => {
+   100	  const c = cfg(ctx.env);
+   101	  if (c.snapshotSpace) return ctx.json({ error: `voting happens on Snapshot: https://snapshot.box/#/s:${c.snapshotSpace}`, code: "snapshot_mode" }, 410);
+   102	  const { publicClient: pc } = clients(c);
+   103	  const store = makeStore(ctx.env.STATE, storeNs(c));
+   104	  let body;
+   105	  try { body = await readJsonLimited(ctx.req.raw); } catch (e) { return ctx.json({ error: e.message === "payload too large" ? "payload too large" : "bad json" }, e.message === "payload too large" ? 413 : 400); }
+   106	  const { proposalId, support, tokenIds, signature } = body || {};
+   107	  if (proposalId === undefined || !/^\d{1,10}$/.test(String(proposalId)) || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || !tokenIds.length || typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return ctx.json({ error: "bad request" }, 400);
+   108	  if (tokenIds.length > 300) return ctx.json({ error: "too many tokenIds" }, 400);
+   109	  // Low: 正規化(BigInt 化した正規値で検証・保存)
+   110	  const pid = BigInt(String(proposalId));
+   111	  const pidKey = pid.toString();
+   112	  const seen = new Set(); const ids = [];
+   113	  for (const x of tokenIds) {
+   114	    if (!/^\d{1,5}$/.test(String(x))) return ctx.json({ error: `invalid tokenId ${x}` }, 400);
+   115	    const n = BigInt(String(x));
+   116	    if (n < 1n || n > 2100n || seen.has(n.toString())) return ctx.json({ error: `invalid or duplicate tokenId ${x}` }, 400);
+   117	    seen.add(n.toString()); ids.push(n);
+   118	  }
+   119	  let voter;
+   120	  try { voter = await recoverTypedDataAddress({ domain: domain(c), types: VOTE_TYPES, primaryType: "Vote", message: { proposalId: pid, support: Number(support), tokenIds: ids }, signature }); }
+   121	  catch { return ctx.json({ error: "invalid signature" }, 400); }
+   122	  // 署名者ごとの簡易レート制限(60 秒に 1 回。KV 最小 TTL)
+   123	  if (await store.getFlag(`rl:${voter.toLowerCase()}`)) return ctx.json({ error: "too many requests, retry later" }, 429);
+   124	  const owners = await allOwners(c, pc);
+   125	  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
+   126	  const [state, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
+   127	    { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [pid] },
+   128	    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
+   129	    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
+   130	    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
+   131	  ], allowFailure: false }).then((r) => [Number(r[0]), Number(r[1]), r[2], r[3]]);
+   132	  const block = Number(await pc.getBlockNumber());
+   133	  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
+   134	  if (hasVoted) return ctx.json({ error: "already voted on-chain" }, 400);
+   135	  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
+   136	  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
+   137	  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
+   138	  // M-14R: 受付容量(締切までに確実に投函できる数)を超える場合は受け付けない
+   139	  const sumNow = await store.getSummary(pidKey);
+   140	  const pendingNow = sumNow.votes.filter((v) => !v.tx && !v.dropped).length;
+   141	  const capacity = submitCapacity(c, block, deadline);
+   142	  if (pendingNow >= capacity) return ctx.json({ error: "relayer capacity before the deadline is full; please submit on-chain yourself (manual submit button / castVote)", code: "capacity_full", pending: pendingNow, capacity }, 400);
+   143	  const existing = await store.getVote(pidKey, voter);
+   144	  if (existing) { const st = sumNow.votes.find((v) => v.voter.toLowerCase() === voter.toLowerCase()); if (st && st.tx) return ctx.json({ error: "already submitted" }, 400); }
+   145	  await store.setFlag(`rl:${voter.toLowerCase()}`, 60);
+   146	  await store.putVote(pidKey, voter, { support: Number(support), tokenIds: ids.map(String), signature, receivedAt: new Date().toISOString() });
+   147	  await store.markDirty(pidKey); // ワーカーが次回 tick で list → サマリー更新
+   148	  console.log(`[api] vote received: prop ${pidKey} ${voter} support=${support} tokens=${ids.length}`);
+   149	  return ctx.json({ ok: true, voter, proposalId: pidKey, support: Number(support), tokenIds: ids.map(String) });
+   150	});
+   151	
+   152	// 署名の公開: 誰でも取得・投函できる。?calldata=1 でいま通る署名(最大 MAX_BATCH 件)の calldata と実見積りガス
+   153	app.get("/api/signatures/:id", async (ctx) => {
+   154	  const c = cfg(ctx.env);
+   155	  if (c.snapshotSpace) return ctx.json({ error: "snapshot mode: votes are public on the Snapshot hub", code: "snapshot_mode" }, 410);
+   156	  const { publicClient: pc, account } = clients(c);
+   157	  const store = makeStore(ctx.env.STATE, storeNs(c));
+   158	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
+   159	  const id = BigInt(ctx.req.param("id")).toString();
+   160	  const summaries = (await store.getSummary(id)).votes; // 公開 API は list しない(サマリーはワーカーが更新)
+   161	  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES,
+   162	    pending: summaries.filter((v) => !v.tx && !v.dropped), submitted: summaries.filter((v) => v.tx), dropped: summaries.filter((v) => v.dropped) };
+   163	  if (ctx.req.query("calldata") && out.pending.length) {
+   164	    const cand = out.pending.slice(0, c.maxBatch);
+   165	    const fulls = [];
+   166	    for (const s of cand) { const v = await store.getVote(id, s.voter); if (v) fulls.push({ voter: s.voter, ...v }); }
+   167	    const args = fulls.map((v) => ({ proposalId: BigInt(id), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature }));
+   168	    let good = args;
+   169	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args] }); }
+   170	    catch { good = []; for (const a of args.slice(0, 10)) { try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[a]] }); good.push(a); } catch {} } }
+   171	    out.submittable = good.length;
+   172	    out.remaining = out.pending.length - good.length;
+   173	    out.calldata = good.length ? encodeFunctionData({ abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good] }) : null;
+   174	    if (good.length) {
+   175	      try { const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good], account: account || undefined }); out.gasHint = Number((est * 14n) / 10n); }
+   176	      catch { out.gasHint = 200000 + 80000 * good.length + 8000 * good.reduce((a, v) => a + v.tokenIds.length, 0); }
+   177	    } else out.gasHint = 0;
+   178	  }
+   179	  // 署名本文も公開(誰でも投函できるように)。get のみ
+   180	  if (ctx.req.query("full")) { out.pendingFull = []; for (const s of out.pending.slice(0, c.maxBatch)) { const v = await store.getVote(id, s.voter); if (v) out.pendingFull.push({ voter: s.voter, ...v }); } }
+   181	  return ctx.json(out);
+   182	});
+   183	
+   184	app.get("/api/proposal/:id", async (ctx) => {
+   185	  const c = cfg(ctx.env);
+   186	  const { publicClient: pc } = clients(c);
+   187	  const store = makeStore(ctx.env.STATE, storeNs(c));
+   188	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
+   189	  const id = Number(ctx.req.param("id"));
+   190	  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
+   191	  return ctx.json({ id, metagov: mg, votes: sum.votes, executed });
+   192	});
+   193	
+   194	// 手動トリガ(TICK_TOKEN 設定時のみ有効)
+   195	app.post("/api/tick", async (ctx) => {
+   196	  if (!ctx.env.TICK_TOKEN) return ctx.json({ error: "disabled" }, 404);
+   197	  if (ctx.req.header("x-tick-token") !== ctx.env.TICK_TOKEN) return ctx.json({ error: "forbidden" }, 403);
+   198	  await tick(ctx.env);
+   199	  return ctx.json({ ok: true });
+   200	});
+   201	
+   202	// L-08: 内部障害(KV / RPC / 送信)だけ Discord 通知。入力起因の例外は 400 で返し通知しない
+   203	const INTERNAL_ERR = new Set(["HttpRequestError", "TimeoutError", "RpcRequestError", "InternalRpcError", "LimitExceededRpcError", "ResourceUnavailableRpcError"]);
+   204	function isInternalError(e) { return INTERNAL_ERR.has(e?.name) || /KV|Too many|limit|exceeded|network|fetch failed/i.test(e?.message || ""); }
+   205	function isClientError(e) { return ["InvalidAddressError", "SyntaxError", "SizeExceedsPaddingSizeError", "InvalidHexValueError"].includes(e?.name) || /^Address ".*" is invalid/.test(e?.message || ""); }
+   206	app.onError((e, ctx) => {
+   207	  if (isClientError(e)) return ctx.json({ error: "bad request" }, 400);
+   208	  console.error(e);
+   209	  if (isInternalError(e)) { try { const c = cfg(ctx.env); ctx.executionCtx.waitUntil(notifyError(c, `api ${new URL(ctx.req.url).pathname}`, e)); } catch {} }
+   210	  return ctx.json({ error: e.shortMessage || e.message }, 500);
+   211	});
+   212	
+   213	export default {
+   214	  fetch: app.fetch,
+   215	  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
+   216	};
+     1	// KV ストア(Cloudflare 無料枠: 書込み 1,000/日、list 1,000/日、読取 100,000/日、1 呼び出し 1,000 操作)
+     2	//  - 全キーは "<chainId>:<voter>:" で名前空間化(コントラクト再デプロイで混ざらない)
+     3	//  - 票: vote:{pid}:{voter}。値=本文(署名)、metadata=要約。一覧は list の metadata だけで作る(get は投函対象 ≤ MAX_BATCH 件のみ)
+     4	//  - サマリー sum:{pid}: ワーカーが list 結果から書く(listedAt 付き)。公開 API は get のみ
+     5	//  - dirty:{pid}: API が署名受付時に受付時刻を書く。ワーカーは「dirty > 前回 listedAt」なら再 list(削除しないので競合しない)
+     6	//  - inflight キーは持たない: 送信中は sum の txStatus:"sent" / executed.pending から毎 tick 検出
+     7	export function makeStore(kv, ns) {
+     8	  const P = ns ? `${ns}:` : "";
+     9	  const voteKey = (pid, voter) => `${P}vote:${pid}:${voter.toLowerCase()}`;
+    10	  // metadata は受付時の不変情報だけ(support/枚数/受付時刻)。投函状態(tx/txStatus/dropped/sentAt)は sum:{pid} だけが持つ(書込み削減・競合回避)
+    11	  const meta = (rec) => ({ s: rec.support, n: rec.tokenIds.length, at: rec.receivedAt });
+    12	  const fromMeta = (voter, m) => ({ voter, support: m.s, tokenCount: m.n, receivedAt: m.at });
+    13	  return {
+    14	    kvRaw: kv, prefix: P,
+    15	    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
+    16	    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec), { metadata: meta(rec) }); },
+    17	    /// list(metadata のみ、get なし)。ワーカー専用
+    18	    async listVoteSummaries(pid) {
+    19	      const out = []; let cursor;
+    20	      do {
+    21	        const r = await kv.list({ prefix: `${P}vote:${pid}:`, cursor });
+    22	        for (const k of r.keys) if (k.metadata) out.push(fromMeta(k.name.split(":").pop(), k.metadata));
+    23	        cursor = r.list_complete ? undefined : r.cursor;
+    24	      } while (cursor);
+    25	      return out;
+    26	    },
+    27	    summarize(voter, rec) { return fromMeta(voter, meta(rec)); },
+    28	    /// list 結果(新規 voter を含む)と既存サマリー(状態を含む)をマージ
+    29	    mergeSummaries(listed, existing) {
+    30	      const byVoter = new Map(existing.map((v) => [v.voter.toLowerCase(), v]));
+    31	      return listed.map((l) => { const e = byVoter.get(l.voter.toLowerCase()); return e ? { ...l, tx: e.tx, txStatus: e.txStatus, dropped: e.dropped, sentAt: e.sentAt } : l; });
+    32	    },
+    33	    async getSummary(pid) { return (await kv.get(`${P}sum:${pid}`, "json")) || { listedAt: 0, votes: [] }; },
+    34	    async putSummary(pid, votes, listedAt) { await kv.put(`${P}sum:${pid}`, JSON.stringify({ listedAt, votes })); },
+    35	    async markDirty(pid) { await kv.put(`${P}dirty:${pid}`, String(Date.now()), { expirationTtl: 86400 * 7 }); },
+    36	    async dirtyAt(pid) { return Number(await kv.get(`${P}dirty:${pid}`)) || 0; },
+    37	    async getExecuted(pid) { return kv.get(`${P}executed:${pid}`, "json"); },
+    38	    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`${P}executed:${pid}`); await kv.put(`${P}executed:${pid}`, JSON.stringify(rec)); },
+    39	    async getAnnounced(pid) { return kv.get(`${P}announced:${pid}`); },
+    40	    async putAnnounced(pid, v) { await kv.put(`${P}announced:${pid}`, v); },
+    41	    async getFlag(k) { return kv.get(`${P}flag:${k}`); },
+    42	    async setFlag(k, ttl) { await kv.put(`${P}flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
+    43	  };
+    44	}
+
+exec
+/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '225,330p'
+nl -ba relayer-cf/src/worker.js | sed -n '500,570p'
+nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '1,280p'
+nl -ba relayer-cf/test/link-check.test.mjs | sed -n '1,120p'" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+   225	    }
+   226	    const m = env.data.message;
+   227	    const tokenIds = [];
+   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
+   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
+   230	    args.push(arg); cidOf.set(arg, row.ipfs);
+   231	  }
+   232	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
+   233	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
+   234	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
+   235	  if (!args.length) return;
+   236	
+   237	  const txs = []; let count = 0;
+   238	  for (let b = 0; b < batches; b++) {
+   239	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
+   240	    if (!chunk.length) break;
+   241	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
+   242	    catch (e) {
+   243	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
+   244	      const good = [];
+   245	      for (const a2 of chunk.slice(0, 10)) {
+   246	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
+   247	        catch (e2) {
+   248	          const cid = cidOf.get(a2);
+   249	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
+   250	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
+   251	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
+   252	          }
+   253	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
+   254	        }
+   255	      }
+   256	      if (!good.length) continue;
+   257	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
+   258	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
+   259	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
+   260	      catch (e3) {
+   261	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
+   262	        good.length = 1;
+   263	      }
+   264	      chunk.length = 0; chunk.push(...good);
+   265	    }
+   266	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
+   267	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
+   268	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
+   269	    txs.push(hash); count += chunk.length;
+   270	  }
+   271	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
+   272	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
+   273	}
+   274	
+   275	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
+   276	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
+   277	  const { summaries } = await loadVotes(store, proposalId, rush);
+   278	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
+   279	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
+   280	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
+   281	  let touched = false;
+   282	  for (let b = 0; b < batches; b++) {
+   283	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
+   284	    if (!pendingSummaries.length) break;
+   285	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
+   286	    const pending = [];
+   287	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
+   288	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
+   289	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
+   290	    const cands = [];
+   291	    for (let i = 0; i < pending.length; i++) {
+   292	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
+   293	      cands.push(pending[i]);
+   294	    }
+   295	    if (!cands.length) continue;
+   296	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
+   297	    let good = cands;
+   298	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
+   299	    catch (e) {
+   300	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
+   301	      good = [];
+   302	      for (const v of cands.slice(0, 10)) {
+   303	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
+   304	        catch (e2) {
+   305	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
+   306	        }
+   307	      }
+   308	      if (!good.length) continue;
+   309	    }
+   310	    const args = good.map(toArg);
+   311	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
+   312	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
+   313	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
+   314	    const sentAt = new Date().toISOString();
+   315	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
+   316	    touched = true;
+   317	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
+   318	      await new Promise((r) => setTimeout(r, 1500));
+   319	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
+   320	    }
+   321	  }
+   322	  if (touched) await flushSummary(store, proposalId, summaries);
+   323	  // receipt は待たない(次回 tick の reconcile で確定・通知)
+   324	}
+   325	
+   326	async function maybeExecute(c, pc, wc, store, p, block, mg) {
+   327	  const ex = await store.getExecuted(p.id);
+   328	  if (ex && ex.pending && ex.tx) {
+   329	    // 送信済み・未確定の execute を確定
+   330	    let rc = null;
+   500	        }
+   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
+   502	        let timelineBad = false;
+   503	        if (c.snapshotSpace && snapInfo) {
+   504	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
+   505	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
+   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
+   507	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
+   508	          }
+   509	        }
+   510	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
+   511	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
+   512	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
+   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
+   514	          await announceNew(c, pc, store, p, block, snapInfo);
+   515	        }
+   516	        if (linkBad && c.network === "mainnet") continue;
+   517	        if (timelineBad && c.network === "mainnet") continue;
+   518	        if (!wc) continue;
+   519	        if (block < mg.deadline) {
+   520	          if (c.snapshotSpace) {
+   521	            if (snapInfo) {
+   522	              const rush = shouldRushSubmit(c, block, mg.deadline);
+   523	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
+   524	            }
+   525	          }
+   526	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
+   527	        } else if (!c.snapshotSpace || snapInfo) {
+   528	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
+   529	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
+   530	          await maybeExecute(c, pc, wc, store, p, block, mg);
+   531	        }
+   532	      } catch (e) {
+   533	        await notifyError(c, `worker prop ${p.id}`, e);
+   534	      }
+   535	    }
+   536	  } catch (e) {
+   537	    await notifyError(c, "worker tick", e);
+   538	  }
+   539	}
+   540	export { notify };
+     1	// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
+     2	// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
+     3	import { test, beforeEach } from "node:test";
+     4	import assert from "node:assert/strict";
+     5	import { keccak256, stringToBytes, parseEther } from "viem";
+     6	import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";
+     7	
+     8	const VOTER = "0x1000000000000000000000000000000000000001";
+     9	const PNOUNS = "0x1000000000000000000000000000000000000002";
+    10	const DAO = "0x1000000000000000000000000000000000000003";
+    11	const TOKEN = "0x1000000000000000000000000000000000000004";
+    12	const OWNER = "0x2000000000000000000000000000000000000001";
+    13	const REGISTRAR = "0x2000000000000000000000000000000000000002";
+    14	const RELAYER = "0x2000000000000000000000000000000000000003";
+    15	const SPACE = "earl-grey.eth";
+    16	const SNAP_ID = "0x" + "ab".repeat(32);
+    17	const SNAP_HASH = keccak256(stringToBytes(SNAP_ID));
+    18	const WEBHOOK = "https://discord.test/webhook";
+    19	const HUB = "https://hub.test";
+    20	
+    21	// ---- 偽 KV ----
+    22	function fakeKV() {
+    23	  const data = new Map(); const ops = [];
+    24	  return {
+    25	    data, ops,
+    26	    async get(k, type) { ops.push(["get", k]); const v = data.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
+    27	    async put(k, v) { ops.push(["put", k]); data.set(k, String(v)); },
+    28	    async delete(k) { ops.push(["delete", k]); data.delete(k); },
+    29	    async list({ prefix }) { ops.push(["list", prefix]); return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: null })), list_complete: true }; },
+    30	  };
+    31	}
+    32	
+    33	// ---- 偽 publicClient: functionName で応答を引く ----
+    34	function fakePC(h) {
+    35	  const calls = [];
+    36	  const one = (x) => { calls.push(x.functionName); const f = h[x.functionName]; if (!f) throw new Error(`fakePC: no handler for ${x.functionName}`); return f(x.args || []); };
+    37	  return {
+    38	    calls,
+    39	    async readContract(x) { return one(x); },
+    40	    async multicall({ contracts, allowFailure }) {
+    41	      return contracts.map((x) => {
+    42	        try { const r = one(x); return allowFailure ? { status: "success", result: r } : r; }
+    43	        catch (e) { if (allowFailure) return { status: "failure", error: e }; throw e; }
+    44	      });
+    45	    },
+    46	    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
+    47	    async getBalance() { calls.push("getBalance"); return parseEther("1"); },
+    48	    async getTransactionReceipt() { throw new Error("not found"); },
+    49	    async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
+    50	  };
+    51	}
+    52	
+    53	// ---- fetch mock: ハブと Discord を演じる ----
+    54	const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
+    55	globalThis.fetch = async (url, init) => {
+    56	  const u = String(url);
+    57	  if (u.startsWith(HUB)) {
+    58	    F.hubCalls++;
+    59	    const r = F.hub.shift();
+    60	    if (r instanceof Error) throw r;
+    61	    if (typeof r === "number") return new Response("error", { status: r });
+    62	    return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
+    63	  }
+    64	  if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
+    65	  throw new Error("unexpected fetch: " + u);
+    66	};
+    67	
+    68	function baseEnv(kv, over = {}) {
+    69	  return { NETWORK: "sepolia", RPC_URL: "http://rpc.test", VOTER, PNOUNS: PNOUNS, NOUNS_DAO: DAO, NOUNS_TOKEN: TOKEN,
+    70	    EXPLORER: "https://sepolia.etherscan.io", SNAPSHOT_SPACE: SPACE, SNAPSHOT_HUB: HUB,
+    71	    DISCORD_WEBHOOK_URL: WEBHOOK, STATE: kv, SCAN_PROPOSALS: "3", ...over };
+    72	}
+    73	// 提案 1 件(state Active、mg.deadline=195)を返す標準ハンドラ
+    74	function handlers(over = {}) {
+    75	  return {
+    76	    __block: 100,
+    77	    proposalCount: () => 1n,
+    78	    proposals: () => [1n, OWNER, 0n, 0n, 0n, 90n, 200n, 0n, 0n, 0n, false, false, false, 0n, 50n],
+    79	    state: () => 1,
+    80	    spaceHash: () => keccak256(stringToBytes(SPACE)),
+    81	    registrationDelayBlocks: () => 400n,
+    82	    owner: () => OWNER,
+    83	    registrar: () => REGISTRAR,
+    84	    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
+    85	    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
+    86	    tally: () => [[0n, 0n, 0n], [0n, 0n, 0n], false, 0],
+    87	    voteDeadline: () => 195n,
+    88	    getCurrentVotes: () => 2n,
+    89	    currentResult: () => 2,
+    90	    getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
+    91	    liveMode: () => true,
+    92	    ...over,
+    93	  };
+    94	}
+    95	const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
+    96	const setup = (h, envOver = {}, wallet = null) => {
+    97	  const kv = fakeKV(); const pc = fakePC(h);
+    98	  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
+    99	  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() }); // 残高チェックは対象外の tick が既定
+   100	  return { kv, pc, env: baseEnv(kv, envOver) };
+   101	};
+   102	const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));
+   103	
+   104	beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });
+   105	
+   106	test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
+   107	  const { kv, env } = setup(handlers());
+   108	  F.hub = [new Error("network down")];
+   109	  await tick(env);
+   110	  assert.equal(F.discordBodies.filter((b) => b.includes("投票受付を開始")).length, 0, "告知しない");
+   111	  assert.equal(putsOf(kv, "announced").length, 0);
+   112	  assert.equal(putsOf(kv, "executed").length, 0);
+   113	  assert.ok(F.discordBodies.some((b) => b.includes("エラー")), "エラー通知は出る");
+   114	});
+   115	
+   116	test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
+   117	  const { kv, env } = setup(handlers());
+   118	  F.hub = [{ proposals: [] }, { proposals: [] }]; // 1 回目 20 件クエリ・2 回目 逆引き 200 件クエリ
+   119	  await tick(env);
+   120	  assert.ok(F.discordBodies.some((b) => b.includes("取得できません")), "unresolved 警告");
+   121	  assert.equal(putsOf(kv, "flag:unresolved:1").length, 1);
+   122	  assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
+   123	  // 2 tick 目: フラグ済みなので再警告なし・追加書き込みなし
+   124	  F.hub = [{ proposals: [] }, { proposals: [] }];
+   125	  const n = F.discordBodies.length; const w = kv.ops.filter(([op]) => op === "put").length;
+   126	  await tick(env);
+   127	  assert.equal(F.discordBodies.length, n, "再警告しない");
+   128	  assert.equal(kv.ops.filter(([op]) => op === "put").length, w, "KV write が増えない");
+   129	});
+   130	
+   131	test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
+   132	  const { kv, env } = setup(handlers());
+   133	  F.hub = [hubProposal("https://nouns.wtf/vote/999")]; // 別議案を指す
+   134	  await tick(env);
+   135	  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
+   136	  assert.equal(putsOf(kv, "announced").length, 0, "誤った URL を告知しない");
+   137	});
+   138	
+   139	test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
+   140	  const { kv, env } = setup(handlers());
+   141	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+   142	  F.discordStatus = 500;
+   143	  await tick(env);
+   144	  assert.equal(putsOf(kv, "announced").length, 0, "送信失敗なら告知済みにしない");
+   145	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+   146	  F.discordStatus = 200;
+   147	  await tick(env);
+   148	  assert.ok(F.discordBodies.some((b) => b.includes("投票受付を開始")));
+   149	  assert.equal(putsOf(kv, "announced").length, 1, "成功した tick で告知済みになる");
+   150	  assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
+   151	});
+   152	
+   153	test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
+   154	  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
+   155	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+   156	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+   157	    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
+   158	  });
+   159	  await tick(env);
+   160	  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
+   161	  assert.equal(F.hubCalls, 0, "ハブに到達しない");
+   162	});
+   163	
+   164	test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
+   165	  const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
+   166	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+   167	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+   168	  }, { account: { address: OWNER } });
+   169	  await tick(env);
+   170	  assert.ok(F.discordBodies.some((b) => b.includes("同一アドレス")), "分離違反の通知");
+   171	  assert.equal(F.hubCalls, 0);
+   172	});
+   173	
+   174	test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
+   175	  const { env } = setup(handlers(), {
+   176	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+   177	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+   178	    MIN_REGISTRATION_DELAY: "abc",
+   179	  });
+   180	  await assert.rejects(() => tick(env), /MIN_REGISTRATION_DELAY/);
+   181	});
+   182	
+   183	test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
+   184	  const { pc, env } = setup(handlers());
+   185	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+   186	  await tick(env);
+   187	  const first = pc.calls.filter((f) => f === "spaceHash").length;
+   188	  assert.equal(first, 1);
+   189	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+   190	  await tick(env); // __reset していないので spaceCheckedAt は保持される
+   191	  assert.equal(pc.calls.filter((f) => f === "spaceHash").length, 1, "2 tick 目は確認しない");
+   192	});
+   193	
+   194	test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
+   195	  const wallet = { account: { address: RELAYER } };
+   196	  // ケース A: 登録済み + 解決済み → maybeExecute が "no votes" を記録
+   197	  {
+   198	    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
+   199	    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+   200	    await tick(env);
+   201	    const put = putsOf(kv, "executed:1");
+   202	    assert.equal(put.length, 1, "no votes が確定される");
+   203	    assert.ok(kv.data.get(put[0][1]).includes("no votes"));
+   204	  }
+   205	  // ケース B: 未登録(対応表なし) → execute もスキップ(登録遅れの提案を票ゼロで切り捨てない)
+   206	  {
+   207	    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
+   208	    F.hub = [{ proposals: [] }]; // 登録なしなので逆引きは発生しない
+   209	    await tick(env);
+   210	    assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
+   211	  }
+   212	});
+     1	// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
+     2	// 第10回監査の指摘: 前方一致・偽ドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null を検証すること。
+     3	import { test } from "node:test";
+     4	import assert from "node:assert/strict";
+     5	import { referencesNounsProposal as ref } from "../src/snap.js";
+     6	
+     7	test("正規の URL を検出する", () => {
+     8	  assert.equal(ref("https://nouns.wtf/vote/989", 989), true);
+     9	  assert.equal(ref("Source: https://nouns.wtf/vote/989\n本文", 989), true);
+    10	  assert.equal(ref("https://nouns.wtf/vote/989/", 989), true);
+    11	  assert.equal(ref("https://nouns.wtf/vote/989?tab=activity", 989), true);
+    12	  assert.equal(ref("https://nouns.wtf/vote/989#comments", 989), true);
+    13	  assert.equal(ref("https://www.nouns.wtf/vote/989", 989), true);
+    14	  assert.equal(ref("HTTPS://NOUNS.WTF/vote/989", 989), true, "ホスト名は大文字小文字を区別しない");
+    15	  assert.equal(ref("(https://nouns.wtf/vote/989)", 989), true, "括弧で閉じられていても拾う");
+    16	  assert.equal(ref("http://nouns.wtf/vote/989", 989), true);
+    17	});
+    18	
+    19	test("前方一致で誤検出しない", () => {
+    20	  assert.equal(ref("https://nouns.wtf/vote/123", 12), false);
+    21	  assert.equal(ref("https://nouns.wtf/vote/12", 123), false);
+    22	  assert.equal(ref("https://nouns.wtf/vote/9890", 989), false);
+    23	});
+    24	
+    25	test("別ドメイン・別パスを拒否する", () => {
+    26	  assert.equal(ref("https://evilnouns.wtf/vote/989", 989), false);
+    27	  assert.equal(ref("https://nouns.wtf.evil.com/vote/989", 989), false);
+    28	  assert.equal(ref("https://fake.nouns.wtf/vote/989", 989), false, "サブドメインは別ホスト");
+    29	  assert.equal(ref("https://nouns.wtf/vote/989/extra", 989), false);
+    30	  assert.equal(ref("https://nouns.wtf/proposal/989", 989), false);
+    31	  assert.equal(ref("nouns.wtf/vote/989", 989), false, "スキームなしの裸文字列は URL として扱わない");
+    32	});
+    33	
+    34	test("空・null・不正な入力で例外を投げず false を返す", () => {
+    35	  for (const v of [null, undefined, "", 0, {}, []]) assert.equal(ref(v, 989), false);
+    36	  for (const id of [null, undefined, 0, -1, NaN, "abc", 1e21]) assert.equal(ref("https://nouns.wtf/vote/989", id), false);
+    37	});
+    38	
+    39	test("正規表現メタ文字を含む入力で壊れない", () => {
+    40	  assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
+    41	  assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
+    42	});
+    43	
+    44	// 第11回監査 M-3: URL 解析化による検出回帰(末尾句読点・全角後置文字・Markdown)
+    45	test("URL の直後に句読点や日本語が続いても検出する", () => {
+    46	  assert.equal(ref("詳細は https://nouns.wtf/vote/989。", 989), true, "全角句点");
+    47	  assert.equal(ref("詳細は https://nouns.wtf/vote/989.", 989), true, "半角ピリオド");
+    48	  assert.equal(ref("https://nouns.wtf/vote/989, および他", 989), true, "カンマ");
+    49	  assert.equal(ref("https://nouns.wtf/vote/989、他", 989), true, "読点");
+    50	  assert.equal(ref("https://nouns.wtf/vote/989後に投票", 989), true, "直後に日本語");
+    51	  assert.equal(ref("「https://nouns.wtf/vote/989」を参照", 989), true, "全角かぎ括弧で囲む");
+    52	  assert.equal(ref("[議案](https://nouns.wtf/vote/989)", 989), true, "Markdown リンク");
+    53	  assert.equal(ref("https://nouns.wtf/vote/989\n次の行", 989), true, "改行が続く");
+    54	  assert.equal(ref("https://nouns.wtf/vote/989?tab=x。", 989), true, "クエリ + 句点");
+    55	});
+    56	
+    57	test("末尾処理で別 ID に化けない", () => {
+    58	  assert.equal(ref("https://nouns.wtf/vote/9890。", 989), false);
+    59	  assert.equal(ref("https://nouns.wtf/vote/989。", 9890), false);
+    60	  assert.equal(ref("https://evilnouns.wtf/vote/989。", 989), false, "末尾処理をしてもドメイン判定は維持");
+    61	});
+    62	
+    63	test("改行で分断された URL は検出しない(仕様)", () => {
+    64	  assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
+    65	});
+    66	
+    67	// 第12回監査: 末尾処理の仕様確認ケース
+    68	test("第12回監査の追加ケース", () => {
+    69	  assert.equal(ref("https://nouns.wtf/vote/989abc", 989), false, "パスに英字が続けば別パス");
+    70	  assert.equal(ref("https://nouns.wtf/vote/989%20foo", 989), false, "エンコード済み文字も別パス");
+    71	  // 仕様: URL 直後の非 ASCII は「後置の文」とみなす。/vote/989偽 という提案パスは実在しないため安全側
+    72	  assert.equal(ref("https://nouns.wtf/vote/989偽", 989), true);
+    73	  assert.equal(ref("https://nouns.wtf/vote/989.後", 989), true, "句読点と日本語が交互でも 1 パスで除去");
+    74	  assert.equal(ref("[t](https://nouns.wtf/vote/989)", 989), true);
+    75	  assert.equal(ref("[t](https://nouns.wtf/vote/989?x=(y))", 989), true, "クエリ内括弧つき Markdown");
+    76	});
+
+exec
+/bin/bash -lc "node --input-type=module - <<'NODE'
+import { cfg } from './relayer-cf/src/chain.js';
+const base={NETWORK:'sepolia',RPC_URL:'x',VOTER:'0x1000000000000000000000000000000000000001',PNOUNS:'0x1000000000000000000000000000000000000002',NOUNS_DAO:'0x1000000000000000000000000000000000000003',NOUNS_TOKEN:'0x1000000000000000000000000000000000000004'};
+for (const v of ['', '300.5', ' 300 ', null, undefined, '-1', 'Infinity']) {
+ const e={...base}; if(v"'!==undefined)e.MIN_REGISTRATION_DELAY=v;
+ try { console.log(JSON.stringify(v), '"'=>', cfg(e).minRegistrationDelay); } catch(err) { console.log(JSON.stringify(v), '=> THROW', err.message); }
+}
+NODE
+rg -n \"cron|triggers|CRON_SEC|MIN_REGISTRATION_DELAY|REG_DELAY|MARGIN|liveMode|excluded|setExcluded|treasury|delegate|deploy-snapvoter\" relayer-cf/wrangler.toml docs/RUNBOOK-MAINNET.md scripts contracts test deployments -g '"'!docs/audit-12-codex-raw.md'"' -g '"'!docs/AUDIT-RESPONSE-2026-08-18.md'"'" in /mnt/data/pnouns-voter
+ succeeded in 633ms:
+"" => 0
+"300.5" => THROW MIN_REGISTRATION_DELAY must be a non-negative integer
+" 300 " => 300
+null => 300
+undefined => 300
+"-1" => THROW MIN_REGISTRATION_DELAY must be a non-negative integer
+"Infinity" => THROW MIN_REGISTRATION_DELAY must be a non-negative integer
+docs/RUNBOOK-MAINNET.md:23:## 2. デプロイ (liveMode=false で開始)
+docs/RUNBOOK-MAINNET.md:26:NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
+docs/RUNBOOK-MAINNET.md:27:  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
+docs/RUNBOOK-MAINNET.md:30:- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
+docs/RUNBOOK-MAINNET.md:32:- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
+docs/RUNBOOK-MAINNET.md:59:## 5. シャドー運用 (liveMode=false)
+docs/RUNBOOK-MAINNET.md:68:1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
+docs/RUNBOOK-MAINNET.md:77:- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
+relayer-cf/wrangler.toml:10:[triggers]
+relayer-cf/wrangler.toml:11:crons = ["* * * * *"]
+relayer-cf/wrangler.toml:38:[env.mainnet.triggers]
+relayer-cf/wrangler.toml:39:crons = ["*/2 * * * *"]
+contracts/PNounsVoter.sol:29: *  - liveMode=false のあいだは Nouns DAO を呼ばず結果イベントだけ出す(シャドー運用用。executed は立てないので、
+contracts/PNounsVoter.sol:30: *    後で liveMode=true にすれば同じ提案を本投票できる)。
+contracts/PNounsVoter.sol:38: *  Nouns 側の前提: この Nouns 保有ウォレット(マルチシグ)が本コントラクトに delegate() 済みであること。
+contracts/PNounsVoter.sol:61:    mapping(address => bool) public excluded;
+contracts/PNounsVoter.sol:65:    bool public liveMode;
+contracts/PNounsVoter.sol:127:        address[] memory excluded_,
+contracts/PNounsVoter.sol:133:        for (uint256 i = 0; i < excluded_.length; i++) {
+contracts/PNounsVoter.sol:134:            excluded[excluded_[i]] = true;
+contracts/PNounsVoter.sol:135:            emit ExcludedSet(excluded_[i], true);
+contracts/PNounsVoter.sol:140:    function setExcluded(address account, bool isExcluded) external onlyOwner {
+contracts/PNounsVoter.sol:141:        excluded[account] = isExcluded;
+contracts/PNounsVoter.sol:151:        liveMode = live;
+contracts/PNounsVoter.sol:286:        if (excluded[voter]) revert ExcludedVoter(voter);
+contracts/PNounsVoter.sol:329:    /// @notice 締切後に誰でも呼べる。結果を Nouns DAO に投票する(liveMode 時)。ガスは Nouns の refund で執行者に戻る。
+contracts/PNounsVoter.sol:339:        if (!liveMode) {
+contracts/PNounsVoter.sol:340:            // シャドー運用: 結果イベントだけ出し、executed は立てない(後で liveMode=true にすれば本投票できる)
+contracts/PNounsSnapVoter.sol:36: *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
+contracts/PNounsSnapVoter.sol:62:    mapping(address => bool) public excluded;
+contracts/PNounsSnapVoter.sol:64:    bool public liveMode;
+contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
+contracts/PNounsSnapVoter.sol:163:        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
+contracts/PNounsSnapVoter.sol:167:    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
+contracts/PNounsSnapVoter.sol:169:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
+contracts/PNounsSnapVoter.sol:292:        if (excluded[voter]) revert ExcludedVoter(voter);
+contracts/PNounsSnapVoter.sol:370:        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
+test/snap.fork.test.js:72:    nouns = new ethers.Contract(NOUNS_TOKEN, ["function delegate(address)", "function getCurrentVotes(address) view returns (uint96)", "function balanceOf(address) view returns (uint256)"], ethers.provider);
+test/snap.fork.test.js:103:      await nouns.connect(holder).delegate(await voterC.getAddress());
+test/fork.e2e.test.js:11:// 提案作成に使う大口 delegate(候補順に試す)と、Nouns 2 枚を自己委任しているホルダー(= pNouns マルチシグの代役)
+test/fork.e2e.test.js:19:const MARGIN = 3600n;
+test/fork.e2e.test.js:30:  "function delegate(address)",
+test/fork.e2e.test.js:31:  "function delegates(address) view returns (address)",
+test/fork.e2e.test.js:110:    metagov = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, [PNOUNS_TREASURY], MARGIN);
+test/fork.e2e.test.js:118:    await nouns.connect(holder).delegate(await metagov.getAddress());
+test/fork.e2e.test.js:122:    // 3. 大口 delegate になりすまして提案を作る(委任の後に作成 → creationBlock 時点で pNouns Voter が 2 票持つ)
+test/fork.e2e.test.js:168:    expect(await metagov.voteDeadline(proposalId)).to.equal(pr.endBlock - MARGIN);
+test/fork.e2e.test.js:250:    const treasury = await impersonate(PNOUNS_TREASURY);
+test/fork.e2e.test.js:251:    const treasuryToken = await (async () => { for (let id = 1; id <= 2100; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === PNOUNS_TREASURY) return id; })();
+test/fork.e2e.test.js:252:    await expect(metagov.connect(treasury).castVote(proposalId, 1, [treasuryToken])).to.be.revertedWithCustomError(metagov, "ExcludedVoter");
+test/fork.e2e.test.js:268:  it("シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ", async function () {
+test/fork.e2e.test.js:277:    // liveMode に戻せば同じ提案を本投票できる
+scripts/check-deploy.mjs:26:  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
+scripts/check-deploy.mjs:27:  "function excluded(address) view returns (bool)",
+scripts/check-deploy.mjs:29:const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
+scripts/check-deploy.mjs:43:  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
+scripts/check-deploy.mjs:44:    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
+scripts/check-deploy.mjs:51:  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
+scripts/sepolia/lib.js:22:  "function delegate(address)",
+scripts/sepolia/lib.js:23:  "function delegates(address) view returns (address)",
+scripts/sepolia/12-deploy-snapvoter.js:8:  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
+scripts/sepolia/12-deploy-snapvoter.js:9:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
+scripts/sepolia/12-deploy-snapvoter.js:21:  await (await nouns.delegate(dep.snapVoter)).wait();
+scripts/sepolia/04-delegate.js:8:  console.log("delegator", delegator.address, "Nouns:", String(await nouns.balanceOf(delegator.address)), "current delegate:", await nouns.delegates(delegator.address));
+scripts/sepolia/04-delegate.js:9:  if ((await nouns.delegates(delegator.address)).toLowerCase() !== dep.voter.toLowerCase()) {
+scripts/sepolia/04-delegate.js:10:    const tx = await nouns.delegate(dep.voter);
+scripts/sepolia/04-delegate.js:11:    console.log("delegate tx:", tx.hash);
+scripts/sepolia/03-deploy-voter.js:1:// pNouns Voter を Sepolia にデプロイ(Nouns 公式 Sepolia、pNouns 複製、margin=MARGIN(既定 5 ブロック: 投票期間 25 ブロックのため))
+scripts/sepolia/03-deploy-voter.js:8:  const margin = BigInt(process.env.MARGIN || 5);
+scripts/sepolia/03-deploy-voter.js:23:  console.log("pNouns Voter:", dep.voter, "liveMode=true margin=", String(margin));
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:37:    address public constant treasuryAddress = 0x8AE80e0B44205904bE18869240c2eC62D2342785; // トレジャリーウォレット
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:58:        _safeMint(treasuryAddress, mintForTreasuryAddress);
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:61:        mintCount[treasuryAddress] += mintForTreasuryAddress;
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:149:            treasuryAddress != address(0),
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:150:            "treasuryAddress shouldn't be 0"
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:152:        (bool sent, ) = payable(treasuryAddress).call{
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:155:        require(sent, "failed to move fund to treasuryAddress contract");
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:158:    /* treasuryAddress は non-upgradable */
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:159:    // function setTreasuryAddress(address _treasury) external onlyAdminOrOwner {
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:160:    //     treasuryAddress = _treasury;
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:200:    // 10% royalties for treasuryAddressß
+contracts/vendor/pnouns/contract/contracts/pNounsToken.sol:208:        address payable payableTo = payable(treasuryAddress);
+
+exec
+/bin/bash -lc "nl -ba docs/RUNBOOK-MAINNET.md
+nl -ba scripts/check-deploy.mjs
+nl -ba relayer-cf/wrangler.toml
+rg --files scripts/mainnet scripts | sort | sed -n '1,160p'
+nl -ba contracts/PNounsSnapVoter.sol | sed -n '140,190p;350,390p'" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+     1	# mainnet 移行 runbook (pNouns Voter)
+     2	
+     3	第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
+     4	Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
+     5	
+     6	## 0. 前提
+     7	
+     8	- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
+     9	- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
+    10	
+    11	## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵
+    12	
+    13	| 役割 | 鍵 | 保管 | 資金 |
+    14	|---|---|---|---|
+    15	| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
+    16	| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
+    17	| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
+    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
+    19	
+    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
+    21	同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。
+    22	
+    23	## 2. デプロイ (liveMode=false で開始)
+    24	
+    25	```bash
+    26	NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
+    27	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
+    28	```
+    29	
+    30	- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
+    31	- `owner_` は**最初からマルチシグを指定**(EOA を経由しない)。registrar_ は上記の registrar アドレス
+    32	- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
+    33	- Sourcify でソース検証 → exact_match を確認
+    34	
+    35	## 3. 機械照合
+    36	
+    37	```bash
+    38	NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
+    39	```
+    40	
+    41	全項目 ✅ になるまで進まない。確認内容: spaceHash 一致 / delay >= 300 /
+    42	3 者分離 / Worker 設定一致 / 残高。
+    43	
+    44	## 4. Worker (Cloudflare) 設定
+    45	
+    46	```bash
+    47	cd relayer-cf
+    48	# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
+    49	npx wrangler kv namespace create STATE --env mainnet
+    50	npx wrangler deploy --env mainnet
+    51	npx wrangler secret put RPC_URL --env mainnet
+    52	npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
+    53	npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
+    54	```
+    55	
+    56	- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
+    57	- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
+    58	
+    59	## 5. シャドー運用 (liveMode=false)
+    60	
+    61	- トレジャリーからプールへ 0.05 ETH 送金
+    62	- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
+    63	  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
+    64	- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
+    65	
+    66	## 6. 委任切替 → 本番化 (この順のみ)
+    67	
+    68	1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
+    69	2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
+    70	3. マルチシグから `setLiveMode(true)`
+    71	4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
+    72	
+    73	## 7. ロールバック
+    74	
+    75	いつでも可能・即時:
+    76	- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
+    77	- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
+    78	- `sweep(トレジャリー)` → プール残額を回収
+    79	
+    80	## 8. 障害時
+    81	
+    82	- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
+    83	  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
+    84	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
+    85	  (Worker の自動照合が Discord に⚠️を出す)
+    86	- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
+     1	// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
+     2	// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
+     3	// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
+     4	//
+     5	// 使い方:
+     6	//   NETWORK=sepolia node scripts/check-deploy.mjs
+     7	//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
+     8	import { ethers } from "ethers";
+     9	import fs from "node:fs";
+    10	import path from "node:path";
+    11	
+    12	const ROOT = path.resolve(import.meta.dirname, "..");
+    13	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
+    14	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
+    15	}
+    16	const NETWORK = process.env.NETWORK || "sepolia";
+    17	const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+    18	const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
+    19	  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
+    20	  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
+    21	const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
+    22	const VOTER_ABI = [
+    23	  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
+    24	  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
+    25	  "function owner() view returns (address)", "function registrar() view returns (address)",
+    26	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
+    27	  "function excluded(address) view returns (bool)",
+    28	];
+    29	const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
+    30	
+    31	let failed = 0;
+    32	const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
+    33	const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
+    34	
+    35	async function main() {
+    36	  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
+    37	  const p = new ethers.JsonRpcProvider(RPC);
+    38	  const voterAddr = dep.snapVoter || dep.voter;
+    39	  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
+    40	  console.log(`network=${NETWORK} voter=${voterAddr}\n`);
+    41	
+    42	  // 1. コントラクトの実値
+    43	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
+    44	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
+    45	  ]);
+    46	  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
+    47	  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
+    48	  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
+    49	  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
+    50	  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
+    51	  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
+    52	  check("refundEnabled", refund === true);
+    53	
+    54	  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
+    55	  let workerCfg = null;
+    56	  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
+    57	  const relayer = workerCfg?.relayer || null;
+    58	  const roles = { owner, registrar, relayer };
+    59	  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
+    60	  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
+    61	  const distinct = new Set(addrs).size === addrs.length;
+    62	  if (NETWORK === "mainnet") {
+    63	    check("owner / registrar / relayer がすべて別アドレス", distinct);
+    64	    check("relayer が Worker から取得できた", !!relayer);
+    65	    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
+    66	    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
+    67	  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
+    68	  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);
+    69	
+    70	  // 3. Worker と deployments の一致
+    71	  if (workerCfg) {
+    72	    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
+    73	    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
+    74	    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
+    75	  }
+    76	
+    77	  // 4. 委任と残高
+    78	  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
+    79	  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
+    80	  try {
+    81	    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
+    82	    const votes = await t.getCurrentVotes(voterAddr);
+    83	    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
+    84	  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
+    85	  const pool = await p.getBalance(voterAddr);
+    86	  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
+    87	  if (relayer) {
+    88	    const rb = await p.getBalance(relayer);
+    89	    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
+    90	  }
+    91	
+    92	  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
+    93	  process.exit(failed ? 1 : 0);
+    94	}
+    95	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
+     1	name = "pnouns-voter"
+     2	main = "src/index.js"
+     3	compatibility_date = "2026-08-01"
+     4	compatibility_flags = ["nodejs_compat"]
+     5	
+     6	# 静的 dApp(public/index.html)。/api/* は Worker が処理
+     7	[assets]
+     8	directory = "./public"
+     9	
+    10	[triggers]
+    11	crons = ["* * * * *"]
+    12	
+    13	[[kv_namespaces]]
+    14	binding = "STATE"
+    15	id = "4c2f1c683fe94191b456e0c1fc70cc2f"
+    16	
+    17	[vars]
+    18	NETWORK = "sepolia"
+    19	VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
+    20	SNAPSHOT_SPACE = "earl-grey.eth"
+    21	PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
+    22	NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
+    23	NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
+    24	EXPLORER = "https://sepolia.etherscan.io"
+    25	BLOCKSCOUT = "https://eth-sepolia.blockscout.com"
+    26	ONLY_PROPOSER = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925"
+    27	MIN_PENDING_AGE_SEC = "20"
+    28	MAX_BATCH = "10"
+    29	EXECUTE_GAS_MULT = "1.3"
+    30	# secrets(wrangler secret put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL, (任意) TICK_TOKEN
+    31	PUBLIC_URL = "https://pnouns-voter.x402-adsb-worker.workers.dev"
+    32	
+    33	# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
+    34	[env.mainnet]
+    35	name = "pnouns-voter-mainnet"
+    36	[env.mainnet.assets]
+    37	directory = "./public"
+    38	[env.mainnet.triggers]
+    39	crons = ["*/2 * * * *"]
+    40	[[env.mainnet.kv_namespaces]]
+    41	binding = "STATE"
+    42	id = "REPLACE_WITH_MAINNET_KV_ID"
+    43	[env.mainnet.vars]
+    44	NETWORK = "mainnet"
+    45	SNAPSHOT_SPACE = "pnounsdao.eth"
+    46	VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
+    47	PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80"
+    48	NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"
+    49	NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"
+    50	EXPLORER = "https://etherscan.io"
+    51	BLOCKSCOUT = "https://eth.blockscout.com"
+    52	MIN_PENDING_AGE_SEC = "120"
+    53	MAX_BATCH = "10"
+    54	EXECUTE_GAS_MULT = "1.3"
+    55	LOW_BALANCE_ETH = "0.01"
+    56	PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
+    57	# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL
+rg: scripts/mainnet: No such file or directory (os error 2)
+scripts/check-deploy.mjs
+scripts/compare-chains.js
+scripts/create-and-register.mjs
+scripts/lib/proposal-format.mjs
+scripts/sepolia/00-accounts.js
+scripts/sepolia/01-deploy-pnouns.js
+scripts/sepolia/02-buy-nouns.js
+scripts/sepolia/03-deploy-voter.js
+scripts/sepolia/04-delegate.js
+scripts/sepolia/05-e2e.js
+scripts/sepolia/06-propose.js
+scripts/sepolia/07-sign-post.js
+scripts/sepolia/08-mint-to.js
+scripts/sepolia/09-submit-as-anyone.js
+scripts/sepolia/10-register-ens.js
+scripts/sepolia/12-deploy-snapvoter.js
+scripts/sepolia/13-snap-e2e.js
+scripts/sepolia/14-snap-setup-only.js
+scripts/sepolia/15-reuse-snap.js
+scripts/sepolia/_rehearse-keys.js
+scripts/sepolia/ens-controller-abi.json
+scripts/sepolia/lib.js
+   140	    error InvalidSpace();
+   141	    error VotesAlreadyCounted();
+   142	    error InvalidFromAddress();
+   143	    error InvalidContractSignature();
+   144	    error NotTokenOwner(uint256 tokenId, address owner);
+   145	    error ExcludedVoter(address voter);
+   146	    error NothingCounted();
+   147	    error AlreadyExecuted();
+   148	    error NoVotes();
+   149	    error MixedProposals();
+   150	
+   151	    constructor(
+   152	        address pnouns_, address nounsDAO_, address owner_, address registrar_,
+   153	        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
+   154	    ) Ownable(owner_) {
+   155	        pnouns = IERC721(pnouns_);
+   156	        nounsDAO = INounsDAO(nounsDAO_);
+   157	        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
+   158	        spaceHash = keccak256(bytes(space_));
+   159	        space = space_;
+   160	        registrar = registrar_;
+   161	        marginBlocks = marginBlocks_;
+   162	        registrationDelayBlocks = registrationDelayBlocks_;
+   163	        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
+   164	    }
+   165	
+   166	    // ---- 設定 ----
+   167	    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
+   168	    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
+   169	    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
+   170	    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
+   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
+   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
+   173	    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
+   174	    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
+   175	    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
+   176	    receive() external payable {}
+   177	
+   178	    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
+   179	    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
+   180	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
+   181	        bytes32 h = keccak256(bytes(snapshotProposal));
+   182	        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
+   183	        if (nounsProposalId == 0) revert NotRegistered();
+   184	        snapToNouns[h] = nounsProposalId;
+   185	        nounsToSnap[nounsProposalId] = h;
+   186	        registeredAtBlock[nounsProposalId] = block.number;
+   187	        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
+   188	        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
+   190	        emit ProposalRegistered(nounsProposalId, snapshotProposal);
+   350	        // voters=0 は「補完」(同一署名で token を追加)の場合
+   351	        if (s == FOR) { t.forTokens += tokens; t.forVoters += voters; }
+   352	        else if (s == AGAINST) { t.againstTokens += tokens; t.againstVoters += voters; }
+   353	        else { t.abstainTokens += tokens; t.abstainVoters += voters; }
+   354	    }
+   355	    function _subTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
+   356	        if (s == FOR) { t.forTokens -= tokens; t.forVoters -= voters; }
+   357	        else if (s == AGAINST) { t.againstTokens -= tokens; t.againstVoters -= voters; }
+   358	        else { t.abstainTokens -= tokens; t.abstainVoters -= voters; }
+   359	    }
+   360	
+   361	    // ---- 実行 ----
+   362	    function execute(uint256 proposalId) external nonReentrant {
+   363	        Tally storage t = _tallies[proposalId];
+   364	        if (t.executed) revert AlreadyExecuted();
+   365	        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
+   366	        if (block.number < deadline) revert VotingNotClosed();
+   367	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
+   368	        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes();
+   369	        uint8 support = _decide(tokens, voters);
+   370	        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
+   371	        t.executed = true; t.result = support;
+   372	        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
+   373	        emit Executed(proposalId, support, tokens, voters, true);
+   374	    }
+   375	
+   376	    // ---- 内部 ----
+   377	    function _choiceToSupport(uint32 choice) internal pure returns (uint8) {
+   378	        if (choice == 1) return FOR;
+   379	        if (choice == 2) return AGAINST;
+   380	        if (choice == 3) return ABSTAIN;
+   381	        revert InvalidChoice();
+   382	    }
+   383	
+   384	    /// @dev "0x…" 42 文字の 16 進文字列を address へ厳密変換(不正なら revert)
+   385	    function _parseAddress(string calldata str) internal pure returns (address) {
+   386	        bytes calldata b = bytes(str);
+   387	        if (b.length != 42 || b[0] != "0" || (b[1] != "x" && b[1] != "X")) revert InvalidFromAddress();
+   388	        uint160 v;
+   389	        for (uint256 i = 2; i < 42; i++) {
+   390	            uint8 c = uint8(b[i]);
+
+codex
+現時点で、runbook の段階順に実行不能な箇所が見つかっています。初回の「機械照合」が Worker 配備・プール入金・委任より前なのに、それらを必須判定するため、新規 mainnet では全項目一致に到達できません。さらに、照合スクリプトが宣言した ABI の `excluded` を実際には呼んでいない点も確認しました。残りは通知キューの上限算定と、テストが通していない状態遷移を整理中です。
+exec
+/bin/bash -lc "nl -ba relayer-cf/src/snap.js | sed -n '1,280p'
+rg -n \"PNOUNS_TREASURY|TREASURY|8AE80|excluded_\" README.md docs scripts deployments hardhat.config.js test -g '"'!docs/audit-12-codex-raw.md'"' -g '"'!docs/AUDIT-RESPONSE-2026-08-18.md'"'
+git log --oneline --all -- scripts/mainnet/deploy-snapvoter.js" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+     1	// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
+     2	// 監査対応:
+     3	//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
+     4	//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
+     5	//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
+     6	//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
+     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
+     8	import { METAGOV_ABI } from "./chain.js";
+     9	import { keccak256, stringToBytes } from "viem";
+    10	
+    11	const FETCH_TIMEOUT_MS = 8000;
+    12	const MAX_BODY = 64 * 1024;
+    13	const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り
+    14	
+    15	async function fetchLimited(url, init) {
+    16	  const ctrl = new AbortController();
+    17	  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
+    18	  try {
+    19	    const r = await fetch(url, { ...init, signal: ctrl.signal });
+    20	    if (!r.ok) throw new Error(`HTTP ${r.status}`);
+    21	    const reader = r.body?.getReader();
+    22	    if (!reader) throw new Error("no body");
+    23	    const chunks = []; let total = 0;
+    24	    for (;;) {
+    25	      const { done, value } = await reader.read();
+    26	      if (done) break;
+    27	      total += value.byteLength;
+    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
+    29	      chunks.push(value);
+    30	    }
+    31	    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
+    32	    return JSON.parse(new TextDecoder().decode(buf));
+    33	  } finally { clearTimeout(t); }
+    34	}
+    35	async function hubGql(c, query) {
+    36	  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
+    37	  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
+    38	  if (!j.data) throw new Error("hub graphql: no data");
+    39	  return j.data;
+    40	}
+    41	
+    42	/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
+    43	/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
+    44	///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
+    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
+    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
+    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
+    48	export function referencesNounsProposal(text, nounsId) {
+    49	  const id = Number(nounsId);
+    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
+    51	  const s = String(text || "");
+    52	  if (!s) return false;
+    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
+    54	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
+    55	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
+    56	    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
+    57	    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
+    58	    let u;
+    59	    try { u = new URL(trimmed); } catch { continue; }
+    60	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
+    61	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
+    62	  }
+    63	  return false;
+    64	}
+    65	
+    66	export async function resolveMappings(c, pc, activeNounsIds = []) {
+    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+    68	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
+    69	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
+    70	  const found = new Map(); // nounsId -> snapId
+    71	  if (data.proposals.length) {
+    72	    const res = await pc.multicall({
+    73	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
+    74	      allowFailure: false,
+    75	    });
+    76	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
+    77	  }
+    78	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
+    79	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
+    80	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
+    81	  if (missing.length) {
+    82	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
+    83	    const need = [];
+    84	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
+    85	    if (need.length) {
+    86	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
+    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
+    88	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
+    89	      for (const n of need) {
+    90	        const p = byHash.get(n.hash);
+    91	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
+    92	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
+    93	      }
+    94	    }
+    95	  }
+    96	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
+    97	    const m = meta.get(snapId) || {};
+    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
+    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
+   100	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
+   101	    // 侵害)は検出できない。過信しないこと。
+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
+   104	  });
+   105	  return { mappings, unresolved };
+   106	}
+   107	
+   108	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
+   109	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
+   110	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
+   111	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
+   112	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
+   113	  const send = []; const skipped = [];
+   114	  let advance = cursor; let blocked = false;
+   115	  for (let i = 0; i < rows.length; i++) {
+   116	    const r = rows[i]; const rec = recs[i];
+   117	    const created = Number(r.created);
+   118	    const tokens = tokenCounts[i] ?? 0;
+   119	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
+   120	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
+   121	    const exists = !!rec[0];
+   122	    const recTs = Number(rec[3] ?? 0);
+   123	    const isNew = !exists || created > recTs;
+   124	    const needSupplement = exists && created === recTs && uncounted > 0;
+   125	    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
+   126	    if (isSkippable) {
+   127	      if (tokens === 0 || deadLetters.has(r.ipfs)) skipped.push(r);
+   128	      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
+   129	      continue;
+   130	    }
+   131	    blocked = true; // これ以降は cursor を進めない
+   132	    if (send.length < limit) send.push({ row: r, index: i });
+   133	  }
+   134	  return { send, skipped, advance, blocked };
+   135	}
+   136	
+   137	/// IPFS からエンベロープを取得(ゲートウェイ冗長化 + GraphQL 行との照合)
+   138	export async function fetchEnvelope(c, row, snapId) {
+   139	  for (const gw of [c.ipfsGateway, "https://ipfs.io/ipfs", "https://cloudflare-ipfs.com/ipfs"]) {
+   140	    try {
+   141	      const env = await fetchLimited(`${gw}/${row.ipfs}`);
+   142	      const m = env?.data?.message;
+   143	      if (!m || typeof env.sig !== "string" || !/^0x[0-9a-fA-F]{2,600}$/.test(env.sig)) throw new Error("bad envelope shape");
+   144	      if (String(m.from).toLowerCase() !== String(row.voter).toLowerCase()) throw new Error("voter mismatch");
+   145	      if (m.proposal !== snapId) throw new Error("proposal mismatch");
+   146	      if (Number(m.timestamp) !== Number(row.created)) throw new Error("timestamp mismatch");
+   147	      return env;
+   148	    } catch (e) { /* 次のゲートウェイ */ }
+   149	  }
+   150	  return null;
+   151	}
+   152	
+   153	/// ハブの投票を固定幅の window で取得する。
+   154	/// timestamp cursor は同一秒の大量投稿を一意に走査できないため使わず、KV に保存した skip offset を
+   155	/// 複数 tick で進め、末尾まで到達したら 0 に戻して全体を再走査する。途中で行が追加・削除されても、
+   156	/// 次の周回で on-chain voterRec と突き合わせるため恒久的な取りこぼしにはならない。
+   157	export const PAGE_SIZE = 100;
+   158	export const PAGES_PER_TICK = 3;
+   159	export async function fetchRows(c, snapId, offset = 0) {
+   160	  const rows = [];
+   161	  for (let page = 0; page < PAGES_PER_TICK; page++) {
+   162	    const skip = offset + page * PAGE_SIZE;
+   163	    const d = await hubGql(c, `{ votes(where:{proposal:"${snapId}"}, first: ${PAGE_SIZE}, skip: ${skip}, orderBy: "created", orderDirection: asc) { voter ipfs choice created } }`);
+   164	    if (!Array.isArray(d.votes)) throw new Error("hub: votes shape");
+   165	    rows.push(...d.votes);
+   166	    if (d.votes.length < PAGE_SIZE) return { rows, nextOffset: 0, wrapped: true };
+   167	  }
+   168	  return { rows, nextOffset: offset + rows.length, wrapped: false };
+   169	}
+   170	
+   171	/// 補完判定に必要な tokenId を重複排除する。hasTokenVoted は proposalId/tokenId のみで決まり、
+   172	/// 同じ投票者の複数行ごとに再照会する必要はない。
+   173	export function supplementCheckPlan(rows, recs, tokensByRow) {
+   174	  const rowIndexes = [];
+   175	  const unique = new Set();
+   176	  rows.forEach((r, i) => {
+   177	    if (!recs[i]?.[0] || Number(r.created) !== Number(recs[i]?.[3] ?? 0) || !tokensByRow[i]?.length) return;
+   178	    rowIndexes.push(i);
+   179	    for (const id of tokensByRow[i]) unique.add(Number(id));
+   180	  });
+   181	  return { rowIndexes, tokenIds: [...unique].sort((a, b) => a - b) };
+   182	}
+   183	
+   184	/// 同じ voter の候補を 1 バッチに複数入れると、個別 simulate は成功しても組合せで
+   185	/// StaleVote になりうる。voter ごとに created が新しく、同値なら CID が大きい 1 行へ正規化する。
+   186	export function uniqueVoterCandidates(send, limit) {
+   187	  const byVoter = new Map();
+   188	  for (const item of send) {
+   189	    const key = item.row.voter.toLowerCase();
+   190	    const prev = byVoter.get(key);
+   191	    if (!prev || Number(item.row.created) > Number(prev.row.created)
+   192	      || (Number(item.row.created) === Number(prev.row.created) && String(item.row.ipfs) > String(prev.row.ipfs))) byVoter.set(key, item);
+   193	  }
+   194	  return [...byVoter.values()].sort((a, b) => Number(a.row.created) - Number(b.row.created) || String(a.row.ipfs).localeCompare(String(b.row.ipfs))).slice(0, limit);
+   195	}
+   196	
+   197	export const scanKey = (store, nounsId, snapId) => `${store.prefix}snapscan:${nounsId}:${snapId}`;
+   198	export const deadKey = (store, nounsId) => `${store.prefix}snapdead:${nounsId}`;
+   199	export const failKey = (store, nounsId) => `${store.prefix}snapfail:${nounsId}`;
+test/snap.fork.test.js:8:const PNOUNS_TREASURY = "0x8ae80e0b44205904be18869240c2ec62d2342785";
+test/snap.fork.test.js:75:    voterC = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, deployer.address, SPACE, [PNOUNS_TREASURY], 10, 0);
+test/snap.fork.test.js:120:          if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+test/snap.fork.test.js:194:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+test/snap.fork.test.js:275:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+test/snap.fork.test.js:296:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+test/snap.fork.test.js:324:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+test/fork.e2e.test.js:8:const PNOUNS_TREASURY = "0x8ae80e0b44205904be18869240c2ec62d2342785";
+test/fork.e2e.test.js:57:    if (owner === PNOUNS_TREASURY) continue;
+test/fork.e2e.test.js:110:    metagov = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, [PNOUNS_TREASURY], MARGIN);
+test/fork.e2e.test.js:250:    const treasury = await impersonate(PNOUNS_TREASURY);
+test/fork.e2e.test.js:251:    const treasuryToken = await (async () => { for (let id = 1; id <= 2100; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === PNOUNS_TREASURY) return id; })();
+scripts/sepolia/lib.js:9:  PNOUNS_TREASURY: "0x8ae80e0b44205904be18869240c2ec62d2342785", // 本物ソースがコンストラクタで 100 枚をここに mint する定数
+docs/audit-11-codex-raw.md:146:contracts/PNounsVoter.sol:127:        address[] memory excluded_,
+docs/audit-11-codex-raw.md:147:contracts/PNounsVoter.sol:133:        for (uint256 i = 0; i < excluded_.length; i++) {
+docs/audit-11-codex-raw.md:148:contracts/PNounsVoter.sol:134:            excluded[excluded_[i]] = true;
+docs/audit-11-codex-raw.md:149:contracts/PNounsVoter.sol:135:            emit ExcludedSet(excluded_[i], true);
+docs/audit-11-codex-raw.md:169:contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
+docs/audit-11-codex-raw.md:173:contracts/PNounsSnapVoter.sol:163:        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
+docs/audit-11-codex-raw.md:1255:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
+docs/audit-11-codex-raw.md:1265:        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
+docs/audit-11-codex-raw.md:2894:   153	        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
+docs/audit-11-codex-raw.md:2904:   163	        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
+docs/audit-11-codex-raw.md:3382:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
+docs/audit-11-codex-raw.md:3407:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
+docs/audit-11-codex-raw.md:3517:  PNOUNS_TREASURY: "0x8ae80e0b44205904be18869240c2ec62d2342785", // 本物ソースがコンストラクタで 100 枚をここに mint する定数
+docs/audit-11-codex-raw.md:3574:scripts/sepolia/12-deploy-snapvoter.js:9:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
+docs/audit-11-codex-raw.md:3585:scripts/sepolia/03-deploy-voter.js:10:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
+docs/audit-11-codex-raw.md:3817:   194	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+docs/audit-11-codex-raw.md:3882:   259	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+docs/audit-11-codex-raw.md:3903:   280	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
+docs/audit-11-codex-raw.md:4430:     9	  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
+scripts/sepolia/12-deploy-snapvoter.js:9:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
+scripts/sepolia/03-deploy-voter.js:10:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
+
+exec
+/bin/bash -lc 'npx hardhat test --no-compile' in /mnt/data/pnouns-voter
+ succeeded in 62157ms:
+◇ injected env (6) from .env // tip: ⌘ override existing { override: true }
+✔ タイトルは Markdown 見出しから取り出す (1.973291ms)
+✔ 上限内なら全文をそのまま入れる(Prop 989 相当 6,224 文字) (0.423873ms)
+✔ 上限超過(Prop 986 相当 14,029 文字)なら切って案内を付ける (0.414555ms)
+✔ 切り詰めは段落境界を優先する (0.184544ms)
+
+
+  PNounsVoter (mainnet fork E2E)
+      pNouns Voter: 0x02cb436275045a18e14191682e6825Adb9a00303
+      proposer: 0x094b3226c7f55de7038b5be9bbac0866b3f6c8b8
+      proposal #991 startBlock=25818485 endBlock=25847285 creation=25796885
+      pNouns: alice [ 9n, 10n ] bob [ 12n ] carol [ 17n ]
+    ✔ deadline = endBlock - margin
+      castVotesBySig(3 votes / 4 tokens) gasUsed = 262501
+      execute gasUsed = 159214, executor ETH delta = -0.000031244202496612 (refund from Nouns DAO)
+      RefundableVote: to=0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc amount=0.000140777184054864 sent=true
+    ✔ 同数(tokens 2:2)は投票者数で決まり(1:2)、AGAINST が Nouns DAO に記録される (1605ms)
+    ✔ 多数(tokens 3:1)なら FOR。締切後の投票は拒否 (183ms)
+    ✔ 票ゼロなら execute できず(NoVotes)、Nouns DAO には投票しない
+    ✔ 不正系: 他人の token / 二重投票 / 除外アドレス / 移転後の再投票 / 署名改ざん (536ms)
+    ✔ シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ
+    ✔ 1 バッチに複数提案を混ぜると MixedProposals
+    ✔ 本人が自分でガスを払って castVote できる(リレイヤー不要の退路)
+      first vote (cold) = 174603, next 9 votes = 416876 (46319/vote), 1 voter x 5 tokens = 100604
+    ✔ ガス実測: 10 名×1枚 のバッチと 1 名×5枚 (8224ms)
+      paid 0.000177128334788361 ETH, refunded 0.000173725703811567 ETH, net 0.000003402630976794 ETH
+    ✔ ガス払い戻し(案 B): 預け金があれば投函者の ETH はほぼ減らず、上限・無効化・残高ゼロが効く (33808ms)
+
+  PNounsSnapVoter (mainnet fork)
+      real vote replayed: voter 0x0bC7fd07 tokens 1 gas 309593
+    ✔ A: Prop 989 の本物の Snapshot 署名をオンチェーン検証して集計できる (684ms)
+    B: 新規提案 + 自作 Snapshot 形式署名
+      executed: ABSTAIN with 2 Nouns votes (tie -> tie -> abstain)
+      ✔ 投票 → やり直し(新 timestamp・choice 変更) → 古い署名は拒否 → execute で Nouns DAO に記録 (39ms)
+      ✔ H01 対策: 先回りの 1 枚投函後、同じ署名で残り token を補完できる(投票者数は増えない)
+      ✔ H02 対策: 登録直後は受け付けず(delay)、未計上なら取消して登録し直せる
+      ✔ 第10回監査 M-2 対策: 登録後に owner が delay を下げても、その提案の受付は前倒しされない
+      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
+      ✔ H02R 対策: 猶予期間中は直接投票も不可。直接投票だけなら取消できる
+      ✔ 指摘3 対策: 直接投票の後に Snapshot 署名でやり直しても(新規 token 0 でも)取消は不可になる
+      ✔ M04 対策: EIP-1271 スマートウォレットの Snapshot 投票を検証できる
+
+
+  19 passing (1m)
+
+
+exec
+/bin/bash -lc 'rg -n -C 6 "989abc|989偽|%20foo|クエリ内括弧|末尾除去|孤児提案|pendingnotes|MIN_REGISTRATION_DELAY" docs/audit-12-codex-raw.md docs/AUDIT-RESPONSE-2026-08-18.md | tail -n 500' in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+docs/AUDIT-RESPONSE-2026-08-18.md-89-
+docs/AUDIT-RESPONSE-2026-08-18.md-90-再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
+docs/AUDIT-RESPONSE-2026-08-18.md-91-
+docs/AUDIT-RESPONSE-2026-08-18.md-92-## 再監査(第 8 回・B3)への対応
+docs/AUDIT-RESPONSE-2026-08-18.md-93-| ID | 重大度 | 対応 |
+docs/AUDIT-RESPONSE-2026-08-18.md-94-|---|---|---|
+docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
+docs/AUDIT-RESPONSE-2026-08-18.md-96-| B3-H04 | High | cursor 設計を全面変更。**オンチェーンの `voterRec` を唯一の真実**とし、cursor は取得の最適化に徹する: 取得は `created_gte`(境界の秒を含む)、cursor は**未解決票の created を超えて進めない**。tx 成功時に cursor を進める処理を廃止し、次 tick で voterRec を見て「解決済み」になった分だけ前進。これにより (a) 同一秒 21 票、(b) 複数 tx の部分 revert、(c) 送信失敗・クラッシュ、いずれでも票を失わない。純関数 `planSubmission` に切り出し、**回帰テスト 5 本**を追加(同一秒 21 票 / 部分 revert / skip 扱い / やり直し・補完検出 / 全解決) |
+docs/AUDIT-RESPONSE-2026-08-18.md-97-| B3-M01R | Medium | 対応付けキャッシュを廃止し、**毎 tick オンチェーンで再検証**(取消・再登録に追従。multicall 1 回) |
+docs/AUDIT-RESPONSE-2026-08-18.md-98-| B3-M03R | Medium | 締切接近時は複数バッチで排出(既存)＋ Snapshot 終了がオンチェーン締切より遅い設定を検知して ⚠️ 通知。※「drain 不能なら自動処理を開始しない」は、票を全部捨てることになり実害が大きいため採用せず、**警告＋可能な限り排出**とした(判断を文書化) |
+docs/AUDIT-RESPONSE-2026-08-18.md-99-| B3-M06R | Medium | 応答は **ReadableStream で 64KB 打ち切り**(Content-Length に依存しない)。取得失敗の票では **cursor を進めない**。20 回失敗した票のみデッドレター(KV に保存＋⚠️ 通知で手動対応可能に)し、黙って捨てない。ゲートウェイは 3 系統 |
+docs/AUDIT-RESPONSE-2026-08-18.md-100-
+docs/AUDIT-RESPONSE-2026-08-18.md-101-再検証: フォークテスト **16 本**、Worker テスト **11 本**(cursor 回帰 5 本を含む)。Sepolia 再デプロイ `0xFa8A9BBE8E22904Ad4d0f2840393b5088a159976`(Sourcify exact_match)。
+--
+docs/AUDIT-RESPONSE-2026-08-18.md-166-| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
+docs/AUDIT-RESPONSE-2026-08-18.md-167-| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
+docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
+docs/AUDIT-RESPONSE-2026-08-18.md-169-| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
+docs/AUDIT-RESPONSE-2026-08-18.md-170-| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
+docs/AUDIT-RESPONSE-2026-08-18.md-171-| 8 | Info | `InvalidSpace` の 1〜64 bytes は妥当 | 対応不要 |
+docs/AUDIT-RESPONSE-2026-08-18.md:172:| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
+docs/AUDIT-RESPONSE-2026-08-18.md-173-| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
+docs/AUDIT-RESPONSE-2026-08-18.md-174-
+docs/AUDIT-RESPONSE-2026-08-18.md-175-### B. デプロイ確認 (Codex は未確認 → こちらで実測)
+docs/AUDIT-RESPONSE-2026-08-18.md-176-
+docs/AUDIT-RESPONSE-2026-08-18.md-177-| 項目 | 実測値 | 判定 |
+docs/AUDIT-RESPONSE-2026-08-18.md-178-|---|---|---|
+--
+docs/AUDIT-RESPONSE-2026-08-18.md-201-総括: High 0 件。第11回 High の「提案単位 fail-closed」と、重点確認を依頼した
+docs/AUDIT-RESPONSE-2026-08-18.md-202-「締切後の自己 DoS」は**問題なし**と確認された(unresolved の 4 分類・execute 到達
+docs/AUDIT-RESPONSE-2026-08-18.md-203-条件・reconcile の安全性をコードで追跡のうえ)。
+docs/AUDIT-RESPONSE-2026-08-18.md-204-
+docs/AUDIT-RESPONSE-2026-08-18.md-205-| # | 重大度 | 指摘 | 対応 |
+docs/AUDIT-RESPONSE-2026-08-18.md-206-|---|---|---|---|
+docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
+docs/AUDIT-RESPONSE-2026-08-18.md:208:| 2 | Medium | `MIN_REGISTRATION_DELAY=abc` 等の不正値で `Math.max(300, NaN)=NaN` となり、下限 300 が消える | 修正: `cfg()` で非負整数を検証、不正なら throw |
+docs/AUDIT-RESPONSE-2026-08-18.md:209:| 3 | Low | 末尾除去の 2 段 replace の順序により `…/989.後` を取りこぼす。`…/989偽` を受理する仕様の曖昧さ | 修正: 句読点と非 ASCII を 1 つの選択式にまとめ 1 パスで除去。`989偽` は「後置の文」とみなす仕様と明記(実在しないパスのため安全側)。指定 6 ケースをテスト追加 |
+docs/AUDIT-RESPONSE-2026-08-18.md:210:| 4 | Low | 確定 tx の通知は送信失敗するとトリガー(送信中レコード)が消えて再送されない | 修正: 失敗分を単一 KV キー `pendingnotes` に積み、次 tick 冒頭で再送(list API 不使用・上限 20 件・1 日で破棄) |
+docs/AUDIT-RESPONSE-2026-08-18.md-211-| 5 | Low | 非 Snapshot モードの告知が通知前に「告知済み」を記録したまま | 修正: Snapshot 分岐と同じく送信成功後に記録 |
+docs/AUDIT-RESPONSE-2026-08-18.md-212-
+docs/AUDIT-RESPONSE-2026-08-18.md-213-問題なしと確認された点: unresolved の 4 分類(20 件ヒット/逆引きヒット/未登録/登録済み未発見)、
+docs/AUDIT-RESPONSE-2026-08-18.md-214-締切後の自己 DoS 不在(execute 窓は margin 期間 = state Active 中で、必ず逆引き対象)、
+docs/AUDIT-RESPONSE-2026-08-18.md-215-mainnet 毎 tick 確認と 3 者 Set 判定(読み取り専用モードの誤停止なし・ABI 一致)、
+docs/AUDIT-RESPONSE-2026-08-18.md-216-unresolved 警告の KV 負荷(1 提案 1 write/7 日)。
+--
+docs/audit-12-codex-raw.md-51-c. unresolved 警告の KV write が無料枠を圧迫しないか (フラグ TTL 7日、送信成功時のみ)
+docs/audit-12-codex-raw.md-52-
+docs/audit-12-codex-raw.md-53-### 2. [前回 Medium] URL 末尾処理の回帰修正
+docs/audit-12-codex-raw.md-54-`relayer-cf/src/snap.js` の `referencesNounsProposal()`:
+docs/audit-12-codex-raw.md-55-- URL 候補の正規表現から `)` `]` を除外文字から外し、末尾の句読点・閉じ括弧・
+docs/audit-12-codex-raw.md-56-  非 ASCII を 2 段階の replace で除去してから `new URL()`。
+docs/audit-12-codex-raw.md:57:**検証観点**: この末尾除去が新たな誤検出を生まないか。例:
+docs/audit-12-codex-raw.md:58:- `https://nouns.wtf/vote/989abc` (パスに英字が続く) はどうなるか
+docs/audit-12-codex-raw.md:59:- `https://nouns.wtf/vote/989%20foo` などエンコード済み文字
+docs/audit-12-codex-raw.md-60-- 除去正規表現 `[)\]}>,.;:!?、。」』】）〕｝＞…]+$` と `[^!-~]+$` の
+docs/audit-12-codex-raw.md-61-  順序・相互作用で、除去しすぎ (ID の数字まで削る等) は起きないか
+docs/audit-12-codex-raw.md-62-- `(` で始まり `)` を含む Markdown `[t](url)` で URL に `)` が入り込まないか
+docs/audit-12-codex-raw.md-63-- テスト `relayer-cf/test/link-check.test.mjs` の 25 ケースで十分か。
+docs/audit-12-codex-raw.md-64-  不足ケースがあれば具体的な入力文字列で示すこと
+docs/audit-12-codex-raw.md-65-
+--
+docs/audit-12-codex-raw.md-171-+| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
+docs/audit-12-codex-raw.md-172-+| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
+docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
+docs/audit-12-codex-raw.md-174-+| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
+docs/audit-12-codex-raw.md-175-+| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
+docs/audit-12-codex-raw.md-176-+| 8 | Info | `InvalidSpace` の 1〜64 bytes は妥当 | 対応不要 |
+docs/audit-12-codex-raw.md:177:+| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
+docs/audit-12-codex-raw.md-178-+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
+docs/audit-12-codex-raw.md-179-+
+docs/audit-12-codex-raw.md-180-+### B. デプロイ確認 (Codex は未確認 → こちらで実測)
+docs/audit-12-codex-raw.md-181-+
+docs/audit-12-codex-raw.md-182-+| 項目 | 実測値 | 判定 |
+docs/audit-12-codex-raw.md-183-+|---|---|---|
+--
+docs/audit-12-codex-raw.md-445-test/fork.e2e.test.js:26:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
+docs/audit-12-codex-raw.md-446-test/fork.e2e.test.js:37:  "function ownerOf(uint256) view returns (address)",
+docs/audit-12-codex-raw.md-447-contracts/PNounsVoter.sol:16:    function proposals(uint256 proposalId) external view returns (bytes memory);
+docs/audit-12-codex-raw.md-448-scripts/sepolia/lib.js:18:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
+docs/audit-12-codex-raw.md-449-scripts/sepolia/lib.js:37:  "function ownerOf(uint256) view returns (address)",
+docs/audit-12-codex-raw.md-450-docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
+docs/audit-12-codex-raw.md:451:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
+docs/audit-12-codex-raw.md-452-docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
+docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
+docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
+docs/audit-12-codex-raw.md-455-docs/AUDIT-RESPONSE-2026-08-18.md:164:| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
+docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
+docs/audit-12-codex-raw.md-457-docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
+--
+docs/audit-12-codex-raw.md-2024-    48	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
+docs/audit-12-codex-raw.md-2025-    49	    announce: env.ANNOUNCE !== "0",
+docs/audit-12-codex-raw.md-2026-    50	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
+docs/audit-12-codex-raw.md-2027-    51	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
+docs/audit-12-codex-raw.md-2028-    52	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
+docs/audit-12-codex-raw.md-2029-    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
+docs/audit-12-codex-raw.md:2030:    54	    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
+docs/audit-12-codex-raw.md-2031-    55	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
+docs/audit-12-codex-raw.md-2032-    56	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
+docs/audit-12-codex-raw.md-2033-    57	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
+docs/audit-12-codex-raw.md-2034-    58	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
+docs/audit-12-codex-raw.md-2035-    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
+docs/audit-12-codex-raw.md-2036-    60	  };
+--
+docs/audit-12-codex-raw.md-2452-ℹ skipped 0
+docs/audit-12-codex-raw.md-2453-ℹ todo 0
+docs/audit-12-codex-raw.md-2454-ℹ duration_ms 735.538358
+docs/audit-12-codex-raw.md-2455-
+docs/audit-12-codex-raw.md-2456-exec
+docs/audit-12-codex-raw.md-2457-/bin/bash -lc "nl -ba relayer-cf/test/link-check.test.mjs
+docs/audit-12-codex-raw.md:2458:node --input-type=module -e 'import { referencesNounsProposal as r } from \"./src/snap.js\"; const xs=[\"https://nouns.wtf/vote/989abc\",\"https://nouns.wtf/vote/989%20foo\",\"[t](https://nouns.wtf/vote/989)\",\"https://nouns.wtf/vote/989.後\",\"https://nouns.wtf/vote/989後。\",\"https://nouns.wtf/vote/989%E3%80%82\"]; for(const x of xs) console.log(JSON.stringify(x),r(x,989));'" in /mnt/data/pnouns-voter/relayer-cf
+docs/audit-12-codex-raw.md-2459- succeeded in 635ms:
+docs/audit-12-codex-raw.md:2460:"https://nouns.wtf/vote/989abc" false
+docs/audit-12-codex-raw.md:2461:"https://nouns.wtf/vote/989%20foo" false
+docs/audit-12-codex-raw.md-2462-"[t](https://nouns.wtf/vote/989)" true
+docs/audit-12-codex-raw.md-2463-"https://nouns.wtf/vote/989.後" false
+docs/audit-12-codex-raw.md-2464-"https://nouns.wtf/vote/989後。" true
+docs/audit-12-codex-raw.md-2465-"https://nouns.wtf/vote/989%E3%80%82" false
+docs/audit-12-codex-raw.md-2466-
+docs/audit-12-codex-raw.md-2467-exec
+--
+docs/audit-12-codex-raw.md-2547-exec
+docs/audit-12-codex-raw.md-2548-/bin/bash -lc 'git status --short
+docs/audit-12-codex-raw.md-2549-git diff --check 3ca7528''^ 3ca7528
+docs/audit-12-codex-raw.md-2550-node --input-type=module - <<'"'NODE'
+docs/audit-12-codex-raw.md-2551-import { referencesNounsProposal as ref } from './relayer-cf/src/snap.js';
+docs/audit-12-codex-raw.md-2552-const cases = [
+docs/audit-12-codex-raw.md:2553:  ['https://nouns.wtf/vote/989abc', false],
+docs/audit-12-codex-raw.md:2554:  ['https://nouns.wtf/vote/989%20foo', false],
+docs/audit-12-codex-raw.md-2555-  ['[t](https://nouns.wtf/vote/989)', true],
+docs/audit-12-codex-raw.md-2556-  ['https://nouns.wtf/vote/989.後', false],
+docs/audit-12-codex-raw.md-2557-  ['https://nouns.wtf/vote/989後。', true],
+docs/audit-12-codex-raw.md:2558:  ['https://nouns.wtf/vote/989偽', true],
+docs/audit-12-codex-raw.md-2559-];
+docs/audit-12-codex-raw.md-2560-for (const [s, expected] of cases) console.log("'`${ref(s,989)} expected=${expected} ${s}`);
+docs/audit-12-codex-raw.md-2561-NODE' in /mnt/data/pnouns-voter
+docs/audit-12-codex-raw.md-2562- succeeded in 641ms:
+docs/audit-12-codex-raw.md:2563:false expected=false https://nouns.wtf/vote/989abc
+docs/audit-12-codex-raw.md:2564:false expected=false https://nouns.wtf/vote/989%20foo
+docs/audit-12-codex-raw.md-2565-true expected=true [t](https://nouns.wtf/vote/989)
+docs/audit-12-codex-raw.md-2566-false expected=false https://nouns.wtf/vote/989.後
+docs/audit-12-codex-raw.md-2567-true expected=true https://nouns.wtf/vote/989後。
+docs/audit-12-codex-raw.md:2568:true expected=true https://nouns.wtf/vote/989偽
+docs/audit-12-codex-raw.md-2569-
+docs/audit-12-codex-raw.md-2570-差分・全呼び出し経路・ABI・境界入力を確認し、テストも完了しました。監査所見を重大度順に整理します。
+docs/audit-12-codex-raw.md-2571-  ✓ 対象コミットの差分・監査資料・関連コントラクトABIを確認する
+docs/audit-12-codex-raw.md-2572-  ✓ 5項目の制御フローと境界条件を行番号付きで検証する
+docs/audit-12-codex-raw.md-2573-  ✓ relayer-cf で npm test を実行する
+docs/audit-12-codex-raw.md-2574-  → 重大度別の監査報告をまとめる
+--
+docs/audit-12-codex-raw.md-2598-- `MAINNET_PROPOSER_MNEMONIC` は undefined
+docs/audit-12-codex-raw.md-2599-- `defined === undefined` は false
+docs/audit-12-codex-raw.md-2600-- 実際の作成鍵である `SEPOLIA_MNEMONIC` と registrar が同じでも通過する
+docs/audit-12-codex-raw.md-2601-
+docs/audit-12-codex-raw.md-2602-`undefined === undefined` により常に throw する問題ではなく、逆に比較がほぼ無意味になっています。
+docs/audit-12-codex-raw.md-2603-
+docs/audit-12-codex-raw.md:2604:さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。
+docs/audit-12-codex-raw.md-2605-
+docs/audit-12-codex-raw.md-2606-推奨する修正:
+docs/audit-12-codex-raw.md-2607-
+docs/audit-12-codex-raw.md-2608-- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
+docs/audit-12-codex-raw.md-2609-- すべての鍵・RPC・deployment 設定を、Snapshot 提案送信より前に検証する。
+docs/audit-12-codex-raw.md-2610-- mnemonic 文字列ではなく、各 mnemonic から導出したアドレスを比較する。
+docs/audit-12-codex-raw.md-2611-- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。
+docs/audit-12-codex-raw.md-2612-
+docs/audit-12-codex-raw.md-2613-### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる
+docs/audit-12-codex-raw.md-2614-
+docs/audit-12-codex-raw.md-2615-通常値や `0`、負数に対して `Math.max(300, c.minRegistrationDelay)` は正しく300以上になります。
+docs/audit-12-codex-raw.md-2616-
+docs/audit-12-codex-raw.md:2617:ただし、例えば `MIN_REGISTRATION_DELAY=abc` の場合:
+docs/audit-12-codex-raw.md-2618-
+docs/audit-12-codex-raw.md-2619-```js
+docs/audit-12-codex-raw.md-2620-c.minRegistrationDelay === NaN
+docs/audit-12-codex-raw.md-2621-Math.max(300, NaN) === NaN
+docs/audit-12-codex-raw.md-2622-Number(delay) < NaN === false
+docs/audit-12-codex-raw.md-2623-```
+--
+docs/audit-12-codex-raw.md-2625-となり、オンチェーン値が300未満でも fail-closed しません。「コード上の絶対下限300」という主張は、設定値が数値である場合に限って成立します。
+docs/audit-12-codex-raw.md-2626-
+docs/audit-12-codex-raw.md-2627-現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。
+docs/audit-12-codex-raw.md-2628-
+docs/audit-12-codex-raw.md-2629-推奨する修正:
+docs/audit-12-codex-raw.md-2630-
+docs/audit-12-codex-raw.md:2631:- `cfg()` で `MIN_REGISTRATION_DELAY` が有限の非負整数か検証し、不正なら throw する。
+docs/audit-12-codex-raw.md-2632-- その後に `Math.max(300, value)` を計算する。
+docs/audit-12-codex-raw.md-2633-
+docs/audit-12-codex-raw.md-2634-### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る
+docs/audit-12-codex-raw.md-2635-
+docs/audit-12-codex-raw.md-2636-実測結果は以下です。
+docs/audit-12-codex-raw.md-2637-
+docs/audit-12-codex-raw.md:2638:- `https://nouns.wtf/vote/989abc` → false
+docs/audit-12-codex-raw.md:2639:- `https://nouns.wtf/vote/989%20foo` → false
+docs/audit-12-codex-raw.md-2640-- `[t](https://nouns.wtf/vote/989)` → true
+docs/audit-12-codex-raw.md:2641:- `https://nouns.wtf/vote/989偽` → true
+docs/audit-12-codex-raw.md-2642-
+docs/audit-12-codex-raw.md-2643-最後の例は、URLとして解析すればパスは `/vote/989%E5%81%BD` ですが、解析前に `偽` が除去されるため `/vote/989` として受理されます。テスト中の `.../989後に投票` を受理する要件とは本質的に曖昧であり、日本語をURLの一部と後置文に字句上区別できません。
+docs/audit-12-codex-raw.md-2644-
+docs/audit-12-codex-raw.md-2645-また、2段階replaceの順序により次の取りこぼしがあります。
+docs/audit-12-codex-raw.md-2646-
+docs/audit-12-codex-raw.md-2647-- `https://nouns.wtf/vote/989.後` → false
+--
+docs/audit-12-codex-raw.md-2650-
+docs/audit-12-codex-raw.md-2651-推奨する修正:
+docs/audit-12-codex-raw.md-2652-
+docs/audit-12-codex-raw.md-2653-- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
+docs/audit-12-codex-raw.md-2654-- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
+docs/audit-12-codex-raw.md-2655-- 少なくとも以下をテストへ追加する。
+docs/audit-12-codex-raw.md:2656:  - `https://nouns.wtf/vote/989abc`
+docs/audit-12-codex-raw.md:2657:  - `https://nouns.wtf/vote/989%20foo`
+docs/audit-12-codex-raw.md:2658:  - `https://nouns.wtf/vote/989偽`
+docs/audit-12-codex-raw.md-2659-  - `https://nouns.wtf/vote/989.後`
+docs/audit-12-codex-raw.md-2660-  - `[t](https://nouns.wtf/vote/989)`
+docs/audit-12-codex-raw.md-2661-  - `[t](https://nouns.wtf/vote/989?x=(y))`
+docs/audit-12-codex-raw.md-2662-
+docs/audit-12-codex-raw.md-2663-### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる
+docs/audit-12-codex-raw.md-2664-
+--
+docs/audit-12-codex-raw.md-2797-- `MAINNET_PROPOSER_MNEMONIC` は undefined
+docs/audit-12-codex-raw.md-2798-- `defined === undefined` は false
+docs/audit-12-codex-raw.md-2799-- 実際の作成鍵である `SEPOLIA_MNEMONIC` と registrar が同じでも通過する
+docs/audit-12-codex-raw.md-2800-
+docs/audit-12-codex-raw.md-2801-`undefined === undefined` により常に throw する問題ではなく、逆に比較がほぼ無意味になっています。
+docs/audit-12-codex-raw.md-2802-
+docs/audit-12-codex-raw.md:2803:さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。
+docs/audit-12-codex-raw.md-2804-
+docs/audit-12-codex-raw.md-2805-推奨する修正:
+docs/audit-12-codex-raw.md-2806-
+docs/audit-12-codex-raw.md-2807-- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
+docs/audit-12-codex-raw.md-2808-- すべての鍵・RPC・deployment 設定を、Snapshot 提案送信より前に検証する。
+docs/audit-12-codex-raw.md-2809-- mnemonic 文字列ではなく、各 mnemonic から導出したアドレスを比較する。
+docs/audit-12-codex-raw.md-2810-- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。
+docs/audit-12-codex-raw.md-2811-
+docs/audit-12-codex-raw.md-2812-### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる
+docs/audit-12-codex-raw.md-2813-
+docs/audit-12-codex-raw.md-2814-通常値や `0`、負数に対して `Math.max(300, c.minRegistrationDelay)` は正しく300以上になります。
+docs/audit-12-codex-raw.md-2815-
+docs/audit-12-codex-raw.md:2816:ただし、例えば `MIN_REGISTRATION_DELAY=abc` の場合:
+docs/audit-12-codex-raw.md-2817-
+docs/audit-12-codex-raw.md-2818-```js
+docs/audit-12-codex-raw.md-2819-c.minRegistrationDelay === NaN
+docs/audit-12-codex-raw.md-2820-Math.max(300, NaN) === NaN
+docs/audit-12-codex-raw.md-2821-Number(delay) < NaN === false
+docs/audit-12-codex-raw.md-2822-```
+--
+docs/audit-12-codex-raw.md-2824-となり、オンチェーン値が300未満でも fail-closed しません。「コード上の絶対下限300」という主張は、設定値が数値である場合に限って成立します。
+docs/audit-12-codex-raw.md-2825-
+docs/audit-12-codex-raw.md-2826-現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。
+docs/audit-12-codex-raw.md-2827-
+docs/audit-12-codex-raw.md-2828-推奨する修正:
+docs/audit-12-codex-raw.md-2829-
+docs/audit-12-codex-raw.md:2830:- `cfg()` で `MIN_REGISTRATION_DELAY` が有限の非負整数か検証し、不正なら throw する。
+docs/audit-12-codex-raw.md-2831-- その後に `Math.max(300, value)` を計算する。
+docs/audit-12-codex-raw.md-2832-
+docs/audit-12-codex-raw.md-2833-### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る
+docs/audit-12-codex-raw.md-2834-
+docs/audit-12-codex-raw.md-2835-実測結果は以下です。
+docs/audit-12-codex-raw.md-2836-
+docs/audit-12-codex-raw.md:2837:- `https://nouns.wtf/vote/989abc` → false
+docs/audit-12-codex-raw.md:2838:- `https://nouns.wtf/vote/989%20foo` → false
+docs/audit-12-codex-raw.md-2839-- `[t](https://nouns.wtf/vote/989)` → true
+docs/audit-12-codex-raw.md:2840:- `https://nouns.wtf/vote/989偽` → true
+docs/audit-12-codex-raw.md-2841-
+docs/audit-12-codex-raw.md-2842-最後の例は、URLとして解析すればパスは `/vote/989%E5%81%BD` ですが、解析前に `偽` が除去されるため `/vote/989` として受理されます。テスト中の `.../989後に投票` を受理する要件とは本質的に曖昧であり、日本語をURLの一部と後置文に字句上区別できません。
+docs/audit-12-codex-raw.md-2843-
+docs/audit-12-codex-raw.md-2844-また、2段階replaceの順序により次の取りこぼしがあります。
+docs/audit-12-codex-raw.md-2845-
+docs/audit-12-codex-raw.md-2846-- `https://nouns.wtf/vote/989.後` → false
+--
+docs/audit-12-codex-raw.md-2849-
+docs/audit-12-codex-raw.md-2850-推奨する修正:
+docs/audit-12-codex-raw.md-2851-
+docs/audit-12-codex-raw.md-2852-- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
+docs/audit-12-codex-raw.md-2853-- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
+docs/audit-12-codex-raw.md-2854-- 少なくとも以下をテストへ追加する。
+docs/audit-12-codex-raw.md:2855:  - `https://nouns.wtf/vote/989abc`
+docs/audit-12-codex-raw.md:2856:  - `https://nouns.wtf/vote/989%20foo`
+docs/audit-12-codex-raw.md:2857:  - `https://nouns.wtf/vote/989偽`
+docs/audit-12-codex-raw.md-2858-  - `https://nouns.wtf/vote/989.後`
+docs/audit-12-codex-raw.md-2859-  - `[t](https://nouns.wtf/vote/989)`
+docs/audit-12-codex-raw.md-2860-  - `[t](https://nouns.wtf/vote/989?x=(y))`
+docs/audit-12-codex-raw.md-2861-
+docs/audit-12-codex-raw.md-2862-### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる
+docs/audit-12-codex-raw.md-2863-
+
+exec
+/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
+nl -ba contracts/PNounsSnapVoter.sol | sed -n '115,145p;178,235p;270,325p'
+rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+contracts/PNounsSnapVoter.sol:91:    mapping(uint256 => uint256) public registeredAtBlock;
+contracts/PNounsSnapVoter.sol:92:    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
+contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
+contracts/PNounsSnapVoter.sol:117:    event RegistrationDelaySet(uint256 blocks_);
+contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
+contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
+contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
+contracts/PNounsSnapVoter.sol:186:        registeredAtBlock[nounsProposalId] = block.number;
+contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
+contracts/PNounsSnapVoter.sol:201:        delete registeredAtBlock[nounsProposalId];
+contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
+contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
+contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
+relayer-cf/src/worker.js:461:        const floor = Math.max(300, c.minRegistrationDelay);
+relayer-cf/src/chain.js:54:    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
+relayer-cf/src/abi.js:413:  "name": "registeredAtBlock",
+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
+   115	    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
+   116	    event ProposalUnregistered(uint256 indexed nounsProposalId, bytes32 snapHash);
+   117	    event RegistrationDelaySet(uint256 blocks_);
+   118	    event SnapVoteCounted(uint256 indexed nounsProposalId, address indexed voter, uint8 support, uint32 counted, uint64 timestamp, bool revote);
+   119	    event Executed(uint256 indexed proposalId, uint8 support, uint256[3] tokens, uint256[3] voters, bool live);
+   120	    event ExcludedSet(address indexed account, bool isExcluded);
+   121	    event MarginBlocksSet(uint256 marginBlocks);
+   122	    event LiveModeSet(bool live);
+   123	    event RegistrarSet(address registrar);
+   124	    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
+   125	    event RefundEnabledSet(bool enabled);
+   126	    event RefundCapPerProposalSet(uint256 cap);
+   127	
+   128	    error NotRegistrar();
+   129	    error AlreadyRegistered();
+   130	    error NotRegistered();
+   131	    error InvalidChoice();
+   132	    error WrongSpace();
+   133	    error FromMismatch();
+   134	    error NoTokenIds();
+   135	    error ProposalNotVotable(uint8 state);
+   136	    error VotingClosed();
+   137	    error VotingNotClosed();
+   138	    error StaleVote();
+   139	    error RegistrationTooRecent();
+   140	    error InvalidSpace();
+   141	    error VotesAlreadyCounted();
+   142	    error InvalidFromAddress();
+   143	    error InvalidContractSignature();
+   144	    error NotTokenOwner(uint256 tokenId, address owner);
+   145	    error ExcludedVoter(address voter);
+   178	    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
+   179	    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
+   180	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
+   181	        bytes32 h = keccak256(bytes(snapshotProposal));
+   182	        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
+   183	        if (nounsProposalId == 0) revert NotRegistered();
+   184	        snapToNouns[h] = nounsProposalId;
+   185	        nounsToSnap[nounsProposalId] = h;
+   186	        registeredAtBlock[nounsProposalId] = block.number;
+   187	        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
+   188	        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
+   190	        emit ProposalRegistered(nounsProposalId, snapshotProposal);
+   191	    }
+   192	
+   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
+   194	    function unregisterProposal(uint256 nounsProposalId) external {
+   195	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
+   196	        bytes32 h = nounsToSnap[nounsProposalId];
+   197	        if (h == bytes32(0)) revert NotRegistered();
+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
+   199	        delete snapToNouns[h];
+   200	        delete nounsToSnap[nounsProposalId];
+   201	        delete registeredAtBlock[nounsProposalId];
+   202	        delete eligibleAtBlock[nounsProposalId];
+   203	        emit ProposalUnregistered(nounsProposalId, h);
+   204	    }
+   205	
+   206	    // ---- 参照 ----
+   207	    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
+   208	        Tally storage t = _tallies[proposalId];
+   209	        (tokens, voters) = _arrays(t);
+   210	        return (tokens, voters, t.executed, t.result);
+   211	    }
+   212	    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
+   213	        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
+   214	    }
+   215	    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }
+   216	
+   217	    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
+   218	        (bool ok, bytes memory data) = address(nounsDAO).staticcall(abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId));
+   219	        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
+   220	        uint256 id; uint256 startBlock; uint256 endBlock;
+   221	        assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
+   222	        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
+   223	        return endBlock;
+   224	    }
+   225	    function voteDeadline(uint256 proposalId) public view returns (uint256) {
+   226	        uint256 endBlock = nounsEndBlock(proposalId);
+   227	        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
+   228	    }
+   229	    function currentResult(uint256 proposalId) public view returns (uint8) {
+   230	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
+   231	        return _decide(tokens, voters);
+   232	    }
+   233	
+   234	    /// @notice Snapshot の Vote メッセージの EIP-712 ダイジェスト
+   235	    function snapVoteDigest(SnapVote calldata v) public view returns (bytes32) {
+   270	                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
+   271	            }
+   272	            uint8 support = _choiceToSupport(v.choice);
+   273	            snapCounted += _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
+   274	        }
+   275	        snapshotVotesCounted[nounsId] += snapCounted;
+   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
+   277	        _refundGas(startGas, votes.length, nounsId);
+   278	    }
+   279	
+   280	    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
+   281	    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
+   282	        uint256 startGas = gasleft();
+   283	        if (support > ABSTAIN) revert InvalidChoice();
+   284	        // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
+   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
+   286	        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
+   287	        _refundGas(startGas, 1, nounsProposalId);
+   288	    }
+   289	
+   290	    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal returns (uint32) {
+   291	        if (tokenIds.length == 0) revert NoTokenIds();
+   292	        if (excluded[voter]) revert ExcludedVoter(voter);
+   293	
+   294	        Tally storage t = _tallies[proposalId];
+   295	        uint256 deadline = t.deadline;
+   296	        if (deadline == 0) {
+   297	            uint8 st = nounsDAO.state(proposalId);
+   298	            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
+   299	            deadline = voteDeadline(proposalId);
+   300	            t.deadline = uint48(deadline);
+   301	        }
+   302	        if (block.number >= deadline) revert VotingClosed();
+   303	
+   304	        VoterRec storage rec = voterRec[proposalId][voter];
+   305	        bool supplement = rec.exists && timestamp == rec.timestamp && digest == rec.digest; // 同一署名の再提出 = token の補完(先回り 1 枚投函への対策)
+   306	        if (rec.exists && !supplement && timestamp <= rec.timestamp) revert StaleVote(); // やり直しは新しい署名のみ
+   307	
+   308	        uint256 counted = _countTokens(proposalId, voter, tokenIds);
+   309	
+   310	        if (!rec.exists) {
+   311	            if (counted == 0) revert NothingCounted();
+   312	            _addTally(t, support, uint32(counted), 1);
+   313	            voterRec[proposalId][voter] = VoterRec(true, support, uint32(counted), timestamp, digest);
+   314	            emit SnapVoteCounted(proposalId, voter, support, uint32(counted), timestamp, false);
+   315	            return uint32(counted);
+   316	        } else if (supplement) {
+   317	            // 同じ署名で未計上の token だけ追加(support は変わらず、投票者数も増やさない)
+   318	            if (counted == 0) revert NothingCounted();
+   319	            _addTally(t, rec.support, uint32(counted), 0);
+   320	            rec.counted += uint32(counted);
+   321	            emit SnapVoteCounted(proposalId, voter, rec.support, rec.counted, timestamp, false);
+   322	            return uint32(counted);
+   323	        } else {
+   324	            // やり直し: 既存の counted を新しい support へ移し、新たに数えられた token があれば加算
+   325	            _subTally(t, rec.support, rec.counted, 1);
+relayer-cf/src/worker.js:448:          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
+relayer-cf/src/worker.js:462:        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
+relayer-cf/src/abi.js:447:  "name": "registrationDelayBlocks",
+
+codex
+重要な追加所見があります。`REG_DELAY=7200` と現 Worker の組合せでは、猶予中の Snapshot 票を Worker が即座に simulate し、`RegistrationTooRecent` を「恒久 revert」と同じ扱いで数えます。5 tick 後に dead-letter 化するため、runbook の24時間猶予中に投票された票が約10分（mainnet 2分 cron）で自動除外され得ます。今回の9シナリオはこの実投函経路を通しておらず検出できていません。mainnet 移行前に塞ぐべき High と判断します。
+exec
+/bin/bash -lc 'node --test --test-reporter=spec test/worker-tick.test.mjs
+node --test --test-reporter=spec test/link-check.test.mjs' in /mnt/data/pnouns-voter/relayer-cf
+ succeeded in 1248ms:
+✔ test/worker-tick.test.mjs (648.875933ms)
+ℹ tests 1
+ℹ suites 0
+ℹ pass 1
+ℹ fail 0
+ℹ cancelled 0
+ℹ skipped 0
+ℹ todo 0
+ℹ duration_ms 652.782881
+✔ test/link-check.test.mjs (566.948326ms)
+ℹ tests 1
+ℹ suites 0
+ℹ pass 1
+ℹ fail 0
+ℹ cancelled 0
+ℹ skipped 0
+ℹ todo 0
+ℹ duration_ms 572.362108
+
+exec
+/bin/bash -lc 'node --test --test-isolation=none --test-reporter=spec test/worker-tick.test.mjs' in /mnt/data/pnouns-voter/relayer-cf
+ succeeded in 659ms:
+[snapshot hub] network down
+[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
+[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
+[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
+[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
+[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
+[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
+[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
+discord notify http 500
+[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:46 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
+discord notify http 500
+[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
+[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:46 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
+[config] registrationDelayBlocks(100) が最低値 300 未満です
+[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(100) が最低値 300 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
+[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
+[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
+[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
+[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:46 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
+[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
+[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
+✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (10.373949ms)
+✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (1.441641ms)
+✔ linkOk=false: 警告し、テストネットでも告知はしない (1.239338ms)
+✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (8.065935ms)
+✔ mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない) (0.446219ms)
+✔ mainnet: owner/registrar/relayer が同一なら停止 (0.286268ms)
+✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.298827ms)
+✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.782806ms)
+✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.765764ms)
+ℹ tests 9
+ℹ suites 0
+ℹ pass 9
+ℹ fail 0
+ℹ cancelled 0
+ℹ skipped 0
+ℹ todo 0
+ℹ duration_ms 658.281877
+
+exec
+/bin/bash -lc 'git status --short
+git rev-parse --short HEAD
+git diff --check 3e02162''^..3e02162
+git diff --check cc423e3''^..cc423e3' in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+cc423e3
+docs/audit-12-codex-raw.md:121: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:129: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:137: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:140: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:143: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:146: trailing whitespace.
++    
+docs/audit-12-codex-raw.md:156: trailing whitespace.
++ 
+docs/audit-12-codex-raw.md:243: trailing whitespace.
++ 
+docs/audit-12-codex-raw.md:310: trailing whitespace.
++ 
+docs/audit-12-codex-raw.md:631: trailing whitespace.
++     7	
+docs/audit-12-codex-raw.md:644: trailing whitespace.
++    20	
+docs/audit-12-codex-raw.md:651: trailing whitespace.
++    27	
+docs/audit-12-codex-raw.md:686: trailing whitespace.
++    62	
+docs/audit-12-codex-raw.md:709: trailing whitespace.
++    85	
+docs/audit-12-codex-raw.md:745: trailing whitespace.
++   121	
+docs/audit-12-codex-raw.md:776: trailing whitespace.
++   152	
+docs/audit-12-codex-raw.md:810: trailing whitespace.
++   186	
+docs/audit-12-codex-raw.md:834: trailing whitespace.
++   210	
+docs/audit-12-codex-raw.md:872: trailing whitespace.
++   248	
+docs/audit-12-codex-raw.md:923: trailing whitespace.
++   299	
+docs/audit-12-codex-raw.md:968: trailing whitespace.
++   344	
+docs/audit-12-codex-raw.md:983: trailing whitespace.
++   359	
+docs/audit-12-codex-raw.md:1002: trailing whitespace.
++   378	
+docs/audit-12-codex-raw.md:1012: trailing whitespace.
++   388	
+docs/audit-12-codex-raw.md:1136: trailing whitespace.
++    10	
+docs/audit-12-codex-raw.md:1140: trailing whitespace.
++    14	
+docs/audit-12-codex-raw.md:1167: trailing whitespace.
++    41	
+docs/audit-12-codex-raw.md:1190: trailing whitespace.
++    64	
+docs/audit-12-codex-raw.md:1232: trailing whitespace.
++   106	
+docs/audit-12-codex-raw.md:1349: trailing whitespace.
++    76	
+docs/audit-12-codex-raw.md:1357: trailing whitespace.
++    84	
+docs/audit-12-codex-raw.md:1360: trailing whitespace.
++    87	
+docs/audit-12-codex-raw.md:1375: trailing whitespace.
++   102	
+docs/audit-12-codex-raw.md:1389: trailing whitespace.
++   150	
+docs/audit-12-codex-raw.md:1404: trailing whitespace.
++   165	
+docs/audit-12-codex-raw.md:1416: trailing whitespace.
++   177	
+docs/audit-12-codex-raw.md:1431: trailing whitespace.
++   192	
+docs/audit-12-codex-raw.md:1444: trailing whitespace.
++   205	
+docs/audit-12-codex-raw.md:1454: trailing whitespace.
++   249	
+docs/audit-12-codex-raw.md:1484: trailing whitespace.
++   279	
+docs/audit-12-codex-raw.md:1494: trailing whitespace.
++   289	
+docs/audit-12-codex-raw.md:1498: trailing whitespace.
++   293	
+docs/audit-12-codex-raw.md:1514: trailing whitespace.
++    14	
+docs/audit-12-codex-raw.md:1521: trailing whitespace.
++    21	
+docs/audit-12-codex-raw.md:1528: trailing whitespace.
++    28	
+docs/audit-12-codex-raw.md:1539: trailing whitespace.
++    39	
+docs/audit-12-codex-raw.md:1553: trailing whitespace.
++    53	
+docs/audit-12-codex-raw.md:1564: trailing whitespace.
++    64	
+docs/audit-12-codex-raw.md:1639: trailing whitespace.
++   299	
+docs/audit-12-codex-raw.md:1684: trailing whitespace.
++   344	
+docs/audit-12-codex-raw.md:1699: trailing whitespace.
++   359	
+docs/audit-12-codex-raw.md:1718: trailing whitespace.
++   378	
+docs/audit-12-codex-raw.md:1728: trailing whitespace.
++   388	
+docs/audit-12-codex-raw.md:1862: trailing whitespace.
++    64	
+docs/audit-12-codex-raw.md:1904: trailing whitespace.
++   106	
+docs/audit-12-codex-raw.md:1982: trailing whitespace.
++     6	
+docs/audit-12-codex-raw.md:1997: trailing whitespace.
++    21	
+docs/audit-12-codex-raw.md:2100: trailing whitespace.
++     5	
+docs/audit-12-codex-raw.md:2104: trailing whitespace.
++     9	
+docs/audit-12-codex-raw.md:2107: trailing whitespace.
++    12	
+docs/audit-12-codex-raw.md:2111: trailing whitespace.
++    16	
+docs/audit-12-codex-raw.md:2127: trailing whitespace.
++    32	
+docs/audit-12-codex-raw.md:2176: trailing whitespace.
++   289	
+docs/audit-12-codex-raw.md:2180: trailing whitespace.
++   293	
+docs/audit-12-codex-raw.md:2190: trailing whitespace.
++   303	
+docs/audit-12-codex-raw.md:2194: trailing whitespace.
++   307	
+docs/audit-12-codex-raw.md:2196: trailing whitespace.
++   309	
+docs/audit-12-codex-raw.md:2220: trailing whitespace.
++   333	
+docs/audit-12-codex-raw.md:2235: trailing whitespace.
++   348	
+docs/audit-12-codex-raw.md:2247: trailing whitespace.
++   360	
+docs/audit-12-codex-raw.md:2262: trailing whitespace.
++   375	
+docs/audit-12-codex-raw.md:2270: trailing whitespace.
++   383	
+docs/audit-12-codex-raw.md:2285: trailing whitespace.
++   387	
+docs/audit-12-codex-raw.md:2388: trailing whitespace.
++    61	
+docs/audit-12-codex-raw.md:2429: trailing whitespace.
++   102	
+docs/audit-12-codex-raw.md:2477: trailing whitespace.
++     6	
+docs/audit-12-codex-raw.md:2489: trailing whitespace.
++    18	
+docs/audit-12-codex-raw.md:2495: trailing whitespace.
++    24	
+docs/audit-12-codex-raw.md:2504: trailing whitespace.
++    33	
+docs/audit-12-codex-raw.md:2509: trailing whitespace.
++    38	
+docs/audit-12-codex-raw.md:2514: trailing whitespace.
++    43	
+docs/audit-12-codex-raw.md:2527: trailing whitespace.
++    56	
+docs/audit-12-codex-raw.md:2533: trailing whitespace.
++    62	
+docs/audit-12-codex-raw.md:2699: trailing whitespace.
++- 最初の20件で `snapToNouns` がヒット  
+docs/audit-12-codex-raw.md:2700: trailing whitespace.
++  → `found` に入る  
+docs/audit-12-codex-raw.md:2701: trailing whitespace.
++  → `missing` から除外  
+docs/audit-12-codex-raw.md:2703: trailing whitespace.
++- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
+docs/audit-12-codex-raw.md:2704: trailing whitespace.
++  → `found` と `meta` に入る  
+docs/audit-12-codex-raw.md:2706: trailing whitespace.
++- 未登録、すなわち `nounsToSnap == 0`  
+docs/audit-12-codex-raw.md:2707: trailing whitespace.
++  → `need` に入らない  
+docs/audit-12-codex-raw.md:2709: trailing whitespace.
++- 登録済みだが200件内で未発見  
+docs/audit-12-codex-raw.md:2898: trailing whitespace.
++- 最初の20件で `snapToNouns` がヒット  
+docs/audit-12-codex-raw.md:2899: trailing whitespace.
++  → `found` に入る  
+docs/audit-12-codex-raw.md:2900: trailing whitespace.
++  → `missing` から除外  
+docs/audit-12-codex-raw.md:2902: trailing whitespace.
++- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
+docs/audit-12-codex-raw.md:2903: trailing whitespace.
++  → `found` と `meta` に入る  
+docs/audit-12-codex-raw.md:2905: trailing whitespace.
++- 未登録、すなわち `nounsToSnap == 0`  
+docs/audit-12-codex-raw.md:2906: trailing whitespace.
++  → `need` に入らない  
+docs/audit-12-codex-raw.md:2908: trailing whitespace.
++- 登録済みだが200件内で未発見  
+
+exec
+/bin/bash -lc "nl -ba contracts/PNounsSnapVoter.sol | sed -n '45,115p'
+rg -n \"refundEnabled\" contracts/PNounsSnapVoter.sol scripts/sepolia/12-deploy-snapvoter.js" in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+    45	    uint8 internal constant STATE_ACTIVE = 1;
+    46	
+    47	    // Snapshot の EIP-712(フィールドは name と version のみ)
+    48	    bytes32 internal constant SNAP_DOMAIN_SEPARATOR = keccak256(
+    49	        abi.encode(keccak256("EIP712Domain(string name,string version)"), keccak256(bytes("snapshot")), keccak256(bytes("0.1.4")))
+    50	    );
+    51	    bytes32 internal constant SNAP_VOTE_TYPEHASH = keccak256(
+    52	        "Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)"
+    53	    );
+    54	
+    55	    IERC721 public immutable pnouns;
+    56	    INounsDAO public immutable nounsDAO;
+    57	    /// @notice 対象の Snapshot スペース(例: "pnounsdao.eth")のハッシュ
+    58	    bytes32 public immutable spaceHash;
+    59	    /// @notice 対象の Snapshot スペース名(Nouns DAO に残す理由文に使う)
+    60	    string public space;
+    61	
+    62	    mapping(address => bool) public excluded;
+    63	    uint256 public marginBlocks;
+    64	    bool public liveMode;
+    65	    /// @notice Snapshot 提案 ↔ Nouns 提案の対応付けを登録できるアドレス
+    66	    address public registrar;
+    67	
+    68	    bool public refundEnabled = true;
+    69	    uint256 public refundCapPerProposal = 0.02 ether;
+    70	    mapping(uint256 => uint256) public refundedForProposal;
+    71	    uint256 public constant MAX_REFUND_PRIORITY_FEE = 2 gwei;
+    72	    uint256 public constant MAX_REFUND_BASE_FEE = 200 gwei;
+    73	    uint256 public constant REFUND_BASE_GAS = 55_000;
+    74	    uint256 public constant MAX_REFUND_GAS_BASE = 120_000;
+    75	    uint256 public constant MAX_REFUND_GAS_PER_VOTE = 90_000;
+    76	
+    77	    struct Tally {
+    78	        uint32 againstTokens; uint32 forTokens; uint32 abstainTokens;
+    79	        uint32 againstVoters; uint32 forVoters; uint32 abstainVoters;
+    80	        uint48 deadline; bool executed; uint8 result;
+    81	    }
+    82	    mapping(uint256 => Tally) internal _tallies;
+    83	    mapping(uint256 => mapping(uint256 => uint256)) internal _votedBitmap;
+    84	
+    85	    struct VoterRec { bool exists; uint8 support; uint32 counted; uint64 timestamp; bytes32 digest; }
+    86	    mapping(uint256 => mapping(address => VoterRec)) public voterRec;
+    87	
+    88	    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
+    89	    uint256 public registrationDelayBlocks;
+    90	    /// Nouns 提案 id → 登録ブロック
+    91	    mapping(uint256 => uint256) public registeredAtBlock;
+    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
+    93	    mapping(uint256 => uint256) public eligibleAtBlock;
+    94	    /// keccak(Snapshot 提案 id 文字列) → Nouns 提案 id
+    95	    mapping(bytes32 => uint256) public snapToNouns;
+    96	    /// Nouns 提案 id → keccak(Snapshot 提案 id 文字列)
+    97	    mapping(uint256 => bytes32) public nounsToSnap;
+    98	    /// @notice Snapshot 署名が受理された件数(やり直しで新規 token が 0 でも増える。取消可否の判定に使う)
+    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
+   100	    /// @notice Snapshot 由来で新たに計上された token 数(統計用途)
+   101	    mapping(uint256 => uint32) public snapshotVotesCounted;
+   102	
+   103	    struct SnapVote {
+   104	        string from;      // 署名メッセージの from(チェックサム表記のアドレス文字列)
+   105	        uint64 timestamp;
+   106	        string proposal;  // Snapshot 提案 id(文字列)
+   107	        uint32 choice;    // 1=賛成 2=反対 3=棄権
+   108	        string reason;
+   109	        string app;
+   110	        string metadata;
+   111	        bytes signature;
+   112	        uint256[] tokenIds; // リレイヤーが添える投票者の保有 tokenId(所有はコントラクトが検証)
+   113	    }
+   114	
+   115	    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
+contracts/PNounsSnapVoter.sol:68:    bool public refundEnabled = true;
+contracts/PNounsSnapVoter.sol:173:    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
+contracts/PNounsSnapVoter.sol:428:        if (!refundEnabled) return;
+
+codex
+## 総合判定
+
+mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
+
+最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
+
+## 主要所見
+
+### [High] 登録猶予中の正常票が dead-letter 化される
+
+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
+
+### [Medium] Snapshot送信後の登録失敗経路がまだ残る
+
+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
+
+### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
+
+[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
+
+### [Medium] check-deployが危険な構成を成功扱いし得る
+
+[scripts/check-deploy.mjs:27](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:27)、[scripts/check-deploy.mjs:43](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:43)、[scripts/check-deploy.mjs:62](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:62)、[scripts/check-deploy.mjs:78](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:78) / 以下が未検証です。
+
+- `excluded(address)` はABIにあるだけで、pNouns treasury `0x8ae80e…2785` を確認していません。
+- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
+- `EXPECT_RELAYER` がなく、意図したrelayerか確認できません。
+- runbookの「4鍵分離」に対し、Snapshot botとowner/relayerの同一性は検査されません。
+- `getCurrentVotes(voter)>0` は誰か1人の委任でも通り、対象マルチシグの `delegates(multisig)==voter` を保証しません。
+- 委任照会例外は警告だけで `failed` を増やしません。
+- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。
+
+/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
+
+### [Low] pendingnotesは上限超過・KV障害・重複に弱い
+
+[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
+
+Snapshot経路では `snapsent` を削除した後にキューへ書くため、Discord失敗に続いてKV putも失敗すると再送トリガーを失います。送信成功後のKV delete失敗や、Discordが受理した後の通信切断では重複します。textだけではtx単位の冪等管理もできません。 / `{id: txHash, text}` を持つdurable outboxにし、元トリガー削除より先に保存してください。Cloudflare Queues/Durable Object、またはイベント単位キーと明示的な容量監視が望まれます。
+
+### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
+
+[relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[relayer-cf/test/link-check.test.mjs:68](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:68) / 指定6ケースは期待値どおりです。
+
+- `989abc`、`989%20foo` → false
+- `989偽`、`989.後`、Markdown、クエリ内括弧 → true
+
+単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
+
+### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
+
+[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
+
+まだ穴のままなのは次です。
+
+- `submitFromSnapshot` の実simulate/write/reconcile
+- 登録猶予中の `RegistrationTooRecent`
+- rush複数batch
+- revote・supplement
+- IPFS fail count、dead-letter、snapdrop
+- receipt成功/revert/10分timeout
+- pendingnotes queue/flush
+- direct/non-Snapshotモード全般
+- `submitPending` とKV metadata list
+- execute送信・shadow→live・reconcile
+- timelineBadのmainnet/testnet差分
+- mainnetでdelayを次tickに再確認する経路
+- 複数提案間の例外分離、残高警告
+
+偽KVは強整合・TTL/metadata/pagination/失敗なしで、本物の結果整合性やRMW競合を再現しません。偽publicClientはaddress/ABI/accountを無視し、receipt/simulate/writeを実装しません。`allowFailure`の返却形状自体は概ね忠実です。fetchは本物の`Response`を使うため通常body streamは忠実ですが、分割・64KB超過・abort・通信途中切断は再現しません。
+
+## 問題なしと判断した項目
+
+- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
+
+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
+
+- [問題なし] / [relayer-cf/src/worker.js:54](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:54) / Snapshot・非SnapshotともDiscord 2xx後にのみannouncedを書きます。late提案を`late`記録する分岐は告知対象外なので妥当です。 / 修正不要。
+
+- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
+
+- [問題なし] / [relayer-cf/src/index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19) / relayerアドレスは送信txから公開される情報で、秘密鍵の推測材料にはなりません。`Cache-Control: no-store`も付与されます。 / 情報公開上の問題なし。
+
+- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
+
+## runbookの残課題
+
+[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
+
+Worker `/api/config` は単発取得なので、Cloudflareのデプロイ伝搬中に旧版を読み誤判定し得ます。`no-store`はデプロイ伝搬を解決しません。build/commit IDを返し、HTTP `ok`確認・cache-busting・複数回一致・`wrangler deployments status`確認を追加してください。`EXPECT_RELAYER`必須化後なら、旧版による誤った成功も防げます。
+
+## テスト結果
+
+- `relayer-cf/npm test`: 成功。4テストファイルすべてpass。
+- Worker 9シナリオを非分離表示で再実行: **9/9 pass**。
+- 通常の `npx hardhat test`: 読み取り専用環境のため `cache/solidity-files-cache.json` への書込みで `EROFS`。
+- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
+- 作業ツリーは変更していません。
+tokens used
+140,938
+## 総合判定
+
+mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
+
+最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
+
+## 主要所見
+
+### [High] 登録猶予中の正常票が dead-letter 化される
+
+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
+
+### [Medium] Snapshot送信後の登録失敗経路がまだ残る
+
+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
+
+### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
+
+[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
+
+### [Medium] check-deployが危険な構成を成功扱いし得る
+
+[scripts/check-deploy.mjs:27](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:27)、[scripts/check-deploy.mjs:43](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:43)、[scripts/check-deploy.mjs:62](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:62)、[scripts/check-deploy.mjs:78](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:78) / 以下が未検証です。
+
+- `excluded(address)` はABIにあるだけで、pNouns treasury `0x8ae80e…2785` を確認していません。
+- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
+- `EXPECT_RELAYER` がなく、意図したrelayerか確認できません。
+- runbookの「4鍵分離」に対し、Snapshot botとowner/relayerの同一性は検査されません。
+- `getCurrentVotes(voter)>0` は誰か1人の委任でも通り、対象マルチシグの `delegates(multisig)==voter` を保証しません。
+- 委任照会例外は警告だけで `failed` を増やしません。
+- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。
+
+/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
+
+### [Low] pendingnotesは上限超過・KV障害・重複に弱い
+
+[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
+
+Snapshot経路では `snapsent` を削除した後にキューへ書くため、Discord失敗に続いてKV putも失敗すると再送トリガーを失います。送信成功後のKV delete失敗や、Discordが受理した後の通信切断では重複します。textだけではtx単位の冪等管理もできません。 / `{id: txHash, text}` を持つdurable outboxにし、元トリガー削除より先に保存してください。Cloudflare Queues/Durable Object、またはイベント単位キーと明示的な容量監視が望まれます。
+
+### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
+
+[relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[relayer-cf/test/link-check.test.mjs:68](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:68) / 指定6ケースは期待値どおりです。
+
+- `989abc`、`989%20foo` → false
+- `989偽`、`989.後`、Markdown、クエリ内括弧 → true
+
+単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
+
+### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
+
+[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
+
+まだ穴のままなのは次です。
+
+- `submitFromSnapshot` の実simulate/write/reconcile
+- 登録猶予中の `RegistrationTooRecent`
+- rush複数batch
+- revote・supplement
+- IPFS fail count、dead-letter、snapdrop
+- receipt成功/revert/10分timeout
+- pendingnotes queue/flush
+- direct/non-Snapshotモード全般
+- `submitPending` とKV metadata list
+- execute送信・shadow→live・reconcile
+- timelineBadのmainnet/testnet差分
+- mainnetでdelayを次tickに再確認する経路
+- 複数提案間の例外分離、残高警告
+
+偽KVは強整合・TTL/metadata/pagination/失敗なしで、本物の結果整合性やRMW競合を再現しません。偽publicClientはaddress/ABI/accountを無視し、receipt/simulate/writeを実装しません。`allowFailure`の返却形状自体は概ね忠実です。fetchは本物の`Response`を使うため通常body streamは忠実ですが、分割・64KB超過・abort・通信途中切断は再現しません。
+
+## 問題なしと判断した項目
+
+- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
+
+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
+
+- [問題なし] / [relayer-cf/src/worker.js:54](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:54) / Snapshot・非SnapshotともDiscord 2xx後にのみannouncedを書きます。late提案を`late`記録する分岐は告知対象外なので妥当です。 / 修正不要。
+
+- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
+
+- [問題なし] / [relayer-cf/src/index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19) / relayerアドレスは送信txから公開される情報で、秘密鍵の推測材料にはなりません。`Cache-Control: no-store`も付与されます。 / 情報公開上の問題なし。
+
+- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
+
+## runbookの残課題
+
+[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
+
+Worker `/api/config` は単発取得なので、Cloudflareのデプロイ伝搬中に旧版を読み誤判定し得ます。`no-store`はデプロイ伝搬を解決しません。build/commit IDを返し、HTTP `ok`確認・cache-busting・複数回一致・`wrangler deployments status`確認を追加してください。`EXPECT_RELAYER`必須化後なら、旧版による誤った成功も防げます。
+
+## テスト結果
+
+- `relayer-cf/npm test`: 成功。4テストファイルすべてpass。
+- Worker 9シナリオを非分離表示で再実行: **9/9 pass**。
+- 通常の `npx hardhat test`: 読み取り専用環境のため `cache/solidity-files-cache.json` への書込みで `EROFS`。
+- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
+- 作業ツリーは変更していません。
diff --git a/hardhat.config.js b/hardhat.config.js
index 8ac4fdc..228c99e 100644
--- a/hardhat.config.js
+++ b/hardhat.config.js
@@ -1,33 +1,38 @@
 require("dotenv").config();
 require("@nomicfoundation/hardhat-toolbox");
 
 const FORK_URL = process.env.MAINNET_RPC_URL;
 
 /** @type import('hardhat/config').HardhatUserConfig */
 module.exports = {
   solidity: {
     compilers: [
       { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
       // pNouns NFT 本物ソース(contracts/vendor/pnouns、Sourcify 検証済み)用
       { version: "0.8.14", settings: { optimizer: { enabled: true, runs: 200 } } },
     ],
     overrides: {},
   },
   networks: {
+    mainnet: {
+      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
+      chainId: 1,
+      accounts: process.env.MAINNET_DEPLOYER_KEY ? [process.env.MAINNET_DEPLOYER_KEY] : [],
+    },
     sepolia: {
       url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
       chainId: 11155111,
       accounts: process.env.SEPOLIA_MNEMONIC ? { mnemonic: process.env.SEPOLIA_MNEMONIC, count: 5 } : [],
     },
     hardhat: {
       chainId: 1,
       forking: FORK_URL ? { url: FORK_URL } : undefined,
       // 大量マイニングを速くする
       allowUnlimitedContractSize: false,
     },
   },
   mocha: { timeout: 600000 },
   sourcify: { enabled: true },
   etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
   gasReporter: { enabled: !!process.env.REPORT_GAS, showMethodSig: true },
 };
diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
index a5d926f..95a55e0 100644
--- a/relayer-cf/src/chain.js
+++ b/relayer-cf/src/chain.js
@@ -101,94 +101,96 @@ export async function allOwners(c, pc) {
   const owners = [];
   const CH = 500;
   for (let start = 1; start <= total; start += CH) {
     const ids = [];
     for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
     const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
     res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
   }
   ownersCache = { at: Date.now(), owners };
   return owners;
 }
 export async function tokensOf(c, pc, address) {
   const owners = await allOwners(c, pc);
   const a = address.toLowerCase();
   const out = [];
   for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
   return out;
 }
 export async function recentProposals(c, pc) {
   const [count, block] = await Promise.all([
     pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
     pc.getBlockNumber(),
   ]);
   const ids = [];
   for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
   const res = await pc.multicall({
     contracts: ids.flatMap((id) => [
       { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
       { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
     ]),
     allowFailure: false,
   });
   const out = [];
   ids.forEach((id, i) => {
     const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
     // proposals() は名前付きタプルではなく配列で返る
     const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
     if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
     out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
   });
   return { block: Number(block), proposals: out };
 }
 // H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
 //  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
 //  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
 const titleMem = new Map();
 export async function proposalTitle(c, pc, store, id, creationBlock, state) {
   const frozen = state === 0 || state === 1;
   const kv = store ? store.kvRaw : null;
   if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
   const m = titleMem.get(id);
   if (!frozen && m && Date.now() - m.at < 30000) return m.title;
   let title = `Proposal ${id}`;
   try {
     const events = DAO_ABI.filter((x) => x.type === "event");
     const latest = await pc.getBlockNumber();
     const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
     const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
     let desc = "";
     for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === id) desc = String(l.args.description || "");
     for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description || desc);
     const first = desc.split("\n").find((x) => x.trim()) || "";
     title = first.replace(/^#+\s*/, "").trim() || title;
     if (updates.length) title += " (更新あり)";
   } catch (e) { /* タイトルは必須でない */ }
   if (frozen && kv) await kv.put(`title:${id}:final`, title, { expirationTtl: 86400 * 30 });
   else titleMem.set(id, { at: Date.now(), title });
   return title;
 }
 // pNouns 所有者キャッシュはメモリ(isolate 内)+ 60 秒。KV には書かない
 export async function metagovInfo(c, pc, proposalId) {
   const pid = BigInt(proposalId);
   const t0 = await pc.multicall({
     contracts: [
       { address: c.metagov, abi: METAGOV_ABI, functionName: "tally", args: [pid] },
       { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
       { address: c.nounsToken, abi: NOUNS_ABI, functionName: "getCurrentVotes", args: [c.metagov] },
       { address: c.metagov, abi: METAGOV_ABI, functionName: "currentResult", args: [pid] },
       { address: c.nounsDAO, abi: DAO_ABI, functionName: "getReceipt", args: [pid, c.metagov] },
       { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
+      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
     ],
     allowFailure: true,
   }).then((r) => r.map((x) => (x.status === "success" ? x.result : null)));
-  const [t, deadline, votes, cur, rcpt, live] = [t0[0], t0[1], t0[2], t0[3], t0[4], t0[5]];
+  const [t, deadline, votes, cur, rcpt, live, elig] = [t0[0], t0[1], t0[2], t0[3], t0[4], t0[5], t0[6]];
   const tally = t || [[0n, 0n, 0n], [0n, 0n, 0n], false, 0];
   const [tokens, voters, executed, result] = tally;
   return {
     tokens: tokens.map(Number), voters: voters.map(Number), executed, result: Number(executed ? result : cur ?? 2),
     deadline: Number(deadline || 0n), metagovVotes: Number(votes || 0n),
+    eligibleAt: Number(elig || 0n), // 登録猶予の解禁ブロック(第13回監査 High: 猶予中は投函しない)
     nounsReceipt: rcpt ? { hasVoted: rcpt.hasVoted, support: Number(rcpt.support), votes: Number(rcpt.votes) } : null,
     liveMode: !!live,
   };
 }
 export { verifyTypedData, getAddress, METAGOV_ABI };
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index e6c3e37..7faf7d2 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -1,329 +1,339 @@
 // cron ワーカー: 告知 / 投函 / execute / 残高警告。
 // 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
 import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
 import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
 import { keccak256, stringToBytes } from "viem";
 import { makeStore } from "./store.js";
 
 async function notify(c, text) {
   console.log("[notify]", text.replace(/\n/g, " ⏎ "));
   if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
   try {
     const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
     if (!r.ok) { console.warn("discord notify http", r.status); return false; }
     return true;
   }
   catch (e) { console.warn("discord notify failed", e.message); return false; }
 }
 const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
 
 // 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
 // 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
-async function queueNotify(c, store, text) {
+async function queueNotify(c, store, text, id = null) {
   if (await notify(c, text)) return true;
   const k = `${store.prefix}pendingnotes`;
   const arr = (await store.kvRaw.get(k, "json")) || [];
-  arr.push({ text, at: Date.now() });
+  if (id && arr.some((n) => n.id === id)) return false; // 同一 tx の通知は積み直さない(第13回監査)
+  arr.push({ id, text, at: Date.now() });
   await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
   return false;
 }
 async function flushPendingNotes(c, store) {
   const k = `${store.prefix}pendingnotes`;
   let arr;
   try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
   if (!Array.isArray(arr) || !arr.length) return;
-  const rest = [];
+  const rest = []; const seen = new Set();
   for (const n of arr) {
     if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
+    if (n.id) { if (seen.has(n.id)) continue; seen.add(n.id); }
     if (!(await notify(c, n.text))) rest.push(n);
   }
   if (rest.length !== arr.length) {
     if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
     else await store.kvRaw.delete(k);
   }
 }
 const WORDS = ["反対", "賛成", "棄権"];
 
+// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
+function revertErrorName(e) {
+  let x = e;
+  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
+  return null;
+}
 function isContractRevert(e) {
   // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
   let x = e;
   for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
   return false;
 }
 
 async function announceNew(c, pc, store, p, block, snapInfo) {
   const prev = await store.getAnnounced(p.id);
   // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
   if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
   const mg = await metagovInfo(c, pc, p.id);
   if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
   if (c.snapshotSpace) {
     if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
     const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
     const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
     const lines = [
       `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
       `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
       `締切: ${jst} ごろ (block ${mg.deadline})`,
       `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
       `提案の内容: https://nouns.wtf/vote/${p.id}`,
     ];
     // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
     if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
     return;
   }
   const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
   const deadlineBlock = mg.deadline || p.endBlock;
   const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
   const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
   // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
   if (await notify(c, [
     `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
     `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
     `締切: ${jst} ごろ (block ${deadlineBlock})`,
     `投票ページ: ${c.publicUrl}`,
     `提案の内容: https://nouns.wtf/vote/${p.id}`,
   ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
 }
 
 // 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
 const FORCE_LIST_MS = 20 * 60 * 1000;
 async function loadVotes(store, proposalId, force) {
   const sum = await store.getSummary(proposalId);
   const dirty = await store.dirtyAt(proposalId);
   const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
   if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
   const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
   const listed = await store.listVoteSummaries(proposalId);
   const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
   await store.putSummary(proposalId, summaries, listedAt);
   return { summaries, listedAt };
 }
 // 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
 function setStatus(summaries, voter, patch) {
   const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
   if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
 }
 async function flushSummary(store, proposalId, summaries) {
   const sum = await store.getSummary(proposalId);
   await store.putSummary(proposalId, summaries, sum.listedAt || 0);
 }
 
 // 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
 async function reconcileSent(c, pc, store, proposalId, summaries) {
   const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
   if (!sent.length) return false;
   const byTx = new Map();
   for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
   let changed = false;
   for (const [tx, vs] of byTx) {
     let rc = null;
     try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
     if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
     // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
     const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
     for (let i = 0; i < vs.length; i++) {
       const v = vs[i];
       if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
       else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
     }
     changed = true;
     if (rc && rc.status === "success") {
       if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
       const mg = await metagovInfo(c, pc, proposalId);
       const sent = await queueNotify(c, store, [
         `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
         `tx: ${explorerTx(c, tx)}`,
-      ].join("\n"));
+      ].join("\n"), tx);
       if (sent) await store.setFlag(`notified:${tx}`, 86400);
     } else {
       console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
     }
   }
   if (changed) await flushSummary(store, proposalId, summaries);
   return changed;
 }
 
 // B3: Snapshot ハブから署名を取得して castSnapshotVotes。
 //  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
 //  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
 //  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
 async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   const sentK = `${store.prefix}snapsent:${nounsId}`;
   const pending = await store.kvRaw.get(sentK, "json");
   if (pending) {
     let allMined = true, anySuccess = false, gasTotal = 0n;
     for (const tx of pending.txs) {
       let rc = null;
       try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
       if (!rc) { allMined = false; continue; }
       if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
       else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
     }
     if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
     await store.kvRaw.delete(sentK);
     // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
     if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
       const mg = await metagovInfo(c, pc, nounsId);
       const sent = await queueNotify(c, store, [
         `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
         `tx: ${explorerTx(c, pending.txs[0])}`,
-      ].join("\n"));
+      ].join("\n"), pending.txs[0]);
       if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
     }
     return;
   }
 
   // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   const scanK = scanKey(store, nounsId, snapInfo.snapId);
   const offset = Number(await store.kvRaw.get(scanK)) || 0;
   const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   const deadLetters = new Set(deadArr);
   // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   const owners = await allOwners(c, pc);
   const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   const tokenCounts = tokensByRow.map((ids) => ids.length);
   // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   const votedByToken = new Map();
   for (let start = 0; start < checkTokenIds.length; start += 200) {
     const ids = checkTokenIds.slice(start, start + 200);
     const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
     ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   }
   const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   const batches = rush ? c.rushBatches : 1;
   const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
 
   // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   for (const { row, index } of send) {
     const env = await fetchEnvelope(c, row, snapInfo.snapId);
     if (!env) {
       fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
       if (fails[row.ipfs] >= 20) {
         deadArr.push(row.ipfs); deadChanged = true;
         await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
       }
       break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
     }
     const m = env.data.message;
     const tokenIds = [];
     for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
     const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
     args.push(arg); cidOf.set(arg, row.ipfs);
   }
   if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   if (!args.length) return;
 
   const txs = []; let count = 0;
   for (let b = 0; b < batches; b++) {
     const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
     if (!chunk.length) break;
     try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
     catch (e) {
       if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
+      // 第13回監査 High の二重防御: 猶予境界の競合など、票の欠陥ではない revert は数えずに次 tick へ
+      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
       const good = [];
       for (const a2 of chunk.slice(0, 10)) {
         try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
         catch (e2) {
           const cid = cidOf.get(a2);
-          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
+          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
             drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
             if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
           }
           console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
         }
       }
       if (!good.length) continue;
       // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
       // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
       try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
       catch (e3) {
         if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
         good.length = 1;
       }
       chunk.length = 0; chunk.push(...good);
     }
     const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
     const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
     console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
     txs.push(hash); count += chunk.length;
   }
   if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
 }
 
 async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   const { summaries } = await loadVotes(store, proposalId, rush);
   if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   let touched = false;
   for (let b = 0; b < batches; b++) {
     const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
     if (!pendingSummaries.length) break;
     // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
     const pending = [];
     for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
     // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
     const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
     const cands = [];
     for (let i = 0; i < pending.length; i++) {
       if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
       cands.push(pending[i]);
     }
     if (!cands.length) continue;
     // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
     let good = cands;
     try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
     catch (e) {
       if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
       good = [];
       for (const v of cands.slice(0, 10)) {
         try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
         catch (e2) {
           if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
         }
       }
       if (!good.length) continue;
     }
     const args = good.map(toArg);
     const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
     const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
     console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
     const sentAt = new Date().toISOString();
     for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
     touched = true;
     if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
       await new Promise((r) => setTimeout(r, 1500));
       // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
     }
   }
   if (touched) await flushSummary(store, proposalId, summaries);
   // receipt は待たない(次回 tick の reconcile で確定・通知)
 }
 
 async function maybeExecute(c, pc, wc, store, p, block, mg) {
   const ex = await store.getExecuted(p.id);
   if (ex && ex.pending && ex.tx) {
     // 送信済み・未確定の execute を確定
@@ -441,100 +451,103 @@ export async function tick(env) {
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
         const floor = Math.max(300, c.minRegistrationDelay);
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
         // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
         // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
         // 「告知済み」が記録されて正しい URL の再告知も止まる。
         if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
           await announceNew(c, pc, store, p, block, snapInfo);
         }
         if (linkBad && c.network === "mainnet") continue;
         if (timelineBad && c.network === "mainnet") continue;
         if (!wc) continue;
         if (block < mg.deadline) {
           if (c.snapshotSpace) {
-            if (snapInfo) {
+            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
+            // これを投函失敗として数えると、猶予中(24h)に届いた正常票が dead-letter 化されるため、
+            // 解禁ブロックまで投函自体を行わない(票は Snapshot に残り、解禁後に投函される)。
+            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
               const rush = shouldRushSubmit(c, block, mg.deadline);
               await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
             }
           }
           else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
         } else if (!c.snapshotSpace || snapInfo) {
           // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
           // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
           await maybeExecute(c, pc, wc, store, p, block, mg);
         }
       } catch (e) {
         await notifyError(c, `worker prop ${p.id}`, e);
       }
     }
   } catch (e) {
     await notifyError(c, "worker tick", e);
   }
 }
 export { notify };
diff --git a/scripts/mainnet/deploy-snapvoter.js b/scripts/mainnet/deploy-snapvoter.js
new file mode 100644
index 0000000..c7f903b
--- /dev/null
+++ b/scripts/mainnet/deploy-snapvoter.js
@@ -0,0 +1,53 @@
+// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
+// 使い方(必須値はすべて明示。fallback なし):
+//   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
+//     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
+//   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
+const { ethers, network } = require("hardhat");
+const fs = require("fs");
+const path = require("path");
+const MAINNET = {
+  NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
+  PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+};
+async function main() {
+  const owner = process.env.OWNER, registrar = process.env.REGISTRAR;
+  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
+  const delay = Number(process.env.REG_DELAY || 7200);
+  const margin = Number(process.env.MARGIN || 300);
+  if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
+  if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
+  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
+  if (!Number.isInteger(delay) || delay < 300) throw new Error("REG_DELAY は 300 以上(運用値 7200 = 約 24 時間)");
+  const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
+  if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
+  const [deployer] = await ethers.getSigners();
+  if (!deployer) throw new Error("デプロイ用アカウントがありません(MAINNET_DEPLOYER_KEY を設定)");
+  console.log(`network=${network.name} deployer=${deployer.address}`);
+  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=pnounsdao.eth`);
+  if (process.env.DRY_RUN === "1") { console.log("--- DRY_RUN: デプロイしません ---"); return; }
+  if (network.name === "hardhat") await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x1"]); // フォークでのテスト実行用
+  const F = await ethers.getContractFactory("PNounsSnapVoter");
+  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, "pnounsdao.eth", excluded, margin, delay);
+  await c.waitForDeployment();
+  const addr = await c.getAddress();
+  // 読み戻し検証(設定漏れをその場で検出)
+  const checks = [
+    ["space", await c.space(), "pnounsdao.eth"],
+    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
+    ["marginBlocks", Number(await c.marginBlocks()), margin],
+    ["owner", (await c.owner()).toLowerCase(), owner.toLowerCase()],
+    ["registrar", (await c.registrar()).toLowerCase(), registrar.toLowerCase()],
+    ["liveMode", await c.liveMode(), false],
+  ];
+  for (const [k, got, want] of checks) if (String(got) !== String(want)) throw new Error(`読み戻し不一致 ${k}: ${got} != ${want}`);
+  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
+  const dep = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
+  dep.snapVoter = addr;
+  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
+  fs.mkdirSync(path.dirname(out), { recursive: true });
+  fs.writeFileSync(out, JSON.stringify(dep, null, 2));
+  console.log(`デプロイ完了: ${addr} (block ${dep.snapVoterDeployBlock}) → ${out}`);
+  console.log("次: Sourcify 検証 → NETWORK=mainnet node scripts/check-deploy.mjs --stage deployed");
+}
+main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });

exec
/bin/bash -lc "git show --format= --name-only 1be9d16 && rg -n \"\\[High\\]|\\[Medium\\]|\\[Low\\]|RegistrationTooRecent|dead-letter|総評|結論\" docs/audit-13-codex-raw.md | tail -80 && nl -ba relayer-cf/src/chain.js | sed -n '1,170p' && nl -ba relayer-cf/src/abi.js | sed -n '1,260p' && nl -ba relayer-cf/src/worker.js | sed -n '1,230p' && nl -ba relayer-cf/src/worker.js | sed -n '430,570p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
docs/AUDIT-RESPONSE-2026-08-18.md
docs/RUNBOOK-MAINNET.md
docs/audit-13-codex-raw.md
hardhat.config.js
relayer-cf/src/chain.js
relayer-cf/src/snap.js
relayer-cf/src/worker.js
relayer-cf/test/worker-tick.test.mjs
scripts/check-deploy.mjs
scripts/create-and-register.mjs
scripts/mainnet/deploy-snapvoter.js
57:   dead-letter、reconcile、非 Snapshot モード全般)
1169:     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
3290:     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
3862:contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
3869:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
3870:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
3899:   139	    error RegistrationTooRecent();
3979:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
4026:重要な追加所見があります。`REG_DELAY=7200` と現 Worker の組合せでは、猶予中の Snapshot 票を Worker が即座に simulate し、`RegistrationTooRecent` を「恒久 revert」と同じ扱いで数えます。5 tick 後に dead-letter 化するため、runbook の24時間猶予中に投票された票が約10分（mainnet 2分 cron）で自動除外され得ます。今回の9シナリオはこの実投函経路を通しておらず検出できていません。mainnet 移行前に塞ぐべき High と判断します。
4382:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
4386:### [High] 登録猶予中の正常票が dead-letter 化される
4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
4390:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
4394:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
4398:### [Medium] check-deployが危険な構成を成功扱いし得る
4412:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
4418:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
4427:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
4434:- 登録猶予中の `RegistrationTooRecent`
4437:- IPFS fail count、dead-letter、snapdrop
4465:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
4482:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
4486:### [High] 登録猶予中の正常票が dead-letter 化される
4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
4490:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
4494:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
4498:### [Medium] check-deployが危険な構成を成功扱いし得る
4512:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
4518:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
4527:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
4534:- 登録猶予中の `RegistrationTooRecent`
4537:- IPFS fail count、dead-letter、snapdrop
4565:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
     1	// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
     2	import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
     3	import { privateKeyToAccount } from "viem/accounts";
     4	import { mainnet, sepolia } from "viem/chains";
     5	import { METAGOV_ABI } from "./abi.js";
     6	
     7	export const DAO_ABI = parseAbi([
     8	  "function proposalCount() view returns (uint256)",
     9	  "function state(uint256) view returns (uint8)",
    10	  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
    12	  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
    13	  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
    14	  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
    15	  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
    16	]);
    17	export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
    18	export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
    19	export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
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
    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
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
    96	// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
    97	let ownersCache = { at: 0, owners: [] };
    98	export async function allOwners(c, pc) {
    99	  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
   100	  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
   101	  const owners = [];
   102	  const CH = 500;
   103	  for (let start = 1; start <= total; start += CH) {
   104	    const ids = [];
   105	    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
   106	    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
   107	    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
   108	  }
   109	  ownersCache = { at: Date.now(), owners };
   110	  return owners;
   111	}
   112	export async function tokensOf(c, pc, address) {
   113	  const owners = await allOwners(c, pc);
   114	  const a = address.toLowerCase();
   115	  const out = [];
   116	  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
   117	  return out;
   118	}
   119	export async function recentProposals(c, pc) {
   120	  const [count, block] = await Promise.all([
   121	    pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
   122	    pc.getBlockNumber(),
   123	  ]);
   124	  const ids = [];
   125	  for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
   126	  const res = await pc.multicall({
   127	    contracts: ids.flatMap((id) => [
   128	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
   129	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
   130	    ]),
   131	    allowFailure: false,
   132	  });
   133	  const out = [];
   134	  ids.forEach((id, i) => {
   135	    const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
   136	    // proposals() は名前付きタプルではなく配列で返る
   137	    const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
   138	    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
   139	    out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
   140	  });
   141	  return { block: Number(block), proposals: out };
   142	}
   143	// H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
   144	//  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
   145	//  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
   146	const titleMem = new Map();
   147	export async function proposalTitle(c, pc, store, id, creationBlock, state) {
   148	  const frozen = state === 0 || state === 1;
   149	  const kv = store ? store.kvRaw : null;
   150	  if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
   151	  const m = titleMem.get(id);
   152	  if (!frozen && m && Date.now() - m.at < 30000) return m.title;
   153	  let title = `Proposal ${id}`;
   154	  try {
   155	    const events = DAO_ABI.filter((x) => x.type === "event");
   156	    const latest = await pc.getBlockNumber();
   157	    const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
   158	    const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
   159	    let desc = "";
   160	    for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === id) desc = String(l.args.description || "");
   161	    for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description || desc);
   162	    const first = desc.split("\n").find((x) => x.trim()) || "";
   163	    title = first.replace(/^#+\s*/, "").trim() || title;
   164	    if (updates.length) title += " (更新あり)";
   165	  } catch (e) { /* タイトルは必須でない */ }
   166	  if (frozen && kv) await kv.put(`title:${id}:final`, title, { expirationTtl: 86400 * 30 });
   167	  else titleMem.set(id, { at: Date.now(), title });
   168	  return title;
   169	}
   170	// pNouns 所有者キャッシュはメモリ(isolate 内)+ 60 秒。KV には書かない
     1	// PNounsSnapVoter の必要最小限 ABI
     2	export const METAGOV_ABI = [
     3	 {
     4	  "anonymous": false,
     5	  "inputs": [
     6	   {
     7	    "indexed": true,
     8	    "internalType": "uint256",
     9	    "name": "proposalId",
    10	    "type": "uint256"
    11	   },
    12	   {
    13	    "indexed": false,
    14	    "internalType": "uint8",
    15	    "name": "support",
    16	    "type": "uint8"
    17	   },
    18	   {
    19	    "indexed": false,
    20	    "internalType": "uint256[3]",
    21	    "name": "tokens",
    22	    "type": "uint256[3]"
    23	   },
    24	   {
    25	    "indexed": false,
    26	    "internalType": "uint256[3]",
    27	    "name": "voters",
    28	    "type": "uint256[3]"
    29	   },
    30	   {
    31	    "indexed": false,
    32	    "internalType": "bool",
    33	    "name": "live",
    34	    "type": "bool"
    35	   }
    36	  ],
    37	  "name": "Executed",
    38	  "type": "event"
    39	 },
    40	 {
    41	  "anonymous": false,
    42	  "inputs": [
    43	   {
    44	    "indexed": true,
    45	    "internalType": "uint256",
    46	    "name": "nounsProposalId",
    47	    "type": "uint256"
    48	   },
    49	   {
    50	    "indexed": false,
    51	    "internalType": "string",
    52	    "name": "snapshotProposal",
    53	    "type": "string"
    54	   }
    55	  ],
    56	  "name": "ProposalRegistered",
    57	  "type": "event"
    58	 },
    59	 {
    60	  "anonymous": false,
    61	  "inputs": [
    62	   {
    63	    "indexed": true,
    64	    "internalType": "uint256",
    65	    "name": "nounsProposalId",
    66	    "type": "uint256"
    67	   },
    68	   {
    69	    "indexed": false,
    70	    "internalType": "bytes32",
    71	    "name": "snapHash",
    72	    "type": "bytes32"
    73	   }
    74	  ],
    75	  "name": "ProposalUnregistered",
    76	  "type": "event"
    77	 },
    78	 {
    79	  "anonymous": false,
    80	  "inputs": [
    81	   {
    82	    "indexed": true,
    83	    "internalType": "address",
    84	    "name": "refundee",
    85	    "type": "address"
    86	   },
    87	   {
    88	    "indexed": false,
    89	    "internalType": "uint256",
    90	    "name": "refundAmount",
    91	    "type": "uint256"
    92	   },
    93	   {
    94	    "indexed": false,
    95	    "internalType": "bool",
    96	    "name": "refundSent",
    97	    "type": "bool"
    98	   }
    99	  ],
   100	  "name": "RefundableVote",
   101	  "type": "event"
   102	 },
   103	 {
   104	  "anonymous": false,
   105	  "inputs": [
   106	   {
   107	    "indexed": true,
   108	    "internalType": "uint256",
   109	    "name": "nounsProposalId",
   110	    "type": "uint256"
   111	   },
   112	   {
   113	    "indexed": true,
   114	    "internalType": "address",
   115	    "name": "voter",
   116	    "type": "address"
   117	   },
   118	   {
   119	    "indexed": false,
   120	    "internalType": "uint8",
   121	    "name": "support",
   122	    "type": "uint8"
   123	   },
   124	   {
   125	    "indexed": false,
   126	    "internalType": "uint32",
   127	    "name": "counted",
   128	    "type": "uint32"
   129	   },
   130	   {
   131	    "indexed": false,
   132	    "internalType": "uint64",
   133	    "name": "timestamp",
   134	    "type": "uint64"
   135	   },
   136	   {
   137	    "indexed": false,
   138	    "internalType": "bool",
   139	    "name": "revote",
   140	    "type": "bool"
   141	   }
   142	  ],
   143	  "name": "SnapVoteCounted",
   144	  "type": "event"
   145	 },
   146	 {
   147	  "inputs": [
   148	   {
   149	    "components": [
   150	     {
   151	      "internalType": "string",
   152	      "name": "from",
   153	      "type": "string"
   154	     },
   155	     {
   156	      "internalType": "uint64",
   157	      "name": "timestamp",
   158	      "type": "uint64"
   159	     },
   160	     {
   161	      "internalType": "string",
   162	      "name": "proposal",
   163	      "type": "string"
   164	     },
   165	     {
   166	      "internalType": "uint32",
   167	      "name": "choice",
   168	      "type": "uint32"
   169	     },
   170	     {
   171	      "internalType": "string",
   172	      "name": "reason",
   173	      "type": "string"
   174	     },
   175	     {
   176	      "internalType": "string",
   177	      "name": "app",
   178	      "type": "string"
   179	     },
   180	     {
   181	      "internalType": "string",
   182	      "name": "metadata",
   183	      "type": "string"
   184	     },
   185	     {
   186	      "internalType": "bytes",
   187	      "name": "signature",
   188	      "type": "bytes"
   189	     },
   190	     {
   191	      "internalType": "uint256[]",
   192	      "name": "tokenIds",
   193	      "type": "uint256[]"
   194	     }
   195	    ],
   196	    "internalType": "struct PNounsSnapVoter.SnapVote[]",
   197	    "name": "votes",
   198	    "type": "tuple[]"
   199	   }
   200	  ],
   201	  "name": "castSnapshotVotes",
   202	  "outputs": [],
   203	  "stateMutability": "nonpayable",
   204	  "type": "function"
   205	 },
   206	 {
   207	  "inputs": [
   208	   {
   209	    "internalType": "uint256",
   210	    "name": "nounsProposalId",
   211	    "type": "uint256"
   212	   },
   213	   {
   214	    "internalType": "uint8",
   215	    "name": "support",
   216	    "type": "uint8"
   217	   },
   218	   {
   219	    "internalType": "uint256[]",
   220	    "name": "tokenIds",
   221	    "type": "uint256[]"
   222	   }
   223	  ],
   224	  "name": "castVote",
   225	  "outputs": [],
   226	  "stateMutability": "nonpayable",
   227	  "type": "function"
   228	 },
   229	 {
   230	  "inputs": [
   231	   {
   232	    "internalType": "uint256",
   233	    "name": "proposalId",
   234	    "type": "uint256"
   235	   }
   236	  ],
   237	  "name": "currentResult",
   238	  "outputs": [
   239	   {
   240	    "internalType": "uint8",
   241	    "name": "",
   242	    "type": "uint8"
   243	   }
   244	  ],
   245	  "stateMutability": "view",
   246	  "type": "function"
   247	 },
   248	 {
   249	  "inputs": [
   250	   {
   251	    "internalType": "address",
   252	    "name": "",
   253	    "type": "address"
   254	   }
   255	  ],
   256	  "name": "excluded",
   257	  "outputs": [
   258	   {
   259	    "internalType": "bool",
   260	    "name": "",
     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
     5	import { keccak256, stringToBytes } from "viem";
     6	import { makeStore } from "./store.js";
     7	
     8	async function notify(c, text) {
     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
    11	  try {
    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
    14	    return true;
    15	  }
    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
    17	}
    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
    19	
    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
    22	async function queueNotify(c, store, text, id = null) {
    23	  if (await notify(c, text)) return true;
    24	  const k = `${store.prefix}pendingnotes`;
    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
    26	  if (id && arr.some((n) => n.id === id)) return false; // 同一 tx の通知は積み直さない(第13回監査)
    27	  arr.push({ id, text, at: Date.now() });
    28	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
    29	  return false;
    30	}
    31	async function flushPendingNotes(c, store) {
    32	  const k = `${store.prefix}pendingnotes`;
    33	  let arr;
    34	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
    35	  if (!Array.isArray(arr) || !arr.length) return;
    36	  const rest = []; const seen = new Set();
    37	  for (const n of arr) {
    38	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
    39	    if (n.id) { if (seen.has(n.id)) continue; seen.add(n.id); }
    40	    if (!(await notify(c, n.text))) rest.push(n);
    41	  }
    42	  if (rest.length !== arr.length) {
    43	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
    44	    else await store.kvRaw.delete(k);
    45	  }
    46	}
    47	const WORDS = ["反対", "賛成", "棄権"];
    48	
    49	// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
    50	function revertErrorName(e) {
    51	  let x = e;
    52	  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
    53	  return null;
    54	}
    55	function isContractRevert(e) {
    56	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
    57	  let x = e;
    58	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
    59	  return false;
    60	}
    61	
    62	async function announceNew(c, pc, store, p, block, snapInfo) {
    63	  const prev = await store.getAnnounced(p.id);
    64	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
    65	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
    66	  const mg = await metagovInfo(c, pc, p.id);
    67	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
    68	  if (c.snapshotSpace) {
    69	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
    70	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
    71	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    72	    const lines = [
    73	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
    74	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
    75	      `締切: ${jst} ごろ (block ${mg.deadline})`,
    76	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
    77	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    78	    ];
    79	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
    80	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    81	    return;
    82	  }
    83	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
    84	  const deadlineBlock = mg.deadline || p.endBlock;
    85	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
    86	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    87	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
    88	  if (await notify(c, [
    89	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    90	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    91	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    92	    `投票ページ: ${c.publicUrl}`,
    93	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
    94	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
    95	}
    96	
    97	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
    98	const FORCE_LIST_MS = 20 * 60 * 1000;
    99	async function loadVotes(store, proposalId, force) {
   100	  const sum = await store.getSummary(proposalId);
   101	  const dirty = await store.dirtyAt(proposalId);
   102	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
   103	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
   104	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
   105	  const listed = await store.listVoteSummaries(proposalId);
   106	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
   107	  await store.putSummary(proposalId, summaries, listedAt);
   108	  return { summaries, listedAt };
   109	}
   110	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
   111	function setStatus(summaries, voter, patch) {
   112	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
   113	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
   114	}
   115	async function flushSummary(store, proposalId, summaries) {
   116	  const sum = await store.getSummary(proposalId);
   117	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
   118	}
   119	
   120	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
   121	async function reconcileSent(c, pc, store, proposalId, summaries) {
   122	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
   123	  if (!sent.length) return false;
   124	  const byTx = new Map();
   125	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
   126	  let changed = false;
   127	  for (const [tx, vs] of byTx) {
   128	    let rc = null;
   129	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   130	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
   131	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
   132	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   133	    for (let i = 0; i < vs.length; i++) {
   134	      const v = vs[i];
   135	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
   136	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
   137	    }
   138	    changed = true;
   139	    if (rc && rc.status === "success") {
   140	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
   141	      const mg = await metagovInfo(c, pc, proposalId);
   142	      const sent = await queueNotify(c, store, [
   143	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
   144	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   145	        `tx: ${explorerTx(c, tx)}`,
   146	      ].join("\n"), tx);
   147	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
   148	    } else {
   149	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
   150	    }
   151	  }
   152	  if (changed) await flushSummary(store, proposalId, summaries);
   153	  return changed;
   154	}
   155	
   156	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   157	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   158	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   159	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   160	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   161	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   162	  const pending = await store.kvRaw.get(sentK, "json");
   163	  if (pending) {
   164	    let allMined = true, anySuccess = false, gasTotal = 0n;
   165	    for (const tx of pending.txs) {
   166	      let rc = null;
   167	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   168	      if (!rc) { allMined = false; continue; }
   169	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   170	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   171	    }
   172	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   173	    await store.kvRaw.delete(sentK);
   174	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   175	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   176	      const mg = await metagovInfo(c, pc, nounsId);
   177	      const sent = await queueNotify(c, store, [
   178	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   179	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   180	        `tx: ${explorerTx(c, pending.txs[0])}`,
   181	      ].join("\n"), pending.txs[0]);
   182	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   183	    }
   184	    return;
   185	  }
   186	
   187	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   188	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   189	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   190	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   191	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   192	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   193	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   194	  const deadLetters = new Set(deadArr);
   195	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   196	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   197	  const owners = await allOwners(c, pc);
   198	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   199	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   200	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   201	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   202	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   203	  const votedByToken = new Map();
   204	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   205	    const ids = checkTokenIds.slice(start, start + 200);
   206	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   207	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   208	  }
   209	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   210	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   211	  const batches = rush ? c.rushBatches : 1;
   212	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   213	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   214	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   215	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   216	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   217	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   218	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   219	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   220	
   221	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   222	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   223	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   224	  for (const { row, index } of send) {
   225	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   226	    if (!env) {
   227	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   228	      if (fails[row.ipfs] >= 20) {
   229	        deadArr.push(row.ipfs); deadChanged = true;
   230	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   430	// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
   431	let _clients = clients;
   432	export function __setClientsForTests(f) { _clients = f || clients; }
   433	export function __resetWorkerStateForTests(o = {}) {
   434	  lastErrNotify = o.errNotifiedAt ?? 0;
   435	  lastBalanceCheck = o.balanceCheckedAt ?? 0;
   436	  spaceCheckedAt = o.spaceCheckedAt ?? 0;
   437	}
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
   471	        const floor = Math.max(300, c.minRegistrationDelay);
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
   520	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   521	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   522	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   523	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
   524	          await announceNew(c, pc, store, p, block, snapInfo);
   525	        }
   526	        if (linkBad && c.network === "mainnet") continue;
   527	        if (timelineBad && c.network === "mainnet") continue;
   528	        if (!wc) continue;
   529	        if (block < mg.deadline) {
   530	          if (c.snapshotSpace) {
   531	            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
   532	            // これを投函失敗として数えると、猶予中(24h)に届いた正常票が dead-letter 化されるため、
   533	            // 解禁ブロックまで投函自体を行わない(票は Snapshot に残り、解禁後に投函される)。
   534	            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
   535	              const rush = shouldRushSubmit(c, block, mg.deadline);
   536	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
   537	            }
   538	          }
   539	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
   540	        } else if (!c.snapshotSpace || snapInfo) {
   541	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
   542	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
   543	          await maybeExecute(c, pc, wc, store, p, block, mg);
   544	        }
   545	      } catch (e) {
   546	        await notifyError(c, `worker prop ${p.id}`, e);
   547	      }
   548	    }
   549	  } catch (e) {
   550	    await notifyError(c, "worker tick", e);
   551	  }
   552	}
   553	export { notify };

codex
まず猶予修正の境界は `block < eligibleAt` でコントラクトと一致しており、`eligibleAt=0` もゲートしません。次に、二重防御が実際に viem で復号可能か、締切超過を timeline 検査が拾うかを ABI とテスト mock の形まで確認しています。
exec
/bin/bash -lc "rg -n \"METAGOV_ABI|RegistrationTooRecent|eligibleAtBlock|function metagovInfo|revertErrorName|queueNotify|flushPendingNotes\" relayer-cf/src/abi.js relayer-cf/src/chain.js relayer-cf/src/worker.js contracts/PNounsSnapVoter.sol relayer-cf/test/*.mjs && nl -ba relayer-cf/src/abi.js | sed -n '1,180p' && nl -ba relayer-cf/src/chain.js | sed -n '205,280p' && nl -ba relayer-cf/src/worker.js | sed -n '1,75p' && nl -ba relayer-cf/src/worker.js | sed -n '230,330p' && nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '1,380p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
relayer-cf/test/worker-tick.test.mjs:92:    eligibleAtBlock: () => 50n,
relayer-cf/test/worker-tick.test.mjs:219:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
relayer-cf/src/abi.js:2:export const METAGOV_ABI = [
relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
relayer-cf/src/chain.js:5:import { METAGOV_ABI } from "./abi.js";
relayer-cf/src/chain.js:171:export async function metagovInfo(c, pc, proposalId) {
relayer-cf/src/chain.js:175:      { address: c.metagov, abi: METAGOV_ABI, functionName: "tally", args: [pid] },
relayer-cf/src/chain.js:176:      { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
relayer-cf/src/chain.js:178:      { address: c.metagov, abi: METAGOV_ABI, functionName: "currentResult", args: [pid] },
relayer-cf/src/chain.js:180:      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
relayer-cf/src/chain.js:181:      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
relayer-cf/src/chain.js:196:export { verifyTypedData, getAddress, METAGOV_ABI };
relayer-cf/src/worker.js:3:import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
relayer-cf/src/worker.js:22:async function queueNotify(c, store, text, id = null) {
relayer-cf/src/worker.js:31:async function flushPendingNotes(c, store) {
relayer-cf/src/worker.js:50:function revertErrorName(e) {
relayer-cf/src/worker.js:132:    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
relayer-cf/src/worker.js:142:      const sent = await queueNotify(c, store, [
relayer-cf/src/worker.js:177:      const sent = await queueNotify(c, store, [
relayer-cf/src/worker.js:196:  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
relayer-cf/src/worker.js:206:    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
relayer-cf/src/worker.js:249:    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
relayer-cf/src/worker.js:253:      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
relayer-cf/src/worker.js:256:        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
relayer-cf/src/worker.js:259:          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
relayer-cf/src/worker.js:269:      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
relayer-cf/src/worker.js:276:    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
relayer-cf/src/worker.js:277:    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
relayer-cf/src/worker.js:299:    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
relayer-cf/src/worker.js:308:    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
relayer-cf/src/worker.js:313:        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
relayer-cf/src/worker.js:321:    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
relayer-cf/src/worker.js:322:    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
relayer-cf/src/worker.js:374:  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
relayer-cf/src/worker.js:376:  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
relayer-cf/src/worker.js:444:    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
relayer-cf/src/worker.js:457:          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
relayer-cf/src/worker.js:458:          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
relayer-cf/src/worker.js:459:          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
relayer-cf/src/worker.js:460:          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
relayer-cf/src/worker.js:531:            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
     1	// PNounsSnapVoter の必要最小限 ABI
     2	export const METAGOV_ABI = [
     3	 {
     4	  "anonymous": false,
     5	  "inputs": [
     6	   {
     7	    "indexed": true,
     8	    "internalType": "uint256",
     9	    "name": "proposalId",
    10	    "type": "uint256"
    11	   },
    12	   {
    13	    "indexed": false,
    14	    "internalType": "uint8",
    15	    "name": "support",
    16	    "type": "uint8"
    17	   },
    18	   {
    19	    "indexed": false,
    20	    "internalType": "uint256[3]",
    21	    "name": "tokens",
    22	    "type": "uint256[3]"
    23	   },
    24	   {
    25	    "indexed": false,
    26	    "internalType": "uint256[3]",
    27	    "name": "voters",
    28	    "type": "uint256[3]"
    29	   },
    30	   {
    31	    "indexed": false,
    32	    "internalType": "bool",
    33	    "name": "live",
    34	    "type": "bool"
    35	   }
    36	  ],
    37	  "name": "Executed",
    38	  "type": "event"
    39	 },
    40	 {
    41	  "anonymous": false,
    42	  "inputs": [
    43	   {
    44	    "indexed": true,
    45	    "internalType": "uint256",
    46	    "name": "nounsProposalId",
    47	    "type": "uint256"
    48	   },
    49	   {
    50	    "indexed": false,
    51	    "internalType": "string",
    52	    "name": "snapshotProposal",
    53	    "type": "string"
    54	   }
    55	  ],
    56	  "name": "ProposalRegistered",
    57	  "type": "event"
    58	 },
    59	 {
    60	  "anonymous": false,
    61	  "inputs": [
    62	   {
    63	    "indexed": true,
    64	    "internalType": "uint256",
    65	    "name": "nounsProposalId",
    66	    "type": "uint256"
    67	   },
    68	   {
    69	    "indexed": false,
    70	    "internalType": "bytes32",
    71	    "name": "snapHash",
    72	    "type": "bytes32"
    73	   }
    74	  ],
    75	  "name": "ProposalUnregistered",
    76	  "type": "event"
    77	 },
    78	 {
    79	  "anonymous": false,
    80	  "inputs": [
    81	   {
    82	    "indexed": true,
    83	    "internalType": "address",
    84	    "name": "refundee",
    85	    "type": "address"
    86	   },
    87	   {
    88	    "indexed": false,
    89	    "internalType": "uint256",
    90	    "name": "refundAmount",
    91	    "type": "uint256"
    92	   },
    93	   {
    94	    "indexed": false,
    95	    "internalType": "bool",
    96	    "name": "refundSent",
    97	    "type": "bool"
    98	   }
    99	  ],
   100	  "name": "RefundableVote",
   101	  "type": "event"
   102	 },
   103	 {
   104	  "anonymous": false,
   105	  "inputs": [
   106	   {
   107	    "indexed": true,
   108	    "internalType": "uint256",
   109	    "name": "nounsProposalId",
   110	    "type": "uint256"
   111	   },
   112	   {
   113	    "indexed": true,
   114	    "internalType": "address",
   115	    "name": "voter",
   116	    "type": "address"
   117	   },
   118	   {
   119	    "indexed": false,
   120	    "internalType": "uint8",
   121	    "name": "support",
   122	    "type": "uint8"
   123	   },
   124	   {
   125	    "indexed": false,
   126	    "internalType": "uint32",
   127	    "name": "counted",
   128	    "type": "uint32"
   129	   },
   130	   {
   131	    "indexed": false,
   132	    "internalType": "uint64",
   133	    "name": "timestamp",
   134	    "type": "uint64"
   135	   },
   136	   {
   137	    "indexed": false,
   138	    "internalType": "bool",
   139	    "name": "revote",
   140	    "type": "bool"
   141	   }
   142	  ],
   143	  "name": "SnapVoteCounted",
   144	  "type": "event"
   145	 },
   146	 {
   147	  "inputs": [
   148	   {
   149	    "components": [
   150	     {
   151	      "internalType": "string",
   152	      "name": "from",
   153	      "type": "string"
   154	     },
   155	     {
   156	      "internalType": "uint64",
   157	      "name": "timestamp",
   158	      "type": "uint64"
   159	     },
   160	     {
   161	      "internalType": "string",
   162	      "name": "proposal",
   163	      "type": "string"
   164	     },
   165	     {
   166	      "internalType": "uint32",
   167	      "name": "choice",
   168	      "type": "uint32"
   169	     },
   170	     {
   171	      "internalType": "string",
   172	      "name": "reason",
   173	      "type": "string"
   174	     },
   175	     {
   176	      "internalType": "string",
   177	      "name": "app",
   178	      "type": "string"
   179	     },
   180	     {
     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
     5	import { keccak256, stringToBytes } from "viem";
     6	import { makeStore } from "./store.js";
     7	
     8	async function notify(c, text) {
     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
    11	  try {
    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
    14	    return true;
    15	  }
    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
    17	}
    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
    19	
    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
    22	async function queueNotify(c, store, text, id = null) {
    23	  if (await notify(c, text)) return true;
    24	  const k = `${store.prefix}pendingnotes`;
    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
    26	  if (id && arr.some((n) => n.id === id)) return false; // 同一 tx の通知は積み直さない(第13回監査)
    27	  arr.push({ id, text, at: Date.now() });
    28	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
    29	  return false;
    30	}
    31	async function flushPendingNotes(c, store) {
    32	  const k = `${store.prefix}pendingnotes`;
    33	  let arr;
    34	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
    35	  if (!Array.isArray(arr) || !arr.length) return;
    36	  const rest = []; const seen = new Set();
    37	  for (const n of arr) {
    38	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
    39	    if (n.id) { if (seen.has(n.id)) continue; seen.add(n.id); }
    40	    if (!(await notify(c, n.text))) rest.push(n);
    41	  }
    42	  if (rest.length !== arr.length) {
    43	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
    44	    else await store.kvRaw.delete(k);
    45	  }
    46	}
    47	const WORDS = ["反対", "賛成", "棄権"];
    48	
    49	// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
    50	function revertErrorName(e) {
    51	  let x = e;
    52	  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
    53	  return null;
    54	}
    55	function isContractRevert(e) {
    56	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
    57	  let x = e;
    58	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
    59	  return false;
    60	}
    61	
    62	async function announceNew(c, pc, store, p, block, snapInfo) {
    63	  const prev = await store.getAnnounced(p.id);
    64	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
    65	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
    66	  const mg = await metagovInfo(c, pc, p.id);
    67	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
    68	  if (c.snapshotSpace) {
    69	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
    70	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
    71	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    72	    const lines = [
    73	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
    74	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
    75	      `締切: ${jst} ごろ (block ${mg.deadline})`,
   230	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   231	      }
   232	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   233	    }
   234	    const m = env.data.message;
   235	    const tokenIds = [];
   236	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   237	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   238	    args.push(arg); cidOf.set(arg, row.ipfs);
   239	  }
   240	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   241	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   242	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   243	  if (!args.length) return;
   244	
   245	  const txs = []; let count = 0;
   246	  for (let b = 0; b < batches; b++) {
   247	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   248	    if (!chunk.length) break;
   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   250	    catch (e) {
   251	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   252	      // 第13回監査 High の二重防御: 猶予境界の競合など、票の欠陥ではない revert は数えずに次 tick へ
   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
   254	      const good = [];
   255	      for (const a2 of chunk.slice(0, 10)) {
   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   257	        catch (e2) {
   258	          const cid = cidOf.get(a2);
   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   260	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   261	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   262	          }
   263	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   264	        }
   265	      }
   266	      if (!good.length) continue;
   267	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   268	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   270	      catch (e3) {
   271	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   272	        good.length = 1;
   273	      }
   274	      chunk.length = 0; chunk.push(...good);
   275	    }
   276	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   277	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   278	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   279	    txs.push(hash); count += chunk.length;
   280	  }
   281	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   282	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   283	}
   284	
   285	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   286	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   287	  const { summaries } = await loadVotes(store, proposalId, rush);
   288	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   289	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   290	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   291	  let touched = false;
   292	  for (let b = 0; b < batches; b++) {
   293	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
   294	    if (!pendingSummaries.length) break;
   295	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
   296	    const pending = [];
   297	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
   298	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
   299	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   300	    const cands = [];
   301	    for (let i = 0; i < pending.length; i++) {
   302	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
   303	      cands.push(pending[i]);
   304	    }
   305	    if (!cands.length) continue;
   306	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   307	    let good = cands;
   308	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   309	    catch (e) {
   310	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   311	      good = [];
   312	      for (const v of cands.slice(0, 10)) {
   313	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   314	        catch (e2) {
   315	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   316	        }
   317	      }
   318	      if (!good.length) continue;
   319	    }
   320	    const args = good.map(toArg);
   321	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   322	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   323	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   324	    const sentAt = new Date().toISOString();
   325	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   326	    touched = true;
   327	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   328	      await new Promise((r) => setTimeout(r, 1500));
   329	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   330	    }
     1	// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
     2	// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
     3	import { test, beforeEach } from "node:test";
     4	import assert from "node:assert/strict";
     5	import { keccak256, stringToBytes, parseEther } from "viem";
     6	import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";
     7	
     8	const VOTER = "0x1000000000000000000000000000000000000001";
     9	const PNOUNS = "0x1000000000000000000000000000000000000002";
    10	const DAO = "0x1000000000000000000000000000000000000003";
    11	const TOKEN = "0x1000000000000000000000000000000000000004";
    12	const OWNER = "0x2000000000000000000000000000000000000001";
    13	const REGISTRAR = "0x2000000000000000000000000000000000000002";
    14	const RELAYER = "0x2000000000000000000000000000000000000003";
    15	const SPACE = "earl-grey.eth";
    16	const SNAP_ID = "0x" + "ab".repeat(32);
    17	const SNAP_HASH = keccak256(stringToBytes(SNAP_ID));
    18	const WEBHOOK = "https://discord.test/webhook";
    19	const HUB = "https://hub.test";
    20	
    21	// ---- 偽 KV ----
    22	function fakeKV() {
    23	  const data = new Map(); const ops = [];
    24	  return {
    25	    data, ops,
    26	    async get(k, type) { ops.push(["get", k]); const v = data.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
    27	    async put(k, v) { ops.push(["put", k]); data.set(k, String(v)); },
    28	    async delete(k) { ops.push(["delete", k]); data.delete(k); },
    29	    async list({ prefix }) { ops.push(["list", prefix]); return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: null })), list_complete: true }; },
    30	  };
    31	}
    32	
    33	// ---- 偽 publicClient: functionName で応答を引く ----
    34	function fakePC(h) {
    35	  const calls = [];
    36	  const one = (x) => { calls.push(x.functionName); const f = h[x.functionName]; if (!f) throw new Error(`fakePC: no handler for ${x.functionName}`); return f(x.args || []); };
    37	  return {
    38	    calls,
    39	    async readContract(x) { return one(x); },
    40	    async multicall({ contracts, allowFailure }) {
    41	      return contracts.map((x) => {
    42	        try { const r = one(x); return allowFailure ? { status: "success", result: r } : r; }
    43	        catch (e) { if (allowFailure) return { status: "failure", error: e }; throw e; }
    44	      });
    45	    },
    46	    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
    47	    async getBalance() { calls.push("getBalance"); return parseEther("1"); },
    48	    async getTransactionReceipt() { throw new Error("not found"); },
    49	    async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
    50	  };
    51	}
    52	
    53	// ---- fetch mock: ハブと Discord を演じる ----
    54	const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
    55	globalThis.fetch = async (url, init) => {
    56	  const u = String(url);
    57	  if (u.startsWith(HUB)) {
    58	    F.hubCalls++;
    59	    const r = F.hub.shift();
    60	    if (r instanceof Error) throw r;
    61	    if (typeof r === "number") return new Response("error", { status: r });
    62	    return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
    63	  }
    64	  if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
    65	  throw new Error("unexpected fetch: " + u);
    66	};
    67	
    68	function baseEnv(kv, over = {}) {
    69	  return { NETWORK: "sepolia", RPC_URL: "http://rpc.test", VOTER, PNOUNS: PNOUNS, NOUNS_DAO: DAO, NOUNS_TOKEN: TOKEN,
    70	    EXPLORER: "https://sepolia.etherscan.io", SNAPSHOT_SPACE: SPACE, SNAPSHOT_HUB: HUB,
    71	    DISCORD_WEBHOOK_URL: WEBHOOK, STATE: kv, SCAN_PROPOSALS: "3", ...over };
    72	}
    73	// 提案 1 件(state Active、mg.deadline=195)を返す標準ハンドラ
    74	function handlers(over = {}) {
    75	  return {
    76	    __block: 100,
    77	    proposalCount: () => 1n,
    78	    proposals: () => [1n, OWNER, 0n, 0n, 0n, 90n, 200n, 0n, 0n, 0n, false, false, false, 0n, 50n],
    79	    state: () => 1,
    80	    spaceHash: () => keccak256(stringToBytes(SPACE)),
    81	    registrationDelayBlocks: () => 400n,
    82	    owner: () => OWNER,
    83	    registrar: () => REGISTRAR,
    84	    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
    85	    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
    86	    tally: () => [[0n, 0n, 0n], [0n, 0n, 0n], false, 0],
    87	    voteDeadline: () => 195n,
    88	    getCurrentVotes: () => 2n,
    89	    currentResult: () => 2,
    90	    getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
    91	    liveMode: () => true,
    92	    eligibleAtBlock: () => 50n,
    93	    ...over,
    94	  };
    95	}
    96	const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
    97	const setup = (h, envOver = {}, wallet = null) => {
    98	  const kv = fakeKV(); const pc = fakePC(h);
    99	  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
   100	  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() }); // 残高チェックは対象外の tick が既定
   101	  return { kv, pc, env: baseEnv(kv, envOver) };
   102	};
   103	const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));
   104	
   105	beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });
   106	
   107	test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
   108	  const { kv, env } = setup(handlers());
   109	  F.hub = [new Error("network down")];
   110	  await tick(env);
   111	  assert.equal(F.discordBodies.filter((b) => b.includes("投票受付を開始")).length, 0, "告知しない");
   112	  assert.equal(putsOf(kv, "announced").length, 0);
   113	  assert.equal(putsOf(kv, "executed").length, 0);
   114	  assert.ok(F.discordBodies.some((b) => b.includes("エラー")), "エラー通知は出る");
   115	});
   116	
   117	test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
   118	  const { kv, env } = setup(handlers());
   119	  F.hub = [{ proposals: [] }, { proposals: [] }]; // 1 回目 20 件クエリ・2 回目 逆引き 200 件クエリ
   120	  await tick(env);
   121	  assert.ok(F.discordBodies.some((b) => b.includes("取得できません")), "unresolved 警告");
   122	  assert.equal(putsOf(kv, "flag:unresolved:1").length, 1);
   123	  assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
   124	  // 2 tick 目: フラグ済みなので再警告なし・追加書き込みなし
   125	  F.hub = [{ proposals: [] }, { proposals: [] }];
   126	  const n = F.discordBodies.length; const w = kv.ops.filter(([op]) => op === "put").length;
   127	  await tick(env);
   128	  assert.equal(F.discordBodies.length, n, "再警告しない");
   129	  assert.equal(kv.ops.filter(([op]) => op === "put").length, w, "KV write が増えない");
   130	});
   131	
   132	test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
   133	  const { kv, env } = setup(handlers());
   134	  F.hub = [hubProposal("https://nouns.wtf/vote/999")]; // 別議案を指す
   135	  await tick(env);
   136	  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
   137	  assert.equal(putsOf(kv, "announced").length, 0, "誤った URL を告知しない");
   138	});
   139	
   140	test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
   141	  const { kv, env } = setup(handlers());
   142	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   143	  F.discordStatus = 500;
   144	  await tick(env);
   145	  assert.equal(putsOf(kv, "announced").length, 0, "送信失敗なら告知済みにしない");
   146	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   147	  F.discordStatus = 200;
   148	  await tick(env);
   149	  assert.ok(F.discordBodies.some((b) => b.includes("投票受付を開始")));
   150	  assert.equal(putsOf(kv, "announced").length, 1, "成功した tick で告知済みになる");
   151	  assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
   152	});
   153	
   154	test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
   155	  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
   156	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   157	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
   158	    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
   159	  });
   160	  await tick(env);
   161	  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
   162	  assert.equal(F.hubCalls, 0, "ハブに到達しない");
   163	});
   164	
   165	test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
   166	  const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
   167	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   168	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
   169	  }, { account: { address: OWNER } });
   170	  await tick(env);
   171	  assert.ok(F.discordBodies.some((b) => b.includes("同一アドレス")), "分離違反の通知");
   172	  assert.equal(F.hubCalls, 0);
   173	});
   174	
   175	test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
   176	  const { env } = setup(handlers(), {
   177	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   178	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
   179	    MIN_REGISTRATION_DELAY: "abc",
   180	  });
   181	  await assert.rejects(() => tick(env), /MIN_REGISTRATION_DELAY/);
   182	});
   183	
   184	test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
   185	  const { pc, env } = setup(handlers());
   186	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   187	  await tick(env);
   188	  const first = pc.calls.filter((f) => f === "spaceHash").length;
   189	  assert.equal(first, 1);
   190	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   191	  await tick(env); // __reset していないので spaceCheckedAt は保持される
   192	  assert.equal(pc.calls.filter((f) => f === "spaceHash").length, 1, "2 tick 目は確認しない");
   193	});
   194	
   195	test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
   196	  const wallet = { account: { address: RELAYER } };
   197	  // ケース A: 登録済み + 解決済み → maybeExecute が "no votes" を記録
   198	  {
   199	    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
   200	    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   201	    await tick(env);
   202	    const put = putsOf(kv, "executed:1");
   203	    assert.equal(put.length, 1, "no votes が確定される");
   204	    assert.ok(kv.data.get(put[0][1]).includes("no votes"));
   205	  }
   206	  // ケース B: 未登録(対応表なし) → execute もスキップ(登録遅れの提案を票ゼロで切り捨てない)
   207	  {
   208	    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
   209	    F.hub = [{ proposals: [] }]; // 登録なしなので逆引きは発生しない
   210	    await tick(env);
   211	    assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
   212	  }
   213	});
   214	
   215	test("第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない", async () => {
   216	  const wallet = { account: { address: RELAYER } };
   217	  // ケース A: 猶予中(eligibleAt=300 > block=100) → 対応付け解決後、票の取得にすら行かない
   218	  {
   219	    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
   220	    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   221	    await tick(env);
   222	    assert.equal(F.hubCalls, 1, "ハブ呼び出しは対応付けの 1 回だけ(votes クエリなし)");
   223	    assert.equal(putsOf(kv, "snapdrop").length, 0, "drop を数えない");
   224	    assert.equal(kv.ops.filter(([op, k]) => k.includes("snapsent")).length, 0, "投函処理に入らない");
   225	    assert.equal(putsOf(kv, "announced").length, 1, "告知自体は行われる(Snapshot では投票できる)");
   226	  }
   227	  // ケース B: 解禁済み(eligibleAt=50 <= block=100) → 投函処理に入る(votes クエリが飛ぶ)
   228	  {
   229	    const { env } = setup(handlers(), {}, wallet);
   230	    F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
   231	    await tick(env);
   232	    assert.ok(F.hubCalls >= 2, `votes クエリに到達する (hubCalls=${F.hubCalls})`);
   233	  }
   234	});
   235	
   236	test("ハブが GraphQL errors を返した場合も fail-closed", async () => {
   237	  const { kv, env } = setup(handlers());
   238	  F.hub = [{ __errors: true }];
   239	  // fetch mock は data を包むので、errors 応答は直接 Response を作る
   240	  const orig = globalThis.fetch;
   241	  globalThis.fetch = async (url, init) => {
   242	    if (String(url).startsWith(HUB)) { F.hubCalls++; return new Response(JSON.stringify({ errors: [{ message: "boom" }] }), { status: 200 }); }
   243	    return orig(url, init);
   244	  };
   245	  try {
   246	    await tick(env);
   247	    assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
   248	    assert.equal(putsOf(kv, "executed").length, 0, "確定もしない");
   249	  } finally { globalThis.fetch = orig; }
   250	});
   251	
   252	test("確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される", async () => {
   253	  const wallet = { account: { address: RELAYER } };
   254	  const { kv, env } = setup(handlers(), {}, wallet);
   255	  // 送信中レコードを仕込み、受信確認済み(receipt 成功)にして通知経路へ入れる
   256	  const ns = `11155111:${VOTER.toLowerCase()}:`;
   257	  kv.data.set(`${ns}snapsent:1`, JSON.stringify({ txs: ["0x" + "cd".repeat(32)], count: 1, at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }));
   258	  const pc = fakePC(handlers());
   259	  pc.getTransactionReceipt = async () => ({ status: "success", gasUsed: 100000n });
   260	  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
   261	  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
   262	  F.discordStatus = 500;
   263	  await tick(env);
   264	  assert.equal(putsOf(kv, "pendingnotes").length, 1, "失敗した通知がキューに積まれる");
   265	  // 次 tick: Discord 復旧 → flush で再送され、キューが消える
   266	  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
   267	  F.discordStatus = 200;
   268	  await tick(env);
   269	  assert.ok(F.discordBodies.some((b) => b.includes("反映しました")), "持ち越した通知が再送される");
   270	  assert.equal(kv.data.has(`${ns}pendingnotes`), false, "キューが空になり削除される");
   271	});

exec
/bin/bash -lc "rg -n '\"type\": \"error\"|\"name\": \"RegistrationTooRecent\"' relayer-cf/src/abi.js artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json 2>/dev/null || true
nl -ba relayer-cf/src/chain.js | sed -n '165,205p'
git diff 1be9d16"'^ 1be9d16 -- scripts/create-and-register.mjs scripts/check-deploy.mjs docs/RUNBOOK-MAINNET.md hardhat.config.js scripts/mainnet/deploy-snapvoter.js relayer-cf/test/worker-tick.test.mjs
nl -ba scripts/create-and-register.mjs | sed -n '"'1,300p'
nl -ba scripts/check-deploy.mjs | sed -n '1,360p'
nl -ba docs/RUNBOOK-MAINNET.md | sed -n '1,260p'
nl -ba hardhat.config.js | sed -n '1,160p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:55:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:60:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:65:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:76:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:87:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:98:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:103:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:108:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:113:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:118:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:123:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:128:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:133:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:138:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:143:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:148:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:164:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:169:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:180:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:191:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:202:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:207:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:211:      "name": "RegistrationTooRecent",
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:212:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:217:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:222:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:227:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:232:      "type": "error"
artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json:237:      "type": "error"
   165	  } catch (e) { /* タイトルは必須でない */ }
   166	  if (frozen && kv) await kv.put(`title:${id}:final`, title, { expirationTtl: 86400 * 30 });
   167	  else titleMem.set(id, { at: Date.now(), title });
   168	  return title;
   169	}
   170	// pNouns 所有者キャッシュはメモリ(isolate 内)+ 60 秒。KV には書かない
   171	export async function metagovInfo(c, pc, proposalId) {
   172	  const pid = BigInt(proposalId);
   173	  const t0 = await pc.multicall({
   174	    contracts: [
   175	      { address: c.metagov, abi: METAGOV_ABI, functionName: "tally", args: [pid] },
   176	      { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
   177	      { address: c.nounsToken, abi: NOUNS_ABI, functionName: "getCurrentVotes", args: [c.metagov] },
   178	      { address: c.metagov, abi: METAGOV_ABI, functionName: "currentResult", args: [pid] },
   179	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "getReceipt", args: [pid, c.metagov] },
   180	      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
   181	      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
   182	    ],
   183	    allowFailure: true,
   184	  }).then((r) => r.map((x) => (x.status === "success" ? x.result : null)));
   185	  const [t, deadline, votes, cur, rcpt, live, elig] = [t0[0], t0[1], t0[2], t0[3], t0[4], t0[5], t0[6]];
   186	  const tally = t || [[0n, 0n, 0n], [0n, 0n, 0n], false, 0];
   187	  const [tokens, voters, executed, result] = tally;
   188	  return {
   189	    tokens: tokens.map(Number), voters: voters.map(Number), executed, result: Number(executed ? result : cur ?? 2),
   190	    deadline: Number(deadline || 0n), metagovVotes: Number(votes || 0n),
   191	    eligibleAt: Number(elig || 0n), // 登録猶予の解禁ブロック(第13回監査 High: 猶予中は投函しない)
   192	    nounsReceipt: rcpt ? { hasVoted: rcpt.hasVoted, support: Number(rcpt.support), votes: Number(rcpt.votes) } : null,
   193	    liveMode: !!live,
   194	  };
   195	}
   196	export { verifyTypedData, getAddress, METAGOV_ABI };
diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
index b91cb22..663daeb 100644
--- a/docs/RUNBOOK-MAINNET.md
+++ b/docs/RUNBOOK-MAINNET.md
@@ -23,23 +23,37 @@ Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・tran
 ## 2. デプロイ (liveMode=false で開始)
 
 ```bash
-NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
+OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
+REG_DELAY=7200 MARGIN=300 \
   npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
 ```
 
+(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
+
 - `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
-- `owner_` は**最初からマルチシグを指定**(EOA を経由しない)。registrar_ は上記の registrar アドレス
-- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
+- `OWNER` は**最初からマルチシグを指定**(EOA を経由しない)
+- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
+- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
 - Sourcify でソース検証 → exact_match を確認
 
-## 3. 機械照合
+## 3. 機械照合(段階ごとに実行する)
+
+`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
+**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**
 
 ```bash
-NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
+ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
+     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> EXPECT_BOT=0x<Snapshot bot>"
+# 手順 2 の後:            $ENV node scripts/check-deploy.mjs --stage deployed
+# 手順 4 の後:            $ENV node scripts/check-deploy.mjs --stage worker
+# プール入金の後:         $ENV node scripts/check-deploy.mjs --stage funded
+# 手順 6-1(委任)の後:     $ENV node scripts/check-deploy.mjs --stage delegated
+# 手順 6-3(live 化)の後:  $ENV node scripts/check-deploy.mjs --stage live
 ```
 
-全項目 ✅ になるまで進まない。確認内容: spaceHash 一致 / delay >= 300 /
-3 者分離 / Worker 設定一致 / 残高。
+mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
+あることも確認される(先走りの live 化を検出)。Worker のデプロイ直後は伝搬遅延で
+旧版の応答が返ることがある — その場合は 1 分待って再実行する。
 
 ## 4. Worker (Cloudflare) 設定
 
@@ -70,12 +84,16 @@ npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Disc
 3. マルチシグから `setLiveMode(true)`
 4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
 
-## 7. ロールバック
+## 7. ロールバック(この順で)
 
-いつでも可能・即時:
-- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
-- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
-- `sweep(トレジャリー)` → プール残額を回収
+1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
+2. マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
+3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
+4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
+5. 未処理の状態を確認: 投函待ちの票・pending の execute が残っていないか(`/api/proposals`、KV)
+6. 誤登録が原因なら、票が入る前に `unregisterProposal`
+7. `sweep(トレジャリー)` → プール残額を回収
+8. 鍵の漏洩が疑われる場合: relayer secret・Discord webhook をローテーション、`setRegistrar` で差し替え
 
 ## 8. 障害時
 
diff --git a/hardhat.config.js b/hardhat.config.js
index 8ac4fdc..228c99e 100644
--- a/hardhat.config.js
+++ b/hardhat.config.js
@@ -14,6 +14,11 @@ module.exports = {
     overrides: {},
   },
   networks: {
+    mainnet: {
+      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
+      chainId: 1,
+      accounts: process.env.MAINNET_DEPLOYER_KEY ? [process.env.MAINNET_DEPLOYER_KEY] : [],
+    },
     sepolia: {
       url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
       chainId: 11155111,
diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
index a69aa05..6656cc3 100644
--- a/relayer-cf/test/worker-tick.test.mjs
+++ b/relayer-cf/test/worker-tick.test.mjs
@@ -89,6 +89,7 @@ function handlers(over = {}) {
     currentResult: () => 2,
     getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
     liveMode: () => true,
+    eligibleAtBlock: () => 50n,
     ...over,
   };
 }
@@ -210,3 +211,61 @@ test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、
     assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
   }
 });
+
+test("第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない", async () => {
+  const wallet = { account: { address: RELAYER } };
+  // ケース A: 猶予中(eligibleAt=300 > block=100) → 対応付け解決後、票の取得にすら行かない
+  {
+    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
+    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+    await tick(env);
+    assert.equal(F.hubCalls, 1, "ハブ呼び出しは対応付けの 1 回だけ(votes クエリなし)");
+    assert.equal(putsOf(kv, "snapdrop").length, 0, "drop を数えない");
+    assert.equal(kv.ops.filter(([op, k]) => k.includes("snapsent")).length, 0, "投函処理に入らない");
+    assert.equal(putsOf(kv, "announced").length, 1, "告知自体は行われる(Snapshot では投票できる)");
+  }
+  // ケース B: 解禁済み(eligibleAt=50 <= block=100) → 投函処理に入る(votes クエリが飛ぶ)
+  {
+    const { env } = setup(handlers(), {}, wallet);
+    F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
+    await tick(env);
+    assert.ok(F.hubCalls >= 2, `votes クエリに到達する (hubCalls=${F.hubCalls})`);
+  }
+});
+
+test("ハブが GraphQL errors を返した場合も fail-closed", async () => {
+  const { kv, env } = setup(handlers());
+  F.hub = [{ __errors: true }];
+  // fetch mock は data を包むので、errors 応答は直接 Response を作る
+  const orig = globalThis.fetch;
+  globalThis.fetch = async (url, init) => {
+    if (String(url).startsWith(HUB)) { F.hubCalls++; return new Response(JSON.stringify({ errors: [{ message: "boom" }] }), { status: 200 }); }
+    return orig(url, init);
+  };
+  try {
+    await tick(env);
+    assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
+    assert.equal(putsOf(kv, "executed").length, 0, "確定もしない");
+  } finally { globalThis.fetch = orig; }
+});
+
+test("確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される", async () => {
+  const wallet = { account: { address: RELAYER } };
+  const { kv, env } = setup(handlers(), {}, wallet);
+  // 送信中レコードを仕込み、受信確認済み(receipt 成功)にして通知経路へ入れる
+  const ns = `11155111:${VOTER.toLowerCase()}:`;
+  kv.data.set(`${ns}snapsent:1`, JSON.stringify({ txs: ["0x" + "cd".repeat(32)], count: 1, at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }));
+  const pc = fakePC(handlers());
+  pc.getTransactionReceipt = async () => ({ status: "success", gasUsed: 100000n });
+  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
+  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
+  F.discordStatus = 500;
+  await tick(env);
+  assert.equal(putsOf(kv, "pendingnotes").length, 1, "失敗した通知がキューに積まれる");
+  // 次 tick: Discord 復旧 → flush で再送され、キューが消える
+  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
+  F.discordStatus = 200;
+  await tick(env);
+  assert.ok(F.discordBodies.some((b) => b.includes("反映しました")), "持ち越した通知が再送される");
+  assert.equal(kv.data.has(`${ns}pendingnotes`), false, "キューが空になり削除される");
+});
diff --git a/scripts/check-deploy.mjs b/scripts/check-deploy.mjs
index bb886c5..e5b1f8c 100644
--- a/scripts/check-deploy.mjs
+++ b/scripts/check-deploy.mjs
@@ -1,10 +1,17 @@
-// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
-// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
-// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
+// デプロイ後の機械照合(RUNBOOK-MAINNET 用)。段階(--stage)ごとに期待状態を fail-closed で照合する。
+//
+//   --stage deployed  … コントラクトの実値のみ(Worker・入金・委任はまだ)
+//   --stage worker    … + Worker /api/config の一致・relayer の分離
+//   --stage funded    … + プール・relayer の残高
+//   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
+//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
+//
+// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED が必須。
+// worker 段階以降は EXPECT_RELAYER、delegated 以降は EXPECT_DELEGATOR も必須。
+// EXPECT_DELAY(既定 7200)・EXPECT_BOT(任意: 4 者分離の検査)も参照する。
 //
-// 使い方:
 //   NETWORK=sepolia node scripts/check-deploy.mjs
-//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
+//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_EXCLUDED=0x… node scripts/check-deploy.mjs --stage deployed
 import { ethers } from "ethers";
 import fs from "node:fs";
 import path from "node:path";
@@ -13,9 +20,14 @@ const ROOT = path.resolve(import.meta.dirname, "..");
 for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
   const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
 }
+const argStage = (() => { const i = process.argv.indexOf("--stage"); return i >= 0 ? process.argv[i + 1] : "live"; })();
+const STAGES = ["deployed", "worker", "funded", "delegated", "live"];
+const stageN = STAGES.indexOf(argStage);
+if (stageN < 0) { console.error(`--stage は ${STAGES.join("|")}`); process.exit(2); }
 const NETWORK = process.env.NETWORK || "sepolia";
-const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
-const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
+const MAIN = NETWORK === "mainnet";
+const RPC = MAIN ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+const WORKER_URL = process.env.WORKER_URL || (MAIN
   ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
   : "https://pnouns-voter.x402-adsb-worker.workers.dev");
 const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
@@ -27,69 +39,97 @@ const VOTER_ABI = [
   "function excluded(address) view returns (bool)",
 ];
 const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
+const E = (k) => process.env[k] || null;
+const low = (a) => (a ? a.toLowerCase() : a);
 
 let failed = 0;
 const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
 const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
+const requireEnv = (k, why) => { if (MAIN && !E(k)) { check(`${k} の指定(${why})`, false, "mainnet では必須"); return false; } return true; };
 
 async function main() {
   if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
   const p = new ethers.JsonRpcProvider(RPC);
   const voterAddr = dep.snapVoter || dep.voter;
   const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
-  console.log(`network=${NETWORK} voter=${voterAddr}\n`);
+  console.log(`network=${NETWORK} stage=${argStage} voter=${voterAddr}\n`);
 
-  // 1. コントラクトの実値
+  // ---- stage: deployed(常に) ----
   const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
     v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
   ]);
   check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
-  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
+  const expSpace = MAIN ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
   check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
-  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
-  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
-  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
+  const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 7200 : 1));
+  check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
+  if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
   check("refundEnabled", refund === true);
+  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
+  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
+  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
+  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);
+
+  if (requireEnv("EXPECT_OWNER", "マルチシグ")) if (E("EXPECT_OWNER")) check("owner が想定どおり", low(owner) === low(E("EXPECT_OWNER")), owner);
+  if (requireEnv("EXPECT_REGISTRAR", "登録係")) if (E("EXPECT_REGISTRAR")) check("registrar が想定どおり", low(registrar) === low(E("EXPECT_REGISTRAR")), registrar);
+  if (requireEnv("EXPECT_EXCLUDED", "トレジャリー除外")) {
+    for (const a of (E("EXPECT_EXCLUDED") || "").split(",").filter(Boolean)) {
+      check(`excluded(${a.slice(0, 10)}…)`, await v.excluded(a), "");
+    }
+  }
+  if (!MAIN && !E("EXPECT_EXCLUDED")) {
+    // テストネット既定: Sepolia の pNouns トレジャリー
+    const t = "0x8ae80e0b44205904be18869240c2ec62d2342785";
+    check("excluded(トレジャリー)", await v.excluded(t), t);
+  }
 
-  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
-  let workerCfg = null;
-  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
-  const relayer = workerCfg?.relayer || null;
-  const roles = { owner, registrar, relayer };
-  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
-  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
-  const distinct = new Set(addrs).size === addrs.length;
-  if (NETWORK === "mainnet") {
-    check("owner / registrar / relayer がすべて別アドレス", distinct);
-    check("relayer が Worker から取得できた", !!relayer);
-    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
-    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
-  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
-  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);
+  // ---- stage: worker ----
+  let relayer = null;
+  if (stageN >= STAGES.indexOf("worker")) {
+    let workerCfg = null;
+    try {
+      const r = await fetch(`${WORKER_URL}/api/config?cb=${Date.now()}`);
+      check("Worker /api/config が HTTP 200", r.ok, String(r.status));
+      workerCfg = await r.json();
+    } catch (e) { check("Worker /api/config の取得", false, e.message); }
+    if (workerCfg) {
+      check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
+      check("Worker の metagov 一致", low(workerCfg.metagov) === low(voterAddr), workerCfg.metagov);
+      check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
+      relayer = workerCfg.relayer || null;
+      check("relayer が Worker から取得できた", !!relayer, relayer || "(デプロイ伝搬直後は旧版が返ることがある → 再実行)");
+      if (requireEnv("EXPECT_RELAYER", "リレイヤー")) if (E("EXPECT_RELAYER") && relayer) check("relayer が想定どおり", low(relayer) === low(E("EXPECT_RELAYER")), relayer);
+    }
+    const roles = { owner, registrar, relayer, bot: E("EXPECT_BOT") };
+    const addrs = Object.values(roles).filter(Boolean).map(low);
+    const distinct = new Set(addrs).size === addrs.length;
+    if (MAIN) check(`役割の分離(${addrs.length} 者すべて別アドレス)`, distinct);
+    else check(`役割の分離(${addrs.length} 者・リハーサル)`, distinct);
+  }
 
-  // 3. Worker と deployments の一致
-  if (workerCfg) {
-    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
-    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
-    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
+  // ---- stage: funded ----
+  if (stageN >= STAGES.indexOf("funded")) {
+    const pool = await p.getBalance(voterAddr);
+    check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
+    if (relayer) { const rb = await p.getBalance(relayer); check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`); }
+    else if (MAIN) check("relayer 残高(アドレス不明のため確認不能)", false);
   }
 
-  // 4. 委任と残高
-  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
-  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
-  try {
-    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
-    const votes = await t.getCurrentVotes(voterAddr);
-    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
-  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
-  const pool = await p.getBalance(voterAddr);
-  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
-  if (relayer) {
-    const rb = await p.getBalance(relayer);
-    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
+  // ---- stage: delegated ----
+  if (stageN >= STAGES.indexOf("delegated")) {
+    const tokenAddr = MAIN ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || "0x4C4674bb72a096855496a7204962297bd7e12b85");
+    try {
+      const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
+      const votes = await t.getCurrentVotes(voterAddr);
+      check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
+      if (requireEnv("EXPECT_DELEGATOR", "Nouns 保有マルチシグ")) if (E("EXPECT_DELEGATOR")) {
+        const d = await t.delegates(E("EXPECT_DELEGATOR"));
+        check("delegates(保有マルチシグ) = voter", low(d) === low(voterAddr), d);
+      }
+    } catch (e) { check("委任の確認", false, `token ${tokenAddr}: ${e.shortMessage || e.message}`); } // 照会失敗も fail(第13回監査)
   }
 
-  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
+  console.log(failed ? `\n❌ ${failed} 件の不一致` : `\n✅ stage=${argStage} まですべて一致`);
   process.exit(failed ? 1 : 0);
 }
 main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
index 95139a0..7bdd047 100644
--- a/scripts/create-and-register.mjs
+++ b/scripts/create-and-register.mjs
@@ -68,6 +68,17 @@ async function main() {
   // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
   if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
 
+  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
+  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
+  const provider = new ethers.JsonRpcProvider(rpc);
+  const code = await provider.getCode(voter);
+  if (code === "0x") throw new Error(`${voter} にコントラクトがありません(deployments/${NETWORK}.json が古い可能性)`);
+  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)"], provider);
+  const [reg, own, existing] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId)]);
+  const rAddr = registrarWallet.address.toLowerCase();
+  if (rAddr !== reg.toLowerCase() && rAddr !== own.toLowerCase()) throw new Error(`registrar 鍵 ${registrarWallet.address} は registrar(${reg}) でも owner(${own}) でもなく、登録できません`);
+  if (existing !== ethers.ZeroHash) throw new Error(`Nouns #${nounsId} には既に対応表が登録されています(${existing.slice(0, 18)}…)`);
+
   const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
   const now = Math.floor(Date.now() / 1000);
   const client = new snapshot.Client712(SEQ);
@@ -78,8 +89,8 @@ async function main() {
   });
   console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
 
-  // オンチェーンの対応付け(registrar) — 鍵と設定は送信前に検証済み
-  const w = registrarWallet.connect(new ethers.JsonRpcProvider(rpc));
+  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
+  const w = registrarWallet.connect(provider);
   const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
   const c = new ethers.Contract(voter, abi, w);
   const tx = await c.registerProposal(receipt.id, nounsId);
diff --git a/scripts/mainnet/deploy-snapvoter.js b/scripts/mainnet/deploy-snapvoter.js
new file mode 100644
index 0000000..c7f903b
--- /dev/null
+++ b/scripts/mainnet/deploy-snapvoter.js
@@ -0,0 +1,53 @@
+// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
+// 使い方(必須値はすべて明示。fallback なし):
+//   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
+//     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
+//   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
+const { ethers, network } = require("hardhat");
+const fs = require("fs");
+const path = require("path");
+const MAINNET = {
+  NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
+  PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+};
+async function main() {
+  const owner = process.env.OWNER, registrar = process.env.REGISTRAR;
+  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
+  const delay = Number(process.env.REG_DELAY || 7200);
+  const margin = Number(process.env.MARGIN || 300);
+  if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
+  if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
+  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
+  if (!Number.isInteger(delay) || delay < 300) throw new Error("REG_DELAY は 300 以上(運用値 7200 = 約 24 時間)");
+  const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
+  if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
+  const [deployer] = await ethers.getSigners();
+  if (!deployer) throw new Error("デプロイ用アカウントがありません(MAINNET_DEPLOYER_KEY を設定)");
+  console.log(`network=${network.name} deployer=${deployer.address}`);
+  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=pnounsdao.eth`);
+  if (process.env.DRY_RUN === "1") { console.log("--- DRY_RUN: デプロイしません ---"); return; }
+  if (network.name === "hardhat") await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x1"]); // フォークでのテスト実行用
+  const F = await ethers.getContractFactory("PNounsSnapVoter");
+  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, "pnounsdao.eth", excluded, margin, delay);
+  await c.waitForDeployment();
+  const addr = await c.getAddress();
+  // 読み戻し検証(設定漏れをその場で検出)
+  const checks = [
+    ["space", await c.space(), "pnounsdao.eth"],
+    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
+    ["marginBlocks", Number(await c.marginBlocks()), margin],
+    ["owner", (await c.owner()).toLowerCase(), owner.toLowerCase()],
+    ["registrar", (await c.registrar()).toLowerCase(), registrar.toLowerCase()],
+    ["liveMode", await c.liveMode(), false],
+  ];
+  for (const [k, got, want] of checks) if (String(got) !== String(want)) throw new Error(`読み戻し不一致 ${k}: ${got} != ${want}`);
+  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
+  const dep = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
+  dep.snapVoter = addr;
+  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
+  fs.mkdirSync(path.dirname(out), { recursive: true });
+  fs.writeFileSync(out, JSON.stringify(dep, null, 2));
+  console.log(`デプロイ完了: ${addr} (block ${dep.snapVoterDeployBlock}) → ${out}`);
+  console.log("次: Sourcify 検証 → NETWORK=mainnet node scripts/check-deploy.mjs --stage deployed");
+}
+main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
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
    92	  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
    93	  const w = registrarWallet.connect(provider);
    94	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
    95	  const c = new ethers.Contract(voter, abi, w);
    96	  const tx = await c.registerProposal(receipt.id, nounsId);
    97	  await tx.wait();
    98	  const delay = Number(await c.registrationDelayBlocks());
    99	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
   100	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
   101	}
   102	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
     1	// デプロイ後の機械照合(RUNBOOK-MAINNET 用)。段階(--stage)ごとに期待状態を fail-closed で照合する。
     2	//
     3	//   --stage deployed  … コントラクトの実値のみ(Worker・入金・委任はまだ)
     4	//   --stage worker    … + Worker /api/config の一致・relayer の分離
     5	//   --stage funded    … + プール・relayer の残高
     6	//   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
     7	//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
     8	//
     9	// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED が必須。
    10	// worker 段階以降は EXPECT_RELAYER、delegated 以降は EXPECT_DELEGATOR も必須。
    11	// EXPECT_DELAY(既定 7200)・EXPECT_BOT(任意: 4 者分離の検査)も参照する。
    12	//
    13	//   NETWORK=sepolia node scripts/check-deploy.mjs
    14	//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_EXCLUDED=0x… node scripts/check-deploy.mjs --stage deployed
    15	import { ethers } from "ethers";
    16	import fs from "node:fs";
    17	import path from "node:path";
    18	
    19	const ROOT = path.resolve(import.meta.dirname, "..");
    20	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    21	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    22	}
    23	const argStage = (() => { const i = process.argv.indexOf("--stage"); return i >= 0 ? process.argv[i + 1] : "live"; })();
    24	const STAGES = ["deployed", "worker", "funded", "delegated", "live"];
    25	const stageN = STAGES.indexOf(argStage);
    26	if (stageN < 0) { console.error(`--stage は ${STAGES.join("|")}`); process.exit(2); }
    27	const NETWORK = process.env.NETWORK || "sepolia";
    28	const MAIN = NETWORK === "mainnet";
    29	const RPC = MAIN ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    30	const WORKER_URL = process.env.WORKER_URL || (MAIN
    31	  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
    32	  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
    33	const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    34	const VOTER_ABI = [
    35	  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
    36	  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
    37	  "function owner() view returns (address)", "function registrar() view returns (address)",
    38	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
    39	  "function excluded(address) view returns (bool)",
    40	];
    41	const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
    42	const E = (k) => process.env[k] || null;
    43	const low = (a) => (a ? a.toLowerCase() : a);
    44	
    45	let failed = 0;
    46	const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
    47	const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
    48	const requireEnv = (k, why) => { if (MAIN && !E(k)) { check(`${k} の指定(${why})`, false, "mainnet では必須"); return false; } return true; };
    49	
    50	async function main() {
    51	  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
    52	  const p = new ethers.JsonRpcProvider(RPC);
    53	  const voterAddr = dep.snapVoter || dep.voter;
    54	  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
    55	  console.log(`network=${NETWORK} stage=${argStage} voter=${voterAddr}\n`);
    56	
    57	  // ---- stage: deployed(常に) ----
    58	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
    59	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
    60	  ]);
    61	  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
    62	  const expSpace = MAIN ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
    63	  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
    64	  const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 7200 : 1));
    65	  check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
    66	  if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
    67	  check("refundEnabled", refund === true);
    68	  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
    69	  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
    70	  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
    71	  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);
    72	
    73	  if (requireEnv("EXPECT_OWNER", "マルチシグ")) if (E("EXPECT_OWNER")) check("owner が想定どおり", low(owner) === low(E("EXPECT_OWNER")), owner);
    74	  if (requireEnv("EXPECT_REGISTRAR", "登録係")) if (E("EXPECT_REGISTRAR")) check("registrar が想定どおり", low(registrar) === low(E("EXPECT_REGISTRAR")), registrar);
    75	  if (requireEnv("EXPECT_EXCLUDED", "トレジャリー除外")) {
    76	    for (const a of (E("EXPECT_EXCLUDED") || "").split(",").filter(Boolean)) {
    77	      check(`excluded(${a.slice(0, 10)}…)`, await v.excluded(a), "");
    78	    }
    79	  }
    80	  if (!MAIN && !E("EXPECT_EXCLUDED")) {
    81	    // テストネット既定: Sepolia の pNouns トレジャリー
    82	    const t = "0x8ae80e0b44205904be18869240c2ec62d2342785";
    83	    check("excluded(トレジャリー)", await v.excluded(t), t);
    84	  }
    85	
    86	  // ---- stage: worker ----
    87	  let relayer = null;
    88	  if (stageN >= STAGES.indexOf("worker")) {
    89	    let workerCfg = null;
    90	    try {
    91	      const r = await fetch(`${WORKER_URL}/api/config?cb=${Date.now()}`);
    92	      check("Worker /api/config が HTTP 200", r.ok, String(r.status));
    93	      workerCfg = await r.json();
    94	    } catch (e) { check("Worker /api/config の取得", false, e.message); }
    95	    if (workerCfg) {
    96	      check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
    97	      check("Worker の metagov 一致", low(workerCfg.metagov) === low(voterAddr), workerCfg.metagov);
    98	      check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
    99	      relayer = workerCfg.relayer || null;
   100	      check("relayer が Worker から取得できた", !!relayer, relayer || "(デプロイ伝搬直後は旧版が返ることがある → 再実行)");
   101	      if (requireEnv("EXPECT_RELAYER", "リレイヤー")) if (E("EXPECT_RELAYER") && relayer) check("relayer が想定どおり", low(relayer) === low(E("EXPECT_RELAYER")), relayer);
   102	    }
   103	    const roles = { owner, registrar, relayer, bot: E("EXPECT_BOT") };
   104	    const addrs = Object.values(roles).filter(Boolean).map(low);
   105	    const distinct = new Set(addrs).size === addrs.length;
   106	    if (MAIN) check(`役割の分離(${addrs.length} 者すべて別アドレス)`, distinct);
   107	    else check(`役割の分離(${addrs.length} 者・リハーサル)`, distinct);
   108	  }
   109	
   110	  // ---- stage: funded ----
   111	  if (stageN >= STAGES.indexOf("funded")) {
   112	    const pool = await p.getBalance(voterAddr);
   113	    check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
   114	    if (relayer) { const rb = await p.getBalance(relayer); check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`); }
   115	    else if (MAIN) check("relayer 残高(アドレス不明のため確認不能)", false);
   116	  }
   117	
   118	  // ---- stage: delegated ----
   119	  if (stageN >= STAGES.indexOf("delegated")) {
   120	    const tokenAddr = MAIN ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || "0x4C4674bb72a096855496a7204962297bd7e12b85");
   121	    try {
   122	      const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
   123	      const votes = await t.getCurrentVotes(voterAddr);
   124	      check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
   125	      if (requireEnv("EXPECT_DELEGATOR", "Nouns 保有マルチシグ")) if (E("EXPECT_DELEGATOR")) {
   126	        const d = await t.delegates(E("EXPECT_DELEGATOR"));
   127	        check("delegates(保有マルチシグ) = voter", low(d) === low(voterAddr), d);
   128	      }
   129	    } catch (e) { check("委任の確認", false, `token ${tokenAddr}: ${e.shortMessage || e.message}`); } // 照会失敗も fail(第13回監査)
   130	  }
   131	
   132	  console.log(failed ? `\n❌ ${failed} 件の不一致` : `\n✅ stage=${argStage} まですべて一致`);
   133	  process.exit(failed ? 1 : 0);
   134	}
   135	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
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
    15	| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
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
    26	OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
    27	REG_DELAY=7200 MARGIN=300 \
    28	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
    29	```
    30	
    31	(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
    32	
    33	- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
    34	- `OWNER` は**最初からマルチシグを指定**(EOA を経由しない)
    35	- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
    36	- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
    37	- Sourcify でソース検証 → exact_match を確認
    38	
    39	## 3. 機械照合(段階ごとに実行する)
    40	
    41	`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
    42	**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**
    43	
    44	```bash
    45	ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
    46	     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> EXPECT_BOT=0x<Snapshot bot>"
    47	# 手順 2 の後:            $ENV node scripts/check-deploy.mjs --stage deployed
    48	# 手順 4 の後:            $ENV node scripts/check-deploy.mjs --stage worker
    49	# プール入金の後:         $ENV node scripts/check-deploy.mjs --stage funded
    50	# 手順 6-1(委任)の後:     $ENV node scripts/check-deploy.mjs --stage delegated
    51	# 手順 6-3(live 化)の後:  $ENV node scripts/check-deploy.mjs --stage live
    52	```
    53	
    54	mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
    55	あることも確認される(先走りの live 化を検出)。Worker のデプロイ直後は伝搬遅延で
    56	旧版の応答が返ることがある — その場合は 1 分待って再実行する。
    57	
    58	## 4. Worker (Cloudflare) 設定
    59	
    60	```bash
    61	cd relayer-cf
    62	# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
    63	npx wrangler kv namespace create STATE --env mainnet
    64	npx wrangler deploy --env mainnet
    65	npx wrangler secret put RPC_URL --env mainnet
    66	npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
    67	npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
    68	```
    69	
    70	- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
    71	- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
    72	
    73	## 5. シャドー運用 (liveMode=false)
    74	
    75	- トレジャリーからプールへ 0.05 ETH 送金
    76	- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
    77	  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
    78	- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
    79	
    80	## 6. 委任切替 → 本番化 (この順のみ)
    81	
    82	1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
    83	2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
    84	3. マルチシグから `setLiveMode(true)`
    85	4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
    86	
    87	## 7. ロールバック(この順で)
    88	
    89	1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
    90	2. マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
    91	3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
    92	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
    93	5. 未処理の状態を確認: 投函待ちの票・pending の execute が残っていないか(`/api/proposals`、KV)
    94	6. 誤登録が原因なら、票が入る前に `unregisterProposal`
    95	7. `sweep(トレジャリー)` → プール残額を回収
    96	8. 鍵の漏洩が疑われる場合: relayer secret・Discord webhook をローテーション、`setRegistrar` で差し替え
    97	
    98	## 8. 障害時
    99	
   100	- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
   101	  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
   102	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
   103	  (Worker の自動照合が Discord に⚠️を出す)
   104	- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
     1	require("dotenv").config();
     2	require("@nomicfoundation/hardhat-toolbox");
     3	
     4	const FORK_URL = process.env.MAINNET_RPC_URL;
     5	
     6	/** @type import('hardhat/config').HardhatUserConfig */
     7	module.exports = {
     8	  solidity: {
     9	    compilers: [
    10	      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
    11	      // pNouns NFT 本物ソース(contracts/vendor/pnouns、Sourcify 検証済み)用
    12	      { version: "0.8.14", settings: { optimizer: { enabled: true, runs: 200 } } },
    13	    ],
    14	    overrides: {},
    15	  },
    16	  networks: {
    17	    mainnet: {
    18	      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
    19	      chainId: 1,
    20	      accounts: process.env.MAINNET_DEPLOYER_KEY ? [process.env.MAINNET_DEPLOYER_KEY] : [],
    21	    },
    22	    sepolia: {
    23	      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    24	      chainId: 11155111,
    25	      accounts: process.env.SEPOLIA_MNEMONIC ? { mnemonic: process.env.SEPOLIA_MNEMONIC, count: 5 } : [],
    26	    },
    27	    hardhat: {
    28	      chainId: 1,
    29	      forking: FORK_URL ? { url: FORK_URL } : undefined,
    30	      // 大量マイニングを速くする
    31	      allowUnlimitedContractSize: false,
    32	    },
    33	  },
    34	  mocha: { timeout: 600000 },
    35	  sourcify: { enabled: true },
    36	  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
    37	  gasReporter: { enabled: !!process.env.REPORT_GAS, showMethodSig: true },
    38	};

exec
/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,130p'
nl -ba scripts/mainnet/deploy-snapvoter.js | sed -n '1,120p'
git show 1be9d16"'^:scripts/check-deploy.mjs | nl -ba | sed -n '"'1,180p'
rg -n \"create-and-register|dry|DRY|stage funded|stage worker|stage delegated|stage live|EXPECT_MARGIN|EXPECT_DELAY\" docs/RUNBOOK-MAINNET.md scripts/create-and-register.mjs scripts/check-deploy.mjs package.json .github -g '"'!node_modules'"'
node -e \"import('./relayer-cf/src/abi.js').then(({METAGOV_ABI})=>console.log(METAGOV_ABI.filter(x=>x.type==='error').map(x=>x.name)))\"" in /mnt/data/pnouns-voter
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
    92	  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
    93	  const w = registrarWallet.connect(provider);
    94	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
    95	  const c = new ethers.Contract(voter, abi, w);
    96	  const tx = await c.registerProposal(receipt.id, nounsId);
    97	  await tx.wait();
    98	  const delay = Number(await c.registrationDelayBlocks());
    99	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
   100	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
   101	}
   102	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
     1	// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
     2	// 使い方(必須値はすべて明示。fallback なし):
     3	//   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
     4	//     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
     5	//   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
     6	const { ethers, network } = require("hardhat");
     7	const fs = require("fs");
     8	const path = require("path");
     9	const MAINNET = {
    10	  NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
    11	  PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    12	};
    13	async function main() {
    14	  const owner = process.env.OWNER, registrar = process.env.REGISTRAR;
    15	  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
    16	  const delay = Number(process.env.REG_DELAY || 7200);
    17	  const margin = Number(process.env.MARGIN || 300);
    18	  if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
    19	  if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
    20	  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
    21	  if (!Number.isInteger(delay) || delay < 300) throw new Error("REG_DELAY は 300 以上(運用値 7200 = 約 24 時間)");
    22	  const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
    23	  if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
    24	  const [deployer] = await ethers.getSigners();
    25	  if (!deployer) throw new Error("デプロイ用アカウントがありません(MAINNET_DEPLOYER_KEY を設定)");
    26	  console.log(`network=${network.name} deployer=${deployer.address}`);
    27	  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=pnounsdao.eth`);
    28	  if (process.env.DRY_RUN === "1") { console.log("--- DRY_RUN: デプロイしません ---"); return; }
    29	  if (network.name === "hardhat") await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x1"]); // フォークでのテスト実行用
    30	  const F = await ethers.getContractFactory("PNounsSnapVoter");
    31	  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, "pnounsdao.eth", excluded, margin, delay);
    32	  await c.waitForDeployment();
    33	  const addr = await c.getAddress();
    34	  // 読み戻し検証(設定漏れをその場で検出)
    35	  const checks = [
    36	    ["space", await c.space(), "pnounsdao.eth"],
    37	    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
    38	    ["marginBlocks", Number(await c.marginBlocks()), margin],
    39	    ["owner", (await c.owner()).toLowerCase(), owner.toLowerCase()],
    40	    ["registrar", (await c.registrar()).toLowerCase(), registrar.toLowerCase()],
    41	    ["liveMode", await c.liveMode(), false],
    42	  ];
    43	  for (const [k, got, want] of checks) if (String(got) !== String(want)) throw new Error(`読み戻し不一致 ${k}: ${got} != ${want}`);
    44	  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
    45	  const dep = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
    46	  dep.snapVoter = addr;
    47	  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
    48	  fs.mkdirSync(path.dirname(out), { recursive: true });
    49	  fs.writeFileSync(out, JSON.stringify(dep, null, 2));
    50	  console.log(`デプロイ完了: ${addr} (block ${dep.snapVoterDeployBlock}) → ${out}`);
    51	  console.log("次: Sourcify 検証 → NETWORK=mainnet node scripts/check-deploy.mjs --stage deployed");
    52	}
    53	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
     1	// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
     2	// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
     3	// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
     4	//
     5	// 使い方:
     6	//   NETWORK=sepolia node scripts/check-deploy.mjs
     7	//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
     8	import { ethers } from "ethers";
     9	import fs from "node:fs";
    10	import path from "node:path";
    11	
    12	const ROOT = path.resolve(import.meta.dirname, "..");
    13	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    14	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    15	}
    16	const NETWORK = process.env.NETWORK || "sepolia";
    17	const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    18	const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
    19	  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
    20	  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
    21	const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    22	const VOTER_ABI = [
    23	  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
    24	  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
    25	  "function owner() view returns (address)", "function registrar() view returns (address)",
    26	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
    27	  "function excluded(address) view returns (bool)",
    28	];
    29	const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
    30	
    31	let failed = 0;
    32	const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
    33	const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
    34	
    35	async function main() {
    36	  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
    37	  const p = new ethers.JsonRpcProvider(RPC);
    38	  const voterAddr = dep.snapVoter || dep.voter;
    39	  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
    40	  console.log(`network=${NETWORK} voter=${voterAddr}\n`);
    41	
    42	  // 1. コントラクトの実値
    43	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
    44	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
    45	  ]);
    46	  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
    47	  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
    48	  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
    49	  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
    50	  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
    51	  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
    52	  check("refundEnabled", refund === true);
    53	
    54	  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
    55	  let workerCfg = null;
    56	  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
    57	  const relayer = workerCfg?.relayer || null;
    58	  const roles = { owner, registrar, relayer };
    59	  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
    60	  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
    61	  const distinct = new Set(addrs).size === addrs.length;
    62	  if (NETWORK === "mainnet") {
    63	    check("owner / registrar / relayer がすべて別アドレス", distinct);
    64	    check("relayer が Worker から取得できた", !!relayer);
    65	    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
    66	    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
    67	  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
    68	  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);
    69	
    70	  // 3. Worker と deployments の一致
    71	  if (workerCfg) {
    72	    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
    73	    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
    74	    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
    75	  }
    76	
    77	  // 4. 委任と残高
    78	  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
    79	  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
    80	  try {
    81	    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
    82	    const votes = await t.getCurrentVotes(voterAddr);
    83	    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
    84	  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
    85	  const pool = await p.getBalance(voterAddr);
    86	  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
    87	  if (relayer) {
    88	    const rb = await p.getBalance(relayer);
    89	    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
    90	  }
    91	
    92	  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
    93	  process.exit(failed ? 1 : 0);
    94	}
    95	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
rg: .github: No such file or directory (os error 2)
scripts/create-and-register.mjs:5://   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
scripts/create-and-register.mjs:6://   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
scripts/create-and-register.mjs:7://   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
scripts/create-and-register.mjs:52:  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
scripts/check-deploy.mjs:4://   --stage worker    … + Worker /api/config の一致・relayer の分離
scripts/check-deploy.mjs:5://   --stage funded    … + プール・relayer の残高
scripts/check-deploy.mjs:6://   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
scripts/check-deploy.mjs:7://   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
scripts/check-deploy.mjs:11:// EXPECT_DELAY(既定 7200)・EXPECT_BOT(任意: 4 者分離の検査)も参照する。
scripts/check-deploy.mjs:64:  const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 7200 : 1));
scripts/check-deploy.mjs:66:  if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
docs/RUNBOOK-MAINNET.md:20:**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
docs/RUNBOOK-MAINNET.md:31:(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
docs/RUNBOOK-MAINNET.md:48:# 手順 4 の後:            $ENV node scripts/check-deploy.mjs --stage worker
docs/RUNBOOK-MAINNET.md:49:# プール入金の後:         $ENV node scripts/check-deploy.mjs --stage funded
docs/RUNBOOK-MAINNET.md:50:# 手順 6-1(委任)の後:     $ENV node scripts/check-deploy.mjs --stage delegated
docs/RUNBOOK-MAINNET.md:51:# 手順 6-3(live 化)の後:  $ENV node scripts/check-deploy.mjs --stage live
docs/RUNBOOK-MAINNET.md:92:4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
[]

exec
/bin/bash -lc "nl -ba contracts/PNounsSnapVoter.sol | sed -n '100,225p'
rg -n \"constructor|marginBlocks|registrationDelayBlocks|excluded\" contracts/PNounsSnapVoter.sol test scripts -g '"'!node_modules'"'
find test -maxdepth 2 -type f -print | sort | xargs -r rg -n \"deploy-snapvoter|REG_DELAY|MARGIN|OUT|FORCE\" || true
cat package.json
cat relayer-cf/package.json" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   100	    /// @notice Snapshot 由来で新たに計上された token 数(統計用途)
   101	    mapping(uint256 => uint32) public snapshotVotesCounted;
   102	
   103	    struct SnapVote {
   104	        string from;      // 署名メッセージの from(チェックサム表記のアドレス文字列)
   105	        uint64 timestamp;
   106	        string proposal;  // Snapshot 提案 id(文字列)
   107	        uint32 choice;    // 1=賛成 2=反対 3=棄権
   108	        string reason;
   109	        string app;
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
   221	        assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
   222	        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
   223	        return endBlock;
   224	    }
   225	    function voteDeadline(uint256 proposalId) public view returns (uint256) {
contracts/PNounsSnapVoter.sol:34: *  - 締切 = Nouns の endBlock − marginBlocks。締切後は誰でも execute。票ゼロは投票しない(NoVotes)。
contracts/PNounsSnapVoter.sol:62:    mapping(address => bool) public excluded;
contracts/PNounsSnapVoter.sol:63:    uint256 public marginBlocks;
contracts/PNounsSnapVoter.sol:89:    uint256 public registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:121:    event MarginBlocksSet(uint256 marginBlocks);
contracts/PNounsSnapVoter.sol:151:    constructor(
contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
contracts/PNounsSnapVoter.sol:161:        marginBlocks = marginBlocks_;
contracts/PNounsSnapVoter.sol:162:        registrationDelayBlocks = registrationDelayBlocks_;
contracts/PNounsSnapVoter.sol:163:        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
contracts/PNounsSnapVoter.sol:167:    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
contracts/PNounsSnapVoter.sol:168:    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:227:        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
contracts/PNounsSnapVoter.sol:292:        if (excluded[voter]) revert ExcludedVoter(voter);
scripts/create-and-register.mjs:94:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
scripts/create-and-register.mjs:98:  const delay = Number(await c.registrationDelayBlocks());
scripts/check-deploy.mjs:36:  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
scripts/check-deploy.mjs:39:  "function excluded(address) view returns (bool)",
scripts/check-deploy.mjs:59:    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
scripts/check-deploy.mjs:65:  check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
scripts/check-deploy.mjs:66:  if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
scripts/check-deploy.mjs:77:      check(`excluded(${a.slice(0, 10)}…)`, await v.excluded(a), "");
scripts/check-deploy.mjs:83:    check("excluded(トレジャリー)", await v.excluded(t), t);
scripts/sepolia/_rehearse-keys.js:45:  await (await vAsNewOwner.setMarginBlocks(await v.marginBlocks())).wait(); // onlyOwner 操作が新オーナーで通ることを確認
scripts/sepolia/12-deploy-snapvoter.js:12:  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
scripts/sepolia/12-deploy-snapvoter.js:13:  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
scripts/sepolia/12-deploy-snapvoter.js:14:  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
scripts/sepolia/ens-controller-abi.json:1:{"address": "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968", "abi": [{"inputs": [{"internalType": "contract BaseRegistrarImplementation", "name": "_base", "type": "address"}, {"internalType": "contract IPriceOracle", "name": "_prices", "type": "address"}, {"internalType": "uint256", "name": "_minCommitmentAge", "type": "uint256"}, {"internalType": "uint256", "name": "_maxCommitmentAge", "type": "uint256"}, {"internalType": "contract IReverseRegistrar", "name": "_reverseRegistrar", "type": "address"}, {"internalType": "contract IDefaultReverseRegistrar", "name": "_defaultReverseRegistrar", "type": "address"}, {"internalType": "contract ENS", "name": "_ens", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}], "name": "CommitmentNotFound", "type": "error"}, {"inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}, {"internalType": "uint256", "name": "minimumCommitmentTimestamp", "type": "uint256"}, {"internalType": "uint256", "name": "currentTimestamp", "type": "uint256"}], "name": "CommitmentTooNew", "type": "error"}, {"inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}, {"internalType": "uint256", "name": "maximumCommitmentTimestamp", "type": "uint256"}, {"internalType": "uint256", "name": "currentTimestamp", "type": "uint256"}], "name": "CommitmentTooOld", "type": "error"}, {"inputs": [{"internalType": "uint256", "name": "duration", "type": "uint256"}], "name": "DurationTooShort", "type": "error"}, {"inputs": [], "name": "InsufficientValue", "type": "error"}, {"inputs": [], "name": "MaxCommitmentAgeTooHigh", "type": "error"}, {"inputs": [], "name": "MaxCommitmentAgeTooLow", "type": "error"}, {"inputs": [{"internalType": "string", "name": "name", "type": "string"}], "name": "NameNotAvailable", "type": "error"}, {"inputs": [], "name": "ResolverRequiredForReverseRecord", "type": "error"}, {"inputs": [], "name": "ResolverRequiredWhenDataSupplied", "type": "error"}, {"inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}], "name": "UnexpiredCommitmentExists", "type": "error"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "string", "name": "label", "type": "string"}, {"indexed": true, "internalType": "bytes32", "name": "labelhash", "type": "bytes32"}, {"indexed": true, "internalType": "address", "name": "owner", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "baseCost", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "premium", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "expires", "type": "uint256"}, {"indexed": false, "internalType": "bytes32", "name": "referrer", "type": "bytes32"}], "name": "NameRegistered", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "string", "name": "label", "type": "string"}, {"indexed": true, "internalType": "bytes32", "name": "labelhash", "type": "bytes32"}, {"indexed": false, "internalType": "uint256", "name": "cost", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "expires", "type": "uint256"}, {"indexed": false, "internalType": "bytes32", "name": "referrer", "type": "bytes32"}], "name": "NameRenewed", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"}, {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}], "name": "OwnershipTransferred", "type": "event"}, {"inputs": [], "name": "MIN_REGISTRATION_DURATION", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "string", "name": "label", "type": "string"}], "name": "available", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}], "name": "commit", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}], "name": "commitments", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "defaultReverseRegistrar", "outputs": [{"internalType": "contract IDefaultReverseRegistrar", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "ens", "outputs": [{"internalType": "contract ENS", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"components": [{"internalType": "string", "name": "label", "type": "string"}, {"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "uint256", "name": "duration", "type": "uint256"}, {"internalType": "bytes32", "name": "secret", "type": "bytes32"}, {"internalType": "address", "name": "resolver", "type": "address"}, {"internalType": "bytes[]", "name": "data", "type": "bytes[]"}, {"internalType": "uint8", "name": "reverseRecord", "type": "uint8"}, {"internalType": "bytes32", "name": "referrer", "type": "bytes32"}], "internalType": "struct IETHRegistrarController.Registration", "name": "registration", "type": "tuple"}], "name": "makeCommitment", "outputs": [{"internalType": "bytes32", "name": "commitment", "type": "bytes32"}], "stateMutability": "pure", "type": "function"}, {"inputs": [], "name": "maxCommitmentAge", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "minCommitmentAge", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "owner", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "prices", "outputs": [{"internalType": "contract IPriceOracle", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "_token", "type": "address"}, {"internalType": "address", "name": "_to", "type": "address"}, {"internalType": "uint256", "name": "_amount", "type": "uint256"}], "name": "recoverFunds", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"components": [{"internalType": "string", "name": "label", "type": "string"}, {"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "uint256", "name": "duration", "type": "uint256"}, {"internalType": "bytes32", "name": "secret", "type": "bytes32"}, {"internalType": "address", "name": "resolver", "type": "address"}, {"internalType": "bytes[]", "name": "data", "type": "bytes[]"}, {"internalType": "uint8", "name": "reverseRecord", "type": "uint8"}, {"internalType": "bytes32", "name": "referrer", "type": "bytes32"}], "internalType": "struct IETHRegistrarController.Registration", "name": "registration", "type": "tuple"}], "name": "register", "outputs": [], "stateMutability": "payable", "type": "function"}, {"inputs": [{"internalType": "string", "name": "label", "type": "string"}, {"internalType": "uint256", "name": "duration", "type": "uint256"}, {"internalType": "bytes32", "name": "referrer", "type": "bytes32"}], "name": "renew", "outputs": [], "stateMutability": "payable", "type": "function"}, {"inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "string", "name": "label", "type": "string"}, {"internalType": "uint256", "name": "duration", "type": "uint256"}], "name": "rentPrice", "outputs": [{"components": [{"internalType": "uint256", "name": "base", "type": "uint256"}, {"internalType": "uint256", "name": "premium", "type": "uint256"}], "internalType": "struct IPriceOracle.Price", "name": "price", "type": "tuple"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "reverseRegistrar", "outputs": [{"internalType": "contract IReverseRegistrar", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "bytes4", "name": "interfaceID", "type": "bytes4"}], "name": "supportsInterface", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "string", "name": "label", "type": "string"}], "name": "valid", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "pure", "type": "function"}, {"inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"}]}
scripts/sepolia/03-deploy-voter.js:15:  dep.marginBlocks = Number(margin);
scripts/mainnet/deploy-snapvoter.js:15:  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
scripts/mainnet/deploy-snapvoter.js:20:  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
scripts/mainnet/deploy-snapvoter.js:27:  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=pnounsdao.eth`);
scripts/mainnet/deploy-snapvoter.js:31:  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, "pnounsdao.eth", excluded, margin, delay);
scripts/mainnet/deploy-snapvoter.js:37:    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
scripts/mainnet/deploy-snapvoter.js:38:    ["marginBlocks", Number(await c.marginBlocks()), margin],
scripts/mainnet/deploy-snapvoter.js:44:  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
test/fork.e2e.test.js:19:const MARGIN = 3600n;
test/fork.e2e.test.js:110:    metagov = await F.deploy(PNOUNS, NOUNS_DAO, deployer.address, [PNOUNS_TREASURY], MARGIN);
test/fork.e2e.test.js:168:    expect(await metagov.voteDeadline(proposalId)).to.equal(pr.endBlock - MARGIN);
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

exec
/bin/bash -lc "sed -n '4380,4435p' docs/audit-13-codex-raw.md
sed -n '4480,4535p' docs/audit-13-codex-raw.md
git show --check 1be9d16
node --check scripts/check-deploy.mjs && node --check scripts/create-and-register.mjs && node --check scripts/mainnet/deploy-snapvoter.js" in /mnt/data/pnouns-voter
 succeeded in 0ms:
mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。

最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。

## 主要所見

### [High] 登録猶予中の正常票が dead-letter 化される

[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。

### [Medium] Snapshot送信後の登録失敗経路がまだ残る

[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。

### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない

[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。

### [Medium] check-deployが危険な構成を成功扱いし得る

[scripts/check-deploy.mjs:27](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:27)、[scripts/check-deploy.mjs:43](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:43)、[scripts/check-deploy.mjs:62](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:62)、[scripts/check-deploy.mjs:78](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:78) / 以下が未検証です。

- `excluded(address)` はABIにあるだけで、pNouns treasury `0x8ae80e…2785` を確認していません。
- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
- `EXPECT_RELAYER` がなく、意図したrelayerか確認できません。
- runbookの「4鍵分離」に対し、Snapshot botとowner/relayerの同一性は検査されません。
- `getCurrentVotes(voter)>0` は誰か1人の委任でも通り、対象マルチシグの `delegates(multisig)==voter` を保証しません。
- 委任照会例外は警告だけで `failed` を増やしません。
- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。

/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。

### [Low] pendingnotesは上限超過・KV障害・重複に弱い

[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。

Snapshot経路では `snapsent` を削除した後にキューへ書くため、Discord失敗に続いてKV putも失敗すると再送トリガーを失います。送信成功後のKV delete失敗や、Discordが受理した後の通信切断では重複します。textだけではtx単位の冪等管理もできません。 / `{id: txHash, text}` を持つdurable outboxにし、元トリガー削除より先に保存してください。Cloudflare Queues/Durable Object、またはイベント単位キーと明示的な容量監視が望まれます。

### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様

[relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[relayer-cf/test/link-check.test.mjs:68](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:68) / 指定6ケースは期待値どおりです。

- `989abc`、`989%20foo` → false
- `989偽`、`989.後`、Markdown、クエリ内括弧 → true

単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。

### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない

[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。

まだ穴のままなのは次です。

- `submitFromSnapshot` の実simulate/write/reconcile
- 登録猶予中の `RegistrationTooRecent`
- rush複数batch
mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。

最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。

## 主要所見

### [High] 登録猶予中の正常票が dead-letter 化される

[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。

### [Medium] Snapshot送信後の登録失敗経路がまだ残る

[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。

### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない

[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。

### [Medium] check-deployが危険な構成を成功扱いし得る

[scripts/check-deploy.mjs:27](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:27)、[scripts/check-deploy.mjs:43](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:43)、[scripts/check-deploy.mjs:62](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:62)、[scripts/check-deploy.mjs:78](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:78) / 以下が未検証です。

- `excluded(address)` はABIにあるだけで、pNouns treasury `0x8ae80e…2785` を確認していません。
- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
- `EXPECT_RELAYER` がなく、意図したrelayerか確認できません。
- runbookの「4鍵分離」に対し、Snapshot botとowner/relayerの同一性は検査されません。
- `getCurrentVotes(voter)>0` は誰か1人の委任でも通り、対象マルチシグの `delegates(multisig)==voter` を保証しません。
- 委任照会例外は警告だけで `failed` を増やしません。
- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。

/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。

### [Low] pendingnotesは上限超過・KV障害・重複に弱い

[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。

Snapshot経路では `snapsent` を削除した後にキューへ書くため、Discord失敗に続いてKV putも失敗すると再送トリガーを失います。送信成功後のKV delete失敗や、Discordが受理した後の通信切断では重複します。textだけではtx単位の冪等管理もできません。 / `{id: txHash, text}` を持つdurable outboxにし、元トリガー削除より先に保存してください。Cloudflare Queues/Durable Object、またはイベント単位キーと明示的な容量監視が望まれます。

### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様

[relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[relayer-cf/test/link-check.test.mjs:68](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:68) / 指定6ケースは期待値どおりです。

- `989abc`、`989%20foo` → false
- `989偽`、`989.後`、Markdown、クエリ内括弧 → true

単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。

### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない

[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。

まだ穴のままなのは次です。

- `submitFromSnapshot` の実simulate/write/reconcile
- 登録猶予中の `RegistrationTooRecent`
- rush複数batch
commit 1be9d1658bbf7acb85c6eff646d7ee7c8569c79c
Author: earlgrey <[redacted-email]>
Date:   Thu Aug 20 23:37:44 2026 +0900

    第13回監査(Codex)対応: 登録猶予中の票の dead-letter 化を修正ほか
    
    High:
    - mainnet の登録猶予(24h)中に届いた正常票が dead-letter 化される問題。
      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
      revert を恒久失敗として snapdrop に数えていた(約10分で除外)。
      ①猶予中は submitFromSnapshot を呼ばない ②revert 名を復号し
      RegistrationTooRecent は一括・個別とも数えない、の二重防御。
      Worker テスト(猶予中/解禁後)を必須化どおり追加
    
    Medium:
    - create-and-register にオンチェーン preflight(コントラクト実在・
      registrar 権限・未登録)を追加。孤児提案の設定起因経路を閉鎖
    - scripts/mainnet/deploy-snapvoter.js を実装、フォークで実デプロイ検証。
      hardhat.config に mainnet ネットワークを追加
    - check-deploy を --stage 分割(deployed/worker/funded/delegated/live)。
      mainnet は EXPECT_* 必須・excluded/delegates 照合・照会失敗 fail・
      live 前は liveMode=false 要求。runbook を段階照合に書き換え、
      ロールバックを 8 手順の固定順序に拡充
    
    Low:
    - pendingnotes に tx id を導入し重複送信を排除(残余は accepted risk)
    - URL 照合の 989偽=true を仕様として文書化
    - テスト追加: hub errors 応答の fail-closed / pendingnotes 再送
    
    テスト: relayer 38 pass / contracts 19 pass。Worker 再デプロイ済み。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

docs/audit-13-codex-raw.md:132: trailing whitespace.
+    
docs/audit-13-codex-raw.md:141: trailing whitespace.
+    
docs/audit-13-codex-raw.md:148: trailing whitespace.
+    
docs/audit-13-codex-raw.md:151: trailing whitespace.
+    
docs/audit-13-codex-raw.md:153: trailing whitespace.
+    
docs/audit-13-codex-raw.md:219: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:237: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:291: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:316: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:339: trailing whitespace.
+    
docs/audit-13-codex-raw.md:349: trailing whitespace.
+    
docs/audit-13-codex-raw.md:360: trailing whitespace.
+    
docs/audit-13-codex-raw.md:362: trailing whitespace.
+    
docs/audit-13-codex-raw.md:472: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:479: trailing whitespace.
+ 
docs/audit-13-codex-raw.md:935: trailing whitespace.
+    14	
docs/audit-13-codex-raw.md:942: trailing whitespace.
+    21	
docs/audit-13-codex-raw.md:949: trailing whitespace.
+    28	
docs/audit-13-codex-raw.md:960: trailing whitespace.
+    39	
docs/audit-13-codex-raw.md:974: trailing whitespace.
+    53	
docs/audit-13-codex-raw.md:991: trailing whitespace.
+    70	
docs/audit-13-codex-raw.md:1001: trailing whitespace.
+    80	
docs/audit-13-codex-raw.md:1018: trailing whitespace.
+     6	
docs/audit-13-codex-raw.md:1033: trailing whitespace.
+    21	
docs/audit-13-codex-raw.md:1107: trailing whitespace.
+    95	
docs/audit-13-codex-raw.md:1172: trailing whitespace.
+    10	
docs/audit-13-codex-raw.md:1176: trailing whitespace.
+    14	
docs/audit-13-codex-raw.md:1203: trailing whitespace.
+    41	
docs/audit-13-codex-raw.md:1227: trailing whitespace.
+    65	
docs/audit-13-codex-raw.md:1269: trailing whitespace.
+   107	
docs/audit-13-codex-raw.md:1299: trailing whitespace.
+     7	
docs/audit-13-codex-raw.md:1311: trailing whitespace.
+    19	
docs/audit-13-codex-raw.md:1338: trailing whitespace.
+    46	
docs/audit-13-codex-raw.md:1345: trailing whitespace.
+    53	
docs/audit-13-codex-raw.md:1380: trailing whitespace.
+    88	
docs/audit-13-codex-raw.md:1403: trailing whitespace.
+   111	
docs/audit-13-codex-raw.md:1439: trailing whitespace.
+   147	
docs/audit-13-codex-raw.md:1470: trailing whitespace.
+   178	
docs/audit-13-codex-raw.md:1504: trailing whitespace.
+   212	
docs/audit-13-codex-raw.md:1528: trailing whitespace.
+   236	
docs/audit-13-codex-raw.md:1566: trailing whitespace.
+   274	
docs/audit-13-codex-raw.md:1617: trailing whitespace.
+   325	
docs/audit-13-codex-raw.md:1662: trailing whitespace.
+   370	
docs/audit-13-codex-raw.md:1677: trailing whitespace.
+   385	
docs/audit-13-codex-raw.md:1696: trailing whitespace.
+   404	
docs/audit-13-codex-raw.md:1706: trailing whitespace.
+   414	
docs/audit-13-codex-raw.md:1709: trailing whitespace.
+   417	
docs/audit-13-codex-raw.md:1826: trailing whitespace.
+     7	
docs/audit-13-codex-raw.md:1838: trailing whitespace.
+    19	
docs/audit-13-codex-raw.md:1865: trailing whitespace.
+    46	
docs/audit-13-codex-raw.md:1872: trailing whitespace.
+    53	
docs/audit-13-codex-raw.md:1907: trailing whitespace.
+    88	
docs/audit-13-codex-raw.md:1930: trailing whitespace.
+   111	
docs/audit-13-codex-raw.md:1966: trailing whitespace.
+   147	
docs/audit-13-codex-raw.md:1997: trailing whitespace.
+   178	
docs/audit-13-codex-raw.md:2031: trailing whitespace.
+   212	
docs/audit-13-codex-raw.md:2118: trailing whitespace.
+     7	
docs/audit-13-codex-raw.md:2120: trailing whitespace.
+     9	
docs/audit-13-codex-raw.md:2129: trailing whitespace.
+    18	
docs/audit-13-codex-raw.md:2138: trailing whitespace.
+    27	
docs/audit-13-codex-raw.md:2167: trailing whitespace.
+    56	
docs/audit-13-codex-raw.md:2193: trailing whitespace.
+    82	
docs/audit-13-codex-raw.md:2209: trailing whitespace.
+    98	
docs/audit-13-codex-raw.md:2262: trailing whitespace.
+   151	
docs/audit-13-codex-raw.md:2294: trailing whitespace.
+   183	
docs/audit-13-codex-raw.md:2304: trailing whitespace.
+   193	
docs/audit-13-codex-raw.md:2312: trailing whitespace.
+   201	
docs/audit-13-codex-raw.md:2323: trailing whitespace.
+   212	
docs/audit-13-codex-raw.md:2390: trailing whitespace.
+   236	
docs/audit-13-codex-raw.md:2428: trailing whitespace.
+   274	
docs/audit-13-codex-raw.md:2479: trailing whitespace.
+   325	
docs/audit-13-codex-raw.md:2532: trailing whitespace.
+     7	
docs/audit-13-codex-raw.md:2545: trailing whitespace.
+    20	
docs/audit-13-codex-raw.md:2557: trailing whitespace.
+    32	
docs/audit-13-codex-raw.md:2577: trailing whitespace.
+    52	
docs/audit-13-codex-raw.md:2592: trailing whitespace.
+    67	
docs/audit-13-codex-raw.md:2628: trailing whitespace.
+   103	
docs/audit-13-codex-raw.md:2630: trailing whitespace.
+   105	
docs/audit-13-codex-raw.md:2640: trailing whitespace.
+   115	
docs/audit-13-codex-raw.md:2655: trailing whitespace.
+   130	
docs/audit-13-codex-raw.md:2663: trailing whitespace.
+   138	
docs/audit-13-codex-raw.md:2677: trailing whitespace.
+   152	
docs/audit-13-codex-raw.md:2688: trailing whitespace.
+   163	
docs/audit-13-codex-raw.md:2698: trailing whitespace.
+   173	
docs/audit-13-codex-raw.md:2707: trailing whitespace.
+   182	
docs/audit-13-codex-raw.md:2718: trailing whitespace.
+   193	
docs/audit-13-codex-raw.md:2743: trailing whitespace.
+     6	
docs/audit-13-codex-raw.md:2755: trailing whitespace.
+    18	
docs/audit-13-codex-raw.md:2761: trailing whitespace.
+    24	
docs/audit-13-codex-raw.md:2770: trailing whitespace.
+    33	
docs/audit-13-codex-raw.md:2775: trailing whitespace.
+    38	
docs/audit-13-codex-raw.md:2780: trailing whitespace.
+    43	
docs/audit-13-codex-raw.md:2793: trailing whitespace.
+    56	
docs/audit-13-codex-raw.md:2799: trailing whitespace.
+    62	
docs/audit-13-codex-raw.md:2803: trailing whitespace.
+    66	
docs/audit-13-codex-raw.md:2924: trailing whitespace.
+     2	
docs/audit-13-codex-raw.md:2927: trailing whitespace.
+     5	
docs/audit-13-codex-raw.md:2929: trailing whitespace.
+     7	
docs/audit-13-codex-raw.md:2932: trailing whitespace.
+    10	
docs/audit-13-codex-raw.md:2934: trailing whitespace.
+    12	
docs/audit-13-codex-raw.md:2941: trailing whitespace.
+    19	
docs/audit-13-codex-raw.md:2944: trailing whitespace.
+    22	
docs/audit-13-codex-raw.md:2946: trailing whitespace.
+    24	
docs/audit-13-codex-raw.md:2951: trailing whitespace.
+    29	
docs/audit-13-codex-raw.md:2956: trailing whitespace.
+    34	
docs/audit-13-codex-raw.md:2958: trailing whitespace.
+    36	
docs/audit-13-codex-raw.md:2962: trailing whitespace.
+    40	
docs/audit-13-codex-raw.md:2965: trailing whitespace.
+    43	
docs/audit-13-codex-raw.md:2967: trailing whitespace.
+    45	
docs/audit-13-codex-raw.md:2977: trailing whitespace.
+    55	
docs/audit-13-codex-raw.md:2980: trailing whitespace.
+    58	
docs/audit-13-codex-raw.md:2982: trailing whitespace.
+    60	
docs/audit-13-codex-raw.md:2987: trailing whitespace.
+    65	
docs/audit-13-codex-raw.md:2989: trailing whitespace.
+    67	
docs/audit-13-codex-raw.md:2994: trailing whitespace.
+    72	
docs/audit-13-codex-raw.md:2996: trailing whitespace.
+    74	
docs/audit-13-codex-raw.md:3001: trailing whitespace.
+    79	
docs/audit-13-codex-raw.md:3003: trailing whitespace.
+    81	
docs/audit-13-codex-raw.md:3019: trailing whitespace.
+    11	
docs/audit-13-codex-raw.md:3038: trailing whitespace.
+    30	
docs/audit-13-codex-raw.md:3042: trailing whitespace.
+    34	
docs/audit-13-codex-raw.md:3049: trailing whitespace.
+    41	
docs/audit-13-codex-raw.md:3061: trailing whitespace.
+    53	
docs/audit-13-codex-raw.md:3077: trailing whitespace.
+    69	
docs/audit-13-codex-raw.md:3084: trailing whitespace.
+    76	
docs/audit-13-codex-raw.md:3099: trailing whitespace.
+    91	
docs/audit-13-codex-raw.md:3108: trailing whitespace.
+     5	
docs/audit-13-codex-raw.md:3112: trailing whitespace.
+     9	
docs/audit-13-codex-raw.md:3115: trailing whitespace.
+    12	
docs/audit-13-codex-raw.md:3119: trailing whitespace.
+    16	
docs/audit-13-codex-raw.md:3135: trailing whitespace.
+    32	
docs/audit-13-codex-raw.md:3194: trailing whitespace.
+   150	
docs/audit-13-codex-raw.md:3209: trailing whitespace.
+   165	
docs/audit-13-codex-raw.md:3221: trailing whitespace.
+   177	
docs/audit-13-codex-raw.md:3245: trailing whitespace.
+   360	
docs/audit-13-codex-raw.md:3260: trailing whitespace.
+   375	
docs/audit-13-codex-raw.md:3268: trailing whitespace.
+   383	
docs/audit-13-codex-raw.md:3293: trailing whitespace.
+    10	
docs/audit-13-codex-raw.md:3297: trailing whitespace.
+    14	
docs/audit-13-codex-raw.md:3324: trailing whitespace.
+    41	
docs/audit-13-codex-raw.md:3348: trailing whitespace.
+    65	
docs/audit-13-codex-raw.md:3390: trailing whitespace.
+   107	
docs/audit-13-codex-raw.md:3419: trailing whitespace.
+   136	
docs/audit-13-codex-raw.md:3435: trailing whitespace.
+   152	
docs/audit-13-codex-raw.md:3453: trailing whitespace.
+   170	
docs/audit-13-codex-raw.md:3466: trailing whitespace.
+   183	
docs/audit-13-codex-raw.md:3479: trailing whitespace.
+   196	
docs/audit-13-codex-raw.md:3887: trailing whitespace.
+   127	
docs/audit-13-codex-raw.md:3920: trailing whitespace.
+   192	
docs/audit-13-codex-raw.md:3933: trailing whitespace.
+   205	
docs/audit-13-codex-raw.md:3944: trailing whitespace.
+   216	
docs/audit-13-codex-raw.md:3961: trailing whitespace.
+   233	
docs/audit-13-codex-raw.md:3973: trailing whitespace.
+   279	
docs/audit-13-codex-raw.md:3983: trailing whitespace.
+   289	
docs/audit-13-codex-raw.md:3987: trailing whitespace.
+   293	
docs/audit-13-codex-raw.md:3997: trailing whitespace.
+   303	
docs/audit-13-codex-raw.md:4001: trailing whitespace.
+   307	
docs/audit-13-codex-raw.md:4003: trailing whitespace.
+   309	
docs/audit-13-codex-raw.md:4100: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4102: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4104: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4106: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4108: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4110: trailing whitespace.
++    
docs/audit-13-codex-raw.md:4112: trailing whitespace.
++ 
docs/audit-13-codex-raw.md:4114: trailing whitespace.
++ 
docs/audit-13-codex-raw.md:4116: trailing whitespace.
++ 
docs/audit-13-codex-raw.md:4118: trailing whitespace.
++     7	
docs/audit-13-codex-raw.md:4120: trailing whitespace.
++    20	
docs/audit-13-codex-raw.md:4122: trailing whitespace.
++    27	
docs/audit-13-codex-raw.md:4124: trailing whitespace.
++    62	
docs/audit-13-codex-raw.md:4126: trailing whitespace.
++    85	
docs/audit-13-codex-raw.md:4128: trailing whitespace.
++   121	
docs/audit-13-codex-raw.md:4130: trailing whitespace.
++   152	
docs/audit-13-codex-raw.md:4132: trailing whitespace.
++   186	
docs/audit-13-codex-raw.md:4134: trailing whitespace.
++   210	
docs/audit-13-codex-raw.md:4136: trailing whitespace.
++   248	
docs/audit-13-codex-raw.md:4138: trailing whitespace.
++   299	
docs/audit-13-codex-raw.md:4140: trailing whitespace.
++   344	
docs/audit-13-codex-raw.md:4142: trailing whitespace.
++   359	
docs/audit-13-codex-raw.md:4144: trailing whitespace.
++   378	
docs/audit-13-codex-raw.md:4146: trailing whitespace.
++   388	
docs/audit-13-codex-raw.md:4148: trailing whitespace.
++    10	
docs/audit-13-codex-raw.md:4150: trailing whitespace.
++    14	
docs/audit-13-codex-raw.md:4152: trailing whitespace.
++    41	
docs/audit-13-codex-raw.md:4154: trailing whitespace.
++    64	
docs/audit-13-codex-raw.md:4156: trailing whitespace.
++   106	
docs/audit-13-codex-raw.md:4158: trailing whitespace.
++    76	
docs/audit-13-codex-raw.md:4160: trailing whitespace.
++    84	
docs/audit-13-codex-raw.md:4162: trailing whitespace.
++    87	
docs/audit-13-codex-raw.md:4164: trailing whitespace.
++   102	
docs/audit-13-codex-raw.md:4166: trailing whitespace.
++   150	
docs/audit-13-codex-raw.md:4168: trailing whitespace.
++   165	
docs/audit-13-codex-raw.md:4170: trailing whitespace.
++   177	
docs/audit-13-codex-raw.md:4172: trailing whitespace.
++   192	
docs/audit-13-codex-raw.md:4174: trailing whitespace.
++   205	
docs/audit-13-codex-raw.md:4176: trailing whitespace.
++   249	
docs/audit-13-codex-raw.md:4178: trailing whitespace.
++   279	
docs/audit-13-codex-raw.md:4180: trailing whitespace.
++   289	
docs/audit-13-codex-raw.md:4182: trailing whitespace.
++   293	
docs/audit-13-codex-raw.md:4184: trailing whitespace.
++    14	
docs/audit-13-codex-raw.md:4186: trailing whitespace.
++    21	
docs/audit-13-codex-raw.md:4188: trailing whitespace.
++    28	
docs/audit-13-codex-raw.md:4190: trailing whitespace.
++    39	
docs/audit-13-codex-raw.md:4192: trailing whitespace.
++    53	
docs/audit-13-codex-raw.md:4194: trailing whitespace.
++    64	
docs/audit-13-codex-raw.md:4196: trailing whitespace.
++   299	
docs/audit-13-codex-raw.md:4198: trailing whitespace.
++   344	
docs/audit-13-codex-raw.md:4200: trailing whitespace.
++   359	
docs/audit-13-codex-raw.md:4202: trailing whitespace.
++   378	
docs/audit-13-codex-raw.md:4204: trailing whitespace.
++   388	
docs/audit-13-codex-raw.md:4206: trailing whitespace.
++    64	
docs/audit-13-codex-raw.md:4208: trailing whitespace.
++   106	
docs/audit-13-codex-raw.md:4210: trailing whitespace.
++     6	
docs/audit-13-codex-raw.md:4212: trailing whitespace.
++    21	
docs/audit-13-codex-raw.md:4214: trailing whitespace.
++     5	
docs/audit-13-codex-raw.md:4216: trailing whitespace.
++     9	
docs/audit-13-codex-raw.md:4218: trailing whitespace.
++    12	
docs/audit-13-codex-raw.md:4220: trailing whitespace.
++    16	
docs/audit-13-codex-raw.md:4222: trailing whitespace.
++    32	
docs/audit-13-codex-raw.md:4224: trailing whitespace.
++   289	
docs/audit-13-codex-raw.md:4226: trailing whitespace.
++   293	
docs/audit-13-codex-raw.md:4228: trailing whitespace.
++   303	
docs/audit-13-codex-raw.md:4230: trailing whitespace.
++   307	
docs/audit-13-codex-raw.md:4232: trailing whitespace.
++   309	
docs/audit-13-codex-raw.md:4234: trailing whitespace.
++   333	
docs/audit-13-codex-raw.md:4236: trailing whitespace.
++   348	
docs/audit-13-codex-raw.md:4238: trailing whitespace.
++   360	
docs/audit-13-codex-raw.md:4240: trailing whitespace.
++   375	
docs/audit-13-codex-raw.md:4242: trailing whitespace.
++   383	
docs/audit-13-codex-raw.md:4244: trailing whitespace.
++   387	
docs/audit-13-codex-raw.md:4246: trailing whitespace.
++    61	
docs/audit-13-codex-raw.md:4248: trailing whitespace.
++   102	
docs/audit-13-codex-raw.md:4250: trailing whitespace.
++     6	
docs/audit-13-codex-raw.md:4252: trailing whitespace.
++    18	
docs/audit-13-codex-raw.md:4254: trailing whitespace.
++    24	
docs/audit-13-codex-raw.md:4256: trailing whitespace.
++    33	
docs/audit-13-codex-raw.md:4258: trailing whitespace.
++    38	
docs/audit-13-codex-raw.md:4260: trailing whitespace.
++    43	
docs/audit-13-codex-raw.md:4262: trailing whitespace.
++    56	
docs/audit-13-codex-raw.md:4264: trailing whitespace.
++    62	
docs/audit-13-codex-raw.md:4266: trailing whitespace.
++- 最初の20件で `snapToNouns` がヒット  
docs/audit-13-codex-raw.md:4268: trailing whitespace.
++  → `found` に入る  
docs/audit-13-codex-raw.md:4270: trailing whitespace.
++  → `missing` から除外  
docs/audit-13-codex-raw.md:4272: trailing whitespace.
++- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
docs/audit-13-codex-raw.md:4274: trailing whitespace.
++  → `found` と `meta` に入る  
docs/audit-13-codex-raw.md:4276: trailing whitespace.
++- 未登録、すなわち `nounsToSnap == 0`  
docs/audit-13-codex-raw.md:4278: trailing whitespace.
++  → `need` に入らない  
docs/audit-13-codex-raw.md:4280: trailing whitespace.
++- 登録済みだが200件内で未発見  
docs/audit-13-codex-raw.md:4282: trailing whitespace.
++- 最初の20件で `snapToNouns` がヒット  
docs/audit-13-codex-raw.md:4284: trailing whitespace.
++  → `found` に入る  
docs/audit-13-codex-raw.md:4286: trailing whitespace.
++  → `missing` から除外  
docs/audit-13-codex-raw.md:4288: trailing whitespace.
++- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
docs/audit-13-codex-raw.md:4290: trailing whitespace.
++  → `found` と `meta` に入る  
docs/audit-13-codex-raw.md:4292: trailing whitespace.
++- 未登録、すなわち `nounsToSnap == 0`  
docs/audit-13-codex-raw.md:4294: trailing whitespace.
++  → `need` に入らない  
docs/audit-13-codex-raw.md:4296: trailing whitespace.
++- 登録済みだが200件内で未発見  
docs/audit-13-codex-raw.md:4303: trailing whitespace.
+    46	
docs/audit-13-codex-raw.md:4311: trailing whitespace.
+    54	
docs/audit-13-codex-raw.md:4318: trailing whitespace.
+    61	
docs/audit-13-codex-raw.md:4324: trailing whitespace.
+    67	
docs/audit-13-codex-raw.md:4333: trailing whitespace.
+    76	
docs/audit-13-codex-raw.md:4341: trailing whitespace.
+    84	
docs/audit-13-codex-raw.md:4344: trailing whitespace.
+    87	
docs/audit-13-codex-raw.md:4359: trailing whitespace.
+   102	
docs/audit-13-codex-raw.md:4371: trailing whitespace.
+   114	

codex
重要な未解消点が2つ見えています。`METAGOV_ABI` に custom error が1件もなく、`RegistrationTooRecent` の名前復号による二重防御は現状機能しません。また `check-deploy` は前回要求された `EXPECT_BOT` と `EXPECT_MARGIN` を mainnet 必須にしておらず、未指定のまま成功できます。主ゲート自体は有効なので、これらの実害範囲をテスト結果と合わせて最終評価します。
差分と関連実装の追跡を完了し、未解消点を特定しました。指定テストを実行します。
  ✓ 第13回監査と commit 1be9d16 の差分を確認する
  ✓ 6検証項目を関連コード・RUNBOOK・テストまで追跡する
  → relayer-cf で npm test を実行し結果を評価する
  • 重大度順の日本語監査結果をまとめる
exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 958ms:
✔ test/accept-deadline.test.mjs (809.042791ms)
✔ test/cursor.test.mjs (814.301012ms)
✔ test/link-check.test.mjs (853.20976ms)
✔ test/worker-tick.test.mjs (869.864203ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 882.542458

exec
/bin/bash -lc "rg -n '"'^test'"\\(' relayer-cf/test/*.mjs | wc -l && rg -n '"'^test'"\\(' relayer-cf/test/*.mjs
node --test --test-reporter=spec test/worker-tick.test.mjs" in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 715ms:
✔ test/worker-tick.test.mjs (706.228512ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 710.170591

exec
/bin/bash -lc "rg -n '"'^test'"\\(' test/*.mjs | wc -l && rg -n '"'^test'"\\(' test/*.mjs | tail -50
node --version
node test/worker-tick.test.mjs" in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 707ms:
[snapshot hub] network down
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[config] registrationDelayBlocks(100) が最低値 300 未満です
[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(100) が最低値 300 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snapshot hub] hub graphql: [{"message":"boom"}]
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): hub graphql: [{"message":"boom"}] ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/20 23:58 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (10.749425ms)
✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (1.426759ms)
✔ linkOk=false: 警告し、テストネットでも告知はしない (1.40232ms)
✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (8.498814ms)
✔ mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない) (0.443001ms)
✔ mainnet: owner/registrar/relayer が同一なら停止 (0.352548ms)
✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.346611ms)
✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.850174ms)
✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.850899ms)
✔ 第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない (1.301948ms)
✔ ハブが GraphQL errors を返した場合も fail-closed (0.29593ms)
✔ 確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される (1.00639ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 30.674369

exec
/bin/bash -lc 'rg -n "class ContractFunctionRevertedError|errorName" node_modules/viem node_modules/.pnpm 2>/dev/null | head -80' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 162ms:
:    ? [errorName] extends [never]
node_modules/viem/types/contract.ts:49:      : errorName
node_modules/viem/types/contract.ts:99:  errorName extends ContractErrorName<abi> = ContractErrorName<abi>,
node_modules/viem/types/contract.ts:101:  ExtractAbiError<abi extends Abi ? abi : Abi, errorName>['inputs'],
node_modules/viem/_types/utils/abi/encodeErrorResult.d.ts:11:export type EncodeErrorResultParameters<abi extends Abi | readonly unknown[] = Abi, errorName extends ContractErrorName<abi> | undefined = ContractErrorName<abi>, hasErrors = abi extends Abi ? Abi extends abi ? true : [ExtractAbiErrors<abi>] extends [never] ? false : true : true, allArgs = ContractErrorArgs<abi, errorName extends ContractErrorName<abi> ? errorName : ContractErrorName<abi>>, allErrorNames = ContractErrorName<abi>> = {
node_modules/viem/_types/utils/abi/encodeErrorResult.d.ts:15:    errorName?: errorName | allErrorNames | undefined;
node_modules/viem/_types/utils/abi/encodeErrorResult.d.ts:17:    errorName: errorName | allErrorNames;
node_modules/viem/_types/utils/abi/encodeErrorResult.d.ts:19:    errorName?: errorName | allErrorNames | undefined;
node_modules/viem/_types/utils/abi/encodeErrorResult.d.ts:23:export declare function encodeErrorResult<const abi extends Abi | readonly unknown[], errorName extends ContractErrorName<abi> | undefined = undefined>(parameters: EncodeErrorResultParameters<abi, errorName>): EncodeErrorResultReturnType;
node_modules/viem/_types/utils/abi/decodeErrorResult.d.ts:17:    [errorName in allErrorNames]: {
node_modules/viem/_types/utils/abi/decodeErrorResult.d.ts:18:        abiItem: abi extends Abi ? Abi extends abi ? AbiItem : ExtractAbiError<abi, errorName> : AbiItem;
node_modules/viem/_types/utils/abi/decodeErrorResult.d.ts:19:        args: ContractErrorArgs<abi, errorName>;
node_modules/viem/_types/utils/abi/decodeErrorResult.d.ts:20:        errorName: errorName;
node_modules/viem/_types/utils/abi/decodeErrorResult.d.ts:25:    errorName: string;
node_modules/viem/_types/errors/contract.d.ts:40:export declare class ContractFunctionRevertedError extends BaseError {
node_modules/viem/_types/errors/abi.d.ts:82:    constructor(errorName: string, { docsPath }: {
node_modules/viem/_types/errors/abi.d.ts:90:    constructor(errorName?: string | undefined, { docsPath }?: {
node_modules/viem/_types/types/contract.d.ts:6:export type ContractErrorName<abi extends Abi | readonly unknown[] = Abi> = ExtractAbiErrorNames<abi extends Abi ? abi : Abi> extends infer errorName extends string ? [errorName] extends [never] ? string : errorName : string;
node_modules/viem/_types/types/contract.d.ts:12:export type ContractErrorArgs<abi extends Abi | readonly unknown[] = Abi, errorName extends ContractErrorName<abi> = ContractErrorName<abi>> = AbiParametersToPrimitiveTypes<ExtractAbiError<abi extends Abi ? abi : Abi, errorName>['inputs'], 'inputs', true> extends infer args ? [args] extends [never] ? readonly unknown[] : args : readonly unknown[];
node_modules/viem/_esm/errors/contract.js:138:export class ContractFunctionRevertedError extends BaseError {
node_modules/viem/_esm/errors/contract.js:147:                const { abiItem, errorName, args: errorArgs } = decodedData;
node_modules/viem/_esm/errors/contract.js:148:                if (errorName === 'Error') {
node_modules/viem/_esm/errors/contract.js:151:                else if (errorName === 'Panic') {
node_modules/viem/_esm/errors/contract.js:170:                            ? `       ${[...Array(errorName?.length ?? 0).keys()]
node_modules/viem/_esm/errors/abi.js:101:    constructor(errorName, { docsPath }) {
node_modules/viem/_esm/errors/abi.js:103:            `Arguments (\`args\`) were provided to "${errorName}", but "${errorName}" on the ABI does not contain any parameters (\`inputs\`).`,
node_modules/viem/_esm/errors/abi.js:113:    constructor(errorName, { docsPath } = {}) {
node_modules/viem/_esm/errors/abi.js:115:            `Error ${errorName ? `"${errorName}" ` : ''}not found on ABI.`,
node_modules/viem/_esm/op-stack/actions/getWithdrawalStatus.js:189:                error.cause.data?.errorName,
node_modules/viem/_esm/utils/ens/localBatchGatewayRequest.js:34:            errorName: 'HttpError',
node_modules/viem/_esm/utils/ens/localBatchGatewayRequest.js:39:        errorName: 'Error',
node_modules/viem/_esm/utils/ccipTunnel.js:40:                        if (res.errorName === 'HttpError') {
node_modules/viem/_esm/utils/ens/errors.js:12:    if (cause.data?.errorName === 'HttpError')
node_modules/viem/_esm/utils/ens/errors.js:14:    if (cause.data?.errorName === 'ResolverError')
node_modules/viem/_esm/utils/ens/errors.js:16:    if (cause.data?.errorName === 'ResolverNotContract')
node_modules/viem/_esm/utils/ens/errors.js:18:    if (cause.data?.errorName === 'ResolverNotFound')
node_modules/viem/_esm/utils/ens/errors.js:20:    if (cause.data?.errorName === 'ReverseAddressMismatch')
node_modules/viem/_esm/utils/ens/errors.js:22:    if (cause.data?.errorName === 'UnsupportedResolverProfile')
node_modules/viem/_esm/utils/abi/decodeErrorResult.js:24:        errorName: abiItem.name,
node_modules/viem/_esm/utils/abi/encodeErrorResult.js:9:    const { abi, errorName, args } = parameters;

exec
/bin/bash -lc "sed -n '171,245p' node_modules/viem/errors/contract.ts
sed -n '60,105p' node_modules/viem/utils/abi/decodeErrorResult.ts
rg -n \"new ContractFunctionRevertedError|getContractError\" node_modules/viem -g '*.ts' | head -30" in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 0ms:
export class ContractFunctionRevertedError extends BaseError {
  data?: DecodeErrorResultReturnType | undefined
  raw?: Hex | undefined
  reason?: string | undefined
  signature?: Hex | undefined

  constructor({
    abi,
    data,
    functionName,
    message,
    cause: error,
  }: {
    abi: Abi
    data?: Hex | undefined
    functionName: string
    message?: string | undefined
    cause?: BaseError | Error | undefined
  }) {
    let cause: Error | undefined
    let decodedData: DecodeErrorResultReturnType | undefined
    let metaMessages: string[] | undefined
    let reason: string | undefined
    if (data && data !== '0x') {
      try {
        decodedData = decodeErrorResult({ abi, data, cause: error })
        const { abiItem, errorName, args: errorArgs } = decodedData
        if (errorName === 'Error') {
          reason = (errorArgs as [string])[0]
        } else if (errorName === 'Panic') {
          const [firstArg] = errorArgs as [number]
          reason = panicReasons[firstArg as keyof typeof panicReasons]
        } else {
          const errorWithParams = abiItem
            ? formatAbiItem(abiItem, { includeName: true })
            : undefined
          const formattedArgs =
            abiItem && errorArgs
              ? formatAbiItemWithArgs({
                  abiItem,
                  args: errorArgs,
                  includeFunctionName: false,
                  includeName: false,
                })
              : undefined

          metaMessages = [
            errorWithParams ? `Error: ${errorWithParams}` : '',
            formattedArgs && formattedArgs !== '()'
              ? `       ${[...Array(errorName?.length ?? 0).keys()]
                  .map(() => ' ')
                  .join('')}${formattedArgs}`
              : '',
          ]
        }
      } catch (err) {
        cause = err as Error
      }
    } else if (message) reason = message

    let signature: Hex | undefined
    if (cause instanceof AbiErrorSignatureNotFoundError) {
      signature = cause.signature
      metaMessages = [
        `Unable to decode signature "${signature}" as it was not found on the provided ABI.`,
        'Make sure you are using the correct ABI and that the error exists on it.',
        `You can look up the decoded signature here: https://4byte.sourcify.dev/?q=${signature}.`,
      ]
    }

    super(
      (reason && reason !== 'execution reverted') || signature
        ? [
            `The contract function "${functionName}" reverted with the following ${
              signature ? 'signature' : 'reason'
  | AbiErrorSignatureNotFoundErrorType
  | DecodeAbiParametersErrorType
  | FormatAbiItemErrorType
  | ToFunctionSelectorErrorType
  | ErrorType

export function decodeErrorResult<const abi extends Abi | readonly unknown[]>(
  parameters: DecodeErrorResultParameters<abi>,
): DecodeErrorResultReturnType<abi> {
  const { abi, data, cause } = parameters as DecodeErrorResultParameters

  const signature = slice(data, 0, 4)
  if (signature === '0x') throw new AbiDecodingZeroDataError({ cause })

  const abi_ = [...(abi || []), solidityError, solidityPanic]
  const abiItem = abi_.find(
    (x) =>
      x.type === 'error' && signature === toFunctionSelector(formatAbiItem(x)),
  )
  if (!abiItem)
    throw new AbiErrorSignatureNotFoundError(signature, {
      docsPath: '/docs/contract/decodeErrorResult',
      cause,
    })
  return {
    abiItem,
    args:
      'inputs' in abiItem && abiItem.inputs && abiItem.inputs.length > 0
        ? decodeAbiParameters(abiItem.inputs, slice(data, 4))
        : undefined,
    errorName: (abiItem as { name: string }).name,
  } as DecodeErrorResultReturnType<abi>
}
node_modules/viem/index.ts:1643:  getContractError,
node_modules/viem/index.ts:1644:} from './utils/errors/getContractError.js'
node_modules/viem/_types/index.d.ts:253:export { type GetContractErrorReturnType, getContractError, } from './utils/errors/getContractError.js';
node_modules/viem/utils/errors/getContractError.ts:30:export function getContractError<err extends ErrorType<string>>(
node_modules/viem/utils/errors/getContractError.ts:68:      return new ContractFunctionRevertedError({
node_modules/viem/experimental/erc7821/utils/getExecuteError.ts:10:  getContractError,
node_modules/viem/experimental/erc7821/utils/getExecuteError.ts:11:} from '../../../utils/errors/getContractError.js'
node_modules/viem/experimental/erc7821/utils/getExecuteError.ts:59:    return getContractError(error as BaseError, {
node_modules/viem/tempo/actions/simulate.ts:40:import { getContractError } from '../../utils/errors/getContractError.js'
node_modules/viem/tempo/actions/simulate.ts:220:            return getContractError(error, {
node_modules/viem/_types/experimental/erc7821/utils/getExecuteError.d.ts:4:import { type GetContractErrorReturnType } from '../../../utils/errors/getContractError.js';
node_modules/viem/utils/index.ts:303:  getContractError,
node_modules/viem/utils/index.ts:304:} from './errors/getContractError.js'
node_modules/viem/_types/utils/index.d.ts:52:export { type GetContractErrorReturnType, getContractError, } from './errors/getContractError.js';
node_modules/viem/_types/utils/errors/getContractError.d.ts:7:export declare function getContractError<err extends ErrorType<string>>(err: err, { abi, address, args, docsPath, functionName, sender, }: {
node_modules/viem/_types/utils/errors/getContractError.d.ts:15://# sourceMappingURL=getContractError.d.ts.map
node_modules/viem/op-stack/actions/estimateContractTotalGas.ts:26:  getContractError,
node_modules/viem/op-stack/actions/estimateContractTotalGas.ts:27:} from '../../utils/errors/getContractError.js'
node_modules/viem/op-stack/actions/estimateContractTotalGas.ts:135:    throw getContractError(error as BaseError, {
node_modules/viem/op-stack/actions/estimateContractTotalFee.ts:26:  getContractError,
node_modules/viem/op-stack/actions/estimateContractTotalFee.ts:27:} from '../../utils/errors/getContractError.js'
node_modules/viem/op-stack/actions/estimateContractTotalFee.ts:135:    throw getContractError(error as BaseError, {
node_modules/viem/op-stack/actions/estimateContractL1Gas.ts:26:  getContractError,
node_modules/viem/op-stack/actions/estimateContractL1Gas.ts:27:} from '../../utils/errors/getContractError.js'
node_modules/viem/op-stack/actions/estimateContractL1Gas.ts:133:    throw getContractError(error as BaseError, {
node_modules/viem/op-stack/actions/estimateContractL1Fee.ts:26:  getContractError,
node_modules/viem/op-stack/actions/estimateContractL1Fee.ts:27:} from '../../utils/errors/getContractError.js'
node_modules/viem/op-stack/actions/estimateContractL1Fee.ts:133:    throw getContractError(error as BaseError, {
node_modules/viem/_types/op-stack/actions/estimateContractTotalGas.d.ts:10:import { type GetContractErrorReturnType } from '../../utils/errors/getContractError.js';
node_modules/viem/_types/op-stack/actions/estimateContractTotalFee.d.ts:10:import { type GetContractErrorReturnType } from '../../utils/errors/getContractError.js';

exec
/bin/bash -lc "node --input-type=module - <<'NODE'
import { ContractFunctionRevertedError, encodeErrorResult } from 'viem';
import { METAGOV_ABI } from './src/abi.js';
const full = [{ type: 'error', name: 'RegistrationTooRecent', inputs: [] }];
const raw = encodeErrorResult({ abi: full, errorName: 'RegistrationTooRecent' });
const e = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: raw, functionName: 'castSnapshotVotes' });
console.log({ raw, data: e.data, signature: e.signature, cause: e.cause?.name });
NODE" in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 267ms:
{
  raw: '0x33ab63b9',
  data: undefined,
  signature: '0x33ab63b9',
  cause: 'AbiErrorSignatureNotFoundError'
}

指定テストは成功しました。コード追跡と実行結果を統合し、最終監査所見を確定しました。
  ✓ 第13回監査と commit 1be9d16 の差分を確認する
  ✓ 6検証項目を関連コード・RUNBOOK・テストまで追跡する
  ✓ relayer-cf で npm test を実行し結果を評価する
  ✓ 重大度順の日本語監査結果をまとめる
codex
## 結論

前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。

ただし、コード面の最終確認としては Medium 相当の未解消点が4点あります。特に `RegistrationTooRecent` の二重防御は ABI 不足により機能していません。明日の E2E 前に少なくとも ABI と RUNBOOK コマンドは修正を推奨します。

### [Medium] RegistrationTooRecent の二重防御が機能しない

該当箇所: [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:2)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:249)

何が起きるか: `METAGOV_ABI` には `type: "error"` が1件もなく、`RegistrationTooRecent` もありません。viem は渡された ABI から custom error を復号するため、現在の ABI では `ContractFunctionRevertedError.data` が `undefined` になり、`revertErrorName()` は `null` を返します。

実際に現 ABI と selector `0x33ab63b9` で viem のエラーを構築すると、以下になりました。

```text
data: undefined
signature: 0x33ab63b9
cause: AbiErrorSignatureNotFoundError
```

通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。

推奨する修正: 少なくとも次を `METAGOV_ABI` に追加してください。

```js
{
  type: "error",
  name: "RegistrationTooRecent",
  inputs: [],
}
```

一括・個別 simulate の両方について、実際の `ContractFunctionRevertedError` を構築して `snapdrop` が増えないテストも追加すべきです。

### [Medium] eligibleAt が deadline 以降でも専用警告が出ない

該当箇所: [chain.js](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:75)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:511)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:529)

何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。

```text
snapEnd は十分早い
eligibleAt >= deadline
```

この場合、告知は出ますが投函可能なブロックが一度もなく、deadline 到達後は `maybeExecute()` に進みます。専用の警告はありません。

`create-and-register` が新規作成する通常経路では Snapshot が48時間続くため、残り24時間未満なら多くの場合 timeline 検査にも捕まります。ただし、ロジックとしては保証されていません。

推奨する修正: mainnet では最低でも `eligibleAt < deadline` を要求し、さらに排出時間を含めて `eligibleAt + requiredDrainBlocks < deadline` を検査してください。不成立なら告知・投函・execute を止め、明示的な警告を出すべきです。

### [Medium] deploy/check-deploy の margin・4者分離検証が未完

該当箇所: [deploy-snapvoter.js](/mnt/data/pnouns-voter/scripts/mainnet/deploy-snapvoter.js:14)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:64)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:66)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:101)

何が起きるか:

- `MARGIN` は整数・下限・上限を検証していません。`0` や過大値がそのままデプロイ可能です。
- `check-deploy` の `EXPECT_MARGIN` は任意なので、誤った margin でも成功します。
- 前回要求された Snapshot bot を含む4者分離に対し、`EXPECT_BOT` は任意です。未指定なら owner/registrar/relayer の3者だけで成功します。
- コメントの「必須値に fallback なし」と異なり、`REG_DELAY` と `MARGIN` には既定値があります。

`EXPECT_OWNER`、`EXPECT_REGISTRAR`、`EXPECT_EXCLUDED`、worker以降の `EXPECT_RELAYER`、delegated以降の `EXPECT_DELEGATOR` は、未指定時に確実に失敗します。ここに skip 経路はありません。

推奨する修正: mainnet では `EXPECT_MARGIN` と `EXPECT_BOT` も必須化し、デプロイスクリプト側でも `MARGIN` を整数かつ運用上許容する範囲に限定してください。アドレスについても `ethers.getAddress()` とゼロアドレス拒否を入れるのが安全です。

### [Medium] RUNBOOK の `$ENV` コマンドはそのままでは実行できない

該当箇所: [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)

何が起きるか:

```bash
ENV="NETWORK=mainnet EXPECT_OWNER=..."
$ENV node scripts/check-deploy.mjs --stage deployed
```

Bash は変数展開後の `NETWORK=mainnet` を環境変数代入ではなくコマンド名として扱うため、`NETWORK=mainnet: command not found` になります。

推奨する修正:

```bash
env $ENV node scripts/check-deploy.mjs --stage deployed
```

または各コマンドに環境変数を直接前置してください。

## 問題なしと判断した項目

- [問題なし] 猶予ゲートの境界  
  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:534) の条件は `block < eligibleAt` の間だけ停止します。コントラクトも [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258) で同じ条件を使うため、`block == eligibleAt` では直ちに投函でき、1 tick の無駄 revert はありません。`eligibleAt=0` でも停止しません。

- [問題なし] create-and-register preflight  
  [create-and-register.mjs](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) はコード存在、`registrar()`/`owner()`、未登録を Snapshot 送信前に確認しています。owner による登録はコントラクト上の正常系なので、registrar と owner のいずれかなら許可する判定も正しいです。`--dry-run` は line 52 で先に return するため、新しい RPC preflight の影響を受けません。

- [問題なし] deploy の読み戻し・既存 snapVoter 保護  
  既存出力に `snapVoter` があれば `FORCE=1` なしでは停止します。デプロイ後の owner、registrar、delay、margin、liveMode、excluded の読み戻しも実施されています。`OUT` は既存JSONの他フィールドを維持したまま `snapVoter` 関連だけ更新します。

- [問題なし] hardhat mainnet 追加  
  既存の sepolia/hardhat 設定を変更しておらず、mainnet ネットワークを選択しない既存コマンドへの影響はありません。

- [問題なし] stage 分割の基本構造  
  deployed → worker → funded → delegated → live の要求はRUNBOOKの状態遷移と整合しています。live未満で `liveMode=false`、liveで `true` を要求し、委任照会例外も失敗扱いです。

- [問題なし] pendingnotes の id 重複排除  
  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22) で同一tx idの再追加を防ぎ、flush時も同一idを1回だけ扱います。`id=null` は従来どおり各通知を独立して処理するため、既存経路への悪影響はありません。並行tickや通知成功後の通信切断など、前回の accepted risk は残ります。

### [Low] 新テストは回帰防止として不十分な部分がある

該当箇所: [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:215)

猶予テストのケースAは「投函処理に入らない」ことを確認できています。ただし実際の票データは用意されておらず、「票が存在しても保持される」ことまでは検証していません。

ケースBが保証するのは votes GraphQL クエリへ到達したことだけです。返却値が空なので、以下は通っていません。

- envelope取得
- `simulateContract`
- `estimateContractGas`
- `writeContract`
- `snapsent` 保存
- `RegistrationTooRecent` の transient 判定
- `eligibleAt=0` と `block==eligibleAt` の境界

GraphQL `errors` テストはfail-closedを適切に確認しています。pendingnotesテストも「失敗時に保存し、次tickで再送・削除」は確認していますが、新規追加された同一id重複排除そのものは未テストです。

推奨する修正: 票1件を返す mock と wallet `writeContract` を追加し、`eligibleAt-1`、`eligibleAt`、`0`、復号可能な `RegistrationTooRecent` の4ケースを直接通してください。

## テスト結果

`relayer-cf` で指定どおり実行しました。

```text
npm test
tests 4
pass 4
fail 0
duration 882ms
```

Node v24 の親ランナー表示では4テストファイル単位ですが、ソース上は合計38件です。追加で `worker-tick.test.mjs` を直接実行し、内部12シナリオすべて成功することも確認しました。

```text
tests 12
pass 12
fail 0
```

最終判断は「前回 High の主ゲートは修正済み。ただし ABI 不足、deadline/eligibleAt 検査、mainnet照合の必須値、RUNBOOKコマンドに修正が必要」です。
tokens used
122,435
## 結論

前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。

ただし、コード面の最終確認としては Medium 相当の未解消点が4点あります。特に `RegistrationTooRecent` の二重防御は ABI 不足により機能していません。明日の E2E 前に少なくとも ABI と RUNBOOK コマンドは修正を推奨します。

### [Medium] RegistrationTooRecent の二重防御が機能しない

該当箇所: [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:2)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:249)

何が起きるか: `METAGOV_ABI` には `type: "error"` が1件もなく、`RegistrationTooRecent` もありません。viem は渡された ABI から custom error を復号するため、現在の ABI では `ContractFunctionRevertedError.data` が `undefined` になり、`revertErrorName()` は `null` を返します。

実際に現 ABI と selector `0x33ab63b9` で viem のエラーを構築すると、以下になりました。

```text
data: undefined
signature: 0x33ab63b9
cause: AbiErrorSignatureNotFoundError
```

通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。

推奨する修正: 少なくとも次を `METAGOV_ABI` に追加してください。

```js
{
  type: "error",
  name: "RegistrationTooRecent",
  inputs: [],
}
```

一括・個別 simulate の両方について、実際の `ContractFunctionRevertedError` を構築して `snapdrop` が増えないテストも追加すべきです。

### [Medium] eligibleAt が deadline 以降でも専用警告が出ない

該当箇所: [chain.js](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:75)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:511)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:529)

何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。

```text
snapEnd は十分早い
eligibleAt >= deadline
```

この場合、告知は出ますが投函可能なブロックが一度もなく、deadline 到達後は `maybeExecute()` に進みます。専用の警告はありません。

`create-and-register` が新規作成する通常経路では Snapshot が48時間続くため、残り24時間未満なら多くの場合 timeline 検査にも捕まります。ただし、ロジックとしては保証されていません。

推奨する修正: mainnet では最低でも `eligibleAt < deadline` を要求し、さらに排出時間を含めて `eligibleAt + requiredDrainBlocks < deadline` を検査してください。不成立なら告知・投函・execute を止め、明示的な警告を出すべきです。

### [Medium] deploy/check-deploy の margin・4者分離検証が未完

該当箇所: [deploy-snapvoter.js](/mnt/data/pnouns-voter/scripts/mainnet/deploy-snapvoter.js:14)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:64)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:66)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:101)

何が起きるか:

- `MARGIN` は整数・下限・上限を検証していません。`0` や過大値がそのままデプロイ可能です。
- `check-deploy` の `EXPECT_MARGIN` は任意なので、誤った margin でも成功します。
- 前回要求された Snapshot bot を含む4者分離に対し、`EXPECT_BOT` は任意です。未指定なら owner/registrar/relayer の3者だけで成功します。
- コメントの「必須値に fallback なし」と異なり、`REG_DELAY` と `MARGIN` には既定値があります。

`EXPECT_OWNER`、`EXPECT_REGISTRAR`、`EXPECT_EXCLUDED`、worker以降の `EXPECT_RELAYER`、delegated以降の `EXPECT_DELEGATOR` は、未指定時に確実に失敗します。ここに skip 経路はありません。

推奨する修正: mainnet では `EXPECT_MARGIN` と `EXPECT_BOT` も必須化し、デプロイスクリプト側でも `MARGIN` を整数かつ運用上許容する範囲に限定してください。アドレスについても `ethers.getAddress()` とゼロアドレス拒否を入れるのが安全です。

### [Medium] RUNBOOK の `$ENV` コマンドはそのままでは実行できない

該当箇所: [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)

何が起きるか:

```bash
ENV="NETWORK=mainnet EXPECT_OWNER=..."
$ENV node scripts/check-deploy.mjs --stage deployed
```

Bash は変数展開後の `NETWORK=mainnet` を環境変数代入ではなくコマンド名として扱うため、`NETWORK=mainnet: command not found` になります。

推奨する修正:

```bash
env $ENV node scripts/check-deploy.mjs --stage deployed
```

または各コマンドに環境変数を直接前置してください。

## 問題なしと判断した項目

- [問題なし] 猶予ゲートの境界  
  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:534) の条件は `block < eligibleAt` の間だけ停止します。コントラクトも [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258) で同じ条件を使うため、`block == eligibleAt` では直ちに投函でき、1 tick の無駄 revert はありません。`eligibleAt=0` でも停止しません。

- [問題なし] create-and-register preflight  
  [create-and-register.mjs](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) はコード存在、`registrar()`/`owner()`、未登録を Snapshot 送信前に確認しています。owner による登録はコントラクト上の正常系なので、registrar と owner のいずれかなら許可する判定も正しいです。`--dry-run` は line 52 で先に return するため、新しい RPC preflight の影響を受けません。

- [問題なし] deploy の読み戻し・既存 snapVoter 保護  
  既存出力に `snapVoter` があれば `FORCE=1` なしでは停止します。デプロイ後の owner、registrar、delay、margin、liveMode、excluded の読み戻しも実施されています。`OUT` は既存JSONの他フィールドを維持したまま `snapVoter` 関連だけ更新します。

- [問題なし] hardhat mainnet 追加  
  既存の sepolia/hardhat 設定を変更しておらず、mainnet ネットワークを選択しない既存コマンドへの影響はありません。

- [問題なし] stage 分割の基本構造  
  deployed → worker → funded → delegated → live の要求はRUNBOOKの状態遷移と整合しています。live未満で `liveMode=false`、liveで `true` を要求し、委任照会例外も失敗扱いです。

- [問題なし] pendingnotes の id 重複排除  
  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22) で同一tx idの再追加を防ぎ、flush時も同一idを1回だけ扱います。`id=null` は従来どおり各通知を独立して処理するため、既存経路への悪影響はありません。並行tickや通知成功後の通信切断など、前回の accepted risk は残ります。

### [Low] 新テストは回帰防止として不十分な部分がある

該当箇所: [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:215)

猶予テストのケースAは「投函処理に入らない」ことを確認できています。ただし実際の票データは用意されておらず、「票が存在しても保持される」ことまでは検証していません。

ケースBが保証するのは votes GraphQL クエリへ到達したことだけです。返却値が空なので、以下は通っていません。

- envelope取得
- `simulateContract`
- `estimateContractGas`
- `writeContract`
- `snapsent` 保存
- `RegistrationTooRecent` の transient 判定
- `eligibleAt=0` と `block==eligibleAt` の境界

GraphQL `errors` テストはfail-closedを適切に確認しています。pendingnotesテストも「失敗時に保存し、次tickで再送・削除」は確認していますが、新規追加された同一id重複排除そのものは未テストです。

推奨する修正: 票1件を返す mock と wallet `writeContract` を追加し、`eligibleAt-1`、`eligibleAt`、`0`、復号可能な `RegistrationTooRecent` の4ケースを直接通してください。

## テスト結果

`relayer-cf` で指定どおり実行しました。

```text
npm test
tests 4
pass 4
fail 0
duration 882ms
```

Node v24 の親ランナー表示では4テストファイル単位ですが、ソース上は合計38件です。追加で `worker-tick.test.mjs` を直接実行し、内部12シナリオすべて成功することも確認しました。

```text
tests 12
pass 12
fail 0
```

最終判断は「前回 High の主ゲートは修正済み。ただし ABI 不足、deadline/eligibleAt 検査、mainnet照合の必須値、RUNBOOKコマンドに修正が必要」です。
