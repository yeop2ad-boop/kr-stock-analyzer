# -*- coding: utf-8 -*-
"""한국 ETF 보유비중 재수집(2026-10-06 사용자 요청) → data/etf-info.json의 kr[*].holdings 교체 + data/etf-holding-names.json

왜: 네이버 etfAnalysis는 해외 지수 추종 ETF(184/300개)에서 비중 없이 '주식수'만 주고, 금·현금 행은 종목코드가 비어
    화면에서 빠지거나 주식수로 보였다. 국내 종목은 무조건 .KS로 붙여 코스닥 종목(테스 등)은 상세로 넘어가지 않았다.
출처(2026-10-08): 네이버 증권 새 사이트 API stock.naver.com/api/domestic/detail/{코드}/ETFComponent — 운용사 PDF 전체
(비중 %, ISIN, 해외 로이터 코드, 한글명, 기준일), 차단 없이 매일 전부. 비면 예비로 funetf(setPdfChart, 요청이 잦으면 429).

holdings 항목: {"s": 야후 심볼(없으면 ""), "n": 이름, "w": 비중 %, "t": stock|gold|bond|cash|deriv|other}
 · 금·채권·현금·파생은 화면 맨 위에 합계로 보여주므로 종류(t)를 붙여 둔다. 주식은 비중 상위 30개까지.
 · data/etf-holding-names.json: 보유 상위 종목 중 앱 기본 목록(코스피200·코스닥150) 밖의 종목 이름 — 검색·상세에서 찾을 수 있게
실행: python scripts/build-etf-holdings.py   (약 3~5분, 표준 라이브러리만)
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INFO = os.path.join(ROOT, "data", "etf-info.json")
NAMES = os.path.join(ROOT, "data", "etf-holding-names.json")
SUFFIX_CACHE = os.path.join(ROOT, "scripts", "kr-suffix-cache.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
MAX_STOCKS = 30
MAX_PER_RUN = 400  # 2026-10-08: 네이버 ETFComponent로 바꾼 뒤엔 차단이 없어 매일 전부(0.4초 간격, 약 2분)
HOLD_CACHE = os.path.join(ROOT, "data", "etf-holdings-kr.json")


def isin_of(code):
    base = "KR7" + code + "00"
    digits = "".join(str(int(ch, 36)) for ch in base)
    tot = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        tot += d
    return base + str((10 - tot % 10) % 10)


def get(url, tries=3, timeout=40):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except Exception:
            time.sleep(1.5 * (k + 1))
    return None


def naver_rows(code):
    """네이버 증권 새 사이트(stock.naver.com)의 ETF 구성종목 API — 운용사 PDF 전체(비중 %, ISIN, 해외는 로이터 코드 NVDA.O,
    한글 종목명, 기준일). 2026-10-08 확인: funetf와 같은 내용이고 차단이 없어 기본 출처로 쓴다.
    funetf 행 모양(grpItmNo·ticker·citmNm·evP)으로 바꿔 돌려줘서 아래 분류·심볼 변환을 그대로 쓴다."""
    out = []
    for start in (0, 100, 200):
        raw = get(f"https://stock.naver.com/api/domestic/detail/{code}/ETFComponent?startIdx={start}&pageSize=100", tries=2, timeout=20)
        try:
            rows = json.loads(raw)
        except Exception:
            return out or None
        if not isinstance(rows, list) or not rows:
            break
        for x in rows:
            try:
                w = float(x.get("weight"))
            except (TypeError, ValueError):
                continue
            reuters = (x.get("componentReutersCode") or "").split(".")[0]
            out.append({
                "grpItmNo": x.get("componentIsinCode") or "",
                "ticker": x.get("componentItemCode") or reuters or "",
                "citmNm": x.get("componentName") or "",
                "evP": w,
                "_ref": x.get("referenceDate"),
            })
        if len(rows) < 100:
            break
    return out or None


def funetf_rows(code):
    """funetf는 요청이 잦으면 429(잠시 후 다시)를 돌려준다 — 우회하지 않고 쉬었다가 한 번 더 시도"""
    url = f"https://www.funetf.co.kr/product/etf/view/{isin_of(code)}"
    raw = None
    for wait in (0, 90, 240):
        if wait:
            print(f"  429 — {wait}초 쉬고 다시", flush=True)
            time.sleep(wait)
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
            break
        except urllib.error.HTTPError as e:
            if e.code != 429:
                return None
        except Exception:
            return None
    if not raw:
        return None
    t = raw.decode("utf-8", "replace")
    m = re.search(r"setPdfChart\((\[.*?\])\s*\);", t, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None


BOND_WORDS = ("국고채", "국채", "통안", "회사채", "은행채", "금융채", "공사채", "지방채", "특수채", "채권", "TREASURY", "T-BILL", "TBILL", "NOTE", "BOND", "물가채")
CASH_WORDS = ("현금", "예금", "달러", "USD", "CASH", "RP", "콜론", "CD", "전단채", "전자단기", "MMF", "증거금")
DERIV_WORDS = ("선물", " F ", "스왑", "SWAP", "옵션", "FUTURE")


def kind_of(row):
    isin = (row.get("grpItmNo") or "").upper()
    name = (row.get("citmNm") or "").upper()
    if isin.startswith("KRD04") or "금 현물" in name or "금현물" in name or name.startswith("GOLD"):
        return "gold"
    if isin.startswith("KRD01") or isin.startswith("KRD02") or isin.startswith("CASH") or any(w in name for w in CASH_WORDS):
        return "cash"
    if any(w in name for w in DERIV_WORDS) or isin.startswith("KR4"):
        return "deriv"
    if any(w in name for w in BOND_WORDS) or isin[:3] in ("KR1", "KR2", "KR6") or isin.startswith("US912"):
        return "bond"
    if isin.startswith("KR7") or len(isin) == 12:
        return "stock"
    return "other"


def yahoo_symbol(row, suffix):
    """ISIN 국가 + 티커 → 야후 심볼. 확실하지 않으면 ""(링크 없이 이름만)"""
    isin = (row.get("grpItmNo") or "").upper()
    tk = (row.get("ticker") or "").strip().upper()
    if not tk:
        return ""
    cc = isin[:2]
    if cc == "KR":
        return suffix(tk) if re.fullmatch(r"[0-9A-Z]{6}", tk) else ""
    if cc in ("US", "BM", "KY", "IE", "LR", "PA", "CH", "NL", "GB", "CA", "JE", "AN") and re.fullmatch(r"[A-Z.\-]{1,6}", tk):
        return tk.replace(".", "-")
    if cc == "JP" and tk.isdigit():
        return f"{tk}.T"
    if cc == "TW" and tk.isdigit():
        return f"{tk}.TW"
    if cc == "HK" and tk.isdigit():
        return f"{int(tk):04d}.HK"
    if cc == "CN" and tk.isdigit() and len(tk) == 6:
        return f"{tk}.SS" if tk.startswith("6") else f"{tk}.SZ"
    return ""


def display_name(row):
    n = (row.get("citmNm") or "").strip()
    # "엔비디아/NVIDIA Corp" → 한글 앞부분
    if "/" in n:
        ko = n.split("/")[0].strip()
        if re.search(r"[가-힣]", ko):
            return ko
    return n


def main():
    info = json.load(open(INFO, encoding="utf-8-sig"))
    kr = info.get("kr") or {}
    known = {}
    for c in json.load(open(os.path.join(ROOT, "sector-map", "data", "kr-sectors.json"), encoding="utf-8-sig"))["companies"]:
        known[c["symbol"].split(".")[0]] = c["symbol"]
    cache = {}
    if os.path.exists(SUFFIX_CACHE):
        cache = json.load(open(SUFFIX_CACHE, encoding="utf-8"))

    def suffix(code):
        if code in known:
            return known[code]
        if code in cache:
            return cache[code]
        sym = ""
        for suf in (".KS", ".KQ"):
            raw = get(f"https://query1.finance.yahoo.com/v8/finance/chart/{code}{suf}?range=5d&interval=1d", tries=2, timeout=20)
            try:
                js = json.loads(raw)
                if js["chart"]["result"][0]["timestamp"]:
                    sym = code + suf
                    break
            except Exception:
                pass
        cache[code] = sym
        return sym

    codes = [s for s in kr if s.endswith(".KS") or s.endswith(".KQ")]
    # funetf 결과는 따로 캐시(HOLD_CACHE)에 둔다 — 매일 도는 fetch-etf-info.ps1이 etf-info.json의 한국 보유종목을
    # 네이버 값으로 다시 쓰므로, 매번 캐시를 다시 덮어 적용한다. 새로 받는 건 6일 지난 ETF만, 한 번에 최대 MAX_PER_RUN개
    # (funetf가 요청이 잦으면 429로 막아서 2.5초 간격으로 하나씩). --all이면 전부 다시.
    hold = json.load(open(HOLD_CACHE, encoding="utf-8")) if os.path.exists(HOLD_CACHE) else {}
    full = "--all" in sys.argv
    today = time.strftime("%Y-%m-%d")
    stale_before = today  # 매일 새로(오늘 받은 것만 건너뜀)
    todo = [s for s in codes if full or (hold.get(s) or {}).get("at", "") < stale_before]
    todo.sort(key=lambda s: (hold.get(s) or {}).get("at", ""))  # 가장 오래된(없는) 것부터
    if not full:
        todo = todo[:MAX_PER_RUN]
    print(f"한국 ETF {len(codes)}개 중 {len(todo)}개 구성종목 조회(네이버 ETFComponent, 안 되면 funetf)", flush=True)
    names = json.load(open(NAMES, encoding="utf-8")) if os.path.exists(NAMES) else {}
    label = {"gold": "금 현물", "bond": "채권", "cash": "현금", "deriv": "선물·파생", "other": "기타"}
    ok = fails = 0
    for i, sym in enumerate(todo):
        rows = naver_rows(sym.split(".")[0])
        src = "naver"
        if not rows:  # 네이버가 비면 예비로 funetf
            rows = funetf_rows(sym.split(".")[0])
            src = "funetf"
        fails = 0 if rows else fails + 1
        if fails >= 3:  # 계속 막히면 받은 것까지만 저장하고 다음 실행에서 이어서
            print("  연속 3회 실패 — 여기까지 저장", flush=True)
            break
        if (i + 1) % 20 == 0:
            print(f"  {i + 1}/{len(todo)}", flush=True)
        time.sleep(0.4 if src == "naver" else 3)
        if not rows:
            continue
        agg = {}
        stocks = []
        for r in rows:
            if r.get("viewGrp") == "N":  # 설정현금액(PDF 기준금액) — 실제 보유가 아님
                continue
            w = r.get("evP")
            if not isinstance(w, (int, float)) or w == 0:
                continue
            k = kind_of(r)
            if k == "stock":
                stocks.append((r, w))
            else:
                agg.setdefault(k, [0.0, []])
                agg[k][0] += w
                agg[k][1].append(display_name(r))
        stocks.sort(key=lambda x: -x[1])
        out = []
        for k, (w, ns) in sorted(agg.items(), key=lambda kv: -abs(kv[1][0])):
            if w < 0.05:  # 설정·환매 차이로 생기는 -0.05% 같은 음수·아주 작은 현금 행은 뺀다
                continue
            out.append({"s": "", "n": label[k] if k != "gold" else (ns[0] if ns else "금 현물"), "w": round(w, 2), "t": k})
        for r, w in stocks[:MAX_STOCKS]:
            ysym = yahoo_symbol(r, suffix)
            nm = display_name(r)
            out.append({"s": ysym, "n": nm, "w": round(w, 2), "t": "stock"})
            if ysym and (ysym not in known.values()):
                names[ysym] = nm
        if out:
            hold[sym] = {"at": today, "holdings": out, "src": src}
            ok += 1
    # 캐시를 etf-info.json에 적용
    applied = 0
    for sym in codes:
        h = hold.get(sym)
        if h and h.get("holdings"):
            kr[sym]["holdings"] = h["holdings"]
            kr[sym]["holdingsSource"] = "운용사 PDF"
            kr[sym]["holdingsAt"] = h["at"]
            applied += 1
    info["kr"] = kr
    info["description"] = (
        "ETF 연간 총보수(fee, %)와 비중 상위 구성종목. 미국=야후 fundProfile/topHoldings, "
        "한국=funetf 운용사 PDF(비중 %, scripts/build-etf-holdings.py) — holdings[].t = stock|gold|bond|cash|deriv|other"
    )
    json.dump(info, open(INFO, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(hold, open(HOLD_CACHE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    json.dump(dict(sorted(names.items())), open(NAMES, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    json.dump(cache, open(SUFFIX_CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    print(f"새로 받음 {ok}/{len(todo)} · 보유비중 적용 {applied}/{len(codes)} · 검색용 이름 {len(names)}개", flush=True)

if __name__ == "__main__":
    main()
