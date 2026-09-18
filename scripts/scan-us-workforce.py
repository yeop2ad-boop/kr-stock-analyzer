# 리스크 탭(미국) — S&P500(승률 DB 종목)의 직원 수·직원 중위 연봉을 최근 2개 연도로 SEC 공시에서 수집해
# data/us-workforce.json에 저장한다. 미국은 DART처럼 "평균 급여"를 공시하지 않으므로:
#  - 직원 수: 10-K 본문(Item 1 Human Capital)의 "approximately N employees" 문장 (XBRL 태그 없음, 2026-09-19 frames API 404 확인)
#  - 임금: 위임장(DEF 14A) CEO Pay Ratio 공시의 "median employee" 연간 총보상 — 평균이 아니라 중위값
# 사업보고서는 1년에 한 번이라 연 1~2회 로컬 실행으로 충분: python scripts/scan-us-workforce.py [TICKER ...]
# (API 키 불필요, SEC는 User-Agent에 연락처만 요구 — scan-us-annual-financials.js와 같은 UA)
import html
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT_FILE = os.path.join(ROOT, "data", "us-workforce.json")
DB_FILE = os.path.join(ROOT, "data", "winrate-scores-us.json")
UA = {"User-Agent": "MarketMap research hyhykhy6@gmail.com", "Accept-Encoding": "identity"}
GAP = 0.12  # SEC 권장 초당 10회 이하 — 문서 다운로드 시간이 대부분이라 스레드 4개여도 실측 초당 4~7회


def get(url, as_json=False):
    for attempt in range(4):
        try:
            time.sleep(GAP)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                raw = r.read()
            return json.loads(raw) if as_json else raw.decode("utf-8", "ignore")
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(2 + attempt * 3)


def to_text(doc):
    doc = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", doc)
    doc = re.sub(r"(?s)<[^>]+>", " ", doc)
    doc = html.unescape(doc).replace("\xa0", " ")
    return re.sub(r"\s+", " ", doc)


def num(s):
    return int(s.replace(",", ""))


# ---------- 직원 수 ----------
# "As of December 31, 2025 and 2024, our Company had approximately 65,900 and 69,700 employees, respectively"(한 문장에 2개 연도),
# "As of December 31, 2025, JPMorganChase had 318,512 employees globally" 같은 기준일·보유 문장만 인정한다.
# "over 29,000 employees globally advancing their careers"(교육·승진 인원) 같은 부분 인원 문장을 걸러내려고
# 문장 안에 기준 표현(as of / we had / employed / workforce …)이 있어야 하고, 후보 중 가장 큰 값(전사 합계)을 쓴다.
NUM = r"(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:million|thousand)|\d{3,7})"
EMP_NOUN = r"(?:employees|associates|team members|people|colleagues|workers|personnel|staff|FTEs|full[- ]time equivalents)"
# 숫자와 명사 사이 수식어(최대 4단어, "(56%) hourly" 포함) — 표의 "4,052 Number of regular employees", 자사주 표의
# "172,777 were acquired from employees"(할리버튼)를 잡지 않게 동사·전치사·shares 제외
EMP_RE = re.compile(NUM + r"(?:\s+and\s+" + NUM + r")?\s+(?:(?!number\b|of\b|shares?\b|were\b|was\b|from\b|by\b|to\b|for\b|in\b|acquired\b|withheld\b|held\b)[\w\-()%]+\s+){0,4}?" + EMP_NOUN + r"(?:[^.]{0,80}?\brespectively\b)?", re.I)
ANCHOR = re.compile(r"\bas of\b|\bat (?:the end of|year[- ]end)|\bwe (?:had|have|employ|employed)\b|\bemploy(?:s|ed)?\b|\bworkforce\b|\bheadcount\b|\bnumber of\b|\bworldwide\b|\bglobally\b|\bhad (?:approximately|about|over|more than|nearly)\b", re.I)
# 부분 인원을 가리키는 표현 — 문장 전체가 아니라 숫자 바로 앞 100자·숫자~명사 사이에서만 본다
# ("… 2.1 million associates as of January 31, 2026, to better serve our customers"처럼 뒤에 붙은 단어로 버리지 않게)
SKIP = ("retire", "pension", "plan participants", "shareholders", "holders of record", "advancing", "took advantage", "trained", "participated", "volunteer", "promoted", "hired", "union", "collective bargaining", "represent", "tuition", "claims", "former", "approximately 40%", "located in", "located outside", "outside the u", "in the u.s", "in the united states", "internationally", "spirit")
# "total workforce was approximately 182,000"(보잉), "The number of regular employees was 58 thousand, 61 thousand … respectively"(엑슨모빌)
# "our employee headcount worldwide was 125,665"(테슬라)
WORKFORCE_RE = re.compile(r"(?:total |global )?(?:workforce|(?:employee )?headcount(?: worldwide| globally)?|number of (?:\w+ )?employees)(?: (?:was|were|totaled|of|consisted of|included|is))(?: approximately| about| over| more than| nearly)?\s+" + NUM + r"(?:,?\s+(?:and\s+)?" + NUM + r")?", re.I)


def num_val(raw):
    raw = raw.lower().strip()
    if "million" in raw:
        return float(raw.split()[0]) * 1_000_000
    if "thousand" in raw:
        return float(raw.split()[0]) * 1_000
    return float(num(raw))


def parse_headcount(text):
    """(올해 인원, 같은 문장에 적힌 작년 인원 또는 None)"""
    # "human capital"이 목차·사업개요 등 여러 번 나오므로 모든 위치 주변을 한 후보군으로 본다
    # (CRH: 첫 위치엔 미주 사업부 49,828명만, 뒤쪽 Human Capital에 전사 83,032명)
    lows = text.lower()
    spots = [m.start() for m in re.finditer("human capital", lows)][:6]
    windows = [" ".join(text[max(0, i - 3000) : i + 12000] for i in spots)] if spots else []
    windows.append(text[:500000])
    for w in windows:
        best = None
        for sent in re.split(r"(?<=[a-z0-9)])\.\s+(?=[A-Z])", w):
            if len(sent) > 1500 or not ANCHOR.search(sent):
                continue
            matches = list(EMP_RE.finditer(sent)) + list(WORKFORCE_RE.finditer(sent))
            for m in matches:
                near = (sent[max(0, m.start() - 100) : m.start()] + m.group(0)).lower()
                if any(k in near for k in SKIP):
                    continue
                after = sent[m.end() : m.end() + 60].lower()
                if any(k in after for k in ("union", "represented", "collective bargaining")):
                    continue
                a = num_val(m.group(1))
                if 1900 <= a <= 2100 and "," not in m.group(1):
                    continue  # 연도를 인원으로 오인
                if a < 50 or a > 2_500_000:
                    continue  # 월마트(210만)보다 큰 값은 주식 수 등 오인
                respectively = "respectively" in (m.group(0) + sent[m.end() : m.end() + 120]).lower()
                b = num_val(m.group(2)) if m.group(2) and respectively else None
                if b is not None:
                    years = [int(y) for y in re.findall(r"\b(20\d\d)\b", sent[: m.start()])]
                    if len(years) >= 2 and years[-2] < years[-1]:
                        a, b = b, a  # "2024 and 2025 … X and Y, respectively"처럼 옛 연도가 먼저 나온 경우
                if best is None or a > best[0]:
                    best = (a, b)
            # GM: "we employed approximately 88,000 (56%) hourly employees and approximately 68,000 (44%) salaried employees"
            low = sent.lower()
            if "hourly" in low and "salaried" in low and re.search(r"\bemploy", low):
                parts = [num_val(m.group(1)) for m in EMP_RE.finditer(sent) if re.search(r"hourly|salaried", m.group(0), re.I)]
                if len(parts) == 2 and (best is None or sum(parts) > best[0]):
                    best = (sum(parts), None)
        if best:
            return int(best[0]), (int(best[1]) if best[1] else None)
    return None, None


# ---------- 직원 중위 연봉(CEO Pay Ratio) ----------
# "the 2025 annual total compensation of our median compensated employee was $139,483" 처럼 "median"과
# 직원 표현이 함께 있는 문장의 달러 금액. CEO 보수(수백만 달러)·비교 기업 중앙값(median peer)은 범위·단어로 제외.
MONEY = re.compile(r"\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?)")


def parse_median_pay(text):
    for sent in re.split(r"(?<=[a-z0-9)])\.\s+(?=[A-Z●•])", text):
        low = sent.lower()
        if "median" not in low or "peer" in low or len(sent) > 900:
            continue
        if not re.search(r"median (?:compensated )?(?:employee|associate|team member|colleague|worker)|median (?:annual )?(?:total )?compensation of (?:all|our)", low):
            continue
        for m in MONEY.finditer(sent):
            v = float(m.group(1).replace(",", ""))
            if 8_000 <= v <= 600_000:  # 처치앤드와이트처럼 같은 표 행에 CEO 급여($986,580)가 먼저 나오는 경우 건너뛰기
                return int(round(v))
    return None


def filings(cik, form, n=2):
    sub = get(f"https://data.sec.gov/submissions/CIK{cik:010d}.json", as_json=True)
    pages = [sub["filings"]["recent"]]
    out = []
    while pages:
        r = pages.pop(0)
        for f, acc, doc, rep, fdate in zip(r["form"], r["accessionNumber"], r["primaryDocument"], r["reportDate"], r["filingDate"]):
            if f == form:
                out.append({"url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{doc}", "period": rep, "filed": fdate})
                if len(out) == n:
                    return out, sub
        # JPM처럼 공시가 많은 회사는 "recent"(최근 1,000건)가 1년도 안 돼 이전 10-K가 뒷 페이지에 있음
        if r is sub["filings"]["recent"]:
            for extra in sub["filings"].get("files", [])[:6]:
                pages.append(get(f"https://data.sec.gov/submissions/{extra['name']}", as_json=True))
    return out, sub


# company_tickers.json이 지주회사 개편 등으로 10-K 이력이 없는 새 CIK를 가리키는 경우의 예외
CIK_OVERRIDE = {"XOM": 34088}


def scan(ticker, cik):
    res = {"ticker": ticker, "cik": cik}
    try:
        tenks, sub = filings(cik, "10-K")
        res["name"] = sub.get("name")
        proxies, _ = filings(cik, "DEF 14A")
        cur, prev_same = (None, None)
        if tenks:
            cur, prev_same = parse_headcount(to_text(get(tenks[0]["url"])))
        if cur:
            res["headcount"], res["headcountPeriod"] = cur, tenks[0]["period"]
            prev = prev_same
            if prev is None and len(tenks) > 1:
                prev = parse_headcount(to_text(get(tenks[1]["url"])))[0]
            # 파싱 오류 방지: 1년 새 절반 이하·두 배 이상은 인수합병·분사가 아니면 대개 다른 문장을 잘못 읽은 것이라 버림
            if prev and 0.5 <= cur / prev <= 2:
                res["headcountPrevYear"] = prev
        pays = [parse_median_pay(to_text(get(f["url"]))) for f in proxies[:2]]
        if pays and pays[0]:
            res["medianPay"], res["medianPayFiled"] = pays[0], proxies[0]["filed"]
            # 같은 금액이면 다른 해 문구를 다시 읽은 것으로 보고 버림(포드 2025·2026 위임장이 모두 $76,076으로 읽힌 사례)
            if len(pays) > 1 and pays[1] and pays[1] != pays[0] and 0.4 <= pays[0] / pays[1] <= 2.5:
                res["medianPayPrevYear"], res["medianPayPrevFiled"] = pays[1], proxies[1]["filed"]
    except Exception as e:
        res["error"] = str(e)[:200]
    return res


SECTORS_FILE = os.path.join(ROOT, "sector-map", "data", "sp500-sectors.json")


def apply_display_names(results):
    """SEC 등록명("TRACTOR SUPPLY CO /DE/") 대신 지도 데이터의 짧은 이름("Tractor Supply")을 name에 넣는다."""
    try:
        raw = json.load(open(SECTORS_FILE, encoding="utf-8-sig"))
    except Exception:
        return
    names = {}

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("symbol"), str) and isinstance(o.get("name"), str):
                names.setdefault(o["symbol"].upper(), o["name"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(raw)
    for r in results:
        t = r["ticker"]
        n = names.get(t) or names.get(t.replace("-", ".")) or names.get(t.replace(".", "-"))
        if n:
            r["name"] = n


def main():
    ct = get("https://www.sec.gov/files/company_tickers.json", as_json=True)
    cik_of = {v["ticker"].upper(): int(v["cik_str"]) for v in ct.values()}
    if len(sys.argv) > 1:
        tickers = [t.upper() for t in sys.argv[1:]]
    else:
        db = json.load(open(DB_FILE, encoding="utf-8-sig"))
        scores = db.get("scores", db)
        tickers = sorted(scores.keys()) if isinstance(scores, dict) else sorted(x["symbol"] for x in scores)
    jobs = []
    for t in tickers:
        cik = CIK_OVERRIDE.get(t) or cik_of.get(t) or cik_of.get(t.replace(".", "-")) or cik_of.get(t.replace("-", "."))
        if cik:
            jobs.append((t, cik))
        else:
            print("CIK 없음:", t, flush=True)
    results = []
    with ThreadPoolExecutor(4) as ex:
        for i, r in enumerate(ex.map(lambda j: scan(*j), jobs), 1):
            results.append(r)
            if len(sys.argv) > 1 or i % 25 == 0:
                print(i, json.dumps(r, ensure_ascii=False), flush=True)
    if len(sys.argv) > 1:
        return  # 샘플 테스트는 저장하지 않음
    apply_display_names(results)
    out = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "SEC EDGAR — 10-K 본문 직원 수(Human Capital), 위임장(DEF 14A) CEO Pay Ratio 직원 중위 연간 총보상",
        "items": {r["ticker"]: {k: v for k, v in r.items() if k != "ticker"} for r in results},
    }
    json.dump(out, open(OUT_FILE, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    print("저장:", len(results))


if __name__ == "__main__":
    main()
