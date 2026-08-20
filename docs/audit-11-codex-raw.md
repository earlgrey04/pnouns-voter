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
session id: 01a01f37-4780-72c1-8bb3-9ab54014e1e3
--------
user
# 監査依頼 (第11回) — Sepolia 再デプロイの実地検証

あなたは pNouns Voter の第三者監査者です。第10回監査 (あなたの前回の指摘。
`docs/AUDIT-RESPONSE-2026-08-18.md` の末尾と `docs/audit-10-codex-raw.md`) を受けて
コードを修正し、Sepolia に再デプロイしました。**その修正が実際にデプロイ済みの
コントラクトとリレイヤーに正しく反映されているか**を検証してください。

リポジトリ: `/mnt/data/pnouns-voter` (読み取りのみ。**ファイルを変更しないこと**)
直近コミット: `git log --oneline -3` → e11b170 (再デプロイ), 75025cc (第10回監査対応)

## デプロイ内容

- 新 PNounsSnapVoter: `0x64CdACeA6857c6560F3124c532AA4ed34152693F` (Sepolia, chainId 11155111)
- 旧: `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1` (プールは回収済み・使用停止)
- Sourcify で exact_match 検証済み
- リレイヤー (Cloudflare Worker) の `VOTER` を新アドレスへ切り替え済み

**オンチェーン状態の確認にはネットワークアクセスが必要です。**
`.env` の `SEPOLIA_RPC_URL` を使い、`npx hardhat console --network sepolia` や
`npx hardhat run <一時スクリプト> --network sepolia` ではなく、
**読み取り専用の RPC 呼び出し (eth_call / eth_getCode)** で確認してください。
サンドボックスでネットワークが使えない場合は、その旨を明記したうえで
ソースコードと設定ファイルに基づく静的検証だけを行ってください。

## 検証してほしいこと

### A. 第10回指摘の修正が正しく入っているか (ソース)
前回のあなたの指摘 8 件それぞれについて、**修正が主張どおりか、
別の欠陥を持ち込んでいないか**を確認してください。特に:

1. **[前回 High] fail-closed 化** (`relayer-cf/src/worker.js`): `mappingsResolved` による
   早期 return は、本当に告知・投函・execute の全経路を止めているか。
   - `c.snapshotSpace` が未設定のとき (非 Snapshot モード) に誤って止めていないか
   - ハブが「成功したが提案 0 件」を返した場合と「失敗」した場合が区別されているか
   - reconcile / 残高チェックまで巻き添えで止まっていないか (止まるべきか否かも論じること)
2. **[前回 Medium] 告知順序**: `announceNew()` を後ろへ移した結果、
   - 告知済み記録に snapId を含める変更で、**旧形式 (ISO 文字列のみ) の既存レコードが
     誤って再告知されないか**。`"late"` レコードの扱いは壊れていないか
   - `linkBad` / `timelineBad` と告知条件の組み合わせに漏れがないか
     (testnet と mainnet で挙動が違う点も含めて)
3. **[前回 Medium] `referencesNounsProposal()`** (`relayer-cf/src/snap.js`): URL 解析への
   置換で、**以前は検出できていたのに検出できなくなったケース**がないか
   (例: Markdown リンク記法、末尾に句読点が付く URL、全角文字に挟まれた URL、
   改行で分断された URL)。テスト `relayer-cf/test/link-check.test.mjs` の
   網羅性も評価すること
4. **[前回 Medium] `eligibleAtBlock`** (`contracts/PNounsSnapVoter.sol`): 登録時確定の
   実装に穴がないか。特に **`unregisterProposal` → `registerProposal` の再登録で
   猶予が正しくリセットされるか**、`eligibleAtBlock` が 0 のままになる経路
   (旧コントラクトからの移行、未登録 ID への参照) が悪用できないか
5. **[前回 Low] `notify()` の戻り値**: 全呼び出し箇所で戻り値の扱いが一貫しているか。
   戻り値を無視している箇所で、フラグを立てるべきなのに立てない/その逆がないか
6. **[前回 Low] `InvalidSpace`**: 1〜64 bytes の制限は妥当か。境界値の扱い

### B. デプロイの実地確認 (オンチェーン)
7. `0x64CdACe…693F` の実際の状態が意図どおりか:
   `space` = "earl-grey.eth" / `spaceHash` = keccak256(space) / `registrationDelayBlocks` = 5 /
   `marginBlocks` = 5 / `liveMode` = true / `refundEnabled` = true /
   `owner` = `registrar` = `0x10849D31FfEaEca7727af6711A8D1b0a9b738925` /
   残高 ≈ 0.02 ETH / 除外アドレスに Sepolia の pNouns トレジャリーが入っていること
8. **デプロイ済みバイトコードがリポジトリの現在のソースと一致するか**
   (Sourcify の判定を鵜呑みにせず、可能なら自分で確認すること)
9. 旧コントラクト `0x9b4AcC…f5C1` に**残高が残っていないか**、
   まだ Nouns の投票権が委任されたままになっていないか
   (委任先が新アドレスに移っているかを Nouns Token の `delegates()` で確認)
10. リレイヤーの設定 (`relayer-cf/wrangler.toml`) に**旧アドレスの残骸がないか**、
    mainnet 側の設定が誤って有効化されていないか

### C. 明日の本番想定テストに向けた残リスク
11. `registrationDelayBlocks = 5` (約1分) は Sepolia のテスト用としては妥当だが、
    **mainnet では 300 以上でないと Worker が fail-closed する**設計になっている。
    この最低値の検証が、今回の worker 変更後も正しく効くか
12. まだ `owner` と `registrar` と リレイヤーの鍵が**すべて同一アドレス**である。
    本番構成 (3 者分離) に移す際に、コードまたは運用手順で見落としやすい点を挙げること

## 出力形式

日本語。指摘ごとに **[重大度 High/Medium/Low/Info] 見出し / 該当箇所 (file:line または
オンチェーンの値) / 何が起きるか / 推奨する修正**。
「問題なし」と判断した項目も根拠とともに明示すること。
オンチェーン確認ができなかった項目は「未確認」と正直に書くこと(推測で埋めない)。
codex
第11回監査として、まず前回8件の原文・差分・現行テストを突き合わせ、その後に `.env` のRPCへ読み取り専用JSON-RPCを直接投げてデプロイ状態とバイトコードを照合します。リポジトリは一切変更しません。
exec
/bin/bash -lc "git log --oneline -5 && git status --short && rg -n \"mappingsResolved|announceNew|referencesNounsProposal|eligibleAtBlock|notify\\(|InvalidSpace|registrationDelayBlocks|VOTER|liveMode|refundEnabled|registrar|excluded\" docs/AUDIT-RESPONSE-2026-08-18.md docs/audit-10-codex-raw.md relayer-cf contracts test scripts hardhat.config.* 2>/dev/null" in /mnt/data/pnouns-voter
 succeeded in 0ms:
e11b170 Sepolia 再デプロイ: 0x64CdACeA6857c6560F3124c532AA4ed34152693F
75025cc 第10回監査(Codex)対応: ハブ障害時の fail-open を修正ほか
0a98a23 資料修正(7点)と対応付けの自動照合を追加
8e1451b Doc: add what this design fixes vs what remains (Snapshot's off-chain limitations)
57f9a03 Doc: add verification-gates section (how the contract validates each vote) and clarify the mapping trust point is automated-but-key-trusted
docs/AUDIT-RESPONSE-2026-08-18.md:12:| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
docs/AUDIT-RESPONSE-2026-08-18.md:25:| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/AUDIT-RESPONSE-2026-08-18.md:143:| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:146:| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
docs/AUDIT-RESPONSE-2026-08-18.md:148:| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |
docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-10-codex-raw.md:29:この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。
docs/audit-10-codex-raw.md:55:`announceNew()` は `linkOk` 判定より先に実行されます。不一致 mapping の最初の tick では、
docs/audit-10-codex-raw.md:68:- `announceNew()` を `linkOk` と timeline 検証の後へ移動する。
docs/audit-10-codex-raw.md:102:受付判定は登録時に確定した期限ではなく、現在のグローバル `registrationDelayBlocks` を毎回参照します。登録後に owner が値をゼロへ変更すれば即時受付可能です。
docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-10-codex-raw.md:121:- `notify()` は network error を内部で握りつぶします。
relayer-cf/wrangler.toml:19:VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
relayer-cf/wrangler.toml:46:VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
test/fork.e2e.test.js:268:  it("シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ", async function () {
test/fork.e2e.test.js:277:    // liveMode に戻せば同じ提案を本投票できる
relayer-cf/test/link-check.test.mjs:1:// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
relayer-cf/test/link-check.test.mjs:5:import { referencesNounsProposal as ref } from "../src/snap.js";
scripts/create-and-register.mjs:65:  // オンチェーンの対応付け(registrar)
scripts/create-and-register.mjs:70:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
scripts/create-and-register.mjs:74:  const delay = Number(await c.registrationDelayBlocks());
scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
scripts/sepolia/03-deploy-voter.js:23:  console.log("pNouns Voter:", dep.voter, "liveMode=true margin=", String(margin));
scripts/sepolia/10-register-ens.js:3:// base registrar のコントローラーから外された)のため、現在 .eth の新規登録は全体的に失敗する。
scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
scripts/sepolia/12-deploy-snapvoter.js:1:// PNounsSnapVoter を Sepolia にデプロイ(space=earl-grey.eth、margin=5、registrar=deployer)し、返金プールを入れて委任を切り替える
scripts/sepolia/12-deploy-snapvoter.js:12:  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
scripts/sepolia/12-deploy-snapvoter.js:13:  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
scripts/sepolia/12-deploy-snapvoter.js:14:  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
contracts/PNounsVoter.sol:29: *  - liveMode=false のあいだは Nouns DAO を呼ばず結果イベントだけ出す(シャドー運用用。executed は立てないので、
contracts/PNounsVoter.sol:30: *    後で liveMode=true にすれば同じ提案を本投票できる)。
contracts/PNounsVoter.sol:61:    mapping(address => bool) public excluded;
contracts/PNounsVoter.sol:65:    bool public liveMode;
contracts/PNounsVoter.sol:67:    bool public refundEnabled = true;
contracts/PNounsVoter.sol:127:        address[] memory excluded_,
contracts/PNounsVoter.sol:133:        for (uint256 i = 0; i < excluded_.length; i++) {
contracts/PNounsVoter.sol:134:            excluded[excluded_[i]] = true;
contracts/PNounsVoter.sol:135:            emit ExcludedSet(excluded_[i], true);
contracts/PNounsVoter.sol:141:        excluded[account] = isExcluded;
contracts/PNounsVoter.sol:151:        liveMode = live;
contracts/PNounsVoter.sol:156:        refundEnabled = enabled;
contracts/PNounsVoter.sol:259:        if (!refundEnabled) return;
contracts/PNounsVoter.sol:286:        if (excluded[voter]) revert ExcludedVoter(voter);
contracts/PNounsVoter.sol:329:    /// @notice 締切後に誰でも呼べる。結果を Nouns DAO に投票する(liveMode 時)。ガスは Nouns の refund で執行者に戻る。
contracts/PNounsVoter.sol:339:        if (!liveMode) {
contracts/PNounsVoter.sol:340:            // シャドー運用: 結果イベントだけ出し、executed は立てない(後で liveMode=true にすれば本投票できる)
contracts/PNounsSnapVoter.sol:30: *  - registrar が「Snapshot 提案(文字列 id) ↔ Nouns 提案 id」の対応を事前登録する(各 1 回のみ・公開情報なので誰でも検証可)。
contracts/PNounsSnapVoter.sol:36: *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
contracts/PNounsSnapVoter.sol:62:    mapping(address => bool) public excluded;
contracts/PNounsSnapVoter.sol:64:    bool public liveMode;
contracts/PNounsSnapVoter.sol:66:    address public registrar;
contracts/PNounsSnapVoter.sol:68:    bool public refundEnabled = true;
contracts/PNounsSnapVoter.sol:89:    uint256 public registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:123:    event RegistrarSet(address registrar);
contracts/PNounsSnapVoter.sol:140:    error InvalidSpace();
contracts/PNounsSnapVoter.sol:152:        address pnouns_, address nounsDAO_, address owner_, address registrar_,
contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
contracts/PNounsSnapVoter.sol:157:        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
contracts/PNounsSnapVoter.sol:160:        registrar = registrar_;
contracts/PNounsSnapVoter.sol:162:        registrationDelayBlocks = registrationDelayBlocks_;
contracts/PNounsSnapVoter.sol:163:        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
contracts/PNounsSnapVoter.sol:167:    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
contracts/PNounsSnapVoter.sol:169:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
contracts/PNounsSnapVoter.sol:170:    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
contracts/PNounsSnapVoter.sol:173:    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
contracts/PNounsSnapVoter.sol:180:        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:195:        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
contracts/PNounsSnapVoter.sol:292:        if (excluded[voter]) revert ExcludedVoter(voter);
contracts/PNounsSnapVoter.sol:370:        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
contracts/PNounsSnapVoter.sol:428:        if (!refundEnabled) return;
relayer-cf/src/worker.js:8:async function notify(c, text) {
relayer-cf/src/worker.js:28:async function announceNew(c, pc, store, p, block, snapInfo) {
relayer-cf/src/worker.js:39:    await notify(c, [
relayer-cf/src/worker.js:53:  await notify(c, [
relayer-cf/src/worker.js:108:      await notify(c, [
relayer-cf/src/worker.js:143:      await notify(c, [
relayer-cf/src/worker.js:195:        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
relayer-cf/src/worker.js:224:            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
relayer-cf/src/worker.js:311:        await notify(c, [
relayer-cf/src/worker.js:319:        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
relayer-cf/src/worker.js:321:        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
relayer-cf/src/worker.js:327:  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
relayer-cf/src/worker.js:334:    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
relayer-cf/src/worker.js:355:    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
relayer-cf/src/worker.js:385:  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
relayer-cf/src/worker.js:401:    let mappingsResolved = false;
relayer-cf/src/worker.js:407:          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
relayer-cf/src/worker.js:410:        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
relayer-cf/src/worker.js:417:        mappingsResolved = true;
relayer-cf/src/worker.js:424:      if (!mappingsResolved) return;
relayer-cf/src/worker.js:435:          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
relayer-cf/src/worker.js:443:            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
relayer-cf/src/worker.js:451:          await announceNew(c, pc, store, p, block, snapInfo);
relayer-cf/src/index.js:123:  const [state, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
relayer-cf/src/index.js:127:    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
relayer-cf/src/index.js:130:  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
relayer-cf/src/snap.js:48:export function referencesNounsProposal(text, nounsId) {
relayer-cf/src/snap.js:95:    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
relayer-cf/src/snap.js:97:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
relayer-cf/src/abi.js:256:  "name": "excluded",
relayer-cf/src/abi.js:330:  "name": "liveMode",
relayer-cf/src/abi.js:375:  "name": "refundEnabled",
relayer-cf/src/abi.js:426:  "name": "registrationDelayBlocks",
relayer-cf/src/chain.js:29:    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
relayer-cf/src/chain.js:37:    metagov: getAddress(env.VOTER),
relayer-cf/src/chain.js:180:      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
relayer-cf/src/chain.js:191:    liveMode: !!live,

exec
/bin/bash -lc "git show --stat --oneline 75025cc && git show --format=fuller --find-renames 75025cc -- contracts/PNounsSnapVoter.sol relayer-cf/src/worker.js relayer-cf/src/snap.js relayer-cf/test/link-check.test.mjs test/snap.fork.test.js relayer-cf/test && sed -n '130,160p' docs/AUDIT-RESPONSE-2026-08-18.md && sed -n '1,470p' relayer-cf/src/worker.js && sed -n '1,150p' relayer-cf/src/snap.js && sed -n '140,310p' contracts/PNounsSnapVoter.sol" in /mnt/data/pnouns-voter
 succeeded in 0ms:
75025cc 第10回監査(Codex)対応: ハブ障害時の fail-open を修正ほか
 contracts/PNounsSnapVoter.sol       |  13 ++-
 docs/AUDIT-RESPONSE-2026-08-18.md   |  22 ++++
 docs/audit-10-codex-raw.md          | 202 ++++++++++++++++++++++++++++++++++++
 docs/member-proposal-unified.html   |   4 +-
 relayer-cf/src/snap.js              |  24 ++++-
 relayer-cf/src/worker.js            |  62 +++++++----
 relayer-cf/test/link-check.test.mjs |  42 ++++++++
 test/snap.fork.test.js              |  19 ++++
 8 files changed, 360 insertions(+), 28 deletions(-)
commit 75025ccfba9ebdedf5963e1392dbd81c53ed95a1
Author:     earlgrey <[redacted-email]>
AuthorDate: Thu Aug 20 21:25:39 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Thu Aug 20 21:25:39 2026 +0900

    第10回監査(Codex)対応: ハブ障害時の fail-open を修正ほか
    
    High:
    - 対応表を解決できなかった tick で告知・投函・execute を続行していた
      (snapInfo=null により linkOk / timeline チェックが素通りし、部分集計や
      "no votes" が最終結果として確定しうる)。mappingsResolved を導入して
      tick 全体を fail-closed に
    
    Medium:
    - URL 照合を正規表現から URL 解析へ。evilnouns.wtf / fake.nouns.wtf /
      大文字ホスト / 前方一致(/vote/12 vs /vote/123)を厳密に扱う
    - 告知を照合・締切チェックの後ろへ移動。不一致の Snapshot URL を先に
      告知して「告知済み」で固定してしまう問題を解消。告知済み記録に
      snapId を含め、対応表の張り替え後に再告知できるように
    - eligibleAtBlock を登録時に確定。owner が後から registrationDelayBlocks
      を下げても、登録済み提案の受付猶予は短縮されない
    - worker の spaceHash / 最低 delay 確認を 30 分ごとに再実施
    
    Low:
    - notify() の成否を確認し、送信成功時のみ警告抑止フラグを立てる
    - space の長さを 1〜64 bytes に制限 (InvalidSpace)
    - 照合ロジックの回帰テスト 22 ケースと、delay 不変条件のフォークテストを追加
    
    資料:
    - 自動照合の限界(自己申告 URL なので取り違え事故は捕まえるが、鍵の
      乗っ取りは見抜けない)を明記
    - 取消条件を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正
    
    テスト: relayer 22 pass / contracts 8 pass (fork)
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/contracts/PNounsSnapVoter.sol b/contracts/PNounsSnapVoter.sol
index 302ec33..51d4831 100644
--- a/contracts/PNounsSnapVoter.sol
+++ b/contracts/PNounsSnapVoter.sol
@@ -89,6 +89,8 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
     uint256 public registrationDelayBlocks;
     /// Nouns 提案 id → 登録ブロック
     mapping(uint256 => uint256) public registeredAtBlock;
+    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
+    mapping(uint256 => uint256) public eligibleAtBlock;
     /// keccak(Snapshot 提案 id 文字列) → Nouns 提案 id
     mapping(bytes32 => uint256) public snapToNouns;
     /// Nouns 提案 id → keccak(Snapshot 提案 id 文字列)
@@ -135,6 +137,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
     error VotingNotClosed();
     error StaleVote();
     error RegistrationTooRecent();
+    error InvalidSpace();
     error VotesAlreadyCounted();
     error InvalidFromAddress();
     error InvalidContractSignature();
@@ -151,6 +154,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
     ) Ownable(owner_) {
         pnouns = IERC721(pnouns_);
         nounsDAO = INounsDAO(nounsDAO_);
+        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
         spaceHash = keccak256(bytes(space_));
         space = space_;
         registrar = registrar_;
@@ -164,6 +168,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
     function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
     function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
     function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
+    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
     function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
     function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
     function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
@@ -179,6 +184,9 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
         snapToNouns[h] = nounsProposalId;
         nounsToSnap[nounsProposalId] = h;
         registeredAtBlock[nounsProposalId] = block.number;
+        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
+        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
+        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
         emit ProposalRegistered(nounsProposalId, snapshotProposal);
     }
 
@@ -191,6 +199,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
         delete snapToNouns[h];
         delete nounsToSnap[nounsProposalId];
         delete registeredAtBlock[nounsProposalId];
+        delete eligibleAtBlock[nounsProposalId];
         emit ProposalUnregistered(nounsProposalId, h);
     }
 
@@ -246,7 +255,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
         bytes32 firstProp = keccak256(bytes(votes[0].proposal));
         uint256 nounsId = snapToNouns[firstProp];
         if (nounsId == 0) revert NotRegistered();
-        if (block.number < registeredAtBlock[nounsId] + registrationDelayBlocks) revert RegistrationTooRecent(); // 誤登録の取消猶予
+        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
         uint32 snapCounted;
         for (uint256 i = 0; i < votes.length; i++) {
             SnapVote calldata v = votes[i];
@@ -273,7 +282,7 @@ contract PNounsSnapVoter is Ownable, ReentrancyGuard {
         uint256 startGas = gasleft();
         if (support > ABSTAIN) revert InvalidChoice();
         // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
-        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < registeredAtBlock[nounsProposalId] + registrationDelayBlocks) revert RegistrationTooRecent();
+        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
         _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
         _refundGas(startGas, 1, nounsProposalId);
     }
diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
index 8edf2f3..6bb6c40 100644
--- a/relayer-cf/src/snap.js
+++ b/relayer-cf/src/snap.js
@@ -42,6 +42,23 @@ async function hubGql(c, query) {
 /// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
 /// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
 ///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
+// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
+// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
+// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
+export function referencesNounsProposal(text, nounsId) {
+  const id = Number(nounsId);
+  if (!Number.isSafeInteger(id) || id <= 0) return false;
+  const s = String(text || "");
+  if (!s) return false;
+  for (const raw of s.match(/https?:\/\/[^\s<>"'`)\]]+/gi) || []) {
+    let u;
+    try { u = new URL(raw); } catch { continue; }
+    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
+    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
+  }
+  return false;
+}
+
 export async function resolveMappings(c, pc, activeNounsIds = []) {
   const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
   if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
@@ -74,9 +91,10 @@ export async function resolveMappings(c, pc, activeNounsIds = []) {
   const mappings = [...found.entries()].map(([nounsId, snapId]) => {
     const m = meta.get(snapId) || {};
     // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
-    // 登録の取り違えやプログラムの不具合を、票が入る前に検出するための仕掛け。
-    const needle = new RegExp(`nouns\\.wtf/vote/${nounsId}(\\b|$)`);
-    const linkOk = needle.test(String(m.discussion || "")) || needle.test(String(m.body || ""));
+    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
+    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
+    // 侵害)は検出できない。過信しないこと。
+    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   });
   return { mappings };
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index 33e5daa..f6bbb14 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -7,9 +7,13 @@ import { makeStore } from "./store.js";
 
 async function notify(c, text) {
   console.log("[notify]", text.replace(/\n/g, " ⏎ "));
-  if (!c.discordWebhook) return;
-  try { await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) }); }
-  catch (e) { console.warn("discord notify failed", e.message); }
+  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
+  try {
+    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
+    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
+    return true;
+  }
+  catch (e) { console.warn("discord notify failed", e.message); return false; }
 }
 const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
 const WORDS = ["反対", "賛成", "棄権"];
@@ -22,14 +26,16 @@ function isContractRevert(e) {
 }
 
 async function announceNew(c, pc, store, p, block, snapInfo) {
-  if (await store.getAnnounced(p.id)) return;
+  const prev = await store.getAnnounced(p.id);
+  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
+  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
   const mg = await metagovInfo(c, pc, p.id);
   if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
   if (c.snapshotSpace) {
     if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
     const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
     const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
-    await store.putAnnounced(p.id, new Date().toISOString());
+    await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
     await notify(c, [
       `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
       `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
@@ -380,7 +386,8 @@ export async function notifyError(c, where, e) {
 }
 
 let lastBalanceCheck = 0;
-let spaceChecked = false;
+let spaceCheckedAt = 0;
+const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
 export async function tick(env) {
   const c = cfg(env);
   const { publicClient: pc, walletClient: wc } = clients(c);
@@ -391,48 +398,61 @@ export async function tick(env) {
     await reconcileRecent(c, pc, wc, store, proposals);
     // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
     let snapByNouns = new Map();
+    let mappingsResolved = false;
     if (c.snapshotSpace) {
       // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
-      if (!spaceChecked) {
+      if (Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
         const [onchain, delay] = await pc.multicall({ contracts: [
           { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
           { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
         ], allowFailure: false });
         if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
         if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
-        spaceChecked = true;
+        spaceCheckedAt = Date.now();
       }
       try {
         const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
         const { mappings } = await resolveMappings(c, pc, active);
         snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
+        mappingsResolved = true;
       }
       catch (e) { await notifyError(c, "snapshot hub", e); }
+      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
+      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
+      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
+      // 最終結果として確定してしまう。
+      if (!mappingsResolved) return;
     }
     for (const p of proposals) {
       if (p.state !== 0 && p.state !== 1) continue;
       try {
         const snapInfo = snapByNouns.get(p.id) || null;
-        if (c.announce) await announceNew(c, pc, store, p, block, snapInfo);
         const mg = await metagovInfo(c, pc, p.id);
-        if (!wc) continue;
         // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
-        if (c.snapshotSpace && snapInfo && snapInfo.linkOk === false) {
-          if (!(await store.getFlag(`linkwarn:${p.id}`))) {
-            await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
-            await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
-          }
-          if (c.network === "mainnet") continue;
+        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
+        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
+          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
+          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
+          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
         }
         // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
+        let timelineBad = false;
         if (c.snapshotSpace && snapInfo) {
-          const timelineSafe = snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
-          if (!timelineSafe && !(await store.getFlag(`endwarn:${p.id}`))) {
-            await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
-            await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
+          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
+          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
+            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
+            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
           }
-          if (!timelineSafe && c.network === "mainnet") continue;
         }
+        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
+        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
+        // 「告知済み」が記録されて正しい URL の再告知も止まる。
+        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
+          await announceNew(c, pc, store, p, block, snapInfo);
+        }
+        if (linkBad && c.network === "mainnet") continue;
+        if (timelineBad && c.network === "mainnet") continue;
+        if (!wc) continue;
         if (block < mg.deadline) {
           if (c.snapshotSpace) {
             if (snapInfo) {
diff --git a/relayer-cf/test/link-check.test.mjs b/relayer-cf/test/link-check.test.mjs
new file mode 100644
index 0000000..06933f3
--- /dev/null
+++ b/relayer-cf/test/link-check.test.mjs
@@ -0,0 +1,42 @@
+// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
+// 第10回監査の指摘: 前方一致・偽ドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null を検証すること。
+import { test } from "node:test";
+import assert from "node:assert/strict";
+import { referencesNounsProposal as ref } from "../src/snap.js";
+
+test("正規の URL を検出する", () => {
+  assert.equal(ref("https://nouns.wtf/vote/989", 989), true);
+  assert.equal(ref("Source: https://nouns.wtf/vote/989\n本文", 989), true);
+  assert.equal(ref("https://nouns.wtf/vote/989/", 989), true);
+  assert.equal(ref("https://nouns.wtf/vote/989?tab=activity", 989), true);
+  assert.equal(ref("https://nouns.wtf/vote/989#comments", 989), true);
+  assert.equal(ref("https://www.nouns.wtf/vote/989", 989), true);
+  assert.equal(ref("HTTPS://NOUNS.WTF/vote/989", 989), true, "ホスト名は大文字小文字を区別しない");
+  assert.equal(ref("(https://nouns.wtf/vote/989)", 989), true, "括弧で閉じられていても拾う");
+  assert.equal(ref("http://nouns.wtf/vote/989", 989), true);
+});
+
+test("前方一致で誤検出しない", () => {
+  assert.equal(ref("https://nouns.wtf/vote/123", 12), false);
+  assert.equal(ref("https://nouns.wtf/vote/12", 123), false);
+  assert.equal(ref("https://nouns.wtf/vote/9890", 989), false);
+});
+
+test("別ドメイン・別パスを拒否する", () => {
+  assert.equal(ref("https://evilnouns.wtf/vote/989", 989), false);
+  assert.equal(ref("https://nouns.wtf.evil.com/vote/989", 989), false);
+  assert.equal(ref("https://fake.nouns.wtf/vote/989", 989), false, "サブドメインは別ホスト");
+  assert.equal(ref("https://nouns.wtf/vote/989/extra", 989), false);
+  assert.equal(ref("https://nouns.wtf/proposal/989", 989), false);
+  assert.equal(ref("nouns.wtf/vote/989", 989), false, "スキームなしの裸文字列は URL として扱わない");
+});
+
+test("空・null・不正な入力で例外を投げず false を返す", () => {
+  for (const v of [null, undefined, "", 0, {}, []]) assert.equal(ref(v, 989), false);
+  for (const id of [null, undefined, 0, -1, NaN, "abc", 1e21]) assert.equal(ref("https://nouns.wtf/vote/989", id), false);
+});
+
+test("正規表現メタ文字を含む入力で壊れない", () => {
+  assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
+  assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
+});
diff --git a/test/snap.fork.test.js b/test/snap.fork.test.js
index 3ad1bbd..3ea0798 100644
--- a/test/snap.fork.test.js
+++ b/test/snap.fork.test.js
@@ -227,6 +227,25 @@ describe("PNounsSnapVoter (mainnet fork)", function () {
       await expect(voterC.unregisterProposal(proposalId)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
     });
 
+    it("第10回監査 M-2 対策: 登録後に owner が delay を下げても、その提案の受付は前倒しされない", async function () {
+      await voterC.setRegistrationDelayBlocks(1000);
+      const SNAP_Z = "0x" + "5c".repeat(32);
+      await voterC.registerProposal(SNAP_Z, 777777);
+      const eligible = await voterC.eligibleAtBlock(777777);
+      expect(eligible).to.be.greaterThan(BigInt(await ethers.provider.getBlockNumber()));
+      // owner が猶予を 0 に短縮しても、登録済みの提案の解禁ブロックは動かない
+      await voterC.setRegistrationDelayBlocks(0);
+      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
+      const [, , , , , , , , , , grace] = await ethers.getSigners();
+      const vz = await signSnapVote(grace, SNAP_Z, 1, 1786902000);
+      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
+      await expect(voterC.castVote(777777, 0, [1n])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
+      // 解禁ブロックまで進めば、猶予は明けている(取消猶予は必ず確保されたうえで受付が始まる)
+      await ethers.provider.send("hardhat_mine", ["0x" + (eligible - BigInt(await ethers.provider.getBlockNumber())).toString(16)]);
+      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.not.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
+      await voterC.unregisterProposal(777777).catch(() => {});
+    });
+
     it("H02R 対策: 猶予期間中は直接投票も不可。直接投票だけなら取消できる", async function () {
       const { id: pid4, snap: SNAP4 } = await newProposalWithSnap("r");
       await voterC.setRegistrationDelayBlocks(1000);
再検証: フォークテスト 17 本 / Worker テスト 17 本 / Sepolia ライブ E2E(Prop 526: 3 票 → 賛成 3・棄権 3 → 投票者 2:1 で賛成 → Nouns DAO に賛成 2 票)。

---

## 第10回監査 (2026-08-20, Codex CLI 0.145.0 / read-only) — 対応付けの自動照合

対象: commit 0a98a23 (relayer の自動照合追加) と、それが依拠するコントラクト側の保証。
生ログ: `docs/audit-10-codex-raw.md`

| # | 重大度 | 指摘 | 対応 |
|---|---|---|---|
| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
| 7 | Low | 照合ロジックに回帰テストがない | 修正: `relayer-cf/test/link-check.test.mjs` を追加(前方一致・偽ドメイン・サブドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null・メタ文字の 22 ケース) |
| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |

問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。

**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
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
const WORDS = ["反対", "賛成", "棄権"];

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
    await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    await notify(c, [
      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
      `締切: ${jst} ごろ (block ${mg.deadline})`,
      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    ].join("\n"));
    return;
  }
  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
  const deadlineBlock = mg.deadline || p.endBlock;
  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
  await store.putAnnounced(p.id, new Date().toISOString());
  await notify(c, [
    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    `投票ページ: ${c.publicUrl}`,
    `提案の内容: https://nouns.wtf/vote/${p.id}`,
  ].join("\n"));
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
      await store.setFlag(`notified:${tx}`, 86400);
      const mg = await metagovInfo(c, pc, proposalId);
      await notify(c, [
        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
        `tx: ${explorerTx(c, tx)}`,
      ].join("\n"));
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
      await store.setFlag(`notified:${pending.txs[0]}`, 86400);
      const mg = await metagovInfo(c, pc, nounsId);
      await notify(c, [
        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
        `tx: ${explorerTx(c, pending.txs[0])}`,
      ].join("\n"));
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
      const good = [];
      for (const a2 of chunk.slice(0, 10)) {
        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
        catch (e2) {
          const cid = cidOf.get(a2);
          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
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
    let rc = null;
    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
    const info = await metagovInfo(c, pc, p.id);
    if (rc && rc.status === "success") {
      if (info.executed) {
        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
        await notify(c, [
          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
          `tx: ${explorerTx(c, ex.tx)}`,
          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
        ].filter(Boolean).join("\n"));
      } else {
        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
      }
    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
    else await store.putExecuted(p.id, null); // 未実行 → 再試行
    return;
  }
  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
  if (ex && !ex.shadow) return;
  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
  if (mg.deadline === 0 || block < mg.deadline) return;
  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
    return;
  }
  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
}

// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
async function checkBalance(c, pc, wc, store) {
  const threshold = Number(c.lowBalanceEth);
  const checks = [];
  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
  for (const ck of checks) {
    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
    if (await store.getFlag(ck.key)) continue;
    await store.setFlag(ck.key, 86400);
    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
  }
}

// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
async function reconcileRecent(c, pc, wc, store, proposals) {
  for (const p of proposals.slice(0, 15)) {
    try {
      const pid = String(p.id);
      const sum = await store.getSummary(pid);
      if (sum.votes.some((v) => v.txStatus === "sent")) {
        const summaries = [...sum.votes];
        await reconcileSent(c, pc, store, pid, summaries);
      }
      const ex = await store.getExecuted(pid);
      if (ex && ex.pending && ex.tx) {
        const mg = await metagovInfo(c, pc, pid);
        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
      }
    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
  }
}

// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
let lastErrNotify = 0;
export async function notifyError(c, where, e) {
  const msg = (e && (e.shortMessage || e.message)) || String(e);
  console.error(`[${where}]`, msg);
  if (Date.now() - lastErrNotify < 3600 * 1000) return;
  lastErrNotify = Date.now();
  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
}

let lastBalanceCheck = 0;
let spaceCheckedAt = 0;
const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc } = clients(c);
  const store = makeStore(env.STATE, storeNs(c));
  try {
    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
    const { block, proposals } = await recentProposals(c, pc);
    await reconcileRecent(c, pc, wc, store, proposals);
    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
    let snapByNouns = new Map();
    let mappingsResolved = false;
    if (c.snapshotSpace) {
      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
      if (Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
        const [onchain, delay] = await pc.multicall({ contracts: [
          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
        ], allowFailure: false });
        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
        spaceCheckedAt = Date.now();
      }
      try {
        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
        const { mappings } = await resolveMappings(c, pc, active);
        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
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
            if (snapInfo) {
              const rush = shouldRushSubmit(c, block, mg.deadline);
              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
            }
          }
          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
        } else await maybeExecute(c, pc, wc, store, p, block, mg);
      } catch (e) {
        await notifyError(c, `worker prop ${p.id}`, e);
      }
    }
  } catch (e) {
    await notifyError(c, "worker tick", e);
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
async function hubGql(c, query) {
  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  if (!j.data) throw new Error("hub graphql: no data");
  return j.data;
}

/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
export function referencesNounsProposal(text, nounsId) {
  const id = Number(nounsId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const s = String(text || "");
  if (!s) return false;
  for (const raw of s.match(/https?:\/\/[^\s<>"'`)\]]+/gi) || []) {
    let u;
    try { u = new URL(raw); } catch { continue; }
    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
  }
  return false;
}

export async function resolveMappings(c, pc, activeNounsIds = []) {
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
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
  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
  if (missing.length) {
    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    const need = [];
    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    if (need.length) {
      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
      for (const n of need) {
        const p = byHash.get(n.hash);
        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
        else console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`);
      }
    }
  }
  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    const m = meta.get(snapId) || {};
    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
    // 侵害)は検出できない。過信しないこと。
    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
  });
  return { mappings };
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
    error InvalidSpace();
    error VotesAlreadyCounted();
    error InvalidFromAddress();
    error InvalidContractSignature();
    error NotTokenOwner(uint256 tokenId, address owner);
    error ExcludedVoter(address voter);
    error NothingCounted();
    error AlreadyExecuted();
    error NoVotes();
    error MixedProposals();

    constructor(
        address pnouns_, address nounsDAO_, address owner_, address registrar_,
        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
    ) Ownable(owner_) {
        pnouns = IERC721(pnouns_);
        nounsDAO = INounsDAO(nounsDAO_);
        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
        spaceHash = keccak256(bytes(space_));
        space = space_;
        registrar = registrar_;
        marginBlocks = marginBlocks_;
        registrationDelayBlocks = registrationDelayBlocks_;
        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
    }

    // ---- 設定 ----
    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
    receive() external payable {}

    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = keccak256(bytes(snapshotProposal));
        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
        if (nounsProposalId == 0) revert NotRegistered();
        snapToNouns[h] = nounsProposalId;
        nounsToSnap[nounsProposalId] = h;
        registeredAtBlock[nounsProposalId] = block.number;
        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
        emit ProposalRegistered(nounsProposalId, snapshotProposal);
    }

    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
    function unregisterProposal(uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = nounsToSnap[nounsProposalId];
        if (h == bytes32(0)) revert NotRegistered();
        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
        delete snapToNouns[h];
        delete nounsToSnap[nounsProposalId];
        delete registeredAtBlock[nounsProposalId];
        delete eligibleAtBlock[nounsProposalId];
        emit ProposalUnregistered(nounsProposalId, h);
    }

    // ---- 参照 ----
    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
        Tally storage t = _tallies[proposalId];
        (tokens, voters) = _arrays(t);
        return (tokens, voters, t.executed, t.result);
    }
    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
    }
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }

    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
        (bool ok, bytes memory data) = address(nounsDAO).staticcall(abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId));
        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
        uint256 id; uint256 startBlock; uint256 endBlock;
        assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
        return endBlock;
    }
    function voteDeadline(uint256 proposalId) public view returns (uint256) {
        uint256 endBlock = nounsEndBlock(proposalId);
        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
    }
    function currentResult(uint256 proposalId) public view returns (uint8) {
        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
        return _decide(tokens, voters);
    }

    /// @notice Snapshot の Vote メッセージの EIP-712 ダイジェスト
    function snapVoteDigest(SnapVote calldata v) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            SNAP_VOTE_TYPEHASH,
            keccak256(bytes(v.from)),
            spaceHash, // space は本コントラクトのスペースに固定(異なる space の署名は復元アドレスが一致しない)
            v.timestamp,
            keccak256(bytes(v.proposal)),
            v.choice,
            keccak256(bytes(v.reason)),
            keccak256(bytes(v.app)),
            keccak256(bytes(v.metadata))
        ));
        return keccak256(abi.encodePacked("\x19\x01", SNAP_DOMAIN_SEPARATOR, structHash));
    }

    // ---- 投票 ----
    /// @notice Snapshot の投票署名をまとめて検証・集計する。誰でも呼べ、ガスは預け金から払い戻し。1 バッチ 1 提案。
    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
        uint256 startGas = gasleft();
        if (votes.length == 0) return;
        bytes32 firstProp = keccak256(bytes(votes[0].proposal));
        uint256 nounsId = snapToNouns[firstProp];
        if (nounsId == 0) revert NotRegistered();
        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
        uint32 snapCounted;
        for (uint256 i = 0; i < votes.length; i++) {
            SnapVote calldata v = votes[i];
            if (keccak256(bytes(v.proposal)) != firstProp) revert MixedProposals();
            bytes32 digest = snapVoteDigest(v);
            address fromAddr = _parseAddress(v.from);
            if (fromAddr.code.length == 0) {
                // EOA: ECDSA 復元が from と一致すること
                if (ECDSA.recover(digest, v.signature) != fromAddr) revert FromMismatch();
            } else {
                // スマートウォレット(Safe 等): EIP-1271 で検証
                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
            }
            uint8 support = _choiceToSupport(v.choice);
            snapCounted += _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
        }
        snapshotVotesCounted[nounsId] += snapCounted;
        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
        _refundGas(startGas, votes.length, nounsId);
    }

    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
        uint256 startGas = gasleft();
        if (support > ABSTAIN) revert InvalidChoice();
        // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
        _refundGas(startGas, 1, nounsProposalId);
    }

    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal returns (uint32) {
        if (tokenIds.length == 0) revert NoTokenIds();
        if (excluded[voter]) revert ExcludedVoter(voter);

        Tally storage t = _tallies[proposalId];
        uint256 deadline = t.deadline;
        if (deadline == 0) {
            uint8 st = nounsDAO.state(proposalId);
            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
            deadline = voteDeadline(proposalId);
            t.deadline = uint48(deadline);
        }
        if (block.number >= deadline) revert VotingClosed();

        VoterRec storage rec = voterRec[proposalId][voter];
        bool supplement = rec.exists && timestamp == rec.timestamp && digest == rec.digest; // 同一署名の再提出 = token の補完(先回り 1 枚投函への対策)
        if (rec.exists && !supplement && timestamp <= rec.timestamp) revert StaleVote(); // やり直しは新しい署名のみ

        uint256 counted = _countTokens(proposalId, voter, tokenIds);

        if (!rec.exists) {

exec
/bin/bash -lc "sed -n '1,220p' docs/audit-10-codex-raw.md && nl -ba relayer-cf/src/worker.js | sed -n '1,470p' && nl -ba relayer-cf/src/snap.js | sed -n '35,120p' && nl -ba relayer-cf/test/link-check.test.mjs && nl -ba relayer-cf/src/store.js | sed -n '1,180p' && nl -ba relayer-cf/src/chain.js | sed -n '1,230p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
- 締切前は投函が止まりますが、締切後は `maybeExecute()` に入り、障害前までに計上された部分集計を Nouns DAO へ投票できます。
- 一度も計上されていなければ `"no votes"` を KV に記録します。いずれも Snapshot 上の票が取り残されたまま最終処理される経路です。

`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。

推奨する修正:

- mapping 解決結果に `resolved: true/false` のような明示的状態を設ける。
- Snapshot モードで解決に失敗した tick は、告知・投函・no-votes 判定・execute をすべて行わず、tick 全体を終了する。
- 少なくとも `maybeExecute()` は「その tick で対応表と link/timeline を検証済み」でなければ呼ばない。
- Hub 障害、GraphQL `errors`、フィールド `null` の各ケースについて worker レベルの回帰テストを追加する。

## [Medium] URL 照合は「提案本文の自己申告」であり、悪意ある対応付けを検出できない

該当箇所: [snap.js:74](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:74), [snap.js:78](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:78), [member-proposal-unified.html:171](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:171), [member-proposal-unified.html:176](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:176)

何が起きるか:

`discussion` と `body` は提案作成時に指定できる文字列です。Snapshot の公式インターフェースでも両者は提案作成入力です。[Snapshot 公式実装](https://github.com/snapshot-labs/snapshot-mcp)

したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。

- Snapshot 提案の author
- Nouns 提案のタイトル・本文・creation block
- choices/type
- 正規の提案作成処理から生成されたこと
- URL が唯一の対応先であること

この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。

資料の「誤登録は機械が自分で見つけて知らせる」は絶対表現として言い過ぎです。

正規表現自体について:

- `nounsId` は `Number(res[i])` または数値の Nouns proposal ID から来るため、通常は正規表現メタ文字を含みません。
- ID 12 は `/vote/123` に誤マッチしません。
- `/vote/123?tab=x`、`/vote/123/`、`/vote/123#x` は `\b` によりマッチします。
- 一方、`evilnouns.wtf/vote/123` やサブドメインもマッチします。
- 大文字の `NOUNS.WTF` は取りこぼします。
- `Number` 変換は `2^53-1` 超で精度を失いますが、現実の Nouns proposal ID では問題になりません。

推奨する修正:

- `URL` で解析し、hostname が `nouns.wtf`、pathname が `/vote/${id}` または末尾 `/` だけであることを検証する。
- `discussion` は完全一致の canonical URL とし、本文の部分文字列一致は補助情報に降格する。
- author allowlist、choices/type、Nouns 本文またはハッシュも照合する。
- 資料は「通常の取り違えを自動検出する補助チェック。作成プログラムや鍵が偽提案と URL を同時に作る場合は検出できない」と修正する。

## [Medium] 不一致を判定する前に、誤った Snapshot 提案を Discord へ告知する

該当箇所: [worker.js:415](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:415), [worker.js:416](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:416), [worker.js:420](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:420), [worker.js:425](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:425), [worker.js:24](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:24)

何が起きるか:

`announceNew()` は `linkOk` 判定より先に実行されます。不一致 mapping の最初の tick では、

1. 誤った Snapshot URL を「投票受付を開始しました」と告知
2. `announced` を KV に保存
3. その後で不一致警告
4. mainnet の投函・execute を停止

という順序になります。

利用者が最初のメッセージから誤提案へ投票する可能性があり、修正後も告知は済み扱いなので、正しい URL の自動再告知もされません。

推奨する修正:

- `announceNew()` を `linkOk` と timeline 検証の後へ移動する。
- Hub 照合不能時も告知しない。
- mapping が変更された場合は、`announced` を mapping の Snapshot ID と紐付け、正しい再登録後に再告知できるようにする。

## [Medium] 「1票でも計上されると取消不可」は直接投票を含めると事実ではない

該当箇所: [PNounsSnapVoter.sol:185](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:185), [PNounsSnapVoter.sol:190](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:190), [PNounsSnapVoter.sol:267](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:267), [PNounsSnapVoter.sol:272](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:272), [snap.fork.test.js:246](/mnt/data/pnouns-voter/test/snap.fork.test.js:246), [member-proposal-unified.html:175](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:175)

何が起きるか:

`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。

そのため、直接 `castVote()` で tally・`voterRec`・bitmap が更新済みでも、Snapshot 署名が未受理なら取消できます。既存テストもこの挙動を明示的に期待しています。

取消時に削除されるのは対応表と登録ブロックだけです。tally、`voterRec`、`_votedBitmap` は消えません。再登録すると、以前の直接票と二重計上防止状態を引き継ぎます。以前の Snapshot 票については、1件でも成功していれば取消自体ができないため、取消後に復活・消滅する経路はありません。

「受理されたが計上されなかった票」については問題ありません。

- 初回票・補完票で新規 token がゼロなら `NothingCounted` でトランザクション全体が revert し、accepted は増えません。
- やり直し票は新規 token がゼロでも choice/record を更新でき、その成功後に accepted が増えます。
- accepted 加算はループ全体の成功後なので、部分受理もありません。

推奨する修正:

資料を次のように限定してください。

> Snapshot 署名が1件でもコントラクトに受理されると、その対応表は取消できない。直接オンチェーン投票は取消を妨げず、その集計状態は取消・再登録後も残る。

## [Medium] 24時間 delay は固定保証ではなく、owner が事後に短縮できる

該当箇所: [PNounsSnapVoter.sol:167](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:167), [PNounsSnapVoter.sol:249](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:249), [PNounsSnapVoter.sol:276](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:276), [worker.js:383](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:383), [worker.js:396](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:396)

何が起きるか:

受付判定は登録時に確定した期限ではなく、現在のグローバル `registrationDelayBlocks` を毎回参照します。登録後に owner が値をゼロへ変更すれば即時受付可能です。

Worker の最低値確認も `spaceChecked` が true になるまでの一度だけです。同じ Worker isolate 上で事後変更された場合、最低値未満になっても検知しません。

したがって「票を受け付けていない時間＝必ずやり直せる時間」は、delay が短縮されず、owner/マルチシグが正しく運用される条件付きでは成立しますが、コントラクトの不変条件ではありません。

推奨する修正:

- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
- または delay を immutable にする。
- Worker の最低値確認は毎 tick、または一定間隔で再実施する。

## [Low] 警告送信失敗後も7日間通知済み扱いになる

該当箇所: [worker.js:8](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:8), [worker.js:421](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:421), [worker.js:422](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:422)

何が起きるか:

- `linkwarn` を保存してから Discord を呼びます。
- `notify()` は network error を内部で握りつぶします。
- HTTP 4xx/5xx については `response.ok` を確認していないため成功扱いです。

最初の通知が失敗してもフラグは7日残り、停止理由が管理者へ届かない可能性があります。

推奨する修正:

- Discord の 2xx を確認してから長期フラグを保存する。
- 失敗時はメモリまたは短い TTL で再試行を抑制しつつ、長期の通知済みフラグは立てない。

## [Low] 今回の照合ロジックに回帰テストがない

該当箇所: [snap.js:78](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:78), [worker.js:420](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:420), [cursor.test.mjs:4](/mnt/data/pnouns-voter/relayer-cf/test/cursor.test.mjs:4)

何が起きるか:

現行の `relayer-cf` テストは cursor と受付締切が中心で、次を検証していません。

- ID の prefix 衝突
- query/fragment/末尾スラッシュ
- 偽ドメイン・大文字
- `discussion`/`body` の null
- GraphQL error 時の execute 抑止
- 告知より先に照合すること
- `linkwarn` の write 回数

推奨する修正:

`resolveMappings()` の純粋な URL 判定を関数分離し、worker の依存を注入可能にして上記ケースを追加してください。

## [Low] `space` は無制限長で、deployment/execute gas を増やせる

該当箇所: [PNounsSnapVoter.sol:58](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:58), [PNounsSnapVoter.sol:154](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:154), [PNounsSnapVoter.sol:155](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:155), [PNounsSnapVoter.sol:409](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:409)

何が起きるか:

通常の `pnounsdao.eth` では影響は小さく、主に deployment 時の storage write と execute 時の storage read が追加される程度です。

ただしコンストラクタに長さ制限がないため、異常に長い `space_` を設定すると、deployment gas、reason の構築、Nouns DAO への calldata、`VoteCast` event gas が増えます。Nouns の理由文字列にも実質的な固定長制限はなく、最終的な制約は gas です。

推奨する修正:

`bytes(space_).length` に現実的な上限を設けてください。例えば ENS 名を想定するなら 255 bytes 以下、運用上はさらに短い上限で十分です。

## 問題なしと判断した点

### [Info] `linkwarn` 単体では毎 tick write の回帰はない

該当箇所: [worker.js:421](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:421), [store.js:41](/mnt/data/pnouns-voter/relayer-cf/src/store.js:41)

`setFlag()` は明確に KV write を1回消費します。ただしフラグが存在する間は `get` のみで、毎分 write にはなりません。TTL 後も不一致なら7日ごとに再度1 write/警告なので「永久に1提案1回」ではなく「1提案・7日につき1回」です。

この経路単体で 1,000 writes/日を超える現実的経路は確認できません。

### [Info] `continue` は cursor/offset/dead-letter を進めない

該当箇所: [worker.js:425](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:425), [worker.js:148](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:148)

`continue` は `submitFromSnapshot()` より前なので scan offset、fail count、dead-letter は変更されません。link が修正されれば同じ状態から再開できます。永久取り残しになるのは、不一致または照合不能がオンチェーン締切まで解消されなかった場合だけで、cursor の不整合によるものではありません。

### [Info] delay は全投票入口に実装されている

該当箇所: [PNounsSnapVoter.sol:243](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:243), [PNounsSnapVoter.sol:249](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:249), [PNounsSnapVoter.sol:272](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:272), [PNounsSnapVoter.sol:276](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:276)

tally に入る外部入口は `castSnapshotVotes()` と `castVote()` の2つで、登録済み提案について双方に block-number delay があります。他の投票入口は確認されませんでした。

reorg についても、登録と `registeredAtBlock` は同じ canonical state に属するため通常の浅い reorg には整合的です。24時間相当より深い reorg や owner による delay 変更までは保証しません。

### [Info] `spaceHash` と `space` は通常経路では不一致にならない

該当箇所: [PNounsSnapVoter.sol:154](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:154), [PNounsSnapVoter.sol:155](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:155)

両者は同じコンストラクタ引数から一度だけ設定され、`space` の setter はありません。通常のコントラクト操作で不一致にする経路はありません。

## 検証実績

- `git show 0a98a23 -- relayer-cf` と `git show e347166 -- contracts/PNounsSnapVoter.sol` を確認。
- `relayer-cf` の `npm test`: 2/2 pass。
- mainnet RPC が必要な fork test は実行せず、ソース上の既存テストを確認。
- ファイル変更なし。

[exited with code 0]
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
    38	    await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    39	    await notify(c, [
    40	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
    41	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
    42	      `締切: ${jst} ごろ (block ${mg.deadline})`,
    43	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
    44	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    45	    ].join("\n"));
    46	    return;
    47	  }
    48	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
    49	  const deadlineBlock = mg.deadline || p.endBlock;
    50	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
    51	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    52	  await store.putAnnounced(p.id, new Date().toISOString());
    53	  await notify(c, [
    54	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    55	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    56	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    57	    `投票ページ: ${c.publicUrl}`,
    58	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
    59	  ].join("\n"));
    60	}
    61	
    62	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
    63	const FORCE_LIST_MS = 20 * 60 * 1000;
    64	async function loadVotes(store, proposalId, force) {
    65	  const sum = await store.getSummary(proposalId);
    66	  const dirty = await store.dirtyAt(proposalId);
    67	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
    68	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
    69	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
    70	  const listed = await store.listVoteSummaries(proposalId);
    71	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
    72	  await store.putSummary(proposalId, summaries, listedAt);
    73	  return { summaries, listedAt };
    74	}
    75	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
    76	function setStatus(summaries, voter, patch) {
    77	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
    78	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
    79	}
    80	async function flushSummary(store, proposalId, summaries) {
    81	  const sum = await store.getSummary(proposalId);
    82	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
    83	}
    84	
    85	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
    86	async function reconcileSent(c, pc, store, proposalId, summaries) {
    87	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
    88	  if (!sent.length) return false;
    89	  const byTx = new Map();
    90	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
    91	  let changed = false;
    92	  for (const [tx, vs] of byTx) {
    93	    let rc = null;
    94	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
    95	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
    96	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
    97	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
    98	    for (let i = 0; i < vs.length; i++) {
    99	      const v = vs[i];
   100	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
   101	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
   102	    }
   103	    changed = true;
   104	    if (rc && rc.status === "success") {
   105	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
   106	      await store.setFlag(`notified:${tx}`, 86400);
   107	      const mg = await metagovInfo(c, pc, proposalId);
   108	      await notify(c, [
   109	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
   110	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   111	        `tx: ${explorerTx(c, tx)}`,
   112	      ].join("\n"));
   113	    } else {
   114	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
   115	    }
   116	  }
   117	  if (changed) await flushSummary(store, proposalId, summaries);
   118	  return changed;
   119	}
   120	
   121	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   122	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   123	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   124	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   125	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   126	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   127	  const pending = await store.kvRaw.get(sentK, "json");
   128	  if (pending) {
   129	    let allMined = true, anySuccess = false, gasTotal = 0n;
   130	    for (const tx of pending.txs) {
   131	      let rc = null;
   132	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   133	      if (!rc) { allMined = false; continue; }
   134	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   135	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   136	    }
   137	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   138	    await store.kvRaw.delete(sentK);
   139	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   140	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   141	      await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   142	      const mg = await metagovInfo(c, pc, nounsId);
   143	      await notify(c, [
   144	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   145	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   146	        `tx: ${explorerTx(c, pending.txs[0])}`,
   147	      ].join("\n"));
   148	    }
   149	    return;
   150	  }
   151	
   152	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   153	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   154	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   155	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   156	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   157	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   158	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   159	  const deadLetters = new Set(deadArr);
   160	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   161	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   162	  const owners = await allOwners(c, pc);
   163	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   164	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   165	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   166	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   167	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   168	  const votedByToken = new Map();
   169	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   170	    const ids = checkTokenIds.slice(start, start + 200);
   171	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   172	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   173	  }
   174	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   175	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   176	  const batches = rush ? c.rushBatches : 1;
   177	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   178	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   179	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   180	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   181	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   182	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   183	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   184	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   185	
   186	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   187	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   188	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   189	  for (const { row, index } of send) {
   190	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   191	    if (!env) {
   192	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   193	      if (fails[row.ipfs] >= 20) {
   194	        deadArr.push(row.ipfs); deadChanged = true;
   195	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   196	      }
   197	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   198	    }
   199	    const m = env.data.message;
   200	    const tokenIds = [];
   201	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   202	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   203	    args.push(arg); cidOf.set(arg, row.ipfs);
   204	  }
   205	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   206	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   207	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   208	  if (!args.length) return;
   209	
   210	  const txs = []; let count = 0;
   211	  for (let b = 0; b < batches; b++) {
   212	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   213	    if (!chunk.length) break;
   214	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   215	    catch (e) {
   216	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   217	      const good = [];
   218	      for (const a2 of chunk.slice(0, 10)) {
   219	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   220	        catch (e2) {
   221	          const cid = cidOf.get(a2);
   222	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   223	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   224	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   225	          }
   226	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   227	        }
   228	      }
   229	      if (!good.length) continue;
   230	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   231	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   232	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   233	      catch (e3) {
   234	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   235	        good.length = 1;
   236	      }
   237	      chunk.length = 0; chunk.push(...good);
   238	    }
   239	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   240	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   241	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   242	    txs.push(hash); count += chunk.length;
   243	  }
   244	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   245	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   246	}
   247	
   248	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   249	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   250	  const { summaries } = await loadVotes(store, proposalId, rush);
   251	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   252	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   253	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   254	  let touched = false;
   255	  for (let b = 0; b < batches; b++) {
   256	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
   257	    if (!pendingSummaries.length) break;
   258	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
   259	    const pending = [];
   260	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
   261	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
   262	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   263	    const cands = [];
   264	    for (let i = 0; i < pending.length; i++) {
   265	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
   266	      cands.push(pending[i]);
   267	    }
   268	    if (!cands.length) continue;
   269	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   270	    let good = cands;
   271	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   272	    catch (e) {
   273	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   274	      good = [];
   275	      for (const v of cands.slice(0, 10)) {
   276	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   277	        catch (e2) {
   278	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   279	        }
   280	      }
   281	      if (!good.length) continue;
   282	    }
   283	    const args = good.map(toArg);
   284	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   285	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   286	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   287	    const sentAt = new Date().toISOString();
   288	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   289	    touched = true;
   290	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   291	      await new Promise((r) => setTimeout(r, 1500));
   292	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   293	    }
   294	  }
   295	  if (touched) await flushSummary(store, proposalId, summaries);
   296	  // receipt は待たない(次回 tick の reconcile で確定・通知)
   297	}
   298	
   299	async function maybeExecute(c, pc, wc, store, p, block, mg) {
   300	  const ex = await store.getExecuted(p.id);
   301	  if (ex && ex.pending && ex.tx) {
   302	    // 送信済み・未確定の execute を確定
   303	    let rc = null;
   304	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
   305	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
   306	    const info = await metagovInfo(c, pc, p.id);
   307	    if (rc && rc.status === "success") {
   308	      if (info.executed) {
   309	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
   310	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
   311	        await notify(c, [
   312	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
   313	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
   314	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
   315	          `tx: ${explorerTx(c, ex.tx)}`,
   316	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
   317	        ].filter(Boolean).join("\n"));
   318	      } else {
   319	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
   320	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
   321	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
   322	      }
   323	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
   324	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
   325	    return;
   326	  }
   327	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
   328	  if (ex && !ex.shadow) return;
   329	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
   330	  if (mg.deadline === 0 || block < mg.deadline) return;
   331	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
   332	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
   333	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
   334	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
   335	    return;
   336	  }
   337	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
   338	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
   339	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
   340	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
   341	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
   342	}
   343	
   344	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
   345	async function checkBalance(c, pc, wc, store) {
   346	  const threshold = Number(c.lowBalanceEth);
   347	  const checks = [];
   348	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   349	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
   350	  for (const ck of checks) {
   351	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
   352	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
   353	    if (await store.getFlag(ck.key)) continue;
   354	    await store.setFlag(ck.key, 86400);
   355	    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
   356	  }
   357	}
   358	
   359	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
   360	async function reconcileRecent(c, pc, wc, store, proposals) {
   361	  for (const p of proposals.slice(0, 15)) {
   362	    try {
   363	      const pid = String(p.id);
   364	      const sum = await store.getSummary(pid);
   365	      if (sum.votes.some((v) => v.txStatus === "sent")) {
   366	        const summaries = [...sum.votes];
   367	        await reconcileSent(c, pc, store, pid, summaries);
   368	      }
   369	      const ex = await store.getExecuted(pid);
   370	      if (ex && ex.pending && ex.tx) {
   371	        const mg = await metagovInfo(c, pc, pid);
   372	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
   373	      }
   374	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
   375	  }
   376	}
   377	
   378	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
   379	let lastErrNotify = 0;
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
   111	    const r = rows[i]; const rec = recs[i];
   112	    const created = Number(r.created);
   113	    const tokens = tokenCounts[i] ?? 0;
   114	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
   115	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
   116	    const exists = !!rec[0];
   117	    const recTs = Number(rec[3] ?? 0);
   118	    const isNew = !exists || created > recTs;
   119	    const needSupplement = exists && created === recTs && uncounted > 0;
   120	    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
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

exec
/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '360,475p'; nl -ba relayer-cf/src/worker.js | sed -n '90,360p'; nl -ba relayer-cf/test/link-check.test.mjs; nl -ba contracts/PNounsSnapVoter.sol | sed -n '145,305p'; nl -ba relayer-cf/wrangler.toml; git show --format=fuller e11b170 --; rg -n -i \"9b4acc39f464d1f8a8f61a33e49f26ea4688f5c1|64cdacea6857c6560f3124c532aa4ed34152693f|mainnet|REPLACE_AFTER\" . --glob '"'!node_modules/**'"' --glob '"'!artifacts/**'"' --glob '"'!cache/**'"'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   360	async function reconcileRecent(c, pc, wc, store, proposals) {
   361	  for (const p of proposals.slice(0, 15)) {
   362	    try {
   363	      const pid = String(p.id);
   364	      const sum = await store.getSummary(pid);
   365	      if (sum.votes.some((v) => v.txStatus === "sent")) {
   366	        const summaries = [...sum.votes];
   367	        await reconcileSent(c, pc, store, pid, summaries);
   368	      }
   369	      const ex = await store.getExecuted(pid);
   370	      if (ex && ex.pending && ex.tx) {
   371	        const mg = await metagovInfo(c, pc, pid);
   372	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
   373	      }
   374	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
   375	  }
   376	}
   377	
   378	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
   379	let lastErrNotify = 0;
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
    90	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
    91	  let changed = false;
    92	  for (const [tx, vs] of byTx) {
    93	    let rc = null;
    94	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
    95	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
    96	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
    97	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
    98	    for (let i = 0; i < vs.length; i++) {
    99	      const v = vs[i];
   100	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
   101	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
   102	    }
   103	    changed = true;
   104	    if (rc && rc.status === "success") {
   105	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
   106	      await store.setFlag(`notified:${tx}`, 86400);
   107	      const mg = await metagovInfo(c, pc, proposalId);
   108	      await notify(c, [
   109	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
   110	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   111	        `tx: ${explorerTx(c, tx)}`,
   112	      ].join("\n"));
   113	    } else {
   114	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
   115	    }
   116	  }
   117	  if (changed) await flushSummary(store, proposalId, summaries);
   118	  return changed;
   119	}
   120	
   121	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   122	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   123	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   124	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   125	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   126	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   127	  const pending = await store.kvRaw.get(sentK, "json");
   128	  if (pending) {
   129	    let allMined = true, anySuccess = false, gasTotal = 0n;
   130	    for (const tx of pending.txs) {
   131	      let rc = null;
   132	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   133	      if (!rc) { allMined = false; continue; }
   134	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   135	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   136	    }
   137	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   138	    await store.kvRaw.delete(sentK);
   139	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   140	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   141	      await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   142	      const mg = await metagovInfo(c, pc, nounsId);
   143	      await notify(c, [
   144	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   145	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   146	        `tx: ${explorerTx(c, pending.txs[0])}`,
   147	      ].join("\n"));
   148	    }
   149	    return;
   150	  }
   151	
   152	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   153	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   154	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   155	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   156	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   157	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   158	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   159	  const deadLetters = new Set(deadArr);
   160	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   161	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   162	  const owners = await allOwners(c, pc);
   163	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   164	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   165	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   166	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   167	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   168	  const votedByToken = new Map();
   169	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   170	    const ids = checkTokenIds.slice(start, start + 200);
   171	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   172	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   173	  }
   174	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   175	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   176	  const batches = rush ? c.rushBatches : 1;
   177	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   178	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   179	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   180	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   181	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   182	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   183	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   184	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   185	
   186	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   187	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   188	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   189	  for (const { row, index } of send) {
   190	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   191	    if (!env) {
   192	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   193	      if (fails[row.ipfs] >= 20) {
   194	        deadArr.push(row.ipfs); deadChanged = true;
   195	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   196	      }
   197	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   198	    }
   199	    const m = env.data.message;
   200	    const tokenIds = [];
   201	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   202	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   203	    args.push(arg); cidOf.set(arg, row.ipfs);
   204	  }
   205	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   206	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   207	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   208	  if (!args.length) return;
   209	
   210	  const txs = []; let count = 0;
   211	  for (let b = 0; b < batches; b++) {
   212	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   213	    if (!chunk.length) break;
   214	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   215	    catch (e) {
   216	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   217	      const good = [];
   218	      for (const a2 of chunk.slice(0, 10)) {
   219	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   220	        catch (e2) {
   221	          const cid = cidOf.get(a2);
   222	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   223	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   224	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   225	          }
   226	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   227	        }
   228	      }
   229	      if (!good.length) continue;
   230	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   231	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   232	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   233	      catch (e3) {
   234	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   235	        good.length = 1;
   236	      }
   237	      chunk.length = 0; chunk.push(...good);
   238	    }
   239	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   240	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   241	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   242	    txs.push(hash); count += chunk.length;
   243	  }
   244	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   245	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   246	}
   247	
   248	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   249	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   250	  const { summaries } = await loadVotes(store, proposalId, rush);
   251	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   252	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   253	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   254	  let touched = false;
   255	  for (let b = 0; b < batches; b++) {
   256	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
   257	    if (!pendingSummaries.length) break;
   258	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
   259	    const pending = [];
   260	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
   261	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
   262	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   263	    const cands = [];
   264	    for (let i = 0; i < pending.length; i++) {
   265	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
   266	      cands.push(pending[i]);
   267	    }
   268	    if (!cands.length) continue;
   269	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   270	    let good = cands;
   271	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   272	    catch (e) {
   273	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   274	      good = [];
   275	      for (const v of cands.slice(0, 10)) {
   276	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   277	        catch (e2) {
   278	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   279	        }
   280	      }
   281	      if (!good.length) continue;
   282	    }
   283	    const args = good.map(toArg);
   284	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   285	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   286	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   287	    const sentAt = new Date().toISOString();
   288	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   289	    touched = true;
   290	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   291	      await new Promise((r) => setTimeout(r, 1500));
   292	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   293	    }
   294	  }
   295	  if (touched) await flushSummary(store, proposalId, summaries);
   296	  // receipt は待たない(次回 tick の reconcile で確定・通知)
   297	}
   298	
   299	async function maybeExecute(c, pc, wc, store, p, block, mg) {
   300	  const ex = await store.getExecuted(p.id);
   301	  if (ex && ex.pending && ex.tx) {
   302	    // 送信済み・未確定の execute を確定
   303	    let rc = null;
   304	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
   305	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
   306	    const info = await metagovInfo(c, pc, p.id);
   307	    if (rc && rc.status === "success") {
   308	      if (info.executed) {
   309	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
   310	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
   311	        await notify(c, [
   312	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
   313	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
   314	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
   315	          `tx: ${explorerTx(c, ex.tx)}`,
   316	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
   317	        ].filter(Boolean).join("\n"));
   318	      } else {
   319	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
   320	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
   321	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
   322	      }
   323	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
   324	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
   325	    return;
   326	  }
   327	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
   328	  if (ex && !ex.shadow) return;
   329	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
   330	  if (mg.deadline === 0 || block < mg.deadline) return;
   331	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
   332	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
   333	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
   334	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
   335	    return;
   336	  }
   337	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
   338	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
   339	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
   340	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
   341	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
   342	}
   343	
   344	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
   345	async function checkBalance(c, pc, wc, store) {
   346	  const threshold = Number(c.lowBalanceEth);
   347	  const checks = [];
   348	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   349	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
   350	  for (const ck of checks) {
   351	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
   352	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
   353	    if (await store.getFlag(ck.key)) continue;
   354	    await store.setFlag(ck.key, 86400);
   355	    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
   356	  }
   357	}
   358	
   359	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
   360	async function reconcileRecent(c, pc, wc, store, proposals) {
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
   226	        uint256 endBlock = nounsEndBlock(proposalId);
   227	        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
   228	    }
   229	    function currentResult(uint256 proposalId) public view returns (uint8) {
   230	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
   231	        return _decide(tokens, voters);
   232	    }
   233	
   234	    /// @notice Snapshot の Vote メッセージの EIP-712 ダイジェスト
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
commit e11b170a0df2545f7cc49428bf5d241fbff05238
Author:     earlgrey <[redacted-email]>
AuthorDate: Thu Aug 20 21:35:36 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Thu Aug 20 21:35:36 2026 +0900

    Sepolia 再デプロイ: 0x64CdACeA6857c6560F3124c532AA4ed34152693F
    
    第10回監査の修正(eligibleAtBlock / InvalidSpace)と、前回未反映だった
    space フィールドを載せた版を Sepolia に再デプロイ。
    
    - space=earl-grey.eth, margin=5, registrationDelayBlocks=5(約1分)
      ※ 旧デプロイは delay=0 で、新しい猶予ロジックを実地で動かせなかった
    - 旧コントラクト(0x9b4A…f5C1)のプール 0.0192 ETH を回収して原資に充当
    - 返金プール 0.02 ETH 投入、Nouns 投票権 2 票を新アドレスへ委任済み
    - Sourcify で exact_match(creation/runtime とも)を確認
    - relayer-cf の VOTER を新アドレスへ切り替えてデプロイ済み
    
    実地検証:
    - eligibleAtBlock が登録時に確定し、owner が delay を 0 に下げても不変
    - 猶予中の castVote は RegistrationTooRecent、猶予明けは通過
    
    E2E スクリプト(13/14)が eligibleAtBlock の明けを待つように修正。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/deployments/sepolia.json b/deployments/sepolia.json
index 6e974fb..fdbe8b6 100644
--- a/deployments/sepolia.json
+++ b/deployments/sepolia.json
@@ -6,6 +6,6 @@
   "marginBlocks": 5,
   "voter": "0x3C7fb408EE6A5c2732770110B6dd48527F360e26",
   "voterDeployBlock": 11514747,
-  "snapVoter": "0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1",
-  "snapVoterDeployBlock": 11527862
+  "snapVoter": "0x64CdACeA6857c6560F3124c532AA4ed34152693F",
+  "snapVoterDeployBlock": 11529065
 }
diff --git a/relayer-cf/wrangler.toml b/relayer-cf/wrangler.toml
index 3f081f1..5bae960 100644
--- a/relayer-cf/wrangler.toml
+++ b/relayer-cf/wrangler.toml
@@ -16,7 +16,7 @@ id = "4c2f1c683fe94191b456e0c1fc70cc2f"
 
 [vars]
 NETWORK = "sepolia"
-VOTER = "0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1"
+VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
 SNAPSHOT_SPACE = "earl-grey.eth"
 PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
 NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
diff --git a/scripts/sepolia/13-snap-e2e.js b/scripts/sepolia/13-snap-e2e.js
index ab1422f..acebddc 100644
--- a/scripts/sepolia/13-snap-e2e.js
+++ b/scripts/sepolia/13-snap-e2e.js
@@ -74,6 +74,9 @@ async function main() {
   // ④ 対応付け登録
   await (await snapVoter.registerProposal(snapId, nounsId)).wait();
   console.log("④ registered mapping");
+  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
+  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
+  if (eligible > await ethers.provider.getBlockNumber()) await waitForBlock(ethers.provider, eligible, "④ 登録猶予の明けを待機");
 
   // ⑤ hub から投票(署名)を取得して送信
   await sleep(10000); // hub の反映待ち
diff --git a/scripts/sepolia/14-snap-setup-only.js b/scripts/sepolia/14-snap-setup-only.js
index b2b65c1..bf9ab69 100644
--- a/scripts/sepolia/14-snap-setup-only.js
+++ b/scripts/sepolia/14-snap-setup-only.js
@@ -32,6 +32,7 @@ async function main() {
   const nounsId = await dao.proposalCount();
   const snapVoter = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
   await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
-  console.log(`nouns proposal #${nounsId} registered → あとは Worker が処理`);
+  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
+  console.log(`nouns proposal #${nounsId} registered → あとは Worker が処理 (票の受付解禁 block ${eligible}, 現在 ${await ethers.provider.getBlockNumber()})`);
 }
 main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
./test/snap.fork.test.js:1:// PNounsSnapVoter の mainnet フォークテスト。
./test/snap.fork.test.js:56:describe("PNounsSnapVoter (mainnet fork)", function () {
./test/snap.fork.test.js:62:    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: process.env.MAINNET_RPC_URL, blockNumber: PINNED_BLOCK } }] });
./test/snap.fork.test.js:326:    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: process.env.MAINNET_RPC_URL } }] });
./test/fork.e2e.test.js:1:// mainnet フォーク上での E2E テスト。
./test/fork.e2e.test.js:96:describe("PNounsVoter (mainnet fork E2E)", function () {
./README.md:6:「保有者は EIP-712 署名だけ(ガス0) → リレイヤーが mainnet の pNouns Voter に一括投函 → 締切後に誰でも execute →
./README.md:8:mainnet フォーク上の E2E テスト(段階1)。
./README.md:14:- 締切 = Nouns の `endBlock − marginBlocks`。**mainnet は 7200 ブロック ≒ 24h(2026-08-18 決定)**、Sepolia テストは 5。締切後に誰でも `execute`
./README.md:15:- チェーンは Ethereum mainnet(Nouns の委任先は mainnet アドレス必須。L2→L1 メッセージは Nouns の投票期間に間に合わない)
./README.md:17:## 前提となる pNouns NFT の仕様(mainnet `0x4bE962499cE295b1ed180F923bf9c73b6357DE80`、Sourcify 検証済み)
./README.md:31:## テスト(段階1: mainnet フォーク)
./README.md:33:cp .env.example .env   # MAINNET_RPC_URL=(Alchemy 等の archive RPC)
./README.md:53:目安: 30 名投票 ≒ 1.5M gas。mainnet gas 0.05 gwei なら 0.00008 ETH、2 gwei でも 0.003 ETH。
./README.md:57:ロジックは mainnet と同一ソース。`scripts/compare-chains.js` で差分表を出せる)、pNouns 側は **本物ソースの複製**(`contracts/vendor/pnouns`、無改変)。
./README.md:70:NETWORK=sepolia node relayer/index.js        # http://localhost:8790  (mainnet は NETWORK=mainnet METAGOV_ADDRESS=...)
./README.md:78:- **署名受付締切**(M-14): オンチェーン締切の (MIN_PENDING_AGE + cron + 120s)/12 ブロック前(mainnet 30 ブロック)で API 受付を終了。以後はワーカーが即時投函モード、メンバーは自分で投函/castVote 可。dApp に両方の締切を表示
./README.md:92:- mainnet 用は別 Worker(例: `wrangler deploy --name pnouns-metagov-relayer-mainnet` + vars/secrets 差し替え)で並走させる想定
./README.md:103:- 段階3: mainnet に `liveMode=false` でデプロイし Snapshot と並走 → 一致を確認 → マルチシグが委任先を切替、`liveMode=true`
./README.md:104:- B3 mainnet の安全条件: Snapshot 終了からオンチェーン締切までに `cron 間隔 + SUBMIT_BUFFER_SEC` 以上を確保する。Worker は不足または終了時刻不明なら**投函・execute とも fail-closed**し、Discord へ警告する
./README.md:105:- 決定(2026-08-18): mainnet 鍵は新規生成、margin 24h。未決: ガス代負担(案 A/B)、owner をどのマルチシグにするか。**mainnet デプロイは指示があるまで行わない**
./hardhat.config.js:4:const FORK_URL = process.env.MAINNET_RPC_URL;
./relayer-cf/wrangler.toml:19:VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
./relayer-cf/wrangler.toml:33:# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
./relayer-cf/wrangler.toml:34:[env.mainnet]
./relayer-cf/wrangler.toml:35:name = "pnouns-voter-mainnet"
./relayer-cf/wrangler.toml:36:[env.mainnet.assets]
./relayer-cf/wrangler.toml:38:[env.mainnet.triggers]
./relayer-cf/wrangler.toml:40:[[env.mainnet.kv_namespaces]]
./relayer-cf/wrangler.toml:42:id = "REPLACE_WITH_MAINNET_KV_ID"
./relayer-cf/wrangler.toml:43:[env.mainnet.vars]
./relayer-cf/wrangler.toml:44:NETWORK = "mainnet"
./relayer-cf/wrangler.toml:46:VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
./relayer-cf/wrangler.toml:56:PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
./relayer-cf/wrangler.toml:57:# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL
./scripts/sepolia/12-deploy-snapvoter.js:8:  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
./scripts/sepolia/13-snap-e2e.js:40:  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
./scripts/sepolia/13-snap-e2e.js:41:  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
./scripts/sepolia/13-snap-e2e.js:42:  const snapBlock = await mainnetProvider.getBlockNumber();
./scripts/sepolia/14-snap-setup-only.js:12:  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
./scripts/sepolia/14-snap-setup-only.js:20:    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
./scripts/create-and-register.mjs:8:// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
./scripts/create-and-register.mjs:23:const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
./scripts/create-and-register.mjs:26:const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
./scripts/create-and-register.mjs:30:  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
./scripts/create-and-register.mjs:55:  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
./scripts/create-and-register.mjs:60:    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
./scripts/create-and-register.mjs:68:  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
./scripts/compare-chains.js:5:  mainnet: { rpc: process.env.MAINNET_RPC_URL, dao: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", token: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", ah: "0x830BD73E4184ceF73443C15111a1DF14e495C706" },
./scripts/compare-chains.js:29:  const keys = [...new Set([...Object.keys(out.mainnet), ...Object.keys(out.sepolia)])];
./scripts/compare-chains.js:30:  console.log("| 項目 | mainnet | sepolia |\n|---|---|---|");
./scripts/compare-chains.js:31:  for (const k of keys) console.log(`| ${k} | ${out.mainnet[k]} | ${out.sepolia[k]} |`);
./deployments/sepolia.json:9:  "snapVoter": "0x64CdACeA6857c6560F3124c532AA4ed34152693F",
./docs/AUDIT-RESPONSE-2026-08-18.md:23:| H-04 | High | KV 書込みを「イベント時のみ」に再設計: ロック廃止(cron は Cloudflare が 1 回/分のみ起動、`/api/tick` は無効)、所有者/タイトル(Updatable 中)キャッシュは isolate メモリ、残高警告フラグは TTL 失効任せ(回復時の delete なし)、一覧は KV metadata で読む。書込みは 署名受付・投函記録・確定・execute・告知・通知重複防止 のみ(1 日あたり数十件)。mainnet env は cron 2 分 |
./docs/AUDIT-RESPONSE-2026-08-18.md:28:| M-09 | Medium | `NETWORK` は mainnet/sepolia 以外で起動失敗。mainnet では ONLY_PROPOSER 禁止・RPC_URL/アドレス必須・pNouns/Nouns アドレス固定値と照合。`wrangler.toml` に `[env.mainnet]`(別 Worker 名・別 KV・vars 非継承・cron 2 分)を用意 |
./docs/AUDIT-RESPONSE-2026-08-18.md:43:| H-04R | High | KV `list` は **ワーカー専用**かつ「新規署名で dirty フラグが立った提案」または inflight の提案だけ実行(1 日数十回規模)。提案ごとの集計サマリー `sum:{pid}` をワーカーが書き、公開 API(`/api/proposals`, `/api/signatures/:id`, `/api/proposal/:id`)は get のみ。`/api/proposals` は Cache API で 30 秒キャッシュ(クエリは 0/8 に正規化)、dApp ポーリングは 60 秒。書込みは 1 票あたり「受付 1 + dirty 1 + 送信 1 + 確定 1 + サマリー数回」で、想定規模(数十票/日)では余裕。**mainnet で Workers Paid($5/月)にすれば上限の心配は消える**旨を README に明記(推奨) |
./docs/AUDIT-RESPONSE-2026-08-18.md:63:| M-14 | Medium | **署名受付締切**を導入: `acceptDeadline = オンチェーン締切 − ceil((MIN_PENDING_AGE + cron 間隔 + 余裕 120s)/12)` ブロック(mainnet: 30 ブロック前)。API はこれ以降の署名を `accept_closed` で拒否(自分で投函する導線を案内)。ワーカーは受付締切以降は最小待機を無視して即時投函(境界の票を取り残さない)。dApp は「署名受付締切」と「オンチェーン締切」を分けて表示。`relayer-cf/test/accept-deadline.test.mjs` に境界テスト 4 本(`npm test`) |
./docs/AUDIT-RESPONSE-2026-08-18.md:71:| M-14R | Medium | (1) **受付容量**: `submitCapacity = floor(((締切−現在)×12 − 余裕)/cron) × RUSH_BATCHES × MAX_BATCH`。API は投函待ち件数がこれ以上なら `capacity_full` で拒否し、手動投函/castVote へ誘導。(2) **rush 時は 1 tick で複数バッチ**(`RUSH_BATCHES` 既定 2、1..3)。サブリクエスト予算に収めるため、投函状態の書込みを「票ごとの KV put」から「サマリー 1 回」に集約(metadata は受付時の不変情報のみ、状態はサマリーが唯一の真実。再 list 時は既存サマリーとマージ)。(3) 境界テスト追加(`npm test` 6 本: 受付締切時点の容量 40、1 tick 分の 20、余裕未満で 0、1 日前 >2,100 等)。mainnet 既定(cron 120s、余裕 120s、2 バッチ×10)で受付締切時点の保証排出量は 40 票、それ以上の集中は API が受付時点で拒否するので「ok を返した票を落とす」ことはない |
./docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
./docs/AUDIT-RESPONSE-2026-08-18.md:80:| B3-H03 | High | `[env.mainnet.vars]` に `SNAPSHOT_SPACE="pnounsdao.eth"` を明示。cfg は mainnet で SNAPSHOT_SPACE 必須(fail-closed)。worker は起動後最初の tick でコントラクトの `spaceHash` と設定値の keccak を照合し、不一致なら処理を停止して警告 |
./docs/AUDIT-RESPONSE-2026-08-18.md:90:再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
./docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
./docs/AUDIT-RESPONSE-2026-08-18.md:113:再検証: フォークテスト **17 本**、Worker テスト **13 本**(300 件境界・token 入れ替えを追加)。Sepolia 再デプロイ `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`(Sourcify exact_match)。再利用方式のライブ E2E で 3 票 → 集計(賛成 3/棄権 3 → 投票者 2:1 で賛成)→ Nouns DAO に賛成 2 票を記録。
./docs/AUDIT-RESPONSE-2026-08-18.md:114:なお B3-M03R(Snapshot 終了がオンチェーン締切より遅い設定)は運用条件として扱い、mainnet のリリース条件に「Snapshot 投票期間 + 排出余裕 < Nouns 締切」を明記する。
./docs/AUDIT-RESPONSE-2026-08-18.md:122:| B3-M03R | Medium | mainnet は Snapshot 終了後に `cron + submit buffer` の排出時間がない場合、または終了時刻不明の場合に **投函・execute とも fail-closed**。Discord 通知と境界テストを追加 |
./docs/AUDIT-RESPONSE-2026-08-18.md:127:Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッチ 1 投票者への正規化、hasTokenVoted の重複排除、mainnet の排出時間 fail-closed)を精査し、設計は妥当と判断。以下 1 点のみ修正した。
./docs/AUDIT-RESPONSE-2026-08-18.md:129:- 確認したが問題なしと判断した点: (a) offset 巡回は on-chain voterRec を真実とするため、行の並びが不安定でも次周回で必ず拾える。(b) 送信対象が残っている間は offset を進めないので、window 内の未解決票を飛ばさない。(c) `uniqueVoterCandidates` は Snapshot ハブが (proposal, voter) で 1 行に集約するため通常は作動しないが、防御として妥当。(d) mainnet の fail-closed は execute も止めるため、Snapshot 終了時刻が不明・遅い場合は手動実行が必要になる(通知文に明記済み)。
./relayer/index.js:1:// 起動: API サーバー + ワーカー。NETWORK=sepolia|mainnet
./docs/AUDIT-BRIEF.md:4:`/mnt/data/pnouns-voter` にあるコード一式を、mainnet デプロイ前の第三者視点で監査してください。
./docs/AUDIT-BRIEF.md:9:pNouns（ERC721A NFT、mainnet 0x4bE962499cE295b1ed180F923bf9c73b6357DE80、tokenId 1..2100）の保有者が
./docs/AUDIT-BRIEF.md:17:- `test/fork.e2e.test.js` … mainnet フォーク E2E（`.env` の `MAINNET_RPC_URL` が必要、9 テスト）
./docs/AUDIT-BRIEF.md:44:- 想定外: 定足数なし、票ゼロは投票しない、締切は mainnet で Nouns endBlock − 7200 ブロック（24h）
./docs/AUDIT-BRIEF.md:53:7. mainnet 移行時の差分: margin 7200、`ONLY_PROPOSER` 無し、返金プールの規模、`liveMode=false` のシャドー運用の安全性
./docs/AUDIT-BRIEF.md:57:cd /mnt/data/pnouns-voter && npm install && npx hardhat test          # mainnet フォーク（.env に MAINNET_RPC_URL）
./docs/AUDIT-BRIEF.md:61:Sepolia は投票期間 25 ブロックのため margin=5 で運用（mainnet は 7200 予定）。
./relayer-cf/src/worker.js:410:        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
./relayer-cf/src/worker.js:431:        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
./relayer-cf/src/worker.js:435:          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
./relayer-cf/src/worker.js:438:        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
./relayer-cf/src/worker.js:443:            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
./relayer-cf/src/worker.js:450:        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
./relayer-cf/src/worker.js:453:        if (linkBad && c.network === "mainnet") continue;
./relayer-cf/src/worker.js:454:        if (timelineBad && c.network === "mainnet") continue;
./relayer-cf/test/accept-deadline.test.mjs:6:const mainnet = { minPendingAgeSec: 120, cronSec: 120, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
./relayer-cf/test/accept-deadline.test.mjs:9:test("mainnet: 受付締切はオンチェーン締切の 30 ブロック前", () => {
./relayer-cf/test/accept-deadline.test.mjs:10:  assert.equal(acceptMarginBlocks(mainnet), 30);
./relayer-cf/test/accept-deadline.test.mjs:11:  assert.equal(acceptDeadline(mainnet, 1_000_000), 999_970);
./relayer-cf/test/accept-deadline.test.mjs:15:  assert.equal(shouldRushSubmit(mainnet, 999_969, dl), false);
./relayer-cf/test/accept-deadline.test.mjs:16:  assert.equal(shouldRushSubmit(mainnet, 999_970, dl), true);
./relayer-cf/test/accept-deadline.test.mjs:19:  for (const c of [mainnet, sepolia]) {
./relayer-cf/test/accept-deadline.test.mjs:32:  assert.equal(submitCapacity(mainnet, dl - 30, dl), 40);
./relayer-cf/test/accept-deadline.test.mjs:36:  assert.equal(submitCapacity(mainnet, blk, dl), 20);
./relayer-cf/test/accept-deadline.test.mjs:38:  assert.equal(submitCapacity(mainnet, dl - 15, dl), 0); // 180s 前: 余裕を引くと 1 tick に満たない → 受付不可
./relayer-cf/test/accept-deadline.test.mjs:40:  assert.equal(submitCapacity(mainnet, dl - 5, dl), 0);
./relayer-cf/test/accept-deadline.test.mjs:44:  assert.ok(submitCapacity(mainnet, dl - 7200, dl) > 2100);
./relayer-cf/test/accept-deadline.test.mjs:50:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 241, now), true);
./relayer-cf/test/accept-deadline.test.mjs:51:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 240, now), true, "境界は許可");
./relayer-cf/test/accept-deadline.test.mjs:52:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 239, now), false);
./relayer-cf/test/accept-deadline.test.mjs:53:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, 0, now), false, "終了時刻不明は fail-closed");
./relayer/config.js:1:// リレイヤー設定(env)。NETWORK=sepolia|mainnet で既定アドレスを切替、個別 env で上書き可。
./relayer/config.js:16:  mainnet: {
./relayer/config.js:22:    voter: process.env.VOTER_ADDRESS, // mainnet デプロイ後に設定
./docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
./docs/audit-10-codex-raw.md:60:4. mainnet の投函・execute を停止
./docs/audit-10-codex-raw.md:199:- mainnet RPC が必要な fork test は実行せず、ソース上の既存テストを確認。
./relayer-cf/src/chain.js:4:import { mainnet, sepolia } from "viem/chains";
./relayer-cf/src/chain.js:23:  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
./relayer-cf/src/chain.js:24:  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
./relayer-cf/src/chain.js:25:  if (env.NETWORK === "mainnet") {
./relayer-cf/src/chain.js:26:    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
./relayer-cf/src/chain.js:27:    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
./relayer-cf/src/chain.js:30:    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
./relayer-cf/src/chain.js:53:    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
./relayer-cf/src/chain.js:54:    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
./relayer-cf/src/chain.js:59:    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
./relayer-cf/src/chain.js:74:// snapEnd が取得できない場合も mainnet では安全とみなさない。

codex
静的確認では、`mappingsResolved` は「Hub呼出しが例外になったか」しか表しておらず、成功応答が0件・対応先だけ未発見の場合を安全に扱えていない疑いがあります。ここは実行経路とテスト不足を分けて評価します。残高チェックは早期returnより前、通常のreconcileも前ですが、pending execute のreconcileも前にあるため、fail-closed境界には注意が必要です。次にRPC実測へ進みます。
exec
/bin/bash -lc "sed -n '1,80p' relayer-cf/wrangler.toml; sed -n '1,120p' deployments/sepolia.json; sed -n '1,100p' scripts/sepolia/12-deploy-snapvoter.js; sed -n '1,100p' scripts/sepolia/03-deploy-voter.js; rg -n \"treasury|Treasury|NOUNS_TOKEN|nounsToken|delegate|delegates\" scripts deployments relayer-cf README.md docs --glob '"'!docs/audit-10-codex-raw.md'"' | head -200; command -v curl; command -v cast || true; node -e \"console.log(require('ethers').version)\"" in /mnt/data/pnouns-voter
 succeeded in 0ms:
name = "pnouns-voter"
main = "src/index.js"
compatibility_date = "2026-08-01"
compatibility_flags = ["nodejs_compat"]

# 静的 dApp(public/index.html)。/api/* は Worker が処理
[assets]
directory = "./public"

[triggers]
crons = ["* * * * *"]

[[kv_namespaces]]
binding = "STATE"
id = "4c2f1c683fe94191b456e0c1fc70cc2f"

[vars]
NETWORK = "sepolia"
VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
SNAPSHOT_SPACE = "earl-grey.eth"
PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
EXPLORER = "https://sepolia.etherscan.io"
BLOCKSCOUT = "https://eth-sepolia.blockscout.com"
ONLY_PROPOSER = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925"
MIN_PENDING_AGE_SEC = "20"
MAX_BATCH = "10"
EXECUTE_GAS_MULT = "1.3"
# secrets(wrangler secret put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL, (任意) TICK_TOKEN
PUBLIC_URL = "https://pnouns-voter.x402-adsb-worker.workers.dev"

# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
[env.mainnet]
name = "pnouns-voter-mainnet"
[env.mainnet.assets]
directory = "./public"
[env.mainnet.triggers]
crons = ["*/2 * * * *"]
[[env.mainnet.kv_namespaces]]
binding = "STATE"
id = "REPLACE_WITH_MAINNET_KV_ID"
[env.mainnet.vars]
NETWORK = "mainnet"
SNAPSHOT_SPACE = "pnounsdao.eth"
VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80"
NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"
NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"
EXPLORER = "https://etherscan.io"
BLOCKSCOUT = "https://eth.blockscout.com"
MIN_PENDING_AGE_SEC = "120"
MAX_BATCH = "10"
EXECUTE_GAS_MULT = "1.3"
LOW_BALANCE_ETH = "0.01"
PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL
{
  "pnouns": "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6",
  "pnounsDeployBlock": 11511735,
  "metagov": "0x09Ba5e225052D2C752Ed2954D4079e0a6DA74d19",
  "metagovDeployBlock": 11511807,
  "marginBlocks": 5,
  "voter": "0x3C7fb408EE6A5c2732770110B6dd48527F360e26",
  "voterDeployBlock": 11514747,
  "snapVoter": "0x64CdACeA6857c6560F3124c532AA4ed34152693F",
  "snapVoterDeployBlock": 11529065
}
// PNounsSnapVoter を Sepolia にデプロイ(space=earl-grey.eth、margin=5、registrar=deployer)し、返金プールを入れて委任を切り替える
const { ethers } = require("hardhat");
const { SEPOLIA, NOUNS_ABI, loadDeployments, saveDeployments } = require("./lib");
async function main() {
  const [deployer, delegator] = await ethers.getSigners();
  const dep = loadDeployments();
  const F = await ethers.getContractFactory("PNounsSnapVoter");
  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
  await c.waitForDeployment();
  // 読み戻して検証(監査 B3-H02R: 設定漏れを起こさない)
  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
  dep.snapVoter = await c.getAddress();
  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
  saveDeployments(dep);
  await (await c.setLiveMode(true)).wait();
  await (await deployer.sendTransaction({ to: dep.snapVoter, value: ethers.parseEther(process.env.FUND_ETH || "0.02") })).wait();
  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
  await (await nouns.delegate(dep.snapVoter)).wait();
  console.log("SnapVoter:", dep.snapVoter, "votes:", String(await nouns.getCurrentVotes(dep.snapVoter)));
}
main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
// pNouns Voter を Sepolia にデプロイ(Nouns 公式 Sepolia、pNouns 複製、margin=MARGIN(既定 5 ブロック: 投票期間 25 ブロックのため))
const { ethers } = require("hardhat");
const { SEPOLIA, loadDeployments, saveDeployments } = require("./lib");
async function main() {
  const [deployer] = await ethers.getSigners();
  const dep = loadDeployments();
  if (!dep.pnouns) throw new Error("run 01-deploy-pnouns first");
  const margin = BigInt(process.env.MARGIN || 5);
  const F = await ethers.getContractFactory("PNounsVoter");
  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
  console.log("deploy tx:", c.deploymentTransaction().hash);
  await c.waitForDeployment();
  dep.voter = await c.getAddress();
  dep.voterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
  dep.marginBlocks = Number(margin);
  saveDeployments(dep);
  const tx = await c.setLiveMode(true);
  await tx.wait();
  // 返金原資(案 B)を預ける
  const fund = ethers.parseEther(process.env.FUND_ETH || "0.02");
  await (await deployer.sendTransaction({ to: dep.voter, value: fund })).wait();
  console.log("funded refund pool:", ethers.formatEther(fund), "ETH");
  console.log("pNouns Voter:", dep.voter, "liveMode=true margin=", String(margin));
}
main().catch((e) => { console.error(e); process.exit(1); });
README.md:38:1. Nouns 2 枚の自己委任ホルダーになりすまし → pNouns Voter に delegate
README.md:39:2. 大口 delegate になりすまし → 提案作成(委任後なので creationBlock で pNouns Voter は 2 票)
README.md:88:- `wrangler.toml`: vars(NETWORK/VOTER/PNOUNS/NOUNS_DAO/NOUNS_TOKEN/EXPLORER/BLOCKSCOUT/ONLY_PROPOSER/PUBLIC_URL…)、KV `STATE`(id 4c2f1c68…、旧 838d35dd… は未使用)、cron `* * * * *`
relayer-cf/wrangler.toml:23:NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
relayer-cf/wrangler.toml:49:NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"
docs/AUDIT-BRIEF.md:12:Nouns NFT を持つ pNouns のマルチシグが `PNounsVoter` に投票権を `delegate()` する前提。
scripts/sepolia/lib.js:7:  NOUNS_TOKEN: "0x4C4674bb72a096855496a7204962297bd7e12b85",
scripts/sepolia/lib.js:22:  "function delegate(address)",
scripts/sepolia/lib.js:23:  "function delegates(address) view returns (address)",
scripts/sepolia/05-e2e.js:23:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
scripts/sepolia/04-delegate.js:7:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
scripts/sepolia/04-delegate.js:8:  console.log("delegator", delegator.address, "Nouns:", String(await nouns.balanceOf(delegator.address)), "current delegate:", await nouns.delegates(delegator.address));
scripts/sepolia/04-delegate.js:9:  if ((await nouns.delegates(delegator.address)).toLowerCase() !== dep.voter.toLowerCase()) {
scripts/sepolia/04-delegate.js:10:    const tx = await nouns.delegate(dep.voter);
scripts/sepolia/04-delegate.js:11:    console.log("delegate tx:", tx.hash);
scripts/sepolia/12-deploy-snapvoter.js:20:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
scripts/sepolia/12-deploy-snapvoter.js:21:  await (await nouns.delegate(dep.snapVoter)).wait();
scripts/sepolia/02-buy-nouns.js:11:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
relayer-cf/src/chain.js:29:    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
relayer-cf/src/chain.js:30:    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
relayer-cf/src/chain.js:40:    nounsToken: getAddress(env.NOUNS_TOKEN),
relayer-cf/src/chain.js:177:      { address: c.nounsToken, abi: NOUNS_ABI, functionName: "getCurrentVotes", args: [c.metagov] },
/usr/bin/curl
6.17.0

exec
/bin/bash -lc "git show --format=fuller --stat e11b170; git show --format= -- deployments/sepolia.json relayer-cf/wrangler.toml docs/AUDIT-RESPONSE-2026-08-18.md; sed -n '1,50p' scripts/sepolia/lib.js; rg -n \"PRIVATE_KEY|SEPOLIA\" hardhat.config.js .env.example scripts/sepolia -g '*.js' -g '*.example'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
commit e11b170a0df2545f7cc49428bf5d241fbff05238
Author:     earlgrey <[redacted-email]>
AuthorDate: Thu Aug 20 21:35:36 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Thu Aug 20 21:35:36 2026 +0900

    Sepolia 再デプロイ: 0x64CdACeA6857c6560F3124c532AA4ed34152693F
    
    第10回監査の修正(eligibleAtBlock / InvalidSpace)と、前回未反映だった
    space フィールドを載せた版を Sepolia に再デプロイ。
    
    - space=earl-grey.eth, margin=5, registrationDelayBlocks=5(約1分)
      ※ 旧デプロイは delay=0 で、新しい猶予ロジックを実地で動かせなかった
    - 旧コントラクト(0x9b4A…f5C1)のプール 0.0192 ETH を回収して原資に充当
    - 返金プール 0.02 ETH 投入、Nouns 投票権 2 票を新アドレスへ委任済み
    - Sourcify で exact_match(creation/runtime とも)を確認
    - relayer-cf の VOTER を新アドレスへ切り替えてデプロイ済み
    
    実地検証:
    - eligibleAtBlock が登録時に確定し、owner が delay を 0 に下げても不変
    - 猶予中の castVote は RegistrationTooRecent、猶予明けは通過
    
    E2E スクリプト(13/14)が eligibleAtBlock の明けを待つように修正。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

 deployments/sepolia.json              | 4 ++--
 relayer-cf/wrangler.toml              | 2 +-
 scripts/sepolia/13-snap-e2e.js        | 3 +++
 scripts/sepolia/14-snap-setup-only.js | 3 ++-
 4 files changed, 8 insertions(+), 4 deletions(-)
diff --git a/deployments/sepolia.json b/deployments/sepolia.json
index 6e974fb..fdbe8b6 100644
--- a/deployments/sepolia.json
+++ b/deployments/sepolia.json
@@ -6,6 +6,6 @@
   "marginBlocks": 5,
   "voter": "0x3C7fb408EE6A5c2732770110B6dd48527F360e26",
   "voterDeployBlock": 11514747,
-  "snapVoter": "0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1",
-  "snapVoterDeployBlock": 11527862
+  "snapVoter": "0x64CdACeA6857c6560F3124c532AA4ed34152693F",
+  "snapVoterDeployBlock": 11529065
 }
diff --git a/relayer-cf/wrangler.toml b/relayer-cf/wrangler.toml
index 3f081f1..5bae960 100644
--- a/relayer-cf/wrangler.toml
+++ b/relayer-cf/wrangler.toml
@@ -16,7 +16,7 @@ id = "4c2f1c683fe94191b456e0c1fc70cc2f"
 
 [vars]
 NETWORK = "sepolia"
-VOTER = "0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1"
+VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
 SNAPSHOT_SPACE = "earl-grey.eth"
 PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
 NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
// Sepolia 段階2 共通: アドレス・ABI・デプロイ記録
const fs = require("fs");
const path = require("path");

const SEPOLIA = {
  NOUNS_DAO: "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57",
  NOUNS_TOKEN: "0x4C4674bb72a096855496a7204962297bd7e12b85",
  AUCTION_HOUSE: "0x488609b7113FCf3B761A05956300d605E8f6BcAf",
  PNOUNS_TREASURY: "0x8ae80e0b44205904be18869240c2ec62d2342785", // 本物ソースがコンストラクタで 100 枚をここに mint する定数
};

const DAO_ABI = [
  "function propose(address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,string description) returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function proposalThreshold() view returns (uint256)",
  "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
];
const NOUNS_ABI = [
  "function delegate(address)",
  "function delegates(address) view returns (address)",
  "function getCurrentVotes(address) view returns (uint96)",
  "function getPriorVotes(address,uint256) view returns (uint96)",
  "function balanceOf(address) view returns (uint256)",
];
const AH_ABI = [
  "function auction() view returns (uint96 nounId,uint128 amount,uint40 startTime,uint40 endTime,address bidder,bool settled)",
  "function createBid(uint256 nounId) payable",
  "function settleCurrentAndCreateNewAuction()",
  "function reservePrice() view returns (uint192)",
  "function minBidIncrementPercentage() view returns (uint8)",
  "function duration() view returns (uint256)",
];
const PNOUNS_ABI = [
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function adminMint(address[] to,uint256[] num)",
  "function transferFrom(address,address,uint256)",
];

const FILE = path.join(__dirname, "../../deployments/sepolia.json");
function loadDeployments() {
  return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
}
function saveDeployments(obj) {
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2) + "\n");
}
hardhat.config.js:18:      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
hardhat.config.js:20:      accounts: process.env.SEPOLIA_MNEMONIC ? { mnemonic: process.env.SEPOLIA_MNEMONIC, count: 5 } : [],
scripts/sepolia/lib.js:5:const SEPOLIA = {
scripts/sepolia/lib.js:53:module.exports = { SEPOLIA, DAO_ABI, NOUNS_ABI, AH_ABI, PNOUNS_ABI, loadDeployments, saveDeployments, sleep };
scripts/sepolia/15-reuse-snap.js:4:const { SEPOLIA, DAO_ABI, loadDeployments } = require("./lib");
scripts/sepolia/15-reuse-snap.js:14:  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
scripts/sepolia/14-snap-setup-only.js:5:const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
scripts/sepolia/14-snap-setup-only.js:14:  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
scripts/sepolia/14-snap-setup-only.js:25:    const w = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
scripts/sepolia/14-snap-setup-only.js:30:  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
scripts/sepolia/13-snap-e2e.js:6:const { SEPOLIA, DAO_ABI, PNOUNS_ABI, loadDeployments, sleep } = require("./lib");
scripts/sepolia/13-snap-e2e.js:36:  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
scripts/sepolia/13-snap-e2e.js:44:  const botWallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
scripts/sepolia/13-snap-e2e.js:61:    const wallet = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, `m/44'/60'/0'/0/${i + 2}`);
scripts/sepolia/12-deploy-snapvoter.js:3:const { SEPOLIA, NOUNS_ABI, loadDeployments, saveDeployments } = require("./lib");
scripts/sepolia/12-deploy-snapvoter.js:9:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
scripts/sepolia/12-deploy-snapvoter.js:20:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
scripts/sepolia/04-delegate.js:3:const { SEPOLIA, NOUNS_ABI, loadDeployments } = require("./lib");
scripts/sepolia/04-delegate.js:7:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
scripts/sepolia/05-e2e.js:4:const { SEPOLIA, DAO_ABI, NOUNS_ABI, PNOUNS_ABI, loadDeployments, sleep } = require("./lib");
scripts/sepolia/05-e2e.js:22:  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
scripts/sepolia/05-e2e.js:23:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
scripts/sepolia/02-buy-nouns.js:4:const { SEPOLIA, AH_ABI, NOUNS_ABI, sleep } = require("./lib");
scripts/sepolia/02-buy-nouns.js:11:  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, ethers.provider);
scripts/sepolia/02-buy-nouns.js:12:  const ah = new ethers.Contract(SEPOLIA.AUCTION_HOUSE, AH_ABI, deployer);
scripts/sepolia/03-deploy-voter.js:3:const { SEPOLIA, loadDeployments, saveDeployments } = require("./lib");
scripts/sepolia/03-deploy-voter.js:10:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, [SEPOLIA.PNOUNS_TREASURY], margin);
scripts/sepolia/06-propose.js:3:const { SEPOLIA, DAO_ABI } = require("./lib");
scripts/sepolia/06-propose.js:6:  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);

exec
/bin/bash -lc "node <<'NODE'
require('dotenv').config();
const { Interface, HDNodeWallet, keccak256, toUtf8Bytes, formatEther } = require('ethers');
const url=process.env.SEPOLIA_RPC_URL;
if("'!url) throw new Error('"'SEPOLIA_RPC_URL missing');
let id=1;
async function rpc(method,params=[]){ const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:id++,method,params})}); if("'!res.ok) throw new Error(`HTTP ${res.status}`); const j=await res.json(); if(j.error) throw new Error(`${method}: ${j.error.message}`); return j.result; }
const voter='"'0x64CdACeA6857c6560F3124c532AA4ed34152693F', old='0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1';
const token='0x4C4674bb72a096855496a7204962297bd7e12b85', treasury='0x8ae80e0b44205904be18869240c2ec62d2342785';
const vi=new Interface(['function space() view returns(string)','function spaceHash() view returns(bytes32)','function registrationDelayBlocks() view returns(uint256)','function marginBlocks() view returns(uint256)','function liveMode() view returns(bool)','function refundEnabled() view returns(bool)','function owner() view returns(address)','function registrar() view returns(address)','function excluded(address) view returns(bool)','function pnouns() view returns(address)','function nounsDAO() view returns(address)']);
async function call(to,iface,fn,args=[]){const data=iface.encodeFunctionData(fn,args); const out=await rpc('eth_call',[{to,data},'latest']); return iface.decodeFunctionResult(fn,out)[0];}
const ti=new Interface(['function getCurrentVotes(address) view returns(uint96)','function delegates(address) view returns(address)','function balanceOf(address) view returns(uint256)']);
const names=['space','spaceHash','registrationDelayBlocks','marginBlocks','liveMode','refundEnabled','owner','registrar','pnouns','nounsDAO'];
const result={chainId:parseInt(await rpc('eth_chainId'),16),block:parseInt(await rpc('eth_blockNumber'),16)};
for(const n of names) result[n]=String(await call(voter,vi,n));
result.expectedSpaceHash=keccak256(toUtf8Bytes('earl-grey.eth'));
result.excludedTreasury=String(await call(voter,vi,'excluded',[treasury]));
for(const [label,a] of [['new',voter],['old',old]]) {result[label+'BalanceWei']=BigInt(await rpc('eth_getBalance',[a,'latest'])).toString();result[label+'BalanceEth']=formatEther(result[label+'BalanceWei']);result[label+'CodeBytes']=(await rpc('eth_getCode',[a,'latest'])).slice(2).length/2;result[label+'Votes']=String(await call(token,ti,'getCurrentVotes',[a]));}
if(process.env.SEPOLIA_MNEMONIC){const d=HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC,undefined,\"m/44'/60'/0'/0/1\"); result.delegator=d.address; result.delegates=String(await call(token,ti,'delegates',[d.address]));result.delegatorNouns=String(await call(token,ti,'balanceOf',[d.address]));}
console.log(JSON.stringify(result,null,2));
NODE" in /mnt/data/pnouns-voter
 exited 1 in 0ms:
file:///mnt/data/pnouns-voter/[eval1]:1
require('dotenv').config();
^

ReferenceError: Cannot determine intended module format because both require() and top-level await are present. If the code is intended to be CommonJS, wrap await in an async function. If the code is intended to be an ES module, replace require() with import.
    at file:///mnt/data/pnouns-voter/[eval1]:1:1
    at ModuleJob.run (node:internal/modules/esm/module_job:413:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:268:26)
    at async ModuleLoader.executeModuleJob (node:internal/modules/esm/loader:265:20)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  code: 'ERR_AMBIGUOUS_MODULE_SYNTAX'
}

Node.js v24.12.0

exec
/bin/bash -lc "node <<'NODE'
(async()=>{
require('dotenv').config();
const { Interface, HDNodeWallet, keccak256, toUtf8Bytes, formatEther } = require('ethers');
const url=process.env.SEPOLIA_RPC_URL;if("'!url) throw new Error('"'SEPOLIA_RPC_URL missing');let id=1;
async function rpc(method,params=[]){ const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:id++,method,params})}); if("'!res.ok) throw new Error(`HTTP ${res.status}`); const j=await res.json(); if(j.error) throw new Error(`${method}: ${j.error.message}`); return j.result; }
const voter='"'0x64CdACeA6857c6560F3124c532AA4ed34152693F', old='0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1';
const token='0x4C4674bb72a096855496a7204962297bd7e12b85', treasury='0x8ae80e0b44205904be18869240c2ec62d2342785';
const vi=new Interface(['function space() view returns(string)','function spaceHash() view returns(bytes32)','function registrationDelayBlocks() view returns(uint256)','function marginBlocks() view returns(uint256)','function liveMode() view returns(bool)','function refundEnabled() view returns(bool)','function owner() view returns(address)','function registrar() view returns(address)','function excluded(address) view returns(bool)','function pnouns() view returns(address)','function nounsDAO() view returns(address)']);
async function call(to,iface,fn,args=[]){const data=iface.encodeFunctionData(fn,args); const out=await rpc('eth_call',[{to,data},'latest']); return iface.decodeFunctionResult(fn,out)[0];}
const ti=new Interface(['function getCurrentVotes(address) view returns(uint96)','function delegates(address) view returns(address)','function balanceOf(address) view returns(uint256)']);
const names=['space','spaceHash','registrationDelayBlocks','marginBlocks','liveMode','refundEnabled','owner','registrar','pnouns','nounsDAO'];
const result={chainId:parseInt(await rpc('eth_chainId'),16),block:parseInt(await rpc('eth_blockNumber'),16)};
for(const n of names) result[n]=String(await call(voter,vi,n));
result.expectedSpaceHash=keccak256(toUtf8Bytes('earl-grey.eth'));result.excludedTreasury=String(await call(voter,vi,'excluded',[treasury]));
for(const [label,a] of [['new',voter],['old',old]]) {result[label+'BalanceWei']=BigInt(await rpc('eth_getBalance',[a,'latest'])).toString();result[label+'BalanceEth']=formatEther(result[label+'BalanceWei']);result[label+'CodeBytes']=(await rpc('eth_getCode',[a,'latest'])).slice(2).length/2;result[label+'Votes']=String(await call(token,ti,'getCurrentVotes',[a]));}
if(process.env.SEPOLIA_MNEMONIC){const d=HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC,undefined,\"m/44'/60'/0'/0/1\"); result.delegator=d.address; result.delegates=String(await call(token,ti,'delegates',[d.address]));result.delegatorNouns=String(await call(token,ti,'balanceOf',[d.address]));}
console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exit(1)});
NODE" in /mnt/data/pnouns-voter
 exited 1 in 113ms:
fetch failed

codex
`.env` の `SEPOLIA_RPC_URL` は存在しましたが、サンドボックスからの直接JSON-RPC通信は `fetch failed` で遮断されました（秘密値は表示していません）。したがってBの状態値は「RPC未確認」とし、代わりに既存artifact/build-infoから再現したruntime bytecode、デプロイ記録、公開検証情報まで可能な範囲で独立照合します。
web search: 
web search: https://repo.sourcify.dev/contracts/full_match/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F/metadata.json
web search: 
web search: site:repo.sourcify.dev 0x64CdACeA6857c6560F3124c532AA4ed34152693F ...
web search: 
web search: https://repo.sourcify.dev
web search: 
web search: https://repo.sourcify.dev/contracts/full_match/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F/metadata.json
web search: 
web search: Sourcify API v2 contract lookup address endpoint official documentation
web search: 
web search: https://sourcify.dev/server/v2/contract/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F?fields=all
web search: 
web search: https://sourcify.dev/server
web search: 
web search: https://sourcify.dev/server/v2/contract/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F
exec
/bin/bash -lc "node <<'NODE'
const fs=require('fs'),{keccak256}=require('ethers');
const p='artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json';
const a=JSON.parse(fs.readFileSync(p));
console.log(JSON.stringify({artifact:p,sourceName:a.sourceName,bytecodeBytes:(a.bytecode.length-2)/2,deployedBytes:(a.deployedBytecode.length-2)/2,creationHash:keccak256(a.bytecode),runtimeHash:keccak256(a.deployedBytecode)},null,2));
NODE
stat -c '%y %n' artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json contracts/PNounsSnapVoter.sol
rg -l 'eligibleAtBlock' artifacts/build-info/*.json | xargs -r -n1 basename
rg -n 'solidity|optimizer|evmVersion|viaIR' hardhat.config.js package.json
sed -n '1,80p' hardhat.config.js
find relayer-cf/test -maxdepth 1 -type f -printf '%f\\n' | sort
cat relayer-cf/package.json" in /mnt/data/pnouns-voter
 succeeded in 0ms:
{
  "artifact": "artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json",
  "sourceName": "contracts/PNounsSnapVoter.sol",
  "bytecodeBytes": 16372,
  "deployedBytes": 14780,
  "creationHash": "0xf8cbc93417b3fef280e2490f5773903a3fc3efd40c07b8ae418db9d418a925ea",
  "runtimeHash": "0x573090aff787a41b910e8626791a94aa03edce222e7556562283baf10ab8972e"
}
2026-08-20 21:22:15.823207800 +0900 artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json
2026-08-20 21:22:14.147575800 +0900 contracts/PNounsSnapVoter.sol
9f3d9c69652999d3f9330425b181051d.json
hardhat.config.js:8:  solidity: {
hardhat.config.js:10:      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
hardhat.config.js:12:      { version: "0.8.14", settings: { optimizer: { enabled: true, runs: 200 } } },
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
accept-deadline.test.mjs
cursor.test.mjs
link-check.test.mjs
{
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
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 782ms:
✔ test/accept-deadline.test.mjs (695.326612ms)
✔ test/cursor.test.mjs (712.337381ms)
✔ test/link-check.test.mjs (705.668634ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 722.18009

exec
/bin/bash -lc "cat relayer-cf/test/link-check.test.mjs; nl -ba test/snap.fork.test.js | sed -n '190,280p'; rg -n \"InvalidSpace|eligibleAtBlock|unregisterProposal|registerProposal\" test contracts relayer-cf/test; git status --short" in /mnt/data/pnouns-voter
 succeeded in 0ms:
// 対応付けの自動照合(referencesNounsProposal)の回帰テスト。
// 第10回監査の指摘: 前方一致・偽ドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null を検証すること。
import { test } from "node:test";
import assert from "node:assert/strict";
import { referencesNounsProposal as ref } from "../src/snap.js";

test("正規の URL を検出する", () => {
  assert.equal(ref("https://nouns.wtf/vote/989", 989), true);
  assert.equal(ref("Source: https://nouns.wtf/vote/989\n本文", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989/", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989?tab=activity", 989), true);
  assert.equal(ref("https://nouns.wtf/vote/989#comments", 989), true);
  assert.equal(ref("https://www.nouns.wtf/vote/989", 989), true);
  assert.equal(ref("HTTPS://NOUNS.WTF/vote/989", 989), true, "ホスト名は大文字小文字を区別しない");
  assert.equal(ref("(https://nouns.wtf/vote/989)", 989), true, "括弧で閉じられていても拾う");
  assert.equal(ref("http://nouns.wtf/vote/989", 989), true);
});

test("前方一致で誤検出しない", () => {
  assert.equal(ref("https://nouns.wtf/vote/123", 12), false);
  assert.equal(ref("https://nouns.wtf/vote/12", 123), false);
  assert.equal(ref("https://nouns.wtf/vote/9890", 989), false);
});

test("別ドメイン・別パスを拒否する", () => {
  assert.equal(ref("https://evilnouns.wtf/vote/989", 989), false);
  assert.equal(ref("https://nouns.wtf.evil.com/vote/989", 989), false);
  assert.equal(ref("https://fake.nouns.wtf/vote/989", 989), false, "サブドメインは別ホスト");
  assert.equal(ref("https://nouns.wtf/vote/989/extra", 989), false);
  assert.equal(ref("https://nouns.wtf/proposal/989", 989), false);
  assert.equal(ref("nouns.wtf/vote/989", 989), false, "スキームなしの裸文字列は URL として扱わない");
});

test("空・null・不正な入力で例外を投げず false を返す", () => {
  for (const v of [null, undefined, "", 0, {}, []]) assert.equal(ref(v, 989), false);
  for (const id of [null, undefined, 0, -1, NaN, "abc", 1e21]) assert.equal(ref("https://nouns.wtf/vote/989", id), false);
});

test("正規表現メタ文字を含む入力で壊れない", () => {
  assert.equal(ref("https://nouns.wtf/vote/989", "9+8"), false);
  assert.equal(ref("https://nouns.wtf/vote/.*", 989), false);
});
   190	      const [, , , , , , dave] = await ethers.getSigners();
   191	      let got = 0;
   192	      for (let id = 1; id <= 2100 && got < 3; id++) {
   193	        const owner = (await pnouns.ownerOf(id)).toLowerCase();
   194	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
   195	        const s = await impersonate(owner);
   196	        try { await pnouns.connect(s).transferFrom(owner, dave.address, id); (dave.tokenIds ||= []).push(BigInt(id)); got++; } catch {}
   197	      }
   198	      const vd = await signSnapVote(dave, SNAP2, 1, t1);
   199	      const before = await voterC.tally(pid2);
   200	      // 攻撃者が 1 枚だけ添えて先に投函
   201	      await voterC.castSnapshotVotes([snapVoteArg(vd, [dave.tokenIds[0]])]);
   202	      let t = await voterC.tally(pid2);
   203	      expect(t.tokens[1] - before.tokens[1]).to.equal(1n);
   204	      // 同じ署名で全 token を補完 → 残り 2 枚が同じ賛成に加算、投票者数は据え置き
   205	      const votersBefore = t.voters[1];
   206	      await voterC.castSnapshotVotes([snapVoteArg(vd, dave.tokenIds)]);
   207	      t = await voterC.tally(pid2);
   208	      expect(t.tokens[1] - before.tokens[1]).to.equal(3n);
   209	      expect(t.voters[1]).to.equal(votersBefore);
   210	      // 追加できる token がない再提出は NothingCounted
   211	      await expect(voterC.castSnapshotVotes([snapVoteArg(vd, dave.tokenIds)])).to.be.revertedWithCustomError(voterC, "NothingCounted");
   212	    });
   213	
   214	    it("H02 対策: 登録直後は受け付けず(delay)、未計上なら取消して登録し直せる", async function () {
   215	      await voterC.setRegistrationDelayBlocks(1000);
   216	      const SNAP_X = "0x" + "ee".repeat(32);
   217	      await voterC.registerProposal(SNAP_X, 999999);
   218	      const [, , , , , , , eve] = await ethers.getSigners();
   219	      const ve = await signSnapVote(eve, SNAP_X, 1, 1786902000);
   220	      await expect(voterC.castSnapshotVotes([snapVoteArg(ve, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
   221	      // 未計上なので取消可能 → 別の Nouns 提案に登録し直せる
   222	      await voterC.unregisterProposal(999999);
   223	      await voterC.registerProposal(SNAP_X, 999998);
   224	      expect(await voterC.snapToNouns(ethers.keccak256(ethers.toUtf8Bytes(SNAP_X)))).to.equal(999998n);
   225	      await voterC.setRegistrationDelayBlocks(0);
   226	      // 計上済みの提案(proposalId)は取消不可
   227	      await expect(voterC.unregisterProposal(proposalId)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
   228	    });
   229	
   230	    it("第10回監査 M-2 対策: 登録後に owner が delay を下げても、その提案の受付は前倒しされない", async function () {
   231	      await voterC.setRegistrationDelayBlocks(1000);
   232	      const SNAP_Z = "0x" + "5c".repeat(32);
   233	      await voterC.registerProposal(SNAP_Z, 777777);
   234	      const eligible = await voterC.eligibleAtBlock(777777);
   235	      expect(eligible).to.be.greaterThan(BigInt(await ethers.provider.getBlockNumber()));
   236	      // owner が猶予を 0 に短縮しても、登録済みの提案の解禁ブロックは動かない
   237	      await voterC.setRegistrationDelayBlocks(0);
   238	      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
   239	      const [, , , , , , , , , , grace] = await ethers.getSigners();
   240	      const vz = await signSnapVote(grace, SNAP_Z, 1, 1786902000);
   241	      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
   242	      await expect(voterC.castVote(777777, 0, [1n])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
   243	      // 解禁ブロックまで進めば、猶予は明けている(取消猶予は必ず確保されたうえで受付が始まる)
   244	      await ethers.provider.send("hardhat_mine", ["0x" + (eligible - BigInt(await ethers.provider.getBlockNumber())).toString(16)]);
   245	      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.not.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
   246	      await voterC.unregisterProposal(777777).catch(() => {});
   247	    });
   248	
   249	    it("H02R 対策: 猶予期間中は直接投票も不可。直接投票だけなら取消できる", async function () {
   250	      const { id: pid4, snap: SNAP4 } = await newProposalWithSnap("r");
   251	      await voterC.setRegistrationDelayBlocks(1000);
   252	      const SNAP_Y = "0x" + "77".repeat(32);
   253	      await voterC.registerProposal(SNAP_Y, 888888);
   254	      // 猶予中は直接投票(castVote)も拒否される → 取消の妨害ができない
   255	      const [, , , , , , , , , frank] = await ethers.getSigners();
   256	      let fid;
   257	      for (let id = 1; id <= 2100; id++) {
   258	        const owner = (await pnouns.ownerOf(id)).toLowerCase();
   259	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
   260	        const s2 = await impersonate(owner);
   261	        try { await pnouns.connect(s2).transferFrom(owner, frank.address, id); fid = BigInt(id); break; } catch {}
   262	      }
   263	      await expect(voterC.connect(frank).castVote(888888, 1, [fid])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
   264	      await voterC.unregisterProposal(888888); // 妨害されずに取消できる
   265	      // 猶予ゼロの提案に直接投票しても、Snapshot 票がなければ取消できる
   266	      await voterC.setRegistrationDelayBlocks(0);
   267	      await voterC.connect(frank).castVote(pid4, 1, [fid]);
   268	      expect((await voterC.tally(pid4)).tokens[1]).to.equal(1n);
   269	      expect(await voterC.snapshotVotesCounted(pid4)).to.equal(0n);
   270	      await voterC.unregisterProposal(pid4); // 直接投票は取消を妨げない
   271	      expect(await voterC.nounsToSnap(pid4)).to.equal(ethers.ZeroHash);
   272	    });
   273	
   274	    it("指摘3 対策: 直接投票の後に Snapshot 署名でやり直しても(新規 token 0 でも)取消は不可になる", async function () {
   275	      const { id: pid5, snap: SNAP5 } = await newProposalWithSnap("s");
   276	      const [, , , , , , , , , , grace] = await ethers.getSigners();
   277	      let gid;
   278	      for (let id = 1; id <= 2100; id++) {
   279	        const owner = (await pnouns.ownerOf(id)).toLowerCase();
   280	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
test/snap.fork.test.js:82:    await voterC.registerProposal(SNAP_989, 989);
test/snap.fork.test.js:112:      await voterC.registerProposal(SNAP_TEST, proposalId);
test/snap.fork.test.js:179:      await voterC.registerProposal(snap, id);
test/snap.fork.test.js:217:      await voterC.registerProposal(SNAP_X, 999999);
test/snap.fork.test.js:222:      await voterC.unregisterProposal(999999);
test/snap.fork.test.js:223:      await voterC.registerProposal(SNAP_X, 999998);
test/snap.fork.test.js:227:      await expect(voterC.unregisterProposal(proposalId)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
test/snap.fork.test.js:233:      await voterC.registerProposal(SNAP_Z, 777777);
test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
test/snap.fork.test.js:246:      await voterC.unregisterProposal(777777).catch(() => {});
test/snap.fork.test.js:253:      await voterC.registerProposal(SNAP_Y, 888888);
test/snap.fork.test.js:264:      await voterC.unregisterProposal(888888); // 妨害されずに取消できる
test/snap.fork.test.js:270:      await voterC.unregisterProposal(pid4); // 直接投票は取消を妨げない
test/snap.fork.test.js:295:      await expect(voterC.unregisterProposal(pid5)).to.be.revertedWithCustomError(voterC, "VotesAlreadyCounted");
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:140:    error InvalidSpace();
contracts/PNounsSnapVoter.sol:157:        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:179:    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();

exec
/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '285,365p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '55,145p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '350,455p'; nl -ba scripts/create-and-register.mjs | sed -n '1,105p'; git diff --exit-code && echo CLEAN" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   285	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   286	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   287	    const sentAt = new Date().toISOString();
   288	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   289	    touched = true;
   290	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   291	      await new Promise((r) => setTimeout(r, 1500));
   292	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   293	    }
   294	  }
   295	  if (touched) await flushSummary(store, proposalId, summaries);
   296	  // receipt は待たない(次回 tick の reconcile で確定・通知)
   297	}
   298	
   299	async function maybeExecute(c, pc, wc, store, p, block, mg) {
   300	  const ex = await store.getExecuted(p.id);
   301	  if (ex && ex.pending && ex.tx) {
   302	    // 送信済み・未確定の execute を確定
   303	    let rc = null;
   304	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
   305	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
   306	    const info = await metagovInfo(c, pc, p.id);
   307	    if (rc && rc.status === "success") {
   308	      if (info.executed) {
   309	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
   310	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
   311	        await notify(c, [
   312	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
   313	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
   314	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
   315	          `tx: ${explorerTx(c, ex.tx)}`,
   316	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
   317	        ].filter(Boolean).join("\n"));
   318	      } else {
   319	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
   320	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
   321	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
   322	      }
   323	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
   324	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
   325	    return;
   326	  }
   327	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
   328	  if (ex && !ex.shadow) return;
   329	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
   330	  if (mg.deadline === 0 || block < mg.deadline) return;
   331	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
   332	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
   333	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
   334	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
   335	    return;
   336	  }
   337	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
   338	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
   339	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
   340	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
   341	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
   342	}
   343	
   344	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
   345	async function checkBalance(c, pc, wc, store) {
   346	  const threshold = Number(c.lowBalanceEth);
   347	  const checks = [];
   348	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
   349	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
   350	  for (const ck of checks) {
   351	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
   352	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
   353	    if (await store.getFlag(ck.key)) continue;
   354	    await store.setFlag(ck.key, 86400);
   355	    await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
   356	  }
   357	}
   358	
   359	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
   360	async function reconcileRecent(c, pc, wc, store, proposals) {
   361	  for (const p of proposals.slice(0, 15)) {
   362	    try {
   363	      const pid = String(p.id);
   364	      const sum = await store.getSummary(pid);
   365	      if (sum.votes.some((v) => v.txStatus === "sent")) {
    55	    IERC721 public immutable pnouns;
    56	    INounsDAO public immutable nounsDAO;
    57	    /// @notice 対象の Snapshot スペース(例: "pnounsdao.eth")のハッシュ
    58	    bytes32 public immutable spaceHash;
    59	    /// @notice 対象の Snapshot スペース名(Nouns DAO に残す理由文に使う)
    60	    string public space;
    61	
    62	    mapping(address => bool) public excluded;
    63	    uint256 public marginBlocks;
    64	    bool public liveMode;
    65	    /// @notice Snapshot 提案 ↔ Nouns 提案の対応付けを登録できるアドレス
    66	    address public registrar;
    67	
    68	    bool public refundEnabled = true;
    69	    uint256 public refundCapPerProposal = 0.02 ether;
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
   391	            uint8 nib;
   392	            if (c >= 48 && c <= 57) nib = c - 48;        // 0-9
   393	            else if (c >= 97 && c <= 102) nib = c - 87;  // a-f
   394	            else if (c >= 65 && c <= 70) nib = c - 55;   // A-F
   395	            else revert InvalidFromAddress();
   396	            v = (v << 4) | uint160(nib);
   397	        }
   398	        return address(v);
   399	    }
   400	
   401	    function _arrays(Tally storage t) internal view returns (uint256[3] memory tokens, uint256[3] memory voters) {
   402	        tokens = [uint256(t.againstTokens), t.forTokens, t.abstainTokens];
   403	        voters = [uint256(t.againstVoters), t.forVoters, t.abstainVoters];
   404	    }
   405	    function _decide(uint256[3] memory tokens, uint256[3] memory voters) internal pure returns (uint8) {
   406	        uint256 maxTokens = _max3(tokens[0], tokens[1], tokens[2]);
   407	        if (maxTokens == 0) return ABSTAIN;
   408	        uint8 winner = 3; uint256 bestVoters; bool tie;
   409	        for (uint8 s = 0; s < 3; s++) {
   410	            if (tokens[s] != maxTokens) continue;
   411	            if (winner == 3 || voters[s] > bestVoters) { winner = s; bestVoters = voters[s]; tie = false; }
   412	            else if (voters[s] == bestVoters) { tie = true; }
   413	        }
   414	        return tie ? ABSTAIN : winner;
   415	    }
   416	    function _max3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256 m) { m = a > b ? a : b; if (c > m) m = c; }
   417	
   418	    function _reason(uint256[3] memory tokens, uint256[3] memory voters, uint8 support) internal view returns (string memory) {
   419	        string memory word = support == FOR ? "FOR" : support == AGAINST ? "AGAINST" : "ABSTAIN";
   420	        return string.concat(
   421	            "pNouns holders voted on Snapshot (", space, "), verified on-chain by pNouns Snap Voter: ", word,
   422	            " (tokens for/against/abstain = ", tokens[1].toString(), "/", tokens[0].toString(), "/", tokens[2].toString(),
   423	            ", voters = ", voters[1].toString(), "/", voters[0].toString(), "/", voters[2].toString(), ")"
   424	        );
   425	    }
   426	
   427	    function _refundGas(uint256 startGas, uint256 voteCount, uint256 proposalId) internal {
   428	        if (!refundEnabled) return;
   429	        unchecked {
   430	            uint256 balance = address(this).balance;
   431	            if (balance == 0) return;
   432	            uint256 remainingCap = refundCapPerProposal > refundedForProposal[proposalId] ? refundCapPerProposal - refundedForProposal[proposalId] : 0;
   433	            if (remainingCap == 0) return;
   434	            uint256 basefee = _min(block.basefee, MAX_REFUND_BASE_FEE);
   435	            uint256 gasPrice = _min(tx.gasprice, basefee + MAX_REFUND_PRIORITY_FEE);
   436	            uint256 gasUsed = _min(startGas - gasleft() + REFUND_BASE_GAS, MAX_REFUND_GAS_BASE + MAX_REFUND_GAS_PER_VOTE * voteCount);
   437	            uint256 refundAmount = _min(_min(gasPrice * gasUsed, balance), remainingCap);
   438	            if (refundAmount == 0) return;
   439	            refundedForProposal[proposalId] += refundAmount;
   440	            (bool refundSent, ) = tx.origin.call{value: refundAmount}("");
   441	            if (!refundSent) refundedForProposal[proposalId] -= refundAmount;
   442	            emit RefundableVote(tx.origin, refundAmount, refundSent);
   443	        }
   444	    }
   445	    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
   446	}
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
    69	  const w = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
    70	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
    71	  const c = new ethers.Contract(voter, abi, w);
    72	  const tx = await c.registerProposal(receipt.id, nounsId);
    73	  await tx.wait();
    74	  const delay = Number(await c.registrationDelayBlocks());
    75	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
    76	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
    77	}
    78	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
CLEAN

web search: 
web search: https://repo.sourcify.dev/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F
exec
/bin/bash -lc "node <<'NODE'
const fs=require('fs'),crypto=require('crypto');
const b=JSON.parse(fs.readFileSync('artifacts/build-info/9f3d9c69652999d3f9330425b181051d.json'));
const src=fs.readFileSync('contracts/PNounsSnapVoter.sol','utf8');
const inp=b.input.sources['contracts/PNounsSnapVoter.sol'].content;
const out=b.output.contracts['contracts/PNounsSnapVoter.sol'].PNounsSnapVoter.evm;
const a=JSON.parse(fs.readFileSync('artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json'));
console.log(JSON.stringify({solc:b.solcLongVersion,sourceExact:src===inp,artifactCreationExact:a.bytecode==='0x'+out.bytecode.object,artifactRuntimeExact:a.deployedBytecode==='0x'+out.deployedBytecode.object,settings:b.input.settings},null,2));
NODE
nl -ba relayer-cf/src/chain.js | sed -n '20,61p'; nl -ba relayer-cf/wrangler.toml | sed -n '1,65p'; nl -ba scripts/sepolia/12-deploy-snapvoter.js" in /mnt/data/pnouns-voter
 succeeded in 0ms:
{
  "solc": "0.8.24+commit.e11b9ed9",
  "sourceExact": true,
  "artifactCreationExact": true,
  "artifactRuntimeExact": true,
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "evmVersion": "cancun",
    "outputSelection": {
      "*": {
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers",
          "metadata"
        ],
        "": [
          "ast"
        ]
      }
    }
  }
}
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
     1	// PNounsSnapVoter を Sepolia にデプロイ(space=earl-grey.eth、margin=5、registrar=deployer)し、返金プールを入れて委任を切り替える
     2	const { ethers } = require("hardhat");
     3	const { SEPOLIA, NOUNS_ABI, loadDeployments, saveDeployments } = require("./lib");
     4	async function main() {
     5	  const [deployer, delegator] = await ethers.getSigners();
     6	  const dep = loadDeployments();
     7	  const F = await ethers.getContractFactory("PNounsSnapVoter");
     8	  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
     9	  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
    10	  await c.waitForDeployment();
    11	  // 読み戻して検証(監査 B3-H02R: 設定漏れを起こさない)
    12	  const [gotDelay, gotRegistrar] = [Number(await c.registrationDelayBlocks()), await c.registrar()];
    13	  if (gotDelay !== delay) throw new Error(`registrationDelayBlocks mismatch: ${gotDelay} != ${delay}`);
    14	  console.log(`registrationDelayBlocks=${gotDelay} registrar=${gotRegistrar}`);
    15	  dep.snapVoter = await c.getAddress();
    16	  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
    17	  saveDeployments(dep);
    18	  await (await c.setLiveMode(true)).wait();
    19	  await (await deployer.sendTransaction({ to: dep.snapVoter, value: ethers.parseEther(process.env.FUND_ETH || "0.02") })).wait();
    20	  const nouns = new ethers.Contract(SEPOLIA.NOUNS_TOKEN, NOUNS_ABI, delegator);
    21	  await (await nouns.delegate(dep.snapVoter)).wait();
    22	  console.log("SnapVoter:", dep.snapVoter, "votes:", String(await nouns.getCurrentVotes(dep.snapVoter)));
    23	}
    24	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });

exec
/bin/bash -lc "node --input-type=module <<'NODE'
import {referencesNounsProposal as r} from './relayer-cf/src/snap.js';
for (const s of ['[議案](https://nouns.wtf/vote/989)','https://nouns.wtf/vote/989.','https://nouns.wtf/vote/989,','https://nouns.wtf/vote/989。','前https://nouns.wtf/vote/989後','https://nouns.wtf/\\nvote/989','https://nouns.wtf/vote/989\\n次行']) console.log(JSON.stringify(s),r(s,989));
NODE" in /mnt/data/pnouns-voter
 succeeded in 570ms:
"[議案](https://nouns.wtf/vote/989)" true
"https://nouns.wtf/vote/989." false
"https://nouns.wtf/vote/989," false
"https://nouns.wtf/vote/989。" false
"前https://nouns.wtf/vote/989後" false
"https://nouns.wtf/\nvote/989" false
"https://nouns.wtf/vote/989\n次行" true

exec
/bin/bash -lc "rg -n \"app\\.get|/api/|metagov|chainId|config\" relayer-cf/src/index.js relayer-cf/public/index.html | head -120; nl -ba relayer-cf/src/index.js | sed -n '1,220p'; git status --short" in /mnt/data/pnouns-voter
 succeeded in 0ms:
relayer-cf/src/index.js:4:import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
relayer-cf/src/index.js:19:app.get("/api/config", (ctx) => {
relayer-cf/src/index.js:22:  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
relayer-cf/src/index.js:25:app.get("/api/proposals", async (ctx) => {
relayer-cf/src/index.js:30:  const cacheKey = new Request(`https://cache.local/api/proposals?closed=${closedN}&n=${c.network}`);
relayer-cf/src/index.js:42:    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
relayer-cf/src/index.js:46:    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
relayer-cf/src/index.js:54:app.get("/api/tokens/:address", async (ctx) => {
relayer-cf/src/index.js:66:      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
relayer-cf/src/index.js:67:      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
relayer-cf/src/index.js:96:app.post("/api/vote", async (ctx) => {
relayer-cf/src/index.js:125:    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
relayer-cf/src/index.js:126:    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
relayer-cf/src/index.js:127:    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
relayer-cf/src/index.js:150:app.get("/api/signatures/:id", async (ctx) => {
relayer-cf/src/index.js:158:  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES,
relayer-cf/src/index.js:166:    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args] }); }
relayer-cf/src/index.js:167:    catch { good = []; for (const a of args.slice(0, 10)) { try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[a]] }); good.push(a); } catch {} } }
relayer-cf/src/index.js:172:      try { const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good], account: account || undefined }); out.gasHint = Number((est * 14n) / 10n); }
relayer-cf/src/index.js:181:app.get("/api/proposal/:id", async (ctx) => {
relayer-cf/src/index.js:187:  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
relayer-cf/src/index.js:188:  return ctx.json({ id, metagov: mg, votes: sum.votes, executed });
relayer-cf/src/index.js:192:app.post("/api/tick", async (ctx) => {
     1	// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信(public/_headers で CSP)。
     2	import { Hono } from "hono";
     3	import { recoverTypedDataAddress, encodeFunctionData } from "viem";
     4	import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
     5	import { makeStore } from "./store.js";
     6	import { tick, notifyError } from "./worker.js";
     7	
     8	const app = new Hono();
     9	
    10	// API 応答の防御ヘッダー
    11	app.use("*", async (ctx, next) => {
    12	  await next();
    13	  ctx.header("X-Content-Type-Options", "nosniff");
    14	  ctx.header("X-Frame-Options", "DENY");
    15	  ctx.header("Referrer-Policy", "no-referrer");
    16	  ctx.header("Cache-Control", "no-store");
    17	});
    18	
    19	app.get("/api/config", (ctx) => {
    20	  const c = cfg(ctx.env);
    21	  const snap = !!c.snapshotSpace;
    22	  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
    23	});
    24	
    25	app.get("/api/proposals", async (ctx) => {
    26	  const c = cfg(ctx.env);
    27	  // Cache API(コロ単位)で 30 秒キャッシュ。クエリ差でキャッシュを迂回されないよう closed は 0/8 に正規化してキーにする
    28	  const closedN = ctx.req.query("closed") ? 8 : 0;
    29	  const cache = caches.default;
    30	  const cacheKey = new Request(`https://cache.local/api/proposals?closed=${closedN}&n=${c.network}`);
    31	  const hit = await cache.match(cacheKey);
    32	  if (hit) return hit;
    33	  const { publicClient: pc } = clients(c);
    34	  const store = makeStore(ctx.env.STATE, storeNs(c));
    35	  const { block, proposals } = await recentProposals(c, pc);
    36	  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
    37	  const limited = closedN ? wanted.slice(0, closedN) : wanted;
    38	  const snapmap = c.snapshotSpace ? ((await ctx.env.STATE.get(`${store.prefix}snapmap`, "json")) || {}) : {};
    39	  const snapByNouns = Object.fromEntries(Object.entries(snapmap).map(([k, v]) => [v, k]));
    40	  const list = await Promise.all(limited.map(async (p) => {
    41	    const votable = p.state === 0 || p.state === 1;
    42	    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
    43	    const snapshotProposalId = snapByNouns[p.id] || null;
    44	    const votes = sum.votes;
    45	    const acceptUntil = mg.deadline ? acceptDeadline(c, mg.deadline) : 0;
    46	    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
    47	  }));
    48	  const res = ctx.json({ block, proposals: list });
    49	  const toCache = new Response(res.body, res); toCache.headers.set("Cache-Control", "public, max-age=30");
    50	  ctx.executionCtx.waitUntil(cache.put(cacheKey, toCache.clone()));
    51	  return toCache;
    52	});
    53	
    54	app.get("/api/tokens/:address", async (ctx) => {
    55	  const c = cfg(ctx.env);
    56	  const { publicClient: pc } = clients(c);
    57	  const store = makeStore(ctx.env.STATE, storeNs(c));
    58	  if (!/^0x[0-9a-fA-F]{40}$/.test(ctx.req.param("address"))) return ctx.json({ error: "bad address" }, 400); // L-08: 入力エラーは 400、障害通知しない
    59	  const address = getAddress(ctx.req.param("address"));
    60	  const ids = await tokensOf(c, pc, address);
    61	  const proposalId = ctx.req.query("proposalId");
    62	  let voted = {}, hasVoted = false, pending = null;
    63	  if (proposalId && /^\d{1,10}$/.test(proposalId)) {
    64	    const pid = BigInt(proposalId);
    65	    const res = await pc.multicall({ contracts: [
    66	      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
    67	      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
    68	    ], allowFailure: false });
    69	    hasVoted = res[0];
    70	    ids.forEach((id, i) => { voted[id] = res[i + 1]; });
    71	    const rec = await store.getVote(String(pid), address);
    72	    if (rec) {
    73	      const st = (await store.getSummary(String(pid))).votes.find((v) => v.voter.toLowerCase() === address.toLowerCase()) || {};
    74	      pending = { support: rec.support, tokenIds: rec.tokenIds, tx: st.tx, txStatus: st.txStatus, receivedAt: rec.receivedAt };
    75	    }
    76	  }
    77	  return ctx.json({ address, tokenIds: ids, voted, hasVoted, pending });
    78	});
    79	
    80	// M-01R: 本文をストリームで最大 64KB まで読む(Content-Length に依存しない)
    81	async function readJsonLimited(req, limit = 65536) {
    82	  const reader = req.body?.getReader();
    83	  if (!reader) return null;
    84	  const chunks = []; let total = 0;
    85	  while (true) {
    86	    const { done, value } = await reader.read();
    87	    if (done) break;
    88	    total += value.byteLength;
    89	    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
    90	    chunks.push(value);
    91	  }
    92	  const buf = new Uint8Array(total); let o = 0; for (const ch of chunks) { buf.set(ch, o); o += ch.byteLength; }
    93	  return JSON.parse(new TextDecoder().decode(buf));
    94	}
    95	
    96	app.post("/api/vote", async (ctx) => {
    97	  const c = cfg(ctx.env);
    98	  if (c.snapshotSpace) return ctx.json({ error: `voting happens on Snapshot: https://snapshot.box/#/s:${c.snapshotSpace}`, code: "snapshot_mode" }, 410);
    99	  const { publicClient: pc } = clients(c);
   100	  const store = makeStore(ctx.env.STATE, storeNs(c));
   101	  let body;
   102	  try { body = await readJsonLimited(ctx.req.raw); } catch (e) { return ctx.json({ error: e.message === "payload too large" ? "payload too large" : "bad json" }, e.message === "payload too large" ? 413 : 400); }
   103	  const { proposalId, support, tokenIds, signature } = body || {};
   104	  if (proposalId === undefined || !/^\d{1,10}$/.test(String(proposalId)) || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || !tokenIds.length || typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return ctx.json({ error: "bad request" }, 400);
   105	  if (tokenIds.length > 300) return ctx.json({ error: "too many tokenIds" }, 400);
   106	  // Low: 正規化(BigInt 化した正規値で検証・保存)
   107	  const pid = BigInt(String(proposalId));
   108	  const pidKey = pid.toString();
   109	  const seen = new Set(); const ids = [];
   110	  for (const x of tokenIds) {
   111	    if (!/^\d{1,5}$/.test(String(x))) return ctx.json({ error: `invalid tokenId ${x}` }, 400);
   112	    const n = BigInt(String(x));
   113	    if (n < 1n || n > 2100n || seen.has(n.toString())) return ctx.json({ error: `invalid or duplicate tokenId ${x}` }, 400);
   114	    seen.add(n.toString()); ids.push(n);
   115	  }
   116	  let voter;
   117	  try { voter = await recoverTypedDataAddress({ domain: domain(c), types: VOTE_TYPES, primaryType: "Vote", message: { proposalId: pid, support: Number(support), tokenIds: ids }, signature }); }
   118	  catch { return ctx.json({ error: "invalid signature" }, 400); }
   119	  // 署名者ごとの簡易レート制限(60 秒に 1 回。KV 最小 TTL)
   120	  if (await store.getFlag(`rl:${voter.toLowerCase()}`)) return ctx.json({ error: "too many requests, retry later" }, 429);
   121	  const owners = await allOwners(c, pc);
   122	  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
   123	  const [state, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
   124	    { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [pid] },
   125	    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
   126	    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
   127	    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
   128	  ], allowFailure: false }).then((r) => [Number(r[0]), Number(r[1]), r[2], r[3]]);
   129	  const block = Number(await pc.getBlockNumber());
   130	  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
   131	  if (hasVoted) return ctx.json({ error: "already voted on-chain" }, 400);
   132	  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
   133	  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
   134	  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
   135	  // M-14R: 受付容量(締切までに確実に投函できる数)を超える場合は受け付けない
   136	  const sumNow = await store.getSummary(pidKey);
   137	  const pendingNow = sumNow.votes.filter((v) => !v.tx && !v.dropped).length;
   138	  const capacity = submitCapacity(c, block, deadline);
   139	  if (pendingNow >= capacity) return ctx.json({ error: "relayer capacity before the deadline is full; please submit on-chain yourself (manual submit button / castVote)", code: "capacity_full", pending: pendingNow, capacity }, 400);
   140	  const existing = await store.getVote(pidKey, voter);
   141	  if (existing) { const st = sumNow.votes.find((v) => v.voter.toLowerCase() === voter.toLowerCase()); if (st && st.tx) return ctx.json({ error: "already submitted" }, 400); }
   142	  await store.setFlag(`rl:${voter.toLowerCase()}`, 60);
   143	  await store.putVote(pidKey, voter, { support: Number(support), tokenIds: ids.map(String), signature, receivedAt: new Date().toISOString() });
   144	  await store.markDirty(pidKey); // ワーカーが次回 tick で list → サマリー更新
   145	  console.log(`[api] vote received: prop ${pidKey} ${voter} support=${support} tokens=${ids.length}`);
   146	  return ctx.json({ ok: true, voter, proposalId: pidKey, support: Number(support), tokenIds: ids.map(String) });
   147	});
   148	
   149	// 署名の公開: 誰でも取得・投函できる。?calldata=1 でいま通る署名(最大 MAX_BATCH 件)の calldata と実見積りガス
   150	app.get("/api/signatures/:id", async (ctx) => {
   151	  const c = cfg(ctx.env);
   152	  if (c.snapshotSpace) return ctx.json({ error: "snapshot mode: votes are public on the Snapshot hub", code: "snapshot_mode" }, 410);
   153	  const { publicClient: pc, account } = clients(c);
   154	  const store = makeStore(ctx.env.STATE, storeNs(c));
   155	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
   156	  const id = BigInt(ctx.req.param("id")).toString();
   157	  const summaries = (await store.getSummary(id)).votes; // 公開 API は list しない(サマリーはワーカーが更新)
   158	  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES,
   159	    pending: summaries.filter((v) => !v.tx && !v.dropped), submitted: summaries.filter((v) => v.tx), dropped: summaries.filter((v) => v.dropped) };
   160	  if (ctx.req.query("calldata") && out.pending.length) {
   161	    const cand = out.pending.slice(0, c.maxBatch);
   162	    const fulls = [];
   163	    for (const s of cand) { const v = await store.getVote(id, s.voter); if (v) fulls.push({ voter: s.voter, ...v }); }
   164	    const args = fulls.map((v) => ({ proposalId: BigInt(id), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature }));
   165	    let good = args;
   166	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args] }); }
   167	    catch { good = []; for (const a of args.slice(0, 10)) { try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[a]] }); good.push(a); } catch {} } }
   168	    out.submittable = good.length;
   169	    out.remaining = out.pending.length - good.length;
   170	    out.calldata = good.length ? encodeFunctionData({ abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good] }) : null;
   171	    if (good.length) {
   172	      try { const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good], account: account || undefined }); out.gasHint = Number((est * 14n) / 10n); }
   173	      catch { out.gasHint = 200000 + 80000 * good.length + 8000 * good.reduce((a, v) => a + v.tokenIds.length, 0); }
   174	    } else out.gasHint = 0;
   175	  }
   176	  // 署名本文も公開(誰でも投函できるように)。get のみ
   177	  if (ctx.req.query("full")) { out.pendingFull = []; for (const s of out.pending.slice(0, c.maxBatch)) { const v = await store.getVote(id, s.voter); if (v) out.pendingFull.push({ voter: s.voter, ...v }); } }
   178	  return ctx.json(out);
   179	});
   180	
   181	app.get("/api/proposal/:id", async (ctx) => {
   182	  const c = cfg(ctx.env);
   183	  const { publicClient: pc } = clients(c);
   184	  const store = makeStore(ctx.env.STATE, storeNs(c));
   185	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
   186	  const id = Number(ctx.req.param("id"));
   187	  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
   188	  return ctx.json({ id, metagov: mg, votes: sum.votes, executed });
   189	});
   190	
   191	// 手動トリガ(TICK_TOKEN 設定時のみ有効)
   192	app.post("/api/tick", async (ctx) => {
   193	  if (!ctx.env.TICK_TOKEN) return ctx.json({ error: "disabled" }, 404);
   194	  if (ctx.req.header("x-tick-token") !== ctx.env.TICK_TOKEN) return ctx.json({ error: "forbidden" }, 403);
   195	  await tick(ctx.env);
   196	  return ctx.json({ ok: true });
   197	});
   198	
   199	// L-08: 内部障害(KV / RPC / 送信)だけ Discord 通知。入力起因の例外は 400 で返し通知しない
   200	const INTERNAL_ERR = new Set(["HttpRequestError", "TimeoutError", "RpcRequestError", "InternalRpcError", "LimitExceededRpcError", "ResourceUnavailableRpcError"]);
   201	function isInternalError(e) { return INTERNAL_ERR.has(e?.name) || /KV|Too many|limit|exceeded|network|fetch failed/i.test(e?.message || ""); }
   202	function isClientError(e) { return ["InvalidAddressError", "SyntaxError", "SizeExceedsPaddingSizeError", "InvalidHexValueError"].includes(e?.name) || /^Address ".*" is invalid/.test(e?.message || ""); }
   203	app.onError((e, ctx) => {
   204	  if (isClientError(e)) return ctx.json({ error: "bad request" }, 400);
   205	  console.error(e);
   206	  if (isInternalError(e)) { try { const c = cfg(ctx.env); ctx.executionCtx.waitUntil(notifyError(c, `api ${new URL(ctx.req.url).pathname}`, e)); } catch {} }
   207	  return ctx.json({ error: e.shortMessage || e.message }, 500);
   208	});
   209	
   210	export default {
   211	  fetch: app.fetch,
   212	  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
   213	};

web search: 
web search: https://pnouns-voter.x402-adsb-worker.workers.dev/api/config
web search: 
web search: pnouns-voter.x402-adsb-worker.workers.dev
exec
/bin/bash -lc "nl -ba docs/AUDIT-RESPONSE-2026-08-18.md | sed -n '137,154p'; rg -n \"Snapshot 署名|直接.*取消|自己申告|取り違え|機械\" docs/member-proposal-unified.html docs/AUDIT-RESPONSE-2026-08-18.md | tail -30; nl -ba relayer-cf/src/snap.js | sed -n '42,115p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   137	生ログ: `docs/audit-10-codex-raw.md`
   138	
   139	| # | 重大度 | 指摘 | 対応 |
   140	|---|---|---|---|
   141	| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
   143	| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
   144	| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
   145	| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
   146	| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
   147	| 7 | Low | 照合ロジックに回帰テストがない | 修正: `relayer-cf/test/link-check.test.mjs` を追加(前方一致・偽ドメイン・サブドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null・メタ文字の 22 ケース) |
   148	| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |
   149	
   150	問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
   151	
   152	**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/AUDIT-RESPONSE-2026-08-18.md:109:| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/AUDIT-RESPONSE-2026-08-18.md:144:| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/member-proposal-unified.html:129:<tr><td>Snapshot の結果と Nouns DAO への投票が<b>一致している保証がない</b><br><span style="font-size:13px;color:var(--ink-2)">※ Snapshot の票を数えて Nouns の投票と見比べれば、いまでも人力で確認はできます。問題は「一致させる強制力がない」こと、そして<b>ズレても誰も自動では気づかない</b>ことです</span></td><td><b>解消</b>: 一致は「人が守るルール」ではなく<b>コントラクトの処理そのもの</b>になります(集計した結果がそのまま投票になるので、ズレる余地がありません)。加えて集計の内訳が Nouns DAO の記録に残るので、Snapshot の公開署名から誰でも機械的に検算できます</td></tr>
docs/member-proposal-unified.html:176:  <p style="margin:0;font-size:14px"><b>②の中身と、その限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第 N 号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番環境ではその議案の処理を停止します。ただし<b>これは万能ではありません</b>。URL は提案を作った人が書いた自己申告なので、<b>この照合が捕まえられるのは「別の提案を取り違えて登録した」類の事故まで</b>で、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵や作成プログラムが乗っ取られた場合)は見抜けません。そこは①③④で受け止める設計です。</p>
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
   111	    const r = rows[i]; const rec = recs[i];
   112	    const created = Number(r.created);
   113	    const tokens = tokenCounts[i] ?? 0;
   114	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
   115	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)

exec
/bin/bash -lc "node <<'NODE'
const a=require('./artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json');console.log(JSON.stringify(a.immutableReferences,null,2));
NODE
node <<'NODE'
const b=require('./artifacts/build-info/9f3d9c69652999d3f9330425b181051d.json');
function walk(n){if("'!n||typeof n!=='"'object')return; if(n.nodeType==='VariableDeclaration'&&n.mutability==='immutable')console.log(n.id,n.name,n.typeDescriptions?.typeString);for(const v of Object.values(n))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v)}walk(b.output.sources['contracts/PNounsSnapVoter.sol'].ast)
NODE" in /mnt/data/pnouns-voter
 succeeded in 0ms:
undefined
7030 pnouns contract IERC721
7033 nounsDAO contract INounsDAO
7036 spaceHash bytes32

exec
/bin/bash -lc "node <<'NODE'
const b=require('./artifacts/build-info/9f3d9c69652999d3f9330425b181051d.json');const d=b.output.contracts['contracts/PNounsSnapVoter.sol'].PNounsSnapVoter.evm.deployedBytecode;console.log(JSON.stringify(d.immutableReferences,null,2));
NODE" in /mnt/data/pnouns-voter
 succeeded in 0ms:
{
  "7030": [
    {
      "length": 32,
      "start": 1602
    },
    {
      "length": 32,
      "start": 10888
    }
  ],
  "7033": [
    {
      "length": 32,
      "start": 1269
    },
    {
      "length": 32,
      "start": 5920
    },
    {
      "length": 32,
      "start": 6985
    },
    {
      "length": 32,
      "start": 8005
    }
  ],
  "7036": [
    {
      "length": 32,
      "start": 2430
    },
    {
      "length": 32,
      "start": 4724
    }
  ]
}

exec
/bin/bash -lc "node <<'NODE'
const fs=require('fs'),{keccak256,toUtf8Bytes,zeroPadValue}=require('ethers');const b=require('./artifacts/build-info/9f3d9c69652999d3f9330425b181051d.json');const d=b.output.contracts['contracts/PNounsSnapVoter.sol'].PNounsSnapVoter.evm.deployedBytecode;let hex=d.object;const vals={'7030':zeroPadValue('0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6',32).slice(2),'7033':zeroPadValue('0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57',32).slice(2),'7036':keccak256(toUtf8Bytes('earl-grey.eth')).slice(2)};for(const [id,refs] of Object.entries(d.immutableReferences))for(const r of refs)hex=hex.slice(0,r.start*2)+vals[id]+hex.slice((r.start+r.length)*2);console.log(JSON.stringify({patchedRuntimeBytes:hex.length/2,patchedRuntimeHash:keccak256('0x'+hex),spaceHash:'0x'+vals['7036']},null,2));
NODE" in /mnt/data/pnouns-voter
 succeeded in 116ms:
{
  "patchedRuntimeBytes": 14780,
  "patchedRuntimeHash": "0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327",
  "spaceHash": "0x069910a7c7d7187fc5a633c3480419056fbd23069b8f9bbcceedca36fd552730"
}

exec
/bin/bash -lc 'find .. -name AGENTS.md -print' in /mnt/data/pnouns-voter
 succeeded in 7376ms:
../RuView/repo/plugins/ruview/codex/AGENTS.md
../zotero/zotero_auto_ingest/translation-server/modules/translators/AGENTS.md
../EC_site/AGENTS.md
../EC_site/node_modules/next/AGENTS.md
../LineHernes/line-harness-oss/AGENTS.md

codex
# 第11回監査結果

結論として、Sepolia再デプロイの設定ファイル反映は確認できましたが、第10回Highのfail-closed修正には未解消経路があります。Snapshot Hubが正常応答を返しても、対象mappingだけ取得できなかった場合は締切後の部分集計execute／`no votes`確定へ到達します。本番移行前の修正を推奨します。

`.env` の `SEPOLIA_RPC_URL` へ読み取り専用JSON-RPCを試みましたが、サンドボックスのネットワーク制限により `fetch failed` となりました。このためオンチェーン値、残高、委任、実バイトコードは未確認です。リポジトリは変更していません。

## A. 第10回指摘の再検証

### 1. [重大度 High] fail-closedは「Hub成功・対象mapping未発見」を止めない

該当箇所: [snap.js:62](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:62)、[snap.js:75](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:75)、[snap.js:82](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:82)、[worker.js:413](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:413)、[worker.js:429](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:429)、[worker.js:464](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:464)

何が起きるか:

- GraphQL例外時は `mappingsResolved=false` のまま早期returnするため、前回の直接的なfail-openは修正されています。
- `SNAPSHOT_SPACE` 未設定時は早期return判定に入らず、非Snapshotモードを誤停止しません。
- しかしHubが正常に「提案0件」を返した場合、またはオンチェーンにmappingがあるのに200件以内で該当Snapshot提案が見つからない場合、`resolveMappings()` は空配列を正常返却します。
- Workerはそれでも `mappingsResolved=true` とし、当該Nouns提案の `snapInfo=null` のまま進みます。
- 締切前は告知・投函されませんが、締切後は `maybeExecute()` に入り、障害前の部分集計をexecute、または`no votes`を確定できます。

つまり「Hub失敗」と「成功したが対象mappingを解決できない」は区別されていますが、後者を安全と扱っている点が欠陥です。

残高チェックは早期returnより前であり、継続してよい処理です。`reconcileRecent()`も前ですが、新規投函・新規executeは行わず送信済みtxの確定を記録する処理なので、基本的には継続が妥当です。

推奨する修正:

- tick全体のbooleanではなく、提案ごとに `unregistered / resolved / registered-but-unresolved` を返す。
- `nounsToSnap(id) != 0` なのに `snapInfo` を得られない提案は、告知・投函・execute・`no votes`確定をすべて停止する。
- Snapshotモードで未登録提案をexecute対象にするかも明示的に決める。
- Hub正常0件、逆引き未発見、GraphQL例外、締切前後を含むWorkerレベルテストを追加する。

### 2. [重大度 Info] 自己申告URLの限界・取消条件の資料修正は妥当

該当箇所: [snap.js:93](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:93)、[member-proposal-unified.html:176](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:176)、[AUDIT-RESPONSE:142](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:142)、[AUDIT-RESPONSE:144](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:144)

何が起きるか:

資料は、URL照合が通常の取り違えを検出する補助チェックであり、悪意あるregistrarや提案作成鍵の侵害を防げないことを明記しています。

また、取消不可条件を「Snapshot署名が受理された場合」に限定し、直接投票後も取消可能でtally等が残る設計を説明しています。主張とコードは一致しています。

推奨する修正: なし。author・type・choices等を照合していない信頼モデルは引き続き残ります。

### 3. [重大度 Medium] URL解析に句読点・全角後置文字の検出回帰がある

該当箇所: [snap.js:48](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:48)、[snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[link-check.test.mjs:5](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:5)

何が起きるか:

実測結果は次のとおりです。

- Markdown `[議案](https://nouns.wtf/vote/989)`：検出可能
- 括弧で閉じたURL：検出可能
- URL末尾の `.`, `,`, `。`：検出不能
- `https://nouns.wtf/vote/989後`：検出不能
- URL自体が改行で分断：検出不能
- URLの後に通常の改行：検出可能

以前の正規表現は数字と句読点・全角文字の境界で `\b` が成立するため、末尾句読点や日本語後置文字を検出できるケースがありました。したがって実際の回帰です。現在のテストは偽ドメイン、大小文字、prefix、query等は良好ですが、Markdown、ASCII/全角句読点、日本語に挟まれたURL、改行分断を網羅していません。

推奨する修正:

URL候補末尾からUnicode句読点を安全に除去してから解析するか、Markdownパーサー等でリンク先を抽出してください。分断URLを許容しないなら、その仕様を明示してfalseのテストを追加してください。

### 4. [重大度 Low] 告知順序は改善したが、旧告知形式と送信失敗に問題が残る

該当箇所: [worker.js:28](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:28)、[worker.js:31](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:31)、[worker.js:38](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:38)、[worker.js:450](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:450)

何が起きるか:

- `linkBad` 判定後へ告知を移した点は正しいです。
- mainnetでは`linkBad`・`timelineBad`とも告知、投函、executeを停止します。
- testnetでは`linkBad`の場合は告知しませんが処理は継続し、`timelineBad`の場合は警告しつつ告知・処理を継続します。安全側の挙動として矛盾はありません。
- 旧ISO形式は誤って再告知されません。しかしsnapIdを持たないため、mappingを張り替えても再告知できず、「張替え後に再告知」の主張は旧レコードには成立しません。
- `"late"`も引き続き再告知されず、締切後の記録として妥当です。
- 告知済みレコードをDiscord送信より先に保存しており、送信失敗でも永久に告知済みになります。

今回のSepolia再デプロイではKV namespaceにVoterアドレスが含まれるため、旧コントラクトのISOレコードとは分離され、この移行自体では旧形式問題は通常発生しません。

推奨する修正:

旧ISO形式を「snapId不明」として一度だけ移行する方針を決め、Discord 2xx確認後に告知済みレコードを保存してください。

### 5. [重大度 Info] `eligibleAtBlock`の登録時確定は正しく実装

該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[PNounsSnapVoter.sol:189](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:189)、[PNounsSnapVoter.sol:194](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:194)、[PNounsSnapVoter.sol:202](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:202)、[PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)

何が起きるか:

- 登録時に現在のdelayから確定します。
- 取消時に削除されるため、同じNouns IDへの再登録でも新しいdelayで再設定されます。
- Snapshot投票入口は登録済みhashからNouns IDを得るため、正常登録で`eligibleAtBlock=0`になる経路はありません。
- 新コントラクトはupgrade/migration型ではないため、旧コントラクトのmappingだけ移行して期限が0になる経路もありません。
- 未登録IDへの直接`castVote`はdelayを適用しませんが、これはSnapshot mappingの取消猶予とは独立した意図的な退路です。

推奨する修正: 再登録を同じNouns IDで行い、新しい`eligibleAtBlock`を直接比較するテストを追加すると境界がより明確です。

### 6. [重大度 Low] `notify()`戻り値の利用は一部だけ

該当箇所: [worker.js:8](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:8)、[worker.js:105](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:105)、[worker.js:140](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:140)、[worker.js:354](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:354)、[worker.js:433](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:433)

何が起きるか:

`linkwarn`と`endwarn`は2xx後にフラグを立てるよう修正され、前回指摘は直接修正されています。一方、以下は通知前に抑止状態を保存します。

- 投函成功通知の`notified:tx`
- Snapshot投函成功通知の`notified:tx`
- 残高警告フラグ
- 告知済みレコード
- `notifyError()`の1時間メモリ抑止

送信失敗時に通知だけ再試行されない問題が残ります。オンチェーン/KVの業務状態を戻す必要はありませんが、通知用フラグは成功後に立てるべきです。

推奨する修正: 業務状態と通知済み状態を分離し、2xx後にのみ通知済みフラグを保存してください。

### 7. [重大度 Low] 回帰テストは純関数のみで、重要なWorker経路が未検証

該当箇所: [link-check.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs)、[worker.js:391](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:391)

何が起きるか:

追加された22ケースはURL純関数には有用です。しかし前回推奨した以下のテストがありません。

- GraphQL error時の告知・execute抑止
- 成功0件／対象mapping未発見
- 告知と警告の順序
- Discord失敗時のKV write
- mainnet/testnet差分
- 30分後のdelay再確認

実行結果は `relayer-cf npm test` が3ファイルすべてpassでした。

推奨する修正: `tick()`のRPC、Hub、KV、時刻、通知を注入可能にしてWorkerレベルの状態遷移テストを追加してください。

### 8. [重大度 Info] `InvalidSpace`の1～64 bytes境界は妥当

該当箇所: [PNounsSnapVoter.sol:152](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:152)、[PNounsSnapVoter.sol:157](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:157)

何が起きるか:

0 bytesと65 bytes以上を拒否し、1および64 bytesを許可します。文字数ではなくUTF-8 byte数ですが、実際の`earl-grey.eth`／`pnounsdao.eth`には十分です。ガス膨張対策として64 bytesは妥当な運用上限です。

推奨する修正: 0、1、64、65 bytesおよびマルチバイト文字の境界テストを追加してください。

## B. デプロイ確認

### 9. [重大度 Info] 新コントラクト状態 — オンチェーン未確認

該当箇所: `0x64CdACeA6857c6560F3124c532AA4ed34152693F`

RPC接続不能のため、次の実値は未確認です。

- `space`
- `spaceHash`
- `registrationDelayBlocks`
- `marginBlocks`
- `liveMode`
- `refundEnabled`
- `owner`
- `registrar`
- ETH残高
- Sepolia pNouns treasuryの`excluded`

静的には、デプロイスクリプト・設定・コミット記録が期待値と整合しています。[12-deploy-snapvoter.js:8](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:8)、[wrangler.toml:17](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:17)

期待される`spaceHash`は:

`0x069910a7c7d7187fc5a633c3480419056fbd23069b8f9bbcceedca36fd552730`

推奨する修正: ネットワーク利用可能環境で列挙されたgetterを`eth_call`し、結果を監査ログへ保存してください。

### 10. [重大度 Info] バイトコード一致 — ローカル再現済み、オンチェーン比較は未確認

該当箇所: [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol)、`artifacts/build-info/9f3d…json`

確認できたこと:

- build-info内のソースと現在のSolidityファイルは完全一致
- artifactとbuild-infoのcreation/runtime bytecodeは完全一致
- solc `0.8.24+commit.e11b9ed9`
- optimizer 200、EVM Cancun
- Sepoliaのimmutable値を埋めた期待runtimeは14,780 bytes
- 期待runtime hashは  
  `0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327`

実際の`eth_getCode`を取得できなかったため、このhashとの最終比較は未確認です。Sourcify APIは公式にコントラクト検索を提供しますが、この環境では対象レスポンスを取得できませんでした。[Sourcify API仕様](https://docs.sourcify.dev/docs/api/index.html)

推奨する修正: `keccak256(eth_getCode(address))`を上記hashと比較してください。

### 11. [重大度 Info] 旧残高・Nouns委任 — 未確認

該当箇所: 旧 `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`、新 `0x64Cd…693F`

RPC接続不能のため、旧残高、新旧`getCurrentVotes()`、Nouns保有者の`delegates()`は未確認です。

静的にはデプロイスクリプトが新アドレスへの`delegate()`を実行し、コミットメッセージも旧プール回収・2票移行を記録していますが、これはオンチェーン証拠ではありません。[12-deploy-snapvoter.js:20](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:20)

推奨する修正: `eth_getBalance`、`getCurrentVotes(old/new)`、実際のNouns保有アドレスに対する`delegates()`を確認してください。

### 12. [重大度 Info] Worker設定ファイルは新アドレス、mainnetは無効状態

該当箇所: [wrangler.toml:19](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:19)、[wrangler.toml:34](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:34)、[index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19)

何が起きるか:

- Sepolia `VOTER`は新アドレスです。
- `wrangler.toml`に旧アドレスの残骸はありません。旧アドレスは履歴資料だけです。
- mainnetは別env・別Worker名で、VOTERとKVがplaceholderのため、通常のSepolia deployで有効化されません。
- リポジトリ設定は正しいですが、実際にデプロイ済みWorkerのenvは未確認です。

推奨する修正: 公開 `/api/config` が返す `network/chainId/metagov/snapshotSpace`をリリース後の必須確認項目にしてください。

## C. 本番想定の残リスク

### 13. [重大度 Medium] mainnetの300ブロック下限は厳密なfail-closed保証ではない

該当箇所: [chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[worker.js:389](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:389)、[worker.js:404](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:404)

何が起きるか:

- 初回および30分ごとの確認時には、mainnetでdelayが設定下限未満なら処理を停止します。
- ただし確認直後にownerがdelayを下げると、最大30分間、新規登録・投函が進み得ます。
- `MIN_REGISTRATION_DELAY`は既定300ですが環境変数で0等へ変更可能で、コード上の絶対下限300ではありません。
- 登録済み提案の`eligibleAtBlock`は短縮されないため既存提案は安全ですが、短縮後に新規登録された提案が影響を受けます。

推奨する修正:

mainnetでは毎tick確認し、下限をコード上で最低300に固定してください。さらに提案ごとの`eligibleAtBlock - registeredAtBlock >= 300`を投函前に検証すると、グローバル設定変更後の新規登録も確実に停止できます。

### 14. [重大度 Medium] 3者分離時の運用・スクリプト上の落とし穴

該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[create-and-register.mjs:69](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:69)、[12-deploy-snapvoter.js:5](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:5)

主な注意点:

- `owner`も常に`registerProposal()`を呼べるため、registrarを分けても暗号学的な完全分離ではありません。ownerは緊急上書き権限を保持します。
- 現行作成スクリプトはSnapshot botに`SEPOLIA_MNEMONIC`を使用し、registrarも`REGISTRAR_MNEMONIC`未設定時は同じmnemonicへfallbackします。mainnetで設定漏れすると再び同一鍵になります。
- デプロイスクリプトはdeployerをownerにします。マルチシグ移管の実行・受領確認を忘れるとEOA ownerが残ります。
- Workerの`RELAYER_PRIVATE_KEY`、registrar鍵、Snapshot提案作成鍵を別々に生成・保管・資金供給する必要があります。
- Nouns投票権の委任操作はNouns保有者側の権限であり、owner/registrar変更だけでは移行しません。
- 新コントラクトへ切り替えるとKV namespaceも変わるため、pending tx、告知、dead-letter等の移行方針が必要です。

推奨する修正:

- mainnetで各鍵を必須変数化し、fallbackを禁止する。
- `OWNER == REGISTRAR == RELAYER`ならデプロイ／起動失敗させる。
- deploy後のowner・registrar・Workerアドレス・delegates・liveMode・delay・spaceHashを機械的に照合するrunbookを用意する。
- `liveMode=false`でシャドー確認後、委任切替、最後に`liveMode=true`とする順序を固定する。

## 総合判定

Sepoliaテストの継続は可能ですが、mainnet移行判定は保留を推奨します。最低限、次の2点が必要です。

1. 対象mapping未発見時もexecute／`no votes`を止める提案単位fail-closed。
2. ネットワーク利用可能環境で、新旧残高・委任・全getter・実runtime hash・公開Worker `/api/config`を実測すること。

テスト結果: Workerテスト3ファイルpass。`git diff --exit-code`はcleanで、ファイル変更はありません。
tokens used
174,743
# 第11回監査結果

結論として、Sepolia再デプロイの設定ファイル反映は確認できましたが、第10回Highのfail-closed修正には未解消経路があります。Snapshot Hubが正常応答を返しても、対象mappingだけ取得できなかった場合は締切後の部分集計execute／`no votes`確定へ到達します。本番移行前の修正を推奨します。

`.env` の `SEPOLIA_RPC_URL` へ読み取り専用JSON-RPCを試みましたが、サンドボックスのネットワーク制限により `fetch failed` となりました。このためオンチェーン値、残高、委任、実バイトコードは未確認です。リポジトリは変更していません。

## A. 第10回指摘の再検証

### 1. [重大度 High] fail-closedは「Hub成功・対象mapping未発見」を止めない

該当箇所: [snap.js:62](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:62)、[snap.js:75](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:75)、[snap.js:82](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:82)、[worker.js:413](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:413)、[worker.js:429](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:429)、[worker.js:464](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:464)

何が起きるか:

- GraphQL例外時は `mappingsResolved=false` のまま早期returnするため、前回の直接的なfail-openは修正されています。
- `SNAPSHOT_SPACE` 未設定時は早期return判定に入らず、非Snapshotモードを誤停止しません。
- しかしHubが正常に「提案0件」を返した場合、またはオンチェーンにmappingがあるのに200件以内で該当Snapshot提案が見つからない場合、`resolveMappings()` は空配列を正常返却します。
- Workerはそれでも `mappingsResolved=true` とし、当該Nouns提案の `snapInfo=null` のまま進みます。
- 締切前は告知・投函されませんが、締切後は `maybeExecute()` に入り、障害前の部分集計をexecute、または`no votes`を確定できます。

つまり「Hub失敗」と「成功したが対象mappingを解決できない」は区別されていますが、後者を安全と扱っている点が欠陥です。

残高チェックは早期returnより前であり、継続してよい処理です。`reconcileRecent()`も前ですが、新規投函・新規executeは行わず送信済みtxの確定を記録する処理なので、基本的には継続が妥当です。

推奨する修正:

- tick全体のbooleanではなく、提案ごとに `unregistered / resolved / registered-but-unresolved` を返す。
- `nounsToSnap(id) != 0` なのに `snapInfo` を得られない提案は、告知・投函・execute・`no votes`確定をすべて停止する。
- Snapshotモードで未登録提案をexecute対象にするかも明示的に決める。
- Hub正常0件、逆引き未発見、GraphQL例外、締切前後を含むWorkerレベルテストを追加する。

### 2. [重大度 Info] 自己申告URLの限界・取消条件の資料修正は妥当

該当箇所: [snap.js:93](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:93)、[member-proposal-unified.html:176](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:176)、[AUDIT-RESPONSE:142](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:142)、[AUDIT-RESPONSE:144](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:144)

何が起きるか:

資料は、URL照合が通常の取り違えを検出する補助チェックであり、悪意あるregistrarや提案作成鍵の侵害を防げないことを明記しています。

また、取消不可条件を「Snapshot署名が受理された場合」に限定し、直接投票後も取消可能でtally等が残る設計を説明しています。主張とコードは一致しています。

推奨する修正: なし。author・type・choices等を照合していない信頼モデルは引き続き残ります。

### 3. [重大度 Medium] URL解析に句読点・全角後置文字の検出回帰がある

該当箇所: [snap.js:48](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:48)、[snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53)、[link-check.test.mjs:5](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs:5)

何が起きるか:

実測結果は次のとおりです。

- Markdown `[議案](https://nouns.wtf/vote/989)`：検出可能
- 括弧で閉じたURL：検出可能
- URL末尾の `.`, `,`, `。`：検出不能
- `https://nouns.wtf/vote/989後`：検出不能
- URL自体が改行で分断：検出不能
- URLの後に通常の改行：検出可能

以前の正規表現は数字と句読点・全角文字の境界で `\b` が成立するため、末尾句読点や日本語後置文字を検出できるケースがありました。したがって実際の回帰です。現在のテストは偽ドメイン、大小文字、prefix、query等は良好ですが、Markdown、ASCII/全角句読点、日本語に挟まれたURL、改行分断を網羅していません。

推奨する修正:

URL候補末尾からUnicode句読点を安全に除去してから解析するか、Markdownパーサー等でリンク先を抽出してください。分断URLを許容しないなら、その仕様を明示してfalseのテストを追加してください。

### 4. [重大度 Low] 告知順序は改善したが、旧告知形式と送信失敗に問題が残る

該当箇所: [worker.js:28](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:28)、[worker.js:31](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:31)、[worker.js:38](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:38)、[worker.js:450](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:450)

何が起きるか:

- `linkBad` 判定後へ告知を移した点は正しいです。
- mainnetでは`linkBad`・`timelineBad`とも告知、投函、executeを停止します。
- testnetでは`linkBad`の場合は告知しませんが処理は継続し、`timelineBad`の場合は警告しつつ告知・処理を継続します。安全側の挙動として矛盾はありません。
- 旧ISO形式は誤って再告知されません。しかしsnapIdを持たないため、mappingを張り替えても再告知できず、「張替え後に再告知」の主張は旧レコードには成立しません。
- `"late"`も引き続き再告知されず、締切後の記録として妥当です。
- 告知済みレコードをDiscord送信より先に保存しており、送信失敗でも永久に告知済みになります。

今回のSepolia再デプロイではKV namespaceにVoterアドレスが含まれるため、旧コントラクトのISOレコードとは分離され、この移行自体では旧形式問題は通常発生しません。

推奨する修正:

旧ISO形式を「snapId不明」として一度だけ移行する方針を決め、Discord 2xx確認後に告知済みレコードを保存してください。

### 5. [重大度 Info] `eligibleAtBlock`の登録時確定は正しく実装

該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[PNounsSnapVoter.sol:189](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:189)、[PNounsSnapVoter.sol:194](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:194)、[PNounsSnapVoter.sol:202](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:202)、[PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)

何が起きるか:

- 登録時に現在のdelayから確定します。
- 取消時に削除されるため、同じNouns IDへの再登録でも新しいdelayで再設定されます。
- Snapshot投票入口は登録済みhashからNouns IDを得るため、正常登録で`eligibleAtBlock=0`になる経路はありません。
- 新コントラクトはupgrade/migration型ではないため、旧コントラクトのmappingだけ移行して期限が0になる経路もありません。
- 未登録IDへの直接`castVote`はdelayを適用しませんが、これはSnapshot mappingの取消猶予とは独立した意図的な退路です。

推奨する修正: 再登録を同じNouns IDで行い、新しい`eligibleAtBlock`を直接比較するテストを追加すると境界がより明確です。

### 6. [重大度 Low] `notify()`戻り値の利用は一部だけ

該当箇所: [worker.js:8](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:8)、[worker.js:105](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:105)、[worker.js:140](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:140)、[worker.js:354](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:354)、[worker.js:433](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:433)

何が起きるか:

`linkwarn`と`endwarn`は2xx後にフラグを立てるよう修正され、前回指摘は直接修正されています。一方、以下は通知前に抑止状態を保存します。

- 投函成功通知の`notified:tx`
- Snapshot投函成功通知の`notified:tx`
- 残高警告フラグ
- 告知済みレコード
- `notifyError()`の1時間メモリ抑止

送信失敗時に通知だけ再試行されない問題が残ります。オンチェーン/KVの業務状態を戻す必要はありませんが、通知用フラグは成功後に立てるべきです。

推奨する修正: 業務状態と通知済み状態を分離し、2xx後にのみ通知済みフラグを保存してください。

### 7. [重大度 Low] 回帰テストは純関数のみで、重要なWorker経路が未検証

該当箇所: [link-check.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/link-check.test.mjs)、[worker.js:391](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:391)

何が起きるか:

追加された22ケースはURL純関数には有用です。しかし前回推奨した以下のテストがありません。

- GraphQL error時の告知・execute抑止
- 成功0件／対象mapping未発見
- 告知と警告の順序
- Discord失敗時のKV write
- mainnet/testnet差分
- 30分後のdelay再確認

実行結果は `relayer-cf npm test` が3ファイルすべてpassでした。

推奨する修正: `tick()`のRPC、Hub、KV、時刻、通知を注入可能にしてWorkerレベルの状態遷移テストを追加してください。

### 8. [重大度 Info] `InvalidSpace`の1～64 bytes境界は妥当

該当箇所: [PNounsSnapVoter.sol:152](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:152)、[PNounsSnapVoter.sol:157](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:157)

何が起きるか:

0 bytesと65 bytes以上を拒否し、1および64 bytesを許可します。文字数ではなくUTF-8 byte数ですが、実際の`earl-grey.eth`／`pnounsdao.eth`には十分です。ガス膨張対策として64 bytesは妥当な運用上限です。

推奨する修正: 0、1、64、65 bytesおよびマルチバイト文字の境界テストを追加してください。

## B. デプロイ確認

### 9. [重大度 Info] 新コントラクト状態 — オンチェーン未確認

該当箇所: `0x64CdACeA6857c6560F3124c532AA4ed34152693F`

RPC接続不能のため、次の実値は未確認です。

- `space`
- `spaceHash`
- `registrationDelayBlocks`
- `marginBlocks`
- `liveMode`
- `refundEnabled`
- `owner`
- `registrar`
- ETH残高
- Sepolia pNouns treasuryの`excluded`

静的には、デプロイスクリプト・設定・コミット記録が期待値と整合しています。[12-deploy-snapvoter.js:8](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:8)、[wrangler.toml:17](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:17)

期待される`spaceHash`は:

`0x069910a7c7d7187fc5a633c3480419056fbd23069b8f9bbcceedca36fd552730`

推奨する修正: ネットワーク利用可能環境で列挙されたgetterを`eth_call`し、結果を監査ログへ保存してください。

### 10. [重大度 Info] バイトコード一致 — ローカル再現済み、オンチェーン比較は未確認

該当箇所: [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol)、`artifacts/build-info/9f3d…json`

確認できたこと:

- build-info内のソースと現在のSolidityファイルは完全一致
- artifactとbuild-infoのcreation/runtime bytecodeは完全一致
- solc `0.8.24+commit.e11b9ed9`
- optimizer 200、EVM Cancun
- Sepoliaのimmutable値を埋めた期待runtimeは14,780 bytes
- 期待runtime hashは  
  `0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327`

実際の`eth_getCode`を取得できなかったため、このhashとの最終比較は未確認です。Sourcify APIは公式にコントラクト検索を提供しますが、この環境では対象レスポンスを取得できませんでした。[Sourcify API仕様](https://docs.sourcify.dev/docs/api/index.html)

推奨する修正: `keccak256(eth_getCode(address))`を上記hashと比較してください。

### 11. [重大度 Info] 旧残高・Nouns委任 — 未確認

該当箇所: 旧 `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`、新 `0x64Cd…693F`

RPC接続不能のため、旧残高、新旧`getCurrentVotes()`、Nouns保有者の`delegates()`は未確認です。

静的にはデプロイスクリプトが新アドレスへの`delegate()`を実行し、コミットメッセージも旧プール回収・2票移行を記録していますが、これはオンチェーン証拠ではありません。[12-deploy-snapvoter.js:20](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:20)

推奨する修正: `eth_getBalance`、`getCurrentVotes(old/new)`、実際のNouns保有アドレスに対する`delegates()`を確認してください。

### 12. [重大度 Info] Worker設定ファイルは新アドレス、mainnetは無効状態

該当箇所: [wrangler.toml:19](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:19)、[wrangler.toml:34](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:34)、[index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19)

何が起きるか:

- Sepolia `VOTER`は新アドレスです。
- `wrangler.toml`に旧アドレスの残骸はありません。旧アドレスは履歴資料だけです。
- mainnetは別env・別Worker名で、VOTERとKVがplaceholderのため、通常のSepolia deployで有効化されません。
- リポジトリ設定は正しいですが、実際にデプロイ済みWorkerのenvは未確認です。

推奨する修正: 公開 `/api/config` が返す `network/chainId/metagov/snapshotSpace`をリリース後の必須確認項目にしてください。

## C. 本番想定の残リスク

### 13. [重大度 Medium] mainnetの300ブロック下限は厳密なfail-closed保証ではない

該当箇所: [chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[worker.js:389](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:389)、[worker.js:404](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:404)

何が起きるか:

- 初回および30分ごとの確認時には、mainnetでdelayが設定下限未満なら処理を停止します。
- ただし確認直後にownerがdelayを下げると、最大30分間、新規登録・投函が進み得ます。
- `MIN_REGISTRATION_DELAY`は既定300ですが環境変数で0等へ変更可能で、コード上の絶対下限300ではありません。
- 登録済み提案の`eligibleAtBlock`は短縮されないため既存提案は安全ですが、短縮後に新規登録された提案が影響を受けます。

推奨する修正:

mainnetでは毎tick確認し、下限をコード上で最低300に固定してください。さらに提案ごとの`eligibleAtBlock - registeredAtBlock >= 300`を投函前に検証すると、グローバル設定変更後の新規登録も確実に停止できます。

### 14. [重大度 Medium] 3者分離時の運用・スクリプト上の落とし穴

該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[create-and-register.mjs:69](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:69)、[12-deploy-snapvoter.js:5](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:5)

主な注意点:

- `owner`も常に`registerProposal()`を呼べるため、registrarを分けても暗号学的な完全分離ではありません。ownerは緊急上書き権限を保持します。
- 現行作成スクリプトはSnapshot botに`SEPOLIA_MNEMONIC`を使用し、registrarも`REGISTRAR_MNEMONIC`未設定時は同じmnemonicへfallbackします。mainnetで設定漏れすると再び同一鍵になります。
- デプロイスクリプトはdeployerをownerにします。マルチシグ移管の実行・受領確認を忘れるとEOA ownerが残ります。
- Workerの`RELAYER_PRIVATE_KEY`、registrar鍵、Snapshot提案作成鍵を別々に生成・保管・資金供給する必要があります。
- Nouns投票権の委任操作はNouns保有者側の権限であり、owner/registrar変更だけでは移行しません。
- 新コントラクトへ切り替えるとKV namespaceも変わるため、pending tx、告知、dead-letter等の移行方針が必要です。

推奨する修正:

- mainnetで各鍵を必須変数化し、fallbackを禁止する。
- `OWNER == REGISTRAR == RELAYER`ならデプロイ／起動失敗させる。
- deploy後のowner・registrar・Workerアドレス・delegates・liveMode・delay・spaceHashを機械的に照合するrunbookを用意する。
- `liveMode=false`でシャドー確認後、委任切替、最後に`liveMode=true`とする順序を固定する。

## 総合判定

Sepoliaテストの継続は可能ですが、mainnet移行判定は保留を推奨します。最低限、次の2点が必要です。

1. 対象mapping未発見時もexecute／`no votes`を止める提案単位fail-closed。
2. ネットワーク利用可能環境で、新旧残高・委任・全getter・実runtime hash・公開Worker `/api/config`を実測すること。

テスト結果: Workerテスト3ファイルpass。`git diff --exit-code`はcleanで、ファイル変更はありません。
