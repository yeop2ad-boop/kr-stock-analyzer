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
                ni = (cur.get("earnings") or {}).get("raw")
                e["rep"] = {"date": e["last"], "q": cur.get("date"), "qoq": round((a / b - 1) * 100, 2), "rev": a, "ni": ni, "src": "yahoo"}
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
    # 표 위 "(단위 : 억원)" 같은 표기 → 원 단위로
    plain = re.sub(r"<[^>]+>", " ", txt)
    um = re.search(r"단위\s*[:：]?\s*(조원|억원|백만원|천원|원)", plain)
    unit = {"조원": 1e12, "억원": 1e8, "백만원": 1e6, "천원": 1e3, "원": 1}.get(um.group(1) if um else "", None)
    found = {}
    for row in re.findall(r"<TR[^>]*>(.*?)</TR>", txt, re.S | re.I):
        cells = [_html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<T[DHEU][^>]*>(.*?)</T[DHEU]>", row, re.S | re.I)]
        if not cells:
            continue
        head = re.sub(r"\s", "", cells[0])
        key = "rev" if head.startswith("매출액") else "ni" if head.startswith("당기순이익") else None
        if not key or key in found:
            continue
        nums = []
        for c in cells[1:]:
            t = re.sub(r"[\s,]", "", c).replace("△", "-")
            neg = t.startswith("(") and t.endswith(")")
            t = t.strip("()")
            if re.fullmatch(r"-?\d+(\.\d+)?", t):
                nums.append(-float(t) if neg else float(t))
        if len(nums) >= 2:
            found[key] = nums
    if "rev" not in found or not found["rev"][1]:
        return None
    out = {"cur": found["rev"][0], "prev": found["rev"][1]}
    if unit:
        out["rev"] = found["rev"][0] * unit
        if "ni" in found:
            out["ni"] = found["ni"][0] * unit
    return out


DEBUG = []  # 잠정실적 본문 표 몇 개(키 없음) — 파서 점검용, data/earnings-debug.json


def fetch_doc(key, no):
    try:
        req = urllib.request.Request(f"https://opendart.fss.or.kr/api/document.xml?crtfc_key={key}&rcept_no={no}", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except Exception as e:
        print("  잠정실적 본문 실패:", no, type(e).__name__, flush=True)
        return None


def doc_text(raw):
    import io
    import zipfile
    try:
        z = zipfile.ZipFile(io.BytesIO(raw))
        return "\n".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist())
    except Exception:
        return None


def is_monthly(txt):
    """실적 기간이 한 달짜리(월별 매출 잠정 공시 — 이마트·신세계 등)인지"""
    plain = re.sub(r"<[^>]+>", " ", txt)
    for m in re.finditer(r"(\d{4})\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})\s*일?\s*~\s*(\d{4})\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})", plain):
        try:
            a = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            b = date(int(m.group(4)), int(m.group(5)), int(m.group(6)))
        except ValueError:
            continue
        return 0 <= (b - a).days < 45
    return bool(re.search(r"월간|월별\s*실적", plain))


# ---------- 정기보고서(분기·반기·사업보고서)의 매출·순이익을 DART에서 바로 읽기 (2026-11-20 사용자 요청) ----------
# 예전: 잠정실적 공시를 하지 않는 회사는 '발표일'(분기보고서 제출일)만 잡히고 실제 숫자는 네이버 증권 분기 재무가 올라올 때까지
#       (보통 1~3주) 화면에 "실제 반영 전"으로 남았다 — 11/20 기준 최근실적 125종목 중 97종목.
# 지금: 보고서가 나온 날 DART 단일회사 주요계정(fnlttSinglAcnt)에서 그 분기 3개월 매출·순이익과 직전 분기 매출을 읽어 rep에 넣는다.
#   · 12월 결산 기준 이름만 처리한다: 분기보고서(03)=1분기 · 반기보고서(06)=2분기 · 분기보고서(09)=3분기 · 사업보고서(12)=4분기(연간 − 3분기 누적)
#   · 연결 우선, 당기·직전 분기는 같은 재무제표(연결/별도)에서. 값이 이상하면(직전 분기 대비 5배 초과·1/5 미만) 버리고 예전처럼 둔다.
PERIODIC = {}  # symbol -> [(rcept_dt, report_nm, corp_code)] 정기보고서
PREV_KR = {}  # 직전 실행 결과의 kr — 이미 읽은 보고서는 다시 묻지 않는다
_REV_RE = re.compile(r"^(매출액|수익\(매출액\)|영업수익|매출|순영업수익|보험료수익|이자수익)$")
_NI_RE = re.compile(r"^(당기순이익|당기순이익\(손실\)|당기순손익|연결당기순이익|분기순이익|반기순이익)")
_ACNT_CACHE = {}


def _to_num(s):
    if s is None:
        return None
    t = str(s).replace(",", "").strip()
    if not t or t == "-":
        return None
    try:
        return float(t)
    except ValueError:
        return None


def dart_accounts(key, corp, year, code):
    """주요계정 → {"CFS": {"rev": (3개월, 누적), "ni": (3개월, 누적)}, "OFS": {...}} · 없으면 None"""
    ck = (corp, year, code)
    if ck in _ACNT_CACHE:
        return _ACNT_CACHE[ck]
    q = urllib.parse.urlencode({"crtfc_key": key, "corp_code": corp, "bsns_year": year, "reprt_code": code})
    js = get_json(f"https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?{q}", tries=2, timeout=40)
    time.sleep(0.15)
    out = None
    if js and js.get("status") == "000" and js.get("list"):
        out = {}
        for r in js["list"]:
            div = r.get("fs_div")
            nm = re.sub(r"\s", "", r.get("account_nm") or "")
            k = "rev" if _REV_RE.match(nm) else "ni" if _NI_RE.match(nm) else None
            if not k or div not in ("CFS", "OFS") or k in out.setdefault(div, {}):
                continue
            out[div][k] = (_to_num(r.get("thstrm_amount")), _to_num(r.get("thstrm_add_amount")))
    elif js and js.get("status") in ("020", "021"):
        raise RuntimeError("DART 한도 초과")
    _ACNT_CACHE[ck] = out
    return out


def report_quarter(nm):
    """보고서 이름 → (사업연도, 분기 1~4) · 12월 결산 모양이 아니면 None"""
    m = re.search(r"\((\d{4})\.(\d{2})\)", nm or "")
    if not m:
        return None
    y, mm = int(m.group(1)), m.group(2)
    if "사업보고서" in nm and mm == "12":
        return y, 4
    if "반기보고서" in nm and mm == "06":
        return y, 2
    if "분기보고서" in nm and mm == "03":
        return y, 1
    if "분기보고서" in nm and mm == "09":
        return y, 3
    return None


_Q_CODE = {1: "11013", 2: "11012", 3: "11014", 4: "11011"}


def quarter_values(key, corp, year, qn, div):
    """그 분기 3개월 값 {"rev":…, "ni":…} — 4분기는 연간에서 3분기 누적을 뺀다"""
    a = dart_accounts(key, corp, year, _Q_CODE[qn])
    a = a and a.get(div)
    if not a:
        return None
    if qn != 4:
        # 2·3분기 보고서는 3개월 값(thstrm_amount)과 누적 값(thstrm_add_amount)이 따로 온다 — 누적이 3개월보다 충분히 크지 않으면
        # 3개월 값인지 확신할 수 없으니 쓰지 않는다(누적을 3개월로 잘못 읽으면 '직전 분기 대비'가 엉뚱해진다)
        rv = a.get("rev")
        if qn in (2, 3) and rv and rv[0] and rv[0] > 0 and not (rv[1] is not None and rv[1] > rv[0] * 1.2):
            return None
        return {k: v[0] for k, v in a.items()}
    b = dart_accounts(key, corp, year, "11014")
    b = b and b.get(div)
    if not b:
        return None
    out = {}
    for k, v in a.items():
        cum = b.get(k) and b[k][1]
        if v[0] is not None and cum is not None:
            out[k] = v[0] - cum
    return out


def kr_report_rep(key, corp, year, qn):
    """정기보고서 → {"rev","ni","prev","qoq"} (3개월 기준) · 못 읽으면 None"""
    for div in ("CFS", "OFS"):
        cur = quarter_values(key, corp, year, qn, div)
        if not cur or not cur.get("rev"):
            continue
        py, pq = (year, qn - 1) if qn > 1 else (year - 1, 4)
        prv = quarter_values(key, corp, py, pq, div)
        rev, prev_rev = cur["rev"], prv and prv.get("rev")
        if rev <= 0 or not prev_rev or prev_rev <= 0:
            continue
        ratio = rev / prev_rev
        if ratio > 5 or ratio < 0.2:  # 3개월·누적이 섞였거나 계정이 달라진 경우 — 틀린 숫자를 '실제'로 보여 주느니 뺀다
            continue
        out = {"rev": rev, "prev": prev_rev, "qoq": round((ratio - 1) * 100, 2)}
        if cur.get("ni") is not None:
            out["ni"] = cur["ni"]
        return out
    return None


def kr_report_scan(key, today, reps):
    """최근 45일 안에 정기보고서를 낸 회사 중 잠정실적 값이 없는(또는 순이익이 빠진) 회사 → rep 채움. 돌려주는 값: 새로 채운 종목 수"""
    n_new = n_ni = n_keep = 0
    for sym, lst in PERIODIC.items():
        dt, nm, corp = max(lst, key=lambda x: x[0])
        d = date(int(dt[:4]), int(dt[4:6]), int(dt[6:]))
        yq = report_quarter(nm)
        if (today - d).days > 45 or not yq or not corp:
            continue
        qlabel = f"{yq[1]}Q{yq[0]}"
        have = reps.get(sym)
        old = (PREV_KR.get(sym) or {}).get("rep") or {}
        if have and have.get("ni") is None and old.get("ni") is not None and old.get("date") == have.get("date"):
            have["ni"] = old["ni"]  # 지난 실행에서 보태 둔 순이익
        if have and have.get("ni") is not None:
            continue
        if not have and old.get("src") == "보고서" and old.get("q") == qlabel and old.get("date") == d.isoformat():
            reps[sym] = old  # 지난 실행에서 읽어 둔 값 그대로
            n_keep += 1
            continue
        try:
            v = kr_report_rep(key, corp, yq[0], yq[1])
        except RuntimeError as e:
            print("  ", e, "— 정기보고서 읽기를 여기서 멈춤", flush=True)
            break
        if not v:
            continue
        if have:
            # 잠정실적에 순이익이 없던 회사(삼성전자·셀트리온 등): 같은 분기 매출이 맞을 때만 순이익을 보탠다
            if v.get("ni") is not None and have.get("rev") and abs(v["rev"] / have["rev"] - 1) < 0.03:
                have["ni"] = v["ni"]
                n_ni += 1
            continue
        reps[sym] = {"date": d.isoformat(), "q": qlabel, "src": "보고서", **v}
        n_new += 1
    print(f"한국: 정기보고서 매출 {n_new}종목 새로 읽음 · 이어 씀 {n_keep} · 순이익 보탬 {n_ni}", flush=True)
    return n_new


NONMONTHLY = {}  # symbol -> {잠정실적 중 분기 실적(월별 아님)으로 확인된 공시일 "YYYYMMDD"}


def kr_prelim_scan(key, today):
    """최근 60일 잠정실적 공시 본문 → (월간 공시 회사 집합, {symbol: rep})"""
    monthly, reps = set(), {}
    for sym, lst in PRELIM.items():
        for dt, no in sorted(set(lst), reverse=True):
            d = date(int(dt[:4]), int(dt[4:6]), int(dt[6:]))
            if (today - d).days > 60:
                break
            raw = fetch_doc(key, no)
            txt = raw and doc_text(raw)
            time.sleep(0.3)
            if not txt:
                continue
            if False:  # 점검용 표 덤프(2026-10-08 확인 끝, 필요하면 True)
                rows = []
                for row in re.findall(r"<TR[^>]*>(.*?)</TR>", txt, re.S | re.I)[:30]:
                    cells = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<T[DHEU][^>]*>(.*?)</T[DHEU]>", row, re.S | re.I)]
                    rows.append(" | ".join(cells))
                DEBUG.append({"sym": sym, "date": dt, "no": no, "monthly": is_monthly(txt), "rows": rows})
            if is_monthly(txt):
                monthly.add(sym)
                continue
            NONMONTHLY.setdefault(sym, set()).add(dt)
            if sym in reps or (today - d).days > 45:
                continue
            rv = parse_prelim_revenue(raw)
            if rv:
                rep = {"date": d.isoformat(), "qoq": round((rv["cur"] / rv["prev"] - 1) * 100, 2), "src": "잠정"}
                if rv.get("rev"):
                    rep["rev"] = rv["rev"]
                if rv.get("ni") is not None:
                    rep["ni"] = rv["ni"]
                reps[sym] = rep
    print(f"한국: 잠정실적 매출 {len(reps)}종목 · 월간 공시 제외 {len(monthly)}종목", flush=True)
    return monthly, reps


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
                        elif "잠정" not in nm and bgn >= date.today() - timedelta(days=200):
                            PERIODIC.setdefault(syms[code], []).append((dt, nm, it.get("corp_code")))
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
    monthly, reps = kr_prelim_scan(key, today)
    try:
        kr_report_scan(key, today, reps)
    except Exception as e:  # 여기서 무슨 일이 나도 일정 자체는 예전처럼 만든다
        print("  정기보고서 읽기 실패:", type(e).__name__, str(e)[:120], flush=True)
    for sym in monthly:
        # 월별 매출 공시만 뺀다 — 분기 잠정실적으로 확인된 날은 남겨서 발표일(last)이 분기보고서 날짜로 밀리지 않게(현대차·기아 등, 2026-11-20)
        keep = NONMONTHLY.get(sym, set())
        drop = {f"{dt[:4]}-{dt[4:6]}-{dt[6:]}" for dt, _ in PRELIM.get(sym, []) if dt not in keep}
        recent[sym] = [d for d in recent.get(sym, []) if d not in drop]
        ly[sym] = [d for d in ly.get(sym, []) if d not in drop and not (sym in monthly and False)]
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
    for sym, rep in reps.items():
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
    PREV_KR.update(prev.get("kr") or {})
    kr = kr_calendar(today, key) if key else None
    if kr is None:
        print("한국: DART_API_KEY 없음 또는 실패 — 이전 값 유지", flush=True)
        kr = prev.get("kr") or {}
    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": "실적발표 일정 — us: 나스닥 실적 캘린더(next 예정일·nextTime pre/after·last 최근 발표일), kr: DART 잠정실적·정기보고서 첫 공시일(last), rep = 그 분기 매출·순이익(src 잠정: 잠정실적 공시 본문 / 보고서: 정기보고서 주요계정, prev = 직전 분기 매출). scripts/build-earnings-calendar.py",
        "us": us,
        "kr": kr,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print("저장:", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
