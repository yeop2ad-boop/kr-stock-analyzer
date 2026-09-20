# 리스크 탭 결측 보완 — SEC/DART에서 못 구한 항목을 야후 분기 재무로 채운다.
# 왜 필요한가(2026-09-21 점검에서 확인):
#   · 포드·애보트: 연결 손익계산서 매출을 비차원 태그로 공시하지 않아 SEC companyconcept에서 안 잡힘
#   · ASML·CCEP 등 유럽 상장사: 보고 통화가 EUR라 USD만 읽던 코드에서 통째로 빠짐(비율 지표라 통화는 무관)
#   · 국내 은행·보험: "매출액" 계정 자체가 없음(이자·수수료·보험수익으로 나뉨) → 야후의 총수익을 사용
# 실행: python scripts/fill-risk-gaps.py [kr|us|all]
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

KR_FILE = "data/dart-financials.json"
US_FILE = "data/us-workforce.json"
YUA = {"User-Agent": "Mozilla/5.0"}
TYPES = "quarterlyTotalRevenue,quarterlyNetIncome,quarterlyTotalLiabilitiesNetMinorityInterest,quarterlyStockholdersEquity,quarterlyBasicEPS,quarterlyDilutedEPS"


def y_timeseries(symbol):
    url = (
        f"https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}?symbol={symbol}"
        f"&type={TYPES}&period1=1600000000&period2={int(time.time())}"
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
        for key, rows in r.items():
            if key in ("meta", "timestamp") or not isinstance(rows, list):
                continue
            series = {}
            for v in rows:
                if not v:
                    continue
                raw = (v.get("reportedValue") or {}).get("raw")
                if v.get("asOfDate") and raw is not None:
                    series[v["asOfDate"]] = float(raw)
            if series:
                out[key] = series
    return out


def yoy(series):
    """(최근 값, 1년 전 같은 분기 값, 최근일, 1년 전 날짜)"""
    if not series:
        return None, None, None, None
    dates = sorted(series)
    cur = dates[-1]
    cy, cm, cd = map(int, cur.split("-"))
    want = [d for d in dates[:-1] if int(d[:4]) == cy - 1 and abs(int(d[5:7]) - cm) <= 1]
    if not want:
        return series[cur], None, cur, None
    prev = want[-1]
    return series[cur], series[prev], cur, prev


def pct(a, b):
    return ((a - b) / abs(b) * 100) if (a is not None and b not in (None, 0)) else None


def fill_one(sym, item, name):
    """부족한 항목만 야후 값으로 채운다(이미 있는 값은 건드리지 않음)"""
    q = item.get("quarter") or {}
    db = item.get("debt") or {}
    eps = item.get("eps") or {}
    need_q = q.get("revenue") is None or q.get("netIncome") is None
    need_d = db.get("changePp") is None and not db.get("negativeEquity")
    need_e = eps.get("current") is None
    if not (need_q or need_d or need_e):
        return None
    ts = y_timeseries(sym)
    if not ts:
        return None
    filled = []
    if need_q:
        rc, rp, rend, rprev = yoy(ts.get("quarterlyTotalRevenue", {}))
        nc, np_, nend, _ = yoy(ts.get("quarterlyNetIncome", {}))
        if rc is not None or nc is not None:
            item["quarter"] = {
                "label": "야후 분기 실적",
                "quarterLabel": "분기",
                "dateTo": rend or nend or q.get("dateTo"),
                "dateFrom": rprev or q.get("dateFrom"),
                "yearTo": (rend or nend or "")[:4],
                "yearFrom": (rprev or "")[:4] or None,
                "revenue": rc if rc is not None else q.get("revenue"),
                "revenuePrev": rp,
                "revenuePct": pct(rc, rp) if (rp or 0) > 0 else None,
                "netIncome": nc if nc is not None else q.get("netIncome"),
                "netIncomePrev": np_,
                "netIncomePct": pct(nc, np_) if (np_ or 0) > 0 else None,
                "niTurnedLoss": (nc is not None and np_ is not None and np_ > 0 and nc < 0),
                "source": "yahoo",
            }
            filled.append("분기")
    if need_d:
        liab = ts.get("quarterlyTotalLiabilitiesNetMinorityInterest", {})
        equity = ts.get("quarterlyStockholdersEquity", {})
        ratios = {d: liab[d] / equity[d] * 100 for d in liab if equity.get(d) and equity[d] > 0 and liab[d] > 0}
        neg = any(v <= 0 for v in equity.values())
        cur, prev, cend, pend = yoy(ratios)
        if cur is not None:
            item["debt"] = {
                "current": cur,
                "prev": prev,
                "changePp": (cur - prev) if prev is not None else None,
                "tinyEquity": cur > 1000,
                "negativeEquity": neg and cur is None,
                "dateTo": cend,
                "dateFrom": pend,
                "label": "야후 분기 재무상태표",
                "periodTo": cend,
                "periodFrom": pend,
                "source": "yahoo",
            }
            filled.append("부채")
    if need_e:
        series = ts.get("quarterlyBasicEPS") or ts.get("quarterlyDilutedEPS") or {}
        cur, prev, cend, pend = yoy(series)
        if cur is not None:
            item["eps"] = {
                "current": cur,
                "prev": prev,
                "changePct": pct(cur, prev) if (prev or 0) > 0 else None,
                "turnedLoss": (prev is not None and prev > 0 and cur < 0),
                "priceCurrent": (item.get("eps") or {}).get("priceCurrent"),
                "pricePrev": (item.get("eps") or {}).get("pricePrev"),
                "priceChangePct": (item.get("eps") or {}).get("priceChangePct"),
                "periodFrom": pend,
                "periodTo": cend,
                "dateFrom": pend,
                "dateTo": cend,
                "reportLabel": "야후 분기 실적",
                "source": "yahoo",
            }
            filled.append("EPS")
    return f"{name}: {', '.join(filled)}" if filled else None


def run_kr():
    data = json.load(open(KR_FILE, encoding="utf-8-sig"))
    items = data["items"]
    todo = [i for i in items if (i.get("quarter") or {}).get("revenue") is None or (i.get("quarter") or {}).get("netIncome") is None or (i.get("debt") or {}).get("changePp") is None or (i.get("eps") or {}).get("current") is None]
    print("한국 보완 대상", len(todo), flush=True)
    with ThreadPoolExecutor(4) as ex:
        for msg in ex.map(lambda i: fill_one(i["symbol"], i, i["corpName"]), todo):
            if msg:
                print("  ", msg, flush=True)
    json.dump(data, open(KR_FILE, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)


def run_us():
    data = json.load(open(US_FILE, encoding="utf-8-sig"))
    items = data["items"]
    todo = [t for t, v in items.items() if (v.get("quarter") or {}).get("revenue") is None or (v.get("quarter") or {}).get("netIncome") is None or ((v.get("debt") or {}).get("changePp") is None and not (v.get("debt") or {}).get("negativeEquity")) or (v.get("eps") or {}).get("current") is None]
    print("미국 보완 대상", len(todo), flush=True)
    with ThreadPoolExecutor(4) as ex:
        for msg in ex.map(lambda t: fill_one(t, items[t], t), todo):
            if msg:
                print("  ", msg, flush=True)
    json.dump(data, open(US_FILE, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("kr", "all"):
        run_kr()
    if which in ("us", "all"):
        run_us()
    print("완료")
