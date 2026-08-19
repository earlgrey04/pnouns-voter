# pNouns Voter — pNouns 保有者の署名投票をオンチェーン集計して Nouns DAO に投票する

> 2026-08-18 改名: 旧称 pNouns Voter → **pNouns Voter**(コントラクト `PNounsVoter`、EIP-712 ドメイン "pNouns Voter"、Worker `pnouns-voter`)。Sepolia の旧 pNouns Voter(0x09Ba…4d19)は履歴として残るが未使用。

pNouns の Snapshot 投票結果を人手で Nouns DAO に反映している現状を、
「保有者は EIP-712 署名だけ(ガス0) → リレイヤーが mainnet の pNouns Voter に一括投函 → 締切後に誰でも execute →
pNouns Voter が Nouns DAO に castRefundableVoteWithReason」で無人化するためのコントラクトと、
mainnet フォーク上の E2E テスト(段階1)。

## 決定事項(2026-08-18 アールグレイ)
- pNouns トレジャリー `0x8ae80e0b44205904be18869240c2ec62d2342785` の保有分は投票権に含めない(`excluded`。owner が変更可)
- 定足数なし
- tokens 同数 → 投票者数が多い方 → それも同数なら棄権。**票ゼロは投票しない**(execute が NoVotes で拒否、リレイヤーは ℹ️ 通知のみ。2026-08-18 決定)
- 締切 = Nouns の `endBlock − marginBlocks`。**mainnet は 7200 ブロック ≒ 24h(2026-08-18 決定)**、Sepolia テストは 5。締切後に誰でも `execute`
- チェーンは Ethereum mainnet(Nouns の委任先は mainnet アドレス必須。L2→L1 メッセージは Nouns の投票期間に間に合わない)

## 前提となる pNouns NFT の仕様(mainnet `0x4bE962499cE295b1ed180F923bf9c73b6357DE80`、Sourcify 検証済み)
- ERC721A(0.8.14)、tokenId 1..2100、totalSupply 2100、非プロキシ
- Enumerable なし / Votes(チェックポイント)なし → 「投票時の `ownerOf` ＋ tokenId 単位のビットマップで二重投票防止」方式
- Snapshot 空間 `pnounsdao.eth` は `erc20-balance-of`(=balanceOf)、quorum 210、48h

## コントラクト `contracts/PNounsVoter.sol`
- `castVotesBySig(VoteSig[])` 誰でも投函可。署名 = `Vote(uint256 proposalId,uint8 support,uint256[] tokenIds)`(EIP-712 domain: `pNouns Voter` / `1`)
- `castVote(...)` 本人が自分でガスを払う退路
- `execute(proposalId)` 締切後に誰でも。`liveMode=false` なら Nouns を呼ばずイベントのみ(シャドー運用)
- **ガス払い戻し(案 B)**: `castVotesBySig` / `castVote` の実行者(tx.origin)に、コントラクトの預け金から使用ガス分を同一 tx 内で返す(Nouns の `_refundGas` 準拠: priority ≤2 gwei、basefee ≤200 gwei、gas 量 ≤120k+70k×票数、`REFUND_BASE_GAS` 55k)。提案ごとの返金上限 `refundCapPerProposal`(既定 0.02 ETH)、`setRefundEnabled` で停止可、残高 0 ならスキップ、送金失敗でも revert しない(best effort)。owner は `sweep` で回収。フォーク実測: 支払 0.000157 ETH に対し返金 0.000156 ETH(net ≈ 0)。Sepolia 実測(Prop 510): 返金 0.000295 ETH、リレイヤーの純負担 −0.0000032 ETH
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
1. Nouns 2 枚の自己委任ホルダーになりすまし → pNouns Voter に delegate
2. 大口 delegate になりすまし → 提案作成(委任後なので creationBlock で pNouns Voter は 2 票)
3. 実 pNouns 保有者から hardhat 署名者へ token を移し、EIP-712 署名 → リレイヤーが 1 tx で投函
4. 締切までマイニング → 第三者が execute → `getReceipt` で pNouns Voter 名義 2 票を確認、Nouns の refund が executor に届く
5. 不正系(他人の token / 二重投票 / 除外アドレス / 移転後の再投票 / 署名改ざん)、同数タイブレーク、票ゼロ、シャドー運用、自己投函

### ガス実測(2026-08-18、fork 上)
| 操作 | gas |
|---|---|
| 初票(提案ごとのコールド初期化込み) | ~169k |
| 2 票目以降(1 枚持ち) | ~46k / 票 |
| 1 名 × 5 枚 | ~96k |
| execute(Nouns castRefundableVote 込み) | ~157k(Nouns から executor へ払い戻し) |
| 返金処理の追加分(castVotesBySig) | ~+25k / tx |

目安: 30 名投票 ≒ 1.5M gas。mainnet gas 0.05 gwei なら 0.00008 ETH、2 gwei でも 0.003 ETH。

## 段階2: Sepolia 通しテスト(2026-08-18 実施・成功)
Nouns 側は **公式 Sepolia デプロイ**(DAO `0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57` / Token `0x4C4674bb72a096855496a7204962297bd7e12b85`、
ロジックは mainnet と同一ソース。`scripts/compare-chains.js` で差分表を出せる)、pNouns 側は **本物ソースの複製**(`contracts/vendor/pnouns`、無改変)。
- pNouns clone: `0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6`(voter A 3枚 / B 2枚 / C 1枚 / deployer 4枚 = tokenId 101..110)
- delegator `0x5Da7…659e` が Nouns 2 枚(オークション落札)を pNouns Voter に委任
- 提案 #497: A 賛成(3枚) / B 反対(2枚) / C 反対(1枚) → tokens 3:3 → voters 1:2 → **反対**
  - castVotesBySig(3票) gas 266,882 / execute gas 156,762 / Nouns DAO receipt: hasVoted=true support=0 votes=2
  - https://sepolia.etherscan.io/tx/0x62869635c17fe81beec59b1219c35f7106bd775ffed8e72e1d97fea0a02d7d1c
- 手順: `scripts/sepolia/00..05`(00 は `FUND=0.02` で配布、02 はオークション約 15 分、05 は約 7 分。`PROPOSAL_ID=` で既存提案を再利用、`A= B= C=` で賛否を指定)

**教訓(リレイヤー実装に必須)**: `execute` の `estimateGas` は Nouns の refund 送金(`tx.gasprice` 依存)を含まず約 1 万 gas 過小になり、
実 tx が OOG で失敗した(#496)。**gasLimit は見積り ×1.3 以上**にすること。

## リレイヤー + 署名 dApp(`relayer/`、2026-08-18 Sepolia で稼働確認)
```
NETWORK=sepolia node relayer/index.js        # http://localhost:8790  (mainnet は NETWORK=mainnet METAGOV_ADDRESS=...)
```
- `relayer/config.js` env で切替: NETWORK / RPC_URLS(カンマ区切り、既定にフォールバック追加)/ RELAYER_PRIVATE_KEY(なければ SEPOLIA_MNEMONIC #0)/ DISCORD_WEBHOOK_URL / PORT / DATA_DIR / SUBMIT_INTERVAL_SEC / MIN_PENDING_AGE_SEC / EXECUTE_GAS_MULT(1.3)/ ONLY_PROPOSER(テスト用)
- API: `GET /api/config`(EIP-712 domain/types)、`GET /api/proposals[?closed=N]`(Pending/Active の Nouns 提案 + pNouns Voter 集計 + タイトル)、`GET /api/tokens/:addr?proposalId=`(保有 tokenId と投票済み)、`POST /api/vote`(署名検証・所有/除外/重複/状態/締切を事前チェックして保管)
- ワーカー: 15〜30 秒ごとに (1) 保留署名を個別 staticCall で検証 → 通るものだけ 1 tx で `castVotesBySig`、(2) 締切後の提案を `execute`(gasLimit = 見積 ×1.3)、Discord webhook 通知。状態は `~/.config/pnouns-metagov/<network>/votes.json`
- dApp `relayer/public/index.html`: ライブラリなし。MetaMask の `eth_signTypedData_v4` で署名 → POST。受付中提案・集計・自分の pNouns(投票済みは打消線)・最近の結果を表示
- Sepolia 実績: Prop 498 = API 受付 3 票 → 投函(gas 266,957)→ execute → Nouns DAO に賛成 2 票(全自動)
- **署名の公開・誰でも投函**(2026-08-18): `GET /api/signatures/:id` で投函待ち/投函済み署名を公開、`?calldata=1` でいま on-chain で通る署名だけを `castVotesBySig` の calldata にして返す。dApp に「投函待ちの署名を自分で投函する(誰でも可・ガス自己負担)」ボタン。ワーカーは他者投函済み(on-chain hasVoted)を `tx:"external"` と記録し、自分の tx が revert したら記録を戻す(Prop 509 で実証: voter A が先に投函 → リレイヤー tx は revert → 集計 3 票)
- **署名受付締切**(M-14): オンチェーン締切の (MIN_PENDING_AGE + cron + 120s)/12 ブロック前(mainnet 30 ブロック)で API 受付を終了。以後はワーカーが即時投函モード、メンバーは自分で投函/castVote 可。dApp に両方の締切を表示
- 新提案が Pending/Active になると 📢 告知(締切 JST・dApp URL・nouns.wtf リンク)。`ANNOUNCE=0` で無効
- 常駐: `deploy/pnouns-metagov-relayer.service`(systemd user unit。`~/.config/systemd/user/` にコピーして enable。2026-08-18 から Sepolia で稼働中)
- Discord 通知は一文ごとに改行。✅ には Blockscout のイベントログ URL(Nouns DAO の `VoteCast` の reason に集計文が入る)を添付
- 検証: pNouns Voter(Sepolia)は Sourcify exact_match + Blockscout 検証済み → https://eth-sepolia.blockscout.com/address/0x3C7fb408EE6A5c2732770110B6dd48527F360e26 (Sourcify v1 API が brownout 中のため v2 API に直接 POST した。`hardhat verify` は使えない)
- 手動テスト: `TO=0x… N=3 npx hardhat --network sepolia run scripts/sepolia/08-mint-to.js` で MetaMask アドレスに pNouns 複製を配り、`06-propose.js` で提案を出して 5 分以内に dApp で署名

## Cloudflare Workers 版リレイヤー(`relayer-cf/`、2026-08-18 デプロイ・クラウドのみで通し成功)
ローカル版と同じロジックを Hono + viem に移植。**Worker 1 つ**に API・毎分 cron ワーカー・静的 dApp を同梱、状態は KV(1 票 = 1 キーで競合回避)。無料枠で稼働。
- 公開 URL: https://pnouns-voter.x402-adsb-worker.workers.dev (Sepolia)。旧 `pnouns-metagov-relayer` Worker は削除済み
- `wrangler.toml`: vars(NETWORK/VOTER/PNOUNS/NOUNS_DAO/NOUNS_TOKEN/EXPLORER/BLOCKSCOUT/ONLY_PROPOSER/PUBLIC_URL…)、KV `STATE`(id 4c2f1c68…、旧 838d35dd… は未使用)、cron `* * * * *`
- secrets(`wrangler secret put`): `RPC_URL`(Alchemy Sepolia)、`RELAYER_PRIVATE_KEY`(Sepolia ニーモニック #0)、`DISCORD_WEBHOOK_URL`。任意 `TICK_TOKEN`(POST /api/tick 用)
- ローカル開発: `.dev.vars`(600、git 管理外)+ `npx wrangler dev --port 8791 --test-scheduled`(cron は `curl localhost:8791/__scheduled?cron=*+*+*+*+*` で手動発火)
- 実績: Prop 505 = 📢 告知 → 3 票投函 → execute → Nouns DAO に賛成 2 票、すべて Cloudflare 上の cron で実行(ローカルは停止状態)
- mainnet 用は別 Worker(例: `wrangler deploy --name pnouns-metagov-relayer-mainnet` + vars/secrets 差し替え)で並走させる想定
- ローカル systemd 版(`relayer/`)は Worker 版に一本化したため **無効化済み**(`systemctl --user disable`)。緊急時のフォールバックとして残置

## 監査(2026-08-18、Codex)
第 1 回 High 3 / Medium 8、第 2 回 High 1 / Medium 5 / Low 4、第 3 回 High 2 / Medium 1 / Low 1、第 4 回 Medium 3 / Low 1、第 5 回 Medium 1 / Low 1、第 6 回 Medium 1(M-14R: 受付容量 + rush 複数バッチ)→ すべて対応済み。Cloudflare 無料枠(KV 書込み・list 1,000/日、サブリクエスト 50/呼び出し)を意識した設計(list はワーカーの dirty 提案のみ、公開 API は get のみ、Cache API)。運用は**無料枠で開始し、KV エラー時の Discord ⚠️ 警告と Cloudflare の KV Metrics を見て必要なら Workers Paid($5/月)へ**(プラン変更は再デプロイ不要・無停止)。注: 1 呼び出しあたり KV 1,000 操作の上限は Paid でも同じなので、設計側で list を metadata のみ・get を投函対象のみに抑えている。詳細は `docs/AUDIT-BRIEF.md`(依頼)と `docs/AUDIT-RESPONSE-2026-08-18.md`(対応)。
- 委任の切り戻しは**以後の提案から**有効(Nouns は提案作成時点の委任票を使う)。進行中提案の緊急停止は `setLiveMode(false)`
- シャドー運用の execute は確定しない(後から本投票可)

## 次の段階
- 段階2 残り: dApp の「手動 execute」ボタン(ワーカー停止時の保険)、残高警告、日本語要約の表示(任意)、独自ドメイン
- pNouns Voter 方式では Snapshot への「起案」工程(pnouns-mirror の drafts→PR→publish)は不要。Nouns 提案は自動で受付対象になる
- 段階3: mainnet に `liveMode=false` でデプロイし Snapshot と並走 → 一致を確認 → マルチシグが委任先を切替、`liveMode=true`
- 決定(2026-08-18): mainnet 鍵は新規生成、margin 24h。未決: ガス代負担(案 A/B)、owner をどのマルチシグにするか。**mainnet デプロイは指示があるまで行わない**
