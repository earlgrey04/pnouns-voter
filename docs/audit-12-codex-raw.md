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
session id: 01a01f45-6620-79c2-81b5-4d4f0cb03894
--------
user
# 監査依頼 (第12回) — 第11回指摘への修正の検証

あなたは pNouns Voter の第三者監査者です。第11回監査 (あなたの前回の指摘。
`docs/AUDIT-RESPONSE-2026-08-18.md` 末尾の表と `docs/audit-11-codex-raw.md`) を受けて
修正を行いました。**対象コミットは 3ca7528 のみ**です (`git show 3ca7528`)。
コントラクトは無変更で、リレイヤー (relayer-cf) とスクリプトの修正です。

リポジトリ: `/mnt/data/pnouns-voter` (読み取りのみ。**ファイルを変更しないこと**)
オンチェーン確認は不要です (前回あなたが算出した期待 runtime hash
0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327 は、
こちらで eth_getCode と照合して完全一致を確認済み)。今回は**ソースの検証に集中**してください。

## 修正の主張 (これが本当か検証すること)

### 1. [前回 High] 提案単位の fail-closed
- `relayer-cf/src/snap.js` の `resolveMappings()` が `{ mappings, unresolved }` を返す。
  `unresolved` は「オンチェーンに対応表 (nounsToSnap != 0) があるのに、ハブから
  当該 Snapshot 提案を特定できなかった」Nouns 提案 ID の配列。
- `relayer-cf/src/worker.js` の提案ループで、`snapInfo` が無く `unresolvedIds` に
  含まれる提案は、警告 (unresolved フラグ・7日 TTL) を出して `continue`。
- さらに Snapshot モード (`c.snapshotSpace` 設定時) では、`maybeExecute()` を
  `snapInfo` が取れた提案に限定した。

**検証観点**:
a. `unresolved` の判定は正確か。「最初の 20 件クエリで見つかった提案」「逆引きで
   見つかった提案」「そもそも未登録の提案」「登録済みだが未発見の提案」の 4 分類が
   漏れなく正しい経路に落ちるか。特に最初の 20 件で snapToNouns がヒットした場合は
   unresolved に入らないことをコードで追うこと。
b. まだ残っている fail-open 経路はないか。例:
   - active (state 0/1) でない提案 (締切直後で state が変わった提案) は
     activeNounsIds に入らず逆引きされないが、その提案が execute 対象になる経路は?
   - `maybeExecute()` を snapInfo 条件で縛ったことで、逆に「締切後は state が
     変わって resolveMappings の逆引き対象から外れ → snapInfo が永遠に取れず →
     execute されない」という自己 DoS (投票の取りこぼし) にならないか。
     recentProposals() がどの state の提案を返すか、maybeExecute() が呼ばれる条件と
     合わせて具体的に追うこと。**これが今回いちばん確認してほしい点。**
   - execute 済みフラグ・"no votes" 記録の書き込み条件に変化はないか
c. unresolved 警告の KV write が無料枠を圧迫しないか (フラグ TTL 7日、送信成功時のみ)

### 2. [前回 Medium] URL 末尾処理の回帰修正
`relayer-cf/src/snap.js` の `referencesNounsProposal()`:
- URL 候補の正規表現から `)` `]` を除外文字から外し、末尾の句読点・閉じ括弧・
  非 ASCII を 2 段階の replace で除去してから `new URL()`。
**検証観点**: この末尾除去が新たな誤検出を生まないか。例:
- `https://nouns.wtf/vote/989abc` (パスに英字が続く) はどうなるか
- `https://nouns.wtf/vote/989%20foo` などエンコード済み文字
- 除去正規表現 `[)\]}>,.;:!?、。」』】）〕｝＞…]+$` と `[^!-~]+$` の
  順序・相互作用で、除去しすぎ (ID の数字まで削る等) は起きないか
- `(` で始まり `)` を含む Markdown `[t](url)` で URL に `)` が入り込まないか
- テスト `relayer-cf/test/link-check.test.mjs` の 25 ケースで十分か。
  不足ケースがあれば具体的な入力文字列で示すこと

### 3. [前回 Medium] mainnet 猶予下限の毎 tick 確認 + 絶対下限 300
`relayer-cf/src/worker.js`: mainnet では毎 tick、`Math.max(300, c.minRegistrationDelay)` と比較。
**検証観点**: spaceCheckedAt の更新タイミングと mainnet 分岐の関係。テストネットの
30 分キャッシュに退行はないか。毎 tick 化による RPC 呼び出し増 (multicall 1 回/分) の影響。

### 4. [前回 Medium] 3 者分離ガード
- `relayer-cf/src/worker.js`: mainnet で owner/registrar/relayer に同一アドレスが
  含まれると notifyError → return (fail-closed)。ABI に owner/registrar/eligibleAtBlock を追加。
- `scripts/create-and-register.mjs`: mainnet で REGISTRAR_MNEMONIC 未設定なら throw。
**検証観点**:
- Worker 側: relayerAddr が null (RELAYER_PRIVE_KEY 未設定 = 読み取り専用モード) の
  とき誤って停止しないか。同一判定のロジック (Set サイズ比較) は正しいか。
- スクリプト側: `MAINNET_PROPOSER_MNEMONIC` との比較は意味を成しているか
  (この環境変数は他の場所で定義・使用されているか。未定義なら undefined === undefined で
  常に throw しないか、逆に比較が無意味になっていないか)。**ここは私が急いで書いたので
  特に疑ってかかること。**
- ABI 追加分 (owner/registrar/eligibleAtBlock) の型・シグネチャはコントラクトと一致するか。

### 5. [前回 Low] 通知フラグを送信成功後に
`notified:tx` (2 箇所)・残高警告 `lowpool` 等・告知済みレコードを、`notify()` が
true を返した後にだけ保存するよう変更。
**検証観点**: 送信失敗が続いた場合の再送ループで、同一 tick 内・複数 tick 間の
重複送信リスクはどの程度か (KV の結果整合性も考慮)。告知 (`announceNew`) は
送信失敗時に putAnnounced されないが、"late" 判定など他の書き込み経路と矛盾しないか。

## 出力形式
日本語。指摘ごとに **[重大度 High/Medium/Low/Info] / 該当箇所 (file:line) / 何が起きるか /
推奨する修正**。「問題なし」も根拠つきで明示。憶測ではなく必ずコードを読むこと。
`relayer-cf` で `npm test` を実行し、結果を報告に含めること。
codex
対象コミット `3ca7528` の差分と前後の呼び出し経路を追い、指定された各分類・境界条件をコード上で検証します。あわせて `relayer-cf` のテストを実行し、変更は一切行いません。
  → 対象コミットの差分・監査資料・関連コントラクトABIを確認する
  • 5項目の制御フローと境界条件を行番号付きで検証する
  • relayer-cf で npm test を実行する
  • 重大度別の監査報告をまとめる
exec
/bin/bash -lc 'git status --short && git show --stat --oneline --decorate --no-renames 3ca7528 && git show --format=fuller --no-ext-diff --no-renames 3ca7528 -- docs/AUDIT-RESPONSE-2026-08-18.md relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs scripts/create-and-register.mjs' in /mnt/data/pnouns-voter
 succeeded in 0ms:
3ca7528 (HEAD -> main) 第11回監査(Codex)対応: 提案単位の fail-closed ほか
 docs/AUDIT-RESPONSE-2026-08-18.md   |   42 +
 docs/audit-11-codex-raw.md          | 5400 +++++++++++++++++++++++++++++++++++
 relayer-cf/src/abi.js               |   21 +
 relayer-cf/src/snap.js              |   12 +-
 relayer-cf/src/worker.js            |   57 +-
 relayer-cf/test/link-check.test.mjs |   23 +
 scripts/create-and-register.mjs     |    7 +-
 test/snap.fork.test.js              |   16 +
 8 files changed, 5559 insertions(+), 19 deletions(-)
commit 3ca75280010d87679fdbed42513ada4caecf8c90
Author:     earlgrey <[redacted-email]>
AuthorDate: Thu Aug 20 22:02:06 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Thu Aug 20 22:02:06 2026 +0900

    第11回監査(Codex)対応: 提案単位の fail-closed ほか
    
    High:
    - fail-closed が「ハブ例外」しか止めていなかった。ハブが正常に 0 件を
      返した場合や、登録済みなのに取得範囲外で Snapshot 提案を特定できない
      場合、snapInfo=null のまま締切後 maybeExecute() に到達し、部分集計や
      "no votes" が確定しうる。resolveMappings() が「登録済みだが未解決」の
      Nouns ID を返すようにし、該当提案は告知・投函・execute をすべて停止。
      Snapshot モードでは対応付けの取れた提案のみ execute 対象にした
    
    Medium:
    - URL 解析化で「末尾の句読点」「直後の日本語」の検出が回帰していた。
      URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析するよう修正
    - mainnet の登録猶予下限を毎 tick 確認に変更し、コード上の絶対下限 300 を併用
    - mainnet で REGISTRAR_MNEMONIC 未設定の fallback を禁止。owner/registrar/
      relayer が同一アドレスなら Worker を fail-closed に(ABI に owner/registrar/
      eligibleAtBlock を追加)
    
    Low:
    - 告知済みレコード・notified:tx・残高警告フラグを、Discord 送信成功後に立てる
    
    テスト: relayer 25 pass / contracts 19 pass。URL 検出 9 ケースと再登録の
    境界テストを追加。コントラクトは無変更のため再デプロイ不要(Worker のみ更新)。
    
    未着手(docs/AUDIT-RESPONSE に記載): Worker レベルの状態遷移テスト、
    本番構成 runbook と 3 者分離リハーサル。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/docs/AUDIT-RESPONSE-2026-08-18.md b/docs/AUDIT-RESPONSE-2026-08-18.md
index 121e49c..6f8a710 100644
--- a/docs/AUDIT-RESPONSE-2026-08-18.md
+++ b/docs/AUDIT-RESPONSE-2026-08-18.md
@@ -150,3 +150,45 @@ Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッ
 問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
 
 **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
+
+---
+
+## 第11回監査 (2026-08-20, Codex CLI / read-only) — Sepolia 再デプロイの実地検証
+
+対象: 第10回対応 (75025cc) と Sepolia 再デプロイ (e11b170)。生ログ: `docs/audit-11-codex-raw.md`
+※ Codex のサンドボックスは RPC に到達できず、B 項目 (オンチェーン) は Codex 側「未確認」。
+　こちらで実測した結果を下表に併記する。
+
+| # | 重大度 | 指摘 | 対応 |
+|---|---|---|---|
+| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
+| 2 | Info | 自己申告 URL の限界と取消条件の資料修正は妥当。コードと主張が一致 | 対応不要 |
+| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
+| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
+| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
+| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
+| 8 | Info | `InvalidSpace` の 1〜64 bytes は妥当 | 対応不要 |
+| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
+
+### B. デプロイ確認 (Codex は未確認 → こちらで実測)
+
+| 項目 | 実測値 | 判定 |
+|---|---|---|
+| `keccak256(eth_getCode)` | `0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327` | Codex がソースから独立に算出した期待値と**完全一致** |
+| runtime サイズ | 14,780 bytes | 期待どおり |
+| `space` / `spaceHash` | `earl-grey.eth` / `0x069910a7…2730` | keccak256(space) と一致。Codex の期待値とも一致 |
+| `registrationDelayBlocks` / `marginBlocks` | 5 / 5 | 意図どおり |
+| `liveMode` / `refundEnabled` | true / true | 意図どおり |
+| `owner` / `registrar` | ともに `0x10849D31…8925` | テストネットは意図的に同一 |
+| 新コントラクト残高 | 0.02 ETH | 意図どおり |
+| 旧コントラクト残高 | 0 ETH | 回収済み |
+| Nouns 委任 | delegator → 新アドレス。新 2 票 / 旧 0 票 | 移行済み |
+| トレジャリー `excluded` | true | 意図どおり |
+| Worker `/api/config` | network=sepolia, metagov=`0x64CdACe…693F` | 稼働中 Worker も新アドレス |
+
+### 残課題 (mainnet 移行の前提)
+
+- Worker レベルの状態遷移テスト (指摘 7)
+- 本番構成 runbook と 3 者分離のリハーサル (指摘 14)
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 6bb6c40..d19cb3a 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -50,9 +50,12 @@ export function referencesNounsProposal(text, nounsId) {
   if (!Number.isSafeInteger(id) || id <= 0) return false;
   const s = String(text || "");
   if (!s) return false;
-  for (const raw of s.match(/https?:\/\/[^\s<>"'`)\]]+/gi) || []) {
+  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
+    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
+    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
+    const trimmed = raw.replace(/[)\]}>,.;:!?、。」』】）〕｝＞…]+$/u, "").replace(/[^\u0021-\u007e]+$/u, "");
     let u;
-    try { u = new URL(raw); } catch { continue; }
+    try { u = new URL(trimmed); } catch { continue; }
     if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
     if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
   }
@@ -72,6 +75,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
   }
   // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
+  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
   const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
   if (missing.length) {
     const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
@@ -84,7 +88,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
       for (const n of need) {
         const p = byHash.get(n.hash);
         if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
-        else console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`);
+        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
       }
     }
   }
@@ -97,7 +101,7 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
     const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   });
-  return { mappings };
+  return { mappings, unresolved };
 }
 
 /// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index f6bbb14..49d4856 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -35,14 +35,15 @@ async function announceNew(c, pc, store, p, block, snapInfo) {
     if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
     const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
     const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
-    await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
-    await notify(c, [
+    const lines = [
       `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
       `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
       `締切: ${jst} ごろ (block ${mg.deadline})`,
       `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
       `提案の内容: https://nouns.wtf/vote/${p.id}`,
-    ].join("\n"));
+    ];
+    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
+    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
     return;
   }
   const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
@@ -103,13 +104,13 @@ async function reconcileSent(c, pc, store, proposalId, summaries) {
     changed = true;
     if (rc && rc.status === "success") {
       if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
-      await store.setFlag(`notified:${tx}`, 86400);
       const mg = await metagovInfo(c, pc, proposalId);
-      await notify(c, [
+      const sent = await notify(c, [
         `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
         `tx: ${explorerTx(c, tx)}`,
       ].join("\n"));
+      if (sent) await store.setFlag(`notified:${tx}`, 86400);
     } else {
       console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
     }
@@ -138,13 +139,13 @@ async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
     await store.kvRaw.delete(sentK);
     // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
     if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
-      await store.setFlag(`notified:${pending.txs[0]}`, 86400);
       const mg = await metagovInfo(c, pc, nounsId);
-      await notify(c, [
+      const sent = await notify(c, [
         `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
         `tx: ${explorerTx(c, pending.txs[0])}`,
       ].join("\n"));
+      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
     }
     return;
   }
@@ -351,8 +352,8 @@ async function checkBalance(c, pc, wc, store) {
     const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
     if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
     if (await store.getFlag(ck.key)) continue;
-    await store.setFlag(ck.key, 86400);
-    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
+    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
+    if (sent) await store.setFlag(ck.key, 86400);
   }
 }
 
@@ -398,22 +399,36 @@ export async function tick(env) {
     await reconcileRecent(c, pc, wc, store, proposals);
     // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
     let snapByNouns = new Map();
+    let unresolvedIds = new Set();
     let mappingsResolved = false;
     if (c.snapshotSpace) {
       // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
-      if (Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
-        const [onchain, delay] = await pc.multicall({ contracts: [
+      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
+      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
+        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
           { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
           { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
+          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
+          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
         ], allowFailure: false });
+        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
+        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
+        if (c.network === "mainnet") {
+          const relayerAddr = wc?.account?.address || null;
+          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
+          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
+        }
         if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
-        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
+        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
+        const floor = Math.max(300, c.minRegistrationDelay);
+        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
         spaceCheckedAt = Date.now();
       }
       try {
         const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
-        const { mappings } = await resolveMappings(c, pc, active);
+        const { mappings, unresolved } = await resolveMappings(c, pc, active);
         snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
+        unresolvedIds = new Set((unresolved || []).map(Number));
         mappingsResolved = true;
       }
       catch (e) { await notifyError(c, "snapshot hub", e); }
@@ -427,6 +442,16 @@ export async function tick(env) {
       if (p.state !== 0 && p.state !== 1) continue;
       try {
         const snapInfo = snapByNouns.get(p.id) || null;
+        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
+        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
+        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
+        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
+          if (!(await store.getFlag(`unresolved:${p.id}`))) {
+            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
+            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
+          }
+          continue;
+        }
         const mg = await metagovInfo(c, pc, p.id);
         // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
         const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
@@ -461,7 +486,11 @@ export async function tick(env) {
             }
           }
           else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
-        } else await maybeExecute(c, pc, wc, store, p, block, mg);
+        } else if (!c.snapshotSpace || snapInfo) {
+          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
+          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
+          await maybeExecute(c, pc, wc, store, p, block, mg);
+        }
       } catch (e) {
         await notifyError(c, `worker prop ${p.id}`, e);
       }
diff --git a/relayer-cf/test/link-check.test.mjs b/relayer-cf/test/link-check.test.mjs
index 06933f3..4f7eddd 100644
--- a/relayer-cf/test/link-check.test.mjs
+++ b/relayer-cf/test/link-check.test.mjs
@@ -40,3 +40,26 @@ test("正規表現メタ文字を含む入力で壊れない", () => {
   assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
   assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
 });
+
+// 第11回監査 M-3: URL 解析化による検出回帰(末尾句読点・全角後置文字・Markdown)
+test("URL の直後に句読点や日本語が続いても検出する", () => {
+  assert.equal(ref("詳細は https://nouns.wtf/vote/989。", 989), true, "全角句点");
+  assert.equal(ref("詳細は https://nouns.wtf/vote/989.", 989), true, "半角ピリオド");
+  assert.equal(ref("https://nouns.wtf/vote/989, および他", 989), true, "カンマ");
+  assert.equal(ref("https://nouns.wtf/vote/989、他", 989), true, "読点");
+  assert.equal(ref("https://nouns.wtf/vote/989後に投票", 989), true, "直後に日本語");
+  assert.equal(ref("「https://nouns.wtf/vote/989」を参照", 989), true, "全角かぎ括弧で囲む");
+  assert.equal(ref("[議案](https://nouns.wtf/vote/989)", 989), true, "Markdown リンク");
+  assert.equal(ref("https://nouns.wtf/vote/989\n次の行", 989), true, "改行が続く");
+  assert.equal(ref("https://nouns.wtf/vote/989?tab=x。", 989), true, "クエリ + 句点");
+});
+
+test("末尾処理で別 ID に化けない", () => {
+  assert.equal(ref("https://nouns.wtf/vote/9890。", 989), false);
+  assert.equal(ref("https://nouns.wtf/vote/989。", 9890), false);
+  assert.equal(ref("https://evilnouns.wtf/vote/989。", 989), false, "末尾処理をしてもドメイン判定は維持");
+});
+
+test("改行で分断された URL は検出しない(仕様)", () => {
+  assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
+});
diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
index f0945a1..3ce4f6f 100644
--- a/scripts/create-and-register.mjs
+++ b/scripts/create-and-register.mjs
@@ -66,7 +66,12 @@ async function main() {
   const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
   const voter = dep.snapVoter || dep.voter;
   const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
-  const w = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
+  // 第11回監査 M-14: mainnet で registrar 用の鍵が未設定のまま提案作成鍵に fallback すると、
+  // 3 者分離したつもりで同一鍵に戻ってしまう。mainnet では明示指定を必須にする。
+  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
+  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
+  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
+  const w = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
   const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
   const c = new ethers.Contract(voter, abi, w);
   const tx = await c.registerProposal(receipt.id, nounsId);

codex
差分上では、最大の確認点は「締切後も `recentProposals()` の提案が state 0/1 のままループ対象になるのか」です。ここを `proposals()` の state 定義、`metagovInfo.deadline`、`maybeExecute()` の条件まで連結して確認しています。併せて registrar 鍵比較の環境変数が実在するかを全リポジトリ検索します。
exec
/bin/bash -lc "rg -n \"function recentProposals|recentProposals\\(|function maybeExecute|maybeExecute\\(|function metagovInfo|metagovInfo\\(|MAINNET_PROPOSER_MNEMONIC|REGISTRAR_MNEMONIC|eligibleAtBlock|function owner|function registrar|registrationDelayBlocks|function proposals|state ===|state "'!==" relayer-cf scripts contracts test hardhat.config.* .env.example README.md docs --glob '"'"'!docs/audit-11-codex-raw.md'"'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
test/snap.fork.test.js:70:      "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
test/snap.fork.test.js:73:    pnouns = new ethers.Contract(PNOUNS, ["function ownerOf(uint256) view returns (address)", "function transferFrom(address,address,uint256)"], ethers.provider);
test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
test/fork.e2e.test.js:26:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
test/fork.e2e.test.js:37:  "function ownerOf(uint256) view returns (address)",
contracts/PNounsVoter.sol:16:    function proposals(uint256 proposalId) external view returns (bytes memory);
scripts/sepolia/lib.js:18:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
scripts/sepolia/lib.js:37:  "function ownerOf(uint256) view returns (address)",
docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/AUDIT-RESPONSE-2026-08-18.md:164:| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/AUDIT-RESPONSE-2026-08-18.md:182:| `registrationDelayBlocks` / `marginBlocks` | 5 / 5 | 意図どおり |
contracts/PNounsSnapVoter.sol:17:    function proposals(uint256 proposalId) external view returns (bytes memory);
contracts/PNounsSnapVoter.sol:89:    uint256 public registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
contracts/PNounsSnapVoter.sol:162:        registrationDelayBlocks = registrationDelayBlocks_;
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-10-codex-raw.md:1:- 締切前は投函が止まりますが、締切後は `maybeExecute()` に入り、障害前までに計上された部分集計を Nouns DAO へ投票できます。
docs/audit-10-codex-raw.md:10:- 少なくとも `maybeExecute()` は「その tick で対応表と link/timeline を検証済み」でなければ呼ばない。
docs/audit-10-codex-raw.md:102:受付判定は登録時に確定した期限ではなく、現在のグローバル `registrationDelayBlocks` を毎回参照します。登録後に owner が値をゼロへ変更すれば即時受付可能です。
docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
scripts/create-and-register.mjs:73:  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
scripts/create-and-register.mjs:75:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
scripts/create-and-register.mjs:79:  const delay = Number(await c.registrationDelayBlocks());
scripts/compare-chains.js:9:const tokenAbi = ["function totalSupply() view returns (uint256)","function minter() view returns (address)","function noundersDAO() view returns (address)","function isMinterLocked() view returns (bool)","function owner() view returns (address)","function descriptor() view returns (address)"];
scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
scripts/sepolia/12-deploy-snapvoter.js:12:  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
scripts/sepolia/12-deploy-snapvoter.js:13:  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
scripts/sepolia/12-deploy-snapvoter.js:14:  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
relayer-cf/src/worker.js:32:  const mg = await metagovInfo(c, pc, p.id);
relayer-cf/src/worker.js:107:      const mg = await metagovInfo(c, pc, proposalId);
relayer-cf/src/worker.js:142:      const mg = await metagovInfo(c, pc, nounsId);
relayer-cf/src/worker.js:300:async function maybeExecute(c, pc, wc, store, p, block, mg) {
relayer-cf/src/worker.js:307:    const info = await metagovInfo(c, pc, p.id);
relayer-cf/src/worker.js:332:  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
relayer-cf/src/worker.js:372:        const mg = await metagovInfo(c, pc, pid);
relayer-cf/src/worker.js:373:        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
relayer-cf/src/worker.js:398:    const { block, proposals } = await recentProposals(c, pc);
relayer-cf/src/worker.js:410:          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
relayer-cf/src/worker.js:424:        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
relayer-cf/src/worker.js:428:        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
relayer-cf/src/worker.js:437:      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
relayer-cf/src/worker.js:442:      if (p.state !== 0 && p.state !== 1) continue;
relayer-cf/src/worker.js:447:        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
relayer-cf/src/worker.js:455:        const mg = await metagovInfo(c, pc, p.id);
relayer-cf/src/worker.js:492:          await maybeExecute(c, pc, wc, store, p, block, mg);
relayer-cf/src/chain.js:11:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
relayer-cf/src/chain.js:18:export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
relayer-cf/src/chain.js:119:export async function recentProposals(c, pc) {
relayer-cf/src/chain.js:148:  const frozen = state === 0 || state === 1;
relayer-cf/src/chain.js:171:export async function metagovInfo(c, pc, proposalId) {
relayer-cf/src/index.js:35:  const { block, proposals } = await recentProposals(c, pc);
relayer-cf/src/index.js:36:  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
relayer-cf/src/index.js:41:    const votable = p.state === 0 || p.state === 1;
relayer-cf/src/index.js:42:    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
relayer-cf/src/index.js:132:  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
relayer-cf/src/index.js:187:  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
relayer-cf/src/abi.js:447:  "name": "registrationDelayBlocks",
contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol:149:    function ownerOf(uint256 tokenId) external view returns (address owner);
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol:315:    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
contracts/vendor/pnouns/@openzeppelin/contracts/access/Ownable.sol:43:    function owner() public view virtual returns (address) {
contracts/vendor/pnouns/@openzeppelin/contracts/token/ERC721/IERC721.sol:39:    function ownerOf(uint256 tokenId) external view returns (address owner);

exec
/bin/bash -lc "nl -ba relayer-cf/src/chain.js | sed -n '100,205p'
nl -ba relayer-cf/src/worker.js | sed -n '1,520p'
nl -ba relayer-cf/src/snap.js | sed -n '1,125p'
nl -ba relayer-cf/src/abi.js | sed -n '380,470p'
nl -ba contracts/PNounsSnapVoter.sol | sed -n '70,110p;145,210p;245,295p'
nl -ba scripts/create-and-register.mjs | sed -n '1,115p'
rg -n \"PROPOSER|MNEMONIC|PRIVATE_KEY\" scripts .github relayer-cf wrangler.toml package.json --glob '"'!**/node_modules/**'"'" in /mnt/data/pnouns-voter
 exited 2 in 0ms:
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
   181	    ],
   182	    allowFailure: true,
   183	  }).then((r) => r.map((x) => (x.status === "success" ? x.result : null)));
   184	  const [t, deadline, votes, cur, rcpt, live] = [t0[0], t0[1], t0[2], t0[3], t0[4], t0[5]];
   185	  const tally = t || [[0n, 0n, 0n], [0n, 0n, 0n], false, 0];
   186	  const [tokens, voters, executed, result] = tally;
   187	  return {
   188	    tokens: tokens.map(Number), voters: voters.map(Number), executed, result: Number(executed ? result : cur ?? 2),
   189	    deadline: Number(deadline || 0n), metagovVotes: Number(votes || 0n),
   190	    nounsReceipt: rcpt ? { hasVoted: rcpt.hasVoted, support: Number(rcpt.support), votes: Number(rcpt.votes) } : null,
   191	    liveMode: !!live,
   192	  };
   193	}
   194	export { verifyTypedData, getAddress, METAGOV_ABI };
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
    19	const WORDS = ["反対", "賛成", "棄権"];
    20	
    21	function isContractRevert(e) {
    22	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
    23	  let x = e;
    24	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
    25	  return false;
    26	}
    27	
    28	async function announceNew(c, pc, store, p, block, snapInfo) {
    29	  const prev = await store.getAnnounced(p.id);
    30	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
    31	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
    32	  const mg = await metagovInfo(c, pc, p.id);
    33	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
    34	  if (c.snapshotSpace) {
    35	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
    36	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
    37	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    38	    const lines = [
    39	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
    40	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
    41	      `締切: ${jst} ごろ (block ${mg.deadline})`,
    42	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
    43	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    44	    ];
    45	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
    46	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    47	    return;
    48	  }
    49	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
    50	  const deadlineBlock = mg.deadline || p.endBlock;
    51	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
    52	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    53	  await store.putAnnounced(p.id, new Date().toISOString());
    54	  await notify(c, [
    55	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    56	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    57	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    58	    `投票ページ: ${c.publicUrl}`,
    59	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
    60	  ].join("\n"));
    61	}
    62	
    63	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
    64	const FORCE_LIST_MS = 20 * 60 * 1000;
    65	async function loadVotes(store, proposalId, force) {
    66	  const sum = await store.getSummary(proposalId);
    67	  const dirty = await store.dirtyAt(proposalId);
    68	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
    69	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
    70	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
    71	  const listed = await store.listVoteSummaries(proposalId);
    72	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
    73	  await store.putSummary(proposalId, summaries, listedAt);
    74	  return { summaries, listedAt };
    75	}
    76	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
    77	function setStatus(summaries, voter, patch) {
    78	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
    79	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
    80	}
    81	async function flushSummary(store, proposalId, summaries) {
    82	  const sum = await store.getSummary(proposalId);
    83	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
    84	}
    85	
    86	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
    87	async function reconcileSent(c, pc, store, proposalId, summaries) {
    88	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
    89	  if (!sent.length) return false;
    90	  const byTx = new Map();
    91	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
    92	  let changed = false;
    93	  for (const [tx, vs] of byTx) {
    94	    let rc = null;
    95	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
    96	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
    97	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
    98	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
    99	    for (let i = 0; i < vs.length; i++) {
   100	      const v = vs[i];
   101	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
   102	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
   103	    }
   104	    changed = true;
   105	    if (rc && rc.status === "success") {
   106	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
   107	      const mg = await metagovInfo(c, pc, proposalId);
   108	      const sent = await notify(c, [
   109	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
   110	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   111	        `tx: ${explorerTx(c, tx)}`,
   112	      ].join("\n"));
   113	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
   114	    } else {
   115	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
   116	    }
   117	  }
   118	  if (changed) await flushSummary(store, proposalId, summaries);
   119	  return changed;
   120	}
   121	
   122	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   123	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   124	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   125	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   126	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   127	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   128	  const pending = await store.kvRaw.get(sentK, "json");
   129	  if (pending) {
   130	    let allMined = true, anySuccess = false, gasTotal = 0n;
   131	    for (const tx of pending.txs) {
   132	      let rc = null;
   133	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   134	      if (!rc) { allMined = false; continue; }
   135	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   136	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   137	    }
   138	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   139	    await store.kvRaw.delete(sentK);
   140	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   141	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   142	      const mg = await metagovInfo(c, pc, nounsId);
   143	      const sent = await notify(c, [
   144	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   145	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   146	        `tx: ${explorerTx(c, pending.txs[0])}`,
   147	      ].join("\n"));
   148	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   149	    }
   150	    return;
   151	  }
   152	
   153	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   154	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   155	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   156	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   157	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   158	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   159	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   160	  const deadLetters = new Set(deadArr);
   161	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   162	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   163	  const owners = await allOwners(c, pc);
   164	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   165	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   166	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   167	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   168	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   169	  const votedByToken = new Map();
   170	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   171	    const ids = checkTokenIds.slice(start, start + 200);
   172	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   173	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   174	  }
   175	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   176	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   177	  const batches = rush ? c.rushBatches : 1;
   178	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   179	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   180	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   181	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   182	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   183	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   184	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   185	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   186	
   187	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   188	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   189	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   190	  for (const { row, index } of send) {
   191	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   192	    if (!env) {
   193	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   194	      if (fails[row.ipfs] >= 20) {
   195	        deadArr.push(row.ipfs); deadChanged = true;
   196	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   197	      }
   198	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   199	    }
   200	    const m = env.data.message;
   201	    const tokenIds = [];
   202	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   203	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   204	    args.push(arg); cidOf.set(arg, row.ipfs);
   205	  }
   206	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   207	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   208	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   209	  if (!args.length) return;
   210	
   211	  const txs = []; let count = 0;
   212	  for (let b = 0; b < batches; b++) {
   213	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   214	    if (!chunk.length) break;
   215	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   216	    catch (e) {
   217	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   218	      const good = [];
   219	      for (const a2 of chunk.slice(0, 10)) {
   220	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   221	        catch (e2) {
   222	          const cid = cidOf.get(a2);
   223	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   224	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   225	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   226	          }
   227	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   228	        }
   229	      }
   230	      if (!good.length) continue;
   231	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   232	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   233	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   234	      catch (e3) {
   235	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   236	        good.length = 1;
   237	      }
   238	      chunk.length = 0; chunk.push(...good);
   239	    }
   240	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   241	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   242	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   243	    txs.push(hash); count += chunk.length;
   244	  }
   245	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   246	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   247	}
   248	
   249	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   250	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   251	  const { summaries } = await loadVotes(store, proposalId, rush);
   252	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   253	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   254	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   255	  let touched = false;
   256	  for (let b = 0; b < batches; b++) {
   257	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
   258	    if (!pendingSummaries.length) break;
   259	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
   260	    const pending = [];
   261	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
   262	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
   263	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   264	    const cands = [];
   265	    for (let i = 0; i < pending.length; i++) {
   266	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
   267	      cands.push(pending[i]);
   268	    }
   269	    if (!cands.length) continue;
   270	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   271	    let good = cands;
   272	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   273	    catch (e) {
   274	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   275	      good = [];
   276	      for (const v of cands.slice(0, 10)) {
   277	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   278	        catch (e2) {
   279	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   280	        }
   281	      }
   282	      if (!good.length) continue;
   283	    }
   284	    const args = good.map(toArg);
   285	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   286	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   287	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   288	    const sentAt = new Date().toISOString();
   289	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   290	    touched = true;
   291	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   292	      await new Promise((r) => setTimeout(r, 1500));
   293	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   294	    }
   295	  }
   296	  if (touched) await flushSummary(store, proposalId, summaries);
   297	  // receipt は待たない(次回 tick の reconcile で確定・通知)
   298	}
   299	
   300	async function maybeExecute(c, pc, wc, store, p, block, mg) {
   301	  const ex = await store.getExecuted(p.id);
   302	  if (ex && ex.pending && ex.tx) {
   303	    // 送信済み・未確定の execute を確定
   304	    let rc = null;
   305	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
   306	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
   307	    const info = await metagovInfo(c, pc, p.id);
   308	    if (rc && rc.status === "success") {
   309	      if (info.executed) {
   310	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
   311	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
   312	        await notify(c, [
   313	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
   314	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
   315	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
   316	          `tx: ${explorerTx(c, ex.tx)}`,
   317	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
   318	        ].filter(Boolean).join("\n"));
   319	      } else {
   320	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
   321	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
   322	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
   323	      }
   324	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
   325	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
   326	    return;
   327	  }
   328	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
   329	  if (ex && !ex.shadow) return;
   330	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
   331	  if (mg.deadline === 0 || block < mg.deadline) return;
   332	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
   333	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
   334	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
   335	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
   336	    return;
   337	  }
   338	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
   339	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
   340	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
   341	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
   342	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
   343	}
   344	
   345	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
   346	async function checkBalance(c, pc, wc, store) {
   347	  const threshold = Number(c.lowBalanceEth);
   348	  const checks = [];
   349	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   350	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
   351	  for (const ck of checks) {
   352	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
   353	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
   354	    if (await store.getFlag(ck.key)) continue;
   355	    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
   356	    if (sent) await store.setFlag(ck.key, 86400);
   357	  }
   358	}
   359	
   360	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
   361	async function reconcileRecent(c, pc, wc, store, proposals) {
   362	  for (const p of proposals.slice(0, 15)) {
   363	    try {
   364	      const pid = String(p.id);
   365	      const sum = await store.getSummary(pid);
   366	      if (sum.votes.some((v) => v.txStatus === "sent")) {
   367	        const summaries = [...sum.votes];
   368	        await reconcileSent(c, pc, store, pid, summaries);
   369	      }
   370	      const ex = await store.getExecuted(pid);
   371	      if (ex && ex.pending && ex.tx) {
   372	        const mg = await metagovInfo(c, pc, pid);
   373	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
   374	      }
   375	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
   376	  }
   377	}
   378	
   379	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
   380	let lastErrNotify = 0;
   381	export async function notifyError(c, where, e) {
   382	  const msg = (e && (e.shortMessage || e.message)) || String(e);
   383	  console.error(`[${where}]`, msg);
   384	  if (Date.now() - lastErrNotify < 3600 * 1000) return;
   385	  lastErrNotify = Date.now();
   386	  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
   387	}
   388	
   389	let lastBalanceCheck = 0;
   390	let spaceCheckedAt = 0;
   391	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
   392	export async function tick(env) {
   393	  const c = cfg(env);
   394	  const { publicClient: pc, walletClient: wc } = clients(c);
   395	  const store = makeStore(env.STATE, storeNs(c));
   396	  try {
   397	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
   398	    const { block, proposals } = await recentProposals(c, pc);
   399	    await reconcileRecent(c, pc, wc, store, proposals);
   400	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
   401	    let snapByNouns = new Map();
   402	    let unresolvedIds = new Set();
   403	    let mappingsResolved = false;
   404	    if (c.snapshotSpace) {
   405	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
   406	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
   407	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
   408	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
   409	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
   410	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
   411	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
   412	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
   413	        ], allowFailure: false });
   414	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
   415	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
   416	        if (c.network === "mainnet") {
   417	          const relayerAddr = wc?.account?.address || null;
   418	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
   419	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
   420	        }
   421	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
   422	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
   423	        const floor = Math.max(300, c.minRegistrationDelay);
   424	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
   425	        spaceCheckedAt = Date.now();
   426	      }
   427	      try {
   428	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
   429	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
   430	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
   431	        unresolvedIds = new Set((unresolved || []).map(Number));
   432	        mappingsResolved = true;
   433	      }
   434	      catch (e) { await notifyError(c, "snapshot hub", e); }
   435	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
   436	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
   437	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
   438	      // 最終結果として確定してしまう。
   439	      if (!mappingsResolved) return;
   440	    }
   441	    for (const p of proposals) {
   442	      if (p.state !== 0 && p.state !== 1) continue;
   443	      try {
   444	        const snapInfo = snapByNouns.get(p.id) || null;
   445	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
   446	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
   447	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
   448	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
   449	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
   450	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
   451	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
   452	          }
   453	          continue;
   454	        }
   455	        const mg = await metagovInfo(c, pc, p.id);
   456	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
   457	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
   458	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
   459	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
   460	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
   461	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
   462	        }
   463	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
   464	        let timelineBad = false;
   465	        if (c.snapshotSpace && snapInfo) {
   466	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
   467	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
   468	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
   469	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
   470	          }
   471	        }
   472	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   473	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   474	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   475	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
   476	          await announceNew(c, pc, store, p, block, snapInfo);
   477	        }
   478	        if (linkBad && c.network === "mainnet") continue;
   479	        if (timelineBad && c.network === "mainnet") continue;
   480	        if (!wc) continue;
   481	        if (block < mg.deadline) {
   482	          if (c.snapshotSpace) {
   483	            if (snapInfo) {
   484	              const rush = shouldRushSubmit(c, block, mg.deadline);
   485	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
   486	            }
   487	          }
   488	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
   489	        } else if (!c.snapshotSpace || snapInfo) {
   490	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
   491	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
   492	          await maybeExecute(c, pc, wc, store, p, block, mg);
   493	        }
   494	      } catch (e) {
   495	        await notifyError(c, `worker prop ${p.id}`, e);
   496	      }
   497	    }
   498	  } catch (e) {
   499	    await notifyError(c, "worker tick", e);
   500	  }
   501	}
   502	export { notify };
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
    35	async function hubGql(c, query) {
    36	  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
    37	  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
    38	  if (!j.data) throw new Error("hub graphql: no data");
    39	  return j.data;
    40	}
    41	
    42	/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
    43	/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
    44	///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
    48	export function referencesNounsProposal(text, nounsId) {
    49	  const id = Number(nounsId);
    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
    51	  const s = String(text || "");
    52	  if (!s) return false;
    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    54	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
    55	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
    56	    const trimmed = raw.replace(/[)\]}>,.;:!?、。」』】）〕｝＞…]+$/u, "").replace(/[^\u0021-\u007e]+$/u, "");
    57	    let u;
    58	    try { u = new URL(trimmed); } catch { continue; }
    59	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    60	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
    61	  }
    62	  return false;
    63	}
    64	
    65	export async function resolveMappings(c, pc, activeNounsIds = []) {
    66	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    67	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
    68	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
    69	  const found = new Map(); // nounsId -> snapId
    70	  if (data.proposals.length) {
    71	    const res = await pc.multicall({
    72	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
    73	      allowFailure: false,
    74	    });
    75	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
    76	  }
    77	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
    78	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
    79	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
    80	  if (missing.length) {
    81	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    82	    const need = [];
    83	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    84	    if (need.length) {
    85	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
    86	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    87	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
    88	      for (const n of need) {
    89	        const p = byHash.get(n.hash);
    90	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
    91	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
    92	      }
    93	    }
    94	  }
    95	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    96	    const m = meta.get(snapId) || {};
    97	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
    98	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
    99	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
   100	    // 侵害)は検出できない。過信しないこと。
   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   103	  });
   104	  return { mappings, unresolved };
   105	}
   106	
   107	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
   108	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
   109	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
   110	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
   111	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
   112	  const send = []; const skipped = [];
   113	  let advance = cursor; let blocked = false;
   114	  for (let i = 0; i < rows.length; i++) {
   115	    const r = rows[i]; const rec = recs[i];
   116	    const created = Number(r.created);
   117	    const tokens = tokenCounts[i] ?? 0;
   118	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
   119	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
   120	    const exists = !!rec[0];
   121	    const recTs = Number(rec[3] ?? 0);
   122	    const isNew = !exists || created > recTs;
   123	    const needSupplement = exists && created === recTs && uncounted > 0;
   124	    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
   125	    if (isSkippable) {
   380	    "type": "bool"
   381	   }
   382	  ],
   383	  "stateMutability": "view",
   384	  "type": "function"
   385	 },
   386	 {
   387	  "inputs": [
   388	   {
   389	    "internalType": "uint256",
   390	    "name": "",
   391	    "type": "uint256"
   392	   }
   393	  ],
   394	  "name": "refundedForProposal",
   395	  "outputs": [
   396	   {
   397	    "internalType": "uint256",
   398	    "name": "",
   399	    "type": "uint256"
   400	   }
   401	  ],
   402	  "stateMutability": "view",
   403	  "type": "function"
   404	 },
   405	 {
   406	  "inputs": [
   407	   {
   408	    "internalType": "uint256",
   409	    "name": "",
   410	    "type": "uint256"
   411	   }
   412	  ],
   413	  "name": "registeredAtBlock",
   414	  "outputs": [
   415	   {
   416	    "internalType": "uint256",
   417	    "name": "",
   418	    "type": "uint256"
   419	   }
   420	  ],
   421	  "stateMutability": "view",
   422	  "type": "function"
   423	 },
   424	 {
   425	  "inputs": [],
   426	  "name": "owner",
   427	  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
   428	  "stateMutability": "view",
   429	  "type": "function"
   430	 },
   431	 {
   432	  "inputs": [],
   433	  "name": "registrar",
   434	  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
   435	  "stateMutability": "view",
   436	  "type": "function"
   437	 },
   438	 {
   439	  "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
   440	  "name": "eligibleAtBlock",
   441	  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
   442	  "stateMutability": "view",
   443	  "type": "function"
   444	 },
   445	 {
   446	  "inputs": [],
   447	  "name": "registrationDelayBlocks",
   448	  "outputs": [
   449	   {
   450	    "internalType": "uint256",
   451	    "name": "",
   452	    "type": "uint256"
   453	   }
   454	  ],
   455	  "stateMutability": "view",
   456	  "type": "function"
   457	 },
   458	 {
   459	  "inputs": [
   460	   {
   461	    "internalType": "bytes32",
   462	    "name": "",
   463	    "type": "bytes32"
   464	   }
   465	  ],
   466	  "name": "snapToNouns",
   467	  "outputs": [
   468	   {
   469	    "internalType": "uint256",
   470	    "name": "",
    70	    mapping(uint256 => uint256) public refundedForProposal;
    71	    uint256 public constant MAX_REFUND_PRIORITY_FEE = 2 gwei;
    72	    uint256 public constant MAX_REFUND_BASE_FEE = 200 gwei;
    73	    uint256 public constant REFUND_BASE_GAS = 55_000;
    74	    uint256 public constant MAX_REFUND_GAS_BASE = 120_000;
    75	    uint256 public constant MAX_REFUND_GAS_PER_VOTE = 90_000;
    76	
    77	    struct Tally {
    78	        uint32 againstTokens; uint32 forTokens; uint32 abstainTokens;
    79	        uint32 againstVoters; uint32 forVoters; uint32 abstainVoters;
    80	        uint48 deadline; bool executed; uint8 result;
    81	    }
    82	    mapping(uint256 => Tally) internal _tallies;
    83	    mapping(uint256 => mapping(uint256 => uint256)) internal _votedBitmap;
    84	
    85	    struct VoterRec { bool exists; uint8 support; uint32 counted; uint64 timestamp; bytes32 digest; }
    86	    mapping(uint256 => mapping(address => VoterRec)) public voterRec;
    87	
    88	    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
    89	    uint256 public registrationDelayBlocks;
    90	    /// Nouns 提案 id → 登録ブロック
    91	    mapping(uint256 => uint256) public registeredAtBlock;
    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
    93	    mapping(uint256 => uint256) public eligibleAtBlock;
    94	    /// keccak(Snapshot 提案 id 文字列) → Nouns 提案 id
    95	    mapping(bytes32 => uint256) public snapToNouns;
    96	    /// Nouns 提案 id → keccak(Snapshot 提案 id 文字列)
    97	    mapping(uint256 => bytes32) public nounsToSnap;
    98	    /// @notice Snapshot 署名が受理された件数(やり直しで新規 token が 0 でも増える。取消可否の判定に使う)
    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
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
    54	  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
    55	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
    56	  const now = Math.floor(Date.now() / 1000);
    57	  const client = new snapshot.Client712(SEQ);
    58	  const receipt = await client.proposal(adapt(bot), bot.address, {
    59	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    60	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
    61	    plugins: "{}", app: "pnouns-voter",
    62	  });
    63	  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
    64	
    65	  // オンチェーンの対応付け(registrar)
    66	  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    67	  const voter = dep.snapVoter || dep.voter;
    68	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    69	  // 第11回監査 M-14: mainnet で registrar 用の鍵が未設定のまま提案作成鍵に fallback すると、
    70	  // 3 者分離したつもりで同一鍵に戻ってしまう。mainnet では明示指定を必須にする。
    71	  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
    72	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
    73	  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
    74	  const w = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
    75	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
    76	  const c = new ethers.Contract(voter, abi, w);
    77	  const tx = await c.registerProposal(receipt.id, nounsId);
    78	  await tx.wait();
    79	  const delay = Number(await c.registrationDelayBlocks());
    80	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
    81	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
    82	}
    83	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
rg: .github: No such file or directory (os error 2)
rg: wrangler.toml: No such file or directory (os error 2)
relayer-cf/wrangler.toml:26:ONLY_PROPOSER = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925"
relayer-cf/wrangler.toml:30:# secrets(wrangler secret put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL, (任意) TICK_TOKEN
relayer-cf/wrangler.toml:33:# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
relayer-cf/wrangler.toml:57:# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL
scripts/sepolia/14-snap-setup-only.js:14:  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
scripts/sepolia/14-snap-setup-only.js:25:    const w = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
scripts/sepolia/13-snap-e2e.js:44:  const botWallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
scripts/sepolia/13-snap-e2e.js:61:    const wallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
relayer-cf/src/chain.js:27:    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
relayer-cf/src/chain.js:44:    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
relayer-cf/src/chain.js:58:    relayerKey: env.RELAYER_PRIVATE_KEY || null,
scripts/create-and-register.mjs:54:  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
scripts/create-and-register.mjs:73:  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");

exec
/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '270,510p'
nl -ba relayer-cf/src/snap.js | sed -n '45,115p'
nl -ba relayer-cf/src/abi.js | sed -n '400,462p'
nl -ba relayer-cf/src/chain.js | sed -n '1,75p'
nl -ba relayer-cf/src/store.js | sed -n '1,220p'
nl -ba relayer-cf/wrangler.toml | sed -n '1,75p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   270	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   271	    let good = cands;
   272	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   273	    catch (e) {
   274	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   275	      good = [];
   276	      for (const v of cands.slice(0, 10)) {
   277	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   278	        catch (e2) {
   279	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   280	        }
   281	      }
   282	      if (!good.length) continue;
   283	    }
   284	    const args = good.map(toArg);
   285	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   286	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   287	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   288	    const sentAt = new Date().toISOString();
   289	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   290	    touched = true;
   291	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   292	      await new Promise((r) => setTimeout(r, 1500));
   293	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   294	    }
   295	  }
   296	  if (touched) await flushSummary(store, proposalId, summaries);
   297	  // receipt は待たない(次回 tick の reconcile で確定・通知)
   298	}
   299	
   300	async function maybeExecute(c, pc, wc, store, p, block, mg) {
   301	  const ex = await store.getExecuted(p.id);
   302	  if (ex && ex.pending && ex.tx) {
   303	    // 送信済み・未確定の execute を確定
   304	    let rc = null;
   305	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
   306	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
   307	    const info = await metagovInfo(c, pc, p.id);
   308	    if (rc && rc.status === "success") {
   309	      if (info.executed) {
   310	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
   311	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
   312	        await notify(c, [
   313	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
   314	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
   315	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
   316	          `tx: ${explorerTx(c, ex.tx)}`,
   317	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
   318	        ].filter(Boolean).join("\n"));
   319	      } else {
   320	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
   321	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
   322	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
   323	      }
   324	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
   325	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
   326	    return;
   327	  }
   328	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
   329	  if (ex && !ex.shadow) return;
   330	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
   331	  if (mg.deadline === 0 || block < mg.deadline) return;
   332	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
   333	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
   334	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
   335	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
   336	    return;
   337	  }
   338	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
   339	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
   340	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
   341	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
   342	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
   343	}
   344	
   345	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
   346	async function checkBalance(c, pc, wc, store) {
   347	  const threshold = Number(c.lowBalanceEth);
   348	  const checks = [];
   349	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   350	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
   351	  for (const ck of checks) {
   352	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
   353	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
   354	    if (await store.getFlag(ck.key)) continue;
   355	    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
   356	    if (sent) await store.setFlag(ck.key, 86400);
   357	  }
   358	}
   359	
   360	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
   361	async function reconcileRecent(c, pc, wc, store, proposals) {
   362	  for (const p of proposals.slice(0, 15)) {
   363	    try {
   364	      const pid = String(p.id);
   365	      const sum = await store.getSummary(pid);
   366	      if (sum.votes.some((v) => v.txStatus === "sent")) {
   367	        const summaries = [...sum.votes];
   368	        await reconcileSent(c, pc, store, pid, summaries);
   369	      }
   370	      const ex = await store.getExecuted(pid);
   371	      if (ex && ex.pending && ex.tx) {
   372	        const mg = await metagovInfo(c, pc, pid);
   373	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
   374	      }
   375	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
   376	  }
   377	}
   378	
   379	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
   380	let lastErrNotify = 0;
   381	export async function notifyError(c, where, e) {
   382	  const msg = (e && (e.shortMessage || e.message)) || String(e);
   383	  console.error(`[${where}]`, msg);
   384	  if (Date.now() - lastErrNotify < 3600 * 1000) return;
   385	  lastErrNotify = Date.now();
   386	  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
   387	}
   388	
   389	let lastBalanceCheck = 0;
   390	let spaceCheckedAt = 0;
   391	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
   392	export async function tick(env) {
   393	  const c = cfg(env);
   394	  const { publicClient: pc, walletClient: wc } = clients(c);
   395	  const store = makeStore(env.STATE, storeNs(c));
   396	  try {
   397	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
   398	    const { block, proposals } = await recentProposals(c, pc);
   399	    await reconcileRecent(c, pc, wc, store, proposals);
   400	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
   401	    let snapByNouns = new Map();
   402	    let unresolvedIds = new Set();
   403	    let mappingsResolved = false;
   404	    if (c.snapshotSpace) {
   405	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
   406	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
   407	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
   408	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
   409	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
   410	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
   411	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
   412	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
   413	        ], allowFailure: false });
   414	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
   415	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
   416	        if (c.network === "mainnet") {
   417	          const relayerAddr = wc?.account?.address || null;
   418	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
   419	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
   420	        }
   421	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
   422	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
   423	        const floor = Math.max(300, c.minRegistrationDelay);
   424	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
   425	        spaceCheckedAt = Date.now();
   426	      }
   427	      try {
   428	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
   429	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
   430	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
   431	        unresolvedIds = new Set((unresolved || []).map(Number));
   432	        mappingsResolved = true;
   433	      }
   434	      catch (e) { await notifyError(c, "snapshot hub", e); }
   435	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
   436	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
   437	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
   438	      // 最終結果として確定してしまう。
   439	      if (!mappingsResolved) return;
   440	    }
   441	    for (const p of proposals) {
   442	      if (p.state !== 0 && p.state !== 1) continue;
   443	      try {
   444	        const snapInfo = snapByNouns.get(p.id) || null;
   445	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
   446	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
   447	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
   448	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
   449	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
   450	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
   451	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
   452	          }
   453	          continue;
   454	        }
   455	        const mg = await metagovInfo(c, pc, p.id);
   456	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
   457	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
   458	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
   459	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
   460	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
   461	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
   462	        }
   463	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
   464	        let timelineBad = false;
   465	        if (c.snapshotSpace && snapInfo) {
   466	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
   467	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
   468	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
   469	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
   470	          }
   471	        }
   472	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   473	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   474	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   475	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
   476	          await announceNew(c, pc, store, p, block, snapInfo);
   477	        }
   478	        if (linkBad && c.network === "mainnet") continue;
   479	        if (timelineBad && c.network === "mainnet") continue;
   480	        if (!wc) continue;
   481	        if (block < mg.deadline) {
   482	          if (c.snapshotSpace) {
   483	            if (snapInfo) {
   484	              const rush = shouldRushSubmit(c, block, mg.deadline);
   485	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
   486	            }
   487	          }
   488	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
   489	        } else if (!c.snapshotSpace || snapInfo) {
   490	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
   491	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
   492	          await maybeExecute(c, pc, wc, store, p, block, mg);
   493	        }
   494	      } catch (e) {
   495	        await notifyError(c, `worker prop ${p.id}`, e);
   496	      }
   497	    }
   498	  } catch (e) {
   499	    await notifyError(c, "worker tick", e);
   500	  }
   501	}
   502	export { notify };
    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
    48	export function referencesNounsProposal(text, nounsId) {
    49	  const id = Number(nounsId);
    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
    51	  const s = String(text || "");
    52	  if (!s) return false;
    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    54	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
    55	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
    56	    const trimmed = raw.replace(/[)\]}>,.;:!?、。」』】）〕｝＞…]+$/u, "").replace(/[^\u0021-\u007e]+$/u, "");
    57	    let u;
    58	    try { u = new URL(trimmed); } catch { continue; }
    59	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    60	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
    61	  }
    62	  return false;
    63	}
    64	
    65	export async function resolveMappings(c, pc, activeNounsIds = []) {
    66	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    67	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
    68	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
    69	  const found = new Map(); // nounsId -> snapId
    70	  if (data.proposals.length) {
    71	    const res = await pc.multicall({
    72	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
    73	      allowFailure: false,
    74	    });
    75	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
    76	  }
    77	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
    78	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
    79	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
    80	  if (missing.length) {
    81	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    82	    const need = [];
    83	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    84	    if (need.length) {
    85	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
    86	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    87	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
    88	      for (const n of need) {
    89	        const p = byHash.get(n.hash);
    90	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
    91	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
    92	      }
    93	    }
    94	  }
    95	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    96	    const m = meta.get(snapId) || {};
    97	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
    98	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
    99	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
   100	    // 侵害)は検出できない。過信しないこと。
   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   103	  });
   104	  return { mappings, unresolved };
   105	}
   106	
   107	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
   108	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
   109	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
   110	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
   111	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
   112	  const send = []; const skipped = [];
   113	  let advance = cursor; let blocked = false;
   114	  for (let i = 0; i < rows.length; i++) {
   115	    const r = rows[i]; const rec = recs[i];
   400	   }
   401	  ],
   402	  "stateMutability": "view",
   403	  "type": "function"
   404	 },
   405	 {
   406	  "inputs": [
   407	   {
   408	    "internalType": "uint256",
   409	    "name": "",
   410	    "type": "uint256"
   411	   }
   412	  ],
   413	  "name": "registeredAtBlock",
   414	  "outputs": [
   415	   {
   416	    "internalType": "uint256",
   417	    "name": "",
   418	    "type": "uint256"
   419	   }
   420	  ],
   421	  "stateMutability": "view",
   422	  "type": "function"
   423	 },
   424	 {
   425	  "inputs": [],
   426	  "name": "owner",
   427	  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
   428	  "stateMutability": "view",
   429	  "type": "function"
   430	 },
   431	 {
   432	  "inputs": [],
   433	  "name": "registrar",
   434	  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
   435	  "stateMutability": "view",
   436	  "type": "function"
   437	 },
   438	 {
   439	  "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
   440	  "name": "eligibleAtBlock",
   441	  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
   442	  "stateMutability": "view",
   443	  "type": "function"
   444	 },
   445	 {
   446	  "inputs": [],
   447	  "name": "registrationDelayBlocks",
   448	  "outputs": [
   449	   {
   450	    "internalType": "uint256",
   451	    "name": "",
   452	    "type": "uint256"
   453	   }
   454	  ],
   455	  "stateMutability": "view",
   456	  "type": "function"
   457	 },
   458	 {
   459	  "inputs": [
   460	   {
   461	    "internalType": "bytes32",
   462	    "name": "",
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
    54	    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
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
     1	// KV ストア(Cloudflare 無料枠: 書込み 1,000/日、list 1,000/日、読取 100,000/日、1 呼び出し 1,000 操作)
     2	//  - 全キーは "<chainId>:<voter>:" で名前空間化(コントラクト再デプロイで混ざらない)
     3	//  - 票: vote:{pid}:{voter}。値=本文(署名)、metadata=要約。一覧は list の metadata だけで作る(get は投函対象 ≤ MAX_BATCH 件のみ)
     4	//  - サマリー sum:{pid}: ワーカーが list 結果から書く(listedAt 付き)。公開 API は get のみ
     5	//  - dirty:{pid}: API が署名受付時に受付時刻を書く。ワーカーは「dirty > 前回 listedAt」なら再 list(削除しないので競合しない)
     6	//  - inflight キーは持たない: 送信中は sum の txStatus:"sent" / executed.pending から毎 tick 検出
     7	export function makeStore(kv, ns) {
     8	  const P = ns ? `${ns}:` : "";
     9	  const voteKey = (pid, voter) => `${P}vote:${pid}:${voter.toLowerCase()}`;
    10	  // metadata は受付時の不変情報だけ(support/枚数/受付時刻)。投函状態(tx/txStatus/dropped/sentAt)は sum:{pid} だけが持つ(書込み削減・競合回避)
    11	  const meta = (rec) => ({ s: rec.support, n: rec.tokenIds.length, at: rec.receivedAt });
    12	  const fromMeta = (voter, m) => ({ voter, support: m.s, tokenCount: m.n, receivedAt: m.at });
    13	  return {
    14	    kvRaw: kv, prefix: P,
    15	    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
    16	    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec), { metadata: meta(rec) }); },
    17	    /// list(metadata のみ、get なし)。ワーカー専用
    18	    async listVoteSummaries(pid) {
    19	      const out = []; let cursor;
    20	      do {
    21	        const r = await kv.list({ prefix: `${P}vote:${pid}:`, cursor });
    22	        for (const k of r.keys) if (k.metadata) out.push(fromMeta(k.name.split(":").pop(), k.metadata));
    23	        cursor = r.list_complete ? undefined : r.cursor;
    24	      } while (cursor);
    25	      return out;
    26	    },
    27	    summarize(voter, rec) { return fromMeta(voter, meta(rec)); },
    28	    /// list 結果(新規 voter を含む)と既存サマリー(状態を含む)をマージ
    29	    mergeSummaries(listed, existing) {
    30	      const byVoter = new Map(existing.map((v) => [v.voter.toLowerCase(), v]));
    31	      return listed.map((l) => { const e = byVoter.get(l.voter.toLowerCase()); return e ? { ...l, tx: e.tx, txStatus: e.txStatus, dropped: e.dropped, sentAt: e.sentAt } : l; });
    32	    },
    33	    async getSummary(pid) { return (await kv.get(`${P}sum:${pid}`, "json")) || { listedAt: 0, votes: [] }; },
    34	    async putSummary(pid, votes, listedAt) { await kv.put(`${P}sum:${pid}`, JSON.stringify({ listedAt, votes })); },
    35	    async markDirty(pid) { await kv.put(`${P}dirty:${pid}`, String(Date.now()), { expirationTtl: 86400 * 7 }); },
    36	    async dirtyAt(pid) { return Number(await kv.get(`${P}dirty:${pid}`)) || 0; },
    37	    async getExecuted(pid) { return kv.get(`${P}executed:${pid}`, "json"); },
    38	    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`${P}executed:${pid}`); await kv.put(`${P}executed:${pid}`, JSON.stringify(rec)); },
    39	    async getAnnounced(pid) { return kv.get(`${P}announced:${pid}`); },
    40	    async putAnnounced(pid, v) { await kv.put(`${P}announced:${pid}`, v); },
    41	    async getFlag(k) { return kv.get(`${P}flag:${k}`); },
    42	    async setFlag(k, ttl) { await kv.put(`${P}flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
    43	  };
    44	}
     1	name = "pnouns-voter"
     2	main = "src/index.js"
     3	compatibility_date = "2026-08-01"
     4	compatibility_flags = ["nodejs_compat"]
     5	
     6	# 静的 dApp(public/index.html)。/api/* は Worker が処理
     7	[assets]
     8	directory = "./public"
     9	
    10	[triggers]
    11	crons = ["* * * * *"]
    12	
    13	[[kv_namespaces]]
    14	binding = "STATE"
    15	id = "4c2f1c683fe94191b456e0c1fc70cc2f"
    16	
    17	[vars]
    18	NETWORK = "sepolia"
    19	VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
    20	SNAPSHOT_SPACE = "earl-grey.eth"
    21	PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
    22	NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
    23	NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
    24	EXPLORER = "https://sepolia.etherscan.io"
    25	BLOCKSCOUT = "https://eth-sepolia.blockscout.com"
    26	ONLY_PROPOSER = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925"
    27	MIN_PENDING_AGE_SEC = "20"
    28	MAX_BATCH = "10"
    29	EXECUTE_GAS_MULT = "1.3"
    30	# secrets(wrangler secret put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL, (任意) TICK_TOKEN
    31	PUBLIC_URL = "https://pnouns-voter.x402-adsb-worker.workers.dev"
    32	
    33	# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
    34	[env.mainnet]
    35	name = "pnouns-voter-mainnet"
    36	[env.mainnet.assets]
    37	directory = "./public"
    38	[env.mainnet.triggers]
    39	crons = ["*/2 * * * *"]
    40	[[env.mainnet.kv_namespaces]]
    41	binding = "STATE"
    42	id = "REPLACE_WITH_MAINNET_KV_ID"
    43	[env.mainnet.vars]
    44	NETWORK = "mainnet"
    45	SNAPSHOT_SPACE = "pnounsdao.eth"
    46	VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
    47	PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80"
    48	NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"
    49	NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"
    50	EXPLORER = "https://etherscan.io"
    51	BLOCKSCOUT = "https://eth.blockscout.com"
    52	MIN_PENDING_AGE_SEC = "120"
    53	MAX_BATCH = "10"
    54	EXECUTE_GAS_MULT = "1.3"
    55	LOW_BALANCE_ETH = "0.01"
    56	PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
    57	# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL

exec
/bin/bash -lc "rg -n \"voteDeadline|deadline =|marginBlocks|execute\\(\" contracts/PNounsSnapVoter.sol && nl -ba contracts/PNounsSnapVoter.sol | sed -n '286,390p'
git show 3ca7528"'^:relayer-cf/src/worker.js | nl -ba | sed -n '"'380,485p'
git show 3ca7528"'^:relayer-cf/src/snap.js | nl -ba | sed -n '"'45,110p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
34: *  - 締切 = Nouns の endBlock − marginBlocks。締切後は誰でも execute。票ゼロは投票しない(NoVotes)。
63:    uint256 public marginBlocks;
121:    event MarginBlocksSet(uint256 marginBlocks);
153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
161:        marginBlocks = marginBlocks_;
168:    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
225:    function voteDeadline(uint256 proposalId) public view returns (uint256) {
227:        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
295:        uint256 deadline = t.deadline;
296:        if (deadline == 0) {
299:            deadline = voteDeadline(proposalId);
300:            t.deadline = uint48(deadline);
362:    function execute(uint256 proposalId) external nonReentrant {
365:        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
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
   336	        for (uint256 i = 0; i < tokenIds.length; i++) {
   337	            uint256 id = tokenIds[i];
   338	            address ownerOf = pnouns.ownerOf(id);
   339	            if (ownerOf != voter) revert NotTokenOwner(id, ownerOf);
   340	            uint256 word = id >> 8;
   341	            uint256 bit = 1 << (id & 0xff);
   342	            uint256 map = _votedBitmap[proposalId][word];
   343	            if (map & bit != 0) continue;
   344	            _votedBitmap[proposalId][word] = map | bit;
   345	            counted++;
   346	        }
   347	    }
   348	
   349	    function _addTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
   350	        // voters=0 は「補完」(同一署名で token を追加)の場合
   351	        if (s == FOR) { t.forTokens += tokens; t.forVoters += voters; }
   352	        else if (s == AGAINST) { t.againstTokens += tokens; t.againstVoters += voters; }
   353	        else { t.abstainTokens += tokens; t.abstainVoters += voters; }
   354	    }
   355	    function _subTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
   356	        if (s == FOR) { t.forTokens -= tokens; t.forVoters -= voters; }
   357	        else if (s == AGAINST) { t.againstTokens -= tokens; t.againstVoters -= voters; }
   358	        else { t.abstainTokens -= tokens; t.abstainVoters -= voters; }
   359	    }
   360	
   361	    // ---- 実行 ----
   362	    function execute(uint256 proposalId) external nonReentrant {
   363	        Tally storage t = _tallies[proposalId];
   364	        if (t.executed) revert AlreadyExecuted();
   365	        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
   366	        if (block.number < deadline) revert VotingNotClosed();
   367	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
   368	        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes();
   369	        uint8 support = _decide(tokens, voters);
   370	        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
   371	        t.executed = true; t.result = support;
   372	        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
   373	        emit Executed(proposalId, support, tokens, voters, true);
   374	    }
   375	
   376	    // ---- 内部 ----
   377	    function _choiceToSupport(uint32 choice) internal pure returns (uint8) {
   378	        if (choice == 1) return FOR;
   379	        if (choice == 2) return AGAINST;
   380	        if (choice == 3) return ABSTAIN;
   381	        revert InvalidChoice();
   382	    }
   383	
   384	    /// @dev "0x…" 42 文字の 16 進文字列を address へ厳密変換(不正なら revert)
   385	    function _parseAddress(string calldata str) internal pure returns (address) {
   386	        bytes calldata b = bytes(str);
   387	        if (b.length != 42 || b[0] != "0" || (b[1] != "x" && b[1] != "X")) revert InvalidFromAddress();
   388	        uint160 v;
   389	        for (uint256 i = 2; i < 42; i++) {
   390	            uint8 c = uint8(b[i]);
   380	export async function notifyError(c, where, e) {
   381	  const msg = (e && (e.shortMessage || e.message)) || String(e);
   382	  console.error(`[${where}]`, msg);
   383	  if (Date.now() - lastErrNotify < 3600 * 1000) return;
   384	  lastErrNotify = Date.now();
   385	  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
   386	}
   387	
   388	let lastBalanceCheck = 0;
   389	let spaceCheckedAt = 0;
   390	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
   391	export async function tick(env) {
   392	  const c = cfg(env);
   393	  const { publicClient: pc, walletClient: wc } = clients(c);
   394	  const store = makeStore(env.STATE, storeNs(c));
   395	  try {
   396	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
   397	    const { block, proposals } = await recentProposals(c, pc);
   398	    await reconcileRecent(c, pc, wc, store, proposals);
   399	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
   400	    let snapByNouns = new Map();
   401	    let mappingsResolved = false;
   402	    if (c.snapshotSpace) {
   403	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
   404	      if (Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
   405	        const [onchain, delay] = await pc.multicall({ contracts: [
   406	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
   407	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
   408	        ], allowFailure: false });
   409	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
   410	        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
   411	        spaceCheckedAt = Date.now();
   412	      }
   413	      try {
   414	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
   415	        const { mappings } = await resolveMappings(c, pc, active);
   416	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
   417	        mappingsResolved = true;
   418	      }
   419	      catch (e) { await notifyError(c, "snapshot hub", e); }
   420	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
   421	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
   422	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
   423	      // 最終結果として確定してしまう。
   424	      if (!mappingsResolved) return;
   425	    }
   426	    for (const p of proposals) {
   427	      if (p.state !== 0 && p.state !== 1) continue;
   428	      try {
   429	        const snapInfo = snapByNouns.get(p.id) || null;
   430	        const mg = await metagovInfo(c, pc, p.id);
   431	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
   432	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
   433	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
   434	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
   435	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
   436	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
   437	        }
   438	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
   439	        let timelineBad = false;
   440	        if (c.snapshotSpace && snapInfo) {
   441	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
   442	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
   443	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
   444	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
   445	          }
   446	        }
   447	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   448	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   449	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   450	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
   451	          await announceNew(c, pc, store, p, block, snapInfo);
   452	        }
   453	        if (linkBad && c.network === "mainnet") continue;
   454	        if (timelineBad && c.network === "mainnet") continue;
   455	        if (!wc) continue;
   456	        if (block < mg.deadline) {
   457	          if (c.snapshotSpace) {
   458	            if (snapInfo) {
   459	              const rush = shouldRushSubmit(c, block, mg.deadline);
   460	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
   461	            }
   462	          }
   463	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
   464	        } else await maybeExecute(c, pc, wc, store, p, block, mg);
   465	      } catch (e) {
   466	        await notifyError(c, `worker prop ${p.id}`, e);
   467	      }
   468	    }
   469	  } catch (e) {
   470	    await notifyError(c, "worker tick", e);
   471	  }
   472	}
   473	export { notify };
    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
    48	export function referencesNounsProposal(text, nounsId) {
    49	  const id = Number(nounsId);
    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
    51	  const s = String(text || "");
    52	  if (!s) return false;
    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`)\]]+/gi) || []) {
    54	    let u;
    55	    try { u = new URL(raw); } catch { continue; }
    56	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    57	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
    58	  }
    59	  return false;
    60	}
    61	
    62	export async function resolveMappings(c, pc, activeNounsIds = []) {
    63	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    64	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
    65	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
    66	  const found = new Map(); // nounsId -> snapId
    67	  if (data.proposals.length) {
    68	    const res = await pc.multicall({
    69	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
    70	      allowFailure: false,
    71	    });
    72	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
    73	  }
    74	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
    75	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
    76	  if (missing.length) {
    77	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    78	    const need = [];
    79	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    80	    if (need.length) {
    81	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
    82	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
    83	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
    84	      for (const n of need) {
    85	        const p = byHash.get(n.hash);
    86	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
    87	        else console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`);
    88	      }
    89	    }
    90	  }
    91	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    92	    const m = meta.get(snapId) || {};
    93	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
    94	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
    95	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
    96	    // 侵害)は検出できない。過信しないこと。
    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
    99	  });
   100	  return { mappings };
   101	}
   102	
   103	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
   104	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
   105	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
   106	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
   107	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
   108	  const send = []; const skipped = [];
   109	  let advance = cursor; let blocked = false;
   110	  for (let i = 0; i < rows.length; i++) {

codex
締切経路は、コントラクトの `voteDeadline = endBlock - marginBlocks` と Nouns DAO の state 遷移を合わせると、通常の execute 窓は DAO がまだ Active の margin 内にあります。したがって今回の `snapInfo` 制約自体が永続的な自己 DoS を作る構造ではありません。ただし、URL 処理には置換順序に起因する未テストの取りこぼし候補があり、鍵分離スクリプトには実質的な不整合が見つかっています。現在、テスト結果と正確な重大度を詰めています。
exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 788ms:
✔ test/accept-deadline.test.mjs (685.885902ms)
✔ test/cursor.test.mjs (724.759698ms)
✔ test/link-check.test.mjs (707.363246ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 735.538358

exec
/bin/bash -lc "nl -ba relayer-cf/test/link-check.test.mjs
node --input-type=module -e 'import { referencesNounsProposal as r } from \"./src/snap.js\"; const xs=[\"https://nouns.wtf/vote/989abc\",\"https://nouns.wtf/vote/989%20foo\",\"[t](https://nouns.wtf/vote/989)\",\"https://nouns.wtf/vote/989.後\",\"https://nouns.wtf/vote/989後。\",\"https://nouns.wtf/vote/989%E3%80%82\"]; for(const x of xs) console.log(JSON.stringify(x),r(x,989));'" in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 635ms:
"https://nouns.wtf/vote/989abc" false
"https://nouns.wtf/vote/989%20foo" false
"[t](https://nouns.wtf/vote/989)" true
"https://nouns.wtf/vote/989.後" false
"https://nouns.wtf/vote/989後。" true
"https://nouns.wtf/vote/989%E3%80%82" false

exec
/bin/bash -lc "nl -ba test/link-check.test.mjs
rg -o \"assert\\.equal\" test/link-check.test.mjs | wc -l
git diff 3ca7528"'^ 3ca7528 -- relayer-cf/src/abi.js' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 0ms:
     1	// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
     2	// 第10回監査の指摘: 前方一致・偽ドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null を検証すること。
     3	import { test } from "node:test";
     4	import assert from "node:assert/strict";
     5	import { referencesNounsProposal as ref } from "../src/snap.js";
     6	
     7	test("正規の URL を検出する", () => {
     8	  assert.equal(ref("https://nouns.wtf/vote/989", 989), true);
     9	  assert.equal(ref("Source: https://nouns.wtf/vote/989\n本文", 989), true);
    10	  assert.equal(ref("https://nouns.wtf/vote/989/", 989), true);
    11	  assert.equal(ref("https://nouns.wtf/vote/989?tab=activity", 989), true);
    12	  assert.equal(ref("https://nouns.wtf/vote/989#comments", 989), true);
    13	  assert.equal(ref("https://www.nouns.wtf/vote/989", 989), true);
    14	  assert.equal(ref("HTTPS://NOUNS.WTF/vote/989", 989), true, "ホスト名は大文字小文字を区別しない");
    15	  assert.equal(ref("(https://nouns.wtf/vote/989)", 989), true, "括弧で閉じられていても拾う");
    16	  assert.equal(ref("http://nouns.wtf/vote/989", 989), true);
    17	});
    18	
    19	test("前方一致で誤検出しない", () => {
    20	  assert.equal(ref("https://nouns.wtf/vote/123", 12), false);
    21	  assert.equal(ref("https://nouns.wtf/vote/12", 123), false);
    22	  assert.equal(ref("https://nouns.wtf/vote/9890", 989), false);
    23	});
    24	
    25	test("別ドメイン・別パスを拒否する", () => {
    26	  assert.equal(ref("https://evilnouns.wtf/vote/989", 989), false);
    27	  assert.equal(ref("https://nouns.wtf.evil.com/vote/989", 989), false);
    28	  assert.equal(ref("https://fake.nouns.wtf/vote/989", 989), false, "サブドメインは別ホスト");
    29	  assert.equal(ref("https://nouns.wtf/vote/989/extra", 989), false);
    30	  assert.equal(ref("https://nouns.wtf/proposal/989", 989), false);
    31	  assert.equal(ref("nouns.wtf/vote/989", 989), false, "スキームなしの裸文字列は URL として扱わない");
    32	});
    33	
    34	test("空・null・不正な入力で例外を投げず false を返す", () => {
    35	  for (const v of [null, undefined, "", 0, {}, []]) assert.equal(ref(v, 989), false);
    36	  for (const id of [null, undefined, 0, -1, NaN, "abc", 1e21]) assert.equal(ref("https://nouns.wtf/vote/989", id), false);
    37	});
    38	
    39	test("正規表現メタ文字を含む入力で壊れない", () => {
    40	  assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
    41	  assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
    42	});
    43	
    44	// 第11回監査 M-3: URL 解析化による検出回帰(末尾句読点・全角後置文字・Markdown)
    45	test("URL の直後に句読点や日本語が続いても検出する", () => {
    46	  assert.equal(ref("詳細は https://nouns.wtf/vote/989。", 989), true, "全角句点");
    47	  assert.equal(ref("詳細は https://nouns.wtf/vote/989.", 989), true, "半角ピリオド");
    48	  assert.equal(ref("https://nouns.wtf/vote/989, および他", 989), true, "カンマ");
    49	  assert.equal(ref("https://nouns.wtf/vote/989、他", 989), true, "読点");
    50	  assert.equal(ref("https://nouns.wtf/vote/989後に投票", 989), true, "直後に日本語");
    51	  assert.equal(ref("「https://nouns.wtf/vote/989」を参照", 989), true, "全角かぎ括弧で囲む");
    52	  assert.equal(ref("[議案](https://nouns.wtf/vote/989)", 989), true, "Markdown リンク");
    53	  assert.equal(ref("https://nouns.wtf/vote/989\n次の行", 989), true, "改行が続く");
    54	  assert.equal(ref("https://nouns.wtf/vote/989?tab=x。", 989), true, "クエリ + 句点");
    55	});
    56	
    57	test("末尾処理で別 ID に化けない", () => {
    58	  assert.equal(ref("https://nouns.wtf/vote/9890。", 989), false);
    59	  assert.equal(ref("https://nouns.wtf/vote/989。", 9890), false);
    60	  assert.equal(ref("https://evilnouns.wtf/vote/989。", 989), false, "末尾処理をしてもドメイン判定は維持");
    61	});
    62	
    63	test("改行で分断された URL は検出しない(仕様)", () => {
    64	  assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
    65	});
35

exec
/bin/bash -lc "rg -n \"resolveMappings|unresolved|announceNew|notified:|spaceCheckedAt|owner/registrar|REGISTRAR_MNEMONIC\" relayer-cf/test test scripts --glob '*test*' --glob '*.mjs' --glob '*.js'
rg -n \""'^test'"\\(\" relayer-cf/test/link-check.test.mjs | wc -l" in /mnt/data/pnouns-voter
 succeeded in 0ms:
scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
8

exec
/bin/bash -lc 'git status --short
git diff --check 3ca7528''^ 3ca7528
node --input-type=module - <<'"'NODE'
import { referencesNounsProposal as ref } from './relayer-cf/src/snap.js';
const cases = [
  ['https://nouns.wtf/vote/989abc', false],
  ['https://nouns.wtf/vote/989%20foo', false],
  ['[t](https://nouns.wtf/vote/989)', true],
  ['https://nouns.wtf/vote/989.後', false],
  ['https://nouns.wtf/vote/989後。', true],
  ['https://nouns.wtf/vote/989偽', true],
];
for (const [s, expected] of cases) console.log("'`${ref(s,989)} expected=${expected} ${s}`);
NODE' in /mnt/data/pnouns-voter
 succeeded in 641ms:
false expected=false https://nouns.wtf/vote/989abc
false expected=false https://nouns.wtf/vote/989%20foo
true expected=true [t](https://nouns.wtf/vote/989)
false expected=false https://nouns.wtf/vote/989.後
true expected=true https://nouns.wtf/vote/989後。
true expected=true https://nouns.wtf/vote/989偽

差分・全呼び出し経路・ABI・境界入力を確認し、テストも完了しました。監査所見を重大度順に整理します。
  ✓ 対象コミットの差分・監査資料・関連コントラクトABIを確認する
  ✓ 5項目の制御フローと境界条件を行番号付きで検証する
  ✓ relayer-cf で npm test を実行する
  → 重大度別の監査報告をまとめる
codex
## 監査結論

対象コミット `3ca7528` のみを検証しました。コントラクト変更・オンチェーン確認は対象外です。

- High: 0件
- Medium: 2件
- Low: 3件
- Info／問題なし: 主要4項目

提案単位の fail-closed と、特に懸念されていた締切後の自己 DoS は、コード上は正しく解消されています。一方、3者分離スクリプトの鍵比較は実際の提案作成鍵と一致しておらず、修正が必要です。

## 指摘事項

### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない

Snapshot 提案作成者 `bot` は、mainnet を含め常に `SEPOLIA_MNEMONIC` から生成されています。

一方、registrar との比較対象は `MAINNET_PROPOSER_MNEMONIC` ですが、この環境変数はリポジトリ内の他の場所では定義・使用されていません。

したがって通常は以下になります。

- `REGISTRAR_MNEMONIC` は必須なので `registrarPhrase` は defined
- `MAINNET_PROPOSER_MNEMONIC` は undefined
- `defined === undefined` は false
- 実際の作成鍵である `SEPOLIA_MNEMONIC` と registrar が同じでも通過する

`undefined === undefined` により常に throw する問題ではなく、逆に比較がほぼ無意味になっています。

さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。

推奨する修正:

- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
- すべての鍵・RPC・deployment 設定を、Snapshot 提案送信より前に検証する。
- mnemonic 文字列ではなく、各 mnemonic から導出したアドレスを比較する。
- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。

### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる

通常値や `0`、負数に対して `Math.max(300, c.minRegistrationDelay)` は正しく300以上になります。

ただし、例えば `MIN_REGISTRATION_DELAY=abc` の場合:

```js
c.minRegistrationDelay === NaN
Math.max(300, NaN) === NaN
Number(delay) < NaN === false
```

となり、オンチェーン値が300未満でも fail-closed しません。「コード上の絶対下限300」という主張は、設定値が数値である場合に限って成立します。

現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。

推奨する修正:

- `cfg()` で `MIN_REGISTRATION_DELAY` が有限の非負整数か検証し、不正なら throw する。
- その後に `Math.max(300, value)` を計算する。

### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る

実測結果は以下です。

- `https://nouns.wtf/vote/989abc` → false
- `https://nouns.wtf/vote/989%20foo` → false
- `[t](https://nouns.wtf/vote/989)` → true
- `https://nouns.wtf/vote/989偽` → true

最後の例は、URLとして解析すればパスは `/vote/989%E5%81%BD` ですが、解析前に `偽` が除去されるため `/vote/989` として受理されます。テスト中の `.../989後に投票` を受理する要件とは本質的に曖昧であり、日本語をURLの一部と後置文に字句上区別できません。

また、2段階replaceの順序により次の取りこぼしがあります。

- `https://nouns.wtf/vote/989.後` → false

最初のreplace時点では末尾が `後` なので `.` が除去されず、次のreplaceで `後` だけ消えて `/989.` が残るためです。数字自体が削られることはありません。

推奨する修正:

- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
- 少なくとも以下をテストへ追加する。
  - `https://nouns.wtf/vote/989abc`
  - `https://nouns.wtf/vote/989%20foo`
  - `https://nouns.wtf/vote/989偽`
  - `https://nouns.wtf/vote/989.後`
  - `[t](https://nouns.wtf/vote/989)`
  - `[t](https://nouns.wtf/vote/989?x=(y))`

### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる

`notified:tx` を送信成功後に保存する順序自体は修正されています。しかし通知失敗時の再送は実際には行われません。

- 署名投票では、通知前に各票を `txStatus: "success"` に変更し、その後summaryへ保存します。次tickでは `"sent"` 対象でなくなるため、同じ通知処理へ戻りません。
- Snapshot投票では、通知前に `snapsent` キーを削除します。通知失敗後、次tickで対象txを特定する情報がありません。

したがって「失敗が続く場合の再送ループ」は発生せず、通知は一度失敗すると失われます。

推奨する修正:

- tx確定状態と「通知済み」を別状態として保持する。
- 通知に失敗した確定txを次tickでも列挙できる pending-notification レコードを残す。
- 通知成功後に pending-notification を削除し、`notified:tx` を保存する。

### [重大度 Low] / [relayer-cf/src/worker.js:53](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:53) / 非Snapshotモードの告知は依然として通知前に告知済みになる

Snapshot分岐は、通知成功後に `putAnnounced()` するよう正しく変更されています。

一方、非Snapshot分岐では現在も:

1. `putAnnounced()`
2. `notify()`

の順です。通知失敗後は永久に再告知されません。mainnet は `SNAPSHOT_SPACE` 必須なので本番mainnetには影響しませんが、サポートされている非Snapshotモードでは残存しています。

推奨する修正:

- 非Snapshot分岐も `if (await notify(...)) await store.putAnnounced(...)` に統一する。

## 検証済み・問題なし

### [重大度 Info] / [relayer-cf/src/snap.js:65](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:65) / `unresolved` の4分類は正しい

分類をコード上で追跡した結果:

- 最初の20件で `snapToNouns` がヒット  
  → `found` に入る  
  → `missing` から除外  
  → `unresolved` には入らない
- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
  → `found` と `meta` に入る  
  → mapping生成
- 未登録、すなわち `nounsToSnap == 0`  
  → `need` に入らない  
  → mappingなし、unresolvedなし
- 登録済みだが200件内で未発見  
  → `unresolved` に入る

要求された4分類に漏れはありません。

### [重大度 Info] / [relayer-cf/src/worker.js:428](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:428), [relayer-cf/src/worker.js:489](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:489) / 締切後の自己DoS・残存fail-openは認められない

`recentProposals()` は直近提案をstateで除外せず返し、その後Workerがstate 0/1をmapping解決・処理対象にしています。

コントラクト側の締切は:

```text
voteDeadline = endBlock - marginBlocks
```

です。したがって通常のexecute窓は、Nouns DAO提案がまだ Active の margin期間内です。そのtickでもstate 1として逆引き対象になり、`snapInfo` を取得できます。

Nouns stateがDefeated/Succeeded等へ変わった後はWorkerループから外れますが、その時点ではNouns DAOへの投票期間自体も終了しているため、今回の変更による新たな自己DoSではありません。

また:

- 未登録提案は `unresolved` ではないものの、`snapInfo` がないためexecuteされない。
- 登録済み未発見は警告後 `continue`。
- Hub例外時はtick全体がreturn。
- `maybeExecute()` 内のexecute済み・`"no votes"` 保存条件は未変更。
- Snapshotモードでは、それらの書き込みへ到達する条件だけが安全側に狭められた。
- `reconcileRecent()` はmapping確認前に動くが、既に送信済みのexecute txを確定するだけで、新規executeは開始しない。

問題ありません。

### [重大度 Info] / [relayer-cf/src/worker.js:407](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:407) / mainnet毎tick確認と3者Set判定は正しい

- mainnetは `spaceCheckedAt` に関係なく毎tick確認。
- testnetは成功時にのみ `spaceCheckedAt` を更新し、その後30分キャッシュ。退行なし。
- チェック失敗時は時刻を更新しないため次tickで再試行。
- mainnet設定のcronは2分間隔なので、追加multicallは約720回/日。1回に4 readを集約しており、KV無料枠には影響しません。RPC利用量は増えますが、既存の提案・mapping照会と比較して限定的です。
- `relayerAddr == null` は `filter(Boolean)` で除外され、読み取り専用モードを誤停止しません。
- アドレスは小文字化され、`Set.size < array.length` により任意の重複を正しく検出します。
- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。

### [重大度 Info] / [relayer-cf/src/worker.js:448](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:448) / unresolved警告のKV負荷は許容範囲

送信成功時のみ、提案ごとに7日TTLのフラグを1回保存します。対象はactiveかつ登録済み未解決の提案に限定されます。

通常時は1提案あたり最大1 write/7日です。送信失敗時はフラグを書かないためKV writeは増えませんが、Discordへの再試行は毎tickになります。無料枠1,000 writes/日に対して十分小さい設計です。

告知の `"late"` 記録は、締切後に古い投票開始通知を送らないための独立した終端状態であり、送信失敗時に `putAnnounced` しない変更とは矛盾しません。

## テスト結果

`/mnt/data/pnouns-voter/relayer-cf` で `npm test` を実行しました。

```text
tests 3
pass 3
fail 0
duration_ms 735.538358
```

3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。

ただし、`resolveMappings()` の4分類、Workerのstate遷移、通知失敗後の再送、mainnet設定検査を直接検証するテストはありません。今回見つかった問題を含め、Worker依存を注入可能にして回帰テストを追加することを推奨します。

作業ツリーは変更していません。
tokens used
76,721
## 監査結論

対象コミット `3ca7528` のみを検証しました。コントラクト変更・オンチェーン確認は対象外です。

- High: 0件
- Medium: 2件
- Low: 3件
- Info／問題なし: 主要4項目

提案単位の fail-closed と、特に懸念されていた締切後の自己 DoS は、コード上は正しく解消されています。一方、3者分離スクリプトの鍵比較は実際の提案作成鍵と一致しておらず、修正が必要です。

## 指摘事項

### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない

Snapshot 提案作成者 `bot` は、mainnet を含め常に `SEPOLIA_MNEMONIC` から生成されています。

一方、registrar との比較対象は `MAINNET_PROPOSER_MNEMONIC` ですが、この環境変数はリポジトリ内の他の場所では定義・使用されていません。

したがって通常は以下になります。

- `REGISTRAR_MNEMONIC` は必須なので `registrarPhrase` は defined
- `MAINNET_PROPOSER_MNEMONIC` は undefined
- `defined === undefined` は false
- 実際の作成鍵である `SEPOLIA_MNEMONIC` と registrar が同じでも通過する

`undefined === undefined` により常に throw する問題ではなく、逆に比較がほぼ無意味になっています。

さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。

推奨する修正:

- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
- すべての鍵・RPC・deployment 設定を、Snapshot 提案送信より前に検証する。
- mnemonic 文字列ではなく、各 mnemonic から導出したアドレスを比較する。
- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。

### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる

通常値や `0`、負数に対して `Math.max(300, c.minRegistrationDelay)` は正しく300以上になります。

ただし、例えば `MIN_REGISTRATION_DELAY=abc` の場合:

```js
c.minRegistrationDelay === NaN
Math.max(300, NaN) === NaN
Number(delay) < NaN === false
```

となり、オンチェーン値が300未満でも fail-closed しません。「コード上の絶対下限300」という主張は、設定値が数値である場合に限って成立します。

現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。

推奨する修正:

- `cfg()` で `MIN_REGISTRATION_DELAY` が有限の非負整数か検証し、不正なら throw する。
- その後に `Math.max(300, value)` を計算する。

### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る

実測結果は以下です。

- `https://nouns.wtf/vote/989abc` → false
- `https://nouns.wtf/vote/989%20foo` → false
- `[t](https://nouns.wtf/vote/989)` → true
- `https://nouns.wtf/vote/989偽` → true

最後の例は、URLとして解析すればパスは `/vote/989%E5%81%BD` ですが、解析前に `偽` が除去されるため `/vote/989` として受理されます。テスト中の `.../989後に投票` を受理する要件とは本質的に曖昧であり、日本語をURLの一部と後置文に字句上区別できません。

また、2段階replaceの順序により次の取りこぼしがあります。

- `https://nouns.wtf/vote/989.後` → false

最初のreplace時点では末尾が `後` なので `.` が除去されず、次のreplaceで `後` だけ消えて `/989.` が残るためです。数字自体が削られることはありません。

推奨する修正:

- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
- 少なくとも以下をテストへ追加する。
  - `https://nouns.wtf/vote/989abc`
  - `https://nouns.wtf/vote/989%20foo`
  - `https://nouns.wtf/vote/989偽`
  - `https://nouns.wtf/vote/989.後`
  - `[t](https://nouns.wtf/vote/989)`
  - `[t](https://nouns.wtf/vote/989?x=(y))`

### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる

`notified:tx` を送信成功後に保存する順序自体は修正されています。しかし通知失敗時の再送は実際には行われません。

- 署名投票では、通知前に各票を `txStatus: "success"` に変更し、その後summaryへ保存します。次tickでは `"sent"` 対象でなくなるため、同じ通知処理へ戻りません。
- Snapshot投票では、通知前に `snapsent` キーを削除します。通知失敗後、次tickで対象txを特定する情報がありません。

したがって「失敗が続く場合の再送ループ」は発生せず、通知は一度失敗すると失われます。

推奨する修正:

- tx確定状態と「通知済み」を別状態として保持する。
- 通知に失敗した確定txを次tickでも列挙できる pending-notification レコードを残す。
- 通知成功後に pending-notification を削除し、`notified:tx` を保存する。

### [重大度 Low] / [relayer-cf/src/worker.js:53](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:53) / 非Snapshotモードの告知は依然として通知前に告知済みになる

Snapshot分岐は、通知成功後に `putAnnounced()` するよう正しく変更されています。

一方、非Snapshot分岐では現在も:

1. `putAnnounced()`
2. `notify()`

の順です。通知失敗後は永久に再告知されません。mainnet は `SNAPSHOT_SPACE` 必須なので本番mainnetには影響しませんが、サポートされている非Snapshotモードでは残存しています。

推奨する修正:

- 非Snapshot分岐も `if (await notify(...)) await store.putAnnounced(...)` に統一する。

## 検証済み・問題なし

### [重大度 Info] / [relayer-cf/src/snap.js:65](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:65) / `unresolved` の4分類は正しい

分類をコード上で追跡した結果:

- 最初の20件で `snapToNouns` がヒット  
  → `found` に入る  
  → `missing` から除外  
  → `unresolved` には入らない
- 最初の20件になく、`nounsToSnap != 0`、200件逆引きで発見  
  → `found` と `meta` に入る  
  → mapping生成
- 未登録、すなわち `nounsToSnap == 0`  
  → `need` に入らない  
  → mappingなし、unresolvedなし
- 登録済みだが200件内で未発見  
  → `unresolved` に入る

要求された4分類に漏れはありません。

### [重大度 Info] / [relayer-cf/src/worker.js:428](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:428), [relayer-cf/src/worker.js:489](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:489) / 締切後の自己DoS・残存fail-openは認められない

`recentProposals()` は直近提案をstateで除外せず返し、その後Workerがstate 0/1をmapping解決・処理対象にしています。

コントラクト側の締切は:

```text
voteDeadline = endBlock - marginBlocks
```

です。したがって通常のexecute窓は、Nouns DAO提案がまだ Active の margin期間内です。そのtickでもstate 1として逆引き対象になり、`snapInfo` を取得できます。

Nouns stateがDefeated/Succeeded等へ変わった後はWorkerループから外れますが、その時点ではNouns DAOへの投票期間自体も終了しているため、今回の変更による新たな自己DoSではありません。

また:

- 未登録提案は `unresolved` ではないものの、`snapInfo` がないためexecuteされない。
- 登録済み未発見は警告後 `continue`。
- Hub例外時はtick全体がreturn。
- `maybeExecute()` 内のexecute済み・`"no votes"` 保存条件は未変更。
- Snapshotモードでは、それらの書き込みへ到達する条件だけが安全側に狭められた。
- `reconcileRecent()` はmapping確認前に動くが、既に送信済みのexecute txを確定するだけで、新規executeは開始しない。

問題ありません。

### [重大度 Info] / [relayer-cf/src/worker.js:407](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:407) / mainnet毎tick確認と3者Set判定は正しい

- mainnetは `spaceCheckedAt` に関係なく毎tick確認。
- testnetは成功時にのみ `spaceCheckedAt` を更新し、その後30分キャッシュ。退行なし。
- チェック失敗時は時刻を更新しないため次tickで再試行。
- mainnet設定のcronは2分間隔なので、追加multicallは約720回/日。1回に4 readを集約しており、KV無料枠には影響しません。RPC利用量は増えますが、既存の提案・mapping照会と比較して限定的です。
- `relayerAddr == null` は `filter(Boolean)` で除外され、読み取り専用モードを誤停止しません。
- アドレスは小文字化され、`Set.size < array.length` により任意の重複を正しく検出します。
- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。

### [重大度 Info] / [relayer-cf/src/worker.js:448](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:448) / unresolved警告のKV負荷は許容範囲

送信成功時のみ、提案ごとに7日TTLのフラグを1回保存します。対象はactiveかつ登録済み未解決の提案に限定されます。

通常時は1提案あたり最大1 write/7日です。送信失敗時はフラグを書かないためKV writeは増えませんが、Discordへの再試行は毎tickになります。無料枠1,000 writes/日に対して十分小さい設計です。

告知の `"late"` 記録は、締切後に古い投票開始通知を送らないための独立した終端状態であり、送信失敗時に `putAnnounced` しない変更とは矛盾しません。

## テスト結果

`/mnt/data/pnouns-voter/relayer-cf` で `npm test` を実行しました。

```text
tests 3
pass 3
fail 0
duration_ms 735.538358
```

3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。

ただし、`resolveMappings()` の4分類、Workerのstate遷移、通知失敗後の再送、mainnet設定検査を直接検証するテストはありません。今回見つかった問題を含め、Worker依存を注入可能にして回帰テストを追加することを推奨します。

作業ツリーは変更していません。
