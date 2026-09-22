import test from "node:test";
import assert from "node:assert/strict";
import { rpcUrls, rpcTransport } from "../src/chain.js";

test("RPC_URL はカンマ区切りで複数指定でき、空白と空要素は無視する", () => {
  assert.deepEqual(rpcUrls("https://a.example/v3/k , https://eth.drpc.org,, "), ["https://a.example/v3/k", "https://eth.drpc.org"]);
  assert.deepEqual(rpcUrls("https://a.example"), ["https://a.example"]);
});

test("1 本なら http、2 本以上なら fallback トランスポートになる(どちらもバッチ無効)", () => {
  const one = rpcTransport({ rpcUrl: "https://a.example" })({ chain: undefined });
  assert.equal(one.config.type, "http");
  assert.equal(one.value?.url, "https://a.example");
  const rd = rpcTransport({ rpcUrl: "https://a.example,https://b.example" }, "read")({ chain: undefined });
  assert.equal(rd.value.transports[0].value.url, "https://b.example", "読み取りは 2 本目以降を先に使う");
  const two = rpcTransport({ rpcUrl: "https://a.example,https://b.example" })({ chain: undefined });
  assert.equal(two.config.type, "fallback");
  assert.equal(two.value.transports.length, 2);
  assert.equal(two.config.retryCount, 4);
});
