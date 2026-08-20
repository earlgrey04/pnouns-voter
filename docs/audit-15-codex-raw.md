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
session id: 01a01fa8-3f19-7371-a204-a0d3bd14d480
--------
user
# 監査依頼 (第15回・クローズ判定) — 第14回指摘への修正の検証と総括

あなたは pNouns Voter の第三者監査者です。第14回監査 (docs/audit-14-codex-raw.md) の
指摘に対する修正が commit `8e37def` に入っています。今回は 2 つをお願いします。

リポジトリ: /mnt/data/pnouns-voter (読み取りのみ。ファイル変更禁止)

## 1. 第14回指摘への修正の検証 (`git show 8e37def`)

a. **ABI への error 追加 (28 個)**: relayer-cf/src/abi.js。
   - コントラクト artifacts の error 定義と一致しているか (名前・inputs)
   - これで revertErrorName() が実際に復号できるか。テスト
     (worker-tick.test.mjs の「実投函」3 本) は本物の ContractFunctionRevertedError を
     構築しているが、**selector が正しいか自分で計算して確認**すること
     (RegistrationTooRecent() = keccak256 先頭 4 バイト。StaleVote() も同様)。
     selector が間違っていると「復号失敗 → null → 数える」で偶然パスする
   - ABI 肥大による悪影響 (viem の decode 誤爆など) はないか
b. **graceBad 検出**: worker.js。`eligibleAt + ceil((cronSec+submitBufferSec)/12) >= deadline`
   - 境界の妥当性: ぎりぎり間に合う登録を誤って止めないか (drainBlocks の見積もりは
     投函 1 回分として十分か、rush を考慮すべきか)
   - graceBad と timelineBad と linkBad の 3 つの相互作用・優先順位に矛盾はないか
   - graceBad で mainnet continue した提案は、その後どうなるか (登録を取消して
     再登録すれば eligibleAt が更新されて回復するか — unregister は票ゼロなら可能のはず)
c. **deploy/check-deploy の強化**: MARGIN 10〜7200・getAddress/ゼロ拒否・
   EXPECT_MARGIN/EXPECT_BOT の必須化。requireEnv の呼び方にバグはないか
   (`if (requireEnv(...)) { /* 空 */ }` という書き方が意図どおり機能しているか)
d. **RUNBOOK の env $ENV**: bash で実際に動く形か
e. **新テスト 4 本の実質**: 「実投函フルパス」は snapsent 保存まで検証しているが、
   その後の receipt 確定 → cursor 前進は対象外。それで「実投函経路をテストした」と
   言ってよい範囲か、言い過ぎになる範囲かを明確にすること

## 2. 総括 (シリーズ 10〜15 回のクローズ判定)

第10回以降の指摘と対応の全体 (docs/AUDIT-RESPONSE-2026-08-18.md の該当節) を見渡して:
- 未対応のまま残っている指摘はないか (accepted risk として文書化済みのものは除く)
- accepted risk の一覧とその妥当性
- 「Sepolia E2E (明日実施) で必ず確認すべき項目」のチェックリストを 10 項目以内で
- mainnet 移行判定: 保留とした前回から、保留理由が解消されたかの判定

## 出力形式
日本語。[重大度] / 該当箇所 / 何が起きるか / 推奨する修正。「問題なし」も根拠つきで。
`relayer-cf` で `npm test` を実行し結果を含めること。
codex
第14回監査、修正コミット、対応総括を突き合わせます。まずリポジトリ内の監査指示と差分を読み、ABI selector は独立計算、最後に `relayer-cf` の全テストを実行します。読み取り専用のまま進めます。
exec
/bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'docs/audit-14-codex-raw.md' -g 'docs/AUDIT-RESPONSE-2026-08-18.md' -g 'relayer-cf/**' -g 'contracts/**' | sed -n '1,240p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
/mnt/data/pnouns-voter
docs/AUDIT-RESPONSE-2026-08-18.md
docs/audit-14-codex-raw.md
relayer-cf/wrangler.toml
relayer-cf/package-lock.json
relayer-cf/.dev.vars
relayer-cf/package.json
contracts/PNounsVoter.sol
contracts/PNounsSnapVoter.sol
relayer-cf/test/worker-tick.test.mjs
relayer-cf/test/link-check.test.mjs
relayer-cf/test/cursor.test.mjs
relayer-cf/test/accept-deadline.test.mjs
relayer-cf/public/_headers
relayer-cf/public/index.html
relayer-cf/public/app.js
relayer-cf/src/worker.js
relayer-cf/src/store.js
relayer-cf/src/snap.js
relayer-cf/src/index.js
relayer-cf/src/chain.js
relayer-cf/src/abi.js
contracts/test/Mock1271Wallet.sol
relayer-cf/node_modules/detect-libc/README.md
relayer-cf/node_modules/detect-libc/package.json
relayer-cf/node_modules/detect-libc/LICENSE
relayer-cf/node_modules/youch-core/README.md
relayer-cf/node_modules/youch-core/package.json
relayer-cf/node_modules/youch-core/LICENSE.md
relayer-cf/node_modules/semver/README.md
relayer-cf/node_modules/unenv/README.md
relayer-cf/node_modules/unenv/package.json
relayer-cf/node_modules/unenv/LICENSE
relayer-cf/node_modules/detect-libc/lib/process.js
relayer-cf/node_modules/detect-libc/lib/filesystem.js
relayer-cf/node_modules/detect-libc/lib/elf.js
relayer-cf/node_modules/detect-libc/lib/detect-libc.js
relayer-cf/node_modules/detect-libc/index.d.ts
contracts/vendor/pnouns/base64-sol/base64.sol
relayer-cf/node_modules/semver/ranges/valid.js
relayer-cf/node_modules/semver/ranges/to-comparators.js
relayer-cf/node_modules/semver/ranges/subset.js
relayer-cf/node_modules/semver/ranges/simplify.js
relayer-cf/node_modules/semver/ranges/outside.js
relayer-cf/node_modules/semver/ranges/min-version.js
relayer-cf/node_modules/semver/ranges/min-satisfying.js
relayer-cf/node_modules/semver/ranges/max-satisfying.js
relayer-cf/node_modules/semver/ranges/ltr.js
relayer-cf/node_modules/semver/ranges/intersects.js
relayer-cf/node_modules/semver/ranges/gtr.js
relayer-cf/node_modules/semver/range.bnf
relayer-cf/node_modules/semver/preload.js
relayer-cf/node_modules/semver/package.json
relayer-cf/node_modules/semver/LICENSE
relayer-cf/node_modules/unenv/lib/mock.d.cts
relayer-cf/node_modules/unenv/lib/mock.cjs
relayer-cf/node_modules/cookie/README.md
relayer-cf/node_modules/cookie/package.json
relayer-cf/node_modules/cookie/LICENSE
contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol
relayer-cf/node_modules/wrangler/wrangler-dist/ProxyWorker.js
relayer-cf/node_modules/wrangler/wrangler-dist/metafile-cjs.json
relayer-cf/node_modules/wrangler/wrangler-dist/InspectorProxyWorker.js
relayer-cf/node_modules/wrangler/wrangler-dist/experimental-config.mjs.map
relayer-cf/node_modules/wrangler/wrangler-dist/experimental-config.mjs
relayer-cf/node_modules/wrangler/wrangler-dist/experimental-config.d.mts.map
relayer-cf/node_modules/wrangler/wrangler-dist/experimental-config.d.mts
relayer-cf/node_modules/wrangler/wrangler-dist/cli.js
relayer-cf/node_modules/wrangler/wrangler-dist/cli.d.ts
relayer-cf/node_modules/youch-core/build/src/types.js
relayer-cf/node_modules/youch-core/build/src/types.d.ts
relayer-cf/node_modules/youch-core/build/src/source_file.d.ts
relayer-cf/node_modules/youch-core/build/src/parser.d.ts
relayer-cf/node_modules/youch-core/build/src/debug.d.ts
relayer-cf/node_modules/youch-core/build/index.js
relayer-cf/node_modules/youch-core/build/index.d.ts
relayer-cf/node_modules/semver/internal/re.js
relayer-cf/node_modules/semver/internal/parse-options.js
relayer-cf/node_modules/semver/internal/lrucache.js
relayer-cf/node_modules/semver/internal/identifiers.js
relayer-cf/node_modules/semver/internal/debug.js
relayer-cf/node_modules/semver/internal/constants.js
relayer-cf/node_modules/semver/index.js
contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol
relayer-cf/node_modules/cookie/dist/index.js.map
relayer-cf/node_modules/cookie/dist/index.js
relayer-cf/node_modules/cookie/dist/index.d.ts
contracts/vendor/pnouns/contract/contracts/pNounsToken.sol
contracts/vendor/pnouns/contract/contracts/pNounsContractFilter.sol
relayer-cf/node_modules/youch/README.md
relayer-cf/node_modules/youch/package.json
relayer-cf/node_modules/youch/LICENSE.md
relayer-cf/node_modules/semver/functions/valid.js
relayer-cf/node_modules/semver/functions/truncate.js
relayer-cf/node_modules/semver/functions/sort.js
relayer-cf/node_modules/semver/functions/satisfies.js
relayer-cf/node_modules/semver/functions/rsort.js
relayer-cf/node_modules/semver/functions/rcompare.js
relayer-cf/node_modules/semver/functions/prerelease.js
relayer-cf/node_modules/semver/functions/patch.js
relayer-cf/node_modules/semver/functions/parse.js
relayer-cf/node_modules/semver/functions/neq.js
relayer-cf/node_modules/semver/functions/minor.js
relayer-cf/node_modules/semver/functions/major.js
relayer-cf/node_modules/semver/functions/lte.js
relayer-cf/node_modules/semver/functions/lt.js
relayer-cf/node_modules/semver/functions/inc.js
relayer-cf/node_modules/semver/functions/gte.js
relayer-cf/node_modules/semver/functions/gt.js
relayer-cf/node_modules/semver/functions/eq.js
relayer-cf/node_modules/semver/functions/diff.js
relayer-cf/node_modules/semver/functions/compare.js
relayer-cf/node_modules/semver/functions/compare-loose.js
relayer-cf/node_modules/semver/functions/compare-build.js
relayer-cf/node_modules/semver/functions/coerce.js
relayer-cf/node_modules/semver/functions/cmp.js
relayer-cf/node_modules/semver/functions/clean.js
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-wal
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-shm
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-wal
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-shm
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite
contracts/vendor/pnouns/erc721a/contracts/extensions/IERC721AQueryable.sol
contracts/vendor/pnouns/erc721a/contracts/extensions/ERC721AQueryable.sol
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol
relayer-cf/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-wal
relayer-cf/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-shm
relayer-cf/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite
relayer-cf/node_modules/blake3-wasm/targets.json
relayer-cf/node_modules/blake3-wasm/readme.md
relayer-cf/node_modules/blake3-wasm/package.json
relayer-cf/node_modules/blake3-wasm/LICENSE
relayer-cf/node_modules/semver/classes/semver.js
relayer-cf/node_modules/semver/classes/range.js
relayer-cf/node_modules/semver/classes/index.js
relayer-cf/node_modules/semver/classes/comparator.js
relayer-cf/.wrangler/state/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-wal
relayer-cf/.wrangler/state/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-shm
relayer-cf/.wrangler/state/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite
relayer-cf/.wrangler/state/v3/kv/miniflare-KVNamespaceObject/0b9f7ad44d3a17205fa42bdbc2491ecc37d7a95e3e6ee463bb063bec0243afa1.sqlite
relayer-cf/node_modules/wrangler/templates/__tests__/tsconfig.json
relayer-cf/node_modules/wrangler/templates/__tests__/tsconfig-sanity.ts
relayer-cf/node_modules/wrangler/templates/__tests__/pages-dev-util.test.ts
relayer-cf/node_modules/wrangler/templates/tsconfig.json
relayer-cf/node_modules/wrangler/templates/tsconfig.init.json
relayer-cf/node_modules/wrangler/templates/tsconfig-sanity.ts
relayer-cf/node_modules/tslib/tslib.js
relayer-cf/node_modules/tslib/tslib.html
relayer-cf/node_modules/tslib/tslib.es6.mjs
relayer-cf/node_modules/tslib/tslib.es6.js
relayer-cf/node_modules/tslib/tslib.es6.html
relayer-cf/node_modules/tslib/tslib.d.ts
relayer-cf/node_modules/tslib/SECURITY.md
relayer-cf/node_modules/tslib/README.md
relayer-cf/node_modules/tslib/package.json
contracts/vendor/pnouns/contract/contracts/libs/ProviderTokenA1.sol
relayer-cf/node_modules/tslib/CopyrightNotice.txt
relayer-cf/node_modules/blake3-wasm/esm/node.test.js.map
relayer-cf/node_modules/blake3-wasm/esm/node.test.js
relayer-cf/node_modules/blake3-wasm/esm/node.test.d.ts
relayer-cf/node_modules/unenv/dist/runtime/_internal/utils.mjs
relayer-cf/node_modules/unenv/dist/runtime/_internal/utils.d.mts
relayer-cf/node_modules/unenv/dist/runtime/_internal/types.mjs
relayer-cf/node_modules/unenv/dist/runtime/_internal/types.d.mts
relayer-cf/node_modules/youch/build/src/youch.d.ts
relayer-cf/node_modules/youch/build/src/types.js
relayer-cf/node_modules/youch/build/src/types.d.ts
relayer-cf/node_modules/youch/build/src/templates.d.ts
relayer-cf/node_modules/semver/bin/semver.js
relayer-cf/node_modules/tslib/modules/package.json
relayer-cf/node_modules/tslib/modules/index.js
relayer-cf/node_modules/tslib/modules/index.d.ts
relayer-cf/node_modules/tslib/LICENSE.txt
relayer-cf/node_modules/wrangler/templates/startDevWorker/ProxyWorker.ts
relayer-cf/node_modules/wrangler/templates/startDevWorker/InspectorProxyWorker.ts
relayer-cf/node_modules/wrangler/templates/pages-template-worker.ts
relayer-cf/node_modules/wrangler/templates/pages-template-plugin.ts
relayer-cf/node_modules/wrangler/templates/pages-shim.ts
relayer-cf/node_modules/wrangler/templates/pages-dev-util.ts
relayer-cf/node_modules/wrangler/templates/pages-dev-pipeline.ts
relayer-cf/node_modules/wrangler/templates/no-op-worker.js
relayer-cf/node_modules/wrangler/templates/new-worker.ts
relayer-cf/node_modules/wrangler/templates/new-worker.js
relayer-cf/node_modules/wrangler/templates/new-worker-scheduled.ts
relayer-cf/node_modules/wrangler/templates/new-worker-scheduled.js
relayer-cf/node_modules/wrangler/templates/modules-watch-stub.js
relayer-cf/node_modules/sharp/src/utilities.h
relayer-cf/node_modules/sharp/src/utilities.cc
relayer-cf/node_modules/sharp/src/stats.h
relayer-cf/node_modules/sharp/src/stats.cc
relayer-cf/node_modules/sharp/src/sharp.cc
relayer-cf/node_modules/sharp/src/pipeline.h
relayer-cf/node_modules/sharp/src/pipeline.cc
relayer-cf/node_modules/sharp/src/operations.h
relayer-cf/node_modules/sharp/src/operations.cc
relayer-cf/node_modules/sharp/src/metadata.h
relayer-cf/node_modules/sharp/src/metadata.cc
relayer-cf/node_modules/sharp/src/common.h
relayer-cf/node_modules/sharp/src/common.cc
relayer-cf/node_modules/sharp/src/binding.gyp
relayer-cf/node_modules/sharp/README.md
relayer-cf/node_modules/sharp/package.json
relayer-cf/node_modules/sharp/LICENSE
relayer-cf/node_modules/supports-color/readme.md
relayer-cf/node_modules/supports-color/package.json
relayer-cf/node_modules/supports-color/license
relayer-cf/node_modules/supports-color/index.js
relayer-cf/node_modules/supports-color/index.d.ts
relayer-cf/node_modules/supports-color/browser.js
relayer-cf/node_modules/supports-color/browser.d.ts
relayer-cf/node_modules/unenv/dist/index.d.mts
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol
contracts/vendor/pnouns/@openzeppelin/contracts/utils/Strings.sol
relayer-cf/node_modules/blake3-wasm/esm/node-native/native.js.map
relayer-cf/node_modules/blake3-wasm/esm/node-native/native.js
relayer-cf/node_modules/blake3-wasm/esm/node-native/native.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node-native/index.js.map
relayer-cf/node_modules/blake3-wasm/esm/node-native/index.js
relayer-cf/node_modules/blake3-wasm/esm/node-native/index.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-instance.js.map
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-instance.js
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-instance.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-fn.js.map
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-fn.js
relayer-cf/node_modules/blake3-wasm/esm/node-native/hash-fn.d.ts
relayer-cf/node_modules/pathe/utils.d.ts
relayer-cf/node_modules/pathe/README.md
relayer-cf/node_modules/pathe/package.json
relayer-cf/node_modules/pathe/LICENSE
relayer-cf/node_modules/sharp/lib/index.d.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-scheduled.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-pretty-error.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-patch-console-prefix.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-patch-console-prefix.d.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
relayer-cf/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
relayer-cf/node_modules/wrangler/templates/middleware/loader-sw.ts
relayer-cf/node_modules/wrangler/templates/middleware/loader-modules.ts
relayer-cf/node_modules/wrangler/templates/middleware/common.ts
relayer-cf/node_modules/wrangler/templates/facade.d.ts

exec
/bin/bash -lc "git status --short && git show --stat --oneline --decorate --no-renames 8e37def && git show --format=fuller --no-ext-diff --no-renames 8e37def -- relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/test/worker-tick.test.mjs scripts docs | sed -n '1,2600p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
8e37def (HEAD -> main) 第14回監査(Codex)対応: ABI の error 定義欠落を修正ほか
 docs/AUDIT-RESPONSE-2026-08-18.md    |   21 +
 docs/RUNBOOK-MAINNET.md              |   14 +-
 docs/audit-14-codex-raw.md           | 9536 ++++++++++++++++++++++++++++++++++
 relayer-cf/src/abi.js                |   32 +-
 relayer-cf/src/worker.js             |   14 +-
 relayer-cf/test/worker-tick.test.mjs |   79 +-
 scripts/check-deploy.mjs             |    9 +-
 scripts/mainnet/deploy-snapvoter.js  |    8 +-
 8 files changed, 9695 insertions(+), 18 deletions(-)
commit 8e37defc16e1a73436768d760471a6f76908b6c9
Author:     earlgrey <[redacted-email]>
AuthorDate: Thu Aug 20 23:46:27 2026 +0900
Commit:     earlgrey <[redacted-email]>
CommitDate: Thu Aug 20 23:46:27 2026 +0900

    第14回監査(Codex)対応: ABI の error 定義欠落を修正ほか
    
    Medium:
    - METAGOV_ABI に custom error 全 28 個を追加。error 定義ゼロのため viem が
      RegistrationTooRecent を復号できず、第13回の二重防御②が死にコードだった
      (eligibleAtBlock 読取失敗時に dead-letter 化が再発し得た)
    - graceBad 検出を追加: 登録が遅すぎて猶予明け+排出時間が締切を超える場合、
      警告・告知抑止・mainnet 停止(票ゼロ確定を防ぐ)
    - deploy: MARGIN 10〜7200 検証、全アドレスの getAddress+ゼロ拒否。
      check-deploy: mainnet で EXPECT_MARGIN / EXPECT_BOT を必須化
    - RUNBOOK の $ENV 前置を env $ENV に修正(bash で実行不能だった)
    
    Low:
    - 実投函経路のテスト 4 本: 票 1 件のフルパス(simulate→write→snapsent)、
      復号された RegistrationTooRecent は drop に数えない / StaleVote は数える、
      猶予境界 block==eligibleAt で即投函
    
    テスト: relayer 43 pass (17 シナリオ) / contracts 19 pass。
    コントラクト無変更、Worker 再デプロイ済み。check-deploy sepolia 全項目一致。
    
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5

diff --git a/docs/AUDIT-RESPONSE-2026-08-18.md b/docs/AUDIT-RESPONSE-2026-08-18.md
index 046a3d7..dd845b8 100644
--- a/docs/AUDIT-RESPONSE-2026-08-18.md
+++ b/docs/AUDIT-RESPONSE-2026-08-18.md
@@ -238,3 +238,24 @@ create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot
 テストフックの本番無影響、/api/config の relayer 公開。
 
 **要 Sepolia 追随**: なし(コントラクト無変更)。Worker は再デプロイ済み。
+
+---
+
+## 第14回監査 (2026-08-20, Codex CLI / read-only) — 第13回修正の最終確認
+
+対象: 1be9d16。生ログ: `docs/audit-14-codex-raw.md`
+総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
+
+| # | 重大度 | 指摘 | 対応 |
+|---|---|---|---|
+| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
+| 2 | Medium | 登録が遅すぎて猶予明けが締切以降になる場合、専用警告なく「票ゼロ」で確定する(timelineSafe は eligibleAt を見ない) | 修正: `eligibleAt + 排出時間 >= deadline` を graceBad として検出。警告を出し、告知を抑止し、mainnet では処理を停止。テスト追加 ※この欠陥もこちらで事前に特定し監査依頼に明記していたもの |
+| 3 | Medium | MARGIN 未検証・EXPECT_MARGIN/EXPECT_BOT が任意・アドレスの checksum/ゼロ検証なし | 修正: deploy 側で MARGIN 10〜7200 の整数・全アドレスの getAddress + ゼロ拒否。check-deploy 側で mainnet の EXPECT_MARGIN(deployed 段階)・EXPECT_BOT(worker 段階)を必須化 |
+| 4 | Medium | RUNBOOK の `$ENV node …` は bash では実行できない(変数展開はコマンド扱い) | 修正: `env $ENV node …` に統一 |
+| 5 | Low | 実投函経路が未テスト | 修正: 票 1 件を simulate → writeContract → snapsent 保存まで通すテスト、復号 revert の振り分け(transient/恒久)、猶予境界 block==eligibleAt の 4 本を追加(計 17 シナリオ / relayer 43 テスト) |
+
+問題なし: 猶予ゲートの境界(block==eligibleAt で即投函・1 tick の無駄なし)、preflight の正当性
+(owner による登録は正常系)、deploy の読み戻し・FORCE 保護、stage 分割と RUNBOOK の整合、
+pendingnotes の id 重複排除。
+
+テスト: relayer 43 pass / contracts 19 pass。コントラクト無変更(Worker のみ再デプロイ)。
diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
index 663daeb..b9458fe 100644
--- a/docs/RUNBOOK-MAINNET.md
+++ b/docs/RUNBOOK-MAINNET.md
@@ -43,12 +43,14 @@ REG_DELAY=7200 MARGIN=300 \
 
 ```bash
 ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
-     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> EXPECT_BOT=0x<Snapshot bot>"
-# 手順 2 の後:            $ENV node scripts/check-deploy.mjs --stage deployed
-# 手順 4 の後:            $ENV node scripts/check-deploy.mjs --stage worker
-# プール入金の後:         $ENV node scripts/check-deploy.mjs --stage funded
-# 手順 6-1(委任)の後:     $ENV node scripts/check-deploy.mjs --stage delegated
-# 手順 6-3(live 化)の後:  $ENV node scripts/check-deploy.mjs --stage live
+     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> \
+     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=300"
+# (シェルの制約上、変数展開をコマンドとして実行できないため env を前置する)
+# 手順 2 の後:            env $ENV node scripts/check-deploy.mjs --stage deployed
+# 手順 4 の後:            env $ENV node scripts/check-deploy.mjs --stage worker
+# プール入金の後:         env $ENV node scripts/check-deploy.mjs --stage funded
+# 手順 6-1(委任)の後:     env $ENV node scripts/check-deploy.mjs --stage delegated
+# 手順 6-3(live 化)の後:  env $ENV node scripts/check-deploy.mjs --stage live
 ```
 
 mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
diff --git a/docs/audit-14-codex-raw.md b/docs/audit-14-codex-raw.md
new file mode 100644
index 0000000..fe4ada8
--- /dev/null
+++ b/docs/audit-14-codex-raw.md
@@ -0,0 +1,9536 @@
+Reading additional input from stdin...
+OpenAI Codex v0.145.0-alpha.7
+--------
+workdir: /mnt/data/pnouns-voter
+model: gpt-5.6-sol
+provider: openai
+approval: never
+sandbox: read-only
+reasoning effort: medium
+reasoning summaries: none
+session id: 01a01f9b-ce94-7dc1-a187-62252c933533
+--------
+user
+# 監査依頼 (第14回・最終確認) — 第13回指摘への修正の検証
+
+あなたは pNouns Voter の第三者監査者です。第13回監査 (docs/audit-13-codex-raw.md) の
+指摘に対する修正が commit `1be9d16` に入っています。`git show 1be9d16` で差分を確認し、
+**修正が正しいか・新しい欠陥を持ち込んでいないか**だけに絞って検証してください。
+明日、Sepolia での実機 E2E を控えており、これがコード面の最終確認です。
+
+リポジトリ: /mnt/data/pnouns-voter (読み取りのみ。ファイル変更禁止)
+
+## 検証項目 (優先順)
+
+1. **[前回 High] 猶予中の dead-letter 化の修正**:
+   - chain.js: metagovInfo に eligibleAtBlock を追加 (allowFailure なので旧コントラクトでは 0)
+   - worker.js: `if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt))` で投函をゲート
+   - worker.js: revertErrorName() で RegistrationTooRecent を一括・個別 simulate とも transient 扱い
+   検証観点:
+   a. ゲート条件のバグ: eligibleAt=0 (旧コントラクト/未登録) のとき投函が止まらないこと、
+      block == eligibleAt ちょうどのときコントラクト側 (`block.number < eligibleAtBlock` で revert)
+      と Worker 側の不等号が整合すること (off-by-one で 1 tick 無駄 revert しないか)
+   b. revertErrorName の実装: viem の ContractFunctionRevertedError で
+      `x.data?.errorName` が取れる条件。ABI に RegistrationTooRecent エラーが
+      定義されていないと errorName は復号できないのでは? relayer-cf/src/abi.js に
+      error 定義が含まれているか確認すること。**含まれていなければ二重防御②は機能しない。**
+   c. 猶予ゲートで投函をスキップしている間、告知だけが先に出る設計は妥当としたが、
+      締切間際に登録された提案 (eligibleAt が deadline を超える) の票は
+      永遠に投函されない。この場合に警告は出るか? timelineSafe の検査で捕まるか?
+2. **[前回 Medium] create-and-register の preflight**: registrar()/owner() 照合、
+   nounsToSnap 未登録確認、getCode。逆に「registrar 権限はあるが owner が別」等の
+   正常系を誤って弾かないか。preflight の RPC 呼び出しが dry-run 経路に影響しないか
+3. **[前回 Medium] scripts/mainnet/deploy-snapvoter.js**: 引数検証・読み戻し・FORCE 保護・
+   OUT 上書き経路。hardhat.config の mainnet ネットワーク追加が既存に影響しないか
+4. **[前回 Medium] check-deploy の --stage 分割**: 各段階の要求が RUNBOOK の手順と
+   整合するか。EXPECT 必須化のロジック (requireEnv) にバグはないか
+   (EXPECT が未指定のとき check 自体がスキップされて成功扱いになる経路が残っていないか)
+5. **[前回 Low] pendingnotes の id 重複排除**: queueNotify(…, id) と flush の seen 処理。
+   id=null (announce 等では使わない) の従来経路に影響しないか
+6. 新テスト 3 本 (猶予ゲート/hub errors/pendingnotes 再送) の妥当性。
+   特に猶予テストのケース B が「本当に投函経路に入った」ことをどこまで保証するか
+
+## 出力形式
+日本語。[重大度] / 該当箇所 / 何が起きるか / 推奨する修正。「問題なし」も根拠つきで。
+`relayer-cf` で `npm test` を実行し結果を含めること。
+codex
+読み取り専用で、commit 差分・前回監査・関連 ABI/実装/RUNBOOK/新規テストを突き合わせます。最後に `relayer-cf` の `npm test` を実行し、指摘は今回の修正起因・未解消点だけに限定します。
+  → 第13回監査と commit 1be9d16 の差分を確認する
+  • 6検証項目を関連コード・RUNBOOK・テストまで追跡する
+  • relayer-cf で npm test を実行し結果を評価する
+  • 重大度順の日本語監査結果をまとめる
+exec
+/bin/bash -lc 'git status --short && git show --stat --oneline --decorate --no-renames 1be9d16 && git show --no-ext-diff --unified=80 --no-renames 1be9d16 -- docs/audit-13-codex-raw.md relayer-cf/src/chain.js relayer-cf/src/worker.js relayer-cf/src/abi.js scripts/mainnet/deploy-snapvoter.js hardhat.config.js scripts/mainnet/check-deploy.js docs/RUNBOOK.md' in /mnt/data/pnouns-voter
+ succeeded in 0ms:
+1be9d16 (HEAD -> main) 第13回監査(Codex)対応: 登録猶予中の票の dead-letter 化を修正ほか
+ docs/AUDIT-RESPONSE-2026-08-18.md    |   22 +
+ docs/RUNBOOK-MAINNET.md              |   42 +-
+ docs/audit-13-codex-raw.md           | 4575 ++++++++++++++++++++++++++++++++++
+ hardhat.config.js                    |    5 +
+ relayer-cf/src/chain.js              |    4 +-
+ relayer-cf/src/snap.js               |    3 +
+ relayer-cf/src/worker.js             |   27 +-
+ relayer-cf/test/worker-tick.test.mjs |   59 +
+ scripts/check-deploy.mjs             |  134 +-
+ scripts/create-and-register.mjs      |   15 +-
+ scripts/mainnet/deploy-snapvoter.js  |   53 +
+ 11 files changed, 4870 insertions(+), 69 deletions(-)
+commit 1be9d1658bbf7acb85c6eff646d7ee7c8569c79c
+Author: earlgrey <[redacted-email]>
+Date:   Thu Aug 20 23:37:44 2026 +0900
+
+    第13回監査(Codex)対応: 登録猶予中の票の dead-letter 化を修正ほか
+    
+    High:
+    - mainnet の登録猶予(24h)中に届いた正常票が dead-letter 化される問題。
+      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
+      revert を恒久失敗として snapdrop に数えていた(約10分で除外)。
+      ①猶予中は submitFromSnapshot を呼ばない ②revert 名を復号し
+      RegistrationTooRecent は一括・個別とも数えない、の二重防御。
+      Worker テスト(猶予中/解禁後)を必須化どおり追加
+    
+    Medium:
+    - create-and-register にオンチェーン preflight(コントラクト実在・
+      registrar 権限・未登録)を追加。孤児提案の設定起因経路を閉鎖
+    - scripts/mainnet/deploy-snapvoter.js を実装、フォークで実デプロイ検証。
+      hardhat.config に mainnet ネットワークを追加
+    - check-deploy を --stage 分割(deployed/worker/funded/delegated/live)。
+      mainnet は EXPECT_* 必須・excluded/delegates 照合・照会失敗 fail・
+      live 前は liveMode=false 要求。runbook を段階照合に書き換え、
+      ロールバックを 8 手順の固定順序に拡充
+    
+    Low:
+    - pendingnotes に tx id を導入し重複送信を排除(残余は accepted risk)
+    - URL 照合の 989偽=true を仕様として文書化
+    - テスト追加: hub errors 応答の fail-closed / pendingnotes 再送
+    
+    テスト: relayer 38 pass / contracts 19 pass。Worker 再デプロイ済み。
+    
+    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5
+
+diff --git a/docs/audit-13-codex-raw.md b/docs/audit-13-codex-raw.md
+new file mode 100644
+index 0000000..0815d85
+--- /dev/null
++++ b/docs/audit-13-codex-raw.md
+@@ -0,0 +1,4575 @@
++Reading additional input from stdin...
++OpenAI Codex v0.145.0-alpha.7
++--------
++workdir: /mnt/data/pnouns-voter
++model: gpt-5.6-sol
++provider: openai
++approval: never
++sandbox: read-only
++reasoning effort: medium
++reasoning summaries: none
++session id: 01a01f8d-7b08-7332-b18b-e91b3c2fd7b9
++--------
++user
++# 監査依頼 (第13回) — 第12回修正と mainnet 前提課題(テスト・runbook・3者分離)の検証
++
++あなたは pNouns Voter の第三者監査者です。第12回監査 (docs/audit-12-codex-raw.md /
++docs/AUDIT-RESPONSE-2026-08-18.md 末尾) のあと、2 つのコミットを積みました。
++
++- `3e02162` … 第12回のあなたの指摘 5 件への修正
++- `cc423e3` … 残課題 2 点: Worker 状態遷移テストの追加、mainnet runbook + Sepolia での 3 者分離リハーサル
++
++`git show 3e02162` と `git show cc423e3` で差分を確認してください。
++リポジトリ: /mnt/data/pnouns-voter (読み取りのみ。ファイルを変更しないこと)。
++オンチェーン確認は不要 (Sepolia の実測は済み: registrar 0xfE07E953…c9ae /
++relayer 0xBbE0b0fe…D561 / owner 0x10849D31…8925 の 3 者分離、check-deploy 全項目一致)。
++
++## A. 第12回指摘への修正 (3e02162) の検証
++
++1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
++   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
++   個別必須化、導出アドレス同士で比較するようになったか。
++   - 前回指摘した「孤児提案」(送信後に検証失敗) の経路は完全に塞がったか。
++     dry-run 経路、nounsDescription/hubVotingPeriod の fetch 失敗時に副作用がないかも確認
++   - sepolia 経路のフォールバック (SEPOLIA_MNEMONIC) は従来どおり動くか (明日の E2E で使う)
++2. **[前回 Medium] MIN_REGISTRATION_DELAY 検証**: cfg() の `Number(env.… ?? 300)` +
++   Number.isInteger + n>=0。`""`(空文字) のとき `Number("")=0` で下限 0 になるが、
++   worker 側 `Math.max(300, 0)` で 300 が効くか。その他の縁ケース ("300.5", " 300 ", null)
++3. **[前回 Low] URL 末尾除去の統合**: 1 つの選択式 `(?:[句読点]|[^!-~])+$` で
++   前回列挙した全ケース (989abc / %20foo / 989偽 / 989.後 / Markdown / クエリ内括弧) が
++   期待どおりか。テストの期待値そのものが仕様として妥当かも述べること
++4. **[前回 Low] pendingnotes キュー**: queueNotify / flushPendingNotes の実装。
++   - KV write 収支: 失敗のたびに put(上限 20 件・TTL 1日)。Discord が長時間死んだ場合の
++     1 日あたり write 数の上限を見積もり、無料枠 1,000/日 を圧迫しないか
++   - flush が tick 冒頭で毎回 get する (reads 1,440/日) は問題ないか
++   - 重複送信リスク (送信成功したのに false が返るケース) と、text だけ持ち回す設計の妥当性
++5. **[前回 Low] 非 Snapshot 告知の順序**: 統一されたか
++
++## B. Worker 状態遷移テスト (cc423e3) の検証
++
++6. `relayer-cf/src/worker.js` のテストフック (__setClientsForTests /
++   __resetWorkerStateForTests) が**本番経路の挙動を一切変えていない**こと。
++   フックの露出による危険 (本番 Worker 上で誤って呼ばれる経路) はないか
++7. `relayer-cf/test/worker-tick.test.mjs` の 9 シナリオは、第11回で私が挙げた
++   未検証経路 (GraphQL error 時の抑止 / 成功0件 / 告知順序 / Discord 失敗時の KV write /
++   mainnet/testnet 差分 / delay 再確認) をどこまで塞いだか。**まだ穴のままの経路**を
++   具体的に列挙すること (例: 実投函 submitFromSnapshot の経路、rush、supplement、
++   dead-letter、reconcile、非 Snapshot モード全般)
++8. 偽 publicClient / 偽 KV / fetch mock の忠実度: 本物と挙動が食い違い、
++   テストが偽の安心を与える箇所はないか (例: multicall の allowFailure、
++   KV の結果整合性、Response の body ストリーム)
++
++## C. runbook と照合スクリプト (cc423e3) の検証
++
++9. `docs/RUNBOOK-MAINNET.md`: 手順の順序に危険はないか。特に
++   - liveMode=false で開始 → シャドー → 委任 → liveMode=true の順序で、
++     途中段階に「片側だけ有効」の危険な状態がないか
++   - REG_DELAY=7200 (24h) と Worker cron・Snapshot 48h 期間・margin 300 の整合
++   - ロールバック手順の完全性 (戻し忘れが残る資産・状態はないか)
++   - 参照しているスクリプト (scripts/mainnet/deploy-snapvoter.js) は**まだ存在しない**。
++     runbook が実在しないものを指している問題をどう扱うべきか
++10. `scripts/check-deploy.mjs`: 照合の網羅性と誤判定。
++    - excluded (トレジャリー除外) を確認していないのでは?
++    - Worker /api/config が古い版を返す伝搬遅延で誤判定しうる点
++    - EXPECT_OWNER 等が未指定のとき mainnet で素通りする項目はないか
++11. `/api/config` への relayer アドレス追加は情報公開として問題ないか
++
++## 出力形式
++日本語。[重大度] / 該当箇所 (file:line) / 何が起きるか / 推奨する修正。
++「問題なし」も根拠つきで。`relayer-cf` で `npm test`、ルートで可能なら
++`npx hardhat test` を実行し結果を含めること (fork テストが RPC 不達で失敗する場合は
++その旨を明記)。
++codex
++第13回監査として、まずリポジトリ内の指示・対象2コミット・現行ファイルを照合し、その後に指定テストを実行します。差分だけでなく現在の行番号に紐づけ、各指摘について副作用経路とテストの忠実度まで追います。ファイルは変更しません。
++exec
++/bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g '"'!node_modules'"' -g '"'!artifacts'"' -g '"'!cache'"' && git status --short && git show --stat --oneline 3e02162 && git show --stat --oneline cc423e3" in /mnt/data/pnouns-voter
++ exited 1 in 0ms:
++/mnt/data/pnouns-voter
++
++exec
++/bin/bash -lc 'find .. -name AGENTS.md -print' in /mnt/data/pnouns-voter
++ succeeded in 7640ms:
++../RuView/repo/plugins/ruview/codex/AGENTS.md
++../zotero/zotero_auto_ingest/translation-server/modules/translators/AGENTS.md
++../EC_site/AGENTS.md
++../EC_site/node_modules/next/AGENTS.md
++../LineHernes/line-harness-oss/AGENTS.md
++
++exec
++/bin/bash -lc 'git status --short
++git show --stat --oneline 3e02162
++git show --stat --oneline cc423e3' in /mnt/data/pnouns-voter
++ succeeded in 0ms:
++3e02162 第12回監査(Codex)対応: 3者分離チェックの死にコード修正ほか
++ docs/AUDIT-RESPONSE-2026-08-18.md   |   24 +
++ docs/audit-12-codex-raw.md          | 2971 +++++++++++++++++++++++++++++++++++
++ relayer-cf/src/chain.js             |    2 +-
++ relayer-cf/src/snap.js              |    3 +-
++ relayer-cf/src/worker.js            |   37 +-
++ relayer-cf/test/link-check.test.mjs |   11 +
++ scripts/create-and-register.mjs     |   30 +-
++ 7 files changed, 3060 insertions(+), 18 deletions(-)
++cc423e3 mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
++ docs/RUNBOOK-MAINNET.md              |  86 ++++++++++++++
++ relayer-cf/src/index.js              |   5 +-
++ relayer-cf/src/worker.js             |  13 ++-
++ relayer-cf/test/worker-tick.test.mjs | 212 +++++++++++++++++++++++++++++++++++
++ scripts/check-deploy.mjs             |  95 ++++++++++++++++
++ scripts/sepolia/_rehearse-keys.js    |  55 +++++++++
++ 6 files changed, 464 insertions(+), 2 deletions(-)
++
++exec
++/bin/bash -lc 'git show --format=fuller --find-renames 3e02162 -- scripts/create-and-register.mjs relayer-cf/src/chain.js relayer-cf/src/snap.js relayer-cf/src/worker.js relayer-cf/test/link-check.test.mjs
++git show --format=fuller --find-renames cc423e3 -- docs/RUNBOOK-MAINNET.md relayer-cf/src/index.js relayer-cf/src/worker.js relayer-cf/test/worker-tick.test.mjs scripts/check-deploy.mjs scripts/sepolia/_rehearse-keys.js' in /mnt/data/pnouns-voter
++ succeeded in 0ms:
++commit 3e021624c40269ea9ed12341c57352ce69290d2f
++Author:     earlgrey <[redacted-email]>
++AuthorDate: Thu Aug 20 22:19:14 2026 +0900
++Commit:     earlgrey <[redacted-email]>
++CommitDate: Thu Aug 20 22:19:14 2026 +0900
++
++    第12回監査(Codex)対応: 3者分離チェックの死にコード修正ほか
++    
++    Medium:
++    - create-and-register.mjs の鍵分離チェックが、どこにも定義のない
++      MAINNET_PROPOSER_MNEMONIC と比較する死にコードだった。鍵・RPC・
++      deployments の検証を Snapshot 送信前に移動し(孤児提案の防止)、
++      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
++      導出アドレス同士で比較するよう修正
++    - MIN_REGISTRATION_DELAY に不正値(NaN)を与えると Math.max(300, NaN)=NaN
++      で絶対下限が消える。cfg() で非負整数を検証し throw
++    
++    Low:
++    - URL 末尾除去を 1 パスの選択式に統合("989.後" の取りこぼし解消)。
++      第12回指定の 6 ケースをテスト追加
++    - 確定 tx 通知の送信失敗分を pendingnotes キューに積んで次 tick で再送
++      (トリガー消失による通知の恒久喪失を解消。list API 不使用)
++    - 非 Snapshot モードの告知も送信成功後に「告知済み」を記録
++    
++    確認済み(問題なし): 第11回 High の提案単位 fail-closed、締切後の自己 DoS
++    不在、unresolved 4 分類、3者 Set 判定、KV 負荷。
++    
++    テスト: relayer 26 pass / contracts 19 pass。コントラクト無変更。
++    
++    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
++    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5
++
++diff --git a/relayer-cf/src/chain.js b/relayer-cf/src/chain.js
++index c92555b..a5d926f 100644
++--- a/relayer-cf/src/chain.js
+++++ b/relayer-cf/src/chain.js
++@@ -51,7 +51,7 @@ export function cfg(env) {
++     snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
++     ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
++     cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
++-    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
+++    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
++     rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
++     submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
++     discordWebhook: env.DISCORD_WEBHOOK_URL || null,
++diff --git a/relayer-cf/src/snap.js b/relayer-cf/src/snap.js
++index d19cb3a..e140327 100644
++--- a/relayer-cf/src/snap.js
+++++ b/relayer-cf/src/snap.js
++@@ -53,7 +53,8 @@ export function referencesNounsProposal(text, nounsId) {
++   for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
++     // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
++     // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
++-    const trimmed = raw.replace(/[)\]}>,.;:!?、。」』】）〕｝＞…]+$/u, "").replace(/[^\u0021-\u007e]+$/u, "");
+++    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
+++    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
++     let u;
++     try { u = new URL(trimmed); } catch { continue; }
++     if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
++diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
++index 49d4856..4ecd93b 100644
++--- a/relayer-cf/src/worker.js
+++++ b/relayer-cf/src/worker.js
++@@ -16,6 +16,32 @@ async function notify(c, text) {
++   catch (e) { console.warn("discord notify failed", e.message); return false; }
++ }
++ const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
+++
+++// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
+++// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
+++async function queueNotify(c, store, text) {
+++  if (await notify(c, text)) return true;
+++  const k = `${store.prefix}pendingnotes`;
+++  const arr = (await store.kvRaw.get(k, "json")) || [];
+++  arr.push({ text, at: Date.now() });
+++  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
+++  return false;
+++}
+++async function flushPendingNotes(c, store) {
+++  const k = `${store.prefix}pendingnotes`;
+++  let arr;
+++  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
+++  if (!Array.isArray(arr) || !arr.length) return;
+++  const rest = [];
+++  for (const n of arr) {
+++    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
+++    if (!(await notify(c, n.text))) rest.push(n);
+++  }
+++  if (rest.length !== arr.length) {
+++    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
+++    else await store.kvRaw.delete(k);
+++  }
+++}
++ const WORDS = ["反対", "賛成", "棄権"];
++ 
++ function isContractRevert(e) {
++@@ -50,14 +76,14 @@ async function announceNew(c, pc, store, p, block, snapInfo) {
++   const deadlineBlock = mg.deadline || p.endBlock;
++   const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
++   const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
++-  await store.putAnnounced(p.id, new Date().toISOString());
++-  await notify(c, [
+++  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
+++  if (await notify(c, [
++     `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
++     `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
++     `締切: ${jst} ごろ (block ${deadlineBlock})`,
++     `投票ページ: ${c.publicUrl}`,
++     `提案の内容: https://nouns.wtf/vote/${p.id}`,
++-  ].join("\n"));
+++  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
++ }
++ 
++ // 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
++@@ -105,7 +131,7 @@ async function reconcileSent(c, pc, store, proposalId, summaries) {
++     if (rc && rc.status === "success") {
++       if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
++       const mg = await metagovInfo(c, pc, proposalId);
++-      const sent = await notify(c, [
+++      const sent = await queueNotify(c, store, [
++         `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
++         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++         `tx: ${explorerTx(c, tx)}`,
++@@ -140,7 +166,7 @@ async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
++     // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
++     if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
++       const mg = await metagovInfo(c, pc, nounsId);
++-      const sent = await notify(c, [
+++      const sent = await queueNotify(c, store, [
++         `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
++         `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++         `tx: ${explorerTx(c, pending.txs[0])}`,
++@@ -394,6 +420,7 @@ export async function tick(env) {
++   const { publicClient: pc, walletClient: wc } = clients(c);
++   const store = makeStore(env.STATE, storeNs(c));
++   try {
+++    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
++     if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
++     const { block, proposals } = await recentProposals(c, pc);
++     await reconcileRecent(c, pc, wc, store, proposals);
++diff --git a/relayer-cf/test/link-check.test.mjs b/relayer-cf/test/link-check.test.mjs
++index 4f7eddd..9eaa872 100644
++--- a/relayer-cf/test/link-check.test.mjs
+++++ b/relayer-cf/test/link-check.test.mjs
++@@ -63,3 +63,14 @@ test("末尾処理で別 ID に化けない", () => {
++ test("改行で分断された URL は検出しない(仕様)", () => {
++   assert.equal(ref("https://nouns.wtf/vote/\n989", 989), false);
++ });
+++
+++// 第12回監査: 末尾処理の仕様確認ケース
+++test("第12回監査の追加ケース", () => {
+++  assert.equal(ref("https://nouns.wtf/vote/989abc", 989), false, "パスに英字が続けば別パス");
+++  assert.equal(ref("https://nouns.wtf/vote/989%20foo", 989), false, "エンコード済み文字も別パス");
+++  // 仕様: URL 直後の非 ASCII は「後置の文」とみなす。/vote/989偽 という提案パスは実在しないため安全側
+++  assert.equal(ref("https://nouns.wtf/vote/989偽", 989), true);
+++  assert.equal(ref("https://nouns.wtf/vote/989.後", 989), true, "句読点と日本語が交互でも 1 パスで除去");
+++  assert.equal(ref("[t](https://nouns.wtf/vote/989)", 989), true);
+++  assert.equal(ref("[t](https://nouns.wtf/vote/989?x=(y))", 989), true, "クエリ内括弧つき Markdown");
+++});
++diff --git a/scripts/create-and-register.mjs b/scripts/create-and-register.mjs
++index 3ce4f6f..95139a0 100644
++--- a/scripts/create-and-register.mjs
+++++ b/scripts/create-and-register.mjs
++@@ -51,7 +51,23 @@ async function main() {
++   console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
++   if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
++ 
++-  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
+++  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
+++  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
+++  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
+++  const voter = dep.snapVoter || dep.voter;
+++  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
+++  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+++  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
+++  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
+++  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
+++  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
+++  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
+++  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
+++  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
+++  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
+++  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
+++  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
+++
++   const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
++   const now = Math.floor(Date.now() / 1000);
++   const client = new snapshot.Client712(SEQ);
++@@ -62,16 +78,8 @@ async function main() {
++   });
++   console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
++ 
++-  // オンチェーンの対応付け(registrar)
++-  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
++-  const voter = dep.snapVoter || dep.voter;
++-  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
++-  // 第11回監査 M-14: mainnet で registrar 用の鍵が未設定のまま提案作成鍵に fallback すると、
++-  // 3 者分離したつもりで同一鍵に戻ってしまう。mainnet では明示指定を必須にする。
++-  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
++-  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || process.env.SEPOLIA_MNEMONIC;
++-  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
++-  const w = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0").connect(new ethers.JsonRpcProvider(rpc));
+++  // オンチェーンの対応付け(registrar) — 鍵と設定は送信前に検証済み
+++  const w = registrarWallet.connect(new ethers.JsonRpcProvider(rpc));
++   const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
++   const c = new ethers.Contract(voter, abi, w);
++   const tx = await c.registerProposal(receipt.id, nounsId);
++commit cc423e311b7584c1261a220192b36785b518bf64
++Author:     earlgrey <[redacted-email]>
++AuthorDate: Thu Aug 20 23:21:49 2026 +0900
++Commit:     earlgrey <[redacted-email]>
++CommitDate: Thu Aug 20 23:21:49 2026 +0900
++
++    mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
++    
++    1. Worker レベルの状態遷移テスト (第11回監査 指摘7):
++    - worker.js にテストフックを追加(clients 差し替えとモジュール状態リセット。
++      本番経路は不変)。KV は偽 env.STATE、ハブ/Discord は fetch mock で注入
++    - test/worker-tick.test.mjs に 9 シナリオ: ハブ障害の fail-closed /
++      ハブ正常0件+登録済み=unresolved 停止と KV write 抑制 / linkOk=false で
++      告知抑止 / 告知は Discord 2xx 後にのみ記録(失敗→次 tick 再送) /
++      mainnet 猶予下限(環境変数で下げても 300 が効く) / 3 者同一で停止 /
++      MIN_REGISTRATION_DELAY 不正値で throw / spaceCheck キャッシュ /
++      締切後の "no votes" 確定は対応付け済みのみ
++    
++    2. 本番構成 runbook と 3 者分離リハーサル (第11回監査 指摘14):
++    - docs/RUNBOOK-MAINNET.md: 鍵 4 役の分離、liveMode=false 開始 →
++      機械照合 → シャドー → 委任 → liveMode=true の順序固定、ロールバック手順
++    - scripts/check-deploy.mjs: オンチェーン実値・委任・Worker /api/config・
++      残高・3 者分離を機械照合(不一致で非ゼロ終了)
++    - /api/config に relayer アドレスを追加(照合用。秘密は含まない)
++    - Sepolia で実施: registrar/relayer を新規独立鍵に分離
++      (registrar 0xfE07…c9ae / relayer 0xBbE0…D561)、Worker secret 差し替え、
++      transferOwnership 往復演習(新 owner で onlyOwner 通過・旧 owner 拒否を確認)、
++      check-deploy 全項目一致
++    
++    テスト: relayer 35 pass / contracts 19 pass
++    
++    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
++    Claude-Session: https://claude.ai/code/session_01HmvQBSCF9KqnsSUqQv6xe5
++
++diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
++new file mode 100644
++index 0000000..b91cb22
++--- /dev/null
+++++ b/docs/RUNBOOK-MAINNET.md
++@@ -0,0 +1,86 @@
+++# mainnet 移行 runbook (pNouns Voter)
+++
+++第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
+++Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
+++
+++## 0. 前提
+++
+++- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
+++- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
+++
+++## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵
+++
+++| 役割 | 鍵 | 保管 | 資金 |
+++|---|---|---|---|
+++| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
+++| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
+++| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
+++| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
+++
+++**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
+++同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。
+++
+++## 2. デプロイ (liveMode=false で開始)
+++
+++```bash
+++NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
+++  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
+++```
+++
+++- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
+++- `owner_` は**最初からマルチシグを指定**(EOA を経由しない)。registrar_ は上記の registrar アドレス
+++- デプロイ後、**liveMode は false のまま**(コンストラクタ既定)。`setLiveMode(true)` は最終段まで呼ばない
+++- Sourcify でソース検証 → exact_match を確認
+++
+++## 3. 機械照合
+++
+++```bash
+++NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
+++```
+++
+++全項目 ✅ になるまで進まない。確認内容: spaceHash 一致 / delay >= 300 /
+++3 者分離 / Worker 設定一致 / 残高。
+++
+++## 4. Worker (Cloudflare) 設定
+++
+++```bash
+++cd relayer-cf
+++# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
+++npx wrangler kv namespace create STATE --env mainnet
+++npx wrangler deploy --env mainnet
+++npx wrangler secret put RPC_URL --env mainnet
+++npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
+++npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
+++```
+++
+++- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
+++- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
+++
+++## 5. シャドー運用 (liveMode=false)
+++
+++- トレジャリーからプールへ 0.05 ETH 送金
+++- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
+++  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
+++- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
+++
+++## 6. 委任切替 → 本番化 (この順のみ)
+++
+++1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
+++2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
+++3. マルチシグから `setLiveMode(true)`
+++4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
+++
+++## 7. ロールバック
+++
+++いつでも可能・即時:
+++- マルチシグから `setLiveMode(false)` → 集計のみ(シャドー)に戻る
+++- マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
+++- `sweep(トレジャリー)` → プール残額を回収
+++
+++## 8. 障害時
+++
+++- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
+++  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
+++- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
+++  (Worker の自動照合が Discord に⚠️を出す)
+++- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
++diff --git a/relayer-cf/src/index.js b/relayer-cf/src/index.js
++index 1108018..f9cd3b2 100644
++--- a/relayer-cf/src/index.js
+++++ b/relayer-cf/src/index.js
++@@ -19,7 +19,10 @@ app.use("*", async (ctx, next) => {
++ app.get("/api/config", (ctx) => {
++   const c = cfg(ctx.env);
++   const snap = !!c.snapshotSpace;
++-  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
+++  // relayer アドレスは tx 送信時にオンチェーンで公開される情報。照合スクリプト(check-deploy)が
+++  // 「稼働中 Worker の鍵」と「意図した鍵」の一致を機械確認できるよう返す(秘密鍵は含まない)。
+++  const relayer = clients(c).account?.address || null;
+++  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
++ });
++ 
++ app.get("/api/proposals", async (ctx) => {
++diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
++index 4ecd93b..e6c3e37 100644
++--- a/relayer-cf/src/worker.js
+++++ b/relayer-cf/src/worker.js
++@@ -414,10 +414,21 @@ export async function notifyError(c, where, e) {
++ 
++ let lastBalanceCheck = 0;
++ let spaceCheckedAt = 0;
+++
+++// ---- テスト用フック(本番経路では未使用) ----
+++// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
+++// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
+++let _clients = clients;
+++export function __setClientsForTests(f) { _clients = f || clients; }
+++export function __resetWorkerStateForTests(o = {}) {
+++  lastErrNotify = o.errNotifiedAt ?? 0;
+++  lastBalanceCheck = o.balanceCheckedAt ?? 0;
+++  spaceCheckedAt = o.spaceCheckedAt ?? 0;
+++}
++ const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
++ export async function tick(env) {
++   const c = cfg(env);
++-  const { publicClient: pc, walletClient: wc } = clients(c);
+++  const { publicClient: pc, walletClient: wc } = _clients(c);
++   const store = makeStore(env.STATE, storeNs(c));
++   try {
++     try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
++diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
++new file mode 100644
++index 0000000..a69aa05
++--- /dev/null
+++++ b/relayer-cf/test/worker-tick.test.mjs
++@@ -0,0 +1,212 @@
+++// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
+++// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
+++import { test, beforeEach } from "node:test";
+++import assert from "node:assert/strict";
+++import { keccak256, stringToBytes, parseEther } from "viem";
+++import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";
+++
+++const VOTER = "0x1000000000000000000000000000000000000001";
+++const PNOUNS = "0x1000000000000000000000000000000000000002";
+++const DAO = "0x1000000000000000000000000000000000000003";
+++const TOKEN = "0x1000000000000000000000000000000000000004";
+++const OWNER = "0x2000000000000000000000000000000000000001";
+++const REGISTRAR = "0x2000000000000000000000000000000000000002";
+++const RELAYER = "0x2000000000000000000000000000000000000003";
+++const SPACE = "earl-grey.eth";
+++const SNAP_ID = "0x" + "ab".repeat(32);
+++const SNAP_HASH = keccak256(stringToBytes(SNAP_ID));
+++const WEBHOOK = "https://discord.test/webhook";
+++const HUB = "https://hub.test";
+++
+++// ---- 偽 KV ----
+++function fakeKV() {
+++  const data = new Map(); const ops = [];
+++  return {
+++    data, ops,
+++    async get(k, type) { ops.push(["get", k]); const v = data.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
+++    async put(k, v) { ops.push(["put", k]); data.set(k, String(v)); },
+++    async delete(k) { ops.push(["delete", k]); data.delete(k); },
+++    async list({ prefix }) { ops.push(["list", prefix]); return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: null })), list_complete: true }; },
+++  };
+++}
+++
+++// ---- 偽 publicClient: functionName で応答を引く ----
+++function fakePC(h) {
+++  const calls = [];
+++  const one = (x) => { calls.push(x.functionName); const f = h[x.functionName]; if (!f) throw new Error(`fakePC: no handler for ${x.functionName}`); return f(x.args || []); };
+++  return {
+++    calls,
+++    async readContract(x) { return one(x); },
+++    async multicall({ contracts, allowFailure }) {
+++      return contracts.map((x) => {
+++        try { const r = one(x); return allowFailure ? { status: "success", result: r } : r; }
+++        catch (e) { if (allowFailure) return { status: "failure", error: e }; throw e; }
+++      });
+++    },
+++    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
+++    async getBalance() { calls.push("getBalance"); return parseEther("1"); },
+++    async getTransactionReceipt() { throw new Error("not found"); },
+++    async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
+++  };
+++}
+++
+++// ---- fetch mock: ハブと Discord を演じる ----
+++const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
+++globalThis.fetch = async (url, init) => {
+++  const u = String(url);
+++  if (u.startsWith(HUB)) {
+++    F.hubCalls++;
+++    const r = F.hub.shift();
+++    if (r instanceof Error) throw r;
+++    if (typeof r === "number") return new Response("error", { status: r });
+++    return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
+++  }
+++  if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
+++  throw new Error("unexpected fetch: " + u);
+++};
+++
+++function baseEnv(kv, over = {}) {
+++  return { NETWORK: "sepolia", RPC_URL: "http://rpc.test", VOTER, PNOUNS: PNOUNS, NOUNS_DAO: DAO, NOUNS_TOKEN: TOKEN,
+++    EXPLORER: "https://sepolia.etherscan.io", SNAPSHOT_SPACE: SPACE, SNAPSHOT_HUB: HUB,
+++    DISCORD_WEBHOOK_URL: WEBHOOK, STATE: kv, SCAN_PROPOSALS: "3", ...over };
+++}
+++// 提案 1 件(state Active、mg.deadline=195)を返す標準ハンドラ
+++function handlers(over = {}) {
+++  return {
+++    __block: 100,
+++    proposalCount: () => 1n,
+++    proposals: () => [1n, OWNER, 0n, 0n, 0n, 90n, 200n, 0n, 0n, 0n, false, false, false, 0n, 50n],
+++    state: () => 1,
+++    spaceHash: () => keccak256(stringToBytes(SPACE)),
+++    registrationDelayBlocks: () => 400n,
+++    owner: () => OWNER,
+++    registrar: () => REGISTRAR,
+++    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
+++    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
+++    tally: () => [[0n, 0n, 0n], [0n, 0n, 0n], false, 0],
+++    voteDeadline: () => 195n,
+++    getCurrentVotes: () => 2n,
+++    currentResult: () => 2,
+++    getReceipt: () => ({ hasVoted: false, support: 0, votes: 0n }),
+++    liveMode: () => true,
+++    ...over,
+++  };
+++}
+++const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
+++const setup = (h, envOver = {}, wallet = null) => {
+++  const kv = fakeKV(); const pc = fakePC(h);
+++  __setClientsForTests(() => ({ publicClient: pc, walletClient: wallet }));
+++  __resetWorkerStateForTests({ balanceCheckedAt: Date.now() }); // 残高チェックは対象外の tick が既定
+++  return { kv, pc, env: baseEnv(kv, envOver) };
+++};
+++const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));
+++
+++beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });
+++
+++test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
+++  const { kv, env } = setup(handlers());
+++  F.hub = [new Error("network down")];
+++  await tick(env);
+++  assert.equal(F.discordBodies.filter((b) => b.includes("投票受付を開始")).length, 0, "告知しない");
+++  assert.equal(putsOf(kv, "announced").length, 0);
+++  assert.equal(putsOf(kv, "executed").length, 0);
+++  assert.ok(F.discordBodies.some((b) => b.includes("エラー")), "エラー通知は出る");
+++});
+++
+++test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
+++  const { kv, env } = setup(handlers());
+++  F.hub = [{ proposals: [] }, { proposals: [] }]; // 1 回目 20 件クエリ・2 回目 逆引き 200 件クエリ
+++  await tick(env);
+++  assert.ok(F.discordBodies.some((b) => b.includes("取得できません")), "unresolved 警告");
+++  assert.equal(putsOf(kv, "flag:unresolved:1").length, 1);
+++  assert.equal(putsOf(kv, "announced").length, 0, "告知しない");
+++  // 2 tick 目: フラグ済みなので再警告なし・追加書き込みなし
+++  F.hub = [{ proposals: [] }, { proposals: [] }];
+++  const n = F.discordBodies.length; const w = kv.ops.filter(([op]) => op === "put").length;
+++  await tick(env);
+++  assert.equal(F.discordBodies.length, n, "再警告しない");
+++  assert.equal(kv.ops.filter(([op]) => op === "put").length, w, "KV write が増えない");
+++});
+++
+++test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
+++  const { kv, env } = setup(handlers());
+++  F.hub = [hubProposal("https://nouns.wtf/vote/999")]; // 別議案を指す
+++  await tick(env);
+++  assert.ok(F.discordBodies.some((b) => b.includes("参照していません")), "linkwarn");
+++  assert.equal(putsOf(kv, "announced").length, 0, "誤った URL を告知しない");
+++});
+++
+++test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
+++  const { kv, env } = setup(handlers());
+++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+++  F.discordStatus = 500;
+++  await tick(env);
+++  assert.equal(putsOf(kv, "announced").length, 0, "送信失敗なら告知済みにしない");
+++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+++  F.discordStatus = 200;
+++  await tick(env);
+++  assert.ok(F.discordBodies.some((b) => b.includes("投票受付を開始")));
+++  assert.equal(putsOf(kv, "announced").length, 1, "成功した tick で告知済みになる");
+++  assert.ok(kv.data.get([...kv.data.keys()].find((k) => k.includes("announced"))).includes(SNAP_ID), "snapId 付きで記録");
+++});
+++
+++test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
+++  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
+++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+++    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
+++  });
+++  await tick(env);
+++  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
+++  assert.equal(F.hubCalls, 0, "ハブに到達しない");
+++});
+++
+++test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
+++  const { env } = setup(handlers({ owner: () => OWNER, registrar: () => OWNER }), {
+++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+++  }, { account: { address: OWNER } });
+++  await tick(env);
+++  assert.ok(F.discordBodies.some((b) => b.includes("同一アドレス")), "分離違反の通知");
+++  assert.equal(F.hubCalls, 0);
+++});
+++
+++test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
+++  const { env } = setup(handlers(), {
+++    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
+++    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
+++    MIN_REGISTRATION_DELAY: "abc",
+++  });
+++  await assert.rejects(() => tick(env), /MIN_REGISTRATION_DELAY/);
+++});
+++
+++test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
+++  const { pc, env } = setup(handlers());
+++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+++  await tick(env);
+++  const first = pc.calls.filter((f) => f === "spaceHash").length;
+++  assert.equal(first, 1);
+++  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+++  await tick(env); // __reset していないので spaceCheckedAt は保持される
+++  assert.equal(pc.calls.filter((f) => f === "spaceHash").length, 1, "2 tick 目は確認しない");
+++});
+++
+++test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
+++  const wallet = { account: { address: RELAYER } };
+++  // ケース A: 登録済み + 解決済み → maybeExecute が "no votes" を記録
+++  {
+++    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
+++    F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+++    await tick(env);
+++    const put = putsOf(kv, "executed:1");
+++    assert.equal(put.length, 1, "no votes が確定される");
+++    assert.ok(kv.data.get(put[0][1]).includes("no votes"));
+++  }
+++  // ケース B: 未登録(対応表なし) → execute もスキップ(登録遅れの提案を票ゼロで切り捨てない)
+++  {
+++    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
+++    F.hub = [{ proposals: [] }]; // 登録なしなので逆引きは発生しない
+++    await tick(env);
+++    assert.equal(putsOf(kv, "executed").length, 0, "未登録の提案は確定させない");
+++  }
+++});
++diff --git a/scripts/check-deploy.mjs b/scripts/check-deploy.mjs
++new file mode 100644
++index 0000000..bb886c5
++--- /dev/null
+++++ b/scripts/check-deploy.mjs
++@@ -0,0 +1,95 @@
+++// デプロイ後の機械照合(第11回監査 M-14 の runbook 用)。
+++// オンチェーンの実値・Nouns 委任・稼働中 Worker の /api/config を突き合わせ、
+++// 不一致や危険な構成(鍵の同一・猶予不足・プール枯渇)を検出したら非ゼロで終了する。
+++//
+++// 使い方:
+++//   NETWORK=sepolia node scripts/check-deploy.mjs
+++//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
+++import { ethers } from "ethers";
+++import fs from "node:fs";
+++import path from "node:path";
+++
+++const ROOT = path.resolve(import.meta.dirname, "..");
+++for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
+++  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
+++}
+++const NETWORK = process.env.NETWORK || "sepolia";
+++const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
+++const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
+++  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
+++  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
+++const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
+++const VOTER_ABI = [
+++  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
+++  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
+++  "function owner() view returns (address)", "function registrar() view returns (address)",
+++  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
+++  "function excluded(address) view returns (bool)",
+++];
+++const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
+++
+++let failed = 0;
+++const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
+++const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
+++
+++async function main() {
+++  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
+++  const p = new ethers.JsonRpcProvider(RPC);
+++  const voterAddr = dep.snapVoter || dep.voter;
+++  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
+++  console.log(`network=${NETWORK} voter=${voterAddr}\n`);
+++
+++  // 1. コントラクトの実値
+++  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
+++    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
+++  ]);
+++  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
+++  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
+++  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
+++  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
+++  else check("registrationDelayBlocks > 0 (猶予ロジックが実地で動く)", Number(delay) > 0, String(delay));
+++  console.log(`   marginBlocks=${margin} liveMode=${liveMode} refundEnabled=${refund}`);
+++  check("refundEnabled", refund === true);
+++
+++  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
+++  let workerCfg = null;
+++  try { workerCfg = await (await fetch(`${WORKER_URL}/api/config`)).json(); } catch (e) { warn("Worker /api/config 取得失敗", e.message); }
+++  const relayer = workerCfg?.relayer || null;
+++  const roles = { owner, registrar, relayer };
+++  console.log(`   owner=${owner}\n   registrar=${registrar}\n   relayer=${relayer || "(Worker から取得できず)"}`);
+++  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
+++  const distinct = new Set(addrs).size === addrs.length;
+++  if (NETWORK === "mainnet") {
+++    check("owner / registrar / relayer がすべて別アドレス", distinct);
+++    check("relayer が Worker から取得できた", !!relayer);
+++    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
+++    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
+++  } else if (!distinct) warn("鍵の分離", "テストネットで同一アドレスの役割があります(本番では不可)");
+++  else check("owner / registrar / relayer がすべて別アドレス(リハーサル)", true);
+++
+++  // 3. Worker と deployments の一致
+++  if (workerCfg) {
+++    check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
+++    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
+++    check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
+++  }
+++
+++  // 4. 委任と残高
+++  const nounsToken = workerCfg?.nounsDAO ? null : null; // token アドレスは env から
+++  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
+++  try {
+++    const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
+++    const votes = await t.getCurrentVotes(voterAddr);
+++    check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
+++  } catch (e) { warn("委任確認", `token ${tokenAddr} で確認できず: ${e.shortMessage || e.message}`); }
+++  const pool = await p.getBalance(voterAddr);
+++  check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
+++  if (relayer) {
+++    const rb = await p.getBalance(relayer);
+++    check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`);
+++  }
+++
+++  console.log(failed ? `\n❌ ${failed} 件の不一致` : "\n✅ すべて一致");
+++  process.exit(failed ? 1 : 0);
+++}
+++main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
++diff --git a/scripts/sepolia/_rehearse-keys.js b/scripts/sepolia/_rehearse-keys.js
++new file mode 100644
++index 0000000..90a5d2f
++--- /dev/null
+++++ b/scripts/sepolia/_rehearse-keys.js
++@@ -0,0 +1,55 @@
+++// 本番構成リハーサル(Sepolia): registrar / relayer を新規鍵に分離し、transferOwnership の往復を演習する
+++const { ethers } = require("hardhat");
+++const fs = require("fs");
+++const path = require("path");
+++const { loadDeployments } = require("./lib");
+++async function main() {
+++  const [deployer, delegator] = await ethers.getSigners();
+++  const dep = loadDeployments();
+++  const v = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter, deployer);
+++  console.log("開始残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
+++
+++  // 1. 新規鍵の生成(mainnet と同じ手順: 役割ごとに独立したシードを新規生成)
+++  const envPath = path.join(__dirname, "..", "..", ".env");
+++  let env = fs.readFileSync(envPath, "utf8");
+++  let regAddr, relayAddr;
+++  if (!env.includes("REGISTRAR_MNEMONIC=")) {
+++    const reg = ethers.Wallet.createRandom();
+++    const relay = ethers.Wallet.createRandom();
+++    env += `\n# Sepolia リハーサル用(2026-08-20 生成、実資産なし): registrar / relayer の分離鍵\nREGISTRAR_MNEMONIC="${reg.mnemonic.phrase}"\nSEPOLIA_RELAYER_KEY=${relay.privateKey}\n`;
+++    fs.writeFileSync(envPath, env);
+++    regAddr = ethers.HDNodeWallet.fromPhrase(reg.mnemonic.phrase, undefined, "m/44'/60'/0'/0/0").address;
+++    relayAddr = relay.address;
+++    console.log("新規生成: registrar", regAddr, "/ relayer", relayAddr);
+++  } else {
+++    regAddr = ethers.HDNodeWallet.fromPhrase(process.env.REGISTRAR_MNEMONIC, undefined, "m/44'/60'/0'/0/0").address;
+++    relayAddr = new ethers.Wallet(process.env.SEPOLIA_RELAYER_KEY).address;
+++    console.log("既存の鍵を使用: registrar", regAddr, "/ relayer", relayAddr);
+++  }
+++
+++  // 2. 資金供給(ガス用の小額。relayer の投函ガスはプールから返金される)
+++  for (const [to, eth] of [[regAddr, "0.002"], [relayAddr, "0.004"]]) {
+++    if ((await ethers.provider.getBalance(to)) === 0n) { await (await deployer.sendTransaction({ to, value: ethers.parseEther(eth) })).wait(); console.log(`funded ${to} ${eth} ETH`); }
+++  }
+++
+++  // 3. registrar を分離鍵に切替
+++  if ((await v.registrar()).toLowerCase() !== regAddr.toLowerCase()) {
+++    await (await v.setRegistrar(regAddr)).wait();
+++  }
+++  console.log("registrar =", await v.registrar());
+++
+++  // 4. transferOwnership の往復演習(mainnet ではマルチシグへ移す操作の予行)
+++  await (await v.transferOwnership(delegator.address)).wait();
+++  console.log("owner →", await v.owner(), "(マルチシグ役に移管)");
+++  const vAsNewOwner = v.connect(delegator);
+++  await (await vAsNewOwner.setMarginBlocks(await v.marginBlocks())).wait(); // onlyOwner 操作が新オーナーで通ることを確認
+++  console.log("新オーナーで onlyOwner 操作 OK");
+++  let rejected = false;
+++  try { await v.setLiveMode.staticCall(true); } catch { rejected = true; } // 旧オーナー(deployer)は拒否されること
+++  console.log("旧オーナーの操作は拒否:", rejected ? "OK" : "NG!");
+++  await (await vAsNewOwner.transferOwnership(deployer.address)).wait();
+++  console.log("owner →", await v.owner(), "(復帰)");
+++
+++  console.log("終了残高: deployer", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
+++}
+++main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
++
++codex
++差分の主要意図は確認できました。ここからは、現行コード全体との組合せ（特に `tick` の例外処理、mainnet 検証のキャッシュ、KV API 契約、runbook の各段階）を追い、差分だけでは見えない抜けを確認します。併せてテストを実行します。
++exec
++/bin/bash -lc "node -e \"console.log(require('./package.json').scripts)\"
++node -e \"console.log(require('./relayer-cf/package.json').scripts)\"
++npm test" in /mnt/data/pnouns-voter/relayer-cf
++ succeeded in 860ms:
++✔ test/accept-deadline.test.mjs (729.942081ms)
++✔ test/cursor.test.mjs (726.132647ms)
++✔ test/link-check.test.mjs (725.243263ms)
++✔ test/worker-tick.test.mjs (764.577014ms)
++ℹ tests 4
++ℹ suites 0
++ℹ pass 4
++ℹ fail 0
++ℹ cancelled 0
++ℹ skipped 0
++ℹ todo 0
++ℹ duration_ms 779.897117
++
++exec
++/bin/bash -lc "node -e \"console.log(require('./package.json').scripts)\"
++npx hardhat test" in /mnt/data/pnouns-voter
++ exited 1 in 944ms:
++◇ injected env (6) from .env // tip: ⌘ enable debugging { debug: true }
++An unexpected error occurred:
++
++[Error: EROFS: read-only file system, open '/mnt/data/pnouns-voter/cache/solidity-files-cache.json'] {
++  errno: -30,
++  code: 'EROFS',
++  syscall: 'open',
++  path: '/mnt/data/pnouns-voter/cache/solidity-files-cache.json'
++}
++
++exec
++/bin/bash -lc "nl -ba scripts/create-and-register.mjs | sed -n '1,180p'
++nl -ba relayer-cf/src/chain.js | sed -n '1,150p'
++nl -ba relayer-cf/src/snap.js | sed -n '1,130p'
++nl -ba relayer-cf/src/worker.js | sed -n '1,520p'" in /mnt/data/pnouns-voter
++ succeeded in 0ms:
++     1	// Nouns の提案から Snapshot 提案を作り、オンチェーンの対応付け(registerProposal)まで行う。
++     2	// 要約・人の承認は行わず、Nouns の提案本文をそのまま転記する(超過分のみ切り詰め)。
++     3	//
++     4	// 使い方:
++     5	//   node scripts/create-and-register.mjs --nouns 989 --dry-run           # 内容を確認するだけ
++     6	//   node scripts/create-and-register.mjs --nouns 989                      # 作成 + 登録
++     7	//   DESC_FROM=990 node scripts/create-and-register.mjs --nouns 527        # 本文だけ他の提案から借りる(テスト用)
++     8	// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
++     9	import snapshot from "@snapshot-labs/snapshot.js";
++    10	import { ethers } from "ethers";
++    11	import fs from "node:fs";
++    12	import path from "node:path";
++    13	import { buildProposal } from "./lib/proposal-format.mjs";
++    14	
++    15	const ROOT = path.resolve(import.meta.dirname, "..");
++    16	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
++    17	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
++    18	}
++    19	const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
++    20	const flag = (k) => process.argv.includes(`--${k}`);
++    21	
++    22	const NETWORK = process.env.NETWORK || "sepolia";
++    23	const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
++    24	const HUB = process.env.SNAPSHOT_HUB || "https://hub.snapshot.org";
++    25	const SEQ = process.env.SEQ_URL || "https://seq.snapshot.org";
++    26	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
++    27	const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });
++    28	
++    29	async function nounsDescription(id) {
++    30	  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${id}") { description } }` }) })).json();
++    31	  const d = r?.data?.proposal?.description;
++    32	  if (!d) throw new Error(`Nouns 提案 ${id} の本文を取得できませんでした`);
++    33	  return d;
++    34	}
++    35	async function hubVotingPeriod() {
++    36	  const r = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ space(id:"${SPACE}") { voting { period } } }` }) })).json();
++    37	  return r?.data?.space?.voting?.period || 172800;
++    38	}
++    39	
++    40	async function main() {
++    41	  const nounsId = Number(arg("nouns"));
++    42	  if (!nounsId) throw new Error("--nouns <提案番号> を指定してください");
++    43	  const descId = process.env.DESC_FROM || nounsId; // テスト時は本文を別提案から借りられる
++    44	  const description = await nounsDescription(descId);
++    45	  const p = buildProposal({ nounsId: descId, description });
++    46	  const period = await hubVotingPeriod();
++    47	  console.log(`space=${SPACE} network=${NETWORK}`);
++    48	  console.log(`title: ${p.title}`);
++    49	  console.log(`discussion: ${p.discussion}`);
++    50	  console.log(`body: ${p.body.length.toLocaleString()} 文字 (元 ${p.originalLength.toLocaleString()}) ${p.truncated ? "【切り詰めあり】" : "(全文)"}`);
++    51	  console.log(`choices: ${p.choices.join(" / ")} ・ 投票期間: ${period / 3600} 時間`);
++    52	  if (flag("dry-run")) { console.log("\n--- dry-run: 作成しません ---\n" + p.body.slice(0, 400) + "\n…"); return; }
++    53	
++    54	  // ---- 鍵・設定の検証(第12回監査: Snapshot 提案を外部送信する「前」にすべて確認する。
++    55	  //      送信後に落ちると、オンチェーン登録されない孤児提案が Snapshot に残ってしまう) ----
++    56	  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
++    57	  const voter = dep.snapVoter || dep.voter;
++    58	  if (!voter) throw new Error(`deployments/${NETWORK}.json に snapVoter がありません`);
++    59	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
++    60	  if (!rpc) throw new Error(`${NETWORK} の RPC URL が未設定です`);
++    61	  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
++    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
++    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
++    64	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
++    65	  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
++    66	  const bot = ethers.HDNodeWallet.fromPhrase(botPhrase, undefined, "m/44'/60'/0'/0/0");
++    67	  const registrarWallet = ethers.HDNodeWallet.fromPhrase(registrarPhrase, undefined, "m/44'/60'/0'/0/0");
++    68	  // mnemonic 文字列ではなく、実際に使う鍵から導出したアドレスで比較する
++    69	  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
++    70	
++    71	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
++    72	  const now = Math.floor(Date.now() / 1000);
++    73	  const client = new snapshot.Client712(SEQ);
++    74	  const receipt = await client.proposal(adapt(bot), bot.address, {
++    75	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
++    76	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
++    77	    plugins: "{}", app: "pnouns-voter",
++    78	  });
++    79	  console.log(`\nSnapshot 提案を作成: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`);
++    80	
++    81	  // オンチェーンの対応付け(registrar) — 鍵と設定は送信前に検証済み
++    82	  const w = registrarWallet.connect(new ethers.JsonRpcProvider(rpc));
++    83	  const abi = ["function registerProposal(string,uint256)", "function registrationDelayBlocks() view returns (uint256)"];
++    84	  const c = new ethers.Contract(voter, abi, w);
++    85	  const tx = await c.registerProposal(receipt.id, nounsId);
++    86	  await tx.wait();
++    87	  const delay = Number(await c.registrationDelayBlocks());
++    88	  console.log(`対応付けを登録: Snapshot ${receipt.id.slice(0, 14)}… → Nouns #${nounsId} (tx ${tx.hash})`);
++    89	  if (delay) console.log(`※ 登録から ${delay} ブロック(約 ${Math.round(delay * 12 / 60)} 分)は票を受け付けません(誤登録の確認猶予)`);
++    90	}
++    91	main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
++     1	// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
++     2	import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
++     3	import { privateKeyToAccount } from "viem/accounts";
++     4	import { mainnet, sepolia } from "viem/chains";
++     5	import { METAGOV_ABI } from "./abi.js";
++     6	
++     7	export const DAO_ABI = parseAbi([
++     8	  "function proposalCount() view returns (uint256)",
++     9	  "function state(uint256) view returns (uint8)",
++    10	  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
++    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
++    12	  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
++    13	  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
++    14	  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
++    15	  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
++    16	]);
++    17	export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
++    18	export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
++    19	export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
++    20	export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
++    21	
++    22	export function cfg(env) {
++    23	  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
++    24	  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
++    25	  if (env.NETWORK === "mainnet") {
++    26	    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
++    27	    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
++    28	    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
++    29	    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
++    30	    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
++    31	  }
++    32	  return {
++    33	    network: env.NETWORK || "sepolia",
++    34	    chain,
++    35	    chainId: chain.id,
++    36	    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
++    37	    metagov: getAddress(env.VOTER),
++    38	    pnouns: getAddress(env.PNOUNS),
++    39	    nounsDAO: getAddress(env.NOUNS_DAO),
++    40	    nounsToken: getAddress(env.NOUNS_TOKEN),
++    41	    explorer: env.EXPLORER,
++    42	    blockscout: env.BLOCKSCOUT || null,
++    43	    publicUrl: env.PUBLIC_URL || "",
++    44	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
++    45	    scanProposals: Number(env.SCAN_PROPOSALS || 30),
++    46	    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
++    47	    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
++    48	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
++    49	    announce: env.ANNOUNCE !== "0",
++    50	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
++    51	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
++    52	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
++    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
++    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
++    55	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
++    56	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
++    57	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
++    58	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
++    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
++    60	  };
++    61	}
++    62	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
++    63	export function acceptMarginBlocks(c) {
++    64	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
++    65	}
++    66	export function acceptDeadline(c, onchainDeadline) {
++    67	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
++    68	}
++    69	// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
++    70	export function shouldRushSubmit(c, block, onchainDeadline) {
++    71	  return Number(block) >= acceptDeadline(c, onchainDeadline);
++    72	}
++    73	// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
++    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
++    75	export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
++    76	  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
++    77	  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
++    78	  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
++    79	}
++    80	// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
++    81	//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
++    82	export function submitCapacity(c, block, onchainDeadline) {
++    83	  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
++    84	  const ticks = Math.floor(secsLeft / c.cronSec);
++    85	  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
++    86	}
++    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
++    88	export function clients(c) {
++    89	  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
++    90	  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
++    91	  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
++    92	  return { publicClient, walletClient, account };
++    93	}
++    94	export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
++    95	
++    96	// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
++    97	let ownersCache = { at: 0, owners: [] };
++    98	export async function allOwners(c, pc) {
++    99	  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
++   100	  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
++   101	  const owners = [];
++   102	  const CH = 500;
++   103	  for (let start = 1; start <= total; start += CH) {
++   104	    const ids = [];
++   105	    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
++   106	    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
++   107	    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
++   108	  }
++   109	  ownersCache = { at: Date.now(), owners };
++   110	  return owners;
++   111	}
++   112	export async function tokensOf(c, pc, address) {
++   113	  const owners = await allOwners(c, pc);
++   114	  const a = address.toLowerCase();
++   115	  const out = [];
++   116	  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
++   117	  return out;
++   118	}
++   119	export async function recentProposals(c, pc) {
++   120	  const [count, block] = await Promise.all([
++   121	    pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
++   122	    pc.getBlockNumber(),
++   123	  ]);
++   124	  const ids = [];
++   125	  for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
++   126	  const res = await pc.multicall({
++   127	    contracts: ids.flatMap((id) => [
++   128	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
++   129	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
++   130	    ]),
++   131	    allowFailure: false,
++   132	  });
++   133	  const out = [];
++   134	  ids.forEach((id, i) => {
++   135	    const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
++   136	    // proposals() は名前付きタプルではなく配列で返る
++   137	    const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
++   138	    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
++   139	    out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
++   140	  });
++   141	  return { block: Number(block), proposals: out };
++   142	}
++   143	// H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
++   144	//  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
++   145	//  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
++   146	const titleMem = new Map();
++   147	export async function proposalTitle(c, pc, store, id, creationBlock, state) {
++   148	  const frozen = state === 0 || state === 1;
++   149	  const kv = store ? store.kvRaw : null;
++   150	  if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
++     1	// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
++     2	// 監査対応:
++     3	//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
++     4	//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
++     5	//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
++     6	//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
++     7	//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
++     8	import { METAGOV_ABI } from "./chain.js";
++     9	import { keccak256, stringToBytes } from "viem";
++    10	
++    11	const FETCH_TIMEOUT_MS = 8000;
++    12	const MAX_BODY = 64 * 1024;
++    13	const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り
++    14	
++    15	async function fetchLimited(url, init) {
++    16	  const ctrl = new AbortController();
++    17	  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
++    18	  try {
++    19	    const r = await fetch(url, { ...init, signal: ctrl.signal });
++    20	    if (!r.ok) throw new Error(`HTTP ${r.status}`);
++    21	    const reader = r.body?.getReader();
++    22	    if (!reader) throw new Error("no body");
++    23	    const chunks = []; let total = 0;
++    24	    for (;;) {
++    25	      const { done, value } = await reader.read();
++    26	      if (done) break;
++    27	      total += value.byteLength;
++    28	      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
++    29	      chunks.push(value);
++    30	    }
++    31	    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
++    32	    return JSON.parse(new TextDecoder().decode(buf));
++    33	  } finally { clearTimeout(t); }
++    34	}
++    35	async function hubGql(c, query) {
++    36	  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
++    37	  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
++    38	  if (!j.data) throw new Error("hub graphql: no data");
++    39	  return j.data;
++    40	}
++    41	
++    42	/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
++    43	/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
++    44	///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
++    45	// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
++    46	// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
++    47	// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
++    48	export function referencesNounsProposal(text, nounsId) {
++    49	  const id = Number(nounsId);
++    50	  if (!Number.isSafeInteger(id) || id <= 0) return false;
++    51	  const s = String(text || "");
++    52	  if (!s) return false;
++    53	  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
++    54	    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
++    55	    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
++    56	    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
++    57	    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
++    58	    let u;
++    59	    try { u = new URL(trimmed); } catch { continue; }
++    60	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
++    61	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
++    62	  }
++    63	  return false;
++    64	}
++    65	
++    66	export async function resolveMappings(c, pc, activeNounsIds = []) {
++    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
++    68	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
++    69	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
++    70	  const found = new Map(); // nounsId -> snapId
++    71	  if (data.proposals.length) {
++    72	    const res = await pc.multicall({
++    73	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
++    74	      allowFailure: false,
++    75	    });
++    76	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
++    77	  }
++    78	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
++    79	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
++    80	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
++    81	  if (missing.length) {
++    82	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
++    83	    const need = [];
++    84	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
++    85	    if (need.length) {
++    86	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
++    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
++    88	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
++    89	      for (const n of need) {
++    90	        const p = byHash.get(n.hash);
++    91	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
++    92	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
++    93	      }
++    94	    }
++    95	  }
++    96	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
++    97	    const m = meta.get(snapId) || {};
++    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
++    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
++   100	    // 自由に書ける自己申告なので、偽提案と対応表を同じ主体が作れる場合(registrar/作成プログラムの
++   101	    // 侵害)は検出できない。過信しないこと。
++   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
++   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
++   104	  });
++   105	  return { mappings, unresolved };
++   106	}
++   107	
++   108	/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
++   109	/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
++   110	/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
++   111	/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
++   112	export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
++   113	  const send = []; const skipped = [];
++   114	  let advance = cursor; let blocked = false;
++   115	  for (let i = 0; i < rows.length; i++) {
++   116	    const r = rows[i]; const rec = recs[i];
++   117	    const created = Number(r.created);
++   118	    const tokens = tokenCounts[i] ?? 0;
++   119	    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
++   120	    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
++   121	    const exists = !!rec[0];
++   122	    const recTs = Number(rec[3] ?? 0);
++   123	    const isNew = !exists || created > recTs;
++   124	    const needSupplement = exists && created === recTs && uncounted > 0;
++   125	    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
++   126	    if (isSkippable) {
++   127	      if (tokens === 0 || deadLetters.has(r.ipfs)) skipped.push(r);
++   128	      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
++   129	      continue;
++   130	    }
++     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
++     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
++     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
++     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
++     5	import { keccak256, stringToBytes } from "viem";
++     6	import { makeStore } from "./store.js";
++     7	
++     8	async function notify(c, text) {
++     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
++    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
++    11	  try {
++    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
++    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
++    14	    return true;
++    15	  }
++    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
++    17	}
++    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
++    19	
++    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
++    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
++    22	async function queueNotify(c, store, text) {
++    23	  if (await notify(c, text)) return true;
++    24	  const k = `${store.prefix}pendingnotes`;
++    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
++    26	  arr.push({ text, at: Date.now() });
++    27	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
++    28	  return false;
++    29	}
++    30	async function flushPendingNotes(c, store) {
++    31	  const k = `${store.prefix}pendingnotes`;
++    32	  let arr;
++    33	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
++    34	  if (!Array.isArray(arr) || !arr.length) return;
++    35	  const rest = [];
++    36	  for (const n of arr) {
++    37	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
++    38	    if (!(await notify(c, n.text))) rest.push(n);
++    39	  }
++    40	  if (rest.length !== arr.length) {
++    41	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
++    42	    else await store.kvRaw.delete(k);
++    43	  }
++    44	}
++    45	const WORDS = ["反対", "賛成", "棄権"];
++    46	
++    47	function isContractRevert(e) {
++    48	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
++    49	  let x = e;
++    50	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
++    51	  return false;
++    52	}
++    53	
++    54	async function announceNew(c, pc, store, p, block, snapInfo) {
++    55	  const prev = await store.getAnnounced(p.id);
++    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
++    57	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
++    58	  const mg = await metagovInfo(c, pc, p.id);
++    59	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
++    60	  if (c.snapshotSpace) {
++    61	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
++    62	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
++    63	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
++    64	    const lines = [
++    65	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
++    66	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
++    67	      `締切: ${jst} ごろ (block ${mg.deadline})`,
++    68	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
++    69	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
++    70	    ];
++    71	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
++    72	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
++    73	    return;
++    74	  }
++    75	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
++    76	  const deadlineBlock = mg.deadline || p.endBlock;
++    77	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
++    78	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
++    79	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
++    80	  if (await notify(c, [
++    81	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
++    82	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
++    83	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
++    84	    `投票ページ: ${c.publicUrl}`,
++    85	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
++    86	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
++    87	}
++    88	
++    89	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
++    90	const FORCE_LIST_MS = 20 * 60 * 1000;
++    91	async function loadVotes(store, proposalId, force) {
++    92	  const sum = await store.getSummary(proposalId);
++    93	  const dirty = await store.dirtyAt(proposalId);
++    94	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
++    95	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
++    96	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
++    97	  const listed = await store.listVoteSummaries(proposalId);
++    98	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
++    99	  await store.putSummary(proposalId, summaries, listedAt);
++   100	  return { summaries, listedAt };
++   101	}
++   102	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
++   103	function setStatus(summaries, voter, patch) {
++   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
++   105	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
++   106	}
++   107	async function flushSummary(store, proposalId, summaries) {
++   108	  const sum = await store.getSummary(proposalId);
++   109	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
++   110	}
++   111	
++   112	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
++   113	async function reconcileSent(c, pc, store, proposalId, summaries) {
++   114	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
++   115	  if (!sent.length) return false;
++   116	  const byTx = new Map();
++   117	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
++   118	  let changed = false;
++   119	  for (const [tx, vs] of byTx) {
++   120	    let rc = null;
++   121	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
++   122	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
++   123	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
++   124	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
++   125	    for (let i = 0; i < vs.length; i++) {
++   126	      const v = vs[i];
++   127	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
++   128	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
++   129	    }
++   130	    changed = true;
++   131	    if (rc && rc.status === "success") {
++   132	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
++   133	      const mg = await metagovInfo(c, pc, proposalId);
++   134	      const sent = await queueNotify(c, store, [
++   135	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
++   136	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++   137	        `tx: ${explorerTx(c, tx)}`,
++   138	      ].join("\n"));
++   139	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
++   140	    } else {
++   141	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
++   142	    }
++   143	  }
++   144	  if (changed) await flushSummary(store, proposalId, summaries);
++   145	  return changed;
++   146	}
++   147	
++   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
++   149	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
++   150	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
++   151	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
++   152	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
++   153	  const sentK = `${store.prefix}snapsent:${nounsId}`;
++   154	  const pending = await store.kvRaw.get(sentK, "json");
++   155	  if (pending) {
++   156	    let allMined = true, anySuccess = false, gasTotal = 0n;
++   157	    for (const tx of pending.txs) {
++   158	      let rc = null;
++   159	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
++   160	      if (!rc) { allMined = false; continue; }
++   161	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
++   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
++   163	    }
++   164	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
++   165	    await store.kvRaw.delete(sentK);
++   166	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
++   167	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
++   168	      const mg = await metagovInfo(c, pc, nounsId);
++   169	      const sent = await queueNotify(c, store, [
++   170	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
++   171	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++   172	        `tx: ${explorerTx(c, pending.txs[0])}`,
++   173	      ].join("\n"));
++   174	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
++   175	    }
++   176	    return;
++   177	  }
++   178	
++   179	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
++   180	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
++   181	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
++   182	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
++   183	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
++   184	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
++   185	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
++   186	  const deadLetters = new Set(deadArr);
++   187	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
++   188	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
++   189	  const owners = await allOwners(c, pc);
++   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
++   191	  const tokenCounts = tokensByRow.map((ids) => ids.length);
++   192	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
++   193	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
++   194	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
++   195	  const votedByToken = new Map();
++   196	  for (let start = 0; start < checkTokenIds.length; start += 200) {
++   197	    const ids = checkTokenIds.slice(start, start + 200);
++   198	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
++   199	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
++   200	  }
++   201	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
++   202	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
++   203	  const batches = rush ? c.rushBatches : 1;
++   204	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
++   205	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
++   206	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
++   207	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
++   208	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
++   209	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
++   210	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
++   211	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
++   212	
++   213	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
++   214	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
++   215	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
++   216	  for (const { row, index } of send) {
++   217	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
++   218	    if (!env) {
++   219	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
++   220	      if (fails[row.ipfs] >= 20) {
++   221	        deadArr.push(row.ipfs); deadChanged = true;
++   222	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
++   223	      }
++   224	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
++   225	    }
++   226	    const m = env.data.message;
++   227	    const tokenIds = [];
++   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
++   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
++   230	    args.push(arg); cidOf.set(arg, row.ipfs);
++   231	  }
++   232	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
++   233	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
++   234	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
++   235	  if (!args.length) return;
++   236	
++   237	  const txs = []; let count = 0;
++   238	  for (let b = 0; b < batches; b++) {
++   239	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
++   240	    if (!chunk.length) break;
++   241	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
++   242	    catch (e) {
++   243	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
++   244	      const good = [];
++   245	      for (const a2 of chunk.slice(0, 10)) {
++   246	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
++   247	        catch (e2) {
++   248	          const cid = cidOf.get(a2);
++   249	          if (isContractRevert(e2) && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
++   250	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
++   251	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
++   252	          }
++   253	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
++   254	        }
++   255	      }
++   256	      if (!good.length) continue;
++   257	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
++   258	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
++   259	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
++   260	      catch (e3) {
++   261	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
++   262	        good.length = 1;
++   263	      }
++   264	      chunk.length = 0; chunk.push(...good);
++   265	    }
++   266	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
++   267	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
++   268	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
++   269	    txs.push(hash); count += chunk.length;
++   270	  }
++   271	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
++   272	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
++   273	}
++   274	
++   275	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
++   276	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
++   277	  const { summaries } = await loadVotes(store, proposalId, rush);
++   278	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
++   279	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
++   280	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
++   281	  let touched = false;
++   282	  for (let b = 0; b < batches; b++) {
++   283	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
++   284	    if (!pendingSummaries.length) break;
++   285	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
++   286	    const pending = [];
++   287	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
++   288	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
++   289	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
++   290	    const cands = [];
++   291	    for (let i = 0; i < pending.length; i++) {
++   292	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
++   293	      cands.push(pending[i]);
++   294	    }
++   295	    if (!cands.length) continue;
++   296	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
++   297	    let good = cands;
++   298	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
++   299	    catch (e) {
++   300	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
++   301	      good = [];
++   302	      for (const v of cands.slice(0, 10)) {
++   303	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
++   304	        catch (e2) {
++   305	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
++   306	        }
++   307	      }
++   308	      if (!good.length) continue;
++   309	    }
++   310	    const args = good.map(toArg);
++   311	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
++   312	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
++   313	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
++   314	    const sentAt = new Date().toISOString();
++   315	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
++   316	    touched = true;
++   317	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
++   318	      await new Promise((r) => setTimeout(r, 1500));
++   319	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
++   320	    }
++   321	  }
++   322	  if (touched) await flushSummary(store, proposalId, summaries);
++   323	  // receipt は待たない(次回 tick の reconcile で確定・通知)
++   324	}
++   325	
++   326	async function maybeExecute(c, pc, wc, store, p, block, mg) {
++   327	  const ex = await store.getExecuted(p.id);
++   328	  if (ex && ex.pending && ex.tx) {
++   329	    // 送信済み・未確定の execute を確定
++   330	    let rc = null;
++   331	    try { rc = await pc.getTransactionReceipt({ hash: ex.tx }); } catch { rc = null; }
++   332	    if (!rc && Date.now() - Date.parse(ex.at) < 10 * 60 * 1000) return;
++   333	    const info = await metagovInfo(c, pc, p.id);
++   334	    if (rc && rc.status === "success") {
++   335	      if (info.executed) {
++   336	        await store.putExecuted(p.id, { tx: ex.tx, status: "success", result: info.result, gasUsed: String(rc.gasUsed), nounsReceipt: info.nounsReceipt, at: new Date().toISOString() });
++   337	        const r = info.nounsReceipt || { votes: 0, hasVoted: false };
++   338	        await notify(c, [
++   339	          `✅ Prop ${p.id} を Nouns DAO に **${WORDS[info.result]}** で投票しました (${r.votes} 票)。`,
++   340	          `最終集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`,
++   341	          `Nouns DAO の記録: hasVoted=${r.hasVoted} support=${WORDS[info.result]} votes=${r.votes}`,
++   342	          `tx: ${explorerTx(c, ex.tx)}`,
++   343	          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
++   344	        ].filter(Boolean).join("\n"));
++   345	      } else {
++   346	        // シャドー(liveMode=false)の execute: 確定扱いにしない(liveMode=true になれば再実行)
++   347	        await store.putExecuted(p.id, { shadow: true, tx: ex.tx, result: info.result, at: new Date().toISOString() });
++   348	        await notify(c, [`🕶️ [シャドー運用] Prop ${p.id} の pNouns 集計結果は **${WORDS[info.result]}** でした(Nouns DAO には投票していません)。`, `集計: 賛成 ${info.tokens[1]} / 反対 ${info.tokens[0]} / 棄権 ${info.tokens[2]} (投票者 ${info.voters[1]}/${info.voters[0]}/${info.voters[2]} 名)`, `tx: ${explorerTx(c, ex.tx)}`].join("\n"));
++   349	      }
++   350	    } else if (info.executed) await store.putExecuted(p.id, { external: true, revertedTx: ex.tx });
++   351	    else await store.putExecuted(p.id, null); // 未実行 → 再試行
++   352	    return;
++   353	  }
++   354	  if (ex && ex.shadow && !mg.liveMode) return; // シャドー結果記録済み、まだ本番でない
++   355	  if (ex && !ex.shadow) return;
++   356	  if (mg.executed) { await store.putExecuted(p.id, { external: true }); return; }
++   357	  if (mg.deadline === 0 || block < mg.deadline) return;
++   358	  if (p.state !== 1 && p.state !== 0) { await store.putExecuted(p.id, { skipped: `nouns state ${p.stateName}` }); return; }
++   359	  if (mg.tokens[0] + mg.tokens[1] + mg.tokens[2] === 0) {
++   360	    await store.putExecuted(p.id, { skipped: "no votes", at: new Date().toISOString() });
++   361	    await notify(c, [`ℹ️ Prop ${p.id}: pNouns の投票がなかったため、Nouns DAO には投票しません。`, `提案の内容: https://nouns.wtf/vote/${p.id}`].join("\n"));
++   362	    return;
++   363	  }
++   364	  const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], account: wc.account });
++   365	  const gasLimit = BigInt(Math.ceil(Number(gas) * c.executeGasMult));
++   366	  const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "execute", args: [BigInt(p.id)], gas: gasLimit });
++   367	  console.log(`[worker] execute prop ${p.id} tx ${hash} (est ${gas}, limit ${gasLimit})`);
++   368	  await store.putExecuted(p.id, { tx: hash, pending: true, at: new Date().toISOString() });
++   369	}
++   370	
++   371	// 残高警告(リレイヤー・返金プール)。1 日 1 回、閾値未満のときだけ KV に書く
++   372	async function checkBalance(c, pc, wc, store) {
++   373	  const threshold = Number(c.lowBalanceEth);
++   374	  const checks = [];
++   375	  if (wc) checks.push({ key: "lowbal", label: "リレイヤー残高", address: wc.account.address, hint: "投函・execute が止まらないよう補充してください。締切後の execute は誰でも(dApp の手動ボタンからも)実行できます。" });
++   376	  checks.push({ key: "lowpool", label: "返金プール(pNouns Voter コントラクト)残高", address: c.metagov, hint: "投函者へのガス払い戻しが止まります(投票自体は成立します)。トレジャリーから補充してください。" });
++   377	  for (const ck of checks) {
++   378	    const eth = Number(await pc.getBalance({ address: ck.address })) / 1e18;
++   379	    if (eth >= threshold) continue; // 回復時の削除は書込み節約のため行わず TTL 失効に任せる
++   380	    if (await store.getFlag(ck.key)) continue;
++   381	    const sent = await notify(c, [`⚠️ ${ck.label}が少なくなっています: ${eth.toFixed(5)} ETH (閾値 ${threshold} ETH)`, `アドレス: ${ck.address} (${c.network})`, ck.hint].join("\n"));
++   382	    if (sent) await store.setFlag(ck.key, 86400);
++   383	  }
++   384	}
++   385	
++   386	// 送信中 tx の確定処理: 直近提案のサマリー(get)と executed(get)から「送信中」を検出し、Nouns 側 state に関係なく確定させる
++   387	async function reconcileRecent(c, pc, wc, store, proposals) {
++   388	  for (const p of proposals.slice(0, 15)) {
++   389	    try {
++   390	      const pid = String(p.id);
++   391	      const sum = await store.getSummary(pid);
++   392	      if (sum.votes.some((v) => v.txStatus === "sent")) {
++   393	        const summaries = [...sum.votes];
++   394	        await reconcileSent(c, pc, store, pid, summaries);
++   395	      }
++   396	      const ex = await store.getExecuted(pid);
++   397	      if (ex && ex.pending && ex.tx) {
++   398	        const mg = await metagovInfo(c, pc, pid);
++   399	        await maybeExecute(c, pc, wc, store, p, Number.MAX_SAFE_INTEGER, mg); // pending 分岐だけが走る
++   400	      }
++   401	    } catch (e) { console.error(`[worker] reconcile prop ${p.id} error:`, e.shortMessage || e.message); }
++   402	  }
++   403	}
++   404	
++   405	// KV/RPC 障害の Discord 警告(メモリ内で 1 時間に 1 回に抑える。KV には書かない)
++   406	let lastErrNotify = 0;
++   407	export async function notifyError(c, where, e) {
++   408	  const msg = (e && (e.shortMessage || e.message)) || String(e);
++   409	  console.error(`[${where}]`, msg);
++   410	  if (Date.now() - lastErrNotify < 3600 * 1000) return;
++   411	  lastErrNotify = Date.now();
++   412	  await notify(c, [`⚠️ リレイヤーでエラーが発生しました(${where}): ${msg.slice(0, 200)}`, `KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。`, `上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。`].join("\n"));
++   413	}
++   414	
++   415	let lastBalanceCheck = 0;
++   416	let spaceCheckedAt = 0;
++   417	
++   418	// ---- テスト用フック(本番経路では未使用) ----
++   419	// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
++   420	// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
++   421	let _clients = clients;
++   422	export function __setClientsForTests(f) { _clients = f || clients; }
++   423	export function __resetWorkerStateForTests(o = {}) {
++   424	  lastErrNotify = o.errNotifiedAt ?? 0;
++   425	  lastBalanceCheck = o.balanceCheckedAt ?? 0;
++   426	  spaceCheckedAt = o.spaceCheckedAt ?? 0;
++   427	}
++   428	const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
++   429	export async function tick(env) {
++   430	  const c = cfg(env);
++   431	  const { publicClient: pc, walletClient: wc } = _clients(c);
++   432	  const store = makeStore(env.STATE, storeNs(c));
++   433	  try {
++   434	    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
++   435	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
++   436	    const { block, proposals } = await recentProposals(c, pc);
++   437	    await reconcileRecent(c, pc, wc, store, proposals);
++   438	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
++   439	    let snapByNouns = new Map();
++   440	    let unresolvedIds = new Set();
++   441	    let mappingsResolved = false;
++   442	    if (c.snapshotSpace) {
++   443	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
++   444	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
++   445	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
++   446	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
++   447	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
++   448	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
++   449	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
++   450	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
++   451	        ], allowFailure: false });
++   452	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
++   453	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
++   454	        if (c.network === "mainnet") {
++   455	          const relayerAddr = wc?.account?.address || null;
++   456	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
++   457	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
++   458	        }
++   459	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
++   460	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
++   461	        const floor = Math.max(300, c.minRegistrationDelay);
++   462	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
++   463	        spaceCheckedAt = Date.now();
++   464	      }
++   465	      try {
++   466	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
++   467	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
++   468	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
++   469	        unresolvedIds = new Set((unresolved || []).map(Number));
++   470	        mappingsResolved = true;
++   471	      }
++   472	      catch (e) { await notifyError(c, "snapshot hub", e); }
++   473	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
++   474	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
++   475	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
++   476	      // 最終結果として確定してしまう。
++   477	      if (!mappingsResolved) return;
++   478	    }
++   479	    for (const p of proposals) {
++   480	      if (p.state !== 0 && p.state !== 1) continue;
++   481	      try {
++   482	        const snapInfo = snapByNouns.get(p.id) || null;
++   483	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
++   484	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
++   485	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
++   486	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
++   487	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
++   488	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
++   489	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
++   490	          }
++   491	          continue;
++   492	        }
++   493	        const mg = await metagovInfo(c, pc, p.id);
++   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
++   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
++   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
++   497	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
++   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
++   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
++   500	        }
++   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
++   502	        let timelineBad = false;
++   503	        if (c.snapshotSpace && snapInfo) {
++   504	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
++   505	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
++   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
++   507	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
++   508	          }
++   509	        }
++   510	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
++   511	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
++   512	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
++   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
++   514	          await announceNew(c, pc, store, p, block, snapInfo);
++   515	        }
++   516	        if (linkBad && c.network === "mainnet") continue;
++   517	        if (timelineBad && c.network === "mainnet") continue;
++   518	        if (!wc) continue;
++   519	        if (block < mg.deadline) {
++   520	          if (c.snapshotSpace) {
++
++exec
++/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '1,230p'
++nl -ba relayer-cf/src/worker.js | sed -n '479,590p'
++nl -ba relayer-cf/src/index.js | sed -n '1,220p'
++nl -ba relayer-cf/src/store.js | sed -n '1,280p'" in /mnt/data/pnouns-voter
++ succeeded in 0ms:
++     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
++     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
++     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
++     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
++     5	import { keccak256, stringToBytes } from "viem";
++     6	import { makeStore } from "./store.js";
++     7	
++     8	async function notify(c, text) {
++     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
++    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
++    11	  try {
++    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
++    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
++    14	    return true;
++    15	  }
++    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
++    17	}
++    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
++    19	
++    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
++    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
++    22	async function queueNotify(c, store, text) {
++    23	  if (await notify(c, text)) return true;
++    24	  const k = `${store.prefix}pendingnotes`;
++    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
++    26	  arr.push({ text, at: Date.now() });
++    27	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
++    28	  return false;
++    29	}
++    30	async function flushPendingNotes(c, store) {
++    31	  const k = `${store.prefix}pendingnotes`;
++    32	  let arr;
++    33	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
++    34	  if (!Array.isArray(arr) || !arr.length) return;
++    35	  const rest = [];
++    36	  for (const n of arr) {
++    37	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
++    38	    if (!(await notify(c, n.text))) rest.push(n);
++    39	  }
++    40	  if (rest.length !== arr.length) {
++    41	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
++    42	    else await store.kvRaw.delete(k);
++    43	  }
++    44	}
++    45	const WORDS = ["反対", "賛成", "棄権"];
++    46	
++    47	function isContractRevert(e) {
++    48	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
++    49	  let x = e;
++    50	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
++    51	  return false;
++    52	}
++    53	
++    54	async function announceNew(c, pc, store, p, block, snapInfo) {
++    55	  const prev = await store.getAnnounced(p.id);
++    56	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
++    57	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
++    58	  const mg = await metagovInfo(c, pc, p.id);
++    59	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
++    60	  if (c.snapshotSpace) {
++    61	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
++    62	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
++    63	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
++    64	    const lines = [
++    65	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
++    66	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
++    67	      `締切: ${jst} ごろ (block ${mg.deadline})`,
++    68	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
++    69	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
++    70	    ];
++    71	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
++    72	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
++    73	    return;
++    74	  }
++    75	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
++    76	  const deadlineBlock = mg.deadline || p.endBlock;
++    77	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
++    78	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
++    79	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
++    80	  if (await notify(c, [
++    81	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
++    82	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
++    83	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
++    84	    `投票ページ: ${c.publicUrl}`,
++    85	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
++    86	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
++    87	}
++    88	
++    89	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
++    90	const FORCE_LIST_MS = 20 * 60 * 1000;
++    91	async function loadVotes(store, proposalId, force) {
++    92	  const sum = await store.getSummary(proposalId);
++    93	  const dirty = await store.dirtyAt(proposalId);
++    94	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
++    95	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
++    96	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
++    97	  const listed = await store.listVoteSummaries(proposalId);
++    98	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
++    99	  await store.putSummary(proposalId, summaries, listedAt);
++   100	  return { summaries, listedAt };
++   101	}
++   102	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
++   103	function setStatus(summaries, voter, patch) {
++   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
++   105	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
++   106	}
++   107	async function flushSummary(store, proposalId, summaries) {
++   108	  const sum = await store.getSummary(proposalId);
++   109	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
++   110	}
++   111	
++   112	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
++   113	async function reconcileSent(c, pc, store, proposalId, summaries) {
++   114	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
++   115	  if (!sent.length) return false;
++   116	  const byTx = new Map();
++   117	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
++   118	  let changed = false;
++   119	  for (const [tx, vs] of byTx) {
++   120	    let rc = null;
++   121	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
++   122	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
++   123	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
++   124	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
++   125	    for (let i = 0; i < vs.length; i++) {
++   126	      const v = vs[i];
++   127	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
++   128	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
++   129	    }
++   130	    changed = true;
++   131	    if (rc && rc.status === "success") {
++   132	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
++   133	      const mg = await metagovInfo(c, pc, proposalId);
++   134	      const sent = await queueNotify(c, store, [
++   135	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
++   136	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++   137	        `tx: ${explorerTx(c, tx)}`,
++   138	      ].join("\n"));
++   139	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
++   140	    } else {
++   141	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
++   142	    }
++   143	  }
++   144	  if (changed) await flushSummary(store, proposalId, summaries);
++   145	  return changed;
++   146	}
++   147	
++   148	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
++   149	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
++   150	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
++   151	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
++   152	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
++   153	  const sentK = `${store.prefix}snapsent:${nounsId}`;
++   154	  const pending = await store.kvRaw.get(sentK, "json");
++   155	  if (pending) {
++   156	    let allMined = true, anySuccess = false, gasTotal = 0n;
++   157	    for (const tx of pending.txs) {
++   158	      let rc = null;
++   159	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
++   160	      if (!rc) { allMined = false; continue; }
++   161	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
++   162	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
++   163	    }
++   164	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
++   165	    await store.kvRaw.delete(sentK);
++   166	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
++   167	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
++   168	      const mg = await metagovInfo(c, pc, nounsId);
++   169	      const sent = await queueNotify(c, store, [
++   170	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
++   171	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
++   172	        `tx: ${explorerTx(c, pending.txs[0])}`,
++   173	      ].join("\n"));
++   174	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
++   175	    }
++   176	    return;
++   177	  }
++   178	
++   179	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
++   180	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
++   181	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
++   182	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
++   183	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
++   184	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
++   185	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
++   186	  const deadLetters = new Set(deadArr);
++   187	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
++   188	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
++   189	  const owners = await allOwners(c, pc);
++   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
++   191	  const tokenCounts = tokensByRow.map((ids) => ids.length);
++   192	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
++   193	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
++   194	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
++   195	  const votedByToken = new Map();
++   196	  for (let start = 0; start < checkTokenIds.length; start += 200) {
++   197	    const ids = checkTokenIds.slice(start, start + 200);
++   198	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
++   199	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
++   200	  }
++   201	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
++   202	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
++   203	  const batches = rush ? c.rushBatches : 1;
++   204	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
++   205	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
++   206	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
++   207	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
++   208	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
++   209	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
++   210	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
++   211	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
++   212	
++   213	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
++   214	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
++   215	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
++   216	  for (const { row, index } of send) {
++   217	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
++   218	    if (!env) {
++   219	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
++   220	      if (fails[row.ipfs] >= 20) {
++   221	        deadArr.push(row.ipfs); deadChanged = true;
++   222	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
++   223	      }
++   224	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
++   225	    }
++   226	    const m = env.data.message;
++   227	    const tokenIds = [];
++   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
++   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
++   230	    args.push(arg); cidOf.set(arg, row.ipfs);
++   479	    for (const p of proposals) {
++   480	      if (p.state !== 0 && p.state !== 1) continue;
++   481	      try {
++   482	        const snapInfo = snapByNouns.get(p.id) || null;
++   483	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
++   484	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
++   485	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
++   486	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
++   487	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
++   488	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
++   489	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
++   490	          }
++   491	          continue;
++   492	        }
++   493	        const mg = await metagovInfo(c, pc, p.id);
++   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
++   495	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
++   496	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
++   497	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
++   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
++   499	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
++   500	        }
++   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
++   502	        let timelineBad = false;
++   503	        if (c.snapshotSpace && snapInfo) {
++   504	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
++   505	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
++   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
++   507	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
++   508	          }
++   509	        }
++   510	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
++   511	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
++   512	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
++   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
++   514	          await announceNew(c, pc, store, p, block, snapInfo);
++   515	        }
++   516	        if (linkBad && c.network === "mainnet") continue;
++   517	        if (timelineBad && c.network === "mainnet") continue;
++   518	        if (!wc) continue;
++   519	        if (block < mg.deadline) {
++   520	          if (c.snapshotSpace) {
++   521	            if (snapInfo) {
++   522	              const rush = shouldRushSubmit(c, block, mg.deadline);
++   523	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
++   524	            }
++   525	          }
++   526	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
++   527	        } else if (!c.snapshotSpace || snapInfo) {
++   528	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
++   529	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
++   530	          await maybeExecute(c, pc, wc, store, p, block, mg);
++   531	        }
++   532	      } catch (e) {
++   533	        await notifyError(c, `worker prop ${p.id}`, e);
++   534	      }
++   535	    }
++   536	  } catch (e) {
++   537	    await notifyError(c, "worker tick", e);
++   538	  }
++   539	}
++   540	export { notify };
++     1	// Cloudflare Worker: Hono API + cron(scheduled)。静的 dApp は wrangler の assets で配信(public/_headers で CSP)。
++     2	import { Hono } from "hono";
++     3	import { recoverTypedDataAddress, encodeFunctionData } from "viem";
++     4	import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
++     5	import { makeStore } from "./store.js";
++     6	import { tick, notifyError } from "./worker.js";
++     7	
++     8	const app = new Hono();
++     9	
++    10	// API 応答の防御ヘッダー
++    11	app.use("*", async (ctx, next) => {
++    12	  await next();
++    13	  ctx.header("X-Content-Type-Options", "nosniff");
++    14	  ctx.header("X-Frame-Options", "DENY");
++    15	  ctx.header("Referrer-Policy", "no-referrer");
++    16	  ctx.header("Cache-Control", "no-store");
++    17	});
++    18	
++    19	app.get("/api/config", (ctx) => {
++    20	  const c = cfg(ctx.env);
++    21	  const snap = !!c.snapshotSpace;
++    22	  // relayer アドレスは tx 送信時にオンチェーンで公開される情報。照合スクリプト(check-deploy)が
++    23	  // 「稼働中 Worker の鍵」と「意図した鍵」の一致を機械確認できるよう返す(秘密鍵は含まない)。
++    24	  const relayer = clients(c).account?.address || null;
++    25	  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
++    26	});
++    27	
++    28	app.get("/api/proposals", async (ctx) => {
++    29	  const c = cfg(ctx.env);
++    30	  // Cache API(コロ単位)で 30 秒キャッシュ。クエリ差でキャッシュを迂回されないよう closed は 0/8 に正規化してキーにする
++    31	  const closedN = ctx.req.query("closed") ? 8 : 0;
++    32	  const cache = caches.default;
++    33	  const cacheKey = new Request(`https://cache.local/api/proposals?closed=${closedN}&n=${c.network}`);
++    34	  const hit = await cache.match(cacheKey);
++    35	  if (hit) return hit;
++    36	  const { publicClient: pc } = clients(c);
++    37	  const store = makeStore(ctx.env.STATE, storeNs(c));
++    38	  const { block, proposals } = await recentProposals(c, pc);
++    39	  const wanted = proposals.filter((p) => p.state === 0 || p.state === 1 || closedN);
++    40	  const limited = closedN ? wanted.slice(0, closedN) : wanted;
++    41	  const snapmap = c.snapshotSpace ? ((await ctx.env.STATE.get(`${store.prefix}snapmap`, "json")) || {}) : {};
++    42	  const snapByNouns = Object.fromEntries(Object.entries(snapmap).map(([k, v]) => [v, k]));
++    43	  const list = await Promise.all(limited.map(async (p) => {
++    44	    const votable = p.state === 0 || p.state === 1;
++    45	    const [title, mg, sum, executed] = await Promise.all([proposalTitle(c, pc, store, p.id, p.creationBlock, p.state), metagovInfo(c, pc, p.id), store.getSummary(p.id), store.getExecuted(p.id)]);
++    46	    const snapshotProposalId = snapByNouns[p.id] || null;
++    47	    const votes = sum.votes;
++    48	    const acceptUntil = mg.deadline ? acceptDeadline(c, mg.deadline) : 0;
++    49	    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
++    50	  }));
++    51	  const res = ctx.json({ block, proposals: list });
++    52	  const toCache = new Response(res.body, res); toCache.headers.set("Cache-Control", "public, max-age=30");
++    53	  ctx.executionCtx.waitUntil(cache.put(cacheKey, toCache.clone()));
++    54	  return toCache;
++    55	});
++    56	
++    57	app.get("/api/tokens/:address", async (ctx) => {
++    58	  const c = cfg(ctx.env);
++    59	  const { publicClient: pc } = clients(c);
++    60	  const store = makeStore(ctx.env.STATE, storeNs(c));
++    61	  if (!/^0x[0-9a-fA-F]{40}$/.test(ctx.req.param("address"))) return ctx.json({ error: "bad address" }, 400); // L-08: 入力エラーは 400、障害通知しない
++    62	  const address = getAddress(ctx.req.param("address"));
++    63	  const ids = await tokensOf(c, pc, address);
++    64	  const proposalId = ctx.req.query("proposalId");
++    65	  let voted = {}, hasVoted = false, pending = null;
++    66	  if (proposalId && /^\d{1,10}$/.test(proposalId)) {
++    67	    const pid = BigInt(proposalId);
++    68	    const res = await pc.multicall({ contracts: [
++    69	      { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, address] },
++    70	      ...ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [pid, BigInt(id)] })),
++    71	    ], allowFailure: false });
++    72	    hasVoted = res[0];
++    73	    ids.forEach((id, i) => { voted[id] = res[i + 1]; });
++    74	    const rec = await store.getVote(String(pid), address);
++    75	    if (rec) {
++    76	      const st = (await store.getSummary(String(pid))).votes.find((v) => v.voter.toLowerCase() === address.toLowerCase()) || {};
++    77	      pending = { support: rec.support, tokenIds: rec.tokenIds, tx: st.tx, txStatus: st.txStatus, receivedAt: rec.receivedAt };
++    78	    }
++    79	  }
++    80	  return ctx.json({ address, tokenIds: ids, voted, hasVoted, pending });
++    81	});
++    82	
++    83	// M-01R: 本文をストリームで最大 64KB まで読む(Content-Length に依存しない)
++    84	async function readJsonLimited(req, limit = 65536) {
++    85	  const reader = req.body?.getReader();
++    86	  if (!reader) return null;
++    87	  const chunks = []; let total = 0;
++    88	  while (true) {
++    89	    const { done, value } = await reader.read();
++    90	    if (done) break;
++    91	    total += value.byteLength;
++    92	    if (total > limit) { try { await reader.cancel(); } catch {} throw new Error("payload too large"); }
++    93	    chunks.push(value);
++    94	  }
++    95	  const buf = new Uint8Array(total); let o = 0; for (const ch of chunks) { buf.set(ch, o); o += ch.byteLength; }
++    96	  return JSON.parse(new TextDecoder().decode(buf));
++    97	}
++    98	
++    99	app.post("/api/vote", async (ctx) => {
++   100	  const c = cfg(ctx.env);
++   101	  if (c.snapshotSpace) return ctx.json({ error: `voting happens on Snapshot: https://snapshot.box/#/s:${c.snapshotSpace}`, code: "snapshot_mode" }, 410);
++   102	  const { publicClient: pc } = clients(c);
++   103	  const store = makeStore(ctx.env.STATE, storeNs(c));
++   104	  let body;
++   105	  try { body = await readJsonLimited(ctx.req.raw); } catch (e) { return ctx.json({ error: e.message === "payload too large" ? "payload too large" : "bad json" }, e.message === "payload too large" ? 413 : 400); }
++   106	  const { proposalId, support, tokenIds, signature } = body || {};
++   107	  if (proposalId === undefined || !/^\d{1,10}$/.test(String(proposalId)) || ![0, 1, 2].includes(Number(support)) || !Array.isArray(tokenIds) || !tokenIds.length || typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) return ctx.json({ error: "bad request" }, 400);
++   108	  if (tokenIds.length > 300) return ctx.json({ error: "too many tokenIds" }, 400);
++   109	  // Low: 正規化(BigInt 化した正規値で検証・保存)
++   110	  const pid = BigInt(String(proposalId));
++   111	  const pidKey = pid.toString();
++   112	  const seen = new Set(); const ids = [];
++   113	  for (const x of tokenIds) {
++   114	    if (!/^\d{1,5}$/.test(String(x))) return ctx.json({ error: `invalid tokenId ${x}` }, 400);
++   115	    const n = BigInt(String(x));
++   116	    if (n < 1n || n > 2100n || seen.has(n.toString())) return ctx.json({ error: `invalid or duplicate tokenId ${x}` }, 400);
++   117	    seen.add(n.toString()); ids.push(n);
++   118	  }
++   119	  let voter;
++   120	  try { voter = await recoverTypedDataAddress({ domain: domain(c), types: VOTE_TYPES, primaryType: "Vote", message: { proposalId: pid, support: Number(support), tokenIds: ids }, signature }); }
++   121	  catch { return ctx.json({ error: "invalid signature" }, 400); }
++   122	  // 署名者ごとの簡易レート制限(60 秒に 1 回。KV 最小 TTL)
++   123	  if (await store.getFlag(`rl:${voter.toLowerCase()}`)) return ctx.json({ error: "too many requests, retry later" }, 429);
++   124	  const owners = await allOwners(c, pc);
++   125	  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
++   126	  const [state, deadline, hasVoted, excluded] = await pc.multicall({ contracts: [
++   127	    { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [pid] },
++   128	    { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
++   129	    { address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [pid, voter] },
++   130	    { address: c.metagov, abi: METAGOV_ABI, functionName: "excluded", args: [voter] },
++   131	  ], allowFailure: false }).then((r) => [Number(r[0]), Number(r[1]), r[2], r[3]]);
++   132	  const block = Number(await pc.getBlockNumber());
++   133	  if (excluded) return ctx.json({ error: "voter is excluded" }, 400);
++   134	  if (hasVoted) return ctx.json({ error: "already voted on-chain" }, 400);
++   135	  if (state !== 0 && state !== 1) return ctx.json({ error: `proposal not votable (state ${state})` }, 400);
++   136	  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
++   137	  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
++   138	  // M-14R: 受付容量(締切までに確実に投函できる数)を超える場合は受け付けない
++   139	  const sumNow = await store.getSummary(pidKey);
++   140	  const pendingNow = sumNow.votes.filter((v) => !v.tx && !v.dropped).length;
++   141	  const capacity = submitCapacity(c, block, deadline);
++   142	  if (pendingNow >= capacity) return ctx.json({ error: "relayer capacity before the deadline is full; please submit on-chain yourself (manual submit button / castVote)", code: "capacity_full", pending: pendingNow, capacity }, 400);
++   143	  const existing = await store.getVote(pidKey, voter);
++   144	  if (existing) { const st = sumNow.votes.find((v) => v.voter.toLowerCase() === voter.toLowerCase()); if (st && st.tx) return ctx.json({ error: "already submitted" }, 400); }
++   145	  await store.setFlag(`rl:${voter.toLowerCase()}`, 60);
++   146	  await store.putVote(pidKey, voter, { support: Number(support), tokenIds: ids.map(String), signature, receivedAt: new Date().toISOString() });
++   147	  await store.markDirty(pidKey); // ワーカーが次回 tick で list → サマリー更新
++   148	  console.log(`[api] vote received: prop ${pidKey} ${voter} support=${support} tokens=${ids.length}`);
++   149	  return ctx.json({ ok: true, voter, proposalId: pidKey, support: Number(support), tokenIds: ids.map(String) });
++   150	});
++   151	
++   152	// 署名の公開: 誰でも取得・投函できる。?calldata=1 でいま通る署名(最大 MAX_BATCH 件)の calldata と実見積りガス
++   153	app.get("/api/signatures/:id", async (ctx) => {
++   154	  const c = cfg(ctx.env);
++   155	  if (c.snapshotSpace) return ctx.json({ error: "snapshot mode: votes are public on the Snapshot hub", code: "snapshot_mode" }, 410);
++   156	  const { publicClient: pc, account } = clients(c);
++   157	  const store = makeStore(ctx.env.STATE, storeNs(c));
++   158	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
++   159	  const id = BigInt(ctx.req.param("id")).toString();
++   160	  const summaries = (await store.getSummary(id)).votes; // 公開 API は list しない(サマリーはワーカーが更新)
++   161	  const out = { proposalId: id, contract: c.metagov, chainId: c.chainId, domain: domain(c), types: VOTE_TYPES,
++   162	    pending: summaries.filter((v) => !v.tx && !v.dropped), submitted: summaries.filter((v) => v.tx), dropped: summaries.filter((v) => v.dropped) };
++   163	  if (ctx.req.query("calldata") && out.pending.length) {
++   164	    const cand = out.pending.slice(0, c.maxBatch);
++   165	    const fulls = [];
++   166	    for (const s of cand) { const v = await store.getVote(id, s.voter); if (v) fulls.push({ voter: s.voter, ...v }); }
++   167	    const args = fulls.map((v) => ({ proposalId: BigInt(id), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature }));
++   168	    let good = args;
++   169	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args] }); }
++   170	    catch { good = []; for (const a of args.slice(0, 10)) { try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[a]] }); good.push(a); } catch {} } }
++   171	    out.submittable = good.length;
++   172	    out.remaining = out.pending.length - good.length;
++   173	    out.calldata = good.length ? encodeFunctionData({ abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good] }) : null;
++   174	    if (good.length) {
++   175	      try { const est = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [good], account: account || undefined }); out.gasHint = Number((est * 14n) / 10n); }
++   176	      catch { out.gasHint = 200000 + 80000 * good.length + 8000 * good.reduce((a, v) => a + v.tokenIds.length, 0); }
++   177	    } else out.gasHint = 0;
++   178	  }
++   179	  // 署名本文も公開(誰でも投函できるように)。get のみ
++   180	  if (ctx.req.query("full")) { out.pendingFull = []; for (const s of out.pending.slice(0, c.maxBatch)) { const v = await store.getVote(id, s.voter); if (v) out.pendingFull.push({ voter: s.voter, ...v }); } }
++   181	  return ctx.json(out);
++   182	});
++   183	
++   184	app.get("/api/proposal/:id", async (ctx) => {
++   185	  const c = cfg(ctx.env);
++   186	  const { publicClient: pc } = clients(c);
++   187	  const store = makeStore(ctx.env.STATE, storeNs(c));
++   188	  if (!/^\d{1,10}$/.test(ctx.req.param("id"))) return ctx.json({ error: "bad id" }, 400);
++   189	  const id = Number(ctx.req.param("id"));
++   190	  const [mg, sum, executed] = await Promise.all([metagovInfo(c, pc, id), store.getSummary(String(id)), store.getExecuted(id)]);
++   191	  return ctx.json({ id, metagov: mg, votes: sum.votes, executed });
++   192	});
++   193	
++   194	// 手動トリガ(TICK_TOKEN 設定時のみ有効)
++   195	app.post("/api/tick", async (ctx) => {
++   196	  if (!ctx.env.TICK_TOKEN) return ctx.json({ error: "disabled" }, 404);
++   197	  if (ctx.req.header("x-tick-token") !== ctx.env.TICK_TOKEN) return ctx.json({ error: "forbidden" }, 403);
++   198	  await tick(ctx.env);
++   199	  return ctx.json({ ok: true });
++   200	});
++   201	
++   202	// L-08: 内部障害(KV / RPC / 送信)だけ Discord 通知。入力起因の例外は 400 で返し通知しない
++   203	const INTERNAL_ERR = new Set(["HttpRequestError", "TimeoutError", "RpcRequestError", "InternalRpcError", "LimitExceededRpcError", "ResourceUnavailableRpcError"]);
++   204	function isInternalError(e) { return INTERNAL_ERR.has(e?.name) || /KV|Too many|limit|exceeded|network|fetch failed/i.test(e?.message || ""); }
++   205	function isClientError(e) { return ["InvalidAddressError", "SyntaxError", "SizeExceedsPaddingSizeError", "InvalidHexValueError"].includes(e?.name) || /^Address ".*" is invalid/.test(e?.message || ""); }
++   206	app.onError((e, ctx) => {
++   207	  if (isClientError(e)) return ctx.json({ error: "bad request" }, 400);
++   208	  console.error(e);
++   209	  if (isInternalError(e)) { try { const c = cfg(ctx.env); ctx.executionCtx.waitUntil(notifyError(c, `api ${new URL(ctx.req.url).pathname}`, e)); } catch {} }
++   210	  return ctx.json({ error: e.shortMessage || e.message }, 500);
++   211	});
++   212	
++   213	export default {
++   214	  fetch: app.fetch,
++   215	  async scheduled(event, env, ectx) { ectx.waitUntil(tick(env)); },
++   216	};
++     1	// KV ストア(Cloudflare 無料枠: 書込み 1,000/日、list 1,000/日、読取 100,000/日、1 呼び出し 1,000 操作)
++     2	//  - 全キーは "<chainId>:<voter>:" で名前空間化(コントラクト再デプロイで混ざらない)
++     3	//  - 票: vote:{pid}:{voter}。値=本文(署名)、metadata=要約。一覧は list の metadata だけで作る(get は投函対象 ≤ MAX_BATCH 件のみ)
++     4	//  - サマリー sum:{pid}: ワーカーが list 結果から書く(listedAt 付き)。公開 API は get のみ
++     5	//  - dirty:{pid}: API が署名受付時に受付時刻を書く。ワーカーは「dirty > 前回 listedAt」なら再 list(削除しないので競合しない)
++     6	//  - inflight キーは持たない: 送信中は sum の txStatus:"sent" / executed.pending から毎 tick 検出
++     7	export function makeStore(kv, ns) {
++     8	  const P = ns ? `${ns}:` : "";
++     9	  const voteKey = (pid, voter) => `${P}vote:${pid}:${voter.toLowerCase()}`;
++    10	  // metadata は受付時の不変情報だけ(support/枚数/受付時刻)。投函状態(tx/txStatus/dropped/sentAt)は sum:{pid} だけが持つ(書込み削減・競合回避)
++    11	  const meta = (rec) => ({ s: rec.support, n: rec.tokenIds.length, at: rec.receivedAt });
++    12	  const fromMeta = (voter, m) => ({ voter, support: m.s, tokenCount: m.n, receivedAt: m.at });
++    13	  return {
++    14	    kvRaw: kv, prefix: P,
++    15	    async getVote(pid, voter) { return kv.get(voteKey(pid, voter), "json"); },
++    16	    async putVote(pid, voter, rec) { await kv.put(voteKey(pid, voter), JSON.stringify(rec), { metadata: meta(rec) }); },
++    17	    /// list(metadata のみ、get なし)。ワーカー専用
++    18	    async listVoteSummaries(pid) {
++    19	      const out = []; let cursor;
++    20	      do {
++    21	        const r = await kv.list({ prefix: `${P}vote:${pid}:`, cursor });
++    22	        for (const k of r.keys) if (k.metadata) out.push(fromMeta(k.name.split(":").pop(), k.metadata));
++    23	        cursor = r.list_complete ? undefined : r.cursor;
++    24	      } while (cursor);
++    25	      return out;
++    26	    },
++    27	    summarize(voter, rec) { return fromMeta(voter, meta(rec)); },
++    28	    /// list 結果(新規 voter を含む)と既存サマリー(状態を含む)をマージ
++    29	    mergeSummaries(listed, existing) {
++    30	      const byVoter = new Map(existing.map((v) => [v.voter.toLowerCase(), v]));
++    31	      return listed.map((l) => { const e = byVoter.get(l.voter.toLowerCase()); return e ? { ...l, tx: e.tx, txStatus: e.txStatus, dropped: e.dropped, sentAt: e.sentAt } : l; });
++    32	    },
++    33	    async getSummary(pid) { return (await kv.get(`${P}sum:${pid}`, "json")) || { listedAt: 0, votes: [] }; },
++    34	    async putSummary(pid, votes, listedAt) { await kv.put(`${P}sum:${pid}`, JSON.stringify({ listedAt, votes })); },
++    35	    async markDirty(pid) { await kv.put(`${P}dirty:${pid}`, String(Date.now()), { expirationTtl: 86400 * 7 }); },
++    36	    async dirtyAt(pid) { return Number(await kv.get(`${P}dirty:${pid}`)) || 0; },
++    37	    async getExecuted(pid) { return kv.get(`${P}executed:${pid}`, "json"); },
++    38	    async putExecuted(pid, rec) { if (rec === null) return kv.delete(`${P}executed:${pid}`); await kv.put(`${P}executed:${pid}`, JSON.stringify(rec)); },
++    39	    async getAnnounced(pid) { return kv.get(`${P}announced:${pid}`); },
++    40	    async putAnnounced(pid, v) { await kv.put(`${P}announced:${pid}`, v); },
++    41	    async getFlag(k) { return kv.get(`${P}flag:${k}`); },
++    42	    async setFlag(k, ttl) { await kv.put(`${P}flag:${k}`, "1", { expirationTtl: Math.max(60, ttl) }); },
++    43	  };
++    44	}
++
++exec
++/bin/bash -lc "nl -ba relayer-cf/src/worker.js | sed -n '225,330p'
++nl -ba relayer-cf/src/worker.js | sed -n '500,570p'
++nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '1,280p'
++nl -ba relayer-cf/test/link-check.test.mjs | sed -n '1,120p'" in /mnt/data/pnouns-voter
++ succeeded in 0ms:
++   225	    }
++   226	    const m = env.data.message;
++   227	    const tokenIds = [];
++   228	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
++   229	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
++   230	    args.push(arg); cidOf.set(arg, row.ipfs);
++   231	  }
++   232	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
++   233	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
++   234	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
++   235	  if (!args.length) return;
++   236	
++   237	  const txs = []; let count = 0;
++   238	  for (let b = 0; b < batches; b++) {
++   239	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
++   240	    if (!chunk.length) break;

exec
/bin/bash -lc "find . -name AGENTS.md -print
find . -path '*/artifacts/*' -type f \\( -name '*.json' \\) | sed -n '1,120p'
git diff 8e37def"'^ 8e37def -- relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/test/worker-tick.test.mjs scripts/check-deploy.mjs scripts/mainnet/deploy-snapvoter.js docs/RUNBOOK-MAINNET.md' in /mnt/data/pnouns-voter
 succeeded in 515ms:
./artifacts/@openzeppelin/contracts/access/Ownable.sol/Ownable.dbg.json
./artifacts/@openzeppelin/contracts/access/Ownable.sol/Ownable.json
./artifacts/@openzeppelin/contracts/interfaces/IERC5267.sol/IERC5267.dbg.json
./artifacts/@openzeppelin/contracts/interfaces/IERC5267.sol/IERC5267.json
./artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.dbg.json
./artifacts/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json
./artifacts/@openzeppelin/contracts/utils/Bytes.sol/Bytes.dbg.json
./artifacts/@openzeppelin/contracts/utils/Bytes.sol/Bytes.json
./artifacts/@openzeppelin/contracts/utils/Context.sol/Context.dbg.json
./artifacts/@openzeppelin/contracts/utils/Context.sol/Context.json
./artifacts/@openzeppelin/contracts/utils/cryptography/ECDSA.sol/ECDSA.dbg.json
./artifacts/@openzeppelin/contracts/utils/cryptography/ECDSA.sol/ECDSA.json
./artifacts/@openzeppelin/contracts/utils/cryptography/EIP712.sol/EIP712.dbg.json
./artifacts/@openzeppelin/contracts/utils/cryptography/EIP712.sol/EIP712.json
./artifacts/@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol/MessageHashUtils.dbg.json
./artifacts/@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol/MessageHashUtils.json
./artifacts/@openzeppelin/contracts/utils/introspection/IERC165.sol/IERC165.dbg.json
./artifacts/@openzeppelin/contracts/utils/introspection/IERC165.sol/IERC165.json
./artifacts/@openzeppelin/contracts/utils/math/Math.sol/Math.dbg.json
./artifacts/@openzeppelin/contracts/utils/math/Math.sol/Math.json
./artifacts/@openzeppelin/contracts/utils/math/SafeCast.sol/SafeCast.dbg.json
./artifacts/@openzeppelin/contracts/utils/math/SafeCast.sol/SafeCast.json
./artifacts/@openzeppelin/contracts/utils/math/SignedMath.sol/SignedMath.dbg.json
./artifacts/@openzeppelin/contracts/utils/math/SignedMath.sol/SignedMath.json
./artifacts/@openzeppelin/contracts/utils/Panic.sol/Panic.dbg.json
./artifacts/@openzeppelin/contracts/utils/Panic.sol/Panic.json
./artifacts/@openzeppelin/contracts/utils/ReentrancyGuard.sol/ReentrancyGuard.dbg.json
./artifacts/@openzeppelin/contracts/utils/ReentrancyGuard.sol/ReentrancyGuard.json
./artifacts/@openzeppelin/contracts/utils/ShortStrings.sol/ShortStrings.dbg.json
./artifacts/@openzeppelin/contracts/utils/ShortStrings.sol/ShortStrings.json
./artifacts/@openzeppelin/contracts/utils/StorageSlot.sol/StorageSlot.dbg.json
./artifacts/@openzeppelin/contracts/utils/StorageSlot.sol/StorageSlot.json
./artifacts/@openzeppelin/contracts/utils/Strings.sol/Strings.dbg.json
./artifacts/@openzeppelin/contracts/utils/Strings.sol/Strings.json
./artifacts/build-info/1162686bfad01aa1e4a2aadfd20e2c67.json
./artifacts/build-info/58168cea156986ca8c13a58b7be7f24d.json
./artifacts/build-info/9f3d9c69652999d3f9330425b181051d.json
./artifacts/build-info/fc5105efd8df860ab8230bb8be7e3bbe.json
./artifacts/contracts/PNounsSnapVoter.sol/IERC1271.dbg.json
./artifacts/contracts/PNounsSnapVoter.sol/IERC1271.json
./artifacts/contracts/PNounsSnapVoter.sol/INounsDAO.dbg.json
./artifacts/contracts/PNounsSnapVoter.sol/INounsDAO.json
./artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.dbg.json
./artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json
./artifacts/contracts/PNounsVoter.sol/INounsDAO.dbg.json
./artifacts/contracts/PNounsVoter.sol/INounsDAO.json
./artifacts/contracts/PNounsVoter.sol/PNounsVoter.dbg.json
./artifacts/contracts/PNounsVoter.sol/PNounsVoter.json
./artifacts/contracts/test/Mock1271Wallet.sol/Mock1271Wallet.dbg.json
./artifacts/contracts/test/Mock1271Wallet.sol/Mock1271Wallet.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControl.sol/AccessControl.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControl.sol/AccessControl.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControlEnumerable.sol/AccessControlEnumerable.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControlEnumerable.sol/AccessControlEnumerable.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/IAccessControl.sol/IAccessControl.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/IAccessControl.sol/IAccessControl.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/IAccessControlEnumerable.sol/IAccessControlEnumerable.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/IAccessControlEnumerable.sol/IAccessControlEnumerable.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/Ownable.sol/Ownable.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/access/Ownable.sol/Ownable.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/token/ERC721/IERC721.sol/IERC721.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/Context.sol/Context.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/Context.sol/Context.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/cryptography/MerkleProof.sol/MerkleProof.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/cryptography/MerkleProof.sol/MerkleProof.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/introspection/ERC165.sol/ERC165.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/introspection/ERC165.sol/ERC165.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/introspection/IERC165.sol/IERC165.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/introspection/IERC165.sol/IERC165.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/math/Math.sol/Math.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/math/Math.sol/Math.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/Strings.sol/Strings.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/Strings.sol/Strings.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol/EnumerableSet.dbg.json
./artifacts/contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol/EnumerableSet.json
./artifacts/contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol/IAssetProvider.dbg.json
./artifacts/contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol/IAssetProvider.json
./artifacts/contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol/IAssetProviderEx.dbg.json
./artifacts/contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol/IAssetProviderEx.json
./artifacts/contracts/vendor/pnouns/base64-sol/base64.sol/Base64.dbg.json
./artifacts/contracts/vendor/pnouns/base64-sol/base64.sol/Base64.json
./artifacts/contracts/vendor/pnouns/contract/contracts/libs/ProviderTokenA1.sol/ProviderTokenA1.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/libs/ProviderTokenA1.sol/ProviderTokenA1.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/ERC721AP2P.sol/ERC721AP2P.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/ERC721AP2P.sol/ERC721AP2P.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/ERC721AP2P.sol/ERC721WithOperatorFilter.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/ERC721AP2P.sol/ERC721WithOperatorFilter.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721Marketplace.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721Marketplace.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721P2P.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721P2P.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721P2PCore.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/IERC721P2P.sol/IERC721P2PCore.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/DefaultOperatorFilterer.sol/DefaultOperatorFilterer.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/DefaultOperatorFilterer.sol/DefaultOperatorFilterer.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/IOperatorFilterRegistry.sol/IOperatorFilterRegistry.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/IOperatorFilterRegistry.sol/IOperatorFilterRegistry.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/OperatorFilterer.sol/OperatorFilterer.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/packages/ERC721P2P/opensea/OperatorFilterer.sol/OperatorFilterer.json
./artifacts/contracts/vendor/pnouns/contract/contracts/pNounsContractFilter.sol/pNounsContractFilter.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/pNounsContractFilter.sol/pNounsContractFilter.json
./artifacts/contracts/vendor/pnouns/contract/contracts/pNounsToken.sol/pNounsToken.dbg.json
./artifacts/contracts/vendor/pnouns/contract/contracts/pNounsToken.sol/pNounsToken.json
./artifacts/contracts/vendor/pnouns/contract-allow-list/contracts/proxy/interface/IContractAllowListProxy.sol/IContractAllowListProxy.dbg.json
./artifacts/contracts/vendor/pnouns/contract-allow-list/contracts/proxy/interface/IContractAllowListProxy.sol/IContractAllowListProxy.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol/ERC721A.dbg.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol/ERC721A.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol/ERC721A__IERC721Receiver.dbg.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol/ERC721A__IERC721Receiver.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/extensions/ERC721AQueryable.sol/ERC721AQueryable.dbg.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/extensions/ERC721AQueryable.sol/ERC721AQueryable.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/extensions/IERC721AQueryable.sol/IERC721AQueryable.dbg.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/extensions/IERC721AQueryable.sol/IERC721AQueryable.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol/IERC721A.dbg.json
./artifacts/contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol/IERC721A.json
diff --git a/docs/RUNBOOK-MAINNET.md b/docs/RUNBOOK-MAINNET.md
index 663daeb..b9458fe 100644
--- a/docs/RUNBOOK-MAINNET.md
+++ b/docs/RUNBOOK-MAINNET.md
@@ -43,12 +43,14 @@ REG_DELAY=7200 MARGIN=300 \
 
 ```bash
 ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
-     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> EXPECT_BOT=0x<Snapshot bot>"
-# 手順 2 の後:            $ENV node scripts/check-deploy.mjs --stage deployed
-# 手順 4 の後:            $ENV node scripts/check-deploy.mjs --stage worker
-# プール入金の後:         $ENV node scripts/check-deploy.mjs --stage funded
-# 手順 6-1(委任)の後:     $ENV node scripts/check-deploy.mjs --stage delegated
-# 手順 6-3(live 化)の後:  $ENV node scripts/check-deploy.mjs --stage live
+     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> \
+     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=300"
+# (シェルの制約上、変数展開をコマンドとして実行できないため env を前置する)
+# 手順 2 の後:            env $ENV node scripts/check-deploy.mjs --stage deployed
+# 手順 4 の後:            env $ENV node scripts/check-deploy.mjs --stage worker
+# プール入金の後:         env $ENV node scripts/check-deploy.mjs --stage funded
+# 手順 6-1(委任)の後:     env $ENV node scripts/check-deploy.mjs --stage delegated
+# 手順 6-3(live 化)の後:  env $ENV node scripts/check-deploy.mjs --stage live
 ```
 
 mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
diff --git a/relayer-cf/src/abi.js b/relayer-cf/src/abi.js
index d7ce2ea..77f6fe8 100644
--- a/relayer-cf/src/abi.js
+++ b/relayer-cf/src/abi.js
@@ -1,5 +1,35 @@
-// PNounsSnapVoter の必要最小限 ABI
+// PNounsSnapVoter の必要最小限 ABI。
+// custom error の定義を必ず含めること: viem はこの ABI で revert データを復号するため、
+// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
 export const METAGOV_ABI = [
+ {"inputs": [], "name": "AlreadyExecuted", "type": "error"},
+ {"inputs": [], "name": "AlreadyRegistered", "type": "error"},
+ {"inputs": [], "name": "ECDSAInvalidSignature", "type": "error"},
+ {"inputs": [{"internalType": "uint256", "name": "length", "type": "uint256"}], "name": "ECDSAInvalidSignatureLength", "type": "error"},
+ {"inputs": [{"internalType": "bytes32", "name": "s", "type": "bytes32"}], "name": "ECDSAInvalidSignatureS", "type": "error"},
+ {"inputs": [{"internalType": "address", "name": "voter", "type": "address"}], "name": "ExcludedVoter", "type": "error"},
+ {"inputs": [], "name": "FromMismatch", "type": "error"},
+ {"inputs": [], "name": "InvalidChoice", "type": "error"},
+ {"inputs": [], "name": "InvalidContractSignature", "type": "error"},
+ {"inputs": [], "name": "InvalidFromAddress", "type": "error"},
+ {"inputs": [], "name": "InvalidSpace", "type": "error"},
+ {"inputs": [], "name": "MixedProposals", "type": "error"},
+ {"inputs": [], "name": "NoTokenIds", "type": "error"},
+ {"inputs": [], "name": "NoVotes", "type": "error"},
+ {"inputs": [], "name": "NotRegistered", "type": "error"},
+ {"inputs": [], "name": "NotRegistrar", "type": "error"},
+ {"inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"internalType": "address", "name": "owner", "type": "address"}], "name": "NotTokenOwner", "type": "error"},
+ {"inputs": [], "name": "NothingCounted", "type": "error"},
+ {"inputs": [{"internalType": "address", "name": "owner", "type": "address"}], "name": "OwnableInvalidOwner", "type": "error"},
+ {"inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "OwnableUnauthorizedAccount", "type": "error"},
+ {"inputs": [{"internalType": "uint8", "name": "state", "type": "uint8"}], "name": "ProposalNotVotable", "type": "error"},
+ {"inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error"},
+ {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
+ {"inputs": [], "name": "StaleVote", "type": "error"},
+ {"inputs": [], "name": "VotesAlreadyCounted", "type": "error"},
+ {"inputs": [], "name": "VotingClosed", "type": "error"},
+ {"inputs": [], "name": "VotingNotClosed", "type": "error"},
+ {"inputs": [], "name": "WrongSpace", "type": "error"},
  {
   "anonymous": false,
   "inputs": [
diff --git a/relayer-cf/src/worker.js b/relayer-cf/src/worker.js
index 7faf7d2..7833877 100644
--- a/relayer-cf/src/worker.js
+++ b/relayer-cf/src/worker.js
@@ -517,14 +517,26 @@ export async function tick(env) {
             if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
           }
         }
+        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
+        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
+        let graceBad = false;
+        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
+          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
+          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
+          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
+            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
+            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
+          }
+        }
         // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
         // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
         // 「告知済み」が記録されて正しい URL の再告知も止まる。
-        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
+        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
           await announceNew(c, pc, store, p, block, snapInfo);
         }
         if (linkBad && c.network === "mainnet") continue;
         if (timelineBad && c.network === "mainnet") continue;
+        if (graceBad && c.network === "mainnet") continue;
         if (!wc) continue;
         if (block < mg.deadline) {
           if (c.snapshotSpace) {
diff --git a/relayer-cf/test/worker-tick.test.mjs b/relayer-cf/test/worker-tick.test.mjs
index 6656cc3..599a170 100644
--- a/relayer-cf/test/worker-tick.test.mjs
+++ b/relayer-cf/test/worker-tick.test.mjs
@@ -2,7 +2,8 @@
 // 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
 import { test, beforeEach } from "node:test";
 import assert from "node:assert/strict";
-import { keccak256, stringToBytes, parseEther } from "viem";
+import { keccak256, stringToBytes, parseEther, ContractFunctionRevertedError } from "viem";
+import { METAGOV_ABI } from "../src/abi.js";
 import { tick, __setClientsForTests, __resetWorkerStateForTests } from "../src/worker.js";
 
 const VOTER = "0x1000000000000000000000000000000000000001";
@@ -47,11 +48,12 @@ function fakePC(h) {
     async getBalance() { calls.push("getBalance"); return parseEther("1"); },
     async getTransactionReceipt() { throw new Error("not found"); },
     async estimateContractGas(x) { calls.push("estimateGas:" + x.functionName); return 100000n; },
+    async simulateContract(x) { calls.push("simulate:" + x.functionName); if (h.simulateContract) return h.simulateContract(x); return { request: {} }; },
   };
 }
 
 // ---- fetch mock: ハブと Discord を演じる ----
-const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
+const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0, envelope: null };
 globalThis.fetch = async (url, init) => {
   const u = String(url);
   if (u.startsWith(HUB)) {
@@ -62,6 +64,7 @@ globalThis.fetch = async (url, init) => {
     return new Response(JSON.stringify({ data: r ?? { proposals: [] } }), { status: 200 });
   }
   if (u === WEBHOOK) { F.discordBodies.push(JSON.parse(init.body).content); return new Response("", { status: F.discordStatus }); }
+  if (u.includes("/ipfs")) { return F.envelope ? new Response(JSON.stringify(F.envelope), { status: 200 }) : new Response("nf", { status: 404 }); }
   throw new Error("unexpected fetch: " + u);
 };
 
@@ -102,7 +105,7 @@ const setup = (h, envOver = {}, wallet = null) => {
 };
 const putsOf = (kv, part) => kv.ops.filter(([op, k]) => op === "put" && k.includes(part));
 
-beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });
+beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; F.envelope = null; __setClientsForTests(null); });
 
 test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
   const { kv, env } = setup(handlers());
@@ -214,9 +217,9 @@ test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、
 
 test("第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない", async () => {
   const wallet = { account: { address: RELAYER } };
-  // ケース A: 猶予中(eligibleAt=300 > block=100) → 対応付け解決後、票の取得にすら行かない
+  // ケース A: 猶予中(block=100 < eligibleAt=150 < 締切) → 対応付け解決後、票の取得にすら行かない
   {
-    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
+    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 150n }), {}, wallet);
     F.hub = [hubProposal("https://nouns.wtf/vote/1")];
     await tick(env);
     assert.equal(F.hubCalls, 1, "ハブ呼び出しは対応付けの 1 回だけ(votes クエリなし)");
@@ -269,3 +272,69 @@ test("確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再
   assert.ok(F.discordBodies.some((b) => b.includes("反映しました")), "持ち越した通知が再送される");
   assert.equal(kv.data.has(`${ns}pendingnotes`), false, "キューが空になり削除される");
 });
+
+test("第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する", async () => {
+  const wallet = { account: { address: RELAYER } };
+  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
+  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
+  await tick(env);
+  assert.ok(F.discordBodies.some((b) => b.includes("登録が遅すぎます")), "専用警告");
+  assert.equal(putsOf(kv, "flag:gracewarn:1").length, 1);
+  assert.equal(putsOf(kv, "announced").length, 0, "投函できない提案を告知しない");
+});
+
+// ---- 実投函経路(第14回監査 Low: mock で票 1 件を最後まで通す) ----
+const VOTER_A = "0x3000000000000000000000000000000000000001";
+const CID = "bafytest1";
+const TS = 1700000000;
+function submitHandlers(over = {}) {
+  return handlers({
+    totalSupply: () => 2n,
+    ownerOf: () => VOTER_A, // token 1,2 とも voterA 保有
+    voterRec: () => [false, 0, false, 0n, "0x" + "00".repeat(32)],
+    hasTokenVoted: () => false,
+    ...over,
+  });
+}
+const hubWithVote = () => [hubProposal("https://nouns.wtf/vote/1"), { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
+const goodEnvelope = () => ({ data: { message: { from: VOTER_A, timestamp: TS, proposal: SNAP_ID, choice: 1, reason: "", app: "", metadata: "" } }, sig: "0x" + "11".repeat(65) });
+
+test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
+  const writes = [];
+  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
+  const { kv, env } = setup(submitHandlers(), {}, wallet);
+  F.hub = hubWithVote(); F.envelope = goodEnvelope();
+  await tick(env);
+  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
+  assert.equal(putsOf(kv, "snapsent:1").length, 1, "送信中レコードが保存される");
+  assert.equal(putsOf(kv, "snapdrop").length, 0);
+});
+
+test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
+  const writes = [];
+  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
+  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
+  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
+  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
+  F.hub = hubWithVote(); F.envelope = goodEnvelope();
+  await tick(env);
+  assert.equal(writes.length, 0, "投函しない");
+  assert.equal(putsOf(kv, "snapdrop").length, 0, "transient なので drop に数えない");
+});
+
+test("実投函: 復号可能な恒久 revert(StaleVote)は drop に数える", async () => {
+  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
+  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3d7ac07d", functionName: "castSnapshotVotes" }); }; // StaleVote()
+  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
+  F.hub = hubWithVote(); F.envelope = goodEnvelope();
+  await tick(env);
+  assert.equal(putsOf(kv, "snapdrop:1").length, 1, "恒久 revert は従来どおり数える");
+});
+
+test("猶予境界: block == eligibleAt では投函が始まる", async () => {
+  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
+  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
+  F.hub = hubWithVote(); F.envelope = goodEnvelope();
+  await tick(env);
+  assert.ok(F.hubCalls >= 2, "votes クエリに到達(off-by-one なし)");
+});
diff --git a/scripts/check-deploy.mjs b/scripts/check-deploy.mjs
index e5b1f8c..9472541 100644
--- a/scripts/check-deploy.mjs
+++ b/scripts/check-deploy.mjs
@@ -6,9 +6,9 @@
 //   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
 //   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
 //
-// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED が必須。
-// worker 段階以降は EXPECT_RELAYER、delegated 以降は EXPECT_DELEGATOR も必須。
-// EXPECT_DELAY(既定 7200)・EXPECT_BOT(任意: 4 者分離の検査)も参照する。
+// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED / EXPECT_MARGIN が必須。
+// worker 段階以降は EXPECT_RELAYER と EXPECT_BOT(4 者分離)、delegated 以降は EXPECT_DELEGATOR も必須。
+// EXPECT_DELAY は既定 7200。
 //
 //   NETWORK=sepolia node scripts/check-deploy.mjs
 //   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_EXCLUDED=0x… node scripts/check-deploy.mjs --stage deployed
@@ -63,7 +63,7 @@ async function main() {
   check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
   const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 7200 : 1));
   check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
-  if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
+  if (requireEnv("EXPECT_MARGIN", "締切マージン")) if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
   check("refundEnabled", refund === true);
   // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
   if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
@@ -100,6 +100,7 @@ async function main() {
       check("relayer が Worker から取得できた", !!relayer, relayer || "(デプロイ伝搬直後は旧版が返ることがある → 再実行)");
       if (requireEnv("EXPECT_RELAYER", "リレイヤー")) if (E("EXPECT_RELAYER") && relayer) check("relayer が想定どおり", low(relayer) === low(E("EXPECT_RELAYER")), relayer);
     }
+    if (requireEnv("EXPECT_BOT", "Snapshot bot(4 者分離)")) { /* 下の分離検査で使う */ }
     const roles = { owner, registrar, relayer, bot: E("EXPECT_BOT") };
     const addrs = Object.values(roles).filter(Boolean).map(low);
     const distinct = new Set(addrs).size === addrs.length;
diff --git a/scripts/mainnet/deploy-snapvoter.js b/scripts/mainnet/deploy-snapvoter.js
index c7f903b..7713f25 100644
--- a/scripts/mainnet/deploy-snapvoter.js
+++ b/scripts/mainnet/deploy-snapvoter.js
@@ -1,5 +1,5 @@
 // mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
-// 使い方(必須値はすべて明示。fallback なし):
+// 使い方(アドレスは必須・明示。REG_DELAY/MARGIN には運用既定値 7200/300 がある):
 //   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
 //     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
 //   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
@@ -16,9 +16,15 @@ async function main() {
   const delay = Number(process.env.REG_DELAY || 7200);
   const margin = Number(process.env.MARGIN || 300);
   if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
+  // アドレスの厳格検証(第14回監査): checksum 不正・ゼロアドレスをデプロイ前に弾く
+  for (const [k, a] of [["OWNER", owner], ["REGISTRAR", registrar], ...excluded.map((a, i) => [`EXCLUDED[${i}]`, a])]) {
+    const norm = ethers.getAddress(a); // 不正なら throw
+    if (norm === ethers.ZeroAddress) throw new Error(`${k} がゼロアドレスです`);
+  }
   if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
   if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
   if (!Number.isInteger(delay) || delay < 300) throw new Error("REG_DELAY は 300 以上(運用値 7200 = 約 24 時間)");
+  if (!Number.isInteger(margin) || margin < 10 || margin > 7200) throw new Error("MARGIN は 10〜7200 の整数(運用値 300 = 約 1 時間)");
   const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
   if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
   const [deployer] = await ethers.getSigners();

codex
差分の中心は確認できました。ここから artifact ABI と追加 28 error を機械比較し、テストが埋め込んだ revert selector を `keccak256("ErrorName(...)")` から独立に照合します。あわせて `graceBad` が「一回の投函」ではなく実際のキュー排出量を保証しているかを追います。
exec
/bin/bash -lc "node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { keccak256, stringToHex, toFunctionSelector } from 'viem';
import { METAGOV_ABI } from './relayer-cf/src/abi.js';
const art=JSON.parse(fs.readFileSync('./artifacts/contracts/PNounsSnapVoter.sol/PNounsSnapVoter.json'));
const simp=x=>({name:x.name,inputs:x.inputs.map(i=>({name:i.name,type:i.type,internalType:i.internalType}))});
const aa=art.abi.filter(x=>x.type==='error').map(simp).sort((a,b)=>a.name.localeCompare(b.name));
const ma=METAGOV_ABI.filter(x=>x.type==='error').map(simp).sort((a,b)=>a.name.localeCompare(b.name));
console.log('artifact errors',aa.length,'METAGOV errors',ma.length);
console.log('artifact-only',JSON.stringify(aa.filter(a=>"'!ma.some(m=>JSON.stringify(m)===JSON.stringify(a))),null,2));
console.log('"'metagov-only',JSON.stringify(ma.filter(m=>"'!aa.some(a=>JSON.stringify(a)===JSON.stringify(m))),null,2));
for(const sig of ['"'RegistrationTooRecent()','StaleVote()']) console.log(sig,toFunctionSelector(sig),keccak256(stringToHex(sig)).slice(0,10));
NODE
nl -ba relayer-cf/src/abi.js | sed -n '1,55p'
nl -ba relayer-cf/src/worker.js | sed -n '1,330p'
nl -ba relayer-cf/src/worker.js | sed -n '440,590p'" in /mnt/data/pnouns-voter
 succeeded in 271ms:
artifact errors 28 METAGOV errors 28
artifact-only []
metagov-only []
RegistrationTooRecent() 0x33ab63b9 0x33ab63b9
StaleVote() 0x93ff56e3 0x93ff56e3
     1	// PNounsSnapVoter の必要最小限 ABI。
     2	// custom error の定義を必ず含めること: viem はこの ABI で revert データを復号するため、
     3	// 欠けていると revertErrorName() が null になり RegistrationTooRecent の transient 判定が死ぬ(第14回監査)。
     4	export const METAGOV_ABI = [
     5	 {"inputs": [], "name": "AlreadyExecuted", "type": "error"},
     6	 {"inputs": [], "name": "AlreadyRegistered", "type": "error"},
     7	 {"inputs": [], "name": "ECDSAInvalidSignature", "type": "error"},
     8	 {"inputs": [{"internalType": "uint256", "name": "length", "type": "uint256"}], "name": "ECDSAInvalidSignatureLength", "type": "error"},
     9	 {"inputs": [{"internalType": "bytes32", "name": "s", "type": "bytes32"}], "name": "ECDSAInvalidSignatureS", "type": "error"},
    10	 {"inputs": [{"internalType": "address", "name": "voter", "type": "address"}], "name": "ExcludedVoter", "type": "error"},
    11	 {"inputs": [], "name": "FromMismatch", "type": "error"},
    12	 {"inputs": [], "name": "InvalidChoice", "type": "error"},
    13	 {"inputs": [], "name": "InvalidContractSignature", "type": "error"},
    14	 {"inputs": [], "name": "InvalidFromAddress", "type": "error"},
    15	 {"inputs": [], "name": "InvalidSpace", "type": "error"},
    16	 {"inputs": [], "name": "MixedProposals", "type": "error"},
    17	 {"inputs": [], "name": "NoTokenIds", "type": "error"},
    18	 {"inputs": [], "name": "NoVotes", "type": "error"},
    19	 {"inputs": [], "name": "NotRegistered", "type": "error"},
    20	 {"inputs": [], "name": "NotRegistrar", "type": "error"},
    21	 {"inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"internalType": "address", "name": "owner", "type": "address"}], "name": "NotTokenOwner", "type": "error"},
    22	 {"inputs": [], "name": "NothingCounted", "type": "error"},
    23	 {"inputs": [{"internalType": "address", "name": "owner", "type": "address"}], "name": "OwnableInvalidOwner", "type": "error"},
    24	 {"inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "OwnableUnauthorizedAccount", "type": "error"},
    25	 {"inputs": [{"internalType": "uint8", "name": "state", "type": "uint8"}], "name": "ProposalNotVotable", "type": "error"},
    26	 {"inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error"},
    27	 {"inputs": [], "name": "RegistrationTooRecent", "type": "error"},
    28	 {"inputs": [], "name": "StaleVote", "type": "error"},
    29	 {"inputs": [], "name": "VotesAlreadyCounted", "type": "error"},
    30	 {"inputs": [], "name": "VotingClosed", "type": "error"},
    31	 {"inputs": [], "name": "VotingNotClosed", "type": "error"},
    32	 {"inputs": [], "name": "WrongSpace", "type": "error"},
    33	 {
    34	  "anonymous": false,
    35	  "inputs": [
    36	   {
    37	    "indexed": true,
    38	    "internalType": "uint256",
    39	    "name": "proposalId",
    40	    "type": "uint256"
    41	   },
    42	   {
    43	    "indexed": false,
    44	    "internalType": "uint8",
    45	    "name": "support",
    46	    "type": "uint8"
    47	   },
    48	   {
    49	    "indexed": false,
    50	    "internalType": "uint256[3]",
    51	    "name": "tokens",
    52	    "type": "uint256[3]"
    53	   },
    54	   {
    55	    "indexed": false,
     1	// cron ワーカー: 告知 / 投函 / execute / 残高警告。
     2	// 1 回の呼び出しでの外部呼び出し(RPC・KV)を最小化: multicall、バッチ一括 simulate、receipt は待たず次回 tick で確定(reconcile)。
     3	import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
     4	import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey } from "./snap.js";
     5	import { keccak256, stringToBytes } from "viem";
     6	import { makeStore } from "./store.js";
     7	
     8	async function notify(c, text) {
     9	  console.log("[notify]", text.replace(/\n/g, " ⏎ "));
    10	  if (!c.discordWebhook) return true; // webhook 未設定は「送るものがない」= 抑止フラグを立ててよい
    11	  try {
    12	    const r = await fetch(c.discordWebhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
    13	    if (!r.ok) { console.warn("discord notify http", r.status); return false; }
    14	    return true;
    15	  }
    16	  catch (e) { console.warn("discord notify failed", e.message); return false; }
    17	}
    18	const explorerTx = (c, h) => `${c.explorer}/tx/${h}`;
    19	
    20	// 第12回監査: 確定 tx の通知はトリガー(送信中レコード)が次 tick で消えるため、送信失敗すると
    21	// 再送の機会がない。失敗分を単一の KV キーに積み、次 tick の冒頭で再送する(list API は使わない)。
    22	async function queueNotify(c, store, text, id = null) {
    23	  if (await notify(c, text)) return true;
    24	  const k = `${store.prefix}pendingnotes`;
    25	  const arr = (await store.kvRaw.get(k, "json")) || [];
    26	  if (id && arr.some((n) => n.id === id)) return false; // 同一 tx の通知は積み直さない(第13回監査)
    27	  arr.push({ id, text, at: Date.now() });
    28	  await store.kvRaw.put(k, JSON.stringify(arr.slice(-20)), { expirationTtl: 86400 });
    29	  return false;
    30	}
    31	async function flushPendingNotes(c, store) {
    32	  const k = `${store.prefix}pendingnotes`;
    33	  let arr;
    34	  try { arr = await store.kvRaw.get(k, "json"); } catch { return; }
    35	  if (!Array.isArray(arr) || !arr.length) return;
    36	  const rest = []; const seen = new Set();
    37	  for (const n of arr) {
    38	    if (!n || typeof n.text !== "string" || Date.now() - n.at > 86400 * 1000) continue; // 1 日超は破棄
    39	    if (n.id) { if (seen.has(n.id)) continue; seen.add(n.id); }
    40	    if (!(await notify(c, n.text))) rest.push(n);
    41	  }
    42	  if (rest.length !== arr.length) {
    43	    if (rest.length) await store.kvRaw.put(k, JSON.stringify(rest), { expirationTtl: 86400 });
    44	    else await store.kvRaw.delete(k);
    45	  }
    46	}
    47	const WORDS = ["反対", "賛成", "棄権"];
    48	
    49	// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
    50	function revertErrorName(e) {
    51	  let x = e;
    52	  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
    53	  return null;
    54	}
    55	function isContractRevert(e) {
    56	  // 明確なコントラクト revert のみ「無効な署名」とみなす(ZeroData や RPC 異常は再試行)
    57	  let x = e;
    58	  for (let i = 0; i < 6 && x; i++) { if (x.name === "ContractFunctionRevertedError") return true; x = x.cause; }
    59	  return false;
    60	}
    61	
    62	async function announceNew(c, pc, store, p, block, snapInfo) {
    63	  const prev = await store.getAnnounced(p.id);
    64	  // 誤登録を取り消して正しい Snapshot 提案に張り替えた場合は、新しい URL で告知し直す
    65	  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
    66	  const mg = await metagovInfo(c, pc, p.id);
    67	  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
    68	  if (c.snapshotSpace) {
    69	    if (!snapInfo) return; // Snapshot 提案が対応付けられるまで告知しない
    70	    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
    71	    const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    72	    const lines = [
    73	      `📢 Nouns Prop ${p.id}「${snapInfo.title || ""}」の投票受付を開始しました。`,
    74	      `いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。`,
    75	      `締切: ${jst} ごろ (block ${mg.deadline})`,
    76	      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
    77	      `提案の内容: https://nouns.wtf/vote/${p.id}`,
    78	    ];
    79	    // 送信できたときだけ「告知済み」にする。先に記録すると、Discord 障害時に永久に未告知になる
    80	    if (await notify(c, lines.join("\n"))) await store.putAnnounced(p.id, `${new Date().toISOString()}|${snapInfo.snapId}`);
    81	    return;
    82	  }
    83	  const title = await proposalTitle(c, pc, store, p.id, p.creationBlock, p.state);
    84	  const deadlineBlock = mg.deadline || p.endBlock;
    85	  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
    86	  const jst = new Date(Date.now() + minutes * 60000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    87	  // 第12回監査: こちらの分岐も送信成功後にのみ「告知済み」を記録する
    88	  if (await notify(c, [
    89	    `📢 Nouns Prop ${p.id}「${title}」の投票受付を開始しました。`,
    90	    `pNouns 保有者は署名だけで投票できます(ガス不要)。`,
    91	    `締切: ${jst} ごろ (block ${deadlineBlock})`,
    92	    `投票ページ: ${c.publicUrl}`,
    93	    `提案の内容: https://nouns.wtf/vote/${p.id}`,
    94	  ].join("\n"))) await store.putAnnounced(p.id, new Date().toISOString());
    95	}
    96	
    97	// 票一覧。「前回 list 以降に受付があった(dirty > listedAt)」または「前回 list から forceAfterMs 経過」なら KV list(metadata のみ)してサマリーを更新。それ以外はサマリー(get 1 回)
    98	const FORCE_LIST_MS = 20 * 60 * 1000;
    99	async function loadVotes(store, proposalId, force) {
   100	  const sum = await store.getSummary(proposalId);
   101	  const dirty = await store.dirtyAt(proposalId);
   102	  const stale = Date.now() - (sum.listedAt || 0) > FORCE_LIST_MS;
   103	  if (!force && !stale && dirty <= (sum.listedAt || 0)) return { summaries: sum.votes };
   104	  const listedAt = Date.now(); // list 開始時刻。これより後に受け付けた署名は次回の再 list で拾う(競合しない)
   105	  const listed = await store.listVoteSummaries(proposalId);
   106	  const summaries = store.mergeSummaries(listed, sum.votes); // 状態は既存サマリーから引き継ぐ
   107	  await store.putSummary(proposalId, summaries, listedAt);
   108	  return { summaries, listedAt };
   109	}
   110	// 投函状態の更新はサマリー(メモリ)にだけ反映し、まとめて flushSummary で 1 回書く(票本文は不変)
   111	function setStatus(summaries, voter, patch) {
   112	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
   113	  if (i >= 0) summaries[i] = { ...summaries[i], ...patch };
   114	}
   115	async function flushSummary(store, proposalId, summaries) {
   116	  const sum = await store.getSummary(proposalId);
   117	  await store.putSummary(proposalId, summaries, sum.listedAt || 0);
   118	}
   119	
   120	// 送信済み(未確定)の投函を receipt で確定。取れないまま 10 分たてば on-chain 状態で判定して戻す
   121	async function reconcileSent(c, pc, store, proposalId, summaries) {
   122	  const sent = summaries.filter((v) => v.tx && v.tx !== "external" && v.txStatus === "sent");
   123	  if (!sent.length) return false;
   124	  const byTx = new Map();
   125	  for (const v of sent) { if (!byTx.has(v.tx)) byTx.set(v.tx, []); byTx.get(v.tx).push(v); }
   126	  let changed = false;
   127	  for (const [tx, vs] of byTx) {
   128	    let rc = null;
   129	    try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   130	    if (!rc && Date.now() - Date.parse(vs[0].sentAt || vs[0].receivedAt) < 10 * 60 * 1000) continue; // まだ待つ
   131	    // 確定 or 10 分未採掘: on-chain hasVoted をまとめて確認
   132	    const voted = await pc.multicall({ contracts: vs.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   133	    for (let i = 0; i < vs.length; i++) {
   134	      const v = vs[i];
   135	      if (rc && rc.status === "success") setStatus(summaries, v.voter, { txStatus: "success" });
   136	      else setStatus(summaries, v.voter, { tx: voted[i] ? "external" : undefined, txStatus: undefined, sentAt: undefined });
   137	    }
   138	    changed = true;
   139	    if (rc && rc.status === "success") {
   140	      if (await store.getFlag(`notified:${tx}`)) continue; // 通知の重複防止(KV の結果整合性対策)
   141	      const mg = await metagovInfo(c, pc, proposalId);
   142	      const sent = await queueNotify(c, store, [
   143	        `🗳️ Prop ${proposalId}: ${vs.length} 票を pNouns Voter に投函しました (gas ${rc.gasUsed})。`,
   144	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   145	        `tx: ${explorerTx(c, tx)}`,
   146	      ].join("\n"), tx);
   147	      if (sent) await store.setFlag(`notified:${tx}`, 86400);
   148	    } else {
   149	      console.warn(`[worker] prop ${proposalId} tx ${tx} ${rc ? "reverted" : "not mined in 10 min"} → re-evaluated ${vs.length} votes`);
   150	    }
   151	  }
   152	  if (changed) await flushSummary(store, proposalId, summaries);
   153	  return changed;
   154	}
   155	
   156	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   157	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   158	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   159	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   160	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   161	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   162	  const pending = await store.kvRaw.get(sentK, "json");
   163	  if (pending) {
   164	    let allMined = true, anySuccess = false, gasTotal = 0n;
   165	    for (const tx of pending.txs) {
   166	      let rc = null;
   167	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   168	      if (!rc) { allMined = false; continue; }
   169	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   170	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   171	    }
   172	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   173	    await store.kvRaw.delete(sentK);
   174	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   175	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   176	      const mg = await metagovInfo(c, pc, nounsId);
   177	      const sent = await queueNotify(c, store, [
   178	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   179	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   180	        `tx: ${explorerTx(c, pending.txs[0])}`,
   181	      ].join("\n"), pending.txs[0]);
   182	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   183	    }
   184	    return;
   185	  }
   186	
   187	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   188	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   189	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   190	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   191	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   192	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   193	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   194	  const deadLetters = new Set(deadArr);
   195	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   196	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   197	  const owners = await allOwners(c, pc);
   198	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   199	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   200	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   201	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   202	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   203	  const votedByToken = new Map();
   204	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   205	    const ids = checkTokenIds.slice(start, start + 200);
   206	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   207	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   208	  }
   209	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   210	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   211	  const batches = rush ? c.rushBatches : 1;
   212	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   213	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   214	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   215	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   216	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   217	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   218	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   219	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   220	
   221	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   222	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   223	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   224	  for (const { row, index } of send) {
   225	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   226	    if (!env) {
   227	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   228	      if (fails[row.ipfs] >= 20) {
   229	        deadArr.push(row.ipfs); deadChanged = true;
   230	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   231	      }
   232	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   233	    }
   234	    const m = env.data.message;
   235	    const tokenIds = [];
   236	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   237	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   238	    args.push(arg); cidOf.set(arg, row.ipfs);
   239	  }
   240	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   241	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   242	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   243	  if (!args.length) return;
   244	
   245	  const txs = []; let count = 0;
   246	  for (let b = 0; b < batches; b++) {
   247	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   248	    if (!chunk.length) break;
   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   250	    catch (e) {
   251	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   252	      // 第13回監査 High の二重防御: 猶予境界の競合など、票の欠陥ではない revert は数えずに次 tick へ
   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
   254	      const good = [];
   255	      for (const a2 of chunk.slice(0, 10)) {
   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   257	        catch (e2) {
   258	          const cid = cidOf.get(a2);
   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   260	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   261	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   262	          }
   263	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   264	        }
   265	      }
   266	      if (!good.length) continue;
   267	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   268	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   270	      catch (e3) {
   271	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   272	        good.length = 1;
   273	      }
   274	      chunk.length = 0; chunk.push(...good);
   275	    }
   276	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   277	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   278	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   279	    txs.push(hash); count += chunk.length;
   280	  }
   281	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   282	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   283	}
   284	
   285	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   286	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   287	  const { summaries } = await loadVotes(store, proposalId, rush);
   288	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   289	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   290	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
   291	  let touched = false;
   292	  for (let b = 0; b < batches; b++) {
   293	    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
   294	    if (!pendingSummaries.length) break;
   295	    // 本文(署名)は投函対象だけ get(≤ MAX_BATCH 件)
   296	    const pending = [];
   297	    for (const sm of pendingSummaries) { const v = await store.getVote(proposalId, sm.voter); if (v) pending.push({ ...v, voter: sm.voter }); }
   298	    // 既に他者が投函済み(on-chain)のものは external に(multicall 1 回)
   299	    const voted = await pc.multicall({ contracts: pending.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasVoted", args: [BigInt(proposalId), v.voter] })), allowFailure: false });
   300	    const cands = [];
   301	    for (let i = 0; i < pending.length; i++) {
   302	      if (voted[i]) { setStatus(summaries, pending[i].voter, { tx: "external" }); touched = true; continue; }
   303	      cands.push(pending[i]);
   304	    }
   305	    if (!cands.length) continue;
   306	    // バッチ全体を 1 回 simulate。失敗したら個別に切り分け(通常は起きない)
   307	    let good = cands;
   308	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [cands.map(toArg)], account: wc.account }); }
   309	    catch (e) {
   310	      if (!isContractRevert(e)) { console.warn(`[worker] batch simulate transient error prop ${proposalId}: ${(e.shortMessage || e.message || "").slice(0, 120)} (retry next tick)`); break; }
   311	      good = [];
   312	      for (const v of cands.slice(0, 10)) {
   313	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [[toArg(v)]], account: wc.account }); good.push(v); }
   314	        catch (e2) {
   315	          if (isContractRevert(e2)) { const reason = (e2.shortMessage || e2.message || "").slice(0, 200); setStatus(summaries, v.voter, { dropped: true, reason }); touched = true; console.warn(`[worker] drop vote prop ${proposalId} ${v.voter}: ${reason}`); }
   316	        }
   317	      }
   318	      if (!good.length) continue;
   319	    }
   320	    const args = good.map(toArg);
   321	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], account: wc.account });
   322	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castVotesBySig", args: [args], gas: (gas * 13n) / 10n });
   323	    console.log(`[worker] castVotesBySig prop ${proposalId} ${args.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   324	    const sentAt = new Date().toISOString();
   325	    for (const v of good) setStatus(summaries, v.voter, { tx: hash, txStatus: "sent", sentAt });
   326	    touched = true;
   327	    if (b + 1 < batches) { // 連続投函: 次バッチは nonce が進むまで少し待つ(viem は pending nonce を取得)
   328	      await new Promise((r) => setTimeout(r, 1500));
   329	      // 送信済みは summaries 上で "sent" になっているので次のフィルタで除外される。ただし同一 tick 内では "sent" 中でも続行する
   330	    }
   440	  const c = cfg(env);
   441	  const { publicClient: pc, walletClient: wc } = _clients(c);
   442	  const store = makeStore(env.STATE, storeNs(c));
   443	  try {
   444	    try { await flushPendingNotes(c, store); } catch (e) { console.warn("[worker] pending notes flush failed", e.message); }
   445	    if (Date.now() - lastBalanceCheck > 10 * 60 * 1000) { lastBalanceCheck = Date.now(); try { await checkBalance(c, pc, wc, store); } catch (e) { console.warn("[worker] balance check failed", e.message); } }
   446	    const { block, proposals } = await recentProposals(c, pc);
   447	    await reconcileRecent(c, pc, wc, store, proposals);
   448	    // B3: Snapshot 提案 ↔ Nouns 提案の対応付けを解決(SNAPSHOT_SPACE 設定時)
   449	    let snapByNouns = new Map();
   450	    let unresolvedIds = new Set();
   451	    let mappingsResolved = false;
   452	    if (c.snapshotSpace) {
   453	      // H03: コントラクトの spaceHash と設定の SNAPSHOT_SPACE が一致しなければ fail-closed
   454	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
   455	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
   456	        const [onchain, delay, ownerAddr, registrarAddr] = await pc.multicall({ contracts: [
   457	          { address: c.metagov, abi: METAGOV_ABI, functionName: "spaceHash" },
   458	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrationDelayBlocks" },
   459	          { address: c.metagov, abi: METAGOV_ABI, functionName: "owner" },
   460	          { address: c.metagov, abi: METAGOV_ABI, functionName: "registrar" },
   461	        ], allowFailure: false });
   462	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
   463	        // 「分離したつもり」で本番に入る事故を止める(テストネットは意図的に同一なので対象外)。
   464	        if (c.network === "mainnet") {
   465	          const relayerAddr = wc?.account?.address || null;
   466	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
   467	          if (new Set(same).size < same.length) { await notifyError(c, "config", new Error(`owner/registrar/relayer に同一アドレスが含まれます (owner=${ownerAddr} registrar=${registrarAddr} relayer=${relayerAddr})`)); return; }
   468	        }
   469	        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
   470	        // H02R: fail-closed。環境変数で下限を下げられないよう、コード上の絶対下限 300 を併用する
   471	        const floor = Math.max(300, c.minRegistrationDelay);
   472	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
   473	        spaceCheckedAt = Date.now();
   474	      }
   475	      try {
   476	        const active = proposals.filter((p) => p.state === 0 || p.state === 1).map((p) => p.id);
   477	        const { mappings, unresolved } = await resolveMappings(c, pc, active);
   478	        snapByNouns = new Map(mappings.map((m) => [Number(m.nounsId), m]));
   479	        unresolvedIds = new Set((unresolved || []).map(Number));
   480	        mappingsResolved = true;
   481	      }
   482	      catch (e) { await notifyError(c, "snapshot hub", e); }
   483	      // H-1(fail-closed): 対応表を検証できていない tick は何もしない。
   484	      // ここで続行すると snapInfo=null となり、照合(linkOk)も締切安全性(timeline)も
   485	      // 素通りしたまま maybeExecute() に入り、ハブ障害中の部分集計や "no votes" が
   486	      // 最終結果として確定してしまう。
   487	      if (!mappingsResolved) return;
   488	    }
   489	    for (const p of proposals) {
   490	      if (p.state !== 0 && p.state !== 1) continue;
   491	      try {
   492	        const snapInfo = snapByNouns.get(p.id) || null;
   493	        // H-1(第11回監査): ハブが正常応答でも「オンチェーンに対応表があるのに Snapshot 提案を
   494	        // 特定できない」ことがある(ハブが 0 件を返す/200 件より古い等)。これを安全と扱うと
   495	        // 締切後に maybeExecute() へ入り、部分集計や "no votes" が確定してしまう。提案単位で止める。
   496	        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
   497	          if (!(await store.getFlag(`unresolved:${p.id}`))) {
   498	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。`, `安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。`].join("\n"));
   499	            if (sent) await store.setFlag(`unresolved:${p.id}`, 86400 * 7);
   500	          }
   501	          continue;
   502	        }
   503	        const mg = await metagovInfo(c, pc, p.id);
   504	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
   505	        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
   506	        if (linkBad && !(await store.getFlag(`linkwarn:${p.id}`))) {
   507	          // L-1: 送信に成功したときだけ「通知済み」を立てる(失敗を 7 日間握りつぶさない)
   508	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
   509	          if (sent) await store.setFlag(`linkwarn:${p.id}`, 86400 * 7);
   510	        }
   511	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
   512	        let timelineBad = false;
   513	        if (c.snapshotSpace && snapInfo) {
   514	          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
   515	          if (timelineBad && !(await store.getFlag(`endwarn:${p.id}`))) {
   516	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
   517	            if (sent) await store.setFlag(`endwarn:${p.id}`, 86400 * 7);
   518	          }
   519	        }
   520	        // 第14回監査: 登録が遅すぎて「猶予明けが締切(排出時間込み)以降」になると、
   521	        // 票を一度も投函できないまま締切を迎え、"no votes" が確定してしまう。専用に検出する。
   522	        let graceBad = false;
   523	        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
   524	          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
   525	          graceBad = mg.eligibleAt + drainBlocks >= mg.deadline;
   526	          if (graceBad && !(await store.getFlag(`gracewarn:${p.id}`))) {
   527	            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
   528	            if (sent) await store.setFlag(`gracewarn:${p.id}`, 86400 * 7);
   529	          }
   530	        }
   531	        // M-1: 告知は照合・締切チェックを通ってから。不一致の Snapshot 提案 URL を
   532	        // 「投票してください」と先に流してしまうと、誤った提案へ投票を誘導したうえ
   533	        // 「告知済み」が記録されて正しい URL の再告知も止まる。
   534	        if (c.announce && !linkBad && !graceBad && !(timelineBad && c.network === "mainnet")) {
   535	          await announceNew(c, pc, store, p, block, snapInfo);
   536	        }
   537	        if (linkBad && c.network === "mainnet") continue;
   538	        if (timelineBad && c.network === "mainnet") continue;
   539	        if (graceBad && c.network === "mainnet") continue;
   540	        if (!wc) continue;
   541	        if (block < mg.deadline) {
   542	          if (c.snapshotSpace) {
   543	            // 第13回監査 High: 登録猶予中はコントラクトが RegistrationTooRecent で revert する。
   544	            // これを投函失敗として数えると、猶予中(24h)に届いた正常票が dead-letter 化されるため、
   545	            // 解禁ブロックまで投函自体を行わない(票は Snapshot に残り、解禁後に投函される)。
   546	            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
   547	              const rush = shouldRushSubmit(c, block, mg.deadline);
   548	              await submitFromSnapshot(c, pc, wc, store, snapInfo, p.id, rush);
   549	            }
   550	          }
   551	          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
   552	        } else if (!c.snapshotSpace || snapInfo) {
   553	          // Snapshot モードでは対応付けの取れた提案のみ確定させる。未登録の提案を
   554	          // "no votes" として確定してしまうと、登録が遅れただけの提案を切り捨てる。
   555	          await maybeExecute(c, pc, wc, store, p, block, mg);
   556	        }
   557	      } catch (e) {
   558	        await notifyError(c, `worker prop ${p.id}`, e);
   559	      }
   560	    }
   561	  } catch (e) {
   562	    await notifyError(c, "worker tick", e);
   563	  }
   564	}
   565	export { notify };

exec
/bin/bash -lc "node --input-type=module - <<'NODE'
import { ContractFunctionRevertedError } from 'viem';
import { METAGOV_ABI } from './relayer-cf/src/abi.js';
for (const [label,data] of [['reg','0x33ab63b9'],['stale-test','0x3d7ac07d'],['stale-real','0x93ff56e3']]) {
 const e=new ContractFunctionRevertedError({abi:METAGOV_ABI,data,functionName:'castSnapshotVotes'});
 console.log(label,{name:e.name,data:e.data,short:e.shortMessage,cause:e.cause?.name});
}
NODE
rg -n \"cronSec|submitBufferSec|rushBatches|maxBatch|snapshotTimelineSafe|shouldRushSubmit|submitCapacity|acceptDeadline|marginBlocks|MARGIN\" relayer-cf/src relayer-cf/test scripts contracts docs/RUNBOOK-MAINNET.md | sed -n '1,260p'
nl -ba relayer-cf/src/chain.js | sed -n '1,180p'
nl -ba contracts/PNounsSnapVoter.sol | sed -n '1,280p'" in /mnt/data/pnouns-voter
 succeeded in 262ms:
reg {
  name: 'ContractFunctionRevertedError',
  data: {
    abiItem: { inputs: [], name: 'RegistrationTooRecent', type: 'error' },
    args: undefined,
    errorName: 'RegistrationTooRecent'
  },
  short: 'The contract function "castSnapshotVotes" reverted.',
  cause: undefined
}
stale-test {
  name: 'ContractFunctionRevertedError',
  data: undefined,
  short: 'The contract function "castSnapshotVotes" reverted with the following signature:\n' +
    '0x3d7ac07d',
  cause: 'AbiErrorSignatureNotFoundError'
}
stale-real {
  name: 'ContractFunctionRevertedError',
  data: {
    abiItem: { inputs: [], name: 'StaleVote', type: 'error' },
    args: undefined,
    errorName: 'StaleVote'
  },
  short: 'The contract function "castSnapshotVotes" reverted.',
  cause: undefined
}
docs/RUNBOOK-MAINNET.md:27:REG_DELAY=7200 MARGIN=300 \
docs/RUNBOOK-MAINNET.md:47:     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=300"
relayer-cf/src/worker.js:3:import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners } from "./chain.js";
relayer-cf/src/worker.js:211:  const batches = rush ? c.rushBatches : 1;
relayer-cf/src/worker.js:216:  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
relayer-cf/src/worker.js:247:    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
relayer-cf/src/worker.js:286:  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
relayer-cf/src/worker.js:290:  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
relayer-cf/src/worker.js:293:    const pendingSummaries = summaries.filter((v) => !v.tx && !v.dropped && (rush || Date.now() - Date.parse(v.receivedAt) >= c.minPendingAgeSec * 1000)).slice(0, c.maxBatch);
relayer-cf/src/worker.js:514:          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
relayer-cf/src/worker.js:524:          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/worker.js:547:              const rush = shouldRushSubmit(c, block, mg.deadline);
relayer-cf/test/accept-deadline.test.mjs:4:import { acceptMarginBlocks, acceptDeadline, shouldRushSubmit, snapshotTimelineSafe, submitCapacity } from "../src/chain.js";
relayer-cf/test/accept-deadline.test.mjs:6:const mainnet = { minPendingAgeSec: 120, cronSec: 120, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
relayer-cf/test/accept-deadline.test.mjs:7:const sepolia = { minPendingAgeSec: 20, cronSec: 60, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
relayer-cf/test/accept-deadline.test.mjs:11:  assert.equal(acceptDeadline(mainnet, 1_000_000), 999_970);
relayer-cf/test/accept-deadline.test.mjs:13:test("受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード", () => {
relayer-cf/test/accept-deadline.test.mjs:15:  assert.equal(shouldRushSubmit(mainnet, 999_969, dl), false);
relayer-cf/test/accept-deadline.test.mjs:16:  assert.equal(shouldRushSubmit(mainnet, 999_970, dl), true);
relayer-cf/test/accept-deadline.test.mjs:21:    assert.ok(marginSec >= c.minPendingAgeSec + c.cronSec, `${marginSec}s >= ${c.minPendingAgeSec + c.cronSec}s`);
relayer-cf/test/accept-deadline.test.mjs:26:  assert.ok(acceptDeadline(sepolia, onchain) > start);
relayer-cf/test/accept-deadline.test.mjs:29:test("M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件", () => {
relayer-cf/test/accept-deadline.test.mjs:32:  assert.equal(submitCapacity(mainnet, dl - 30, dl), 40);
relayer-cf/test/accept-deadline.test.mjs:36:  assert.equal(submitCapacity(mainnet, blk, dl), 20);
relayer-cf/test/accept-deadline.test.mjs:38:  assert.equal(submitCapacity(mainnet, dl - 15, dl), 0); // 180s 前: 余裕を引くと 1 tick に満たない → 受付不可
relayer-cf/test/accept-deadline.test.mjs:40:  assert.equal(submitCapacity(mainnet, dl - 5, dl), 0);
relayer-cf/test/accept-deadline.test.mjs:44:  assert.ok(submitCapacity(mainnet, dl - 7200, dl) > 2100);
relayer-cf/test/accept-deadline.test.mjs:50:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 241, now), true);
relayer-cf/test/accept-deadline.test.mjs:51:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 240, now), true, "境界は許可");
relayer-cf/test/accept-deadline.test.mjs:52:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 239, now), false);
relayer-cf/test/accept-deadline.test.mjs:53:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, 0, now), false, "終了時刻不明は fail-closed");
scripts/sepolia/_rehearse-keys.js:45:  await (await vAsNewOwner.setMarginBlocks(await v.marginBlocks())).wait(); // onlyOwner 操作が新オーナーで通ることを確認
relayer-cf/src/chain.js:48:    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
relayer-cf/src/chain.js:53:    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
relayer-cf/src/chain.js:55:    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
relayer-cf/src/chain.js:56:    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
relayer-cf/src/chain.js:64:  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/chain.js:66:export function acceptDeadline(c, onchainDeadline) {
relayer-cf/src/chain.js:70:export function shouldRushSubmit(c, block, onchainDeadline) {
relayer-cf/src/chain.js:71:  return Number(block) >= acceptDeadline(c, onchainDeadline);
relayer-cf/src/chain.js:75:export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
relayer-cf/src/chain.js:78:  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
relayer-cf/src/chain.js:81://   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
relayer-cf/src/chain.js:82:export function submitCapacity(c, block, onchainDeadline) {
relayer-cf/src/chain.js:83:  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
relayer-cf/src/chain.js:84:  const ticks = Math.floor(secsLeft / c.cronSec);
relayer-cf/src/chain.js:85:  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
scripts/sepolia/12-deploy-snapvoter.js:9:  const c = await F.deploy(dep.pnouns, SEPOLIA.NOUNS_DAO, deployer.address, process.env.REGISTRAR || deployer.address, process.env.SPACE || "earl-grey.eth", [SEPOLIA.PNOUNS_TREASURY], Number(process.env.MARGIN || 5), delay);
relayer-cf/src/index.js:4:import { cfg, clients, domain, VOTE_TYPES, tokensOf, allOwners, recentProposals, proposalTitle, metagovInfo, getAddress, METAGOV_ABI, DAO_ABI, storeNs, acceptDeadline, submitCapacity } from "./chain.js";
relayer-cf/src/index.js:48:    const acceptUntil = mg.deadline ? acceptDeadline(c, mg.deadline) : 0;
relayer-cf/src/index.js:49:    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
relayer-cf/src/index.js:137:  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
relayer-cf/src/index.js:141:  const capacity = submitCapacity(c, block, deadline);
relayer-cf/src/index.js:164:    const cand = out.pending.slice(0, c.maxBatch);
relayer-cf/src/index.js:180:  if (ctx.req.query("full")) { out.pendingFull = []; for (const s of out.pending.slice(0, c.maxBatch)) { const v = await store.getVote(id, s.voter); if (v) out.pendingFull.push({ voter: s.voter, ...v }); } }
scripts/sepolia/03-deploy-voter.js:1:// pNouns Voter を Sepolia にデプロイ(Nouns 公式 Sepolia、pNouns 複製、margin=MARGIN(既定 5 ブロック: 投票期間 25 ブロックのため))
scripts/sepolia/03-deploy-voter.js:8:  const margin = BigInt(process.env.MARGIN || 5);
scripts/sepolia/03-deploy-voter.js:15:  dep.marginBlocks = Number(margin);
contracts/PNounsVoter.sol:26: *  - 締切(Nouns の endBlock − marginBlocks)を過ぎたら誰でも execute でき、
contracts/PNounsVoter.sol:63:    uint256 public marginBlocks;
contracts/PNounsVoter.sol:89:        uint48 deadline; // 初回投票時に Nouns の endBlock - marginBlocks をキャッシュ
contracts/PNounsVoter.sol:103:    event MarginBlocksSet(uint256 marginBlocks);
contracts/PNounsVoter.sol:128:        uint256 marginBlocks_
contracts/PNounsVoter.sol:132:        marginBlocks = marginBlocks_;
contracts/PNounsVoter.sol:145:    function setMarginBlocks(uint256 marginBlocks_) external onlyOwner {
contracts/PNounsVoter.sol:146:        marginBlocks = marginBlocks_;
contracts/PNounsVoter.sol:147:        emit MarginBlocksSet(marginBlocks_);
contracts/PNounsVoter.sol:217:        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
relayer-cf/src/abi.js:373:  "name": "marginBlocks",
contracts/PNounsSnapVoter.sol:34: *  - 締切 = Nouns の endBlock − marginBlocks。締切後は誰でも execute。票ゼロは投票しない(NoVotes)。
contracts/PNounsSnapVoter.sol:63:    uint256 public marginBlocks;
contracts/PNounsSnapVoter.sol:121:    event MarginBlocksSet(uint256 marginBlocks);
contracts/PNounsSnapVoter.sol:153:        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
contracts/PNounsSnapVoter.sol:161:        marginBlocks = marginBlocks_;
contracts/PNounsSnapVoter.sol:168:    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
contracts/PNounsSnapVoter.sol:227:        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
scripts/check-deploy.mjs:9:// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED / EXPECT_MARGIN が必須。
scripts/check-deploy.mjs:36:  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
scripts/check-deploy.mjs:59:    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
scripts/check-deploy.mjs:66:  if (requireEnv("EXPECT_MARGIN", "締切マージン")) if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
scripts/mainnet/deploy-snapvoter.js:2:// 使い方(アドレスは必須・明示。REG_DELAY/MARGIN には運用既定値 7200/300 がある):
scripts/mainnet/deploy-snapvoter.js:4://     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
scripts/mainnet/deploy-snapvoter.js:17:  const margin = Number(process.env.MARGIN || 300);
scripts/mainnet/deploy-snapvoter.js:27:  if (!Number.isInteger(margin) || margin < 10 || margin > 7200) throw new Error("MARGIN は 10〜7200 の整数(運用値 300 = 約 1 時間)");
scripts/mainnet/deploy-snapvoter.js:44:    ["marginBlocks", Number(await c.marginBlocks()), margin],
     1	// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
     2	import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
     3	import { privateKeyToAccount } from "viem/accounts";
     4	import { mainnet, sepolia } from "viem/chains";
     5	import { METAGOV_ABI } from "./abi.js";
     6	
     7	export const DAO_ABI = parseAbi([
     8	  "function proposalCount() view returns (uint256)",
     9	  "function state(uint256) view returns (uint8)",
    10	  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
    11	  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
    12	  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
    13	  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
    14	  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
    15	  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
    16	]);
    17	export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
    18	export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
    19	export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
    20	export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };
    21	
    22	export function cfg(env) {
    23	  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
    24	  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
    25	  if (env.NETWORK === "mainnet") {
    26	    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
    27	    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
    28	    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
    29	    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
    30	    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
    31	  }
    32	  return {
    33	    network: env.NETWORK || "sepolia",
    34	    chain,
    35	    chainId: chain.id,
    36	    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
    37	    metagov: getAddress(env.VOTER),
    38	    pnouns: getAddress(env.PNOUNS),
    39	    nounsDAO: getAddress(env.NOUNS_DAO),
    40	    nounsToken: getAddress(env.NOUNS_TOKEN),
    41	    explorer: env.EXPLORER,
    42	    blockscout: env.BLOCKSCOUT || null,
    43	    publicUrl: env.PUBLIC_URL || "",
    44	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
    45	    scanProposals: Number(env.SCAN_PROPOSALS || 30),
    46	    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
    47	    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
    48	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
    49	    announce: env.ANNOUNCE !== "0",
    50	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
    51	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
    52	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
    55	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
    56	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
    57	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
    58	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
    60	  };
    61	}
    62	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
    63	export function acceptMarginBlocks(c) {
    64	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
    65	}
    66	export function acceptDeadline(c, onchainDeadline) {
    67	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
    68	}
    69	// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
    70	export function shouldRushSubmit(c, block, onchainDeadline) {
    71	  return Number(block) >= acceptDeadline(c, onchainDeadline);
    72	}
    73	// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
    75	export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
    76	  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
    77	  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
    78	  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
    79	}
    80	// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
    81	//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
    82	export function submitCapacity(c, block, onchainDeadline) {
    83	  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
    84	  const ticks = Math.floor(secsLeft / c.cronSec);
    85	  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
    86	}
    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
    88	export function clients(c) {
    89	  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
    90	  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
    91	  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
    92	  return { publicClient, walletClient, account };
    93	}
    94	export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });
    95	
    96	// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
    97	let ownersCache = { at: 0, owners: [] };
    98	export async function allOwners(c, pc) {
    99	  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
   100	  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
   101	  const owners = [];
   102	  const CH = 500;
   103	  for (let start = 1; start <= total; start += CH) {
   104	    const ids = [];
   105	    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
   106	    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
   107	    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
   108	  }
   109	  ownersCache = { at: Date.now(), owners };
   110	  return owners;
   111	}
   112	export async function tokensOf(c, pc, address) {
   113	  const owners = await allOwners(c, pc);
   114	  const a = address.toLowerCase();
   115	  const out = [];
   116	  for (let id = 1; id < owners.length; id++) if (owners[id] === a) out.push(id);
   117	  return out;
   118	}
   119	export async function recentProposals(c, pc) {
   120	  const [count, block] = await Promise.all([
   121	    pc.readContract({ address: c.nounsDAO, abi: DAO_ABI, functionName: "proposalCount" }),
   122	    pc.getBlockNumber(),
   123	  ]);
   124	  const ids = [];
   125	  for (let id = Number(count); id > Math.max(0, Number(count) - c.scanProposals); id--) ids.push(id);
   126	  const res = await pc.multicall({
   127	    contracts: ids.flatMap((id) => [
   128	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "proposals", args: [BigInt(id)] },
   129	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "state", args: [BigInt(id)] },
   130	    ]),
   131	    allowFailure: false,
   132	  });
   133	  const out = [];
   134	  ids.forEach((id, i) => {
   135	    const pr = res[i * 2]; const st = Number(res[i * 2 + 1]);
   136	    // proposals() は名前付きタプルではなく配列で返る
   137	    const [, proposer, , , , startBlock, endBlock, forVotes, againstVotes, abstainVotes, , , , , creationBlock] = pr;
   138	    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
   139	    out.push({ id, state: st, stateName: STATE_NAMES[st] || String(st), proposer, startBlock: Number(startBlock), endBlock: Number(endBlock), creationBlock: Number(creationBlock), forVotes: String(forVotes), againstVotes: String(againstVotes), abstainVotes: String(abstainVotes) });
   140	  });
   141	  return { block: Number(block), proposals: out };
   142	}
   143	// H-03/H-03R: 提案本文は Updatable 期間中に更新されうる。作成イベント + 更新イベントから最新タイトルを組み立てる。
   144	//  - Pending/Active(本文凍結後)に初めて取得したときだけ KV(title:{id}:final)に保存(書込み 1 回/提案)
   145	//  - Updatable 中はメモリ内キャッシュ 30 秒のみ(KV に書かない)
   146	const titleMem = new Map();
   147	export async function proposalTitle(c, pc, store, id, creationBlock, state) {
   148	  const frozen = state === 0 || state === 1;
   149	  const kv = store ? store.kvRaw : null;
   150	  if (frozen && kv) { const f = await kv.get(`title:${id}:final`); if (f) return f; }
   151	  const m = titleMem.get(id);
   152	  if (!frozen && m && Date.now() - m.at < 30000) return m.title;
   153	  let title = `Proposal ${id}`;
   154	  try {
   155	    const events = DAO_ABI.filter((x) => x.type === "event");
   156	    const latest = await pc.getBlockNumber();
   157	    const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
   158	    const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
   159	    let desc = "";
   160	    for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === id) desc = String(l.args.description || "");
   161	    for (const l of updates) if (Number(l.args.id) === id) desc = String(l.args.description || desc);
   162	    const first = desc.split("\n").find((x) => x.trim()) || "";
   163	    title = first.replace(/^#+\s*/, "").trim() || title;
   164	    if (updates.length) title += " (更新あり)";
   165	  } catch (e) { /* タイトルは必須でない */ }
   166	  if (frozen && kv) await kv.put(`title:${id}:final`, title, { expirationTtl: 86400 * 30 });
   167	  else titleMem.set(id, { at: Date.now(), title });
   168	  return title;
   169	}
   170	// pNouns 所有者キャッシュはメモリ(isolate 内)+ 60 秒。KV には書かない
   171	export async function metagovInfo(c, pc, proposalId) {
   172	  const pid = BigInt(proposalId);
   173	  const t0 = await pc.multicall({
   174	    contracts: [
   175	      { address: c.metagov, abi: METAGOV_ABI, functionName: "tally", args: [pid] },
   176	      { address: c.metagov, abi: METAGOV_ABI, functionName: "voteDeadline", args: [pid] },
   177	      { address: c.nounsToken, abi: NOUNS_ABI, functionName: "getCurrentVotes", args: [c.metagov] },
   178	      { address: c.metagov, abi: METAGOV_ABI, functionName: "currentResult", args: [pid] },
   179	      { address: c.nounsDAO, abi: DAO_ABI, functionName: "getReceipt", args: [pid, c.metagov] },
   180	      { address: c.metagov, abi: METAGOV_ABI, functionName: "liveMode" },
     1	// SPDX-License-Identifier: MIT
     2	pragma solidity ^0.8.24;
     3	
     4	import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
     5	import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
     6	import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
     7	import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
     8	import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
     9	
    10	interface IERC1271 {
    11	    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4);
    12	}
    13	
    14	interface INounsDAO {
    15	    function castRefundableVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external;
    16	    function state(uint256 proposalId) external view returns (uint8);
    17	    function proposals(uint256 proposalId) external view returns (bytes memory);
    18	}
    19	
    20	/**
    21	 * @title pNouns Snap Voter
    22	 * @notice pNouns 保有者が **Snapshot(pnounsdao.eth) で投じた投票署名そのもの** をオンチェーンで検証・集計し、
    23	 *         締切後に Nouns DAO へ castRefundableVoteWithReason する。メンバーの投票体験は今の Snapshot のまま。
    24	 *
    25	 *  検証する署名 = Snapshot(snapshot-v2)の EIP-712 Vote メッセージ:
    26	 *    domain: {name:"snapshot", version:"0.1.4"}(chainId / verifyingContract なし)
    27	 *    Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)
    28	 *    choice: 1=賛成(FOR) / 2=反対(AGAINST) / 3=棄権(ABSTAIN) — pNouns の提案は必ずこの並びで作成する。
    29	 *
    30	 *  - registrar が「Snapshot 提案(文字列 id) ↔ Nouns 提案 id」の対応を事前登録する(各 1 回のみ・公開情報なので誰でも検証可)。
    31	 *  - 重み = 提出時点の pNouns 保有 tokenId 数(tokenIds はリレイヤーが添える。所有確認はコントラクトが行うため水増し不可)。
    32	 *  - Snapshot は投票のやり直しができるため、同一投票者は timestamp がより新しい署名で上書きできる(最新が有効)。
    33	 *  - tokenId 単位のビットマップで、同じ NFT が(移転を挟んでも)二重に数えられることを防ぐ。
    34	 *  - 締切 = Nouns の endBlock − marginBlocks。締切後は誰でも execute。票ゼロは投票しない(NoVotes)。
    35	 *  - ガス払い戻し: 預け金から実行者(tx.origin)へ返金(上限つき・best effort)。CEI + nonReentrant。
    36	 *  - liveMode=false はシャドー運用(結果イベントのみ、executed は立てない)。
    37	 */
    38	contract PNounsSnapVoter is Ownable, ReentrancyGuard {
    39	    using Strings for uint256;
    40	
    41	    uint8 public constant AGAINST = 0;
    42	    uint8 public constant FOR = 1;
    43	    uint8 public constant ABSTAIN = 2;
    44	    uint8 internal constant STATE_PENDING = 0;
    45	    uint8 internal constant STATE_ACTIVE = 1;
    46	
    47	    // Snapshot の EIP-712(フィールドは name と version のみ)
    48	    bytes32 internal constant SNAP_DOMAIN_SEPARATOR = keccak256(
    49	        abi.encode(keccak256("EIP712Domain(string name,string version)"), keccak256(bytes("snapshot")), keccak256(bytes("0.1.4")))
    50	    );
    51	    bytes32 internal constant SNAP_VOTE_TYPEHASH = keccak256(
    52	        "Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)"
    53	    );
    54	
    55	    IERC721 public immutable pnouns;
    56	    INounsDAO public immutable nounsDAO;
    57	    /// @notice 対象の Snapshot スペース(例: "pnounsdao.eth")のハッシュ
    58	    bytes32 public immutable spaceHash;
    59	    /// @notice 対象の Snapshot スペース名(Nouns DAO に残す理由文に使う)
    60	    string public space;
    61	
    62	    mapping(address => bool) public excluded;
    63	    uint256 public marginBlocks;
    64	    bool public liveMode;
    65	    /// @notice Snapshot 提案 ↔ Nouns 提案の対応付けを登録できるアドレス
    66	    address public registrar;
    67	
    68	    bool public refundEnabled = true;
    69	    uint256 public refundCapPerProposal = 0.02 ether;
    70	    mapping(uint256 => uint256) public refundedForProposal;
    71	    uint256 public constant MAX_REFUND_PRIORITY_FEE = 2 gwei;
    72	    uint256 public constant MAX_REFUND_BASE_FEE = 200 gwei;
    73	    uint256 public constant REFUND_BASE_GAS = 55_000;
    74	    uint256 public constant MAX_REFUND_GAS_BASE = 120_000;
    75	    uint256 public constant MAX_REFUND_GAS_PER_VOTE = 90_000;
    76	
    77	    struct Tally {
    78	        uint32 againstTokens; uint32 forTokens; uint32 abstainTokens;
    79	        uint32 againstVoters; uint32 forVoters; uint32 abstainVoters;
    80	        uint48 deadline; bool executed; uint8 result;
    81	    }
    82	    mapping(uint256 => Tally) internal _tallies;
    83	    mapping(uint256 => mapping(uint256 => uint256)) internal _votedBitmap;
    84	
    85	    struct VoterRec { bool exists; uint8 support; uint32 counted; uint64 timestamp; bytes32 digest; }
    86	    mapping(uint256 => mapping(address => VoterRec)) public voterRec;
    87	
    88	    /// 登録からこのブロック数が経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予)
    89	    uint256 public registrationDelayBlocks;
    90	    /// Nouns 提案 id → 登録ブロック
    91	    mapping(uint256 => uint256) public registeredAtBlock;
    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
    93	    mapping(uint256 => uint256) public eligibleAtBlock;
    94	    /// keccak(Snapshot 提案 id 文字列) → Nouns 提案 id
    95	    mapping(bytes32 => uint256) public snapToNouns;
    96	    /// Nouns 提案 id → keccak(Snapshot 提案 id 文字列)
    97	    mapping(uint256 => bytes32) public nounsToSnap;
    98	    /// @notice Snapshot 署名が受理された件数(やり直しで新規 token が 0 でも増える。取消可否の判定に使う)
    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
   100	    /// @notice Snapshot 由来で新たに計上された token 数(統計用途)
   101	    mapping(uint256 => uint32) public snapshotVotesCounted;
   102	
   103	    struct SnapVote {
   104	        string from;      // 署名メッセージの from(チェックサム表記のアドレス文字列)
   105	        uint64 timestamp;
   106	        string proposal;  // Snapshot 提案 id(文字列)
   107	        uint32 choice;    // 1=賛成 2=反対 3=棄権
   108	        string reason;
   109	        string app;
   110	        string metadata;
   111	        bytes signature;
   112	        uint256[] tokenIds; // リレイヤーが添える投票者の保有 tokenId(所有はコントラクトが検証)
   113	    }
   114	
   115	    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
   116	    event ProposalUnregistered(uint256 indexed nounsProposalId, bytes32 snapHash);
   117	    event RegistrationDelaySet(uint256 blocks_);
   118	    event SnapVoteCounted(uint256 indexed nounsProposalId, address indexed voter, uint8 support, uint32 counted, uint64 timestamp, bool revote);
   119	    event Executed(uint256 indexed proposalId, uint8 support, uint256[3] tokens, uint256[3] voters, bool live);
   120	    event ExcludedSet(address indexed account, bool isExcluded);
   121	    event MarginBlocksSet(uint256 marginBlocks);
   122	    event LiveModeSet(bool live);
   123	    event RegistrarSet(address registrar);
   124	    event RefundableVote(address indexed refundee, uint256 refundAmount, bool refundSent);
   125	    event RefundEnabledSet(bool enabled);
   126	    event RefundCapPerProposalSet(uint256 cap);
   127	
   128	    error NotRegistrar();
   129	    error AlreadyRegistered();
   130	    error NotRegistered();
   131	    error InvalidChoice();
   132	    error WrongSpace();
   133	    error FromMismatch();
   134	    error NoTokenIds();
   135	    error ProposalNotVotable(uint8 state);
   136	    error VotingClosed();
   137	    error VotingNotClosed();
   138	    error StaleVote();
   139	    error RegistrationTooRecent();
   140	    error InvalidSpace();
   141	    error VotesAlreadyCounted();
   142	    error InvalidFromAddress();
   143	    error InvalidContractSignature();
   144	    error NotTokenOwner(uint256 tokenId, address owner);
   145	    error ExcludedVoter(address voter);
   146	    error NothingCounted();
   147	    error AlreadyExecuted();
   148	    error NoVotes();
   149	    error MixedProposals();
   150	
   151	    constructor(
   152	        address pnouns_, address nounsDAO_, address owner_, address registrar_,
   153	        string memory space_, address[] memory excluded_, uint256 marginBlocks_, uint256 registrationDelayBlocks_
   154	    ) Ownable(owner_) {
   155	        pnouns = IERC721(pnouns_);
   156	        nounsDAO = INounsDAO(nounsDAO_);
   157	        if (bytes(space_).length == 0 || bytes(space_).length > 64) revert InvalidSpace();
   158	        spaceHash = keccak256(bytes(space_));
   159	        space = space_;
   160	        registrar = registrar_;
   161	        marginBlocks = marginBlocks_;
   162	        registrationDelayBlocks = registrationDelayBlocks_;
   163	        for (uint256 i = 0; i < excluded_.length; i++) { excluded[excluded_[i]] = true; emit ExcludedSet(excluded_[i], true); }
   164	    }
   165	
   166	    // ---- 設定 ----
   167	    function setExcluded(address a, bool v) external onlyOwner { excluded[a] = v; emit ExcludedSet(a, v); }
   168	    function setMarginBlocks(uint256 v) external onlyOwner { marginBlocks = v; emit MarginBlocksSet(v); }
   169	    function setLiveMode(bool v) external onlyOwner { liveMode = v; emit LiveModeSet(v); }
   170	    function setRegistrar(address a) external onlyOwner { registrar = a; emit RegistrarSet(a); }
   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
   173	    function setRefundEnabled(bool v) external onlyOwner { refundEnabled = v; emit RefundEnabledSet(v); }
   174	    function setRefundCapPerProposal(uint256 v) external onlyOwner { refundCapPerProposal = v; emit RefundCapPerProposalSet(v); }
   175	    function sweep(address payable to) external onlyOwner { (bool ok, ) = to.call{value: address(this).balance}(""); require(ok, "sweep failed"); }
   176	    receive() external payable {}
   177	
   178	    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
   179	    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
   180	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
   181	        bytes32 h = keccak256(bytes(snapshotProposal));
   182	        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
   183	        if (nounsProposalId == 0) revert NotRegistered();
   184	        snapToNouns[h] = nounsProposalId;
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
   206	    // ---- 参照 ----
   207	    function tally(uint256 proposalId) external view returns (uint256[3] memory tokens, uint256[3] memory voters, bool executed, uint8 result) {
   208	        Tally storage t = _tallies[proposalId];
   209	        (tokens, voters) = _arrays(t);
   210	        return (tokens, voters, t.executed, t.result);
   211	    }
   212	    function hasTokenVoted(uint256 proposalId, uint256 tokenId) public view returns (bool) {
   213	        return (_votedBitmap[proposalId][tokenId >> 8] >> (tokenId & 0xff)) & 1 == 1;
   214	    }
   215	    function hasVoted(uint256 proposalId, address voter) external view returns (bool) { return voterRec[proposalId][voter].exists; }
   216	
   217	    function nounsEndBlock(uint256 proposalId) public view returns (uint256) {
   218	        (bool ok, bytes memory data) = address(nounsDAO).staticcall(abi.encodeWithSelector(INounsDAO.proposals.selector, proposalId));
   219	        require(ok && data.length == 15 * 32, "proposals() layout mismatch");
   220	        uint256 id; uint256 startBlock; uint256 endBlock;
   221	        assembly { id := mload(add(data, 0x20)) startBlock := mload(add(data, 0xc0)) endBlock := mload(add(data, 0xe0)) }
   222	        require(id == proposalId && endBlock > startBlock, "proposals() sanity check failed");
   223	        return endBlock;
   224	    }
   225	    function voteDeadline(uint256 proposalId) public view returns (uint256) {
   226	        uint256 endBlock = nounsEndBlock(proposalId);
   227	        return endBlock > marginBlocks ? endBlock - marginBlocks : 0;
   228	    }
   229	    function currentResult(uint256 proposalId) public view returns (uint8) {
   230	        (uint256[3] memory tokens, uint256[3] memory voters) = _arrays(_tallies[proposalId]);
   231	        return _decide(tokens, voters);
   232	    }
   233	
   234	    /// @notice Snapshot の Vote メッセージの EIP-712 ダイジェスト
   235	    function snapVoteDigest(SnapVote calldata v) public view returns (bytes32) {
   236	        bytes32 structHash = keccak256(abi.encode(
   237	            SNAP_VOTE_TYPEHASH,
   238	            keccak256(bytes(v.from)),
   239	            spaceHash, // space は本コントラクトのスペースに固定(異なる space の署名は復元アドレスが一致しない)
   240	            v.timestamp,
   241	            keccak256(bytes(v.proposal)),
   242	            v.choice,
   243	            keccak256(bytes(v.reason)),
   244	            keccak256(bytes(v.app)),
   245	            keccak256(bytes(v.metadata))
   246	        ));
   247	        return keccak256(abi.encodePacked("\x19\x01", SNAP_DOMAIN_SEPARATOR, structHash));
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

exec
/bin/bash -lc "nl -ba scripts/check-deploy.mjs | sed -n '1,180p'
nl -ba scripts/mainnet/deploy-snapvoter.js | sed -n '1,120p'
nl -ba docs/RUNBOOK-MAINNET.md | sed -n '1,220p'
bash -lc 'ENV=\"NETWORK=mainnet EXPECT_OWNER=0x1111111111111111111111111111111111111111 EXPECT_MARGIN=300\"; env "'$ENV node -e '"'\\''console.log(process.env.NETWORK,process.env.EXPECT_OWNER,process.env.EXPECT_MARGIN)'\\'''" in /mnt/data/pnouns-voter
 succeeded in 0ms:
     1	// デプロイ後の機械照合(RUNBOOK-MAINNET 用)。段階(--stage)ごとに期待状態を fail-closed で照合する。
     2	//
     3	//   --stage deployed  … コントラクトの実値のみ(Worker・入金・委任はまだ)
     4	//   --stage worker    … + Worker /api/config の一致・relayer の分離
     5	//   --stage funded    … + プール・relayer の残高
     6	//   --stage delegated … + Nouns 委任(delegates(EXPECT_DELEGATOR) == voter)
     7	//   --stage live      … + liveMode=true (既定。live 未満の段階では liveMode=false を要求[mainnet])
     8	//
     9	// mainnet では EXPECT_OWNER / EXPECT_REGISTRAR / EXPECT_EXCLUDED / EXPECT_MARGIN が必須。
    10	// worker 段階以降は EXPECT_RELAYER と EXPECT_BOT(4 者分離)、delegated 以降は EXPECT_DELEGATOR も必須。
    11	// EXPECT_DELAY は既定 7200。
    12	//
    13	//   NETWORK=sepolia node scripts/check-deploy.mjs
    14	//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_EXCLUDED=0x… node scripts/check-deploy.mjs --stage deployed
    15	import { ethers } from "ethers";
    16	import fs from "node:fs";
    17	import path from "node:path";
    18	
    19	const ROOT = path.resolve(import.meta.dirname, "..");
    20	for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    21	  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    22	}
    23	const argStage = (() => { const i = process.argv.indexOf("--stage"); return i >= 0 ? process.argv[i + 1] : "live"; })();
    24	const STAGES = ["deployed", "worker", "funded", "delegated", "live"];
    25	const stageN = STAGES.indexOf(argStage);
    26	if (stageN < 0) { console.error(`--stage は ${STAGES.join("|")}`); process.exit(2); }
    27	const NETWORK = process.env.NETWORK || "sepolia";
    28	const MAIN = NETWORK === "mainnet";
    29	const RPC = MAIN ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
    30	const WORKER_URL = process.env.WORKER_URL || (MAIN
    31	  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
    32	  : "https://pnouns-voter.x402-adsb-worker.workers.dev");
    33	const dep = JSON.parse(fs.readFileSync(path.join(ROOT, "deployments", `${NETWORK}.json`), "utf8"));
    34	const VOTER_ABI = [
    35	  "function space() view returns (string)", "function spaceHash() view returns (bytes32)",
    36	  "function registrationDelayBlocks() view returns (uint256)", "function marginBlocks() view returns (uint256)",
    37	  "function owner() view returns (address)", "function registrar() view returns (address)",
    38	  "function liveMode() view returns (bool)", "function refundEnabled() view returns (bool)",
    39	  "function excluded(address) view returns (bool)",
    40	];
    41	const NOUNS_ABI = ["function getCurrentVotes(address) view returns (uint96)", "function delegates(address) view returns (address)"];
    42	const E = (k) => process.env[k] || null;
    43	const low = (a) => (a ? a.toLowerCase() : a);
    44	
    45	let failed = 0;
    46	const check = (name, ok, detail) => { console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
    47	const warn = (name, detail) => console.log(`⚠️  ${name}: ${detail}`);
    48	const requireEnv = (k, why) => { if (MAIN && !E(k)) { check(`${k} の指定(${why})`, false, "mainnet では必須"); return false; } return true; };
    49	
    50	async function main() {
    51	  if (!RPC) throw new Error(`${NETWORK} の RPC URL が未設定です`);
    52	  const p = new ethers.JsonRpcProvider(RPC);
    53	  const voterAddr = dep.snapVoter || dep.voter;
    54	  const v = new ethers.Contract(voterAddr, VOTER_ABI, p);
    55	  console.log(`network=${NETWORK} stage=${argStage} voter=${voterAddr}\n`);
    56	
    57	  // ---- stage: deployed(常に) ----
    58	  const [space, spaceHash, delay, margin, owner, registrar, liveMode, refund] = await Promise.all([
    59	    v.space(), v.spaceHash(), v.registrationDelayBlocks(), v.marginBlocks(), v.owner(), v.registrar(), v.liveMode(), v.refundEnabled(),
    60	  ]);
    61	  check("spaceHash = keccak256(space)", spaceHash === ethers.keccak256(ethers.toUtf8Bytes(space)), `space="${space}"`);
    62	  const expSpace = MAIN ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
    63	  check("space が想定どおり", space === expSpace, `${space} (想定 ${expSpace})`);
    64	  const expDelay = Number(E("EXPECT_DELAY") || (MAIN ? 7200 : 1));
    65	  check(`registrationDelayBlocks >= ${expDelay}`, Number(delay) >= expDelay, String(delay));
    66	  if (requireEnv("EXPECT_MARGIN", "締切マージン")) if (E("EXPECT_MARGIN")) check("marginBlocks が想定どおり", Number(margin) === Number(E("EXPECT_MARGIN")), String(margin));
    67	  check("refundEnabled", refund === true);
    68	  // liveMode: live 段階では true、それ未満の段階では(mainnet は)false であること
    69	  if (stageN >= STAGES.indexOf("live")) check("liveMode = true", liveMode === true);
    70	  else if (MAIN) check("liveMode = false (live 化前)", liveMode === false, String(liveMode));
    71	  else console.log(`   liveMode=${liveMode} (テストネットは任意)`);
    72	
    73	  if (requireEnv("EXPECT_OWNER", "マルチシグ")) if (E("EXPECT_OWNER")) check("owner が想定どおり", low(owner) === low(E("EXPECT_OWNER")), owner);
    74	  if (requireEnv("EXPECT_REGISTRAR", "登録係")) if (E("EXPECT_REGISTRAR")) check("registrar が想定どおり", low(registrar) === low(E("EXPECT_REGISTRAR")), registrar);
    75	  if (requireEnv("EXPECT_EXCLUDED", "トレジャリー除外")) {
    76	    for (const a of (E("EXPECT_EXCLUDED") || "").split(",").filter(Boolean)) {
    77	      check(`excluded(${a.slice(0, 10)}…)`, await v.excluded(a), "");
    78	    }
    79	  }
    80	  if (!MAIN && !E("EXPECT_EXCLUDED")) {
    81	    // テストネット既定: Sepolia の pNouns トレジャリー
    82	    const t = "0x8ae80e0b44205904be18869240c2ec62d2342785";
    83	    check("excluded(トレジャリー)", await v.excluded(t), t);
    84	  }
    85	
    86	  // ---- stage: worker ----
    87	  let relayer = null;
    88	  if (stageN >= STAGES.indexOf("worker")) {
    89	    let workerCfg = null;
    90	    try {
    91	      const r = await fetch(`${WORKER_URL}/api/config?cb=${Date.now()}`);
    92	      check("Worker /api/config が HTTP 200", r.ok, String(r.status));
    93	      workerCfg = await r.json();
    94	    } catch (e) { check("Worker /api/config の取得", false, e.message); }
    95	    if (workerCfg) {
    96	      check("Worker の network 一致", workerCfg.network === NETWORK, workerCfg.network);
    97	      check("Worker の metagov 一致", low(workerCfg.metagov) === low(voterAddr), workerCfg.metagov);
    98	      check("Worker の snapshotSpace 一致", workerCfg.snapshotSpace === space, workerCfg.snapshotSpace);
    99	      relayer = workerCfg.relayer || null;
   100	      check("relayer が Worker から取得できた", !!relayer, relayer || "(デプロイ伝搬直後は旧版が返ることがある → 再実行)");
   101	      if (requireEnv("EXPECT_RELAYER", "リレイヤー")) if (E("EXPECT_RELAYER") && relayer) check("relayer が想定どおり", low(relayer) === low(E("EXPECT_RELAYER")), relayer);
   102	    }
   103	    if (requireEnv("EXPECT_BOT", "Snapshot bot(4 者分離)")) { /* 下の分離検査で使う */ }
   104	    const roles = { owner, registrar, relayer, bot: E("EXPECT_BOT") };
   105	    const addrs = Object.values(roles).filter(Boolean).map(low);
   106	    const distinct = new Set(addrs).size === addrs.length;
   107	    if (MAIN) check(`役割の分離(${addrs.length} 者すべて別アドレス)`, distinct);
   108	    else check(`役割の分離(${addrs.length} 者・リハーサル)`, distinct);
   109	  }
   110	
   111	  // ---- stage: funded ----
   112	  if (stageN >= STAGES.indexOf("funded")) {
   113	    const pool = await p.getBalance(voterAddr);
   114	    check("返金プール残高 > 0", pool > 0n, `${ethers.formatEther(pool)} ETH`);
   115	    if (relayer) { const rb = await p.getBalance(relayer); check("relayer 残高 > 0", rb > 0n, `${ethers.formatEther(rb)} ETH`); }
   116	    else if (MAIN) check("relayer 残高(アドレス不明のため確認不能)", false);
   117	  }
   118	
   119	  // ---- stage: delegated ----
   120	  if (stageN >= STAGES.indexOf("delegated")) {
   121	    const tokenAddr = MAIN ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || "0x4C4674bb72a096855496a7204962297bd7e12b85");
   122	    try {
   123	      const t = new ethers.Contract(tokenAddr, NOUNS_ABI, p);
   124	      const votes = await t.getCurrentVotes(voterAddr);
   125	      check("Nouns 投票権が委任されている", votes > 0n, `${votes} 票`);
   126	      if (requireEnv("EXPECT_DELEGATOR", "Nouns 保有マルチシグ")) if (E("EXPECT_DELEGATOR")) {
   127	        const d = await t.delegates(E("EXPECT_DELEGATOR"));
   128	        check("delegates(保有マルチシグ) = voter", low(d) === low(voterAddr), d);
   129	      }
   130	    } catch (e) { check("委任の確認", false, `token ${tokenAddr}: ${e.shortMessage || e.message}`); } // 照会失敗も fail(第13回監査)
   131	  }
   132	
   133	  console.log(failed ? `\n❌ ${failed} 件の不一致` : `\n✅ stage=${argStage} まですべて一致`);
   134	  process.exit(failed ? 1 : 0);
   135	}
   136	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(2); });
     1	// mainnet 用デプロイ(RUNBOOK-MAINNET 手順 2)。liveMode は false のまま・委任も行わない。
     2	// 使い方(アドレスは必須・明示。REG_DELAY/MARGIN には運用既定値 7200/300 がある):
     3	//   OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<トレジャリー>[,0x…] \
     4	//     REG_DELAY=7200 MARGIN=300 npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
     5	//   DRY_RUN=1 … 引数の検証と表示のみ / OUT=<path> … 出力先(フォークでのテスト用)
     6	const { ethers, network } = require("hardhat");
     7	const fs = require("fs");
     8	const path = require("path");
     9	const MAINNET = {
    10	  NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
    11	  PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    12	};
    13	async function main() {
    14	  const owner = process.env.OWNER, registrar = process.env.REGISTRAR;
    15	  const excluded = (process.env.EXCLUDED || "").split(",").filter(Boolean);
    16	  const delay = Number(process.env.REG_DELAY || 7200);
    17	  const margin = Number(process.env.MARGIN || 300);
    18	  if (!owner || !registrar) throw new Error("OWNER(マルチシグ)と REGISTRAR を明示してください");
    19	  // アドレスの厳格検証(第14回監査): checksum 不正・ゼロアドレスをデプロイ前に弾く
    20	  for (const [k, a] of [["OWNER", owner], ["REGISTRAR", registrar], ...excluded.map((a, i) => [`EXCLUDED[${i}]`, a])]) {
    21	    const norm = ethers.getAddress(a); // 不正なら throw
    22	    if (norm === ethers.ZeroAddress) throw new Error(`${k} がゼロアドレスです`);
    23	  }
    24	  if (owner.toLowerCase() === registrar.toLowerCase()) throw new Error("owner と registrar は別アドレスにしてください");
    25	  if (!excluded.length) throw new Error("EXCLUDED(トレジャリー等の除外アドレス)を明示してください");
    26	  if (!Number.isInteger(delay) || delay < 300) throw new Error("REG_DELAY は 300 以上(運用値 7200 = 約 24 時間)");
    27	  if (!Number.isInteger(margin) || margin < 10 || margin > 7200) throw new Error("MARGIN は 10〜7200 の整数(運用値 300 = 約 1 時間)");
    28	  const out = process.env.OUT || path.join(__dirname, "..", "..", "deployments", "mainnet.json");
    29	  if (fs.existsSync(out) && JSON.parse(fs.readFileSync(out, "utf8")).snapVoter && process.env.FORCE !== "1") throw new Error(`${out} に既存デプロイがあります(上書きは FORCE=1)`);
    30	  const [deployer] = await ethers.getSigners();
    31	  if (!deployer) throw new Error("デプロイ用アカウントがありません(MAINNET_DEPLOYER_KEY を設定)");
    32	  console.log(`network=${network.name} deployer=${deployer.address}`);
    33	  console.log(`owner=${owner} registrar=${registrar}\nexcluded=${excluded.join(",")} delay=${delay} margin=${margin} space=pnounsdao.eth`);
    34	  if (process.env.DRY_RUN === "1") { console.log("--- DRY_RUN: デプロイしません ---"); return; }
    35	  if (network.name === "hardhat") await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x1"]); // フォークでのテスト実行用
    36	  const F = await ethers.getContractFactory("PNounsSnapVoter");
    37	  const c = await F.deploy(MAINNET.PNOUNS, MAINNET.NOUNS_DAO, owner, registrar, "pnounsdao.eth", excluded, margin, delay);
    38	  await c.waitForDeployment();
    39	  const addr = await c.getAddress();
    40	  // 読み戻し検証(設定漏れをその場で検出)
    41	  const checks = [
    42	    ["space", await c.space(), "pnounsdao.eth"],
    43	    ["registrationDelayBlocks", Number(await c.registrationDelayBlocks()), delay],
    44	    ["marginBlocks", Number(await c.marginBlocks()), margin],
    45	    ["owner", (await c.owner()).toLowerCase(), owner.toLowerCase()],
    46	    ["registrar", (await c.registrar()).toLowerCase(), registrar.toLowerCase()],
    47	    ["liveMode", await c.liveMode(), false],
    48	  ];
    49	  for (const [k, got, want] of checks) if (String(got) !== String(want)) throw new Error(`読み戻し不一致 ${k}: ${got} != ${want}`);
    50	  for (const a of excluded) if (!(await c.excluded(a))) throw new Error(`excluded 未設定: ${a}`);
    51	  const dep = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
    52	  dep.snapVoter = addr;
    53	  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
    54	  fs.mkdirSync(path.dirname(out), { recursive: true });
    55	  fs.writeFileSync(out, JSON.stringify(dep, null, 2));
    56	  console.log(`デプロイ完了: ${addr} (block ${dep.snapVoterDeployBlock}) → ${out}`);
    57	  console.log("次: Sourcify 検証 → NETWORK=mainnet node scripts/check-deploy.mjs --stage deployed");
    58	}
    59	main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
     1	# mainnet 移行 runbook (pNouns Voter)
     2	
     3	第11回監査 M-14 への対応。**順序は固定**。各段の確認が通るまで次へ進まない。
     4	Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
     5	
     6	## 0. 前提
     7	
     8	- メンバー合意が得られていること(資料: docs/member-proposal-unified.html)
     9	- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
    10	
    11	## 1. 鍵の準備 — 4 つの役割、4 つの独立した鍵
    12	
    13	| 役割 | 鍵 | 保管 | 資金 |
    14	|---|---|---|---|
    15	| owner | **pNouns マルチシグ**(既存) | マルチシグ | 不要 |
    16	| registrar | 新規生成 mnemonic (`REGISTRAR_MNEMONIC`) | ローカル .env (600) | 0.005 ETH |
    17	| relayer | 新規生成秘密鍵 | **Cloudflare secret のみ**(ローカルに残す場合は .env) | 0.01 ETH (プールから返金される) |
    18	| Snapshot bot | 新規生成 mnemonic (`SNAPSHOT_BOT_MNEMONIC`) | GitHub Actions secret + .env | 不要(署名のみ)。pNouns 1 枚を保有させる |
    19	
    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
    21	同一アドレスを検出すると停止するが、それに頼らず生成時点で分ける。
    22	
    23	## 2. デプロイ (liveMode=false で開始)
    24	
    25	```bash
    26	OWNER=0x<マルチシグ> REGISTRAR=0x<registrar> EXCLUDED=0x<pNouns トレジャリー> \
    27	REG_DELAY=7200 MARGIN=300 \
    28	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
    29	```
    30	
    31	(スクリプトはフォークで検証済み。`DRY_RUN=1` で引数確認のみ可)
    32	
    33	- `REG_DELAY=7200` (約 24 時間)。Worker の下限は 300 だが、運用値は 7200
    34	- `OWNER` は**最初からマルチシグを指定**(EOA を経由しない)
    35	- 必須値に fallback はない。読み戻し検証に失敗すると非ゼロで終了する
    36	- デプロイ後、**liveMode は false のまま**。`setLiveMode(true)` は最終段まで呼ばない
    37	- Sourcify でソース検証 → exact_match を確認
    38	
    39	## 3. 機械照合(段階ごとに実行する)
    40	
    41	`check-deploy.mjs` は `--stage` で「その段階までに満たすべき状態」だけを照合する。
    42	**各手順の直後に該当 stage で実行し、✅ になるまで次へ進まない。**
    43	
    44	```bash
    45	ENV="NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… EXPECT_RELAYER=0x… \
    46	     EXPECT_DELEGATOR=0x<Nouns 保有マルチシグ> EXPECT_EXCLUDED=0x<トレジャリー> \
    47	     EXPECT_BOT=0x<Snapshot bot> EXPECT_MARGIN=300"
    48	# (シェルの制約上、変数展開をコマンドとして実行できないため env を前置する)
    49	# 手順 2 の後:            env $ENV node scripts/check-deploy.mjs --stage deployed
    50	# 手順 4 の後:            env $ENV node scripts/check-deploy.mjs --stage worker
    51	# プール入金の後:         env $ENV node scripts/check-deploy.mjs --stage funded
    52	# 手順 6-1(委任)の後:     env $ENV node scripts/check-deploy.mjs --stage delegated
    53	# 手順 6-3(live 化)の後:  env $ENV node scripts/check-deploy.mjs --stage live
    54	```
    55	
    56	mainnet では EXPECT_* が欠けていると fail する。live 未満の段階では liveMode=false で
    57	あることも確認される(先走りの live 化を検出)。Worker のデプロイ直後は伝搬遅延で
    58	旧版の応答が返ることがある — その場合は 1 分待って再実行する。
    59	
    60	## 4. Worker (Cloudflare) 設定
    61	
    62	```bash
    63	cd relayer-cf
    64	# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
    65	npx wrangler kv namespace create STATE --env mainnet
    66	npx wrangler deploy --env mainnet
    67	npx wrangler secret put RPC_URL --env mainnet
    68	npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
    69	npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
    70	```
    71	
    72	- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
    73	- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
    74	
    75	## 5. シャドー運用 (liveMode=false)
    76	
    77	- トレジャリーからプールへ 0.05 ETH 送金
    78	- 実際の Nouns 提案 2〜3 本で: Snapshot 提案作成 → 対応付け登録(自動) → 24h 猶予 →
    79	  投票 → 投函 → 締切後に「🕶️ シャドー」通知が出て、**集計が Snapshot と一致**することを確認
    80	- この間、Nouns DAO へは一切投票されない(手動運用を継続する)
    81	
    82	## 6. 委任切替 → 本番化 (この順のみ)
    83	
    84	1. マルチシグから Nouns Token の `delegate(voterAddress)` を実行(1 tx・いつでも戻せる)
    85	2. `check-deploy.mjs` で委任(getCurrentVotes > 0)を確認
    86	3. マルチシグから `setLiveMode(true)`
    87	4. 次の提案 1 本を全員で監視。理由文つきの投票が nouns.wtf に出ることを確認
    88	
    89	## 7. ロールバック(この順で)
    90	
    91	1. マルチシグから `setLiveMode(false)` を送信し、**採掘を確認**(以後 Nouns DAO へ投票しない)
    92	2. マルチシグから `delegate(旧委任先)` → 手動運用に完全復帰
    93	3. Worker の cron を停止(`wrangler triggers deploy` で crons を空に、または Worker を削除)
    94	4. 提案作成ジョブ(GitHub Actions / create-and-register)を停止
    95	5. 未処理の状態を確認: 投函待ちの票・pending の execute が残っていないか(`/api/proposals`、KV)
    96	6. 誤登録が原因なら、票が入る前に `unregisterProposal`
    97	7. `sweep(トレジャリー)` → プール残額を回収
    98	8. 鍵の漏洩が疑われる場合: relayer secret・Discord webhook をローテーション、`setRegistrar` で差し替え
    99	
   100	## 8. 障害時
   101	
   102	- Worker 停止/KV 上限: 票は Snapshot に残る。復旧後に自動で追いつく。締切が近い場合は
   103	  dApp の「手動 execute」または Etherscan から `execute(proposalId)`
   104	- 誤登録の疑い: 24h 猶予内なら registrar/owner から `unregisterProposal` → 正しい ID で再登録
   105	  (Worker の自動照合が Discord に⚠️を出す)
   106	- registrar 鍵漏洩: `setRegistrar(新アドレス)`。relayer 鍵漏洩: secret 差し替えのみ(票の偽造は不可能)
mainnet 0x1111111111111111111111111111111111111111 300

codex
selector の独立照合で重要な結果が出ました。`RegistrationTooRecent()` はテスト記載どおり `0x33ab63b9` ですが、`StaleVote()` の正値は `0x93ff56e3` で、テストの `0x3d7ac07d` は誤りです。そのテストは未復号でも恒久扱いされるため偶然通る構造です。これはクローズ判定に反映します。
exec
/bin/bash -lc "nl -ba docs/AUDIT-RESPONSE-2026-08-18.md | sed -n '1,330p'
rg -n \"accepted risk|Accepted|受容|残余|未対応|見送り|仕様|問題なし|High|Medium|Low|総括|保留|mainnet|Sepolia\" docs/AUDIT-RESPONSE-2026-08-18.md docs/audit-{10,11,12,13,14}-codex-raw.md | sed -n '1,500p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
     1	# 監査対応記録(Codex 監査 2026-08-18 → 対応済み)
     2	
     3	| ID | 重大度 | 対応 | 変更箇所 |
     4	|---|---|---|---|
     5	| H-01 | High | `/api/tick` は `TICK_TOKEN` 未設定なら 404(公開トリガ廃止)。cron は Cloudflare が 1 回/分だけ起動。KV ロックは best-effort として残し、投函前の on-chain `hasVoted` 確認と revert 時の記録戻しで二重投函の実害を抑える(残るリスク: 同時投函時の revert によるガス損 ~4 万 gas) | relayer-cf/src/index.js |
     6	| H-02 | High | tx を `txStatus:"sent"` として記録 → receipt で `success/reverted` に確定。receipt 待ちの例外は握りつぶさず「未確定」のまま残し、次回 tick の `reconcileSent` が receipt 再取得 → 10 分未採掘なら on-chain `hasVoted` で external/再投函を判定。execute も同様(`pending` を再照会、10 分で再試行) | relayer-cf/src/worker.js |
     7	| H-03 | High | タイトルは作成イベント＋ `ProposalUpdated` / `ProposalDescriptionUpdated` を読んで最新 description を使用。Updatable(state 10)中はキャッシュ TTL 60 秒。更新があれば「(更新あり)」を付記。dApp/Discord には nouns.wtf への導線あり。なお投票受付自体は Pending 以降(本文凍結後)のみ | relayer-cf/src/chain.js |
     8	| M-01 | Medium | `POST /api/vote`: content-length ≤ 64KB、proposalId 数値、署名 65 byte hex、tokenIds ≤ 300 件・1..2100・重複なし、署名者ごと 10 秒レート制限(KV) | relayer-cf/src/index.js |
     9	| M-02 | Medium | simulate 失敗のうちコントラクト revert(`ContractFunctionRevertedError` 系)だけ drop。RPC/一時障害は再試行 | relayer-cf/src/worker.js |
    10	| M-03 | Medium | 1 tx の署名数上限 `MAX_BATCH`(既定 25、超過分は次回)。手動投函の gasHint は実 `estimateContractGas` ×1.4(失敗時は票数・token 数からの保守値)。Worker の gasLimit ×1.3 | relayer-cf/src/index.js, worker.js |
    11	| M-04 | Medium | `castVotesBySig` は 1 バッチ 1 提案に制限(`MixedProposals`)。返金の提案別会計が成立 | contracts/PNounsVoter.sol |
    12	| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
    13	| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
    14	| M-07 | Medium | `proposals()` の返り値は長さ完全一致(15 word)を要求し、id 一致・endBlock > startBlock の sanity check を追加。レイアウト変更時は revert(=投票受付停止)して誤読しない | contracts/PNounsVoter.sol |
    15	| M-08 | Medium | EIP-6963 の icon は `data:image/*;base64` のみ許可＋属性エスケープ。プロバイダー識別は rdns+uuid | relayer-cf/public/index.html |
    16	
    17	再検証: フォークテスト 10 本通過(MixedProposals・シャドー後の本投票を追加)。Sepolia 再デプロイ `0xcCB00a9ede365458f301455089C8e36Ce6B32D1F`(Sourcify exact_match)、Worker 更新。
    18	Prop 511 でクラウド通し(3 票 → 投函 → execute → Nouns DAO 賛成 2 票)、`/api/tick` 404、重複 tokenId 拒否を確認。
    19	
    20	## 再監査(第 2 回)への対応
    21	| ID | 重大度 | 対応 |
    22	|---|---|---|
    23	| H-04 | High | KV 書込みを「イベント時のみ」に再設計: ロック廃止(cron は Cloudflare が 1 回/分のみ起動、`/api/tick` は無効)、所有者/タイトル(Updatable 中)キャッシュは isolate メモリ、残高警告フラグは TTL 失効任せ(回復時の delete なし)、一覧は KV metadata で読む。書込みは 署名受付・投函記録・確定・execute・告知・通知重複防止 のみ(1 日あたり数十件)。mainnet env は cron 2 分 |
    24	| M-10 | Medium | 1 tick の外部呼び出しを削減: hasVoted を multicall 1 回、バッチ全体を 1 回 simulate(失敗時のみ個別 ≤10)、receipt を待たず次 tick で確定(`inflight` キー 1 つで追跡)、残高確認は 10 tick に 1 回、`MAX_BATCH` 既定 10 |
    25	| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
    26	| H-03R | Medium | タイトルは Pending/Active(本文凍結後)に初めて取得したときだけ `title:{id}:final` に保存。Updatable 中はメモリ 30 秒のみ、KV には書かない |
    27	| M-01R | Medium | 本文をストリームで最大 64KB まで読み、超過は 413(Content-Length 非依存) |
    28	| M-09 | Medium | `NETWORK` は mainnet/sepolia 以外で起動失敗。mainnet では ONLY_PROPOSER 禁止・RPC_URL/アドレス必須・pNouns/Nouns アドレス固定値と照合。`wrangler.toml` に `[env.mainnet]`(別 Worker 名・別 KV・vars 非継承・cron 2 分)を用意 |
    29	| Low-1 | Low | proposalId/tokenIds は BigInt 正規値で検証・保存 |
    30	| Low-2 | Low | 永久 drop は `ContractFunctionRevertedError` のみ(ZeroData は再試行) |
    31	| Low-3 | Low | 返金枠 `refundedForProposal` は送金成功時のみ消費 |
    32	| Low-4 | Low | `public/_headers` で CSP(`script-src 'self'`、inline script を app.js に分離)・frame-ancestors none 等、API 応答にも防御ヘッダー |
    33	| Low-5 | Low | README の旧アドレス行を削除 |
    34	
    35	追加修正(実地で発見): 送信中 tx を持つ提案は Nouns 側 state に関係なく確定処理する(`inflight`)。Sepolia の短い投票期間で「execute 成功後に Defeated へ遷移し、確定処理が走らない」事象を再現・修正。通知の重複防止(tx 単位フラグ)。
    36	
    37	再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x5f719325b376EfB0be0A322A697B1c75382A7f1A`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 513/514 でクラウド通し(📢→🗳️→✅、重複なし)。CSP/X-Frame-Options を実環境で確認。
    38	
    39	## 再監査(第 3 回)への対応
    40	| ID | 重大度 | 対応 |
    41	|---|---|---|
    42	| H-05 | High | `_refundGas`: 送金前に `refundedForProposal` を予約し、失敗時のみ戻す(CEI)。`castVote` / `castVotesBySig` / `execute` に OpenZeppelin `ReentrancyGuard`(`nonReentrant`)。EIP-7702 の再入場を遮断 |
    43	| H-04R | High | KV `list` は **ワーカー専用**かつ「新規署名で dirty フラグが立った提案」または inflight の提案だけ実行(1 日数十回規模)。提案ごとの集計サマリー `sum:{pid}` をワーカーが書き、公開 API(`/api/proposals`, `/api/signatures/:id`, `/api/proposal/:id`)は get のみ。`/api/proposals` は Cache API で 30 秒キャッシュ(クエリは 0/8 に正規化)、dApp ポーリングは 60 秒。書込みは 1 票あたり「受付 1 + dirty 1 + 送信 1 + 確定 1 + サマリー数回」で、想定規模(数十票/日)では余裕。**mainnet で Workers Paid($5/月)にすれば上限の心配は消える**旨を README に明記(推奨) |
    44	| M-11 | Medium | inflight は tick 内でメモリ集約し、変化があったときだけ tick 末尾に 1 回書く(同一キー 1 write/秒制限・後勝ちを回避)。30 tick ごとに直近提案のサマリーから `sent`/`pending` を拾い直す回復処理 |
    45	| Low-6 | Low | `MAX_BATCH` 既定 10、1..10 以外は起動時エラー |
    46	
    47	再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x3C7fb408EE6A5c2732770110B6dd48527F360e26`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 515 でクラウド通し(📢→🗳️→✅、Nouns 賛成 2 票)。`/api/proposals` 2 回目 54ms(キャッシュ命中)。
    48	
    49	## 再監査(第 4 回)への対応
    50	| ID | 重大度 | 対応 |
    51	|---|---|---|
    52	| M-12 | Medium | dirty フラグを「削除」しない方式に変更: API は `dirty:{pid}` に受付時刻を書き、ワーカーは `dirty > sum.listedAt` なら再 list(listedAt は list **開始**時刻なので、list 中に届いた署名は次回必ず拾う)。加えて 20 分ごとの強制 list |
    53	| M-13 | Medium | 票キーの metadata に要約(support/枚数/tx/状態/受付時刻)を持たせ、`list` の metadata だけで一覧を作る(get なし)。署名本文は投函対象 ≤ MAX_BATCH(10)件だけ get。README の「Paid なら上限の心配が消える」を訂正(1 呼び出し 1,000 操作の上限は Paid でも同じ) |
    54	| M-11R | Medium | `inflight` キーを廃止。毎 tick、直近 15 提案のサマリー(get)と executed(get)から `txStatus:"sent"` / `pending` を検出して確定処理(read-modify-write なし、isolate 再生成の影響なし)。tickCount 依存をやめ時刻ベースに |
    55	| L-07 | Low | 全 KV キーを `<chainId>:<voterAddress>:` で名前空間化(再デプロイで旧記録が混ざらない。実環境で旧 Voter の executed 記録が消えたことを確認) |
    56	| 追加 | — | KV/RPC 障害時に Discord ⚠️ 警告(1 時間に 1 回、メモリ内スロットル。ワーカー tick と API の onError) — 無料枠で運用開始する判断に伴う監視 |
    57	
    58	再検証: Worker 再デプロイ、Prop 516 でクラウド通し(📢→🗳️→✅、Nouns 賛成 2 票)。
    59	
    60	## 再監査(第 5 回)への対応
    61	| ID | 重大度 | 対応 |
    62	|---|---|---|
    63	| M-14 | Medium | **署名受付締切**を導入: `acceptDeadline = オンチェーン締切 − ceil((MIN_PENDING_AGE + cron 間隔 + 余裕 120s)/12)` ブロック(mainnet: 30 ブロック前)。API はこれ以降の署名を `accept_closed` で拒否(自分で投函する導線を案内)。ワーカーは受付締切以降は最小待機を無視して即時投函(境界の票を取り残さない)。dApp は「署名受付締切」と「オンチェーン締切」を分けて表示。`relayer-cf/test/accept-deadline.test.mjs` に境界テスト 4 本(`npm test`) |
    64	| L-08 | Low | 入力起因の例外(不正アドレス等)は 400 を返し通知しない。Discord 障害通知は KV / RPC / 送信などの内部エラーに限定(名前・メッセージで分類) |
    65	
    66	再検証: Prop 517 で通し(受付中 3 票 → ok、受付締切後の署名 → 400 accept_closed、execute → Nouns 反対 2 票)。境界テスト 4/4 通過。
    67	
    68	## 再監査(第 6 回)への対応
    69	| ID | 重大度 | 対応 |
    70	|---|---|---|
    71	| M-14R | Medium | (1) **受付容量**: `submitCapacity = floor(((締切−現在)×12 − 余裕)/cron) × RUSH_BATCHES × MAX_BATCH`。API は投函待ち件数がこれ以上なら `capacity_full` で拒否し、手動投函/castVote へ誘導。(2) **rush 時は 1 tick で複数バッチ**(`RUSH_BATCHES` 既定 2、1..3)。サブリクエスト予算に収めるため、投函状態の書込みを「票ごとの KV put」から「サマリー 1 回」に集約(metadata は受付時の不変情報のみ、状態はサマリーが唯一の真実。再 list 時は既存サマリーとマージ)。(3) 境界テスト追加(`npm test` 6 本: 受付締切時点の容量 40、1 tick 分の 20、余裕未満で 0、1 日前 >2,100 等)。mainnet 既定(cron 120s、余裕 120s、2 バッチ×10)で受付締切時点の保証排出量は 40 票、それ以上の集中は API が受付時点で拒否するので「ok を返した票を落とす」ことはない |
    72	
    73	再検証: Worker テスト 6/6、Sepolia Prop 518 でクラウド通し(📢→🗳️→✅)。
    74	
    75	## 再監査(第 7 回・B3)への対応
    76	| ID | 重大度 | 対応 |
    77	|---|---|---|
    78	| B3-H01 | High | VoterRec に署名 digest を保存。**同一 timestamp + 同一 digest の再提出は「補完」**として未計上 token を同じ support に追加(投票者数は増やさない)。同一 timestamp で digest が異なる場合は StaleVote。フォークテストで「攻撃者が 1 枚だけ先行投函 → 正規リレイヤーが同一署名で残りを補完」を実証 |
    79	| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
    80	| B3-H03 | High | `[env.mainnet.vars]` に `SNAPSHOT_SPACE="pnounsdao.eth"` を明示。cfg は mainnet で SNAPSHOT_SPACE 必須(fail-closed)。worker は起動後最初の tick でコントラクトの `spaceHash` と設定値の keccak を照合し、不一致なら処理を停止して警告 |
    81	| B3-M01 | Medium | snapmap キャッシュは正の対応だけ保存。未登録(0)は毎 tick 再照会 |
    82	| B3-M02 | Medium | `created_gt` cursor(KV) + skip ページング(最大 3 ページ/tick)。cursor は「反映済み/対象外」は即時、「送信分」は**採掘確定後**に前進。取得は昇順で欠落なし |
    83	| B3-M03 | Medium | 締切接近時(shouldRushSubmit)は 1 tick で RUSH_BATCHES(2)バッチを連続送信。resolveMappings が Snapshot の終了時刻を取得し、オンチェーン締切より遅い設定なら ⚠️ を一度だけ通知 |
    84	| B3-M04 | Medium | `from` を厳密に address 化(_parseAddress)し、**コードを持つアドレスは EIP-1271** `isValidSignature` で検証(EOA は ECDSA 一致)。EIP-6492(未デプロイのスマートウォレット)は対象外と明記。フォークテストで Mock1271 ウォレットの投票を実証。**副産物: ユーザーの実ウォレット(0x0bC7…)が EIP-7702 コード付きであることが判明し、この対応が本番の必須要件だったことを確認** |
    85	| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
    86	| B3-M06 | Medium | ハブ/IPFS 取得に timeout 8s・64KB 上限・status/shape 検証。エンベロープと GraphQL 行(voter/proposal/created)の照合。ゲートウェイ 2 系統フォールバック。CID 単位のメモリ backoff(5 回失敗で恒久スキップして cursor 前進)。一時失敗はその票で打ち切り、次 tick に再試行 |
    87	| B3-L01 | Low | /api/config に mode(snapshot/direct)。snapshot モードでは domain/types を返さず、/api/vote と /api/signatures は 410。dApp は提案別の Snapshot リンクと「投票締切(オンチェーン反映)」表示 |
    88	| 依存 | — | @snapshot-labs/snapshot.js を devDependencies へ移動(Worker バンドルには元々含まれない) |
    89	
    90	再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
    91	
    92	## 再監査(第 8 回・B3)への対応
    93	| ID | 重大度 | 対応 |
    94	|---|---|---|
    95	| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
    96	| B3-H04 | High | cursor 設計を全面変更。**オンチェーンの `voterRec` を唯一の真実**とし、cursor は取得の最適化に徹する: 取得は `created_gte`(境界の秒を含む)、cursor は**未解決票の created を超えて進めない**。tx 成功時に cursor を進める処理を廃止し、次 tick で voterRec を見て「解決済み」になった分だけ前進。これにより (a) 同一秒 21 票、(b) 複数 tx の部分 revert、(c) 送信失敗・クラッシュ、いずれでも票を失わない。純関数 `planSubmission` に切り出し、**回帰テスト 5 本**を追加(同一秒 21 票 / 部分 revert / skip 扱い / やり直し・補完検出 / 全解決) |
    97	| B3-M01R | Medium | 対応付けキャッシュを廃止し、**毎 tick オンチェーンで再検証**(取消・再登録に追従。multicall 1 回) |
    98	| B3-M03R | Medium | 締切接近時は複数バッチで排出(既存)＋ Snapshot 終了がオンチェーン締切より遅い設定を検知して ⚠️ 通知。※「drain 不能なら自動処理を開始しない」は、票を全部捨てることになり実害が大きいため採用せず、**警告＋可能な限り排出**とした(判断を文書化) |
    99	| B3-M06R | Medium | 応答は **ReadableStream で 64KB 打ち切り**(Content-Length に依存しない)。取得失敗の票では **cursor を進めない**。20 回失敗した票のみデッドレター(KV に保存＋⚠️ 通知で手動対応可能に)し、黙って捨てない。ゲートウェイは 3 系統 |
   100	
   101	再検証: フォークテスト **16 本**、Worker テスト **11 本**(cursor 回帰 5 本を含む)。Sepolia 再デプロイ `0xFa8A9BBE8E22904Ad4d0f2840393b5088a159976`(Sourcify exact_match)。
   102	Snapshot の日次提案上限(5 件/日)に達していたため、**既存の投票済み Snapshot 提案を新しい Nouns 提案に対応付ける方式**(`scripts/sepolia/15-reuse-snap.js`)でライブ E2E を実施 → 4 票を取得・検証・集計(賛成 6/反対 2/棄権 1)し、Nouns DAO に賛成 2 票を記録。
   103	
   104	## 再監査(第 9 回・B3)への対応
   105	| ID | 重大度 | 対応 |
   106	|---|---|---|
   107	| 指摘1: 同一秒 300 件超で cursor 停滞 | High | ページ取得を **6 ページ(600 件)** に拡張し、**読み切れなかった場合は `complete=false` を返して cursor を一切進めない**(planSubmission が `blocked` で開始)。同時に ⚠️ 通知。回帰テスト追加(300 件処理済み + complete=false → advance 0、complete=true → advance T) |
   108	| 指摘2: NFT 移転後の補完票を見落とす | Medium | 補完要否の判定を「保有枚数 > 計上数」から **「未計上の tokenId が 1 枚でもあるか」** に変更。Worker は保有 tokenId ごとに `hasTokenVoted` を multicall で確認して `uncountedTokens` を作り、planSubmission に渡す。既定値は保守的に 0。回帰テスト追加(5 枚計上 → 手放して未計上 1 枚取得 → 補完対象と判定) |
   109	| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
   110	| 指摘4: 恒久 revert 票が後続を塞ぐ | Medium | 個別 simulate の**決定的 revert のみ**回数を KV に記録し、5 回でデッドレター化(⚠️ 通知つき)。一時エラー(RPC 障害)は従来どおり再試行のみで回数を数えない |
   111	| 指摘5: 直近 15 件から外れた対応付け | Medium | ハブの直近 20 件に加え、**処理対象の Nouns 提案から `nounsToSnap` で逆引き**し、必要なら最大 200 件遡って Snapshot 提案を特定。投票期間中の対応付けを見失わない |
   112	
   113	再検証: フォークテスト **17 本**、Worker テスト **13 本**(300 件境界・token 入れ替えを追加)。Sepolia 再デプロイ `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`(Sourcify exact_match)。再利用方式のライブ E2E で 3 票 → 集計(賛成 3/棄権 3 → 投票者 2:1 で賛成)→ Nouns DAO に賛成 2 票を記録。
   114	なお B3-M03R(Snapshot 終了がオンチェーン締切より遅い設定)は運用条件として扱い、mainnet のリリース条件に「Snapshot 投票期間 + 排出余裕 < Nouns 締切」を明記する。
   115	
   116	## 第 9 回再監査の残存リスクへの対応
   117	| ID | 重大度 | 対応 |
   118	|---|---|---|
   119	| 600 件以上で cursor が永久停滞 | High | timestamp cursor と固定ページ上限を廃止。100 件×3ページの **window offset を KV に保存**し、window 内の未解決票がなくなった時だけ次へ進む。末尾で offset=0 に戻して全体を再走査するため、同一秒 601 件以上でも全行へ到達し、途中挿入も次周回で回収する。GraphQL モックで 601 件を 3 tick で全取得する回帰テストを追加 |
   120	| 組合せ revert がデッドレターされない | High | 送信候補を **1 voter 1 票**へ正規化。同 timestamp は CID の辞書順で決定する。バッチ失敗後の個別切り分け結果を再度バッチ simulate し、それでも interaction revert する場合は先頭 1 票だけを送って次 tick の on-chain 状態から再評価する |
   121	| `hasTokenVoted` 照会増幅 | Medium | 補完候補を `created == voterRec.timestamp` に限定し、tokenId を全行で重複排除。最大 2,100 token を 200 件ずつ multicall する。600 行×100 token が一意な100照会になる回帰テストを追加 |
   122	| B3-M03R | Medium | mainnet は Snapshot 終了後に `cron + submit buffer` の排出時間がない場合、または終了時刻不明の場合に **投函・execute とも fail-closed**。Discord 通知と境界テストを追加 |
   123	
   124	再検証: Worker テストに 601 件巡回・同一 voter 正規化・tokenId 重複排除・timeline fail-closed 境界を追加。コントラクトは変更なし。
   125	
   126	### レビュー結果(第 9 回の修正を Claude 側で独立確認、2026-08-20)
   127	Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッチ 1 投票者への正規化、hasTokenVoted の重複排除、mainnet の排出時間 fail-closed)を精査し、設計は妥当と判断。以下 1 点のみ修正した。
   128	- **KV 書込み予算の退行(要修正・対応済み)**: 送るものが無い tick でも scan offset を無条件に KV へ書いていた(`put(scanK, ...)`)。通常運用(投票数 ≤ 300)では offset は常に 0 のままなので、毎分 1 write = 1,440 件/日となり、第 3 回監査(H-04R)で確保した無料枠(1,000 writes/日)を超える。**値が変化したときだけ書く**よう修正。
   129	- 確認したが問題なしと判断した点: (a) offset 巡回は on-chain voterRec を真実とするため、行の並びが不安定でも次周回で必ず拾える。(b) 送信対象が残っている間は offset を進めないので、window 内の未解決票を飛ばさない。(c) `uniqueVoterCandidates` は Snapshot ハブが (proposal, voter) で 1 行に集約するため通常は作動しないが、防御として妥当。(d) mainnet の fail-closed は execute も止めるため、Snapshot 終了時刻が不明・遅い場合は手動実行が必要になる(通知文に明記済み)。
   130	再検証: フォークテスト 17 本 / Worker テスト 17 本 / Sepolia ライブ E2E(Prop 526: 3 票 → 賛成 3・棄権 3 → 投票者 2:1 で賛成 → Nouns DAO に賛成 2 票)。
   131	
   132	---
   133	
   134	## 第10回監査 (2026-08-20, Codex CLI 0.145.0 / read-only) — 対応付けの自動照合
   135	
   136	対象: commit 0a98a23 (relayer の自動照合追加) と、それが依拠するコントラクト側の保証。
   137	生ログ: `docs/audit-10-codex-raw.md`
   138	
   139	| # | 重大度 | 指摘 | 対応 |
   140	|---|---|---|---|
   141	| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
   143	| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
   144	| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
   145	| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
   146	| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
   147	| 7 | Low | 照合ロジックに回帰テストがない | 修正: `relayer-cf/test/link-check.test.mjs` を追加(前方一致・偽ドメイン・サブドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null・メタ文字の 22 ケース) |
   148	| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |
   149	
   150	問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
   151	
   152	**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
   153	
   154	---
   155	
   156	## 第11回監査 (2026-08-20, Codex CLI / read-only) — Sepolia 再デプロイの実地検証
   157	
   158	対象: 第10回対応 (75025cc) と Sepolia 再デプロイ (e11b170)。生ログ: `docs/audit-11-codex-raw.md`
   159	※ Codex のサンドボックスは RPC に到達できず、B 項目 (オンチェーン) は Codex 側「未確認」。
   160	　こちらで実測した結果を下表に併記する。
   161	
   162	| # | 重大度 | 指摘 | 対応 |
   163	|---|---|---|---|
   164	| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
   165	| 2 | Info | 自己申告 URL の限界と取消条件の資料修正は妥当。コードと主張が一致 | 対応不要 |
   166	| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
   167	| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
   168	| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
   169	| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
   170	| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
   171	| 8 | Info | `InvalidSpace` の 1〜64 bytes は妥当 | 対応不要 |
   172	| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
   173	| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
   174	
   175	### B. デプロイ確認 (Codex は未確認 → こちらで実測)
   176	
   177	| 項目 | 実測値 | 判定 |
   178	|---|---|---|
   179	| `keccak256(eth_getCode)` | `0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327` | Codex がソースから独立に算出した期待値と**完全一致** |
   180	| runtime サイズ | 14,780 bytes | 期待どおり |
   181	| `space` / `spaceHash` | `earl-grey.eth` / `0x069910a7…2730` | keccak256(space) と一致。Codex の期待値とも一致 |
   182	| `registrationDelayBlocks` / `marginBlocks` | 5 / 5 | 意図どおり |
   183	| `liveMode` / `refundEnabled` | true / true | 意図どおり |
   184	| `owner` / `registrar` | ともに `0x10849D31…8925` | テストネットは意図的に同一 |
   185	| 新コントラクト残高 | 0.02 ETH | 意図どおり |
   186	| 旧コントラクト残高 | 0 ETH | 回収済み |
   187	| Nouns 委任 | delegator → 新アドレス。新 2 票 / 旧 0 票 | 移行済み |
   188	| トレジャリー `excluded` | true | 意図どおり |
   189	| Worker `/api/config` | network=sepolia, metagov=`0x64CdACe…693F` | 稼働中 Worker も新アドレス |
   190	
   191	### 残課題 (mainnet 移行の前提)
   192	
   193	- Worker レベルの状態遷移テスト (指摘 7)
   194	- 本番構成 runbook と 3 者分離のリハーサル (指摘 14)
   195	
   196	---
   197	
   198	## 第12回監査 (2026-08-20, Codex CLI / read-only) — 第11回修正の検証
   199	
   200	対象: commit 3ca7528 のみ。生ログ: `docs/audit-12-codex-raw.md`
   201	総括: High 0 件。第11回 High の「提案単位 fail-closed」と、重点確認を依頼した
   202	「締切後の自己 DoS」は**問題なし**と確認された(unresolved の 4 分類・execute 到達
   203	条件・reconcile の安全性をコードで追跡のうえ)。
   204	
   205	| # | 重大度 | 指摘 | 対応 |
   206	|---|---|---|---|
   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
   208	| 2 | Medium | `MIN_REGISTRATION_DELAY=abc` 等の不正値で `Math.max(300, NaN)=NaN` となり、下限 300 が消える | 修正: `cfg()` で非負整数を検証、不正なら throw |
   209	| 3 | Low | 末尾除去の 2 段 replace の順序により `…/989.後` を取りこぼす。`…/989偽` を受理する仕様の曖昧さ | 修正: 句読点と非 ASCII を 1 つの選択式にまとめ 1 パスで除去。`989偽` は「後置の文」とみなす仕様と明記(実在しないパスのため安全側)。指定 6 ケースをテスト追加 |
   210	| 4 | Low | 確定 tx の通知は送信失敗するとトリガー(送信中レコード)が消えて再送されない | 修正: 失敗分を単一 KV キー `pendingnotes` に積み、次 tick 冒頭で再送(list API 不使用・上限 20 件・1 日で破棄) |
   211	| 5 | Low | 非 Snapshot モードの告知が通知前に「告知済み」を記録したまま | 修正: Snapshot 分岐と同じく送信成功後に記録 |
   212	
   213	問題なしと確認された点: unresolved の 4 分類(20 件ヒット/逆引きヒット/未登録/登録済み未発見)、
   214	締切後の自己 DoS 不在(execute 窓は margin 期間 = state Active 中で、必ず逆引き対象)、
   215	mainnet 毎 tick 確認と 3 者 Set 判定(読み取り専用モードの誤停止なし・ABI 一致)、
   216	unresolved 警告の KV 負荷(1 提案 1 write/7 日)。
   217	
   218	テスト: relayer 26 pass / contracts 19 pass。コントラクト無変更(Worker のみ再デプロイ)。
   219	
   220	---
   221	
   222	## 第13回監査 (2026-08-20, Codex CLI / read-only) — 第12回修正 + テスト/runbook/3者分離の検証
   223	
   224	対象: 3e02162, cc423e3。生ログ: `docs/audit-13-codex-raw.md`
   225	
   226	| # | 重大度 | 指摘 | 対応 |
   227	|---|---|---|---|
   228	| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
   229	| 2 | Medium | 孤児提案の経路が残存: 鍵は存在しても registrar 権限がない場合、Snapshot 送信後に NotRegistrar で落ちる | 修正: 送信前にオンチェーン preflight(コントラクト実在・registrar()/owner() との照合・nounsToSnap 未登録)を追加 |
   230	| 3 | Medium | runbook の照合が循環(手順 3 の全項目✅は手順 4 以降を要求)。参照する deploy スクリプトが存在しない | 修正: `scripts/mainnet/deploy-snapvoter.js` を実装しフォークで実デプロイ検証(読み戻し・excluded 確認つき、DRY_RUN あり)。check-deploy を `--stage deployed/worker/funded/delegated/live` に分割し、runbook を各手順直後の段階照合に書き換え |
   231	| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
   232	| 5 | Low | pendingnotes: 重複送信・トリガー消失窓・上限超過 | 一部修正: 通知に tx hash の id を持たせ、積み直しと flush の重複を排除。KV put 失敗窓と 20 件上限は accepted risk として本表に記録(通知は補助機能であり、票・集計の正しさには影響しない) |
   233	| 6 | Low | 「989偽 → true」は fail-open 仕様 | 仕様として文書化(snap.js コメント + 本表)。この照合は取り違え事故検出の補助であり、厳密な防止は猶予+取消+公開が担う |
   234	| 7 | Low | Worker テストの残り穴(実投函 simulate/write、supplement、dead-letter、reconcile、非 Snapshot モード等)と mock の限界(KV 強整合・receipt 未実装等) | 既知の制限として記録。今回 3 テスト追加(猶予ゲート・hub errors 応答・pendingnotes 再送)で計 12 シナリオ。実投函経路はフォーク E2E(contracts 19 テスト)と Sepolia 実機 E2E が担保 |
   235	
   236	問題なし: MIN_REGISTRATION_DELAY の縁ケース("" は 0 → Math.max で 300、"300.5" throw)、
   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
   238	テストフックの本番無影響、/api/config の relayer 公開。
   239	
   240	**要 Sepolia 追随**: なし(コントラクト無変更)。Worker は再デプロイ済み。
   241	
   242	---
   243	
   244	## 第14回監査 (2026-08-20, Codex CLI / read-only) — 第13回修正の最終確認
   245	
   246	対象: 1be9d16。生ログ: `docs/audit-14-codex-raw.md`
   247	総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
   248	
   249	| # | 重大度 | 指摘 | 対応 |
   250	|---|---|---|---|
   251	| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
   252	| 2 | Medium | 登録が遅すぎて猶予明けが締切以降になる場合、専用警告なく「票ゼロ」で確定する(timelineSafe は eligibleAt を見ない) | 修正: `eligibleAt + 排出時間 >= deadline` を graceBad として検出。警告を出し、告知を抑止し、mainnet では処理を停止。テスト追加 ※この欠陥もこちらで事前に特定し監査依頼に明記していたもの |
   253	| 3 | Medium | MARGIN 未検証・EXPECT_MARGIN/EXPECT_BOT が任意・アドレスの checksum/ゼロ検証なし | 修正: deploy 側で MARGIN 10〜7200 の整数・全アドレスの getAddress + ゼロ拒否。check-deploy 側で mainnet の EXPECT_MARGIN(deployed 段階)・EXPECT_BOT(worker 段階)を必須化 |
   254	| 4 | Medium | RUNBOOK の `$ENV node …` は bash では実行できない(変数展開はコマンド扱い) | 修正: `env $ENV node …` に統一 |
   255	| 5 | Low | 実投函経路が未テスト | 修正: 票 1 件を simulate → writeContract → snapsent 保存まで通すテスト、復号 revert の振り分け(transient/恒久)、猶予境界 block==eligibleAt の 4 本を追加(計 17 シナリオ / relayer 43 テスト) |
   256	
   257	問題なし: 猶予ゲートの境界(block==eligibleAt で即投函・1 tick の無駄なし)、preflight の正当性
   258	(owner による登録は正常系)、deploy の読み戻し・FORCE 保護、stage 分割と RUNBOOK の整合、
   259	pendingnotes の id 重複排除。
   260	
   261	テスト: relayer 43 pass / contracts 19 pass。コントラクト無変更(Worker のみ再デプロイ)。
docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-10-codex-raw.md:13:## [Medium] URL 照合は「提案本文の自己申告」であり、悪意ある対応付けを検出できない
docs/audit-10-codex-raw.md:49:## [Medium] 不一致を判定する前に、誤った Snapshot 提案を Discord へ告知する
docs/audit-10-codex-raw.md:60:4. mainnet の投函・execute を停止
docs/audit-10-codex-raw.md:72:## [Medium] 「1票でも計上されると取消不可」は直接投票を含めると事実ではない
docs/audit-10-codex-raw.md:78:`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。
docs/audit-10-codex-raw.md:96:## [Medium] 24時間 delay は固定保証ではなく、owner が事後に短縮できる
docs/audit-10-codex-raw.md:114:## [Low] 警告送信失敗後も7日間通知済み扱いになる
docs/audit-10-codex-raw.md:131:## [Low] 今回の照合ロジックに回帰テストがない
docs/audit-10-codex-raw.md:151:## [Low] `space` は無制限長で、deployment/execute gas を増やせる
docs/audit-10-codex-raw.md:165:## 問題なしと判断した点
docs/audit-10-codex-raw.md:199:- mainnet RPC が必要な fork test は実行せず、ソース上の既存テストを確認。
docs/audit-13-codex-raw.md:14:# 監査依頼 (第13回) — 第12回修正と mainnet 前提課題(テスト・runbook・3者分離)の検証
docs/audit-13-codex-raw.md:20:- `cc423e3` … 残課題 2 点: Worker 状態遷移テストの追加、mainnet runbook + Sepolia での 3 者分離リハーサル
docs/audit-13-codex-raw.md:24:オンチェーン確認は不要 (Sepolia の実測は済み: registrar 0xfE07E953…c9ae /
docs/audit-13-codex-raw.md:29:1. **[前回 Medium] 鍵分離チェック**: create-and-register.mjs の検証が
docs/audit-13-codex-raw.md:30:   Snapshot 送信前に移り、mainnet で SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を
docs/audit-13-codex-raw.md:35:2. **[前回 Medium] MIN_REGISTRATION_DELAY 検証**: cfg() の `Number(env.… ?? 300)` +
docs/audit-13-codex-raw.md:38:3. **[前回 Low] URL 末尾除去の統合**: 1 つの選択式 `(?:[句読点]|[^!-~])+$` で
docs/audit-13-codex-raw.md:40:   期待どおりか。テストの期待値そのものが仕様として妥当かも述べること
docs/audit-13-codex-raw.md:41:4. **[前回 Low] pendingnotes キュー**: queueNotify / flushPendingNotes の実装。
docs/audit-13-codex-raw.md:46:5. **[前回 Low] 非 Snapshot 告知の順序**: 統一されたか
docs/audit-13-codex-raw.md:55:   mainnet/testnet 差分 / delay 再確認) をどこまで塞いだか。**まだ穴のままの経路**を
docs/audit-13-codex-raw.md:69:   - 参照しているスクリプト (scripts/mainnet/deploy-snapvoter.js) は**まだ存在しない**。
docs/audit-13-codex-raw.md:74:    - EXPECT_OWNER 等が未指定のとき mainnet で素通りする項目はないか
docs/audit-13-codex-raw.md:79:「問題なし」も根拠つきで。`relayer-cf` で `npm test`、ルートで可能なら
docs/audit-13-codex-raw.md:112:cc423e3 mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
docs/audit-13-codex-raw.md:133:    Medium:
docs/audit-13-codex-raw.md:137:      mainnet では SNAPSHOT_BOT_MNEMONIC / REGISTRAR_MNEMONIC を個別必須化、
docs/audit-13-codex-raw.md:142:    Low:
docs/audit-13-codex-raw.md:149:    確認済み(問題なし): 第11回 High の提案単位 fail-closed、締切後の自己 DoS
docs/audit-13-codex-raw.md:164:     cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
docs/audit-13-codex-raw.md:165:-    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
docs/audit-13-codex-raw.md:166:+    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
docs/audit-13-codex-raw.md:183:     if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
docs/audit-13-codex-raw.md:270: test("改行で分断された URL は検出しない(仕様)", () => {
docs/audit-13-codex-raw.md:274:+// 第12回監査: 末尾処理の仕様確認ケース
docs/audit-13-codex-raw.md:278:+  // 仕様: URL 直後の非 ASCII は「後置の文」とみなす。/vote/989偽 という提案パスは実在しないため安全側
docs/audit-13-codex-raw.md:298:+  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
docs/audit-13-codex-raw.md:300:+  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
docs/audit-13-codex-raw.md:301:+  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-13-codex-raw.md:302:+  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-13-codex-raw.md:303:+  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
docs/audit-13-codex-raw.md:304:+  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
docs/audit-13-codex-raw.md:308:+  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
docs/audit-13-codex-raw.md:310:   const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
docs/audit-13-codex-raw.md:320:-  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
docs/audit-13-codex-raw.md:321:-  // 第11回監査 M-14: mainnet で registrar 用の鍵が未設定のまま提案作成鍵に fallback すると、
docs/audit-13-codex-raw.md:322:-  // 3 者分離したつもりで同一鍵に戻ってしまう。mainnet では明示指定を必須にする。
docs/audit-13-codex-raw.md:323:-  if (NETWORK === "mainnet" && !process.env.REGISTRAR_MNEMONIC) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(提案作成鍵への fallback は禁止)");
docs/audit-13-codex-raw.md:325:-  if (NETWORK === "mainnet" && registrarPhrase === process.env.MAINNET_PROPOSER_MNEMONIC) throw new Error("mainnet では registrar と提案作成の鍵を分けてください");
docs/audit-13-codex-raw.md:338:    mainnet 前提の残課題 2 点を実施: Worker 状態遷移テストと 3 者分離
docs/audit-13-codex-raw.md:346:      mainnet 猶予下限(環境変数で下げても 300 が効く) / 3 者同一で停止 /
docs/audit-13-codex-raw.md:356:    - Sepolia で実施: registrar/relayer を新規独立鍵に分離
docs/audit-13-codex-raw.md:372:+# mainnet 移行 runbook (pNouns Voter)
docs/audit-13-codex-raw.md:375:+Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
docs/audit-13-codex-raw.md:380:+- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
docs/audit-13-codex-raw.md:391:+**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
docs/audit-13-codex-raw.md:397:+NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
docs/audit-13-codex-raw.md:398:+  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
docs/audit-13-codex-raw.md:409:+NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
docs/audit-13-codex-raw.md:419:+# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
docs/audit-13-codex-raw.md:420:+npx wrangler kv namespace create STATE --env mainnet
docs/audit-13-codex-raw.md:421:+npx wrangler deploy --env mainnet
docs/audit-13-codex-raw.md:422:+npx wrangler secret put RPC_URL --env mainnet
docs/audit-13-codex-raw.md:423:+npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
docs/audit-13-codex-raw.md:424:+npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
docs/audit-13-codex-raw.md:427:+- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
docs/audit-13-codex-raw.md:428:+- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
docs/audit-13-codex-raw.md:659:+test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
docs/audit-13-codex-raw.md:661:+    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:670:+test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
docs/audit-13-codex-raw.md:672:+    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:682:+    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:731:+//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
docs/audit-13-codex-raw.md:741:+const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
docs/audit-13-codex-raw.md:742:+const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
docs/audit-13-codex-raw.md:743:+  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
docs/audit-13-codex-raw.md:771:+  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
docs/audit-13-codex-raw.md:773:+  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
docs/audit-13-codex-raw.md:778:+  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
docs/audit-13-codex-raw.md:784:+  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
docs/audit-13-codex-raw.md:786:+  if (NETWORK === "mainnet") {
docs/audit-13-codex-raw.md:789:+    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
docs/audit-13-codex-raw.md:790:+    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
docs/audit-13-codex-raw.md:797:+    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
docs/audit-13-codex-raw.md:803:+  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
docs/audit-13-codex-raw.md:826:+// 本番構成リハーサル(Sepolia): registrar / relayer を新規鍵に分離し、transferOwnership の往復を演習する
docs/audit-13-codex-raw.md:837:+  // 1. 新規鍵の生成(mainnet と同じ手順: 役割ごとに独立したシードを新規生成)
docs/audit-13-codex-raw.md:844:+    env += `\n# Sepolia リハーサル用(2026-08-20 生成、実資産なし): registrar / relayer の分離鍵\nREGISTRAR_MNEMONIC="${reg.mnemonic.phrase}"\nSEPOLIA_RELAYER_KEY=${relay.privateKey}\n`;
docs/audit-13-codex-raw.md:861:+  if ((await v.registrar()).toLowerCase() !== regAddr.toLowerCase()) {
docs/audit-13-codex-raw.md:866:+  // 4. transferOwnership の往復演習(mainnet ではマルチシグへ移す操作の予行)
docs/audit-13-codex-raw.md:883:差分の主要意図は確認できました。ここからは、現行コード全体との組合せ（特に `tick` の例外処理、mainnet 検証のキャッシュ、KV API 契約、runbook の各段階）を追い、差分だけでは見えない抜けを確認します。併せてテストを実行します。
docs/audit-13-codex-raw.md:929:     8	// 環境変数: SNAPSHOT_SPACE / SNAPSHOT_HUB / SEQ_URL / NETWORK(sepolia|mainnet) / RPC / 鍵は .env
docs/audit-13-codex-raw.md:944:    23	const SPACE = process.env.SNAPSHOT_SPACE || (NETWORK === "mainnet" ? "pnounsdao.eth" : "earl-grey.eth");
docs/audit-13-codex-raw.md:947:    26	const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
docs/audit-13-codex-raw.md:980:    59	  const rpc = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
docs/audit-13-codex-raw.md:982:    61	  // mainnet では提案作成(bot)と registrar の鍵をそれぞれ明示する(他の鍵への fallback は禁止)
docs/audit-13-codex-raw.md:983:    62	  const botPhrase = NETWORK === "mainnet" ? process.env.SNAPSHOT_BOT_MNEMONIC : process.env.SEPOLIA_MNEMONIC;
docs/audit-13-codex-raw.md:984:    63	  if (!botPhrase) throw new Error(NETWORK === "mainnet" ? "mainnet では SNAPSHOT_BOT_MNEMONIC の明示が必要です(fallback 禁止)" : "SEPOLIA_MNEMONIC が未設定です");
docs/audit-13-codex-raw.md:985:    64	  const registrarPhrase = process.env.REGISTRAR_MNEMONIC || (NETWORK === "mainnet" ? null : process.env.SEPOLIA_MNEMONIC);
docs/audit-13-codex-raw.md:986:    65	  if (!registrarPhrase) throw new Error("mainnet では REGISTRAR_MNEMONIC の明示が必要です(fallback 禁止)");
docs/audit-13-codex-raw.md:990:    69	  if (NETWORK === "mainnet" && bot.address === registrarWallet.address) throw new Error(`mainnet では提案作成(bot)と registrar の鍵を分けてください(どちらも ${bot.address})`);
docs/audit-13-codex-raw.md:992:    71	  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
docs/audit-13-codex-raw.md:997:    76	    choices: p.choices, start: now, end: now + period, snapshot: await mainnetProvider.getBlockNumber(),
docs/audit-13-codex-raw.md:1016:     4	import { mainnet, sepolia } from "viem/chains";
docs/audit-13-codex-raw.md:1035:    23	  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
docs/audit-13-codex-raw.md:1036:    24	  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
docs/audit-13-codex-raw.md:1037:    25	  if (env.NETWORK === "mainnet") {
docs/audit-13-codex-raw.md:1038:    26	    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
docs/audit-13-codex-raw.md:1039:    27	    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
docs/audit-13-codex-raw.md:1042:    30	    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
docs/audit-13-codex-raw.md:1056:    44	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
docs/audit-13-codex-raw.md:1065:    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
docs/audit-13-codex-raw.md:1066:    54	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
docs/audit-13-codex-raw.md:1071:    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
docs/audit-13-codex-raw.md:1086:    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
docs/audit-13-codex-raw.md:1099:    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
docs/audit-13-codex-raw.md:1119:   107	    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
docs/audit-13-codex-raw.md:1126:   114	  const a = address.toLowerCase();
docs/audit-13-codex-raw.md:1150:   138	    if (c.onlyProposer && proposer.toLowerCase() !== c.onlyProposer) return;
docs/audit-13-codex-raw.md:1222:    60	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
docs/audit-13-codex-raw.md:1396:   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
docs/audit-13-codex-raw.md:1482:   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
docs/audit-13-codex-raw.md:1736:   444	      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
docs/audit-13-codex-raw.md:1737:   445	      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
docs/audit-13-codex-raw.md:1744:   452	        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
docs/audit-13-codex-raw.md:1746:   454	        if (c.network === "mainnet") {
docs/audit-13-codex-raw.md:1748:   456	          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
docs/audit-13-codex-raw.md:1754:   462	        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
docs/audit-13-codex-raw.md:1786:   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-13-codex-raw.md:1790:   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
docs/audit-13-codex-raw.md:1793:   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
docs/audit-13-codex-raw.md:1798:   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
docs/audit-13-codex-raw.md:1805:   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
docs/audit-13-codex-raw.md:1808:   516	        if (linkBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:1809:   517	        if (timelineBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:1923:   104	  const i = summaries.findIndex((x) => x.voter.toLowerCase() === voter.toLowerCase());
docs/audit-13-codex-raw.md:2009:   190	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
docs/audit-13-codex-raw.md:2065:   494	        // 対応付けの自動照合(誤登録の検出): Snapshot 提案が当該 Nouns 議案を参照していなければ警告し、mainnet では止める
docs/audit-13-codex-raw.md:2069:   498	          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
docs/audit-13-codex-raw.md:2072:   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
docs/audit-13-codex-raw.md:2077:   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
docs/audit-13-codex-raw.md:2084:   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
docs/audit-13-codex-raw.md:2087:   516	        if (linkBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:2088:   517	        if (timelineBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:2187:    76	      const st = (await store.getSummary(String(pid))).votes.find((v) => v.voter.toLowerCase() === address.toLowerCase()) || {};
docs/audit-13-codex-raw.md:2220:   109	  // Low: 正規化(BigInt 化した正規値で検証・保存)
docs/audit-13-codex-raw.md:2234:   123	  if (await store.getFlag(`rl:${voter.toLowerCase()}`)) return ctx.json({ error: "too many requests, retry later" }, 429);
docs/audit-13-codex-raw.md:2236:   125	  for (const id of ids) if (owners[Number(id)] !== voter.toLowerCase()) return ctx.json({ error: `token ${id} is not owned by ${voter}` }, 400);
docs/audit-13-codex-raw.md:2255:   144	  if (existing) { const st = sumNow.votes.find((v) => v.voter.toLowerCase() === voter.toLowerCase()); if (st && st.tx) return ctx.json({ error: "already submitted" }, 400); }
docs/audit-13-codex-raw.md:2256:   145	  await store.setFlag(`rl:${voter.toLowerCase()}`, 60);
docs/audit-13-codex-raw.md:2336:     9	  const voteKey = (pid, voter) => `${P}vote:${pid}:${voter.toLowerCase()}`;
docs/audit-13-codex-raw.md:2357:    30	      const byVoter = new Map(existing.map((v) => [v.voter.toLowerCase(), v]));
docs/audit-13-codex-raw.md:2358:    31	      return listed.map((l) => { const e = byVoter.get(l.voter.toLowerCase()); return e ? { ...l, tx: e.tx, txStatus: e.txStatus, dropped: e.dropped, sentAt: e.sentAt } : l; });
docs/audit-13-codex-raw.md:2486:   501	        // M03R: mainnet では投函だけでなく execute も止め、不完全な自動集計を最終結果にしない。
docs/audit-13-codex-raw.md:2491:   506	            const sent = await notify(c, `⚠️ Prop ${p.id}: Snapshot 終了後の排出時間が不足しています。${c.network === "mainnet" ? "mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。" : "締切後の票は反映されない可能性があります。"}`);
docs/audit-13-codex-raw.md:2498:   513	        if (c.announce && !linkBad && !(timelineBad && c.network === "mainnet")) {
docs/audit-13-codex-raw.md:2501:   516	        if (linkBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:2502:   517	        if (timelineBad && c.network === "mainnet") continue;
docs/audit-13-codex-raw.md:2678:   153	test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
docs/audit-13-codex-raw.md:2680:   155	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:2689:   164	test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
docs/audit-13-codex-raw.md:2691:   166	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:2701:   176	    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
docs/audit-13-codex-raw.md:2800:    63	test("改行で分断された URL は検出しない(仕様)", () => {
docs/audit-13-codex-raw.md:2804:    67	// 第12回監査: 末尾処理の仕様確認ケース
docs/audit-13-codex-raw.md:2808:    71	  // 仕様: URL 直後の非 ASCII は「後置の文」とみなす。/vote/989偽 という提案パスは実在しないため安全側
docs/audit-13-codex-raw.md:2834:docs/RUNBOOK-MAINNET.md:26:NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
docs/audit-13-codex-raw.md:2835:docs/RUNBOOK-MAINNET.md:27:  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
docs/audit-13-codex-raw.md:2843:relayer-cf/wrangler.toml:38:[env.mainnet.triggers]
docs/audit-13-codex-raw.md:2881:test/fork.e2e.test.js:251:    const treasuryToken = await (async () => { for (let id = 1; id <= 2100; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === PNOUNS_TREASURY) return id; })();
docs/audit-13-codex-raw.md:2893:scripts/sepolia/12-deploy-snapvoter.js:8:  const delay = Number(process.env.REG_DELAY || 0); // mainnet では 300 以上(Worker が fail-closed で検証)
docs/audit-13-codex-raw.md:2897:scripts/sepolia/04-delegate.js:9:  if ((await nouns.delegates(delegator.address)).toLowerCase() !== dep.voter.toLowerCase()) {
docs/audit-13-codex-raw.md:2900:scripts/sepolia/03-deploy-voter.js:1:// pNouns Voter を Sepolia にデプロイ(Nouns 公式 Sepolia、pNouns 複製、margin=MARGIN(既定 5 ブロック: 投票期間 25 ブロックのため))
docs/audit-13-codex-raw.md:2920:rg --files scripts/mainnet scripts | sort | sed -n '1,160p'
docs/audit-13-codex-raw.md:2923:     1	# mainnet 移行 runbook (pNouns Voter)
docs/audit-13-codex-raw.md:2926:     4	Sepolia でのリハーサル実績: 2026-08-20 (registrar/relayer 分離・transferOwnership 往復・check-deploy 全項目一致)。
docs/audit-13-codex-raw.md:2931:     9	- Codex 監査で High/Medium が残っていないこと(docs/AUDIT-RESPONSE-2026-08-18.md)
docs/audit-13-codex-raw.md:2942:    20	**禁止**: 鍵の使い回し・fallback。`create-and-register.mjs` と Worker は mainnet で
docs/audit-13-codex-raw.md:2948:    26	NETWORK=mainnet REG_DELAY=7200 MARGIN=300 SPACE=pnounsdao.eth FUND_ETH=0 \
docs/audit-13-codex-raw.md:2949:    27	  npx hardhat run scripts/mainnet/deploy-snapvoter.js --network mainnet
docs/audit-13-codex-raw.md:2960:    38	NETWORK=mainnet EXPECT_OWNER=0x<マルチシグ> EXPECT_REGISTRAR=0x<registrar> node scripts/check-deploy.mjs
docs/audit-13-codex-raw.md:2970:    48	# wrangler.toml [env.mainnet] の VOTER と KV namespace id を実値に更新してから:
docs/audit-13-codex-raw.md:2971:    49	npx wrangler kv namespace create STATE --env mainnet
docs/audit-13-codex-raw.md:2972:    50	npx wrangler deploy --env mainnet
docs/audit-13-codex-raw.md:2973:    51	npx wrangler secret put RPC_URL --env mainnet
docs/audit-13-codex-raw.md:2974:    52	npx wrangler secret put RELAYER_PRIVATE_KEY --env mainnet
docs/audit-13-codex-raw.md:2975:    53	npx wrangler secret put DISCORD_WEBHOOK_URL --env mainnet   # pNouns 公式 Discord の webhook
docs/audit-13-codex-raw.md:2978:    56	- Sepolia とは**別 Worker・別 KV**。既存 Sepolia 環境には触れない
docs/audit-13-codex-raw.md:2979:    57	- デプロイ後 `/api/config` で network=mainnet / metagov / relayer を確認(check-deploy が見る)
docs/audit-13-codex-raw.md:3015:     7	//   NETWORK=mainnet EXPECT_OWNER=0x… EXPECT_REGISTRAR=0x… node scripts/check-deploy.mjs
docs/audit-13-codex-raw.md:3025:    17	const RPC = NETWORK === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.SEPOLIA_RPC_URL;
docs/audit-13-codex-raw.md:3026:    18	const WORKER_URL = process.env.WORKER_URL || (NETWORK === "mainnet"
docs/audit-13-codex-raw.md:3027:    19	  ? "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
docs/audit-13-codex-raw.md:3055:    47	  const expSpace = NETWORK === "mainnet" ? "pnounsdao.eth" : (process.env.SNAPSHOT_SPACE || "earl-grey.eth");
docs/audit-13-codex-raw.md:3057:    49	  if (NETWORK === "mainnet") check("registrationDelayBlocks >= 300", Number(delay) >= 300, String(delay));
docs/audit-13-codex-raw.md:3062:    54	  // 2. 3 者の分離(mainnet は必須、テストネットは警告のみ)
docs/audit-13-codex-raw.md:3068:    60	  const addrs = Object.values(roles).filter(Boolean).map((a) => a.toLowerCase());
docs/audit-13-codex-raw.md:3070:    62	  if (NETWORK === "mainnet") {
docs/audit-13-codex-raw.md:3073:    65	    if (process.env.EXPECT_OWNER) check("owner が想定どおり(マルチシグ)", owner.toLowerCase() === process.env.EXPECT_OWNER.toLowerCase(), owner);
docs/audit-13-codex-raw.md:3074:    66	    if (process.env.EXPECT_REGISTRAR) check("registrar が想定どおり", registrar.toLowerCase() === process.env.EXPECT_REGISTRAR.toLowerCase(), registrar);
docs/audit-13-codex-raw.md:3081:    73	    check("Worker の metagov 一致", workerCfg.metagov?.toLowerCase() === voterAddr.toLowerCase(), workerCfg.metagov);
docs/audit-13-codex-raw.md:3087:    79	  const tokenAddr = NETWORK === "mainnet" ? "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" : (dep.nounsToken || process.env.NOUNS_TOKEN_SEPOLIA || "0x4C4674bb72a096855496a7204962297bd7e12b85");
docs/audit-13-codex-raw.md:3136:    33	# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
docs/audit-13-codex-raw.md:3137:    34	[env.mainnet]
docs/audit-13-codex-raw.md:3138:    35	name = "pnouns-voter-mainnet"
docs/audit-13-codex-raw.md:3139:    36	[env.mainnet.assets]
docs/audit-13-codex-raw.md:3141:    38	[env.mainnet.triggers]
docs/audit-13-codex-raw.md:3143:    40	[[env.mainnet.kv_namespaces]]
docs/audit-13-codex-raw.md:3146:    43	[env.mainnet.vars]
docs/audit-13-codex-raw.md:3147:    44	NETWORK = "mainnet"
docs/audit-13-codex-raw.md:3159:    56	PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"
docs/audit-13-codex-raw.md:3160:    57	# secrets(--env mainnet で put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL
docs/audit-13-codex-raw.md:3161:rg: scripts/mainnet: No such file or directory (os error 2)
docs/audit-13-codex-raw.md:3278:現時点で、runbook の段階順に実行不能な箇所が見つかっています。初回の「機械照合」が Worker 配備・プール入金・委任より前なのに、それらを必須判定するため、新規 mainnet では全項目一致に到達できません。さらに、照合スクリプトが宣言した ABI の `excluded` を実際には呼んでいない点も確認しました。残りは通知キューの上限算定と、テストが通していない状態遷移を整理中です。
docs/audit-13-codex-raw.md:3282:git log --oneline --all -- scripts/mainnet/deploy-snapvoter.js" in /mnt/data/pnouns-voter
docs/audit-13-codex-raw.md:3343:    60	    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
docs/audit-13-codex-raw.md:3427:   144	      if (String(m.from).toLowerCase() !== String(row.voter).toLowerCase()) throw new Error("voter mismatch");
docs/audit-13-codex-raw.md:3472:   189	    const key = item.row.voter.toLowerCase();
docs/audit-13-codex-raw.md:3485:test/snap.fork.test.js:120:          if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3486:test/snap.fork.test.js:194:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3487:test/snap.fork.test.js:275:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3488:test/snap.fork.test.js:296:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3489:test/snap.fork.test.js:324:        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3494:test/fork.e2e.test.js:251:    const treasuryToken = await (async () => { for (let id = 1; id <= 2100; id++) if ((await pnouns.ownerOf(id)).toLowerCase() === PNOUNS_TREASURY) return id; })();
docs/audit-13-codex-raw.md:3511:docs/audit-11-codex-raw.md:3817:   194	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3512:docs/audit-11-codex-raw.md:3882:   259	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3513:docs/audit-11-codex-raw.md:3903:   280	        if (owner === PNOUNS_TREASURY || owner === (await voterC.getAddress()).toLowerCase()) continue;
docs/audit-13-codex-raw.md:3528:  PNounsVoter (mainnet fork E2E)
docs/audit-13-codex-raw.md:3549:  PNounsSnapVoter (mainnet fork)
docs/audit-13-codex-raw.md:3571:docs/AUDIT-RESPONSE-2026-08-18.md-90-再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
docs/audit-13-codex-raw.md:3576:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-13-codex-raw.md:3577:docs/AUDIT-RESPONSE-2026-08-18.md-96-| B3-H04 | High | cursor 設計を全面変更。**オンチェーンの `voterRec` を唯一の真実**とし、cursor は取得の最適化に徹する: 取得は `created_gte`(境界の秒を含む)、cursor は**未解決票の created を超えて進めない**。tx 成功時に cursor を進める処理を廃止し、次 tick で voterRec を見て「解決済み」になった分だけ前進。これにより (a) 同一秒 21 票、(b) 複数 tx の部分 revert、(c) 送信失敗・クラッシュ、いずれでも票を失わない。純関数 `planSubmission` に切り出し、**回帰テスト 5 本**を追加(同一秒 21 票 / 部分 revert / skip 扱い / やり直し・補完検出 / 全解決) |
docs/audit-13-codex-raw.md:3578:docs/AUDIT-RESPONSE-2026-08-18.md-97-| B3-M01R | Medium | 対応付けキャッシュを廃止し、**毎 tick オンチェーンで再検証**(取消・再登録に追従。multicall 1 回) |
docs/audit-13-codex-raw.md:3579:docs/AUDIT-RESPONSE-2026-08-18.md-98-| B3-M03R | Medium | 締切接近時は複数バッチで排出(既存)＋ Snapshot 終了がオンチェーン締切より遅い設定を検知して ⚠️ 通知。※「drain 不能なら自動処理を開始しない」は、票を全部捨てることになり実害が大きいため採用せず、**警告＋可能な限り排出**とした(判断を文書化) |
docs/audit-13-codex-raw.md:3580:docs/AUDIT-RESPONSE-2026-08-18.md-99-| B3-M06R | Medium | 応答は **ReadableStream で 64KB 打ち切り**(Content-Length に依存しない)。取得失敗の票では **cursor を進めない**。20 回失敗した票のみデッドレター(KV に保存＋⚠️ 通知で手動対応可能に)し、黙って捨てない。ゲートウェイは 3 系統 |
docs/audit-13-codex-raw.md:3582:docs/AUDIT-RESPONSE-2026-08-18.md-101-再検証: フォークテスト **16 本**、Worker テスト **11 本**(cursor 回帰 5 本を含む)。Sepolia 再デプロイ `0xFa8A9BBE8E22904Ad4d0f2840393b5088a159976`(Sourcify exact_match)。
docs/audit-13-codex-raw.md:3584:docs/AUDIT-RESPONSE-2026-08-18.md-166-| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
docs/audit-13-codex-raw.md:3585:docs/AUDIT-RESPONSE-2026-08-18.md-167-| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
docs/audit-13-codex-raw.md:3587:docs/AUDIT-RESPONSE-2026-08-18.md-169-| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
docs/audit-13-codex-raw.md:3588:docs/AUDIT-RESPONSE-2026-08-18.md-170-| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
docs/audit-13-codex-raw.md:3590:docs/AUDIT-RESPONSE-2026-08-18.md:172:| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
docs/audit-13-codex-raw.md:3591:docs/AUDIT-RESPONSE-2026-08-18.md-173-| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-13-codex-raw.md:3598:docs/AUDIT-RESPONSE-2026-08-18.md-201-総括: High 0 件。第11回 High の「提案単位 fail-closed」と、重点確認を依頼した
docs/audit-13-codex-raw.md:3599:docs/AUDIT-RESPONSE-2026-08-18.md-202-「締切後の自己 DoS」は**問題なし**と確認された(unresolved の 4 分類・execute 到達
docs/audit-13-codex-raw.md:3604:docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/audit-13-codex-raw.md:3605:docs/AUDIT-RESPONSE-2026-08-18.md:208:| 2 | Medium | `MIN_REGISTRATION_DELAY=abc` 等の不正値で `Math.max(300, NaN)=NaN` となり、下限 300 が消える | 修正: `cfg()` で非負整数を検証、不正なら throw |
docs/audit-13-codex-raw.md:3606:docs/AUDIT-RESPONSE-2026-08-18.md:209:| 3 | Low | 末尾除去の 2 段 replace の順序により `…/989.後` を取りこぼす。`…/989偽` を受理する仕様の曖昧さ | 修正: 句読点と非 ASCII を 1 つの選択式にまとめ 1 パスで除去。`989偽` は「後置の文」とみなす仕様と明記(実在しないパスのため安全側)。指定 6 ケースをテスト追加 |
docs/audit-13-codex-raw.md:3607:docs/AUDIT-RESPONSE-2026-08-18.md:210:| 4 | Low | 確定 tx の通知は送信失敗するとトリガー(送信中レコード)が消えて再送されない | 修正: 失敗分を単一 KV キー `pendingnotes` に積み、次 tick 冒頭で再送(list API 不使用・上限 20 件・1 日で破棄) |
docs/audit-13-codex-raw.md:3608:docs/AUDIT-RESPONSE-2026-08-18.md-211-| 5 | Low | 非 Snapshot モードの告知が通知前に「告知済み」を記録したまま | 修正: Snapshot 分岐と同じく送信成功後に記録 |
docs/audit-13-codex-raw.md:3610:docs/AUDIT-RESPONSE-2026-08-18.md-213-問題なしと確認された点: unresolved の 4 分類(20 件ヒット/逆引きヒット/未登録/登録済み未発見)、
docs/audit-13-codex-raw.md:3612:docs/AUDIT-RESPONSE-2026-08-18.md-215-mainnet 毎 tick 確認と 3 者 Set 判定(読み取り専用モードの誤停止なし・ABI 一致)、
docs/audit-13-codex-raw.md:3617:docs/audit-12-codex-raw.md-53-### 2. [前回 Medium] URL 末尾処理の回帰修正
docs/audit-13-codex-raw.md:3631:docs/audit-12-codex-raw.md-171-+| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
docs/audit-13-codex-raw.md:3632:docs/audit-12-codex-raw.md-172-+| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
docs/audit-13-codex-raw.md:3634:docs/audit-12-codex-raw.md-174-+| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
docs/audit-13-codex-raw.md:3635:docs/audit-12-codex-raw.md-175-+| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
docs/audit-13-codex-raw.md:3637:docs/audit-12-codex-raw.md:177:+| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
docs/audit-13-codex-raw.md:3638:docs/audit-12-codex-raw.md-178-+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-13-codex-raw.md:3650:docs/audit-12-codex-raw.md-450-docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/audit-13-codex-raw.md:3651:docs/audit-12-codex-raw.md:451:docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/audit-13-codex-raw.md:3652:docs/audit-12-codex-raw.md-452-docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/audit-13-codex-raw.md:3653:docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-13-codex-raw.md:3654:docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-13-codex-raw.md:3655:docs/audit-12-codex-raw.md-455-docs/AUDIT-RESPONSE-2026-08-18.md:164:| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
docs/audit-13-codex-raw.md:3657:docs/audit-12-codex-raw.md-457-docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-13-codex-raw.md:3664:docs/audit-12-codex-raw.md-2029-    53	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
docs/audit-13-codex-raw.md:3665:docs/audit-12-codex-raw.md:2030:    54	    minRegistrationDelay: Number(env.MIN_REGISTRATION_DELAY || 300), // mainnet で要求する登録猶予の下限(ブロック)
docs/audit-13-codex-raw.md:3670:docs/audit-12-codex-raw.md-2035-    59	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
docs/audit-13-codex-raw.md:3725:docs/audit-12-codex-raw.md:2604:さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。
docs/audit-13-codex-raw.md:3729:docs/audit-12-codex-raw.md-2608-- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
docs/audit-13-codex-raw.md:3732:docs/audit-12-codex-raw.md-2611-- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。
docs/audit-13-codex-raw.md:3734:docs/audit-12-codex-raw.md-2613-### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる
docs/audit-13-codex-raw.md:3748:docs/audit-12-codex-raw.md-2627-現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。
docs/audit-13-codex-raw.md:3755:docs/audit-12-codex-raw.md-2634-### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る
docs/audit-13-codex-raw.md:3773:docs/audit-12-codex-raw.md-2653-- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
docs/audit-13-codex-raw.md:3774:docs/audit-12-codex-raw.md-2654-- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
docs/audit-13-codex-raw.md:3783:docs/audit-12-codex-raw.md-2663-### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる
docs/audit-13-codex-raw.md:3792:docs/audit-12-codex-raw.md:2803:さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。
docs/audit-13-codex-raw.md:3796:docs/audit-12-codex-raw.md-2807-- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
docs/audit-13-codex-raw.md:3799:docs/audit-12-codex-raw.md-2810-- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。
docs/audit-13-codex-raw.md:3801:docs/audit-12-codex-raw.md-2812-### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる
docs/audit-13-codex-raw.md:3815:docs/audit-12-codex-raw.md-2826-現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。
docs/audit-13-codex-raw.md:3822:docs/audit-12-codex-raw.md-2833-### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る
docs/audit-13-codex-raw.md:3840:docs/audit-12-codex-raw.md-2852-- 非ASCIIをすべて削る仕様が必要か再検討し、可能なら閉じ括弧・日本語句読点だけに限定する。
docs/audit-13-codex-raw.md:3841:docs/audit-12-codex-raw.md-2853-- 現仕様を維持する場合は、句読点と非ASCIIを一つの末尾正規表現でまとめて除去するか、変化がなくなるまで反復する。
docs/audit-13-codex-raw.md:3850:docs/audit-12-codex-raw.md-2862-### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる
docs/audit-13-codex-raw.md:3872:relayer-cf/src/chain.js:54:    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 300); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。NaN で Math.max(300, NaN)=NaN となり下限が消える事故を防ぐ(第12回監査)
docs/audit-13-codex-raw.md:3926:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-13-codex-raw.md:3970:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-13-codex-raw.md:4021:relayer-cf/src/worker.js:462:        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }
docs/audit-13-codex-raw.md:4026:重要な追加所見があります。`REG_DELAY=7200` と現 Worker の組合せでは、猶予中の Snapshot 票を Worker が即座に simulate し、`RegistrationTooRecent` を「恒久 revert」と同じ扱いで数えます。5 tick 後に dead-letter 化するため、runbook の24時間猶予中に投票された票が約10分（mainnet 2分 cron）で自動除外され得ます。今回の9シナリオはこの実投函経路を通しておらず検出できていません。mainnet 移行前に塞ぐべき High と判断します。
docs/audit-13-codex-raw.md:4078:✔ mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない) (0.446219ms)
docs/audit-13-codex-raw.md:4079:✔ mainnet: owner/registrar/relayer が同一なら停止 (0.286268ms)
docs/audit-13-codex-raw.md:4356:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-13-codex-raw.md:4380:mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
docs/audit-13-codex-raw.md:4382:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
docs/audit-13-codex-raw.md:4386:### [High] 登録猶予中の正常票が dead-letter 化される
docs/audit-13-codex-raw.md:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-13-codex-raw.md:4390:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
docs/audit-13-codex-raw.md:4394:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
docs/audit-13-codex-raw.md:4396:[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
docs/audit-13-codex-raw.md:4398:### [Medium] check-deployが危険な構成を成功扱いし得る
docs/audit-13-codex-raw.md:4403:- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
docs/audit-13-codex-raw.md:4410:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-13-codex-raw.md:4412:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
docs/audit-13-codex-raw.md:4414:[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
docs/audit-13-codex-raw.md:4418:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
docs/audit-13-codex-raw.md:4425:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-13-codex-raw.md:4427:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
docs/audit-13-codex-raw.md:4429:[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
docs/audit-13-codex-raw.md:4443:- timelineBadのmainnet/testnet差分
docs/audit-13-codex-raw.md:4444:- mainnetでdelayを次tickに再確認する経路
docs/audit-13-codex-raw.md:4449:## 問題なしと判断した項目
docs/audit-13-codex-raw.md:4451:- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
docs/audit-13-codex-raw.md:4453:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
docs/audit-13-codex-raw.md:4455:- [問題なし] / [relayer-cf/src/worker.js:54](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:54) / Snapshot・非SnapshotともDiscord 2xx後にのみannouncedを書きます。late提案を`late`記録する分岐は告知対象外なので妥当です。 / 修正不要。
docs/audit-13-codex-raw.md:4457:- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
docs/audit-13-codex-raw.md:4459:- [問題なし] / [relayer-cf/src/index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19) / relayerアドレスは送信txから公開される情報で、秘密鍵の推測材料にはなりません。`Cache-Control: no-store`も付与されます。 / 情報公開上の問題なし。
docs/audit-13-codex-raw.md:4461:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-13-codex-raw.md:4465:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-13-codex-raw.md:4474:- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
docs/audit-13-codex-raw.md:4480:mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
docs/audit-13-codex-raw.md:4482:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
docs/audit-13-codex-raw.md:4486:### [High] 登録猶予中の正常票が dead-letter 化される
docs/audit-13-codex-raw.md:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-13-codex-raw.md:4490:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
docs/audit-13-codex-raw.md:4494:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
docs/audit-13-codex-raw.md:4496:[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
docs/audit-13-codex-raw.md:4498:### [Medium] check-deployが危険な構成を成功扱いし得る
docs/audit-13-codex-raw.md:4503:- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
docs/audit-13-codex-raw.md:4510:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
docs/audit-13-codex-raw.md:4512:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
docs/audit-13-codex-raw.md:4514:[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
docs/audit-13-codex-raw.md:4518:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
docs/audit-13-codex-raw.md:4525:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
docs/audit-13-codex-raw.md:4527:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
docs/audit-13-codex-raw.md:4529:[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
docs/audit-13-codex-raw.md:4543:- timelineBadのmainnet/testnet差分
docs/audit-13-codex-raw.md:4544:- mainnetでdelayを次tickに再確認する経路
docs/audit-13-codex-raw.md:4549:## 問題なしと判断した項目
docs/audit-13-codex-raw.md:4551:- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
docs/audit-13-codex-raw.md:4553:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
docs/audit-13-codex-raw.md:4555:- [問題なし] / [relayer-cf/src/worker.js:54](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:54) / Snapshot・非SnapshotともDiscord 2xx後にのみannouncedを書きます。late提案を`late`記録する分岐は告知対象外なので妥当です。 / 修正不要。
docs/audit-13-codex-raw.md:4557:- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
docs/audit-13-codex-raw.md:4559:- [問題なし] / [relayer-cf/src/index.js:19](/mnt/data/pnouns-voter/relayer-cf/src/index.js:19) / relayerアドレスは送信txから公開される情報で、秘密鍵の推測材料にはなりません。`Cache-Control: no-store`も付与されます。 / 情報公開上の問題なし。
docs/audit-13-codex-raw.md:4561:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
docs/audit-13-codex-raw.md:4565:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
docs/audit-13-codex-raw.md:4574:- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
docs/AUDIT-RESPONSE-2026-08-18.md:5:| H-01 | High | `/api/tick` は `TICK_TOKEN` 未設定なら 404(公開トリガ廃止)。cron は Cloudflare が 1 回/分だけ起動。KV ロックは best-effort として残し、投函前の on-chain `hasVoted` 確認と revert 時の記録戻しで二重投函の実害を抑える(残るリスク: 同時投函時の revert によるガス損 ~4 万 gas) | relayer-cf/src/index.js |
docs/AUDIT-RESPONSE-2026-08-18.md:6:| H-02 | High | tx を `txStatus:"sent"` として記録 → receipt で `success/reverted` に確定。receipt 待ちの例外は握りつぶさず「未確定」のまま残し、次回 tick の `reconcileSent` が receipt 再取得 → 10 分未採掘なら on-chain `hasVoted` で external/再投函を判定。execute も同様(`pending` を再照会、10 分で再試行) | relayer-cf/src/worker.js |
docs/AUDIT-RESPONSE-2026-08-18.md:7:| H-03 | High | タイトルは作成イベント＋ `ProposalUpdated` / `ProposalDescriptionUpdated` を読んで最新 description を使用。Updatable(state 10)中はキャッシュ TTL 60 秒。更新があれば「(更新あり)」を付記。dApp/Discord には nouns.wtf への導線あり。なお投票受付自体は Pending 以降(本文凍結後)のみ | relayer-cf/src/chain.js |
docs/AUDIT-RESPONSE-2026-08-18.md:8:| M-01 | Medium | `POST /api/vote`: content-length ≤ 64KB、proposalId 数値、署名 65 byte hex、tokenIds ≤ 300 件・1..2100・重複なし、署名者ごと 10 秒レート制限(KV) | relayer-cf/src/index.js |
docs/AUDIT-RESPONSE-2026-08-18.md:9:| M-02 | Medium | simulate 失敗のうちコントラクト revert(`ContractFunctionRevertedError` 系)だけ drop。RPC/一時障害は再試行 | relayer-cf/src/worker.js |
docs/AUDIT-RESPONSE-2026-08-18.md:10:| M-03 | Medium | 1 tx の署名数上限 `MAX_BATCH`(既定 25、超過分は次回)。手動投函の gasHint は実 `estimateContractGas` ×1.4(失敗時は票数・token 数からの保守値)。Worker の gasLimit ×1.3 | relayer-cf/src/index.js, worker.js |
docs/AUDIT-RESPONSE-2026-08-18.md:11:| M-04 | Medium | `castVotesBySig` は 1 バッチ 1 提案に制限(`MixedProposals`)。返金の提案別会計が成立 | contracts/PNounsVoter.sol |
docs/AUDIT-RESPONSE-2026-08-18.md:12:| M-05 | Medium | シャドー(liveMode=false)の execute は `executed` を立てずイベントのみ → 後で liveMode=true にすれば同じ提案を本投票可能(テスト追加) | contracts/PNounsVoter.sol |
docs/AUDIT-RESPONSE-2026-08-18.md:13:| M-06 | Medium | 文書修正: 委任の切り戻しは「以後の提案から」効く。進行中提案の緊急停止は `setLiveMode(false)`(コントラクトの NatSpec と README/報告資料に明記) | docs |
docs/AUDIT-RESPONSE-2026-08-18.md:14:| M-07 | Medium | `proposals()` の返り値は長さ完全一致(15 word)を要求し、id 一致・endBlock > startBlock の sanity check を追加。レイアウト変更時は revert(=投票受付停止)して誤読しない | contracts/PNounsVoter.sol |
docs/AUDIT-RESPONSE-2026-08-18.md:15:| M-08 | Medium | EIP-6963 の icon は `data:image/*;base64` のみ許可＋属性エスケープ。プロバイダー識別は rdns+uuid | relayer-cf/public/index.html |
docs/AUDIT-RESPONSE-2026-08-18.md:17:再検証: フォークテスト 10 本通過(MixedProposals・シャドー後の本投票を追加)。Sepolia 再デプロイ `0xcCB00a9ede365458f301455089C8e36Ce6B32D1F`(Sourcify exact_match)、Worker 更新。
docs/AUDIT-RESPONSE-2026-08-18.md:23:| H-04 | High | KV 書込みを「イベント時のみ」に再設計: ロック廃止(cron は Cloudflare が 1 回/分のみ起動、`/api/tick` は無効)、所有者/タイトル(Updatable 中)キャッシュは isolate メモリ、残高警告フラグは TTL 失効任せ(回復時の delete なし)、一覧は KV metadata で読む。書込みは 署名受付・投函記録・確定・execute・告知・通知重複防止 のみ(1 日あたり数十件)。mainnet env は cron 2 分 |
docs/AUDIT-RESPONSE-2026-08-18.md:24:| M-10 | Medium | 1 tick の外部呼び出しを削減: hasVoted を multicall 1 回、バッチ全体を 1 回 simulate(失敗時のみ個別 ≤10)、receipt を待たず次 tick で確定(`inflight` キー 1 つで追跡)、残高確認は 10 tick に 1 回、`MAX_BATCH` 既定 10 |
docs/AUDIT-RESPONSE-2026-08-18.md:25:| M-05R | Medium | シャドー execute は KV に `shadow:true` として別管理し、コントラクトの `liveMode` が true になれば自動で再 execute。receipt 成功だけで完了扱いにしない(`executed===true` を確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:26:| H-03R | Medium | タイトルは Pending/Active(本文凍結後)に初めて取得したときだけ `title:{id}:final` に保存。Updatable 中はメモリ 30 秒のみ、KV には書かない |
docs/AUDIT-RESPONSE-2026-08-18.md:27:| M-01R | Medium | 本文をストリームで最大 64KB まで読み、超過は 413(Content-Length 非依存) |
docs/AUDIT-RESPONSE-2026-08-18.md:28:| M-09 | Medium | `NETWORK` は mainnet/sepolia 以外で起動失敗。mainnet では ONLY_PROPOSER 禁止・RPC_URL/アドレス必須・pNouns/Nouns アドレス固定値と照合。`wrangler.toml` に `[env.mainnet]`(別 Worker 名・別 KV・vars 非継承・cron 2 分)を用意 |
docs/AUDIT-RESPONSE-2026-08-18.md:29:| Low-1 | Low | proposalId/tokenIds は BigInt 正規値で検証・保存 |
docs/AUDIT-RESPONSE-2026-08-18.md:30:| Low-2 | Low | 永久 drop は `ContractFunctionRevertedError` のみ(ZeroData は再試行) |
docs/AUDIT-RESPONSE-2026-08-18.md:31:| Low-3 | Low | 返金枠 `refundedForProposal` は送金成功時のみ消費 |
docs/AUDIT-RESPONSE-2026-08-18.md:32:| Low-4 | Low | `public/_headers` で CSP(`script-src 'self'`、inline script を app.js に分離)・frame-ancestors none 等、API 応答にも防御ヘッダー |
docs/AUDIT-RESPONSE-2026-08-18.md:33:| Low-5 | Low | README の旧アドレス行を削除 |
docs/AUDIT-RESPONSE-2026-08-18.md:35:追加修正(実地で発見): 送信中 tx を持つ提案は Nouns 側 state に関係なく確定処理する(`inflight`)。Sepolia の短い投票期間で「execute 成功後に Defeated へ遷移し、確定処理が走らない」事象を再現・修正。通知の重複防止(tx 単位フラグ)。
docs/AUDIT-RESPONSE-2026-08-18.md:37:再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x5f719325b376EfB0be0A322A697B1c75382A7f1A`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 513/514 でクラウド通し(📢→🗳️→✅、重複なし)。CSP/X-Frame-Options を実環境で確認。
docs/AUDIT-RESPONSE-2026-08-18.md:42:| H-05 | High | `_refundGas`: 送金前に `refundedForProposal` を予約し、失敗時のみ戻す(CEI)。`castVote` / `castVotesBySig` / `execute` に OpenZeppelin `ReentrancyGuard`(`nonReentrant`)。EIP-7702 の再入場を遮断 |
docs/AUDIT-RESPONSE-2026-08-18.md:43:| H-04R | High | KV `list` は **ワーカー専用**かつ「新規署名で dirty フラグが立った提案」または inflight の提案だけ実行(1 日数十回規模)。提案ごとの集計サマリー `sum:{pid}` をワーカーが書き、公開 API(`/api/proposals`, `/api/signatures/:id`, `/api/proposal/:id`)は get のみ。`/api/proposals` は Cache API で 30 秒キャッシュ(クエリは 0/8 に正規化)、dApp ポーリングは 60 秒。書込みは 1 票あたり「受付 1 + dirty 1 + 送信 1 + 確定 1 + サマリー数回」で、想定規模(数十票/日)では余裕。**mainnet で Workers Paid($5/月)にすれば上限の心配は消える**旨を README に明記(推奨) |
docs/AUDIT-RESPONSE-2026-08-18.md:44:| M-11 | Medium | inflight は tick 内でメモリ集約し、変化があったときだけ tick 末尾に 1 回書く(同一キー 1 write/秒制限・後勝ちを回避)。30 tick ごとに直近提案のサマリーから `sent`/`pending` を拾い直す回復処理 |
docs/AUDIT-RESPONSE-2026-08-18.md:45:| Low-6 | Low | `MAX_BATCH` 既定 10、1..10 以外は起動時エラー |
docs/AUDIT-RESPONSE-2026-08-18.md:47:再検証: フォークテスト 10 本通過。Sepolia 再デプロイ `0x3C7fb408EE6A5c2732770110B6dd48527F360e26`(Sourcify exact_match、返金プール 0.02 ETH)。Prop 515 でクラウド通し(📢→🗳️→✅、Nouns 賛成 2 票)。`/api/proposals` 2 回目 54ms(キャッシュ命中)。
docs/AUDIT-RESPONSE-2026-08-18.md:52:| M-12 | Medium | dirty フラグを「削除」しない方式に変更: API は `dirty:{pid}` に受付時刻を書き、ワーカーは `dirty > sum.listedAt` なら再 list(listedAt は list **開始**時刻なので、list 中に届いた署名は次回必ず拾う)。加えて 20 分ごとの強制 list |
docs/AUDIT-RESPONSE-2026-08-18.md:53:| M-13 | Medium | 票キーの metadata に要約(support/枚数/tx/状態/受付時刻)を持たせ、`list` の metadata だけで一覧を作る(get なし)。署名本文は投函対象 ≤ MAX_BATCH(10)件だけ get。README の「Paid なら上限の心配が消える」を訂正(1 呼び出し 1,000 操作の上限は Paid でも同じ) |
docs/AUDIT-RESPONSE-2026-08-18.md:54:| M-11R | Medium | `inflight` キーを廃止。毎 tick、直近 15 提案のサマリー(get)と executed(get)から `txStatus:"sent"` / `pending` を検出して確定処理(read-modify-write なし、isolate 再生成の影響なし)。tickCount 依存をやめ時刻ベースに |
docs/AUDIT-RESPONSE-2026-08-18.md:55:| L-07 | Low | 全 KV キーを `<chainId>:<voterAddress>:` で名前空間化(再デプロイで旧記録が混ざらない。実環境で旧 Voter の executed 記録が消えたことを確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:63:| M-14 | Medium | **署名受付締切**を導入: `acceptDeadline = オンチェーン締切 − ceil((MIN_PENDING_AGE + cron 間隔 + 余裕 120s)/12)` ブロック(mainnet: 30 ブロック前)。API はこれ以降の署名を `accept_closed` で拒否(自分で投函する導線を案内)。ワーカーは受付締切以降は最小待機を無視して即時投函(境界の票を取り残さない)。dApp は「署名受付締切」と「オンチェーン締切」を分けて表示。`relayer-cf/test/accept-deadline.test.mjs` に境界テスト 4 本(`npm test`) |
docs/AUDIT-RESPONSE-2026-08-18.md:64:| L-08 | Low | 入力起因の例外(不正アドレス等)は 400 を返し通知しない。Discord 障害通知は KV / RPC / 送信などの内部エラーに限定(名前・メッセージで分類) |
docs/AUDIT-RESPONSE-2026-08-18.md:71:| M-14R | Medium | (1) **受付容量**: `submitCapacity = floor(((締切−現在)×12 − 余裕)/cron) × RUSH_BATCHES × MAX_BATCH`。API は投函待ち件数がこれ以上なら `capacity_full` で拒否し、手動投函/castVote へ誘導。(2) **rush 時は 1 tick で複数バッチ**(`RUSH_BATCHES` 既定 2、1..3)。サブリクエスト予算に収めるため、投函状態の書込みを「票ごとの KV put」から「サマリー 1 回」に集約(metadata は受付時の不変情報のみ、状態はサマリーが唯一の真実。再 list 時は既存サマリーとマージ)。(3) 境界テスト追加(`npm test` 6 本: 受付締切時点の容量 40、1 tick 分の 20、余裕未満で 0、1 日前 >2,100 等)。mainnet 既定(cron 120s、余裕 120s、2 バッチ×10)で受付締切時点の保証排出量は 40 票、それ以上の集中は API が受付時点で拒否するので「ok を返した票を落とす」ことはない |
docs/AUDIT-RESPONSE-2026-08-18.md:73:再検証: Worker テスト 6/6、Sepolia Prop 518 でクラウド通し(📢→🗳️→✅)。
docs/AUDIT-RESPONSE-2026-08-18.md:78:| B3-H01 | High | VoterRec に署名 digest を保存。**同一 timestamp + 同一 digest の再提出は「補完」**として未計上 token を同じ support に追加(投票者数は増やさない)。同一 timestamp で digest が異なる場合は StaleVote。フォークテストで「攻撃者が 1 枚だけ先行投函 → 正規リレイヤーが同一署名で残りを補完」を実証 |
docs/AUDIT-RESPONSE-2026-08-18.md:79:| B3-H02 | High | (1) `registrationDelayBlocks`: 登録から N ブロック経過するまで Snapshot 票を受け付けない(誤登録の検知・取消の猶予。mainnet では 50 ブロック程度を想定、owner 変更可)。(2) `unregisterProposal`: 1 票も計上されていなければ登録を取消して正しい対応で登録し直せる。(3) registrar は owner と別ロール(将来マルチシグ化)。登録時のオフチェーン検証(space/type/choices/期間)は登録スクリプト・mirror bot の手順に組み込み |
docs/AUDIT-RESPONSE-2026-08-18.md:80:| B3-H03 | High | `[env.mainnet.vars]` に `SNAPSHOT_SPACE="pnounsdao.eth"` を明示。cfg は mainnet で SNAPSHOT_SPACE 必須(fail-closed)。worker は起動後最初の tick でコントラクトの `spaceHash` と設定値の keccak を照合し、不一致なら処理を停止して警告 |
docs/AUDIT-RESPONSE-2026-08-18.md:81:| B3-M01 | Medium | snapmap キャッシュは正の対応だけ保存。未登録(0)は毎 tick 再照会 |
docs/AUDIT-RESPONSE-2026-08-18.md:82:| B3-M02 | Medium | `created_gt` cursor(KV) + skip ページング(最大 3 ページ/tick)。cursor は「反映済み/対象外」は即時、「送信分」は**採掘確定後**に前進。取得は昇順で欠落なし |
docs/AUDIT-RESPONSE-2026-08-18.md:83:| B3-M03 | Medium | 締切接近時(shouldRushSubmit)は 1 tick で RUSH_BATCHES(2)バッチを連続送信。resolveMappings が Snapshot の終了時刻を取得し、オンチェーン締切より遅い設定なら ⚠️ を一度だけ通知 |
docs/AUDIT-RESPONSE-2026-08-18.md:84:| B3-M04 | Medium | `from` を厳密に address 化(_parseAddress)し、**コードを持つアドレスは EIP-1271** `isValidSignature` で検証(EOA は ECDSA 一致)。EIP-6492(未デプロイのスマートウォレット)は対象外と明記。フォークテストで Mock1271 ウォレットの投票を実証。**副産物: ユーザーの実ウォレット(0x0bC7…)が EIP-7702 コード付きであることが判明し、この対応が本番の必須要件だったことを確認** |
docs/AUDIT-RESPONSE-2026-08-18.md:85:| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
docs/AUDIT-RESPONSE-2026-08-18.md:86:| B3-M06 | Medium | ハブ/IPFS 取得に timeout 8s・64KB 上限・status/shape 検証。エンベロープと GraphQL 行(voter/proposal/created)の照合。ゲートウェイ 2 系統フォールバック。CID 単位のメモリ backoff(5 回失敗で恒久スキップして cursor 前進)。一時失敗はその票で打ち切り、次 tick に再試行 |
docs/AUDIT-RESPONSE-2026-08-18.md:87:| B3-L01 | Low | /api/config に mode(snapshot/direct)。snapshot モードでは domain/types を返さず、/api/vote と /api/signatures は 410。dApp は提案別の Snapshot リンクと「投票締切(オンチェーン反映)」表示 |
docs/AUDIT-RESPONSE-2026-08-18.md:90:再検証: フォークテスト 15 本(H01 補完・H02 遅延/取消・M04 1271 を追加)、Worker 境界テスト 6 本、mainnet dry-run(SNAPSHOT_SPACE 継承)成功。Sepolia 再デプロイ `0x2acbd6a69896d2ef49d34fFEfb250Ed15f72500A`(Sourcify exact_match)。ライブ E2E は Snapshot ハブの日次提案上限のため保留(上限リセット後に実施)。
docs/AUDIT-RESPONSE-2026-08-18.md:95:| B3-H02R | High | (1) `registrationDelayBlocks` を**コンストラクタ引数**にし、デプロイスクリプトで設定 → 読み戻し検証。(2) Worker は **mainnet で規定値未満なら fail-closed**(`MIN_REGISTRATION_DELAY` 既定 300 ブロック、spaceHash と同時に確認)。(3) 取消の妨害対策として **Snapshot 由来の計上数を別カウント**(`snapshotVotesCounted`)し、`unregisterProposal` はそれが 0 なら可能(直接投票では妨害できない)。(4) さらに**猶予期間中は直接 `castVote` も拒否**。(5) registrar は引数で owner と別に指定可能(mainnet ではマルチシグ/別鍵)。※ delay は「誤登録に気づくための監視猶予」であり、悪意ある registrar を暗号学的に防ぐものではない点は信頼モデルとして残る(文書に明記) |
docs/AUDIT-RESPONSE-2026-08-18.md:96:| B3-H04 | High | cursor 設計を全面変更。**オンチェーンの `voterRec` を唯一の真実**とし、cursor は取得の最適化に徹する: 取得は `created_gte`(境界の秒を含む)、cursor は**未解決票の created を超えて進めない**。tx 成功時に cursor を進める処理を廃止し、次 tick で voterRec を見て「解決済み」になった分だけ前進。これにより (a) 同一秒 21 票、(b) 複数 tx の部分 revert、(c) 送信失敗・クラッシュ、いずれでも票を失わない。純関数 `planSubmission` に切り出し、**回帰テスト 5 本**を追加(同一秒 21 票 / 部分 revert / skip 扱い / やり直し・補完検出 / 全解決) |
docs/AUDIT-RESPONSE-2026-08-18.md:97:| B3-M01R | Medium | 対応付けキャッシュを廃止し、**毎 tick オンチェーンで再検証**(取消・再登録に追従。multicall 1 回) |
docs/AUDIT-RESPONSE-2026-08-18.md:98:| B3-M03R | Medium | 締切接近時は複数バッチで排出(既存)＋ Snapshot 終了がオンチェーン締切より遅い設定を検知して ⚠️ 通知。※「drain 不能なら自動処理を開始しない」は、票を全部捨てることになり実害が大きいため採用せず、**警告＋可能な限り排出**とした(判断を文書化) |
docs/AUDIT-RESPONSE-2026-08-18.md:99:| B3-M06R | Medium | 応答は **ReadableStream で 64KB 打ち切り**(Content-Length に依存しない)。取得失敗の票では **cursor を進めない**。20 回失敗した票のみデッドレター(KV に保存＋⚠️ 通知で手動対応可能に)し、黙って捨てない。ゲートウェイは 3 系統 |
docs/AUDIT-RESPONSE-2026-08-18.md:101:再検証: フォークテスト **16 本**、Worker テスト **11 本**(cursor 回帰 5 本を含む)。Sepolia 再デプロイ `0xFa8A9BBE8E22904Ad4d0f2840393b5088a159976`(Sourcify exact_match)。
docs/AUDIT-RESPONSE-2026-08-18.md:107:| 指摘1: 同一秒 300 件超で cursor 停滞 | High | ページ取得を **6 ページ(600 件)** に拡張し、**読み切れなかった場合は `complete=false` を返して cursor を一切進めない**(planSubmission が `blocked` で開始)。同時に ⚠️ 通知。回帰テスト追加(300 件処理済み + complete=false → advance 0、complete=true → advance T) |
docs/AUDIT-RESPONSE-2026-08-18.md:108:| 指摘2: NFT 移転後の補完票を見落とす | Medium | 補完要否の判定を「保有枚数 > 計上数」から **「未計上の tokenId が 1 枚でもあるか」** に変更。Worker は保有 tokenId ごとに `hasTokenVoted` を multicall で確認して `uncountedTokens` を作り、planSubmission に渡す。既定値は保守的に 0。回帰テスト追加(5 枚計上 → 手放して未計上 1 枚取得 → 補完対象と判定) |
docs/AUDIT-RESPONSE-2026-08-18.md:109:| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:110:| 指摘4: 恒久 revert 票が後続を塞ぐ | Medium | 個別 simulate の**決定的 revert のみ**回数を KV に記録し、5 回でデッドレター化(⚠️ 通知つき)。一時エラー(RPC 障害)は従来どおり再試行のみで回数を数えない |
docs/AUDIT-RESPONSE-2026-08-18.md:111:| 指摘5: 直近 15 件から外れた対応付け | Medium | ハブの直近 20 件に加え、**処理対象の Nouns 提案から `nounsToSnap` で逆引き**し、必要なら最大 200 件遡って Snapshot 提案を特定。投票期間中の対応付けを見失わない |
docs/AUDIT-RESPONSE-2026-08-18.md:113:再検証: フォークテスト **17 本**、Worker テスト **13 本**(300 件境界・token 入れ替えを追加)。Sepolia 再デプロイ `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`(Sourcify exact_match)。再利用方式のライブ E2E で 3 票 → 集計(賛成 3/棄権 3 → 投票者 2:1 で賛成)→ Nouns DAO に賛成 2 票を記録。
docs/AUDIT-RESPONSE-2026-08-18.md:114:なお B3-M03R(Snapshot 終了がオンチェーン締切より遅い設定)は運用条件として扱い、mainnet のリリース条件に「Snapshot 投票期間 + 排出余裕 < Nouns 締切」を明記する。
docs/AUDIT-RESPONSE-2026-08-18.md:119:| 600 件以上で cursor が永久停滞 | High | timestamp cursor と固定ページ上限を廃止。100 件×3ページの **window offset を KV に保存**し、window 内の未解決票がなくなった時だけ次へ進む。末尾で offset=0 に戻して全体を再走査するため、同一秒 601 件以上でも全行へ到達し、途中挿入も次周回で回収する。GraphQL モックで 601 件を 3 tick で全取得する回帰テストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:120:| 組合せ revert がデッドレターされない | High | 送信候補を **1 voter 1 票**へ正規化。同 timestamp は CID の辞書順で決定する。バッチ失敗後の個別切り分け結果を再度バッチ simulate し、それでも interaction revert する場合は先頭 1 票だけを送って次 tick の on-chain 状態から再評価する |
docs/AUDIT-RESPONSE-2026-08-18.md:121:| `hasTokenVoted` 照会増幅 | Medium | 補完候補を `created == voterRec.timestamp` に限定し、tokenId を全行で重複排除。最大 2,100 token を 200 件ずつ multicall する。600 行×100 token が一意な100照会になる回帰テストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:122:| B3-M03R | Medium | mainnet は Snapshot 終了後に `cron + submit buffer` の排出時間がない場合、または終了時刻不明の場合に **投函・execute とも fail-closed**。Discord 通知と境界テストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:127:Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッチ 1 投票者への正規化、hasTokenVoted の重複排除、mainnet の排出時間 fail-closed)を精査し、設計は妥当と判断。以下 1 点のみ修正した。
docs/AUDIT-RESPONSE-2026-08-18.md:129:- 確認したが問題なしと判断した点: (a) offset 巡回は on-chain voterRec を真実とするため、行の並びが不安定でも次周回で必ず拾える。(b) 送信対象が残っている間は offset を進めないので、window 内の未解決票を飛ばさない。(c) `uniqueVoterCandidates` は Snapshot ハブが (proposal, voter) で 1 行に集約するため通常は作動しないが、防御として妥当。(d) mainnet の fail-closed は execute も止めるため、Snapshot 終了時刻が不明・遅い場合は手動実行が必要になる(通知文に明記済み)。
docs/AUDIT-RESPONSE-2026-08-18.md:130:再検証: フォークテスト 17 本 / Worker テスト 17 本 / Sepolia ライブ E2E(Prop 526: 3 票 → 賛成 3・棄権 3 → 投票者 2:1 で賛成 → Nouns DAO に賛成 2 票)。
docs/AUDIT-RESPONSE-2026-08-18.md:141:| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/AUDIT-RESPONSE-2026-08-18.md:143:| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
docs/AUDIT-RESPONSE-2026-08-18.md:144:| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:146:| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
docs/AUDIT-RESPONSE-2026-08-18.md:147:| 7 | Low | 照合ロジックに回帰テストがない | 修正: `relayer-cf/test/link-check.test.mjs` を追加(前方一致・偽ドメイン・サブドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null・メタ文字の 22 ケース) |
docs/AUDIT-RESPONSE-2026-08-18.md:148:| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |
docs/AUDIT-RESPONSE-2026-08-18.md:150:問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/AUDIT-RESPONSE-2026-08-18.md:156:## 第11回監査 (2026-08-20, Codex CLI / read-only) — Sepolia 再デプロイの実地検証
docs/AUDIT-RESPONSE-2026-08-18.md:158:対象: 第10回対応 (75025cc) と Sepolia 再デプロイ (e11b170)。生ログ: `docs/audit-11-codex-raw.md`
docs/AUDIT-RESPONSE-2026-08-18.md:164:| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
docs/AUDIT-RESPONSE-2026-08-18.md:166:| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:167:| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
docs/AUDIT-RESPONSE-2026-08-18.md:169:| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
docs/AUDIT-RESPONSE-2026-08-18.md:170:| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
docs/AUDIT-RESPONSE-2026-08-18.md:172:| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
docs/AUDIT-RESPONSE-2026-08-18.md:173:| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/AUDIT-RESPONSE-2026-08-18.md:191:### 残課題 (mainnet 移行の前提)
docs/AUDIT-RESPONSE-2026-08-18.md:201:総括: High 0 件。第11回 High の「提案単位 fail-closed」と、重点確認を依頼した
docs/AUDIT-RESPONSE-2026-08-18.md:202:「締切後の自己 DoS」は**問題なし**と確認された(unresolved の 4 分類・execute 到達
docs/AUDIT-RESPONSE-2026-08-18.md:207:| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
docs/AUDIT-RESPONSE-2026-08-18.md:208:| 2 | Medium | `MIN_REGISTRATION_DELAY=abc` 等の不正値で `Math.max(300, NaN)=NaN` となり、下限 300 が消える | 修正: `cfg()` で非負整数を検証、不正なら throw |
docs/AUDIT-RESPONSE-2026-08-18.md:209:| 3 | Low | 末尾除去の 2 段 replace の順序により `…/989.後` を取りこぼす。`…/989偽` を受理する仕様の曖昧さ | 修正: 句読点と非 ASCII を 1 つの選択式にまとめ 1 パスで除去。`989偽` は「後置の文」とみなす仕様と明記(実在しないパスのため安全側)。指定 6 ケースをテスト追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:210:| 4 | Low | 確定 tx の通知は送信失敗するとトリガー(送信中レコード)が消えて再送されない | 修正: 失敗分を単一 KV キー `pendingnotes` に積み、次 tick 冒頭で再送(list API 不使用・上限 20 件・1 日で破棄) |
docs/AUDIT-RESPONSE-2026-08-18.md:211:| 5 | Low | 非 Snapshot モードの告知が通知前に「告知済み」を記録したまま | 修正: Snapshot 分岐と同じく送信成功後に記録 |
docs/AUDIT-RESPONSE-2026-08-18.md:213:問題なしと確認された点: unresolved の 4 分類(20 件ヒット/逆引きヒット/未登録/登録済み未発見)、
docs/AUDIT-RESPONSE-2026-08-18.md:215:mainnet 毎 tick 確認と 3 者 Set 判定(読み取り専用モードの誤停止なし・ABI 一致)、
docs/AUDIT-RESPONSE-2026-08-18.md:228:| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:229:| 2 | Medium | 孤児提案の経路が残存: 鍵は存在しても registrar 権限がない場合、Snapshot 送信後に NotRegistrar で落ちる | 修正: 送信前にオンチェーン preflight(コントラクト実在・registrar()/owner() との照合・nounsToSnap 未登録)を追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:230:| 3 | Medium | runbook の照合が循環(手順 3 の全項目✅は手順 4 以降を要求)。参照する deploy スクリプトが存在しない | 修正: `scripts/mainnet/deploy-snapvoter.js` を実装しフォークで実デプロイ検証(読み戻し・excluded 確認つき、DRY_RUN あり)。check-deploy を `--stage deployed/worker/funded/delegated/live` に分割し、runbook を各手順直後の段階照合に書き換え |
docs/AUDIT-RESPONSE-2026-08-18.md:231:| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
docs/AUDIT-RESPONSE-2026-08-18.md:232:| 5 | Low | pendingnotes: 重複送信・トリガー消失窓・上限超過 | 一部修正: 通知に tx hash の id を持たせ、積み直しと flush の重複を排除。KV put 失敗窓と 20 件上限は accepted risk として本表に記録(通知は補助機能であり、票・集計の正しさには影響しない) |
docs/AUDIT-RESPONSE-2026-08-18.md:233:| 6 | Low | 「989偽 → true」は fail-open 仕様 | 仕様として文書化(snap.js コメント + 本表)。この照合は取り違え事故検出の補助であり、厳密な防止は猶予+取消+公開が担う |
docs/AUDIT-RESPONSE-2026-08-18.md:234:| 7 | Low | Worker テストの残り穴(実投函 simulate/write、supplement、dead-letter、reconcile、非 Snapshot モード等)と mock の限界(KV 強整合・receipt 未実装等) | 既知の制限として記録。今回 3 テスト追加(猶予ゲート・hub errors 応答・pendingnotes 再送)で計 12 シナリオ。実投函経路はフォーク E2E(contracts 19 テスト)と Sepolia 実機 E2E が担保 |
docs/AUDIT-RESPONSE-2026-08-18.md:236:問題なし: MIN_REGISTRATION_DELAY の縁ケース("" は 0 → Math.max で 300、"300.5" throw)、
docs/AUDIT-RESPONSE-2026-08-18.md:240:**要 Sepolia 追随**: なし(コントラクト無変更)。Worker は再デプロイ済み。
docs/AUDIT-RESPONSE-2026-08-18.md:247:総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/AUDIT-RESPONSE-2026-08-18.md:251:| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
docs/AUDIT-RESPONSE-2026-08-18.md:252:| 2 | Medium | 登録が遅すぎて猶予明けが締切以降になる場合、専用警告なく「票ゼロ」で確定する(timelineSafe は eligibleAt を見ない) | 修正: `eligibleAt + 排出時間 >= deadline` を graceBad として検出。警告を出し、告知を抑止し、mainnet では処理を停止。テスト追加 ※この欠陥もこちらで事前に特定し監査依頼に明記していたもの |
docs/AUDIT-RESPONSE-2026-08-18.md:253:| 3 | Medium | MARGIN 未検証・EXPECT_MARGIN/EXPECT_BOT が任意・アドレスの checksum/ゼロ検証なし | 修正: deploy 側で MARGIN 10〜7200 の整数・全アドレスの getAddress + ゼロ拒否。check-deploy 側で mainnet の EXPECT_MARGIN(deployed 段階)・EXPECT_BOT(worker 段階)を必須化 |
docs/AUDIT-RESPONSE-2026-08-18.md:254:| 4 | Medium | RUNBOOK の `$ENV node …` は bash では実行できない(変数展開はコマンド扱い) | 修正: `env $ENV node …` に統一 |
docs/AUDIT-RESPONSE-2026-08-18.md:255:| 5 | Low | 実投函経路が未テスト | 修正: 票 1 件を simulate → writeContract → snapsent 保存まで通すテスト、復号 revert の振り分け(transient/恒久)、猶予境界 block==eligibleAt の 4 本を追加(計 17 シナリオ / relayer 43 テスト) |
docs/AUDIT-RESPONSE-2026-08-18.md:257:問題なし: 猶予ゲートの境界(block==eligibleAt で即投函・1 tick の無駄なし)、preflight の正当性
docs/audit-12-codex-raw.md:28:### 1. [前回 High] 提案単位の fail-closed
docs/audit-12-codex-raw.md:53:### 2. [前回 Medium] URL 末尾処理の回帰修正
docs/audit-12-codex-raw.md:66:### 3. [前回 Medium] mainnet 猶予下限の毎 tick 確認 + 絶対下限 300
docs/audit-12-codex-raw.md:67:`relayer-cf/src/worker.js`: mainnet では毎 tick、`Math.max(300, c.minRegistrationDelay)` と比較。
docs/audit-12-codex-raw.md:68:**検証観点**: spaceCheckedAt の更新タイミングと mainnet 分岐の関係。テストネットの
docs/audit-12-codex-raw.md:71:### 4. [前回 Medium] 3 者分離ガード
docs/audit-12-codex-raw.md:72:- `relayer-cf/src/worker.js`: mainnet で owner/registrar/relayer に同一アドレスが
docs/audit-12-codex-raw.md:74:- `scripts/create-and-register.mjs`: mainnet で REGISTRAR_MNEMONIC 未設定なら throw。
docs/audit-12-codex-raw.md:84:### 5. [前回 Low] 通知フラグを送信成功後に
docs/audit-12-codex-raw.md:92:日本語。指摘ごとに **[重大度 High/Medium/Low/Info] / 該当箇所 (file:line) / 何が起きるか /
docs/audit-12-codex-raw.md:93:推奨する修正**。「問題なし」も根拠つきで明示。憶測ではなく必ずコードを読むこと。
docs/audit-12-codex-raw.md:122:    High:
docs/audit-12-codex-raw.md:130:    Medium:
docs/audit-12-codex-raw.md:133:    - mainnet の登録猶予下限を毎 tick 確認に変更し、コード上の絶対下限 300 を併用
docs/audit-12-codex-raw.md:134:    - mainnet で REGISTRAR_MNEMONIC 未設定の fallback を禁止。owner/registrar/
docs/audit-12-codex-raw.md:138:    Low:
docs/audit-12-codex-raw.md:155: 問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
docs/audit-12-codex-raw.md:157: **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-12-codex-raw.md:161:+## 第11回監査 (2026-08-20, Codex CLI / read-only) — Sepolia 再デプロイの実地検証
docs/audit-12-codex-raw.md:163:+対象: 第10回対応 (75025cc) と Sepolia 再デプロイ (e11b170)。生ログ: `docs/audit-11-codex-raw.md`
docs/audit-12-codex-raw.md:169:+| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
docs/audit-12-codex-raw.md:171:+| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
docs/audit-12-codex-raw.md:172:+| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
docs/audit-12-codex-raw.md:174:+| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
docs/audit-12-codex-raw.md:175:+| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
docs/audit-12-codex-raw.md:177:+| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
docs/audit-12-codex-raw.md:178:+| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
docs/audit-12-codex-raw.md:196:+### 残課題 (mainnet 移行の前提)
docs/audit-12-codex-raw.md:216:     if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
docs/audit-12-codex-raw.md:321:+      // mainnet は毎 tick 確認(owner による事後の短縮を最大 30 分見逃さないため)
docs/audit-12-codex-raw.md:322:+      if (c.network === "mainnet" || Date.now() - spaceCheckedAt > SPACE_RECHECK_MS) {
docs/audit-12-codex-raw.md:329:+        // 第11回監査 M-14: mainnet で 3 つの役割が同一アドレスなら、鍵の分離ができていない。
docs/audit-12-codex-raw.md:331:+        if (c.network === "mainnet") {
docs/audit-12-codex-raw.md:333:+          const same = [ownerAddr, registrarAddr, relayerAddr].filter(Boolean).map((a) => String(a).toLowerCase());
docs/audit-12-codex-raw.md:337:-        if (c.network === "mainnet" && Number(delay) < c.minRegistrationDelay) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${c.minRegistrationDelay} 未満です`)); return; } // H02R: fail-closed
docs/audit-12-codex-raw.md:340:+        if (c.network === "mainnet" && Number(delay) < floor) { await notifyError(c, "config", new Error(`registrationDelayBlocks(${delay}) が最低値 ${floor} 未満です`)); return; }

exec
/bin/bash -lc "nl -ba docs/AUDIT-RESPONSE-2026-08-18.md | sed -n '104,265p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   104	## 再監査(第 9 回・B3)への対応
   105	| ID | 重大度 | 対応 |
   106	|---|---|---|
   107	| 指摘1: 同一秒 300 件超で cursor 停滞 | High | ページ取得を **6 ページ(600 件)** に拡張し、**読み切れなかった場合は `complete=false` を返して cursor を一切進めない**(planSubmission が `blocked` で開始)。同時に ⚠️ 通知。回帰テスト追加(300 件処理済み + complete=false → advance 0、complete=true → advance T) |
   108	| 指摘2: NFT 移転後の補完票を見落とす | Medium | 補完要否の判定を「保有枚数 > 計上数」から **「未計上の tokenId が 1 枚でもあるか」** に変更。Worker は保有 tokenId ごとに `hasTokenVoted` を multicall で確認して `uncountedTokens` を作り、planSubmission に渡す。既定値は保守的に 0。回帰テスト追加(5 枚計上 → 手放して未計上 1 枚取得 → 補完対象と判定) |
   109	| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
   110	| 指摘4: 恒久 revert 票が後続を塞ぐ | Medium | 個別 simulate の**決定的 revert のみ**回数を KV に記録し、5 回でデッドレター化(⚠️ 通知つき)。一時エラー(RPC 障害)は従来どおり再試行のみで回数を数えない |
   111	| 指摘5: 直近 15 件から外れた対応付け | Medium | ハブの直近 20 件に加え、**処理対象の Nouns 提案から `nounsToSnap` で逆引き**し、必要なら最大 200 件遡って Snapshot 提案を特定。投票期間中の対応付けを見失わない |
   112	
   113	再検証: フォークテスト **17 本**、Worker テスト **13 本**(300 件境界・token 入れ替えを追加)。Sepolia 再デプロイ `0x9b4AcC39f464d1F8A8F61A33E49f26Ea4688f5C1`(Sourcify exact_match)。再利用方式のライブ E2E で 3 票 → 集計(賛成 3/棄権 3 → 投票者 2:1 で賛成)→ Nouns DAO に賛成 2 票を記録。
   114	なお B3-M03R(Snapshot 終了がオンチェーン締切より遅い設定)は運用条件として扱い、mainnet のリリース条件に「Snapshot 投票期間 + 排出余裕 < Nouns 締切」を明記する。
   115	
   116	## 第 9 回再監査の残存リスクへの対応
   117	| ID | 重大度 | 対応 |
   118	|---|---|---|
   119	| 600 件以上で cursor が永久停滞 | High | timestamp cursor と固定ページ上限を廃止。100 件×3ページの **window offset を KV に保存**し、window 内の未解決票がなくなった時だけ次へ進む。末尾で offset=0 に戻して全体を再走査するため、同一秒 601 件以上でも全行へ到達し、途中挿入も次周回で回収する。GraphQL モックで 601 件を 3 tick で全取得する回帰テストを追加 |
   120	| 組合せ revert がデッドレターされない | High | 送信候補を **1 voter 1 票**へ正規化。同 timestamp は CID の辞書順で決定する。バッチ失敗後の個別切り分け結果を再度バッチ simulate し、それでも interaction revert する場合は先頭 1 票だけを送って次 tick の on-chain 状態から再評価する |
   121	| `hasTokenVoted` 照会増幅 | Medium | 補完候補を `created == voterRec.timestamp` に限定し、tokenId を全行で重複排除。最大 2,100 token を 200 件ずつ multicall する。600 行×100 token が一意な100照会になる回帰テストを追加 |
   122	| B3-M03R | Medium | mainnet は Snapshot 終了後に `cron + submit buffer` の排出時間がない場合、または終了時刻不明の場合に **投函・execute とも fail-closed**。Discord 通知と境界テストを追加 |
   123	
   124	再検証: Worker テストに 601 件巡回・同一 voter 正規化・tokenId 重複排除・timeline fail-closed 境界を追加。コントラクトは変更なし。
   125	
   126	### レビュー結果(第 9 回の修正を Claude 側で独立確認、2026-08-20)
   127	Codex による修正(timestamp cursor 廃止 → KV offset の巡回、1 バッチ 1 投票者への正規化、hasTokenVoted の重複排除、mainnet の排出時間 fail-closed)を精査し、設計は妥当と判断。以下 1 点のみ修正した。
   128	- **KV 書込み予算の退行(要修正・対応済み)**: 送るものが無い tick でも scan offset を無条件に KV へ書いていた(`put(scanK, ...)`)。通常運用(投票数 ≤ 300)では offset は常に 0 のままなので、毎分 1 write = 1,440 件/日となり、第 3 回監査(H-04R)で確保した無料枠(1,000 writes/日)を超える。**値が変化したときだけ書く**よう修正。
   129	- 確認したが問題なしと判断した点: (a) offset 巡回は on-chain voterRec を真実とするため、行の並びが不安定でも次周回で必ず拾える。(b) 送信対象が残っている間は offset を進めないので、window 内の未解決票を飛ばさない。(c) `uniqueVoterCandidates` は Snapshot ハブが (proposal, voter) で 1 行に集約するため通常は作動しないが、防御として妥当。(d) mainnet の fail-closed は execute も止めるため、Snapshot 終了時刻が不明・遅い場合は手動実行が必要になる(通知文に明記済み)。
   130	再検証: フォークテスト 17 本 / Worker テスト 17 本 / Sepolia ライブ E2E(Prop 526: 3 票 → 賛成 3・棄権 3 → 投票者 2:1 で賛成 → Nouns DAO に賛成 2 票)。
   131	
   132	---
   133	
   134	## 第10回監査 (2026-08-20, Codex CLI 0.145.0 / read-only) — 対応付けの自動照合
   135	
   136	対象: commit 0a98a23 (relayer の自動照合追加) と、それが依拠するコントラクト側の保証。
   137	生ログ: `docs/audit-10-codex-raw.md`
   138	
   139	| # | 重大度 | 指摘 | 対応 |
   140	|---|---|---|---|
   141	| 1 | **High** | ハブ障害で `resolveMappings()` が例外を投げると `snapByNouns` が空のまま処理が続き、`snapInfo=null` により照合(linkOk)も締切安全性(timeline)も素通りして `maybeExecute()` に到達。部分集計や "no votes" が最終結果として確定しうる | 修正: `mappingsResolved` を導入し、解決できなかった tick は告知・投函・execute を一切行わず `return` (fail-closed) |
   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
   143	| 3 | Medium | `announceNew()` が照合より先に走るため、不一致の Snapshot URL を先に告知し、かつ「告知済み」が記録されて再告知も止まる | 修正: 告知を照合・締切チェックの後ろへ移動。`linkBad` のときは告知しない。告知済み記録に snapId を含め、対応表を張り替えたら再告知する |
   144	| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
   145	| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
   146	| 6 | Low | `linkwarn` フラグを Discord 送信の前に立てるため、送信失敗しても 7 日間「通知済み」扱い | 修正: `notify()` が成否を返すようにし、2xx のときだけフラグを立てる (`endwarn` も同様) |
   147	| 7 | Low | 照合ロジックに回帰テストがない | 修正: `relayer-cf/test/link-check.test.mjs` を追加(前方一致・偽ドメイン・サブドメイン・大文字・クエリ/フラグメント/末尾スラッシュ・null・メタ文字の 22 ケース) |
   148	| 8 | Low | `space` の長さが無制限で、deploy/execute の gas を膨張させうる | 修正: コンストラクタで 1〜64 bytes を強制 (`InvalidSpace`) |
   149	
   150	問題なしと確認された点: `linkwarn` の KV write 予算 (1 提案 7 日につき 1 write)、`continue` による cursor/offset/dead-letter の整合性、delay の全投票入口への適用、`spaceHash` と `space` の一致。
   151	
   152	**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
   153	
   154	---
   155	
   156	## 第11回監査 (2026-08-20, Codex CLI / read-only) — Sepolia 再デプロイの実地検証
   157	
   158	対象: 第10回対応 (75025cc) と Sepolia 再デプロイ (e11b170)。生ログ: `docs/audit-11-codex-raw.md`
   159	※ Codex のサンドボックスは RPC に到達できず、B 項目 (オンチェーン) は Codex 側「未確認」。
   160	　こちらで実測した結果を下表に併記する。
   161	
   162	| # | 重大度 | 指摘 | 対応 |
   163	|---|---|---|---|
   164	| 1 | **High** | fail-closed が「ハブ例外」しか止めていない。ハブが正常に 0 件を返した場合や、登録済みなのに取得範囲 (200 件) 外で Snapshot 提案を特定できない場合は `mappingsResolved=true` のまま `snapInfo=null` で進み、締切後に `maybeExecute()` へ到達して部分集計や "no votes" が確定しうる | 修正: `resolveMappings()` が「登録済みだが未解決」の Nouns ID を返すようにし、該当提案は告知・投函・execute・"no votes" 確定をすべて停止 (警告つき)。あわせて Snapshot モードでは対応付けの取れた提案のみ execute 対象にした |
   165	| 2 | Info | 自己申告 URL の限界と取消条件の資料修正は妥当。コードと主張が一致 | 対応不要 |
   166	| 3 | Medium | URL 解析化により、旧正規表現では拾えていた「末尾の句読点」「直後の日本語」の検出が回帰していた | 修正: URL 候補末尾の句読点・閉じ括弧・非 ASCII を除去してから解析。Markdown リンク・全角句読点・改行を含む 9 ケースのテストを追加 |
   167	| 4 | Low | 告知済みレコードを Discord 送信より先に保存しており、送信失敗で永久に未告知になる | 修正: 送信 2xx 後に保存 |
   168	| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
   169	| 6 | Low | `notified:tx`・残高警告・告知が通知前にフラグを立てている | 修正: いずれも送信成功後に立てる |
   170	| 7 | Low | 回帰テストが純関数のみ。Worker 経路 (ハブ 0 件・告知順序・mainnet 差分等) が未検証 | 一部対応 (URL 25 ケース + 再登録テスト)。**Worker レベルの状態遷移テストは未着手** — `tick()` の RPC/Hub/KV/通知を注入可能にする改修が必要 |
   171	| 8 | Info | `InvalidSpace` の 1〜64 bytes は妥当 | 対応不要 |
   172	| 13 | Medium | mainnet の登録猶予下限が「30 分ごとの確認」かつ環境変数で下げられるため、厳密な保証ではない | 修正: mainnet は毎 tick 確認。下限をコード上の絶対値 300 と `MIN_REGISTRATION_DELAY` の大きい方に固定 |
   173	| 14 | Medium | 3 者分離時の落とし穴 (registrar 鍵の fallback、owner の緊急上書き権限、マルチシグ移管漏れ、KV namespace 移行) | 一部対応: mainnet で `REGISTRAR_MNEMONIC` 未設定を失敗させ、owner/registrar/relayer が同一アドレスなら Worker を fail-closed に。**runbook (デプロイ後の機械照合、liveMode=false → 委任 → liveMode=true の順序固定) は未作成** |
   174	
   175	### B. デプロイ確認 (Codex は未確認 → こちらで実測)
   176	
   177	| 項目 | 実測値 | 判定 |
   178	|---|---|---|
   179	| `keccak256(eth_getCode)` | `0x918a038a53b1672897f73100e684200a72767fc50950d9c9cd553a92c3184327` | Codex がソースから独立に算出した期待値と**完全一致** |
   180	| runtime サイズ | 14,780 bytes | 期待どおり |
   181	| `space` / `spaceHash` | `earl-grey.eth` / `0x069910a7…2730` | keccak256(space) と一致。Codex の期待値とも一致 |
   182	| `registrationDelayBlocks` / `marginBlocks` | 5 / 5 | 意図どおり |
   183	| `liveMode` / `refundEnabled` | true / true | 意図どおり |
   184	| `owner` / `registrar` | ともに `0x10849D31…8925` | テストネットは意図的に同一 |
   185	| 新コントラクト残高 | 0.02 ETH | 意図どおり |
   186	| 旧コントラクト残高 | 0 ETH | 回収済み |
   187	| Nouns 委任 | delegator → 新アドレス。新 2 票 / 旧 0 票 | 移行済み |
   188	| トレジャリー `excluded` | true | 意図どおり |
   189	| Worker `/api/config` | network=sepolia, metagov=`0x64CdACe…693F` | 稼働中 Worker も新アドレス |
   190	
   191	### 残課題 (mainnet 移行の前提)
   192	
   193	- Worker レベルの状態遷移テスト (指摘 7)
   194	- 本番構成 runbook と 3 者分離のリハーサル (指摘 14)
   195	
   196	---
   197	
   198	## 第12回監査 (2026-08-20, Codex CLI / read-only) — 第11回修正の検証
   199	
   200	対象: commit 3ca7528 のみ。生ログ: `docs/audit-12-codex-raw.md`
   201	総括: High 0 件。第11回 High の「提案単位 fail-closed」と、重点確認を依頼した
   202	「締切後の自己 DoS」は**問題なし**と確認された(unresolved の 4 分類・execute 到達
   203	条件・reconcile の安全性をコードで追跡のうえ)。
   204	
   205	| # | 重大度 | 指摘 | 対応 |
   206	|---|---|---|---|
   207	| 1 | Medium | 3 者分離チェックが機能していない。比較相手の `MAINNET_PROPOSER_MNEMONIC` はどこにも定義のない幻の変数で、常に発火しない死にコード。さらに検証が Snapshot 送信「後」のため、失敗時に孤児提案が残る | 修正: 鍵・RPC・deployments の検証をすべて Snapshot 送信前に移動。mainnet では `SNAPSHOT_BOT_MNEMONIC` と `REGISTRAR_MNEMONIC` を個別必須化(fallback 禁止)し、実際に使う鍵から導出したアドレス同士で比較 |
   208	| 2 | Medium | `MIN_REGISTRATION_DELAY=abc` 等の不正値で `Math.max(300, NaN)=NaN` となり、下限 300 が消える | 修正: `cfg()` で非負整数を検証、不正なら throw |
   209	| 3 | Low | 末尾除去の 2 段 replace の順序により `…/989.後` を取りこぼす。`…/989偽` を受理する仕様の曖昧さ | 修正: 句読点と非 ASCII を 1 つの選択式にまとめ 1 パスで除去。`989偽` は「後置の文」とみなす仕様と明記(実在しないパスのため安全側)。指定 6 ケースをテスト追加 |
   210	| 4 | Low | 確定 tx の通知は送信失敗するとトリガー(送信中レコード)が消えて再送されない | 修正: 失敗分を単一 KV キー `pendingnotes` に積み、次 tick 冒頭で再送(list API 不使用・上限 20 件・1 日で破棄) |
   211	| 5 | Low | 非 Snapshot モードの告知が通知前に「告知済み」を記録したまま | 修正: Snapshot 分岐と同じく送信成功後に記録 |
   212	
   213	問題なしと確認された点: unresolved の 4 分類(20 件ヒット/逆引きヒット/未登録/登録済み未発見)、
   214	締切後の自己 DoS 不在(execute 窓は margin 期間 = state Active 中で、必ず逆引き対象)、
   215	mainnet 毎 tick 確認と 3 者 Set 判定(読み取り専用モードの誤停止なし・ABI 一致)、
   216	unresolved 警告の KV 負荷(1 提案 1 write/7 日)。
   217	
   218	テスト: relayer 26 pass / contracts 19 pass。コントラクト無変更(Worker のみ再デプロイ)。
   219	
   220	---
   221	
   222	## 第13回監査 (2026-08-20, Codex CLI / read-only) — 第12回修正 + テスト/runbook/3者分離の検証
   223	
   224	対象: 3e02162, cc423e3。生ログ: `docs/audit-13-codex-raw.md`
   225	
   226	| # | 重大度 | 指摘 | 対応 |
   227	|---|---|---|---|
   228	| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
   229	| 2 | Medium | 孤児提案の経路が残存: 鍵は存在しても registrar 権限がない場合、Snapshot 送信後に NotRegistrar で落ちる | 修正: 送信前にオンチェーン preflight(コントラクト実在・registrar()/owner() との照合・nounsToSnap 未登録)を追加 |
   230	| 3 | Medium | runbook の照合が循環(手順 3 の全項目✅は手順 4 以降を要求)。参照する deploy スクリプトが存在しない | 修正: `scripts/mainnet/deploy-snapvoter.js` を実装しフォークで実デプロイ検証(読み戻し・excluded 確認つき、DRY_RUN あり)。check-deploy を `--stage deployed/worker/funded/delegated/live` に分割し、runbook を各手順直後の段階照合に書き換え |
   231	| 4 | Medium | check-deploy が危険な構成を成功扱い: excluded 未確認・EXPECT 未指定の素通り・EXPECT_RELAYER なし・bot の分離未検査・delegates(マルチシグ) 未確認・委任照会失敗が警告止まり・delay 7200 未検証 | 修正: mainnet では EXPECT_OWNER/REGISTRAR/EXCLUDED(+worker 以降 RELAYER、delegated 以降 DELEGATOR)を必須化。EXPECT_DELAY 既定 7200、EXPECT_BOT で 4 者分離、delegates() 照合、照会失敗は fail、live 前は liveMode=false を要求 |
   232	| 5 | Low | pendingnotes: 重複送信・トリガー消失窓・上限超過 | 一部修正: 通知に tx hash の id を持たせ、積み直しと flush の重複を排除。KV put 失敗窓と 20 件上限は accepted risk として本表に記録(通知は補助機能であり、票・集計の正しさには影響しない) |
   233	| 6 | Low | 「989偽 → true」は fail-open 仕様 | 仕様として文書化(snap.js コメント + 本表)。この照合は取り違え事故検出の補助であり、厳密な防止は猶予+取消+公開が担う |
   234	| 7 | Low | Worker テストの残り穴(実投函 simulate/write、supplement、dead-letter、reconcile、非 Snapshot モード等)と mock の限界(KV 強整合・receipt 未実装等) | 既知の制限として記録。今回 3 テスト追加(猶予ゲート・hub errors 応答・pendingnotes 再送)で計 12 シナリオ。実投函経路はフォーク E2E(contracts 19 テスト)と Sepolia 実機 E2E が担保 |
   235	
   236	問題なし: MIN_REGISTRATION_DELAY の縁ケース("" は 0 → Math.max で 300、"300.5" throw)、
   237	create-and-register の副作用なし fail(dry-run/fetch 失敗)、非 Snapshot 告知の順序統一、
   238	テストフックの本番無影響、/api/config の relayer 公開。
   239	
   240	**要 Sepolia 追随**: なし(コントラクト無変更)。Worker は再デプロイ済み。
   241	
   242	---
   243	
   244	## 第14回監査 (2026-08-20, Codex CLI / read-only) — 第13回修正の最終確認
   245	
   246	対象: 1be9d16。生ログ: `docs/audit-14-codex-raw.md`
   247	総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
   248	
   249	| # | 重大度 | 指摘 | 対応 |
   250	|---|---|---|---|
   251	| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
   252	| 2 | Medium | 登録が遅すぎて猶予明けが締切以降になる場合、専用警告なく「票ゼロ」で確定する(timelineSafe は eligibleAt を見ない) | 修正: `eligibleAt + 排出時間 >= deadline` を graceBad として検出。警告を出し、告知を抑止し、mainnet では処理を停止。テスト追加 ※この欠陥もこちらで事前に特定し監査依頼に明記していたもの |
   253	| 3 | Medium | MARGIN 未検証・EXPECT_MARGIN/EXPECT_BOT が任意・アドレスの checksum/ゼロ検証なし | 修正: deploy 側で MARGIN 10〜7200 の整数・全アドレスの getAddress + ゼロ拒否。check-deploy 側で mainnet の EXPECT_MARGIN(deployed 段階)・EXPECT_BOT(worker 段階)を必須化 |
   254	| 4 | Medium | RUNBOOK の `$ENV node …` は bash では実行できない(変数展開はコマンド扱い) | 修正: `env $ENV node …` に統一 |
   255	| 5 | Low | 実投函経路が未テスト | 修正: 票 1 件を simulate → writeContract → snapsent 保存まで通すテスト、復号 revert の振り分け(transient/恒久)、猶予境界 block==eligibleAt の 4 本を追加(計 17 シナリオ / relayer 43 テスト) |
   256	
   257	問題なし: 猶予ゲートの境界(block==eligibleAt で即投函・1 tick の無駄なし)、preflight の正当性
   258	(owner による登録は正常系)、deploy の読み戻し・FORCE 保護、stage 分割と RUNBOOK の整合、
   259	pendingnotes の id 重複排除。
   260	
   261	テスト: relayer 43 pass / contracts 19 pass。コントラクト無変更(Worker のみ再デプロイ)。

exec
/bin/bash -lc 'for f in docs/audit-{10,11,12,13,14}-codex-raw.md; do echo "$f"; tail -n 220 "$f" | rg -n "監査結果|結論|mainnet|保留|High|Medium|Low|Info|accepted|受容|未対応|Sepolia|テスト"; done' in /mnt/data/pnouns-voter
 succeeded in 0ms:
docs/audit-10-codex-raw.md
4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
11:- Hub 障害、GraphQL `errors`、フィールド `null` の各ケースについて worker レベルの回帰テストを追加する。
13:## [Medium] URL 照合は「提案本文の自己申告」であり、悪意ある対応付けを検出できない
49:## [Medium] 不一致を判定する前に、誤った Snapshot 提案を Discord へ告知する
60:4. mainnet の投函・execute を停止
72:## [Medium] 「1票でも計上されると取消不可」は直接投票を含めると事実ではない
80:そのため、直接 `castVote()` で tally・`voterRec`・bitmap が更新済みでも、Snapshot 署名が未受理なら取消できます。既存テストもこの挙動を明示的に期待しています。
86:- 初回票・補完票で新規 token がゼロなら `NothingCounted` でトランザクション全体が revert し、accepted は増えません。
87:- やり直し票は新規 token がゼロでも choice/record を更新でき、その成功後に accepted が増えます。
88:- accepted 加算はループ全体の成功後なので、部分受理もありません。
96:## [Medium] 24時間 delay は固定保証ではなく、owner が事後に短縮できる
114:## [Low] 警告送信失敗後も7日間通知済み扱いになる
131:## [Low] 今回の照合ロジックに回帰テストがない
137:現行の `relayer-cf` テストは cursor と受付締切が中心で、次を検証していません。
151:## [Low] `space` は無制限長で、deployment/execute gas を増やせる
167:### [Info] `linkwarn` 単体では毎 tick write の回帰はない
175:### [Info] `continue` は cursor/offset/dead-letter を進めない
181:### [Info] delay は全投票入口に実装されている
189:### [Info] `spaceHash` と `space` は通常経路では不一致にならない
199:- mainnet RPC が必要な fork test は実行せず、ソース上の既存テストを確認。
docs/audit-11-codex-raw.md
7:### 3. [重大度 Medium] URL解析に句読点・全角後置文字の検出回帰がある
22:以前の正規表現は数字と句読点・全角文字の境界で `\b` が成立するため、末尾句読点や日本語後置文字を検出できるケースがありました。したがって実際の回帰です。現在のテストは偽ドメイン、大小文字、prefix、query等は良好ですが、Markdown、ASCII/全角句読点、日本語に挟まれたURL、改行分断を網羅していません。
26:URL候補末尾からUnicode句読点を安全に除去してから解析するか、Markdownパーサー等でリンク先を抽出してください。分断URLを許容しないなら、その仕様を明示してfalseのテストを追加してください。
28:### 4. [重大度 Low] 告知順序は改善したが、旧告知形式と送信失敗に問題が残る
35:- mainnetでは`linkBad`・`timelineBad`とも告知、投函、executeを停止します。
41:今回のSepolia再デプロイではKV namespaceにVoterアドレスが含まれるため、旧コントラクトのISOレコードとは分離され、この移行自体では旧形式問題は通常発生しません。
47:### 5. [重大度 Info] `eligibleAtBlock`の登録時確定は正しく実装
59:推奨する修正: 再登録を同じNouns IDで行い、新しい`eligibleAtBlock`を直接比較するテストを追加すると境界がより明確です。
61:### 6. [重大度 Low] `notify()`戻り値の利用は一部だけ
79:### 7. [重大度 Low] 回帰テストは純関数のみで、重要なWorker経路が未検証
85:追加された22ケースはURL純関数には有用です。しかし前回推奨した以下のテストがありません。
91:- mainnet/testnet差分
96:推奨する修正: `tick()`のRPC、Hub、KV、時刻、通知を注入可能にしてWorkerレベルの状態遷移テストを追加してください。
98:### 8. [重大度 Info] `InvalidSpace`の1～64 bytes境界は妥当
106:推奨する修正: 0、1、64、65 bytesおよびマルチバイト文字の境界テストを追加してください。
110:### 9. [重大度 Info] 新コントラクト状態 — オンチェーン未確認
125:- Sepolia pNouns treasuryの`excluded`
135:### 10. [重大度 Info] バイトコード一致 — ローカル再現済み、オンチェーン比較は未確認
145:- Sepoliaのimmutable値を埋めた期待runtimeは14,780 bytes
153:### 11. [重大度 Info] 旧残高・Nouns委任 — 未確認
163:### 12. [重大度 Info] Worker設定ファイルは新アドレス、mainnetは無効状態
169:- Sepolia `VOTER`は新アドレスです。
171:- mainnetは別env・別Worker名で、VOTERとKVがplaceholderのため、通常のSepolia deployで有効化されません。
178:### 13. [重大度 Medium] mainnetの300ブロック下限は厳密なfail-closed保証ではない
184:- 初回および30分ごとの確認時には、mainnetでdelayが設定下限未満なら処理を停止します。
191:mainnetでは毎tick確認し、下限をコード上で最低300に固定してください。さらに提案ごとの`eligibleAtBlock - registeredAtBlock >= 300`を投函前に検証すると、グローバル設定変更後の新規登録も確実に停止できます。
193:### 14. [重大度 Medium] 3者分離時の運用・スクリプト上の落とし穴
200:- 現行作成スクリプトはSnapshot botに`SEPOLIA_MNEMONIC`を使用し、registrarも`REGISTRAR_MNEMONIC`未設定時は同じmnemonicへfallbackします。mainnetで設定漏れすると再び同一鍵になります。
208:- mainnetで各鍵を必須変数化し、fallbackを禁止する。
215:Sepoliaテストの継続は可能ですが、mainnet移行判定は保留を推奨します。最低限、次の2点が必要です。
220:テスト結果: Workerテスト3ファイルpass。`git diff --exit-code`はcleanで、ファイル変更はありません。
docs/audit-12-codex-raw.md
6:## テスト結果
17:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
19:ただし、`resolveMappings()` の4分類、Workerのstate遷移、通知失敗後の再送、mainnet設定検査を直接検証するテストはありません。今回見つかった問題を含め、Worker依存を注入可能にして回帰テストを追加することを推奨します。
24:## 監査結論
28:- High: 0件
29:- Medium: 2件
30:- Low: 3件
31:- Info／問題なし: 主要4項目
37:### [重大度 Medium] / [scripts/create-and-register.mjs:54](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:54), [scripts/create-and-register.mjs:71](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:71) / 提案作成鍵との分離チェックが実質的に機能しない
39:Snapshot 提案作成者 `bot` は、mainnet を含め常に `SEPOLIA_MNEMONIC` から生成されています。
52:さらに mainnet 用の registrar 必須チェックは、Snapshot 提案を外部送信した後に実行されます（同ファイル58–63行）。未設定の場合、Snapshot 提案だけ作られ、オンチェーン登録されない孤児提案が残ります。
56:- mainnet では提案作成に明示的な `MAINNET_PROPOSER_MNEMONIC` を使用し、必須化する。
59:- mainnet では proposer、registrar、可能なら relayer の3アドレスが相互に異なることを送信前に確認する。
61:### [重大度 Medium] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54), [relayer-cf/src/worker.js:423](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:423) / 不正な環境変数で絶対下限300を迂回できる
75:現在の mainnet `wrangler.toml` はこの変数を設定していないため既定値300となり、現構成では問題は発生しません。
82:### [重大度 Low] / [relayer-cf/src/snap.js:53](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:53) / 任意の非ASCII文字をURLの一部ではなく後置文として除去するため、誤検出が残る
91:最後の例は、URLとして解析すればパスは `/vote/989%E5%81%BD` ですが、解析前に `偽` が除去されるため `/vote/989` として受理されます。テスト中の `.../989後に投票` を受理する要件とは本質的に曖昧であり、日本語をURLの一部と後置文に字句上区別できません。
103:- 少なくとも以下をテストへ追加する。
111:### [重大度 Low] / [relayer-cf/src/worker.js:101](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:101), [relayer-cf/src/worker.js:139](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:139) / tx通知失敗時、フラグは保存されないが再送経路も失われる
126:### [重大度 Low] / [relayer-cf/src/worker.js:53](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:53) / 非Snapshotモードの告知は依然として通知前に告知済みになる
135:の順です。通知失敗後は永久に再告知されません。mainnet は `SNAPSHOT_SPACE` 必須なので本番mainnetには影響しませんが、サポートされている非Snapshotモードでは残存しています。
143:### [重大度 Info] / [relayer-cf/src/snap.js:65](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:65) / `unresolved` の4分類は正しい
162:### [重大度 Info] / [relayer-cf/src/worker.js:428](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:428), [relayer-cf/src/worker.js:489](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:489) / 締切後の自己DoS・残存fail-openは認められない
172:です。したがって通常のexecute窓は、Nouns DAO提案がまだ Active の margin期間内です。そのtickでもstate 1として逆引き対象になり、`snapInfo` を取得できます。
178:- 未登録提案は `unresolved` ではないものの、`snapInfo` がないためexecuteされない。
187:### [重大度 Info] / [relayer-cf/src/worker.js:407](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:407) / mainnet毎tick確認と3者Set判定は正しい
189:- mainnetは `spaceCheckedAt` に関係なく毎tick確認。
192:- mainnet設定のcronは2分間隔なので、追加multicallは約720回/日。1回に4 readを集約しており、KV無料枠には影響しません。RPC利用量は増えますが、既存の提案・mapping照会と比較して限定的です。
197:### [重大度 Info] / [relayer-cf/src/worker.js:448](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:448) / unresolved警告のKV負荷は許容範囲
205:## テスト結果
216:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
218:ただし、`resolveMappings()` の4分類、Workerのstate遷移、通知失敗後の再送、mainnet設定検査を直接検証するテストはありません。今回見つかった問題を含め、Worker依存を注入可能にして回帰テストを追加することを推奨します。
docs/audit-13-codex-raw.md
25:mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
27:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
31:### [High] 登録猶予中の正常票が dead-letter 化される
33:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
35:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
39:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
41:[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
43:### [Medium] check-deployが危険な構成を成功扱いし得る
48:- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
55:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
57:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
59:[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
63:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
70:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
72:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
74:[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
88:- timelineBadのmainnet/testnet差分
89:- mainnetでdelayを次tickに再確認する経路
96:- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
98:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
102:- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
106:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
110:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
114:## テスト結果
116:- `relayer-cf/npm test`: 成功。4テストファイルすべてpass。
119:- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
125:mainnet 移行は現状では見送りを推奨します。High 1件、Medium 3件、Low 3件です。
127:最重要なのは、`REG_DELAY=7200` の猶予中に投票された Snapshot 票が約10分で dead-letter 化され得る点です。Sepolia の3者分離実測は前提として受け入れますが、この不具合は今回のリハーサル・9シナリオでは検出されていません。
131:### [High] 登録猶予中の正常票が dead-letter 化される
133:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
135:### [Medium] Snapshot送信後の登録失敗経路がまだ残る
139:### [Medium] runbookの順序では初回照合を通過できず、デプロイスクリプトも存在しない
141:[docs/RUNBOOK-MAINNET.md:23](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:23)、[docs/RUNBOOK-MAINNET.md:35](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:35)、[docs/RUNBOOK-MAINNET.md:44](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44)、[docs/RUNBOOK-MAINNET.md:59](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:59) / 手順3はWorker配備、プール入金、委任より前ですが、`check-deploy.mjs` はWorker relayer、プール残高、委任を必須判定します。新規mainnetでは「全項目✅になるまで手順4へ進めない」と「手順4以降を行わないと✅にならない」が循環します。また `scripts/mainnet/deploy-snapvoter.js` は履歴を含め存在せず、手順2は実行不能です。 / 実在する本番専用デプロイスクリプトを先に実装・テストしてください。照合は「デプロイ直後」「Worker配備後」「入金後」「委任後」「live化後」に分割し、各段階の期待状態を引数化してください。
143:### [Medium] check-deployが危険な構成を成功扱いし得る
148:- `EXPECT_OWNER` / `EXPECT_REGISTRAR` はmainnetでも任意なので、未指定なら誤った別アドレスでも通ります。
155:/ mainnetでは全 EXPECT 値を必須化し、treasury除外、`delegates(EXPECT_OWNER)`、期待delay/margin/liveMode、Snapshot botを含む4者分離をfail-closedで照合してください。委任照会失敗もエラー終了にすべきです。
157:### [Low] pendingnotesは上限超過・KV障害・重複に弱い
159:[relayer-cf/src/worker.js:22](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22)、[relayer-cf/src/worker.js:30](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:30)、[relayer-cf/src/worker.js:165](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:165) / mainnetでflushの追加readは720/日、Sepoliaで1,440/日であり、100,000 read/日の範囲では問題ありません。Discord障害中も既存20件の再送失敗だけではwriteしません。一方、新たな確定通知ごとに1 putされ、20件上限はwrite回数の上限ではありません。最大2,100投票者・10件/txなら1提案最大約210 putで、同時に5提案あれば通知キューだけで1,050 putとなり得ます。また21件目から古い通知をTTL前に捨てます。
163:### [Low] URL統合は機械的には成功したが、`989偽=true` はfail-open仕様
170:単一選択式への統合で交互末尾の取りこぼしは解消しました。ただし「実在しないパスなので安全側」という説明は逆で、無効な `/vote/989偽` を有効な参照として受け入れるため安全性としてはfail-openです。自然な日本語後置文を許容する製品仕様としては成立しますが、厳密な誤登録防止とは扱わないでください。 / 安全性優先なら除去対象を明示的な句読点・閉じ括弧に限定してください。現仕様を維持するならaccepted riskとして文書化してください。
172:### [Low] Workerテストは重要な制御点を押さえたが、mockが実投函を通さない
174:[relayer-cf/test/worker-tick.test.mjs:21](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:21)、[relayer-cf/test/worker-tick.test.mjs:33](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:33)、[relayer-cf/test/worker-tick.test.mjs:53](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:53) / 9シナリオは、ハブ障害fail-closed、正常0件unresolved、告知順序、告知再送、コード下限300、3者同一、不正env、Sepoliaキャッシュ、未登録提案のno-votes抑止を回帰防止しています。ただし「GraphQL error」はネットワーク例外だけで、`errors`応答・HTTP・巨大/途中切断bodyは未検証です。Discord失敗時の `pendingnotes` writeも未検証です。
188:- timelineBadのmainnet/testnet差分
189:- mainnetでdelayを次tickに再確認する経路
196:- [問題なし] / [relayer-cf/src/chain.js:54](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:54)、[relayer-cf/src/worker.js:461](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:461) / `""→0` でもmainnetは `Math.max(300,0)`、`"300.5"`はthrow、`" 300 "`は300、`null`/未指定は300です。非負整数検証は前回問題を解消しています。 / 修正不要。
198:- [問題なし] / [scripts/create-and-register.mjs:44](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:44)、[scripts/create-and-register.mjs:52](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:52)、[scripts/create-and-register.mjs:62](/mnt/data/pnouns-voter/scripts/create-and-register.mjs:62) / nouns本文・Hub期間のfetch失敗はSnapshot送信前に終了し、副作用はありません。dry-runも送信前にreturnします。Sepoliaはbot=`SEPOLIA_MNEMONIC`、registrar=`REGISTRAR_MNEMONIC || SEPOLIA_MNEMONIC`で従来のfallbackを維持しています。mainnetの両mnemonic必須化と導出アドレス比較も正しく実装されています。 / 上記のオンチェーン権限preflightのみ追加してください。
202:- [問題なし] / [relayer-cf/src/worker.js:418](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:418)、[relayer-cf/src/index.js:213](/mnt/data/pnouns-voter/relayer-cf/src/index.js:213) / テストフックは `_clients` の初期値が従来の`clients`で、本番挙動は呼出しがない限り同一です。HTTPルートから呼べず、稼働Workerへ外部からimportして実行する経路もありません。露出リスクはソース内の誤用に限定されます。 / 現状で許容可能。可能ならテスト専用モジュールへの分離でさらに明確化できます。
206:- [問題なし・条件付き] / [docs/RUNBOOK-MAINNET.md:66](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:66) / `liveMode=false → 委任 → liveMode=true` の順序自体は安全です。委任後もlive化まではNouns DAOへ投票しません。 / 段階別照合とHigh修正後に採用可能です。
210:[Low] / [docs/RUNBOOK-MAINNET.md:73](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:73) / ロールバックはliveModeと委任・資金を戻しますが、Worker cron、GitHubの提案作成、Webhook、未処理KV、登録済み対応表、漏洩鍵の失効・ローテーションが残ります。また箇条書きではなく、`setLiveMode(false)`の採掘確認後に委任を戻す順序を固定すべきです。 / Worker停止、提案作成ジョブ停止、未処理状態の確認、必要なunregister、secret/webhookローテーションを追加してください。
214:## テスト結果
216:- `relayer-cf/npm test`: 成功。4テストファイルすべてpass。
219:- `npx hardhat test --no-compile`: **19 passing**。mainnet forkを含めRPC不達なし。
docs/audit-14-codex-raw.md
21:- [問題なし] hardhat mainnet 追加  
22:  既存の sepolia/hardhat 設定を変更しておらず、mainnet ネットワークを選択しない既存コマンドへの影響はありません。
28:  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22) で同一tx idの再追加を防ぎ、flush時も同一idを1回だけ扱います。`id=null` は従来どおり各通知を独立して処理するため、既存経路への悪影響はありません。並行tickや通知成功後の通信切断など、前回の accepted risk は残ります。
30:### [Low] 新テストは回帰防止として不十分な部分がある
34:猶予テストのケースAは「投函処理に入らない」ことを確認できています。ただし実際の票データは用意されておらず、「票が存在しても保持される」ことまでは検証していません。
46:GraphQL `errors` テストはfail-closedを適切に確認しています。pendingnotesテストも「失敗時に保存し、次tickで再送・削除」は確認していますが、新規追加された同一id重複排除そのものは未テストです。
50:## テスト結果
62:Node v24 の親ランナー表示では4テストファイル単位ですが、ソース上は合計38件です。追加で `worker-tick.test.mjs` を直接実行し、内部12シナリオすべて成功することも確認しました。
70:最終判断は「前回 High の主ゲートは修正済み。ただし ABI 不足、deadline/eligibleAt 検査、mainnet照合の必須値、RUNBOOKコマンドに修正が必要」です。
73:## 結論
75:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
77:ただし、コード面の最終確認としては Medium 相当の未解消点が4点あります。特に `RegistrationTooRecent` の二重防御は ABI 不足により機能していません。明日の E2E 前に少なくとも ABI と RUNBOOK コマンドは修正を推奨します。
79:### [Medium] RegistrationTooRecent の二重防御が機能しない
93:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
105:一括・個別 simulate の両方について、実際の `ContractFunctionRevertedError` を構築して `snapdrop` が増えないテストも追加すべきです。
107:### [Medium] eligibleAt が deadline 以降でも専用警告が出ない
122:推奨する修正: mainnet では最低でも `eligibleAt < deadline` を要求し、さらに排出時間を含めて `eligibleAt + requiredDrainBlocks < deadline` を検査してください。不成立なら告知・投函・execute を止め、明示的な警告を出すべきです。
124:### [Medium] deploy/check-deploy の margin・4者分離検証が未完
126:該当箇所: [deploy-snapvoter.js](/mnt/data/pnouns-voter/scripts/mainnet/deploy-snapvoter.js:14)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:64)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:66)、[check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:101)
137:推奨する修正: mainnet では `EXPECT_MARGIN` と `EXPECT_BOT` も必須化し、デプロイスクリプト側でも `MARGIN` を整数かつ運用上許容する範囲に限定してください。アドレスについても `ethers.getAddress()` とゼロアドレス拒否を入れるのが安全です。
139:### [Medium] RUNBOOK の `$ENV` コマンドはそのままでは実行できない
146:ENV="NETWORK=mainnet EXPECT_OWNER=..."
150:Bash は変数展開後の `NETWORK=mainnet` を環境変数代入ではなくコマンド名として扱うため、`NETWORK=mainnet: command not found` になります。
171:- [問題なし] hardhat mainnet 追加  
172:  既存の sepolia/hardhat 設定を変更しておらず、mainnet ネットワークを選択しない既存コマンドへの影響はありません。
178:  [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:22) で同一tx idの再追加を防ぎ、flush時も同一idを1回だけ扱います。`id=null` は従来どおり各通知を独立して処理するため、既存経路への悪影響はありません。並行tickや通知成功後の通信切断など、前回の accepted risk は残ります。
180:### [Low] 新テストは回帰防止として不十分な部分がある
184:猶予テストのケースAは「投函処理に入らない」ことを確認できています。ただし実際の票データは用意されておらず、「票が存在しても保持される」ことまでは検証していません。
196:GraphQL `errors` テストはfail-closedを適切に確認しています。pendingnotesテストも「失敗時に保存し、次tickで再送・削除」は確認していますが、新規追加された同一id重複排除そのものは未テストです。
200:## テスト結果
212:Node v24 の親ランナー表示では4テストファイル単位ですが、ソース上は合計38件です。追加で `worker-tick.test.mjs` を直接実行し、内部12シナリオすべて成功することも確認しました。
220:最終判断は「前回 High の主ゲートは修正済み。ただし ABI 不足、deadline/eligibleAt 検査、mainnet照合の必須値、RUNBOOKコマンドに修正が必要」です。

exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 1008ms:
✔ test/accept-deadline.test.mjs (787.695464ms)
✔ test/cursor.test.mjs (786.189676ms)
✔ test/link-check.test.mjs (808.869142ms)
✔ test/worker-tick.test.mjs (887.364105ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 907.961188

exec
/bin/bash -lc 'node --test --test-isolation=none test/worker-tick.test.mjs' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 712ms:
[snapshot hub] network down
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[config] registrationDelayBlocks(100) が最低値 300 未満です
[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(100) が最低値 300 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snapshot hub] hub graphql: [{"message":"boom"}]
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): hub graphql: [{"message":"boom"}] ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: 対応表の登録が遅すぎます。猶予明け(block 300)が締切(block 195)に間に合わず、票を投函できません。 ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] prop 1: registration delay not elapsed — retry next tick
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted with the following signature:
0x3d7ac07d
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:12 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (11.357504ms)
✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (1.854585ms)
✔ linkOk=false: 警告し、テストネットでも告知はしない (1.429834ms)
✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (8.929237ms)
✔ mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない) (0.533096ms)
✔ mainnet: owner/registrar/relayer が同一なら停止 (0.323962ms)
✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.343279ms)
✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.883938ms)
✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.870231ms)
✔ 第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない (1.368976ms)
✔ ハブが GraphQL errors を返した場合も fail-closed (0.32619ms)
✔ 確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される (1.139222ms)
✔ 第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する (0.381037ms)
✔ 実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る (1.384746ms)
✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.583396ms)
✔ 実投函: 復号可能な恒久 revert(StaleVote)は drop に数える (1.44837ms)
✔ 猶予境界: block == eligibleAt では投函が始まる (0.663499ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 700.564689

exec
/bin/bash -lc "node --input-type=module - <<'NODE'
import { toFunctionSelector } from 'viem'; import { METAGOV_ABI } from './relayer-cf/src/abi.js';
const sig=x=>"'`${x.name}(${x.inputs.map(i=>i.type).join('"',')})"'`;
const m=new Map(); for(const x of METAGOV_ABI.filter(x=>x.type==='"'error'||x.type==='function')) {const s=sig(x),sel=toFunctionSelector(s),a=m.get(sel)||[];a.push("'`${x.type}:${s}`);m.set(sel,a)}
console.log([...m].filter(([,a])=>a.length>1));
console.log('"'items',METAGOV_ABI.length,'errors',METAGOV_ABI.filter(x=>x.type==='error').length,'functions',METAGOV_ABI.filter(x=>x.type==='function').length);
NODE
rg -n \"function unregisterProposal|snapshotVotesAccepted|eligibleAtBlock|setRegistrationDelay\" contracts/PNounsSnapVoter.sol test scripts docs | sed -n '1,200p'
git status --short" in /mnt/data/pnouns-voter
 succeeded in 263ms:
[]
items 57 errors 28 functions 24
contracts/PNounsSnapVoter.sol:92:    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
contracts/PNounsSnapVoter.sol:99:    mapping(uint256 => uint32) public snapshotVotesAccepted;
contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:198:        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:276:        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
test/snap.fork.test.js:215:      await voterC.setRegistrationDelayBlocks(1000);
test/snap.fork.test.js:225:      await voterC.setRegistrationDelayBlocks(0);
test/snap.fork.test.js:231:      await voterC.setRegistrationDelayBlocks(1000);
test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
test/snap.fork.test.js:237:      await voterC.setRegistrationDelayBlocks(0);
test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
test/snap.fork.test.js:250:      await voterC.setRegistrationDelayBlocks(1000);
test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
test/snap.fork.test.js:256:      await voterC.setRegistrationDelayBlocks(50);
test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
test/snap.fork.test.js:262:      await voterC.setRegistrationDelayBlocks(0);
test/snap.fork.test.js:267:      await voterC.setRegistrationDelayBlocks(1000);
test/snap.fork.test.js:282:      await voterC.setRegistrationDelayBlocks(0);
test/snap.fork.test.js:302:      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(0n);
test/snap.fork.test.js:310:      expect(await voterC.snapshotVotesAccepted(pid5)).to.equal(1n); // だが受理は 1 件
docs/AUDIT-RESPONSE-2026-08-18.md:109:| 指摘3: 取消可否の判定 | Medium | `snapshotVotesAccepted`(**Snapshot 署名の受理件数**)を新設し、`unregisterProposal` はこれで判定。`snapshotVotesCounted`(新規 token 数)は統計用途に降格。フォークテスト追加(直接投票 → 新しい Snapshot 署名で choice 変更(新規 token 0) → 取消不可を確認) |
docs/AUDIT-RESPONSE-2026-08-18.md:144:| 4 | Medium | `unregisterProposal()` が見るのは `snapshotVotesAccepted` のみ。直接 `castVote()` 済みでも取消可能で、tally/bitmap は取消後も残る。資料の「1票でも計上されると取消不可」は不正確 | 資料を「Snapshot 経由の票が 1 票でも受け付けられると」に訂正。コントラクトは現状維持(直接投票で取消を妨害される DoS を避けるための意図的な設計。第9回の指摘3 対応) |
docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:228:| 1 | **High** | **登録猶予中(mainnet 24h)の正常票が dead-letter 化される**。Worker は eligibleAtBlock を見ずに投函 simulate → RegistrationTooRecent の revert を「恒久的な署名不良」として snapdrop に加算 → 5 回(2 分 cron で約 10 分)で除外。告知は猶予前に出るため、普通に投票した票が全滅する | 修正(二重防御): ① metagovInfo に eligibleAtBlock を追加し、猶予中は submitFromSnapshot を呼ばない(票は Snapshot に残り解禁後に投函)。② revert エラー名を復号し、RegistrationTooRecent は一括・個別とも drop に数えず次 tick へ。必須とされた Worker テスト(猶予中: votes クエリなし・drop なし・告知は出る / 解禁後: 投函経路に入る)を追加 |
docs/AUDIT-RESPONSE-2026-08-18.md:247:総括: High 0。第13回 High の主修正(eligibleAtBlock ゲート)は「off-by-one なし・正しく修正」と確認。
docs/AUDIT-RESPONSE-2026-08-18.md:251:| 1 | Medium | **二重防御②が機能していない**: METAGOV_ABI に error 定義が 1 件もなく、viem が RegistrationTooRecent を復号できない(revertErrorName は常に null)。eligibleAtBlock の読取だけが失敗した場合(allowFailure)にゲートが素通りし、再び snapdrop が増え得る | 修正: コントラクトの custom error 全 28 個を METAGOV_ABI に追加。復号された RegistrationTooRecent が drop に数えられないこと・恒久 revert(StaleVote)は数えることを、実際の ContractFunctionRevertedError を構築するテストで確認 ※ABI 欠落は Codex 報告前にこちらでも特定済み |
scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-13-codex-raw.md:3215:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-13-codex-raw.md:3216:   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-13-codex-raw.md:3233:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-13-codex-raw.md:3558:      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
docs/audit-13-codex-raw.md:3586:docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-13-codex-raw.md:3633:docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-13-codex-raw.md:3653:docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-13-codex-raw.md:3654:docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-13-codex-raw.md:3656:docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-13-codex-raw.md:3854:/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
docs/audit-13-codex-raw.md:3856:rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
docs/audit-13-codex-raw.md:3859:contracts/PNounsSnapVoter.sol:92:    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
docs/audit-13-codex-raw.md:3860:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-13-codex-raw.md:3863:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-13-codex-raw.md:3864:contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-13-codex-raw.md:3866:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-13-codex-raw.md:3868:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-13-codex-raw.md:3869:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-13-codex-raw.md:3870:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-13-codex-raw.md:3874:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-13-codex-raw.md:3917:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-13-codex-raw.md:3922:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-13-codex-raw.md:3926:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-13-codex-raw.md:3930:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-13-codex-raw.md:3970:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-13-codex-raw.md:3979:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-13-codex-raw.md:4022:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-13-codex-raw.md:4349:    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
docs/audit-13-codex-raw.md:4350:    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-13-codex-raw.md:4356:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-13-codex-raw.md:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-13-codex-raw.md:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-10-codex-raw.md:78:`unregisterProposal()` が見るのは総票数・投票者数・token 数ではなく、`snapshotVotesAccepted[nounsProposalId]`、すなわち成功した Snapshot 署名の受理件数です。
docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-12-codex-raw.md:73:  含まれると notifyError → return (fail-closed)。ABI に owner/registrar/eligibleAtBlock を追加。
docs/audit-12-codex-raw.md:82:- ABI 追加分 (owner/registrar/eligibleAtBlock) の型・シグネチャはコントラクトと一致するか。
docs/audit-12-codex-raw.md:136:      eligibleAtBlock を追加)
docs/audit-12-codex-raw.md:157: **要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-12-codex-raw.md:173:+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-12-codex-raw.md:435:/bin/bash -lc "rg -n \"function recentProposals|recentProposals\\(|function maybeExecute|maybeExecute\\(|function metagovInfo|metagovInfo\\(|MAINNET_PROPOSER_MNEMONIC|REGISTRAR_MNEMONIC|eligibleAtBlock|function owner|function registrar|registrationDelayBlocks|function proposals|state ===|state "'!==" relayer-cf scripts contracts test hardhat.config.* .env.example README.md docs --glob '"'"'!docs/audit-11-codex-raw.md'"'" in /mnt/data/pnouns-voter
docs/audit-12-codex-raw.md:439:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-12-codex-raw.md:440:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-12-codex-raw.md:441:test/snap.fork.test.js:249:    it("第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される", async function () {
docs/audit-12-codex-raw.md:442:test/snap.fork.test.js:253:      const first = await voterC.eligibleAtBlock(666666);
docs/audit-12-codex-raw.md:443:test/snap.fork.test.js:255:      expect(await voterC.eligibleAtBlock(666666)).to.equal(0n, "取消で解禁ブロックも消える");
docs/audit-12-codex-raw.md:444:test/snap.fork.test.js:258:      const second = await voterC.eligibleAtBlock(666666);
docs/audit-12-codex-raw.md:453:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-12-codex-raw.md:454:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-12-codex-raw.md:456:docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-12-codex-raw.md:461:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-12-codex-raw.md:464:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-12-codex-raw.md:465:contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-12-codex-raw.md:466:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-12-codex-raw.md:467:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-12-codex-raw.md:468:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-12-codex-raw.md:469:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-12-codex-raw.md:473:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-12-codex-raw.md:480:scripts/sepolia/13-snap-e2e.js:77:  // 登録猶予(eligibleAtBlock)が明けるまで待つ。第10回監査 M-2 で、猶予は登録時に確定する仕様になった
docs/audit-12-codex-raw.md:481:scripts/sepolia/13-snap-e2e.js:78:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-12-codex-raw.md:482:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));
docs/audit-12-codex-raw.md:514:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-12-codex-raw.md:1312:   440	  "name": "eligibleAtBlock",
docs/audit-12-codex-raw.md:1365:    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
docs/audit-12-codex-raw.md:1366:    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-12-codex-raw.md:1372:    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-12-codex-raw.md:1410:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-12-codex-raw.md:1411:   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-12-codex-raw.md:1428:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-12-codex-raw.md:1433:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-12-codex-raw.md:1437:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-12-codex-raw.md:1441:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-12-codex-raw.md:1463:   258	        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-12-codex-raw.md:1481:   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-12-codex-raw.md:1490:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-12-codex-raw.md:1954:   440	  "name": "eligibleAtBlock",
docs/audit-12-codex-raw.md:2747:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-12-codex-raw.md:2946:- ABIの `owner() returns(address)`、`registrar() returns(address)`、`eligibleAtBlock(uint256) returns(uint256)` はコントラクトのpublic getterと一致します。
docs/audit-14-codex-raw.md:26:   - chain.js: metagovInfo に eligibleAtBlock を追加 (allowFailure なので旧コントラクトでは 0)
docs/audit-14-codex-raw.md:31:      block == eligibleAt ちょうどのときコントラクト側 (`block.number < eligibleAtBlock` で revert)
docs/audit-14-codex-raw.md:86:      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-14-codex-raw.md:3332:+   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-14-codex-raw.md:3333:+   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-14-codex-raw.md:3350:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:3675:+      ✔ 第11回監査 Info-5: 同じ Nouns ID へ再登録すると eligibleAtBlock が新しい猶予で再設定される
docs/audit-14-codex-raw.md:3703:+docs/AUDIT-RESPONSE-2026-08-18.md-168-| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-14-codex-raw.md:3750:+docs/audit-12-codex-raw.md-173-+| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-14-codex-raw.md:3770:+docs/audit-12-codex-raw.md-453-docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-14-codex-raw.md:3771:+docs/audit-12-codex-raw.md-454-docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-14-codex-raw.md:3773:+docs/audit-12-codex-raw.md-456-docs/AUDIT-RESPONSE-2026-08-18.md:168:| 5 | Info | `eligibleAtBlock` の登録時確定は正しい実装 | 再登録の境界テストを追加 |
docs/audit-14-codex-raw.md:3971:+/bin/bash -lc "rg -n \"eligibleAtBlock|Registration|TooEarly|NotEligible|registeredAt\" contracts/PNounsSnapVoter.sol relayer-cf/src -g '*.js' -g '*.sol'
docs/audit-14-codex-raw.md:3973:+rg -n \"eligibleAtBlock|registrationDelay\" relayer-cf/src/abi.js relayer-cf/src/worker.js relayer-cf/src/chain.js" in /mnt/data/pnouns-voter
docs/audit-14-codex-raw.md:3976:+contracts/PNounsSnapVoter.sol:92:    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
docs/audit-14-codex-raw.md:3977:+contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-14-codex-raw.md:3980:+contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-14-codex-raw.md:3981:+contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-14-codex-raw.md:3983:+contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:3985:+contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-14-codex-raw.md:3986:+contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-14-codex-raw.md:3987:+contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-14-codex-raw.md:3991:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-14-codex-raw.md:4034:+   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:4039:+   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-14-codex-raw.md:4043:+   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-14-codex-raw.md:4047:+   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-14-codex-raw.md:4087:+   276	        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
docs/audit-14-codex-raw.md:4096:+   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-14-codex-raw.md:4139:+relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-14-codex-raw.md:4466:+    92	    /// @notice その登録について票の受付が解禁されるブロック。登録時に確定し、以後 setRegistrationDelayBlocks では動かない
docs/audit-14-codex-raw.md:4467:+    93	    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-14-codex-raw.md:4473:+    99	    mapping(uint256 => uint32) public snapshotVotesAccepted;
docs/audit-14-codex-raw.md:4505:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:4605:+[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:4821:+      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-14-codex-raw.md:5371:3869:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-14-codex-raw.md:5372:3870:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-14-codex-raw.md:5374:3979:   285	        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-14-codex-raw.md:5378:4388:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:5390:4488:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:6188:/bin/bash -lc "rg -n \"METAGOV_ABI|RegistrationTooRecent|eligibleAtBlock|function metagovInfo|revertErrorName|queueNotify|flushPendingNotes\" relayer-cf/src/abi.js relayer-cf/src/chain.js relayer-cf/src/worker.js contracts/PNounsSnapVoter.sol relayer-cf/test/*.mjs && nl -ba relayer-cf/src/abi.js | sed -n '1,180p' && nl -ba relayer-cf/src/chain.js | sed -n '205,280p' && nl -ba relayer-cf/src/worker.js | sed -n '1,75p' && nl -ba relayer-cf/src/worker.js | sed -n '230,330p' && nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '1,380p'" in /mnt/data/pnouns-voter
docs/audit-14-codex-raw.md:6190:relayer-cf/test/worker-tick.test.mjs:92:    eligibleAtBlock: () => 50n,
docs/audit-14-codex-raw.md:6191:relayer-cf/test/worker-tick.test.mjs:219:    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-14-codex-raw.md:6192:contracts/PNounsSnapVoter.sol:93:    mapping(uint256 => uint256) public eligibleAtBlock;
docs/audit-14-codex-raw.md:6194:contracts/PNounsSnapVoter.sol:171:    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-14-codex-raw.md:6195:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:6196:contracts/PNounsSnapVoter.sol:202:        delete eligibleAtBlock[nounsProposalId];
docs/audit-14-codex-raw.md:6197:contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
docs/audit-14-codex-raw.md:6198:contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
docs/audit-14-codex-raw.md:6200:relayer-cf/src/abi.js:440:  "name": "eligibleAtBlock",
docs/audit-14-codex-raw.md:6207:relayer-cf/src/chain.js:181:      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-14-codex-raw.md:6685:    92	    eligibleAtBlock: () => 50n,
docs/audit-14-codex-raw.md:6812:   219	    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-14-codex-raw.md:6920:   181	      { address: c.metagov, abi: METAGOV_ABI, functionName: "eligibleAtBlock", args: [pid] },
docs/audit-14-codex-raw.md:7031:+    eligibleAtBlock: () => 50n,
docs/audit-14-codex-raw.md:7044:+    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
docs/audit-14-codex-raw.md:8107:   171	    /// @dev 以後の登録にのみ適用される。登録済みの提案の受付解禁(eligibleAtBlock)は変わらない
docs/audit-14-codex-raw.md:8108:   172	    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-14-codex-raw.md:8125:   189	        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:8130:   194	    function unregisterProposal(uint256 nounsProposalId) external {
docs/audit-14-codex-raw.md:8134:   198	        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
docs/audit-14-codex-raw.md:8138:   202	        delete eligibleAtBlock[nounsProposalId];
docs/audit-14-codex-raw.md:8174:contracts/PNounsSnapVoter.sol:172:    function setRegistrationDelayBlocks(uint256 v) external onlyOwner { registrationDelayBlocks = v; emit RegistrationDelaySet(v); }
docs/audit-14-codex-raw.md:8175:contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
docs/audit-14-codex-raw.md:8258:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:8314:[relayer-cf/src/worker.js:203](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:203)、[relayer-cf/src/worker.js:241](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:241)、[contracts/PNounsSnapVoter.sol:258](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:258)、[docs/RUNBOOK-MAINNET.md:30](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:30) / Worker は `eligibleAtBlock` を確認せず投函を simulate します。猶予中はコントラクトが `RegistrationTooRecent` で revert しますが、Worker はこれを恒久的な署名不良と区別せず `snapdrop` を加算し、5回で dead-letter にします。mainnet の2分 cronでは約8～10分です。さらに告知も猶予前に送信されるため、利用者が普通に投票すると除外対象になります。 / `eligibleAtBlock(nounsId)` を読み、解禁前は `submitFromSnapshot` を呼ばないこと。加えて `RegistrationTooRecent` は transient として drop 回数に含めないこと。「猶予中に票が存在→KV write/dropなし→解禁後に実投函」のWorkerテストを必須化してください。
docs/audit-14-codex-raw.md:8370:      Worker が eligibleAtBlock を見ずに投函し、RegistrationTooRecent の
docs/audit-14-codex-raw.md:9241:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
docs/audit-14-codex-raw.md:9259:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
docs/audit-14-codex-raw.md:9277:何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。
docs/audit-14-codex-raw.md:9391:前回 High の主因である「猶予中に毎 tick 投函して dead-letter 化」は、`eligibleAtBlock` ゲートにより通常経路では修正されています。off-by-one もありません。
docs/audit-14-codex-raw.md:9409:通常は手前の eligible ゲートが効きますが、`metagovInfo()` が `allowFailure: true` であるため、`eligibleAtBlock` の呼び出しだけ失敗すると `eligibleAt=0` 扱いになります。その場合、投函先では `RegistrationTooRecent` が発生し、名前を判別できず再び `snapdrop` を加算し得ます。
docs/audit-14-codex-raw.md:9427:何が起きるか: `snapshotTimelineSafe()` は Snapshot の終了時刻とオンチェーン deadline だけを比較し、`eligibleAtBlock` を考慮しません。したがって、既存の古い Snapshot 提案を deadline 間際に手動登録するなど、次の条件では timeline 検査を通過し得ます。
docs/audit-11-codex-raw.md:59:4. **[前回 Medium] `eligibleAtBlock`** (`contracts/PNounsSnapVoter.sol`): 登録時確定の
docs/audit-11-codex-raw.md:61:   猶予が正しくリセットされるか**、`eligibleAtBlock` が 0 のままになる経路
docs/audit-11-codex-raw.md:97:/bin/bash -lc "git log --oneline -5 && git status --short && rg -n \"mappingsResolved|announceNew|referencesNounsProposal|eligibleAtBlock|notify\\(|InvalidSpace|registrationDelayBlocks|VOTER|liveMode|refundEnabled|registrar|excluded\" docs/AUDIT-RESPONSE-2026-08-18.md docs/audit-10-codex-raw.md relayer-cf contracts test scripts hardhat.config.* 2>/dev/null" in /mnt/data/pnouns-voter
docs/audit-11-codex-raw.md:111:docs/AUDIT-RESPONSE-2026-08-18.md:145:| 5 | Medium | 受付判定が現在の `registrationDelayBlocks` を毎回参照するため、登録後に owner が 0 に下げれば即時受付になる。「猶予＝必ずやり直せる時間」は不変条件ではない | 修正: `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を登録時に確定させ、判定をこれに変更。worker の最低値確認も 30 分ごとに再実施。回帰テスト追加 |
docs/audit-11-codex-raw.md:114:docs/AUDIT-RESPONSE-2026-08-18.md:152:**要コントラクト再デプロイ**: #5 (`eligibleAtBlock`)、#8 (`InvalidSpace`)。Sepolia は次回テスト前に再デプロイする。
docs/audit-11-codex-raw.md:119:docs/audit-10-codex-raw.md:110:- 登録時に `eligibleAtBlock[id] = block.number + registrationDelayBlocks` を保存し、その登録について後から短縮できなくする。
docs/audit-11-codex-raw.md:123:test/snap.fork.test.js:234:      const eligible = await voterC.eligibleAtBlock(777777);
docs/audit-11-codex-raw.md:124:test/snap.fork.test.js:238:      expect(await voterC.eligibleAtBlock(777777)).to.equal(eligible);
docs/audit-11-codex-raw.md:132:scripts/sepolia/14-snap-setup-only.js:35:  const eligible = Number(await snapVoter.eligibleAtBlock(nounsId));

codex
実装上の `RegistrationTooRecent` 復号は直っていますが、`graceBad` は「最初の rush 投函が可能な時間」しか見ていません。Snapshot 側の滞留票数や、`snapsent` receipt 確認に次 tick を使う実際の排出速度を含めないため、遅い登録で一部だけ投函して締切後に部分集計を確定する余地があります。前回の保留理由が完全解消したかという判断では、この点が主要な残件です。
exec
/bin/bash -lc "nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '270,355p'
nl -ba relayer-cf/src/worker.js | sed -n '156,290p'
nl -ba relayer-cf/src/chain.js | sed -n '62,88p'
nl -ba contracts/PNounsSnapVoter.sol | sed -n '178,205p'
git status --short" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   270	  F.discordStatus = 200;
   271	  await tick(env);
   272	  assert.ok(F.discordBodies.some((b) => b.includes("反映しました")), "持ち越した通知が再送される");
   273	  assert.equal(kv.data.has(`${ns}pendingnotes`), false, "キューが空になり削除される");
   274	});
   275	
   276	test("第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する", async () => {
   277	  const wallet = { account: { address: RELAYER } };
   278	  const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet); // 300 > 締切195
   279	  F.hub = [hubProposal("https://nouns.wtf/vote/1")];
   280	  await tick(env);
   281	  assert.ok(F.discordBodies.some((b) => b.includes("登録が遅すぎます")), "専用警告");
   282	  assert.equal(putsOf(kv, "flag:gracewarn:1").length, 1);
   283	  assert.equal(putsOf(kv, "announced").length, 0, "投函できない提案を告知しない");
   284	});
   285	
   286	// ---- 実投函経路(第14回監査 Low: mock で票 1 件を最後まで通す) ----
   287	const VOTER_A = "0x3000000000000000000000000000000000000001";
   288	const CID = "bafytest1";
   289	const TS = 1700000000;
   290	function submitHandlers(over = {}) {
   291	  return handlers({
   292	    totalSupply: () => 2n,
   293	    ownerOf: () => VOTER_A, // token 1,2 とも voterA 保有
   294	    voterRec: () => [false, 0, false, 0n, "0x" + "00".repeat(32)],
   295	    hasTokenVoted: () => false,
   296	    ...over,
   297	  });
   298	}
   299	const hubWithVote = () => [hubProposal("https://nouns.wtf/vote/1"), { votes: [{ voter: VOTER_A, ipfs: CID, choice: 1, created: TS }] }];
   300	const goodEnvelope = () => ({ data: { message: { from: VOTER_A, timestamp: TS, proposal: SNAP_ID, choice: 1, reason: "", app: "", metadata: "" } }, sig: "0x" + "11".repeat(65) });
   301	
   302	test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
   303	  const writes = [];
   304	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   305	  const { kv, env } = setup(submitHandlers(), {}, wallet);
   306	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   307	  await tick(env);
   308	  assert.deepEqual(writes, ["castSnapshotVotes"], "投函 tx が送られる");
   309	  assert.equal(putsOf(kv, "snapsent:1").length, 1, "送信中レコードが保存される");
   310	  assert.equal(putsOf(kv, "snapdrop").length, 0);
   311	});
   312	
   313	test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
   314	  const writes = [];
   315	  const wallet = { account: { address: RELAYER }, writeContract: async (x) => { writes.push(x.functionName); return "0x" + "ee".repeat(32); } };
   316	  // selector 0x33ab63b9 = RegistrationTooRecent()。ABI に定義があるので errorName が復号される
   317	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x33ab63b9", functionName: "castSnapshotVotes" }); };
   318	  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   319	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   320	  await tick(env);
   321	  assert.equal(writes.length, 0, "投函しない");
   322	  assert.equal(putsOf(kv, "snapdrop").length, 0, "transient なので drop に数えない");
   323	});
   324	
   325	test("実投函: 復号可能な恒久 revert(StaleVote)は drop に数える", async () => {
   326	  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   327	  const revert = () => { throw new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3d7ac07d", functionName: "castSnapshotVotes" }); }; // StaleVote()
   328	  const { kv, env } = setup(submitHandlers({ simulateContract: revert }), {}, wallet);
   329	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   330	  await tick(env);
   331	  assert.equal(putsOf(kv, "snapdrop:1").length, 1, "恒久 revert は従来どおり数える");
   332	});
   333	
   334	test("猶予境界: block == eligibleAt では投函が始まる", async () => {
   335	  const wallet = { account: { address: RELAYER }, writeContract: async () => "0x" + "ee".repeat(32) };
   336	  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
   337	  F.hub = hubWithVote(); F.envelope = goodEnvelope();
   338	  await tick(env);
   339	  assert.ok(F.hubCalls >= 2, "votes クエリに到達(off-by-one なし)");
   340	});
   156	// B3: Snapshot ハブから署名を取得して castSnapshotVotes。
   157	//  - オンチェーンの voterRec が真実。cursor は「未解決票より前」までしか進めない(H04)
   158	//  - 送信中(snapsent)は新規送信しない。確定は次 tick で receipt を見て行う
   159	//  - 取得できない票は fail カウント → 一定回数でデッドレター(警告つき)。黙って飛ばさない(M06R)
   160	async function submitFromSnapshot(c, pc, wc, store, snapInfo, nounsId, rush) {
   161	  const sentK = `${store.prefix}snapsent:${nounsId}`;
   162	  const pending = await store.kvRaw.get(sentK, "json");
   163	  if (pending) {
   164	    let allMined = true, anySuccess = false, gasTotal = 0n;
   165	    for (const tx of pending.txs) {
   166	      let rc = null;
   167	      try { rc = await pc.getTransactionReceipt({ hash: tx }); } catch { rc = null; }
   168	      if (!rc) { allMined = false; continue; }
   169	      if (rc.status === "success") { anySuccess = true; gasTotal += rc.gasUsed; }
   170	      else console.warn(`[snap] castSnapshotVotes reverted ${tx}`);
   171	    }
   172	    if (!allMined && Date.now() - Date.parse(pending.at) < 10 * 60 * 1000) return;
   173	    await store.kvRaw.delete(sentK);
   174	    // cursor はここでは進めない(次 tick に voterRec を見て、確定したものだけ「解決済み」として前進する)
   175	    if (anySuccess && !(await store.getFlag(`notified:${pending.txs[0]}`))) {
   176	      const mg = await metagovInfo(c, pc, nounsId);
   177	      const sent = await queueNotify(c, store, [
   178	        `🗳️ Prop ${nounsId}: Snapshot の ${pending.count} 票をオンチェーンに反映しました (gas ${gasTotal})。`,
   179	        `現在の集計: 賛成 ${mg.tokens[1]} / 反対 ${mg.tokens[0]} / 棄権 ${mg.tokens[2]} (投票者 ${mg.voters[1]}/${mg.voters[0]}/${mg.voters[2]} 名)`,
   180	        `tx: ${explorerTx(c, pending.txs[0])}`,
   181	      ].join("\n"), pending.txs[0]);
   182	      if (sent) await store.setFlag(`notified:${pending.txs[0]}`, 86400);
   183	    }
   184	    return;
   185	  }
   186	
   187	  // timestamp cursor では同一秒の大量票を一意に走査できないため、固定幅 window の offset を
   188	  // KV に保持して末尾まで巡回する。window 内が解決するまで offset は進めない。
   189	  const scanK = scanKey(store, nounsId, snapInfo.snapId);
   190	  const offset = Number(await store.kvRaw.get(scanK)) || 0;
   191	  const { rows, nextOffset } = await fetchRows(c, snapInfo.snapId, offset);
   192	  if (!rows.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   193	  const deadArr = (await store.kvRaw.get(deadKey(store, nounsId), "json")) || [];
   194	  const deadLetters = new Set(deadArr);
   195	  // オンチェーン記録と保有 tokenId(移転を正しく扱うため tokenId 単位で計上済みかを見る: 指摘2)
   196	  const recs = await pc.multicall({ contracts: rows.map((v) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "voterRec", args: [BigInt(nounsId), v.voter] })), allowFailure: false });
   197	  const owners = await allOwners(c, pc);
   198	  const tokensByRow = rows.map((v) => { const a = v.voter.toLowerCase(); const ids = []; for (let id = 1; id < owners.length; id++) if (owners[id] === a) ids.push(id); return ids; });
   199	  const tokenCounts = tokensByRow.map((ids) => ids.length);
   200	  // hasTokenVoted は tokenId 単位で重複排除し、RPC サイズを抑えるため 200 件ずつ照会する。
   201	  // timestamp が voterRec と同じ行だけが補完候補なので、新しいやり直し票にはこの照会自体が不要。
   202	  const { rowIndexes: supplementRows, tokenIds: checkTokenIds } = supplementCheckPlan(rows, recs, tokensByRow);
   203	  const votedByToken = new Map();
   204	  for (let start = 0; start < checkTokenIds.length; start += 200) {
   205	    const ids = checkTokenIds.slice(start, start + 200);
   206	    const flags = await pc.multicall({ contracts: ids.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "hasTokenVoted", args: [BigInt(nounsId), BigInt(id)] })), allowFailure: false });
   207	    ids.forEach((id, i) => votedByToken.set(id, !!flags[i]));
   208	  }
   209	  const uncountedTokens = rows.map((_, i) => (recs[i][0] ? 0 : tokenCounts[i]));
   210	  for (const i of supplementRows) for (const id of tokensByRow[i]) if (!votedByToken.get(id)) uncountedTokens[i] += 1;
   211	  const batches = rush ? c.rushBatches : 1;
   212	  const drops = (await store.kvRaw.get(`${store.prefix}snapdrop:${nounsId}`, "json")) || {}; // 指摘4: 恒久 revert の回数
   213	  Object.entries(drops).forEach(([cid, n]) => { if (n >= 5) deadLetters.add(cid); });
   214	  const planned = planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters, limit: rows.length, cursor: 0 });
   215	  // 1 voter 1 候補へ正規化。同一 voter の複数票を同じ tx に入れて interaction revert させない。
   216	  const send = uniqueVoterCandidates(planned.send, c.maxBatch * batches);
   217	  // 値が変わるときだけ書く(毎 tick 書くと無料枠の KV 書込み上限 1,000/日 を超えるため。
   218	  // 投票数が 1 window(300 件)に収まる通常運用では offset は常に 0 で、書き込みは発生しない)
   219	  if (!send.length) { if (offset !== nextOffset) await store.kvRaw.put(scanK, String(nextOffset)); return; }
   220	
   221	  // 送る票のエンベロープを取得(取れないものは fail カウント → デッドレター)
   222	  const fails = (await store.kvRaw.get(failKey(store, nounsId), "json")) || {};
   223	  const args = []; const cidOf = new Map(); let failChanged = false, deadChanged = false, dropChanged = false;
   224	  for (const { row, index } of send) {
   225	    const env = await fetchEnvelope(c, row, snapInfo.snapId);
   226	    if (!env) {
   227	      fails[row.ipfs] = (fails[row.ipfs] || 0) + 1; failChanged = true;
   228	      if (fails[row.ipfs] >= 20) {
   229	        deadArr.push(row.ipfs); deadChanged = true;
   230	        await notify(c, [`⚠️ Prop ${nounsId}: 1 票の署名データを取得できませんでした(20 回試行)。この票は集計に含まれません。`, `投票者: ${row.voter}`, `データ ID: ${row.ipfs}`, `復旧できる場合は手動で再投函できます。`].join("\n"));
   231	      }
   232	      break; // 順序を崩さないためここで打ち切り(次 tick に再試行)
   233	    }
   234	    const m = env.data.message;
   235	    const tokenIds = [];
   236	    for (const id of tokensByRow[index]) tokenIds.push(BigInt(id));
   237	    const arg = { from: m.from, timestamp: BigInt(m.timestamp), proposal: m.proposal, choice: m.choice, reason: m.reason ?? "", app: m.app ?? "", metadata: m.metadata ?? "", signature: env.sig, tokenIds };
   238	    args.push(arg); cidOf.set(arg, row.ipfs);
   239	  }
   240	  if (failChanged) await store.kvRaw.put(failKey(store, nounsId), JSON.stringify(fails), { expirationTtl: 86400 * 30 });
   241	  if (deadChanged) await store.kvRaw.put(deadKey(store, nounsId), JSON.stringify(deadArr), { expirationTtl: 86400 * 90 });
   242	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   243	  if (!args.length) return;
   244	
   245	  const txs = []; let count = 0;
   246	  for (let b = 0; b < batches; b++) {
   247	    const chunk = args.slice(b * c.maxBatch, (b + 1) * c.maxBatch);
   248	    if (!chunk.length) break;
   249	    try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account }); }
   250	    catch (e) {
   251	      if (!isContractRevert(e)) { console.warn(`[snap] simulate transient error prop ${nounsId}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); break; }
   252	      // 第13回監査 High の二重防御: 猶予境界の競合など、票の欠陥ではない revert は数えずに次 tick へ
   253	      if (revertErrorName(e) === "RegistrationTooRecent") { console.warn(`[snap] prop ${nounsId}: registration delay not elapsed — retry next tick`); break; }
   254	      const good = [];
   255	      for (const a2 of chunk.slice(0, 10)) {
   256	        try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [[a2]], account: wc.account }); good.push(a2); }
   257	        catch (e2) {
   258	          const cid = cidOf.get(a2);
   259	          if (isContractRevert(e2) && revertErrorName(e2) !== "RegistrationTooRecent" && cid) { // 決定的な revert だけ回数を数え、5 回でデッドレター(後続票を塞がない)
   260	            drops[cid] = (drops[cid] || 0) + 1; dropChanged = true;
   261	            if (drops[cid] === 5) await notify(c, [`⚠️ Prop ${nounsId}: 1 票がオンチェーンで受理されませんでした(5 回試行)。集計から除外します。`, `投票者: ${a2.from}`, `データ ID: ${cid}`].join("\n"));
   262	          }
   263	          console.warn(`[snap] drop vote ${a2.from.slice(0, 10)}: ${(e2.shortMessage || "").slice(0, 120)}`);
   264	        }
   265	      }
   266	      if (!good.length) continue;
   267	      // 個別には成功しても、組合せによって revert する可能性を排除するため再 simulate。
   268	      // なお失敗する場合は、この tick では先頭 1 票だけを送り、次回 on-chain 状態から再評価する。
   269	      try { await pc.simulateContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [good], account: wc.account }); }
   270	      catch (e3) {
   271	        if (!isContractRevert(e3)) { console.warn(`[snap] re-simulate transient error prop ${nounsId}: ${(e3.shortMessage || e3.message || "").slice(0, 120)}`); break; }
   272	        good.length = 1;
   273	      }
   274	      chunk.length = 0; chunk.push(...good);
   275	    }
   276	    const gas = await pc.estimateContractGas({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], account: wc.account });
   277	    const hash = await wc.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "castSnapshotVotes", args: [chunk], gas: (gas * 13n) / 10n });
   278	    console.log(`[snap] castSnapshotVotes prop ${nounsId} ${chunk.length} votes tx ${hash}${rush ? " (rush)" : ""}`);
   279	    txs.push(hash); count += chunk.length;
   280	  }
   281	  if (dropChanged) await store.kvRaw.put(`${store.prefix}snapdrop:${nounsId}`, JSON.stringify(drops), { expirationTtl: 86400 * 30 });
   282	  if (txs.length) await store.kvRaw.put(sentK, JSON.stringify({ txs, at: new Date().toISOString(), count }));
   283	}
   284	
   285	async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
   286	  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
   287	  const { summaries } = await loadVotes(store, proposalId, rush);
   288	  if (summaries.some((v) => v.txStatus === "sent")) return; // 送信中は新規投函しない(確定は reconcile)
   289	  const toArg = (v) => ({ proposalId: BigInt(proposalId), support: v.support, tokenIds: v.tokenIds.map(BigInt), signature: v.signature });
   290	  const batches = rush ? c.rushBatches : 1; // M-14R: rush 時は 1 tick で複数バッチ
    62	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
    63	export function acceptMarginBlocks(c) {
    64	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
    65	}
    66	export function acceptDeadline(c, onchainDeadline) {
    67	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
    68	}
    69	// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
    70	export function shouldRushSubmit(c, block, onchainDeadline) {
    71	  return Number(block) >= acceptDeadline(c, onchainDeadline);
    72	}
    73	// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
    74	// snapEnd が取得できない場合も mainnet では安全とみなさない。
    75	export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
    76	  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
    77	  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
    78	  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
    79	}
    80	// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
    81	//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
    82	export function submitCapacity(c, block, onchainDeadline) {
    83	  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
    84	  const ticks = Math.floor(secsLeft / c.cronSec);
    85	  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
    86	}
    87	export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
    88	export function clients(c) {
   178	    /// @notice Snapshot 提案と Nouns 提案の対応付け(それぞれ 1 回だけ・上書き不可)
   179	    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
   180	        if (msg.sender != registrar && msg.sender != owner()) revert NotRegistrar();
   181	        bytes32 h = keccak256(bytes(snapshotProposal));
   182	        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
   183	        if (nounsProposalId == 0) revert NotRegistered();
   184	        snapToNouns[h] = nounsProposalId;
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

exec
/bin/bash -lc 'node --test --test-isolation=none' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 780ms:
[snapshot hub] network down
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[config] registrationDelayBlocks(100) が最低値 300 未満です
[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(100) が最低値 300 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snapshot hub] hub graphql: [{"message":"boom"}]
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): hub graphql: [{"message":"boom"}] ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: 対応表の登録が遅すぎます。猶予明け(block 300)が締切(block 195)に間に合わず、票を投函できません。 ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] prop 1: registration delay not elapsed — retry next tick
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted with the following signature:
0x3d7ac07d
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 0:13 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
✔ mainnet: 受付締切はオンチェーン締切の 30 ブロック前 (0.746843ms)
✔ 受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード (0.105906ms)
✔ 最小待機 + cron 間隔 が受付締切〜オンチェーン締切の間に収まる (0.115965ms)
✔ sepolia テスト設定でも受付窓が残る(投票期間 25 ブロック、margin 5) (0.074053ms)
✔ M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件 (0.156364ms)
✔ 受付締切より十分前なら容量は大きく、通常運用を妨げない(1 日前 ≈ 14,000 票) (0.08524ms)
✔ B3-M03R: Snapshot 終了後に cron + buffer の排出時間がなければ unsafe (0.084067ms)
✔ 同一秒に 21 票あっても、送れなかった票の手前で cursor が止まる (0.228468ms)
✔ 未解決票の後ろに反映済みの行があっても、cursor は追い越さない(部分 revert 対策) (0.084448ms)
✔ pNouns 未保有・デッドレターの票は skip 扱いで cursor を進めてよい (0.103281ms)
✔ やり直し(新しい timestamp)と補完(同 timestamp・token 増)を検出する (0.053993ms)
✔ すべて反映済みなら最大 created まで進む (0.040181ms)
✔ 指摘1R: 601 件を複数 tick の offset 走査で末尾まで取得して先頭へ戻る (16.840701ms)
✔ 指摘2: token を入れ替えた場合(保有数 < 計上数)でも補完対象として検出する (0.080484ms)
✔ 指摘3R: 補完用 token 照会は行数ではなく一意な tokenId 数に制限される (2.288004ms)
✔ 指摘2R: 同一 voter の候補は最新 1 件だけをバッチへ入れる (0.101061ms)
✔ 再登録した Snapshot 提案は別の scan offset を使う (0.058277ms)
✔ 正規の URL を検出する (0.365068ms)
✔ 前方一致で誤検出しない (0.068429ms)
✔ 別ドメイン・別パスを拒否する (0.04697ms)
✔ 空・null・不正な入力で例外を投げず false を返す (0.049768ms)
✔ 正規表現メタ文字を含む入力で壊れない (0.034372ms)
✔ URL の直後に句読点や日本語が続いても検出する (0.051281ms)
✔ 末尾処理で別 ID に化けない (0.032751ms)
✔ 改行で分断された URL は検出しない(仕様) (0.027556ms)
✔ 第12回監査の追加ケース (0.037883ms)
✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (2.25364ms)
✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (0.887538ms)
✔ linkOk=false: 警告し、テストネットでも告知はしない (0.575269ms)
✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (7.789289ms)
✔ mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない) (0.32243ms)
✔ mainnet: owner/registrar/relayer が同一なら停止 (0.224383ms)
✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.296456ms)
✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.673476ms)
✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.843151ms)
✔ 第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない (1.158682ms)
✔ ハブが GraphQL errors を返した場合も fail-closed (0.329763ms)
✔ 確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される (1.127051ms)
✔ 第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する (0.34046ms)
✔ 実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る (1.228639ms)
✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.380816ms)
✔ 実投函: 復号可能な恒久 revert(StaleVote)は drop に数える (1.378112ms)
✔ 猶予境界: block == eligibleAt では投函が始まる (0.551669ms)
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 775.013654

codex
## 結論

第15回は**クローズ不可、mainnet 移行は保留継続**と判定します。

第14回の主要修正は概ね正しく、特に ABI 追加によって `RegistrationTooRecent` の復号は実際に機能します。一方、以下が残ります。

- Medium 1件: `graceBad` が滞留票をすべて排出できる時間を見積もっておらず、部分集計確定の余地がある
- Low 1件: `StaleVote()` テストの selector が誤っており、「復号可能」を検証できていない

前回保留理由のうち、猶予中 dead-letter、deploy/check-deploy、RUNBOOK は解消しましたが、締切間際の安全停止はまだ不完全です。

## 1. commit `8e37def` の検証

### ABI と revert 復号

[問題なし] / [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:4) / artifact の `PNounsSnapVoter` ABI と機械比較した結果、error は双方28件で、名前・input名・型・internalTypeまで完全一致しました / 修正不要。

selector の独立計算結果は次のとおりです。

| error signature | 正しい selector | テスト値 | 判定 |
|---|---:|---:|---|
| `RegistrationTooRecent()` | `0x33ab63b9` | `0x33ab63b9` | 正しい |
| `StaleVote()` | `0x93ff56e3` | `0x3d7ac07d` | 誤り |

実際に viem の `ContractFunctionRevertedError` を構築すると、正しい Registration selector では `data.errorName === "RegistrationTooRecent"` となりました。したがって [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49) の `revertErrorName()` は機能し、二重防御②は復旧しています。

[Low] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:325) / `StaleVote()` の selector が誤っているため、viem はこれを復号せず `data === undefined`、cause は `AbiErrorSignatureNotFoundError` になります。それでも Worker は「RegistrationTooRecent 以外の contract revert」を数えるため、テストは偶然 pass します。「復号可能な恒久 revert」を検証したことにはなりません / selector を `0x93ff56e3` に直し、可能ならテスト内で `revert.data.errorName === "StaleVote"` も明示検証してください。selector はハードコードせず `toFunctionSelector("StaleVote()")` 等から生成する方が安全です。

[問題なし] / [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:4) / ABI 肥大による decode 誤爆は認められません。追加した28 error と既存 function の4-byte selector に衝突はありません。viem は revert data の selector と一致する error だけを復号し、未知 selector は今回の誤った StaleVote テストのように未復号になります / 修正不要。ABI増加量も運用上無視できる範囲です。

### `graceBad`

[Medium] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:520)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:160) / `ceil((cronSec + submitBufferSec)/12)` は「最初の投函 wave を開始・採掘する余裕」の見積りとしては妥当ですが、滞留票をすべて排出する見積りではありません。

mainnet 既定では rush でも1 wave最大 `2 × 10 = 20` 票です。さらに `snapsent` がある次 tick は receipt を確認して return するため、新しい wave は早くてもその次の tick です。したがって、例えば猶予明け時に21票以上滞留している場合、現在の `graceBad=false` でも一部しか締切前に投函できず、その部分集計を `maybeExecute()` が確定する可能性があります / 次のいずれかを推奨します。

- 猶予明け時点の未解決票数と実効排出速度から必要時間を計算する
- 安全側に、遅い登録では `eligibleAt + worstCaseDrainBlocks < deadline` を要求する
- 締切時に未解決票・未確定 `snapsent` が1件でもあれば execute を停止する最終防壁を追加する

少なくとも「21票以上」「複数 wave」「receipt 確認 tick を挟む」「締切後に部分集計を execute しない」の回帰テストが必要です。

[問題なし] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:524) / `>=` 境界は安全側として妥当です。コントラクトは deadline 到達前に採掘される必要があるため、`eligibleAt + drainBlocks == deadline` を止めるのは保証上の誤停止ではありません。cron のタイミングが偶然良ければ間に合う可能性はありますが、それは保証可能な経路ではありません / 修正不要。

[問題なし] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:503) / `linkBad`、`timelineBad`、`graceBad` は独立に検査され、必要な警告を出した後、mainnet ではいずれかが成立すれば処理を停止します。危険な条件が後続の告知・投函・executeを再び有効にする優先順位矛盾はありません / 修正不要。

[問題なし・要運用明記] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:539)、[PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) / mainnet で `graceBad` になった提案は、その後も毎 tick `continue` し、締切後も自動 execute・`no votes` 確定を行いません。票が未受理なら unregister は可能です。ただし通常の delay のまま再登録すると `eligibleAtBlock = 再登録ブロック + delay` となり、以前より遅くなるため回復しません / RUNBOOK に「単純な unregister→再登録では回復しない」と明記してください。救済は手動投票・手動集計、または owner が短い delay で再登録して直後に運用値へ戻す例外手順になりますが、後者は複数ロールの厳格な手順化が必要です。

### deploy / check-deploy

[問題なし] / [deploy-snapvoter.js](/mnt/data/pnouns-voter/scripts/mainnet/deploy-snapvoter.js:14) / `MARGIN` は整数かつ10〜7200、OWNER・REGISTRAR・全EXCLUDEDは `ethers.getAddress()` で検証され、ゼロアドレスも拒否されます。デプロイ前に実行されるため危険な設定で送信されません / 修正不要。

[問題なし] / [check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:48) / `if (requireEnv(...)) if (E(...)) check(...)` は見た目は不自然ですが正しく動きます。欠落時は `requireEnv()` 内で `failed++` し、false を返すため比較だけをスキップし、最終的に exit 1 になります。`EXPECT_MARGIN` は deployed から、`EXPECT_BOT` は worker から mainnet 必須です / 可読性のため中括弧に整理する余地はありますが、機能バグではありません。

### RUNBOOK の `env $ENV`

[問題なし] / [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44) / Bash で実コマンドを試し、`env $ENV node ...` により `NETWORK`、`EXPECT_OWNER`、`EXPECT_MARGIN` が子プロセスへ渡ることを確認しました / 修正不要。値に空白や shell glob を含められない形式ですが、現行のアドレス・数値用途では問題ありません。

### 新テスト4本の実質

[Info] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:302) / 票取得、envelope 構築、simulate、gas estimate、`writeContract`、`snapsent` 保存までは実際の Worker 経路を通っています。したがって「投函送信開始経路をテストした」は正確です / 修正不要。

[Low] / 同箇所 / receipt 成功・失敗、`snapsent` 削除、オンチェーン `voterRec` 再取得、scan offset/cursor 前進、通知重複防止までは通っていません。「実投函フルパス」「最後まで通す」は言い過ぎです / 表現を「送信・snapsent 保存まで」に限定し、Sepolia E2E で receipt→再走査→cursor前進を確認してください。

## 2. 第10〜15回の総括

### 未対応項目

accepted risk を除く過去指摘は、今回新たに判明した次の2点以外は対応済みです。

1. `graceBad` の全滞留票排出量を考慮しない問題
2. `StaleVote()` selector テストの誤り

第11回時点の Worker状態遷移テスト、runbook、鍵分離、deploy/check-deploy、猶予中dead-letter、ABI復号は、コード上は解消されています。

### accepted risk

- 悪意ある registrar が自己整合する誤対応を登録した場合、本文URL照合では検出不能  
  妥当。ただし24時間猶予、独立鍵、公開監視を前提とする信頼モデルです。

- 直接 `castVote()` 後でも、Snapshot票未受理なら unregister でき、tally/bitmap は残る  
  直接投票による取消妨害DoSを避ける意図的トレードオフとして妥当。資料の表現修正済みです。

- `pendingnotes` の KV put 失敗窓、20件上限、通信切断時の重複通知  
  投票・集計の正しさに影響しない補助通知なので妥当です。

- `/vote/989偽` を `/vote/989` とみなす false positive  
  URL照合を厳密なセキュリティ境界と扱わない条件で妥当です。

- Worker mock が supplement、dead-letter、receipt/reconcile、非Snapshot全経路を網羅しない  
  条件付きで妥当ですが、今回の誤selectorが示すとおりテスト品質リスクは実在します。receipt→cursor前進はSepolia E2E必須です。

## Sepolia E2E で必ず確認する項目

1. registrar・relayer・owner・Snapshot bot が4つの別アドレスである。
2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
3. 猶予中にSnapshot票を入れても、`snapsent`・`snapdrop`・dead-letterが増えない。
4. `block == eligibleAtBlock` 以降、同じ票が自動投函される。
5. 実txのreceipt成功後、`snapsent` が削除され、次回走査で `voterRec` を確認してoffset/cursorが前進する。
6. 複数バッチ、特に21票以上で、全票が締切前に排出されるか、未解決票があればexecuteを止める。
7. `RegistrationTooRecent()` と `StaleVote()` の実revertが期待名として復号され、前者だけdrop非加算になる。
8. Hub GraphQL error・対応不明・link不一致・timeline不足で告知、投函、executeがfail-closedになる。
9. receipt revert・10分未採掘時に再評価され、票が消失・重複しない。
10. 締切後の最終tallyがSnapshot全票と一致し、shadow/live双方で期待どおり通知・executeされる。

## テスト結果

`relayer-cf` で指定どおり `npm test` を実行し成功しました。

- `npm test`: 4テストファイル pass、fail 0
- `node --test --test-isolation=none`: 43 tests、43 pass、fail 0
- Worker単体: 17 tests、17 pass

ただし、上述の誤った `StaleVote` selector を含んだまま43件すべて通るため、pass数だけではその復号テストの正当性を担保しません。

最終判定は、**Medium の全滞留票排出／締切時未解決票ガードを修正し、正しい StaleVote selector のテストを追加した後にコード面クローズ**です。Sepolia E2E完了前の mainnet 移行は推奨しません。リポジトリへの変更は行っていません。
tokens used
140,761
## 結論

第15回は**クローズ不可、mainnet 移行は保留継続**と判定します。

第14回の主要修正は概ね正しく、特に ABI 追加によって `RegistrationTooRecent` の復号は実際に機能します。一方、以下が残ります。

- Medium 1件: `graceBad` が滞留票をすべて排出できる時間を見積もっておらず、部分集計確定の余地がある
- Low 1件: `StaleVote()` テストの selector が誤っており、「復号可能」を検証できていない

前回保留理由のうち、猶予中 dead-letter、deploy/check-deploy、RUNBOOK は解消しましたが、締切間際の安全停止はまだ不完全です。

## 1. commit `8e37def` の検証

### ABI と revert 復号

[問題なし] / [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:4) / artifact の `PNounsSnapVoter` ABI と機械比較した結果、error は双方28件で、名前・input名・型・internalTypeまで完全一致しました / 修正不要。

selector の独立計算結果は次のとおりです。

| error signature | 正しい selector | テスト値 | 判定 |
|---|---:|---:|---|
| `RegistrationTooRecent()` | `0x33ab63b9` | `0x33ab63b9` | 正しい |
| `StaleVote()` | `0x93ff56e3` | `0x3d7ac07d` | 誤り |

実際に viem の `ContractFunctionRevertedError` を構築すると、正しい Registration selector では `data.errorName === "RegistrationTooRecent"` となりました。したがって [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:49) の `revertErrorName()` は機能し、二重防御②は復旧しています。

[Low] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:325) / `StaleVote()` の selector が誤っているため、viem はこれを復号せず `data === undefined`、cause は `AbiErrorSignatureNotFoundError` になります。それでも Worker は「RegistrationTooRecent 以外の contract revert」を数えるため、テストは偶然 pass します。「復号可能な恒久 revert」を検証したことにはなりません / selector を `0x93ff56e3` に直し、可能ならテスト内で `revert.data.errorName === "StaleVote"` も明示検証してください。selector はハードコードせず `toFunctionSelector("StaleVote()")` 等から生成する方が安全です。

[問題なし] / [abi.js](/mnt/data/pnouns-voter/relayer-cf/src/abi.js:4) / ABI 肥大による decode 誤爆は認められません。追加した28 error と既存 function の4-byte selector に衝突はありません。viem は revert data の selector と一致する error だけを復号し、未知 selector は今回の誤った StaleVote テストのように未復号になります / 修正不要。ABI増加量も運用上無視できる範囲です。

### `graceBad`

[Medium] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:520)、[worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:160) / `ceil((cronSec + submitBufferSec)/12)` は「最初の投函 wave を開始・採掘する余裕」の見積りとしては妥当ですが、滞留票をすべて排出する見積りではありません。

mainnet 既定では rush でも1 wave最大 `2 × 10 = 20` 票です。さらに `snapsent` がある次 tick は receipt を確認して return するため、新しい wave は早くてもその次の tick です。したがって、例えば猶予明け時に21票以上滞留している場合、現在の `graceBad=false` でも一部しか締切前に投函できず、その部分集計を `maybeExecute()` が確定する可能性があります / 次のいずれかを推奨します。

- 猶予明け時点の未解決票数と実効排出速度から必要時間を計算する
- 安全側に、遅い登録では `eligibleAt + worstCaseDrainBlocks < deadline` を要求する
- 締切時に未解決票・未確定 `snapsent` が1件でもあれば execute を停止する最終防壁を追加する

少なくとも「21票以上」「複数 wave」「receipt 確認 tick を挟む」「締切後に部分集計を execute しない」の回帰テストが必要です。

[問題なし] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:524) / `>=` 境界は安全側として妥当です。コントラクトは deadline 到達前に採掘される必要があるため、`eligibleAt + drainBlocks == deadline` を止めるのは保証上の誤停止ではありません。cron のタイミングが偶然良ければ間に合う可能性はありますが、それは保証可能な経路ではありません / 修正不要。

[問題なし] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:503) / `linkBad`、`timelineBad`、`graceBad` は独立に検査され、必要な警告を出した後、mainnet ではいずれかが成立すれば処理を停止します。危険な条件が後続の告知・投函・executeを再び有効にする優先順位矛盾はありません / 修正不要。

[問題なし・要運用明記] / [worker.js](/mnt/data/pnouns-voter/relayer-cf/src/worker.js:539)、[PNounsSnapVoter.sol](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:193) / mainnet で `graceBad` になった提案は、その後も毎 tick `continue` し、締切後も自動 execute・`no votes` 確定を行いません。票が未受理なら unregister は可能です。ただし通常の delay のまま再登録すると `eligibleAtBlock = 再登録ブロック + delay` となり、以前より遅くなるため回復しません / RUNBOOK に「単純な unregister→再登録では回復しない」と明記してください。救済は手動投票・手動集計、または owner が短い delay で再登録して直後に運用値へ戻す例外手順になりますが、後者は複数ロールの厳格な手順化が必要です。

### deploy / check-deploy

[問題なし] / [deploy-snapvoter.js](/mnt/data/pnouns-voter/scripts/mainnet/deploy-snapvoter.js:14) / `MARGIN` は整数かつ10〜7200、OWNER・REGISTRAR・全EXCLUDEDは `ethers.getAddress()` で検証され、ゼロアドレスも拒否されます。デプロイ前に実行されるため危険な設定で送信されません / 修正不要。

[問題なし] / [check-deploy.mjs](/mnt/data/pnouns-voter/scripts/check-deploy.mjs:48) / `if (requireEnv(...)) if (E(...)) check(...)` は見た目は不自然ですが正しく動きます。欠落時は `requireEnv()` 内で `failed++` し、false を返すため比較だけをスキップし、最終的に exit 1 になります。`EXPECT_MARGIN` は deployed から、`EXPECT_BOT` は worker から mainnet 必須です / 可読性のため中括弧に整理する余地はありますが、機能バグではありません。

### RUNBOOK の `env $ENV`

[問題なし] / [RUNBOOK-MAINNET.md](/mnt/data/pnouns-voter/docs/RUNBOOK-MAINNET.md:44) / Bash で実コマンドを試し、`env $ENV node ...` により `NETWORK`、`EXPECT_OWNER`、`EXPECT_MARGIN` が子プロセスへ渡ることを確認しました / 修正不要。値に空白や shell glob を含められない形式ですが、現行のアドレス・数値用途では問題ありません。

### 新テスト4本の実質

[Info] / [worker-tick.test.mjs](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:302) / 票取得、envelope 構築、simulate、gas estimate、`writeContract`、`snapsent` 保存までは実際の Worker 経路を通っています。したがって「投函送信開始経路をテストした」は正確です / 修正不要。

[Low] / 同箇所 / receipt 成功・失敗、`snapsent` 削除、オンチェーン `voterRec` 再取得、scan offset/cursor 前進、通知重複防止までは通っていません。「実投函フルパス」「最後まで通す」は言い過ぎです / 表現を「送信・snapsent 保存まで」に限定し、Sepolia E2E で receipt→再走査→cursor前進を確認してください。

## 2. 第10〜15回の総括

### 未対応項目

accepted risk を除く過去指摘は、今回新たに判明した次の2点以外は対応済みです。

1. `graceBad` の全滞留票排出量を考慮しない問題
2. `StaleVote()` selector テストの誤り

第11回時点の Worker状態遷移テスト、runbook、鍵分離、deploy/check-deploy、猶予中dead-letter、ABI復号は、コード上は解消されています。

### accepted risk

- 悪意ある registrar が自己整合する誤対応を登録した場合、本文URL照合では検出不能  
  妥当。ただし24時間猶予、独立鍵、公開監視を前提とする信頼モデルです。

- 直接 `castVote()` 後でも、Snapshot票未受理なら unregister でき、tally/bitmap は残る  
  直接投票による取消妨害DoSを避ける意図的トレードオフとして妥当。資料の表現修正済みです。

- `pendingnotes` の KV put 失敗窓、20件上限、通信切断時の重複通知  
  投票・集計の正しさに影響しない補助通知なので妥当です。

- `/vote/989偽` を `/vote/989` とみなす false positive  
  URL照合を厳密なセキュリティ境界と扱わない条件で妥当です。

- Worker mock が supplement、dead-letter、receipt/reconcile、非Snapshot全経路を網羅しない  
  条件付きで妥当ですが、今回の誤selectorが示すとおりテスト品質リスクは実在します。receipt→cursor前進はSepolia E2E必須です。

## Sepolia E2E で必ず確認する項目

1. registrar・relayer・owner・Snapshot bot が4つの別アドレスである。
2. create-and-register 後、対応表・`registeredAtBlock`・`eligibleAtBlock` が期待値と一致する。
3. 猶予中にSnapshot票を入れても、`snapsent`・`snapdrop`・dead-letterが増えない。
4. `block == eligibleAtBlock` 以降、同じ票が自動投函される。
5. 実txのreceipt成功後、`snapsent` が削除され、次回走査で `voterRec` を確認してoffset/cursorが前進する。
6. 複数バッチ、特に21票以上で、全票が締切前に排出されるか、未解決票があればexecuteを止める。
7. `RegistrationTooRecent()` と `StaleVote()` の実revertが期待名として復号され、前者だけdrop非加算になる。
8. Hub GraphQL error・対応不明・link不一致・timeline不足で告知、投函、executeがfail-closedになる。
9. receipt revert・10分未採掘時に再評価され、票が消失・重複しない。
10. 締切後の最終tallyがSnapshot全票と一致し、shadow/live双方で期待どおり通知・executeされる。

## テスト結果

`relayer-cf` で指定どおり `npm test` を実行し成功しました。

- `npm test`: 4テストファイル pass、fail 0
- `node --test --test-isolation=none`: 43 tests、43 pass、fail 0
- Worker単体: 17 tests、17 pass

ただし、上述の誤った `StaleVote` selector を含んだまま43件すべて通るため、pass数だけではその復号テストの正当性を担保しません。

最終判定は、**Medium の全滞留票排出／締切時未解決票ガードを修正し、正しい StaleVote selector のテストを追加した後にコード面クローズ**です。Sepolia E2E完了前の mainnet 移行は推奨しません。リポジトリへの変更は行っていません。
