# "AI투데이" — 매일 아침 한국 증시 / 미국 증시 / 비트코인의 오늘 이슈 TOP5를 AI로 정리해 data/ai-today.json 으로 저장.
# 2026-10-14: 언론사 RSS·기사는 약관상 자동 수집·AI 요약·재게시가 막혀 있어(코인 매체는 명시적 금지) 쓰지 않는다. 대신
#   · 한국 증시  = DART 전자공시(법정 공시) 중 코스피200·코스닥150 기업의 중요한 공시
#   · 미국 증시  = SEC EDGAR 8-K 공시(법정 공시) 중 S&P500 기업의 중요한 공시
#   · 비트코인   = 시세·공포탐욕지수 같은 시장 숫자(기사 문장은 쓰지 않음)
# 를 재료로 쓰고, AI는 제목·항목명·숫자만 보고 쉬운 말로 풀어쓴다. ETF는 화면에서 한국 5 + 미국 5를 합쳐 TOP10으로 보여준다.
# GitHub Actions(.github/workflows/ai-today-daily.yml)에서 매일 실행. 표준 라이브러리만 사용.
#
# 로컬 수동 실행: DART_API_KEY=... ANTHROPIC_API_KEY=... python scripts/scan-ai-today.py
#   (DART_API_KEY가 없으면 DART 공개 RSS(최근 50건)로 대신하고, --candidates 를 주면 AI를 부르지 않고 후보만 JSON으로 출력)
import html
import http.cookiejar
import json
import os
import re
import statistics
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT_FILE = os.path.join(ROOT, "data", "ai-today.json")
MODEL = os.environ.get("AI_MODEL") or "claude-haiku-5-5"  # 앱의 다른 AI 기능과 같은 모델(요약용이라 가장 저렴한 모델로 충분)
TOP_N = 5
KST = timezone(timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (compatible; marketmap-ai-today-bot; contact hyhykhy6@gmail.com)"}
SEC_UA = {"User-Agent": "marketmap-ai-today-bot hyhykhy6@gmail.com", "Accept-Encoding": "identity"}


def read_json(path):
    return json.load(open(path, encoding="utf-8-sig"))


def http_get(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers=headers or UA)
    return urllib.request.urlopen(req, timeout=timeout).read()


def clean(s):
    s = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", s or "", flags=re.S)
    s = html.unescape(html.unescape(s))
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tag(block, name):
    m = re.search(r"<%s[^>]*>(.*?)</%s>" % (name, name), block, re.S | re.I)
    return m.group(1) if m else ""


# ---------------------------------------------------------------- 한국: DART 공시
# 중요도가 낮은 정형 공시(투자설명서·증권발행실적·감사보고서·지분 변동 보고 등)는 후보에서 뺀다
KR_SKIP = ("투자설명서", "증권발행실적", "감사보고서", "대규모기업집단", "특수관계인", "주식등의대량보유", "임원ㆍ주요주주특정증권등소유", "임원·주요주주특정증권등소유", "기업설명회", "주주총회소집", "효력발생안내", "일괄신고", "결산실적공시예고", "의결권대리행사")


def kr_universe():
    u = read_json(os.path.join(ROOT, "data", "kr-universe-kospi200-kosdaq150.json"))
    ents = (u.get("kospi200") or []) + (u.get("kosdaq150") or [])
    by_code = {e["symbol"].split(".")[0]: e["name"] for e in ents}
    return by_code


def kr_candidates():
    by_code = kr_universe()
    names = set(by_code.values())
    key = os.environ.get("DART_API_KEY")
    out = []
    if key:
        today = datetime.now(KST).date()
        for day in (today - timedelta(days=1), today):
            ds = day.strftime("%Y%m%d")
            for cls in ("Y", "K"):
                page = 1
                while page <= 15:
                    q = urllib.parse.urlencode({"crtfc_key": key, "bgn_de": ds, "end_de": ds, "corp_cls": cls, "page_no": page, "page_count": 100})
                    js = json.loads(http_get("https://opendart.fss.or.kr/api/list.json?" + q).decode("utf-8"))
                    if js.get("status") != "000":
                        if js.get("status") != "013":  # 013 = 조회된 데이터 없음
                            print("  DART 응답 이상:", js.get("status"), js.get("message"), flush=True)
                        break
                    for it in js.get("list") or []:
                        code = (it.get("stock_code") or "").strip()
                        if code in by_code:
                            out.append({"company": it["corp_name"], "title": clean(it["report_nm"]), "rcp": it["rcept_no"], "date": it["rcept_dt"]})
                    if page >= int(js.get("total_page") or 1):
                        break
                    page += 1
        src = "DART 오픈API"
    else:
        # 키가 없으면 DART 공개 RSS(최근 50건)에서 회사 이름으로 대상 종목만 골라 씀(로컬 시험용)
        xml = http_get("https://dart.fss.or.kr/api/todayRSS.xml").decode("utf-8", "replace")
        for m in re.finditer(r"<item>(.*?)</item>", xml, re.S):
            b = m.group(1)
            t = clean(tag(b, "title"))
            mm = re.match(r"\((.*?)\)\s*(.*?)\s+-\s+(.*)", t)
            rcp = re.search(r"rcpNo=(\d+)", tag(b, "link"))
            if mm and mm.group(2) in names and rcp:
                out.append({"company": mm.group(2), "title": mm.group(3), "rcp": rcp.group(1), "date": rcp.group(1)[:8]})
        src = "DART RSS"
    seen, uniq = set(), []
    for c in sorted(out, key=lambda c: c["rcp"], reverse=True):
        if any(k in c["title"] for k in KR_SKIP) or c["rcp"] in seen:
            continue
        seen.add(c["rcp"])
        c["link"] = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=" + c["rcp"]
        c["time"] = datetime.strptime(c["rcp"][:8], "%Y%m%d").replace(tzinfo=KST).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        uniq.append(c)
    print("  %s 기준 대상 종목 공시 %d건" % (src, len(uniq)), flush=True)
    return uniq[:60]


# ---------------------------------------------------------------- 미국: SEC EDGAR 8-K
SEC_ITEM_KO = {
    "1.01": "중요 계약 체결", "1.02": "중요 계약 해지", "1.03": "파산·법정관리", "1.05": "사이버 보안 사고", "2.01": "자산 인수·처분 완료",
    "2.02": "실적 발표", "2.03": "채무 발생", "2.05": "구조조정 비용", "2.06": "자산 손상", "3.01": "상장 유지 관련 통지", "3.02": "미등록 주식 발행",
    "4.01": "감사인 변경", "4.02": "과거 재무제표 수정", "5.01": "경영권 변동", "5.02": "임원·이사 변동", "5.03": "정관 변경", "5.07": "주주총회 결과",
    "7.01": "공정공시(Reg FD)", "8.01": "기타 사건", "9.01": "재무제표·첨부",
}


def us_candidates():
    comps = read_json(os.path.join(ROOT, "sector-map", "data", "sp500-sectors.json"))["companies"]
    sp = {c["symbol"].replace(".", "-"): c["name"] for c in comps}
    tk = json.loads(http_get("https://www.sec.gov/files/company_tickers.json", SEC_UA).decode("utf-8"))
    cik_to = {}
    for v in tk.values():
        t = v["ticker"].upper()
        if t in sp:
            cik_to[int(v["cik_str"])] = t
    out, seen = [], set()
    for start in range(0, 1200, 100):
        url = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=100&output=atom&start=%d" % start
        try:
            xml = http_get(url, SEC_UA).decode("utf-8", "replace")
        except Exception as e:
            print("  EDGAR 페이지 실패(%d): %s" % (start, e), flush=True)
            break
        ents = re.findall(r"<entry>(.*?)</entry>", xml, re.S)
        if not ents:
            break
        for b in ents:
            title = clean(tag(b, "title"))
            m = re.search(r"\((\d{10})\)", title)
            acc = re.search(r"accession-number=([\d-]+)", b)
            if not m or not acc or int(m.group(1)) not in cik_to or acc.group(1) in seen:
                continue
            seen.add(acc.group(1))
            sym = cik_to[int(m.group(1))]
            summ = html.unescape(tag(b, "summary"))
            items = []
            for im in re.finditer(r"Item\s+(\d\.\d\d):\s*([^<\n]+)", summ):
                code = im.group(1)
                if code != "9.01":
                    items.append("%s %s" % (code, SEC_ITEM_KO.get(code, im.group(2).strip()[:40])))
            link = re.search(r'href="([^"]+)"', b)
            upd = clean(tag(b, "updated"))
            try:
                t = datetime.fromisoformat(upd).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                continue
            out.append({"company": sp[sym], "ticker": sym, "title": "8-K · " + (", ".join(items) if items else "기타"), "link": link.group(1) if link else "", "time": t})
        time.sleep(0.3)
    # 경영진 변동·실적·계약·인수 같은 항목이 든 공시를 앞으로
    def score(c):
        s = 0
        for k, w in (("2.02", 5), ("1.01", 4), ("2.01", 4), ("5.02", 3), ("1.05", 4), ("4.02", 4), ("2.06", 3), ("1.03", 5), ("3.01", 3), ("5.01", 3), ("2.05", 3), ("8.01", 1)):
            if k in c["title"]:
                s += w
        return s
    out = [c for c in out if c["link"] and score(c) > 0]
    out.sort(key=lambda c: (score(c), c["time"]), reverse=True)
    print("  EDGAR 기준 대상 종목 공시 %d건" % len(out), flush=True)
    return out[:60]


# ---------------------------------------------------------------- 미국: 선정된 공시 보강(원문 수치 · 예상 대비 · 공시 후 주가)
_yahoo = {}


def yahoo_get(url):
    if "op" not in _yahoo:
        op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        op.addheaders = [("User-Agent", "Mozilla/5.0")]
        try:
            op.open("https://fc.yahoo.com", timeout=20)
        except Exception:
            pass
        _yahoo["op"] = op
        _yahoo["crumb"] = op.open("https://query1.finance.yahoo.com/v1/test/getcrumb", timeout=20).read().decode()
    sep = "&" if "?" in url else "?"
    full = url + sep + "crumb=" + urllib.parse.quote(_yahoo["crumb"]) if "quoteSummary" in url else url
    return json.loads(_yahoo["op"].open(full, timeout=30).read().decode("utf-8"))


def us_eps_surprise(sym, filed_utc):
    """직전 분기 실제 EPS vs 월가 예상(Yahoo earningsHistory) — 공시 시점 근처 분기만 사용"""
    j = yahoo_get("https://query1.finance.yahoo.com/v10/finance/quoteSummary/%s?modules=earningsHistory" % sym)
    hist = j["quoteSummary"]["result"][0]["earningsHistory"]["history"]
    best = None
    for h in hist:
        q = (h.get("quarter") or {}).get("fmt")
        if not q or h.get("epsActual", {}).get("raw") is None or h.get("epsEstimate", {}).get("raw") is None:
            continue
        qd = datetime.strptime(q, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if timedelta(days=0) <= filed_utc - qd <= timedelta(days=75):  # 분기 말 후 75일 안에 낸 실적만
            best = {"quarter": q, "actual": h["epsActual"]["raw"], "estimate": h["epsEstimate"]["raw"], "surprisePct": round((h.get("surprisePercent", {}).get("raw") or 0) * 100, 1)}
    return best


def us_price_reaction(sym, filed_utc):
    """공시 직전 가격 → 가장 최근 가격(장외 포함 5분봉) 변동률"""
    j = yahoo_get("https://query1.finance.yahoo.com/v8/finance/chart/%s?range=5d&interval=5m&includePrePost=true" % sym)
    r = j["chart"]["result"][0]
    pts = [(t, c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c]
    tf = int(filed_utc.timestamp())
    base = None
    for t, c in pts:
        if t <= tf:
            base = c
    if base is None or not pts:
        return None
    return {"pct": round((pts[-1][1] / base - 1) * 100, 2), "base": round(base, 2), "last": round(pts[-1][1], 2)}


def us_exhibit_text(link, limit=5500):
    """공시 첨부 보도자료(EX-99.1) 앞부분 텍스트 — 실적 요약·핵심 수치가 들어 있는 부분"""
    idx = http_get(link, SEC_UA).decode("utf-8", "replace")
    href = None
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", idx, re.S | re.I):
        if re.search(r"EX-99\.1", row):
            m = re.search(r'href="(/Archives/[^"]+\.htm)"', row)
            if m:
                href = m.group(1)
                break
    if not href:
        m = re.search(r'href="(/Archives/[^"]*(?:99|ex)[^"]*\.htm)"', idx, re.I) or re.search(r'href="(/Archives/[^"]+\.htm)"', idx)
        href = m.group(1) if m else None
    if not href:
        return ""
    t = http_get("https://www.sec.gov" + href, SEC_UA, 40).decode("utf-8", "replace")
    t = re.sub(r"<(script|style).*?</\1>", " ", t, flags=re.S | re.I)
    return clean(t)[:limit]


def us_enrich(c):
    filed = datetime.strptime(c["time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    f = {"company": c["company"], "ticker": c["ticker"], "filing": c["title"], "filedUtc": c["time"]}
    for key, fn in (("pressRelease", lambda: us_exhibit_text(c["link"])), ("epsVsEstimate", lambda: us_eps_surprise(c["ticker"], filed)), ("price", lambda: us_price_reaction(c["ticker"], filed))):
        try:
            f[key] = fn()
        except Exception as e:
            print("  보강 실패(%s %s): %s" % (c["ticker"], key, e), flush=True)
            f[key] = None
        time.sleep(0.3)
    return f


# ---------------------------------------------------------------- 비트코인: 시장 숫자
def yahoo_closes(sym):
    js = json.loads(http_get("https://query1.finance.yahoo.com/v8/finance/chart/%s?range=1y&interval=1d" % sym).decode("utf-8"))
    r = js["chart"]["result"][0]
    pts = [(t, c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c]
    return pts, r["meta"]


def crypto_facts():
    btc, meta = yahoo_closes("BTC-USD")
    eth, _ = yahoo_closes("ETH-USD")
    px = [c for _, c in btc]
    last = meta.get("regularMarketPrice") or px[-1]

    def chg(series, days):
        return (series[-1] / series[-1 - days] - 1) * 100 if len(series) > days else None

    ex = [c for _, c in eth]
    rets = [(px[i] / px[i - 1] - 1) for i in range(len(px) - 30, len(px))]
    hi, lo = max(px), min(px)
    f = {
        "price": last,
        "chg1d": chg(px, 1), "chg7d": chg(px, 7), "chg30d": chg(px, 30), "chg90d": chg(px, 90),
        "high52": hi, "low52": lo, "fromHigh": (last / hi - 1) * 100, "fromLow": (last / lo - 1) * 100,
        "vol30": statistics.pstdev(rets) * 100,
        "ethChg30d": chg(ex, 30), "ethPrice": ex[-1],
        "asOf": datetime.fromtimestamp(btc[-1][0], timezone.utc).strftime("%Y-%m-%d"),
    }
    try:
        fg = json.loads(http_get("https://api.alternative.me/fng/?limit=2").decode("utf-8"))["data"]
        f["fng"] = int(fg[0]["value"])
        f["fngLabel"] = fg[0]["value_classification"]
        f["fngPrev"] = int(fg[1]["value"])
    except Exception as e:
        print("  공포탐욕지수 조회 실패:", e, flush=True)
    print("  비트코인 지표:", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in f.items()}, flush=True)
    return f


# ---------------------------------------------------------------- AI 정리
COMMON_RULES = """- headline: 25자 안팎의 한국어 제목(회사명을 넣습니다).
- summary: 한국어 두 문장 이내(120자 안팎). 주어진 제목·항목명·숫자에 있는 내용만 쓰고, 금액·원인·영향·전망을 지어내지 않습니다. 모르는 부분은 쓰지 않습니다.
- 투자 권유·매수/매도 의견·가격 예측 표현을 쓰지 않습니다. 공시는 "~했다고 공시했습니다"처럼 사실만 전합니다.
- 반드시 아래 JSON만 출력합니다(설명·코드블록 금지)."""

PROMPTS = {
    "kr": ("한국 증시", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 코스피200·코스닥150 기업이 DART에 낸 공시 목록(회사명·공시 제목)입니다. 투자자가 오늘 꼭 알아야 할 공시 TOP5를 골라 쉬운 말로 풀어 쓰세요.\n"
           "- 같은 회사 공시는 하나만, 서로 다른 회사 5곳을 고릅니다. 횡령·배임, 유상증자·자사주, 대규모 계약, 실적, 경영권·최대주주 변동처럼 주가에 영향이 큰 공시를 우선합니다.\n- idx: 고른 후보의 번호.\n" + COMMON_RULES + ' {"items":[{"idx":번호,"headline":"...","summary":"..."}]}'),
    "us": ("미국 증시", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 S&P500 기업이 SEC에 낸 8-K 공시 목록(회사명·티커·공시 항목)입니다. 투자자가 알아야 할 공시 TOP5를 골라 쉬운 말로 풀어 쓰세요.\n"
           "- 서로 다른 회사 5곳을 고릅니다. 실적 발표, 경영진 변동, 대형 계약·인수, 보안 사고처럼 영향이 큰 항목을 우선합니다. 항목 번호만으로는 구체 내용을 알 수 없으니 \"~항목으로 8-K를 제출했습니다\" 수준으로만 설명합니다.\n- idx: 고른 후보의 번호.\n" + COMMON_RULES + ' {"items":[{"idx":번호,"headline":"...","summary":"..."}]}'),
    "us2": ("미국 증시", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 S&P500 기업이 SEC에 낸 8-K 공시와, 같이 낸 보도자료 앞부분·월가 예상 대비 결과(EPS)·공시 이후 주가 변동입니다. 회사마다 쉬운 한국어로 정리하세요.\n"
            "- headline: 30자 안팎. 회사명과 핵심 숫자 한 가지를 넣습니다(예: \"JP모건 3분기 순이익 153억 달러\").\n"
            "- summary: 한국어 세 문장 이내(170자 안팎). ①핵심 실적·결정 수치(매출·순이익·EPS·가이던스 등, 보도자료에 있는 숫자만) ②수준 평가: 월가 예상 EPS 대비 몇 % 높거나 낮은지(주어진 값이 있을 때만), 전년 동기 대비 증감(보도자료에 있을 때만) ③공시 이후 주가가 몇 % 움직였는지(price.pct, 주어진 값 그대로). 주가 변동의 원인을 단정하지 말고 \"공시 이후 ~% 올랐습니다/내렸습니다\"처럼 사실만 씁니다.\n"
            "- 주어진 자료에 없는 숫자·원인·전망은 쓰지 않습니다. 비교 기준이 없으면 그 부분은 쓰지 않습니다. 투자 권유·매수/매도 의견을 쓰지 않습니다.\n"
            "- idx: 입력에 붙은 번호를 그대로 돌려줍니다.\n"
            "- 반드시 아래 JSON만 출력합니다(설명·코드블록 금지): " + '{"items":[{"idx":번호,"headline":"...","summary":"..."}]}'),
    "crypto": ("비트코인", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 오늘의 비트코인 시장 숫자입니다. 이 숫자만으로 오늘 알아둘 점 5가지를 쉬운 말로 풀어 쓰세요(가격과 하루 변동 / 최근 7일·30일·90일 흐름 / 1년 고점·저점 대비 위치 / 최근 30일 변동성 / 공포탐욕지수·이더리움과 비교 중 5가지).\n"
               "- 주어진 숫자만 쓰고 원인·뉴스·전망은 쓰지 않습니다. 숫자는 그대로 인용합니다.\n" + COMMON_RULES + ' {"items":[{"headline":"...","summary":"..."}]}'),
}


def claude_json(system, user):
    body = {"model": MODEL, "max_tokens": 2500, "output_config": {"effort": "low"}, "system": system, "messages": [{"role": "user", "content": user}]}
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages", data=json.dumps(body).encode("utf-8"),
                headers={"content-type": "application/json", "x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"})
            data = json.load(urllib.request.urlopen(req, timeout=90))
            text = "\n".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
            return json.loads(text[text.index("{"): text.rindex("}") + 1])
        except Exception as e:
            last = e
            detail = e.read().decode("utf-8", "replace")[:200] if hasattr(e, "read") else ""
            print("  AI 시도 %d 실패: %s %s" % (attempt + 1, e, detail), flush=True)
            time.sleep(2 * (attempt + 1))
    raise last


def pick_items(key, cands):
    label, system = PROMPTS[key]
    if key == "crypto":
        j = claude_json(system, "오늘의 비트코인 시장 숫자:\n" + json.dumps(cands, ensure_ascii=False, indent=1))
        src = {"source": "Yahoo Finance 시세 · Alternative.me", "link": "https://finance.yahoo.com/quote/BTC-USD", "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
        items = [dict(headline=str(i["headline"]).strip(), summary=str(i["summary"]).strip(), **src) for i in j.get("items", []) if i.get("headline") and i.get("summary")]
    else:
        lst = "\n".join("[%d] %s%s — %s" % (i, c["company"], (" (%s)" % c["ticker"]) if c.get("ticker") else "", c["title"]) for i, c in enumerate(cands))
        j = claude_json(system, "후보 공시:\n%s\n\nTOP%d을 JSON으로 출력하세요." % (lst, TOP_N))
        items, used = [], set()
        for it in j.get("items", []):
            try:
                idx = int(it.get("idx"))
            except Exception:
                continue
            if idx < 0 or idx >= len(cands) or idx in used or not it.get("headline") or not it.get("summary"):
                continue
            used.add(idx)
            c = cands[idx]
            items.append({"headline": str(it["headline"]).strip(), "summary": str(it["summary"]).strip(), "source": "DART 전자공시" if key == "kr" else "SEC EDGAR", "link": c["link"], "time": c["time"]})
    if len(items) < 3:
        raise RuntimeError("유효한 항목 %d개뿐" % len(items))
    items = items[:TOP_N]
    if key == "us":
        items = us_rewrite(items, cands, used)
    return items


def us_rewrite(items, cands, used):
    """선정된 미국 공시마다 보도자료·예상 대비·주가 반응을 붙여 headline/summary를 다시 쓴다(실패하면 1단계 결과 유지)"""
    order = [i for i in sorted(used)][: len(items)]
    chosen = [cands[i] for i in order]
    facts = [us_enrich(c) for c in chosen]
    lst = []
    for n, f in enumerate(facts):
        lst.append("[%d] %s" % (n, json.dumps(f, ensure_ascii=False)))
    try:
        j = claude_json(PROMPTS["us2"][1], "공시 자료:" + chr(10) + chr(10).join(lst) + chr(10) + chr(10) + "회사마다 JSON으로 출력하세요.")
    except Exception as e:
        print("  미국 2단계 정리 실패(1단계 결과 유지):", e, flush=True)
        return items
    by = {}
    for it in j.get("items", []):
        try:
            by[int(it.get("idx"))] = it
        except Exception:
            pass
    out = []
    for n, (c, f) in enumerate(zip(chosen, facts)):
        it = by.get(n)
        base = next((x for x in items if x["link"] == c["link"]), None) or {"headline": c["company"], "summary": c["title"], "source": "SEC EDGAR", "link": c["link"], "time": c["time"]}
        if it and it.get("headline") and it.get("summary"):
            base = dict(base, headline=str(it["headline"]).strip(), summary=str(it["summary"]).strip())
        px = (f.get("price") or {}).get("pct")
        if px is not None:
            base["px"] = {"pct": px, "label": "공시 후"}
        out.append(base)
    return out


def main():
    only_cands = "--candidates" in sys.argv
    if not only_cands and not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY 환경변수가 필요합니다.")
        sys.exit(1)
    prev = {}
    try:
        prev = json.load(open(OUT_FILE, encoding="utf-8"))
    except Exception:
        pass
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = {"generatedAt": now, "model": MODEL, "kind": "disclosure-v1", "markets": dict(prev.get("markets") or {})}
    collectors = {"kr": kr_candidates, "us": us_candidates, "crypto": crypto_facts}
    failed = 0
    dump = {}
    for key, fn in collectors.items():
        print("%s 재료 수집 중..." % PROMPTS[key][0], flush=True)
        try:
            cands = fn()
            dump[key] = cands
            if only_cands:
                continue
            if key != "crypto" and len(cands) < 3:
                raise RuntimeError("후보 공시가 너무 적음(%d건)" % len(cands))
            items = pick_items(key, cands)
            out["markets"][key] = {"generatedAt": now, "items": items}
            print("  → %d건 저장" % len(items), flush=True)
        except Exception as e:
            failed += 1
            print("%s 실패(이전 데이터 유지): %s" % (PROMPTS[key][0], e), flush=True)
    if only_cands:
        print(json.dumps(dump, ensure_ascii=False))
        return
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    json.dump(out, open(OUT_FILE, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("저장 완료:", OUT_FILE)
    if failed:
        sys.exit(1)  # 데이터는 저장하되 일부라도 실패하면 실행을 실패로 표시해 알림이 오게 함


if __name__ == "__main__":
    main()
