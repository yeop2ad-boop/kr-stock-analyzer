"""실적발표 일정 — data/earnings-calendar.json (2026-10-08 사용자 요청)

미국(S&P500): 나스닥 실적 캘린더(api.nasdaq.com/api/calendar/earnings?date=)를 오늘-14일 ~ +100일 평일마다 조회
  · next: 앞으로 가장 가까운 실적발표일(확정 일정) + 장 시작 전/후
  · last: 최근 14일 안에 실적을 발표한 날 → 앱이 7일 동안 이름 옆에 '실적' 마크
한국(코스피200·코스닥150): DART 공시목록(list.json)에서 최근 45일의 '영업(잠정)실적' 공정공시와 분기·반기·사업보고서
  · last: 이번 실적 시즌에 처음 실적이 나온 날(잠정실적이 있으면 그날) — DART_API_KEY가 없으면 이전 값 유지
  · 한국은 발표 예정일을 기계가 읽을 수 있게 미리 공시하지 않아 next는 없음(앱이 지난 분기 결산일로 추정)

로컬: python scripts/build-earnings-calendar.py   (DART_API_KEY 있으면 한국도)
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "earnings-calendar.json")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KST = timezone(timedelta(hours=9))


def get_json(url, tries=3, headers=None):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json", **(headers or {})})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            err = e
            time.sleep(2 * (k + 1))
    print("  실패:", url[:90], err, flush=True)
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
    return out if ok_days >= 20 else None


KR_KEYWORDS = ("영업(잠정)실적", "분기보고서", "반기보고서", "사업보고서")


def kr_calendar(today, key):
    syms = {c["symbol"].split(".")[0]: c["symbol"] for c in load("sector-map/data/kr-sectors.json")["companies"]}
    first = {}
    bgn = (today - timedelta(days=45)).strftime("%Y%m%d")
    end = today.strftime("%Y%m%d")
    for ty in ("I", "A"):
        for cls in ("Y", "K"):
            page = 1
            while True:
                q = urllib.parse.urlencode({"crtfc_key": key, "bgn_de": bgn, "end_de": end, "pblntf_ty": ty, "corp_cls": cls, "page_no": page, "page_count": 100})
                js = get_json(f"https://opendart.fss.or.kr/api/list.json?{q}")
                if not js or js.get("status") not in ("000", "013"):
                    print("  DART 응답:", (js or {}).get("status"), (js or {}).get("message"), flush=True)
                    break
                for it in js.get("list") or []:
                    name = it.get("report_nm") or ""
                    code = (it.get("stock_code") or "").strip()
                    if code not in syms or not any(k in name for k in KR_KEYWORDS):
                        continue
                    dt = it.get("rcept_dt")
                    iso = f"{dt[:4]}-{dt[4:6]}-{dt[6:]}"
                    sym = syms[code]
                    if sym not in first or iso < first[sym]:
                        first[sym] = iso
                if page >= int(js.get("total_page") or 1):
                    break
                page += 1
                time.sleep(0.3)
    print(f"한국: 최근 45일 실적 공시 종목 {len(first)}개", flush=True)
    return {s: {"last": d} for s, d in first.items()}


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
