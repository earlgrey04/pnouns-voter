# 監査対応記録(Codex 監査 2026-08-18 → 対応済み)

| ID | 重大度 | 対応 | 変更箇所 |
|---|---|---|---|
| H-01 | High | `/api/tick` は `TICK_TOKEN` 未設定なら 404(公開トリガ廃止)。cron は Cloudflare が 1 回/分だけ起動。KV ロックは best-effort として残し、投函前の on-chain `hasVoted` 確認と revert 時の記録戻しで二重投函の実害を抑える(残るリスク: 同時投函時の revert によるガス損 ~4 万 gas) | relayer-cf/src/index.js |
| H-02 | High | tx を `txStatus:"sent"` として記録 → receipt で `success/reverted` に確定。receipt 待ちの例外は握りつぶさず「未確定」のまま残し、次回 tick の `reconcileSent` が receipt 再取得 → 10 分未採掘なら on-chain `hasVoted` で external/再投函を判定。execute も同様(`pending` を再照会、10 分で再試行) | relayer-cf/src/worker.js |
| H-03 | High | タイトルは作成イベント＋ `ProposalUpdated` / `ProposalDescriptionUpdated` を読んで最新 description を使用。Updatable(state 10)中はキャッシュ TTL 60 秒。更新があれば「(更新あり)」を付記。dApp/Discord には nouns.wtf への導線あり。なお投票受付自体は Pending 以降(本文凍結後)のみ | relayer-cf/src/chain.js |
| M-01 | Medium | `POST /api/vote`: content-length ≤ 64KB、proposalId 数値、署名 65 byte hex、tokenIds ≤ 300 件・1..2100・重複なし、署名者ごと 10 秒レート制限(KV) | relayer-cf/src/index.js |
| M-02 | Medium | simulate 失敗のうちコントラクト revert(`ContractFunctionRevertedError` 系)だけ drop。RPC/一時障害は再試行 | relayer-cf/src/worker.js |
| M-03 | Medium | 1 tx の署名数上限 `MAX_BATCH`(既定 25、超過分は次回)。手動投函の gasHint は実 `estimateContractGas` ×1.4(失敗時は票数・token 数からの保守値)。Worker の gasLimit ×1.3 | relayer-cf/src/index.js, worker.js |
| M-04 | Medium | `castVotesBySig` は 1 バッチ 1 提案に制限(`MixedProposals`)。返金の提案別会計が成立 | contracts/PNounsVoter.sol |
| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
| M-07 | Medium | `proposals()` の返り値は長さ完全一致(15 word)を要求し、id 一致・endBlock > startBlock の sanity check を追加。レイアウト変更時は revert(=投票受付停止)して誤読しない | contracts/PNounsVoter.sol |
| M-08 | Medium | EIP-6963 の icon は `data:image/*;base64` のみ許可＋属性エスケープ。プロバイダー識別は rdns+uuid | relayer-cf/public/index.html |

再検証: フォークテスト 10 本通過(MixedProposals・シャドー後の本投票を追加)。Sepolia 再デプロイ `0xcCB00a9ede365458f301455089C8e36Ce6B32D1F`(Sourcify exact_match)、Worker 更新。
Prop 511 でクラウド通し(3 票 → 投函 → execute → Nouns DAO 賛成 2 票)、`/api/tick` 404、重複 tokenId 拒否を確認。

## 再監査(第 2 回)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| H-04 | High | KV 書込みを「イベント時のみ」に再設計: ロック廃止(cron は Cloudflare が 1 回/分のみ起動、`/api/tick` は無効)、所有者/タイトル(Updatable 中)キャッシュは isolate メモリ、残高警告フラグは TTL 失効任せ(回復時の delete なし)、一覧は KV metadata で読む。書込みは 署名受付・投函記録・確定・execute・告知・通知重複防止 のみ(1 日あたり数十件)。mainnet env は cron 2 分 |
| M-10 | Medium | 1 tick の外部呼び出しを削減: hasVoted を multicall 1 回、バッチ全体を 1 回 simulate(失敗時のみ個別 ≤10)、receipt を待たず次 tick で確定(`inflight` キー 1 つで追跡)、残高確認は 10 tick に 1 回、`MAX_BATCH` 既定 10 |
| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
| H-03R | Medium | タイトルは Pending/Active(本文凍結後)に初めて取得したときだけ `title:{id}:final` に保存。Updatable 中はメモリ 30 秒のみ、KV には書かない |
| M-01R | Medium | 本文をストリームで最大 64KB まで読み、超過は 413(Content-Length 非依存) |
| M-09 | Medium | `NETWORK` は mainnet/sepolia 以外で起動失敗。mainnet では ONLY_PROPOSER 禁止・RPC_URL/アドレス必須・pNouns/Nouns アドレス固定値と照合。`wrangler.toml` に `[env.mainnet]`(別 Worker 名・別 KV・vars 非継承・cron 2 分)を用意 |
| Low-1 | Low | proposalId/tokenIds は BigInt 正規値で検証・保存 |
| Low-2 | Low | 永久 drop は `ContractFunctionRevertedError` のみ(ZeroData は再試行) |
| Low-3 | Low | 返金枠 `refundedForProposal` は送金成功時のみ消費 |
| Low-4 | Low | `public/_headers` で CSP(`script-src 'self'`、inline script を app.js に分離)・frame-ancestors none 等、API 応答にも防御ヘッダー |
| Low-5 | Low | README の旧アドレス行を削除 |

追加修正(実地で発見): 送信中 tx を持つ提案は Nouns 側 state に関係なく確定処理する(`inflight`)。Sepolia の短い投票期間で「execute 成功後に Defeated へ遷移し、確定処理が走らない」事象を再現・修正。通知の重複防止(tx 単位フラグ)。

再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x5f719325b376EfB0be0A322A697B1c75382A7f1A`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 513/514 でクラウド通し(📢→🗳️→✅、重複なし)。CSP/X-Frame-Options を実環境で確認。

## 再監査(第 3 回)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| H-05 | High | `_refundGas`: 送金前に `refundedForProposal` を予約し、失敗時のみ戻す(CEI)。`castVote` / `castVotesBySig` / `execute` に OpenZeppelin `ReentrancyGuard`(`nonReentrant`)。EIP-7702 の再入場を遮断 |
| H-04R | High | KV `list` は **ワーカー専用**かつ「新規署名で dirty フラグが立った提案」または inflight の提案だけ実行(1 日数十回規模)。提案ごとの集計サマリー `sum:{pid}` をワーカーが書き、公開 API(`/api/proposals`, `/api/signatures/:id`, `/api/proposal/:id`)は get のみ。`/api/proposals` は Cache API で 30 秒キャッシュ(クエリは 0/8 に正規化)、dApp ポーリングは 60 秒。書込みは 1 票あたり「受付 1 + dirty 1 + 送信 1 + 確定 1 + サマリー数回」で、想定規模(数十票/日)では余裕。**mainnet で Workers Paid($5/月)にすれば上限の心配は消える**旨を README に明記(推奨) |
| M-11 | Medium | inflight は tick 内でメモリ集約し、変化があったときだけ tick 末尾に 1 回書く(同一キー 1 write/秒制限・後勝ちを回避)。30 tick ごとに直近提案のサマリーから `sent`/`pending` を拾い直す回復処理 |
| Low-6 | Low | `MAX_BATCH` 既定 10、1..10 以外は起動時エラー |

再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x3C7fb408EE6A5c2732770110B6dd48527F360e26`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 515 でクラウド通し(📢→🗳️→✅、Nouns 賛成 2 票)。`/api/proposals` 2 回目 54ms(キャッシュ命中)。

## 再監査(第 4 回)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| M-12 | Medium | dirty フラグを「削除」しない方式に変更: API は `dirty:{pid}` に受付時刻を書き、ワーカーは `dirty > sum.listedAt` なら再 list(listedAt は list **開始**時刻なので、list 中に届いた署名は次回必ず拾う)。加えて 20 分ごとの強制 list |
| M-13 | Medium | 票キーの metadata に要約(support/枚数/tx/状態/受付時刻)を持たせ、`list` の metadata だけで一覧を作る(get なし)。署名本文は投函対象 ≤ MAX_BATCH(10)件だけ get。README の「Paid なら上限の心配が消える」を訂正(1 呼び出し 1,000 操作の上限は Paid でも同じ) |
| M-11R | Medium | `inflight` キーを廃止。毎 tick、直近 15 提案のサマリー(get)と executed(get)から `txStatus:"sent"` / `pending` を検出して確定処理(read-modify-write なし、isolate 再生成の影響なし)。tickCount 依存をやめ時刻ベースに |
| L-07 | Low | 全 KV キーを `<chainId>:<voterAddress>:` で名前空間化(再デプロイで旧記録が混ざらない。実環境で旧 Voter の executed 記録が消えたことを確認) |
| 追加 | — | KV/RPC 障害時に Discord ⚠️ 警告(1 時間に 1 回、メモリ内スロットル。ワーカー tick と API の onError) — 無料枠で運用開始する判断に伴う監視 |

再検証: Worker 再デプロイ、Prop 516 でクラウド通し(📢→🗳️→✅、Nouns 賛成 2 票)。

## 再監査(第 5 回)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| M-14 | Medium | **署名受付締切**を導入: `acceptDeadline = オンチェーン締切 − ceil((MIN_PENDING_AGE + cron 間隔 + 余裕 120s)/12)` ブロック(mainnet: 30 ブロック前)。API はこれ以降の署名を `accept_closed` で拒否(自分で投函する導線を案内)。ワーカーは受付締切以降は最小待機を無視して即時投函(境界の票を取り残さない)。dApp は「署名受付締切」と「オンチェーン締切」を分けて表示。`relayer-cf/test/accept-deadline.test.mjs` に境界テスト 4 本(`npm test`) |
| L-08 | Low | 入力起因の例外(不正アドレス等)は 400 を返し通知しない。Discord 障害通知は KV / RPC / 送信などの内部エラーに限定(名前・メッセージで分類) |

再検証: Prop 517 で通し(受付中 3 票 → ok、受付締切後の署名 → 400 accept_closed、execute → Nouns 反対 2 票)。境界テスト 4/4 通過。

## 再監査(第 6 回)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| M-14R | Medium | (1) **受付容量**: `submitCapacity = floor(((締切−現在)×12 − 余裕)/cron) × RUSH_BATCHES × MAX_BATCH`。API は投函待ち件数がこれ以上なら `capacity_full` で拒否し、手動投函/castVote へ誘導。(2) **rush 時は 1 tick で複数バッチ**(`RUSH_BATCHES` 既定 2、1..3)。サブリクエスト予算に収めるため、投函状態の書込みを「票ごとの KV put」から「サマリー 1 回」に集約(metadata は受付時の不変情報のみ、状態はサマリーが唯一の真実。再 list 時は既存サマリーとマージ)。(3) 境界テスト追加(`npm test` 6 本: 受付締切時点の容量 40、1 tick 分の 20、余裕未満で 0、1 日前 >2,100 等)。mainnet 既定(cron 120s、余裕 120s、2 バッチ×10)で受付締切時点の保証排出量は 40 票、それ以上の集中は API が受付時点で拒否するので「ok を返した票を落とす」ことはない |

再検証: Worker テスト 6/6、Sepolia Prop 518 でクラウド通し(📢→🗳️→✅)。

## 再監査(第 7 回・B3)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| B3-H01 | High | VoterRec に署名 digest を保存。**同一 timestamp + 同一 digest の再提出は「補完」**として未計上 token を同じ support に追加(投票者数は増やさない)。同一 timestamp で digest が異なる場合は StaleVote。フォークテストで「攻撃者が 1 枚だけ先行投函 → 正規リレイヤーが同一署名で残りを補完」を実証 |
| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
| B3-H03 | High | `[env.mainnet.vars]` に `SNAPSHOT_SPACE="pnounsdao.eth"` を明示。cfg は mainnet で SNAPSHOT_SPACE 必須(fail-closed)。worker は起動後最初の tick でコントラクトの `spaceHash` と設定値の keccak を照合し、不一致なら処理を停止して警告 |
| B3-M01 | Medium | snapmap キャッシュは正の対応だけ保存。未登録(0)は毎 tick 再照会 |
| B3-M02 | Medium | `created_gt` cursor(KV) + skip ページング(最大 3 ページ/tick)。cursor は「反映済み/対象外」は即時、「送信分」は**採掘確定後**に前進。取得は昇順で欠落なし |
| B3-M03 | Medium | 締切接近時(shouldRushSubmit)は 1 tick で RUSH_BATCHES(2)バッチを連続送信。resolveMappings が Snapshot の終了時刻を取得し、オンチェーン締切より遅い設定なら ⚠️ を一度だけ通知 |
| B3-M04 | Medium | `from` を厳密に address 化(_parseAddress)し、**コードを持つアドレスは EIP-1271** `isValidSignature` で検証(EOA は ECDSA 一致)。EIP-6492(未デプロイのスマートウォレット)は対象外と明記。フォークテストで Mock1271 ウォレットの投票を実証。**副産物: ユーザーの実ウォレット(0x0bC7…)が EIP-7702 コード付きであることが判明し、この対応が本番の必須要件だったことを確認** |
| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
| B3-M06 | Medium | ハブ/IPFS 取得に timeout 8s・64KB 上限・status/shape 検証。エンベロープと GraphQL 行(voter/proposal/created)の照合。ゲートウェイ 2 系統フォールバック。CID 単位のメモリ backoff(5 回失敗で恒久スキップして cursor 前進)。一時失敗はその票で打ち切り、次 tick に再試行 |
| B3-L01 | Low | /api/config に mode(snapshot/direct)。snapshot モードでは domain/types を返さず、/api/vote と /api/signatures は 410。dApp は提案別の Snapshot リンクと「投票締切(オンチェーン反映)」表示 |
| 依存 | — | @snapshot-labs/snapshot.js を devDependencies へ移動(Worker バンドルには元々含まれない) |

再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。

## 再監査(第 8 回・B3)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
| B3-H04 | High | cursor 設計を全面変更。**オンチェーンの `voterRec` を唯一の真実**とし、cursor は取得の最適化に徹する: 取得は `created_gte`(境界の秒を含む)、cursor は**未解決票の created を超えて進めない**。tx 成功時に cursor を進める処理を廃止し、次 tick で voterRec を見て「解決済み」になった分だけ前進。これにより (a) 同一秒 21 票、(b) 複数 tx の部分 revert、(c) 送信失敗・クラッシュ、いずれでも票を失わない。純関数 `planSubmission` に切り出し、**回帰テスト 5 本**を追加(同一秒 21 票 / 部分 revert / skip 扱い / やり直し・補完検出 / 全解決) |
| B3-M01R | Medium | 対応付けキャッシュを廃止し、**毎 tick オンチェーンで再検証**(取消・再登録に追従。multicall 1 回) |
| B3-M03R | Medium | 締切接近時は複数バッチで排出(既存)＋ Snapshot 終了がオンチェーン締切より遅い設定を検知して ⚠️ 通知。※「drain 不能なら自動処理を開始しない」は、票を全部捨てることになり実害が大きいため採用せず、**警告＋可能な限り排出**とした(判断を文書化) |
| B3-M06R | Medium | 応答は **ReadableStream で 64KB 打ち切り**(Content-Length に依存しない)。取得失敗の票では **cursor を進めない**。20 回失敗した票のみデッドレター(KV に保存＋⚠️ 通知で手動対応可能に)し、黙って捨てない。ゲートウェイは 3 系統 |

再検証: フォークテスト **16 本**、Worker テスト **11 本**(cursor 回帰 5 本を含む)。Sepolia 再デプロイ `0xFa8A9BBE8E22904Ad4d0f2840393b5088a159976`(Sourcify exact_match)。
Snapshot の日次提案上限(5 件/日)に達していたため、**既存の投票済み Snapshot 提案を新しい Nouns 提案に対応付ける方式**(`scripts/sepolia/15-reuse-snap.js`)でライブ E2E を実施 → 4 票を取得・検証・集計(賛成 6/反対 2/棄権 1)し、Nouns DAO に賛成 2 票を記録。

## 再監査(第 9 回・B3)への対応
| ID | 重大度 | 対応 |
|---|---|---|
| 指摘1: 同一秒 300 件超で cursor 停滞 | High | ページ取得を **6 ページ(600 件)** に拡張し、**読み切れなかった場合は `complete=false` を返して cursor を一切進めない**(planSubmission が `blocked` で開始)。同時に ⚠️ 通知。回帰テスト追加(300 件処理済み + complete=false → advance 0、complete=true → advance T) |
| 指摘2: NFT 移転後の補完票を見落とす | Medium | 補完要否の判定を「保有枚数 > 計上数」から **「未計上の tokenId が 1 枚でもあるか」** に変更。Worker は保有 tokenId ごとに `hasTokenVoted` を multicall で確認して `uncountedTokens` を作り、planSubmission に渡す。既定値は保守的に 0。回帰テスト追加(5 枚計上 → 手放して未計上 1 枚取得 → 補完対象と判定) |
| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
| 指摘4: 恒久 revert 票が後続を塞ぐ | Medium | 個別 simulate の**決定的 revert のみ**回数を KV に記録し、5 回でデッドレター化(⚠️ 通知つき)。一時エラー(RPC 障害)は従来どおり再試行のみで回数を数えない |
| 指摘5: 直近 15 件から外れた対応付け | Medium | ハブの直近 20 件に加え、**処理対象の Nouns 提案から `nounsToSnap` で逆引き**し、必要なら最大 200 件遡って Snapshot 提案を特定。投票期間中の対応付けを見失わない |

再検証: フォークテスト **17 本**、Worker テスト **13 本**(300 件境界・token 入れ替えを追加)。Sepolia 再デプロイ `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`(Sourcify exact_match)。再利用方式のライブ E2E で 3 票 → 集計(賛成 3/棄権 3 → 投票者 2:1 で賛成)→ Nouns DAO に賛成 2 票を記録。
なお B3-M03R(Snapshot 終了がオンチェーン締切より遅い設定)は運用条件として扱い、mainnet のリリース条件に「Snapshot 投票期間 + 排出余裕 < Nouns 締切」を明記する。

## 第 9 回再監査の残存リスクへの対応
| ID | 重大度 | 対応 |
|---|---|---|
| 600 件以上で cursor が永久停滞 | High | timestamp cursor と固定ページ上限を廃止。100 件×3ページの **window offset を KV に保存**し、window 内の未解決票がなくなった時だけ次へ進む。末尾で offset=0 に戻して全体を再走査するため、同一秒 601 件以上でも全行へ到達し、途中挿入も次周回で回収する。GraphQL モックで 601 件を 3 tick で全取得する回帰テストを追加 |
| 組合せ revert がデッドレターされない | High | 送信候補を **1 voter 1 票**へ正規化。同 timestamp は CID の辞書順で決定する。バッチ失敗後の個別切り分け結果を再度バッチ simulate し、それでも interaction revert する場合は先頭 1 票だけを送って次 tick の on-chain 状態から再評価する |
| `hasTokenVoted` 照会増幅 | Medium | 補完候補を `created == voterRec.timestamp` に限定し、tokenId を全行で重複排除。最大 2,100 token を 200 件ずつ multicall する。600 行×100 token が一意な100照会になる回帰テストを追加 |
| B3-M03R | Medium | mainnet は Snapshot 終了後に `cron + submit buffer` の排出時間がない場合、または終了時刻不明の場合に **投函・execute とも fail-closed**。Discord 通知と境界テストを追加 |

再検証: Worker テストに 601 件巡回・同一 voter 正規化・tokenId 重複排除・timeline fail-closed 境界を追加。コントラクトは変更なし。

### レビュー結果(第 9 回の修正を Claude 側で独立確認、2026-08-20)
Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッチ 1 投票者への正規化、hasTokenVoted の重複排除、mainnet の排出時間 fail-closed)を精査し、設計は妥当と判断。以下 1 点のみ修正した。
- **KV 書込み予算の退行(要修正・対応済み)**: 送るものが無い tick でも scan offset を無条件に KV へ書いていた(`put(scanK, ...)`)。通常運用(投票数 ≤ 300)では offset は常に 0 のままなので、毎分 1 write = 1,440 件/日となり、第 3 回監査(H-04R)で確保した無料枠(1,000 writes/日)を超える。**値が変化したときだけ書く**よう修正。
- 確認したが問題なしと判断した点: (a) offset 巡回は on-chain voterRec を真実とするため、行の並びが不安定でも次周回で必ず拾える。(b) 送信対象が残っている間は offset を進めないので、window 内の未解決票を飛ばさない。(c) `uniqueVoterCandidates` は Snapshot ハブが (proposal, voter) で 1 行に集約するため通常は作動しないが、防御として妥当。(d) mainnet の fail-closed は execute も止めるため、Snapshot 終了時刻が不明・遅い場合は手動実行が必要になる(通知文に明記済み)。
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
