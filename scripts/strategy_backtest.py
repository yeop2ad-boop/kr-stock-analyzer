# -*- coding: utf-8 -*-
"""투자방법 월별 리밸런싱 백테스트(2026-10-07 사용자 지정 규칙) — build-invest-analysis.py가 불러 쓴다.

매달 1일, 전월 말까지의 데이터로 종목을 새로 고르고 그달 내내 들고 간다(수수료·세금·배당 미반영).
  · 10년 승률 매매   : 상장 5년(코인 3년) 이상 종목 중 직전 최대 120개월 월간 승률 TOP20, 각 5%
  · 52주 신고가 매매 : 52주 구간 위치 상단 10%(≥90%) 종목 중 시가총액 TOP20, 각 5% — 20개가 안 되면 나머지 현금
  · 52주 신저가 매매 : 52주 구간 위치 하단 10%(≤10%) 종목 중 시가총액 TOP20, 각 5% — 20개가 안 되면 나머지 현금
  · 섹터 순환 매매   : 전월 한 달 수익률 1위 섹터의 시가총액 TOP20 — 종목 수로 균등(20개면 5%씩)
과거 시가총액 = 지금 시가총액 × (그때 주가 ÷ 지금 주가)로 추정(주식 수 변화 무시). 52주 위치는 주봉 종가 기준.
비교군은 오늘의 구성종목(코스피200+코스닥150 / S&P500 / 코인 시총 상위)이라 그 사이 빠진 종목이 없는 생존편향이 있다.
"""
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

KST = 9 * 3600
TOP = 20
# 가격 단절(액면 변경·토큰 교환·데이터 오류) — 한 칸(일·주)에 4배 이상 오르거나 1/4 아래로 떨어지면 실제 등락이 아니라고 보고
# 그 칸 수익률은 0으로 친다. 이걸 안 하면 코인 섹터 순환이 10년 +2억%처럼 터진다(2026-10-07 점검)
BREAK_RATIO = 4.0


def _sane(ratio):
    return 1 / BREAK_RATIO < ratio < BREAK_RATIO


UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def _get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(1.5 * (k + 1))
    return None


def chart(symbol, rng, interval):
    d = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range={rng}&interval={interval}")
    try:
        res = d["chart"]["result"][0]
        # 백테스트는 최근 10년 + 승률 계산용 10년이면 충분 — 그보다 오래된 봉은 버린다(계산량·1970년 이전 날짜)
        cutoff = time.time() - 22 * 365.25 * 86400
        pts = [(t, c) for t, c in zip(res.get("timestamp") or [], res["indicators"]["quote"][0].get("close") or []) if c and c > 0 and t >= cutoff]
    except Exception:
        return []
    pts.sort()
    return pts


def fetch_all(symbols, rng, interval, workers=4):
    out = {}
    with ThreadPoolExecutor(workers) as ex:
        for sym, pts in zip(symbols, ex.map(lambda s: chart(s, rng, interval), symbols)):
            out[sym] = pts
    # 야후가 몰린 요청을 거절한 종목만 천천히 다시
    for _ in range(2):
        miss = [s for s in symbols if not out.get(s)]
        if not miss:
            break
        time.sleep(4)
        for s in miss:
            out[s] = chart(s, rng, interval)
            time.sleep(0.5)
    return out


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def mkey(t):
    # fromtimestamp는 윈도우에서 1970년 이전(음수) 시각을 못 다뤄서 epoch + timedelta로 계산
    d = _EPOCH + timedelta(seconds=t + KST)
    return d.year * 12 + d.month - 1  # 정수 월 번호


def mlabel(m):
    return f"{m // 12}-{m % 12 + 1:02d}"


def month_closes(pts):
    """주봉 → {월 번호: 그달 마지막 종가}"""
    out = {}
    for t, c in pts:
        out[mkey(t)] = c
    return out


def backtest(universe, weekly, *, min_months=60, sector_min=5, now_ts=None, years=10):
    """universe: [{symbol, name, sector, cap}], weekly: {sym: [(t, close)]}
    → {strategyKey: {"picks": {월: [(sym, w)]}, ...}}, 그리고 섹터 1위 이력"""
    now_ts = now_ts or int(time.time())
    cur_m = mkey(now_ts)
    start_m = cur_m - years * 12
    by = {u["symbol"]: u for u in universe}
    mc = {s: month_closes(weekly.get(s) or []) for s in by}
    last = {s: (weekly[s][-1][1] if weekly.get(s) else None) for s in by}

    def cap_at(s, m):  # m월 말 추정 시가총액
        p = mc[s].get(m)
        return by[s]["cap"] * p / last[s] if p and last[s] and by[s].get("cap") else None

    def winrate_at(s, m):
        closes = mc[s]
        months = [k for k in range(m - 120, m + 1) if k in closes]
        rets = []
        for k in months:
            if k - 1 in closes and _sane(closes[k] / closes[k - 1]):
                rets.append(closes[k] / closes[k - 1] - 1)
        if len(rets) < min_months:
            return None
        return sum(1 for r in rets if r > 0) / len(rets)

    def pos52_at(s, m):
        # m월 말 기준 직전 52주 주봉 종가 구간에서의 위치(0~1)
        pts = weekly.get(s) or []
        end = [t for t, _ in pts if mkey(t) <= m]
        if not end:
            return None
        t_end = end[-1]
        win = [c for t, c in pts if t_end - 364 * 86400 < t <= t_end]
        if len(win) < 40:
            return None
        lo, hi = min(win), max(win)
        return (win[-1] - lo) / (hi - lo) if hi > lo else None

    picks = {"winrate": {}, "high52": {}, "low52": {}, "sector": {}}
    sector_hist = {}
    for M in range(start_m, cur_m + 1):
        P = M - 1  # 전월 말 데이터로 고른다
        alive = [s for s in by if P in mc[s]]
        caps = {s: cap_at(s, P) for s in alive}
        # 10년 승률
        wr = [(s, winrate_at(s, P)) for s in alive]
        wr = sorted([x for x in wr if x[1] is not None], key=lambda x: (-x[1], -(caps.get(x[0]) or 0)))[:TOP]
        picks["winrate"][M] = [(s, 1 / TOP) for s, _ in wr]
        # 52주 신고가·신저가
        pos = {s: pos52_at(s, P) for s in alive}
        hi = sorted([s for s in alive if pos[s] is not None and pos[s] >= 0.9], key=lambda s: -(caps.get(s) or 0))[:TOP]
        lo = sorted([s for s in alive if pos[s] is not None and pos[s] <= 0.1], key=lambda s: -(caps.get(s) or 0))[:TOP]
        picks["high52"][M] = [(s, 1 / TOP) for s in hi]
        picks["low52"][M] = [(s, 1 / TOP) for s in lo]
        # 섹터 순환: 전월(P) 한 달 수익률(시총 가중) 1위 섹터
        agg = {}
        for s in alive:
            sec = by[s].get("sector")
            if not sec or P - 1 not in mc[s]:
                continue
            c0 = cap_at(s, P - 1)
            if not c0:
                continue
            ratio = mc[s][P] / mc[s][P - 1]
            if not _sane(ratio):
                continue
            r = ratio - 1
            a = agg.setdefault(sec, [0.0, 0.0, 0])
            a[0] += r * c0
            a[1] += c0
            a[2] += 1
        cand = {k: v[0] / v[1] for k, v in agg.items() if v[2] >= sector_min and v[1] > 0}
        if cand:
            best = max(cand, key=cand.get)
            sector_hist[M] = (best, cand[best] * 100)
            members = sorted([s for s in alive if by[s].get("sector") == best], key=lambda s: -(caps.get(s) or 0))[:TOP]
            picks["sector"][M] = [(s, 1 / len(members)) for s in members] if members else []
        else:
            picks["sector"][M] = []
    return picks, sector_hist


def index_series(picks, prices, kind):
    """picks {월: [(sym, w)]}, prices {sym: [(t, close)]} → [(t, level)] (시작=100)
    kind: "d"(일봉) / "w"(주봉). 칸마다 그 칸이 속한 달의 보유 종목·비중으로 수익률을 더한다(빈 비중 = 현금 0%)."""
    KSTD = 9 * 3600
    bucket = (lambda t: (t + KSTD) // 86400) if kind == "d" else (lambda t: (t + KSTD - 4 * 86400) // (7 * 86400))
    per = {}
    first_t = {}
    for s, pts in prices.items():
        m = {}
        for t, c in pts:
            k = bucket(t)
            m[k] = (t, c)
            first_t.setdefault(k, t)
        per[s] = m
    keys = sorted(first_t)
    if not keys:
        return []
    months = sorted(picks)
    first_month = months[0] if months else None
    level = 100.0
    prev = {}
    out = []
    for k in keys:
        t = first_t[k]
        M = mkey(t)
        if first_month is None or M < first_month:
            for s in per:
                if k in per[s]:
                    prev[s] = per[s][k][1]
            continue
        hold = picks.get(M) or []
        r = 0.0
        for s, w in hold:
            p = per.get(s, {}).get(k)
            if p and s in prev and prev[s] and _sane(p[1] / prev[s]):
                r += w * (p[1] / prev[s] - 1)
        for s in per:
            if k in per[s]:
                prev[s] = per[s][k][1]
        if out:
            level *= 1 + r
        out.append((t, round(level, 3)))
    return out


def changes(picks, names, n_months=6):
    """최근 n번 리밸런싱의 편입·퇴출 [{m, in:[{s,n}], out:[{s,n}]}] (최근 달이 앞)"""
    months = sorted(picks)
    out = []
    for M in months[-n_months:][::-1]:
        cur = {s for s, _ in picks.get(M) or []}
        prv = {s for s, _ in picks.get(M - 1) or []}
        out.append(
            {
                "m": mlabel(M),
                "in": [{"s": s, "n": names.get(s, s)} for s in sorted(cur - prv, key=lambda s: names.get(s, s))],
                "out": [{"s": s, "n": names.get(s, s)} for s in sorted(prv - cur, key=lambda s: names.get(s, s))],
                "count": len(cur),
            }
        )
    return out
