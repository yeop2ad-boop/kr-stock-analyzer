# 리스크 탭 ⑥섹터 매출 성장 — data/sector-revenue.json 생성.
# 최근 분기 매출과 직전 분기 매출을 종목마다 모아 업종별로 합산하고, 하락한 순으로 정렬한다.
# 공시(DART/SEC)에서 분기 매출을 못 구하는 종목이 많아(국내 은행·보험은 매출액 계정 자체가 없음,
# 미국은 비차원 태그 미사용·유로 보고 등) 시세 제공처의 분기 매출을 공통 소스로 쓴다.
# 실행: python scripts/build-sector-revenue.py
import json
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

OUT = "data/sector-revenue.json"
KR_FILE = "data/dart-financials.json"
US_FILE = "data/us-workforce.json"
YUA = {"User-Agent": "Mozilla/5.0"}


def quarterly_revenue(symbol):
    url = (
        f"https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}?symbol={symbol}"
        f"&type=quarterlyTotalRevenue&period1=1600000000&period2={int(time.time())}"
    )
    for _ in range(3):
        try:
            js = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=YUA), timeout=30))
            break
        except Exception:
            time.sleep(1.5)
    else:
        return {}
    out = {}
    for r in js.get("timeseries", {}).get("result", []):
        for v in r.get("quarterlyTotalRevenue", []) or []:
            raw = (v or {}).get("reportedValue", {}).get("raw")
            if v and v.get("asOfDate") and raw is not None:
                out[v["asOfDate"]] = float(raw)
    return out


def latest_two(series):
    if len(series) < 2:
        return None, None, None, None
    dates = sorted(series)
    cur, prev = dates[-1], dates[-2]
    # 분기 두 개가 실제로 이어지는지 확인(60~130일)
    y1, m1, d1 = map(int, cur.split("-"))
    y2, m2, d2 = map(int, prev.split("-"))
    gap = (y1 - y2) * 12 + (m1 - m2)
    if not 2 <= gap <= 4:
        return None, None, None, None
    return series[cur], series[prev], cur, prev


def collect(entries):
    rows = []

    def work(e):
        s = quarterly_revenue(e["symbol"])
        cur, prev, cd, pd = latest_two(s)
        if cur is None or not prev or prev <= 0:
            return None
        return {
            "symbol": e["symbol"],
            "name": e["name"],
            "sector": e["sector"] or "기타",
            "latest": cur,
            "prev": prev,
            "growthPct": (cur - prev) / prev * 100,
            "dateTo": cd,
            "dateFrom": pd,
        }

    with ThreadPoolExecutor(4) as ex:
        for i, r in enumerate(ex.map(work, entries), 1):
            if r:
                rows.append(r)
            if i % 100 == 0:
                print("  ", i, "/", len(entries), flush=True)
    return rows


def group(rows):
    by = defaultdict(list)
    for r in rows:
        by[r["sector"]].append(r)
    out = []
    for sector, members in by.items():
        a = sum(m["latest"] for m in members)
        b = sum(m["prev"] for m in members)
        g = sorted(m["growthPct"] for m in members)
        mid = len(g) // 2
        out.append(
            {
                "sector": sector,
                "count": len(members),
                "growthPct": (a - b) / b * 100 if b else None,
                "avgPct": sum(g) / len(g),
                "medianPct": g[mid] if len(g) % 2 else (g[mid - 1] + g[mid]) / 2,
            }
        )
    out.sort(key=lambda s: s["growthPct"] if s["growthPct"] is not None else 0)
    return out


def main():
    kr = json.load(open(KR_FILE, encoding="utf-8-sig"))["items"]
    us = json.load(open(US_FILE, encoding="utf-8-sig"))["items"]
    kr_entries = [{"symbol": i["symbol"], "name": i.get("corpName") or i["symbol"], "sector": i.get("sector")} for i in kr]
    us_entries = [{"symbol": t, "name": v.get("name") or t, "sector": v.get("sector")} for t, v in us.items()]
    print("한국", len(kr_entries), flush=True)
    kr_rows = collect(kr_entries)
    print("미국", len(us_entries), flush=True)
    us_rows = collect(us_entries)
    basis = max((r["dateTo"] for r in kr_rows), default=None)
    us_basis = max((r["dateTo"] for r in us_rows), default=None)
    data = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "note": "섹터별 최근 분기 매출 성장(직전 분기 대비). 종목별 분기 매출은 시세 제공처 기준, 섹터 성장률은 소속 기업 매출 합계.",
        "kr": {"basis": f"최근 분기({basis}) vs 직전 분기", "sectors": group(kr_rows), "companies": kr_rows},
        "us": {"basis": f"최근 분기({us_basis}) vs 직전 분기", "sectors": group(us_rows), "companies": us_rows},
    }
    json.dump(data, open(OUT, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    print("한국", len(kr_rows), "곳 /", len(data["kr"]["sectors"]), "섹터 · 미국", len(us_rows), "곳 /", len(data["us"]["sectors"]), "섹터")


if __name__ == "__main__":
    main()
