# mainnet 移行 runbook (pNouns Voter)

第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。

## 0. 前提

- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)

## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵

| 役割 | 鍵 | 保管 | 資金 |
|---|---|---|---|
| owner | **当初**: 現行の委任アドレス(アールグレイ管理・0.111 ETH 保有) → **安定稼働後に pNouns マルチシグへ移管**(2026-08-21 決定) | 当初はローカル、移管後はマルチシグ | 不要 |
| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | **GitHub Environment secret が正本**(ローカル複製を置く場合は .env・600) | 0.005 ETH |
| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |

**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。

## 2. デプロイ (liveMode=false で開始)

```bash
OWNER=0x<当初は委任アドレス> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
REG_DELAY=10 MARGIN=7200 \
  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
```

(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)

- `REG_DELAY=10` (約 2 分)。登録の tick と受付開始の tick を分けるための最小間隔(通常運用では受付前に自動照合が走るが、cron 遅延等があるためコード上の保証ではない)。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
- `MARGIN=7200` (約 24 時間 — 決定済みの運用値。締切 = Nouns 投票終了の 24 時間前)
- `OWNER` は当初、現行の委任アドレス(手順 7 で安定稼働後にマルチシグへ移管する。**移管を忘れないこと** — check-deploy の EXPECT_OWNER をマルチシグに切り替えて照合する)
- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
- Sourcify でソース検証 → exact_match を確認

## 3. 機械照合(段階ごとに実行する)

`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**

```bash
ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> \
     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=7200"
# (シェルの制約上、変数展開をコマンドとして実行できないため env を前置する)
# 手順 2 の後:            env $ENV node scripts/check-deploy.mjs --stage deployed
# 手順 4 の後:            env $ENV node scripts/check-deploy.mjs --stage worker
# プール入金の後:         env $ENV node scripts/check-deploy.mjs --stage funded
# 手順 6-1(委任)の後:     env $ENV node scripts/check-deploy.mjs --stage delegated
# 手順 6-3(live 化)の後:  env $ENV node scripts/check-deploy.mjs --stage live
```

mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
あることも確認される(先走りの live 化を検出)。Worker のデプロイ直後は伝搬遅延で
旧版の応答が返ることがある — その場合は 1 分待って再実行する。

## 4. Worker (Cloudflare) 設定

```bash
cd relayer-cf
# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
npx wrangler kv namespace create STATE --env mainnet
npx wrangler deploy --env mainnet
npx wrangler secret put RPC_URL --env mainnet
npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
```

- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)

## 5. シャドー運用 (liveMode=false)

- 委任アドレス(0.111 ETH 保有)から 3 箇所へ送金(トレジャリーの新規支出なし):
  プール(コントラクト自体) 0.05 ETH / relayer 0.01 ETH / registrar 0.005 ETH = 計 0.065 ETH。
  残り約 0.046 ETH は委任アドレス(当初 owner)の管理操作用に残す
- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
- この間、Nouns DAO へは一切投票されない(手動運用を継続する)

## 6. 委任切替 → 本番化 (この順のみ)

1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
3. owner(当初は委任アドレス)から `setLiveMode(true)`(マルチシグ移管後は マルチシグから)
4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認

## 6.5 管理者権限のマルチシグ移管(安定稼働後)

本番で数提案が問題なく流れたら:

1. 委任アドレスから `transferOwnership(マルチシグ)` を送信し、採掘を確認
2. `env $ENV node scripts/check-deploy.mjs --stage live` を **EXPECT_OWNER=マルチシグ** で再実行し✅を確認
3. 以後、緊急停止・sweep・鍵交代はマルチシグ承認が必要になる(単独では不可)

## 7. ロールバック(この順で)

1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
2. マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
5. 未処理の状態を確認: 投函待ちの票・pending の execute が残っていないか(`/api/proposals`、KV)
6. 誤登録が原因なら、票が入る前に `unregisterProposal`
7. `sweep(トレジャリー)` → プール残額を回収
8. 鍵の漏洩が疑われる場合: relayer secret・Discord webhook をローテーション、`setRegistrar` で差し替え

## 8. 障害時

- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
- 誤登録の疑い: **解禁前、または解禁後でも `snapshotVotesAccepted == 0` の間**は registrar/owner から
  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
  食い違う間は Worker は投函しない)。第三者の直接投函で 1 票でも受理されたら取消不能 →
  `setLiveMode(false)` + 当該議案は手動投票へ
- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
  (再登録すると猶予がその時点から再カウントされ、さらに遅くなる)。この提案は自動反映を
  諦め、**手動運用に切り替える**(従来どおり委任元から手動投票)。締切時に未反映の票が
  残った場合(backlogwarn 警告)も同様に、自動 execute は止まるので手動で判断する
- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)

## 9. 停止対応の実効性確認(第17回監査の推奨)

最後の防壁が「管理者が締切前に停止できること」である以上、次を本番前に実施する:

- **停止訓練**: マルチシグ移管後、`setLiveMode(false)` の提案 → 必要署名 → 採掘までの
  所要時間を実測し、内部締切(margin 24h)に対して十分短いことを確認する
- **停止 SLA**: 夜間・週末の対応者と必要署名者数を決めておく
- **登録前の読み戻し検算**: create-and-register は Snapshot 提案をハブから再取得し、
  space・本文 URL・choices の一致を確認してから registerProposal を呼ぶ(実装済み)。
  検算失敗時は登録せずに中止する(孤児提案は残るため手動確認)

## 10. デプロイの透明性(公開時に設定)

リポジトリ公開後、Worker のデプロイは GitHub Actions 経由(`wrangler deploy` を CI で実行)に
切り替える。これにより「どのコミットをいつ Cloudflare に配備したか」の公開実行ログが残り、
実行コードとリポジトリの対応が(暗号学的な証明ではないが)追跡可能になる。


## 11. 対応表の登録運用(確定引き継ぎ方式)

対応表(Snapshot 提案 = Nouns 第 N 号)の登録は、**提案を作成した処理が、作成した Snapshot
提案 ID をそのまま登録する**方式に一本化する(scripts/create-and-register.mjs)。
Cloudflare の Worker からハブを探索して登録する方式は、探索の曖昧さ(複数候補・範囲外・
author フィルタの信頼性)が繰り返し監査指摘を生んだため採用しない(第18-20回監査)。

- 実行場所: GitHub Actions(bot の作成ジョブに続けて登録まで行う)。自宅 PC 非依存。
- registrar の鍵は GitHub の secret に置き、Cloudflare には置かない
  (運ぶ人=Cloudflare、作る+登録する人=GitHub の分離)。
- create-and-register は送信前に鍵・権限・未登録を確認し、作成後・登録前に
  Snapshot から提案を読み戻して内容(space/URL/choices)一致を検証する(第17回監査)。
- Cloudflare の Worker は登録には関与せず、対応表を読んで照合・投函・execute のみ行う。
