# -*- coding: utf-8 -*-
"""자동추적 종합 등급 + 신호 변화(2026-10-06 사용자 요청: 예시 1번 종합 등급 + 5번 변화 피드) → data/autotrack-grades.json

투자처(kr·us·crypto)마다 종목별로 5개 항목을 비교군 안 백분위로 A~F 등급을 매기고,
5개 백분위 평균(종합 점수) 순위로 강력매수(상위 10%)·매수(~30%)·보유(~70%)·매도(~90%)·강력매도(하위 10%) 판정.
  · 주식(한국·미국): 성장(매출 증가) · 수익성(순이익·영업이익 증가) · 승률(10년평균 승률) · 가치(ROE·PER 낮을수록) · 모멘텀(한 달 수익률·52주 위치)
  · 코인: 승률 · 장기상승(연평균 상승) · 모멘텀 · 안정성(3개월 하루 변동 낮을수록) · 규모(시가총액)
투자처별로 "오늘(KST)" 판정을 저장하고, 날짜가 바뀌면 이전 판정을 prev로 옮겨 판정이 달라진 종목을 events(최근 7일)에 쌓는다.
같은 날 여러 번 돌면 오늘 events만 다시 계산한다.

실행: python scripts/build-autotrack-grades.py [kr|us|crypto|all] [--prev-rev <git커밋>]  (--prev-rev: 처음 한 번, 그 커밋의 데이터로 어제 판정을 만듦)
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "autotrack-grades.json")
RATINGS = ["강력매수", "매수", "보유", "매도", "강력매도"]
# 2026-10-07 사용자 지정(한국, 같은 날 미국도 동일): 성장(매출 증가) · 수익성(순이익 증가·영업이익 증가) · 승률(10년평균 승률) · 가치(ROE·PER) · 모멘텀(한달 상승·52주 위치)
STOCK_FACTORS = ["성장", "수익성", "승률", "가치", "모멘텀"]
CRYPTO_FACTORS = ["승률", "장기상승", "모멘텀", "안정성", "규모"]  # 비트코인·ETF(2026-10-07 ETF도 같은 기준)
STABLE = {"USDT", "USDC", "DAI", "USDE", "FDUSD", "TUSD", "USDS", "PYUSD", "USD1", "BUSD", "USDD", "USDTB", "RLUSD", "USDF", "FRAX", "USD0", "BFUSD", "SUSDS", "SUSDE", "XAUT", "PAXG"}
EVENT_DAYS = 7


def read_text(rel, rev=None):
    if rev:
        return subprocess.run(["git", "show", f"{rev}:{rel}"], cwd=ROOT, capture_output=True, check=True).stdout.decode("utf-8-sig")
    return open(os.path.join(ROOT, rel), encoding="utf-8-sig").read()


def read_json(rel, rev=None):
    return json.loads(read_text(rel, rev))


def crypto_companies(rev=None):
    t = read_text("sector-map/data/etf-crypto-map.js", rev)
    i = t.find("CRYPTO_MAP_DATA")
    obj, _ = json.JSONDecoder().raw_decode(t[t.find("{", i):])
    return obj.get("companies", [])


def pct_rank(values, higher_better=True):
    """{sym: v} → {sym: 0~100 백분위(100이 가장 좋음)}"""
    items = [(s, v) for s, v in values.items() if isinstance(v, (int, float))]
    n = len(items)
    if n < 2:
        return {}
    items.sort(key=lambda x: x[1], reverse=not higher_better)  # 나쁜 것부터
    return {s: i / (n - 1) * 100 for i, (s, _) in enumerate(items)}


def mom3(e):
    m12 = (e or {}).get("m12") or []
    if len(m12) < 4:
        return None
    r = 1.0
    for m in m12[-4:-1]:  # 직전 완성 3개월
        r *= 1 + m / 100
    return (r - 1) * 100


def mom1(e):
    """직전 완성월 한 달 수익률(m12의 끝에서 두 번째 — 마지막은 진행 중인 달)"""
    m12 = (e or {}).get("m12") or []
    return m12[-2] if len(m12) >= 2 else None


def op_income_growth(symbols):
    """분기 영업이익 증가율(최근 분기 ÷ 1년 전 같은 분기 − 1, %) — 야후 분기 재무. 은행·보험 등 항목이 없는 회사는 빠짐"""
    import urllib.request
    from concurrent.futures import ThreadPoolExecutor

    def one(sym):
        url = (f"https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{sym}?symbol={sym}"
               f"&type=quarterlyOperatingIncome&period1=1600000000&period2={int(time.time())}")
        for _ in range(3):
            try:
                js = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30))
                break
            except Exception:
                time.sleep(1.5)
        else:
            return sym, None
        try:
            rows = [x for x in js["timeseries"]["result"][0].get("quarterlyOperatingIncome") or [] if x]
        except Exception:
            return sym, None
        ser = {x["asOfDate"]: x["reportedValue"]["raw"] for x in rows if x.get("asOfDate") and x.get("reportedValue")}
        if not ser:
            return sym, None
        cur = max(ser)
        y, m = int(cur[:4]), int(cur[5:7])
        prev = [d for d in ser if int(d[:4]) == y - 1 and abs(int(d[5:7]) - m) <= 1]
        if not prev or ser[prev[-1]] <= 0:
            return sym, None
        return sym, (ser[cur] / ser[prev[-1]] - 1) * 100

    with ThreadPoolExecutor(4) as ex:
        return dict(ex.map(one, symbols))


def grade_of(p):
    if p is None:
        return "-"
    return "A" if p >= 80 else "B" if p >= 60 else "C" if p >= 40 else "D" if p >= 20 else "F"


def combine(*maps):
    out = {}
    keys = set().union(*[m.keys() for m in maps])
    for k in keys:
        vs = [m[k] for m in maps if k in m]
        out[k] = sum(vs) / len(vs)
    return out


def compute(market, rev=None, extra=None):
    wr = read_json("data/winrate-scores-us.json", rev)
    if market == "etf":
        # ETF(2026-10-07 사용자 요청): 비트코인과 같은 5개 기준 — 지도 ETF200(미국 100 + 한국 100)
        t = read_text("sector-map/data/etf-crypto-map.js", rev)
        i = t.find("ETF_MAP_DATA")
        scores = wr.get("scoresEtf") or {}
        # CD금리·머니마켓·초단기채 같은 현금성 ETF(하루 변동 0.1% 미만)는 코인의 스테이블코인처럼 제외 —
        # 안정성·모멘텀·승률이 저절로 최상위라 강력매수를 독차지한다
        cashlike = lambda c: isinstance((scores.get(c["symbol"]) or {}).get("vol3m"), (int, float)) and scores[c["symbol"]]["vol3m"] < 0.1
        comps = [c for c in json.JSONDecoder().raw_decode(t[t.find("{", i):])[0].get("companies", []) if c.get("marketCap") and not cashlike(c)]
        syms = [c["symbol"] for c in comps]
        by = {c["symbol"]: c for c in comps}
        # 지도 ETF 데이터의 marketCap은 한국 ETF도 이미 달러 환산값(KODEX 200 ≈ 187억 달러)이라 그대로 비교
        usd_cap = {s: by[s]["marketCap"] for s in syms}
        f = [
            pct_rank({s: by[s].get("winRateScore") for s in syms}),
            pct_rank({s: by[s].get("ret10yAvg") for s in syms}),
            combine(pct_rank({s: mom3(scores.get(s)) for s in syms}), pct_rank({s: by[s].get("week52RangePct") for s in syms})),
            pct_rank({s: (scores.get(s) or {}).get("vol3m") for s in syms}, higher_better=False),
            pct_rank(usd_cap),
        ]
    elif market == "crypto":
        scores = wr.get("scoresCrypto") or {}
        def is_stable(c):
            base = (c.get("displayName") or c["symbol"].split("-")[0]).upper()
            vol = (scores.get(c["symbol"]) or {}).get("vol3m")
            # 목록에 없는 달러·유로 연동 코인(SYRUPUSDC 등)도 이름·변동폭으로 걸러냄
            return base in STABLE or "USD" in base or "EUR" in base or (isinstance(vol, (int, float)) and vol < 0.3)

        comps = [c for c in crypto_companies(rev) if not is_stable(c) and c.get("marketCap")]
        syms = [c["symbol"] for c in comps]
        by = {c["symbol"]: c for c in comps}
        f = [
            pct_rank({s: by[s].get("winRateScore") for s in syms}),
            pct_rank({s: by[s].get("ret10yAvg") for s in syms}),
            combine(pct_rank({s: mom3(scores.get(s)) for s in syms}), pct_rank({s: by[s].get("week52RangePct") for s in syms})),
            pct_rank({s: (scores.get(s) or {}).get("vol3m") for s in syms}, higher_better=False),
            pct_rank({s: by[s].get("marketCap") for s in syms}),
        ]
    else:
        path = "sector-map/data/kr-sectors.json" if market == "kr" else "sector-map/data/sp500-sectors.json"
        comps = [c for c in read_json(path, rev)["companies"] if c.get("marketCap")]
        scores = wr.get("scoresKr" if market == "kr" else "scores") or {}
        syms = [c["symbol"] for c in comps]
        by = {c["symbol"]: c for c in comps}
        g = lambda k: {s: by[s].get(k) for s in syms}
        per = {s: (v if isinstance(v, (int, float)) and v > 0 else None) for s, v in g("per").items()}
        # 2026-10-07 사용자 요청: 한국·미국 같은 구성 — 성장(매출) · 수익성(순이익·영업이익 증가) · 승률 · 가치(ROE·PER) · 모멘텀(한 달·52주)
        opg = (extra or {}).get("opg") or {}
        f = [
            pct_rank(g("revenueGrowth")),
            combine(pct_rank(g("netIncomeGrowth")), pct_rank({s: opg.get(s) for s in syms})),
            pct_rank(g("winRateScore")),
            combine(pct_rank(g("roe")), pct_rank(per, higher_better=False)),
            combine(pct_rank({s: mom1(scores.get(s)) for s in syms}), pct_rank(g("week52RangePct"))),
        ]
    total = {}
    for s in syms:
        ps = [m[s] for m in f if s in m]
        if len(ps) >= 3:
            total[s] = sum(ps) / len(ps)
    ranked = sorted(total, key=lambda s: -total[s])
    n = len(ranked)
    items = {}
    for i, s in enumerate(ranked):
        q = (i + 0.5) / n
        rating = 0 if q <= 0.10 else 1 if q <= 0.30 else 2 if q <= 0.70 else 3 if q <= 0.90 else 4
        items[s] = [rating, "".join(grade_of(m.get(s)) for m in f), round(total[s], 1), i + 1]  # 마지막 = 종합 순위
    return items


def diff_events(prev_items, cur_items, factors, date):
    ev = []
    for s, cur in cur_items.items():
        p = prev_items.get(s)
        if not p or p[0] == cur[0]:
            continue
        # 왜 바뀌었는지: 등급이 가장 많이 움직인 항목 하나
        order = "FDCBA"
        best = None
        for k, (a, b) in enumerate(zip(p[1], cur[1])):
            if a == "-" or b == "-" or a == b:
                continue
            d = order.index(b) - order.index(a)
            if best is None or abs(d) > abs(best[0]):
                best = (d, k, a, b)
        # 판정은 순위 구간이라 점수가 그대로여도 다른 종목이 움직이면 바뀐다 — 그래서 점수 대신 순위 변화를 보여준다
        score = f"순위 {p[3]}→{cur[3]}위" if len(p) > 3 else f"종합 점수 {p[2]:.0f}→{cur[2]:.0f}"
        why = f"{factors[best[1]]} {best[2]}→{best[3]} · {score}" if best else score
        ev.append({"d": date, "s": s, "f": p[0], "t": cur[0], "why": why, "sc": cur[2]})
    # 좋아진 것 먼저, 그 안에서는 많이 움직인 순
    ev.sort(key=lambda e: (e["t"] > e["f"], -abs(e["t"] - e["f"]), -e["sc"]))
    return ev


def main():
    args = sys.argv[1:]
    which = next((a for a in args if a in ("kr", "us", "crypto", "etf", "all")), "all")
    prev_rev = args[args.index("--prev-rev") + 1] if "--prev-rev" in args else None
    markets = ["kr", "us", "crypto", "etf"] if which == "all" else [which]
    today = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 9 * 3600))
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"markets": {}}
    for m in markets:
        factors = CRYPTO_FACTORS if m in ("crypto", "etf") else STOCK_FACTORS
        side = data["markets"].get(m) or {}
        extra = None
        if m in ("kr", "us"):
            syms = [c["symbol"] for c in read_json("sector-map/data/kr-sectors.json" if m == "kr" else "sector-map/data/sp500-sectors.json")["companies"]]
            extra = {"opg": op_income_growth(syms)}
            print(f"[{m}] 영업이익 증가율 {sum(1 for v in extra['opg'].values() if v is not None)}/{len(syms)}종목", flush=True)
        if side.get("factors") and side["factors"] != factors:
            side.pop("prev", None)  # 항목 구성이 바뀌면 어제 판정과 비교하지 않음(가짜 신호 방지)
            side["events"] = []
        cur = compute(m, extra=extra)
        if prev_rev:
            side["prev"] = {"date": "seed:" + prev_rev[:7], "items": compute(m, prev_rev, extra)}
        elif side.get("date") and side["date"] != today and side.get("items"):
            side["prev"] = {"date": side["date"], "items": side["items"]}
        prev = (side.get("prev") or {}).get("items") or {}
        events = [e for e in side.get("events", []) if e["d"] != today]
        events = diff_events(prev, cur, factors, today) + events
        cutoff = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 9 * 3600 - EVENT_DAYS * 86400))
        side.update({"date": today, "factors": factors, "items": cur, "events": [e for e in events if e["d"] >= cutoff]})
        data["markets"][m] = side
        todays = sum(1 for e in side["events"] if e["d"] == today)
        dist = [sum(1 for v in cur.values() if v[0] == r) for r in range(5)]
        print(f"[{m}] {len(cur)}종목 · 판정 분포 {dict(zip(RATINGS, dist))} · 오늘 바뀐 신호 {todays}건", flush=True)
    data["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    data["ratings"] = RATINGS
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
