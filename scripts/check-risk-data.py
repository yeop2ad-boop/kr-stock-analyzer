# 리스크 탭 10개 항목 데이터 점검 — 배포 전에 "빠진 데이터·이상한 값"을 한눈에 본다.
# 실행: python scripts/check-risk-data.py   (실패 조건에 걸리면 종료 코드 1)
#
# 이 점검이 생긴 이유(2026-09-21): 미국 데이터를 다시 만들다가 조회 창을 잘못 잡아
# 분기 매출 비교가 494곳 → 1곳으로 줄어든 걸 눈으로 보고서야 알았다. 같은 사고를 막으려고 수치로 확인한다.
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
KR = os.path.join(ROOT, "data", "dart-financials.json")
US = os.path.join(ROOT, "data", "us-workforce.json")
SR = os.path.join(ROOT, "data", "sector-revenue.json")

# 항목별 최소 기대치(이보다 적으면 수집이 망가진 것으로 본다)
MIN_KR = {"임금": 300, "인원": 330, "유상증자·전환사채": 340, "EPS 값": 320, "분기 매출": 300, "분기 순이익": 330, "부채비율": 330, "급락률": 340, "업종": 340}
MIN_US = {"임금": 300, "인원": 380, "유상증자·전환사채": 480, "EPS 값": 380, "분기 매출": 380, "분기 순이익": 420, "부채비율": 300, "급락률": 480, "업종": 480}


def load(p):
    return json.load(open(p, encoding="utf-8-sig"))


def report(title, counts, minimums, total):
    print(f"\n■ {title} ({total}종목)")
    bad = []
    for k, v in counts.items():
        need = minimums.get(k, 0)
        mark = "OK " if v >= need else "!! "
        print(f"  {mark}{k}: {v}/{total} (최소 {need})")
        if v < need:
            bad.append(f"{title} {k} {v} < {need}")
    return bad


def main():
    kr = load(KR)["items"]
    us = load(US)["items"]
    sr = load(SR)
    fails = []

    kr_counts = {
        "임금": sum(1 for i in kr if (i.get("recent") or {}).get("avgSalary") and (i.get("recentPrev") or {}).get("avgSalary")),
        "인원": sum(1 for i in kr if (i.get("recent") or {}).get("headcount") and (i.get("recentPrev") or {}).get("headcount")),
        "유상증자·전환사채": sum(1 for i in kr if (i.get("issuance") or {}).get("marketCap")),
        "EPS 값": sum(1 for i in kr if (i.get("eps") or {}).get("current") is not None),
        "분기 매출": sum(1 for i in kr if (i.get("quarter") or {}).get("revenue") is not None),
        "분기 순이익": sum(1 for i in kr if (i.get("quarter") or {}).get("netIncome") is not None),
        "부채비율": sum(1 for i in kr if (i.get("debt") or {}).get("changePp") is not None),
        "급락률": sum(1 for i in kr if i.get("crash")),
        "업종": sum(1 for i in kr if i.get("sector")),
    }
    fails += report("한국", kr_counts, MIN_KR, len(kr))

    us_counts = {
        "임금": sum(1 for v in us.values() if v.get("medianPay") and v.get("medianPayPrevYear")),
        "인원": sum(1 for v in us.values() if v.get("headcount") and v.get("headcountPrevYear")),
        "유상증자·전환사채": sum(1 for v in us.values() if (v.get("issuance") or {}).get("marketCap")),
        "EPS 값": sum(1 for v in us.values() if (v.get("eps") or {}).get("current") is not None),
        "분기 매출": sum(1 for v in us.values() if (v.get("quarter") or {}).get("revenue") is not None),
        "분기 순이익": sum(1 for v in us.values() if (v.get("quarter") or {}).get("netIncome") is not None),
        "부채비율": sum(1 for v in us.values() if (v.get("debt") or {}).get("changePp") is not None),
        "급락률": sum(1 for v in us.values() if v.get("crash")),
        "업종": sum(1 for v in us.values() if v.get("sector")),
    }
    fails += report("미국", us_counts, MIN_US, len(us))

    print(f"\n■ 섹터 매출: 한국 {len(sr['kr']['companies'])}곳 / {len(sr['kr']['sectors'])}섹터 · 미국 {len(sr['us']['companies'])}곳 / {len(sr['us']['sectors'])}섹터")

    # 이상값 — 단위 오류나 기간 불일치를 잡는 상식 범위
    print("\n■ 이상값")
    odd = []
    for name, rows in (("한국", [(i.get("corpName"), i) for i in kr]), ("미국", [(t, v) for t, v in us.items()])):
        for label, v in rows:
            q, db, c = v.get("quarter") or {}, v.get("debt") or {}, v.get("crash") or {}
            if q.get("revenuePct") is not None and abs(q["revenuePct"]) > 400:
                odd.append(f"{name} {label} 매출 {q['revenuePct']:.0f}%")
            if db.get("changePp") is not None and abs(db["changePp"]) > 500 and not db.get("tinyEquity"):
                odd.append(f"{name} {label} 부채 {db['changePp']:.0f}%p")
            if c.get("pct") is not None and c["pct"] < -70:
                odd.append(f"{name} {label} 급락 {c['pct']:.0f}%")
    print("  " + (", ".join(odd) if odd else "없음"))

    if fails:
        print("\n실패:", "; ".join(fails))
        sys.exit(1)
    print("\n점검 통과")


if __name__ == "__main__":
    main()
