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
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import strategy_backtest as sb  # noqa: E402  (매달 리밸런싱 백테스트)

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


SECONDARY_SHARE_CLASS = {"GOOG", "FOX", "NWS"}

# 코인 용도별 분류(지도 sector-map/app.js의 CRYPTO_PURPOSE와 같은 표) — 코인 섹터 순환 매매용
CRYPTO_PURPOSE = {}
for _cat, _bases in [
    ("가치저장", "BTC WBTC CBBTC BTCB LBTC BTCT XAUT PAXG GRAM"),
    ("결제·송금", "XRP XLM LTC BCH DASH BSV XEC"),
    ("스테이블코인", "USDT USDC USDS DAI USDE USD USD1 USDT0 USDG PYUSD RLUSD USDY USDD BFUSD SUSDE USDGO USDF USDCE AETHUSDT SYRUPUSDC TUSD FDUSD EURC U"),
    ("플랫폼·스마트컨트랙트", "ETH SOL ADA TRX AVAX DOT NEAR SUI TON ICP ETC HBAR ALGO ATOM MNT POL KAS XTZ EGLD SEI APT ARB OP PI A BERA CC CFX ELF GAS IOTA LINEA MEGA MINA MON NEO QTUM SOON STX TIA VET XPL ZETA ZIL ZK PLUME PROS"),
    ("금융서비스", "BNB LEO CRO OKB BGB GT KCS HTX UNI AAVE SKY MKR ONDO ENA MORPHO JLP JST HYPE ASTER WLFI LDO INJ COMP CRV SNX CAKE RAY JUP BTW 1INCH AERO BABY CFG CHIP COW DEEP DRV EDGE ETHFI FF FLUID JTO KMNO LIT ORCA PENDLE RAIN SPK SUN SYRUP XCN ZRX"),
    ("스테이킹·랩드", "STETH WSTETH WBETH WEETH RSETH RETH LSETH JITOSOL BNSOL WETH AETHWETH WBNB WTRX KHYPE"),
    ("AI·데이터", "LINK TAO VVV WLD FET GRT RENDER RNDR FIL AR THETA TFUEL AKT ATH AWE BTT DATA GEOD GLM IO KAITO KITE LPT OPEN PYTH SENT TRAC VIRTUAL WAL"),
    ("프라이버시", "XMR ZEC ZAMA"),
    ("밈·커뮤니티", "DOGE SHIB PEPE PUMP BONK WIF FLOKI TRUMP FARTCOIN BRETT M PENGU SPX"),
    ("게임·메타버스", "SAND MANA AXS IMX GALA ENJ RON BEAM SUPER NXPC"),
    ("NFT", "APE BLUR"),
]:
    for _b in _bases.split():
        CRYPTO_PURPOSE[_b] = _cat


def crypto_category(symbol):
    import re
    base = re.sub(r"\d+$", "", symbol.upper().replace("-USD", ""))
    if base in CRYPTO_PURPOSE:
        return CRYPTO_PURPOSE[base]
    return "스테이블코인" if "USD" in base else "기타"


RULE_NOTES = {
    "winrate": "매달 1일, 상장 {yrs}년 이상 종목 중 직전 최대 120개월 월간 승률 TOP20을 5%씩 보유합니다.",
    "high52": "매달 1일, 52주 가격 구간 상단 10% 안(신고가 근처) 종목 중 시가총액 TOP20을 5%씩 보유합니다. 20개가 안 되면 나머지는 현금입니다.",
    "low52": "매달 1일, 52주 가격 구간 하단 10% 안(신저가 근처) 종목 중 시가총액 TOP20을 5%씩 보유합니다. 20개가 안 되면 나머지는 현금입니다.",
    "sector": "매달 1일, 지난달 한 달 수익률 1위 섹터의 시가총액 TOP20을 5%씩 보유합니다(20개가 안 되면 종목 수로 균등).",
}
LABELS = {"winrate": "10년 승률 매매", "high52": "52주 신고가 매매", "low52": "52주 신저가 매매", "sector": "섹터 순환 매매"}


def monthly_strategies(market, universe, *, min_months, sector_min, yrs):
    """매달 리밸런싱 백테스트로 4개 투자방법 → {key: strategy dict}"""
    syms = [u["symbol"] for u in universe]
    names = {u["symbol"]: u["name"] for u in universe}
    print(f"[{market}] 백테스트용 주봉(전체 기간) {len(syms)}종목", flush=True)
    weekly = sb.fetch_all(syms, "max", "1wk")
    picks, sector_hist = sb.backtest(universe, weekly, min_months=min_months, sector_min=sector_min)
    cur = max(picks["winrate"])
    recent = set()
    for p in picks.values():
        for M, hold in p.items():
            if M >= cur - 13:
                recent.update(s for s, _ in hold)
    print(f"[{market}] 최근 1년 보유 종목 일봉 {len(recent)}종목", flush=True)
    daily = sb.fetch_all(sorted(recent), "2y", "1d")
    one_year_ago = time.time() - 365 * 86400
    out = {}
    for key in ("winrate", "high52", "sector", "low52"):
        p = picks[key]
        s10 = sb.index_series(p, weekly, "w")
        s1 = [x for x in sb.index_series({M: v for M, v in p.items() if M >= cur - 13}, daily, "d") if x[0] >= one_year_ago]
        if s1:
            b = s1[0][1]
            s1 = [(t, round(v / b * 100, 3)) for t, v in s1]
        hold = p.get(cur) or []
        holdings = [{"s": s, "n": names.get(s, s), "w": round(w * 100, 2)} for s, w in sorted(hold, key=lambda x: names.get(x[0], x[0]))]
        cash = round(100 - sum(h["w"] for h in holdings), 2)
        if cash >= 0.5:
            holdings.append({"s": "", "n": "현금", "w": cash})
        st = {
            "key": key,
            "label": LABELS[key],
            "holdings": holdings,
            "note": RULE_NOTES[key].format(yrs=yrs),
            "series": {"1y": {"t": [t for t, _ in s1], "v": [v for _, v in s1]}, "10y": {"t": [t for t, _ in s10], "v": [v for _, v in s10]}},
            "rebalance": sb.mlabel(cur),
        }
        if key == "sector":
            st["sectorHistory"] = [{"m": sb.mlabel(M - 1), "sector": sector_hist[M][0], "ret": round(sector_hist[M][1], 2)} for M in sorted(sector_hist)[-6:][::-1]]
            if cur in sector_hist:
                st["note"] += f" 이번 달은 {sector_hist[cur][0]}({sector_hist[cur][1]:+.1f}%)."
        else:
            st["changes"] = sb.changes(p, names, 6)
        out[key] = st
        print(f"[{market}] {st['label']}: 이번 달 {len(hold)}종목 · 1년 {s1 and round(s1[-1][1] - 100, 1)}% · 10년 {s10 and round(s10[-1][1] - 100, 1)}%", flush=True)
    return out


def main():
    kr = load("sector-map/data/kr-sectors.json")["companies"]
    us = load("sector-map/data/sp500-sectors.json")["companies"]
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
        us_by = {c["symbol"]: c for c in us}
        for r in rows:
            if r["s"] in us_by:
                r["n"] = us_by[r["s"]].get("name") or r["n"]
        return rows[:TOP_N]

    def stock_universe(rows):
        return [{"symbol": c["symbol"], "name": c.get("name") or c["symbol"], "sector": c.get("sectorKo") or c.get("sector"), "cap": c.get("marketCap")} for c in rows if c.get("marketCap")]

    sections = {}
    # 한국(2026-10-07 사용자 지정 순서): 10년 승률 · 52주 신고가 · 코스피200 · 섹터 순환 · 코스닥150 · 52주 신저가
    krm = monthly_strategies("kr", stock_universe([c for c in kr if c.get("marketCap")]), min_months=60, sector_min=5, yrs=5)
    sections["kr"] = [
        krm["winrate"],
        krm["high52"],
        {"key": "kospi200", "label": "코스피200", "ticker": "069500.KS", "holdings": holding_list(cap_weights(k200)), "note": "코스피200 지수를 따라가는 KODEX 200(069500) 시세로 그렸고(야후에 지수 시세가 없음), 구성종목 비중은 시가총액 비중입니다."},
        krm["sector"],
        {"key": "kosdaq150", "label": "코스닥150", "ticker": "229200.KS", "holdings": holding_list(cap_weights(kq150)), "note": "코스닥150 지수를 따라가는 KODEX 코스닥150(229200) 시세로 그렸고, 구성종목 비중은 시가총액 비중입니다."},
        krm["low52"],
    ]
    # 미국: 같은 규칙, 비교군 S&P500
    usm = monthly_strategies("us", stock_universe(us_caps), min_months=60, sector_min=5, yrs=5)
    sections["us"] = [
        usm["winrate"],
        usm["high52"],
        {"key": "sp500", "label": "S&P500", "ticker": "^GSPC", "holdings": holding_list(cap_weights(us_caps)), "note": "S&P500 지수 시세로 그렸고, 구성종목 비중은 시가총액 비중입니다."},
        usm["sector"],
        {"key": "nasdaq100", "label": "나스닥100", "ticker": "^NDX", "holdings": etf_holdings("QQQ"), "note": "나스닥100 지수 시세로 그렸고, 구성종목·비중은 QQQ 보유 내역(상위 20개 공시)입니다."},
        usm["low52"],
    ]

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
    nci = ["BTC", "ETH", "XRP", "SOL", "ADA", "LINK", "XLM", "LTC", "AVAX", "UNI", "DOT", "HBAR"]
    # 코인(2026-10-07 사용자 요청): Bitwise 10 삭제, 주식과 같은 4개 규칙 추가 — 10년 승률은 상장 3년 이상.
    # 스테이블코인·스테이킹/랩드 토큰(원본 코인과 값이 같음)은 비교군에서 뺀다
    coin_uni = [
        {"symbol": c["symbol"], "name": c.get("name") or c["symbol"], "sector": crypto_category(c["symbol"]), "cap": c["marketCap"]}
        for c in crypto
        if c.get("marketCap") and crypto_category(c["symbol"]) not in ("스테이블코인", "스테이킹·랩드")
    ]
    for u in coin_uni:
        if u["sector"] == "기타":
            u["sector"] = None  # 분류가 없는 코인은 섹터 순환 후보에서 제외
    cm = monthly_strategies("crypto", coin_uni, min_months=36, sector_min=3, yrs=3)
    sections["crypto"] = [
        {"key": "cd20", "label": "CoinDesk 20 Index", "holdings": holding_list(cap_weights(coin_rows(cd20), cap_limit=30)),
         "note": "CoinDesk 20 구성 코인(스테이블코인 제외 대형 20종)을 시가총액 비중(한 코인 최대 30%)으로 담았습니다. 구성은 공개 자료 기준 근사치입니다."},
        {"key": "nci", "label": "Nasdaq Crypto Index", "holdings": holding_list(cap_weights(coin_rows(nci))),
         "note": "나스닥 크립토 지수 구성 코인을 시가총액 비중으로 담았습니다. 구성은 공개 자료 기준 근사치입니다."},
        cm["winrate"],
        cm["high52"],
        cm["sector"],
        cm["low52"],
    ]
    for st in sections["crypto"][:2]:
        for h in st["holdings"]:
            h["n"] = (next((c.get("name") for c in crypto if c["symbol"] == h["s"]), None)) or h["n"]

    for sec in sections.values():
        for i, st in enumerate(sec):
            st["color"] = COLORS[i % len(COLORS)]

    # ---- 지수형·현재 바구니형(코인 지수) 시세 ----
    need = set()
    for sec in sections.values():
        for st in sec:
            if st.get("series"):
                continue
            if st.get("ticker"):
                need.add(st["ticker"])
            else:
                need.update(h["s"] for h in st["holdings"])
    need = sorted(need)
    print(f"지수·바구니 시세 조회 {len(need)}종목 × 2", flush=True)
    daily = sb.fetch_all(need, "1y", "1d")
    weekly = sb.fetch_all(need, "10y", "1wk")

    def pack(series):
        return {"t": [t for t, _ in series], "v": [v for _, v in series]}

    for name, sec in sections.items():
        for st in sec:
            if st.get("series"):
                continue
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
        "description": "투자분석 탭 — 투자처별 투자방법 구성종목과 1년 일봉·10년 주봉 수익 지수(시작=100). 승률·신고가·신저가·섹터 순환은 매달 1일 리밸런싱 백테스트(scripts/strategy_backtest.py). scripts/build-invest-analysis.py",
        "sections": sections,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("저장:", OUT, os.path.getsize(OUT) // 1024, "KB")
    bad = [st["label"] for sec in sections.values() for st in sec if len(st["series"]["1y"]["t"]) < 50]
    if bad:
        print("⚠️ 데이터 부족:", bad)
        sys.exit(1)


if __name__ == "__main__":
    main()
