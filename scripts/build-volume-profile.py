#!/usr/bin/env python3
"""지도 "대금" 모드용 시간대별 거래대금 기준선(data/volume-profile.json)을 만든다.

대금 모드는 "오늘 지금까지의 거래대금"을 "직전 20거래일 평균의, 같은 시각까지의 누적 거래대금"과 비교한다(장중에는 시간 단위로).
그 기준선을 종목마다 미리 계산해 두는 스크립트 — 야후 1시간봉(최근 2개월)에서 거래일별 "장 시작 후 N시간까지 누적 거래대금"을 구하고
직전 20거래일 평균을 낸다.

저장 형식(data/volume-profile.json):
  asOf: {kr, us, crypto}  시장별로 이 파일에 들어간 마지막 거래일(현지 날짜)
  v:    {심볼: [ex, incl]}  ex = asOf 당일을 뺀 직전 20거래일 평균 누적값, incl = asOf 당일까지 포함한 최근 20거래일 평균 누적값
        (배열 한 칸 = 장 시작 후 60분 단위 누적 거래대금. 한국·미국 7칸(마지막은 장 마감까지 390분), 코인 24칸)
클라이언트(sector-map/app.js)가 오늘 날짜가 asOf와 같으면 ex, 아니면 incl을 골라 지금 시각까지의 기준값을 보간한다.

실행: python scripts/build-volume-profile.py  (GitHub Actions volume-profile-daily.yml이 평일 22:30 UTC에 실행)
"""
import json
import math
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MAP_DATA = os.path.join(ROOT, "sector-map", "data")
OUT = os.path.join(ROOT, "data", "volume-profile.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

WINDOW = 20  # 직전 20거래일
SESSION = {"kr": (540, 390), "us": (570, 390), "crypto": (0, 1440)}  # (장 시작 분, 장 길이 분)


def kind_of(sym):
    if sym.endswith(".KS") or sym.endswith(".KQ"):
        return "kr"
    if re.search(r"-(USD|KRW|USDT)$", sym):
        return "crypto"
    return "us"


def read_js_json(path, const_name):
    s = open(path, encoding="utf-8").read()
    m = re.search(r"const\s+" + const_name + r"\s*=\s*(\{.*?\})\s*;\s*(?:\n|$)", s, re.S)
    if not m:
        return []
    try:
        return json.loads(m.group(1)).get("companies", [])
    except Exception:
        return []


def universe():
    syms = []
    for f, name in [
        ("kr-data-core.js", "KR_CORE_DATA"),
        ("kr-data-extra.js", "KR_EXTRA_DATA"),
        ("sp500-data-core.js", "SP500_CORE_DATA"),
        ("sp500-data-extra.js", "SP500_EXTRA_DATA"),
        ("ndx-extra.js", "NDX_EXTRA_DATA"),
    ]:
        syms += [c["symbol"] for c in read_js_json(os.path.join(MAP_DATA, f), name)]
    p = os.path.join(MAP_DATA, "etf-crypto-map.js")
    syms += [c["symbol"] for c in read_js_json(p, "ETF_MAP_DATA")]
    syms += [c["symbol"] for c in read_js_json(p, "CRYPTO_MAP_DATA")]
    seen, out = set(), []
    for s in syms:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def fetch_hourly(sym, tries=3):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(sym)}?range=2mo&interval=1h&includePrePost=false"
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.2 * (i + 1))
    raise last


def day_cum(kind, chart):
    """거래일(현지 날짜) -> 누적 거래대금 배열(60분 단위). 완성되지 않은 날은 호출 쪽에서 거른다."""
    res = (chart.get("chart") or {}).get("result") or []
    if not res:
        return {}
    r = res[0]
    ts = r.get("timestamp") or []
    q = ((r.get("indicators") or {}).get("quote") or [{}])[0]
    meta = r.get("meta") or {}
    off = 0 if kind == "crypto" else int(meta.get("gmtoffset") or 0)
    start_min, length = SESSION[kind]
    n = math.ceil(length / 60)
    days = {}
    for i, t in enumerate(ts):
        v = (q.get("volume") or [None] * len(ts))[i]
        c = (q.get("close") or [None] * len(ts))[i]
        h = (q.get("high") or [None] * len(ts))[i]
        lo = (q.get("low") or [None] * len(ts))[i]
        if v is None or c is None:
            continue
        typ = (h + lo + c) / 3 if h is not None and lo is not None else c
        if kind == "crypto":
            typ = 1  # 야후 코인 거래량은 이미 달러 거래대금이다
        loc = datetime.fromtimestamp(t + off, tz=timezone.utc)
        mins = loc.hour * 60 + loc.minute
        rel = mins - start_min
        if rel < 0 or rel >= length:
            continue
        k = rel // 60
        d = loc.strftime("%Y-%m-%d")
        arr = days.setdefault(d, [0.0] * n)
        arr[k] += v * typ
    out = {}
    need = 5 if kind != "crypto" else 12
    for d, arr in days.items():
        if sum(1 for x in arr if x > 0) < need:
            continue
        cum, run = [], 0.0
        for x in arr:
            run += x
            cum.append(run)
        out[d] = cum
    return out


def mean_arrays(arrs):
    n = len(arrs[0])
    return [int(round(sum(a[i] for a in arrs) / len(arrs))) for i in range(n)]


def build_symbol(sym):
    kind = kind_of(sym)
    try:
        days = day_cum(kind, fetch_hourly(sym))
    except Exception:  # noqa: BLE001
        return sym, kind, None
    if kind == "crypto":
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        days = {d: a for d, a in days.items() if d < today}  # 오늘(UTC)은 아직 하루가 안 끝남
    dates = sorted(days)
    if len(dates) < 11:
        return sym, kind, None
    last = dates[-1]
    incl = [days[d] for d in dates[-WINDOW:]]
    ex = [days[d] for d in dates[-(WINDOW + 1):-1]]
    if len(ex) < 10 or any(a[-1] <= 0 for a in incl[-3:]):
        return sym, kind, None
    return sym, kind, (last, mean_arrays(ex), mean_arrays(incl))


def main():
    syms = universe()
    limit = int(os.environ.get("VP_LIMIT", "0") or 0)
    if limit:
        syms = syms[:limit]
    print(f"universe {len(syms)}")
    v, as_of = {}, {}
    fail = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        for sym, kind, res in ex.map(build_symbol, syms):
            if not res:
                fail += 1
                continue
            last, e, i = res
            v[sym] = [e, i]
            if last > as_of.get(kind, ""):
                as_of[kind] = last
    print(f"ok {len(v)} fail {fail} asOf {as_of}")
    if len(v) < max(5, len(syms) * 0.5) and not limit:
        print("성공한 종목이 너무 적어 파일을 덮어쓰지 않습니다", file=sys.stderr)
        sys.exit(1)
    payload = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "window": WINDOW, "asOf": as_of, "v": v}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote", OUT, os.path.getsize(OUT))


if __name__ == "__main__":
    main()
