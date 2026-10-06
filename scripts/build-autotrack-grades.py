# -*- coding: utf-8 -*-
"""자동추적 종합 등급 + 신호 변화(2026-10-06 사용자 요청: 예시 1번 종합 등급 + 5번 변화 피드) → data/autotrack-grades.json

투자처(kr·us·crypto)마다 종목별로 5개 항목을 비교군 안 백분위로 A~F 등급을 매기고,
5개 백분위 평균(종합 점수) 순위로 강력매수(상위 10%)·매수(~30%)·보유(~70%)·매도(~90%)·강력매도(하위 10%) 판정.
  · 주식: 성장(매출·순이익 증가) · 수익성(영업이익률·ROE) · 모멘텀(최근 3개월 수익률·52주 위치) · 가치(PER 낮을수록·배당률) · 승률(10년평균 승률·연평균 상승)
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
STOCK_FACTORS = ["성장", "수익성", "모멘텀", "가치", "승률"]
CRYPTO_FACTORS = ["승률", "장기상승", "모멘텀", "안정성", "규모"]
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


def compute(market, rev=None):
    wr = read_json("data/winrate-scores-us.json", rev)
    if market == "crypto":
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
        f = [
            combine(pct_rank(g("revenueGrowth")), pct_rank(g("netIncomeGrowth"))),
            combine(pct_rank(g("operatingMargin")), pct_rank(g("roe"))),
            combine(pct_rank({s: mom3(scores.get(s)) for s in syms}), pct_rank(g("week52RangePct"))),
            combine(pct_rank(per, higher_better=False), pct_rank(g("dividendYield"))),
            combine(pct_rank(g("winRateScore")), pct_rank(g("ret10yAvg"))),
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
    which = next((a for a in args if a in ("kr", "us", "crypto", "all")), "all")
    prev_rev = args[args.index("--prev-rev") + 1] if "--prev-rev" in args else None
    markets = ["kr", "us", "crypto"] if which == "all" else [which]
    today = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 9 * 3600))
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"markets": {}}
    for m in markets:
        factors = CRYPTO_FACTORS if m == "crypto" else STOCK_FACTORS
        side = data["markets"].get(m) or {}
        cur = compute(m)
        if prev_rev:
            side["prev"] = {"date": "seed:" + prev_rev[:7], "items": compute(m, prev_rev)}
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
