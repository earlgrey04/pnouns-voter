Reading additional input from stdin...
OpenAI Codex v0.145.0-alpha.7
--------
workdir: /mnt/data/pnouns-voter
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a021f7-10c6-73c2-a7af-5b43a275072d
--------
user
# 監査依頼 (第17回) — 第16回指摘への修正の検証と、不採用とした対策への見解

あなたは pNouns Voter の第三者監査者です。第16回監査(docs/audit-16-codex-raw.md)の
指摘に対する修正が commit d23ed75 に入っています(`git show d23ed75`)。
ファイル変更禁止。日本語で報告。relayer-cf で npm test を実行し結果を含めること。

## 1. 修正の検証
a. 資料 §3 の訂正後の記述(docs/member-proposal-unified.html の「なぜ長い猶予にしないのか」
   「短縮の代償(正直な限界)」)が、今度こそコードの実態と一致しているか。
   過小・過大な表現が残っていないか(例: 「多くの場合は取消可能なまま」の妥当性、
   停止スイッチがグローバルに効く旨、警告が数分で出る根拠)
b. RUNBOOK の新しい誤登録対応(解禁前 or snapshotVotesAccepted==0 の間は取消可 /
   受理後は setLiveMode(false)+手動)がコントラクトの条件と正確に一致するか
c. 追加テスト(mainnet + linkOk=false + 解禁済み + 実票 → 投函しない)は
   第16回で推奨した内容を正しく検証できているか

## 2. 不採用とした対策への見解(重要)
第16回であなたが提示したコントラクト側の対策 2 案を、当方は次の理由で不採用とした:
「検算済みフラグ(validated/activated)の追加」も「投函・execute の認可制」も、
誰でも救済投函・実行できるという permissionless 設計の核を壊す。残余リスクは
『稀な誤登録 × 敵対者の先回り投函』の複合条件で、管理者停止+当該議案の手動運用で
受け止める。コントラクト変更は再デプロイ+全面再監査を要する。

この判断について率直に見解を述べてほしい:
- この却下理由は技術的に妥当か。見落としている論点はないか
- permissionless 性を保ったまま残余リスクを減らす「より軽い第 3 の対策」は
  存在するか(例: 登録時に検算をコントラクト外で済ませてから登録する運用、
  解禁直後だけ Worker が先回りで正しい票を投函する、等の実効性を評価)
- 総合として、現設計のまま mainnet に進んでよいか、それとも対策を再考すべきか

## 3. 総括
第16回で「問題なし」とした項目に、d23ed75 が影響を与えていないかを確認し、
コード面の現状評価(クローズ可否)を述べること。
codex
監査対象を読み込み、commit 差分・関連コントラクト条件・テスト内容を突き合わせます。その後、指定どおり `relayer-cf` で `npm test` を実行し、結果を含めて日本語で報告します。ファイルは変更しません。
exec
/bin/bash -lc 'git status --short && git show --stat --oneline --decorate --no-renames d23ed75 && git show --no-ext-diff --unified=80 --no-renames d23ed75 -- docs/member-proposal-unified.html RUNBOOK.md relayer-cf' in /mnt/data/pnouns-voter
 succeeded in 0ms:
d23ed75 (HEAD -> main) 第16回監査(Codex)対応: 猶予短縮の資料主張を訂正・限界を明記
 docs/AUDIT-RESPONSE-2026-08-18.md    |    14 +
 docs/RUNBOOK-MAINNET.md              |     6 +-
 docs/audit-16-codex-raw.md           | 14307 +++++++++++++++++++++++++++++++++
 docs/member-proposal-unified.html    |     7 +-
 relayer-cf/test/worker-tick.test.mjs |    15 +
 5 files changed, 14344 insertions(+), 5 deletions(-)
commit d23ed754fb317e16f0f38c0a708efa6120fbbcac
Author: earlgrey <[redacted-email]>
Date:   Fri Aug 21 10:33:07 2026 +0900

    第16回監査(Codex)対応: 猶予短縮の資料主張を訂正・限界を明記
    
    High: 資料の 3 主張を訂正 — ①検算の事前実行は「保証」ではなく通常経路の
    挙動 ②permissionless な直接投函により、第三者が解禁(約2分)後に公開署名を
    投函すると検算が止めていても対応表は取消不能になり得る(旧24hはこの窓を
    コントラクトで防いでいた)ことを「短縮の代償」として明記 ③管理者停止は
    運用保証(締切前の反応が条件・スイッチは全体に効く)と条件を明示。
    推奨の Worker テスト(mainnet+linkOk=false+解禁済み+実票→投函しない)を
    追加(46 pass)。コントラクト側の認可制は救済経路を壊すため不採用とし、
    残余リスクは停止+手動運用で受け止める方針を記録。
    
    Low: RUNBOOK の旧24h残骸を実条件に置換 / 「日常的」「数日間」の条件明示。
    
    Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/docs/member-proposal-unified.html b/docs/member-proposal-unified.html
index e6df84a..e21457d 100644
--- a/docs/member-proposal-unified.html
+++ b/docs/member-proposal-unified.html
@@ -200,169 +200,170 @@
 
 <h3>ガス代(ETH)をどこに入れておくか — 配分の全体像</h3>
 <div class="tbl"><table>
 <tr><th>入れる先</th><th>額(本番想定)</th><th>役割・減り方</th></tr>
 <tr><td><b>コントラクト自体(返金プール)</b></td><td>0.05 ETH</td><td>投函ガスの払い戻しの原資。<b>払い戻しはコントラクトが自分の残高から、投函と同じトランザクションの中で送金します</b>(人手を介しません)</td></tr>
 <tr><td>リレイヤー</td><td>0.01 ETH</td><td>投函のたびに立て替えるが、同じ処理の中で<b>コントラクト(プール)から</b>払い戻されるため<b>ほぼ減らない</b>(回転資金)</td></tr>
 <tr><td>登録係</td><td>0.005 ETH</td><td>登録には払い戻しがなく自分の残高を消費。ただし 1 回 約 1 円 × 年 50〜110 回なので<b>数年もつ</b></td></tr>
 <tr><td>Snapshot bot</td><td>—</td><td>署名だけでガス不要</td></tr>
 <tr><td>管理者(当初の委任アドレス)</td><td>約 0.046 ETH(3 箇所への配分後の残額)</td><td>見学モードの開始・本番化・権限移管などの管理操作に使用。移管後のマルチシグは既存の残高から管理操作のガスを支払う</td></tr>
 </table></div>
 <ul style="font-size:14px">
   <li>登録係に払い戻しを付けないのは意図的です。払い戻しの対象を「誰でも実行できる救済操作」に限ることで、万一登録係の鍵が漏れても、登録の繰り返しでプールを吸い出す抜け道を作らないためです。</li>
   <li>リレイヤー・登録係・プールの残高はいずれも自動プログラムが監視し、少なくなると Discord に⚠️警告を出します。</li>
 </ul>
 
 <div class="card warn" style="font-size:14px"><b>正直な注記 — 鍵の分離の「テスト段階(現在)」と「本番」</b>
 <div class="tbl"><table>
 <tr><th></th><th>テスト段階(現在)</th><th>本番(移行時に実施)</th></tr>
 <tr><td>アドレス(権限)の分離</td><td>管理者・登録係・リレイヤーの 3 者は別アドレスで検証済み。Snapshot bot だけは開発用に管理者と同じ鍵</td><td><b>4 つすべてを新しい鍵として作り直し、完全に分離</b></td></tr>
 <tr><td>保管場所の分離</td><td>リレイヤーのみ Cloudflare。登録係・bot は自宅 PC に同居</td><td><b>役割ごとに別の場所へ</b>(特に bot と登録係は別サービスに)</td></tr>
 </table></div>
 <p style="margin:4px 0 0">本番の鍵の作り直しと配置は手順書に組み込み済みで、導入時の機械チェックでも照合します。</p></div>
 
 <h2 id="proof"><span class="no">3.</span>「集計が正しい」と言える理由</h2>
 <p>いちばん大事な前提: <b>コントラクトは「集計結果」を受け取りません</b>。受け取るのは<b>1 票ずつの署名データ</b>で、正しさを自分で確かめ、集計も自分で行います。「誰かが計算した結果を信じる」場面がそもそも存在しません。</p>
 
 <h4 class="sub">そもそもコントラクトは Snapshot を読めないのに、どう検証するのか(たとえ話つき)</h4>
 <p style="margin-top:10px"><b>コントラクトは外部のインターネットに一切アクセスできません</b>(あらゆるスマートコントラクト共通の制約)。Snapshot から署名データをダウンロードするのはリレイヤー(クラウドの自動プログラム)で、トランザクションの引数としてコントラクトに「手渡し」します。つまり運び屋です。</p>
 <p><b>「運び屋が渡すデータなど信用できるのか?」</b> — ここが設計の核心で、<b>信用しなくていい</b>ようにできています。メンバーが snapshot.box で「賛成」を押すと、ウォレットが「誰が・どの投票所の・どの提案に・どの選択肢を・いつ」という<b>構造化されたメッセージ全体に電子署名</b>を作ります(チェーンに書き込まないのでガス代 0 円)。この「メッセージ+署名」の組が Snapshot と IPFS に公開保存され、誰でもダウンロードできます。</p>
 <p>電子署名には次の性質があります: <b>署名とメッセージがあれば、「誰が署名したか」を純粋な計算だけで復元できる</b>(誰かに問い合わせる必要がない)。コントラクトは受け取ったデータから、①メッセージのハッシュ値を自分で計算し直し(このとき投票所名は焼き込み済みの pnounsdao.eth を使う)、②署名から署名者のアドレスを数学的に復元し、③申告された投票者と一致するか照合します。Ethereum 本体が全トランザクションの検証に使っているのと同じ仕組みです。</p>
 <p>リレイヤーが途中で「賛成」を「反対」に書き換えると、①のハッシュが変わり、②で復元されるアドレスが<b>まったく別の(実在すらしない)アドレス</b>になり、票は拒否されます。改ざんは「バレる」のではなく<b>数学的に成立しない</b>のです。偽の票をゼロから作るには本人の秘密鍵が必要で、それは本人のウォレットの外に出ません。</p>
 <p style="margin-bottom:4px"><b>たとえるなら</b>: Snapshot は「実印を押した投票はがきが貼り出される<b>公開掲示板</b>」、リレイヤーは「はがきを役所に運ぶだけの<b>配達員</b>」、コントラクトは「印影を自前で照合できる<b>役所</b>」です。役所は掲示板にも配達員にも「本物ですか?」と聞く必要がなく、はがきそのものを検査すれば真贋が分かります。配達員にできるのは配達をサボることだけで、それも掲示板が公開なので誰にでも露見します。</p>
 
 
 <h4 class="sub">1 票が通る 8 つの確認(実装そのまま)</h4>
 <div class="tbl"><table>
 <tr><th>#</th><th>確認すること</th><th>どうやって確かめるか</th></tr>
 <tr><td>1</td><td>この投票はどの Nouns 議案のものか</td><td>署名に含まれる Snapshot 提案 ID から、事前に登録された対応表(§2 の登録係が提案ごとに登録する「この Snapshot 投票 = 第 N 号議案」の一覧)を引く。未登録なら受け付けない</td></tr>
 <tr><td>2</td><td>対応表が登録された直後ではないか</td><td>登録から 10 ブロック(約 2 分)は票を受け付けない(受付が始まる前に、必ず自動検算(備え 2)が先に走ることを保証する間隔。理由は下記)</td></tr>
 <tr><td>3</td><td><b>署名が本物か</b></td><td>受け取ったデータ(投票所名・議案 ID・選択肢・時刻・投票者など)から<b>コントラクトが自分でハッシュを計算し直し</b>、署名から投票者のアドレスを復元。申告と一致しなければ拒否</td></tr>
 <tr><td>4</td><td>Safe など<b>複数人で承認するウォレット</b>からの投票か</td><td>この種のウォレットは、ウォレット自体が Ethereum 上のプログラム(コントラクト)で、1 本の署名鍵を持たないため、確認 3 の計算が使えません。代わりに、<b>投票者として名乗っているそのアドレス — つまり投票者自身の Safe コントラクト — に「この署名を有効と認めるか」をチェーン内で問い合わせます</b>(EIP-1271 という共通規格)。<b>この問い合わせに人が応答するわけではありません</b> — Safe コントラクトに組み込まれたプログラムが「必要な人数の承認が署名データに含まれているか」をその場で機械的に検査し、<b>自動で即答します</b>(承認集め自体は投票のときに Safe のアプリ上で済んでいるもので、問い合わせの時点で誰かの操作を待つことはありません)。Snapshot などチェーン外への問い合わせでもありません</td></tr>
 <tr><td>5</td><td><b>本当に投票権があるか</b></td><td>添えられた NFT 番号を<b>1 枚ずつ pNouns NFT に照会</b>し、現在の持ち主が署名者本人か確認</td></tr>
 <tr><td>6</td><td>同じ NFT を二重に数えていないか</td><td>議案ごとに「この NFT は計上済み」を記録(他人に移して再投票しても数えられない)</td></tr>
 <tr><td>7</td><td>投票のやり直しの整合性</td><td>同じ投票者の署名は、時刻がより新しいものだけ有効(古い署名の再提出は拒否)</td></tr>
 <tr><td>8</td><td>期限内か</td><td>Nouns 側の議案が投票可能な状態で、締切前であることを確認</td></tr>
 </table></div>
 
 
 <h4 class="sub">なぜ運営にもクラウドにも書き換えられないのか</h4>
 <ul style="margin-top:10px">
   <li><b>署名は 1 文字でも変えると別人の署名になります。</b>「賛成」を「反対」に書き換えて送っても、確認 3 で復元されるアドレスが変わり、本人と一致せず弾かれます。</li>
   <li><b>票の重みは水増しできません。</b>署名には「何枚持っているか」は入っていません。運ぶ側が NFT 番号を添えますが、コントラクトが 1 枚ずつ実際の持ち主を照会するため、他人の NFT や架空の保有は通りません。</li>
   <li><b>別の投票所の署名は使えません。</b>対象の Snapshot スペース名がコントラクトに焼き込まれており、ハッシュ計算に使われます。攻撃者が自分で作った投票所の署名を持ち込んでも成立しません。</li>
 </ul>
 
 
 <h4 class="sub">使っている暗号は堅牢か</h4>
 <p style="margin-top:10px">この仕組みが使う暗号部品は <b>Keccak-256(ハッシュ)</b>と<b>ECDSA/secp256k1(署名)</b>の 2 つだけで、<b>どちらも Ethereum 本体が全取引の検証に使っているものと同一</b>です(自作の暗号は一切ありません)。Keccak-256 は世界公募(SHA-3 コンペ)の優勝作で、15 年以上の解析を経ても実用的な攻撃は 1 件も見つかっていません。</p>
 <p>もしこれらが破られる日が来たら、pNouns の投票どころか <b>Ethereum 上の全資産(Nouns の NFT もトレジャリーも)が同時に危険になります</b>。つまりこの仕組みの暗号的な安全性は「Ethereum 自体と同じ水準」で、ここが相対的な弱点になることはありません。ハッシュの取り方も生の連結ではなく EIP-712 という標準規格で、型情報や用途(snapshot)ごと封印するため、別の文脈で作った署名を投票に流用するすり替えも成立しません。(参考: かつて広く使われた MD5 のように、ハッシュ関数が後年破られた例は実在します。Keccak-256 は出力長も設計世代も異なり、現時点でその兆候はありません)</p>
 <p style="margin-bottom:4px"><b>正直な補足</b>: 遠い将来の量子コンピュータはハッシュより署名側への脅威が先に来るとされますが、これは Ethereum 全体の課題で移行方式が研究されており、この仕組み固有のリスクではありません。実務上の最弱点はアルゴリズムではなく<b>鍵の管理と対応表の運用</b>です — だからこそ鍵の分離(§2)や対応表の自動検算(§3)に力を入れています。</p>
 
 
 <h3>運ぶ側(クラウド)にできてしまうことと、その対策</h3>
 <p style="margin:0 0 8px">リレイヤー(運び屋)が悪意を持った場合にできることは、具体的には次の 2 つだけです。</p>
 <ul>
   <li><b>都合の悪い票だけ届けない・遅らせる</b> — 例えば「賛成票だけ運ばず、反対票だけ届ける」ように、届ける票を選り好みして集計を歪めようとする。</li>
   <li><b>票の重みを実際より小さく届ける</b> — 票をチェーンに送るとき、リレイヤーは投票者が持つ NFT の番号一覧を添えます(署名には「何枚持っているか」が入っていないため)。ここで 5 枚持っている人の票に 1 枚分しか添えなければ、その人の票の重みが 5 → 1 に減ります。</li>
 </ul>
 <p style="margin:0 0 8px">どちらにも対策があります。</p>
 <ul>
   <li><b>届けない →</b> 署名は Snapshot 上で公開されているので、<b>誰でも同じ署名を拾って代わりに届けられます</b>(リレイヤーに独占権はありません)。</li>
   <li><b>重みを削る →</b> 誰でも<b>同じ署名に残りの NFT 番号を添えて出し直せます</b>。コントラクトはまだ数えていない NFT の分だけを追加で計上します(同じ人を二重に数えることはありません)。</li>
   <li><b>それでも漏れたら →</b> 確定の直前に「Snapshot 上の投票者数」と「チェーン上に反映済みの投票者数」を突き合わせ、<b>足りないままなら本番では自動確定しません</b>(警告を出して人の判断を仰ぎます)。運び漏れが最終結果になることを防ぐ最後の砦です。</li>
 </ul>
 
 <h3>唯一、暗号で保証できない部分 — 対応表</h3>
 <div class="card warn" style="margin-top:6px">
   <p style="margin:0 0 6px">確認 1 の<b>対応表(この Snapshot 投票 ＝ Nouns の第 N 号議案)</b>だけは、コントラクトが自力で確かめられません。Snapshot の投票署名に Nouns の議案番号が含まれていないためです(Snapshot の仕様)。運用は<b>全自動</b>ですが、「そのプログラムと鍵を信頼している」という意味で、ここだけは性質が異なります。</p>
   <p style="margin:0 0 6px"><b>そのための備えを 4 段用意しています。</b></p>
   <ol style="margin:0 0 4px">
-    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 受付が始まる前に、必ず自動検算(備え 2)が先に走ることを保証します。</li>
+    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 登録の処理回と受付開始の処理回を分けるための間隔です(通常の自動処理は、これとは別に毎回、投函の直前にも検算します)。</li>
     <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
     <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
     <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   </ol>
 </div>
 <h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
-  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は「受付が始まる前に自動検算が必ず 1 回走る」ことの保証で、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
-  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
+  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は登録と受付開始の処理回を分けるためのもので、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
+  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 旧案には<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という、通常運用でも起こり得る副作用がありました。一方、誤登録への守りは短縮後も次のとおり働きます — 自動検算が食い違いを検出している間、<b>通常の自動処理は誤った対応表へ票を流さない</b>ため、多くの場合は取消・登録し直しが可能なままです。比較の結果、<b>投票の反映を速くする(NFT の窓をなくす)ことを優先し、対応しきれない誤登録は「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針としました。</p>
+  <p style="margin:0 0 6px;font-size:14px"><b>短縮の代償(正直な限界)</b>: 票の投函は誰でも実行できる操作(クラウド障害時の救済経路)なので、<b>悪意の第三者が解禁(約 2 分)後に公開署名を直接投函すると、自動検算が止めていても対応表はその時点で取消不能になります</b>(旧 24 時間案は、この最初の窓をコントラクトの仕様として防いでいました)。この場合も含め、誤った投票が Nouns DAO に確定するのを防ぐ最後の砦は<b>管理者による停止</b>です — 検算の警告は数分で出るため、登録が締切間際でない限り、管理者には通常は数日の対応時間があります。停止スイッチは仕組み全体に効くため、停止中は他の議案の自動投票も一時止まります(当該議案の終了後に再開します)。</p>
   <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
 
 
 <h2 id="limits"><span class="no">4.</span>補えること・補えないこと</h2>
 <p>Snapshot には「署名だけ・ガス代 0 円」という大きな長所がある一方、結果がブロックチェーンの外にあることから来る弱点もあります。新しい仕組みは<b>長所を残したまま弱点を補う</b>ことを狙っていますが、<b>すべては補えません</b>。分けて書きます。</p>
 <h3>A. 補えるもの</h3>
 <div class="tbl"><table>
 <tr><th>いまの弱点</th><th>新しい仕組みでどうなるか</th></tr>
 <tr><td>結果がチェーン外の Snapshot / IPFS にあり、<b>Nouns DAO には自動で反映されない</b></td><td><b>通常時は解消</b>: 集計と反映をコントラクトと自動処理が行います。障害時の確認・手動対応は残ります</td></tr>
 <tr><td>Snapshot が出した集計結果を<b>信じるしかない</b></td><td><b>解消</b>: 信じません。コントラクトが署名を検証し、NFT の保有を 1 枚ずつ確かめて<b>自分で数え直します</b></td></tr>
 <tr><td>Snapshot の結果と Nouns への投票が<b>一致している保証がない</b><br><span style="font-size:13px;color:var(--ink-2)">※ 人力で見比べれば今でも確認はできます。問題は「一致させる強制力がない」ことと、<b>ズレても自動では気づけない</b>こと</span></td><td><b>解消</b>: 一致は「人が守るルール」ではなく<b>コントラクトの処理そのもの</b>になります(集計した結果がそのまま投票になるので、ズレる余地がありません)</td></tr>
 <tr><td>チェーン外の保存先だけでは、将来も取得できる保証がブロックチェーンと同じではない</td><td><b>反映済みの票について解消</b>: 集計も 1 票ごとの内訳もオンチェーンに残ります</td></tr>
 </table></div>
 <h3>B. 補えないもの(弱点として残るもの)</h3>
 <div class="tbl"><table>
 <tr><th>残る弱点</th><th>なぜ残るか / どう向き合うか</th></tr>
 <tr><td>投票期間中に <b>Snapshot が止まると投票できない</b></td><td>投票の入り口を Snapshot のままにする設計なので、ここは変わりません</td></tr>
 <tr><td>「どの Nouns 議案の投票か」は<b>署名に入っていない</b></td><td>対応表を外から与えるしかありません(<a href="#proof">§3</a> の 4 段の備えでカバー)</td></tr>
 <tr><td>投票資格を数える<b>時点がわずかにズレる</b></td><td>Snapshot は提案に設定されたスナップショット時点の保有、コントラクトは反映時点の保有で数えます。<b>その間に NFT を移転した場合だけ</b>差が出ます(詳しくは下の「投票したのに反映されない可能性はあるか」)</td></tr>
 </table></div>
 <h4 class="sub">投票したのに反映されない可能性はあるか(正直な一覧)</h4>
 <p style="font-size:14.5px"><b>基本ルールは 1 つだけ</b>: 票は「コントラクトが計上する瞬間の持ち主」で計算されます。<b>投票したら、反映が済むまで(通常は数分)NFT を動かさないでください</b>。反映は投票の数分後に自動で行われます(投票開始の直後だけ、約 2 分の受付前間隔(§3 の備え 1)のぶん待ちが加わります)。</p>
 <p style="font-size:14.5px;margin-bottom:6px">そのうえで、票が計上されない・減る可能性があるのは次の 3 つだけです。</p>
 <div class="tbl"><table>
 <tr><th>ケース</th><th>何が起きるか</th><th>備考</th></tr>
 <tr><td>① 投票のあと、<b>反映される前に NFT を移転</b>した</td><td>手放した分は数えられません(残した枚数だけ計上)。<b>全部手放すと、その票は計上できず、警告つきで「集計除外」として記録</b>されます(Snapshot の画面では投票済みに見えるままです)</td><td>本人の操作が原因。注意: 譲り受けた人は、<b>自分がスナップショット時点で pNouns を保有していた場合を除き、この議案の Snapshot 投票には参加できません</b>(Snapshot は保有ゼロの人の投票を受け付けないため)。つまり反映前に全部手放すと、<b>この議案ではその NFT 分の票は使われないまま</b>になります(次の議案からは新しい持ち主が普通に投票できます)</td></tr>
 <tr><td>② <b>集計締切までに票が運ばれなかった</b>(クラウドの長時間障害)</td><td>締切後の追加はできません。ただし未反映の票が残ったまま<b>本番が勝手に確定することはなく</b>、自動確定を止めて人の判断に切り替えます(§6)</td><td>障害が原因。署名は公開されているので、締切前なら<b>誰でも代わりに運べます</b></td></tr>
 <tr><td>③ <b>除外アドレス</b>(トレジャリー 13 枚)からの投票</td><td>ルールどおり数えません(§9)</td><td>設計どおり</td></tr>
 </table></div>
 <p style="font-size:14.5px"><b>反映された後の移転は、集計に影響しません。</b>あなたの票はそのまま有効で、取り消されることはありません(Snapshot 自体の「投票時点の権利で確定する」挙動と同じです)。譲り受けた人は、同じ議案ではその NFT で投票できませんが(計上済みのため)、<b>次の議案からは普通に投票できます</b>。どの場合も同じ NFT が 1 つの議案で 2 回数えられることはなく、移転で票を増やすことはできません。</p>
 <div class="card ok"><b>ひとことで言うと</b>: 「Snapshot の使い勝手(署名だけ・ガス 0 円)を残したまま、<b>各署名と集計を第三者が検算できる形</b>でオンチェーンに引き上げ、Nouns DAO への反映まで自動化した」仕組みです。投票の入り口である Snapshot と、議案どうしの対応表には依存が残ります。</div>
 
 <h2 id="record"><span class="no">5.</span>オンチェーンに残る記録 — Nouns DAO と pNouns Voter</h2>
 <p>記録は 2 箇所に残ります。<b>Nouns DAO 側</b>には投票そのもの(理由文に集計の内訳を自動で書き込みます)、<b>pNouns Voter(このコントラクト)側</b>には最終集計と 1 票ごとの明細です。テストネットでの実際の記録:</p>
 <div class="tbl"><table>
 <tr><th>記録先</th><th>内容</th></tr>
 <tr><td><b>Nouns DAO</b>(VoteCast)</td><td>投票者 = pNouns Voter コントラクト ／ 議案番号 ／ 賛否 ／ 票数 ／ <b>理由文「pNouns holders voted on Snapshot …: FOR (tokens for/against/abstain = 3/0/3, voters = 2/0/1)」</b><br><span style="font-size:13px;color:var(--ink-2)">理由文は nouns.wtf の提案ページにコメントとして表示されるため、Nouns コミュニティ全体から「pNouns がどういう内訳でその判断をしたか」が見えます</span></td></tr>
 <tr><td><b>pNouns Voter</b>(Executed)</td><td>最終集計(賛成/反対/棄権の枚数と投票者数)</td></tr>
 <tr><td><b>pNouns Voter</b>(1 票ごと)</td><td>誰が・どの選択肢に・何枚で・いつの署名で投票したか</td></tr>
 </table></div>
 <p>Snapshot の署名は誰でも取得できるので、第三者が自分で集計し直して上の記録と突き合わせる検証も可能です(<a href="#verify">§10</a> に手順)。</p>
 
 <h2 id="outage"><span class="no">6.</span>クラウド(Cloudflare)が止まったらどうなるか</h2>
 <p>票そのものは Snapshot に残るため、Cloudflare の停止だけで署名が消えるわけではありません。集計の締切は <b>Nouns の投票終了より 7,200 ブロック(約 24 時間)早く</b>設定し、その後の Nouns DAO への確定操作に余裕を持たせます。ただし、<b>Snapshot の票をコントラクトへ反映できるのはこの集計締切まで</b>です。締切後に未反映票が見つかった場合、自動確定は停止しますが、その票を遅れて追加することはできません。</p>
 <div class="tbl"><table>
 <tr><th>状況</th><th>どうなるか</th><th>必要な操作</th></tr>
 <tr><td>集計締切より前の、数分〜数時間の停止</td><td>復旧後、チェーン上の記録を基準に未反映票を再試行します。反映済みの NFT はコントラクトが二重計上しません</td><td>通常は<b>なし</b>。締切が近ければ警告を確認</td></tr>
 <tr><td>リレイヤーの不具合、またはリレイヤーのウォレットの<b>ガス代(ETH)切れ</b><br>(Snapshot での投票は通常どおり可能)</td><td>リレイヤー・返金プール・登録係の残高低下は Discord に⚠️警告が出ます。集計締切までに、公開された署名を使って第三者が代わりに投函することは可能ですが、現在の Snapshot モードの状況ページには、その投函を 1 ボタンで行う機能はありません</td><td>リレイヤーを復旧・補充。急ぐ場合の代理投函は開発者向けの操作</td></tr>
 <tr><td>Cloudflare が止まったまま集計締切を迎えた</td><td>全票が反映済みなら、状況ページや Etherscan から誰でも <code>execute</code> できます。未反映票が残る場合、Worker は自動確定を止めます。<code>execute</code> は未反映票を追加せず、その時点の部分集計を確定する操作なので、実行前に人の確認が必要です</td><td><b>技術的な操作と判断が必要</b>: 反映状況を確認し、必要なら従来の手動運用へ切り替える</td></tr>
 <tr><td>誰も実行しなかった</td><td>その提案について Nouns DAO への投票が行われません(＝いまの仕組みで投票し忘れたときと同じ結果)</td><td>—</td></tr>
 </table></div>
 <p style="font-size:14px">正直に言うと、最後の手段(Etherscan からの実行)は<b>どなたでも気軽に、とまでは言えません</b>。ウォレット操作に慣れた方であれば運営抜きでも実行できる、という位置づけです。大事なのは<b>「運営だけが持つ特権ではない」</b>ことです(手順書は用意します)。</p>
 
 <h3>Cloudflare の中身は検証できるのか(正直な答え)</h3>
 <p style="font-size:14.5px"><b>直接は検証できません。</b>Cloudflare 上で実際に動いているプログラムが、公開しているソースコードと同一であることを第三者が証明する方法はありません(これは世の中のあらゆるサーバーに共通の限界です)。<b>だからこそ、この設計はクラウドを信頼しないことを前提にしています</b>: クラウドは署名の投函、誰でも呼べる確定操作、通知を自動実行しますが、票の中身はオンチェーンのコントラクト(こちらは<b>ソースコードとの一致を誰でも検証可能</b>)が確かめます。クラウドの動きも外から観測はできます — 送信したトランザクションは全部チェーン上に残り、設定は公開 API(<a href="#verify">§10</a>)で見えます。<b>「中身は見えないが、票の偽造・改変はコントラクトが拒否し、運び漏れは公開データとの照合で検出する」</b>という位置づけです。</p>
 
 <h2 id="cost"><span class="no">7.</span>費用 — いまとの差分</h2>
 <div class="tbl"><table>
 <tr><th>項目</th><th>いまの仕組み</th><th>新しい仕組み</th></tr>
 <tr><td>メンバーの投票</td><td>0 円(署名のみ)</td><td><b>0 円</b>(同じ)</td></tr>
 <tr><td>Nouns DAO への投票のガス</td><td>Nouns の上限つき返金で大部分を補填</td><td><b>同じく Nouns の上限つき返金で大部分を補填</b></td></tr>
 <tr><td>投票をチェーンに記録するガス</td><td>—(記録していない)</td><td>提案 1 本あたり <b>約 9 円</b>(現在の相場)/ 約 140 円(混雑時)</td></tr>
 <tr><td>議案の対応付けのガス</td><td>—</td><td>提案 1 本あたり 約 1 円 / 約 22 円</td></tr>
 <tr><td>サーバー費用</td><td>0 円(自宅 PC)</td><td>0 円(Cloudflare 無料枠)</td></tr>
 <tr><td><b>年間の追加費用</b><br><span style="font-size:13px;color:var(--ink-2)">年 50〜110 本で試算(下記)</span></td><td>—</td><td><b><big>年 約 0.002〜0.004 ETH</big></b>(500〜1,100 円・現在の相場)<br>ガスが混雑し続けた場合で 約 0.03〜0.06 ETH(0.8〜1.8 万円)</td></tr>
 <tr><td>アールグレイの手作業<br><span style="font-size:13px;color:var(--ink-2)">締切の見張り・結果確認・Nouns への投票・結果報告</span></td><td>提案ごとに 10〜15 分<br>= <b>年 約 20〜28 時間</b><br><span style="font-size:13px;color:var(--ink-2)">直近 1 年の実績 111 本で試算。直近 3 ヶ月のペース(年 53 本)が続くなら約 9〜13 時間</span></td><td><b>通常時はほぼ 0 時間</b><br><span style="font-size:13px;color:var(--ink-2)">障害対応・監視と、日本語要約を別途作る場合の作業は含まない</span></td></tr>
 </table></div>
 <div class="card"><b>要するに</b>: 年 約 0.002〜0.004 ETH(500〜1,100 円)のガス代で、年 約 20〜28 時間ある定常作業の大部分と「投票し忘れ」のリスクを減らし、さらに「集計を誰でも検算できる」透明性を得る、というトレードオフです。</div>
 <p><b>ガス代の置き場所</b>: 投函ガスの返金原資については、<b>新しいコントラクト(pNouns Voter)自体がプールです</b>。コントラクトのアドレスに送った ETH がそのまま返金の原資になります。<b>原資の方針(提案)</b>: アールグレイが管理する現行の委任アドレスにガス代として <b>0.111 ETH</b> があるため、プール 0.05 ETH、リレイヤー 0.01 ETH、登録係 0.005 ETH の<b>計 0.065 ETH をここから配分</b>します(新たなトレジャリー支出は発生しません)。プールに預けた ETH は<b>管理者がいつでも全額回収できます</b>(詳細は下の「ガス代はどこから出て、誰の負担になるのか」)。</p>
 
 <h4 class="sub">試算に使った提案数(実測)</h4>
 <p style="margin-top:10px">pNouns の Snapshot に実際に立った提案数は、<b>直近 1 年で 111 本</b>、直近半年で 33 本(年 67 本ペース)、直近 3 ヶ月で 13 本(年 53 本ペース)でした。ガス代は<b>年 50〜110 本</b>の幅で、手作業の時間は<b>直近 1 年の実績 111 本 × 10〜15 分</b>で試算しています(提案ペースが下がれば両方とも比例して減ります)。円換算は 1 ETH ≒ 30 万円です。</p>
 
 
 <h4 class="sub">ガス代はどこから出て、誰の負担になるのか(お金の流れ)</h4>
 <p style="margin-top:10px">新しく増える費用は「投票をチェーンに記録するガス」と「議案の対応付けのガス」の 2 つです。前者は<b>pNouns Voter に預け入れる 0.05 ETH(約 1.5 万円)の返金プール</b>から投函者へ払い戻します。後者は返金対象ではなく、<b>登録係に持たせる 0.005 ETH</b>から支払います。また、リレイヤーには立て替え用として 0.01 ETH を持たせます。当初の合計配分 0.065 ETH は、委任アドレスにある 0.111 ETH から充てます(提案)。</p>
 <div class="flow c4">
   <div class="step"><span class="who">① 預け入れ</span><span class="pill chain">オンチェーン</span><b>委任アドレス → コントラクト</b><small>委任アドレス(ガス代 0.111 ETH 保有)からコントラクト自体へ 0.05 ETH を送金。これが原資。<b>最初に 1 回だけ</b>。</small></div>
   <div class="step"><span class="who">② 立て替え</span><span class="pill cloud">クラウド</span><b>リレイヤーがガスを払う</b><small>票を運ぶ送信料を、まずリレイヤーのウォレットが支払う。</small></div>
   <div class="step"><span class="who">③ 返金</span><span class="pill chain">オンチェーン</span><b>プール → リレイヤー</b><small>同じ処理の中で、立て替え分をプールから自動で返す。上限つき。</small></div>
diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
index 0b629da..64a1198 100644
--- a/relayer-cf/test/worker-tick.test.mjs
+++ b/relayer-cf/test/worker-tick.test.mjs
@@ -306,80 +306,95 @@ function submitHandlers(over = {}) {
     ...over,
   });
 }
 const hubWithVote = () => [hubProposal("https://nouns.wtf/vote/1"), { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
 const goodEnvelope = () => ({ data: { message: { from: VOTER_A, timestamp: TS, proposal: SNAP_ID, choice: 1, reason: "", app: "", metadata: "" } }, sig: "0x" + "11".repeat(65) });
 
 test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
   const writes = [];
   const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   const { kv, env } = setup(submitHandlers(), {}, wallet);
   F.hub = hubWithVote(); F.envelope = goodEnvelope();
   await tick(env);
   assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
   assert.equal(putsOf(kv, "snapsent:1").length, 1, "送信中レコードが保存される");
   assert.equal(putsOf(kv, "snapdrop").length, 0);
 });
 
 test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
   const writes = [];
   const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
   const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
   const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   F.hub = hubWithVote(); F.envelope = goodEnvelope();
   await tick(env);
   assert.equal(writes.length, 0, "投函しない");
   assert.equal(putsOf(kv, "snapdrop").length, 0, "transient なので drop に数えない");
 });
 
 test("実投函: 復号可能な恒久 revert(StaleVote)は drop に数える", async () => {
   const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   // StaleVote() = keccak256("StaleVote()")[0:4] = 0x93ff56e3。復号できていることを先に確認する
   // (第15回監査: 誤 selector だと「復号失敗 → 数える」で偶然パスし、復号成功時の挙動を証明できない)
   const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
   assert.equal(staleErr.data?.errorName, "StaleVote", "ABI で StaleVote が復号される");
   const revert = () => { throw staleErr; };
   const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   F.hub = hubWithVote(); F.envelope = goodEnvelope();
   await tick(env);
   assert.equal(putsOf(kv, "snapdrop:1").length, 1, "恒久 revert は従来どおり数える");
 });
 
 test("猶予境界: block == eligibleAt では投函が始まる", async () => {
   const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
   F.hub = hubWithVote(); F.envelope = goodEnvelope();
   await tick(env);
   assert.ok(F.hubCalls >= 2, "votes クエリに到達(off-by-one なし)");
 });
 
 test("第15回監査: 締切時に未反映の票が残っていれば mainnet は execute しない", async () => {
   const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
     NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
   // ハブは 3 名が投票、オンチェーン計上は 1 名、dead-letter なし → 2 名分が未反映
   const h = handlers({ __block: 196, tally: () => [[0n, 0n, 0n], [1n, 0n, 0n], false, 0] });
   // Snapshot は締切前に終了済み(過去の end)。未来だと timelineBad が先に止めてしまい防壁を検証できない
   const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
   {
     const { kv, env } = setup(h, mainnetEnv, wallet);
     F.hub = [pastProposal, { proposal: { votes: 3 } }];
     await tick(env);
     assert.ok(F.discordBodies.some((b) => b.includes("反映されていない票")), "警告が出る");
     assert.equal(putsOf(kv, "executed").length, 0, "mainnet は部分集計を確定しない");
   }
   // sepolia は警告のみで続行(確定される)
   {
     const { kv, env } = setup(h, {}, wallet);
     F.hub = [pastProposal, { proposal: { votes: 3 } }];
     await tick(env);
     assert.equal(putsOf(kv, "executed").length, 1, "テストネットは続行");
   }
   // 全票反映済み(hub 1 名 = 計上 1 名)なら mainnet でも確定する
   {
     const { kv, env } = setup(h, mainnetEnv, wallet);
     F.hub = [pastProposal, { proposal: { votes: 1 } }];
     await tick(env);
     assert.equal(putsOf(kv, "executed").length, 1, "未反映ゼロなら mainnet も確定する");
   }
 });
+
+test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
+  const writes = [];
+  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
+  const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
+  const { kv, env } = setup(submitHandlers({ eligibleAtBlock: () => 50n }), mainnetEnv, wallet); // 解禁済み
+  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
+  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] }];
+  F.envelope = goodEnvelope();
+  await tick(env);
+  assert.equal(writes.length, 0, "投函 tx を送らない");
+  assert.equal(kv.ops.filter(([op, k]) => op === "put" && k.includes("snapsent")).length, 0, "送信中レコードも作らない");
+  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
+});

codex
差分の主眼は、資料の断定を「通常の Worker 経路」と「permissionless な直接呼出し」に分けた点です。ここからは、文言だけでなく `snapshotVotesAccepted`、取消、`liveMode`、投函・`execute` の各 require 条件まで追って、残る過不足を判定します。
exec
/bin/bash -lc "rg -n \"なぜ長い猶予|短縮の代償|多くの場合|停止スイッチ|数分|誤登録|snapshotVotesAccepted|cancel|unregister|remove|setLiveMode|liveMode|eligibleAtBlock|RegistrationTooRecent|castSnapshotVotes|function execute|linkOk|linkwarn\" docs/member-proposal-unified.html docs/RUNBOOK-MAINNET.md docs/audit-16-codex-raw.md contracts relayer-cf/src relayer-cf/test --glob '"'!**/node_modules/**'"'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
docs/RUNBOOK-MAINNET.md:23:## 2. デプロイ (liveMode=false で開始)
docs/RUNBOOK-MAINNET.md:33:- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
docs/RUNBOOK-MAINNET.md:37:- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
docs/RUNBOOK-MAINNET.md:57:mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/RUNBOOK-MAINNET.md:76:## 5. シャドー運用 (liveMode=false)
docs/RUNBOOK-MAINNET.md:89:3. owner(当初は委任アドレス)から `setLiveMode(true)`(マルチシグ移管後は マルチシグから)
docs/RUNBOOK-MAINNET.md:102:1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
docs/RUNBOOK-MAINNET.md:107:6. 誤登録が原因なら、票が入る前に `unregisterProposal`
docs/RUNBOOK-MAINNET.md:115:- 誤登録の疑い: **解禁前、または解禁後でも `snapshotVotesAccepted == 0` の間**は registrar/owner から
docs/RUNBOOK-MAINNET.md:116:  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
docs/RUNBOOK-MAINNET.md:118:  `setLiveMode(false)` + 当該議案は手動投票へ
docs/RUNBOOK-MAINNET.md:119:- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
docs/member-proposal-unified.html:288:  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 旧案には<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という、通常運用でも起こり得る副作用がありました。一方、誤登録への守りは短縮後も次のとおり働きます — 自動検算が食い違いを検出している間、<b>通常の自動処理は誤った対応表へ票を流さない</b>ため、多くの場合は取消・登録し直しが可能なままです。比較の結果、<b>投票の反映を速くする(NFT の窓をなくす)ことを優先し、対応しきれない誤登録は「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針としました。</p>
docs/member-proposal-unified.html:289:  <p style="margin:0 0 6px;font-size:14px"><b>短縮の代償(正直な限界)</b>: 票の投函は誰でも実行できる操作(クラウド障害時の救済経路)なので、<b>悪意の第三者が解禁(約 2 分)後に公開署名を直接投函すると、自動検算が止めていても対応表はその時点で取消不能になります</b>(旧 24 時間案は、この最初の窓をコントラクトの仕様として防いでいました)。この場合も含め、誤った投票が Nouns DAO に確定するのを防ぐ最後の砦は<b>管理者による停止</b>です — 検算の警告は数分で出るため、登録が締切間際でない限り、管理者には通常は数日の対応時間があります。停止スイッチは仕組み全体に効くため、停止中は他の議案の自動投票も一時止まります(当該議案の終了後に再開します)。</p>
docs/member-proposal-unified.html:311:<p style="font-size:14.5px"><b>基本ルールは 1 つだけ</b>: 票は「コントラクトが計上する瞬間の持ち主」で計算されます。<b>投票したら、反映が済むまで(通常は数分)NFT を動かさないでください</b>。反映は投票の数分後に自動で行われます(投票開始の直後だけ、約 2 分の受付前間隔(§3 の備え 1)のぶん待ちが加わります)。</p>
docs/member-proposal-unified.html:336:<tr><td>集計締切より前の、数分〜数時間の停止</td><td>復旧後、チェーン上の記録を基準に未反映票を再試行します。反映済みの NFT はコントラクトが二重計上しません</td><td>通常は<b>なし</b>。締切が近ければ警告を確認</td></tr>
docs/member-proposal-unified.html:387:    <li><b>実際の画面からの投票</b>: アールグレイが snapshot.box から普段どおり投票し、保有枚数分が集計されて Nouns DAO へ自動投票されることを確認。</li>
docs/member-proposal-unified.html:426:  <li>マルチシグが投票権の委任先をコントラクトへ変更(1 トランザクション・いつでも戻せる)し、委任を機械確認した後、当初の管理者である委任アドレスが <code>setLiveMode(true)</code> を実行して本番開始。</li>
docs/member-proposal-unified.html:430:<div class="card warn">やめたくなったら、マルチシグが委任を戻すだけで元の手動運用に戻せます(Nouns の仕様上、切り戻しは以後の提案から有効。進行中の提案は管理者が停止スイッチで止められます)。</div>
docs/member-proposal-unified.html:476:  → 上記ソースの castSnapshotVotes() / _castVote() を読む。
docs/member-proposal-unified.html:482:  → ソースの registerProposal() で eligibleAtBlock = block.number + registrationDelayBlocks、
docs/member-proposal-unified.html:483:    unregisterProposal() は snapshotVotesAccepted != 0 なら revert、
docs/member-proposal-unified.html:484:    setRegistrationDelayBlocks() が既登録の eligibleAtBlock に影響しないことを確認。
docs/member-proposal-unified.html:488:  → ソースの onlyOwner 関数を列挙する。setExcluded / setMarginBlocks / setLiveMode /
docs/member-proposal-unified.html:492:    (registerProposal / unregisterProposal は owner も呼べるが、猶予と取消不能条件は §3 のとおり)
docs/audit-16-codex-raw.md:24:   - 第13回の「猶予中の票が dead-letter 化される」対策(eligibleAtBlock ゲート +
docs/audit-16-codex-raw.md:25:     RegistrationTooRecent の transient 扱い)は delay=10 でも正しく機能するか。
docs/audit-16-codex-raw.md:27:     (ゲートが効かず RegistrationTooRecent が出ても transient 扱いで票を失わないか)
docs/audit-16-codex-raw.md:30:     厳密には保証されない場合、実質どうなるか(linkOk ゲートは毎 tick 投函前に
docs/audit-16-codex-raw.md:65:    - 放棄: 自動検算をすり抜ける誤登録への「人が気づいて登録し直す」時間
docs/audit-16-codex-raw.md:92:+票が減る窓」(日常的)を解消する代わりに、「自動検算をすり抜ける誤登録に対する
docs/audit-16-codex-raw.md:118:+- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
docs/audit-16-codex-raw.md:156:-  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「7,200 ブロック(約 24 時間)の受付停止」がなぜ備えになるのか</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>にしてあります(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。裏を返すと<b>「票を受け付けていない時間」＝「間違えてもやり直せる時間」</b>です。7,200 ブロックの空白を置くことで、誤登録に気づいて登録し直す余地を確保しています。受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。なお猶予中にメンバーが投票しても問題ありません — 票は Snapshot に残り、猶予が明けてから自動で反映されます(テスト済み)。</p>
docs/audit-16-codex-raw.md:159:+  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
docs/audit-16-codex-raw.md:167:-<p style="font-size:14.5px"><b>基本ルールは 1 つだけ</b>: 票は「コントラクトが計上する瞬間の持ち主」で計算されます。<b>投票したら、反映が済むまで NFT を動かさないでください</b>。反映は通常<b>投票の数分後</b>、例外として提案の登録から 24 時間の猶予中(§3 の備え 1)に入れた票は<b>猶予明けにまとめて反映</b>されます(投票開始直後に投票すると、反映まで最大 24 時間ほど空きます)。</p>
docs/audit-16-codex-raw.md:168:+<p style="font-size:14.5px"><b>基本ルールは 1 つだけ</b>: 票は「コントラクトが計上する瞬間の持ち主」で計算されます。<b>投票したら、反映が済むまで(通常は数分)NFT を動かさないでください</b>。反映は投票の数分後に自動で行われます(投票開始の直後だけ、約 2 分の受付前間隔(§3 の備え 1)のぶん待ちが加わります)。</p>
docs/audit-16-codex-raw.md:176:-【主張3】対応表の誤登録に 7200 ブロック(約 24 時間)の取消猶予がある(本番設定)
docs/audit-16-codex-raw.md:178:   → ソースの registerProposal() で eligibleAtBlock = block.number + registrationDelayBlocks、
docs/audit-16-codex-raw.md:179:     unregisterProposal() は snapshotVotesAccepted != 0 なら revert、
docs/audit-16-codex-raw.md:180:     setRegistrationDelayBlocks() が既登録の eligibleAtBlock に影響しないことを確認。
docs/audit-16-codex-raw.md:185:   → ソースの onlyOwner 関数を列挙する。setExcluded / setMarginBlocks / setLiveMode /
docs/audit-16-codex-raw.md:195:+    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
docs/audit-16-codex-raw.md:274: // mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
docs/audit-16-codex-raw.md:303:/bin/bash -lc 'rg -n "H02R|第8回|第13回|第15回|eligibleAt|RegistrationTooRecent|graceBad|linkOk|registrationDelay|drain|deadline|cron" docs relayer-cf/src relayer-cf/test contracts test scripts | head -n 500' in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:305:test/snap.fork.test.js:220:      await expect(voterC.castSnapshotVotes([snapVoteArg(ve, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:306:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:307:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:308:test/snap.fork.test.js:241:      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:309:test/snap.fork.test.js:242:      await expect(voterC.castVote(777777, 0, [1n])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:310:test/snap.fork.test.js:245:      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.not.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:311:test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
docs/audit-16-codex-raw.md:312:test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:313:test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
docs/audit-16-codex-raw.md:314:test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:316:test/snap.fork.test.js:279:      await expect(voterC.connect(frank).castVote(888888, 1, [fid])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:318:docs/RUNBOOK-MAINNET.md:117:- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
docs/audit-16-codex-raw.md:322:relayer-cf/test/worker-tick.test.mjs:95:    eligibleAtBlock: () => 50n,
docs/audit-16-codex-raw.md:323:relayer-cf/test/worker-tick.test.mjs:135:test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
docs/audit-16-codex-raw.md:328:relayer-cf/test/worker-tick.test.mjs:232:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
docs/audit-16-codex-raw.md:330:relayer-cf/test/worker-tick.test.mjs:288:  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
docs/audit-16-codex-raw.md:331:relayer-cf/test/worker-tick.test.mjs:323:test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
docs/audit-16-codex-raw.md:332:relayer-cf/test/worker-tick.test.mjs:326:  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
docs/audit-16-codex-raw.md:335:relayer-cf/test/worker-tick.test.mjs:350:  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
docs/audit-16-codex-raw.md:354:relayer-cf/src/worker.js:253:      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:355:relayer-cf/src/worker.js:259:          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:360:relayer-cf/src/worker.js:490:      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:361:relayer-cf/src/worker.js:511:        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:372:relayer-cf/src/worker.js:549:            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
docs/audit-16-codex-raw.md:378:docs/qwen-review-2026-08-21.md:89:if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert ...;
docs/audit-16-codex-raw.md:380:docs/qwen-review-2026-08-21.md:172:**d. 登録猶予(eligibleAtBlock)は登録時に確定し、owner が後から短縮できない**
docs/audit-16-codex-raw.md:381:docs/qwen-review-2026-08-21.md:175:`registerProposal` 内で `eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks` が一度だけ書かれ、以降 `eligibleAtBlock` を上書きする関数は存在しない。`setRegistrationDelayBlocks` は `registrationDelayBlocks`(将来の登録用)のみ変更し、既存提案の `eligibleAtBlock` には影響しない(コメントにも明記)。
docs/audit-16-codex-raw.md:385:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:386:contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
docs/audit-16-codex-raw.md:389:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:391:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:392:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:393:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:394:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:402:docs/member-proposal-unified.html:481:  → ソースの registerProposal() で eligibleAtBlock = block.number + registrationDelayBlocks、
docs/audit-16-codex-raw.md:403:docs/member-proposal-unified.html:483:    setRegistrationDelayBlocks() が既登録の eligibleAtBlock に影響しないことを確認。
docs/audit-16-codex-raw.md:418:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:421:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:422:relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:423:scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:424:scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:435:docs/audit-12-codex-raw.md:73:  含まれると notifyError → return (fail-closed)。ABI に owner/registrar/eligibleAtBlock を追加。
docs/audit-16-codex-raw.md:436:docs/audit-12-codex-raw.md:82:- ABI 追加分 (owner/registrar/eligibleAtBlock) の型・シグネチャはコントラクトと一致するか。
docs/audit-16-codex-raw.md:437:docs/audit-12-codex-raw.md:136:      eligibleAtBlock を追加)
docs/audit-16-codex-raw.md:438:docs/audit-12-codex-raw.md:157: **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:439:docs/audit-12-codex-raw.md:173:+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:441:docs/audit-12-codex-raw.md:237:     const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:442:docs/audit-12-codex-raw.md:238:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:449:docs/audit-12-codex-raw.md:368:         const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:453:docs/audit-12-codex-raw.md:435:/bin/bash -lc "rg -n \"function recentProposals|recentProposals\\(|function maybeExecute|maybeExecute\\(|function metagovInfo|metagovInfo\\(|MAINNET_PROPOSER_MNEMONIC|REGISTRAR_MNEMONIC|eligibleAtBlock|function owner|function registrar|registrationDelayBlocks|function proposals|state ===|state "'!==" relayer-cf scripts contracts test hardhat.config.* .env.example README.md docs --glob '"'"'!docs/audit-11-codex-raw.md'"'" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:454:docs/audit-12-codex-raw.md:439:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:455:docs/audit-12-codex-raw.md:440:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:456:docs/audit-12-codex-raw.md:441:test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
docs/audit-16-codex-raw.md:457:docs/audit-12-codex-raw.md:442:test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:458:docs/audit-12-codex-raw.md:443:test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
docs/audit-16-codex-raw.md:459:docs/audit-12-codex-raw.md:444:test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:460:docs/audit-12-codex-raw.md:450:docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:461:docs/audit-12-codex-raw.md:451:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:462:docs/audit-12-codex-raw.md:452:docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:463:docs/audit-12-codex-raw.md:453:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:464:docs/audit-12-codex-raw.md:454:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:465:docs/audit-12-codex-raw.md:456:docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:468:docs/audit-12-codex-raw.md:461:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:471:docs/audit-12-codex-raw.md:464:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:473:docs/audit-12-codex-raw.md:466:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:474:docs/audit-12-codex-raw.md:467:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:475:docs/audit-12-codex-raw.md:468:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:476:docs/audit-12-codex-raw.md:469:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:478:docs/audit-12-codex-raw.md:473:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:481:docs/audit-12-codex-raw.md:480:scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:482:docs/audit-12-codex-raw.md:481:scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:483:docs/audit-12-codex-raw.md:482:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:489:docs/audit-12-codex-raw.md:514:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:504:docs/audit-12-codex-raw.md:1060:   436	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:505:docs/audit-12-codex-raw.md:1081:   457	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:510:docs/audit-12-codex-raw.md:1227:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:511:docs/audit-12-codex-raw.md:1228:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:512:docs/audit-12-codex-raw.md:1312:   440	  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:516:docs/audit-12-codex-raw.md:1366:    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:519:docs/audit-12-codex-raw.md:1410:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:521:docs/audit-12-codex-raw.md:1428:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:522:docs/audit-12-codex-raw.md:1441:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:523:docs/audit-12-codex-raw.md:1463:   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:524:docs/audit-12-codex-raw.md:1490:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:532:docs/audit-12-codex-raw.md:1776:   436	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:533:docs/audit-12-codex-raw.md:1797:   457	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:538:docs/audit-12-codex-raw.md:1899:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:539:docs/audit-12-codex-raw.md:1900:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:540:docs/audit-12-codex-raw.md:1954:   440	  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:564:docs/audit-12-codex-raw.md:2319:   421	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:565:docs/audit-12-codex-raw.md:2330:   432	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:570:docs/audit-12-codex-raw.md:2424:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:571:docs/audit-12-codex-raw.md:2425:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:574:docs/audit-12-codex-raw.md:2747:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-16-codex-raw.md:576:docs/audit-12-codex-raw.md:2946:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-16-codex-raw.md:589:relayer-cf/src/chain.js:181:      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-16-codex-raw.md:595:relayer-cf/src/abi.js:3:// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
docs/audit-16-codex-raw.md:596:relayer-cf/src/abi.js:27: {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
docs/audit-16-codex-raw.md:597:relayer-cf/src/abi.js:470:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:599:docs/audit-11-codex-raw.md:59:4. **[前回 Medium] `eligibleAtBlock`** (`contracts/PNounsSnapVoter.sol`): 登録時確定の
docs/audit-16-codex-raw.md:600:docs/audit-11-codex-raw.md:61:   猶予が正しくリセットされるか**、`eligibleAtBlock` が 0 のままになる経路
docs/audit-16-codex-raw.md:603:docs/audit-11-codex-raw.md:97:/bin/bash -lc "git log --oneline -5 && git status --short && rg -n \"mappingsResolved|announceNew|referencesNounsProposal|eligibleAtBlock|notify\\(|InvalidSpace|registrationDelayBlocks|VOTER|liveMode|refundEnabled|registrar|excluded\" docs/AUDIT-RESPONSE-2026-08-18.md docs/audit-10-codex-raw.md relayer-cf contracts test scripts hardhat.config.* 2>/dev/null" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:604:docs/audit-11-codex-raw.md:106:docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:605:docs/audit-11-codex-raw.md:107:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:606:docs/audit-11-codex-raw.md:108:docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:607:docs/audit-11-codex-raw.md:111:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:608:docs/audit-11-codex-raw.md:114:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:609:docs/audit-11-codex-raw.md:116:docs/audit-10-codex-raw.md:55:`announceNew()` は `linkOk` 判定より先に実行されます。不一致 mapping の最初の tick では、
docs/audit-16-codex-raw.md:610:docs/audit-11-codex-raw.md:117:docs/audit-10-codex-raw.md:68:- `announceNew()` を `linkOk` と timeline 検証の後へ移動する。
docs/audit-16-codex-raw.md:612:docs/audit-11-codex-raw.md:119:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:613:docs/audit-11-codex-raw.md:123:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:614:docs/audit-11-codex-raw.md:124:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:617:docs/audit-11-codex-raw.md:132:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:618:docs/audit-11-codex-raw.md:135:scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:619:docs/audit-11-codex-raw.md:136:scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:624:docs/audit-11-codex-raw.md:165:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:627:docs/audit-11-codex-raw.md:177:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:629:docs/audit-11-codex-raw.md:181:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:630:docs/audit-11-codex-raw.md:183:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:631:docs/audit-11-codex-raw.md:184:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:632:docs/audit-11-codex-raw.md:185:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:636:docs/audit-11-codex-raw.md:217:relayer-cf/src/snap.js:97:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:638:docs/audit-11-codex-raw.md:250:      (snapInfo=null により linkOk / timeline チェックが素通りし、部分集計や
docs/audit-16-codex-raw.md:639:docs/audit-11-codex-raw.md:260:    - eligibleAtBlock を登録時に確定。owner が後から registrationDelayBlocks
docs/audit-16-codex-raw.md:641:docs/audit-11-codex-raw.md:288:+    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:642:docs/audit-11-codex-raw.md:295:     error RegistrationTooRecent();
docs/audit-16-codex-raw.md:643:docs/audit-11-codex-raw.md:312:+    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:645:docs/audit-11-codex-raw.md:322:+        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:646:docs/audit-11-codex-raw.md:330:+        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:647:docs/audit-11-codex-raw.md:338:-        if (block.number < registeredAtBlock[nounsId] + registrationDelayBlocks) revert RegistrationTooRecent(); // 誤登録の取消猶予
docs/audit-16-codex-raw.md:648:docs/audit-11-codex-raw.md:339:+        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:649:docs/audit-11-codex-raw.md:347:-        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < registeredAtBlock[nounsProposalId] + registrationDelayBlocks) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:650:docs/audit-11-codex-raw.md:348:+        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:651:docs/audit-11-codex-raw.md:386:-    const linkOk = needle.test(String(m.discussion || "")) || needle.test(String(m.body || ""));
docs/audit-16-codex-raw.md:652:docs/audit-11-codex-raw.md:390:+    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:653:docs/audit-11-codex-raw.md:391:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:658:docs/audit-11-codex-raw.md:470:+      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:659:docs/audit-11-codex-raw.md:483:-        if (c.snapshotSpace && snapInfo && snapInfo.linkOk === false) {
docs/audit-16-codex-raw.md:660:docs/audit-11-codex-raw.md:489:+        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:664:docs/audit-11-codex-raw.md:581:+      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:665:docs/audit-11-codex-raw.md:585:+      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:666:docs/audit-11-codex-raw.md:588:+      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:667:docs/audit-11-codex-raw.md:589:+      await expect(voterC.castVote(777777, 0, [1n])).to.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:668:docs/audit-11-codex-raw.md:592:+      await expect(voterC.castSnapshotVotes([snapVoteArg(vz, [1n])])).to.not.be.revertedWithCustomError(voterC, "RegistrationTooRecent");
docs/audit-16-codex-raw.md:670:docs/audit-11-codex-raw.md:610:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:671:docs/audit-11-codex-raw.md:614:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:672:docs/audit-11-codex-raw.md:621:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:683:docs/audit-11-codex-raw.md:1042:      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:684:docs/audit-11-codex-raw.md:1053:        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:689:docs/audit-11-codex-raw.md:1188:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:690:docs/audit-11-codex-raw.md:1189:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:693:docs/audit-11-codex-raw.md:1273:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:695:docs/audit-11-codex-raw.md:1291:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:696:docs/audit-11-codex-raw.md:1304:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:697:docs/audit-11-codex-raw.md:1360:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:698:docs/audit-11-codex-raw.md:1387:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:704:docs/audit-11-codex-raw.md:1420:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-16-codex-raw.md:705:docs/audit-11-codex-raw.md:1437:したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。
docs/audit-16-codex-raw.md:706:docs/audit-11-codex-raw.md:1471:`announceNew()` は `linkOk` 判定より先に実行されます。不一致 mapping の最初の tick では、
docs/audit-16-codex-raw.md:707:docs/audit-11-codex-raw.md:1484:- `announceNew()` を `linkOk` と timeline 検証の後へ移動する。
docs/audit-16-codex-raw.md:709:docs/audit-11-codex-raw.md:1526:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:720:docs/audit-11-codex-raw.md:2039:   421	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:721:docs/audit-11-codex-raw.md:2050:   432	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:726:docs/audit-11-codex-raw.md:2151:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:727:docs/audit-11-codex-raw.md:2152:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:740:docs/audit-11-codex-raw.md:2520:   421	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:741:docs/audit-11-codex-raw.md:2531:   432	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:749:docs/audit-11-codex-raw.md:2912:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:751:docs/audit-11-codex-raw.md:2930:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:752:docs/audit-11-codex-raw.md:2943:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:753:docs/audit-11-codex-raw.md:2999:   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:754:docs/audit-11-codex-raw.md:3026:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:762:docs/audit-11-codex-raw.md:3112:    第10回監査の修正(eligibleAtBlock / InvalidSpace)と、前回未反映だった
docs/audit-16-codex-raw.md:764:docs/audit-11-codex-raw.md:3123:    - eligibleAtBlock が登録時に確定し、owner が delay を 0 に下げても不変
docs/audit-16-codex-raw.md:765:docs/audit-11-codex-raw.md:3124:    - 猶予中の castVote は RegistrationTooRecent、猶予明けは通過
docs/audit-16-codex-raw.md:766:docs/audit-11-codex-raw.md:3126:    E2E スクリプト(13/14)が eligibleAtBlock の明けを待つように修正。
docs/audit-16-codex-raw.md:767:docs/audit-11-codex-raw.md:3165:+  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:768:docs/audit-11-codex-raw.md:3166:+  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:769:docs/audit-11-codex-raw.md:3180:+  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:776:docs/audit-11-codex-raw.md:3242:./docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:777:docs/audit-11-codex-raw.md:3245:./docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:796:docs/audit-11-codex-raw.md:3286:./docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-16-codex-raw.md:819:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:862:    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
docs/audit-16-codex-raw.md:988:    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:992:      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:995:        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:998:          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:1008:      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:1015:    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
docs/audit-16-codex-raw.md:1016:    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
docs/audit-16-codex-raw.md:1017:    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
docs/audit-16-codex-raw.md:1095:        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
docs/audit-16-codex-raw.md:1103:  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
docs/audit-16-codex-raw.md:1180:      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:1200:        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:1201:        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:1202:        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
docs/audit-16-codex-raw.md:1205:          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
docs/audit-16-codex-raw.md:1239:            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
docs/audit-16-codex-raw.md:1303:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
docs/audit-16-codex-raw.md:1359:  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
docs/audit-16-codex-raw.md:1389:  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
docs/audit-16-codex-raw.md:1394:test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
docs/audit-16-codex-raw.md:1397:  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
docs/audit-16-codex-raw.md:1398:  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
docs/audit-16-codex-raw.md:1410:  const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
docs/audit-16-codex-raw.md:1421:  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
docs/audit-16-codex-raw.md:1461:    error RegistrationTooRecent();
docs/audit-16-codex-raw.md:1491:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
docs/audit-16-codex-raw.md:1493:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:1511:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:1515:    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
docs/audit-16-codex-raw.md:1516:    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:1520:        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:1524:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:1574:    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
docs/audit-16-codex-raw.md:1580:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:1598:        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:1607:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:1697:   490	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:1717:   510	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:1718:   511	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:1719:   512	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
docs/audit-16-codex-raw.md:1722:   515	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
docs/audit-16-codex-raw.md:1756:   549	            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
docs/audit-16-codex-raw.md:1828:   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:1832:   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:1835:   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:1838:   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:1848:   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:1864:    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
docs/audit-16-codex-raw.md:1926:   232	    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
docs/audit-16-codex-raw.md:1982:   288	  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
docs/audit-16-codex-raw.md:2012:   318	  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
docs/audit-16-codex-raw.md:2017:   323	test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
docs/audit-16-codex-raw.md:2020:   326	  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
docs/audit-16-codex-raw.md:2021:   327	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
docs/audit-16-codex-raw.md:2033:   339	  const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
docs/audit-16-codex-raw.md:2044:   350	  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
docs/audit-16-codex-raw.md:2144:境界の中心点が見えてきました。Worker 自身は各 tick で `linkOk` を投函より先に評価しますが、10 ブロックと 2 分 cron の関係だけでは「解禁前に別 tick が必ず来る」とは言えず、さらにコントラクトの投函関数は permissionless です。この差を、停止手段まで含めて精査しています。
docs/audit-16-codex-raw.md:2146:/bin/bash -lc 'rg -n "liveMode|function execute|setLiveMode|manual|手動運用|従来の手動" contracts/PNounsSnapVoter.sol docs/RUNBOOK-MAINNET.md docs/member-proposal-unified.html docs/AUDIT-RESPONSE-2026-08-18.md; git show 1be9d16 --; git show c7aecd6 --; git show --format=fuller 3e02162 -- relayer-cf/src/worker.js relayer-cf/src/chain.js docs/AUDIT-RESPONSE-2026-08-18.md' in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:2148:docs/AUDIT-RESPONSE-2026-08-18.md:12:| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
docs/audit-16-codex-raw.md:2149:docs/AUDIT-RESPONSE-2026-08-18.md:13:| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
docs/audit-16-codex-raw.md:2150:docs/AUDIT-RESPONSE-2026-08-18.md:25:| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
docs/audit-16-codex-raw.md:2151:docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:2152:docs/AUDIT-RESPONSE-2026-08-18.md:183:| `liveMode` / `refundEnabled` | true / true | 意図どおり |
docs/audit-16-codex-raw.md:2153:docs/AUDIT-RESPONSE-2026-08-18.md:231:| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/audit-16-codex-raw.md:2154:docs/AUDIT-RESPONSE-2026-08-18.md:275:| - | 記録 | graceBad の提案は unregister → 再登録では回復しない(猶予が再カウント) | RUNBOOK §8 に手動運用への切替を明記 |
docs/audit-16-codex-raw.md:2157:docs/member-proposal-unified.html:288:  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
docs/audit-16-codex-raw.md:2160:docs/member-proposal-unified.html:425:  <li>マルチシグが投票権の委任先をコントラクトへ変更(1 トランザクション・いつでも戻せる)し、委任を機械確認した後、当初の管理者である委任アドレスが <code>setLiveMode(true)</code> を実行して本番開始。</li>
docs/audit-16-codex-raw.md:2161:docs/member-proposal-unified.html:429:<div class="card warn">やめたくなったら、マルチシグが委任を戻すだけで元の手動運用に戻せます(Nouns の仕様上、切り戻しは以後の提案から有効。進行中の提案は管理者が停止スイッチで止められます)。</div>
docs/audit-16-codex-raw.md:2162:docs/member-proposal-unified.html:487:  → ソースの onlyOwner 関数を列挙する。setExcluded / setMarginBlocks / setLiveMode /
docs/audit-16-codex-raw.md:2163:contracts/PNounsSnapVoter.sol:36: *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
docs/audit-16-codex-raw.md:2164:contracts/PNounsSnapVoter.sol:64:    bool public liveMode;
docs/audit-16-codex-raw.md:2165:contracts/PNounsSnapVoter.sol:169:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
docs/audit-16-codex-raw.md:2166:contracts/PNounsSnapVoter.sol:362:    function execute(uint256 proposalId) external nonReentrant {
docs/audit-16-codex-raw.md:2167:contracts/PNounsSnapVoter.sol:370:        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
docs/audit-16-codex-raw.md:2168:docs/RUNBOOK-MAINNET.md:23:## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:2169:docs/RUNBOOK-MAINNET.md:33:- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
docs/audit-16-codex-raw.md:2170:docs/RUNBOOK-MAINNET.md:37:- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:2171:docs/RUNBOOK-MAINNET.md:57:mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/audit-16-codex-raw.md:2172:docs/RUNBOOK-MAINNET.md:76:## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:2174:docs/RUNBOOK-MAINNET.md:89:3. owner(当初は委任アドレス)から `setLiveMode(true)`(マルチシグ移管後は マルチシグから)
docs/audit-16-codex-raw.md:2175:docs/RUNBOOK-MAINNET.md:102:1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
docs/audit-16-codex-raw.md:2186:      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-16-codex-raw.md:2189:      RegistrationTooRecent は一括・個別とも数えない、の二重防御。
docs/audit-16-codex-raw.md:2199:      live 前は liveMode=false 要求。runbook を段階照合に書き換え、
docs/audit-16-codex-raw.md:2229:+| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/audit-16-codex-raw.md:2232:+| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/audit-16-codex-raw.md:2247: ## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:2260:-- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:2263:+- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:2285:+mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/audit-16-codex-raw.md:2292: 3. マルチシグから `setLiveMode(true)`
docs/audit-16-codex-raw.md:2299:-- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
docs/audit-16-codex-raw.md:2302:+1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
docs/audit-16-codex-raw.md:2307:+6. 誤登録が原因なら、票が入る前に `unregisterProposal`
docs/audit-16-codex-raw.md:2383:+   - liveMode=false で開始 → シャドー → 委任 → liveMode=true の順序で、
docs/audit-16-codex-raw.md:2662:+      ハブ正常0件+登録済み=unresolved 停止と KV write 抑制 / linkOk=false で
docs/audit-16-codex-raw.md:2669:+    - docs/RUNBOOK-MAINNET.md: 鍵 4 役の分離、liveMode=false 開始 →
docs/audit-16-codex-raw.md:2670:+      機械照合 → シャドー → 委任 → liveMode=true の順序固定、ロールバック手順
docs/audit-16-codex-raw.md:2712:++## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:2721:++- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:2748:++## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:2759:++3. マルチシグから `setLiveMode(true)`
docs/audit-16-codex-raw.md:2765:++- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
docs/audit-16-codex-raw.md:2773:++- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:2915:++    liveMode: () => true,
docs/audit-16-codex-raw.md:2955:++test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
docs/audit-16-codex-raw.md:2959:++  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
docs/audit-16-codex-raw.md:3068:++  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
docs/audit-16-codex-raw.md:3085:++  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:3086:++    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:3093:++  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
docs/audit-16-codex-raw.md:3191:++  try { await v.setLiveMode.staticCall(true); } catch { rejected = true; } // 旧オーナー(deployer)は拒否されること
docs/audit-16-codex-raw.md:3215:+ℹ cancelled 0
docs/audit-16-codex-raw.md:3328:+    89	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
docs/audit-16-codex-raw.md:3341:+    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:3508:+    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
docs/audit-16-codex-raw.md:3582:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:3583:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:3666:+    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
docs/audit-16-codex-raw.md:3758:+   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
docs/audit-16-codex-raw.md:3772:+   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
docs/audit-16-codex-raw.md:3851:+   241	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:3856:+   246	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:3869:+   259	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:3876:+   266	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
docs/audit-16-codex-raw.md:3877:+   267	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
docs/audit-16-codex-raw.md:3878:+   268	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
docs/audit-16-codex-raw.md:3956:+   346	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
docs/audit-16-codex-raw.md:3964:+   354	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
docs/audit-16-codex-raw.md:4084:+   474	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:4104:+   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:4105:+   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:4106:+   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
docs/audit-16-codex-raw.md:4109:+   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
docs/audit-16-codex-raw.md:4193:+    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
docs/audit-16-codex-raw.md:4285:+   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
docs/audit-16-codex-raw.md:4299:+   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
docs/audit-16-codex-raw.md:4383:+   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:4384:+   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:4385:+   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
docs/audit-16-codex-raw.md:4388:+   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
docs/audit-16-codex-raw.md:4521:+    92	    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
docs/audit-16-codex-raw.md:4713:+   241	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:4718:+   246	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:4731:+   259	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:4738:+   266	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
docs/audit-16-codex-raw.md:4739:+   267	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
docs/audit-16-codex-raw.md:4740:+   268	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
docs/audit-16-codex-raw.md:4934:+    91	    liveMode: () => true,
docs/audit-16-codex-raw.md:4974:+   131	test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
docs/audit-16-codex-raw.md:4978:+   135	  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
docs/audit-16-codex-raw.md:5142:+rg -n \"cron|triggers|CRON_SEC|MIN_REGISTRATION_DELAY|REG_DELAY|MARGIN|liveMode|excluded|setExcluded|treasury|delegate|deploy-snapvoter\" relayer-cf/wrangler.toml docs/RUNBOOK-MAINNET.md scripts contracts test deployments -g '"'!docs/audit-12-codex-raw.md'"' -g '"'!docs/AUDIT-RESPONSE-2026-08-18.md'"'" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:5151:+docs/RUNBOOK-MAINNET.md:23:## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:5155:+docs/RUNBOOK-MAINNET.md:32:- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:5156:+docs/RUNBOOK-MAINNET.md:59:## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:5163:+contracts/PNounsVoter.sol:29: *  - liveMode=false のあいだは Nouns DAO を呼ばず結果イベントだけ出す(シャドー運用用。executed は立てないので、
docs/audit-16-codex-raw.md:5164:+contracts/PNounsVoter.sol:30: *    後で liveMode=true にすれば同じ提案を本投票できる)。
docs/audit-16-codex-raw.md:5167:+contracts/PNounsVoter.sol:65:    bool public liveMode;
docs/audit-16-codex-raw.md:5174:+contracts/PNounsVoter.sol:151:        liveMode = live;
docs/audit-16-codex-raw.md:5176:+contracts/PNounsVoter.sol:329:    /// @notice 締切後に誰でも呼べる。結果を Nouns DAO に投票する(liveMode 時)。ガスは Nouns の refund で執行者に戻る。
docs/audit-16-codex-raw.md:5177:+contracts/PNounsVoter.sol:339:        if (!liveMode) {
docs/audit-16-codex-raw.md:5178:+contracts/PNounsVoter.sol:340:            // シャドー運用: 結果イベントだけ出し、executed は立てない(後で liveMode=true にすれば本投票できる)
docs/audit-16-codex-raw.md:5179:+contracts/PNounsSnapVoter.sol:36: *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
docs/audit-16-codex-raw.md:5181:+contracts/PNounsSnapVoter.sol:64:    bool public liveMode;
docs/audit-16-codex-raw.md:5185:+contracts/PNounsSnapVoter.sol:169:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
docs/audit-16-codex-raw.md:5187:+contracts/PNounsSnapVoter.sol:370:        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
docs/audit-16-codex-raw.md:5201:+test/fork.e2e.test.js:268:  it("シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ", async function () {
docs/audit-16-codex-raw.md:5202:+test/fork.e2e.test.js:277:    // liveMode に戻せば同じ提案を本投票できる
docs/audit-16-codex-raw.md:5203:+scripts/check-deploy.mjs:26:  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
docs/audit-16-codex-raw.md:5206:+scripts/check-deploy.mjs:43:  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:5207:+scripts/check-deploy.mjs:44:    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:5208:+scripts/check-deploy.mjs:51:  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
docs/audit-16-codex-raw.md:5220:+scripts/sepolia/03-deploy-voter.js:23:  console.log("pNouns Voter:", dep.voter, "liveMode=true margin=", String(margin));
docs/audit-16-codex-raw.md:5263:+    23	## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:5272:+    32	- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:5299:+    59	## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:5310:+    70	3. マルチシグから `setLiveMode(true)`
docs/audit-16-codex-raw.md:5316:+    76	- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
docs/audit-16-codex-raw.md:5324:+    84	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:5352:+    26	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
docs/audit-16-codex-raw.md:5369:+    43	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:5370:+    44	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:5377:+    51	  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
docs/audit-16-codex-raw.md:5531:+   169	    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
docs/audit-16-codex-raw.md:5533:+   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:5551:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:5565:+   362	    function execute(uint256 proposalId) external nonReentrant {
docs/audit-16-codex-raw.md:5573:+   370	        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
docs/audit-16-codex-raw.md:5629:+    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
docs/audit-16-codex-raw.md:5703:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:5704:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:5859:+    ✔ シャドー運用(liveMode=false)では Nouns DAO を呼ばず結果イベントのみ
docs/audit-16-codex-raw.md:5876:+      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
docs/audit-16-codex-raw.md:5894:+docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:5904:+docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:5909:+docs/AUDIT-RESPONSE-2026-08-18.md-173-| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:5951:+docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:5956:+docs/audit-12-codex-raw.md-178-+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:5963:+docs/audit-12-codex-raw.md-445-test/fork.e2e.test.js:26:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:5966:+docs/audit-12-codex-raw.md-448-scripts/sepolia/lib.js:18:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:5968:+docs/audit-12-codex-raw.md-450-docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:5969:+docs/audit-12-codex-raw.md:451:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:5970:+docs/audit-12-codex-raw.md-452-docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:5971:+docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:5972:+docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:5974:+docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:5975:+docs/audit-12-codex-raw.md-457-docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:6172:+/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
docs/audit-16-codex-raw.md:6174:+rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:6178:+contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:6180:+contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
docs/audit-16-codex-raw.md:6181:+contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:6184:+contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:6186:+contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:6187:+contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:6188:+contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:6192:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:6217:+   139	    error RegistrationTooRecent();
docs/audit-16-codex-raw.md:6235:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:6239:+   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
docs/audit-16-codex-raw.md:6240:+   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:6244:+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:6248:+   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:6288:+   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:6297:+   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:6340:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:6344:+重要な追加所見があります。`REG_DELAY=7200` と現 Worker の組合せでは、猶予中の Snapshot 票を Worker が即座に simulate し、`RegistrationTooRecent` を「恒久 revert」と同じ扱いで数えます。5 tick 後に dead-letter 化するため、runbook の24時間猶予中に投票された票が約10分（mainnet 2分 cron）で自動除外され得ます。今回の9シナリオはこの実投函経路を通しておらず検出できていません。mainnet 移行前に塞ぐべき High と判断します。
docs/audit-16-codex-raw.md:6354:+ℹ cancelled 0
docs/audit-16-codex-raw.md:6363:+ℹ cancelled 0
docs/audit-16-codex-raw.md:6394:+✔ linkOk=false: 警告し、テストネットでも告知はしない (1.239338ms)
docs/audit-16-codex-raw.md:6405:+ℹ cancelled 0
docs/audit-16-codex-raw.md:6639:+    64	    bool public liveMode;
docs/audit-16-codex-raw.md:6663:+    88	    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
docs/audit-16-codex-raw.md:6668:+    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:6674:+    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:6706:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:6726:+- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。
docs/audit-16-codex-raw.md:6728:+/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:6743:+単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:6752:+- 登録猶予中の `RegistrationTooRecent`
docs/audit-16-codex-raw.md:6779:+- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:6783:+[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:6806:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:6826:+- runbook値7200に対しdelayは300以上、marginは表示だけ、liveModeも表示だけです。
docs/audit-16-codex-raw.md:6828:+/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:6843:+単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:6852:+- 登録猶予中の `RegistrationTooRecent`
docs/audit-16-codex-raw.md:6879:+- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:6883:+[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:6917:       { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
docs/audit-16-codex-raw.md:6918:+      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-16-codex-raw.md:6931:     liveMode: !!live,
docs/audit-16-codex-raw.md:6943:+// 「取り違え事故の検出」が目的の補助チェックであり、厳密な誤登録防止は猶予+取消+公開が担う。
docs/audit-16-codex-raw.md:7010:     try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:7014:+      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:7017:         try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:7021:+          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:7030:+            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
docs/audit-16-codex-raw.md:7044:     liveMode: () => true,
docs/audit-16-codex-raw.md:7045:+    eligibleAtBlock: () => 50n,
docs/audit-16-codex-raw.md:7058:+    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-16-codex-raw.md:7125:+//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
docs/audit-16-codex-raw.md:7177:   const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:7178:     v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:7186:-  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
docs/audit-16-codex-raw.md:7191:+  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
docs/audit-16-codex-raw.md:7192:+  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
docs/audit-16-codex-raw.md:7193:+  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
docs/audit-16-codex-raw.md:7194:+  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);
docs/audit-16-codex-raw.md:7332:+// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
docs/audit-16-codex-raw.md:7372:+    ["liveMode", await c.liveMode(), false],
docs/audit-16-codex-raw.md:7401:    - RUNBOOK: graceBad は unregister→再登録で回復しない(猶予再カウント)ため
docs/audit-16-codex-raw.md:7432:+| - | 記録 | graceBad の提案は unregister → 再登録では回復しない(猶予が再カウント) | RUNBOOK §8 に手動運用への切替を明記 |
docs/audit-16-codex-raw.md:7434:+**問題なしと確認**: ABI 28 error は artifact と完全一致・RegistrationTooRecent の復号が実際に機能
docs/audit-16-codex-raw.md:7446:+2. create-and-register 後、対応表・registeredAtBlock・eligibleAtBlock が期待値
docs/audit-16-codex-raw.md:7448:+4. block == eligibleAtBlock 以降、同じ票が自動投函される
docs/audit-16-codex-raw.md:7451:+7. RegistrationTooRecent / StaleVote の実 revert が復号され、前者だけ drop 非加算
docs/audit-16-codex-raw.md:7461: - 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:7463:+- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
docs/audit-16-codex-raw.md:7501:+     (RegistrationTooRecent() = keccak256 先頭 4 バイト。StaleVote() も同様)。
docs/audit-16-codex-raw.md:7509:+     再登録すれば eligibleAt が更新されて回復するか — unregister は票ゼロなら可能のはず)
docs/audit-16-codex-raw.md:7799:+      RegistrationTooRecent を復号できず、第13回の二重防御②が死にコードだった
docs/audit-16-codex-raw.md:7800:+      (eligibleAtBlock 読取失敗時に dead-letter 化が再発し得た)
docs/audit-16-codex-raw.md:7809:+      復号された RegistrationTooRecent は drop に数えない / StaleVote は数える、
docs/audit-16-codex-raw.md:7832:++総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/audit-16-codex-raw.md:7836:++| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/audit-16-codex-raw.md:7871:+ mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/audit-16-codex-raw.md:7903:++   - chain.js: metagovInfo に eligibleAtBlock を追加 (allowFailure なので旧コントラクトでは 0)
docs/audit-16-codex-raw.md:7905:++   - worker.js: revertErrorName() で RegistrationTooRecent を一括・個別 simulate とも transient 扱い
docs/audit-16-codex-raw.md:7908:++      block == eligibleAt ちょうどのときコントラクト側 (`block.number < eligibleAtBlock` で revert)
docs/audit-16-codex-raw.md:7911:++      `x.data?.errorName` が取れる条件。ABI に RegistrationTooRecent エラーが
docs/audit-16-codex-raw.md:7963:++      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-16-codex-raw.md:7966:++      RegistrationTooRecent は一括・個別とも数えない、の二重防御。
docs/audit-16-codex-raw.md:7976:++      live 前は liveMode=false 要求。runbook を段階照合に書き換え、
docs/audit-16-codex-raw.md:8059:+++   - liveMode=false で開始 → シャドー → 委任 → liveMode=true の順序で、
docs/audit-16-codex-raw.md:8338:+++      ハブ正常0件+登録済み=unresolved 停止と KV write 抑制 / linkOk=false で
docs/audit-16-codex-raw.md:8345:+++    - docs/RUNBOOK-MAINNET.md: 鍵 4 役の分離、liveMode=false 開始 →
docs/audit-16-codex-raw.md:8346:+++      機械照合 → シャドー → 委任 → liveMode=true の順序固定、ロールバック手順
docs/audit-16-codex-raw.md:8388:++++## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:8397:++++- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:8424:++++## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:8435:++++3. マルチシグから `setLiveMode(true)`
docs/audit-16-codex-raw.md:8441:++++- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
docs/audit-16-codex-raw.md:8449:++++- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:8591:++++    liveMode: () => true,
docs/audit-16-codex-raw.md:8631:++++test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
docs/audit-16-codex-raw.md:8635:++++  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
docs/audit-16-codex-raw.md:8744:++++  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
docs/audit-16-codex-raw.md:8761:++++  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:8762:++++    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:8769:++++  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
docs/audit-16-codex-raw.md:8867:++++  try { await v.setLiveMode.staticCall(true); } catch { rejected = true; } // 旧オーナー(deployer)は拒否されること
docs/audit-16-codex-raw.md:8891:+++ℹ cancelled 0
docs/audit-16-codex-raw.md:9004:+++    89	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
docs/audit-16-codex-raw.md:9017:+++    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:9184:+++    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
docs/audit-16-codex-raw.md:9296:+++    92	    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
docs/audit-16-codex-raw.md:9634:+ mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/audit-16-codex-raw.md:9643:++// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
docs/audit-16-codex-raw.md:9667:++ {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
docs/audit-16-codex-raw.md:9760:+-    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-16-codex-raw.md:9761:++    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
docs/audit-16-codex-raw.md:9772:++  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
docs/audit-16-codex-raw.md:9802:++  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
docs/audit-16-codex-raw.md:9807:++test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
docs/audit-16-codex-raw.md:9810:++  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
docs/audit-16-codex-raw.md:9811:++  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
docs/audit-16-codex-raw.md:9821:++  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3d7ac07d", functionName: "castSnapshotVotes" }); }; // StaleVote()
docs/audit-16-codex-raw.md:9830:++  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
docs/audit-16-codex-raw.md:9841:+ //   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
docs/audit-16-codex-raw.md:9859:+   // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
docs/audit-16-codex-raw.md:9860:+   if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
docs/audit-16-codex-raw.md:9874:+ // mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
docs/audit-16-codex-raw.md:9911:+for(const sig of ['"'RegistrationTooRecent()','StaleVote()']) console.log(sig,toFunctionSelector(sig),keccak256(stringToHex(sig)).slice(0,10));
docs/audit-16-codex-raw.md:9920:+RegistrationTooRecent() 0x33ab63b9 0x33ab63b9
docs/audit-16-codex-raw.md:9924:+     3	// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
docs/audit-16-codex-raw.md:9948:+    27	 {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
docs/audit-16-codex-raw.md:10040:+    64	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
docs/audit-16-codex-raw.md:10132:+   156	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
docs/audit-16-codex-raw.md:10146:+   170	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
docs/audit-16-codex-raw.md:10225:+   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:10229:+   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:10232:+   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:10235:+   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:10245:+   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:10252:+   276	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
docs/audit-16-codex-raw.md:10253:+   277	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
docs/audit-16-codex-raw.md:10254:+   278	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
docs/audit-16-codex-raw.md:10351:+   484	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
docs/audit-16-codex-raw.md:10371:+   504	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:10372:+   505	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
docs/audit-16-codex-raw.md:10373:+   506	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
docs/audit-16-codex-raw.md:10376:+   509	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
docs/audit-16-codex-raw.md:10410:+   543	            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
docs/audit-16-codex-raw.md:10439:+ const e=new ContractFunctionRevertedError({abi:METAGOV_ABI,data,functionName:'castSnapshotVotes'});
docs/audit-16-codex-raw.md:10450:+    abiItem: { inputs: [], name: 'RegistrationTooRecent', type: 'error' },
docs/audit-16-codex-raw.md:10452:+    errorName: 'RegistrationTooRecent'
docs/audit-16-codex-raw.md:10454:+  short: 'The contract function "castSnapshotVotes" reverted.',
docs/audit-16-codex-raw.md:10460:+  short: 'The contract function "castSnapshotVotes" reverted with the following signature:\n' +
docs/audit-16-codex-raw.md:10471:+  short: 'The contract function "castSnapshotVotes" reverted.',
docs/audit-16-codex-raw.md:10552:+scripts/check-deploy.mjs:59:    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:10569:+    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
docs/audit-16-codex-raw.md:10738:+   180	      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
docs/audit-16-codex-raw.md:10774:+    36	 *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
docs/audit-16-codex-raw.md:10802:+    64	    bool public liveMode;
docs/audit-16-codex-raw.md:10826:+    88	    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
docs/audit-16-codex-raw.md:10831:+    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:10837:+    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:10877:+   139	    error RegistrationTooRecent();
docs/audit-16-codex-raw.md:10907:+   169	    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
docs/audit-16-codex-raw.md:10909:+   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:10927:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:10931:+   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
docs/audit-16-codex-raw.md:10932:+   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:10936:+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:10940:+   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:10990:+   252	    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
docs/audit-16-codex-raw.md:10996:+   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:11014:+   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:11032:+     7	//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
docs/audit-16-codex-raw.md:11063:+    38	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
docs/audit-16-codex-raw.md:11083:+    58	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
docs/audit-16-codex-raw.md:11084:+    59	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
docs/audit-16-codex-raw.md:11093:+    68	  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
docs/audit-16-codex-raw.md:11094:+    69	  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
docs/audit-16-codex-raw.md:11095:+    70	  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
docs/audit-16-codex-raw.md:11096:+    71	  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);
docs/audit-16-codex-raw.md:11162:+     1	// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
docs/audit-16-codex-raw.md:11208:+    47	    ["liveMode", await c.liveMode(), false],
docs/audit-16-codex-raw.md:11243:+    23	## 2. デプロイ (liveMode=false で開始)
docs/audit-16-codex-raw.md:11256:+    36	- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
docs/audit-16-codex-raw.md:11276:+    56	mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
docs/audit-16-codex-raw.md:11295:+    75	## 5. シャドー運用 (liveMode=false)
docs/audit-16-codex-raw.md:11306:+    86	3. マルチシグから `setLiveMode(true)`
docs/audit-16-codex-raw.md:11311:+    91	1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
docs/audit-16-codex-raw.md:11316:+    96	6. 誤登録が原因なら、票が入る前に `unregisterProposal`
docs/audit-16-codex-raw.md:11324:+   104	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:11330:+selector の独立照合で重要な結果が出ました。`RegistrationTooRecent()` はテスト記載どおり `0x33ab63b9` ですが、`StaleVote()` の正値は `0x93ff56e3` で、テストの `0x3d7ac07d` は誤りです。そのテストは未復号でも恒久扱いされるため偶然通る構造です。これはクローズ判定に反映します。
docs/audit-16-codex-raw.md:11346:+    12	| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
docs/audit-16-codex-raw.md:11347:+    13	| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
docs/audit-16-codex-raw.md:11359:+    25	| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
docs/audit-16-codex-raw.md:11413:+    79	| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:11429:+    95	| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:11443:+   109	| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/audit-16-codex-raw.md:11475:+   141	| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:11478:+   144	| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/audit-16-codex-raw.md:11479:+   145	| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:11480:+   146	| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
docs/audit-16-codex-raw.md:11484:+   150	問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/audit-16-codex-raw.md:11486:+   152	**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:11502:+   168	| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:11507:+   173	| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:11517:+   183	| `liveMode` / `refundEnabled` | true / true | 意図どおり |
docs/audit-16-codex-raw.md:11562:+   228	| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/audit-16-codex-raw.md:11565:+   231	| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/audit-16-codex-raw.md:11581:+   247	総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/audit-16-codex-raw.md:11585:+   251	| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/audit-16-codex-raw.md:11596:+docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-16-codex-raw.md:11601:+docs/audit-10-codex-raw.md:78:`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。
docs/audit-16-codex-raw.md:11726:+docs/audit-13-codex-raw.md:1786:   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:11735:+docs/audit-13-codex-raw.md:2065:   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-16-codex-raw.md:11828:+docs/audit-13-codex-raw.md:3576:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:11839:+docs/audit-13-codex-raw.md:3591:docs/AUDIT-RESPONSE-2026-08-18.md-173-| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:11855:+docs/audit-13-codex-raw.md:3638:docs/audit-12-codex-raw.md-178-+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:11856:+docs/audit-13-codex-raw.md:3650:docs/audit-12-codex-raw.md-450-docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:11857:+docs/audit-13-codex-raw.md:3651:docs/audit-12-codex-raw.md:451:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:11858:+docs/audit-13-codex-raw.md:3652:docs/audit-12-codex-raw.md-452-docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:11859:+docs/audit-13-codex-raw.md:3653:docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:11860:+docs/audit-13-codex-raw.md:3654:docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:11862:+docs/audit-13-codex-raw.md:3657:docs/audit-12-codex-raw.md-457-docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:11885:+docs/audit-13-codex-raw.md:3926:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:11886:+docs/audit-13-codex-raw.md:3970:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:11888:+docs/audit-13-codex-raw.md:4026:重要な追加所見があります。`REG_DELAY=7200` と現 Worker の組合せでは、猶予中の Snapshot 票を Worker が即座に simulate し、`RegistrationTooRecent` を「恒久 revert」と同じ扱いで数えます。5 tick 後に dead-letter 化するため、runbook の24時間猶予中に投票された票が約10分（mainnet 2分 cron）で自動除外され得ます。今回の9シナリオはこの実投函経路を通しておらず検出できていません。mainnet 移行前に塞ぐべき High と判断します。
docs/audit-16-codex-raw.md:11891:+docs/audit-13-codex-raw.md:4356:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:11895:+docs/audit-13-codex-raw.md:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:11901:+docs/audit-13-codex-raw.md:4410:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:11905:+docs/audit-13-codex-raw.md:4425:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:11916:+docs/audit-13-codex-raw.md:4461:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:11917:+docs/audit-13-codex-raw.md:4465:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:11922:+docs/audit-13-codex-raw.md:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:11928:+docs/audit-13-codex-raw.md:4510:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:11932:+docs/audit-13-codex-raw.md:4525:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:11943:+docs/audit-13-codex-raw.md:4561:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:11944:+docs/audit-13-codex-raw.md:4565:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:11953:+docs/AUDIT-RESPONSE-2026-08-18.md:12:| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
docs/audit-16-codex-raw.md:11954:+docs/AUDIT-RESPONSE-2026-08-18.md:13:| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
docs/audit-16-codex-raw.md:11960:+docs/AUDIT-RESPONSE-2026-08-18.md:25:| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
docs/audit-16-codex-raw.md:11985:+docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-16-codex-raw.md:11995:+docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-16-codex-raw.md:12003:+docs/AUDIT-RESPONSE-2026-08-18.md:109:| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/audit-16-codex-raw.md:12015:+docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:12018:+docs/AUDIT-RESPONSE-2026-08-18.md:144:| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/audit-16-codex-raw.md:12019:+docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12020:+docs/AUDIT-RESPONSE-2026-08-18.md:146:| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
docs/audit-16-codex-raw.md:12023:+docs/AUDIT-RESPONSE-2026-08-18.md:150:問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/audit-16-codex-raw.md:12024:+docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12033:+docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:12044:+docs/AUDIT-RESPONSE-2026-08-18.md:228:| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/audit-16-codex-raw.md:12047:+docs/AUDIT-RESPONSE-2026-08-18.md:231:| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/audit-16-codex-raw.md:12053:+docs/AUDIT-RESPONSE-2026-08-18.md:247:総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/audit-16-codex-raw.md:12054:+docs/AUDIT-RESPONSE-2026-08-18.md:251:| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/audit-16-codex-raw.md:12076:+docs/audit-12-codex-raw.md:155: 問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/audit-16-codex-raw.md:12077:+docs/audit-12-codex-raw.md:157: **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12086:+docs/audit-12-codex-raw.md:178:+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:12105:+   109	| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/audit-16-codex-raw.md:12137:+   141	| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-16-codex-raw.md:12140:+   144	| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/audit-16-codex-raw.md:12141:+   145	| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12142:+   146	| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
docs/audit-16-codex-raw.md:12146:+   150	問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/audit-16-codex-raw.md:12148:+   152	**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12164:+   168	| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12169:+   173	| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-16-codex-raw.md:12179:+   183	| `liveMode` / `refundEnabled` | true / true | 意図どおり |
docs/audit-16-codex-raw.md:12224:+   228	| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/audit-16-codex-raw.md:12227:+   231	| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/audit-16-codex-raw.md:12243:+   247	総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/audit-16-codex-raw.md:12247:+   251	| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/audit-16-codex-raw.md:12263:+4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-16-codex-raw.md:12278:+167:### [Info] `linkwarn` 単体では毎 tick write の回帰はない
docs/audit-16-codex-raw.md:12290:+47:### 5. [重大度 Info] `eligibleAtBlock`の登録時確定は正しく実装
docs/audit-16-codex-raw.md:12291:+59:推奨する修正: 再登録を同じNouns IDで行い、新しい`eligibleAtBlock`を直接比較するテストを追加すると境界がより明確です。
docs/audit-16-codex-raw.md:12309:+191:mainnetでは毎tick確認し、下限をコード上で最低300に固定してください。さらに提案ごとの`eligibleAtBlock - registeredAtBlock >= 300`を投函前に検証すると、グローバル設定変更後の新規登録も確実に停止できます。
docs/audit-16-codex-raw.md:12352:+33:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12358:+55:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:12362:+70:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:12370:+106:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:12371:+110:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:12378:+133:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12384:+155:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-16-codex-raw.md:12388:+170:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-16-codex-raw.md:12396:+206:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-16-codex-raw.md:12397:+210:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-16-codex-raw.md:12412:+75:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
docs/audit-16-codex-raw.md:12413:+77:ただし、コード面の最終確認としては Medium 相当の未解消点が4点あります。特に `RegistrationTooRecent` の二重防御は ABI 不足により機能していません。明日の E2E 前に少なくとも ABI と RUNBOOK コマンドは修正を推奨します。
docs/audit-16-codex-raw.md:12414:+79:### [Medium] RegistrationTooRecent の二重防御が機能しない
docs/audit-16-codex-raw.md:12415:+93:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
docs/audit-16-codex-raw.md:12446:+ℹ cancelled 0
docs/audit-16-codex-raw.md:12494:+[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:12500:+[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted with the following signature:
docs/audit-16-codex-raw.md:12504:+[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:12507:+✔ linkOk=false: 警告し、テストネットでも告知はしない (1.429834ms)
docs/audit-16-codex-raw.md:12519:+✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.583396ms)
docs/audit-16-codex-raw.md:12526:+ℹ cancelled 0
docs/audit-16-codex-raw.md:12539:+rg -n \"function unregisterProposal|snapshotVotesAccepted|eligibleAtBlock|setRegistrationDelay\" contracts/PNounsSnapVoter.sol test scripts docs | sed -n '1,200p'
docs/audit-16-codex-raw.md:12545:+contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12546:+contracts/PNounsSnapVoter.sol:99:    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:12547:+contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12549:+contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12550:+contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:12551:+contracts/PNounsSnapVoter.sol:198:        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:12552:+contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12553:+contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12554:+contracts/PNounsSnapVoter.sol:276:        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:12555:+contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12559:+test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:12561:+test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:12562:+test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
docs/audit-16-codex-raw.md:12564:+test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:12565:+test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
docs/audit-16-codex-raw.md:12567:+test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:12571:+test/snap.fork.test.js:302:      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(0n);
docs/audit-16-codex-raw.md:12572:+test/snap.fork.test.js:310:      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(1n); // だが受理は 1 件
docs/audit-16-codex-raw.md:12573:+docs/AUDIT-RESPONSE-2026-08-18.md:109:| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/audit-16-codex-raw.md:12574:+docs/AUDIT-RESPONSE-2026-08-18.md:144:| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/audit-16-codex-raw.md:12575:+docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12576:+docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12577:+docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12578:+docs/AUDIT-RESPONSE-2026-08-18.md:228:| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/audit-16-codex-raw.md:12579:+docs/AUDIT-RESPONSE-2026-08-18.md:247:総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/audit-16-codex-raw.md:12580:+docs/AUDIT-RESPONSE-2026-08-18.md:251:| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/audit-16-codex-raw.md:12581:+scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:12582:+docs/audit-13-codex-raw.md:3215:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12584:+docs/audit-13-codex-raw.md:3233:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12585:+docs/audit-13-codex-raw.md:3558:      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
docs/audit-16-codex-raw.md:12586:+docs/audit-13-codex-raw.md:3586:docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12587:+docs/audit-13-codex-raw.md:3633:docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12588:+docs/audit-13-codex-raw.md:3653:docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12589:+docs/audit-13-codex-raw.md:3654:docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12590:+docs/audit-13-codex-raw.md:3656:docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12591:+docs/audit-13-codex-raw.md:3854:/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
docs/audit-16-codex-raw.md:12592:+docs/audit-13-codex-raw.md:3856:rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:12594:+docs/audit-13-codex-raw.md:3860:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12595:+docs/audit-13-codex-raw.md:3863:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12597:+docs/audit-13-codex-raw.md:3866:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12598:+docs/audit-13-codex-raw.md:3868:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12599:+docs/audit-13-codex-raw.md:3869:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12600:+docs/audit-13-codex-raw.md:3870:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12601:+docs/audit-13-codex-raw.md:3874:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12602:+docs/audit-13-codex-raw.md:3917:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12603:+docs/audit-13-codex-raw.md:3922:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:12604:+docs/audit-13-codex-raw.md:3926:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:12605:+docs/audit-13-codex-raw.md:3930:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12606:+docs/audit-13-codex-raw.md:3970:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:12607:+docs/audit-13-codex-raw.md:3979:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12608:+docs/audit-13-codex-raw.md:4022:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12610:+docs/audit-13-codex-raw.md:4350:    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12611:+docs/audit-13-codex-raw.md:4356:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:12612:+docs/audit-13-codex-raw.md:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12613:+docs/audit-13-codex-raw.md:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12614:+scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:12615:+scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:12616:+docs/audit-10-codex-raw.md:78:`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。
docs/audit-16-codex-raw.md:12617:+docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:12618:+docs/audit-12-codex-raw.md:73:  含まれると notifyError → return (fail-closed)。ABI に owner/registrar/eligibleAtBlock を追加。
docs/audit-16-codex-raw.md:12619:+docs/audit-12-codex-raw.md:82:- ABI 追加分 (owner/registrar/eligibleAtBlock) の型・シグネチャはコントラクトと一致するか。
docs/audit-16-codex-raw.md:12620:+docs/audit-12-codex-raw.md:136:      eligibleAtBlock を追加)
docs/audit-16-codex-raw.md:12621:+docs/audit-12-codex-raw.md:157: **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12622:+docs/audit-12-codex-raw.md:173:+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12623:+docs/audit-12-codex-raw.md:435:/bin/bash -lc "rg -n \"function recentProposals|recentProposals\\(|function maybeExecute|maybeExecute\\(|function metagovInfo|metagovInfo\\(|MAINNET_PROPOSER_MNEMONIC|REGISTRAR_MNEMONIC|eligibleAtBlock|function owner|function registrar|registrationDelayBlocks|function proposals|state ===|state "'!==" relayer-cf scripts contracts test hardhat.config.* .env.example README.md docs --glob '"'"'!docs/audit-11-codex-raw.md'"'" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:12624:+docs/audit-12-codex-raw.md:439:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:12625:+docs/audit-12-codex-raw.md:440:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:12626:+docs/audit-12-codex-raw.md:441:test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
docs/audit-16-codex-raw.md:12627:+docs/audit-12-codex-raw.md:442:test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:12628:+docs/audit-12-codex-raw.md:443:test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
docs/audit-16-codex-raw.md:12629:+docs/audit-12-codex-raw.md:444:test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
docs/audit-16-codex-raw.md:12630:+docs/audit-12-codex-raw.md:453:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12631:+docs/audit-12-codex-raw.md:454:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12632:+docs/audit-12-codex-raw.md:456:docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12633:+docs/audit-12-codex-raw.md:461:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12634:+docs/audit-12-codex-raw.md:464:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12636:+docs/audit-12-codex-raw.md:466:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12637:+docs/audit-12-codex-raw.md:467:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12638:+docs/audit-12-codex-raw.md:468:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12639:+docs/audit-12-codex-raw.md:469:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12640:+docs/audit-12-codex-raw.md:473:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:12641:+docs/audit-12-codex-raw.md:480:scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-16-codex-raw.md:12642:+docs/audit-12-codex-raw.md:481:scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:12643:+docs/audit-12-codex-raw.md:482:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:12644:+docs/audit-12-codex-raw.md:514:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12645:+docs/audit-12-codex-raw.md:1312:   440	  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12647:+docs/audit-12-codex-raw.md:1366:    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12648:+docs/audit-12-codex-raw.md:1372:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:12649:+docs/audit-12-codex-raw.md:1410:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12651:+docs/audit-12-codex-raw.md:1428:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12652:+docs/audit-12-codex-raw.md:1433:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:12653:+docs/audit-12-codex-raw.md:1437:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:12654:+docs/audit-12-codex-raw.md:1441:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12655:+docs/audit-12-codex-raw.md:1463:   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12656:+docs/audit-12-codex-raw.md:1481:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:12657:+docs/audit-12-codex-raw.md:1490:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12658:+docs/audit-12-codex-raw.md:1954:   440	  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12659:+docs/audit-12-codex-raw.md:2747:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-16-codex-raw.md:12660:+docs/audit-12-codex-raw.md:2946:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-16-codex-raw.md:12661:+docs/audit-14-codex-raw.md:26:   - chain.js: metagovInfo に eligibleAtBlock を追加 (allowFailure なので旧コントラクトでは 0)
docs/audit-16-codex-raw.md:12662:+docs/audit-14-codex-raw.md:31:      block == eligibleAt ちょうどのときコントラクト側 (`block.number < eligibleAtBlock` で revert)
docs/audit-16-codex-raw.md:12663:+docs/audit-14-codex-raw.md:86:      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-16-codex-raw.md:12664:+docs/audit-14-codex-raw.md:3332:+   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12666:+docs/audit-14-codex-raw.md:3350:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12667:+docs/audit-14-codex-raw.md:3675:+      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
docs/audit-16-codex-raw.md:12668:+docs/audit-14-codex-raw.md:3703:+docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12669:+docs/audit-14-codex-raw.md:3750:+docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12670:+docs/audit-14-codex-raw.md:3770:+docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12671:+docs/audit-14-codex-raw.md:3771:+docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12672:+docs/audit-14-codex-raw.md:3773:+docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-16-codex-raw.md:12673:+docs/audit-14-codex-raw.md:3971:+/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
docs/audit-16-codex-raw.md:12674:+docs/audit-14-codex-raw.md:3973:+rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:12676:+docs/audit-14-codex-raw.md:3977:+contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12677:+docs/audit-14-codex-raw.md:3980:+contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12679:+docs/audit-14-codex-raw.md:3983:+contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12680:+docs/audit-14-codex-raw.md:3985:+contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12681:+docs/audit-14-codex-raw.md:3986:+contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12682:+docs/audit-14-codex-raw.md:3987:+contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12683:+docs/audit-14-codex-raw.md:3991:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12684:+docs/audit-14-codex-raw.md:4034:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12685:+docs/audit-14-codex-raw.md:4039:+   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:12686:+docs/audit-14-codex-raw.md:4043:+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:12687:+docs/audit-14-codex-raw.md:4047:+   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12688:+docs/audit-14-codex-raw.md:4087:+   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-16-codex-raw.md:12689:+docs/audit-14-codex-raw.md:4096:+   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12690:+docs/audit-14-codex-raw.md:4139:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12692:+docs/audit-14-codex-raw.md:4467:+    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12693:+docs/audit-14-codex-raw.md:4473:+    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-16-codex-raw.md:12694:+docs/audit-14-codex-raw.md:4505:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12695:+docs/audit-14-codex-raw.md:4605:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12696:+docs/audit-14-codex-raw.md:4821:+      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-16-codex-raw.md:12697:+docs/audit-14-codex-raw.md:5371:3869:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12698:+docs/audit-14-codex-raw.md:5372:3870:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12699:+docs/audit-14-codex-raw.md:5374:3979:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12700:+docs/audit-14-codex-raw.md:5378:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12701:+docs/audit-14-codex-raw.md:5390:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12702:+docs/audit-14-codex-raw.md:6188:/bin/bash -lc "rg -n \"METAGOV_ABI|RegistrationTooRecent|eligibleAtBlock|function metagovInfo|revertErrorName|queueNotify|flushPendingNotes\" relayer-cf/src/abi.js relayer-cf/src/chain.js relayer-cf/src/worker.js contracts/PNounsSnapVoter.sol relayer-cf/test/*.mjs && nl -ba relayer-cf/src/abi.js | sed -n '1,180p' && nl -ba relayer-cf/src/chain.js | sed -n '205,280p' && nl -ba relayer-cf/src/worker.js | sed -n '1,75p' && nl -ba relayer-cf/src/worker.js | sed -n '230,330p' && nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '1,380p'" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:12703:+docs/audit-14-codex-raw.md:6190:relayer-cf/test/worker-tick.test.mjs:92:    eligibleAtBlock: () => 50n,
docs/audit-16-codex-raw.md:12704:+docs/audit-14-codex-raw.md:6191:relayer-cf/test/worker-tick.test.mjs:219:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-16-codex-raw.md:12705:+docs/audit-14-codex-raw.md:6192:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-16-codex-raw.md:12706:+docs/audit-14-codex-raw.md:6194:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12707:+docs/audit-14-codex-raw.md:6195:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12708:+docs/audit-14-codex-raw.md:6196:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12709:+docs/audit-14-codex-raw.md:6197:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-16-codex-raw.md:12710:+docs/audit-14-codex-raw.md:6198:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-16-codex-raw.md:12711:+docs/audit-14-codex-raw.md:6200:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-16-codex-raw.md:12712:+docs/audit-14-codex-raw.md:6207:relayer-cf/src/chain.js:181:      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-16-codex-raw.md:12713:+docs/audit-14-codex-raw.md:6685:    92	    eligibleAtBlock: () => 50n,
docs/audit-16-codex-raw.md:12714:+docs/audit-14-codex-raw.md:6812:   219	    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-16-codex-raw.md:12715:+docs/audit-14-codex-raw.md:6920:   181	      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-16-codex-raw.md:12716:+docs/audit-14-codex-raw.md:7031:+    eligibleAtBlock: () => 50n,
docs/audit-16-codex-raw.md:12717:+docs/audit-14-codex-raw.md:7044:+    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-16-codex-raw.md:12718:+docs/audit-14-codex-raw.md:8107:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-16-codex-raw.md:12720:+docs/audit-14-codex-raw.md:8125:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12721:+docs/audit-14-codex-raw.md:8130:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:12722:+docs/audit-14-codex-raw.md:8134:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:12723:+docs/audit-14-codex-raw.md:8138:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:12725:+docs/audit-14-codex-raw.md:8175:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:12726:+docs/audit-14-codex-raw.md:8258:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12727:+docs/audit-14-codex-raw.md:8314:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-16-codex-raw.md:12728:+docs/audit-14-codex-raw.md:8370:      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-16-codex-raw.md:12729:+docs/audit-14-codex-raw.md:9241:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
docs/audit-16-codex-raw.md:12730:+docs/audit-14-codex-raw.md:9259:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
docs/audit-16-codex-raw.md:12731:+docs/audit-14-codex-raw.md:9277:何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。
docs/audit-16-codex-raw.md:12732:+docs/audit-14-codex-raw.md:9391:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
docs/audit-16-codex-raw.md:12733:+docs/audit-14-codex-raw.md:9409:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
docs/audit-16-codex-raw.md:12734:+docs/audit-14-codex-raw.md:9427:何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。
docs/audit-16-codex-raw.md:12735:+docs/audit-11-codex-raw.md:59:4. **[前回 Medium] `eligibleAtBlock`** (`contracts/PNounsSnapVoter.sol`): 登録時確定の
docs/audit-16-codex-raw.md:12736:+docs/audit-11-codex-raw.md:61:   猶予が正しくリセットされるか**、`eligibleAtBlock` が 0 のままになる経路
docs/audit-16-codex-raw.md:12737:+docs/audit-11-codex-raw.md:97:/bin/bash -lc "git log --oneline -5 && git status --short && rg -n \"mappingsResolved|announceNew|referencesNounsProposal|eligibleAtBlock|notify\\(|InvalidSpace|registrationDelayBlocks|VOTER|liveMode|refundEnabled|registrar|excluded\" docs/AUDIT-RESPONSE-2026-08-18.md docs/audit-10-codex-raw.md relayer-cf contracts test scripts hardhat.config.* 2>/dev/null" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:12738:+docs/audit-11-codex-raw.md:111:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-16-codex-raw.md:12739:+docs/audit-11-codex-raw.md:114:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-16-codex-raw.md:12740:+docs/audit-11-codex-raw.md:119:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-16-codex-raw.md:12741:+docs/audit-11-codex-raw.md:123:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-16-codex-raw.md:12742:+docs/audit-11-codex-raw.md:124:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-16-codex-raw.md:12743:+docs/audit-11-codex-raw.md:132:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-16-codex-raw.md:12746:+実装上の `RegistrationTooRecent` 復号は直っていますが、`graceBad` は「最初の rush 投函が可能な時間」しか見ていません。Snapshot 側の滞留票数や、`snapsent` receipt 確認に次 tick を使う実際の排出速度を含めないため、遅い登録で一部だけ投函して締切後に部分集計を確定する余地があります。前回の保留理由が完全解消したかという判断では、この点が主要な残件です。
docs/audit-16-codex-raw.md:12762:+   278	  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
docs/audit-16-codex-raw.md:12792:+   308	  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
docs/audit-16-codex-raw.md:12797:+   313	test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
docs/audit-16-codex-raw.md:12800:+   316	  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
docs/audit-16-codex-raw.md:12801:+   317	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
docs/audit-16-codex-raw.md:12811:+   327	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3d7ac07d", functionName: "castSnapshotVotes" }); }; // StaleVote()
docs/audit-16-codex-raw.md:12820:+   336	  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
docs/audit-16-codex-raw.md:12825:+   156	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
docs/audit-16-codex-raw.md:12839:+   170	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
docs/audit-16-codex-raw.md:12918:+   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
docs/audit-16-codex-raw.md:12922:+   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
docs/audit-16-codex-raw.md:12925:+   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
docs/audit-16-codex-raw.md:12928:+   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
docs/audit-16-codex-raw.md:12938:+   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
docs/audit-16-codex-raw.md:12945:+   276	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
docs/audit-16-codex-raw.md:12946:+   277	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
docs/audit-16-codex-raw.md:12947:+   278	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
docs/audit-16-codex-raw.md:12998:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-16-codex-raw.md:13002:+   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
docs/audit-16-codex-raw.md:13003:+   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-16-codex-raw.md:13007:+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-16-codex-raw.md:13011:+   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-16-codex-raw.md:13059:+[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:13065:+[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted with the following signature:
docs/audit-16-codex-raw.md:13069:+[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:13098:+✔ linkOk=false: 警告し、テストネットでも告知はしない (0.575269ms)
docs/audit-16-codex-raw.md:13110:+✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.380816ms)
docs/audit-16-codex-raw.md:13117:+ℹ cancelled 0
docs/audit-16-codex-raw.md:13127:+第14回の主要修正は概ね正しく、特に ABI 追加によって `RegistrationTooRecent` の復号は実際に機能します。一方、以下が残ります。
docs/audit-16-codex-raw.md:13144:+| `RegistrationTooRecent()` | `0x33ab63b9` | `0x33ab63b9` | 正しい |
docs/audit-16-codex-raw.md:13147:+実際に viem の `ContractFunctionRevertedError` を構築すると、正しい Registration selector では `data.errorName === "RegistrationTooRecent"` となりました。したがって [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49) の `revertErrorName()` は機能し、二重防御②は復旧しています。
docs/audit-16-codex-raw.md:13149:+[Low] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:325) / `StaleVote()` の selector が誤っているため、viem はこれを復号せず `data === undefined`、cause は `AbiErrorSignatureNotFoundError` になります。それでも Worker は「RegistrationTooRecent 以外の contract revert」を数えるため、テストは偶然 pass します。「復号可能な恒久 revert」を検証したことにはなりません / selector を `0x93ff56e3` に直し、可能ならテスト内で `revert.data.errorName === "StaleVote"` も明示検証してください。selector はハードコードせず `toFunctionSelector("StaleVote()")` 等から生成する方が安全です。
docs/audit-16-codex-raw.md:13169:+[問題なし・要運用明記] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:539)、[PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) / mainnet で `graceBad` になった提案は、その後も毎 tick `continue` し、締切後も自動 execute・`no votes` 確定を行いません。票が未受理なら unregister は可能です。ただし通常の delay のまま再登録すると `eligibleAtBlock = 再登録ブロック + delay` となり、以前より遅くなるため回復しません / RUNBOOK に「単純な unregister→再登録では回復しない」と明記してください。救済は手動投票・手動集計、または owner が短い delay で再登録して直後に運用値へ戻す例外手順になりますが、後者は複数ロールの厳格な手順化が必要です。
docs/audit-16-codex-raw.md:13203:+- 直接 `castVote()` 後でも、Snapshot票未受理なら unregister でき、tally/bitmap は残る  
docs/audit-16-codex-raw.md:13218:+2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
docs/audit-16-codex-raw.md:13220:+4. `block == eligibleAtBlock` 以降、同じ票が自動投函される。
docs/audit-16-codex-raw.md:13223:+7. `RegistrationTooRecent()` と `StaleVote()` の実revertが期待名として復号され、前者だけdrop非加算になる。
docs/audit-16-codex-raw.md:13245:+第14回の主要修正は概ね正しく、特に ABI 追加によって `RegistrationTooRecent` の復号は実際に機能します。一方、以下が残ります。
docs/audit-16-codex-raw.md:13262:+| `RegistrationTooRecent()` | `0x33ab63b9` | `0x33ab63b9` | 正しい |
docs/audit-16-codex-raw.md:13265:+実際に viem の `ContractFunctionRevertedError` を構築すると、正しい Registration selector では `data.errorName === "RegistrationTooRecent"` となりました。したがって [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49) の `revertErrorName()` は機能し、二重防御②は復旧しています。
docs/audit-16-codex-raw.md:13267:+[Low] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:325) / `StaleVote()` の selector が誤っているため、viem はこれを復号せず `data === undefined`、cause は `AbiErrorSignatureNotFoundError` になります。それでも Worker は「RegistrationTooRecent 以外の contract revert」を数えるため、テストは偶然 pass します。「復号可能な恒久 revert」を検証したことにはなりません / selector を `0x93ff56e3` に直し、可能ならテスト内で `revert.data.errorName === "StaleVote"` も明示検証してください。selector はハードコードせず `toFunctionSelector("StaleVote()")` 等から生成する方が安全です。
docs/audit-16-codex-raw.md:13287:+[問題なし・要運用明記] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:539)、[PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) / mainnet で `graceBad` になった提案は、その後も毎 tick `continue` し、締切後も自動 execute・`no votes` 確定を行いません。票が未受理なら unregister は可能です。ただし通常の delay のまま再登録すると `eligibleAtBlock = 再登録ブロック + delay` となり、以前より遅くなるため回復しません / RUNBOOK に「単純な unregister→再登録では回復しない」と明記してください。救済は手動投票・手動集計、または owner が短い delay で再登録して直後に運用値へ戻す例外手順になりますが、後者は複数ロールの厳格な手順化が必要です。
docs/audit-16-codex-raw.md:13321:+- 直接 `castVote()` 後でも、Snapshot票未受理なら unregister でき、tally/bitmap は残る  
docs/audit-16-codex-raw.md:13336:+2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
docs/audit-16-codex-raw.md:13338:+4. `block == eligibleAtBlock` 以降、同じ票が自動投函される。
docs/audit-16-codex-raw.md:13341:+7. `RegistrationTooRecent()` と `StaleVote()` の実revertが期待名として復号され、前者だけdrop非加算になる。
docs/audit-16-codex-raw.md:13420:@@ -324,7 +324,11 @@ test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop
docs/audit-16-codex-raw.md:13424:-  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3d7ac07d", functionName: "castSnapshotVotes" }); }; // StaleVote()
docs/audit-16-codex-raw.md:13427:+  const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
docs/audit-16-codex-raw.md:13647:   362	    function execute(uint256 proposalId) external nonReentrant {
docs/audit-16-codex-raw.md:13655:   370	        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
docs/audit-16-codex-raw.md:13688:   288	  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
docs/audit-16-codex-raw.md:13702:   102	1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
docs/audit-16-codex-raw.md:13707:   107	6. 誤登録が原因なら、票が入る前に `unregisterProposal`
docs/audit-16-codex-raw.md:13715:   115	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
docs/audit-16-codex-raw.md:13717:   117	- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
docs/audit-16-codex-raw.md:13724:資料側にはもう一つ明確な残存不整合があります。RUNBOOK の障害対応がまだ「24h 猶予内なら取消」と記載されたままです。また `setLiveMode(false)` が止めるのは最終的な Nouns DAO 投票（`execute`）であり、誤対応表への Snapshot 票の受理・取消不能化そのものではありません。これらを重大度に反映します。
docs/audit-16-codex-raw.md:13736:ℹ cancelled 0
docs/audit-16-codex-raw.md:13787:[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:13793:[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted.
docs/audit-16-codex-raw.md:13796:[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
docs/audit-16-codex-raw.md:13829:✔ linkOk=false: 警告し、テストネットでも告知はしない (0.560737ms)
docs/audit-16-codex-raw.md:13842:✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.406843ms)
docs/audit-16-codex-raw.md:13850:ℹ cancelled 0
docs/audit-16-codex-raw.md:13856:/bin/bash -lc "rg -n \"linkOk|referencesNouns|nouns.wtf/vote|discussion|body|registerProposal\" scripts/mainnet/create-and-register.mjs relayer-cf/src/snap.js .github 2>/dev/null | head -n 160; nl -ba relayer-cf/src/abi.js | sed -n '1,110p'; git diff --check; git status --short" in /mnt/data/pnouns-voter
docs/audit-16-codex-raw.md:13860:relayer-cf/src/snap.js:28:      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
docs/audit-16-codex-raw.md:13867:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-16-codex-raw.md:13868:relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-16-codex-raw.md:13871:     3	// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
docs/audit-16-codex-raw.md:13895:    27	 {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
docs/audit-16-codex-raw.md:14026:一方、資料の「受付開始前に自動検算が必ず走り、検算で捕まる誤登録はいつでも取消可能」という安全性の主張は、コード上は成立しません。通常の Worker 経路は安全ですが、コントラクトが permissionless なため、第三者が Worker の検算を迂回できます。
docs/audit-16-codex-raw.md:14042:資料は「10 ブロックにより、受付開始前に必ず自動検算が1回走る」「検算が捕まえる誤登録はいつでも取消可能」としていますが、次の理由で保証されません。
docs/audit-16-codex-raw.md:14045:2. Worker の同一 tick 内では `linkOk` 判定が投函より先に走るため、**Worker 自身は誤対応表へ投函しません**。ここは正しく実装されています。
docs/audit-16-codex-raw.md:14046:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-16-codex-raw.md:14047:4. 1票でも受理されると `snapshotVotesAccepted != 0` となり、`unregisterProposal()` は不能です。
docs/audit-16-codex-raw.md:14048:5. `execute()` も permissionless です。Worker が `linkBad` で自動 execute を止めても、`liveMode=true` のままなら第三者による execute は可能です。
docs/audit-16-codex-raw.md:14049:6. `setLiveMode(false)` は Nouns DAO への最終投票を止めますが、Snapshot 票の受理や取消不能化を止めるスイッチではありません。管理者が警告を見てオンチェーン停止するまでの人的対応が必要です。
docs/audit-16-codex-raw.md:14055:- 強い保証が必要なら、対応表に `validated/activated` 状態を追加し、検算成功をオンチェーンで明示してから `castSnapshotVotes()` を許可する。
docs/audit-16-codex-raw.md:14060:  - 「確定まで数日間止められる」ではなく「管理者が締切前に `setLiveMode(false)` を採掘させれば止められる」
docs/audit-16-codex-raw.md:14061:- Worker テストに、mainnet・`linkOk=false`・`block >= eligibleAt`・実票ありでも `writeContract` が呼ばれないケースを追加する。
docs/audit-16-codex-raw.md:14071:障害対応に「誤登録の疑い: 24h 猶予内なら」と残っています。運用値10ブロックと矛盾し、事故時に存在しない対応時間を期待させます。
docs/audit-16-codex-raw.md:14075:「解禁前かつ `snapshotVotesAccepted == 0` の間に取消」など、実際のコントラクト条件に置き換えてください。
docs/audit-16-codex-raw.md:14101:- 境界でゲートを通った後に `RegistrationTooRecent` が返っても、ABI で復号して transient と扱い、`snapdrop` に加算しません。
docs/audit-16-codex-raw.md:14152:補強するなら、最初のケースを `delay=9` にして境界直下を直接確認することと、上述の `linkOk=false + eligible済み + 実投函経路` を追加するのが有効です。現行2本自体に誤りはありません。
docs/audit-16-codex-raw.md:14162:最終判定: dead-letter・`graceBad`・下限変更そのものは動作していますが、「自動検算が受付より必ず先行し、検出した誤登録をいつでも取消できる」という新しい安全性の説明はクローズできません。オンチェーン activation を導入するか、permissionless 経路を含む実際の信頼モデルへ資料を修正する必要があります。
docs/audit-16-codex-raw.md:14171:一方、資料の「受付開始前に自動検算が必ず走り、検算で捕まる誤登録はいつでも取消可能」という安全性の主張は、コード上は成立しません。通常の Worker 経路は安全ですが、コントラクトが permissionless なため、第三者が Worker の検算を迂回できます。
docs/audit-16-codex-raw.md:14187:資料は「10 ブロックにより、受付開始前に必ず自動検算が1回走る」「検算が捕まえる誤登録はいつでも取消可能」としていますが、次の理由で保証されません。
docs/audit-16-codex-raw.md:14190:2. Worker の同一 tick 内では `linkOk` 判定が投函より先に走るため、**Worker 自身は誤対応表へ投函しません**。ここは正しく実装されています。
docs/audit-16-codex-raw.md:14191:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-16-codex-raw.md:14192:4. 1票でも受理されると `snapshotVotesAccepted != 0` となり、`unregisterProposal()` は不能です。
docs/audit-16-codex-raw.md:14193:5. `execute()` も permissionless です。Worker が `linkBad` で自動 execute を止めても、`liveMode=true` のままなら第三者による execute は可能です。
docs/audit-16-codex-raw.md:14194:6. `setLiveMode(false)` は Nouns DAO への最終投票を止めますが、Snapshot 票の受理や取消不能化を止めるスイッチではありません。管理者が警告を見てオンチェーン停止するまでの人的対応が必要です。
docs/audit-16-codex-raw.md:14200:- 強い保証が必要なら、対応表に `validated/activated` 状態を追加し、検算成功をオンチェーンで明示してから `castSnapshotVotes()` を許可する。
docs/audit-16-codex-raw.md:14205:  - 「確定まで数日間止められる」ではなく「管理者が締切前に `setLiveMode(false)` を採掘させれば止められる」
docs/audit-16-codex-raw.md:14206:- Worker テストに、mainnet・`linkOk=false`・`block >= eligibleAt`・実票ありでも `writeContract` が呼ばれないケースを追加する。
docs/audit-16-codex-raw.md:14216:障害対応に「誤登録の疑い: 24h 猶予内なら」と残っています。運用値10ブロックと矛盾し、事故時に存在しない対応時間を期待させます。
docs/audit-16-codex-raw.md:14220:「解禁前かつ `snapshotVotesAccepted == 0` の間に取消」など、実際のコントラクト条件に置き換えてください。
docs/audit-16-codex-raw.md:14246:- 境界でゲートを通った後に `RegistrationTooRecent` が返っても、ABI で復号して transient と扱い、`snapdrop` に加算しません。
docs/audit-16-codex-raw.md:14297:補強するなら、最初のケースを `delay=9` にして境界直下を直接確認することと、上述の `linkOk=false + eligible済み + 実投函経路` を追加するのが有効です。現行2本自体に誤りはありません。
docs/audit-16-codex-raw.md:14307:最終判定: dead-letter・`graceBad`・下限変更そのものは動作していますが、「自動検算が受付より必ず先行し、検出した誤登録をいつでも取消できる」という新しい安全性の説明はクローズできません。オンチェーン activation を導入するか、permissionless 経路を含む実際の信頼モデルへ資料を修正する必要があります。
relayer-cf/src/worker.js:64:  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
relayer-cf/src/worker.js:156:// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
relayer-cf/src/worker.js:170:      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
relayer-cf/src/worker.js:249:    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
relayer-cf/src/worker.js:253:      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
relayer-cf/src/worker.js:256:        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
relayer-cf/src/worker.js:259:          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
relayer-cf/src/worker.js:269:      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
relayer-cf/src/worker.js:276:    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
relayer-cf/src/worker.js:277:    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
relayer-cf/src/worker.js:278:    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
relayer-cf/src/worker.js:356:        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
relayer-cf/src/worker.js:364:  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
relayer-cf/src/worker.js:490:      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
relayer-cf/src/worker.js:510:        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
relayer-cf/src/worker.js:511:        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
relayer-cf/src/worker.js:512:        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
relayer-cf/src/worker.js:515:          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
relayer-cf/src/worker.js:549:            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
relayer-cf/test/worker-tick.test.mjs:94:    liveMode: () => true,
relayer-cf/test/worker-tick.test.mjs:95:    eligibleAtBlock: () => 50n,
relayer-cf/test/worker-tick.test.mjs:135:test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
relayer-cf/test/worker-tick.test.mjs:139:  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
relayer-cf/test/worker-tick.test.mjs:232:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
relayer-cf/test/worker-tick.test.mjs:288:  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
relayer-cf/test/worker-tick.test.mjs:318:  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
relayer-cf/test/worker-tick.test.mjs:323:test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
relayer-cf/test/worker-tick.test.mjs:326:  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
relayer-cf/test/worker-tick.test.mjs:327:  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
relayer-cf/test/worker-tick.test.mjs:339:  const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
relayer-cf/test/worker-tick.test.mjs:350:  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
relayer-cf/test/worker-tick.test.mjs:387:test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
relayer-cf/test/worker-tick.test.mjs:392:  const { kv, env } = setup(submitHandlers({ eligibleAtBlock: () => 50n }), mainnetEnv, wallet); // 解禁済み
relayer-cf/test/worker-tick.test.mjs:393:  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
relayer-cf/test/worker-tick.test.mjs:399:  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
relayer-cf/src/index.js:92:    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
relayer-cf/src/snap.js:28:      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
relayer-cf/src/snap.js:56:// 「取り違え事故の検出」が目的の補助チェックであり、厳密な誤登録防止は猶予+取消+公開が担う。
relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
contracts/PNounsVoter.sol:29: *  - liveMode=false のあいだは Nouns DAO を呼ばず結果イベントだけ出す(シャドー運用用。executed は立てないので、
contracts/PNounsVoter.sol:30: *    後で liveMode=true にすれば同じ提案を本投票できる)。
contracts/PNounsVoter.sol:32: *    緊急停止は setLiveMode(false)。
contracts/PNounsVoter.sol:65:    bool public liveMode;
contracts/PNounsVoter.sol:150:    function setLiveMode(bool live) external onlyOwner {
contracts/PNounsVoter.sol:151:        liveMode = live;
contracts/PNounsVoter.sol:329:    /// @notice 締切後に誰でも呼べる。結果を Nouns DAO に投票する(liveMode 時)。ガスは Nouns の refund で執行者に戻る。
contracts/PNounsVoter.sol:330:    function execute(uint256 proposalId) external nonReentrant {
contracts/PNounsVoter.sol:339:        if (!liveMode) {
contracts/PNounsVoter.sol:340:            // シャドー運用: 結果イベントだけ出し、executed は立てない(後で liveMode=true にすれば本投票できる)
contracts/PNounsSnapVoter.sol:36: *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
contracts/PNounsSnapVoter.sol:64:    bool public liveMode;
contracts/PNounsSnapVoter.sol:88:    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:99:    mapping(uint256 => uint32) public snapshotVotesAccepted;
contracts/PNounsSnapVoter.sol:139:    error RegistrationTooRecent();
contracts/PNounsSnapVoter.sol:169:    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:193:    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:198:        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:252:    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:276:        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
contracts/PNounsSnapVoter.sol:362:    function execute(uint256 proposalId) external nonReentrant {
contracts/PNounsSnapVoter.sol:370:        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
relayer-cf/src/abi.js:3:// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
relayer-cf/src/abi.js:27: {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
relayer-cf/src/abi.js:231:  "name": "castSnapshotVotes",
relayer-cf/src/abi.js:360:  "name": "liveMode",
relayer-cf/src/abi.js:470:  "name": "eligibleAtBlock",
relayer-cf/src/abi.js:515:  "name": "snapshotVotesAccepted",
relayer-cf/src/chain.js:11:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
relayer-cf/src/chain.js:54:    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
relayer-cf/src/chain.js:180:      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
relayer-cf/src/chain.js:181:      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
relayer-cf/src/chain.js:193:    liveMode: !!live,
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol:451:     * @dev Approve or remove `operator` as an operator for the caller.
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol:764:            // The duplicated `log4` removes an extra check and reduces stack juggling.
contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol:223:     * @dev Approve or remove `operator` as an operator for the caller.
contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControlEnumerable.sol:62:        _roleMembers[role].remove(account);
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:14: * - Elements are added, removed, and checked for existence in constant time
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:37: * In order to clean an EnumerableSet, you can either remove all elements one by one or create a fresh instance using an
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:80:     * Returns true if the value was removed from the set, that is if it was
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:83:    function _remove(Set storage set, bytes32 value) private returns (bool) {
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:90:            // the array, and then remove the last element (sometimes called as 'swap and pop').
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:135:     * array, and it may change when more values are added or removed.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:176:     * Returns true if the value was removed from the set, that is if it was
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:179:    function remove(Bytes32Set storage set, bytes32 value) internal returns (bool) {
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:180:        return _remove(set._inner, value);
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:201:     * array, and it may change when more values are added or removed.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:250:     * Returns true if the value was removed from the set, that is if it was
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:253:    function remove(AddressSet storage set, address value) internal returns (bool) {
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:254:        return _remove(set._inner, bytes32(uint256(uint160(value))));
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:275:     * array, and it may change when more values are added or removed.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:324:     * Returns true if the value was removed from the set, that is if it was
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:327:    function remove(UintSet storage set, uint256 value) internal returns (bool) {
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:328:        return _remove(set._inner, bytes32(value));
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:349:     * array, and it may change when more values are added or removed.
contracts/vendor/pnouns/@openzeppelin/contracts/token/ERC721/IERC721.sol:119:     * @dev Approve or remove `operator` as an operator for the caller.
contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/IOperatorFilterRegistry.sol:13:  function unregister(address addr) external;

exec
/bin/bash -lc "sed -n '20,45p' docs/RUNBOOK-MAINNET.md; sed -n '96,124p' docs/RUNBOOK-MAINNET.md; sed -n '275,296p' docs/member-proposal-unified.html; sed -n '150,215p' contracts/PNounsSnapVoter.sol; sed -n '240,300p' contracts/PNounsSnapVoter.sol; sed -n '345,390p' contracts/PNounsSnapVoter.sol; sed -n '450,575p' relayer-cf/src/worker.js; rg -n \"crons|cron|schedule|2 分|120|every\" relayer-cf/wrangler* relayer-cf/src docs/RUNBOOK-MAINNET.md package.json relayer-cf/package.json" in /mnt/data/pnouns-voter
 succeeded in 0ms:
**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。

## 2. デプロイ (liveMode=false で開始)

```bash
OWNER=0x<当初は委任アドレス> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
REG_DELAY=10 MARGIN=7200 \
  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
```

(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)

- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
- `MARGIN=7200` (約 24 時間 — 決定済みの運用値。締切 = Nouns 投票終了の 24 時間前)
- `OWNER` は当初、現行の委任アドレス(手順 7 で安定稼働後にマルチシグへ移管する。**移管を忘れないこと** — check-deploy の EXPECT_OWNER をマルチシグに切り替えて照合する)
- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
- Sourcify でソース検証 → exact_match を確認

## 3. 機械照合(段階ごとに実行する)

`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**

```bash
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
<h3>唯一、暗号で保証できない部分 — 対応表</h3>
<div class="card warn" style="margin-top:6px">
  <p style="margin:0 0 6px">確認 1 の<b>対応表(この Snapshot 投票 ＝ Nouns の第 N 号議案)</b>だけは、コントラクトが自力で確かめられません。Snapshot の投票署名に Nouns の議案番号が含まれていないためです(Snapshot の仕様)。運用は<b>全自動</b>ですが、「そのプログラムと鍵を信頼している」という意味で、ここだけは性質が異なります。</p>
  <p style="margin:0 0 6px"><b>そのための備えを 4 段用意しています。</b></p>
  <ol style="margin:0 0 4px">
    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 登録の処理回と受付開始の処理回を分けるための間隔です(通常の自動処理は、これとは別に毎回、投函の直前にも検算します)。</li>
    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
    <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
    <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
  </ol>
</div>
<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は登録と受付開始の処理回を分けるためのもので、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 旧案には<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という、通常運用でも起こり得る副作用がありました。一方、誤登録への守りは短縮後も次のとおり働きます — 自動検算が食い違いを検出している間、<b>通常の自動処理は誤った対応表へ票を流さない</b>ため、多くの場合は取消・登録し直しが可能なままです。比較の結果、<b>投票の反映を速くする(NFT の窓をなくす)ことを優先し、対応しきれない誤登録は「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針としました。</p>
  <p style="margin:0 0 6px;font-size:14px"><b>短縮の代償(正直な限界)</b>: 票の投函は誰でも実行できる操作(クラウド障害時の救済経路)なので、<b>悪意の第三者が解禁(約 2 分)後に公開署名を直接投函すると、自動検算が止めていても対応表はその時点で取消不能になります</b>(旧 24 時間案は、この最初の窓をコントラクトの仕様として防いでいました)。この場合も含め、誤った投票が Nouns DAO に確定するのを防ぐ最後の砦は<b>管理者による停止</b>です — 検算の警告は数分で出るため、登録が締切間際でない限り、管理者には通常は数日の対応時間があります。停止スイッチは仕組み全体に効くため、停止中は他の議案の自動投票も一時止まります(当該議案の終了後に再開します)。</p>
  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>


<h2 id="limits"><span class="no">4.</span>補えること・補えないこと</h2>
<p>Snapshot には「署名だけ・ガス代 0 円」という大きな長所がある一方、結果がブロックチェーンの外にあることから来る弱点もあります。新しい仕組みは<b>長所を残したまま弱点を補う</b>ことを狙っていますが、<b>すべては補えません</b>。分けて書きます。</p>
<h3>A. 補えるもの</h3>
<div class="tbl"><table>

    constructor(
        address pnouns_, address nounsDAO_, address owner_, address registrar_,
        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
    ) Ownable(owner_) {
        pnouns = IERC721(pnouns_);
        nounsDAO = INounsDAO(nounsDAO_);
        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
        spaceHash = keccak256(bytes(space_));
        space = space_;
        registrar = registrar_;
        marginBlocks = marginBlocks_;
        registrationDelayBlocks = registrationDelayBlocks_;
        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
    }

    // ---- 設定 ----
    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
    receive() external payable {}

    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = keccak256(bytes(snapshotProposal));
        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
        if (nounsProposalId == 0) revert NotRegistered();
        snapToNouns[h] = nounsProposalId;
        nounsToSnap[nounsProposalId] = h;
        registeredAtBlock[nounsProposalId] = block.number;
        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
        emit ProposalRegistered(nounsProposalId, snapshotProposal);
    }

    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
    function unregisterProposal(uint256 nounsProposalId) external {
        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
        bytes32 h = nounsToSnap[nounsProposalId];
        if (h == bytes32(0)) revert NotRegistered();
        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
        delete snapToNouns[h];
        delete nounsToSnap[nounsProposalId];
        delete registeredAtBlock[nounsProposalId];
        delete eligibleAtBlock[nounsProposalId];
        emit ProposalUnregistered(nounsProposalId, h);
    }

    // ---- 参照 ----
    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
        Tally storage t = _tallies[proposalId];
        (tokens, voters) = _arrays(t);
        return (tokens, voters, t.executed, t.result);
    }
    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
    }
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }
            v.timestamp,
            keccak256(bytes(v.proposal)),
            v.choice,
            keccak256(bytes(v.reason)),
            keccak256(bytes(v.app)),
            keccak256(bytes(v.metadata))
        ));
        return keccak256(abi.encodePacked("\x19\x01", SNAP_DOMAIN_SEPARATOR, structHash));
    }

    // ---- 投票 ----
    /// @notice Snapshot の投票署名をまとめて検証・集計する。誰でも呼べ、ガスは預け金から払い戻し。1 バッチ 1 提案。
    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
        uint256 startGas = gasleft();
        if (votes.length == 0) return;
        bytes32 firstProp = keccak256(bytes(votes[0].proposal));
        uint256 nounsId = snapToNouns[firstProp];
        if (nounsId == 0) revert NotRegistered();
        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
        uint32 snapCounted;
        for (uint256 i = 0; i < votes.length; i++) {
            SnapVote calldata v = votes[i];
            if (keccak256(bytes(v.proposal)) != firstProp) revert MixedProposals();
            bytes32 digest = snapVoteDigest(v);
            address fromAddr = _parseAddress(v.from);
            if (fromAddr.code.length == 0) {
                // EOA: ECDSA 復元が from と一致すること
                if (ECDSA.recover(digest, v.signature) != fromAddr) revert FromMismatch();
            } else {
                // スマートウォレット(Safe 等): EIP-1271 で検証
                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
            }
            uint8 support = _choiceToSupport(v.choice);
            snapCounted += _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
        }
        snapshotVotesCounted[nounsId] += snapCounted;
        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
        _refundGas(startGas, votes.length, nounsId);
    }

    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
        uint256 startGas = gasleft();
        if (support > ABSTAIN) revert InvalidChoice();
        // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
        _refundGas(startGas, 1, nounsProposalId);
    }

    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal returns (uint32) {
        if (tokenIds.length == 0) revert NoTokenIds();
        if (excluded[voter]) revert ExcludedVoter(voter);

        Tally storage t = _tallies[proposalId];
        uint256 deadline = t.deadline;
        if (deadline == 0) {
            uint8 st = nounsDAO.state(proposalId);
            if (st != STATE_PENDING && st != STATE_ACTIVE) revert ProposalNotVotable(st);
            deadline = voteDeadline(proposalId);
            t.deadline = uint48(deadline);
            counted++;
        }
    }

    function _addTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
        // voters=0 は「補完」(同一署名で token を追加)の場合
        if (s == FOR) { t.forTokens += tokens; t.forVoters += voters; }
        else if (s == AGAINST) { t.againstTokens += tokens; t.againstVoters += voters; }
        else { t.abstainTokens += tokens; t.abstainVoters += voters; }
    }
    function _subTally(Tally storage t, uint8 s, uint32 tokens, uint32 voters) internal {
        if (s == FOR) { t.forTokens -= tokens; t.forVoters -= voters; }
        else if (s == AGAINST) { t.againstTokens -= tokens; t.againstVoters -= voters; }
        else { t.abstainTokens -= tokens; t.abstainVoters -= voters; }
    }

    // ---- 実行 ----
    function execute(uint256 proposalId) external nonReentrant {
        Tally storage t = _tallies[proposalId];
        if (t.executed) revert AlreadyExecuted();
        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
        if (block.number < deadline) revert VotingNotClosed();
        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes();
        uint8 support = _decide(tokens, voters);
        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
        t.executed = true; t.result = support;
        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
        emit Executed(proposalId, support, tokens, voters, true);
    }

    // ---- 内部 ----
    function _choiceToSupport(uint32 choice) internal pure returns (uint8) {
        if (choice == 1) return FOR;
        if (choice == 2) return AGAINST;
        if (choice == 3) return ABSTAIN;
        revert InvalidChoice();
    }

    /// @dev "0x…" 42 文字の 16 進文字列を address へ厳密変換(不正なら revert)
    function _parseAddress(string calldata str) internal pure returns (address) {
        bytes calldata b = bytes(str);
        if (b.length != 42 || b[0] != "0" || (b[1] != "x" && b[1] != "X")) revert InvalidFromAddress();
        uint160 v;
        for (uint256 i = 2; i < 42; i++) {
            uint8 c = uint8(b[i]);
    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
    const { block, proposals } = await recentProposals(c, pc);
    await reconcileRecent(c, pc, wc, store, proposals);
    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
    let snapByNouns = new Map();
    let unresolvedIds = new Set();
    let mappingsResolved = false;
    if (c.snapshotSpace) {
      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
        ], allowFailure: false });
        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
        if (c.network === "mainnet") {
          const relayerAddr = wc?.account?.address || null;
          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
        }
        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
        spaceCheckedAt = Date.now();
      }
      try {
        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
        const { mappings, unresolved } = await resolveMappings(c, pc, active);
        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
        unresolvedIds = new Set((unresolved || []).map(Number));
        mappingsResolved = true;
      }
      catch (e) { await notifyError(c, "snapshot hub", e); }
      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
      // 最終結果として確定してしまう。
      if (!mappingsResolved) return;
    }
    for (const p of proposals) {
      if (p.state !== 0 && p.state !== 1) continue;
      try {
        const snapInfo = snapByNouns.get(p.id) || null;
        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
          if (!(await store.getFlag(`unresolved:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
          }
          continue;
        }
        const mg = await metagovInfo(c, pc, p.id);
        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
        }
        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
        let timelineBad = false;
        if (c.snapshotSpace && snapInfo) {
          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
          }
        }
        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
        let graceBad = false;
        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
          }
        }
        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
        // 「告知済み」が記録されて正しい URL の再告知も止まる。
        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
          await announceNew(c, pc, store, p, block, snapInfo);
        }
        if (linkBad && c.network === "mainnet") continue;
        if (timelineBad && c.network === "mainnet") continue;
        if (graceBad && c.network === "mainnet") continue;
        if (!wc) continue;
        if (block < mg.deadline) {
          if (c.snapshotSpace) {
            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
            // これを投函失敗として数えると、猶予中(24h)に届いた正常票が dead-letter 化されるため、
            // 解禁ブロックまで投函自体を行わない(票は Snapshot に残り、解禁後に投函される)。
            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
              const rush = shouldRushSubmit(c, block, mg.deadline);
              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
            }
          }
          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
        } else if (!c.snapshotSpace || snapInfo) {
          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
          // 最終防壁(第15回監査): 締切時点でハブ上の投票者数が「オンチェーン計上 + dead-letter」を
          // 上回るなら、未反映の票が残っている。graceBad の見積り(最初の 1 wave 分)では
          // 21 票以上の滞留を排出しきれないケースがあり、部分集計の確定を許してしまうため、
          // ここで実数を照合する。mainnet では確定を止めて警告する(手動 execute で救済可能)。
          if (c.snapshotSpace && snapInfo && !mg.executed) {
            let backlog = null;
            try {
              const hubVoters = await snapshotVoterCount(c, snapInfo.snapId);
              const deadArr = (await store.kvRaw.get(deadKey(store, p.id), "json")) || [];
              const counted = mg.voters[0] + mg.voters[1] + mg.voters[2];
              backlog = hubVoters - counted - deadArr.length;
            } catch (e) { console.warn(`[worker] prop ${p.id}: backlog check failed: ${e.message}`); }
            if (backlog === null || backlog > 0) {
              if (!(await store.getFlag(`backlogwarn:${p.id}`))) {
                const sent = await notify(c, [`⚠️ Prop ${p.id}: 締切時点で Nouns DAO に反映されていない票が${backlog === null ? "ないか確認できません" : ` ${backlog} 名分残っています`}。`, c.network === "mainnet" ? "部分的な集計を最終結果にしないため、自動 execute を停止しました。票を確認のうえ、手動 execute で確定してください。" : "テスト環境のため execute は続行します。"].join("\n"));
docs/RUNBOOK-MAINNET.md:33:- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
docs/RUNBOOK-MAINNET.md:104:3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
relayer-cf/wrangler.toml:11:crons = ["* * * * *"]
relayer-cf/wrangler.toml:39:crons = ["*/2 * * * *"]
relayer-cf/wrangler.toml:52:MIN_PENDING_AGE_SEC = "120"
relayer-cf/src/worker.js:1:// cron ワーカー: 告知 / 投函 / execute / 残高警告。
relayer-cf/src/worker.js:251:      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
relayer-cf/src/worker.js:263:          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
relayer-cf/src/worker.js:271:        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
relayer-cf/src/worker.js:310:      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
relayer-cf/src/worker.js:477:        const floor = Math.max(10, c.minRegistrationDelay); // 絶対下限 10 ブロック(約 2 分)。運用値も 10(2026-08-21 決定)
relayer-cf/src/worker.js:530:          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/index.js:1:// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信(public/_headers で CSP)。
relayer-cf/src/index.js:215:  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
relayer-cf/src/chain.js:53:    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
relayer-cf/src/chain.js:54:    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
relayer-cf/src/chain.js:56:    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
relayer-cf/src/chain.js:62:// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
relayer-cf/src/chain.js:64:  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/chain.js:73:// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
relayer-cf/src/chain.js:78:  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
relayer-cf/src/chain.js:81://   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
relayer-cf/src/chain.js:84:  const ticks = Math.floor(secsLeft / c.cronSec);

exec
/bin/bash -lc "sed -n '1,165p' relayer-cf/test/worker-tick.test.mjs; sed -n '165,315p' relayer-cf/test/worker-tick.test.mjs; git diff d23ed75"'^ d23ed75 -- docs/RUNBOOK-MAINNET.md docs/member-proposal-unified.html docs/AUDIT-RESPONSE-2026-08-18.md; git show d23ed75''^:docs/member-proposal-unified.html | sed -n '"'280,294p'; sed -n '14040,14310p' docs/audit-16-codex-raw.md" in /mnt/data/pnouns-voter
 succeeded in 0ms:
// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { keccak256, stringToBytes, parseEther, ContractFunctionRevertedError } from "viem";
import { METAGOV_ABI } from "../src/abi.js";
import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";

const VOTER = "0x1000000000000000000000000000000000000001";
const PNOUNS = "0x1000000000000000000000000000000000000002";
const DAO = "0x1000000000000000000000000000000000000003";
const TOKEN = "0x1000000000000000000000000000000000000004";
const OWNER = "0x2000000000000000000000000000000000000001";
const REGISTRAR = "0x2000000000000000000000000000000000000002";
const RELAYER = "0x2000000000000000000000000000000000000003";
const SPACE = "earl-grey.eth";
const SNAP_ID = "0x" + "ab".repeat(32);
const SNAP_HASH = keccak256(stringToBytes(SNAP_ID));
const WEBHOOK = "https://discord.test/webhook";
const HUB = "https://hub.test";

// ---- 偽 KV ----
function fakeKV() {
  const data = new Map(); const ops = [];
  return {
    data, ops,
    async get(k, type) { ops.push(["get", k]); const v = data.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
    async put(k, v) { ops.push(["put", k]); data.set(k, String(v)); },
    async delete(k) { ops.push(["delete", k]); data.delete(k); },
    async list({ prefix }) { ops.push(["list", prefix]); return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: null })), list_complete: true }; },
  };
}

// ---- 偽 publicClient: functionName で応答を引く ----
function fakePC(h) {
  const calls = [];
  const one = (x) => { calls.push(x.functionName); const f = h[x.functionName]; if (!f) throw new Error(`fakePC: no handler for ${x.functionName}`); return f(x.args || []); };
  return {
    calls,
    async readContract(x) { return one(x); },
    async multicall({ contracts, allowFailure }) {
      return contracts.map((x) => {
        try { const r = one(x); return allowFailure ? { status: "success", result: r } : r; }
        catch (e) { if (allowFailure) return { status: "failure", error: e }; throw e; }
      });
    },
    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
    async getBalance() { calls.push("getBalance"); return parseEther("1"); },
    async getTransactionReceipt() { throw new Error("not found"); },
    async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
    async simulateContract(x) { calls.push("simulate:" + x.functionName); if (h.simulateContract) return h.simulateContract(x); return { request: {} }; },
  };
}

// ---- fetch mock: ハブと Discord を演じる ----
const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0, envelope: null };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith(HUB)) {
    F.hubCalls++;
    const r = F.hub.shift();
    if (r instanceof Error) throw r;
    if (typeof r === "number") return new Response("error", { status: r });
    return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
  }
  if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
  if (u.includes("/ipfs")) { return F.envelope ? new Response(JSON.stringify(F.envelope), { status: 200 }) : new Response("nf", { status: 404 }); }
  throw new Error("unexpected fetch: " + u);
};

function baseEnv(kv, over = {}) {
  return { NETWORK: "sepolia", RPC_URL: "http://rpc.test", VOTER, PNOUNS: PNOUNS, NOUNS_DAO: DAO, NOUNS_TOKEN: TOKEN,
    EXPLORER: "https://sepolia.etherscan.io", SNAPSHOT_SPACE: SPACE, SNAPSHOT_HUB: HUB,
    DISCORD_WEBHOOK_URL: WEBHOOK, STATE: kv, SCAN_PROPOSALS: "3", ...over };
}
// 提案 1 件(state Active、mg.deadline=195)を返す標準ハンドラ
function handlers(over = {}) {
  return {
    __block: 100,
    proposalCount: () => 1n,
    proposals: () => [1n, OWNER, 0n, 0n, 0n, 90n, 200n, 0n, 0n, 0n, false, false, false, 0n, 50n],
    state: () => 1,
    spaceHash: () => keccak256(stringToBytes(SPACE)),
    registrationDelayBlocks: () => 400n,
    owner: () => OWNER,
    registrar: () => REGISTRAR,
    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
    tally: () => [[0n, 0n, 0n], [0n, 0n, 0n], false, 0],
    voteDeadline: () => 195n,
    getCurrentVotes: () => 2n,
    currentResult: () => 2,
    getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
    liveMode: () => true,
    eligibleAtBlock: () => 50n,
    ...over,
  };
}
const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
const setup = (h, envOver = {}, wallet = null) => {
  const kv = fakeKV(); const pc = fakePC(h);
  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() }); // 残高チェックは対象外の tick が既定
  return { kv, pc, env: baseEnv(kv, envOver) };
};
const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));

beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; F.envelope = null; __setClientsForTests(null); });

test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
  const { kv, env } = setup(handlers());
  F.hub = [new Error("network down")];
  await tick(env);
  assert.equal(F.discordBodies.filter((b) => b.includes("投票受付を開始")).length, 0, "告知しない");
  assert.equal(putsOf(kv, "announced").length, 0);
  assert.equal(putsOf(kv, "executed").length, 0);
  assert.ok(F.discordBodies.some((b) => b.includes("エラー")), "エラー通知は出る");
});

test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
  const { kv, env } = setup(handlers());
  F.hub = [{ proposals: [] }, { proposals: [] }]; // 1 回目 20 件クエリ・2 回目 逆引き 200 件クエリ
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("取得できません")), "unresolved 警告");
  assert.equal(putsOf(kv, "flag:unresolved:1").length, 1);
  assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
  // 2 tick 目: フラグ済みなので再警告なし・追加書き込みなし
  F.hub = [{ proposals: [] }, { proposals: [] }];
  const n = F.discordBodies.length; const w = kv.ops.filter(([op]) => op === "put").length;
  await tick(env);
  assert.equal(F.discordBodies.length, n, "再警告しない");
  assert.equal(kv.ops.filter(([op]) => op === "put").length, w, "KV write が増えない");
});

test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
  const { kv, env } = setup(handlers());
  F.hub = [hubProposal("https://nouns.wtf/vote/999")]; // 別議案を指す
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
  assert.equal(putsOf(kv, "announced").length, 0, "誤った URL を告知しない");
});

test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
  const { kv, env } = setup(handlers());
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  F.discordStatus = 500;
  await tick(env);
  assert.equal(putsOf(kv, "announced").length, 0, "送信失敗なら告知済みにしない");
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  F.discordStatus = 200;
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("投票受付を開始")));
  assert.equal(putsOf(kv, "announced").length, 1, "成功した tick で告知済みになる");
  assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
});

test("mainnet: 猶予がコード下限 10 未満なら何もせず停止(ハブにも触れない)", async () => {
  const { env } = setup(handlers({ registrationDelayBlocks: () => 5n }), {
    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(10, …) が効くことの確認
  });
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
  assert.equal(F.hubCalls, 0, "ハブに到達しない");
  assert.equal(F.hubCalls, 0, "ハブに到達しない");
});

test("mainnet: 猶予が運用値 10 ちょうどなら処理に進む", async () => {
  const { env } = setup(handlers({ registrationDelayBlocks: () => 10n }), {
    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
  });
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  await tick(env);
  assert.ok(F.hubCalls >= 1, "ハブに到達する(fail-closed が誤発動しない)");
});

test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
  const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
  }, { account: { address: OWNER } });
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("同一アドレス")), "分離違反の通知");
  assert.equal(F.hubCalls, 0);
});

test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
  const { env } = setup(handlers(), {
    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
    MIN_REGISTRATION_DELAY: "abc",
  });
  await assert.rejects(() => tick(env), /MIN_REGISTRATION_DELAY/);
});

test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
  const { pc, env } = setup(handlers());
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  await tick(env);
  const first = pc.calls.filter((f) => f === "spaceHash").length;
  assert.equal(first, 1);
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  await tick(env); // __reset していないので spaceCheckedAt は保持される
  assert.equal(pc.calls.filter((f) => f === "spaceHash").length, 1, "2 tick 目は確認しない");
});

test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
  const wallet = { account: { address: RELAYER } };
  // ケース A: 登録済み + 解決済み → maybeExecute が "no votes" を記録
  {
    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
    await tick(env);
    const put = putsOf(kv, "executed:1");
    assert.equal(put.length, 1, "no votes が確定される");
    assert.ok(kv.data.get(put[0][1]).includes("no votes"));
  }
  // ケース B: 未登録(対応表なし) → execute もスキップ(登録遅れの提案を票ゼロで切り捨てない)
  {
    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
    F.hub = [{ proposals: [] }]; // 登録なしなので逆引きは発生しない
    await tick(env);
    assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
  }
});

test("第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない", async () => {
  const wallet = { account: { address: RELAYER } };
  // ケース A: 猶予中(block=100 < eligibleAt=150 < 締切) → 対応付け解決後、票の取得にすら行かない
  {
    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
    await tick(env);
    assert.equal(F.hubCalls, 1, "ハブ呼び出しは対応付けの 1 回だけ(votes クエリなし)");
    assert.equal(putsOf(kv, "snapdrop").length, 0, "drop を数えない");
    assert.equal(kv.ops.filter(([op, k]) => k.includes("snapsent")).length, 0, "投函処理に入らない");
    assert.equal(putsOf(kv, "announced").length, 1, "告知自体は行われる(Snapshot では投票できる)");
  }
  // ケース B: 解禁済み(eligibleAt=50 <= block=100) → 投函処理に入る(votes クエリが飛ぶ)
  {
    const { env } = setup(handlers(), {}, wallet);
    F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
    await tick(env);
    assert.ok(F.hubCalls >= 2, `votes クエリに到達する (hubCalls=${F.hubCalls})`);
  }
});

test("ハブが GraphQL errors を返した場合も fail-closed", async () => {
  const { kv, env } = setup(handlers());
  F.hub = [{ __errors: true }];
  // fetch mock は data を包むので、errors 応答は直接 Response を作る
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith(HUB)) { F.hubCalls++; return new Response(JSON.stringify({ errors: [{ message: "boom" }] }), { status: 200 }); }
    return orig(url, init);
  };
  try {
    await tick(env);
    assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
    assert.equal(putsOf(kv, "executed").length, 0, "確定もしない");
  } finally { globalThis.fetch = orig; }
});

test("確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される", async () => {
  const wallet = { account: { address: RELAYER } };
  const { kv, env } = setup(handlers(), {}, wallet);
  // 送信中レコードを仕込み、受信確認済み(receipt 成功)にして通知経路へ入れる
  const ns = `11155111:${VOTER.toLowerCase()}:`;
  kv.data.set(`${ns}snapsent:1`, JSON.stringify({ txs: ["0x" + "cd".repeat(32)], count: 1, at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }));
  const pc = fakePC(handlers());
  pc.getTransactionReceipt = async () => ({ status: "success", gasUsed: 100000n });
  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
  F.discordStatus = 500;
  await tick(env);
  assert.equal(putsOf(kv, "pendingnotes").length, 1, "失敗した通知がキューに積まれる");
  // 次 tick: Discord 復旧 → flush で再送され、キューが消える
  F.hub = [hubProposal("https://nouns.wtf/vote/1"), { votes: [] }, { votes: [] }, { votes: [] }];
  F.discordStatus = 200;
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("反映しました")), "持ち越した通知が再送される");
  assert.equal(kv.data.has(`${ns}pendingnotes`), false, "キューが空になり削除される");
});

test("第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する", async () => {
  const wallet = { account: { address: RELAYER } };
  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("登録が遅すぎます")), "専用警告");
  assert.equal(putsOf(kv, "flag:gracewarn:1").length, 1);
  assert.equal(putsOf(kv, "announced").length, 0, "投函できない提案を告知しない");
});

// ---- 実投函経路(第14回監査 Low: mock で票 1 件を最後まで通す) ----
const VOTER_A = "0x3000000000000000000000000000000000000001";
const CID = "bafytest1";
const TS = 1700000000;
function submitHandlers(over = {}) {
  return handlers({
    totalSupply: () => 2n,
    ownerOf: () => VOTER_A, // token 1,2 とも voterA 保有
    voterRec: () => [false, 0, false, 0n, "0x" + "00".repeat(32)],
    hasTokenVoted: () => false,
    ...over,
  });
}
const hubWithVote = () => [hubProposal("https://nouns.wtf/vote/1"), { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
const goodEnvelope = () => ({ data: { message: { from: VOTER_A, timestamp: TS, proposal: SNAP_ID, choice: 1, reason: "", app: "", metadata: "" } }, sig: "0x" + "11".repeat(65) });

test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
  const writes = [];
  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
  const { kv, env } = setup(submitHandlers(), {}, wallet);
diff --git a/docs/AUDIT-RESPONSE-2026-08-18.md b/docs/AUDIT-RESPONSE-2026-08-18.md
index 315dd02..5fe7e18 100644
--- a/docs/AUDIT-RESPONSE-2026-08-18.md
+++ b/docs/AUDIT-RESPONSE-2026-08-18.md
@@ -329,3 +329,17 @@ deploy スクリプト既定/検証 10、check-deploy EXPECT_DELAY 既定 10、R
 (§3 備え 1 の理屈を全面改訂・§4 反映タイミング・§10 検証パック)。
 テスト更新: 下限 10 の fail-closed / ちょうど 10 で処理続行の 2 本(計 45 pass)。
 **Codex による再監査を実施予定(この変更が前提を崩していないかの確認)。**
+
+---
+
+## 第16回監査 (2026-08-21, Codex CLI / read-only) — 猶予 10 ブロック化の検証
+
+対象: e152a34。生ログ: `docs/audit-16-codex-raw.md`
+確認済み(問題なし): 第13回の dead-letter 対策・第14回 graceBad・第15回の未反映票ガードは
+delay=10 でも維持。Worker 下限 10 の迂回耐性(env/NaN/デプロイ/照合)も健在。
+
+| # | 重大度 | 指摘 | 対応 |
+|---|---|---|---|
+| 1 | **High** | 資料の主張が強すぎる: ①「受付前に検算が必ず 1 周走る」はコード上の保証ではない ②「検算で捕まる誤りはいつでも取消可能」は誤り — 投函は permissionless のため、**第三者が解禁(約2分)後に公開署名を直接投函すると取消不能になる**(旧 24h はこの窓をコントラクトで防いでいた) ③「数日間止められる」は管理者が締切前に反応できた場合の運用保証 | 資料・RUNBOOK を推奨どおり訂正(通常経路の挙動として記述・第三者直接投函の限界を「短縮の代償」として明記・停止はグローバルに効く旨も追記)。推奨テスト(mainnet + linkOk=false + 解禁済み + 実票 → 投函しない)を追加(46 pass)。コントラクト側の対策(validated 状態の追加 / 投函の認可制)は permissionless 救済経路を壊すため不採用 — この残余リスクは「稀な誤登録 × 敵対者の先回り」の複合条件であり、管理者停止+手動運用で受け止める(ユーザー決定の枠組みどおり) |
+| 2 | Low | RUNBOOK に旧 24h 記述が残存 | 実際の条件(解禁前 or accepted==0 の間は取消可 / 受理後は停止+手動)に置換 |
+| 3 | Low | 「日常的な副作用」「数日間」の条件省略 | 「通常運用でも起こり得る」「登録が締切間際でない限り通常は数日」に条件明示 |
diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
index 27823e4..3134119 100644
--- a/docs/RUNBOOK-MAINNET.md
+++ b/docs/RUNBOOK-MAINNET.md
@@ -112,8 +112,10 @@ npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Disc
 
 - Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
   dApp の「手動 execute」または Etherscan から `execute(proposalId)`
-- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
-  (Worker の自動照合が Discord に⚠️を出す)
+- 誤登録の疑い: **解禁前、または解禁後でも `snapshotVotesAccepted == 0` の間**は registrar/owner から
+  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
+  食い違う間は Worker は投函しない)。第三者の直接投函で 1 票でも受理されたら取消不能 →
+  `setLiveMode(false)` + 当該議案は手動投票へ
 - **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
   (再登録すると猶予がその時点から再カウントされ、さらに遅くなる)。この提案は自動反映を
   諦め、**手動運用に切り替える**(従来どおり委任元から手動投票)。締切時に未反映の票が
diff --git a/docs/member-proposal-unified.html b/docs/member-proposal-unified.html
index e6df84a..e21457d 100644
--- a/docs/member-proposal-unified.html
+++ b/docs/member-proposal-unified.html
@@ -277,15 +277,16 @@
   <p style="margin:0 0 6px">確認 1 の<b>対応表(この Snapshot 投票 ＝ Nouns の第 N 号議案)</b>だけは、コントラクトが自力で確かめられません。Snapshot の投票署名に Nouns の議案番号が含まれていないためです(Snapshot の仕様)。運用は<b>全自動</b>ですが、「そのプログラムと鍵を信頼している」という意味で、ここだけは性質が異なります。</p>
   <p style="margin:0 0 6px"><b>そのための備えを 4 段用意しています。</b></p>
   <ol style="margin:0 0 4px">
-    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 受付が始まる前に、必ず自動検算(備え 2)が先に走ることを保証します。</li>
+    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 登録の処理回と受付開始の処理回を分けるための間隔です(通常の自動処理は、これとは別に毎回、投函の直前にも検算します)。</li>
     <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
     <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
     <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   </ol>
 </div>
 <h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
-  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は「受付が始まる前に自動検算が必ず 1 回走る」ことの保証で、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
-  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
+  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は登録と受付開始の処理回を分けるためのもので、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
+  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 旧案には<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という、通常運用でも起こり得る副作用がありました。一方、誤登録への守りは短縮後も次のとおり働きます — 自動検算が食い違いを検出している間、<b>通常の自動処理は誤った対応表へ票を流さない</b>ため、多くの場合は取消・登録し直しが可能なままです。比較の結果、<b>投票の反映を速くする(NFT の窓をなくす)ことを優先し、対応しきれない誤登録は「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針としました。</p>
+  <p style="margin:0 0 6px;font-size:14px"><b>短縮の代償(正直な限界)</b>: 票の投函は誰でも実行できる操作(クラウド障害時の救済経路)なので、<b>悪意の第三者が解禁(約 2 分)後に公開署名を直接投函すると、自動検算が止めていても対応表はその時点で取消不能になります</b>(旧 24 時間案は、この最初の窓をコントラクトの仕様として防いでいました)。この場合も含め、誤った投票が Nouns DAO に確定するのを防ぐ最後の砦は<b>管理者による停止</b>です — 検算の警告は数分で出るため、登録が締切間際でない限り、管理者には通常は数日の対応時間があります。停止スイッチは仕組み全体に効くため、停止中は他の議案の自動投票も一時止まります(当該議案の終了後に再開します)。</p>
   <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
 
 
    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 受付が始まる前に、必ず自動検算(備え 2)が先に走ることを保証します。</li>
    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
    <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
    <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
  </ol>
</div>
<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は「受付が始まる前に自動検算が必ず 1 回走る」ことの保証で、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 自動検算で捕まるタイプの誤登録は、<b>検算が食い違いを検出している間は本番が票を流すこと自体を止め続ける</b>ため、猶予の長さに関係なく、いつでも取り消して登録し直せます。長い猶予が守るのは「検算をすり抜ける誤り(下記の限界)が起きたときに、人が気づいて登録し直す時間」だけですが、その代わりに<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という日常的な副作用がありました。比較の結果、<b>すり抜け型の誤りは「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針とし、猶予を約 2 分に短縮しています(誤った投票が Nouns DAO に出る前に止める力は、確定までの数日間、猶予と無関係に維持されます)。</p>
  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>


<h2 id="limits"><span class="no">4.</span>補えること・補えないこと</h2>
<p>Snapshot には「署名だけ・ガス代 0 円」という大きな長所がある一方、結果がブロックチェーンの外にあることから来る弱点もあります。新しい仕組みは<b>長所を残したまま弱点を補う</b>ことを狙っていますが、<b>すべては補えません</b>。分けて書きます。</p>
<h3>A. 補えるもの</h3>
何が起きるか:

資料は「10 ブロックにより、受付開始前に必ず自動検算が1回走る」「検算が捕まえる誤登録はいつでも取消可能」としていますが、次の理由で保証されません。

1. 10 ブロックと cron 2 分は同程度であり、登録と cron が同時刻付近なら境界競合します。Cloudflare cron の遅延・失敗もあるため、「別 tick が解禁前に完了する」コード上の保証はありません。
2. Worker の同一 tick 内では `linkOk` 判定が投函より先に走るため、**Worker 自身は誤対応表へ投函しません**。ここは正しく実装されています。
3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
4. 1票でも受理されると `snapshotVotesAccepted != 0` となり、`unregisterProposal()` は不能です。
5. `execute()` も permissionless です。Worker が `linkBad` で自動 execute を止めても、`liveMode=true` のままなら第三者による execute は可能です。
6. `setLiveMode(false)` は Nouns DAO への最終投票を止めますが、Snapshot 票の受理や取消不能化を止めるスイッチではありません。管理者が警告を見てオンチェーン停止するまでの人的対応が必要です。

したがって「検算で捕まる誤りは猶予に関係なくいつでも取消可能」は誤りです。「管理者停止により Nouns DAO への誤投票を止められる」も、自動保証ではなく、締切前に管理者が反応できた場合の運用保証です。

推奨:

- 強い保証が必要なら、対応表に `validated/activated` 状態を追加し、検算成功をオンチェーンで明示してから `castSnapshotVotes()` を許可する。
- または Snapshot 投函と `execute` を認可 relayer に限定し、緊急時の手動経路を別途設ける。
- 現設計を維持する場合は資料を次のように訂正する。
  - 「必ず1周走る」ではなく「通常の Worker 経路では毎 tick、投函前に検算する」
  - 「いつでも取消可能」ではなく「Worker は投函しないが、permissionless な直接投函が先に行われると取消不能」
  - 「確定まで数日間止められる」ではなく「管理者が締切前に `setLiveMode(false)` を採掘させれば止められる」
- Worker テストに、mainnet・`linkOk=false`・`block >= eligibleAt`・実票ありでも `writeContract` が呼ばれないケースを追加する。

### [Low] RUNBOOK に旧 24h 記述が残っている

該当箇所:

- [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:115)

何が起きるか:

障害対応に「誤登録の疑い: 24h 猶予内なら」と残っています。運用値10ブロックと矛盾し、事故時に存在しない対応時間を期待させます。

推奨:

「解禁前かつ `snapshotVotesAccepted == 0` の間に取消」など、実際のコントラクト条件に置き換えてください。

### [Low] 「日常的な副作用」「数日間」は条件の省略が強い

該当箇所:

- [member-proposal-unified.html](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:288)
- [AUDIT-RESPONSE-2026-08-18.md](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:319)

何が起きるか:

旧24hで「最大24時間反映が遅れる」「その間に移転した token が元投票者分として数えられない」は正しいです。ただし NFT 移転が実際に発生した場合だけなので、「日常的」は定量的根拠のない強い表現です。

また、登録が遅い場合には停止判断まで必ず「数日間」あるとは限りません。Worker の `graceBad` は遅い登録を止めますが、permissionless 呼出し自体は止めません。

推奨:

「通常運用でも発生し得る副作用」「通常、登録が十分早ければ締切まで対応時間がある」と条件を明示してください。

## 問題なしと確認した点

### 第13回 High: 猶予中の dead-letter 化

問題ありません。

- `block < eligibleAt` 中は `submitFromSnapshot()` を呼びません。
- 境界でゲートを通った後に `RegistrationTooRecent` が返っても、ABI で復号して transient と扱い、`snapdrop` に加算しません。
- 一括 simulate と個別 simulate の両方で除外されています。
- `block == eligibleAt` で受付開始するコントラクト条件とも一致しています。

delay=10 でもこのロジックは変わりません。RPC の観測ブロックが古い場合は余計に1 tick待つ安全側の挙動になります。

### `graceBad`

問題ありません。

mainnet既定では:

- `cronSec = 120`
- `submitBufferSec = 120`
- `drainBlocks = ceil(240 / 12) = 20`
- 判定は `eligibleAt + 20 >= deadline`

delayを7200から10へ短縮すると `eligibleAt` が早くなるため、通常登録で `graceBad` が誤発動しやすくなることはありません。締切近くの登録を保守的に停止する既存設計です。

ただし警告文の「票を投函できません」は厳密には「保証された排出時間を確保できません」の意味であり、少数票なら偶然間に合う可能性はあります。

### 第15回 Medium

未反映票の最終ガードは維持されています。締切時に

`Hub投票者数 > オンチェーン計上者数 + dead-letter数`

ならmainnetの自動 executeを止めます。delay=10による破綻はありません。ただし、これも Worker の自動 execute に対する防壁であり、permissionlessな直接 `execute()` は拘束しません。

### Worker 下限10と迂回耐性

Workerについては問題ありません。

- `MIN_REGISTRATION_DELAY=0` でも `Math.max(10, c.minRegistrationDelay)` により絶対下限10。
- 未設定時の既定値も10。
- `abc`、小数、負数は `cfg()` で拒否。
- mainnetではオンチェーン値を毎 tick 読み、10未満ならHubアクセス前に停止。
- deployスクリプトも `REG_DELAY < 10` を拒否。
- `check-deploy` のmainnet既定値も10。

ただし前述のとおり、この下限は Workerの稼働を止める防壁で、コントラクト自身に最小値10を強制するものではありません。ownerがオンチェーン値を10未満に変更した場合、permissionlessな直接呼出しまで止まるわけではありません。

## 下限テスト2本の評価

2本とも意図した分岐を検証できています。

- オンチェーン値5・`MIN_REGISTRATION_DELAY=0`で停止し、Hubへ到達しない  
  → 環境変数による下限迂回を検証。
- オンチェーン値10・環境変数未設定でHubへ到達  
  → 既定値10と境界 `10` の許可を検証。

補強するなら、最初のケースを `delay=9` にして境界直下を直接確認することと、上述の `linkOk=false + eligible済み + 実投函経路` を追加するのが有効です。現行2本自体に誤りはありません。

## テスト結果

`relayer-cf` で実行しました。

- `npm test`: 4テストファイル pass、fail 0
- 補足実行 `npm test -- --test-isolation=none`: **45 tests / 45 pass / fail 0**
- ファイル変更なし、作業ツリーは clean

最終判定: dead-letter・`graceBad`・下限変更そのものは動作していますが、「自動検算が受付より必ず先行し、検出した誤登録をいつでも取消できる」という新しい安全性の説明はクローズできません。オンチェーン activation を導入するか、permissionless 経路を含む実際の信頼モデルへ資料を修正する必要があります。
tokens used
101,270
## 監査結果

結論は **High 1 件、Low 2 件**です。

delay=10 にしても、第13回の dead-letter 対策、第14回の `graceBad`、第15回の未反映票ガードは維持されています。`MIN_REGISTRATION_DELAY=0` による Worker 下限の迂回もできません。

一方、資料の「受付開始前に自動検算が必ず走り、検算で捕まる誤登録はいつでも取消可能」という安全性の主張は、コード上は成立しません。通常の Worker 経路は安全ですが、コントラクトが permissionless なため、第三者が Worker の検算を迂回できます。

### [High] 自動検算はオンチェーン受付・execute を拘束しない

該当箇所:

- [member-proposal-unified.html](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:280)
- [member-proposal-unified.html](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:287)
- [member-proposal-unified.html](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:288)
- [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:33)
- [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:251)
- [PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:362)
- [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:510)

何が起きるか:

資料は「10 ブロックにより、受付開始前に必ず自動検算が1回走る」「検算が捕まえる誤登録はいつでも取消可能」としていますが、次の理由で保証されません。

1. 10 ブロックと cron 2 分は同程度であり、登録と cron が同時刻付近なら境界競合します。Cloudflare cron の遅延・失敗もあるため、「別 tick が解禁前に完了する」コード上の保証はありません。
2. Worker の同一 tick 内では `linkOk` 判定が投函より先に走るため、**Worker 自身は誤対応表へ投函しません**。ここは正しく実装されています。
3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
4. 1票でも受理されると `snapshotVotesAccepted != 0` となり、`unregisterProposal()` は不能です。
5. `execute()` も permissionless です。Worker が `linkBad` で自動 execute を止めても、`liveMode=true` のままなら第三者による execute は可能です。
6. `setLiveMode(false)` は Nouns DAO への最終投票を止めますが、Snapshot 票の受理や取消不能化を止めるスイッチではありません。管理者が警告を見てオンチェーン停止するまでの人的対応が必要です。

したがって「検算で捕まる誤りは猶予に関係なくいつでも取消可能」は誤りです。「管理者停止により Nouns DAO への誤投票を止められる」も、自動保証ではなく、締切前に管理者が反応できた場合の運用保証です。

推奨:

- 強い保証が必要なら、対応表に `validated/activated` 状態を追加し、検算成功をオンチェーンで明示してから `castSnapshotVotes()` を許可する。
- または Snapshot 投函と `execute` を認可 relayer に限定し、緊急時の手動経路を別途設ける。
- 現設計を維持する場合は資料を次のように訂正する。
  - 「必ず1周走る」ではなく「通常の Worker 経路では毎 tick、投函前に検算する」
  - 「いつでも取消可能」ではなく「Worker は投函しないが、permissionless な直接投函が先に行われると取消不能」
  - 「確定まで数日間止められる」ではなく「管理者が締切前に `setLiveMode(false)` を採掘させれば止められる」
- Worker テストに、mainnet・`linkOk=false`・`block >= eligibleAt`・実票ありでも `writeContract` が呼ばれないケースを追加する。

### [Low] RUNBOOK に旧 24h 記述が残っている

該当箇所:

- [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:115)

何が起きるか:

障害対応に「誤登録の疑い: 24h 猶予内なら」と残っています。運用値10ブロックと矛盾し、事故時に存在しない対応時間を期待させます。

推奨:

「解禁前かつ `snapshotVotesAccepted == 0` の間に取消」など、実際のコントラクト条件に置き換えてください。

### [Low] 「日常的な副作用」「数日間」は条件の省略が強い

該当箇所:

- [member-proposal-unified.html](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:288)
- [AUDIT-RESPONSE-2026-08-18.md](/mnt/data/pnouns-voter/docs/AUDIT-RESPONSE-2026-08-18.md:319)

何が起きるか:

旧24hで「最大24時間反映が遅れる」「その間に移転した token が元投票者分として数えられない」は正しいです。ただし NFT 移転が実際に発生した場合だけなので、「日常的」は定量的根拠のない強い表現です。

また、登録が遅い場合には停止判断まで必ず「数日間」あるとは限りません。Worker の `graceBad` は遅い登録を止めますが、permissionless 呼出し自体は止めません。

推奨:

「通常運用でも発生し得る副作用」「通常、登録が十分早ければ締切まで対応時間がある」と条件を明示してください。

## 問題なしと確認した点

### 第13回 High: 猶予中の dead-letter 化

問題ありません。

- `block < eligibleAt` 中は `submitFromSnapshot()` を呼びません。
- 境界でゲートを通った後に `RegistrationTooRecent` が返っても、ABI で復号して transient と扱い、`snapdrop` に加算しません。
- 一括 simulate と個別 simulate の両方で除外されています。
- `block == eligibleAt` で受付開始するコントラクト条件とも一致しています。

delay=10 でもこのロジックは変わりません。RPC の観測ブロックが古い場合は余計に1 tick待つ安全側の挙動になります。

### `graceBad`

問題ありません。

mainnet既定では:

- `cronSec = 120`
- `submitBufferSec = 120`
- `drainBlocks = ceil(240 / 12) = 20`
- 判定は `eligibleAt + 20 >= deadline`

delayを7200から10へ短縮すると `eligibleAt` が早くなるため、通常登録で `graceBad` が誤発動しやすくなることはありません。締切近くの登録を保守的に停止する既存設計です。

ただし警告文の「票を投函できません」は厳密には「保証された排出時間を確保できません」の意味であり、少数票なら偶然間に合う可能性はあります。

### 第15回 Medium

未反映票の最終ガードは維持されています。締切時に

`Hub投票者数 > オンチェーン計上者数 + dead-letter数`

ならmainnetの自動 executeを止めます。delay=10による破綻はありません。ただし、これも Worker の自動 execute に対する防壁であり、permissionlessな直接 `execute()` は拘束しません。

### Worker 下限10と迂回耐性

Workerについては問題ありません。

- `MIN_REGISTRATION_DELAY=0` でも `Math.max(10, c.minRegistrationDelay)` により絶対下限10。
- 未設定時の既定値も10。
- `abc`、小数、負数は `cfg()` で拒否。
- mainnetではオンチェーン値を毎 tick 読み、10未満ならHubアクセス前に停止。
- deployスクリプトも `REG_DELAY < 10` を拒否。
- `check-deploy` のmainnet既定値も10。

ただし前述のとおり、この下限は Workerの稼働を止める防壁で、コントラクト自身に最小値10を強制するものではありません。ownerがオンチェーン値を10未満に変更した場合、permissionlessな直接呼出しまで止まるわけではありません。

## 下限テスト2本の評価

2本とも意図した分岐を検証できています。

- オンチェーン値5・`MIN_REGISTRATION_DELAY=0`で停止し、Hubへ到達しない  
  → 環境変数による下限迂回を検証。
- オンチェーン値10・環境変数未設定でHubへ到達  
  → 既定値10と境界 `10` の許可を検証。

補強するなら、最初のケースを `delay=9` にして境界直下を直接確認することと、上述の `linkOk=false + eligible済み + 実投函経路` を追加するのが有効です。現行2本自体に誤りはありません。

## テスト結果

`relayer-cf` で実行しました。

- `npm test`: 4テストファイル pass、fail 0
- 補足実行 `npm test -- --test-isolation=none`: **45 tests / 45 pass / fail 0**
- ファイル変更なし、作業ツリーは clean

最終判定: dead-letter・`graceBad`・下限変更そのものは動作していますが、「自動検算が受付より必ず先行し、検出した誤登録をいつでも取消できる」という新しい安全性の説明はクローズできません。オンチェーン activation を導入するか、permissionless 経路を含む実際の信頼モデルへ資料を修正する必要があります。

codex
追加テストには重要な不足が見つかりました。`F.envelope` は設定されていますが、Hub の votes 応答に票を投入しておらず、`linkBad` で votes 取得前に `continue` するため、「実票あり」の fixture は実際には存在しません。解禁済み・mainnet・送信可能 wallet でも停止する分岐は確認していますが、第16回推奨条件を完全には再現していません。続けて全テストを実行します。
exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 822ms:
✔ test/accept-deadline.test.mjs (723.662214ms)
✔ test/cursor.test.mjs (755.10409ms)
✔ test/link-check.test.mjs (726.102912ms)
✔ test/worker-tick.test.mjs (761.411309ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 773.502299

exec
/bin/bash -lc 'npm test -- --test-isolation=none && git status --short' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 741ms:
[snapshot hub] network down
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[config] registrationDelayBlocks(5) が最低値 10 未満です
[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(5) が最低値 10 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。
[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[worker] prop 1: backlog check failed: hub: votes count shape
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票がないか確認できません。 ⏎ テスト環境のため execute は続行します。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snapshot hub] hub graphql: [{"message":"boom"}]
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): hub graphql: [{"message":"boom"}] ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: 対応表の登録が遅すぎます。猶予明け(block 300)が締切(block 195)に間に合わず、票を投函できません。 ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] prop 1: registration delay not elapsed — retry next tick
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted.
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 10:57 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票が 2 名分残っています。 ⏎ 部分的な集計を最終結果にしないため、自動 execute を停止しました。票を確認のうえ、手動 execute で確定してください。
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票が 2 名分残っています。 ⏎ テスト環境のため execute は続行します。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。
✔ mainnet: 受付締切はオンチェーン締切の 30 ブロック前 (0.722558ms)
✔ 受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード (0.095725ms)
✔ 最小待機 + cron 間隔 が受付締切〜オンチェーン締切の間に収まる (0.113855ms)
✔ sepolia テスト設定でも受付窓が残る(投票期間 25 ブロック、margin 5) (0.07377ms)
✔ M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件 (0.159813ms)
✔ 受付締切より十分前なら容量は大きく、通常運用を妨げない(1 日前 ≈ 14,000 票) (0.081253ms)
✔ B3-M03R: Snapshot 終了後に cron + buffer の排出時間がなければ unsafe (0.103745ms)
✔ 同一秒に 21 票あっても、送れなかった票の手前で cursor が止まる (0.220669ms)
✔ 未解決票の後ろに反映済みの行があっても、cursor は追い越さない(部分 revert 対策) (0.082405ms)
✔ pNouns 未保有・デッドレターの票は skip 扱いで cursor を進めてよい (0.10684ms)
✔ やり直し(新しい timestamp)と補完(同 timestamp・token 増)を検出する (0.06652ms)
✔ すべて反映済みなら最大 created まで進む (0.042479ms)
✔ 指摘1R: 601 件を複数 tick の offset 走査で末尾まで取得して先頭へ戻る (16.014683ms)
✔ 指摘2: token を入れ替えた場合(保有数 < 計上数)でも補完対象として検出する (0.098545ms)
✔ 指摘3R: 補完用 token 照会は行数ではなく一意な tokenId 数に制限される (2.363005ms)
✔ 指摘2R: 同一 voter の候補は最新 1 件だけをバッチへ入れる (0.116816ms)
✔ 再登録した Snapshot 提案は別の scan offset を使う (0.060644ms)
✔ 正規の URL を検出する (0.359289ms)
✔ 前方一致で誤検出しない (0.077896ms)
✔ 別ドメイン・別パスを拒否する (0.056564ms)
✔ 空・null・不正な入力で例外を投げず false を返す (0.051711ms)
✔ 正規表現メタ文字を含む入力で壊れない (0.032368ms)
✔ URL の直後に句読点や日本語が続いても検出する (0.059918ms)
✔ 末尾処理で別 ID に化けない (0.032076ms)
✔ 改行で分断された URL は検出しない(仕様) (0.025835ms)
✔ 第12回監査の追加ケース (0.03846ms)
✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (2.293292ms)
✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (0.887843ms)
✔ linkOk=false: 警告し、テストネットでも告知はしない (0.55367ms)
✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (7.907368ms)
✔ mainnet: 猶予がコード下限 10 未満なら何もせず停止(ハブにも触れない) (0.355889ms)
✔ mainnet: 猶予が運用値 10 ちょうどなら処理に進む (0.338405ms)
✔ mainnet: owner/registrar/relayer が同一なら停止 (0.253134ms)
✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.282878ms)
✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.648517ms)
✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.825444ms)
✔ 第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない (1.159296ms)
✔ ハブが GraphQL errors を返した場合も fail-closed (0.303238ms)
✔ 確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される (0.922746ms)
✔ 第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する (0.284946ms)
✔ 実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る (1.142028ms)
✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.309024ms)
✔ 実投函: 復号可能な恒久 revert(StaleVote)は drop に数える (0.937751ms)
✔ 猶予境界: block == eligibleAt では投函が始まる (0.583542ms)
✔ 第15回監査: 締切時に未反映の票が残っていれば mainnet は execute しない (0.775467ms)
✔ 第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない (0.336422ms)
ℹ tests 46
ℹ suites 0
ℹ pass 46
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 667.250647

codex
テストは指定の `npm test` が成功し、補足の非分離実行でも 46/46 成功しました。なお「検算済みフラグは permissionless 性を壊す」という却下理由は、そのままでは広すぎます。投函自体を認可制にする案とは異なり、activation 後の投函・execute を誰にでも開いたままにする設計は可能で、失うのは主に activation の可用性です。この違いを踏まえて最終判断を整理しています。
exec
/bin/bash -lc "rg -n \"registerProposal|discussion|nouns.wtf/vote|snapshot|proposal\" relayer-cf/scripts scripts .github --glob '"'!**/node_modules/**'"' | head -n 300; rg -n \"create-and-register\" -S . --glob '"'!**/node_modules/**'"'; sed -n '1,260p' relayer-cf/scripts/create-and-register.mjs 2>/dev/null || true; git show --name-only --format='' d23ed75; git diff-tree --no-commit-id --name-only -r d23ed75" in /mnt/data/pnouns-voter
 succeeded in 0ms:
rg: relayer-cf/scripts: No such file or directory (os error 2)
rg: .github: No such file or directory (os error 2)
scripts/create-and-register.mjs:1:// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
scripts/create-and-register.mjs:9:import snapshot from "@snapshot-labs/snapshot.js";
scripts/create-and-register.mjs:13:import { buildProposal } from "./lib/proposal-format.mjs";
scripts/create-and-register.mjs:24:const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
scripts/create-and-register.mjs:25:const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
scripts/create-and-register.mjs:30:  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
scripts/create-and-register.mjs:31:  const d = r?.data?.proposal?.description;
scripts/create-and-register.mjs:49:  console.log(`discussion: ${p.discussion}`);
scripts/create-and-register.mjs:84:  const client = new snapshot.Client712(SEQ);
scripts/create-and-register.mjs:85:  const receipt = await client.proposal(adapt(bot), bot.address, {
scripts/create-and-register.mjs:86:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
scripts/create-and-register.mjs:87:    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
scripts/create-and-register.mjs:90:  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
scripts/create-and-register.mjs:94:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
scripts/create-and-register.mjs:96:  const tx = await c.registerProposal(receipt.id, nounsId);
scripts/compare-chains.js:8:const daoGetters = ["votingDelay","votingPeriod","proposalThresholdBPS","proposalThreshold","minQuorumVotesBPS","maxQuorumVotesBPS","quorumVotesBPS","objectionPeriodDurationInBlocks","proposalUpdatablePeriodInBlocks","lastMinuteWindowInBlocks","forkPeriod","forkThresholdBPS","forkThreshold","proposalCount","adjustedTotalSupply","timelock","timelockV1","vetoer","admin","forkEscrow","forkDAODeployer","nouns","voteSnapshotBlockSwitchProposalId","MAX_REFUND_PRIORITY_FEE","MAX_REFUND_BASE_FEE","MAX_REFUND_GAS_USED","REFUND_BASE_GAS"];
scripts/sepolia/_watch527.js:8:    const [t, acc, blk] = await Promise.all([c.tally(id), c.snapshotVotesAccepted(id), ethers.provider.getBlockNumber()]);
scripts/check-deploy.mjs:98:      check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
scripts/sepolia/lib.js:14:  "function proposalCount() view returns (uint256)",
scripts/sepolia/lib.js:16:  "function proposalThreshold() view returns (uint256)",
scripts/sepolia/lib.js:17:  "function getReceipt(uint256 proposalId,address voter) view returns (tuple(bool hasVoted,uint8 support,uint96 votes))",
scripts/sepolia/lib.js:18:  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
scripts/sepolia/07-sign-post.js:7:  const { proposals } = await (await fetch(`${API}/api/proposals`)).json();
scripts/sepolia/07-sign-post.js:8:  const target = process.env.PROPOSAL_ID ? proposals.find((p) => p.id === Number(process.env.PROPOSAL_ID)) : proposals.find((p) => p.votable);
scripts/sepolia/07-sign-post.js:9:  if (!target) throw new Error("no votable proposal");
scripts/sepolia/07-sign-post.js:13:    const t = await (await fetch(`${API}/api/tokens/${s.address}?proposalId=${target.id}`)).json();
scripts/sepolia/07-sign-post.js:15:    const signature = await s.signTypedData(cfg.domain, cfg.types, { proposalId: String(target.id), support, tokenIds });
scripts/sepolia/07-sign-post.js:16:    const r = await fetch(`${API}/api/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: String(target.id), support, tokenIds, signature }) });
scripts/lib/proposal-format.mjs:4://  - discussion: https://nouns.wtf/vote/N
scripts/lib/proposal-format.mjs:30:  const url = `https://nouns.wtf/vote/${nounsId}`;
scripts/lib/proposal-format.mjs:33:  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
scripts/sepolia/15-reuse-snap.js:10:  const r = await (await fetch("https://hub.snapshot.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${snapId}") { title votes space { id } } }` }) })).json();
scripts/sepolia/15-reuse-snap.js:11:  const pr0 = r.data.proposal;
scripts/sepolia/15-reuse-snap.js:15:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# reuse test\nsnapshot: ${snapId}`)).wait();
scripts/sepolia/15-reuse-snap.js:16:  const nounsId = await dao.proposalCount();
scripts/sepolia/15-reuse-snap.js:18:  await (await c.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/15-reuse-snap.js:19:  const pr = await dao.proposals(nounsId);
scripts/sepolia/15-reuse-snap.js:20:  console.log(`nouns proposal #${nounsId} start=${pr.startBlock} end=${pr.endBlock} deadline=${await c.voteDeadline(nounsId)} → Worker が処理します`);
scripts/sepolia/06-propose.js:9:  const id = await dao.proposalCount();
scripts/sepolia/06-propose.js:10:  const pr = await dao.proposals(id);
scripts/sepolia/06-propose.js:11:  console.log(`proposal #${id} start=${pr.startBlock} end=${pr.endBlock}`);
scripts/sepolia/14-snap-setup-only.js:1:// Worker 主導 E2E の準備だけ行う: ①Snapshot 提案 ②voter A/B/C 投票 ③Sepolia Nouns 提案 ④registerProposal
scripts/sepolia/14-snap-setup-only.js:4:const snapshot = require("@snapshot-labs/snapshot.js");
scripts/sepolia/14-snap-setup-only.js:11:  const client = new snapshot.Client712("https://seq.snapshot.org");
scripts/sepolia/14-snap-setup-only.js:15:  const receipt = await client.proposal(adapt(bot), bot.address, {
scripts/sepolia/14-snap-setup-only.js:20:    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
scripts/sepolia/14-snap-setup-only.js:22:  console.log("snapshot proposal:", receipt.id);
scripts/sepolia/14-snap-setup-only.js:26:    await client.vote(adapt(w), w.address, { space: SPACE, proposal: receipt.id, type: "single-choice", choice, reason: "", app: "pnouns-voter-test" });
scripts/sepolia/14-snap-setup-only.js:29:  if (process.env.WAIT_UI) { console.log(`UI 投票の待機 ${process.env.WAIT_UI}s: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`); await sleep(Number(process.env.WAIT_UI) * 1000); }
scripts/sepolia/14-snap-setup-only.js:31:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# Snap Voter worker E2E\nsnapshot: ${receipt.id}`)).wait();
scripts/sepolia/14-snap-setup-only.js:32:  const nounsId = await dao.proposalCount();
scripts/sepolia/14-snap-setup-only.js:34:  await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
scripts/sepolia/14-snap-setup-only.js:36:  console.log(`nouns proposal #${nounsId} registered → あとは Worker が処理 (票の受付解禁 block ${eligible}, 現在 ${await ethers.provider.getBlockNumber()})`);
scripts/sepolia/05-e2e.js:27:  console.log("pNouns Voter votes:", String(await nouns.getCurrentVotes(dep.voter)), "| deployer Nouns:", String(await nouns.balanceOf(deployer.address)), "threshold:", String(await dao.proposalThreshold()));
scripts/sepolia/05-e2e.js:31:  let proposalId;
scripts/sepolia/05-e2e.js:33:    proposalId = BigInt(process.env.PROPOSAL_ID); // 既存提案を再利用
scripts/sepolia/05-e2e.js:38:    proposalId = await dao.proposalCount();
scripts/sepolia/05-e2e.js:40:  const pr = await dao.proposals(proposalId);
scripts/sepolia/05-e2e.js:41:  console.log(`proposal #${proposalId} creation=${pr.creationBlock} start=${pr.startBlock} end=${pr.endBlock}`);
scripts/sepolia/05-e2e.js:46:  console.log("\n  state:", String(await dao.state(proposalId)), "deadline:", String(await metagov.voteDeadline(proposalId)));
scripts/sepolia/05-e2e.js:51:  const types = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
scripts/sepolia/05-e2e.js:55:    const signature = await s.signTypedData(domain, types, { proposalId, support: sup, tokenIds });
scripts/sepolia/05-e2e.js:56:    votes.push({ proposalId, support: sup, tokenIds, signature });
scripts/sepolia/05-e2e.js:64:  const t = await metagov.tally(proposalId);
scripts/sepolia/05-e2e.js:65:  console.log("  tally tokens(against,for,abstain):", t.tokens.map(String), "voters:", t.voters.map(String), "result:", String(await metagov.currentResult(proposalId)));
scripts/sepolia/05-e2e.js:68:  const dl = await metagov.voteDeadline(proposalId);
scripts/sepolia/05-e2e.js:72:  const est = await metagov.execute.estimateGas(proposalId);
scripts/sepolia/05-e2e.js:73:  const tx3 = await metagov.execute(proposalId, { gasLimit: (est * 13n) / 10n });
scripts/sepolia/05-e2e.js:79:  const r = await dao.getReceipt(proposalId, dep.voter);
scripts/sepolia/13-snap-e2e.js:2:// 手順: ①Snapshot 提案作成(bot) ②voter A/B/C が snapshot.js で投票 ③Sepolia Nouns 提案作成 ④registerProposal
scripts/sepolia/13-snap-e2e.js:5:const snapshot = require("@snapshot-labs/snapshot.js");
scripts/sepolia/13-snap-e2e.js:8:const HUB = "https://hub.snapshot.org";
scripts/sepolia/13-snap-e2e.js:9:const SEQ = "https://seq.snapshot.org";
scripts/sepolia/13-snap-e2e.js:11:const IPFS = (cid) => `https://snapshot.4everland.link/ipfs/${cid}`;
scripts/sepolia/13-snap-e2e.js:13:// snapshot.js は ethers v5 の _signTypedData を呼ぶため、v6 Wallet にアダプタを噛ませる
scripts/sepolia/13-snap-e2e.js:38:  const client = new snapshot.Client712(SEQ);
scripts/sepolia/13-snap-e2e.js:40:  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
scripts/sepolia/13-snap-e2e.js:46:  const receipt = await client.proposal(adapt(botWallet), botWallet.address, {
scripts/sepolia/13-snap-e2e.js:51:    start: now, end: now + 300, snapshot: snapBlock,
scripts/sepolia/13-snap-e2e.js:52:    plugins: "{}", app: "pnouns-voter-test", discussion: "",
scripts/sepolia/13-snap-e2e.js:55:  console.log("   snapshot proposal:", snapId);
scripts/sepolia/13-snap-e2e.js:62:    await client.vote(adapt(wallet), wallet.address, { space: SPACE, proposal: snapId, type: "single-choice", choice, reason: "", app: "pnouns-voter-test" });
scripts/sepolia/13-snap-e2e.js:65:  if (process.env.WAIT_UI) { console.log(`   ${process.env.WAIT_UI} 秒待機中 — UI から投票できます: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`); await sleep(Number(process.env.WAIT_UI) * 1000); }
scripts/sepolia/13-snap-e2e.js:69:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# pNouns Snap Voter E2E\nsnapshot: ${snapId}`)).wait();
scripts/sepolia/13-snap-e2e.js:70:  const nounsId = await dao.proposalCount();
scripts/sepolia/13-snap-e2e.js:71:  const pr = await dao.proposals(nounsId);
scripts/sepolia/13-snap-e2e.js:72:  console.log(`   nouns proposal #${nounsId} start=${pr.startBlock} end=${pr.endBlock}`);
scripts/sepolia/13-snap-e2e.js:75:  await (await snapVoter.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/13-snap-e2e.js:83:  const data = await gql(`{ votes(where:{proposal:"${snapId}"}, first: 50) { voter ipfs choice created } }`);
scripts/sepolia/13-snap-e2e.js:91:    args.push({ from: m.from, timestamp: m.timestamp, proposal: m.proposal, choice: m.choice, reason: m.reason, app: m.app, metadata: m.metadata ?? "", signature: env.sig, tokenIds });
scripts/sepolia/13-snap-e2e.js:111:  console.log(`   snapshot: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`);
./docs/RUNBOOK-MAINNET.md:20:**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/RUNBOOK-MAINNET.md:105:4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-13-codex-raw.md:29:1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-13-codex-raw.md:110: scripts/create-and-register.mjs     |   30 +-
./docs/audit-13-codex-raw.md:122:/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
./docs/audit-13-codex-raw.md:134:    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-13-codex-raw.md:284:diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-13-codex-raw.md:286:--- a/scripts/create-and-register.mjs
./docs/audit-13-codex-raw.md:287:+++ b/scripts/create-and-register.mjs
./docs/audit-13-codex-raw.md:391:+**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-13-codex-raw.md:917:/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
./docs/audit-13-codex-raw.md:926:     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-13-codex-raw.md:927:     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-13-codex-raw.md:928:     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-13-codex-raw.md:2942:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-13-codex-raw.md:3164:scripts/create-and-register.mjs
./docs/audit-13-codex-raw.md:4392:[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-13-codex-raw.md:4453:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-13-codex-raw.md:4492:[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-13-codex-raw.md:4553:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-12-codex-raw.md:74:- `scripts/create-and-register.mjs`: mainnet で REGISTRAR_MNEMONIC 未設定なら throw。
./docs/audit-12-codex-raw.md:102:/bin/bash -lc 'git status --short && git show --stat --oneline --decorate --no-renames 3ca7528 && git show --format=fuller --no-ext-diff --no-renames 3ca7528 -- docs/AUDIT-RESPONSE-2026-08-18.md relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs scripts/create-and-register.mjs' in /mnt/data/pnouns-voter
./docs/audit-12-codex-raw.md:111: scripts/create-and-register.mjs     |    7 +-
./docs/audit-12-codex-raw.md:413:diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-12-codex-raw.md:415:--- a/scripts/create-and-register.mjs
./docs/audit-12-codex-raw.md:416:+++ b/scripts/create-and-register.mjs
./docs/audit-12-codex-raw.md:474:scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
./docs/audit-12-codex-raw.md:475:scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
./docs/audit-12-codex-raw.md:476:scripts/create-and-register.mjs:73:  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
./docs/audit-12-codex-raw.md:477:scripts/create-and-register.mjs:75:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-12-codex-raw.md:478:scripts/create-and-register.mjs:79:  const delay = Number(await c.registrationDelayBlocks());
./docs/audit-12-codex-raw.md:527:nl -ba scripts/create-and-register.mjs | sed -n '1,115p'
./docs/audit-12-codex-raw.md:1505:     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-12-codex-raw.md:1506:     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-12-codex-raw.md:1507:     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-12-codex-raw.md:1597:scripts/create-and-register.mjs:54:  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
./docs/audit-12-codex-raw.md:1598:scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
./docs/audit-12-codex-raw.md:1599:scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
./docs/audit-12-codex-raw.md:1600:scripts/create-and-register.mjs:73:  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
./docs/audit-12-codex-raw.md:2543:scripts/create-and-register.mjs:71:  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
./docs/audit-12-codex-raw.md:2544:scripts/create-and-register.mjs:72:  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
./docs/audit-12-codex-raw.md:2589:### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない
./docs/audit-12-codex-raw.md:2788:### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない
./docs/audit-14-codex-raw.md:40:2. **[前回 Medium] create-and-register の preflight**: registrar()/owner() 照合、
./docs/audit-14-codex-raw.md:75: scripts/create-and-register.mjs      |   15 +-
./docs/audit-14-codex-raw.md:93:    - create-and-register にオンチェーン preflight(コントラクト実在・
./docs/audit-14-codex-raw.md:146:+1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-14-codex-raw.md:227:+ scripts/create-and-register.mjs     |   30 +-
./docs/audit-14-codex-raw.md:239:+/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
./docs/audit-14-codex-raw.md:251:+    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-14-codex-raw.md:401:+diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:403:+--- a/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:404:++++ b/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:508:++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-14-codex-raw.md:1034:+/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
./docs/audit-14-codex-raw.md:1043:+     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-14-codex-raw.md:1044:+     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-14-codex-raw.md:1045:+     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-14-codex-raw.md:3059:+    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-14-codex-raw.md:3281:+scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:4509:+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-14-codex-raw.md:4570:+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-14-codex-raw.md:4609:+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-14-codex-raw.md:4670:+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-14-codex-raw.md:5365:scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:6869:git diff 1be9d16"'^ 1be9d16 -- scripts/create-and-register.mjs scripts/check-deploy.mjs docs/RUNBOOK-MAINNET.md hardhat.config.js scripts/mainnet/deploy-snapvoter.js relayer-cf/test/worker-tick.test.mjs
./docs/audit-14-codex-raw.md:6870:nl -ba scripts/create-and-register.mjs | sed -n '"'1,300p'
./docs/audit-14-codex-raw.md:6999:+4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-14-codex-raw.md:7279:diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:7281:--- a/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:7282:+++ b/scripts/create-and-register.mjs
./docs/audit-14-codex-raw.md:7375:     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-14-codex-raw.md:7376:     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-14-codex-raw.md:7377:     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-14-codex-raw.md:7627:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-14-codex-raw.md:7699:    92	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-14-codex-raw.md:7752:/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,130p'
./docs/audit-14-codex-raw.md:7755:rg -n \"create-and-register|dry|DRY|stage funded|stage worker|stage delegated|stage live|EXPECT_MARGIN|EXPECT_DELAY\" docs/RUNBOOK-MAINNET.md scripts/create-and-register.mjs scripts/check-deploy.mjs package.json .github -g '"'!node_modules'"'
./docs/audit-14-codex-raw.md:7762:     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-14-codex-raw.md:7763:     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-14-codex-raw.md:7764:     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-14-codex-raw.md:8009:scripts/create-and-register.mjs:5://   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-14-codex-raw.md:8010:scripts/create-and-register.mjs:6://   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-14-codex-raw.md:8011:scripts/create-and-register.mjs:7://   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-14-codex-raw.md:8012:scripts/create-and-register.mjs:52:  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
./docs/audit-14-codex-raw.md:8020:docs/RUNBOOK-MAINNET.md:20:**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-14-codex-raw.md:8026:docs/RUNBOOK-MAINNET.md:92:4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-14-codex-raw.md:8178:scripts/create-and-register.mjs:94:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-14-codex-raw.md:8179:scripts/create-and-register.mjs:98:  const delay = Number(await c.registrationDelayBlocks());
./docs/audit-14-codex-raw.md:8248:node --check scripts/check-deploy.mjs && node --check scripts/create-and-register.mjs && node --check scripts/mainnet/deploy-snapvoter.js" in /mnt/data/pnouns-voter
./docs/audit-14-codex-raw.md:8262:[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-14-codex-raw.md:8318:[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-14-codex-raw.md:8377:    - create-and-register にオンチェーン preflight(コントラクト実在・
./docs/audit-14-codex-raw.md:9286:`create-and-register` が新規作成する通常経路では Snapshot が48時間続くため、残り24時間未満なら多くの場合 timeline 検査にも捕まります。ただし、ロジックとしては保証されていません。
./docs/audit-14-codex-raw.md:9331:- [問題なし] create-and-register preflight  
./docs/audit-14-codex-raw.md:9332:  [create-and-register.mjs](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) はコード存在、`registrar()`/`owner()`、未登録を Snapshot 送信前に確認しています。owner による登録はコントラクト上の正常系なので、registrar と owner のいずれかなら許可する判定も正しいです。`--dry-run` は line 52 で先に return するため、新しい RPC preflight の影響を受けません。
./docs/audit-14-codex-raw.md:9436:`create-and-register` が新規作成する通常経路では Snapshot が48時間続くため、残り24時間未満なら多くの場合 timeline 検査にも捕まります。ただし、ロジックとしては保証されていません。
./docs/audit-14-codex-raw.md:9481:- [問題なし] create-and-register preflight  
./docs/audit-14-codex-raw.md:9482:  [create-and-register.mjs](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) はコード存在、`registrar()`/`owner()`、未登録を Snapshot 送信前に確認しています。owner による登録はコントラクト上の正常系なので、registrar と owner のいずれかなら許可する判定も正しいです。`--dry-run` は line 52 で先に return するため、新しい RPC preflight の影響を受けません。
./docs/audit-16-codex-raw.md:479:docs/audit-12-codex-raw.md:477:scripts/create-and-register.mjs:75:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-16-codex-raw.md:480:docs/audit-12-codex-raw.md:478:scripts/create-and-register.mjs:79:  const delay = Number(await c.registrationDelayBlocks());
./docs/audit-16-codex-raw.md:615:docs/audit-11-codex-raw.md:130:scripts/create-and-register.mjs:70:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-16-codex-raw.md:616:docs/audit-11-codex-raw.md:131:scripts/create-and-register.mjs:74:  const delay = Number(await c.registrationDelayBlocks());
./docs/audit-16-codex-raw.md:2193:    - create-and-register にオンチェーン preflight(コントラクト実在・
./docs/audit-16-codex-raw.md:2238:+create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/audit-16-codex-raw.md:2305:+4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-16-codex-raw.md:2347:+1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-16-codex-raw.md:2428:+ scripts/create-and-register.mjs     |   30 +-
./docs/audit-16-codex-raw.md:2440:+/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
./docs/audit-16-codex-raw.md:2452:+    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-16-codex-raw.md:2602:+diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:2604:+--- a/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:2605:++++ b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:2709:++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:3235:+/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
./docs/audit-16-codex-raw.md:3244:+     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-16-codex-raw.md:3245:+     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-16-codex-raw.md:3246:+     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-16-codex-raw.md:5260:+    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:5482:+scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:6710:+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-16-codex-raw.md:6771:+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:6810:+[scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[scripts/create-and-register.mjs:74](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:74)、[scripts/create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) / 前回の「未設定鍵・死んだ比較・送信後検証」は修正されています。ただし事前確認は deployment/RPC/鍵の「存在」までで、registrarWallet が実際の `registrar()` または `owner()` か、対象にコードがあるか、Nouns ID が未登録かを確認していません。誤ったが有効な `REGISTRAR_MNEMONIC` では Snapshot 作成後に `NotRegistrar` となり、孤児提案が残ります。外部2システム間なので完全な原子性は不可能ですが、設定起因の経路はまだ塞ぎ切れていません。 / Snapshot送信前にコントラクトコード、`registrar()`、`owner()`、`nounsToSnap(nounsId)==0` を確認し、registrar権限を明示的に照合してください。
./docs/audit-16-codex-raw.md:6871:+- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:7293:diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:7295:--- a/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:7296:+++ b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:7415:@@ -259,3 +259,39 @@ create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot
./docs/audit-16-codex-raw.md:7446:+2. create-and-register 後、対応表・registeredAtBlock・eligibleAtBlock が期待値
./docs/audit-16-codex-raw.md:7822:+@@ -238,3 +238,24 @@ create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot
./docs/audit-16-codex-raw.md:7917:++2. **[前回 Medium] create-and-register の preflight**: registrar()/owner() 照合、
./docs/audit-16-codex-raw.md:7952:++ scripts/create-and-register.mjs      |   15 +-
./docs/audit-16-codex-raw.md:7970:++    - create-and-register にオンチェーン preflight(コントラクト実在・
./docs/audit-16-codex-raw.md:8023:+++1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-16-codex-raw.md:8104:+++ scripts/create-and-register.mjs     |   30 +-
./docs/audit-16-codex-raw.md:8116:+++/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
./docs/audit-16-codex-raw.md:8128:+++    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-16-codex-raw.md:8278:+++diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:8280:+++--- a/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:8281:++++++ b/scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:8385:++++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:8911:+++/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
./docs/audit-16-codex-raw.md:8920:+++     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-16-codex-raw.md:8921:+++     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-16-codex-raw.md:8922:+++     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-16-codex-raw.md:11240:+    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:11314:+    94	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-16-codex-raw.md:11571:+   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/audit-16-codex-raw.md:11611:+docs/audit-13-codex-raw.md:29:1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-16-codex-raw.md:11653:+docs/audit-13-codex-raw.md:391:+**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:11775:+docs/audit-13-codex-raw.md:2942:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-16-codex-raw.md:11912:+docs/audit-13-codex-raw.md:4453:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:11939:+docs/audit-13-codex-raw.md:4553:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:12067:+docs/audit-12-codex-raw.md:74:- `scripts/create-and-register.mjs`: mainnet で REGISTRAR_MNEMONIC 未設定なら throw。
./docs/audit-16-codex-raw.md:12233:+   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/audit-16-codex-raw.md:12324:+37:### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない
./docs/audit-16-codex-raw.md:12368:+98:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:12394:+198:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-16-codex-raw.md:13218:+2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
./docs/audit-16-codex-raw.md:13336:+2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
./docs/audit-16-codex-raw.md:13477:    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-16-codex-raw.md:13705:   105	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-16-codex-raw.md:13856:/bin/bash -lc "rg -n \"linkOk|referencesNouns|nouns.wtf/vote|discussion|body|registerProposal\" scripts/mainnet/create-and-register.mjs relayer-cf/src/snap.js .github 2>/dev/null | head -n 160; nl -ba relayer-cf/src/abi.js | sed -n '1,110p'; git diff --check; git status --short" in /mnt/data/pnouns-voter
./docs/audit-16-codex-raw.md:13984:scripts/create-and-register.mjs
./docs/audit-16-codex-raw.md:13999:scripts/create-and-register.mjs:1:// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
./docs/audit-16-codex-raw.md:14000:scripts/create-and-register.mjs:30:  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
./docs/audit-16-codex-raw.md:14001:scripts/create-and-register.mjs:36:  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
./docs/audit-16-codex-raw.md:14002:scripts/create-and-register.mjs:49:  console.log(`discussion: ${p.discussion}`);
./docs/audit-16-codex-raw.md:14003:scripts/create-and-register.mjs:50:  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
./docs/audit-16-codex-raw.md:14004:scripts/create-and-register.mjs:52:  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
./docs/audit-16-codex-raw.md:14005:scripts/create-and-register.mjs:86:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
./docs/audit-16-codex-raw.md:14006:scripts/create-and-register.mjs:94:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-16-codex-raw.md:14007:scripts/create-and-register.mjs:96:  const tx = await c.registerProposal(receipt.id, nounsId);
./docs/audit-11-codex-raw.md:129:scripts/create-and-register.mjs:65:  // オンチェーンの対応付け(registrar)
./docs/audit-11-codex-raw.md:130:scripts/create-and-register.mjs:70:  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
./docs/audit-11-codex-raw.md:131:scripts/create-and-register.mjs:74:  const delay = Number(await c.registrationDelayBlocks());
./docs/audit-11-codex-raw.md:3225:./scripts/create-and-register.mjs:8:// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
./docs/audit-11-codex-raw.md:3226:./scripts/create-and-register.mjs:23:const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
./docs/audit-11-codex-raw.md:3227:./scripts/create-and-register.mjs:26:const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
./docs/audit-11-codex-raw.md:3228:./scripts/create-and-register.mjs:30:  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
./docs/audit-11-codex-raw.md:3229:./scripts/create-and-register.mjs:55:  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
./docs/audit-11-codex-raw.md:3230:./scripts/create-and-register.mjs:60:    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
./docs/audit-11-codex-raw.md:3231:./scripts/create-and-register.mjs:68:  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
./docs/audit-11-codex-raw.md:3931:/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '285,365p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '55,145p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '350,455p'; nl -ba scripts/create-and-register.mjs | sed -n '1,105p'; git diff --exit-code && echo CLEAN" in /mnt/data/pnouns-voter
./docs/audit-11-codex-raw.md:4206:     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-11-codex-raw.md:4207:     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-11-codex-raw.md:4208:     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-11-codex-raw.md:5116:該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[create-and-register.mjs:69](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:69)、[12-deploy-snapvoter.js:5](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:5)
./docs/audit-11-codex-raw.md:5375:該当箇所: [PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179)、[create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54)、[create-and-register.mjs:69](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:69)、[12-deploy-snapvoter.js:5](/mnt/data/pnouns-voter/scripts/sepolia/12-deploy-snapvoter.js:5)
./docs/AUDIT-RESPONSE-2026-08-18.md:237:create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/AUDIT-RESPONSE-2026-08-18.md:289:2. create-and-register 後、対応表・registeredAtBlock・eligibleAtBlock が期待値
./scripts/create-and-register.mjs:5://   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./scripts/create-and-register.mjs:6://   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./scripts/create-and-register.mjs:7://   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-15-codex-raw.md:349:@@ -238,3 +238,24 @@ create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot
./docs/audit-15-codex-raw.md:444:+2. **[前回 Medium] create-and-register の preflight**: registrar()/owner() 照合、
./docs/audit-15-codex-raw.md:479:+ scripts/create-and-register.mjs      |   15 +-
./docs/audit-15-codex-raw.md:497:+    - create-and-register にオンチェーン preflight(コントラクト実在・
./docs/audit-15-codex-raw.md:550:++1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-15-codex-raw.md:631:++ scripts/create-and-register.mjs     |   30 +-
./docs/audit-15-codex-raw.md:643:++/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
./docs/audit-15-codex-raw.md:655:++    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
./docs/audit-15-codex-raw.md:805:++diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
./docs/audit-15-codex-raw.md:807:++--- a/scripts/create-and-register.mjs
./docs/audit-15-codex-raw.md:808:+++++ b/scripts/create-and-register.mjs
./docs/audit-15-codex-raw.md:912:+++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-15-codex-raw.md:1438:++/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
./docs/audit-15-codex-raw.md:1447:++     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
./docs/audit-15-codex-raw.md:1448:++     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
./docs/audit-15-codex-raw.md:1449:++     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
./docs/audit-15-codex-raw.md:4668:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-15-codex-raw.md:4742:    94	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
./docs/audit-15-codex-raw.md:4999:   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/audit-15-codex-raw.md:5039:docs/audit-13-codex-raw.md:29:1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
./docs/audit-15-codex-raw.md:5081:docs/audit-13-codex-raw.md:391:+**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-15-codex-raw.md:5203:docs/audit-13-codex-raw.md:2942:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
./docs/audit-15-codex-raw.md:5340:docs/audit-13-codex-raw.md:4453:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-15-codex-raw.md:5367:docs/audit-13-codex-raw.md:4553:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-15-codex-raw.md:5495:docs/audit-12-codex-raw.md:74:- `scripts/create-and-register.mjs`: mainnet で REGISTRAR_MNEMONIC 未設定なら throw。
./docs/audit-15-codex-raw.md:5661:   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
./docs/audit-15-codex-raw.md:5752:37:### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない
./docs/audit-15-codex-raw.md:5796:98:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-15-codex-raw.md:5822:198:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
./docs/audit-15-codex-raw.md:6646:2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
./docs/audit-15-codex-raw.md:6764:2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
docs/AUDIT-RESPONSE-2026-08-18.md
docs/RUNBOOK-MAINNET.md
docs/audit-16-codex-raw.md
docs/member-proposal-unified.html
relayer-cf/test/worker-tick.test.mjs
docs/AUDIT-RESPONSE-2026-08-18.md
docs/RUNBOOK-MAINNET.md
docs/audit-16-codex-raw.md
docs/member-proposal-unified.html
relayer-cf/test/worker-tick.test.mjs

exec
/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,140p'; nl -ba docs/RUNBOOK-MAINNET.md | sed -n '28,36p;110,122p'; nl -ba docs/member-proposal-unified.html | sed -n '280,293p'; nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '300,405p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '185,205p;248,290p;358,375p'; nl -ba relayer-cf/wrangler.toml | sed -n '32,42p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
     1	// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
     2	// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
     3	//
     4	// 使い方:
     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
     8	// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
     9	import snapshot from "@snapshot-labs/snapshot.js";
    10	import { ethers } from "ethers";
    11	import fs from "node:fs";
    12	import path from "node:path";
    13	import { buildProposal } from "./lib/proposal-format.mjs";
    14	
    15	const ROOT = path.resolve(import.meta.dirname, "..");
    16	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    17	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    18	}
    19	const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
    20	const flag = (k) => process.argv.includes(`--${k}`);
    21	
    22	const NETWORK = process.env.NETWORK || "sepolia";
    23	const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
    24	const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
    25	const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
    26	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
    27	const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
    28	
    29	async function nounsDescription(id) {
    30	  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
    31	  const d = r?.data?.proposal?.description;
    32	  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
    33	  return d;
    34	}
    35	async function hubVotingPeriod() {
    36	  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
    37	  return r?.data?.space?.voting?.period || 172800;
    38	}
    39	
    40	async function main() {
    41	  const nounsId = Number(arg("nouns"));
    42	  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
    43	  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
    44	  const description = await nounsDescription(descId);
    45	  const p = buildProposal({ nounsId: descId, description });
    46	  const period = await hubVotingPeriod();
    47	  console.log(`space=${SPACE} network=${NETWORK}`);
    48	  console.log(`title: ${p.title}`);
    49	  console.log(`discussion: ${p.discussion}`);
    50	  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
    51	  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
    52	  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
    53	
    54	  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
    55	  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
    56	  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    57	  const voter = dep.snapVoter || dep.voter;
    58	  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
    59	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    60	  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
    61	  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
    64	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
    65	  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
    66	  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
    67	  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
    68	  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
    69	  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
    70	
    71	  // オンチェーン preflight(第13回監査): registrar 権限・コントラクト実在・未登録を送信前に確認する。
    72	  // 「鍵は存在するが権限がない」場合、送信後に NotRegistrar で落ちると孤児提案が残るため。
    73	  const provider = new ethers.JsonRpcProvider(rpc);
    74	  const code = await provider.getCode(voter);
    75	  if (code === "0x") throw new Error(`${voter} にコントラクトがありません(deployments/${NETWORK}.json が古い可能性)`);
    76	  const pre = new ethers.Contract(voter, ["function registrar() view returns (address)", "function owner() view returns (address)", "function nounsToSnap(uint256) view returns (bytes32)"], provider);
    77	  const [reg, own, existing] = await Promise.all([pre.registrar(), pre.owner(), pre.nounsToSnap(nounsId)]);
    78	  const rAddr = registrarWallet.address.toLowerCase();
    79	  if (rAddr !== reg.toLowerCase() && rAddr !== own.toLowerCase()) throw new Error(`registrar 鍵 ${registrarWallet.address} は registrar(${reg}) でも owner(${own}) でもなく、登録できません`);
    80	  if (existing !== ethers.ZeroHash) throw new Error(`Nouns #${nounsId} には既に対応表が登録されています(${existing.slice(0, 18)}…)`);
    81	
    82	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
    83	  const now = Math.floor(Date.now() / 1000);
    84	  const client = new snapshot.Client712(SEQ);
    85	  const receipt = await client.proposal(adapt(bot), bot.address, {
    86	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    87	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
    88	    plugins: "{}", app: "pnouns-voter",
    89	  });
    90	  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
    91	
    92	  // オンチェーンの対応付け(registrar) — 鍵・権限・未登録は送信前に検証済み
    93	  const w = registrarWallet.connect(provider);
    94	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
    95	  const c = new ethers.Contract(voter, abi, w);
    96	  const tx = await c.registerProposal(receipt.id, nounsId);
    97	  await tx.wait();
    98	  const delay = Number(await c.registrationDelayBlocks());
    99	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
   100	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
   101	}
   102	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
    28	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
    29	```
    30	
    31	(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
    32	
    33	- `REG_DELAY=10` (約 2 分)。受付開始前に自動照合(2 分ごと)が必ず 1 周するための最小間隔。2026-08-21 の設計判断: 長い猶予(旧 7200)による「投票直後の NFT 移転で票が減る窓」を解消し、すり抜け型の誤登録は unregister ではなく setLiveMode(false) + その議案の手動運用で受け止める
    34	- `MARGIN=7200` (約 24 時間 — 決定済みの運用値。締切 = Nouns 投票終了の 24 時間前)
    35	- `OWNER` は当初、現行の委任アドレス(手順 7 で安定稼働後にマルチシグへ移管する。**移管を忘れないこと** — check-deploy の EXPECT_OWNER をマルチシグに切り替えて照合する)
    36	- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
   110	
   111	## 8. 障害時
   112	
   113	- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
   114	  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
   115	- 誤登録の疑い: **解禁前、または解禁後でも `snapshotVotesAccepted == 0` の間**は registrar/owner から
   116	  `unregisterProposal` → 正しい ID で再登録(Worker の自動照合が Discord に⚠️を出し、照合が
   117	  食い違う間は Worker は投函しない)。第三者の直接投函で 1 票でも受理されたら取消不能 →
   118	  `setLiveMode(false)` + 当該議案は手動投票へ
   119	- **登録が遅すぎた(graceBad 警告)**: 単純な unregister → 再登録では回復しない
   120	  (再登録すると猶予がその時点から再カウントされ、さらに遅くなる)。この提案は自動反映を
   121	  諦め、**手動運用に切り替える**(従来どおり委任元から手動投票)。締切時に未反映の票が
   122	  残った場合(backlogwarn 警告)も同様に、自動 execute は止まるので手動で判断する
   280	    <li><b>登録から 10 ブロック(約 2 分)は、その議案の票を受け付けない</b> — 登録の処理回と受付開始の処理回を分けるための間隔です(通常の自動処理は、これとは別に毎回、投函の直前にも検算します)。</li>
   281	    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
   282	    <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
   283	    <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   284	  </ol>
   285	</div>
   286	<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
   287	  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の受付停止」の意味</b>: 対応表は<b>Snapshot 経由の票が 1 票でも受け付けられると、もう取り消せない仕様</b>です(すでに数えた票の行き先が消えてしまうため、あえてそうしています)。約 2 分の間隔は登録と受付開始の処理回を分けるためのもので、受付解禁ブロックは<b>登録した時点で確定し、あとから管理者が短縮することもできません</b>。</p>
   288	  <p style="margin:0 0 6px;font-size:14px"><b>なぜ長い猶予(旧案: 24 時間)にしないのか</b>: 旧案には<b>投票開始直後の票の反映が最大 24 時間遅れ、その間に NFT を移転すると票が減る</b>という、通常運用でも起こり得る副作用がありました。一方、誤登録への守りは短縮後も次のとおり働きます — 自動検算が食い違いを検出している間、<b>通常の自動処理は誤った対応表へ票を流さない</b>ため、多くの場合は取消・登録し直しが可能なままです。比較の結果、<b>投票の反映を速くする(NFT の窓をなくす)ことを優先し、対応しきれない誤登録は「登録し直し」ではなく「管理者による停止 + その議案だけ従来の手動投票」で受け止める</b>方針としました。</p>
   289	  <p style="margin:0 0 6px;font-size:14px"><b>短縮の代償(正直な限界)</b>: 票の投函は誰でも実行できる操作(クラウド障害時の救済経路)なので、<b>悪意の第三者が解禁(約 2 分)後に公開署名を直接投函すると、自動検算が止めていても対応表はその時点で取消不能になります</b>(旧 24 時間案は、この最初の窓をコントラクトの仕様として防いでいました)。この場合も含め、誤った投票が Nouns DAO に確定するのを防ぐ最後の砦は<b>管理者による停止</b>です — 検算の警告は数分で出るため、登録が締切間際でない限り、管理者には通常は数日の対応時間があります。停止スイッチは仕組み全体に効くため、停止中は他の議案の自動投票も一時止まります(当該議案の終了後に再開します)。</p>
   290	  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
   291	
   292	
   293	<h2 id="limits"><span class="no">4.</span>補えること・補えないこと</h2>
   300	function submitHandlers(over = {}) {
   301	  return handlers({
   302	    totalSupply: () => 2n,
   303	    ownerOf: () => VOTER_A, // token 1,2 とも voterA 保有
   304	    voterRec: () => [false, 0, false, 0n, "0x" + "00".repeat(32)],
   305	    hasTokenVoted: () => false,
   306	    ...over,
   307	  });
   308	}
   309	const hubWithVote = () => [hubProposal("https://nouns.wtf/vote/1"), { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
   310	const goodEnvelope = () => ({ data: { message: { from: VOTER_A, timestamp: TS, proposal: SNAP_ID, choice: 1, reason: "", app: "", metadata: "" } }, sig: "0x" + "11".repeat(65) });
   311	
   312	test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
   313	  const writes = [];
   314	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   315	  const { kv, env } = setup(submitHandlers(), {}, wallet);
   316	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   317	  await tick(env);
   318	  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
   319	  assert.equal(putsOf(kv, "snapsent:1").length, 1, "送信中レコードが保存される");
   320	  assert.equal(putsOf(kv, "snapdrop").length, 0);
   321	});
   322	
   323	test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
   324	  const writes = [];
   325	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   326	  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
   327	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
   328	  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   329	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   330	  await tick(env);
   331	  assert.equal(writes.length, 0, "投函しない");
   332	  assert.equal(putsOf(kv, "snapdrop").length, 0, "transient なので drop に数えない");
   333	});
   334	
   335	test("実投函: 復号可能な恒久 revert(StaleVote)は drop に数える", async () => {
   336	  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   337	  // StaleVote() = keccak256("StaleVote()")[0:4] = 0x93ff56e3。復号できていることを先に確認する
   338	  // (第15回監査: 誤 selector だと「復号失敗 → 数える」で偶然パスし、復号成功時の挙動を証明できない)
   339	  const staleErr = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x93ff56e3", functionName: "castSnapshotVotes" });
   340	  assert.equal(staleErr.data?.errorName, "StaleVote", "ABI で StaleVote が復号される");
   341	  const revert = () => { throw staleErr; };
   342	  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   343	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   344	  await tick(env);
   345	  assert.equal(putsOf(kv, "snapdrop:1").length, 1, "恒久 revert は従来どおり数える");
   346	});
   347	
   348	test("猶予境界: block == eligibleAt では投函が始まる", async () => {
   349	  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   350	  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
   351	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   352	  await tick(env);
   353	  assert.ok(F.hubCalls >= 2, "votes クエリに到達(off-by-one なし)");
   354	});
   355	
   356	test("第15回監査: 締切時に未反映の票が残っていれば mainnet は execute しない", async () => {
   357	  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   358	  const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   359	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
   360	  // ハブは 3 名が投票、オンチェーン計上は 1 名、dead-letter なし → 2 名分が未反映
   361	  const h = handlers({ __block: 196, tally: () => [[0n, 0n, 0n], [1n, 0n, 0n], false, 0] });
   362	  // Snapshot は締切前に終了済み(過去の end)。未来だと timelineBad が先に止めてしまい防壁を検証できない
   363	  const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
   364	  {
   365	    const { kv, env } = setup(h, mainnetEnv, wallet);
   366	    F.hub = [pastProposal, { proposal: { votes: 3 } }];
   367	    await tick(env);
   368	    assert.ok(F.discordBodies.some((b) => b.includes("反映されていない票")), "警告が出る");
   369	    assert.equal(putsOf(kv, "executed").length, 0, "mainnet は部分集計を確定しない");
   370	  }
   371	  // sepolia は警告のみで続行(確定される)
   372	  {
   373	    const { kv, env } = setup(h, {}, wallet);
   374	    F.hub = [pastProposal, { proposal: { votes: 3 } }];
   375	    await tick(env);
   376	    assert.equal(putsOf(kv, "executed").length, 1, "テストネットは続行");
   377	  }
   378	  // 全票反映済み(hub 1 名 = 計上 1 名)なら mainnet でも確定する
   379	  {
   380	    const { kv, env } = setup(h, mainnetEnv, wallet);
   381	    F.hub = [pastProposal, { proposal: { votes: 1 } }];
   382	    await tick(env);
   383	    assert.equal(putsOf(kv, "executed").length, 1, "未反映ゼロなら mainnet も確定する");
   384	  }
   385	});
   386	
   387	test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
   388	  const writes = [];
   389	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   390	  const mainnetEnv = { NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
   391	    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" };
   392	  const { kv, env } = setup(submitHandlers({ eligibleAtBlock: () => 50n }), mainnetEnv, wallet); // 解禁済み
   393	  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
   394	  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] }];
   395	  F.envelope = goodEnvelope();
   396	  await tick(env);
   397	  assert.equal(writes.length, 0, "投函 tx を送らない");
   398	  assert.equal(kv.ops.filter(([op, k]) => op === "put" && k.includes("snapsent")).length, 0, "送信中レコードも作らない");
   399	  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn が出る");
   400	});
   185	        nounsToSnap[nounsProposalId] = h;
   186	        registeredAtBlock[nounsProposalId] = block.number;
   187	        // 猶予は「登録した時点の設定」で固定する。あとから owner が delay を 0 にしても、
   188	        // 既に登録済みの提案の受付が前倒しされることはない(= 取消猶予は必ず確保される)。
   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
   190	        emit ProposalRegistered(nounsProposalId, snapshotProposal);
   191	    }
   192	
   193	    /// @notice 誤登録の取消。まだ 1 票も計上されていない場合のみ可(取消後は正しい対応で登録し直せる)
   194	    function unregisterProposal(uint256 nounsProposalId) external {
   195	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
   196	        bytes32 h = nounsToSnap[nounsProposalId];
   197	        if (h == bytes32(0)) revert NotRegistered();
   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
   199	        delete snapToNouns[h];
   200	        delete nounsToSnap[nounsProposalId];
   201	        delete registeredAtBlock[nounsProposalId];
   202	        delete eligibleAtBlock[nounsProposalId];
   203	        emit ProposalUnregistered(nounsProposalId, h);
   204	    }
   205	
   248	    }
   249	
   250	    // ---- 投票 ----
   251	    /// @notice Snapshot の投票署名をまとめて検証・集計する。誰でも呼べ、ガスは預け金から払い戻し。1 バッチ 1 提案。
   252	    function castSnapshotVotes(SnapVote[] calldata votes) external nonReentrant {
   253	        uint256 startGas = gasleft();
   254	        if (votes.length == 0) return;
   255	        bytes32 firstProp = keccak256(bytes(votes[0].proposal));
   256	        uint256 nounsId = snapToNouns[firstProp];
   257	        if (nounsId == 0) revert NotRegistered();
   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
   259	        uint32 snapCounted;
   260	        for (uint256 i = 0; i < votes.length; i++) {
   261	            SnapVote calldata v = votes[i];
   262	            if (keccak256(bytes(v.proposal)) != firstProp) revert MixedProposals();
   263	            bytes32 digest = snapVoteDigest(v);
   264	            address fromAddr = _parseAddress(v.from);
   265	            if (fromAddr.code.length == 0) {
   266	                // EOA: ECDSA 復元が from と一致すること
   267	                if (ECDSA.recover(digest, v.signature) != fromAddr) revert FromMismatch();
   268	            } else {
   269	                // スマートウォレット(Safe 等): EIP-1271 で検証
   270	                if (IERC1271(fromAddr).isValidSignature(digest, v.signature) != bytes4(0x1626ba7e)) revert InvalidContractSignature();
   271	            }
   272	            uint8 support = _choiceToSupport(v.choice);
   273	            snapCounted += _castVote(fromAddr, nounsId, support, v.tokenIds, v.timestamp, digest);
   274	        }
   275	        snapshotVotesCounted[nounsId] += snapCounted;
   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
   277	        _refundGas(startGas, votes.length, nounsId);
   278	    }
   279	
   280	    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
   281	    function castVote(uint256 nounsProposalId, uint8 support, uint256[] calldata tokenIds) external nonReentrant {
   282	        uint256 startGas = gasleft();
   283	        if (support > ABSTAIN) revert InvalidChoice();
   284	        // 登録直後の猶予期間中は直接投票も受け付けない(取消の妨害を防ぐ)
   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
   286	        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
   287	        _refundGas(startGas, 1, nounsProposalId);
   288	    }
   289	
   290	    function _castVote(address voter, uint256 proposalId, uint8 support, uint256[] calldata tokenIds, uint64 timestamp, bytes32 digest) internal returns (uint32) {
   358	        else { t.abstainTokens -= tokens; t.abstainVoters -= voters; }
   359	    }
   360	
   361	    // ---- 実行 ----
   362	    function execute(uint256 proposalId) external nonReentrant {
   363	        Tally storage t = _tallies[proposalId];
   364	        if (t.executed) revert AlreadyExecuted();
   365	        uint256 deadline = t.deadline == 0 ? voteDeadline(proposalId) : t.deadline;
   366	        if (block.number < deadline) revert VotingNotClosed();
   367	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(t);
   368	        if (tokens[0] + tokens[1] + tokens[2] == 0) revert NoVotes();
   369	        uint8 support = _decide(tokens, voters);
   370	        if (!liveMode) { emit Executed(proposalId, support, tokens, voters, false); return; }
   371	        t.executed = true; t.result = support;
   372	        nounsDAO.castRefundableVoteWithReason(proposalId, support, _reason(tokens, voters, support));
   373	        emit Executed(proposalId, support, tokens, voters, true);
   374	    }
   375	
    32	
    33	# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
    34	[env.mainnet]
    35	name = "pnouns-voter-mainnet"
    36	[env.mainnet.assets]
    37	directory = "./public"
    38	[env.mainnet.triggers]
    39	crons = ["*/2 * * * *"]
    40	[[env.mainnet.kv_namespaces]]
    41	binding = "STATE"
    42	id = "REPLACE_WITH_MAINNET_KV_ID"

codex
## 第17回監査結果

結論は、**本番コントラクトの再設計までは不要**ですが、現状を無条件でクローズとはしません。

- Medium 1件: RUNBOOK に第16回の過大表現が1箇所残存
- Low 2件: 資料の表現精度、追加テストの fixture 不足
- コントラクト・Worker本体には `d23ed75` による変更なし
- `npm test` は成功、補足実行では **46/46 pass**

### 1. 修正の検証

#### a. 資料 §3

主要な訂正はコードの実態に合っています。

- 10ブロックを「自動検算が必ず先行する保証」とする記述は削除された
- 通常のWorker経路では投函前に `linkOk` を確認することが明示された
- 解禁後は第三者が `castSnapshotVotes()` を直接呼べること、その結果 `snapshotVotesAccepted != 0` となり取消不能になることが明記された
- `setLiveMode(false)` が必要な人的対応であること、他議案にも影響することが明記された

ただし、次の軽微な過大表現が残ります。

1. 「多くの場合は取消可能」

[member-proposal-unified.html:288](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:288) の「多くの場合」は定量的根拠がなく、正確には次の条件です。

> Worker以外から有効なSnapshot署名が直接投函されず、`snapshotVotesAccepted == 0` の間は取消可能

直後の「短縮の代償」でこの条件は説明されているため、読者を根本的に誤認させるほどではありませんが、「多くの場合」より上記の条件表現が適切です。

2. 「検算の警告は数分で出る」

[member-proposal-unified.html:289](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:289) は、mainnet cron が2分間隔であることから通常時の期待値としては妥当です。[wrangler.toml:39](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:39)

ただし、次が正常であることが前提です。

- Cloudflare Workerが稼働している
- Snapshot Hubへの照会が成功する
- Discord webhookが成功する

したがって、「Worker・Hub・Discordが正常なら通常は数分で」がより正確です。通知失敗時は再試行されますが、数分を保証するコードではありません。

3. 停止スイッチの範囲

「仕組み全体に効く」は少し広い表現です。`setLiveMode(false)` が止めるのは、全議案についての **Nouns DAOへの最終投票** です。[PNounsSnapVoter.sol:362](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:362)

停止後も以下は止まりません。

- `castSnapshotVotes()` によるSnapshot票の受理
- 集計
- `execute()` の呼出し自体（Nouns DAOへは投票せずイベントだけ発行）

ただし、続く「他の議案の自動投票も止まる」は正しいため、重大な誤りではありません。

#### b. RUNBOOKの誤登録対応

新しい障害対応はコントラクト条件と一致しています。[RUNBOOK-MAINNET.md:115](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:115)

- `unregisterProposal()` の実際の取消条件は `snapshotVotesAccepted == 0`
- 呼べるのは registrar または owner
- 解禁前はコントラクトがSnapshot票を受理しないため、通常は必然的に `snapshotVotesAccepted == 0`
- 解禁後でも未受理なら取消可能
- 1件でも受理後は `VotesAlreadyCounted` となり取消不能

これは [PNounsSnapVoter.sol:193](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) と正確に一致します。

受理後の `setLiveMode(false) + 手動運用` も正しい対応です。ただし、実務上は次を明示的に確認すべきです。

- `setLiveMode(false)` の採掘完了
- 委任を手動投票先へ戻したこと
- 問題議案がNouns上で投票不能になるまで、誤って `liveMode=true` に戻さないこと

一方、RUNBOOKのデプロイ節には、第16回で否定した記述が残っています。

> 「受付開始前に自動照合が必ず1周するための最小間隔」

[RUNBOOK-MAINNET.md:33](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:33)

これはCloudflare cronの遅延・失敗や登録タイミングとの境界競合があるため、依然として保証されません。資料本文では直した主張が、運用手順書には残っています。第16回Highの残存部分として **Medium** と評価します。

#### c. 追加テスト

追加テストは、以下を正しく検証しています。[worker-tick.test.mjs:387](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:387)

- mainnet
- `linkOk=false`
- `block >= eligibleAtBlock`
- relayer walletあり
- `writeContract` を呼ばない
- `snapsent` を作らない
- Discord警告を出す

したがって、「解禁済みでもWorkerがlink不一致を優先して停止する」ことは確認できています。

ただし、テスト名の「実票があっても」は再現されていません。

- `F.envelope` は設定されている
- しかしHubの `{ votes: [...] }` 応答が `F.hub` に設定されていない
- `linkBad` でvotesクエリ前に `continue` するため、`F.envelope` も利用されない

つまり、既存の `linkOk=false` テストに「mainnet・wallet・解禁済み」を追加したものではありますが、第16回で指定した「実票あり」のfixtureは欠けています。安全分岐自体は正しいものの、推奨テストを完全に満たしたとはいえません。**Low**です。

## 2. 不採用とした対策への見解

### 却下理由の妥当性

「投函・executeの認可制」を採用しない判断は技術的に妥当です。これは明確にpermissionlessな救済経路を失わせ、relayer障害・検閲・鍵喪失時の可用性を下げます。

一方、「validated/activatedフラグもpermissionless性を壊す」という説明は広すぎます。

activation後の

- `castSnapshotVotes()`
- `castVote()`
- `execute()`

を誰にでも開いたままにする設計は可能です。この場合、失われるのは投函のpermissionless性そのものではなく、「activation前から誰でも投函できる」という即時性と、activation担当者が止まった場合の可用性です。

ただし、コントラクト自身はSnapshot本文を読めないため、activationに実効性を持たせるには、結局は管理者・別validator・oracle等の信頼された表明が必要です。その意味で、新しい信頼点と再デプロイ・再監査を避ける判断には合理性があります。

要約すると、

- 認可relayer方式の却下: 技術的に強く妥当
- activation方式の却下: 設計価値判断として妥当だが、「permissionless性を壊す」だけでは説明不足
- 再デプロイ・全面再監査との費用対効果: 現在の限定された脅威条件を考えれば妥当

です。

### 軽い第3の対策

最も有効なのは、**Snapshot提案をHubから読み戻して検算してからオンチェーン登録すること**です。

現在の [create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) は、

1. Snapshot提案を作る
2. 返された `receipt.id` を直ちに `registerProposal()` へ渡す

という流れで、作成済み提案をHubから再取得していません。

登録前に以下を読み戻して一致しなければ登録しない運用は、コントラクトを変更せず、permissionless投函も維持したまま、単純な取り違えを大幅に減らします。

- Snapshot proposal ID
- space
- `discussion` / `body` 内の正しいNouns URL
- choices
- start/end
- 登録予定のNouns ID

特に `DESC_FROM` が残った環境では、別IDのURLを作って本来の `nounsId` に登録する経路が存在するため、この事前検算は実効性があります。

さらに軽い補強として有効なのは次です。

- Snapshot投票開始を作成時刻より10～30分後に設定し、その間に読み戻し・登録・オンチェーン対応表の再確認を完了する
- `ProposalRegistered` をWorkerとは独立した監視経路でも監視する
- ownerがマルチシグになった後の停止SLA、必要署名者数、夜間対応者を決めて実地訓練する
- 必要なら登録猶予を10ブロックから30～60ブロック程度へ伸ばす。24時間ほどのNFT移転リスクを作らず、人の確認時間を多少増やせる

「解禁直後にWorkerが正しい票を先回り投函する」は、今回の残余リスクにはほぼ効きません。対応表が誤っていればWorkerは投函しませんが、敵対者は投函できます。正しい対応表への先行投函は、その正しさを保証するものでも、誤対応表への敵対投函を防ぐものでもありません。

### mainnet移行判断

私の判断は次のとおりです。

- **コントラクトを再設計・再デプロイする必要まではない**
- ただし、現状の運用パッケージのまま即mainnetへ進むことは推奨しない
- コントラクト外の登録前読み戻し検算と、停止SLA・マルチシグ対応訓練を入れた後ならmainnet移行可

残余リスクは確かに、

> 誤登録  
> ＋ 解禁後の有効な公開署名  
> ＋ 敵対者の先回り投函  
> ＋ 管理者が内部締切前に停止できない

という複合条件です。脅威モデルとして受容可能な範囲ですが、最後の防壁がマルチシグの人的対応である以上、「数日の余裕がある」だけでなく実際にその時間内に採掘できる運用を確認する必要があります。

## 3. 総括

`d23ed75` が変更した実行コードは追加テストだけです。コントラクト、Worker本体、設定コードには変更がありません。

したがって、第16回で問題なしとした以下には悪影響がありません。

- 猶予中のdead-letter防止
- `RegistrationTooRecent` のtransient扱い
- `block == eligibleAtBlock` の境界
- `graceBad`
- 第15回の未反映票ガード
- Workerのmainnet下限10と環境変数による迂回防止

テスト結果:

- 指定実行 `relayer-cf/npm test`: **4テストファイル pass、fail 0**
- 補足 `npm test -- --test-isolation=none`: **46 tests / 46 pass / fail 0**
- 作業ツリー: clean
- ファイル変更なし

最終評価は、**コード面はクローズ可能、監査対応全体は条件付きクローズ**です。残作業はコントラクト改修ではなく、RUNBOOKの残存断定修正、追加テストの実票fixture補強、登録前読み戻し検算と停止運用の確認です。
tokens used
104,262
## 第17回監査結果

結論は、**本番コントラクトの再設計までは不要**ですが、現状を無条件でクローズとはしません。

- Medium 1件: RUNBOOK に第16回の過大表現が1箇所残存
- Low 2件: 資料の表現精度、追加テストの fixture 不足
- コントラクト・Worker本体には `d23ed75` による変更なし
- `npm test` は成功、補足実行では **46/46 pass**

### 1. 修正の検証

#### a. 資料 §3

主要な訂正はコードの実態に合っています。

- 10ブロックを「自動検算が必ず先行する保証」とする記述は削除された
- 通常のWorker経路では投函前に `linkOk` を確認することが明示された
- 解禁後は第三者が `castSnapshotVotes()` を直接呼べること、その結果 `snapshotVotesAccepted != 0` となり取消不能になることが明記された
- `setLiveMode(false)` が必要な人的対応であること、他議案にも影響することが明記された

ただし、次の軽微な過大表現が残ります。

1. 「多くの場合は取消可能」

[member-proposal-unified.html:288](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:288) の「多くの場合」は定量的根拠がなく、正確には次の条件です。

> Worker以外から有効なSnapshot署名が直接投函されず、`snapshotVotesAccepted == 0` の間は取消可能

直後の「短縮の代償」でこの条件は説明されているため、読者を根本的に誤認させるほどではありませんが、「多くの場合」より上記の条件表現が適切です。

2. 「検算の警告は数分で出る」

[member-proposal-unified.html:289](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:289) は、mainnet cron が2分間隔であることから通常時の期待値としては妥当です。[wrangler.toml:39](/mnt/data/pnouns-voter/relayer-cf/wrangler.toml:39)

ただし、次が正常であることが前提です。

- Cloudflare Workerが稼働している
- Snapshot Hubへの照会が成功する
- Discord webhookが成功する

したがって、「Worker・Hub・Discordが正常なら通常は数分で」がより正確です。通知失敗時は再試行されますが、数分を保証するコードではありません。

3. 停止スイッチの範囲

「仕組み全体に効く」は少し広い表現です。`setLiveMode(false)` が止めるのは、全議案についての **Nouns DAOへの最終投票** です。[PNounsSnapVoter.sol:362](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:362)

停止後も以下は止まりません。

- `castSnapshotVotes()` によるSnapshot票の受理
- 集計
- `execute()` の呼出し自体（Nouns DAOへは投票せずイベントだけ発行）

ただし、続く「他の議案の自動投票も止まる」は正しいため、重大な誤りではありません。

#### b. RUNBOOKの誤登録対応

新しい障害対応はコントラクト条件と一致しています。[RUNBOOK-MAINNET.md:115](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:115)

- `unregisterProposal()` の実際の取消条件は `snapshotVotesAccepted == 0`
- 呼べるのは registrar または owner
- 解禁前はコントラクトがSnapshot票を受理しないため、通常は必然的に `snapshotVotesAccepted == 0`
- 解禁後でも未受理なら取消可能
- 1件でも受理後は `VotesAlreadyCounted` となり取消不能

これは [PNounsSnapVoter.sol:193](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) と正確に一致します。

受理後の `setLiveMode(false) + 手動運用` も正しい対応です。ただし、実務上は次を明示的に確認すべきです。

- `setLiveMode(false)` の採掘完了
- 委任を手動投票先へ戻したこと
- 問題議案がNouns上で投票不能になるまで、誤って `liveMode=true` に戻さないこと

一方、RUNBOOKのデプロイ節には、第16回で否定した記述が残っています。

> 「受付開始前に自動照合が必ず1周するための最小間隔」

[RUNBOOK-MAINNET.md:33](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:33)

これはCloudflare cronの遅延・失敗や登録タイミングとの境界競合があるため、依然として保証されません。資料本文では直した主張が、運用手順書には残っています。第16回Highの残存部分として **Medium** と評価します。

#### c. 追加テスト

追加テストは、以下を正しく検証しています。[worker-tick.test.mjs:387](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:387)

- mainnet
- `linkOk=false`
- `block >= eligibleAtBlock`
- relayer walletあり
- `writeContract` を呼ばない
- `snapsent` を作らない
- Discord警告を出す

したがって、「解禁済みでもWorkerがlink不一致を優先して停止する」ことは確認できています。

ただし、テスト名の「実票があっても」は再現されていません。

- `F.envelope` は設定されている
- しかしHubの `{ votes: [...] }` 応答が `F.hub` に設定されていない
- `linkBad` でvotesクエリ前に `continue` するため、`F.envelope` も利用されない

つまり、既存の `linkOk=false` テストに「mainnet・wallet・解禁済み」を追加したものではありますが、第16回で指定した「実票あり」のfixtureは欠けています。安全分岐自体は正しいものの、推奨テストを完全に満たしたとはいえません。**Low**です。

## 2. 不採用とした対策への見解

### 却下理由の妥当性

「投函・executeの認可制」を採用しない判断は技術的に妥当です。これは明確にpermissionlessな救済経路を失わせ、relayer障害・検閲・鍵喪失時の可用性を下げます。

一方、「validated/activatedフラグもpermissionless性を壊す」という説明は広すぎます。

activation後の

- `castSnapshotVotes()`
- `castVote()`
- `execute()`

を誰にでも開いたままにする設計は可能です。この場合、失われるのは投函のpermissionless性そのものではなく、「activation前から誰でも投函できる」という即時性と、activation担当者が止まった場合の可用性です。

ただし、コントラクト自身はSnapshot本文を読めないため、activationに実効性を持たせるには、結局は管理者・別validator・oracle等の信頼された表明が必要です。その意味で、新しい信頼点と再デプロイ・再監査を避ける判断には合理性があります。

要約すると、

- 認可relayer方式の却下: 技術的に強く妥当
- activation方式の却下: 設計価値判断として妥当だが、「permissionless性を壊す」だけでは説明不足
- 再デプロイ・全面再監査との費用対効果: 現在の限定された脅威条件を考えれば妥当

です。

### 軽い第3の対策

最も有効なのは、**Snapshot提案をHubから読み戻して検算してからオンチェーン登録すること**です。

現在の [create-and-register.mjs:85](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:85) は、

1. Snapshot提案を作る
2. 返された `receipt.id` を直ちに `registerProposal()` へ渡す

という流れで、作成済み提案をHubから再取得していません。

登録前に以下を読み戻して一致しなければ登録しない運用は、コントラクトを変更せず、permissionless投函も維持したまま、単純な取り違えを大幅に減らします。

- Snapshot proposal ID
- space
- `discussion` / `body` 内の正しいNouns URL
- choices
- start/end
- 登録予定のNouns ID

特に `DESC_FROM` が残った環境では、別IDのURLを作って本来の `nounsId` に登録する経路が存在するため、この事前検算は実効性があります。

さらに軽い補強として有効なのは次です。

- Snapshot投票開始を作成時刻より10～30分後に設定し、その間に読み戻し・登録・オンチェーン対応表の再確認を完了する
- `ProposalRegistered` をWorkerとは独立した監視経路でも監視する
- ownerがマルチシグになった後の停止SLA、必要署名者数、夜間対応者を決めて実地訓練する
- 必要なら登録猶予を10ブロックから30～60ブロック程度へ伸ばす。24時間ほどのNFT移転リスクを作らず、人の確認時間を多少増やせる

「解禁直後にWorkerが正しい票を先回り投函する」は、今回の残余リスクにはほぼ効きません。対応表が誤っていればWorkerは投函しませんが、敵対者は投函できます。正しい対応表への先行投函は、その正しさを保証するものでも、誤対応表への敵対投函を防ぐものでもありません。

### mainnet移行判断

私の判断は次のとおりです。

- **コントラクトを再設計・再デプロイする必要まではない**
- ただし、現状の運用パッケージのまま即mainnetへ進むことは推奨しない
- コントラクト外の登録前読み戻し検算と、停止SLA・マルチシグ対応訓練を入れた後ならmainnet移行可

残余リスクは確かに、

> 誤登録  
> ＋ 解禁後の有効な公開署名  
> ＋ 敵対者の先回り投函  
> ＋ 管理者が内部締切前に停止できない

という複合条件です。脅威モデルとして受容可能な範囲ですが、最後の防壁がマルチシグの人的対応である以上、「数日の余裕がある」だけでなく実際にその時間内に採掘できる運用を確認する必要があります。

## 3. 総括

`d23ed75` が変更した実行コードは追加テストだけです。コントラクト、Worker本体、設定コードには変更がありません。

したがって、第16回で問題なしとした以下には悪影響がありません。

- 猶予中のdead-letter防止
- `RegistrationTooRecent` のtransient扱い
- `block == eligibleAtBlock` の境界
- `graceBad`
- 第15回の未反映票ガード
- Workerのmainnet下限10と環境変数による迂回防止

テスト結果:

- 指定実行 `relayer-cf/npm test`: **4テストファイル pass、fail 0**
- 補足 `npm test -- --test-isolation=none`: **46 tests / 46 pass / fail 0**
- 作業ツリー: clean
- ファイル変更なし

最終評価は、**コード面はクローズ可能、監査対応全体は条件付きクローズ**です。残作業はコントラクト改修ではなく、RUNBOOKの残存断定修正、追加テストの実票fixture補強、登録前読み戻し検算と停止運用の確認です。
