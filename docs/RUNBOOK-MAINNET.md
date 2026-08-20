# mainnet 移行 runbook (pNouns Voter)

第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。

## 0. 前提

- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)

## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵

| 役割 | 鍵 | 保管 | 資金 |
|---|---|---|---|
| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |

**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。

## 2. デプロイ (liveMode=false で開始)

```bash
NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
```

- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
- `owner_` は**最初からマルチシグを指定**(EOA を経由しない)。registrar_ は上記の registrar アドレス
- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
- Sourcify でソース検証 → exact_match を確認

## 3. 機械照合

```bash
NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
```

全項目 ✅ になるまで進まない。確認内容: spaceHash 一致 / delay >= 300 /
3 者分離 / Worker 設定一致 / 残高。

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

- トレジャリーからプールへ 0.05 ETH 送金
- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
- この間、Nouns DAO へは一切投票されない(手動運用を継続する)

## 6. 委任切替 → 本番化 (この順のみ)

1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
3. マルチシグから `setLiveMode(true)`
4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認

## 7. ロールバック

いつでも可能・即時:
- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
- `sweep(トレジャリー)` → プール残額を回収

## 8. 障害時

- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
  (Worker の自動照合が Discord に⚠️を出す)
- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
