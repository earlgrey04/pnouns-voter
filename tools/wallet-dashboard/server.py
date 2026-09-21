#!/usr/bin/env python3
"""pNouns Voter ウォレット管理ダッシュボード(標準ライブラリのみ)。

シャドー運用(mainnet)とテスト(Sepolia)の各ウォレット/コントラクトについて、
ETH 残高・pNouns 保有(枚数と tokenId)・コントラクト設定・Worker の稼働状況を一覧する。
127.0.0.1:8415 で待ち受け、tailscale serve で tailnet にだけ公開する。
設定は wallets.json。mainnet の RPC URL は ~/.config/pnouns-voter/mainnet-rpc.url(無ければ公開 RPC)。
"""
import html
import json
import os
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "wallets.json"), encoding="utf-8"))
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8415"))
CACHE_SEC = int(os.environ.get("CACHE_SEC", "120"))
RPC_TIMEOUT = 8
# Python 既定の UA(Python-urllib)は Cloudflare 配下の公開 RPC や自前 Worker に 403 で弾かれる
UA = "Mozilla/5.0 (compatible; pnouns-wallet-dashboard/1.0)"

SEL = {  # 関数セレクタ(ethers.id で算出済み)
    "balanceOf(address)": "0x70a08231",
    "totalSupply()": "0x18160ddd",
    "liveMode()": "0x900ba33b",
    "refundEnabled()": "0x4c4a386f",
    "refundCapPerProposal()": "0x825ed502",
    "registrar()": "0x2b20e397",
    "owner()": "0x8da5cb5b",
    "marginBlocks()": "0x0bc145c7",
    "registrationDelayBlocks()": "0x63a6fbf4",
    "getCurrentVotes(address)": "0xb4b5ea57",
    "proposalCount()": "0xda35c664",
    "delegates(address)": "0x587cde1e",
}


def pad_addr(a):
    return a.lower().replace("0x", "").rjust(64, "0")


def rpc_urls(net):
    urls = list(net.get("rpcFallback", []))  # 公開 RPC を先に(Infura の日次クレジットを温存)
    env = os.environ.get(f"{net['id'].upper()}_RPC_URL")
    if env:
        urls.append(env)
    f = net.get("rpcFileUrl")
    if f:
        p = os.path.expanduser(f)
        if os.path.exists(p):
            u = open(p, encoding="utf-8").read().strip()
            if u:
                urls.append(u)
    return urls


def rpc(net, method, params):
    last = None
    for u in rpc_urls(net):
        try:
            body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
            req = urllib.request.Request(u, data=body, headers={"content-type": "application/json", "user-agent": UA})
            with urllib.request.urlopen(req, timeout=RPC_TIMEOUT) as r:
                d = json.loads(r.read().decode())
            if "error" in d:
                raise RuntimeError(d["error"].get("message", str(d["error"])))
            return d["result"]
        except Exception as e:  # 次の URL へ
            last = e
    raise RuntimeError(f"{method}: all RPC failed: {last}")


def eth_call(net, to, sel, arg_addr=None):
    data = SEL[sel] + (pad_addr(arg_addr) if arg_addr else "")
    return rpc(net, "eth_call", [{"to": to, "data": data}, "latest"])


def as_int(h):
    return int(h, 16) if h and h != "0x" else 0


def as_addr(h):
    return "0x" + h[-40:] if h and len(h) >= 42 else None


def to_eth(wei):
    return wei / 1e18


def http_json(url, timeout=25):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"user-agent": UA}), timeout=timeout) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"_error": str(e)[:120]}


def collect_network(net):
    out = {"id": net["id"], "name": net["name"], "explorer": net["explorer"], "errors": [], "wallets": [], "contract": {}}
    c = net["contracts"]
    try:
        out["block"] = as_int(rpc(net, "eth_blockNumber", []))
        out["gasGwei"] = as_int(rpc(net, "eth_gasPrice", [])) / 1e9
    except Exception as e:
        out["errors"].append(f"RPC: {e}")
        return out
    # コントラクト設定
    try:
        v = c["voter"]
        out["contract"] = {
            "address": v,
            "liveMode": as_int(eth_call(net, v, "liveMode()")) == 1,
            "refundEnabled": as_int(eth_call(net, v, "refundEnabled()")) == 1,
            "refundCapEth": to_eth(as_int(eth_call(net, v, "refundCapPerProposal()"))),
            "registrar": as_addr(eth_call(net, v, "registrar()")),
            "owner": as_addr(eth_call(net, v, "owner()")),
            "marginBlocks": as_int(eth_call(net, v, "marginBlocks()")),
            "registrationDelayBlocks": as_int(eth_call(net, v, "registrationDelayBlocks()")),
            "nounsProposalCount": as_int(eth_call(net, c["nounsDAO"], "proposalCount()")),
            "pnounsTotalSupply": as_int(eth_call(net, c["pnouns"], "totalSupply()")),
        }
    except Exception as e:
        out["errors"].append(f"contract: {e}")
    # Worker の状態
    w = net.get("worker")
    if w:
        out["worker"] = {"url": w, "health": http_json(f"{w}/api/health", 15)}
    # 各ウォレット(並列)
    def one(wl):
        row = dict(wl)
        a = wl["address"]
        try:
            row["eth"] = to_eth(as_int(rpc(net, "eth_getBalance", [a, "latest"])))
        except Exception as e:
            row["ethError"] = str(e)[:80]
        try:
            row["pnouns"] = as_int(eth_call(net, c["pnouns"], "balanceOf(address)", a))
        except Exception as e:
            row["pnounsError"] = str(e)[:80]
        if wl.get("nounsVotes"):
            try:
                row["nounsVotesHeld"] = as_int(eth_call(net, c["nounsToken"], "getCurrentVotes(address)", a))
            except Exception as e:
                row["nounsVotesError"] = str(e)[:80]
        # tokenId は Worker の所有者キャッシュから(best-effort)
        if w and net.get("tokensFromWorker", True) and row.get("pnouns"):
            t = http_json(f"{w}/api/tokens/{a}", 20)
            if isinstance(t, dict) and isinstance(t.get("tokenIds"), list):
                row["tokenIds"] = t["tokenIds"]
        try:
            code = rpc(net, "eth_getCode", [a, "latest"])
            row["isContract"] = code not in ("0x", "")
        except Exception:
            pass
        row["warn"] = bool(wl.get("warnBelow") is not None and row.get("eth") is not None and row["eth"] < wl["warnBelow"])
        row["pnounsWarn"] = bool(wl.get("needPnouns") and (row.get("pnouns") or 0) < wl["needPnouns"])
        return row
    with ThreadPoolExecutor(max_workers=6) as ex:
        out["wallets"] = list(ex.map(one, net["wallets"]))
    return out


_cache = {"at": 0, "data": None, "busy": False}
_lock = threading.Lock()
_wake = threading.Event()


def collect_all():
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=len(CFG["networks"])) as ex:
        nets = list(ex.map(collect_network, CFG["networks"]))
    data = {"title": CFG.get("title", "wallets"), "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S %Z"), "networks": nets}
    data["elapsedSec"] = round(time.time() - t0, 1)
    return data


def refresher():
    # 起動直後に 1 回、その後は CACHE_SEC ごと(?refresh=1 で即時)に取得。ページ応答は常にキャッシュから返す
    while True:
        try:
            with _lock:
                _cache["busy"] = True
            data = collect_all()
            with _lock:
                _cache.update(at=time.time(), data=data, busy=False)
        except Exception as e:
            sys.stderr.write(f"refresh failed: {e}\n")
            with _lock:
                _cache["busy"] = False
        _wake.wait(CACHE_SEC)
        _wake.clear()


def get_state(force=False):
    if force:
        _wake.set()
    with _lock:
        return _cache["data"]


def fmt_eth(v):
    return "—" if v is None else f"{v:.5f}"


def short(a):
    return f"{a[:6]}…{a[-4:]}"


def render(data):
    e = html.escape
    parts = [f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(data['title'])}</title>
<style>
:root{{--bg:#f6f7f9;--fg:#1c1f26;--muted:#6b7280;--card:#fff;--line:#e5e7eb;--warn:#b45309;--warnbg:#fef3c7;--ok:#047857;--okbg:#d1fae5;--bad:#b91c1c;--badbg:#fee2e2;--link:#1d4ed8}}
@media(prefers-color-scheme:dark){{:root{{--bg:#0f1115;--fg:#e5e7eb;--muted:#9ca3af;--card:#171a21;--line:#2a2f3a;--warnbg:#3b2a08;--warn:#fbbf24;--okbg:#0b3b2e;--ok:#34d399;--badbg:#3f1212;--bad:#f87171;--link:#93c5fd}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:16px}}
h1{{font-size:20px;margin:0 0 4px}} h2{{font-size:16px;margin:24px 0 8px}} .sub{{color:var(--muted);font-size:12px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:10px 0;overflow-x:auto}}
table{{border-collapse:collapse;width:100%;min-width:720px}} th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}} th{{font-weight:600;color:var(--muted);font-size:12px;white-space:nowrap}}
td.num{{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}} th.num{{text-align:right}}
.tag{{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;background:var(--line);color:var(--fg)}}
.warn{{background:var(--warnbg);color:var(--warn);font-weight:600}} .bad{{background:var(--badbg);color:var(--bad);font-weight:600}} .ok{{background:var(--okbg);color:var(--ok)}}
a{{color:var(--link);text-decoration:none}} code{{font-size:12px}} .addr{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:nowrap}}
.note{{color:var(--muted);font-size:12px}} .kv{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 16px;font-size:13px}} .kv b{{color:var(--muted);font-weight:500;margin-right:6px}}
button{{font:inherit;font-size:11px;padding:1px 6px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--fg);cursor:pointer}}
</style></head><body><main>
<h1>{e(data['title'])}</h1>
<div class="sub">更新: {e(data['generatedAt'])}(取得 {data['elapsedSec']} 秒、2 分キャッシュ、2 分ごとに自動再読込) ・ <a href="/api/state">JSON</a> ・ <a href="/?refresh=1">今すぐ再取得</a></div>"""]
    for n in data["networks"]:
        ex = n["explorer"]
        parts.append(f"<h2>{e(n['name'])}</h2>")
        if n.get("errors"):
            parts.append('<div class="card bad">' + "<br>".join(e(x) for x in n["errors"]) + "</div>")
        ct = n.get("contract") or {}
        wk = (n.get("worker") or {}).get("health") or {}
        hb = wk.get("lastTick") if isinstance(wk, dict) else None
        stale = wk.get("stale") if isinstance(wk, dict) else None
        hbcls = "ok" if hb and not stale else ("warn" if hb else "bad")
        parts.append('<div class="card"><div class="kv">')
        if "block" in n:
            parts.append(f"<div><b>block</b>{n['block']:,}</div><div><b>gas</b>{n.get('gasGwei', 0):.3f} gwei</div>")
        if ct:
            parts.append(f"<div><b>liveMode</b><span class=\"tag {'bad' if ct['liveMode'] else 'ok'}\">{'true(本投票)' if ct['liveMode'] else 'false(シャドー)'}</span></div>")
            parts.append(f"<div><b>払い戻し</b>{'有効' if ct['refundEnabled'] else '無効'} / 上限 {ct['refundCapEth']:.3f} ETH/提案</div>")
            parts.append(f"<div><b>marginBlocks</b>{ct['marginBlocks']:,}(約 {ct['marginBlocks']*12/3600:.1f} h)</div><div><b>登録猶予</b>{ct['registrationDelayBlocks']} ブロック</div>")
            parts.append(f"<div><b>registrar</b><span class=\"addr\">{short(ct['registrar'])}</span></div><div><b>owner</b><span class=\"addr\">{short(ct['owner'])}</span></div>")
            parts.append(f"<div><b>Nouns 提案数</b>{ct['nounsProposalCount']}</div><div><b>pNouns 総供給</b>{ct['pnounsTotalSupply']:,}</div>")
        if n.get("worker"):
            if hb:
                wtxt = f"最終 tick {e(str(hb))}(age {wk.get('ageSec')} s)"
            elif isinstance(wk, dict) and wk.get("_error"):
                wtxt = f"取得不可: {e(str(wk['_error']))}"
            else:
                wtxt = "cron 停止中(ハートビート無し)"
            parts.append(f"<div><b>Worker</b><span class=\"tag {hbcls}\">{'停止中' if stale else '稼働'}</span> {wtxt} <a href=\"{e(n['worker']['url'])}\" target=\"_blank\">投票ページ</a></div>")
        parts.append("</div></div>")
        parts.append('<div class="card"><table><thead><tr><th>役割</th><th>アドレス</th><th class="num">ETH</th><th class="num">推奨</th><th class="num">pNouns</th><th>tokenId / 備考</th></tr></thead><tbody>')
        for w in n["wallets"]:
            ethv = w.get("eth")
            cls = "bad" if (w["warn"] and ethv is not None and ethv < (w.get("warnBelow") or 0) / 2) else ("warn" if w["warn"] else "")
            pcls = "warn" if w.get("pnounsWarn") else ""
            ids = w.get("tokenIds")
            idtxt = ""
            if ids:
                idtxt = "tokenId: " + ", ".join(str(i) for i in ids[:40]) + (f" …(+{len(ids)-40})" if len(ids) > 40 else "")
            note = w.get("note", "")
            kind = "コントラクト" if w.get("isContract") else "EOA"
            nv = ""
            if "nounsVotesHeld" in w:
                nv = f'<div class="note">Nouns 投票権(委任含む): {w["nounsVotesHeld"]}</div>'
            rec = w.get("recommend")
            parts.append(
                f"<tr><td><div>{e(w['label'])}</div><span class=\"tag\">{kind}</span></td>"
                f"<td><span class=\"addr\"><a href=\"{ex}/address/{w['address']}\" target=\"_blank\">{w['address']}</a></span> <button onclick=\"navigator.clipboard.writeText('{w['address']}')\">copy</button></td>"
                f"<td class=\"num {cls}\">{fmt_eth(ethv)}{'<br><span class=note>' + e(w['ethError']) + '</span>' if w.get('ethError') else ''}</td>"
                f"<td class=\"num note\">{('≥ ' + str(w.get('warnBelow'))) if w.get('warnBelow') is not None else ''}{('<br>→ ' + str(rec)) if rec else ''}</td>"
                f"<td class=\"num {pcls}\">{w.get('pnouns', '—')}{(' / 要 ' + str(w['needPnouns'])) if w.get('needPnouns') else ''}</td>"
                f"<td><div class=\"note\">{e(idtxt)}</div>{nv}<div class=\"note\">{e(note)}</div></td></tr>"
            )
        parts.append("</tbody></table></div>")
    parts.append("""<div class="sub" style="margin-top:20px">ETH の列: 黄 = 警告閾値未満、赤 = 閾値の半分未満。「推奨」は警告閾値と補充後の目安。pNouns の列が黄 = 作成条件(1 枚以上)未達。</div>
<script>setTimeout(function(){location.replace('/')},120000)</script></main></body></html>""")
    return "".join(parts)


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code, body, ctype):
        b = body.encode("utf-8")
        self.send_response(code)
        self.send_header("content-type", ctype)
        self.send_header("content-length", str(len(b)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = self.path.split("?")[0]
        force = "refresh=1" in self.path
        try:
            if path == "/healthz":
                return self._send(200, "ok", "text/plain")
            data = get_state(force)
            if path == "/api/state":
                return self._send(200 if data else 503, json.dumps(data or {"status": "collecting"}, ensure_ascii=False, indent=1), "application/json; charset=utf-8")
            if path == "/":
                if not data:
                    return self._send(200, '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="5"><p style="font:16px system-ui;padding:24px">初回のデータ取得中です(最大 1 分ほど)。自動で再表示します…</p>', "text/html; charset=utf-8")
                return self._send(200, render(data), "text/html; charset=utf-8")
            return self._send(404, "not found", "text/plain")
        except Exception as ex:
            return self._send(500, f"error: {html.escape(str(ex))}", "text/plain; charset=utf-8")


if __name__ == "__main__":
    threading.Thread(target=refresher, daemon=True).start()
    srv = ThreadingHTTPServer((HOST, PORT), H)
    print(f"wallet dashboard on http://{HOST}:{PORT}", flush=True)
    srv.serve_forever()
