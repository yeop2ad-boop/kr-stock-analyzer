// 국내(KR) 과거분석 그래프용 FOMO지수 과거 시계열을 역산해 data/kr-fomo-history.json에 저장한다.
// 지금까지 그 그래프는 실제 지표가 아니라 코스피 지수 자체의 20일 변동성으로 흉내낸 대체값을 썼는데,
// FOMO지수(코스피200+코스닥150의 52주 신고가/신저가 근접 종목 비율)를 과거 시점마다 재계산해서 대체한다.
//
// 알고리즘은 worker.js의 실시간 FOMO 계산(fiftyTwoWeekStatusFromChart)과 동일하게, "그 시점 종가가
// 직전 1년 종가 범위의 고점 95%/저점 105% 이내인지"로 신고가권/신저가권을 판정한다. 차이는 실시간
// 계산이 매일 "오늘 기준 최근 1년"만 보는 반면, 여기서는 각 과거 anchor 시점 기준 "그 시점까지의
// 최근 1년"을 종목별 전체 히스토리에서 슬라이스해서 계산한다는 것.
//
// ⚠️ 알려진 한계: 종목 유니버스가 data/kr-universe-kospi200-kosdaq150.json(2026-08 기준 KODEX 200·
// 코스닥150 편입 종목)로 고정돼 있어, 그 시점 실제 코스피200/코스닥150 구성종목과는 다를 수 있음
// (생존편향 — 최근 상장·편입된 종목은 과거 시점에 존재하지 않았으므로 그 anchor에서는 자동 제외됨).
// 그래서 분모는 실시간 계산처럼 "전체 유니버스 350개 고정"이 아니라 "그 시점에 1년치 데이터가 있던
// 종목 수"로 계산한다(고정 분모를 쓰면 초기 anchor일수록 미상장 종목이 많아 점수가 인위적으로 0에
// 가깝게 왜곡되기 때문).
//
// 로컬에서 수동 실행: node scripts/scan-kr-fomo-history.js

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const UNIVERSE_FILE = path.join(DATA_DIR, "kr-universe-kospi200-kosdaq150.json");
const OUTPUT_FILE = path.join(DATA_DIR, "kr-fomo-history.json");

const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };
const START_YEAR = 2011; // 기존 과거분석 차트(computeKrMacroScoreChartData)와 동일한 시작연도
const NEAR_PCT = 0.05; // 52주 고점/저점 5% 이내를 "근접"으로 판정(worker.js와 동일)
const MIN_TRAILING_DAYS = 150; // 직전 1년 창에 최소 이 정도 거래일이 있어야 유효한 판정으로 인정
const ANCHOR_TOLERANCE_SEC = 20 * 24 * 3600; // anchor 날짜와 실제 거래일의 최대 허용 오차(20일, 클라이언트 로직과 동일)
const YEAR_SEC = 365 * 24 * 3600;

async function fetchJson(url) {
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function yahooChart(symbol, range, interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  return fetchJson(url);
}

function chartClosePairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

function loadUniverse() {
  const data = JSON.parse(fs.readFileSync(UNIVERSE_FILE, "utf8"));
  const symbols = [...(data.kospi200 || []), ...(data.kosdaq150 || [])].map((r) => r.symbol);
  return [...new Set(symbols)];
}

async function mapWithConcurrency(items, limit, fn, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        results[i] = await fn(items[i], i);
      } catch {
        results[i] = null;
      }
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// anchor 시점마다 판정할 리스트를 생성: 매년 3/1, 9/1(6개월 간격) — 기존 차트와 동일한 cadence
function buildAnchors() {
  const now = new Date();
  const anchors = [];
  for (let d = new Date(START_YEAR, 2, 1); d < now; d.setMonth(d.getMonth() + 6)) {
    anchors.push({ label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, sec: Math.floor(d.getTime() / 1000) });
  }
  return anchors;
}

// 한 종목의 전체 종가 히스토리(pairs)에서, 각 anchor 시점의 "신고가권/신저가권 여부"를 한 번에 판정
function evaluateTicker(pairs, anchors) {
  const out = new Array(anchors.length).fill(null);
  if (pairs.length < MIN_TRAILING_DAYS) return out;
  let windowStart = 0; // 슬라이딩 윈도우 시작 인덱스(직전 1년의 왼쪽 경계) — anchors가 시간순이라 매번 처음부터 훑지 않아도 됨
  for (let ai = 0; ai < anchors.length; ai++) {
    const anchorSec = anchors[ai].sec;
    // anchor에 가장 가까운 거래일 인덱스 탐색
    let closestIdx = -1;
    let closestDiff = Infinity;
    for (let i = windowStart; i < pairs.length; i++) {
      const diff = Math.abs(pairs[i].t - anchorSec);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
      if (pairs[i].t > anchorSec + ANCHOR_TOLERANCE_SEC) break; // 이미 지나쳤으면 더 볼 필요 없음
    }
    if (closestIdx < 0 || closestDiff > ANCHOR_TOLERANCE_SEC) continue;

    // 직전 1년(anchor 종가 시점 - 365일 ~ anchor) 구간 슬라이스
    const anchorT = pairs[closestIdx].t;
    let lo = closestIdx;
    while (lo > 0 && pairs[lo - 1].t >= anchorT - YEAR_SEC) lo--;
    const trailing = pairs.slice(lo, closestIdx + 1);
    if (trailing.length < MIN_TRAILING_DAYS) continue;

    const price = pairs[closestIdx].c;
    const high = Math.max(...trailing.map((p) => p.c));
    const low = Math.min(...trailing.map((p) => p.c));
    out[ai] = { isHigh: price >= high * (1 - NEAR_PCT), isLow: price <= low * (1 + NEAR_PCT) };
    windowStart = lo; // 다음 anchor 탐색은 이 지점부터
  }
  return out;
}

async function main() {
  console.log("KR 유니버스 로딩...");
  const universe = loadUniverse();
  console.log(`${universe.length}개 종목, 전체 히스토리 조회 중(동시 8개)...`);

  const anchors = buildAnchors();
  console.log(`anchor ${anchors.length}개: ${anchors.map((a) => a.label).join(", ")}`);

  const perTicker = await mapWithConcurrency(
    universe,
    8,
    async (symbol) => {
      const chart = await yahooChart(symbol, "max");
      const pairs = chartClosePairs(chart);
      return evaluateTicker(pairs, anchors);
    },
    (done, total) => {
      if (done % 25 === 0 || done === total) console.log(`${done}/${total} 완료`);
    }
  );

  const points = anchors.map((a, ai) => {
    let highCount = 0;
    let lowCount = 0;
    let validCount = 0;
    for (const result of perTicker) {
      const r = result && result[ai];
      if (!r) continue;
      validCount++;
      if (r.isHigh) highCount++;
      if (r.isLow) lowCount++;
    }
    const score = validCount > 0 ? highCount / validCount - lowCount / validCount : null;
    return { date: a.label, score: score === null ? null : Math.round(score * 1000) / 1000, validCount, highCount, lowCount };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    universeSize: universe.length,
    note:
      "종목 유니버스는 2026-08 기준 KODEX 200·코스닥150 편입종목 스냅샷을 과거로 투영한 근사치라 생존편향이 있음(과거 미상장 종목은 자동 제외). " +
      "score는 그 anchor 시점에 1년치 데이터가 있던 종목만으로 계산(validCount). 공식 지표가 아니며 참고용입니다.",
    points,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`저장 완료: ${OUTPUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
