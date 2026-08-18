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
