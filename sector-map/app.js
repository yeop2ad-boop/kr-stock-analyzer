// ---------- 섹터맵 (S&P 500 원형 버블맵) ----------
// data/sp500-data-core.js가 만들어둔 전역 SP500_CORE_DATA({companies:[{symbol,name,sector,sectorKo,marketCap}]})를
// d3-hierarchy의 pack 레이아웃(원형 트리맵)에 태워 섹터별로 묶은 원들을 그린 뒤, 지도앱처럼 손가락/휠로 확대·축소·이동한다.
// 나머지(전체 유니버스의 상위권 밖 종목)는 data/sp500-data-extra.js/kr-data-extra.js에 따로 있고, "+전체보기"를
// 눌렀을 때만 동적으로 불러온다(ensureExtraDataLoaded) — 초기 로딩 용량을 줄이기 위함.

// PWA로 홈 화면에 설치 가능하게(앱스토어 등록 없이) 서비스워커 등록 — 캐싱 없이 통과만 시키는 최소 워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// 언어(한국어/영문) — 더보기 패널(본체)과 공유하는 localStorage 키("app_lang")를 읽어 지도 상단바/하단 네비 등 정적 텍스트만 번역
const MAP_I18N = {
  "market.kr": { ko: "국내", en: "KR" },
  "market.us": { ko: "해외", en: "US" },
  "nav.map": { ko: "지도", en: "Map" },
  "tab.search": { ko: "간편검색", en: "Search" },
  "map.watchlist": { ko: "즐겨찾기", en: "Favorites" },
  "nav.marketBtn": { ko: "시장", en: "Market" },
  "nav.more": { ko: "더보기", en: "More" },
};
function detectDefaultMapLang() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const nav = (navigator.language || "").toLowerCase();
    if (tz === "Asia/Seoul" || nav.startsWith("ko")) return "ko";
  } catch (e) {}
  return "en";
}
(function applyMapLang() {
  let lang = null;
  try {
    lang = localStorage.getItem("app_lang");
  } catch (e) {}
  const isEn = (lang || detectDefaultMapLang()) === "en";
  document.documentElement.lang = isEn ? "en" : "ko";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const dict = MAP_I18N[node.getAttribute("data-i18n")];
    if (dict) node.textContent = isEn ? dict.en : dict.ko;
  });
})();

// 카카오톡 등 인앱 브라우저는 자체 하단 툴바가 화면 아래를 덮는데 100dvh가 그만큼을 빼주지 않아
// 우리 하단 네비가 그 뒤에 숨는 문제 — 실제로 보이는 영역 높이(visualViewport)에 앱 셸 높이를 맞춤
(function syncVisualViewportHeight() {
  const vv = window.visualViewport;
  if (!vv) return;
  const apply = () => {
    document.documentElement.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
  };
  vv.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  apply();
})();

const WORLD_SIZE = 2000; // .map-world 의 world-space 좌표 크기(px, CSS와 동일해야 함)

const SECTOR_COLOR_VAR = {
  "Information Technology": "--sector-technology",
  "Health Care": "--sector-healthcare",
  Financials: "--sector-financials",
  "Consumer Discretionary": "--sector-consumer-discretionary",
  "Consumer Staples": "--sector-consumer-staples",
  "Communication Services": "--sector-communication",
  Industrials: "--sector-industrials",
  Energy: "--sector-energy",
  Utilities: "--sector-utilities",
  "Real Estate": "--sector-real-estate",
  Materials: "--sector-materials",
};

function sectorColor(sector) {
  const varName = SECTOR_COLOR_VAR[sector] || "--sector-industrials";
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#888";
}

// 데이터셋에 GICS식("Information Technology")과 Yahoo식("Technology") 섹터 표기가 섞여 있어 같은 섹터가
// 두 그룹으로 갈라지는 문제(예: "소재·1"짜리 미니 섹터가 따로 생김) — 표준 이름 하나로 병합
const SECTOR_ALIAS = {
  Technology: "Information Technology",
  Healthcare: "Health Care",
  "Financial Services": "Financials",
  "Consumer Defensive": "Consumer Staples",
  "Consumer Cyclical": "Consumer Discretionary",
  "Basic Materials": "Materials",
};
function canonicalSector(sector) {
  return SECTOR_ALIAS[sector] || sector;
}

// 등락률 색상: finviz map 방식 — +3% 이상 상승색, 0%(=배경색인 흰색) 기준, -3% 이하 하락색으로 선형 보간
// 상승/하락 색상 스킴(더보기 패널과 공유하는 localStorage 키 "color_scheme") — 명시적으로 고른 적 없으면 접속 지역(타임존/브라우저 언어)으로 기본값 추정
function detectDefaultColorScheme() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const nav = (navigator.language || "").toLowerCase();
    if (tz === "Asia/Seoul" || nav.startsWith("ko")) return "kr";
  } catch (e) {}
  return "global";
}
let __mapColorScheme = "kr";
try {
  __mapColorScheme = localStorage.getItem("color_scheme") || detectDefaultColorScheme();
} catch (e) {
  __mapColorScheme = detectDefaultColorScheme();
}
// 지도 배경색(--bg-map)과 동일해야 0% 등락 종목이 배경에 자연스럽게 녹아듦 — 화이트 테마 흰색/블랙 테마 검정
const CHG_BG = document.documentElement.getAttribute("data-theme") === "dark" ? [0, 0, 0] : [255, 255, 255];
const CHG_POS_MAX = __mapColorScheme === "global" ? [22, 163, 74] : [230, 25, 25]; // 상승: 초록(해외식) / 빨강(한국식)
const CHG_NEG_MAX = __mapColorScheme === "global" ? [220, 38, 38] : [21, 71, 199]; // 하락: 빨강(해외식) / 파랑(한국식)
const CHG_CLAMP = 3; // %

function mixRgb(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

function changeColor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return { rgb: CHG_BG, css: `rgb(${CHG_BG.join(",")})`, t: 0 };
  }
  const clamped = Math.max(-CHG_CLAMP, Math.min(CHG_CLAMP, pct));
  const t = clamped / CHG_CLAMP; // -1..1
  const rgb = t >= 0 ? mixRgb(CHG_BG, CHG_POS_MAX, t) : mixRgb(CHG_BG, CHG_NEG_MAX, -t);
  return { rgb, css: `rgb(${rgb.join(",")})`, t };
}

// 위 changeColor()는 어두운 지도 배경 위 테두리용(0%=배경색과 동일한 검정에 수렴).
// 흰 배경인 상세 시트의 텍스트에 그대로 쓰면 0%일 때 거의 안 보이므로, 0%를 중간 회색으로 둔 텍스트 전용 버전을 따로 둔다.
const CHG_TEXT_NEUTRAL = [107, 114, 128]; // --text-mid
function changeColorForText(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return `rgb(${CHG_TEXT_NEUTRAL.join(",")})`;
  const clamped = Math.max(-CHG_CLAMP, Math.min(CHG_CLAMP, pct));
  const t = clamped / CHG_CLAMP;
  const rgb = t >= 0 ? mixRgb(CHG_TEXT_NEUTRAL, CHG_POS_MAX, t) : mixRgb(CHG_TEXT_NEUTRAL, CHG_NEG_MAX, -t);
  return `rgb(${rgb.join(",")})`;
}

// financialmodelingprep이 일부 국내 종목엔 로고 대신 사옥/공장 사진 등 엉뚱한 이미지를 갖고 있어서
// (전 종목 색상 다양성 스캔 + 육안 확인으로 찾음, scripts/scan-bad-logos.ps1), 그 심볼들은 로고 시도 자체를
// 건너뛰고 바로 티커 배지를 보여준다 — 로컬/외부 둘 다 같은 소스라 폴백해도 어차피 같은 사진이 나옴.
const BAD_LOGO_SYMBOLS = new Set([
  "003030.KS", // 세아제강지주
  "011200.KS", // HMM
  "018260.KS", // 삼성에스디에스
  "000240.KS", // 한국앤컴퍼니
  "081660.KS", // 미스토홀딩스
  "010120.KS", // LS ELECTRIC
  "069620.KS", // 대웅제약
  "000810.KS", // 삼성화재
  "001680.KS", // 대상
  "002790.KS", // 아모레퍼시픽홀딩스
  "005850.KS", // 에스엘
  "005940.KS", // NH투자증권
  "009150.KS", // 삼성전기
  "009970.KS", // 영원무역홀딩스
  "010060.KS", // OCI홀딩스
  "012750.KS", // 에스원
  "033780.KS", // KT&G
  "034730.KS", // SK
  "047050.KS", // 포스코인터내셔널
  "071320.KS", // 지역난방공사
  "086790.KS", // 하나금융지주
  "088350.KS", // 한화생명
  "112040.KQ", // 위메이드
  "139480.KS", // 이마트
  "196170.KQ", // 알테오젠
  "207940.KS", // 삼성바이오로직스
  "204320.KS", // HL만도
  "253450.KQ", // 스튜디오드래곤
  "267270.KS", // HD현대건설기계
  "285130.KS", // SK케미칼
  "293490.KQ", // 카카오게임즈
  "326030.KS", // SK바이오팜
  "ARE", // Alexandria Real Estate Equities
  "CEG", // Constellation Energy
  "CHTR", // Charter Communications
  "CTAS", // Cintas
  "EL", // The Estée Lauder Companies
  "EMR", // Emerson Electric
  "FSLR", // First Solar
  "NSC", // Norfolk Southern Railway
  "OKE", // Oneok
  "VTR", // Ventas
]);

// 매번 외부(financialmodelingprep)에서 개별 요청하면 느려서, 미리 받아둔 로컬 캐시(logos/)를 우선 쓰고
// 혹시 못 받아둔 심볼만 그때그때 외부 URL로 폴백한다(logo-failed 클래스가 붙기 전 마지막 시도).
// 로컬 캐시는 저(low)/중(mid) 2단계만 두며, 현재는 둘 다 동일한 이미지(중화질 기준)를 가리킴 —
// 화질 차등이 다시 필요해지면 low만 별도로 축소하면 됨. 고화질(high) 티어는 더 이상 사용하지 않음
function logoUrl(symbol, tier) {
  return `logos/${tier || "low"}/${encodeURIComponent(symbol)}.png`;
}
function logoUrlFallback(symbol) {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}
function pickLogoTier(onScreenRadiusPx) {
  if (onScreenRadiusPx >= 20) return "mid";
  return "low";
}

function fmtMarketCap(n) {
  if (n === null || n === undefined) return "정보 없음";
  const t = 1e12, b = 1e9, m = 1e6;
  if (n >= t) return `$${(n / t).toFixed(2)}T`;
  if (n >= b) return `$${(n / b).toFixed(1)}B`;
  if (n >= m) return `$${(n / m).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

// 원화 금액용 — 억/조 단위(한국식 그룹핑)로 표기
function fmtWonCompact(n) {
  if (n === null || n === undefined) return "정보 없음";
  const sign = n < 0 ? "-" : "";
  const eok = Math.round(Math.abs(n) / 1e8);
  const jo = Math.floor(eok / 10000);
  const rest = eok % 10000;
  if (jo > 0 && rest > 0) return `${sign}${jo}조 ${rest.toLocaleString()}억원`;
  if (jo > 0) return `${sign}${jo}조원`;
  if (eok > 0) return `${sign}${eok.toLocaleString()}억원`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}원`;
}

// 시가총액 필터 슬라이더 눈금 전용 — 억 단위는 날리고 "조" 단위로만 반올림해서 표기(예: 148조)
function fmtWonTrillionOnly(n) {
  if (n === null || n === undefined) return "정보 없음";
  const jo = Math.round(n / 1e12);
  return `${jo.toLocaleString()}조`;
}

// ---------- 1) pack 레이아웃 데이터 만들기 ----------
// sizeMode: "marketCap"(기본, 시가총액 비례) | "equal"(균등 — 원 크기를 전부 동일하게)
// 기본 화면은 상위 종목만 보여주고("+전체보기" 버튼을 눌러야 전체 유니버스가 보임) — 시장별로 각자 켜고 끌 수 있음.
// 초기 로딩을 가볍게 하려고 상위 종목(core)만 <script>로 즉시 불러오고, 나머지(extra)는 실제로 "+전체보기"를
// 누르는 순간에만 별도 파일을 동적으로 불러온다(한 번 불러오면 캐시해서 다음 토글부터는 재요청하지 않음).
// 해외: core=시가총액 상위 200개, extra=나머지(약 300개) / 국내: core=코스피 상위 100개+코스닥 상위 50개, extra=나머지(약 197개)
const UNIVERSE_EXPANDED = { domestic: false, overseas: false };
const extraDataLoadPromises = {};
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}
function ensureExtraDataLoaded(market) {
  if (extraDataLoadPromises[market]) return extraDataLoadPromises[market];
  const src = market === "domestic" ? "data/kr-data-extra.js" : "data/sp500-data-extra.js";
  extraDataLoadPromises[market] = loadScriptOnce(src).catch((err) => {
    delete extraDataLoadPromises[market]; // 실패하면 다음 클릭 때 다시 시도할 수 있도록 캐시하지 않음
    throw err;
  });
  return extraDataLoadPromises[market];
}
function coreDataFor(market) {
  return market === "domestic"
    ? typeof KR_CORE_DATA !== "undefined"
      ? KR_CORE_DATA
      : { companies: [] }
    : SP500_CORE_DATA;
}
function extraDataFor(market) {
  if (market === "domestic") return typeof KR_EXTRA_DATA !== "undefined" ? KR_EXTRA_DATA : null;
  return typeof SP500_EXTRA_DATA !== "undefined" ? SP500_EXTRA_DATA : null;
}
// UNIVERSE_EXPANDED/ACTIVE_MARKET 상태에 맞게 ACTIVE_DATA를 다시 계산 — extra가 아직 안 불러와진 상태에서
// 펼침으로 표시돼 있으면(로딩 실패 등) core만이라도 보여줌
function updateActiveDataForUniverseState() {
  const core = coreDataFor(ACTIVE_MARKET);
  if (!UNIVERSE_EXPANDED[ACTIVE_MARKET]) {
    ACTIVE_DATA = core;
    return;
  }
  const extra = extraDataFor(ACTIVE_MARKET);
  ACTIVE_DATA = extra ? { ...core, companies: [...core.companies, ...extra.companies] } : core;
}
// 시장/전체보기 상태에 맞는 버튼 라벨을 그림("불러오는 중"은 extra 파일을 처음 받아오는 동안만 잠깐 표시)
function updateUniverseToggleBtn(loading) {
  const btn = document.getElementById("universeToggleBtn");
  if (!btn) return;
  if (loading) {
    btn.textContent = "불러오는 중...";
    return;
  }
  btn.textContent = UNIVERSE_EXPANDED[ACTIVE_MARKET] ? "-접기" : "+전체보기";
}
document.getElementById("universeToggleBtn").addEventListener("click", async () => {
  const nextExpanded = !UNIVERSE_EXPANDED[ACTIVE_MARKET];
  if (nextExpanded && !extraDataFor(ACTIVE_MARKET)) {
    updateUniverseToggleBtn(true);
    try {
      await ensureExtraDataLoaded(ACTIVE_MARKET);
    } catch {
      showToast("전체 목록을 불러오지 못했어요. 다시 시도해주세요");
      updateUniverseToggleBtn();
      return;
    }
  }
  UNIVERSE_EXPANDED[ACTIVE_MARKET] = nextExpanded;
  updateActiveDataForUniverseState();
  updateUniverseToggleBtn();
  // 전체보기/접기로 종목 수가 바뀌면 캐시된 지표 범위(m.domain)가 낡아 슬라이더가 실제 값 분포와 어긋남
  // (예: 전체보기 직후 기존 범위 밖 종목들이 필터에 걸려 절반이 사라져 보임) — 전부 무효화하고 다시 계산
  for (const key of Object.keys(METRICS)) delete METRICS[key].domain;
  activeFilters.clear();
  rerenderMap(true);
  quickSliderCtrl.refresh();
  panelControllers.forEach((ctrl) => ctrl.refresh());
});

// 지도 맨 위에 전체 시장 이름+등락률 라벨이 들어갈 띠 높이(월드 좌표) — 섹터 원들은 이 아래로 배치됨
const MARKET_LABEL_STRIP = 110;

function buildPackedRoot(data) {
  const bySector = new Map();
  for (const c of data.companies) {
    if (!c.marketCap) continue;
    const sec = canonicalSector(c.sector);
    if (!bySector.has(sec)) bySector.set(sec, []);
    bySector.get(sec).push(c);
  }
  const children = [...bySector.entries()].map(([sector, companies]) => ({
    name: sector,
    sectorKo: companies[0].sectorKo,
    children: companies.map((c) => ({ ...c, value: sizeMode === "equal" ? 1 : c.marketCap })),
  }));

  const root = d3.hierarchy({ name: "root", children }).sum((d) => d.value).sort((a, b) => b.value - a.value);

  d3.pack().size([WORLD_SIZE, WORLD_SIZE - MARKET_LABEL_STRIP]).padding((d) => (d.depth === 1 ? 30 : 2))(root);

  // 상단 시장 라벨 띠만큼 전체를 아래로 내림(줌/클릭 등 좌표 로직은 노드 좌표 그대로 사용하므로 안전)
  for (const node of root.descendants()) node.y += MARKET_LABEL_STRIP;

  return root;
}

// 섹터들 위(지도 안 월드 좌표)에 전체 시장 이름+평균 등락률 표시 — 버튼이 아니라 지도 요소.
// 국내: 코스피100/코스닥50(축소) ↔ 코스피200/코스닥150(전체보기), 해외: S&P200(축소) ↔ S&P500(전체보기)
// 등락률 집계 공용 헬퍼 — 균등 모드: 단순 평균 / 시총 모드: 시총 가중 평균(전체 시총 중 몇 %가 움직였는지)
function avgChangeOf(list) {
  const useCap = sizeMode === "marketCap";
  let sum = 0;
  let weightTotal = 0;
  for (const c of list) {
    if (typeof c.changePercent !== "number" || !Number.isFinite(c.changePercent)) continue;
    const w = useCap ? (typeof c.marketCap === "number" && c.marketCap > 0 ? c.marketCap : 0) : 1;
    if (!w) continue;
    sum += c.changePercent * w;
    weightTotal += w;
  }
  return weightTotal > 0 ? sum / weightTotal : null;
}

function marketIndexEntries() {
  const expanded = UNIVERSE_EXPANDED[ACTIVE_MARKET];
  const avgOf = avgChangeOf;
  if (ACTIVE_MARKET === "domestic") {
    const kospi = ACTIVE_DATA.companies.filter((c) => c.exchange === "KOSPI");
    const kosdaq = ACTIVE_DATA.companies.filter((c) => c.exchange === "KOSDAQ");
    return [
      { name: expanded ? "코스피200" : "코스피100", avg: avgOf(kospi) },
      { name: expanded ? "코스닥150" : "코스닥50", avg: avgOf(kosdaq) },
    ];
  }
  return [{ name: expanded ? "S&P500" : "S&P200", avg: avgOf(ACTIVE_DATA.companies) }];
}

function renderMarketIndexLabels() {
  const wrap = document.createElement("div");
  wrap.className = "market-index-labels";
  wrap.style.height = `${MARKET_LABEL_STRIP}px`;
  for (const entry of marketIndexEntries()) {
    const item = document.createElement("div");
    item.className = "market-index-label";
    const nameEl = document.createElement("span");
    nameEl.className = "market-index-name";
    nameEl.textContent = entry.name;
    const chgEl = document.createElement("span");
    chgEl.className = "market-index-chg";
    if (entry.avg === null) {
      chgEl.textContent = "-";
    } else {
      chgEl.textContent = `${entry.avg >= 0 ? "+" : ""}${entry.avg.toFixed(1)}%`;
      chgEl.style.color = changeColorForText(entry.avg);
    }
    item.appendChild(nameEl);
    item.appendChild(chgEl);
    wrap.appendChild(item);
  }
  return wrap;
}

// 실시간 색 갱신 때 시장 라벨 등락률도 함께 최신화
function refreshMarketIndexLabels() {
  const wrap = document.querySelector(".market-index-labels");
  if (!wrap) return;
  const entries = marketIndexEntries();
  const items = wrap.querySelectorAll(".market-index-label");
  entries.forEach((entry, i) => {
    const item = items[i];
    if (!item) return;
    const chgEl = item.querySelector(".market-index-chg");
    if (entry.avg === null) {
      chgEl.textContent = "-";
      chgEl.style.color = "";
    } else {
      chgEl.textContent = `${entry.avg >= 0 ? "+" : ""}${entry.avg.toFixed(1)}%`;
      chgEl.style.color = changeColorForText(entry.avg);
    }
  });
}

// ---------- 2) DOM 렌더링 ----------
const mapWorld = document.getElementById("mapWorld");
const mapViewport = document.getElementById("mapViewport");
const loadingIndicator = document.getElementById("loadingIndicator");
const bubbleBySymbol = new Map(); // symbol -> .company-bubble 엘리먼트(지표 범위 필터 적용 시 빠르게 찾기용)

// 국내/해외 전환 — 지금 화면에 그려진 데이터셋(기본은 core만, "+전체보기" 상태면 core+extra).
// KR_CORE_DATA는 data/kr-data-core.js가 만들어둠(없으면 국내 전환 시 안내만 표시)
let ACTIVE_MARKET = "overseas";
let ACTIVE_DATA = coreDataFor(ACTIVE_MARKET);
let sizeMode = "equal"; // 기본값 균등 — "시총" 버튼으로 "marketCap"과 토글(버튼 이름은 항상 "시총", 시총 모드일 때만 주황 강조)

// 섹터 이름표를 "로고 하나"처럼 취급 — 섹터 원 맨 위 가장자리에 딱 붙여 고정하고,
// d3-force로 (1) 종목 원끼리 절대 안 겹치게(사이즈별 최소 간격), (2) 이름표(알약 모양 사각형)와도 안 겹치게 풀어낸다.
// 이름표 회피는 원형이 아니라 실제 알약 모양(둥근 사각형)에 맞춰 계산해서, 필요한 곳(제목 바로 위/아래)만
// 자연스럽게 비켜가고 엉뚱하게 큰 원형으로 밀려나지 않도록 한다. 원래 pack 위치에서 최대한 적게 움직이도록
// 약한 복원력(forceX/forceY)도 함께 걸어서, 꼭 필요한 원들만 자리를 살짝 양보하게 만든다.
function layoutSectorLabel(sectorNode) {
  const kids = sectorNode.children;
  const fontSize = Math.max(13, Math.min(30, sectorNode.r * 0.11));
  const text = `${sectorNode.data.sectorKo} · ${kids.length}`;
  const pillW = text.length * fontSize * 0.62 + 28;
  const pillH = fontSize * 1.9;
  const labelX = sectorNode.x;
  const labelY = sectorNode.y - sectorNode.r + pillH * 0.42; // 섹터 원 맨 위 가장자리에 딱 붙임(경계에 걸치도록)
  const halfW = pillW / 2 + 3;
  const halfH = pillH / 2 + 3;

  for (const c of kids) {
    c.x0 = c.x;
    c.y0 = c.y;
  }

  const sim = d3
    .forceSimulation(kids)
    .force(
      "collide",
      // forceCollide는 충돌한 두 노드의 반지름을 더해서 최소 거리로 쓰므로, 노드별로 반지름을 살짝 부풀려두면
      // 두 노드 사이 실제 간격이 (원래 반지름 합) + (사이즈 비례 여백)이 되어 사이즈별 최소 간격 효과를 낸다.
      d3.forceCollide((d) => d.r * 1.045 + 0.8).iterations(4)
    )
    .force("pullX", d3.forceX((d) => d.x0).strength(0.25))
    .force("pullY", d3.forceY((d) => d.y0).strength(0.25))
    .force("avoidLabel", () => {
      for (const n of kids) {
        const dx = n.x - labelX;
        const dy = n.y - labelY;
        const insideX = Math.abs(dx) < halfW;
        const insideY = Math.abs(dy) < halfH;
        if (insideX && insideY) {
          // 중심이 알약 사각형 안에 있으면 가장 가까운 변으로 밀어냄
          const toRight = halfW - dx, toLeft = halfW + dx;
          const toBottom = halfH - dy, toTop = halfH + dy;
          const m = Math.min(toRight, toLeft, toBottom, toTop);
          if (m === toRight) n.x = labelX + halfW + n.r;
          else if (m === toLeft) n.x = labelX - halfW - n.r;
          else if (m === toBottom) n.y = labelY + halfH + n.r;
          else n.y = labelY - halfH - n.r;
          continue;
        }
        const cx = Math.max(labelX - halfW, Math.min(n.x, labelX + halfW));
        const cy = Math.max(labelY - halfH, Math.min(n.y, labelY + halfH));
        const ddx = n.x - cx;
        const ddy = n.y - cy;
        const d = Math.hypot(ddx, ddy);
        if (d < n.r) {
          const ux = d < 1e-6 ? 0 : ddx / d;
          const uy = d < 1e-6 ? -1 : ddy / d;
          n.x = cx + ux * n.r;
          n.y = cy + uy * n.r;
        }
      }
    })
    .force("boundary", () => {
      for (const n of kids) {
        const dx = n.x - sectorNode.x;
        const dy = n.y - sectorNode.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const maxD = sectorNode.r - n.r - 1.5;
        if (d > maxD && maxD > 0) {
          const k = maxD / d;
          n.x = sectorNode.x + dx * k;
          n.y = sectorNode.y + dy * k;
        }
      }
    })
    .stop();

  for (let i = 0; i < 150; i++) sim.tick();

  for (const c of kids) {
    delete c.x0;
    delete c.y0;
  }

  const labelR = Math.hypot(pillW, pillH) / 2;

  return { x: labelX, y: labelY, r: labelR, w: pillW, h: pillH, fontSize, text };
}

function renderSectorNameBubble(sectorNode, pos, color) {
  const el = document.createElement("div");
  el.className = "sector-name-bubble";
  el.style.setProperty("--sc", color);
  el.style.left = `${pos.x - pos.w / 2}px`;
  el.style.top = `${pos.y - pos.h / 2}px`;
  el.style.width = `${pos.w}px`;
  el.style.height = `${pos.h}px`;
  el.style.fontSize = `${pos.fontSize}px`;
  el.textContent = pos.text;
  el.addEventListener("click", () => zoomToNode(sectorNode));
  return el;
}

function renderMap(root) {
  const frag = document.createDocumentFragment();

  frag.appendChild(renderMarketIndexLabels());

  for (const sectorNode of root.children) {
    const color = sectorColor(sectorNode.data.name);
    const bubble = document.createElement("div");
    bubble.className = "sector-bubble";
    bubble.dataset.sector = sectorNode.data.name; // "등락" 모드에서 섹터별 평균 등락률을 찾을 때 씀
    bubble.style.setProperty("--sc", color);
    bubble.style.left = `${sectorNode.x - sectorNode.r}px`;
    bubble.style.top = `${sectorNode.y - sectorNode.r}px`;
    bubble.style.width = `${sectorNode.r * 2}px`;
    bubble.style.height = `${sectorNode.r * 2}px`;

    // "등락" 모드일 때 원 가운데 표시할 평균 등락률 — 섹터 전체 합계 숫자이므로 큼지막하게
    const changeEl = document.createElement("span");
    changeEl.className = "sector-bubble-change";
    changeEl.style.fontSize = `${Math.max(18, Math.min(72, sectorNode.r * 0.3))}px`;
    bubble.appendChild(changeEl);

    bubble.addEventListener("click", (e) => {
      if (e.target !== bubble && e.target !== changeEl) return; // 하위 종목 클릭과 구분
      zoomToNode(sectorNode);
    });

    frag.appendChild(bubble);

    const labelPos = layoutSectorLabel(sectorNode);

    for (const leaf of sectorNode.children) {
      frag.appendChild(renderCompanyBubble(leaf, color));
    }

    frag.appendChild(renderSectorNameBubble(sectorNode, labelPos, color));
  }

  mapWorld.appendChild(frag);
}

function renderCompanyBubble(leaf, sectorColorValue) {
  const d = leaf.data;
  const el = document.createElement("div");
  el.className = "company-bubble";
  el.style.setProperty("--sc", sectorColorValue);
  const chg = changeColor(d.changePercent);
  el.style.setProperty("--chg", chg.css);
  const glowStrength = Math.abs(chg.t);
  if (glowStrength > 0.08) {
    el.style.setProperty("--chg-glow", `0 0 ${4 + glowStrength * 10}px ${chg.css}`);
  }
  el.style.left = `${leaf.x - leaf.r}px`;
  el.style.top = `${leaf.y - leaf.r}px`;
  el.style.width = `${leaf.r * 2}px`;
  el.style.height = `${leaf.r * 2}px`;

  const img = document.createElement("img");
  img.className = "company-logo-img";
  img.loading = "lazy";
  img.alt = d.symbol;
  if (BAD_LOGO_SYMBOLS.has(d.symbol)) {
    el.classList.add("logo-failed"); // 로고 대신 사진이 걸려있는 게 확인된 종목 — 시도 없이 바로 배지
  } else {
    img.dataset.tier = "low";
    img.src = logoUrl(d.symbol, "low");
  }
  img.addEventListener("error", () => {
    if (!img.dataset.triedFallback) {
      img.dataset.triedFallback = "1";
      img.src = logoUrlFallback(d.symbol);
    } else {
      el.classList.add("logo-failed");
    }
  });
  el.appendChild(img);
  el.dataset.r = leaf.r; // 월드 좌표 반지름 — 화면상 크기 계산용(저/중/고화질 전환)

  // 국내는 티커(005930.KS)만 봐선 무슨 회사인지 알기 어려우니, 로고 대신 배지가 뜨는 자리엔 한글 회사명을 씀
  const isKrView = ACTIVE_MARKET === "domestic";
  const badgeText = isKrView ? d.name : d.symbol;
  // 삼성전자·SK하이닉스는 지도에서 특히 눈에 잘 띄어야 하는 대표 종목이라 이름 라벨만 두 단계(약 1.4배) 더 크게 표시
  const isBigCap = isKrView && (d.symbol === "005930.KS" || d.symbol === "000660.KS");
  const bigCapScale = isBigCap ? 1.4 : 1;

  const fallback = document.createElement("div");
  fallback.className = "company-fallback-badge";
  fallback.style.setProperty("--sc", sectorColorValue);
  fallback.style.fontSize = `${Math.max(9, Math.min(22, leaf.r * (isKrView ? 0.2 : 0.32)) * bigCapScale)}px`;
  fallback.textContent = badgeText;
  el.appendChild(fallback);

  if (leaf.r > 26) {
    const tag = document.createElement("div");
    tag.className = "company-ticker-tag";
    tag.textContent = badgeText;
    tag.style.fontSize = `${Math.max(10, Math.min(28, leaf.r * 0.45) * bigCapScale)}px`;
    el.appendChild(tag);
  }

  el.addEventListener("click", () => openCompanySheet(d));

  bubbleBySymbol.set(d.symbol, el);
  return el;
}

// ---------- 3) 지도앱처럼 확대/축소/이동 ----------
const view = { x: 0, y: 0, k: 1 };
let fitK = 1;
let minK = 0.4;
const maxK = 10;

function applyTransform(animate) {
  mapWorld.style.transition = animate ? "transform 0.35s cubic-bezier(.2,.8,.3,1)" : "none";
  mapWorld.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
  scheduleLogoQualityUpdate();
}

// 화면에 실제로 보이는 크기(월드 반지름 x 현재 배율)에 맞춰 로고 화질을 저/중/고로 자동 전환.
// 드래그/휠 중에는 매 프레임 부르지 않고, 움직임이 멈춘 뒤 한 번만 전체를 훑도록 디바운스.
let logoQualityTimer = null;
function scheduleLogoQualityUpdate() {
  clearTimeout(logoQualityTimer);
  logoQualityTimer = setTimeout(updateLogoQuality, 180);
}
function updateLogoQuality() {
  for (const [symbol, el] of bubbleBySymbol) {
    if (el.classList.contains("logo-failed")) continue;
    const img = el.querySelector(".company-logo-img");
    if (!img || img.dataset.triedFallback) continue;
    const r = parseFloat(el.dataset.r || "0");
    const tier = pickLogoTier(r * view.k);
    if (img.dataset.tier !== tier) {
      img.dataset.tier = tier;
      img.src = logoUrl(symbol, tier);
    }
  }
}

function clampView() {
  view.k = Math.min(maxK, Math.max(minK, view.k));
}

// 우측에 떠있는 side-btn 컬럼(39px+오른쪽여백12px)과 locate-fab(44px+12px)이 화면폭이 좁을 때
// 지도 오른쪽 끝의 개별종목을 가리는 문제 — 중심점을 그만큼 왼쪽으로 당겨서 여유 공간을 확보한다.
const RIGHT_CONTROLS_RESERVE = 60;

function fitToViewport(animate) {
  const vw = mapViewport.clientWidth;
  const vh = mapViewport.clientHeight;
  fitK = Math.min(vw, vh) / WORLD_SIZE;
  minK = fitK * 0.55;
  view.k = fitK;
  view.x = (vw - RIGHT_CONTROLS_RESERVE - WORLD_SIZE * view.k) / 2;
  view.y = (vh - WORLD_SIZE * view.k) / 2;
  applyTransform(animate);
}

function zoomToNode(node) {
  const vw = mapViewport.clientWidth;
  const vh = mapViewport.clientHeight;
  const targetK = Math.min(maxK, (Math.min(vw, vh) / (node.r * 2)) * 0.92);
  view.k = targetK;
  view.x = vw / 2 - node.x * targetK;
  view.y = vh / 2 - node.y * targetK;
  applyTransform(true);
}

// -- 마우스 휠 확대/축소(포인터 위치를 기준으로) --
mapViewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = mapViewport.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const worldX = (px - view.x) / view.k;
    const worldY = (py - view.y) / view.k;
    const factor = Math.exp(-e.deltaY * 0.0016);
    view.k *= factor;
    clampView();
    view.x = px - worldX * view.k;
    view.y = py - worldY * view.k;
    applyTransform(false);
  },
  { passive: false }
);

// -- 포인터(마우스/터치) 드래그 이동 + 두 손가락 핀치 줌 --
const activePointers = new Map();
let dragLast = null;
let pinchStartDist = null;
let pinchStartK = null;

mapViewport.addEventListener("pointerdown", (e) => {
  // 지도 팬/핀치 캡처 대상은 지도 배경(버블 포함)뿐 — 시총/로고/관심/등락/저장/시계/전체보기 같은 고정 UI 버튼 위에서
  // 눌렀을 때도 무조건 setPointerCapture하면 이후 click이 버튼이 아니라 mapViewport로 가버려서 버튼이 안 눌리는 버그가 있었음
  if (e.target.closest(".map-side-buttons, .ai-fab, .universe-toggle-btn, .locate-fab")) return;
  mapViewport.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  mapViewport.classList.add("grabbing");
  if (activePointers.size === 1) {
    dragLast = { x: e.clientX, y: e.clientY };
  } else if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchStartK = view.k;
  }
});

mapViewport.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1 && dragLast) {
    view.x += e.clientX - dragLast.x;
    view.y += e.clientY - dragLast.y;
    dragLast = { x: e.clientX, y: e.clientY };
    applyTransform(false);
  } else if (activePointers.size === 2 && pinchStartDist) {
    const pts = [...activePointers.values()];
    const rect = mapViewport.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const worldX = (midX - view.x) / view.k;
    const worldY = (midY - view.y) / view.k;
    view.k = pinchStartK * (dist / pinchStartDist);
    clampView();
    view.x = midX - worldX * view.k;
    view.y = midY - worldY * view.k;
    applyTransform(false);
  }
});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size === 0) {
    dragLast = null;
    mapViewport.classList.remove("grabbing");
  } else if (activePointers.size === 1) {
    const [remaining] = activePointers.values();
    dragLast = { x: remaining.x, y: remaining.y };
    pinchStartDist = null;
  }
}
mapViewport.addEventListener("pointerup", endPointer);
mapViewport.addEventListener("pointercancel", endPointer);
mapViewport.addEventListener("pointerleave", (e) => {
  if (e.pointerId != null && activePointers.has(e.pointerId)) endPointer(e);
});

// ---------- 4) 종목 상세 바텀시트 ----------
const companySheet = document.getElementById("companySheet");
const companySheetBody = document.getElementById("companySheetBody");

// "관심" 필터와 같은 저장공간(watchlist_v1_kr/us)에 이 종목을 추가/제거 — 본체 검색화면의 별 버튼과 동일한 스키마
function toggleSheetWatchlist(symbol) {
  const key = ACTIVE_MARKET === "domestic" ? "watchlist_v1_kr" : "watchlist_v1_us";
  let list = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = [];
  }
  const idx = list.findIndex((w) => w.symbol === symbol);
  if (idx >= 0) list.splice(idx, 1);
  else list.push({ symbol, addedAt: Date.now(), groupId: "default" });
  localStorage.setItem(key, JSON.stringify(list));
  return idx < 0;
}

// 상세시트를 열 때마다 클릭한 종목 하나만 실시간 시세를 다시 조회(오늘 시가/고가/저가/현재가/거래량/전일종가) —
// 나머지 지도 전체는 5분 주기 색상 갱신으로 충분하지만, 지금 보고 있는 상세시트 숫자는 즉시 최신이어야 하므로 별도 조회
async function fetchLiveQuoteForSheet(symbol) {
  // range=1d&interval=5m는 KR 티커에서 chartPreviousClose가 regularMarketPrice와 같은 값으로 깨져 나오는 경우가
  // 있어서, 이미 검증된(fetch-kr-data.ps1 등에서 쓰는) range=5d&interval=1d 패턴을 그대로 사용
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  const data = await proxyFetchJson(url);
  const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
  if (!meta) return null;
  const prevClose = meta.chartPreviousClose ?? null;
  // regularMarketOpen은 Yahoo가 아예 안 채워주는 경우가 흔해서(장중이 아니면 특히), 없으면 전일종가를 시가 대용으로 사용
  const open = meta.regularMarketOpen ?? prevClose;
  return {
    price: meta.regularMarketPrice ?? null,
    open,
    high: meta.regularMarketDayHigh ?? null,
    low: meta.regularMarketDayLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    prevClose,
  };
}

// 현재 상세시트가 열려서 보여주고 있는 종목 심볼 — refreshAllBubbleColors()가 지도 전체를 갱신할 때
// 지금 시트가 보고 있는 종목과 같은 경우에만 시트 숫자도 같이 최신화하기 위해 기억해둠
let currentSheetSymbol = null;

// 상세시트의 현재가 표시용 — 마켓캡처럼 억/조 단위로 뭉치지 않고 실제 주당 가격 그대로(KRW는 원 단위, 그 외는 $ + 소수 2자리)
function fmtSheetPrice(price, currency) {
  if (price === null || price === undefined) return "정보 없음";
  if (currency === "KRW") return `${Math.round(price).toLocaleString()}원`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 상세시트가 열려있는 동안 현재가/등락률을 실제 시세로 다시 조회해 갱신 — openCompanySheet가 처음 열 때,
// 그리고 지도 전체 색상이 갱신될 때(refreshAllBubbleColors)마다 호출되어 시트 숫자가 타일 색상과 항상 같이 최신 상태를 유지
function updateSheetLiveValues(symbol) {
  if (!companySheet.classList.contains("open") || currentSheetSymbol !== symbol) return;
  fetchLiveQuoteForSheet(symbol)
    .then((live) => {
      if (!live || !companySheet.classList.contains("open") || currentSheetSymbol !== symbol) return;
      const price = live.price;
      const prevClose = live.prevClose;
      const priceEl = document.getElementById("sheetPriceValue");
      if (priceEl && price !== null && price !== undefined) {
        const currency = ACTIVE_MARKET === "domestic" ? "KRW" : "USD";
        priceEl.textContent = fmtSheetPrice(price, currency);
      }
      if (price === null || prevClose === null || !prevClose) return;
      const changePct = ((price - prevClose) / prevClose) * 100;
      const valueEl = document.getElementById("sheetChangeValue");
      if (!valueEl) return;
      valueEl.textContent = `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`;
      valueEl.style.color = changeColorForText(changePct);
    })
    .catch(() => {});
}

function openCompanySheet(d) {
  currentSheetSymbol = d.symbol;
  const color = sectorColor(d.sector);
  const chgTextColor = changeColorForText(d.changePercent);
  const chgText =
    d.changePercent === null || d.changePercent === undefined
      ? "정보 없음"
      : `${d.changePercent > 0 ? "+" : ""}${d.changePercent.toFixed(2)}%`;
  const watchlisted = getWatchlistSymbols().has(d.symbol);
  const marketClass = ACTIVE_MARKET === "domestic" ? "market-kr" : "market-us";
  companySheetBody.innerHTML = `
    <button type="button" class="sheet-close" id="sheetCloseBtn" aria-label="닫기">&times;</button>
    <button type="button" class="sheet-watch-btn${watchlisted ? " active" : ""} ${marketClass}" id="sheetWatchBtn" aria-label="관심종목 추가">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="${watchlisted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7l2.85 6.02 6.65.68-4.98 4.5 1.46 6.53L12 17.9l-5.98 3.53 1.46-6.53-4.98-4.5 6.65-.68L12 2.7z" /></svg>
    </button>
    <div class="sheet-top-row">
      ${
        BAD_LOGO_SYMBOLS.has(d.symbol)
          ? `<img class="sheet-logo" src="" alt="${d.symbol}" style="display:none;" />`
          : `<img class="sheet-logo" src="${logoUrl(d.symbol, "mid")}" alt="${d.symbol}" onerror="if(!this.dataset.tf){this.dataset.tf='1';this.src='${logoUrlFallback(d.symbol)}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" />`
      }
      <div class="sheet-fallback-badge" style="display:${BAD_LOGO_SYMBOLS.has(d.symbol) ? "flex" : "none"}; background:${color};">${d.symbol}</div>
      <div>
        <div class="sheet-name sheet-name-link" id="sheetNameLink" role="button" tabindex="0">${d.name}</div>
        <div class="sheet-symbol">${d.symbol} · ${d.sectorKo}</div>
      </div>
    </div>
    <div class="sheet-stats">
      <div>
        <div class="sheet-stat-label">시가총액</div>
        <div class="sheet-stat-value">${d.currency === "KRW" ? fmtWonCompact(d.marketCap) : fmtMarketCap(d.marketCap)}</div>
      </div>
      <div>
        <div class="sheet-stat-label">현재가</div>
        <div class="sheet-stat-value" id="sheetPriceValue">불러오는 중...</div>
      </div>
      <div>
        <div class="sheet-stat-label">등락률</div>
        <div class="sheet-stat-value" id="sheetChangeValue" style="color:${chgTextColor};">${chgText}</div>
      </div>
      <div>
        <div class="sheet-stat-label">섹터</div>
        <div class="sheet-stat-value">${d.sectorKo}</div>
      </div>
    </div>
  `;
  companySheet.classList.add("open");
  // 현재가/등락률을 지금 이 순간의 실제 시세로 다시 조회해 갱신 — 정적 스냅샷(d.changePercent)이 지도 타일 색상보다
  // 오래된 값일 수 있던 문제 해결(레이아웃은 기존 그대로, 숫자만 실시간 반영). 시트가 열려있는 동안은
  // refreshAllBubbleColors()가 지도 색상을 새로고침할 때마다 updateSheetLiveValues가 다시 호출되어 계속 동기화됨
  updateSheetLiveValues(d.symbol);
  document.getElementById("sheetCloseBtn").addEventListener("click", closeCompanySheet);
  const watchBtn = document.getElementById("sheetWatchBtn");
  watchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const nowActive = toggleSheetWatchlist(d.symbol);
    watchBtn.classList.toggle("active", nowActive);
    watchBtn.querySelector("svg").setAttribute("fill", nowActive ? "currentColor" : "none");
  });
  // 종목명을 누르면 본체(내투자닷컴)의 검색 상세 페이지로 이동 — 지도에선 요약 정보만 보여주므로 더 자세히 보려면 여기로
  const nameLink = document.getElementById("sheetNameLink");
  const goToTickerDetail = () => {
    try {
      sessionStorage.setItem("ntj_skip_map_redirect", "1");
    } catch {}
    window.location.href = `../index.html?ticker=${encodeURIComponent(d.symbol)}`;
  };
  nameLink.addEventListener("click", (e) => {
    e.stopPropagation();
    goToTickerDetail();
  });
  nameLink.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToTickerDetail();
    }
  });
}
function closeCompanySheet() {
  companySheet.classList.remove("open");
  currentSheetSymbol = null;
}
mapViewport.addEventListener("pointerdown", (e) => {
  if (companySheet.classList.contains("open") && !companySheet.contains(e.target)) closeCompanySheet();
  if (
    rangeSheet.classList.contains("open") &&
    !rangeSheet.contains(e.target) &&
    !e.target.closest(".metric-chip")
  ) {
    closeRangeSheet();
  }
  const wlSheet = document.getElementById("watchlistSheet");
  if (wlSheet.classList.contains("open") && !wlSheet.contains(e.target)) wlSheet.classList.remove("open");
});

// ---------- 5) 상단/하단 임시 버튼 토스트 + 국내/해외 토글 ----------
const toastEl = document.getElementById("toast");
let toastTimer = null;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toast]");
  if (btn) showToast(btn.dataset.toast);
});

document.querySelectorAll(".bottom-nav-btn, .side-btn:not(#sizeModeBtn):not(#logoModeBtn):not(#watchFilterBtn)").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.parentElement;
    group.querySelectorAll(".active").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// 기본 화면은 색상만 보기 — 버튼을 누르면 로고 보기로 전환되며 주황 배경으로 강조된다 (버튼 이름은 항상 "로고")
const logoModeBtn = document.getElementById("logoModeBtn");
mapWorld.classList.add("color-only");
logoModeBtn.textContent = "로고";
logoModeBtn.classList.remove("active");

logoModeBtn.addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const colorOnly = mapWorld.classList.toggle("color-only");
  btn.classList.toggle("active", !colorOnly);
});

// "관심" — 버튼 이름은 그대로, 누르면 주황 배경/흰 글씨로 강조되며 내 관심종목만 남김
document.getElementById("watchFilterBtn").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  watchOnlyMode = !watchOnlyMode;
  btn.classList.toggle("active", watchOnlyMode);
  applyAllFilters();
});

document.getElementById("resetViewBtn").addEventListener("click", () => {
  resetAllFilters(); // 걸려있는 모든 지표 필터를 "전체"로
  closeRangeSheet();
  fitToViewport(true); // 지도 확대/이동 상태도 초기 화면으로
});
document.getElementById("fitAllBtn").addEventListener("click", () => fitToViewport(true));

// ---------- 6) 상단 10개 지표 버튼 → 범위 지정 바텀시트(실시간 필터) ----------
// 해외(S&P500): 매출액·현금흐름·순이익 증가율/EPS/PER/시가총액/배당률은 하루 1회 배치, 상승률·하락률·인기종목은
// 페이지가 열릴 때마다 Yahoo에서 실시간으로 새로 받아온다(refreshLiveData). 국내(KOSPI200+KOSDAQ150)는 섹터 스크리너가
// 없어 종목별로 하나씩 조회해야 해서, 10개 지표 전부 하루 1회 배치 스냅샷 값을 쓴다(배당률만 아직 수집 로직이 없어 준비중).
// "거래량" — 원값(달러/원 거래대금)이 아니라 거래대금 순위(1등이 제일 많이 거래됨)로 필터링한다.
// 국내는 KOSPI200+KOSDAQ150 전체 유니버스 기준 TOP350, 해외는 S&P500 기준 TOP500까지 고정 범위로 보여준다.
function buildPopularRank(isKr) {
  const state = { map: new Map() };
  state.refresh = () => {
    const sorted = [...ACTIVE_DATA.companies]
      .filter((c) => typeof c.dollarVolume === "number" && Number.isFinite(c.dollarVolume))
      .sort((a, b) => b.dollarVolume - a.dollarVolume);
    state.map = new Map(sorted.map((c, i) => [c.symbol, i + 1]));
  };
  state.universeSize = isKr ? 350 : 500;
  return state;
}

function buildMetrics(market) {
  const isKr = market === "domestic";
  const popularRank = buildPopularRank(isKr);
  popularRank.refresh();
  return {
    week52RangePct: {
      label: "52주최저",
      hasData: true,
      get: (c) => c.week52RangePct,
      fmt: (v) => `${v.toFixed(0)}%`,
      domainMin: 0,
      domainMax: 100,
    },
    popularStocks: {
      label: "거래대금",
      hasData: true,
      needsLive: !isKr,
      // 순위를 "상위 몇 %"로 환산 — 축소/전체보기와 무관하게 항상 상위 1%~100% 스케일
      // (1위가 1% 미만이 되면 전체 범위에서도 잘려나가므로 최소 1%로 클램프)
      get: (c) => {
        const rank = popularRank.map.get(c.symbol);
        const total = popularRank.map.size;
        if (!rank || !total) return undefined;
        return Math.max(1, (rank / total) * 100);
      },
      fmt: (v) => `상위 ${Math.max(1, Math.round(v))}%`,
      fixedDomain: [1, 100],
      refreshRank: popularRank.refresh,
      getRankCount: () => popularRank.map.size,
    },
    // 본체(app.js)의 computeAttractivenessScore·computeRiskScore와 동일 공식으로 배치 계산해둔 값
    // (sector-map/scripts/fetch-momentum-scores.ps1, data/*-sectors.json에 pressureScore/stabilityScore로 저장)
    pressureScore: { label: "상승압력", hasData: true, get: (c) => c.pressureScore, fmt: (v) => `${v.toFixed(1)}점`, domainMin: 0, domainMax: 10 },
    stabilityScore: { label: "투자안정", hasData: true, get: (c) => c.stabilityScore, fmt: (v) => `${v.toFixed(1)}점`, domainMin: 0, domainMax: 10 },
    // 상승률/하락률을 하나로 합쳐 최저(가장 큰 하락)~최고(가장 큰 상승)가 한 슬라이더 안에 전부 보이도록 함
    changePct: { label: "등락률", hasData: true, live: !isKr, get: (c) => c.changePercent, fmt: (v) => `${v.toFixed(1)}%` },
    revenueGrowth: { label: "매출성장", hasData: true, get: (c) => c.revenueGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    netIncomeGrowth: { label: "순이익증가", hasData: true, get: (c) => c.netIncomeGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    dividendYield: { label: "배당률", hasData: true, get: (c) => c.dividendYield, fmt: (v) => `${v.toFixed(2)}%` },
    debtRatio: { label: "부채비율", hasData: true, get: (c) => c.debtRatio, fmt: (v) => `${v.toFixed(1)}%`, domainMin: 0, domainMax: 300 },
    cashFlowGrowth: { label: "현금흐름 증가", hasData: true, get: (c) => c.cashFlowGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    per: { label: "PER", hasData: true, get: (c) => c.per, fmt: (v) => `${v.toFixed(1)}배`, domainMax: 80 },
  };
}
let METRICS = buildMetrics("overseas");

function getMetricDomain(key) {
  const m = METRICS[key];
  // 거래량 지표 — 순위를 상위 %로 환산해 쓰므로 항상 고정 스케일(상위 1%~100%)
  if (m.fixedDomain) return m.fixedDomain;
  // 실시간으로 값이 바뀌는 지표는 열 때마다 도메인을 새로 계산(캐시하면 실시간 갱신 후에도 옛 범위로 고정돼버림)
  if (m.domain && !m.live && !m.needsLive) return m.domain;
  let values = ACTIVE_DATA.companies.map(m.get).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (m.onlyPositive) values = values.filter((v) => v >= 0);
  if (m.onlyNegative) values = values.filter((v) => v <= 0);
  let min = values.length ? Math.min(...values) : 0;
  let max = values.length ? Math.max(...values) : 1;
  if (m.onlyPositive) min = 0;
  if (m.onlyNegative) max = 0;
  if (m.domainMax !== undefined) max = Math.min(max, m.domainMax);
  if (m.domainMin !== undefined) min = Math.max(min, m.domainMin);
  if (min === max) max = min + 1;
  m.domain = [min, max];
  return m.domain;
}

// 지금 좁혀진 필터들 — key -> [min,max]. "전체" 범위인 지표는 여기 안 들어있음(=필터링에 영향 없음).
// 여러 지표를 동시에 좁히면 전부 AND로 합쳐져서 적용됨(빠른 버튼/전체 설정 패널 둘 다 이 상태를 공유).
const activeFilters = new Map();
let liveDataLoaded = false; // 상승률/하락률/인기종목이 실시간 데이터로 한 번이라도 갱신됐는지

// "관심" 버튼 — 본체(내투자닷컴)와 같은 origin이라 localStorage(watchlist_v1_us/kr)를 그대로 읽을 수 있다
let watchOnlyMode = false;
function getWatchlistSymbols() {
  const key = ACTIVE_MARKET === "domestic" ? "watchlist_v1_kr" : "watchlist_v1_us";
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return new Set(Array.isArray(list) ? list.map((w) => w.symbol) : []);
  } catch {
    return new Set();
  }
}

function isFullRange(key, range) {
  const [domMin, domMax] = getMetricDomain(key);
  return range[0] <= domMin && range[1] >= domMax;
}

// 10개 버튼 중 실제로 범위가 좁혀진(=필터가 걸린) 것만 계속 주황 배경으로 표시 — 시트를 닫아도 유지되고,
// activeFilters가 메모리 상태라 새로고침하면 자연히 초기화된다.
function syncMetricChipActive() {
  document.querySelectorAll(".metric-chip").forEach((b) => {
    b.classList.toggle("active", activeFilters.has(b.dataset.metric));
  });
}

// 슬라이더가 움직일 때마다 바로 호출 — 500개 원을 한 번씩 훑어서 활성 필터를 전부 만족하는지 확인(실시간 반응)
function applyAllFilters() {
  const watchSet = watchOnlyMode ? getWatchlistSymbols() : null;
  for (const c of ACTIVE_DATA.companies) {
    const el = bubbleBySymbol.get(c.symbol);
    if (!el) continue;
    let pass = !(watchSet && !watchSet.has(c.symbol));
    if (pass) {
      for (const [key, range] of activeFilters) {
        const m = METRICS[key];
        if (!m || !m.hasData) continue;
        const v = m.get(c);
        if (typeof v !== "number" || !Number.isFinite(v) || v < range[0] || v > range[1]) {
          pass = false;
          break;
        }
      }
    }
    // display:none으로 없애면 사각형(트리맵) 모드에서 격자에 구멍이 뚫려 화면이 깨져 보임 —
    // 대신 흐리게 남겨서 지도 모양은 유지하고 통과 종목만 도드라지게(원형 모드도 동일하게 자연스러움)
    el.classList.toggle("filtered-out", !pass);
  }
  syncMetricChipActive();
}

function setFilterRange(key, range) {
  if (isFullRange(key, range)) activeFilters.delete(key);
  else activeFilters.set(key, [...range]);
  applyAllFilters();
}

function resetAllFilters() {
  activeFilters.clear();
  applyAllFilters(); // 안에서 syncMetricChipActive()까지 처리됨
  quickSliderCtrl.refresh();
  panelControllers.forEach((ctrl) => ctrl.refresh());
}

// 예전엔 국내 시가총액 필터 슬라이더에 SK스퀘어를 기준점으로 한 비선형 스케일을 썼으나(2026-08-26),
// 시가총액 필터 자체가 지도 필터 목록에서 빠지면서 더 이상 어떤 키로도 호출되지 않음(항상 null=선형 스케일 반환).
function scaleForKey(key) {
  return null;
}

// 슬라이더 하나(썸 2개 + 트랙 + 눈금)를 특정 지표(key)에 묶어서 드래그·눈금·"전체" 표시를 전담시키는 컨트롤러.
// 빠른 버튼(시트 1개짜리, key가 열 때마다 바뀜)과 전체 설정 패널(지표당 슬라이더 1개씩 고정) 둘 다 이걸로 만든다.
let panelControllers = []; // 전체 설정 패널을 다시 그릴 때마다 교체됨
function createSliderController(getKey, els, onNoDataChange) {
  let dragging = null;

  function currentRange() {
    const key = getKey();
    const domain = getMetricDomain(key);
    return activeFilters.has(key) ? [...activeFilters.get(key)] : [domain[0], domain[1]];
  }

  function renderTicks() {
    const key = getKey();
    const m = METRICS[key];
    const [domMin, domMax] = getMetricDomain(key);
    const scale = scaleForKey(key);
    els.labels.innerHTML = "";
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const v = scale ? scale.toValue(t) : domMin + (domMax - domMin) * t;
      const span = document.createElement("span");
      span.textContent = i === 5 ? "최대" : m.fmt(v);
      els.labels.appendChild(span);
    }
  }

  function updateVisual() {
    const key = getKey();
    const m = METRICS[key];
    const [domMin, domMax] = getMetricDomain(key);
    const [selMin, selMax] = currentRange();
    const scale = scaleForKey(key);
    const span = domMax - domMin || 1;
    const tMin = scale ? scale.toFrac(selMin) : (selMin - domMin) / span;
    const tMax = scale ? scale.toFrac(selMax) : (selMax - domMin) / span;
    els.thumbMin.style.left = `${tMin * 100}%`;
    els.thumbMax.style.left = `${tMax * 100}%`;
    els.fill.style.left = `${tMin * 100}%`;
    els.fill.style.right = `${(1 - tMax) * 100}%`;
    if (els.valueLabel) {
      els.valueLabel.textContent = isFullRange(key, [selMin, selMax])
        ? "전체"
        : `${m.fmt(selMin)} 이상 ${m.fmt(selMax)} 이하`;
    }
  }

  function refresh() {
    const key = getKey();
    const m = key ? METRICS[key] : null;
    const noData = !m || !m.hasData || !!(m.needsLive && !liveDataLoaded);
    if (onNoDataChange) onNoDataChange(noData, m);
    if (noData) return;
    renderTicks();
    updateVisual();
  }

  function pointerToValue(clientX) {
    const rect = els.slider.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const key = getKey();
    const [domMin, domMax] = getMetricDomain(key);
    const scale = scaleForKey(key);
    return scale ? scale.toValue(t) : domMin + t * (domMax - domMin);
  }

  function bindThumb(el, which) {
    el.addEventListener("pointerdown", (e) => {
      dragging = which;
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
  }
  bindThumb(els.thumbMin, "min");
  bindThumb(els.thumbMax, "max");

  els.slider.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const key = getKey();
    if (!key) return;
    const range = currentRange();
    const v = pointerToValue(e.clientX);
    if (dragging === "min") range[0] = Math.min(v, range[1]);
    else range[1] = Math.max(v, range[0]);
    setFilterRange(key, range);
    updateVisual();
  });
  window.addEventListener("pointerup", () => {
    dragging = null;
  });
  window.addEventListener("pointercancel", () => {
    dragging = null;
  });

  const ctrl = {
    refresh,
    reset: () => {
      const key = getKey();
      setFilterRange(key, getMetricDomain(key));
      updateVisual();
    },
  };
  return ctrl;
}

// 시트가 "준비중" 상태일 때 보여줄 문구 — 거래량(순위)은 지금까지 몇 개나 순위가 매겨졌는지 숫자로 보여준다
// (해외는 실시간 조회가 끝나야 순위가 채워지므로 이 숫자가 로딩 진행 상황이 된다)
function noDataMessage(key, m) {
  if (key === "popularStocks" && m.getRankCount) {
    const count = m.getRankCount();
    const marketLabel = ACTIVE_MARKET === "domestic" ? "국내 주식 시장과" : "글로벌 주식 시장과";
    return `${marketLabel} 실시간 연동중... ${count}개`;
  }
  return m.needsLive && !liveDataLoaded ? "실시간 데이터를 불러오는 중입니다..." : "데이터 준비중입니다";
}

// ---------- 6-1) 빠른 버튼 하나짜리 바텀시트 ----------
const rangeSheet = document.getElementById("rangeSheet");
const rangeSheetTitle = document.getElementById("rangeSheetTitle");
const rangeSheetResetBtn = document.getElementById("rangeSheetResetBtn");
const rangeSheetNote = document.getElementById("rangeSheetNote");
let quickSheetKey = null;
const quickSliderCtrl = createSliderController(
  () => quickSheetKey,
  {
    slider: document.getElementById("rangeSlider"),
    fill: document.getElementById("rangeSliderFill"),
    thumbMin: document.getElementById("rangeThumbMin"),
    thumbMax: document.getElementById("rangeThumbMax"),
    labels: document.getElementById("rangeSliderLabels"),
    valueLabel: document.getElementById("rangeSheetValue"),
  },
  (noData, m) => {
    rangeSheet.classList.toggle("no-data", noData);
    if (noData && m) rangeSheetNote.textContent = noDataMessage(quickSheetKey, m);
  }
);

function openRangeSheet(key) {
  closeCompanySheet();
  closeAllFiltersPanel();
  closeWatchlistSheet();
  quickSheetKey = key;
  rangeSheetTitle.textContent = METRICS[key].label;
  quickSliderCtrl.refresh();
  rangeSheet.classList.add("open");
}

function closeRangeSheet() {
  rangeSheet.classList.remove("open");
}

// 핸들을 살짝만 아래로 끌어도(낮은 임계값) 시트가 닫히는 드래그 제스처
function enableSheetDragToClose(sheetEl, handleEl, closeFn) {
  const DRAG_CLOSE_THRESHOLD = 24; // px — 살짝만 내려도 닫히도록 낮게 설정
  let startY = null;
  let dragging = false;
  handleEl.addEventListener("pointerdown", (e) => {
    startY = e.clientY;
    dragging = true;
    sheetEl.style.transition = "none";
    try {
      handleEl.setPointerCapture(e.pointerId);
    } catch {}
  });
  handleEl.addEventListener("pointermove", (e) => {
    if (!dragging || startY === null) return;
    const dy = Math.max(0, e.clientY - startY);
    sheetEl.style.transform = `translateY(${dy}px)`;
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    const dy = startY === null ? 0 : Math.max(0, (e.clientY ?? startY) - startY);
    startY = null;
    sheetEl.style.transition = "";
    sheetEl.style.transform = "";
    if (dy > DRAG_CLOSE_THRESHOLD) closeFn();
  }
  handleEl.addEventListener("pointerup", endDrag);
  handleEl.addEventListener("pointercancel", endDrag);
}
enableSheetDragToClose(companySheet, companySheet.querySelector(".company-sheet-handle"), closeCompanySheet);
enableSheetDragToClose(rangeSheet, rangeSheet.querySelector(".range-sheet-handle"), closeRangeSheet);
// 핸들 바가 작아 잡기 어려운 경우를 위해 시트 헤더(제목 줄)도 통째로 드래그 존으로 등록
enableSheetDragToClose(rangeSheet, rangeSheet.querySelector(".range-sheet-header"), closeRangeSheet);

// ---------- 즐겨찾기 바텀시트 — 상단 별 버튼으로 열고, 항목을 누르면 지도에서 그 종목으로 줌+상세시트(화면 이동 없음) ----------
const watchlistSheet = document.getElementById("watchlistSheet");
const watchlistSheetList = document.getElementById("watchlistSheetList");

function closeWatchlistSheet() {
  watchlistSheet.classList.remove("open");
}

function findLeafBySymbol(symbol) {
  if (!packedRoot) return null;
  for (const sectorNode of packedRoot.children) {
    for (const leaf of sectorNode.children) {
      if (leaf.data.symbol === symbol) return leaf;
    }
  }
  return null;
}

function openWatchlistSheet() {
  closeCompanySheet();
  closeRangeSheet();
  closeAllFiltersPanel();

  watchlistSheetList.innerHTML = "";
  const symbols = [...getWatchlistSymbols()];
  const bySymbol = new Map(ACTIVE_DATA.companies.map((c) => [c.symbol, c]));
  const isEn = document.documentElement.lang === "en";

  if (symbols.length === 0) {
    const empty = document.createElement("div");
    empty.className = "watchlist-sheet-empty";
    empty.textContent = isEn ? "No favorites yet. Tap the ★ on a stock to add it." : "즐겨찾기한 종목이 없습니다. 종목 상세에서 ★을 눌러 추가해보세요.";
    watchlistSheetList.appendChild(empty);
  } else {
    for (const symbol of symbols) {
      const c = bySymbol.get(symbol);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "watchlist-sheet-row";

      if (c && !BAD_LOGO_SYMBOLS.has(symbol)) {
        const img = document.createElement("img");
        img.className = "watchlist-sheet-row-logo";
        img.loading = "lazy";
        img.alt = symbol;
        img.src = logoUrl(symbol, "low");
        img.addEventListener("error", () => {
          img.style.display = "none";
        });
        row.appendChild(img);
      }

      const nameWrap = document.createElement("div");
      nameWrap.className = "watchlist-sheet-row-name";
      const nameEl = document.createElement("b");
      nameEl.textContent = c ? c.name : symbol;
      const symEl = document.createElement("span");
      symEl.textContent = symbol;
      nameWrap.appendChild(nameEl);
      nameWrap.appendChild(symEl);
      row.appendChild(nameWrap);

      // 오른쪽: 현재가(위) + 등락률(아래) — 현재가는 실시간 시세를 비동기 조회해 채움
      const rightWrap = document.createElement("div");
      rightWrap.className = "watchlist-sheet-row-right";
      const priceEl = document.createElement("span");
      priceEl.className = "watchlist-sheet-row-price";
      priceEl.textContent = "…";
      const chgEl = document.createElement("span");
      chgEl.className = "watchlist-sheet-row-chg";
      const pct = c ? c.changePercent : null;
      if (pct === null || pct === undefined || Number.isNaN(pct)) {
        chgEl.textContent = "-";
        chgEl.style.color = "var(--text-mid)";
      } else {
        chgEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
        chgEl.style.color = changeColorForText(pct);
      }
      rightWrap.appendChild(priceEl);
      rightWrap.appendChild(chgEl);
      row.appendChild(rightWrap);

      const currency = symbol.endsWith(".KS") || symbol.endsWith(".KQ") ? "KRW" : "USD";
      fetchLiveQuoteForSheet(symbol)
        .then((q) => {
          priceEl.textContent = q && q.price !== null ? fmtSheetPrice(q.price, currency) : "-";
        })
        .catch(() => {
          priceEl.textContent = "-";
        });

      row.addEventListener("click", () => {
        closeWatchlistSheet();
        const leaf = findLeafBySymbol(symbol);
        if (leaf) zoomToNode(leaf);
        if (c) openCompanySheet(c);
      });

      watchlistSheetList.appendChild(row);
    }
  }

  watchlistSheet.classList.add("open");
}

document.getElementById("mapWatchlistBtn").addEventListener("click", () => {
  if (watchlistSheet.classList.contains("open")) closeWatchlistSheet();
  else openWatchlistSheet();
});
// 즐겨찾기는 오른쪽 슬라이드 드로어라 아래로 끌어내리기 대신 지도 탭/별 버튼 재클릭으로 닫음

document.querySelectorAll(".metric-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.metric;
    if (quickSheetKey === key && rangeSheet.classList.contains("open")) {
      closeRangeSheet();
      return;
    }
    openRangeSheet(key);
  });
});

// 칩마다 붙는 작은 ✕ — 필터가 걸려있을 때만 보이고, 누르면 그 지표 하나만 "전체"로 초기화(시트는 열지 않음)
document.querySelectorAll(".chip-reset").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    const key = el.dataset.metric;
    setFilterRange(key, getMetricDomain(key));
    quickSliderCtrl.refresh();
    panelControllers.forEach((ctrl) => ctrl.refresh());
  });
});

rangeSheetResetBtn.addEventListener("click", () => {
  if (!quickSheetKey || !METRICS[quickSheetKey].hasData) return;
  quickSliderCtrl.reset();
});

// ---------- 6-2) 전체 설정 패널 — 10개 지표를 한 화면에 쭉 늘어놓고 한번에 조절 ----------
const allFiltersBackdrop = document.getElementById("allFiltersBackdrop");
const allFiltersSheet = document.getElementById("allFiltersSheet");
const allFiltersBody = document.getElementById("allFiltersBody");

function buildAllFiltersPanel() {
  allFiltersBody.innerHTML = "";
  panelControllers = [];
  const metricButtons = [...document.querySelectorAll(".metric-chip")]; // 버튼 순서 = 패널에 나열할 순서
  for (const btn of metricButtons) {
    const key = btn.dataset.metric;
    const m = METRICS[key];

    const block = document.createElement("div");
    block.className = "filter-block";
    block.innerHTML = `
      <div class="filter-block-header">
        <span>${m.label}</span>
        <button type="button" class="filter-block-reset">전체</button>
      </div>
      <div class="range-slider">
        <div class="range-slider-track"></div>
        <div class="range-slider-fill"></div>
        <div class="range-slider-thumb" tabindex="0"></div>
        <div class="range-slider-thumb" tabindex="0"></div>
      </div>
      <div class="range-slider-labels"></div>
      <div class="filter-block-note">${noDataMessage(key, m)}</div>
    `;
    allFiltersBody.appendChild(block);
    const blockNote = block.querySelector(".filter-block-note");

    const ctrl = createSliderController(
      () => key,
      {
        slider: block.querySelector(".range-slider"),
        fill: block.querySelector(".range-slider-fill"),
        thumbMin: block.querySelectorAll(".range-slider-thumb")[0],
        thumbMax: block.querySelectorAll(".range-slider-thumb")[1],
        labels: block.querySelector(".range-slider-labels"),
      },
      (noData, mm) => {
        block.classList.toggle("no-data", noData);
        if (noData && mm) blockNote.textContent = noDataMessage(key, mm);
      }
    );
    ctrl.refresh();
    block.querySelector(".filter-block-reset").addEventListener("click", () => ctrl.reset());
    panelControllers.push(ctrl);
  }
}

function openAllFiltersPanel() {
  closeCompanySheet();
  closeRangeSheet();
  buildAllFiltersPanel();
  allFiltersBackdrop.classList.add("open");
  allFiltersSheet.classList.add("open");
}
function closeAllFiltersPanel() {
  allFiltersBackdrop.classList.remove("open");
  allFiltersSheet.classList.remove("open");
}
document.getElementById("allFiltersBtn").addEventListener("click", openAllFiltersPanel);
document.getElementById("allFiltersCloseBtn").addEventListener("click", closeAllFiltersPanel);
allFiltersBackdrop.addEventListener("click", closeAllFiltersPanel);

// ---------- 7) 상승률·하락률·인기종목 실시간 갱신 ----------
// 브라우저에서 직접 Yahoo Finance로 요청하면 CORS에 막히므로, 내투자닷컴 본체와 같은 방식으로
// 공개 CORS 프록시(corsproxy.io → 실패 시 allorigins)를 거쳐서 가져온다.
async function proxyFetchJson(targetUrl) {
  // corsproxy.io가 최근 이 도메인에서의 요청을 403으로 막는 경우가 잦아, 이미 안정적으로 쓰고 있는
  // 내투자 전용 Worker(CORS 중계) 프록시를 최우선으로 시도하고, 혹시 몰라 기존 공개 프록시들을 그다음 순서로 남겨둠
  const proxies = [
    (u) => "https://us-stock.yeop2ad.workers.dev/?url=" + encodeURIComponent(u),
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  ];
  let lastErr;
  for (const build of proxies) {
    try {
      const res = await fetch(build(targetUrl));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const LIVE_SECTOR_SCREENER_ID = {
  "Information Technology": "ms_technology",
  "Health Care": "ms_healthcare",
  Financials: "ms_financial_services",
  "Consumer Discretionary": "ms_consumer_cyclical",
  "Consumer Staples": "ms_consumer_defensive",
  "Communication Services": "ms_communication_services",
  Industrials: "ms_industrials",
  Energy: "ms_energy",
  Utilities: "ms_utilities",
  "Real Estate": "ms_real_estate",
  Materials: "ms_basic_materials",
};

async function fetchSectorScreenerLive(scrId) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=250`;
  const data = await proxyFetchJson(url);
  return (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
}

async function refreshLiveData() {
  const companyBySymbol = new Map(ACTIVE_DATA.companies.map((c) => [c.symbol, c]));
  const sectorIds = Object.values(LIVE_SECTOR_SCREENER_ID);
  let updated = 0;

  // 섹터 하나가 끝날 때마다 바로 반영 — 거래량(순위) 시트를 보고 있으면 "OO/500" 진행 숫자가 실시간으로 올라간다
  async function processSector(scrId) {
    const quotes = await fetchSectorScreenerLive(scrId).catch(() => null);
    if (!quotes) return;
    for (const q of quotes) {
      if (!q || !q.symbol) continue;
      let c = companyBySymbol.get(q.symbol) || companyBySymbol.get(q.symbol.replace("-", "."));
      if (!c) continue;
      if (typeof q.regularMarketChangePercent === "number") c.changePercent = q.regularMarketChangePercent;
      if (typeof q.regularMarketPrice === "number" && typeof q.regularMarketVolume === "number") {
        c.dollarVolume = q.regularMarketPrice * q.regularMarketVolume;
      }
      updated++;
    }
    if (METRICS.popularStocks) {
      METRICS.popularStocks.refreshRank();
      if (quickSheetKey === "popularStocks" && rangeSheet.classList.contains("no-data")) {
        rangeSheetNote.textContent = noDataMessage("popularStocks", METRICS.popularStocks);
      }
    }
  }

  let idx = 0;
  async function worker() {
    while (idx < sectorIds.length) {
      await processSector(sectorIds[idx++]);
    }
  }
  // 개별 종목들의 시각이 아니라 S&P500 지수(^GSPC) 자체의 실제 시각을 지도 시계 기준으로 씀 — 지수가 멈추면(장마감)
  // 시계도 그대로 멈추고, 본체 시장 위젯이 보여주는 S&P500 시각과 항상 일치하게 됨
  const [, indexAsOf] = await Promise.all([
    Promise.all(Array.from({ length: Math.min(3, sectorIds.length) }, worker)),
    fetchIndexAsOfTime("^GSPC"),
  ]);
  if (indexAsOf) lastDataAsOfTime = indexAsOf;

  if (updated === 0) return false; // 전부 실패(프록시 다운 등) — 정적 스냅샷 값 유지
  liveDataLoaded = true;
  refreshAllBubbleColors();
  // 상승률/하락률처럼 실시간으로 바뀌는 지표는 도메인 캐시를 지우고 다시 계산해야 함
  for (const key of ["changePct"]) {
    if (METRICS[key]) delete METRICS[key].domain;
  }
  applyAllFilters(); // 라이브 값이 바뀌었으니 지금 걸려있는 필터도 새 값 기준으로 재적용
  quickSliderCtrl.refresh(); // 빠른 시트가 라이브 지표를 보고 있었다면 눈금/썸 위치 갱신
  panelControllers.forEach((ctrl) => ctrl.refresh()); // 전체 설정 패널이 열려있었다면 해당 슬라이더들도 갱신
  return true;
}

// 국내(코스피200+코스닥150)는 Yahoo 스크리너가 없어 Worker(/kr-quotes, KR_FOMO_UNIVERSE 재사용 + 15분 캐시)가
// 대신 훑어둔 등락률 요약을 받아옴 — 해외의 refreshLiveData와 같은 "적용" 마무리 로직을 그대로 재사용
async function refreshDomesticLiveData() {
  try {
    const [res, indexAsOf] = await Promise.all([fetch("https://us-stock.yeop2ad.workers.dev/kr-quotes"), fetchIndexAsOfTime("^KS11")]);
    if (!res.ok) return false;
    const data = await res.json();
    const quotes = data && data.quotes;
    if (!quotes) return false;
    const companyBySymbol = new Map(ACTIVE_DATA.companies.map((c) => [c.symbol, c]));
    let updated = 0;
    for (const [symbol, chg] of Object.entries(quotes)) {
      const c = companyBySymbol.get(symbol);
      if (!c) continue;
      c.changePercent = chg;
      updated++;
    }
    if (updated === 0) return false;
    liveDataLoaded = true;
    // 개별 종목이 아니라 코스피 지수(^KS11) 자체의 실제 시각을 지도 시계 기준으로 씀 — 코스피가 멈추면(장마감) 시계도 그대로 멈춤
    if (indexAsOf) lastDataAsOfTime = indexAsOf;
    refreshAllBubbleColors();
    for (const key of ["changePct"]) {
      if (METRICS[key]) delete METRICS[key].domain;
    }
    applyAllFilters();
    quickSliderCtrl.refresh();
    panelControllers.forEach((ctrl) => ctrl.refresh());
    return true;
  } catch {
    return false;
  }
}

// 미국 증시 운영시간(평일 09:30~16:00 ET) 간단 근사치 — 공휴일 캘린더는 반영하지 않음
function isUsMarketOpen() {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 9 * 60 + 30 && mins <= 16 * 60;
}

// 임의의 순간(Date)을 "한국시간(Asia/Seoul) 벽시계 기준" 연/월/일/시/분/초 문자열로 쪼갬 — 지도 시계는
// 보는 사람의 브라우저 시간대와 무관하게 항상 한국시간으로 표시해야 하므로, 로컬 getHours() 등을 쓰지 않고 이 함수로 통일
function fmtKstParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  if (m.hour === "24") m.hour = "00"; // 일부 브라우저는 자정을 24시로 표기하므로 00시로 정규화
  return m;
}
// tz(예: "America/New_York")의 특정 날짜/시각(그 거래소 현지 벽시계 기준)을 실제 UTC 순간(Date)으로 정확히 환산
// — DST 여부까지 반영하기 위해 "그 순간을 tz로 표시하면 어떻게 보이는지"를 역산하는 방식(라이브러리 없이 처리)
function zonedWallTimeToUtc(tz, y, mo, d, hh, mi) {
  const guessUtcMs = Date.UTC(y, mo, d, hh, mi, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guessUtcMs));
  const p = {};
  for (const part of parts) p[part.type] = part.value;
  if (p.hour === "24") p.hour = "00";
  const asZonedUtcMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offsetMs = asZonedUtcMs - guessUtcMs;
  return new Date(guessUtcMs - offsetMs);
}

// AI 버튼에 표시할 "색상이 언제 기준인지" — 오늘 안에 갱신됐으면 시:분:초(장중이면 주황), 날짜가 지났으면 월/일(빨강)
let lastColorRefreshAt = null;
// 실제 데이터 자체의 시각(해외: S&P500 지수 ^GSPC, 국내: 코스피 지수 ^KS11의 실제 regularMarketTime) — 지도 시계를
// "지금 몇 시니까 아마 이쯤이겠지" 식 추정이 아니라 본체 시장 위젯이 보여주는 지수와 동일한 시점으로 맞추는 데 씀
let lastDataAsOfTime = null;
const CLOCK_DELAY_MS = 20 * 60 * 1000; // 실제 데이터는 20분 지연 제공이므로, 지수의 실제 시각에서 20분을 빼서 "지금 보이는 색상이 몇 시 기준인지"를 보여줌
async function fetchIndexAsOfTime(indexSymbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(indexSymbol)}?range=5d&interval=1d`;
    const data = await proxyFetchJson(url);
    const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
    if (!meta || typeof meta.regularMarketTime !== "number") return null;
    return new Date(meta.regularMarketTime * 1000 - CLOCK_DELAY_MS);
  } catch {
    return null;
  }
}
// 실제 데이터는 20분 지연이므로 "지금 몇 시"가 아니라 "지금 보이는 색상이 몇 시 기준인지"(=지금-20분)를 보여줌.
// 장이 이미 끝났으면 그 이후로는 데이터가 더 안 들어오니 마감 시각에 고정하고 더 흘러가지 않게 함
function computeDelayedAsOfTime() {
  const isKr = ACTIVE_MARKET === "domestic";
  const tz = isKr ? "Asia/Seoul" : "America/New_York";
  const local = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const openMin = isKr ? 9 * 60 : 9 * 60 + 30;
  const closeMin = isKr ? 15 * 60 + 30 : 16 * 60;
  const nowMin = local.getHours() * 60 + local.getMinutes();
  const isWeekend = local.getDay() === 0 || local.getDay() === 6;
  const marketOpenNow = !isWeekend && nowMin >= openMin && nowMin <= closeMin;
  if (marketOpenNow) {
    // "지금"은 시간대와 무관한 절대 순간이므로 tz 보정 없이 그대로 20분만 빼면 됨
    return { time: new Date(Date.now() - 20 * 60 * 1000), isToday: true };
  }
  // 장 시작 전(프리마켓)이거나 마감 후, 주말이면 가장 최근 마감 시각에 고정 — 그 이후로는 새 데이터가 없으므로 시간이 흐를 필요 없음.
  // 그 마감 시각이 오늘이 아니라 어제(이전 거래일)라면 시:분:초 대신 날짜로 보여줌(renderAiFabTimestamp에서 처리)
  let y = local.getFullYear(), mo = local.getMonth(), d = local.getDate();
  let isToday = true;
  if (isWeekend || nowMin < openMin) {
    isToday = false;
    do {
      const prev = new Date(y, mo, d - 1);
      y = prev.getFullYear();
      mo = prev.getMonth();
      d = prev.getDate();
    } while (new Date(y, mo, d).getDay() === 0 || new Date(y, mo, d).getDay() === 6);
  }
  // 그 거래소 현지 벽시계 기준 마감 시각을 실제 UTC 순간으로 정확히 환산(DST 반영) — 이후 렌더링에서 한국시간으로 재변환해 보여줌
  const closeTime = zonedWallTimeToUtc(tz, y, mo, d, Math.floor(closeMin / 60), closeMin % 60);
  return { time: closeTime, isToday };
}

function renderAiFabTimestamp() {
  const timeEl = document.getElementById("aiFabTime");
  if (!timeEl) return;
  if (!lastColorRefreshAt) {
    timeEl.textContent = "연결중...";
    timeEl.className = "ai-fab";
    return;
  }
  const refreshedAt = new Date(lastColorRefreshAt);
  const now = new Date();
  // 표시는 항상 한국시간(Asia/Seoul) 기준 — 보는 사람 브라우저 시간대와 무관하게 동일하게 보이도록 로컬 getter 대신 fmtKstParts 사용
  const refreshedKst = fmtKstParts(refreshedAt);
  const nowKst = fmtKstParts(now);
  const sameDay = refreshedKst.year === nowKst.year && refreshedKst.month === nowKst.month && refreshedKst.day === nowKst.day;
  if (!sameDay) {
    // 오늘 안에 색상을 한 번도 못 받아온 경우(네트워크 실패 등)에만 마지막 성공 날짜를 경고로 표시
    timeEl.textContent = `${refreshedKst.month}/${refreshedKst.day}`;
    timeEl.className = "ai-fab ai-fab-time-stale";
    return;
  }
  const marketOpen = ACTIVE_MARKET === "domestic" ? isKrMarketOpen() : isUsMarketOpen();
  // 실제 데이터 자체의 시각이 있으면(정상 케이스) 그걸 그대로 씀 — 장 마감 후에도 본체 시장 위젯처럼 데이터가
  // 실제로 더 들어오는 만큼 시계도 따라 움직이고, 더 이상 안 들어오면 자연히 그 마지막 시각에 멈춰 있게 됨(가짜 고정 아님)
  let asOf, isToday;
  if (lastDataAsOfTime) {
    const p = fmtKstParts(lastDataAsOfTime);
    asOf = lastDataAsOfTime;
    isToday = p.year === nowKst.year && p.month === nowKst.month && p.day === nowKst.day;
  } else {
    ({ time: asOf, isToday } = computeDelayedAsOfTime());
  }
  const asOfKst = fmtKstParts(asOf);
  if (!isToday) {
    // 아직 오늘 장이 시작 전이라 직전 거래일 마감 시각에 고정된 상태 — 시:분:초 대신 그 날짜를 보여줌
    timeEl.textContent = `${asOfKst.month}/${asOfKst.day}`;
    timeEl.className = "ai-fab";
    return;
  }
  timeEl.textContent = `${asOfKst.hour}:${asOfKst.minute}:${asOfKst.second}`;
  timeEl.className = marketOpen ? "ai-fab ai-fab-time-live" : "ai-fab";
}

// 지도 색상/실시간 시세를 즉시 다시 불러오는 탭-투-리프레시 — 클래스명(ai-fab)만 남기고 실제 버튼 기능이 없던 문제 해결
let aiFabRefreshing = false;
document.getElementById("aiFabTime").addEventListener("click", async () => {
  if (aiFabRefreshing) return;
  aiFabRefreshing = true;
  try {
    await refreshActiveMarketLiveData();
  } finally {
    aiFabRefreshing = false;
  }
});

// 국내/해외 어느 쪽이 활성인지에 맞춰 알맞은 실시간 갱신 함수를 호출하고, 성공 시 AI 버튼의 갱신 시각을 함께 업데이트
async function refreshActiveMarketLiveData({ silent = false } = {}) {
  const ok = ACTIVE_MARKET === "domestic" ? await refreshDomesticLiveData() : await refreshLiveData();
  if (ok) {
    lastColorRefreshAt = Date.now();
    if (!silent) showToast("실시간 시세로 갱신됨");
  }
  renderAiFabTimestamp();
  return ok;
}

// 원 배경/테두리 색을 최신 changePercent 기준으로 다시 칠함(값 자체는 그대로 두고 색만 갱신)
function refreshAllBubbleColors() {
  for (const c of ACTIVE_DATA.companies) {
    const el = bubbleBySymbol.get(c.symbol);
    if (!el) continue;
    const chg = changeColor(c.changePercent);
    el.style.setProperty("--chg", chg.css);
    const glowStrength = Math.abs(chg.t);
    el.style.setProperty("--chg-glow", glowStrength > 0.08 ? `0 0 ${4 + glowStrength * 10}px ${chg.css}` : "");
  }
  refreshMarketIndexLabels(); // 상단 시장 이름 옆 평균 등락률도 최신 값으로
  // 지도 타일 색상이 새로 갱신될 때, 지금 상세시트가 열려서 보고 있는 종목이 있다면 그 시트의 현재가/등락률도 같이 최신화
  if (currentSheetSymbol) updateSheetLiveValues(currentSheetSymbol);
}

// ---------- 8) 국내/해외 전환 ----------
let packedRoot = null;

// 데이터셋은 그대로 두고 원 배치만 다시 계산해서 새로 그림(시총/균등 사이즈 전환, 국내/해외 전환 공용)
function rerenderMap(animate) {
  closeCompanySheet();
  closeRangeSheet();
  closeAllFiltersPanel();
  quickSheetKey = null;

  mapWorld.innerHTML = "";
  bubbleBySymbol.clear();

  packedRoot = buildPackedRoot(ACTIVE_DATA);
  renderMap(packedRoot);
  fitToViewport(!!animate);
  applyAllFilters(); // 균등/시총 전환처럼 데이터셋은 그대로인 경우, 새로 그려진 원에도 기존 필터를 다시 적용
  applyChangeModeToSectorBubbles(); // 등락 모드가 켜져 있었다면 새로 만든 섹터 원에도 채색·평균값을 다시 적용(시총/균등 가중 방식도 반영)
}

document.getElementById("sizeModeBtn").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  sizeMode = sizeMode === "equal" ? "marketCap" : "equal";
  btn.classList.toggle("active", sizeMode === "marketCap");
  rerenderMap(true);
});

// ---------- 상단 코스피/코스닥 + 섹터별 평균 등락률 요약 바(국내 모드 전용) + 상단 티커 테이프(국내/해외 공통) ----------
function escHtmlLocal(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 한국 증시 운영시간(평일 09:00~15:30, KST) 간단 근사치 — 공휴일 캘린더는 반영하지 않음
function isKrMarketOpen() {
  const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  if (day === 0 || day === 6) return false;
  const mins = kst.getHours() * 60 + kst.getMinutes();
  return mins >= 9 * 60 && mins <= 15 * 60 + 30;
}

// Yahoo 차트(최근 5거래일 일봉)에서 현재가/전일대비 등락을 뽑음 — 기존 refreshLiveData와 동일한 CORS 프록시 재사용
async function fetchYahooChartSnap(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const data = await proxyFetchJson(url);
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    if (!result) return null;
    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
    const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
    if (!pairs.length) return null;
    const latest = pairs[pairs.length - 1];
    const prevClose = pairs.length >= 2 ? pairs[pairs.length - 2].c : meta.chartPreviousClose ?? null;
    const price = meta.regularMarketPrice ?? latest.c;
    const change = prevClose !== null && prevClose !== undefined && price !== null && price !== undefined ? price - prevClose : null;
    const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;
    return { price, change, changePct };
  } catch {
    return null;
  }
}

function fmtIdxChg(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return { text: "-", cls: "" };
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(2)}%`, cls: pct >= 0 ? "idx-up" : "idx-down" };
}

// 지금 지도에 로드된 종목들의 changePercent(타일 색상과 동일한 소스)를 섹터별로 평균 — 별도 실시간 파이프라인을 새로 만들지 않고
// 이미 로드된 스냅샷을 그대로 집계하므로 타일 색상과 항상 일치함. 섹터 영어 키(sectorNode.data.name) 기준으로 바로 찾아 쓰도록 Map으로 반환
function computeSectorAverages() {
  const bySector = new Map();
  for (const c of ACTIVE_DATA.companies) {
    const sec = canonicalSector(c.sector);
    if (!bySector.has(sec)) bySector.set(sec, []);
    bySector.get(sec).push(c);
  }
  const result = new Map();
  bySector.forEach((list, sector) => {
    // 균등 모드: 단순 평균 / 시총 모드: 시총 가중 평균(섹터 전체 시총 대비 변동) — avgChangeOf가 sizeMode 따라 분기
    const avg = avgChangeOf(list);
    if (avg !== null) result.set(sector, avg);
  });
  return result;
}

// ---------- "등락" 버튼 — 누르면 섹터별 큰 원이 등락률에 따라 색이 채워지고 가운데 평균 등락률이 표시됨(+티커 테이프도 함께 토글) ----------
let changeModeOn = false;
function applyChangeModeToSectorBubbles() {
  const avgBySector = changeModeOn ? computeSectorAverages() : null;
  document.querySelectorAll(".sector-bubble").forEach((bubble) => {
    const changeEl = bubble.querySelector(".sector-bubble-change");
    if (!changeModeOn) {
      bubble.classList.remove("sector-bubble-filled");
      bubble.style.removeProperty("--chg-fill");
      if (changeEl) changeEl.textContent = "";
      return;
    }
    const avg = avgBySector.get(bubble.dataset.sector);
    const chg = changeColor(avg);
    bubble.classList.add("sector-bubble-filled");
    // 배경은 방향색의 은은한 틴트로만 깔고, 숫자는 진한 등락색으로 크게 — 같은 색 배경에 같은 색 글씨가 묻히지 않도록 분리
    const dirMax = chg.t >= 0 ? CHG_POS_MAX : CHG_NEG_MAX;
    const tint = mixRgb(CHG_BG, dirMax, Math.min(0.3, Math.abs(chg.t) * 0.3 + 0.08));
    bubble.style.setProperty("--chg-fill", `rgb(${tint.join(",")})`);
    if (changeEl) {
      changeEl.textContent = avg === undefined ? "N/A" : `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`;
      changeEl.style.color = avg === undefined ? "var(--text-mid)" : changeColorForText(avg);
    }
  });
}
function toggleChangeMode() {
  changeModeOn = !changeModeOn;
  document.getElementById("changeModeBtn").classList.toggle("active", changeModeOn);
  // 대표 종목 티커 테이프는 표시하지 않음(사용자 요청으로 제거) — 섹터 평균 등락 채색만 적용
  applyChangeModeToSectorBubbles();
}
document.getElementById("changeModeBtn").addEventListener("click", toggleChangeMode);

// ---------- 상단 티커 테이프 — 본체(app.js) 시장 위젯의 기본 8개 지수를 원형 배지+회색 종목명+가격+등락률로 자동 스크롤 표시 ----------
// 본체와 같은 localStorage 키를 읽어 종목 구성을 그대로 따라감(본체에서 위젯 종목을 바꾸면 이 테이프도 함께 바뀜).
// 다만 이 페이지엔 본체의 전체 지수/원자재/암호화폐 카탈로그를 중복 보관하지 않으므로, 이 표에 없는 종목으로
// 바꾼 경우엔 기본 8개로 안전하게 되돌아감
const MARKET_WIDGET_STORAGE_KEY = "market_widget_symbols_v1";
const TICKER_TAPE_ITEMS = {
  KOSPI: { symbol: "^KS11", icon: "🇰🇷", name: "코스피" },
  KOSDAQ: { symbol: "^KQ11", icon: "🇰🇷", name: "코스닥" },
  IXIC: { symbol: "^IXIC", icon: "🇺🇸", name: "나스닥 종합" },
  SPX: { symbol: "^GSPC", icon: "🇺🇸", name: "S&P 500" },
  GOLD: { symbol: "GC=F", icon: "🟨", name: "금(Gold)" },
  "USD/KRW": { symbol: "KRW=X", icon: "🇰🇷", name: "달러/원 환율" },
  DJI: { symbol: "^DJI", icon: "🇺🇸", name: "다우 종합" },
  RUT: { symbol: "^RUT", icon: "🇺🇸", name: "러셀 2000" },
};
const TICKER_TAPE_DEFAULT_ORDER = ["KOSPI", "KOSDAQ", "IXIC", "SPX", "GOLD", "USD/KRW", "DJI", "RUT"];

function getTickerTapeOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(MARKET_WIDGET_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === 8 && saved.every((t) => TICKER_TAPE_ITEMS[t])) return saved;
  } catch {
    // 저장된 값이 없거나 손상된 경우 기본 순서 사용
  }
  return TICKER_TAPE_DEFAULT_ORDER;
}

async function renderTickerTape() {
  const track = document.getElementById("tickerTapeTrack");
  if (!track) return;
  const order = getTickerTapeOrder();
  const snaps = await Promise.all(order.map((t) => fetchYahooChartSnap(TICKER_TAPE_ITEMS[t].symbol)));
  const cellsHtml = order
    .map((t, i) => {
      const item = TICKER_TAPE_ITEMS[t];
      const snap = snaps[i];
      const chg = fmtIdxChg(snap && snap.changePct);
      const priceTxt = snap && snap.price !== null && snap.price !== undefined ? snap.price.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "-";
      return `<span class="ticker-tape-item" data-ticker="${t}">
        <span class="ticker-tape-badge">${item.icon}</span>
        <span class="ticker-tape-name">${escHtmlLocal(item.name)}</span>
        <span class="ticker-tape-price">${priceTxt}</span>
        <span class="ticker-tape-chg ${chg.cls}">${chg.text}</span>
      </span>`;
    })
    .join("");
  // 콘텐츠를 두 벌 이어붙여야 이음매 없이 반복됨(절반 폭만큼 이동하면 처음과 똑같은 그림)
  track.innerHTML = cellsHtml + cellsHtml;
  tickerTapeHalfWidth = track.scrollWidth / 2;
  wrapTickerTapeOffset();
  applyTickerTapeTransform();
  startTickerTapeLoop();
}

// 자동 스크롤은 CSS 애니메이션이 아니라 JS(requestAnimationFrame)로 직접 translateX를 움직여서,
// 같은 offset 값을 손가락 드래그로도 그대로 이어받아 좌우로 밀어볼 수 있게 함(둘이 값을 공유)
let tickerTapeOffsetX = 0;
let tickerTapeHalfWidth = 0;
let tickerTapeDragging = false;
let tickerTapeDragStartX = 0;
let tickerTapeDragStartOffset = 0;
let tickerTapeDragMoved = 0;
let tickerTapeRafId = null;
let tickerTapeLastTs = null;

function applyTickerTapeTransform() {
  const track = document.getElementById("tickerTapeTrack");
  if (track) track.style.transform = `translateX(${tickerTapeOffsetX}px)`;
}
function wrapTickerTapeOffset() {
  if (!(tickerTapeHalfWidth > 0)) return;
  while (tickerTapeOffsetX <= -tickerTapeHalfWidth) tickerTapeOffsetX += tickerTapeHalfWidth;
  while (tickerTapeOffsetX > 0) tickerTapeOffsetX -= tickerTapeHalfWidth;
}
function tickerTapeTick(ts) {
  const tape = document.getElementById("tickerTape");
  if (!tape || tape.style.display === "none") {
    tickerTapeRafId = null;
    tickerTapeLastTs = null;
    return;
  }
  if (!tickerTapeDragging && tickerTapeHalfWidth > 0 && tickerTapeLastTs !== null) {
    const dt = (ts - tickerTapeLastTs) / 1000;
    const speedPxPerSec = tickerTapeHalfWidth / 32; // 기존 CSS 마퀴(32초에 절반 폭 이동)와 같은 속도
    tickerTapeOffsetX -= speedPxPerSec * dt;
    wrapTickerTapeOffset();
    applyTickerTapeTransform();
  }
  tickerTapeLastTs = ts;
  tickerTapeRafId = requestAnimationFrame(tickerTapeTick);
}
function startTickerTapeLoop() {
  if (tickerTapeRafId !== null) return;
  tickerTapeLastTs = null;
  tickerTapeRafId = requestAnimationFrame(tickerTapeTick);
}
// "등락" 버튼으로 티커 테이프가 다시 보일 때 — display:none이었던 동안엔 폭이 0으로 측정됐을 수 있어 다시 잼
function refreshTickerTapeVisibility() {
  requestAnimationFrame(() => {
    const track = document.getElementById("tickerTapeTrack");
    if (!track) return;
    tickerTapeHalfWidth = track.scrollWidth / 2;
    wrapTickerTapeOffset();
    startTickerTapeLoop();
  });
}

const tickerTapeEl = document.getElementById("tickerTape");
const tickerTapeTrackEl = document.getElementById("tickerTapeTrack");
if (tickerTapeEl && tickerTapeTrackEl) {
  tickerTapeEl.style.touchAction = "pan-y"; // 세로 스크롤은 페이지에 맡기고 가로 드래그만 직접 처리
  tickerTapeEl.addEventListener("pointerdown", (e) => {
    tickerTapeDragging = true;
    tickerTapeDragStartX = e.clientX;
    tickerTapeDragStartOffset = tickerTapeOffsetX;
    tickerTapeDragMoved = 0;
    tickerTapeEl.classList.add("dragging");
    try { tickerTapeEl.setPointerCapture(e.pointerId); } catch {}
  });
  tickerTapeEl.addEventListener("pointermove", (e) => {
    if (!tickerTapeDragging) return;
    const delta = e.clientX - tickerTapeDragStartX;
    tickerTapeDragMoved = Math.abs(delta);
    tickerTapeOffsetX = tickerTapeDragStartOffset + delta;
    wrapTickerTapeOffset();
    applyTickerTapeTransform();
  });
  const endTickerTapeDrag = (e) => {
    if (!tickerTapeDragging) return;
    tickerTapeDragging = false;
    tickerTapeEl.classList.remove("dragging");
    try { tickerTapeEl.releasePointerCapture(e.pointerId); } catch {}
  };
  tickerTapeEl.addEventListener("pointerup", endTickerTapeDrag);
  tickerTapeEl.addEventListener("pointercancel", endTickerTapeDrag);
  tickerTapeTrackEl.addEventListener("click", (e) => {
    if (tickerTapeDragMoved > 6) return; // 드래그였으면 클릭(이동) 무시 — 손가락을 뗀 위치의 종목으로 안 튀도록
    if (e.target.closest(".ticker-tape-item")) goToMainSite("market");
  });
}

function loadMarket(mode, animate) {
  ACTIVE_MARKET = mode;
  updateActiveDataForUniverseState();
  METRICS = buildMetrics(mode);
  activeFilters.clear(); // 시장이 바뀌면 종목 구성 자체가 달라지므로 필터는 초기화
  document.querySelector(".top-bar").classList.toggle("is-overseas", mode === "overseas");
  updateUniverseToggleBtn();

  rerenderMap(animate);
  applyChangeModeToSectorBubbles(); // rerenderMap이 섹터 원을 새로 만들므로 등락 모드가 켜져 있었다면 채색도 다시 적용

  // 자동 로드(첫 접속·시장 전환)는 조용히 갱신 — "실시간 시세로 갱신됨" 토스트는 시계를 직접 눌렀을 때만
  refreshActiveMarketLiveData({ silent: true }).catch(() => {});
  scheduleInactiveMarketPreload(); // 시장 전환 시에도 방금 떠난 쪽 로고를 한가할 때 다시 캐시해둠(다음에 돌아왔을 때 즉시 뜨도록)
}

// 20분 지연 표시에 맞춰 5분마다 조용히(토스트 없이) 색상을 다시 갱신 — 페이지를 오래 켜둬도 계속 최신에 가깝게 유지됨
setInterval(() => {
  refreshActiveMarketLiveData({ silent: true })
    .catch(() => {})
    .then(() => applyChangeModeToSectorBubbles());
}, 5 * 60 * 1000);
// AI 버튼 시각 표시는 매초 새로고침(장중 HH:MM:SS가 실시간으로 흐르는 것처럼 보이게)
setInterval(renderAiFabTimestamp, 1000);

document.getElementById("marketTogglePill").addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  const mode = btn.dataset.market;
  if (mode === ACTIVE_MARKET) return;
  if (mode === "domestic" && (typeof KR_CORE_DATA === "undefined" || !KR_CORE_DATA.companies || !KR_CORE_DATA.companies.length)) {
    showToast("국내 섹터맵 데이터를 아직 못 불러왔어요");
    return;
  }
  document.querySelectorAll("#marketTogglePill .toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadMarket(mode, true);
});

// 본체(내투자닷컴)로 돌아가기 — 세션 동안은 다시 섹터맵으로 안 튕기도록 플래그를 남김
function goToMainSite(openPanel) {
  try {
    sessionStorage.setItem("ntj_skip_map_redirect", "1");
  } catch {}
  window.location.href = openPanel ? `../index.html?open=${openPanel}` : "../index.html";
}
document.getElementById("mapSearchBtn").addEventListener("click", () => goToMainSite("search"));
document.getElementById("bottomNavSearchBtn2").addEventListener("click", () => goToMainSite("wizard"));
document.getElementById("bottomNavMarketBtn2").addEventListener("click", () => goToMainSite("market"));
document.getElementById("bottomNavMoreBtn2").addEventListener("click", () => goToMainSite("more"));

// ---------- 초기화 ----------
window.addEventListener("resize", () => fitToViewport(false));

// 내투자닷컴 첫 화면에서 넘어온 경우 ?market=domestic 으로 국내를 기본값으로 염(데이터 없으면 해외로 대체)
const requestedMarket = new URLSearchParams(window.location.search).get("market");
const initialMarket =
  requestedMarket === "domestic" && typeof KR_CORE_DATA !== "undefined" && KR_CORE_DATA.companies && KR_CORE_DATA.companies.length
    ? "domestic"
    : "overseas";
document.querySelectorAll("#marketTogglePill .toggle-btn").forEach((b) => {
  b.classList.toggle("active", b.dataset.market === initialMarket);
});
loadMarket(initialMarket, false);
renderTickerTape().catch(() => {});
loadingIndicator.classList.add("hidden");
// 지도 자체 첫 렌더(원 배치까지)가 끝났으므로 본체 첫 화면과 같은 전체화면 스플래시를 내림 —
// 실시간 시세/색상은 loadMarket 내부에서 이어서 비동기로 불러오지만, 스플래시까지 그걸 기다리진 않음(본체와 동일한 패턴)
const mapLoadingSplashEl = document.getElementById("mapLoadingSplash");
if (mapLoadingSplashEl) mapLoadingSplashEl.style.display = "none";

// 국내/해외 전환 시 로고가 다시 느리게 뜨지 않도록 반대쪽 시장 로고를 미리 캐시에 받아둔다.
// 예전엔 접속 즉시 양쪽 시장 850개를 전부 한꺼번에 요청해서, 지금 보고 있는 시장(각 종목 <img loading="lazy">가
// 이미 알아서 불러오는 중인)의 로고 요청과 대역폭을 놓고 경쟁하는 게 첫 화면 체감 속도 저하의 원인이었음(성능 관찰 기록).
// 지금 보고 있는 시장은 건너뛰고(중복 요청 방지), 반대쪽 시장만, 그것도 메인 스레드가 한가해진 뒤 작은 묶음으로
// 나눠서 조용히 받아온다 — "지금 보고 있는 구역"의 실시간 로고 요청이 항상 우선되도록.
function preloadInactiveMarketLogos() {
  // 반대쪽 시장도 core만 미리 캐시(전체 유니버스까지 미리 받으면 "+전체보기"를 늦게 불러오려는 취지와 어긋남) —
  // 반대쪽에서 나중에 "+전체보기"를 누르면 그때는 어차피 extra 데이터 자체를 새로 받아와야 하므로 로고도 그때 받는다
  const inactiveMarket = ACTIVE_MARKET === "domestic" ? "overseas" : "domestic";
  const activeSymbols = new Set((ACTIVE_DATA && ACTIVE_DATA.companies ? ACTIVE_DATA.companies : []).map((c) => c.symbol));
  const inactiveDataset = coreDataFor(inactiveMarket);
  if (!inactiveDataset || !inactiveDataset.companies) return;
  const symbols = inactiveDataset.companies
    .map((c) => c.symbol)
    .filter((symbol) => !activeSymbols.has(symbol) && !BAD_LOGO_SYMBOLS.has(symbol));

  const BATCH_SIZE = 20;
  const BATCH_DELAY_MS = 120;
  let i = 0;
  function loadNextBatch() {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    batch.forEach((symbol) => {
      const img = new Image();
      img.src = logoUrl(symbol, "low");
    });
    i += BATCH_SIZE;
    if (i < symbols.length) setTimeout(loadNextBatch, BATCH_DELAY_MS);
  }
  loadNextBatch();
}
function scheduleInactiveMarketPreload() {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(preloadInactiveMarketLogos, { timeout: 4000 });
  } else {
    setTimeout(preloadInactiveMarketLogos, 2000);
  }
}
// loadMarket()이 초기 로드 + 시장 전환 시마다 이 함수를 호출하므로 여기서 별도로 또 부르지 않음
