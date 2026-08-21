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
const SEC_HEADERS = { "User-Agent": "netuja.com contact@netuja.com" };

const INSTITUTIONS = {
  berkshire: { cik: "1067983", filerName: "Berkshire Hathaway Inc" },
  blackrock: { cik: "2012383", filerName: "BlackRock, Inc." },
  vanguard: { cik: "102909", filerName: "Vanguard Group Inc" },
  // 주의: 키를 "state"로 지으면 output이 data/insight-state.json이 되어, 이 스크립트 자신의 갱신 이력을
  // 저장하는 STATE_FILE(같은 경로)과 충돌해 서로 덮어씀 — 그래서 "stateStreet"로 키를 분리함
  stateStreet: { cik: "93751", filerName: "State Street Corp" },
  goldman: { cik: "886982", filerName: "Goldman Sachs Group Inc" },
  morganStanley: { cik: "895421", filerName: "Morgan Stanley" },
  jpmorgan: { cik: "19617", filerName: "JPMorgan Chase & Co" },
  ark: { cik: "1697748", filerName: "ARK Investment Management LLC" },
  // 소프트뱅크그룹 본사는 13F-NT(면제 통지)만 제출 — 실제 미국 주식 보유(비전펀드) 신고는
  // 자회사 SB Investment Advisers (UK) Ltd가 13F-HR로 직접 제출함
  softbank: { cik: "1731509", filerName: "SB Investment Advisers (UK) Ltd (SoftBank Vision Fund)" },
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

  // ARK/SoftBank(SB Investment Advisers)의 실제 13F(2026-03-31 기준)를 직접 조회해 검증한 CUSIP —
  // 이 두 기관은 대형 은행/버크셔류와 보유 종목이 완전히 달라(ARK는 혁신성장주, SoftBank는 비전펀드 비상장 후 상장주 위주)
  // 위의 메가캡 위주 매핑표에 하나도 안 걸려 전부 "이름만 표시"로 나오던 문제가 있었음
  "007903107": "AMD", "H17182108": "CRSP", "82509L107": "SHOP", "69608A108": "PLTR",
  "88023B103": "TEM", "172573107": "CRCL", "770700102": "HOOD", "19260Q107": "COIN",
  "880770102": "TER", "77543R102": "ROKU", "771049103": "RBLX", "90184D100": "TWST",
  "07373V105": "BEAM", "88025U109": "TXG", "50077B207": "KTOS", "G16910120": "BLSH",
  "244199105": "DE", "874039100": "TSM",
  "008073108": "AVAV", "016255101": "ALGN", "01741R102": "ATI", "031100100": "AME",
  "03969T109": "ARCT", "052769106": "ADSK", "14167L103": "CDNA", "144285103": "CRS",
  "157085101": "CERS", "40434L105": "HPQ", "45826J105": "NTLA", "45866F104": "ICE",
  "46120E602": "ISRG", "462222100": "IONS", "46269C102": "IRDM", "483007704": "KALU",
  "533900106": "LECO", "58733R102": "MELI", "63008G203": "NNDM", "M3760D101": "ESLT",
  "653656108": "NICE", "69370C100": "PTC", "69404D108": "PACB", "71535D106": "PSNL",
  "743713109": "PRLB", "852234103": "XYZ", "881624209": "TEVA", "88554D205": "DDD",
  "88579Y101": "MMM", "896239100": "TRMB", "92337F107": "VCYT", "L8681T102": "SPOT",
  "M15342104": "AUDC", "M20791105": "CAMT", "M22465104": "CHKP", "M4R82T106": "FVRR",
  "M6158M104": "ITRN", "M7516K103": "NVMI", "M81873107": "RDWR", "M85548101": "SSYS",
  "M87915274": "TSEM", "M96088105": "URGN", "M98068105": "WIX", "M5425M103": "INMD",
  "M78673114": "PERI", "81141R100": "SE", "871607107": "SNPS", "149123101": "CAT",
  "00650F109": "ADPT", "80810D103": "SDGR", "M51474118": "GILT", "18915M107": "NET",
  "438516106": "HON", "48581R205": "KSPI", "65443P102": "MASS", "M6191J100": "FROG",
  "539830109": "LMT", "M70700105": "NNOX", "879360105": "TDY", "124155102": "BFLY",
  "H2906T109": "GRMN", "422806109": "HEI", "502431109": "LHX", "75629V104": "RXRX",
  "74765K105": "QSI", "98423F109": "XMTR", "72815L107": "PLTK", "M25133105": "CGNT",
  "M7S64H106": "MNDY", "M84137104": "SMWB", "G65163100": "JOBY", "369604301": "GE",
  "G3934V109": "GENI", "03945R102": "ACHR", "888787108": "TOST", "22788C105": "CRWD",
  "G6683N103": "NU", "67080M103": "NRIX", "M2197Q107": "CLBT",
  "22266T109": "CPNG", "G4124C109": "GRAB", "75943R102": "RLAY", "20464U100": "COMP",
  "92764N102": "VIR", "051774107": "AUR", "G76279101": "ROIV", "29280W109": "NRGV",
  "35969L108": "YMM", "37611X209": "DNA",
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
