// 미국주식(승률 DB scores = S&P500+나스닥100 추가분) 연간 매출액·순이익 10년치 — SEC XBRL companyconcept API로 수집해
// data/us-annual-financials.json에 저장. 미래예측 "매출액 vs 주가 vs 순이익"(1년·5년·10년) 그래프의 5년·10년 재무 데이터 소스
// (Yahoo fundamentals-timeseries는 최근 4개년만 주므로 10년치는 SEC가 유일한 무료 소스). GitHub Actions에서 월 1회 실행.
//
// 로컬 수동 실행: node scripts/scan-us-annual-financials.js  (API 키 불필요, SEC는 User-Agent에 연락처만 요구)
// 형식: { generatedAt, items: { TICKER: { cik, years: { "2016": { rev, ni, end: "2016-12-31" }, ... } } } }

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "us-annual-financials.json");
const DB_FILE = path.join(DATA_DIR, "winrate-scores-us.json");
const UA = "MarketMap research hyhykhy6@gmail.com";
const GAP_MS = 110; // SEC 권장 초당 10회 이하

const REV_TAGS = [
  ["us-gaap", "Revenues"],
  ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"],
  ["us-gaap", "SalesRevenueNet"],
  ["us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  ["us-gaap", "RevenuesNetOfInterestExpense"],
  ["us-gaap", "TotalRevenuesAndOtherIncome"],
  ["us-gaap", "InterestAndDividendIncomeOperating"],
  ["us-gaap", "RegulatedAndUnregulatedOperatingRevenue"],
  ["ifrs-full", "Revenue"],
];
const NI_TAGS = [
  ["us-gaap", "NetIncomeLoss"],
  ["us-gaap", "ProfitLoss"],
  ["us-gaap", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  ["ifrs-full", "ProfitLoss"],
  ["ifrs-full", "ProfitLossAttributableToOwnersOfParent"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

// 회계연도(FY) 값만: 10-K/20-F/40-F, 기간이 약 1년(340~380일)인 항목. 같은 연도(end 연도 기준)는 가장 늦게 제출된 값 사용
function annualFrom(facts) {
  const out = {};
  for (const u of facts) {
    if (u.fp !== "FY" || !/^(10-K|20-F|40-F)/.test(u.form || "")) continue;
    if (!u.start || !u.end) continue;
    const days = (new Date(u.end) - new Date(u.start)) / 86400000;
    if (days < 340 || days > 380) continue;
    const key = u.end.slice(0, 4);
    const prev = out[key];
    if (!prev || (u.filed || "") >= prev.filed) out[key] = { v: u.val, end: u.end, filed: u.filed || "" };
  }
  return out;
}

async function fetchMetric(cik, tags) {
  const merged = {};
  for (const [tax, tag] of tags) {
    let d;
    try {
      d = await getJson(`https://data.sec.gov/api/xbrl/companyconcept/CIK${String(cik).padStart(10, "0")}/${tax}/${tag}.json`);
    } catch {
      await sleep(GAP_MS);
      continue;
    }
    await sleep(GAP_MS);
    const units = d.units || {};
    const facts = units.USD || Object.values(units)[0] || [];
    for (const [k, v] of Object.entries(annualFrom(facts))) if (!merged[k]) merged[k] = v;
    if (Object.keys(merged).length >= 10) break;
  }
  return merged;
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const tickers = Object.keys(db.scores || {}).sort();
  const ct = await getJson("https://www.sec.gov/files/company_tickers.json");
  const cikOf = {};
  for (const v of Object.values(ct)) cikOf[String(v.ticker).toUpperCase()] = Number(v.cik_str);

  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(OUT_FILE, "utf8")).items || {};
  } catch {}

  const items = {};
  const missing = [];
  for (let i = 0; i < tickers.length; i++) {
    const t = tickers[i];
    const cik = cikOf[t.toUpperCase()] || cikOf[t.toUpperCase().replace("-", ".")] || cikOf[t.toUpperCase().replace(".", "-")];
    if (!cik) {
      missing.push(t);
      if (prev[t]) items[t] = prev[t];
      continue;
    }
    try {
      const rev = await fetchMetric(cik, REV_TAGS);
      const ni = await fetchMetric(cik, NI_TAGS);
      const years = {};
      for (const y of [...new Set([...Object.keys(rev), ...Object.keys(ni)])].sort()) {
        years[y] = { rev: rev[y] ? rev[y].v : null, ni: ni[y] ? ni[y].v : null, end: (rev[y] || ni[y]).end };
      }
      items[t] = Object.keys(years).length ? { cik, years } : prev[t] || { cik, years };
    } catch (e) {
      console.error(`[실패] ${t}: ${e.message}`);
      if (prev[t]) items[t] = prev[t];
    }
    if (i % 25 === 0) console.log(`${i}/${tickers.length} ${t}`);
  }
  const out = {
    generatedAt: new Date().toISOString(),
    source: "SEC XBRL companyconcept (data.sec.gov) — 10-K/20-F 연간(FY) 매출·순이익(USD)",
    count: Object.keys(items).length,
    missingCik: missing,
    items,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  console.log(`완료: ${out.count}개, CIK 없음 ${missing.length}개`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
