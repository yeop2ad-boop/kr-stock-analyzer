# -*- coding: utf-8 -*-
"""투자분석 탭(2026-10-06 사용자 요청) 데이터 배치 → data/invest-analysis.json

투자처(한국주식·미국주식·ETF·비트코인)마다 투자방법 5~6개의 구성종목(비중 높은 순 최대 30개)과
1년(일봉)·10년(주봉) 수익 지수(시작=100)를 미리 계산해 둔다. 5년은 앱이 10년 주봉을 잘라 다시 100으로 맞춘다.
1일·1주·1달은 앱이 실시간으로 계산한다(구성종목 상위 10개 또는 지수 티커 하나).

· 지수형(코스피200·S&P500 등)은 지수/ETF 시세 하나로 그리고, 구성종목은 시가총액 비중으로 보여준다.
· 바구니형(52주 최고가·최저가·섹터 순환·10년 승률·코인 지수)은 지금 고른 종목을 시가총액 비중으로 들고 있었다면의
  수익 지수다. 상장 10년이 안 된 종목은 시세가 생긴 시점부터 더해진다(그 전은 나머지 종목 비중으로 나눠 계산).
표준 라이브러리만 쓴다(GitHub Actions에서 그대로 실행).
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "invest-analysis.json")
TOP_N = 30
KST = 9 * 3600

COLORS = ["#e03131", "#f08c00", "#2f9e44", "#7048e8", "#d6336c", "#8d6e63"]


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8-sig") as f:
        return json.load(f)


def load_crypto_snapshot():
    t = open(os.path.join(ROOT, "sector-map", "data", "etf-crypto-map.js"), encoding="utf-8").read()
    i = t.find("CRYPTO_MAP_DATA")
    j = t.find("{", i)
    obj, _ = json.JSONDecoder().raw_decode(t[j:])
    return obj.get("companies", [])


def http_json(url, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(1.5 * (k + 1))
    return None


def chart_points(symbol, rng, interval):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range={rng}&interval={interval}"
    d = http_json(url)
    try:
        res = d["chart"]["result"][0]
        ts = res.get("timestamp") or []
        cl = res["indicators"]["quote"][0].get("close") or []
    except Exception:
        return []
    pts = [(t, c) for t, c in zip(ts, cl) if c is not None and c > 0]
    pts.sort()
    return pts


def bucket(t, kind):
    # 한국시간 기준 날짜/주(월요일 시작)로 묶어 서로 다른 거래소의 봉도 같은 칸에 들어가게 한다
    if kind == "d":
        return (t + KST) // 86400
    return (t + KST - 4 * 86400) // (7 * 86400)


def basket_series(holdings, charts, kind):
    """holdings: [(symbol, weight)], charts: symbol -> [(t, close)] → [(t, level)] (시작=100)
    매 칸마다 그 칸에 시세가 있는 종목들의 비중 가중 평균 수익률로 지수를 이어 붙인다.
    상장 전 종목은 시세가 생긴 다음 칸부터 비중에 들어간다."""
    per = {}
    first_t = {}
    for sym, _w in holdings:
        m = {}
        for t, c in charts.get(sym) or []:
            k = bucket(t, kind)
            m[k] = c  # 같은 칸에 두 개면 나중 값(진행 중인 봉)
            first_t.setdefault(k, t)
        per[sym] = m
    keys = sorted(first_t.keys())
    if not keys:
        return []
    level = 100.0
    prev = {}
    out = []
    for k in keys:
        num = den = 0.0
        for sym, w in holdings:
            p = per[sym].get(k)
            if p is None:
                continue
            if sym in prev:
                num += w * (p / prev[sym] - 1)
                den += w
            prev[sym] = p
        if den > 0:
            level *= 1 + num / den
        out.append((first_t[k], round(level, 3)))
    return out


def single_series(pts, kind):
    m = {}
    first_t = {}
    for t, c in pts:
        k = bucket(t, kind)
        m[k] = c
        first_t.setdefault(k, t)
    keys = sorted(m.keys())
    if not keys:
        return []
    base = m[keys[0]]
    return [(first_t[k], round(m[k] / base * 100, 3)) for k in keys]


def cap_weights(rows, cap_key="marketCap", cap_limit=None):
    tot = sum(r[cap_key] for r in rows if r.get(cap_key))
    ws = [(r, (r.get(cap_key) or 0) / tot * 100 if tot else 0) for r in rows]
    if cap_limit:
        # 한 종목 비중 상한(코인데스크20 30%) — 넘친 만큼 나머지에 시총 비율대로 나눠 줌
        for _ in range(10):
            over = sum(max(0, w - cap_limit) for _, w in ws)
            if over < 1e-9:
                break
            rest = sum(w for _, w in ws if w < cap_limit)
            ws = [(r, cap_limit if w >= cap_limit else w + over * (w / rest)) for r, w in ws]
    return ws


def holding_list(weighted, n=TOP_N, total_weight=None):
    weighted = sorted(weighted, key=lambda x: -x[1])[:n]
    return [{"s": r["symbol"], "n": r.get("name") or r["symbol"], "w": round(w, 2)} for r, w in weighted]


def pick_weighted(rows):
    """고른 종목들끼리 시가총액 비중(합 100)"""
    return holding_list(cap_weights(rows))


def sector_rotation(companies, scores):
    # 직전 완성월(m12의 끝에서 두 번째) 섹터별 시총 가중 수익률 1위 섹터
    agg = {}
    for c in companies:
        e = scores.get(c["symbol"]) or {}
        m12 = e.get("m12") or []
        if len(m12) < 2 or not c.get("marketCap") or not c.get("sector"):
            continue
        a = agg.setdefault(c["sector"], [0.0, 0.0, c.get("sectorKo") or c["sector"]])
        a[0] += m12[-2] * c["marketCap"]
        a[1] += c["marketCap"]
    # 종목이 몇 개 안 되는 섹터(한국의 유틸리티 등)는 한 종목짜리 바구니가 되므로 5종목 이상인 섹터만 후보
    counts = {}
    for c in companies:
        if c.get("sector"):
            counts[c["sector"]] = counts.get(c["sector"], 0) + 1
    agg = {k: v for k, v in agg.items() if counts.get(k, 0) >= 5 and v[1] > 0}
    if not agg:
        return None, None, []
    best = max(agg.items(), key=lambda kv: kv[1][0] / kv[1][1])
    sec, (s, w, ko) = best
    members = sorted([c for c in companies if c.get("sector") == sec and c.get("marketCap")], key=lambda c: -c["marketCap"])[:TOP_N]
    return ko, round(s / w, 2), members


# 같은 회사의 두 번째 상장 주식(2026-10-07 점검): GOOG(알파벳 C)=GOOGL(A), FOX=FOXA, NWS=NWSA.
# 야후 시가총액이 둘 다 "회사 전체"라 시총 비중이 두 배로 잡혔다(S&P500 안 알파벳 11%, 10년 승률 매매 35%) — 한쪽만 쓴다
SECONDARY_SHARE_CLASS = {"GOOG", "FOX", "NWS"}


def stock_section(companies, scores, idx_defs):
    """idx_defs: [(key, label, ticker, members)] — 지수형 2개. 나머지 4개는 바구니형."""
    comps = [c for c in companies if c.get("marketCap") and c["symbol"] not in SECONDARY_SHARE_CLASS]
    strategies = []
    for key, label, ticker, members, note in idx_defs:
        strategies.append({"key": key, "label": label, "ticker": ticker, "holdings": holding_list(cap_weights(members)), "note": note})
    with52 = [c for c in comps if c.get("week52RangePct") is not None]
    hi = sorted(with52, key=lambda c: (-c["week52RangePct"], -c["marketCap"]))[:TOP_N]
    lo = sorted(with52, key=lambda c: (c["week52RangePct"], -c["marketCap"]))[:TOP_N]
    strategies.append({"key": "high52", "label": "52주 최고가 매매", "holdings": pick_weighted(hi),
                       "note": "지금 52주 가격 구간에서 가장 위쪽(최고가 근처)에 있는 30종목을 시가총액 비중으로 담았습니다."})
    strategies.append({"key": "low52", "label": "52주 최저가 매매", "holdings": pick_weighted(lo),
                       "note": "지금 52주 가격 구간에서 가장 아래쪽(최저가 근처)에 있는 30종목을 시가총액 비중으로 담았습니다."})
    sec_ko, sec_ret, members = sector_rotation(comps, scores)
    strategies.append({"key": "sector", "label": "섹터 순환 매매", "holdings": pick_weighted(members),
                       "note": f"직전 한 달 수익률 1위 섹터({sec_ko}, {sec_ret:+.1f}%)의 시가총액 상위 30종목입니다." if sec_ko else "직전 한 달 수익률 1위 섹터"})
    wr = [c for c in comps if (scores.get(c["symbol"]) or {}).get("total", 0) >= 60 and (scores.get(c["symbol"]) or {}).get("score") is not None]
    wr = sorted(wr, key=lambda c: (-scores[c["symbol"]]["score"], -c["marketCap"]))[:TOP_N]
    strategies.append({"key": "winrate", "label": "10년 승률 매매", "holdings": pick_weighted(wr),
                       "note": "10년평균 승률(오르며 마감한 달의 비율, 5년 이상 상장 종목) 상위 30종목을 시가총액 비중으로 담았습니다."})
    return strategies


def main():
    kr = load("sector-map/data/kr-sectors.json")["companies"]
    us = load("sector-map/data/sp500-sectors.json")["companies"]
    wr = load("data/winrate-scores-us.json")
    uni = load("data/kr-universe-kospi200-kosdaq150.json")
    etf = load("data/etf-info.json")
    crypto = load_crypto_snapshot()

    kr_by = {c["symbol"]: c for c in kr}
    k200 = [kr_by[x["symbol"]] for x in uni["kospi200"] if x["symbol"] in kr_by and kr_by[x["symbol"]].get("marketCap")]
    kq150 = [kr_by[x["symbol"]] for x in uni["kosdaq150"] if x["symbol"] in kr_by and kr_by[x["symbol"]].get("marketCap")]
    us_caps = [c for c in us if c.get("marketCap") and c["symbol"] not in SECONDARY_SHARE_CLASS]

    def etf_holdings(sym):
        hs = (etf.get("us", {}).get(sym) or {}).get("holdings") or []
        rows = [{"s": h["s"], "n": h.get("n") or h["s"], "w": round(h["w"], 2)} for h in hs if h.get("s") and h.get("w")]
        # 앱이 한글명을 붙일 수 있게 S&P500 짧은 이름이 있으면 그걸 씀
        us_by = {c["symbol"]: c for c in us}
        for r in rows:
            if r["s"] in us_by:
                r["n"] = us_by[r["s"]].get("name") or r["n"]
        return rows[:TOP_N]

    sections = {}
    sections["kr"] = stock_section(kr, wr.get("scoresKr") or {}, [
        ("kospi200", "코스피200", "069500.KS", k200, "코스피200 지수를 따라가는 KODEX 200(069500) 시세로 그렸고(야후에 지수 시세가 없음), 구성종목 비중은 시가총액 비중입니다."),
        ("kosdaq150", "코스닥150", "229200.KS", kq150, "코스닥150 지수를 따라가는 KODEX 코스닥150(229200) 시세로 그렸고, 구성종목 비중은 시가총액 비중입니다."),
    ])
    nasdaq = {"key": "nasdaq100", "label": "나스닥100", "ticker": "^NDX", "holdings": etf_holdings("QQQ"), "note": "나스닥100 지수 시세로 그렸고, 구성종목·비중은 QQQ 보유 내역(상위 20개 공시)입니다."}
    us_secs = stock_section(us, wr.get("scores") or {}, [
        ("sp500", "S&P500", "^GSPC", us_caps, "S&P500 지수 시세로 그렸고, 구성종목 비중은 시가총액 비중입니다."),
    ])
    sections["us"] = [us_secs[0], nasdaq] + us_secs[1:]

    # 2026-10-07 사용자 요청: KRX 금현물(ACE, 2021년 상장)은 10년 그래프가 안 돼 GLD(SPDR Gold, 2004년 상장)로 교체
    gold = [{"s": "GLD", "n": "금 현물(SPDR Gold Shares)", "w": 100.0}]
    sections["etf"] = [
        {"key": "spy", "label": "S&P500(SPY)", "ticker": "SPY", "holdings": holding_list(cap_weights(us_caps)), "note": "SPY 시세로 그렸고, 구성종목 비중은 S&P500 시가총액 비중입니다."},
        {"key": "qqq", "label": "나스닥100(QQQ)", "ticker": "QQQ", "holdings": etf_holdings("QQQ"), "note": "QQQ 시세와 보유 내역(상위 20개 공시)입니다."},
        {"key": "sox", "label": "필라델피아 반도체(SOX)", "ticker": "^SOX", "holdings": etf_holdings("SOXX"), "note": "필라델피아 반도체 지수 시세로 그렸고, 구성종목은 지수를 따라가는 SOXX 보유 내역(상위 20개 공시)입니다."},
        {"key": "kodex200", "label": "코스피200(KODEX)", "ticker": "069500.KS", "holdings": holding_list(cap_weights(k200)), "note": "KODEX 200(069500) 시세로 그렸고, 구성종목 비중은 코스피200 시가총액 비중입니다."},
        {"key": "gold", "label": "금(GLD)", "ticker": "GLD", "holdings": gold, "note": "SPDR Gold Shares(GLD) 시세입니다. 금고에 보관한 실물 금만 담는 세계 최대 금 ETF입니다."},
    ]

    cby = {}
    for c in crypto:
        b = (c.get("displayName") or c["symbol"].split("-")[0]).upper()
        if c.get("marketCap"):
            cby.setdefault(b, c)

    def coin_rows(bases):
        return [cby[b] for b in bases if b in cby]

    cd20 = ["BTC", "ETH", "XRP", "SOL", "BNB", "DOGE", "ADA", "LINK", "XLM", "AVAX", "HBAR", "LTC", "BCH", "DOT", "UNI", "NEAR", "AAVE", "ICP", "APT", "FIL"]
    bw10 = ["BTC", "ETH", "XRP", "SOL", "ADA", "LINK", "SUI", "AVAX", "LTC", "BCH"]
    nci = ["BTC", "ETH", "XRP", "SOL", "ADA", "LINK", "XLM", "LTC", "AVAX", "UNI", "DOT", "HBAR"]
    sections["crypto"] = [
        {"key": "cd20", "label": "CoinDesk 20 Index", "holdings": holding_list(cap_weights(coin_rows(cd20), cap_limit=30)),
         "note": "CoinDesk 20 구성 코인(스테이블코인 제외 대형 20종)을 시가총액 비중(한 코인 최대 30%)으로 담았습니다. 구성은 공개 자료 기준 근사치입니다."},
        {"key": "bitwise10", "label": "Bitwise 10 Crypto Index", "holdings": holding_list(cap_weights(coin_rows(bw10))),
         "note": "Bitwise 10 구성 코인 10종을 시가총액 비중으로 담았습니다. 구성은 공개 자료 기준 근사치입니다."},
        {"key": "nci", "label": "Nasdaq Crypto Index", "holdings": holding_list(cap_weights(coin_rows(nci))),
         "note": "나스닥 크립토 지수 구성 코인을 시가총액 비중으로 담았습니다. 구성은 공개 자료 기준 근사치입니다."},
    ]
    # 코인 이름은 한글(스냅샷의 name)로
    for st in sections["crypto"]:
        for h in st["holdings"]:
            h["n"] = (next((c.get("name") for c in crypto if c["symbol"] == h["s"]), None)) or h["n"]

    for sec in sections.values():
        for i, st in enumerate(sec):
            st["color"] = COLORS[i % len(COLORS)]

    # ---- 시세 수집 ----
    need = set()
    for sec in sections.values():
        for st in sec:
            if st.get("ticker"):
                need.add(st["ticker"])
            else:
                need.update(h["s"] for h in st["holdings"])
    need = sorted(need)
    print(f"시세 조회 {len(need)}종목 × 2", flush=True)
    daily, weekly = {}, {}

    def fetch(sym):
        return sym, chart_points(sym, "1y", "1d"), chart_points(sym, "10y", "1wk")

    with ThreadPoolExecutor(max_workers=4) as ex:
        for i, (sym, d, w) in enumerate(ex.map(fetch, need)):
            daily[sym], weekly[sym] = d, w
            if (i + 1) % 25 == 0:
                print(f"  {i + 1}/{len(need)}", flush=True)
    # 동시 요청이 몰리면 야후가 일부를 거절한다 — 빈 종목만 천천히 한 번씩 더(최대 3바퀴)
    for rnd in range(3):
        missing = [s for s in need if not daily.get(s) or not weekly.get(s)]
        if not missing:
            break
        print(f"재시도 {rnd + 1}: {len(missing)}종목", flush=True)
        time.sleep(5)
        for sym in missing:
            _, d, w = fetch(sym)
            daily[sym] = daily.get(sym) or d
            weekly[sym] = weekly.get(sym) or w
            time.sleep(0.6)
    missing = [s for s in need if not daily.get(s)]
    if missing:
        print("시세 없음:", missing, flush=True)

    def pack(series):
        return {"t": [t for t, _ in series], "v": [v for _, v in series]}

    for name, sec in sections.items():
        for st in sec:
            if st.get("ticker"):
                s1 = single_series(daily.get(st["ticker"]) or [], "d")
                s10 = single_series(weekly.get(st["ticker"]) or [], "w")
            else:
                hw = [(h["s"], h["w"]) for h in st["holdings"]]
                s1 = basket_series(hw, daily, "d")
                s10 = basket_series(hw, weekly, "w")
            st["series"] = {"1y": pack(s1), "10y": pack(s10)}
            last = lambda s: s[-1][1] - 100 if s else None
            print(f"[{name}] {st['label']}: 종목 {len(st['holdings'])} · 1년 {last(s1) and round(last(s1), 1)}% · 10년 {last(s10) and round(last(s10), 1)}%", flush=True)

    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": "투자분석 탭 — 투자처별 투자방법 구성종목(비중순 최대 30)과 1년 일봉·10년 주봉 수익 지수(시작=100). scripts/build-invest-analysis.py",
        "sections": sections,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("저장:", OUT, os.path.getsize(OUT) // 1024, "KB")
    bad = [st["label"] for sec in sections.values() for st in sec if len(st["series"]["1y"]["t"]) < 50 or not st["holdings"]]
    if bad:
        print("⚠️ 데이터 부족:", bad)
        sys.exit(1)


if __name__ == "__main__":
    main()
