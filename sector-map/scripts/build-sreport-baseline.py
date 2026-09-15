"""S리포트 비교 기준 DB(data/sreport-baseline.json) 생성 — 2026-09-15 사용자 요청.
종목 상세의 S리포트(오각형 레이더 + 전체 비교표)가 볼 때마다 비교군 수백 개를 계산하느라 버퍼링되지 않도록,
비교군별 평균과 백분위 분포, 종목별 값을 매일 미리 계산해 둔다. 앱은 이 파일 하나만 읽고 즉시 그린다.

비교군(사용자 지정):
  kospi200  한국 주식 → 코스피200 종목 평균
  sp200     미국 주식 → S&P500 중 시가총액 상위 200개 평균
  ipoKr100  한국 IPO(최근 5년 신규 상장) → 시총 상위 100개 평균
  ipoUs100  미국 IPO → 시총 상위 100개 평균
  crypto200 코인 → 코인 200개 평균
  etf       ETF → SPY 값 기준(분포는 ETF 전체)
평균은 한두 종목의 극단값에 휘둘리지 않게 위아래 10%씩 뺀 평균.

지표 키: win=10년 월간 승률, ret=연평균 상승(CAGR), rev=작년 대비 매출 증가(ETF·코인은 1년 수익률), vol=3개월 하루 변동량(|일간 등락률| 평균), rsi=주간 RSI
  주식 추가: ni 순이익 증가, om 영업이익률, roe, cf 현금흐름 증가, debt 부채비율, per, div 배당률, mcap 시가총액, dv 거래대금, w52 52주 구간 위치
  ETF 추가: div 배당률(최근 1년 분배금 ÷ 현재가, 이 스크립트가 야후에서 조회), fee 운용보수, w52 / 코인 추가: mcap, w52
입력: data/winrate-scores-us.json, sector-map/data/{sp500,kr}-sectors.json, sector-map/data/ipo-map.js,
      sector-map/data/etf-crypto-map.js, data/etf-info.json, data/kr-universe-kospi200-kosdaq150.json
실행: python3 sector-map/scripts/build-sreport-baseline.py   (daily-sp500-data.yml이 승률 배치 다음에 매일 실행)
"""
import json, re, math, time, pathlib, datetime, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "sreport-baseline.json"
UA = {"User-Agent": "Mozilla/5.0"}


def load_json(path):
    return json.loads(pathlib.Path(path).read_bytes().decode("utf-8-sig"))


def load_js_const(path, name):
    text = pathlib.Path(path).read_bytes().decode("utf-8-sig")
    m = re.search(r"const %s\s*=\s*(.*?);\s*$" % name, text, re.M | re.S)
    body = m.group(1)
    body = re.sub(r":\s*-?Infinity\b", ":null", body)
    body = re.sub(r":\s*NaN\b", ":null", body)
    return json.loads(body)


def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


def trimmed_mean(values):
    v = sorted(x for x in values if x is not None)
    if not v:
        return None
    k = int(len(v) * 0.1) if len(v) >= 10 else 0
    s = v[k:len(v) - k]
    return sum(s) / len(s)


def rnd(v, digits=2):
    if v is None:
        return None
    if abs(v) >= 1e6:
        return int(float(f"{v:.3g}"))  # 시가총액·거래대금은 유효숫자 3자리면 충분(파일 크기 절약)
    return round(v, digits if abs(v) < 10 else 1)


db = load_json(ROOT / "data" / "winrate-scores-us.json")
sp = load_json(ROOT / "sector-map" / "data" / "sp500-sectors.json")["companies"]
kr = load_json(ROOT / "sector-map" / "data" / "kr-sectors.json")["companies"]
ipo = load_js_const(ROOT / "sector-map" / "data" / "ipo-map.js", "IPO_MAP_DATA")
etf_map = load_js_const(ROOT / "sector-map" / "data" / "etf-crypto-map.js", "ETF_MAP_DATA")["companies"]
crypto_map = load_js_const(ROOT / "sector-map" / "data" / "etf-crypto-map.js", "CRYPTO_MAP_DATA")["companies"]
etf_info = load_json(ROOT / "data" / "etf-info.json")
kospi200 = {x["symbol"] for x in load_json(ROOT / "data" / "kr-universe-kospi200-kosdaq150.json")["kospi200"]}
prev = load_json(OUT) if OUT.exists() else {}

STOCK_EXTRA = {"ni": "netIncomeGrowth", "om": "operatingMargin", "roe": "roe", "cf": "cashFlowGrowth", "debt": "debtRatio",
               "per": "per", "div": "dividendYield", "mcap": "marketCap", "dv": "dollarVolume", "w52": "week52RangePct"}


def core_from(entry, row, rev_value):
    """승률 DB 항목(entry) 우선, 없으면 지도 스냅샷 행(row) 값"""
    entry = entry or {}
    row = row or {}
    return {
        "win": num(entry.get("score")) if num(entry.get("score")) is not None else num(row.get("winRateScore")),
        "ret": num(entry.get("ret10y")) if num(entry.get("ret10y")) is not None else num(row.get("ret10yAvg")),
        "rev": num(rev_value),
        "vol": num(entry.get("vol3m")) if num(entry.get("vol3m")) is not None else num(row.get("vol3m")),
        "rsi": num(entry.get("rsi")) if num(entry.get("rsi")) is not None else num(row.get("rsiWeekly")),
    }


def stock_values(row, entry):
    v = core_from(entry, row, row.get("revenueGrowth"))
    for k, field in STOCK_EXTRA.items():
        x = num(row.get(field))
        if k == "per" and x is not None and x <= 0:
            x = None
        v[k] = x
    return v


members = {}   # symbol -> {"g": group, 값...}
groups = {}


def add_group(key, label, ref_name, rows, metrics, ref_values=None):
    dist = {m: sorted(rnd(r[m]) for r in rows if r.get(m) is not None) for m in metrics}
    if ref_values is None:
        ref = {m: rnd(trimmed_mean([r.get(m) for r in rows])) for m in metrics}
    else:
        ref = {m: rnd(ref_values.get(m)) for m in metrics}
    groups[key] = {"label": label, "refName": ref_name, "count": len(rows), "ref": ref, "dist": dist}


def put_member(symbol, group, values):
    members[symbol] = {"g": group, **{k: rnd(v) for k, v in values.items() if v is not None}}


CORE = ["win", "ret", "rev", "vol", "rsi"]
STOCK_METRICS = CORE + list(STOCK_EXTRA.keys())

# ---- 한국 주식: 코스피200 ----
kr_rows = []
for c in kr:
    vals = stock_values(c, (db.get("scoresKr") or {}).get(c["symbol"]))
    if c["symbol"] in kospi200:
        kr_rows.append(vals)
    put_member(c["symbol"], "kospi200", vals)
add_group("kospi200", "코스피200", "코스피200 평균", kr_rows, STOCK_METRICS)

# ---- 미국 주식: S&P500 시총 상위 200 ----
sp_sorted = sorted(sp, key=lambda c: num(c.get("marketCap")) or 0, reverse=True)
us_rows = []
for i, c in enumerate(sp_sorted):
    vals = stock_values(c, (db.get("scores") or {}).get(c["symbol"]))
    if i < 200:
        us_rows.append(vals)
    put_member(c["symbol"], "sp200", vals)
# S&P500 밖이지만 승률 DB에 있는 미국 종목(나스닥100 추가분 등)도 값은 담아 둔다
for sym, e in (db.get("scores") or {}).items():
    if sym not in members:
        put_member(sym, "sp200", core_from(e, None, None))
add_group("sp200", "S&P500 상위 200", "S&P500 상위 200 평균", us_rows, STOCK_METRICS)

# ---- IPO: 한국·미국 각 시총 상위 100 (IPO 종목은 지수 편입 여부와 무관하게 IPO 비교군이 우선) ----
for side, key, label in (("kr", "ipoKr100", "한국 IPO100"), ("us", "ipoUs100", "미국 IPO100")):
    comps = sorted((ipo.get(side) or {}).get("companies", []), key=lambda c: num(c.get("marketCap")) or 0, reverse=True)
    wr_map = db.get("scoresKr" if side == "kr" else "scores") or {}
    rows = []
    for i, c in enumerate(comps):
        vals = stock_values(c, wr_map.get(c["symbol"]))
        if i < 100:
            rows.append(vals)
        put_member(c["symbol"], key, vals)
    add_group(key, label, f"{label} 평균", rows, STOCK_METRICS)

# ---- 코인 200 ----
crypto_rows = []
for c in crypto_map:
    e = (db.get("scoresCrypto") or {}).get(c["symbol"])
    vals = core_from(e, c, (e or {}).get("ret1y"))
    vals.update({"mcap": num(c.get("marketCap")), "w52": num(c.get("week52RangePct"))})
    crypto_rows.append(vals)
    put_member(c["symbol"], "crypto200", vals)
add_group("crypto200", "코인200", "코인200 평균", crypto_rows, CORE + ["mcap", "w52"])


# ---- ETF: 분포는 ETF 전체, 기준값은 SPY ----
def fetch_etf_dividend(sym):
    """최근 1년 분배금 합계 ÷ 현재가(%) — 분배금이 없으면 0"""
    q = urllib.parse.quote(sym)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{q}?range=1y&interval=1mo&events=div"
    for i in range(3):
        try:
            r = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())["chart"]["result"][0]
            price = num((r.get("meta") or {}).get("regularMarketPrice"))
            divs = ((r.get("events") or {}).get("dividends") or {}).values()
            total = sum(num(d.get("amount")) or 0 for d in divs)
            time.sleep(0.15)
            return round(total / price * 100, 2) if price else None
        except Exception:
            time.sleep(2 * (i + 1))
    return None


etf_symbols = sorted({c["symbol"] for c in etf_map} | set((db.get("scoresEtf") or {}).keys()))
row_by_symbol = {c["symbol"]: c for c in etf_map}
prev_div = {s: m.get("div") for s, m in (prev.get("members") or {}).items() if (m or {}).get("g") == "etf"}
with ThreadPoolExecutor(max_workers=4) as ex:
    dividends = dict(zip(etf_symbols, ex.map(fetch_etf_dividend, etf_symbols)))
etf_rows = []
spy_values = None
for sym in etf_symbols:
    e = (db.get("scoresEtf") or {}).get(sym)
    row = row_by_symbol.get(sym)
    vals = core_from(e, row, (e or {}).get("ret1y"))
    info = (etf_info.get("kr" if sym.endswith((".KS", ".KQ")) else "us") or {}).get(sym) or {}
    div = dividends.get(sym)
    vals.update({"div": div if div is not None else prev_div.get(sym), "fee": num(info.get("fee")), "w52": num((row or {}).get("week52RangePct"))})
    etf_rows.append(vals)
    put_member(sym, "etf", vals)
    if sym == "SPY":
        spy_values = vals
add_group("etf", "ETF", "SPY", etf_rows, CORE + ["div", "fee", "w52"], ref_values=spy_values or {})

out = {
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "description": "S리포트 비교 기준: 비교군별 기준값(ref=위아래 10% 뺀 평균, ETF는 SPY)·백분위 분포(dist, 오름차순)·종목별 값(members). "
                   "win=10년 월간 승률, ret=연평균 상승, rev=작년 대비 매출 증가(ETF·코인은 1년 수익률), vol=3개월 하루 변동량, rsi=주간 RSI.",
    "groups": groups,
    "members": members,
}
OUT.write_bytes(json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
print(json.dumps({k: {"count": g["count"], "ref": g["ref"]} for k, g in groups.items()}, ensure_ascii=False))
print("members", len(members), "bytes", OUT.stat().st_size)
