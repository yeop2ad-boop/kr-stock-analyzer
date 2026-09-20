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
      const cached = readJsonFile(CORPCODE_CACHE_FILE);
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

// 회사마다 급여를 원/천원/백만원 아무 단위로나 적어 낸다(달바글로벌 반기 "45"=4,500만원, 클로봇 "30,000"=3,000만원,
// 유일로보틱스 "26,678,000,000"=2,667만원의 1,000배 오기입). 1인당 금액이 상식적인 자리수가 될 때까지 1,000배씩
// 조정하고, 그래도 범위를 벗어나면 null로 버린다(잘못된 값으로 순위를 매기지 않기 위해).
function normalizePay(v) {
  if (v === null || v === undefined || v <= 0) return null;
  let x = v;
  while (x < 1_000_000) x *= 1000;
  while (x > 1_000_000_000) x /= 1000;
  return x >= 3_000_000 && x <= 600_000_000 ? x : null;
}

async function getEmployeeSummary(corpCode, year, reprtCode = "11011") {
  const data = await dartFetch(`/api/empSttus.json?corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}`);
  if (data.status !== "000" || !Array.isArray(data.list)) return null;
  const totals = pickGenderTotals(data.list);
  if (totals.length === 0) return null;

  let totalHeadcount = 0;
  let totalSalary = 0;
  let hasSalary = true;
  let tenureWeightedSum = 0;
  let paySum = 0;
  let payWeight = 0;
  let payMismatch = false;
  for (const { headcount, row } of totals) {
    totalHeadcount += headcount;
    const salary = parseKoNumber(row.fyer_salary_totamt);
    if (salary === null) hasSalary = false;
    else totalSalary += salary;
    const tenure = parseKoNumber(row.avrg_cnwk_sdytrn);
    if (tenure !== null) tenureWeightedSum += tenure * headcount;
    // 리스크 탭용 1인당 급여 — 공시 칸이 서로 어긋나는 회사가 많아 "급여총액÷인원"과 "1인 평균 급여액"을 함께 보고,
    // 30% 넘게 다르면 어느 쪽이 맞는지 알 수 없으므로 그 회사는 임금 비교에서 뺀다(잘못된 순위를 만들지 않기 위해).
    //  · 한전KPS 2026 반기: 총액÷인원 4,420만 vs 1인평균 2,178만
    //  · 동화기업 2026 반기: 총액이 전년과 완전히 같은 값(인원만 바뀜)
    //  · HD현대일렉트릭 2025 반기: 총액이 연간치(1인평균의 약 2배)
    const fromTotal = normalizePay(salary !== null && headcount ? salary / headcount : null);
    const fromPerHead = normalizePay(parseKoNumber(row.jan_salary_am));
    let per = fromTotal !== null ? fromTotal : fromPerHead;
    if (fromTotal !== null && fromPerHead !== null && Math.abs(fromTotal - fromPerHead) / Math.max(fromTotal, fromPerHead) > 0.3) {
      per = null;
      payMismatch = true;
    }
    if (per !== null) {
      paySum += per * headcount;
      payWeight += headcount;
    }
  }
  if (totalHeadcount === 0) return null;

  return {
    headcount: totalHeadcount,
    avgSalary: hasSalary && totalSalary > 0 ? totalSalary / totalHeadcount : null,
    avgTenureYears: tenureWeightedSum > 0 ? tenureWeightedSum / totalHeadcount : null,
    perPersonPay: payMismatch || !payWeight ? null : paySum / payWeight,
    stlmDt: totals[0].row.stlm_dt || null,
  };
}

// 리스크 탭(2026-09-20 사용자 요청): "가장 최근 보고서" 기준 임금·인원. 임직원 현황은 분기·반기보고서에도 들어 있고
// 급여 총액은 그 기간 누적이므로, 최신 보고서와 "1년 전 같은 종류의 보고서"를 짝지어야 같은 기간끼리 비교가 된다
// (예: 2026년 반기 1~6월 ↔ 2025년 반기 1~6월). 기준일이 늦은 것부터 훑고, 지난 연도는 사업보고서(12/31)가 3분기보다 최신.
const PERIODIC_REPORTS = [
  { code: "11014", label: "3분기보고서", period: "1~9월" },
  { code: "11012", label: "반기보고서", period: "1~6월" },
  { code: "11013", label: "1분기보고서", period: "1~3월" },
  { code: "11011", label: "사업보고서", period: "1~12월" },
];

function reportCandidates(nowYear) {
  const out = [];
  for (const year of [nowYear, nowYear - 1, nowYear - 2]) {
    const order = year === nowYear ? PERIODIC_REPORTS.slice(0, 3) : [PERIODIC_REPORTS[3], ...PERIODIC_REPORTS.slice(0, 3)];
    for (const r of order) out.push({ year, ...r });
  }
  return out;
}

async function getRecentBasis(corpCode, nowYear) {
  for (const c of reportCandidates(nowYear)) {
    const cur = await getEmployeeSummary(corpCode, c.year, c.code).catch(() => null);
    await sleep(REQUEST_GAP_MS);
    if (!cur) continue;
    const prev = await getEmployeeSummary(corpCode, c.year - 1, c.code).catch(() => null);
    await sleep(REQUEST_GAP_MS);
    if (!prev) continue;
    const fmt = (s, year) => ({
      headcount: s.headcount,
      avgSalary: s.perPersonPay,
      stlmDt: s.stlmDt,
      reportLabel: `${year}년 ${c.label}`,
      periodLabel: `${year}년 ${c.period}`,
      year,
      reportCode: c.code,
    });
    return { recent: fmt(cur, c.year), recentPrev: fmt(prev, c.year - 1) };
  }
  return { recent: null, recentPrev: null };
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

// 리스크 탭 ③유상증자 ④전환사채(2026-09-20 사용자 요청) — 최근 1년 결정공시.
//  · piicDecsn(유상증자결정)은 조달 금액 칸이 따로 없어 자금조달 목적별 금액(fdpp_*)의 합을 조달액으로 본다
//  · cvbdIsDecsn(전환사채 발행결정)은 사채 권면(전자등록)총액(bd_fta)
// 둘 다 "결정" 공시라 실제 납입 금액과는 다를 수 있다(자사주 취득금액과 같은 한계, UI에 고지).
const FDPP_FIELDS = ["fdpp_fclt", "fdpp_bsninh", "fdpp_op", "fdpp_dtrp", "fdpp_ocsa", "fdpp_etc"];

function rceptDate(row) {
  const no = String(row.rcept_no || "");
  return no.length >= 8 ? `${no.slice(0, 4)}-${no.slice(4, 6)}-${no.slice(6, 8)}` : null;
}

async function getDecisionSummary(corpCode, api, bgnDe, endDe, amountOf, noteOf) {
  const data = await dartFetch(`/api/${api}.json?corp_code=${corpCode}&bgn_de=${bgnDe}&end_de=${endDe}`);
  // status 013 = 조회된 데이터 없음(= 해당 공시 없음)
  if (data.status !== "000" || !Array.isArray(data.list)) return { count: 0, amount: 0, latestDate: null, latestNote: null };
  const rows = data.list
    .map((r) => ({ date: rceptDate(r), amount: amountOf(r) || 0, note: (noteOf(r) || "").trim() || null }))
    .filter((r) => r.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    count: rows.length,
    amount: rows.reduce((s, r) => s + r.amount, 0),
    latestDate: rows.length ? rows[0].date : null,
    latestNote: rows.length ? rows[0].note : null,
  };
}

async function getIssuance(corpCode, bgnDe, endDe) {
  const rights = await getDecisionSummary(
    corpCode,
    "piicDecsn",
    bgnDe,
    endDe,
    (r) => FDPP_FIELDS.reduce((s, k) => s + (parseKoNumber(r[k]) || 0), 0),
    (r) => r.ic_mthn
  ).catch(() => null);
  await sleep(REQUEST_GAP_MS);
  const cb = await getDecisionSummary(corpCode, "cvbdIsDecsn", bgnDe, endDe, (r) => parseKoNumber(r.bd_fta), (r) => r.bd_knd).catch(() => null);
  await sleep(REQUEST_GAP_MS);
  if (!rights && !cb) return null;
  return { rights: rights || { count: 0, amount: 0 }, cb: cb || { count: 0, amount: 0 } };
}

// 시가총액은 지도 데이터(한국 저녁 배치가 매일 갱신)에서 가져와 "시총 대비 비율"을 미리 계산해 둔다
function loadMarketCaps() {
  const file = path.join(__dirname, "..", "sector-map", "data", "kr-sectors.json");
  const map = {};
  try {
    for (const c of readJsonFile(file).companies || []) {
      if (c.symbol && c.marketCap) map[c.symbol] = c.marketCap;
    }
  } catch {
    console.error("kr-sectors.json을 읽지 못해 시총 대비 비율은 비워 둡니다.");
  }
  return map;
}

function toDateStr(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function scanOne(symbol, corpEntry, thisYear, lastYear, bgnDe, endDe, marketCaps) {
  try {
    const curr = await getEmployeeSummary(corpEntry.corpCode, thisYear);
    await sleep(REQUEST_GAP_MS);
    if (!curr) return null;
    const prev = await getEmployeeSummary(corpEntry.corpCode, lastYear).catch(() => null);
    await sleep(REQUEST_GAP_MS);
    const buyback = await getBuybackAmount(corpEntry.corpCode, bgnDe, endDe).catch(() => 0);
    const { recent, recentPrev } = await getRecentBasis(corpEntry.corpCode, new Date().getFullYear()).catch(() => ({ recent: null, recentPrev: null }));
    const raised = await getIssuance(corpEntry.corpCode, bgnDe, endDe).catch(() => null);
    const marketCap = (marketCaps && marketCaps[symbol]) || null;
    const ratio = (amount) => (marketCap && amount ? (amount / marketCap) * 100 : null);
    const issuance = raised
      ? {
          windowFrom: `${bgnDe.slice(0, 4)}-${bgnDe.slice(4, 6)}-${bgnDe.slice(6, 8)}`,
          windowTo: `${endDe.slice(0, 4)}-${endDe.slice(4, 6)}-${endDe.slice(6, 8)}`,
          rights: raised.rights,
          cb: raised.cb,
          marketCap,
          rightsRatio: ratio(raised.rights.amount),
          cbRatio: ratio(raised.cb.amount),
          totalRatio: ratio((raised.rights.amount || 0) + (raised.cb.amount || 0)),
        }
      : null;
    return {
      symbol,
      corpName: corpEntry.corpName,
      avgSalary: curr.avgSalary,
      avgTenureYears: curr.avgTenureYears,
      headcount: curr.headcount,
      headcountPrevYear: prev ? prev.headcount : null,
      headcountChange: prev ? curr.headcount - prev.headcount : null,
      // 리스크 탭(2026-09-19): 1인 평균 급여가 작년보다 줄었거나 제자리인 회사를 가려내기 위한 작년 값
      avgSalaryPrevYear: prev ? prev.avgSalary : null,
      buybackAmount: buyback,
      // 리스크 탭 전용 — 최신 정기보고서와 1년 전 같은 보고서(분기·반기 포함). 인사이트 탭의 "평균연봉"은
      // 연간 값이어야 하므로 위의 avgSalary/headcount는 사업보고서 기준 그대로 둔다
      recent,
      recentPrev,
      // 리스크 탭 ③④ — 최근 1년 유상증자·전환사채 결정공시와 시총 대비 비율
      issuance,
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

// data/kr-universe-kospi200-kosdaq150.json은 PowerShell이 다시 쓰면서 UTF-8 BOM이 붙어 있다(2026-08-31 90afc9d).
// Node의 JSON.parse는 BOM을 못 걷어내고 SyntaxError를 던지므로(이것 때문에 다트공시 배치가 매일 실패했음) 여기서 제거한다.
function readJsonFile(p) {
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

async function main() {
  const universe = readJsonFile(UNIVERSE_FILE);
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
    return scanOne(e.symbol, corpEntry, thisYear, lastYear, bgnDe, endDe, marketCaps);
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
