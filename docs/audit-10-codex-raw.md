- 締切前は投函が止まりますが、締切後は `maybeExecute()` に入り、障害前までに計上された部分集計を Nouns DAO へ投票できます。
- 一度も計上されていなければ `"no votes"` を KV に記録します。いずれも Snapshot 上の票が取り残されたまま最終処理される経路です。

`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。

推奨する修正:

- mapping 解決結果に `resolved: true/false` のような明示的状態を設ける。
- Snapshot モードで解決に失敗した tick は、告知・投函・no-votes 判定・execute をすべて行わず、tick 全体を終了する。
- 少なくとも `maybeExecute()` は「その tick で対応表と link/timeline を検証済み」でなければ呼ばない。
- Hub 障害、GraphQL `errors`、フィールド `null` の各ケースについて worker レベルの回帰テストを追加する。

## [Medium] URL 照合は「提案本文の自己申告」であり、悪意ある対応付けを検出できない

該当箇所: [snap.js:74](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:74), [snap.js:78](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:78), [member-proposal-unified.html:171](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:171), [member-proposal-unified.html:176](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:176)

何が起きるか:

`discussion` と `body` は提案作成時に指定できる文字列です。Snapshot の公式インターフェースでも両者は提案作成入力です。[Snapshot 公式実装](https://github.com/snapshot-labs/snapshot-mcp)

したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。

- Snapshot 提案の author
- Nouns 提案のタイトル・本文・creation block
- choices/type
- 正規の提案作成処理から生成されたこと
- URL が唯一の対応先であること

この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。

資料の「誤登録は機械が自分で見つけて知らせる」は絶対表現として言い過ぎです。

正規表現自体について:

- `nounsId` は `Number(res[i])` または数値の Nouns proposal ID から来るため、通常は正規表現メタ文字を含みません。
- ID 12 は `/vote/123` に誤マッチしません。
- `/vote/123?tab=x`、`/vote/123/`、`/vote/123#x` は `\b` によりマッチします。
- 一方、`evilnouns.wtf/vote/123` やサブドメインもマッチします。
- 大文字の `NOUNS.WTF` は取りこぼします。
- `Number` 変換は `2^53-1` 超で精度を失いますが、現実の Nouns proposal ID では問題になりません。

推奨する修正:

- `URL` で解析し、hostname が `nouns.wtf`、pathname が `/vote/${id}` または末尾 `/` だけであることを検証する。
- `discussion` は完全一致の canonical URL とし、本文の部分文字列一致は補助情報に降格する。
- author allowlist、choices/type、Nouns 本文またはハッシュも照合する。
- 資料は「通常の取り違えを自動検出する補助チェック。作成プログラムや鍵が偽提案と URL を同時に作る場合は検出できない」と修正する。

## [Medium] 不一致を判定する前に、誤った Snapshot 提案を Discord へ告知する

該当箇所: [worker.js:415](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:415), [worker.js:416](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:416), [worker.js:420](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:420), [worker.js:425](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:425), [worker.js:24](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:24)

何が起きるか:

`announceNew()` は `linkOk` 判定より先に実行されます。不一致 mapping の最初の tick では、

1. 誤った Snapshot URL を「投票受付を開始しました」と告知
2. `announced` を KV に保存
3. その後で不一致警告
4. mainnet の投函・execute を停止

という順序になります。

利用者が最初のメッセージから誤提案へ投票する可能性があり、修正後も告知は済み扱いなので、正しい URL の自動再告知もされません。

推奨する修正:

- `announceNew()` を `linkOk` と timeline 検証の後へ移動する。
- Hub 照合不能時も告知しない。
- mapping が変更された場合は、`announced` を mapping の Snapshot ID と紐付け、正しい再登録後に再告知できるようにする。

## [Medium] 「1票でも計上されると取消不可」は直接投票を含めると事実ではない

該当箇所: [PNounsSnapVoter.sol:185](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:185), [PNounsSnapVoter.sol:190](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:190), [PNounsSnapVoter.sol:267](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:267), [PNounsSnapVoter.sol:272](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:272), [snap.fork.test.js:246](/mnt/data/pnouns-voter/test/snap.fork.test.js:246), [member-proposal-unified.html:175](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:175)

何が起きるか:

`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。

そのため、直接 `castVote()` で tally・`voterRec`・bitmap が更新済みでも、Snapshot 署名が未受理なら取消できます。既存テストもこの挙動を明示的に期待しています。

取消時に削除されるのは対応表と登録ブロックだけです。tally、`voterRec`、`_votedBitmap` は消えません。再登録すると、以前の直接票と二重計上防止状態を引き継ぎます。以前の Snapshot 票については、1件でも成功していれば取消自体ができないため、取消後に復活・消滅する経路はありません。

「受理されたが計上されなかった票」については問題ありません。

- 初回票・補完票で新規 token がゼロなら `NothingCounted` でトランザクション全体が revert し、accepted は増えません。
- やり直し票は新規 token がゼロでも choice/record を更新でき、その成功後に accepted が増えます。
- accepted 加算はループ全体の成功後なので、部分受理もありません。

推奨する修正:

資料を次のように限定してください。

> Snapshot 署名が1件でもコントラクトに受理されると、その対応表は取消できない。直接オンチェーン投票は取消を妨げず、その集計状態は取消・再登録後も残る。

## [Medium] 24時間 delay は固定保証ではなく、owner が事後に短縮できる

該当箇所: [PNounsSnapVoter.sol:167](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:167), [PNounsSnapVoter.sol:249](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:249), [PNounsSnapVoter.sol:276](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:276), [worker.js:383](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:383), [worker.js:396](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:396)

何が起きるか:

受付判定は登録時に確定した期限ではなく、現在のグローバル `registrationDelayBlocks` を毎回参照します。登録後に owner が値をゼロへ変更すれば即時受付可能です。

Worker の最低値確認も `spaceChecked` が true になるまでの一度だけです。同じ Worker isolate 上で事後変更された場合、最低値未満になっても検知しません。

したがって「票を受け付けていない時間＝必ずやり直せる時間」は、delay が短縮されず、owner/マルチシグが正しく運用される条件付きでは成立しますが、コントラクトの不変条件ではありません。

推奨する修正:

- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
- または delay を immutable にする。
- Worker の最低値確認は毎 tick、または一定間隔で再実施する。

## [Low] 警告送信失敗後も7日間通知済み扱いになる

該当箇所: [worker.js:8](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:8), [worker.js:421](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:421), [worker.js:422](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:422)

何が起きるか:

- `linkwarn` を保存してから Discord を呼びます。
- `notify()` は network error を内部で握りつぶします。
- HTTP 4xx/5xx については `response.ok` を確認していないため成功扱いです。

最初の通知が失敗してもフラグは7日残り、停止理由が管理者へ届かない可能性があります。

推奨する修正:

- Discord の 2xx を確認してから長期フラグを保存する。
- 失敗時はメモリまたは短い TTL で再試行を抑制しつつ、長期の通知済みフラグは立てない。

## [Low] 今回の照合ロジックに回帰テストがない

該当箇所: [snap.js:78](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:78), [worker.js:420](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:420), [cursor.test.mjs:4](/mnt/data/pnouns-voter/relayer-cf/test/cursor.test.mjs:4)

何が起きるか:

現行の `relayer-cf` テストは cursor と受付締切が中心で、次を検証していません。

- ID の prefix 衝突
- query/fragment/末尾スラッシュ
- 偽ドメイン・大文字
- `discussion`/`body` の null
- GraphQL error 時の execute 抑止
- 告知より先に照合すること
- `linkwarn` の write 回数

推奨する修正:

`resolveMappings()` の純粋な URL 判定を関数分離し、worker の依存を注入可能にして上記ケースを追加してください。

## [Low] `space` は無制限長で、deployment/execute gas を増やせる

該当箇所: [PNounsSnapVoter.sol:58](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:58), [PNounsSnapVoter.sol:154](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:154), [PNounsSnapVoter.sol:155](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:155), [PNounsSnapVoter.sol:409](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:409)

何が起きるか:

通常の `pnounsdao.eth` では影響は小さく、主に deployment 時の storage write と execute 時の storage read が追加される程度です。

ただしコンストラクタに長さ制限がないため、異常に長い `space_` を設定すると、deployment gas、reason の構築、Nouns DAO への calldata、`VoteCast` event gas が増えます。Nouns の理由文字列にも実質的な固定長制限はなく、最終的な制約は gas です。

推奨する修正:

`bytes(space_).length` に現実的な上限を設けてください。例えば ENS 名を想定するなら 255 bytes 以下、運用上はさらに短い上限で十分です。

## 問題なしと判断した点

### [Info] `linkwarn` 単体では毎 tick write の回帰はない

該当箇所: [worker.js:421](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:421), [store.js:41](/mnt/data/pnouns-voter/relayer-cf/src/store.js:41)

`setFlag()` は明確に KV write を1回消費します。ただしフラグが存在する間は `get` のみで、毎分 write にはなりません。TTL 後も不一致なら7日ごとに再度1 write/警告なので「永久に1提案1回」ではなく「1提案・7日につき1回」です。

この経路単体で 1,000 writes/日を超える現実的経路は確認できません。

### [Info] `continue` は cursor/offset/dead-letter を進めない

該当箇所: [worker.js:425](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:425), [worker.js:148](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:148)

`continue` は `submitFromSnapshot()` より前なので scan offset、fail count、dead-letter は変更されません。link が修正されれば同じ状態から再開できます。永久取り残しになるのは、不一致または照合不能がオンチェーン締切まで解消されなかった場合だけで、cursor の不整合によるものではありません。

### [Info] delay は全投票入口に実装されている

該当箇所: [PNounsSnapVoter.sol:243](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:243), [PNounsSnapVoter.sol:249](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:249), [PNounsSnapVoter.sol:272](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:272), [PNounsSnapVoter.sol:276](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:276)

tally に入る外部入口は `castSnapshotVotes()` と `castVote()` の2つで、登録済み提案について双方に block-number delay があります。他の投票入口は確認されませんでした。

reorg についても、登録と `registeredAtBlock` は同じ canonical state に属するため通常の浅い reorg には整合的です。24時間相当より深い reorg や owner による delay 変更までは保証しません。

### [Info] `spaceHash` と `space` は通常経路では不一致にならない

該当箇所: [PNounsSnapVoter.sol:154](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:154), [PNounsSnapVoter.sol:155](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:155)

両者は同じコンストラクタ引数から一度だけ設定され、`space` の setter はありません。通常のコントラクト操作で不一致にする経路はありません。

## 検証実績

- `git show 0a98a23 -- relayer-cf` と `git show e347166 -- contracts/PNounsSnapVoter.sol` を確認。
- `relayer-cf` の `npm test`: 2/2 pass。
- mainnet RPC が必要な fork test は実行せず、ソース上の既存テストを確認。
- ファイル変更なし。

[exited with code 0]
