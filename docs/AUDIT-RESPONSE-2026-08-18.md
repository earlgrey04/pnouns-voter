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
