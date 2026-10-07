"""실적발표 일정 — data/earnings-calendar.json (2026-10-08 사용자 요청)

미국(S&P500): 나스닥 실적 캘린더(api.nasdaq.com/api/calendar/earnings?date=)를 오늘-14일 ~ +100일 평일마다 조회
  · next: 앞으로 가장 가까운 실적발표일(확정 일정) + 장 시작 전/후
  · last: 최근 14일 안에 실적을 발표한 날 → 앱이 7일 동안 이름 옆에 '실적' 마크
  · 최근 실적 발표일 last는 SEC 8-K Item 2.02(실적 보도자료) 제출일로 보충
한국(코스피200·코스닥150): DART 공시목록(list.json)에서 최근 120일의 '영업(잠정)실적' 공정공시와 분기·반기·사업보고서
  · last: 가장 최근 실적 시즌에 처음 실적이 나온 날(잠정실적이 있으면 그날) — DART_API_KEY가 없으면 이전 값 유지
  · next(nextEst=true): 발표 예정일을 미리 공시하지 않아 작년 같은 시기 첫 실적 공시일 + 364일로 추정

로컬: python scripts/build-earnings-calendar.py   (DART_API_KEY 있으면 한국도)
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "earnings-calendar.json")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KST = timezone(timedelta(hours=9))
# SEC는 User-Agent에 연락처를 요구 — scan-us-workforce.py·scan-us-annual-financials.js와 같은 값
SEC_UA = {"User-Agent": "MarketMap research hyhykhy6@gmail.com", "Accept": "application/json"}


def get_json(url, tries=3, headers=None, timeout=25):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json", **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            err = e
            time.sleep(2 * (k + 1))
    # API 키가 로그(공개 저장소의 Actions 로그)에 찍히지 않게 crtfc_key 값은 가린다
    safe = re.sub(r"crtfc_key=[^&]+", "crtfc_key=***", url)
    print("  실패:", safe[:120], err, flush=True)
    return None


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f)


def us_calendar(_today):
    # 미국 날짜·시각(동부시간, 서머타임 근사 UTC-4/-5)으로 판단 — 한국 날짜로 보면 아직 안 나온 실적을 '나옴'으로 잘못 봄
    now_utc = datetime.now(timezone.utc)
    dst = 3 <= now_utc.month <= 10 or (now_utc.month == 11 and now_utc.day < 3)
    now_et = now_utc + timedelta(hours=-4 if dst else -5)
    today = now_et.date()
    universe = {c["symbol"] for c in load("sector-map/data/sp500-sectors.json")["companies"]}
    out = {}
    ok_days = 0
    d = today - timedelta(days=14)
    end = today + timedelta(days=100)
    while d <= end:
        if d.weekday() < 5:
            js = get_json(f"https://api.nasdaq.com/api/calendar/earnings?date={d.isoformat()}", headers={"Origin": "https://www.nasdaq.com", "Referer": "https://www.nasdaq.com/"})
            rows = ((js or {}).get("data") or {}).get("rows") or []
            if js is not None:
                ok_days += 1
            for r in rows:
                sym = (r.get("symbol") or "").strip().upper().replace(".", "-").replace("/", "-")
                if sym not in universe:
                    continue
                e = out.setdefault(sym, {})
                iso = d.isoformat()
                when = {"time-pre-market": "pre", "time-after-hours": "after"}.get(r.get("time") or "", "")
                # 오늘 장 시작 전 발표는 이미 나온 것(last), 오늘 장 마감 후·시간 미정은 아직 예정(next)
                released = d < today or (d == today and ((when == "pre" and now_et.hour >= 9) or (when == "after" and now_et.hour >= 17)))
                if not released:
                    if "next" not in e or iso < e["next"]:
                        e["next"], e["nextTime"], e["fq"] = iso, when, r.get("fiscalQuarterEnding") or ""
                if released:
                    if "last" not in e or iso > e["last"]:
                        e["last"] = iso
            time.sleep(0.4)
        d += timedelta(days=1)
    print(f"미국: 날짜 {ok_days}일 조회, 종목 {len(out)}개", flush=True)
    if ok_days < 20:
        return None
    # 최근 실적 발표일(2026-10-08 사용자 요청: 재무정보 옆에 항상) — SEC 8-K 중 Item 2.02(Results of Operations) = 실적 발표 보도자료
    ciks = {s: v.get("cik") for s, v in load("data/us-annual-financials.json")["items"].items() if v.get("cik")}
    got = 0
    for sym in sorted(universe):
        cik = ciks.get(sym)
        if not cik:
            continue
        js = get_json(f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json", tries=2, headers=SEC_UA)
        rec = ((js or {}).get("filings") or {}).get("recent") or {}
        best = None
        nxt = (out.get(sym) or {}).get("next")
        for form, fdate, items in zip(rec.get("form") or [], rec.get("filingDate") or [], rec.get("items") or []):
            if form in ("8-K", "8-K/A") and "2.02" in (items or "") and fdate <= today.isoformat():
                # 다음 실적일 45일 안쪽의 2.02(테슬라 분기 인도량 발표 등)는 실적 발표가 아님
                if nxt and (date.fromisoformat(nxt) - date.fromisoformat(fdate)).days < 45:
                    continue
                best = fdate if best is None or fdate > best else best
        if best:
            e = out.setdefault(sym, {})
            # 나스닥 캘린더의 최근 발표일(14일 안)은 그대로 믿고, 없을 때만 SEC 날짜
            if not e.get("last"):
                e["last"] = best
            got += 1
        time.sleep(0.12)
    print(f"미국: SEC 8-K 실적 발표일 {got}종목", flush=True)
    us_reported_revenue(out, today)
    return out


def us_reported_revenue(out, today):
    """최근 45일 안에 발표한 종목 — 야후 quoteSummary(earnings)의 분기 매출(발표 당일 갱신)로 직전 분기 대비 %
    야후 분기 재무(timeseries)는 10-Q가 나와야 바뀌어 몇 주 늦다(2026-10-08 확인)"""
    import http.cookiejar
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    hdr = {"User-Agent": UA}
    try:
        try:
            op.open(urllib.request.Request("https://fc.yahoo.com", headers=hdr), timeout=15)
        except Exception:
            pass  # 404여도 쿠키는 받음
        crumb = op.open(urllib.request.Request("https://query1.finance.yahoo.com/v1/test/getcrumb", headers=hdr), timeout=15).read().decode()
    except Exception as e:
        print("  야후 crumb 실패:", type(e).__name__, flush=True)
        return
    n = 0
    for sym, e in out.items():
        if not e.get("last") or (today - date.fromisoformat(e["last"])).days > 45:
            continue
        try:
            url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{urllib.parse.quote(sym)}?modules=earnings&crumb={urllib.parse.quote(crumb)}"
            with op.open(urllib.request.Request(url, headers=hdr), timeout=20) as resp:
                d = json.loads(resp.read().decode("utf-8"))
            q = d["quoteSummary"]["result"][0]["earnings"]["financialsChart"]["quarterly"]
            cur, prv = q[-1], q[-2]
            a, b = (cur.get("revenue") or {}).get("raw"), (prv.get("revenue") or {}).get("raw")
            if a and b:
                e["rep"] = {"date": e["last"], "q": cur.get("date"), "qoq": round((a / b - 1) * 100, 2), "src": "yahoo"}
                n += 1
        except Exception:
            pass
        time.sleep(0.25)
    print(f"미국: 발표 매출(야후 실적 요약) {n}종목", flush=True)


KR_KEYWORDS = ("영업(잠정)실적", "분기보고서", "반기보고서", "사업보고서")


def kr_filings(syms, key, bgn, end):
    """[bgn, end] 사이 실적 관련 공시 → {symbol: [날짜…]} — 한 번에 길게 물으면 DART가 늦게 답해(2026-10-08 타임아웃) 15일씩 나눔"""
    out = {}
    a = bgn
    while a <= end:
        b = min(a + timedelta(days=14), end)
        for sym, ds in kr_filings_chunk(syms, key, a, b).items():
            out.setdefault(sym, []).extend(ds)
        a = b + timedelta(days=1)
    return out


PRELIM = {}  # symbol -> [(rcept_dt, rcept_no)] 잠정실적 공시


def parse_prelim_revenue(raw):
    """영업(잠정)실적 공시 본문(document.xml 압축) → 매출액 {cur 당기, prev 직전 분기} — 표의 첫 '매출액' 줄"""
    import html as _html
    import io
    import zipfile
    try:
        z = zipfile.ZipFile(io.BytesIO(raw))
        txt = "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist())
    except Exception:
        return None
    for row in re.findall(r"<TR[^>]*>(.*?)</TR>", txt, re.S | re.I):
        cells = [_html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<T[DHEU][^>]*>(.*?)</T[DHEU]>", row, re.S | re.I)]
        if not cells or not re.sub(r"\s", "", cells[0]).startswith("매출액"):
            continue
        nums = []
        for c in cells[1:]:
            t = re.sub(r"[\s,]", "", c).replace("△", "-")
            neg = t.startswith("(") and t.endswith(")")
            t = t.strip("()")
            if re.fullmatch(r"-?\d+(\.\d+)?", t):
                nums.append(-float(t) if neg else float(t))
        if len(nums) >= 2 and nums[1]:
            return {"cur": nums[0], "prev": nums[1]}
    return None


def kr_prelim_results(key, today):
    """최근 45일 잠정실적 공시마다 매출 직전 분기 대비 % → {symbol: {"rep": {...}}}"""
    out = {}
    for sym, lst in PRELIM.items():
        dt, no = max(lst)
        if (today - date(int(dt[:4]), int(dt[4:6]), int(dt[6:]))).days > 45:
            continue
        try:
            req = urllib.request.Request(f"https://opendart.fss.or.kr/api/document.xml?crtfc_key={key}&rcept_no={no}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
        except Exception as e:
            print("  잠정실적 본문 실패:", sym, type(e).__name__, flush=True)
            continue
        rv = parse_prelim_revenue(raw)
        if rv:
            out[sym] = {"date": f"{dt[:4]}-{dt[4:6]}-{dt[6:]}", "qoq": round((rv["cur"] / rv["prev"] - 1) * 100, 2), "src": "잠정"}
        time.sleep(0.3)
    print(f"한국: 잠정실적 매출 {len(out)}종목", flush=True)
    return out


def kr_filings_chunk(syms, key, bgn, end):
    out = {}
    for ty in ("I", "A"):
        for cls in ("Y", "K"):
            page = 1
            while True:
                q = urllib.parse.urlencode({"crtfc_key": key, "bgn_de": bgn.strftime("%Y%m%d"), "end_de": end.strftime("%Y%m%d"), "pblntf_ty": ty, "corp_cls": cls, "page_no": page, "page_count": 100})
                js = get_json(f"https://opendart.fss.or.kr/api/list.json?{q}", tries=4, timeout=60)
                if not js or js.get("status") not in ("000", "013"):
                    print("  DART 응답:", (js or {}).get("status"), (js or {}).get("message"), flush=True)
                    if not js or js.get("status") not in ("013",):
                        raise RuntimeError("DART 조회 실패")
                    break
                for it in js.get("list") or []:
                    code = (it.get("stock_code") or "").strip()
                    nm = it.get("report_nm") or ""
                    # [기재정정]·[첨부정정]·[첨부추가]는 예전 보고서 고침이라 새 실적이 아님
                    if code in syms and any(k in nm for k in KR_KEYWORDS) and not re.search(r"\[(기재정정|첨부정정|첨부추가|발행조건확정)\]", nm):
                        dt = it.get("rcept_dt")
                        out.setdefault(syms[code], []).append(f"{dt[:4]}-{dt[4:6]}-{dt[6:]}")
                        if "잠정" in nm and it.get("rcept_no"):
                            PRELIM.setdefault(syms[code], []).append((dt, it["rcept_no"]))
                if page >= int(js.get("total_page") or 1):
                    break
                page += 1
                time.sleep(0.3)
    return out


def kr_calendar(today, key):
    syms = {c["symbol"].split(".")[0]: c["symbol"] for c in load("sector-map/data/kr-sectors.json")["companies"]}
    try:
        recent = {}
        for a, b in ((today - timedelta(days=120), today - timedelta(days=61)), (today - timedelta(days=60), today)):
            for sym, ds in kr_filings(syms, key, a, b).items():
                recent.setdefault(sym, []).extend(ds)
        # 작년 같은 시기(오늘-1년-3일 ~ +60일) 첫 실적 공시 → +364일(같은 요일)을 다음 발표 예상일로
        ly = kr_filings(syms, key, today - timedelta(days=368), today - timedelta(days=305))
    except RuntimeError:
        return None
    out = {}
    for sym in set(recent) | set(ly):
        e = {}
        ds = sorted(set(recent.get(sym, [])))
        if ds:
            latest = date.fromisoformat(ds[-1])
            # 같은 시즌(최근 공시 40일 안) 중 처음 나온 날 — 잠정실적이 있으면 그날
            e["last"] = min(d for d in ds if date.fromisoformat(d) >= latest - timedelta(days=40))
        season_done = ds and (today - date.fromisoformat(e["last"])).days <= 40
        cand = [date.fromisoformat(d) + timedelta(days=364) for d in sorted(set(ly.get(sym, [])))]
        cand = [d for d in cand if d >= today - timedelta(days=1)]
        if cand and not season_done:
            e["next"], e["nextEst"] = cand[0].isoformat(), True
        if e:
            out[sym] = e
    for sym, rep in kr_prelim_results(key, today).items():
        out.setdefault(sym, {})["rep"] = rep
    print(f"한국: 최근 실적 공시 {sum(1 for v in out.values() if 'last' in v)}종목 · 다음 발표 예상 {sum(1 for v in out.values() if 'next' in v)}종목", flush=True)
    return out


def main():
    today = datetime.now(KST).date()
    prev = {}
    if os.path.exists(OUT):
        try:
            prev = load("data/earnings-calendar.json")
        except Exception:
            prev = {}
    us = us_calendar(today)
    if us is None:
        print("미국 조회 실패 — 이전 값 유지", flush=True)
        us = prev.get("us") or {}
    key = os.environ.get("DART_API_KEY")
    kr = kr_calendar(today, key) if key else None
    if kr is None:
        print("한국: DART_API_KEY 없음 또는 실패 — 이전 값 유지", flush=True)
        kr = prev.get("kr") or {}
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": "실적발표 일정 — us: 나스닥 실적 캘린더(next 예정일·nextTime pre/after·last 최근 발표일), kr: DART 잠정실적·정기보고서 첫 공시일(last). scripts/build-earnings-calendar.py",
        "us": us,
        "kr": kr,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("저장:", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
