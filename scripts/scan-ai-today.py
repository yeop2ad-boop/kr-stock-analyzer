# "AI투데이" — 매일 아침 한국 증시 / 미국 증시 / 비트코인의 오늘 이슈 TOP5를 AI로 정리해 data/ai-today.json 으로 저장.
# 언론사 RSS·기사는 약관상 자동 수집·AI 요약·재게시가 막혀 있어(코인 매체는 명시적 금지) 쓰지 않는다. 대신 저작권 걱정이 없는 재료만 쓴다.
#   · 한국 증시  = DART 전자공시(법정 공시) 중 코스피200·코스닥150 기업의 중요한 공시                       (TOP5)
#   · 미국 증시  = ① 시장 숫자 1개(지수·금리·VIX·달러·유가) + ② 미국 정부 자료 2개(BLS 경제지표 · 연준 발표)
#                  + ③ GDELT 공개 데이터로 본 "오늘 뉴스에 많이 언급된 S&P500 기업" 2개                       (TOP5)
#   · 비트코인   = 시세·공포탐욕지수 같은 시장 숫자                                                       (TOP5)
# AI는 제목·숫자·정부 자료만 보고 쉬운 말로 풀어쓴다(기사 문장은 쓰지 않음). ETF는 화면에서 한국 5 + 미국 5를 합쳐 TOP10으로 보여준다.
# · 미국 연방정부 저작물(BLS·연준)은 저작권이 없는 공공 영역, GDELT는 상업적 이용·재배포 허용(출처 표기 조건: GDELT Project, gdeltproject.org).
# GitHub Actions(.github/workflows/ai-today-daily.yml)에서 매일 실행. 표준 라이브러리만 사용.
#
# 로컬 수동 실행: DART_API_KEY=... ANTHROPIC_API_KEY=... python scripts/scan-ai-today.py
#   (DART_API_KEY가 없으면 DART 공개 RSS(최근 50건)로 대신하고, --candidates 를 주면 AI를 부르지 않고 재료만 JSON으로 출력)
import csv
import html
import io
import json
import os
import re
import statistics
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT_FILE = os.path.join(ROOT, "data", "ai-today.json")
MODEL = os.environ.get("AI_MODEL") or "claude-haiku-5-5"  # 앱의 다른 AI 기능과 같은 모델(요약용이라 가장 저렴한 모델로 충분)
TOP_N = 5
KST = timezone(timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (compatible; marketmap-ai-today-bot; contact hyhykhy6@gmail.com)"}
GOV_UA = {"User-Agent": "marketmap-ai-today-bot hyhykhy6@gmail.com"}
csv.field_size_limit(10 ** 9)


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


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------- 한국: DART 공시
# 중요도가 낮은 정형 공시(투자설명서·증권발행실적·감사보고서·지분 변동 보고 등)는 후보에서 뺀다
KR_SKIP = ("투자설명서", "증권발행실적", "감사보고서", "대규모기업집단", "특수관계인", "주식등의대량보유", "임원ㆍ주요주주특정증권등소유", "임원·주요주주특정증권등소유", "기업설명회", "주주총회소집", "효력발생안내", "일괄신고", "결산실적공시예고", "의결권대리행사")


def kr_universe():
    u = read_json(os.path.join(ROOT, "data", "kr-universe-kospi200-kosdaq150.json"))
    ents = (u.get("kospi200") or []) + (u.get("kosdaq150") or [])
    return {e["symbol"].split(".")[0]: e["name"] for e in ents}


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


# ---------------------------------------------------------------- 공통: Yahoo 일봉(지수·종목·코인)
def yahoo_daily(sym, rng="1y"):
    js = json.loads(http_get("https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=1d" % (urllib.parse.quote(sym), rng)).decode("utf-8"))
    r = js["chart"]["result"][0]
    pts = [(t, c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c]
    return pts, r["meta"]


def day_change(sym):
    """최근 종가와 전일 대비 변동률"""
    pts, meta = yahoo_daily(sym, "5d")
    # 2026-10-15: 마지막 두 일봉을 비교하면 오늘 일봉이 아직 없을 때 이틀 전 종가와 비교하게 됨(코스피 -0.44%가 -5.46%로 나온 사례).
    # Yahoo가 현재가와 함께 주는 당일 등락률을 우선 쓰고, 없을 때만 일봉으로 계산한다.
    last = meta.get("regularMarketPrice") or pts[-1][1]
    pct = meta.get("regularMarketChangePercent")
    if pct is None:
        rt = meta.get("regularMarketTime") or pts[-1][0]
        day = lambda t: datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d")
        prev_bar = pts[-2][1] if day(pts[-1][0]) == day(rt) and len(pts) >= 2 else pts[-1][1]  # 마지막 봉이 오늘이면 그 앞 봉, 아니면 마지막 봉이 전일 종가
        pct = (last / prev_bar - 1) * 100
    prev = last / (1 + pct / 100)
    rt = meta.get("regularMarketTime") or pts[-1][0]
    return {"last": round(last, 2), "prev": round(prev, 2), "pct": round(pct, 2), "date": datetime.fromtimestamp(rt, timezone.utc).strftime("%Y-%m-%d")}


# ---------------------------------------------------------------- 미국 ① 시장 숫자
US_MARKET_SYMS = (("sp500", "S&P500", "^GSPC"), ("nasdaq", "나스닥종합", "^IXIC"), ("dow", "다우존스", "^DJI"), ("us10y", "미국 10년물 금리(%)", "^TNX"), ("vix", "VIX 변동성지수", "^VIX"), ("dollar", "달러지수", "DX-Y.NYB"), ("wti", "WTI 유가(달러)", "CL=F"))


def us_market_facts():
    out = {}
    for key, label, sym in US_MARKET_SYMS:
        try:
            d = day_change(sym)
            if key == "us10y":  # 금리는 %가 아니라 %p(베이시스포인트) 변화가 의미 있음
                d["changeBp"] = round((d["last"] - d["prev"]) * 100, 1)
            out[key] = dict(d, label=label)
        except Exception as e:
            print("  시장 숫자 실패(%s): %s" % (sym, e), flush=True)
    if len(out) < 4:
        raise RuntimeError("시장 숫자가 너무 적음(%d개)" % len(out))
    print("  시장 숫자:", {k: v["pct"] for k, v in out.items()}, flush=True)
    return out


# ---------------------------------------------------------------- 미국 ② 정부 자료(BLS 경제지표 · 연준 발표)
def bls_facts():
    xml = http_get("https://www.bls.gov/feed/bls_latest.rss", GOV_UA).decode("utf-8", "replace")
    text = clean(xml)
    lines = []
    for m in re.finditer(r"([A-Z][A-Za-z \-\(\)&]+?):\s*([+\-]?[$\d.,%()a-z]+(?:\s*\(p\))?\s+in\s+[A-Za-z0-9 ]+?)\s+News Release", text):
        name = re.sub(r"^(Historical Data\s+)+", "", m.group(1).strip())  # 앞 지표의 "Historical Data" 링크 글자가 붙어 나오는 것을 제거
        lines.append("%s: %s" % (name, re.sub(r"\s+", " ", m.group(2)).strip()))
    if len(lines) < 3:
        raise RuntimeError("BLS 지표를 읽지 못함")
    pub = re.search(r"<pubDate>(.*?)</pubDate>", xml, re.S)
    ts = parsedate_to_datetime(clean(pub.group(1))).timestamp() if pub else time.time()
    print("  BLS 지표 %d개" % len(lines), flush=True)
    return {"indicators": lines, "link": "https://www.bls.gov/bls/newsrels.htm", "time": iso(ts)}


FED_SKIP = ("approval of application", "orders on", "announces approval", "termination of enforcement", "reappointment", "consumer compliance", "community reinvestment")


def fed_candidates():
    out, seen = [], set()
    for url in ("https://www.federalreserve.gov/feeds/press_all.xml", "https://www.federalreserve.gov/feeds/speeches_and_testimony.xml"):
        try:
            xml = http_get(url, GOV_UA).decode("utf-8", "replace")
        except Exception as e:
            print("  연준 피드 실패:", e, flush=True)
            continue
        for m in re.finditer(r"<item[ >].*?</item>", xml, re.S):
            b = m.group(0)
            title, link = clean(tag(b, "title")), clean(tag(b, "link"))
            try:
                ts = parsedate_to_datetime(clean(tag(b, "pubDate"))).timestamp()
            except Exception:
                continue
            if not title or not link.startswith("http") or link in seen or time.time() - ts > 10 * 86400:
                continue
            if any(k in title.lower() for k in FED_SKIP):
                continue
            seen.add(link)
            out.append({"title": title, "link": link, "time": iso(ts), "ts": ts})
    out.sort(key=lambda c: -c["ts"])
    out = out[:12]
    # 앞쪽 몇 건은 본문 앞부분도 읽어 AI가 내용을 알 수 있게 함(연방정부 자료)
    for c in out[:6]:
        try:
            t = http_get(c["link"], GOV_UA).decode("utf-8", "replace")
            t = re.sub(r"<(script|style|nav|header|footer).*?</\1>", " ", t, flags=re.S | re.I)
            t = clean(t)
            dm = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}", t)
            c["body"] = (t[dm.start():] if dm else t)[:3000]  # 메뉴·머리글 글자를 건너뛰고 발표일부터 본문 시작
        except Exception:
            pass
        time.sleep(0.3)
    print("  연준 발표 후보 %d건" % len(out), flush=True)
    return out


# ---------------------------------------------------------------- 미국 ③ GDELT: 오늘 뉴스에서 많이 언급된 S&P500 기업
_SUF = re.compile(r"\b(incorporated|inc|corporation|corp|company|co|ltd|plc|holdings|holding|group|class [abc]|the)\b\.?", re.I)
# 이름이 흔한 단어이거나 시장(거래소) 자체를 가리키는 말은 기업 언급으로 세지 않는다
_EXCL = {"target", "visa", "ford", "general", "gap", "best", "state", "first", "fox", "news", "sealed air", "ball", "match", "paycom", "hess", "dow", "mid", "cf", "ross", "nasdaq", "cboe", "cme", "ice"}
_ALIAS = {"google": "GOOGL", "alphabet": "GOOGL", "facebook": "META", "meta": "META", "meta platforms": "META", "jpmorgan": "JPM", "jp morgan": "JPM", "morgan stanley": "MS", "goldman sachs": "GS",
          "bank of america": "BAC", "wells fargo": "WFC", "berkshire hathaway": "BRK-B", "general motors": "GM", "walmart": "WMT", "disney": "DIS", "advanced micro devices": "AMD", "amd": "AMD",
          "exxon mobil": "XOM", "exxonmobil": "XOM", "unitedhealth": "UNH", "johnson & johnson": "JNJ", "eli lilly": "LLY", "nvidia": "NVDA", "tesla": "TSLA", "apple": "AAPL", "microsoft": "MSFT",
          "amazon": "AMZN", "palantir": "PLTR", "micron": "MU", "delta air lines": "DAL", "blackrock": "BLK", "citigroup": "C", "citi": "C"}


_CRYPTO_TITLES = {}  # GDELT 표본에서 모은 비트코인·암호화폐 기사 제목(gdelt_top이 채우고 비트코인 제목 구역이 읽음)
_CRYPTO_SPAM = re.compile(r"presale|purchases? [\d,]+ shares|sells? [\d,]+ shares|acquires? [\d,]+ shares|price prediction", re.I)


def _norm(n):
    return re.sub(r"\s+", " ", _SUF.sub(" ", re.sub(r"[.,]", " ", n.lower()))).strip()


def gdelt_top(n=2, samples=8, step_hours=3):
    comps = read_json(os.path.join(ROOT, "sector-map", "data", "sp500-sectors.json"))["companies"]
    name2t, tick2name = {}, {c["symbol"]: c["name"] for c in comps}
    for c in comps:
        k = _norm(c["name"])
        if k and k not in _EXCL and len(k) >= 4:
            name2t[k] = c["symbol"]
    name2t.update({k: v for k, v in _ALIAS.items() if v in tick2name})
    last = http_get("https://data.gdeltproject.org/gdeltv2/lastupdate.txt").decode().split("\n")[2].split()[2]
    t0 = datetime.strptime(re.search(r"/(\d{14})\.", last).group(1), "%Y%m%d%H%M%S")
    count, tone, seen, arts, files = defaultdict(set), defaultdict(list), set(), 0, 0
    for i in range(samples):
        ts = (t0 - timedelta(hours=step_hours * i)).strftime("%Y%m%d%H%M%S")
        try:
            raw = http_get("http://data.gdeltproject.org/gdeltv2/%s.gkg.csv.zip" % ts, GOV_UA, 120)
            z = zipfile.ZipFile(io.BytesIO(raw))
            txt = z.read(z.namelist()[0]).decode("utf-8", "replace")
        except Exception as e:
            print("  GDELT 파일 건너뜀(%s): %s" % (ts, e), flush=True)
            continue
        files += 1
        for row in csv.reader(io.StringIO(txt), delimiter="\t", quoting=csv.QUOTE_NONE):
            if len(row) > 26 and row[4] not in _CRYPTO_TITLES and ("ECON_BITCOIN" in row[7] + row[8] or "CRYPTOCURRENCY" in row[7] + row[8]):
                mt = re.search(r"<PAGE_TITLE>(.*?)</PAGE_TITLE>", row[26], re.S)
                if mt:
                    try:
                        cts = datetime.strptime(row[1][:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc).timestamp()
                    except Exception:
                        cts = time.time()
                    _CRYPTO_TITLES[row[4]] = {"title": clean(mt.group(1)), "source": row[3], "link": row[4], "ts": cts}
            if len(row) < 16 or "ECON_STOCKMARKET" not in row[7] + row[8] or row[4] in seen:
                continue
            seen.add(row[4])
            arts += 1
            try:
                tv = float(row[15].split(",")[0])
            except Exception:
                tv = None
            for t in {name2t[x] for x in {_norm(o.split(",")[0]) for o in row[13].split(";") if o} if x in name2t}:
                count[t].add(row[4])
                if tv is not None:
                    tone[t].append(tv)
        time.sleep(0.5)
    if files < 4 or arts < 100:
        raise RuntimeError("GDELT 표본이 부족함(파일 %d개, 기사 %d건)" % (files, arts))
    ranked = [t for t, u in sorted(count.items(), key=lambda x: -len(x[1])) if len(u) >= 5][:n]
    out = []
    for t in ranked:
        d = {"ticker": t, "company": tick2name[t], "articles": len(count[t]), "tone": round(sum(tone[t]) / max(1, len(tone[t])), 2), "sampleArticles": arts, "sampleFiles": files}
        try:
            d["price"] = day_change(t)
        except Exception as e:
            print("  주가 조회 실패(%s): %s" % (t, e), flush=True)
        out.append(d)
    print("  GDELT 표본: 파일 %d개 · 주식시장 기사 %d건 → 상위 %s" % (files, arts, [(d["ticker"], d["articles"]) for d in out]), flush=True)
    if len(out) < n:
        raise RuntimeError("언급량 상위 기업이 부족함")
    return out


def us_materials():
    return {"market": us_market_facts(), "bls": bls_facts(), "fed": fed_candidates(), "gdelt": gdelt_top()}


# ---------------------------------------------------------------- 브리핑: 구역별 소제목 + 굵은 핵심(2026-10-15)
# 위 TOP5 항목(근거 자료)과 같은 재료로, 자료에 나온 순서가 아니라 중요도 순으로 새로 배열한 구역별 글을 만든다.
def kr_market_facts():
    out = {}
    for key, label, sym in (("kospi", "코스피", "^KS11"), ("kosdaq", "코스닥", "^KQ11"), ("usdkrw", "원/달러 환율", "KRW=X")):
        try:
            out[key] = dict(day_change(sym), label=label)
        except Exception as e:
            print("  한국 시장 숫자 실패(%s): %s" % (sym, e), flush=True)
    return out


# ---------------------------------------------------------------- 주요 뉴스 제목(2026-10-15): 기사 내용은 쓰지 않고 제목·링크·출처만
# 언론사 공식 RSS에서 제목만 읽어 AI가 "어느 제목을 보여줄지"만 고른다. 제목은 다시 쓰지 않고 그대로 표시하며 누르면 원문으로 이동한다.
# 코인 매체(CoinDesk·Cointelegraph)는 약관이 자동 수집을 명시적으로 금지해서 제외한다.
NEWS_FEEDS = {
    "kr": [("연합뉴스", "https://www.yna.co.kr/rss/economy.xml"), ("한국경제", "https://www.hankyung.com/feed/finance"), ("매일경제", "https://www.mk.co.kr/rss/50200011/")],
    "us": [("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258"), ("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
           ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/")],
}


def headline_candidates(key, max_age_hours=30, limit=40):
    if key == "crypto":  # 코인 매체 RSS는 약관상 쓰지 않고 GDELT 공개 데이터의 기사 제목만 사용
        kw = re.compile(r"bitcoin|crypto|btc|ether|\bcoin|token|stablecoin|blockchain|ibit", re.I)
        seen, out = set(), []
        for c in sorted(_CRYPTO_TITLES.values(), key=lambda c: -c["ts"]):
            k = re.sub(r"\s+", "", c["title"])[:24]
            if any(d in c["source"] for d in ("cointelegraph.com", "coindesk.com")):
                continue  # 이 두 코인 매체는 약관이 자동 수집·AI 활용을 명시적으로 금지하므로 GDELT를 거쳐도 쓰지 않는다
            if kw.search(c["title"]) and not _CRYPTO_SPAM.search(c["title"]) and k not in seen:
                seen.add(k)
                out.append(c)
        return out[:limit]
    allv = []
    for name, url in NEWS_FEEDS.get(key, []):
        try:
            xml = http_get(url).decode("utf-8", "replace")
        except Exception as e:
            print("  뉴스 피드 실패(%s): %s" % (name, e), flush=True)
            continue
        for m in re.finditer(r"<item[\s>].*?</item>", xml, re.S | re.I):
            b = m.group(0)
            title, link = clean(tag(b, "title")), clean(tag(b, "link"))
            try:
                ts = parsedate_to_datetime(clean(tag(b, "pubDate"))).timestamp()
            except Exception:
                continue
            if title and link.startswith("http") and time.time() - max_age_hours * 3600 <= ts <= time.time() + 3600:
                allv.append({"title": title, "source": name, "link": link, "ts": ts})
    seen, uniq = set(), []
    for n in sorted(allv, key=lambda n: -n["ts"]):
        k = re.sub(r"\s+", "", n["title"])[:24]
        if k not in seen:
            seen.add(k)
            uniq.append(n)
    by = defaultdict(list)
    for n in uniq:
        by[n["source"]].append(n)
    mixed, i = [], 0
    while len(mixed) < limit and any(i < len(v) for v in by.values()):
        for v in by.values():
            if i < len(v) and len(mixed) < limit:
                mixed.append(v[i])
        i += 1
    return mixed


def pick_headlines(key, n=10):
    cands = headline_candidates(key)
    if len(cands) < (4 if key == "crypto" else 8):
        raise RuntimeError("뉴스 제목 후보가 너무 적음(%d건)" % len(cands))
    lst = "\n".join("[%d] (%s) %s" % (i, c["source"], c["title"]) for i, c in enumerate(cands))
    j = claude_json("투자 정보 앱의 아침 에디터로서, 아래 제목 목록에서 투자자에게 가장 중요한 뉴스 최대 %d건의 번호를 중요한 순서대로 고르세요(관련 제목이 부족하면 적게 골라도 됩니다). 같은 사건은 하나만, 서로 다른 주제로 고릅니다. 제목을 고쳐 쓰지 않습니다. JSON만 출력: {\"idx\":[번호,...]}" % n, lst)
    out, used = [], set()
    for x in j.get("idx", []):
        try:
            x = int(x)
        except Exception:
            continue
        if 0 <= x < len(cands) and x not in used:
            used.add(x)
            c = cands[x]
            out.append({"title": c["title"], "source": c["source"], "link": c["link"], "time": iso(c["ts"])})
    if len(out) < 3:
        raise RuntimeError("고른 제목이 부족함")
    out = out[:n]  # 비트코인은 관련 제목이 적으면 10개보다 적게 나올 수 있음
    if key != "kr":  # 영문 제목은 한국어로 번역해 titleKo에 담는다(원문 title과 링크는 그대로 둠, 번역 실패 시 영문 그대로 표시)
        try:
            tj = claude_json("영문 뉴스 제목을 자연스러운 한국어 제목으로 번역하세요. 숫자·고유명사는 그대로 살리고 내용을 덧붙이거나 빼지 않습니다. 같은 순서로 JSON만 출력: " + '{"titles":["...","..."]}', "\n".join("%d. %s" % (i, o["title"]) for i, o in enumerate(out)))
            ko = tj.get("titles") or []
            if len(ko) == len(out):
                for o, t in zip(out, ko):
                    o["titleKo"] = str(t).strip()
        except Exception as e:
            print("  제목 번역 실패(영문 그대로 표시):", e, flush=True)
    return out


BRIEF_SYSTEM = """당신은 투자 정보 앱의 아침 브리핑 에디터입니다. 아래 자료만으로 오늘의 브리핑을 구역별로 씁니다.
- 구역(sections)은 자료가 있는 것만 고릅니다: 증시 / 산업·기업 / 금융·경제 (비트코인은 시세 / 심리·지표).
- 구역 순서와 구역 안 문장 순서는 자료에 나온 순서를 따르지 말고, 투자자에게 중요한 순서대로 새로 배열합니다.
- 구역마다 2~4문장. 핵심 사실·수치는 **굵게**(별표 두 개로 감쌈) 표시하고, 구역당 굵은 표시는 2~3곳으로 합니다.
- 주어진 자료에 있는 내용만 쓰고 원인·전망·금액을 지어내지 않습니다. 투자 권유·매수/매도 의견·가격 예측 표현을 쓰지 않습니다. 쉬운 말로 씁니다.
- 반드시 아래 JSON만 출력합니다(설명·코드블록 금지): {"sections":[{"title":"증시","body":"..."}]}"""


def make_briefing(key, cands, items):
    if key == "kr":
        mat = {"시장": kr_market_facts(), "오늘의 공시": [{"회사": c["company"], "공시": c["title"]} for c in cands[:15]], "선정된 항목": [i["headline"] for i in items]}
    elif key == "us":
        mat = {"시장": cands["market"], "BLS 경제지표": cands["bls"]["indicators"], "연준": [{"제목": c["title"], "본문": c.get("body", "")[:1200]} for c in cands["fed"][:3]], "뉴스 언급 상위 기업(GDELT 표본)": cands["gdelt"]}
    else:
        mat = cands
    j = claude_json(BRIEF_SYSTEM, "자료:\n" + json.dumps(mat, ensure_ascii=False, indent=1))
    secs = [{"title": str(s["title"]).strip(), "body": str(s["body"]).strip()} for s in j.get("sections", []) if s.get("title") and s.get("body")]
    return {"sections": secs} if len(secs) >= 2 else None


# ---------------------------------------------------------------- 비트코인: 시장 숫자
def crypto_facts():
    btc, meta = yahoo_daily("BTC-USD")
    eth, _ = yahoo_daily("ETH-USD")
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
COMMON_RULES = """- headline: 25~30자 안팎의 한국어 제목.
- summary: 한국어 두세 문장(120~170자). 주어진 자료에 있는 내용만 쓰고, 금액·원인·영향·전망을 지어내지 않습니다. 모르는 부분은 쓰지 않습니다.
- 투자 권유·매수/매도 의견·가격 예측 표현을 쓰지 않습니다.
- 반드시 아래 JSON만 출력합니다(설명·코드블록 금지)."""

PROMPTS = {
    "kr": ("한국 증시", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 코스피200·코스닥150 기업이 DART에 낸 공시 목록(회사명·공시 제목)입니다. 투자자가 오늘 꼭 알아야 할 공시 TOP5를 골라 쉬운 말로 풀어 쓰세요.\n"
           "- 같은 회사 공시는 하나만, 서로 다른 회사 5곳을 고릅니다. 횡령·배임, 유상증자·자사주, 대규모 계약, 실적, 경영권·최대주주 변동처럼 주가에 영향이 큰 공시를 우선합니다.\n- idx: 고른 후보의 번호.\n"
           + COMMON_RULES + ' {"items":[{"idx":번호,"headline":"...","summary":"..."}]}'),
    "us": ("미국 증시", "당신은 투자 정보 앱의 아침 에디터입니다. 아래 자료로 미국 증시 투자자를 위한 항목 5개를 쉬운 한국어로 만드세요. 항목 순서와 종류는 고정입니다.\n"
           "1) slot=market: 어제 미국 증시 마감 요약. S&P500·나스닥·다우 등락률과 10년물 금리(변동은 bp), VIX, 달러, 유가 중 의미 있는 것을 숫자 그대로 인용합니다.\n"
           "2) slot=bls: 미국 노동통계국(BLS)의 최신 경제지표(물가·실업률·고용 등)를 숫자 그대로 풀어 씁니다. 지표 이름의 뜻을 짧게 곁들입니다.\n"
           "3) slot=fed: 연준 발표 후보 중 시장에 가장 중요한 1건을 골라(fedIdx=후보 번호) 본문에 있는 내용만으로 요약합니다. 본문이 없으면 제목에 있는 사실만 씁니다.\n"
           "4) slot=gdelt1, 5) slot=gdelt2: 최근 24시간 주식시장 관련 영문 뉴스(표본)에서 많이 언급된 기업입니다. 기업명, 언급 기사 수(articles, sampleArticles는 표본 전체 기사 수), 기사 어조 점수(tone: 0 근처는 중립, 음수일수록 부정적 보도), 전일 종가 대비 주가 변동(price.pct)을 쉬운 말로 설명합니다. 언급된 이유나 기사 내용은 모르므로 쓰지 않고, 표본 기준임을 밝힙니다.\n"
           + COMMON_RULES + ' {"items":[{"slot":"market","headline":"...","summary":"..."},{"slot":"bls",...},{"slot":"fed","fedIdx":번호,...},{"slot":"gdelt1",...},{"slot":"gdelt2",...}]}'),
    "crypto": ("비트코인", "당신은 투자 정보 앱의 아침 에디터입니다. 아래는 오늘의 비트코인 시장 숫자입니다. 이 숫자만으로 오늘 알아둘 점 5가지를 쉬운 말로 풀어 쓰세요(가격과 하루 변동 / 최근 7일·30일·90일 흐름 / 1년 고점·저점 대비 위치 / 최근 30일 변동성 / 공포탐욕지수·이더리움과 비교 중 5가지).\n"
               "- 주어진 숫자만 쓰고 원인·뉴스·전망은 쓰지 않습니다. 숫자는 그대로 인용합니다.\n" + COMMON_RULES + ' {"items":[{"headline":"...","summary":"..."}]}'),
}


def claude_json(system, user):
    body = {"model": MODEL, "max_tokens": 3000, "output_config": {"effort": "low"}, "system": system, "messages": [{"role": "user", "content": user}]}
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


def us_items(mat, j):
    """AI가 쓴 5개(market·bls·fed·gdelt1·gdelt2)에 링크·출처·시각·주가 변동을 코드가 붙여 완성"""
    by = {it.get("slot"): it for it in j.get("items", [])}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    items = []
    for slot in ("market", "bls", "fed", "gdelt1", "gdelt2"):
        it = by.get(slot)
        if not it or not it.get("headline") or not it.get("summary"):
            continue
        row = {"headline": str(it["headline"]).strip(), "summary": str(it["summary"]).strip()}
        if slot == "market":
            row.update(source="Yahoo Finance 시세", link="https://finance.yahoo.com/quote/%5EGSPC", time=now)
        elif slot == "bls":
            row.update(source="미국 노동통계국(BLS)", link=mat["bls"]["link"], time=mat["bls"]["time"])
        elif slot == "fed":
            try:
                c = mat["fed"][int(it.get("fedIdx"))]
            except Exception:
                continue
            row.update(source="미국 연방준비제도(Fed)", link=c["link"], time=c["time"])
        else:
            g = mat["gdelt"][0 if slot == "gdelt1" else 1]
            row.update(source="GDELT Project (gdeltproject.org)", link="https://marketmap.kr/?ticker=" + urllib.parse.quote(g["ticker"]), time=now)
            if g.get("price"):
                row["px"] = {"pct": g["price"]["pct"], "label": "전일 대비"}
        items.append(row)
    return items


def pick_items(key, cands):
    label, system = PROMPTS[key]
    if key == "crypto":
        j = claude_json(system, "오늘의 비트코인 시장 숫자:\n" + json.dumps(cands, ensure_ascii=False, indent=1))
        src = {"source": "Yahoo Finance 시세 · Alternative.me", "link": "https://finance.yahoo.com/quote/BTC-USD", "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
        items = [dict(headline=str(i["headline"]).strip(), summary=str(i["summary"]).strip(), **src) for i in j.get("items", []) if i.get("headline") and i.get("summary")]
    elif key == "us":
        slim = dict(cands, fed=[{"idx": i, "title": c["title"], "date": c["time"][:10], "body": c.get("body", "")} for i, c in enumerate(cands["fed"])])
        j = claude_json(system, "자료:\n" + json.dumps(slim, ensure_ascii=False, indent=1))
        items = us_items(cands, j)
    else:
        lst = "\n".join("[%d] %s — %s" % (i, c["company"], c["title"]) for i, c in enumerate(cands))
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
            items.append({"headline": str(it["headline"]).strip(), "summary": str(it["summary"]).strip(), "source": "DART 전자공시", "link": c["link"], "time": c["time"]})
    if len(items) < (5 if key == "us" else 3):
        raise RuntimeError("유효한 항목 %d개뿐" % len(items))
    return items[:TOP_N]


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
    out = {"generatedAt": now, "model": MODEL, "kind": "gov-gdelt-v1", "markets": dict(prev.get("markets") or {})}
    collectors = {"kr": kr_candidates, "us": us_materials, "crypto": crypto_facts}
    failed = 0
    dump = {}
    for key, fn in collectors.items():
        print("%s 재료 수집 중..." % PROMPTS[key][0], flush=True)
        try:
            cands = fn()
            dump[key] = cands
            if only_cands:
                continue
            if key == "kr" and len(cands) < 3:
                raise RuntimeError("후보 공시가 너무 적음(%d건)" % len(cands))
            items = pick_items(key, cands)
            entry = {"generatedAt": now, "items": items}
            try:
                br = make_briefing(key, cands, items)
                if br:
                    entry["briefing"] = br
            except Exception as e:
                print("  브리핑 생성 실패(항목 목록만 저장):", e, flush=True)
            if key in ("kr", "us", "crypto"):
                try:
                    entry["headlines"] = pick_headlines(key)
                except Exception as e:
                    print("  뉴스 제목 선정 실패(제목 구역 없이 저장):", e, flush=True)
            out["markets"][key] = entry
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
