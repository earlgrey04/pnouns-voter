// tick() の状態遷移テスト(第11回監査 指摘7・第12回監査の残課題)。
// 方針: clients() のみ差し替え、KV は偽の env.STATE、Discord/Snapshot ハブは fetch の mock で応答する。
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { keccak256, stringToBytes, parseEther } from "viem";
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
  };
}

// ---- fetch mock: ハブと Discord を演じる ----
const F = { hub: [], discordStatus: 200, discordBodies: [], hubCalls: 0 };
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

beforeEach(() => { F.hub = []; F.discordStatus = 200; F.discordBodies = []; F.hubCalls = 0; __setClientsForTests(null); });

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

test("mainnet: 猶予がコード下限 300 未満なら何もせず停止(ハブにも触れない)", async () => {
  const { env } = setup(handlers({ registrationDelayBlocks: () => 100n }), {
    NETWORK: "mainnet", PNOUNS: "0x4bE962499cE295b1ed180F923bf9c73b6357DE80",
    NOUNS_DAO: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d", NOUNS_TOKEN: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
    MIN_REGISTRATION_DELAY: "0", // 環境変数で下げても Math.max(300, …) が効くことの確認
  });
  await tick(env);
  assert.ok(F.discordBodies.some((b) => b.includes("最低値")), "設定エラー通知");
  assert.equal(F.hubCalls, 0, "ハブに到達しない");
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
  // ケース A: 猶予中(eligibleAt=300 > block=100) → 対応付け解決後、票の取得にすら行かない
  {
    const { kv, env } = setup(handlers({ eligibleAtBlock: () => 300n }), {}, wallet);
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
