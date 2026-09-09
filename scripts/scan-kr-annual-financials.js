// 국내주식(코스피200+코스닥150) 연간 매출액·당기순이익 10년치 — DART Open API 단일회사 주요계정(fnlttSinglAcnt)을
// 사업연도별로 조회해 data/kr-annual-financials.json에 저장. 미래예측 "매출액 vs 주가 vs 순이익"(5년·10년) 그래프의 국내 재무 소스
// (네이버 연간 API는 3개년, Yahoo는 4개년뿐이라 10년치는 DART가 유일). 연결(CFS) 우선, 없으면 개별(OFS).
// GitHub Actions에서 월 1회 실행(종목당 10회 호출 → 약 3,500회, DART 일 한도 10,000회 이내).
//
// 로컬 수동 실행: DART_API_KEY=발급받은키 node scripts/scan-kr-annual-financials.js
// 형식: { generatedAt, items: { "005930.KS": { corpCode, years: { "2016": { rev, ni, end: "2016-12-31" }, ... } } } } (단위: 원)

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "kr-annual-financials.json");
const UNIVERSE_FILE = path.join(DATA_DIR, "kr-universe-kospi200-kosdaq150.json");
const CORPCODE_FILE = path.join(DATA_DIR, "dart-corpcode-map.json"); // scan-dart-financials.js가 만들어 둔 종목코드→corp_code 맵
const API_KEY = process.env.DART_API_KEY;
const YEARS_BACK = 10;
// DART는 짧은 시간에 요청이 몰리면 IP를 일시 차단한다(2026-09-10 로컬 4스레드/0.12초로 확인 — 연결 자체가 거부됨).
// 종목당 10회 × 348종목 = 약 3,480회라 아래 속도면 15~20분 정도 걸리지만 안전하다.
const GAP_MS = 200;
const CONCURRENCY = 2;

if (!API_KEY) {
  console.error("DART_API_KEY 환경변수가 필요합니다. (opendart.fss.or.kr에서 무료 발급)");
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function dartFetch(pathAndQuery) {
  const res = await fetch(`https://opendart.fss.or.kr${pathAndQuery}&crtfc_key=${API_KEY}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const toNum = (s) => {
  if (s === null || s === undefined) return null;
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};
// 주요계정 응답에서 매출액·당기순이익(당기 금액) — 연결 우선. 계정명이 회사마다 조금씩 달라 넓게 매칭
function pickAccounts(list) {
  const pick = (fsDiv, re) => {
    const rows = list.filter((r) => r.fs_div === fsDiv && re.test((r.account_nm || "").replace(/\s/g, "")));
    return rows.length ? toNum(rows[0].thstrm_amount) : null;
  };
  const REV = /^(매출액|수익\(매출액\)|영업수익|매출|순영업수익|보험료수익|이자수익)$/;
  const NI = /^(당기순이익|당기순이익\(손실\)|당기순손익|연결당기순이익|분기순이익|반기순이익)/;
  let rev = pick("CFS", REV);
  let ni = pick("CFS", NI);
  if (rev === null && ni === null) {
    rev = pick("OFS", REV);
    ni = pick("OFS", NI);
  } else {
    if (rev === null) rev = pick("OFS", REV);
    if (ni === null) ni = pick("OFS", NI);
  }
  return { rev, ni };
}

async function scanOne(symbol, corpCode, years) {
  const out = {};
  for (const y of years) {
    try {
      const d = await dartFetch(`/api/fnlttSinglAcnt.json?corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`);
      if (d.status === "000" && Array.isArray(d.list) && d.list.length) {
        const { rev, ni } = pickAccounts(d.list);
        const end = (d.list[0].thstrm_dt || "").match(/(\d{4})\.(\d{2})\.(\d{2})\s*현재/);
        if (rev !== null || ni !== null) out[String(y)] = { rev, ni, end: end ? `${end[1]}-${end[2]}-${end[3]}` : `${y}-12-31` };
      } else if (d.status === "020" || d.status === "021") {
        throw new Error(`DART 한도 초과(${d.status})`);
      }
    } catch (e) {
      if (/한도/.test(e.message)) throw e;
    }
    await sleep(GAP_MS);
  }
  return out;
}

async function main() {
  const universe = JSON.parse(fs.readFileSync(UNIVERSE_FILE, "utf8"));
  const entries = [...(universe.kospi200 || []), ...(universe.kosdaq150 || [])];
  const corpMap = JSON.parse(fs.readFileSync(CORPCODE_FILE, "utf8"));
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(OUT_FILE, "utf8")).items || {};
  } catch {}
  const now = new Date();
  // 사업보고서는 이듬해 3월 말 제출 → 3월이 지나야 직전 연도가 확정
  const latest = now.getMonth() + 1 > 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
  const years = [];
  for (let y = latest - YEARS_BACK + 1; y <= latest; y++) years.push(y);
  console.log(`사업연도 ${years[0]}~${years[years.length - 1]}, 종목 ${entries.length}개`);

  const items = {};
  let idx = 0;
  let done = 0;
  const worker = async () => {
    while (idx < entries.length) {
      const e = entries[idx++];
      const code6 = e.symbol.split(".")[0];
      const corp = corpMap[code6];
      if (!corp || !corp.corpCode) {
        if (prev[e.symbol]) items[e.symbol] = prev[e.symbol];
        continue;
      }
      try {
        const yrs = await scanOne(e.symbol, corp.corpCode, years);
        items[e.symbol] = Object.keys(yrs).length ? { corpCode: corp.corpCode, years: yrs } : prev[e.symbol] || { corpCode: corp.corpCode, years: yrs };
      } catch (err) {
        console.error(`[실패] ${e.symbol}: ${err.message}`);
        if (prev[e.symbol]) items[e.symbol] = prev[e.symbol];
        if (/한도/.test(err.message)) idx = entries.length; // 남은 종목은 다음 실행에
      }
      done++;
      if (done % 25 === 0) console.log(`${done}/${entries.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const out = {
    generatedAt: now.toISOString(),
    source: "DART Open API fnlttSinglAcnt(사업보고서 주요계정, 연결 우선) — 연간 매출액·당기순이익(원)",
    years,
    count: Object.keys(items).length,
    items,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  console.log(`완료: ${out.count}개`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
