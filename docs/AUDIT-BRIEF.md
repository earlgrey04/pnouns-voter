# pNouns Voter — 監査依頼（Sepolia 時点、2026-08-18）

## 依頼
`/mnt/data/pnouns-voter` にあるコード一式を、mainnet デプロイ前の第三者視点で監査してください。
特に (1) コントラクトの安全性・資金リスク、(2) 署名検証まわり、(3) リレイヤー（Cloudflare Worker）の堅牢性、(4) dApp の署名 UX の安全性、の順で優先度が高いです。
発見事項は「重大度 / 該当箇所（ファイル:行）/ 問題 / 再現条件 / 推奨修正」の形で列挙してください。**コードの修正は行わず、指摘のみ**でお願いします。

## 目的（何を作ったか）
pNouns（ERC721A NFT、mainnet 0x4bE962499cE295b1ed180F923bf9c73b6357DE80、tokenId 1..2100）の保有者が
EIP-712 署名だけ（ガス 0）で Nouns DAO の提案に賛成/反対/棄権を投票し、
コントラクト `PNounsVoter` がオンチェーンで集計して、締切後に Nouns DAO へ `castRefundableVoteWithReason` する仕組み。
Nouns NFT を持つ pNouns のマルチシグが `PNounsVoter` に投票権を `delegate()` する前提。

## 構成とファイル
- `contracts/PNounsVoter.sol` … 本体（Solidity 0.8.24、OpenZeppelin 5.x: EIP712 / ECDSA / Ownable）
- `contracts/vendor/pnouns/` … pNouns NFT の本物ソース（Sourcify 検証済みを無改変で取り込み。テスト用。監査対象外）
- `test/fork.e2e.test.js` … mainnet フォーク E2E（`.env` の `MAINNET_RPC_URL` が必要、9 テスト）
- `relayer-cf/` … Cloudflare Worker（Hono + viem + KV、cron 毎分）。`src/index.js`（API）、`src/worker.js`（投函/execute/告知/残高警告）、`src/chain.js`、`src/store.js`、`public/index.html`（署名 dApp、ライブラリなし）
- `relayer/` … 旧ローカル版（systemd、現在無効。参考のみ）
- `scripts/sepolia/` … Sepolia 用の運用/テストスクリプト
- `README.md` … 決定事項・実測値・手順。`docs/report-2026-08-18.html` … メンバー向け説明

## デプロイ済み（Sepolia、検証済み）
- PNounsVoter: 0x1fdE7cA18cAD4c7a315B63D2Ce9ce72EFFcDD769（Sourcify exact_match、Blockscout: https://eth-sepolia.blockscout.com/address/0x1fdE7cA18cAD4c7a315B63D2Ce9ce72EFFcDD769）
- pNouns clone: 0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6 / Nouns DAO(公式 Sepolia, V4 ロジック): 0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57 / Nouns Token: 0x4C4674bb72a096855496a7204962297bd7e12b85
- 投票ページ/API: https://pnouns-voter.x402-adsb-worker.workers.dev （GET /api/config, /api/proposals, /api/tokens/:addr, /api/signatures/:id?calldata=1, /api/proposal/:id, POST /api/vote）

## 仕様（コントラクト）
- 署名: EIP-712 domain {name:"pNouns Voter", version:"1", chainId, verifyingContract}、`Vote(uint256 proposalId,uint8 support,uint256[] tokenIds)`
- `castVotesBySig(VoteSig[])` 誰でも投函可。`castVote(...)` は本人が直接。内部 `_castVote`:
  - support ∈ {0 反対,1 賛成,2 棄権}、tokenIds 非空、voter が `excluded` でない、voter は提案ごとに 1 回（`hasVoted`）
  - 初回投票時に Nouns の `state()` が Pending/Active であることを確認し、締切 `voteDeadline = endBlock - marginBlocks` をキャッシュ（`proposals()` の返り値を staticcall で読み、7 番目の word を endBlock として使用）
  - tokenId ごとに `ownerOf == voter` を確認、提案ごとのビットマップで二重投票防止（前所有者が投票済みの token は数えない、全部が数えられなければ NothingCounted）
  - 集計は 1 スロットにパック（uint32×6 + uint48 deadline + flags）
- `execute(proposalId)` 締切後に誰でも。票ゼロは `NoVotes` で拒否。tokens 最多 → 同数なら voters 最多 → それも同数なら棄権。`liveMode` のときのみ Nouns DAO へ `castRefundableVoteWithReason`（reason に集計文）
- ガス払い戻し（案 B）: `castVotesBySig` / `castVote` 実行後に `_refundGas`。Nouns の `_refundGas` 準拠（priority ≤ 2 gwei、basefee ≤ 200 gwei、gas ≤ 120k + 70k×票数、REFUND_BASE_GAS 55k）、提案ごと `refundCapPerProposal`（0.02 ETH 既定）、`refundEnabled`、残高 0 ならスキップ、`tx.origin` へ `call`、失敗しても revert しない
- owner（後で pNouns マルチシグへ移譲予定）: `setExcluded`, `setMarginBlocks`, `setLiveMode`, `setRefundEnabled`, `setRefundCapPerProposal`, `sweep`
- 非アップグレード（プロキシなし）。`pnouns` と `nounsDAO` は immutable

## 運用の前提・信頼モデル（設計意図）
- 票の偽造は不可能であるべき（署名者本人の pNouns 保有が唯一の根拠）
- リレイヤー（Worker の鍵）は「投函しない」以外の攻撃ができないこと。署名は `/api/signatures/:id` で公開され、誰でも投函でき、締切後は誰でも execute できる
- Nouns への委任は 1 tx で戻せる。NFT や資産は預けない（預けるのは返金プールの ETH のみ）
- 想定外: 定足数なし、票ゼロは投票しない、締切は mainnet で Nouns endBlock − 7200 ブロック（24h）

## 特に見てほしい点
1. `_castVote` / ビットマップ / hasVoted の整合性（再投票・移転・部分カウントの境界）、`abi.encodePacked(tokenIds)` の EIP-712 配列ハッシュとの一致
2. `nounsEndBlock` の生読み（`proposals()` の返り値レイアウト依存）と、Nouns 側の状態遷移（Updatable→Pending→Active→ObjectionPeriod 等）に対する `execute` の安全性
3. `_refundGas` の悪用（細切れ投函・re-entrancy・tx.origin・上限の抜け道）、`sweep` と受け取り（`receive`）
4. `_decide` のタイブレークとオーバーフロー（uint32 の範囲、pNouns は 2100 枚）
5. Worker: 署名検証（`recoverTypedDataAddress`）→ 所有確認 → KV 保存の流れで、DoS（大量投稿・巨大 tokenIds）、KV の結果整合性による重複投函、リレイヤー tx が revert したときの記録戻し、cron の多重起動ロック、`ONLY_PROPOSER` などテスト用設定の本番混入
6. dApp: `eth_signTypedData_v4` のメッセージ構造、EIP-6963 のプロバイダー選択、手動 execute / 手動投函ボタンの calldata 組み立て（selector 直書き）、XSS（タイトルは escapeHtml 済みか）
7. mainnet 移行時の差分: margin 7200、`ONLY_PROPOSER` 無し、返金プールの規模、`liveMode=false` のシャドー運用の安全性

## テストの実行方法
```
cd /mnt/data/pnouns-voter && npm install && npx hardhat test          # mainnet フォーク（.env に MAINNET_RPC_URL）
cd relayer-cf && npm install && npx wrangler dev --port 8791 --test-scheduled   # ローカル Worker（.dev.vars 必要）
```
既知の割り切り: 署名は投函までの短時間 Cloudflare KV に保管（Snapshot のサーバー相当）、KV list は結果整合性で数秒〜1 分遅れる、
Sepolia は投票期間 25 ブロックのため margin=5 で運用（mainnet は 7200 予定）。
