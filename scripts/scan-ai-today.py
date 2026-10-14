# "AI투데이" — 매일 아침 한국 증시 / 미국 증시 / 비트코인 TOP5 뉴스를 AI로 골라 요약해 data/ai-today.json 으로 저장.
# 뉴스 소스는 언론사가 배포용으로 제공하는 공식 RSS(제목·링크·짧은 요약문)만 사용하고, 기사 본문은 가져오지 않는다.
# AI는 후보 기사 중 시장에 중요한 5건을 고르고 제목/요약을 자기 문장으로 다시 쓴다(원문 링크·출처는 그대로 표시).
# ETF는 화면에서 한국 5 + 미국 5를 합쳐 TOP10으로 보여주므로 여기서 따로 만들지 않는다.
# GitHub Actions(.github/workflows/ai-today-daily.yml)에서 매일 실행. 표준 라이브러리만 사용.
#
# 로컬 수동 실행: ANTHROPIC_API_KEY=... python scripts/scan-ai-today.py
import html
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

OUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "ai-today.json")
MODEL = os.environ.get("AI_MODEL") or "claude-haiku-5-5"  # 앱의 다른 AI 기능과 같은 모델(요약용이라 가장 저렴한 모델로 충분)
MAX_AGE_HOURS = 30  # 이보다 오래된 기사는 후보에서 제외
MAX_CANDIDATES = 40
TOP_N = 5
UA = {"User-Agent": "Mozilla/5.0 (compatible; marketmap-ai-today-bot)"}

MARKETS = {
    "kr": {
        "label": "한국 증시",
        "focus": "한국 주식시장(코스피·코스닥), 국내 상장사 실적·업황, 환율·금리·수급 등 국내 투자자에게 중요한 소식",
        "feeds": [
            ("연합뉴스", "https://www.yna.co.kr/rss/economy.xml"),
            ("한국경제", "https://www.hankyung.com/feed/finance"),
            ("매일경제", "https://www.mk.co.kr/rss/50200011/"),
        ],
    },
    "us": {
        "label": "미국 증시",
        "focus": "미국 주식시장(다우·S&P500·나스닥), 미국 상장 대형주 실적·업황, 연준·금리·경제지표 등 미국주식 투자자에게 중요한 소식",
        "feeds": [
            ("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258"),
            ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/"),
            ("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
        ],
    },
    "crypto": {
        "label": "비트코인",
        "focus": "비트코인 가격·ETF 자금 흐름·규제·채굴·기관 동향 등 비트코인(및 암호화폐 시장 전체)에 중요한 소식",
        "feeds": [
            ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
            ("Cointelegraph", "https://cointelegraph.com/rss"),
        ],
    },
}

SYSTEM = """당신은 투자 정보 앱의 아침 뉴스 에디터입니다. 아래 후보 기사(제목과 짧은 요약문뿐)에서 오늘 투자자에게 가장 중요한 TOP5를 골라 한국어로 정리하세요.

규칙:
- 같은 사건을 다룬 기사는 하나만 고르고, 서로 다른 주제 5건을 고릅니다. 시장 전체에 영향이 큰 소식을 우선합니다.
- headline: 25자 안팎의 한국어 제목(원문 제목을 그대로 베끼지 말고 자기 말로 다시 씁니다).
- summary: 한국어 두 문장 이내(120자 안팎). 후보에 적힌 내용만 쓰고 숫자·원인·전망을 지어내지 않습니다. 모르는 부분은 쓰지 않습니다.
- 투자 권유·매수/매도 의견·가격 예측 표현을 쓰지 않습니다.
- idx: 고른 후보의 번호(후보 목록의 [번호]).
- 반드시 아래 JSON만 출력합니다(설명·코드블록 금지): {"items":[{"idx":번호,"headline":"...","summary":"..."}]}"""


def tag(block, name):
    m = re.search(r"<%s[^>]*>(.*?)</%s>" % (name, name), block, re.S | re.I)
    return m.group(1) if m else ""


def clean(s):
    s = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", s or "", flags=re.S)
    s = html.unescape(html.unescape(s))
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_time(s):
    try:
        d = parsedate_to_datetime(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.timestamp()
    except Exception:
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def fetch_feed(feed):
    name, url = feed
    xml = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25).read().decode("utf-8", "replace")
    items = []
    for m in re.finditer(r"<item[\s>].*?</item>", xml, re.S | re.I):
        b = m.group(0)
        title = clean(tag(b, "title"))
        link = clean(tag(b, "link"))
        t = parse_time(clean(tag(b, "pubDate")) or clean(tag(b, "dc:date")))
        desc = clean(tag(b, "description"))[:220]
        if not title or not re.match(r"https?://", link) or t is None:
            continue
        items.append({"title": title, "link": link, "source": name, "time": t, "desc": desc})
    return items


def collect_candidates(market):
    allv = []
    with ThreadPoolExecutor(4) as ex:
        futs = [(f, ex.submit(fetch_feed, f)) for f in market["feeds"]]
    for f, fu in futs:
        try:
            allv += fu.result()
        except Exception as e:
            print("  피드 실패(%s): %s" % (f[0], e), flush=True)
    now = time.time()
    fresh = sorted([n for n in allv if now - MAX_AGE_HOURS * 3600 <= n["time"] <= now + 3600], key=lambda n: -n["time"])
    seen, uniq = set(), []
    for n in fresh:
        k = re.sub(r"\s+", "", n["title"])[:24]
        if k in seen:
            continue
        seen.add(k)
        uniq.append(n)
    # 매체가 한쪽에 쏠리지 않도록 매체별로 번갈아 담는다
    by = {}
    for n in uniq:
        by.setdefault(n["source"], []).append(n)
    mixed, i = [], 0
    while len(mixed) < MAX_CANDIDATES:
        added = False
        for lst in by.values():
            if i < len(lst) and len(mixed) < MAX_CANDIDATES:
                mixed.append(lst[i])
                added = True
        if not added:
            break
        i += 1
    return mixed


def parse_ai_reply(text, cands):
    j = json.loads(text[text.index("{"): text.rindex("}") + 1])
    picked, used = [], set()
    for it in j.get("items") or []:
        try:
            idx = int(it.get("idx"))
        except Exception:
            continue
        if idx < 0 or idx >= len(cands) or idx in used or not it.get("headline") or not it.get("summary"):
            continue
        used.add(idx)
        c = cands[idx]
        picked.append({
            "headline": str(it["headline"]).strip(),
            "summary": str(it["summary"]).strip(),
            "source": c["source"],
            "link": c["link"],
            "time": datetime.fromtimestamp(c["time"], timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
    return picked[:TOP_N]


def ask_claude(market, cands):
    lst = "\n".join("[%d] (%s) %s%s" % (i, n["source"], n["title"], (" — " + n["desc"]) if n["desc"] else "") for i, n in enumerate(cands))
    body = {
        "model": MODEL,
        "max_tokens": 2500,
        "output_config": {"effort": "low"},
        "system": SYSTEM + "\n\n이번 주제: %s — %s" % (market["label"], market["focus"]),
        "messages": [{"role": "user", "content": "후보 기사:\n%s\n\nTOP%d을 JSON으로 출력하세요." % (lst, TOP_N)}],
    }
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps(body).encode("utf-8"),
                headers={"content-type": "application/json", "x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
            )
            data = json.load(urllib.request.urlopen(req, timeout=90))
            text = "\n".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
            picked = parse_ai_reply(text, cands)
            if len(picked) < 3:
                raise RuntimeError("유효한 항목 %d개뿐" % len(picked))
            return picked
        except Exception as e:
            last = e
            detail = e.read().decode("utf-8", "replace")[:200] if hasattr(e, "read") else ""
            print("  AI 시도 %d 실패: %s %s" % (attempt + 1, e, detail), flush=True)
            time.sleep(2 * (attempt + 1))
    raise last


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY 환경변수가 필요합니다.")
        sys.exit(1)
    prev = {}
    try:
        prev = json.load(open(OUT_FILE, encoding="utf-8"))
    except Exception:
        pass
    out = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "model": MODEL, "markets": dict(prev.get("markets") or {})}
    failed = 0
    for key, market in MARKETS.items():
        print("%s 후보 수집 중..." % market["label"], flush=True)
        try:
            cands = collect_candidates(market)
            print("  후보 %d건" % len(cands), flush=True)
            if len(cands) < 8:
                raise RuntimeError("후보 기사가 너무 적음")
            items = ask_claude(market, cands)
            out["markets"][key] = {"generatedAt": out["generatedAt"], "items": items}
            print("  → %d건 저장" % len(items), flush=True)
        except Exception as e:
            failed += 1
            print("%s 실패(이전 데이터 유지): %s" % (market["label"], e), flush=True)
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    json.dump(out, open(OUT_FILE, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("저장 완료:", OUT_FILE)
    if failed:
        sys.exit(1)  # 데이터는 저장하되 일부라도 실패하면 실행을 실패로 표시해 알림이 오게 함


if __name__ == "__main__":
    main()
