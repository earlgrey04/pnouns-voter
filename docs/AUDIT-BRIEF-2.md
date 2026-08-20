# pNouns Snap Voter(B3 方式) — 監査依頼(第 7 回、2026-08-20)

## 依頼
`/mnt/data/pnouns-voter` の **B3 方式の差分**を監査してください。前提として、旧方式(pNouns Voter)は貴殿の監査 6 回(High6/Med19/Low7、全対応: docs/AUDIT-RESPONSE-2026-08-18.md)を経ています。
今回の監査対象は主に:
1. `contracts/PNounsSnapVoter.sol`(新コントラクト — Snapshot 署名のオンチェーン検証)
2. `relayer-cf/src/snap.js` と `relayer-cf/src/worker.js` の B3 モード(SNAPSHOT_SPACE 設定時のパス)
3. `relayer-cf/src/index.js` の snapshot_mode 分岐
発見事項は従来どおり「重大度 / 該当箇所(ファイル:行)/ 問題 / 再現条件 / 推奨修正」で。コードの修正は行わないでください。

## B3 方式の要旨
メンバーは従来どおり Snapshot(スペース pnounsdao.eth。テストでは earl-grey.eth)で投票する。
その投票は EIP-712 署名としてハブ/IPFS に公開されるので、リレイヤーが取得して `PNounsSnapVoter.castSnapshotVotes` に送る。
コントラクトが署名を検証し、pNouns NFT の保有(ownerOf)で重み付けして集計、締切後に Nouns DAO へ castRefundableVoteWithReason する。

## PNounsSnapVoter の仕様(旧 PNounsVoter からの差分)
- Snapshot の EIP-712 をそのまま検証:
  - domain = {name:"snapshot", version:"0.1.4"}(**chainId / verifyingContract を含まない**)
  - `Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)`(全フィールド string/uintの実測形式。実データ 6 件で確認済み)
  - space はコンストラクタ固定(spaceHash)。from 文字列と recover したアドレスを大文字小文字無視で照合(_sameAddressString)
  - choice: 1=FOR / 2=AGAINST / 3=ABSTAIN(提案は必ずこの並びで作られる前提)
- `registerProposal(string snapshotProposal, uint256 nounsProposalId)`: registrar(または owner)が各方向 1 回だけ登録(上書き不可)。keccak256(bytes(id 文字列)) をキーに双方向 mapping
- **投票やり直し**(Snapshot 仕様): voterRec{support,counted,timestamp} を保持し、timestamp がより新しい署名のみ受理(StaleVote)。やり直し時は旧 support から counted を差し引き新 support へ移す。追加保有 token があれば加算。tokenId ビットマップは従来どおり(全体で同 token 二重カウント不可)
- tokenIds はリレイヤーが添える(署名には含まれない)。ownerOf==voter を全件検証するので**水増しは不可能**、過少申告(検閲)のみ可能
- castVote(直接投票の退路)、execute(NoVotes/タイブレーク/liveMode)、ガス払い戻し(CEI+nonReentrant、cap、tx.origin)、marginBlocks は旧版と同一ロジック
- Sepolia 検証済みデプロイ: `0xc181c8fB1268FD02b5849428013037d25F5B2206`(space="earl-grey.eth"、Sourcify exact_match)

## リレイヤー(Worker)の B3 モード
- `SNAPSHOT_SPACE` 設定時: 従来の署名受付 API(/api/vote)は 410。投票の取り込みは:
  1. hub GraphQL `proposals(space)` 直近 15 件 → `snapToNouns(keccak256(utf8(id)))` を multicall → 対応付け(KV snapmap にキャッシュ)
  2. 対応付け済み & Nouns 側 Pending/Active & 締切前: hub `votes(proposal)` (最新 100 件) → on-chain `voterRec` と比較して新規/やり直しのみ → IPFS ゲートウェイからエンベロープ取得 → castSnapshotVotes(バッチ ≤ MAX_BATCH、simulate → gas×1.3)
  3. 送信中は KV `snapsent:{id}` で追跡し、次 tick で receipt 確定(未採掘 10 分で解除)
  4. 📢 告知は対応付け検出時(Snapshot 提案リンク)。execute / 残高警告 / エラー通知は従来どおり
- 実証: Sepolia で無人 E2E(Prop 522: タイブレーク 3:3→voters 2:1)、ユーザーの snapshot.box UI からの実投票(Prop 523: vp3 が on-chain 3 枚として集計)

## 特に見てほしい点
1. Snapshot 署名検証の完全性: domain に chainId が無いことによるクロスチェーン/クロスコントラクトのリプレイ余地(space 固定・proposal 登録制でどこまで塞げているか)、_sameAddressString の厳密性、string フィールドのハッシュ(UTF-8)の取り扱い
2. registerProposal の信頼モデル: registrar が誤った/悪意ある対応付けを登録した場合に起きうる最悪ケース(片方向 1 回制限で足りるか、投票開始後の登録の扱い)
3. やり直しロジック: _castVote の revote 分岐(タリーの付け替え・counted 加算・ビットマップ)の整合性、同一 timestamp、境界
4. tokenIds をリレイヤーが選ぶことによる攻撃面(過少申告以外に何かできるか。「誰でも送信可」との組み合わせ)
5. Worker: ハブ/IPFS ゲートウェイを信頼しない設計になっているか(改ざんエンベロープは署名検証で落ちるか、DoS 面)、snapmap キャッシュの整合性、snapsent の復旧、既知の KV/サブリクエスト予算(前回監査の H-04R/M-13 相当)を新パスが守れているか
6. 旧パス(/api/vote 系)と新パスの共存で設定ミス時に危険がないか(SNAPSHOT_SPACE の有無)

## 実行方法
```
cd /mnt/data/pnouns-voter && npx hardhat test          # フォーク 12 本(snap.fork.test.js を含む)
cd relayer-cf && npm test                              # Worker 境界テスト
```
参考: 実測した Snapshot 署名エンベロープの形式は test/snap.fork.test.js の REAL_VOTES と docs/AUDIT-RESPONSE-2026-08-18.md 末尾を参照。
