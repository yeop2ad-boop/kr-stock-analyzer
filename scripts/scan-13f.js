// SEC EDGAR 13F-HR(분기 보유종목 공시)를 매일 확인해, 새 공시가 뜬 기관만 top20을 다시 계산해
// data/insight-<institution>.json 으로 저장한다. GitHub Actions(.github/workflows/insight-13f-scan.yml)에서
// 매일 실행되며, Cloudflare Worker와 달리 메모리 제한이 없어 블랙록·뱅가드처럼 8~26MB짜리 큰 파일도 안전하게 처리한다.
//
// 로컬에서 수동 실행: node scripts/scan-13f.js
// (Node 18+ 필요 — 전역 fetch 사용. package.json에 "type" 지정 없어도 동작하도록 CommonJS로 작성)

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STATE_FILE = path.join(DATA_DIR, "insight-state.json");

// SEC 요청 시 반드시 식별 가능한 User-Agent를 보내야 함(SEC의 공정 이용 정책)
const SEC_HEADERS = { "User-Agent": "yeopinvest.com contact@yeopinvest.com" };

const INSTITUTIONS = {
  berkshire: { cik: "1067983", filerName: "Berkshire Hathaway Inc" },
  blackrock: { cik: "2012383", filerName: "BlackRock, Inc." },
  vanguard: { cik: "102909", filerName: "Vanguard Group Inc" },
  goldman: { cik: "886982", filerName: "Goldman Sachs Group Inc" },
  morganStanley: { cik: "895421", filerName: "Morgan Stanley" },
  jpmorgan: { cik: "19617", filerName: "JPMorgan Chase & Co" },
};

// CUSIP은 13F에 티커 없이 회사명만 나와서 수동 매칭 — 대형 운용사 top20에 반복적으로 등장하는
// 메가캡 위주로 채워두고, 매칭 안 되는 종목은 티커 없이 회사명만 표시(추측으로 잘못된 티커를 달지 않기 위함)
const CUSIP_TO_TICKER = {
  "037833100": "AAPL", "594918104": "MSFT", "67066G104": "NVDA", "023135106": "AMZN",
  "02079K305": "GOOGL", "02079K107": "GOOG", "30303M102": "META", "88160R101": "TSLA",
  "11135F101": "AVGO", "025816109": "AXP", "191216100": "KO", "060505104": "BAC",
  "166764100": "CVX", "674599105": "OXY", "H1467J104": "CB", "615369105": "MCO",
  "500754106": "KHC", "23918K108": "DVA", "501044101": "KR", "829933100": "SIRI",
  "247361702": "DAL", "92343E102": "VRSN", "14040H105": "COF", "650111107": "NYT",
  "02005N100": "ALLY", "530909308": "LLYVA", "46625H100": "JPM", "92826C839": "V",
  "57636Q104": "MA", "478160104": "JNJ", "742718109": "PG", "928563402": "UNH",
};

function fetchSec(url) {
  return fetch(url, { headers: SEC_HEADERS });
}

async function getLatestTwo13F(cik) {
  const paddedCik = cik.padStart(10, "0");
  const res = await fetchSec(`https://data.sec.gov/submissions/CIK${paddedCik}.json`);
  const data = await res.json();
  const recent = data.filings.recent;
  const idxList = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === "13F-HR") idxList.push(i);
  }
  const pick = (i) => ({
    accession: recent.accessionNumber[i],
    filedDate: recent.filingDate[i],
    reportDate: recent.reportDate[i],
  });
  return { name: data.name, filings: idxList.slice(0, 2).map(pick) };
}

async function getInfoTableFilename(cik, accession) {
  const accNoDashes = accession.replace(/-/g, "");
  const res = await fetchSec(`https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/index.json`);
  const data = await res.json();
  const xmlFiles = data.directory.item.filter((f) => f.name.endsWith(".xml") && f.name !== "primary_doc.xml");
  xmlFiles.sort((a, b) => Number(b.size) - Number(a.size));
  return { filename: xmlFiles[0].name, accNoDashes };
}

async function fetchInfoTable(cik, accession) {
  const { filename, accNoDashes } = await getInfoTableFilename(cik, accession);
  const res = await fetchSec(`https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${filename}`);
  return res.text();
}

// 표지(primary_doc.xml)에 적힌 "총 종목 수/총 가치"와 실제 첨부된 정보표를 대조 — 가끔 제출기관이
// 표지 요약과 안 맞는(잘려나간) 파일을 잘못 올리는 경우가 있어(예: JPMorgan 2026-03-31 분기 실제 발견됨),
// 그런 손상된 공시를 그대로 반영하지 않기 위한 안전장치
async function fetchCoverPageTotals(cik, accession) {
  const accNoDashes = accession.replace(/-/g, "");
  const res = await fetchSec(`https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/primary_doc.xml`);
  const text = await res.text();
  const entryTotal = Number((text.match(/<tableEntryTotal>([^<]*)<\/tableEntryTotal>/) || [])[1] || 0);
  const valueTotal = Number((text.match(/<tableValueTotal>([^<]*)<\/tableValueTotal>/) || [])[1] || 0);
  return { entryTotal, valueTotal };
}

// 네임스페이스 접두사(<ns1:infoTable> 등)가 붙는 제출기관도 있어 접두사 유무 상관없이 매칭
function parseInfoTable(xmlText) {
  const rows = [...xmlText.matchAll(/<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/g)].map((m) => m[1]);
  const agg = new Map();
  for (const row of rows) {
    const name = (row.match(/<(?:\w+:)?nameOfIssuer>([^<]*)<\/(?:\w+:)?nameOfIssuer>/) || [])[1] || "";
    const cusip = (row.match(/<(?:\w+:)?cusip>([^<]*)<\/(?:\w+:)?cusip>/) || [])[1] || "";
    const value = Number((row.match(/<(?:\w+:)?value>([^<]*)<\/(?:\w+:)?value>/) || [])[1] || 0);
    const shares = Number((row.match(/<(?:\w+:)?sshPrnamt>([^<]*)<\/(?:\w+:)?sshPrnamt>/) || [])[1] || 0);
    if (!agg.has(cusip)) agg.set(cusip, { name, cusip, value: 0, shares: 0 });
    const a = agg.get(cusip);
    a.value += value;
    a.shares += shares;
  }
  let list = [...agg.values()].sort((a, b) => b.value - a.value);

  // 단위 자동감지: SEC 스펙상 "천달러" 단위가 원칙이지만 실제로는 제출기관마다 실제 달러 단위로 넣는 경우가
  // 섞여 있음(알려진 데이터 품질 이슈). 최대 보유종목의 주당 평균가로 감지 — $1 미만이면 1000배 보정.
  const top = list[0];
  const impliedPrice = top && top.shares ? top.value / top.shares : null;
  const unitMultiplier = impliedPrice !== null && impliedPrice < 1 ? 1000 : 1;
  if (unitMultiplier !== 1) list = list.map((x) => ({ ...x, value: x.value * unitMultiplier }));

  const total = list.reduce((s, x) => s + x.value, 0);
  return { list, total, impliedPrice, unitMultiplier, rowCount: rows.length };
}

function fmtBigUSD(usd) {
  const abs = Math.abs(usd);
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(1)}M`;
  return `$${abs.toLocaleString()}`;
}

async function buildInstitutionData(key, { cik, filerName }) {
  const { filings } = await getLatestTwo13F(cik);
  if (filings.length < 1) return null;
  const [curFiling, prevFiling] = filings;

  const curText = await fetchInfoTable(cik, curFiling.accession);
  const cur = parseInfoTable(curText);

  const cover = await fetchCoverPageTotals(cik, curFiling.accession);
  if (cover.entryTotal > 0 && cur.rowCount < cover.entryTotal * 0.5) {
    throw new Error(
      `표지 요약(${cover.entryTotal}개 종목)과 실제 첨부 테이블(${cur.rowCount}개)이 크게 어긋남 — 손상된 제출로 판단해 건너뜀`
    );
  }

  let prev = { list: [], total: 0 };
  if (prevFiling) {
    const prevText = await fetchInfoTable(cik, prevFiling.accession);
    prev = parseInfoTable(prevText);
  }
  const prevByCusip = new Map(prev.list.map((x) => [x.cusip, x]));

  const holdings = cur.list.slice(0, 20).map((x) => {
    const curWeight = (x.value / cur.total) * 100;
    const p = prevByCusip.get(x.cusip);
    const prevWeight = p ? (p.value / prev.total) * 100 : null;
    const valueChangeUSD = p ? x.value - p.value : x.value;
    const valueChangePct = p && p.value > 0 ? (valueChangeUSD / p.value) * 100 : null;
    return {
      ticker: CUSIP_TO_TICKER[x.cusip] || null,
      name: x.name,
      cusip: x.cusip,
      weightPct: Number(curWeight.toFixed(2)),
      weightChangePt: prevWeight !== null ? Number((curWeight - prevWeight).toFixed(2)) : null,
      valueUSD: Math.round(x.value),
      valueChangeUSD: Math.round(valueChangeUSD),
      valueChangePct: valueChangePct !== null ? Number(valueChangePct.toFixed(1)) : null,
    };
  });

  return {
    filerName,
    asOf: curFiling.reportDate,
    prevAsOf: prevFiling ? prevFiling.reportDate : null,
    filedDate: curFiling.filedDate,
    prevFiledDate: prevFiling ? prevFiling.filedDate : null,
    totalValueUSD: Math.round(cur.total),
    totalValueLabel: fmtBigUSD(cur.total),
    accessionNumber: curFiling.accession,
    updatedAt: new Date().toISOString(),
    holdings,
  };
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let state = {};
  if (fs.existsSync(STATE_FILE)) state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));

  let anyUpdated = false;
  for (const [key, info] of Object.entries(INSTITUTIONS)) {
    try {
      const { filings } = await getLatestTwo13F(info.cik);
      const latestAccession = filings[0] && filings[0].accession;
      if (!latestAccession) {
        console.log(`[${key}] 13F-HR 공시를 찾지 못함 — 건너뜀`);
        continue;
      }
      if (state[key] === latestAccession) {
        console.log(`[${key}] 새 공시 없음(최신: ${latestAccession}) — 건너뜀`);
        continue;
      }
      console.log(`[${key}] 새 공시 발견(${latestAccession}) — 파싱 중...`);
      const result = await buildInstitutionData(key, info);
      if (!result) {
        console.log(`[${key}] 파싱 결과 없음 — 건너뜀`);
        continue;
      }
      fs.writeFileSync(path.join(DATA_DIR, `insight-${key}.json`), JSON.stringify(result, null, 2));
      state[key] = latestAccession;
      anyUpdated = true;
      console.log(`[${key}] 완료 — 총 신고가치 ${result.totalValueLabel}, top20 저장됨`);
    } catch (err) {
      console.error(`[${key}] 실패:`, err.message);
    }
  }

  if (anyUpdated) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log("state 파일 갱신 완료");
  } else {
    console.log("갱신된 기관 없음");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
