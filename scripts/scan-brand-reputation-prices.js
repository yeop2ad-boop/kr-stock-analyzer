// 브랜드평판순(data/brand-reputation-*.json) 탭에 표시되는 현재가·1년 변동을 매일 미리 계산해
// data/brand-reputation-prices.json에 저장한다. 순위·점수 자체는 연 1회 발표되는 정적 데이터라
// 매번 프론트에서 실시간으로(무료 CORS 프록시를 거쳐) 조회하면 30개+ 종목을 순차 요청하느라
// 화면이 한참 걸렸는데, GitHub Actions는 프록시 없이 Yahoo Finance를 직접 호출할 수 있어
// 여기서 미리 구워두고 프론트는 이 파일만 읽어 즉시 표시하도록 함.
//
// 로컬에서 수동 실행: node scripts/scan-brand-reputation-prices.js

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(DATA_DIR, "brand-reputation-prices.json");
const SOURCE_FILES = ["brand-reputation-harris.json", "brand-reputation-reptrak.json", "brand-reputation-yougov.json"];

const YEAR_SECONDS = 365.25 * 24 * 3600;
const HISTORY_TOLERANCE_SECONDS = 20 * 24 * 3600;
// Yahoo가 기본 UA로 오는 요청을 이따금 차단해 실제 브라우저처럼 보이는 UA를 지정
const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };

function collectTickers() {
  const tickers = new Set();
  for (const file of SOURCE_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    (data.companies || []).forEach((c) => {
      if (c.ticker) tickers.add(c.ticker);
    });
  }
  return [...tickers];
}

function closestPair(pairs, targetTimestamp) {
  let closest = null;
  let minDiff = Infinity;
  for (const p of pairs) {
    const diff = Math.abs(p.t - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

async function getPriceAnd1yReturn(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const chart = await res.json();
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return null;

  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps
    .map((t, i) => ({ t, c: closes[i] }))
    .filter((p) => p.c !== null && p.c !== undefined)
    .sort((a, b) => a.t - b.t);
  if (pairs.length < 2) return null;

  const latest = pairs[pairs.length - 1];
  const target = latest.t - YEAR_SECONDS;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS) {
    // 상장 1년 미만 등으로 1년 전 시점이 없는 경우: 현재가만 기록하고 변동은 비워둠
    return { price: result.meta.regularMarketPrice, currency: result.meta.currency, oneYearReturn: null, oneYearChangeAmt: null };
  }
  const base = closestPair(pairs, target);
  return {
    price: result.meta.regularMarketPrice,
    currency: result.meta.currency,
    oneYearReturn: base && base.c ? ((latest.c - base.c) / base.c) * 100 : null,
    oneYearChangeAmt: base && base.c ? latest.c - base.c : null,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        console.error(`[${items[i]}] 실패: ${err.message}`);
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const tickers = collectTickers();
  console.log(`대상 티커 ${tickers.length}개 조회 시작...`);

  const metricsList = await mapWithConcurrency(tickers, 6, getPriceAnd1yReturn);

  const prices = {};
  let successCount = 0;
  tickers.forEach((t, i) => {
    if (metricsList[i]) {
      prices[t] = metricsList[i];
      successCount++;
    }
  });

  const output = { updatedAt: new Date().toISOString(), prices };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`완료 — ${successCount}/${tickers.length}개 성공, ${OUTPUT_FILE}에 저장됨`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
