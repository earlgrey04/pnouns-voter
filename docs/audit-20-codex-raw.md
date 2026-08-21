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
session id: 01a0224f-4092-7123-a05d-cdb36de3bd07
--------
user
# 監査依頼 (第20回) — 第19回指摘への修正の検証(クローズ判定)

あなたは pNouns Voter の第三者監査者です。第19回監査(docs/audit-19-codex-raw.md)で
「Sepolia ライブテスト不可・4 件修正せよ」と判定し、commit 2bc1ddc で対応しました
(`git show 2bc1ddc`)。修正が正しいか・新しい欠陥を持ち込んでいないかを検証し、
**今度こそ Sepolia ライブテストへ進んでよいか**を判定してください。
ファイル変更禁止。日本語。relayer-cf で npm test を実行し結果を含めること。

## 第19回の必須 4 件への対応(検証対象)
1. [高・64KiB DoS] resolveMappings と autoRegister の一覧取得を GraphQL の author 絞り
   (where に author:SNAPSHOT_BOT)にした。詳細取得は候補単位 try/catch でスキップ。
   → author 絞りは本当に DoS を塞ぐか(bot 自身が長い discussion を作れる懸念、
     SNAPSHOT_BOT 未設定時 = resolveMappings の authorFilter が空文字になる経路、
     Hub が author フィルタを無視/部分適用する可能性)。詳細取得スキップの網羅性
2. [高・投票可能性] 選別に「end - now > cronSec + submitBufferSec + 300」を追加。
   → この下限で十分か。start 未来・type 以外の未検証フィールドは accepted か
3. [中・一意性] 全 screened を照合、一覧が上限(100)到達かつ複数候補なら保留。
   → 上限 100 と「複数候補」条件の相互作用。ちょうど 100 で 1 候補の場合の穴
4. [中・AlreadyRegistered] nounsToSnap を読み戻し、期待ハッシュ一致なら静かに退く/
   別 ID なら警告停止。
   → keccak256(stringToBytes(snapId)) が snapToNouns の登録キーと本当に一致するか
     (コントラクトの registerProposal の実装 keccak256(bytes(snapshotProposal)) と照合)

## 追加で疑う点
- resolveMappings の author 絞りが、既存の照合(linkOk/告知)や、過去に別 author で
  登録された提案の扱いを壊さないか。SNAPSHOT_BOT 未設定の既存 Sepolia 運用への影響
- regsent2 TTL 3日への変更で KV 予算・古い記録の悪影響はないか
- 資料の discussion 照合への訂正が実装と一致したか(snap.js の linkOk は discussion のみ)
- テスト 61 本で、第19回の残不足(strategy/snapshot block/6件以上/reorg 等)のうち
  何が今も未カバーか。ライブ前に最低限やるべきテストは何か

## 出力
[重大度]/該当箇所/何が起きるか/推奨。問題なしも根拠つき。最後に
「Sepolia ライブテストへ進んでよいか」を明確に(可/不可/条件付き可)。
codex
第19回の指摘、対象コミット差分、現行コードとテストを突き合わせます。まず監査資料・コミット・リポジトリ指示を確認し、その後 `relayer-cf` のテストを実行します（読み取り専用のため、テストが生成物を書こうとする場合はその制約も明記します）。
exec
/bin/bash -lc "pwd && rg --files -g 'AGENTS.md' -g 'docs/audit-19-codex-raw.md' -g 'relayer-cf/**' -g 'contracts/**' -g '*.sol' | sed -n '1,240p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
/mnt/data/pnouns-voter
contracts/PNounsVoter.sol
contracts/PNounsSnapVoter.sol
relayer-cf/wrangler.toml
relayer-cf/package.json
relayer-cf/package-lock.json
contracts/test/Mock1271Wallet.sol
relayer-cf/test/worker-tick.test.mjs
relayer-cf/test/link-check.test.mjs
relayer-cf/test/format-equivalence.test.mjs
relayer-cf/test/cursor.test.mjs
relayer-cf/test/accept-deadline.test.mjs
relayer-cf/.dev.vars
relayer-cf/public/_headers
relayer-cf/public/index.html
relayer-cf/public/app.js
relayer-cf/src/worker.js
relayer-cf/src/store.js
relayer-cf/src/snap.js
relayer-cf/src/register.js
relayer-cf/src/index.js
relayer-cf/src/chain.js
relayer-cf/src/abi.js
relayer-cf/node_modules/youch-core/README.md
relayer-cf/node_modules/youch-core/package.json
relayer-cf/node_modules/youch-core/LICENSE.md
relayer-cf/node_modules/hono/README.md
relayer-cf/node_modules/@cloudflare/workerd-linux-64/README.md
relayer-cf/node_modules/hono/package.json
relayer-cf/node_modules/hono/LICENSE
relayer-cf/node_modules/@cloudflare/workerd-linux-64/package.json
relayer-cf/node_modules/.cache/wrangler/wrangler-account.json
relayer-cf/node_modules/blake3-wasm/targets.json
relayer-cf/node_modules/blake3-wasm/readme.md
relayer-cf/node_modules/blake3-wasm/package.json
relayer-cf/node_modules/blake3-wasm/LICENSE
relayer-cf/node_modules/error-stack-parser-es/README.md
relayer-cf/node_modules/error-stack-parser-es/package.json
relayer-cf/node_modules/error-stack-parser-es/LICENSE
relayer-cf/node_modules/esbuild/README.md
relayer-cf/node_modules/esbuild/package.json
relayer-cf/node_modules/esbuild/LICENSE.md
contracts/vendor/pnouns/erc721a/contracts/IERC721A.sol
relayer-cf/node_modules/detect-libc/README.md
relayer-cf/node_modules/detect-libc/package.json
relayer-cf/node_modules/detect-libc/LICENSE
relayer-cf/node_modules/@cloudflare/workerd-linux-64/bin/workerd
relayer-cf/node_modules/youch-core/build/src/types.js
relayer-cf/node_modules/youch-core/build/src/types.d.ts
relayer-cf/node_modules/youch-core/build/src/source_file.d.ts
relayer-cf/node_modules/youch-core/build/src/parser.d.ts
relayer-cf/node_modules/youch-core/build/src/debug.d.ts
relayer-cf/node_modules/youch-core/build/index.js
relayer-cf/node_modules/youch-core/build/index.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node.test.js.map
relayer-cf/node_modules/blake3-wasm/esm/node.test.js
relayer-cf/node_modules/blake3-wasm/esm/node.test.d.ts
relayer-cf/node_modules/error-stack-parser-es/dist/lite.mjs
relayer-cf/node_modules/error-stack-parser-es/dist/lite.d.ts
relayer-cf/node_modules/error-stack-parser-es/dist/lite.d.mts
relayer-cf/node_modules/error-stack-parser-es/dist/lite.d.cts
relayer-cf/node_modules/error-stack-parser-es/dist/lite.cjs
relayer-cf/node_modules/error-stack-parser-es/dist/index.mjs
relayer-cf/node_modules/error-stack-parser-es/dist/index.d.ts
relayer-cf/node_modules/error-stack-parser-es/dist/index.d.mts
relayer-cf/node_modules/error-stack-parser-es/dist/index.d.cts
relayer-cf/node_modules/error-stack-parser-es/dist/index.cjs
relayer-cf/node_modules/esbuild/lib/main.js
relayer-cf/node_modules/esbuild/lib/main.d.ts
relayer-cf/node_modules/esbuild/install.js
relayer-cf/node_modules/hono/dist/index.js
relayer-cf/node_modules/hono/dist/http-exception.js
relayer-cf/node_modules/hono/dist/hono.js
relayer-cf/node_modules/hono/dist/hono-base.js
relayer-cf/node_modules/@adraffy/ens-normalize/README.md
relayer-cf/node_modules/@adraffy/ens-normalize/package.json
relayer-cf/node_modules/@adraffy/ens-normalize/LICENSE
relayer-cf/node_modules/detect-libc/lib/process.js
relayer-cf/node_modules/detect-libc/lib/filesystem.js
relayer-cf/node_modules/detect-libc/lib/elf.js
relayer-cf/node_modules/detect-libc/lib/detect-libc.js
relayer-cf/node_modules/detect-libc/index.d.ts
contracts/vendor/pnouns/erc721a/contracts/extensions/IERC721AQueryable.sol
contracts/vendor/pnouns/erc721a/contracts/extensions/ERC721AQueryable.sol
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol
relayer-cf/node_modules/youch/README.md
relayer-cf/node_modules/youch/package.json
relayer-cf/node_modules/youch/LICENSE.md
relayer-cf/node_modules/@cloudflare/unenv-preset/README.md
relayer-cf/node_modules/@cloudflare/unenv-preset/package.json
relayer-cf/node_modules/hono/dist/validator/validator.js
relayer-cf/node_modules/hono/dist/validator/utils.js
relayer-cf/node_modules/hono/dist/validator/index.js
relayer-cf/node_modules/@scure/bip39/wordlists/traditional-chinese.js
relayer-cf/node_modules/@scure/bip39/wordlists/traditional-chinese.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/spanish.js
relayer-cf/node_modules/@scure/bip39/wordlists/spanish.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/simplified-chinese.js
relayer-cf/node_modules/@scure/bip39/wordlists/simplified-chinese.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/portuguese.js
relayer-cf/node_modules/@scure/bip39/wordlists/portuguese.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/korean.js
relayer-cf/node_modules/@scure/bip39/wordlists/korean.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/japanese.js
relayer-cf/node_modules/@scure/bip39/wordlists/japanese.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/italian.js
relayer-cf/node_modules/@scure/bip39/wordlists/italian.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/french.js
relayer-cf/node_modules/@scure/bip39/wordlists/french.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/english.js
relayer-cf/node_modules/@scure/bip39/wordlists/english.d.ts
relayer-cf/node_modules/@scure/bip39/wordlists/czech.js
relayer-cf/node_modules/@scure/bip39/wordlists/czech.d.ts
relayer-cf/node_modules/esbuild/bin/esbuild
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
relayer-cf/node_modules/cookie/README.md
relayer-cf/node_modules/cookie/package.json
relayer-cf/node_modules/cookie/LICENSE
relayer-cf/node_modules/@adraffy/ens-normalize/dist/nf.min.js
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index.mjs
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index.min.js
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index.d.mts
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index.d.cts
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index.cjs
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index-xnf.mjs
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index-xnf.min.js
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index-xnf.d.mts
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index-xnf.d.cts
relayer-cf/node_modules/@adraffy/ens-normalize/dist/index-xnf.cjs
relayer-cf/node_modules/@adraffy/ens-normalize/dist/all.min.js
relayer-cf/node_modules/@adraffy/ens-normalize/dist/all.js
relayer-cf/node_modules/.package-lock.json
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-wal
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-shm
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/metadata.sqlite
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-wal
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-shm
relayer-cf/.wrangler/state/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite
relayer-cf/node_modules/hono/dist/utils/url.js
relayer-cf/node_modules/hono/dist/utils/types.js
relayer-cf/node_modules/hono/dist/utils/stream.js
relayer-cf/node_modules/hono/dist/utils/mime.js
relayer-cf/node_modules/cookie/dist/index.js.map
relayer-cf/node_modules/cookie/dist/index.js
relayer-cf/node_modules/cookie/dist/index.d.ts
relayer-cf/node_modules/hono/dist/client/fetch-result-please.js
relayer-cf/node_modules/hono/dist/client/client.js
relayer-cf/node_modules/@scure/bip39/src/index.ts
relayer-cf/node_modules/@scure/bip39/README.md
relayer-cf/node_modules/@scure/bip39/package.json
relayer-cf/node_modules/@scure/bip39/LICENSE
relayer-cf/node_modules/@scure/bip39/index.js
relayer-cf/node_modules/@scure/bip39/index.d.ts
relayer-cf/node_modules/hono/dist/client/utils.js
relayer-cf/node_modules/hono/dist/client/types.js
relayer-cf/node_modules/hono/dist/client/index.js
relayer-cf/node_modules/.mf/cf.json
relayer-cf/node_modules/@cloudflare/unenv-preset/dist/index.d.mts
relayer-cf/node_modules/eventemitter3/README.md
relayer-cf/node_modules/eventemitter3/package.json
relayer-cf/node_modules/eventemitter3/LICENSE
relayer-cf/node_modules/eventemitter3/index.mjs
relayer-cf/node_modules/eventemitter3/index.js
relayer-cf/node_modules/eventemitter3/index.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node/wasm.js.map
relayer-cf/node_modules/blake3-wasm/esm/node/wasm.js
relayer-cf/node_modules/blake3-wasm/esm/node/wasm.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node/index.js.map
relayer-cf/node_modules/blake3-wasm/esm/node/index.js
relayer-cf/node_modules/blake3-wasm/esm/node/index.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node/hash-reader.js.map
relayer-cf/node_modules/blake3-wasm/esm/node/hash-reader.js
relayer-cf/node_modules/blake3-wasm/esm/node/hash-reader.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node/hash-instance.js.map
relayer-cf/node_modules/blake3-wasm/esm/node/hash-instance.js
relayer-cf/node_modules/blake3-wasm/esm/node/hash-instance.d.ts
relayer-cf/node_modules/blake3-wasm/esm/node/hash-fn.js.map
relayer-cf/node_modules/blake3-wasm/esm/node/hash-fn.js
relayer-cf/node_modules/blake3-wasm/esm/node/hash-fn.d.ts
relayer-cf/node_modules/blake3-wasm/esm/index.js.map
relayer-cf/node_modules/blake3-wasm/esm/index.js
relayer-cf/node_modules/blake3-wasm/esm/index.d.ts
relayer-cf/node_modules/hono/dist/helper/websocket/index.js
relayer-cf/node_modules/youch/build/src/youch.d.ts
relayer-cf/node_modules/youch/build/src/types.js
relayer-cf/node_modules/youch/build/src/types.d.ts
relayer-cf/node_modules/youch/build/src/templates.d.ts
relayer-cf/node_modules/hono/dist/utils/jwt/utf8.js
relayer-cf/node_modules/hono/dist/utils/jwt/types.js
relayer-cf/node_modules/hono/dist/utils/jwt/jwt.js
relayer-cf/node_modules/hono/dist/utils/jwt/jws.js
relayer-cf/node_modules/hono/dist/utils/jwt/jwa.js
relayer-cf/node_modules/hono/dist/utils/jwt/index.js
relayer-cf/node_modules/hono/dist/utils/ipaddr.js
relayer-cf/node_modules/hono/dist/utils/http-status.js
relayer-cf/node_modules/hono/dist/utils/html.js
relayer-cf/node_modules/hono/dist/utils/headers.js
relayer-cf/node_modules/hono/dist/utils/handler.js
relayer-cf/node_modules/hono/dist/utils/filepath.js
relayer-cf/node_modules/hono/dist/utils/encode.js
relayer-cf/node_modules/hono/dist/utils/crypto.js
relayer-cf/node_modules/hono/dist/utils/cookie.js
relayer-cf/node_modules/hono/dist/utils/constants.js
relayer-cf/node_modules/hono/dist/utils/concurrent.js
relayer-cf/node_modules/hono/dist/utils/compress.js
relayer-cf/node_modules/hono/dist/utils/color.js
relayer-cf/node_modules/hono/dist/utils/buffer.js
relayer-cf/node_modules/hono/dist/utils/body.js
relayer-cf/node_modules/hono/dist/utils/basic-auth.js
relayer-cf/node_modules/hono/dist/utils/accept.js
relayer-cf/node_modules/hono/dist/types.js
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.umd.min.js.map
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.umd.min.js
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.umd.js
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.esm.min.js.map
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.esm.min.js
relayer-cf/node_modules/eventemitter3/dist/eventemitter3.esm.js
relayer-cf/node_modules/blake3-wasm/esm/build/versions.js.map
relayer-cf/node_modules/blake3-wasm/esm/build/versions.js
relayer-cf/node_modules/blake3-wasm/esm/build/versions.d.ts
relayer-cf/node_modules/blake3-wasm/esm/build/install.js.map
relayer-cf/node_modules/blake3-wasm/esm/build/install.js
relayer-cf/node_modules/blake3-wasm/esm/build/install.d.ts
relayer-cf/node_modules/blake3-wasm/esm/build/generate-tasks.js.map
relayer-cf/node_modules/blake3-wasm/esm/build/generate-tasks.js
relayer-cf/node_modules/blake3-wasm/esm/build/generate-tasks.d.ts
relayer-cf/node_modules/blake3-wasm/esm/build/add-js-extensions.js.map
relayer-cf/node_modules/blake3-wasm/esm/build/add-js-extensions.js
relayer-cf/node_modules/blake3-wasm/esm/build/add-js-extensions.d.ts
relayer-cf/node_modules/blake3-wasm/esm/browser.test.js.map

exec
/bin/bash -lc 'git status --short && git show --stat --oneline 2bc1ddc && git show --format=fuller --find-renames 2bc1ddc -- docs/audit-19-codex-raw.md relayer-cf/src relayer-cf/test docs contracts/PNounsSnapVoter.sol && find .. -name AGENTS.md -print' in /mnt/data/pnouns-voter
 succeeded in 6628ms:
../RuView/repo/plugins/ruview/codex/AGENTS.md
../zotero/zotero_auto_ingest/translation-server/modules/translators/AGENTS.md
../EC_site/AGENTS.md
../EC_site/node_modules/next/AGENTS.md
../LineHernes/line-harness-oss/AGENTS.md

exec
/bin/bash -lc "ls docs | sed -n '1,160p'; git show 2bc1ddc"'^:docs/audit-19-codex-raw.md | sed -n '"'1,260p'; sed -n '1,260p' relayer-cf/src/snap.js; sed -n '1,260p' relayer-cf/src/register.js" in /mnt/data/pnouns-voter
 succeeded in 0ms:
AUDIT-BRIEF-2.md
AUDIT-BRIEF.md
AUDIT-RESPONSE-2026-08-18.md
RUNBOOK-MAINNET.md
audit-10-codex-raw.md
audit-11-codex-raw.md
audit-12-codex-raw.md
audit-13-codex-raw.md
audit-14-codex-raw.md
audit-15-codex-raw.md
audit-16-codex-raw.md
audit-17-codex-raw.md
audit-18-codex-raw.md
diagram
member-doc1-current-ops.html
member-doc2-pnouns-voter.html
member-doc3-b3-plan.html
member-proposal-unified.html
qwen-review-2026-08-21.md
report-2026-08-18.html
fatal: path 'docs/audit-19-codex-raw.md' does not exist in '2bc1ddc^'
// B3 モード: Snapshot(本物のハブ)の投票署名を取得し、PNounsSnapVoter に送信する。
// 監査対応:
//  H04 — オンチェーンの voterRec を真実とし、固定幅 window を KV offset で巡回する。
//        timestamp cursor を使わないため、同一秒に何票あっても後続ページへ到達できる。
//  M01R — 対応付けは毎 tick オンチェーンで再検証する(取消・再登録に追従)。
//  M06R — 応答はストリームで 64KB 打ち切り。検証できない票では window を進めず、
//         恒久的に取得できない票は dead-letter に記録して警告する(黙って捨てない)。
import { METAGOV_ABI } from "./chain.js";
import { keccak256, stringToBytes } from "viem";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY = 64 * 1024;
const DEAD_LETTER_AFTER = 20; // 連続失敗回数(≒20 分)でデッドレター送り

async function fetchLimited(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const reader = r.body?.getReader();
    if (!reader) throw new Error("no body");
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) { try { await reader.cancel(); } catch {} throw new Error("body too large"); }
      chunks.push(value);
    }
    const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
    return JSON.parse(new TextDecoder().decode(buf));
  } finally { clearTimeout(t); }
}
export async function hubGql(c, query) {
  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  if (j.errors) throw new Error("hub graphql: " + JSON.stringify(j.errors).slice(0, 200));
  if (!j.data) throw new Error("hub graphql: no data");
  return j.data;
}

/// ハブ上の投票者数(1 人 1 レコード)。締切時の「未反映の票が残っていないか」の最終確認に使う(第15回監査)
export async function snapshotVoterCount(c, snapId) {
  const d = await hubGql(c, `{ proposal(id:"${snapId}") { votes } }`);
  const n = Number(d?.proposal?.votes);
  if (!Number.isFinite(n)) throw new Error("hub: votes count shape");
  return n;
}

/// Snapshot 提案 ↔ Nouns 提案の対応付けを毎回オンチェーンで検証して返す(M01R)。
/// 指摘5: ハブの直近提案だけでなく、**現在処理対象の Nouns 提案**からも逆引きする
///        (同じ space で新しい提案が 15 件以上作られても、投票期間中の対応付けを失わない)。
// テキスト中に nouns.wtf の当該議案ページ URL が含まれるか。
// 仕様上の割り切り(第13回監査で文書化): URL 直後の非 ASCII(日本語など)は「後置の文」とみなして
// 除去するため、"…/vote/989偽" は 989 への参照として受理される(緩い側)。この照合は
// 「取り違え事故の検出」が目的の補助チェックであり、厳密な誤登録防止は猶予+取消+公開が担う。
// 文字列一致ではなく URL として解析する: evilnouns.wtf / fake.nouns.wtf を弾き、
// 大文字ホスト・クエリ・フラグメント・末尾スラッシュを正しく扱い、/vote/12 が /vote/123 に誤マッチしない。
export function referencesNounsProposal(text, nounsId) {
  const id = Number(nounsId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const s = String(text || "");
  if (!s) return false;
  for (const raw of s.match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    // URL の直後に続く句読点・閉じ括弧・日本語などを落としてから解析する。
    // 例: "…/vote/989。" "…/vote/989)" "[議案](…/vote/989)" "…/vote/989後"
    // 句読点と非 ASCII を交互に含む末尾("989.後" など)も 1 パスで除去できるよう、1 つの選択式にまとめる
    const trimmed = raw.replace(/(?:[)\]}>,.;:!?、。」』】）〕｝＞…]|[^\u0021-\u007e])+$/u, "");
    let u;
    try { u = new URL(trimmed); } catch { continue; }
    if (u.hostname.toLowerCase().replace(/^www\./, "") !== "nouns.wtf") continue;
    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
  }
  return false;
}

export async function resolveMappings(c, pc, activeNounsIds = []) {
  // 正規 bot が設定されていれば author で絞る(攻撃者の巨大 discussion 提案を候補から排除 = 64KiB DoS 対策・第19回監査)
  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
  const meta = new Map(data.proposals.map((p) => [p.id, p]));
  const found = new Map(); // nounsId -> snapId
  if (data.proposals.length) {
    const res = await pc.multicall({
      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
      allowFailure: false,
    });
    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
  }
  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
  if (missing.length) {
    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    const need = [];
    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    if (need.length) {
      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
      for (const n of need) {
        const p = byHash.get(n.hash);
        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
      }
    }
  }
  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
    const m = meta.get(snapId) || {};
    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
    const linkOk = referencesNounsProposal(m.discussion, nounsId);
    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
  });
  return { mappings, unresolved };
}

/// 純関数: ハブの行とオンチェーン記録から「送るもの」と「進めてよい cursor」を決める。
/// rows は created 昇順。recs[i] = [exists, support, counted, timestamp, digest]。
/// - resolved(オンチェーン反映済み) / skip(対象外・デッドレター) は cursor を進めてよい
/// - それ以外(送る対象・取得失敗)が現れたら、そこで cursor の前進を打ち切る
export function planSubmission(rows, recs, { tokenCounts, uncountedTokens, deadLetters = new Set(), limit = 10, cursor = 0 }) {
  const send = []; const skipped = [];
  let advance = cursor; let blocked = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const rec = recs[i];
    const created = Number(r.created);
    const tokens = tokenCounts[i] ?? 0;
    // 指摘2: 「未計上の tokenId が 1 枚でもあるか」で補完要否を判定する(枚数比較では移転を捉えられない)
    const uncounted = uncountedTokens ? (uncountedTokens[i] ?? 0) : 0; // 既定は保守的に 0(補完しない)
    const exists = !!rec[0];
    const recTs = Number(rec[3] ?? 0);
    const isNew = !exists || created > recTs;
    const needSupplement = exists && created === recTs && uncounted > 0;
    const isSkippable = (!isNew && !needSupplement) || tokens === 0 || deadLetters.has(r.ipfs);
    if (isSkippable) {
      if (tokens === 0 || deadLetters.has(r.ipfs)) skipped.push(r);
      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
      continue;
    }
    blocked = true; // これ以降は cursor を進めない
    if (send.length < limit) send.push({ row: r, index: i });
  }
  return { send, skipped, advance, blocked };
}

/// IPFS からエンベロープを取得(ゲートウェイ冗長化 + GraphQL 行との照合)
export async function fetchEnvelope(c, row, snapId) {
  for (const gw of [c.ipfsGateway, "https://ipfs.io/ipfs", "https://cloudflare-ipfs.com/ipfs"]) {
    try {
      const env = await fetchLimited(`${gw}/${row.ipfs}`);
      const m = env?.data?.message;
      if (!m || typeof env.sig !== "string" || !/^0x[0-9a-fA-F]{2,600}$/.test(env.sig)) throw new Error("bad envelope shape");
      if (String(m.from).toLowerCase() !== String(row.voter).toLowerCase()) throw new Error("voter mismatch");
      if (m.proposal !== snapId) throw new Error("proposal mismatch");
      if (Number(m.timestamp) !== Number(row.created)) throw new Error("timestamp mismatch");
      return env;
    } catch (e) { /* 次のゲートウェイ */ }
  }
  return null;
}

/// ハブの投票を固定幅の window で取得する。
/// timestamp cursor は同一秒の大量投稿を一意に走査できないため使わず、KV に保存した skip offset を
/// 複数 tick で進め、末尾まで到達したら 0 に戻して全体を再走査する。途中で行が追加・削除されても、
/// 次の周回で on-chain voterRec と突き合わせるため恒久的な取りこぼしにはならない。
export const PAGE_SIZE = 100;
export const PAGES_PER_TICK = 3;
export async function fetchRows(c, snapId, offset = 0) {
  const rows = [];
  for (let page = 0; page < PAGES_PER_TICK; page++) {
    const skip = offset + page * PAGE_SIZE;
    const d = await hubGql(c, `{ votes(where:{proposal:"${snapId}"}, first: ${PAGE_SIZE}, skip: ${skip}, orderBy: "created", orderDirection: asc) { voter ipfs choice created } }`);
    if (!Array.isArray(d.votes)) throw new Error("hub: votes shape");
    rows.push(...d.votes);
    if (d.votes.length < PAGE_SIZE) return { rows, nextOffset: 0, wrapped: true };
  }
  return { rows, nextOffset: offset + rows.length, wrapped: false };
}

/// 補完判定に必要な tokenId を重複排除する。hasTokenVoted は proposalId/tokenId のみで決まり、
/// 同じ投票者の複数行ごとに再照会する必要はない。
export function supplementCheckPlan(rows, recs, tokensByRow) {
  const rowIndexes = [];
  const unique = new Set();
  rows.forEach((r, i) => {
    if (!recs[i]?.[0] || Number(r.created) !== Number(recs[i]?.[3] ?? 0) || !tokensByRow[i]?.length) return;
    rowIndexes.push(i);
    for (const id of tokensByRow[i]) unique.add(Number(id));
  });
  return { rowIndexes, tokenIds: [...unique].sort((a, b) => a - b) };
}

/// 同じ voter の候補を 1 バッチに複数入れると、個別 simulate は成功しても組合せで
/// StaleVote になりうる。voter ごとに created が新しく、同値なら CID が大きい 1 行へ正規化する。
export function uniqueVoterCandidates(send, limit) {
  const byVoter = new Map();
  for (const item of send) {
    const key = item.row.voter.toLowerCase();
    const prev = byVoter.get(key);
    if (!prev || Number(item.row.created) > Number(prev.row.created)
      || (Number(item.row.created) === Number(prev.row.created) && String(item.row.ipfs) > String(prev.row.ipfs))) byVoter.set(key, item);
  }
  return [...byVoter.values()].sort((a, b) => Number(a.row.created) - Number(b.row.created) || String(a.row.ipfs).localeCompare(String(b.row.ipfs))).slice(0, limit);
}

export const scanKey = (store, nounsId, snapId) => `${store.prefix}snapscan:${nounsId}:${snapId}`;
export const deadKey = (store, nounsId) => `${store.prefix}snapdead:${nounsId}`;
export const failKey = (store, nounsId) => `${store.prefix}snapfail:${nounsId}`;
// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
// 安全設計(第18回監査で強化):
//  - ハブ上の提案を「URL の自己申告」だけで登録しない。Nouns のオンチェーン本文から
//    buildProposal で期待内容を再計算し、title/body/discussion/choices の完全一致を要求
//  - 候補の選別(author=正規 bot / type=single-choice / 投票期間が現在有効)を通過した提案だけ
//    本文を 1 件ずつ取得(本文の一括取得は 64KiB 上限 DoS になるため行わない)
//  - 完全一致がちょうど 1 件のときだけ登録(0 件: 警告して保留 / 2 件以上: 曖昧として保留)
//  - 送信は {tx, at} を KV に記録し、10 分未採掘なら再試行。AlreadyRegistered は競合として扱う
import { DAO_ABI, METAGOV_ABI, revertErrorName } from "./chain.js";
import { hubGql, referencesNounsProposal } from "./snap.js";
import { keccak256, stringToBytes } from "viem";

// ---- scripts/lib/proposal-format.mjs と同一ロジック(同値性は回帰テストで担保) ----
export const CHOICES = ["賛成", "反対", "棄権"];
export const DEFAULT_BODY_LIMIT = 9500;
export function extractTitle(description, fallbackId) {
  const first = String(description || "").split("\n").find((l) => l.trim()) || "";
  const t = first.replace(/^#+\s*/, "").trim();
  return t || `Proposal ${fallbackId}`;
}
export function truncateBody(description, url, limit = DEFAULT_BODY_LIMIT) {
  const body = String(description || "").trim();
  if (body.length <= limit) return { body, truncated: false };
  const notice = `\n\n---\n\n**⚠️ 本文が長いため、ここで省略しています。全文は Nouns DAO の提案ページをご覧ください:**\n${url}\n`;
  const cut = body.slice(0, limit - notice.length);
  const lastBreak = cut.lastIndexOf("\n\n");
  const head = lastBreak > limit * 0.5 ? cut.slice(0, lastBreak) : cut;
  return { body: head.trimEnd() + notice, truncated: true };
}
export function buildProposal({ nounsId, description, limit = DEFAULT_BODY_LIMIT }) {
  const url = `https://nouns.wtf/vote/${nounsId}`;
  const title = `[Prop ${nounsId}] ${extractTitle(description, nounsId)}`;
  const { body, truncated } = truncateBody(description, url, limit);
  return { title, body, discussion: url, choices: [...CHOICES], truncated };
}

/// Nouns 提案のオンチェーン本文(作成イベント + 更新イベントの最新)。
/// Pending/Active では本文は凍結済みのため、KV に 1 回だけ保存して再利用する(RPC ログ取得の節約)。
export async function nounsDescription(c, pc, store, id, creationBlock) {
  const ck = `${store.prefix}desc:${id}`;
  const cached = await store.kvRaw.get(ck);
  if (cached !== null) return cached;
  const events = DAO_ABI.filter((x) => x.type === "event");
  const latest = await pc.getBlockNumber();
  const created = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: BigInt(creationBlock), events });
  let desc = null;
  for (const l of created) if (l.eventName && l.eventName.startsWith("ProposalCreated") && Number(l.args.id) === Number(id)) desc = String(l.args.description || "");
  if (desc === null) return null;
  const updates = await pc.getLogs({ address: c.nounsDAO, fromBlock: BigInt(creationBlock), toBlock: latest, events: events.filter((e) => e.name === "ProposalUpdated" || e.name === "ProposalDescriptionUpdated"), args: { id: BigInt(id) } });
  for (const l of updates) if (Number(l.args.id) === Number(id)) desc = String(l.args.description ?? desc); // 空文字への更新も有効な最新値(第18回監査)
  await store.kvRaw.put(ck, desc, { expirationTtl: 86400 * 14 });
  return desc;
}

async function warnOnce(c, store, notify, key, ttl, text) {
  if (await store.getFlag(key)) return;
  const sent = await notify(c, text);
  if (sent !== false) await store.setFlag(key, ttl);
}

/// 未登録の active な Nouns 提案について、対応する Snapshot 提案を探し、検証して登録する。
export async function autoRegister(c, pc, registrar, store, notify, p) {
  // 送信済み記録: 10 分は再送しない。それを過ぎたら receipt を確認して再試行を判断
  const sentK = `${store.prefix}regsent2:${p.id}`;
  const pending = await store.kvRaw.get(sentK, "json");
  if (pending) {
    if (Date.now() - pending.at < 10 * 60 * 1000) return;
    let rcpt = null;
    try { rcpt = await pc.getTransactionReceipt({ hash: pending.tx }); } catch { rcpt = null; }
    await store.kvRaw.delete(sentK);
    if (rcpt && rcpt.status === "success") return; // 成功していれば次 tick で snapInfo が現れ、ここには来なくなる
    console.warn(`[register] prop ${p.id}: 前回の登録 tx が${rcpt ? "revert" : "未採掘"}のため再試行します`);
  }

  // 1) 候補の列挙: GraphQL 側で正規 bot に絞る(攻撃者の巨大 discussion 提案は来ない = 64KiB DoS 対策)。
  //    small フィールドのみ。author が未設定の運用では自動登録しない(cfg で必須化済み)。
  const LIST = 100; // 一覧上限。これを超える bot 提案が該当する状況は異常なので、超過は一意性不明として保留する
  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
  const all = data.proposals || [];
  const refs = all.filter((x) => referencesNounsProposal(x.discussion, p.id));
  if (!refs.length) return; // bot がまだ提案を作っていない — 次 tick に再確認
  if (all.length >= LIST && refs.length > 1) { // 一覧が上限に達し、かつ複数候補 = 範囲外に更なる候補がある恐れ
    await warnOnce(c, store, notify, `reglist:${p.id}`, 86400, `⚠️ Prop ${p.id}: bot の提案が多く、候補の一意性を確認できないため自動登録を保留しました。`);
    return;
  }

  // 2) 選別: single-choice・投票期間が現在有効で、残り時間が投函に必要な余裕を上回る
  const now = Date.now() / 1000;
  const minRemainSec = c.cronSec + c.submitBufferSec + 300; // 猶予明け後に投函・採掘できる最小残り時間
  const screened = refs.filter((x) =>
    x.type === "single-choice" &&
    Number(x.start) <= now && Number(x.end) - now > minRemainSec && Number(x.end) - Number(x.start) <= 8 * 86400);
  if (!screened.length) {
    await warnOnce(c, store, notify, `regscreen:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 ${refs.length} 件)。`);
    return;
  }

  // 3) オンチェーン本文から期待内容を再計算
  const desc = await nounsDescription(c, pc, store, p.id, p.creationBlock);
  if (desc === null) { console.warn(`[register] prop ${p.id}: オンチェーン本文を取得できず登録を見送り`); return; }
  const expected = buildProposal({ nounsId: p.id, description: desc });

  // 4) 候補を 1 件ずつ取得して完全一致を数える。取得失敗(64KiB 超過等)はその候補だけスキップし走査を続ける
  const matches = [];
  let skipped = 0;
  for (const cand of screened) {
    let x = null;
    try { x = (await hubGql(c, `{ proposal(id:"${cand.id}") { id title body discussion choices } }`))?.proposal; }
    catch (e) { skipped++; console.warn(`[register] prop ${p.id}: 候補 ${cand.id.slice(0, 12)} の取得に失敗(スキップ): ${(e.message || "").slice(0, 60)}`); continue; }
    if (!x) continue;
    if (x.title === expected.title && (x.discussion || "") === expected.discussion && (x.body || "") === expected.body && JSON.stringify(x.choices) === JSON.stringify(expected.choices)) matches.push(x.id);
  }
  if (skipped) await warnOnce(c, store, notify, `regskip:${p.id}`, 86400, `⚠️ Prop ${p.id}: 候補 ${skipped} 件を取得できず(サイズ超過など)検証をスキップしました。`);
  if (matches.length === 0) {
    await warnOnce(c, store, notify, `regmismatch:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。`);
    return;
  }
  if (matches.length > 1) {
    await warnOnce(c, store, notify, `regambig:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 内容が完全一致する Snapshot 提案が ${matches.length} 件あり、一意に決められないため自動登録を保留しました。`);
    return;
  }

  // 5) 登録(AlreadyRegistered は手動登録等との競合として静かに退く)
  try {
    const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [matches[0], BigInt(p.id)] });
    await store.kvRaw.put(sentK, JSON.stringify({ tx: hash, at: Date.now() }), { expirationTtl: 86400 * 3 }); // 提案期間以上(第19回監査: 1h では Worker 長時間停止で tx を見失う)
    await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。`, `Snapshot: ${matches[0]}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
  } catch (e) {
    if (revertErrorName(e) === "AlreadyRegistered") {
      // 実際に登録された対応(nounsToSnap)を読み戻し、期待した Snapshot 提案のハッシュと一致するか確認する。
      // 別 ID が割り込んで登録された場合は高優先度で警告して止める(静かに退かない)。
      const expectedHash = keccak256(stringToBytes(matches[0]));
      let got = null;
      try { got = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(p.id)] }); } catch {}
      if (got && got.toLowerCase() === expectedHash.toLowerCase()) { console.log(`[register] prop ${p.id}: 期待どおり登録済み(競合)`); return; }
      await warnOnce(c, store, notify, `regconflict:${p.id}`, 86400, `⚠️ Prop ${p.id}: 対応表が既に登録済みですが、登録されたハッシュ(${got ? String(got).slice(0, 14) : "取得失敗"}…)が期待した Snapshot 提案 ${matches[0].slice(0, 14)}… のハッシュ(${expectedHash.slice(0, 14)}…)と一致しません。誤登録の可能性 — 手動で確認してください。`);
      return;
    }
    await warnOnce(c, store, notify, `regerr:${p.id}`, 86400,
      `⚠️ Prop ${p.id}: 対応表の自動登録の送信に失敗しました(${(e.shortMessage || e.message || "").slice(0, 120)})。registrar の残高・RPC を確認してください。`);
  }
}

codex
対象コミットの差分は確認できました。一方、指定された `docs/audit-19-codex-raw.md` は現行ツリーにも親コミットにも存在せず、監査原文は依頼文に列挙された指摘を基準にします。ここから設定必須化、コントラクトのキー計算、Hub取得失敗時の制御、一意性境界をコード全体で追います。
exec
/bin/bash -lc 'rg -n "snapshotBot|SNAPSHOT_BOT|resolveMappings|autoRegister|regsent2|registerProposal|nounsToSnap|snapToNouns|strategy|snapshot|block|reorg|confirm|cronSec|submitBufferSec" relayer-cf/src relayer-cf/test contracts scripts/sepolia package.json relayer-cf/package.json wrangler.toml relayer-cf/wrangler.toml 2>/dev/null' in /mnt/data/pnouns-voter
 exited 2 in 0ms:
relayer-cf/wrangler.toml:22:SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
relayer-cf/wrangler.toml:27:BLOCKSCOUT = "https://eth-sepolia.blockscout.com"
relayer-cf/wrangler.toml:53:BLOCKSCOUT = "https://eth.blockscout.com"
package.json:18:    "@snapshot-labs/snapshot.js": "^0.17.0"
relayer-cf/test/worker-tick.test.mjs:47:    async getBlockNumber() { calls.push("getBlockNumber"); return BigInt(h.__block); },
relayer-cf/test/worker-tick.test.mjs:80:    __block: 100,
relayer-cf/test/worker-tick.test.mjs:88:    snapToNouns: (a) => (a[0] === SNAP_HASH ? 1n : 0n),
relayer-cf/test/worker-tick.test.mjs:89:    nounsToSnap: (a) => (Number(a[0]) === 1 ? SNAP_HASH : "0x" + "00".repeat(32)),
relayer-cf/test/worker-tick.test.mjs:213:    const { kv, env } = setup(handlers({ __block: 196 }), {}, wallet);
relayer-cf/test/worker-tick.test.mjs:222:    const { kv, env } = setup(handlers({ __block: 196, snapToNouns: () => 0n, nounsToSnap: () => "0x" + "00".repeat(32) }), {}, wallet);
relayer-cf/test/worker-tick.test.mjs:231:  // ケース A: 猶予中(block=100 < eligibleAt=150 < 締切) → 対応付け解決後、票の取得にすら行かない
relayer-cf/test/worker-tick.test.mjs:241:  // ケース B: 解禁済み(eligibleAt=50 <= block=100) → 投函処理に入る(votes クエリが飛ぶ)
relayer-cf/test/worker-tick.test.mjs:349:test("猶予境界: block == eligibleAt では投函が始まる", async () => {
relayer-cf/test/worker-tick.test.mjs:351:  const { env } = setup(submitHandlers({ eligibleAtBlock: () => 100n }), {}, wallet); // block=100
relayer-cf/test/worker-tick.test.mjs:362:  const h = handlers({ __block: 196, tally: () => [[0n, 0n, 0n], [1n, 0n, 0n], false, 0] });
relayer-cf/test/worker-tick.test.mjs:406:// ---- 登録係の Cloudflare 実装(autoRegister) ----
relayer-cf/test/worker-tick.test.mjs:421:  const env = baseEnv(kv, { AUTO_REGISTER: "1", REGISTRAR_PRIVATE_KEY: "0x" + "11".repeat(32), SNAPSHOT_BOT: REGISTRAR_BOT, ...envOver });
relayer-cf/test/worker-tick.test.mjs:426:  snapToNouns: () => 0n,
relayer-cf/test/worker-tick.test.mjs:427:  nounsToSnap: () => "0x" + "00".repeat(32),
relayer-cf/test/worker-tick.test.mjs:440:  assert.equal(regWrites.length, 1, "registerProposal が送られる");
relayer-cf/test/worker-tick.test.mjs:442:  assert.equal(putsOf(kv, "regsent2:1").length, 1, "送信記録(tx+時刻)");
relayer-cf/test/worker-tick.test.mjs:528:  kv.data.set(`${ns}regsent2:1`, JSON.stringify({ tx: "0x" + "cd".repeat(32), at: Date.now() }));
relayer-cf/test/worker-tick.test.mjs:534:// AlreadyRegistered の分岐は autoRegister を直接呼んで検証する
relayer-cf/test/worker-tick.test.mjs:535:// (tick 経由だと nounsToSnap 非ゼロが手前の unresolved 分岐に吸われ、autoRegister に届かないため)
relayer-cf/test/worker-tick.test.mjs:536:async function callAutoRegister(nounsToSnapHash, throwErr = true) {
relayer-cf/test/worker-tick.test.mjs:537:  const { autoRegister } = await import("../src/register.js");
relayer-cf/test/worker-tick.test.mjs:538:  const err = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3a81d6fc", functionName: "registerProposal" });
relayer-cf/test/worker-tick.test.mjs:546:  const pc = fakePC(handlers({ getLogs: (x) => (x.toBlock === x.fromBlock ? [{ eventName: "ProposalCreated", args: { id: 1n, description: DESC } }] : []), nounsToSnap: () => nounsToSnapHash }));
relayer-cf/test/worker-tick.test.mjs:549:  const c = { snapshotSpace: SPACE, snapshotBot: REGISTRAR_BOT, snapshotHub: HUB, metagov: VOTER, nounsDAO: DAO, explorer: "https://x", cronSec: 60, submitBufferSec: 120 };
relayer-cf/test/worker-tick.test.mjs:550:  await autoRegister(c, pc, registrar, store, notify, { id: 1, creationBlock: 50 });
relayer-cf/test/cursor.test.mjs:77:      const r = await fetchRows({ snapshotHub: "https://hub.invalid" }, "snap", offset);
scripts/sepolia/_watch527.js:8:    const [t, acc, blk] = await Promise.all([c.tally(id), c.snapshotVotesAccepted(id), ethers.provider.getBlockNumber()]);
scripts/sepolia/_watch527.js:10:    console.log(`[${new Date().toISOString().slice(11, 19)}] block=${blk} accepted=${acc} tokens=${tokens.map(String)} voters=${voters.map(String)} executed=${executed} result=${result}`);
relayer-cf/src/worker.js:3:import { cfg, clients, recentProposals, metagovInfo, proposalTitle, METAGOV_ABI, storeNs, shouldRushSubmit, snapshotTimelineSafe, allOwners, revertErrorName } from "./chain.js";
relayer-cf/src/worker.js:4:import { resolveMappings, planSubmission, fetchEnvelope, fetchRows, supplementCheckPlan, uniqueVoterCandidates, scanKey, deadKey, failKey, snapshotVoterCount } from "./snap.js";
relayer-cf/src/worker.js:7:import { autoRegister } from "./register.js";
relayer-cf/src/worker.js:57:async function announceNew(c, pc, store, p, block, snapInfo) {
relayer-cf/src/worker.js:60:  if (prev && !(c.snapshotSpace && snapInfo && prev.includes("|") && prev.split("|")[1] !== snapInfo.snapId)) return;
relayer-cf/src/worker.js:62:  if (mg.deadline && block >= mg.deadline) { await store.putAnnounced(p.id, "late"); return; }
relayer-cf/src/worker.js:63:  if (c.snapshotSpace) {
relayer-cf/src/worker.js:65:    const minutes = Math.max(0, Math.round(((mg.deadline || p.endBlock) - block) * 12 / 60));
relayer-cf/src/worker.js:70:      `締切: ${jst} ごろ (block ${mg.deadline})`,
relayer-cf/src/worker.js:71:      `投票: https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}`,
relayer-cf/src/worker.js:80:  const minutes = Math.max(0, Math.round((deadlineBlock - block) * 12 / 60));
relayer-cf/src/worker.js:86:    `締切: ${jst} ごろ (block ${deadlineBlock})`,
relayer-cf/src/worker.js:280:async function submitPending(c, pc, wc, store, proposalId, block, onchainDeadline) {
relayer-cf/src/worker.js:281:  const rush = shouldRushSubmit(c, block, onchainDeadline); // M-14: 受付締切を過ぎたら最小待機なしで即投函
relayer-cf/src/worker.js:331:async function maybeExecute(c, pc, wc, store, p, block, mg) {
relayer-cf/src/worker.js:348:          c.blockscout ? `イベント(VoteCast の reason に集計を記載): ${c.blockscout}/tx/${ex.tx}?tab=logs` : null,
relayer-cf/src/worker.js:362:  if (mg.deadline === 0 || block < mg.deadline) return;
relayer-cf/src/worker.js:447:    const { block, proposals } = await recentProposals(c, pc);
relayer-cf/src/worker.js:453:    if (c.snapshotSpace) {
relayer-cf/src/worker.js:464:        if (c.autoRegister) {
relayer-cf/src/worker.js:475:        if (onchain !== keccak256(stringToBytes(c.snapshotSpace))) { await notifyError(c, "config", new Error(`SNAPSHOT_SPACE "${c.snapshotSpace}" がコントラクトの spaceHash と一致しません`)); return; }
relayer-cf/src/worker.js:483:        const { mappings, unresolved } = await resolveMappings(c, pc, active);
relayer-cf/src/worker.js:488:      catch (e) { await notifyError(c, "snapshot hub", e); }
relayer-cf/src/worker.js:500:        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
relayer-cf/src/worker.js:501:          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
relayer-cf/src/worker.js:506:        if (c.snapshotSpace && !snapInfo && unresolvedIds.has(p.id)) {
relayer-cf/src/worker.js:515:        const linkBad = !!(c.snapshotSpace && snapInfo && snapInfo.linkOk === false);
relayer-cf/src/worker.js:518:          const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/${p.id})を参照していません。`, `対応付けが誤っている可能性があります。Snapshot: ${c.publicUrl ? `https://snapshot.box/#/s:${c.snapshotSpace}/proposal/${snapInfo.snapId}` : snapInfo.snapId}`, c.network === "mainnet" ? "mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。" : "テスト環境のため処理は継続します。"].join("\n"));
relayer-cf/src/worker.js:523:        if (c.snapshotSpace && snapInfo) {
relayer-cf/src/worker.js:524:          timelineBad = !snapshotTimelineSafe(c, block, mg.deadline, snapInfo.snapEnd);
relayer-cf/src/worker.js:533:        if (c.snapshotSpace && snapInfo && mg.eligibleAt && mg.deadline) {
relayer-cf/src/worker.js:534:          const drainBlocks = Math.ceil((c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/worker.js:537:            const sent = await notify(c, [`⚠️ Prop ${p.id}: 対応表の登録が遅すぎます。猶予明け(block ${mg.eligibleAt})が締切(block ${mg.deadline})に間に合わず、票を投函できません。`, c.network === "mainnet" ? "mainnet は安全側に停止しました(このままでは票ゼロで確定してしまうため)。取消して手動対応を検討してください。" : "テスト環境のため処理は継続します。"].join("\n"));
relayer-cf/src/worker.js:545:          await announceNew(c, pc, store, p, block, snapInfo);
relayer-cf/src/worker.js:551:        if (block < mg.deadline) {
relayer-cf/src/worker.js:552:          if (c.snapshotSpace) {
relayer-cf/src/worker.js:556:            if (snapInfo && !(mg.eligibleAt && block < mg.eligibleAt)) {
relayer-cf/src/worker.js:557:              const rush = shouldRushSubmit(c, block, mg.deadline);
relayer-cf/src/worker.js:561:          else await submitPending(c, pc, wc, store, String(p.id), block, mg.deadline);
relayer-cf/src/worker.js:562:        } else if (!c.snapshotSpace || snapInfo) {
relayer-cf/src/worker.js:569:          if (c.snapshotSpace && snapInfo && !mg.executed) {
relayer-cf/src/worker.js:572:              const hubVoters = await snapshotVoterCount(c, snapInfo.snapId);
relayer-cf/src/worker.js:585:          await maybeExecute(c, pc, wc, store, p, block, mg);
relayer-cf/test/accept-deadline.test.mjs:4:import { acceptMarginBlocks, acceptDeadline, shouldRushSubmit, snapshotTimelineSafe, submitCapacity } from "../src/chain.js";
relayer-cf/test/accept-deadline.test.mjs:6:const mainnet = { minPendingAgeSec: 120, cronSec: 120, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
relayer-cf/test/accept-deadline.test.mjs:7:const sepolia = { minPendingAgeSec: 20, cronSec: 60, submitBufferSec: 120, rushBatches: 2, maxBatch: 10 };
relayer-cf/test/accept-deadline.test.mjs:13:test("受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード", () => {
relayer-cf/test/accept-deadline.test.mjs:21:    assert.ok(marginSec >= c.minPendingAgeSec + c.cronSec, `${marginSec}s >= ${c.minPendingAgeSec + c.cronSec}s`);
relayer-cf/test/accept-deadline.test.mjs:48:  const now = 2_000_000_000, block = 1000, deadline = 1100;
relayer-cf/test/accept-deadline.test.mjs:50:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 241, now), true);
relayer-cf/test/accept-deadline.test.mjs:51:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 240, now), true, "境界は許可");
relayer-cf/test/accept-deadline.test.mjs:52:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, deadlineEta - 239, now), false);
relayer-cf/test/accept-deadline.test.mjs:53:  assert.equal(snapshotTimelineSafe(mainnet, block, deadline, 0, now), false, "終了時刻不明は fail-closed");
scripts/sepolia/03-deploy-voter.js:14:  dep.voterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
scripts/sepolia/05-e2e.js:10:    process.stdout.write(`\r  ${label}: block ${b}/${target}   `);
scripts/sepolia/14-snap-setup-only.js:1:// Worker 主導 E2E の準備だけ行う: ①Snapshot 提案 ②voter A/B/C 投票 ③Sepolia Nouns 提案 ④registerProposal
scripts/sepolia/14-snap-setup-only.js:4:const snapshot = require("@snapshot-labs/snapshot.js");
scripts/sepolia/14-snap-setup-only.js:11:  const client = new snapshot.Client712("https://seq.snapshot.org");
scripts/sepolia/14-snap-setup-only.js:20:    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
scripts/sepolia/14-snap-setup-only.js:22:  console.log("snapshot proposal:", receipt.id);
scripts/sepolia/14-snap-setup-only.js:29:  if (process.env.WAIT_UI) { console.log(`UI 投票の待機 ${process.env.WAIT_UI}s: https://snapshot.box/#/s:${SPACE}/proposal/${receipt.id}`); await sleep(Number(process.env.WAIT_UI) * 1000); }
scripts/sepolia/14-snap-setup-only.js:31:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# Snap Voter worker E2E\nsnapshot: ${receipt.id}`)).wait();
scripts/sepolia/14-snap-setup-only.js:34:  await (await snapVoter.registerProposal(receipt.id, nounsId)).wait();
scripts/sepolia/14-snap-setup-only.js:36:  console.log(`nouns proposal #${nounsId} registered → あとは Worker が処理 (票の受付解禁 block ${eligible}, 現在 ${await ethers.provider.getBlockNumber()})`);
scripts/sepolia/12-deploy-snapvoter.js:16:  dep.snapVoterDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
relayer-cf/src/snap.js:36:  const j = await fetchLimited(`${c.snapshotHub}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
relayer-cf/src/snap.js:43:export async function snapshotVoterCount(c, snapId) {
relayer-cf/src/snap.js:77:export async function resolveMappings(c, pc, activeNounsIds = []) {
relayer-cf/src/snap.js:79:  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
relayer-cf/src/snap.js:80:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
relayer-cf/src/snap.js:86:      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
relayer-cf/src/snap.js:91:  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
relayer-cf/src/snap.js:95:    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
relayer-cf/src/snap.js:100:      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
relayer-cf/src/snap.js:128:  let advance = cursor; let blocked = false;
relayer-cf/src/snap.js:142:      if (!blocked) advance = Math.max(advance, created); // 未解決票より前でのみ前進
relayer-cf/src/snap.js:145:    blocked = true; // これ以降は cursor を進めない
relayer-cf/src/snap.js:148:  return { send, skipped, advance, blocked };
scripts/sepolia/13-snap-e2e.js:2:// 手順: ①Snapshot 提案作成(bot) ②voter A/B/C が snapshot.js で投票 ③Sepolia Nouns 提案作成 ④registerProposal
scripts/sepolia/13-snap-e2e.js:5:const snapshot = require("@snapshot-labs/snapshot.js");
scripts/sepolia/13-snap-e2e.js:8:const HUB = "https://hub.snapshot.org";
scripts/sepolia/13-snap-e2e.js:9:const SEQ = "https://seq.snapshot.org";
scripts/sepolia/13-snap-e2e.js:11:const IPFS = (cid) => `https://snapshot.4everland.link/ipfs/${cid}`;
scripts/sepolia/13-snap-e2e.js:13:// snapshot.js は ethers v5 の _signTypedData を呼ぶため、v6 Wallet にアダプタを噛ませる
scripts/sepolia/13-snap-e2e.js:38:  const client = new snapshot.Client712(SEQ);
scripts/sepolia/13-snap-e2e.js:40:  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
scripts/sepolia/13-snap-e2e.js:51:    start: now, end: now + 300, snapshot: snapBlock,
scripts/sepolia/13-snap-e2e.js:55:  console.log("   snapshot proposal:", snapId);
scripts/sepolia/13-snap-e2e.js:65:  if (process.env.WAIT_UI) { console.log(`   ${process.env.WAIT_UI} 秒待機中 — UI から投票できます: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`); await sleep(Number(process.env.WAIT_UI) * 1000); }
scripts/sepolia/13-snap-e2e.js:69:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# pNouns Snap Voter E2E\nsnapshot: ${snapId}`)).wait();
scripts/sepolia/13-snap-e2e.js:75:  await (await snapVoter.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/13-snap-e2e.js:111:  console.log(`   snapshot: https://snapshot.box/#/s:${SPACE}/proposal/${snapId}`);
contracts/PNounsVoter.sol:266:            uint256 basefee = _min(block.basefee, MAX_REFUND_BASE_FEE);
contracts/PNounsVoter.sol:298:        if (block.number >= deadline) revert VotingClosed();
contracts/PNounsVoter.sol:334:        if (block.number < deadline) revert VotingNotClosed();
scripts/sepolia/15-reuse-snap.js:10:  const r = await (await fetch("https://hub.snapshot.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${snapId}") { title votes space { id } } }` }) })).json();
scripts/sepolia/15-reuse-snap.js:15:  await (await dao.propose([deployer.address], [0], [""], ["0x"], `# reuse test\nsnapshot: ${snapId}`)).wait();
scripts/sepolia/15-reuse-snap.js:18:  await (await c.registerProposal(snapId, nounsId)).wait();
scripts/sepolia/16-cf-registrar-e2e.js:7:const snapshot = require("@snapshot-labs/snapshot.js");
scripts/sepolia/16-cf-registrar-e2e.js:12:const SEQ = "https://seq.snapshot.org";
scripts/sepolia/16-cf-registrar-e2e.js:35:  const client = new snapshot.Client712(SEQ);
scripts/sepolia/16-cf-registrar-e2e.js:39:    choices: p.choices, start: now, end: now + 172800, snapshot: await mainnetProvider.getBlockNumber(),
scripts/sepolia/16-cf-registrar-e2e.js:55:    const [mapped, blk] = await Promise.all([c.snapToNouns(h), ethers.provider.getBlockNumber()]);
scripts/sepolia/16-cf-registrar-e2e.js:56:    let line = `[${new Date().toISOString().slice(11, 19)}] block=${blk}`;
scripts/sepolia/16-cf-registrar-e2e.js:59:      const [t, acc] = await Promise.all([c.tally(nounsId), c.snapshotVotesAccepted(nounsId)]);
scripts/sepolia/10-register-ens.js:2:// 注意(2026-08-20): ENS が Sepolia でコントラクト移行中(block 11522776 で NameWrapper が
relayer-cf/src/register.js:1:// 登録係の Cloudflare 実装(置き場所分離の選択肢。AUTO_REGISTER=1 + REGISTRAR_PRIVATE_KEY + SNAPSHOT_BOT で有効)。
relayer-cf/src/register.js:62:export async function autoRegister(c, pc, registrar, store, notify, p) {
relayer-cf/src/register.js:64:  const sentK = `${store.prefix}regsent2:${p.id}`;
relayer-cf/src/register.js:78:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
relayer-cf/src/register.js:89:  const minRemainSec = c.cronSec + c.submitBufferSec + 300; // 猶予明け後に投函・採掘できる最小残り時間
relayer-cf/src/register.js:128:    const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [matches[0], BigInt(p.id)] });
relayer-cf/src/register.js:133:      // 実際に登録された対応(nounsToSnap)を読み戻し、期待した Snapshot 提案のハッシュと一致するか確認する。
relayer-cf/src/register.js:137:      try { got = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(p.id)] }); } catch {}
contracts/PNounsSnapVoter.sol:25: *  検証する署名 = Snapshot(snapshot-v2)の EIP-712 Vote メッセージ:
contracts/PNounsSnapVoter.sol:26: *    domain: {name:"snapshot", version:"0.1.4"}(chainId / verifyingContract なし)
contracts/PNounsSnapVoter.sol:49:        abi.encode(keccak256("EIP712Domain(string name,string version)"), keccak256(bytes("snapshot")), keccak256(bytes("0.1.4")))
contracts/PNounsSnapVoter.sol:95:    mapping(bytes32 => uint256) public snapToNouns;
contracts/PNounsSnapVoter.sol:97:    mapping(uint256 => bytes32) public nounsToSnap;
contracts/PNounsSnapVoter.sol:99:    mapping(uint256 => uint32) public snapshotVotesAccepted;
contracts/PNounsSnapVoter.sol:101:    mapping(uint256 => uint32) public snapshotVotesCounted;
contracts/PNounsSnapVoter.sol:115:    event ProposalRegistered(uint256 indexed nounsProposalId, string snapshotProposal);
contracts/PNounsSnapVoter.sol:117:    event RegistrationDelaySet(uint256 blocks_);
contracts/PNounsSnapVoter.sol:179:    function registerProposal(string calldata snapshotProposal, uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:181:        bytes32 h = keccak256(bytes(snapshotProposal));
contracts/PNounsSnapVoter.sol:182:        if (snapToNouns[h] != 0 || nounsToSnap[nounsProposalId] != bytes32(0)) revert AlreadyRegistered();
contracts/PNounsSnapVoter.sol:184:        snapToNouns[h] = nounsProposalId;
contracts/PNounsSnapVoter.sol:185:        nounsToSnap[nounsProposalId] = h;
contracts/PNounsSnapVoter.sol:186:        registeredAtBlock[nounsProposalId] = block.number;
contracts/PNounsSnapVoter.sol:189:        eligibleAtBlock[nounsProposalId] = block.number + registrationDelayBlocks;
contracts/PNounsSnapVoter.sol:190:        emit ProposalRegistered(nounsProposalId, snapshotProposal);
contracts/PNounsSnapVoter.sol:194:    function unregisterProposal(uint256 nounsProposalId) external {
contracts/PNounsSnapVoter.sol:196:        bytes32 h = nounsToSnap[nounsProposalId];
contracts/PNounsSnapVoter.sol:198:        if (snapshotVotesAccepted[nounsProposalId] != 0) revert VotesAlreadyCounted(); // 受理済みの Snapshot 票が 1 件でもあれば取消不可(直接投票では妨害できない)
contracts/PNounsSnapVoter.sol:199:        delete snapToNouns[h];
contracts/PNounsSnapVoter.sol:200:        delete nounsToSnap[nounsProposalId];
contracts/PNounsSnapVoter.sol:256:        uint256 nounsId = snapToNouns[firstProp];
contracts/PNounsSnapVoter.sol:258:        if (block.number < eligibleAtBlock[nounsId]) revert RegistrationTooRecent(); // 誤登録の取消猶予(登録時に固定)
contracts/PNounsSnapVoter.sol:275:        snapshotVotesCounted[nounsId] += snapCounted;
contracts/PNounsSnapVoter.sol:276:        snapshotVotesAccepted[nounsId] += uint32(votes.length); // 新規 token 数に関わらず「受理した」ことを記録
contracts/PNounsSnapVoter.sol:280:    /// @notice 退路: 本人がオンチェーンで直接投票(Snapshot を介さない)。timestamp は block.timestamp。
contracts/PNounsSnapVoter.sol:285:        if (nounsToSnap[nounsProposalId] != bytes32(0) && block.number < eligibleAtBlock[nounsProposalId]) revert RegistrationTooRecent();
contracts/PNounsSnapVoter.sol:286:        _castVote(msg.sender, nounsProposalId, support, tokenIds, uint64(block.timestamp), keccak256(abi.encode("direct", msg.sender, nounsProposalId, support, block.timestamp)));
contracts/PNounsSnapVoter.sol:302:        if (block.number >= deadline) revert VotingClosed();
contracts/PNounsSnapVoter.sol:366:        if (block.number < deadline) revert VotingNotClosed();
contracts/PNounsSnapVoter.sol:434:            uint256 basefee = _min(block.basefee, MAX_REFUND_BASE_FEE);
scripts/sepolia/01-deploy-pnouns.js:16:    dep.pnounsDeployBlock = (await c.deploymentTransaction().wait()).blockNumber;
relayer-cf/src/abi.js:82:    "name": "snapshotProposal",
relayer-cf/src/abi.js:392:  "name": "nounsToSnap",
relayer-cf/src/abi.js:456:   { "internalType": "string", "name": "snapshotProposal", "type": "string" },
relayer-cf/src/abi.js:459:  "name": "registerProposal",
relayer-cf/src/abi.js:506:  "name": "snapToNouns",
relayer-cf/src/abi.js:525:  "name": "snapshotVotesAccepted",
relayer-cf/src/abi.js:544:  "name": "snapshotVotesCounted",
relayer-cf/src/chain.js:32:  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
relayer-cf/src/chain.js:43:    blockscout: env.BLOCKSCOUT || null,
relayer-cf/src/chain.js:51:    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
relayer-cf/src/chain.js:52:    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
relayer-cf/src/chain.js:53:    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
relayer-cf/src/chain.js:54:    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
relayer-cf/src/chain.js:57:    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
relayer-cf/src/chain.js:61:    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
relayer-cf/src/chain.js:62:    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
relayer-cf/src/chain.js:68:  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
relayer-cf/src/chain.js:74:export function shouldRushSubmit(c, block, onchainDeadline) {
relayer-cf/src/chain.js:75:  return Number(block) >= acceptDeadline(c, onchainDeadline);
relayer-cf/src/chain.js:79:export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
relayer-cf/src/chain.js:81:  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
relayer-cf/src/chain.js:82:  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
relayer-cf/src/chain.js:85://   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
relayer-cf/src/chain.js:86:export function submitCapacity(c, block, onchainDeadline) {
relayer-cf/src/chain.js:87:  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
relayer-cf/src/chain.js:88:  const ticks = Math.floor(secsLeft / c.cronSec);
relayer-cf/src/chain.js:133:  const [count, block] = await Promise.all([
relayer-cf/src/chain.js:154:  return { block: Number(block), proposals: out };
relayer-cf/src/index.js:21:  const snap = !!c.snapshotSpace;
relayer-cf/src/index.js:25:  return ctx.json({ mode: snap ? "snapshot" : "direct", network: c.network, chainId: c.chainId, metagov: c.metagov, pnouns: c.pnouns, nounsDAO: c.nounsDAO, explorer: c.explorer, blockscout: c.blockscout, snapshotSpace: c.snapshotSpace, relayer, domain: snap ? null : domain(c), types: snap ? null : VOTE_TYPES });
relayer-cf/src/index.js:38:  const { block, proposals } = await recentProposals(c, pc);
relayer-cf/src/index.js:41:  const snapmap = c.snapshotSpace ? ((await ctx.env.STATE.get(`${store.prefix}snapmap`, "json")) || {}) : {};
relayer-cf/src/index.js:46:    const snapshotProposalId = snapByNouns[p.id] || null;
relayer-cf/src/index.js:49:    return { ...p, title, snapshotProposalId, metagov: { ...mg, acceptDeadline: c.snapshotSpace ? mg.deadline : acceptUntil }, votable: votable && block < (c.snapshotSpace ? mg.deadline : acceptUntil), pendingSignatures: votes.filter((v) => !v.tx && !v.dropped).length, submittedVoters: votes.filter((v) => v.tx).length, executed };
relayer-cf/src/index.js:51:  const res = ctx.json({ block, proposals: list });
relayer-cf/src/index.js:101:  if (c.snapshotSpace) return ctx.json({ error: `voting happens on Snapshot: https://snapshot.box/#/s:${c.snapshotSpace}`, code: "snapshot_mode" }, 410);
relayer-cf/src/index.js:132:  const block = Number(await pc.getBlockNumber());
relayer-cf/src/index.js:136:  if (block >= deadline) return ctx.json({ error: "voting closed" }, 400);
relayer-cf/src/index.js:137:  if (block >= acceptDeadline(c, deadline)) return ctx.json({ error: "signature acceptance closed (too close to the on-chain deadline); submit on-chain yourself via castVote or the manual submit button", code: "accept_closed", acceptDeadline: acceptDeadline(c, deadline), deadline }, 400); // M-14
relayer-cf/src/index.js:141:  const capacity = submitCapacity(c, block, deadline);
relayer-cf/src/index.js:155:  if (c.snapshotSpace) return ctx.json({ error: "snapshot mode: votes are public on the Snapshot hub", code: "snapshot_mode" }, 410);
contracts/vendor/pnouns/assetprovider.sol/IAssetProvider.sol:18: * 3. Data visualizer, which generates assets based on various data on the blockchain.
contracts/vendor/pnouns/erc721a/contracts/ERC721A.sol:391:            // `owner | (block.timestamp << _BITPOS_START_TIMESTAMP) | flags`.
contracts/vendor/pnouns/contract/contracts/pNounsContractFilter.sol:102:        //     block.timestamp > unixtime_20230101,
contracts/vendor/pnouns/contract/contracts/pNounsContractFilter.sol:128:        //     block.timestamp > unixtime_20230101,
contracts/vendor/pnouns/@openzeppelin/contracts/access/IAccessControlEnumerable.sol:20:     * you perform all queries on the same block. See the following
contracts/vendor/pnouns/@openzeppelin/contracts/access/AccessControlEnumerable.sol:33:     * you perform all queries on the same block. See the following
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:151:     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:217:     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:291:     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
contracts/vendor/pnouns/@openzeppelin/contracts/utils/structs/EnumerableSet.sol:365:     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
contracts/vendor/pnouns/@openzeppelin/contracts/token/ERC721/IERC721.sol:84:     * WARNING: Note that the caller is responsible to confirm that the recipient is capable of receiving ERC721

exec
/bin/bash -lc 'npm test' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 968ms:
✔ test/accept-deadline.test.mjs (866.845322ms)
✔ test/cursor.test.mjs (897.255152ms)
✔ test/format-equivalence.test.mjs (876.061709ms)
✔ test/link-check.test.mjs (836.20472ms)
✔ test/worker-tick.test.mjs (874.163062ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 909.031139

codex
`relayer-cf` の `npm test` は終了コード 0 で成功しました。ただし表示は「5 test files / pass 5」で、コミット記載の「61 pass」という個別ケース数はこの Node のデフォルト出力からは確認できません。後ほど個別件数もテスト定義から数え、未カバー項目を切り分けます。
exec
/bin/bash -lc "sed -n '1,120p' relayer-cf/package.json; sed -n '1,120p' relayer-cf/src/chain.js; sed -n '430,610p' relayer-cf/src/worker.js; sed -n '160,215p' contracts/PNounsSnapVoter.sol; sed -n '1,180p' scripts/sepolia/16-cf-registrar-e2e.js; rg -n \""'^test'"\\(\" relayer-cf/test | wc -l; rg -n \""'^test'"\\(\" relayer-cf/test" in /mnt/data/pnouns-voter
 succeeded in 0ms:
{
  "name": "pnouns-metagov-relayer-cf",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
// viem ベースのチェーンアクセス。env(wrangler vars/secrets)から設定を読む。
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, verifyTypedData, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { METAGOV_ABI } from "./abi.js";

export const DAO_ABI = parseAbi([
  "function proposalCount() view returns (uint256)",
  "function state(uint256) view returns (uint8)",
  "function getReceipt(uint256 proposalId,address voter) view returns ((bool hasVoted,uint8 support,uint96 votes))",
  "function proposals(uint256) view returns (uint256 id,address proposer,uint256 proposalThreshold,uint256 quorumVotes,uint256 eta,uint256 startBlock,uint256 endBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,bool canceled,bool vetoed,bool executed,uint256 totalSupply,uint256 creationBlock)",
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event ProposalCreatedWithRequirements(uint256 id, address proposer, address[] signers, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, uint256 updatePeriodEndBlock, uint256 proposalThreshold, uint256 quorumVotes, string description)",
  "event ProposalUpdated(uint256 indexed id, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string updateMessage)",
  "event ProposalDescriptionUpdated(uint256 indexed id, address indexed proposer, string description, string updateMessage)",
]);
export const NOUNS_ABI = parseAbi(["function getCurrentVotes(address) view returns (uint96)"]);
export const PNOUNS_ABI = parseAbi(["function ownerOf(uint256) view returns (address)", "function totalSupply() view returns (uint256)"]);
export const STATE_NAMES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed", "ObjectionPeriod", "Updatable"];
export const VOTE_TYPES = { Vote: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "tokenIds", type: "uint256[]" }] };

export function cfg(env) {
  if (env.NETWORK !== "mainnet" && env.NETWORK !== "sepolia") throw new Error(`NETWORK must be "mainnet" or "sepolia" (got ${JSON.stringify(env.NETWORK)})`); // M-09: fail-closed
  const chain = env.NETWORK === "mainnet" ? mainnet : sepolia;
  if (env.NETWORK === "mainnet") {
    if (!env.SNAPSHOT_SPACE) throw new Error("SNAPSHOT_SPACE is required on mainnet (B3 mode)"); // H03: fail-closed
    if (env.ONLY_PROPOSER) throw new Error("ONLY_PROPOSER must not be set on mainnet");
    if (!env.RPC_URL) throw new Error("RPC_URL secret is required");
    for (const k of ["VOTER", "PNOUNS", "NOUNS_DAO", "NOUNS_TOKEN"]) if (!env[k]) throw new Error(`${k} is required`);
    if (getAddress(env.PNOUNS) !== "0x4bE962499cE295b1ed180F923bf9c73b6357DE80" || getAddress(env.NOUNS_DAO) !== "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" || getAddress(env.NOUNS_TOKEN) !== "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03") throw new Error("mainnet addresses mismatch");
  }
  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
  return {
    network: env.NETWORK || "sepolia",
    chain,
    chainId: chain.id,
    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
    metagov: getAddress(env.VOTER),
    pnouns: getAddress(env.PNOUNS),
    nounsDAO: getAddress(env.NOUNS_DAO),
    nounsToken: getAddress(env.NOUNS_TOKEN),
    explorer: env.EXPLORER,
    blockscout: env.BLOCKSCOUT || null,
    publicUrl: env.PUBLIC_URL || "",
    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
    scanProposals: Number(env.SCAN_PROPOSALS || 30),
    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
    announce: env.ANNOUNCE !== "0",
    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
    relayerKey: env.RELAYER_PRIVATE_KEY || null,
    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
  };
}
// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
export function acceptMarginBlocks(c) {
  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
}
export function acceptDeadline(c, onchainDeadline) {
  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
}
// ワーカー側: 受付締切を過ぎたら最小待機を無視して即時投函(境界の票を取り残さない)
export function shouldRushSubmit(c, block, onchainDeadline) {
  return Number(block) >= acceptDeadline(c, onchainDeadline);
}
// B3-M03R: Snapshot の終了後にも最低 1 cron + submit buffer の排出時間が残ること。
// snapEnd が取得できない場合も mainnet では安全とみなさない。
export function snapshotTimelineSafe(c, block, onchainDeadline, snapEnd, nowSec = Date.now() / 1000) {
  if (!Number.isFinite(Number(snapEnd)) || Number(snapEnd) <= 0) return false;
  const deadlineEta = Number(nowSec) + (Number(onchainDeadline) - Number(block)) * 12;
  return Number(snapEnd) <= deadlineEta - c.cronSec - c.submitBufferSec;
}
// M-14R: 受付容量 = これから締切までに確実に回せる投函数。pending がこれ以上なら API は受付を止め、手動投函へ誘導する
//   remainingTicks = floor(((onchainDeadline − block)×12 − 余裕) / cron 間隔)、1 tick あたり rushBatches × maxBatch 票
export function submitCapacity(c, block, onchainDeadline) {
  const secsLeft = (Number(onchainDeadline) - Number(block)) * 12 - c.submitBufferSec;
  const ticks = Math.floor(secsLeft / c.cronSec);
  return Math.max(0, ticks) * c.rushBatches * c.maxBatch;
}
export const storeNs = (c) => `${c.chainId}:${c.metagov.toLowerCase()}`;
export function clients(c) {
  const publicClient = createPublicClient({ chain: c.chain, transport: http(c.rpcUrl, { batch: true }) });
  const account = c.relayerKey ? privateKeyToAccount(c.relayerKey) : null;
  const walletClient = account ? createWalletClient({ account, chain: c.chain, transport: http(c.rpcUrl) }) : null;
  const registrarAccount = c.registrarKey ? privateKeyToAccount(c.registrarKey) : null;
  const registrarClient = registrarAccount ? createWalletClient({ account: registrarAccount, chain: c.chain, transport: http(c.rpcUrl) }) : null;
  return { publicClient, walletClient, account, registrarClient };
}
export const domain = (c) => ({ name: "pNouns Voter", version: "1", chainId: c.chainId, verifyingContract: c.metagov });

// viem の ContractFunctionRevertedError からカスタムエラー名を取り出す(デコードできなければ null)
export function revertErrorName(e) {
  let x = e;
  for (let i = 0; i < 6 && x; i++) { if (x.data?.errorName) return x.data.errorName; x = x.cause; }
  return null;
}

// pNouns 全 tokenId の所有者(multicall)。メモリに 60 秒キャッシュ
let ownersCache = { at: 0, owners: [] };
export async function allOwners(c, pc) {
  if (ownersCache.owners.length && Date.now() - ownersCache.at < 60000) return ownersCache.owners;
  const total = Number(await pc.readContract({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "totalSupply" }));
  const owners = [];
  const CH = 500;
  for (let start = 1; start <= total; start += CH) {
    const ids = [];
    for (let id = start; id < start + CH && id <= total; id++) ids.push(id);
    const res = await pc.multicall({ contracts: ids.map((id) => ({ address: c.pnouns, abi: PNOUNS_ABI, functionName: "ownerOf", args: [BigInt(id)] })), allowFailure: true });
    res.forEach((r, i) => { owners[ids[i]] = r.status === "success" ? r.result.toLowerCase() : null; });
// tick() は viem クライアント・KV・Discord に密結合しているため、状態遷移テストでは
// clients() だけ差し替え、KV は env.STATE に偽物を渡し、fetch はテスト側で mock する。
let _clients = clients;
export function __setClientsForTests(f) { _clients = f || clients; }
export function __resetWorkerStateForTests(o = {}) {
  lastErrNotify = o.errNotifiedAt ?? 0;
  lastBalanceCheck = o.balanceCheckedAt ?? 0;
  spaceCheckedAt = o.spaceCheckedAt ?? 0;
}
const SPACE_RECHECK_MS = 30 * 60 * 1000; // owner が事後に delay を下げた場合を検知するため定期再確認
export async function tick(env) {
  const c = cfg(env);
  const { publicClient: pc, walletClient: wc, registrarClient: rc } = _clients(c);
  const store = makeStore(env.STATE, storeNs(c));
  try {
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
        // 第18回監査: 自動登録が有効なら、設定された鍵がオンチェーンの registrar と一致することを確認(fail-closed)
        if (c.autoRegister) {
          const rcAddr = rc?.account?.address;
          if (!rcAddr || String(rcAddr).toLowerCase() !== String(registrarAddr).toLowerCase()) { await notifyError(c, "config", new Error(`REGISTRAR_PRIVATE_KEY のアドレス(${rcAddr}) がオンチェーンの registrar(${registrarAddr}) と一致しません`)); return; }
        }
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
        // 登録係の Cloudflare 実装: 未登録の提案について、内容一致を検証したうえで対応表を自動登録
        if (c.snapshotSpace && !snapInfo && c.autoRegister && rc && !unresolvedIds.has(p.id)) {
          try { await autoRegister(c, pc, rc, store, notify, p); } catch (e) { console.warn(`[register] prop ${p.id}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
        }
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
                if (sent) await store.setFlag(`backlogwarn:${p.id}`, 86400 * 7);
              }
              if (c.network === "mainnet") continue;
            }
          }
          await maybeExecute(c, pc, wc, store, p, block, mg);
        }
      } catch (e) {
        await notifyError(c, `worker prop ${p.id}`, e);
      }
    }
  } catch (e) {
    await notifyError(c, "worker tick", e);
  }
}
export { notify };
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
// 登録係の Cloudflare 実装のライブ E2E:
//  ① Sepolia Nouns DAO に提案を作成(この本文が Worker の検証基準)
//  ② bot が新フォーマットで Snapshot に提案を作成(登録はしない)
//  ③ テスト投票者が即座に Snapshot で投票
//  ④ Worker が自動登録(内容一致検証) → 猶予明けに投函 → 締切後に execute、を監視
const { ethers } = require("hardhat");
const snapshot = require("@snapshot-labs/snapshot.js");
const { SEPOLIA, DAO_ABI, loadDeployments, sleep } = require("./lib");
const { buildProposal } = require("../lib/proposal-format.mjs");

const SPACE = "earl-grey.eth";
const SEQ = "https://seq.snapshot.org";
const MAINNET_SUBGRAPH = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn";
const adapt = (w) => ({ _signTypedData: (d, t, m) => w.signTypedData(d, t, m), getAddress: async () => w.address });

async function main() {
  const [deployer, , voterA, voterB, voterC] = await ethers.getSigners();
  const dep = loadDeployments();

  // 本文: 実物の Nouns 提案(989)の Markdown を使用
  const r = await (await fetch(MAINNET_SUBGRAPH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"989") { description } }` }) })).json();
  const D = r.data.proposal.description;
  console.log(`本文: mainnet Prop 989 (${D.length.toLocaleString()} 文字)`);

  // ① Sepolia Nouns 提案(オンチェーン本文 = D)
  const dao = new ethers.Contract(SEPOLIA.NOUNS_DAO, DAO_ABI, deployer);
  await (await dao.propose([deployer.address], [0], [""], ["0x"], D)).wait();
  const nounsId = Number(await dao.proposalCount());
  console.log(`① Nouns 提案 #${nounsId} を作成`);

  // ② 新フォーマットで Snapshot 提案(登録しない — Worker に任せる)
  const p = buildProposal({ nounsId, description: D });
  const bot = ethers.HDNodeWallet.fromPhrase(process.env.SEPOLIA_MNEMONIC, undefined, "m/44'/60'/0'/0/0");
  const now = Math.floor(Date.now() / 1000);
  const client = new snapshot.Client712(SEQ);
  const mainnetProvider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL, undefined, { staticNetwork: true });
  const receipt = await client.proposal(adapt(bot), bot.address, {
    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
    choices: p.choices, start: now, end: now + 172800, snapshot: await mainnetProvider.getBlockNumber(),
    plugins: "{}", app: "pnouns-voter",
  });
  console.log(`② Snapshot 提案: ${receipt.id} ${p.truncated ? "(切り詰めあり)" : "(全文)"}`);

  // ③ 即座に投票(A=賛成2枚, B=反対1枚, C=棄権1枚 想定)
  for (const [w, choice] of [[voterA, 1], [voterB, 2], [voterC, 3]]) {
    try { await client.vote(adapt(w), w.address, { space: SPACE, proposal: receipt.id, type: "single-choice", choice, reason: "", app: "pnouns-voter" }); console.log(`③ ${w.address.slice(0, 10)} → choice ${choice}`); }
    catch (e) { console.log(`③ ${w.address.slice(0, 10)} 投票失敗: ${e.error_description || e.message}`); }
  }

  // ④ 監視: 自動登録 → 受理 → execute
  const c = await ethers.getContractAt("PNounsSnapVoter", dep.snapVoter);
  const h = ethers.keccak256(ethers.toUtf8Bytes(receipt.id));
  let registered = false;
  for (let i = 0; i < 40; i++) {
    const [mapped, blk] = await Promise.all([c.snapToNouns(h), ethers.provider.getBlockNumber()]);
    let line = `[${new Date().toISOString().slice(11, 19)}] block=${blk}`;
    if (!registered && Number(mapped) === nounsId) { registered = true; line += ` ✅ 自動登録を確認 (eligibleAt=${await c.eligibleAtBlock(nounsId)})`; }
    if (registered) {
      const [t, acc] = await Promise.all([c.tally(nounsId), c.snapshotVotesAccepted(nounsId)]);
      line += ` accepted=${acc} tokens=${t[0].map(String)} voters=${t[1].map(String)} executed=${t[2]} result=${t[3]}`;
      console.log(line);
      if (t[2]) { console.log("✅ E2E 完了(execute 済み)"); return; }
    } else console.log(line + " (登録待ち)");
    await sleep(20000);
  }
  console.log("⏱ タイムアウト — Worker のログ/Discord を確認してください");
}
main().catch((e) => { console.error(e.error_description || e.shortMessage || e.message); process.exit(1); });
61
relayer-cf/test/worker-tick.test.mjs:111:test("ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし)", async () => {
relayer-cf/test/worker-tick.test.mjs:121:test("ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止", async () => {
relayer-cf/test/worker-tick.test.mjs:136:test("linkOk=false: 警告し、テストネットでも告知はしない", async () => {
relayer-cf/test/worker-tick.test.mjs:144:test("告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送)", async () => {
relayer-cf/test/worker-tick.test.mjs:158:test("mainnet: 猶予がコード下限 10 未満なら何もせず停止(ハブにも触れない)", async () => {
relayer-cf/test/worker-tick.test.mjs:169:test("mainnet: 猶予が運用値 10 ちょうどなら処理に進む", async () => {
relayer-cf/test/worker-tick.test.mjs:179:test("mainnet: owner/registrar/relayer が同一なら停止", async () => {
relayer-cf/test/worker-tick.test.mjs:189:test("MIN_REGISTRATION_DELAY が不正値なら起動時に throw", async () => {
relayer-cf/test/worker-tick.test.mjs:198:test("空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない", async () => {
relayer-cf/test/worker-tick.test.mjs:209:test("締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない", async () => {
relayer-cf/test/worker-tick.test.mjs:229:test("第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない", async () => {
relayer-cf/test/worker-tick.test.mjs:250:test("ハブが GraphQL errors を返した場合も fail-closed", async () => {
relayer-cf/test/worker-tick.test.mjs:266:test("確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される", async () => {
relayer-cf/test/worker-tick.test.mjs:287:test("第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する", async () => {
relayer-cf/test/worker-tick.test.mjs:313:test("実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る", async () => {
relayer-cf/test/worker-tick.test.mjs:324:test("実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない", async () => {
relayer-cf/test/worker-tick.test.mjs:336:test("実投函: 復号可能な恒久 revert(StaleVote)は drop に数える", async () => {
relayer-cf/test/worker-tick.test.mjs:349:test("猶予境界: block == eligibleAt では投函が始まる", async () => {
relayer-cf/test/worker-tick.test.mjs:357:test("第15回監査: 締切時に未反映の票が残っていれば mainnet は execute しない", async () => {
relayer-cf/test/worker-tick.test.mjs:388:test("第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない", async () => {
relayer-cf/test/worker-tick.test.mjs:436:test("自動登録: 検証をすべて通過した提案だけを登録する", async () => {
relayer-cf/test/worker-tick.test.mjs:446:test("自動登録: 本文がオンチェーンの期待値と一致しなければ登録せず警告", async () => {
relayer-cf/test/worker-tick.test.mjs:454:test("自動登録: title の不一致も拒否する", async () => {
relayer-cf/test/worker-tick.test.mjs:461:test("自動登録: choices の違いも拒否する(賛成/反対の入れ替え等)", async () => {
relayer-cf/test/worker-tick.test.mjs:468:test("自動登録: 正規 bot の候補が無ければ(GraphQL author 絞りで 0 件)登録も詳細取得もしない", async () => {
relayer-cf/test/worker-tick.test.mjs:476:test("自動登録: 残り投票時間が短すぎる候補は選別で落とす", async () => {
relayer-cf/test/worker-tick.test.mjs:485:test("自動登録: 詳細取得が失敗した候補はスキップし、走査を止めない", async () => {
relayer-cf/test/worker-tick.test.mjs:507:test("自動登録: 投票が終了した候補は選別で落とす", async () => {
relayer-cf/test/worker-tick.test.mjs:515:test("自動登録: 完全一致が 2 件あると曖昧として保留する", async () => {
relayer-cf/test/worker-tick.test.mjs:525:test("自動登録: 送信記録が新しい間は再送しない", async () => {
relayer-cf/test/worker-tick.test.mjs:558:test("自動登録(直接): AlreadyRegistered で期待どおりの登録なら静かに退く", async () => {
relayer-cf/test/worker-tick.test.mjs:563:test("自動登録(直接): AlreadyRegistered だが別 ID が登録済みなら高優先度で警告", async () => {
relayer-cf/test/worker-tick.test.mjs:568:test("nounsDescription: 空文字への更新イベントを最新値として扱う(第18回監査の中)", async () => {
relayer-cf/test/link-check.test.mjs:7:test("正規の URL を検出する", () => {
relayer-cf/test/link-check.test.mjs:19:test("前方一致で誤検出しない", () => {
relayer-cf/test/link-check.test.mjs:25:test("別ドメイン・別パスを拒否する", () => {
relayer-cf/test/link-check.test.mjs:34:test("空・null・不正な入力で例外を投げず false を返す", () => {
relayer-cf/test/link-check.test.mjs:39:test("正規表現メタ文字を含む入力で壊れない", () => {
relayer-cf/test/link-check.test.mjs:45:test("URL の直後に句読点や日本語が続いても検出する", () => {
relayer-cf/test/link-check.test.mjs:57:test("末尾処理で別 ID に化けない", () => {
relayer-cf/test/link-check.test.mjs:63:test("改行で分断された URL は検出しない(仕様)", () => {
relayer-cf/test/link-check.test.mjs:68:test("第12回監査の追加ケース", () => {
relayer-cf/test/format-equivalence.test.mjs:20:test("buildProposal が両実装で完全一致する", () => {
relayer-cf/test/format-equivalence.test.mjs:33:test("定数も一致する", () => {
relayer-cf/test/cursor.test.mjs:10:test("同一秒に 21 票あっても、送れなかった票の手前で cursor が止まる", () => {
relayer-cf/test/cursor.test.mjs:30:test("未解決票の後ろに反映済みの行があっても、cursor は追い越さない(部分 revert 対策)", () => {
relayer-cf/test/cursor.test.mjs:40:test("pNouns 未保有・デッドレターの票は skip 扱いで cursor を進めてよい", () => {
relayer-cf/test/cursor.test.mjs:49:test("やり直し(新しい timestamp)と補完(同 timestamp・token 増)を検出する", () => {
relayer-cf/test/cursor.test.mjs:58:test("すべて反映済みなら最大 created まで進む", () => {
relayer-cf/test/cursor.test.mjs:65:test("指摘1R: 601 件を複数 tick の offset 走査で末尾まで取得して先頭へ戻る", async () => {
relayer-cf/test/cursor.test.mjs:87:test("指摘2: token を入れ替えた場合(保有数 < 計上数)でも補完対象として検出する", () => {
relayer-cf/test/cursor.test.mjs:99:test("指摘3R: 補完用 token 照会は行数ではなく一意な tokenId 数に制限される", () => {
relayer-cf/test/cursor.test.mjs:108:test("指摘2R: 同一 voter の候補は最新 1 件だけをバッチへ入れる", () => {
relayer-cf/test/cursor.test.mjs:119:test("再登録した Snapshot 提案は別の scan offset を使う", () => {
relayer-cf/test/accept-deadline.test.mjs:9:test("mainnet: 受付締切はオンチェーン締切の 30 ブロック前", () => {
relayer-cf/test/accept-deadline.test.mjs:13:test("受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード", () => {
relayer-cf/test/accept-deadline.test.mjs:18:test("最小待機 + cron 間隔 が受付締切〜オンチェーン締切の間に収まる", () => {
relayer-cf/test/accept-deadline.test.mjs:24:test("sepolia テスト設定でも受付窓が残る(投票期間 25 ブロック、margin 5)", () => {
relayer-cf/test/accept-deadline.test.mjs:29:test("M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件", () => {
relayer-cf/test/accept-deadline.test.mjs:42:test("受付締切より十分前なら容量は大きく、通常運用を妨げない(1 日前 ≈ 14,000 票)", () => {
relayer-cf/test/accept-deadline.test.mjs:47:test("B3-M03R: Snapshot 終了後に cron + buffer の排出時間がなければ unsafe", () => {

codex
現時点で、修正 3 には明確な境界穴が見えます。一覧がちょうど 100 件で該当候補が 1 件なら、その 1 件を登録しますが、101 件目以降に同一候補がないことを証明できません。また詳細取得を 1 件スキップしても別の 1 件が一致すれば登録するため、「全候補で一意性確認」という要件にも未達です。Hub の author フィルタ仕様も一次資料・実応答の範囲で確認します。
web search: 
web search: site:docs.snapshot.box GraphQL proposals author filter Snapshot Hub API ...
exec
/bin/bash -lc "rg -n \"本文.*照合|本文.*URL|discussion|議論リンク|検証パック|strategy|strategies|snapshot block|snapshot ブロック|6 件|6件|reorg|再編\" docs/member-proposal-unified.html docs/*.md scripts/sepolia/16-cf-registrar-e2e.js relayer-cf/test relayer-cf/src | sed -n '1,260p'; git log --all --oneline -- docs/audit-19-codex-raw.md; git ls-tree -r HEAD | rg 'audit-19|audit.*19'" in /mnt/data/pnouns-voter
 exited 1 in 0ms:
docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-10-codex-raw.md:19:`discussion` と `body` は提案作成時に指定できる文字列です。Snapshot の公式インターフェースでも両者は提案作成入力です。[Snapshot 公式実装](https://github.com/snapshot-labs/snapshot-mcp)
docs/audit-10-codex-raw.md:21:したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。
docs/audit-10-codex-raw.md:29:この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。
docs/audit-10-codex-raw.md:45:- `discussion` は完全一致の canonical URL とし、本文の部分文字列一致は補助情報に降格する。
docs/audit-10-codex-raw.md:46:- author allowlist、choices/type、Nouns 本文またはハッシュも照合する。
docs/audit-10-codex-raw.md:142:- `discussion`/`body` の null
docs/audit-10-codex-raw.md:187:reorg についても、登録と `registeredAtBlock` は同じ canonical state に属するため通常の浅い reorg には整合的です。24時間相当より深い reorg や owner による delay 変更までは保証しません。
docs/AUDIT-RESPONSE-2026-08-18.md:85:| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/AUDIT-RESPONSE-2026-08-18.md:329:(§3 備え 1 の理屈を全面改訂・§4 反映タイミング・§10 検証パック)。
docs/AUDIT-RESPONSE-2026-08-18.md:376:| 2 | **高** | 本文(最大 9,500 字)を 20 件一括取得すると 64KiB 上限で失敗し、bot の長文連投で自動登録どころか tick 全体(fail-closed)を止められる | 修正: resolveMappings と候補列挙から body を除去(linkOk は discussion のみ)。本文は選別通過後の候補だけ 1 件ずつ取得(最大 5 件) |
docs/member-proposal-unified.html:163:<div class="kv" style="color:var(--ink-2);font-size:13px">置き場所は<b>Snapshot bot と同じ場所には置かない</b>方針(理由は下記)です。Cloudflare 版を実装済みで、テストネットで検証中 — この方式では、登録の前に<b> Nouns のオンチェーン本文から「あるべき提案内容」を再計算し、タイトル・本文・URL・選択肢が完全一致した場合だけ登録</b>します(bot の鍵が単独で盗まれても、忠実な内容の提案しか登録されません)。</div>
docs/member-proposal-unified.html:281:    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
scripts/sepolia/16-cf-registrar-e2e.js:38:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/AUDIT-BRIEF-2.md:19:  - `Vote(string from,string space,uint64 timestamp,string proposal,uint32 choice,string reason,string app,string metadata)`(全フィールド string/uintの実測形式。実データ 6 件で確認済み)
docs/audit-12-codex-raw.md:237:     const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-12-codex-raw.md:238:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-12-codex-raw.md:1192:    66	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:1212:    86	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:1223:    97	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-12-codex-raw.md:1224:    98	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-12-codex-raw.md:1227:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-12-codex-raw.md:1228:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-12-codex-raw.md:1549:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-12-codex-raw.md:1559:    59	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-12-codex-raw.md:1864:    66	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:1884:    86	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:1895:    97	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-12-codex-raw.md:1896:    98	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-12-codex-raw.md:1899:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-12-codex-raw.md:1900:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-12-codex-raw.md:2390:    63	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:2409:    82	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-12-codex-raw.md:2420:    93	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-12-codex-raw.md:2421:    94	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-12-codex-raw.md:2424:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-12-codex-raw.md:2425:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-12-codex-raw.md:2768:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
docs/audit-12-codex-raw.md:2967:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
docs/RUNBOOK-MAINNET.md:133:  space・本文 URL・choices の一致を確認してから registerProposal を呼ぶ(実装済み)。
docs/audit-11-codex-raw.md:109:docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-11-codex-raw.md:115:docs/audit-10-codex-raw.md:29:この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。
docs/audit-11-codex-raw.md:217:relayer-cf/src/snap.js:97:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-11-codex-raw.md:378:   const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:383:     // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-11-codex-raw.md:386:-    const linkOk = needle.test(String(m.discussion || "")) || needle.test(String(m.body || ""));
docs/audit-11-codex-raw.md:387:+    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-11-codex-raw.md:390:+    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-11-codex-raw.md:391:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-11-codex-raw.md:611:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-11-codex-raw.md:1154:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:1173:      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:1184:    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-11-codex-raw.md:1185:    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-11-codex-raw.md:1188:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-11-codex-raw.md:1189:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-11-codex-raw.md:1420:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-11-codex-raw.md:1435:`discussion` と `body` は提案作成時に指定できる文字列です。Snapshot の公式インターフェースでも両者は提案作成入力です。[Snapshot 公式実装](https://github.com/snapshot-labs/snapshot-mcp)
docs/audit-11-codex-raw.md:1437:したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。
docs/audit-11-codex-raw.md:1445:この機構が検出できるのは、主として「誤って別の通常提案を登録し、その提案本文には別の Nouns ID しか書かれていない」という単純な取り違えです。悪意ある registrar、作成プログラムの侵害、偽提案、本文への複数 URL 挿入は検出できません。
docs/audit-11-codex-raw.md:1461:- `discussion` は完全一致の canonical URL とし、本文の部分文字列一致は補助情報に降格する。
docs/audit-11-codex-raw.md:1462:- author allowlist、choices/type、Nouns 本文またはハッシュも照合する。
docs/audit-11-codex-raw.md:1558:- `discussion`/`body` の null
docs/audit-11-codex-raw.md:1603:reorg についても、登録と `registeredAtBlock` は同じ canonical state に属するため通常の浅い reorg には整合的です。24時間相当より深い reorg や owner による delay 変更までは保証しません。
docs/audit-11-codex-raw.md:2117:    63	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:2136:    82	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:2147:    93	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-11-codex-raw.md:2148:    94	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-11-codex-raw.md:2151:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-11-codex-raw.md:2152:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-11-codex-raw.md:3220:./scripts/sepolia/13-snap-e2e.js:40:  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
docs/audit-11-codex-raw.md:3224:./scripts/sepolia/14-snap-setup-only.js:20:    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
docs/audit-11-codex-raw.md:3286:./docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-11-codex-raw.md:4250:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-11-codex-raw.md:4260:    59	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-11-codex-raw.md:4713:   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-11-codex-raw.md:4725:docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-11-codex-raw.md:4750:    63	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:4769:    82	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-11-codex-raw.md:4780:    93	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-11-codex-raw.md:4781:    94	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-11-codex-raw.md:4784:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-11-codex-raw.md:4785:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-13-codex-raw.md:601:+const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-13-codex-raw.md:970:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-13-codex-raw.md:996:    75	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-13-codex-raw.md:1229:    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-13-codex-raw.md:1249:    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-13-codex-raw.md:1260:    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-13-codex-raw.md:1261:    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-13-codex-raw.md:1264:   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-13-codex-raw.md:1265:   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-13-codex-raw.md:2620:    95	const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-13-codex-raw.md:3350:    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-13-codex-raw.md:3370:    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-13-codex-raw.md:3381:    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-13-codex-raw.md:3382:    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-13-codex-raw.md:3385:   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-13-codex-raw.md:3386:   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:166:     <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
docs/audit-17-codex-raw.md:319:   const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
docs/audit-17-codex-raw.md:349:+  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
docs/audit-17-codex-raw.md:350:+  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] }];
docs/audit-17-codex-raw.md:444:docs/audit-16-codex-raw.md:421:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:445:docs/audit-16-codex-raw.md:422:relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:453:docs/audit-16-codex-raw.md:441:docs/audit-12-codex-raw.md:237:     const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:454:docs/audit-16-codex-raw.md:442:docs/audit-12-codex-raw.md:238:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:482:docs/audit-16-codex-raw.md:510:docs/audit-12-codex-raw.md:1227:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:483:docs/audit-16-codex-raw.md:511:docs/audit-12-codex-raw.md:1228:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:493:docs/audit-16-codex-raw.md:538:docs/audit-12-codex-raw.md:1899:   101	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:494:docs/audit-16-codex-raw.md:539:docs/audit-12-codex-raw.md:1900:   102	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:498:docs/audit-16-codex-raw.md:570:docs/audit-12-codex-raw.md:2424:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:499:docs/audit-16-codex-raw.md:571:docs/audit-12-codex-raw.md:2425:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:528:docs/audit-16-codex-raw.md:636:docs/audit-11-codex-raw.md:217:relayer-cf/src/snap.js:97:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:540:docs/audit-16-codex-raw.md:651:docs/audit-11-codex-raw.md:386:-    const linkOk = needle.test(String(m.discussion || "")) || needle.test(String(m.body || ""));
docs/audit-17-codex-raw.md:541:docs/audit-16-codex-raw.md:652:docs/audit-11-codex-raw.md:390:+    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:542:docs/audit-16-codex-raw.md:653:docs/audit-11-codex-raw.md:391:     return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:556:docs/audit-16-codex-raw.md:689:docs/audit-11-codex-raw.md:1188:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:557:docs/audit-16-codex-raw.md:690:docs/audit-11-codex-raw.md:1189:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:563:docs/audit-16-codex-raw.md:704:docs/audit-11-codex-raw.md:1420:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-17-codex-raw.md:564:docs/audit-16-codex-raw.md:705:docs/audit-11-codex-raw.md:1437:したがって、同じ Snapshot space で提案を作成できる者、またはその作成プログラムを侵害した者は、偽提案の本文に対象 URL を書くだけで `linkOk=true` にできます。照合していないものは次のとおりです。
docs/audit-17-codex-raw.md:570:docs/audit-16-codex-raw.md:726:docs/audit-11-codex-raw.md:2151:    97	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:571:docs/audit-16-codex-raw.md:727:docs/audit-11-codex-raw.md:2152:    98	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:588:docs/audit-16-codex-raw.md:796:docs/audit-11-codex-raw.md:3286:./docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-17-codex-raw.md:707:docs/audit-16-codex-raw.md:3582:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:708:docs/audit-16-codex-raw.md:3583:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:780:docs/audit-16-codex-raw.md:5703:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:781:docs/audit-16-codex-raw.md:5704:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:1008:docs/audit-16-codex-raw.md:11596:+docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-17-codex-raw.md:1069:docs/audit-16-codex-raw.md:12263:+4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-17-codex-raw.md:1337:docs/audit-16-codex-raw.md:13856:/bin/bash -lc "rg -n \"linkOk|referencesNouns|nouns.wtf/vote|discussion|body|registerProposal\" scripts/mainnet/create-and-register.mjs relayer-cf/src/snap.js .github 2>/dev/null | head -n 160; nl -ba relayer-cf/src/abi.js | sed -n '1,110p'; git diff --check; git status --short" in /mnt/data/pnouns-voter
docs/audit-17-codex-raw.md:1339:docs/audit-16-codex-raw.md:13867:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:1340:docs/audit-16-codex-raw.md:13868:relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:1346:docs/audit-16-codex-raw.md:14046:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-17-codex-raw.md:1361:docs/audit-16-codex-raw.md:14191:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-17-codex-raw.md:1406:relayer-cf/test/worker-tick.test.mjs:393:  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
docs/audit-17-codex-raw.md:1411:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-17-codex-raw.md:1412:relayer-cf/src/snap.js:114:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-17-codex-raw.md:1541:    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
docs/audit-17-codex-raw.md:1981:const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-17-codex-raw.md:2204: (§3 備え 1 の理屈を全面改訂・§4 反映タイミング・§10 検証パック)。
docs/audit-17-codex-raw.md:2248:     <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
docs/audit-17-codex-raw.md:2263:    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
docs/audit-17-codex-raw.md:2283:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-17-codex-raw.md:2428:3. しかし `castSnapshotVotes()` は誰でも呼べます。コントラクトは Snapshot 本文の URL を検証しないため、解禁後は第三者が Worker を経由せず、誤対応表へ署名済み票を投函できます。
docs/audit-17-codex-raw.md:2684:/bin/bash -lc "rg -n \"registerProposal|discussion|nouns.wtf/vote|snapshot|proposal\" relayer-cf/scripts scripts .github --glob '"'!**/node_modules/**'"' | head -n 300; rg -n \"create-and-register\" -S . --glob '"'!**/node_modules/**'"'; sed -n '1,260p' relayer-cf/scripts/create-and-register.mjs 2>/dev/null || true; git show --name-only --format='' d23ed75; git diff-tree --no-commit-id --name-only -r d23ed75" in /mnt/data/pnouns-voter
docs/audit-17-codex-raw.md:2695:scripts/create-and-register.mjs:49:  console.log(`discussion: ${p.discussion}`);
docs/audit-17-codex-raw.md:2698:scripts/create-and-register.mjs:86:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-17-codex-raw.md:2716:scripts/lib/proposal-format.mjs:4://  - discussion: https://nouns.wtf/vote/N
docs/audit-17-codex-raw.md:2718:scripts/lib/proposal-format.mjs:33:  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
docs/audit-17-codex-raw.md:2733:scripts/sepolia/14-snap-setup-only.js:20:    snapshot: await mainnetProvider.getBlockNumber(), plugins: "{}", app: "pnouns-voter-test", discussion: "",
docs/audit-17-codex-raw.md:2764:scripts/sepolia/13-snap-e2e.js:40:  // ① Snapshot 提案(空間は mainnet ハブ。snapshot ブロックは mainnet の latest)
docs/audit-17-codex-raw.md:2767:scripts/sepolia/13-snap-e2e.js:52:    plugins: "{}", app: "pnouns-voter-test", discussion: "",
docs/audit-17-codex-raw.md:2941:./docs/audit-16-codex-raw.md:13856:/bin/bash -lc "rg -n \"linkOk|referencesNouns|nouns.wtf/vote|discussion|body|registerProposal\" scripts/mainnet/create-and-register.mjs relayer-cf/src/snap.js .github 2>/dev/null | head -n 160; nl -ba relayer-cf/src/abi.js | sed -n '1,110p'; git diff --check; git status --short" in /mnt/data/pnouns-voter
docs/audit-17-codex-raw.md:2946:./docs/audit-16-codex-raw.md:14002:scripts/create-and-register.mjs:49:  console.log(`discussion: ${p.discussion}`);
docs/audit-17-codex-raw.md:2949:./docs/audit-16-codex-raw.md:14005:scripts/create-and-register.mjs:86:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-17-codex-raw.md:3066:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-17-codex-raw.md:3103:    86	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-17-codex-raw.md:3143:   281	    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
docs/audit-17-codex-raw.md:3219:   363	  const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
docs/audit-17-codex-raw.md:3249:   393	  // 対応表は登録済みだが、Snapshot 提案の discussion が別議案(999)を指す = linkOk=false
docs/audit-17-codex-raw.md:3250:   394	  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] }];
docs/audit-17-codex-raw.md:3495:- `discussion` / `body` 内の正しいNouns URL
docs/audit-17-codex-raw.md:3694:- `discussion` / `body` 内の正しいNouns URL
docs/audit-15-codex-raw.md:1122:+++const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-15-codex-raw.md:1491:++    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-15-codex-raw.md:1517:++    75	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-15-codex-raw.md:1750:++    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-15-codex-raw.md:1770:++    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-15-codex-raw.md:1781:++    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-15-codex-raw.md:1782:++    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-15-codex-raw.md:1785:++   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-15-codex-raw.md:1786:++   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-15-codex-raw.md:4847:    85	| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
docs/audit-15-codex-raw.md:4904:   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-15-codex-raw.md:5024:docs/audit-10-codex-raw.md:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-15-codex-raw.md:5419:docs/AUDIT-RESPONSE-2026-08-18.md:85:| B3-M05 | Medium | 仕様決定: **提出時点の現在所有を正とする**(Snapshot の snapshot block とは異なる)。既知の差異として README・メンバー資料に明記。期間中に NFT を動かした場合のみ乖離、二重カウントはビットマップで防止 |
docs/audit-15-codex-raw.md:5444:docs/AUDIT-RESPONSE-2026-08-18.md:142:| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-15-codex-raw.md:5566:   142	| 2 | Medium | URL 照合は提案本文の自己申告であり、悪意ある registrar / 侵害された作成プログラムは検出できない。資料の「機械が自分で見つけて知らせる」は言い過ぎ | 資料を訂正(「捕まえられるのは取り違え類の事故まで」と限界を明記)。照合自体も正規表現から URL 解析に置換し、偽ドメイン・サブドメイン・大文字・前方一致を厳密化 |
docs/audit-15-codex-raw.md:5691:4:`discussion`/`body` が `null` または欠落しただけで GraphQL 自体が成功した場合は `linkOk=false` となり、mainnet で停止します。つまり黙って `true` には倒れません。一方、クエリ全体の失敗時だけ安全判定を迂回する不整合があります。
docs/audit-15-codex-raw.md:5745:17:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
docs/audit-15-codex-raw.md:5774:216:3つはテストファイル単位の集計です。`link-check.test.mjs` 自体は8 subtest、実行されるassertionは46件でした。
docs/audit-15-codex-raw.md:6628:- 悪意ある registrar が自己整合する誤対応を登録した場合、本文URL照合では検出不能  
docs/audit-15-codex-raw.md:6746:- 悪意ある registrar が自己整合する誤対応を登録した場合、本文URL照合では検出不能  
docs/audit-14-codex-raw.md:718:++const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-14-codex-raw.md:1087:+    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-14-codex-raw.md:1113:+    75	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-14-codex-raw.md:1346:+    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-14-codex-raw.md:1366:+    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-14-codex-raw.md:1377:+    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-14-codex-raw.md:1378:+    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-14-codex-raw.md:1381:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-14-codex-raw.md:1382:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-14-codex-raw.md:2737:+    95	const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-14-codex-raw.md:3467:+    67	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-14-codex-raw.md:3487:+    87	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-14-codex-raw.md:3498:+    98	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-14-codex-raw.md:3499:+    99	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-14-codex-raw.md:3502:+   102	    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-14-codex-raw.md:3503:+   103	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-14-codex-raw.md:6689:    96	const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-14-codex-raw.md:7419:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-14-codex-raw.md:7456:    86	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-14-codex-raw.md:7806:    49	  console.log(`discussion: ${p.discussion}`);
docs/audit-14-codex-raw.md:7843:    86	    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-18-codex-raw.md:24:イベント)から buildProposal で期待内容を再計算し、title/body/discussion/choices が
docs/audit-18-codex-raw.md:87:      期待内容を再計算し、title/body/discussion/choices が完全一致した
docs/audit-18-codex-raw.md:154:+// title・body・discussion・choices が完全一致した場合のみ登録する。
docs/audit-18-codex-raw.md:181:+  return { title, body, discussion: url, choices: [...CHOICES], truncated };
docs/audit-18-codex-raw.md:200:+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title body discussion choices } }`);
docs/audit-18-codex-raw.md:201:+  const cand = (data.proposals || []).find((x) => referencesNounsProposal(x.discussion, p.id) || referencesNounsProposal(x.body, p.id));
docs/audit-18-codex-raw.md:208:+  if ((cand.discussion || "") !== expected.discussion) problems.push("discussion");
docs/audit-18-codex-raw.md:220:+  await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。`, `Snapshot: ${cand.id}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
docs/audit-18-codex-raw.md:277:+  const cand = { id: SNAP_ID, title: expected.title, body: expected.body, discussion: expected.discussion, choices: expected.choices, ...candOverride };
docs/audit-18-codex-raw.md:368:-//  - discussion: https://nouns.wtf/vote/N
docs/audit-18-codex-raw.md:373:+// title・body・discussion・choices が完全一致した場合のみ登録する。
docs/audit-18-codex-raw.md:407:-  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
docs/audit-18-codex-raw.md:408:+  return { title, body, discussion: url, choices: [...CHOICES], truncated };
docs/audit-18-codex-raw.md:427:+  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title body discussion choices } }`);
docs/audit-18-codex-raw.md:428:+  const cand = (data.proposals || []).find((x) => referencesNounsProposal(x.discussion, p.id) || referencesNounsProposal(x.body, p.id));
docs/audit-18-codex-raw.md:435:+  if ((cand.discussion || "") !== expected.discussion) problems.push("discussion");
docs/audit-18-codex-raw.md:447:+  await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。`, `Snapshot: ${cand.id}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
docs/audit-18-codex-raw.md:470:relayer-cf/test/worker-tick.test.mjs:100:const hubProposal = (discussion) => ({ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion, body: "" }] });
docs/audit-18-codex-raw.md:473:relayer-cf/test/worker-tick.test.mjs:364:  const pastProposal = { proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) - 100000, discussion: "https://nouns.wtf/vote/1", body: "" }] };
docs/audit-18-codex-raw.md:474:relayer-cf/test/worker-tick.test.mjs:396:  F.hub = [{ proposals: [{ id: SNAP_ID, title: "T", end: Math.floor(Date.now() / 1000) + 3600, discussion: "https://nouns.wtf/vote/999", body: "" }] },
docs/audit-18-codex-raw.md:476:relayer-cf/test/worker-tick.test.mjs:412:  const cand = { id: SNAP_ID, title: expected.title, body: expected.body, discussion: expected.discussion, choices: expected.choices, ...candOverride };
docs/audit-18-codex-raw.md:522:relayer-cf/src/snap.js:78:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:523:relayer-cf/src/snap.js:98:      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:524:relayer-cf/src/snap.js:110:    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-18-codex-raw.md:526:relayer-cf/src/snap.js:113:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-18-codex-raw.md:539:relayer-cf/src/register.js:4:// title・body・discussion・choices が完全一致した場合のみ登録する。
docs/audit-18-codex-raw.md:546:relayer-cf/src/register.js:31:  return { title, body, discussion: url, choices: [...CHOICES], truncated };
docs/audit-18-codex-raw.md:552:relayer-cf/src/register.js:50:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title body discussion choices } }`);
docs/audit-18-codex-raw.md:553:relayer-cf/src/register.js:51:  const cand = (data.proposals || []).find((x) => referencesNounsProposal(x.discussion, p.id) || referencesNounsProposal(x.body, p.id));
docs/audit-18-codex-raw.md:557:relayer-cf/src/register.js:70:  await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。`, `Snapshot: ${cand.id}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
docs/audit-18-codex-raw.md:643:scripts/create-and-register.mjs:86:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-18-codex-raw.md:645:scripts/create-and-register.mjs:100:    const rb = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${receipt.id}") { id space { id } discussion body choices state } }` }) })).json();
docs/audit-18-codex-raw.md:646:scripts/create-and-register.mjs:105:    if (!String(pr.discussion || "").includes(expectedUrl) && !String(pr.body || "").includes(expectedUrl)) problems.push(`本文/URL が ${expectedUrl} を指していない`);
docs/audit-18-codex-raw.md:657:scripts/lib/proposal-format.mjs:33:  return { title, body, discussion: url, choices: [...CHOICES], truncated, originalLength: String(description || "").length };
docs/audit-18-codex-raw.md:936:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:956:      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:967:    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-18-codex-raw.md:968:    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-18-codex-raw.md:971:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-18-codex-raw.md:972:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-18-codex-raw.md:1260:  console.log(`discussion: ${p.discussion}`);
docs/audit-18-codex-raw.md:1297:    space: SPACE, type: "single-choice", title: p.title, body: p.body, discussion: p.discussion,
docs/audit-18-codex-raw.md:1311:    const rb = await (await fetch(`${HUB}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `{ proposal(id:"${receipt.id}") { id space { id } discussion body choices state } }` }) })).json();
docs/audit-18-codex-raw.md:1316:    if (!String(pr.discussion || "").includes(expectedUrl) && !String(pr.body || "").includes(expectedUrl)) problems.push(`本文/URL が ${expectedUrl} を指していない`);
docs/audit-18-codex-raw.md:1494:[notify] 📝 Prop 1: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。 ⏎ Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
docs/audit-18-codex-raw.md:1602:  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:1622:      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion body } }`);
docs/audit-18-codex-raw.md:1633:    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion/本文の URL)を確認する。
docs/audit-18-codex-raw.md:1634:    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。discussion/body は提案作成者が
docs/audit-18-codex-raw.md:1637:    const linkOk = referencesNounsProposal(m.discussion, nounsId) || referencesNounsProposal(m.body, nounsId);
docs/audit-18-codex-raw.md:1638:    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
docs/audit-18-codex-raw.md:2079:[notify] 📝 Prop 1: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)を検証済み。 ⏎ Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
docs/audit-18-codex-raw.md:2161:     4	// title・body・discussion・choices が完全一致した場合のみ登録する。
docs/audit-18-codex-raw.md:2188:    31	  return { title, body, discussion: url, choices: [...CHOICES], truncated };

web search: 
web search: site:github.com/snapshot-labs/snapshot-hub discussion proposal validation max length author proposals resolver ...
exec
/bin/bash -lc "nl -ba relayer-cf/src/register.js | sed -n '60,155p'; nl -ba relayer-cf/src/snap.js | sed -n '72,120p'; nl -ba relayer-cf/src/chain.js | sed -n '20,72p'; nl -ba contracts/PNounsSnapVoter.sol | sed -n '175,191p'; nl -ba relayer-cf/test/worker-tick.test.mjs | sed -n '430,575p'; nl -ba docs/member-proposal-unified.html | sed -n '155,170p;274,288p'; nl -ba relayer-cf/wrangler.toml | sed -n '15,58p'" in /mnt/data/pnouns-voter
 succeeded in 0ms:
    60	
    61	/// 未登録の active な Nouns 提案について、対応する Snapshot 提案を探し、検証して登録する。
    62	export async function autoRegister(c, pc, registrar, store, notify, p) {
    63	  // 送信済み記録: 10 分は再送しない。それを過ぎたら receipt を確認して再試行を判断
    64	  const sentK = `${store.prefix}regsent2:${p.id}`;
    65	  const pending = await store.kvRaw.get(sentK, "json");
    66	  if (pending) {
    67	    if (Date.now() - pending.at < 10 * 60 * 1000) return;
    68	    let rcpt = null;
    69	    try { rcpt = await pc.getTransactionReceipt({ hash: pending.tx }); } catch { rcpt = null; }
    70	    await store.kvRaw.delete(sentK);
    71	    if (rcpt && rcpt.status === "success") return; // 成功していれば次 tick で snapInfo が現れ、ここには来なくなる
    72	    console.warn(`[register] prop ${p.id}: 前回の登録 tx が${rcpt ? "revert" : "未採掘"}のため再試行します`);
    73	  }
    74	
    75	  // 1) 候補の列挙: GraphQL 側で正規 bot に絞る(攻撃者の巨大 discussion 提案は来ない = 64KiB DoS 対策)。
    76	  //    small フィールドのみ。author が未設定の運用では自動登録しない(cfg で必須化済み)。
    77	  const LIST = 100; // 一覧上限。これを超える bot 提案が該当する状況は異常なので、超過は一意性不明として保留する
    78	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}", author:"${c.snapshotBot}"}, first: ${LIST}, orderBy: "created", orderDirection: desc) { id type start end discussion } }`);
    79	  const all = data.proposals || [];
    80	  const refs = all.filter((x) => referencesNounsProposal(x.discussion, p.id));
    81	  if (!refs.length) return; // bot がまだ提案を作っていない — 次 tick に再確認
    82	  if (all.length >= LIST && refs.length > 1) { // 一覧が上限に達し、かつ複数候補 = 範囲外に更なる候補がある恐れ
    83	    await warnOnce(c, store, notify, `reglist:${p.id}`, 86400, `⚠️ Prop ${p.id}: bot の提案が多く、候補の一意性を確認できないため自動登録を保留しました。`);
    84	    return;
    85	  }
    86	
    87	  // 2) 選別: single-choice・投票期間が現在有効で、残り時間が投函に必要な余裕を上回る
    88	  const now = Date.now() / 1000;
    89	  const minRemainSec = c.cronSec + c.submitBufferSec + 300; // 猶予明け後に投函・採掘できる最小残り時間
    90	  const screened = refs.filter((x) =>
    91	    x.type === "single-choice" &&
    92	    Number(x.start) <= now && Number(x.end) - now > minRemainSec && Number(x.end) - Number(x.start) <= 8 * 86400);
    93	  if (!screened.length) {
    94	    await warnOnce(c, store, notify, `regscreen:${p.id}`, 86400,
    95	      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 ${refs.length} 件)。`);
    96	    return;
    97	  }
    98	
    99	  // 3) オンチェーン本文から期待内容を再計算
   100	  const desc = await nounsDescription(c, pc, store, p.id, p.creationBlock);
   101	  if (desc === null) { console.warn(`[register] prop ${p.id}: オンチェーン本文を取得できず登録を見送り`); return; }
   102	  const expected = buildProposal({ nounsId: p.id, description: desc });
   103	
   104	  // 4) 候補を 1 件ずつ取得して完全一致を数える。取得失敗(64KiB 超過等)はその候補だけスキップし走査を続ける
   105	  const matches = [];
   106	  let skipped = 0;
   107	  for (const cand of screened) {
   108	    let x = null;
   109	    try { x = (await hubGql(c, `{ proposal(id:"${cand.id}") { id title body discussion choices } }`))?.proposal; }
   110	    catch (e) { skipped++; console.warn(`[register] prop ${p.id}: 候補 ${cand.id.slice(0, 12)} の取得に失敗(スキップ): ${(e.message || "").slice(0, 60)}`); continue; }
   111	    if (!x) continue;
   112	    if (x.title === expected.title && (x.discussion || "") === expected.discussion && (x.body || "") === expected.body && JSON.stringify(x.choices) === JSON.stringify(expected.choices)) matches.push(x.id);
   113	  }
   114	  if (skipped) await warnOnce(c, store, notify, `regskip:${p.id}`, 86400, `⚠️ Prop ${p.id}: 候補 ${skipped} 件を取得できず(サイズ超過など)検証をスキップしました。`);
   115	  if (matches.length === 0) {
   116	    await warnOnce(c, store, notify, `regmismatch:${p.id}`, 86400,
   117	      `⚠️ Prop ${p.id}: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。`);
   118	    return;
   119	  }
   120	  if (matches.length > 1) {
   121	    await warnOnce(c, store, notify, `regambig:${p.id}`, 86400,
   122	      `⚠️ Prop ${p.id}: 内容が完全一致する Snapshot 提案が ${matches.length} 件あり、一意に決められないため自動登録を保留しました。`);
   123	    return;
   124	  }
   125	
   126	  // 5) 登録(AlreadyRegistered は手動登録等との競合として静かに退く)
   127	  try {
   128	    const hash = await registrar.writeContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "registerProposal", args: [matches[0], BigInt(p.id)] });
   129	    await store.kvRaw.put(sentK, JSON.stringify({ tx: hash, at: Date.now() }), { expirationTtl: 86400 * 3 }); // 提案期間以上(第19回監査: 1h では Worker 長時間停止で tx を見失う)
   130	    await notify(c, [`📝 Prop ${p.id}: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。`, `Snapshot: ${matches[0]}`, `tx: ${c.explorer}/tx/${hash}`].join("\n"));
   131	  } catch (e) {
   132	    if (revertErrorName(e) === "AlreadyRegistered") {
   133	      // 実際に登録された対応(nounsToSnap)を読み戻し、期待した Snapshot 提案のハッシュと一致するか確認する。
   134	      // 別 ID が割り込んで登録された場合は高優先度で警告して止める(静かに退かない)。
   135	      const expectedHash = keccak256(stringToBytes(matches[0]));
   136	      let got = null;
   137	      try { got = await pc.readContract({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(p.id)] }); } catch {}
   138	      if (got && got.toLowerCase() === expectedHash.toLowerCase()) { console.log(`[register] prop ${p.id}: 期待どおり登録済み(競合)`); return; }
   139	      await warnOnce(c, store, notify, `regconflict:${p.id}`, 86400, `⚠️ Prop ${p.id}: 対応表が既に登録済みですが、登録されたハッシュ(${got ? String(got).slice(0, 14) : "取得失敗"}…)が期待した Snapshot 提案 ${matches[0].slice(0, 14)}… のハッシュ(${expectedHash.slice(0, 14)}…)と一致しません。誤登録の可能性 — 手動で確認してください。`);
   140	      return;
   141	    }
   142	    await warnOnce(c, store, notify, `regerr:${p.id}`, 86400,
   143	      `⚠️ Prop ${p.id}: 対応表の自動登録の送信に失敗しました(${(e.shortMessage || e.message || "").slice(0, 120)})。registrar の残高・RPC を確認してください。`);
   144	  }
   145	}
    72	    if (u.pathname.replace(/\/+$/, "") === `/vote/${id}`) return true;
    73	  }
    74	  return false;
    75	}
    76	
    77	export async function resolveMappings(c, pc, activeNounsIds = []) {
    78	  // 正規 bot が設定されていれば author で絞る(攻撃者の巨大 discussion 提案を候補から排除 = 64KiB DoS 対策・第19回監査)
    79	  const authorFilter = c.snapshotBot ? `, author:"${c.snapshotBot}"` : "";
    80	  const data = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 20, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
    81	  if (!Array.isArray(data.proposals)) throw new Error("hub: proposals shape");
    82	  const meta = new Map(data.proposals.map((p) => [p.id, p]));
    83	  const found = new Map(); // nounsId -> snapId
    84	  if (data.proposals.length) {
    85	    const res = await pc.multicall({
    86	      contracts: data.proposals.map((p) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "snapToNouns", args: [keccak256(stringToBytes(p.id))] })),
    87	      allowFailure: false,
    88	    });
    89	    data.proposals.forEach((p, i) => { const n = Number(res[i]); if (n > 0) found.set(n, p.id); });
    90	  }
    91	  // 逆引き: まだ見つかっていない稼働中の Nouns 提案について nounsToSnap を引き、ハブから当該提案を取得
    92	  const unresolved = []; // オンチェーンに対応表があるのに、ハブ側の提案を特定できなかった Nouns 提案
    93	  const missing = activeNounsIds.filter((id) => !found.has(Number(id)));
    94	  if (missing.length) {
    95	    const hashes = await pc.multicall({ contracts: missing.map((id) => ({ address: c.metagov, abi: METAGOV_ABI, functionName: "nounsToSnap", args: [BigInt(id)] })), allowFailure: false });
    96	    const need = [];
    97	    missing.forEach((id, i) => { if (hashes[i] && hashes[i] !== "0x0000000000000000000000000000000000000000000000000000000000000000") need.push({ id: Number(id), hash: hashes[i] }); });
    98	    if (need.length) {
    99	      // ハブから対象 space の提案を追加取得し、ハッシュ一致で snapId を特定(最大 200 件遡る)
   100	      const more = await hubGql(c, `{ proposals(where:{space:"${c.snapshotSpace}"${authorFilter}}, first: 200, orderBy: "created", orderDirection: desc) { id title end discussion } }`);
   101	      const byHash = new Map((more.proposals || []).map((p) => [keccak256(stringToBytes(p.id)), p]));
   102	      for (const n of need) {
   103	        const p = byHash.get(n.hash);
   104	        if (p) { found.set(n.id, p.id); meta.set(p.id, p); }
   105	        else { unresolved.push(n.id); console.warn(`[snap] prop ${n.id}: 対応する Snapshot 提案がハブで見つかりません`); }
   106	      }
   107	    }
   108	  }
   109	  const mappings = [...found.entries()].map(([nounsId, snapId]) => {
   110	    const m = meta.get(snapId) || {};
   111	    // 対応付けの自動照合: Snapshot 提案が本当にその Nouns 議案を指しているか(discussion の URL)を確認する。
   112	    // body は取得しない — 本文(最大 9,500 字)を 20 件一括で取ると応答上限 64KiB を超え、
   113	    // bot 単独侵害で tick 全体を止められるため(第18回監査)。discussion は作成プログラムが必ず設定する。
   114	    // 検出できるのは「別の提案を取り違えて登録した」類の事故まで。自己申告のため
   115	    // 偽提案と対応表を同じ主体が作れる場合は検出できない。過信しないこと。
   116	    const linkOk = referencesNounsProposal(m.discussion, nounsId);
   117	    return { snapId, nounsId, title: m.title, snapEnd: Number(m.end || 0), linkOk, discussion: m.discussion || "" };
   118	  });
   119	  return { mappings, unresolved };
   120	}
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
    32	  if (env.AUTO_REGISTER === "1" && (!env.REGISTRAR_PRIVATE_KEY || !env.SNAPSHOT_BOT)) throw new Error("AUTO_REGISTER には REGISTRAR_PRIVATE_KEY と SNAPSHOT_BOT が必要です"); // 第18回監査
    33	  return {
    34	    network: env.NETWORK || "sepolia",
    35	    chain,
    36	    chainId: chain.id,
    37	    rpcUrl: env.RPC_URL, // secret(Alchemy 等)
    38	    metagov: getAddress(env.VOTER),
    39	    pnouns: getAddress(env.PNOUNS),
    40	    nounsDAO: getAddress(env.NOUNS_DAO),
    41	    nounsToken: getAddress(env.NOUNS_TOKEN),
    42	    explorer: env.EXPLORER,
    43	    blockscout: env.BLOCKSCOUT || null,
    44	    publicUrl: env.PUBLIC_URL || "",
    45	    onlyProposer: env.ONLY_PROPOSER ? env.ONLY_PROPOSER.toLowerCase() : null,
    46	    scanProposals: Number(env.SCAN_PROPOSALS || 30),
    47	    executeGasMult: Number(env.EXECUTE_GAS_MULT || 1.3),
    48	    minPendingAgeSec: Number(env.MIN_PENDING_AGE_SEC || 20),
    49	    maxBatch: (() => { const n = Number(env.MAX_BATCH || 10); if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error("MAX_BATCH must be 1..10"); return n; })(), // 1 tx にまとめる署名数の上限
    50	    announce: env.ANNOUNCE !== "0",
    51	    snapshotSpace: env.SNAPSHOT_SPACE || null, // B3: 設定時は Snapshot ハブから投票を取得するモード
    52	    snapshotHub: env.SNAPSHOT_HUB || "https://hub.snapshot.org",
    53	    ipfsGateway: env.IPFS_GATEWAY || "https://snapshot.4everland.link/ipfs",
    54	    cronSec: Number(env.CRON_SEC || (env.NETWORK === "mainnet" ? 120 : 60)), // cron 間隔(秒)。署名受付締切の計算に使う
    55	    minRegistrationDelay: (() => { const n = Number(env.MIN_REGISTRATION_DELAY ?? 10); if (!Number.isInteger(n) || n < 0) throw new Error("MIN_REGISTRATION_DELAY must be a non-negative integer"); return n; })(), // mainnet で要求する登録猶予の下限(ブロック)。10 ブロック(約 2 分) = 受付開始前に自動照合が必ず 1 周する間隔(2026-08-21 の設計判断: 誤登録の自動復旧より、投票直後の NFT 移転で票が減る窓の解消を優先。すり抜け型の誤登録は管理者停止 + 手動運用で受け止める)。NaN で下限が消える事故を防ぐ検証つき(第12回監査)
    56	    rushBatches: (() => { const n = Number(env.RUSH_BATCHES || 2); if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error("RUSH_BATCHES must be 1..3"); return n; })(), // 受付締切後、1 tick で連続投函するバッチ数
    57	    submitBufferSec: Number(env.SUBMIT_BUFFER_SEC || 120), // KV 反映・送信・採掘の余裕
    58	    discordWebhook: env.DISCORD_WEBHOOK_URL || null,
    59	    relayerKey: env.RELAYER_PRIVATE_KEY || null,
    60	    registrarKey: env.REGISTRAR_PRIVATE_KEY || null, // 登録係を Cloudflare で動かす場合の鍵(任意)
    61	    autoRegister: env.AUTO_REGISTER === "1", // Worker による対応表の自動登録(内容一致の検証つき)
    62	    snapshotBot: env.SNAPSHOT_BOT ? getAddress(env.SNAPSHOT_BOT) : null, // Snapshot 提案の正規作成者(自動登録の author 検証に使用)
    63	    lowBalanceEth: env.LOW_BALANCE_ETH || (env.NETWORK === "mainnet" ? "0.01" : "0.02"),
    64	  };
    65	}
    66	// M-14: 署名受付締切 = オンチェーン締切 − (最小待機 + cron 間隔 + 余裕)。この境界より後に受け付けた署名は通常運用で投函できないので API で拒否する
    67	export function acceptMarginBlocks(c) {
    68	  return Math.ceil((c.minPendingAgeSec + c.cronSec + c.submitBufferSec) / 12);
    69	}
    70	export function acceptDeadline(c, onchainDeadline) {
    71	  return Math.max(0, Number(onchainDeadline) - acceptMarginBlocks(c));
    72	}
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
   430	  ...over,
   431	});
   432	
   433	// ハブ応答: [対応表解決(small 相当), 候補一覧(small), 詳細(detail)] の 3 段
   434	const regHub = (small, detail) => [{ proposals: [small] }, { proposals: [small] }, { proposal: detail }];
   435	
   436	test("自動登録: 検証をすべて通過した提案だけを登録する", async () => {
   437	  const { kv, env, small, detail, regWrites } = regSetup(unregHandlers());
   438	  F.hub = regHub(small, detail);
   439	  await tick(env);
   440	  assert.equal(regWrites.length, 1, "registerProposal が送られる");
   441	  assert.deepEqual(regWrites[0].args, [SNAP_ID, 1n]);
   442	  assert.equal(putsOf(kv, "regsent2:1").length, 1, "送信記録(tx+時刻)");
   443	  assert.ok(F.discordBodies.some((b) => b.includes("自動登録しました")));
   444	});
   445	
   446	test("自動登録: 本文がオンチェーンの期待値と一致しなければ登録せず警告", async () => {
   447	  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { body: "改ざんされた本文" } });
   448	  F.hub = regHub(small, detail);
   449	  await tick(env);
   450	  assert.equal(regWrites.length, 0, "登録しない");
   451	  assert.ok(F.discordBodies.some((b) => b.includes("自動登録を保留")), "不一致の警告");
   452	});
   453	
   454	test("自動登録: title の不一致も拒否する", async () => {
   455	  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { title: "[Prop 1] 偽のタイトル" } });
   456	  F.hub = regHub(small, detail);
   457	  await tick(env);
   458	  assert.equal(regWrites.length, 0);
   459	});
   460	
   461	test("自動登録: choices の違いも拒否する(賛成/反対の入れ替え等)", async () => {
   462	  const { env, small, detail, regWrites } = regSetup(unregHandlers(), { detail: { choices: ["反対", "賛成", "棄権"] } });
   463	  F.hub = regHub(small, detail);
   464	  await tick(env);
   465	  assert.equal(regWrites.length, 0);
   466	});
   467	
   468	test("自動登録: 正規 bot の候補が無ければ(GraphQL author 絞りで 0 件)登録も詳細取得もしない", async () => {
   469	  const { env, regWrites } = regSetup(unregHandlers());
   470	  F.hub = [{ proposals: [] }, { proposals: [] }];
   471	  await tick(env);
   472	  assert.equal(regWrites.length, 0);
   473	  assert.equal(F.hubCalls, 2, "詳細クエリに進まない");
   474	});
   475	
   476	test("自動登録: 残り投票時間が短すぎる候補は選別で落とす", async () => {
   477	  const nowS = Math.floor(Date.now() / 1000);
   478	  const { env, small, regWrites } = regSetup(unregHandlers(), { small: { end: nowS + 60 } });
   479	  F.hub = [{ proposals: [small] }, { proposals: [small] }];
   480	  await tick(env);
   481	  assert.equal(regWrites.length, 0);
   482	  assert.ok(F.discordBodies.some((b) => b.includes("残り時間")));
   483	});
   484	
   485	test("自動登録: 詳細取得が失敗した候補はスキップし、走査を止めない", async () => {
   486	  const { env, small, detail, regWrites } = regSetup(unregHandlers());
   487	  const small2 = { ...small, id: "0x" + "cc".repeat(32) };
   488	  const detail2 = { ...detail, id: small2.id };
   489	  F.hub = [{ proposals: [small, small2] }, { proposals: [small, small2] }];
   490	  const orig = globalThis.fetch;
   491	  globalThis.fetch = async (url, init) => {
   492	    const u = String(url);
   493	    if (u.startsWith(HUB)) {
   494	      const q = JSON.parse(init.body).query; F.hubCalls++;
   495	      if (q.includes("proposals(")) return new Response(JSON.stringify({ data: F.hub.shift() }), { status: 200 });
   496	      if (q.includes(small.id)) throw new Error("body too large"); // 1件目の詳細取得が失敗
   497	      return new Response(JSON.stringify({ data: { proposal: detail2 } }), { status: 200 });
   498	    }
   499	    return orig(url, init);
   500	  };
   501	  try { await tick(env); } finally { globalThis.fetch = orig; }
   502	  assert.equal(regWrites.length, 1, "2件目で登録される");
   503	  assert.deepEqual(regWrites[0].args, [small2.id, 1n]);
   504	  assert.ok(F.discordBodies.some((b) => b.includes("スキップ")));
   505	});
   506	
   507	test("自動登録: 投票が終了した候補は選別で落とす", async () => {
   508	  const nowS = Math.floor(Date.now() / 1000);
   509	  const { env, small, regWrites } = regSetup(unregHandlers(), { small: { end: nowS - 10 } });
   510	  F.hub = [{ proposals: [small] }, { proposals: [small] }];
   511	  await tick(env);
   512	  assert.equal(regWrites.length, 0);
   513	});
   514	
   515	test("自動登録: 完全一致が 2 件あると曖昧として保留する", async () => {
   516	  const { env, small, detail, regWrites } = regSetup(unregHandlers());
   517	  const small2 = { ...small, id: "0x" + "bb".repeat(32) };
   518	  const detail2 = { ...detail, id: small2.id };
   519	  F.hub = [{ proposals: [small, small2] }, { proposals: [small, small2] }, { proposal: detail }, { proposal: detail2 }];
   520	  await tick(env);
   521	  assert.equal(regWrites.length, 0);
   522	  assert.ok(F.discordBodies.some((b) => b.includes("一意に決められない")));
   523	});
   524	
   525	test("自動登録: 送信記録が新しい間は再送しない", async () => {
   526	  const { kv, env, small, detail, regWrites } = regSetup(unregHandlers());
   527	  const ns = `11155111:${VOTER.toLowerCase()}:`;
   528	  kv.data.set(`${ns}regsent2:1`, JSON.stringify({ tx: "0x" + "cd".repeat(32), at: Date.now() }));
   529	  F.hub = regHub(small, detail);
   530	  await tick(env);
   531	  assert.equal(regWrites.length, 0);
   532	});
   533	
   534	// AlreadyRegistered の分岐は autoRegister を直接呼んで検証する
   535	// (tick 経由だと nounsToSnap 非ゼロが手前の unresolved 分岐に吸われ、autoRegister に届かないため)
   536	async function callAutoRegister(nounsToSnapHash, throwErr = true) {
   537	  const { autoRegister } = await import("../src/register.js");
   538	  const err = new ContractFunctionRevertedError({ abi: METAGOV_ABI, data: "0x3a81d6fc", functionName: "registerProposal" });
   539	  const expected = buildProposal({ nounsId: 1, description: DESC });
   540	  const nowS = Math.floor(Date.now() / 1000);
   541	  const small = { id: SNAP_ID, type: "single-choice", start: nowS - 100, end: nowS + 86400, discussion: expected.discussion };
   542	  const detail = { id: SNAP_ID, title: expected.title, body: expected.body, discussion: expected.discussion, choices: expected.choices };
   543	  F.hub = [{ proposals: [small] }, { proposal: detail }];
   544	  const kv = fakeKV();
   545	  const store = makeStoreLike(kv);
   546	  const pc = fakePC(handlers({ getLogs: (x) => (x.toBlock === x.fromBlock ? [{ eventName: "ProposalCreated", args: { id: 1n, description: DESC } }] : []), nounsToSnap: () => nounsToSnapHash }));
   547	  const notify = async (_c, text) => { F.discordBodies.push(text); return true; };
   548	  const registrar = { account: { address: REGISTRAR }, writeContract: async () => { throw err; } };
   549	  const c = { snapshotSpace: SPACE, snapshotBot: REGISTRAR_BOT, snapshotHub: HUB, metagov: VOTER, nounsDAO: DAO, explorer: "https://x", cronSec: 60, submitBufferSec: 120 };
   550	  await autoRegister(c, pc, registrar, store, notify, { id: 1, creationBlock: 50 });
   551	  return kv;
   552	}
   553	function makeStoreLike(kv) {
   554	  const P = "";
   555	  return { prefix: P, kvRaw: kv, getFlag: async (k) => kv.data.get(`flag:${k}`) || null, setFlag: async (k) => kv.data.set(`flag:${k}`, "1") };
   556	}
   557	
   558	test("自動登録(直接): AlreadyRegistered で期待どおりの登録なら静かに退く", async () => {
   559	  await callAutoRegister(keccak256(stringToBytes(SNAP_ID)));
   560	  assert.ok(!F.discordBodies.some((b) => b.includes("一致しません")), "期待どおりなら警告しない");
   561	});
   562	
   563	test("自動登録(直接): AlreadyRegistered だが別 ID が登録済みなら高優先度で警告", async () => {
   564	  await callAutoRegister(keccak256(stringToBytes("0x" + "ff".repeat(32))));
   565	  assert.ok(F.discordBodies.some((b) => b.includes("一致しません")), "別 ID 登録は警告する");
   566	});
   567	
   568	test("nounsDescription: 空文字への更新イベントを最新値として扱う(第18回監査の中)", async () => {
   569	  const { nounsDescription } = await import("../src/register.js");
   570	  const kv = fakeKV();
   571	  const store = { prefix: "t:", kvRaw: kv, getFlag: async () => null, setFlag: async () => {} };
   572	  const pc = fakePC(handlers({
   573	    getLogs: (x) => (x.toBlock === x.fromBlock
   574	      ? [{ eventName: "ProposalCreated", args: { id: 1n, description: "元の本文" } }]
   575	      : [{ eventName: "ProposalDescriptionUpdated", args: { id: 1n, description: "" } }]),
   155	<div class="keycard"><div class="keyhead"><b>リレイヤー</b><span class="pill cloud">Cloudflare</span><span class="freq">出番: 本番は 2 分ごと</span></div>
   156	<div class="kv"><span class="k can">できること</span>Snapshot の署名をチェーンに運ぶ</div>
   157	<div class="kv"><span class="k cant">できないこと</span>票の偽造・改変・投票結果の指定(コントラクト上の専用権限は持たない)</div>
   158	</div>
   159	<div class="keycard"><div class="keyhead"><b>登録係</b><span class="pill local">自宅 PC</span> または <span class="pill cloud">Cloudflare</span><span class="freq">出番: 提案ごとに 1 回</span></div>
   160	<div class="kv"><span class="k can">できること</span>「この Snapshot 投票は Nouns の第 N 号議案のもの」と登録する(<b>自動処理</b>。提案作成と同じプログラムが続けて行うので、人が ID を書き写す場面はありません)</div>
   161	<div class="kv" style="color:var(--ink-2);font-size:13px">この「どの Snapshot 投票が、どの Nouns 議案に対応するか」を記録した一覧を、本資料では<b>対応表</b>と呼びます。コントラクトの中(オンチェーン)に保存され、誰でも見られます。コントラクトはこの対応表を引いて「届いた票をどの議案に数えるか」を決めます。</div>
   162	<div class="kv"><span class="k cant">できないこと</span>票に関する一切の操作</div>
   163	<div class="kv" style="color:var(--ink-2);font-size:13px">置き場所は<b>Snapshot bot と同じ場所には置かない</b>方針(理由は下記)です。Cloudflare 版を実装済みで、テストネットで検証中 — この方式では、登録の前に<b> Nouns のオンチェーン本文から「あるべき提案内容」を再計算し、タイトル・本文・URL・選択肢が完全一致した場合だけ登録</b>します(bot の鍵が単独で盗まれても、忠実な内容の提案しか登録されません)。</div>
   164	</div>
   165	<div class="keycard"><div class="keyhead"><b>Snapshot bot</b><span class="pill cloud">GitHub</span><span class="freq">出番: 提案ごとに 1 回</span></div>
   166	<div class="kv"><span class="k can">できること</span>Snapshot に投票ページを作る(現行から引き続き。pNouns 1 枚保有)</div>
   167	<div class="kv"><span class="k cant">できないこと</span>オンチェーンの一切の操作</div>
   168	</div>
   169	<div class="keycard"><div class="keyhead"><b>管理者</b><span class="pill human">当初: 委任アドレス → 移管後: pNouns マルチシグ <b>(提案)</b></span><span class="freq">出番: ほぼなし</span></div>
   170	<div class="kv"><span class="k can">できること</span>Nouns DAO への自動投票の停止、ガス代の回収、除外設定、締切余裕・登録猶予・返金設定の変更、対応表の登録・未受理時の取消、登録係の交代、管理者権限の移管・放棄</div>
   274	
   275	<h3>唯一、暗号で保証できない部分 — 対応表</h3>
   276	<div class="card warn" style="margin-top:6px">
   277	  <p style="margin:0 0 6px">確認 1 の<b>対応表(この Snapshot 投票 ＝ Nouns の第 N 号議案)</b>だけは、コントラクトが自力で確かめられません。Snapshot の投票署名に Nouns の議案番号が含まれていないためです(Snapshot の仕様)。運用は<b>全自動</b>ですが、「そのプログラムと鍵を信頼している」という意味で、ここだけは性質が異なります。</p>
   278	  <p style="margin:0 0 6px"><b>そのための備えを 4 段用意しています。</b></p>
   279	  <ol style="margin:0 0 4px">
   280	    <li><b>登録の直後(約 2 分)は票を受け付けない</b> — 登録と受付開始を同じ瞬間にしないための最小間隔です。</li>
   281	    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
   282	    <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
   283	    <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   284	  </ol>
   285	</div>
   286	<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
   287	  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の間隔」について</b>: 誤登録への守りは、自動検算(食い違いを検出している間は票を流さない)と管理者による停止が担います。<b>正直な限界</b>: 投函は誰でも実行できる操作のため、悪意の第三者が解禁後に公開署名を直接投函すると、対応表はその時点で取消不能になります。その場合も、誤った投票が Nouns DAO に確定する前に管理者が停止でき(警告は通常数分で出るため、登録が締切間際でない限り数日の余裕があります)、当該議案は従来の手動投票に切り替えます(停止は全議案の最終投票を止め、集計は続きます)。受付解禁の時点は登録時に固定され、管理者にも前倒しできません。</p>
   288	  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
    15	id = "4c2f1c683fe94191b456e0c1fc70cc2f"
    16	
    17	[vars]
    18	NETWORK = "sepolia"
    19	VOTER = "0x64CdACeA6857c6560F3124c532AA4ed34152693F"
    20	SNAPSHOT_SPACE = "earl-grey.eth"
    21	AUTO_REGISTER = "1" # 登録係の Cloudflare 実装をテスト中(secret: REGISTRAR_PRIVATE_KEY)
    22	SNAPSHOT_BOT = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925" # Snapshot 提案の正規作成者(テストは開発鍵)
    23	PNOUNS = "0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6"
    24	NOUNS_DAO = "0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57"
    25	NOUNS_TOKEN = "0x4C4674bb72a096855496a7204962297bd7e12b85"
    26	EXPLORER = "https://sepolia.etherscan.io"
    27	BLOCKSCOUT = "https://eth-sepolia.blockscout.com"
    28	ONLY_PROPOSER = "0x10849D31FfEaEca7727af6711A8D1b0a9b738925"
    29	MIN_PENDING_AGE_SEC = "20"
    30	MAX_BATCH = "10"
    31	EXECUTE_GAS_MULT = "1.3"
    32	# secrets(wrangler secret put): RPC_URL, RELAYER_PRIVATE_KEY, DISCORD_WEBHOOK_URL, (任意) TICK_TOKEN
    33	PUBLIC_URL = "https://pnouns-voter.x402-adsb-worker.workers.dev"
    34	
    35	# ---- mainnet(別 Worker として `wrangler deploy --env mainnet`)。vars は継承されないので必要な値をすべて明示。ONLY_PROPOSER は置かない ----
    36	[env.mainnet]
    37	name = "pnouns-voter-mainnet"
    38	[env.mainnet.assets]
    39	directory = "./public"
    40	[env.mainnet.triggers]
    41	crons = ["*/2 * * * *"]
    42	[[env.mainnet.kv_namespaces]]
    43	binding = "STATE"
    44	id = "REPLACE_WITH_MAINNET_KV_ID"
    45	[env.mainnet.vars]
    46	NETWORK = "mainnet"
    47	SNAPSHOT_SPACE = "pnounsdao.eth"
    48	VOTER = "REPLACE_AFTER_MAINNET_DEPLOY"
    49	PNOUNS = "0x4bE962499cE295b1ed180F923bf9c73b6357DE80"
    50	NOUNS_DAO = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"
    51	NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"
    52	EXPLORER = "https://etherscan.io"
    53	BLOCKSCOUT = "https://eth.blockscout.com"
    54	MIN_PENDING_AGE_SEC = "120"
    55	MAX_BATCH = "10"
    56	EXECUTE_GAS_MULT = "1.3"
    57	LOW_BALANCE_ETH = "0.01"
    58	PUBLIC_URL = "https://pnouns-voter-mainnet.x402-adsb-worker.workers.dev"

exec
/bin/bash -lc "rg -n \"検証パック|検算|照合|URL\" docs/member-proposal-unified.html | tail -30; nl -ba docs/member-proposal-unified.html | sed -n '390,450p'; git diff 2bc1ddc"'^ 2bc1ddc -- docs/member-proposal-unified.html' in /mnt/data/pnouns-voter
 succeeded in 0ms:
148:    <li><b>集計の内訳が Nouns DAO の記録に残る</b>(<a href="#record">§5</a>)。誰でも検算できる</li>
163:<div class="kv" style="color:var(--ink-2);font-size:13px">置き場所は<b>Snapshot bot と同じ場所には置かない</b>方針(理由は下記)です。Cloudflare 版を実装済みで、テストネットで検証中 — この方式では、登録の前に<b> Nouns のオンチェーン本文から「あるべき提案内容」を再計算し、タイトル・本文・URL・選択肢が完全一致した場合だけ登録</b>します(bot の鍵が単独で盗まれても、忠実な内容の提案しか登録されません)。</div>
178:  <li><b>自動投函を妨害・遅延させる</b>(対策は §3 — 誰でも代わりに運べ、締切時の照合で検出されます)</li>
192:<p style="font-size:14px">つまりコントラクト上の票を偽造・改変する権限は増えませんが、<b>自動処理の停止と、リレイヤー残高(本番想定 0.01 ETH)の損失</b>は起こり得ます。対処は鍵の差し替えと残高の補充です。加えて本番では、4 つの役割に同一アドレスが混ざっていないかを導入時のチェックで照合し、Worker 自身も owner・登録係・リレイヤーの重複を検出すると停止します。</p>
196:  <li><b>Snapshot bot と登録係は同じ場所に置きません。</b>両方が同時に盗まれると「偽の投票ページを作り、それを対応表に登録する」攻撃 — §3 の自動検算で見抜けない唯一のケース — が、1 箇所への侵入だけで成立してしまうためです。</li>
221:<p style="margin:4px 0 0">本番の鍵の作り直しと配置は手順書に組み込み済みで、導入時の機械チェックでも照合します。</p></div>
229:<p>電子署名には次の性質があります: <b>署名とメッセージがあれば、「誰が署名したか」を純粋な計算だけで復元できる</b>(誰かに問い合わせる必要がない)。コントラクトは受け取ったデータから、①メッセージのハッシュ値を自分で計算し直し(このとき投票所名は焼き込み済みの pnounsdao.eth を使う)、②署名から署名者のアドレスを数学的に復元し、③申告された投票者と一致するか照合します。Ethereum 本体が全トランザクションの検証に使っているのと同じ仕組みです。</p>
231:<p style="margin-bottom:4px"><b>たとえるなら</b>: Snapshot は「実印を押した投票はがきが貼り出される<b>公開掲示板</b>」、リレイヤーは「はがきを役所に運ぶだけの<b>配達員</b>」、コントラクトは「印影を自前で照合できる<b>役所</b>」です。役所は掲示板にも配達員にも「本物ですか?」と聞く必要がなく、はがきそのものを検査すれば真贋が分かります。配達員にできるのは配達をサボることだけで、それも掲示板が公開なので誰にでも露見します。</p>
259:<p style="margin-bottom:4px"><b>正直な補足</b>: 遠い将来の量子コンピュータはハッシュより署名側への脅威が先に来るとされますが、これは Ethereum 全体の課題で移行方式が研究されており、この仕組み固有のリスクではありません。実務上の最弱点はアルゴリズムではなく<b>鍵の管理と対応表の運用</b>です — だからこそ鍵の分離(§2)や対応表の自動検算(§3)に力を入れています。</p>
281:    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
286:<h4 class="sub">備え 1(約 2 分の受付停止)と備え 2(自動検算)の詳しい理屈と限界</h4>
287:  <p style="margin:10px 0 6px;font-size:14px"><b>備え 1「約 2 分の間隔」について</b>: 誤登録への守りは、自動検算(食い違いを検出している間は票を流さない)と管理者による停止が担います。<b>正直な限界</b>: 投函は誰でも実行できる操作のため、悪意の第三者が解禁後に公開署名を直接投函すると、対応表はその時点で取消不能になります。その場合も、誤った投票が Nouns DAO に確定する前に管理者が停止でき(警告は通常数分で出るため、登録が締切間際でない限り数日の余裕があります)、当該議案は従来の手動投票に切り替えます(停止は全議案の最終投票を止め、集計は続きます)。受付解禁の時点は登録時に固定され、管理者にも前倒しできません。</p>
288:  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
318:<div class="card ok"><b>ひとことで言うと</b>: 「Snapshot の使い勝手(署名だけ・ガス 0 円)を残したまま、<b>各署名と集計を第三者が検算できる形</b>でオンチェーンに引き上げ、Nouns DAO への反映まで自動化した」仕組みです。投票の入り口である Snapshot と、議案どうしの対応表には依存が残ります。</div>
342:<p style="font-size:14.5px"><b>直接は検証できません。</b>Cloudflare 上で実際に動いているプログラムが、公開しているソースコードと同一であることを第三者が証明する方法はありません(これは世の中のあらゆるサーバーに共通の限界です)。<b>だからこそ、この設計はクラウドを信頼しないことを前提にしています</b>: クラウドは署名の投函、誰でも呼べる確定操作、通知を自動実行しますが、票の中身はオンチェーンのコントラクト(こちらは<b>ソースコードとの一致を誰でも検証可能</b>)が確かめます。クラウドの動きも外から観測はできます — 送信したトランザクションは全部チェーン上に残り、設定は公開 API(<a href="#verify">§10</a>)で見えます。<b>「中身は見えないが、票の偽造・改変はコントラクトが拒否し、運び漏れは公開データとの照合で検出する」</b>という位置づけです。</p>
355:<div class="card"><b>要するに</b>: 年 約 0.002〜0.004 ETH(500〜1,100 円)のガス代で、年 約 20〜28 時間ある定常作業の大部分と「投票し忘れ」のリスクを減らし、さらに「集計を誰でも検算できる」透明性を得る、というトレードオフです。</div>
428:<p style="font-size:14px">各段階の後に、設定・鍵の分離・委任・残高を機械的に照合するチェックを実行し、全項目が通るまで次へ進みません(手順書と照合プログラムは作成済み・テストネットで検証済み)。</p>
442:<tr><th>もの</th><th>アドレス / URL</th></tr>
480:【主張3】対応表の登録から 10 ブロック(約 2 分)は票を受け付けない(本番設定。受付前に自動検算が走ることの保証)
504:【主張7】Snapshot の票は誰でも取得でき、集計を検算できる
524:<tr><td>Snapshot の提案・票・署名</td><td><b>公開</b>(Snapshot の公開 API)</td><td>誰が・何に・いつ投票したか。集計の検算</td></tr>
   390	  </ul>
   391	</div>
   392	<h4 class="sub">Sepolia の Nouns DAO が「公式テスト版」である根拠と、本番との違い</h4>
   393	<p style="margin-top:10px"><b>根拠(誰でも確認できます)</b>:</p>
   394	<ul>
   395	  <li>Nouns 公式リポジトリ(nouns-monorepo)の設定ファイル <a href="https://github.com/nounsDAO/nouns-monorepo/blob/master/packages/nouns-subgraph/config/sepolia.json">packages/nouns-subgraph/config/sepolia.json</a> に、テストで使っている DAO <code>0x35d2670d…4A57</code> と Token <code>0x4C4674bb…2b85</code> がそのまま記載されています。</li>
   396	  <li>同リポジトリの <a href="https://github.com/nounsDAO/nouns-monorepo/tree/master/packages/nouns-contracts/broadcast">デプロイ記録(broadcast)</a>には、同じデプロイスクリプト(DAO ロジック)を mainnet と Sepolia に<b>同日(2024-04-23、約 13 分差)に実行した記録</b>が残っています。</li>
   397	</ul>
   398	<p><b>本番との違い(オンチェーンで実測・2026-08-21)</b>: プログラムは同一系統の公式デプロイで、違いは「テストを速く回すための期間設定」と「参加者の規模」です。</p>
   399	<div class="tbl"><table>
   400	<tr><th>項目</th><th>mainnet</th><th>Sepolia(テスト)</th></tr>
   401	<tr><td>投票開始までの待機</td><td>3,600 ブロック(約 12 時間)</td><td>3 ブロック(約 36 秒)</td></tr>
   402	<tr><td>投票期間</td><td>28,800 ブロック(約 4 日)</td><td>25 ブロック(約 5 分)</td></tr>
   403	<tr><td>提案に必要な保有割合</td><td>0.25%</td><td>0.5%</td></tr>
   404	<tr><td>Nouns の総数</td><td>1,972</td><td>829</td></tr>
   405	<tr><td>実装コードのサイズ</td><td colspan="2">同一(23,724 バイト)</td></tr>
   406	</table></div>
   407	<p style="margin-bottom:4px;font-size:14px">この「期間が短い」違いは、テストでは締切・猶予などの時間パラメータを同じ比率で短縮して検証することで吸収しています(ロジック自体は本番と同じ値の設定で動きます)。本番移行時には、見学モードで実際の mainnet 上の提案を使ってあらためて確認します(§9)。</p>
   408	
   409	
   410	<p><b>残っている確認</b>: ① 新しい形式(Nouns 原文の転記)での提案作成の通し(実施中) ② メインネットでの「見学モード」(メンバー合意後)。</p>
   411	
   412	<h2 id="rules"><span class="no">9.</span>投票のルール / 導入の進め方</h2>
   413	<h3>投票のルール(コントラクトに固定)</h3>
   414	<ul>
   415	  <li>重み = 保有 pNouns 枚数(チェーン上で検証)。トレジャリー分(13 枚)は数えない(DAO 自身の持ち分で特定メンバーの意思を表さないため — 現行 Snapshot 運用の踏襲)。技術的には除外リストにトレジャリーのアドレスを登録する方式で、将来ルールを変える場合も管理者が除外設定を変更するだけで、コントラクトの書き換えは不要です。定足数なし。</li>
   416	  <li>同数なら投票者数が多い方、それも同数なら棄権 <b>(暫定 — ご意見で変更可能)</b>。誰も投票しなければ Nouns にも投票しない。</li>
   417	  <li>Snapshot で投票をやり直した場合は、<b>いちばん新しい投票が有効</b>。</li>
   418	  <li>締切は Nouns の投票終了の 7,200 ブロック前(約 24 時間前。いまの Snapshot 48 時間より長く投票できます)。</li>
   419	  <li>コントラクトは後から書き換え不可。<b>NFT や資産は預けません</b>(預けるのはガス代のみ)。</li>
   420	</ul>
   421	<h3>導入の進め方(段階ごとに機械チェックを通します)</h3>
   422	<ol>
   423	  <li><b>見学モードで設置</b> — Nouns には投票せず、集計だけを実際の提案で数回行い、手動運用の結果と一致するか確認します。<b>この間も現行の手動運用は継続する</b>ため、メンバーの投票の流れと Nouns への反映は今までどおりです(裏で自動集計が並走し、一致を Discord で報告します)。この段階で委任アドレスから、返金プールへ 0.05 ETH、リレイヤーへ 0.01 ETH、登録係へ 0.005 ETH を配分します。<b>この時点のコントラクト管理者はアールグレイの委任アドレス</b>です。</li>
   424	  <li>一致を確認 → <b>メンバーの合意</b>。</li>
   425	  <li>マルチシグが投票権の委任先をコントラクトへ変更(1 トランザクション・いつでも戻せる)し、委任を機械確認した後、当初の管理者である委任アドレスが <code>setLiveMode(true)</code> を実行して本番開始。</li>
   426	  <li>安定稼働を確認後、<b>コントラクトの管理者権限を委任アドレスから pNouns マルチシグへ移管</b>(1 トランザクション。移管手順はテストネットで演習済み)。以後、緊急停止・ガス回収・鍵交代はマルチシグの承認が必要になります。</li>
   427	</ol>
   428	<p style="font-size:14px">各段階の後に、設定・鍵の分離・委任・残高を機械的に照合するチェックを実行し、全項目が通るまで次へ進みません(手順書と照合プログラムは作成済み・テストネットで検証済み)。</p>
   429	<div class="card warn">やめたくなったら、マルチシグが委任を戻すだけで元の手動運用に戻せます(Nouns の仕様上、切り戻しは以後の提案から有効。進行中の提案は管理者が停止スイッチで止められます)。</div>
   430	<div class="card"><b>本番移行時に必要な準備</b>
   431	<ul style="margin:6px 0 0">
   432	  <li><b>Discord の通知先の切り替え</b>: 現在テストの通知はアールグレイのサーバー宛てです。本番では <b>pNouns⚡DAO サーバーの Webhook</b> を発行し、告知(📢)・反映(🗳️)・投票完了(✅)・障害警告(⚠️)を pNouns のチャンネルに流します。投稿先チャンネルとロールメンションの有無は事前に相談させてください。</li>
   433	  <li><b>4 つの鍵の準備</b>: 管理者(当初はアールグレイの委任アドレス → 安定稼働後にマルチシグへ移管)・登録係・リレイヤー・Snapshot bot を別々に用意(テストネットでは構成済み)。</li>
   434	  <li><b>ガス代の配分</b>: 委任アドレスのガス代 0.111 ETH から、0.05 ETH をコントラクト、0.01 ETH をリレイヤー、0.005 ETH を登録係へ(見学モード開始時、計 0.065 ETH)。</li>
   435	</ul></div>
   436	
   437	<h2 id="verify"><span class="no">10.</span>自分で(または AI で)検証する</h2>
   438	<p>この資料の主な技術的主張は、公開データから第三者が検証できるように作っています。<b>このページ全体をお使いの AI に渡して「検証して」と頼めば</b>、下のアドレスと手順から実際に確かめられます。</p>
   439	
   440	<h3>テストネット(Sepolia)で現在動いているもの</h3>
   441	<div class="tbl"><table>
   442	<tr><th>もの</th><th>アドレス / URL</th></tr>
   443	<tr><td><b>pNouns Voter コントラクト</b>(検証対象の本体)</td><td><code>0x64CdACeA6857c6560F3124c532AA4ed34152693F</code><br><a href="https://sepolia.etherscan.io/address/0x64CdACeA6857c6560F3124c532AA4ed34152693F">Etherscan</a> ・ <a href="https://eth-sepolia.blockscout.com/address/0x64CdACeA6857c6560F3124c532AA4ed34152693F">Blockscout</a> ・ <a href="https://repo.sourcify.dev/contracts/full_match/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F">Sourcify(全ソースコード)</a></td></tr>
   444	<tr><td>テスト用 Snapshot スペース</td><td><a href="https://snapshot.box/#/s:earl-grey.eth">snapshot.box/#/s:earl-grey.eth</a>(本番は <code>pnounsdao.eth</code>)</td></tr>
   445	<tr><td>Sepolia の Nouns DAO(公式テスト版)</td><td><code>0x35d2670d7C8931AACdd37C89Ddcb0638c3c44A57</code></td></tr>
   446	<tr><td>Sepolia の Nouns Token(公式テスト版)</td><td><code>0x4C4674bb72a096855496a7204962297bd7e12b85</code></td></tr>
   447	<tr><td>pNouns NFT(Sepolia 複製)</td><td><code>0x2dc16A3EC98A825e731b09512B602fDDC5246Ad6</code></td></tr>
   448	<tr><td>管理者(テストでは開発用。本番は当初の委任アドレスからマルチシグへ移管)</td><td><code>0x10849D31FfEaEca7727af6711A8D1b0a9b738925</code></td></tr>
   449	<tr><td>登録係(独立鍵)</td><td><code>0xfE07E953BfdBbDA576551e047Bb9166C34d7c9ae</code></td></tr>
   450	<tr><td>リレイヤー(独立鍵・Cloudflare)</td><td><code>0xBbE0b0fe2181586a947cF8660D7704926A9eD561</code></td></tr>
diff --git a/docs/member-proposal-unified.html b/docs/member-proposal-unified.html
index 5d9b1cc..0b6c529 100644
--- a/docs/member-proposal-unified.html
+++ b/docs/member-proposal-unified.html
@@ -278,7 +278,7 @@
   <p style="margin:0 0 6px"><b>そのための備えを 4 段用意しています。</b></p>
   <ol style="margin:0 0 4px">
     <li><b>登録の直後(約 2 分)は票を受け付けない</b> — 登録と受付開始を同じ瞬間にしないための最小間隔です。</li>
-    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案の本文には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)が必ず入っています。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の本文が本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
+    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
     <li><b>対応表はオンチェーンに公開</b>され、Discord の告知にも両方の ID が出るので、誰でも見比べられます。</li>
     <li>最終手段として<b>管理者(当初は委任アドレス、移管後は pNouns マルチシグ)が停止できます</b>。</li>
   </ol>

exec
/bin/bash -lc "nl -ba docs/member-proposal-unified.html | sed -n '450,515p'; rg -n \"discussion|body|本文|URL\" docs/member-proposal-unified.html | tail -20" in /mnt/data/pnouns-voter
 succeeded in 0ms:
   450	<tr><td>リレイヤー(独立鍵・Cloudflare)</td><td><code>0xBbE0b0fe2181586a947cF8660D7704926A9eD561</code></td></tr>
   451	<tr><td>状況ページ(集計の確認・手動実行) / 公開設定 API</td><td><a href="https://pnouns-voter.x402-adsb-worker.workers.dev">pnouns-voter.x402-adsb-worker.workers.dev</a> / <a href="https://pnouns-voter.x402-adsb-worker.workers.dev/api/config">…/api/config</a><br><span style="font-size:13px;color:var(--ink-2)">閲覧だけならウォレット不要。ウォレットを接続すると、締切後に「手動で execute」(その時点の集計を Nouns DAO へ確定)ができます。ガスの返金は pNouns Voter のプールではなく、Nouns DAO 側の上限つき返金です。未反映票はこのボタンでは追加されません</span></td></tr>
   452	</table></div>
   453	
   454	<h3>本番(メインネット)で対象になるもの(参考)</h3>
   455	<div class="tbl"><table>
   456	<tr><td>pNouns NFT</td><td><code>0x4bE962499cE295b1ed180F923bf9c73b6357DE80</code></td></tr>
   457	<tr><td>Nouns DAO</td><td><code>0x6f3E6272A167e8AcCb32072d08E0957F9c79223d</code></td></tr>
   458	<tr><td>Nouns Token</td><td><code>0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03</code></td></tr>
   459	</table></div>
   460	
   461	<h4 class="sub">AI に渡す検証手順(コピーして質問に添えてください)</h4>
   462	<pre>
   463	あなたは独立した検証者です。以下の主張を、公開データを取得して事実確認してください。
   464	推測で埋めず、確認できなかった項目は「未確認」と報告してください。
   465	
   466	【対象】Sepolia (chainId 11155111) の PNounsSnapVoter
   467	  0x64CdACeA6857c6560F3124c532AA4ed34152693F
   468	
   469	【主張1】ソースコードが公開され、デプロイ済みコードと完全一致している
   470	  → Sourcify API: https://sourcify.dev/server/v2/contract/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F
   471	    "match": "exact_match" を確認。ソース全文は
   472	    https://repo.sourcify.dev/contracts/full_match/11155111/0x64CdACeA6857c6560F3124c532AA4ed34152693F
   473	
   474	【主張2】コントラクトは Snapshot の署名を自分で検証している
   475	  → 上記ソースの castSnapshotVotes() / _castVote() を読む。
   476	    確認点: EIP-712 ハッシュの再計算、ecrecover/EIP-1271、ownerOf() による
   477	    NFT 保有照会、_votedBitmap による二重計上防止、timestamp による再投票制御、
   478	    spaceHash の固定(コンストラクタで keccak256("earl-grey.eth"))
   479	
   480	【主張3】対応表の登録から 10 ブロック(約 2 分)は票を受け付けない(本番設定。受付前に自動検算が走ることの保証)
   481	  → ソースの registerProposal() で eligibleAtBlock = block.number + registrationDelayBlocks、
   482	    unregisterProposal() は snapshotVotesAccepted != 0 なら revert、
   483	    setRegistrationDelayBlocks() が既登録の eligibleAtBlock に影響しないことを確認。
   484	    (テストネットの現在値は eth_call registrationDelayBlocks() = 5(実験用)。本番は 10)
   485	
   486	【主張4】管理者にも票の偽造・改変・任意の Nouns 投票をする権限がない
   487	  → ソースの onlyOwner 関数を列挙する。setExcluded / setMarginBlocks / setLiveMode /
   488	    setRegistrar / setRegistrationDelayBlocks / setRefundEnabled / setRefundCapPerProposal /
   489	    sweep(+ OpenZeppelin Ownable 標準の transferOwnership / renounceOwnership)のみで、
   490	    票を作る・書き換える・execute の結果を指定する関数がないこと。
   491	    (registerProposal / unregisterProposal は owner も呼べるが、猶予と取消不能条件は §3 のとおり)
   492	
   493	【主張5】鍵が分離されている(テストネットで実証中)
   494	  → eth_call: owner() = 0x10849D31…8925, registrar() = 0xfE07E953…c9ae。
   495	    リレイヤー 0xBbE0b0fe…D561 は https://pnouns-voter.x402-adsb-worker.workers.dev/api/config
   496	    の "relayer" と一致し、3 者が互いに異なること。
   497	
   498	【主張6】Nouns の投票権が委任されており、実際に自動投票が成立している
   499	  → Nouns Token (Sepolia 0x4C4674bb…2b85) の getCurrentVotes(0x64CdACe…693F) &gt; 0。
   500	    Sepolia Nouns DAO (0x35d2670d…4A57) の VoteCast イベントで、
   501	    voter = 0x64CdACe…693F の投票と reason 文(集計内訳)を確認。
   502	    例: 提案 #527 (2026-08-21 に自動実行。賛成 6 / 反対 2 / 棄権 1 → FOR)
   503	
   504	【主張7】Snapshot の票は誰でも取得でき、集計を検算できる
   505	  → https://hub.snapshot.org/graphql に POST:
   506	    { proposals(where:{space:"earl-grey.eth"}, first:5, orderBy:"created",
   507	      orderDirection:desc) { id title choices scores votes } }
   508	    任意の提案 id について { votes(where:{proposal:"&lt;id&gt;"}) { voter choice created ipfs } }
   509	    で 1 票ずつの署名レコードを取得し、上の VoteCast の内訳と突き合わせる。
   510	
   511	【注意】
   512	- Cloudflare 上で動くプログラム(リレイヤー)の実行コードは外部から証明できません。
   513	  これは仕様であり、上記のとおり「クラウドを信頼しなくても票が守られる」設計かどうかを
   514	  ソースコード(主張2)で判断してください。
   515	- テストネットの管理者と一部の鍵は開発用です。本番構成(当初は委任アドレスが管理し、
7:  * { box-sizing:border-box; } body { margin:0; background:var(--ground); color:var(--ink); font-family:var(--sans); line-height:1.8; font-size:16px; }
46:  .col .body { padding:2px 6px 8px; }
110:  <div class="col now"><h3>いまの仕組み</h3><div class="body"><ol>
113:    <li><span class="tag a">自動</span><span class="pill cloud">クラウド</span> GitHub 上の自動処理が Snapshot に投票ページを作成(本文＝日本語要約)</li>
119:  <div class="col new"><h3>新しい仕組み</h3><div class="body"><ol>
121:    <li><span class="tag a">自動</span><span class="pill cloud">クラウド</span> Snapshot に投票ページを作成(GitHub 上)。<b>本文は Nouns の提案文をそのまま転記</b>(長すぎる場合のみ末尾を省略し、原文リンクを表示)</li>
139:  <div class="col now"><h3>いまの仕組み</h3><div class="body"><ul>
145:  <div class="col new"><h3>新しい仕組み</h3><div class="body"><ul>
163:<div class="kv" style="color:var(--ink-2);font-size:13px">置き場所は<b>Snapshot bot と同じ場所には置かない</b>方針(理由は下記)です。Cloudflare 版を実装済みで、テストネットで検証中 — この方式では、登録の前に<b> Nouns のオンチェーン本文から「あるべき提案内容」を再計算し、タイトル・本文・URL・選択肢が完全一致した場合だけ登録</b>します(bot の鍵が単独で盗まれても、忠実な内容の提案しか登録されません)。</div>
281:    <li><b>プログラムが自分で対応付けを検算する</b> — Snapshot に作る提案には、元の Nouns 提案ページの URL(nouns.wtf/vote/第N号)を議論リンク欄(discussion)に必ず設定します。プログラムは処理のたび(本番は 2 分ごと)に対応表の「この Snapshot 提案 = 第 N 号」を取り出し、<b>その Snapshot 提案の議論リンクが本当に第 N 号の URL を指しているか</b>を照合します。食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理(告知・反映・確定)を止めます。</li>
288:  <p style="margin:0;font-size:14px"><b>備え 2「自動検算」の限界</b>: Snapshot に作る提案には、元の Nouns 提案ページの URL(<code>nouns.wtf/vote/第N号</code>)が必ず入っています。プログラムは対応表を使うたびに<b>「この Snapshot 提案は本当に第 N 号議案を指しているか」を自動で照合</b>し、食い違っていれば Discord に⚠️警告を出し、本番ではその議案の処理を停止します。ただし<b>万能ではありません</b>。URL は提案を作った人の自己申告なので、捕まえられるのは「別の提案を取り違えて登録した」類の<b>事故</b>までで、偽の提案と対応表を同じ相手が同時に用意できる場合(登録係の鍵と作成プログラムが同時に乗っ取られた場合)は見抜けません。そこは備え 1・3・4 で受け止める設計です。</p>
442:<tr><th>もの</th><th>アドレス / URL</th></tr>

exec
/bin/bash -lc 'node --version && node --test --test-isolation=none' in /mnt/data/pnouns-voter/relayer-cf
 succeeded in 668ms:
[snapshot hub] network down
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): network down ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応表はオンチェーンに登録されていますが、対応する Snapshot 提案を取得できません。 ⏎ 安全側に停止しました(投函・集計の確定を行いません)。Snapshot ハブの障害か、提案が取得範囲より古い可能性があります。
[snap] prop 1: 対応する Snapshot 提案がハブで見つかりません
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[config] registrationDelayBlocks(5) が最低値 10 未満です
[notify] ⚠️ リレイヤーでエラーが発生しました(config): registrationDelayBlocks(5) が最低値 10 未満です ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。
[config] owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001)
[notify] ⚠️ リレイヤーでエラーが発生しました(config): owner/registrar/relayer に同一アドレスが含まれます (owner=0x2000000000000000000000000000000000000001 registrar=0x2000000000000000000000000000000000000001 relayer=0x2000000000000000000000000000000000000001) ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[worker] prop 1: backlog check failed: hub: votes count shape
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票がないか確認できません。 ⏎ テスト環境のため execute は続行します。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snapshot hub] hub graphql: [{"message":"boom"}]
[notify] ⚠️ リレイヤーでエラーが発生しました(snapshot hub): hub graphql: [{"message":"boom"}] ⏎ KV の 1 日上限(無料枠)や RPC 障害の可能性があります。Cloudflare のダッシュボード(Workers & Pages → KV Metrics)を確認してください。 ⏎ 上限到達中は署名の受付・投函が止まりますが、票は消えません。締切が近い提案は投票ページの「手動で execute」で救済できます。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
discord notify http 500
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
discord notify http 500
[notify] 🗳️ Prop 1: Snapshot の 1 票をオンチェーンに反映しました (gas 100000)。 ⏎ 現在の集計: 賛成 0 / 反対 0 / 棄権 0 (投票者 0/0/0 名) ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] ⚠️ Prop 1: 対応表の登録が遅すぎます。猶予明け(block 300)が締切(block 195)に間に合わず、票を投函できません。 ⏎ テスト環境のため処理は継続します。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] prop 1: registration delay not elapsed — retry next tick
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] drop vote 0x30000000: The contract function "castSnapshotVotes" reverted.
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。締切後の票は反映されない可能性があります。
[notify] 📢 Nouns Prop 1「T」の投票受付を開始しました。 ⏎ いつもどおり Snapshot から投票してください(ガス不要)。結果は自動で Nouns DAO に反映されます。 ⏎ 締切: 8/21 12:35 ごろ (block 195) ⏎ 投票: https://snapshot.box/#/s:earl-grey.eth/proposal/0xabababababababababababababababababababababababababababababababab ⏎ 提案の内容: https://nouns.wtf/vote/1
[snap] castSnapshotVotes prop 1 1 votes tx 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票が 2 名分残っています。 ⏎ 部分的な集計を最終結果にしないため、自動 execute を停止しました。票を確認のうえ、手動 execute で確定してください。
[notify] ⚠️ Prop 1: 締切時点で Nouns DAO に反映されていない票が 2 名分残っています。 ⏎ テスト環境のため execute は続行します。
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ℹ️ Prop 1: pNouns の投票がなかったため、Nouns DAO には投票しません。 ⏎ 提案の内容: https://nouns.wtf/vote/1
[notify] ⚠️ Prop 1: 対応付けられた Snapshot 提案が、この議案(nouns.wtf/vote/1)を参照していません。 ⏎ 対応付けが誤っている可能性があります。Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ mainnet は安全側に停止しました。登録を確認してください(票が入る前なら取り消して登録し直せます)。
[notify] ⚠️ Prop 1: Snapshot 終了後の排出時間が不足しています。mainnet は安全側に停止しました。設定を修正し、必要なら手動投函・executeしてください。
[notify] 📝 Prop 1: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。 ⏎ Snapshot: 0xabababababababababababababababababababababababababababababababab ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。
[notify] ⚠️ Prop 1: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。
[notify] ⚠️ Prop 1: 本議案を参照する Snapshot 提案の内容が、Nouns のオンチェーン本文から再計算した期待値と一致しないため、自動登録を保留しました。bot の作成内容を確認してください。
[notify] ⚠️ Prop 1: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 1 件)。
[register] prop 1: 候補 0xababababab の取得に失敗(スキップ): body too large
[notify] ⚠️ Prop 1: 候補 1 件を取得できず(サイズ超過など)検証をスキップしました。
[notify] 📝 Prop 1: 対応表を自動登録しました(登録係: Cloudflare)。内容一致(title/body/discussion/choices)と作成者・形式・期間を検証済み。 ⏎ Snapshot: 0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc ⏎ tx: https://sepolia.etherscan.io/tx/0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd
[notify] ⚠️ Prop 1: 本議案を参照する Snapshot 提案はありますが、形式・投票期間(残り時間を含む)の条件を満たさないため自動登録しません(候補 1 件)。
[notify] ⚠️ Prop 1: 内容が完全一致する Snapshot 提案が 2 件あり、一意に決められないため自動登録を保留しました。
[register] prop 1: 期待どおり登録済み(競合)
✔ mainnet: 受付締切はオンチェーン締切の 30 ブロック前 (0.710243ms)
✔ 受付締切以降(block >= acceptDeadline)は API 拒否・ワーカー即時投函モード (0.090691ms)
✔ 最小待機 + cron 間隔 が受付締切〜オンチェーン締切の間に収まる (0.114364ms)
✔ sepolia テスト設定でも受付窓が残る(投票期間 25 ブロック、margin 5) (0.072545ms)
✔ M-14R: 受付容量は残り tick × rushBatches × maxBatch。締切直前のバックログ 20/21/30/31 件 (0.125023ms)
✔ 受付締切より十分前なら容量は大きく、通常運用を妨げない(1 日前 ≈ 14,000 票) (0.090215ms)
✔ B3-M03R: Snapshot 終了後に cron + buffer の排出時間がなければ unsafe (0.077103ms)
✔ 同一秒に 21 票あっても、送れなかった票の手前で cursor が止まる (0.231364ms)
✔ 未解決票の後ろに反映済みの行があっても、cursor は追い越さない(部分 revert 対策) (0.066794ms)
✔ pNouns 未保有・デッドレターの票は skip 扱いで cursor を進めてよい (0.085232ms)
✔ やり直し(新しい timestamp)と補完(同 timestamp・token 増)を検出する (0.054747ms)
✔ すべて反映済みなら最大 created まで進む (0.035834ms)
✔ 指摘1R: 601 件を複数 tick の offset 走査で末尾まで取得して先頭へ戻る (10.167724ms)
✔ 指摘2: token を入れ替えた場合(保有数 < 計上数)でも補完対象として検出する (0.086969ms)
✔ 指摘3R: 補完用 token 照会は行数ではなく一意な tokenId 数に制限される (2.570668ms)
✔ 指摘2R: 同一 voter の候補は最新 1 件だけをバッチへ入れる (0.118745ms)
✔ 再登録した Snapshot 提案は別の scan offset を使う (0.062494ms)
✔ buildProposal が両実装で完全一致する (0.800192ms)
✔ 定数も一致する (0.063353ms)
✔ 正規の URL を検出する (0.350977ms)
✔ 前方一致で誤検出しない (0.068547ms)
✔ 別ドメイン・別パスを拒否する (0.053111ms)
✔ 空・null・不正な入力で例外を投げず false を返す (0.053126ms)
✔ 正規表現メタ文字を含む入力で壊れない (0.03558ms)
✔ URL の直後に句読点や日本語が続いても検出する (0.059891ms)
✔ 末尾処理で別 ID に化けない (0.039334ms)
✔ 改行で分断された URL は検出しない(仕様) (0.031768ms)
✔ 第12回監査の追加ケース (0.048031ms)
✔ ハブ障害: tick 全体が fail-closed(告知なし・KV 書き込みなし) (2.407167ms)
✔ ハブ正常 0 件 + オンチェーン登録済み = unresolved: 警告して当該提案を停止 (0.914281ms)
✔ linkOk=false: 警告し、テストネットでも告知はしない (0.592113ms)
✔ 告知は Discord 2xx の後にだけ記録される(失敗 → 次 tick で再送) (7.828847ms)
✔ mainnet: 猶予がコード下限 10 未満なら何もせず停止(ハブにも触れない) (0.352ms)
✔ mainnet: 猶予が運用値 10 ちょうどなら処理に進む (0.346716ms)
✔ mainnet: owner/registrar/relayer が同一なら停止 (0.280851ms)
✔ MIN_REGISTRATION_DELAY が不正値なら起動時に throw (0.292955ms)
✔ 空チェックのキャッシュ: sepolia は 30 分キャッシュ、毎 tick は再確認しない (0.672238ms)
✔ 締切後: 対応付け済みで票ゼロなら 'no votes' を確定し、未登録の提案は確定しない (0.878948ms)
✔ 第13回監査 High: 登録猶予中は投函せず、票を dead-letter に数えない (1.754517ms)
✔ ハブが GraphQL errors を返した場合も fail-closed (0.49031ms)
✔ 確定 tx 通知の失敗は pendingnotes に積まれ、次 tick で再送される (1.50612ms)
✔ 第14回監査: 猶予明けが締切に間に合わない登録は警告し、告知も抑止する (0.313413ms)
✔ 実投函: 票 1 件が simulate → writeContract → snapsent 保存まで通る (0.837278ms)
✔ 実投函: RegistrationTooRecent の revert は ABI で復号され、drop に数えない (1.407606ms)
✔ 実投函: 復号可能な恒久 revert(StaleVote)は drop に数える (0.875428ms)
✔ 猶予境界: block == eligibleAt では投函が始まる (0.568773ms)
✔ 第15回監査: 締切時に未反映の票が残っていれば mainnet は execute しない (0.846636ms)
✔ 第16回監査: mainnet で linkOk=false なら、解禁後に実票があっても投函しない (0.343014ms)
✔ 自動登録: 検証をすべて通過した提案だけを登録する (0.897762ms)
✔ 自動登録: 本文がオンチェーンの期待値と一致しなければ登録せず警告 (0.413608ms)
✔ 自動登録: title の不一致も拒否する (0.388907ms)
✔ 自動登録: choices の違いも拒否する(賛成/反対の入れ替え等) (0.376641ms)
✔ 自動登録: 正規 bot の候補が無ければ(GraphQL author 絞りで 0 件)登録も詳細取得もしない (0.234657ms)
✔ 自動登録: 残り投票時間が短すぎる候補は選別で落とす (0.304287ms)
✔ 自動登録: 詳細取得が失敗した候補はスキップし、走査を止めない (0.568027ms)
✔ 自動登録: 投票が終了した候補は選別で落とす (0.295638ms)
✔ 自動登録: 完全一致が 2 件あると曖昧として保留する (0.430935ms)
✔ 自動登録: 送信記録が新しい間は再送しない (0.343595ms)
✔ 自動登録(直接): AlreadyRegistered で期待どおりの登録なら静かに退く (0.467161ms)
✔ 自動登録(直接): AlreadyRegistered だが別 ID が登録済みなら高優先度で警告 (0.366039ms)
✔ nounsDescription: 空文字への更新イベントを最新値として扱う(第18回監査の中) (0.146992ms)
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 663.284575

exec
/bin/bash -lc 'git status --short; git rev-parse HEAD; git log -1 --oneline' in /mnt/data/pnouns-voter
 succeeded in 0ms:
2bc1ddce912aa782028433a63330f2a42a6bf6b3
2bc1ddc 第19回監査(Codex)対応: 自動登録の残存 4 件を修正、資料の照合記述を整合

codex
監査対象は clean な HEAD `2bc1ddce…`。結論は、必須 4 件のうち 4 はクローズ、2 は部分対応、1・3 は未クローズです。新たに一意性を fail-open にする欠陥も確認しました。

## 指摘事項

- [高] / [register.js:75](/mnt/data/pnouns-voter/relayer-cf/src/register.js:75)、[snap.js:77](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:77) / author 絞りを Hub の正しい動作だけに依存しています。応答に `author` を要求せずローカル再検証もしないため、Hub がフィルタを無視・部分適用すると、第三者の巨大 `discussion` による 64 KiB 超過が再発します。さらに完全一致の複製提案なら第三者 author の ID を自動登録できます。正規 bot 自身が巨大 `discussion` を作った場合も一覧応答全体が失敗します。Snapshot の公式資料は柔軟な GraphQL クエリを説明していますが、フィルタ障害時の安全性は保証していないため、セキュリティ境界にはできません。[Snapshot API documentation](https://github.com/snapshot-labs/snapshot-docs/blob/master/tools/api/README.md) / 一覧は `id`・`author` 等の固定長フィールドだけにし、`author` をローカル再検証した後、候補を個別取得してください。個別取得失敗は候補単位で扱えます。

- [高] / [register.js:104](/mnt/data/pnouns-voter/relayer-cf/src/register.js:104)、[worker-tick.test.mjs:485](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:485) / 詳細取得できない候補があっても、別の 1 件が一致すれば登録します。失敗理由はサイズ超過だけでなく timeout、HTTP 障害、rate limit もあり、スキップ候補も完全一致だった可能性を排除できません。現テストはこの危険な登録を正しい期待値として固定しています。`proposal:null` も `skipped` に数えられていません / screened 候補を 1 件でも検証不能なら登録を保留してください。少なくとも「skipped + 1 match」「null + 1 match」は登録ゼロを期待するテストに変更すべきです。

- [高] / [register.js:77](/mnt/data/pnouns-voter/relayer-cf/src/register.js:77) / 一覧がちょうど 100 件で `refs.length === 1` の場合、その 1 件を登録します。しかし 101 件目以降に同じ Nouns ID・同じ内容の候補がないことは確認できません。`refs.length > 1` の条件は一意性証明になっていません。候補が範囲外にもあれば投票が複数ページに分裂し、選ばれなかった提案の票が失われます / 100 件到達時は候補数にかかわらず保留するか、ページングして末尾まで確認し、設定した絶対上限へ到達した場合は fail-closed にしてください。

- [中] / [snap.js:79](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:79)、[chain.js:32](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:32) / `SNAPSHOT_BOT` は `AUTO_REGISTER=1` の場合だけ必須です。したがって、自動登録を無効にした既存 Snapshot 運用では `authorFilter=""` となり、resolveMappings の 64 KiB DoS は残ります。一方、設定されている場合は、過去に別 author が作成してオンチェーン登録された正当な提案も 20/200 件検索から消え、`unresolved` として停止します。現行 Sepolia の `wrangler.toml` には bot が設定されているため「未設定経路」は現在のデプロイ設定には該当しません / Snapshot モード全体で必須化するか、既存対応表の解決は author に依存せず `ProposalRegistered` イベントの文字列から ID を復元してください。ライブ前に稼働中の既存登録すべての author を照合する必要があります。

- [中] / [register.js:87](/mnt/data/pnouns-voter/relayer-cf/src/register.js:87)、[16-cf-registrar-e2e.js:39](/mnt/data/pnouns-voter/scripts/sepolia/16-cf-registrar-e2e.js:39) / `start` が未来の候補と `single-choice` 以外は正しく拒否されます。しかし `snapshot` block、network、strategies/validation は取得も検証もしません。これらはコントラクト上の票の重みを直接改ざんしませんが、Hub/UI 上で誰が投票できるか、表示される voting power を壊し、投票不能を起こせます。Snapshot 公式資料でも voting strategy が投票力を決めると説明されています。[Snapshot settings documentation](https://github.com/snapshot-labs/snapshot-docs/blob/master/user-guides/spaces/settings.md) / snapshot block の妥当性・確定深度と、期待する space/network/strategy/validation を検証してください。

- [中] / [register.js:89](/mnt/data/pnouns-voter/relayer-cf/src/register.js:89)、[member-proposal-unified.html:400](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:400) / `cron + buffer + 300秒` は通常の mainnet 想定では余裕がありますが、実際の登録猶予ブロックやブロック生成遅延から導出されておらず、形式的保証ではありません。また Sepolia DAO は pending 3 + voting 25 ブロックなのに、登録条件は残り 480 秒超を要求し、`snapshotTimelineSafe` は Nouns 締切の180秒前までの終了を要求します。約12秒/ブロックなら両方を同時に満たす提案は作れません。ライブ E2E は Snapshot を2日間に設定し、Sepolia では timeline 警告後も処理を継続するため、production 相当の安全な時間関係を検証できません / 最小残時間を実際の `registrationDelayBlocks` と必要 tick 数から計算し、Sepolia E2E には整合する専用時間設定または長い投票期間のテスト DAO を使用してください。

## 問題なし・クローズできる項目

- [問題なし] / [register.js:135](/mnt/data/pnouns-voter/relayer-cf/src/register.js:135)、[PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179) / `keccak256(stringToBytes(snapId))` は UTF-8 バイト列の keccak256 で、Solidity の `keccak256(bytes(snapshotProposal))` と一致します。`nounsToSnap` に保存される値も同じ `h` です。期待値一致なら静かに終了し、不一致・読取失敗なら警告する実装は正しいです。

- [問題なし・軽微な注記] / [register.js:129](/mnt/data/pnouns-voter/relayer-cf/src/register.js:129) / `regsent2` の3日 TTL は、提案当たり1キーなので通常の KV 容量・書込予算への影響は軽微です。古い成功記録も10分経過後に receipt を確認して削除され、再登録を恒久阻害しません。ただし成功後は autoRegister が呼ばれなくなるためキーは3日残り得ます。また「提案期間以上」というコメントは、コードが最大8日を許すことと一致しません。

- [問題なし] / [member-proposal-unified.html:281](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:281)、[snap.js:111](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:111) / 資料の明示的な説明は `discussion` のみを照合する現実装と一致しました。§10 には対応付け照合の具体的な検証手順自体がないため、誤記はありませんが「検証パックを訂正した」というコミット説明は確認できませんでした。

## テスト結果と不足

`relayer-cf` で指定どおり実行しました。

```text
$ npm test
✔ test/accept-deadline.test.mjs
✔ test/cursor.test.mjs
✔ test/format-equivalence.test.mjs
✔ test/link-check.test.mjs
✔ test/worker-tick.test.mjs
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

Node v24 の既定分離表示では5ファイル単位になるため、追加で `node --test --test-isolation=none` を実行し、個別ケースも確認しました。

```text
ℹ tests 61
ℹ pass 61
ℹ fail 0
ℹ duration_ms 663.284575
```

ただし次は未カバーです。

- author フィルタ無視・誤author混入・`SNAPSHOT_BOT` 未設定・過去の別author登録
- bot/攻撃者の巨大 `discussion` による一覧応答64 KiB超過
- 6件以上の screened 候補、100件・101件境界
- 詳細取得失敗または `null` と完全一致候補の混在
- start未来、残り時間の等号境界、負値の `CRON_SEC` / `SUBMIT_BUFFER_SEC`
- snapshot block、network、strategies/validation
- TTLオプション、3日経過、成功tx後の取消・再登録、登録txのreorg
- Sepolia上で timeline-safe な自動登録→猶予→投函→execute

## 最終判定

**Sepolia ライブテストへ進んではいけません（不可）。**

最低限、以下を修正・テストしてからです。

1. 一覧100件到達・詳細1件でも検証不能なら登録を保留する。
2. 固定長一覧＋ローカルauthor検証にし、Hub author フィルタを信用境界から外す。
3. 既存の別author対応表を壊さない解決方式と移行チェックを用意する。
4. Sepoliaで production 相当の timeline-safe 条件を満たすE2E構成にする。

特に現テストの「詳細取得をスキップしても別候補を登録」は、第19回の一意性要件と正反対なので、現状の61 passはクローズ根拠になりません。
tokens used
123,764
監査対象は clean な HEAD `2bc1ddce…`。結論は、必須 4 件のうち 4 はクローズ、2 は部分対応、1・3 は未クローズです。新たに一意性を fail-open にする欠陥も確認しました。

## 指摘事項

- [高] / [register.js:75](/mnt/data/pnouns-voter/relayer-cf/src/register.js:75)、[snap.js:77](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:77) / author 絞りを Hub の正しい動作だけに依存しています。応答に `author` を要求せずローカル再検証もしないため、Hub がフィルタを無視・部分適用すると、第三者の巨大 `discussion` による 64 KiB 超過が再発します。さらに完全一致の複製提案なら第三者 author の ID を自動登録できます。正規 bot 自身が巨大 `discussion` を作った場合も一覧応答全体が失敗します。Snapshot の公式資料は柔軟な GraphQL クエリを説明していますが、フィルタ障害時の安全性は保証していないため、セキュリティ境界にはできません。[Snapshot API documentation](https://github.com/snapshot-labs/snapshot-docs/blob/master/tools/api/README.md) / 一覧は `id`・`author` 等の固定長フィールドだけにし、`author` をローカル再検証した後、候補を個別取得してください。個別取得失敗は候補単位で扱えます。

- [高] / [register.js:104](/mnt/data/pnouns-voter/relayer-cf/src/register.js:104)、[worker-tick.test.mjs:485](/mnt/data/pnouns-voter/relayer-cf/test/worker-tick.test.mjs:485) / 詳細取得できない候補があっても、別の 1 件が一致すれば登録します。失敗理由はサイズ超過だけでなく timeout、HTTP 障害、rate limit もあり、スキップ候補も完全一致だった可能性を排除できません。現テストはこの危険な登録を正しい期待値として固定しています。`proposal:null` も `skipped` に数えられていません / screened 候補を 1 件でも検証不能なら登録を保留してください。少なくとも「skipped + 1 match」「null + 1 match」は登録ゼロを期待するテストに変更すべきです。

- [高] / [register.js:77](/mnt/data/pnouns-voter/relayer-cf/src/register.js:77) / 一覧がちょうど 100 件で `refs.length === 1` の場合、その 1 件を登録します。しかし 101 件目以降に同じ Nouns ID・同じ内容の候補がないことは確認できません。`refs.length > 1` の条件は一意性証明になっていません。候補が範囲外にもあれば投票が複数ページに分裂し、選ばれなかった提案の票が失われます / 100 件到達時は候補数にかかわらず保留するか、ページングして末尾まで確認し、設定した絶対上限へ到達した場合は fail-closed にしてください。

- [中] / [snap.js:79](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:79)、[chain.js:32](/mnt/data/pnouns-voter/relayer-cf/src/chain.js:32) / `SNAPSHOT_BOT` は `AUTO_REGISTER=1` の場合だけ必須です。したがって、自動登録を無効にした既存 Snapshot 運用では `authorFilter=""` となり、resolveMappings の 64 KiB DoS は残ります。一方、設定されている場合は、過去に別 author が作成してオンチェーン登録された正当な提案も 20/200 件検索から消え、`unresolved` として停止します。現行 Sepolia の `wrangler.toml` には bot が設定されているため「未設定経路」は現在のデプロイ設定には該当しません / Snapshot モード全体で必須化するか、既存対応表の解決は author に依存せず `ProposalRegistered` イベントの文字列から ID を復元してください。ライブ前に稼働中の既存登録すべての author を照合する必要があります。

- [中] / [register.js:87](/mnt/data/pnouns-voter/relayer-cf/src/register.js:87)、[16-cf-registrar-e2e.js:39](/mnt/data/pnouns-voter/scripts/sepolia/16-cf-registrar-e2e.js:39) / `start` が未来の候補と `single-choice` 以外は正しく拒否されます。しかし `snapshot` block、network、strategies/validation は取得も検証もしません。これらはコントラクト上の票の重みを直接改ざんしませんが、Hub/UI 上で誰が投票できるか、表示される voting power を壊し、投票不能を起こせます。Snapshot 公式資料でも voting strategy が投票力を決めると説明されています。[Snapshot settings documentation](https://github.com/snapshot-labs/snapshot-docs/blob/master/user-guides/spaces/settings.md) / snapshot block の妥当性・確定深度と、期待する space/network/strategy/validation を検証してください。

- [中] / [register.js:89](/mnt/data/pnouns-voter/relayer-cf/src/register.js:89)、[member-proposal-unified.html:400](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:400) / `cron + buffer + 300秒` は通常の mainnet 想定では余裕がありますが、実際の登録猶予ブロックやブロック生成遅延から導出されておらず、形式的保証ではありません。また Sepolia DAO は pending 3 + voting 25 ブロックなのに、登録条件は残り 480 秒超を要求し、`snapshotTimelineSafe` は Nouns 締切の180秒前までの終了を要求します。約12秒/ブロックなら両方を同時に満たす提案は作れません。ライブ E2E は Snapshot を2日間に設定し、Sepolia では timeline 警告後も処理を継続するため、production 相当の安全な時間関係を検証できません / 最小残時間を実際の `registrationDelayBlocks` と必要 tick 数から計算し、Sepolia E2E には整合する専用時間設定または長い投票期間のテスト DAO を使用してください。

## 問題なし・クローズできる項目

- [問題なし] / [register.js:135](/mnt/data/pnouns-voter/relayer-cf/src/register.js:135)、[PNounsSnapVoter.sol:179](/mnt/data/pnouns-voter/contracts/PNounsSnapVoter.sol:179) / `keccak256(stringToBytes(snapId))` は UTF-8 バイト列の keccak256 で、Solidity の `keccak256(bytes(snapshotProposal))` と一致します。`nounsToSnap` に保存される値も同じ `h` です。期待値一致なら静かに終了し、不一致・読取失敗なら警告する実装は正しいです。

- [問題なし・軽微な注記] / [register.js:129](/mnt/data/pnouns-voter/relayer-cf/src/register.js:129) / `regsent2` の3日 TTL は、提案当たり1キーなので通常の KV 容量・書込予算への影響は軽微です。古い成功記録も10分経過後に receipt を確認して削除され、再登録を恒久阻害しません。ただし成功後は autoRegister が呼ばれなくなるためキーは3日残り得ます。また「提案期間以上」というコメントは、コードが最大8日を許すことと一致しません。

- [問題なし] / [member-proposal-unified.html:281](/mnt/data/pnouns-voter/docs/member-proposal-unified.html:281)、[snap.js:111](/mnt/data/pnouns-voter/relayer-cf/src/snap.js:111) / 資料の明示的な説明は `discussion` のみを照合する現実装と一致しました。§10 には対応付け照合の具体的な検証手順自体がないため、誤記はありませんが「検証パックを訂正した」というコミット説明は確認できませんでした。

## テスト結果と不足

`relayer-cf` で指定どおり実行しました。

```text
$ npm test
✔ test/accept-deadline.test.mjs
✔ test/cursor.test.mjs
✔ test/format-equivalence.test.mjs
✔ test/link-check.test.mjs
✔ test/worker-tick.test.mjs
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

Node v24 の既定分離表示では5ファイル単位になるため、追加で `node --test --test-isolation=none` を実行し、個別ケースも確認しました。

```text
ℹ tests 61
ℹ pass 61
ℹ fail 0
ℹ duration_ms 663.284575
```

ただし次は未カバーです。

- author フィルタ無視・誤author混入・`SNAPSHOT_BOT` 未設定・過去の別author登録
- bot/攻撃者の巨大 `discussion` による一覧応答64 KiB超過
- 6件以上の screened 候補、100件・101件境界
- 詳細取得失敗または `null` と完全一致候補の混在
- start未来、残り時間の等号境界、負値の `CRON_SEC` / `SUBMIT_BUFFER_SEC`
- snapshot block、network、strategies/validation
- TTLオプション、3日経過、成功tx後の取消・再登録、登録txのreorg
- Sepolia上で timeline-safe な自動登録→猶予→投函→execute

## 最終判定

**Sepolia ライブテストへ進んではいけません（不可）。**

最低限、以下を修正・テストしてからです。

1. 一覧100件到達・詳細1件でも検証不能なら登録を保留する。
2. 固定長一覧＋ローカルauthor検証にし、Hub author フィルタを信用境界から外す。
3. 既存の別author対応表を壊さない解決方式と移行チェックを用意する。
4. Sepoliaで production 相当の timeline-safe 条件を満たすE2E構成にする。

特に現テストの「詳細取得をスキップしても別候補を登録」は、第19回の一意性要件と正反対なので、現状の61 passはクローズ根拠になりません。
