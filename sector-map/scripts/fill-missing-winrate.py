"""승률 DB에 아직 없는 ETF·코인만 골라 즉시 채우기(2026-09-14 사용자 요청 "지금 바로 채워지게").
fetch-winrate-scores.ps1(일일 배치)과 같은 공식으로 score/up/total/from/to/rsi/wr1y/ret10y/ret1y/rsi10y/rsi1y/m12를 계산해
data/winrate-scores-us.json(scoresEtf·scoresCrypto)과 sector-map/data/etf-crypto-map.js(winRateScore/rsiWeekly/ret10yAvg)에 병합한다.
실행: python sector-map/scripts/fill-missing-winrate.py   (이후 일일 배치가 전체를 다시 계산하면 그 값으로 덮어써짐)
"""
import json, time, urllib.request, urllib.parse, pathlib, datetime, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data" / "winrate-scores-us.json"
MAP_PATH = ROOT / "sector-map" / "data" / "etf-crypto-map.js"
UA = {"User-Agent": "Mozilla/5.0"}

def get(url, tries=3):
    for i in range(tries):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))

def sorted_pairs(resp):
    r = resp["chart"]["result"][0]
    return sorted([(int(t), float(c)) for t, c in zip(r.get("timestamp") or [], r["indicators"]["quote"][0]["close"]) if c is not None])

def ym(t):
    d = datetime.datetime.fromtimestamp(t + 86400, datetime.timezone.utc)
    return d.year, d.month

def rsi_series(closes, period=14):
    if len(closes) < period + 2:
        return []
    gain = loss = 0.0
    for i in range(1, period + 1):
        d = closes[i] - closes[i - 1]
        gain += max(d, 0)
        loss += max(-d, 0)
    ag, al = gain / period, loss / period
    out = [100.0 if al == 0 else 100.0 - 100.0 / (1.0 + ag / al)]
    for i in range(period + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (period - 1) + max(d, 0)) / period
        al = (al * (period - 1) + max(-d, 0)) / period
        out.append(100.0 if al == 0 else 100.0 - 100.0 / (1.0 + ag / al))
    return out

def tail_avg(lst, n):
    if not lst:
        return None
    take = lst[-min(n, len(lst)):]
    return round(sum(take) / len(take), 1)

def compute(sym):
    q = urllib.parse.quote(sym)
    mo = sorted_pairs(get(f"https://query1.finance.yahoo.com/v8/finance/chart/{q}?range=11y&interval=1mo"))
    now = datetime.datetime.now(datetime.timezone.utc)
    while mo and ym(mo[-1][0]) == (now.year, now.month):
        mo.pop()
    mo = mo[-121:]
    total = len(mo) - 1
    if total < 6:
        return None
    up = sum(1 for i in range(1, len(mo)) if mo[i][1] - mo[i - 1][1] > 0)
    tail = min(12, total)
    m12, up_recent = [], 0
    for i in range(len(mo) - tail, len(mo)):
        prev = mo[i - 1][1]
        if prev != 0:
            chg = (mo[i][1] / prev - 1.0) * 100.0
            m12.append(round(chg, 1))
            up_recent += chg > 0
    wr1y = round(up_recent / len(m12) * 100, 1) if m12 else None
    base1y = mo[len(mo) - 1 - tail][1]
    ret1y = round((mo[-1][1] / base1y - 1.0) * 100.0, 1) if base1y else None
    ret10y = None
    if mo[0][1] > 0 and total >= 12:
        ratio = mo[-1][1] / mo[0][1]
        if ratio > 0:
            ret10y = round((ratio ** (12.0 / total) - 1.0) * 100.0, 1)
    rsi = rsi10y = rsi1y = None
    try:
        time.sleep(0.25)
        wk = [c for _, c in sorted_pairs(get(f"https://query1.finance.yahoo.com/v8/finance/chart/{q}?range=11y&interval=1wk"))]
        s = rsi_series(wk)
        if s:
            rsi, rsi10y, rsi1y = round(s[-1], 1), tail_avg(s, 520), tail_avg(s, 52)
    except Exception:
        pass
    f = lambda t: "%04d-%02d" % ym(t)
    return {"score": round(up / total * 100, 1), "up": up, "total": total, "from": f(mo[0][0]), "to": f(mo[-1][0]),
            "rsi": rsi, "wr1y": wr1y, "ret10y": ret10y, "ret1y": ret1y, "rsi10y": rsi10y, "rsi1y": rsi1y, "m12": m12}

db = json.loads(DB_PATH.read_bytes().decode("utf-8-sig"))
lines = MAP_PATH.read_bytes().decode("utf-8-sig").split("\n")
data = {}
for i, line in enumerate(lines):
    if line.startswith("const "):
        name, body = line[len("const "):].split(" = ", 1)
        data[name] = (i, json.loads(body.rstrip().rstrip(";")))

filled = {"ETF": 0, "코인": 0}
failed = []
for var, dbkey, label in (("ETF_MAP_DATA", "scoresEtf", "ETF"), ("CRYPTO_MAP_DATA", "scoresCrypto", "코인")):
    _, obj = data[var]
    target = db.setdefault(dbkey, {})
    missing = [c["symbol"] for c in obj["companies"] if c.get("symbol") and c["symbol"] not in target]
    print(f"{label} 누락 {len(missing)}개", file=sys.stderr)
    for n, sym in enumerate(missing, 1):
        try:
            e = compute(sym)
            if e:
                target[sym] = e
                filled[label] += 1
        except Exception as ex:
            failed.append((sym, str(ex)[:60]))
        if n % 10 == 0:
            print(f"  {label} {n}/{len(missing)}", file=sys.stderr)
        time.sleep(0.25)
    for c in obj["companies"]:
        e = target.get(c.get("symbol"))
        if e:
            c["winRateScore"], c["rsiWeekly"], c["ret10yAvg"] = e["score"], e["rsi"], e["ret10y"]

db["count"] = sum(len(db.get(k, {})) for k in ("scores", "scoresKr", "scoresEtf", "scoresCrypto"))
DB_PATH.write_bytes(json.dumps(db, ensure_ascii=False, indent=2).encode("utf-8"))
for var, (i, obj) in data.items():
    lines[i] = f"const {var} = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";"
MAP_PATH.write_bytes("\n".join(lines).encode("utf-8"))
print(json.dumps({"filled": filled, "failed": failed}, ensure_ascii=False))
