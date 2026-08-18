# pNouns MetaGov — pNouns 保有者の署名投票をオンチェーン集計して Nouns DAO に投票する

pNouns の Snapshot 投票結果を人手で Nouns DAO に反映している現状を、
「保有者は EIP-712 署名だけ(ガス0) → リレイヤーが mainnet の MetaGov に一括投函 → 締切後に誰でも execute →
MetaGov が Nouns DAO に castRefundableVoteWithReason」で無人化するためのコントラクトと、
mainnet フォーク上の E2E テスト(段階1)。

## 決定事項(2026-08-18 アールグレイ)
- pNouns トレジャリー `0x8ae80e0b44205904be18869240c2ec62d2342785` の保有分は投票権に含めない(`excluded`。owner が変更可)
- 定足数なし
- tokens 同数 → 投票者数が多い方 → それも同数なら棄権。票ゼロも棄権(仮置き、要確認)
- 締切 = Nouns の `endBlock − marginBlocks`(初期値 3600 ブロック ≒ 12h)。締切後に誰でも `execute`
- チェーンは Ethereum mainnet(Nouns の委任先は mainnet アドレス必須。L2→L1 メッセージは Nouns の投票期間に間に合わない)

## 前提となる pNouns NFT の仕様(mainnet `0x4bE962499cE295b1ed180F923bf9c73b6357DE80`、Sourcify 検証済み)
- ERC721A(0.8.14)、tokenId 1..2100、totalSupply 2100、非プロキシ
- Enumerable なし / Votes(チェックポイント)なし → 「投票時の `ownerOf` ＋ tokenId 単位のビットマップで二重投票防止」方式
- Snapshot 空間 `pnounsdao.eth` は `erc20-balance-of`(=balanceOf)、quorum 210、48h

## コントラクト `contracts/PNounsMetaGov.sol`
- `castVotesBySig(VoteSig[])` 誰でも投函可。署名 = `Vote(uint256 proposalId,uint8 support,uint256[] tokenIds)`(EIP-712 domain: `pNouns MetaGov` / `1`)
- `castVote(...)` 本人が自分でガスを払う退路
- `execute(proposalId)` 締切後に誰でも。`liveMode=false` なら Nouns を呼ばずイベントのみ(シャドー運用)
- 投票受付は Nouns 側 state が Pending / Active のときだけ(Updatable 中・取消済みは不可)
- 重み = tokenId 数、voter は提案ごとに1回。前所有者が投票済みの token は数えない
- 集計は 1 スロットにパック(uint32×6 + deadline + flags)

## テスト(段階1: mainnet フォーク)
```
cp .env.example .env   # MAINNET_RPC_URL=(Alchemy 等の archive RPC)
npm install
npx hardhat test
```
`test/fork.e2e.test.js` は本物の pNouns / Nouns DAO / Nouns Token を使い:
1. Nouns 2 枚の自己委任ホルダーになりすまし → MetaGov に delegate
2. 大口 delegate になりすまし → 提案作成(委任後なので creationBlock で MetaGov は 2 票)
3. 実 pNouns 保有者から hardhat 署名者へ token を移し、EIP-712 署名 → リレイヤーが 1 tx で投函
4. 締切までマイニング → 第三者が execute → `getReceipt` で MetaGov 名義 2 票を確認、Nouns の refund が executor に届く
5. 不正系(他人の token / 二重投票 / 除外アドレス / 移転後の再投票 / 署名改ざん)、同数タイブレーク、票ゼロ、シャドー運用、自己投函

### ガス実測(2026-08-18、fork 上)
| 操作 | gas |
|---|---|
| 初票(提案ごとのコールド初期化込み) | ~169k |
| 2 票目以降(1 枚持ち) | ~46k / 票 |
| 1 名 × 5 枚 | ~96k |
| execute(Nouns castRefundableVote 込み) | ~157k(Nouns から executor へ払い戻し) |

目安: 30 名投票 ≒ 1.5M gas。mainnet gas 0.05 gwei なら 0.00008 ETH、2 gwei でも 0.003 ETH。

## 段階2: Sepolia 通しテスト(2026-08-18 実施・成功)
Nouns 側は **公式 Sepolia デプロイ**(DAO `0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57` / Token `0x4C4674bb72a096855496a7204962297bd7e12b85`、
ロジックは mainnet と同一ソース。`scripts/compare-chains.js` で差分表を出せる)、pNouns 側は **本物ソースの複製**(`contracts/vendor/pnouns`、無改変)。
- pNouns clone: `0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6`(voter A 3枚 / B 2枚 / C 1枚 / deployer 4枚 = tokenId 101..110)
- MetaGov: `0x09Ba5e225052D2C752Ed2954D4079e0a6DA74d19`(margin=5 ブロック、liveMode=true)
- delegator `0x5Da7…659e` が Nouns 2 枚(オークション落札)を MetaGov に委任
- 提案 #497: A 賛成(3枚) / B 反対(2枚) / C 反対(1枚) → tokens 3:3 → voters 1:2 → **反対**
  - castVotesBySig(3票) gas 266,882 / execute gas 156,762 / Nouns DAO receipt: hasVoted=true support=0 votes=2
  - https://sepolia.etherscan.io/tx/0x62869635c17fe81beec59b1219c35f7106bd775ffed8e72e1d97fea0a02d7d1c
- 手順: `scripts/sepolia/00..05`(00 は `FUND=0.02` で配布、02 はオークション約 15 分、05 は約 7 分。`PROPOSAL_ID=` で既存提案を再利用、`A= B= C=` で賛否を指定)

**教訓(リレイヤー実装に必須)**: `execute` の `estimateGas` は Nouns の refund 送金(`tx.gasprice` 依存)を含まず約 1 万 gas 過小になり、
実 tx が OOG で失敗した(#496)。**gasLimit は見積り ×1.3 以上**にすること。

## 次の段階
- 段階2 残り: dApp(MetaMask 署名 → リレイヤー API)と pnouns-mirror bot を Sepolia の MetaGov に接続して人間の操作込みでリハーサル
- 段階3: mainnet に `liveMode=false` でデプロイし Snapshot と並走 → 一致を確認 → マルチシグが委任先を切替、`liveMode=true`
- 未決: 票ゼロ時の挙動(棄権 or 投票しない)、`marginBlocks` の値、owner をどのマルチシグにするか
