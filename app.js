// ===== 미국 기업 분석기 (API 키 불필요 버전) =====
// 데이터 소스: Yahoo Finance 비공식 엔드포인트(공개 CORS 프록시 경유) + Wikipedia(공식 CORS 지원)
// 주의: 비공식 API이므로 언제든 응답 형식이 바뀌거나 차단될 수 있습니다.

const el = (id) => document.getElementById(id);

// PWA로 홈 화면에 설치 가능하게(앱스토어 등록 없이) 서비스워커 등록 — 캐싱 없이 통과만 시키는 최소 워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

function svgIcon(inner) {
  return `<svg class="btn-icon-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const ICONS = {
  star: svgIcon(`<path fill="currentColor" stroke="none" d="M12 2.7l2.85 6.02 6.65.68-4.98 4.5 1.46 6.53L12 17.9l-5.98 3.53 1.46-6.53-4.98-4.5 6.65-.68L12 2.7z"/>`),
  search: svgIcon(`<circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15.2" y2="15.2"/>`),
  "trending-up": svgIcon(`<path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/>`),
  "trending-down": svgIcon(`<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>`),
  flame: svgIcon(`<path fill="currentColor" stroke="none" d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"/>`),
  barrel: svgIcon(`<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M6 9h12M6 15h12"/>`),
  exchange: svgIcon(`<path d="M4 8h13l-3-3M17 8l-3 3"/><path d="M20 16H7l3-3M7 16l3 3"/>`),
  coin: svgIcon(`<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c0-1.2 1.2-2 2.5-2s2.5.7 2.5 1.8-1.2 1.5-2.5 1.5-2.5.6-2.5 1.7 1.2 1.8 2.5 1.8 2.5-.7 2.5-1.8"/>`),
  scroll: svgIcon(`<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>`),
  bank: svgIcon(`<path d="M4 10l8-5 8 5"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18"/>`),
  trophy: svgIcon(`<path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 4.5H5.5a2.5 2.5 0 0 0 2.5 4M16 4.5h2.5a2.5 2.5 0 0 1-2.5 4"/><path d="M12 13v3M9 20h6M10 20l.5-3h3l.5 3"/>`),
  flask: svgIcon(`<path d="M10 3h4v5l4 9a2 2 0 0 1-2 3H8a2 2 0 0 1-2-3l4-9V3Z"/><path d="M9 3h6"/>`),
  calendar: svgIcon(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`),
  newspaper: svgIcon(`<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 8h6M7.5 12h9M7.5 16h9"/>`),
  rocket: svgIcon(
    `<path d="M12 2c2.5 2 4 5.5 4 9 0 2-1 4-2 5v3l-2-1-2 1v-3c-1-1-2-3-2-5 0-3.5 1.5-7 4-9Z"/><circle cx="12" cy="10" r="1.4" fill="currentColor" stroke="none"/><path d="M9 16l-2 4M15 16l2 4"/>`
  ),
  wallet: svgIcon(`<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>`),
  dollar: svgIcon(`<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`),
  calculator: svgIcon(
    `<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="7.5" y="5.5" width="9" height="3.5" rx="0.5"/><path stroke-width="2.6" d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>`
  ),
  scale: svgIcon(`<path d="M12 3v17"/><path d="M6 7h12"/><path d="M6 7l-3 6a3 3 0 0 0 6 0L6 7Z"/><path d="M18 7l-3 6a3 3 0 0 0 6 0l-3-6Z"/><path d="M8 20h8"/>`),
  medal: svgIcon(`<circle cx="12" cy="15" r="5"/><path d="M9.5 10.5 7 4M14.5 10.5 17 4"/>`),
  building: svgIcon(`<path d="M5 21V9l7-5 7 5v12"/><path d="M3 21h18M9 21v-6h6v6"/>`),
  thumbsup: svgIcon(`<path d="M7 10v10H4V10h3Z"/><path d="M7 10l3-6a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.3 6A2 2 0 0 1 16.2 20H9a2 2 0 0 1-2-2v-8Z"/>`),
  basket: svgIcon(`<path d="M4 9h16l-2 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L4 9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>`),
  dart: svgIcon(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>`),
};
function iconHtml(name) {
  return ICONS[name] || "";
}
function mountIcons() {
  document.querySelectorAll("[data-icon]").forEach((iconEl) => {
    iconEl.innerHTML = iconHtml(iconEl.dataset.icon);
  });
}
mountIcons();

const tickerInput = el("tickerInput");
const tickerSuggest = el("tickerSuggest");
const analyzeBtn = el("analyzeBtn");
const searchOpenBtn = el("searchOpenBtn");
const searchOverlay = el("searchOverlay");
const searchOverlayCloseBtn = el("searchOverlayCloseBtn");
const recentSearchList = el("recentSearchList");
const popularSearchList = el("popularSearchList");
const groundOpenBtn = el("groundOpenBtn");
const groundModal = el("groundModal");
const groundModalCloseBtn = el("groundModalCloseBtn");
const groundBody = el("groundBody");
const groundShareOpenBtn = el("groundShareOpenBtn");
const shareSheet = el("shareSheet");
const shareSheetBackdrop = el("shareSheetBackdrop");
const shareSheetCloseBtn = el("shareSheetCloseBtn");
const shareKakaoBtn = el("shareKakaoBtn");
const shareInstaBtn = el("shareInstaBtn");
const shareSaveBtn = el("shareSaveBtn");
const statusBox = el("statusBox");
const results = el("results");
const fixedHeader = el("fixedHeader");
const loadingSplash = el("loadingSplash");
const carouselViewport = el("carouselViewport");
const historicalStatus = el("historicalStatus");
const historicalResults = el("historicalResults");
const historicalFullUpBtn = el("historicalFullUpBtn");
const historicalFullDownBtn = el("historicalFullDownBtn");
const historicalMonthUpBtn = el("historicalMonthUpBtn");
const historicalMonthDownBtn = el("historicalMonthDownBtn");
const historicalInlineWrap = el("historicalInlineWrap");
const futureInlineWrap = el("futureInlineWrap");
const sReportInlineWrap = el("sReportInlineWrap");
// 개요 "😱 공포지수"(코인은 알트시즌지수) 버튼으로 여닫는 자리(2026-09-15) — 옛 invest점수 탭의 공포지수 섹션
// 12개월 승률 카드 자리(2026-09-13) — 2026-09-15부터는 "🕰️ 과거분석" 버튼이 이 카드를 연다
const oxInlineWrap = document.createElement("div");
oxInlineWrap.id = "oxInlineWrap";
oxInlineWrap.style.display = "none";
const valuationStatus = el("valuationStatus");
const valuationResults = el("valuationResults");
const trendStatus = el("trendStatus");
const trendResults = el("trendResults");
const futureStatus = el("futureStatus");
// 차트보기 버튼 클릭 시 새 탭 대신 앱 내 전체화면 모달로 TradingView 차트를 띄움(여러 곳에서 동적으로 삽입되므로 이벤트 위임 사용)
el("chartModalCloseBtn").addEventListener("click", closeChartModal);
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".chart-link-btn");
  if (!linkEl) return;
  e.preventDefault();
  openChartModal(linkEl.dataset.chartSymbol);
});
// 순위표의 가격(price-chart-link) 클릭은 TradingView 모달 대신 종목 검색상세로 바로 이동(2026-09-03 사용자 요청)
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".price-chart-link");
  if (!linkEl) return;
  e.preventDefault();
  navigateToTicker(linkEl.dataset.chartSymbol);
});
// "+자세히" 버튼(SURGE_WARNING_LEGEND, 여러 화면에 동적으로 삽입됨)은 위임 방식으로 클릭 감지
document.addEventListener("click", (e) => {
  if (!e.target.closest("#scoreMethodDetailBtn")) return;
  openScoreMethodModal();
});
el("scoreMethodModalCloseBtn").addEventListener("click", () => {
  el("scoreMethodModal").style.display = "none";
});
// 검은 가로 스크롤 차트(미래예측/투자안정 분포/공포지수)는 열 때 가장 최근 데이터(오른쪽 끝)부터 보이게(2026-08-31 사용자 요청).
// 펼침 애니메이션·후속 렌더로 레이아웃이 늦게 잡히는 경우가 있어 rAF 직후와 잠시 뒤 두 번 더 재시도
function scrollChartToRight(container) {
  if (!container) return;
  const go = () => {
    container.scrollLeft = container.scrollWidth;
  };
  requestAnimationFrame(go);
  setTimeout(go, 150);
  setTimeout(go, 450);
}
// 데이터 프록시 Worker 주소 — /search-popular, /search-log, /m2-yoy 등에서 사용
const AUTH_ORIGIN = "https://us-stock.yeop2ad.workers.dev";

// ---------- CORS 프록시 (여러 개를 순서대로 시도) ----------
// 직접 만든 Cloudflare Worker(우리 서버)를 최우선으로 사용 — 야후 파이낸스는 빠르고 안정적으로 중계되지만,
// FRED(fred.stlouisfed.org)는 그 사이트가 Cloudflare Workers발 요청 자체를 막고 있어(520) 실패하며,
// 이 경우 아래 jina.ai로 자동 폴백되어 FRED는 계속 정상 작동한다.
// corsproxy.io는 "localhost/개발 환경"이 아닌 실제 도메인(예: 커스텀 도메인)에서의 무료 사용을 막는다.
// jina.ai는 공유 인프라 부하에 따라 응답 속도 편차가 매우 커서(수백ms~20초 이상), 한 요청이 오래 걸리면
// 포기하고 재시도/다음 프록시로 넘어가도록 요청마다 제한 시간을 둔다.
const PROXY_TIMEOUT_MS = 7000;
// own-worker는 평소 1초 미만으로 응답하므로, 막히면(아마 버스트 시 Yahoo/Cloudflare 쪽 순간 속도 제한)
// 굳이 오래 기다리지 말고 훨씬 짧은 시간 안에 포기하고 다음 프록시로 넘어가는 게 더 빠름
const OWN_WORKER_TIMEOUT_MS = 2500;

const PROXIES = [
  {
    name: "own-worker",
    fetch: async (targetUrl) => {
      const res = await fetch("https://us-stock.yeop2ad.workers.dev/?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(OWN_WORKER_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  {
    name: "jina",
    fetch: async (targetUrl) => {
      // X-Return-Format: text 로 요청하면 markdown 변환 과정을 건너뛰고 원본을 그대로 반환해 더 빠르고 파싱도 단순해짐
      const res = await fetch("https://r.jina.ai/" + targetUrl, {
        headers: { "X-Return-Format": "text" },
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // 혹시 래핑된 형식으로 오면 예전 방식으로 한 번 더 시도
        const marker = "Markdown Content:\n";
        const idx = text.indexOf(marker);
        return JSON.parse(idx !== -1 ? text.slice(idx + marker.length) : text);
      }
    },
  },
  {
    name: "corsproxy.io",
    fetch: async (targetUrl) => {
      const res = await fetch("https://corsproxy.io/?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  {
    name: "allorigins",
    fetch: async (targetUrl) => {
      const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 프록시가 일시적으로 요청량 제한에 걸릴 수 있어, 전체 프록시를 한 바퀴 실패하면 잠깐 쉬었다 한 번 더 시도
// 2026-10-22 속도 개선: 같은 주소를 동시에/짧은 시간에 여러 번 요청하던 것(검색상세 열 때 AAPL 1년 차트가 4번 중복)을 한 번만 받고 나눠 씀(60초)
const PROXY_JSON_CACHE = new Map();
function proxyFetchJson(targetUrl, retries = 1) {
  const hit = PROXY_JSON_CACHE.get(targetUrl);
  if (hit && Date.now() - hit.t < 60000) return hit.p.then((v) => (typeof structuredClone === "function" ? structuredClone(v) : v));
  const p = proxyFetchJsonRaw(targetUrl, retries);
  PROXY_JSON_CACHE.set(targetUrl, { t: Date.now(), p });
  p.catch(() => PROXY_JSON_CACHE.delete(targetUrl));
  if (PROXY_JSON_CACHE.size > 200) PROXY_JSON_CACHE.delete(PROXY_JSON_CACHE.keys().next().value);
  return p.then((v) => (typeof structuredClone === "function" ? structuredClone(v) : v));
}
async function proxyFetchJsonRaw(targetUrl, retries = 1) {
  let lastErr;
  for (const proxy of PROXIES) {
    try {
      return await proxy.fetch(targetUrl);
    } catch (e) {
      lastErr = e;
    }
  }
  if (retries > 0) {
    await sleep(1200);
    return proxyFetchJsonRaw(targetUrl, retries - 1);
  }
  throw new Error("데이터 소스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요. (" + (lastErr?.message || "") + ")");
}

// JSON이 아닌 원문 텍스트(RSS/XML 등)를 프록시로 받아오는 헬퍼 — 국내 종목 뉴스(구글 뉴스 RSS)용
async function proxyFetchText(targetUrl) {
  const attempts = [
    () => fetch("https://us-stock.yeop2ad.workers.dev/?url=" + encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) }),
    () => fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) }),
    () => fetch("https://corsproxy.io/?url=" + encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) }),
  ];
  let lastErr;
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error("데이터 소스에 연결하지 못했습니다. (" + (lastErr?.message || "") + ")");
}

// 국내 종목 주요 뉴스 — Yahoo search의 뉴스는 국내 티커(005930.KS 등)에서 해당 기업과 무관한 기사가 섞여
// 나오는 문제가 있어(2026-09-01 사용자 확인), 한글 회사명으로 뉴스 RSS를 검색해 그 기업 기사만 가져온다.
// 1순위 구글 뉴스(기사 수·품질 최상이지만 Cloudflare 워커 IP를 구글이 차단하는 경우가 있음) → 2순위 Bing 뉴스 폴백
function rssItemText(it, tag) {
  const n = it.querySelector(tag);
  return n ? n.textContent.trim() : "";
}
function rssPubTime(it) {
  const pub = new Date(rssItemText(it, "pubDate"));
  return isNaN(pub.getTime()) ? null : Math.floor(pub.getTime() / 1000);
}
async function fetchGoogleNewsRss(koName) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${koName}"`)}&hl=ko&gl=KR&ceid=KR:ko`;
  const xml = await proxyFetchText(url);
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return [...doc.querySelectorAll("item")].map((it) => {
    const publisher = rssItemText(it, "source");
    let title = rssItemText(it, "title");
    // 구글 뉴스 제목은 "기사제목 - 언론사" 형태라 언론사 접미사는 출처 줄과 겹쳐 잘라냄(간혹 두 번 붙는 기사도 있음)
    while (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3));
    return {
      title,
      link: rssItemText(it, "link"),
      providerPublishTime: rssPubTime(it),
      publisher,
      isKorean: true, // renderNews에서 자동번역·원문 표기를 건너뛰기 위한 표시
    };
  });
}
async function fetchBingNewsRss(koName) {
  // 따옴표를 붙이면 결과가 2~3건으로 확 줄어 미사용(구글과 달리 회사명 단독 검색도 관련 기사 위주로 나옴)
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(koName)}&format=RSS&mkt=ko-KR&setlang=ko`;
  const xml = await proxyFetchText(url);
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return [...doc.querySelectorAll("item")].map((it) => {
    const link = rssItemText(it, "link");
    // Bing RSS엔 언론사 태그가 없어, 리다이렉트 링크(url 파라미터)의 원문 도메인을 출처로 표시
    let publisher = "";
    try {
      const inner = new URL(link).searchParams.get("url");
      if (inner) publisher = new URL(inner).hostname.replace(/^www\./, "");
    } catch {}
    return {
      title: rssItemText(it, "title"),
      link,
      providerPublishTime: rssPubTime(it),
      publisher,
      isKorean: true,
    };
  });
}
async function fetchKrCompanyNews(koName) {
  try {
    const items = await fetchGoogleNewsRss(koName);
    if (items.length) return items;
  } catch {}
  return fetchBingNewsRss(koName);
}

// ---------- Yahoo Finance 헬퍼 ----------
async function yahooSearch(ticker) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=20&quotesCount=1`;
  return proxyFetchJson(url);
}

async function yahooChart(symbol, range = "1y", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  return proxyFetchJson(url);
}

// range 대신 정확한 기간(period1~period2, 유닉스초)을 지정 — 미래예측 차트처럼 여러 해의 구간을 서로 어긋남 없이
// 정확한 실제 날짜 기준으로 겹쳐 그려야 할 때, range 프리셋의 간격 근사치에 의존하지 않기 위해 사용
async function yahooChartRange(symbol, period1, period2, interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;
  return proxyFetchJson(url);
}

// 과거 배당 지급 이력(chart의 events=div) — 캘린더에서 다음 배당락일을 주기 기반으로 근사 추정하는 데 사용
async function yahooDividends(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&events=div`;
  return proxyFetchJson(url);
}

async function yahooFundamentals(symbol, types) {
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 3600;
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${fiveYearsAgo}&period2=${now}`;
  return proxyFetchJson(url);
}

async function yahooScreener(scrId, count = 50) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=${count}`;
  return proxyFetchJson(url);
}

// Yahoo 검색 결과의 sector(영문)를 섹터별 예약 스크리너 ID로 매핑 — 경쟁사(동일 섹터) 후보 조회용
const SECTOR_SCREENER_ID = {
  Technology: "ms_technology",
  Healthcare: "ms_healthcare",
  "Financial Services": "ms_financial_services",
  "Consumer Cyclical": "ms_consumer_cyclical",
  "Consumer Defensive": "ms_consumer_defensive",
  "Communication Services": "ms_communication_services",
  Industrials: "ms_industrials",
  Energy: "ms_energy",
  Utilities: "ms_utilities",
  "Real Estate": "ms_real_estate",
  "Basic Materials": "ms_basic_materials",
};

// GICS 11개 섹터(영문) → 한글 표기 — 요약 섹션의 "섹터" 항목용(고정된 11개라 정적 매핑으로 정확하게 표시)
const SECTOR_KO = {
  Technology: "기술",
  Healthcare: "헬스케어",
  "Financial Services": "금융",
  "Consumer Cyclical": "경기소비재",
  "Consumer Defensive": "필수소비재",
  "Communication Services": "커뮤니케이션 서비스",
  Industrials: "산업재",
  Energy: "에너지",
  Utilities: "유틸리티",
  "Real Estate": "부동산",
  "Basic Materials": "소재",
};

// ---------- FRED(세인트루이스 연은) 헬퍼 : 내부 차트 API를 프록시로 조회 (비공식, 문서화되지 않음) ----------
async function fetchFredSeries(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/api/series/?id=${encodeURIComponent(seriesId)}&obs=true`;
  const data = await proxyFetchJson(url);
  const line = data && data.observations && data.observations[0];
  if (!line) throw new Error(`${seriesId} 데이터를 가져오지 못했습니다.`);
  return line.filter((p) => p[1] !== null && p[1] !== undefined);
}

// 종목과 무관한 데이터라 세션 내에서 한 번만 조회해 재사용(무거운 응답이라 재요청을 줄임)
let macroMetricsPromise = null;
function getMacroMetrics() {
  if (!macroMetricsPromise) {
    macroMetricsPromise = (async () => {
      // FRED(세인트루이스 연은) CBOE Volatility Index: VIX(VIXCLS) 시리즈를 그대로 사용(야후 ^VIX 대신)
      const points = await fetchFredSeries("VIXCLS");
      const snap = fredSnapshot(points);
      if (!snap || snap.price === null || snap.price === undefined) throw new Error("VIX 데이터를 가져오지 못했습니다.");
      return {
        vix: snap.price,
        vixChangePct: snap.changePct,
        vixDate: snap.date,
      };
    })().catch((e) => {
      macroMetricsPromise = null; // 실패 시 다음 조회에서 재시도할 수 있도록 캐시 초기화
      throw e;
    });
  }
  return macroMetricsPromise;
}

// ---------- 포모지수 — 국내(KR) 종목의 "공포지수" 자리에 VIX 대신 쓰는 자체 개발 지표 ----------
// 공식: (코스피200+코스닥150 약 350종목 중 52주 신고가 종목수/전체) - (52주 신저가 종목수/전체)
// 값이 클수록(신고가 종목이 몰림) 시장 과열(FOMO, 고점 경신 쏠림), 작을수록(음수, 신저가 종목이 몰림) 시장 공포·투매
// 실시간 계산은 350종목을 매번 스캔해야 해 브라우저에서 하기엔 무겁고 느려서, Worker가 Cron으로 하루 한 번만 계산해 KV에 저장한
// 값을 그대로 읽어옴(가격은 실시간이어도 "며칠 전 신고가/신저가 분포"라 하루 지연이 체감상 문제되지 않음)
const KR_FOMO_INDEX_API = "https://us-stock.yeop2ad.workers.dev/kr-fomo-index";
let krFomoIndexPromise = null;
function getKrFomoMetrics() {
  if (!krFomoIndexPromise) {
    krFomoIndexPromise = fetch(KR_FOMO_INDEX_API)
      .then((res) => {
        if (!res.ok) throw new Error("KOSPI 공포지수를 가져오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        const history = Array.isArray(data.history) ? data.history : [];
        const prev = history.length >= 2 ? history[history.length - 2] : null;
        return {
          score: typeof data.score === "number" ? data.score : null,
          changeAbs: prev && typeof prev.score === "number" && typeof data.score === "number" ? data.score - prev.score : null,
          date: data.date || null,
        };
      })
      .catch((e) => {
        krFomoIndexPromise = null;
        throw e;
      });
  }
  return krFomoIndexPromise;
}
// 원점수(-1~1, 실제로는 대부분 -0.3~0.3 사이)를 %p 단위로 환산해 사람이 읽기 쉬운 정수로 표시
function fomoDisplayValue(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "N/A";
  const pt = Math.round(score * 100);
  return `${pt >= 0 ? "+" : ""}${pt}`;
}
// scoreBgStyleAttr는 "값이 클수록 더 하얗게(더 fear/attractive)"라는 전제라, 포모지수는 부호가 반대(음수일수록 fear)이므로
// -score*100(=fear 강도, 신저가 쏠림일수록 커짐)으로 뒤집어 넣어 기존 배경색 로직을 그대로 재사용
function fomoBgStyleAttr(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return scoreBgStyleAttr(null, -15, 15, "fear");
  return scoreBgStyleAttr(-score * 100, -15, 15, "fear");
}

// ---------- 점수 색상 통일: 상승압력(파랑)·투자안정(초록)·공포지수(주황) 세 계열 — 텍스트/보더는 계열 고정색,
// 배경만 값이 높을수록 흰색 계열, 낮을수록 검정 계열로 보간(값이 없으면 중립 회색) ----------
const SCORE_COLOR_FAMILY = {
  pressure: "#5b8def", // 상승압력 - 파랑
  stability: "#22a866", // 투자안정 - 초록
  fear: "#ee5f27", // 공포지수(VIX) - 주황과 빨강 사이(2026-09-11 사용자 지정)
};
// 원형판 안쪽은 다른 점수 배지(상승압력=accent-soft, 투자안정=good-soft)와 통일성 있게 계열별 연한 배경을
// 사용 — 예전엔 값이 높을수록 하얗게/낮을수록 검게 보간했지만(다크 테마 전용 디자인) 화이트 테마 기본으로
// 바뀌면서 고정 연한 배경으로 단순화
const SCORE_SOFT_BG_FAMILY = { pressure: "var(--accent-soft)", stability: "var(--good-soft)", fear: "var(--warn-soft)" };
function scoreBgStyle(value, min, max, family) {
  const color = SCORE_COLOR_FAMILY[family] || SCORE_COLOR_FAMILY.pressure;
  return { background: SCORE_SOFT_BG_FAMILY[family] || "var(--accent-soft)", color };
}
function scoreBgStyleAttr(value, min, max, family) {
  const s = scoreBgStyle(value, min, max, family);
  return ` style="background:${s.background};border-color:${s.color};color:${s.color};"`;
}
// 순위표의 상승 압력·투자 안정 점수 셀 전용 — 배경 없이 숫자만, 5점 이상이면 주황, 미만이면 흰색(상세페이지는 원래 배지 색 그대로 유지)
function scoreRankColorHtml(text, value) {
  if (value === null || value === undefined) return `<span class="score-pill-empty">${text}</span>`;
  return `<b style="color:${value >= 5 ? "#e08a2c" : "var(--text)"};">${text}</b>`;
}

// ---------- 종목별 지표 조회 + 상승압력도 점수 계산 (사업요약/경쟁사비교/점수 섹션에서 공용으로 사용) ----------
// 차트 데이터에서 (타임스탬프, 종가) 쌍을 과거→최근 순으로 정렬해 추출
function chartClosePairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// 캔들 차트용: 종가뿐 아니라 시가/고가/저가까지 포함(하나라도 없으면 그 봉은 제외)
function chartOhlcPairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
  const { open = [], high = [], low = [], close = [] } = q;
  const pairs = timestamps
    .map((t, i) => ({ t, o: open[i], h: high[i], l: low[i], c: close[i] }))
    .filter((p) => [p.o, p.h, p.l, p.c].every((v) => v !== null && v !== undefined));
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// 목표 시점(유닉스 타임스탬프)에 가장 가까운 종가 쌍을 찾음
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

// 차트 데이터에서 (타임스탬프, 거래대금=종가×거래량) 쌍을 과거→최근 순으로 정렬해 추출 — chartClosePairs의 거래대금 버전
function chartDollarVolumePairs(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
  const closes = (quote && quote.close) || [];
  const volumes = (quote && quote.volume) || [];
  const pairs = timestamps
    .map((t, i) => ({
      t,
      dv: closes[i] !== null && closes[i] !== undefined && volumes[i] !== null && volumes[i] !== undefined ? closes[i] * volumes[i] : null,
    }))
    .filter((p) => p.dv !== null);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

// asOfTimestamp 기준 최근 5거래일 평균 거래대금과 그 직전 1년간 평균 거래대금 — 상승압력도의 "총 거래대금" 항목용
function dollarVolumeStatsEndingAt(dollarVolumePairs, asOfTimestamp) {
  if (dollarVolumePairs.length === 0) return { recent5dAvg: null, avg1y: null };
  const latest = closestPair(dollarVolumePairs, asOfTimestamp);
  if (!latest) return { recent5dAvg: null, avg1y: null };
  const latestIndex = dollarVolumePairs.findIndex((p) => p.t === latest.t);
  const recentSlice = dollarVolumePairs.slice(Math.max(0, latestIndex - 4), latestIndex + 1); // 최근 5거래일(해당일 포함)
  const recent5dAvg = recentSlice.length ? recentSlice.reduce((a, p) => a + p.dv, 0) / recentSlice.length : null;
  const target = latest.t - YEAR_SECONDS;
  const windowValues = dollarVolumePairs.filter((p) => p.t <= latest.t && p.t >= target - HISTORY_TOLERANCE_SECONDS).map((p) => p.dv);
  const avg1y = windowValues.length ? windowValues.reduce((a, b) => a + b, 0) / windowValues.length : null;
  return { recent5dAvg, avg1y };
}

// 차트 데이터 자체의 최신 시점 기준 거래대금 통계(오늘 기준 지표용) — dollarVolumeStatsEndingAt의 "최신 시점" 버전
function currentDollarVolumeStats(chartResult) {
  const dollarVolumePairs = chartDollarVolumePairs(chartResult);
  const latest = dollarVolumePairs[dollarVolumePairs.length - 1];
  if (!latest) return { recent5dAvg: null, avg1y: null };
  return dollarVolumeStatsEndingAt(dollarVolumePairs, latest.t);
}

const YEAR_SECONDS = 365.25 * 24 * 3600;
const HISTORY_TOLERANCE_SECONDS = 20 * 24 * 3600; // 주말·휴장일 여유분
const THREE_MONTH_SECONDS = 91 * 24 * 3600;
const MOMENTUM_TOLERANCE_SECONDS = 10 * 24 * 3600; // 3개월 구간은 1년보다 짧으므로 여유 허용치도 비례해 축소

// 최근 1년 수익률(%) — 데이터가 실제로 1년치 이상 있을 때만 계산(최신 종가 시점 기준 1년 전과 비교, 차트 조회 범위와 무관하게 정확)
function get1yReturnFromChart(chartResult) {
  const pairs = chartClosePairs(chartResult);
  if (pairs.length < 2) return null;
  const latest = pairs[pairs.length - 1];
  const target = latest.t - YEAR_SECONDS;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 임의 시점(asOfTimestamp) 기준 직전 windowSeconds 구간의 수익률(%) — "상승 모멘텀"의 3개월 버전과 과거분석에서 공용으로 사용
function returnOverWindowEndingAt(pairs, asOfTimestamp, windowSeconds, toleranceSeconds) {
  if (pairs.length < 2) return null;
  const latest = closestPair(pairs, asOfTimestamp);
  if (!latest) return null;
  const target = latest.t - windowSeconds;
  if (pairs[0].t > target + toleranceSeconds) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 최근 3개월 누적 수익률(%) — 상승압력도의 "상승 모멘텀" 항목용(기존 10거래일 상승일수 방식 대체)
function get3MonthReturn(chartResult) {
  const pairs = chartClosePairs(chartResult);
  const latest = pairs[pairs.length - 1];
  if (!latest) return null;
  return returnOverWindowEndingAt(pairs, latest.t, THREE_MONTH_SECONDS, MOMENTUM_TOLERANCE_SECONDS);
}

// 최근 거래일 대비 등락률(요약 카드의 현재가 옆 괄호 표시용)
// 2026-09-09 사용자 보고(일라이릴리 실제 -2.2%인데 -0.8%로 표시): 일봉 마지막 봉의 종가가 실시간가(meta.regularMarketPrice)보다
// 늦게 갱신되거나 장 전에는 당일 봉 자체가 없어 "마지막 두 종가" 비교가 어긋남 → 실시간가와 같은 스냅샷인
// meta.regularMarketChangePercent를 우선 쓰고, 없으면 실시간가 vs 직전 거래일 종가(당일 봉 제외)로 계산
function getDailyChangePercent(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return null;
  const meta = result.meta || {};
  if (Number.isFinite(meta.regularMarketChangePercent)) return meta.regularMarketChangePercent;
  const live = metaPrevCloseChangePct(result);
  if (live !== null) return live;
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  if (pairs.length < 2) return null;
  pairs.sort((a, b) => a.t - b.t);
  const prevClose = pairs[pairs.length - 2].c;
  const latest = pairs[pairs.length - 1].c;
  if (!prevClose) return null;
  return ((latest - prevClose) / prevClose) * 100;
}

// 실시간가 vs 직전 거래일 종가: 마지막 봉이 "오늘"(regularMarketTime과 같은 거래소 날짜)이면 그 앞 봉을 직전 종가로 사용
function metaPrevCloseChangePct(result) {
  const meta = (result && result.meta) || {};
  const price = meta.regularMarketPrice;
  if (!Number.isFinite(price)) return null;
  if (Number.isFinite(meta.previousClose) && meta.previousClose > 0) return ((price - meta.previousClose) / meta.previousClose) * 100;
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => Number.isFinite(p.c));
  if (!pairs.length) return null;
  pairs.sort((a, b) => a.t - b.t);
  const tz = meta.exchangeTimezoneName || "UTC";
  const dayKey = (t) => {
    try {
      return new Date(t * 1000).toLocaleDateString("en-CA", { timeZone: tz });
    } catch {
      return new Date(t * 1000).toISOString().slice(0, 10);
    }
  };
  const today = Number.isFinite(meta.regularMarketTime) ? dayKey(meta.regularMarketTime) : null;
  const prior = today ? pairs.filter((p) => dayKey(p.t) < today) : pairs.slice(0, -1);
  const prev = prior.length ? prior[prior.length - 1] : null;
  if (!prev || !prev.c) return null;
  return ((price - prev.c) / prev.c) * 100;
}

// 오늘 등락 금액(현재가 − 직전 거래일 종가) — 2026-09-15 사용자 지적("6,992원이 말이 안 됨"):
// 야후 regularMarketChangePercent는 소수 3자리로 반올림돼 와서(-0.412%) 거기서 역산하면 7,000원이 6,992원이 됐음 → 실제 직전 종가로 계산
function getDailyChangeAmount(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return null;
  const meta = result.meta || {};
  const price = meta.regularMarketPrice;
  if (!Number.isFinite(price)) return null;
  if (Number.isFinite(meta.regularMarketChange)) return meta.regularMarketChange;
  if (Number.isFinite(meta.previousClose) && meta.previousClose > 0) return price - meta.previousClose;
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => Number.isFinite(p.c)).sort((a, b) => a.t - b.t);
  if (pairs.length < 2) return null;
  const tz = meta.exchangeTimezoneName || "UTC";
  const dayKey = (t) => {
    try {
      return new Date(t * 1000).toLocaleDateString("en-CA", { timeZone: tz });
    } catch {
      return new Date(t * 1000).toISOString().slice(0, 10);
    }
  };
  const today = Number.isFinite(meta.regularMarketTime) ? dayKey(meta.regularMarketTime) : null;
  const prior = today ? pairs.filter((p) => dayKey(p.t) < today) : pairs.slice(0, -1);
  const prev = prior.length ? prior[prior.length - 1] : null;
  return prev && prev.c ? price - prev.c : null;
}

// 최근 5거래일 중 하루라도 ±10% 이상 급등/급락한 날이 있었는지(급등락 이모지 표시용) — 누적 5일 수익률이 아닌 일별 등락률 각각을 확인
function get5dExtremeMoves(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return { hasSurge: false, hasPlunge: false };
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  const recent = pairs.slice(-6); // 종가 6개 = 일별 등락률 5개
  let hasSurge = false;
  let hasPlunge = false;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].c;
    const cur = recent[i].c;
    if (!prev) continue;
    const pct = ((cur - prev) / prev) * 100;
    if (pct >= 10) hasSurge = true;
    if (pct <= -10) hasPlunge = true;
  }
  return { hasSurge, hasPlunge };
}

// ---------- 과거분석(1년 전 스냅샷 vs 현재 비교)용 헬퍼 — 위 함수들의 "임의 시점 기준" 버전 ----------
// 목표 시점 이후 첫 거래일 쌍을 찾음(주말·휴장일이면 다음 거래일로 자동 이동)
function firstTradingDayOnOrAfter(pairs, targetTimestamp) {
  for (const p of pairs) {
    if (p.t >= targetTimestamp) return p;
  }
  return null;
}

// 임의 시점(asOfTimestamp) 기준 직전 1년 수익률(%) — get1yReturnFromChart의 시점 지정 버전
function returnOverYearEndingAt(pairs, asOfTimestamp) {
  if (pairs.length < 2) return null;
  const latest = closestPair(pairs, asOfTimestamp);
  if (!latest) return null;
  const target = latest.t - YEAR_SECONDS;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS) return null;
  const base = closestPair(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

// 과거분석 기준 시점: "1년 전 + 다음 달 1일" (매달 1일이 지나면 자동으로 기준월이 한 달씩 이동)
function getHistoricalReferenceDate() {
  const now = new Date();
  return new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
}

// 나스닥·다우존스·S&P500 1년 수익률 (여러 섹션이 공유해서 중복 요청을 줄임)
async function getMarketReturns() {
  try {
    const [nasdaqChart, dowChart, sp500Chart, kospi200Chart] = await Promise.all([
      yahooChart("^IXIC"),
      yahooChart("^DJI"),
      yahooChart("^GSPC"),
      // 한국 종목 투자안정 점수(KOSPI200 대비 수익률)용. Yahoo의 ^KS200은 최근 데이터에 몇 주씩 결측(null)이
      // 뚫려 있는 경우가 있어(1y 범위만 쓰면 그 결측 때문에 1년 전 기준점을 못 찾아 항상 null이 나옴),
      // 2y 범위로 넉넉히 받아서 최근 유효한 종가를 기준으로 1년 수익률을 계산할 여유를 둠
      yahooChart("^KS200", "2y").catch(() => null),
    ]);
    const nasdaqReturn = get1yReturnFromChart(nasdaqChart);
    const dowReturn = get1yReturnFromChart(dowChart);
    const sp500Return = get1yReturnFromChart(sp500Chart);
    const kospi200Return = kospi200Chart ? get1yReturnFromChart(kospi200Chart) : null;
    const valid = [nasdaqReturn, dowReturn].filter((v) => v !== null);
    const avgIndexReturn = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    return { nasdaqReturn, dowReturn, sp500Return, kospi200Return, avgIndexReturn };
  } catch {
    return { nasdaqReturn: null, dowReturn: null, sp500Return: null, kospi200Return: null, avgIndexReturn: null };
  }
}

// 세션 내 반복 호출 시 매번 지수 3종을 다시 조회하지 않도록 캐싱(기업가치 랭킹 표에서 종목마다 투자등급을 계산할 때 공용으로 사용)
let _marketReturnsCache = null;
async function getMarketReturnsCached() {
  if (!_marketReturnsCache) _marketReturnsCache = getMarketReturns();
  return _marketReturnsCache;
}

// 상승압력 공통 배점 — 2026-09-03 사용자 통일: 기존 코인 배점을 한국주식·미국주식·ETF에도 완전 동일 적용,
// 이전 배점(주식: 거래대금·매출성장·3개월 모멘텀 / ETF: 모멘텀·거래량·RSI)은 폐지. 총 10점:
// ① 거래량 0~3점: 최근 5거래일 평균 거래대금÷최근 3개월 평균이 3배 이상 만점, 0.5배 이하 0점(선형, 3개월 평균 없으면 1년 평균으로 대체)
// ② 한달상승 0~3점: 최근 1개월 상승률 50% 이상 만점, 0% 이하 0점(선형)
// ③ RSI 과매도점수 0~4점: 주간 RSI(14)가 70 이상 만점, 30 이하 0점(선형) — 값은 배치 DB(winrate-scores-us.json)
function computeAttractivenessScore(metrics) {
  const { recentDollarVolume, avgDollarVolume3m, avgDollarVolume1y, monthReturn, rsiWeekly } = metrics;

  let volumeScore = 1.5; // 데이터 부족 시 중립값
  let volumeRatio = null;
  const baseDv = avgDollarVolume3m !== undefined && avgDollarVolume3m !== null && avgDollarVolume3m > 0 ? avgDollarVolume3m : avgDollarVolume1y;
  if (recentDollarVolume !== undefined && recentDollarVolume !== null && baseDv) {
    volumeRatio = recentDollarVolume / baseDv;
    volumeScore = clamp((3 * (volumeRatio - 0.5)) / 2.5, 0, 3);
  }

  let monthScore = 0;
  if (monthReturn !== undefined && monthReturn !== null) {
    monthScore = clamp((monthReturn / 50) * 3, 0, 3);
  }

  let rsiScore = 2; // RSI 데이터 없는 종목은 중립값
  if (rsiWeekly !== undefined && rsiWeekly !== null) {
    rsiScore = clamp((4 * (rsiWeekly - 30)) / 40, 0, 4);
  }

  const total = Math.round(clamp(volumeScore + monthScore + rsiScore, 0, 10) * 10) / 10;
  return { total, volumeScore, volumeRatio, monthScore, monthReturn, rsiScore, rsiWeekly };
}
// 배점 통일(2026-09-03) 전의 호출부 호환용 별칭 — 세 자산 모두 같은 공통 배점을 사용
const computeEtfAttractivenessScore = computeAttractivenessScore;
const computeCryptoAttractivenessScore = computeAttractivenessScore;

// 암호화폐(코인) 전용 투자안정 배점 — 2026-09-03 사용자 재개편(총 7점, 기존 10점에서 항목별 1점씩 축소):
// ① 업력 가점 0~2점: 상장(거래 시작)부터 10년 이상 만점, 3년 이하 0점(선형)
// ② 우상향 점수 0~3점: 10년월간승률(장기 우상향 점수)이 60% 이상 만점, 40% 이하 0점(선형) — 값은 배치 DB
// ③ 비트코인 대비 모멘텀 0~2점: 1년 상승률이 비트코인과 40%p 미만 차이면 만점, 100%p 이상 0점(선형)
function computeCryptoRiskScore({ firstTradeDate, winRate, oneYearReturn, btcReturn }) {
  let ageScore = 1; // 데이터 부족 시 중립값
  let ageYears = null;
  if (firstTradeDate) {
    ageYears = (Date.now() / 1000 - firstTradeDate) / (365.25 * 86400);
    ageScore = clamp((2 * (ageYears - 3)) / 7, 0, 2);
  }

  let winScore = 1.5;
  if (winRate !== null && winRate !== undefined) {
    winScore = clamp((3 * (winRate - 40)) / 20, 0, 3);
  }

  let marketScore = 1;
  let relDiff = null;
  if (oneYearReturn !== null && oneYearReturn !== undefined && btcReturn !== null && btcReturn !== undefined) {
    relDiff = Math.abs(oneYearReturn - btcReturn);
    marketScore = relDiff < 40 ? 2 : clamp((2 * (100 - relDiff)) / 60, 0, 2);
  }

  const total = Math.round(clamp(ageScore + winScore + marketScore, 0, 7) * 10) / 10;
  return { total, ageScore, ageYears, winScore, winRate, marketScore, relDiff };
}

// 비트코인 1년 상승률(코인 투자안정 ②번 벤치마크) — 세션 내 캐시
let btcOneYearReturnPromise = null;
function getBtcOneYearReturn() {
  if (!btcOneYearReturnPromise) {
    btcOneYearReturnPromise = yahooChart("BTC-USD", "1y")
      .then((chart) => {
        const pairs = chartClosePairs(chart);
        if (pairs.length < 2 || !pairs[0].c) return null;
        return ((pairs[pairs.length - 1].c - pairs[0].c) / pairs[0].c) * 100;
      })
      .catch(() => null);
  }
  return btcOneYearReturnPromise;
}

// ETF 전용 투자안정 배점 — 2026-09-03 사용자 개편(총 10점):
// ① 우상향 점수 0~4점: 10년월간승률(장기 우상향 점수)이 60% 이상 만점, 40% 이하 0점(선형) — 값은 배치 DB
// ② 변동성 점수 0~3점: 최근 30거래일 일평균 |등락률|이 0.5% 미만 만점, 3% 이상 0점(선형)
// ③ 5년 평균 성장률 0~3점: 연평균(CAGR) 15% 이상 만점, 0% 이하 0점(선형) — 5년 차트 기준(짧으면 상장 후부터)
function computeEtfRiskScore({ winRate, volatility, fiveYearCagr }) {
  let winScore = 2; // 데이터 부족 시 중립값
  if (winRate !== null && winRate !== undefined) {
    winScore = clamp((4 * (winRate - 40)) / 20, 0, 4);
  }

  let volScore = 1.5;
  if (volatility !== null && volatility !== undefined) {
    volScore = clamp((3 * (3 - volatility)) / 2.5, 0, 3);
  }

  let growthScore = 1.5;
  if (fiveYearCagr !== null && fiveYearCagr !== undefined) {
    growthScore = clamp((3 * fiveYearCagr) / 15, 0, 3);
  }

  const total = Math.round(clamp(winScore + volScore + growthScore, 0, 10) * 10) / 10;
  return { total, winScore, winRate, volScore, volatility, growthScore, fiveYearCagr };
}

// ---------- ETF 시가총액(순자산) DB(2026-09-01 사용자 요청): ETF 시총은 자주 안 바뀌어 실시간 API 대신
// data/etf-marketcap.json(scripts/fetch-etf-marketcap.ps1로 생성·갱신)으로 관리 — 한국 전체 1100여 개(억원),
// 미국 330여 개(달러). 한국 ETF TOP100 목록·ETF 투자안정 ③(시가총액)이 모두 이 DB를 사용한다 ----------
let etfMarketCapDbPromise = null;
function getEtfMarketCapDb() {
  if (!etfMarketCapDbPromise) {
    etfMarketCapDbPromise = fetch("data/etf-marketcap.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("ETF 시총 DB를 불러오지 못했습니다.");
        return r.json();
      })
      .catch((e) => {
        etfMarketCapDbPromise = null; // 실패는 캐시하지 않음
        throw e;
      });
  }
  return etfMarketCapDbPromise;
}
// ETF 규모(2026-10-06 사용자 요청) — 한국은 국내 ETF 시가총액 상위 100, 미국은 순자산 상위 100 안의 순위.
// 값은 data/etf-marketcap.json(한국 m = 억원, 미국 a = 달러). 한국 "25.0조"(소수 둘째 자리부터 버림), 미국 "700B"(반올림).
async function getEtfAumInfo(symbol) {
  const db = await getEtfMarketCapDb();
  const isKr = isKrTicker(symbol);
  const list = (isKr ? db.kr || [] : db.us || [])
    .map((x) => ({ s: x.s, v: isKr ? x.m : x.a }))
    .filter((x) => x.s && Number.isFinite(x.v))
    .sort((a, b) => b.v - a.v);
  const idx = list.findIndex((x) => x.s === symbol);
  if (idx < 0) return null;
  return { value: list[idx].v, rank: idx + 1, isKr, top: list.slice(0, 100).map((x) => x.v) };
}
function etfAumText(v, isKr) {
  if (!Number.isFinite(v)) return "N/A";
  if (isKr === undefined) isKr = v < 1e8; // 한국 값은 억원 단위라 작다
  if (isKr) {
    const jo = Math.floor((v / 10000) * 10) / 10;
    return jo >= 0.1 ? `${jo.toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`;
  }
  return `${Math.round(v / 1e9).toLocaleString("en-US")}B`;
}
function applyEtfAumRank(it, info) {
  it.avgName = "";
  it.avgShort = "";
  it.avg = null;
  if (!info) {
    it.score = null;
    it.avgScore = null;
    return;
  }
  const inTop = info.rank <= 100;
  it.rank = inTop ? info.rank : null;
  it.total = inTop ? 100 : null;
  it.topPct = inTop ? info.rank : null;
  it.mark = inTop ? (info.rank <= 10 ? "fire" : info.rank > 90 ? "warn" : null) : null;
  it.judge = { text: "", tone: it.mark === "fire" ? "good" : it.mark === "warn" ? "bad" : "neutral" };
  it.fmt = () => etfAumText(info.value, info.isKr);
  // 오각형 축: 상위 100 안의 순위로(1위 = 꽉 참, 100위 = 가장 안쪽), 100위 밖은 가장 안쪽
  it.score = inTop ? Math.max(0.04, 1 - (info.rank - 1) / 99) : 0.04;
  it.avgScore = 0.5;
}
// 통화쌍 환율(세션 내 캐시) — 재무제표가 시세와 다른 현지 통화로 내려오는 해외 상장 종목(TSM·SKHY 등) 환산용
const fxRateCache = new Map();
async function getFxRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return 1;
  const cacheKey = `${fromCurrency}${toCurrency}`;
  if (fxRateCache.has(cacheKey)) return fxRateCache.get(cacheKey);
  const rate = await yahooChart(`${fromCurrency}${toCurrency}=X`)
    .then((c) => c?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null)
    .catch(() => null);
  fxRateCache.set(cacheKey, rate);
  return rate;
}

// fundamentals-timeseries 응답 블록에서 특정 항목의 가장 최근 값을 추출
// 보고 통화가 시세 통화와 다르면(예: TSM은 매출이 USD 시세인데 TWD로 내려옴) 환율을 적용해 시세 통화로 환산.
// convert=false인 항목(발행주식수 등 금액이 아닌 값)은 환산이 의미 없으므로 통화가 다르면 신뢰할 수 없다고 보고 제외
async function latestFundamentalValue(block, key, quoteCurrency, { convert = true } = {}) {
  const items = (block && block[key]) || [];
  const valid = items.filter((it) => it && it.reportedValue && it.reportedValue.raw !== undefined);
  if (!valid.length) return null;
  valid.sort((a, b) => new Date(a.asOfDate) - new Date(b.asOfDate));
  const latest = valid[valid.length - 1];
  const raw = latest.reportedValue.raw;
  if (!quoteCurrency || !latest.currencyCode || latest.currencyCode === quoteCurrency) return raw;
  if (!convert) return null;
  const rate = await getFxRate(latest.currencyCode, quoteCurrency);
  return rate !== null ? raw * rate : null;
}

// fundamentals-timeseries 응답에서 특정 항목의 시계열(과거→최근 정렬, 환율 자동 환산)을 추출 — annual/quarterly 등 여러 기간 값이 필요한 계산용
async function fundamentalSeries(resultArr, key, quoteCurrency) {
  const items = [];
  for (const block of resultArr || []) {
    for (const it of block[key] || []) {
      if (it && it.asOfDate && it.reportedValue && it.reportedValue.raw !== undefined) items.push(it);
    }
  }
  if (items.length === 0) return [];
  items.sort((a, b) => new Date(a.asOfDate) - new Date(b.asOfDate));
  const reportCurrency = items.find((it) => it.currencyCode)?.currencyCode;
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  if (fxRate === null) return [];
  return items.map((it) => ({ date: it.asOfDate, value: it.reportedValue.raw * fxRate }));
}

// 가장 최근 분기 매출의 전년 동기 대비(YoY) 성장률(%) — 분기 매출 시계열에서 최신 분기 vs 4분기 전(작년 같은 분기) 비교
function latestQuarterRevenueYoY(revenueQuarterlySeries) {
  const series = revenueQuarterlySeries || [];
  if (series.length < 5) return null;
  const latest = series[series.length - 1].value;
  const yearAgo = series[series.length - 5].value;
  if (!yearAgo) return null;
  return ((latest - yearAgo) / Math.abs(yearAgo)) * 100;
}

// 가장 최근 회계연도의 전년 대비(YoY) 성장률(%) — 연간 시계열의 마지막 두 회계연도를 비교(가치평가 탭: 매출액·현금흐름·순이익 증가 랭킹용)
function latestAnnualGrowth(annualSeries) {
  const series = annualSeries || [];
  if (series.length < 2) return null;
  const latest = series[series.length - 1].value;
  const prior = series[series.length - 2].value;
  if (!prior) return null;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

// 최근 연간 매출의 전년 대비(YoY) 성장률(%) — Yahoo 분기 시계열이 최근 5개 분기만 제공해 과거분석 기준 시점에는
// 분기 YoY를 계산할 만큼 데이터가 남아있지 않을 때가 많아, 연간 데이터로 대체 계산하는 과거분석 전용 폴백
function latestAnnualRevenueYoY(revenueAnnualSeries) {
  const series = revenueAnnualSeries || [];
  if (series.length < 2) return null;
  const latest = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (!prev) return null;
  return ((latest - prev) / Math.abs(prev)) * 100;
}

// 상승압력도 + 투자 안정성 점수 계산에 필요한 모든 지표를 한 번(차트 1회 + 재무제표 1회)에 조회 (TOP30 랭킹용)
async function getFullMetrics(symbol) {
  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol),
    yahooFundamentals(
      symbol,
      "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued,quarterlyTotalRevenue,annualOperatingCashFlow," +
        "quarterlyOperatingIncome,quarterlyNetIncome,quarterlyStockholdersEquity,quarterlyTotalLiabilitiesNetMinorityInterest"
    ),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) throw new Error(`${symbol} 데이터를 가져오지 못했습니다.`);
  const meta = result.meta;

  let revenue = null;
  let eps = null;
  let netIncome = null;
  let sharesOutstanding = null;
  const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
  for (const block of resultArr) {
    if (block.annualTotalRevenue) revenue = await latestFundamentalValue(block, "annualTotalRevenue", meta.currency);
    if (block.annualBasicEPS) eps = await latestFundamentalValue(block, "annualBasicEPS", meta.currency);
    if (block.annualNetIncome) netIncome = await latestFundamentalValue(block, "annualNetIncome", meta.currency);
    if (block.annualShareIssued)
      sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
  }
  const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;
  const revenueQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency);
  const revenueAnnualSeries = await fundamentalSeries(resultArr, "annualTotalRevenue", meta.currency);
  const netIncomeAnnualSeries = await fundamentalSeries(resultArr, "annualNetIncome", meta.currency);
  const operatingCashFlowAnnualSeries = await fundamentalSeries(resultArr, "annualOperatingCashFlow", meta.currency);

  // 직전 분기(가장 최근) 기준 영업이익률·ROE·부채비율 — 영업이익/순이익/자기자본/부채총계는 모두 같은 분기말 스냅샷이라야
  // 비율이 의미 있으므로, 매출도 연간이 아니라 quarterlyTotalRevenue 시계열의 마지막 값을 그대로 사용
  const operatingIncomeQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyOperatingIncome", meta.currency);
  const netIncomeQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyNetIncome", meta.currency);
  const stockholdersEquityQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyStockholdersEquity", meta.currency);
  const totalLiabilitiesQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyTotalLiabilitiesNetMinorityInterest", meta.currency);
  const lastVal = (series) => (series && series.length ? series[series.length - 1].value : null);
  const latestRevenueQ = lastVal(revenueQuarterlySeries);
  const latestOperatingIncomeQ = lastVal(operatingIncomeQuarterlySeries);
  const latestNetIncomeQ = lastVal(netIncomeQuarterlySeries);
  const latestEquityQ = lastVal(stockholdersEquityQuarterlySeries);
  const latestLiabilitiesQ = lastVal(totalLiabilitiesQuarterlySeries);
  const operatingMarginQuarterly =
    latestRevenueQ !== null && latestOperatingIncomeQ !== null && latestRevenueQ !== 0
      ? (latestOperatingIncomeQ / latestRevenueQ) * 100
      : null;
  // 자기자본이 0 이하(자본잠식 등)면 ROE·부채비율이 부호가 뒤집혀 오히려 "우량"처럼 보이는 왜곡이 생기므로 N/A 처리
  const roeQuarterly =
    latestNetIncomeQ !== null && latestEquityQ !== null && latestEquityQ > 0 ? (latestNetIncomeQ / latestEquityQ) * 100 : null;
  const debtRatioQuarterly =
    latestLiabilitiesQ !== null && latestEquityQ !== null && latestEquityQ > 0 ? (latestLiabilitiesQ / latestEquityQ) * 100 : null;
  // 52주 최고~최저 구간에서 현재가의 위치(0%=52주 최저, 100%=52주 최고) — 차트 meta에 이미 포함돼 있어 별도 조회 불필요
  const weekHigh = meta.fiftyTwoWeekHigh;
  const weekLow = meta.fiftyTwoWeekLow;
  const week52RangePct =
    meta.regularMarketPrice !== undefined && weekHigh !== undefined && weekLow !== undefined && weekHigh > weekLow
      ? ((meta.regularMarketPrice - weekLow) / (weekHigh - weekLow)) * 100
      : null;

  const { recent5dAvg, avg1y } = currentDollarVolumeStats(chartData);

  // 상승압력 공통 배점(2026-09-03 통일: 코인 방식) 입력 — 한달 수익률·3개월 평균 거래대금·주간 RSI(배치 DB에서 조회)
  const closePairsForMonth = chartClosePairs(chartData);
  const lastClosePair = closePairsForMonth[closePairsForMonth.length - 1];
  const monthReturn = lastClosePair ? returnOverWindowEndingAt(closePairsForMonth, lastClosePair.t, 30 * 86400, MOMENTUM_TOLERANCE_SECONDS) : null;
  const dvPairsFor3m = chartDollarVolumePairs(chartData);
  const lastDvPair = dvPairsFor3m[dvPairsFor3m.length - 1];
  const dv3mWindow = lastDvPair ? dvPairsFor3m.filter((p) => p.t >= lastDvPair.t - 91 * 86400).map((p) => p.dv) : [];
  const avgDollarVolume3m = dv3mWindow.length ? dv3mWindow.reduce((a, b) => a + b, 0) / dv3mWindow.length : null;
  const wrDbForRsi = await getWinRateDb().catch(() => null);
  const wrRsiEntry = wrDbForRsi ? ((isKrTicker(symbol) ? wrDbForRsi.scoresKr : wrDbForRsi.scores) || {})[symbol] : null;
  const rsiWeekly = wrRsiEntry && wrRsiEntry.rsi !== null && wrRsiEntry.rsi !== undefined ? wrRsiEntry.rsi : null;

  // 2026-09-10 수정: 1년치 일봉 차트의 chartPreviousClose는 "1년 전 종가"라 등락률이 1년 변동률로 나왔음
  // (예: SK스퀘어 +551%) — 검색상세·인기종목과 동일하게 오늘(전 거래일 종가 대비) 등락률로 통일
  const changePct = getDailyChangePercent(chartData);

  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    price: meta.regularMarketPrice,
    changePct,
    eps,
    revenue,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    fiveDayExtremes: get5dExtremeMoves(chartData),
    momentum3m: get3MonthReturn(chartData),
    revenueGrowthYoY: latestQuarterRevenueYoY(revenueQuarterlySeries),
    // 가치평가 탭(매출액·현금흐름·순이익 증가, PER)용 — 최근 회계연도 기준
    revenueGrowthAnnual: latestAnnualGrowth(revenueAnnualSeries),
    netIncomeGrowthAnnual: latestAnnualGrowth(netIncomeAnnualSeries),
    operatingCashFlowGrowthAnnual: latestAnnualGrowth(operatingCashFlowAnnualSeries),
    operatingMarginQuarterly,
    roeQuarterly,
    debtRatioQuarterly,
    week52RangePct,
    per: meta.regularMarketPrice !== undefined && eps > 0 ? meta.regularMarketPrice / eps : null,
    recentDollarVolume: recent5dAvg,
    avgDollarVolume1y: avg1y,
    monthReturn,
    avgDollarVolume3m,
    rsiWeekly,
    firstTradeDate: meta.firstTradeDate ?? null,
    // 미래예측(매출액 vs 주가 vs 순이익, 2026-09-09)용 원시 시계열
    revenueQuarterlySeries,
    netIncomeQuarterlySeries,
    revenueAnnualSeries,
    netIncomeAnnualSeries,
  };
}

// 상장(IPO)한 지 약 3개월(92일) 이내인지 — 데이터가 부족해 점수 신뢰도가 낮은 종목을 점수 대신 "IPO"로 표기하는 데 사용
function isRecentIPO(firstTradeDateEpoch) {
  if (!firstTradeDateEpoch) return false;
  return (Date.now() / 1000 - firstTradeDateEpoch) / 86400 <= 92;
}

// 미국 시장 전체 시가총액 추정치 — S&P500 전체 종목 시가총액 합계로 근사(2026-08 기준 관측값, 시간이 지나며 실제 시장 규모와 달라질 수 있어 주기적 갱신 필요)
// "시가총액 가점" 항목에서 VTSAX 등 미국 전체 시장 인덱스펀드 내 예상 시총 비중을 추정하는 분모로 사용
const US_TOTAL_MARKET_CAP_ESTIMATE = 87.4e12;

// KODEX 200(069500, 삼성자산운용) ETF 내 개별 종목 편입비중(%) — 한국 종목 "시가총액 가점"에서 미국의
// VTSAX 시총비중 대신 사용. 출처: 삼성자산운용 공식 월간 팩트시트(https://m.samsungfund.com/sheet/20260805/2ETF01_20260731.pdf,
// 2026-07-31 기준) "상위 10종목" 표 — 공식 자료지만 상위 10개까지만 공개되고 나머지 약 190개 구성종목의
// 정확한 비중은 무료로 공개된 곳을 못 찾음(KRX 데이터마켓은 로그인 필요, 일별 전체 PDF 미확인).
// 상위 10위(기아, 1.00%)보다 낮은 비중일 게 확실한 종목들은 3% 만점 기준상 실제로도 거의 0점에 가까워서
// 영향이 작지만, 정확히는 "미확인"이지 "미편입 확정"은 아님 — 나중에 전체 구성종목 데이터를 구하면 교체 필요.
const KODEX200_WEIGHTS = {
  "005930.KS": 32.72, // 삼성전자
  "000660.KS": 25.44, // SK하이닉스
  "402340.KS": 2.48, // SK스퀘어
  "105560.KS": 1.73, // KB금융
  "009150.KS": 1.67, // 삼성전기
  "005380.KS": 1.63, // 현대차
  "055550.KS": 1.41, // 신한지주
  "086790.KS": 1.05, // 하나금융지주
  "068270.KS": 1.02, // 셀트리온
  "000270.KS": 1.0, // 기아
};

// 참고용 신용등급(S&P Global Ratings 장기 발행자 등급 기준) 테이블 — 자체 조사로 수동 입력한 정적 데이터로,
// 실시간 갱신되지 않으므로 등급 변동 시 수동 업데이트가 필요함. 목록에 없는 종목은 "S&P 등급 없음"으로 1점 처리
// 회사채를 발행한 적이 없어(순현금·무차입 경영 등) 신용등급 자체가 존재하지 않는 종목 표시용 값 — S&P 등급 없음과 구분해 2점 처리
const NO_DEBT_RATING = "회사채 없음";
// 유이자부채(회사채·term loan 등)는 있으나 S&P가 발행자 등급을 매기지 않는 종목 표시용 값(다른 평가사만 평가 등) — 1점 처리
// 위 두 값은 화면 세부점수에 숫자 대신 사유 문자열로 그대로 표시됨(투자등급이 없으면 점수가 아니라 사유를 노출)
const UNRATED_REASON = "미평가";

const TICKER_CREDIT_RATING = {
  PLTR: NO_DEBT_RATING,
  CRCL: NO_DEBT_RATING, // 서클(2025 IPO, USDC 발행사) — S&P·Moody's 발행자 등급 미확인, 유이자부채 거의 없음(D/E~0.01)
  MSFT: "AAA", JNJ: "AAA", ADP: "AAA",
  AAPL: "AA+", GOOGL: "AA+", GOOG: "AA+",
  "BRK-B": "AA", "BRK-A": "AA", AMZN: "AA", WMT: "AA", CVX: "AA",
  XOM: "AA-", PG: "AA-", V: "AA-", ABT: "AA-", ACN: "AA-",
  COST: "A+", KO: "A+", PEP: "A+", UNH: "A+", MA: "A+", MRK: "A+", NVDA: "A+",
  HD: "A", ORCL: "A", TXN: "A", ADBE: "A", LIN: "A", PFE: "A", QCOM: "A", CAT: "A", UPS: "A", CRM: "A",
  JPM: "A-", BAC: "A-", WFC: "A-", CSCO: "A-", IBM: "A-", DIS: "A-", TMO: "A-", AMD: "A-", NFLX: "A-", CMCSA: "A-", ABBV: "A-",
  SCHW: "A-", EQR: "A-",
  MCD: "BBB+", SBUX: "BBB+", LOW: "BBB+", VZ: "BBB+", AVGO: "BBB+", PYPL: "BBB+", GS: "BBB+", ESS: "BBB+", APP: "BBB+", EA: "BBB+",
  CME: "AA-", SPG: "A", PLD: "A", PSA: "A",
  T: "BBB", INTC: "BBB", MU: "BBB", UBER: "BBB", GM: "BBB", SPCX: "BBB",
  VICI: "BBB-", MSCI: "BBB-", BA: "BBB-", F: "BBB-",
  AAL: "B+",

  // 아래는 S&P500 시가총액 상위 100개 전수 조사로 추가(2026-08 기준 웹검색으로 확인, S&P Global Ratings 장기 발행자 등급만)
  // 재조사(2026-08): PANW·ANET는 회사채 없음(순현금), SPGI는 유이자부채 있으나 자사 미평가
  PANW: NO_DEBT_RATING, ANET: NO_DEBT_RATING, SPGI: UNRATED_REASON,
  META: "AA-", BLK: "AA-",
  LLY: "A+",
  AMAT: "A", DE: "A", TRV: "A", BNY: "A", TJX: "A", PGR: "A", BMY: "A",
  LRCX: "A-", MS: "A-", PM: "A-", GE: "A-", BKNG: "A-", UNP: "A-", COP: "A-", KLAC: "A-", ALL: "A-", AXP: "A-",
  APH: "A-", ADI: "A-", AMP: "A-", DHR: "A-", NEE: "A-", ETN: "A-", AFL: "A-", WELL: "A-", MCO: "A-",
  C: "BBB+", RTX: "BBB+", GLW: "BBB+", MCK: "BBB+", TMUS: "BBB+", AMGN: "BBB+", EBAY: "BBB+", PH: "BBB+", MO: "BBB+", MMM: "BBB+", GILD: "BBB+",
  TSLA: "BBB", DELL: "BBB", MPC: "BBB", GEV: "BBB", VLO: "BBB", CVS: "BBB",
  CRWD: "BBB-", MRVL: "BBB-", STX: "BBB-",
  SNDK: "BB+",

  // 아래는 S&P500 시가총액 101~500위 전수 조사 1차분으로 추가(2026-08 기준 웹검색으로 확인, S&P Global Ratings 장기 발행자 등급만)
  // 재조사(2026-08): VRTX·MNST·DASH·MPWR는 회사채 없음(순현금), MTD는 유이자부채 있으나 S&P 미평가(Moody's만)
  VRTX: NO_DEBT_RATING, MNST: NO_DEBT_RATING, DASH: NO_DEBT_RATING, MPWR: NO_DEBT_RATING, MTD: UNRATED_REASON,
  HON: "A", GD: "A", MDT: "A", TGT: "A", BX: "A+",
  TT: "A-", MET: "A-", CI: "A-", CDNS: "A-", ABNB: "A-", MRSH: "A-", ECL: "A-", NUE: "A-", ICE: "A-", AEP: "A-", TFC: "A-", TEL: "A-",
  SYK: "BBB+", NEM: "BBB+", FTNT: "BBB+", HWM: "BBB+", REGN: "BBB+", SO: "BBB+", JCI: "BBB+", DUK: "BBB+", COR: "BBB+",
  CSX: "BBB+", AME: "BBB+", RSG: "BBB+", DLR: "BBB+", NXPI: "BBB+", AJG: "BBB+",
  MDLZ: "BBB", PWR: "BBB", KR: "BBB", VRSN: "BBB", VRSK: "BBB", EQIX: "BBB", RCL: "BBB", MAR: "BBB",
  KMI: "BBB", WAT: "BBB", BDX: "BBB", SYY: "BBB", CAH: "BBB",
  FCX: "BBB-", VRT: "BBB-", JBL: "BBB-", SYF: "BBB-",
  HLT: "BB+", OXY: "BB+", URI: "BB+",
  COHR: "BB",

  // 2차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): ISRG는 회사채 없음(무부채, 순현금)
  ISRG: NO_DEBT_RATING,
  ITW: "A+", GWW: "A+", CL: "A+",
  EMR: "A", CB: "A", CMI: "A", USB: "A", NOW: "A",
  CTAS: "A-", AIG: "A-", WM: "A-", PNC: "A-", LMT: "A-",
  PSX: "BBB+", NVR: "BBB+", WMB: "BBB+", NSC: "BBB+", NOC: "BBB+", CEG: "BBB+",
  COF: "BBB", EXPE: "BBB", SHW: "BBB", HCA: "BBB-",
  WDC: "BBB-",
  STT: "A", KKR: "A", ELV: "A", PRU: "A", SLB: "A",
  INTU: "A-", BSX: "A-", ROST: "A-", WEC: "A-",
  FICO: "BB+",

  // 3차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): VEEV는 회사채 없음(순현금), RMD·DXCM는 유이자부채 있으나 S&P 현행 발행자등급 미확인
  VEEV: NO_DEBT_RATING, RMD: UNRATED_REASON, DXCM: UNRATED_REASON,
  ADM: "A", KVUE: "A", CINF: "A+",
  DGX: "BBB+", VMC: "BBB+", NTAP: "BBB+", ZTS: "BBB+", OMC: "BBB+", BIIB: "BBB+", IBKR: "BBB+",
  LVS: "BBB", LII: "BBB", IR: "BBB", EFX: "BBB",
  IRM: "BB-",

  // 4차분 (101~500위 조사, 예산 소진 전 완료분)
  HAL: "BBB+", MLM: "BBB+", WTW: "BBB+", EXR: "BBB+", ARES: "BBB+", CHD: "BBB+",
  TPR: "BBB", GEHC: "BBB", CCI: "BBB", TDY: "BBB", OTIS: "BBB", KHC: "BBB", XYL: "BBB", TSCO: "BBB", ZBH: "BBB", NDSN: "BBB",
  EQT: "BBB-", CASY: "BBB-", IT: "BBB-",

  // 5차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): CMG는 회사채 없음(회사채 미발행, 리스부채만 존재)
  CMG: NO_DEBT_RATING,
  KMB: "A", HSY: "A",
  ROP: "BBB+", CBRE: "BBB+", PAYX: "BBB+", A: "BBB+", PEG: "BBB+",
  LUV: "BBB", FISV: "BBB",
  CCL: "BBB-", KDP: "BBB-",
  BALL: "BB+", UAL: "BB+", YUM: "BB+", CNC: "BB+",
  LYV: "BB-", COIN: "BB-",

  // 6차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): FIX는 회사채 없음(순현금, 신용라인 무차입)
  FIX: NO_DEBT_RATING,
  PCAR: "A+",
  APD: "A", APO: "A",
  EOG: "A-", AON: "A-",
  ORLY: "BBB+", CRH: "BBB+", PPG: "BBB+",
  SNPS: "BBB", HUM: "BBB", FDX: "BBB", STLD: "BBB", HPE: "BBB", KEYS: "BBB",
  MSI: "BBB-", VST: "BBB-",
  WBD: "BB+",
  TDG: "BB-",

  // 7차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): ODFL는 회사채 없음(무차입), MCHP는 유이자부채 있으나 S&P 미평가(Fitch·Moody's만)
  ODFL: NO_DEBT_RATING, MCHP: UNRATED_REASON,
  NTRS: "A+",
  HIG: "A-", EXC: "A-", RJF: "A-",
  FERG: "BBB+", XEL: "BBB+", CFG: "BBB+", MTB: "BBB+", JBHT: "BBB+", VTR: "BBB+",
  WAB: "BBB", WDAY: "BBB",
  EME: "BBB-", FLEX: "BBB-",
  XYZ: "BB+",
  PCG: "BB",
  CVNA: "B",

  // 8차분 (101~500위 조사, 예산 소진 전 완료분)
  WRB: "A-", PFG: "A-", RL: "A-", EL: "A-", CTVA: "A-",
  NDAQ: "BBB+", DOV: "BBB+", SRE: "BBB+", HONA: "BBB+", ADSK: "BBB+", FITB: "BBB+",
  OKE: "BBB", LHX: "BBB", FANG: "BBB", AZO: "BBB", TTWO: "BBB",
  AXON: "BB+", CPAY: "BB+", ON: "BB+",

  // 9차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): FSLR·WST 모두 회사채 없음(순현금, 부채는 소액/리스 수준)
  FSLR: NO_DEBT_RATING, WST: NO_DEBT_RATING,
  AWK: "A",
  PPL: "A-", AVB: "A-",
  HUBB: "BBB+", CHRW: "BBB+", CNP: "BBB+", PHM: "BBB+",
  FIS: "BBB", FOXA: "BBB", LEN: "BBB", LH: "BBB", IP: "BBB", TSN: "BBB", DLTR: "BBB",
  EIX: "BBB-",
  ZBRA: "BB+",
  ECHO: "CCC+",

  // 10차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): WSM·CPRT는 회사채 없음(순현금·무차입), CTSH는 term loan 있으나 S&P 미평가
  WSM: NO_DEBT_RATING, CPRT: NO_DEBT_RATING, CTSH: UNRATED_REASON,
  SNA: "A-", ATO: "A-",
  AEE: "BBB+", DTE: "BBB+", RF: "BBB+", DVN: "BBB+", EG: "BBB+", ES: "BBB+", HBAN: "BBB+", FE: "BBB+",
  STZ: "BBB", KEY: "BBB", DG: "BBB", GIS: "BBB", HPQ: "BBB",
  Q: "BB+",

  // 11차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): GRMN·FAST·TER는 회사채 없음(순현금), IDXX는 사모 senior notes 있으나 S&P 미평가, CIEN은 S&P BB+ 확인(2025-01)
  GRMN: NO_DEBT_RATING, FAST: NO_DEBT_RATING, TER: NO_DEBT_RATING, IDXX: UNRATED_REASON, CIEN: "BB+",
  NKE: "A+",
  ACGL: "A", BKR: "A",
  ETR: "BBB+", DHI: "BBB+", CARR: "BBB+", D: "BBB+",
  ROK: "A-", O: "A-",
  TRGP: "BBB", EW: "BBB",
  DAL: "BBB-",
  IQV: "BB+",
  LITE: "B",

  // 12차분 (101~500위 조사, 예산 소진 전 완료분)
  // 재조사(2026-08): JKHY는 회사채 없음(소액 리볼버뿐), COO·TYL은 유이자부채(전환사채 등) 있으나 S&P 미평가, LULU는 S&P BBB 확인
  JKHY: NO_DEBT_RATING, COO: UNRATED_REASON, TYL: UNRATED_REASON, LULU: "BBB",
  GL: "A",
  KIM: "A-", MAA: "A-",
  BBY: "BBB+", DOC: "BBB+",
  MAS: "BBB", TXT: "BBB", AIZ: "BBB", ALLE: "BBB",
  AKAM: "BBB-", HST: "BBB-", NWSA: "BBB-", ALB: "BBB-",
  GNRC: "BB+",
  TKO: "B+",

  // 13차분 (101~500위 재조사분)
  // 재조사(2026-08): ERIE는 회사채 없음(무차입, 보험사라 AM Best만 평가)
  ERIE: NO_DEBT_RATING,
  BG: "A-",
  CMS: "BBB+", IEX: "BBB+", NI: "BBB+", DD: "BBB+", EVRG: "BBB+",
  AMCR: "BBB", AVY: "BBB", HAS: "BBB", LYB: "BBB", SBAC: "BBB", BR: "BBB",
  EXE: "BBB-", FDXF: "BBB-", GPN: "BBB-", BAX: "BBB-",
  VTRS: "BB+", CHTR: "BB+",

  // 14차분 (101~500위 재조사분)
  // 재조사(2026-08): SMCI는 전환사채 약 $4.8B 보유하나 S&P 발행자 등급 미평가
  SMCI: UNRATED_REASON,
  BEN: "A",
  SWK: "BBB+", IVZ: "BBB+", LNT: "BBB+",
  INVH: "BBB", WY: "BBB", ROL: "BBB", SJM: "BBB", CF: "BBB",
  GPC: "BBB-", APA: "BBB-", NWS: "BBB-", CDW: "BBB-", HII: "BBB-", LDOS: "BBB-", J: "BBB-",
  PTC: "BB+",
  GEN: "BB",

  // 15차분 (101~500위 재조사분)
  // 재조사(2026-08): DECK·ALGN은 회사채 없음(순현금), CSGP·FDS는 유이자부채(senior notes) 있으나 S&P 미평가
  DECK: NO_DEBT_RATING, ALGN: NO_DEBT_RATING, CSGP: UNRATED_REASON, FDS: UNRATED_REASON,
  REG: "A-", HRL: "A-", CPT: "A-",
  CLX: "BBB+", UDR: "BBB+", PNW: "BBB+",
  SOLV: "BBB", MKC: "BBB", RVTY: "BBB",
  TRMB: "BBB-", AES: "BBB-",
  CRL: "BB+",
  WYNN: "BB-",
  DVA: "BB", GDDY: "BB",

  // 16차분 (101~500위 재조사분)
  // 재조사(2026-08): EXPD·INCY·TPL·MRNA 모두 회사채 없음(순현금, 부채는 리스/소액 수준)
  EXPD: NO_DEBT_RATING, INCY: NO_DEBT_RATING, TPL: NO_DEBT_RATING, MRNA: NO_DEBT_RATING,
  TROW: "A+", L: "A",
  ULTA: "BBB", SW: "BBB", VLTO: "BBB", DRI: "BBB", FOX: "BBB", IFF: "BBB",
  BRO: "BBB-", STE: "BBB-",
  NRG: "BB",

  // 17차분 (16차분에서 접속 차단으로 보류했던 종목 재조사)
  // 재조사(2026-08): FFIV(F5)는 회사채 없음(무차입 기조)
  FFIV: NO_DEBT_RATING,
  PKG: "BBB", FTV: "BBB",
  DOW: "BBB-", // S&P 2026-02-18 BBB→BBB- 하향(부정적)

  // 한국인 인기(서학개미) 개별주 조사분 (2026-08, 대부분 S&P500 미편입)
  // 실제 S&P 발행자 등급 확인:
  TSM: "AA-", BABA: "A+",
  DKNG: "BB", SNAP: "BB-",
  MSTR: "B-", // 스트래티지(구 마이크로스트래티지) — 비트코인 전략, S&P B- 정크
  // 순현금·무차입이라 S&P 등급 자체가 없음 → 회사채 없음(2점):
  ARM: NO_DEBT_RATING, IONQ: NO_DEBT_RATING, PDD: NO_DEBT_RATING, LI: NO_DEBT_RATING,
  CELH: NO_DEBT_RATING, GME: NO_DEBT_RATING, RDDT: NO_DEBT_RATING,
  // 유이자부채(회사채·전환사채 등)는 있으나 S&P 발행자 등급 없음 → 미평가(1점):
  HOOD: UNRATED_REASON, CPNG: UNRATED_REASON, SOFI: UNRATED_REASON,
  RIVN: UNRATED_REASON, NIO: UNRATED_REASON, LCID: UNRATED_REASON,
  RKLB: UNRATED_REASON, RBLX: UNRATED_REASON, U: UNRATED_REASON,
  XPEV: UNRATED_REASON, AFRM: UNRATED_REASON,
};

// S&P 신용등급 문자를 0~4점으로 환산. BBB 및 그 이하 등급은 0점
// 국내(한국) 등급 문자도 표기가 동일(AAA/AA+/.../BBB+)해서 이 표를 그대로 재사용
const CREDIT_RATING_SCORE = {
  AAA: 4, "AA+": 3.5, AA: 3, "AA-": 2.5, "A+": 2, A: 1.5, "A-": 1, "BBB+": 0.5,
};

// 한국(코스피/코스닥) 종목 신용등급 데이터 — data/kr-credit-rating.json에서 비동기 로드.
// 국내 3대 신평사(한국기업평가/한국신용평가/NICE신용평가) 기준 실측 데이터. computeRiskScore는 동기 함수라
// fetch 완료 전에 호출되면 이 맵이 비어 있을 수 있는데, 그 경우 목록없음과 동일하게 중립(1점) 처리됨(그래도
// 페이지 로드 직후 로컬 정적 파일이라 사실상 항상 사용 시점 전에 로딩이 끝남).
let KR_CREDIT_RATING_MAP = {};
let KR_PREFERRED_SHARE_MAP = {};
// 한글 종목명 → 티커 역매핑(검색창에 "삼성전자"처럼 한글명을 직접 입력하고 바로 엔터 쳤을 때 resolveKoreanTicker가 사용)
const KR_NAME_TO_TICKER = {};
const krCreditRatingReady = fetch("data/kr-credit-rating.json", { cache: "no-store" })
  .then((res) => res.json())
  .then((data) => {
    KR_CREDIT_RATING_MAP = data.ratings || {};
    KR_PREFERRED_SHARE_MAP = data._preferredShareMap || {};
    // 신용등급 리서치 과정에서 이미 확보한 597개 종목의 실제 한글 종목명을 TICKER_TO_KOREAN_NAME(아래에서 정의)에
    // 합쳐서, 코스피/코스닥 종목이 검색결과·순위표·차트 제목 등에서 숫자 티커 대신 한글명으로 표시되게 함.
    for (const [tk, entry] of Object.entries(KR_CREDIT_RATING_MAP)) {
      if (entry && entry.name && !TICKER_TO_KOREAN_NAME[tk]) TICKER_TO_KOREAN_NAME[tk] = entry.name;
      if (entry && entry.name && !KR_NAME_TO_TICKER[entry.name]) KR_NAME_TO_TICKER[entry.name] = tk;
    }
  })
  .catch(() => {});

function isKrTicker(symbol) {
  return typeof symbol === "string" && (symbol.endsWith(".KS") || symbol.endsWith(".KQ"));
}

// 야후의 quote.exchDisp/meta.fullExchangeName이 한국 종목은 "Korea"로 뭉뚱그려 나와서, 접미사로 코스피/코스닥을 직접 구분
function krExchangeName(symbol) {
  if (typeof symbol !== "string") return null;
  if (symbol.endsWith(".KS")) return "코스피";
  if (symbol.endsWith(".KQ")) return "코스닥";
  return null;
}


// 투자등급(신용등급) + 벤치마크 지수 대비 모멘텀 + 순이익률 + 시가총액 가점을 조합한 참고용 투자 안정성 점수
// (10점 만점, 높을수록 위험이 낮음). 미국 종목은 S&P500·한국 종목은 KOSPI200을 벤치마크로 사용(kospi200Return 필요).
function computeRiskScore(metrics, sp500Return, kospi200Return) {
  const { symbol, oneYearReturn, netIncome, revenue, marketCap, currency } = metrics;
  const isKr = isKrTicker(symbol);
  const benchmarkReturn = isKr ? kospi200Return : sp500Return;

  // 1) 투자등급 (0~4점) — 미국은 S&P, 한국(.KS/.KQ)은 국내 3대 신평사 기준.
  // AAA 4점, AA+ 3.5점, AA 3점, AA- 2.5점, A+ 2점, A 1.5점, A- 1점, BBB+ 0.5점, BBB 이하 0점
  // 미국은 회사채 자체가 없는 종목 2점, 미평가·목록 미포함 둘 다 1점(UNRATED_REASON)이지만,
  // 한국은 "회사채없음"(무차입 경영으로 신용평가 자체가 불필요할 만큼 우량한 경우가 많음) 4점 만점 처리,
  // "미평가"(실제 검색했으나 등급 미확인) 0점 / 조사 범위 밖(목록 자체에 없음) 1점으로 구분
  // — 한국 쪽은 kr-credit-rating.json의 _scoreScale과 다르게 사용자 지정으로 회사채없음만 4점 상향.
  let creditScore = 1;
  let rating;
  if (symbol && isKrTicker(symbol)) {
    const krSymbol = KR_PREFERRED_SHARE_MAP[symbol] || symbol;
    const krEntry = KR_CREDIT_RATING_MAP[krSymbol];
    if (krEntry) {
      rating = krEntry.rating;
      if (rating === "회사채없음") {
        creditScore = 4;
      } else if (rating === "미평가") {
        creditScore = 0;
      } else {
        creditScore = CREDIT_RATING_SCORE[rating] !== undefined ? CREDIT_RATING_SCORE[rating] : 0;
      }
    }
  } else {
    rating = symbol ? TICKER_CREDIT_RATING[symbol] : undefined;
    if (rating === NO_DEBT_RATING) {
      creditScore = 2;
    } else if (rating === UNRATED_REASON) {
      creditScore = 1;
    } else if (rating !== undefined) {
      creditScore = CREDIT_RATING_SCORE[rating] !== undefined ? CREDIT_RATING_SCORE[rating] : 0;
    }
  }

  // 2) 벤치마크 지수 대비 모멘텀 (0~2점) — 벤치마크 연 수익률과의 차이(절대값)가 0%p면 만점,
  // 200%p 이상 벌어지면 0점 (50%p 멀어질 때마다 0.5점 감점, 선형). 미국은 S&P500, 한국은 KOSPI200.
  let marketScore = 1;
  let relDiff = null;
  if (oneYearReturn !== null && benchmarkReturn !== null && benchmarkReturn !== undefined) {
    relDiff = Math.abs(benchmarkReturn - oneYearReturn);
    marketScore = clamp(2 * (1 - relDiff / 200), 0, 2);
  }

  // 3) 순이익률 = 순이익÷매출 (0~2점). 적자(음수 순이익률)는 무조건 0점.
  // 미국: 0%는 1/3점, 10%p마다 1/3점씩 늘어 50% 이상이면 만점(사용자 지정, 완만한 곡선).
  // 한국: 0%는 0점부터 시작해 35% 이상이면 만점(사용자 지정, 미국보다 가파른 선형).
  let marginScore = 1;
  let netMargin = null;
  if (revenue !== null && revenue > 0 && netIncome !== null) {
    netMargin = netIncome / revenue;
    if (netMargin < 0) {
      marginScore = 0;
    } else if (isKr) {
      marginScore = clamp((netMargin / 0.35) * 2, 0, 2);
    } else {
      marginScore = clamp((2 / 3) * (0.5 + netMargin * 5), 0, 2);
    }
  }

  // 4) 시가총액 가점 (0~2점) — 미국은 시가총액 ÷ 미국 시장 전체 시가총액 추정치(VTSAX 등 인덱스펀드 예상 비중),
  // 한국은 KODEX 200(코스피200 추종 ETF) 내 이 종목의 편입비중. 6%(미국)·3%(한국) 이상이면 만점, 0%면 0점,
  // 그 사이는 선형. 데이터를 신뢰할 수 없는 경우(N/A)는 0.1점 처리
  let vtsaxScore = 0.1;
  let vtsaxWeightPct = null;
  if (isKr) {
    const krSymbol = KR_PREFERRED_SHARE_MAP[symbol] || symbol;
    const weightPct = KODEX200_WEIGHTS[krSymbol];
    if (weightPct !== undefined) {
      vtsaxWeightPct = weightPct;
      vtsaxScore = clamp((weightPct / 3) * 2, 0, 2);
    } else {
      vtsaxWeightPct = 0;
      vtsaxScore = 0; // KODEX 200 미편입 종목은 0점(사용자 지정)
    }
  } else if (marketCap !== undefined && marketCap !== null && (!currency || currency === "USD")) {
    vtsaxWeightPct = (marketCap / US_TOTAL_MARKET_CAP_ESTIMATE) * 100;
    vtsaxScore = clamp((vtsaxWeightPct / 6) * 2, 0, 2);
  }

  const total = Math.round(clamp(creditScore + marketScore + marginScore + vtsaxScore, 0, 10) * 10) / 10;
  return {
    total,
    creditScore,
    rating: rating || null,
    marketScore,
    marginScore,
    relDiff,
    benchmarkReturn,
    netMargin,
    vtsaxScore,
    vtsaxWeightPct,
  };
}

// ---------- Wikipedia 헬퍼 (프록시 불필요, 공식 CORS 지원) ----------
// 한국어 위키백과 문서가 있으면 그대로 사용하고, 없으면 영문 요약을 번역해서 반환
// ---------- 종목 개요 DB(2026-09-11) ----------
// 위키백과 검색은 대기업만 잘 맞고 중소형주·신규 상장주는 문서가 없어 개요가 통째로 비었다(사용자 지적).
// 그래서 회사가 직접 신고·공시한 자료로 만든 개요를 먼저 쓰고, 없을 때만 위키백과로 넘어간다.
// (한국=거래소 상장법인목록의 업종·주요제품, 미국=야후 assetProfile 사업설명 — batch: fetch-company-overview.ps1)
let companyOverviewDbPromise = null;
function getCompanyOverviewDb() {
  if (!companyOverviewDbPromise) {
    companyOverviewDbPromise = fetch("data/company-overview.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then((j) => (j && j.overviews) || {})
      .catch(() => {
        companyOverviewDbPromise = null; // 실패는 캐시하지 않음
        return {};
      });
  }
  return companyOverviewDbPromise;
}
// 코스피/코스닥 구분 없이 6자리 코드만 아는 경우가 있어 .KS/.KQ 양쪽을 다 찾아본다
async function getCompanyOverview(symbol) {
  if (!symbol) return null;
  const db = await getCompanyOverviewDb();
  if (db[symbol]) return db[symbol];
  const bare = symbol.replace(/\.(KS|KQ)$/, "");
  return db[`${bare}.KS`] || db[`${bare}.KQ`] || null;
}

async function getBusinessSummaryKo(companyName) {
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(companyName)}&limit=1&namespace=0&format=json&origin=*`
  );
  const searchData = await searchRes.json();
  const enTitle = searchData && searchData[1] && searchData[1][0];
  if (!enTitle) throw new Error("위키백과에서 관련 문서를 찾지 못했습니다.");

  let koTitle = null;
  try {
    const llRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=ko&titles=${encodeURIComponent(enTitle)}&format=json&origin=*`
    );
    const llData = await llRes.json();
    const pages = llData && llData.query && llData.query.pages;
    const page = pages && Object.values(pages)[0];
    koTitle = (page && page.langlinks && page.langlinks[0] && page.langlinks[0]["*"]) || null;
  } catch {
    koTitle = null;
  }

  if (koTitle) {
    try {
      const koRes = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(koTitle)}`);
      if (koRes.ok) {
        const koData = await koRes.json();
        if (koData.extract) return extractFirstSentence(koData.extract);
      }
    } catch {
      // 한국어 문서 조회 실패 시 아래 영문 요약 번역으로 폴백
    }
  }

  const enRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enTitle)}`);
  if (!enRes.ok) throw new Error("위키백과 요약을 가져오지 못했습니다.");
  const enData = await enRes.json();
  const enSentence = extractFirstSentence(enData.extract || "");
  return translateToKorean(enSentence);
}

// ---------- 번역 헬퍼 (프록시 불필요, Google 실패 시 MyMemory로 폴백) ----------
async function translateToKorean(text) {
  if (!text) return "";
  try {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=" + encodeURIComponent(text);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const combined = (data[0] || []).map((seg) => seg[0]).join("");
      if (combined) return combined;
    }
  } catch {
    // Google 실패 시 아래 MyMemory로 폴백
  }
  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|ko";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) return data.responseData.translatedText;
    }
  } catch {
    // 둘 다 실패하면 원문 그대로 반환
  }
  return text;
}

// ---------- S&P500 종목 목록 (위키백과, 프록시 불필요) ----------
// 세션 내에서 한 번만 조회해 재사용
let sp500TickersPromise = null;
function getSP500Tickers() {
  if (!sp500TickersPromise) {
    sp500TickersPromise = (async () => {
      const title = "List of S&P 500 companies";
      const url =
        "https://en.wikipedia.org/w/api.php?action=parse&page=" +
        encodeURIComponent(title) +
        "&prop=wikitext&section=1&format=json&origin=*";
      const res = await fetch(url);
      const data = await res.json();
      const text = data && data.parse && data.parse.wikitext && data.parse.wikitext["*"];
      if (!text) throw new Error("S&P500 종목 목록을 가져오지 못했습니다.");

      const symbols = [];
      const re = /\{\{\w+Symbol\|([A-Za-z0-9.\-]+)\}\}/g;
      let m;
      while ((m = re.exec(text))) {
        symbols.push(m[1].toUpperCase());
      }
      if (symbols.length === 0) throw new Error("S&P500 종목 목록을 파싱하지 못했습니다.");
      return [...new Set(symbols)];
    })().catch((e) => {
      sp500TickersPromise = null; // 실패 시 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return sp500TickersPromise;
}

// S&P500 종목을 "시가총액 상위 약 30개 먼저, 나머지는 원래 순서"로 재배열한 목록 — 가치평가·추세평가 탭에서
// 처음에 관심도 높은 대형주부터 빠르게 보여주기 위한 용도(시가총액 정렬 전용 스크리너는 인증이 필요해 막혀 있어서,
// 여러 활발한 종목 스크리너 결과를 합쳐 시가총액 내림차순으로 근사)
let sp500PriorityOrderPromise = null;
function getSP500PriorityOrder() {
  if (!sp500PriorityOrderPromise) {
    sp500PriorityOrderPromise = (async () => {
      const [allTickers, screenerResults] = await Promise.all([
        getSP500Tickers(),
        Promise.all(
          ["most_actives", "day_gainers", "day_losers", "undervalued_large_caps", "growth_technology_stocks"].map((id) =>
            yahooScreener(id, 100).catch(() => null)
          )
        ),
      ]);
      const sp500Set = new Set(allTickers);
      const marketCapBySymbol = new Map();
      for (const data of screenerResults) {
        const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
        for (const q of quotes) {
          if (!q || !q.symbol || !sp500Set.has(q.symbol)) continue;
          const existing = marketCapBySymbol.get(q.symbol);
          if (existing === undefined || (q.marketCap || 0) > existing) marketCapBySymbol.set(q.symbol, q.marketCap || 0);
        }
      }
      const topByMarketCap = [...marketCapBySymbol.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([symbol]) => symbol)
        .slice(0, 30);
      const topSet = new Set(topByMarketCap);
      const rest = allTickers.filter((t) => !topSet.has(t));
      return [...topByMarketCap, ...rest];
    })().catch((e) => {
      sp500PriorityOrderPromise = null;
      throw e;
    });
  }
  return sp500PriorityOrderPromise;
}

// 동시 실행 개수를 제한하며 배열 각 항목에 비동기 작업을 적용 (프록시 과부하 방지 + 진행률 콜백)
async function mapWithConcurrency(items, limit, worker, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      // 프록시에 요청이 몰리지 않도록 살짝 텀을 둠(부하가 크면 무료 프록시가 일시적으로 요청을 거부함)
      if (current > 0) await sleep(120);
      try {
        results[current] = await worker(items[current], current);
      } catch {
        results[current] = null; // 개별 실패는 건너뛰고 순위 계산에서 제외
      }
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

// ---------- 유틸 ----------
// 한국 원화 금액: "조/억" 단위 표기 — 억 단위로 반올림하고 그 아래(만원 이하)는 표기하지 않음
function fmtKrwCompact(num) {
  const sign = num < 0 ? "-" : "";
  const eok = Math.round(Math.abs(num) / 1e8);
  if (eok === 0) return `${sign}1억원 미만`;
  const jo = Math.floor(eok / 10000);
  const eokRest = eok % 10000;
  if (jo > 0 && eokRest > 0) return `${sign}${jo}조 ${eokRest.toLocaleString()}억원`;
  if (jo > 0) return `${sign}${jo}조원`;
  return `${sign}${eok.toLocaleString()}억원`;
}

function fmtCompactCurrency(num, currency = "USD") {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  if (currency === "KRW") return fmtKrwCompact(num);
  const abs = Math.abs(num);
  let str;
  if (abs >= 1e12) str = (num / 1e12).toFixed(2) + "T";
  else if (abs >= 1e9) str = (num / 1e9).toFixed(2) + "B";
  else if (abs >= 1e6) str = (num / 1e6).toFixed(2) + "M";
  else str = num.toFixed(2);
  return "$" + str;
}

function fmtPct(num, digits = 1) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(digits)}%`;
}

// 가격 표시: 미국은 "$" 접두사, 한국은 만원 단위 축약(2026-08-31 사용자 확정) —
// 1만원 이상은 "100.2만원"(만원 단위 소수 1자리), 1만원 미만은 "9,850원"처럼 원 단위 그대로
function fmtPrice(value, currency) {
  if (currency === "KRW") {
    const v = value ?? 0;
    if (Math.abs(v) < 10000) return `${Math.round(v).toLocaleString()}원`;
    const man = Math.round(v / 1000) / 10;
    return `${man.toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`;
  }
  return `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
// 종목(검색) 상세 화면용 가격(2026-09-14 사용자 요청) — 원화도 만원 단위로 반올림하지 않고 "123,400원"처럼 전체 숫자
function fmtPriceFull(value, currency) {
  if (currency === "KRW") return `${Math.round(value ?? 0).toLocaleString()}원`;
  return fmtPrice(value, currency);
}
// EPS(주당순이익)는 값 자체의 정밀도가 중요해 만원 축약 없이 원 단위 그대로 표시
function fmtEpsValue(value, currency) {
  if (currency === "KRW") return `${Math.round(value).toLocaleString()}원`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// 최근 5거래일 중 하루라도 ±10% 이상 급등/급락한 종목에 붙일 이모지(급등 🔥, 급락 ⚠️, 해당 없으면 빈 문자열)
const SURGE_WARNING_TITLE = "최근 5거래일 중 하루라도 ±10% 이상 급등락";
function surgeWarningEmoji(fiveDayExtremes) {
  if (!fiveDayExtremes) return "";
  const { hasSurge, hasPlunge } = fiveDayExtremes;
  if (!hasSurge && !hasPlunge) return "";
  const icons = `${hasSurge ? "🔥" : ""}${hasPlunge ? "⚠️" : ""}`;
  return ` <span class="surge-warn-mark" title="${SURGE_WARNING_TITLE}">${icons}</span>`;
}
// 순위 표 위에 붙이는 경고 이모지 범례 + 연평균 상승/10년월간승률 의미 설명(2026-09-04 상승압력·투자안정 대체)
const SURGE_WARNING_LEGEND = `
  <p class="muted" style="font-size:11px;margin:0 0 4px;opacity:0.65;">🔥 급등 · ⚠️ 급락 — ${SURGE_WARNING_TITLE}</p>
  <p class="muted" style="font-size:11px;margin:0 0 2px;opacity:0.65;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <span>📈 연평균 상승 — 최근 10년 연복리 수익률(CAGR, 매년 몇 %씩 오른 셈)<br>🛡️ 10년월간승률 — 최근 10년 매월 상승 마감한 비율(⚠️=상장 10년 미만)</span>
  </p>
`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// "Inc.", "Corp." 같은 약어의 마침표를 문장 끝으로 오인하지 않도록 보호한 뒤 첫 문장만 추출
function extractFirstSentence(text) {
  if (!text) return "";
  const protectedText = text.replace(/\b(Inc|Corp|Co|Ltd|Jr|Sr|St|vs|U\.S|U\.K)\./g, "$1<DOT>");
  const firstPart = protectedText.split(/(?<=\.)\s+/)[0] || protectedText;
  return firstPart.replace(/<DOT>/g, ".");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// 야후 스타일 한국 티커(005930.KS/.KQ)를 TradingView가 인식하는 "KRX:005930" 형식으로 변환.
// TradingView는 코스피/코스닥 구분 없이 전부 KRX 거래소 하나로 묶여 있어 .KS/.KQ 접미사를 떼고 KRX: 접두사만 붙이면 됨.
function toTradingViewSymbol(symbol) {
  // 코드 형식은 보통 6자리 숫자지만 일부 우선주는 영숫자 혼합 코드를 씀(예: 삼성물산우B=02826K) — 접미사만으로 판별
  if (isKrTicker(symbol)) return `KRX:${symbol.slice(0, -3)}`;
  return symbol.replace(/-/g, ".");
}

// 실시간 시세 차트(TradingView)를 앱 내 전체화면 모달로 띄우기 위한 임베드 위젯 URL
// Yahoo Finance 차트보다 반응 속도가 빠름. TradingView는 클래스주 표기에 "-" 대신 "." 를 쓰므로(예: BRK-B → BRK.B) 변환 필요.
// 검은 배경 + 1년(12M) 기본 범위 + 좌측 그리기 툴바 숨김으로 모바일에서 차트만 크게 보이도록 구성
function tradingViewEmbedUrl(symbol) {
  const config = {
    symbol: toTradingViewSymbol(symbol),
    interval: "D",
    range: "12M",
    theme: "dark",
    style: "1",
    locale: "kr",
    hide_side_toolbar: true,
    save_image: false,
    allow_symbol_change: false,
    backgroundColor: "#000000",
    toolbar_bg: "#000000",
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=kr#${encodeURIComponent(JSON.stringify(config))}`;
}

// TradingView 웹사이트(tradingview.com/symbols/...)의 종목 페이지 URL — 심볼 자체는 존재해도
// 무료 embed-widget으로는 한국거래소(KRX) 데이터를 못 띄워서("이 심볼은 트레이딩뷰에서만 쓸 수 있습니다"
// 라이선스 제약 확인됨, 2026-08) 한국 종목은 이 페이지를 새 탭으로 여는 방식으로 우회
function tradingViewPublicUrl(symbol) {
  return `https://www.tradingview.com/symbols/${toTradingViewSymbol(symbol).replace(":", "-")}/`;
}

function openChartModal(symbol) {
  if (!symbol) return;
  if (isKrTicker(symbol)) {
    window.open(tradingViewPublicUrl(symbol), "_blank", "noopener");
    return;
  }
  el("chartModalTitle").textContent = TICKER_TO_KOREAN_NAME[symbol] || symbol;
  el("chartFrame").src = tradingViewEmbedUrl(symbol);
  el("chartModal").style.display = "flex";
}

function closeChartModal() {
  el("chartModal").style.display = "none";
  el("chartFrame").src = "about:blank";
}

function priceChartLink(symbol, priceHtml) {
  return `<a class="price-chart-link" href="#" data-chart-symbol="${escapeHtml(symbol)}">${priceHtml}</a>`;
}

function setStatus(type, message) {
  if (!message) {
    statusBox.style.display = "none";
    return;
  }
  statusBox.style.display = "block";
  statusBox.className = `status-box ${type}`;
  statusBox.innerHTML = type === "loading" ? `<span class="spinner"></span>${message}` : message;
}

// 카카오톡 등 인앱 브라우저의 자체 하단 툴바가 화면 아래를 덮어 하단 네비가 가려지는 문제 —
// 실제 보이는 영역과 레이아웃 뷰포트의 차이만큼 하단 네비를 위로 올림
(function syncBottomNavToVisualViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const apply = () => {
    const gap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty("--vv-bottom-gap", `${gap}px`);
  };
  vv.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  apply();
})();

// ---------- 고정 헤더 높이 동기화(카테고리 서브툴바가 열리고 닫힐 때마다 본문 padding-top을 다시 맞춤) ----------
function syncHeaderHeight() {
  document.documentElement.style.setProperty("--fixed-header-h", fixedHeader.offsetHeight + "px");
}
window.addEventListener("resize", syncHeaderHeight);
new ResizeObserver(syncHeaderHeight).observe(fixedHeader);
syncHeaderHeight();

// ---------- 스와이프 캐로셀(관심종목/기업가치/주식동향/인사이트) ----------
// 시장·투데이·기업검색은 캐러셀에서 빠지고 companyPanel과 동일한 슬라이드 오버레이 패턴(openMarketPanel 등)으로
// 별도 관리됨 — TAB_ORDER는 실제 스와이프되는 4개 패널만 담당
// 2026-10-08 사용자 요청: 관심종목이 왼쪽에서 들어오는 것처럼 보임 → 인기종목 화면(topranking) 오른쪽에 둬서 오른쪽에서 들어오게
// 2026-10-20: 관심종목·인사이트 패널 삭제 — 별별순위 결과·실적이 쓰는 topranking 패널 하나만 남음
const TAB_ORDER = ["topranking"];
const panels = {
  topranking: el("panelTopRanking"),
};
const tabButtons = {
  topranking: el("tabValuationBtn"),
};
const searchTabBtn = el("searchTabBtn");
// "시장동향"은 "기업가치"(topranking)와 같은 패널을 공유하는 두 번째 상단 버튼이라 TAB_ORDER엔 안 들어가고
// activateRankingGroup()이 직접 active 상태와 렌더링을 처리함
const tabTrendBtn = el("tabTrendBtn");
const valuationButtons = {
  revenue: el("valuationRevenueBtn"),
  cashFlow: el("valuationCashFlowBtn"),
  netIncome: el("valuationNetIncomeBtn"),
  eps: el("valuationEpsBtn"),
  per: el("valuationPerBtn"),
  stability: el("valuationStabilityBtn"),
  marketCap: el("valuationMarketCapBtn"),
  operatingMargin: el("valuationOperatingMarginBtn"),
  roe: el("valuationRoeBtn"),
  debtRatio: el("valuationDebtRatioBtn"),
  week52Low: el("valuationWeek52LowBtn"),
};
const trendButtons = {
  volume: el("trendVolumeBtn"),
  plunge: el("trendPlungeBtn"),
  surge: el("trendSurgeBtn"),
  dividend: el("trendDividendBtn"),
  pressure: el("trendPressureBtn"),
  usEtf: el("trendUsEtfBtn"),
  krEtf: el("trendKrEtfBtn"),
};
let activeTabIndex = 0;

// 패널 i의 위치 = (i - 활성 인덱스 + 드래그 진행률) * 100% — offsetFraction=0이면 정지 상태
function layoutPanels(offsetFraction = 0) {
  TAB_ORDER.forEach((key, i) => {
    panels[key].style.transform = `translateX(${(i - activeTabIndex + offsetFraction) * 100}%)`;
  });
}

// 패널마다 콘텐츠 높이가 달라서, 활성 패널의 높이가 바뀔 때마다(비동기 로딩·더보기 등) 뷰포트 높이를 맞춤
function syncCarouselHeight() {
  carouselViewport.style.height = panels[TAB_ORDER[activeTabIndex]].offsetHeight + "px";
}
const carouselResizeObserver = new ResizeObserver(syncCarouselHeight);
TAB_ORDER.forEach((key) => carouselResizeObserver.observe(panels[key]));
// 2026-09-11 사용자 보고(옆 화면이 겹쳐 보임): 화면 폭·방향이 바뀌면 패널 위치(translateX)를 항상 다시 계산해
// 혹시라도 중간 위치에 남아 있던 패널이 제자리로 돌아오게 함 — 높이 동기화만으로는 가로 위치가 안 고쳐짐
function resyncCarousel() {
  layoutPanels(0);
  syncCarouselHeight();
}
window.addEventListener("resize", resyncCarousel);
window.addEventListener("orientationchange", resyncCarousel);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resyncCarousel();
});

function updateTabBarActive() {
  const activeKey = TAB_ORDER[activeTabIndex];
  TAB_ORDER.forEach((key) => tabButtons[key].classList.toggle("active", key === activeKey));
  // tabTrendBtn은 topranking과 패널을 공유하므로 여기선 일단 끄고, activateRankingGroup()이
  // 실제 그룹(기업가치/시장동향)에 맞게 다시 켬
  tabTrendBtn.classList.remove("active");
}

// 헤더의 현재 화면 이름(기업가치/시장동향/인사이트/관심종목) — data-i18n을 같이 갱신해 언어 토글 시 자동 번역되게 함
function setCarouselViewTitle(i18nKey) {
  const titleEl = el("carouselViewTitle");
  if (!titleEl) return;
  titleEl.setAttribute("data-i18n", i18nKey);
  const dict = I18N[i18nKey];
  if (dict) titleEl.textContent = document.documentElement.lang === "en" ? dict.en : dict.ko;
  // 제목줄이 4탭(관심종목/기업가치/시장동향/인사이트)으로 바뀜(2026-08-31) — 현재 화면에 맞춰 활성 탭 표시
  document.querySelectorAll(".fh-tab").forEach((b) => b.classList.toggle("active", b.dataset.fhtab === i18nKey));
}

// 사전(I18N) 키가 없는 제목을 그대로 넣을 때(핵심지표 "+순위"로 들어온 항목 이름 등, 2026-09-16)
function setCarouselViewTitleText(text) {
  const titleEl = el("carouselViewTitle");
  if (!titleEl) return;
  titleEl.removeAttribute("data-i18n");
  titleEl.textContent = text;
}

function switchTab(index) {
  index = Math.max(0, Math.min(TAB_ORDER.length - 1, index));
  const switchKey = TAB_ORDER[index];
  window.__onWatchlistView = false; // 관심종목 화면 삭제(2026-10-20)
  syncSectionHeader();
  // topranking은 기업가치/시장동향 중 어느 쪽인지 activateRankingGroup/goToRankingEntry가 정함
  activeTabIndex = index;
  TAB_ORDER.forEach((key) => panels[key].classList.add("snapping"));
  layoutPanels(0);
  updateTabBarActive();
  syncCarouselHeight();
  window.setTimeout(() => {
    TAB_ORDER.forEach((key) => panels[key].classList.remove("snapping"));
  }, 320);
  ensureTabLoaded(TAB_ORDER[index]);
}

TAB_ORDER.forEach((key, i) => {
  if (key === "topranking") return; // 기업가치/시장동향은 activateRankingGroup 전용 핸들러로 처리(아래 RANKING_ENTRIES 섹션)
  tabButtons[key].addEventListener("click", () => switchTab(i));
});
searchTabBtn.addEventListener("click", openSearchWizard);

// ---------- 탭별 데이터 로딩 캐싱: 한 번 로딩된 탭은 다시 방문해도 재요청하지 않음 ----------
const TAB_LOADERS = {
  // 기업가치/시장동향은 activateRankingGroup()이 클릭될 때마다 매번 직접 그룹/서브내비/첫 항목을 처리하므로 별도 캐시 로더 불필요
  topranking: () => {},
};
const tabLoadPromises = {};
function ensureTabLoaded(key) {
  if (tabLoadPromises[key]) return tabLoadPromises[key];
  const loader = TAB_LOADERS[key];
  tabLoadPromises[key] = loader ? Promise.resolve().then(loader).catch(() => {}) : Promise.resolve();
  return tabLoadPromises[key];
}

// ---------- 가로 스와이프(포인터 드래그로 손가락을 따라 화면이 끌려오는 캐로셀) ----------
// 2026-08-31 사용자 요청: 관심종목~인사이트 화면을 좌우 스와이프로 넘기는 동작 비활성화 — 상단 4탭 버튼으로만 전환
const CAROUSEL_SWIPE_ENABLED = false;
let dragState = null;

carouselViewport.addEventListener("pointerdown", (e) => {
  if (!CAROUSEL_SWIPE_ENABLED) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const now = performance.now();
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    lastX: e.clientX,
    // prevX/prevMoveTime은 "떼기 직전 마지막 구간"의 속도만 따로 재기 위한 값(전체 평균 속도로 재면
    // 손을 댄 뒤 잠깐 멈췄다가 빠르게 튕기는 실제 스와이프에서 속도가 과소평가되어 스냅이 안 먹힘)
    prevX: e.clientX,
    startTime: now,
    prevMoveTime: now,
    axisLocked: false,
    isHorizontal: false,
    viewportWidth: carouselViewport.clientWidth,
  };
});

carouselViewport.addEventListener("pointermove", (e) => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.axisLocked) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    dragState.axisLocked = true;
    dragState.isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (dragState.isHorizontal) {
      try {
        carouselViewport.setPointerCapture(dragState.pointerId);
      } catch {
        // 일부 브라우저에서 캡처가 실패해도 드래그 추적 자체는 계속 진행
      }
    }
  }
  if (!dragState.isHorizontal) return;
  e.preventDefault();
  dragState.prevX = dragState.lastX;
  dragState.prevMoveTime = dragState.lastMoveTime ?? dragState.startTime;
  dragState.lastX = e.clientX;
  dragState.lastMoveTime = performance.now();
  let offsetFraction = dx / dragState.viewportWidth;
  const atStart = activeTabIndex === 0 && offsetFraction > 0;
  const atEnd = activeTabIndex === TAB_ORDER.length - 1 && offsetFraction < 0;
  if (atStart || atEnd) offsetFraction *= 0.35; // 끝단에서는 고무줄처럼 저항감을 줌
  layoutPanels(offsetFraction);
});

function endDrag(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  if (dragState.isHorizontal) {
    const dx = dragState.lastX - dragState.startX; // 전체 이동거리(먼 거리 스와이프 판정용)
    // 속도는 손을 뗀 직전 마지막 구간만으로 계산(전체 평균으로 재면 누르고 잠깐 멈췄다 튕기는
    // 실제 스와이프에서 속도가 희석돼 플릭으로 인식되지 않는 문제가 있었음)
    const recentDx = dragState.lastX - dragState.prevX;
    const recentElapsed = Math.max(1, dragState.lastMoveTime - dragState.prevMoveTime);
    const velocity = recentDx / recentElapsed; // px/ms
    const threshold = dragState.viewportWidth * 0.18;
    const isFastFlick = Math.abs(dx) > 10 && Math.abs(velocity) > 0.35; // 최소 이동거리 없이 속도만으로 판정되지 않도록 방지
    let target = activeTabIndex;
    if (dx <= -threshold || (isFastFlick && velocity < 0)) target = activeTabIndex + 1;
    else if (dx >= threshold || (isFastFlick && velocity > 0)) target = activeTabIndex - 1;
    switchTab(target); // target이 현재 인덱스와 같으면 제자리로 스냅(고무줄 복귀)
  }
  dragState = null;
}
carouselViewport.addEventListener("pointerup", endDrag);
carouselViewport.addEventListener("pointercancel", endDrag);

// ---------- 검색 오버레이(틀고정 검색"버튼"을 누르면 오른쪽에서 전체화면으로 슬라이드인) ----------
const RECENT_SEARCH_KEY = "recentSearches";
const RECENT_SEARCH_MAX = 5;
const POPULAR_SEARCH_MAX = 5;

function getRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function addRecentSearch(symbol) {
  const next = [symbol, ...getRecentSearches().filter((s) => s !== symbol)].slice(0, RECENT_SEARCH_MAX);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
}
// 검색 오버레이의 최근/인기 검색 한 행 — 로고+이름/티커 왼쪽(누르면 종목 이동), 오른쪽은 가격 대신 관심종목 추가 별 버튼
function searchResultRowHtml(symbol) {
  const etfParts = etfDisplayParts(symbol); // ETF는 한국=상품명 먼저, 미국=티커 먼저(2026-09-13)
  const displayName = etfParts ? etfParts.main : TICKER_TO_KOREAN_NAME[symbol] || symbol;
  const watchlisted = isWatchlisted(symbol);
  return `
    <div class="search-result-row">
      <button type="button" class="search-result-left" data-symbol="${escapeHtml(symbol)}">
        ${tickerLogoHtml(symbol)}
        <span class="search-result-text">
          <span class="search-result-name">${escapeHtml(displayName)}${sectionMarkHtml(symbol)}</span>
          <span class="search-result-sub">${escapeHtml(etfParts ? (etfParts.isKr ? `${etfParts.sub} · ${symbol}` : etfParts.sub || symbol) : symbol)}</span>
        </span>
      </button>
      <button type="button" class="search-watch-btn${watchlisted ? " active" : ""} ${isKrTicker(symbol) ? "market-kr" : "market-us"}" data-watch-symbol="${escapeHtml(symbol)}" aria-label="관심종목 추가">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="${watchlisted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7l2.85 6.02 6.65.68-4.98 4.5 1.46 6.53L12 17.9l-5.98 3.53 1.46-6.53-4.98-4.5 6.65-.68L12 2.7z" /></svg>
      </button>
    </div>`;
}
function renderRecentSearches() {
  const recent = getRecentSearches();
  recentSearchList.innerHTML = recent.length
    ? recent.map(searchResultRowHtml).join("")
    : `<p class="muted search-chip-empty">최근 검색한 티커가 없습니다.</p>`;
}
// 인기 검색 = 전체 방문자의 최근 24시간 검색 로그를 Worker(KV)에 집계해 받아옴(navigateToTicker에서 /search-log로 매번 기록)
let popularSearchCache = null;
async function renderPopularSearches() {
  if (popularSearchCache) {
    popularSearchList.innerHTML = popularSearchCache.map((r) => searchResultRowHtml(r.symbol)).join("");
    return;
  }
  try {
    const res = await fetch(`${AUTH_ORIGIN}/search-popular`);
    const data = await res.json();
    const popular = (data && data.popular) || [];
    if (popular.length === 0) {
      popularSearchList.innerHTML = `<p class="muted search-chip-empty">아직 인기 검색어가 없습니다.</p>`;
      return;
    }
    popularSearchCache = popular.slice(0, POPULAR_SEARCH_MAX);
    popularSearchList.innerHTML = popularSearchCache.map((r) => searchResultRowHtml(r.symbol)).join("");
  } catch {
    popularSearchList.innerHTML = `<p class="muted search-chip-empty">인기 검색을 불러오지 못했습니다.</p>`;
  }
}
// 검색 성공 시 서버에 기록(실패해도 UI에 영향 없도록 조용히 무시) — 최근 24시간 인기 검색어 집계용
// kind: search(검색·상세 열기) / click(시장 지도에서 종목 클릭) / watch(관심 등록) — 실시간 랭킹 조회수 = 이 셋의 합(24시간, IP당 종목별 최대 10회는 서버가 처리)
function logSearchEvent(symbol, kind) {
  fetch(`${AUTH_ORIGIN}/search-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, kind: kind || "search" }),
  }).catch(() => {});
}
function openSearchOverlay() {
  searchOverlay.style.display = "flex";
  requestAnimationFrame(() => searchOverlay.classList.add("open"));
  renderRecentSearches();
  renderPopularSearches();
  tickerInput.focus();
  // 국내 ETF 상품명 검색·표기용 목록을 미리 받아 둠(캐시) — 받아지면 최근/인기 검색 줄의 ETF 이름도 다시 그림
  getKrEtfFullList()
    .then(() => {
      if (searchOverlay.style.display !== "none") {
        renderRecentSearches();
        renderPopularSearches();
      }
    })
    .catch(() => {});
}
function closeSearchOverlay() {
  searchOverlay.classList.remove("open");
  window.setTimeout(() => {
    searchOverlay.style.display = "none";
    tickerInput.value = "";
    mainTickerSearchBar.hideSuggest();
  }, 280);
}
searchOpenBtn.addEventListener("click", openSearchOverlay);
// 2026-10-20 사용자 요청: 별별순위·실적·신기술 어디서든 돋보기 옆 별 → 시장(지도)의 관심목록(본체의 옛 관심종목 화면은 삭제)
// 2026-10-21 사용자 요청: 지금 보던 화면을 유지한 채 관심목록만 위에 겹쳐 띄움(시장 지도로 이동하지 않음)
let ovFrame = null;
function closeOvFrame() {
  if (ovFrame) {
    ovFrame.remove();
    ovFrame = null;
  }
}
function openOvFrame(src) {
  closeOvFrame();
  const f = document.createElement("iframe");
  f.className = "ov-frame";
  f.id = "ovFrame";
  f.style.display = "block";
  f.setAttribute("title", "관심목록");
  f.src = src;
  document.body.appendChild(f);
  ovFrame = f;
}
function openMapWatchlist() {
  const market = appSectionMode === "etf" ? "etf" : appSectionMode === "crypto" ? "crypto" : getWatchlistActiveMarket() === "KR" ? "domestic" : "overseas";
  openOvFrame(`sector-map/index.html?market=${market}&ov=watchlist`);
}
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.mm) return;
  if (e.data.mm === "close") closeOvFrame();
  else if (e.data.mm === "open-ticker" && e.data.symbol) {
    closeOvFrame();
    navigateToTicker(e.data.symbol);
  } else if (e.data.mm === "open-search") {
    closeOvFrame();
    openSearchOverlay();
  }
});
el("watchOpenBtn").addEventListener("click", openMapWatchlist);
el("techWatchBtn").addEventListener("click", openMapWatchlist);
el("techSearchBtn").addEventListener("click", openSearchOverlay);
searchOverlayCloseBtn.addEventListener("click", closeSearchOverlay);
document.addEventListener("click", (e) => {
  const watchBtn = e.target.closest(".search-watch-btn");
  if (watchBtn) {
    toggleWatchlist(watchBtn.dataset.watchSymbol);
    const active = isWatchlisted(watchBtn.dataset.watchSymbol);
    watchBtn.classList.toggle("active", active);
    watchBtn.querySelector("svg").setAttribute("fill", active ? "currentColor" : "none");
    return;
  }
  const row = e.target.closest(".search-result-left");
  if (row) navigateToTicker(row.dataset.symbol);
});

// ---------- 하단 고정 네비게이션(한국주식/미국주식/ETF/비트코인/더보기) — 지도·시장·관심종목은 더보기 패널로 이동(2026-09-01) ----------
// 한국/미국주식도 일반 네비 버튼처럼 취급(2026-08-31 사용자 확정: 다른 화면이 활성일 땐 불이 꺼져야 함)
const bottomNavButtons = {
  more: el("bottomNavMoreBtn"),
  // 2026-10-19 하단 메뉴 개편: 시장 - 별별순위 - 실적 - 신기술 - 더보기(한국/미국/ETF/비트코인 버튼은 숨김 상태로 유지, 화면 전환 코드가 대신 누름)
  map: el("bottomNavMapBtn"),
  rank: el("bottomNavRankBtn"),
  earn: el("bottomNavEarnBtn"),
  tech: el("bottomNavTechBtn"),
};
// 지금 어느 하단 메뉴 화면인지(rank=별별순위, earn=실적, tech=신기술) — var로 둔 이유: 부팅 중 syncSectionHeader가 먼저 불릴 수 있어서(TDZ 방지)
var navMode = null;
function setBottomNavActive(key) {
  // 예전 호출부는 투자군 키(kr/us/etf/crypto)를 넘긴다 — 새 하단 메뉴에선 지금 화면(별별순위/실적)으로 바꿔 켠다
  const k = ["kr", "us", "etf", "crypto"].includes(key) ? navMode || "" : key;
  Object.entries(bottomNavButtons).forEach(([bk, btn]) => btn && btn.classList.toggle("active", bk === k));
}

// ---------- 더보기 패널: 전체화면이 아니라 오른쪽에서 최대 75%까지만 슬라이드인하는 드로어 ----------
const toastEl = el("toast");
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

const morePanel = el("morePanel");
const morePanelBackdrop = el("morePanelBackdrop");
const morePanelCloseBtn = el("morePanelCloseBtn");

function openMorePanel() {
  morePanel.style.display = "block";
  requestAnimationFrame(() => morePanel.classList.add("open"));
}
// 지도 위에 겹쳐 띄운 모드(?ov=1): 부모(지도)에 메시지를 보내 겹침 창을 닫거나 다른 동작을 시킴
const OV_EMBED = document.documentElement.classList.contains("ov-embed");
function ovPost(kind, extra) {
  try {
    parent.postMessage({ mm: kind, ...(extra || {}) }, location.origin);
  } catch (e) {}
}
function closeMorePanel() {
  morePanel.classList.remove("open");
  window.setTimeout(() => {
    morePanel.style.display = "none";
    if (OV_EMBED && !window.__ovKeep && !el("calendarPanel").classList.contains("open") && el("noticeModal").style.display === "none" && el("aboutModal").style.display === "none") ovPost("close");
  }, 280);
}
morePanelBackdrop.addEventListener("click", closeMorePanel);
morePanelCloseBtn.addEventListener("click", closeMorePanel);
// 상단 탭바에서 더보기로 이동한 4개 화면 + 캘린더 — 각 항목을 열면 그 화면만 보이도록 오버레이(시장/캘린더/기업상세)를 먼저 닫음
function showOnlyCarouselView(fn) {
  try {
    closeTabPages();
  } catch {} // 초기화 도중(TAB_PAGES 선언 전)에 불리면 건너뜀
  closeMorePanel();
  closeCompanyPanel();
  closeCalendarPanel();
  navMode = null; // 하단 메뉴(별별순위/실적/신기술) 화면은 각 핸들러가 이 호출 뒤에 다시 지정
  setBottomNavActive(""); // 캐러셀 화면은 하단 네비 어디에도 속하지 않으므로 active 해제
  fn();
  try {
    syncNavHeader();
  } catch {}
}
// 현재 섹션(한국주식/미국주식/ETF/비트코인)에 해당하는 하단 네비 버튼 키 — 상단 탭 전환 시 하단 active 유지용(2026-09-02)
function bottomNavKeyForSection() {
  if (appSectionMode === "etf") return "etf";
  if (appSectionMode === "crypto") return "crypto";
  return getWatchlistActiveMarket() === "KR" ? "kr" : "us";
}
// ---------- 목록 화면 새로고침(2026-09-14 사용자 요청: 위쪽 새로고침 버튼 삭제 → 화면을 아래로 당기면 새로고침) ----------
// 스캔 캐시를 전부 비우고 지금 보고 있는 화면(인기종목·승률·수익률·기업가치 서브항목·IPO 등)을 현시간 기준으로 다시 검색함
function refreshTopRankingView() {
  if (document.querySelector('[data-scanning="1"]')) {
    showToast("검색 중입니다. 잠시만 기다려주세요");
    return false;
  }
  if (typeof srRankActive !== "undefined" && srRankActive && typeof fastRankRefresh === "function") {
    showToast("실시간 데이터로 다시 불러옵니다");
    fastRankRefresh(); // 별별순위: 실시간 값을 새로 받아 다시 매김
    return true;
  }
  RANK_SCAN_RESETTERS.forEach((reset) => { try { reset(); } catch {} });
  dividendRiskMetricsCache.clear();
  popularSnapshotResetCaches();
  ipoListDbPromise = null;
  showToast("실시간 데이터로 다시 검색합니다");
  const tab = [...document.querySelectorAll("#fhTabs .fh-tab.active")][0];
  const key = tab ? tab.dataset.fhtab : "";
  if (key === "tab.watchlist") {
    investAnalysisResetCaches();
    wlCompareAt = 0;
  }
  // 기업가치·(주식)미래예측은 탭을 다시 누르면 첫 서브항목으로 돌아가므로, 보고 있던 서브항목을 그대로 다시 실행
  if (key === "tab.valuation" || (key === "tab.trend" && appSectionMode === "stocks")) runRankingEntry(topRankingActiveIdx);
  else if (tab) tab.click();
  return true;
}
// ---------- 상단 탭 좌우 스와이프 + 아래로 당겨 새로고침(목록 화면 #panelTopRanking) ----------
// 2026-09-14 사용자 요청: 스와이프가 끊기는 느낌 → 화면이 손가락을 따라 옆으로 밀리고, 화면 폭의 1/3 이상 밀었을 때만
// 다음/이전 탭으로 넘어가며 새 화면이 반대쪽에서 밀려 들어옴(덜 밀면 제자리로 복귀).
// 가로 스크롤이 되는 영역(칩 줄·넓은 표) 안에서 시작한 가로 제스처는 그 영역 스크롤에 양보한다.
(function initTopRankingGestures() {
  const panel = el("panelTopRanking");
  if (!panel) return;
  const PULL_THRESHOLD = 70;
  const ptr = document.createElement("div");
  ptr.className = "pull-refresh pull-refresh-fixed";
  ptr.setAttribute("aria-hidden", "true");
  ptr.innerHTML = '<span class="pull-refresh-text">↓ 당겨서 새로고침</span>';
  document.body.appendChild(ptr);
  const ptrText = ptr.querySelector(".pull-refresh-text");
  let g = null; // 진행 중인 제스처
  let animating = false;
  const isActiveView = () => TAB_ORDER[activeTabIndex] === "topranking";
  const canScrollX = (node) => {
    for (let n = node; n && n !== panel; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  };
  const visibleTabs = () =>
    [...document.querySelectorAll("#fhTabs .fh-tab")].filter((b) => b.style.display !== "none" && getComputedStyle(b).display !== "none");
  const setPanelX = (px, transition) => {
    panel.style.transition = transition || "none";
    panel.style.transform = `translateX(${px}px)`;
  };
  const restorePanel = () => {
    panel.style.transition = "";
    layoutPanels(0);
  };
  const hidePtr = () => {
    ptr.classList.remove("pull-refresh-visible", "pull-refresh-ready");
    ptr.style.transform = "";
  };

  panel.addEventListener(
    "touchstart",
    (e) => {
      if (animating || e.touches.length !== 1 || !isActiveView()) {
        g = null;
        return;
      }
      const t = e.touches[0];
      g = {
        x: t.clientX,
        y: t.clientY,
        axis: null, // "x" | "y"
        swipeOk: false, // 2026-10-19: 상단 탭 줄이 사라져 좌우 스와이프 화면 전환은 쓰지 않음(당겨서 새로고침만)
        pullOk: (window.scrollY || document.documentElement.scrollTop) <= 0,
        dx: 0,
        pull: 0,
        width: panel.clientWidth || window.innerWidth,
      };
    },
    { passive: true }
  );

  panel.addEventListener(
    "touchmove",
    (e) => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (g.axis === "x" && !g.swipeOk) return (g = null);
        if (g.axis === "y" && !(g.pullOk && dy > 0)) return (g = null);
        if (g.axis === "y") ptr.style.top = `${Math.max(0, el("fixedHeader").getBoundingClientRect().bottom)}px`;
      }
      if (g.axis === "x") {
        if (e.cancelable) e.preventDefault();
        const tabs = visibleTabs();
        const cur = tabs.findIndex((b) => b.classList.contains("active"));
        const blocked = cur < 0 || (dx > 0 && cur === 0) || (dx < 0 && cur === tabs.length - 1);
        g.dx = dx;
        setPanelX(blocked ? dx * 0.25 : dx); // 첫/마지막 탭에서는 고무줄처럼 조금만 밀림
      } else {
        if (e.cancelable) e.preventDefault(); // 브라우저 기본 당겨서 새로고침(페이지 전체 재로딩) 대신 이 화면만 새로고침
        g.pull = Math.min(Math.max(0, dy) * 0.55, PULL_THRESHOLD * 1.5);
        ptr.classList.add("pull-refresh-visible");
        ptr.classList.toggle("pull-refresh-ready", g.pull >= PULL_THRESHOLD);
        ptr.style.transform = `translateY(${g.pull}px)`;
        ptrText.textContent = g.pull >= PULL_THRESHOLD ? "↑ 놓으면 새로고침" : "↓ 당겨서 새로고침";
      }
    },
    { passive: false }
  );

  const endGesture = () => {
    if (!g) return;
    const { axis, dx, pull, width } = g;
    g = null;
    if (axis === "y") {
      if (pull >= PULL_THRESHOLD) {
        ptrText.textContent = "🔄 새로고침 중...";
        ptr.style.transform = `translateY(${PULL_THRESHOLD * 0.6}px)`;
        refreshTopRankingView();
        setTimeout(hidePtr, 900);
      } else hidePtr();
      return;
    }
    if (axis !== "x") return;
    const tabs = visibleTabs();
    const cur = tabs.findIndex((b) => b.classList.contains("active"));
    const next = dx < 0 ? cur + 1 : cur - 1;
    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    if (cur < 0 || Math.abs(dx) < width / 3 || next < 0 || next >= tabs.length) {
      // 1/3 미만이면 제자리로 복귀
      animating = true;
      setPanelX(0, `transform 0.22s ${EASE}`);
      setTimeout(() => {
        restorePanel();
        animating = false;
      }, 240);
      return;
    }
    const dir = dx < 0 ? -1 : 1;
    animating = true;
    setPanelX(dir * width, "transform 0.16s ease-in"); // 현재 화면을 끝까지 밀어냄
    setTimeout(() => {
      tabs[next].click(); // 새 화면 그리기(내부에서 switchTab이 transform을 되돌리므로 바로 아래에서 다시 지정)
      tabs[next].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      setPanelX(-dir * width * 0.4);
      void panel.offsetWidth; // 시작 위치를 먼저 확정해야 트랜지션이 걸림
      setPanelX(0, `transform 0.26s ${EASE}`);
      setTimeout(() => {
        restorePanel();
        animating = false;
      }, 280);
    }, 160);
  };
  panel.addEventListener("touchend", endGesture);
  panel.addEventListener("touchcancel", endGesture);
})();
el("morePanelWatchlistBtn").addEventListener("click", () => {
  if (OV_EMBED) {
    ovPost("open-watchlist");
    return;
  }
  closeMorePanel();
  openMapWatchlist();
});
el("morePanelCalendarOverlayBtn").addEventListener("click", () => {
  closeMorePanel();
  closeCompanyPanel();
  openCalendarPanel();
});
// 공지사항/앱 정보 모달 + 문의하기(메일 앱 연결)
el("morePanelNoticeBtn").addEventListener("click", () => {
  closeMorePanel();
  el("noticeModal").style.display = "flex";
});
el("noticeModalCloseBtn").addEventListener("click", () => {
  el("noticeModal").style.display = "none";
  if (OV_EMBED) ovPost("close");
});
el("morePanelAboutBtn").addEventListener("click", () => {
  closeMorePanel();
  el("aboutModal").style.display = "flex";
});
el("aboutModalCloseBtn").addEventListener("click", () => {
  el("aboutModal").style.display = "none";
  if (OV_EMBED) ovPost("close");
});
// 설정 초기화(2026-10-20 사용자 요청): 경고를 보여 주고 "초기화"라고 직접 입력해야 실행. 관심종목·그룹은 지우지 않음
const RESET_SETTING_KEYS = [
  "theme", "app_lang", "color_scheme", "tech_view_v1", "watchlist_active_market_v1", "recentSearches", "recent_viewed_v1",
  "map_views_extra_v1", "map_chip_order_v1", "map_custom_markets_v1", "market_widget_symbols_v1", "full_scan_quota_v1",
  "watchlist_sort_v1", "watchlist_sort_v1_all", "watchlist_sort_v1_us", "watchlist_sort_v1_kr", "watchlist_active_group_v1", "watchlist_active_group_v1_all", "watchlist_active_group_v1_us",
];
el("morePanelResetBtn").addEventListener("click", async () => {
  if (OV_EMBED) window.__ovKeep = true; // 입력창이 떠 있는 동안 겹침 창이 닫히지 않게
  closeMorePanel();
  const v = await appPromptSheet({
    title: "설정 초기화",
    sub: "⚠️ 지도 보기·상단 버튼 순서·내 시장·화면 설정이 모두 처음 상태로 돌아가요. (관심종목은 지워지지 않아요)<br>계속하려면 아래 칸에 <b>초기화</b> 라고 입력해 주세요.",
    placeholder: "초기화",
    okLabel: "초기화",
    maxLength: 6,
  });
  if (v === null) {
    window.__ovKeep = false;
    if (OV_EMBED) ovPost("close");
    return;
  }
  if (v !== "초기화") {
    showToast("'초기화'라고 정확히 입력해야 해요");
    window.__ovKeep = false;
    if (OV_EMBED) setTimeout(() => ovPost("close"), 1200);
    return;
  }
  RESET_SETTING_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
  try {
    sessionStorage.clear();
  } catch {}
  showToast("설정을 초기화했어요");
  setTimeout(() => (location.href = location.pathname), 700);
});
el("morePanelContactBtn").addEventListener("click", () => {
  closeMorePanel();
  window.location.href = "mailto:yeop2ad@gmail.com?subject=" + encodeURIComponent("[마켓맵 문의]");
});

const THEME_KEY = "theme"; // 화이트/블랙 선택 저장(지도 페이지와 공유)
function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  document.querySelectorAll("[data-theme-choice]").forEach((b) => b.classList.toggle("active", b.dataset.themeChoice === (theme === "dark" ? "dark" : "light")));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#7230f0");
  try {
    // 계절성 예측 차트는 색이 SVG 안에 들어 있어 테마가 바뀌면 다시 그린다(첫 호출 땐 아직 선언 전이라 예외 → 무시)
    const fcBox = document.getElementById("futureChartContainer");
    if (futureChartLastData && fcBox && fcBox.querySelector("svg")) fcBox.innerHTML = buildFutureChartSvg(futureChartLastData, fcBox.clientWidth || 0);
  } catch (e) {}
}
function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
  if (OV_EMBED) ovPost("theme", { theme });
}
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
document.querySelectorAll("[data-theme-choice]").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.themeChoice)));
// ---------- 언어(한국어/영문) — 접속 지역(타임존/브라우저 언어)에 따라 기본값 추정, 명시적으로 고른 뒤에만 저장 ----------
const I18N = {
  "market.kr": { ko: "한국주식", en: "KR" },
  "market.us": { ko: "미국주식", en: "US" },
  "tab.watchlist": { ko: "관심종목", en: "Watchlist" },
  "tab.autotrack": { ko: "자동추적", en: "Auto Track" },
  "tab.search": { ko: "순위검색", en: "Rank Search" },
  "tab.earnings": { ko: "실적", en: "Earnings" }, // 2026-10-08 사용자 요청: 실적발표 → 실적
  "tab.etfAum": { ko: "규모", en: "Size" }, // 2026-10-08: 실적 예정·발표 종목
  "tab.valuation": { ko: "기업가치", en: "Value" }, // 2026-09-10 사용자 요청: 실적→기업가치
  "tab.trend": { ko: "시장분석", en: "Market" }, // 2026-09-11 사용자 요청: 미래예측→시장분석
  "tab.ipo": { ko: "IPO", en: "IPO" }, // 2026-09-11: 최근 5년 신규 상장
  // ETF 전용 상단 탭(2026-09-11 사용자 요청) — 시장분석·인사이트를 빼고 그 안에 있던 항목들을 위로 올림
  "tab.etfWinrate": { ko: "승률", en: "Win rate" },
  "tab.etfReturn": { ko: "수익률", en: "Return" },
  "tab.etfVolatility": { ko: "변동성", en: "Volatility" },
  "tab.etfDividend": { ko: "배당률", en: "Dividend" },
  "tab.etfFee": { ko: "운용보수", en: "Expense" },
  // 비트코인 전용 상단 탭(2026-09-12 사용자 요청)
  "tab.cryptoCap": { ko: "시가총액", en: "Market cap" },
  "tab.cryptoDrawdown": { ko: "최대낙폭", en: "Max drawdown" },
  "tab.insight": { ko: "인사이트", en: "Insight" },
  "nav.map": { ko: "마켓맵", en: "MarketMap" }, // 2026-09-08: 섹터맵→마켓맵
  "nav.ranking": { ko: "랭킹", en: "Ranking" },
  "nav.home": { ko: "홈", en: "Home" },
  "nav.calendar": { ko: "캘린더", en: "Calendar" },
  "nav.marketBtn": { ko: "시장", en: "Market" },
  "nav.etf": { ko: "ETF", en: "ETF" },
  "nav.crypto": { ko: "비트코인", en: "Bitcoin" },
  "nav.more": { ko: "더보기", en: "More" },
  "more.theme": { ko: "화면 테마", en: "Theme" },
  "more.theme.light": { ko: "라이트", en: "Light" },
  "more.theme.dark": { ko: "다크", en: "Dark" },
  "more.lang": { ko: "언어", en: "Language" },
  "more.color": { ko: "상승·하락 색상", en: "Up/Down Colors" },
  "more.color.kr": { ko: "빨강·파랑", en: "Red·Blue" },
  "more.color.global": { ko: "초록·빨강", en: "Green·Red" },
  "more.calendarInsight": { ko: "실적&공시 일정", en: "Earnings & Filings" },
  "more.news": { ko: "뉴스", en: "News" },
  "more.proBadge": { ko: "-7일 무료", en: "-7 days free" },
  "more.soon": { ko: "준비중", en: "Coming soon" },
  "more.favorites": { ko: "즐겨찾기 종목", en: "Favorites" },
  "more.alerts": { ko: "알림 설정", en: "Alerts" },
  "more.notice": { ko: "공지사항", en: "Notices" },
  "more.contact": { ko: "문의하기", en: "Contact" },
  "more.about": { ko: "앱 정보", en: "About" },
};
const LANG_KEY = "app_lang";
function applyLang(lang) {
  const isEn = lang === "en";
  document.documentElement.lang = isEn ? "en" : "ko";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const dict = I18N[node.getAttribute("data-i18n")];
    if (dict) node.textContent = isEn ? dict.en : dict.ko;
  });
  // 종목 상세(예: "AAPL 분석 - 굴려볼까" / "AAPL Analysis - Marketmap")를 보고 있는 중이 아닐 때만 앱 이름/슬로건 타이틀을 언어에 맞춰 갱신
  // (새 슬로건 자체에 " - "가 들어가므로 "분석 - "/"Analysis - " 패턴으로만 종목 상세를 판별)
  if (!/분석 - |Analysis - /.test(document.title)) {
    document.title = isEn ? "MarketMap - Stocks, Earnings, Heatmap" : "마켓맵 - 주식정보, 실적, 히트맵";
  }
}
function setLang(lang) {
  applyLang(lang);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {}
}
let __savedLang = null;
try {
  __savedLang = localStorage.getItem(LANG_KEY);
} catch (e) {}
// 2026-10-08 사용자 요청: 더보기의 언어 선택을 없애고 항상 한국어 — 예전에 영어를 골라 둔 사용자도 한국어로
applyLang("ko");
if (__savedLang === "en") setLang("ko");
// ---------- 상승/하락 색상(한국식 빨강-파랑 / 해외식 초록-빨강) — 지도 색상까지 공유하도록 localStorage 키를 공용으로 사용 ----------
const COLOR_SCHEME_KEY = "color_scheme";
function detectDefaultColorScheme() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const nav = (navigator.language || "").toLowerCase();
    if (tz === "Asia/Seoul" || nav.startsWith("ko")) return "kr";
  } catch (e) {}
  return "global";
}
function applyColorScheme(scheme) {
  const isGlobal = scheme === "global";
  if (isGlobal) {
    document.documentElement.setAttribute("data-colorscheme", "global");
  } else {
    document.documentElement.removeAttribute("data-colorscheme");
  }
}
let __savedScheme = null;
try {
  __savedScheme = localStorage.getItem(COLOR_SCHEME_KEY);
} catch (e) {}
applyColorScheme(__savedScheme || detectDefaultColorScheme());
// ---------- 상단 배경색 반전(2026-09-01 사용자 확정): 한국주식/미국주식/ETF/비트코인 중 다른 투자종목으로
// 넘어갈 때마다 남색↔흰색이 무조건 번갈아 바뀜(어느 섹션이냐가 아니라 "전환 횟수"로 결정). 시작은 남색.
let currentNavSection = null;
function setHeaderToneForSection(section) {
  // 2026-10-19: 상단은 항상 브랜드 보라(예전엔 투자군이 바뀔 때마다 남색↔흰색이 번갈아 바뀜)
  currentNavSection = section;
  document.body.dataset.headerTone = "dark";
}

// 좌상단 로고: 누르면 시작화면인 시장(지도)으로 (2026-10-20 인기종목 화면 삭제)
document.querySelector(".fh-banner").addEventListener("click", () => el("bottomNavMapBtn").click());

bottomNavButtons.more.addEventListener("click", () => {
  openMorePanel();
});

// ---------- 2026-10-19 하단 메뉴 개편: 시장 - 별별순위 - 실적 - 신기술 - 더보기 ----------
const TAB_PAGES = { tech: el("tabPageTech") };
function closeTabPages() {
  Object.values(TAB_PAGES).forEach((p) => p && (p.style.display = "none"));
}
function openTabPage(key) {
  closeMorePanel();
  closeCompanyPanel();
  closeCalendarPanel();
  closeTabPages();
  const page = TAB_PAGES[key];
  if (!page) return;
  const nav = el("bottomNav");
  page.style.bottom = `${(nav ? nav.offsetHeight : 64) + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vv-bottom-gap")) || 0)}px`;
  page.style.display = "flex";
  navMode = key;
  setBottomNavActive(key);
  syncNavHeader();
  if (key === "tech") renderTechInto("techRoot").catch(() => {});
}
// 시장 = 지도 화면(sector-map)
el("bottomNavMapBtn").addEventListener("click", () => {
  const market = appSectionMode === "etf" ? "etf" : appSectionMode === "crypto" ? "crypto" : getWatchlistActiveMarket() === "KR" ? "domestic" : "overseas";
  window.location.href = `sector-map/index.html?market=${market}`;
});
// 별별순위 = 예전 "순위검색". 처음엔 투자군을 고르는 첫 화면, 한 번 검색한 뒤에는 왼쪽 위 이름을 눌러 투자군을 바꾼다
function openRankTab() {
  closeTabPages();
  openSearchWizard();
  navMode = "rank";
  setBottomNavActive("rank");
  syncNavHeader();
}
el("bottomNavRankBtn").addEventListener("click", openRankTab);
// 실적 = 예전 실적 화면, 투자군은 한국주식 · 미국주식 두 개만
function openEarnTab(sec) {
  closeTabPages();
  const target = sec || (appSectionMode === "etf" || appSectionMode === "crypto" ? "kr" : getWatchlistActiveMarket() === "KR" ? "kr" : "us");
  appSectionMode = "stocks";
  setAppMarketMode(target);
  setHeaderToneForSection(target);
  showOnlyCarouselView(() => openEarningsTab());
  navMode = "earn";
  setBottomNavActive("earn");
  syncSectionHeader();
}
el("bottomNavEarnBtn").addEventListener("click", () => openEarnTab());
el("bottomNavTechBtn").addEventListener("click", () => openTabPage("tech"));

// ---------- 헤더 왼쪽 위 투자군 이름(드롭다운) ----------
// 별별순위(검색한 뒤) = 한국주식·미국주식·ETF·비트코인, 실적 = 한국주식·미국주식, 신기술 = "신기술" 글자만. 그 밖의 화면은 예전처럼 이름만.
const FH_SEC_INFO = {
  kr: { label: "한국주식", flag: () => FLAG_SVG_KR },
  us: { label: "미국주식", flag: () => FLAG_SVG_US },
  etf: { label: "ETF", flag: () => ICON_SVG_ETF },
  crypto: { label: "비트코인", flag: () => ICON_SVG_BTC },
};
function currentSecKey() {
  return appSectionMode === "etf" ? "etf" : appSectionMode === "crypto" ? "crypto" : getWatchlistActiveMarket() === "KR" ? "kr" : "us";
}
function fhSecChoices() {
  if (navMode === "rank" && typeof srRankActive !== "undefined" && srRankActive) return ["kr", "us", "etf", "crypto"];
  if (navMode === "earn") return ["kr", "us"];
  return null;
}
function syncNavHeader() {
  const label = el("fhMarketLabel");
  const flag = el("fhMarketFlag");
  const sel = el("fhSecSelect");
  if (!label || !flag || !sel) return;
  sel.classList.remove("open");
  const choices = fhSecChoices();
  sel.classList.toggle("fh-sec-static", !choices);
  if (navMode === "tech") {
    label.textContent = "신기술";
    flag.innerHTML = "";
    return;
  }
  if (navMode === "rank" && !choices) {
    label.textContent = "별별순위";
    flag.innerHTML = "";
    return;
  }
  const cur = currentSecKey();
  const info = FH_SEC_INFO[cur];
  label.textContent = info.label;
  flag.innerHTML = info.flag();
  const menu = el("fhSecMenu");
  if (menu) {
    menu.innerHTML = choices
      ? choices.map((k) => `<button type="button" class="fh-sec-item${k === cur ? " active" : ""}" data-sec="${k}"><span class="fh-sec-mark">${FH_SEC_INFO[k].flag()}</span><span>${FH_SEC_INFO[k].label}</span></button>`).join("")
      : "";
  }
}
el("fhSecBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!fhSecChoices()) return;
  el("fhSecSelect").classList.toggle("open");
});
document.addEventListener("click", (e) => {
  const sel = el("fhSecSelect");
  if (sel && !sel.contains(e.target)) sel.classList.remove("open");
});
el("fhSecMenu").addEventListener("click", (e) => {
  const item = e.target.closest(".fh-sec-item");
  if (!item) return;
  el("fhSecSelect").classList.remove("open");
  const sec = item.dataset.sec;
  if (sec === currentSecKey()) return;
  if (navMode === "earn") {
    openEarnTab(sec);
    return;
  }
  if (navMode === "rank" && srRankActive) {
    // 같은 항목(승률 등)이 그 투자군에도 있으면 그대로, 없으면 승률로
    const key = srRankActive.k;
    if (sec === "etf" || sec === "crypto") {
      if (sec === "etf") etfPopularRegion = getWatchlistActiveMarket() === "KR" ? "kr" : "us";
      openSReportRank((SR_ASSET_RANK[sec] || {})[key] ? key : "win", sec);
    } else {
      openSReportRank(SR_RANK_ITEM_BY_KEY.has(key) ? key : "win", "stocks", sec);
    }
    navMode = "rank";
    setBottomNavActive("rank");
    syncNavHeader();
  }
});

// 섹터맵(지도) 하단 네비 버튼에서 넘어온 경우 해당 화면을 바로 열어줌(?open=market|calendar|more|search|wizard)
// 지도에서 이미 한 번 로드된 세션이라 스플래시 로딩 화면(z-index 300, 데이터 로드 끝나야 사라짐)까지 다시 기다릴 필요가
// 없으므로, 이 경우엔 스플래시를 즉시 건너뛰어 패널이 지연 없이 바로 보이도록 함(체감상 "바로 안 열린다"는 느낌 해소)
(() => {
  const openParam = new URLSearchParams(window.location.search).get("open");
  if (!openParam) return;
  window.__deepLinkOpen = openParam; // initApp의 기본 화면(기업가치) 부팅이 딥링크 화면을 덮어쓰지 않도록 표시
  if (openParam === "more" && document.documentElement.classList.contains("ov-embed")) {
    // 지도 위에 겹쳐 띄우는 더보기 — 서랍이 열려 있는 동안 뒤 화면(별별순위 등)이 보이지 않게 투명 처리됨
    setTimeout(() => openMorePanel(), 0);
  }
  loadingSplash.style.display = "none";
  history.replaceState(null, "", window.location.pathname); // 새로고침 시 다시 안 열리도록 쿼리스트링 제거
  // 이 아래 스크립트에 아직 초기화되지 않은 const(companyPanel 등)를 클릭 핸들러가 참조하므로,
  // 지금 바로 실행하면 TDZ 오류가 나 패널이 안 열림 — 스크립트 전체 실행이 끝난 다음 틱으로 미룸
  setTimeout(() => {
    const actions = {
      calendar: () => {
        closeCompanyPanel();
        openCalendarPanel();
      },
      more: () => bottomNavButtons.more.click(), // (ov 모드는 위에서 이미 열었으므로 한 번 더 열어도 무해)
      rank: () => openRankTab(), // 지도 하단 메뉴 → 별별순위·실적·신기술(2026-10-19)
      earn: () => openEarnTab(),
      tech: () => openTabPage("tech"),
      search: () => searchOpenBtn.click(), // 지도 상단 돋보기 → 티커 검색 오버레이
      wizard: () => {
        // 간편검색 딥링크 — 하단 버튼이 더보기로 이동(2026-08-31)해 직접 위저드를 염
        closeCompanyPanel();
        openSearchWizard();
      },
      // 구버전 지도 딥링크(국내/해외/ETF/비트코인/시장/관심종목)는 별별순위·시장으로
      "ranking-kr": () => openRankTab(),
      "ranking-us": () => openRankTab(),
      ranking: () => openRankTab(),
      etf: () => openRankTab(),
      crypto: () => openRankTab(),
      market: () => openRankTab(),
      watchlist: () => openMapWatchlist(),
    };
    const fn = actions[openParam];
    if (fn) fn();
  }, 0);
})();

// ---------- 캘린더 패널: 하단 네비 캘린더 아이콘 전용 — 인사이트 탭의 텍스트 목록과는 별개로,
// 그리드+로고가 있는 화면을 독립된 슬라이드 오버레이로 보여줌(marketPanel과 동일한 패턴)
let calendarPanelLoaded = false;
function openCalendarPanel() {
  el("calendarPanel").style.display = "flex";
  requestAnimationFrame(() => el("calendarPanel").classList.add("open"));
  if (!calendarPanelLoaded) {
    calendarPanelLoaded = true;
    runCalendarPanel();
  }
}
function closeCalendarPanel() {
  el("calendarPanel").classList.remove("open");
  window.setTimeout(() => { el("calendarPanel").style.display = "none"; }, 280);
  setBottomNavActive("home");
  if (OV_EMBED) ovPost("close");
}
el("calendarPanelCloseBtn").addEventListener("click", closeCalendarPanel);

// ---------- 기업 패널: 틀고정 탭이 아니라 오른쪽에서 슬라이드인하는 전체화면 오버레이 ----------
const companyPanel = el("companyPanel");
const companyPanelCloseBtn = el("companyPanelCloseBtn");
const companyPanelSearchBtn = el("companyPanelSearchBtn");
const companyPanelAlertBtn = el("companyPanelAlertBtn");

function openCompanyPanel() {
  companyPanel.style.display = "flex";
  requestAnimationFrame(() => companyPanel.classList.add("open"));
}
function closeCompanyPanel({ push = true } = {}) {
  companyPanel.classList.remove("open");
  window.setTimeout(() => {
    companyPanel.style.display = "none";
  }, 280);
  if (push && new URLSearchParams(location.search).get("ticker")) {
    // 2026-09-09 뒤로가기 개편: 앱 안에서 연 상세(fromApp)는 history.back()으로 그 항목을 걷어내고(popstate가 다시 닫기 처리),
    // 주소로 바로 들어온 상세는 항목을 새로 쌓지 않고 주소만 바꿈 — 뒤로가기를 눌렀을 때 닫았던 상세가 다시 열리지 않게
    if (history.state && history.state.ticker && history.state.fromApp) history.back();
    else history.replaceState(history.state, "", location.pathname);
    document.title = document.documentElement.lang === "en" ? "MarketMap - Stocks, Earnings, Heatmap" : "마켓맵 - 주식정보, 실적, 히트맵";
  }
}
companyPanelCloseBtn.addEventListener("click", () => {
  // 2026-10-20 사용자 요청: 상세에서 닫으면 인기종목이 아니라 원래 있던 곳으로.
  // 지도 등 다른 화면에서 링크로 바로 열린 상세(앱 안에서 쌓은 기록이 없음)는 온 곳으로 되돌아가고, 온 곳을 알 수 없으면 별별순위
  const landed = window.__landedOnDetail && !(history.state && history.state.fromApp);
  if (landed) {
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (internal && history.length > 1) {
      history.back();
      return;
    }
    closeCompanyPanel();
    openRankTab();
    return;
  }
  closeCompanyPanel();
});
companyPanelSearchBtn.addEventListener("click", openSearchOverlay);
companyPanelAlertBtn.addEventListener("click", () => alert("가격 알림 기능은 준비 중입니다."));

// 헤더의 종목이름/가격/등락률 표시 — 검정 배경 전체화면 상세 헤더용
// 등락 금액 표기 — 원화는 정수 콤마(3,100), 그 외는 소수 2자리($1.25, 1달러 미만 코인은 유효숫자 넉넉히)
function fmtPriceChangeAmount(v, currency) {
  if (!Number.isFinite(v)) return "";
  if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR");
  if (v >= 1) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v === 0 ? "0" : v.toLocaleString("en-US", { maximumSignificantDigits: 3 }); // 1달러 미만(밈코인 등)은 유효숫자 3자리
}
function renderCompanyIdentity(ticker, quote, meta, changePct) {
  let displayName = TICKER_TO_KOREAN_NAME[ticker] || quote.longname || quote.shortname || meta.longName || ticker;
  // 암호화폐는 한글명(비트코인·페페 등)을 우선 표시, 없으면 "Cardano USD"의 " USD"만 떼고 표시(2026-09-01)
  const identitySection = sectionOfSymbol(ticker, quote.quoteType);
  if (identitySection === "crypto") displayName = cryptoKoName(ticker, displayName);
  // ETF면 로고가 테마 이모지로 잡히도록 상품명을 먼저 등록(2026-09-11) — renderSummary보다 이 함수가 먼저 돈다
  // 국내 ETF는 야후 이름이 영문이라, 한글 상품명 목록(ETF_NAME_BY_SYMBOL)에 있으면 그걸 씀
  if (identitySection === "etf" && ETF_NAME_BY_SYMBOL.has(ticker)) displayName = ETF_NAME_BY_SYMBOL.get(ticker);
  if (identitySection === "etf" && !isKrTicker(ticker)) registerEtfName(ticker, displayName);
  const price = meta.regularMarketPrice;
  el("companyPanelLogoWrap").innerHTML = tickerLogoHtml(ticker);
  el("companyPanelName").textContent = displayName;
  // 2026-09-15 사용자 요청: 헤더는 무조건 2줄 — 1줄 = 기업명 + 바로 오른쪽 국기/섹션 마크(+ETF 티커), 2줄 = 가격(변동률)
  //  (예전엔 이름 아래에 마크 줄이 따로 있어 3줄이었음) ETF 티커는 국내 "069500", 미국 "SPY"(2026-09-13)
  let tickerLineEl = el("companyPanelTickerLine");
  if (!tickerLineEl) {
    const nameEl = el("companyPanelName");
    const mark = el("companyPanelSectionMark");
    const nameRow = document.createElement("span");
    nameRow.className = "detail-identity-namerow";
    nameEl.insertAdjacentElement("beforebegin", nameRow);
    nameRow.appendChild(nameEl);
    nameRow.appendChild(mark);
    tickerLineEl = document.createElement("span");
    tickerLineEl.id = "companyPanelTickerLine";
    tickerLineEl.className = "detail-identity-ticker";
    nameRow.appendChild(tickerLineEl);
  }
  tickerLineEl.textContent = identitySection === "etf" ? String(ticker).replace(/\.(KS|KQ)$/, "") : "";
  tickerLineEl.style.display = identitySection === "etf" ? "" : "none";
  // 제목 옆 섹션 마크(한국주식/미국주식/ETF/비트코인, 2026-09-01) — Yahoo quoteType이 있으면 그걸 우선 사용
  const sectionMarkEl = el("companyPanelSectionMark");
  if (sectionMarkEl) sectionMarkEl.outerHTML = sectionMarkHtml(ticker, quote && quote.quoteType).replace('class="section-mark"', 'class="section-mark" id="companyPanelSectionMark"');
  el("companyPanelPrice").textContent = price !== undefined && price !== null ? fmtPriceFull(price, meta.currency) : "";
  const pctEl = el("companyPanelChangePct");
  if (changePct !== null && changePct !== undefined) {
    const isUp = changePct >= 0;
    const arrow = isUp ? "▲" : "▼";
    const cls = isUp ? "delta-up" : "delta-down";
    // 맨 위 헤더는 등락률만(2026-09-15 사용자 정정) — 오르내린 금액은 개요의 "현재가" 줄에 표시
    pctEl.textContent = `${arrow}(${isUp ? "+" : ""}${changePct.toFixed(2)}%)`; // 화살표와 %를 붙여서(2026-09-16 사용자 요청)
    pctEl.className = `detail-identity-change ${cls}`;
  } else {
    pctEl.textContent = "";
    pctEl.className = "detail-identity-change";
  }
}

// ---------- 관심종목 (localStorage 기반 — Firestore 등 서버 저장소가 없어 기기별로만 유지됨) ----------
// 2026-09-01 사용자 요청으로 국내/해외 분리 저장을 폐지하고 하나로 통합 관리 — 목록·그룹·정렬·활성그룹 전부 단일 저장공간.
// watchlistActiveMarket("US"|"KR")은 이제 관심종목 저장과는 무관하게, 앱 전체의 시장 모드(한국주식/미국주식 화면)만 나타낸다.
const WATCHLIST_ALL_GROUP_ID = "__all__";
const WATCHLIST_DEFAULT_GROUP_ID = "default";
const WATCHLIST_ACTIVE_MARKET_KEY = "watchlist_active_market_v1";

// market 인자는 과거 시장별 분리 시절의 호출부 호환용으로만 남김 — 항상 통합 저장공간(_all)을 사용
function wlKey(base) {
  return `${base}_all`;
}
function watchlistMarketOf(symbol) {
  return isKrTicker(symbol) ? "KR" : "US";
}
function getWatchlistActiveMarket() {
  return localStorage.getItem(WATCHLIST_ACTIVE_MARKET_KEY) === "KR" ? "KR" : "US";
}
function setWatchlistActiveMarket(market) {
  localStorage.setItem(WATCHLIST_ACTIVE_MARKET_KEY, market === "KR" ? "KR" : "US");
}

// 시장별(_us/_kr) 분리 저장 시절의 데이터를 1회만 통합 저장공간(_all)으로 합쳐 이관(2026-09-01) — 이후엔 건드리지 않음
(function migrateWatchlistToUnifiedStorage() {
  const FLAG = "watchlist_migrated_unified_v1";
  if (localStorage.getItem(FLAG)) return;
  try {
    const read = (k) => {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };
    // 시장 분리 시절(_us/_kr)과 그 이전 단일 키 시절(watchlist_v1)의 데이터를 모두 합쳐 통합 키로 이관
    const seen = new Set();
    // 지도(sector-map)가 먼저 통합 키에 저장해뒀을 수도 있으므로 기존 _all 내용을 맨 앞에 두고 합침
    const merged = [...read("watchlist_v1_all"), ...read("watchlist_v1_us"), ...read("watchlist_v1_kr"), ...read("watchlist_v1")].filter((w) => w && w.symbol && !seen.has(w.symbol) && seen.add(w.symbol));
    if (merged.length) localStorage.setItem("watchlist_v1_all", JSON.stringify(merged));
    // 그룹은 전부 이어붙이되 같은 id("기본" 등)는 한 번만 유지 — 종목의 groupId 참조가 그대로 살아있게 함
    const gSeen = new Set();
    const groups = [...read("watchlist_groups_v1_us"), ...read("watchlist_groups_v1_kr"), ...read("watchlist_groups_v1")].filter((g) => g && g.id && !gSeen.has(g.id) && gSeen.add(g.id));
    if (groups.length) localStorage.setItem("watchlist_groups_v1_all", JSON.stringify(groups));
    const sort = localStorage.getItem("watchlist_sort_v1_us") || localStorage.getItem("watchlist_sort_v1_kr") || localStorage.getItem("watchlist_sort_v1");
    if (sort) localStorage.setItem("watchlist_sort_v1_all", sort);
    const activeGroup = localStorage.getItem("watchlist_active_group_v1_us") || localStorage.getItem("watchlist_active_group_v1");
    if (activeGroup) localStorage.setItem("watchlist_active_group_v1_all", activeGroup);
  } catch {}
  localStorage.setItem(FLAG, "1");
})();

// (구버전 "시장별 분리 이관"은 위 통합 이관이 단일 키·시장별 키를 전부 흡수하므로 제거됨 — 2026-09-01)

function getWatchlist(market = getWatchlistActiveMarket()) {
  try {
    const list = JSON.parse(localStorage.getItem(wlKey("watchlist_v1", market)));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function isWatchlisted(symbol) {
  const sym = (symbol || "").toUpperCase();
  return getWatchlist(watchlistMarketOf(sym)).some((w) => w.symbol === sym);
}
function saveWatchlist(list, market = getWatchlistActiveMarket()) {
  localStorage.setItem(wlKey("watchlist_v1", market), JSON.stringify(list));
  try {
    document.dispatchEvent(new CustomEvent("watchlistchange")); // 실적 화면의 '관심'이 즉시 따라가게(2026-10-20)
  } catch {}
  tabLoadPromises.watchlist = null; // 다음에 관심종목 탭에 들어갈 때 최신 목록으로 다시 렌더링되도록 캐시 무효화
}

// ---------- 관심종목 그룹(가로스크롤 탭) — 시장별 별도 ----------
function getWatchlistGroups(market = getWatchlistActiveMarket()) {
  try {
    const groups = JSON.parse(localStorage.getItem(wlKey("watchlist_groups_v1", market)));
    if (Array.isArray(groups) && groups.length) return groups;
  } catch {
    // 저장된 값이 없거나 손상된 경우 기본 그룹으로 대체
  }
  return [{ id: WATCHLIST_DEFAULT_GROUP_ID, name: "기본" }];
}
function saveWatchlistGroups(groups, market = getWatchlistActiveMarket()) {
  localStorage.setItem(wlKey("watchlist_groups_v1", market), JSON.stringify(groups));
}
// ---------- 투자처별 관심목록(2026-10-07 사용자 요청) ----------
// 목록은 투자처(한국주식·미국주식·ETF·비트코인)마다 따로 보이고, 새 목록의 기본 이름은 한국1·한국2…, 미국1…, ETF1…, 코인1….
// 예전부터 있던 공용 "기본" 목록은 각 투자처에서 "한국1"처럼 보이게만 바꾼다(저장 이름은 그대로).
const WL_SECTION_PREFIX = { kr: "한국", us: "미국", etf: "ETF", crypto: "코인" };
function wlGroupsForSection(sec) {
  return getWatchlistGroups().filter((g) => !g.section || g.section === sec);
}
function wlGroupLabel(g, sec) {
  if (!g.section && g.id === WATCHLIST_DEFAULT_GROUP_ID && (g.name === "기본" || !g.name)) return `${WL_SECTION_PREFIX[sec] || ""}1`;
  return g.name;
}
function wlNextGroupName(sec) {
  const prefix = WL_SECTION_PREFIX[sec] || "목록";
  const used = new Set(wlGroupsForSection(sec).map((g) => wlGroupLabel(g, sec)));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
function addWatchlistGroup(name, section) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const groups = getWatchlistGroups();
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  groups.push(section ? { id, name: trimmed, section } : { id, name: trimmed });
  saveWatchlistGroups(groups);
  return id;
}
function renameWatchlistGroup(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  const groups = getWatchlistGroups();
  const g = groups.find((g) => g.id === id);
  if (g) {
    g.name = trimmed;
    saveWatchlistGroups(groups);
  }
}
function getActiveWatchlistGroup(market = getWatchlistActiveMarket()) {
  return localStorage.getItem(wlKey("watchlist_active_group_v1", market)) || WATCHLIST_ALL_GROUP_ID;
}
// 한 종목이 속한 관심목록 id들(2026-09-16 사용자 요청: 여러 목록에 한 번에 담기) — 예전 groupId 하나만 있던 항목도 그대로 읽는다
function wlGroupIdsOf(w) {
  if (Array.isArray(w.groupIds) && w.groupIds.length) return w.groupIds;
  return [w.groupId || WATCHLIST_DEFAULT_GROUP_ID];
}
function addToWatchlist(symbol, groupId) {
  const sym = symbol.toUpperCase();
  const market = watchlistMarketOf(sym);
  const active = getActiveWatchlistGroup(market);
  const fallback = active === WATCHLIST_ALL_GROUP_ID ? WATCHLIST_DEFAULT_GROUP_ID : active;
  const ids = (Array.isArray(groupId) ? groupId : [groupId]).filter(Boolean);
  const gids = ids.length ? ids : [fallback];
  const list = getWatchlist(market);
  const cur = list.find((w) => w.symbol === sym);
  if (cur) {
    // 이미 담긴 종목이면 고른 목록만 더해 준다
    const merged = [...new Set([...wlGroupIdsOf(cur), ...gids])];
    saveWatchlist(list.map((w) => (w.symbol === sym ? { ...w, groupIds: merged, groupId: merged[0] } : w)), market);
    return;
  }
  saveWatchlist([...list, { symbol: sym, addedAt: Date.now(), groupIds: gids, groupId: gids[0] }], market);
  logSearchEvent(sym, "watch"); // 새로 관심 등록 → 조회수 +1
}
function removeFromWatchlist(symbol) {
  const sym = symbol.toUpperCase();
  const market = watchlistMarketOf(sym);
  saveWatchlist(getWatchlist(market).filter((w) => w.symbol !== sym), market);
}
// ---------- 관심종목 그룹 선택 시트(2026-09-11 사용자 요청) ----------
// 그룹이 2개 이상일 때 별을 누르면 "어느 목록에 넣을지" 고르는 작은 시트를 아래에서 띄움(1개면 바로 추가)
// 2026-09-16 사용자 요청: 하나만 고르던 것을 체크 방식으로 바꿔 여러 목록에 한 번에 담는다.
// 목록마다 담긴 종목 수를 함께 보여주고, "+ 목록 추가"로 새 목록을 만들 수 있으며, 이름을 길게 누르면 바로 고쳐진다.
let wlGroupPickTarget = null;
let wlGroupPickChecked = new Set();
function wlGroupCounts(market) {
  const counts = {};
  getWatchlist(market).forEach((w) => wlGroupIdsOf(w).forEach((id) => (counts[id] = (counts[id] || 0) + 1)));
  return counts;
}
function renderWlGroupPickList() {
  const market = watchlistMarketOf(wlGroupPickTarget || "");
  const sec = sectionOfSymbol(wlGroupPickTarget || "");
  const groups = wlGroupsForSection(sec);
  const counts = wlGroupCounts(market);
  el("wlGroupPickList").innerHTML =
    groups
      .map(
        (g) => `<button type="button" class="wl-group-pick-item${wlGroupPickChecked.has(g.id) ? " checked" : ""}" data-pick-group="${escapeHtml(g.id)}">
        <span class="wl-group-pick-check">✓</span>
        <span class="wl-group-pick-name" data-group-name="${escapeHtml(g.id)}">${escapeHtml(wlGroupLabel(g, sec))}</span>
        <span class="wl-group-pick-count">${counts[g.id] || 0}</span>
      </button>`
      )
      .join("") + `<button type="button" class="wl-group-pick-add" id="wlGroupPickAddBtn">+ 목록 추가</button>`;
}
function openWlGroupPickSheet(symbol) {
  const market = watchlistMarketOf(symbol);
  const groups = wlGroupsForSection(sectionOfSymbol(symbol));
  wlGroupPickTarget = symbol;
  const cur = getWatchlist(market).find((w) => w.symbol === symbol.toUpperCase());
  const active = getActiveWatchlistGroup(market);
  const defaultId = active === WATCHLIST_ALL_GROUP_ID ? groups[0].id : active;
  wlGroupPickChecked = new Set(cur ? wlGroupIdsOf(cur) : [defaultId]);
  renderWlGroupPickList();
  el("wlGroupPickSheet").style.display = "flex";
}
function closeWlGroupPickSheet() {
  el("wlGroupPickSheet").style.display = "none";
  wlGroupPickTarget = null;
}
el("wlGroupPickBackdrop").addEventListener("click", closeWlGroupPickSheet);
el("wlGroupPickCloseBtn").addEventListener("click", closeWlGroupPickSheet);
el("wlGroupPickList").addEventListener("click", (e) => {
  if (e.target.closest("#wlGroupPickAddBtn")) {
    const sec = sectionOfSymbol(wlGroupPickTarget || "");
    appPromptSheet({ title: "새 관심목록", sub: "목록 이름을 입력해 주세요.", value: wlNextGroupName(sec), placeholder: "예) 반도체", okLabel: "만들기", maxLength: 12 }).then((name) => {
      const id = name === null ? null : addWatchlistGroup(name, sec);
      if (id) {
        wlGroupPickChecked.add(id);
        renderWlGroupPickList();
      }
    });
    return;
  }
  const btn = e.target.closest("[data-pick-group]");
  if (!btn || !wlGroupPickTarget) return;
  const id = btn.dataset.pickGroup;
  if (wlGroupPickChecked.has(id)) wlGroupPickChecked.delete(id);
  else wlGroupPickChecked.add(id);
  btn.classList.toggle("checked", wlGroupPickChecked.has(id));
});
// 목록 이름을 길게 누르면 이름 고치기(2026-09-16 사용자 요청)
(function bindWlGroupPickRename() {
  const list = el("wlGroupPickList");
  let timer = null;
  const start = (e) => {
    const nameEl = e.target.closest("[data-group-name]");
    if (!nameEl) return;
    timer = setTimeout(() => {
      timer = null;
      const id = nameEl.dataset.groupName;
      appPromptSheet({ title: "목록 이름 바꾸기", value: nameEl.textContent, okLabel: "저장", maxLength: 12 }).then((next) => {
        if (next !== null) {
          renameWatchlistGroup(id, next);
          renderWlGroupPickList();
        }
      });
    }, 550);
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  list.addEventListener("touchstart", start, { passive: true });
  list.addEventListener("mousedown", start);
  ["touchend", "touchmove", "touchcancel", "mouseup", "mouseleave", "scroll"].forEach((ev) => list.addEventListener(ev, cancel, { passive: true }));
})();
el("wlGroupPickConfirmBtn").addEventListener("click", () => {
  const symbol = wlGroupPickTarget;
  if (!symbol) return;
  if (!wlGroupPickChecked.size) {
    showToast("담을 목록을 하나 이상 골라주세요");
    return;
  }
  addToWatchlist(symbol, [...wlGroupPickChecked]);
  closeWlGroupPickSheet();
  syncWatchStars(symbol);
  showToast(`관심종목 ${wlGroupPickChecked.size}개 목록에 담았습니다`);
});

function toggleWatchlist(symbol) {
  if (isWatchlisted(symbol)) {
    removeFromWatchlist(symbol);
    updateCompanyPanelWatchlistBtn(symbol);
    return;
  }
  // 2026-10-22 사용자 요청: 어느 목록인지 묻지 않고 바로 담는다 — 마지막으로 보던 관심목록(없거나 "전체"면 첫 목록)에 자동으로
  const market = watchlistMarketOf(symbol);
  const sec = sectionOfSymbol(symbol);
  const groups = wlGroupsForSection(sec);
  const active = getActiveWatchlistGroup(market);
  const g = groups.find((x) => x.id === active) || groups[0];
  addToWatchlist(symbol, [g.id]);
  syncWatchStars(symbol);
  showToast(`관심목록 '${wlGroupLabel(g, sec)}'에 담았습니다`);
}
// 시트에서 고른 뒤 화면에 떠 있는 같은 종목의 별 버튼(상세·검색 결과)을 모두 갱신
function syncWatchStars(symbol) {
  updateCompanyPanelWatchlistBtn(symbol);
  const active = isWatchlisted(symbol);
  document.querySelectorAll(`.search-watch-btn[data-watch-symbol="${CSS.escape(symbol)}"]`).forEach((b) => {
    b.classList.toggle("active", active);
    const svg = b.querySelector("svg");
    if (svg) svg.setAttribute("fill", active ? "currentColor" : "none");
  });
}
const companyPanelWatchlistBtn = el("companyPanelWatchlistBtn");
function updateCompanyPanelWatchlistBtn(symbol) {
  companyPanelWatchlistBtn.classList.toggle("active", isWatchlisted(symbol));
  companyPanelWatchlistBtn.classList.toggle("market-kr", isKrTicker(symbol));
  companyPanelWatchlistBtn.classList.toggle("market-us", !isKrTicker(symbol));
}
companyPanelWatchlistBtn.addEventListener("click", () => {
  const ticker = new URLSearchParams(location.search).get("ticker") || tickerInput.value;
  if (ticker) toggleWatchlist(ticker);
});

// ---------- 관심종목 탭의 "수익률비교"(2026-10-14 사용자 요청) — 예전 투자분석 탭의 그래프·순위·미래예측을 그대로 가져옴 ----------
// 관심종목 목록을 다시 그릴 때마다 무겁게 다시 그리지 않도록, 결과가 비었거나 투자처가 바뀌었거나 5분이 지났을 때만 새로 그림
let wlCompareAt = 0;
// ---------- 기업검색 위저드 (챗봇처럼 단계별로 질문 → 선택 → 다음 질문으로 넘어가는 검색 보드) ----------
let searchWizardStep = "root";
let searchWizardAnswers = {};

// 2026-10-08 사용자 요청: 간편검색은 오른쪽에서 날아오는 창이 아니라 다른 탭처럼 상단 버튼은 그대로, 아래 내용 자리에서
// (검색창·단계 화면 DOM을 #searchGroup으로 옮겨 그대로 씀 — 위임 리스너가 #searchWizardBody에 붙어 있어 동작 유지)
function openSearchWizard() {
  searchWizardStep = "root";
  searchWizardAnswers = {};
  const grp = el("searchGroup");
  const body = el("searchWizardPanel").querySelector(".company-panel-body");
  if (grp && body && body.parentElement !== grp) grp.appendChild(body);
  showOnlyCarouselView(() => {
    if (typeof clearSrRankTabs === "function") clearSrRankTabs();
    switchTab(TAB_ORDER.indexOf("topranking"));
    el("tabValuationBtn").classList.remove("active");
    tabTrendBtn.classList.remove("active");
    setCarouselViewTitle("tab.search");
    el("topRankingSubNav").innerHTML = "";
    showRankingGroup("search");
  });
  setBottomNavActive(bottomNavKeyForSection());
  renderSearchWizardStep();
  window.scrollTo(0, 0);
}
function closeSearchWizard() {
  // 창이 아니라 화면 안이라 닫을 것이 없음(예전 호출부 호환용)
}
el("searchWizardCloseBtn").addEventListener("click", closeSearchWizard);

function renderSearchWizardStep() {
  const renderers = {
    root: renderWizardRoot,
    menu: renderWizardMenu,
    branchA: renderWizardBranchA,
    branchB1: renderWizardBranchB1,
    branchB2: renderWizardBranchB2,
    branchB3: renderWizardBranchB3,
    branchBResult: renderWizardBranchBResult,
    branchBNA: renderWizardBranchBNA,
    branchC: renderWizardBranchC,
    branchCStyle: renderWizardBranchCStyle,
    branchCResult: renderWizardBranchCResult,
  };
  el("searchWizardBody").innerHTML = renderers[searchWizardStep]();
}

// 위저드에서 고른 투자처(2026-09-03 개편: 첫 질문) — kr/us/etf/crypto, 미선택 시 현재 시장 토글 기준
function wizardMarket() {
  return searchWizardAnswers.market || (getWatchlistActiveMarket() === "KR" ? "kr" : "us");
}
const WIZARD_MARKET_LABEL = { kr: "한국주식", us: "미국주식", etf: "ETF", crypto: "비트코인" };
// 랭킹 화면으로 이동하며 하단 네비·헤더도 해당 투자처로 전환(주식용)
function wizardGoStockRanking(idx) {
  const market = wizardMarket() === "kr" ? "kr" : "us";
  closeSearchWizard();
  appSectionMode = "stocks";
  setAppMarketMode(market);
  setHeaderToneForSection(market);
  goToRankingEntry(idx);
  setBottomNavActive(market);
  syncSectionHeader();
}
// ETF/코인 증시동향 랭킹으로 이동(해당 항목 지표를 미리 선택)
function wizardGoAssetRanking(metricKey) {
  const market = wizardMarket(); // "etf" | "crypto"
  closeSearchWizard();
  appSectionMode = market;
  if (market === "etf") etfPopularRegion = getWatchlistActiveMarket() === "KR" ? "kr" : "us";
  setHeaderToneForSection(market);
  assetTrendMetric = metricKey;
  // 비트코인·ETF 모두 상단 탭이 항목별로 나뉘어(2026-09-11/12) 해당 탭으로 바로 보냄 — 없는 지표만 기존 시장동향 화면 사용
  if (market === "crypto") {
    if (metricKey === "winrate") openCryptoMetricTab("winrate");
    else if (metricKey === "pressure") openCryptoMetricTab("return");
    else openCryptoTrend();
  }
  else if (metricKey === "winrate") openEtfMetricTab("winrate");
  else if (metricKey === "pressure") openEtfMetricTab("return");
  else openEtfTrend();
  setBottomNavActive(market);
  syncSectionHeader();
}

// 투자처를 고른 뒤 그 투자처의 순위 페이지로(항목은 기본 승률)
function wizardOpenRank(itemKey) {
  const market = wizardMarket();
  closeSearchWizard();
  openSReportRank(itemKey, market === "etf" || market === "crypto" ? market : "stocks", market === "kr" ? "kr" : "us");
  // 2026-10-08 사용자 요청: 간편검색으로 고른 순위 화면에선 상단 탭도 "간편검색"에 불이 들어오게
  const markSearchTab = () => document.querySelectorAll("#fhTabs .fh-tab").forEach((b) => b.classList.toggle("active", b.dataset.fhtab === "tab.search"));
  markSearchTab();
  setTimeout(markSearchTab, 400);
}
// 패널 오픈 시가 아니라 스크립트 로딩 시 1회만 위임 리스너를 붙여서, innerHTML 교체마다 재바인딩할 필요가 없게 함
el("searchWizardBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wizard-action]");
  if (!btn) return;
  const action = btn.dataset.wizardAction;
  if (action === "back") {
    searchWizardStep = btn.dataset.wizardBackStep;
    renderSearchWizardStep();
  } else if (action === "market-pick") {
    // 2026-10-21 사용자 요청: 투자처를 고르면 항목 고르는 화면(관심 항목 선정)을 건너뛰고 곧바로 순위 페이지 — 맨 앞은 승률
    searchWizardAnswers = { market: btn.dataset.market };
    wizardOpenRank("win");
  } else if (action === "sr-rank") {
    wizardOpenRank(btn.dataset.srKey);
  } else if (action === "__legacy-sr-rank") {
    const market = wizardMarket();
    closeSearchWizard();
    openSReportRank(btn.dataset.srKey, market === "etf" || market === "crypto" ? market : "stocks", market === "kr" ? "kr" : "us");
    // 2026-10-08 사용자 요청: 간편검색으로 고른 순위 화면에선 상단 탭도 "간편검색"에 불이 들어오게
    // (순위 화면이 뒤늦게 제목을 다시 쓰는 경우가 있어 조금 뒤에 한 번 더)
    const markSearchTab = () => document.querySelectorAll("#fhTabs .fh-tab").forEach((b) => b.classList.toggle("active", b.dataset.fhtab === "tab.search"));
    markSearchTab();
    setTimeout(markSearchTab, 400);
  } else if (action === "root-a") {
    searchWizardStep = "branchA";
    renderSearchWizardStep();
  } else if (action === "root-b") {
    // 선택찾기(섹터 기반)는 S&P500 섹터 스크리너 기반이라 미국주식에서만 제공(2026-09-03 투자처 개편)
    if (wizardMarket() !== "us") {
      searchWizardStep = "branchBNA";
      renderSearchWizardStep();
      return;
    }
    searchWizardStep = "branchB1";
    searchWizardAnswers = { market: searchWizardAnswers.market, sectors: [] };
    renderSearchWizardStep();
  } else if (action === "root-c") {
    searchWizardStep = "branchC";
    renderSearchWizardStep();
  } else if (action === "rank-nav") {
    wizardGoStockRanking(Number(btn.dataset.rankIdx));
  } else if (action === "asset-rank-nav") {
    wizardGoAssetRanking(btn.dataset.metric);
  } else if (action === "sector-toggle") {
    const sector = btn.dataset.sector;
    const set = new Set(searchWizardAnswers.sectors);
    if (set.has(sector)) set.delete(sector);
    else set.add(sector);
    searchWizardAnswers.sectors = [...set];
    btn.classList.toggle("checked", set.has(sector));
  } else if (action === "sector-next") {
    if (!searchWizardAnswers.sectors || searchWizardAnswers.sectors.length === 0) {
      alert("섹터를 1개 이상 선택해주세요.");
      return;
    }
    searchWizardStep = "branchB2";
    renderSearchWizardStep();
  } else if (action === "criteria2-pick") {
    searchWizardAnswers.criterion2 = btn.dataset.criteria;
    searchWizardStep = "branchB3";
    renderSearchWizardStep();
  } else if (action === "criteria3-pick") {
    searchWizardAnswers.criterion3 = btn.dataset.criteria;
    searchWizardStep = "branchBResult";
    renderSearchWizardStep();
    runBranchBPipeline();
  } else if (action === "branchC-confirm") {
    searchWizardStep = "branchCResult";
    renderSearchWizardStep();
    runBranchCConfirm();
  } else if (action === "branchC-other") {
    searchWizardStep = "branchCStyle";
    renderSearchWizardStep();
  } else if (action === "branchC-style-short") {
    wizardGoStockRanking(RANKING_ENTRIES.findIndex((e) => e.label === "연평균 상승"));
  } else if (action === "branchC-style-long") {
    wizardGoStockRanking(RANKING_ENTRIES.findIndex((e) => e.label === "10년월간승률"));
  } else if (action === "share") {
    shareWizardResult(wizardShareTitle, wizardShareText);
  } else if (action === "share-self") {
    copyWizardResultToSelf(wizardShareText);
  }
});

// 1단계(2026-09-16 개편): 투자처 선택 — 하단 네비와 같은 마크를 써서 앱 안에서 같은 것을 가리키는 게 한눈에 보이게 한다.
// 고르면 곧바로 항목 목록(=핵심지표 항목)으로 넘어간다. 예전의 선택찾기·자동찾기 갈래는 사용자 요청으로 없앴다.
function renderWizardRoot() {
  const rows = [
    { m: "kr", icon: FLAG_SVG_KR, name: "한국주식", sub: "코스피200 + 코스닥150 350종목" },
    { m: "us", icon: FLAG_SVG_US, name: "미국주식", sub: "S&P500" },
    { m: "etf", icon: ICON_SVG_ETF, name: "ETF", sub: "한국·미국 상장지수펀드 200종목" },
    { m: "crypto", icon: ICON_SVG_BTC, name: "비트코인", sub: "암호화폐 시가총액 상위 200" },
  ];
  return `
    <p class="wizard-question">어떤 투자처를 보시겠어요?</p>
    <div class="wizard-market-list">
      ${rows
        .map(
          (r) => `<button type="button" class="wizard-market-btn" data-wizard-action="market-pick" data-market="${r.m}">
            <span class="wizard-market-mark">${r.icon}</span>
            <span class="wizard-market-text"><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.sub)}</small></span>
            <span class="wizard-market-arrow" aria-hidden="true">›</span>
          </button>`
        )
        .join("")}
    </div>
  `;
}
// 2단계: 기존 A/B/C 메뉴(투자처별 동일)
function renderWizardMenu() {
  const label = WIZARD_MARKET_LABEL[wizardMarket()];
  return `
    <p class="wizard-question">[${escapeHtml(label)}] 종목을 어떻게 찾아드릴까요?</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="root-a"><b>🏆 1. [랭킹찾기]</b> 각 부문별 랭킹으로 볼래요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-b"><b>🎯 2. [선택찾기]</b> 내가 좋아하는 분야가 있어요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-c"><b>🤖 3. [자동찾기]</b> 잘모르겠어요. 알아서 찾아주세요.</button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}

// [랭킹찾기]와 Top랭킹 탭이 공유하는 랭킹 화면 목록 — 사용자가 지정한 순서(2026-08-25 재정렬):
// 공시(group:"disclosure") 9개 + 시장(group:"market") 8개, Top랭킹에서는 이 group 기준으로 2줄 가로스크롤로 나눠 보여줌.
// EPS는 제거하고 영업이익률·ROE·부채비율·52주최저를 새로 추가함(모두 getFullMetrics의 직전분기 재무제표 기반).
// 2026-09-10 사용자 요청: 화면 서브내비에는 그룹별 4개씩만 노출하고, 나머지는 hidden:true로 감춰
// 간편검색([랭킹찾기])에서만 고를 수 있게 함 — 기업가치 4개(매출성장/순이익증가/배당률/부채비율),
// 미래예측 4개(10년월간승률/연평균 상승/RSI 순위/52주최저).
const RANKING_ENTRIES = [
  { icon: "bank", label: "매출성장", tab: "valuation", group: "disclosure", run: () => runValueRevenue() },
  { icon: "dollar", label: "순이익증가", tab: "valuation", group: "disclosure", run: () => runValueNetIncome() },
  { icon: "coin", label: "배당률", tab: "trend", group: "disclosure", run: () => runTrendDividend() },
  { icon: "scale", label: "부채비율", tab: "valuation", group: "disclosure", run: () => runValueDebtRatio() },
  { icon: "wallet", label: "현금흐름 증가", tab: "valuation", group: "disclosure", run: () => runValueCashFlow(), hidden: true },
  { icon: "building", label: "시가총액", tab: "valuation", group: "disclosure", run: () => runValueMarketCap(), hidden: true },
  { icon: "scale", label: "영업이익률", tab: "valuation", group: "disclosure", run: () => runValueOperatingMargin(), hidden: true },
  { icon: "scale", label: "PER", tab: "valuation", group: "disclosure", run: () => runValuePer(), hidden: true },
  { icon: "medal", label: "ROE", tab: "valuation", group: "disclosure", run: () => runValueRoe(), hidden: true },
  // KR ETF/US ETF는 하단 ETF 섹션의 미래예측으로 이동(2026-09-01 사용자 요청) — openEtfTrend 참고
  // 2026-09-04 개편: 상승 압력 → 연평균 상승(연복리 수익률(CAGR)), 투자 안정 → 10년월간승률(구 우상향점수와 통합, 명칭 통일)
  { icon: "medal", label: "10년월간승률", tab: "trend", group: "market", run: () => runTrendRsiWinRate("winrate"), orange: true },
  { icon: "rocket", label: "연평균 상승", tab: "trend", group: "market", run: () => runTrendRsiWinRate("ret"), orange: true },
  { icon: "scale", label: "RSI 순위", tab: "trend", group: "market", run: () => runTrendRsiWinRate("rsi"), orange: true },
  { icon: "trending-down", label: "52주최저", tab: "valuation", group: "market", run: () => runValueWeek52Low() },
  { icon: "thumbsup", label: "거래대금", tab: "trend", group: "market", run: () => runTrendVolume(), hidden: true },
  { icon: "trending-up", label: "상승률", tab: "trend", group: "market", run: () => runMovers("surge"), hidden: true },
  { icon: "trending-down", label: "하락률", tab: "trend", group: "market", run: () => runMovers("plunge"), hidden: true },
];
// ---------- Top랭킹 탭 — 기업가치·투자동향을 통합한 화면. RANKING_ENTRIES를 그대로 재사용해 14개 항목을
// 가로 스크롤 서브내비로 보여주고, 클릭하면 valuationGroup/trendGroup 중 해당하는 쪽만 보이게 전환함 ----------
function showRankingGroup(tabKey) {
  el("valuationGroup").style.display = tabKey === "valuation" ? "block" : "none";
  el("trendGroup").style.display = tabKey === "trend" ? "block" : "none";
  const searchGroup = el("searchGroup");
  if (searchGroup) searchGroup.style.display = tabKey === "search" ? "block" : "none";
  const earningsGroup = el("earningsGroup");
  if (earningsGroup) earningsGroup.style.display = tabKey === "earnings" ? "block" : "none";
}

let topRankingActiveIdx = 0;
function renderTopRankingSubNavActive() {
  el("topRankingSubNav")
    .querySelectorAll(".top-ranking-tab")
    .forEach((btn) => btn.classList.toggle("active", Number(btn.dataset.rankIdx) === topRankingActiveIdx));
}

function runRankingEntry(idx) {
  const entry = RANKING_ENTRIES[idx];
  if (!entry) return;
  topRankingActiveIdx = idx;
  showRankingGroup(entry.tab);
  renderTopRankingSubNavActive();
  entry.run();
}

// "기업가치"/"시장동향" 상단탭은 같은 topranking 패널을 공유하며, 지금 보여줄 그룹(group)의 항목만
// 한 줄 가로스크롤 서브내비로 그림
function renderGroupSubNav(groupKey, extraIdx = -1) {
  el("topRankingSubNav").classList.remove("sr-rank-nav");
  el("topRankingSubNav").innerHTML = RANKING_ENTRIES.map((entry, i) =>
    entry.group !== groupKey || (entry.hidden && i !== extraIdx)
      ? ""
      : `<button type="button" class="cat-btn top-ranking-tab${entry.orange ? " top-ranking-tab-orange" : ""}" data-rank-idx="${i}"><span>${entry.label}</span></button>` // 아이콘(이모지) 제거·글자 확대(2026-09-10 사용자 요청)
  ).join("");
}
el("topRankingSubNav").addEventListener("click", (e) => {
  const btn = e.target.closest(".top-ranking-tab");
  if (!btn) return;
  runRankingEntry(Number(btn.dataset.rankIdx));
});

// 특정 랭킹 항목으로 바로 이동(위저드 종료 후 결과 화면 진입 등) — 상단탭(기업가치/시장동향) active 표시와
// 서브내비를 그 항목이 속한 group에 맞게 다시 그린 뒤 실행
function goToRankingEntry(idx) {
  const entry = RANKING_ENTRIES[idx];
  if (!entry) return;
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.toggle("active", entry.group === "disclosure");
  tabTrendBtn.classList.toggle("active", entry.group === "market");
  setCarouselViewTitle(entry.group === "disclosure" ? "tab.valuation" : "tab.trend");
  renderGroupSubNav(entry.group, entry.hidden ? idx : -1); // 간편검색으로 들어온 숨김 항목은 그 칩만 예외로 함께 노출
  runRankingEntry(idx);
}
// "기업가치"/"미래예측" 버튼 클릭 — 해당 그룹의 첫 노출 항목으로 진입(재클릭 시에도 매번 새로 렌더링)
function activateRankingGroup(groupKey) {
  const idx = RANKING_ENTRIES.findIndex((e) => e.group === groupKey && !e.hidden);
  if (idx >= 0) goToRankingEntry(idx);
}
tabTrendBtn.addEventListener("click", () => activateRankingGroup("market"));

function renderWizardBranchA() {
  const market = wizardMarket();
  const label = WIZARD_MARKET_LABEL[market];
  let body;
  if (market === "etf" || market === "crypto") {
    // ETF·코인은 항목이 적어 묶음 없이 한 벌로
    const keys = SR_ASSET_ITEM_ORDER[market] || [];
    body = `<div class="wizard-option-grid">${keys
      .map(
        (k) =>
          `<button type="button" class="wizard-option-btn" data-wizard-action="sr-rank" data-sr-key="${escapeHtml(k)}">${escapeHtml(SR_ASSET_ITEM_LABEL[k] || k)}</button>`
      )
      .join("")}</div>`;
  } else {
    const titles = { growth: "성장 · 추세", profit: "수익성 · 재무", market: "시장" };
    body = SR_RANK_GROUPS.map(
      (g) => `<p class="wizard-group-title">${escapeHtml(titles[g.key] || "")}</p>
        <div class="wizard-option-grid">${g.items
          .map(
            (it) =>
              `<button type="button" class="wizard-option-btn" data-wizard-action="sr-rank" data-sr-key="${escapeHtml(it.k)}">${escapeHtml(it.label)}</button>`
          )
          .join("")}</div>`
    ).join("");
  }
  return `
    <p class="wizard-question">[${escapeHtml(label)}] 어떤 순위를 보시겠어요?</p>
    ${body}
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}
// 선택찾기 미제공 투자처 안내(섹터 스크리너가 S&P500 전용)
function renderWizardBranchBNA() {
  return `
    <p class="wizard-question">🎯 [선택찾기]는 섹터(분야) 데이터가 있는 <b>미국주식</b>에서만 제공됩니다.<br>대신 [랭킹찾기]나 [자동찾기]를 이용해보세요.</p>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="menu">← 뒤로</button>
  `;
}

// [선택찾기]의 2·3순위 "기준" — S&P500 + 섹터 필터와 자연스럽게 어울리는 10개만 제공.
// (US Stock 거래량·US ETF·KR ETF·인기종목은 S&P500이 아닌 전체 시장/거래량 스크리너를 쓰거나 ETF라 섹터 개념이 없어 제외)
const WIZARD_CRITERIA = [
  { key: "revenue", icon: "bank", label: "매출액 증가", dir: "desc", get: (m) => m.revenueGrowthAnnual, fmt: (m) => fmtGrowthCell(m.revenueGrowthAnnual) },
  { key: "cashFlow", icon: "wallet", label: "현금흐름 증가", dir: "desc", get: (m) => m.operatingCashFlowGrowthAnnual, fmt: (m) => fmtGrowthCell(m.operatingCashFlowGrowthAnnual) },
  { key: "netIncome", icon: "dollar", label: "순이익 증가", dir: "desc", get: (m) => m.netIncomeGrowthAnnual, fmt: (m) => fmtGrowthCell(m.netIncomeGrowthAnnual) },
  { key: "roe", icon: "medal", label: "ROE", dir: "desc", get: (m) => m.roeQuarterly, fmt: (m) => (m.roeQuarterly === null || m.roeQuarterly === undefined ? "N/A" : `${m.roeQuarterly.toFixed(1)}%`) },
  { key: "per", icon: "scale", label: "PER", dir: "asc", get: (m) => m.per, fmt: (m) => (m.per === null || m.per === undefined ? "N/A" : `${m.per.toFixed(1)}배`) },
  { key: "stability", icon: "medal", label: "10년월간승률", dir: "desc", get: (m) => m.winRate10y, fmt: (m) => winRatePctCellHtml(m.winRate10y, m.winTotal) },
  { key: "marketCap", icon: "building", label: "시가총액", dir: "desc", get: (m) => m.marketCap, fmt: (m) => (m.marketCap ? fmtCompactCurrency(m.marketCap) : "N/A") },
  { key: "pressure", icon: "rocket", label: "연평균 상승", dir: "desc", get: (m) => m.ret10yAvg, fmt: (m) => (m.ret10yAvg === null || m.ret10yAvg === undefined ? "N/A" : `${partialMarkHtml(m.winTotal, "wr-mark-front")}<b>${m.ret10yAvg > 0 ? "+" : ""}${Math.round(m.ret10yAvg * 10) / 10}%</b>`) },
  { key: "surge", icon: "trending-up", label: "상승률(등락률)", dir: "desc", get: (m) => m.changePct, fmt: (m) => (m.changePct === null || m.changePct === undefined ? "N/A" : `${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`), needsDaily: true },
  { key: "plunge", icon: "trending-down", label: "하락률(등락률)", dir: "asc", get: (m) => m.changePct, fmt: (m) => (m.changePct === null || m.changePct === undefined ? "N/A" : `${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`), needsDaily: true },
];

function renderWizardBranchB1() {
  const items = Object.entries(SECTOR_KO)
    .map(([en, ko]) => {
      const checked = (searchWizardAnswers.sectors || []).includes(en);
      return `<button type="button" class="wizard-sector-item${checked ? " checked" : ""}" data-wizard-action="sector-toggle" data-sector="${escapeHtml(en)}">${ko}</button>`;
    })
    .join("");
  return `
    <p class="wizard-question">1순위 · 분야(섹터)를 선택해주세요. (여러 개 선택 가능)</p>
    <div class="wizard-sector-checklist">${items}</div>
    <button type="button" class="wizard-confirm-btn" data-wizard-action="sector-next">다음</button>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="menu">← 뒤로</button>
  `;
}
function renderWizardBranchB2() {
  const items = WIZARD_CRITERIA.map(
    (c) => `<button type="button" class="wizard-criteria-item" data-wizard-action="criteria2-pick" data-criteria="${c.key}">${iconHtml(c.icon)} ${c.label}</button>`
  ).join("");
  return `
    <p class="wizard-question">2순위 · 기준을 선택해주세요. (TOP30까지 선정)</p>
    <div class="wizard-criteria-list">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchB1">← 뒤로</button>
  `;
}
function renderWizardBranchB3() {
  const items = WIZARD_CRITERIA.filter((c) => c.key !== searchWizardAnswers.criterion2)
    .map((c) => `<button type="button" class="wizard-criteria-item" data-wizard-action="criteria3-pick" data-criteria="${c.key}">${iconHtml(c.icon)} ${c.label}</button>`)
    .join("");
  return `
    <p class="wizard-question">3순위 · 기준을 선택해주세요. (TOP15까지 선정)</p>
    <div class="wizard-criteria-list">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchB2">← 뒤로</button>
  `;
}
function renderWizardBranchBResult() {
  return `
    <p class="wizard-question">선택하신 조건으로 종목을 찾고 있습니다...</p>
    <div id="wizardBranchBResultBody"><p class="muted">불러오는 중...</p></div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 처음으로</button>
  `;
}

let sectorTickerMapPromise = null;
function getSectorTickerMap() {
  if (!sectorTickerMapPromise) {
    sectorTickerMapPromise = (async () => {
      const [sp500Tickers, entries] = await Promise.all([
        getSP500Tickers(),
        Promise.all(
          Object.entries(SECTOR_SCREENER_ID).map(async ([sector, scrId]) => {
            const data = await yahooScreener(scrId, 250).catch(() => null);
            const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
            return [sector, quotes.map((q) => q && q.symbol).filter(Boolean)];
          })
        ),
      ]);
      const sp500Set = new Set(sp500Tickers);
      const map = new Map();
      for (const [sector, symbols] of entries) {
        map.set(sector, new Set(symbols.filter((s) => sp500Set.has(s))));
      }
      return map;
    })().catch((e) => {
      sectorTickerMapPromise = null;
      throw e;
    });
  }
  return sectorTickerMapPromise;
}
// 선택한 섹터(들)의 합집합을 시가총액 근사 정렬(getSP500PriorityOrder)로 필터링해 앞 50개 = TOP50 후보
// (일부 S&P500 종목은 11개 섹터 스크리너 어디에도 안 걸려 누락될 수 있음 — 저비용 근사치로 감수한 한계)
async function getBranchBCandidatePool(sectors) {
  const [map, priorityOrder] = await Promise.all([getSectorTickerMap(), getSP500PriorityOrder()]);
  const union = new Set();
  for (const sector of sectors) {
    const set = map.get(sector);
    if (set) for (const sym of set) union.add(sym);
  }
  return priorityOrder.filter((sym) => union.has(sym)).slice(0, 50);
}
async function runBranchBPipeline() {
  const bodyEl = el("wizardBranchBResultBody");
  try {
    const pool = await getBranchBCandidatePool(searchWizardAnswers.sectors);
    if (pool.length === 0) {
      bodyEl.innerHTML = `<p class="muted">선택하신 섹터에서 종목을 찾지 못했습니다.</p>`;
      return;
    }
    let candidates = (await mapWithConcurrency(pool, 5, getFullMetrics)).filter(Boolean);
    // 10년월간승률·연평균 상승(2026-09-04 상승압력/투자안정 대체) — 배치 DB에서 조회(선택찾기는 S&P500 전용)
    const wrDb = await getWinRateDb().catch(() => null);
    candidates = candidates.map((m) => {
      const e = wrDb && wrDb.scores && wrDb.scores[m.symbol];
      return {
        ...m,
        winRate10y: e && e.score !== null && e.score !== undefined ? e.score : null,
        ret10yAvg: e && Number.isFinite(e.ret10y) ? e.ret10y : null,
        winTotal: e && Number.isFinite(e.total) ? e.total : null,
      };
    });
    const c2 = WIZARD_CRITERIA.find((c) => c.key === searchWizardAnswers.criterion2);
    const c3 = WIZARD_CRITERIA.find((c) => c.key === searchWizardAnswers.criterion3);
    if (c2.needsDaily || c3.needsDaily) {
      const daily = await getSP500DailyChanges();
      const dailyMap = new Map(daily.map((d) => [d.symbol, d.changePct]));
      candidates = candidates.map((m) => ({ ...m, changePct: dailyMap.has(m.symbol) ? dailyMap.get(m.symbol) : null }));
    }
    const sortByCriterion = (list, c) =>
      [...list].sort((a, b) => {
        const av = c.get(a);
        const bv = c.get(b);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return c.dir === "asc" ? av - bv : bv - av;
      });
    const top30 = sortByCriterion(candidates, c2).slice(0, 30);
    const top15 = sortByCriterion(top30, c3).slice(0, 15);
    const table = wizardResultTableHtml(top15, `${c2.label} / ${c3.label}`, (r) => `${c2.fmt(r)} / ${c3.fmt(r)}`);
    const plain = (html) => html.replace(/<[^>]+>/g, "");
    wizardShareTitle = "기업검색 결과 (선택찾기)";
    wizardShareText =
      `[선택찾기] ${searchWizardAnswers.sectors.map((s) => SECTOR_KO[s] || s).join(", ")} 섹터 · ${c2.label} → ${c3.label} TOP15\n` +
      top15.map((r, i) => `${i + 1}. ${r.symbol} (${plain(c2.fmt(r))} / ${plain(c3.fmt(r))})`).join("\n") +
      `\n\nmarketmap.kr`;
    bodyEl.innerHTML = `
      ${table}
      <div class="wizard-share-row">
        <button type="button" class="cat-btn" data-wizard-action="share">공유하기</button>
        <button type="button" class="cat-btn" data-wizard-action="share-self">나에게 공유하기</button>
      </div>
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted">❌ ${e.message || "결과를 불러오지 못했습니다."}</p>`;
  }
}

// 자동찾기 안내 — 투자처별 대상 유니버스 문구(2026-09-03 개편: 해당 투자처에서 상승압력+투자안정 합계순)
const WIZARD_AUTO_UNIVERSE_LABEL = {
  kr: "코스피200+코스닥150 전체",
  us: "S&P500 전체",
  etf: "미국·한국 ETF 시가총액 상위",
  crypto: "암호화폐 시가총액 상위",
};
function renderWizardBranchC() {
  const market = wizardMarket();
  const otherBtn =
    market === "kr" || market === "us"
      ? `<button type="button" class="wizard-root-option" data-wizard-action="branchC-other"><b>B. [다른방법]</b></button>`
      : "";
  return `
    <p class="wizard-question">${escapeHtml(WIZARD_AUTO_UNIVERSE_LABEL[market])}에서 연평균 상승 + 10년월간승률 합계 순서로 30위까지 찾아 보겠습니다.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-confirm"><b>A. [확인]</b></button>
      ${otherBtn}
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="menu">← 뒤로</button>
  `;
}
function renderWizardBranchCStyle() {
  return `
    <p class="wizard-question">자신의 투자스타일 중 한 가지를 선택해주세요.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-short">
        <b>A. 단기적인 수익을 원함(▲600%~▼60%)</b><br><span class="wizard-option-sub">(10년 연복리 수익률(CAGR) 높은 주식) — S&amp;P 500중 연평균 상승 높은순위 30위까지</span>
      </button>
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-long">
        <b>B. 장기적으로 안정적인 상승을 원함(▲60%~▼30%)</b><br><span class="wizard-option-sub">(10년간 매월 상승 마감 비율 높은 주식) — S&amp;P 500중 10년월간승률 높은순위 30위까지</span>
      </button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchC">← 뒤로</button>
  `;
}
function renderWizardBranchCResult() {
  return `
    <p class="wizard-question">${escapeHtml(WIZARD_AUTO_UNIVERSE_LABEL[wizardMarket()])} 스캔 결과입니다.</p>
    <div id="wizardBranchCResultBody"><p class="muted">불러오는 중...</p></div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 처음으로</button>
  `;
}
// 자동찾기 상위 30개의 현재가·등락률만 가볍게 보충 조회(5일 차트 1회) — 실패한 행은 가격만 N/A로 표시
async function wizardAttachPrices(rows) {
  await mapWithConcurrency(rows, 5, async (r) => {
    try {
      const chart = await yahooChart(r.symbol, "5d");
      const meta = (chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta) || {};
      r.price = meta.regularMarketPrice ?? null;
      r.currency = r.currency || meta.currency || "USD";
      r.changePct = getDailyChangePercent(chart);
    } catch {
      r.price = null;
    }
    return r;
  });
  return rows;
}
// 자동찾기(2026-09-04 개편): 투자처별로 연평균 상승(연복리 수익률(CAGR))+10년월간승률 합계 상위 30 —
// 값은 전부 배치 DB(winrate-scores-us.json의 유니버스별 맵)에서 조회, 가격만 실시간 보충
async function runBranchCConfirm() {
  const bodyEl = el("wizardBranchCResultBody");
  const market = wizardMarket();
  bodyEl.innerHTML = `<p class="muted" id="wizardBranchCProgress">${escapeHtml(WIZARD_AUTO_UNIVERSE_LABEL[market])} 종목을 확인하는 중...</p>`;
  try {
    const wrDb = await getWinRateDb().catch(() => null);
    const wrMapKey = market === "etf" ? "scoresEtf" : market === "crypto" ? "scoresCrypto" : market === "kr" ? "scoresKr" : "scores";
    const wrMap = (wrDb && wrDb[wrMapKey]) || null;
    if (!wrMap) throw new Error("10년월간승률 데이터를 가져오지 못했습니다.");
    let top30;
    const combineRows = (rows) => {
      const combined = rows.filter((r) => r.winRate10y !== null && r.ret10yAvg !== null);
      combined.forEach((r) => (r.combinedTotal = Math.round((r.winRate10y + r.ret10yAvg) * 10) / 10));
      combined.sort((a, b) => b.combinedTotal - a.combinedTotal);
      return combined.slice(0, 30);
    };
    const wrOf = (sym) => {
      const e = wrMap[sym];
      return {
        winRate10y: e && e.score !== null && e.score !== undefined ? e.score : null,
        ret10yAvg: e && Number.isFinite(e.ret10y) ? e.ret10y : null,
        winTotal: e && Number.isFinite(e.total) ? e.total : null,
      };
    };
    if (market === "etf" || market === "crypto") {
      const rows = Object.keys(wrMap).map((sym) => ({
        symbol: sym,
        displayName: TICKER_TO_KOREAN_NAME[sym] || sym,
        currency: market === "crypto" || !/\.(KS|KQ)$/.test(sym) ? "USD" : "KRW",
        ...wrOf(sym),
      }));
      top30 = combineRows(rows);
      await wizardAttachPrices(top30);
    } else {
      const isKr = market === "kr";
      const universe = await getSReportUniverse(isKr);
      const nameOf = new Map((((universe && universe.companies) || [])).map((c) => [c.symbol, c.name]));
      const rows = Object.keys(wrMap).map((sym) => ({
        symbol: sym,
        displayName: isKr ? nameOf.get(sym) || TICKER_TO_KOREAN_NAME[sym] || sym : sym,
        currency: isKr ? "KRW" : "USD",
        ...wrOf(sym),
      }));
      top30 = combineRows(rows);
      await wizardAttachPrices(top30);
    }
    const marketLabel = WIZARD_MARKET_LABEL[market];
    const table = wizardResultTableHtml(top30, "연평균 상승+10년월간승률 합계", (r) => `${partialMarkHtml(r.winTotal, "wr-mark-front", partialMonthsFor(r.symbol))}<b>${r.combinedTotal}</b>`);
    wizardShareTitle = `기업검색 결과 (자동찾기 · ${marketLabel})`;
    wizardShareText =
      `[자동찾기] ${marketLabel} 연평균 상승+10년월간승률 합계 TOP30\n` +
      top30.map((r, i) => `${i + 1}. ${r.displayName || r.symbol} (${r.combinedTotal})`).join("\n") +
      `\n\nmarketmap.kr`;
    bodyEl.innerHTML = `
      ${table}
      <div class="wizard-share-row">
        <button type="button" class="cat-btn" data-wizard-action="share">공유하기</button>
        <button type="button" class="cat-btn" data-wizard-action="share-self">나에게 공유하기</button>
      </div>
    `;
  } catch (e) {
    bodyEl.innerHTML = `<p class="muted">❌ ${e.message || "결과를 불러오지 못했습니다."}</p>`;
  }
}

// Branch B/C 결과 화면 공용 표 렌더러 — 기존 top30-table 스타일 재사용(ticker-link/price-chart-link 위임 클릭 그대로 동작)
function wizardResultTableHtml(rows, metricLabel, metricCellFn) {
  const body = rows
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
      <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.displayName || r.symbol)}</b></td>
      <td>${r.price !== undefined && r.price !== null ? priceChartLink(r.symbol, fmtPrice(r.price, r.currency || "USD")) : "N/A"}</td>
      <td>${metricCellFn(r)}</td>
    </tr>`
    )
    .join("");
  return `
    <table class="top30-table">
      <thead><tr><th>순위</th><th>기업명</th><th>현재가</th><th>${metricLabel}</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

// ---------- 위저드 결과 공유 (텍스트 기반 — 기존 shareOrDownloadGround는 이미지 전용이라 재사용 불가) ----------
let wizardShareTitle = "";
let wizardShareText = "";
async function shareWizardResult(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: location.origin });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  await copyWizardResultFallback(text);
}
async function copyWizardResultFallback(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("링크가 복사되었습니다.");
  } catch {
    alert("공유에 실패했습니다.");
  }
}
async function copyWizardResultToSelf(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("결과가 복사되었습니다. 메모 등에 붙여넣어 보관하세요.");
  } catch {
    alert("복사에 실패했습니다. 다시 시도해주세요.");
  }
}

// ---------- 티커 검색/클릭 → 기업 패널을 열고 그 종목을 로딩 ----------
// push=false는 popstate(뒤로/앞으로가기)나 최초 URL 진입 처리 시, 이미 있는 히스토리 상태를 다시 쌓지 않기 위함
// 최근 본 종목(2026-10-07): 인기종목 맨 위 "최근검색" — 투자처별로 최근 5개
const RECENT_VIEWED_KEY = "recent_viewed_v1";
function rememberRecentTicker(sym) {
  try {
    const list = (JSON.parse(localStorage.getItem(RECENT_VIEWED_KEY)) || []).filter((x) => x !== sym);
    list.unshift(sym);
    localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {}
}
function navigateToTicker(ticker, { push = true } = {}) {
  ticker = ticker.toUpperCase();
  rememberRecentTicker(ticker);
  if (push) {
    history.pushState({ ticker, fromApp: true }, "", "?ticker=" + encodeURIComponent(ticker));
    backTrackHistory(); // 뒤로가기 모듈이 "지금 머문 항목"을 알게 함(위에 뜬 창을 닫을 때 이 항목을 다시 얹음)
  }
  tickerInput.value = ticker;
  document.title = document.documentElement.lang === "en" ? `${ticker} Analysis - MarketMap` : `${ticker} 분석 - 마켓맵`;
  addRecentSearch(ticker);
  logSearchEvent(ticker);
  if (searchOverlay.style.display !== "none") closeSearchOverlay();
  openCompanyPanel();
  updateCompanyPanelWatchlistBtn(ticker);
  runAnalysis(ticker);
}

// ---------- 좌측 상단 국내/해외 토글 — 관심종목 시장 전환과 연동되고, 전체 고정 아이콘 색상(주황↔파랑)도 함께 바뀜 ----------
// 국내 탭은 아직 해외와 동일한 항목·데이터를 보여주는 1단계(색상 전환만) 상태이며, 실제 국내 전용 콘텐츠는 추후 단계에서 채움
const marketModeKrBtn = el("marketModeKrBtn");
const marketModeUsBtn = el("marketModeUsBtn");
// 시장 표시 옆 네모 국기 SVG(2026-09-01 사용자 요청) — 작게 그려도 깔끔하도록 태극기는 태극 문양만,
// 성조기는 줄무늬+파란 캔튼+별점 6개로 단순화한 컬러 아이콘
// 태극기는 공식 국기 작도 그대로(태극 33.69° S자 + 건곤감리 4괘, 공식 국기 SVG 지오메트리 스케일) — 2026-09-03 사용자 요청
const FLAG_SVG_KR = `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#fff" stroke="rgba(0,0,0,0.22)"/><g transform="translate(10.5,7) scale(0.155)"><g stroke="#000" stroke-width="4" fill="none"><path transform="rotate(33.69)" d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11"/><path transform="rotate(-33.69)" d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11"/></g><g transform="rotate(33.69)"><path fill="#cd2e3a" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0"/><path fill="#0047a0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0"/></g></g></svg>`;
const FLAG_SVG_US = `<svg viewBox="0 0 21 14" width="21" height="14"><defs><clipPath id="fhUsFlagClip"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5"/></clipPath></defs><g clip-path="url(#fhUsFlagClip)"><rect x="0" y="0" width="21" height="14" fill="#fff"/><rect x="0" y="0.5" width="21" height="1.9" fill="#b22234"/><rect x="0" y="4.3" width="21" height="1.9" fill="#b22234"/><rect x="0" y="8.1" width="21" height="1.9" fill="#b22234"/><rect x="0" y="11.9" width="21" height="1.9" fill="#b22234"/><rect x="0" y="0" width="9.5" height="6.2" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.4" cy="1.8" r="0.55"/><circle cx="4.8" cy="1.8" r="0.55"/><circle cx="7.2" cy="1.8" r="0.55"/><circle cx="2.4" cy="4.2" r="0.55"/><circle cx="4.8" cy="4.2" r="0.55"/><circle cx="7.2" cy="4.2" r="0.55"/></g></g><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="none" stroke="rgba(0,0,0,0.22)"/></svg>`;

// ---------- 앱 섹션 모드(2026-09-01): 하단 네비의 한국주식/미국주식 = "stocks", ETF = "etf", 비트코인 = "crypto" ----------
// ETF·비트코인 섹션은 상단 제목줄에 자기 이름+로고를 표시하고, 탭은 인기종목/시장동향/인사이트 3개만 사용(기업가치 숨김)
let appSectionMode = "stocks";
// 지금 열려 있는 종목 상세의 자산 구분(kr/us/etf/crypto)과 심볼 — 과거분석 버튼(한달/1년 상승·하락)이
// 주식/ETF/코인 어느 기준으로 순위를 낼지 판단하는 데 사용(2026-09-02, renderSummary가 갱신)
let currentDetailSection = "us";
let currentDetailSymbol = "";
// ---------- ETF 이모지 로고(2026-09-11 사용자 요청) ----------
// 운용사 CI가 전부 비슷해 목록에서 구분이 안 된다는 지적에 따라, 상품명으로 추종 대상을 알아내
// 대표 이모지를 로고 자리에 넣는다(분류 규칙은 data/etf-meta.js). 레버리지·인버스는 X2·X3 배지를 덧붙이고
// 색은 레버리지=상승색(var(--pos)) / 인버스=하락색(var(--neg))이라 상승·하락 색상 설정을 그대로 따라간다.
const ETF_NAME_BY_SYMBOL = new Map(); // 심볼 -> 상품명. US_ETF_TOP100·국내 ETF 목록이 로드되는 대로 채워짐
function registerEtfName(symbol, name) {
  if (symbol && name && !ETF_NAME_BY_SYMBOL.has(symbol)) ETF_NAME_BY_SYMBOL.set(symbol, name);
}
// ETF 이름 표기 공통(2026-09-13 사용자 요청 — ETF 탭·관심종목·검색 모두 같은 규칙):
//  · 한국 ETF → main: 브랜드를 뗀 상품명("미국배당다우존스"), sub: 브랜드(KODEX·TIGER…)
//  · 미국 ETF → main: 티커(SPY), sub: 한글명/영문 상품명
// ETF가 아니면 null. fallbackName은 야후 등에서 받은 이름(국내 ETF 목록이 아직 안 불러와졌을 때 대비)
// 미국 ETF 티커 아래 줄(2026-10-07 사용자 요청): 긴 상품 풀네임 대신 "무엇을 담는지" 핵심만 —
// 금은 GOLD, 지수 추종은 S&P500·NASDAQ100, 배당·금리가 섞이면 대표 두 가지(Dividend · Interest Rate 등)
const US_ETF_CORE = (() => {
  const m = {};
  const put = (label, syms) => syms.split(" ").forEach((x) => (m[x] = label));
  put("S&P500", "VOO IVV SPY SPLG");
  put("NASDAQ100", "QQQ QQQM");
  put("US Total Market", "VTI ITOT SCHB");
  put("Dow Jones 30", "DIA");
  put("Russell 2000", "IWM");
  put("US Large Cap", "SCHX VV IWB");
  put("US Large Growth", "VUG IWF SCHG MGK VOOG SPYG IVW");
  put("US Large Value", "VTV IWD SPYV IVE");
  put("US Mid Cap", "IJH MDY VO IWR");
  put("US Small Cap", "IJR VB");
  put("Small Cap · Value", "VBR AVUV");
  put("S&P500 Equal Weight", "RSP");
  put("Low Volatility", "USMV");
  put("Quality Factor", "QUAL");
  put("Wide Moat", "MOAT");
  put("Free Cash Flow", "COWZ");
  put("US Core Equity", "DFAC");
  put("Developed ex-US", "VEA IEFA EFA SCHF");
  put("Emerging Markets", "IEMG VWO EEM");
  put("Total International", "VXUS IXUS");
  put("All World", "ACWI VT");
  put("Japan", "EWJ");
  put("Dividend", "SCHD VYM DVY SDY HDV SPYD SPHD");
  put("Dividend Growth", "VIG DGRO NOBL");
  put("S&P500 · Covered Call", "JEPI XYLD");
  put("NASDAQ100 · Covered Call", "JEPQ QYLD");
  put("Preferred · Dividend", "PFF");
  put("US Bonds · Interest Rate", "BND AGG IUSB BSV BIV");
  put("20Y+ Treasury", "TLT");
  put("7-10Y Treasury", "IEF");
  put("1-3Y Treasury", "SHY");
  put("US Treasury", "GOVT VGIT");
  put("T-Bill · Interest Rate", "SGOV BIL SHV USFR TFLO");
  put("Short Bond · Interest Rate", "JPST");
  put("Corporate Bond", "LQD VCIT VCSH");
  put("Municipal Bond", "MUB VTEB");
  put("Mortgage Bond", "MBB");
  put("EM Bond", "EMB");
  put("TIPS · Inflation", "TIP VTIP");
  put("High Yield Bond", "HYG JNK");
  put("GOLD", "GLD IAU GLDM SGOL");
  put("SILVER", "SLV");
  put("Gold Miners", "GDX GDXJ");
  put("Crude Oil", "USO");
  put("Commodities", "PDBC DBC");
  put("US Tech", "XLK VGT FTEC IYW");
  put("Semiconductor", "SMH SOXX");
  put("Software", "IGV");
  put("Cloud", "SKYY");
  put("Innovation", "ARKK");
  put("Financials", "XLF VFH");
  put("Health Care", "XLV VHT");
  put("Energy", "XLE VDE");
  put("Consumer Disc.", "XLY");
  put("Industrials", "XLI");
  put("Consumer Staples", "XLP VDC");
  put("Utilities", "XLU VPU");
  put("Materials", "XLB");
  put("Communication", "XLC");
  put("Real Estate", "VNQ XLRE");
  put("Bitcoin", "IBIT FBTC");
  put("Biotech", "XBI IBB");
  put("Aerospace · Defense", "ITA");
  put("NASDAQ100 3x", "TQQQ");
  put("NASDAQ100 -3x", "SQQQ");
  put("Semiconductor 3x", "SOXL");
  put("Semiconductor -3x", "SOXS");
  put("S&P500 3x", "UPRO");
  put("S&P500 -3x", "SPXU");
  put("NASDAQ100 2x", "QLD");
  put("S&P500 2x", "SSO");
  return m;
})();
// 미국 ETF 티커 오른쪽 작은 네모 섹터(2026-10-07 사용자 요청: 한국주식 자동추적처럼) — 한국 ETF·주식·코인은 빈 문자열
function etfSectorTagHtml(symbol) {
  const sym = String(symbol || "").toUpperCase();
  if (!sym || /\.(KS|KQ)$/.test(sym) || /-(USD|KRW)$/.test(sym) || sectionOfSymbol(sym) !== "etf") return "";
  const sec = etfSectorOf(sym);
  return sec && sec !== "기타" ? `<span class="at-sector">${escapeHtml(sec)}</span>` : "";
}
// 순위 표 이름 칸(rankNameCellHtml 결과)의 이름 바로 옆에 태그를 끼움
function withNameTag(nameHtml, tagHtml) {
  if (!tagHtml) return nameHtml;
  return nameHtml.replace(/(<b class="ticker-link rk-name"[^>]*>[^<]*<\/b>)/, `<span class="at-name-line">$1${tagHtml}</span>`);
}
function etfDisplayParts(symbol, fallbackName, quoteType) {
  const sym = String(symbol || "").toUpperCase();
  if (sectionOfSymbol(sym, quoteType) !== "etf") return null;
  const listed = ETF_NAME_BY_SYMBOL.get(sym) || (KR_ETF_LIST.find((x) => x.t === sym) || {}).name || (US_ETF_TOP100.find((x) => x.t === sym) || {}).n;
  const name = String(listed || fallbackName || "").trim();
  if (isKrTicker(sym)) {
    const sp = name.indexOf(" ");
    const brand = sp > 0 ? name.slice(0, sp) : "";
    let main = sp > 0 ? name.slice(sp + 1).trim() : name && name !== sym ? name : sym;
    // 브랜드만 떼면 뜻이 안 보이는 코스피200 추종 상품은 지수 이름을 붙여 줌(예: "KODEX 200" → "코스피200")
    const KOSPI200_ALIAS = { "200": "코스피200", "레버리지": "코스피200 레버리지", "인버스": "코스피200 인버스", "200선물인버스2X": "코스피200 인버스2X" };
    if (brand && KOSPI200_ALIAS[main]) main = KOSPI200_ALIAS[main];
    return { isKr: true, brand, main, sub: brand || rankCodeLabel(sym) };
  }
  const sub = US_ETF_CORE[sym] || TICKER_TO_KOREAN_NAME[sym] || (name && name !== sym ? name : "");
  return { isKr: false, brand: "", main: sym, sub };
}
// 국기 이모지(🇰🇷·🇺🇸 등)는 윈도우 크롬에서 "KR"·"US" 글자 두 개로 깨진다 —
// 국기 테마만 인라인 SVG로 그린다(한국·미국은 섹션 마크에 쓰던 것을 재사용).
const ETF_FLAG_SVG = {
  kr: FLAG_SVG_KR,
  us: FLAG_SVG_US,
  japan: `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#fff" stroke="rgba(0,0,0,0.22)"/><circle cx="10.5" cy="7" r="3.6" fill="#bc002d"/></svg>`,
  china: `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#de2910" stroke="rgba(0,0,0,0.22)"/><path fill="#ffde00" d="M5.4 3.1l.62 1.9-1.62-1.18h2l-1.62 1.18z"/><circle cx="8.6" cy="2.4" r="0.5" fill="#ffde00"/><circle cx="9.8" cy="3.7" r="0.5" fill="#ffde00"/><circle cx="9.8" cy="5.5" r="0.5" fill="#ffde00"/><circle cx="8.6" cy="6.8" r="0.5" fill="#ffde00"/></svg>`,
  india: `<svg viewBox="0 0 21 14" width="21" height="14"><defs><clipPath id="fhInFlagClip"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5"/></clipPath></defs><g clip-path="url(#fhInFlagClip)"><rect x="0" y="0" width="21" height="4.7" fill="#ff9933"/><rect x="0" y="4.7" width="21" height="4.6" fill="#fff"/><rect x="0" y="9.3" width="21" height="4.7" fill="#138808"/><circle cx="10.5" cy="7" r="1.7" fill="none" stroke="#000080" stroke-width="0.7"/></g><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="none" stroke="rgba(0,0,0,0.22)"/></svg>`,
  europe: `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#003399" stroke="rgba(0,0,0,0.22)"/><circle cx="10.5" cy="7" r="3.4" fill="none" stroke="#ffcc00" stroke-width="1.2" stroke-dasharray="0.9 1.3"/></svg>`,
};
function etfLeverageOf(name) {
  const rules = window.ETF_LEVERAGE_RULES || [];
  for (const r of rules) if (r.test.test(name)) return r;
  return null;
}
// 테마 표시 한 조각 — 국기 테마는 SVG, 나머지는 이모지
function etfThemeMarkHtml(theme) {
  const svg = ETF_FLAG_SVG[theme.key];
  return svg ? `<span class="etf-flag">${svg}</span>` : `<span class="etf-emoji">${theme.emoji}</span>`;
}
// ETF 배수 배지(X2·X3) HTML — 실제 로고 위에도, 이모지 위에도 똑같이 얹는다
function etfMultBadgeHtml(name) {
  const lev = etfLeverageOf(name || "");
  if (!lev) return "";
  // 인버스 1배는 배수를 안 붙이고 "I"(인버스)로만 표시 — X1은 오해 소지가 있음
  const badge = lev.dir === "short" && lev.mult === 1 ? "I" : `X${lev.mult}`;
  const cls = lev.dir === "short" ? "etf-mult-short" : "etf-mult-long";
  return `<span class="etf-mult-badge ${cls}">${badge}</span>`;
}
// ---------- ETF 운용보수·보유종목 DB(2026-09-11) ----------
// data/etf-info.json — 배치(sector-map/scripts/fetch-etf-info.ps1)가 미국은 야후 fundProfile/topHoldings,
// 국내는 네이버 etfAnalysis에서 모아둔 것. 야후 quoteSummary는 브라우저에서 부르면 401이라 미리 받아둔다.
// 300KB쯤 되니 ETF 화면에 들어올 때만 지연 로드.
let etfInfoDbPromise = null;
function getEtfInfoDb() {
  if (!etfInfoDbPromise) {
    etfInfoDbPromise = fetch("data/etf-info.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .catch((e) => {
        etfInfoDbPromise = null; // 실패는 캐시하지 않음
        throw e;
      });
  }
  return etfInfoDbPromise;
}
// ---------- ETF 섹터(2026-09-16 사용자 요청) ----------
// 마켓맵 지도가 ETF 버블을 묶는 기준(sector-map/app.js의 US_ETF_CATEGORY·classifyEtfCompany)과 같은 분류를 상세 개요에도 쓴다.
// 지도와 규칙이 갈라지면 같은 ETF가 다른 섹터로 보이므로, 지도 쪽을 고치면 여기도 같이 고칠 것.
const US_ETF_SECTOR = (() => {
  const m = {};
  const put = (cat, syms) => syms.split(" ").forEach((x) => (m[x] = cat));
  put(
    "미국지수",
    "VOO IVV SPY VTI QQQ QQQM VUG VTV IWF IWD IWM IJH IJR ITOT RSP IVW IVE VO VB VV VBR IWB IWR MGK MDY VOOG SPYG SPYV SCHX SCHG SCHB DFAC USMV QUAL MOAT COWZ AVUV DIA SPLG"
  );
  put("글로벌지수", "VEA IEFA IEMG VXUS VWO EFA SCHF IXUS ACWI EWJ VT EEM");
  put("배당·인컴", "SCHD VIG VYM JEPI JEPQ DGRO DVY SDY NOBL PFF SPYD SPHD HDV QYLD XYLD");
  put("채권·금리", "BND AGG TLT LQD VCIT VCSH MUB JPST MBB GOVT IEF SHY BSV VGIT VTEB IUSB SHV BIV EMB USFR BIL SGOV TIP VTIP TFLO HYG JNK");
  put("원자재", "GLD IAU GLDM SLV SGOL USO GDX GDXJ PDBC DBC");
  put("반도체·테크", "XLK VGT SMH SOXX FTEC IGV SKYY IYW ARKK");
  put("섹터·테마", "XLF XLV XLE XLY XLI XLP XLU XLB XLC XLRE VNQ VHT VDC VFH VDE VPU IBIT FBTC XBI IBB ITA JETS KRE XOP");
  put("레버리지·인버스", "TQQQ SQQQ SOXL SOXS UPRO SPXU TMF TZA TNA QLD SSO");
  return m;
})();
function etfSectorOf(symbol, name) {
  const sym = String(symbol || "").toUpperCase();
  if (!/\.(KS|KQ)$/i.test(sym)) return US_ETF_SECTOR[sym] || "기타";
  // 상세 화면은 야후 영문명("Samsung KODEX 200 ETF")을 넘겨서 한국 ETF가 전부 "기타"로 나왔다(2026-10-07) —
  // 앱이 가진 한글 상품명(국내 ETF 목록)을 먼저 쓴다
  const n = String(ETF_NAME_BY_SYMBOL.get(sym) || (KR_ETF_LIST.find((x) => x.t === sym) || {}).name || name || "");
  if (/(레버리지|인버스|곱버스)/.test(n)) return "레버리지·인버스";
  if (/(커버드콜|배당|리츠)/.test(n)) return "배당·인컴";
  if (/(채권|금리|머니마켓|KOFR|국채|통안채|금융채|단기채|크레딧|캐리)/.test(n)) return "채권·금리";
  if (/(금현물|골드|은현물|원유|원자재|구리|WTI)/.test(n)) return "원자재";
  if (/(반도체|HBM)/.test(n)) return "반도체·테크";
  if (/미국.*(S&P|나스닥|다우|500)/.test(n)) return "미국지수";
  if (/(테크|IT|AI|인공지능|로봇|우주|빅테크|전력|소프트웨어|인터넷)/.test(n)) return "반도체·테크";
  if (/(코스피|코스닥|코리아|KRX|Korea|밸류업|그룹|Top5|TOP10|(^|\s)200|(^|\s)100)/.test(n)) return "한국지수";
  if (/(2차전지|조선|방산|바이오|헬스케어|자동차|은행|금융|증권|철강|화학|건설|엔터|게임|여행|화장품|음식료|보험|에너지|수소|태양광|풍력|원자력|인프라|배터리)/.test(n)) return "섹터·테마";
  if (/(글로벌|중국|일본|인도|베트남|유럽|신흥국|차이나|항셍|닛케이|아시아)/.test(n)) return "글로벌지수";
  return "기타";
}

// 미국은 티커 그대로("VOO"), 국내는 야후 심볼 그대로("069500.KS")가 키
function etfInfoOf(db, symbol) {
  if (!db || !symbol) return null;
  return (db.us && db.us[symbol]) || (db.kr && db.kr[symbol]) || null;
}

const ICON_SVG_ETF = `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#2f6bd8" stroke="rgba(0,0,0,0.15)"/><text x="10.5" y="10" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif" letter-spacing="0.3">ETF</text></svg>`;
const ICON_SVG_BTC = `<svg viewBox="0 0 21 14" width="21" height="14"><circle cx="10.5" cy="7" r="6.6" fill="#f7931a"/><text x="10.6" y="9.9" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif">₿</text></svg>`;
// ---------- 섹션 마크(2026-09-01): 종목이 한국주식/미국주식/ETF/비트코인 중 어디 소속인지 작은 아이콘으로 표시 ----------
// 검색상세 상단 제목 옆·관심종목 목록의 종목 옆에 붙음. ETF 판별은 Yahoo quoteType(상세 화면) 또는 앱 내 ETF 목록 기준
let knownEtfSetCache = null;
function knownEtfSet() {
  if (!knownEtfSetCache) knownEtfSetCache = new Set([...US_ETF_TICKERS, ...KR_ETF_LIST.map((x) => x.t), ...US_ETF_TOP100.map((x) => x.t)]);
  return knownEtfSetCache;
}
function sectionOfSymbol(symbol, quoteType) {
  const sym = (symbol || "").toUpperCase();
  if (quoteType === "CRYPTOCURRENCY" || /-(USD|KRW)$/.test(sym)) return "crypto";
  if (quoteType === "ETF" || knownEtfSet().has(sym)) return "etf";
  return isKrTicker(sym) ? "kr" : "us";
}
function sectionMarkHtml(symbol, quoteType) {
  const section = sectionOfSymbol(symbol, quoteType);
  const svg = section === "crypto" ? ICON_SVG_BTC : section === "etf" ? ICON_SVG_ETF : section === "kr" ? FLAG_SVG_KR : FLAG_SVG_US;
  const label = section === "crypto" ? "비트코인" : section === "etf" ? "ETF" : section === "kr" ? "한국주식" : "미국주식";
  return `<span class="section-mark" title="${label}" aria-label="${label}">${svg}</span>`;
}

function syncSectionHeader() {
  const label = el("fhMarketLabel");
  const flag = el("fhMarketFlag");
  const isKr = getWatchlistActiveMarket() === "KR";
  // (2026-10-06) 관심종목이 상단 탭(투자처별)이 되면서 제목은 관심종목 화면에서도 투자처 이름을 그대로 보여준다
  if (label && flag) {
    if (appSectionMode === "etf") {
      label.textContent = "ETF";
      flag.innerHTML = ICON_SVG_ETF;
    } else if (appSectionMode === "crypto") {
      label.textContent = "비트코인";
      flag.innerHTML = ICON_SVG_BTC;
    } else {
      label.textContent = isKr ? "한국주식" : "미국주식";
      flag.innerHTML = isKr ? FLAG_SVG_KR : FLAG_SVG_US;
    }
  }
  document.dispatchEvent(new CustomEvent("appsectionchange"));
  try {
    syncNavHeader();
  } catch {} // 부팅 중 아직 선언 전이면 건너뜀
}

function syncMarketModeUI() {
  const isKr = getWatchlistActiveMarket() === "KR";
  document.body.dataset.marketMode = isKr ? "kr" : "us";
  marketModeKrBtn.classList.toggle("active", isKr);
  marketModeUsBtn.classList.toggle("active", !isKr);
  // 로고 오른쪽 현재 섹션 표시(한국주식/미국주식/ETF/비트코인) + 아이콘 — syncSectionHeader가 담당(2026-09-01)
  syncSectionHeader();
  document.dispatchEvent(new CustomEvent("marketmodechange"));
}
function setAppMarketMode(mode) {
  const market = mode === "kr" ? "KR" : "US";
  if (market === getWatchlistActiveMarket()) {
    syncMarketModeUI();
    return;
  }
  setWatchlistActiveMarket(market);
  syncMarketModeUI();
}
marketModeKrBtn.addEventListener("click", () => setAppMarketMode("kr"));
marketModeUsBtn.addEventListener("click", () => setAppMarketMode("us"));
syncMarketModeUI();

// popstate(뒤로/앞으로가기)는 아래 "뒤로가기 처리" 모듈(handleBackNavigation)이 한 곳에서 처리 — 열린 창 닫기 → 상세 열기/닫기 → 종료 확인 순
window.addEventListener("popstate", () => handleBackNavigation());

// 종목 심볼 클릭 시 기업 패널을 열며 해당 종목 분석으로 이동(TOP10·인기종목 표에 이벤트 위임으로 공통 적용)
document.addEventListener("click", (e) => {
  const link = e.target.closest(".ticker-link");
  if (link && link.dataset.ticker) {
    // 간편검색(위저드) 안의 종목을 눌렀을 때 그 창이 상세 화면을 가리지 않도록 먼저 닫음
    const wiz = el("searchWizardPanel");
    if (wiz && wiz.classList.contains("open")) closeSearchWizard();
    navigateToTicker(link.dataset.ticker);
  }
});

// ---------- 초기 부팅: 기본 화면은 "기업가치"(로그인 불필요) — ?ticker=가 있을 때만 기업 패널을 함께 염 ----------
(function initApp() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  // 필요한 일부 const가 이 시점엔 아직 선언 전(TDZ)이라 스크립트 전체 실행이 끝난 다음 틱으로 미룸
  // 시작화면(2026-09-01 사용자 확정): 한국주식 섹션의 인기종목 — 단, 화면을 직접 여는 딥링크로 들어온 경우엔 덮어쓰지 않음
  setTimeout(() => {
    // 2026-10-19: 하단 메뉴 딥링크(rank/earn/tech/wizard 등)도 기본 화면(인기종목)이 덮어쓰지 않게 — 안 그러면 별별순위·실적 위에 인기종목이 같이 떴다
    if (["watchlist", "etf", "crypto", "ranking-kr", "ranking-us", "ranking", "embed", "rank", "earn", "tech", "wizard", "market", "calendar", "more", "search"].includes(window.__deepLinkOpen)) return;
    // 종목 링크(?ticker=)로 바로 들어오면 그 뒤에 아무 화면도 깔지 않는다 — 닫을 때 온 곳으로 돌려보냄(위 X 버튼 처리)
    if (new URLSearchParams(location.search).get("ticker")) {
      window.__landedOnDetail = true;
      return;
    }
    appSectionMode = "stocks";
    setAppMarketMode("kr");
    setHeaderToneForSection("kr");
    openRankTab(); // 2026-10-20: 인기종목 화면 삭제 — 시작 화면은 별별순위
  }, 0);

  const params = new URLSearchParams(location.search);
  const initialTicker = params.get("ticker");
  if (initialTicker) navigateToTicker(initialTicker, { push: false });
  loadingSplash.style.display = "none";

  // 무료 프록시 과부하를 피하려고 인사이트는 백그라운드로 미리 로딩(사용자가 먼저 스와이프해서 들어가면 ensureTabLoaded가 그 자리에서 바로 시작함)
  ensureTabLoaded("insight");
})();

// 한국어 회사명으로도 검색할 수 있도록 자주 찾는 미국 기업 위주로 별도 매핑(야후 검색 API는 한국어 매칭을 지원하지 않음)
// 한글 회사명 별칭표는 data/ko-company-names.js로 분리(2026-09-11) — 지도(sector-map)와 공유
const KOREAN_COMPANY_NAMES = (typeof window !== "undefined" && window.KOREAN_COMPANY_NAMES) || {};

// 티커 → 한글명 역매핑(KOREAN_COMPANY_NAMES 재사용) — 같은 티커에 별칭이 여러 개면 먼저 나오는 것을 사용
const TICKER_TO_KOREAN_NAME = {};
for (const [ko, tk] of Object.entries(KOREAN_COMPANY_NAMES)) {
  if (!TICKER_TO_KOREAN_NAME[tk]) TICKER_TO_KOREAN_NAME[tk] = ko;
}

// 야후 검색 결과의 거래소 코드/표기를 사람이 읽기 쉬운 상장 위치로 정규화(NYSE / NASDAQ / NYSE American 등)
function normalizeExchange(q) {
  const raw = ((q && (q.exchDisp || q.exchange)) || "").toString();
  const s = raw.toUpperCase();
  if (s.includes("NASDAQ") || s === "NMS" || s === "NGM" || s === "NCM") return "NASDAQ";
  if (s.includes("AMERICAN") || s === "ASE" || s === "AMEX") return "NYSE American";
  if (s.includes("ARCA") || s === "PCX") return "NYSE Arca";
  if (s.includes("NYSE") || s === "NYQ") return "NYSE";
  return raw; // 그 외는 야후 표기 그대로 노출
}
// 티커 검색 입력 바(입력→자동완성→선택/엔터로 이동)를 하나의 컨트롤러로 묶어, 헤더 검색 오버레이와
// 기업검색 위저드 상단 바에 동일한 동작을 붙일 수 있게 함
function attachTickerSearchBar(inputEl, suggestEl, analyzeBtnEl, { onBeforeNavigate } = {}) {
  let suggestTimer = null;
  function hideSuggest() {
    suggestEl.style.display = "none";
    suggestEl.innerHTML = "";
  }
  function renderSuggest(items) {
    if (items.length === 0) {
      hideSuggest();
      return;
    }
    suggestEl.innerHTML = items
      .map((it) => {
        // ETF는 한국=상품명 먼저(아래 브랜드·티커), 미국=티커 먼저(아래 상품명) — 2026-09-13 사용자 요청
        const etfParts = etfDisplayParts(it.symbol, it.name, it.quoteType);
        const displayName = etfParts ? etfParts.main : TICKER_TO_KOREAN_NAME[it.symbol] || it.name || it.symbol;
        const subText = etfParts
          ? etfParts.isKr
            ? `${etfParts.sub} · ${it.symbol}`
            : etfParts.sub || it.symbol
          : `${it.symbol}${it.exchange ? ` · ${it.exchange}` : ""}`;
        return `<div class="chat-ticker-option" data-symbol="${escapeHtml(it.symbol)}">
            ${tickerLogoHtml(it.symbol)}
            <span class="chat-ticker-option-name">${escapeHtml(displayName)}${sectionMarkHtml(it.symbol, it.quoteType)}</span>
            <span class="chat-ticker-option-sub">${escapeHtml(subText)}</span>
          </div>`;
      })
      .join("");
    suggestEl.style.display = "block";
  }
  async function handleInput() {
    const q = inputEl.value.trim();
    if (suggestTimer) clearTimeout(suggestTimer);
    if (q.length < 1) {
      hideSuggest();
      return;
    }

    // 한국어 회사명 매칭은 목록이 작아 네트워크 응답을 기다리지 않고 바로 화면에 표시(거래소는 영문 결과에서 보강)
    // 미국 종목의 한글 닉네임(KOREAN_COMPANY_NAMES) + 한국 상장 종목 실제 회사명(KR_NAME_TO_TICKER) 둘 다 부분일치로 검색.
    // 야후 검색 API는 한글 질의를 거부해서("Invalid Search Query") 코스피/코스닥 종목은 이 로컬 매칭이 사실상 유일한 경로.
    const koreanMatches = [
      ...Object.entries(KOREAN_COMPANY_NAMES)
        .filter(([name]) => name.includes(q))
        .map(([name, symbol]) => ({ symbol, name, exchange: null })),
      ...Object.entries(KR_NAME_TO_TICKER)
        .filter(([name]) => name.includes(q))
        .map(([name, symbol]) => ({ symbol, name, exchange: symbol.endsWith(".KQ") ? "코스닥" : "코스피" })),
      // 국내 ETF 상품명(2026-09-13): 야후 검색은 "TIGER 미국배당" 같은 한글 상품명을 못 찾아서 관심종목에 못 담던 문제 —
      // 국내 ETF 전체 목록(ETF_NAME_BY_SYMBOL)에서 띄어쓰기 무시·대소문자 무시 부분일치로 찾음
      ...(() => {
        const norm = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
        // 한글로 부르는 브랜드(코덱스·타이거…)도 영문 상품명과 맞춰 봄
        const BRAND_KO = { 코덱스: "KODEX", 타이거: "TIGER", 에이스: "ACE", 라이즈: "RISE", 쏠: "SOL", 플러스: "PLUS", 하나로: "HANARO", 아리랑: "ARIRANG", 킨덱스: "KINDEX", 코세프: "KOSEF" };
        const nq = norm(Object.entries(BRAND_KO).reduce((s, [ko, en]) => s.replace(ko, en), q));
        const out = [];
        ETF_NAME_BY_SYMBOL.forEach((name, symbol) => {
          if (isKrTicker(symbol) && norm(name).includes(nq)) out.push({ symbol, name, exchange: "ETF", quoteType: "ETF" });
        });
        return out.slice(0, 8);
      })(),
    ];
    renderSuggest(koreanMatches.slice(0, 8));

    suggestTimer = setTimeout(async () => {
      let englishMatches = [];
      try {
        const data = await yahooSearch(q);
        englishMatches = ((data && data.quotes) || [])
          .filter((qt) => qt.symbol)
          .map((qt) => ({ symbol: qt.symbol, name: qt.shortname || qt.longname || "", exchange: normalizeExchange(qt), quoteType: qt.quoteType }));
      } catch {
        // 검색 실패 시 한국어 매칭 결과만이라도 유지
      }
      if (inputEl.value.trim() !== q) return; // 응답이 오는 사이 검색어가 바뀌었으면 무시(경쟁 상태 방지)
      // 한글 매칭에 상장 거래소가 없으면 같은 심볼의 영문 결과에서 보강
      const exBySymbol = new Map(englishMatches.map((e) => [e.symbol, e.exchange]));
      koreanMatches.forEach((k) => {
        if (!k.exchange && exBySymbol.has(k.symbol)) k.exchange = exBySymbol.get(k.symbol);
      });
      const seen = new Set();
      const merged = [...koreanMatches, ...englishMatches].filter((it) => {
        if (seen.has(it.symbol)) return false;
        seen.add(it.symbol);
        return true;
      });
      renderSuggest(merged.slice(0, 8));
    }, 250);
  }
  function trigger() {
    if (!inputEl.value.trim()) {
      showToast("분석할 기업의 티커나 한글 회사명을 입력해주세요.");
      return;
    }
    const ticker = resolveKoreanTicker(inputEl.value);
    hideSuggest();
    if (onBeforeNavigate) onBeforeNavigate();
    navigateToTicker(ticker);
  }
  suggestEl.addEventListener("click", (e) => {
    const option = e.target.closest(".chat-ticker-option");
    if (!option) return;
    inputEl.value = option.dataset.symbol;
    hideSuggest();
    trigger();
  });
  inputEl.addEventListener("input", handleInput);
  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !suggestEl.contains(e.target)) {
      hideSuggest();
    }
  });
  analyzeBtnEl.addEventListener("click", trigger);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trigger();
  });
  return { trigger, hideSuggest };
}

// ---------- 메인 분석 흐름 ----------
// 입력값을 티커로 해석 — 한글 회사명(예: "애플" → AAPL), "애플(AAPL)"처럼 괄호 안 티커 표기, 영문 티커를 모두 지원
function resolveKoreanTicker(input) {
  const raw = (input || "").trim();
  const paren = raw.match(/\(([A-Za-z][A-Za-z.\-]{0,6})\)/); // "이름(TICKER)" 형태면 괄호 안 티커 우선
  if (paren) return paren[1].toUpperCase();
  const key = raw.replace(/\s+/g, ""); // 공백 제거 후 한글명 매핑 조회("존슨 앤 존슨" 등 대응)
  if (KOREAN_COMPANY_NAMES[key]) return KOREAN_COMPANY_NAMES[key];
  if (KR_NAME_TO_TICKER[raw]) return KR_NAME_TO_TICKER[raw]; // "삼성전자"처럼 국내 종목 한글명 직접 입력 대응(공백 없는 종목명이 대부분이라 원문 그대로 조회)
  return raw.toUpperCase();
}

const mainTickerSearchBar = attachTickerSearchBar(tickerInput, tickerSuggest, analyzeBtn);
// 기업검색 위저드 상단의 검색 바 — 헤더 검색과 동일하게 동작하되, 종목 선택 시 위저드 패널을 닫고 기업 패널을 보여줌
attachTickerSearchBar(el("wizardTickerInput"), el("wizardTickerSuggest"), el("wizardAnalyzeBtn"), {
  onBeforeNavigate: closeSearchWizard,
});
let currentGroundData = null; // 투자 그라운드(52주 신고가~신저가 5등분)에 쓸 현재 종목의 데이터

// 야후 검색(v1/finance/search)이 quotes를 비워 보낼 때의 폴백 — 차트 meta(longName/shortName/instrumentType/exchangeName)로 검색 결과와 같은 모양을 만듦
async function quoteFromChartMeta(ticker) {
  try {
    const c = await yahooChart(ticker, "5d", "1d");
    const meta = c && c.chart && c.chart.result && c.chart.result[0] && c.chart.result[0].meta;
    if (!meta || !Number.isFinite(meta.regularMarketPrice)) return null;
    return {
      symbol: meta.symbol || ticker,
      longname: meta.longName || meta.shortName || ticker,
      shortname: meta.shortName || meta.longName || ticker,
      quoteType: meta.instrumentType || "EQUITY",
      exchange: meta.exchangeName || "",
      exchDisp: meta.fullExchangeName || meta.exchangeName || "",
      sector: "",
      industry: "",
    };
  } catch {
    return null;
  }
}
async function runAnalysis(ticker) {
  analyzeBtn.disabled = true;
  results.style.display = "none";
  setStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    await krCreditRatingReady; // 한글 종목명 표시가 필요하므로 KR 신용등급/종목명 맵 로딩을 먼저 보장
    const searchData = await yahooSearch(ticker);
    let quote = searchData && searchData.quotes && searchData.quotes[0];
    // 2026-09-09: 야후 검색이 간헐적으로 quotes를 비워 보내는 종목(LLY 등)이 있어 차트 meta로 최소 정보를 만들어 진행
    if (!quote) quote = await quoteFromChartMeta(ticker);

    if (!quote) {
      throw new Error(
        isKrTicker(ticker)
          ? `'${ticker}' 티커를 찾을 수 없습니다. 거래정지·관리종목이거나 정확하지 않은 티커일 수 있습니다.`
          : `'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`
      );
    }

    const chartData = await yahooChart(ticker);
    if (!chartData || !chartData.chart || !chartData.chart.result) {
      throw new Error(`'${ticker}'의 시세 데이터를 가져오지 못했습니다.`);
    }
    const meta = chartData.chart.result[0].meta;

    // 투자 그라운드(52주 신고가~신저가 5등분)용 데이터 — meta에 없으면 방금 받은 1년 캔들에서 직접 계산
    let groundHigh = meta.fiftyTwoWeekHigh;
    let groundLow = meta.fiftyTwoWeekLow;
    if (groundHigh === undefined || groundLow === undefined) {
      const q = chartData.chart.result[0].indicators && chartData.chart.result[0].indicators.quote && chartData.chart.result[0].indicators.quote[0];
      const highs = (q && q.high) || [];
      const lows = (q && q.low) || [];
      const validHighs = highs.filter((v) => v !== null && v !== undefined);
      const validLows = lows.filter((v) => v !== null && v !== undefined);
      if (validHighs.length) groundHigh = Math.max(...validHighs);
      if (validLows.length) groundLow = Math.min(...validLows);
    }
    currentGroundData =
      groundHigh !== undefined && groundLow !== undefined
        ? { symbol: meta.symbol || ticker, name: quote.longname || quote.shortname || meta.symbol || ticker, high: groundHigh, low: groundLow, currency: meta.currency || "USD" }
        : null;

    results.style.display = "block";
    setStatus("loading", "섹션별 데이터를 정리하는 중입니다...");

    renderCompanyIdentity(ticker, quote, meta, getDailyChangePercent(chartData));
    el("summaryChartExpandBtn").dataset.chartSymbol = ticker;

    // 암호화폐 상세(2026-09-01 사용자 요청): 개요(차트+요약)와 주요 뉴스만 표시 —
    // 주식 전용 섹션(매출액/invest점수/과거분석·미래예측·s리포트 버튼 등)은 CSS로 숨기고 데이터 조회도 생략
    const isCryptoDetail = sectionOfSymbol(ticker, quote.quoteType) === "crypto";
    el("companyPanel").classList.toggle("crypto-detail", isCryptoDetail);

    // ETF 상세(2026-09-01): invest점수 탭의 상승압력·투자안정을 ETF 전용 배점으로 계산.
    // 개별주식 투자안정 분포도(+자세히)는 주식 전용이라 ETF에선 버튼만 숨김
    const isEtfDetail = !isCryptoDetail && sectionOfSymbol(ticker, quote.quoteType) === "etf";
    // ETF 상세(2026-09-03 사용자 요청): 코인처럼 매출액 서브탭 숨김(펀드라 매출 개념이 없음) — CSS .etf-detail 참조
    el("companyPanel").classList.toggle("etf-detail", isEtfDetail);
    const scoreMode = isCryptoDetail ? "crypto" : isEtfDetail ? "etf" : "stock";

    // 나스닥·다우존스·S&P500 1년 수익률과, 분석 대상 자신의 지표(차트+재무제표)는
    // 경쟁사 비교(3)·상승압력도(5)·투자 안정성(6)·미래예측(요약 탭의 🔮 토글) 섹션이 각자 다시 조회하지 않고 공유해서
    // 프록시 요청 수를 줄이고(속도·안정성 향상) 값도 서로 어긋나지 않도록 함
    const marketReturnsPromise = getMarketReturns();
    const selfMetricsPromise = getFullMetrics(ticker);

    renderSummary(quote, meta, getDailyChangePercent(chartData), selfMetricsPromise, marketReturnsPromise, getDailyChangeAmount(chartData)).catch((e) => {
      el("summarySection").innerHTML = `<p class="error-inline">사업 요약을 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    // S리포트 요약 카드(2026-09-15): 승률·상승률·매출액·변동성·RSI 5개 + 평가 한 줄
    renderSReportTop(ticker, scoreMode, quote, selfMetricsPromise).catch((e) => {
      el("sReportTopSection").innerHTML = `<p class="error-inline">핵심지표를 계산하지 못했습니다: ${escapeHtml(e.message || "")}</p>`;
    });

    // 하위 탭 3번째 자리: 주식은 매출액(재무정보), ETF는 보유종목, 코인은 아예 감춤(2026-09-16 사용자 요청)
    el("summarySubtabRevenueBtn").querySelector(".tab-label").textContent = isEtfDetail ? "보유비중" : "매출액"; // 2026-10-06 "보유종목" → "보유비중"
    el("financialsHeading").innerHTML = isEtfDetail
      ? `보유 종목<span class="srt-asof">${new Date().getMonth() + 1}/${new Date().getDate()} 기준</span>`
      : "재무정보";
    // 2026-10-08 사용자 요청: 재무정보 옆에 실적발표 날짜 — 7일 안에 나왔으면 그 날짜 + '실적' 마크, 아니면 다음 발표일(확정/추정)
    if (!isEtfDetail && !isCryptoDetail) {
      const headTicker = ticker;
      window.__finHeadTicker = ticker; // 늦게 끝난 이전 종목 결과가 덮지 않게
      (async () => {
        await getEarningsCal();
        const e = earningsEntry(headTicker);
        const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        // 2026-10-21 사용자 요청: 재무정보 옆에 "최근실적: 발표일 · 다음실적: 발표일" 두 가지 모두(마크 실적/예정은 그대로)
        const lastText = e && e.last ? md(new Date(e.last + "T00:00:00")) : "";
        const n = await nextEarningsInfo(headTicker).catch(() => null);
        const nextText = n ? `${md(n.date)}${n.exact ? "" : "(추정)"}` : "";
        let html = "";
        if (lastText || nextText) {
          html = `<span class="fin-earn-wrap"><span class="fin-earn">최근실적: ${lastText || "-"}</span><span class="fin-earn">다음실적: ${nextText || "-"}</span></span>${earnBadgeHtml(headTicker)}`;
        }
        const h = el("financialsHeading");
        if (h && html && window.__finHeadTicker === headTicker) h.innerHTML = `재무정보${html}`;
      })();
    }
    el("summarySubtabRevenueBtn").style.display = isCryptoDetail ? "none" : "";
    if (isCryptoDetail || isEtfDetail) {
      FIN2_STATE.token++; // 매출액 차트가 없는 자산 — 앞서 연 주식의 늦게 도착한 차트가 숨은 영역에 그려지지 않게
      // ETF는 renderSummary가 이 자리에 보유 종목을 넣으므로 비우지 않는다(비우면 늦게 끝난 쪽이 상대를 지움)
      if (!isEtfDetail) el("financialsSection").innerHTML = "";
    } else {
      // 2026-09-15 사용자 요청: 년간/분기 세로 막대 차트 한 장으로 통합(분기 실적 섹션은 "분기" 버튼으로 이동, 영업이익 삭제)
      renderFinancials(ticker, meta.currency).catch((e) => {
        el("financialsSection").innerHTML = `<p class="error-inline">실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });
      // 경쟁사 매출 비교(renderPeers)는 2026-09-15 사용자 요청으로 버튼째 숨겨 불러오지 않음(요청 수 절약)
    }

    // 국내 종목·암호화폐는 Yahoo 뉴스가 해당 종목과 무관한 기사를 자주 섞어 내보내(2026-09-01 사용자 확인),
    // 한글 이름(코인은 "비트코인" 등, 없으면 "Cardano"처럼 영문명)으로 구글/Bing 뉴스 RSS를 검색해 대체하고 실패 시에만 Yahoo 뉴스로 폴백
    const newsQueryName = isKrTicker(ticker)
      ? TICKER_TO_KOREAN_NAME[ticker] || quote.longname || quote.shortname || ticker
      : isCryptoDetail
      ? cryptoKoName(ticker, quote.shortname || quote.longname || ticker)
      : null;
    const newsDataPromise = newsQueryName
      ? fetchKrCompanyNews(newsQueryName)
          .then((news) => (news.length ? { news } : searchData))
          .catch(() => searchData)
      : Promise.resolve(searchData);
    newsDataPromise.then((d) => renderNews(d)).catch((e) => {
      el("newsSection").innerHTML = `<p class="error-inline">뉴스를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    // 개요 9칸 지표 표(2026-09-04 사용자 요청): 10년/작년/내년 승률·상승률·RSI 9칸 + 최근 12개월 승패(OX) 표
    // — 기존 4점수 미니 배지(상승압력/투자안정/우상향/RSI)를 대체. 값은 배치 DB(winrate-scores-us.json)
    renderSummaryScoreRow(ticker, scoreMode);

    // 10년월간승률·연평균 상승·RSI 점수 섹션(invest점수 탭)은 2026-09-15 사용자 요청으로 탭째 삭제 — S리포트 요약 카드가 대신함

    setStatus(null, null);
  } catch (err) {
    setStatus("error", `❌ ${escapeHtml(err.message || "알 수 없는 오류가 발생했습니다.")}`);
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ---------- 투자 그라운드: 52주 신고가~신저가를 머리~발끝 5등분해 졸라맨으로 표시(회사 로고를 머리에 얹음) ----------
const GROUND_LANDMARKS = ["머리", "어깨", "배꼽", "무릎", "발"];
function fmtGroundPrice(v, currency) {
  return fmtPriceFull(v, currency);
}
function buildGroundSvg({ symbol, high, low, currency }) {
  const W = 320,
    headY = 90,
    footY = 430;
  const stepY = (footY - headY) / 4;
  const cx = W / 2;
  const headR = 36;
  const ys = [0, 1, 2, 3, 4].map((k) => headY + k * stepY);
  const prices = [0, 1, 2, 3, 4].map((k) => high - (k / 4) * (high - low));
  const { primary, fmp, useFallback } = logoSources(symbol, 160);

  const guides = ys
    .map(
      (y, i) => `
      <line x1="10" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#2b2f3a" stroke-width="1" stroke-dasharray="3,3" />
      <text x="10" y="${(y - 8).toFixed(1)}" font-size="13" fill="#9aa2b1">${GROUND_LANDMARKS[i]}</text>
      <text x="${W - 10}" y="${(y - 8).toFixed(1)}" text-anchor="end" font-size="13" font-weight="700" fill="#eceef2">${fmtGroundPrice(prices[i], currency)}</text>`
    )
    .join("");

  const shoulderY = ys[1];
  const hipY = ys[2] + stepY * 0.3;

  return `<svg viewBox="0 0 ${W} 470" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="투자 그라운드">
    <defs>
      <clipPath id="groundHeadClip"><circle cx="${cx}" cy="${headY}" r="${headR}" /></clipPath>
    </defs>
    <rect x="0" y="0" width="${W}" height="470" fill="#0b0d12" />
    ${guides}
    <line x1="${cx}" y1="${headY + headR}" x2="${cx}" y2="${hipY.toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${shoulderY.toFixed(1)}" x2="${cx - 44}" y2="${(shoulderY + 46).toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${shoulderY.toFixed(1)}" x2="${cx + 44}" y2="${(shoulderY + 46).toFixed(1)}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${hipY.toFixed(1)}" x2="${cx - 36}" y2="${footY}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <line x1="${cx}" y1="${hipY.toFixed(1)}" x2="${cx + 36}" y2="${footY}" stroke="#eceef2" stroke-width="4" stroke-linecap="round" />
    <circle cx="${cx}" cy="${headY}" r="${headR}" fill="#1c1f27" stroke="#eceef2" stroke-width="3" />
    <image x="${cx - headR}" y="${headY - headR}" width="${headR * 2}" height="${headR * 2}" href="${primary}" clip-path="url(#groundHeadClip)" preserveAspectRatio="xMidYMid slice" ${useFallback ? `data-fallback="${fmp}"` : ""} onerror="var f=this.dataset.fallback; if(f){this.removeAttribute('data-fallback');this.setAttribute('href',f);}" />
  </svg>`;
}
function openGroundModal() {
  groundBody.innerHTML = currentGroundData
    ? buildGroundSvg(currentGroundData)
    : `<p class="muted">52주 데이터를 아직 불러오지 못했습니다.</p>`;
  groundModal.style.display = "flex";
}
function closeGroundModal() {
  groundModal.style.display = "none";
}
groundOpenBtn.addEventListener("click", openGroundModal);
groundModalCloseBtn.addEventListener("click", closeGroundModal);

// ---------- 공유하기 바텀시트: 그라운드 SVG를 캔버스로 그려 PNG로 변환 후 저장/공유 ----------
// SVG 문자열을 PNG Blob으로 변환
function groundSvgToPngBlob() {
  return new Promise((resolve, reject) => {
    const svgEl = groundBody.querySelector("svg");
    if (!svgEl) return reject(new Error("그라운드 이미지가 없습니다."));
    const svgText = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환 실패"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 만들지 못했습니다."));
    };
    img.src = url;
  });
}
function downloadGroundBlob(blob, symbol) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `투자그라운드_${symbol}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 시트가 열리자마자 PNG 변환을 미리 시작해둠 — navigator.share()는 사용자 클릭 직후(제스처 유효 시간 내)에
// 바로 호출해야 브라우저가 허용하므로, 버튼 클릭 시점에는 이미 준비된 결과를 기다리기만 하면 되게 함
let groundPngBlobPromise = null;
function openShareSheet() {
  groundPngBlobPromise = groundSvgToPngBlob();
  shareSheet.style.display = "block";
}
function closeShareSheet() {
  shareSheet.style.display = "none";
}
groundShareOpenBtn.addEventListener("click", openShareSheet);
shareSheetCloseBtn.addEventListener("click", closeShareSheet);
shareSheetBackdrop.addEventListener("click", closeShareSheet);

async function shareOrDownloadGround(shareText) {
  const symbol = (currentGroundData && currentGroundData.symbol) || "ground";
  try {
    const blob = await groundPngBlobPromise;
    const file = new File([blob], `투자그라운드_${symbol}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "투자 그라운드", text: shareText });
      return;
    }
    downloadGroundBlob(blob, symbol);
    alert("이미지를 저장했습니다. 저장된 이미지를 앱에서 직접 업로드해주세요.");
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 공유 시트를 취소한 경우
    alert("공유에 실패했습니다: " + (err.message || "알 수 없는 오류"));
  }
}
shareSaveBtn.addEventListener("click", async () => {
  closeShareSheet();
  try {
    const blob = await groundPngBlobPromise;
    downloadGroundBlob(blob, (currentGroundData && currentGroundData.symbol) || "ground");
  } catch (err) {
    alert("저장에 실패했습니다: " + (err.message || "알 수 없는 오류"));
  }
});
shareKakaoBtn.addEventListener("click", () => {
  closeShareSheet();
  shareOrDownloadGround("투자 그라운드 - 카카오톡으로 공유해보세요");
});
shareInstaBtn.addEventListener("click", () => {
  closeShareSheet();
  shareOrDownloadGround("투자 그라운드 - 인스타그램에 공유해보세요");
});

// ---------- 기업검색 요약 페이지 4분할 서브탭(개요/S리포트/매출액/뉴스 — 2026-09-15 invest점수 → S리포트) ----------
const summarySubtabButtons = {
  summary: el("summarySubtabSummaryBtn"),
  sreport: el("summarySubtabSReportBtn"),
  revenue: el("summarySubtabRevenueBtn"),
  news: el("summarySubtabNewsBtn"),
};
const summarySubtabPanels = {
  summary: document.querySelector('[data-summary-subtabpanel="summary"]'),
  sreport: document.querySelector('[data-summary-subtabpanel="sreport"]'),
  revenue: document.querySelector('[data-summary-subtabpanel="revenue"]'),
  news: document.querySelector('[data-summary-subtabpanel="news"]'),
};
// 개요 아래로 매출액/invest점수/주요뉴스가 한 화면에 이어져 있어(단일 스크롤), 탭 클릭은 숨기고 보여주는 대신
// 해당 섹션으로 부드럽게 스크롤만 시켜줌
function switchSummarySubtab(key) {
  const panel = summarySubtabPanels[key];
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
Object.entries(summarySubtabButtons).forEach(([key, btn]) => {
  btn.addEventListener("click", () => switchSummarySubtab(key));
});

// 스크롤 위치에 따라 현재 보고 있는 섹션의 탭이 자동으로 활성화되도록(스크롤 스파이) — 탭 클릭 없이 내려도
// 다음 탭으로 자연스럽게 넘어가 보이게 함
(function setupSummarySubtabScrollSpy() {
  const scrollRoot = companyPanel.querySelector(".company-panel-body");
  if (!scrollRoot) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const key = visible[0].target.dataset.summarySubtabpanel;
      Object.entries(summarySubtabButtons).forEach(([k, btn]) => btn.classList.toggle("active", k === key));
    },
    { root: scrollRoot, rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );
  Object.values(summarySubtabPanels).forEach((panel) => panel && observer.observe(panel));
})();

// 경쟁사 매출 비교는 별도 서브탭 대신 매출액 서브탭 안(첫 그래프 바로 아래)에 토글로 표시 —
// renderPeers()는 티커 로드 시 이미 항상 백그라운드로 #peersSection을 채워두므로 여기서는 표시 여부만 토글
const peersToggleBtn = el("peersToggleBtn");
const peersSectionEl = el("peersSection");
peersToggleBtn.addEventListener("click", () => {
  const isOpen = peersSectionEl.style.display !== "none";
  peersSectionEl.style.display = isOpen ? "none" : "block";
  peersToggleBtn.classList.toggle("active", !isOpen);
});

// ---------- S리포트: 기업가치·시장동향 15개 항목을 한 번에 비교해 수치+전체 유니버스 내 순위를 보여줌 ----------
// 순위 계산은 매번 500+개 종목의 재무제표를 새로 조회하면 너무 느려서, 지도(sector-map)가 이미 배치로
// 수집해둔 전체 유니버스 스냅샷(sector-map/data/{kr,sp500}-sectors.json — S&P500 501개/코스피200+코스닥150
// 347개, revenueGrowth 등 13개 필드 + pressureScore·stabilityScore 포함)을 그대로 재사용한다. 거래대금만
// 예외로, 이 스냅샷엔 미국 종목의 dollarVolume이 없어서(비공식 API 배치 비용 문제) 미국은 순위 없이 본인의
// 실시간 값(selfMetrics.recentDollarVolume)만 보여준다.
const sReportUniverseCache = { us: null, kr: null };
let lastDataLoadError = ""; // 마지막 데이터 파일 로드 실패 사유(오류 문구에 표시해 원인 파악용, 2026-09-08)
function getSReportUniverse(isKr) {
  const key = isKr ? "kr" : "us";
  if (!sReportUniverseCache[key]) {
    const path = isKr ? "sector-map/data/kr-sectors.json" : "sector-map/data/sp500-sectors.json";
    // 2026-09-08: 앱 시작 때(인기종목) 한 번 실패하면 세션 내내 null이 캐시돼 섹터승률·순위상승 등이 전부 "데이터 부족"이 되던 문제 —
    // 실패는 캐시하지 않고 1.5초 뒤 한 번 더 시도, 그래도 실패하면 다음 호출에서 재시도
    const fetchOnce = () =>
      fetch(path, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      });
    sReportUniverseCache[key] = fetchOnce()
      .catch(() => sleep(1500).then(fetchOnce))
      .catch((e) => {
        lastDataLoadError = `${path}: ${(e && e.message) || e}`;
        sReportUniverseCache[key] = null;
        return null;
      });
  }
  return sReportUniverseCache[key];
}

// ---------- S리포트(2026-09-15 사용자 요청, 같은 날 3차 개편) ----------
// 요약 카드: 핵심 5개(승률·상승률·매출액·변동성·RSI)를 오각형 레이더로 — 초록 실선 = 이 종목, 회색 점선 = 비교 기준.
//   축 길이 = 비교군 안 백분위(유리할수록 바깥): 변동성은 낮을수록, RSI는 높을수록 바깥.
// 더보기: 5개를 포함한 S리포트 전 항목을 "종합 판정 + 비교표 + 백분위 5칸 막대(상위 N%)"로.
// 비교 기준(사용자 지정): 한국 주식 = 코스피200 평균, 미국 주식 = S&P500 시총 상위 200 평균, IPO = 한국·미국 IPO 시총 상위 100 평균,
//   코인 = 코인200 평균, ETF = SPY 값(백분위는 ETF 전체 안에서).
// 평균·분포·종목별 값은 매일 배치(sector-map/scripts/build-sreport-baseline.py → data/sreport-baseline.json)가 미리 계산해 두고,
// 앱은 그 파일 하나만 읽어 바로 그린다(볼 때마다 수백 종목을 불러오며 버퍼링되던 문제 해결). DB에 없는 종목만 자기 값을 실시간 계산.
// 매출액은 IPO 비교군에 절대 매출 데이터가 없어 "작년 대비 매출 증가율"로, 매출이 없는 ETF·코인은 그 자리에 1년 수익률.
// 변동성 = 최근 3개월 하루 변동량(|일간 등락률| 평균, 같은 날 사용자 요청으로 1년 주간 변동성에서 변경).
let sReportBaselinePromise = null;
function getSReportBaseline() {
  if (!sReportBaselinePromise) {
    const fetchOnce = () =>
      fetch("data/sreport-baseline.json", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      });
    sReportBaselinePromise = fetchOnce()
      .catch(() => sleep(1500).then(fetchOnce))
      .catch(() => {
        sReportBaselinePromise = null; // 실패는 캐시하지 않음
        return null;
      });
  }
  return sReportBaselinePromise;
}
setTimeout(() => getSReportBaseline(), 2500); // 첫 상세 화면에서 기다리지 않게 미리 받아 둠

// 비교군 분포 안 위치(0~1, 유리한 쪽이 1) — better:"low"면 작을수록 유리
function sReportPercentile(values, v, better) {
  if (!Array.isArray(values) || !values.length || !Number.isFinite(v)) return null;
  let worse = 0;
  let tie = 0;
  values.forEach((x) => {
    if (x === v) tie++;
    else if (better === "low" ? x > v : x < v) worse++;
  });
  return Math.min(1, Math.max(0, (worse + tie / 2) / values.length));
}
function sReportRsiJudge(rsi, refRsi) {
  if (!Number.isFinite(rsi)) return null;
  // 매수·매도 우위 5등급(2026-09-17 사용자 지정) — 기준은 이 종목 자신의 1년 평균 RSI라 종목마다 다르다.
  //   평균보다 높으면 매수 쪽에 힘이 실린 상태, 낮으면 매도 쪽. ±10 안은 평균, ±20부터 "강한".
  if (!Number.isFinite(refRsi)) return { text: "평균", tone: "neutral" };
  const diff = rsi - refRsi;
  if (diff >= 20) return { text: "강한매수우위", tone: "up" };
  if (diff >= 10) return { text: "매수우위", tone: "up" };
  if (diff > -10) return { text: "평균", tone: "neutral" };
  if (diff > -20) return { text: "매도우위", tone: "down" };
  return { text: "강한매도우위", tone: "down" };
}


const sPct = (v, d, signed) => `${signed && v > 0 ? "+" : ""}${d ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v)}%`;
const sNum = (v, d) => (d ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));

// 항목을 누르면 펼쳐지는 2줄 설명(2026-09-15 사용자 요청: 어떻게 구했는지 + 높을수록 무슨 뜻인지) — 앱 공통 data-explain 장치 사용
const S_REPORT_EXPLAIN = {
  aum: "규모 — ETF에 쌓인 순자산(시가총액) 크기입니다. 한국 ETF는 국내 상장 ETF 시가총액 상위 100개, 미국 ETF는 미국 상장 ETF 순자산 상위 100개 안에서 순위를 매겨 상위 10위는 🔥, 하위 10위(91~100위)는 ⚠️로 표시합니다. 규모가 클수록 거래가 활발하고 상장폐지 위험이 낮습니다.",
  win: "최근 10년간 전달보다 오른 달의 비율입니다.\n높을수록 꾸준히 올랐다는 뜻이에요.",
  ret: "최근 10년 연평균 상승률(연복리)입니다.\n높을수록 장기 성과가 좋았어요.",
  rev: "매출이 1년 전보다 몇 % 늘었는지입니다.\n높을수록 사업이 커지고 있어요.",
  ret1y: "1년 전 가격과 비교해 지금 몇 % 올랐는지입니다.\n높을수록 최근 1년 성과가 좋았어요.",
  vol: "최근 3개월 하루 평균 등락 폭입니다.\n높을수록 하루하루 크게 흔들려 위험해요.",
  rsi: "최근 14주 등락 폭으로 만든 주간 RSI입니다.\n이 종목의 1년 평균보다 높으면 매수우위, 낮으면 매도우위예요.",
  ni: "순이익이 작년보다 몇 % 늘었는지입니다.\n높을수록 남기는 이익이 빠르게 늘어요.",
  om: "매출에서 영업이익이 차지하는 비율입니다.\n높을수록 본업에서 효율적으로 벌어요.",
  roe: "최근 1년(4개 분기 합계) 순이익 ÷ 자기자본입니다.\n높을수록 주주 돈으로 이익을 잘 만들어요.",
  cf: "영업 현금흐름의 작년 대비 증가율입니다.\n높을수록 실제 현금이 늘고 있어요.",
  debt: "자기자본 대비 부채 비율(최근 분기)입니다.\n낮을수록 빚 부담이 적어 안정적이에요.",
  per: "주가가 주당순이익의 몇 배인지입니다.\n낮을수록 이익에 비해 싸다는 뜻이에요.",
  div: "최근 1년 배당금 합계를 현재가로 나눈 값입니다.\n높을수록 들고만 있어도 받는 현금이 많아요.",
  fee: "ETF를 1년 들고 있으면 빠져나가는 연간 총보수입니다.\n낮을수록 오래 보유하기 유리해요.",
  mcap: "가격 × 발행주식수(코인은 유통량)입니다.\n클수록 규모가 큰 대형 종목이에요.",
  dv: "오늘 거래대금이 최근 20거래일 평균의 몇 배인지입니다.\n1배는 평소, 3배 이상이면 평소보다 크게 몰린 날이에요.",
  w52: "52주 최저 0%, 최고 100% 사이 지금 위치입니다.\n높을수록 1년 고점에 가까워요.",
};
// 항목을 누르면 설명 맨 위에 붙는 제목(2026-09-16 사용자 지정) — 화면의 항목 이름·차트 축·목록 제목은 전부 짧은 이름을 쓰고,
// 풀어 쓴 긴 이름은 이 설명 안에서만 보여준다(2026-09-16 사용자 요청)
const S_REPORT_TITLES = {
  win: "10년월간승률",
  ret: "10년 평균상승률",
  rev: "작년대비 매출성장",
  ret1y: "최근 1년 수익률",
  vol: "1일 변동성(3달평균)",
  rsi: "14주 RSI 지수",
  ni: "작년대비 순이익 증가",
  om: "최근 분기 영업이익률",
  roe: "최근 1년 ROE",
  cf: "작년대비 현금흐름 증가",
  debt: "최근 분기 부채비율",
  per: "PER(주가 ÷ 주당순이익)",
  div: "최근 1년 배당률",
  fee: "연간 운용보수(총보수)",
  mcap: "시가총액",
  dv: "거래대금 증감(오늘 ÷ 20일 평균)",
  w52: "52주 구간 위치",
  hold: "보유 상위 종목",
  aum: "순자산 규모",
};
// 설명 안에서 "+예시"로 펼쳐 볼 수 있는 항목(2026-09-16 사용자 요청)
const S_REPORT_EXAMPLES = {
  win: "대표자산 10년월간승률 비교",
  rsi: "SPY 5년 주봉과 주간 RSI",
  // 2026-10-20 사용자 요청: 연 상승률 ~ 현금흐름도 "+예시" — 대표종목 비교 막대(값은 S리포트 비교 DB)
  ret: "대표종목 연 상승률",
  vol: "대표종목 1일 변동성",
  rev: "대표종목 매출성장",
  ni: "대표종목 순이익 증가",
  om: "대표종목 영업이익률",
  roe: "대표종목 ROE",
  cf: "대표종목 현금흐름 증가",
  // 2026-10-20 사용자 요청: "시장" 묶음(시가총액·거래대금·52주 구간 위치)도 같은 방식
  ret1y: "대표종목 1년 수익률",
  mcap: "대표종목 시가총액",
  dv: "대표종목 거래대금",
  w52: "대표종목 52주 구간 위치",
};

// ---------- 핵심지표 "+예시"(2026-10-20): 연 상승률·변동성·매출성장·순이익·영업이익률·ROE·현금흐름 ----------
// 누구나 아는 대표종목 5~6개의 값을 가로 막대로 나란히 보여주고, 비교군 평균선(점선)과 "읽는 법" 예시 한 줄을 붙인다.
// 값은 매일 갱신되는 S리포트 비교 DB(data/sreport-baseline.json)에서 바로 읽어 별도 조회가 없다.
const SR_EXAMPLE_REPS = {
  kr: ["000660.KS", "005930.KS", "035420.KS", "005380.KS", "051910.KS", "105560.KS"],
  us: ["NVDA", "AAPL", "MSFT", "AMZN", "KO", "TSLA"],
  etf: ["QQQ", "SPY", "VOO", "360750.KS", "069500.KS"],
  crypto: ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD"],
};
const SR_EXAMPLE_NAMES = { QQQ: "QQQ(나스닥100)", SPY: "SPY(S&P500)", VOO: "VOO(S&P500)", "360750.KS": "TIGER 미국S&P500", "069500.KS": "KODEX 200" };
const SR_EXAMPLE_SPECS = {
  ret: { title: "대표종목 연 상승률", sub: "최근 10년 평균(연복리)", cap: 70, lower: false },
  vol: { title: "대표종목 1일 변동성", sub: "최근 3개월 하루 평균 등락 폭", cap: 5, lower: true, plain: true },
  rev: { title: "대표종목 매출성장", sub: "작년 대비", assetTitle: "대표종목 1년 수익률", assetSub: "1년 전 가격 대비", cap: 150, assetCap: 60 },
  ni: { title: "대표종목 순이익 증가", sub: "작년 대비", cap: 150 },
  om: { title: "대표종목 영업이익률", sub: "매출 100원 중 남는 영업이익", cap: 80, plain: true },
  roe: { title: "대표종목 ROE", sub: "최근 1년 순이익 ÷ 자기자본", cap: 100, plain: true },
  cf: { title: "대표종목 현금흐름 증가", sub: "영업 현금흐름 · 작년 대비", cap: 150 },
  // amount: 금액이라 크기 차이가 커서 막대는 제곱근 눈금으로 그린다
  mcap: { title: "대표종목 시가총액", sub: "주가 × 발행주식수", amount: true },
  dv: { title: "대표종목 하루 거래대금", sub: "최근 5거래일 평균", amount: true },
  w52: { title: "대표종목 52주 구간 위치", sub: "최저 0% ~ 최고 100%", cap: 100, plain: true, fixed01: true },
};
SR_EXAMPLE_SPECS.ret1y = SR_EXAMPLE_SPECS.rev; // ETF·코인의 "1년 수익률"은 같은 DB 칸(rev)
function srExFmt(v, plain) {
  if (!Number.isFinite(v)) return "-";
  const a = Math.abs(v);
  const t = a >= 100 ? Math.round(a).toLocaleString() : a >= 10 ? a.toFixed(0) : a.toFixed(1);
  return `${plain ? (v < 0 ? "-" : "") : v < 0 ? "-" : "+"}${t}%`;
}
function srExMoney(manwon) {
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(manwon >= 100000 ? 0 : 1)}억원`;
  return `${Math.round(manwon).toLocaleString()}만원`;
}
function srExName(t, section) {
  if (SR_EXAMPLE_NAMES[t]) return SR_EXAMPLE_NAMES[t];
  if (section === "crypto") return cryptoKoName(t, t);
  return TICKER_TO_KOREAN_NAME[t] || t;
}
async function buildSrExampleHtml(key) {
  if (key === "ret1y") key = "rev";
  const spec = SR_EXAMPLE_SPECS[key];
  const baseline = await getSReportBaseline();
  if (!spec || !baseline || !baseline.members) return `<p class="muted" style="padding:8px 2px;">예시 데이터를 불러오지 못했어요.</p>`;
  const section = srDetailSection();
  const asset = section !== "stocks";
  const cur = currentDetailSymbol || "";
  const reps = section === "crypto" ? SR_EXAMPLE_REPS.crypto : section === "etf" ? SR_EXAMPLE_REPS.etf : isKrTicker(cur) ? SR_EXAMPLE_REPS.kr : SR_EXAMPLE_REPS.us;
  const rows = [];
  const add = (t, me) => {
    const m = baseline.members[t];
    if (!m || !Number.isFinite(m[key])) return;
    if (rows.some((r) => r.t === t)) {
      if (me) rows.find((r) => r.t === t).me = true;
      return;
    }
    rows.push({ t, name: srExName(t, section), val: m[key], me: !!me });
  };
  reps.forEach((t) => add(t, t.toUpperCase() === cur.toUpperCase()));
  if (cur) add(cur, true);
  if (rows.length < 3) return `<p class="muted" style="padding:8px 2px;">이 항목은 보여드릴 대표종목 값이 아직 없어요.</p>`;
  rows.sort((a, b) => (spec.lower ? a.val - b.val : b.val - a.val));
  const cap = asset && spec.assetCap ? spec.assetCap : spec.cap;
  const member = baseline.members[cur];
  const gKey = member ? member.g : section === "crypto" ? "crypto200" : section === "etf" ? (isKrTicker(cur) ? "etfKr" : "etfUs") : isKrTicker(cur) ? "kr350" : "sp500";
  const grp = baseline.groups && baseline.groups[gKey];
  const medVal = grp && grp.dist ? sReportMedianOf(grp.dist[key]) : null;
  const avg = medVal !== null ? medVal : grp && grp.ref && Number.isFinite(grp.ref[key]) ? grp.ref[key] : null;
  const vals = rows.map((r) => r.val).concat(avg !== null ? [avg] : []);
  const isAmt = !!spec.amount;
  const curOf = (t) => (isKrTicker(t) ? "KRW" : "USD");
  const fmtVal = (v, t) => (isAmt ? fmtAmountUnified(v, curOf(t)) : srExFmt(v, !!spec.plain));
  let lo = Math.min(0, Math.max(-cap, Math.min(...vals)));
  let hi = Math.max(0, Math.min(cap, Math.max(...vals)));
  if (spec.fixed01) {
    lo = 0;
    hi = 100;
  }
  const sqrtMax = isAmt ? Math.sqrt(Math.max(...vals)) : 1;
  const span = hi - lo || 1;
  const pos = isAmt ? (v) => (Math.sqrt(Math.max(v, 0)) / sqrtMax) * 100 : (v) => ((Math.max(lo, Math.min(hi, v)) - lo) / span) * 100;
  const zero = isAmt ? 0 : pos(0);
  const plain = !!spec.plain;
  const rowHtml = rows
    .map((r) => {
      const p = pos(r.val);
      const left = Math.min(zero, p);
      const width = Math.max(1.2, Math.abs(p - zero));
      const capped = !isAmt && Math.abs(r.val) > cap ? " ▶" : "";
      return `<div class="srx-row${r.me ? " srx-me" : ""}">
        <span class="srx-name">${r.me ? "★ " : ""}${escapeHtml(r.name)}</span>
        <span class="srx-track">${zero > 0.5 && zero < 99.5 ? `<i class="srx-zero" style="left:${zero.toFixed(1)}%"></i>` : ""}${avg !== null ? `<i class="srx-avg" style="left:${pos(avg).toFixed(1)}%"></i>` : ""}<i class="srx-bar${r.val < 0 ? " srx-neg" : ""}" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span>
        <b class="srx-val${!plain && r.val < 0 ? " srx-val-neg" : ""}">${fmtVal(r.val, r.t)}${capped}</b>
      </div>`;
    })
    .join("");
  // 읽는 법 — 값이 중간쯤인 대표종목 하나를 골라 구체적인 숫자로 풀어 줌
  const sorted = rows.slice().sort((a, b) => a.val - b.val);
  const mid = (arr) => arr[Math.floor((arr.length - 1) / 2)];
  const posRows = sorted.filter((r) => r.val > 0);
  const meRow = rows.find((r) => r.me && r.val > 0);
  const sample = meRow ? meRow : key === "ret" ? mid(posRows.filter((r) => r.val < 40).length ? posRows.filter((r) => r.val < 40) : posRows) : posRows.length ? mid(posRows) : sorted[sorted.length - 1];
  const neg = sorted.find((r) => r.val < 0);
  const v = sample.val;
  const f1 = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : Number(x.toFixed(1)).toString());
  let how = "";
  if (key === "ret") how = `최근 10년 동안 매년 평균 얼마씩 올랐는지(연복리)예요.\n예) ${sample.name}: 연 ${f1(v)}% → 10년 전 100만원이 지금 약 ${srExMoney(100 * Math.pow(1 + v / 100, 10))}.`;
  else if (key === "vol") {
    const calm = rows[0];
    const wild = rows[rows.length - 1];
    how = `최근 3개월 동안 하루에 평균 얼마나 오르내렸는지예요. 숫자가 작을수록 잔잔해요.\n예) ${calm.name}: 하루 ±${f1(calm.val)}% → 100만원이 하루 약 ±${Math.round(calm.val * 10000).toLocaleString()}원 움직여요. 반면 ${wild.name}: ±${f1(wild.val)}% → 약 ±${Math.round(wild.val * 10000).toLocaleString()}원.`;
  } else if (key === "rev" && asset) how = `1년 전 가격과 비교해 지금 몇 % 올랐는지예요. 마이너스면 내렸다는 뜻이에요.\n예) ${sample.name}: ${srExFmt(v)} → 1년 전 100만원이 지금 약 ${f1(100 + v)}만원.`;
  else if (key === "rev") how = `작년보다 매출이 몇 % 늘었는지예요.\n예) ${sample.name}: ${srExFmt(v)} → 작년에 100억원을 팔았다면 올해 약 ${f1(100 + v)}억원.`;
  else if (key === "ni") how = `순이익이 작년보다 몇 % 늘었는지예요. 마이너스면 작년보다 줄었다는 뜻이에요.\n예) ${sample.name}: ${srExFmt(v)} → 작년 순이익 100원이 올해 약 ${f1(100 + v)}원.${neg ? ` ${neg.name}(${srExFmt(neg.val)})처럼 마이너스면 작년보다 줄어든 거예요.` : ""}`;
  else if (key === "om") how = `매출 100원 중 본업으로 남는 영업이익이에요.\n예) ${sample.name}: ${f1(v)}% → 100원어치 팔면 약 ${f1(v)}원이 남아요.`;
  else if (key === "roe") how = `주주(자기자본) 100원으로 1년 동안 번 순이익이에요.\n예) ${sample.name}: ${f1(v)}% → 100원을 맡기면 1년에 약 ${f1(v)}원을 벌어요.${neg ? ` ${neg.name}(${srExFmt(neg.val, true)})처럼 마이너스면 오히려 손실이에요.` : ""}`;
  else if (key === "mcap") {
    const big = rows[0];
    const small = rows[rows.length - 1];
    how = `주가 × 발행주식수, 즉 회사 전체의 몸값이에요. 클수록 덩치 큰 대형주예요.\n예) ${big.name}: ${fmtVal(big.val, big.t)} → ${small.name}(${fmtVal(small.val, small.t)})의 약 ${Math.round(big.val / small.val).toLocaleString()}배 규모.`;
  } else if (key === "dv") {
    const s0 = meRow || rows[Math.floor(rows.length / 2)];
    how = `하루에 오가는 거래 금액(5거래일 평균)이에요. 클수록 사고팔기 쉬워요.\n위쪽 '거래대금 증감'은 오늘 거래대금이 최근 20거래일 평균의 몇 배인지예요. 1배 = 평소, 3배 이상 = 평소보다 크게 몰린 날.\n예) ${s0.name}: 평소 하루 ${fmtVal(s0.val, s0.t)} → 오늘 3배면 약 ${fmtVal(s0.val * 3, s0.t)}.`;
  } else if (key === "w52") {
    const where = v >= 70 ? "1년 중 높은 쪽(고점 가까이)" : v <= 30 ? "1년 중 낮은 쪽(저점 가까이)" : "1년 중 중간쯤";
    how = `최근 52주 중 가장 쌌던 날을 0%, 가장 비쌌던 날을 100%로 놓고 지금 가격이 어디쯤인지예요.\n예) ${sample.name}: ${f1(v)}% → ${where}에 있어요.`;
  } else if (key === "cf") how = `영업(장사)으로 실제 들어온 현금이 작년보다 몇 % 늘었는지예요.\n예) ${sample.name}: ${srExFmt(v)} → 작년 현금 100원이 올해 약 ${f1(100 + v)}원.${neg ? ` ${neg.name}(${srExFmt(neg.val)})처럼 마이너스면 줄어든 거예요.` : ""}`;
  const title = asset && spec.assetTitle ? spec.assetTitle : spec.title;
  const sub = asset && spec.assetSub ? spec.assetSub : spec.sub;
  const avgName = grp ? sReportMedName(grp) : "비교군 중위값";
  return `<div class="srx">
    <div class="srx-head"><b>${escapeHtml(title)}</b><span>${escapeHtml(sub)}</span></div>
    <div class="srx-rows">${rowHtml}</div>
    ${avg !== null ? `<div class="srx-legend"><i class="srx-avg-key"></i>점선 = ${escapeHtml(avgName)} ${isAmt ? fmtAmountUnified(avg, curOf(cur || reps[0])) : srExFmt(avg, plain)}${isAmt ? " · 막대는 제곱근 눈금" : ""}</div>` : ""}
    <p class="srx-how">${escapeHtml(how).replace(/\n/g, "<br>")}</p>
  </div>`;
}

// 2026-10-08 사용자 요청: 핵심지표 아래 안내도 인기종목처럼 3개 문구가 번갈아(번갈아 바꾸는 타이머는 POPULAR_HINTS 옆)
const SR_HINTS = [
  "모든 항목은 눌러서 자세한 설명을 볼 수 있습니다.",
  "승률이 높을수록 과거에 안정적으로 우상향했다는 뜻이에요.",
  "상승률이 높을수록 연 수익률이 좋았어요. 눌러서 확인해 보세요.",
];
// 2026-10-08 사용자 요청: 투자분석 맨 위 안내 2개 번갈아(타이머는 POPULAR_HINTS 옆)
const IA_HINTS = ["내 포트폴리오를 등록해서 수익률을 예측할 수 있습니다.", "고수들의 투자 방법과 하루 변동량을 비교해 보세요."];
const S_REPORT_TAP_HINT = `<p class="srt-tap-hint pop-hint" aria-live="polite"><span class="pop-hint-text" data-hint-set="sr">* ${SR_HINTS[0]}</span></p>`;

// 핵심 5개 정의 — ETF·코인은 3번이 1년 수익률
// axis: 오각형 축을 비교군 백분위 대신 고정 눈금으로 그림(2026-09-16 사용자 지정 — 승률 40~70%, 상승률·매출액 0~50%, 변동성 5~1%,
//       과열도는 rsiAxisScore로 1년 평균이 한가운데). ETF·코인의 3번(1년 수익률)만 비교군 분포를 그대로 쓴다.
function sReportCoreSpecs(isAsset, isEtf) {
  // 2026-09-17 사용자 지정: 어느 투자처든 앞 네 자리는 승률 - 상승률 - 변동성 - 과열도로 같고,
  // 다섯 번째만 달라진다(주식 = 매출액, ETF = 운용보수, 코인 = 1년 수익률). 오각형 축과 항목 줄이 같은 순서다.
  const fifth = isEtf
    ? // ETF 운용보수 눈금(사용자 지정): 0.02% 만점 · 0.087%(중앙값)가 한가운데 · 0.3% 이상 0점
      {
        key: "fee",
        label: "운용보수",
        sub: "연간",
        better: "low",
        isFee: true,
        fireIf: (v) => v < 0.05, // "매우낮음"이면 🔥(2026-09-17 사용자 지정)
        band: 0.02,
        rel: 0.15,
        fmt: (v, d) => `${Number(v.toFixed(d ? 4 : 3))}%`,
        axis: (v) => (v <= 0.087 ? 0.5 + (0.5 * (0.087 - v)) / (0.087 - 0.02) : 0.5 - (0.5 * (v - 0.087)) / (0.3 - 0.087)),
      }
    : isAsset
    ? { key: "rev", label: "1년 수익률", explainKey: "ret1y", better: "high", band: 3, rel: 0.15, signed: true, fmt: (v, d) => sPct(v, d, true) }
    : { key: "rev", label: "매출성장", sub: "작년 대비", better: "high", band: 3, rel: 0.2, signed: true, fmt: (v, d) => sPct(v, d, true), axis: (v) => v / 50 };
  return [
    // ETF만 🔥 기준이 등수가 아니라 절대값 — 승률 60% 이상, 변동성 0.8% 미만(2026-09-17 사용자 지정)
    // 2026-10-08 사용자 요청: 오각형·표 이름만 길게(10년월간승률·연 상승률·1일 변동성·매출성장) — 눌렀을 때 설명 제목은 S_REPORT_TITLES 그대로
    { key: "win", label: "10년월간승률", sub: "10년 월간", better: "high", band: 2, fmt: (v, d) => sPct(v, d), axis: (v) => (v - 40) / 30, ...(isEtf ? { fireIf: (v) => v >= 60 } : {}) },
    { key: "ret", label: "연 상승률", sub: "연평균", better: "high", band: 2, rel: 0.15, signed: true, fmt: (v, d) => sPct(v, d, true), axis: (v) => v / 50 },
    // 변동성은 등수(상위 N%) 대신 5단계 등급(2026-10-06 사용자 요청) — sReportVolJudge 참고
    { key: "vol", label: "1일 변동성", sub: "3개월 하루", better: "low", isVol: true, band: 0.1, rel: 0.1, fmt: (v, d) => `${v.toFixed(d ? 2 : 1)}%`, axis: (v) => (5 - v) / 4 },
    // 과열도는 낮을수록 좋은 점수(2026-09-16 사용자 요청) — 등수도 낮은 순으로 1위, 레이더에서도 낮을수록 바깥.
    // ETF는 과열도를 일반지표(더보기)로 내리고 그 자리에 규모(순자산)를 둔다(2026-10-06 사용자 요청)
    isEtf ? { key: "aum", label: "규모", sub: "순자산", better: "high", isAum: true, fmt: (v) => etfAumText(v) } : { key: "rsi", label: "과열도(RSI)", better: "low", isRsi: true, fmt: (v, d) => sNum(v, d) },
    fifth,
  ];
}

// 변동성 5단계(2026-10-06 사용자 요청) — 비교군 안 순위가 아니라 절대 기준이라 주식·ETF·코인 어디서 봐도 같은 뜻이다.
// 값은 최근 3개월 하루 등락폭(|일간 등락률|) 평균. 정규분포 가정에서 연 변동성(표준편차) ≈ 하루 평균폭 × 19.9
// (= ÷0.798(평균절대편차→표준편차) × √252)이라, 흔히 쓰는 연 변동성 구간을 하루 폭으로 환산했다:
//   매우안정 < 0.75%(연 15% 미만, 채권혼합·배당 ETF 수준) · 안정 < 1.25%(연 25%, S&P500·대형 우량주) ·
//   보통 < 1.75%(연 35%, 일반 개별 종목) · 높음 < 2.5%(연 50%, 성장·소형주) · 매우높음 2.5% 이상(연 50%↑, 코인·테마주)
function sReportVolJudge(v) {
  if (!Number.isFinite(v)) return null;
  if (v < 0.75) return { text: "매우안정", tone: "good" };
  if (v < 1.25) return { text: "안정", tone: "good" };
  if (v < 1.75) return { text: "보통", tone: "neutral" };
  if (v < 2.5) return { text: "높음", tone: "bad" };
  return { text: "매우높음", tone: "bad" };
}
// 운용보수 6단계(2026-09-17 사용자 지정) — 등수 대신 이 등급을 보여준다
function sReportFeeJudge(v) {
  if (!Number.isFinite(v)) return null;
  if (v >= 0.5) return { text: "매우높음", tone: "bad" };
  if (v >= 0.2) return { text: "높음", tone: "bad" };
  if (v >= 0.1) return { text: "조금높음", tone: "bad" };
  if (v >= 0.07) return { text: "평균", tone: "neutral" };
  if (v >= 0.05) return { text: "조금낮음", tone: "good" };
  return { text: "매우낮음", tone: "good" };
}
// 전체 보기 추가 항목(배치 DB 키) — live: DB에 없는 주식은 실시간 지표(getFullMetrics)로 보충
const S_FULL_STOCK_GROUPS = [
  {
    title: "수익성 · 재무",
    specs: [
      { key: "ni", label: "순이익 증가", better: "high", band: 5, rel: 0.2, signed: true, live: (m) => m.netIncomeGrowthAnnual },
      { key: "om", label: "영업이익률", better: "high", band: 2, rel: 0.15, live: (m) => m.operatingMarginQuarterly },
      { key: "roe", label: "ROE", better: "high", band: 2, rel: 0.15, live: (m) => m.roeQuarterly },
      { key: "cf", label: "현금흐름 증가", better: "high", band: 5, rel: 0.2, signed: true, live: (m) => m.operatingCashFlowGrowthAnnual },
      { key: "debt", label: "부채비율", better: "low", band: 5, rel: 0.15, live: (m) => m.debtRatioQuarterly },
    ],
  },
  {
    title: "시장",
    specs: [
      { key: "mcap", label: "시가총액", better: "neutral", rel: 0.2, unit: "amount", live: (m) => m.marketCap },
      { key: "dv", label: "거래대금", better: "neutral", rel: 0.2, unit: "amount", live: (m) => m.recentDollarVolume },
      { key: "w52", label: "52주 구간 위치", better: "neutral", band: 5, live: (m) => m.week52RangePct },
    ],
  },
  {
    title: "가치 · 배당",
    specs: [
      { key: "per", label: "PER", better: "low", band: 0, rel: 0.15, unit: "times", positiveOnly: true, live: (m) => m.per },
      { key: "div", label: "배당률", better: "high", band: 0.2, rel: 0.15, digits: 2 },
    ],
  },
];
const S_FULL_ASSET_GROUPS = {
  etf: [
    // 과열도는 핵심지표에서 일반지표로 내려옴(2026-10-06 사용자 요청)
    { title: "기술 지표", specs: [{ key: "rsi", label: "과열도(RSI)", better: "low", isRsi: true, fmt: (v, d) => sNum(v, d) }] },
    {
      title: "수익 · 배당",
      specs: [
        { key: "rev", label: "1년 수익률", explainKey: "ret1y", better: "high", band: 3, rel: 0.15, signed: true },
        { key: "div", label: "배당률", better: "high", band: 0.2, rel: 0.15, digits: 2 },
      ],
    },
    { title: "시장", specs: [{ key: "w52", label: "52주 구간 위치", better: "neutral", band: 5 }] },
  ],
  // 코인 거래대금은 야후 값이 비정상(BTC $1,903조)이라 넣지 않음
  crypto: [
    {
      title: "시장",
      specs: [
        { key: "mcap", label: "시가총액", better: "neutral", rel: 0.2, unit: "amount" },
        { key: "w52", label: "52주 구간 위치", better: "neutral", band: 5 },
      ],
    },
  ],
};

// 과열도 축 길이(2026-09-16 사용자 지정): 이 종목의 1년 평균 RSI가 한가운데(0.5).
// 거기서 RSI 0까지가 바깥쪽 절반, 100까지가 안쪽 절반 — 평균보다 낮아질수록 그래프가 커지고 높아질수록 작아진다.
// (예: 평균 70이면 70이 한가운데, 0이면 꽉 참, 100이면 0)
function rsiAxisScore(v, ref) {
  if (!Number.isFinite(v) || !Number.isFinite(ref)) return null;
  if (v <= ref) return ref <= 0 ? 0.5 : Math.min(1, 0.5 + (0.5 * (ref - v)) / ref);
  return ref >= 100 ? 0.5 : Math.max(0, 0.5 - (0.5 * (v - ref)) / (100 - ref));
}

// 항목 하나 계산 — 기준값(ref)·분포(dist)는 배치 DB의 비교군 값
// RSI만은 비교군 평균이 아니라 이 종목 자신의 직전 1년(52주) 평균 RSI가 기준(ownRef, 2026-09-15 사용자 요청)
// 2026-10-20 사용자 요청: 비교군의 "평균" 대신 "중위값"(전체 종목을 줄 세웠을 때 한가운데 등수의 값)을 기준선으로
function sReportMedianOf(dist) {
  if (!Array.isArray(dist) || !dist.length) return null;
  const a = dist.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
function sReportMedName(group) {
  if (!group) return "비교군 중위값";
  const rn = String(group.refName || "");
  return rn.includes("평균") && !/^etf/i.test(String(group.key || "")) && group.label !== "ETF200" ? rn.replace("평균", "중위값") : `${group.label || "비교군"} 중위값`;
}
function sReportMakeItem(spec, value, group, currency, ownRef) {
  const useOwn = spec.isRsi;
  const axisOf = spec.axis ? (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, spec.axis(v))) : null) : null;
  const dist = group && group.dist ? group.dist[spec.key] : null;
  const medianRef = useOwn ? null : sReportMedianOf(dist);
  const ref = useOwn ? ownRef : medianRef !== null ? medianRef : group && group.ref ? group.ref[spec.key] : null;
  const dir = spec.better === "low" ? "low" : "high";
  const fmt =
    spec.fmt ||
    (spec.unit === "amount"
      ? (v) => fmtAmountUnified(v, currency)
      : spec.unit === "times"
      ? (v, d) => `${sNum(v, d)}배`
      : spec.digits
      ? (v, d) => `${v.toFixed(d ? spec.digits : Math.max(1, spec.digits - 1))}%`
      : (v, d) => sPct(v, d, spec.signed));
  // 등수(2026-09-15 사용자 요청: 양호·주의 대신 "12/200위 (상위 6%)", 상위 10% 🔥 · 하위 10% ⚠️)
  // 분포에 이 종목 값이 들어 있으면(비교군 구성 종목) 그대로, 아니면(비교군 밖) 한 자리 끼워 넣어 셈
  let rank = null;
  let total = null;
  if (Number.isFinite(value) && Array.isArray(dist) && dist.length) {
    rank = dist.filter((x) => (dir === "low" ? x < value : x > value)).length + 1;
    total = dist.length + (dist.some((x) => Math.abs(x - value) < 1e-9) ? 0 : 1);
  }
  const topPct = rank ? (rank / total) * 100 : null;
  // 🔥는 보통 비교군 상위 10%지만, spec.fireIf가 있으면 등수 대신 그 절대 기준으로 붙인다
  // (ETF 승률 60% 이상 · 변동성 0.8% 미만 · 운용보수 "매우낮음" — 2026-09-17 사용자 지정). ⚠️(하위 10%)는 그대로.
  let mark = topPct === null ? null : topPct <= 10 ? "fire" : topPct > 90 ? "warn" : null;
  if (spec.fireIf) mark = Number.isFinite(value) && spec.fireIf(value) ? "fire" : mark === "fire" ? null : mark;
  // 변동성은 등급 기준으로 🔥(매우안정)·⚠️(매우높음)
  if (spec.isVol) mark = !Number.isFinite(value) ? null : value < 0.75 ? "fire" : value >= 2.5 ? "warn" : null;
  return {
    ...spec,
    explain: S_REPORT_EXPLAIN[spec.explainKey || spec.key] || "",
    fmt,
    value: Number.isFinite(value) ? value : null,
    avg: Number.isFinite(ref) ? ref : null,
    avgName: useOwn ? "1년 평균 RSI" : sReportMedName(group),
    avgShort: useOwn ? "이 종목 1년 평균" : group ? (group.refName === "SPY" ? "SPY" : group.label) : "",
    rank,
    total,
    topPct,
    mark,
    judge: spec.isRsi
      ? sReportRsiJudge(value, ref)
      : spec.isFee
      ? sReportFeeJudge(value)
      : spec.isVol
      ? sReportVolJudge(value)
      : { text: "", tone: mark === "fire" ? "good" : mark === "warn" ? "bad" : "neutral" },
    // 과열도(RSI)만은 비교군 분포가 아니라 이 종목의 1년 평균 RSI를 오각형 한가운데(0.5)에 두고,
    // 평균보다 낮을수록(침체) 바깥으로, 높을수록(과열) 안쪽으로 그린다 — 등급 기준과 같은 ±20이 양 끝(2026-09-16 사용자 요청)
    // spec.axis가 있으면 비교군 분포 대신 고정 눈금으로 축 길이를 잡는다(승률: 40% 0점 ~ 70% 만점)
    score: useOwn ? rsiAxisScore(value, ref) : axisOf ? axisOf(value) : sReportPercentile(dist, value, dir),
    avgScore: useOwn ? 0.5 : axisOf ? axisOf(ref) : sReportPercentile(dist, ref, dir),
  };
}

function sReportRadarSvg(items) {
  const W = 330;
  const H = 250;
  const cx = W / 2;
  const cy = 128;
  const R = 80;
  const n = items.length;
  const pt = (i, s) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * s, cy + Math.sin(a) * R * s];
  };
  const poly = (fn) => items.map((it, i) => pt(i, fn(it)).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((s) => `<polygon points="${poly(() => s)}" class="srt-rd-ring" />`).join("");
  const spokes = items.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0].toFixed(1)}" y2="${pt(i, 1)[1].toFixed(1)}" class="srt-rd-ring" />`).join("");
  const clampS = (s) => (Number.isFinite(s) ? Math.max(0.04, s) : 0.04);
  const avgPoly = `<polygon points="${poly((it) => clampS(Number.isFinite(it.avgScore) ? it.avgScore : 0.5))}" class="srt-rd-avg" />`;
  const selfPoly = `<polygon points="${poly((it) => clampS(it.score))}" class="srt-rd-self" />`;
  const dots = items
    .map((it, i) => {
      const [x, y] = pt(i, clampS(it.score));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="srt-rd-dot srt-tone-${it.judge ? it.judge.tone : "neutral"}" />`;
    })
    .join("");
  // 평균(비교 기준) 꼭짓점에도 회색 점 — RSI처럼 평균이 중심 가까이 붙으면 점선만으로는 안 보였음(2026-09-15 사용자 지적)
  const avgDots = items
    .map((it, i) => {
      if (!Number.isFinite(it.avgScore)) return "";
      const [x, y] = pt(i, clampS(it.avgScore));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" class="srt-rd-avgdot" />`;
    })
    .join("");
  const labels = items
    .map((it, i) => {
      const [x, y] = pt(i, 1.2);
      const anchor = x < cx - 6 ? "end" : x > cx + 6 ? "start" : "middle";
      const dy = y < cy - R * 0.9 ? -14 : y > cy + R * 0.5 ? 6 : -6;
      // 승률의 상장 기간 경고(⚠️) + 비교군 안 순위 표시 — 상위 10% 🔥 · 하위 10% ⚠️(2026-09-16 사용자 요청)
      // 상장 기간 경고는 ⚠️ 대신 값 뒤에 작은 "(10년미만)" 글씨로(2026-10-06 사용자 요청) — 불·경고 마크는 그대로 안 붙임
      const partialTag = srPartialTag(it);
      const warn = partialTag ? "" : it.mark === "warn" ? "⚠️" : ""; // 2026-10-20 사용자 요청: 🔥 삭제, ⚠️ 유지
      const val = (it.value === null ? "N/A" : it.fmt(it.value, 0));
      const axisLabel = it.isRsi ? String(it.label).replace(/\s*\(RSI\)\s*$/, "") : it.label; // 오각형은 "과열도"만(2026-09-17)
      // 값은 라벨 한가운데에 오게(2026-09-17 사용자 요청) — 좌우 축은 라벨이 끝 기준이라 값이 한쪽으로 쏠려 보였다.
      // SVG는 글자 폭을 알 수 없어 한글 12px·그 외 6.6px로 어림잡아 라벨 중심을 구한다.
      const estWidth = (t) => [...String(t)].reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 6.6 : 12), 0);
      const labelMid = anchor === "end" ? x - estWidth(axisLabel) / 2 : anchor === "start" ? x + estWidth(axisLabel) / 2 : x;
      return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" class="srt-rd-label">${escapeHtml(axisLabel)}</text>
        <text x="${labelMid.toFixed(1)}" y="${(y + dy + 15).toFixed(1)}" text-anchor="middle" class="srt-rd-value srt-rd-${it.mark || "neutral"}">${warn}${escapeHtml(val)}${partialTag ? `<tspan class="srt-rd-partial">${partialTag}</tspan>` : ""}${/* 오각형에는 현재 RSI만(1년 평균은 아래 항목 줄에 "/72(평균)"로 표시) — 2026-09-16 사용자 요청 */ ""}</text>`;
    })
    .join("");
  return `<svg class="srt-radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="핵심지표 레이더 차트">${rings}${spokes}${avgPoly}${selfPoly}${avgDots}${dots}${labels}</svg>`;
}

// ---------- 핵심지표 항목 → 순위 화면(2026-09-16 사용자 요청) ----------
// 주식은 다섯 개씩 세 묶음 — 어느 항목의 "+순위"를 눌러도 목록 화면으로 가서 그 묶음이 상단 하위보기가 된다
// (좌우 스크롤 없이 한 줄에 5개). ETF·코인은 항목이 적어 묶음을 만들지 않고 그 항목 랭킹으로 바로 간다.
const SR_RANK_GROUPS = [
  {
    key: "growth",
    items: [
      { k: "win", label: "승률", tab: "trend", run: () => runTrendRsiWinRate("winrate") },
      { k: "ret", label: "상승률", tab: "trend", run: () => runTrendRsiWinRate("cagr") },
      { k: "rev", label: "매출액", tab: "valuation", run: () => runValueRevenue() },
      { k: "vol", label: "변동성", tab: "trend", run: () => runStockVolatility() },
      { k: "rsi", label: "과열도", tab: "trend", run: () => runTrendRsiWinRate("rsi") },
    ],
  },
  {
    key: "profit",
    items: [
      { k: "ni", label: "순이익", tab: "valuation", run: () => runValueNetIncome() },
      { k: "om", label: "영업이익", tab: "valuation", run: () => runValueOperatingMargin() },
      { k: "roe", label: "ROE", tab: "valuation", run: () => runValueRoe() },
      { k: "cf", label: "현금흐름", tab: "valuation", run: () => runValueCashFlow() },
      { k: "debt", label: "부채비율", tab: "valuation", run: () => runValueDebtRatio() },
    ],
  },
  {
    key: "market",
    items: [
      { k: "mcap", label: "시가총액", tab: "valuation", run: () => runValueMarketCap() },
      { k: "dv", label: "거래대금", tab: "trend", run: () => runTrendVolume() },
      { k: "w52", label: "52주구간", tab: "valuation", run: () => runValueWeek52Low() },
      { k: "per", label: "PER", tab: "valuation", run: () => runValuePer() },
      { k: "div", label: "배당률", tab: "trend", run: () => runTrendDividend() },
    ],
  },
];
const SR_RANK_ITEM_BY_KEY = new Map(SR_RANK_GROUPS.flatMap((g) => g.items.map((it) => [it.k, { ...it, group: g.key }])));
// ETF·코인: ["tab", 키] = 상단 탭 랭킹, ["trend", 지표] = 시장동향 랭킹
const SR_ASSET_RANK = {
  etf: {
    win: ["tab", "winrate"], ret: ["trend", "pressure"], rev: ["tab", "return"], vol: ["tab", "volatility"],
    div: ["tab", "dividend"], fee: ["tab", "fee"], rsi: ["trend", "rsi"], w52: ["trend", "week52"], aum: ["tab", "aum"],
  },
  crypto: {
    win: ["tab", "winrate"], ret: ["trend", "pressure"], rev: ["tab", "return"], vol: ["tab", "volatility"],
    mcap: ["tab", "marketcap"], rsi: ["trend", "rsi"], w52: ["trend", "week52"],
  },
};
// 2026-10-08 사용자 요청: 주식처럼 ETF·코인 순위에도 위에 묶음 버튼 — ETF 승률·상승률·변동성·규모·운용보수 / 과열도·수익률·배당률·52주구간,
// 코인 승률·상승률·변동성·규모 / 과열도·수익률·52주구간. ETF는 그 아래 한국 ETF·미국 ETF 줄
const SR_ASSET_GROUPS = {
  // 2026-10-20 사용자 요청: 성장·추세 / 시장 두 묶음으로 나눠 상단 버튼 줄에 제목을 붙임
  etf: [["win", "ret", "rev", "vol", "rsi"], ["aum", "fee", "div", "w52"]],
  crypto: [["win", "ret", "rev", "vol", "rsi"], ["mcap", "w52"]],
};
const SR_ASSET_GROUP_TITLES = ["성장 · 추세", "시장"];
const SR_STOCK_GROUP_TITLES = { growth: "성장 · 추세", profit: "수익성 · 재무", market: "시장" };
const SR_ASSET_ITEM_ORDER = { etf: SR_ASSET_GROUPS.etf.flat(), crypto: SR_ASSET_GROUPS.crypto.flat() };
const SR_ASSET_ITEM_LABEL = {
  win: "승률", ret: "상승률", rev: "수익률", vol: "변동성", rsi: "과열도",
  div: "배당률", fee: "운용보수", mcap: "규모", aum: "규모", w52: "52주구간",
};

// var로 둔 이유: 앱 부팅 때 syncSectionHeader가 이 파일 위쪽에서 먼저 불리는데, let이면 아직 TDZ라 참조 오류가 난다
var srRankActive = null; // {group, k} — 목록 화면 상단 탭을 이 묶음 5개로 갈아끼운 상태(아니면 null)
// 묶음 5개를 목록 위 하위 버튼 줄(#topRankingSubNav)에 그린다 — 상단 탭(인기종목·승률…)은 그대로 둔다
function applySrRankTabs() {
  const nav = el("topRankingSubNav");
  if (nav && srRankActive && srRankActive.asset) {
    // ETF·코인 묶음 + (ETF) 한국/미국 줄 — 결과 안에 있던 지역 버튼은 숨김(CSS)
    const asset = srRankActive.asset;
    const groups = SR_ASSET_GROUPS[asset] || [];
    nav.classList.add("sr-rank-nav", "sr-asset-nav");
    nav.classList.remove("sr-scroll-nav");
    nav.innerHTML =
      `<div class="sr-scroll-row">${groups
        .map(
          (keys, gi) =>
            `<div class="sr-grp"><span class="sr-grp-title">${escapeHtml(SR_ASSET_GROUP_TITLES[gi] || "")}</span><div class="sr-grp-btns">${keys
              .map((k) => `<button type="button" class="cat-btn${k === srRankActive.k ? " active" : ""}" data-sr-tab="${k}" data-sr-asset="${asset}">${escapeHtml(SR_ASSET_ITEM_LABEL[k] || k)}</button>`)
              .join("")}</div></div>`
        )
        .join("")}</div>` +
      (asset === "etf"
        ? `<div class="sr-region-row">${[["kr", "한국 ETF"], ["us", "미국 ETF"]]
            .map(([v, l]) => `<button type="button" class="cat-btn sr-region-btn${etfPopularRegion === v ? " active" : ""}" data-sr-region="${v}">${l}</button>`)
            .join("")}</div>`
        : "");
    return;
  }
  if (nav) nav.classList.remove("sr-asset-nav");
  const group = srRankActive ? SR_RANK_GROUPS.find((g) => g.key === srRankActive.group) : null;
  if (!nav || !group) return;
  nav.classList.add("sr-rank-nav", "sr-scroll-nav"); // 2026-10-19: 묶음 5개가 아니라 모든 항목(15개)을 좌우 스크롤로
  nav.innerHTML = SR_RANK_GROUPS.map(
    (g) =>
      `<div class="sr-grp"><span class="sr-grp-title">${escapeHtml(SR_STOCK_GROUP_TITLES[g.key] || "")}</span><div class="sr-grp-btns">${g.items
        .map((it) => `<button type="button" class="cat-btn${it.k === srRankActive.k ? " active" : ""}" data-sr-tab="${escapeHtml(it.k)}">${escapeHtml(it.label)}</button>`)
        .join("")}</div></div>`
  ).join("");
}
function clearSrRankTabs() {
  srRankActive = null;
  const nav = el("topRankingSubNav");
  if (nav) nav.classList.remove("sr-asset-nav", "sr-scroll-nav");
}
// 항목 하나의 순위 화면 열기 — section이 etf/crypto면 묶음 없이 그 항목 랭킹으로 바로
function openSReportRank(itemKey, section, market) {
  // 상세 화면은 주소(?ticker=)를 남긴 채 닫는다 — 뒤로가기 한 번이면 보던 종목으로 그대로 돌아온다(2026-09-16 사용자 요청)
  if (companyPanel.style.display !== "none" && companyPanel.style.display !== "") closeCompanyPanel({ push: false });
  closeAllExplainNotes(null);
  // 2026-10-22: 신기술 화면에서 열었던 상태(navMode=tech)가 남아 있으면 헤더가 "신기술"로 보였다 — 별별순위 화면으로 정리
  closeTabPages();
  closeMorePanel();
  navMode = "rank";
  // 2026-10-21: 모든 순위는 빠른 엔진(rank-fast.js) — 전체 종목 중 순위, 30위씩 더보기, 값은 DB + 실시간 6항목
  const goRank = (title) => {
    setCarouselViewTitleText(title);
    switchTab(TAB_ORDER.indexOf("topranking"));
    el("tabValuationBtn").classList.remove("active");
    tabTrendBtn.classList.remove("active");
    el("topRankingSubNav").classList.remove("sr-rank-nav");
    showRankingGroup("trend");
  };
  if (section === "etf" || section === "crypto") {
    srRankActive = { asset: section, k: itemKey };
    appSectionMode = section;
    // 2026-10-08: ETF 순위는 한국 ETF / 미국 ETF 중 하나(통합 '전체'는 없앰) — 고른 적 없으면 지금 시장 기준
    if (section === "etf" && etfPopularRegion !== "kr" && etfPopularRegion !== "us") etfPopularRegion = getWatchlistActiveMarket() === "KR" ? "kr" : "us";
    setHeaderToneForSection(section);
    goRank(SR_ASSET_ITEM_LABEL[itemKey] || "순위");
    setBottomNavActive(section);
    syncSectionHeader();
    applySrRankTabs();
    scrollSrActiveIntoView();
    fastRankOpen(itemKey, section, market);
    syncNavHeader();
    return;
  }
  const item = SR_RANK_ITEM_BY_KEY.get(itemKey);
  if (!item) return;
  srRankActive = { group: item.group, k: item.k };
  appSectionMode = "stocks";
  if (market === "kr" || market === "us") {
    setWatchlistActiveMarket(market === "kr" ? "KR" : "US");
    setHeaderToneForSection(market);
  }
  goRank(item.label); // 제목이 "인기종목"에 머물던 문제(2026-09-16) — 이름은 짧게
  setBottomNavActive(bottomNavKeyForSection());
  syncSectionHeader();
  applySrRankTabs(); // 결과 위 하위 버튼 줄(모든 항목, 좌우 스크롤)
  scrollSrActiveIntoView();
  fastRankOpen(itemKey, "stocks", getWatchlistActiveMarket() === "KR" ? "kr" : "us");
  syncNavHeader();
}
// 하위 버튼 줄에서 지금 고른 항목이 보이도록 가운데로 스크롤
function scrollSrActiveIntoView() {
  const nav = el("topRankingSubNav");
  const a = nav && nav.querySelector(".cat-btn.active[data-sr-tab]");
  const box = a && (a.closest(".sr-scroll-row") || nav);
  if (box) box.scrollTo({ left: Math.max(0, a.offsetLeft - (box === nav ? 0 : box.offsetLeft) - box.clientWidth / 2 + a.offsetWidth / 2), behavior: "auto" });
}
// 묶음 안에서 다른 항목으로 갈아타기
document.addEventListener("click", (e) => {
  const reg = e.target.closest("[data-sr-region]");
  if (reg && srRankActive && srRankActive.asset === "etf") {
    etfPopularRegion = reg.dataset.srRegion;
    openSReportRank(srRankActive.k, "etf");
    return;
  }
  const btn = e.target.closest("[data-sr-tab]");
  if (!btn) return;
  if (btn.dataset.srAsset) return openSReportRank(btn.dataset.srTab, btn.dataset.srAsset);
  openSReportRank(btn.dataset.srTab, "stocks", getWatchlistActiveMarket() === "KR" ? "kr" : "us");
});

// 한 줄 행(2026-09-15 사용자 요청): 항목 | 현재 값 | 등수 "12/200위 (상위 6%)" + 상위 10% 🔥 · 하위 10% ⚠️
// RSI만 "1년 평균 77 대비 · 강한 매수" — 요약 5개와 더보기 항목이 같은 모양
function sReportLineHtml(it) {
  const tone = it.judge ? it.judge.tone : "neutral";
  const has = it.value !== null;
  const markHtml = it.mark === "warn" ? `<i class="srf-mark">⚠️</i>` : ""; // 2026-10-20 사용자 요청: 🔥 삭제, ⚠️ 유지
  let rankHtml;
  let shortHtml;
  // 2026-09-17 사용자 요청: 비교군 안 위치(상위 N%)를 크게, 실제 등수(40위/349)는 그 아래 작게
  if (it.isRsi || it.isFee || it.isVol) {
    // 과열도·운용보수·변동성은 등수 대신 등급으로 보여준다(2026-09-16·17, 변동성 2026-10-06 사용자 요청)
    const gradeText = has && it.judge ? it.judge.text : "";
    // 🔥·⚠️가 붙으면 그만큼 자리를 더 먹으므로 한 글자 더 긴 것으로 치고 글씨를 줄인다
    const gradeLen = gradeText.length + (markHtml ? 1 : 0);
    // 글자 수가 많은 등급("강한매도우위")은 칸(76px)을 넘겨 앞 글자가 잘렸다 — 길이에 따라 글씨를 줄인다(2026-09-17 사용자 지적)
    const gradeHtml = gradeText
      ? `<span class="srf-rank-top">${markHtml}<b class="srf-grade${gradeLen >= 6 ? " srf-grade-long" : gradeLen === 5 ? " srf-grade-mid" : ""} srt-rank-${tone}">${escapeHtml(gradeText)}</b></span>`
      : "—";
    // 운용보수는 등급 아래에 비교군 안 등수도 작게(2026-09-17 사용자 요청)
    const gradeRankHtml = it.isFee && it.rank ? `<span class="srf-rank-of">${it.rank}위/${it.total}</span>` : "";
    rankHtml = gradeHtml + gradeRankHtml;
    shortHtml = gradeHtml;
  } else if (it.rank) {
    const pct = Number.isFinite(it.topPct) ? Math.max(1, Math.round(it.topPct)) : null;
    rankHtml = `<span class="srf-rank-top">${markHtml}<b class="srf-rank-pct">${pct === null ? `${it.rank}위` : `상위 ${pct}%`}</b></span><span class="srf-rank-of">${it.rank}위/${it.total}</span>`;
    shortHtml = rankHtml;
  } else {
    rankHtml = shortHtml = "—";
  }
  const sKey = it.explainKey || it.key;
  return `
    <div class="srf-line" data-sr-key="${escapeHtml(sKey)}" data-sr-explain="${escapeHtml(it.explain || "")}" data-sr-title="${escapeHtml(S_REPORT_TITLES[sKey] || it.label)}">
      <span class="srf-name">${escapeHtml(it.label)}</span>
      <b class="srf-val${it.mark ? ` srf-val-${it.mark}` : ""}" data-round="${escapeHtml(has ? it.fmt(it.value, 0) : "N/A")}">${escapeHtml(has ? it.fmt(it.value, 1) : "N/A")}${
        srPartialTag(it) ? `<span class="srf-partial">${srPartialTag(it)}</span>` : ""
      }${/* 과열도는 값 옆에 이 종목의 1년 평균을 작게 붙임(2026-09-16 사용자 요청) */ ""}${
        it.isRsi && has && Number.isFinite(it.avg) ? `<span class="srf-val-avg">/${Math.round(it.avg)}(평균)</span>` : ""
      }</b>
      <span class="srf-rank${it.mark ? ` srf-rank-${it.mark}` : ""}" data-short="${escapeHtml(shortHtml)}">${rankHtml}</span>
    </div>`;
}

// 항목을 누르면 그 줄 아래에 설명이 펼쳐진다(2026-09-16 사용자 요청) — 제목 + 기존 설명 + 오른쪽 아래 작은 (+예시)(+순위).
// 공용 data-explain 장치는 순수 텍스트만 보여줘서 버튼을 넣을 수 없어 핵심지표 전용으로 따로 둔다.
function srDetailSection() {
  return currentDetailSection === "etf" ? "etf" : currentDetailSection === "crypto" ? "crypto" : "stocks";
}
function closeSrExplain(except) {
  document.querySelectorAll(".srf-explain").forEach((n) => {
    if (n !== except) {
      const line = n.previousElementSibling;
      if (line && line.classList.contains("srf-line")) line.classList.remove("srf-line-open");
      n.remove();
    }
  });
}
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".srf-chip");
  if (chip) {
    e.preventDefault();
    e.stopPropagation();
    const key = chip.dataset.srChipKey;
    if (chip.dataset.srChip === "rank") {
      const sec = srDetailSection();
      openSReportRank(key, sec, isKrTicker(currentDetailSymbol || "") ? "kr" : "us");
      return;
    }
    // +예시 — 승률·RSI·연 상승률~현금흐름, 같은 버튼을 다시 누르면 접힘
    const box = chip.closest(".srf-explain");
    const slot = box && box.querySelector(".srf-example");
    if (!slot) return;
    const isOpen = slot.dataset.open === "1";
    slot.dataset.open = isOpen ? "" : "1";
    slot.style.display = isOpen ? "none" : "block";
    chip.classList.toggle("srf-chip-on", !isOpen);
    if (!isOpen && !slot.innerHTML) {
      slot.innerHTML = `<p class="muted" style="padding:8px 2px;">불러오는 중...</p>`;
      const sec = srDetailSection() === "stocks" ? (isKrTicker(currentDetailSymbol || "") ? "kr" : "us") : srDetailSection();
      buildMetricExplainHtml(key, sec).then((html) => {
        if (slot.dataset.open === "1") slot.innerHTML = html;
      });
    }
    return;
  }
  const line = e.target.closest(".srf-line");
  if (!line) {
    if (!e.target.closest(".srf-explain")) closeSrExplain(null);
    return;
  }
  if (e.target.closest(".nine-partial-mark")) return; // ⚠️(상장 10년 미만)는 공용 경고 설명 장치가 처리
  e.preventDefault();
  e.stopPropagation();
  const next = line.nextElementSibling;
  const wasOpen = next && next.classList.contains("srf-explain");
  closeSrExplain(null);
  if (wasOpen) return; // 같은 줄을 다시 누르면 닫기만
  const key = line.dataset.srKey || "";
  const title = line.dataset.srTitle || "";
  const text = line.dataset.srExplain || "";
  // 2026-10-21 사용자 요청: "+예시" 대신 지도와 같은 "+RSI란"·"+상승률이란" — 설명과 대표 종목 색깔 막대 비교(rank-fast.js)
  const explainSection = srDetailSection() === "stocks" ? (isKrTicker(currentDetailSymbol || "") ? "kr" : "us") : srDetailSection();
  const example = typeof rfExplainLabel === "function" && RF_EXPLAIN_NAME[key]
    ? `<button type="button" class="srf-chip" data-sr-chip="example" data-sr-chip-key="${escapeHtml(key)}">${rfExplainLabel(key, explainSection)}</button>`
    : "";
  const rank = SR_RANK_ITEM_BY_KEY.has(key) || (SR_ASSET_RANK[srDetailSection()] || {})[key]
    ? `<button type="button" class="srf-chip" data-sr-chip="rank" data-sr-chip-key="${escapeHtml(key)}">+순위</button>`
    : "";
  line.classList.add("srf-line-open");
  line.insertAdjacentHTML(
    "afterend",
    `<div class="srf-explain">
      ${/* 2026-09-16 사용자 요청: (+예시)(+순위)는 설명 오른쪽 위 — 제목과 같은 줄 */ ""}
      <div class="srf-explain-head">
        <b class="srf-explain-title">${escapeHtml(title)}</b>
        ${example || rank ? `<div class="srf-explain-actions">${example}${rank}</div>` : ""}
      </div>
      <p class="srf-explain-body">${escapeHtml(text)}</p>
      <div class="srf-example" style="display:none;"></div>
    </div>`
  );
}, true);

let sReportTopToken = 0;
async function renderSReportTop(ticker, scoreMode, quote, selfMetricsPromise) {
  const token = ++sReportTopToken;
  const section = el("sReportTopSection");
  sReportInlineWrap.style.display = "none";
  sReportInlineWrap.innerHTML = "";
  const isAsset = scoreMode === "etf" || scoreMode === "crypto";

  const baseline = await getSReportBaseline();
  if (token !== sReportTopToken) return; // 그사이 다른 종목을 열었으면 버림
  const member = baseline && baseline.members ? baseline.members[ticker] : null;
  // 비교군(2026-09-16 사용자 요청): 한국 주식 = 코스피200+코스닥150 350종목, 미국 주식 = S&P500 전체,
  // 코인 = 시총 200, ETF = 한·미 통합 200(평균선만 상장 시장별로 S&P500 / 코스피·코스닥350), IPO = 두 지수에 없는 신규 상장주 200
  const groupKey = member
    ? member.g
    : scoreMode === "crypto"
    ? "crypto200"
    : scoreMode === "etf"
    ? isKrTicker(ticker)
      ? "etfKr"
      : "etfUs"
    : isKrTicker(ticker)
    ? "kr350"
    : "sp500";
  const group = baseline && baseline.groups ? baseline.groups[groupKey] : null;
  const currency = ["kr350", "ipoKr200", "etfKr"].includes(groupKey) ? "KRW" : "USD";
  const self = { ...(member || {}) };
  const coreSpecs = sReportCoreSpecs(isAsset, scoreMode === "etf");
  if (scoreMode === "etf") {
    self.aumInfo = await getEtfAumInfo(ticker).catch(() => null);
    if (token !== sReportTopToken) return;
    if (self.aumInfo) self.aum = self.aumInfo.value;
  }

  const draw = () => {
    const items = coreSpecs.map((s) => sReportMakeItem(s, self[s.key], group, currency, self.rsiAvg));
    const aumItem = items.find((it) => it.isAum);
    if (aumItem) applyEtfAumRank(aumItem, self.aumInfo);
    // 승률은 상장 10년(코인 7년) 미만이면 값 앞에 ⚠️ — 짧은 기간만으로 계산한 값이라는 경고
    const winItem = items.find((it) => it.key === "win");
    if (winItem) {
      winItem.partialTotal = self.wn;
      winItem.partialMin = partialMonthsFor(ticker);
    }
    const asOf = baseline && baseline.generatedAt ? new Date(baseline.generatedAt) : null;
    // 제목 옆에 붙이므로 짧게("9/16 기준") — 길게 쓰면 범례가 다음 줄로 밀린다(2026-09-17)
    const asOfText = asOf && !Number.isNaN(asOf.getTime()) ? `${asOf.getMonth() + 1}/${asOf.getDate()} 기준` : "";
    section.innerHTML = `
      <div class="srt-card">
        <div class="srt-radar-head">
          <span class="srt-radar-title">핵심지표${asOfText ? `<span class="srt-asof">${asOfText}</span>` : ""}</span>
          <span class="srt-legend"><i class="srt-lg-self"></i>이 종목 <i class="srt-lg-avg"></i>${escapeHtml(group ? sReportMedName(group) : "비교 기준")}</span>
        </div>
        ${S_REPORT_TAP_HINT}
        ${group ? sReportRadarSvg(items) : `<p class="muted" style="padding:10px 0;">비교 기준 데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>`}
        <div class="srf-list">${items.map(sReportLineHtml).join("")}</div>
        <div id="sReportMoreSlot"></div>
        <button type="button" class="srt-more-btn" id="sReportTopMoreBtn">더보기 <span aria-hidden="true">▾</span></button>
      </div>`;
    // 더보기 항목은 5개 행 바로 아래(버튼 위)에 붙음
    el("sReportMoreSlot").appendChild(sReportInlineWrap);
    fitSReportRoundCells(section);
    let loaded = false;
    el("sReportTopMoreBtn").addEventListener("click", async () => {
      const btn = el("sReportTopMoreBtn");
      const isOpen = sReportInlineWrap.style.display !== "none";
      sReportInlineWrap.style.display = isOpen ? "none" : "block";
      btn.innerHTML = isOpen ? `더보기 <span aria-hidden="true">▾</span>` : `접기 <span aria-hidden="true">▴</span>`;
      if (!isOpen && !loaded) {
        loaded = true;
        await renderSReportMore(ticker, scoreMode, items, group, self, currency, selfMetricsPromise, token);
      }
    });
  };

  // 승률 경고에 쓸 "상장 후 개월 수"는 승률 DB에만 있음 — 도착하면 다시 그린다
  getDetailWrEntry(ticker, scoreMode)
    .then((e) => {
      if (token !== sReportTopToken || !e || !Number.isFinite(e.total) || self.wn === e.total) return;
      self.wn = e.total;
      if (section.querySelector(".srt-card")) draw();
    })
    .catch(() => {});

  // DB에 핵심 값이 다 있으면 바로 그림 — 빠진 값(DB 밖 종목 등)은 실시간으로 채운 뒤 한 번 더 그림
  const missing = coreSpecs.some((s) => !Number.isFinite(self[s.key])) || !Number.isFinite(self.rsiAvg);
  if (!missing) {
    draw();
    return;
  }
  if (member) draw();
  else section.innerHTML = `<p class="muted" style="padding:8px 0;">핵심지표를 계산하는 중...</p>`;
  const [entry, metrics, derived] = await Promise.all([
    getDetailWrEntry(ticker, scoreMode).catch(() => null),
    isAsset ? Promise.resolve(null) : (selfMetricsPromise || Promise.resolve(null)).catch(() => null),
    Number.isFinite(self.vol) ? Promise.resolve(null) : computeChartDerivedMetrics(ticker).catch(() => null),
  ]);
  if (token !== sReportTopToken) return;
  const e = entry || {};
  const fill = (key, v) => {
    if (!Number.isFinite(self[key]) && Number.isFinite(v)) self[key] = v;
  };
  fill("win", e.score);
  fill("ret", e.ret10y);
  fill("rsi", e.rsi);
  fill("rsiAvg", e.rsi1y);
  fill("vol", Number.isFinite(e.vol3m) ? e.vol3m : derived && derived.volatility3m);
  fill("rev", isAsset ? e.ret1y : metrics && (Number.isFinite(metrics.revenueGrowthYoY) ? metrics.revenueGrowthYoY : metrics.revenueGrowthAnnual));
  draw();
}

// 더보기: 핵심 5개 아래로 나머지 항목(수익성·재무 / 가치·배당 / 시장)을 같은 한 줄 행으로 붙이고, 끝에 종합 판정 한 줄
async function renderSReportMore(ticker, scoreMode, coreItems, group, self, currency, selfMetricsPromise, token) {
  const wrap = sReportInlineWrap;
  const isAsset = scoreMode === "etf" || scoreMode === "crypto";
  const specGroups = isAsset ? S_FULL_ASSET_GROUPS[scoreMode] : S_FULL_STOCK_GROUPS;
  const values = { ...self };
  // DB 밖 주식만 빠진 값을 실시간 지표로 보충(대부분의 종목은 기다림 없이 바로 표시)
  const needsLive = !isAsset && specGroups.some((g) => g.specs.some((s) => !Number.isFinite(values[s.key])));
  if (needsLive) {
    wrap.innerHTML = `<p class="muted" style="padding:10px 2px;">나머지 항목을 계산하는 중...</p>`;
    const [metrics, divInfo] = await Promise.all([
      (selfMetricsPromise || getFullMetrics(ticker)).catch(() => null),
      Number.isFinite(values.div) ? Promise.resolve(null) : getDividendYieldInfo(ticker).catch(() => null),
    ]);
    if (token !== sReportTopToken) return;
    specGroups.forEach((g) =>
      g.specs.forEach((s) => {
        if (Number.isFinite(values[s.key])) return;
        let v = metrics && s.live ? s.live(metrics) : null;
        if (s.key === "div" && divInfo) v = divInfo.yieldPct;
        if (Number.isFinite(v) && (!s.positiveOnly || v > 0)) values[s.key] = v;
      })
    );
  }
  // 거래대금 줄은 금액 대신 1일 거래대금 증감(몇 배) — 순위 비교군이 없어 값만 보여준다(2026-10-19)
  let dvRatio;
  if (!isAsset && specGroups.some((g) => g.specs.some((s) => s.key === "dv"))) {
    try {
      await volrLoad();
      const dv = (await volrFetchDayVals([ticker]))[ticker];
      dvRatio = volrRatio(ticker, dv);
    } catch {}
  }
  const groups = specGroups.map((g) => ({
    title: g.title,
    items: g.specs.map((s) =>
      s.key === "dv"
        ? sReportMakeItem({ ...s, label: "거래대금 증감", unit: "times", fmt: (v) => fmtVolr(v) }, dvRatio, { ...(group || {}), dist: { ...((group && group.dist) || {}), dv: null } }, currency, self.rsiAvg)
        : sReportMakeItem(s, values[s.key], group, currency, self.rsiAvg)
    ),
  }));

  // 요약 한 줄 — 상위 10%(🔥)·하위 10%(⚠️) 항목 모음
  const ranked = coreItems.concat(groups.flatMap((g) => g.items)).filter((it) => it.rank);
  const warn = ranked.filter((it) => it.mark === "warn");
  const names = (arr) => arr.map((it) => escapeHtml(it.label)).join(", ");

  wrap.innerHTML = `
    ${groups.map((g) => `<p class="srf-group">${escapeHtml(g.title)}</p><div class="srf-list">${g.items.map(sReportLineHtml).join("")}</div>`).join("")}
    <p class="srf-verdict"><b>⚠️ 하위 10% ${warn.length}개</b>${
    warn.length ? `<span class="srf-verdict-sub">⚠️ ${names(warn)}</span>` : ""
  }</p>`;
  fitSReportRoundCells(wrap);
}

// 한 줄에 안 들어가면 소수점을 반올림(2026-09-15 사용자 요청)
function fitSReportRoundCells(root) {
  // 등수 칸이 넘치면 "(상위 N%)"를 떼고 등수만 — 그래도 넘치면 아래에서 값 소수점 반올림
  root.querySelectorAll(".srf-line [data-short]").forEach((node) => {
    const box = node.closest(".srf-line");
    if (box && box.scrollWidth > box.clientWidth + 1) node.innerHTML = node.dataset.short;
  });
  root.querySelectorAll(".srf-line [data-round]").forEach((node) => {
    const box = node.closest(".srf-line");
    if (!box || box.scrollWidth <= box.clientWidth + 1) return;
    const tag = node.querySelector(".srf-partial"); // (10년미만) 표시는 그대로 두고 숫자만 반올림
    node.textContent = node.dataset.round;
    if (tag) node.insertAdjacentElement("beforeend", tag);
  });
}
window.addEventListener("resize", () => {
  ["sReportTopSection", "sReportInlineWrap"].forEach((id) => {
    const node = el(id);
    if (node) fitSReportRoundCells(node);
  });
});

// ---------- 1. 사업 요약 ----------
async function renderSummary(quote, meta, changePct, selfMetricsPromise, marketReturnsPromise, changeAmount = null) {
  // 펼침 섹션들은 지난 렌더 때 #summarySection 안으로 옮겨져 있어, 아래 innerHTML로 지우면 문서에서 떨어져 나간다 —
  // 그동안 renderMacro 등이 el("macroSection")을 못 찾아 오류가 났음(2026-09-15) → 지우기 전에 개요 패널로 잠시 옮겨 둠
  const summaryPanelEl = document.querySelector('[data-summary-subtabpanel="summary"]');
  [futureInlineWrap, oxInlineWrap, crashInlineWrap, sReportInlineWrap].forEach((wrap) => {
    if (wrap && el("summarySection").contains(wrap)) summaryPanelEl.appendChild(wrap);
  });
  crashInlineWrap.style.display = "none";
  crashInlineWrap.innerHTML = "";
  el("summarySection").innerHTML = `<p class="muted">불러오는 중...</p>`;
  // 새 종목 검색 시 이전 종목의 과거분석/미래예측/s리포트 펼침 상태를 초기화(과거분석 3버튼 결과는 종목 무관이라 내용은 유지, 열림 상태만 접음)
  historicalInlineWrap.style.display = "none";
  futureInlineWrap.style.display = "none";
  sReportInlineWrap.style.display = "none";

  const rawCompanyName = quote.longname || quote.shortname || meta.longName || meta.symbol;
  // kr/us/etf/crypto — 이름 표기 외에 과거분석·미래예측·S리포트 버튼의 자산별 분기(2026-09-02)에도 사용
  const summaryAssetSection = sectionOfSymbol(meta.symbol || quote.symbol || "", quote.quoteType);
  const isAssetDetail = summaryAssetSection === "etf" || summaryAssetSection === "crypto";
  currentDetailSection = summaryAssetSection; // 과거분석 한달/1년 버튼의 자산별 분기용(2026-09-02)
  currentDetailSymbol = meta.symbol || quote.symbol || "";
  // 암호화폐는 "Bitcoin USD"처럼 통화쌍 표기라 위키 검색·표시용 이름에서 " USD"를 떼어냄(2026-09-01)
  const companyName = summaryAssetSection === "crypto" ? rawCompanyName.replace(/\s+USD$/i, "") : rawCompanyName;
  // 개요 한 줄 설명(2026-09-03 사용자 요청): 코인·ETF는 위키 자동 매칭이 엉뚱한 문서를 자주 잡아
  // 직접 관리하는 정적 설명·템플릿(cryptoDescriptionOf/etfDescriptionOf)으로 대체, 주식만 기존 위키 요약 유지
  let oneLiner = "사업 개요 정보를 찾을 수 없습니다.";
  if (summaryAssetSection === "crypto") {
    oneLiner = cryptoDescriptionOf(cryptoBaseTicker(meta.symbol || quote.symbol || ""), companyName);
  } else if (summaryAssetSection === "etf") {
    oneLiner = etfDescriptionOf(meta.symbol || quote.symbol || "", companyName);
  } else {
    // 공시 기반 개요를 먼저 — 이름으로 검색하는 위키백과와 달리 엉뚱한 회사가 잡힐 일이 없다
    const fromDb = await getCompanyOverview(meta.symbol || quote.symbol || "").catch(() => null);
    if (fromDb) {
      oneLiner = fromDb;
    } else {
      try {
        oneLiner = await getBusinessSummaryKo(companyName);
      } catch {
        // 위키백과 매칭도 실패하면 안내 문구 유지
      }
    }
  }
  if (oneLiner.length > 220) oneLiner = oneLiner.slice(0, 217) + "...";

  const industryEn = quote.industryDisp || quote.industry || "";
  const sectorEn = quote.sectorDisp || quote.sector || "";
  const industryKo = industryEn ? await translateToKorean(industryEn).catch(() => industryEn) : "";
  const sectorKo = sectorEn ? SECTOR_KO[sectorEn] || (await translateToKorean(sectorEn).catch(() => sectorEn)) : "";

  const symbol = meta.symbol || quote.symbol || "";

  // 지정 로고(override)가 있으면 그걸 쓰고, 없으면 기존 자동 소스(logo.dev/FMP) 사용
  // 코인은 자체 호스팅 로고 DB, 한국 ETF는 브랜드 → 운용사 그룹 CI를 우선 적용(2026-09-03)
  // 국내 ETF는 야후 이름이 영문("Samsung KODEX ...")이라 브랜드를 못 찾던 문제 — 국내 ETF 한글 상품명 목록을 먼저 받아 그 이름으로 판별(2026-09-13)
  if (summaryAssetSection === "etf" && isKrTicker(symbol)) {
    await getKrEtfFullList().catch(() => null);
    ensureKrEtfLogoOverride(symbol, ETF_NAME_BY_SYMBOL.get(symbol) || TICKER_TO_KOREAN_NAME[symbol] || companyName);
  }
  if (summaryAssetSection === "etf") registerEtfName(symbol, TICKER_TO_KOREAN_NAME[symbol] || companyName);
  const _cryptoLogoSrc = summaryAssetSection === "crypto" ? cryptoLogoSrc(cryptoBaseTicker(symbol)) : null;
  const _logoOv = LOGO_OVERRIDE[symbol] || (_cryptoLogoSrc ? { src: _cryptoLogoSrc } : null);
  const _logoSrc = logoSources(symbol, 128);
  const _logoBg = logoBg(symbol);
  const summaryLogoWrapStyle = _logoBg ? ` style="background:${_logoBg}"` : "";
  // ETF 상세 헤더도 목록과 같은 로고를 써야 같은 종목으로 알아본다 — 실제 로고가 없을 때만 테마 이모지(2026-09-11)
  // 2026-09-13 사용자 요청: 이모지 로고는 쓰지 않음 — 로고가 없으면 이미지 실패 시 글자 배지로 떨어짐
  const _etfEmoji = null;
  const summaryLogoImg = _etfEmoji
    ? `<span class="summary-etf-emoji">${etfThemeMarkHtml(_etfEmoji)}</span>`
    : _logoOv
    ? `<img class="summary-ticker-logo" src="${_logoOv.src}" alt="${escapeHtml(symbol)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : `<img class="summary-ticker-logo" src="${_logoSrc.primary}" alt="${escapeHtml(symbol)}" ${_logoSrc.useFallback ? `data-fallback="${_logoSrc.fmp}"` : ""} onerror="${LOGO_ONERROR}" />`;

  // 현재가 옆 등락 표기 — 암호화폐(2026-09-03 사용자 요청)는 오늘 등락금액+등락률을 함께, 그 외는 기존처럼 등락률만
  let summaryChangeHtml = "";
  if (changePct !== null && changePct !== undefined) {
    const cls = changePct >= 0 ? "delta-up" : "delta-down";
    const price = meta.regularMarketPrice ?? 0;
    // 현재가 줄: "▼ 6,992 (-0.41%)" — 화살표 + 오르내린 금액 + 등락률(2026-09-15 사용자 요청, 모든 종목)
    if (price && changePct > -100) {
      // 실제 직전 종가 기준 금액(getDailyChangeAmount) 우선, 없을 때만 등락률로 역산
      const diff = Math.abs(Number.isFinite(changeAmount) ? changeAmount : price - price / (1 + changePct / 100));
      summaryChangeHtml = `<span class="${cls}">${changePct >= 0 ? "▲" : "▼"} ${fmtPriceChangeAmount(diff, meta.currency)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)</span>`;
    } else {
      summaryChangeHtml = `<span class="${cls}">(${fmtPct(changePct)})</span>`;
    }
  }

  el("summarySection").innerHTML = `
    <div class="summary-main">
      <p class="summary-text">
        <span class="summary-ticker-logo-wrap"${summaryLogoWrapStyle}>
          ${summaryLogoImg}
          <span class="summary-ticker-badge" style="display:none;">${escapeHtml(symbol)}</span>
        </span>
        <b>${escapeHtml(companyName)}</b> — ${escapeHtml(oneLiner)}
      </p>
      <div class="company-meta">
        ${summaryAssetSection === "crypto"
          ? `<span>섹터: <b>${escapeHtml(cryptoSectorOf(cryptoBaseTicker(symbol)))}</b></span>
        <span>상장 거래소: <b>${escapeHtml(cryptoExchangesOf(cryptoBaseTicker(symbol)))}</b></span>`
          : summaryAssetSection === "etf"
          ? `${/* ETF는 업종이 없어 빼고, 섹터는 마켓맵 지도와 같은 분류(2026-09-16 사용자 요청) */ ""}
        <span>섹터: <b>${escapeHtml(etfSectorOf(symbol, companyName))}</b></span>
        <span>거래소: <b>${escapeHtml(krExchangeName(symbol) || quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>`
          : `<span>업종: <b>${escapeHtml(industryKo || "N/A")}</b></span>
        <span>섹터: <b>${escapeHtml(sectorKo || "N/A")}</b></span>
        <span>거래소: <b>${escapeHtml(krExchangeName(symbol) || quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>`}
        <span>현재가: <b>${fmtPriceFull(meta.regularMarketPrice ?? 0, meta.currency)}</b> ${summaryChangeHtml}</span>${/* 2026-09-13 사용자 요청: 차트보기 버튼 제거(위 차트로 충분) */ ""}
      </div>
      <div class="summary-action-row">
        ${/* 2026-09-15 사용자 요청: 버튼 = 과거분석(12개월 승률 카드) · 미래예측 · 공포지수(코인은 알트시즌지수). S리포트는 버튼 대신 아래 요약 카드로 펼쳐 둠 */ ""}
        <button type="button" class="summary-action-btn" id="tickerHistoricalToggleBtn" data-ticker="${escapeHtml(symbol)}">🕰️ 월간승률</button>
        <button type="button" class="summary-action-btn" id="tickerFutureToggleBtn" data-ticker="${escapeHtml(symbol)}">🔮 계절성 예측</button>
        <button type="button" class="summary-action-btn" id="tickerCrashToggleBtn" data-ticker="${escapeHtml(symbol)}">📉 급락 리스크</button>
        <button type="button" class="summary-action-btn" id="tickerDividendToggleBtn" style="display:none;">💰 배당</button>
        <button type="button" class="summary-action-btn" id="tickerFearToggleBtn" style="display:none;">${summaryAssetSection === "crypto" ? "🪙 알트시즌지수" : "😱 공포지수"}</button>
        ${/* 보유 종목은 버튼 대신 하위 탭 "보유종목"(주식의 매출액 자리)에 바로 펼쳐 둔다 — 2026-09-16 사용자 요청 */ ""}
      </div>
    </div>
    <div id="etfHoldingsBlock" class="etf-holdings-block" style="display:none;"></div>
    <div id="tickerHistoricalRow" style="display:none;"></div>
  `;
  etfHoldingsShowMore = false;

  // 세 버튼(과거분석·미래예측·S리포트) 모두 누른 자리 바로 아래에서 열리도록 정적 섹션을 요약 영역 안으로 이동
  // — innerHTML 재렌더로 DOM에서 떨어져 나가도 상단 const 참조가 노드를 붙잡고 있어 매 렌더마다 다시 붙임(내용·리스너 유지)
  // (S리포트는 2026-09-04, 과거분석·미래예측은 2026-09-10 사용자 요청으로 같은 방식 적용 — 이전엔 화면 한참 아래에서 열렸음)
  // 2026-09-13 사용자 요청: ETF는 버튼 아래에 보유종목 TOP10 블록이 있어 그 밑에서 열렸음 → 보유종목 블록 "앞"(버튼 바로 아래)에 끼움
  const holdingsAnchor = el("etfHoldingsBlock");
  if (holdingsAnchor) el("summarySection").insertBefore(el("tickerHistoricalRow"), holdingsAnchor);
  [futureInlineWrap, oxInlineWrap, crashInlineWrap, ensureDividendWrap()].forEach((wrap) => {
    wrap.style.display = "none";
    wrap.classList.remove("section-expanded");
    if (holdingsAnchor) el("summarySection").insertBefore(wrap, holdingsAnchor);
    else el("summarySection").appendChild(wrap);
  });

  // ETF 보유 종목은 하위 탭 "보유종목"(주식의 매출액 자리)에만 표시 — 2026-09-16 사용자 요청
  if (summaryAssetSection === "etf" && holdingsAnchor) {
    holdingsAnchor.style.display = "block";
    const finSection = el("financialsSection");
    finSection.innerHTML = "";
    finSection.appendChild(holdingsAnchor);
    renderEtfHoldingsBlock(meta.symbol || quote.symbol || "", isKrTicker(meta.symbol || quote.symbol || ""));
  }

  const futureToggleBtn = el("tickerFutureToggleBtn");
  const historicalToggleBtn = el("tickerHistoricalToggleBtn");
  const holdingsToggleBtn = el("tickerHoldingsToggleBtn");
  const dividendToggleBtn = el("tickerDividendToggleBtn");
  const dividendWrap = ensureDividendWrap();

  const crashToggleBtn = el("tickerCrashToggleBtn");
  const sections = [
    { btn: historicalToggleBtn, els: [oxInlineWrap] },
    { btn: futureToggleBtn, els: [futureInlineWrap] },
    { btn: crashToggleBtn, els: [crashInlineWrap] },
  ];
  if (holdingsToggleBtn) sections.push({ btn: holdingsToggleBtn, els: [holdingsAnchor] });
  if (dividendToggleBtn && dividendWrap) sections.push({ btn: dividendToggleBtn, els: [dividendWrap] });
  // 과거분석(=12개월 승률 카드)·공포지수·보유 종목 — 누르면 버튼 바로 아래에 펼침
  // (2026-09-15 사용자 요청: 과거분석의 한달/1년 상승·하락 비교는 없애고 12개월 승률 카드로 대체)
  const bindSimpleToggle = (btn, wrap, onOpen) => {
    if (!btn || !wrap) return;
    btn.addEventListener("click", () => {
      const isOpen = wrap.style.display !== "none";
      closeAllSections(btn);
      if (isOpen) {
        wrap.style.display = "none";
        btn.classList.remove("active");
        return;
      }
      wrap.style.display = "block";
      btn.classList.add("active");
      if (onOpen) onOpen();
    });
  };
  bindSimpleToggle(historicalToggleBtn, oxInlineWrap, () => {
    if (!oxInlineWrap.innerHTML.trim()) oxInlineWrap.innerHTML = `<p class="muted" style="padding:10px 2px;margin:0;">최근 12개월 승패 데이터가 아직 없습니다.</p>`;
  });
  // 52주 최대 하락폭 — 열 때마다 오늘 기준으로 다시 계산
  bindSimpleToggle(crashToggleBtn, crashInlineWrap, () => renderCrashInto(crashInlineWrap, symbol));
  // 배당: 배당을 주는 종목(주식·ETF)에서만 버튼을 보여주고, 누르면 최근 1년 배당 내역을 펼친다(코인은 해당 없음)
  bindSimpleToggle(dividendToggleBtn, dividendWrap);
  if (dividendToggleBtn && dividendWrap && summaryAssetSection !== "crypto") {
    fetchDividends(symbol).then((d) => {
      if (!d || !d.hasDividend || !dividendToggleBtn.isConnected) return;
      dividendWrap.innerHTML = dividendPanelHtml(d, companyName);
      dividendToggleBtn.style.display = "";
    });
  }
  bindSimpleToggle(holdingsToggleBtn, holdingsAnchor, () => {
    if (!holdingsAnchor.innerHTML.trim()) holdingsAnchor.innerHTML = `<p class="muted" style="padding:10px 2px;margin:0;">보유 종목 정보가 없습니다.</p>`;
  });
  function closeAllSections(exceptBtn) {
    sections.forEach(({ btn, els }) => {
      if (btn === exceptBtn) return;
      btn.classList.remove("active");
      els.forEach((e) => {
        e.style.display = "none";
        e.classList.remove("section-expanded");
      });
    });
  }

  let futureLoaded = false;
  futureToggleBtn.addEventListener("click", async () => {
    const isOpen = futureInlineWrap.style.display !== "none";
    if (isOpen) {
      futureInlineWrap.style.display = "none";
      futureInlineWrap.classList.remove("section-expanded");
      futureToggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(futureToggleBtn);
    futureInlineWrap.style.display = "block";
    futureInlineWrap.classList.add("section-expanded");
    futureToggleBtn.classList.add("active");
    refitFutureChart(); // 보이는 폭에 맞춰 스크롤 없이 한눈에
    scrollChartToRight(el("futureChartContainer")); // 이미 그려져 있던 경우에도 오른쪽 끝부터
    if (!futureLoaded) {
      futureLoaded = true;
      // 2026-09-09 사용자 요청: 매출액 vs 주가 vs 순이익(1년·5년·10년) 3장 — ETF·코인은 재무가 없어 주가만
      // 2026-09-10 사용자 요청: 매출액vs주가vs순이익 3장 → 예전 "과거 4개년 계절성 + 기울기 예측" 그래프로 복귀
      await runFuturePrediction(symbol, selfMetricsPromise, marketReturnsPromise, { chartOnly: isAssetDetail });
    }
  });

  // 요약 탭 상단 가격 차트: 새 종목 조회 시 기간 버튼을 기본값(1년)으로 되돌리고 다시 그림
  Array.from(summaryChartPeriodNav.children).forEach((b) => b.classList.toggle("active", b.dataset.chartPeriod === "1y"));
  runSummaryChart(symbol, "1y");
}

// ---------- 52주 최대 하락폭(2026-10-19 사용자 요청) ----------
// 예전 "리스크 점검"에서 급락률(최근 52주 중 5거래일 기준 가장 크게 빠진 구간)만 떼어 와 상세의 "미래예측" 오른쪽 버튼으로 옮겼다.
// 이 종목의 값은 열 때마다 야후 1년 일봉으로 오늘 기준으로 다시 계산하고, 전체 종목 분포·순위는 매일 갱신되는 리스크 데이터(주식만)를 쓴다.
const crashInlineWrap = document.createElement("div");
crashInlineWrap.id = "crashInlineWrap";
crashInlineWrap.style.display = "none";
function computeCrash52(chart) {
  const res = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!res) return null;
  const closes = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
  const off = (res.meta && res.meta.gmtoffset) || 0;
  const pts = (res.timestamp || []).map((t, i) => ({ t, c: closes[i] })).filter((p) => Number.isFinite(p.c) && p.c > 0);
  if (pts.length < 30) return null;
  const day = (t) => new Date((t + off) * 1000).toISOString().slice(0, 10);
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < Math.min(i + 6, pts.length); j++) {
      const v = (pts[j].c / pts[i].c - 1) * 100;
      if (!best || v < best.v) best = { v, i, j };
    }
  }
  if (!best) return null;
  const a = pts[best.i];
  const b = pts[best.j];
  return { pct: best.v, from: day(a.t), to: day(b.t), fromPrice: a.c, toPrice: b.c, rangeFrom: day(pts[0].t), rangeTo: day(pts[pts.length - 1].t) };
}
let crashRenderToken = 0;
async function renderCrashInto(wrap, ticker) {
  const token = ++crashRenderToken;
  wrap.innerHTML = `<p class="muted" style="padding:10px 2px;margin:0;">52주 시세를 불러오는 중...</p>`;
  const section = sectionOfSymbol(ticker);
  const isKr = isKrTicker(ticker);
  let crash = null;
  try {
    crash = computeCrash52(await yahooChart(ticker, "1y", "1d"));
  } catch {}
  // 전체 종목 분포·순위 — 코스피200+코스닥150 / S&P500 주식만(ETF·코인은 비교군이 없어 이 종목 값만)
  let rows = [];
  if (section === "kr" || section === "us") {
    try {
      const ds = await loadRiskDataset(isKr);
      rows = ds.items.filter((r) => r.crash && Number.isFinite(r.crash.pct)).map((r) => ({ symbol: r.symbol, name: r.name, _pct: r.crash.pct }));
    } catch {}
  }
  if (token !== crashRenderToken) return;
  if (!crash) {
    wrap.innerHTML = `<p class="muted" style="padding:10px 2px;margin:0;">52주 시세를 가져오지 못했습니다.</p>`;
    return;
  }
  // 이 종목은 방금 계산한 값으로 바꿔 끼움(배치 값은 하루 전일 수 있음)
  const mine = rows.find((r) => r.symbol === ticker);
  if (mine) mine._pct = crash.pct;
  else if (rows.length) rows.push({ symbol: ticker, name: TICKER_TO_KOREAN_NAME[ticker] || ticker, _pct: crash.pct });
  rows.sort((a, b) => a._pct - b._pct);
  const rank = rows.findIndex((r) => r.symbol === ticker) + 1;
  const price = (v) => (isKr ? `${Math.round(v).toLocaleString()}원` : `$${v.toFixed(2)}`);
  const grade =
    crash.pct <= -RISK_DANGER_PCT ? { cls: "risk-bad", label: "급락 있음" } : crash.pct <= -10 ? { cls: "risk-warn", label: "하락 있음" } : { cls: "risk-good", label: "완만" };
  wrap.innerHTML = `<div class="risk-card crash-card">
      <div class="risk-card-top"><span class="risk-card-title">52주 최대 하락폭</span><span class="risk-chip ${grade.cls}">${grade.label}</span></div>
      <div class="crash-big"><b class="${riskDeltaCls(crash.pct)}">${riskFmtPct(crash.pct)}</b></div>
      <div class="risk-card-value">가장 크게 빠진 1주(5거래일) <span class="muted">(${price(crash.fromPrice)} → ${price(crash.toPrice)})</span></div>
      ${rows.length >= 10 ? riskDistributionChart(rows.map((r) => r._pct), crash.pct, (v) => riskFmtPct(v)) : ""}
      ${riskBasisHtml(crash.from, crash.to, `최근 52주(${crash.rangeFrom} ~ ${crash.rangeTo}) 중 가장 큰 5거래일 낙폭`)}
      ${rank ? `<div class="risk-card-rank">낙폭 ${rows.length}곳 중 <b>${rank}위</b> <span class="muted">(많이 빠진 순)</span></div>` : ""}
      ${
        rows.length >= 10
          ? `<button type="button" class="risk-more-btn" data-crash-toggle>+ 전체 순위 (${rows.length}곳)</button>
      <div class="risk-more" data-crash-list style="display:none;">${riskRankListHtml(rows, (r) => `<span class="risk-rank-val ${riskDeltaCls(r._pct)}">${riskFmtPct(r._pct)}</span>`, ticker)}</div>`
          : ""
      }
      <p class="risk-source" style="margin-top:8px;">매일 오늘 기준으로 다시 계산합니다(출처: 야후 시세). 투자 권유가 아닙니다.</p>
    </div>`;
  const btn = wrap.querySelector("[data-crash-toggle]");
  if (btn)
    btn.addEventListener("click", () => {
      const list = wrap.querySelector("[data-crash-list]");
      const open = list.style.display === "none";
      list.style.display = open ? "" : "none";
      btn.textContent = btn.textContent.replace(open ? "+" : "−", open ? "−" : "+");
    });
}

// ---------- 배당(2026-10-09 사용자 요청) ----------
// 상세의 "미래예측" 오른쪽 "배당" 버튼 — 배당을 주는 종목만. 최근 1년 배당을 최근 순으로 3단계(주가 · 배당금(배당률) · 배당락일/지급일)로 보여주고,
// 줄마다 컷(감소)·증가·특별배당·예정 표시를 붙인다. 맨 위엔 기업명과 월배당/분기배당 같은 배당 주기.
const dividendCache = new Map();
// 배당 영역(#dividendInlineWrap)이 없는 예전 index.html(캐시)과 새 app.js가 섞여도 깨지지 않게 없으면 만든다
function ensureDividendWrap() {
  let w = el("dividendInlineWrap");
  if (!w) {
    w = document.createElement("section");
    w.id = "dividendInlineWrap";
    w.className = "flush-section";
    w.style.display = "none";
    document.body.appendChild(w);
  }
  return w;
}
async function fetchDividends(symbol) {
  if (dividendCache.has(symbol)) return dividendCache.get(symbol);
  try {
    const res = await fetch(`${AUTH_ORIGIN}/dividends?symbol=${encodeURIComponent(symbol)}`);
    const d = res.ok ? await res.json() : null;
    dividendCache.set(symbol, d);
    return d;
  } catch {
    return null;
  }
}
// 기업명은 한글 이름 우선(검색 결과 줄과 같은 규칙: ETF 상품명 → 한글 종목명 → 상세 화면 이름)
function dividendKoName(symbol, fallback) {
  try {
    const parts = typeof etfDisplayParts === "function" ? etfDisplayParts(symbol) : null;
    if (parts && parts.main) return parts.main;
  } catch {}
  return TICKER_TO_KOREAN_NAME[symbol] || fallback || symbol;
}
function dividendPanelHtml(d, companyName) {
  const isKrw = d.currency === "KRW";
  const money = (v) => (v == null ? "—" : isKrw ? `${Math.round(v).toLocaleString("ko-KR")}원` : `${d.currency === "USD" || !d.currency ? "$" : ""}${v < 1 ? v.toFixed(3) : v.toFixed(2)}`);
  const priceTxt = (v) => (v == null ? "—" : isKrw ? `${Math.round(v).toLocaleString("ko-KR")}원` : `${d.currency === "USD" || !d.currency ? "$" : ""}${v.toFixed(2)}`);
  const md = (iso) => (iso ? `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}` : "");
  const tagHtml = (r) => {
    const out = [];
    if (r.upcoming) out.push(`<span class="div-tag div-up-coming">예정</span>`);
    if (r.upcoming && r.estimated) out.push(`<span class="div-estnote">*아직 공시 전이라 날짜 금액은 달라질 수 있습니다.</span>`);
    if (r.tag === "cut") out.push(`<span class="div-tag div-cut">🚨 배당 컷 ${r.changePct.toFixed(0)}% (이전 정기 배당 대비)</span>`);
    else if (r.tag === "down") out.push(`<span class="div-tag div-down">⚠️ 배당 감소 ${r.changePct.toFixed(0)}%</span>`);
    else if (r.tag === "up") out.push(`<span class="div-tag div-up">▲ 배당 증가 +${r.changePct.toFixed(0)}%</span>`);
    if (r.special) out.push(`<span class="div-tag div-special">★ 평소보다 큰 배당(특별·결산 배당일 수 있음)</span>`);
    return out.length ? `<div class="div-tags">${out.join("")}</div>` : "";
  };
  const rowsHtml = (d.rows || [])
    .map((r) => {
      const est = r.estimated ? "예상 " : "";
      const dates = `<span class="div-d">${est}배당락 ${escapeHtml(md(r.exDate))}</span><span class="div-d">${r.payDate ? `${est}지급 ${escapeHtml(md(r.payDate))}` : d.payDateAvailable ? "지급일 미정" : "지급일 공시 확인"}</span>`;
      const yieldTxt = r.yieldPct != null ? ` <small>(${r.yieldPct.toFixed(2)}%)</small>` : "";
      return `<div class="div-row${r.tag === "cut" ? " is-cut" : ""}${r.upcoming ? " is-upcoming" : ""}${r.estimated ? " is-estimated" : ""}">
        <div class="div-cells">
          <div class="div-c1">${priceTxt(r.price)}</div>
          <div class="div-c2"><b>${r.estimated ? "약 " : ""}${money(r.amount)}</b>${yieldTxt}</div>
          <div class="div-c3">${dates}</div>
        </div>
        ${tagHtml(r)}
      </div>`;
    })
    .join("");
  const annualTxt = d.annualYieldPct != null ? `연 배당률 <b>${d.annualYieldPct.toFixed(2)}%</b> · 지난 1년 배당금 합계 <b>${money(d.annualAmount)}</b>` : "";
  return `
    <div class="div-wrap">
      ${d.price != null ? `<div class="div-now"><span>현재 주가</span><b>${priceTxt(d.price)}</b></div>` : ""}
      <div class="div-top">
        <span class="div-logo">${tickerLogoHtml(d.symbol)}</span>
        <span class="div-name">${escapeHtml(dividendKoName(d.symbol, companyName))}</span>
        <span class="div-freq">${escapeHtml(d.frequency || "")}</span>
      </div>
      ${annualTxt ? `<p class="div-annual">${annualTxt}</p>` : ""}
      ${d.delayed ? `<p class="div-warn">⚠️ 평소 배당 주기보다 늦어지고 있어요. 배당이 미뤄지거나 중단됐을 수 있으니 공시를 확인해 보세요.</p>` : ""}
      <div class="div-head"><span>주가<small>배당락일 전 종가</small></span><span>배당금<small>(배당률)</small></span><span>배당락일<small>/ 지급일</small></span></div>
      ${rowsHtml}

    </div>`;
}

// ---------- ETF·코인 전용 과거분석(2026-09-02): 1년 전 가격 + 그 시점까지의 데이터로 계산한 전용 배점 점수 ----------
function closestIdxOfPairs(pairs, targetT) {
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < pairs.length; i++) {
    const d = Math.abs(pairs[i].t - targetT);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  return idx;
}
// 2년 차트에서 idx 시점까지의 데이터만으로 computeChartDerivedMetrics와 같은 입력 지표를 재현
function chartDerivedMetricsAsOf(pairs, idx) {
  const upTo = pairs.slice(0, idx + 1);
  const asOf = upTo[upTo.length - 1];
  const avgOf = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const dvs = upTo.map((p) => p.c * p.v);
  const recentDollarVolume = avgOf(dvs.slice(-5));
  const avgDollarVolume1y = avgOf(dvs.slice(-252));
  const i3 = closestIdxOfPairs(upTo, asOf.t - 91 * 86400);
  const momentum3m = i3 >= 0 && upTo[i3].c ? ((asOf.c - upTo[i3].c) / upTo[i3].c) * 100 : null;
  const i1y = closestIdxOfPairs(upTo, asOf.t - 365 * 86400);
  const oneYearReturn =
    i1y >= 0 && upTo[i1y].c && Math.abs(upTo[i1y].t - (asOf.t - 365 * 86400)) < 30 * 86400 ? ((asOf.c - upTo[i1y].c) / upTo[i1y].c) * 100 : null;
  const rets = [];
  for (let i = 1; i < upTo.length; i++) {
    if (upTo[i - 1].c) rets.push(Math.abs((upTo[i].c - upTo[i - 1].c) / upTo[i - 1].c) * 100);
  }
  const volatility = avgOf(rets.slice(-30));
  // 한달 수익률·3개월 평균 거래대금(2026-09-03 코인 배점 개편 입력)
  const i1m = closestIdxOfPairs(upTo, asOf.t - 30 * 86400);
  const monthReturn = i1m >= 0 && upTo[i1m].c ? ((asOf.c - upTo[i1m].c) / upTo[i1m].c) * 100 : null;
  const dv3mArr = upTo.filter((p) => p.t >= asOf.t - 91 * 86400).map((p) => p.c * p.v);
  const avgDollarVolume3m = avgOf(dv3mArr);
  return { t: asOf.t, price: asOf.c, recentDollarVolume, avgDollarVolume1y, avgDollarVolume3m, momentum3m, monthReturn, oneYearReturn, volatility };
}
// 배치(fetch-winrate-scores.ps1)와 같은 공식: 월봉 11년에서 진행 중인 이번 달 제외 → 최근 최대 120개월 상승 비율(score),
// 연복리 수익률(ret10y), 최근 12개월 월간 등락(m12, to=마지막 월), 주봉 RSI(14) 현재값
const liveWinRateCache = new Map();
function computeLiveWinRateEntry(ticker) {
  if (!liveWinRateCache.has(ticker)) {
    const p = (async () => {
      const [mo, wk] = await Promise.all([yahooChart(ticker, "11y", "1mo"), yahooChart(ticker, "2y", "1wk").catch(() => null)]);
      // 월봉 시각은 거래소 현지 1일 0시라 한국 종목은 UTC로 전달 말일로 찍힘 — 하루 더해 달을 판별
      const monthOfT = (t) => new Date((t + 86400) * 1000);
      let pairs = chartClosePairs(mo);
      // 야후는 이번 달 월봉(1일자)에 더해 "지금 시각" 봉을 하나 더 붙여 줄 때가 있어, 이번 달에 속한 봉은 전부 뺀다
      const now = new Date();
      while (pairs.length) {
        const last = monthOfT(pairs[pairs.length - 1].t);
        if (last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() === now.getUTCMonth()) pairs = pairs.slice(0, -1);
        else break;
      }
      if (pairs.length > 121) pairs = pairs.slice(-121);
      const total = pairs.length - 1;
      if (total < 6) return null; // 배치와 같이 상장 6개월 미만은 제외
      let up = 0;
      for (let i = 1; i < pairs.length; i++) if (pairs[i].c > pairs[i - 1].c) up++;
      const m12 = [];
      for (let i = Math.max(1, pairs.length - 12); i < pairs.length; i++) {
        if (pairs[i - 1].c) m12.push(Math.round((pairs[i].c / pairs[i - 1].c - 1) * 1000) / 10);
      }
      const ratio = pairs[0].c > 0 ? pairs[pairs.length - 1].c / pairs[0].c : null;
      const ret10y = total >= 12 && ratio > 0 ? Math.round((Math.pow(ratio, 12 / total) - 1) * 1000) / 10 : null;
      const lastD = monthOfT(pairs[pairs.length - 1].t);
      const to = `${lastD.getUTCFullYear()}-${String(lastD.getUTCMonth() + 1).padStart(2, "0")}`;
      let rsi = null;
      let rsi1y = null;
      const wp = wk ? chartClosePairs(wk).map((x) => x.c) : [];
      if (wp.length > 15) {
        let g = 0;
        let l = 0;
        for (let i = 1; i <= 14; i++) {
          const d = wp[i] - wp[i - 1];
          if (d > 0) g += d;
          else l -= d;
        }
        g /= 14;
        l /= 14;
        const series = [l === 0 ? 100 : 100 - 100 / (1 + g / l)];
        for (let i = 15; i < wp.length; i++) {
          const d = wp[i] - wp[i - 1];
          g = (g * 13 + Math.max(d, 0)) / 14;
          l = (l * 13 + Math.max(-d, 0)) / 14;
          series.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
        }
        rsi = Math.round(series[series.length - 1] * 10) / 10;
        // 직전 52주 평균 RSI(배치 rsi1y와 같은 뜻) — S리포트 RSI 평가 기준(2026-09-15)
        const tail = series.slice(-52);
        rsi1y = Math.round((tail.reduce((a, b) => a + b, 0) / tail.length) * 10) / 10;
      }
      const ret1y = m12.length ? Math.round((m12.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 1000) / 10 : null;
      return { score: Math.round((up / total) * 1000) / 10, up, total, to, ret10y, ret1y, rsi, rsi1y, m12, live: true };
    })().catch((err) => {
      liveWinRateCache.delete(ticker);
      throw err;
    });
    liveWinRateCache.set(ticker, p);
  }
  return liveWinRateCache.get(ticker);
}
// 종목 상세용 승률 DB 항목 — 배치 DB는 S&P500·코스피200+코스닥150·ETF200·코인200만 담고 있어서, 그 밖의 종목(BTSG 같은 최근 상장·중소형주)은
// 12개월 카드·S리포트가 통째로 비었다(2026-09-13 사용자 지적) — 야후 월봉/주봉으로 같은 공식을 즉석 계산해 채움.
async function getDetailWrEntry(ticker, scoreMode) {
  const db = await getWinRateDb().catch(() => null);
  const wrMap = winRateMapForMode(db, ticker, scoreMode);
  let e = (wrMap && wrMap[ticker]) || null;
  if (!e) {
    e = await computeLiveWinRateEntry(ticker).catch(() => null);
    if (e && wrMap) wrMap[ticker] = e; // 같은 세션의 다른 화면도 이 값을 재사용
  }
  return e;
}
// 과거분석 12개월 카드를 "오늘 기준"으로(2026-10-19 사용자 요청) — 배치·실시간 계산 모두 이번 달은 아직 끝나지 않아 빼고 있어서
// 카드가 지난달에서 멈춰 있었다. 이번 달 1일부터 오늘까지의 등락(지난달 마지막 종가 → 현재가)을 마지막 칸으로 붙인다.
// DB가 지난달보다 더 오래된 경우엔 야후 월봉으로 그 자리에서 다시 계산한 값을 쓴다.
async function withCurrentMonthEntry(ticker, e) {
  if (!e || !Array.isArray(e.m12) || !e.m12.length) return e;
  try {
    const ch = await yahooChart(ticker, "3mo", "1d");
    const res = ch && ch.chart && ch.chart.result && ch.chart.result[0];
    if (!res) return e;
    const off = (res.meta && res.meta.gmtoffset) || 0;
    const closes = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
    const pts = (res.timestamp || []).map((t, i) => ({ key: new Date((t + off) * 1000).toISOString().slice(0, 7), c: closes[i] })).filter((p) => Number.isFinite(p.c) && p.c > 0);
    if (pts.length < 5) return e;
    const curKey = pts[pts.length - 1].key;
    const prev = [...pts].reverse().find((p) => p.key < curKey);
    const price = Number.isFinite(res.meta && res.meta.regularMarketPrice) ? res.meta.regularMarketPrice : pts[pts.length - 1].c;
    if (!prev || !(price > 0)) return e;
    const [cy, cm] = curKey.split("-").map(Number);
    const prevKey = new Date(Date.UTC(cy, cm - 2, 1)).toISOString().slice(0, 7); // 지난달
    let base = e;
    if (!e.to || String(e.to).slice(0, 7) < prevKey) base = (await computeLiveWinRateEntry(ticker).catch(() => null)) || e; // DB가 2달 이상 뒤처지면 실시간 계산
    if (!base.to || String(base.to).slice(0, 7) !== prevKey) return e; // 지난달까지 이어 붙일 수 없으면 그대로
    const mtd = Math.round((price / prev.c - 1) * 1000) / 10;
    const m12 = [...base.m12.filter((v) => Number.isFinite(v)).slice(-11), mtd];
    return { ...base, m12, to: curKey, mtd: true };
  } catch {
    return e;
  }
}
async function renderSummaryScoreRow(ticker, scoreMode = "stock") {
  const rowEl = el("summaryScoreRow");
  oxInlineWrap.innerHTML = ""; // 이전 종목 카드가 남지 않게
  try {
    const e = await withCurrentMonthEntry(ticker, await getDetailWrEntry(ticker, scoreMode));
    if (!e) {
      rowEl.innerHTML = "";
      return;
    }
    // (원판 3개 10년월간승률·연평균 상승·RSI는 2026-09-15 사용자 요청으로 삭제 — S리포트 요약 카드가 대신함)
    // 최근 12개월 승패(OX) 표 — m12(과거→최신 월간 등락%)가 있는 종목만
    let oxHtml = "";
    const m12 = Array.isArray(e.m12) ? e.m12.filter((v) => Number.isFinite(v)) : [];
    if (m12.length > 0) {
      const winCount = m12.filter((v) => v > 0).length;
      const sum = Math.round(m12.reduce((a, b) => a + b, 0));
      const winPct = Math.round((winCount / m12.length) * 100);
      // 2026-09-13 사용자 요청: 좌우 스크롤 없이 한 화면에 — 요약(승패·합계)은 위 한 줄로 빼고, 12칸을 화면 폭에 맞춰 균등 배치
      // 각 칸 위에 몇 월인지(2026-09-13 사용자 요청) — 배치 DB의 to(마지막 월봉 "YYYY-MM")에서 거꾸로 셈
      const toMatch = /^(\d{4})-(\d{2})/.exec(String(e.to || ""));
      const monthOf = (i) => {
        if (!toMatch) return null;
        const d = new Date(Number(toMatch[1]), Number(toMatch[2]) - 1 - (m12.length - 1 - i), 1);
        return { y: d.getFullYear(), m: d.getMonth() + 1 };
      };
      // 2026-09-13 사용자 요청("더 깔끔하고 현대적으로"): O/X 격자 대신 카드 + 요약 칩 + 기준선 위아래로 뻗는 월별 막대.
      // 막대 길이는 12개월 중 가장 크게 움직인 달 기준 비율, 오르면 위(상승색)·내리면 아래(하락색), 값은 막대 끝에 작게.
      const maxAbs = Math.max(...m12.map((v) => Math.abs(v)), 1);
      const fmtV = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}%`; // 2026-09-13 사용자 요청: 숫자에 % 직접 표기
      const cols = m12
        .map((v, i) => {
          const mo = monthOf(i);
          // 1월에는 연도를 붙여 해가 바뀌는 지점을 보여줌(예: 26.1)
          const isLast = i === m12.length - 1;
          const partial = isLast && e.mtd; // 이번 달은 오늘까지(진행 중)
          const moLabel = (mo ? (mo.m === 1 ? `${String(mo.y).slice(2)}.1` : `${mo.m}월`) : "") + (partial ? "*" : "");
          const h = Math.max(3, Math.round((Math.abs(v) / maxAbs) * 30)); // px — 칸(44px)에서 값 글자(12px)를 뺀 30px가 최대
          const up = v > 0;
          return `<div class="oxb-col${isLast ? " oxb-last" : ""}${partial ? " oxb-partial" : ""}" title="${moLabel}${partial ? "(오늘까지)" : ""} ${fmtV(v)}">
            <div class="oxb-half oxb-top">${up ? `<span class="oxb-val oxb-up">${fmtV(v)}</span><span class="oxb-bar oxb-up" style="height:${h}px"></span>` : ""}</div>
            <div class="oxb-half oxb-bottom">${up ? "" : `<span class="oxb-bar oxb-down" style="height:${h}px"></span><span class="oxb-val oxb-down">${fmtV(v)}</span>`}</div>
            <span class="oxb-month">${moLabel}</span>
          </div>`;
        })
        .join("");
      const firstMo = monthOf(0);
      const lastMo = monthOf(m12.length - 1);
      const rangeLabel = firstMo && lastMo ? `${String(firstMo.y).slice(2)}.${firstMo.m} – ${String(lastMo.y).slice(2)}.${lastMo.m}` : "";
      oxHtml = `
        <div class="oxb-card">
          <div class="oxb-head">
            <div class="oxb-title-wrap">
              <span class="oxb-title">최근 ${m12.length}개월</span>
              ${rangeLabel ? `<span class="oxb-range">${rangeLabel}</span>` : ""}
            </div>
            <div class="oxb-wr-big"><span>${m12.length}개월 승률:</span><b>${winPct}%</b></div>
          </div>
          <div class="oxb-subrow">
            <div class="oxb-chips">
              <span class="oxb-chip"><b class="oxb-up">${winCount}승</b><b class="oxb-down">${m12.length - winCount}패</b></span>
              <span class="oxb-chip">합계 <b class="${sum > 0 ? "oxb-up" : sum < 0 ? "oxb-down" : ""}">${sum > 0 ? "+" : ""}${sum}%</b></span>
            </div>
          </div>
          <div class="oxb-chart" style="grid-template-columns:repeat(${m12.length},1fr);">${cols}</div>
          ${e.mtd ? `<p class="oxb-note">* 이번 달은 1일부터 오늘까지의 등락이에요(진행 중).</p>` : ""}
        </div>`;
    }

    // 12개월 카드는 "🕰️ 과거분석" 버튼 자리(oxInlineWrap)에 채워 둠(2026-09-15)
    rowEl.innerHTML = "";
    oxInlineWrap.innerHTML = oxHtml;
  } catch {
    rowEl.innerHTML = "";
    oxInlineWrap.innerHTML = "";
  }
}

// fundamentals-timeseries 응답에서 통화 코드가 붙은 첫 항목을 찾아 재무제표의 보고 통화를 판별(연도별 공통값으로 가정)
function findReportCurrency(resultArr, keys) {
  for (const block of resultArr) {
    for (const key of keys) {
      const found = (block[key] || []).find((it) => it && it.currencyCode);
      if (found) return found.currencyCode;
    }
  }
  return null;
}

// ---------- 2. 재무정보: 년간/분기 세로 막대 차트(2026-09-15 사용자 요청 — 표·가로 막대·영업이익 삭제) ----------
// 노란 막대 = 매출액, 그 안 아래쪽 주황 = 순이익(주황 칸의 % = 매출 대비 순이익률). 막대 위 "00%상승" = 년간은 작년 대비, 분기는 전분기 대비.
// 막대를 누르면 검은 말풍선으로 매출액 금액. 마지막 점선 막대는 예상치(국내: 네이버 증권 컨센서스, 해외: 최근 추세 외삽 — 회사 공식 가이던스 아님).
// 년간 = 최근 실적 4개년 + 다음 해 예상, 분기 = 최근 4분기 + 다음 분기 가이던스.
// 연간 실적은 배치 DB(미국 SEC / 국내 DART) → 네이버 증권(국내 최신 연도) → Yahoo 순으로 빈 연도를 채움.
const FIN2_STATE = { token: 0, ticker: null, currency: null, period: "annual", cache: {} };

async function renderFinancials(ticker, quoteCurrency) {
  const token = ++FIN2_STATE.token;
  Object.assign(FIN2_STATE, { ticker, currency: quoteCurrency, period: "annual", cache: {} });
  await renderFin2Period(token);
}

function fin2ToggleHtml(period) {
  return `<div class="fin2-toggle" role="tablist">
    <button type="button" class="fin2-toggle-btn${period === "annual" ? " active" : ""}" data-fin-period="annual">년간</button>
    <button type="button" class="fin2-toggle-btn${period === "quarter" ? " active" : ""}" data-fin-period="quarter">분기</button>
  </div>`;
}

async function renderFin2Period(token) {
  const section = el("financialsSection");
  const { ticker, currency, period } = FIN2_STATE;
  const stale = () => token !== FIN2_STATE.token || period !== FIN2_STATE.period;
  section.innerHTML = fin2ToggleHtml(period) + `<p class="muted" style="padding:10px 0;">불러오는 중...</p>`;
  bindFin2Section(section);
  try {
    if (!FIN2_STATE.cache[period]) FIN2_STATE.cache[period] = period === "annual" ? loadFin2Annual(ticker, currency) : loadFin2QuarterDetail(ticker, currency);
    const data = await FIN2_STATE.cache[period];
    if (stale()) return;
    section.innerHTML = fin2ToggleHtml(period) + fin2BodyHtml(data, period, currency);
  } catch (err) {
    if (stale()) return;
    FIN2_STATE.cache[period] = null; // 실패는 캐시하지 않음 — 버튼을 다시 누르면 재시도
    section.innerHTML = fin2ToggleHtml(period) + `<p class="muted" style="padding:10px 0;">${period === "annual" ? "연간" : "분기"} 실적 데이터를 찾을 수 없습니다.</p>`;
  }
  bindFin2Section(section);
}

function bindFin2Section(section) {
  section.querySelectorAll(".fin2-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.finPeriod === FIN2_STATE.period) return;
      FIN2_STATE.period = btn.dataset.finPeriod;
      renderFin2Period(FIN2_STATE.token);
    });
  });
  // 막대를 누르면 그 막대 위에 매출액 말풍선 — 다시 누르거나 다른 막대를 누르면 옮겨감
  section.querySelectorAll(".fin2-col").forEach((col) => {
    col.addEventListener("click", () => {
      const wasActive = col.classList.contains("active");
      section.querySelectorAll(".fin2-col.active").forEach((c) => c.classList.remove("active"));
      if (!wasActive) col.classList.add("active");
    });
  });
}

// 네이버 증권 연간 재무(finance/annual) — 분기 API와 같은 형식(억원 문자열), 마지막 열이 다음 해 컨센서스
async function fetchNaverAnnualFinance(ticker) {
  const code = ticker.replace(/\.(KS|KQ)$/, "");
  const data = await proxyFetchJson(`https://m.stock.naver.com/api/stock/${code}/finance/annual`);
  const info = data && data.financeInfo;
  if (!info || !Array.isArray(info.trTitleList) || !Array.isArray(info.rowList)) throw new Error("네이버 연간 재무 응답 형식이 다릅니다.");
  const rowByTitle = {};
  info.rowList.forEach((row) => {
    rowByTitle[row.title] = row.columns || {};
  });
  const parseVal = (col) => {
    const s = col && col.value;
    if (s === null || s === undefined || s === "" || s === "-") return null;
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n * 1e8 : null;
  };
  return info.trTitleList.map((t) => ({
    year: Number(String(t.key).slice(0, 4)),
    isConsensus: t.isConsensus === "Y",
    rev: parseVal((rowByTitle["매출액"] || {})[t.key]),
    ni: parseVal((rowByTitle["당기순이익"] || {})[t.key]),
  }));
}

// 성장률 목록 채우기 — 앞 항목 매출이 양수일 때만
function fin2WithGrowth(items, prevRev) {
  return items.map((it, i) => {
    const base = i === 0 ? prevRev : items[i - 1].rev;
    const growth = Number.isFinite(base) && base > 0 && Number.isFinite(it.rev) ? ((it.rev - base) / base) * 100 : null;
    return { ...it, growth };
  });
}

async function loadFin2Annual(ticker, currency) {
  const isKr = isKrTicker(ticker);
  const [db, yahoo, naver] = await Promise.all([
    getAnnualFinDb(isKr).catch(() => null),
    yahooFundamentals(ticker, "annualTotalRevenue,annualNetIncome").catch(() => null),
    isKr ? fetchNaverAnnualFinance(ticker).catch(() => null) : Promise.resolve(null),
  ]);

  const byYear = new Map(); // 회계연도(결산일의 연도) → { rev, ni }
  const fill = (year, rev, ni) => {
    if (!Number.isFinite(year)) return;
    const cur = byYear.get(year) || { rev: null, ni: null };
    if (cur.rev === null && Number.isFinite(rev)) cur.rev = rev;
    if (cur.ni === null && Number.isFinite(ni)) cur.ni = ni;
    byYear.set(year, cur);
  };

  // Yahoo는 보고 통화가 시세 통화와 다를 수 있어(TSM 등) 환산 — 이런 종목은 SEC 배치 값의 통화를 믿기 어려워 배치를 건너뜀
  const resultArr = yahoo && yahoo.timeseries && yahoo.timeseries.result;
  const reportCurrency = resultArr ? findReportCurrency(resultArr, ["annualTotalRevenue", "annualNetIncome"]) : null;
  const foreignReport = !!(reportCurrency && currency && reportCurrency !== currency);

  let source = "Yahoo";
  const dbItem = !foreignReport && db && db.items && db.items[ticker];
  if (dbItem && dbItem.years) {
    Object.entries(dbItem.years).forEach(([y, v]) => fill(Number(String(v.end || y).slice(0, 4)), v.rev, v.ni));
    source = isKr ? "DART 전자공시" : "SEC 공시";
  }
  const naverActual = (naver || []).filter((n) => !n.isConsensus);
  naverActual.forEach((n) => fill(n.year, n.rev, n.ni));
  if (naverActual.length && !dbItem) source = "네이버 증권";
  if (resultArr) {
    const fxRate = foreignReport ? await getFxRate(reportCurrency, currency) : 1;
    const conv = (raw) => (Number.isFinite(raw) && fxRate !== null ? raw * fxRate : null);
    const yRev = new Map();
    const yNi = new Map();
    resultArr.forEach((block) => {
      (block.annualTotalRevenue || []).forEach((it) => it && it.asOfDate && yRev.set(Number(it.asOfDate.slice(0, 4)), conv(it.reportedValue?.raw)));
      (block.annualNetIncome || []).forEach((it) => it && it.asOfDate && yNi.set(Number(it.asOfDate.slice(0, 4)), conv(it.reportedValue?.raw)));
    });
    new Set([...yRev.keys(), ...yNi.keys()]).forEach((y) => fill(y, yRev.get(y), yNi.get(y)));
  }

  const years = [...byYear.keys()].filter((y) => Number.isFinite(byYear.get(y).rev)).sort((a, b) => a - b);
  if (!years.length) throw new Error("연간 실적 없음");
  const shownYears = years.slice(-4);
  const prevYear = years[years.length - shownYears.length - 1];
  const actual = fin2WithGrowth(
    shownYears.map((y) => ({ label: String(y), rev: byYear.get(y).rev, ni: byYear.get(y).ni, est: false })),
    prevYear !== undefined ? byYear.get(prevYear).rev : null
  );

  // 다음 해 예상: 국내는 네이버 컨센서스, 없거나 해외면 최근 실적 추세 외삽
  const lastYear = shownYears[shownYears.length - 1];
  const consensus = (naver || []).find((n) => n.isConsensus && n.year === lastYear + 1 && Number.isFinite(n.rev));
  let estSource = null;
  let est = null;
  if (consensus) {
    est = { label: String(lastYear + 1), rev: consensus.rev, ni: consensus.ni, est: true };
    estSource = "컨센서스";
  } else if (actual.length >= 2) {
    const rev = projectNextQuarter(actual, "rev");
    if (Number.isFinite(rev) && rev > 0) {
      est = { label: String(lastYear + 1), rev, ni: projectNextNetIncome(actual, rev), est: true };
      estSource = "추세 예상";
    }
  }
  const bars = est ? [...actual, ...fin2WithGrowth([est], actual[actual.length - 1].rev)] : actual;
  return { bars, source, estSource };
}

function fin2QuarterLabel(year, month) {
  return `${String(year).slice(2)}.${Math.ceil(month / 3)}Q`;
}

// 2026-10-08 사용자 요청: 실적이 나오면 재무정보 분기 그래프에 바로 — 분기 재무(야후·네이버)는 10-Q·분기보고서 뒤라 몇 주 늦어서
// 실적 일정 데이터의 발표 당일 값(미국 야후 실적 요약 · 한국 DART 잠정실적)으로 새 분기 막대를 붙이고 다음 분기 예상을 다시 낸다
async function loadFin2QuarterLive(ticker, currency) {
  const data = await loadFin2Quarter(ticker, currency);
  await getEarningsCal();
  const e = earningsEntry(ticker);
  const rep = e && e.rep;
  if (!data || !data.bars || !rep || !Number.isFinite(rep.rev) || (isKrTicker(ticker) ? "KRW" : "USD") !== currency) return data;
  const actual = data.bars.filter((b) => !b.est);
  const last = actual[actual.length - 1];
  const lastEnd = last && earnQuarterEnd(last.label);
  const rel = new Date(rep.date + "T00:00:00");
  const due = new Date(rel.getFullYear(), Math.floor(rel.getMonth() / 3) * 3, 0);
  if (!last || (lastEnd && lastEnd >= due)) return data; // 이미 분기 재무에 들어와 있음
  const nbLabel = fin2QuarterLabel(due.getFullYear(), due.getMonth() + 1);
  const nb = { label: nbLabel, rev: rep.rev, ni: Number.isFinite(rep.ni) ? rep.ni : await krActualNiFor(ticker, nbLabel), est: false, prelim: rep.src === "잠정" ? "잠정" : "실제" };
  const all = [...actual.map(({ growth, ...b }) => b), nb];
  const shown = fin2WithGrowth(all.slice(-4), all.length > 4 ? all[all.length - 5].rev : null);
  const estRev = projectNextQuarter(shown, "rev");
  const nx = new Date(due.getFullYear(), due.getMonth() + 3, 1);
  const est = Number.isFinite(estRev) && estRev > 0 ? fin2WithGrowth([{ label: fin2QuarterLabel(nx.getFullYear(), nx.getMonth() + 1), rev: estRev, ni: projectNextNetIncome(shown, estRev), est: true }], nb.rev) : [];
  return { ...data, bars: [...shown, ...est], estSource: "추세 예상", source: `${data.source} · 최근 분기는 ${rep.src === "잠정" ? "DART 잠정실적" : "실적 발표(야후)"}` };
}
// 2026-10-22 사용자 요청: 검색상세 분기 그래프 — 가장 최근에 발표된 분기는 예상·실제를 함께(실적 페이지의 비교 그래프), 못 만들면 기존 분기 그래프
async function loadFin2QuarterDetail(ticker, currency) {
  try {
    await getEarningsCal();
    const e = earningsEntry(ticker);
    if (e && e.last && (isKrTicker(ticker) ? "KRW" : "USD") === currency) {
      const cmp = await earnCompareData(ticker, e.last);
      const act = cmp && cmp.bars.find((b) => !b.est && b.prelim);
      const aEnd = act && earnQuarterEnd(act.label);
      const rel = new Date(e.last + "T00:00:00");
      const due = new Date(rel.getFullYear(), Math.floor(rel.getMonth() / 3) * 3, 0);
      // 발표일 직전에 끝난 분기와 같은 분기여야 함(오래된 발표일이 새 분기에 잘못 붙는 것 방지)
      if (cmp && aEnd && Math.abs(aEnd - due) < 45 * 86400000) return cmp;
    }
  } catch {}
  return loadFin2QuarterLive(ticker, currency);
}
async function loadFin2Quarter(ticker, currency) {
  // 국내: 네이버 증권 분기 재무(최신 분기 실적 + 다음 분기 애널리스트 컨센서스) — 실패하면 Yahoo
  if (isKrTicker(ticker)) {
    try {
      const all = await fetchNaverQuarterlyFinance(ticker);
      const actuals = all.filter((q) => !q.isConsensus && Number.isFinite(q.revenue));
      if (actuals.length) {
        const shown = actuals.slice(-4);
        const prev = actuals[actuals.length - shown.length - 1];
        const toBar = (q, isEst) => ({ label: fin2QuarterLabel(Number(q.key.slice(0, 4)), Number(q.key.slice(4, 6))), rev: q.revenue, ni: q.net, est: isEst });
        const actual = fin2WithGrowth(shown.map((q) => toBar(q, false)), prev ? prev.revenue : null);
        const lastKey = shown[shown.length - 1].key;
        const consensus = all.find((q) => q.isConsensus && q.key > lastKey && Number.isFinite(q.revenue));
        let est = consensus ? toBar(consensus, true) : null;
        let estSource = consensus ? "컨센서스" : null;
        if (!est && actual.length >= 2) {
          const y = Number(lastKey.slice(0, 4));
          const m = Number(lastKey.slice(4, 6)) + 3;
          const estRev = projectNextQuarter(actual, "rev");
          est = { label: fin2QuarterLabel(m > 12 ? y + 1 : y, m > 12 ? m - 12 : m), rev: estRev, ni: projectNextNetIncome(actual, estRev), est: true };
          estSource = "추세 예상";
        }
        const bars = est && Number.isFinite(est.rev) ? [...actual, ...fin2WithGrowth([est], actual[actual.length - 1].rev)] : actual;
        return { bars, source: "네이버 증권", estSource };
      }
    } catch {
      // Yahoo로 폴백
    }
  }

  const data = await yahooFundamentals(ticker, "quarterlyTotalRevenue,quarterlyNetIncome");
  const resultArr = data && data.timeseries && data.timeseries.result;
  if (!resultArr || !resultArr.length) throw new Error("분기 실적 없음");
  const reportCurrency = findReportCurrency(resultArr, ["quarterlyTotalRevenue", "quarterlyNetIncome"]);
  const fxRate = reportCurrency && currency && reportCurrency !== currency ? await getFxRate(reportCurrency, currency) : 1;
  const conv = (raw) => (Number.isFinite(raw) && fxRate !== null ? raw * fxRate : null);
  const byDate = {};
  resultArr.forEach((block) => {
    (block.quarterlyTotalRevenue || []).forEach((it) => {
      if (it && it.asOfDate) (byDate[it.asOfDate] = byDate[it.asOfDate] || {}).rev = conv(it.reportedValue?.raw);
    });
    (block.quarterlyNetIncome || []).forEach((it) => {
      if (it && it.asOfDate) (byDate[it.asOfDate] = byDate[it.asOfDate] || {}).ni = conv(it.reportedValue?.raw);
    });
  });
  const dates = Object.keys(byDate)
    .filter((d) => Number.isFinite(byDate[d].rev))
    .sort();
  if (!dates.length) throw new Error("분기 실적 없음");
  const shown = dates.slice(-4);
  const prevDate = dates[dates.length - shown.length - 1];
  const toLabel = (d) => fin2QuarterLabel(Number(d.slice(0, 4)), Number(d.slice(5, 7)));
  const actual = fin2WithGrowth(
    shown.map((d) => ({ label: toLabel(d), rev: byDate[d].rev, ni: Number.isFinite(byDate[d].ni) ? byDate[d].ni : null, est: false })),
    prevDate ? byDate[prevDate].rev : null
  );
  let bars = actual;
  if (actual.length >= 2) {
    const nextDate = addMonths(new Date(shown[shown.length - 1] + "T00:00:00"), 3);
    const rev = projectNextQuarter(actual, "rev");
    if (Number.isFinite(rev) && rev > 0) {
      const est = { label: fin2QuarterLabel(nextDate.getFullYear(), nextDate.getMonth() + 1), rev, ni: projectNextNetIncome(actual, rev), est: true };
      bars = [...actual, ...fin2WithGrowth([est], actual[actual.length - 1].rev)];
    }
  }
  return { bars, source: "Yahoo Finance", estSource: bars.length > actual.length ? "추세 예상" : null };
}

function fin2GrowthText(g) {
  if (!Number.isFinite(g)) return "";
  const r = Math.round(Math.abs(g));
  return g >= 0 ? `${r}%상승` : `${r}%하락`;
}
function fin2BodyHtml(data, period, currency) {
  const { bars, source, estSource } = data;
  const actual = bars.filter((b) => !b.est);
  const last = actual[actual.length - 1];
  const estBar = bars.find((b) => b.est) || null;
  const isAnnual = period === "annual";

  // 요약(2026-09-15 사용자 요청 5차): 회색 한 줄 3칸 — 작년 매출 · 올해 매출 예상 · 작년 대비 올해 증가 %
  //   분기 보기는 최근 분기 매출 · 다음 분기 예상 · 직전 분기 대비 증가 %(컨센서스 또는 추세 예상 기준)
  const signedPct = (g) => (Number.isFinite(g) ? `${g >= 0 ? "+" : "−"}${Math.abs(g).toFixed(1)}%` : "—");
  const toneCls = (g) => (Number.isFinite(g) ? (g >= 0 ? "fin2-up" : "fin2-down") : "");
  const amt = (v) => (Number.isFinite(v) ? escapeHtml(fmtAmountUnified(v, currency)) : "—");
  const estGrowth = estBar && Number.isFinite(estBar.growth) ? estBar.growth : null;
  // 실적발표 탭 '발표' 종목(2026-10-08): 그 분기 예상 막대 바로 오른쪽에 실제 막대 — 요약도 예상 · 실제 · 예상 대비
  const summaryHtml = data.compare && estBar
    ? `
    <div class="fin2-strip">
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">예상 매출 <small>${escapeHtml(estBar.label)}</small></span>
        <b class="fin2-strip-value">${amt(estBar.rev)}</b>
      </div>
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">실제 매출</span>
        <b class="fin2-strip-value">${amt(last.rev)}</b>
      </div>
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">예상 대비</span>
        <b class="fin2-strip-value ${toneCls((last.rev / estBar.rev - 1) * 100)}">${signedPct((last.rev / estBar.rev - 1) * 100)}</b>
      </div>
    </div>`
    : `
    <div class="fin2-strip">
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">${isAnnual ? `작년 매출 <small>${escapeHtml(last.label)}</small>` : `최근 분기 <small>${escapeHtml(last.label)}</small>`}</span>
        <b class="fin2-strip-value">${amt(last.rev)}</b>
      </div>
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">${isAnnual ? "올해 매출 예상" : "다음 분기 예상"}</span>
        <b class="fin2-strip-value">${estBar ? amt(estBar.rev) : "—"}</b>
      </div>
      <div class="fin2-strip-item">
        <span class="fin2-strip-label">${isAnnual ? "작년 대비 올해" : "직전 분기 대비"}</span>
        <b class="fin2-strip-value ${toneCls(estGrowth)}">${signedPct(estGrowth)}</b>
      </div>
    </div>`;

  // 막대: 가장 큰 매출이 그림 영역의 78%가 되도록(위에 "00%상승"·말풍선 자리)
  const PLOT_H = 190;
  const maxRev = Math.max(...bars.map((b) => (Number.isFinite(b.rev) ? b.rev : 0)), 1);
  // 순손실(2026-09-16 사용자 요청): 매출 막대 높이에서 손실률만큼 아래로 — 예) −28%면 그 해 매출 막대 높이의 28%
  //   손실률이 100%를 넘으면 매출 막대와 같은 길이까지만(차트가 아래로 끝없이 늘어나지 않게)
  let hasNeg = false;
  let maxNegPx = 0;
  // 막대 하나(매출 막대 + 순이익 + 순이익률) — 비교 칸에서는 반쪽 폭으로 둘을 붙여 그린다
  const barParts = (b) => {
    const barPx = Number.isFinite(b.rev) && b.rev > 0 ? Math.max(4, (b.rev / maxRev) * PLOT_H * 0.78) : 4;
    const margin = Number.isFinite(b.ni) && Number.isFinite(b.rev) && b.rev > 0 ? (b.ni / b.rev) * 100 : null;
    const niPx = margin !== null && margin > 0 ? Math.min(barPx, (barPx * margin) / 100) : 0;
    const negPx = margin !== null && margin < 0 ? Math.max(3, Math.min(barPx, (barPx * -margin) / 100)) : 0;
    if (negPx) {
      hasNeg = true;
      maxNegPx = Math.max(maxNegPx, negPx);
    }
    let marginHtml = "";
    if (margin !== null) {
      const txt = `${Math.round(margin)}%`;
      // 순손실(2026-09-16 사용자 요청): 기준선 아래 검회색 막대 + 그 아래에 파란색 마이너스 %
      if (margin < 0) marginHtml = `<div class="fin2-ni-neg" style="height:${negPx.toFixed(1)}px"><span class="fin2-neg-label">${txt}</span></div>`;
      else if (margin === 0) marginHtml = `<span class="fin2-margin fin2-margin-zero" style="bottom:3px">${txt}</span>`;
      else if (niPx >= 17) marginHtml = `<span class="fin2-margin fin2-margin-in" style="bottom:${Math.max(2, niPx - 16).toFixed(0)}px">${txt}</span>`;
      else if (barPx - niPx >= 17) marginHtml = `<span class="fin2-margin fin2-margin-out" style="bottom:${(niPx + 1).toFixed(0)}px">${txt}</span>`;
    }
    return { barPx, niPx, inner: `${niPx > 0 ? `<div class="fin2-ni" style="height:${niPx.toFixed(1)}px"></div>` : ""}${marginHtml}` };
  };
  const colHtml = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const nx = bars[i + 1];
    // 2026-10-08 사용자 요청: 같은 분기 예상 + 실제는 한 칸에 반씩(왼쪽 예상 · 오른쪽 실제), 아래 "26.3Q 예상/실적"
    if (data.compare && b.est && !b.nextEst && nx && !nx.est && nx.label === b.label) {
      const e = barParts(b);
      const a = barParts(nx);
      // 2026-10-20 사용자 요청: 순이익 점선이 실제 주황 막대와 같은 높이로 겹쳐 보이던 문제 — 예상 순이익도 주황 막대와 같은 기준(막대 안 % = 순이익률)으로,
      // 실제 매출 막대 높이 × 예상 순이익률 위치에 그린다(예상 매출 점선은 그대로 예상 매출 높이). 예: 실제 17% · 예상 10% → 점선이 주황 막대보다 낮게
      const expMargin = Number.isFinite(b.ni) && Number.isFinite(b.rev) && b.rev > 0 ? (b.ni / b.rev) * 100 : null;
      const expNiPx = expMargin !== null && expMargin > 0 ? Math.min(a.barPx, (a.barPx * expMargin) / 100) : 0;
      const top = Math.max(e.barPx, a.barPx);
      const g = (v) => (Number.isFinite(v) ? `${Math.abs(v) < 0.5 ? "0%" : `${Math.round(Math.abs(v))}%`}${v >= 0 ? "↑" : "↓"}` : "-");
      // 2026-10-08 사용자 요청(반으로 자르니 이상함): 실적 막대 하나만, 예상은 매출·순이익 높이에 빨간 가로 점선
      colHtml.push(`
        <div class="fin2-col fin2-pair" title="${escapeHtml(`${b.label} 예상 ${fmtAmountUnified(b.rev, currency)} · 실적 ${fmtAmountUnified(nx.rev, currency)}`)}">
          <div class="fin2-plot" style="height:${PLOT_H}px">
            ${(() => {
              // 2026-10-19 사용자 요청: 예상·실제 중 더 높은 값이 위로(예상이 더 높고 실제가 낮으면 예상이 위, 실제가 아래)
              const expH = `<em>예상 ${fin2GrowthText(b.growth) || "-"}</em>`;
              const actH = `<b class="${nx.growth >= 0 ? "fin2-up" : "fin2-down"}">실제 ${fin2GrowthText(nx.growth) || "-"}</b>`;
              const actFirst = Number.isFinite(nx.growth) && (!Number.isFinite(b.growth) || nx.growth > b.growth);
              return `<span class="fin2-pair-growth" style="bottom:${(top + 4).toFixed(0)}px">${actFirst ? actH + expH : expH + actH}</span>`;
            })()}
            ${(() => {
              // 2026-10-19 사용자 요청: 순이익률(예상/실제)은 주황 막대·빨간 점선과 겹치지 않게 그 바로 위(노란 막대 안쪽)에
              // 2026-10-20 사용자 요청: 실제 순이익이 아직 공시 전(예: 잠정실적에 순이익이 없는 회사)이면 "-" 대신 "미공시"
              const m = (x) => (Number.isFinite(x.ni) && x.rev > 0 ? `${Math.round((x.ni / x.rev) * 100)}%` : x === nx ? "확정 전" : "-");
              const niTop = Math.max(a.niPx || 0, expNiPx || 0); // 실제·예상 순이익 중 더 높은 쪽(주황 막대·빨간 점선) 위로
              const mv = (x) => (Number.isFinite(x.ni) && x.rev > 0 ? x.ni / x.rev : null);
              const actFirst = mv(nx) !== null && (mv(b) === null || mv(nx) > mv(b));
              const lines = actFirst ? [`실제 ${m(nx)}`, `예상 ${m(b)}`] : [`예상 ${m(b)}`, `실제 ${m(nx)}`];
              // 2026-10-22 사용자 요청: 순이익률이 50% 이상이면 막대 윗선이 위의 "%상승" 글씨와 겹치므로 선 아래(막대 안쪽)에 적는다
              const high = Math.max(mv(nx) ?? 0, mv(b) ?? 0) >= 0.5;
              const bottomPx = high ? Math.max(2, niTop - 30) : niTop + 4;
              return `<span class="fin2-pair-margin${high ? " fin2-pair-margin-in" : ""}" style="bottom:${bottomPx.toFixed(0)}px">${lines.join("<br>")}</span>`;
            })()}
            <span class="fin2-tip">예상 ${escapeHtml(fmtAmountUnified(b.rev, currency))}<br>실적 ${escapeHtml(fmtAmountUnified(nx.rev, currency))}</span>
            <div class="fin2-bar" style="height:${a.barPx.toFixed(1)}px">${a.niPx > 0 ? `<div class="fin2-ni" style="height:${a.niPx.toFixed(1)}px"></div>` : ""}</div>
            <i class="fin2-exp-line" style="bottom:${e.barPx.toFixed(1)}px" title="예상 매출"></i>
            ${expNiPx > 0 ? `<i class="fin2-exp-line fin2-exp-ni" style="bottom:${expNiPx.toFixed(1)}px" title="예상 순이익률"></i>` : ""}
          </div>
          <span class="fin2-xlabel">${escapeHtml(b.label)}<small>실제</small></span>
        </div>`);
      i++;
      continue;
    }
    // 2026-10-22 사용자 요청: 다음 분기 예상은 점선·'예상' 글자 없이 그냥 막대와 %만 — 아래 일반 막대 그리기로 처리
    const { barPx, inner } = barParts(b);
    const growthTxt = fin2GrowthText(b.growth);
    colHtml.push(`
        <div class="fin2-col${b.est ? " est" : ""}" title="${escapeHtml(`${b.label}${b.est ? " 예상" : ""} 매출 ${fmtAmountUnified(b.rev, currency)}`)}">
          <div class="fin2-plot" style="height:${PLOT_H}px">
            <div class="fin2-bar" style="height:${barPx.toFixed(1)}px">
              ${growthTxt ? `<span class="fin2-growth ${b.growth >= 0 ? "fin2-up" : "fin2-down"}">${growthTxt}</span>` : ""}
              <span class="fin2-tip">${escapeHtml(fmtAmountUnified(b.rev, currency))}</span>
              ${inner}
            </div>
          </div>
          <span class="fin2-xlabel">${escapeHtml(b.label)}${!b.est && b.prelim ? `<small>${escapeHtml(b.prelim)}</small>` : ""}</span>
        </div>`);
  }
  const cols = colHtml.join("");

  const estNote = estBar
    ? estSource === "컨센서스"
      ? ` 마지막 막대는 증권사 컨센서스(전망 평균)입니다.`
      : ` 마지막 막대는 최근 실적 추세로 계산한 값이며 회사 공식 가이던스가 아닙니다.`
    : "";
  return `
    ${summaryHtml}
    <div class="fin2-legend">
      <span><i class="fin2-dot fin2-dot-rev"></i>매출액</span>
      <span><i class="fin2-dot fin2-dot-ni"></i>순이익 <em>(막대 안 % = 순이익률)</em></span>
    </div>
    <div class="fin2-chart${hasNeg ? " has-neg" : ""}" style="grid-template-columns:repeat(${colHtml.length},1fr);--fin2-neg-space:${Math.round(maxNegPx + 20)}px">${cols}</div>
    <p class="fin2-caption">막대를 누르면 매출액이 표시됩니다. 막대 위 %는 ${isAnnual ? "작년" : "전분기"} 대비 매출 증감입니다.${data.compare ? " 최근 실적 칸의 빨간 점선은 발표 전 예상(매출액·순이익), 막대는 실제입니다." : ""}${estNote} 출처: ${escapeHtml(source)}.</p>`;
}

// ---------- 2+. 최근 분기 실적(최근 3개) + 다음 분기 가이던스(1개) ----------
// ⚠️ Yahoo의 quoteSummary(earningsHistory/earningsTrend/calendarEvents)와 v7/finance/quote는 최근 "Invalid Crumb"
// 인증 요구로 이 앱의 무인증 프록시로는 접근이 막혀 있어(실제 발표일·애널리스트 컨센서스를 제공하는 유일한 소스),
// 실제 기업 가이던스·컨센서스 추정치를 가져올 방법이 없음. 대신 fundamentals-timeseries(무인증, 정상 동작)의
// 분기별 매출/순이익 실적만으로 4번째(다음 분기) 막대를 "최근 분기 대비 성장률 기반 추정치"로 계산해 표시하고,
// 발표일도 정확한 발표일이 아닌 회계분기 마감일(asOfDate)로 표시 — 라벨과 캡션에 명확히 "추정" 표기해 오해를 방지함.
// 예상 막대의 순이익(2026-09-16 사용자 지적 "마이크론 분기 순이익률이 90%가 넘는다"):
// 매출과 순이익을 각각 따로 외삽하면 순이익 증가율이 매출 증가율보다 높을 때 순이익률이 92%처럼 비현실적으로 튄다.
// 예상 매출에 "가장 최근 실적의 순이익률"을 그대로 적용해 마진이 유지된다고 본다(적자면 적자율 유지).
function projectNextNetIncome(actual, estRev) {
  if (!Number.isFinite(estRev)) return null;
  const last = [...actual].reverse().find((b) => Number.isFinite(b.ni) && Number.isFinite(b.rev) && b.rev > 0);
  if (!last) return null;
  return estRev * (last.ni / last.rev);
}

function projectNextQuarter(quarters, key) {
  const vals = quarters.map((q) => q[key]).filter((v) => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  const growthRates = [];
  for (let i = 1; i < vals.length; i++) {
    if (vals[i - 1]) growthRates.push((vals[i] - vals[i - 1]) / Math.abs(vals[i - 1]));
  }
  const avgGrowth = growthRates.length ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;
  return vals[vals.length - 1] * (1 + avgGrowth);
}

// 금액 표기 통일(2026-08-31 사용자 규칙): 원화는 1조 이상 → "000.0조", 그 미만 → "0000억"(소수점 없음). 그 외 통화는 기존 축약 표기
function fmtAmountUnified(v, currency) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "N/A";
  if (currency === "KRW") {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
    return `${Math.round(v / 1e8).toLocaleString()}억`;
  }
  return fmtCompactCurrency(v, currency);
}

// ---------- 국내 종목 분기 실적: 네이버 증권 finance/quarter API(2026-09-02 사용자 요청 "가이던스 정확히") ----------
// Yahoo fundamentals-timeseries는 국내 종목의 최신 분기가 1~2분기 늦게 반영되고 간혹 이상치(영업이익=매출 등)가 섞이며,
// 예측도 단순 추세 외삽뿐. 네이버 증권 분기 재무는 최신 분기까지 실적이 정확하고 다음 분기 "애널리스트 컨센서스"까지
// 제공하므로 국내 종목은 이걸 사용(값 단위: 억원 문자열 → 원화 환산). 실패 시 기존 Yahoo 방식으로 자동 폴백.
async function fetchNaverQuarterlyFinance(ticker) {
  const code = ticker.replace(/\.(KS|KQ)$/, "");
  const data = await proxyFetchJson(`https://m.stock.naver.com/api/stock/${code}/finance/quarter`);
  const info = data && data.financeInfo;
  if (!info || !Array.isArray(info.trTitleList) || !Array.isArray(info.rowList)) throw new Error("네이버 분기 재무 응답 형식이 다릅니다.");
  const rowByTitle = {};
  info.rowList.forEach((row) => {
    rowByTitle[row.title] = row.columns || {};
  });
  const parseVal = (col) => {
    const s = col && col.value;
    if (s === null || s === undefined || s === "" || s === "-") return null;
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n * 1e8 : null; // 억원 → 원
  };
  return info.trTitleList.map((t) => ({
    key: t.key, // "202606"
    isConsensus: t.isConsensus === "Y",
    revenue: parseVal((rowByTitle["매출액"] || {})[t.key]),
    op: parseVal((rowByTitle["영업이익"] || {})[t.key]),
    net: parseVal((rowByTitle["당기순이익"] || {})[t.key]),
  }));
}

// 뉴스 날짜를 "1시간전"·"20시간전"·"1일전"처럼, 출처는 주소가 아니라 신문사 이름으로(2026-10-21 사용자 요청)
function newsAgoText(sec) {
  if (!sec) return "";
  const m = Math.max(0, Math.floor((Date.now() / 1000 - sec) / 60));
  if (m < 60) return `${Math.max(1, m)}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}일전` : `${Math.floor(d / 30)}개월전`;
}
// Bing 뉴스처럼 출처가 도메인으로만 오는 경우를 신문사 한글 이름으로
const NEWS_KO_SOURCES = {
  "chosun.com": "조선일보", "joongang.co.kr": "중앙일보", "donga.com": "동아일보", "hani.co.kr": "한겨레", "khan.co.kr": "경향신문", "hankookilbo.com": "한국일보",
  "mk.co.kr": "매일경제", "hankyung.com": "한국경제", "sedaily.com": "서울경제", "edaily.co.kr": "이데일리", "mt.co.kr": "머니투데이", "fnnews.com": "파이낸셜뉴스",
  "asiae.co.kr": "아시아경제", "heraldcorp.com": "헤럴드경제", "etnews.com": "전자신문", "zdnet.co.kr": "지디넷코리아", "newsis.com": "뉴시스", "yna.co.kr": "연합뉴스",
  "yonhapnews.co.kr": "연합뉴스", "news1.kr": "뉴스1", "kbs.co.kr": "KBS", "mbc.co.kr": "MBC", "sbs.co.kr": "SBS", "ytn.co.kr": "YTN", "jtbc.co.kr": "JTBC",
  "biz.chosun.com": "조선비즈", "thebell.co.kr": "더벨", "inews24.com": "아이뉴스24", "busan.com": "부산일보", "imaeil.com": "매일신문", "segye.com": "세계일보",
  "munhwa.com": "문화일보", "kmib.co.kr": "국민일보", "seoul.co.kr": "서울신문", "nocutnews.co.kr": "노컷뉴스", "ohmynews.com": "오마이뉴스", "pressian.com": "프레시안",
  "bloter.net": "블로터", "dt.co.kr": "디지털타임스", "ajunews.com": "아주경제", "businesspost.co.kr": "비즈니스포스트", "thelec.kr": "디일렉", "naver.com": "네이버뉴스",
};
function newsSourceName(n) {
  const p = String(n.publisher || "").trim();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(p)) {
    const host = p.replace(/^www\./i, "").toLowerCase();
    const hit = Object.keys(NEWS_KO_SOURCES).find((k) => host === k || host.endsWith("." + k));
    if (hit) return NEWS_KO_SOURCES[hit];
    return n.isKorean ? host.split(".")[0] : host; // 알려진 신문사가 아니면 도메인 첫 마디
  }
  return p || "출처 미상";
}
// ---------- 4. 주요 뉴스: 최근 1개월 이내, 최대 10건 ----------
// containerEl을 받을 수 있게 해서(기본값 newsSection) 원자재/채권/외환 상세페이지(assetDetailNews)에서도 재사용
async function renderNews(searchData, containerEl = el("newsSection")) {
  containerEl.innerHTML = `<p class="muted">불러오는 중...</p>`;

  const allNews = (searchData && searchData.news) || [];
  const oneMonthAgoSec = Date.now() / 1000 - 30 * 86400;
  const news = allNews
    .filter((n) => !n.providerPublishTime || n.providerPublishTime >= oneMonthAgoSec)
    .slice(0, 10);

  if (news.length === 0) {
    containerEl.innerHTML = `<p class="muted">최근 1개월 이내 뉴스를 찾을 수 없습니다.</p>`;
    return;
  }

  // 국내 기사(isKorean, 구글 뉴스 RSS)는 이미 한국어라 자동번역·"원문" 줄을 건너뜀
  const translatedTitles = await Promise.all(
    news.map((n) => (n.isKorean ? Promise.resolve(n.title || "") : translateToKorean(n.title || "").catch(() => n.title || "")))
  );

  const items = news
    .map((n, i) => {
      const ago = newsAgoText(n.providerPublishTime);
      const src = newsSourceName(n);
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      return `
      <div class="news-item">
        <div class="news-title"><a href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a></div>
        <div class="news-meta">${escapeHtml(ago)}${ago && src ? " · " : ""}${escapeHtml(src)}</div>
        ${n.isKorean ? "" : `<div class="news-original">원문: ${escapeHtml(n.title || "")}</div>`}
      </div>`;
    })
    .join("");

  const isAllKorean = news.every((n) => n.isKorean);
  containerEl.innerHTML = `
    ${items}
    <p class="muted" style="font-size:12px;margin-top:8px;">${isAllKorean ? "※ 구글 뉴스에서 해당 기업명으로 검색된 국내 기사입니다." : "※ 제목은 자동 번역되었으며, 본문 요약은 제공되지 않습니다."} 최근 1개월 이내 기사 최대 10건입니다.</p>
  `;
}

// ---------- 6-3. 승률점수(2026-09-02 사용자 요청): 최근 10년(최대 120개월) 월봉 종가 기준 상승 개월수/총 개월수*100 ----------
// 데이터는 sector-map/scripts/fetch-winrate-scores.ps1이 생성한 정적 DB(data/winrate-scores-us.json, S&P500 전용).
// DB에 없는 종목(국내 주식·ETF·코인 등)은 섹션째 숨긴다. 상장 10년 미만 종목은 상장(데이터 시작) 후 개월수만으로 계산돼 있음.
let winRateDbPromise = null;
let winRateDbGeneratedAt = null; // 배치 생성 시각 — 인기종목 표의 -5M~-1M이 실제로 몇 월인지 안내할 때 사용
function getWinRateDb() {
  if (!winRateDbPromise) {
    const fetchOnce = () =>
      fetch("data/winrate-scores-us.json", { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      }).then((db) => {
        if (db && db.generatedAt) winRateDbGeneratedAt = db.generatedAt;
        return db;
      });
    // 2026-09-08: 실패 캐시 금지 + 1회 재시도(유니버스 로더와 동일)
    winRateDbPromise = fetchOnce()
      .catch(() => sleep(1500).then(fetchOnce))
      .catch((e) => {
        lastDataLoadError = `winrate-scores-us.json: ${(e && e.message) || e}`;
        winRateDbPromise = null;
        return null;
      });
  }
  return winRateDbPromise;
}
// 섹션(주식 US/KR·ETF·코인)에 맞는 승률 DB 맵 선택 — scores=미국 S&P500(구성종목 판별에도 사용),
// scoresKr=코스피200+코스닥150, scoresEtf=ETF200(미국+국내), scoresCrypto=코인100 (2026-09-02 확장)
function winRateMapForMode(db, ticker, mode) {
  if (!db) return null;
  if (mode === "crypto") return db.scoresCrypto || null;
  if (mode === "etf") return db.scoresEtf || null;
  return isKrTicker(ticker) ? db.scoresKr || null : db.scores || null;
}

// ---------- 주식 랭킹 표 공용 10년월간승률/연평균 상승 셀(2026-09-04 상승압력·투자안정 열 대체) ----------
// 렌더러가 행을 그리기 전에 await getWinRateDb()를 한 번 호출해두면(전역 캐시 저장) 셀은 동기 조회로 그림
let winRateDbResolved = null;
async function ensureWinRateDbResolved() {
  winRateDbResolved = await getWinRateDb().catch(() => null);
  return winRateDbResolved;
}
function stockWrEntryOf(symbol) {
  const db = winRateDbResolved;
  if (!db) return null;
  const map = isKrTicker(symbol) ? db.scoresKr : db.scores;
  return (map && map[symbol]) || null;
}
function stockWinRateCellHtml(symbol) {
  const e = stockWrEntryOf(symbol);
  if (!e) return "N/A";
  return winRatePctCellHtml(e.score, e.total);
}
function stockRet10CellHtml(symbol) {
  const e = stockWrEntryOf(symbol);
  if (!e || !Number.isFinite(e.ret10y)) return "N/A";
  const v = Math.round(e.ret10y * 10) / 10;
  return `${partialMarkHtml(e.total, "wr-mark-front")}${v > 0 ? "+" : ""}${v}%`;
}
// 상장 10년 미만(승률 DB total<120개월) ⚠️ — 10년월간승률·연평균 상승 표시 공통(2026-09-09 사용자 요청: 연평균 상승에도 표시).
// 연평균 상승은 상장 후 기간만 연율화한 값이라(예: 센디스크 18개월 36배 → 연 1,001%) 10년치가 아님을 알리는 용도
// minMonths: 이 개월수 미만이면 경고 — 주식·ETF 120(10년 미만), 코인 85(7년 이하, 2026-09-13 사용자 요청: 코인은 역사가 짧아 7년 이하만 경고)
// 핵심지표 승률의 상장 기간 표시(2026-10-06 사용자 요청: ⚠️ 대신 작은 글씨) — 주식·ETF는 10년, 코인은 7년 기준
// 상장 기간(개월)을 "7년2개월"·"2년10개월"·"8개월"처럼(2026-10-21 사용자 요청: "(10년미만)" 대신 실제 승률 기간)
function srMonthsText(total) {
  const t = Math.max(1, Math.round(total));
  const y = Math.floor(t / 12);
  const m = t % 12;
  return `${y ? y + "년" : ""}${m ? m + "개월" : ""}`;
}
function srPartialTag(it) {
  const min = it.partialMin || 120;
  if (!Number.isFinite(it.partialTotal) || it.partialTotal >= min) return "";
  return `(${srMonthsText(it.partialTotal)})`;
}
function partialMarkHtml(total, cls, minMonths = 120) {
  if (!Number.isFinite(total) || total >= minMonths) return "";
  const ageText = minMonths >= 120 ? "10년이 안 된" : "7년 이하인";
  // 2026-09-10 사용자 요청: 단순 설명이 아니라 "주의하라"는 경고 문구로
  return `<span class="nine-partial-mark${cls ? " " + cls : ""}" title="⚠️ 주의 — 상장한 지 ${ageText} 종목입니다(상장 후 ${total}개월). 짧은 기간만으로 계산한 값이라 오래된 종목과 같은 기준으로 비교하면 안 됩니다.">⚠️</span>`;
}
// 심볼로 경고 기준 개월수 결정 — 코인(-USD/-KRW)은 7년, 나머지는 10년
function partialMonthsFor(symbol) {
  return /-(USD|KRW)$/i.test(String(symbol || "")) ? 85 : 120; // 코인은 "7년(84개월) 이하"까지 경고 → 85 미만
}
// data-explain에 넣기 전에 안내문 속 태그를 걷어냄(설명은 순수 텍스트로 보여줌)
function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, "");
}
// 표 맨 위 안내(2026-09-10 사용자 요청) — 머리글·아이콘 아무 데나 눌러도 설명이 나온다는 힌트
// 2026-10-08 사용자 요청: 순위 화면 안내도 번갈아 — 두 번째 문구는 아래에 전체 순위 버튼이 있는 화면에서만(타이머는 POPULAR_HINTS 옆)
// 두 번째 문구의 "나머지 N개"는 화면마다(한국·미국·ETF·코인) 아래 전체보기 버튼에서 읽어 채움(2026-10-08 사용자 요청)
const RANK_HINTS = ["모든 항목은 눌러서 자세한 설명을 볼 수 있습니다.", "아래 전체보기 버튼을 눌러 나머지 종목도 검색해 보세요."];
function rankMoreHintText(btn, box) {
  const t = (btn && btn.textContent) || "";
  if (btn && btn.classList && btn.classList.contains("rf-more")) {
    const m = t.match(/전체\s*([\d,]+)\s*개/);
    return m ? `아래 더보기 버튼을 눌러 ${m[1]}개 전체 순위를 30위씩 더 볼 수 있어요.` : "아래 더보기 버튼을 눌러 다음 순위를 확인해 보세요.";
  }
  let rest = null;
  const m1 = t.match(/나머지\s*([\d,]+)\s*개/);
  const m2 = t.match(/전체\s*([\d,]+)\s*개/);
  if (m1) rest = Number(m1[1].replace(/,/g, ""));
  else if (m2) {
    const shown = box ? [...box.querySelectorAll("tbody tr")].filter((tr) => tr.offsetParent !== null).length : 0;
    rest = Number(m2[1].replace(/,/g, "")) - shown;
  }
  return rest > 0 ? `아래 전체보기 버튼을 눌러 나머지 ${rest.toLocaleString()}개를 검색해 보세요.` : RANK_HINTS[1];
}
const RANK_HINT_SPAN = `<span class="pop-hint-text" data-hint-set="rank">* ${RANK_HINTS[0]}</span>`;
const TAP_HINT_HTML = `<p class="tap-hint pop-hint">${RANK_HINT_SPAN}</p>`;
// 승률 탭 머리줄(2026-09-13 사용자 요청): 안내 + 오른쪽 "+승률이란" — 누르면 바로 아래에 대표자산 승률비교를 펼침(인기종목과 같은 내용)
const WINRATE_HEAD_HTML = `<div class="popular-head-row"><span class="tap-hint pop-hint">${RANK_HINT_SPAN}</span><button type="button" class="score-method-detail-btn winrate-info-btn">+승률이란</button></div>`;
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".winrate-info-btn");
  if (!btn) return;
  const head = btn.closest(".popular-head-row");
  const next = head && head.nextElementSibling;
  if (next && next.classList.contains("popular-winrate-info")) {
    next.remove();
    btn.textContent = "+승률이란";
    return;
  }
  if (head) head.insertAdjacentHTML("afterend", `<div class="chart-detail-wrap chart-detail-expanded popular-winrate-info">${buildWinRateBenchmarkHtml()}</div>`);
  btn.textContent = "−승률이란 닫기";
});
// 순위 표에서 반복되는 머리글 3종 — 누르면 설명이 나오도록 data-explain을 붙여 공용화
const RANK_TH_NAME = `<th data-explain="기업명 — 누르면 그 종목의 분석 화면(개요·매출액·invest점수·뉴스)으로 이동합니다. 앞의 동그란 그림은 회사 로고입니다.">기업명</th>`;
const RANK_TH_NAME_ETF = `<th data-explain="이름 — 누르면 그 종목의 상세 화면으로 이동합니다.">이름</th>`;
const RANK_TH_PRICE = `<th data-explain="현재가입니다. 괄호 안은 전일 종가 대비 오늘 등락률이며, 시세는 최대 20분 지연될 수 있습니다. 숫자를 누르면 차트가 열립니다.">현재가<br>(등락률)</th>`;
const RANK_TH_PRICE_CHG = `<th data-explain="현재가와 전일 종가 대비 당일 등락률입니다. 시세는 최대 20분 지연될 수 있고, 숫자를 누르면 차트가 열립니다.">현재가<br>(등락률)</th>`;
const RANK_TH_WINRATE = `<th data-explain="10년월간승률 — 최근 10년(최대 120개월) 동안 전달보다 오르며 마감한 달의 비율입니다. 수익률의 크기가 아니라 이긴 횟수라, 높을수록 꾸준히 우상향했다는 뜻입니다. ⚠️는 상장 10년 미만이라는 경고입니다.">10년월간<br>승률</th>`;
// 2026-09-13 사용자 재요청: 머리글 (%) 대신 칸 안 숫자마다 %를 직접 적는다(한눈에 %인 걸 알아보도록)
// 1년 수익률(2026-09-12 사용자 요청) — "수익률" 탭의 기준. 연평균(CAGR)이 아니라 1년 전 같은 시점 대비 실제 상승량
const RANK_TH_RET1Y = `<th data-explain="1년 수익률 — 1년 전 같은 시점의 가격과 비교해 지금까지 얼마나 올랐는지입니다. 매년 평균(연평균 상승)이 아니라 최근 1년치 실제 성적이라, 작년 한 해 수익률이 그대로 보입니다.">1년<br>수익률</th>`;
const RANK_TH_RET10 = `<th data-explain="연평균 상승 — 최근 10년 연복리 수익률(CAGR)입니다. 매년 몇 %씩 오른 셈인지를 뜻하며, 상장 10년 미만이면 상장 후 기간만 연율화한 값이라 ⚠️가 붙습니다.">연평균<br>상승</th>`;
const RANK_TH_RSI = `<th data-explain="RSI 점수 — 주간 RSI(14) 현재값입니다. 30 미만은 과매도(초록), 70 이상은 과매수(빨강)로 보는 참고용 기술적 지표입니다.">RSI<br>점수</th>`;

// ---------- 순위 표 공통 3칸 틀(2026-09-13 사용자 요청) ----------
// 인기종목~IPO 모든 탭을 관심종목과 같은 증권사 앱 틀로: 로고 | 종목명/코드·시장 | 현재가▲▼/등락률 | 기준값.
// 표(<table>) 구조는 그대로 둔다 — 머리글·이모지 설명 줄(explain-row)이 tr/thead에 기대고 있어서.
// 표에는 rk-table 클래스를 붙이고 모양은 style.css가 맡는다.
function rankCodeLabel(symbol) {
  const sym = String(symbol || "");
  if (/\.KS$/.test(sym)) return `${sym.slice(0, -3)} 코스피`;
  if (/\.KQ$/.test(sym)) return `${sym.slice(0, -3)} 코스닥`;
  if (/-(USD|KRW)$/.test(sym)) return sym.replace(/-(USD|KRW)$/, "");
  return sym;
}
// 해외 종목은 한글명(없으면 영문명)을 위에, 티커는 아래 작은 줄에 — 국내와 같은 순서
function rankDisplayName(symbol, name, isKr) {
  return isKr ? name || symbol : TICKER_TO_KOREAN_NAME[symbol] || name || symbol;
}
// ---------- 실적발표 일정(2026-10-08 사용자 요청) — data/earnings-calendar.json(매일 다트공시 배치가 갱신) ----------
// 미국: 나스닥 실적 캘린더의 확정 발표일(next·장 전/후)과 최근 발표일(last). 한국: DART 잠정실적·정기보고서 첫 공시일(last).
let earningsCal = null;
let earningsCalPromise = null;
function getEarningsCal() {
  if (!earningsCalPromise)
    earningsCalPromise = fetch("data/earnings-calendar.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => (earningsCal = d));
  return earningsCalPromise;
}
getEarningsCal();
function earningsEntry(sym) {
  if (!earningsCal || !sym) return null;
  const s = String(sym).toUpperCase();
  return (isKrTicker(s) ? earningsCal.kr : earningsCal.us)?.[s] || null;
}
function earnDaysSince(iso) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((t - new Date(iso + "T00:00:00")) / 86400000);
}
// 실적이 나온 뒤 7일 동안 '실적', 발표 7일 전부터는 '예정'(2026-10-08 사용자 요청) — 이름 오른쪽 마크
function earnBadgeHtml(sym) {
  const e = earningsEntry(sym);
  if (!e) return "";
  if (e.last) {
    const d = earnDaysSince(e.last);
    if (d >= 0 && d <= 7) return `<span class="earn-badge" title="${escapeHtml(e.last)} 실적 발표">실적</span>`;
  }
  if (e.next) {
    const d = -earnDaysSince(e.next);
    if (d >= 0 && d <= 7) return `<span class="earn-badge earn-badge-soon" title="${escapeHtml(e.next)} 실적 발표 예정${e.nextEst ? "(추정)" : ""}">예정</span>`;
  }
  return "";
}
const EARN_TIME_LABEL = { pre: "장 시작 전", after: "장 마감 후" };
function fqToQuarterLabel(fq) {
  const m = String(fq || "").match(/^([A-Za-z]{3})/);
  const mon = m ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(m[1]) : -1;
  return mon >= 0 ? `${Math.floor(mon / 3) + 1}분기` : "";
}
// 다음 실적발표일: 확정 일정이 있으면 그걸(exact), 없으면 지난 분기 결산일로 추정
async function nextEarningsInfo(sym) {
  await getEarningsCal();
  const e = earningsEntry(sym);
  if (e && e.next) return { symbol: sym, date: new Date(e.next + "T00:00:00"), exact: !e.nextEst, time: e.nextTime || "", quarterLabel: fqToQuarterLabel(e.fq) };
  const est = await estimateNextEarningsDate(sym);
  return est ? { ...est, exact: false } : null;
}
function rankNameCellHtml(symbol, logoHtml, name, sub, extraCls, noBadge) {
  const badge = noBadge ? "" : earnBadgeHtml(symbol);
  return `<span class="ticker-cell rank-logo">${logoHtml}<span class="rk-name-box${extraCls ? " " + extraCls : ""}">${badge ? '<span class="at-name-line">' : ""}<b class="ticker-link rk-name" data-ticker="${escapeHtml(
    symbol
  )}">${escapeHtml(name)}</b>${badge ? `${badge}</span>` : ""}<span class="rk-sub">${escapeHtml(sub === undefined ? rankCodeLabel(symbol) : sub)}</span></span></span>`;
}
function rankPriceCellHtml(symbol, price, currency, changePct) {
  const p = price === null || price === undefined ? NaN : Number(price);
  if (!Number.isFinite(p)) return "N/A";
  if (!currency) currency = /\.(KS|KQ)$/.test(String(symbol)) ? "KRW" : "USD";
  const hasPct = Number.isFinite(changePct);
  const shown = hasPct ? Math.round(changePct * 100) / 100 : 0; // 화면에 0.00%로 보이면 색·화살표도 없음
  const dir = shown === 0 ? 0 : shown > 0 ? 1 : -1;
  const cls = dir > 0 ? "wl-up" : dir < 0 ? "wl-down" : "";
  const priceText = wlNumStr(p, currency);
  return `<span class="rk-l1 ${cls}${priceText.length >= 9 ? " rk-long" : ""}">${priceChartLink(symbol, priceText)}<span class="rk-arrow">${dir > 0 ? "▲" : dir < 0 ? "▼" : ""}</span></span><span class="rk-l2 ${cls}">${
    hasPct ? `${Math.abs(changePct).toFixed(2)}%` : ""
  }</span>`;
}

// ---------- 이모지 표시 탭 설명(2026-09-10 사용자 요청) ----------
// 신호등(🟢🟡🔴)·느낌표(⚠️)·배당 경고(⚠️컷/지연)·급등락(🔥⚠️)·10년월간승률 원판을 누르면 바로 아래 줄에
// 짧은 설명이 펼쳐지고, 다시 누르면 닫힘(한 번에 하나만). 설명 문구는 data-explain 또는 title에서 가져옴 —
// 마우스가 없는 휴대폰에서는 title 툴팁을 볼 수 없어서 만든 장치
const EXPLAIN_MARK_SELECTOR = ".nine-partial-mark, .dividend-warn, .at-emoji, .wr-pct, .surge-warn-mark, .corr-grade, [data-explain]";
function closeAllExplainNotes(except) {
  document.querySelectorAll(".explain-row, .explain-inline").forEach((n) => {
    if (n !== except) n.remove();
  });
}
document.addEventListener(
  "click",
  (e) => {
    const mark = e.target.closest(EXPLAIN_MARK_SELECTOR);
    if (!mark) {
      if (!e.target.closest(".explain-row, .explain-inline")) closeAllExplainNotes(null);
      return;
    }
    const text = mark.dataset.explain || mark.getAttribute("title") || "";
    if (!text) return;
    e.preventDefault();
    e.stopPropagation(); // 이모지 클릭이 종목 열기 등 다른 동작으로 이어지지 않게
    const row = mark.closest("tr");
    const isHead = row && row.parentElement && row.parentElement.tagName === "THEAD";
    const table = row && row.closest("table");
    const next = isHead
      ? table && table.tBodies[0] && table.tBodies[0].firstElementChild
      : row
      ? row.nextElementSibling
      : mark.closest("p, div") && mark.closest("p, div").nextElementSibling;
    const isSameOpen = next && (next.classList.contains("explain-row") || next.classList.contains("explain-inline")) && next.dataset.forText === text;
    closeAllExplainNotes(null);
    if (isSameOpen) return; // 같은 설명이 이미 열려 있었으면 토글로 닫기만
    if (row) {
      const cols = row.children.length || 1;
      const warn = text.startsWith("⚠️") ? " explain-row-warn" : "";
      const html = `<tr class="explain-row${warn}" data-for-text="${escapeHtml(text)}"><td colspan="${cols}">${escapeHtml(text)}</td></tr>`;
      // 머리글(thead)에서 눌렀으면 본문 맨 위에 붙임 — thead 안에 설명 줄이 끼지 않게
      const table = row.closest("table");
      const tbody = table && table.tBodies[0];
      if (row.parentElement && row.parentElement.tagName === "THEAD" && tbody) tbody.insertAdjacentHTML("afterbegin", html);
      else row.insertAdjacentHTML("afterend", html);
    } else {
      const host = mark.closest("p, div") || mark.parentElement;
      if (host) host.insertAdjacentHTML("afterend", `<div class="explain-inline" data-for-text="${escapeHtml(text)}">${escapeHtml(text)}</div>`);
    }
  },
  true // 캡처 단계 — 종목 링크 등 기존 위임 핸들러보다 먼저 잡아야 함
);

// noPct: 인기종목 표처럼 열 폭이 좁은 곳에서는 % 없이 숫자만(2026-09-10 사용자 요청)
// 1년 상승률 셀 — 오르면 상승색, 내리면 하락색(앱의 상승률 랭킹과 같은 표기)
function ret1yCellHtml(v) {
  if (!Number.isFinite(v)) return "N/A";
  const x = Math.round(v * 10) / 10;
  return `<b class="rank-hl">${x > 0 ? "+" : ""}${x}%</b>`;
}
function winRatePctCellHtml(v, total, noPct, minMonths = 120) {
  if (!Number.isFinite(v)) return "N/A";
  // 2026-09-12 사용자 요청: 정수 반올림이면 55.4%와 55.6%가 똑같이 55%로 보여 순위가 뒤죽박죽 같아 보임 → 소수점 첫째 자리까지
  const x = v.toFixed(1); // 60%와 59.2%가 섞이지 않게 항상 소수점 첫째 자리까지
  // ⚠️(상장 10년 미만)는 숫자 앞에(2026-09-13 사용자 요청) — 숫자 끝이 위아래 행과 맞게. total이 null이면 경고 없음
  return `${partialMarkHtml(total, "wr-mark-front", minMonths)}<b class="wr-pct" title="10년월간승률 ${x}% — 최근 10년간 전달보다 오르며 마감한 달의 비율(수익률 크기가 아니라 이긴 횟수)">${x}${noPct ? "" : "%"}</b>`;
}
// 표 머리글의 둘째 줄 작은 기준 안내(예: 매출 증가율 / (YoY))
const THEAD_SUB = (t) => `<span class="th-sub">(${t})</span>`;

// ---------- 6-4. RSI 점수(2026-09-02 사용자 요청): 주간 RSI(14) 현재값을 그대로 표시 — S&P500 미국주식 전용 ----------
// "S&P500 종목만" 조건은 승률점수 DB(S&P500 구성종목 목록)를 재사용해 판별. 30 미만(과매도)=초록, 70 이상(과매수)=빨강.
// 주간봉 3년치(약 156개)로 와일더 방식 RSI(14)를 계산 — 첫 14주 단순평균 후 지수평활, 진행 중인 이번 주 봉 포함(인베스팅닷컴과 동일 관례).
function computeWilderRsi(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ---------- 6-4. 장기 우상향 점수 "+자세히"(2026-09-03 사용자 요청): 대표 자산 11종의 10년 월간 승률 벤치마크 ----------
// 값은 2026-09-03에 야후(월봉 11y)·ECOS(서울 아파트 매매가격지수 901Y062/P63ACA, 한국부동산원)로 일괄 계산한 정적 스냅샷.
// 승률은 10년 누적이라 천천히 변함 — 갱신 시 scratchpad의 winrate-benchmarks.ps1 재실행 후 이 표를 교체.
// WINRATE_BENCHMARKS(대표자산 10년월간승률)는 공용 파일 winrate-benchmark.js로 옮김(2026-10-06 — 마켓맵과 공유)
let winRateBenchmarkBuilt = false;
function renderWinRateBenchmarkDetail() {
  if (winRateBenchmarkBuilt) return;
  winRateBenchmarkBuilt = true;
  el("winRateDetailWrap").innerHTML = buildWinRateBenchmarkHtml();
}
function buildWinRateBenchmarkHtml() {
  // 2026-09-13 사용자 요청: 휴대폰에서 글씨가 안 보여 확대 — 가로 700 → 380으로 좁혀 글자가 실제 크기에 가깝게 그려지고,
  // 자산들이 몰려 있는 28~85% 구간을 넓게 그리고, 양 끝에 0%와 100%(예금·적금)를 물결(생략) 표시로 붙임
  const svg = buildWinRateBenchmarkSvg(); // 그래프는 공용 winrate-benchmark.js
  const DEPOSIT_COLOR = "#0f766e";
  const rows = WINRATE_BENCHMARKS.map(
    (b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="wr-bench-dot" style="background:${b.color};"></span><b>${escapeHtml(b.name)}</b></td>
        <td>${b.up}회</td>
        <td>${b.down}회</td>
        <td>${winRatePctCellHtml(b.score, null)}</td>
      </tr>`
  ).join("") + `
      <tr class="wr-bench-deposit">
        <td>기준</td>
        <td><span class="wr-bench-dot" style="background:${DEPOSIT_COLOR};"></span><b>예금·적금</b></td>
        <td>120회</td>
        <td>0회</td>
        <td><b class="wr-pct">100.0%</b></td>
      </tr>`;
  // 표는 한 행이 한 줄로 끝나게(2026-09-13 사용자 요청: 상하로 짧게) — 보조명(서울 아파트 지수 등) 줄은 뺌
  return winRateBenchmarkHtml(svg, rows);
}
// INVEST점수 10년월간승률 "+자세히"와 인기종목 "+승률이란"(2026-09-13)이 같은 내용을 쓴다
function winRateBenchmarkHtml(svg, rows) {
  // 문구는 2026-09-13 사용자 지정 — 맨 위 설명 한 줄, 맨 아래 안내 한 줄만
  return `
    ${WINRATE_INTRO_HTML}
    <h3 class="future-chart-subheading">대표자산 10년월간승률비교</h3>
    ${svg}
    <table class="top30-table wr-bench-table" style="margin-top:10px;">
      <thead><tr><th>순위</th><th>이름</th><th>상승</th><th>하락</th><th>승률</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="disclaimer" style="margin-top:8px;">과거 데이터이며 미래 수익률을 보장하지 않고 투자 자문이 아닙니다.</p>
  `;
}
el("winRateDetailBtn").addEventListener("click", () => {
  const wrap = el("winRateDetailWrap");
  const btn = el("winRateDetailBtn");
  const isOpen = wrap.style.display !== "none";
  wrap.style.display = isOpen ? "none" : "block";
  wrap.classList.toggle("chart-detail-expanded", !isOpen);
  btn.textContent = isOpen ? "+자세히" : "-접기";
  if (!isOpen) renderWinRateBenchmarkDetail();
});

// ---------- 6-5. RSI 점수 "+자세히"(2026-09-03 사용자 요청): SPY 5년 주봉 차트 + 주간 RSI(14) 흐름과 저점 2회 표시 ----------
// computeWilderRsi(마지막 값만)와 같은 계산을 시계열 전체로 — i번째 값은 첫 14주 단순평균 후 지수평활을 이어간 RSI
function computeWilderRsiSeries(closes, period = 14) {
  if (!closes || closes.length < period + 1) return [];
  const out = new Array(closes.length).fill(null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
let rsiSpyDetailPromise = null;
// 2026-09-16: 만든 HTML을 돌려주는 형태로 바꿈 — INVEST점수 "+자세히"와 핵심지표 설명의 "+예시"가 같은 내용을 함께 쓴다
function buildRsiSpyDetailHtml() {
  if (!rsiSpyDetailPromise) {
    // 2026-10-21 사용자 요청: 그래프 1개(SPY) → 3개(SPY·비트코인·삼성전자). 각 그래프 맨 아래에 현재 RSI 점수를 빨간색으로 표시
    const targets = [
      { sym: "SPY", name: "SPY(S&amp;P500)", priceLabel: "SPY 주가(주봉 종가)", lowWindows: [
        { label: "25년 4월", from: Date.UTC(2025, 2, 1) / 1000, to: Date.UTC(2025, 4, 31) / 1000 },
        { label: "26년 3월", from: Date.UTC(2026, 1, 1) / 1000, to: Date.UTC(2026, 3, 30) / 1000 },
      ] },
      { sym: "BTC-USD", name: "비트코인", priceLabel: "비트코인 주가(주봉 종가)" },
      { sym: "005930.KS", name: "삼성전자", priceLabel: "삼성전자 주가(주봉 종가)" },
    ];
    const buildOne = async (t) => {
      const chart = await yahooChart(t.sym, "5y", "1wk");
      const pairs = chartClosePairs(chart);
      if (pairs.length < 30) throw new Error(`${t.name} 주봉 데이터를 가져오지 못했습니다.`);
      const closes = pairs.map((p) => p.c);
      const rsiSeries = computeWilderRsiSeries(closes, 14);

      const W = 700;
      const PX0 = 46;
      const PX1 = 688;
      const priceTop = 14;
      const priceBottom = 128;
      const rsiTop = 150;
      const rsiBottom = 236;
      const t0 = pairs[0].t;
      const t1 = pairs[pairs.length - 1].t;
      const xOf = (tt) => PX0 + ((tt - t0) / (t1 - t0)) * (PX1 - PX0);
      const minC = Math.min(...closes);
      const maxC = Math.max(...closes);
      const yOfPrice = (c) => priceBottom - ((c - minC) / (maxC - minC)) * (priceBottom - priceTop);
      const yOfRsi = (r) => rsiBottom - (r / 100) * (rsiBottom - rsiTop);

      const pricePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOfPrice(p.c).toFixed(1)}`).join("");
      const rsiPath = pairs
        .map((p, i) => (rsiSeries[i] === null ? null : `${xOf(p.t).toFixed(1)},${yOfRsi(rsiSeries[i]).toFixed(1)}`))
        .filter(Boolean)
        .map((pt, i) => `${i === 0 ? "M" : "L"}${pt}`)
        .join("");

      // RSI가 가장 낮았던 두 지점(서로 20주 이상 떨어진 곳)을 빨간 점으로 표시 — SPY는 큰 하락 구간(25년 4월·26년 3월) 부근
      let lowMarks;
      if (t.lowWindows) {
        lowMarks = t.lowWindows
          .map((w) => {
            let best = null;
            for (let i = 0; i < pairs.length; i++) {
              if (rsiSeries[i] === null || pairs[i].t < w.from || pairs[i].t > w.to) continue;
              if (!best || rsiSeries[i] < best.rsi) best = { t: pairs[i].t, rsi: rsiSeries[i], price: pairs[i].c };
            }
            return best ? { ...best, label: w.label } : null;
          })
          .filter(Boolean);
      } else {
        const idx = pairs.map((_, i) => i).filter((i) => rsiSeries[i] !== null).sort((x, y) => rsiSeries[x] - rsiSeries[y]);
        const picked = [];
        for (const i of idx) {
          if (picked.every((j) => Math.abs(j - i) >= 20)) picked.push(i);
          if (picked.length >= 2) break;
        }
        lowMarks = picked
          .sort((x, y) => x - y)
          .map((i) => {
            const d = new Date(pairs[i].t * 1000);
            return { t: pairs[i].t, rsi: rsiSeries[i], price: pairs[i].c, label: `${String(d.getUTCFullYear()).slice(2)}년 ${d.getUTCMonth() + 1}월` };
          });
      }
      const lowMarkSvg = lowMarks
        .map((mk) => {
          const x = xOf(mk.t);
          const y = yOfRsi(mk.rsi);
          const anchor = x > (PX0 + PX1) / 2 ? "end" : "start";
          const tx = anchor === "end" ? x - 8 : x + 8;
          return `
            <line x1="${x.toFixed(1)}" y1="${yOfPrice(mk.price).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
            <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
            <text x="${tx.toFixed(1)}" y="${(y - 9).toFixed(1)}" text-anchor="${anchor}" font-size="11.5" font-weight="800" fill="#ef4444">${mk.label} RSI ${mk.rsi.toFixed(1)}</text>`;
        })
        .join("");
      // 맨 아래: 지금(가장 최근 주) RSI 점수를 빨간색으로
      const lastIdx = rsiSeries.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop();
      const nowRsi = lastIdx === undefined ? null : rsiSeries[lastIdx];
      const nowSvg = nowRsi === null ? "" : `<circle cx="${xOf(pairs[lastIdx].t).toFixed(1)}" cy="${yOfRsi(nowRsi).toFixed(1)}" r="4.5" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>`;
      const nowText = nowRsi === null ? "" : `<text x="${PX1}" y="${rsiBottom + 14}" text-anchor="end" font-size="12.5" font-weight="900" fill="#ef4444">지금 RSI ${nowRsi.toFixed(1)}</text>`;

      const yearTicks = [];
      for (let y = new Date(t0 * 1000).getUTCFullYear() + 1; y <= new Date(t1 * 1000).getUTCFullYear(); y++) {
        const tt = Date.UTC(y, 0, 1) / 1000;
        if (tt > t0 && tt < t1) yearTicks.push(`<line x1="${xOf(tt).toFixed(1)}" y1="${priceTop}" x2="${xOf(tt).toFixed(1)}" y2="${rsiBottom}" stroke="var(--border)" stroke-width="1" opacity="0.6"/><text x="${xOf(tt).toFixed(1)}" y="${rsiBottom + 14}" text-anchor="middle" font-size="10" fill="var(--muted)">${y}</text>`);
      }

      return `
        <h3 class="future-chart-subheading">📉 예시: ${t.name} 5년 주봉과 주간 RSI(14)</h3>
        <svg viewBox="0 0 ${W} 258" style="width:100%;height:auto;display:block;" role="img" aria-label="${t.name} 5년 차트와 주간 RSI">
          ${yearTicks.join("")}
          <text x="${PX0}" y="${priceTop - 2}" font-size="10.5" fill="var(--muted)">${t.priceLabel}</text>
          <path d="${pricePath}" fill="none" stroke="#5b8def" stroke-width="2" stroke-linejoin="round"/>
          <text x="${PX0}" y="${rsiTop - 5}" font-size="10.5" fill="var(--muted)">주간 RSI(14)</text>
          <line x1="${PX0}" y1="${yOfRsi(70).toFixed(1)}" x2="${PX1}" y2="${yOfRsi(70).toFixed(1)}" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 3" opacity="0.55"/>
          <line x1="${PX0}" y1="${yOfRsi(30).toFixed(1)}" x2="${PX1}" y2="${yOfRsi(30).toFixed(1)}" stroke="#22a866" stroke-width="1" stroke-dasharray="4 3" opacity="0.55"/>
          <text x="${PX1}" y="${(yOfRsi(70) - 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#ef4444">70 과매수</text>
          <text x="${PX1}" y="${(yOfRsi(30) + 11).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#22a866">30 과매도</text>
          <path d="${rsiPath}" fill="none" stroke="#6d28d9" stroke-width="1.8" stroke-linejoin="round"/>
          ${lowMarkSvg}
          ${nowSvg}
          ${nowText}
        </svg>`;
    };
    rsiSpyDetailPromise = (async () => {
      const results = await Promise.allSettled(targets.map(buildOne));
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      if (!ok.length) throw new Error("예시 주봉 데이터를 가져오지 못했습니다.");
      return `
        ${ok.join("")}
        <p class="disclaimer" style="margin-top:8px;">
          💡 <b>RSI(상대강도지수)</b>는 최근 14주 동안 오른 폭과 내린 폭의 비율로 "지금 얼마나 과열/침체됐는지"를 0~100으로 나타내는
          기술적 지표입니다. <b style="color:#22a866;">30 미만이면 과매도(많이 내려 침체)</b>,
          <b style="color:#ef4444;">70 이상이면 과매수(많이 올라 과열)</b>로 봅니다. 위 예시들처럼 큰 하락 구간(빨간 점)에서
          주간 RSI가 30 부근까지 내려간 뒤 반등한 사례가 있지만, 항상 반복된다는 보장은 없으며 투자 자문이 아닙니다.
          각 그래프 맨 아래 빨간 글씨는 가장 최근 주의 RSI 점수예요.
        </p>
      `;
    })().catch((e) => {
      rsiSpyDetailPromise = null;
      return `<p class="error-inline">예시 차트를 가져오지 못했습니다: ${escapeHtml(e.message || "")}</p>`;
    });
  }
  return rsiSpyDetailPromise;
}
function renderRsiSpyDetail() {
  return buildRsiSpyDetailHtml().then((html) => {
    el("rsiDetailWrap").innerHTML = html;
  });
}
el("rsiDetailBtn").addEventListener("click", () => {
  const wrap = el("rsiDetailWrap");
  const btn = el("rsiDetailBtn");
  const isOpen = wrap.style.display !== "none";
  wrap.style.display = isOpen ? "none" : "block";
  wrap.classList.toggle("chart-detail-expanded", !isOpen);
  btn.textContent = isOpen ? "+자세히" : "-접기";
  if (!isOpen && !wrap.innerHTML) wrap.innerHTML = `<p class="muted">불러오는 중...</p>`;
  if (!isOpen) renderRsiSpyDetail();
});

// ---------- "+자세히" 배점 기준 모달 — 상승 압력·투자 안정 배점식을 GOOGL 실제 수치로 설명(세션 내 1회 계산 후 재사용) ----------
let scoreMethodDataPromise = null;
function getScoreMethodExampleData() {
  if (!scoreMethodDataPromise) {
    scoreMethodDataPromise = Promise.all([getFullMetrics("GOOGL"), getMarketReturnsCached()]).catch((e) => {
      scoreMethodDataPromise = null;
      throw e;
    });
  }
  return scoreMethodDataPromise;
}

// 배점 기준 모달의 카드 상단(로고+기업명+"(예시)") — 두 카드가 공유
function scoreMethodExampleHeaderHtml() {
  return `<div class="smb-header">${tickerLogoHtml("GOOGL")}<span class="smb-header-name">Alphabet Inc. <span class="muted">(예시)</span></span></div>`;
}
// 배점 항목 하나를 막대그래프 한 줄로 — 값이 클수록 막대가 길게 차오름(0~max 기준)
// 재무안정(구 신용등급) 전용 — 세부 배점 방법은 비공개하고 5점 만점 별(정수)로만 표시. 단, 미평가·회사채없음은 사유+점수를 그대로 공개.
function renderStars(count) {
  const full = Math.max(0, Math.min(5, Math.round(count)));
  let html = "";
  for (let i = 0; i < 5; i++) html += i < full ? "★" : "☆";
  return html;
}
function creditStabilityRowHtml(rating, creditScore, color) {
  const isUnratedOrNoBond = rating === UNRATED_REASON || rating === NO_DEBT_RATING || rating === "회사채없음";
  if (isUnratedOrNoBond) {
    const reason =
      rating === NO_DEBT_RATING || rating === "회사채없음"
        ? "회사채를 발행한 적이 없어(무차입 경영 등) 신용등급 자체가 존재하지 않는 종목입니다."
        : "신용평가사의 등급 조사 대상이 아니거나 등급이 확인되지 않은 종목입니다.";
    return `
      <div class="smb-row">
        <div class="smb-row-top">
          <span class="smb-label">① 재무안정</span>
          <span class="smb-value" style="color:${color};">${rating} (${creditScore}/4점)</span>
        </div>
        <p class="smb-desc">${reason}</p>
      </div>`;
  }
  const stars = Math.round((creditScore / 4) * 5);
  return `
    <div class="smb-row">
      <div class="smb-row-top">
        <span class="smb-label">① 재무안정</span>
        <span class="smb-value stars" style="color:${color};">${renderStars(stars)}</span>
      </div>
      <div class="smb-track"><div class="smb-fill" style="width:${(stars / 5) * 100}%;background:${color};"></div></div>
      <p class="smb-desc">채무 상환능력 · 수익 안정성 · 시장 신인도 3가지 요소를 종합 평가해 책정된 자체 등급입니다.</p>
    </div>`;
}
function scoreMethodBarRow(num, label, value, max, desc, color) {
  const pct = value === null || value === undefined ? 0 : clamp((value / max) * 100, 0, 100);
  const valText = value === null || value === undefined ? "N/A" : `${value.toFixed(1)}/${max}`;
  return `
    <div class="smb-row">
      <div class="smb-row-top">
        <span class="smb-label">${num} ${label}</span>
        <span class="smb-value" style="color:${color};">${valText}</span>
      </div>
      <div class="smb-track"><div class="smb-fill" style="width:${pct}%;background:${color};"></div></div>
      <p class="smb-desc">${desc}</p>
    </div>`;
}

async function openScoreMethodModal() {
  const modal = el("scoreMethodModal");
  const body = el("scoreMethodBody");
  modal.style.display = "flex";
  body.innerHTML = `<p class="muted" style="padding:14px;">GOOGL 실제 수치를 불러오는 중...</p>`;

  try {
    const [metrics, { sp500Return }] = await getScoreMethodExampleData();
    const score = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, sp500Return);
    const pressureColor = SCORE_COLOR_FAMILY.pressure;
    const stabilityColor = SCORE_COLOR_FAMILY.stability;

    body.innerHTML = `
      <div class="score-method-card">
        ${scoreMethodExampleHeaderHtml()}
        <h4>📈 상승 압력 (10점 만점 — 2026-09-03 통일: 주식·ETF·코인 공통 배점)</h4>
        ${scoreMethodBarRow(
          "①",
          "거래량",
          score.volumeScore,
          3,
          `최근 5거래일 평균 거래대금 ÷ 3개월 평균: <b>${score.volumeRatio !== null ? score.volumeRatio.toFixed(2) + "배" : "N/A"}</b> (3배 이상 만점, 0.5배 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "②",
          "한달상승",
          score.monthScore,
          3,
          `최근 1개월 가격상승: <b>${score.monthReturn !== null && score.monthReturn !== undefined ? fmtPct(score.monthReturn) : "N/A"}</b> (50% 이상 만점, 0% 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "③",
          "RSI 과매도점수",
          score.rsiScore,
          4,
          `주간 RSI(14): <b>${score.rsiWeekly !== null && score.rsiWeekly !== undefined ? Number(score.rsiWeekly).toFixed(1) : "N/A(중립 2점)"}</b> (70 이상 만점, 30 이하 0점)`,
          pressureColor
        )}
        <p class="smb-formula">① + ② + ③ = <b style="color:${pressureColor};">${score.total}/10</b>점</p>
        <p class="muted" style="font-size:11px;">높을수록 단기 상승 여력이 크다고 보는 참고용 지표이며, 투자 자문이 아닙니다.</p>
      </div>
      <div class="score-method-card">
        ${scoreMethodExampleHeaderHtml()}
        <h4>🛡️ 투자 안정 (10점 만점)</h4>
        ${creditStabilityRowHtml(risk.rating, risk.creditScore, stabilityColor)}
        ${scoreMethodBarRow(
          "②",
          "S&P500 대비 모멘텀",
          risk.marketScore,
          2,
          `S&P500과의 1년 주가상승 차이: <b>${risk.relDiff !== null ? risk.relDiff.toFixed(1) + "%p" : "N/A"}</b> (차이가 작을수록 만점)`,
          stabilityColor
        )}
        ${scoreMethodBarRow(
          "③",
          "순이익률",
          risk.marginScore,
          2,
          `순이익÷매출: <b>${risk.netMargin !== null ? (risk.netMargin * 100).toFixed(1) + "%" : "N/A"}</b> (50% 이상 만점, 적자 0점)`,
          stabilityColor
        )}
        ${scoreMethodBarRow(
          "④",
          "시가총액 가점",
          risk.vtsaxScore,
          2,
          `미국 전체 시장 내 시총 비중: <b>${risk.vtsaxWeightPct !== null ? risk.vtsaxWeightPct.toFixed(2) + "%" : "N/A"}</b> (6% 이상 만점)`,
          stabilityColor
        )}
        <p class="smb-formula">① + ② + ③ + ④ = <b style="color:${stabilityColor};">${risk.total}/10</b>점</p>
        <p class="muted" style="font-size:11px;">높을수록(10점에 가까울수록) 1년 후 하락 가능성이 낮다고 보는 참고용 지표이며, 투자 자문이 아닙니다.</p>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="error-inline" style="padding:14px;">배점 기준 예시를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// ---------- 가치평가 탭 공용 렌더러 ----------
// 처음엔 시가총액 상위 약 30개만 빠르게 조회·계산해서 보여주고(tickers는 호출부에서 이미 시총 상위 30개가
// 앞쪽에 오도록 정렬해서 넘김), "전체보기"를 누르면 나머지 S&P500 전 종목(약 470개)을 마저 조회해 다시 정렬함
async function renderValueRanking(
  tickers,
  label,
  {
    statusEl,
    resultsEl,
    buttons,
    mapFn = (list) => list,
    sortFn,
    metricHeaderHtml,
    metricExplain,
    metricCellFn,
    noteHtml,
    initialCount = 30,
    showGrade = false, // 2026-09-16 사용자 요청: 기업명 - 현재가(등락률) - 해당 항목 3칸으로 통일(딸림 승률 열 삭제)
  }
) {
  if (!guardRankingScan(resultsEl)) return; // 이미 이 결과영역에서 검색이 도는 중이면 재실행 금지
  buttons.forEach((btn) => (btn.disabled = true));
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";

  let cursor = 0;
  let rawScored = [];

  async function scoreUpTo(targetCursor) {
    targetCursor = Math.min(targetCursor, tickers.length);
    const isFullScan = targetCursor - cursor > initialCount; // 초기 배치보다 큰 구간을 한 번에 요청하면 "전체보기" 클릭으로 간주
    // "더보기" 클릭으로 이어서 불러오는 중이면(이미 버튼이 있으면) 맨 위 공지 자리 대신 그 버튼 자체에 진행 상황을 표시
    // — 화면 맨 위로 안내문이 튀지 않고 사용자가 누른 자리 그대로에서 진행률이 보이게 함
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    const setProgress = (text) => {
      if (moreBtn) {
        moreBtn.disabled = true;
        moreBtn.textContent = text;
      } else {
        statusEl.style.display = "block";
        statusEl.textContent = text;
      }
    };
    try {
      const pending = tickers.slice(cursor, targetCursor);
      if (pending.length > 0) {
        const startCursor = cursor;
        const label2 = isFullScan ? `전체 검색 중(약 1분 소요될 수 있어요)` : `${label} 확인 중`;
        setProgress(`${startCursor}/${targetCursor} 종목 ${label2}...`);
        const metricsList = await mapWithConcurrency(pending, 5, getFullMetrics, (completed) => {
          setProgress(`${startCursor + completed}/${targetCursor} 종목 ${label2}...`);
        });
        rawScored = rawScored.concat(metricsList.filter(Boolean));
        cursor = targetCursor;
      }
      statusEl.style.display = "none";

      if (rawScored.length === 0) {
        resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
        return;
      }

      const ranked = await mapFn(rawScored.slice());
      ranked.sort(sortFn);
      const hasMore = cursor < tickers.length;

      if (showGrade) await ensureWinRateDbResolved(); // 마지막 열: 10년월간승률(2026-09-04 투자안정 대체)
      const gradeCellHtml = (r) => stockWinRateCellHtml(r.symbol);

      const rows = ranked
        .map(
          (r, i) => `
        <tr>
          <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), rankDisplayName(r.symbol, r.name, false))}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
          <td>${rankPriceCellHtml(r.symbol, r.price, "USD", r.changePct)}</td>
          <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
        </tr>`
        )
        .join("");
      resultsEl.innerHTML = `
        ${rankScanCaptionHtml(ranked.length, hasMore)}
        ${TAP_HINT_HTML}
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th${metricExplain ? ` data-explain="${escapeHtml(metricExplain)}"` : ""}>${metricHeaderHtml}</th>${showGrade ? RANK_TH_WINRATE : ""}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${tickers.length}">전체보기 (나머지 ${tickers.length - cursor}개 · 500개 전부 검색 시 약 1분 소요)</button>` : ""}
        ${noteHtml || ""}
      `;
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || "분석 중 오류가 발생했습니다."}`;
    }
  }

  resultsEl._loadMore = (count) => {
    if (!beginLoadMoreScan(resultsEl, statusEl)) return; // 스캔 중 재클릭 무시 + 표 접고 진행 현황 맨 위 표시
    scoreUpTo(count).finally(() => endLoadMoreScan(resultsEl));
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      // ETF·코인 시장동향의 전체보기 버튼(자체 클릭 리스너 사용, data-next-count 없음)은 무시 —
      // 같은 결과영역(trendResults)을 공유해서 가드 없이는 두 핸들러가 경합함(2026-09-02 버그 수정)
      if (!moreBtn || !moreBtn.dataset.nextCount) return;
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  resultsEl.dataset.scanning = "1";
  try {
    await scoreUpTo(initialCount);
  } finally {
    endLoadMoreScan(resultsEl);
    buttons.forEach((btn) => (btn.disabled = false));
  }
}

const VALUE_DISCLAIMER = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> S&amp;P500 편입 종목 전체를 대상으로 계산한 순위이며 투자 자문이 아닙니다.</p>`;
const KR_VALUE_DISCLAIMER = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 코스피200+코스닥150(약 350종목) 전체를 대상으로 계산한 순위이며 투자 자문이 아닙니다.</p>`;

// 모든 랭킹 "더보기/전체보기" 공통 동작(2026-08-31 사용자 요청): 스캔 중 재클릭 방지 + 기존 상위 30개 표를 접고
// 진행 현황이 맨 위(statusEl)에 보이게 함. 시작에 성공하면 true, 이미 스캔 중이라 무시해야 하면 false를 반환
function beginLoadMoreScan(resultsEl, statusEl) {
  // Pro 멤버십 게이트는 2026-09-09 사용자 결정(비공개·로그인 승인제 운영)으로 완전히 제거 — 승인된 계정은 전부 무료
  if (resultsEl.dataset.scanning === "1") return false;
  resultsEl.dataset.scanning = "1";
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "전체 검색 준비 중...";
  statusEl.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
function endLoadMoreScan(resultsEl) {
  delete resultsEl.dataset.scanning;
}

// 종목 "전체보기"(한국 코스피200+코스닥150 350종목 / 미국 S&P500 500종목 전체 검색)는 하루 30회까지(2026-10-14 사용자 요청).
// 남은 횟수는 화면에 보여주지 않고, 31번째부터 "내일 00:00 이후 가능" 안내만 띄움. 기준일은 한국시간 00:00,
// 횟수는 이 브라우저(localStorage)에 저장 — 스톡챗 안의 임베드 화면도 같은 도메인이라 같은 횟수를 공유함.
// ETF·코인·IPO 전체보기와 "더보기(30개씩)"는 대상 아님. 모든 종목 전체보기 버튼이 클릭 이벤트 하나로 모이므로 캡처 단계에서 한 번에 막음.
const FULL_SCAN_DAILY_LIMIT = Infinity; // 2026-10-21 사용자 요청: 하루 30회 제한 삭제(제한 없음)
const FULL_SCAN_QUOTA_KEY = "full_scan_quota_v1";
const FULL_SCAN_LIMIT_MSG = "오늘 전체 검색 30회를 모두 사용했어요. 00:00 이후에 다시 이용할 수 있어요.";
function isStockFullScanBtn(btn) {
  if (!btn || !btn.classList || !btn.classList.contains("load-more-btn")) return false;
  const t = (btn.textContent || "").trim();
  if (!t.startsWith("전체보기")) return false;
  return t.includes("나머지") || btn.classList.contains("stock-vol-more-btn");
}
function consumeFullScanQuota() {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  let q = null;
  try {
    q = JSON.parse(localStorage.getItem(FULL_SCAN_QUOTA_KEY) || "null");
  } catch {}
  if (!q || q.day !== today) q = { day: today, n: 0 };
  if (q.n >= FULL_SCAN_DAILY_LIMIT) return false;
  q.n += 1;
  try {
    localStorage.setItem(FULL_SCAN_QUOTA_KEY, JSON.stringify(q));
  } catch {}
  return true;
}
document.addEventListener(
  "click",
  (e) => {
    const btn = e.target && e.target.closest ? e.target.closest(".load-more-btn") : null;
    if (!isStockFullScanBtn(btn)) return;
    if (consumeFullScanQuota()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    btn.textContent = FULL_SCAN_LIMIT_MSG;
    btn.disabled = true;
    showToast(FULL_SCAN_LIMIT_MSG);
  },
  true
);
// 랭킹 서브버튼 재클릭용 가드 — 이미 그 결과영역에서 스캔이 돌고 있으면 토스트만 띄우고 무시
function guardRankingScan(resultsEl) {
  if (resultsEl.dataset.scanning === "1") {
    showToast("검색 중입니다. 잠시만 기다려주세요");
    return false;
  }
  return true;
}

// "시가총액 상위 N개 확인" 캡션 + 실시간 새로고침 버튼(2026-08-31: 제목줄 새로고침 버튼을 랭킹 결과 안 이 자리로 이동) —
// 버튼을 누르면 스캔 캐시를 비우고 현재 선택된 랭킹을 현시간 기준으로 다시 검색함
// 2026-09-14 사용자 요청: "시가총액 N위까지 검색됨" 문구와 위쪽 새로고침·+전체보기 버튼을 모두 없애 공간 확보 —
// 새로고침은 화면을 아래로 당기면(initPullToRefresh), 전체보기는 표 아래 버튼으로만 한다
function rankScanCaptionHtml(count, canLoadMore) {
  return "";
}

// 랭킹 결과가 전체 종목이 아니라 시가총액 상위 일부만 스캔한 상태일 때, 공지 바로 밑에 주황색으로 표시하는 주의문.
// canLoadMore=true면 "더보기"로 전체를 마저 확인할 수 있는 경우(단계적 스캔), false면 이 화면에서는 더 볼 방법이 없는 경우(상위 30개 고정)
// 2026-09-10 사용자 요청: "지금 결과는 전체 N종목이 아닌 ..." 긴 경고 문구는 삭제하고
// "시가총액 상위 N개 확인" 캡션 + "+전체보기" 버튼만 남김(rankScanCaptionHtml이 없는 화면에서 이걸 사용)
// 2026-09-14 사용자 요청으로 문구·버튼 삭제(rankScanCaptionHtml 참고) — 호출부는 그대로 두고 빈 문자열만 반환
function topCapNoteHtml(shown, total, canLoadMore) {
  return "";
}

// ---------- 랭킹 공용 인프라: 종목 목록을 시가총액 우선순으로 필요한 만큼만 스캔하는 단계적 캐시 ----------
// 접속 직후엔 시가총액 상위 30개까지만 스캔해서 빠르게 보여주고, "전체보기"를 눌러야 그때 나머지를 이어서
// 스캔함. getTickers()가 반환하는 순서가 이미 시가총액 내림차순이어야 함
// (KR: getKrUniverseTickers = KODEX 200/코스닥150 ETF 편입 비중순, US: getSP500PriorityOrder = 시가총액순).
// 랭킹 새로고침(실시간 재검색)용 — 각 단계적 스캔 캐시를 비우는 리셋 함수 모음(아래로 당겨 새로고침 시 전부 실행 — refreshTopRankingView)
const RANK_SCAN_RESETTERS = [];
function makeIncrementalScan(getTickers, worker, concurrency) {
  const state = { tickers: null, items: [], cursor: 0, inflight: null };
  RANK_SCAN_RESETTERS.push(() => {
    if (state.inflight) return; // 조회가 진행 중이면 건드리지 않음(스캔 가드가 재실행 자체를 막고 있음)
    state.tickers = null;
    state.items = [];
    state.cursor = 0;
  });
  return async function ensure(targetCount, onProgress) {
    if (!state.tickers) state.tickers = await getTickers();
    const total = state.tickers.length;
    targetCount = Math.min(targetCount, total);
    while (state.cursor < targetCount) {
      if (state.inflight) {
        await state.inflight.catch(() => {});
        continue;
      }
      const startCursor = state.cursor;
      const pending = state.tickers.slice(startCursor, targetCount);
      state.inflight = mapWithConcurrency(pending, concurrency, worker, (completed) => {
        if (onProgress) onProgress(startCursor + completed, targetCount, total);
      })
        .then((results) => {
          state.items = state.items.concat(results.filter(Boolean));
          state.cursor = targetCount;
        })
        .finally(() => {
          state.inflight = null;
        });
      await state.inflight;
    }
    return { items: state.items.slice(), total };
  };
}

// 기업가치(매출액·현금흐름·순이익 증가, EPS, PER, 투자안정, 시가총액)와 투자동향의 상승압력이 공유하는
// 국내(KR) 무거운 스캔(종목당 재무제표까지 조회)
const ensureKrFullMetrics = makeIncrementalScan(getKrUniverseTickers, (symbol) => getFullMetrics(symbol).catch(() => null), 5);

let krDailyChangesPromise = null;
function getKrDailyChanges() {
  if (!krDailyChangesPromise) {
    krDailyChangesPromise = (async () => {
      const tickers = await getKrUniverseTickers();
      const results = await mapWithConcurrency(tickers, 15, async (symbol) => {
        const chart = await yahooChart(symbol, "5d", "1d").catch(() => null);
        const changePct = getDailyChangePercent(chart);
        const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
        if (changePct === null || !meta || meta.regularMarketPrice === undefined) return null;
        const volume = meta.regularMarketVolume !== undefined ? meta.regularMarketVolume : null;
        // 거래대금(2026-09-16 사용자 요청): 오늘 거래가 아직 없거나 장이 끝나 값이 비면 바로 전 거래일 값을 쓰고,
        // 어느 날 기준인지(dollarVolumeAt)도 같이 넘긴다. 5일 일봉에서 거래량이 잡힌 마지막 날을 고른다.
        const res = chart.chart.result[0];
        const q = res.indicators && res.indicators.quote && res.indicators.quote[0];
        let dollarVolume = null;
        let dollarVolumeAt = null;
        if (q && Array.isArray(res.timestamp)) {
          for (let i = res.timestamp.length - 1; i >= 0; i--) {
            const v = q.volume ? q.volume[i] : null;
            const c = q.close ? q.close[i] : null;
            if (Number.isFinite(v) && v > 0 && Number.isFinite(c)) {
              dollarVolume = c * v;
              dollarVolumeAt = res.timestamp[i];
              break;
            }
          }
        }
        if (dollarVolume === null && volume) dollarVolume = meta.regularMarketPrice * volume;
        return {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          price: meta.regularMarketPrice,
          currency: meta.currency,
          changePct,
          volume,
          dollarVolume,
          dollarVolumeAt,
        };
      });
      return results.filter(Boolean);
    })().catch((e) => {
      krDailyChangesPromise = null;
      throw e;
    });
  }
  return krDailyChangesPromise;
}

// dataPromiseFn: getKrDailyChanges(가벼운 스캔, 상승률·하락률·인기종목용) — 무거운 스캔(기업가치·상승압력)은
// 이제 renderKrRankingStaged가 ensureKrFullMetrics로 단계적으로 처리함
// showGrade: 투자안정 점수를 별도 열로 덧붙일지(투자안정 랭킹 자체는 그 점수가 이미 metricCellFn에 있으므로 false)
async function renderKrRanking(dataPromiseFn, label, statusEl, resultsEl, { mapFn = (list) => list, sortFn, metricHeaderHtml, metricExplain, metricCellFn, noteHtml, showGrade = false, prefixHtml }) {
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = `코스피200+코스닥150 - ${label} 계산 중(약 1분 소요될 수 있어요)...`;

  try {
    const [raw, nameMap] = await Promise.all([dataPromiseFn(), getKrSymbolNameMap().catch(() => new Map())]);
    statusEl.style.display = "none";
    if (!raw || raw.length === 0) {
      resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }
    const ranked = await mapFn(raw.slice());
    ranked.sort(sortFn);
    const top50 = ranked.slice(0, 50);

    if (showGrade) await ensureWinRateDbResolved(); // 마지막 열: 10년월간승률(2026-09-04 투자안정 대체)
    const gradeCellHtml = (r) => stockWinRateCellHtml(r.symbol);

    const rowHtml = (r, i) => `
      <tr>
        <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), nameMap.get(r.symbol) || r.symbol)}${r.fiveDayExtremes ? surgeWarningEmoji(r.fiveDayExtremes) : ""}</td>
        <td>${
          r.price !== undefined && r.price !== null
            ? rankPriceCellHtml(r.symbol, r.price, r.currency, r.changePct)
            : "N/A"
        }</td>
        <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
      </tr>`;

    function paint(initialCount) {
      const visible = top50.slice(0, initialCount);
      const rest = top50.slice(initialCount);
      resultsEl.innerHTML = `
        ${typeof prefixHtml === "function" ? prefixHtml(top50) : prefixHtml || ""}
        ${TAP_HINT_HTML}
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th${metricExplain ? ` data-explain="${escapeHtml(metricExplain)}"` : ""}>${metricHeaderHtml}</th>${showGrade ? RANK_TH_WINRATE : ""}</tr></thead>
          <tbody>${visible.map(rowHtml).join("")}</tbody>
        </table>
        ${rest.length ? `<button type="button" class="cat-btn load-more-btn">더보기 (${visible.length}/${top50.length})</button>` : ""}
        ${noteHtml || ""}
      `;
      // 결과 영역(valuationResults/trendResults)에는 다른 랭킹(renderValueRanking·scoreAndRenderMovers)이 이미 붙여둔
      // ".load-more-btn" 위임 리스너가 남아있을 수 있어, 그 핸들러가 이 클릭까지 가로채 다른 결과로 덮어쓰지 않도록 버블링을 막음
      const moreBtn = resultsEl.querySelector(".load-more-btn");
      if (moreBtn) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          resultsEl.querySelector("tbody").insertAdjacentHTML("beforeend", rest.map((r, i) => rowHtml(r, initialCount + i)).join(""));
          moreBtn.remove();
        });
      }
    }
    paint(20);
  } catch (err) {
    statusEl.textContent = `❌ ${err.message || "오류가 발생했습니다."}`;
  }
}

// 국내(KR) "기업가치" 7종 + "상승 압력" 전용 렌더러 — renderKrRanking과 달리 접속 직후엔 시가총액 상위
// 30개만 실제로 스캔해서 보여주고(ensureKrFullMetrics), "전체보기"를 눌러야 그때 나머지를 이어서 스캔함
// (renderValueRanking의 미국 버전과 동일한 체감 속도를 내기 위함)
async function renderKrRankingStaged(label, statusEl, resultsEl, { mapFn = (list) => list, sortFn, metricHeaderHtml, metricExplain, metricCellFn, noteHtml, showGrade = false, initialCount = 30 }) {
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";

  async function paintUpTo(targetCount) {
    try {
      const isFullScan = targetCount > initialCount;
      // "더보기" 클릭으로 이어서 불러오는 중이면(이미 버튼이 있으면) 맨 위 공지 자리 대신 그 버튼 자체에 진행 상황을 표시
      const moreBtn = resultsEl.querySelector(".load-more-btn");
      const setProgress = (text) => {
        if (moreBtn) {
          moreBtn.disabled = true;
          moreBtn.textContent = text;
        } else {
          statusEl.style.display = "block";
          statusEl.textContent = text;
        }
      };
      setProgress(isFullScan ? `전체 검색 중(약 1분 소요될 수 있어요)...` : `코스피200+코스닥150 - ${label} 계산 중...`);
      const [{ items: raw, total }, nameMap] = await Promise.all([
        ensureKrFullMetrics(targetCount, (done, target) => {
          setProgress(`${done}/${target} 종목 ${isFullScan ? "전체" : label} 확인 중...`);
        }),
        getKrSymbolNameMap().catch(() => new Map()),
      ]);
      statusEl.style.display = "none";
      if (!raw || raw.length === 0) {
        resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
        return;
      }

      const ranked = await mapFn(raw.slice());
      ranked.sort(sortFn);
      const hasMore = targetCount < total;

      if (showGrade) await ensureWinRateDbResolved(); // 마지막 열: 10년월간승률(2026-09-04 투자안정 대체)
      const gradeCellHtml = (r) => stockWinRateCellHtml(r.symbol);

      const rows = ranked
        .map(
          (r, i) => `
        <tr>
          <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), nameMap.get(r.symbol) || r.symbol)}${r.fiveDayExtremes ? surgeWarningEmoji(r.fiveDayExtremes) : ""}</td>
          <td>${
          r.price !== undefined && r.price !== null
            ? rankPriceCellHtml(r.symbol, r.price, r.currency, r.changePct)
            : "N/A"
        }</td>
          <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
        </tr>`
        )
        .join("");
      resultsEl.innerHTML = `
        ${rankScanCaptionHtml(ranked.length, hasMore)}
        ${TAP_HINT_HTML}
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th${metricExplain ? ` data-explain="${escapeHtml(metricExplain)}"` : ""}>${metricHeaderHtml}</th>${showGrade ? RANK_TH_WINRATE : ""}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${total}">전체보기 (나머지 ${total - targetCount}개 · 전체 검색 시 약 1분 소요)</button>` : ""}
        ${noteHtml || ""}
      `;
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || "오류가 발생했습니다."}`;
    }
  }

  resultsEl._loadMore = (count) => {
    if (!beginLoadMoreScan(resultsEl, statusEl)) return; // 스캔 중 재클릭 무시 + 표 접고 진행 현황 맨 위 표시
    paintUpTo(count).finally(() => endLoadMoreScan(resultsEl));
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      // ETF·코인 시장동향의 전체보기 버튼(자체 클릭 리스너 사용, data-next-count 없음)은 무시 —
      // 같은 결과영역(trendResults)을 공유해서 가드 없이는 두 핸들러가 경합함(2026-09-02 버그 수정)
      if (!moreBtn || !moreBtn.dataset.nextCount) return;
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  if (!guardRankingScan(resultsEl)) return; // 이미 이 결과영역에서 검색이 도는 중이면 재실행 금지
  resultsEl.dataset.scanning = "1";
  try {
    await paintUpTo(initialCount);
  } finally {
    endLoadMoreScan(resultsEl);
  }
}

// 가치평가 서브내비에서 현재 선택된 버튼만 활성 표시
function setValuationActive(activeBtn) {
  Object.values(valuationButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindValuation = (btn, run) =>
  btn.addEventListener("click", () => {
    setValuationActive(btn);
    run();
  });

async function runValueScreenFromSP500(btn, label, opts) {
  setValuationActive(btn);

  if (getWatchlistActiveMarket() === "KR") {
    const krOpts = { ...opts, noteHtml: opts.noteHtml === VALUE_DISCLAIMER ? KR_VALUE_DISCLAIMER : opts.noteHtml };
    await renderKrRankingStaged(label, valuationStatus, valuationResults, krOpts);
    return;
  }

  valuationStatus.style.display = "block";
  valuationStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500PriorityOrder().catch((e) => {
    valuationStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;
  await renderValueRanking(allTickers, label, {
    statusEl: valuationStatus,
    resultsEl: valuationResults,
    buttons: [btn],
    ...opts,
  });
}

const fmtGrowthCell = (v) => (v === null || v === undefined ? "N/A" : `<span class="${v >= 0 ? "delta-up" : "delta-down"}">${fmtPct(v, 1)}</span>`);

async function runValueRevenue() {
  await runValueScreenFromSP500(valuationButtons.revenue, "매출액 증가", {
    sortFn: (a, b) => (b.revenueGrowthAnnual ?? -Infinity) - (a.revenueGrowthAnnual ?? -Infinity),
    metricHeaderHtml: `매출 증가율${THEAD_SUB("YoY")}`,
    metricExplain: "매출 증가율(YoY) — 직전 분기 매출액을 1년 전 같은 분기와 비교한 증가율입니다. 계절성 영향을 줄이려고 전분기가 아니라 작년 같은 분기와 비교합니다.",
    metricCellFn: (r) => fmtGrowthCell(r.revenueGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueCashFlow() {
  await runValueScreenFromSP500(valuationButtons.cashFlow, "현금흐름 증가", {
    sortFn: (a, b) => (b.operatingCashFlowGrowthAnnual ?? -Infinity) - (a.operatingCashFlowGrowthAnnual ?? -Infinity),
    metricHeaderHtml: `현금흐름 증가${THEAD_SUB("YoY")}`,
    metricExplain: "현금흐름 증가(YoY) — 직전 분기 영업활동 현금흐름을 1년 전 같은 분기와 비교한 증가율입니다. 장부상 이익이 아니라 실제로 들어온 현금 기준입니다.",
    metricCellFn: (r) => fmtGrowthCell(r.operatingCashFlowGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueNetIncome() {
  await runValueScreenFromSP500(valuationButtons.netIncome, "순이익 증가", {
    sortFn: (a, b) => (b.netIncomeGrowthAnnual ?? -Infinity) - (a.netIncomeGrowthAnnual ?? -Infinity),
    metricHeaderHtml: `순이익 증가${THEAD_SUB("YoY")}`,
    metricExplain: "순이익 증가(YoY) — 직전 분기 순이익을 1년 전 같은 분기와 비교한 증가율입니다. 적자에서 흑자로 돌아선 경우처럼 기준이 음수면 증가율이 왜곡될 수 있습니다.",
    metricCellFn: (r) => fmtGrowthCell(r.netIncomeGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueEps() {
  await runValueScreenFromSP500(valuationButtons.eps, "EPS", {
    sortFn: (a, b) => (b.eps ?? -Infinity) - (a.eps ?? -Infinity),
    metricHeaderHtml: `EPS${THEAD_SUB("주당순이익")}`,
    metricExplain: "EPS(주당순이익) — 순이익을 발행 주식 수로 나눈 값입니다. 주식 1주가 벌어들인 이익을 뜻합니다.",
    metricCellFn: (r) => (r.eps === null || r.eps === undefined ? "N/A" : fmtEpsValue(r.eps, r.currency)),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValuePer() {
  await runValueScreenFromSP500(valuationButtons.per, "PER", {
    sortFn: (a, b) => (a.per ?? Infinity) - (b.per ?? Infinity),
    metricHeaderHtml: `PER${THEAD_SUB("현재가")}`,
    metricExplain: "PER — 현재가를 주당순이익(EPS)으로 나눈 배수입니다. 지금 이익 수준이 유지된다면 원금 회수에 몇 년이 걸리는지로 읽고, 낮을수록 저평가로 봅니다.",
    metricCellFn: (r) => (r.per === null || r.per === undefined ? "N/A" : `<b class="rank-hl">${r.per.toFixed(1)}배</b>`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> PER = 현재가 ÷ 최근 회계연도 EPS(낮을수록 저평가), 적자 기업은 N/A 처리되어 순위에서 제외됩니다. 투자 자문이 아닙니다.</p>`,
  });
}

async function runValueStability() {
  const { sp500Return, kospi200Return } = await getMarketReturns();
  await runValueScreenFromSP500(valuationButtons.stability, "투자 안정", {
    mapFn: (list) =>
      list.map((m) => ({ ...m, riskTotal: computeRiskScore(m, sp500Return, kospi200Return).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.riskTotal - a.riskTotal,
    metricHeaderHtml: "투자 안정 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.riskTotal, r.riskTotal)),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 투자 안정 점수(10점 만점, 높을수록 재무적으로 안정적)는 재무안정·모멘텀·수익성·시가총액을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
    showGrade: false,
  });
}

async function runValueMarketCap() {
  await runValueScreenFromSP500(valuationButtons.marketCap, "시가총액", {
    sortFn: (a, b) => (b.marketCap || 0) - (a.marketCap || 0),
    metricHeaderHtml: "시가총액",
    metricExplain: "시가총액 — 현재가 × 발행 주식 수, 즉 회사 전체의 시장 가격입니다.",
    metricCellFn: (r) => (r.marketCap ? `<b class="rank-hl">${fmtAmountUnified(r.marketCap, r.currency)}</b>` : "N/A"),
    noteHtml: VALUE_DISCLAIMER,
  });
}

// ---------- 인기종목 표 렌더러(2026-09-10 사용자 요청) ----------
// 회색 박스 + 7열: 로고+종목 / -5M~-1M 직전 5개월 등락 / 10년월간승률(순위 표 공통 보라 글씨).
// 좁은 화면에서도 한 줄에 들어가도록 종목명은 7글자까지만 남기고 뒤는 ".."로 줄임.
// 2026-09-10 추가 요청: 기업명 앞에 큰 로고를 넣는 대신 연평균 상승 열은 삭제(자리 확보),
// 상단에 있던 대표 2종목 예시 표(삼성전자·SK하이닉스 / 엔비디아·애플 등)도 삭제
const POPULAR_SNAP_MONTHS = 5;
// 승률 DB의 m12(최근 12개월 월간 등락%, 마지막 원소 = 배치 시점에 진행 중이던 달)에서 직전 5개 완성월만 추출
function monthlyFromM12(e) {
  const m12 = e && Array.isArray(e.m12) ? e.m12 : null;
  if (!m12 || m12.length < 2) return [];
  return m12.slice(-1 - POPULAR_SNAP_MONTHS, -1);
}
// ---------- 인기종목 직전 결과 캐시(2026-09-07 사용자 요청): 휴장·장 마감·시세 장애 때도 마지막 인기종목을 그대로 보여줌 ----------
function popularCacheKey(isKr) {
  return `popular_last_v5_${isKr ? "kr" : "us"}`; // v5(2026-10-06): 순위 기준이 거래량 배수로 바뀌어 옛(거래대금순) 캐시는 버림
}
// 인기종목 새로고침용 — 직전 결과 캐시를 비워 실시간으로 다시 받게 함(2026-09-11)
function popularSnapshotResetCaches() {
  try {
    localStorage.removeItem(popularCacheKey(true));
    localStorage.removeItem(popularCacheKey(false));
    ["v1", "v2", "v3", "v4"].forEach((v) => ["kr", "us"].forEach((m) => localStorage.removeItem(`popular_last_${v}_${m}`)));
  } catch {}
  etfScanStateByRegion.clear();
  cryptoScanState.rows = [];
  cryptoScanState.scanned = 0;
}
// 인기종목 안내 문구 3개를 번갈아(2026-10-07 사용자 요청: 화면에 움직이는 느낌) — 표를 다시 그려도 순서가 이어지도록 번호는 전역
const POPULAR_HINTS = ["모든 항목은 눌러서 자세히 볼 수 있습니다.", "종목을 클릭하면 미래 예측도 가능합니다.", "종목을 눌러 승률 정보를 꼭 확인해 보세요."];
let popularHintIdx = 0;
if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
  setInterval(() => {
    popularHintIdx = (popularHintIdx + 1) % POPULAR_HINTS.length;
    document.querySelectorAll(".pop-hint-text").forEach((n) => {
      let set = { sr: SR_HINTS, rank: RANK_HINTS, ia: IA_HINTS }[n.dataset.hintSet] || POPULAR_HINTS;
      if (set === RANK_HINTS) {
        // 같은 결과 묶음 안에 보이는 더보기/전체보기 버튼이 없으면 첫 문구만(바꾸지 않음)
        let box = n.closest(".tap-hint");
        for (let i = 0; i < 3 && box && box.parentElement; i++) box = box.parentElement;
        const moreBtn = box && [...box.querySelectorAll(".load-more-btn")].find((b) => b.offsetParent !== null);
        if (!moreBtn) {
          if (n.textContent !== `* ${RANK_HINTS[0]}`) n.textContent = `* ${RANK_HINTS[0]}`;
          return;
        }
        n.dataset.rankMore = rankMoreHintText(moreBtn, box);
      }
      // 문구 수가 다른 묶음(2개·3개)이 전역 번호 하나를 나눠 쓰면 1→2→1→1처럼 겹쳐 나와서(2026-10-08 사용자 지적)
      // 인기종목(3개, 다시 그려도 이어지게 전역 번호) 말고는 문구마다 자기 번호로 1→2→1→2
      const idx = set === POPULAR_HINTS ? popularHintIdx : (Number(n.dataset.hintIdx || 0) + 1) % set.length;
      n.dataset.hintIdx = String(idx);
      n.classList.add("out");
      setTimeout(() => {
        n.textContent = `* ${set === RANK_HINTS && idx === 1 && n.dataset.rankMore ? n.dataset.rankMore : set[idx]}`;
        n.classList.remove("out");
      }, 350);
    });
  }, 3500);
}
// ---------- ETF 섹션 인기종목(2026-09-01 개편): 시가총액(순자산) 상위 — 한국 TOP100 + 미국 TOP100, 총 200개 ----------
// 한국: 네이버 ETF 목록 API(전체 1100여 개, 시총·현재가·등락률 포함)를 시총순 정렬해 상위 100개 사용(실시간).
// 미국: 공개 API로는 순자산 정렬이 불가(야후 커스텀 스크리너는 crumb 인증 필요, top_etfs_us 풀엔 SPY·VOO 등 대형이 빠짐)해서
//       순자산(AUM) 순 큐레이션 목록(2026-09 기준, 수동 갱신 필요)을 쓰고 시세는 차트에서 실시간 조회.
const US_ETF_TOP100 = [
  { t: "VOO", n: "Vanguard S&P 500" }, { t: "IVV", n: "iShares Core S&P 500" }, { t: "SPY", n: "SPDR S&P 500" },
  { t: "VTI", n: "Vanguard Total Stock Market" }, { t: "QQQ", n: "Invesco QQQ Trust" }, { t: "VUG", n: "Vanguard Growth" },
  { t: "VEA", n: "Vanguard FTSE Developed Markets" }, { t: "IEFA", n: "iShares Core MSCI EAFE" }, { t: "GLD", n: "SPDR Gold Shares" },
  { t: "VTV", n: "Vanguard Value" }, { t: "BND", n: "Vanguard Total Bond Market" }, { t: "AGG", n: "iShares Core U.S. Aggregate Bond" },
  { t: "IWF", n: "iShares Russell 1000 Growth" }, { t: "IBIT", n: "iShares Bitcoin Trust" }, { t: "SPLG", n: "SPDR Portfolio S&P 500" },
  { t: "IJH", n: "iShares Core S&P Mid-Cap" }, { t: "VGT", n: "Vanguard Information Technology" }, { t: "IEMG", n: "iShares Core MSCI Emerging Markets" },
  { t: "VXUS", n: "Vanguard Total International Stock" }, { t: "VWO", n: "Vanguard FTSE Emerging Markets" }, { t: "VIG", n: "Vanguard Dividend Appreciation" },
  { t: "XLK", n: "Technology Select Sector SPDR" }, { t: "IJR", n: "iShares Core S&P Small-Cap" }, { t: "SCHD", n: "Schwab U.S. Dividend Equity" },
  { t: "ITOT", n: "iShares Core S&P Total Market" }, { t: "RSP", n: "Invesco S&P 500 Equal Weight" }, { t: "IVW", n: "iShares S&P 500 Growth" },
  { t: "SGOV", n: "iShares 0-3 Month Treasury Bond" }, { t: "IWM", n: "iShares Russell 2000" }, { t: "QQQM", n: "Invesco NASDAQ 100" },
  { t: "BIL", n: "SPDR 1-3 Month T-Bill" }, { t: "VO", n: "Vanguard Mid-Cap" }, { t: "SCHX", n: "Schwab U.S. Large-Cap" },
  { t: "SMH", n: "VanEck Semiconductor" }, { t: "TLT", n: "iShares 20+ Year Treasury Bond" }, { t: "IWD", n: "iShares Russell 1000 Value" },
  { t: "VYM", n: "Vanguard High Dividend Yield" }, { t: "EFA", n: "iShares MSCI EAFE" }, { t: "JEPI", n: "JPMorgan Equity Premium Income" },
  { t: "VB", n: "Vanguard Small-Cap" }, { t: "IAU", n: "iShares Gold Trust" }, { t: "DIA", n: "SPDR Dow Jones Industrial Average" },
  { t: "QUAL", n: "iShares MSCI USA Quality Factor" }, { t: "VT", n: "Vanguard Total World Stock" }, { t: "JEPQ", n: "JPMorgan Nasdaq Equity Premium Income" },
  { t: "SCHG", n: "Schwab U.S. Large-Cap Growth" }, { t: "LQD", n: "iShares iBoxx $ IG Corporate Bond" }, { t: "VCIT", n: "Vanguard Intermediate-Term Corporate Bond" },
  { t: "MUB", n: "iShares National Muni Bond" }, { t: "JPST", n: "JPMorgan Ultra-Short Income" }, { t: "DGRO", n: "iShares Core Dividend Growth" },
  { t: "XLF", n: "Financial Select Sector SPDR" }, { t: "VCSH", n: "Vanguard Short-Term Corporate Bond" }, { t: "MBB", n: "iShares MBS" },
  { t: "GOVT", n: "iShares U.S. Treasury Bond" }, { t: "IEF", n: "iShares 7-10 Year Treasury Bond" }, { t: "USMV", n: "iShares MSCI USA Min Vol Factor" },
  { t: "SCHF", n: "Schwab International Equity" }, { t: "SCHB", n: "Schwab U.S. Broad Market" }, { t: "DFAC", n: "Dimensional U.S. Core Equity 2" },
  { t: "VTEB", n: "Vanguard Tax-Exempt Bond" }, { t: "XLV", n: "Health Care Select Sector SPDR" }, { t: "IXUS", n: "iShares Core MSCI Total International" },
  { t: "VNQ", n: "Vanguard Real Estate" }, { t: "IUSB", n: "iShares Core Total USD Bond Market" }, { t: "SHY", n: "iShares 1-3 Year Treasury Bond" },
  { t: "BSV", n: "Vanguard Short-Term Bond" }, { t: "COWZ", n: "Pacer US Cash Cows 100" }, { t: "VGIT", n: "Vanguard Intermediate-Term Treasury" },
  { t: "AVUV", n: "Avantis U.S. Small Cap Value" }, { t: "IWB", n: "iShares Russell 1000" }, { t: "IWR", n: "iShares Russell Mid-Cap" },
  { t: "MGK", n: "Vanguard Mega Cap Growth" }, { t: "SOXX", n: "iShares Semiconductor" }, { t: "XLE", n: "Energy Select Sector SPDR" },
  { t: "SHV", n: "iShares Short Treasury Bond" }, { t: "BIV", n: "Vanguard Intermediate-Term Bond" }, { t: "EMB", n: "iShares J.P. Morgan USD EM Bond" },
  { t: "VOOG", n: "Vanguard S&P 500 Growth" }, { t: "SPYG", n: "SPDR Portfolio S&P 500 Growth" }, { t: "SPYV", n: "SPDR Portfolio S&P 500 Value" },
  { t: "USFR", n: "WisdomTree Floating Rate Treasury" }, { t: "PFF", n: "iShares Preferred & Income Securities" }, { t: "MDY", n: "SPDR S&P MidCap 400" },
  { t: "XLY", n: "Consumer Discretionary Select SPDR" }, { t: "XLI", n: "Industrial Select Sector SPDR" }, { t: "VHT", n: "Vanguard Health Care" },
  { t: "FBTC", n: "Fidelity Wise Origin Bitcoin" }, { t: "GLDM", n: "SPDR Gold MiniShares" }, { t: "VDC", n: "Vanguard Consumer Staples" },
  { t: "ACWI", n: "iShares MSCI ACWI" }, { t: "EWJ", n: "iShares MSCI Japan" }, { t: "VV", n: "Vanguard Large-Cap" },
  { t: "DVY", n: "iShares Select Dividend" }, { t: "FTEC", n: "Fidelity MSCI Information Technology" }, { t: "VBR", n: "Vanguard Small-Cap Value" },
  { t: "TQQQ", n: "ProShares UltraPro QQQ" }, { t: "SDY", n: "SPDR S&P Dividend" }, { t: "NOBL", n: "ProShares S&P 500 Dividend Aristocrats" },
  { t: "MOAT", n: "VanEck Morningstar Wide Moat" },
];
US_ETF_TOP100.forEach((x) => registerEtfName(x.t, x.n)); // 이모지 로고용 이름 등록(2026-09-11)

let etfPopularRegion = "us";
let krEtfFullListPromise = null;
// 한국 ETF 목록 전체(시총순, data/etf-marketcap.json DB 기반 — 2026-09-01 네이버 실시간 조회에서 전환)
// TOP100 표시와 ETF 투자안정 ③(시가총액) 조회가 공유. 시세·등락률은 어차피 차트 스캔에서 실시간으로 계산함
function getKrEtfFullList() {
  if (!krEtfFullListPromise) {
    krEtfFullListPromise = getEtfMarketCapDb()
      .then((db) =>
        (db.kr || [])
          .filter((it) => it && it.s)
          .sort((a, b) => (b.m || 0) - (a.m || 0))
          .map((it) => ({ symbol: it.s, name: it.n, marketSum: it.m }))
      )
      .then((list) => {
        // 섹션 마크·ETF 상세 판별(sectionOfSymbol)이 국내 전체 ETF를 ETF로 인식하도록 등록
        list.forEach((it) => {
          knownEtfSet().add(it.symbol);
          // 한글 상품명이 정답 — 먼저 등록된 야후 영문명이 있어도 덮어씀(2026-09-13)
          if (it.symbol && it.name) ETF_NAME_BY_SYMBOL.set(it.symbol, it.name);
        });
        return list;
      })
      .catch((e) => {
        krEtfFullListPromise = null; // 실패는 캐시하지 않음
        throw e;
      });
  }
  return krEtfFullListPromise;
}
function getKrEtfTop100() {
  return getKrEtfFullList().then((list) => list.slice(0, 100));
}
const KR_ETF_BRAND_BADGE_POPULAR = { KODEX: "KX", TIGER: "TG", KBSTAR: "KB", KOSEF: "KS", RISE: "RS", SOL: "SL", ACE: "AC", PLUS: "PL", HANARO: "HN" };

// 차트 1회 조회로 상승압력·투자안정 계산에 필요한 입력을 전부 뽑아냄(거래대금 비율·3개월 모멘텀·1년 상승률·30일 변동성·현재가)
function chartCloseVolumePairs(chart) {
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return [];
  const ts = result.timestamp || [];
  const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
  const closes = q.close || [];
  const vols = q.volume || [];
  const pairs = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] !== null && closes[i] !== undefined) pairs.push({ t: ts[i], c: closes[i], v: vols[i] !== null && vols[i] !== undefined ? vols[i] : 0 });
  }
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}
// opts.fiveYear: 5년 차트로 조회해 5년 평균 성장률(CAGR)까지 계산(ETF 투자안정 ③, 2026-09-03) —
// 이때도 거래대금·모멘텀·변동성·52주 위치 등 나머지 지표는 기존과 동일하게 "최근 1년 구간"만으로 계산한다
async function computeChartDerivedMetrics(symbol, opts) {
  const fiveYear = !!(opts && opts.fiveYear);
  const chart = await yahooChart(symbol, fiveYear ? "5y" : "1y", "1d");
  const allPairs = chartCloseVolumePairs(chart);
  if (allPairs.length < 10) return null;
  const lastAll = allPairs[allPairs.length - 1];
  // 최근 1년 구간(5년 조회 시 슬라이스) — 기존 1y 조회와 동일한 계산 창
  const pairs = fiveYear ? allPairs.filter((p) => p.t >= lastAll.t - 365 * 86400) : allPairs;
  if (pairs.length < 10) return null;
  const last = pairs[pairs.length - 1];
  const prev = pairs[pairs.length - 2];

  const dvs = pairs.map((p) => p.c * p.v);
  const recent = dvs.slice(-5);
  const recentDollarVolume = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgDollarVolume1y = dvs.reduce((a, b) => a + b, 0) / dvs.length;
  // 최근 3개월 평균 거래대금(코인 상승압력 ①, 2026-09-03)
  const dv3mArr = pairs.filter((p) => p.t >= last.t - 91 * 86400).map((p) => p.c * p.v);
  const avgDollarVolume3m = dv3mArr.length ? dv3mArr.reduce((a, b) => a + b, 0) / dv3mArr.length : null;

  const target3m = last.t - 91 * 86400;
  let base3m = null;
  let minDiff = Infinity;
  for (const p of pairs) {
    const d = Math.abs(p.t - target3m);
    if (d < minDiff) {
      minDiff = d;
      base3m = p;
    }
  }
  const momentum3m_raw = base3m && base3m.c ? ((last.c - base3m.c) / base3m.c) * 100 : null;
  // 1년 수익률 보정(2026-09-13 사용자 지적 "코인 수익률 1000% 넘는 종목"):
  //  ① 상장 1년이 안 된 종목은 야후가 상장일부터만 줘서, 상장가 대비 상승률이 1년 수익률로 둔갑됐다(예: Bitway 6개월 +8,316%) → N/A
  //  ② 하루에 20배 이상 뛰거나 1/20로 떨어진 가격 단절은 실제 등락이 아니라 액면 변경·토큰 교환(1,000:1 리디노미네이션 등)
  //     (예: 그램·데시멀이 하루 만에 약 1,000배) → 그 구간을 잇는 수익률·변동성은 의미가 없어 N/A
  const isBreakStep = (a, b) => a > 0 && b > 0 && (b / a >= 20 || a / b >= 20);
  let lastBreakT = null; // 가장 최근 단절 시각 — 그 이전을 기준점으로 쓰는 수익률은 전부 무효
  for (let i = 1; i < pairs.length; i++) {
    if (isBreakStep(pairs[i - 1].c, pairs[i].c)) lastBreakT = pairs[i].t;
  }
  const priceBreak = lastBreakT !== null;
  const momentum3m = momentum3m_raw !== null && !(priceBreak && base3m && lastBreakT > base3m.t) ? momentum3m_raw : null;
  const hasFullYear = pairs[0].t <= last.t - 335 * 86400;
  const oneYearReturn = !priceBreak && hasFullYear && pairs[0].c ? ((last.c - pairs[0].c) / pairs[0].c) * 100 : null;
  // 한달 수익률(2026-09-02) — ETF·코인 과거분석(한달상승/하락)·코인 상승압력 ②용, 30일 전에 가장 가까운 종가 기준
  const target1m = last.t - 30 * 86400;
  let base1m = null;
  let minDiff1m = Infinity;
  for (const p of pairs) {
    const d = Math.abs(p.t - target1m);
    if (d < minDiff1m) {
      minDiff1m = d;
      base1m = p;
    }
  }
  const monthReturn = base1m && base1m.c && !(lastBreakT !== null && lastBreakT > base1m.t) ? ((last.c - base1m.c) / base1m.c) * 100 : null;

  const rets = [];
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i - 1].c && !isBreakStep(pairs[i - 1].c, pairs[i].c)) rets.push(Math.abs((pairs[i].c - pairs[i - 1].c) / pairs[i - 1].c) * 100);
  }
  const r30 = rets.slice(-30);
  const volatility = r30.length ? r30.reduce((a, b) => a + b, 0) / r30.length : null;
  // 최근 3개월 일평균 변동(|일간 등락률| 평균) — ETF 인사이트 "변동성 순위"용(2026-09-10 사용자 요청)
  const rets3m = [];
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i].t >= last.t - 91 * 86400 && pairs[i - 1].c && !isBreakStep(pairs[i - 1].c, pairs[i].c)) rets3m.push(Math.abs((pairs[i].c - pairs[i - 1].c) / pairs[i - 1].c) * 100);
  }
  const volatility3m = rets3m.length >= 20 ? rets3m.reduce((a, b) => a + b, 0) / rets3m.length : null;

  const meta = chart.chart.result[0].meta || {};
  const price = meta.regularMarketPrice !== undefined && meta.regularMarketPrice !== null ? meta.regularMarketPrice : last.c;
  // 2026-09-09: 인기종목·랭킹 등락률도 검색상세와 같은 기준(야후 당일 등락률 우선)으로 통일
  const changePct = getDailyChangePercent(chart) ?? (prev && prev.c ? ((price - prev.c) / prev.c) * 100 : null);

  // 52주(1년 차트) 종가 최고~최저 구간에서 현재가의 위치(0%=최저, 100%=최고) — 시장동향 "52주최저" 랭킹용
  const closes = pairs.map((p) => p.c);
  const high52 = Math.max(...closes);
  const low52 = Math.min(...closes);
  const week52RangePct = high52 > low52 ? clamp(((price - low52) / (high52 - low52)) * 100, 0, 100) : null;
  // 52주 최고가 대비 낙폭(2026-09-12 사용자 요청, "최대낙폭" 탭) — 1년 중 가장 비쌌던 값에서 지금 몇 % 내려와 있는지(음수).
  // 0%면 지금이 52주 최고가, -50%면 고점에서 반토막이라는 뜻이라 "52주 최저가에 가까운 순"이 곧 이 값이 작은 순이다.
  const week52DrawdownPct = high52 > 0 && Number.isFinite(price) ? ((price - high52) / high52) * 100 : null;

  // 5년 평균 성장률(CAGR, ETF 투자안정 ③) — 5년 미만 상장이면 상장 후 구간으로 계산(1년 미만은 N/A)
  let fiveYearCagr = null;
  if (fiveYear && allPairs[0].c) {
    const spanYears = (lastAll.t - allPairs[0].t) / (365.25 * 86400);
    if (spanYears >= 1) fiveYearCagr = (Math.pow(lastAll.c / allPairs[0].c, 1 / spanYears) - 1) * 100;
  }

  return {
    symbol,
    price,
    currency: meta.currency,
    changePct,
    recentDollarVolume,
    avgDollarVolume1y,
    avgDollarVolume3m,
    momentum3m,
    monthReturn,
    oneYearReturn,
    volatility,
    volatility3m,
    week52RangePct,
    week52DrawdownPct,
    fiveYearCagr,
    firstTradeDate: meta.firstTradeDate ?? allPairs[0].t ?? null,
    priceBreak, // 최근 1년 중 하루 20배↑·1/20↓ 가격 단절 여부 — 목록 스캔에서 제외 기준
    ...volumeSurgeStats(pairs), // 인기종목 순위 기준(오늘 거래량 ÷ 30일 평균, 2026-10-06)
  };
}

// 인기종목 순위 기준(2026-10-06 사용자 요청): 오늘(가장 최근 거래일) 거래량 ÷ 그 전 30거래일 평균 거래량.
// 평소보다 거래가 몰린 종목이 위로 온다. 장 시작 전에는 직전 거래일 값이 "오늘"이 된다.
function volumeSurgeStats(pairs) {
  if (!pairs || pairs.length < 6) return { lastVolume: null, avgVolume30: null, volRatio: null };
  const last = pairs[pairs.length - 1];
  const prev = pairs
    .slice(-31, -1)
    .map((p) => p.v)
    .filter((v) => v > 0);
  const avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null;
  const lastVolume = last.v || 0;
  return { lastVolume, avgVolume30: avg, volRatio: avg ? lastVolume / avg : null };
}

// ETF 전체 스캔(2026-09-01): 시총 상위 목록(미국 100·한국 100) 전 종목을 종목당 차트 1회 조회로
// 상승압력·투자안정(각 ETF 전용 배점)과 시장동향용 지표(52주 위치·거래대금·당일 등락률)까지 한 번에 계산해
// 지역별로 세션 내 캐시 — 인기종목(합산 TOP30)과 시장동향(6개 랭킹)이 이 데이터를 공유함
// 시총순 base 목록의 앞에서부터 targetCount개까지만 증분 스캔 — 이미 스캔한 구간은 캐시 재사용.
// 시장동향(처음 20개 → 더보기 시 전체)과 인기종목(전체)이 같은 캐시를 이어서 사용한다(2026-09-01 단계식 개편)
const etfScanStateByRegion = new Map(); // region("us"|"kr") -> { rows, scanned, chain(Promise 직렬화) }
function ensureEtfScanRows(region, targetCount, statusEl) {
  // 2026-09-16 사용자 요청: ETF 순위는 한국·미국을 통합해서 본다 — 두 지역을 따로 스캔해 합친다
  if (region === "all") {
    return Promise.all([ensureEtfScanRows("kr", targetCount, statusEl), ensureEtfScanRows("us", targetCount, statusEl)]).then(([kr, us]) => ({
      rows: [...kr.rows, ...us.rows],
      scanned: kr.scanned + us.scanned,
      total: kr.total + us.total,
    }));
  }
  if (!etfScanStateByRegion.has(region)) etfScanStateByRegion.set(region, { rows: [], scanned: 0, chain: Promise.resolve() });
  const state = etfScanStateByRegion.get(region);
  // 같은 지역에 대한 스캔 요청을 직렬화 — 20개 스캔 중 더보기(100개)를 눌러도 중복 조회 없이 이어서 진행
  const run = state.chain.then(async () => {
    const isKr = region === "kr";
    const baseList = isKr ? await getKrEtfTop100() : US_ETF_TOP100.map((x) => ({ symbol: x.t, name: x.n }));
    const total = baseList.length;
    const target = Math.min(targetCount, total);
    // 2026-09-12 사용자 지적("ETF 인기종목만 29위까지 검색됨"): 예전에는 앞에서 딱 target개만 조회하고 끝내서,
    // 그중 시세를 못 받는 종목이 하나라도 있으면(310970.KS처럼 야후에 차트가 없는 ETF) 29개만 남았다.
    // 이제는 실패한 만큼 목록 뒤에서 더 채워 target개를 맞춘다(목록이 바닥나면 그때 멈춤).
    if (state.rows.length >= target || state.scanned >= total) return { rows: state.rows, scanned: state.scanned, total };
    // 새 배점(2026-09-03) 입력: 승률·주간 RSI는 배치 DB에서 한 번만 읽어 전 종목에 재사용
    const wrDb = await getWinRateDb().catch(() => null);
    const wrMap = (wrDb && wrDb.scoresEtf) || {};
    const scanChunk = (pending, startFrom) =>
      mapWithConcurrency(
      pending,
      6,
      async (it) => {
        try {
          const m = await computeChartDerivedMetrics(it.symbol, { fiveYear: true });
          if (!m || m.priceBreak) return null; // 하루 20배↑·1/20↓ 가격 단절 종목 제외(2026-09-13)
          const wrEntry = wrMap[it.symbol] || null;
          const rsiWeekly = wrEntry && wrEntry.rsi !== null && wrEntry.rsi !== undefined ? wrEntry.rsi : null;
          const winRate = wrEntry && wrEntry.score !== null && wrEntry.score !== undefined ? wrEntry.score : null;
          const pressure = computeEtfAttractivenessScore({ ...m, rsiWeekly }).total;
          const risk = computeEtfRiskScore({ winRate, volatility: m.volatility, fiveYearCagr: m.fiveYearCagr }).total;
          return {
            symbol: it.symbol,
            name: it.name,
            price: m.price,
            currency: m.currency || (isKr ? "KRW" : "USD"),
            changePct: m.changePct,
            pressure,
            risk,
            recentDollarVolume: m.recentDollarVolume,
            volRatio: m.volRatio, // 인기종목 순위(오늘 거래량 ÷ 30일 평균, 2026-10-06)
            avgVolume30: m.avgVolume30,
            lastVolume: m.lastVolume,
            week52RangePct: m.week52RangePct,
            volatility3m: m.volatility3m, // ETF 인사이트 "변동성 순위"용(2026-09-10)
            monthReturn: m.monthReturn, // ETF 과거분석 한달상승/하락용(2026-09-02)
            oneYearReturn: m.oneYearReturn, // ETF 과거분석 1년상승/하락용
          };
        } catch {
          return null;
        }
      },
      (done) => {
        if (statusEl) statusEl.textContent = `시가총액 상위 ${target}개 ETF의 점수를 계산하는 중... (${Math.min(startFrom + done, target)}/${target})`;
      }
    );
    while (state.rows.length < target && state.scanned < total) {
      const from = state.scanned;
      const to = Math.min(total, from + (target - state.rows.length));
      const results = await scanChunk(baseList.slice(from, to), from);
      state.rows.push(...results.filter(Boolean));
      state.scanned = to;
    }
    return { rows: state.rows, scanned: state.scanned, total };
  });
  state.chain = run.catch(() => {}); // 실패해도 다음 요청이 이어갈 수 있게 체인은 항상 정상 상태 유지
  return run;
}
function etfRegionNavHtml(attr, includeAll) {
  return `
    <div class="top30-sub-nav etf-region-nav" style="margin-bottom:6px;">
      ${includeAll ? `<button type="button" class="cat-btn${etfPopularRegion === "all" ? " active" : ""}" ${attr}="all">전체</button>` : ""}
      <button type="button" class="cat-btn${etfPopularRegion === "us" ? " active" : ""}" ${attr}="us">미국 ETF</button>
      <button type="button" class="cat-btn${etfPopularRegion === "kr" ? " active" : ""}" ${attr}="kr">한국 ETF</button>
    </div>`;
}
function etfRowNameHtml(r, isKr) {
  const badge = isKr ? KR_ETF_BRAND_BADGE_POPULAR[(r.name || "").split(" ")[0]] : undefined;
  if (isKr) ensureKrEtfLogoOverride(r.symbol, r.name); // 브랜드 → 운용사 그룹 CI(2026-09-03)
  return `${tickerLogoHtml(r.symbol, badge)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(isKr ? r.name : r.symbol)}</b>${
    isKr ? "" : `</span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}`
  }`;
}

// ---------- 비트코인 섹션 인기종목(2026-09-01): Yahoo 암호화폐 스크리너로 시가총액 상위 50개 표시 ----------
// 행 클릭 시 코인 상세로 이동. 목록은 세션 내 캐시(재진입 시 즉시 표시) — 코인 투자안정 ③(시총 순위)도 이 목록을 공유
let cryptoTop50CachePromise = null;
// 코인 관리 대상 200개(2026-09-14 사용자 요청): 야후 시총 상위 100 + 업비트 KRW 마켓 중 그 100에 없는 코인을 시총순으로 100개
// (data/crypto-extra-upbit.json — 기호·가격 일치 검증, 가격 단절 제외). 함수 이름은 호출부 호환 때문에 그대로 둠.
function getCryptoTop100() {
  if (!cryptoTop50CachePromise) {
    const extraPromise = fetch("data/crypto-extra-upbit.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    cryptoTop50CachePromise = Promise.all([yahooScreener("all_cryptocurrencies_us", 100), extraPromise])
      .then(([data, extra]) => {
        const quotes = ((data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [])
          .filter((q) => q && q.symbol)
          .slice(0, 100);
        const seen = new Set(quotes.map((q) => q.symbol));
        const extras = ((extra && extra.coins) || [])
          .filter((c) => c && c.symbol && !seen.has(c.symbol))
          .map((c) => {
            // 업비트 한글명으로 등록 — 상세·관심종목·검색에서 한글명으로 보이게
            if (c.nameKo) {
              TICKER_TO_KOREAN_NAME[c.symbol] = c.nameKo;
              if (!KOREAN_COMPANY_NAMES[c.nameKo]) KOREAN_COMPANY_NAMES[c.nameKo] = c.symbol;
            }
            return { symbol: c.symbol, shortName: c.nameEn || c.base, marketCap: c.marketCapUsd || null, upbit: true };
          });
        // 딱 200개(2026-09-14 사용자 요청): 목록은 여유분까지 넘겨 주고, 스캔(ensureCryptoScanRows)이 시세 실패·가격 단절로
        // 빠진 만큼 뒤에서 이어 채워 결과를 정확히 200개로 맞춘다
        const base = quotes.filter((q) => !PRICE_BREAK_EXCLUDED.has(q.symbol));
        return [...base, ...extras.filter((q) => !PRICE_BREAK_EXCLUDED.has(q.symbol))];
      })
      .catch((e) => {
        cryptoTop50CachePromise = null; // 실패는 캐시하지 않음(다음 진입 시 재시도)
        throw e;
      });
  }
  return cryptoTop50CachePromise;
}
// 코인 전체 스캔(2026-09-01): 시총 TOP50 전 코인을 종목당 차트 1회 조회로 상승압력·투자안정(코인 전용 배점)과
// 시장동향용 지표까지 한 번에 계산해 세션 내 캐시 — 인기종목(합산 TOP30)과 시장동향(6개 랭킹)이 공유
// 시총순 TOP50의 앞에서부터 targetCount개까지만 증분 스캔(2026-09-01 단계식 개편) — 시장동향(20개 먼저)과
// 인기종목(전체 50개)이 같은 캐시를 이어서 사용
const cryptoScanState = { rows: [], scanned: 0, chain: Promise.resolve() };
// 가격 단절(액면 변경·토큰 교환)이 확인돼 목록에서 뺀 코인(2026-09-13 사용자 요청) — 1년이 지나 자동 판별 창을 벗어나도 계속 제외.
// 새로 생기는 단절은 computeChartDerivedMetrics의 priceBreak(하루 20배↑·1/20↓)로 자동 제외된다.
const PRICE_BREAK_EXCLUDED = new Set(["GRAM-USD", "DEL-USD"]);
const CRYPTO_UNIVERSE_SIZE = 200; // 코인 관리 대상 수(2026-09-14 사용자 요청: 딱 200개)
function ensureCryptoScanRows(targetCount, statusEl) {
  const run = cryptoScanState.chain.then(async () => {
    const all = await getCryptoTop100();
    if (all.length === 0) throw new Error("암호화폐 목록을 가져오지 못했습니다.");
    // 실제 야후 심볼("TON11419-USD" 등)이 확정되는 시점에 한글명·검색 별칭을 자동 등록 —
    // 이후 상세 헤더/관심종목/검색창(한글·영문)에서 50개 코인이 전부 한글명으로 잡힘
    all.forEach((q) => {
      const ko = CRYPTO_KO_BY_TICKER[cryptoBaseTicker(q.symbol)];
      if (ko) {
        TICKER_TO_KOREAN_NAME[q.symbol] = ko;
        if (!KOREAN_COMPANY_NAMES[ko]) KOREAN_COMPANY_NAMES[ko] = q.symbol;
      }
    });
    const total = all.length;
    const target = Math.min(targetCount, CRYPTO_UNIVERSE_SIZE, total); // 목록엔 여유분이 있어도 결과는 최대 200개
    // ETF와 같은 이유(2026-09-12 사용자 지적 "비트코인도 인기종목 29위까지 검색됨"): 앞에서 딱 target개만
    // 조회하면 시세를 못 받는 코인이 하나라도 있을 때 29개만 남는다 → 실패한 만큼 목록 뒤에서 더 채운다.
    if (cryptoScanState.rows.length >= target || cryptoScanState.scanned >= total) {
      return { rows: cryptoScanState.rows, scanned: cryptoScanState.scanned, total: Math.min(total, CRYPTO_UNIVERSE_SIZE) };
    }
    const btcReturn = await getBtcOneYearReturn();
    // 새 배점(2026-09-03) 입력: 승률·주간 RSI는 배치 DB에서 한 번만 읽어 전 종목에 재사용
    const wrDb = await getWinRateDb().catch(() => null);
    const wrMap = (wrDb && wrDb.scoresCrypto) || {};
    const scanChunk = (items, startFrom) =>
      mapWithConcurrency(
      items,
      6,
      async ({ q, i }) => {
        try {
          const m = await computeChartDerivedMetrics(q.symbol);
          // 최근 1년 중 하루 20배↑ 또는 1/20↓ 가격 단절(액면 변경·토큰 교환) 코인은 목록에서 뺀다(2026-09-13 사용자 요청)
          if (!m || m.priceBreak || PRICE_BREAK_EXCLUDED.has(q.symbol)) return null;
          const wrEntry = wrMap[q.symbol] || null;
          const rsiWeekly = wrEntry && wrEntry.rsi !== null && wrEntry.rsi !== undefined ? wrEntry.rsi : null;
          const winRate = wrEntry && wrEntry.score !== null && wrEntry.score !== undefined ? wrEntry.score : null;
          const pressure = computeCryptoAttractivenessScore({ ...m, rsiWeekly }).total;
          const risk = computeCryptoRiskScore({
            firstTradeDate: m.firstTradeDate,
            winRate,
            oneYearReturn: m.oneYearReturn,
            btcReturn,
          }).total;
          return {
            symbol: q.symbol,
            name: cryptoKoName(q.symbol, q.shortName || q.longName || q.symbol),
            price: m.price,
            currency: "USD",
            changePct: m.changePct,
            pressure,
            risk,
            recentDollarVolume: m.recentDollarVolume,
            volRatio: m.volRatio, // 인기종목 순위(오늘 거래량 ÷ 30일 평균, 2026-10-06)
            avgVolume30: m.avgVolume30,
            lastVolume: m.lastVolume,
            week52RangePct: m.week52RangePct,
            volatility3m: m.volatility3m, // 코인 "변동성" 탭(2026-09-12) — ETF와 같은 3개월 일평균 변동
            week52DrawdownPct: m.week52DrawdownPct, // 코인 "최대낙폭" 탭(2026-09-12) — 52주 최고가 대비 현재가 낙폭
            marketCap: Number.isFinite(q.marketCap) ? q.marketCap : null, // 코인 "시가총액" 탭(2026-09-12) — 야후 스크리너 값
            monthReturn: m.monthReturn, // 코인 과거분석 한달상승/하락용(2026-09-02)
            oneYearReturn: m.oneYearReturn, // 코인 과거분석 1년상승/하락용
          };
        } catch {
          return null;
        }
      },
      (done) => {
        if (statusEl) statusEl.textContent = `시가총액 상위 ${target}개 코인의 점수를 계산하는 중... (${Math.min(startFrom + done, target)}/${target})`;
      }
    );
    while (cryptoScanState.rows.length < target && cryptoScanState.scanned < total) {
      const from = cryptoScanState.scanned;
      const to = Math.min(total, from + (target - cryptoScanState.rows.length));
      const results = await scanChunk(all.map((q, i) => ({ q, i })).slice(from, to), from);
      cryptoScanState.rows.push(...results.filter(Boolean));
      cryptoScanState.scanned = to;
    }
    return { rows: cryptoScanState.rows, scanned: cryptoScanState.scanned, total: Math.min(total, CRYPTO_UNIVERSE_SIZE) }; // 여유분 포함 목록이라 표시용 전체 수는 200
  });
  cryptoScanState.chain = run.catch(() => {});
  return run;
}
function cryptoRowNameHtml(r) {
  return `${cryptoLogoHtml(cryptoBaseTicker(r.symbol))}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.name)}</b>`;
}
function cryptoPriceStr(r) {
  return r.price !== undefined && r.price !== null
    ? priceChartLink(r.symbol, "$" + Number(r.price).toLocaleString("en-US", { maximumFractionDigits: r.price >= 1 ? 2 : 6 }))
    : "N/A";
}

// ---------- IPO(2026-09-11 사용자 요청): 최근 5년 미국 신규 상장 종목 ----------
// 값은 배치(sector-map/scripts/fetch-ipo-list.ps1)가 나스닥 IPO 캘린더 + 야후 월봉으로 만들어둔 data/ipo-list.json.
// 열: 기업명(상장 시기) / 상장 시총 / 현재 시총(등락률) / 투자 승률. 등락률은 "상장 첫날 종가 대비"다.
let ipoListDbPromise = null;
// ---------- ETF·코인 시장동향(2026-09-01 개편): 주식 시장동향과 동일한 6개 랭킹(52주최저/거래대금/상승률/하락률/상승압력/투자안정) ----------
// 데이터는 인기종목과 같은 전체 스캔(getEtfScanRows/getCryptoScanRows)을 공유 — 칩 전환은 정렬만 바꿔서 즉시 반영
const ASSET_TREND_METRICS = {
  week52: {
    icon: "trending-down",
    label: "52주최저",
    header: "52주 구간 위치",
    sort: (a, b) => (a.week52RangePct ?? Infinity) - (b.week52RangePct ?? Infinity),
    cell: (r) => (r.week52RangePct === null || r.week52RangePct === undefined ? "N/A" : `<b class="rank-hl">${r.week52RangePct.toFixed(1)}%</b>`),
    note: "52주 구간 위치(0%=52주 최저, 100%=52주 최고) — 낮을수록 저점에 가깝습니다.",
  },
  volume: {
    hidden: true, // 미래예측 4개(10년월간승률/연평균 상승/RSI 순위/52주최저)만 노출 — 간편검색에서는 선택 가능(2026-09-10)
    icon: "thumbsup",
    label: "거래대금",
    header: "거래대금<br>(5일 평균)",
    sort: (a, b) => (b.recentDollarVolume || 0) - (a.recentDollarVolume || 0),
    cell: (r) => (r.recentDollarVolume ? `<b class="rank-hl">${fmtCompactCurrency(r.recentDollarVolume, r.currency)}</b>` : "N/A"),
    note: "최근 5거래일 평균 거래대금(종가×거래량) 기준입니다.",
  },
  surge: {
    hidden: true, // 미래예측 4개(10년월간승률/연평균 상승/RSI 순위/52주최저)만 노출 — 간편검색에서는 선택 가능(2026-09-10)
    icon: "trending-up",
    label: "상승률",
    header: "당일 등락률",
    sort: (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
    cell: (r) => (r.changePct === null || r.changePct === undefined ? "N/A" : `<b class="${r.changePct >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.changePct)}</b>`),
    note: "전일 종가 대비 당일 등락률 기준입니다.",
  },
  plunge: {
    hidden: true, // 미래예측 4개(10년월간승률/연평균 상승/RSI 순위/52주최저)만 노출 — 간편검색에서는 선택 가능(2026-09-10)
    icon: "trending-down",
    label: "하락률",
    header: "당일 등락률",
    sort: (a, b) => (a.changePct ?? Infinity) - (b.changePct ?? Infinity),
    cell: (r) => (r.changePct === null || r.changePct === undefined ? "N/A" : `<b class="${r.changePct >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.changePct)}</b>`),
    note: "전일 종가 대비 당일 등락률 기준입니다.",
  },
  // 2026-09-04 개편: 상승 압력 → 연평균 상승(연복리 수익률(CAGR)), 투자 안정 → 삭제(10년월간승률로 대체, winrate 항목과 통합)
  pressure: {
    icon: "rocket",
    label: "연평균 상승",
    header: "연평균 상승<br>(연복리)",
    orange: true,
    sort: (a, b) => (b.ret10y ?? -Infinity) - (a.ret10y ?? -Infinity),
    cell: (r) => (r.ret10y === null || r.ret10y === undefined ? "N/A" : `${partialMarkHtml(r.winTotal, "wr-mark-front", partialMonthsFor(r.symbol))}<b>${r.ret10y > 0 ? "+" : ""}${Math.round(r.ret10y * 10) / 10}%</b>`),
    note: "연평균 상승(최근 10년 연복리 수익률 CAGR — 매년 몇 %씩 오른 셈인지, 상장 10년 미만은 상장 후 기간으로 연율화 — ⚠️ 표시)이 높은 순 순위입니다.",
    noRiskCol: true,
    gradeHeader: "10년월간<br>승률",
    gradeCell: (r) => winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol)),
  },
  // RSI·승률 순위(2026-09-02 확장): 주식 시장동향과 동일 컨셉 — 값은 배치 DB(winrate-scores-us.json의
  // scoresEtf/scoresCrypto, attachWinRateRsiToRows가 행에 부착)에서 읽음. 마지막 열은 서로의 점수
  rsi: {
    icon: "scale",
    label: "RSI 순위",
    header: "RSI 점수",
    orange: true,
    sort: (a, b) => (a.rsi ?? Infinity) - (b.rsi ?? Infinity),
    cell: (r) => rsiRankCellHtml(r.rsi),
    note: `주간 RSI(14)가 낮은 순(과매도부터 1등) 순위입니다. <b style="color:#22a866;">30 미만 과매도(초록)</b>·<b style="color:#ef4444;">70 이상 과매수(빨강)</b>, 참고용 기술적 지표입니다.`,
    noRiskCol: true,
    gradeHeader: "10년월간<br>승률",
    gradeCell: (r) => winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol)),
  },
  winrate: {
    icon: "medal",
    label: "10년월간승률",
    header: "10년월간<br>승률", // 한 줄이면 열이 넓어져서 두 줄로(2026-09-12 사용자 요청)
    orange: true,
    sort: (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1),
    cell: (r) => winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol)),
    note: "10년월간승률(최근 10년 월봉 기준 상승 개월수/총 개월수×100, 상장 10년 미만은 상장 후부터 집계·⚠️ 표시)이 높은 순 순위입니다.",
    noRiskCol: true,
    // 2026-09-12 사용자 요청: 딸림 열(연평균 상승)을 없애고 그 탭의 기준 하나만 보여준다
  },
  // 수익률 탭(2026-09-12 사용자 요청): 연평균 상승이 아니라 현시점 기준 1년 상승량 순.
  // 기존 pressure(연평균 상승)는 미래예측·간편검색에서 계속 쓰므로 건드리지 않고 항목을 따로 둔다.
  ret1y: {
    hidden: true, // 상단 탭으로만 들어오는 항목이라 미래예측 서브내비·간편검색 목록에는 넣지 않음
    icon: "rocket",
    label: "1년 수익률",
    header: "1년<br>수익률",
    orange: true,
    sort: (a, b) => (Number.isFinite(b.oneYearReturn) ? b.oneYearReturn : -Infinity) - (Number.isFinite(a.oneYearReturn) ? a.oneYearReturn : -Infinity),
    cell: (r) => ret1yCellHtml(r.oneYearReturn),
    note: "1년 수익률(1년 전 같은 시점 대비 현재가)이 높은 순입니다. 매년 평균이 아니라 최근 1년치 실제 상승량입니다.",
    noRiskCol: true,
  },
  // ---------- 비트코인 상단 탭 전용 3종(2026-09-12 사용자 요청) ----------
  // 변동성은 ETF와 같은 기준(최근 3개월 하루 변동폭 평균)이고, 시가총액·최대낙폭은 코인 섹션에만 있다.
  // 셋 다 마지막 열은 다른 탭과 맞춰 "연평균 상승"으로 둔다.
  volatility: {
    hidden: true, // 상단 탭으로만 들어오는 항목이라 미래예측 서브내비·간편검색 목록에는 넣지 않음
    icon: "scale",
    label: "변동성",
    header: "변동성<br>(3개월)",
    sort: (a, b) => (Number.isFinite(a.volatility3m) ? a.volatility3m : Infinity) - (Number.isFinite(b.volatility3m) ? b.volatility3m : Infinity),
    cell: (r) => (Number.isFinite(r.volatility3m) ? `<b class="rank-hl">${r.volatility3m.toFixed(2)}%</b>` : "N/A"),
    note: "최근 3개월 하루 변동폭(|일간 등락률|) 평균이 <b>작은 순</b>입니다. 변동성이 낮다고 수익이 보장되는 것은 아닙니다.",
    noRiskCol: true,
  },
  marketcap: {
    hidden: true,
    icon: "building",
    label: "시가총액",
    header: "시가총액",
    sort: (a, b) => (Number.isFinite(b.marketCap) ? b.marketCap : -Infinity) - (Number.isFinite(a.marketCap) ? a.marketCap : -Infinity),
    cell: (r) => (Number.isFinite(r.marketCap) ? `<b class="rank-hl">${fmtCompactCurrency(r.marketCap, "USD")}</b>` : "N/A"),
    note: "시가총액(코인 가격 × 유통량, 달러 기준)이 큰 순입니다.",
    noRiskCol: true,
  },
  drawdown: {
    hidden: true,
    icon: "trending-down",
    label: "최대낙폭",
    header: "최대낙폭<br>(52주 최고 대비)",
    sort: (a, b) => (Number.isFinite(a.week52DrawdownPct) ? a.week52DrawdownPct : Infinity) - (Number.isFinite(b.week52DrawdownPct) ? b.week52DrawdownPct : Infinity),
    cell: (r) => (Number.isFinite(r.week52DrawdownPct) ? `<b class="rank-hl">${r.week52DrawdownPct.toFixed(1)}%</b>` : "N/A"),
    note: "최근 52주 최고가에서 지금 몇 % 내려와 있는지(고점 대비 낙폭)가 <b>큰 순</b>입니다. 0%면 지금이 52주 최고가, -50%면 고점에서 반토막이라는 뜻이라 52주 최저가에 가까운 종목이 위로 옵니다.",
    noRiskCol: true,
  },
};
// ETF/코인 스캔 행에 승률·RSI·연평균 상승(배치 DB 값)을 부착 — mapKey: "scoresEtf" | "scoresCrypto"
async function attachWinRateRsiToRows(rows, mapKey) {
  const db = await getWinRateDb();
  const map = (db && db[mapKey]) || {};
  rows.forEach((r) => {
    const e = map[r.symbol];
    r.winRate = e && e.score !== null && e.score !== undefined ? e.score : null;
    r.rsi = e && e.rsi !== null && e.rsi !== undefined ? e.rsi : null;
    r.ret10y = e && Number.isFinite(e.ret10y) ? e.ret10y : null;
    r.winTotal = e && Number.isFinite(e.total) ? e.total : null;
    r.m12Changes = monthlyFromM12(e); // 인기종목 표의 직전 5개월 등락(2026-09-10)
  });
}
// ETF·코인 미래예측 서브내비 노출 순서(2026-09-10 사용자 지정) — 뒤 3개(거래대금/상승률/하락률)는 hidden이라 간편검색에서만
const ASSET_TREND_ORDER = ["winrate", "pressure", "rsi", "week52", "volume", "surge", "plunge"];
let assetTrendMetric = "winrate";
function renderAssetTrendSubnav() {
  el("topRankingSubNav").classList.remove("sr-asset-nav");
  el("topRankingSubNav").innerHTML = ASSET_TREND_ORDER.filter((k) => ASSET_TREND_METRICS[k] && (!ASSET_TREND_METRICS[k].hidden || k === assetTrendMetric)) // 간편검색으로 고른 숨김 지표는 그 칩만 예외로 노출
    .map((key) => [key, ASSET_TREND_METRICS[key]])
    .map(
      ([key, m]) =>
        `<button type="button" class="cat-btn top-ranking-tab${m.orange ? " top-ranking-tab-orange" : ""}${assetTrendMetric === key ? " active" : ""}" data-asset-trend-metric="${key}"><span>${m.label}</span></button>`
    )
    .join("");
}
el("topRankingSubNav").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-asset-trend-metric]");
  if (!btn) return;
  assetTrendMetric = btn.dataset.assetTrendMetric;
  renderAssetTrendSubnav();
  if (appSectionMode === "crypto") runCryptoTrend();
  else runEtfTrend();
});

// 주식 랭킹 표와 동일한 3칸 구성(이름/현재가(등락률)/지표 — 2026-09-16 사용자 요청으로 딸림 열 삭제)
// nameCellFn: 행 → 이름 칸 HTML(rankNameCellHtml 계열), currencyFn: 행 → 통화(현재가 칸 표기용)
function assetTrendTableHtml(rows, metricKey, universeLabel, nameCellFn, currencyFn, limit = 30) {
  const m = ASSET_TREND_METRICS[metricKey];
  const sorted = [...rows].sort(m.sort).slice(0, limit);
  const body = sorted
    .map(
      (r, i) => `
      <tr>
        <td>${nameCellFn(r)}</td>
        <td>${rankPriceCellHtml(r.symbol, r.price, currencyFn(r), r.changePct)}</td>
        <td>${m.cell(r)}</td>
      </tr>`
    )
    .join("");
  return `
    ${metricKey === "winrate" ? WINRATE_HEAD_HTML : TAP_HINT_HTML}
    <table class="top30-table rk-table">
      <thead><tr>${RANK_TH_NAME_ETF}${RANK_TH_PRICE_CHG}<th data-explain="${escapeHtml(stripTags(m.note))}">${m.header}</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 — ${m.note} 투자 자문이 아닙니다.</p>`;
}

// ETF 시장동향(2026-09-02 사용자 요청): 시총 상위 30개만 대상으로 30위까지 표시.
// "상위 30개 안내(+더보기)"는 처음엔 RSI·승률 순위에만 있었으나 2026-09-03 사용자 요청으로 8개 항목 전체에 확대
// (인기종목 탭은 제외) — 누르면 전체(100개)를 다시 검색해 전체 기준 순위로 표시, 확장 상태는 지역별로 전 항목이 공유
const etfTrendWrExpanded = new Set(); // 전체 검색을 누른 지역("us"/"kr")
async function runEtfTrend() {
  const statusEl = trendStatus;
  const resultsEl = trendResults;
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "ETF 목록을 불러오는 중...";
  const region = etfPopularRegion;
  try {
    const isKr = region === "kr";
    const expanded = etfTrendWrExpanded.has(region);
    const { rows, scanned, total } = await ensureEtfScanRows(region, expanded ? 100 : 30, statusEl);
    if (etfPopularRegion !== region || appSectionMode !== "etf") return;
    await attachWinRateRsiToRows(rows, "scoresEtf"); // RSI·승률 순위용(2026-09-02)
    statusEl.style.display = "none";
    const universeLabel = isKr ? "국내 상장 ETF 시가총액 상위" : "미국 상장 ETF 순자산 상위";
    resultsEl.innerHTML =
      etfRegionNavHtml("data-etf-trend-region") +
      (!expanded ? topCapNoteHtml(Math.min(30, scanned), total, true) : "") +
      assetTrendTableHtml(
        rows,
        assetTrendMetric,
        expanded ? `${universeLabel} ${total}개 전체` : `${universeLabel} ${Math.min(30, scanned)}개`,
        (r) => etfRankNameCellHtml(r, isKr),
        (r) => r.currency,
        expanded ? total : 30
      ) +
      (!expanded ? `<button type="button" class="cat-btn load-more-btn">전체보기 (전체 ${total}개 검색 · 약 1분 소요)</button>` : "");
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        etfTrendWrExpanded.add(region);
        runEtfTrend();
      });
    }
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "ETF 데이터를 가져오지 못했습니다."}`;
  }
}
trendResults.addEventListener("click", (e) => {
  const regionBtn = e.target.closest("[data-etf-trend-region]");
  if (!regionBtn) return;
  etfPopularRegion = regionBtn.dataset.etfTrendRegion;
  runEtfTrend();
});

// 코인 시장동향(2026-09-02 사용자 요청): 시총 상위 30개만 대상으로 30위까지 표시.
// "상위 30개 안내(+더보기)"는 처음엔 RSI·승률 순위에만 있었으나 2026-09-03 사용자 요청으로 8개 항목 전체에 확대
// (인기종목 탭은 제외) — 누르면 전체(100개)를 다시 검색해 전체 기준 순위로 표시, 확장 상태는 전 항목이 공유
let cryptoTrendWrExpanded = false;
async function runCryptoTrend() {
  const statusEl = trendStatus;
  const resultsEl = trendResults;
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "암호화폐 목록을 불러오는 중...";
  try {
    const expanded = cryptoTrendWrExpanded;
    const { rows, scanned, total } = await ensureCryptoScanRows(expanded ? 200 : 30, statusEl); // 전체보기 = 200개(2026-09-14)
    if (appSectionMode !== "crypto") return;
    await attachWinRateRsiToRows(rows, "scoresCrypto"); // RSI·승률 순위용(2026-09-02)
    statusEl.style.display = "none";
    resultsEl.innerHTML =
      (!expanded ? topCapNoteHtml(Math.min(30, scanned), total, true) : "") +
      assetTrendTableHtml(
        rows,
        assetTrendMetric,
        expanded ? `암호화폐 200개 전체(시총 상위 100 + 업비트 100)` : `암호화폐 시가총액 상위 ${Math.min(30, scanned)}개`,
        (r) => rankNameCellHtml(r.symbol, cryptoLogoHtml(cryptoBaseTicker(r.symbol)), r.name || r.symbol),
        () => "USD",
        expanded ? total : 30
      ) +
      (!expanded ? `<button type="button" class="cat-btn load-more-btn">전체보기 (전체 ${total}개 검색 · 약 1분 소요)</button>` : "");
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        cryptoTrendWrExpanded = true;
        runCryptoTrend();
      });
    }
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "암호화폐 시세를 가져오지 못했습니다."}`;
  }
}

// ---------- ETF 검색상세 "보유 종목"(2026-09-11 사용자 요청) ----------
// 상세 화면 맨 위에 비중 순으로 보유 종목을 깔아준다. TOP10을 먼저 보여주고 나머지는 "더보기".
// 다만 공개 출처(미국=야후 topHoldings, 한국=네이버 etfAnalysis)가 둘 다 상위 10종목까지만 공시해서,
// 더보기로 펼쳐지는 건 11위 이하 종목이 아니라 업종·자산·국가 비중이다 — 문구에 그대로 밝혀둔다.
const ETF_SECTOR_KO = {
  // 네이버(국내)
  IT: "IT", INDUSTRIALS: "산업재", FINANCIALS: "금융", CONSUMER_DISCRETIONARY: "경기소비재",
  CONSUMER_STAPLES: "필수소비재", COMMUNICATION: "커뮤니케이션", MATERIALS: "소재", HEALTH_CARE: "헬스케어",
  ENERGY: "에너지", UTILITIES: "유틸리티", REAL_ESTATE: "부동산", ETC: "기타",
  // 야후(미국)
  technology: "IT", financial_services: "금융", healthcare: "헬스케어", consumer_cyclical: "경기소비재",
  consumer_defensive: "필수소비재", communication_services: "커뮤니케이션", industrials: "산업재",
  basic_materials: "소재", energy: "에너지", utilities: "유틸리티", realestate: "부동산",
  // 자산 구분(국내)
  EQUITY: "주식", CASH: "현금", BOND: "채권", DERIVATIVES: "파생", OTHERS: "기타",
  // 국가 코드(네이버 countryPortfolioList)와 미분류 표기
  KR: "한국", US: "미국", CN: "중국", JP: "일본", HK: "홍콩", TW: "대만", IN: "인도",
  GB: "영국", DE: "독일", FR: "프랑스", CA: "캐나다", AU: "호주", NL: "네덜란드",
  MISC: "기타", UNCLASSIFIED: "미분류",
};
function etfPortionKo(code) {
  return ETF_SECTOR_KO[code] || ETF_SECTOR_KO[(code || "").toUpperCase()] || code || "기타";
}
function etfPortionListHtml(title, list) {
  if (!list || !list.length) return "";
  const sorted = [...list].sort((a, b) => (b.w || 0) - (a.w || 0));
  return `<div class="etf-portion-block"><span class="etf-portion-title">${escapeHtml(title)}</span>${sorted
    .map((p) => `<span class="etf-portion-chip">${escapeHtml(etfPortionKo(p.k))} <b>${(p.w || 0).toFixed(1)}%</b></span>`)
    .join("")}</div>`;
}
let etfHoldingsShowMore = false;
// 보유 종목의 "1달 전 대비 현재" 주가 변화(2026-09-17 사용자 요청) — 비중 이력은 어느 소스도 주지 않아 주가 변화로 채운다
const etfHoldChangeCache = new Map();
function holdingOneMonthChange(sym) {
  if (!sym) return Promise.resolve(null);
  if (!etfHoldChangeCache.has(sym)) {
    etfHoldChangeCache.set(
      sym,
      (async () => {
        const chart = await yahooChart(sym, "3mo", "1d").catch(() => null);
        const pairs = chartClosePairs(chart);
        if (pairs.length < 2) return null;
        const last = pairs[pairs.length - 1];
        const target = last.t - 30 * 86400;
        let base = null;
        let min = Infinity;
        for (const q of pairs) {
          const d = Math.abs(q.t - target);
          if (d < min) {
            min = d;
            base = q;
          }
        }
        if (!base || !(base.c > 0) || min > 20 * 86400) return null;
        return ((last.c - base.c) / base.c) * 100;
      })().catch(() => null)
    );
  }
  return etfHoldChangeCache.get(sym);
}
async function fillEtfHoldChanges(root) {
  const cells = [...root.querySelectorAll("[data-hold-sym]")].filter((td) => td.dataset.holdSym);
  await mapWithConcurrency(cells, 5, async (td) => {
    const v = await holdingOneMonthChange(td.dataset.holdSym);
    td.innerHTML = Number.isFinite(v) ? `<b class="${v >= 0 ? "delta-up" : "delta-down"}">${v >= 0 ? "+" : ""}${v.toFixed(1)}%</b>` : "—";
  });
}

// 보유비중(2026-10-06 사용자 요청 개편)
//  · 금·채권·현금(+선물·비트코인)도 건너뛰지 않고 비중 순으로 맨 위에 이모지와 함께 — 그 아래 주식을 비중 순으로
//  · 표 위에 운용보수를 굵게
//  · 한국 ETF는 funetf 운용사 PDF(scripts/build-etf-holdings.py, holdings[].t 종류 표시), 미국은 야후 topHoldings + 자산 구성(assets)
const ETF_NONSTOCK_META = {
  gold: { emoji: "🥇", label: "금" },
  bond: { emoji: "📜", label: "채권" },
  cash: { emoji: "💵", label: "현금" },
  deriv: { emoji: "📈", label: "선물·파생" },
  btc: { emoji: "₿", label: "비트코인" },
  other: { emoji: "📦", label: "기타" },
};
function etfNonStockRows(info, isKr, symbol) {
  const rows = [];
  if (isKr) {
    (info.holdings || []).forEach((h) => {
      if (h.t && h.t !== "stock" && Number.isFinite(h.w)) rows.push({ kind: h.t, w: h.w, n: h.t === "gold" ? h.n : "" });
    });
  } else {
    const cat = String(info.category || "");
    const isGold = /GLD|IAU|GLDM|SGOL|AAAU/.test(symbol) || /gold/i.test(info.family || "") || (/Commodities/i.test(cat) && /GLD|IAU/.test(symbol));
    const isBtc = /IBIT|FBTC|GBTC|ARKB|BITB|BITO/.test(symbol) || /Digital Assets/i.test(cat);
    (info.assets || []).forEach((a) => {
      const k = a.k === "채권" ? "bond" : a.k === "현금" ? "cash" : a.k === "기타" ? (isGold ? "gold" : isBtc ? "btc" : "other") : null;
      if (k && Number.isFinite(a.w) && Math.abs(a.w) >= 0.01) rows.push({ kind: k, w: a.w, n: "" });
    });
  }
  return rows.sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
}
// 국내 6자리 코드만 있는 옛 데이터용 — 코스닥 종목을 .KS로 붙이면 상세가 안 열리므로 아는 목록에서 시장을 찾는다
// 야후도 미국 ETF 보유 내역에서 삼성전자를 005930.KQ처럼 시장을 틀리게 주는 경우가 있어(SCHF) 아는 목록 기준으로 바로잡는다
let krKnownSymbolSet = null;
function krKnownSymbol(code) {
  if (!krKnownSymbolSet) krKnownSymbolSet = new Set([...Object.values(KR_NAME_TO_TICKER), ...Object.keys(TICKER_TO_KOREAN_NAME).filter((k) => /\.(KS|KQ)$/.test(k))]);
  if (krKnownSymbolSet.has(`${code}.KS`)) return `${code}.KS`;
  if (krKnownSymbolSet.has(`${code}.KQ`)) return `${code}.KQ`;
  return null;
}
function etfHoldingLinkSym(h, isKr) {
  const s = String(h.s || "");
  if (!s) return "";
  const m = s.match(/^([0-9A-Z]{6})(?:\.(KS|KQ))?$/);
  if (m && (m[2] || isKr)) return krKnownSymbol(m[1]) || (m[2] ? s : `${s}.KS`);
  return s;
}
// 미국 채권 ETF가 "보유 종목"으로 주는 머니마켓펀드(BISXX 등)·현금성 계정(XTSLA)은 현금 행과 겹치므로 종목 목록에서 뺀다
function etfIsCashLikeHolding(h) {
  return /^[A-Z]{3,4}XX$/.test(String(h.s || "")) || /^XTSLA$/.test(String(h.s || ""));
}
async function renderEtfHoldingsBlock(symbol, isKr) {
  const box = el("etfHoldingsBlock");
  if (!box) return;
  box.innerHTML = `<p class="muted" style="font-size:12px;margin:0;">보유비중을 불러오는 중...</p>`;
  let info = null;
  try {
    info = etfInfoOf(await getEtfInfoDb(), symbol);
  } catch {
    // 데이터 파일을 못 읽으면 블록 자체를 숨김
  }
  if (!info) {
    box.innerHTML = `<p class="muted" style="font-size:12.5px;margin:6px 2px 0;">이 ETF의 보유비중 자료를 찾지 못했습니다.</p>`;
    box.style.display = "block";
    return;
  }
  const feeHtml = Number.isFinite(info.fee) ? `<div class="etf-fee-line">운용보수 연 ${info.fee}%</div>` : "";
  const nonStock = etfNonStockRows(info, isKr, symbol);
  const stocks = (info.holdings || [])
    .filter((h) => (!h.t || h.t === "stock") && !(!isKr && etfIsCashLikeHolding(h)))
    .slice()
    .sort((a, b) => (Number.isFinite(b.w) ? b.w : -1) - (Number.isFinite(a.w) ? a.w : -1));
  const paint = () => {
    const top = stocks.slice(0, etfHoldingsShowMore ? 30 : 10);
    const nonStockHtml = nonStock
      .map((r) => {
        const m = ETF_NONSTOCK_META[r.kind] || ETF_NONSTOCK_META.other;
        const name = r.kind === "gold" && r.n ? `금 현물 <span class="etf-hold-ticker">${escapeHtml(r.n)}</span>` : escapeHtml(m.label);
        return `<tr class="etf-hold-asset">
          <td><span class="ticker-cell rank-logo"><span class="etf-asset-emoji">${m.emoji}</span><b>${name}</b></span></td>
          <td class="etf-hold-weight"><b>${r.w.toFixed(2)}%</b></td>
          <td class="etf-hold-chg">—</td>
        </tr>`;
      })
      .join("");
    const rows = top
      .map((h) => {
        const linkSym = etfHoldingLinkSym(h, isKr);
        // 미국 보유 종목은 한글 이름으로 바꾸고 티커를 아주 작게 옆에 붙인다(2026-09-17 사용자 요청)
        const krStock = /\.(KS|KQ)$/.test(linkSym);
        const dispName = krStock ? (/[가-힣]/.test(h.n || "") ? h.n : TICKER_TO_KOREAN_NAME[linkSym] || h.n || h.s) : rankDisplayName(linkSym, h.n || h.s, false);
        const nameCell = linkSym
          ? `<span class="ticker-cell rank-logo">${tickerLogoHtml(linkSym, (h.n || h.s).slice(0, 2))}<b class="ticker-link" data-ticker="${escapeHtml(
              linkSym
            )}">${escapeHtml(dispName)}</b>${krStock ? "" : `<span class="etf-hold-ticker">${escapeHtml(linkSym)}</span>`}</span>`
          : `<span class="etf-hold-plain">${escapeHtml(h.n || "")}</span>`;
        const weightCell = Number.isFinite(h.w)
          ? `<b>${h.w.toFixed(2)}%</b>`
          : h.c
          ? `<span class="muted" style="font-size:11px;">${Number(h.c).toLocaleString()}주</span>`
          : "—";
        return `
        <tr>
          <td>${nameCell}</td>
          <td class="etf-hold-weight">${weightCell}</td>
          <td class="etf-hold-chg" data-hold-sym="${escapeHtml(linkSym)}">…</td>
        </tr>`;
      })
      .join("");
    const portions =
      etfPortionListHtml("업종 비중", info.sectors) + etfPortionListHtml("자산 비중", info.assets) + etfPortionListHtml("국가 비중", info.countries);
    const extra = etfHoldingsShowMore
      ? `<div class="etf-holdings-more">
          ${portions}
          <p class="muted" style="font-size:11px;margin:6px 0 0;">${
            stocks.length < 30 ? `공시된 보유 종목 ${stocks.length}개를 모두 보여드립니다.` : "비중 상위 30종목입니다."
          }</p>
        </div>`
      : "";
    const empty = !nonStock.length && !stocks.length;
    box.innerHTML = `
      ${feeHtml}
      <div class="etf-holdings-head">
        <span class="muted" style="font-size:11.5px;">비중 순 · ${info.index ? escapeHtml(info.index) + " 추종" : escapeHtml(info.category || "")}</span>
      </div>
      ${
        empty
          ? `<p class="muted" style="font-size:12.5px;margin:6px 2px 0;line-height:1.6;">이 ETF는 보유 구성 공시를 찾지 못했습니다.</p>`
          : `<table class="top30-table etf-holdings-table">
        <thead><tr><th>종목</th><th>비중</th><th>수익률<br>(1개월)</th></tr></thead>
        <tbody>${nonStockHtml}${rows}</tbody>
      </table>
      ${extra}
      ${stocks.length > 10 || portions ? `<button type="button" class="cat-btn etf-holdings-more-btn">${etfHoldingsShowMore ? "접기" : "더보기"}</button>` : ""}`
      }`;
    fillEtfHoldChanges(box); // 1달 전 대비 주가 변화는 표를 그린 뒤 채운다
    const btn = box.querySelector(".etf-holdings-more-btn");
    if (btn)
      btn.addEventListener("click", () => {
        etfHoldingsShowMore = !etfHoldingsShowMore;
        paint();
      });
  };
  paint();
  box.style.display = "block";
}

// ETF 보유 상위 종목 중 앱 기본 목록(코스피200·코스닥150·S&P500) 밖의 종목(테스 등) — 검색·상세에서 찾을 수 있게 이름 등록(2026-10-06)
fetch("data/etf-holding-names.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : null))
  .then((names) => {
    if (!names) return;
    Object.entries(names).forEach(([sym, name]) => {
      if (!sym || !name) return;
      if (!TICKER_TO_KOREAN_NAME[sym]) TICKER_TO_KOREAN_NAME[sym] = name;
      if (/\.(KS|KQ)$/.test(sym)) {
        if (!KR_NAME_TO_TICKER[name]) KR_NAME_TO_TICKER[name] = sym;
      } else if (/[가-힣]/.test(name) && !KOREAN_COMPANY_NAMES[name]) KOREAN_COMPANY_NAMES[name] = sym;
    });
  })
  .catch(() => {});

// ---------- ETF 전용 상단 탭(2026-09-11 사용자 요청) ----------
// 인기종목 - 승률 - 수익률 - 변동성 - 배당률 - 운용보수.
// 표는 전부 "이름 / 가운데 값 / 오른쪽 값" 3열이고, 탭마다 가운데·오른쪽에 무엇을 놓을지가 다르다.
//  · 승률   : 현재가(등락률) / 10년월간승률
//  · 수익률 : 현재가(등락률) / 연평균 상승      (연평균상승과 같은 내용)
//  · 변동성 : 변동성(현재가 자리)  / 연평균 상승
//  · 배당률 : 배당률(⚠️컷·지연)    / 10년월간승률
//  · 운용보수: 운용보수(싼 순)     / 연평균 상승
// 값은 ETF 스캔 캐시(ensureEtfScanRows)와 배치 DB(winrate-scores-us.json / etf-info.json)를 재사용한다.
// 모든 ETF 탭이 공유하는 "현재가(등락률)" 칸 — 표는 순위 / 이름 / 현재가(등락률) / 그 탭의 기준 4열로 통일(2026-09-12)
const ETF_MID_PRICE_CELL = (r) => rankPriceCellHtml(r.symbol, r.price, r.currency, r.changePct);
// ETF 이름 칸(3칸 틀) — 국내는 상품명, 미국은 한글명(없으면 영문 상품명) 위 + 코드·시장 아래
// ETF 이름 칸(2026-09-13 사용자 요청):
//  · 한국 ETF — 윗줄: 브랜드를 뗀 상품명("미국배당다우존스"), 아랫줄: 브랜드(KODEX·TIGER·ACE…). 이름은 조금 작게 해 10글자 안팎까지 보이게
//  · 미국 ETF — 윗줄: 티커(SPY), 아랫줄: 한글명/영문 상품명(작은 글씨, 길면 …)
function etfRankNameCellHtml(r, isKr) {
  const parts = etfDisplayParts(r.symbol, r.name, "ETF");
  if (isKr) {
    ensureKrEtfLogoOverride(r.symbol, r.name); // 브랜드 → 운용사 그룹 CI(2026-09-03)
    return rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol, KR_ETF_BRAND_BADGE_POPULAR[parts.brand]), parts.main, parts.sub, "rk-etf-kr");
  }
  return withNameTag(rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), parts.main, parts.sub, "rk-etf-us"), etfSectorTagHtml(r.symbol));
}
const ETF_METRIC_TABS = {
  winrate: {
    title: "tab.etfWinrate",
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    rightHeader: RANK_TH_WINRATE,
    rightCell: (r) => winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol)),
    sort: (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1),
    note: "10년월간승률(최근 10년 월봉 기준 전달보다 오르며 마감한 달의 비율)이 높은 순입니다.",
  },
  return: {
    title: "tab.etfReturn",
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    // 2026-09-12 사용자 요청: 연평균(CAGR)이 아니라 현시점 기준 1년 상승량 순
    rightHeader: RANK_TH_RET1Y,
    rightCell: (r) => ret1yCellHtml(r.oneYearReturn),
    sort: (a, b) => (Number.isFinite(b.oneYearReturn) ? b.oneYearReturn : -Infinity) - (Number.isFinite(a.oneYearReturn) ? a.oneYearReturn : -Infinity),
    note: "1년 수익률(1년 전 같은 시점 대비 현재가)이 높은 순입니다. 매년 평균이 아니라 최근 1년치 실제 상승량입니다.",
  },
  volatility: {
    title: "tab.etfVolatility",
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    rightHeader: `<th data-explain="최근 3개월 하루 변동폭(|일간 등락률|)의 평균입니다. 낮을수록 하루하루 덜 흔들렸다는 뜻이고, 수익률이 좋다는 뜻은 아닙니다.">변동성<br>(3개월)</th>`,
    rightCell: (r) => (Number.isFinite(r.volatility3m) ? `<b class="rank-hl">${r.volatility3m.toFixed(2)}%</b>` : "N/A"),
    sort: (a, b) => (Number.isFinite(a.volatility3m) ? a.volatility3m : Infinity) - (Number.isFinite(b.volatility3m) ? b.volatility3m : Infinity),
    note: "최근 3개월 일평균 변동폭이 <b>작은 순</b>입니다. 변동성이 낮다고 수익이 보장되는 것은 아닙니다.",
  },
  dividend: {
    title: "tab.etfDividend",
    needsDividend: true,
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    rightHeader: `<th data-explain="현재가 기준 배당률 — 최근 1년간 실제 지급된 분배금 합계를 지금 가격으로 나눈 값입니다. ⚠️컷은 직전보다 분배금이 20% 넘게 줄었다는, ⚠️지연은 평소 주기보다 지급이 밀렸다는 경고입니다.">배당률<br>(현재 기준)</th>`,
    rightCell: (r) => (Number.isFinite(r.dividendYield) ? `<b class="rank-hl">${r.dividendYield.toFixed(2)}%</b>${dividendWarningHtml(r)}` : "N/A"),
    sort: (a, b) => (b.dividendYield ?? -1) - (a.dividendYield ?? -1),
    filter: (r) => Number.isFinite(r.dividendYield),
    note: "현재가 기준 배당률(최근 1년 분배금 합계 ÷ 현재가)이 높은 순입니다. 분배금이 없는 ETF는 빠집니다.",
  },
  // 2026-10-08: 규모(순자산·시가총액) 큰 순 — 국내는 시가총액(억원), 미국은 순자산
  aum: {
    title: "tab.etfAum",
    needsAum: true,
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    rightHeader: `<th data-explain="ETF 규모 — 국내는 시가총액, 미국은 순자산(AUM)입니다. 클수록 거래가 많고 상장폐지 위험이 낮은 편입니다.">규모<br>(순자산)</th>`,
    rightCell: (r) => (Number.isFinite(r.aum) ? `<b class="rank-hl">${escapeHtml(etfAumText(r.aum, isKrTicker(r.symbol)))}</b>` : "N/A"),
    sort: (a, b) => (Number.isFinite(b.aum) ? b.aum : -1) - (Number.isFinite(a.aum) ? a.aum : -1),
    filter: (r) => Number.isFinite(r.aum),
    note: "규모(국내 시가총액 · 미국 순자산)가 큰 순입니다.",
  },
  fee: {
    title: "tab.etfFee",
    needsInfo: true,
    midHeader: RANK_TH_PRICE_CHG,
    midCell: ETF_MID_PRICE_CELL,
    rightHeader: `<th data-explain="연간 총보수 — ETF를 1년 들고 있으면 자산에서 자동으로 빠져나가는 비용 비율입니다. 따로 청구되는 게 아니라 매일 조금씩 가격에 반영됩니다. 낮을수록 유리합니다.">운용보수<br>(연간)</th>`,
    rightCell: (r) => (Number.isFinite(r.fee) ? `<b class="rank-hl">${r.fee.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}%</b>` : "N/A"),
    sort: (a, b) => (Number.isFinite(a.fee) ? a.fee : Infinity) - (Number.isFinite(b.fee) ? b.fee : Infinity),
    filter: (r) => Number.isFinite(r.fee),
    note: "연간 총보수가 <b>싼 순</b>입니다. 미국은 야후 공시(annualReportExpenseRatio), 국내는 네이버 총보수 기준이며 실부담비용률과는 다를 수 있습니다.",
  },
};
let etfMetricTab = "winrate";
const etfMetricExpanded = new Set(); // 전체보기를 누른 지역("us"/"kr")
function openEtfMetricTab(key) {
  if (!ETF_METRIC_TABS[key]) key = "winrate";
  etfMetricTab = key;
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle(ETF_METRIC_TABS[key].title);
  el("topRankingSubNav").classList.remove("sr-rank-nav");
  el("topRankingSubNav").innerHTML = ""; // ETF는 상단 탭이 곧 항목이라 서브내비를 쓰지 않음
  showRankingGroup("trend");
  runEtfMetricTab();
}
// 배당률 탭 전용 — 종목별 분배금 조회는 느려서(종목당 차트 1회) 심볼 단위로 캐시
const etfDividendCache = new Map();
async function attachEtfDividends(rows, statusEl) {
  const pending = rows.filter((r) => !etfDividendCache.has(r.symbol));
  if (pending.length) {
    await mapWithConcurrency(
      pending,
      6,
      async (r) => {
        const info = await getDividendYieldInfo(r.symbol).catch(() => null);
        etfDividendCache.set(r.symbol, info);
      },
      (done) => {
        if (statusEl) statusEl.textContent = `배당률을 계산하는 중... (${done}/${pending.length})`;
      }
    );
  }
  rows.forEach((r) => {
    const info = etfDividendCache.get(r.symbol);
    r.dividendYield = info && Number.isFinite(info.yieldPct) ? info.yieldPct : null;
    r.dividendWarning = info ? info.dividendWarning : null;
  });
}
async function runEtfMetricTab() {
  const conf = ETF_METRIC_TABS[etfMetricTab];
  const statusEl = trendStatus;
  const resultsEl = trendResults;
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "ETF 목록을 불러오는 중...";
  const region = etfPopularRegion;
  const tabAtStart = etfMetricTab;
  try {
    const isKr = region === "kr";
    const isAll = region === "all";
    const expanded = etfMetricExpanded.has(region);
    const { rows, scanned, total } = await ensureEtfScanRows(region, expanded ? 100 : 30, statusEl);
    if (etfPopularRegion !== region || appSectionMode !== "etf" || etfMetricTab !== tabAtStart) return;
    await attachWinRateRsiToRows(rows, "scoresEtf"); // 10년월간승률·연평균 상승
    if (conf.needsInfo) {
      const db = await getEtfInfoDb().catch(() => null);
      rows.forEach((r) => {
        const info = etfInfoOf(db, r.symbol);
        r.fee = info && Number.isFinite(info.fee) ? info.fee : null;
      });
    }
    if (conf.needsDividend) await attachEtfDividends(rows.slice(0, expanded ? total : 30), statusEl);
    if (conf.needsAum) {
      const mdb = await getEtfMarketCapDb().catch(() => null);
      const m = new Map([...((mdb && mdb.kr) || []).map((x) => [x.s, x.m]), ...((mdb && mdb.us) || []).map((x) => [x.s, x.a])]);
      rows.forEach((r) => (r.aum = Number.isFinite(m.get(r.symbol)) ? m.get(r.symbol) : null));
    }
    if (etfPopularRegion !== region || appSectionMode !== "etf" || etfMetricTab !== tabAtStart) return;
    statusEl.style.display = "none";

    const universeLabel = isAll ? "한국·미국 상장 ETF" : isKr ? "국내 상장 ETF 시가총액 상위" : "미국 상장 ETF 순자산 상위";
    const limit = expanded ? total : 30;
    const listed = (conf.filter ? rows.filter(conf.filter) : rows.slice()).sort(conf.sort).slice(0, limit);
    const body = listed
      .map(
        (r, i) => `
      <tr>
        <td>${etfRankNameCellHtml(r, isAll ? isKrTicker(r.symbol) : isKr)}</td>
        <td>${conf.midCell(r)}</td>
        <td>${conf.rightCell(r)}</td>
      </tr>`
      )
      .join("");
    // 2026-09-13: 순위 열을 빼고 3칸(이름 / 현재가·등락률 / 기준값)으로 — 순서가 곧 순위
    resultsEl.innerHTML =
      etfRegionNavHtml("data-etf-metric-region", true) +
      (!expanded ? topCapNoteHtml(Math.min(30, scanned), total, true) : "") +
      `${etfMetricTab === "winrate" ? WINRATE_HEAD_HTML : TAP_HINT_HTML}
      <table class="top30-table rk-table">
        <thead><tr>${RANK_TH_NAME_ETF}${conf.midHeader}${conf.rightHeader}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} ${
        expanded ? `${total}개 전체` : `${Math.min(30, scanned)}개`
      } 대상 — ${conf.note} 투자 자문이 아닙니다.</p>` +
      (!expanded ? `<button type="button" class="cat-btn load-more-btn">전체보기 (전체 ${total}개 검색 · 약 1분 소요)</button>` : "");
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        etfMetricExpanded.add(region);
        runEtfMetricTab();
      });
    }
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "ETF 데이터를 가져오지 못했습니다."}`;
  }
}
trendResults.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-etf-metric-region]");
  if (!btn) return;
  etfPopularRegion = btn.dataset.etfMetricRegion;
  runEtfMetricTab();
});

// ETF·코인 시장동향 진입 — topranking 패널을 빌려 쓰되 서브내비는 6개 랭킹 칩으로 구성
function openEtfTrend() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle("tab.trend");
  showRankingGroup("trend");
  renderAssetTrendSubnav();
  runEtfTrend();
}
function openCryptoTrend() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle("tab.trend");
  showRankingGroup("trend");
  renderAssetTrendSubnav();
  runCryptoTrend();
}

// ---------- 비트코인 상단 탭(2026-09-12 사용자 요청) ----------
// 인기종목 - 승률 - 수익률 - 변동성 - 시가총액 - 최대낙폭. 표 구성은 ETF·주식과 같고,
// 값은 코인 시장동향과 같은 스캔 캐시(ensureCryptoScanRows)를 그대로 쓴다 — 서브내비만 없앤 형태.
const CRYPTO_METRIC_TABS = {
  winrate: { metric: "winrate", title: "tab.etfWinrate" },
  return: { metric: "ret1y", title: "tab.etfReturn" },
  volatility: { metric: "volatility", title: "tab.etfVolatility" },
  marketcap: { metric: "marketcap", title: "tab.cryptoCap" },
  drawdown: { metric: "drawdown", title: "tab.cryptoDrawdown" },
};
function openCryptoMetricTab(key) {
  const conf = CRYPTO_METRIC_TABS[key] || CRYPTO_METRIC_TABS.winrate;
  appSectionMode = "crypto";
  assetTrendMetric = conf.metric;
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle(conf.title);
  el("topRankingSubNav").classList.remove("sr-rank-nav");
  el("topRankingSubNav").innerHTML = ""; // 상단 탭이 곧 항목이라 서브내비를 쓰지 않음
  showRankingGroup("trend");
  runCryptoTrend();
}

// ---------- 한국주식·미국주식 상단 탭(2026-09-12 사용자 요청) ----------
// 인기종목 - 승률 - 수익률 - 변동성 - 배당률 - IPO. 승률·수익률·배당률은 원래 미래예측/기업가치 서브내비에
// 있던 랭킹을 그대로 위로 올린 것이고, 변동성만 ETF와 같은 기준(3개월 일평균 변동)으로 새로 만들었다.
const STOCK_METRIC_TABS = {
  winrate: { title: "tab.etfWinrate", run: () => runTrendRsiWinRate("winrate") },
  return: { title: "tab.etfReturn", run: () => runTrendRsiWinRate("ret") },
  volatility: { title: "tab.etfVolatility", run: () => runStockVolatility() },
  dividend: { title: "tab.etfDividend", run: () => runTrendDividend() },
};
let stockMetricTab = "winrate";
// 변동성(주식) — ETF와 같은 기준: 최근 3개월 하루 변동폭(|일간 등락률|) 평균이 작은 순.
// 시가총액 상위부터 30개를 먼저 스캔하고, "전체보기"로 유니버스 전체(코스피200+코스닥150 / S&P500)를 이어서 스캔한다.
const stockVolCacheByMarket = new Map(); // "KR"|"US" -> Map(symbol -> {volatility3m, price, changePct})
const stockVolExpanded = new Set();
RANK_SCAN_RESETTERS.push(() => {
  stockVolCacheByMarket.clear();
  stockVolExpanded.clear();
});
async function runStockVolatility() {
  const statusEl = trendStatus;
  const resultsEl = trendResults;
  if (!guardRankingScan(resultsEl)) return;
  resultsEl.dataset.scanning = "1";
  const isKr = getWatchlistActiveMarket() === "KR";
  const marketKey = isKr ? "KR" : "US";
  if (!stockVolCacheByMarket.has(marketKey)) stockVolCacheByMarket.set(marketKey, new Map());
  const cache = stockVolCacheByMarket.get(marketKey);
  try {
    resultsEl.innerHTML = "";
    statusEl.style.display = "block";
    statusEl.textContent = "변동성 대상 종목을 불러오는 중...";
    const universe = await getSReportUniverse(isKr);
    const capTop = ((universe && universe.companies) || []).filter((c) => c.marketCap).sort((a, b) => b.marketCap - a.marketCap);
    if (capTop.length === 0) throw new Error("종목 목록을 아직 준비 중입니다. 잠시 후 다시 확인해주세요.");
    const total = capTop.length;
    const expanded = stockVolExpanded.has(marketKey);
    const target = expanded ? total : Math.min(30, total);
    const targets = capTop.slice(0, target);
    const pending = targets.filter((c) => !cache.has(c.symbol));
    if (pending.length) {
      await mapWithConcurrency(
        pending,
        6,
        async (c) => {
          const m = await computeChartDerivedMetrics(c.symbol).catch(() => null);
          cache.set(
            c.symbol,
            m && Number.isFinite(m.volatility3m) ? { volatility3m: m.volatility3m, price: m.price, changePct: m.changePct } : null
          );
        },
        (done) => {
          statusEl.textContent = `${done}/${pending.length} 종목 변동성 확인 중${expanded ? "(전체 검색 — 약 1분 소요될 수 있어요)" : ""}...`;
        }
      );
    }
    if (appSectionMode !== "stocks" || (getWatchlistActiveMarket() === "KR") !== isKr) return; // 조회 중 섹션·시장을 바꿨으면 그쪽 렌더에 맡김
    const wrDb = await getWinRateDb().catch(() => null);
    const wrMap = (wrDb && (isKr ? wrDb.scoresKr : wrDb.scores)) || {};
    const krNameMap = isKr ? await getKrSymbolNameMap().catch(() => new Map()) : null;
    const rows = targets
      .map((c) => {
        const v = cache.get(c.symbol);
        if (!v) return null;
        const e = wrMap[c.symbol];
        return {
          symbol: c.symbol,
          name: c.name,
          ...v,
          winRate: e && e.score !== null && e.score !== undefined ? e.score : null,
          winTotal: e && Number.isFinite(e.total) ? e.total : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.volatility3m - b.volatility3m);
    statusEl.style.display = "none";
    if (rows.length === 0) throw new Error("변동성을 계산하지 못했습니다. 잠시 후 다시 시도해주세요.");
    const universeLabel = isKr ? "코스피200+코스닥150" : "S&P500";
    const body = rows
      .map((r) => {
        const mainName = isKr ? (krNameMap && krNameMap.get(r.symbol)) || TICKER_TO_KOREAN_NAME[r.symbol] || r.name || r.symbol : rankDisplayName(r.symbol, r.name, false);
        return `
      <tr>
        <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), mainName)}</td>
        <td>${rankPriceCellHtml(r.symbol, r.price, isKr ? "KRW" : "USD", r.changePct)}</td>
        <td><b class="rank-hl">${r.volatility3m.toFixed(2)}%</b></td>
      </tr>`;
      })
      .join("");
    resultsEl.innerHTML = `
      ${rankScanCaptionHtml(rows.length, !expanded && total > target)}
      ${TAP_HINT_HTML}
      <table class="top30-table rk-table">
        <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th data-explain="변동성 — 최근 3개월 하루 변동폭(|일간 등락률|)의 평균입니다. 낮을수록 하루하루 덜 흔들렸다는 뜻이고, 수익률이 좋다는 뜻은 아닙니다.">변동성<br>(3개월)</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${!expanded && total > target ? `<button type="button" class="cat-btn load-more-btn stock-vol-more-btn">전체보기 (전체 ${total}개 검색 · 약 1분 소요)</button>` : ""}
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 시가총액 상위 ${
      expanded ? `${total}개 전체` : `${target}개`
    } 대상 — 최근 3개월 일평균 변동폭이 <b>작은 순</b>입니다. 변동성이 낮다고 수익이 보장되는 것은 아니며, 투자 자문이 아닙니다.</p>`;
    const moreBtn = resultsEl.querySelector(".stock-vol-more-btn");
    if (moreBtn)
      moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        stockVolExpanded.add(marketKey);
        runStockVolatility();
      });
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "변동성을 계산하지 못했습니다."}`;
  } finally {
    endLoadMoreScan(resultsEl);
  }
}

const OPERATING_MARGIN_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 영업이익률 = 직전 분기 영업이익 ÷ 직전 분기 매출액(같은 분기 기준). 투자 자문이 아닙니다.</p>`;
async function runValueOperatingMargin() {
  await runValueScreenFromSP500(valuationButtons.operatingMargin, "영업이익률", {
    sortFn: (a, b) => (b.operatingMarginQuarterly ?? -Infinity) - (a.operatingMarginQuarterly ?? -Infinity),
    metricHeaderHtml: `영업이익률${THEAD_SUB("직전분기")}`,
    metricExplain: "영업이익률 — 직전 분기 영업이익 ÷ 같은 분기 매출액입니다. 팔아서 남기는 비율이라 높을수록 본업 수익성이 좋습니다.",
    metricCellFn: (r) => (r.operatingMarginQuarterly === null || r.operatingMarginQuarterly === undefined ? "N/A" : `<b class="rank-hl">${r.operatingMarginQuarterly.toFixed(1)}%</b>`),
    noteHtml: OPERATING_MARGIN_NOTE,
  });
}

const ROE_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ROE = 직전 분기 순이익 ÷ 직전 분기말 자기자본(연환산하지 않은 분기 기준). 투자 자문이 아닙니다.</p>`;
async function runValueRoe() {
  await runValueScreenFromSP500(valuationButtons.roe, "ROE", {
    sortFn: (a, b) => (b.roeQuarterly ?? -Infinity) - (a.roeQuarterly ?? -Infinity),
    metricHeaderHtml: `ROE${THEAD_SUB("직전분기")}`,
    metricExplain: "ROE — 직전 분기 순이익 ÷ 직전 분기말 자기자본입니다(연환산하지 않은 분기 기준). 주주 돈으로 얼마를 벌었는지를 뜻합니다.",
    metricCellFn: (r) => (r.roeQuarterly === null || r.roeQuarterly === undefined ? "N/A" : `<b class="rank-hl">${r.roeQuarterly.toFixed(1)}%</b>`),
    noteHtml: ROE_NOTE,
  });
}

const DEBT_RATIO_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 부채비율 = 직전 분기말 부채총계 ÷ 직전 분기말 자기자본(낮을수록 재무구조가 안정적). 투자 자문이 아닙니다.</p>`;
async function runValueDebtRatio() {
  await runValueScreenFromSP500(valuationButtons.debtRatio, "부채비율", {
    sortFn: (a, b) => (a.debtRatioQuarterly ?? Infinity) - (b.debtRatioQuarterly ?? Infinity),
    metricHeaderHtml: `부채비율${THEAD_SUB("직전분기")}`,
    metricExplain: "부채비율 — 직전 분기말 총부채 ÷ 자기자본입니다. 낮을수록 빚 부담이 적고, 업종에 따라 적정 수준이 다릅니다.",
    metricCellFn: (r) => (r.debtRatioQuarterly === null || r.debtRatioQuarterly === undefined ? "N/A" : `<b class="rank-hl">${r.debtRatioQuarterly.toFixed(1)}%</b>`),
    noteHtml: DEBT_RATIO_NOTE,
  });
}

const WEEK52_LOW_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 52주최저 = 최근 52주 최고~최저 구간에서 현재가의 위치(0%=52주 최저, 100%=52주 최고) — 낮을수록 저점에 가깝습니다. 투자 자문이 아닙니다.</p>`;
async function runValueWeek52Low() {
  await runValueScreenFromSP500(valuationButtons.week52Low, "52주최저", {
    sortFn: (a, b) => (a.week52RangePct ?? Infinity) - (b.week52RangePct ?? Infinity),
    metricHeaderHtml: `52주 위치${THEAD_SUB("0=최저")}`,
    metricExplain: "52주 위치 — 최근 1년 종가의 최저~최고 구간에서 현재가가 어디쯤인지입니다. 0%면 1년 최저가, 100%면 1년 최고가입니다.",
    // % 아래에 이 값이 어느 끝에 가까운지 안내(2026-08-31 사용자 요청): 50% 미만 "(0%: 최저)", 50% 이상 "(100%: 최고)"
    metricCellFn: (r) => {
      if (r.week52RangePct === null || r.week52RangePct === undefined) return "N/A";
      const hint = r.week52RangePct >= 50 ? "(100%: 최고)" : "(0%: 최저)";
      return `<b class="rank-hl">${r.week52RangePct.toFixed(0)}%</b><br><span class="week52-pos-hint">${hint}</span>`;
    },
    noteHtml: WEEK52_LOW_NOTE,
  });
}

bindValuation(valuationButtons.revenue, runValueRevenue);
bindValuation(valuationButtons.cashFlow, runValueCashFlow);
bindValuation(valuationButtons.netIncome, runValueNetIncome);
bindValuation(valuationButtons.eps, runValueEps);
bindValuation(valuationButtons.per, runValuePer);
bindValuation(valuationButtons.stability, runValueStability);
bindValuation(valuationButtons.marketCap, runValueMarketCap);
bindValuation(valuationButtons.operatingMargin, runValueOperatingMargin);
bindValuation(valuationButtons.roe, runValueRoe);
bindValuation(valuationButtons.debtRatio, runValueDebtRatio);
bindValuation(valuationButtons.week52Low, runValueWeek52Low);

// 국내/해외 전환 시 지금 보고 있는 화면을 새 시장 기준으로 즉시 새로고침 —
// 기업가치/시장동향은 활성 그룹의 첫 항목을 자동 실행, 인사이트의 나머지 카테고리도 현재 카테고리를 다시 불러옴
document.addEventListener("marketmodechange", () => {
  const activeKey = TAB_ORDER[activeTabIndex];
  if (activeKey === "topranking") {
    // 2026-09-12 상단 탭 개편: topranking 패널은 투자처마다 다른 화면(인기종목·승률·수익률·변동성·배당률·IPO)을 띄운다.
    //  · ETF·비트코인 섹션은 국내/해외 토글을 따라가지 않으므로 손대지 않는다(ETF는 자체 지역 칩이 따로 있음).
    //  · 서브내비가 비어 있으면 상단 탭 화면 — 지금 보고 있는 그 탭만 새 시장 기준으로 다시 그린다.
    //  · 서브내비가 있으면 간편검색으로 들어온 예전 랭킹 화면이라 기존처럼 그룹 첫 항목을 실행한다.
    // 하단 국내/미국 버튼은 이 이벤트 "뒤에" 인기종목으로 화면을 갈아끼우므로, 한 틱 미뤄 지금 화면이
    // 그대로인지 다시 확인한 다음에만 재검색한다(쓸데없는 스캔 방지).
    if (appSectionMode !== "stocks") return;
    if (el("topRankingSubNav").innerHTML) {
      activateRankingGroup(tabTrendBtn.classList.contains("active") ? "market" : "disclosure");
      return;
    }
    window.setTimeout(() => {
      // 지금 화면이 정말 그 상단 탭인지는 제목줄이 가리키는 키로 판단한다. trendGroup의 display만 보면
      // 앱을 막 켰을 때(아직 어떤 화면도 안 그린 상태)도 조건에 걸려 승률 스캔이 헛돌았다(2026-09-12 수정).
      if (appSectionMode !== "stocks" || el("topRankingSubNav").innerHTML) return;
      const nowKey = el("carouselViewTitle").getAttribute("data-i18n");
      if (nowKey !== STOCK_METRIC_TABS[stockMetricTab].title) return; // 인기종목·IPO 화면이면 각자 리스너가 처리
      STOCK_METRIC_TABS[stockMetricTab].run();
    }, 0);
  }
});

// ---------- 다트공시(국내 전용) — DART 전자공시 기준 평균연봉·평균근속·자사주취득·직원증가 4대 지표 ----------
// scripts/scan-dart-financials.js(GitHub Actions, 주 1회)가 미리 만들어둔 data/dart-financials.json을 그대로 읽어와
// 정렬만 클라이언트에서 함(재무제표까지 조회해야 하는 무거운 API라 브라우저에서 실시간 스캔하지 않음)
let dartFinancialsPromise = null;
function getDartFinancialsData() {
  if (!dartFinancialsPromise) {
    dartFinancialsPromise = fetch("data/dart-financials.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return dartFinancialsPromise;
}
const HOLDING_COMPANY_NAME_PATTERN = /지주|홀딩스/;
// ---------- 3. 신기술 ----------
// MIT Technology Review·McKinsey·IEEE Spectrum·OECD 4곳의 최신 글을 매일 자동으로 요약·삽화 생성해
// data/techinsight.json + data/techinsight-images/ 로 저장하는 파이프라인(scripts/scan-techinsight.js,
// GitHub Actions techinsight-daily.yml)의 결과를 카드 형태로 표시. 첫 자동 실행 전에는 데이터가 없을 수 있음
const TECH_SOURCE_LABEL = {
  mit: "MIT Technology Review",
  mckinsey: "McKinsey",
  ieee: "IEEE Spectrum",
  oecd: "OECD",
};
let techInsightDataPromise = null;
function getTechInsightData() {
  if (!techInsightDataPromise) {
    techInsightDataPromise = fetch("data/techinsight.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return techInsightDataPromise;
}

// 올라온 시각을 "1시간 전"·"2일 전"처럼 표기(원문 게시 시각, 없으면 수집 시각)
function techAgoText(item) {
  const t = Date.parse(item.publishedAt || item.createdAt || "");
  if (!t) return "";
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 60) return `${Math.max(1, m)}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}일전` : `${Math.floor(d / 30)}개월전`;
}
function techInsightCardHtml(item) {
  const sourceLabel = TECH_SOURCE_LABEL[item.sourceKey] || item.source;
  const agoText = techAgoText(item);
  return `
    <div class="tech-insight-card">
      <img class="tech-insight-img" src="${escapeHtml(item.image)}" alt="" loading="lazy" />
      <div class="tech-insight-body">
        <span class="tech-insight-source">${escapeHtml(sourceLabel)}${agoText ? ` <span class="tech-ago">· ${agoText}</span>` : ""}</span>
        <h3 class="tech-insight-title">${escapeHtml(item.title)}</h3>
        <p class="tech-insight-summary">${escapeHtml(item.summary).replace(/\n/g, "<br>")}</p>
        <a class="tech-insight-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">원문 보기(${escapeHtml(sourceLabel)}) →</a>
      </div>
    </div>`;
}

// ---------- 4. 실적&공시 일정 ----------
// 일반기업 실적발표(주요 대형주, Yahoo fundamentals-timeseries로 실시간 추정) + 13F 기관 공시 마감 +
// 미국/한국/일본 금리 발표 + 미국 CPI·고용지표(정적 조사 데이터, data/econ-calendar-2026.json) +
// 미국 옵션만기일(매월 세번째 금요일, 계산) + 관심종목의 실적발표·배당락(추정)을 합쳐
// 이번달·다음달 달력(월간 그리드) + 날짜순 목록으로 표시
const CALENDAR_WATCHLIST = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "WMT"];
const ECON_CALENDAR_CATEGORY_LABEL = {
  earnings: "🏢 기업실적",
  "13f": "📑 13F 공시",
  rate: "🏦 금리",
  cpi: "📈 CPI",
  jobs: "👷 고용지표",
  opex: "📅 옵션만기",
  pce: "📊 PCE",
  gdp: "📐 GDP",
  ism: "🏭 ISM",
  retail: "🛍️ 소매판매",
  cnpmi: "🏭 중국PMI",
  trade: "🚢 수출입",
  industry: "🏗️ 산업활동",
  minwage: "💵 최저임금",
};
const ECON_CALENDAR_COUNTRY_FLAG = { us: "🇺🇸", kr: "🇰🇷", jp: "🇯🇵", cn: "🇨🇳" };
const CAL_DOT_CLASS = {
  rate: "cal-dot-rate",
  cpi: "cal-dot-cpi",
  jobs: "cal-dot-jobs",
  "13f": "cal-dot-13f",
  opex: "cal-dot-opex",
  pce: "cal-dot-pce",
  gdp: "cal-dot-gdp",
  ism: "cal-dot-ism",
  retail: "cal-dot-retail",
  cnpmi: "cal-dot-cnpmi",
  trade: "cal-dot-trade",
  industry: "cal-dot-industry",
  minwage: "cal-dot-minwage",
};

// 매달 세 번째 금요일(미국 개별주식·지수옵션 월간 만기일) — 3/6/9/12월은 분기 마감(쿼드러플 위칭)으로 별도 표기
function usOptionsExpirationDates(year) {
  const dates = [];
  for (let month = 0; month < 12; month++) {
    const d = new Date(year, month, 1);
    const firstFriday = 1 + ((5 - d.getDay() + 7) % 7);
    const thirdFriday = firstFriday + 14;
    const quad = [2, 5, 8, 11].includes(month);
    dates.push({ date: new Date(year, month, thirdFriday), quad });
  }
  return dates;
}

let econCalendarDataPromise = null;
function getEconCalendarData() {
  if (!econCalendarDataPromise) {
    econCalendarDataPromise = fetch("data/econ-calendar-2026.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .catch(() => ({ events: [] }));
  }
  return econCalendarDataPromise;
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// 달력상 분기 라벨(1~4분기)는 회사별 회계연도가 아니라 해당 날짜가 속한 일반 달력 분기를 표시하는 근사치
function fiscalQuarterLabel(date) {
  return `${Math.floor(date.getMonth() / 3) + 1}분기`;
}

// 관심종목(대형주)의 다음 분기 마감일 기준 발표 예정일을 근사 추정(회계분기 마감 + 약 1개월 뒤) — 정확한 발표일은
// quoteSummary(calendarEvents)가 이 앱의 무인증 프록시에서 "Invalid Crumb" 오류로 막혀 있어 가져올 수 없음
async function estimateNextEarningsDate(symbol) {
  const est = await estimateNextEarningsDateRaw(symbol);
  // 2026-10-22 사용자 요청(넷플릭스): 3분기 실적이 이미 나왔는데 다음이 3분기로 나오던 문제 — 야후 분기 재무는 늦게 반영되므로
  // 실적 일정 데이터의 최근 발표일(last)이 있으면 그 13주(91일) 뒤를 다음 실적으로 추정하고, 분기 이름도 그에 맞춘다(둘 중 더 늦은 날짜)
  try {
    await getEarningsCal();
    const e = earningsEntry(symbol);
    if (e && e.last && !e.next) {
      const d = new Date(new Date(e.last + "T00:00:00").getTime() + 91 * 86400000);
      if (d >= new Date() && (!est || d > est.date)) return { symbol, date: d, quarterLabel: fiscalQuarterLabel(addMonths(d, -1)) };
    }
  } catch {}
  return est;
}
async function estimateNextEarningsDateRaw(symbol) {
  try {
    const data = await yahooFundamentals(symbol, "quarterlyTotalRevenue");
    const resultArr = data && data.timeseries && data.timeseries.result;
    const items = (resultArr && resultArr[0] && resultArr[0].quarterlyTotalRevenue) || [];
    const dates = items.map((it) => it && it.asOfDate).filter(Boolean).sort();
    if (dates.length === 0) return null;
    const lastQuarterEnd = new Date(dates[dates.length - 1] + "T00:00:00");
    const nextQuarterEnd = addMonths(lastQuarterEnd, 3);
    const estReportDate = addMonths(nextQuarterEnd, 1);
    return { symbol, date: estReportDate, quarterLabel: fiscalQuarterLabel(nextQuarterEnd) };
  } catch {
    return null;
  }
}

// 과거 배당 지급일 간격(최근 4회 평균 주기)으로 다음 배당락일을 근사 추정 — 배당을 지급하지 않는 종목은 null 반환
async function estimateNextDividendDate(symbol) {
  try {
    const data = await yahooDividends(symbol);
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    const divEvents = result && result.events && result.events.dividends;
    if (!divEvents) return null;
    const dates = Object.values(divEvents)
      .map((d) => new Date(d.date * 1000))
      .sort((a, b) => a - b);
    if (dates.length < 2) return null;
    const recent = dates.slice(-4);
    let totalGapDays = 0;
    for (let i = 1; i < recent.length; i++) totalGapDays += (recent[i] - recent[i - 1]) / 86400000;
    const avgGapDays = totalGapDays / (recent.length - 1);
    if (!avgGapDays || avgGapDays < 20) return null; // 비정상적으로 짧은 간격(데이터 이상)은 제외
    let nextDate = new Date(dates[dates.length - 1].getTime() + avgGapDays * 86400000);
    const now = new Date();
    let guard = 0;
    while (nextDate < now && guard++ < 12) nextDate = new Date(nextDate.getTime() + avgGapDays * 86400000);
    return { symbol, date: nextDate, quarterLabel: fiscalQuarterLabel(nextDate) };
  } catch {
    return null;
  }
}

// 캘린더에 표시할 전체 이벤트 목록(거시일정 + 옵션만기 + 관심종목 실적·배당) 구성
// 관심종목이 없으면(로그아웃/미설정) 기본 대형주 목록(CALENDAR_WATCHLIST)으로 대체해 빈 화면을 방지
async function buildCalendarEvents() {
  const watchlistSymbols = getWatchlist().map((w) => w.symbol);
  const symbolsForEstimate = watchlistSymbols.length ? watchlistSymbols : CALENDAR_WATCHLIST;

  const [econData, earningsEstimates, dividendEstimates] = await Promise.all([
    getEconCalendarData(),
    mapWithConcurrency(symbolsForEstimate, 5, estimateNextEarningsDate),
    mapWithConcurrency(symbolsForEstimate, 5, estimateNextDividendDate),
  ]);

  const events = (econData.events || []).map((e) => ({ ...e, type: "macro" }));
  const now = new Date();

  [usOptionsExpirationDates(now.getFullYear()), usOptionsExpirationDates(now.getFullYear() + 1)].flat().forEach((o) => {
    events.push({
      date: toISODate(o.date),
      type: "macro",
      category: "opex",
      country: "us",
      title: o.quad ? "미국 옵션만기(쿼드러플 위칭)" : "미국 옵션만기(월간)",
    });
  });

  earningsEstimates.filter(Boolean).forEach((e) => {
    events.push({
      date: toISODate(e.date),
      type: "stock",
      category: "earnings",
      symbol: e.symbol,
      title: `${e.quarterLabel} 실적발표(추정)`,
    });
  });
  dividendEstimates.filter(Boolean).forEach((e) => {
    events.push({
      date: toISODate(e.date),
      type: "stock",
      category: "dividend",
      symbol: e.symbol,
      title: `${e.quarterLabel} 배당락(추정)`,
    });
  });

  return { events, usingWatchlist: watchlistSymbols.length > 0 };
}

// 월간 그리드(일~토, 6행 고정칸) HTML — 이벤트가 있는 날짜는 상단에 최대 3개까지 점/미니로고, 초과분은 +N
function calendarMonthGridHtml(year, month, eventsByDate, todayISO) {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dowHtml = ["일", "월", "화", "수", "목", "금", "토"]
    .map((s, i) => `<div class="cal-dow${i === 0 ? " cal-dow-sun" : ""}${i === 6 ? " cal-dow-sat" : ""}">${s}</div>`)
    .join("");

  const dayHtml = cells
    .map((d) => {
      if (d === null) return `<div class="cal-day cal-day-empty"></div>`;
      const iso = toISODate(new Date(year, month, d));
      const dayEvents = eventsByDate[iso] || [];
      const isToday = iso === todayISO;
      const dow = new Date(year, month, d).getDay();
      // 로고 아이콘이 커진 만큼(18px) 한 칸에 최대 2개까지만 보여주고 나머지는 +N 배지로(좁은 화면에서 겹침 방지)
      // 금리 발표는 국가별로 달라 색점 대신 국기 이모지로 표시(미국/한국/일본을 한눈에 구분)
      const iconsHtml = dayEvents
        .slice(0, 2)
        .map((e) => {
          if (e.type === "stock") return `<span class="cal-day-icon cal-day-icon-logo">${tickerLogoHtml(e.symbol)}</span>`;
          if (e.category === "rate") return `<span class="cal-day-icon cal-day-icon-flag">${ECON_CALENDAR_COUNTRY_FLAG[e.country] || "🏦"}</span>`;
          return `<span class="cal-day-icon cal-dot ${CAL_DOT_CLASS[e.category] || "cal-dot-etc"}"></span>`;
        })
        .join("");
      const overflow = dayEvents.length > 2 ? `<span class="cal-day-more">+${dayEvents.length - 2}</span>` : "";
      // 날짜를 누르면 지난 날짜여도(이번 달에 있었던 일정 확인용) 그날의 일정을 큰 팝업으로 보여줌
      const isClickable = dayEvents.length > 0;
      const cls = ["cal-day", isClickable ? "has-event" : "", isToday ? "cal-day-today" : "", dow === 0 ? "cal-day-sun" : "", dow === 6 ? "cal-day-sat" : ""]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}" data-date="${iso}"><span class="cal-day-num">${d}</span><span class="cal-day-icons">${iconsHtml}${overflow}</span></div>`;
    })
    .join("");

  return `
    <div class="cal-month">
      <h3 class="cal-month-title">${year}년 ${monthNames[month]}</h3>
      <div class="cal-grid">${dowHtml}${dayHtml}</div>
    </div>`;
}

// 날짜별 목록(아젠다) — 종목 이벤트는 같은 날짜·같은 종목끼리 로고 하나에 내용을 쉼표로 묶어 표시(예: "로고 AAPL: 3분기 실적발표, 3분기 배당락")
function calendarAgendaHtml(events, rangeStartISO, rangeEndISO) {
  const filtered = events.filter((e) => e.date >= rangeStartISO && e.date <= rangeEndISO).sort((a, b) => a.date.localeCompare(b.date));
  if (filtered.length === 0) return `<p class="muted" style="text-align:center;padding:16px 0;">표시할 예정 일정이 없습니다.</p>`;

  const byDate = {};
  filtered.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  return Object.keys(byDate)
    .sort()
    .map((date) => {
      const dayEvents = byDate[date];
      const macroRows = dayEvents
        .filter((e) => e.type === "macro")
        .map((e) => {
          const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
          const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
          return `<div class="cal-agenda-row"><span class="cal-agenda-cat">${catLabel}</span><span class="cal-agenda-text">${flag} ${escapeHtml(e.title)}</span></div>`;
        })
        .join("");

      const stockGroups = {};
      dayEvents
        .filter((e) => e.type === "stock")
        .forEach((e) => {
          (stockGroups[e.symbol] = stockGroups[e.symbol] || []).push(e.title);
        });
      const stockRows = Object.entries(stockGroups)
        .map(
          ([sym, titles]) =>
            `<div class="cal-agenda-row"><span class="cal-agenda-logo">${tickerLogoHtml(sym)}</span><span class="cal-agenda-text"><b class="ticker-link" data-ticker="${escapeHtml(sym)}">${escapeHtml(sym)}</b> ${titles.map((t) => escapeHtml(t)).join(", ")}</span></div>`
        )
        .join("");

      const d = new Date(date + "T00:00:00");
      const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
      return `<div class="cal-agenda-group" id="cal-agenda-${date}"><div class="cal-agenda-date">${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})</div>${macroRows}${stockRows}</div>`;
    })
    .join("");
}

// ---------- 캘린더 패널(하단 네비 캘린더 아이콘) — 이번달·다음달 그리드 + 로고가 붙은 날짜별 목록 ----------
async function runCalendarPanel() {
  const status = el("calendarPanelStatus");
  const results = el("calendarPanelResults");
  status.style.display = "";
  status.textContent = "⏳ 캘린더를 불러오는 중...";
  results.innerHTML = "";

  const { events, usingWatchlist } = await buildCalendarEvents();

  const now = new Date();
  const todayISO = toISODate(now);
  const eventsByDate = {};
  events.forEach((e) => {
    (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e);
  });

  const thisMonthGrid = calendarMonthGridHtml(now.getFullYear(), now.getMonth(), eventsByDate, todayISO);
  const nextMonthDate = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
  const nextMonthGrid = calendarMonthGridHtml(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), eventsByDate, todayISO);

  const rangeEnd = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0);
  const agendaHtml = calendarAgendaHtml(events, todayISO, toISODate(rangeEnd));

  const watchlistNote = usingWatchlist
    ? "💰 배당락·🏢 실적발표 로고 항목은 회원님의 관심종목 기준입니다."
    : "💰 배당락·🏢 실적발표 로고 항목은 관심종목이 없어 주요 대형주 기준으로 표시 중입니다. 관심종목을 추가하면 내 종목 일정으로 바뀝니다.";

  status.style.display = "none";
  results.innerHTML = `
    <p class="muted" style="font-size:12px;margin:0 0 8px;">*관심종목 추가시 분기 실적, 배당락일이 일정에 추가됩니다.</p>
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 실적발표·배당락은 과거 발표 주기를 바탕으로 한 추정치, 13F 공시 마감·금리 발표·CPI·고용지표는 2026년 공식 일정 조사 기준(변경될 수 있음), 옵션만기일은 매월 세 번째 금요일로 계산한 값입니다. ${escapeHtml(watchlistNote)} 투자 자문이 아닙니다.</p>
    <div class="cal-wrap">
      ${thisMonthGrid}
      ${nextMonthGrid}
    </div>
    <h3 class="cal-agenda-heading">📋 다가오는 일정</h3>
    <div class="cal-agenda">${agendaHtml}</div>
  `;

  results.querySelectorAll(".cal-day.has-event").forEach((dayEl) => {
    dayEl.addEventListener("click", () => {
      openCalendarDayModal(dayEl.dataset.date, eventsByDate[dayEl.dataset.date] || []);
    });
  });
}

// 날짜 칸을 눌렀을 때 그날의 일정을 큰 글씨·큰 로고로 보여주는 팝업(과거·미래 날짜 모두 동작)
function calendarDayModalRowHtml(e) {
  if (e.type === "stock") {
    return `
      <div class="cal-day-modal-row">
        <span class="cal-day-modal-logo">${tickerLogoHtml(e.symbol)}</span>
        <div class="cal-day-modal-text"><b class="ticker-link" data-ticker="${escapeHtml(e.symbol)}">${escapeHtml(e.symbol)}</b><span>${escapeHtml(e.title)}</span></div>
      </div>`;
  }
  const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
  const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
  return `
    <div class="cal-day-modal-row">
      <span class="cal-day-modal-flag">${e.category === "rate" ? flag || "🏦" : catLabel.slice(0, 2)}</span>
      <div class="cal-day-modal-text"><b>${catLabel}</b><span>${flag && e.category !== "rate" ? flag + " " : ""}${escapeHtml(e.title)}</span></div>
    </div>`;
}
function openCalendarDayModal(iso, dayEvents) {
  const d = new Date(iso + "T00:00:00");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  el("calendarDayModalTitle").textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
  el("calendarDayModalBody").innerHTML = dayEvents.map(calendarDayModalRowHtml).join("");
  el("calendarDayModal").style.display = "flex";
}
function closeCalendarDayModal() {
  el("calendarDayModal").style.display = "none";
}
el("calendarDayModalCloseBtn").addEventListener("click", closeCalendarDayModal);

// 과거분석 대상 종목 1개의 "기준 시점 스냅샷" 지표를 계산 — 2년치 차트로 기준 시점의 52주 범위·모멘텀·매출성장성까지 근사
// (오늘 기준 데이터는 이미 phase1의 getFullMetrics 결과를 재사용하므로 여기서는 기준 시점 데이터만 새로 조회)
async function getHistoricalCompareMetrics(symbol, sp500PairsPromise) {
  const referenceTimestamp = Math.floor(getHistoricalReferenceDate().getTime() / 1000);

  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol, "2y"),
    yahooFundamentals(symbol, "annualTotalRevenue,annualNetIncome,annualShareIssued,quarterlyTotalRevenue").catch(() => null),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) return null;
  const meta = result.meta;
  const pairs = chartClosePairs(chartData);
  const asOfPair = firstTradingDayOnOrAfter(pairs, referenceTimestamp);
  if (!asOfPair) return null;

  const momentum3mAsOf = returnOverWindowEndingAt(pairs, asOfPair.t, THREE_MONTH_SECONDS, MOMENTUM_TOLERANCE_SECONDS);
  const dollarVolumePairs = chartDollarVolumePairs(chartData);
  const { recent5dAvg: recentDollarVolumeAsOf, avg1y: avgDollarVolume1yAsOf } = dollarVolumeStatsEndingAt(dollarVolumePairs, asOfPair.t);
  // 상승압력 공통 배점(2026-09-03 통일) 입력의 당시 값 — 한달 수익률·3개월 평균 거래대금(RSI는 과거값이 없어 중립 처리)
  const monthReturnAsOf = returnOverWindowEndingAt(pairs, asOfPair.t, 30 * 86400, MOMENTUM_TOLERANCE_SECONDS);
  const dv3mAsOfArr = dollarVolumePairs.filter((p) => p.t <= asOfPair.t && p.t >= asOfPair.t - 91 * 86400).map((p) => p.dv);
  const avgDollarVolume3mAsOf = dv3mAsOfArr.length ? dv3mAsOfArr.reduce((a, b) => a + b, 0) / dv3mAsOfArr.length : null;

  let sharesOutstanding = null;
  const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
  for (const block of resultArr) {
    if (block.annualShareIssued)
      sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
  }
  const revenueSeries = await fundamentalSeries(resultArr, "annualTotalRevenue", meta.currency);
  const revenueQuarterlySeries = await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency);
  const netIncomeSeries = await fundamentalSeries(resultArr, "annualNetIncome", meta.currency);

  const asOfDate = new Date(asOfPair.t * 1000);
  const revenueSeriesAsOf = revenueSeries.filter((it) => new Date(it.date) <= asOfDate);
  const revenueQuarterlySeriesAsOf = revenueQuarterlySeries.filter((it) => new Date(it.date) <= asOfDate);
  const netIncomeSeriesAsOf = netIncomeSeries.filter((it) => new Date(it.date) <= asOfDate);
  const revenueGrowthYoYAsOf = latestQuarterRevenueYoY(revenueQuarterlySeriesAsOf) ?? latestAnnualRevenueYoY(revenueSeriesAsOf);
  const revenueAsOf = revenueSeriesAsOf.length ? revenueSeriesAsOf[revenueSeriesAsOf.length - 1].value : null;
  const netIncomeAsOf = netIncomeSeriesAsOf.length ? netIncomeSeriesAsOf[netIncomeSeriesAsOf.length - 1].value : null;

  const historicalPrice = asOfPair.c;
  const historicalMarketCap = sharesOutstanding ? historicalPrice * sharesOutstanding : null;

  const sp500Pairs = await sp500PairsPromise;
  const sp500ReturnAsOf = returnOverYearEndingAt(sp500Pairs, asOfPair.t);
  const oneYearReturnAsOf = returnOverYearEndingAt(pairs, asOfPair.t);

  const metricsAsOf = {
    symbol,
    price: historicalPrice,
    momentum3m: momentum3mAsOf,
    recentDollarVolume: recentDollarVolumeAsOf,
    avgDollarVolume1y: avgDollarVolume1yAsOf,
    monthReturn: monthReturnAsOf,
    avgDollarVolume3m: avgDollarVolume3mAsOf,
    revenueGrowthYoY: revenueGrowthYoYAsOf,
    oneYearReturn: oneYearReturnAsOf,
    netIncome: netIncomeAsOf,
    revenue: revenueAsOf,
    marketCap: historicalMarketCap,
    currency: meta.currency,
  };

  const attractiveness = computeAttractivenessScore(metricsAsOf);
  const risk = computeRiskScore(metricsAsOf, sp500ReturnAsOf);

  return {
    asOfDate,
    historicalPrice,
    historicalMarketCap,
    historicalAttractiveness: attractiveness.total,
    historicalRisk: risk.total,
  };
}

// 티커 앞에 표시할 작은 원형 기업 로고 — financialmodelingprep 로고 이미지를 쓰고, 로드 실패 시 티커 앞 2글자 배지로 폴백(추가 네트워크 호출 없음)
// 회사 로고 소스 — logo.dev(티커 기반 고화질·동일 크기·레티나)를 우선 사용하고, 토큰이 없거나 로드 실패 시
// financialmodelingprep 이미지로 폴백, 둘 다 실패하면 티커 배지 표시. LOGODEV_TOKEN에 publishable 토큰(pk_...)을 넣으면 자동 활성화.
const LOGODEV_TOKEN = ""; // TODO: logo.dev publishable 토큰(pk_...)을 넣으면 고화질 로고로 전환됨
function logoSources(symbol, size) {
  const enc = encodeURIComponent(symbol);
  const fmp = `https://financialmodelingprep.com/image-stock/${enc}.png`;
  const primary = LOGODEV_TOKEN
    ? `https://img.logo.dev/ticker/${enc}?token=${encodeURIComponent(LOGODEV_TOKEN)}&size=${size || 80}&retina=true&format=png`
    : fmp;
  return { primary, fmp, useFallback: !!LOGODEV_TOKEN };
}
// 로고 <img>의 onerror 체인 — data-fallback(FMP)이 있으면 한 번 그걸로 교체하고, 없으면 형제 배지로 대체
const LOGO_ONERROR = "var f=this.dataset.fallback; if(f){this.removeAttribute('data-fallback');this.src=f;}else{this.style.display='none';this.nextElementSibling.style.display='flex';}";

// 특정 종목은 자체 호스팅한 지정 로고로 대체(자동 소스 화질/누락 문제 대응). bg로 원 배경색을 채워 로고가 잘리지 않게 함.
const SKHYNIX_LOGO = { src: "logos/skhynix.png", bg: "#ffffff" };
const LOGO_OVERRIDE = {
  // 카카오뱅크(2026-09-13 사용자 요청): FMP 로고는 검은 B 글자만 와서, 실제 앱 아이콘처럼 노란 둥근 사각형 위 B로 합성해 자체 호스팅
  "323410.KS": { src: "logos/kakaobank.png" },
  // 스페이스X(SPCX)는 기존 자동 로고 유지 — 전역 인셋(72%)으로 축소되어 잘리지 않음
  SKHY: SKHYNIX_LOGO, // SK하이닉스 나스닥 ADR(2026-07 상장)
  SKHYV: SKHYNIX_LOGO, // 상장 초기 임시 심볼
  "000660.KS": SKHYNIX_LOGO, // 한국거래소 원주
  // 한화그룹·한화오션(2026-09-03 사용자 요청): 자동 소스 로고가 부정확해 위키미디어 공식 로고로 교체(자체 호스팅)
  "000880.KS": { src: "logos/hanwha.png", bg: "#ffffff" },
  "042660.KS": { src: "logos/hanwha-ocean.png", bg: "#ffffff" },
  // 효성중공업(298040, 2026-09-03 사용자 요청): 위키미디어 공식 HYOSUNG 워드마크를 정사각 패딩해 자체 호스팅
  "298040.KS": { src: "logos/hyosung-heavy.png", bg: "#ffffff" },
  // FMP에 로고가 없는(404) 종목들 — 브랜드평판순 목록 131개 전수 점검 후 확인된 것만 추가(나머지는 정상 로드됨)
  LGEIY: { src: "logos/lg.svg", bg: "#ffffff" }, // LG전자 미국 OTC ADR — Wikimedia Commons(자유 이용) LG 로고
  // 2026-09-10 사용자 요청("SOIL 로고가 회사 건물 사진") — 코스피200+코스닥150 로고 316개를 전수 분석해
  // 로고 마크가 아니라 사옥·공장·선박 사진이 오던 종목을 전부 찾아, 위키미디어 공용 로고로 교체(자체 호스팅)
  "010950.KS": { src: "logos/soil.png", bg: "#ffffff" }, // S-Oil(사옥 사진 → S-OIL 로고)
  "011200.KS": { src: "logos/hmm.png", bg: "#ffffff" }, // HMM(컨테이너선 사진 → HMM 로고)
  "018260.KS": { src: "logos/samsung-sds.png", bg: "#ffffff" }, // 삼성에스디에스
  "120110.KS": { src: "logos/kolon.png", bg: "#ffffff" }, // 코오롱인더스트리
  "000240.KS": { src: "logos/hankook-company.png", bg: "#ffffff" }, // 한국앤컴퍼니
  "000720.KS": { src: "logos/hyundai-enc.png", bg: "#ffffff" }, // 현대건설
  "064350.KS": { src: "logos/hyundai-rotem.png", bg: "#ffffff" }, // 현대로템
  "081660.KS": { src: "logos/fila-holdings.png", bg: "#ffffff" }, // 휠라홀딩스(모델 사진 → FILA 로고)
  "112610.KS": { src: "logos/cswind.png", bg: "#ffffff" }, // 씨에스윈드(공장 항공사진 → CS WIND 로고)
  "003030.KS": { src: "logos/seah-steel.png", bg: "#ffffff" }, // 세아제강지주
  "003550.KS": { src: "logos/lg.svg", bg: "#ffffff" }, // LG(트윈타워 사진 → LG 로고, 이미 있던 파일 재사용)
  // 2026-09-10 2차(사용자 요청 "에스원처럼 사람 얼굴 들어간 로고도"): 전체 316개를 눈으로 다시 훑어
  // 사람·캐릭터 얼굴이나 홍보 사진이 쓰이던 종목도 로고 마크로 교체
  "012750.KS": { src: "logos/s1-corp.png", bg: "#ffffff" }, // 에스원(안내사원 캐릭터 → 에스원 CI)
  "251270.KS": { src: "logos/netmarble.png", bg: "#ffffff" }, // 넷마블(캐릭터 얼굴 → netmarble 워드마크)
  "010120.KS": { src: "logos/ls-electric.png", bg: "#ffffff" }, // LS ELECTRIC(홍보 배너 → LS ELECTRIC 로고)
  "011210.KS": { src: "logos/hyundai-wia.png", bg: "#ffffff" }, // 현대위아(흑백 공장 사진 → HYUNDAI WIA 로고)
  "069620.KS": { src: "logos/daewoong.png", bg: "#ffffff" }, // 대웅제약(흐릿한 사진 → 대웅 심볼)
};

// 한국 ETF 로고(2026-09-03 사용자 요청): 숫자 티커라 FMP 로고가 없어 브랜드(첫 단어) → 운용사 그룹 CI로 표시.
// 그룹 CI는 이미 FMP에 있는 상장 계열사 로고를 재사용(삼성전자=삼성, 미래에셋증권=미래에셋 등), 한화 계열은 자체 호스팅 로고
// 국내 ETF 브랜드 마크(2026-09-11 사용자 요청 "하나하나 찾아서 진짜 로고로") —
// 전에는 브랜드의 모회사 CI(KODEX에 삼성전자 로고 식)를 썼는데, 그건 운용사 로고도 아니고 다 똑같아 보였다.
// 지금은 KODEX·TIGER·RISE 같은 ETF 브랜드 자체의 마크를 자체 호스팅한다. 상품명 첫 단어로 매칭하므로
// 브랜드당 파일 하나로 그 브랜드의 전 종목(KODEX만 241개)을 덮는다.
// 여기 없는 브랜드(SOL·HANARO·1Q·KoAct·TIMEFOLIO·WON 등)는 공개된 로고 파일을 못 구해서,
// 화면에서는 추종 대상 테마 이모지로 떨어진다.
const KR_ETF_BRAND_LOGO_SRC = {
  KODEX: "logos/etf/kodex.png",
  TIGER: "logos/etf/tiger.png",
  RISE: "logos/etf/rise.png",
  KBSTAR: "logos/etf/rise.png", // KBSTAR가 RISE로 브랜드 변경(2026)
  ACE: "logos/etf/ace.png",
  PLUS: "logos/etf/plus.png",
  ARIRANG: "logos/etf/plus.png", // ARIRANG -> PLUS로 브랜드 변경
  KIWOOM: "logos/etf/kiwoom.png",
  KOSEF: "logos/etf/kiwoom.png", // KOSEF도 키움자산운용
  FOCUS: "logos/etf/focus.png",
  TREX: "logos/etf/trex.png",
  "파워": "logos/etf/power.png",
  // 아래는 FMP에 없어서 각 브랜드 공식 사이트에서 직접 받아온 것(2026-09-11)
  SOL: "logos/etf/sol.png",
  HANARO: "logos/etf/hanaro.png",
  "1Q": "logos/etf/oneq.svg",
  KoAct: "logos/etf/koact.svg",
  TIME: "logos/etf/time.png", // TIMEFOLIO — 상품명은 "TIME"으로 시작
  TIMEFOLIO: "logos/etf/time.png",
  WON: "logos/etf/won.png",
  IBK: "logos/etf/ibk.svg",
};
// 로고가 흰색이라 흰 원 위에서 안 보이는 브랜드 — 어두운 배경을 깔아준다
const KR_ETF_BRAND_DARK_BG = new Set(["IBK"]);
// 상품명으로 브랜드를 찾아 그 심볼의 LOGO_OVERRIDE를 등록 — ETF 목록·상세 렌더 직전에 호출(로드 실패 시 기존 배지 폴백 유지)
// 상품명으로 브랜드를 찾아 그 심볼의 LOGO_OVERRIDE를 등록 — ETF 목록·상세 렌더 직전에 호출.
// 상품명도 같이 등록해둬야, 브랜드 로고가 없는 종목이 테마 이모지로 떨어질 때 무엇을 추종하는지 판별할 수 있다.
function ensureKrEtfLogoOverride(symbol, name) {
  registerEtfName(symbol, name);
  if (!symbol || LOGO_OVERRIDE[symbol]) return;
  const brand = (name || "").split(" ")[0];
  const src = KR_ETF_BRAND_LOGO_SRC[brand];
  if (src) LOGO_OVERRIDE[symbol] = { src, bg: KR_ETF_BRAND_DARK_BG.has(brand) ? WHITE_LOGO_BG : "#ffffff" };
}

// 미국 ETF 로고 보정(2026-09-11) — 100종목 로고를 전부 받아 픽셀로 점검한 결과 고칠 것 세 가지.
//  ① 검은 "i" 한 글자로만 오는 iShares 11종목: 같은 iShares인데도 파란 정사각 마크로 오는 종목과 섞여
//     목록이 들쭉날쭉해서, 알아보기 쉬운 파란 마크로 통일한다.
//  ② XLE·XLF: Select Sector SPDR인데 엉뚱하게 S&P Global 로고가 온다 -> SPDR 마크로 교체.
//  ③ RSP: 운용사가 인베스코로 바뀐 지 오래인데 옛 Guggenheim 로고가 온다 -> 인베스코로 교체.
// (QQQ·SMH는 로고가 순백색이라 빈 원으로 보였는데, 아래 WHITE_LOGO_TICKERS 방식으로 어두운 배경을 깔아 해결)
const ETF_LOGO_ISHARES = { src: "logos/etf/ishares.png", bg: "#ffffff" };
const ETF_LOGO_SPDR = { src: "logos/etf/spdr.png", bg: "#ffffff" };
const ETF_LOGO_VANECK = { src: "logos/etf/vaneck.png", bg: "#ffffff" };
["ACWI", "AGG", "DVY", "EFA", "IEF", "IEMG", "IVV", "IXUS", "MBB", "PFF", "SHY"].forEach((t) => {
  LOGO_OVERRIDE[t] = ETF_LOGO_ISHARES;
});
["XLE", "XLF"].forEach((t) => {
  LOGO_OVERRIDE[t] = ETF_LOGO_SPDR;
});
LOGO_OVERRIDE.SMH = ETF_LOGO_VANECK; // 흰 VanEck 로고 -> 짙은 워드마크로
LOGO_OVERRIDE.RSP = { src: "logos/etf/invesco.png", bg: "#14161c" }; // 흰 인베스코 로고라 어두운 배경

// FMP 로고가 순백색이라 흰 원 배경에서 안 보이는 종목들(506개 전수 픽셀 분석 결과 61개) — 어두운 배경을 깔아 흰 로고가 보이게 함
const WHITE_LOGO_BG = "#14161c";
const WHITE_LOGO_TICKERS = new Set([
  "ABBV","ADI","ADSK","AIG","ALB","ALL","AMP","ANET","APP","AVB","AWK","AXON","BA","BAX","BLK","CDNS","CEG","CRL","CSX","CTAS",
  "DD","DGX","DHI","DIS","DXCM","EQIX","ETN","FAST","HSY","IBM","JBL","KMI","KR","LCID","LEN","LI","LITE","LMT","LRCX","MAS",
  "MRVL","NIO","NKE","NTAP","NXPI","ON","RBLX","RCL","REGN","STT","SYY","TPR","UBER","ULTA","UNH","V","VRTX","WAT","WSM","WYNN","XPEV",
  "QQQ", // 인베스코 QQQ 로고가 순백색(2026-09-11 ETF 로고 전수 점검)
]);
// 로고 원 배경색 결정: 지정 override.bg > 흰색 로고면 어두운 배경 > 기본(CSS 흰색)
function logoBg(symbol) {
  const ov = LOGO_OVERRIDE[symbol];
  if (ov && ov.bg) return ov.bg;
  if (WHITE_LOGO_TICKERS.has(symbol)) return WHITE_LOGO_BG;
  return null;
}

// badgeLabel: 로고 이미지를 못 찾았을 때 대신 보여줄 배지 문구(기본은 티커 앞 2글자) — 한국 ETF처럼
// 티커가 숫자라 의미 없는 경우, 호출부에서 운용사 브랜드명 약자(KODEX·TIGER 등)를 넘겨 대체
// 이 ETF에 "진짜 로고"가 있는가 — 자체 호스팅 지정 로고가 있거나(국내 브랜드·미국 보정),
// 미국 티커라 FMP 로고를 기대할 수 있는 경우. 국내는 브랜드 표에 없으면 로고가 없다.
function hasRealEtfLogo(symbol) {
  if (LOGO_OVERRIDE[symbol]) return true;
  return !isKrTicker(symbol);
}
// 지정/자동 로고 <img>에 배수 배지까지 얹어서 렌더(ETF 전용)
function realLogoHtml(symbol, badgeLabel, multBadgeHtml) {
  const s = escapeHtml(symbol);
  const badge = escapeHtml(badgeLabel || symbol.slice(0, 2));
  const ov = LOGO_OVERRIDE[symbol];
  const bg = logoBg(symbol);
  const wrapStyle = bg ? ` style="background:${bg}"` : "";
  const img = ov
    ? `<img class="ticker-logo" src="${ov.src}" alt="${s}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : (() => {
        const { primary, fmp, useFallback } = logoSources(symbol, 80);
        return `<img class="ticker-logo" src="${primary}" alt="${s}" loading="lazy"${useFallback ? ` data-fallback="${fmp}"` : ""} onerror="${LOGO_ONERROR}" />`;
      })();
  return `<span class="ticker-logo-wrap etf-real-logo"${wrapStyle}>${img}<span class="ticker-logo-badge" style="display:none;">${badge}</span>${multBadgeHtml || ""}</span>`;
}

function tickerLogoHtml(symbol, badgeLabel) {
  const s = escapeHtml(symbol);
  const badge = escapeHtml(badgeLabel || symbol.slice(0, 2));
  // 암호화폐 심볼(BTC-USD 등)은 자체 호스팅 코인 로고 DB를 우선 사용(2026-09-03) — FMP엔 코인 로고가 없음
  if (/-USD/i.test(symbol)) {
    const cryptoSrc = cryptoLogoSrc(cryptoBaseTicker(symbol));
    if (cryptoSrc) {
      return `<span class="ticker-logo-wrap"><img class="ticker-logo" src="${cryptoSrc}" alt="${s}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="ticker-logo-badge" style="display:none;">${badge}</span></span>`;
    }
  }
  // ETF(2026-09-11 사용자 요청 "진짜 로고로"): 실제 운용사·브랜드 로고를 먼저 쓰고,
  // 그런 로고가 없는 종목만 추종 대상 테마 이모지로 떨어뜨린다. 레버리지·인버스 배지는 양쪽 다 붙는다.
  const etfName = ETF_NAME_BY_SYMBOL.get(symbol);
  if (etfName) {
    // 2026-09-13 사용자 지적("ETF 중 아직 이모지 로고"): 브랜드 로고 등록은 ETF 탭 렌더 직전에만 해서,
    // 관심종목·검색·상세처럼 그 경로를 안 거친 곳에선 KODEX도 이모지로 떨어졌다 — 여기서 항상 먼저 등록
    if (isKrTicker(symbol)) ensureKrEtfLogoOverride(symbol, etfName);
    const mult = etfMultBadgeHtml(etfName);
    if (hasRealEtfLogo(symbol)) return realLogoHtml(symbol, badgeLabel, mult);
    // 로고가 없는 소형 운용사(마이티·MIDAS 등)는 테마 이모지 대신 브랜드 글자 배지로(2026-09-13 사용자 요청: "이모지는 로고로")
    return realLogoHtml(symbol, badgeLabel || etfName.split(" ")[0].slice(0, 2), mult);
  }
  const ov = LOGO_OVERRIDE[symbol];
  const bg = logoBg(symbol);
  const wrapStyle = bg ? ` style="background:${bg}"` : "";
  if (ov && ov.src) {
    return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${ov.src}" alt="${s}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="ticker-logo-badge" style="display:none;">${badge}</span></span>`;
  }
  const { primary, fmp, useFallback } = logoSources(symbol, 80);
  const fb = useFallback ? ` data-fallback="${fmp}"` : "";
  return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${primary}" alt="${s}" loading="lazy"${fb} onerror="${LOGO_ONERROR}" /><span class="ticker-logo-badge" style="display:none;">${badge}</span></span>`;
}

// buildHistoricalCompareRows 결과로 과거분석 표 HTML(범례 제외)을 생성 — moversTableHtml과 동일한 5컬럼 구성
// (순위/티커+원형로고/현재가(등락률)/연평균 상승/10년월간승률 — 2026-09-04 상승압력·투자안정 대체, 값은 배치 DB 현재값)
// 호출부는 렌더 전에 await ensureWinRateDbResolved()를 호출해둘 것
function historicalTableHtml(rows, rankColumnLabel, periodLabel = "1년전") {
  const tableRows = rows
    .map((r, i) => {
      return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span>${r.name ? `<br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span>` : ""}</td>
        <td>${priceChartLink(r.symbol, fmtPrice(r.currentPrice, r.currency))}<br><span class="${r.priceChangePct !== null && r.priceChangePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.priceChangeAmt !== null ? `${r.priceChangeAmt >= 0 ? "+" : ""}${fmtPrice(r.priceChangeAmt, r.currency)} ` : ""}${r.priceChangePct !== null ? `(${fmtPct(r.priceChangePct)})` : "N/A"}</span></td>
        <td>${stockRet10CellHtml(r.symbol)}</td>
        <td>${stockWinRateCellHtml(r.symbol)}</td>
      </tr>`;
    })
    .join("");

  return `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 연평균 상승(최근 10년 연복리 수익률(CAGR))·10년월간승률(10년 월간 상승 마감 비율)은 매일 갱신되는 배치 DB의 현재값 기준 참고용 지표입니다. 투자 자문이 아닙니다.</p>
    <table class="top30-table">
      <thead>
        <tr><th>${rankColumnLabel}</th><th>기업명</th><th>현재가<br>(등락률)</th><th>연평균<br>상승</th><th>10년월간<br>승률</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// 한달 상승/한달 하락/1년 상승/1년 하락 TOP50 — GitHub Actions가 매일 미리 계산해둔 data/historical-movers.json을
// 그대로 읽어 즉시 표시(scripts/scan-historical-movers.js가 매일 S&P500 전체를 스캔해 구워둠). 예전에는 버튼을
// 누를 때마다 브라우저가 S&P500 500종목을 무료 프록시로 순차 스캔해(클릭 한 번에 약 1,000회 요청) 매우 느렸음
let historicalMoversDataPromise = null;
function getHistoricalMoversData() {
  if (!historicalMoversDataPromise) {
    historicalMoversDataPromise = fetch("data/historical-movers.json", { cache: "no-store" })
      .then((res) => {
        if (res.status === 404) throw new Error("데이터를 아직 준비 중입니다. 매일 자동 갱신되니 잠시 후 다시 확인해주세요.");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch((e) => {
        historicalMoversDataPromise = null;
        throw e;
      });
  }
  return historicalMoversDataPromise;
}

function sbAvg(values) {
  const v = (values || []).filter((x) => Number.isFinite(x));
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}
// 자산(ETF/코인) 1년 전 시점 투자안정 점수 — runAssetTickerHistorical의 당시 점수 계산부와 동일한 방식
// (우상향 점수는 현재 DB 값으로 근사, ETF 5년 CAGR·RSI는 과거값이 없어 중립 처리)
const assetBenchChart2yCache = {};
function getAssetBenchChart2y(isEtf) {
  const key = isEtf ? "^GSPC" : "BTC-USD";
  if (!assetBenchChart2yCache[key]) {
    assetBenchChart2yCache[key] = yahooChart(key, "2y", "1d").catch((e) => {
      delete assetBenchChart2yCache[key];
      throw e;
    });
  }
  return assetBenchChart2yCache[key];
}
async function computeAssetRiskAsOfOneYearAgo(symbol, assetType) {
  const isEtf = assetType === "etf";
  const [chart, benchChart, wrDb] = await Promise.all([yahooChart(symbol, "2y", "1d"), getAssetBenchChart2y(isEtf), getWinRateDb().catch(() => null)]);
  const pairs = chartCloseVolumePairs(chart);
  if (pairs.length < 30) return null;
  const last = pairs[pairs.length - 1];
  const idx = closestIdxOfPairs(pairs, last.t - 365 * 86400);
  if (idx < 5 || Math.abs(pairs[idx].t - (last.t - 365 * 86400)) > 20 * 86400) return null; // 상장 1년 미만
  const asOfM = chartDerivedMetricsAsOf(pairs, idx);
  const bPairs = chartClosePairs(benchChart);
  const bNow = closestIdxOfPairs(bPairs, asOfM.t);
  const bBase = closestIdxOfPairs(bPairs, asOfM.t - 365 * 86400);
  const benchReturnAsOf = bNow >= 0 && bBase >= 0 && bPairs[bBase].c ? ((bPairs[bNow].c - bPairs[bBase].c) / bPairs[bBase].c) * 100 : null;
  const wrMap = wrDb ? (isEtf ? wrDb.scoresEtf : wrDb.scoresCrypto) : null;
  const e = (wrMap && wrMap[symbol]) || null;
  const winRateNow = e && e.score !== null && e.score !== undefined ? e.score : null;
  if (isEtf) return computeEtfRiskScore({ winRate: winRateNow, volatility: asOfM.volatility, fiveYearCagr: null }).total;
  const meta = (chart.chart.result[0] && chart.chart.result[0].meta) || {};
  return computeCryptoRiskScore({ firstTradeDate: meta.firstTradeDate ?? null, winRate: winRateNow, oneYearReturn: asOfM.oneYearReturn, btcReturn: benchReturnAsOf }).total;
}
// (개발/운영용) 한국·ETF·코인 백테스트 스냅샷 일괄 계산 — 수 분 소요, 결과를 data/stability-backtest.json으로 저장
window.__computeStabilityBacktest = async function () {
  const out = { generatedAt: new Date().toISOString() };
  const asOf = out.generatedAt.slice(0, 10);
  // ① 한국주식: 350개 1년 변동 스캔 → 상/하위 50개의 1년 전 스냅샷 점수(getHistoricalCompareMetrics)
  {
    const scanner = getKrHistoricalPriceScanner("year");
    const { items } = await scanner(400, (d, t) => d % 50 === 0 && console.log("KR scan", d, "/", t));
    const ranked = items.filter((r) => Number.isFinite(r.priceChangePct)).sort((a, b) => b.priceChangePct - a.priceChangePct);
    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);
    const histRisk = async (r) => {
      const h = await getHistoricalCompareMetrics(r.symbol, sp500PairsPromise).catch(() => null);
      return h ? h.historicalRisk : null;
    };
    const up = await mapWithConcurrency(ranked.slice(0, 50), 5, histRisk, (d) => d % 10 === 0 && console.log("KR up", d));
    const down = await mapWithConcurrency(ranked.slice(-50), 5, histRisk, (d) => d % 10 === 0 && console.log("KR down", d));
    out.kr = { upAvg: sbAvg(up), downAvg: sbAvg(down), asOf };
    console.log("KR done", out.kr);
  }
  // ② ETF: 미국 100 + 한국 100(1년 수익률 포함 스캔 캐시) → 상/하위 30개의 1년 전 자산 점수
  {
    const [us, kr] = [await ensureEtfScanRows("us", 100, null), await ensureEtfScanRows("kr", 100, null)];
    const rows = [...us.rows, ...kr.rows].filter((r) => Number.isFinite(r.oneYearReturn));
    rows.sort((a, b) => b.oneYearReturn - a.oneYearReturn);
    const up = await mapWithConcurrency(rows.slice(0, 30), 5, (r) => computeAssetRiskAsOfOneYearAgo(r.symbol, "etf"), (d) => d % 10 === 0 && console.log("ETF up", d));
    const down = await mapWithConcurrency(rows.slice(-30), 5, (r) => computeAssetRiskAsOfOneYearAgo(r.symbol, "etf"), (d) => d % 10 === 0 && console.log("ETF down", d));
    out.etf = { upAvg: sbAvg(up), downAvg: sbAvg(down), asOf };
    console.log("ETF done", out.etf);
  }
  // ③ 코인: 시총 상위 100 스캔 → 상/하위 10개의 1년 전 자산 점수
  {
    const { rows } = await ensureCryptoScanRows(100, null);
    const list = rows.filter((r) => Number.isFinite(r.oneYearReturn)).sort((a, b) => b.oneYearReturn - a.oneYearReturn);
    const up = await mapWithConcurrency(list.slice(0, 10), 5, (r) => computeAssetRiskAsOfOneYearAgo(r.symbol, "crypto"));
    const down = await mapWithConcurrency(list.slice(-10), 5, (r) => computeAssetRiskAsOfOneYearAgo(r.symbol, "crypto"));
    out.crypto = { upAvg: sbAvg(up), downAvg: sbAvg(down), asOf };
    console.log("crypto done", out.crypto);
  }
  window.__sbResult = out;
  console.log(JSON.stringify(out));
  return out;
};

const HISTORICAL_MOVERS_BUTTONS = {
  month: { up: historicalMonthUpBtn, down: historicalMonthDownBtn },
  year: { up: historicalFullUpBtn, down: historicalFullDownBtn },
};

// 국내(KR) 한달/1년 상승·하락 — 해외처럼 GitHub Actions가 매일 350종목을 미리 스캔해두는 인프라가 없어,
// 접속 시 시가총액 상위 30개만 먼저 가격 변동률(차트만 조회하는 가벼운 스캔)로 훑어 순위를 보여주고
// "전체보기"를 눌러야 나머지를 이어서 스캔함(다른 국내 랭킹과 동일한 체감 속도). 상승압력·투자안정은
// 그 시점의 스냅샷이 아니라 "현재" 점수(국내 배점 방식)이며 화면에도 그렇게 표기함
const krHistoricalPriceScanners = {};
function getKrHistoricalPriceScanner(period) {
  if (!krHistoricalPriceScanners[period]) {
    const days = period === "month" ? 30 : 365;
    krHistoricalPriceScanners[period] = makeIncrementalScan(
      getKrUniverseTickers,
      async (symbol) => {
        const chart = await yahooChart(symbol, "2y", "1d").catch(() => null);
        const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
        const meta = result && result.meta;
        const pairs = chartClosePairs(chart);
        if (!meta || pairs.length < 2) return null;
        const last = pairs[pairs.length - 1];
        const base = closestPair(pairs, last.t - days * 86400);
        if (!base || !base.c) return null;
        return {
          symbol,
          currentPrice: last.c,
          currency: meta.currency,
          priceChangePct: ((last.c - base.c) / base.c) * 100,
        };
      },
      10
    );
  }
  return krHistoricalPriceScanners[period];
}

function krHistoricalRowHtml(r, i, nameMap) {
  const changeClass = r.priceChangePct !== null && r.priceChangePct >= 0 ? "delta-up" : "delta-down";
  return `
    <tr>
      <td>${i + 1}</td>
      <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml((nameMap && nameMap.get(r.symbol)) || r.symbol)}</b></span></td>
      <td>${priceChartLink(r.symbol, fmtPrice(r.currentPrice, r.currency))}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.priceChangePct)})</span></td>
      <td>${stockRet10CellHtml(r.symbol)}</td>
      <td>${stockWinRateCellHtml(r.symbol)}</td>
    </tr>`;
}

async function runHistoricalMoversKr(period, direction, initialCount) {
  const scanner = getKrHistoricalPriceScanner(period);
  const periodLabel = period === "month" ? "한달전" : "1년전";
  const rankLabel = direction === "up" ? "상승률" : "하락률";

  async function paintUpTo(targetCount) {
    try {
      const isFullScan = targetCount > initialCount;
      historicalStatus.style.display = "block";
      historicalStatus.textContent = isFullScan
        ? `전체 검색 중(약 1분 소요될 수 있어요)...`
        : `코스피200+코스닥150 ${periodLabel} 대비 ${rankLabel} 계산 중...`;
      const [{ items: raw, total }, nameMap] = await Promise.all([
        scanner(targetCount, (done, target) => {
          historicalStatus.textContent = `${done}/${target} 종목 확인 중...`;
        }),
        getKrSymbolNameMap().catch(() => new Map()),
      ]);
      if (raw.length === 0) throw new Error("데이터를 가져오지 못했습니다.");

      const ranked = raw
        .slice()
        .sort((a, b) => (direction === "up" ? b.priceChangePct - a.priceChangePct : a.priceChangePct - b.priceChangePct));
      const top50 = ranked.slice(0, 50);
      const hasMore = targetCount < total;

      await ensureWinRateDbResolved(); // 연평균 상승·10년월간승률 열(2026-09-04 상승압력·투자안정 대체)
      historicalStatus.style.display = "none";

      historicalResults.innerHTML = `
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${periodLabel}(코스피200+코스닥150 대상) 대비 ${rankLabel} 기준이며, 연평균 상승(연복리 수익률(CAGR))·10년월간승률은 매일 갱신되는 배치 DB 기준입니다. 투자 자문이 아닙니다.</p>
        <p class="muted" style="font-size:12px;">시가총액 상위 ${top50.length}개 확인</p>
        <table class="top30-table">
          <thead><tr><th>${rankLabel}<br>순위</th><th>기업명</th><th>현재가<br>(등락률)</th><th>연평균<br>상승</th><th>10년월간<br>승률</th></tr></thead>
          <tbody>${top50.map((r, i) => krHistoricalRowHtml(r, i, nameMap)).join("")}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${total}">전체보기 (나머지 ${total - targetCount}개 · 전체 검색 시 약 1분 소요)</button>` : ""}
      `;
      const moreBtn = historicalResults.querySelector(".load-more-btn");
      if (moreBtn) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!beginLoadMoreScan(historicalResults, historicalStatus)) return; // 스캔 중 재클릭 무시 + 표 접고 진행 현황 맨 위 표시
          paintUpTo(Number(moreBtn.dataset.nextCount)).finally(() => endLoadMoreScan(historicalResults));
        });
      }
    } catch (err) {
      historicalStatus.textContent = `❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`;
    }
  }
  if (!guardRankingScan(historicalResults)) return; // 이미 검색이 도는 중이면 재실행 금지
  historicalResults.dataset.scanning = "1";
  try {
    await paintUpTo(initialCount);
  } finally {
    endLoadMoreScan(historicalResults);
  }
}

// ---------- ETF·코인 전용 과거분석 한달/1년 상승·하락(2026-09-02 사용자 요청) ----------
// 미국주식(S&P500) 순위 대신 각자의 유니버스(ETF: 해당 ETF 지역의 시총 상위 30개, 코인: 시총 상위 30개)로 순위.
// 데이터는 인기종목·시장동향과 같은 스캔 캐시(monthReturn/oneYearReturn 포함)를 재사용해 추가 API 호출이 없음.
async function runHistoricalMoversAsset(section, period, direction) {
  const periodLabel = period === "month" ? "한달전" : "1년전";
  const rankLabel = direction === "up" ? "상승률" : "하락률";
  const retKey = period === "month" ? "monthReturn" : "oneYearReturn";
  historicalStatus.style.display = "block";
  historicalStatus.textContent = `${periodLabel} 대비 ${rankLabel} 계산 중...`;
  try {
    const isEtf = section === "etf";
    const etfRegion = /\.(KS|KQ)$/.test(currentDetailSymbol) ? "kr" : "us";
    const { rows } = await (isEtf ? ensureEtfScanRows(etfRegion, 30, historicalStatus) : ensureCryptoScanRows(30, historicalStatus));
    const ranked = rows
      .filter((r) => r[retKey] !== null && r[retKey] !== undefined)
      .sort((a, b) => (direction === "up" ? b[retKey] - a[retKey] : a[retKey] - b[retKey]))
      .slice(0, 30);
    if (ranked.length === 0) throw new Error("데이터를 가져오지 못했습니다.");
    const universeLabel = isEtf
      ? etfRegion === "kr"
        ? "국내 상장 ETF 시가총액 상위 30개"
        : "미국 상장 ETF 순자산 상위 30개"
      : "암호화폐 시가총액 상위 30개";
    const isKrEtf = isEtf && etfRegion === "kr";
    await attachWinRateRsiToRows(ranked, isEtf ? "scoresEtf" : "scoresCrypto"); // 연평균 상승·10년월간승률 열(2026-09-04)
    historicalStatus.style.display = "none";
    historicalResults.innerHTML = `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 ${periodLabel} 대비 ${rankLabel} 순위이며, 연평균 상승(연복리 수익률(CAGR))·10년월간승률은 매일 갱신되는 배치 DB 기준입니다. 투자 자문이 아닙니다.</p>
      <table class="top30-table">
        <thead><tr><th>${rankLabel}<br>순위</th><th>이름</th><th>현재가<br>(${periodLabel} 대비)</th><th>연평균<br>상승</th><th>10년월간<br>승률</th></tr></thead>
        <tbody>${ranked
          .map((r, i) => {
            const chg = r[retKey];
            return `
          <tr>
            <td>${i + 1}</td>
            <td><span class="ticker-cell">${isEtf ? etfRowNameHtml(r, isKrEtf) : cryptoRowNameHtml(r)}</span></td>
            <td>${isEtf ? priceChartLink(r.symbol, fmtPrice(r.price, r.currency)) : cryptoPriceStr(r)}<br><span class="${chg >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(chg)})</span></td>
            <td>${Number.isFinite(r.ret10y) ? `${partialMarkHtml(r.winTotal, "wr-mark-front", partialMonthsFor(r.symbol))}<b>${r.ret10y > 0 ? "+" : ""}${Math.round(r.ret10y * 10) / 10}%</b>` : "N/A"}</td>
            <td>${winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol))}</td>
          </tr>`;
          })
          .join("")}</tbody>
      </table>`;
  } catch (err) {
    historicalStatus.textContent = `❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`;
  }
}

// period: "month"(한달 전) | "year"(1년 전), direction: "up"(상승) | "down"(하락)
async function runHistoricalMovers(period, direction) {
  const btn = HISTORICAL_MOVERS_BUTTONS[period][direction];
  historicalResults.innerHTML = "";
  btn.disabled = true;

  // ETF·코인 상세에서 열었으면 각자의 유니버스 기준으로 순위(2026-09-02) — 주식 상세는 기존 KR/US 분기 유지
  if (currentDetailSection === "etf" || currentDetailSection === "crypto") {
    await runHistoricalMoversAsset(currentDetailSection, period, direction);
    btn.disabled = false;
    return;
  }

  if (getWatchlistActiveMarket() === "KR") {
    await runHistoricalMoversKr(period, direction, 30);
    btn.disabled = false;
    return;
  }

  const periodLabel = period === "month" ? "한달전" : "1년전";
  const rankLabel = direction === "up" ? "상승률" : "하락률";

  historicalStatus.style.display = "block";
  historicalStatus.textContent = "불러오는 중...";

  try {
    const data = await getHistoricalMoversData();
    const rows = (data[period] && data[period][direction]) || [];
    if (rows.length === 0) {
      historicalStatus.textContent = "데이터를 아직 준비 중입니다. 매일 자동 갱신되니 잠시 후 다시 확인해주세요.";
      return;
    }
    const refDateStr = new Date(rows[0].asOfDate).toLocaleDateString("ko-KR");
    const generatedStr = data.generatedAt ? new Date(data.generatedAt).toLocaleString("ko-KR") : "";
    historicalStatus.textContent = `${periodLabel}(기준일 ${refDateStr}) 대비 ${rankLabel} TOP${rows.length}${generatedStr ? ` — 최근 갱신: ${generatedStr}` : ""}`;
    await ensureWinRateDbResolved(); // 연평균 상승·10년월간승률 열(2026-09-04)
    historicalResults.innerHTML = historicalTableHtml(rows, `${rankLabel}<br>순위`, periodLabel);
  } catch (err) {
    historicalStatus.textContent = `❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`;
  } finally {
    btn.disabled = false;
  }
}

historicalMonthUpBtn.addEventListener("click", () => runHistoricalMovers("month", "up"));
historicalMonthDownBtn.addEventListener("click", () => runHistoricalMovers("month", "down"));
historicalFullUpBtn.addEventListener("click", () => runHistoricalMovers("year", "up"));
historicalFullDownBtn.addEventListener("click", () => runHistoricalMovers("year", "down"));

// 티커/현재가(+등락률)/연평균 상승/10년월간승률 5열 표(2026-09-04 상승압력·투자안정 대체) — 인기종목·급등주·급락주가 공유하는 렌더러
// 2026-09-16 사용자 요청: 어느 순위든 기업명 - 현재가(등락률) - 해당 항목 3칸.
// metric을 주면 셋째 칸이 그 화면의 기준값(거래대금·등락률 등)이고, 없으면 예전처럼 연평균 상승을 쓴다.
function moversTableHtml(scored, rankNote, metric) {
  const m = metric || { header: "연평균<br>상승", cell: (r) => stockRet10CellHtml(r.symbol) };
  const rows = scored
    .map((r, i) => {
      return `
      <tr>
        <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), rankDisplayName(r.symbol, r.name, false))}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
        <td>${rankPriceCellHtml(r.symbol, r.price, "USD", r.changePct)}</td>
        <td>${m.cell(r)}</td>
      </tr>`;
    })
    .join("");

  return `
      <div class="popular-table-wrap">
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th>${m.header}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote} 투자 자문이 아닙니다.</p>
      ${SURGE_WARNING_LEGEND}
    `;
}

// 후보 목록(가벼운 조회로 얻은 심볼/현재가/등락률)에 5일 급등락 경고만 붙여 표 HTML까지 완성
// (2026-09-04 개편: 상승압력·투자안정 점수 계산 삭제 — 표의 연평균 상승·10년월간승률은 배치 DB에서 조회)
// initialCount만큼만 먼저 스코어링해 빠르게 보여주고, "더보기" 클릭 시 fullCount까지 나머지를 추가로 스코어링(이미 계산한 항목은 재요청하지 않음)
async function scoreAndRenderMovers(candidates, marketReturnsPromise, { statusEl, resultsEl, rankNote, initialCount, fullCount, capTotal, metric, prefixHtml }) {
  initialCount = initialCount || candidates.length;
  fullCount = Math.min(fullCount || candidates.length, candidates.length);

  await ensureWinRateDbResolved(); // 연평균 상승·10년월간승률 열
  let scored = [];

  async function scoreUpTo(count) {
    const pending = candidates.slice(scored.length, count);
    // "더보기" 클릭으로 이어서 불러오는 중이면(이미 버튼이 있으면) 맨 위 공지 자리 대신 그 버튼 자체에 진행 상황을 표시
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (pending.length > 0) {
      if (moreBtn) {
        moreBtn.disabled = true;
        moreBtn.textContent = "연평균 상승 · 10년월간승률을 확인하는 중...";
      } else {
        statusEl.style.display = "block";
        statusEl.textContent = "연평균 상승 · 10년월간승률을 확인하는 중...";
      }
      // 한꺼번에 요청하면 프록시가 과부하로 실패하는 경우가 많아 동시 요청 수를 제한
      const fullMetricsList = await mapWithConcurrency(pending, 3, (r) => getFullMetrics(r.symbol));
      const newlyScored = pending.map((r, i) => {
        const m = fullMetricsList[i];
        if (!m) return { ...r, fiveDayExtremes: null, isIPO: false };
        return { ...r, fiveDayExtremes: m.fiveDayExtremes, isIPO: isRecentIPO(m.firstTradeDate) };
      });
      scored = scored.concat(newlyScored);
    }
    statusEl.style.display = "none";

    const hasMore = scored.length < fullCount;
    const nextCount = Math.min(scored.length + initialCount, fullCount);
    resultsEl.innerHTML =
      // 상위 일부만 반영됐다는 주황 경고(2026-09-03 사용자 요청: RSI·우상향 외 나머지 항목에도 동일 표기, 인기종목 제외)
      (capTotal ? topCapNoteHtml(fullCount, capTotal, false) : "") +
      (prefixHtml || "") +
      moversTableHtml(scored, rankNote, metric) +
      (hasMore
        ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${nextCount}">더보기 (${scored.length}/${fullCount})</button>`
        : "");
  }

  // 같은 결과영역(TOP30)을 급등주·급락주 등 여러 목록이 공유하므로, 더보기 클릭은 항상 "가장 최근" 렌더의 핸들러를 호출해야 함
  // → 리스너는 한 번만 부착하되 실제 동작은 resultsEl._loadMore(최신 scoreUpTo)로 위임(오래된 클로저 호출 방지)
  resultsEl._loadMore = (count) => {
    if (!beginLoadMoreScan(resultsEl, statusEl)) return; // 스캔 중 재클릭 무시 + 표 접고 진행 현황 맨 위 표시
    scoreUpTo(count).finally(() => endLoadMoreScan(resultsEl));
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      // ETF·코인 시장동향의 전체보기 버튼(자체 클릭 리스너 사용, data-next-count 없음)은 무시 —
      // 같은 결과영역(trendResults)을 공유해서 가드 없이는 두 핸들러가 경합함(2026-09-02 버그 수정)
      if (!moreBtn || !moreBtn.dataset.nextCount) return;
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  if (!guardRankingScan(resultsEl)) return; // 이미 이 결과영역에서 검색이 도는 중이면 재실행 금지
  resultsEl.dataset.scanning = "1";
  try {
    await scoreUpTo(initialCount);
  } finally {
    endLoadMoreScan(resultsEl);
  }
}

// ---------- 암호화폐 한글명(2026-09-01 사용자 요청: 시총 상위 50개 전부 한글 + 한글/영문 검색 지원) ----------
// 야후 크립토 심볼은 "PEPE24478-USD"처럼 CoinMarketCap id가 붙는 경우가 있어, "-USD"와 끝의 숫자를 뗀
// 기본 티커(BTC, PEPE 등)를 키로 매칭한다. 이름의 괄호 별칭("엑스알피(리플)")은 검색 부분일치로 함께 잡힘.
const CRYPTO_KO_BY_TICKER = {
  BTC: "비트코인", ETH: "이더리움", USDT: "테더", XRP: "엑스알피(리플)", BNB: "비엔비(BNB)", SOL: "솔라나",
  USDC: "유에스디코인(USDC)", DOGE: "도지코인", ADA: "에이다(카르다노)", TRX: "트론", LINK: "체인링크",
  AVAX: "아발란체", XLM: "스텔라루멘", SUI: "수이", SHIB: "시바이누", HBAR: "헤데라", TON: "톤코인",
  DOT: "폴카닷", LTC: "라이트코인", BCH: "비트코인캐시", UNI: "유니스왑", PEPE: "페페", NEAR: "니어프로토콜",
  APT: "앱토스", ICP: "인터넷컴퓨터", AAVE: "아베", ETC: "이더리움클래식", POL: "폴리곤(POL)", MATIC: "폴리곤(MATIC)",
  RENDER: "렌더", VET: "비체인", ARB: "아비트럼", OP: "옵티미즘", FIL: "파일코인", ATOM: "코스모스",
  KAS: "카스파", INJ: "인젝티브", SEI: "세이", MNT: "맨틀", CRO: "크로노스", IMX: "이뮤터블엑스",
  TAO: "비텐서(TAO)", WLD: "월드코인", GRT: "더그래프", ONDO: "온도파이낸스", STX: "스택스", ALGO: "알고랜드",
  JUP: "주피터", FLOKI: "플로키", BONK: "봉크", HYPE: "하이퍼리퀴드", ENA: "에테나", FET: "페치(FET)",
  TIA: "셀레스티아", OKB: "오케이비(OKB)", LEO: "레오토큰", WBTC: "랩트비트코인", STETH: "리도스테이킹이더",
  WSTETH: "랩트스테이킹이더", WBETH: "랩트비콘이더", DAI: "다이", USDE: "에테나달러(USDe)", XMR: "모네로",
  BGB: "비트겟토큰", TRUMP: "트럼프코인", PENGU: "펭구", PUMP: "펌프펀", XAUT: "테더골드", PAXG: "팍스골드",
  S: "소닉(S)", DEXE: "덱스이(DeXe)", GALA: "갈라", SAND: "샌드박스", MANA: "디센트럴랜드", THETA: "쎄타토큰",
  EOS: "이오스", XTZ: "테조스", FLOW: "플로우", NEO: "네오", IOTA: "아이오타", ZEC: "지캐시", DASH: "대시",
  // 래핑·스테이블 계열 등 시총 상위권의 나머지(2026-09-01 실측 top50 기준 전부 한글화)
  WETH: "랩트이더리움(WETH)", CBBTC: "코인베이스 랩트비트코인", BTCB: "비트코인 BEP2(BTCB)", WEETH: "랩트 eETH(weETH)",
  AETHWETH: "아베 랩트이더(aWETH)", AETHUSDT: "아베 테더(aUSDT)", USDS: "스카이달러(USDS)", USDG: "글로벌달러(USDG)",
  PYUSD: "페이팔달러(PYUSD)", RAIN: "레인(RAIN)", GRAM: "그램(구 톤코인)", DEL: "데시멀(DEL)", CC: "캔톤(CC)",
  USD: "월드리버티달러(USD1)", M: "밈코어(M)",
  // 시총 51~100위권(2026-09-02 TOP100 확장에 맞춰 추가)
  FLR: "플레어", XDC: "XDC네트워크", QNT: "퀀트", NEXO: "넥소", GT: "게이트토큰(GT)", KCS: "쿠코인토큰(KCS)",
  CAKE: "팬케이크스왑", CRV: "커브다오", LDO: "리도다오", AR: "알위브", ENS: "이더리움네임서비스", BSV: "비트코인SV",
  MKR: "메이커", SKY: "스카이(SKY)", RON: "로닌", EGLD: "멀티버스X(EGLD)", AXS: "엑시인피니티", CFX: "콘플럭스",
  MINA: "미나", GNO: "노시스", ETHFI: "이더파이", PENDLE: "펜들", RAY: "레이디움", WIF: "도그위프햇",
  POPCAT: "팝캣", NOT: "낫코인", JASMY: "재스미코인", BTT: "비트토렌트", TWT: "트러스트월렛토큰", USDD: "트론달러(USDD)",
  TUSD: "트루USD", FDUSD: "퍼스트디지털USD", USDT0: "테더제로(USDT0)", SOLVBTC: "솔브BTC", LBTC: "롬바드BTC",
  RSETH: "카이토 rsETH", RETH: "로켓풀 ETH(rETH)", METH: "맨틀 mETH", EZETH: "렌조 ezETH", JITOSOL: "지토솔(JitoSOL)",
  MSOL: "마리네이드솔(mSOL)", BNSOL: "바이낸스솔(BNSOL)", JLP: "주피터LP(JLP)", VIRTUAL: "버추얼프로토콜",
  SPX: "SPX6900", FARTCOIN: "파트코인", MOG: "모그코인", BRETT: "브렛", AERO: "에어로드롬", MORPHO: "모르포",
  ENA2: "에테나(ENA)", STRK: "스타크넷", ZK: "지케이싱크(ZK)", W: "웜홀(W)", ONDO2: "온도(ONDO)",
  SYRUPUSDC: "시럽USDC", HTX: "에이치티엑스(HTX)", BFUSD: "바이낸스 BFUSD", SUSDE: "스테이킹 에테나달러(sUSDe)",
  WTRX: "랩트트론(WTRX)", BTCT: "비트코인 TRC20",
};
function cryptoBaseTicker(sym) {
  return (sym || "").toUpperCase().replace(/-USD$/, "").replace(/\d+$/, "");
}
function cryptoKoName(sym, fallbackName) {
  return CRYPTO_KO_BY_TICKER[cryptoBaseTicker(sym)] || TICKER_TO_KOREAN_NAME[sym] || (fallbackName || sym).replace(/\s+USD$/i, "");
}

// ---------- 암호화폐 섹터·대표 상장 거래소(2026-09-03 사용자 요청: 검색상세 요약 카드 표시용) ----------
// 섹터는 코인게코/코인마켓캡에서 통용되는 분류를 한글화한 정적 데이터 — 맵에 없는 코인은 "암호화폐(기타)"
const CRYPTO_SECTOR_BY_TICKER = {};
for (const [sectorKo, tickers] of Object.entries({
  "결제/가치저장(레이어1)": ["BTC"],
  "스마트컨트랙트 플랫폼(레이어1)": ["ETH", "SOL", "ADA", "TRX", "AVAX", "TON", "DOT", "NEAR", "APT", "SUI", "ICP", "HBAR", "ATOM", "ALGO", "XTZ", "EOS", "NEO", "FLOW", "EGLD", "CFX", "MINA", "SEI", "INJ", "KAS", "S", "FLR", "XDC", "ETC", "GRAM", "CC", "PI"],
  "레이어2(확장 네트워크)": ["ARB", "OP", "POL", "MATIC", "STRK", "ZK", "MNT", "IMX", "RON", "STX"],
  "결제/송금": ["XRP", "XLM", "LTC", "BCH", "DASH"],
  "프라이버시 코인": ["XMR", "ZEC"],
  "스테이블코인": ["USDT", "USDC", "DAI", "USDE", "USDS", "USDD", "TUSD", "FDUSD", "PYUSD", "USDG", "USD", "USDT0", "BFUSD", "SUSDE", "SYRUPUSDC", "RLUSD", "USDCE", "USDF", "USDY"],
  "밈코인": ["DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "POPCAT", "NOT", "TRUMP", "PENGU", "MOG", "BRETT", "FARTCOIN", "SPX", "PUMP", "M"],
  "디파이(탈중앙 금융)": ["UNI", "AAVE", "CRV", "LDO", "MKR", "CAKE", "PENDLE", "RAY", "JUP", "AERO", "MORPHO", "ETHFI", "ENA", "ENA2", "HYPE", "DEXE", "NEXO", "SKY", "GNO", "JLP", "ONDO", "ONDO2", "JST", "ASTER", "WLFI"],
  "오라클/미들웨어": ["LINK", "GRT", "W", "QNT", "TIA", "ENS"],
  "AI/컴퓨팅": ["TAO", "FET", "RENDER", "WLD", "VIRTUAL", "VVV"],
  "스토리지/인프라": ["FIL", "AR", "BTT", "VET", "IOTA", "JASMY", "THETA", "TWT"],
  "거래소 토큰": ["BNB", "OKB", "LEO", "BGB", "GT", "KCS", "HTX", "CRO"],
  "게임/메타버스": ["GALA", "SAND", "MANA", "AXS"],
  "랩트/스테이킹 파생": ["WBTC", "WETH", "STETH", "WSTETH", "WBETH", "CBBTC", "BTCB", "WEETH", "RETH", "METH", "EZETH", "JITOSOL", "MSOL", "BNSOL", "LBTC", "SOLVBTC", "RSETH", "WTRX", "BTCT", "AETHWETH", "AETHUSDT", "WBNB", "KHYPE"],
  "금 연동 토큰": ["XAUT", "PAXG"],
})) for (const t of tickers) CRYPTO_SECTOR_BY_TICKER[t] = sectorKo;
// 대표 상장 거래소 5곳 — 국내(업비트·빗썸) 상장이 드문 계열(스테이블·랩트·금 연동)은 해외 대표 5곳으로,
// 거래소 토큰은 실제 발행·주력 거래소 위주로 표시
const CRYPTO_EXCHANGES_DEFAULT5 = "업비트 · 바이낸스 · 빗썸 · 코인베이스 · 크라켄";
const CRYPTO_EXCHANGES_GLOBAL5 = "바이낸스 · 코인베이스 · 크라켄 · OKX · 바이비트";
const CRYPTO_EXCHANGE_BY_TICKER = {
  BNB: "바이낸스 · OKX · 바이비트 · 게이트 · MEXC",
  OKB: "OKX · 게이트 · 비트겟 · MEXC · 코인엑스",
  LEO: "비트파이넥스 · 게이트 · MEXC · 비트마트 · 코인엑스",
  BGB: "비트겟 · 게이트 · MEXC · 비트파이넥스 · 코인엑스",
  GT: "게이트 · MEXC · 비트겟 · 비트마트 · 코인엑스",
  KCS: "쿠코인 · 게이트 · MEXC · 비트마트 · 코인엑스",
  HTX: "HTX · 게이트 · MEXC · 비트마트 · 코인엑스",
  CRO: "크립토닷컴 · 업비트 · 코인베이스 · OKX · 게이트",
};
const CRYPTO_GLOBAL_ONLY_SECTORS = new Set(["스테이블코인", "랩트/스테이킹 파생", "금 연동 토큰"]);
function cryptoSectorOf(base) {
  return CRYPTO_SECTOR_BY_TICKER[base] || "암호화폐(기타)";
}
function cryptoExchangesOf(base) {
  if (CRYPTO_EXCHANGE_BY_TICKER[base]) return CRYPTO_EXCHANGE_BY_TICKER[base];
  return CRYPTO_GLOBAL_ONLY_SECTORS.has(cryptoSectorOf(base)) ? CRYPTO_EXCHANGES_GLOBAL5 : CRYPTO_EXCHANGES_DEFAULT5;
}

// ---------- 코인·ETF 개요 한 줄 설명(2026-09-03 사용자 요청: 위키 자동 매칭이 엉뚱한 문서를 잡는 문제 대응) ----------
// 주요 코인은 직접 쓴 정적 설명을, 그 외 코인은 섹터 기반 템플릿을, ETF는 운용사+상품명 템플릿을 사용
const CRYPTO_DESC_BY_TICKER = {
  BTC: "2009년 등장한 최초의 암호화폐로, 총발행량이 2,100만 개로 고정되어 '디지털 금'으로 불립니다. 시가총액 1위를 유지하고 있는 대표 가치저장 자산입니다.",
  ETH: "스마트 컨트랙트를 처음 도입한 시가총액 2위 블록체인 플랫폼으로, 디파이·NFT·스테이블코인 등 대부분의 온체인 생태계가 이더리움 위에서 돌아갑니다.",
  USDT: "테더사가 발행하는 달러 연동 스테이블코인으로, 1코인=1달러 가치를 목표로 하며 암호화폐 거래의 기축통화 역할을 합니다.",
  XRP: "리플사가 국경 간 송금·결제용으로 만든 코인으로, 은행 간 송금을 몇 초 만에 처리하는 것을 목표로 합니다.",
  BNB: "세계 최대 거래소 바이낸스의 자체 코인으로, 거래 수수료 할인과 BNB체인 생태계의 기축 자산으로 쓰입니다.",
  SOL: "빠른 속도와 낮은 수수료를 앞세운 고성능 블록체인 플랫폼으로, 밈코인·디파이·NFT 생태계가 활발합니다.",
  USDC: "서클사가 발행하는 달러 연동 스테이블코인으로, 규제 준수와 투명한 준비금 공시를 강점으로 내세웁니다.",
  DOGE: "장난으로 시작된 최초의 밈코인이지만, 일론 머스크의 지지 등으로 시가총액 상위권에 자리잡은 결제 겸용 코인입니다.",
  ADA: "학술 연구 기반으로 개발되는 지분증명 블록체인 플랫폼으로, 창시자는 이더리움 공동창업자 찰스 호스킨슨입니다.",
  TRX: "저스틴 선이 만든 블록체인 플랫폼으로, 낮은 수수료 덕분에 테더(USDT) 전송 네트워크로 가장 많이 쓰입니다.",
  LINK: "블록체인 밖의 현실 데이터(가격·날씨 등)를 스마트 컨트랙트에 공급하는 대표 오라클 네트워크입니다.",
  AVAX: "빠른 완결성과 서브넷(맞춤형 체인) 구조가 특징인 스마트 컨트랙트 플랫폼입니다.",
  XLM: "리플 공동창업자가 만든 국경 간 송금 특화 블록체인으로, 저렴하고 빠른 소액 송금을 목표로 합니다.",
  SUI: "메타(구 페이스북) 출신 개발진이 만든 고성능 레이어1 블록체인으로, Move 언어 기반 병렬 처리가 특징입니다.",
  SHIB: "도지코인을 잇는 대표 밈코인으로, 이더리움 기반이며 자체 거래소·레이어2 등 생태계 확장을 시도하고 있습니다.",
  HBAR: "해시그래프라는 독자 합의 기술을 쓰는 기업용 분산원장으로, 구글·IBM 등이 운영위원회에 참여했습니다.",
  TON: "텔레그램에서 출발한 블록체인으로, 텔레그램 메신저 내 결제·미니앱 생태계와 연동되는 것이 강점입니다.",
  DOT: "서로 다른 블록체인을 연결하는 것을 목표로 하는 폴카닷 네트워크의 코인으로, 이더리움 공동창업자 개빈 우드가 만들었습니다.",
  LTC: "비트코인 코드를 기반으로 2011년 만들어진 결제 코인으로, 블록 생성이 빨라 '비트코인의 은'으로 불립니다.",
  BCH: "2017년 비트코인에서 하드포크로 갈라져 나온 결제 특화 코인으로, 더 큰 블록으로 저렴한 결제를 지향합니다.",
  UNI: "이더리움 최대 탈중앙 거래소(DEX) 유니스왑의 거버넌스 코인으로, 중개자 없이 코인끼리 교환하는 프로토콜입니다.",
  PEPE: "개구리 페페 캐릭터를 내세운 이더리움 기반 밈코인으로, 2023년 등장 후 밈코인 열풍을 주도했습니다.",
  NEAR: "사용 편의성과 확장성에 집중한 지분증명 레이어1 플랫폼으로, AI 관련 프로젝트 유치에도 적극적입니다.",
  APT: "메타의 디엠(Diem) 프로젝트 출신 팀이 만든 Move 언어 기반 고성능 레이어1 블록체인입니다.",
  ICP: "인터넷 자체를 탈중앙화하겠다는 목표로 웹 서비스를 통째로 온체인에 올리는 것을 지향하는 플랫폼입니다.",
  AAVE: "대표적인 탈중앙 예치·대출(랜딩) 프로토콜로, 담보를 맡기고 코인을 빌리는 디파이 서비스의 표준격입니다.",
  ETC: "2016년 더다오 해킹 사태 때 이더리움에서 갈라져 나와 원래 체인을 유지한 작업증명 블록체인입니다.",
  POL: "이더리움 확장(레이어2) 대표 주자 폴리곤의 코인으로, 기존 MATIC에서 리브랜딩됐습니다.",
  MATIC: "이더리움 확장(레이어2) 대표 주자 폴리곤의 구 코인으로, 현재는 POL로 전환이 진행 중입니다.",
  RENDER: "유휴 GPU를 연결해 3D 렌더링·AI 연산을 분산 처리하는 네트워크의 코인입니다.",
  VET: "상품 이력 추적 등 기업 공급망 관리에 특화된 블록체인 비체인의 코인입니다.",
  ARB: "이더리움 최대 레이어2(옵티미스틱 롤업) 아비트럼의 거버넌스 코인입니다.",
  OP: "이더리움 레이어2 옵티미즘의 거버넌스 코인으로, 코인베이스의 베이스 체인도 같은 기술(OP스택)을 씁니다.",
  FIL: "남는 저장공간을 빌려주고 보상받는 탈중앙 클라우드 스토리지 네트워크 파일코인의 코인입니다.",
  ATOM: "블록체인 간 통신(IBC) 표준을 만든 코스모스 생태계의 중심 코인입니다.",
  KAS: "작업증명에 블록DAG 구조를 접목해 초당 여러 블록을 처리하는 고속 레이어1입니다.",
  INJ: "파생상품 거래에 특화된 금융 전문 레이어1 블록체인 인젝티브의 코인입니다.",
  SEI: "거래소급 속도를 목표로 하는 트레이딩 특화 레이어1 블록체인입니다.",
  MNT: "이더리움 레이어2 맨틀 네트워크의 코인으로, 대형 DAO 트레저리를 기반으로 성장했습니다.",
  CRO: "크립토닷컴 거래소·체인 생태계의 기축 코인으로, 카드 결제 등 실생활 사용처 확대에 적극적입니다.",
  IMX: "NFT·웹3 게임에 특화된 이더리움 레이어2 이뮤터블의 코인입니다.",
  TAO: "누구나 AI 모델을 올리고 기여도에 따라 보상받는 탈중앙 머신러닝 네트워크 비텐서의 코인입니다.",
  WLD: "오픈AI CEO 샘 올트먼이 공동 창업한 프로젝트로, 홍채 인식으로 '사람임을 증명'하는 신원 네트워크입니다.",
  GRT: "블록체인 데이터를 검색하기 쉽게 색인해 앱에 제공하는 '웹3의 구글'격 인덱싱 프로토콜입니다.",
  ONDO: "미국 국채 등 전통 금융자산을 토큰화해 온체인으로 가져오는 RWA(실물자산) 대표 프로젝트입니다.",
  STX: "비트코인 위에서 스마트 컨트랙트를 구현하는 비트코인 레이어2 프로젝트 스택스의 코인입니다.",
  ALGO: "튜링상 수상자 실비오 미칼리가 만든 순수 지분증명 레이어1 블록체인입니다.",
  JUP: "솔라나 대표 DEX 애그리게이터 주피터의 거버넌스 코인입니다.",
  FLOKI: "일론 머스크의 반려견 이름에서 딴 밈코인으로, 게임·교육 등 유틸리티 확장을 시도합니다.",
  BONK: "솔라나 생태계 대표 밈코인으로, 솔라나 커뮤니티에 대량 에어드롭되며 시작됐습니다.",
  HYPE: "탈중앙 무기한 선물 거래소 하이퍼리퀴드의 코인으로, 자체 레이어1 위에서 오더북 거래를 제공합니다.",
  ENA: "달러 연동 합성 스테이블코인 USDe를 발행하는 에테나 프로토콜의 거버넌스 코인입니다.",
  FET: "AI 에이전트 경제를 지향하는 페치의 코인으로, 오션프로토콜 등과 AI 연합(ASI)을 결성했습니다.",
  TIA: "데이터 가용성 레이어를 분리한 모듈러 블록체인의 선구자 셀레스티아의 코인입니다.",
  XMR: "거래 내역을 암호화해 송금인·수신인·금액을 감추는 대표 프라이버시 코인입니다.",
  ZEC: "영지식증명(zk-SNARK) 기술로 거래를 은닉할 수 있는 프라이버시 코인입니다.",
  DASH: "빠른 결제(인스턴트센드)와 익명 전송 기능을 갖춘 결제 특화 코인입니다.",
  EOS: "2018년 사상 최대 ICO로 출발한 위임지분증명 블록체인 플랫폼입니다.",
  XTZ: "온체인 투표로 프로토콜을 스스로 업그레이드하는 자체 수정형 블록체인 테조스의 코인입니다.",
  NEO: "'중국의 이더리움'으로 불렸던 스마트 컨트랙트 플랫폼입니다.",
  IOTA: "사물인터넷(IoT) 기기 간 수수료 없는 데이터·가치 전송을 위해 만들어진 분산원장입니다.",
  FLOW: "NBA 톱샷을 만든 대퍼랩스가 개발한 NFT·게임 특화 블록체인입니다.",
  GALA: "블록체인 게임 플랫폼 갈라게임즈의 코인으로, 게임 아이템 거래와 노드 보상에 쓰입니다.",
  SAND: "이용자가 직접 게임·아이템을 만들어 수익화하는 메타버스 플랫폼 샌드박스의 코인입니다.",
  MANA: "가상 부동산(LAND)을 사고파는 메타버스 플랫폼 디센트럴랜드의 코인입니다.",
  AXS: "'플레이 투 언' 열풍을 일으킨 블록체인 게임 엑시인피니티의 거버넌스 코인입니다.",
  THETA: "탈중앙 영상 스트리밍·엣지 컴퓨팅 네트워크 쎄타의 코인입니다.",
  CRV: "스테이블코인 교환에 특화된 대표 DEX 커브파이낸스의 거버넌스 코인입니다.",
  LDO: "이더리움 최대 유동성 스테이킹 프로토콜 리도의 거버넌스 코인입니다.",
  MKR: "최초의 탈중앙 스테이블코인 DAI를 발행하는 메이커다오의 거버넌스 코인입니다.",
  CAKE: "BNB체인 최대 DEX 팬케이크스왑의 코인입니다.",
  PENDLE: "미래 수익률을 쪼개 사고파는 이자 파생 디파이 프로토콜 펜들의 코인입니다.",
  AR: "한 번 저장하면 영구 보관되는 탈중앙 스토리지 네트워크 알위브의 코인입니다.",
  ENS: "0x 주소를 사람이 읽는 이름(.eth)으로 바꿔주는 이더리움 네임서비스의 거버넌스 코인입니다.",
  QNT: "서로 다른 블록체인과 기업 시스템을 연결하는 상호운용성 프로젝트 퀀트의 코인입니다.",
  WIF: "털모자를 쓴 강아지 밈으로 유명한 솔라나 기반 밈코인입니다.",
  TRUMP: "도널드 트럼프 미국 대통령이 2025년 1월 취임 직전 발행한 공식 밈코인입니다.",
  PENGU: "인기 NFT 컬렉션 퍼지펭귄이 발행한 솔라나 기반 밈코인입니다.",
  XAUT: "테더가 발행하는 금 1온스 연동 토큰으로, 실물 금괴가 준비금으로 보관됩니다.",
  PAXG: "팍소스가 발행하는 금 연동 토큰으로, 런던 금고의 실물 금에 대한 소유권을 나타냅니다.",
  WBTC: "비트코인을 이더리움에서 쓸 수 있게 1:1로 감싼 랩트 토큰입니다.",
  STETH: "리도에 이더리움을 스테이킹하고 받는 이자 축적형 토큰입니다.",
  DAI: "메이커다오가 발행하는 담보 기반 탈중앙 스테이블코인으로, 1달러 가치를 목표로 합니다.",
  USDE: "에테나가 발행하는 합성 달러 스테이블코인으로, 현물 보유+선물 매도 헤지로 가치를 고정합니다.",
  OKB: "글로벌 거래소 OKX의 자체 코인으로, 수수료 할인 등에 쓰입니다.",
  LEO: "비트파이넥스 운영사 아이파이넥스가 발행한 거래소 코인입니다.",
  BGB: "글로벌 거래소 비트겟의 자체 코인입니다.",
  NEXO: "암호화폐 담보 대출·이자 서비스를 제공하는 넥소 플랫폼의 코인입니다.",
  ETHFI: "이더리움 리스테이킹 프로토콜 이더파이의 거버넌스 코인입니다.",
  VIRTUAL: "AI 에이전트를 만들고 토큰화하는 버추얼프로토콜의 코인으로, AI 에이전트 열풍의 중심에 있습니다.",
};
// KR ETF 브랜드 → 운용사(개요 설명용) — 브랜드는 상품명 맨 앞 단어
const KR_ETF_ISSUER_BY_BRAND = {
  KODEX: "삼성자산운용", TIGER: "미래에셋자산운용", RISE: "KB자산운용", ACE: "한국투자신탁운용",
  SOL: "신한자산운용", PLUS: "한화자산운용", HANARO: "NH-Amundi자산운용", KIWOOM: "키움투자자산운용",
  "1Q": "하나자산운용", WON: "우리자산운용", TIME: "타임폴리오자산운용", KoAct: "삼성액티브자산운용",
  KOSEF: "키움투자자산운용", ARIRANG: "한화자산운용", KBSTAR: "KB자산운용", IBK: "IBK자산운용",
  HK: "흥국자산운용", BNK: "BNK자산운용", MIDAS: "마이다스에셋자산운용", UNICORN: "현대자산운용",
  파워: "교보악사자산운용", 마이티: "DB자산운용",
};
// 미국 주요 ETF 직접 작성 설명(시총 상위권+유명 상품) — 없는 티커는 운용사 키워드 템플릿으로 폴백
const US_ETF_DESC_BY_TICKER = {
  SPY: "세계 최초이자 최대 규모의 S&P500 추종 ETF(스테이트스트리트 SPDR)로, 미국 대형주 500개에 분산 투자합니다.",
  VOO: "뱅가드의 S&P500 추종 ETF로, 초저비용(연 0.03%)으로 미국 대형주 500개에 투자합니다.",
  IVV: "블랙록 iShares의 S&P500 추종 ETF로, SPY보다 낮은 보수가 강점입니다.",
  VTI: "미국 주식시장 전체(대·중·소형 약 3,500개 종목)를 한 번에 담는 뱅가드의 대표 ETF입니다.",
  QQQ: "나스닥100 지수를 추종하는 인베스코의 대표 기술주 ETF로, 애플·엔비디아·마이크로소프트 등 비중이 큽니다.",
  QQQM: "QQQ와 같은 나스닥100을 더 낮은 보수로 추종하는 장기투자용 버전입니다.",
  VTV: "미국 대형 가치주에 투자하는 뱅가드 ETF입니다.",
  VUG: "미국 대형 성장주에 투자하는 뱅가드 ETF입니다.",
  IEFA: "미국을 제외한 유럽·일본 등 선진국 주식에 투자하는 iShares 코어 ETF입니다.",
  GLD: "금 현물 가격을 추종하는 세계 최대 금 ETF로, 실물 금괴를 보관해 가치를 뒷받침합니다.",
  IAU: "iShares의 금 현물 ETF로, GLD보다 보수가 낮아 장기 보유에 적합합니다.",
  AGG: "미국 투자등급 채권 전체를 담는 iShares의 대표 종합채권 ETF입니다.",
  BND: "뱅가드의 미국 종합채권 ETF로, 국채·회사채·MBS를 폭넓게 담습니다.",
  IWF: "러셀1000 성장주 지수를 추종하는 iShares ETF입니다.",
  IWD: "러셀1000 가치주 지수를 추종하는 iShares ETF입니다.",
  IWM: "미국 소형주 2,000개(러셀2000)에 투자하는 대표 소형주 ETF입니다.",
  IWB: "미국 대형주 1,000개(러셀1000)에 투자하는 iShares ETF입니다.",
  VIG: "10년 이상 연속 배당을 늘린 미국 배당성장주에 투자하는 뱅가드 ETF입니다.",
  VYM: "배당수익률이 높은 미국 대형주에 투자하는 뱅가드 고배당 ETF입니다.",
  SCHD: "재무 우량 고배당주 100개(다우존스 미국 배당100)를 담는 찰스슈왑의 인기 배당 ETF입니다.",
  DGRO: "5년 이상 배당을 늘린 미국 기업에 투자하는 iShares 배당성장 ETF입니다.",
  VWO: "중국·인도·브라질 등 신흥국 주식에 투자하는 뱅가드 ETF입니다.",
  IEMG: "신흥국 주식에 폭넓게 투자하는 iShares 코어 ETF입니다.",
  EEM: "MSCI 신흥국 지수를 추종하는 iShares의 대표 신흥국 ETF입니다.",
  VXUS: "미국을 제외한 전 세계 주식에 투자하는 뱅가드 ETF입니다.",
  IXUS: "미국 제외 전 세계 주식에 투자하는 iShares ETF입니다.",
  VT: "미국 포함 전 세계 주식시장 전체에 한 번에 투자하는 뱅가드 ETF입니다.",
  IJH: "미국 중형주(S&P 미드캡400)에 투자하는 iShares ETF입니다.",
  IJR: "미국 소형주(S&P 스몰캡600)에 투자하는 iShares ETF입니다.",
  VO: "미국 중형주에 투자하는 뱅가드 ETF입니다.",
  VB: "미국 소형주에 투자하는 뱅가드 ETF입니다.",
  IVW: "S&P500 중 성장주만 골라 담는 iShares ETF입니다.",
  ITOT: "미국 주식시장 전체를 담는 iShares 코어 ETF입니다.",
  SCHX: "미국 대형주에 저비용으로 투자하는 찰스슈왑 ETF입니다.",
  SCHB: "미국 주식시장 전체에 투자하는 찰스슈왑 ETF입니다.",
  SCHF: "미국 제외 선진국 주식에 투자하는 찰스슈왑 ETF입니다.",
  SCHG: "미국 대형 성장주에 투자하는 찰스슈왑 ETF입니다.",
  SPLG: "S&P500을 SPY보다 낮은 보수로 추종하는 SPDR 포트폴리오 ETF입니다.",
  RSP: "S&P500 500개 종목을 동일 비중으로 담아 대형주 쏠림을 줄인 인베스코 ETF입니다.",
  XLK: "S&P500 기술 섹터(애플·마이크로소프트 등)에 투자하는 SPDR 섹터 ETF입니다.",
  XLF: "S&P500 금융 섹터(버크셔·JP모건 등)에 투자하는 SPDR 섹터 ETF입니다.",
  XLV: "S&P500 헬스케어 섹터에 투자하는 SPDR 섹터 ETF입니다.",
  XLE: "S&P500 에너지 섹터(엑슨모빌·셰브론 등)에 투자하는 SPDR 섹터 ETF입니다.",
  XLY: "S&P500 임의소비재 섹터(아마존·테슬라 등)에 투자하는 SPDR 섹터 ETF입니다.",
  XLI: "S&P500 산업재 섹터에 투자하는 SPDR 섹터 ETF입니다.",
  XLU: "S&P500 유틸리티 섹터에 투자하는 SPDR 섹터 ETF입니다.",
  XLP: "S&P500 필수소비재 섹터에 투자하는 SPDR 섹터 ETF입니다.",
  TLT: "만기 20년 이상 미국 장기국채에 투자하는 대표 장기채 ETF로, 금리 하락기에 주목받습니다.",
  IEF: "만기 7~10년 미국 중기국채에 투자하는 iShares ETF입니다.",
  SGOV: "만기 3개월 이하 초단기 미국 국채에 투자하는 현금성 ETF입니다.",
  BIL: "만기 1~3개월 미국 단기국채에 투자하는 현금성 SPDR ETF입니다.",
  VCIT: "미국 중기 회사채에 투자하는 뱅가드 ETF입니다.",
  VCSH: "미국 단기 회사채에 투자하는 뱅가드 ETF입니다.",
  LQD: "미국 투자등급 회사채에 투자하는 iShares의 대표 회사채 ETF입니다.",
  HYG: "신용등급이 낮은 대신 이자가 높은 미국 하이일드 채권에 투자하는 iShares ETF입니다.",
  MUB: "미국 지방채(비과세)에 투자하는 iShares ETF입니다.",
  VTEB: "미국 비과세 지방채에 투자하는 뱅가드 ETF입니다.",
  MBB: "미국 주택저당증권(MBS)에 투자하는 iShares ETF입니다.",
  VTIP: "물가에 연동되는 미국 단기 물가연동국채(TIPS)에 투자하는 뱅가드 ETF입니다.",
  BIV: "미국 중기 채권 전반에 투자하는 뱅가드 ETF입니다.",
  VGIT: "미국 중기 국채에 투자하는 뱅가드 ETF입니다.",
  IUSB: "미국 채권시장 전체(투자등급+일부 하이일드)에 투자하는 iShares ETF입니다.",
  QUAL: "재무 건전성이 높은 미국 우량 기업을 골라 담는 iShares 퀄리티 팩터 ETF입니다.",
  DIA: "다우존스 산업평균 30개 종목에 투자하는 SPDR ETF입니다.",
  JEPI: "S&P500 우량주에 커버드콜 전략을 더해 매달 배당을 주는 JP모건의 인기 인컴 ETF입니다.",
  JEPQ: "나스닥100에 커버드콜 전략을 더해 매달 배당을 주는 JP모건 인컴 ETF입니다.",
  IBIT: "블랙록이 운용하는 비트코인 현물 ETF로, 2024년 출시 후 가장 많은 자금이 몰린 상품입니다.",
  FBTC: "피델리티가 운용하는 비트코인 현물 ETF입니다.",
  ETHA: "블랙록이 운용하는 이더리움 현물 ETF입니다.",
  BITO: "비트코인 선물에 투자하는 프로셰어즈 ETF로, 미국 최초의 비트코인 관련 ETF입니다.",
  SMH: "엔비디아·TSMC 등 글로벌 반도체 기업에 투자하는 반에크의 대표 반도체 ETF입니다.",
  SOXL: "필라델피아 반도체 지수 일간 수익률의 3배를 추구하는 고위험 레버리지 ETF입니다.",
  TQQQ: "나스닥100 일간 수익률의 3배를 추구하는 고위험 레버리지 ETF입니다.",
  SQQQ: "나스닥100 일간 수익률의 -3배를 추구하는 고위험 인버스 ETF입니다.",
  ARKK: "캐시 우드의 아크인베스트가 운용하는 파괴적 혁신 기업 액티브 ETF입니다.",
  VNQ: "미국 부동산 리츠(REITs)에 투자하는 뱅가드의 대표 리츠 ETF입니다.",
  EFA: "미국·캐나다 제외 선진국(EAFE) 주식에 투자하는 iShares ETF입니다.",
};
const US_ETF_ISSUER_KEYWORDS = [
  ["ISHARES", "블랙록(iShares)"], ["VANGUARD", "뱅가드"], ["SPDR", "스테이트스트리트(SPDR)"], ["INVESCO", "인베스코"],
  ["SCHWAB", "찰스슈왑"], ["ARK ", "아크인베스트"], ["PROSHARES", "프로셰어즈"], ["DIREXION", "디렉시온"],
  ["FIDELITY", "피델리티"], ["JPMORGAN", "JP모건"], ["VANECK", "반에크"], ["WISDOMTREE", "위즈덤트리"],
  ["GLOBAL X", "글로벌X(미래에셋)"], ["GRAYSCALE", "그레이스케일"], ["DIMENSIONAL", "디멘셔널"], ["PACER", "페이서"],
];
function cryptoDescriptionOf(base, koName) {
  if (CRYPTO_DESC_BY_TICKER[base]) return CRYPTO_DESC_BY_TICKER[base];
  const sector = CRYPTO_SECTOR_BY_TICKER[base];
  return `${koName}은(는) ${sector ? `${sector} 계열의 ` : ""}암호화폐로, 시가총액 상위권에 올라 주요 글로벌 거래소에서 거래되고 있습니다.`;
}
function etfDescriptionOf(symbol, rawName) {
  const name = TICKER_TO_KOREAN_NAME[symbol] || rawName || "";
  if (isKrTicker(symbol)) {
    // 상품명 안에서 아는 브랜드 토큰을 찾아 운용사·테마 분리(야후가 영문명을 줄 때도 브랜드는 대개 살아 있음)
    for (const [brand, issuer] of Object.entries(KR_ETF_ISSUER_BY_BRAND)) {
      const idx = name.toUpperCase().indexOf(brand.toUpperCase());
      if (idx === -1) continue;
      let theme = name.slice(idx + brand.length).replace(/증권상장지수투자신탁.*$/, "").trim();
      if (/^200/.test(theme)) theme = `코스피${theme}`; // "KODEX 200" 류는 '코스피200'으로 읽히게
      return `${issuer}이 운용하는 한국거래소 상장 ETF(상장지수펀드)로, ${theme ? `'${theme}' 관련 지수·자산의 성과를 추종합니다.` : "지수·자산의 성과를 추종합니다."}`;
    }
    return `한국거래소에 상장된 ETF(상장지수펀드)로, '${name}' 상품입니다.`;
  }
  const base = symbol.toUpperCase();
  if (US_ETF_DESC_BY_TICKER[base]) return US_ETF_DESC_BY_TICKER[base];
  const upper = name.toUpperCase();
  const hit = US_ETF_ISSUER_KEYWORDS.find(([kw]) => upper.includes(kw));
  return `${hit ? `${hit[1]}이 운용하는 ` : ""}미국 증시 상장 ETF(상장지수펀드)입니다${name ? ` — ${name}` : ""}.`;
}
for (const base of ["BTC", "ETH", "USDT", "XRP", "BNB", "SOL", "USDC", "DOGE", "ADA", "TRX", "LINK", "AVAX", "XLM", "SHIB", "HBAR", "DOT", "LTC", "BCH", "UNI", "NEAR", "ICP", "AAVE", "ETC", "VET", "FIL", "ATOM", "ALGO", "CRO", "XMR", "DAI", "EOS", "XTZ", "NEO", "ZEC", "DASH"]) {
  const ko = CRYPTO_KO_BY_TICKER[base];
  const symbol = `${base}-USD`;
  if (ko && !KOREAN_COMPANY_NAMES[ko]) KOREAN_COMPANY_NAMES[ko] = symbol;
  if (!TICKER_TO_KOREAN_NAME[symbol]) TICKER_TO_KOREAN_NAME[symbol] = ko;
}

// FRED 시계열([date, value] 배열) → { price, change(전 영업일 대비), changePct, date }
function fredSnapshot(points) {
  const clean = (points || []).map((p) => [p[0], Number(p[1])]).filter((p) => Number.isFinite(p[1]));
  if (clean.length < 1) return null;
  const latest = clean[clean.length - 1];
  const prev = clean.length >= 2 ? clean[clean.length - 2] : null;
  const price = latest[1];
  const change = prev ? price - prev[1] : null;
  const changePct = prev && prev[1] ? (change / prev[1]) * 100 : null;
  return { price, change, changePct, date: new Date(latest[0]) };
}

// 암호화폐 로고 — 자체 호스팅 DB(logos/crypto/, data/logo-db.js의 CRYPTO_LOGO_DB — 2026-09-03 사용자 요청)를 우선 쓰고,
// 없으면 jsDelivr의 spothq/cryptocurrency-icons 세트로, 그것도 실패하면 🪙 배지로 폴백
const CRYPTO_LOGO_ONERROR = "var f=this.dataset.fallback; if(f){this.removeAttribute('data-fallback');this.src=f;}else{this.style.display='none'; this.nextElementSibling.style.display='inline';}";
function cryptoLogoSrc(base) {
  return typeof CRYPTO_LOGO_DB !== "undefined" && CRYPTO_LOGO_DB.has(base) ? `logos/crypto/${base}.png` : null;
}
function cryptoLogoHtml(ticker) {
  const base = ticker.toUpperCase();
  const cdn = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${encodeURIComponent(ticker.toLowerCase())}.png`;
  const local = cryptoLogoSrc(base);
  const fb = local ? ` data-fallback="${cdn}"` : "";
  return `<span class="crypto-logo-wrap"><img class="crypto-logo" src="${local || cdn}" alt="" loading="lazy"${fb} onerror="${CRYPTO_LOGO_ONERROR}" /><span class="crypto-logo-badge" style="display:none;">🪙</span></span>`;
}

// S&P500 전 종목의 전일 등락률을 가볍게 조회(차트 1회, 5일치 일봉)해 급등주/급락주 정렬 후보로 사용
// 급등주·급락주 탭이 같은 스크리닝 결과를 공유하도록 메모이즈(500종목 조회를 두 번 하지 않음)
let sp500DailyChangesPromise = null;
async function getSP500DailyChanges() {
  if (!sp500DailyChangesPromise) {
    sp500DailyChangesPromise = (async () => {
      const tickers = await getSP500Tickers();
      const results = await mapWithConcurrency(tickers, 15, async (symbol) => {
        const chart = await yahooChart(symbol, "5d", "1d").catch(() => null);
        const changePct = getDailyChangePercent(chart);
        const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
        if (changePct === null || !meta || meta.regularMarketPrice === undefined) return null;
        return { symbol, name: meta.shortName || meta.longName || symbol, price: meta.regularMarketPrice, changePct };
      });
      return results.filter(Boolean);
    })().catch((e) => {
      sp500DailyChangesPromise = null; // 실패 시 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return sp500DailyChangesPromise;
}

// 추세평가 서브내비에서 현재 선택된 버튼만 활성 표시
function setTrendActive(activeBtn) {
  Object.values(trendButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindTrend = (btn, run) =>
  btn.addEventListener("click", () => {
    setTrendActive(btn);
    run();
  });

// ---------- 급등주/급락주: S&P500 종목 중 전일 등락률 상위·하위 50개, 접속 시 10개만 먼저 표시 ----------
async function runMovers(direction) {
  const label = direction === "surge" ? "상승률" : "하락률";
  setTrendActive(direction === "surge" ? trendButtons.surge : trendButtons.plunge);
  trendResults.innerHTML = "";

  if (getWatchlistActiveMarket() === "KR") {
    await renderKrRanking(getKrDailyChanges, label, trendStatus, trendResults, {
      mapFn: async (list) => {
        // 투자안정 열을 다른 랭킹들과 동일하게 항상 채우기 위해, 상위 30개만 추려낸 뒤 전체 지표를 추가로 조회
        // (기존 기업가치 탭 기본 스캔 규모(30개)와 맞춰 로딩 시간이 크게 늘지 않도록 함)
        const top = list.sort((a, b) => (direction === "surge" ? b.changePct - a.changePct : a.changePct - b.changePct)).slice(0, 30);
        const { sp500Return, kospi200Return } = await getMarketReturnsCached();
        const full = (await mapWithConcurrency(top, 8, (r) => getFullMetrics(r.symbol).catch(() => null))).filter(Boolean);
        const fullBySymbol = new Map(full.map((m) => [m.symbol, m]));
        return top
          .map((r) => {
            const m = fullBySymbol.get(r.symbol);
            return m ? { ...r, riskTotal: computeRiskScore(m, sp500Return, kospi200Return).total, isIPO: isRecentIPO(m.firstTradeDate) } : r;
          })
          .filter((r) => r.riskTotal !== undefined);
      },
      sortFn: (a, b) => (direction === "surge" ? b.changePct - a.changePct : a.changePct - b.changePct),
      metricHeaderHtml: "등락률",
      metricCellFn: (r) => fmtGrowthCell(r.changePct),
      noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 순위는 전일 대비 등락률(${direction === "surge" ? "상승률 높은" : "하락률 큰"} 순) 기준이며, 코스피200+코스닥150(약 350종목) 중 상위 30개입니다.</p>`,
    });
    return;
  }

  trendStatus.style.display = "block";
  trendStatus.textContent = `S&P500 ${label}을 불러오는 중...`;

  try {
    const marketReturnsPromise = getMarketReturns();
    const candidates = await getSP500DailyChanges();
    if (candidates.length === 0) throw new Error(`${label} 데이터를 가져오지 못했습니다.`);

    // candidates는 급등주·급락주가 공유하는 캐시 배열이므로 정렬 전 복사(원본을 직접 sort하면 서로 순서가 꼬임)
    const sorted = [...candidates]
      .sort((a, b) => (direction === "surge" ? b.changePct - a.changePct : a.changePct - b.changePct))
      .slice(0, 50);

    await scoreAndRenderMovers(sorted, marketReturnsPromise, {
      statusEl: trendStatus,
      resultsEl: trendResults,
      rankNote: `순위는 전일 대비 등락률(${direction === "surge" ? "상승률 높은" : "하락률 큰"} 순) 기준이며, S&P500 편입 종목 중 상위 50개입니다.`,
      metric: {
        header: "당일<br>등락률",
        cell: (r) => (Number.isFinite(r.changePct) ? `<b class="${r.changePct >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.changePct)}</b>` : "N/A"),
      },
      initialCount: 10,
      fullCount: 50,
      capTotal: candidates.length, // 전체 S&P500 대비 상위 50개만 표시 중이라는 경고(2026-09-03)
    });
  } catch (err) {
    trendStatus.textContent = `❌ ${err.message || `${label}을 가져오지 못했습니다.`}`;
  }
}

// ---------- 배당률: 최근 1년 지급 배당금 합계 ÷ 현재가 기준 상위 50개, 접속 시 20개만 먼저 표시 ----------
// 미국은 S&P500, 국내는 코스피200+코스닥150(약 350종목)을 대상으로 함(좌측 상단 국내/해외 토글의 현재 상태를 따름).
// 배당 지급 이력(2년치, chart API의 events=div)만 조회하면 되는 가벼운 요청이라 전체 종목을 한 번에 스캔해 정확한
// 순위를 낸 뒤, "더보기"는 추가 네트워크 요청 없이 이미 계산해 둔 나머지 순위를 그대로 펼치기만 함
let krUniverseDataPromise = null;
function getKrUniverseData() {
  if (!krUniverseDataPromise) {
    krUniverseDataPromise = fetch("data/kr-universe-kospi200-kosdaq150.json", { cache: "no-store" })
      .then((r) => r.json())
      .catch((e) => {
        krUniverseDataPromise = null;
        throw e;
      });
  }
  return krUniverseDataPromise;
}
async function getKrUniverseTickers() {
  const data = await getKrUniverseData();
  return [...(data.kospi200 || []), ...(data.kosdaq150 || [])].map((it) => it.symbol);
}
// 랭킹 표에 티커 대신 보여줄 한글 회사명 조회용(코스피200+코스닥150 목록에 이미 있는 실제 회사명을 그대로 사용)
let krSymbolNameMapPromise = null;
async function getKrSymbolNameMap() {
  if (!krSymbolNameMapPromise) {
    krSymbolNameMapPromise = getKrUniverseData().then((data) => {
      const map = new Map();
      [...(data.kospi200 || []), ...(data.kosdaq150 || [])].forEach((it) => map.set(it.symbol, it.name));
      return map;
    });
  }
  return krSymbolNameMapPromise;
}

// 최근 지급 이력(2년치)으로 배당컷·지급지연 여부를 판정 — 국내는 연 1회, 미국은 분기 1회가 흔해 주기가 서로 다르므로
// 특정 개월수를 못박지 않고 실제 지급 간격의 평균("자기 자신의 평소 주기")을 기준으로 삼음
// - cut: 가장 최근 지급액이 그 직전 지급액보다 20% 이상 줄어든 경우(배당컷 의심)
// - overdue: 마지막 지급 이후 평소 주기의 1.5배 넘게 지났는데 다음 지급이 없는 경우(중단·지연 의심)
function detectDividendWarning(divEvents) {
  const dates = Object.values(divEvents)
    .filter((d) => d && typeof d.amount === "number" && typeof d.date === "number")
    .map((d) => ({ date: d.date, amount: d.amount }))
    .sort((a, b) => a.date - b.date);
  if (dates.length < 2) return null;

  const last = dates[dates.length - 1];
  const prev = dates[dates.length - 2];
  if (last.amount < prev.amount * 0.8) return "cut";

  const gaps = [];
  for (let i = 1; i < dates.length; i++) gaps.push(dates[i].date - dates[i - 1].date);
  const avgGapSec = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sinceLastSec = Date.now() / 1000 - last.date;
  if (avgGapSec > 0 && sinceLastSec > avgGapSec * 1.5) return "overdue";

  return null;
}

async function getDividendYieldInfo(symbol) {
  try {
    const data = await yahooDividends(symbol);
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    if (!result) return null;
    const meta = result.meta || {};
    const price = meta.regularMarketPrice;
    const divEvents = result.events && result.events.dividends;
    if (!price || !divEvents) return null;
    const oneYearAgoSec = Date.now() / 1000 - 365 * 86400;
    const trailingSum = Object.values(divEvents)
      .filter((d) => d && d.date >= oneYearAgoSec && typeof d.amount === "number")
      .reduce((sum, d) => sum + d.amount, 0);
    if (trailingSum <= 0) return null;
    return {
      symbol,
      price,
      currency: meta.currency,
      name: meta.shortName || meta.longName || symbol,
      // 배당률 표의 현재가 옆 (등락률) — 2026-09-12 사용자 지적으로 추가. 이미 받아둔 일봉 차트에서 바로 계산한다
      changePct: getDailyChangePercent(data),
      yieldPct: (trailingSum / price) * 100,
      dividendWarning: detectDividendWarning(divEvents),
    };
  } catch {
    return null;
  }
}

// 배당률(국내·해외 공통)도 다른 랭킹과 동일하게 접속 직후엔 시가총액 상위 30개만 스캔해서 보여주고,
// "전체보기"를 눌러야 나머지를 이어서 스캔함
const ensureKrDividendYields = makeIncrementalScan(getKrUniverseTickers, (symbol) => getDividendYieldInfo(symbol), 15);
const ensureUsDividendYields = makeIncrementalScan(getSP500PriorityOrder, (symbol) => getDividendYieldInfo(symbol), 15);
// 배당률 상위 종목에 붙일 투자안정 점수(재무제표 조회)는 시가총액 상위 30개 단계에서 이미 계산한 종목을
// "전체보기" 이후 다시 조회하지 않도록 심볼별로 캐싱(국내·해외 공용)
const dividendRiskMetricsCache = new Map();
function dividendWarningHtml(r) {
  if (r.dividendWarning === "cut") return ` <span class="dividend-warn" title="직전 지급액보다 배당금이 20% 넘게 줄었습니다(배당컷 의심)">⚠️컷</span>`;
  if (r.dividendWarning === "overdue") return ` <span class="dividend-warn" title="평소 지급 주기보다 오래 배당 지급이 없습니다(지급 중단·지연 의심)">⚠️지연</span>`;
  return "";
}

// 한국 종목은 티커 대신 회사명을 그대로 표시(순위표에서 티커보다 알아보기 쉬움), 해외 종목은 기존처럼 티커를 그대로 두고
// 그 아래에 한글 별칭(없으면 영문 회사명)을 작게 덧붙임(moversTableHtml 등 다른 순위표와 같은 표기 방식)
function dividendRowHtml(r, i, nameMap) {
  const krName = nameMap && nameMap.get(r.symbol);
  // 2026-09-13: 3칸 틀 통일 — 이름 위, 코드·시장 아래
  return `
    <tr>
      <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), krName || rankDisplayName(r.symbol, r.name, false))}</td>
      <td>${rankPriceCellHtml(r.symbol, r.price, r.currency, r.changePct)}</td>
      <td><b class="rank-hl">${r.yieldPct.toFixed(2)}%</b>${dividendWarningHtml(r)}</td>
    </tr>`;
}

// 배당률(국내·해외 공통) 전용 — 접속 직후엔 시가총액 상위 30개만 스캔해서 보여주고, "전체보기"를 눌러야
// 그때 나머지를 이어서 스캔함(다른 랭킹과 동일한 체감 속도). ensureYields: ensureKrDividendYields 또는
// ensureUsDividendYields, getNameMap: 국내는 한글 회사명 조회(getKrSymbolNameMap), 해외는 불필요하므로 null
async function runTrendDividendStaged(initialCount, ensureYields, universeLabel, getNameMap) {
  async function paintUpTo(targetCount) {
    try {
      const isFullScan = targetCount > initialCount;
      // "더보기" 클릭으로 이어서 불러오는 중이면(이미 버튼이 있으면) 맨 위 공지 자리 대신 그 버튼 자체에 진행 상황을 표시
      const moreBtn = trendResults.querySelector(".load-more-btn");
      const setProgress = (text) => {
        if (moreBtn) {
          moreBtn.disabled = true;
          moreBtn.textContent = text;
        } else {
          trendStatus.style.display = "block";
          trendStatus.textContent = text;
        }
      };
      setProgress(isFullScan ? `전체 검색 중(약 1분 소요될 수 있어요)...` : `${universeLabel} 배당률을 계산하는 중...`);
      const nameMapPromise = getNameMap ? getNameMap() : Promise.resolve(null);
      const progressCb = (done, target) => setProgress(`${done}/${target} 종목 배당률 확인 중...`);
      let scanned = targetCount;
      let { items: raw, total } = await ensureYields(scanned, progressCb);
      // 무배당 종목은 순위에서 제외되므로 상위 30개만 스캔하면 30등까지 못 채우는 경우가 있음(국내 26개 등) —
      // 첫 화면에서는 배당 종목이 30개 찰 때까지 스캔 범위를 15개씩 자동 확장(최대 90개까지, 2026-08-31)
      if (!isFullScan) {
        while (raw.length < 30 && scanned < Math.min(total, 90)) {
          scanned = Math.min(scanned + 15, total, 90);
          ({ items: raw, total } = await ensureYields(scanned, progressCb));
        }
      } else {
        scanned = Math.min(targetCount, total);
      }
      const nameMap = await nameMapPromise;
      if (raw.length === 0) throw new Error("배당률 데이터를 가져오지 못했습니다.");

      const ranked = raw.slice().sort((a, b) => b.yieldPct - a.yieldPct);
      // 2026-09-12 사용자 지적: 배당률만 "시가총액 38위까지 검색됨"으로 나오던 이유 —
      // 무배당 종목이 순위에서 빠지다 보니 30개를 채우려고 스캔 범위를 15개씩 넓히는데,
      // 그렇게 찾은 개수를 그대로 다 보여줬다. 다른 랭킹과 똑같이 상위 30개만 자른다.
      const top50 = ranked.slice(0, 30);
      const hasMore = scanned < total;

      // 마지막 열: 10년월간승률(2026-09-04 투자안정 대체) — 배치 DB라 추가 조회가 가벼움
      await ensureWinRateDbResolved();
      trendStatus.style.display = "none";

      trendResults.innerHTML = `
        ${rankScanCaptionHtml(top50.length, hasMore)}
        ${TAP_HINT_HTML}
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}<th data-explain="배당률 — 최근 1년간 지급된 배당금 합계 ÷ 현재가입니다. 실제 배당 정책은 바뀔 수 있고, ⚠️컷·⚠️지연 표시는 배당이 줄거나 늦어졌다는 뜻입니다.">배당률</th></tr></thead>
          <tbody>${top50.map((r, i) => dividendRowHtml(r, i, nameMap)).join("")}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${total}">전체보기 (나머지 ${total - scanned}개 · 전체 검색 시 약 1분 소요)</button>` : ""}
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 배당률은 최근 1년간 지급된 배당금 합계 ÷ 현재가 기준(${universeLabel} 대상)이며, 실제 배당 정책은 변경될 수 있습니다. <span class="dividend-warn">⚠️컷</span>은 직전 지급액보다 20% 넘게 줄어든 경우, <span class="dividend-warn">⚠️지연</span>은 평소 지급 주기보다 오래 지급이 없는 경우를 뜻합니다. 투자 자문이 아닙니다.</p>
      `;
      const newMoreBtn = trendResults.querySelector(".load-more-btn");
      if (newMoreBtn) {
        newMoreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!beginLoadMoreScan(trendResults, trendStatus)) return; // 스캔 중 재클릭 무시 + 표 접고 진행 현황 맨 위 표시
          paintUpTo(Number(newMoreBtn.dataset.nextCount)).finally(() => endLoadMoreScan(trendResults));
        });
      }
    } catch (err) {
      trendStatus.textContent = `❌ ${err.message || "배당률을 가져오지 못했습니다."}`;
    }
  }
  if (!guardRankingScan(trendResults)) return; // 이미 검색이 도는 중이면 재실행 금지
  trendResults.dataset.scanning = "1";
  try {
    await paintUpTo(initialCount);
  } finally {
    endLoadMoreScan(trendResults);
  }
}

async function runTrendDividend() {
  setTrendActive(trendButtons.dividend);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";

  if (getWatchlistActiveMarket() === "KR") {
    await runTrendDividendStaged(30, ensureKrDividendYields, "코스피200+코스닥150", () => getKrSymbolNameMap().catch(() => new Map()));
  } else {
    await runTrendDividendStaged(30, ensureUsDividendYields, "S&P500", null);
  }
}

// ---------- 거래량(구 인기종목): 당일 거래대금(가격 × 거래량) 상위 20개, 접속 시 10개만 먼저 표시(옛 틀고정 "인기종목" 탭이 여기로 통합됨) ----------
// ---------- 1일 거래대금 증감(배수) — 지도 "대금" 모드와 같은 계산(2026-10-19 사용자 요청: 거래대금은 모두 이 값으로) ----------
// 오늘(장중엔 장 시작~지금) 거래대금 ÷ 직전 20거래일(같은 시각까지) 평균. 기준선은 data/volume-profile.json(하루 한 번 자동 계산).
let volrProfile = null;
let volrPromise = null;
function volrLoad() {
  if (!volrPromise) {
    volrPromise = fetch(`data/volume-profile.json?d=${new Date().toISOString().slice(0, 13)}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (volrProfile = d && d.v ? d : null))
      .catch(() => null);
  }
  return volrPromise;
}
function volrKind(sym) {
  if (/\.(KS|KQ)$/.test(sym)) return "kr";
  if (/-(USD|KRW|USDT)$/.test(sym)) return "crypto";
  return "us";
}
const VOLR_SESSION = { kr: { tz: "Asia/Seoul", start: 540, len: 390 }, us: { tz: "America/New_York", start: 570, len: 390 }, crypto: { tz: "UTC", start: 0, len: 1440 } };
function volrPrevWeekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}
function volrSession(kind) {
  const cfg = VOLR_SESSION[kind];
  const parts = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: cfg.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
    .formatToParts(new Date())
    .forEach((p) => (parts[p.type] = p.value));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const mins = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  if (kind === "crypto") return { date, elapsed: cfg.len, len: cfg.len };
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return { date: volrPrevWeekday(date), elapsed: cfg.len, len: cfg.len };
  if (mins < cfg.start) return { date: volrPrevWeekday(date), elapsed: cfg.len, len: cfg.len };
  if (mins >= cfg.start + cfg.len) return { date, elapsed: cfg.len, len: cfg.len };
  return { date, elapsed: mins - cfg.start, len: cfg.len };
}
function volrInterp(arr, elapsed, len) {
  if (elapsed >= len) return arr[arr.length - 1];
  const i = Math.floor(elapsed / 60);
  const lower = i === 0 ? 0 : arr[i - 1];
  const upper = arr[i];
  const span = Math.min(60 * (i + 1), len) - i * 60;
  return lower + ((upper - lower) * (elapsed - i * 60)) / span;
}
// value = 오늘 지금까지 거래대금(현재가 × 당일 누적 거래량). 계산 못 하면 undefined
function volrRatio(sym, value) {
  const ent = volrProfile && volrProfile.v[sym];
  if (!ent || !(value > 0)) return undefined;
  const kind = volrKind(sym);
  const ses = volrSession(kind);
  const base = (volrProfile.asOf && volrProfile.asOf[kind]) === ses.date ? ent[0] : ent[1];
  if (ses.elapsed < 10) return undefined;
  const exp = volrInterp(base, ses.elapsed, ses.len);
  return exp > 0 ? value / exp : undefined;
}
function fmtVolr(r) {
  return Number.isFinite(r) ? `${r >= 10 ? r.toFixed(0) : r.toFixed(1)}배` : "N/A";
}
// 워커 /day-vals — 호출 하나에 바깥 요청 50개 한도라 45종목씩 나눠 동시에
async function volrFetchDayVals(symbols) {
  const out = {};
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 45) chunks.push(symbols.slice(i, i + 45));
  await mapWithConcurrency(chunks, 6, async (chunk) => {
    try {
      const res = await fetch(`https://us-stock.yeop2ad.workers.dev/day-vals?symbols=${encodeURIComponent(chunk.join(","))}`);
      const data = res.ok ? await res.json() : null;
      Object.assign(out, (data && data.vals) || {});
    } catch {}
  });
  return out;
}
async function runTrendVolume() {
  setTrendActive(trendButtons.volume);
  trendResults.innerHTML = "";

  if (getWatchlistActiveMarket() === "KR") {
    // 해외 거래량 탭과 구성을 맞춤 — 거래대금 기준으로 정렬하되, 항목1엔 거래대금 대신 상승 압력 점수를 보여줌.
    // 전체 350종목을 무거운 재무제표 조회(ensureKrFullMetrics)로 스캔하면 로딩이 크게 느려지므로,
    // 가벼운 일별 등락(getKrDailyChanges, 차트 조회만)으로 먼저 거래대금 상위 30개만 추린 뒤
    // 그 30개에 대해서만 무거운 조회를 추가로 돌림(상승률·하락률 탭과 동일한 2단계 패턴, 기존 기업가치 탭
    // 기본 스캔 규모(30개)와 맞춰 로딩 시간이 크게 늘지 않도록 함)
    // 2026-09-16 사용자 요청: 셋째 칸은 그 화면의 기준값 — 거래대금 순위이므로 거래대금을 그대로 보여준다
    // (예전엔 상승 압력 점수를 보여주느라 30종목 재무제표를 통째로 더 조회해 1분 넘게 걸렸다)
    // 2026-10-19 사용자 요청: 거래대금 순위는 금액이 아니라 "1일 거래대금 증감"(1일 ÷ 20거래일, 몇 배) 기준
    await volrLoad();
    await renderKrRanking(getKrDailyChanges, "거래대금 증감", trendStatus, trendResults, {
      mapFn: (list) =>
        list
          .map((r) => ({ ...r, volRatio: volrRatio(r.symbol, r.dollarVolume) }))
          .filter((r) => Number.isFinite(r.volRatio))
          .sort((a, b) => b.volRatio - a.volRatio)
          .slice(0, 30),
      sortFn: (a, b) => b.volRatio - a.volRatio,
      metricHeaderHtml: `거래대금<br>증감`,
      metricExplain: "1일 거래대금 ÷ 20거래일 거래대금 — 장중에는 장 시작부터 지금까지를 20일 같은 시각 평균과 비교해요.",
      metricCellFn: (r) => `<b class="rank-hl">${fmtVolr(r.volRatio)}</b>`,
      noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 순위는 1일 거래대금 ÷ 20거래일 거래대금(몇 배) 기준이며, 코스피200+코스닥150(약 350종목) 중 상위 30개입니다. 투자 자문이 아닙니다.</p>`,
    });
    return;
  }

  trendStatus.style.display = "block";
  trendStatus.textContent = "거래대금 증감을 계산하는 중...";

  try {
    const marketReturnsPromise = getMarketReturns();
    await volrLoad();
    const uni = await getSReportUniverse(false);
    const companies = (uni && uni.companies) || [];
    if (!companies.length) throw new Error("S&P500 종목 목록을 가져오지 못했습니다.");
    const syms = companies.map((c) => c.symbol);
    const nameOf = new Map(companies.map((c) => [c.symbol, c.name]));
    const vals = await volrFetchDayVals(syms);
    const top = syms
      .map((symbol) => ({ symbol, dollarVolume: vals[symbol], volRatio: volrRatio(symbol, vals[symbol]) }))
      .filter((r) => Number.isFinite(r.volRatio))
      .sort((x, y) => y.volRatio - x.volRatio)
      .slice(0, 20);
    if (!top.length) throw new Error("거래대금 증감 데이터를 가져오지 못했습니다.");
    // 현재가·등락률은 상위 20개만 따로 조회
    await mapWithConcurrency(top, 5, async (r) => {
      try {
        const ch = await yahooChart(r.symbol, "5d", "1d");
        const meta = ch && ch.chart && ch.chart.result && ch.chart.result[0] && ch.chart.result[0].meta;
        r.price = meta ? meta.regularMarketPrice : null;
        r.changePct = meta && Number.isFinite(meta.regularMarketChangePercent) ? meta.regularMarketChangePercent : null;
        r.volume = meta ? meta.regularMarketVolume : null;
        r.dollarVolumeAt = meta && Number.isFinite(meta.regularMarketTime) ? meta.regularMarketTime : null;
      } catch {}
    });
    const ranked = top.filter((r) => Number.isFinite(r.price)).map((r) => ({ ...r, name: TICKER_TO_KOREAN_NAME[r.symbol] || nameOf.get(r.symbol) || r.symbol }));
    await scoreAndRenderMovers(ranked, marketReturnsPromise, {
      statusEl: trendStatus,
      resultsEl: trendResults,
      rankNote: "순위는 1일 거래대금 ÷ 20거래일 거래대금(몇 배, S&P500 기준) 입니다.",
      prefixHtml: "",
      metric: { header: "거래대금<br>증감", cell: (r) => `<b class="rank-hl">${fmtVolr(r.volRatio)}</b>` },
      initialCount: 10,
      fullCount: 20,
      capTotal: syms.length,
    });
  } catch (err) {
    trendStatus.textContent = `❌ ${err.message || "거래대금 증감을 가져오지 못했습니다."}`;
  }
}

// ---------- 상승압력: S&P500 전 종목 중 상승압력도 점수가 높은 순(가치평가 탭과 같은 방식의 정렬+더보기 렌더러 재사용) ----------
async function runTrendPressure() {
  setTrendActive(trendButtons.pressure);

  const pressureOpts = {
    mapFn: (list) => list.map((m) => ({ ...m, attractivenessTotal: computeAttractivenessScore(m).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.attractivenessTotal - a.attractivenessTotal,
    metricHeaderHtml: "상승 압력 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.attractivenessTotal, r.attractivenessTotal)),
  };

  if (getWatchlistActiveMarket() === "KR") {
    await renderKrRankingStaged("상승 압력", trendStatus, trendResults, {
      ...pressureOpts,
      noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승 압력 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래량(3개월 대비)·한달상승·RSI를 종합한 공통 배점 참고용 지표이며 코스피200+코스닥150(약 350종목) 대상, 투자 자문이 아닙니다.</p>`,
    });
    return;
  }

  trendStatus.style.display = "block";
  trendStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500PriorityOrder().catch((e) => {
    trendStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;

  await renderValueRanking(allTickers, "상승 압력", {
    statusEl: trendStatus,
    resultsEl: trendResults,
    buttons: [trendButtons.pressure],
    ...pressureOpts,
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승 압력 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래량(3개월 대비)·한달상승·RSI를 종합한 공통 배점 참고용 지표이며 투자 자문이 아닙니다.</p>`,
  });
}

// ---------- 시장동향: RSI 순위·승률 순위(2026-09-02 사용자 요청) — S&P500 미국주식 전용 ----------
// 다른 랭킹과 동일한 표 구성이지만 마지막 열이 투자안정 대신 서로의 점수: RSI 순위(주간 RSI 낮은 순 = 과매도 1등)는
// 승률점수를, 승률 순위(승률점수 높은 순)는 RSI 점수를 표시. 승률은 정적 DB(winrate-scores-us.json)에서 바로 읽고,
// RSI는 상세 페이지와 동일하게 주봉 3년치로 실시간 계산(computeWilderRsi) — 종목당 차트 1회, 세션 캐시로 두 순위가 공유.
const weeklyRsiSnapCache = new Map();
RANK_SCAN_RESETTERS.push(() => weeklyRsiSnapCache.clear());
async function getWeeklyRsiSnapshot(symbol) {
  if (weeklyRsiSnapCache.has(symbol)) return weeklyRsiSnapCache.get(symbol);
  const chart = await yahooChart(symbol, "3y", "1wk");
  const meta = (chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta) || {};
  const pairs = chartClosePairs(chart);
  const closes = pairs.map((p) => p.c);
  const rsi = computeWilderRsi(closes, 14);
  const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : closes.length ? closes[closes.length - 1] : null;
  // 1년 상승률(2026-09-12 사용자 요청, "수익률" 탭) — 1년 전에 가장 가까운 주봉 종가 대비 현재가.
  // 이미 받아둔 3년 주봉을 그대로 쓰므로 추가 조회가 없다.
  let oneYearReturn = null;
  if (pairs.length >= 2 && Number.isFinite(price)) {
    const target = pairs[pairs.length - 1].t - 365 * 86400;
    let base = null;
    let minDiff = Infinity;
    for (const q of pairs) {
      const d = Math.abs(q.t - target);
      if (d < minDiff) {
        minDiff = d;
        base = q;
      }
    }
    // 상장 1년이 안 돼 1년 전 봉이 없으면(가장 가까운 봉이 반년 넘게 어긋나면) 값을 내지 않는다
    if (base && base.c > 0 && minDiff <= 183 * 86400) oneYearReturn = ((price - base.c) / base.c) * 100;
  }
  const snap = {
    symbol,
    name: meta.shortName || meta.longName || "",
    // 2026-09-10: 주봉 마지막 종가가 아니라 현재가를 쓰고, 오늘 등락률도 같이 담음(주봉 차트 meta에도 실시간 시세가 들어옴)
    price,
    changePct: Number.isFinite(meta.regularMarketChangePercent) ? meta.regularMarketChangePercent : null,
    oneYearReturn,
    rsi: rsi === null || rsi === undefined ? null : Math.round(rsi * 10) / 10,
  };
  weeklyRsiSnapCache.set(symbol, snap);
  return snap;
}
// 상세 페이지 RSI 점수와 동일한 색 규칙(30 미만 초록/70 이상 빨강/중립 기본색)
function rsiRankCellHtml(rsi) {
  if (rsi === null || rsi === undefined) return "N/A";
  const color = rsi < 30 ? "#22a866" : rsi >= 70 ? "#ef4444" : "var(--text)";
  return `<b style="color:${color};">${rsi}</b>`;
}
async function runTrendRsiWinRate(mode) {
  const isRsi = mode === "rsi";
  const isRet = mode === "ret"; // 상단 "수익률" 탭 — 2026-09-12 사용자 요청으로 1년 상승량 순
  const isCagr = mode === "cagr"; // 핵심지표 "10년 평균상승률"의 +순위(2026-09-16) — 10년 연복리(CAGR) 순
  const label = isRsi ? "RSI 순위" : isRet ? "1년 수익률" : isCagr ? "10년 평균상승률" : "10년월간승률";
  const statusEl = trendStatus;
  const resultsEl = trendResults;
  // 국내 모드(2026-09-02 확장): 코스피200+코스닥150 유니버스(scoresKr)로 동일하게 동작
  const isKr = getWatchlistActiveMarket() === "KR";

  if (!guardRankingScan(resultsEl)) return;
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = `${label} 대상 종목을 불러오는 중...`;

  const db = await getWinRateDb();
  const scoreMap = db && (isKr ? db.scoresKr : db.scores);
  if (!scoreMap) {
    statusEl.textContent = "❌ 10년월간승률 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
    return;
  }
  const dbSymbols = Object.keys(scoreMap);
  const krNameMap = isKr ? await getKrSymbolNameMap().catch(() => new Map()) : null;
  // 다른 랭킹과 동일하게 시가총액(국내는 지수 편입 비중) 우선순으로 처음 30개만 먼저 스캔 — DB에 있는 티커만 대상
  let tickers;
  const order = await (isKr ? getKrUniverseTickers() : getSP500PriorityOrder()).catch(() => null);
  if (order) {
    const inDb = new Set(dbSymbols);
    tickers = order.filter((t) => inDb.has(t));
    const inOrder = new Set(tickers);
    for (const t of dbSymbols) if (!inOrder.has(t)) tickers.push(t);
  } else {
    tickers = dbSymbols;
  }

  let cursor = 0;
  let rawScored = [];
  const initialCount = 30;

  async function scoreUpTo(targetCursor) {
    targetCursor = Math.min(targetCursor, tickers.length);
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    const setProgress = (text) => {
      if (moreBtn) {
        moreBtn.disabled = true;
        moreBtn.textContent = text;
      } else {
        statusEl.style.display = "block";
        statusEl.textContent = text;
      }
    };
    try {
      const pending = tickers.slice(cursor, targetCursor);
      if (pending.length > 0) {
        const startCursor = cursor;
        const isFullScan = targetCursor - cursor > initialCount;
        const label2 = isFullScan ? "전체 검색 중(약 1분 소요될 수 있어요)" : `${label} 확인 중`;
        setProgress(`${startCursor}/${targetCursor} 종목 ${label2}...`);
        const snaps = await mapWithConcurrency(pending, 5, getWeeklyRsiSnapshot, (completed) => {
          setProgress(`${startCursor + completed}/${targetCursor} 종목 ${label2}...`);
        });
        rawScored = rawScored.concat(snaps.filter(Boolean));
        cursor = targetCursor;
      }
      statusEl.style.display = "none";
      if (rawScored.length === 0) {
        resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
        return;
      }

      const ranked = rawScored.map((r) => {
        const e = scoreMap[r.symbol];
        return {
          ...r,
          winRate: e && e.score !== null && e.score !== undefined ? e.score : null,
          ret10y: e && Number.isFinite(e.ret10y) ? e.ret10y : null,
          winTotal: e && Number.isFinite(e.total) ? e.total : null,
        };
      });
      ranked.sort(
        isRsi
          ? (a, b) => (a.rsi ?? Infinity) - (b.rsi ?? Infinity)
          : isCagr
          ? (a, b) => (Number.isFinite(b.ret10y) ? b.ret10y : -Infinity) - (Number.isFinite(a.ret10y) ? a.ret10y : -Infinity)
          : isRet
          ? // 2026-09-12 사용자 요청: 연평균(CAGR)이 아니라 현시점 기준 1년 상승량 순
            (a, b) => (Number.isFinite(b.oneYearReturn) ? b.oneYearReturn : -Infinity) - (Number.isFinite(a.oneYearReturn) ? a.oneYearReturn : -Infinity)
          : (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1)
      );
      const hasMore = cursor < tickers.length;
      // 상장 10년 미만(total<120) 느낌표(2026-09-04 사용자 요청) — 10년월간승률 순위·검색상세 공통 표기
      const winRateCell = (r) => winRatePctCellHtml(r.winRate, r.winTotal, false, partialMonthsFor(r.symbol));

      const rows = ranked
        .map((r, i) => {
          const mainName = isKr ? (krNameMap && krNameMap.get(r.symbol)) || TICKER_TO_KOREAN_NAME[r.symbol] || r.name || r.symbol : rankDisplayName(r.symbol, r.name, false);
          return `
        <tr>
          <td>${rankNameCellHtml(r.symbol, tickerLogoHtml(r.symbol), mainName)}</td>
          <td>${rankPriceCellHtml(r.symbol, r.price, isKr ? "KRW" : "USD", r.changePct)}</td>
          ${/* 2026-09-16 사용자 요청: 어느 순위든 기업명 - 현재가(등락률) - 해당 항목 3칸으로 통일(RSI의 딸림 승률 열도 삭제) */ ""}
          <td>${
            isRsi
              ? rsiRankCellHtml(r.rsi)
              : isRet
              ? ret1yCellHtml(r.oneYearReturn)
              : isCagr
              ? Number.isFinite(r.ret10y)
                ? `${partialMarkHtml(r.winTotal, "wr-mark-front", partialMonthsFor(r.symbol))}<b class="rank-hl">${r.ret10y > 0 ? "+" : ""}${Math.round(r.ret10y * 10) / 10}%</b>`
                : "N/A"
              : winRateCell(r)
          }</td>
        </tr>`;
        })
        .join("");

      const universeLabel = isKr ? "코스피200+코스닥150" : "S&P500";
      const trendNoteHtml = isRsi
        ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 — 주간 RSI(14)가 낮은 순(과매도부터 1등) 순위입니다. <b style="color:#22a866;">30 미만 과매도(초록)</b>·<b style="color:#ef4444;">70 이상 과매수(빨강)</b>, 참고용 기술적 지표이며 투자 자문이 아닙니다.</p>`
        : isCagr
        ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 — <b>10년 평균상승률</b>(최근 10년 연복리 수익률 CAGR, 매년 몇 %씩 오른 셈인지)이 높은 순 순위입니다. 상장 10년 미만은 상장 후 기간만 연율화한 값이라 ⚠️가 붙습니다. 참고용 지표이며 투자 자문이 아닙니다.</p>`
        : isRet
        ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 — <b>1년 수익률</b>(1년 전 같은 시점의 주가 대비 현재가, 현시점 기준 실제 상승량)이 높은 순 순위입니다. 매년 평균이 아니라 최근 1년치 성적이며, 상장 1년이 안 된 종목은 값이 없어 맨 뒤로 갑니다. 참고용 지표이며 투자 자문이 아닙니다.</p>`
        : `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} 대상 — 10년월간승률(최근 10년 월봉 기준 상승 개월수/총 개월수×100, 상장 10년 미만은 상장 후부터 집계·⚠️ 표시)이 높은 순 순위입니다. 참고용 지표이며 투자 자문이 아닙니다.</p>`;
      resultsEl.innerHTML = `
        ${rankScanCaptionHtml(ranked.length, hasMore)}
        ${!isRsi && !isRet && !isCagr ? WINRATE_HEAD_HTML : TAP_HINT_HTML}
        <table class="top30-table rk-table">
          <thead><tr>${RANK_TH_NAME}${RANK_TH_PRICE}${isRsi ? RANK_TH_RSI : isRet ? RANK_TH_RET1Y : isCagr ? RANK_TH_RET10 : RANK_TH_WINRATE}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${tickers.length}">전체보기 (나머지 ${tickers.length - cursor}개 · ${tickers.length}개 전부 검색 시 약 1분 소요)</button>` : ""}
        ${trendNoteHtml}
      `;
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || "분석 중 오류가 발생했습니다."}`;
    }
  }

  resultsEl._loadMore = (count) => {
    if (!beginLoadMoreScan(resultsEl, statusEl)) return;
    scoreUpTo(count).finally(() => endLoadMoreScan(resultsEl));
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn2 = e.target.closest(".load-more-btn");
      if (!moreBtn2 || !moreBtn2.dataset.nextCount) return; // ETF·코인 전체보기(자체 리스너)와의 경합 방지(2026-09-02)
      resultsEl._loadMore(Number(moreBtn2.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  resultsEl.dataset.scanning = "1";
  try {
    await scoreUpTo(initialCount);
  } finally {
    endLoadMoreScan(resultsEl);
  }
}

bindTrend(trendButtons.volume, runTrendVolume);
bindTrend(trendButtons.plunge, () => runMovers("plunge"));
bindTrend(trendButtons.surge, () => runMovers("surge"));
bindTrend(trendButtons.dividend, runTrendDividend);
bindTrend(trendButtons.pressure, runTrendPressure);

function wlNumStr(n, currency) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  const abs = Math.abs(n);
  // 1 미만(소형 코인 등)은 유효숫자 4자리 — 0.000012 같은 값이 0.0000으로 뭉개지지 않게
  if (currency !== "KRW" && abs !== 0 && abs < 1) return abs.toLocaleString("en-US", { maximumSignificantDigits: 4 });
  const digits = currency === "KRW" ? 0 : 2;
  return abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
// ETF는 1년치 차트를 한 번만 받아 거래대금(1년 평균)·상승률(1년) 두 기준을 모두 계산 — 기준 전환 시 재조회 없이 재정렬만 함
async function fetchEtfMetrics(tickers, nameMap) {
  const results = await mapWithConcurrency(tickers, 8, async (symbol) => {
    const chart = await yahooChart(symbol).catch(() => null);
    const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
    if (!meta || meta.regularMarketPrice === undefined) return null;
    return {
      symbol,
      name: (nameMap && nameMap[symbol]) || meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice,
      changePct: getDailyChangePercent(chart),
      avgDollarVolume1y: currentDollarVolumeStats(chart).avg1y,
      oneYearReturn: get1yReturnFromChart(chart),
      currency: meta.currency || "USD",
    };
  });
  return results.filter(Boolean);
}

// 레버리지·인버스·배수(2X 등)·원자재(원유·금 등 선물) 상품은 제외 — 순수 지수·섹터·테마 추종 ETF만 유지
const US_ETF_TICKERS = [
  "SPY", "QQQ", "IWM", "VTI", "VOO", "DIA", "ARKK", "XLF", "XLK", "XLE",
  "XLV", "XLY", "XLP", "XLI", "TLT", "HYG", "LQD", "EEM",
  "EFA", "VXX", "SMH", "XBI", "KRE", "VNQ",
];

const KR_ETF_LIST = [
  { t: "069500.KS", name: "KODEX 200" },
  { t: "102110.KS", name: "TIGER 200" },
  { t: "091160.KS", name: "KODEX 반도체" },
  { t: "091170.KS", name: "KODEX 은행" },
  { t: "305720.KS", name: "KODEX 2차전지산업" },
  // 091220.KS는 TIGER 은행이고 TIGER 반도체의 실제 티커는 091230.KS(웹검색으로 확인, 2026-08) — 티커 정정
  { t: "091230.KS", name: "TIGER 반도체" },
  { t: "133690.KS", name: "TIGER 미국나스닥100" },
  { t: "360750.KS", name: "TIGER 미국S&P500" },
  { t: "381170.KS", name: "TIGER 미국테크TOP10 INDXX" },
  { t: "379800.KS", name: "KODEX 미국S&P500TR" },
  { t: "371460.KS", name: "TIGER 차이나전기차SOLACTIVE" },
  // 396500.KS는 2024년경 "TIGER 부동산인프라고배당"에서 "TIGER 반도체TOP10"으로 재상장(같은 티커, 다른 테마) — 최신 명칭으로 수정
  { t: "396500.KS", name: "TIGER 반도체TOP10" },
  { t: "192090.KS", name: "TIGER 차이나CSI300" },
  // 232080.KS는 실제로 TIGER 코스닥150, 277630.KS는 TIGER 코스피(웹검색으로 확인, 2026-08) — 종목명 정정
  { t: "232080.KS", name: "TIGER 코스닥150" },
  { t: "277630.KS", name: "TIGER 코스피" },
  { t: "148020.KS", name: "KBSTAR 200" },
  { t: "069660.KS", name: "KOSEF 200" },
  { t: "273130.KS", name: "KODEX 종합채권(AA-이상)액티브" },
  { t: "114260.KS", name: "KODEX 국고채3년" },
];

// ---------- US ETF / KR ETF: 거래대금(1년 평균) · 상승률(1년) 두 기준을 하위 버튼으로 전환하며 보는 랭킹 ----------
let etfMetricsCache = {}; // region("us"|"kr") -> 이미 조회한 candidates 배열(기준 전환 시 재사용)
let trendEtfActiveRegion = "us";
let trendEtfActiveMetric = "volume"; // "volume" | "return"

function etfRankingHtml(all, region, metric) {
  const sorted = [...all].sort((a, b) =>
    metric === "volume" ? (b.avgDollarVolume1y || 0) - (a.avgDollarVolume1y || 0) : (b.oneYearReturn ?? -Infinity) - (a.oneYearReturn ?? -Infinity)
  );
  const rows = sorted.slice(0, 30);
  const metricCell = (r) =>
    metric === "volume"
      ? r.avgDollarVolume1y
        ? fmtCompactCurrency(r.avgDollarVolume1y, r.currency)
        : "N/A"
      : r.oneYearReturn !== null && r.oneYearReturn !== undefined
      ? `<span class="${r.oneYearReturn >= 0 ? "delta-up" : "delta-down"}">${fmtPct(r.oneYearReturn)}</span>`
      : "N/A";
  const subnav = `
    <div class="top30-sub-nav" style="margin-bottom:10px;">
      <button type="button" class="cat-btn${metric === "volume" ? " active" : ""}" data-etf-metric="volume">거래대금(1년)</button>
      <button type="button" class="cat-btn${metric === "return" ? " active" : ""}" data-etf-metric="return">상승률(1년)</button>
    </div>`;
  // 한국 ETF는 티커가 숫자(예: 396500.KS)라 로고 실패 시 배지가 의미 없어짐 — 대신 운용사 브랜드 약자를 배지로 사용
  const KR_ETF_BRAND_BADGE = { KODEX: "KX", TIGER: "TG", KBSTAR: "KB", KOSEF: "KS" };
  const badgeFor = (r) => {
    if (region !== "kr") return undefined;
    ensureKrEtfLogoOverride(r.symbol, r.name); // 브랜드 → 운용사 그룹 CI(2026-09-03)
    const brand = r.name.split(" ")[0];
    return KR_ETF_BRAND_BADGE[brand];
  };
  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${
          region === "kr"
            ? `<span class="ticker-cell">${tickerLogoHtml(r.symbol, badgeFor(r))}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.name)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.symbol)}</span>`
            : `<span class="ticker-cell">${tickerLogoHtml(r.symbol, badgeFor(r))}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span>`
        }</td>
        <td>${priceChartLink(r.symbol, fmtPrice(r.price, r.currency))}${
        r.changePct !== null && r.changePct !== undefined
          ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>`
          : ""
      }</td>
        <td>${metricCell(r)}</td>
      </tr>`
    )
    .join("");
  return `
    ${subnav}
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${region === "us" ? "미국" : "한국"} 주요 상장 ETF 목록 중 ${
    metric === "volume" ? "거래대금(1년 평균)" : "상승률(1년)"
  } 상위 30개입니다. 투자 자문이 아닙니다.</p>
    <div class="popular-table-wrap">
      <table class="top30-table popular-table">
        <thead><tr><th>순위</th><th>기업명</th><th>현재가<br>(등락률)</th><th>${metric === "volume" ? "거래대금<br>(1년)" : "상승률<br>(1년)"}</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

async function runTrendEtf(region) {
  trendEtfActiveRegion = region;
  setTrendActive(region === "us" ? trendButtons.usEtf : trendButtons.krEtf);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";
  trendStatus.textContent = "ETF 데이터를 불러오는 중...";
  try {
    if (!etfMetricsCache[region]) {
      const nameMap = region === "kr" ? Object.fromEntries(KR_ETF_LIST.map((x) => [x.t, x.name])) : null;
      const tickers = region === "us" ? US_ETF_TICKERS : KR_ETF_LIST.map((x) => x.t);
      etfMetricsCache[region] = await fetchEtfMetrics(tickers, nameMap);
    }
    trendStatus.style.display = "none";
    trendResults.innerHTML = etfRankingHtml(etfMetricsCache[region], region, trendEtfActiveMetric);
  } catch (e) {
    trendStatus.textContent = `❌ ${e.message || "ETF 데이터를 가져오지 못했습니다."}`;
  }
}
async function runTrendUsEtf() {
  await runTrendEtf("us");
}
async function runTrendKrEtf() {
  await runTrendEtf("kr");
}
trendResults.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-etf-metric]");
  if (!btn || !etfMetricsCache[trendEtfActiveRegion]) return;
  trendEtfActiveMetric = btn.dataset.etfMetric;
  trendResults.innerHTML = etfRankingHtml(etfMetricsCache[trendEtfActiveRegion], trendEtfActiveRegion, trendEtfActiveMetric);
});

bindTrend(trendButtons.usEtf, runTrendUsEtf);
bindTrend(trendButtons.krEtf, runTrendKrEtf);

// ---------- 미래예측(베타): 과거 4개년 계절성(흰색) + 최근 6개월 실제 흐름·향후 6개월 예측(빨간색)을 한 차트에 표시 ----------
// 설계: 오늘을 기준으로 anchor = 오늘로부터 k년 전(k=4,3,2,1은 과거 4개년, k=0은 현재)을 잡고, 각 anchor의 앞뒤 6개월(총 12개월) 구간을
// 창(window)으로 삼는다. 창 시작 시점의 종가를 0%로 놓고 이후 각 거래일의 %변화를 구하면 서로 다른 해라도 같은 기준으로 겹쳐 비교할 수 있다.
// x좌표는 항상 "실제 경과일 / 창 전체 길이(12개월)"로 계산하므로(인덱스 기반이 아님) 그래프가 좌우로 늘어나거나 틀어지지 않는다.
// 현재(k=0) 구간은 창의 뒤쪽 절반(6개월치)이 아직 미래라 실데이터가 없으므로, 앞쪽 절반만 실선으로 그리고
// 과거 4개년의 "창 중간→끝" 구간 변화폭 평균(=4년 평균 기울기)을 오늘 시점 값에 더해 점선으로 이어 그린다.
const FUTURE_YEARS_BACK = 4;
const FUTURE_MONTH_NAMES_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
// 흰 배경(2026-09-10 사용자 요청)에서 보이도록 과거 연도 선은 옅은 회색 → 중간 회색 계열로
const FUTURE_LINE_COLORS = ["#d3d7de", "#cdd1d9", "#c7ccd5", "#c1c6d0"];
const FUTURE_LINE_COLORS_DARK = ["#5d6577", "#566073", "#4f596c", "#485265"]; // 과거 연도선: 흰색에 가까운 연한 회색(예상 빨간 점선이 돋보이게)

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

// pairs(chartClosePairs 결과)에서 windowStartSec~dataEndSec 구간만 뽑아 baseClose 대비 %로 환산하고,
// x좌표(frac)는 실제 창 전체 길이(fullEndSec) 기준으로 계산 — 현재 구간처럼 데이터가 창의 절반까지만 있어도 폭 비율은 정확히 유지됨
function buildBucketSeries(pairs, windowStartSec, dataEndSec, fullEndSec, baseClose) {
  return pairs
    .filter((p) => p.t >= windowStartSec && p.t <= dataEndSec)
    .map((p) => ({ frac: (p.t - windowStartSec) / (fullEndSec - windowStartSec), pct: ((p.c - baseClose) / baseClose) * 100 }));
}

async function computeFuturePrediction(ticker) {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);

  const buckets = [];
  for (let k = FUTURE_YEARS_BACK; k >= 0; k--) {
    const anchor = addMonths(now, -12 * k);
    const windowStartSec = Math.floor(addMonths(anchor, -6).getTime() / 1000);
    const fullEndSec = Math.floor(addMonths(anchor, 6).getTime() / 1000);
    const dataEndSec = k === 0 ? nowSec : fullEndSec;
    buckets.push({ k, year: anchor.getFullYear(), windowStartSec, dataEndSec, fullEndSec });
  }

  const earliestStartSec = buckets[0].windowStartSec; // k=FUTURE_YEARS_BACK(가장 과거)이 배열의 첫 원소
  const chartData = await yahooChartRange(ticker, earliestStartSec - 5 * 24 * 3600, nowSec + 24 * 3600, "1d");
  if (!chartData || !chartData.chart || !chartData.chart.result || !chartData.chart.result[0]) {
    throw new Error(`'${ticker}'의 시세 데이터를 가져오지 못했습니다.`);
  }
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) {
    throw new Error(`'${ticker}'의 시세 데이터가 충분하지 않습니다.`);
  }

  const series = [];
  let currentBasePrice = null; // 현재(k=0) 구간의 창 시작가 — 예상 도달가를 달러로 환산할 때 기준
  for (const b of buckets) {
    const base = closestPair(pairs, b.windowStartSec);
    // 상장한 지 얼마 안 된 종목은 그만큼 과거 데이터가 없어 closestPair가 엉뚱하게 먼 시점을 반환할 수 있으므로,
    // 창 시작 시점과 30일 이상 어긋나면 그 해는 신뢰할 수 없다고 보고 건너뜀(억지로 왜곡된 선을 그리지 않음)
    if (!base || !base.c || Math.abs(base.t - b.windowStartSec) > 30 * 24 * 3600) continue;
    if (b.k === 0) currentBasePrice = base.c;
    const points = buildBucketSeries(pairs, b.windowStartSec, b.dataEndSec, b.fullEndSec, base.c);
    if (points.length < 2) continue;
    series.push({ k: b.k, year: b.year, points });
  }

  const currentBucket = series.find((s) => s.k === 0);
  if (!currentBucket) throw new Error(`'${ticker}'의 최근 6개월 데이터를 가져오지 못했습니다.`);
  const historicalBuckets = series.filter((s) => s.k !== 0).sort((a, b) => b.year - a.year);

  const currentPct = currentBucket.points[currentBucket.points.length - 1].pct;

  // 2026-10-20 사용자 요청: 예측 = 과거 4개 그래프(오늘 시점을 0%로 맞춘 향후 6개월 흐름, 처음 → 끝)의 평균.
  // 예전엔 과거 후반부 변화폭(%p)을 현재 값에 더해서, 지금 주가가 크게 빠져 있으면 4개 그래프보다 월등히 높게 나왔다.
  const valueAtFrac = (pts, f) => {
    let prev = pts[0];
    for (const p of pts) {
      if (p.frac >= f) {
        const span = p.frac - prev.frac || 1;
        return prev.pct + ((p.pct - prev.pct) * (f - prev.frac)) / span;
      }
      prev = p;
    }
    return pts[pts.length - 1].pct;
  };
  const forwardDeltas = historicalBuckets
    .map((s) => {
      const end = s.points[s.points.length - 1];
      if (end.frac < 0.9) return null; // 후반부가 거의 없는 해는 평균에서 제외
      const mid = valueAtFrac(s.points, 0.5);
      return ((100 + end.pct) / (100 + mid) - 1) * 100; // 그 해의 "오늘 시점 → 6개월 뒤" 변화율(%)
    })
    .filter((v) => v !== null && Number.isFinite(v));

  const avgForwardRel = forwardDeltas.length ? forwardDeltas.reduce((a, b) => a + b, 0) / forwardDeltas.length : 0;
  const projectedEndPct = (100 + currentPct) * (1 + avgForwardRel / 100) - 100;

  const currentPrice = currentBasePrice !== null ? currentBasePrice * (1 + currentPct / 100) : null;
  const forecastPrice = currentBasePrice !== null ? currentBasePrice * (1 + projectedEndPct / 100) : null;

  return {
    ticker,
    currency: (chartData.chart.result[0].meta && chartData.chart.result[0].meta.currency) || (isKrTicker(ticker) ? "KRW" : "USD"),
    historicalBuckets,
    currentBucket,
    currentPrice,
    forecast: { endPct: projectedEndPct, price: forecastPrice },
    axisMonthStart: addMonths(now, -6),
    hasForwardData: forwardDeltas.length > 0,
  };
}

function niceStep(range) {
  const rough = range / 6;
  const candidates = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const c of candidates) if (rough <= c) return c;
  return Math.ceil(rough / 500) * 500;
}

function niceAxisBounds(minVal, maxVal) {
  const span = Math.max(maxVal - minVal, 10);
  const pad = span * 0.15;
  const step = niceStep(span + pad * 2);
  const lo = Math.floor((minVal - pad) / step) * step;
  const hi = Math.ceil((maxVal + pad) / step) * step;
  return { lo, hi, step };
}

function pathFromPoints(points, xFn, yFn) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.frac).toFixed(1)},${yFn(p.pct).toFixed(1)}`).join(" ");
}

// 오른쪽 가격 눈금(2026-09-15 사용자 요청): 최저~최고를 딱 떨어지는 5칸으로 — 예) 30만~50만이면 50만·45만·40만·35만·30만.
// 1·1.5·2·2.5·3·4·5·6·8 × 10ⁿ 간격 중 최저가 아래에서 시작해 4칸 안에 최고가가 들어가는 가장 작은 간격을 고름(눈금 5개 = lo + 0~4칸)
// (1·2·5만 쓰면 한 단계 차이로 간격이 두 배가 돼 0원~400만원처럼 빈 공간이 커졌음)
function priceAxisBounds(minVal, maxVal) {
  if (!(maxVal > minVal)) {
    const pad = Math.abs(maxVal || 1) * 0.01;
    minVal -= pad;
    maxVal += pad;
  }
  const raw = (maxVal - minVal) / 4;
  const exp = Math.floor(Math.log10(raw));
  for (let e = exp - 1; e <= exp + 2; e++) {
    for (const b of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
      const step = b * Math.pow(10, e);
      if (step < raw * 0.999) continue;
      const lo = Math.floor(minVal / step + 1e-9) * step;
      if (lo + 4 * step >= maxVal - step * 1e-9) return { lo, hi: lo + 4 * step, step };
    }
  }
  return { lo: minVal, hi: maxVal, step: raw };
}
// 캔들이 너무 촘촘하지 않게 한 화면 약 20개로 묶음(2026-09-15 사용자 요청) — 묶음마다 시가=첫 봉, 종가=끝 봉, 고가·저가=최대·최소
const SUMMARY_CANDLE_TARGET = 20;
function aggregateCandles(pairs, target = SUMMARY_CANDLE_TARGET) {
  if (pairs.length <= target * 1.5) return pairs;
  const size = Math.ceil(pairs.length / target);
  const out = [];
  // 최신 봉이 온전한 묶음 끝에 오도록 뒤에서부터 자름
  for (let end = pairs.length; end > 0; end -= size) {
    const chunk = pairs.slice(Math.max(0, end - size), end);
    out.unshift({
      t: chunk[0].t,
      o: chunk[0].o,
      c: chunk[chunk.length - 1].c,
      h: Math.max(...chunk.map((p) => p.h)),
      l: Math.min(...chunk.map((p) => p.l)),
    });
  }
  return out;
}
function fmtChartPrice(v, currency = "USD") {
  if (currency === "KRW") return v.toLocaleString(undefined, { maximumFractionDigits: 0 }) + "원";
  if (Math.abs(v) >= 1000) return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return "$" + v.toFixed(2);
}
const CHART_PERIOD_CONFIG = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
  max: { range: "max", interval: "1mo" },
};
const CHART_PERIOD_LABEL_FMT = {
  "1d": (d) => d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  "5d": (d) => d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
  "1mo": (d) => d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
  "1y": (d) => d.toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric" }),
  "5y": (d) => d.toLocaleDateString("ko-KR", { year: "numeric", month: "numeric" }),
  max: (d) => d.toLocaleDateString("ko-KR", { year: "numeric" }),
};

// 차트 지오메트리는 build/interaction 두 함수가 동일한 좌표계를 써야 크로스헤어가 정확히 맞아떨어짐
const PRICE_CHART_GEOM = { W: 780, H: 440, ML: 8, MR: 122, MT: 24, MB: 52 };
const PRICE_TAG_W = 108,
  PRICE_TAG_NOTCH = 8,
  PRICE_TAG_H = 36;

// 가격/캔들/매출·EPS 차트 배경 — 기본(화이트)은 사이트 화이트 테마와 통일, 설정에서 "블랙으로 보기"를 켜면
// 기업 상세 페이지의 다른 차트들(미래예측·투자안정 분포·FOMO/VIX 등)처럼 검정 배경으로 바뀜(함수로 둬서 매번 렌더 시점의 테마를 반영)
function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}
function chartBg() {
  return isDarkTheme() ? "#000000" : "#ffffff";
}
function chartGrid() {
  return isDarkTheme() ? "#23262f" : "#e5e7eb";
}
function chartAxisText() {
  return isDarkTheme() ? "#8a90a3" : "#6b7280";
}
const CHART_CROSSHAIR = "#9aa2b1";
const CHART_TAG_BG = "#f95403";
const CHART_TAG_TEXT = "#ffffff";

// 현재가/터치 위치를 가리키는 "책갈피" 모양(왼쪽 삼각 포인터 + 사각 라벨) path
function bookmarkTagPath(xStart, yCenter) {
  const halfH = PRICE_TAG_H / 2;
  const x1 = xStart + PRICE_TAG_NOTCH;
  const x2 = x1 + PRICE_TAG_W;
  const yT = (yCenter - halfH).toFixed(1);
  const yB = (yCenter + halfH).toFixed(1);
  return `M${xStart.toFixed(1)},${yCenter.toFixed(1)} L${x1.toFixed(1)},${yT} L${x2.toFixed(1)},${yT} L${x2.toFixed(1)},${yB} L${x1.toFixed(1)},${yB} Z`;
}

function priceChartScales(pairs) {
  const { W, H, ML, MR, MT, MB } = PRICE_CHART_GEOM;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = pairs.length;
  const prices = pairs.map((p) => p.c);
  const { lo, hi } = priceAxisBounds(Math.min(...prices), Math.max(...prices));
  const xFn = (i) => ML + (N <= 1 ? 0 : (i / (N - 1)) * PW);
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;
  return { W, H, ML, MR, MT, MB, PW, PH, N, lo, hi, xFn, yFn };
}

// 캔들 차트용 스케일 — 종가만이 아니라 고가/저가까지 포함해 축 범위를 잡아야 심지(wick)가 잘리지 않음
function priceChartScalesOhlc(pairs) {
  const { W, H, ML, MR, MT, MB } = PRICE_CHART_GEOM;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = pairs.length;
  const highs = pairs.map((p) => p.h);
  const lows = pairs.map((p) => p.l);
  const { lo, hi } = priceAxisBounds(Math.min(...lows), Math.max(...highs));
  const xFn = (i) => ML + (N <= 1 ? 0 : (i / (N - 1)) * PW);
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;
  return { W, H, ML, MR, MT, MB, PW, PH, N, lo, hi, xFn, yFn };
}

function buildPriceChartSvg(pairs, period, symbol) {
  const { W, H, ML, MT, PW, PH, N, lo, hi, xFn, yFn } = priceChartScales(pairs);
  const chartCurrency = isKrTicker(symbol) ? "KRW" : "USD";

  // Y축 라벨은 항상 정확히 5개(lo~hi를 4등분한 점)만 표시
  let gridSvg = "";
  for (let k = 0; k <= 4; k++) {
    const v = lo + (k / 4) * (hi - lo);
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${chartGrid()}" stroke-width="1" />`;
    gridSvg += `<text x="${(ML + PW + 8).toFixed(1)}" y="${(y + 7).toFixed(1)}" font-size="20" fill="${chartAxisText()}">${fmtChartPrice(v, chartCurrency)}</text>`;
  }

  let axisSvg = "";
  const fmt = CHART_PERIOD_LABEL_FMT[period] || CHART_PERIOD_LABEL_FMT["1y"];
  for (let k = 0; k <= 4; k++) {
    const idx = Math.round((k / 4) * (N - 1));
    const x = xFn(idx);
    const d = new Date(pairs[idx].t * 1000);
    const anchor = k === 0 ? "start" : k === 4 ? "end" : "middle";
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 36).toFixed(1)}" text-anchor="${anchor}" font-size="20" fill="${chartAxisText()}">${escapeHtml(fmt(d))}</text>`;
  }

  const linePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(i).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xFn(N - 1).toFixed(1)},${(MT + PH).toFixed(1)} L${xFn(0).toFixed(1)},${(MT + PH).toFixed(1)} Z`;

  const last = pairs[N - 1];
  const lastY = yFn(last.c);
  const lastX = xFn(N - 1);
  const gradId = `priceChartGrad${Math.random().toString(36).slice(2, 8)}`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(symbol)} 가격 차트">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f6fed" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#2f6fed" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="${chartBg()}" />
    ${gridSvg}
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none" />
    <path d="${linePath}" fill="none" stroke="#2f6fed" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    <g id="pcCurrentMarker">
      <line x1="${ML}" y1="${lastY.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${lastY.toFixed(1)}" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="3,3" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="#2f6fed" />
      <path d="${bookmarkTagPath(ML + PW, lastY)}" fill="${CHART_TAG_BG}" />
      <text x="${(ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1)}" y="${(lastY + 7).toFixed(1)}" text-anchor="start" font-size="20" font-weight="700" fill="${CHART_TAG_TEXT}">${fmtChartPrice(last.c, chartCurrency)}</text>
    </g>
    ${axisSvg}
    <rect id="pcHitArea" x="${ML}" y="0" width="${PW}" height="${H}" fill="transparent" style="touch-action:none;" />
    <g id="pcCrosshair" style="display:none;">
      <line x1="0" y1="${MT}" x2="0" y2="${(MT + PH).toFixed(1)}" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="2,2" />
      <line id="pcCrosshairHLine" x1="${ML}" y1="0" x2="${(ML + PW).toFixed(1)}" y2="0" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="2,2" />
      <circle id="pcCrosshairDot" r="4" fill="${chartBg()}" stroke="#2f6fed" stroke-width="2" />
      <path id="pcCrosshairTagPath" fill="${CHART_TAG_BG}" />
      <text id="pcCrosshairTagText" text-anchor="start" font-size="20" font-weight="700" fill="${CHART_TAG_TEXT}"></text>
    </g>
  </svg>`;
}

// 캔들 차트 1행 렌더러 — buildPriceChartSvg와 같은 그리드·책갈피 패턴을 재사용하되 선 대신 봉을 그림
function buildCandleChartSvg(pairs, period, symbol) {
  const { W, H, ML, MT, PW, PH, N, lo, hi, xFn, yFn } = priceChartScalesOhlc(pairs);
  const chartCurrency = isKrTicker(symbol) ? "KRW" : "USD";

  let gridSvg = "";
  for (let k = 0; k <= 4; k++) {
    const v = lo + (k / 4) * (hi - lo);
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${chartGrid()}" stroke-width="1" />`;
    gridSvg += `<text x="${(ML + PW + 8).toFixed(1)}" y="${(y + 7).toFixed(1)}" font-size="20" fill="${chartAxisText()}">${fmtChartPrice(v, chartCurrency)}</text>`;
  }

  let axisSvg = "";
  const fmt = CHART_PERIOD_LABEL_FMT[period] || CHART_PERIOD_LABEL_FMT["1y"];
  for (let k = 0; k <= 4; k++) {
    const idx = Math.round((k / 4) * (N - 1));
    const x = xFn(idx);
    const d = new Date(pairs[idx].t * 1000);
    const anchor = k === 0 ? "start" : k === 4 ? "end" : "middle";
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 36).toFixed(1)}" text-anchor="${anchor}" font-size="20" fill="${chartAxisText()}">${escapeHtml(fmt(d))}</text>`;
  }

  const slotW = N > 1 ? PW / N : PW; // 봉 사이 간격의 60%를 몸통 너비로 사용(너무 촘촘하면 최소 1.5px 보장)
  const bodyW = Math.max(1.5, slotW * 0.6);
  let candlesSvg = "";
  pairs.forEach((p, i) => {
    const x = xFn(i);
    const isUp = p.c >= p.o;
    const color = isUp ? "var(--pos)" : "var(--neg)"; // 빨강=상승, 파랑=하락(앱 공통 색상)
    const yHigh = yFn(p.h);
    const yLow = yFn(p.l);
    const yOpen = yFn(p.o);
    const yClose = yFn(p.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yClose - yOpen));
    candlesSvg += `<line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.2" />`;
    candlesSvg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}" />`;
  });

  const last = pairs[N - 1];
  const lastY = yFn(last.c);

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(symbol)} 캔들 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${chartBg()}" />
    ${gridSvg}
    ${candlesSvg}
    <g id="pcCurrentMarker">
      <line x1="${ML}" y1="${lastY.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${lastY.toFixed(1)}" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="3,3" />
      <path d="${bookmarkTagPath(ML + PW, lastY)}" fill="${CHART_TAG_BG}" />
      <text x="${(ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1)}" y="${(lastY + 7).toFixed(1)}" text-anchor="start" font-size="20" font-weight="700" fill="${CHART_TAG_TEXT}">${fmtChartPrice(last.c, chartCurrency)}</text>
    </g>
    ${axisSvg}
    <rect id="pcHitArea" x="${ML}" y="0" width="${PW}" height="${H}" fill="transparent" style="touch-action:none;" />
    <g id="pcCrosshair" style="display:none;">
      <line x1="0" y1="${MT}" x2="0" y2="${(MT + PH).toFixed(1)}" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="2,2" />
      <line id="pcCrosshairHLine" x1="${ML}" y1="0" x2="${(ML + PW).toFixed(1)}" y2="0" stroke="${CHART_CROSSHAIR}" stroke-width="1" stroke-dasharray="2,2" />
      <circle id="pcCrosshairDot" r="4" fill="${chartBg()}" stroke="#2f6fed" stroke-width="2" />
      <path id="pcCrosshairTagPath" fill="${CHART_TAG_BG}" />
      <text id="pcCrosshairTagText" text-anchor="start" font-size="20" font-weight="700" fill="${CHART_TAG_TEXT}"></text>
    </g>
  </svg>`;
}

// 차트를 누르고 있는 동안 가장 가까운 지점의 가격을 오른쪽 책갈피에 실시간으로 보여줌(증권앱 스타일)
// scalesFn: 라인 차트는 종가 기준(priceChartScales), 캔들 차트는 고가/저가까지 포함한 기준(priceChartScalesOhlc)을 써야 렌더링과 좌표가 일치함
function setupPriceChartCrosshair(containerEl, pairs, scalesFn = priceChartScales, symbol = null) {
  const chartCurrency = isKrTicker(symbol) ? "KRW" : "USD";
  const svg = containerEl.querySelector("svg");
  const hitArea = svg && svg.querySelector("#pcHitArea");
  if (!svg || !hitArea) return;
  const { ML, MT, PW, PH, N, xFn, yFn } = scalesFn(pairs);
  const crosshair = svg.querySelector("#pcCrosshair");
  const vLine = crosshair.querySelector("line");
  const hLine = svg.querySelector("#pcCrosshairHLine");
  const dot = svg.querySelector("#pcCrosshairDot");
  const tagPath = svg.querySelector("#pcCrosshairTagPath");
  const tagText = svg.querySelector("#pcCrosshairTagText");
  const currentMarker = svg.querySelector("#pcCurrentMarker");

  function indexFromClientX(clientX) {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * PRICE_CHART_GEOM.W;
    const idx = Math.round(((relX - ML) / PW) * (N - 1));
    return Math.max(0, Math.min(N - 1, idx));
  }

  function showAt(idx) {
    const x = xFn(idx);
    const y = yFn(pairs[idx].c);
    vLine.setAttribute("x1", x.toFixed(1));
    vLine.setAttribute("x2", x.toFixed(1));
    hLine.setAttribute("y1", y.toFixed(1));
    hLine.setAttribute("y2", y.toFixed(1));
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    tagPath.setAttribute("d", bookmarkTagPath(ML + PW, y));
    tagText.setAttribute("x", (ML + PW + PRICE_TAG_NOTCH + 8).toFixed(1));
    tagText.setAttribute("y", (y + 7).toFixed(1));
    tagText.textContent = fmtChartPrice(pairs[idx].c, chartCurrency);
    crosshair.style.display = "";
    currentMarker.style.display = "none";
  }
  function hide() {
    crosshair.style.display = "none";
    currentMarker.style.display = "";
  }

  // 2026-09-15 사용자 보고("누르고 있으면 1초마다 끊겨 현재가로 돌아감"): 휴대폰에서 길게 누르면 브라우저가 롱프레스·스크롤 제스처로
  // 판단해 pointercancel/pointerleave를 보내 크로스헤어가 꺼졌음 → 터치는 touch 이벤트로 직접 받고(preventDefault로 제스처 차단)
  // 손가락을 뗄 때(touchend)만 현재가로 복귀. 마우스는 기존처럼 pointer 이벤트.
  let touching = false;
  hitArea.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      touching = true;
      showAt(indexFromClientX(e.touches[0].clientX));
    },
    { passive: false }
  );
  hitArea.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (touching && e.touches.length) showAt(indexFromClientX(e.touches[0].clientX));
    },
    { passive: false }
  );
  hitArea.addEventListener("touchend", (e) => {
    if (e.touches.length) return;
    touching = false;
    hide();
  });
  hitArea.addEventListener("touchcancel", () => {
    touching = false;
    hide();
  });
  hitArea.addEventListener("contextmenu", (e) => e.preventDefault());

  let mouseDown = false;
  hitArea.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    mouseDown = true;
    showAt(indexFromClientX(e.clientX));
    hitArea.setPointerCapture(e.pointerId);
  });
  hitArea.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || !mouseDown) return;
    showAt(indexFromClientX(e.clientX));
  });
  const mouseEnd = (e) => {
    if (e.pointerType === "touch") return;
    mouseDown = false;
    hide();
  };
  hitArea.addEventListener("pointerup", mouseEnd);
  hitArea.addEventListener("pointercancel", mouseEnd);
}

let summaryChartCurrentSymbol = null;
let summaryChartCurrentPeriod = "1y";
let summaryChartCurrentPairs = null; // OHLC 캐시 — 라인↔캔들 전환 시 재조회 없이 즉시 다시 그리기 위함
let summaryChartMode = "line"; // "line" | "candle"

function renderSummaryChartPairs(pairs, period, symbol) {
  const containerEl = el("summaryChartContainer");
  if (summaryChartMode === "candle") {
    const candles = aggregateCandles(pairs); // 한 화면 약 20개
    containerEl.innerHTML = buildCandleChartSvg(candles, period, symbol);
    setupPriceChartCrosshair(containerEl, candles, priceChartScalesOhlc, symbol);
  } else {
    containerEl.innerHTML = buildPriceChartSvg(pairs, period, symbol);
    setupPriceChartCrosshair(containerEl, pairs, priceChartScales, symbol);
  }
}

async function runSummaryChart(symbol, period) {
  summaryChartCurrentSymbol = symbol;
  summaryChartCurrentPeriod = period;
  const statusEl = el("summaryChartStatus");
  statusEl.style.display = "block";
  statusEl.textContent = "차트를 불러오는 중...";
  try {
    const cfg = CHART_PERIOD_CONFIG[period] || CHART_PERIOD_CONFIG["1y"];
    const chart = await yahooChart(symbol, cfg.range, cfg.interval);
    if (summaryChartCurrentSymbol !== symbol) return; // 응답 도착 전 다른 종목으로 전환된 경우 무시
    const pairs = chartOhlcPairs(chart);
    if (pairs.length < 2) throw new Error("차트 데이터가 부족합니다.");
    statusEl.style.display = "none";
    summaryChartCurrentPairs = pairs;
    renderSummaryChartPairs(pairs, period, symbol);
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${err.message || "차트를 불러오지 못했습니다."}`;
  }
}
const summaryChartPeriodNav = el("summaryChartPeriodNav");
summaryChartPeriodNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-chart-period]");
  if (!btn || !summaryChartCurrentSymbol) return;
  Array.from(summaryChartPeriodNav.children).forEach((b) => b.classList.toggle("active", b === btn));
  runSummaryChart(summaryChartCurrentSymbol, btn.dataset.chartPeriod);
});

// ---------- 라인/캔들 차트 전환 버튼(단일 버튼이 클릭할 때마다 두 모드를 번갈아 전환) ----------
const CHART_TYPE_ICONS = {
  line: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,17 9,10 13,14 21,5"/></svg>`,
  candle: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.4"><line x1="6" y1="2" x2="6" y2="22"/><rect x="3.3" y="8" width="5.4" height="7" fill="currentColor" stroke="none"/><line x1="14" y1="2" x2="14" y2="12"/><rect x="11.3" y="5" width="5.4" height="9" fill="currentColor" stroke="none"/><line x1="20" y1="9" x2="20" y2="22"/><rect x="17.3" y="12" width="5.4" height="6" fill="currentColor" stroke="none"/></svg>`,
};
const summaryChartTypeBtn = el("summaryChartTypeBtn");
summaryChartTypeBtn.addEventListener("click", () => {
  if (!summaryChartCurrentPairs) return;
  const mode = summaryChartMode === "line" ? "candle" : "line";
  summaryChartMode = mode;
  summaryChartTypeBtn.dataset.chartType = mode;
  summaryChartTypeBtn.innerHTML = CHART_TYPE_ICONS[mode];
  summaryChartTypeBtn.setAttribute("aria-label", mode === "line" ? "라인 차트로 보는 중(눌러서 캔들로 전환)" : "캔들 차트로 보는 중(눌러서 라인으로 전환)");
  renderSummaryChartPairs(summaryChartCurrentPairs, summaryChartCurrentPeriod, summaryChartCurrentSymbol);
});

function buildFutureChartSvg(data, availWidth) {
  // 2026-10-10 사용자 요청: 미래예측은 "향후 6개월"만, 현재 시점을 0%의 중심점(출발점)으로 잡아 스크롤 없이 한눈에 보이게.
  //  · 가로: 지금(왼쪽 끝) → 6개월 뒤(오른쪽 끝)   · 세로: 현재 대비 변동률(현재 = 0%)
  //  · 회색선: 과거 같은 시기(향후 6개월) 흐름을 현재 기준으로 다시 맞춘 것   · 빨간 점선: 과거 평균 기울기로 추정한 예상
  // 데이터는 "6개월 전 ~ 6개월 뒤" 12개월 창(frac 0~1, 현재 = 0.5)이라, 현재(0.5) 값으로 나눠 다시 맞춘다.
  const wide = !availWidth || availWidth >= 560;
  const W = availWidth ? Math.min(780, Math.max(280, Math.round(availWidth))) : 360;
  const H = wide ? Math.round(W * 0.56) : Math.round(W * 0.92);
  const FS = wide ? 11 : 11; // 보조 글자
  const FSB = wide ? 12 : 12; // 강조 글자
  const ML = 40,
    MR = 16, // 그래프를 좌우로 최대한 넓게(예상 라벨은 아래 가로축에 적음)
    MT = 16,
    MB = 68; // 아래: 월 라벨 + (현재/예상) + 가격(+%)
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  // 12개월 창의 어느 지점(frac)에서의 값(pct)을 선형 보간
  const valueAt = (pts, f) => {
    if (!pts || !pts.length) return null;
    let prev = pts[0];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      if (p.frac >= f) {
        if (k === 0 || p.frac === f) return p.pct;
        const span = p.frac - prev.frac || 1;
        return prev.pct + ((p.pct - prev.pct) * (f - prev.frac)) / span;
      }
      prev = p;
    }
    return pts[pts.length - 1].pct;
  };
  // 창 시작 대비 %(pct)를 "현재(base) 대비 %"로
  const rebase = (pct, base) => ((100 + pct) / (100 + base) - 1) * 100;
  const rebasedSeries = (pts) => {
    const base = valueAt(pts, 0.5);
    if (base === null) return null;
    const out = [{ frac: 0, pct: 0 }];
    pts.forEach((p) => {
      if (p.frac > 0.5) out.push({ frac: (p.frac - 0.5) * 2, pct: rebase(p.pct, base) });
    });
    return out.length > 1 ? out : null;
  };

  const hist = data.historicalBuckets.map((s) => ({ year: s.year, pts: rebasedSeries(s.points) })).filter((s) => s.pts);
  const curBase = valueAt(data.currentBucket.points, 0.5) ?? data.currentBucket.points[data.currentBucket.points.length - 1].pct;
  const fEnd = rebase(data.forecast.endPct, curBase);

  const allPct = [0, fEnd];
  hist.forEach((s) => s.pts.forEach((p) => allPct.push(p.pct)));
  const { lo, hi, step } = niceAxisBounds(Math.min(...allPct), Math.max(...allPct));
  const xFn = (frac) => ML + frac * PW;
  const yFn = (val) => MT + (1 - (val - lo) / (hi - lo)) * PH;

  const dk = isDarkTheme();
  const FC_GRID = dk ? "#2a2e3a" : "#e6e8ee";
  const FC_VGRID = dk ? "#262a35" : "#eceef3";
  const FC_TXT = dk ? "#9aa3b2" : "#6b7280";
  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const zero = Math.abs(v) < 0.001;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="${zero ? "#e08a00" : FC_GRID}" stroke-width="${zero ? 1.6 : 1}" ${zero ? 'stroke-dasharray="5,4"' : ""} />`;
    gridSvg += `<text x="${ML - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="${FS}" fill="${zero ? "#e08a00" : FC_TXT}" font-weight="${zero ? "700" : "400"}">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }

  // 가로축: 지금 → +6개월(월 라벨). 좁으면 1개월 건너 표시
  let axisSvg = "";
  for (let m = 0; m <= 6; m++) {
    const x = xFn(m / 6);
    const labelDate = addMonths(data.axisMonthStart, 6 + m);
    const isNow = m === 0;
    const isEnd = m === 6;
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${isNow ? "#e08a00" : FC_VGRID}" stroke-width="${isNow ? 1.8 : 1}" ${isNow ? "" : 'stroke-dasharray="2,3"'} />`;
    if (!wide && m % 2 === 1 && m !== 6) continue;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="${isNow ? "start" : isEnd ? "end" : "middle"}" font-size="${FS}" fill="${isNow ? "#e08a00" : isEnd ? "#e5342f" : FC_TXT}" font-weight="${isNow || isEnd ? "700" : "400"}">${FUTURE_MONTH_NAMES_KO[labelDate.getMonth()]}</text>`;
  }
  axisSvg += `<text x="${ML}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="start" font-size="${FS}" fill="#e08a00" font-weight="700">(현재)</text>`;
  if (data.currentPrice !== null && data.currentPrice !== undefined) {
    axisSvg += `<text x="${ML}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="start" font-size="${FSB}" font-weight="800" fill="#e08a00">${escapeHtml(fmtPriceFull(data.currentPrice, data.currency))}</text>`;
  }

  if (data.forecast.price !== null && data.forecast.price !== undefined) {
    const ex = ML + PW + MR - 2;
    const pf = data.currentPrice ? (data.forecast.price / data.currentPrice - 1) * 100 : fEnd;
    axisSvg += `<text x="${ex}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="end" font-size="${FS}" fill="#e5342f" font-weight="700">(예상)</text>`;
    axisSvg += `<text x="${ex}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="end" font-size="${FSB}" font-weight="800" fill="#e5342f">${escapeHtml(fmtPriceFull(data.forecast.price, data.currency))}</text>`;
    axisSvg += `<text x="${ex}" y="${(MT + PH + 62).toFixed(1)}" text-anchor="end" font-size="${FS}" font-weight="700" fill="#e5342f">(${pf >= 0 ? "+" : ""}${pf.toFixed(1)}%)</text>`;
  }

  let linesSvg = "";
  hist.forEach((s, k) => {
    const palette = dk ? FUTURE_LINE_COLORS_DARK : FUTURE_LINE_COLORS;
    const color = palette[k % palette.length];
    linesSvg += `<path d="${pathFromPoints(s.pts, xFn, yFn)}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;
  });

  // 예상(빨간 점선): 현재(0%) → 6개월 뒤 예상
  const fx1 = xFn(1),
    fy1 = yFn(fEnd),
    fx0 = xFn(0),
    fy0 = yFn(0);
  linesSvg += `<line x1="${fx0.toFixed(1)}" y1="${fy0.toFixed(1)}" x2="${fx1.toFixed(1)}" y2="${fy1.toFixed(1)}" stroke="#e5342f" stroke-width="3" stroke-dasharray="7,6" stroke-linecap="round" />`;
  linesSvg += `<circle cx="${fx0.toFixed(1)}" cy="${fy0.toFixed(1)}" r="4.5" fill="#e08a00" stroke="${dk ? "#12141a" : "#fff"}" stroke-width="1.5" />`;
  linesSvg += `<circle cx="${fx1.toFixed(1)}" cy="${fy1.toFixed(1)}" r="3.6" fill="#e5342f" />`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(data.ticker)} 향후 6개월 미래예측 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${dk ? "#1c1f27" : "#fff"}" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
  </svg>`;
}

// 미래예측 차트를 보이는 폭에 맞춰 다시 그린다(미리 숨겨진 상태에서 그려지면 폭을 모르기 때문) — 펼칠 때·화면 폭이 바뀔 때 호출
let futureChartLastData = null;
let futureChartLastWidth = -1;
function refitFutureChart() {
  const box = el("futureChartContainer");
  if (!futureChartLastData || !box) return;
  const w = box.clientWidth;
  const svg = box.querySelector("svg");
  const drawn = svg ? parseFloat((svg.getAttribute("viewBox") || "0 0 0").split(" ")[2]) : 0;
  if (!w || Math.abs(w - drawn) < 4) return;
  futureChartLastWidth = w;
  box.innerHTML = buildFutureChartSvg(futureChartLastData, w);
  scrollChartToRight(box);
}
window.addEventListener("resize", () => refitFutureChart());
function renderFutureChart(data) {
  futureChartLastData = data;
  // 비교 그래프(매출액vs주가vs순이익)용 1년·5년·10년 탭과 제목은 이 그래프에선 쓰지 않으므로 숨김(2026-09-10)
  const cmpTabs = el("futureCmpTabs");
  if (cmpTabs) cmpTabs.style.display = "none";
  const cmpHeading = el("futureCmpHeading");
  if (cmpHeading) cmpHeading.style.display = "none";
  const fcBox = el("futureChartContainer");
  futureChartLastWidth = fcBox.clientWidth || -1;
  fcBox.innerHTML = buildFutureChartSvg(data, fcBox.clientWidth || 0);
  setTimeout(refitFutureChart, 50);
  setTimeout(refitFutureChart, 600);
  scrollChartToRight(el("futureChartContainer")); // 처음 열 때 가장 최근(오른쪽 끝)부터 보이게
  const yearsNote = data.historicalBuckets.length
    ? `회색: 과거 ${data.historicalBuckets.length}개년 같은 시기(향후 6개월) 흐름 · `
    : `과거 데이터가 부족해 계절성 비교 없이 최근 추세만 표시했습니다 · `;
  const baseNote = `${data.ticker} · 현재를 0%로 잡고 향후 6개월만 표시 · ${yearsNote}빨간 점선: ${data.hasForwardData ? "과거 그래프들의 처음→끝 평균으로 추정한 " : ""}향후 6개월 예상`;
  // 2026-10-09 사용자 요청: 맨 위에 "과거 N년 계절성 흐름 기울기 평균 / 결과: 6개월후 +46.2%", 그래프 아래엔 두 경고 문구를 하나로 합쳐 표시
  const titleEl = el("futureHeadlineTitle");
  const resultEl = el("futureHeadlineResult");
  if (titleEl) titleEl.textContent = data.historicalBuckets.length ? `과거 ${data.historicalBuckets.length}년 계절성 흐름 기울기 평균` : "최근 추세 기울기";
  if (resultEl) {
    if (data.currentPrice && data.forecast.price) {
      const pctFromToday = (data.forecast.price / data.currentPrice - 1) * 100;
      resultEl.innerHTML = `결과: 6개월후 <b class="${pctFromToday >= 0 ? "fh-up" : "fh-down"}">${pctFromToday >= 0 ? "+" : ""}${pctFromToday.toFixed(1)}%</b>`;
    } else {
      resultEl.textContent = "결과: 예상값을 계산할 수 없습니다";
    }
  }
  el("futureChartCaption").innerHTML = `<span style="color:var(--warn);font-weight:700;">*그래프 4개 편차가 심할 경우 예측과 다를 가능성이 높습니다. ⚠️ 예측 결과는 참고용이며, 실제 주가 흐름과 다를 수 있습니다.</span><br>${escapeHtml(baseNote)}`;
  el("futureResultsSection").style.display = "block"; // 전체화면 모달 대신 탭 화면 안에 그대로 이어붙여 표시
}

function setFutureStatus(type, message) {
  if (!message) {
    futureStatus.style.display = "none";
    return;
  }
  futureStatus.style.display = "block";
  futureStatus.className = `status-box ${type}`;
  futureStatus.innerHTML = type === "loading" ? `<span class="spinner"></span>${message}` : message;
}

// 미래예측 모달 상단(틀고정 헤더): 로고-한글이름-영어티커-연평균 상승/10년월간승률/거시경제(원형 점수)를 한 줄로 표시
// (2026-09-04 개편: 상승압력·투자안정 삭제 → 배치 DB의 10년평균상승률·10년월간승률로 교체)
async function renderFutureModalHeader(ticker, quote, metricsPromise, marketReturnsPromise) {
  const titleEl = el("futureChartModalTitle");
  const koName = TICKER_TO_KOREAN_NAME[ticker] || (quote && (quote.longname || quote.shortname)) || ticker;
  titleEl.innerHTML = `
    <span class="future-modal-identity">
      ${tickerLogoHtml(ticker)}
      <span class="future-modal-name">${escapeHtml(koName)}</span>
      <span class="future-modal-ticker">${escapeHtml(ticker)}</span>
    </span>
  `; // 2026-09-11 사용자 요청: 오른쪽 위 원판 3개(연평균 상승·10년월간승률·공포지수) 삭제
  try {
    const isKr = isKrTicker(ticker);
    const db = await getWinRateDb().catch(() => null);
    const wrMap = winRateMapForMode(db, ticker, "stock");
    const wrEntry = (wrMap && wrMap[ticker]) || null;
    const partialSfx = wrEntry && Number.isFinite(wrEntry.total) && wrEntry.total < partialMonthsFor(ticker) ? "⚠️" : "";
    const ret10 = wrEntry && Number.isFinite(wrEntry.ret10y) ? `${partialSfx}${Math.round(wrEntry.ret10y)}%` : "—";
    const wr10 = wrEntry && Number.isFinite(wrEntry.score) ? `${partialSfx}${Math.round(wrEntry.score)}%` : "—";
    let macroBadgeHtml;
    if (isKr) {
      const fomo = await getKrFomoMetrics().catch(() => ({ score: null }));
      macroBadgeHtml = `<span class="mini-score-circle small macro" title="KOSPI 공포지수"${fomoBgStyleAttr(fomo.score)}>${fomoDisplayValue(fomo.score)}</span>`;
    } else {
      const macroMetrics = await getMacroMetrics().catch(() => ({ vix: null }));
      const vix = macroMetrics.vix;
      macroBadgeHtml = `<span class="mini-score-circle small macro" title="S&P500 VIX"${scoreBgStyleAttr(vix, 10, 50, "fear")}>${vix !== null && vix !== undefined ? Math.round(vix) : "N/A"}</span>`;
    }
    // 원판 3개는 2026-09-11 사용자 요청으로 삭제 — 값 계산은 남겨두되(다른 곳에서 재사용 가능) 표시는 하지 않음
    void ret10;
    void wr10;
    void macroBadgeHtml;
  } catch {
    // 점수 계산이 실패해도 로고·이름·티커는 그대로 유지
  }
}

// 기업검색 요약 페이지의 "🔮 미래예측" 토글에서 현재 보고 있는 종목으로 바로 실행(별도 티커 입력 불필요)
// metricsPromise/marketReturnsPromise를 넘겨받으면 요약 탭의 상승압력도·투자 안정성 점수와 동일한 fetch를 재사용해
// 두 화면의 점수가 서로 어긋나지 않게 함(넘겨받지 못한 경우에만 이 함수가 직접 새로 fetch)
async function runFuturePrediction(ticker, metricsPromise, marketReturnsPromise, opts = {}) {
  setFutureStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];
    if (!quote) {
      throw new Error(
        isKrTicker(ticker)
          ? `'${ticker}' 티커를 찾을 수 없습니다. 거래정지·관리종목이거나 정확하지 않은 티커일 수 있습니다.`
          : `'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`
      );
    }
    const data = await computeFuturePrediction(ticker);
    renderFutureChart(data);

    // ETF·코인(2026-09-02): 점수 배지(주식 배점)와 투자안정 분포 통계(S&P500 주식 전용)는 생략하고
    // 4년 주기 예측 그래프 + 종목 식별 헤더만 표시
    if (opts.chartOnly) {
      const koName = (TICKER_TO_KOREAN_NAME[ticker] || (quote && (quote.longname || quote.shortname)) || ticker).replace(/\s+USD$/i, "");
      const isCoin = ticker.toUpperCase().includes("-USD");
      el("futureChartModalTitle").innerHTML = `
        <span class="future-modal-identity">
          ${isCoin ? cryptoLogoHtml(cryptoBaseTicker(ticker)) : tickerLogoHtml(ticker)}
          <span class="future-modal-name">${escapeHtml(koName)}</span>
          <span class="future-modal-ticker">${escapeHtml(ticker)}</span>
        </span>`;
      setFutureStatus(null, null);
      return;
    }

    const sharedMetricsPromise = metricsPromise || getFullMetrics(ticker);
    const sharedMarketReturnsPromise = marketReturnsPromise || getMarketReturns();
    renderFutureModalHeader(ticker, quote, sharedMetricsPromise, sharedMarketReturnsPromise);
    // 투자안정 점수별 분포도(renderFutureRiskSection)는 2026-09-04 투자안정 삭제와 함께 제거
    setFutureStatus(null, null);
  } catch (err) {
    setFutureStatus("error", `❌ ${escapeHtml(err.message || "예측 차트를 불러오지 못했습니다.")}`);
  }
}

// ---------- 뒤로가기 처리(2026-09-09 사용자 요청: 앱에서 뒤로가기를 누르면 앱이 바로 꺼지던 문제) ----------
// 원리: 부팅 때 히스토리에 "가드" 항목을 하나 얹어 둔다. 뒤로가기(popstate)가 오면
//  ① 열려 있는 모달·시트·패널이 있으면 맨 위 것 하나만 닫고, 방금 떠난 항목을 다시 얹어(가드 유지) 다음 뒤로가기도 받는다.
//  ② 주소에 ?ticker=가 있으면 그 상세를 연다(앞으로가기 포함). 없으면 열린 상세를 닫는다.
//  ③ 열린 게 하나도 없고 맨 처음 항목까지 왔으면 "한 번 더 누르면 종료" 토스트를 띄우고 가드를 다시 얹는다.
//     2초 안에 다시 누르면 history.back()으로 실제 종료(앱은 닫히고, 브라우저는 이전 사이트로).
const BACK_OVERLAYS = [
  // 위에 뜨는 것부터 — 열려 있는 첫 항목 하나만 닫음
  { id: "ovFrame", close: () => closeOvFrame() }, // 지도 관심목록 겹침 창(2026-10-21)
  { id: "chartModal", close: () => closeChartModal() },
  { id: "wlGroupPickSheet", close: () => closeWlGroupPickSheet() },
  { id: "groundModal", close: () => closeGroundModal() },
  { id: "shareSheet", close: () => closeShareSheet() },
  { id: "calendarDayModal", close: () => closeCalendarDayModal() },
  { id: "searchOverlay", close: () => closeSearchOverlay() },
  { id: "morePanel", close: () => closeMorePanel() },
  { id: "searchWizardPanel", close: () => closeSearchWizard() },
  { id: "calendarPanel", close: () => closeCalendarPanel() },
];
let backHistCur = { state: null, url: location.href }; // 마지막으로 머물던 히스토리 항목(닫기 뒤 다시 얹기 위해)
function backTrackHistory() {
  try {
    backHistCur = { state: history.state, url: location.href };
  } catch {}
}
let backExitArmedAt = 0;
function backOverlayOpen(id) {
  const e = document.getElementById(id);
  if (!e) return false;
  if (e.classList.contains("open")) return true;
  const d = e.style.display;
  return d !== "" && d !== "none" && !e.classList.contains("closing");
}
function backTopOverlay() {
  for (const o of BACK_OVERLAYS) if (backOverlayOpen(o.id)) return o;
  // 목록에 없는 모달(공지사항·앱 정보 등 .chart-modal 계열)도 뒤로가기로 닫히게 — 화면에 보이는 것 중 첫 번째
  const anyModal = [...document.querySelectorAll(".chart-modal")].find((m) => m.style.display && m.style.display !== "none");
  if (anyModal) return { id: anyModal.id, close: () => (anyModal.style.display = "none") };
  return null;
}
function backPushGuard() {
  history.pushState({ mmGuard: true }, "", location.href);
  backHistCur = { state: history.state, url: location.href };
}
function handleBackNavigation() {
  const left = backHistCur; // 방금 떠난 항목
  const top = backTopOverlay();
  if (top) {
    try {
      top.close();
    } catch {}
    // 떠난 항목을 그대로 다시 얹어 상세(?ticker=)·가드가 유지되게
    history.pushState(left.state, "", left.url);
    backHistCur = { state: history.state, url: location.href };
    return;
  }
  const ticker = new URLSearchParams(location.search).get("ticker");
  // 2026-10-20: 지도 등 다른 화면에서 링크로 열린 상세 — 가드를 걷어낸 뒤 시작 항목(mmRoot)에 닿으면 한 번 더 뒤로 가서 온 곳으로 보냄
  if (ticker && window.__landedOnDetail && history.state && history.state.mmRoot && !history.state.fromApp) {
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (internal) {
      history.back();
      return;
    }
  }
  if (ticker) {
    const panelOpen = companyPanel.style.display !== "none" && companyPanel.style.display !== "";
    if (!(panelOpen && currentDetailSymbol && currentDetailSymbol.toUpperCase() === ticker.toUpperCase())) navigateToTicker(ticker, { push: false });
    backHistCur = { state: history.state, url: location.href };
    return;
  }
  if (companyPanel.style.display !== "none" && companyPanel.style.display !== "") {
    closeCompanyPanel({ push: false });
    backHistCur = { state: history.state, url: location.href };
    if (!(history.state && history.state.mmGuard)) backPushGuard();
    return;
  }
  // 여기까지 왔으면 화면에 열린 게 없음 — 맨 처음 항목이면 종료 확인
  if (!(history.state && history.state.mmGuard)) {
    if (Date.now() - backExitArmedAt < 2000) {
      // 두 번째 뒤로가기: 실제로 나감(가드 없이 한 항목 더 뒤로)
      history.back();
      return;
    }
    backExitArmedAt = Date.now();
    showToast("한 번 더 누르면 종료됩니다");
    backPushGuard();
    return;
  }
  backHistCur = { state: history.state, url: location.href };
}
// 부팅: 현재 항목을 "시작"으로 표시하고 그 위에 가드를 얹음(딥링크 ?ticker=·?open= 처리 뒤 주소 기준)
setTimeout(() => {
  try {
    history.replaceState(Object.assign({}, history.state || {}, { mmRoot: true }), "", location.href);
    backPushGuard();
  } catch {}
}, 0);

// ---------- 미래예측(2026-09-09 사용자 요청): 매출액 vs 주가 vs 순이익 — 1년·5년·10년 3장(한 번에 한 장) ----------
// 세 시리즈 모두 "시작점 = 0%"로 맞춘 선형(퍼센트 변화) 그래프. 주가는 월봉 종가, 매출액·순이익은 1년은 분기 실적(최근 5개 분기),
// 5년·10년은 연간(회계연도) 실적. 연간 10년치는 배치 파일(data/us-annual-financials.json = SEC XBRL, data/kr-annual-financials.json = DART)에서
// 읽고, 없으면 Yahoo fundamentals(최근 4년)로 폴백. ETF·코인은 재무가 없어 주가만 그림.
const FUTURE_CMP_SPANS = { "1y": { label: "1년", years: 1 }, "5y": { label: "5년", years: 5 }, "10y": { label: "10년", years: 10 } };
const FUTURE_CMP_COLORS = { price: "#e5342f", rev: "#2f6fed", ni: "#16a34a" };
let futureCmpData = null;
let futureCmpSpan = "1y";
const annualFinDbCache = {};
function getAnnualFinDb(isKr) {
  const key = isKr ? "kr" : "us";
  if (!annualFinDbCache[key]) {
    annualFinDbCache[key] = fetch(`data/${key}-annual-financials.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return annualFinDbCache[key];
}
function futureCmpSeriesPct(points, key) {
  const pts = points.filter((p) => Number.isFinite(p[key]));
  if (pts.length < 2) return { pts: [], note: pts.length ? "값이 1개뿐" : "데이터 없음" };
  const base = pts[0][key];
  if (base <= 0) return { pts: [], note: "시작 시점 값이 0 이하(적자)라 % 변화를 그릴 수 없음" };
  return { pts: pts.map((p) => ({ t: p.t, pct: (p[key] / base - 1) * 100, v: p[key] })), note: "" };
}
function buildFutureCompareSvg(d, span) {
  const spec = FUTURE_CMP_SPANS[span];
  const isQuarter = span === "1y";
  let fin = d.chartOnly ? [] : isQuarter ? d.quarterly.slice(-5) : d.annual.slice(-(spec.years + 1));
  const nowT = d.price[d.price.length - 1].t;
  const wantStart = nowT - spec.years * 365.25 * 86400;
  // 재무 데이터가 있으면 그 첫 시점을 시작점으로, 없으면 기간 시작. 상장 전 재무는 잘라냄
  const firstPriceT = d.price[0].t;
  fin = fin.filter((f) => f.t >= firstPriceT - 45 * 86400);
  let startT = fin.length ? fin[0].t : wantStart;
  if (startT < firstPriceT) startT = firstPriceT;
  let priceWin = d.price.filter((p) => p.t >= startT - 20 * 86400);
  if (priceWin.length < 2) priceWin = d.price.slice(-2);
  const priceBase = priceWin[0].c;
  const pricePts = priceWin.map((p) => ({ t: p.t, pct: (p.c / priceBase - 1) * 100, v: p.c }));
  const rev = futureCmpSeriesPct(fin, "rev");
  const ni = futureCmpSeriesPct(fin, "ni");
  const x0 = Math.min(startT, pricePts[0].t);
  const x1 = Math.max(nowT, ...(fin.length ? [fin[fin.length - 1].t] : []));
  const allPct = [0, ...pricePts.map((p) => p.pct), ...rev.pts.map((p) => p.pct), ...ni.pts.map((p) => p.pct)];
  const { lo, hi, step } = niceAxisBounds(Math.min(...allPct), Math.max(...allPct));

  const W = 780, H = 420, ML = 56, MR = 96, MT = 20, MB = 44;
  const PW = W - ML - MR, PH = H - MT - MB;
  const xFn = (t) => ML + ((t - x0) / Math.max(1, x1 - x0)) * PW;
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo || 1)) * PH;
  const axisText = chartAxisText();
  const grid = chartGrid();
  let g = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const zero = Math.abs(v) < 0.001;
    g += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="${zero ? "#8a90a3" : grid}" stroke-width="${zero ? 1.4 : 1}" />`;
    g += `<text x="${ML - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${axisText}">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }
  // x축 라벨: 재무 시점(연도 또는 분기) + 현재
  let ax = "";
  const labelOf = (t) => {
    const dt = new Date(t * 1000);
    return isQuarter ? `${String(dt.getUTCFullYear()).slice(2)}.${String(dt.getUTCMonth() + 1).padStart(2, "0")}` : String(dt.getUTCFullYear());
  };
  const ticks = fin.length ? fin.map((f) => f.t) : (() => {
    const arr = [];
    for (let k = spec.years; k >= 0; k--) arr.push(nowT - k * 365.25 * 86400);
    return arr;
  })();
  ticks.forEach((t) => {
    const x = xFn(t);
    ax += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${grid}" stroke-width="1" stroke-dasharray="3,4" />`;
    ax += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${axisText}">${labelOf(t)}</text>`;
  });
  ax += `<line x1="${xFn(nowT).toFixed(1)}" y1="${MT}" x2="${xFn(nowT).toFixed(1)}" y2="${MT + PH}" stroke="#f5a623" stroke-width="1.4" />`;
  ax += `<text x="${xFn(nowT).toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#f5a623">현재</text>`;

  const line = (pts, color, width, dots) => {
    if (!pts.length) return "";
    let s = `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${xFn(p.t).toFixed(1)} ${yFn(p.pct).toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" />`;
    if (dots) pts.forEach((p) => (s += `<circle cx="${xFn(p.t).toFixed(1)}" cy="${yFn(p.pct).toFixed(1)}" r="3.4" fill="${color}" />`));
    const last = pts[pts.length - 1];
    s += `<text x="${(xFn(last.t) + 7).toFixed(1)}" y="${(yFn(last.pct) + 4).toFixed(1)}" font-size="12" font-weight="800" fill="${color}">${last.pct > 0 ? "+" : ""}${Math.round(last.pct)}%</text>`;
    return s;
  };
  let lines = line(rev.pts, FUTURE_CMP_COLORS.rev, 2.4, true) + line(ni.pts, FUTURE_CMP_COLORS.ni, 2.4, true) + line(pricePts, FUTURE_CMP_COLORS.price, 2.8, false);
  // 시작점(0%) 공통 표시
  lines += `<circle cx="${xFn(Math.min(...[pricePts[0].t, ...(rev.pts[0] ? [rev.pts[0].t] : []), ...(ni.pts[0] ? [ni.pts[0].t] : [])])).toFixed(1)}" cy="${yFn(0).toFixed(1)}" r="4.5" fill="none" stroke="#f5a623" stroke-width="2" />`;

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(d.ticker)} ${spec.label} 매출액 vs 주가 vs 순이익">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${chartBg()}" />
    ${g}${ax}${lines}
  </svg>`;
  const endPct = (pts) => (pts.length ? pts[pts.length - 1].pct : null);
  const firstV = (pts) => (pts.length ? pts[0].v : null);
  const lastV = (pts) => (pts.length ? pts[pts.length - 1].v : null);
  // 재무 구간 중 최저점(씨게이트처럼 중간에 급감 후 회복한 종목은 "시작 대비 %"만으로는 최근 급증이 안 보임)
  const troughOf = (pts) => {
    if (pts.length < 3) return null;
    let min = pts[0];
    for (const p of pts) if (p.v < min.v) min = p;
    return min === pts[0] || min === pts[pts.length - 1] ? null : min;
  };
  return {
    svg,
    startT: Math.min(pricePts[0].t, ...(fin.length ? [fin[0].t] : [])),
    price: endPct(pricePts),
    rev: endPct(rev.pts),
    ni: endPct(ni.pts),
    priceFrom: firstV(pricePts),
    priceTo: lastV(pricePts),
    revFrom: firstV(rev.pts),
    revTo: lastV(rev.pts),
    niFrom: firstV(ni.pts),
    niTo: lastV(ni.pts),
    revTrough: troughOf(rev.pts),
    revNote: rev.note,
    niNote: ni.note,
    finCount: fin.length,
    isQuarter,
  };
}
function renderFutureCompare() {
  const d = futureCmpData;
  if (!d) return;
  const spec = FUTURE_CMP_SPANS[futureCmpSpan];
  const r = buildFutureCompareSvg(d, futureCmpSpan);
  el("futureChartContainer").innerHTML = r.svg;
  scrollChartToRight(el("futureChartContainer"));
  const heading = el("futureCmpHeading");
  if (heading) heading.textContent = `📈 ${spec.label} — 매출액 vs 주가 vs 순이익`;
  document.querySelectorAll("#futureCmpTabs .future-cmp-tab").forEach((b) => b.classList.toggle("active", b.dataset.futureSpan === futureCmpSpan));
  const fmtEnd = (v) => (v === null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v)}%`);
  const startStr = new Date(r.startT * 1000).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  // 퍼센트 옆에 실제 금액(시작 → 현재)을 같이 보여줌 — 시작 시점이 높았던 종목(씨게이트 등)에서
  // "매출이 크게 늘었는데 +13%"처럼 보이는 혼동을 막기 위함(2026-09-09 사용자 보고)
  const amt = (v) => fmtAmountUnified(v, d.currency);
  const pair = (from, to, fmt) => (from === null || to === null ? "" : ` <span class="future-cmp-abs">(${fmt(from)} → ${fmt(to)})</span>`);
  const legend = `<span class="future-cmp-legend">
      <span style="color:${FUTURE_CMP_COLORS.price};">주가 ${fmtEnd(r.price)}${pair(r.priceFrom, r.priceTo, (v) => fmtPriceFull(v, d.currency))}</span>
      ${d.chartOnly ? "" : `<span style="color:${FUTURE_CMP_COLORS.rev};">매출액 ${fmtEnd(r.rev)}${pair(r.revFrom, r.revTo, amt)}</span><span style="color:${FUTURE_CMP_COLORS.ni};">순이익 ${fmtEnd(r.ni)}${pair(r.niFrom, r.niTo, amt)}</span>`}
    </span>`;
  const notes = [];
  if (d.chartOnly) notes.push("ETF·코인은 매출액·순이익이 없어 주가 흐름만 표시합니다.");
  else {
    notes.push(`매출액·순이익은 ${r.isQuarter ? "분기 실적(최근 " + r.finCount + "개 분기)" : "회계연도 실적(" + r.finCount + "개년, 회계연도 말 기준)"} · 출처 ${escapeHtml(r.isQuarter ? d.quarterSource : d.source)}, 주가는 월봉 종가.`);
    // 회계연도는 당해년도가 아직 안 끝나 10년 창에 10개년(FY t-10 ~ t-1)이 정상 — 그보다 적을 때만 경고
    if (!r.isQuarter && r.finCount < spec.years) {
      notes.push(
        d.hasAnnualDb
          ? `⚠️ 이 종목은 재무 데이터가 ${r.finCount}개년만 있어 그만큼만 그렸습니다(상장 ${spec.label} 미만이거나 공시 누락).`
          : `⚠️ 이 종목은 아직 10년 재무 배치에 없어 Yahoo가 제공하는 최근 ${r.finCount}개년만 그렸습니다(배치가 갱신되면 자동으로 늘어납니다).`
      );
    }
    if (r.isQuarter && r.finCount < 3) notes.push(`⚠️ 분기 실적이 ${r.finCount}개뿐이라 그만큼만 그렸습니다.`);
    if (r.revTrough) {
      const tStr = new Date(r.revTrough.t * 1000).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
      notes.push(`매출액은 중간에 ${tStr} ${fmtAmountUnified(r.revTrough.v, d.currency)}까지 줄었다가 회복했습니다 — 저점 대비로는 ${Math.round((r.revTo / r.revTrough.v - 1) * 100)}% 늘었고, 위 %는 어디까지나 시작 시점 대비입니다.`);
    }
    if (r.revNote) notes.push(`매출액 선 생략: ${r.revNote}.`);
    if (r.niNote) notes.push(`순이익 선 생략: ${r.niNote}.`);
  }
  el("futureChartCaption").innerHTML = `${legend}<span style="color:var(--warn);font-weight:700;">*시작점(${escapeHtml(startStr)})을 0%로 맞춘 선형 변화율 그래프 — 세 선의 출발점이 같습니다.</span><br>${notes.map(escapeHtml).join(" ")}<br>참고용이며 투자 자문이 아닙니다.`;
  el("futureResultsSection").style.display = "block";
}
(function bindFutureCmpTabs() {
  const tabs = el("futureCmpTabs");
  if (!tabs) return;
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-future-span]");
    if (!b || !FUTURE_CMP_SPANS[b.dataset.futureSpan]) return;
    futureCmpSpan = b.dataset.futureSpan;
    renderFutureCompare();
  });
})();
// 위험/주의/양호 공통 기준(2026-09-21 사용자 지정): 변화율이 -20% 이하면 위험, 마이너스면 주의, 0 이상이면 양호.
// 부채비율처럼 "오를수록 나쁜" 지표는 부호를 뒤집어 같은 기준을 적용하고, 유상증자·전환사채는 시총 대비 비율로 본다.
const RISK_DANGER_PCT = 20;
let usWorkforcePromise = null;
function getUsWorkforceData() {
  if (!usWorkforcePromise) {
    usWorkforcePromise = fetch("data/us-workforce.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return usWorkforcePromise;
}
function riskBasisHtml(from, to, note) {
  if (!from || !to) return "";
  return `<div class="risk-card-basis">기준 ${escapeHtml(from)} → ${escapeHtml(to)}${note ? ` <span class="muted">(${escapeHtml(note)})</span>` : ""}</div>`;
}
// 두 시장 데이터를 같은 모양으로 맞춤
async function loadRiskDataset(isKr) {
  if (isKr) {
    const data = await getDartFinancialsData();
    return {
      items: ((data && data.items) || []).map((r) => {
        const cur = r.recent || null;
        const prev = r.recentPrev || null;
        const useRecent = cur && prev;
        return {
          symbol: r.symbol,
          name: r.corpName || r.symbol,
          pay: useRecent ? cur.avgSalary : r.avgSalary,
          payPrev: useRecent ? prev.avgSalary : r.avgSalaryPrevYear,
          payFrom: useRecent ? prev.periodLabel : data && data.dataYear ? `${data.dataYear - 1}년 1~12월` : "",
          payTo: useRecent ? cur.periodLabel : data && data.dataYear ? `${data.dataYear}년 1~12월` : "",
          payNote: useRecent ? cur.reportLabel : data && data.dataYear ? `${data.dataYear}년 사업보고서` : "",
          headcount: useRecent ? cur.headcount : r.headcount,
          headcountPrev: useRecent ? prev.headcount : r.headcountPrevYear,
          headFrom: useRecent ? prev.stlmDt : data && data.dataYear ? `${data.dataYear - 1}-12-31` : "",
          headTo: useRecent ? cur.stlmDt : data && data.dataYear ? `${data.dataYear}-12-31` : "",
          headNote: useRecent ? cur.reportLabel : data && data.dataYear ? `${data.dataYear}년 사업보고서` : "",
          issuance: r.issuance || null,
          eps: r.eps || null,
          quarter: r.quarter || null,
          debt: r.debt || null,
          sector: r.sector || null,
          crash: r.crash || null,
        };
      }),
      hasIssuance: true,
      payLabel: "1인 평균 급여",
      fmtPay: (v) => `${Math.round(v / 10000).toLocaleString()}만원`,
      source: "출처: DART 전자공시 정기보고서 임직원 현황 · 종목마다 최신 보고서가 달라 기준일이 다를 수 있음",
    };
  }
  const data = await getUsWorkforceData();
  return {
    items: Object.entries((data && data.items) || {}).map(([sym, r]) => ({
      symbol: sym,
      name: TICKER_TO_KOREAN_NAME[sym] || r.name || sym,
      pay: r.medianPay,
      payPrev: r.medianPayPrevYear,
      payFrom: r.medianPayPrevFiled ? `${r.medianPayPrevFiled} 제출` : "",
      payTo: r.medianPayFiled ? `${r.medianPayFiled} 제출` : "",
      payNote: "위임장, 직전 회계연도",
      headcount: r.headcount,
      headcountPrev: r.headcountPrevYear,
      headFrom: r.headcountPrevPeriod || "",
      headTo: r.headcountPeriod || "",
      headNote: "연차보고서(10-K)",
      issuance: r.issuance || null,
      eps: r.eps || null,
      quarter: r.quarter || null,
      debt: r.debt || null,
      sector: r.sector || null,
      crash: r.crash || null,
    })),
    hasIssuance: true,
    payLabel: "직원 중위 연봉",
    fmtPay: (v) => `$${Math.round(v).toLocaleString()}`,
    source: "출처: SEC EDGAR — 직원 수는 연차보고서(10-K) 인적자원 항목 · 1년에 한 번 공시라 분기 비교가 없음",
  };
}
function riskDeltaCls(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "";
  return v > 0 ? "risk-delta up" : v < 0 ? "risk-delta down" : "risk-delta";
}
function riskFmtPct(p) {
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
}
function riskRankListHtml(rows, cellFn, currentSymbol) {
  return `<ol class="risk-rank-list">${rows
    .map(
      (r, i) => `<li class="risk-rank-row${r.symbol === currentSymbol ? " is-self" : ""}" data-risk-ticker="${escapeHtml(r.symbol)}">
        <span class="risk-rank-no">${i + 1}</span>
        <span class="risk-rank-name">${escapeHtml(r.name)}</span>
        ${cellFn(r)}
      </li>`
    )
    .join("")}</ol>`;
}
// ---------- 리스크 항목별 그래프(2026-09-21 사용자 요청) ----------
// 글로만 적던 상세를 항목 성격에 맞는 그림으로 바꾼다.
//  · 임금·인원: 전후 막대(작년 값 → 올해 값)
//  · 유상증자·전환사채: 시가총액 중 조달액이 차지하는 비중 막대
//  · EPS: 같은 기간 EPS 변화율과 주가 변화율을 0 기준 좌우 막대로 비교
//  · 매출액·순이익·급락률: 전체 종목 분포(히스토그램) 위에 이 종목 위치 표시
//  · 부채비율: 순위를 백분위 게이지로
//  · 섹터 매출: 섹터별 성장률 막대(내 섹터 강조)
// 색은 앱 공통 등락색(--pos/--neg)을 따르고, 기준선·눈금은 --border/--muted로 눌러 둔다.
const RISK_CHART_W = 300;

function riskSvgWrap(height, inner, label) {
  return `<svg class="risk-chart" viewBox="0 0 ${RISK_CHART_W} ${height}" width="100%" height="${height}" role="img" aria-label="${escapeHtml(label)}">${inner}</svg>`;
}

// 분포 + 내 위치 — 전체 종목이 어디에 몰려 있고 이 종목이 어디인지
function riskDistributionChart(values, mine, fmt) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 10 || !Number.isFinite(mine)) return "";
  const sorted = [...nums].sort((a, b) => a - b);
  // 양 끝 2%는 축을 늘려 그림을 망가뜨리므로 잘라내고, 이 종목이 그 밖이면 끝에 붙여 표시
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = hi - lo || 1;
  const bins = 18;
  const counts = new Array(bins).fill(0);
  nums.forEach((v) => {
    const i = Math.max(0, Math.min(bins - 1, Math.floor(((v - lo) / span) * bins)));
    counts[i]++;
  });
  const peak = Math.max(...counts) || 1;
  const bw = 260 / bins;
  const myX = 20 + Math.max(0, Math.min(1, (mine - lo) / span)) * 260;
  const bars = counts
    .map((c, i) => {
      const h = Math.max(2, (c / peak) * 54);
      const x = 20 + i * bw;
      const isMine = myX >= x && myX < x + bw;
      return `<rect x="${(x + 1).toFixed(1)}" y="${(64 - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${
        isMine ? "var(--neg)" : "var(--border)"
      }"/>`;
    })
    .join("");
  const inner = `${bars}
    <line x1="20" y1="64" x2="280" y2="64" stroke="var(--border)"/>
    <line x1="${myX.toFixed(1)}" y1="6" x2="${myX.toFixed(1)}" y2="66" stroke="var(--neg)" stroke-width="2"/>
    <text x="${Math.max(30, Math.min(270, myX)).toFixed(1)}" y="4" class="risk-chart-value" text-anchor="middle">${escapeHtml(fmt(mine))}</text>
    <text x="20" y="78" class="risk-chart-label">${escapeHtml(fmt(lo))}</text>
    <text x="280" y="78" class="risk-chart-label" text-anchor="end">${escapeHtml(fmt(hi))}</text>`;
  return riskSvgWrap(82, inner, `전체 분포에서 이 종목은 ${fmt(mine)}`);
}

// ====================== 투자분석(2026-10-06 사용자 요청) ======================
// 상단 둘째 탭. 투자처(한국주식·미국주식·ETF·비트코인)마다 투자방법 5~6개와 내가 만든 포트폴리오(파란 선)를
// 시작=100 수익 지수로 한 그래프에 겹쳐 그리고, 아래에 투자방법별 구성종목(기업명·현재가·비중, 비중 높은 순 10개 → +더보기 30개)을 보여준다.
// · 1년·5년·최대(10년): 배치(scripts/build-invest-analysis.py → data/invest-analysis.json)가 미리 계산한 지수
// · 1일·1주·1달: 지수형은 지수 시세 하나, 바구니형은 비중 상위 10종목 시세로 실시간 계산
// · 내 포트폴리오: 모든 기간을 실시간 계산 — 상장 10년 미만 종목은 시세가 생긴 때부터 더해진다
let investAnalysisDbPromise = null;
const iaChartCache = new Map();
const iaRangeCache = new Map();
const iaQuoteCache = new Map();

function investAnalysisResetCaches() {
  iaChartCache.clear();
  iaRangeCache.clear();
  iaQuoteCache.clear();
  investAnalysisDbPromise = null;
}
// 재무정보 '분기' 그래프와 같은 데이터(네이버 분기+컨센서스 / 야후 분기+추세 예상)로
// 예정 종목: 다음 분기 예상 매출의 직전 분기 대비 %, 발표 종목: 발표 전 예상(그 분기를 빼고 다시 낸 추세 예상) vs 실제(직전 분기 대비)
const earnQCache = new Map();
function earnQuarterData(sym) {
  if (!earnQCache.has(sym)) earnQCache.set(sym, loadFin2QuarterLive(sym, isKrTicker(sym) ? "KRW" : "USD").catch(() => null));
  return earnQCache.get(sym);
}
function earnQuarterEnd(label) {
  const m = String(label || "").match(/^(\d{2})\.(\d)Q/);
  return m ? new Date(2000 + Number(m[1]), Number(m[2]) * 3, 0) : null;
}
function earnRevNumbers(data, row, kind) {
  if (!data || !data.bars) return null;
  if (data.compare) {
    // 비교 그래프와 같은 값(예상 막대 · 실제 막대의 직전 분기 대비)
    const exp = data.bars.find((b) => b.est && !b.nextEst);
    const act = data.bars.find((b) => !b.est && b.prelim);
    return { exp: exp ? exp.growth : null, act: act ? act.growth : null };
  }
  const actual = data.bars.filter((b) => !b.est);
  const estBar = data.bars.find((b) => b.est);
  const last = actual[actual.length - 1];
  if (kind === "soon") return { exp: estBar && Number.isFinite(estBar.growth) ? estBar.growth : null };
  // 발표 당일 값(2026-10-08): 미국 야후 실적 요약 · 한국 DART 잠정실적 본문의 매출 직전 분기 대비 — 분기 재무는 몇 주 늦게 바뀐다
  const ce = earningsEntry(row.symbol);
  const rep = ce && ce.rep && ce.rep.date === row.date && Number.isFinite(ce.rep.qoq) ? ce.rep : null;
  const qEnd = last && earnQuarterEnd(last.label);
  // 발표일 직전에 끝난 분기가 데이터에 들어와 있어야 '발표' 값 — 아니면 아직 반영 전(10/7 잠정실적인데 데이터는 2분기까지인 경우)
  const rel = new Date(row.date + "T00:00:00");
  const due = new Date(rel.getFullYear(), Math.floor(rel.getMonth() / 3) * 3, 0); // 발표일 이전 마지막 분기말
  const stale = !qEnd || qEnd < due;
  // 분기 재무가 아직 옛 분기면: 그 '다음 분기 예상'이 곧 이번 발표의 예상치, 실제는 발표 당일 값
  if (stale) return { exp: estBar && Number.isFinite(estBar.growth) ? estBar.growth : null, act: rep ? rep.qoq : null, stale: !rep };
  const before = actual.slice(0, -1);
  const prevRev = before.length ? before[before.length - 1].rev : null;
  const expRev = before.length >= 2 ? projectNextQuarter(before, "rev") : null;
  return {
    exp: Number.isFinite(expRev) && prevRev > 0 ? (expRev / prevRev - 1) * 100 : null,
    act: Number.isFinite(last.growth) ? last.growth : null,
    qLabel: last.label,
  };
}
function earnPctHtml(v, word, cls) {
  if (!Number.isFinite(v)) return `<span class="${cls} muted">- ${word}</span>`;
  return `<span class="${cls} ${v >= 0 ? "wl-up" : "wl-down"}">${v >= 0 ? "+" : ""}${v.toFixed(1)}% <small>${word}</small></span>`;
}
// 발표 종목 비교 그래프: 직전 분기들 + [그 분기 예상] + [그 분기 실제] — 예상은 발표 전 기준(분기 재무가 옛 분기면 그 '다음 분기 예상',
// 이미 들어왔으면 그 분기를 빼고 다시 낸 추세 예상), 실제는 분기 재무 또는 발표 당일 값
const earnRawQCache = new Map();
// 한국 대형주는 잠정실적 공정공시에 순이익이 없는 경우가 많다(삼성전자·LG전자·삼성바이오 등) — 네이버 분기 재무에 그 분기 '확정 실적'이 올라오면 거기서 순이익을 가져온다
async function krActualNiFor(sym, label) {
  if (!isKrTicker(sym)) return null;
  try {
    const all = await fetchNaverQuarterlyFinance(sym);
    const q = all.find((x) => !x.isConsensus && fin2QuarterLabel(Number(x.key.slice(0, 4)), Number(x.key.slice(4, 6))) === label && Number.isFinite(x.net));
    return q ? q.net : null;
  } catch {
    return null;
  }
}
async function earnCompareData(sym, rowDate) {
  const cur = isKrTicker(sym) ? "KRW" : "USD";
  if (!earnRawQCache.has(sym)) earnRawQCache.set(sym, loadFin2Quarter(sym, cur).catch(() => null));
  const raw = await earnRawQCache.get(sym);
  if (!raw || !raw.bars) return null;
  await getEarningsCal();
  const e = earningsEntry(sym);
  const rep = e && e.rep && e.rep.date === rowDate && Number.isFinite(e.rep.rev) ? e.rep : null;
  const actual = raw.bars.filter((b) => !b.est).map(({ growth, ...b }) => b);
  const estBar = raw.bars.find((b) => b.est);
  const rel = new Date(rowDate + "T00:00:00");
  const due = new Date(rel.getFullYear(), Math.floor(rel.getMonth() / 3) * 3, 0);
  const last = actual[actual.length - 1];
  const lastEnd = last && earnQuarterEnd(last.label);
  let before, exp, act;
  if (lastEnd && lastEnd >= due) {
    before = actual.slice(0, -1);
    act = last;
    const er = before.length >= 2 ? projectNextQuarter(before, "rev") : null;
    exp = Number.isFinite(er) ? { label: last.label, rev: er, ni: projectNextNetIncome(before, er), est: true } : null;
  } else {
    if (!rep || !estBar) return null;
    before = actual;
    exp = { label: estBar.label, rev: estBar.rev, ni: estBar.ni, est: true };
    act = { label: estBar.label, rev: rep.rev, ni: Number.isFinite(rep.ni) ? rep.ni : await krActualNiFor(sym, estBar.label), est: false, prelim: rep.src === "잠정" ? "잠정" : "실제" };
  }
  if (!exp || !act) return null;
  const prev = before.slice(-3);
  const base = before.length ? before[before.length - 1].rev : null;
  const prevG = fin2WithGrowth(prev, before.length > 3 ? before[before.length - 4].rev : null);
  const [expG] = fin2WithGrowth([exp], base);
  const [actG] = fin2WithGrowth([{ ...act, prelim: act.prelim || "실제" }], base);
  // 2026-10-08 사용자 요청: 이전 3개 + 예상 + 실제 + 다음 분기 예상(실제까지 넣어 다시 낸 추세 예상)
  const withAct = [...before, act];
  const nRev = projectNextQuarter(withAct, "rev");
  const aEnd = earnQuarterEnd(act.label) || due;
  const nx = new Date(aEnd.getFullYear(), aEnd.getMonth() + 3, 1);
  const nextG = Number.isFinite(nRev) && nRev > 0 ? fin2WithGrowth([{ label: fin2QuarterLabel(nx.getFullYear(), nx.getMonth() + 1), rev: nRev, ni: projectNextNetIncome(withAct, nRev), est: true, nextEst: true }], act.rev) : [];
  return { bars: [...prevG, expG, actG, ...nextG], source: raw.source, estSource: raw.estSource === "컨센서스" && !(lastEnd && lastEnd >= due) ? "컨센서스" : "추세 예상", compare: true };
}
function earnSectionKey() {
  if (appSectionMode === "etf" || appSectionMode === "crypto") return appSectionMode;
  return getWatchlistActiveMarket() === "KR" ? "kr" : "us";
}
function openEarningsTab() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle("tab.earnings");
  el("topRankingSubNav").innerHTML = "";
  showRankingGroup("earnings");
  renderEarningsTab();
}
// ---------- 실적 화면 DB(2026-10-19 사용자 요청) ----------
// 누를 때마다 종목마다 분기 재무를 새로 가져와서 늦었다 → 하루 두 번(GitHub Actions, scripts/build-earnings-view.js) 최근실적·예정 종목의
// 매출 예상/실제와 분기 그래프 데이터를 미리 계산해 data/earnings-view.json에 저장해 두고, 화면은 그 파일 하나만 읽어 바로 그린다.
// DB에 없는 종목만 예전처럼 그 자리에서 계산한다.
let earningsDbPromise = null;
function getEarningsDb() {
  if (!earningsDbPromise) {
    earningsDbPromise = fetch("data/earnings-view.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return earningsDbPromise;
}
// 지금 보이는 시장의 '최근실적'(지난 7일)·'예정'(한국 3주·미국 2주) 종목 목록 — 화면과 DB 빌더가 같은 기준을 쓴다
function earnWindowRows(cal, isKr) {
  const src = (cal && (isKr ? cal.kr : cal.us)) || {};
  const soon = [];
  const done = [];
  Object.entries(src).forEach(([sym, e]) => {
    if (e.next) {
      const d = -earnDaysSince(e.next);
      if (d >= 0 && d <= (isKr ? 21 : 14)) soon.push({ symbol: sym, date: e.next, days: d, time: e.nextTime || "", est: !!e.nextEst });
    }
    if (e.last) {
      const d = earnDaysSince(e.last);
      if (d >= 0 && d <= 7) done.push({ symbol: sym, date: e.last, days: d });
    }
  });
  return { soon, done };
}
window.__buildEarningsDb = async function () {
  const cal = await getEarningsCal();
  const out = { generatedAt: new Date().toISOString(), kr: {}, us: {} };
  for (const isKr of [true, false]) {
    const { soon, done } = earnWindowRows(cal, isKr);
    const jobs = [...soon.map((r) => ({ ...r, kind: "soon" })), ...done.map((r) => ({ ...r, kind: "done" }))];
    const store = isKr ? out.kr : out.us;
    await mapWithConcurrency(jobs, 4, async (j) => {
      try {
        const data = j.kind === "done" ? (await earnCompareData(j.symbol, j.date)) || (await earnQuarterData(j.symbol)) : await earnQuarterData(j.symbol);
        if (!data) return;
        const rec = (store[j.symbol] = store[j.symbol] || {});
        rec[j.kind] = j.kind === "done" ? { date: j.date, data } : { data };
      } catch {}
    });
  }
  return JSON.parse(JSON.stringify(out));
};
const earnShown = { soon: 10, done: 10, watch: 6 }; // watch = 맨 위 '관심'(2026-10-20): 6개만, 더보기로 전부
let earnSeq = 0;
async function renderEarningsTab() {
  const box = el("earningsResults");
  if (!box) return;
  const seq = ++earnSeq;
  const sec = earnSectionKey();
  if (sec === "etf" || sec === "crypto") {
    box.innerHTML = `<p class="muted earn-empty">${sec === "etf" ? "ETF" : "코인"}는 실적 발표가 없습니다. 한국주식·미국주식에서 확인해 주세요.</p>`;
    return;
  }
  const isKr = sec === "kr";
  box.innerHTML = `<p class="muted earn-empty">실적 일정을 불러오는 중...</p>`;
  const [cal, uni, edb, uniOther] = await Promise.all([getEarningsCal(), getSReportUniverse(isKr).catch(() => null), getEarningsDb(), getSReportUniverse(!isKr).catch(() => null)]);
  if (seq !== earnSeq) return;
  const names = new Map([...((uniOther && uniOther.companies) || []), ...((uni && uni.companies) || [])].map((c) => [c.symbol, c.name]));
  // 2026-10-08 사용자 요청: 발표 예정은 한국 3주 · 미국 2주까지 목록에(이름 옆 '예정' 마크는 그대로 7일 안만)
  const { soon, done } = earnWindowRows(cal, isKr);
  const dbMap = (edb && (isKr ? edb.kr : edb.us)) || {};
  // 미리 계산해 둔 값(DB) — 없으면 undefined, 화면이 그 자리에서 계산
  const dbData = (sym, kind, date) => {
    const rec = dbMap[sym] && dbMap[sym][kind];
    if (!rec) return undefined;
    return kind === "done" ? (rec.date === date ? rec.data : undefined) : rec.data;
  };
  soon.sort((a, b) => a.date.localeCompare(b.date) || (names.get(a.symbol) || "").localeCompare(names.get(b.symbol) || ""));
  done.sort((a, b) => b.date.localeCompare(a.date) || (names.get(a.symbol) || "").localeCompare(names.get(b.symbol) || ""));
  // 2026-10-20 사용자 요청: 맨 위 "관심" — 내 관심종목의 예정 + 최근 발표를 합쳐서(예정일 순, 종목당 한 줄)
  const watchRows = [];
  const wlSyms = getWatchlist().map((w) => w.symbol);
  wlSyms.forEach((sym) => {
    const kr = isKrTicker(sym);
    const e = ((cal && (kr ? cal.kr : cal.us)) || {})[sym];
    if (!e) return;
    if (e.next) {
      const d = -earnDaysSince(e.next);
      if (d >= 0 && d <= (kr ? 21 : 14)) {
        watchRows.push({ symbol: sym, date: e.next, days: d, time: e.nextTime || "", est: !!e.nextEst, kind: "soon" });
        return;
      }
    }
    if (e.last) {
      const d = earnDaysSince(e.last);
      if (d >= 0 && d <= 14) watchRows.push({ symbol: sym, date: e.last, days: d, kind: "done" });
    }
  });
  watchRows.sort((a, b) => (a.kind === b.kind ? (a.kind === "soon" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) : a.kind === "soon" ? -1 : 1));
  const dow = (iso) => ["일", "월", "화", "수", "목", "금", "토"][new Date(iso + "T00:00:00").getDay()];
  const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
  // 2026-10-08 사용자 요청: 예정은 "+00% 예상"(지난 분기 대비), 발표는 "+00% 예상 / +00% 실제"
  const revCell = (data, row, kind) => {
    if (data === undefined) return `<span class="rk-l1 muted">…</span>`;
    const n = earnRevNumbers(data, row, kind);
    if (!n) return `<span class="rk-l1 muted">-</span>`;
    if (kind === "soon") return `${earnPctHtml(n.exp, "예상", "rk-l1")}<span class="rk-l2 muted">지난 분기 대비</span>`;
    return `${earnPctHtml(n.exp, "예상", "rk-l1")}${n.stale ? `<span class="rk-l2 muted">실제 반영 전</span>` : earnPctHtml(n.act, "실제", "rk-l2")}`;
  };
  const revDone = new Map();
  [...watchRows.map((r) => [r, r.kind]), ...soon.map((r) => [r, "soon"]), ...done.map((r) => [r, "done"])].forEach(([r, k]) => {
    const d = dbData(r.symbol, k, r.date);
    if (d && !revDone.has(r.symbol)) revDone.set(r.symbol, d);
  });
  const tableHtml = (rows, kind) => {
    const n = earnShown[kind];
    const base = kind === "watch" ? 6 : 10;
    const list = rows.slice(0, n);
    const body = list
      .map((row) => {
        const rk = kind === "watch" ? row.kind : kind; // 관심 묶음은 줄마다 예정/발표가 다름
        const name = rankDisplayName(row.symbol, names.get(row.symbol) || row.symbol, isKr);
        const sub =
          rk === "soon"
            ? `${row.days === 0 ? "오늘" : `D-${row.days}`}${row.est ? " · 추정" : EARN_TIME_LABEL[row.time] ? ` · ${EARN_TIME_LABEL[row.time].replace("장 시작 전", "장 전").replace("장 마감 후", "장 후")}` : ""}`
            : row.days === 0
            ? "오늘"
            : `${row.days}일 전`;
        return `<tr class="earn-row" data-sym="${escapeHtml(row.symbol)}" data-kind="${rk}" data-date="${row.date}">
          <td>${rankNameCellHtml(row.symbol, tickerLogoHtml(row.symbol), name, undefined, "", true).replace("ticker-link rk-name", "rk-name")}</td>
          <td><span class="rk-l1">${md(row.date)}(${dow(row.date)})</span><span class="rk-l2 muted">${sub}</span></td>
          <td data-earn-rev="${escapeHtml(row.symbol)}">${revCell(revDone.get(row.symbol), row, rk)}</td>
        </tr>`;
      })
      .join("");
    return list.length
      ? `<table class="top30-table rk-table earn-table"><colgroup><col><col class="earn-col-date"><col class="earn-col-rev"></colgroup><tbody>${body}</tbody></table>
         ${rows.length > base ? `<button type="button" class="cat-btn load-more-btn pop-more" data-earn-more="${kind}">${n > base ? "− 접기" : `+더보기 (${rows.length}개)`}</button>` : ""}`
      : `<p class="muted earn-empty">${kind === "soon" ? `앞으로 ${isKr ? "3주" : "2주"} 안에 실적 발표 예정인 종목이 없습니다.` : "지난 7일 동안 실적을 발표한 종목이 없습니다."}</p>`;
  };
  const paint = () => {
    if (seq !== earnSeq) return;
    const watchSec = !wlSyms.length
      ? `<section class="pop-sec" data-earn-sec="watch"><div class="pop-sec-head"><b>⭐ 관심</b></div><button type="button" class="earn-watch-add" data-earn-add="1">+ 관심종목을 추가해서 실적발표 일정을 알아보세요.</button></section>`
      : `<section class="pop-sec" data-earn-sec="watch"><div class="pop-sec-head"><b>⭐ 관심</b><span class="pop-asof">예정 · 최근 발표 · ${watchRows.length}종목</span></div>${
          watchRows.length ? tableHtml(watchRows, "watch") : `<p class="muted earn-empty">관심종목 중 앞으로 3주 안에 실적 발표 예정이거나 최근 2주 안에 발표한 종목이 없습니다.</p><button type="button" class="earn-watch-add" data-earn-add="1">+ 관심종목을 더 추가하기</button>`
        }</section>`;
    box.innerHTML = `
      ${watchSec}
      <section class="pop-sec" data-earn-sec="done"><div class="pop-sec-head"><b>최근실적</b><span class="pop-asof">지난 7일 · ${done.length}종목</span></div>${tableHtml(done, "done")}</section>
      <section class="pop-sec" data-earn-sec="soon"><div class="pop-sec-head"><b>예정</b><span class="pop-asof">앞으로 ${isKr ? "3주" : "2주"} · ${soon.length}종목${isKr ? " · 추정" : ""}</span></div>${tableHtml(soon, "soon")}</section>`;
    bindEarnRows();
    box.querySelectorAll("[data-earn-add]").forEach((b) => b.addEventListener("click", () => openSearchOverlay())); // 검색을 켜서 관심종목 추가
    box.querySelectorAll("[data-earn-more]").forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.earnMore;
        const base = k === "watch" ? 6 : 10;
        earnShown[k] = earnShown[k] > base ? base : 999;
        paint();
        fillRevenue();
      })
    );
  };
  const fillRevenue = () => {
    const need = [
      ...watchRows.slice(0, earnShown.watch).map((r) => [r, r.kind]),
      ...soon.slice(0, earnShown.soon).map((r) => [r, "soon"]),
      ...done.slice(0, earnShown.done).map((r) => [r, "done"]),
    ].filter(([r], i, arr) => !revDone.has(r.symbol) && arr.findIndex(([x]) => x.symbol === r.symbol) === i);
    mapWithConcurrency(need, 4, async ([row, kind]) => {
      const data = kind === "done" ? (await earnCompareData(row.symbol, row.date)) || (await earnQuarterData(row.symbol)) : await earnQuarterData(row.symbol);
      revDone.set(row.symbol, data);
      if (seq !== earnSeq) return;
      box.querySelectorAll(`tr[data-sym="${CSS.escape(row.symbol)}"] [data-earn-rev]`).forEach((td) => {
        const tr = td.closest("tr");
        const k = tr ? tr.dataset.kind : kind;
        td.innerHTML = revCell(data, { ...row, kind: k }, k);
      });
    });
  };
  // 줄을 누르면 바로 아래에 재무정보와 같은 분기 그래프(다시 누르면 접힘)
  const bindEarnRows = () => {
    box.querySelectorAll("tr.earn-row").forEach((tr) =>
      tr.addEventListener("click", async () => {
        const open = tr.nextElementSibling && tr.nextElementSibling.classList.contains("earn-chart-row");
        box.querySelectorAll(".earn-chart-row").forEach((x) => x.remove());
        box.querySelectorAll("tr.earn-row.open").forEach((x) => x.classList.remove("open"));
        if (open) return;
        const sym = tr.dataset.sym;
        tr.classList.add("open");
        const cur = isKrTicker(sym) ? "KRW" : "USD";
        const chartTr = document.createElement("tr");
        chartTr.className = "earn-chart-row";
        chartTr.innerHTML = `<td colspan="3"><div class="earn-chart"><p class="muted" style="padding:10px 0;">분기 실적을 불러오는 중...</p></div></td>`;
        tr.after(chartTr);
        const data =
          dbData(sym, tr.dataset.kind, tr.dataset.date) ||
          (tr.dataset.kind === "done" ? (await earnCompareData(sym, tr.dataset.date)) || (await earnQuarterData(sym)) : await earnQuarterData(sym));
        const holder = chartTr.querySelector(".earn-chart");
        if (!holder) return;
        holder.innerHTML = data
          ? `${fin2BodyHtml(data, "quarter", cur)}<button type="button" class="earn-detail-link ticker-link" data-ticker="${escapeHtml(sym)}">종목 상세 보기 ›</button>`
          : `<p class="muted" style="padding:10px 0;">분기 실적 데이터를 찾을 수 없습니다.</p>`;
        holder.querySelectorAll(".fin2-col").forEach((col) =>
          col.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const was = col.classList.contains("active");
            holder.querySelectorAll(".fin2-col.active").forEach((c) => c.classList.remove("active"));
            if (!was) col.classList.add("active");
          })
        );
      })
    );
  };
  paint();
  fillRevenue();
}
document.addEventListener("watchlistchange", () => {
  if (typeof navMode !== "undefined" && navMode === "earn") renderEarningsTab();
});
// ---------- 신기술(2026-10-19 개편: 하단 메뉴 "신기술" 탭) ----------
// AI투데이(뉴스·브리핑)는 사용자 요청으로 완전히 없앴다. 신기술 카드만 보여준다 — 투자군과 상관없이 모두 같은 목록.
let todayTechShown = 5;
// 신기술 보기 방식(2026-10-19 사용자 요청): 요약(사진+제목만, 2열) / 전체(지금처럼 줄글) — 고른 방식은 이 기기에 기억
const TECH_VIEW_KEY = "tech_view_v1";
function getTechView() {
  try {
    return localStorage.getItem(TECH_VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}
async function renderTechInto(rootId, scrollToIdx) {
  const root = el(rootId);
  if (!root) return;
  root.innerHTML = `<p class="muted today-empty">불러오는 중...</p>`;
  const tech = await getTechInsightData();
  const techItems = (Array.isArray(tech) ? tech : [])
    .slice()
    .sort((a, b) => (Date.parse(b.publishedAt || b.createdAt) || 0) - (Date.parse(a.publishedAt || a.createdAt) || 0));
  const techShown = techItems.slice(0, todayTechShown);
  const techLatest = techItems.length ? techItems.map((t) => t.publishedAt || t.createdAt || "").sort().pop() : "";
  const view = getTechView();
  const gridIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>`;
  const listIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const toolbar = `<div class="tech-view-bar"><button type="button" class="tech-view-btn${view === "grid" ? " active" : ""}" data-tech-view="grid" aria-label="요약 보기(사진과 제목)">${gridIcon}</button><button type="button" class="tech-view-btn${view === "list" ? " active" : ""}" data-tech-view="list" aria-label="전체 보기(줄글)">${listIcon}</button></div>`;
  const gridHtml = `<div class="tech-grid">${techShown
    .map(
      (it, i) => `<button type="button" class="tech-grid-card" data-tech-i="${i}"><img src="${escapeHtml(it.image)}" alt="" loading="lazy" /><span class="tech-grid-title">${escapeHtml(it.title)}</span><span class="tech-grid-src">${escapeHtml(it.source || "")}${techAgoText(it) ? ` <span class="tech-ago">· ${techAgoText(it)}</span>` : ""}</span></button>`
    )
    .join("")}</div>`;
  const listHtml = `<div class="tech-insight-list">${techShown.map((it, i) => `<div data-tech-card="${i}">${techInsightCardHtml(it)}</div>`).join("")}</div>`;
  // 2026-10-20 사용자 요청: 맨 위에 글로벌 연구기관(출처) 요약 — 어떤 기관의 글을 모았는지 한눈에
  const TECH_ORG_INFO = [
    ["MIT Technology Review", "미국 MIT가 발행하는 기술 전문 매체 — AI·바이오·에너지 신기술"],
    ["IEEE Spectrum", "세계 최대 전기·전자공학 학회(IEEE)의 매거진 — 로봇·반도체·통신"],
    ["McKinsey", "글로벌 컨설팅사 맥킨지의 산업·기술 리포트"],
    ["OECD", "OECD(경제협력개발기구)의 AI 정책 블로그"],
  ];
  const techOrgCount = {};
  techItems.forEach((t) => (techOrgCount[t.source] = (techOrgCount[t.source] || 0) + 1));
  // 2026-10-20 사용자 요청: 맨 위엔 한 줄 안내 + "+자세히"(누르면 기관 목록) — 아래 작은 설명은 중복이라 삭제
  const orgHtml = `<div class="tech-orgs"><div class="tech-orgs-head"><span>🌐 AI가 글로벌 연구기관 최신 글 내용을 요약합니다.</span><button type="button" class="tech-orgs-toggle" aria-expanded="false">+자세히</button></div><div class="tech-orgs-list" style="display:none;">${TECH_ORG_INFO.map(
    ([name, desc]) => `<div class="tech-org-row${techOrgCount[name] ? "" : " tech-org-off"}"><b>${escapeHtml(name)}</b><span>${escapeHtml(desc)}</span><em>${techOrgCount[name] ? `${techOrgCount[name]}건` : "준비 중"}</em></div>`
  ).join("")}${techLatest ? `<p class="tech-orgs-latest">최근 글 ${escapeHtml(String(techLatest).slice(0, 10))}</p>` : ""}</div></div>`;
  root.innerHTML = techItems.length
    ? `${toolbar}${orgHtml}
       ${view === "grid" ? gridHtml : listHtml}
       ${techItems.length > 5 ? `<button type="button" class="cat-btn load-more-btn today-tech-more">${todayTechShown > 5 ? "− 접기" : `+더보기 (${techItems.length}개)`}</button>` : ""}
       <p class="disclaimer tab-note">📢 정확한 내용은 원문 링크에서 확인하세요. 삽화는 AI로 생성되어 실제 사진과 다를 수 있습니다.</p>`
    : `<p class="muted today-empty">🚧 신기술은 준비 중입니다.</p>`;
  const orgToggle = root.querySelector(".tech-orgs-toggle");
  if (orgToggle)
    orgToggle.addEventListener("click", () => {
      const list = root.querySelector(".tech-orgs-list");
      const open = list.style.display === "none";
      list.style.display = open ? "block" : "none";
      orgToggle.textContent = open ? "-접기" : "+자세히";
      orgToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  const more = root.querySelector(".today-tech-more");
  if (more)
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      todayTechShown = todayTechShown > 5 ? 5 : techItems.length;
      renderTechInto(rootId);
    });
  root.querySelectorAll("[data-tech-view]").forEach((b) =>
    b.addEventListener("click", () => {
      try {
        localStorage.setItem(TECH_VIEW_KEY, b.dataset.techView);
      } catch {}
      renderTechInto(rootId);
    })
  );
  // 요약 보기에서 카드를 누르면 전체(줄글) 보기로 바꾸고 그 글 위치로
  root.querySelectorAll("[data-tech-i]").forEach((b) =>
    b.addEventListener("click", () => {
      try {
        localStorage.setItem(TECH_VIEW_KEY, "list");
      } catch {}
      renderTechInto(rootId, Number(b.dataset.techI));
    })
  );
  if (scrollToIdx !== undefined) {
    const card = root.querySelector(`[data-tech-card="${scrollToIdx}"]`);
    if (card) card.scrollIntoView({ block: "start" });
  }
}

// ---------- +추가하기: 내 관심종목에서 / 직접 추가 ----------
// 2026-10-08 사용자 요청(올라오는 창이 성의 없어 보임 → 금융 앱처럼 전문적으로): 손잡이 · 선 아이콘(이모지 대신) ·
// 목록형 줄 + 오른쪽 화살표/선택 원 · 아래 큰 확인 버튼. 브라우저 기본 확인창(confirm·prompt)도 이 시트로 바꿈
const SHEET_ICON = {
  folder: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l2 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7M9.5 7V4.5h5V7"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="M13.5 6.5l4 4"/>',
  move: '<path d="M4 12h13M13 7l5 5-5 5"/>',
};
function sheetSvg(k, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHEET_ICON[k] || ""}</svg>`;
}
function sheetHead(title) {
  return `<div class="ia-sheet-head"><b>${escapeHtml(title)}</b><button type="button" class="ia-sheet-x" data-ia-close aria-label="닫기">${sheetSvg("close", 18)}</button></div>`;
}
// 입력 시트 — Promise<string|null>
function appPromptSheet(o) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const sheet = iaOpenSheet(`
      ${sheetHead(o.title)}
      ${o.sub ? `<p class="ia-sheet-sub">${o.sub}</p>` : ""}
      <input type="text" class="sheet-input" maxlength="${o.maxLength || 20}" placeholder="${escapeHtml(o.placeholder || "")}" value="${escapeHtml(o.value || "")}" />
      <div class="sheet-actions">
        <button type="button" class="sheet-btn ghost" data-sheet-cancel>취소</button>
        <button type="button" class="sheet-btn primary" data-sheet-ok>${escapeHtml(o.okLabel || "확인")}</button>
      </div>`);
    const input = sheet.querySelector(".sheet-input");
    const okBtn = sheet.querySelector("[data-sheet-ok]");
    const sync = () => (okBtn.disabled = !input.value.trim());
    sync();
    input.addEventListener("input", sync);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 250);
    const submit = () => {
      if (!input.value.trim()) return;
      const v = input.value.trim();
      iaCloseSheet();
      fin(v);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    const wrap = sheet.parentElement;
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-ia-close]")) fin(null);
    });
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("[data-sheet-ok]")) submit();
      else if (e.target.closest("[data-sheet-cancel]")) {
        iaCloseSheet();
        fin(null);
      }
    });
  });
}
function iaOpenSheet(innerHtml) {
  iaCloseSheet();
  const wrap = document.createElement("div");
  wrap.className = "ia-sheet-backdrop";
  wrap.id = "iaSheet";
  wrap.innerHTML = `<div class="ia-sheet" role="dialog" aria-modal="true"><div class="sheet-grabber" aria-hidden="true"></div>${innerHtml}</div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-ia-close]")) iaCloseSheet();
  });
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("open"));
  return wrap.querySelector(".ia-sheet");
}
function iaCloseSheet() {
  const s = el("iaSheet");
  if (s) s.remove();
}
// 투자처별 5개 항목과 각 항목에 들어가는 지표(↑ 높을수록 좋음, ↓ 낮을수록 좋음) — 배치(build-autotrack-grades.py)와 같은 구성.
// 표 머리글 설명과 "+등급기준" 그래프가 함께 쓴다.
const ATG_CRITERIA = {
  // 2026-10-07 사용자 지정(한국, 미국도 동일)
  // 2026-10-07 사용자 요청: 순서 승률 - 성장 - 수익성 - 모멘텀 - 가치
  kr: [
    { f: "승률", items: ["10년월간승률 ↑"] },
    { f: "성장", items: ["매출 증가율 ↑"] },
    { f: "수익성", items: ["순이익 증가율 ↑", "영업이익 증가율 ↑"] },
    { f: "모멘텀", items: ["한 달 수익률 ↑", "52주 위치 ↑"] },
    { f: "가치", items: ["ROE ↑", "PER ↓"] },
  ],
  crypto: [
    { f: "승률", items: ["10년월간승률 ↑"] },
    { f: "상승률", items: ["연평균 상승률 ↑"] }, // 2026-10-07 "장기상승" → "상승률"
    { f: "모멘텀", items: ["3개월 수익률 ↑", "52주 위치 ↑"] },
    { f: "안정성", items: ["하루 평균 변동폭 ↓"] },
    { f: "규모", items: ["시가총액 ↑"] },
  ],
};
ATG_CRITERIA.us = ATG_CRITERIA.kr; // 2026-10-07 사용자 요청: 미국도 한국과 같은 구성
ATG_CRITERIA.etf = ATG_CRITERIA.crypto.map((c) => (c.f === "규모" ? { f: "규모", items: ["순자산(시가총액) ↑"] } : c));
// 한국 ETF 상세의 섹터 분류(etfSectorOf)는 한글 상품명이 필요하다 — 처음 화면이 뜬 뒤 국내 ETF 목록을 미리 받아 둔다(2026-10-07)
setTimeout(() => {
  getKrEtfFullList().catch(() => {});
}, 3000);
