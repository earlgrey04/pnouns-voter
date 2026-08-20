# 独立レビュー: ローカル LLM Qwen (qwen3.8:27b / Ollama) — 2026-08-21

Codex(15 回) とは独立した第 2 の AI によるレビュー。コントラクト全文と資料テキストのみを入力とし、ネットワークアクセスなしで実施。

## 1. コントラクト検証(脆弱性の洗い出し + 主張 a の判定)

# PNounsSnapVoter 監査レポート

## 1. 脆弱性・論理欠陥（重大度つき）

---

### [中] `nounsEndBlock` / 外部構造体レイアウトの脆弱な前提

**関数名:** `nounsEndBlock`

**内容:**
`INounsDAO.proposals(uint256)` の戻り値を `bytes memory` として取得し、`data.length == 15 * 32` を前提に assembly で 7 番目(0xc0)を startBlock、8 番目(0xe0)を endBlock として読み取っている。これは Nouns DAO の `proposals` 構造体が **静的フィールド 15 個のみ** で、かつ Solidity が単一構造体をインラインエンコードする（オフセットなし）ことを前提としている。

- 構造体に動的フィールド（`string description`, `address[] targets` 等）が含まれる場合、ABI エンコーディングはオフセット付きになり `data.length` は 480 字节を超え、`require` で revert する。
- Nouns DAO がプロキシ経由でアップグレードされた場合、構造体レイアウトが変わり同様に revert する。
- 逆に、レイアウトが想定とずれても `id == proposalId` の sanity check が通る場合（例: 1 番目が id なら通る）、startBlock / endBlock が **誤った値** として読まれ、締切が不正になる可能性がある。

**根拠:**
```solidity
require(ok && data.length == 15 * 32, "proposals() layout mismatch");
assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
```
`nounsDAO` は `immutable` だが、指すアドレスがプロキシである可能性は排除できない（推測: Nouns DAO は通常プロキシ構成）。

**影響:** 締切が誤判定される → 投票が早期に閉じる / 永遠に閉じない / `execute` が失敗する。

**推奨:** `proposals()` の戻り値を ABI デコードする代わりに、`endBlock` を直接返す view 関数を Nouns DAO 側に用意してもらう、または `Governor` の標準インターフェース（`quorumVotes`, `state` 等）から締切を導出する。

---

### [中] owner の DoS 権限（複数）

**関数名:** `setLiveMode`, `setMarginBlocks`, `sweep`, `setExcluded`

**内容:**
owner は以下を行うことができる：

| 操作 | 影響 |
|------|------|
| `setLiveMode(false)` | `execute` が永続的にシャドーモード → 投票が実行されない |
| `setMarginBlocks(巨大値)`（初回投票前） | 締切が 0 になり投票が即閉じる |
| `sweep(addr)` | 払い戻し用 ETH を全額持ち出し → 以降の refund が 0 になる |
| `setExcluded(voter, true)` | 特定投票者の投票を不可にする（投票前のみ） |

これらは「票の偽造・改変」ではないが、**正当な投票プロセスを owner 単独で停止・妨害できる** 点で中央集権的リスクがある。

**根拠:** 各 setter は `onlyOwner` であり、タイムロックやマルチシグの強制がない。

**推奨:** 重要 setter にタイムロック（TimelockController）を挟む、または `liveMode` の変更を registrar 合意制にする。

---

### [低] EIP-712 ドメインに chainId / verifyingContract が含まれない

**関数名:** `SNAP_DOMAIN_SEPARATOR`

**内容:**
```solidity
keccak256("EIP712Domain(string name,string version)")
```
chainId と verifyingContract が含まれないため、**同一 space・同一提案の署名が別チェーン上の同型コントラクトでリプレイ可能** である。ただし：
- 別チェーンに pNouns NFT が存在しない限り実害なし
- Snapshot 自体が chainId を含めない設計（仕様）

**根拠:** Snapshot v2 の EIP-712 ドメイン仕様。

**影響:** 理論上のクロスチェーンリプレイ。実害は pNouns がマルチチェーン展開した場合のみ。

---

### [低] `castVote` / `execute` が未登録提案にも適用される

**関数名:** `castVote`, `execute`

**内容:**
`castVote` は `nounsToSnap[nounsProposalId] != 0` の場合のみ猶予チェックを行い、未登録提案には猶予なしで直接投票を許可する。`execute` も登録チェックを行わない。つまり、**このコントラクトは「登録済み Snapshot 提案の集計器」であると同時に、任意の Nouns 提案に対する pNouns 投票アグリゲーターとして機能する**。

コメントに「退路」とある通り意図的だが、`execute` が未登録提案に対して Nouns DAO に投票を送出する経路が存在することは、コントラクトの責務範囲が広いことを意味する。

**根拠:**
```solidity
// castVote: 未登録なら猶予チェックをスキップ
if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert ...;
// execute: nounsToSnap チェックなし
```

**影響:** 設計意図と異なる利用が起きる可能性（例: 未登録提案に票を集めて execute する）。

---

### [低] `sweep` が `tx.origin` 払い戻し資金を含む全残高を移動する

**関数名:** `sweep`

**内容:**
owner は `sweep` でコントラクトの全 ETH を任意のアドレスに送れる。これは払い戻し用資金を含む。owner が信頼できない場合、refund 資金が横流しされる。

**根拠:**
```solidity
function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); ... }
```

**影響:** 信頼モデル上、owner は DAO 管理者であり信頼される前提。ただし refund 資金と owner 資金が混在する設計上、分離がない。

---

### [情報] `execute` が Nouns DAO の提案状態を再チェックしない

**関数名:** `execute`

**内容:**
`execute` は `t.deadline`（初回投票時に固定）と `t.executed` のみチェックし、Nouns DAO 側の提案状態（`state()`）を再確認しない。提案が Nouns DAO 側で取消・却下された場合、`castRefundableVoteWithReason` が revert し、`execute` 全体が失敗する。票は集計済みだが実行できない状態になる。

**根拠:** `execute` 内に `nounsDAO.state()` の呼び出しがない。

**影響:** 資金流出はない（revert で巻き戻し）。ただし「票が集計されているのに実行できない」状態が永続化する。

---

### [情報] `uint32` による集計上限

**関数名:** `_addTally`, `_subTally`, `Tally` 構造体

**内容:** token 数・投票者数が `uint32`（最大約 42 億）。pNouns の総発行数がこれを超えることは現実的でないが、理論上の上限。

**根拠:** `uint32 againstTokens; uint32 forTokens; ...`

**影響:** 実害なし。

---

## 2. 個別主張の判定

### a. 「リレイヤーは票の偽造・改変・勝手な投票ができない」

**判定: 成立（条件付き）**

| 観点 | 検証結果 |
|------|----------|
| 署名偽造 | 不可能。ECDSA.recover / EIP-1271 で `from` と一致することを要求 |
| `choice` 改変 | 不可能。choice は EIP-712 ダイジェストに含まれ、改変すると復元アドレスが一致しない |
| `proposal` 改変 | 不可能。同上 + `MixedProposals` チェック |
| `from` 改変 | 不可能。`_parseAddress` → 復元アドレス比較 |
| 他人の token を計上 | 不可能。`pnouns.ownerOf(id) == voter` を要求 |
| 二重計上 | 不可能。`_votedBitmap` ビットマップ |
| 未登録提案への投票 | 不可能（`castSnapshotVotes` は `snapToNouns` 必須） |
| **リレイヤーが token 選択** | **可能だが無害**。リレイヤーは投票者が所有する token の部分集合を提出できるが、投票者は supplement で追加可能。最終計数は同じ |

**結論:** リレイヤーは票
## 2. 資料の主要主張 b〜e の判定

**b. ガス払い戻しは成功した処理にのみ支払われ、提案ごとに累計 0.02 ETH で頭打ちになる**

【成立】
`_refundGas` は `castSnapshotVotes` / `castVote` の末尾で呼ばれ、途中 revert すれば実行されないため「成功時のみ」に該当。`remainingCap = refundCapPerProposal − refundedForProposal[proposalId]` が 0 になると早期 return し、`refundedForProposal` が提案単位で累積されるため、デフォルト 0.02 ETH で頭打ちになる。

---

**c. 対応表(snapToNouns)は Snapshot 経由の票が 1 票でも受理されると取り消せない**

【成立】
`unregisterProposal` は `snapshotVotesAccepted[nounsProposalId] != 0` なら `VotesAlreadyCounted` で revert。`castSnapshotVotes` はバッチの `votes.length` 分を `snapshotVotesAccepted` に加算するため、1 件でも受理されると 0 以外になり取消不可。一方 `castVote`(直接投票)はこの変数を触らないため、主張の「Snapshot 経由」限定で正確。

---

**d. 登録猶予(eligibleAtBlock)は登録時に確定し、owner が後から短縮できない**

【成立】
`registerProposal` 内で `eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks` が一度だけ書かれ、以降 `eligibleAtBlock` を上書きする関数は存在しない。`setRegistrationDelayBlocks` は `registrationDelayBlocks`(将来の登録用)のみ変更し、既存提案の `eligibleAtBlock` には影響しない(コメントにも明記)。

---

**e. owner にも票の偽造・改変・任意の Nouns 投票をする権限がない**

【成立】
投票系関数(`castSnapshotVotes` / `castVote`)に `onlyOwner` は付与されておらず、署名検証・token 所有確認は owner であっても必須。`_tallies` / `voterRec` / `_votedBitmap` を直接書き換える owner 専用関数は存在せず、owner が持てる権限は設定変更(excluded・margin・liveMode 等)と sweep のみで、票の内容・集計結果を改変する経路がない。
## 3. 資料本文のレビュー

pNouns DAO メンバーの立場から、提示された提案資料を5つの観点で検証しました。

### 1. 内部矛盾
**特になし**
数値（ガス代、ブロック数、ETH残高）や記述（鍵の役割、権限の範囲）について、資料内で食い違う箇所は見当たりません。§2の「正直な注記」でテスト環境と本番環境の鍵の同居状態を明確に区別しており、矛盾はありません。

### 2. 論理の飛躍
**特になし**
「クラウドを信頼しない設計」から「リレイヤーに権限を与えない」「誰でも投函可能にする」という導出は、§3と§6で一貫して説明されており、論理的飛躍はありません。また、「対応表の誤登録リスク」に対する「24時間猶予」と「自動検算」の対策も、§3で因果関係が明確に示されています。

### 3. 誇張・ミスリード
**§7 費用 / §8 動作確認の状況**
*   **「AI 監査ツールによるコードレビュー 15 回」の表現**: 「監査（Audit）」という用語は、通常、人間による専門的なセキュリティレビューを指すことが多いです。AIツールによるレビューを「監査」と呼ぶことは技術的には可能ですが、非エンジニアのメンバーに対して「人間が15回も検証した」という誤解を招くリスクがあります。「AIによる静的解析・レビュー」と表現する方が正確です。
*   **「十年以上分」の根拠**: §7で「0.05 ETH は現在の試算なら十年以上分です」とありますが、直後の文で「混雑時試算(年 0.03〜0.06 ETH)を単純に当てはめると、約 10 ヶ月〜1 年 8 ヶ月分です」と矛盾するように見えます。これは「通常時のガス代」に対して10年、「最悪の混雑時」に対して1年という条件分岐ですが、並列に書かれているため、メンバーが「10年持つのか、1年しか持たないのか」と混乱する可能性があります。「通常時は10年、最悪の混雑時が続いても1年以上は持つ」と明記すべきです。

### 4. 不明瞭
**§2 誰が何を持つか / §6 クラウドが止まったら**
*   **「誰でも代わりに反映・実行できる」の実態**: §2や§6で「誰でも代わりに運べ」「誰でも execute できます」と記載されていますが、§6の表の「必要な操作」欄や「正直に言うと」の注記を読むと、実際には「ウォレット操作に慣れた方」や「開発者向けの操作」が必要であることが分かります。「誰でも」という表現は、技術的に可能であることと、非エンジニアのメンバーが実際に実行できることの間で乖離があります。「技術的には誰でも可能だが、実際には技術的な知識とウォレット操作スキルが必要です」と補足すべきです。
*   **「見学モード」の具体的内容**: §9で「Nouns には投票せず、集計だけを実際の提案で数回行い」とありますが、この「集計だけを行う」状態が、メンバーの投票体験としてどのように見えるのか（Snapshotで投票してもNouns側には何も起きないのか、Discordで「これは見学モードです」と通知されるのか）が具体的に書かれていません。メンバーが「投票したのに反映されていない」と誤解しないためのUI/UX上の配慮が不明確です。

### 5. 未回答の疑問
**§9 投票のルール / 導入の進め方**
*   **トレジャリー分（13枚）の扱い**: §9で「トレジャリー分(13 枚)は数えない」と記載されていますが、なぜ数えないのか（DAOの意思決定権を個人やコントラクトに集中させないためか、それとも他の理由か）が説明されていません。また、もし将来トレジャリー分を投票に含める場合、その変更はコントラクトの書き換え（不可能）ではなく、運用ルールの変更で対応するのか、それともコントラクトの設計上、トレジャリーアドレスを除外リストに追加する仕組みなのか、技術的な根拠が示されていません。
*   **日本語要約の自動化**: §1で「日本語の要約は別途 Discord に投稿する形を予定しています(自動化するかは検討中)」と記載されていますが、この「検討中」の部分が、本提案の承認後にいつ、どのように決定されるのか、また、自動化されなかった場合、誰がその作業を行うのか（アールグレイ個人の負担になるのか）が明確ではありません。これは「定常的な人手作業をなくす」という提案の主旨に関わる重要な点です。

### 総評
技術的な安全性と透明性の説明は非常に丁寧で、非エンジニアでも理解しやすい比喩が使われています。
ただし、「誰でも実行可能」という表現の実態と、AI監査の位置づけ、トレジャリー分の扱いについて、メンバーの誤解を招かないよう補足が必要です。
これらの点を明確にすれば、意思決定に必要な情報は十分に揃っています。