// "다트공시" 4대 지표(평균연봉/평균근속/자사주취득금액/직원증가) — 코스피200+코스닥150(약 350종목)을
// DART Open API(opendart.fss.or.kr)로 조회해 data/dart-financials.json에 저장한다.
// 종목별로 사업보고서 "임직원 현황"(empSttus, 올해·작년 2회)과 "자기주식취득결정"(tsstkAqDecsn, 최근 1년)만
// 조회하면 되므로 scan-techinsight.js와 같은 무의존성 CommonJS 패턴. GitHub Actions에서 주기적으로 실행됨
// (재무 데이터라 매일 바뀌지 않으므로 주 1회 정도가 적당).
//
// 로컬 수동 실행: DART_API_KEY=발급받은키 node scripts/scan-dart-financials.js
//
// ⚠️ OpenDART 이용약관(opendart.fss.or.kr/intro/terms.do)에는 API 결과의 복제·저장·재배포 허용 여부가
// 명확히 규정돼 있지 않다(data/research-institutional-holdings.md 5.1절 참고). 광고가 붙는 상업 서비스에
// 정기적으로 자동 수집·저장하는 것이므로, 실제 서비스 배포 전 금융감독원에 사전 서면 문의를 권장한다.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "dart-financials.json");
const UNIVERSE_FILE = path.join(DATA_DIR, "kr-universe-kospi200-kosdaq150.json");
const CORPCODE_CACHE_FILE = path.join(DATA_DIR, "dart-corpcode-map.json");

const API_KEY = process.env.DART_API_KEY;
const CONCURRENCY = 4;
// DART 일일 호출 한도가 이용약관 문서 자체에는 공개돼 있지 않아(발급 계정의 "개발가이드 > 공지사항"에서
// 확인 필요), 보수적으로 호출 사이 간격을 둠 — 종목당 3회 호출이라 350종목 기준 약 1,050회 소요
const REQUEST_GAP_MS = 150;

if (!API_KEY) {
  console.error("DART_API_KEY 환경변수가 필요합니다. (opendart.fss.or.kr에서 무료 발급)");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dartFetch(pathAndQuery) {
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  const res = await fetch(`https://opendart.fss.or.kr${pathAndQuery}${sep}crtfc_key=${API_KEY}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ZIP(단일 파일, DEFLATE 압축) 로컬 파일 헤더를 직접 파싱해 압축 해제 — 외부 라이브러리 없이 Node 내장 zlib만 사용.
// 실제로 받아보면 DART의 corpCode.zip은 general purpose flag의 bit 3(0x08, "데이터 디스크립터 사용")가 켜져
// 있어 로컬 헤더의 compressed size 필드가 0으로 채워져 있다(진짜 크기는 압축 데이터 "뒤"의 데이터 디스크립터에
// 있음, hex dump로 직접 확인함). 이 zip은 파일이 1개뿐이므로 굳이 데이터 디스크립터를 찾지 않고, 압축 데이터
// 시작 지점부터 버퍼 끝까지를 통째로 넘겨도 raw deflate 스트림은 자체 종료 마커(BFINAL)에서 멈추고 뒤에 남은
// 데이터 디스크립터·central directory 바이트는 무시된다.
function extractSingleFileZip(buf) {
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("ZIP 로컬 헤더 시그니처가 올바르지 않습니다.");
  const generalPurposeFlag = buf.readUInt16LE(6);
  const compressionMethod = buf.readUInt16LE(8);
  const fileNameLength = buf.readUInt16LE(26);
  const extraFieldLength = buf.readUInt16LE(28);
  const dataStart = 30 + fileNameLength + extraFieldLength;
  const hasDataDescriptor = (generalPurposeFlag & 0x08) !== 0;

  if (compressionMethod === 0) {
    const compressedSize = hasDataDescriptor ? buf.length - dataStart : buf.readUInt32LE(18);
    return buf.subarray(dataStart, dataStart + compressedSize);
  }
  if (!hasDataDescriptor) {
    const compressedSize = buf.readUInt32LE(18);
    return zlib.inflateRawSync(buf.subarray(dataStart, dataStart + compressedSize));
  }
  return zlib.inflateRawSync(buf.subarray(dataStart));
}

// DART는 종목코드가 아니라 자체 8자리 corp_code로 조회해야 하므로, 전체 상장·비상장사 corp_code 목록(약
// 8만 개)을 받아 우리 유니버스(350종목)에 해당하는 것만 걸러 캐시해둠(분기별로만 바뀌므로 매번 새로 받지 않음)
async function getCorpCodeMap(tickers) {
  if (fs.existsSync(CORPCODE_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CORPCODE_CACHE_FILE, "utf8"));
      if (tickers.every((t) => cached[t])) {
        console.log("corp_code 캐시 재사용");
        return cached;
      }
    } catch {
      // 캐시 파일이 손상됐으면 새로 받음
    }
  }
  console.log("corpCode.xml 다운로드 중...");
  const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${API_KEY}`);
  if (!res.ok) throw new Error(`corpCode 다운로드 실패: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const xml = extractSingleFileZip(buf).toString("utf8");
  const tickerSet = new Set(tickers);
  const map = {};
  const re = /<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>\s*<corp_eng_name>[^<]*<\/corp_eng_name>\s*<stock_code>\s*(\d*)\s*<\/stock_code>/g;
  let m;
  while ((m = re.exec(xml))) {
    const stockCode = m[3].trim();
    if (stockCode && tickerSet.has(stockCode)) map[stockCode] = { corpCode: m[1], corpName: m[2] };
  }
  fs.writeFileSync(CORPCODE_CACHE_FILE, JSON.stringify(map));
  console.log(`corp_code 매핑 ${Object.keys(map).length}/${tickers.length}건 확보`);
  return map;
}

function parseKoNumber(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(/,/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// empSttus 응답은 사업부문·성별로 나뉜 여러 행이 섞여 있고 회사마다 구성이 달라(사업부문 없이 성별 2행뿐인
// 곳도 있음), "전사 합계" 행을 이름으로 특정할 수 없다. 대신 같은 성별 그룹 중 헤드카운트(sm)가 가장 큰 행을
// "그 성별의 전사 합계"로 간주한다(사업부문별 세부 행은 항상 그보다 작은 부분합이므로 이 규칙이 안전함).
function pickGenderTotals(rows) {
  const bySex = new Map();
  for (const r of rows) {
    const sex = r.sexdstn || "전체";
    const headcount = parseKoNumber(r.sm) ?? parseKoNumber(r.rgllbr_co);
    if (headcount === null) continue;
    const existing = bySex.get(sex);
    if (!existing || headcount > existing.headcount) bySex.set(sex, { headcount, row: r });
  }
  return [...bySex.values()];
}

async function getEmployeeSummary(corpCode, year) {
  const data = await dartFetch(`/api/empSttus.json?corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`);
  if (data.status !== "000" || !Array.isArray(data.list)) return null;
  const totals = pickGenderTotals(data.list);
  if (totals.length === 0) return null;

  let totalHeadcount = 0;
  let totalSalary = 0;
  let hasSalary = true;
  let tenureWeightedSum = 0;
  for (const { headcount, row } of totals) {
    totalHeadcount += headcount;
    const salary = parseKoNumber(row.fyer_salary_totamt);
    if (salary === null) hasSalary = false;
    else totalSalary += salary;
    const tenure = parseKoNumber(row.avrg_cnwk_sdytrn);
    if (tenure !== null) tenureWeightedSum += tenure * headcount;
  }
  if (totalHeadcount === 0) return null;

  return {
    headcount: totalHeadcount,
    avgSalary: hasSalary && totalSalary > 0 ? totalSalary / totalHeadcount : null,
    avgTenureYears: tenureWeightedSum > 0 ? tenureWeightedSum / totalHeadcount : null,
  };
}

// 이사회가 "취득하기로 결정한" 계획 금액의 합계 — 실제 집행 완료 금액이 아니라 결정공시 기준(사업보고서의
// 실제 취득 현황까지 교차 확인하려면 별도 조회가 필요해 1단계에서는 계획 금액으로 근사함, app.js/UI에 고지)
async function getBuybackAmount(corpCode, bgnDe, endDe) {
  const data = await dartFetch(`/api/tsstkAqDecsn.json?corp_code=${corpCode}&bgn_de=${bgnDe}&end_de=${endDe}`);
  if (data.status !== "000" || !Array.isArray(data.list)) return 0;
  let total = 0;
  for (const row of data.list) {
    total += parseKoNumber(row.aqpln_prc_ostk) || 0;
    total += parseKoNumber(row.aqpln_prc_estk) || 0;
  }
  return total;
}

function toDateStr(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function scanOne(symbol, corpEntry, thisYear, lastYear, bgnDe, endDe) {
  try {
    const curr = await getEmployeeSummary(corpEntry.corpCode, thisYear);
    await sleep(REQUEST_GAP_MS);
    if (!curr) return null;
    const prev = await getEmployeeSummary(corpEntry.corpCode, lastYear).catch(() => null);
    await sleep(REQUEST_GAP_MS);
    const buyback = await getBuybackAmount(corpEntry.corpCode, bgnDe, endDe).catch(() => 0);
    return {
      symbol,
      corpName: corpEntry.corpName,
      avgSalary: curr.avgSalary,
      avgTenureYears: curr.avgTenureYears,
      headcount: curr.headcount,
      headcountPrevYear: prev ? prev.headcount : null,
      headcountChange: prev ? curr.headcount - prev.headcount : null,
      buybackAmount: buyback,
    };
  } catch (err) {
    console.error(`[건너뜀] ${symbol}:`, err.message);
    return null;
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let done = 0;
  async function run() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i]);
      done++;
      if (done % 25 === 0) console.log(`진행 ${done}/${items.length}`);
      await sleep(REQUEST_GAP_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  const universe = JSON.parse(fs.readFileSync(UNIVERSE_FILE, "utf8"));
  const entries = [...(universe.kospi200 || []), ...(universe.kosdaq150 || [])];
  const tickers = entries.map((e) => e.symbol.split(".")[0]);
  const corpCodeMap = await getCorpCodeMap(tickers);

  const now = new Date();
  // 사업보고서는 통상 이듬해 3월 말까지 제출되므로, 아직 3월이 안 지났으면 최신 확정 사업연도가 하나 더 이전임
  const thisYear = now.getMonth() + 1 > 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
  const lastYear = thisYear - 1;
  const bgnDe = toDateStr(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  const endDe = toDateStr(now);
  console.log(`기준 사업연도: ${thisYear} / 자사주 취득 조회 기간: ${bgnDe}~${endDe}`);

  const results = await mapWithConcurrency(entries, CONCURRENCY, (e) => {
    const ticker6 = e.symbol.split(".")[0];
    const corpEntry = corpCodeMap[ticker6];
    if (!corpEntry) {
      console.error(`[건너뜀] ${e.symbol}: corp_code 매핑 없음`);
      return null;
    }
    return scanOne(e.symbol, corpEntry, thisYear, lastYear, bgnDe, endDe);
  });

  const items = results.filter(Boolean);
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        dataYear: thisYear,
        buybackPeriod: { from: bgnDe, to: endDe },
        source: "DART Open API(opendart.fss.or.kr) — 사업보고서 임직원 현황(empSttus), 자기주식취득결정(tsstkAqDecsn)",
        items,
      },
      null,
      2
    )
  );
  console.log(`저장 완료 — ${items.length}/${entries.length}개 종목`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
