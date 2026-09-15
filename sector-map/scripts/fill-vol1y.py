"""S리포트 '변동성' 비교용 1년 변동성(vol1y)을 지금 바로 채우기(2026-09-15 사용자 요청).
vol1y = 최근 52주 주간 수익률의 표준편차 × √52 × 100 (연환산 %, 소수 1자리).
fetch-winrate-scores.ps1(일일 배치)·fetch-ipo-map.ps1(IPO 배치)도 같은 공식으로 계산하므로, 이 스크립트는 배치가 돌기 전 1회용.
대상: data/winrate-scores-us.json의 scores·scoresKr·scoresEtf·scoresCrypto 전 종목 + sector-map/data/ipo-map.js의 kr·us 종목.
실행: python sector-map/scripts/fill-vol1y.py
"""
import json, time, urllib.request, urllib.parse, pathlib, sys, math, re
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data" / "winrate-scores-us.json"
IPO_PATH = ROOT / "sector-map" / "data" / "ipo-map.js"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url, tries=3):
    for i in range(tries):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def vol1y_from_closes(closes):
    closes = [c for c in closes if c is not None and c > 0]
    if len(closes) < 27:  # 반년치 주봉도 없으면 계산하지 않음
        return None
    closes = closes[-53:]
    rets = [closes[i] / closes[i - 1] - 1.0 for i in range(1, len(closes))]
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
    return round(math.sqrt(var) * math.sqrt(52) * 100, 1)


def compute(sym):
    q = urllib.parse.quote(sym)
    r = get(f"https://query1.finance.yahoo.com/v8/finance/chart/{q}?range=2y&interval=1wk")["chart"]["result"][0]
    pairs = sorted((int(t), c) for t, c in zip(r.get("timestamp") or [], r["indicators"]["quote"][0]["close"]) if c is not None)
    time.sleep(0.15)
    return vol1y_from_closes([c for _, c in pairs])


db = json.loads(DB_PATH.read_bytes().decode("utf-8-sig"))
ipo_raw = IPO_PATH.read_bytes()
ipo_bom = ipo_raw.startswith(b"\xef\xbb\xbf")
ipo_text = ipo_raw.decode("utf-8-sig").strip()
ipo_body = re.sub(r";\s*$", "", ipo_text[len("const IPO_MAP_DATA = "):])
ipo_body = re.sub(r":\s*-?Infinity\b", ":null", ipo_body)
ipo_body = re.sub(r":\s*NaN\b", ":null", ipo_body)
ipo = json.loads(ipo_body)

symbols = set()
for k in ("scores", "scoresKr", "scoresEtf", "scoresCrypto"):
    symbols.update((db.get(k) or {}).keys())
for side in ("kr", "us"):
    symbols.update(c["symbol"] for c in (ipo.get(side) or {}).get("companies", []) if c.get("symbol"))
symbols = sorted(symbols)
print(f"대상 {len(symbols)}개", file=sys.stderr)

result, failed = {}, []


def work(sym):
    try:
        v = compute(sym)
        if v is not None:
            result[sym] = v
    except Exception as ex:
        failed.append((sym, str(ex)[:60]))


done = 0
with ThreadPoolExecutor(max_workers=4) as ex:
    for _ in ex.map(work, symbols):
        done += 1
        if done % 100 == 0:
            print(f"  {done}/{len(symbols)} (실패 {len(failed)})", file=sys.stderr)

for k in ("scores", "scoresKr", "scoresEtf", "scoresCrypto"):
    for sym, e in (db.get(k) or {}).items():
        if sym in result:
            e["vol1y"] = result[sym]
DB_PATH.write_bytes(json.dumps(db, ensure_ascii=False, indent=2).encode("utf-8"))

for side in ("kr", "us"):
    for c in (ipo.get(side) or {}).get("companies", []):
        if c.get("symbol") in result:
            c["vol1y"] = result[c["symbol"]]
out = "const IPO_MAP_DATA = " + json.dumps(ipo, ensure_ascii=False, separators=(",", ":")) + ";"
IPO_PATH.write_bytes((b"\xef\xbb\xbf" if ipo_bom else b"") + out.encode("utf-8"))
print(json.dumps({"filled": len(result), "failed": len(failed), "failedSample": failed[:10]}, ensure_ascii=False))
