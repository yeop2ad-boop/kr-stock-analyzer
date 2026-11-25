#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""검색에 잡히는 종목 페이지 만들기 (2026-11-25 신설)

왜: 마켓맵 본체는 주소 하나짜리 화면이라 검색 엔진이 종목별 내용을 읽지 못한다.
    종목마다 주소가 있는 가벼운 글 페이지를 만들어 검색에서 들어오게 하고, 본체(?ticker=)와 앱 설치로 잇는다.

읽는 것: sector-map/data/kr-sectors.json · sp500-sectors.json (종목·업종·시가총액·PER·배당)
         data/winrate-scores-us.json (과거승률·1년상승) · data/sreport-baseline.json (52주 위치)
         data/earnings-calendar.json (최근 분기·다음 발표일) · data/{kr,us}-annual-financials.json (연도별 매출·순이익)
         data/company-overview.json (한 줄 개요) · data/ko-company-names.js (미국 종목 한글 이름)
         data/app-config.json (playLive: 앱 설치 버튼을 켤지 · playUrl)
만드는 것: stock/<코드>/index.html (종목마다) · stock/index.html (목록) · stock/q-kr.json · stock/q-us.json (날마다 바뀌는 숫자)
          earnings/index.html (실적 일정) · sitemap.xml · robots.txt · stock/_state.json (다시 쓸지 판단용)
손으로 쓴 것(이 스크립트가 만들지 않음): stock/site.css · stock/site.js

파일을 덜 바꾸는 법: 종목 페이지는 '천천히 바뀌는 내용'(승률·연간 실적·분기 실적·발표일·틀)이 달라졌을 때만 다시 쓴다.
    시가총액·PER·배당·52주 위치는 쓸 때의 값을 박아 두고, 화면에서 site.js 가 q-*.json 의 최신 값으로 덮는다.
    (날마다 850개 파일이 바뀌어 저장소가 불어나는 것을 막는다)

앱 설치 버튼: data/app-config.json 에 "playLive": true 를 넣으면 '출시 예정' 대신 Google Play 링크가 된다.

실행: python scripts/build-stock-pages.py        (바뀐 것만)
      python scripts/build-stock-pages.py --all  (전부 다시)
"""
import datetime
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://marketmap.kr"
TPL = "3"  # 틀(HTML 짜임)을 바꾸면 올린다 → 모든 종목 페이지를 다시 쓴다
ICON_V = "20261019a"
FONT_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).date()
CUR = ' aria-current="page"'  # f-string 안에 역슬래시를 못 쓰는 옛 파이썬(3.11 이하)에서도 돌게 밖으로 뺀 조각
NEG = ' class="neg"'


# ---------- 읽기·쓰기 ----------
def P(*a):
    return os.path.join(ROOT, *a)


def J(path, default=None):
    try:
        with io.open(P(path), encoding="utf-8-sig") as f:
            return json.load(f)
    except (OSError, ValueError):
        if default is not None:
            return default
        raise


def write(path, text):
    """내용이 같으면 건드리지 않는다. 돌려주는 값: 새로 썼는지"""
    full = P(path)
    try:
        with io.open(full, encoding="utf-8") as f:
            if f.read() == text:
                return False
    except OSError:
        pass
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with io.open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return True


def file_hash(path):
    with open(P(path), "rb") as f:
        return hashlib.sha1(f.read().replace(b"\r\n", b"\n")).hexdigest()[:8]  # 줄바꿈(CRLF/LF)이 달라도 같은 값


def E(s):
    return html.escape(str(s), quote=True)


def ko_names():
    """미국 종목 한글 이름: 별칭표에서 종목마다 처음 나온 이름(본체·지도와 같은 규칙)"""
    try:
        with io.open(P("data", "ko-company-names.js"), encoding="utf-8") as f:
            t = re.sub(r"//[^\n]*", "", f.read())
    except OSError:
        return {}
    out = {}
    for q, bare, tk in re.findall(r'(?:"([^"\n]+)"|([^\s,{}:"\']+))\s*:\s*"([A-Za-z0-9.\-]+)"', t):
        out.setdefault(tk, q or bare)
    return out


# ---------- 숫자 → 글자 (stock/site.js 의 capKr·capUs 와 같은 규칙) ----------
def money_kr(v):
    """원 → '1,196조' · '195.3조' · '8,520억'"""
    a = abs(v)
    j = a / 1e12
    s = f"{j:,.0f}조" if j >= 1000 else f"{j:.1f}조" if j >= 1 else f"{a / 1e8:,.0f}억"
    return ("-" if v < 0 else "") + s


def money_us(v):
    """달러 → '3.03조' · '1,158억' · '32.5억'"""
    a = abs(v)
    j = a / 1e12
    e = a / 1e8
    s = f"{j:.2f}조" if j >= 1 else f"{e:,.0f}억" if e >= 100 else f"{e:.1f}억"
    return ("-" if v < 0 else "") + s


def money(v, kr):
    if v is None:
        return "–"
    return money_kr(v) + "원" if kr else money_us(v) + " 달러"


def pct(v, sign=False, nd=1):
    if v is None:
        return "–"
    return f"{v:+.{nd}f}%" if sign else f"{v:.{nd}f}%"


def day(s):
    """'2026-10-29' → '2026.10.29'"""
    return s.replace("-", ".") if s else ""


def ym(s):
    return s.replace("-", ".") if s else ""


def num(v):
    return v if isinstance(v, (int, float)) and v == v else None


# ---------- 종목 모으기 ----------
def load():
    kr = J("sector-map/data/kr-sectors.json")
    us = J("sector-map/data/sp500-sectors.json")
    wr = J("data/winrate-scores-us.json", {})
    sb = J("data/sreport-baseline.json", {}).get("members", {})
    ec = J("data/earnings-calendar.json", {})
    ka = J("data/kr-annual-financials.json", {}).get("items", {})
    ua = J("data/us-annual-financials.json", {}).get("items", {})
    ov = J("data/company-overview.json", {}).get("overviews", {})
    ko = ko_names()
    logos = set(os.listdir(P("sector-map", "logos", "mid"))) if os.path.isdir(P("sector-map", "logos", "mid")) else set()

    def asof(iso):
        try:
            t = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(KST)
            return f"{t.month}.{t.day:02d}"
        except (AttributeError, ValueError):
            return ""

    stocks = []
    for mk, src, scores, cal, ann in (("kr", kr, wr.get("scoresKr", {}), ec.get("kr", {}), ka), ("us", us, wr.get("scores", {}), ec.get("us", {}), ua)):
        for c in src.get("companies", []):
            sym = c.get("symbol")
            if not sym or not c.get("name"):
                continue
            iskr = mk == "kr"
            code = sym.split(".")[0] if iskr else sym
            w = scores.get(sym) or {}
            m = sb.get(sym) or {}
            e = cal.get(sym) or {}
            years = []
            for y, r in sorted(((ann.get(sym) or {}).get("years") or {}).items()):
                rev, ni = num(r.get("rev")), num(r.get("ni"))
                if rev is not None or ni is not None:
                    years.append((y, rev, ni))
            rep = e.get("rep") or {}
            nxt = e.get("next")
            if nxt and nxt < TODAY.isoformat():
                nxt = None
            name_ko = c["name"] if iskr else ko.get(sym)
            w52 = num(m.get("w52"))
            if w52 is None:
                w52 = num(c.get("week52RangePct"))
            stocks.append({
                "mk": mk, "sym": sym, "code": code, "slug": code.lower(),
                "name": name_ko or c["name"], "en": None if iskr or not name_ko else c["name"],
                "exch": c.get("exchange") if iskr else "미국", "sector": c.get("sectorKo") or "",
                "about": (ov.get(sym) or "").strip(),
                "mcap": num(c.get("marketCap")), "per": num(c.get("per")), "div": num(c.get("dividendYield")), "w52": w52,
                "win": num(w.get("score")), "up": w.get("up"), "total": w.get("total"), "from": w.get("from"), "to": w.get("to"),
                "ret": num(w.get("ret10y")),
                "years": years[-10:],
                "rep": {"date": rep.get("date"), "rev": num(rep.get("rev")), "ni": num(rep.get("ni")), "src": rep.get("src") if iskr else None} if rep.get("date") else None,
                "next": nxt, "nextEst": bool(e.get("nextEst")) if nxt else False, "nextTime": e.get("nextTime") if nxt else None,
                "logo": sym + ".png" in logos,
                "asof": asof(src.get("generatedAt")),
            })
    return stocks


# ---------- 조각 ----------
def head(title, desc, path, css_v, extra=""):
    url = SITE + path
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="마켓맵 (MarketMap)">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.png?v={ICON_V}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/png" sizes="180x180" href="/logos/marketmap-180.png?v={ICON_V}">
<link rel="apple-touch-icon" href="/logos/marketmap-180.png?v={ICON_V}">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#ffffff">
<script>try{{if(localStorage.getItem("theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}}catch(e){{}}</script>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="{FONT_CSS}">
<link rel="stylesheet" href="/stock/site.css?v={css_v}">
{extra}</head>
"""


def topbar(cur=""):
    def a(href, label, key):
        return f'<a href="{href}"{CUR if cur == key else ""}>{label}</a>'
    return (f'<header class="top"><div class="wrap"><a class="brand" href="/"><img src="/logos/marketmap-180.png?v={ICON_V}" width="24" height="24" alt="">마켓맵</a>'
            f'<nav>{a("/stock/", "종목", "stock")}{a("/earnings/", "실적 일정", "earn")}{a("/sector-map/", "지도", "map")}</nav></div></header>\n')


FOOT = ('<footer><div class="wrap"><p>투자 권유가 아닌 참고 자료입니다.</p>'
        '<p><a href="/privacy.html">개인정보처리방침</a><a href="/terms.html">이용약관</a>© 마켓맵</p></div></footer>\n')


def chart(years):
    """연도별 매출·순이익 막대 (최근 10년). 숫자는 아래 표가 말하므로 축 눈금은 없다."""
    W, H, top, lab = 320, 118, 6, 16
    vals = [v for _, r, n in years for v in (r, n) if v is not None]
    hi, lo = max(max(vals), 0), min(min(vals), 0)
    span = (hi - lo) or 1
    area = H - lab - top
    y0 = top + hi / span * area
    gw = W / len(years)
    bw = min(11.0, gw * 0.3)
    out = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="연도별 매출과 순이익">']
    for i, (y, rev, ni) in enumerate(years):
        cx = gw * i + gw / 2
        for v, x, cls in ((rev, cx - bw - 1, "b1"), (ni, cx + 1, "b2")):
            if v is None:
                continue
            h = max(abs(v) / span * area, 0.8)
            out.append(f'<rect class="{cls}" x="{x:.1f}" y="{(y0 - h if v >= 0 else y0):.1f}" width="{bw:.1f}" height="{h:.1f}" rx="1.5"/>')
        out.append(f'<text x="{cx:.1f}" y="{H - 3}">{E(y[2:])}</text>')
    out.append(f'<line class="ax" x1="0" x2="{W}" y1="{y0:.1f}" y2="{y0:.1f}"/></svg>')
    return "".join(out)


def table(years, kr):
    """최근 5년 표. 단위는 회사 크기에 맞춘다(한국: 조 원/억 원 · 미국: 억 달러)."""
    rows = years[-5:][::-1]
    top = max((abs(r) for _, r, _n in rows if r is not None), default=0)
    if kr:
        unit, div, nd = ("조 원", 1e12, 1) if top >= 1e13 else ("억 원", 1e8, 0)
    else:
        unit, div, nd = "억 달러", 1e8, (0 if top >= 1e10 else 1)

    def cell(v):
        if v is None:
            return "<td>–</td>"
        return f'<td{NEG if v < 0 else ""}>{v / div:,.{nd}f}</td>'
    body = "".join(f"<tr><td>{E(y)}</td>{cell(r)}{cell(n)}</tr>" for y, r, n in rows)
    return f"<table><thead><tr><th>연도</th><th>매출</th><th>순이익</th></tr></thead><tbody>{body}</tbody></table>", unit


def stable_key(s, extra):
    """이 값이 그대로면 종목 페이지를 다시 쓰지 않는다 (시가총액·PER·배당·52주 위치·기준일·같은 업종 목록은 빠져 있다)"""
    keep = {k: s[k] for k in ("mk", "sym", "name", "en", "exch", "sector", "about", "win", "up", "total", "from", "to", "ret", "years", "rep", "next", "nextEst", "nextTime", "logo")}
    return hashlib.sha1(json.dumps([TPL, extra, keep], ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def stock_page(s, peers, cfg):
    kr = s["mk"] == "kr"
    path = f"/stock/{s['slug']}/"
    full10 = (s["total"] or 0) >= 118
    k_win = "10년 과거승률" if full10 else "과거승률"
    k_ret = "1년상승(10년 평균)" if full10 else "1년상승(연평균)"

    bits = []
    if s["win"] is not None:
        bits.append(f"{k_win} {pct(s['win'])}")
    if s["ret"] is not None:
        bits.append(f"{k_ret} {pct(s['ret'], True)}")
    title = f"{s['name']}({s['code']}) 실적 · 과거승률 | 마켓맵"
    desc = f"{s['name']}({s['code']}) " + " · ".join(bits + ["시가총액 · PER · 연도별 매출과 순이익 · 실적 발표일"])

    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "마켓맵", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "종목", "item": SITE + "/stock/"},
        {"@type": "ListItem", "position": 3, "name": s["name"], "item": SITE + path}]}
    extra = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}</script>\n'

    logo = (f'<img class="logo" src="/sector-map/logos/mid/{E(s["sym"])}.png" width="48" height="48" alt="{E(s["name"])} 로고">'
            if s["logo"] else f'<span class="logo mono" aria-hidden="true">{E(s["name"][:1])}</span>')
    meta = " · ".join(E(x) for x in (s["code"], s["en"], s["exch"], s["sector"]) if x)

    w52 = s["w52"]
    w52_cell = (f'<b class="v" data-f="w52">{w52:.0f}%</b><span class="track"><i data-f="w52dot" style="left:{max(0, min(100, w52)):.0f}%"></i></span>'
                if w52 is not None else '<b class="v" data-f="w52">–</b><span class="track"><i data-f="w52dot" style="left:0%"></i></span>')
    per = s["per"]
    grid = (
        f'<div class="cell"><span class="k">시가총액</span><b class="v" data-f="mcap">{money(s["mcap"], kr)}</b></div>'
        f'<div class="cell"><span class="k">PER</span><b class="v" data-f="per">{f"{per:.1f}배" if per is not None and per > 0 else "–"}</b></div>'
        f'<div class="cell"><span class="k">배당수익률</span><b class="v" data-f="div">{pct(s["div"])}</b></div>'
        f'<div class="cell"><span class="k">{k_win}</span><b class="v">{pct(s["win"])}</b>'
        + (f'<span class="s">{s["total"]}개월 중 {s["up"]}개월</span>' if s["win"] is not None and s["total"] else "") + "</div>"
        f'<div class="cell"><span class="k">{k_ret}</span><b class="v">{pct(s["ret"], True)}</b>'
        + (f'<span class="s">{ym(s["from"])}~{ym(s["to"])}</span>' if s["ret"] is not None and s["from"] else "") + "</div>"
        f'<div class="cell"><span class="k">52주 위치</span>{w52_cell}</div>'
    )

    rows = []
    rep = s["rep"]
    if rep and (rep["rev"] is not None or rep["ni"] is not None):
        v = " · ".join(x for x in (f"매출 {money(rep['rev'], kr)}" if rep["rev"] is not None else "", f"순이익 {money(rep['ni'], kr)}" if rep["ni"] is not None else "") if x)
        tag = " 잠정" if rep.get("src") == "잠정" else ""
        rows.append(f'<div><dt>최근 분기 <small>{day(rep["date"])}{tag}</small></dt><dd>{v}</dd></div>')
    if s["next"]:
        tail = " <small>예상</small>" if s["nextEst"] else " <small>장 전</small>" if s["nextTime"] == "pre" else " <small>장 마감 후</small>" if s["nextTime"] == "after" else ""
        rows.append(f'<div><dt>다음 발표</dt><dd>{day(s["next"])}{tail}</dd></div>')
    earn = f'<dl class="rows">{"".join(rows)}</dl>' if rows else ""
    if len(s["years"]) >= 2:
        tb, unit = table(s["years"], kr)
        earn += (f'<div class="fin"><figure class="chart"><p class="legend"><span><i></i>매출</span><span><i class="g"></i>순이익</span></p>{chart(s["years"])}</figure>'
                 f'{tb}</div><p class="cap">단위 {unit} · 자료 {"DART" if kr else "SEC"}</p>')
    earn_sec = f"<section><h2>실적</h2>{earn}</section>\n" if earn else ""
    about_sec = f'<section><h2>기업 개요</h2><p class="about">{E(s["about"])}</p></section>\n' if s["about"] else ""

    app = (f'<a class="btn line app-btn" href="{E(cfg["playUrl"])}" rel="noopener">Google Play에서 앱 받기</a>' if cfg["playLive"]
           else '<span class="btn line off app-btn" aria-disabled="true">Android 앱 <small>출시 예정</small></span>')
    cta = f'<section class="cta"><a class="btn" href="/?ticker={E(s["sym"])}">자세히 보기</a>{app}</section>\n'
    peer_sec = ('<section><h2>같은 업종</h2><div class="chips">' + "".join(f'<a href="/stock/{p["slug"]}/">{E(p["name"])}</a>' for p in peers) + "</div></section>\n") if peers else ""

    return (head(title, desc, path, cfg["css"], extra)
            + f'<body data-q="{s["mk"]}" data-s="{E(s["slug"])}">\n' + topbar()
            + f'<main class="wrap">\n<div class="head">{logo}<div><h1>{E(s["name"])}</h1><p class="meta">{meta}</p></div></div>\n'
            + f'<div class="grid">{grid}</div>\n<p class="note">시세 기준 <span data-f="asof">{E(s["asof"])}</span></p>\n'
            + cta + earn_sec + about_sec + peer_sec + "</main>\n" + FOOT
            + f'<script src="/stock/site.js?v={cfg["js"]}" defer></script>\n</body>\n</html>\n')


def hub_page(stocks, cfg):
    title = "종목 찾기 — 한국 · 미국 주식 | 마켓맵"
    desc = f"코스피200 · 코스닥150 · S&P500 {len(stocks)}개 종목의 실적, 과거승률, 시가총액을 한곳에서."
    parts = []
    for mk, label in (("kr", "한국"), ("us", "미국")):
        mine = [s for s in stocks if s["mk"] == mk]
        secs = {}
        for s in mine:
            secs.setdefault(s["sector"] or "기타", []).append(s)
        blocks = []
        for sec, arr in sorted(secs.items(), key=lambda kv: -sum(x["mcap"] or 0 for x in kv[1])):
            arr.sort(key=lambda x: -(x["mcap"] or 0))
            lis = "".join(
                f'<li data-n="{E((s["name"] + " " + s["code"] + " " + (s["en"] or "")).lower())}"><a href="/stock/{s["slug"]}/"><span>{E(s["name"])}</span><small>{E(s["code"])}</small></a></li>'
                for s in arr)
            blocks.append(f'<div class="grp"><h3>{E(sec)} {len(arr)}</h3><ul class="list">{lis}</ul></div>')
        parts.append(f'<div class="mkt" id="{mk}">{"".join(blocks)}</div>')
    nk, nu = sum(1 for s in stocks if s["mk"] == "kr"), sum(1 for s in stocks if s["mk"] == "us")
    return (head(title, desc, "/stock/", cfg["css"]) + "<body>\n" + topbar("stock")
            + '<main class="wrap">\n<div class="page-h"><h1>종목</h1></div>\n'
            + '<input class="find" id="find" type="search" placeholder="종목명 · 코드" autocomplete="off" aria-label="종목 찾기">\n'
            + f'<div class="seg"><button type="button" data-m="kr" aria-pressed="true">한국 {nk}</button><button type="button" data-m="us" aria-pressed="false">미국 {nu}</button></div>\n'
            + "\n".join(parts) + "\n</main>\n" + FOOT
            + f'<script src="/stock/site.js?v={cfg["js"]}" defer></script>\n</body>\n</html>\n')


def earnings_page(stocks, cfg):
    title = "실적 발표 일정 — 한국 · 미국 | 마켓맵"
    desc = "한국 · 미국 주요 종목의 실적 발표 예정일과 최근 발표된 분기 매출 · 순이익."
    soon = sorted((s for s in stocks if s["next"]), key=lambda s: (s["next"], -(s["mcap"] or 0)))[:80]
    since = (TODAY - datetime.timedelta(days=21)).isoformat()
    done = sorted((s for s in stocks if s["rep"] and s["rep"]["date"] >= since and s["rep"]["rev"] is not None),
                  key=lambda s: (s["rep"]["date"], s["mcap"] or 0), reverse=True)[:80]

    def nm(s):
        return f'<td class="name"><a href="/stock/{s["slug"]}/">{E(s["name"])}</a><small>{E(s["code"])}</small></td>'

    def when(s):
        return "예상" if s["nextEst"] else "장 전" if s["nextTime"] == "pre" else "장 마감 후" if s["nextTime"] == "after" else ""
    sec = ""
    if soon:
        body = "".join(f'<tr><td>{day(s["next"])[5:]}</td>{nm(s)}<td><small>{when(s)}</small></td></tr>' for s in soon)
        sec += f'<section><h2>발표 예정</h2><table><thead><tr><th>날짜</th><th class="l">종목</th><th>시점</th></tr></thead><tbody>{body}</tbody></table></section>\n'
    if done:
        body = "".join(
            f'<tr><td>{day(s["rep"]["date"])[5:]}</td>{nm(s)}<td class="num">{money(s["rep"]["rev"], s["mk"] == "kr")}</td>'
            f'<td class="num{" neg" if (s["rep"]["ni"] or 0) < 0 else ""}">{money(s["rep"]["ni"], s["mk"] == "kr")}</td></tr>' for s in done)
        sec += f'<section><h2>최근 발표</h2><table><thead><tr><th>날짜</th><th class="l">종목</th><th>매출</th><th>순이익</th></tr></thead><tbody>{body}</tbody></table></section>\n'
    cta = '<section class="cta"><a class="btn" href="/?open=earn">실적 자세히 보기</a>' + (
        f'<a class="btn line app-btn" href="{E(cfg["playUrl"])}" rel="noopener">Google Play에서 앱 받기</a>' if cfg["playLive"]
        else '<span class="btn line off app-btn" aria-disabled="true">Android 앱 <small>출시 예정</small></span>') + "</section>\n"
    return (head(title, desc, "/earnings/", cfg["css"]) + "<body>\n" + topbar("earn")
            + '<main class="wrap">\n<div class="page-h"><h1>실적 일정</h1></div>\n' + sec + cta + "</main>\n" + FOOT + "</body>\n</html>\n")


# ---------- 실행 ----------
def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # 윈도우 콘솔에서 한글이 깨지지 않게
    except (AttributeError, ValueError):
        pass
    force = "--all" in sys.argv
    app = J("data/app-config.json", {})
    cfg = {"css": file_hash("stock/site.css"), "js": file_hash("stock/site.js"),
           "playLive": bool(app.get("playLive")), "playUrl": app.get("playUrl") or "https://play.google.com/store/apps/details?id=kr.marketmap.app"}
    stocks = load()
    seen = set()
    stocks = [s for s in stocks if not (s["slug"] in seen or seen.add(s["slug"]))]
    # 승률도 실적도 없는 종목(갓 상장·분할)은 내용이 너무 얇아 페이지를 만들지 않는다 — 자료가 생기면 저절로 생긴다
    stocks = [s for s in stocks if s["win"] is not None or len(s["years"]) >= 2 or s["rep"]]
    slugs = sorted(s["slug"] for s in stocks)
    state = J("stock/_state.json", {"pages": {}})
    old = state.get("pages", {})
    # 종목이 빠지거나 들어오면 '같은 업종' 링크가 죽을 수 있으므로 전부 다시 쓴다
    extra = [cfg["css"], cfg["js"], cfg["playLive"], cfg["playUrl"], hashlib.sha1(",".join(slugs).encode()).hexdigest()[:8]]

    by_group = {}
    for s in stocks:
        by_group.setdefault((s["mk"], s["sector"]), []).append(s)
    for arr in by_group.values():
        arr.sort(key=lambda x: -(x["mcap"] or 0))

    pages, n_new = {}, 0
    for s in stocks:
        h = stable_key(s, extra)
        was = old.get(s["slug"]) or {}
        path = f"stock/{s['slug']}/index.html"
        if not force and was.get("h") == h and os.path.isfile(P(path)):
            pages[s["slug"]] = was
            continue
        arr = by_group[(s["mk"], s["sector"])]
        i = arr.index(s)
        lo = max(0, min(i - 4, len(arr) - 9))
        peers = [p for p in arr[lo:lo + 9] if p is not s][:8]
        write(path, stock_page(s, peers, cfg))
        pages[s["slug"]] = {"h": h, "d": TODAY.isoformat()}
        n_new += 1

    # 목록에서 빠진 종목의 페이지는 지운다 (지난번에 이 스크립트가 만든 것만)
    n_del = 0
    for slug in old:
        if slug not in pages and re.fullmatch(r"[a-z0-9\-]+", slug) and os.path.isfile(P("stock", slug, "index.html")):
            shutil.rmtree(P("stock", slug), ignore_errors=True)
            n_del += 1

    # 날마다 바뀌는 숫자 — 한국: 시가총액 억 원 · 미국: 백만 달러
    for mk, unit in (("kr", 1e8), ("us", 1e6)):
        mine = [s for s in stocks if s["mk"] == mk]
        d = {s["slug"]: [round(s["mcap"] / unit) if s["mcap"] is not None else None,
                         round(s["per"], 1) if s["per"] is not None else None,
                         round(s["div"], 2) if s["div"] is not None else None,
                         round(s["w52"], 1) if s["w52"] is not None else None] for s in mine}
        write(f"stock/q-{mk}.json", json.dumps({"t": mine[0]["asof"] if mine else "", "d": d}, ensure_ascii=False, separators=(",", ":")))

    write("stock/index.html", hub_page(stocks, cfg))
    write("earnings/index.html", earnings_page(stocks, cfg))
    write("stock/_state.json", json.dumps({"pages": pages}, ensure_ascii=False, separators=(",", ":"), sort_keys=True))

    urls = [("/", None), ("/sector-map/", None), ("/stock/", TODAY.isoformat()), ("/earnings/", TODAY.isoformat())]
    urls += [(f"/stock/{slug}/", pages[slug]["d"]) for slug in slugs]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"<url><loc>{SITE}{u}</loc>" + (f"<lastmod>{d}</lastmod>" if d else "") + "</url>" for u, d in urls]
    write("sitemap.xml", "\n".join(sm + ["</urlset>"]) + "\n")
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"종목 {len(stocks)}개 · 새로 쓴 페이지 {n_new} · 지운 페이지 {n_del} · 앱 설치 버튼 {'켜짐' if cfg['playLive'] else '출시 예정'}", flush=True)


if __name__ == "__main__":
    main()
