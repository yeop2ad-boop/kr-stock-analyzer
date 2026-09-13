"""업비트 KRW 마켓 코인 중 기존 야후 시총 TOP100에 없는 코인 100개를 "시가총액 순"으로 골라 야후 심볼로 매핑(2026-09-14 사용자 요청).
- 시가총액: 야후 암호화폐 스크리너(시총 내림차순) 상위 2,000개의 marketCap
- 같은 코인 판별: 기호(base) 일치 + 야후 "차트" 현재가가 업비트 원화가격÷USDT환율의 ±35% 이내
  (스크리너의 가격 필드는 오래된 값이 섞여 있어 판별에 쓰지 않음 — UNI 스크리너 3.76달러 vs 실제 6.25달러)
- 제외: 최근 1년 하루 20배↑·1/20↓ 가격 단절, 시세 30일 미만
결과: data/crypto-extra-upbit.json
"""
import json, re, time, urllib.request, urllib.parse, sys, pathlib

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}
OUT = pathlib.Path(r"C:\Users\User\Desktop\클로드코드\1. 미국기업분석\data\crypto-extra-upbit.json")

def get(url, timeout=25, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8"))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))

def base_of(sym):
    return re.sub(r"\d+$", "", sym.replace("-USD", "")).upper()

yq = []
for start in range(0, 2000, 250):
    d = get(f"https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=all_cryptocurrencies_us&count=250&start={start}")
    yq += [q for q in d["finance"]["result"][0]["quotes"] if q.get("symbol")]
    time.sleep(0.4)
top = [q["symbol"] for q in yq[:100]]
top_syms, top_bases = set(top), {base_of(s) for s in top}
by_base = {}
for q in yq:
    by_base.setdefault(base_of(q["symbol"]), []).append(q)
print("yahoo coins", len(yq), file=sys.stderr)

markets = [m for m in get("https://api.upbit.com/v1/market/all?isDetails=false") if m["market"].startswith("KRW-")]
tick = {}
codes = [m["market"] for m in markets]
for i in range(0, len(codes), 100):
    for t in get("https://api.upbit.com/v1/ticker?markets=" + ",".join(codes[i:i + 100])):
        tick[t["market"]] = t
usdt = tick.get("KRW-USDT", {}).get("trade_price") or 1390.0
print("KRW-USDT", usdt, file=sys.stderr)

def chart(sym):
    try:
        d = get(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range=1y&interval=1d", tries=2)
        r = d["chart"]["result"][0]
        pairs = [(t, c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c is not None]
        return r["meta"].get("regularMarketPrice") or (pairs[-1][1] if pairs else None), pairs
    except Exception:
        return None, []

# 업비트에 있고 기존 TOP100에 없는 기호 → 야후 스크리너에서 같은 기호 후보(시총 큰 순)
cands, nomatch = [], []
for m in markets:
    t = tick.get(m["market"])
    base = m["market"][4:].upper()
    if not t or base in ("USDT", "USDC", "USD1", "USDE") or base in top_bases:
        continue
    qs = sorted(by_base.get(base, []), key=lambda x: -(x.get("marketCap") or 0))
    if not qs:
        nomatch.append(base)
        continue
    cands.append({"base": base, "ko": m["korean_name"], "en": m["english_name"], "krw": t["trade_price"], "qs": qs, "cap": qs[0].get("marketCap") or 0})
cands.sort(key=lambda c: -c["cap"])
print("candidates", len(cands), "not in yahoo top2000", len(nomatch), file=sys.stderr)

picked, skipped = [], []
for c in cands:
    if len(picked) >= 110:  # 여유분 10개 — 앱·배치가 기존 100에서 빠진 만큼(가격 단절 제외 등) 채워 총 200을 맞춤
        break
    exp_usd = c["krw"] / usdt
    hit = None
    for q in c["qs"][:3]:
        if q["symbol"] in top_syms:
            continue
        price, pairs = chart(q["symbol"])
        time.sleep(0.12)
        if price and 0.65 <= price / exp_usd <= 1.35:
            hit = (q, pairs)
            break
    if not hit:
        skipped.append((c["base"], "야후 가격 불일치(다른 코인)"))
        continue
    q, pairs = hit
    if len(pairs) < 30:
        skipped.append((c["base"], "시세 30일 미만"))
        continue
    if any(a > 0 and b > 0 and (b / a >= 20 or a / b >= 20) for (_, a), (_, b) in zip(pairs, pairs[1:])):
        skipped.append((c["base"], "가격 단절(20배)"))
        continue
    picked.append({"symbol": q["symbol"], "base": c["base"], "nameKo": c["ko"], "nameEn": c["en"], "upbitMarket": "KRW-" + c["base"], "marketCapUsd": round(q.get("marketCap") or 0)})
    print(len(picked), q["symbol"], c["ko"], file=sys.stderr)

OUT.write_text(json.dumps({
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "description": "업비트 KRW 마켓 코인 중 야후 시총 TOP100에 없는 코인을 시가총액(야후 스크리너) 순으로 110개(앞 100개 사용 + 여유분 10개로 총 200 유지) — 기호 일치 + 야후 차트 가격이 업비트 원화가÷USDT의 ±35% 이내인 것만, 최근 1년 하루 20배↑·1/20↓ 가격 단절·시세 30일 미만 제외.",
    "coins": picked,
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"picked": len(picked), "candidates": len(cands), "notInYahooTop2000": nomatch, "skipped": skipped}, ensure_ascii=False))
