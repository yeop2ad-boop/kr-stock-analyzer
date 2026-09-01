// ===== 미국 기업 분석기 (API 키 불필요 버전) =====
// 데이터 소스: Yahoo Finance 비공식 엔드포인트(공개 CORS 프록시 경유) + Wikipedia(공식 CORS 지원)
// 주의: 비공식 API이므로 언제든 응답 형식이 바뀌거나 차단될 수 있습니다.

const el = (id) => document.getElementById(id);

// PWA로 홈 화면에 설치 가능하게(앱스토어 등록 없이) 서비스워커 등록 — 캐싱 없이 통과만 시키는 최소 워커
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

// ---------- 핵심 내비게이션(탭바/서브탭/위저드) 아이콘 — 이모지 대신 로고와 동일한 주황(#e6983c) 단색 라인 아이콘 ----------
const WIZ_ORANGE = "#e6983c";
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

// 시장 패널이 열릴 때 openMarketPanel()이 곧바로 startIndexAutoRefresh()를 호출함 — 그 함수가
// 참조하기 전에 값이 준비되어 있어야 하므로 파일 맨 앞에 둠(TDZ 에러 방지)
const INDEX_AUTO_REFRESH_MS = 20000;

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
const indexStatus = el("indexStatus");
const indexResults = el("indexResults");
const valuationStatus = el("valuationStatus");
const valuationResults = el("valuationResults");
const trendStatus = el("trendStatus");
const trendResults = el("trendResults");
const futureStatus = el("futureStatus");
// 가격/차트보기 링크 클릭 시 새 탭 대신 앱 내 전체화면 모달로 TradingView 차트를 띄움(요약 카드·순위표 등 여러 곳에서 동적으로 삽입되므로 이벤트 위임 사용)
el("chartModalCloseBtn").addEventListener("click", closeChartModal);
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".price-chart-link, .chart-link-btn");
  if (!linkEl) return;
  e.preventDefault();
  openChartModal(linkEl.dataset.chartSymbol);
});
// 원자재/채권/외환 행(.asset-detail-link) — 종목이 아니므로 차트 모달 대신 전용 상세페이지(개요+뉴스)로 이동
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".asset-detail-link");
  if (!linkEl) return;
  openAssetDetail(linkEl.dataset.assetCat, linkEl.dataset.assetTicker);
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
// 공포지수(S&P)/FOMO지수(국내) 제목 옆 "+자세히" — 기본으로 접혀 있다가 눌러야 VIX/FOMO 차트가 펼쳐짐(주황 반투명 박스로 표시).
// 종목과 무관한 시장 전체 차트라 같은 시장 내에서는 최초 1회만 그리고 이후 검색부터는 캐시된 결과를 재사용(renderMacroScoreChart 내부에서 처리)
el("futureMacroChartDetailBtn").addEventListener("click", () => {
  const wrap = el("futureMacroChartDetailWrap");
  const btn = el("futureMacroChartDetailBtn");
  const isOpen = wrap.style.display !== "none";
  wrap.style.display = isOpen ? "none" : "block";
  wrap.classList.toggle("chart-detail-expanded", !isOpen);
  btn.textContent = isOpen ? "+자세히" : "-접기";
  if (!isOpen) {
    const ticker = new URLSearchParams(location.search).get("ticker") || tickerInput.value;
    if (isKrTicker(ticker)) renderKrMacroScoreChart();
    else renderMacroScoreChart();
    scrollChartToRight(el("futureMacroChartContainer")); // 이미 그려져 있던(캐시) 경우에도 오른쪽 끝부터
  }
});
// 투자안정성 제목 옆 "+자세히" — 점수별 작년 주가상승 분포도(경고문구 위에 표시). 미래예측을 아직 안 돌린 종목이면
// 같은 파이프라인(runFuturePrediction)을 실행해 분포도 데이터를 채움
el("futureRiskDetailBtn").addEventListener("click", () => {
  const wrap = el("futureRiskDetailWrap");
  const btn = el("futureRiskDetailBtn");
  const isOpen = wrap.style.display !== "none";
  wrap.style.display = isOpen ? "none" : "block";
  wrap.classList.toggle("chart-detail-expanded", !isOpen);
  btn.textContent = isOpen ? "+자세히" : "-접기";
  if (!isOpen) {
    const ticker = (new URLSearchParams(location.search).get("ticker") || tickerInput.value || "").toUpperCase();
    if (ticker && futureRiskRenderedTicker !== ticker) runFuturePrediction(ticker);
    scrollChartToRight(el("futureRiskContainer")); // 이미 그려져 있던 경우에도 오른쪽 끝부터
  }
});
// 지수 카드는 <a>가 아니라 role="button" div라 클릭 외에 키보드(Enter/Space) 접근성도 함께 지원
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const rowEl = e.target.closest(".idx-row-clickable");
  if (!rowEl) return;
  e.preventDefault();
  if (rowEl.dataset.assetCat) openAssetDetail(rowEl.dataset.assetCat, rowEl.dataset.assetTicker);
  else openChartModal(rowEl.dataset.chartSymbol);
});
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
async function proxyFetchJson(targetUrl, retries = 1) {
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
    return proxyFetchJson(targetUrl, retries - 1);
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

async function yahooPeers(symbol) {
  const url = `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`;
  return proxyFetchJson(url);
}

// 분기 실적 발표 이력(earningsHistory)·다음 분기 애널리스트 컨센서스(earningsTrend)·다음 실적 발표 예정일(calendarEvents) 조회
async function yahooQuoteSummary(symbol, modules) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  return proxyFetchJson(url);
}

async function yahooScreener(scrId, count = 50) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=${count}`;
  return proxyFetchJson(url);
}

async function yahooMostActive(count = 50) {
  return yahooScreener("most_actives", count);
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

// 동일 섹터 종목을 시가총액 내림차순으로 반환(자기 자신 제외) — 경쟁사 TOP3(업종 일치 우선) + 시총 유사 종목 선정에 사용.
// Yahoo 스크리너 응답엔 세부 업종(industry) 필드가 없어, 섹터 후보 중 시총 상위 일부만 v1/finance/search로
// 하나씩 조회해 industryDisp가 자기 자신과 같은 후보를 골라낸다(과도한 API 호출을 막기 위해 상위 15개로 제한).
async function getSectorPeerCandidates(sector, selfSymbol, selfIndustry) {
  const scrId = SECTOR_SCREENER_ID[sector];
  if (!scrId) return null;
  const data = await yahooScreener(scrId, 60);
  const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
  const candidates = quotes
    .filter((q) => q && q.symbol && q.symbol !== selfSymbol && q.marketCap !== undefined && q.marketCap !== null)
    .map((q) => ({ symbol: q.symbol, marketCap: q.marketCap }))
    .sort((a, b) => b.marketCap - a.marketCap);

  let industryCandidates = [];
  if (selfIndustry && candidates.length > 0) {
    const top = candidates.slice(0, 15);
    const checked = await mapWithConcurrency(top, 5, async (c) => {
      try {
        const s = await yahooSearch(c.symbol);
        const q = s && s.quotes && s.quotes[0];
        const ind = q && (q.industryDisp || q.industry);
        return ind === selfIndustry ? c : null;
      } catch {
        return null;
      }
    });
    industryCandidates = checked.filter(Boolean);
  }

  return { candidates, industryCandidates };
}

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

// "투자황금기(공포지수연동)" 점수 — VIX(공포지수)가 높을수록(시장이 패닉일수록) 역발상 매수 기회로 보고 점수를 올림.
// VIX 25 이하는 평시로 보고 5점 고정, 25~35 구간은 5~10점 선형(VIX 2당 1점), 35를 넘으면 상한 없이 계속 상승하되
// 상승 속도는 완만해짐(VIX 5당 1점). 화면에는 이 0~10점 환산 점수 대신 원본 VIX 수치와 등급(vixGrade)을 표시함
function computeMacroScore({ vix }) {
  let total = 5;
  if (vix !== null && vix !== undefined) {
    if (vix <= 25) total = 5;
    else if (vix <= 35) total = 5 + (vix - 25) * 0.5;
    else total = 10 + (vix - 35) * 0.2;
  }
  total = Math.round(total * 10) / 10;
  return { total, vix };
}

// VIX 원본 수치를 그대로 4단계 등급으로: 20미만 안심, 20~29.9 경계, 30~39.9 공포, 40이상 패닉(역발상 투자 황금기)
function vixGrade(vix) {
  if (vix === null || vix === undefined || Number.isNaN(vix)) return { label: "N/A", cls: "" };
  if (vix < 20) return { label: "안심", cls: "calm" };
  if (vix < 30) return { label: "경계", cls: "caution" };
  if (vix < 40) return { label: "공포", cls: "fear" };
  return { label: "패닉 (투자 황금기)", cls: "panic" };
}

// ---------- 한국(코스피) 종목용 자체 변동성 지표 — 진짜 VKOSPI(옵션 내재변동성) 아님 ----------
// VKOSPI는 코스피200 옵션 가격 기반 "내재변동성" 지수라 옵션 체인 데이터가 있어야 계산되는데, 그런 데이터를
// 무료로 구할 방법이 없었음(Yahoo/FRED 미제공, Investing.com은 서버 요청 자체를 403으로 차단, KRX 공식
// 데이터마켓은 로그인 필요). 대신 이미 정당하게 쓰고 있는 KOSPI200(^KS200) 가격 데이터만으로 계산 가능한
// "실현변동성(realized volatility, 최근 20거래일 일간수익률의 연환산 표준편차)"을 자체 지표로 사용.
// KR_VOL_CALIBRATION은 실현변동성 원본 수치를 VKOSPI와 비슷한 체감 단위로 맞추기 위한 배율로,
// 2026-08-21 기준 원본 20일 실현변동성 약 87.0%를 그 시점 VKOSPI 근사치인 57 부근에 맞춘 값(57/87 ≈ 0.655).
// 실현변동성과 내재변동성은 서로 다른 개념이라 완전히 같은 숫자가 나오진 않으며 참고용 근사치임.
const KR_VOL_CALIBRATION = 0.655;

function annualizedRealizedVolPct(closes, window) {
  const rets = [];
  const start = Math.max(1, closes.length - window);
  for (let i = start; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// KOSPI200(^KS200) 일별 종가로 실현변동성 계산 — 오늘자 20일 창(window)과 하루 전 20일 창을 각각 구해
// "전일 대비 변화"처럼 보여줄 delta도 함께 반환(진짜 전일 데이터 재발표가 아니라 창이 하루씩 밀린 값의 차이)
let krVolMetricsPromise = null;
function getKrVolMetrics() {
  if (!krVolMetricsPromise) {
    krVolMetricsPromise = (async () => {
      const chart = await yahooChart("^KS200", "3mo", "1d");
      const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
      const closes = (result && result.indicators && result.indicators.quote[0].close || []).filter(
        (v) => v !== null && v !== undefined
      );
      if (closes.length < 5) throw new Error("KOSPI200 가격 데이터를 가져오지 못했습니다.");
      const rawToday = annualizedRealizedVolPct(closes, 20);
      const rawYesterday = annualizedRealizedVolPct(closes.slice(0, -1), 20);
      if (rawToday === null) throw new Error("실현변동성을 계산할 데이터가 부족합니다.");
      const vol = rawToday * KR_VOL_CALIBRATION;
      const volPrev = rawYesterday !== null ? rawYesterday * KR_VOL_CALIBRATION : null;
      const volChangePct = volPrev ? ((vol - volPrev) / volPrev) * 100 : null;
      return { vol, volChangePct };
    })().catch((e) => {
      krVolMetricsPromise = null;
      throw e;
    });
  }
  return krVolMetricsPromise;
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
// 포모지수는 값이 작을수록(음수, 신저가 쏠림) VIX의 "고fear=역발상 매수 찬스"와 같은 개념이 되도록 5단계로 등급화
function fomoGrade(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return { label: "N/A" };
  if (score <= -0.15) return { label: "패닉 (투자 황금기)" };
  if (score <= -0.05) return { label: "공포" };
  if (score < 0.05) return { label: "안심" };
  if (score < 0.15) return { label: "경계" };
  return { label: "과열 (FOMO)" };
}
// 원점수(-1~1, 실제로는 대부분 -0.3~0.3 사이)를 %p 단위로 환산해 사람이 읽기 쉬운 정수로 표시
function fomoDisplayValue(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "N/A";
  const pt = Math.round(score * 100);
  return `${pt >= 0 ? "+" : ""}${pt}`;
}
function fomoLineHtml(score, changeAbs) {
  if (score === null || score === undefined) return "";
  const pt = Math.round(score * 100);
  const changeStr =
    changeAbs !== null && changeAbs !== undefined && Number.isFinite(changeAbs)
      ? `(전일대비 ${changeAbs >= 0 ? "+" : ""}${Math.round(changeAbs * 100)}%p)`
      : "";
  return `<br>KOSPI 공포지수 : ${pt >= 0 ? "+" : ""}${pt}%p ${changeStr}`;
}
// scoreBgStyleAttr는 "값이 클수록 더 하얗게(더 fear/attractive)"라는 전제라, 포모지수는 부호가 반대(음수일수록 fear)이므로
// -score*100(=fear 강도, 신저가 쏠림일수록 커짐)으로 뒤집어 넣어 기존 배경색 로직을 그대로 재사용
function fomoBgStyleAttr(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return scoreBgStyleAttr(null, -15, 15, "fear");
  return scoreBgStyleAttr(-score * 100, -15, 15, "fear");
}

// FOMO지수·VIX처럼 "구간별 등급 + 현재값 위치"를 한눈에 보여주는 가로형 구간 게이지 그래프.
// zones: [{to, label, color}]를 왼쪽(min)부터 순서대로 넘기면 각 구간 폭을 자동 계산해 채우고,
// 현재값 위치에 포인터(▲)를 표시한다. value가 없으면 게이지 없이 빈 문자열을 반환.
function macroGaugeHtml(value, min, max, zones) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const clamped = clamp(value, min, max);
  const pointerPct = ((clamped - min) / (max - min)) * 100;
  let prevBound = min;
  const zoneHtml = zones
    .map((z) => {
      const widthPct = ((z.to - prevBound) / (max - min)) * 100;
      prevBound = z.to;
      return `<span class="macro-gauge-zone" style="width:${widthPct}%;background:${z.color};"></span>`;
    })
    .join("");
  const labelHtml = zones.map((z) => `<span>${escapeHtml(z.label)}</span>`).join("");
  return `
    <div class="macro-gauge">
      <div class="macro-gauge-track">
        ${zoneHtml}
        <div class="macro-gauge-pointer" style="left:${pointerPct}%;"></div>
      </div>
      <div class="macro-gauge-labels">${labelHtml}</div>
    </div>`;
}

// ---------- 점수 색상 통일: 상승압력(파랑)·투자안정(초록)·공포지수(주황) 세 계열 — 텍스트/보더는 계열 고정색,
// 배경만 값이 높을수록 흰색 계열, 낮을수록 검정 계열로 보간(값이 없으면 중립 회색) ----------
const SCORE_COLOR_FAMILY = {
  pressure: "#5b8def", // 상승압력 - 파랑
  stability: "#22a866", // 투자안정 - 초록
  fear: "#e08a2c", // 공포지수(VIX) - 주황
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

// 요약 배지 라벨 아래에 붙일 "VIX : 값(변동%)" 줄(중앙정렬은 .mini-score-label의 text-align:center가 담당)
function vixLineHtml({ vix, vixChangePct } = {}, label = "VIX") {
  if (vix === null || vix === undefined) return "";
  const pctStr =
    vixChangePct !== null && vixChangePct !== undefined && Number.isFinite(vixChangePct)
      ? `(${vixChangePct >= 0 ? "+" : ""}${vixChangePct.toFixed(2)}%)`
      : "";
  return `<br>${label} : ${vix.toFixed(1)}${pctStr}`;
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

// 최근 거래일 대비 등락률(요약 카드의 현재가 옆 괄호 표시용) — 일봉 마지막 두 종가를 비교
function getDailyChangePercent(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return null;
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

// 개별 종목의 가격/52주 범위/매출/순이익/1년 수익률을 한 번에 조회
async function getCompanyMetrics(symbol) {
  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol),
    yahooFundamentals(
      symbol,
      "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued,quarterlyTotalRevenue"
    ).catch(() => null),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) throw new Error(`${symbol} 데이터를 가져오지 못했습니다.`);
  const meta = result.meta;

  let revenue = null;
  let eps = null;
  let netIncome = null;
  let sharesOutstanding = null;
  const resultArr = fundData && fundData.timeseries && fundData.timeseries.result;
  if (resultArr) {
    for (const block of resultArr) {
      if (block.annualTotalRevenue) revenue = await latestFundamentalValue(block, "annualTotalRevenue", meta.currency);
      if (block.annualBasicEPS) eps = await latestFundamentalValue(block, "annualBasicEPS", meta.currency);
      if (block.annualNetIncome) netIncome = await latestFundamentalValue(block, "annualNetIncome", meta.currency);
      if (block.annualShareIssued)
        sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
    }
  }
  const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;
  const revenueQuarterlySeries = resultArr ? await fundamentalSeries(resultArr, "quarterlyTotalRevenue", meta.currency) : [];

  const { recent5dAvg, avg1y } = currentDollarVolumeStats(chartData);

  return {
    symbol,
    price: meta.regularMarketPrice,
    revenue,
    eps,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    momentum3m: get3MonthReturn(chartData),
    revenueGrowthYoY: latestQuarterRevenueYoY(revenueQuarterlySeries),
    recentDollarVolume: recent5dAvg,
    avgDollarVolume1y: avg1y,
    firstTradeDate: meta.firstTradeDate ?? null,
  };
}

// 총 거래대금 + 최근 분기 매출 YoY 성장성 + 상승 모멘텀을 조합한 참고용 상승압력도 점수(10점 만점)
function computeAttractivenessScore(metrics) {
  const { recentDollarVolume, avgDollarVolume1y, momentum3m, revenueGrowthYoY } = metrics;

  // 1) 총 거래대금 (0~3점) — 최근 5거래일 평균 거래대금이 1년 평균 대비 2배 이상이면 만점, 0.5배면 0점 (선형)
  // 거래대금 데이터가 부족한 경우 중립값 1.5점 처리
  let volumeScore = 1.5;
  let volumeRatio = null;
  if (recentDollarVolume !== undefined && recentDollarVolume !== null && avgDollarVolume1y) {
    volumeRatio = recentDollarVolume / avgDollarVolume1y;
    volumeScore = clamp(2 * (volumeRatio - 0.5), 0, 3);
  }

  // 2) 가장 최근 분기 매출의 전년 동기 대비(YoY) 성장률 (0~3점) — 30% 이상 3점, 0% 이하 0점 (10%p마다 1점, 선형)
  // 데이터가 부족해 성장률을 계산할 수 없는 경우(N/A)도 0점 처리
  let growthScore = 0;
  if (revenueGrowthYoY !== undefined && revenueGrowthYoY !== null) {
    growthScore = clamp(revenueGrowthYoY / 10, 0, 3);
  }

  // 3) 상승 모멘텀 = 최근 3개월 누적 수익률 (0~4점) — 25% 이상이면 만점, 0% 이하면 0점 (선형)
  // 데이터가 부족한 경우(N/A)도 0점 처리
  let momentumScore = 0;
  if (momentum3m !== undefined && momentum3m !== null) {
    momentumScore = clamp((momentum3m / 25) * 4, 0, 4);
  }

  const total = Math.round(clamp(volumeScore + growthScore + momentumScore, 0, 10) * 10) / 10;
  return { total, volumeScore, volumeRatio, growthScore, revenueGrowthYoY, momentumScore, momentum3m };
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

  const prevClose = meta.chartPreviousClose ?? null;
  const changePct =
    meta.regularMarketPrice !== undefined && meta.regularMarketPrice !== null && prevClose
      ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100
      : null;

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
    firstTradeDate: meta.firstTradeDate ?? null,
  };
}

// 상장(IPO)한 지 약 3개월(92일) 이내인지 — 데이터가 부족해 점수 신뢰도가 낮은 종목을 점수 대신 "IPO"로 표기하는 데 사용
function isRecentIPO(firstTradeDateEpoch) {
  if (!firstTradeDateEpoch) return false;
  return (Date.now() / 1000 - firstTradeDateEpoch) / 86400 <= 92;
}

// 점수 셀 표시용 — 최근 IPO 종목은 데이터가 부족해 신뢰도 낮은 점수 대신 "IPO"로 표기
function scoreCellText(score, isIPO) {
  if (isIPO) return "IPO";
  return score !== null && score !== undefined ? score : "N/A";
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
  return ` <span title="${SURGE_WARNING_TITLE}">${icons}</span>`;
}
// 순위 표 위에 붙이는 경고 이모지 범례 + 상승 압력/투자 안정 점수 의미 설명 + 배점기준 상세 모달 여는 버튼
const SURGE_WARNING_LEGEND = `
  <p class="muted" style="font-size:11px;margin:0 0 4px;opacity:0.65;">🔥 급등 · ⚠️ 급락 — ${SURGE_WARNING_TITLE}</p>
  <p class="muted" style="font-size:11px;margin:0 0 2px;opacity:0.65;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <span>📈 상승 압력 — 현재 상승 압력이 높음을 의미<br>🛡️ 투자 안정 — 1년 후 하락 가능성이 낮음을 의미</span>
    <button type="button" id="scoreMethodDetailBtn" class="score-method-detail-btn">+자세히</button>
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
const TAB_ORDER = ["watchlist", "topranking", "insight"];
const panels = {
  watchlist: el("panelWatchlist"),
  topranking: el("panelTopRanking"),
  insight: el("panelInsight"),
};
const tabButtons = {
  watchlist: el("watchlistTabBtn"),
  topranking: el("tabValuationBtn"),
  insight: el("tabInsightBtn"),
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
const insightButtons = {
  blackrock: el("insightBlackrockBtn"),
  vanguard: el("insightVanguardBtn"),
  stateStreet: el("insightStateBtn"),
  berkshire: el("insightBerkshireBtn"),
  goldman: el("insightGoldmanBtn"),
  morganStanley: el("insightMorganStanleyBtn"),
  jpmorgan: el("insightJpmorganBtn"),
  ark: el("insightArkBtn"),
  softbank: el("insightSoftbankBtn"),
};
const insightKrButtons = {
  nps: el("insightNpsBtn"),
  samsungAm: el("insightSamsungAmBtn"),
  miraeAm: el("insightMiraeAmBtn"),
  kbAm: el("insightKbAmBtn"),
};
const futureIndustryButtons = {
  assetMgr: el("futureIndAssetMgrBtn"),
  oecd: el("futureIndOecdBtn"),
  imf: el("futureIndImfBtn"),
};
const insightCategoryButtons = {
  firms: el("insightCatFirmsBtn"),
  brand: el("insightCatBrandBtn"),
  tech: el("insightCatTechBtn"),
  calendar: el("insightCatCalendarBtn"),
  news: el("insightCatNewsBtn"),
  futureIndustry: el("insightCatFutureIndustryBtn"),
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
window.addEventListener("resize", syncCarouselHeight);

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

function switchTab(index) {
  index = Math.max(0, Math.min(TAB_ORDER.length - 1, index));
  const switchKey = TAB_ORDER[index];
  if (switchKey === "watchlist") setCarouselViewTitle("tab.watchlist");
  else if (switchKey === "insight") setCarouselViewTitle("tab.insight");
  // 관심종목 화면에선 상단 별(관심종목 이동 버튼)이 자기 자신이라 숨김(사용자 요청)
  const fhStar = el("fhWatchlistBtn");
  if (fhStar) fhStar.style.display = switchKey === "watchlist" ? "none" : "";
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
  watchlist: () => renderWatchlistList(),
  // 기업가치/시장동향은 activateRankingGroup()이 클릭될 때마다 매번 직접 그룹/서브내비/첫 항목을 처리하므로 별도 캐시 로더 불필요
  topranking: () => {},
  // 인사이트 진입 시 기본은 첫 버튼(블랙록)이지만, 하단 네비게이션 등에서 이미 다른 카테고리(예: 캘린더)로
  // 먼저 전환해둔 상태로 진입했다면 그 카테고리를 존중함(안 그러면 비동기 로딩이 뒤늦게 firms로 덮어씀)
  insight: () => (insightActiveCategory === "firms" ? runInsight(insightActiveInstitution) : runInsightCategory(insightActiveCategory)),
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
  const displayName = TICKER_TO_KOREAN_NAME[symbol] || symbol;
  const watchlisted = isWatchlisted(symbol);
  return `
    <div class="search-result-row">
      <button type="button" class="search-result-left" data-symbol="${escapeHtml(symbol)}">
        ${tickerLogoHtml(symbol)}
        <span class="search-result-text">
          <span class="search-result-name">${escapeHtml(displayName)}</span>
          <span class="search-result-sub">${escapeHtml(symbol)} · 주식</span>
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
function logSearchEvent(symbol) {
  fetch(`${AUTH_ORIGIN}/search-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  }).catch(() => {});
}
function openSearchOverlay() {
  searchOverlay.style.display = "flex";
  requestAnimationFrame(() => searchOverlay.classList.add("open"));
  renderRecentSearches();
  renderPopularSearches();
  tickerInput.focus();
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
  kr: el("bottomNavKrBtn"),
  us: el("bottomNavUsBtn"),
  etf: el("bottomNavEtfBtn"),
  crypto: el("bottomNavCryptoBtn"),
  more: el("bottomNavMoreBtn"),
};
const bottomNavKrBtn = bottomNavButtons.kr;
const bottomNavUsBtn = bottomNavButtons.us;
function setBottomNavActive(key) {
  Object.entries(bottomNavButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === key));
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
function closeMorePanel() {
  morePanel.classList.remove("open");
  window.setTimeout(() => {
    morePanel.style.display = "none";
  }, 280);
}
morePanelBackdrop.addEventListener("click", closeMorePanel);
morePanelCloseBtn.addEventListener("click", closeMorePanel);
document.querySelectorAll(".more-panel-item:not(.more-panel-theme-row):not(.more-panel-item-active)").forEach((btn) => {
  btn.addEventListener("click", () => showToast("준비중인 기능입니다."));
});
// 상단 탭바에서 더보기로 이동한 4개 화면 + 캘린더 — 각 항목을 열면 그 화면만 보이도록 오버레이(시장/캘린더/기업상세)를 먼저 닫음
function showOnlyCarouselView(fn) {
  closeMorePanel();
  closeCompanyPanel();
  closeMarketPanel();
  closeCalendarPanel();
  setBottomNavActive(""); // 캐러셀 화면은 하단 네비 4버튼 어디에도 속하지 않으므로 active 해제
  fn();
}
el("morePanelWatchlistBtn").addEventListener("click", () => {
  appSectionMode = "stocks"; // 관심종목은 주식 섹션 화면이라 ETF/비트코인 모드 해제(2026-09-01)
  showOnlyCarouselView(() => switchTab(TAB_ORDER.indexOf("watchlist")));
  syncSectionHeader();
});
// 우측 상단 별 아이콘(2026-09-01 부활) — 어느 섹션에서든 통합 관심종목 화면으로 이동(지도의 별과 동일한 역할)
el("fhWatchlistBtn").addEventListener("click", () => {
  showOnlyCarouselView(() => switchTab(TAB_ORDER.indexOf("watchlist")));
});
// 제목줄 4탭 — 인기종목/기업가치/시장동향/인사이트 화면 전환(관심종목 탭은 하단 네비로 이동, 2026-09-01)
document.querySelectorAll(".fh-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.fhtab;
    if (key === "tab.popular") showOnlyCarouselView(() => openPopularStocks());
    else if (key === "tab.valuation") showOnlyCarouselView(() => activateRankingGroup("disclosure"));
    else if (key === "tab.trend") showOnlyCarouselView(() => (appSectionMode === "etf" ? openEtfTrend() : activateRankingGroup("market")));
    else showOnlyCarouselView(() => switchTab(TAB_ORDER.indexOf("insight")));
  });
});
// 랭킹 캡션("시가총액 상위 N개 확인") 옆 새로고침 — 제목줄 버튼에서 이동(2026-08-31, 관심종목·인사이트엔 없음).
// 스캔 캐시를 전부 비우고 현재 선택된 랭킹 항목을 현시간 기준으로 다시 검색함
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".rank-refresh-btn");
  if (!btn) return;
  if (document.querySelector('[data-scanning="1"]')) {
    showToast("검색 중입니다. 잠시만 기다려주세요");
    return;
  }
  RANK_SCAN_RESETTERS.forEach((reset) => { try { reset(); } catch {} });
  dividendRiskMetricsCache.clear();
  showToast("실시간 데이터로 다시 검색합니다");
  runRankingEntry(topRankingActiveIdx);
});
// 상위 30개 안내문 옆 "+더보기"(주황) — 제목줄 "전체" 버튼 삭제(2026-08-31) 대신 안내문 자리에서 바로
// 그 랭킹의 전체보기(load-more-btn)를 실행해 모든 종목을 이어서 검색
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".scope-more-btn");
  if (!btn) return;
  const scope = btn.closest(".carousel-panel") || document;
  const moreBtn = scope.querySelector(".load-more-btn");
  if (moreBtn) moreBtn.click();
  else showToast("이 화면에는 전체보기가 없습니다.");
});
el("morePanelValuationBtn").addEventListener("click", () => {
  appSectionMode = "stocks"; // 기업가치는 주식 전용 화면이라 ETF/비트코인 모드 해제(2026-09-01)
  showOnlyCarouselView(() => activateRankingGroup("disclosure"));
  syncSectionHeader();
});
el("morePanelTrendBtn").addEventListener("click", () => {
  showOnlyCarouselView(() => activateRankingGroup("market"));
});
el("morePanelInsightBtn").addEventListener("click", () => {
  showOnlyCarouselView(() => switchTab(TAB_ORDER.indexOf("insight")));
});
el("morePanelCalendarOverlayBtn").addEventListener("click", () => {
  closeMorePanel();
  closeCompanyPanel();
  closeMarketPanel();
  openCalendarPanel();
});
el("morePanelNewsInsightBtn").addEventListener("click", () => {
  closeMorePanel();
  switchTab(TAB_ORDER.indexOf("insight"));
  switchInsightCategory("news");
});
// 공지사항/앱 정보 모달 + 문의하기(메일 앱 연결)
el("morePanelNoticeBtn").addEventListener("click", () => {
  closeMorePanel();
  el("noticeModal").style.display = "flex";
});
el("noticeModalCloseBtn").addEventListener("click", () => {
  el("noticeModal").style.display = "none";
});
el("morePanelAboutBtn").addEventListener("click", () => {
  closeMorePanel();
  el("aboutModal").style.display = "flex";
});
el("aboutModalCloseBtn").addEventListener("click", () => {
  el("aboutModal").style.display = "none";
});
el("morePanelContactBtn").addEventListener("click", () => {
  closeMorePanel();
  window.location.href = "mailto:yeop2ad@gmail.com?subject=" + encodeURIComponent("[굴려볼까 문의]");
});

// ---------- 화면 테마(화이트/블랙) — 기본은 화이트, 선택은 localStorage에 저장해 다음 방문에도 유지 ----------
const THEME_KEY = "theme";
const themeLightBtn = el("themeLightBtn");
const themeDarkBtn = el("themeDarkBtn");
function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  themeLightBtn.classList.toggle("active", theme !== "dark");
  themeDarkBtn.classList.toggle("active", theme === "dark");
}
function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
}
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
themeLightBtn.addEventListener("click", () => setTheme("light"));
themeDarkBtn.addEventListener("click", () => setTheme("dark"));

// ---------- 언어(한국어/영문) — 접속 지역(타임존/브라우저 언어)에 따라 기본값 추정, 명시적으로 고른 뒤에만 저장 ----------
const I18N = {
  "market.kr": { ko: "한국주식", en: "KR" },
  "market.us": { ko: "미국주식", en: "US" },
  "tab.watchlist": { ko: "관심종목", en: "Watchlist" },
  "tab.popular": { ko: "인기종목", en: "Popular" },
  "tab.search": { ko: "간편검색", en: "Search" },
  "tab.valuation": { ko: "기업가치", en: "Value" },
  "tab.trend": { ko: "시장동향", en: "Trends" },
  "tab.insight": { ko: "인사이트", en: "Insight" },
  "nav.map": { ko: "지도", en: "Map" },
  "nav.ranking": { ko: "랭킹", en: "Ranking" },
  "nav.home": { ko: "홈", en: "Home" },
  "nav.calendar": { ko: "캘린더", en: "Calendar" },
  "nav.marketBtn": { ko: "시장", en: "Market" },
  "nav.etf": { ko: "ETF", en: "ETF" },
  "nav.crypto": { ko: "비트코인", en: "Bitcoin" },
  "nav.more": { ko: "더보기", en: "More" },
  "more.theme": { ko: "화면 테마", en: "Theme" },
  "more.theme.light": { ko: "화이트", en: "White" },
  "more.theme.dark": { ko: "블랙", en: "Black" },
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
const langKrBtn = el("langKrBtn");
const langUsBtn = el("langUsBtn");
function detectDefaultLang() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const nav = (navigator.language || "").toLowerCase();
    if (tz === "Asia/Seoul" || nav.startsWith("ko")) return "ko";
  } catch (e) {}
  return "en";
}
function applyLang(lang) {
  const isEn = lang === "en";
  document.documentElement.lang = isEn ? "en" : "ko";
  langKrBtn.classList.toggle("active", !isEn);
  langUsBtn.classList.toggle("active", isEn);
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const dict = I18N[node.getAttribute("data-i18n")];
    if (dict) node.textContent = isEn ? dict.en : dict.ko;
  });
  // 종목 상세(예: "AAPL 분석 - 굴려볼까" / "AAPL Analysis - Marketmap")를 보고 있는 중이 아닐 때만 앱 이름/슬로건 타이틀을 언어에 맞춰 갱신
  // (새 슬로건 자체에 " - "가 들어가므로 "분석 - "/"Analysis - " 패턴으로만 종목 상세를 판별)
  if (!/분석 - |Analysis - /.test(document.title)) {
    document.title = isEn ? "Marketmap - Compare, Analyze, Map Stocks" : "굴려볼까 - 실적비교, 내주식분석, 마켓맵";
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
applyLang(__savedLang || detectDefaultLang());
langKrBtn.addEventListener("click", () => setLang("ko"));
langUsBtn.addEventListener("click", () => setLang("en"));

// ---------- 상승/하락 색상(한국식 빨강-파랑 / 해외식 초록-빨강) — 지도 색상까지 공유하도록 localStorage 키를 공용으로 사용 ----------
const COLOR_SCHEME_KEY = "color_scheme";
const colorSchemeKrBtn = el("colorSchemeKrBtn");
const colorSchemeGlobalBtn = el("colorSchemeGlobalBtn");
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
  colorSchemeKrBtn.classList.toggle("active", !isGlobal);
  colorSchemeGlobalBtn.classList.toggle("active", isGlobal);
}
function setColorScheme(scheme) {
  applyColorScheme(scheme);
  try {
    localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  } catch (e) {}
}
let __savedScheme = null;
try {
  __savedScheme = localStorage.getItem(COLOR_SCHEME_KEY);
} catch (e) {}
applyColorScheme(__savedScheme || detectDefaultColorScheme());
colorSchemeKrBtn.addEventListener("click", () => setColorScheme("kr"));
colorSchemeGlobalBtn.addEventListener("click", () => setColorScheme("global"));

// 지도는 하단 네비에서 더보기 패널 항목으로 이동(2026-09-01) — 본체에서 보던 시장 그대로 지도 보기 연동
el("morePanelMapBtn").addEventListener("click", () => {
  const market = getWatchlistActiveMarket() === "KR" ? "domestic" : "overseas";
  window.location.href = `sector-map/index.html?market=${market}`;
});
// 관심종목은 하단 네비에서 더보기 패널 항목으로 복귀(2026-09-01, ETF·비트코인 버튼 신설로 자리 이동)
// 하단 한국주식/미국주식 — 해당 시장으로 전환하고 랭킹(기업가치) 화면을 보여줌(2026-08-31, 랭킹 버튼 대체).
// showOnlyCarouselView가 active를 전부 해제하므로 그 뒤에 켬 — 다른 버튼을 누르면 자연히 꺼짐
bottomNavKrBtn.addEventListener("click", () => {
  appSectionMode = "stocks";
  setAppMarketMode("kr");
  showOnlyCarouselView(() => activateRankingGroup("disclosure"));
  setBottomNavActive("kr");
  syncSectionHeader();
});
bottomNavUsBtn.addEventListener("click", () => {
  appSectionMode = "stocks";
  setAppMarketMode("us");
  showOnlyCarouselView(() => activateRankingGroup("disclosure"));
  setBottomNavActive("us");
  syncSectionHeader();
});
// 하단 ETF/비트코인(2026-09-01 신설) — 각자 섹션 모드로 전환하고 인기종목 화면부터 보여줌
bottomNavButtons.etf.addEventListener("click", () => {
  appSectionMode = "etf";
  etfPopularRegion = getWatchlistActiveMarket() === "KR" ? "kr" : "us";
  showOnlyCarouselView(() => openPopularStocks());
  setBottomNavActive("etf");
  syncSectionHeader();
});
bottomNavButtons.crypto.addEventListener("click", () => {
  appSectionMode = "crypto";
  showOnlyCarouselView(() => openPopularStocks());
  setBottomNavActive("crypto");
  syncSectionHeader();
});
// 간편검색은 하단 네비에서 더보기 패널 항목으로 이동(2026-08-31)
el("morePanelWizardBtn").addEventListener("click", () => {
  closeMorePanel();
  closeCompanyPanel();
  openSearchWizard();
});
// 시장은 하단 네비에서 더보기 패널 항목으로 이동(2026-09-01)
function openMarketFromNav() {
  setBottomNavActive("");
  closeMorePanel();
  closeCompanyPanel();
  openMarketPanel();
}
el("morePanelMarketBtn").addEventListener("click", openMarketFromNav);
bottomNavButtons.more.addEventListener("click", () => {
  openMorePanel();
});

// 섹터맵(지도) 하단 네비 버튼에서 넘어온 경우 해당 화면을 바로 열어줌(?open=market|calendar|more|search|wizard)
// 지도에서 이미 한 번 로드된 세션이라 스플래시 로딩 화면(z-index 300, 데이터 로드 끝나야 사라짐)까지 다시 기다릴 필요가
// 없으므로, 이 경우엔 스플래시를 즉시 건너뛰어 패널이 지연 없이 바로 보이도록 함(체감상 "바로 안 열린다"는 느낌 해소)
(() => {
  const openParam = new URLSearchParams(window.location.search).get("open");
  if (!openParam) return;
  window.__deepLinkOpen = openParam; // initApp의 기본 화면(기업가치) 부팅이 딥링크 화면을 덮어쓰지 않도록 표시
  loadingSplash.style.display = "none";
  history.replaceState(null, "", window.location.pathname); // 새로고침 시 다시 안 열리도록 쿼리스트링 제거
  // 이 아래 스크립트에 아직 초기화되지 않은 const(companyPanel 등)를 클릭 핸들러가 참조하므로,
  // 지금 바로 실행하면 TDZ 오류가 나 패널이 안 열림 — 스크립트 전체 실행이 끝난 다음 틱으로 미룸
  setTimeout(() => {
    const actions = {
      market: () => openMarketFromNav(),
      etf: () => bottomNavButtons.etf.click(),
      crypto: () => bottomNavButtons.crypto.click(),
      calendar: () => {
        closeCompanyPanel();
        openCalendarPanel();
      },
      more: () => bottomNavButtons.more.click(),
      search: () => searchOpenBtn.click(), // 지도 상단 돋보기 → 티커 검색 오버레이
      wizard: () => {
        // 간편검색 딥링크 — 하단 버튼이 더보기로 이동(2026-08-31)해 직접 위저드를 염
        closeCompanyPanel();
        openSearchWizard();
      },
      // 지도 하단 국내/해외 → 해당 시장으로 전환 + 기업가치 랭킹(ranking은 현재 모드 그대로 — 구버전 호환)
      "ranking-kr": () => bottomNavKrBtn.click(),
      "ranking-us": () => bottomNavUsBtn.click(),
      ranking: () => (getWatchlistActiveMarket() === "KR" ? bottomNavKrBtn : bottomNavUsBtn).click(),
      watchlist: () => showOnlyCarouselView(() => switchTab(TAB_ORDER.indexOf("watchlist"))), // 구버전 지도 딥링크 호환
    };
    const fn = actions[openParam];
    if (fn) fn();
  }, 0);
})();

// ---------- 시장/투데이: companyPanel과 동일한 슬라이드 오버레이 패턴(캐러셀 밖에서 독립 관리) ----------
let marketPanelOpen = false;
function openMarketPanel() {
  el("marketPanel").style.display = "flex";
  requestAnimationFrame(() => el("marketPanel").classList.add("open"));
  marketPanelOpen = true;
  startIndexAutoRefresh();
  runIndexTab();
  renderMarketWidget();
}
function closeMarketPanel() {
  el("marketPanel").classList.remove("open");
  window.setTimeout(() => { el("marketPanel").style.display = "none"; }, 280);
  marketPanelOpen = false;
  stopIndexAutoRefresh();
  setBottomNavActive("home");
}
el("marketPanelCloseBtn").addEventListener("click", closeMarketPanel);

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
    history.pushState(null, "", location.pathname);
    document.title = document.documentElement.lang === "en" ? "Marketmap - Compare, Analyze, Map Stocks" : "굴려볼까 - 실적비교, 내주식분석, 마켓맵";
  }
}
companyPanelCloseBtn.addEventListener("click", () => closeCompanyPanel());
companyPanelSearchBtn.addEventListener("click", openSearchOverlay);
companyPanelAlertBtn.addEventListener("click", () => alert("가격 알림 기능은 준비 중입니다."));

// 헤더의 종목이름/가격/등락률 표시 — 검정 배경 전체화면 상세 헤더용
function renderCompanyIdentity(ticker, quote, meta, changePct) {
  let displayName = TICKER_TO_KOREAN_NAME[ticker] || quote.longname || quote.shortname || meta.longName || ticker;
  // 암호화폐는 한글명(비트코인·페페 등)을 우선 표시, 없으면 "Cardano USD"의 " USD"만 떼고 표시(2026-09-01)
  if (sectionOfSymbol(ticker, quote.quoteType) === "crypto") displayName = cryptoKoName(ticker, displayName);
  const price = meta.regularMarketPrice;
  el("companyPanelLogoWrap").innerHTML = tickerLogoHtml(ticker);
  el("companyPanelName").textContent = displayName;
  // 제목 옆 섹션 마크(한국주식/미국주식/ETF/비트코인, 2026-09-01) — Yahoo quoteType이 있으면 그걸 우선 사용
  const sectionMarkEl = el("companyPanelSectionMark");
  if (sectionMarkEl) sectionMarkEl.outerHTML = sectionMarkHtml(ticker, quote && quote.quoteType).replace('class="section-mark"', 'class="section-mark" id="companyPanelSectionMark"');
  el("companyPanelPrice").textContent = price !== undefined && price !== null ? fmtPrice(price, meta.currency) : "";
  const pctEl = el("companyPanelChangePct");
  if (changePct !== null && changePct !== undefined) {
    const isUp = changePct >= 0;
    const arrow = isUp ? "▲" : "▼";
    const cls = isUp ? "delta-up" : "delta-down";
    pctEl.textContent = `${arrow} (${isUp ? "+" : ""}${changePct.toFixed(2)}%)`;
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
function addWatchlistGroup(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const groups = getWatchlistGroups();
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  groups.push({ id, name: trimmed });
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
function deleteWatchlistGroup(id) {
  let groups = getWatchlistGroups();
  if (groups.length <= 1) return; // 최소 1개 그룹은 유지
  groups = groups.filter((g) => g.id !== id);
  saveWatchlistGroups(groups);
  const fallbackId = groups[0].id; // 삭제된 그룹의 종목은 남은 첫 그룹으로 이동
  saveWatchlist(getWatchlist().map((w) => (w.groupId === id ? { ...w, groupId: fallbackId } : w)));
  if (getActiveWatchlistGroup() === id) setActiveWatchlistGroup(WATCHLIST_ALL_GROUP_ID);
}
function getActiveWatchlistGroup(market = getWatchlistActiveMarket()) {
  return localStorage.getItem(wlKey("watchlist_active_group_v1", market)) || WATCHLIST_ALL_GROUP_ID;
}
function setActiveWatchlistGroup(id, market = getWatchlistActiveMarket()) {
  localStorage.setItem(wlKey("watchlist_active_group_v1", market), id);
}

const WATCHLIST_SORT_OPTIONS = [
  { id: "manual", label: "직접설정순" },
  { id: "name", label: "이름순" },
  { id: "changePct", label: "등락률순" },
  { id: "price", label: "현재가순" },
];
function getWatchlistSort(market = getWatchlistActiveMarket()) {
  const id = localStorage.getItem(wlKey("watchlist_sort_v1", market));
  return WATCHLIST_SORT_OPTIONS.some((o) => o.id === id) ? id : "manual";
}
function setWatchlistSort(id, market = getWatchlistActiveMarket()) {
  localStorage.setItem(wlKey("watchlist_sort_v1", market), id);
}
function sortWatchlistRows(rows) {
  const mode = getWatchlistSort();
  const arr = [...rows];
  if (mode === "name") {
    arr.sort((a, b) => (TICKER_TO_KOREAN_NAME[a.symbol] || a.name).localeCompare(TICKER_TO_KOREAN_NAME[b.symbol] || b.name, "ko"));
  } else if (mode === "changePct") {
    arr.sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
  } else if (mode === "price") {
    arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  }
  // manual(직접설정순)은 저장된(추가된) 순서를 그대로 유지하므로 별도 정렬 없음
  return arr;
}

function addToWatchlist(symbol, groupId) {
  const sym = symbol.toUpperCase();
  if (isWatchlisted(sym)) return;
  const market = watchlistMarketOf(sym);
  const active = getActiveWatchlistGroup(market);
  const gid = groupId || (active === WATCHLIST_ALL_GROUP_ID ? WATCHLIST_DEFAULT_GROUP_ID : active);
  saveWatchlist([...getWatchlist(market), { symbol: sym, addedAt: Date.now(), groupId: gid }], market);
}
function removeFromWatchlist(symbol) {
  const sym = symbol.toUpperCase();
  const market = watchlistMarketOf(sym);
  saveWatchlist(getWatchlist(market).filter((w) => w.symbol !== sym), market);
}
function toggleWatchlist(symbol) {
  if (isWatchlisted(symbol)) removeFromWatchlist(symbol);
  else addToWatchlist(symbol);
  updateCompanyPanelWatchlistBtn(symbol);
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

// ---------- 관심종목 상단 그룹 탭 ----------
function wlGroupTabsHtml(groups, activeId) {
  const allTab = `<button type="button" class="wl-group-tab${activeId === WATCHLIST_ALL_GROUP_ID ? " active" : ""}" data-group-id="${WATCHLIST_ALL_GROUP_ID}">전체</button>`;
  const groupTabs = groups
    .map((g) => `<button type="button" class="wl-group-tab${activeId === g.id ? " active" : ""}" data-group-id="${escapeHtml(g.id)}">${escapeHtml(g.name)}</button>`)
    .join("");
  const addTab = `<button type="button" class="wl-group-tab wl-group-tab-add" id="wlGroupAddBtn">+ 새 그룹</button>`;
  return allTab + groupTabs + addTab;
}
el("wlGroupTabs").addEventListener("click", (e) => {
  if (e.target.closest("#wlGroupAddBtn")) {
    startInlineNewGroup();
    return;
  }
  if (e.target.closest(".wl-group-tab-rename-input, .wl-group-tab-rename-confirm")) return; // 인라인 이름변경 중엔 탭 전환 막음
  const tab = e.target.closest(".wl-group-tab");
  if (!tab) return;
  setActiveWatchlistGroup(tab.dataset.groupId);
  renderWatchlistList();
});
el("wlGroupManageBtn").addEventListener("click", () => openWlGroupModal());

// ---------- 관심종목 그룹 탭 — "기본" 등 그룹 탭을 길게 누르면 그 자리에서 바로 이름 변경, "+ 새 그룹"은 누르면 바로 입력창이 생김 ----------
function startInlineTabRename(tabBtn) {
  const groupId = tabBtn.dataset.groupId;
  const currentName = tabBtn.textContent;
  tabBtn.outerHTML = `<span class="wl-group-tab wl-group-tab-editing" data-group-id="${escapeHtml(groupId)}">
    <input type="text" class="wl-group-tab-rename-input" value="${escapeHtml(currentName)}" maxlength="12" />
    <button type="button" class="wl-group-tab-rename-confirm">✓</button>
  </span>`;
  const input = el("wlGroupTabs").querySelector(".wl-group-tab-rename-input");
  input.focus();
  input.select();
  const commit = () => {
    const name = input.value.trim();
    if (name) renameWatchlistGroup(groupId, name);
    renderWatchlistList();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderWatchlistList();
  });
  input.addEventListener("blur", () => window.setTimeout(commit, 150)); // 확인 버튼 클릭이 blur보다 먼저 잡히도록 살짝 지연
  el("wlGroupTabs").querySelector(".wl-group-tab-rename-confirm").addEventListener("click", commit);
}

function startInlineNewGroup() {
  const addBtn = el("wlGroupAddBtn");
  if (!addBtn) return;
  addBtn.outerHTML = `<span class="wl-group-tab wl-group-tab-editing" id="wlGroupNewInlineWrap">
    <input type="text" class="wl-group-tab-rename-input" id="wlGroupNewInlineInput" placeholder="새 그룹 이름" maxlength="12" />
    <button type="button" class="wl-group-tab-rename-confirm" id="wlGroupNewInlineConfirm">✓</button>
  </span>`;
  const input = el("wlGroupNewInlineInput");
  input.focus();
  const commit = () => {
    const id = addWatchlistGroup(input.value.trim());
    if (id) setActiveWatchlistGroup(id);
    renderWatchlistList();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderWatchlistList();
  });
  input.addEventListener("blur", () => window.setTimeout(commit, 150));
  el("wlGroupNewInlineConfirm").addEventListener("click", commit);
}

// 길게 누르기(long-press, 500ms) 감지 — "전체"/"+ 새 그룹"은 대상에서 제외
let wlGroupLongPressTimer = null;
function wlGroupLongPressStart(e) {
  const tab = e.target.closest(".wl-group-tab");
  if (!tab || tab.id === "wlGroupAddBtn" || tab.dataset.groupId === WATCHLIST_ALL_GROUP_ID || tab.classList.contains("wl-group-tab-editing")) return;
  wlGroupLongPressTimer = window.setTimeout(() => startInlineTabRename(tab), 500);
}
function wlGroupLongPressEnd() {
  if (wlGroupLongPressTimer) {
    window.clearTimeout(wlGroupLongPressTimer);
    wlGroupLongPressTimer = null;
  }
}
el("wlGroupTabs").addEventListener("pointerdown", wlGroupLongPressStart);
el("wlGroupTabs").addEventListener("pointerup", wlGroupLongPressEnd);
el("wlGroupTabs").addEventListener("pointerleave", wlGroupLongPressEnd);
el("wlGroupTabs").addEventListener("pointercancel", wlGroupLongPressEnd);

// ---------- 관심종목 그룹 관리 모달(이름 변경·삭제·추가) ----------
function wlGroupModalRowHtml(g) {
  return `
    <div class="wl-group-modal-row" data-group-id="${escapeHtml(g.id)}">
      <input type="text" class="wl-group-name-input" value="${escapeHtml(g.name)}" maxlength="12" />
      <button type="button" class="wl-group-row-btn wl-group-save-btn" title="이름 저장">✓</button>
      <button type="button" class="wl-group-row-btn wl-group-delete-btn" title="삭제">🗑</button>
    </div>`;
}
function renderWlGroupModal() {
  const groups = getWatchlistGroups();
  el("wlGroupModalBody").innerHTML = `
    <div class="wl-group-modal-list">${groups.map(wlGroupModalRowHtml).join("")}</div>
    <div class="wl-group-modal-new">
      <input type="text" id="wlGroupNewInput" class="wl-group-name-input" placeholder="새 그룹 이름" maxlength="12" />
      <button type="button" id="wlGroupNewAddBtn" class="wl-group-row-btn wl-group-save-btn" title="추가">+</button>
    </div>`;
}
function openWlGroupModal() {
  renderWlGroupModal();
  el("wlGroupModal").style.display = "flex";
}
function closeWlGroupModal() {
  el("wlGroupModal").style.display = "none";
}
el("wlGroupModalCloseBtn").addEventListener("click", closeWlGroupModal);
el("wlGroupModalBody").addEventListener("click", (e) => {
  const saveBtn = e.target.closest(".wl-group-save-btn");
  const deleteBtn = e.target.closest(".wl-group-delete-btn");
  const addBtn = e.target.closest("#wlGroupNewAddBtn");
  if (saveBtn) {
    const row = saveBtn.closest(".wl-group-modal-row");
    if (row) {
      renameWatchlistGroup(row.dataset.groupId, row.querySelector(".wl-group-name-input").value);
      renderWlGroupModal();
      renderWatchlistList();
    }
  } else if (deleteBtn) {
    const row = deleteBtn.closest(".wl-group-modal-row");
    if (row) {
      if (getWatchlistGroups().length <= 1) {
        alert("최소 1개의 그룹은 남아 있어야 합니다.");
        return;
      }
      deleteWatchlistGroup(row.dataset.groupId);
      renderWlGroupModal();
      renderWatchlistList();
    }
  } else if (addBtn) {
    const input = el("wlGroupNewInput");
    const id = addWatchlistGroup(input.value);
    if (id) {
      setActiveWatchlistGroup(id);
      renderWlGroupModal();
      renderWatchlistList();
    }
  }
});

// ---------- 관심종목 정렬 드롭다운 ----------
function wlSortMenuHtml() {
  const current = getWatchlistSort();
  return WATCHLIST_SORT_OPTIONS.map(
    (o) => `<button type="button" class="wl-sort-option${o.id === current ? " active" : ""}" data-sort-id="${o.id}">${o.label}</button>`
  ).join("");
}
const wlSortBtn = el("wlSortBtn");
const wlSortMenu = el("wlSortMenu");
wlSortBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (wlSortMenu.style.display !== "none") {
    wlSortMenu.style.display = "none";
    return;
  }
  wlSortMenu.innerHTML = wlSortMenuHtml();
  wlSortMenu.style.display = "block";
});
wlSortMenu.addEventListener("click", (e) => {
  const opt = e.target.closest(".wl-sort-option");
  if (!opt) return;
  setWatchlistSort(opt.dataset.sortId);
  wlSortMenu.style.display = "none";
  renderWatchlistList();
});
document.addEventListener("click", (e) => {
  if (wlSortMenu.style.display !== "none" && !e.target.closest(".wl-sort-wrap")) wlSortMenu.style.display = "none";
});

// ---------- 관심종목 종목추가·공유 버튼 ----------
el("wlAddStockBtn").addEventListener("click", () => openSearchOverlay());

async function shareWatchlist() {
  const groups = getWatchlistGroups();
  const activeGroup = getActiveWatchlistGroup();
  const list = getWatchlist().map((w) => (w.groupId ? w : { ...w, groupId: WATCHLIST_DEFAULT_GROUP_ID }));
  const filtered = activeGroup === WATCHLIST_ALL_GROUP_ID ? list : list.filter((w) => w.groupId === activeGroup);
  if (filtered.length === 0) {
    alert("공유할 관심종목이 없습니다.");
    return;
  }
  const groupName = activeGroup === WATCHLIST_ALL_GROUP_ID ? "전체" : (groups.find((g) => g.id === activeGroup) || {}).name || "관심종목";
  const lines = filtered.map((w) => `· ${TICKER_TO_KOREAN_NAME[w.symbol] || w.symbol} (${w.symbol})`);
  const text = `📌 내 관심종목 - ${groupName}\n${lines.join("\n")}\n\nmarketmap.kr`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `내 관심종목 - ${groupName}`, text });
      return;
    }
    throw new Error("no-web-share");
  } catch (err) {
    if (err && err.name === "AbortError") return; // 사용자가 공유 시트를 취소한 경우
    try {
      await navigator.clipboard.writeText(text);
      alert("관심종목 목록을 클립보드에 복사했습니다. 카카오톡 등에 붙여넣기 해보세요.");
    } catch {
      alert("공유에 실패했습니다.");
    }
  }
}
el("wlShareBtn").addEventListener("click", shareWatchlist);

// ---------- 투자성향 자기진단 테스트 ----------
// 성향(목표·기간)과 위험감수도(손실반응·재무여력)를 하나로 합친 6문항 미니 테스트.
// 문항별 답변은 1~4점이며 합산 점수(6~24)로 3단계 유형을 가른다.
const SELF_TEST_QUESTIONS = [
  {
    q: "지금 투자한 돈, 언제까지 안 써도 되나요?",
    options: ["6개월 이내에 필요할 수도 있다", "1~3년 안에는 쓸 일 없다", "3~5년은 묻어둘 수 있다", "5년 이상, 없어도 그만인 돈이다"],
  },
  {
    q: "보유 종목이 한 달 새 -20% 빠졌다면?",
    options: ["바로 팔아서 손실을 확정한다", "불안하지만 일단 지켜본다", "계획대로 계속 보유한다", "오히려 싸졌다고 더 산다"],
  },
  {
    q: "생활비 3~6개월치 비상금이 따로 있나요?",
    options: ["없다, 투자금이 사실상 비상금이다", "1~2개월치 정도 있다", "3~6개월치는 있다", "6개월치 이상 넉넉히 있다"],
  },
  {
    q: "요즘 가장 끌리는 투자처는?",
    options: ["예금·채권 등 원금보장형", "배당주·대형 우량주", "성장주·해외주식", "코인·테마주·레버리지 상품"],
  },
  {
    q: "포트폴리오를 얼마나 자주 들여다보나요?",
    options: ["한 번 넣으면 거의 안 본다", "분기에 한두 번 점검한다", "매주 시황을 챙겨본다", "거의 매일 시세를 확인·매매한다"],
  },
  {
    q: "둘 중 더 끌리는 선택지는?",
    options: ["원금보장 + 확정 연 4%", "원금 대부분 보장 + 연 4~8% 기대", "손실 가능 + 연 10~15% 기대", "반토막 날 수도 있지만 2배 수익 가능"],
  },
];
const SELF_TEST_TYPES = [
  {
    key: "safe",
    min: 6,
    max: 12,
    name: "안정추구형",
    emoji: "🐢",
    figure: "존 보글 (뱅가드 창업자)",
    desc: "원금을 지키는 게 최우선이에요. 화려하진 않아도 천천히, 꾸준하게 가는 걸 선호해요.",
    caution: "채권·현금 비중이 높아도 물가상승률만큼은 자산이 못 자랄 수 있으니 장기 목표엔 주식 비중을 완전히 0으로 두지 않는 게 좋아요. 안전자산이라도 신용등급·만기가 다르면 손실이 날 수 있으니 상품 성격을 꼭 확인하세요.",
    vanguardStock: 40,
  },
  {
    key: "balanced",
    min: 13,
    max: 18,
    name: "균형투자형",
    emoji: "⚖️",
    figure: "워런 버핏 (버크셔 해서웨이)",
    desc: "위험과 수익 사이 균형을 중시해요. 우량자산 중심으로 꾸준히 늘려가는 스타일이에요.",
    caution: "주식과 채권을 같이 담아도 하락장에선 둘 다 동반 하락할 수 있으니 완전한 방어 수단은 아니에요. 정기적으로(예: 분기 1회) 비중을 원래대로 재조정(리밸런싱)하지 않으면 시간이 지날수록 처음 설계한 균형에서 벗어나요.",
    vanguardStock: 60,
  },
  {
    key: "aggressive",
    min: 19,
    max: 24,
    name: "공격투자형",
    emoji: "🚀",
    figure: "캐시 우드 (ARK 인베스트)",
    desc: "변동성을 감수하고서라도 높은 수익을 추구해요. 하락도 기회로 보는 스타일이에요.",
    caution: "고수익을 노리는 만큼 단기간 반토막 수준의 손실도 감수해야 하니, 생활비 등 단기에 꼭 필요한 자금은 이 비중에 넣지 마세요. 레버리지·테마주 위주로만 몰아넣기보다 일부는 우량자산에 분산해야 변동성을 견디기 쉬워요.",
    vanguardStock: 80,
  },
];

const selfTestModal = el("selfTestModal");
const selfTestBody = el("selfTestBody");
let selfTestAnswers = [];
let selfTestCurrentQ = 0;
let selfTestResultType = null;
let selfTestActiveMethod = null; // "vanguard" | "bogle" | "age"
let selfTestAgeValue = "";

function openSelfTestModal() {
  selfTestAnswers = [];
  selfTestCurrentQ = 0;
  selfTestResultType = null;
  selfTestActiveMethod = null;
  selfTestModal.style.display = "flex";
  renderSelfTestQuestion();
}
function closeSelfTestModal() {
  selfTestModal.style.display = "none";
}
el("selfTestOpenBtn").addEventListener("click", openSelfTestModal);
el("selfTestModalCloseBtn").addEventListener("click", closeSelfTestModal);

function renderSelfTestQuestion() {
  const total = SELF_TEST_QUESTIONS.length;
  const qd = SELF_TEST_QUESTIONS[selfTestCurrentQ];
  const pct = Math.round((selfTestCurrentQ / total) * 100);
  selfTestBody.innerHTML = `
    <div class="self-test-progress-track"><div class="self-test-progress-fill" style="width:${pct}%;"></div></div>
    <p class="self-test-qnum">Q${selfTestCurrentQ + 1} / ${total}</p>
    <h3 class="self-test-question">${qd.q}</h3>
    <div class="self-test-options">
      ${qd.options.map((opt, i) => `<button type="button" class="self-test-option-btn" data-idx="${i}">${opt}</button>`).join("")}
    </div>`;
  selfTestBody.querySelectorAll(".self-test-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selfTestAnswers.push(Number(btn.dataset.idx) + 1);
      selfTestCurrentQ++;
      if (selfTestCurrentQ < total) renderSelfTestQuestion();
      else computeSelfTestResult();
    });
  });
}

function computeSelfTestResult() {
  const score = selfTestAnswers.reduce((a, b) => a + b, 0);
  selfTestResultType = SELF_TEST_TYPES.find((t) => score >= t.min && score <= t.max) || SELF_TEST_TYPES[1];
  selfTestActiveMethod = null;
  renderSelfTestResult();
}

function selfTestAllocationFor(method) {
  if (!selfTestResultType) return null;
  if (method === "vanguard") {
    const stock = selfTestResultType.vanguardStock;
    return { stock, bond: 100 - stock, label: "Vanguard LifeStrategy Funds 기준" };
  }
  if (method === "bogle") {
    return { stock: 60, bond: 40, label: "보글의 60/40 법칙 — 누구나 동일" };
  }
  if (method === "age") {
    if (!selfTestAgeValue) return null;
    const age = clamp(Number(selfTestAgeValue) || 0, 1, 99);
    const stock = clamp(100 - age, 0, 100);
    return { stock, bond: 100 - stock, label: `100 - 나이(${age}세) 기준` };
  }
  return null;
}

// compact(관심목록 상단 고정용)일 땐 "주식 60%"가 아니라 "60%"만 — 자리가 좁은 세그먼트는(전체 그래프에서만) 안에 안 넣고 아래에 따로 적음
function selfTestAllocBarHtml(alloc, { compact = false } = {}) {
  const NARROW_PCT = 22; // 이 % 미만이면 막대 안에 글자를 넣을 자리가 부족하다고 보고 아래로 뺌(전체 그래프에서만 해당)
  const stockNarrow = !compact && alloc.stock < NARROW_PCT;
  const bondNarrow = !compact && alloc.bond < NARROW_PCT;
  const stockText = compact ? `${alloc.stock}%` : stockNarrow ? "" : `주식 ${alloc.stock}%`;
  const bondText = compact ? `${alloc.bond}%` : bondNarrow ? "" : `현금·채권 ${alloc.bond}%`;
  return `
    ${compact ? "" : `<div class="self-test-alloc-label-row"><p class="self-test-alloc-label">${alloc.label}</p><button type="button" class="self-test-alloc-confirm-btn" id="selfTestAllocConfirmBtn">확인</button></div>`}
    <div class="self-test-alloc-bar${compact ? " self-test-alloc-bar-compact" : ""}">
      <div class="self-test-alloc-seg self-test-alloc-stock" style="width:${alloc.stock}%;">${stockText}</div>
      <div class="self-test-alloc-seg self-test-alloc-bond" style="width:${alloc.bond}%;">${bondText}</div>
    </div>
    ${stockNarrow || bondNarrow ? `<p class="self-test-alloc-below">
      <span class="self-test-alloc-below-item" style="width:${alloc.stock}%;">${stockNarrow ? `주식 ${alloc.stock}%` : ""}</span>
      <span class="self-test-alloc-below-item" style="width:${alloc.bond}%;">${bondNarrow ? `현금·채권 ${alloc.bond}%` : ""}</span>
    </p>` : ""}`;
}

// 방법을 하나 선택해 비중이 계산되면 그 결과를 저장해둬서, 관심목록 상단에도 계속 떠 있도록 함([[watchlistSelfTestPin]])
const SELF_TEST_PIN_KEY = "selftest_pinned_alloc_v1";
function updateSelfTestAllocBar() {
  const wrap = el("selfTestAllocWrap");
  if (!wrap) return;
  const alloc = selfTestActiveMethod ? selfTestAllocationFor(selfTestActiveMethod) : null;
  wrap.style.display = alloc ? "block" : "none";
  wrap.innerHTML = alloc ? selfTestAllocBarHtml(alloc) : "";
  if (alloc) {
    try {
      localStorage.setItem(SELF_TEST_PIN_KEY, JSON.stringify(alloc));
    } catch {}
    renderPinnedSelfTestBar();
    const confirmBtn = el("selfTestAllocConfirmBtn");
    if (confirmBtn) confirmBtn.addEventListener("click", closeSelfTestModal);
  }
}

// 관심목록 탭 상단에 마지막으로 계산된 자산배분 결과를 계속 고정 표시(자기진단 모달을 닫아도, 새로고침해도 유지됨)
function renderPinnedSelfTestBar() {
  const pin = el("watchlistSelfTestPin");
  if (!pin) return;
  let alloc = null;
  try {
    alloc = JSON.parse(localStorage.getItem(SELF_TEST_PIN_KEY));
  } catch {}
  if (!alloc || typeof alloc.stock !== "number" || typeof alloc.bond !== "number") {
    pin.innerHTML = "";
    return;
  }
  pin.innerHTML = `<div class="watchlist-selftest-pin">${selfTestAllocBarHtml(alloc, { compact: true })}</div>`;
}

function renderSelfTestResult() {
  const t = selfTestResultType;
  selfTestBody.innerHTML = `
    <div class="self-test-alloc-bar-wrap" id="selfTestAllocWrap" style="display:none;"></div>
    <div class="self-test-result-card">
      <div class="self-test-result-emoji">${t.emoji}</div>
      <p class="self-test-result-name">${t.name}</p>
      <p class="self-test-result-figure">대표 인물 — ${t.figure}</p>
      <p class="self-test-result-desc">${t.desc}</p>
      <p class="self-test-result-caution">⚠️ 투자 시 유의사항<br>${t.caution}</p>
    </div>
    <div class="self-test-method-list">
      <p class="self-test-method-label">이렇게 투자해보기</p>
      <button type="button" class="self-test-method-btn" data-method="vanguard">
        <span class="self-test-method-num">1</span>
        <span class="self-test-method-text"><b>내 투자성향 따라하기</b><br><span class="muted">Vanguard LifeStrategy Funds</span></span>
      </button>
      <button type="button" class="self-test-method-btn" data-method="bogle">
        <span class="self-test-method-num">2</span>
        <span class="self-test-method-text"><b>뱅가드 창업자 60/40 법칙</b><br><span class="muted">주식 60% : 채권 40%, 언제나 동일</span></span>
      </button>
      <button type="button" class="self-test-method-btn" data-method="age">
        <span class="self-test-method-num">3</span>
        <span class="self-test-method-text"><b>100-나이 법칙</b><br><span class="muted">나이가 들수록 채권·현금 비중을 늘려요</span></span>
      </button>
      <div id="selfTestAgeInputWrap" class="self-test-age-input-wrap" style="display:none;">
        <input type="number" id="selfTestAgeInput" placeholder="나이 입력" min="1" max="99" inputmode="numeric" />
        <button type="button" id="selfTestAgeApplyBtn">적용</button>
      </div>
    </div>
    <button type="button" class="self-test-retry-btn" id="selfTestRetryBtn">🔄 다시 진단하기</button>
    <p class="self-test-disclaimer">⚠️ 참고용 콘텐츠이며, 투자 자문이 아닙니다.</p>`;

  selfTestBody.querySelectorAll(".self-test-method-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const method = btn.dataset.method;
      selfTestBody.querySelectorAll(".self-test-method-btn").forEach((b) => b.classList.toggle("active", b === btn));
      el("selfTestAgeInputWrap").style.display = method === "age" ? "flex" : "none";
      selfTestActiveMethod = method;
      updateSelfTestAllocBar();
    });
  });
  // 결과가 나오는 즉시 첫 번째 방법("내 투자성향 따라하기")이 자동으로 선택된 상태로 보여줌
  selfTestBody.querySelector('.self-test-method-btn[data-method="vanguard"]')?.click();
  el("selfTestAgeApplyBtn").addEventListener("click", () => {
    const val = el("selfTestAgeInput").value;
    if (!val || Number(val) <= 0) {
      showToast("나이를 입력해주세요.");
      return;
    }
    selfTestAgeValue = val;
    updateSelfTestAllocBar();
  });
  el("selfTestRetryBtn").addEventListener("click", openSelfTestModal);
}

async function renderWatchlistList() {
  const statusEl = el("watchlistStatus");
  const listEl = el("watchlistList");

  renderPinnedSelfTestBar();
  syncMarketModeUI();

  const groups = getWatchlistGroups();
  const rawList = getWatchlist();
  let migrated = false; // 그룹 도입 이전에 저장된 항목엔 groupId가 없어 1회 마이그레이션
  const list = rawList.map((w) => {
    if (w.groupId) return w;
    migrated = true;
    return { ...w, groupId: WATCHLIST_DEFAULT_GROUP_ID };
  });
  if (migrated) saveWatchlist(list);

  const validIds = new Set([WATCHLIST_ALL_GROUP_ID, ...groups.map((g) => g.id)]);
  let activeGroup = getActiveWatchlistGroup();
  if (!validIds.has(activeGroup)) {
    activeGroup = WATCHLIST_ALL_GROUP_ID;
    setActiveWatchlistGroup(activeGroup);
  }
  el("wlGroupTabs").innerHTML = wlGroupTabsHtml(groups, activeGroup);
  el("wlSortBtnLabel").textContent = (WATCHLIST_SORT_OPTIONS.find((o) => o.id === getWatchlistSort()) || WATCHLIST_SORT_OPTIONS[0]).label;

  const filtered = activeGroup === WATCHLIST_ALL_GROUP_ID ? list : list.filter((w) => w.groupId === activeGroup);

  if (filtered.length === 0) {
    statusEl.style.display = "none";
    listEl.innerHTML = `<p class="muted" style="padding:12px 0;">${iconHtml("star")} 관심종목이 없습니다. 종목 상세 화면에서 별 아이콘을 눌러 추가해보세요.</p>`;
    return;
  }
  statusEl.style.display = "block";
  statusEl.textContent = "관심종목을 불러오는 중...";
  try {
    const rows = (
      await mapWithConcurrency(filtered, 5, async (w) => {
        try {
          const chart = await yahooChart(w.symbol, "5d");
          const snap = yahooSnapshot(chart);
          const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
          const volume = meta && meta.regularMarketVolume !== undefined ? meta.regularMarketVolume : null;
          return snap && { ...snap, symbol: w.symbol, name: w.symbol, time: snap.date, volume, currency: (meta && meta.currency) || "USD" };
        } catch {
          return null;
        }
      })
    ).filter(Boolean);
    statusEl.style.display = "none";
    const sorted = sortWatchlistRows(rows);
    listEl.innerHTML = sorted.length
      ? `<div class="idx-list">${sorted.map((r) => stockCardRowHtml(r, { sectionMark: true })).join("")}</div>`
      : `<p class="muted" style="padding:12px 0;">종목 정보를 불러오지 못했습니다.</p>`;
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "관심종목을 불러오지 못했습니다."}`;
  }
}

// ---------- 기업검색 위저드 (챗봇처럼 단계별로 질문 → 선택 → 다음 질문으로 넘어가는 검색 보드) ----------
let searchWizardStep = "root";
let searchWizardAnswers = {};

function openSearchWizard() {
  searchWizardStep = "root";
  searchWizardAnswers = {};
  el("searchWizardPanel").style.display = "flex";
  requestAnimationFrame(() => el("searchWizardPanel").classList.add("open"));
  renderSearchWizardStep();
}
function closeSearchWizard() {
  el("searchWizardPanel").classList.remove("open");
  window.setTimeout(() => { el("searchWizardPanel").style.display = "none"; }, 280);
}
el("searchWizardCloseBtn").addEventListener("click", closeSearchWizard);

function wizardUserName() {
  return "회원";
}

function renderSearchWizardStep() {
  const renderers = {
    root: renderWizardRoot,
    branchA: renderWizardBranchA,
    branchB1: renderWizardBranchB1,
    branchB2: renderWizardBranchB2,
    branchB3: renderWizardBranchB3,
    branchBResult: renderWizardBranchBResult,
    branchC: renderWizardBranchC,
    branchCStyle: renderWizardBranchCStyle,
    branchCResult: renderWizardBranchCResult,
  };
  el("searchWizardBody").innerHTML = renderers[searchWizardStep]();
}

// 패널 오픈 시가 아니라 스크립트 로딩 시 1회만 위임 리스너를 붙여서, innerHTML 교체마다 재바인딩할 필요가 없게 함
el("searchWizardBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wizard-action]");
  if (!btn) return;
  const action = btn.dataset.wizardAction;
  if (action === "back") {
    searchWizardStep = btn.dataset.wizardBackStep;
    renderSearchWizardStep();
  } else if (action === "root-a") {
    searchWizardStep = "branchA";
    renderSearchWizardStep();
  } else if (action === "root-b") {
    searchWizardStep = "branchB1";
    searchWizardAnswers = { sectors: [] };
    renderSearchWizardStep();
  } else if (action === "root-c") {
    searchWizardStep = "branchC";
    renderSearchWizardStep();
  } else if (action === "rank-nav") {
    closeSearchWizard();
    goToRankingEntry(Number(btn.dataset.rankIdx));
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
    closeSearchWizard();
    goToRankingEntry(RANKING_ENTRIES.findIndex((e) => e.label === "상승 압력"));
  } else if (action === "branchC-style-long") {
    closeSearchWizard();
    goToRankingEntry(RANKING_ENTRIES.findIndex((e) => e.label === "투자 안정"));
  } else if (action === "share") {
    shareWizardResult(wizardShareTitle, wizardShareText);
  } else if (action === "share-self") {
    copyWizardResultToSelf(wizardShareText);
  }
});

function renderWizardRoot() {
  const name = wizardUserName();
  return `
    <p class="wizard-question">${escapeHtml(name)}님, 투자할 기업을 찾고 계신가요?</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="root-a"><b>🏆 A. [랭킹찾기]</b> 각 부문별 랭킹으로 볼래요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-b"><b>🎯 B. [선택찾기]</b> 내가 좋아하는 분야가 있어요.</button>
      <button type="button" class="wizard-root-option" data-wizard-action="root-c"><b>🤖 C. [자동찾기]</b> 잘모르겠어요. 알아서 찾아주세요.</button>
    </div>
  `;
}

// [랭킹찾기]와 Top랭킹 탭이 공유하는 랭킹 화면 목록 — 사용자가 지정한 순서(2026-08-25 재정렬):
// 공시(group:"disclosure") 9개 + 시장(group:"market") 8개, Top랭킹에서는 이 group 기준으로 2줄 가로스크롤로 나눠 보여줌.
// EPS는 제거하고 영업이익률·ROE·부채비율·52주최저를 새로 추가함(모두 getFullMetrics의 직전분기 재무제표 기반).
const RANKING_ENTRIES = [
  { icon: "bank", label: "매출성장", tab: "valuation", group: "disclosure", run: () => runValueRevenue() },
  { icon: "dollar", label: "순이익증가", tab: "valuation", group: "disclosure", run: () => runValueNetIncome() },
  { icon: "coin", label: "배당률", tab: "trend", group: "disclosure", run: () => runTrendDividend() },
  { icon: "scale", label: "부채비율", tab: "valuation", group: "disclosure", run: () => runValueDebtRatio() },
  { icon: "wallet", label: "현금흐름 증가", tab: "valuation", group: "disclosure", run: () => runValueCashFlow() },
  { icon: "building", label: "시가총액", tab: "valuation", group: "disclosure", run: () => runValueMarketCap() },
  { icon: "scale", label: "영업이익률", tab: "valuation", group: "disclosure", run: () => runValueOperatingMargin() },
  { icon: "scale", label: "PER", tab: "valuation", group: "disclosure", run: () => runValuePer() },
  { icon: "medal", label: "ROE", tab: "valuation", group: "disclosure", run: () => runValueRoe() },
  { icon: "trending-down", label: "52주최저", tab: "valuation", group: "market", run: () => runValueWeek52Low() },
  { icon: "thumbsup", label: "거래대금", tab: "trend", group: "market", run: () => runTrendVolume() },
  { icon: "trending-up", label: "상승률", tab: "trend", group: "market", run: () => runMovers("surge") },
  { icon: "trending-down", label: "하락률", tab: "trend", group: "market", run: () => runMovers("plunge") },
  // KR ETF/US ETF는 하단 ETF 섹션의 시장동향으로 이동(2026-09-01 사용자 요청) — openEtfTrend 참고
  { icon: "rocket", label: "상승 압력", tab: "trend", group: "market", run: () => runTrendPressure(), orange: true },
  { icon: "medal", label: "투자 안정", tab: "valuation", group: "market", run: () => runValueStability(), orange: true },
];
// ---------- Top랭킹 탭 — 기업가치·투자동향을 통합한 화면. RANKING_ENTRIES를 그대로 재사용해 14개 항목을
// 가로 스크롤 서브내비로 보여주고, 클릭하면 valuationGroup/trendGroup 중 해당하는 쪽만 보이게 전환함 ----------
function showRankingGroup(tabKey) {
  el("valuationGroup").style.display = tabKey === "valuation" ? "block" : "none";
  el("trendGroup").style.display = tabKey === "trend" ? "block" : "none";
  const popularGroup = el("popularGroup");
  if (popularGroup) popularGroup.style.display = tabKey === "popular" ? "block" : "none";
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
function renderGroupSubNav(groupKey) {
  el("topRankingSubNav").innerHTML = RANKING_ENTRIES.map((entry, i) =>
    entry.group !== groupKey
      ? ""
      : `<button type="button" class="cat-btn top-ranking-tab${entry.orange ? " top-ranking-tab-orange" : ""}" data-rank-idx="${i}">${iconHtml(
          entry.icon
        )}<span>${entry.label}</span></button>`
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
  renderGroupSubNav(entry.group);
  runRankingEntry(idx);
}
// "기업가치"/"시장동향" 버튼 클릭 — 해당 그룹의 첫 항목으로 진입(재클릭 시에도 매번 새로 렌더링)
function activateRankingGroup(groupKey) {
  const idx = RANKING_ENTRIES.findIndex((e) => e.group === groupKey);
  if (idx >= 0) goToRankingEntry(idx);
}
el("tabValuationBtn").addEventListener("click", () => activateRankingGroup("disclosure"));
tabTrendBtn.addEventListener("click", () => activateRankingGroup("market"));

function renderWizardBranchA() {
  const items = RANKING_ENTRIES.map(
    (entry, i) =>
      `<button type="button" class="wizard-option-btn${entry.orange ? " wizard-option-btn-orange" : ""}" data-wizard-action="rank-nav" data-rank-idx="${i}">${iconHtml(entry.icon)} ${entry.label}</button>`
  ).join("");
  return `
    <p class="wizard-question">[랭킹찾기]에서 찾으실 항목을 선택해주세요.</p>
    <div class="wizard-option-grid">${items}</div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
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
  { key: "stability", icon: "medal", label: "투자 안정", dir: "desc", get: (m) => m.riskTotal, fmt: (m) => (m.riskTotal === null || m.riskTotal === undefined ? "N/A" : scoreRankColorHtml(m.riskTotal, m.riskTotal)) },
  { key: "marketCap", icon: "building", label: "시가총액", dir: "desc", get: (m) => m.marketCap, fmt: (m) => (m.marketCap ? fmtCompactCurrency(m.marketCap) : "N/A") },
  { key: "pressure", icon: "rocket", label: "상승 압력", dir: "desc", get: (m) => m.pressureTotal, fmt: (m) => (m.pressureTotal === null || m.pressureTotal === undefined ? "N/A" : scoreRankColorHtml(m.pressureTotal, m.pressureTotal)) },
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
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
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
    const { sp500Return } = await getMarketReturnsCached();
    let candidates = (await mapWithConcurrency(pool, 5, getFullMetrics)).filter(Boolean);
    candidates = candidates.map((m) => ({
      ...m,
      riskTotal: computeRiskScore(m, sp500Return).total,
      pressureTotal: computeAttractivenessScore(m).total,
    }));
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

function renderWizardBranchC() {
  return `
    <p class="wizard-question">S&amp;P500 전체에서 상승 압력 + 투자 안정 합계 순서로 30위까지 찾아 보겠습니다.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-confirm"><b>A. [확인]</b></button>
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-other"><b>B. [다른방법]</b></button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 뒤로</button>
  `;
}
function renderWizardBranchCStyle() {
  return `
    <p class="wizard-question">자신의 투자스타일 중 한 가지를 선택해주세요.</p>
    <div class="wizard-root-options">
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-short">
        <b>A. 단기적인 수익을 원함(▲600%~▼60%)</b><br><span class="wizard-option-sub">(거래대금, 매출성장, 최근3개월 상승률) — S&amp;P 500중 상승 압력 높은순위 30위까지</span>
      </button>
      <button type="button" class="wizard-root-option" data-wizard-action="branchC-style-long">
        <b>B. 장기적으로 안정적인 상승을 원함(▲60%~▼30%)</b><br><span class="wizard-option-sub">(재무안정, 안정적상승, 순이익률, 시가총액 높은 주식) — S&amp;P 500중 투자 안정 높은순위 30위까지</span>
      </button>
    </div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="branchC">← 뒤로</button>
  `;
}
function renderWizardBranchCResult() {
  return `
    <p class="wizard-question">S&amp;P500 전체 스캔 결과입니다.</p>
    <div id="wizardBranchCResultBody"><p class="muted">불러오는 중...</p></div>
    <button type="button" class="wizard-back-btn" data-wizard-action="back" data-wizard-back-step="root">← 처음으로</button>
  `;
}
async function runBranchCConfirm() {
  const bodyEl = el("wizardBranchCResultBody");
  bodyEl.innerHTML = `<p class="muted" id="wizardBranchCProgress">S&amp;P500 전체 종목을 확인하는 중... (최대 1분 정도 소요될 수 있어요)</p>`;
  try {
    const [tickers, { sp500Return }] = await Promise.all([getSP500Tickers(), getMarketReturnsCached()]);
    const progressEl = el("wizardBranchCProgress");
    const metricsList = await mapWithConcurrency(tickers, 5, getFullMetrics, (completed) => {
      if (progressEl) progressEl.textContent = `${completed}/${tickers.length} 종목 확인 중...`;
    });
    const scored = metricsList.filter(Boolean).map((m) => ({
      ...m,
      combinedTotal: Math.round((computeAttractivenessScore(m).total + computeRiskScore(m, sp500Return).total) * 10) / 10,
    }));
    scored.sort((a, b) => b.combinedTotal - a.combinedTotal);
    const top30 = scored.slice(0, 30);
    const table = wizardResultTableHtml(top30, "상승 압력+투자 안정 합계", (r) => `<b>${r.combinedTotal}</b>`);
    wizardShareTitle = "기업검색 결과 (자동찾기)";
    wizardShareText =
      `[자동찾기] S&P500 상승 압력+투자 안정 합계 TOP30\n` +
      top30.map((r, i) => `${i + 1}. ${r.symbol} (${r.combinedTotal}/20)`).join("\n") +
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
      <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></td>
      <td>${r.price !== undefined && r.price !== null ? priceChartLink(r.symbol, "$" + r.price.toFixed(2)) : "N/A"}</td>
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
function navigateToTicker(ticker, { push = true } = {}) {
  ticker = ticker.toUpperCase();
  if (push) {
    history.pushState({ ticker }, "", "?ticker=" + encodeURIComponent(ticker));
  }
  tickerInput.value = ticker;
  document.title = document.documentElement.lang === "en" ? `${ticker} Analysis - Marketmap` : `${ticker} 분석 - 굴려볼까`;
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
// 다트공시/브랜드평판순 탭은 국내·해외 콘텐츠가 완전히 달라(다트공시: 4대 지표 랭킹, 브랜드평판순: 3개 기관 순위)
// 아이콘·이름표까지 시장에 따라 통째로 바뀜 — insightActiveCategory 등은 이 시점엔 아직 선언 전(TDZ)이라
// 직접 참조하지 않고, 커스텀 이벤트로 느슨하게 연결해 뒤쪽(파일 하단)의 코드가 필요하면 구독하게 함
function syncDartTabForMarket() {
  const isKr = getWatchlistActiveMarket() === "KR";
  const iconEl = el("insightCatBrandIcon");
  const labelEl = el("insightCatBrandLabel");
  if (iconEl) iconEl.innerHTML = iconHtml(isKr ? "dart" : "trophy");
  if (labelEl) labelEl.textContent = isKr ? "다트공시" : "브랜드평판순";
  document.querySelectorAll(".brand-org-btn").forEach((b) => (b.style.display = isKr ? "none" : ""));
  document.querySelectorAll(".dart-metric-btn").forEach((b) => (b.style.display = isKr ? "" : "none"));
}
// "자산&투자사" 탭도 국내·해외 콘텐츠가 완전히 다름(국내: DART 5%룰 기관&자산운용사, 해외: 13F 자산운용사·투자회사)
// — 이름표만 여기서 즉시 바꾸고, 서브내비 전환·데이터 재조회는 dartTabForMarket과 동일하게 뒤쪽 marketmodechange 리스너에서 처리
function syncFirmsTabForMarket() {
  const isKr = getWatchlistActiveMarket() === "KR";
  const labelEl = el("insightCatFirmsLabel");
  if (labelEl) labelEl.textContent = isKr ? "기관&자산운용사" : "자산&투자사";
}
// 시장 표시 옆 네모 국기 SVG(2026-09-01 사용자 요청) — 작게 그려도 깔끔하도록 태극기는 태극 문양만,
// 성조기는 줄무늬+파란 캔튼+별점 6개로 단순화한 컬러 아이콘
const FLAG_SVG_KR = `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#fff" stroke="rgba(0,0,0,0.22)"/><g transform="translate(10.5,7) rotate(-15)"><path d="M-3.7 0 A3.7 3.7 0 0 1 3.7 0 Z" fill="#cd2e3a"/><path d="M-3.7 0 A3.7 3.7 0 0 0 3.7 0 Z" fill="#0047a0"/><circle cx="-1.85" cy="0" r="1.85" fill="#cd2e3a"/><circle cx="1.85" cy="0" r="1.85" fill="#0047a0"/></g></svg>`;
const FLAG_SVG_US = `<svg viewBox="0 0 21 14" width="21" height="14"><defs><clipPath id="fhUsFlagClip"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5"/></clipPath></defs><g clip-path="url(#fhUsFlagClip)"><rect x="0" y="0" width="21" height="14" fill="#fff"/><rect x="0" y="0.5" width="21" height="1.9" fill="#b22234"/><rect x="0" y="4.3" width="21" height="1.9" fill="#b22234"/><rect x="0" y="8.1" width="21" height="1.9" fill="#b22234"/><rect x="0" y="11.9" width="21" height="1.9" fill="#b22234"/><rect x="0" y="0" width="9.5" height="6.2" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.4" cy="1.8" r="0.55"/><circle cx="4.8" cy="1.8" r="0.55"/><circle cx="7.2" cy="1.8" r="0.55"/><circle cx="2.4" cy="4.2" r="0.55"/><circle cx="4.8" cy="4.2" r="0.55"/><circle cx="7.2" cy="4.2" r="0.55"/></g></g><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="none" stroke="rgba(0,0,0,0.22)"/></svg>`;

// ---------- 앱 섹션 모드(2026-09-01): 하단 네비의 한국주식/미국주식 = "stocks", ETF = "etf", 비트코인 = "crypto" ----------
// ETF·비트코인 섹션은 상단 제목줄에 자기 이름+로고를 표시하고, 탭은 인기종목/시장동향/인사이트 3개만 사용(기업가치 숨김)
let appSectionMode = "stocks";
const ICON_SVG_ETF = `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#2f6bd8" stroke="rgba(0,0,0,0.15)"/><text x="10.5" y="10" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif" letter-spacing="0.3">ETF</text></svg>`;
const ICON_SVG_BTC = `<svg viewBox="0 0 21 14" width="21" height="14"><circle cx="10.5" cy="7" r="6.6" fill="#f7931a"/><text x="10.6" y="9.9" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif">₿</text></svg>`;
// ---------- 섹션 마크(2026-09-01): 종목이 한국주식/미국주식/ETF/비트코인 중 어디 소속인지 작은 아이콘으로 표시 ----------
// 검색상세 상단 제목 옆·관심종목 목록의 종목 옆에 붙음. ETF 판별은 Yahoo quoteType(상세 화면) 또는 앱 내 ETF 목록 기준
let knownEtfSetCache = null;
function knownEtfSet() {
  if (!knownEtfSetCache) knownEtfSetCache = new Set([...US_ETF_TICKERS, ...KR_ETF_LIST.map((x) => x.t)]);
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
  // ETF·비트코인 섹션에선 제목줄 탭을 인기종목/시장동향/인사이트 3개만 노출(기업가치는 주식 전용)
  const valuationTab = document.querySelector('.fh-tab[data-fhtab="tab.valuation"]');
  if (valuationTab) valuationTab.style.display = appSectionMode === "stocks" ? "" : "none";
}

function syncMarketModeUI() {
  const isKr = getWatchlistActiveMarket() === "KR";
  document.body.dataset.marketMode = isKr ? "kr" : "us";
  marketModeKrBtn.classList.toggle("active", isKr);
  marketModeUsBtn.classList.toggle("active", !isKr);
  // 로고 오른쪽 현재 섹션 표시(한국주식/미국주식/ETF/비트코인) + 아이콘 — syncSectionHeader가 담당(2026-09-01)
  syncSectionHeader();
  syncFirmsTabForMarket();
  syncDartTabForMarket();
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
  renderWatchlistList();
}
marketModeKrBtn.addEventListener("click", () => setAppMarketMode("kr"));
marketModeUsBtn.addEventListener("click", () => setAppMarketMode("us"));
syncMarketModeUI();

window.addEventListener("popstate", () => {
  const ticker = new URLSearchParams(location.search).get("ticker");
  if (ticker) navigateToTicker(ticker, { push: false });
  else closeCompanyPanel({ push: false });
});

// 종목 심볼 클릭 시 기업 패널을 열며 해당 종목 분석으로 이동(TOP10·인기종목 표에 이벤트 위임으로 공통 적용)
document.addEventListener("click", (e) => {
  const link = e.target.closest(".ticker-link");
  if (link && link.dataset.ticker) {
    // 간편검색(위저드)·시장 패널 안의 종목을 눌렀을 때 그 창이 상세 화면을 가리지 않도록 먼저 닫음
    const wiz = el("searchWizardPanel");
    if (wiz && wiz.classList.contains("open")) closeSearchWizard();
    const mp = el("marketPanel");
    if (mp && mp.classList.contains("open")) closeMarketPanel();
    navigateToTicker(link.dataset.ticker);
  }
});

// ---------- 초기 부팅: 기본 화면은 "기업가치"(로그인 불필요) — ?ticker=가 있을 때만 기업 패널을 함께 염 ----------
(function initApp() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  // entry.run()이 참조하는 일부 const(예: VALUE_DISCLAIMER)가 이 시점엔 아직 선언 전(TDZ)이라
  // 스크립트 전체 실행이 끝난 다음 틱으로 미룸(companyPanel 딥링크 크래시와 동일한 원인/해법)
  // 단, 지도에서 ?open=watchlist/etf/crypto로 넘어온 경우엔 기본 화면(기업가치)이 그 화면을 덮어쓰지 않게 건너뜀(2026-09-01)
  setTimeout(() => { if (!["watchlist", "etf", "crypto"].includes(window.__deepLinkOpen)) activateRankingGroup("disclosure"); }, 0);

  const params = new URLSearchParams(location.search);
  const initialTicker = params.get("ticker");
  if (initialTicker) navigateToTicker(initialTicker, { push: false });
  loadingSplash.style.display = "none";

  // 무료 프록시 과부하를 피하려고 인사이트는 백그라운드로 미리 로딩(사용자가 먼저 스와이프해서 들어가면 ensureTabLoaded가 그 자리에서 바로 시작함)
  ensureTabLoaded("insight");
})();

// 한국어 회사명으로도 검색할 수 있도록 자주 찾는 미국 기업 위주로 별도 매핑(야후 검색 API는 한국어 매칭을 지원하지 않음)
const KOREAN_COMPANY_NAMES = {
  // 데이터셋 공식명("NAVER","현대차")과 다른 흔한 검색어 별칭 — 이름 자체가 다르면 name.includes(q) 부분일치로도 안 잡히므로 직접 등록
  네이버: "035420.KS",
  현대자동차: "005380.KS",
  애플: "AAPL",
  마이크로소프트: "MSFT",
  마소: "MSFT",
  구글: "GOOGL",
  알파벳: "GOOGL",
  아마존: "AMZN",
  엔비디아: "NVDA",
  테슬라: "TSLA",
  메타: "META",
  페이스북: "META",
  넷플릭스: "NFLX",
  에이엠디: "AMD",
  인텔: "INTC",
  마이크론: "MU",
  브로드컴: "AVGO",
  오라클: "ORCL",
  세일즈포스: "CRM",
  어도비: "ADBE",
  퀄컴: "QCOM",
  텍사스인스트루먼트: "TXN",
  아이비엠: "IBM",
  시스코: "CSCO",
  페이팔: "PYPL",
  우버: "UBER",
  에어비앤비: "ABNB",
  쇼피파이: "SHOP",
  팔란티어: "PLTR",
  코인베이스: "COIN",
  스노우플레이크: "SNOW",
  팔로알토네트웍스: "PANW",
  크라우드스트라이크: "CRWD",
  서비스나우: "NOW",
  스포티파이: "SPOT",
  디즈니: "DIS",
  나이키: "NKE",
  스타벅스: "SBUX",
  맥도날드: "MCD",
  코카콜라: "KO",
  펩시: "PEP",
  월마트: "WMT",
  코스트코: "COST",
  홈디포: "HD",
  타겟: "TGT",
  츄이: "CHWY",
  제이피모건: "JPM",
  제이피모간: "JPM",
  뱅크오브아메리카: "BAC",
  골드만삭스: "GS",
  비자: "V",
  마스터카드: "MA",
  존슨앤존슨: "JNJ",
  화이자: "PFE",
  모더나: "MRNA",
  일라이릴리: "LLY",
  유나이티드헬스: "UNH",
  엑슨모빌: "XOM",
  쉐브론: "CVX",
  보잉: "BA",
  포드: "F",
  제너럴모터스: "GM",
  에이티앤티: "T",
  버라이즌: "VZ",
  티에스엠씨: "TSM",
  알리바바: "BABA",
  니오: "NIO",
  리비안: "RIVN",
  루시드: "LCID",
  핀둬둬: "PDD",
  슈퍼마이크로: "SMCI",
  소파이: "SOFI",
  누홀딩스: "NU",
  로블록스: "RBLX",
  스냅: "SNAP",
  룰루레몬: "LULU",
  델: "DELL",
  마라톤디지털: "MARA",
  마벨: "MRVL",
  어플라이드머티리얼즈: "AMAT",
  웨스턴디지털: "WDC",
  아이온큐: "IONQ",
  인튜이티브서지컬: "ISRG",
  버크셔: "BRK-B",
  버크셔해서웨이: "BRK-B",

  // 추가 확장분(자주 찾는 미국 기업·별칭 위주)
  애브비: "ABBV",
  써모피셔: "TMO",
  액센츄어: "ACN",
  컴캐스트: "CMCSA",
  캐터필러: "CAT",
  허니웰: "HON",
  아메리칸익스프레스: "AXP",
  아멕스: "AXP",
  웰스파고: "WFC",
  씨티그룹: "C",
  씨티: "C",
  모건스탠리: "MS",
  블랙록: "BLK",
  프록터앤갬블: "PG",
  피앤지: "PG",
  필립모리스: "PM",
  알트리아: "MO",
  로우스: "LOW",
  티제이맥스: "TJX",
  부킹홀딩스: "BKNG",
  부킹: "BKNG",
  메리어트: "MAR",
  매리어트: "MAR",
  도어대시: "DASH",
  블록: "XYZ",
  스퀘어: "XYZ",
  로빈후드: "HOOD",
  드래프트킹스: "DKNG",
  카바나: "CVNA",
  카르바나: "CVNA",
  데이터독: "DDOG",
  클라우드플레어: "NET",
  몽고디비: "MDB",
  지스케일러: "ZS",
  옥타: "OKTA",
  유니티: "U",
  메르카도리브레: "MELI",
  징둥: "JD",
  바이두: "BIDU",
  리오토: "LI",
  리샹: "LI",
  샤오펑: "XPEV",
  치폴레: "CMG",
  제너럴일렉트릭: "GE",
  지이: "GE",
  레이시온: "RTX",
  록히드마틴: "LMT",
  노스럽그루먼: "NOC",
  존디어: "DE",
  디어: "DE",
  쓰리엠: "MMM",
  유피에스: "UPS",
  페덱스: "FDX",
  델타항공: "DAL",
  아메리칸항공: "AAL",
  유나이티드항공: "UAL",
  사우스웨스트: "LUV",
  카니발: "CCL",
  로열캐리비안: "RCL",
  힐튼: "HLT",
  코노코필립스: "COP",
  옥시덴탈: "OXY",
  슐럼버거: "SLB",
  넥스트에라: "NEE",
  듀크에너지: "DUK",
  서던컴퍼니: "SO",
  다우: "DOW",
  뉴몬트: "NEM",
  프리포트맥모란: "FCX",
  뉴코: "NUE",
  아리스타: "ANET",
  포티넷: "FTNT",
  인튜이트: "INTU",
  워크데이: "WDAY",
  아틀라시안: "TEAM",
  온세미: "ON",
  램리서치: "LRCX",
  케이엘에이: "KLAC",
  에이에스엠엘: "ASML",
  애널로그디바이스: "ADI",
  애보트: "ABT",
  다나허: "DHR",
  메드트로닉: "MDT",
  브리스톨마이어스: "BMY",
  암젠: "AMGN",
  길리어드: "GILD",
  리제네론: "REGN",
  버텍스: "VRTX",
  스트라이커: "SYK",
  보스턴사이언티픽: "BSX",
  처브: "CB",
  프로그레시브: "PGR",
  콜게이트: "CL",
  킴벌리클라크: "KMB",
  허쉬: "HSY",
  몬스터: "MNST",
  제너럴밀스: "GIS",
  크래프트하인즈: "KHC",
  몬델리즈: "MDLZ",
  이베이: "EBAY",
  핀터레스트: "PINS",
  트레이드데스크: "TTD",
  어펌: "AFRM",
  엔페이즈: "ENPH",
  퍼스트솔라: "FSLR",
  플러그파워: "PLUG",
  씨브이에스: "CVS",

  // 한국인 인기(서학개미) 개별주 한글명 추가분
  서클: "CRCL",
  스트래티지: "MSTR",
  마이크로스트래티지: "MSTR",
  쿠팡: "CPNG",
  암홀딩스: "ARM",
  로켓랩: "RKLB",
  셀시우스: "CELH",
  게임스탑: "GME",
  레딧: "RDDT",
  대만반도체: "TSM",
  타이완반도체: "TSM",
  하이닉스: "SKHY",
  에스케이하이닉스: "SKHY",
  에스케이하이닉스adr: "SKHY",

  // 브랜드평판순(Harris/RepTrak/YouGov) 목록에 있던 회사들 한글명 추가분
  아디다스: "ADDYY",
  아메리칸이글: "AEO",
  올스테이트: "ALL",
  베스트바이: "BBY",
  비엠더블유: "BMWYY",
  비피: "BP",
  브리지스톤: "BRDCY",
  에이비인베브: "BUD",
  버드와이저: "BUD",
  버버리: "BURBY",
  캐논: "CAJ",
  크래커배럴: "CBRL",
  차임: "CHYM",
  클로락스: "CLX",
  캐피탈원: "COF",
  달러제너럴: "DG",
  달러트리: "DLTR",
  돌: "DOLE",
  에스티로더: "EL",
  에너자이저: "ENR",
  폭스: "FOXA",
  갭: "GAP",
  굿이어: "GT",
  하얏트: "H",
  혼다: "HMC",
  할리데이비슨: "HOG",
  에이치피: "HPQ",
  인터컨티넨탈: "IHG",
  크로거: "KR",
  켄뷰: "KVUE",
  리바이스: "LEVI",
  엘지전자: "LGEIY",
  로레알: "LRLCY",
  라이브네이션: "LYV",
  메이시스: "M",
  마텔: "MAT",
  메르세데스벤츠: "MBGYY",
  벤츠: "MBGYY",
  미쉐린: "MGDDY",
  맥코믹: "MKC",
  나투라: "NTCO",
  닌텐도: "NTDOY",
  노보노디스크: "NVO",
  뉴웰브랜즈: "NWL",
  필립스: "PHG",
  파라마운트스카이댄스: "PSKY",
  레스토랑브랜즈: "QSR",
  페라리: "RACE",
  레킷벤키저: "RBGLY",
  롤스로이스: "RYCEY",
  스머커: "SJM",
  소니: "SONY",
  도요타: "TM",
  티모바일: "TMUS",
  언더아머: "UAA",
  유니레버: "UL",
  얼타뷰티: "ULTA",
  워너브라더스디스커버리: "WBD",
  더블유디사십: "WDFC",
  얌브랜즈: "YUM",
};

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
        const displayName = TICKER_TO_KOREAN_NAME[it.symbol] || it.name || it.symbol;
        return `<div class="chat-ticker-option" data-symbol="${escapeHtml(it.symbol)}">
            ${tickerLogoHtml(it.symbol)}
            <span class="chat-ticker-option-name">${escapeHtml(displayName)}</span>
            <span class="chat-ticker-option-sub">${escapeHtml(it.symbol)}${it.exchange ? ` · ${escapeHtml(it.exchange)}` : ""}</span>
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
    ];
    renderSuggest(koreanMatches.slice(0, 8));

    suggestTimer = setTimeout(async () => {
      let englishMatches = [];
      try {
        const data = await yahooSearch(q);
        englishMatches = ((data && data.quotes) || [])
          .filter((qt) => qt.symbol)
          .map((qt) => ({ symbol: qt.symbol, name: qt.shortname || qt.longname || "", exchange: normalizeExchange(qt) }));
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
function triggerSearch() {
  mainTickerSearchBar.trigger();
}
// 기업검색 위저드 상단의 검색 바 — 헤더 검색과 동일하게 동작하되, 종목 선택 시 위저드 패널을 닫고 기업 패널을 보여줌
attachTickerSearchBar(el("wizardTickerInput"), el("wizardTickerSuggest"), el("wizardAnalyzeBtn"), {
  onBeforeNavigate: closeSearchWizard,
});
let currentGroundData = null; // 투자 그라운드(52주 신고가~신저가 5등분)에 쓸 현재 종목의 데이터

async function runAnalysis(ticker) {
  analyzeBtn.disabled = true;
  results.style.display = "none";
  setStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    await krCreditRatingReady; // 한글 종목명 표시가 필요하므로 KR 신용등급/종목명 맵 로딩을 먼저 보장
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];

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

    // 나스닥·다우존스·S&P500 1년 수익률과, 분석 대상 자신의 지표(차트+재무제표)는
    // 경쟁사 비교(3)·상승압력도(5)·투자 안정성(6)·미래예측(요약 탭의 🔮 토글) 섹션이 각자 다시 조회하지 않고 공유해서
    // 프록시 요청 수를 줄이고(속도·안정성 향상) 값도 서로 어긋나지 않도록 함
    const marketReturnsPromise = getMarketReturns();
    const selfMetricsPromise = getFullMetrics(ticker);

    renderSummary(quote, meta, getDailyChangePercent(chartData), selfMetricsPromise, marketReturnsPromise).catch((e) => {
      el("summarySection").innerHTML = `<p class="error-inline">사업 요약을 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    if (!isCryptoDetail) {
      renderFinancials(ticker, meta.currency).catch((e) => {
        el("financialsSection").innerHTML = `<p class="error-inline">실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });

      renderQuarterlyEarnings(ticker, meta.currency).catch((e) => {
        el("quarterlyEarningsSection").innerHTML = `<p class="error-inline">분기 실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });

      renderSummaryScoreRow(selfMetricsPromise, marketReturnsPromise);

      renderPeers(ticker, selfMetricsPromise, quote.sector || quote.sectorDisp, quote.industryDisp || quote.industry).catch((e) => {
        el("peersSection").innerHTML = `<p class="error-inline">경쟁사 비교 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });
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

    if (!isCryptoDetail) {
      renderScore(selfMetricsPromise).catch((e) => {
        el("scoreSection").innerHTML = `<p class="error-inline">상승 압력 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });

      renderRisk(marketReturnsPromise, selfMetricsPromise).catch((e) => {
        el("riskSection").innerHTML = `<p class="error-inline">투자 안정성 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });

      renderMacro(ticker).catch((e) => {
        el("macroSection").innerHTML = `<p class="error-inline">거시경제 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
      });
    }

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
  return fmtPrice(v, currency);
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

// ---------- 기업검색 요약 페이지 4분할 서브탭(요약/매출액/invest점수/주요뉴스) ----------
const summarySubtabButtons = {
  summary: el("summarySubtabSummaryBtn"),
  revenue: el("summarySubtabRevenueBtn"),
  investscore: el("summarySubtabScoreBtn"),
  news: el("summarySubtabNewsBtn"),
};
const summarySubtabPanels = {
  summary: document.querySelector('[data-summary-subtabpanel="summary"]'),
  revenue: document.querySelector('[data-summary-subtabpanel="revenue"]'),
  investscore: document.querySelector('[data-summary-subtabpanel="investscore"]'),
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
function getSReportUniverse(isKr) {
  const key = isKr ? "kr" : "us";
  if (!sReportUniverseCache[key]) {
    const path = isKr ? "sector-map/data/kr-sectors.json" : "sector-map/data/sp500-sectors.json";
    sReportUniverseCache[key] = fetch(path, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return sReportUniverseCache[key];
}

const S_REPORT_METRICS = [
  { key: "revenueGrowth", label: "매출성장", unit: "pct", better: "high" },
  { key: "netIncomeGrowth", label: "순이익증가", unit: "pct", better: "high" },
  { key: "dividendYield", label: "배당률", unit: "pct2", better: "high" },
  { key: "debtRatio", label: "부채비율", unit: "levelPct", better: "low" },
  { key: "cashFlowGrowth", label: "현금흐름 증가", unit: "pct", better: "high" },
  { key: "marketCap", label: "시가총액", unit: "currency", better: "high" },
  { key: "operatingMargin", label: "영업이익률", unit: "pct", better: "high" },
  { key: "per", label: "PER", unit: "per", better: "low" },
  { key: "roe", label: "ROE", unit: "pct", better: "high" },
  { key: "week52RangePct", label: "52주최저", unit: "pct0", better: "low" },
  { key: "dollarVolume", label: "거래대금", unit: "currency", better: "high" },
  { key: "changePercent", label: "상승률", unit: "pct", better: "high", rankNote: "상승 기준" },
  { key: "changePercent", label: "하락률", unit: "pct", better: "low", rankNote: "하락 기준" },
  { key: "pressureScore", label: "상승 압력", unit: "score", better: "high" },
  { key: "stabilityScore", label: "투자 안정", unit: "score", better: "high" },
];

// 유니버스 전체(companies)에서 symbol의 순위를 계산 — better:"high"면 값이 클수록 1위, "low"면 값이 작을수록 1위.
// 값이 숫자가 아닌(N/A) 종목은 순위 계산 대상에서 아예 제외(전체 모수도 그만큼 줄어듦).
function computeUniverseRank(companies, symbol, getValue, better) {
  const valid = companies
    .map((c) => ({ symbol: c.symbol, v: getValue(c) }))
    .filter((x) => typeof x.v === "number" && Number.isFinite(x.v));
  if (!valid.length) return null;
  valid.sort((a, b) => (better === "high" ? b.v - a.v : a.v - b.v));
  const idx = valid.findIndex((x) => x.symbol === symbol);
  if (idx === -1) return null;
  return { rank: idx + 1, total: valid.length, value: valid[idx].v };
}

function sReportFmtValue(unit, v, currency) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "N/A";
  if (unit === "pct") return `<span class="${v >= 0 ? "delta-up" : "delta-down"}">${v >= 0 ? "+" : ""}${v.toFixed(1)}%</span>`;
  if (unit === "pct2") return `${v.toFixed(2)}%`;
  if (unit === "pct0") return `${v.toFixed(0)}%`;
  if (unit === "levelPct") return `${v.toFixed(1)}%`;
  if (unit === "per") return `${v.toFixed(1)}배`;
  if (unit === "score") return `${v.toFixed(1)}점`;
  if (unit === "currency") return fmtCompactCurrency(v, currency);
  return String(v);
}

function sReportRowHtml(r) {
  const labelHtml = r.rankNote
    ? `${escapeHtml(r.label)} <span class="muted" style="font-size:11px;">(${escapeHtml(r.rankNote)})</span>`
    : escapeHtml(r.label);
  if (r.na) {
    return `<tr><td>${labelHtml}</td><td colspan="2" class="muted">${escapeHtml(r.naReason || "데이터 없음")}</td></tr>`;
  }
  const valueHtml = sReportFmtValue(r.unit, r.value, r.currency) + (r.warnHtml || "");
  let rankHtml = `<span class="muted">순위 준비중</span>`;
  if (r.rankInfo) {
    const pct = (r.rankInfo.rank / r.rankInfo.total) * 100;
    const extreme = pct <= 10 ? " 🔥" : pct >= 90 ? " ⚠️" : "";
    rankHtml = `${r.rankInfo.rank}위 / ${r.rankInfo.total} <span class="muted" style="font-size:11px;">(상위 ${pct.toFixed(0)}%)</span>${extreme}`;
  }
  return `<tr><td>${labelHtml}</td><td>${valueHtml}</td><td>${rankHtml}</td></tr>`;
}

// 순위를 계산할 수 있었던 항목들의 평균 백분위(작을수록 상위권)를 기준으로 총평 한 줄을 생성.
// 상업적 조언으로 읽히지 않도록 "투자 자문이 아님"을 항상 붙이고, 단정적 매수/매도 표현은 쓰지 않음.
function sReportVerdict(avgPercentile) {
  if (avgPercentile === null) return "";
  if (avgPercentile <= 20) {
    return `🏆 <b>종합 평가: 상위권</b> — 순위를 계산할 수 있었던 항목들의 평균이 상위 ${avgPercentile.toFixed(0)}%로, 비교 대상 전체 종목 중에서도 우수한 지표가 많은 편입니다. 참고용 지표이며 투자 자문이 아닙니다.`;
  }
  if (avgPercentile >= 80) {
    return `⚠️ <b>종합 평가: 하위권</b> — 순위를 계산할 수 있었던 항목들의 평균이 하위 ${(100 - avgPercentile).toFixed(0)}%로, 비교 대상 전체 종목 대비 지표가 부진한 편입니다. 참고용 지표이며 투자 자문이 아니니 투자 판단은 다른 근거와 함께 신중히 내려주세요.`;
  }
  return `<b>종합 평가: 평균 수준</b> — 순위를 계산할 수 있었던 항목들의 평균이 상위 ${avgPercentile.toFixed(0)}% 수준으로, 비교 대상 전체 종목 대비 특별히 튀지 않는 평이한 지표 분포입니다. 참고용 지표이며 투자 자문이 아닙니다.`;
}

async function runSReport(symbol, selfMetricsPromise) {
  const isKr = isKrTicker(symbol);
  sReportInlineWrap.innerHTML = `<p class="muted" style="padding:12px 0;">⏳ S리포트를 계산하는 중...</p>`;

  // 배당컷/지연 경고는 유니버스 스냅샷에 없어서 이 종목 하나만 배당 이력을 조회해 랭킹 표와 동일한 "⚠️컷/⚠️지연"을 붙임(2026-08-31)
  const [universe, selfMetrics, divInfo] = await Promise.all([
    getSReportUniverse(isKr),
    selfMetricsPromise.catch(() => null),
    getDividendYieldInfo(symbol).catch(() => null),
  ]);

  if (!universe || !Array.isArray(universe.companies)) {
    sReportInlineWrap.innerHTML = `<p class="muted" style="padding:12px 0;">🚧 S리포트 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
    return;
  }
  const companies = universe.companies;
  const self = companies.find((c) => c.symbol === symbol);
  if (!self) {
    const universeLabel = isKr ? "코스피200+코스닥150" : "S&P500";
    sReportInlineWrap.innerHTML = `<p class="muted" style="padding:12px 0;">이 종목은 S리포트 비교 대상 유니버스(${universeLabel})에 포함되지 않아 순위를 계산할 수 없습니다.</p>`;
    return;
  }

  const currency = isKr ? "KRW" : "USD";
  const rows = S_REPORT_METRICS.map((m) => {
    if (m.key === "dollarVolume" && !isKr) {
      return { ...m, value: selfMetrics ? selfMetrics.recentDollarVolume : null, rankInfo: null, currency };
    }
    const rankInfo = computeUniverseRank(companies, symbol, (c) => c[m.key], m.better);
    const row = { ...m, value: self[m.key], rankInfo, currency };
    if (m.key === "dividendYield") {
      // 배치 스냅샷에 배당률이 비어 있으면 방금 조회한 실시간 값으로 대체하고, 랭킹 표와 동일한 컷/지연 경고를 붙임
      if ((row.value === null || row.value === undefined) && divInfo) row.value = divInfo.yieldPct;
      if (divInfo) row.warnHtml = dividendWarningHtml(divInfo);
    }
    return row;
  });

  const validRanks = rows.filter((r) => r.rankInfo);
  const avgPercentile = validRanks.length
    ? validRanks.reduce((sum, r) => sum + (r.rankInfo.rank / r.rankInfo.total) * 100, 0) / validRanks.length
    : null;

  const universeLabel = isKr ? "코스피200+코스닥150" : "S&P500";
  sReportInlineWrap.innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${universeLabel} ${companies.length}개 종목 기준 순위입니다(거래대금은 미국 종목의 경우 배치 데이터가 없어 순위 없이 실시간 값만 표시). 참고용 지표이며 투자 자문이 아닙니다.</p>
    <table class="s-report-table">
      <thead><tr><th>항목</th><th>수치</th><th>순위</th></tr></thead>
      <tbody>${rows.map(sReportRowHtml).join("")}</tbody>
    </table>
    ${sReportVerdict(avgPercentile) ? `<p class="s-report-verdict">${sReportVerdict(avgPercentile)}</p>` : ""}
  `;
}

// ---------- 1. 사업 요약 ----------
async function renderSummary(quote, meta, changePct, selfMetricsPromise, marketReturnsPromise) {
  el("summarySection").innerHTML = `<p class="muted">불러오는 중...</p>`;
  // 새 종목 검색 시 이전 종목의 과거분석/미래예측/s리포트 펼침 상태를 초기화(과거분석 3버튼 결과는 종목 무관이라 내용은 유지, 열림 상태만 접음)
  historicalInlineWrap.style.display = "none";
  futureInlineWrap.style.display = "none";
  sReportInlineWrap.style.display = "none";

  const rawCompanyName = quote.longname || quote.shortname || meta.longName || meta.symbol;
  // 암호화폐는 "Bitcoin USD"처럼 통화쌍 표기라 위키 검색·표시용 이름에서 " USD"를 떼어냄(2026-09-01)
  const companyName =
    sectionOfSymbol(meta.symbol || quote.symbol || "", quote.quoteType) === "crypto" ? rawCompanyName.replace(/\s+USD$/i, "") : rawCompanyName;
  let oneLiner = "사업 개요 정보를 찾을 수 없습니다.";
  try {
    oneLiner = await getBusinessSummaryKo(companyName);
    if (oneLiner.length > 220) oneLiner = oneLiner.slice(0, 217) + "...";
  } catch {
    // 위키백과 매칭 실패 시 안내 문구 유지
  }

  const industryEn = quote.industryDisp || quote.industry || "";
  const sectorEn = quote.sectorDisp || quote.sector || "";
  const industryKo = industryEn ? await translateToKorean(industryEn).catch(() => industryEn) : "";
  const sectorKo = sectorEn ? SECTOR_KO[sectorEn] || (await translateToKorean(sectorEn).catch(() => sectorEn)) : "";

  const symbol = meta.symbol || quote.symbol || "";

  // 지정 로고(override)가 있으면 그걸 쓰고, 없으면 기존 자동 소스(logo.dev/FMP) 사용
  const _logoOv = LOGO_OVERRIDE[symbol];
  const _logoSrc = logoSources(symbol, 128);
  const _logoBg = logoBg(symbol);
  const summaryLogoWrapStyle = _logoBg ? ` style="background:${_logoBg}"` : "";
  const summaryLogoImg = _logoOv
    ? `<img class="summary-ticker-logo" src="${_logoOv.src}" alt="${escapeHtml(symbol)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : `<img class="summary-ticker-logo" src="${_logoSrc.primary}" alt="${escapeHtml(symbol)}" ${_logoSrc.useFallback ? `data-fallback="${_logoSrc.fmp}"` : ""} onerror="${LOGO_ONERROR}" />`;

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
        <span>업종: <b>${escapeHtml(industryKo || "N/A")}</b></span>
        <span>섹터: <b>${escapeHtml(sectorKo || "N/A")}</b></span>
        <span>거래소: <b>${escapeHtml(krExchangeName(symbol) || quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>
        <span>현재가: <b>${fmtPrice(meta.regularMarketPrice ?? 0, meta.currency)}</b> ${changePct !== null && changePct !== undefined ? `<span class="${changePct >= 0 ? "delta-up" : "delta-down"}">(${fmtPct(changePct)})</span>` : ""}<a class="chart-link-btn" href="#" data-chart-symbol="${escapeHtml(symbol)}">📈 차트보기</a></span>
      </div>
      <div class="summary-action-row">
        <button type="button" class="summary-action-btn" id="tickerHistoricalToggleBtn" data-ticker="${escapeHtml(symbol)}">🕰️ 과거분석</button>
        <button type="button" class="summary-action-btn" id="tickerFutureToggleBtn" data-ticker="${escapeHtml(symbol)}">🔮 미래예측</button>
        <button type="button" class="summary-action-btn" id="tickerSReportToggleBtn">📄 s리포트</button>
      </div>
    </div>
    <div id="tickerHistoricalRow" style="display:none;"></div>
  `;

  const toggleBtn = el("tickerHistoricalToggleBtn");
  const futureToggleBtn = el("tickerFutureToggleBtn");
  const sReportToggleBtn = el("tickerSReportToggleBtn");
  const row = el("tickerHistoricalRow");

  const sections = [
    { btn: toggleBtn, els: [row, historicalInlineWrap] },
    { btn: futureToggleBtn, els: [futureInlineWrap] },
    { btn: sReportToggleBtn, els: [sReportInlineWrap] },
  ];
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

  let tickerHistoricalLoaded = false;
  toggleBtn.addEventListener("click", async () => {
    const isOpen = row.style.display !== "none";
    if (isOpen) {
      row.style.display = "none";
      historicalInlineWrap.style.display = "none";
      historicalInlineWrap.classList.remove("section-expanded");
      toggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(toggleBtn);
    row.style.display = "block";
    historicalInlineWrap.style.display = "block";
    historicalInlineWrap.classList.add("section-expanded");
    toggleBtn.classList.add("active");
    if (!tickerHistoricalLoaded) {
      tickerHistoricalLoaded = true;
      await runTickerHistorical(symbol, row);
    }
  });

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
    scrollChartToRight(el("futureChartContainer")); // 이미 그려져 있던 경우에도 오른쪽 끝부터
    if (!futureLoaded) {
      futureLoaded = true;
      await runFuturePrediction(symbol, selfMetricsPromise, marketReturnsPromise);
    }
  });

  let sReportLoaded = false;
  sReportToggleBtn.addEventListener("click", async () => {
    const isOpen = sReportInlineWrap.style.display !== "none";
    if (isOpen) {
      sReportInlineWrap.style.display = "none";
      sReportInlineWrap.classList.remove("section-expanded");
      sReportToggleBtn.classList.remove("active");
      return;
    }
    closeAllSections(sReportToggleBtn);
    sReportInlineWrap.style.display = "block";
    sReportInlineWrap.classList.add("section-expanded");
    sReportToggleBtn.classList.add("active");
    if (!sReportLoaded) {
      sReportLoaded = true;
      await runSReport(symbol, selfMetricsPromise);
    }
  });

  // 요약 탭 상단 가격 차트: 새 종목 조회 시 기간 버튼을 기본값(1년)으로 되돌리고 다시 그림
  Array.from(summaryChartPeriodNav.children).forEach((b) => b.classList.toggle("active", b.dataset.chartPeriod === "1y"));
  runSummaryChart(symbol, "1y");
}

// 차트보기 옆 "과거분석" 버튼용 — 해당 종목 1개만 기존 과거분석과 동일한 방식(현재 vs 1년 전 스냅샷)으로 비교
async function runTickerHistorical(ticker, container) {
  container.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);
    const [m, h] = await Promise.all([
      getFullMetrics(ticker),
      getHistoricalCompareMetrics(ticker, sp500PairsPromise),
    ]);
    const rows = buildHistoricalCompareRows([m], [h]);
    if (rows.length === 0) {
      container.innerHTML = `<p class="muted">이 종목은 과거 비교 데이터를 계산할 수 없습니다(최근 상장 등으로 1년 전 데이터가 없을 수 있습니다).</p>`;
      return;
    }
    container.innerHTML = historicalTableHtml(rows, "순위");
  } catch (err) {
    container.innerHTML = `<p class="error-inline">과거분석 데이터를 가져오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 요약 카드 아래에 상승압력도·투자 안정성·거시경제 점수를 한눈에 보는 작은 원형 배지로 가로 배치(상세 근거는 5·6·7번 섹션 참고)
async function renderSummaryScoreRow(selfMetricsPromise, marketReturnsPromise) {
  const rowEl = el("summaryScoreRow");
  try {
    const [metrics, { sp500Return, kospi200Return }] = await Promise.all([selfMetricsPromise, marketReturnsPromise, krCreditRatingReady]);
    const isKr = isKrTicker(metrics.symbol);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, sp500Return, kospi200Return);
    const isIPO = isRecentIPO(metrics.firstTradeDate);

    let macroBadgeHtml;
    if (isKr) {
      const fomo = await getKrFomoMetrics().catch(() => ({ score: null, changeAbs: null }));
      macroBadgeHtml = `
        <div class="mini-score-circle macro"${fomoBgStyleAttr(fomo.score)}>${fomoDisplayValue(fomo.score)}</div>
        <span class="mini-score-label">KOSPI 공포지수${fomoLineHtml(fomo.score, fomo.changeAbs)}</span>
      `;
    } else {
      const macroMetrics = await getMacroMetrics().catch(() => ({ vix: null }));
      const vix = macroMetrics.vix;
      const vixGradeShortLabel = vixGrade(vix).label.replace(/\s*\(.*\)$/, ""); // 원판 안엔 "패닉 (투자 황금기)" 대신 짧은 등급명("안심"/"경계"/"공포"/"패닉")만
      macroBadgeHtml = `
        <div class="mini-score-circle macro"${scoreBgStyleAttr(vix, 10, 50, "fear")}>${vixGradeShortLabel}</div>
        <span class="mini-score-label">S&amp;P 공포지수${vixLineHtml(macroMetrics, "VIX")}</span>
      `;
    }

    rowEl.innerHTML = `
      <div class="mini-score">
        <div class="mini-score-circle">${isIPO ? "IPO" : attractiveness.total}</div>
        <span class="mini-score-label">상승 압력</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle risk">${isIPO ? "IPO" : risk.total}</div>
        <span class="mini-score-label">투자 안정</span>
      </div>
      <div class="mini-score">
        ${macroBadgeHtml}
      </div>
    `;
  } catch {
    rowEl.innerHTML = "";
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

// ---------- 2. 매출/EPS 3년 추이 ----------
async function renderFinancials(ticker, quoteCurrency) {
  el("financialsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const data = await yahooFundamentals(ticker, "annualTotalRevenue,annualBasicEPS,annualNetIncome");
  const resultArr = data && data.timeseries && data.timeseries.result;
  if (!resultArr || resultArr.length === 0) {
    el("financialsSection").innerHTML = `<p class="muted">실적 데이터를 찾을 수 없습니다.</p>`;
    return null;
  }

  // 재무제표가 시세와 다른 현지 통화로 내려오는 해외 상장 종목(예: TSM은 매출이 TWD로 내려옴)은
  // 환율을 적용해 시세와 같은 통화로 환산 — 연도별로 동일한 보고 통화를 쓴다고 가정하고 환율은 한 번만 조회
  const reportCurrency = findReportCurrency(resultArr, ["annualTotalRevenue", "annualBasicEPS", "annualNetIncome"]);
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  const convert = (raw) => (raw === null || raw === undefined ? null : fxRate !== null ? raw * fxRate : null);

  const byYear = {};
  for (const block of resultArr) {
    const revItems = block.annualTotalRevenue || [];
    const epsItems = block.annualBasicEPS || [];
    const netIncomeItems = block.annualNetIncome || [];
    for (const item of revItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].revenue = convert(item.reportedValue?.raw);
    }
    for (const item of epsItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].eps = convert(item.reportedValue?.raw);
    }
    for (const item of netIncomeItems) {
      if (!item || !item.asOfDate) continue;
      const year = item.asOfDate.slice(0, 4);
      byYear[year] = byYear[year] || {};
      byYear[year].netIncome = convert(item.reportedValue?.raw);
    }
  }

  const years = Object.keys(byYear).sort();
  const recentYears = years.slice(-4);

  if (recentYears.length === 0) {
    el("financialsSection").innerHTML = `<p class="muted">실적 데이터를 찾을 수 없습니다.</p>`;
    return null;
  }

  let rows = "";
  for (let i = 0; i < recentYears.length; i++) {
    const year = recentYears[i];
    const cur = byYear[year];
    const prevYear = recentYears[i - 1];
    const prev = prevYear ? byYear[prevYear] : null;

    let revDelta = "-";
    let epsDelta = "-";
    if (prev) {
      if (prev.revenue && cur.revenue !== null && cur.revenue !== undefined) {
        const revChange = ((cur.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100;
        revDelta = `<span class="${revChange >= 0 ? "delta-up" : "delta-down"}">${fmtPct(revChange)}</span>`;
      }
      if (prev.eps && cur.eps !== null && cur.eps !== undefined) {
        const epsChange = ((cur.eps - prev.eps) / Math.abs(prev.eps)) * 100;
        epsDelta = `<span class="${epsChange >= 0 ? "delta-up" : "delta-down"}">${fmtPct(epsChange)}</span>`;
      }
    }

    const netIncomeCell =
      cur.netIncome === null || cur.netIncome === undefined
        ? "N/A"
        : `<span class="net-income-cell ${cur.netIncome >= 0 ? "positive" : "negative"}">${fmtCompactCurrency(cur.netIncome, quoteCurrency)}</span>`;

    rows += `
      <tr>
        <td>${escapeHtml(year)}</td>
        <td>${fmtCompactCurrency(cur.revenue, quoteCurrency)}</td>
        <td>${revDelta}</td>
        <td>${cur.eps !== null && cur.eps !== undefined ? fmtEpsValue(cur.eps, quoteCurrency) : "N/A"}</td>
        <td>${epsDelta}</td>
        <td>${netIncomeCell}</td>
      </tr>
    `;
  }

  const maxRevenue = Math.max(...recentYears.map((y) => byYear[y].revenue || 0), 1);
  const revBars = recentYears
    .map((y) => {
      const rev = byYear[y].revenue;
      const netIncome = byYear[y].netIncome;
      const pct = clamp(((rev || 0) / maxRevenue) * 100, 2, 100);

      let lossZoneContent = "";
      let profitOverlay = "";
      if (netIncome !== null && netIncome !== undefined && rev) {
        const marginPct = (netIncome / rev) * 100;
        if (netIncome > 0) {
          const profitPct = clamp((netIncome / maxRevenue) * 100, 0, pct);
          profitOverlay = `<div class="bar-fill-profit" style="width:${profitPct}%"><span class="profit-label">+${marginPct.toFixed(0)}%</span></div>`;
        } else if (netIncome < 0) {
          // 순손실 비율(매출 대비, 절대값)이 100% 이상이면 그래프 최대, 0%에 가까울수록 작아짐
          const lossPct = clamp(Math.abs(marginPct), 2, 100);
          lossZoneContent = `<div class="bar-loss" style="width:${lossPct}%"></div><span class="loss-label">-${Math.abs(marginPct).toFixed(0)}%</span>`;
        }
      }

      return `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(y)}</span>
        <div class="bar-loss-zone">${lossZoneContent}</div>
        <div class="bar-track">
          <div class="bar-fill self" style="width:${pct}%"></div>
          ${profitOverlay}
          <span class="bar-revenue-label">${fmtCompactCurrency(rev, quoteCurrency)}</span>
        </div>
      </div>`;
    })
    .join("");

  el("financialsSection").innerHTML = `
    <table class="fin-table">
      <thead>
        <tr><th>연도</th><th>매출액</th><th>YoY</th><th>EPS</th><th>YoY</th><th>순이익</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="bar-chart">${revBars}</div>
  `;

  const lastYear = recentYears[recentYears.length - 1];
  return byYear[lastYear]?.eps ?? null;
}

// ---------- 2+. 최근 분기 실적(최근 3개) + 다음 분기 가이던스(1개) ----------
// ⚠️ Yahoo의 quoteSummary(earningsHistory/earningsTrend/calendarEvents)와 v7/finance/quote는 최근 "Invalid Crumb"
// 인증 요구로 이 앱의 무인증 프록시로는 접근이 막혀 있어(실제 발표일·애널리스트 컨센서스를 제공하는 유일한 소스),
// 실제 기업 가이던스·컨센서스 추정치를 가져올 방법이 없음. 대신 fundamentals-timeseries(무인증, 정상 동작)의
// 분기별 매출/순이익 실적만으로 4번째(다음 분기) 막대를 "최근 분기 대비 성장률 기반 추정치"로 계산해 표시하고,
// 발표일도 정확한 발표일이 아닌 회계분기 마감일(asOfDate)로 표시 — 라벨과 캡션에 명확히 "추정" 표기해 오해를 방지함.
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

const QBAR_REVENUE_COLOR = "#2f6fed";
const QBAR_EPS_COLOR = "#94a3b8";
const QBAR_PRED_COLOR = "#d97706";

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

// 분기별 매출액/영업이익/순이익 3막대 그래프(같은 통화라 단일 왼쪽 축) — 2026-08-31 EPS 듀얼축에서 개편.
// 각 분기마다 "그 분기 이전 데이터만으로 계산했다면 나왔을 예측치"(pred*)를 노란 선으로 실제 막대 위에 겹쳐 비교하고,
// 아직 발표되지 않은 마지막 분기는 실제 막대 없이 예측선만 표시됨. 음수(적자) 분기는 0 기준선 자리에 2px 막대로만 표시.
function buildRevenueProfitChartSvg(quarters, quoteCurrency) {
  const W = 780,
    H = 380;
  const ML = 78,
    MR = 16,
    MT = 40,
    MB = 46;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const N = quarters.length;

  const series = [
    { val: "revenue", pred: "predRevenue", color: QBAR_REVENUE_COLOR, label: "매출액" },
    { val: "op", pred: "predOp", color: "#e08a2c", label: "영업이익" },
    { val: "net", pred: "predNet", color: QBAR_EPS_COLOR, label: "순이익" },
  ];
  const maxV = Math.max(1, ...quarters.flatMap((q) => series.flatMap((s) => [q[s.val] || 0, q[s.pred] || 0])));
  const step = niceStepGeneric(maxV / 5);
  const top = Math.ceil(maxV / step) * step || 1;

  const groupW = PW / N;
  const barW = groupW * 0.19;
  const gap = groupW * 0.045;

  let gridSvg = "";
  for (let i = 0; i <= 5; i++) {
    const v = (top / 5) * i;
    const y = MT + PH - (v / top) * PH;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML + PW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${chartGrid()}" stroke-width="1" />`;
    gridSvg += `<text x="${(ML - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${chartAxisText()}">${fmtAmountUnified(v, quoteCurrency)}</text>`;
  }

  let barsSvg = "";
  let labelsSvg = "";
  const totalW = series.length * barW + (series.length - 1) * gap;
  quarters.forEach((q, i) => {
    const cx = ML + groupW * i + groupW / 2;
    series.forEach((s, si) => {
      const x = cx - totalW / 2 + si * (barW + gap);
      const v = q[s.val];
      if (v !== null && v !== undefined) {
        const h = Math.max((Math.max(v, 0) / top) * PH, 2);
        const y = MT + PH - h;
        barsSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${s.color}" rx="2" />`;
      }
      const pv = q[s.pred];
      if (pv !== null && pv !== undefined) {
        const py = MT + PH - Math.max((Math.max(pv, 0) / top) * PH, 2);
        barsSvg += `<line x1="${x.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(x + barW).toFixed(1)}" y2="${py.toFixed(1)}" stroke="${QBAR_PRED_COLOR}" stroke-width="3" stroke-linecap="round" />`;
      }
    });
    labelsSvg += `<text x="${cx.toFixed(1)}" y="${(MT + PH + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="${chartAxisText()}">${escapeHtml(q.label)}</text>`;
  });

  const legendY = 20;
  let legend = "";
  let lx = ML;
  series.forEach((s) => {
    legend += `<circle cx="${lx}" cy="${legendY}" r="4" fill="${s.color}" /><text x="${lx + 10}" y="${legendY + 4}" font-size="11" fill="${chartAxisText()}">${s.label}</text>`;
    lx += 10 + s.label.length * 12 + 24;
  });
  legend += `<line x1="${lx}" y1="${legendY}" x2="${lx + 12}" y2="${legendY}" stroke="${QBAR_PRED_COLOR}" stroke-width="3" stroke-linecap="round" /><text x="${lx + 16}" y="${legendY + 4}" font-size="11" fill="${chartAxisText()}">예측선</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="분기별 매출액/영업이익/순이익 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${chartBg()}" />
    ${legend}
    ${gridSvg}
    ${barsSvg}
    ${labelsSvg}
  </svg>`;
}

async function renderQuarterlyEarnings(ticker, quoteCurrency) {
  el("quarterlyEarningsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const data = await yahooFundamentals(ticker, "quarterlyTotalRevenue,quarterlyOperatingIncome,quarterlyNetIncome");
  const resultArr = data && data.timeseries && data.timeseries.result;
  if (!resultArr || resultArr.length === 0) {
    el("quarterlyEarningsSection").innerHTML = `<p class="muted">분기 실적 데이터를 찾을 수 없습니다.</p>`;
    return;
  }

  const reportCurrency = findReportCurrency(resultArr, ["quarterlyTotalRevenue", "quarterlyOperatingIncome", "quarterlyNetIncome"]);
  const fxRate =
    reportCurrency && quoteCurrency && reportCurrency !== quoteCurrency ? await getFxRate(reportCurrency, quoteCurrency) : 1;
  const convert = (raw) => (raw === null || raw === undefined ? null : fxRate !== null ? raw * fxRate : null);

  const byDate = {};
  const collect = (blockKey, outKey) => {
    for (const block of resultArr) {
      for (const item of block[blockKey] || []) {
        if (!item || !item.asOfDate) continue;
        byDate[item.asOfDate] = byDate[item.asOfDate] || {};
        byDate[item.asOfDate][outKey] = convert(item.reportedValue?.raw);
      }
    }
  };
  collect("quarterlyTotalRevenue", "revenue");
  collect("quarterlyOperatingIncome", "op");
  collect("quarterlyNetIncome", "net");

  const dates = Object.keys(byDate).sort();
  const recent = dates.slice(-4).map((d) => ({ date: d, revenue: byDate[d].revenue, op: byDate[d].op, net: byDate[d].net }));

  if (recent.length === 0) {
    el("quarterlyEarningsSection").innerHTML = `<p class="muted">분기 실적 데이터를 찾을 수 없습니다.</p>`;
    return;
  }

  // 각 분기마다 "그 분기 이전 데이터만으로 계산했다면 나왔을 예측치"를 역산(노란 예측선용) — 앞선 데이터가 없는 초기 분기는 null
  const recentWithPred = recent.map((q) => {
    const idx = dates.indexOf(q.date);
    const priorQuarters = dates.slice(Math.max(0, idx - 4), idx).map((d) => byDate[d]);
    return {
      ...q,
      predRevenue: priorQuarters.length ? projectNextQuarter(priorQuarters, "revenue") : null,
      predOp: priorQuarters.length ? projectNextQuarter(priorQuarters, "op") : null,
      predNet: priorQuarters.length ? projectNextQuarter(priorQuarters, "net") : null,
    };
  });

  const lastDate = new Date(recent[recent.length - 1].date + "T00:00:00");
  const nextDate = addMonths(lastDate, 3);
  const nextDateLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  const guidance = {
    revenue: projectNextQuarter(recent, "revenue"),
    op: projectNextQuarter(recent, "op"),
    net: projectNextQuarter(recent, "net"),
  };

  // 실제 발표일 데이터는 이 앱의 무인증 프록시로는 가져올 수 없어(estimateNextEarningsDate 참고),
  // 분기 마감 + 1개월이라는 동일한 근사식을 적용하고 주말이면 가장 가까운 평일로 보정
  function nearestWeekday(date) {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 6) d.setDate(d.getDate() - 1);
    else if (day === 0) d.setDate(d.getDate() + 1);
    return d;
  }
  const estReportDate = nearestWeekday(addMonths(nextDate, 1));
  const estReportDateLabel = `${estReportDate.getFullYear()}-${String(estReportDate.getMonth() + 1).padStart(2, "0")}-${String(estReportDate.getDate()).padStart(2, "0")}`;

  const quarterLabel = (d) => {
    const dt = new Date(d + "T00:00:00");
    return `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  };
  const chartQuarters = [
    ...recentWithPred.map((q) => ({
      label: quarterLabel(q.date),
      revenue: q.revenue,
      op: q.op,
      net: q.net,
      predRevenue: q.predRevenue,
      predOp: q.predOp,
      predNet: q.predNet,
    })),
    { label: `${nextDateLabel}(예측)`, revenue: null, op: null, net: null, predRevenue: guidance.revenue, predOp: guidance.op, predNet: guidance.net },
  ];

  const amtCell = (v) => fmtAmountUnified(v, quoteCurrency);
  const quarterTableRows =
    recentWithPred
      .map(
        (q) => `
      <tr>
        <td>${quarterLabel(q.date)}</td>
        <td>${amtCell(q.revenue)}</td>
        <td>${amtCell(q.op)}</td>
        <td>${amtCell(q.net)}</td>
        <td class="muted">실적</td>
      </tr>`
      )
      .join("") +
    `
      <tr>
        <td>${escapeHtml(nextDateLabel)}</td>
        <td>${amtCell(guidance.revenue)}</td>
        <td>${amtCell(guidance.op)}</td>
        <td>${amtCell(guidance.net)}</td>
        <td><span class="net-income-cell" style="background:var(--warn-soft);color:var(--warn);">예측</span></td>
      </tr>`;

  el("quarterlyEarningsSection").innerHTML = `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 노란 선은 해당 분기 이전 데이터만으로 계산했다면 나왔을 추세 기반 예측치이며, 가장 오른쪽 분기는 아직 발표 전이라 예측선만 표시됩니다. 실제 기업 발표 가이던스나 애널리스트 컨센서스가 아닙니다.</p>
    <div class="future-chart-container">${buildRevenueProfitChartSvg(chartQuarters, quoteCurrency)}</div>
    <table class="fin-table">
      <thead><tr><th>분기</th><th>매출액</th><th>영업이익</th><th>순이익</th><th>구분</th></tr></thead>
      <tbody>${quarterTableRows}</tbody>
    </table>
    <p class="qbar-dates"><b>다음 발표일(추정):</b> ${escapeHtml(estReportDateLabel)} <span class="muted">(실제 발표일이 아닌 근사 추정치)</span></p>
  `;
}

// 국내(KR) 경쟁사 후보 — 미국은 사전 정의된 섹터 스크리너(region=US)로 한 번에 60개를 가져오지만, 코스피/코스닥은
// 그런 스크리너가 없어서 시가총액 상위 종목(이미 시가총액 내림차순인 getKrUniverseTickers)을 순서대로 훑어
// 개별 조회(yahooSearch)로 섹터가 일치하는 종목만 골라냄. 일치한 종목만 getCompanyMetrics로 시가총액까지 채워
// 미국 경로와 동일한 모양({symbol, marketCap, industry})으로 반환해 renderPeers의 나머지 로직을 그대로 재사용
async function getKrSectorPeerCandidates(sector, selfSymbol, selfIndustry) {
  const allTickers = await getKrUniverseTickers();
  const pool = allTickers.filter((t) => t !== selfSymbol).slice(0, 30);
  const checked = await mapWithConcurrency(pool, 5, async (symbol) => {
    try {
      const s = await yahooSearch(symbol);
      const q = s && s.quotes && s.quotes[0];
      const sec = q && (q.sectorDisp || q.sector);
      if (!q || sec !== sector) return null;
      const ind = q.industryDisp || q.industry;
      const m = await getCompanyMetrics(symbol).catch(() => null);
      return { symbol, industry: ind, marketCap: m ? m.marketCap : null };
    } catch {
      return null;
    }
  });
  const candidates = checked.filter(Boolean); // pool이 이미 시가총액 내림차순이라 순서 유지로 충분
  const industryCandidates = selfIndustry ? candidates.filter((c) => c.industry === selfIndustry) : [];
  return { candidates, industryCandidates };
}

// ---------- 3. 경쟁사 매출/주가/상승압력도 비교 ----------
// 경쟁사 4개 = 동일 업종(industry) 시가총액 TOP3(부족하면 동일 섹터로 보충) + 시가총액이 자신과 가장 가까운 종목 1개
// (섹터를 알 수 없는 경우엔 Yahoo의 연관 종목 추천으로 대체 — 국내 종목은 코스피200+코스닥150 시가총액 상위로 대체)
async function renderPeers(ticker, selfMetricsPromise, sector, industry) {
  el("peersSection").innerHTML = `<p class="muted">불러오는 중...</p>`;
  const isKr = isKrTicker(ticker);

  const [sectorResult, selfMetrics] = await Promise.all([
    sector
      ? (isKr ? getKrSectorPeerCandidates(sector, ticker, industry) : getSectorPeerCandidates(sector, ticker, industry)).catch(() => null)
      : Promise.resolve(null),
    selfMetricsPromise.then((m) => ({ ...m, self: true })).catch(() => null),
  ]);

  let peerTickers = [];
  let bySector = false;
  let byIndustry = false;

  if (sectorResult && sectorResult.candidates.length > 0) {
    const { candidates, industryCandidates } = sectorResult;
    // 업종 일치 후보가 3개 이상이면 그걸로 TOP3, 부족하면 섹터 전체 시총순으로 보충
    const top3 =
      industryCandidates.length >= 3
        ? industryCandidates.slice(0, 3)
        : [...industryCandidates, ...candidates.filter((c) => !industryCandidates.includes(c))].slice(0, 3);
    byIndustry = industryCandidates.length >= 3;
    const top3Symbols = new Set(top3.map((c) => c.symbol));
    const rest = candidates.filter((c) => !top3Symbols.has(c.symbol));
    const selfCap = selfMetrics && selfMetrics.marketCap;
    let similar = null;
    if (rest.length > 0) {
      similar =
        selfCap !== undefined && selfCap !== null
          ? rest.reduce((best, c) => (Math.abs(c.marketCap - selfCap) < Math.abs(best.marketCap - selfCap) ? c : best), rest[0])
          : rest[0];
    }
    peerTickers = [...top3.map((c) => c.symbol), similar ? similar.symbol : null].filter(Boolean);
    bySector = true;
  }

  if (peerTickers.length === 0) {
    if (isKr) {
      // 야후의 "연관 종목 추천"은 해외 종목 위주라 국내 종목엔 부적합 — 대신 시가총액 상위 종목으로 대체
      const allTickers = await getKrUniverseTickers();
      peerTickers = allTickers.filter((t) => t !== ticker).slice(0, 4);
    } else {
      const peersData = await yahooPeers(ticker).catch(() => null);
      const list =
        (peersData &&
          peersData.finance &&
          peersData.finance.result &&
          peersData.finance.result[0] &&
          peersData.finance.result[0].recommendedSymbols) ||
        [];
      peerTickers = list.map((p) => p.symbol).filter(Boolean).slice(0, 4);
    }
  }

  if (peerTickers.length === 0) {
    el("peersSection").innerHTML = `<p class="muted">자동으로 경쟁사를 찾지 못했습니다.</p>`;
    return;
  }

  const peerMetricsList = await Promise.all(peerTickers.map((s) => getCompanyMetrics(s).catch(() => null)));
  const metricsList = [selfMetrics, ...peerMetricsList];

  const all = metricsList.filter((d) => d && d.revenue !== null && d.revenue !== undefined);

  if (all.length === 0) {
    el("peersSection").innerHTML = `<p class="muted">경쟁사 데이터를 가져오지 못했습니다.</p>`;
    return;
  }

  const maxRev = Math.max(...all.map((d) => d.revenue || 0), 1);
  // 2026-08-31 개편: 티커 대신 한글 기업명(있으면), 막대 하나에 매출액(보라)+순이익(빨강 오버레이)을 같이 그리고
  // 막대 안 왼쪽에 순수익률(%), 오른쪽에 매출액을 표시. 우측 컬럼은 시가총액·상승압력 수치만 남김
  const rows = all
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .map((d) => {
      const pct = clamp(((d.revenue || 0) / maxRev) * 100, 2, 100);
      const score = computeAttractivenessScore(d);
      const isIPO = isRecentIPO(d.firstTradeDate);
      const scoreHtml = isIPO ? "IPO" : scoreRankColorHtml(score.total, score.total);
      const name = TICKER_TO_KOREAN_NAME[d.symbol] || d.symbol;
      const hasNet = d.netIncome !== null && d.netIncome !== undefined;
      const netPct = hasNet && d.revenue ? (d.netIncome / d.revenue) * 100 : null;
      const netBarPct = hasNet && d.netIncome > 0 ? clamp((d.netIncome / maxRev) * 100, 0, 100) : 0;
      return `
      <div class="peer-row">
        <span class="bar-label${d.self ? " self" : ""}">${escapeHtml(name)}</span>
        <div class="bar-track">
          <div class="bar-fill peer-rev" style="width:${pct}%"></div>
          ${netBarPct > 0 ? `<div class="bar-fill-profit peer-net" style="width:${netBarPct}%"></div>` : ""}
          ${netPct !== null ? `<span class="peer-net-label">순수익 ${netPct.toFixed(1)}%</span>` : ""}
          <span class="bar-revenue-label">${fmtAmountUnified(d.revenue, d.currency)}</span>
        </div>
        <span class="peer-price">${fmtAmountUnified(d.marketCap, d.currency)}</span>
        <span class="peer-score">${scoreHtml}</span>
      </div>`;
    })
    .join("");

  el("peersSection").innerHTML = `
    <p class="muted">최근 회계연도 매출액·순이익 기준 비교 (${bySector ? `동일 ${byIndustry ? "업종" : "섹터"} 시가총액 TOP3 + 시총 유사 종목 1개` : "자동 감지된 관련 종목"})</p>
    <div class="peer-table-header">
      <span></span><span></span><span>시가총액</span><span>상승<br>압력</span>
    </div>
    <div class="bar-chart">${rows}</div>
  `;
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
      const date = n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString("ko-KR") : "";
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      return `
      <div class="news-item">
        <div class="news-title"><a href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a></div>
        <div class="news-meta">${escapeHtml(date)}</div>
        ${n.isKorean ? "" : `<div class="news-original">원문: ${escapeHtml(n.title || "")}</div>`}
        <div class="news-source">출처: ${escapeHtml(n.publisher || "알 수 없음")}</div>
      </div>`;
    })
    .join("");

  const isAllKorean = news.every((n) => n.isKorean);
  containerEl.innerHTML = `
    ${items}
    <p class="muted" style="font-size:12px;margin-top:8px;">${isAllKorean ? "※ 구글 뉴스에서 해당 기업명으로 검색된 국내 기사입니다." : "※ 제목은 자동 번역되었으며, 본문 요약은 제공되지 않습니다."} 최근 1개월 이내 기사 최대 10건입니다.</p>
  `;
}

// ---------- 5. 상승압력도 점수 (총 거래대금 + 매출 성장성 + 상승 모멘텀) ----------
async function renderScore(selfMetricsPromise) {
  el("scoreSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const metrics = await selfMetricsPromise;

  const score = computeAttractivenessScore(metrics);
  const { total, volumeScore, volumeRatio, growthScore, revenueGrowthYoY, momentumScore, momentum3m } = score;
  const isIPO = isRecentIPO(metrics.firstTradeDate);

  const pressureColor = SCORE_COLOR_FAMILY.pressure;
  el("scoreSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        ${scoreMethodBarRow(
          "①",
          "총 거래대금",
          volumeScore,
          3,
          `최근 5거래일 평균, 1년 평균 대비: <b>${volumeRatio !== null ? volumeRatio.toFixed(2) + "배" : "N/A"}</b> (2배 이상 만점, 1.5배 2점, 1배 1점, 0.5배 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "②",
          "매출 성장성",
          growthScore,
          3,
          `최근 분기 YoY: <b>${revenueGrowthYoY !== null && revenueGrowthYoY !== undefined ? fmtPct(revenueGrowthYoY) : "N/A"}</b> (가장 최근 분기 매출의 전년 동기 대비 성장률, 높을수록 가점, 30% 이상 만점·0% 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "③",
          "상승 모멘텀",
          momentumScore,
          4,
          `최근 3개월 주가상승: <b>${momentum3m !== null && momentum3m !== undefined ? fmtPct(momentum3m) : "N/A"}</b> (높을수록 가점, 25% 이상 만점·0% 이하 0점)`,
          pressureColor
        )}
        <p class="disclaimer">
          ⚠️ 이 점수는 거래대금, 매출 성장성, 상승 모멘텀을 조합한 <b>단순 참고용 정량 지표</b>이며,
          투자 자문이나 매수/매도 추천이 아닙니다. 실제 투자 판단은 재무제표 전체와 다른 정보를 종합해 본인 책임 하에 내려야 합니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 6. 투자 안정성 점수 (vs S&P500, 점수가 높을수록 위험이 낮음) ----------
async function renderRisk(marketReturnsPromise, selfMetricsPromise) {
  el("riskSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const [metrics, { sp500Return, kospi200Return }] = await Promise.all([selfMetricsPromise, marketReturnsPromise, krCreditRatingReady]);

  const {
    total,
    creditScore,
    rating,
    marketScore,
    marginScore,
    relDiff,
    benchmarkReturn,
    netMargin,
    vtsaxScore,
    vtsaxWeightPct,
  } = computeRiskScore(metrics, sp500Return, kospi200Return);
  const isIPO = isRecentIPO(metrics.firstTradeDate);
  const isKr = isKrTicker(metrics.symbol);

  const ratingDisclaimerText = isKr
    ? "재무안정(구 신용등급)은 한국기업평가/한국신용평가/NICE신용평가 3사 기준으로 자체 조사해 수동으로 입력한 참고용 데이터로, 실시간 갱신되지 않으며 세부 배점 방법은 비공개입니다."
    : "재무안정(구 신용등급)은 S&P 신용등급을 기준으로 자체 조사해 수동으로 입력한 참고용 데이터로, 실시간 갱신되지 않으며 세부 배점 방법은 비공개입니다.";

  const benchmarkName = isKr ? "KOSPI200" : "S&P500";
  const marginScaleText = isKr ? "35% 이상 만점·0% 이하 0점" : "50% 이상 만점·적자 0점";
  const capLabel = isKr ? "시가총액 가점(KODEX 200 내 편입비중)" : "시가총액 가점(미국 전체 시장 내 시총 비중)";
  const capValueText = vtsaxWeightPct !== null ? vtsaxWeightPct.toFixed(2) + "%" : "N/A";
  const capScaleText = isKr
    ? "KODEX 200(삼성자산운용) 편입비중 기준, 3% 이상 만점·미편입 0점"
    : "VTSAX 등 인덱스펀드 예상 비중 근사, 6% 이상 만점·0% 0점";
  const capDisclaimerText = isKr
    ? "시가총액 가점은 KODEX 200 공식 팩트시트에 공개된 상위 10종목 편입비중만 정확한 값이고, 나머지 종목은 그 밖 비중을 확인할 free 소스가 없어 미편입과 동일하게 0점 처리됩니다(실제로는 낮은 비중으로 편입돼 있을 수 있음)."
    : "시가총액 가점은 실제 펀드 편입 비중이 아니라 시가총액 기준 추정치입니다.";

  const stabilityColor = SCORE_COLOR_FAMILY.stability;
  el("riskSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge risk">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        ${creditStabilityRowHtml(rating, creditScore, stabilityColor)}
        ${scoreMethodBarRow(
          "②",
          `${benchmarkName} 대비 모멘텀`,
          marketScore,
          2,
          `${benchmarkName}과의 1년 주가상승 차이: ${relDiff !== null ? `<b>${relDiff.toFixed(1)}%p</b> (${benchmarkName} <b>${fmtPct(benchmarkReturn)}</b>)` : "N/A"} (차이가 작을수록 가점)`,
          stabilityColor
        )}
        ${scoreMethodBarRow(
          "③",
          "순이익률",
          marginScore,
          2,
          `순이익÷매출: <b>${netMargin !== null ? (netMargin * 100).toFixed(1) + "%" : "N/A"}</b> (${marginScaleText})`,
          stabilityColor
        )}
        ${scoreMethodBarRow("④", capLabel, vtsaxScore, 2, `${capValueText} (${capScaleText})`, stabilityColor)}
        <p class="disclaimer">
          ⚠️ 점수가 높을수록(10점에 가까울수록) 재무적으로 더 안정적/저위험임을 의미합니다.
          재무안정, ${benchmarkName} 대비 수익률, 순이익률, 시가총액 가점을 조합한 <b>단순 참고용 정량 지표</b>이며, 투자 자문이나 매수/매도 추천이 아닙니다.
          ${ratingDisclaimerText}
          ${capDisclaimerText}
        </p>
      </div>
    </div>
  `;
}

// ---------- 7. 투자황금기 점수(공포지수연동) — VIX(CBOE 변동성지수)가 높을수록(시장 패닉) 역발상 매수 기회로 보고 점수를 올림, 종목과 무관 ----------
async function renderMacro(ticker) {
  el("macroSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const isKr = isKrTicker(ticker);
  el("macroSectionTitle").textContent = isKr ? "KOSPI 공포지수" : "S&P 공포지수";

  if (isKr) {
    const fomo = await getKrFomoMetrics().catch(() => ({ score: null, changeAbs: null, date: null }));
    const grade = fomoGrade(fomo.score);
    const liveLine =
      fomo.score !== null
        ? `<p class="score-macro-vix-line">😱 KOSPI 공포지수(자체 개발, ${escapeHtml(fomo.date || "")} 기준)${fomoLineHtml(fomo.score, fomo.changeAbs)}</p>`
        : "";
    const fomoNumText = fomo.score === null || fomo.score === undefined ? "N/A" : `${fomoDisplayValue(fomo.score)}%p`;
    const fomoPt = fomo.score === null || fomo.score === undefined ? null : fomo.score * 100;
    const fomoZones = [
      { to: -15, label: "패닉", color: "#1d4ed8" },
      { to: -5, label: "공포", color: "#5b8def" },
      { to: 5, label: "안심", color: "#22a866" },
      { to: 15, label: "경계", color: "#e08a2c" },
      { to: 30, label: "과열", color: "#dc2626" },
    ];
    el("macroSection").innerHTML = `
      ${liveLine}
      <div class="score-wrap">
        <div class="score-badge macro"${fomoBgStyleAttr(fomo.score)}>
          <div class="score-num">${fomoNumText}</div>
          <div class="score-den">${grade.label}</div>
        </div>
        <div class="score-details">
          ${macroGaugeHtml(fomoPt, -30, 30, fomoZones)}
          <ul>
            <li>코스피200+코스닥150(약 350종목) 중 52주 신고가 근처(5% 이내) 종목 비중에서 52주 신저가 근처(5% 이내) 종목 비중을 뺀 값(%p)</li>
            <li>-15%p 이하 <b>패닉(역발상 투자 황금기)</b> · -5~-15%p <b>공포</b> · -5~+5%p <b>안심</b> · +5~+15%p <b>경계</b> · +15%p 이상 <b>과열(FOMO)</b></li>
          </ul>
          <p class="disclaimer">
            ⚠️ 특정 종목과 무관한 코스피·코스닥 시장 전체 쏠림 지표이며, "신저가가 몰릴수록(공포) 저가 매수 기회"라는
            역발상 관점을 반영한 등급입니다. 투자 자문이나 매수/매도 추천이 아니며, 실제로는 하락이 더 깊어질 수도 있습니다.
            VIX와 달리 이 앱이 자체 개발한 지표로, 하루 한 번(Worker Cron)만 갱신됩니다.
          </p>
        </div>
      </div>
    `;
    return;
  }

  const { vix, vixChangePct } = await getMacroMetrics();
  const grade = vixGrade(vix);
  const vixPctStr =
    vixChangePct !== null && vixChangePct !== undefined && Number.isFinite(vixChangePct)
      ? `(${vixChangePct >= 0 ? "+" : ""}${vixChangePct.toFixed(2)}%)`
      : "";
  const vixLiveLine = vix !== null && vix !== undefined ? `<p class="score-macro-vix-line">😱 S&P500 VIX(FRED: VIXCLS)<br>VIX : ${vix.toFixed(1)}${vixPctStr}</p>` : "";
  const vixZones = [
    { to: 20, label: "안심", color: "#22a866" },
    { to: 30, label: "경계", color: "#e08a2c" },
    { to: 40, label: "공포", color: "#f97316" },
    { to: 60, label: "패닉", color: "#dc2626" },
  ];

  el("macroSection").innerHTML = `
    ${vixLiveLine}
    <div class="score-wrap">
      <div class="score-badge macro"${scoreBgStyleAttr(vix, 10, 50, "fear")}>
        <div class="score-num">${vix !== null && vix !== undefined ? vix.toFixed(1) : "N/A"}</div>
        <div class="score-den">${grade.label}</div>
      </div>
      <div class="score-details">
        ${macroGaugeHtml(vix, 0, 60, vixZones)}
        <ul>
          <li>VIX(CBOE 변동성지수, FRED 시리즈 VIXCLS) 수치를 그대로 표시합니다</li>
          <li>20 미만 <b>안심</b> · 20~29 <b>경계</b> · 30~39 <b>공포</b> · 40 이상 <b>패닉(역발상 투자 황금기)</b></li>
        </ul>
        <p class="disclaimer">
          ⚠️ 특정 종목과 무관한 시장 전체 공포지수(VIX) 수치이며, "공포가 클수록 저가 매수 기회"라는
          역발상 관점을 반영한 등급입니다. 투자 자문이나 매수/매도 추천이 아니며, 실제로는 공포가 더 깊어질 수도 있습니다.
        </p>
      </div>
    </div>
  `;
}

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
        <h4>📈 상승 압력 (10점 만점)</h4>
        ${scoreMethodBarRow(
          "①",
          "총 거래대금",
          score.volumeScore,
          3,
          `최근 5거래일 평균 ÷ 1년 평균: <b>${score.volumeRatio !== null ? score.volumeRatio.toFixed(2) + "배" : "N/A"}</b> (2배 이상 만점, 0.5배 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "②",
          "매출 성장성",
          score.growthScore,
          3,
          `최근 분기 매출 YoY: <b>${score.revenueGrowthYoY !== null && score.revenueGrowthYoY !== undefined ? fmtPct(score.revenueGrowthYoY) : "N/A"}</b> (30% 이상 만점, 0% 이하 0점)`,
          pressureColor
        )}
        ${scoreMethodBarRow(
          "③",
          "상승 모멘텀",
          score.momentumScore,
          4,
          `최근 3개월 주가상승: <b>${score.momentum3m !== null && score.momentum3m !== undefined ? fmtPct(score.momentum3m) : "N/A"}</b> (25% 이상 만점, 0% 이하 0점)`,
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
    metricCellFn,
    noteHtml,
    initialCount = 30,
    showGrade = true,
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

      if (showGrade) {
        const { sp500Return } = await getMarketReturnsCached();
        ranked.forEach((r) => {
          if (r.riskTotal === undefined) r.riskTotal = computeRiskScore(r, sp500Return).total;
          if (r.isIPO === undefined) r.isIPO = isRecentIPO(r.firstTradeDate);
        });
      }
      const gradeCellHtml = (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.riskTotal, r.riskTotal));

      const rows = ranked
        .map(
          (r, i) => `
        <tr>
          <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
          <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(TICKER_TO_KOREAN_NAME[r.symbol] || r.name || "")}</span></td>
          <td>${r.price !== undefined && r.price !== null ? priceChartLink(r.symbol, "$" + r.price.toFixed(2)) : "N/A"}</td>
          <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
        </tr>`
        )
        .join("");
      resultsEl.innerHTML = `
        ${noteHtml || ""}
        ${topCapNoteHtml(cursor, tickers.length, hasMore)}
        ${rankScanCaptionHtml(ranked.length)}
        <table class="top30-table">
          <thead><tr><th>순위</th><th>기업명</th><th>현재가</th><th>${metricHeaderHtml}</th>${showGrade ? `<th>투자<br>안정</th>` : ""}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${tickers.length}">전체보기 (나머지 ${tickers.length - cursor}개 · 500개 전부 검색 시 약 1분 소요)</button>` : ""}
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
      if (!moreBtn) return;
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
function rankScanCaptionHtml(count) {
  return `<p class="muted rank-scan-caption" style="font-size:12px;">시가총액 상위 ${count}개 확인 <button type="button" class="rank-refresh-btn" aria-label="실시간 새로고침"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><polyline points="20 4 20 9 15 9"/></svg></button></p>`;
}

// 랭킹 결과가 전체 종목이 아니라 시가총액 상위 일부만 스캔한 상태일 때, 공지 바로 밑에 주황색으로 표시하는 주의문.
// canLoadMore=true면 "더보기"로 전체를 마저 확인할 수 있는 경우(단계적 스캔), false면 이 화면에서는 더 볼 방법이 없는 경우(상위 30개 고정)
function topCapNoteHtml(shown, total, canLoadMore) {
  if (!(total > shown)) return ""; // 이미 전체를 다 봤으면(더보기를 끝까지 눌렀거나 원래 전체가 30개 이하면) 표시하지 않음
  return `<p class="top30-scope-note">⚠️ 지금 결과는 전체 ${total}종목이 아닌 시가총액 상위 ${shown}개까지만 반영된 것입니다.${canLoadMore ? ` '더보기'를 누르면 전체를 확인할 수 있어요. <button type="button" class="scope-more-btn">+더보기</button>` : ""}</p>`;
}

// ---------- 랭킹 공용 인프라: 종목 목록을 시가총액 우선순으로 필요한 만큼만 스캔하는 단계적 캐시 ----------
// 접속 직후엔 시가총액 상위 30개까지만 스캔해서 빠르게 보여주고, "전체보기"를 눌러야 그때 나머지를 이어서
// 스캔함. getTickers()가 반환하는 순서가 이미 시가총액 내림차순이어야 함
// (KR: getKrUniverseTickers = KODEX 200/코스닥150 ETF 편입 비중순, US: getSP500PriorityOrder = 시가총액순).
// 랭킹 새로고침(실시간 재검색)용 — 각 단계적 스캔 캐시를 비우는 리셋 함수 모음(rank-refresh-btn 클릭 시 전부 실행)
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
        return {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          price: meta.regularMarketPrice,
          currency: meta.currency,
          changePct,
          volume,
          dollarVolume: volume !== null ? meta.regularMarketPrice * volume : null,
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
async function renderKrRanking(dataPromiseFn, label, statusEl, resultsEl, { mapFn = (list) => list, sortFn, metricHeaderHtml, metricCellFn, noteHtml, showGrade = true }) {
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

    if (showGrade) {
      const { sp500Return, kospi200Return } = await getMarketReturnsCached();
      top50.forEach((r) => {
        if (r.riskTotal === undefined) r.riskTotal = computeRiskScore(r, sp500Return, kospi200Return).total;
        if (r.isIPO === undefined) r.isIPO = isRecentIPO(r.firstTradeDate);
      });
    }
    const gradeCellHtml = (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.riskTotal, r.riskTotal));

    const rowHtml = (r, i) => `
      <tr>
        <td>${i + 1}${r.fiveDayExtremes ? surgeWarningEmoji(r.fiveDayExtremes) : ""}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(nameMap.get(r.symbol) || r.symbol)}</b></span></td>
        <td>${
          r.price !== undefined && r.price !== null
            ? `${priceChartLink(r.symbol, fmtPrice(r.price, r.currency))}${
                r.changePct !== undefined && r.changePct !== null
                  ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>`
                  : ""
              }`
            : "N/A"
        }</td>
        <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
      </tr>`;

    function paint(initialCount) {
      const visible = top50.slice(0, initialCount);
      const rest = top50.slice(initialCount);
      resultsEl.innerHTML = `
        ${noteHtml || ""}
        ${topCapNoteHtml(top50.length, raw.length, false)}
        <p class="muted" style="font-size:12px;">코스피200+코스닥150 전체 스캔 기준 상위 ${top50.length}개 중 ${visible.length}개 표시</p>
        <table class="top30-table">
          <thead><tr><th>순위</th><th>기업명</th><th>현재가</th><th>${metricHeaderHtml}</th>${showGrade ? `<th>투자<br>안정</th>` : ""}</tr></thead>
          <tbody>${visible.map(rowHtml).join("")}</tbody>
        </table>
        ${rest.length ? `<button type="button" class="cat-btn load-more-btn">더보기 (${visible.length}/${top50.length})</button>` : ""}
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
async function renderKrRankingStaged(label, statusEl, resultsEl, { mapFn = (list) => list, sortFn, metricHeaderHtml, metricCellFn, noteHtml, showGrade = true, initialCount = 30 }) {
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

      if (showGrade) {
        const { sp500Return, kospi200Return } = await getMarketReturnsCached();
        ranked.forEach((r) => {
          if (r.riskTotal === undefined) r.riskTotal = computeRiskScore(r, sp500Return, kospi200Return).total;
          if (r.isIPO === undefined) r.isIPO = isRecentIPO(r.firstTradeDate);
        });
      }
      const gradeCellHtml = (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.riskTotal, r.riskTotal));

      const rows = ranked
        .map(
          (r, i) => `
        <tr>
          <td>${i + 1}${r.fiveDayExtremes ? surgeWarningEmoji(r.fiveDayExtremes) : ""}</td>
          <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(nameMap.get(r.symbol) || r.symbol)}</b></span></td>
          <td>${
          r.price !== undefined && r.price !== null
            ? `${priceChartLink(r.symbol, fmtPrice(r.price, r.currency))}${
                r.changePct !== undefined && r.changePct !== null
                  ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>`
                  : ""
              }`
            : "N/A"
        }</td>
          <td>${metricCellFn(r)}</td>${showGrade ? `<td>${gradeCellHtml(r)}</td>` : ""}
        </tr>`
        )
        .join("");
      resultsEl.innerHTML = `
        ${noteHtml || ""}
        ${topCapNoteHtml(targetCount, total, hasMore)}
        ${rankScanCaptionHtml(ranked.length)}
        <table class="top30-table">
          <thead><tr><th>순위</th><th>기업명</th><th>현재가</th><th>${metricHeaderHtml}</th>${showGrade ? `<th>투자<br>안정</th>` : ""}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${total}">전체보기 (나머지 ${total - targetCount}개 · 전체 검색 시 약 1분 소요)</button>` : ""}
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
      if (!moreBtn) return;
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
    metricHeaderHtml: "매출액 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.revenueGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueCashFlow() {
  await runValueScreenFromSP500(valuationButtons.cashFlow, "현금흐름 증가", {
    sortFn: (a, b) => (b.operatingCashFlowGrowthAnnual ?? -Infinity) - (a.operatingCashFlowGrowthAnnual ?? -Infinity),
    metricHeaderHtml: "영업현금흐름 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.operatingCashFlowGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueNetIncome() {
  await runValueScreenFromSP500(valuationButtons.netIncome, "순이익 증가", {
    sortFn: (a, b) => (b.netIncomeGrowthAnnual ?? -Infinity) - (a.netIncomeGrowthAnnual ?? -Infinity),
    metricHeaderHtml: "순이익 증가율(YoY)",
    metricCellFn: (r) => fmtGrowthCell(r.netIncomeGrowthAnnual),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValueEps() {
  await runValueScreenFromSP500(valuationButtons.eps, "EPS", {
    sortFn: (a, b) => (b.eps ?? -Infinity) - (a.eps ?? -Infinity),
    metricHeaderHtml: "주당순이익(EPS)",
    metricCellFn: (r) => (r.eps === null || r.eps === undefined ? "N/A" : fmtEpsValue(r.eps, r.currency)),
    noteHtml: VALUE_DISCLAIMER,
  });
}

async function runValuePer() {
  await runValueScreenFromSP500(valuationButtons.per, "PER", {
    sortFn: (a, b) => (a.per ?? Infinity) - (b.per ?? Infinity),
    metricHeaderHtml: "PER(현재가 기준)",
    metricCellFn: (r) => (r.per === null || r.per === undefined ? "N/A" : `${r.per.toFixed(1)}배`),
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
    metricCellFn: (r) => (r.marketCap ? fmtCompactCurrency(r.marketCap, r.currency) : "N/A"),
    noteHtml: VALUE_DISCLAIMER,
  });
}

// ---------- 인기종목(제목줄 첫 탭, 2026-09-01 사용자 요청): 시가총액 상위 50위권에서
// 상승압력+투자안정 합산 높은 순 30개 — 국내는 코스피200+코스닥150, 해외는 S&P500에서 각각 찾음.
// 점수는 지도(sector-map)가 매일 배치로 계산해둔 스냅샷(kr/sp500-sectors.json의 pressureScore·stabilityScore)을
// 그대로 재사용해 접속 즉시 순위를 보여주고, 현재가·등락률만 30개 종목에 대해 실시간으로 조회함
async function runPopularStocks() {
  const statusEl = el("popularStatus");
  const resultsEl = el("popularResults");
  if (!guardRankingScan(resultsEl)) return;
  resultsEl.dataset.scanning = "1";
  try {
    resultsEl.innerHTML = "";
    statusEl.style.display = "block";
    statusEl.textContent = "인기종목을 불러오는 중...";
    const isKr = getWatchlistActiveMarket() === "KR";
    const universe = await getSReportUniverse(isKr);
    // 시총 상위 50위권 전체를 합산점수순으로 들고 있다가, 처음엔 30개만 보여주고 "더보기"로 나머지 20개를 이어서 표시
    const scored = (((universe && universe.companies) || [])
      .filter((c) => c.marketCap && c.pressureScore !== null && c.pressureScore !== undefined && c.stabilityScore !== null && c.stabilityScore !== undefined)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 50))
      .sort((a, b) => b.pressureScore + b.stabilityScore - (a.pressureScore + a.stabilityScore));
    if (scored.length === 0) throw new Error("인기종목 데이터를 아직 준비 중입니다. 잠시 후 다시 확인해주세요.");

    // 시세는 화면에 실제로 보이는 종목만 그때그때 조회(더보기를 누르면 추가분만 마저 조회)
    const snapCache = new Array(scored.length).fill(undefined);
    const fetchSnap = async (c) => {
      try {
        const chart = await yahooChart(c.symbol, "5d");
        const snap = yahooSnapshot(chart);
        const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
        return (snap && { ...snap, currency: (meta && meta.currency) || (isKr ? "KRW" : "USD") }) || null;
      } catch {
        return null;
      }
    };

    const rowHtml = (c, snap, i) => {
      const name = TICKER_TO_KOREAN_NAME[c.symbol] || c.name || c.symbol;
      const priceCell =
        snap && snap.price !== null && snap.price !== undefined
          ? `${priceChartLink(c.symbol, fmtPrice(snap.price, snap.currency))}${
              snap.changePct !== null && snap.changePct !== undefined
                ? `<br><span class="${snap.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(snap.changePct)})</span>`
                : ""
            }`
          : "N/A";
      return `
        <tr>
          <td>${i + 1}</td>
          <td><span class="ticker-cell">${tickerLogoHtml(c.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(c.symbol)}">${escapeHtml(name)}</b></span></td>
          <td>${priceCell}</td>
          <td>${scoreRankColorHtml(c.pressureScore, c.pressureScore)}</td>
          <td>${scoreRankColorHtml(c.stabilityScore, c.stabilityScore)}</td>
        </tr>`;
    };

    async function paintUpTo(count) {
      count = Math.min(count, scored.length);
      const pending = scored.slice(0, count).map((c, i) => ({ c, i })).filter(({ i }) => snapCache[i] === undefined);
      if (pending.length) {
        statusEl.style.display = "block";
        statusEl.textContent = "인기종목 시세를 확인하는 중...";
        await mapWithConcurrency(pending, 6, async ({ c, i }) => {
          snapCache[i] = await fetchSnap(c);
        });
      }
      statusEl.style.display = "none";

      const rows = scored.slice(0, count).map((c, i) => rowHtml(c, snapCache[i], i)).join("");
      const hasMore = count < scored.length;
      resultsEl.innerHTML = `
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${isKr ? "코스피200+코스닥150" : "S&P500"} 시가총액 상위 50위권 중 상승 압력+투자 안정 합산이 높은 순입니다. 점수는 매일 자동 갱신되는 스냅샷 기준이며 투자 자문이 아닙니다.</p>
        <table class="top30-table">
          <thead><tr><th>순위</th><th>기업명</th><th>현재가<br>(등락률)</th><th>상승<br>압력</th><th>투자<br>안정</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn">더보기 (${count}/${scored.length})</button>` : ""}
      `;
      const moreBtn = resultsEl.querySelector(".load-more-btn");
      if (moreBtn) {
        moreBtn.addEventListener("click", () => {
          moreBtn.disabled = true;
          moreBtn.textContent = "불러오는 중...";
          paintUpTo(scored.length);
        });
      }
    }

    await paintUpTo(30);
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${err.message || "인기종목을 가져오지 못했습니다."}`;
  } finally {
    endLoadMoreScan(resultsEl);
  }
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

let etfPopularRegion = "us";
let krEtfTop100Promise = null;
function getKrEtfTop100() {
  if (!krEtfTop100Promise) {
    krEtfTop100Promise = proxyFetchJson("https://finance.naver.com/api/sise/etfItemList.nhn")
      .then((data) => {
        const items = (data && data.result && data.result.etfItemList) || [];
        return items
          .filter((it) => it && it.itemcode)
          .sort((a, b) => (b.marketSum || 0) - (a.marketSum || 0))
          .slice(0, 100)
          .map((it) => ({ symbol: `${it.itemcode}.KS`, name: it.itemname, marketSum: it.marketSum, price: it.nowVal, changePct: it.changeRate }));
      })
      .catch((e) => {
        krEtfTop100Promise = null; // 실패는 캐시하지 않음
        throw e;
      });
  }
  return krEtfTop100Promise;
}
// 네이버 marketSum은 억원 단위 — 1조 이상이면 조원으로 표기
function fmtKrEtfMarketSum(marketSumEok) {
  if (!marketSumEok) return "N/A";
  return marketSumEok >= 10000 ? `${(marketSumEok / 10000).toFixed(1)}조원` : `${Math.round(marketSumEok).toLocaleString("ko-KR")}억원`;
}
const KR_ETF_BRAND_BADGE_POPULAR = { KODEX: "KX", TIGER: "TG", KBSTAR: "KB", KOSEF: "KS", RISE: "RS", SOL: "SL", ACE: "AC", PLUS: "PL", HANARO: "HN" };
function etfRankRowHtml(rank, { symbol, name, sub, priceStr, pct }) {
  const cls = pct !== undefined && pct !== null && pct >= 0 ? "delta-up" : "delta-down";
  const pctStr = pct !== undefined && pct !== null ? `${pct >= 0 ? "+" : ""}${Number(pct).toFixed(2)}%` : "";
  const badge = KR_ETF_BRAND_BADGE_POPULAR[(name || "").split(" ")[0]];
  return `
    <div class="idx-row stock-card-row ticker-link idx-row-clickable" data-ticker="${escapeHtml(symbol)}">
      <div class="idx-left">
        <div class="idx-name"><span class="crypto-rank">${rank + 1}</span>${tickerLogoHtml(symbol, badge)}${escapeHtml(name)}</div>
        <div class="idx-sub">${sub}</div>
      </div>
      <div class="idx-right">
        <div class="idx-price">${priceStr}</div>
        <div class="idx-delta ${cls}">${pctStr}</div>
      </div>
    </div>`;
}
async function runEtfPopular() {
  const statusEl = el("popularStatus");
  const resultsEl = el("popularResults");
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "ETF 시가총액 순위를 불러오는 중...";
  const region = etfPopularRegion;
  const regionNav = () => `
    <div class="top30-sub-nav" style="margin-bottom:6px;">
      <button type="button" class="cat-btn${etfPopularRegion === "us" ? " active" : ""}" data-etf-popular-region="us">미국 ETF</button>
      <button type="button" class="cat-btn${etfPopularRegion === "kr" ? " active" : ""}" data-etf-popular-region="kr">한국 ETF</button>
    </div>`;
  try {
    if (region === "kr") {
      const list = await getKrEtfTop100();
      if (etfPopularRegion !== "kr") return; // 조회 중 미국 칩으로 전환했으면 그쪽 렌더에 맡김
      statusEl.style.display = "none";
      let shown = Math.min(10, list.length);
      const render = () => {
        const hasMore = shown < list.length;
        resultsEl.innerHTML = `
          ${regionNav()}
          <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 국내 상장 전체 ETF 중 시가총액 상위 ${list.length}개(네이버 금융 기준)입니다. 투자 자문이 아닙니다.</p>
          <div class="idx-list">${list
            .slice(0, shown)
            .map((it, i) =>
              etfRankRowHtml(i, {
                symbol: it.symbol,
                name: it.name,
                sub: `<span class="idx-ticker">${escapeHtml(it.symbol.replace(".KS", ""))}</span> | 시총 ${fmtKrEtfMarketSum(it.marketSum)}`,
                priceStr: it.price !== undefined && it.price !== null ? `${Number(it.price).toLocaleString("ko-KR")}원` : "N/A",
                pct: it.changePct,
              })
            )
            .join("")}</div>
          ${hasMore ? `<button type="button" class="cat-btn load-more-btn">더보기 (${shown}/${list.length})</button>` : ""}
        `;
        const moreBtn = resultsEl.querySelector(".load-more-btn");
        if (moreBtn) moreBtn.addEventListener("click", () => { shown = Math.min(shown + 20, list.length); render(); });
      };
      render();
      return;
    }

    // 미국 ETF: 큐레이션 목록 순서대로, 화면에 보이는 종목만 차트에서 실시간 시세 조회(더보기 시 추가분만)
    statusEl.style.display = "none";
    const snapCache = new Map();
    let shown = Math.min(10, US_ETF_TOP100.length);
    const render = () => {
      const hasMore = shown < US_ETF_TOP100.length;
      resultsEl.innerHTML = `
        ${regionNav()}
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 미국 상장 ETF 중 순자산(AUM) 상위 ${US_ETF_TOP100.length}개입니다(순위는 주기적으로 수동 갱신되는 근사치). 투자 자문이 아닙니다.</p>
        <div class="idx-list">${US_ETF_TOP100.slice(0, shown)
          .map((it, i) => {
            const snap = snapCache.get(it.t);
            return etfRankRowHtml(i, {
              symbol: it.t,
              name: it.t,
              sub: `<span class="idx-ticker">${escapeHtml(it.n)}</span>`,
              priceStr:
                snap && snap.price !== null && snap.price !== undefined
                  ? "$" + Number(snap.price).toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : "...",
              pct: snap ? snap.changePct : null,
            });
          })
          .join("")}</div>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn">더보기 (${shown}/${US_ETF_TOP100.length})</button>` : ""}
      `;
      const moreBtn = resultsEl.querySelector(".load-more-btn");
      if (moreBtn) {
        moreBtn.addEventListener("click", async () => {
          shown = Math.min(shown + 20, US_ETF_TOP100.length);
          render();
          await fetchSnapsUpTo(shown);
          if (etfPopularRegion === "us") render();
        });
      }
    };
    const fetchSnapsUpTo = async (count) => {
      const pending = US_ETF_TOP100.slice(0, count).filter((it) => !snapCache.has(it.t));
      if (!pending.length) return;
      await mapWithConcurrency(pending, 6, async (it) => {
        try {
          snapCache.set(it.t, yahooSnapshot(await yahooChart(it.t, "5d")));
        } catch {
          snapCache.set(it.t, null);
        }
      });
    };
    render();
    await fetchSnapsUpTo(shown);
    if (etfPopularRegion === "us") render();
  } catch (e) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${e.message || "ETF 데이터를 가져오지 못했습니다."}`;
  }
}

// ---------- 비트코인 섹션 인기종목(2026-09-01): Yahoo 암호화폐 스크리너로 시가총액 상위 50개 표시 ----------
// 행 클릭 시 코인 상세(개요+주요 뉴스만 표시)로 이동. 목록은 세션 내 캐시(재진입 시 즉시 표시)
let cryptoTop50CachePromise = null;
function cryptoRankRowHtml(q, rank, snap) {
  const sym = q.symbol;
  const ticker = cryptoBaseTicker(sym); // "PEPE24478-USD" 같은 심볼도 "PEPE"로 깔끔하게 표시
  const name = cryptoKoName(sym, q.shortName || q.longName || sym);
  // 스크리너 시세는 지연될 수 있어, 차트에서 받은 실시간 스냅샷(snap)이 있으면 그걸 우선 사용(상세 페이지 가격과 일치)
  const price = snap && snap.price !== null && snap.price !== undefined ? snap.price : q.regularMarketPrice;
  const pct = snap && snap.changePct !== null && snap.changePct !== undefined ? snap.changePct : q.regularMarketChangePercent;
  const cls = pct !== undefined && pct !== null && pct >= 0 ? "delta-up" : "delta-down";
  const priceStr =
    price !== undefined && price !== null ? "$" + Number(price).toLocaleString("en-US", { maximumFractionDigits: price >= 1 ? 2 : 6 }) : "N/A";
  const pctStr = pct !== undefined && pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "";
  const mcapStr = q.marketCap ? fmtCompactCurrency(q.marketCap, "USD") : "N/A";
  return `
    <div class="idx-row stock-card-row ticker-link idx-row-clickable" data-ticker="${escapeHtml(sym)}">
      <div class="idx-left">
        <div class="idx-name"><span class="crypto-rank">${rank + 1}</span>${cryptoLogoHtml(ticker)}${escapeHtml(name)}</div>
        <div class="idx-sub"><span class="idx-ticker">${escapeHtml(ticker)}</span> | 시총 ${mcapStr}</div>
      </div>
      <div class="idx-right">
        <div class="idx-price">${priceStr}</div>
        <div class="idx-delta ${cls}">${pctStr}</div>
      </div>
    </div>`;
}
async function runCryptoPopular() {
  const statusEl = el("popularStatus");
  const resultsEl = el("popularResults");
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = "암호화폐 시가총액 순위를 불러오는 중...";
  try {
    if (!cryptoTop50CachePromise) {
      cryptoTop50CachePromise = yahooScreener("all_cryptocurrencies_us", 50)
        .then((data) => {
          const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
          return quotes.filter((q) => q && q.symbol);
        })
        .catch((e) => {
          cryptoTop50CachePromise = null; // 실패는 캐시하지 않음(다음 진입 시 재시도)
          throw e;
        });
    }
    const all = (await cryptoTop50CachePromise).slice(0, 50);
    if (all.length === 0) throw new Error("암호화폐 시세를 가져오지 못했습니다.");
    // 실제 야후 심볼("TON11419-USD" 등)이 확정되는 시점에 한글명·검색 별칭을 자동 등록 —
    // 이후 상세 헤더/관심종목/검색창(한글·영문)에서 50개 코인이 전부 한글명으로 잡힘
    all.forEach((q) => {
      const ko = CRYPTO_KO_BY_TICKER[cryptoBaseTicker(q.symbol)];
      if (ko) {
        TICKER_TO_KOREAN_NAME[q.symbol] = ko;
        if (!KOREAN_COMPANY_NAMES[ko]) KOREAN_COMPANY_NAMES[ko] = q.symbol;
      }
    });
    statusEl.style.display = "none";

    // 화면에 보이는 코인만 차트 기준 실시간 시세를 추가 조회(스크리너 지연 시세 보정) — 더보기 시 추가분만 마저 조회
    const snapCache = new Map();
    let shown = Math.min(10, all.length);
    const render = () => {
      const hasMore = shown < all.length;
      resultsEl.innerHTML = `
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 시가총액 상위 ${all.length}개 암호화폐(달러 기준)이며 상승은 빨강·하락은 파랑입니다. 투자 자문이 아닙니다.</p>
        <div class="idx-list">${all.slice(0, shown).map((q, i) => cryptoRankRowHtml(q, i, snapCache.get(q.symbol))).join("")}</div>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn">더보기 (${shown}/${all.length})</button>` : ""}
      `;
      const moreBtn = resultsEl.querySelector(".load-more-btn");
      if (moreBtn) {
        moreBtn.addEventListener("click", async () => {
          shown = Math.min(shown + 20, all.length);
          render();
          await fetchSnapsUpTo(shown);
          render();
        });
      }
    };
    const fetchSnapsUpTo = async (count) => {
      const pending = all.slice(0, count).filter((q) => !snapCache.has(q.symbol));
      if (!pending.length) return;
      await mapWithConcurrency(pending, 6, async (q) => {
        try {
          snapCache.set(q.symbol, yahooSnapshot(await yahooChart(q.symbol, "5d")));
        } catch {
          snapCache.set(q.symbol, null);
        }
      });
    };
    render();
    await fetchSnapsUpTo(shown);
    render();
  } catch (e) {
    statusEl.textContent = `❌ ${e.message || "암호화폐 시세를 가져오지 못했습니다."}`;
  }
}

// 인기종목(ETF) 결과영역의 미국/한국 ETF 전환 칩 클릭 처리
el("popularResults").addEventListener("click", (e) => {
  const regionBtn = e.target.closest("[data-etf-popular-region]");
  if (!regionBtn) return;
  etfPopularRegion = regionBtn.dataset.etfPopularRegion;
  runEtfPopular();
});

// 인기종목 화면 진입 — topranking 패널을 빌려 쓰되 서브내비(랭킹 칩)는 비우고 제목줄 탭만 활성화.
// 섹션 모드에 따라 주식(상승압력+투자안정 TOP30)/ETF 랭킹/암호화폐 시세로 내용이 달라짐(2026-09-01)
function openPopularStocks() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle("tab.popular");
  el("topRankingSubNav").innerHTML = "";
  showRankingGroup("popular");
  if (appSectionMode === "etf") runEtfPopular();
  else if (appSectionMode === "crypto") runCryptoPopular();
  else runPopularStocks();
}

// (참고) 기존 거래대금·상승률 기준 ETF 랭킹(fetchEtfMetrics·etfRankingHtml)은 아래 ETF 시장동향에서 계속 사용됨
// ETF 섹션의 시장동향(2026-09-01): 주식 시장동향에 있던 US ETF/KR ETF 랭킹을 이쪽 서브내비 칩 2개로 옮김
function openEtfTrend() {
  switchTab(TAB_ORDER.indexOf("topranking"));
  el("tabValuationBtn").classList.remove("active");
  tabTrendBtn.classList.remove("active");
  setCarouselViewTitle("tab.trend");
  showRankingGroup("trend");
  el("topRankingSubNav").innerHTML = `
    <button type="button" class="cat-btn top-ranking-tab active" data-etf-trend-region="us">${iconHtml("basket")}<span>US ETF</span></button>
    <button type="button" class="cat-btn top-ranking-tab" data-etf-trend-region="kr">${iconHtml("basket")}<span>KR ETF</span></button>
  `;
  runTrendEtf("us");
}
el("topRankingSubNav").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-etf-trend-region]");
  if (!btn) return;
  el("topRankingSubNav").querySelectorAll(".top-ranking-tab").forEach((b) => b.classList.toggle("active", b === btn));
  runTrendEtf(btn.dataset.etfTrendRegion);
});

const OPERATING_MARGIN_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 영업이익률 = 직전 분기 영업이익 ÷ 직전 분기 매출액(같은 분기 기준). 투자 자문이 아닙니다.</p>`;
async function runValueOperatingMargin() {
  await runValueScreenFromSP500(valuationButtons.operatingMargin, "영업이익률", {
    sortFn: (a, b) => (b.operatingMarginQuarterly ?? -Infinity) - (a.operatingMarginQuarterly ?? -Infinity),
    metricHeaderHtml: "영업이익률(직전분기)",
    metricCellFn: (r) => (r.operatingMarginQuarterly === null || r.operatingMarginQuarterly === undefined ? "N/A" : `${r.operatingMarginQuarterly.toFixed(1)}%`),
    noteHtml: OPERATING_MARGIN_NOTE,
  });
}

const ROE_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ROE = 직전 분기 순이익 ÷ 직전 분기말 자기자본(연환산하지 않은 분기 기준). 투자 자문이 아닙니다.</p>`;
async function runValueRoe() {
  await runValueScreenFromSP500(valuationButtons.roe, "ROE", {
    sortFn: (a, b) => (b.roeQuarterly ?? -Infinity) - (a.roeQuarterly ?? -Infinity),
    metricHeaderHtml: "ROE(직전분기)",
    metricCellFn: (r) => (r.roeQuarterly === null || r.roeQuarterly === undefined ? "N/A" : `${r.roeQuarterly.toFixed(1)}%`),
    noteHtml: ROE_NOTE,
  });
}

const DEBT_RATIO_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 부채비율 = 직전 분기말 부채총계 ÷ 직전 분기말 자기자본(낮을수록 재무구조가 안정적). 투자 자문이 아닙니다.</p>`;
async function runValueDebtRatio() {
  await runValueScreenFromSP500(valuationButtons.debtRatio, "부채비율", {
    sortFn: (a, b) => (a.debtRatioQuarterly ?? Infinity) - (b.debtRatioQuarterly ?? Infinity),
    metricHeaderHtml: "부채비율(직전분기)",
    metricCellFn: (r) => (r.debtRatioQuarterly === null || r.debtRatioQuarterly === undefined ? "N/A" : `${r.debtRatioQuarterly.toFixed(1)}%`),
    noteHtml: DEBT_RATIO_NOTE,
  });
}

const WEEK52_LOW_NOTE = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 52주최저 = 최근 52주 최고~최저 구간에서 현재가의 위치(0%=52주 최저, 100%=52주 최고) — 낮을수록 저점에 가깝습니다. 투자 자문이 아닙니다.</p>`;
async function runValueWeek52Low() {
  await runValueScreenFromSP500(valuationButtons.week52Low, "52주최저", {
    sortFn: (a, b) => (a.week52RangePct ?? Infinity) - (b.week52RangePct ?? Infinity),
    metricHeaderHtml: "52주 구간 위치",
    // % 아래에 이 값이 어느 끝에 가까운지 안내(2026-08-31 사용자 요청): 50% 미만 "(0%: 최저)", 50% 이상 "(100%: 최고)"
    metricCellFn: (r) => {
      if (r.week52RangePct === null || r.week52RangePct === undefined) return "N/A";
      const hint = r.week52RangePct >= 50 ? "(100%: 최고)" : "(0%: 최저)";
      return `${r.week52RangePct.toFixed(0)}%<br><span class="week52-pos-hint">${hint}</span>`;
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

// 인사이트 대분류(1.자산&투자사 / 2.브랜드평판순 / 3.신기술 / 4.실적&공시 일정 / 5.뉴스 / 6.미래산업 성장성) 전환
// "자산&투자사"를 선택했을 때만 기관 2단 서브버튼(해외: insightFirmsNav, 국내: insightKrFirmsNav)을 보여줌
let insightActiveCategory = "firms";
let insightActiveInstitution = "blackrock";
let insightActiveKrInstitution = "nps";
let insightActiveFutureSource = "assetMgr";
const insightFirmsNav = el("insightFirmsNav");
const insightKrFirmsNav = el("insightKrFirmsNav");
const insightBrandNav = el("insightBrandNav");
const futureIndustryNav = el("futureIndustryNav");
function setInsightCategoryActive(key) {
  Object.entries(insightCategoryButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === key));
}
// "자산&투자사" 탭의 서브내비는 국내/해외에 따라 완전히 다른 기관 목록을 보여주므로, 두 nav 중 지금 시장에 맞는 쪽만 표시
function updateFirmsNavVisibility() {
  const isKr = getWatchlistActiveMarket() === "KR";
  const showFirms = insightActiveCategory === "firms";
  insightFirmsNav.style.display = showFirms && !isKr ? "" : "none";
  insightKrFirmsNav.style.display = showFirms && isKr ? "" : "none";
}
function switchInsightCategory(key) {
  if (insightActiveCategory === key) return;
  insightActiveCategory = key;
  setInsightCategoryActive(key);
  updateFirmsNavVisibility();
  insightBrandNav.style.display = key === "brand" ? "" : "none";
  futureIndustryNav.style.display = key === "futureIndustry" ? "" : "none";
  if (key === "brand") {
    // 국내는 다트공시(4대 지표), 해외는 브랜드평판순(3개 기관) — 이전에 보던 항목이 지금 시장에 없는 종류면 기본값으로 리셋
    const isKr = getWatchlistActiveMarket() === "KR";
    if (isKr !== DART_METRIC_KEYS.includes(insightActiveBrandOrg)) {
      insightActiveBrandOrg = defaultBrandOrgForMarket();
      setInsightBrandActive(insightActiveBrandOrg);
    }
  }
  runInsightCategory(key);
}
Object.entries(insightCategoryButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => switchInsightCategory(key));
});
setInsightCategoryActive(insightActiveCategory);

function runInsightCategory(key) {
  if (key === "firms") {
    if (getWatchlistActiveMarket() === "KR") runInsightKr(insightActiveKrInstitution);
    else runInsight(insightActiveInstitution);
  } else if (key === "brand") runInsightBrandTab(insightActiveBrandOrg);
  else if (key === "tech") runInsightTech();
  else if (key === "calendar") runInsightCalendar();
  else if (key === "news") runInsightNews();
  else if (key === "futureIndustry") runFutureIndustrySource(insightActiveFutureSource);
}

// 인사이트 서브내비(거대기업 13F 보유종목)에서 현재 선택된 버튼만 활성 표시
function setInsightActive(activeBtn) {
  Object.values(insightButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindInsight = (btn, institution) =>
  btn.addEventListener("click", () => {
    insightActiveInstitution = institution;
    setInsightActive(btn);
    runInsight(institution);
  });
bindInsight(insightButtons.blackrock, "blackrock");
bindInsight(insightButtons.vanguard, "vanguard");
bindInsight(insightButtons.stateStreet, "stateStreet");
bindInsight(insightButtons.berkshire, "berkshire");
bindInsight(insightButtons.goldman, "goldman");
bindInsight(insightButtons.morganStanley, "morganStanley");
bindInsight(insightButtons.jpmorgan, "jpmorgan");
bindInsight(insightButtons.ark, "ark");
bindInsight(insightButtons.softbank, "softbank");

// 거대기업(블랙록·뱅가드·버크셔 등) 13F 공시 기반 보유종목 TOP20
// SEC EDGAR 13F-HR(분기 공시)에서 직접 집계한 데이터. 13F는 분기 1회(최대 45일 지연)만 갱신되므로
// 실시간 백엔드 대신 분기마다 이 스냅샷을 갱신하는 방식으로 운영(자세한 내용은 각 institution 데이터의 asOf/prevAsOf 참고)
// 윗줄(자산운용사) = 블랙록·뱅가드·State Street(패시브 3대 운용사), 아랫줄(투자회사) = 버크셔·골드만삭스·모건스탠리·JP모건
const INSIGHT_INSTITUTION_LABELS = {
  blackrock: "블랙록",
  vanguard: "뱅가드",
  stateStreet: "State Street",
  berkshire: "버크셔 해서웨이",
  goldman: "골드만삭스",
  morganStanley: "모건스탠리",
  jpmorgan: "JP모건 체이스",
  ark: "ARK 인베스트",
  softbank: "소프트뱅크",
};

// 실제 데이터는 data/insight-<institution>.json에서 fetch — 이 파일들은 scripts/scan-13f.js가
// SEC EDGAR 13F-HR 공시를 직접 파싱해서 만들고, GitHub Actions(.github/workflows/insight-13f-scan.yml)가
// 매일 새 공시 여부를 확인해 자동으로 갱신·커밋한다(공시 다음날 안에 반영됨).
const insightDataCache = {};
async function getInsightData(institution) {
  if (insightDataCache[institution]) return insightDataCache[institution];
  const res = await fetch(`data/insight-${institution}.json`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  insightDataCache[institution] = data;
  return data;
}

function fmtBigUSD(usd, signed = false) {
  const sign = signed ? (usd > 0 ? "+" : usd < 0 ? "-" : "") : "";
  const abs = Math.abs(usd);
  let str;
  if (abs >= 1e12) str = `$${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) str = `$${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) str = `$${(abs / 1e6).toFixed(1)}M`;
  else str = `$${abs.toLocaleString()}`;
  return sign + str;
}

// "2026-05-15" -> "5/15"(제출일 기준 짧은 표기, 앞자리 0 제거)
function fmtSubmitMD(isoDate) {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function insightTableHtml(data) {
  const rows = data.holdings
    .map((h, i) => {
      const weightHtml =
        h.weightChangePt === null
          ? `${h.weightPct.toFixed(2)}%<br><span class="muted" style="font-size:11px;white-space:nowrap;">(신규)</span>`
          : `${h.weightPct.toFixed(2)}%<br><span class="${h.weightChangePt >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;white-space:nowrap;">(${fmtPct(h.weightChangePt, 2)})</span>`;
      const valueDeltaHtml =
        h.valueChangePct === null
          ? `<span class="muted">신규 편입</span>`
          : `<span class="${h.valueChangeUSD >= 0 ? "delta-up" : "delta-down"}">${fmtBigUSD(h.valueChangeUSD, true)} (${fmtPct(h.valueChangePct, 1)})</span>`;
      const nameCellHtml = h.ticker
        ? `<span class="ticker-cell">${tickerLogoHtml(h.ticker)}<b class="ticker-link" data-ticker="${escapeHtml(h.ticker)}">${escapeHtml(h.ticker)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(h.name)}</span>`
        : `<b>${escapeHtml(h.name)}</b><br><span class="muted" style="font-size:11px;">티커 매칭 안 됨</span>`;
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${nameCellHtml}</td>
        <td>${weightHtml}</td>
        <td>${fmtBigUSD(h.valueUSD)}<br><span style="font-size:11px;">${valueDeltaHtml}</span></td>
      </tr>`;
    })
    .join("");

  const noteHtml = data.dataNote
    ? `<p class="disclaimer" style="color:#f5a623;">⚠️ ${escapeHtml(data.dataNote)}</p>`
    : "";
  return `
    <p class="disclaimer tab-note">📢 <b>${escapeHtml(data.filerName)}</b> SEC 13F 공시 기준(${data.asOf} 보유 기준, ${data.filedDate} 제출) 보유종목 TOP20 · 총 신고 가치 ${fmtBigUSD(data.totalValueUSD)} · 직전 제출(${data.prevFiledDate}) 대비 비중·금액 변동 표시. 13F는 매수/매도 시점이 아닌 분기말 스냅샷이라 최대 45일 지연될 수 있으며, 투자 자문이 아닙니다.</p>
    ${noteHtml}
    <table class="top30-table insight-holdings-table">
      <colgroup>
        <col class="col-rank" /><col class="col-name" /><col class="col-weight" /><col class="col-value" />
      </colgroup>
      <thead>
        <tr><th>순위</th><th>종목</th><th>${data.filedDate.slice(5)}<br>비중 (변동)</th><th>총 신고가치<br>(금액변동)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function runInsight(institution) {
  insightActiveInstitution = institution;
  insightActiveCategory = "firms";
  setInsightCategoryActive("firms");
  updateFirmsNavVisibility();
  insightBrandNav.style.display = "none";
  futureIndustryNav.style.display = "none";
  setInsightActive(insightButtons[institution]);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${INSIGHT_INSTITUTION_LABELS[institution]} 데이터를 불러오는 중...`;
  results.innerHTML = "";
  const data = await getInsightData(institution);
  if (!data || !Array.isArray(data.holdings)) {
    status.textContent = `🚧 ${INSIGHT_INSTITUTION_LABELS[institution]} 보유종목 데이터는 준비 중입니다. SEC 13F 공시(분기 공개, 최대 45일 지연)를 기반으로 곧 제공될 예정입니다.`;
    return;
  }
  status.style.display = "none";
  results.innerHTML = insightTableHtml(data);
}

// ---------- 1-KR. 기관&자산운용사(국내) — DART 5%룰(대량보유상황보고서) 기반 개별 종목 보유비중 ----------
// 실제 데이터는 data/insight-kr-institutions.json(정적, 수동 갱신)에서 fetch. SEC 13F처럼 구조화된 정기 공시가
// 아니라 5% 이상 보유·1%p 이상 변동 시에만 수시로 올라오는 공시라, 종목 수가 institution마다 다르고
// 상시 갱신 배치가 없음(수동으로 최신 DART 공시 재확인 후 JSON을 갱신하는 방식) — dataNote로 갱신 기준일 명시
const INSIGHT_KR_INSTITUTION_LABELS = {
  nps: "국민연금공단",
  samsungAm: "삼성자산운용",
  miraeAm: "미래에셋자산운용",
  kbAm: "KB자산운용",
};
let krInstitutionDataPromise = null;
function getKrInstitutionData() {
  if (!krInstitutionDataPromise) {
    krInstitutionDataPromise = fetch("data/insight-kr-institutions.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return krInstitutionDataPromise;
}
// 해외 13F 테이블(insightTableHtml)과 동일한 4열 구조(순위/종목/비중(변동)/총 신고가치(금액변동))로 통일 —
// 별도 안내문구 없이 표만 표시. DART 5%룰은 종목마다 공시일이 달라 헤더에 날짜를 못 박지 못하므로, 비중 셀 아래에 종목별 공시일을 표시
function krInstitutionTableHtml(inst) {
  if (!inst.holdings || !inst.holdings.length) {
    return `<p class="disclaimer tab-note">🚧 ${escapeHtml(inst.unavailableNote || "공시된 개별 종목 보유 내역이 없습니다.")}</p>`;
  }
  const rows = inst.holdings
    .map((h, i) => {
      const nameCellHtml = h.ticker
        ? `<span class="ticker-cell">${tickerLogoHtml(h.ticker)}<b class="ticker-link" data-ticker="${escapeHtml(h.ticker)}">${escapeHtml(h.name)}</b></span>`
        : `<b>${escapeHtml(h.name)}</b>`;
      const dateHtml = `<span class="muted" style="font-size:11px;white-space:nowrap;">${escapeHtml(h.asOfDate)}</span>`;
      const deltaHtml = h.isNew
        ? `<span class="muted" style="font-size:11px;white-space:nowrap;">(신규)</span><br>${dateHtml}`
        : typeof h.weightChangePt === "number"
          ? `<span class="${h.weightChangePt >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;white-space:nowrap;">(${h.weightChangePt >= 0 ? "+" : ""}${h.weightChangePt.toFixed(2)}%p)</span><br>${dateHtml}`
          : dateHtml;
      const valueHtml = typeof h.valueKRW === "number" ? fmtKrwCompact(h.valueKRW) : "N/A";
      const valueDeltaHtml =
        typeof h.valueChangeKRW === "number"
          ? `<span class="${h.valueChangeKRW >= 0 ? "delta-up" : "delta-down"}">${h.valueChangeKRW >= 0 ? "+" : ""}${fmtKrwCompact(h.valueChangeKRW)}</span>`
          : "";
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${nameCellHtml}</td>
        <td>${h.weightPct.toFixed(2)}%<br>${deltaHtml}</td>
        <td>${valueHtml}${valueDeltaHtml ? `<br><span style="font-size:11px;">${valueDeltaHtml}</span>` : ""}</td>
      </tr>`;
    })
    .join("");
  return `
    <table class="top30-table insight-holdings-table">
      <colgroup>
        <col class="col-rank" /><col class="col-name" /><col class="col-weight" /><col class="col-value" />
      </colgroup>
      <thead><tr><th>순위</th><th>종목</th><th>비중 (변동)</th><th>총 신고가치<br>(금액변동)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
async function runInsightKr(institution) {
  insightActiveKrInstitution = institution;
  insightActiveCategory = "firms";
  setInsightCategoryActive("firms");
  updateFirmsNavVisibility();
  insightBrandNav.style.display = "none";
  futureIndustryNav.style.display = "none";
  Object.values(insightKrButtons).forEach((b) => b && b.classList.toggle("active", b === insightKrButtons[institution]));
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${INSIGHT_KR_INSTITUTION_LABELS[institution]} 데이터를 불러오는 중...`;
  results.innerHTML = "";
  const data = await getKrInstitutionData();
  const inst = data && data.institutions && data.institutions[institution];
  if (!inst) {
    status.textContent = `🚧 ${INSIGHT_KR_INSTITUTION_LABELS[institution]} 데이터는 준비 중입니다.`;
    return;
  }
  status.style.display = "none";
  results.innerHTML = krInstitutionTableHtml(inst);
}
Object.entries(insightKrButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => runInsightKr(key));
});

// ---------- 2. 브랜드평판순 ----------
// Axios Harris Poll 100(2026년 전체 100개, RQ 점수) · RepTrak(2026년 전체표는 이메일 등록 리포트에만 있어
// 공개된 가장 최신 완전판인 2025년 Global RepTrak 100 + 뉴스에 공개된 2026년 확인 순위 일부) ·
// YouGov(연간 유료 리포트 대신 같은 회사가 실시간 공개 운영하는 Ratings 사이트의 인기도 지표, 40위까지)
// — 세 곳 모두 실제 웹에 공개된 데이터만 정적으로 data/brand-reputation-*.json에 정리해두고,
// 현재가·1년 변동은 이 함수가 매번 실시간으로 조회해서 붙임
const BRAND_ORG_DATA_FILE = {
  harris: "data/brand-reputation-harris.json",
  reptrak: "data/brand-reputation-reptrak.json",
  yougov: "data/brand-reputation-yougov.json",
};
const BRAND_ORG_LABEL = { harris: "Axios Harris Poll 100", reptrak: "RepTrak", yougov: "YouGov" };
const DART_METRIC_KEYS = ["salary", "tenure", "buyback", "headcount"];
const DART_METRIC_LABEL = { salary: "평균연봉", tenure: "평균근속", buyback: "자사주 취득", headcount: "직원증가" };
const insightBrandButtons = {
  harris: el("insightBrandHarrisBtn"),
  reptrak: el("insightBrandReptrakBtn"),
  yougov: el("insightBrandYougovBtn"),
  salary: el("insightDartSalaryBtn"),
  tenure: el("insightDartTenureBtn"),
  buyback: el("insightDartBuybackBtn"),
  headcount: el("insightDartHeadcountBtn"),
};
let insightActiveBrandOrg = "harris";
function setInsightBrandActive(org) {
  Object.entries(insightBrandButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === org));
}
function defaultBrandOrgForMarket() {
  return getWatchlistActiveMarket() === "KR" ? "salary" : "harris";
}
function runInsightBrandTab(org) {
  if (DART_METRIC_KEYS.includes(org)) runInsightDart(org);
  else runInsightBrand(org);
}
Object.entries(insightBrandButtons).forEach(([org, btn]) => {
  btn.addEventListener("click", () => {
    if (insightActiveCategory === "brand" && insightActiveBrandOrg === org) return;
    insightActiveBrandOrg = org;
    insightActiveCategory = "brand";
    setInsightCategoryActive("brand");
    insightFirmsNav.style.display = "none";
    insightKrFirmsNav.style.display = "none";
    futureIndustryNav.style.display = "none";
    insightBrandNav.style.display = "";
    runInsightBrandTab(org);
  });
});
setInsightBrandActive(insightActiveBrandOrg);
// 국내/해외 토글을 바꾸는 순간 다트공시/브랜드평판순 탭을 보고 있었다면, 그 시장에 맞는 기본 항목으로 새로 불러옴
document.addEventListener("marketmodechange", () => {
  if (insightActiveCategory !== "brand") return;
  insightActiveBrandOrg = defaultBrandOrgForMarket();
  setInsightBrandActive(insightActiveBrandOrg);
  runInsightBrandTab(insightActiveBrandOrg);
});
// "자산&투자사" 탭을 보고 있는 중에 국내/해외를 전환하면 서브내비(insightFirmsNav↔insightKrFirmsNav)와 데이터를 함께 갱신
document.addEventListener("marketmodechange", () => {
  if (insightActiveCategory !== "firms") return;
  updateFirmsNavVisibility();
  if (getWatchlistActiveMarket() === "KR") runInsightKr(insightActiveKrInstitution);
  else runInsight(insightActiveInstitution);
});
// 국내/해외 전환 시 지금 보고 있는 화면을 새 시장 기준으로 즉시 새로고침 —
// 기업가치/시장동향은 활성 그룹의 첫 항목을 자동 실행, 인사이트의 나머지 카테고리도 현재 카테고리를 다시 불러옴
document.addEventListener("marketmodechange", () => {
  const activeKey = TAB_ORDER[activeTabIndex];
  if (activeKey === "topranking") {
    activateRankingGroup(tabTrendBtn.classList.contains("active") ? "market" : "disclosure");
  } else if (activeKey === "insight" && insightActiveCategory && insightActiveCategory !== "brand" && insightActiveCategory !== "firms") {
    runInsightCategory(insightActiveCategory);
  }
});

const brandDataCache = {};
async function getBrandData(org) {
  if (brandDataCache[org]) return brandDataCache[org];
  const res = await fetch(BRAND_ORG_DATA_FILE[org], { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  brandDataCache[org] = data;
  return data;
}

// 순위·점수는 연 1회 발표되는 정적 데이터라 실시간 조회가 필요 없지만, 현재가·1년 변동까지 매번
// 브라우저에서 라이브로 30개+ 종목을 조회하면(무료 CORS 프록시 경유) 화면이 한참 걸림 — 그래서
// GitHub Actions(scan-brand-reputation-prices.js)가 매일 미리 구워둔 스냅샷을 우선 사용하고,
// 스냅샷에 없는 티커(다음 자동 갱신 전 새로 추가된 경우 등)만 그때그때 라이브로 보충 조회함
let brandPriceSnapshotPromise = null;
function getBrandPriceSnapshot() {
  if (!brandPriceSnapshotPromise) {
    brandPriceSnapshotPromise = fetch("data/brand-reputation-prices.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data && data.prices) || {})
      .catch(() => ({}));
  }
  return brandPriceSnapshotPromise;
}

// 가벼운 조회(차트 1개만)로 현재가 + 1년 변동(금액·%)만 계산 — getFullMetrics는 재무제표까지 같이 가져와
// 브랜드 100개를 한꺼번에 조회하기엔 과함
async function getPriceAnd1yReturn(symbol) {
  try {
    const chartData = await yahooChart(symbol, "1y");
    const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
    if (!result) return null;
    const pairs = chartClosePairs(chartData);
    const latest = pairs[pairs.length - 1];
    const base = pairs.length >= 2 ? closestPair(pairs, latest.t - YEAR_SECONDS) : null;
    return {
      price: result.meta.regularMarketPrice,
      currency: result.meta.currency,
      oneYearReturn: get1yReturnFromChart(chartData),
      oneYearChangeAmt: base && base.c && latest ? latest.c - base.c : null,
    };
  } catch {
    return null;
  }
}

// 티커가 없는(비상장) 브랜드평판 항목 전용 로고 — 자동 로고 소스(financialmodelingprep)는 티커 기반이라 쓸 수 없어서
// Wikimedia Commons에서 받은 공식 로고를 logos/brand/에 자체 호스팅(모두 자유 이용 라이선스 파일만 사용).
// 검색해도 커먼즈에 쓸 만한 로고가 없던 항목(Athletic Brewing, USAA, Windex, X Corp.)은 기존처럼 이니셜 배지로 남겨둠.
const BRAND_NAME_LOGO = {
  Aldi: { src: "logos/brand/aldi.png", bg: "#ffffff" },
  "Alo Yoga": { src: "logos/brand/alo-yoga.svg", bg: "#ffffff" },
  "Anthropic (Claude)": { src: "logos/brand/anthropic.svg", bg: "#ffffff" },
  BIC: { src: "logos/brand/bic.svg", bg: "#ffffff" },
  Barilla: { src: "logos/brand/barilla.svg", bg: "#ffffff" },
  "Barnes & Noble": { src: "logos/brand/barnes-noble.svg", bg: "#ffffff" },
  Bosch: { src: "logos/brand/bosch.svg", bg: "#ffffff" },
  "Chick-fil-A": { src: "logos/brand/chick-fil-a.svg", bg: "#ffffff" },
  Dior: { src: "logos/brand/dior.svg", bg: "#ffffff" },
  "Dove (chocolate)": { src: "logos/brand/dove-chocolate.png", bg: "#ffffff" },
  Duracell: { src: "logos/brand/duracell.svg", bg: "#ffffff" },
  Dyson: { src: "logos/brand/dyson.svg", bg: "#ffffff" },
  "Giorgio Armani": { src: "logos/brand/armani.png", bg: "#ffffff" },
  LavAzza: { src: "logos/brand/lavazza.svg", bg: "#ffffff" },
  Lego: { src: "logos/brand/lego.svg", bg: "#ffffff" },
  Lipton: { src: "logos/brand/lipton.svg", bg: "#ffffff" },
  "M&M's": { src: "logos/brand/mms.svg", bg: "#ffffff" },
  Miele: { src: "logos/brand/miele.svg", bg: "#ffffff" },
  "OpenAI (ChatGPT)": { src: "logos/brand/openai.svg", bg: "#ffffff" },
  Patagonia: { src: "logos/brand/patagonia.svg", bg: "#ffffff" },
  Pirelli: { src: "logos/brand/pirelli.svg", bg: "#ffffff" },
  Polymarket: { src: "logos/brand/polymarket.svg", bg: "#ffffff" },
  Rolex: { src: "logos/brand/rolex.svg", bg: "#ffffff" },
  Shein: { src: "logos/brand/shein.svg", bg: "#ffffff" },
  "Singapore Airlines": { src: "logos/brand/singapore-airlines.svg", bg: "#ffffff" },
  Snickers: { src: "logos/brand/snickers.svg", bg: "#ffffff" },
  SpaceX: { src: "logos/brand/spacex.svg", bg: "#ffffff" },
  "Spirit Airlines": { src: "logos/brand/spirit-airlines.svg", bg: "#ffffff" },
  "State Farm Insurance": { src: "logos/brand/state-farm.svg", bg: "#ffffff" },
  TikTok: { src: "logos/brand/tiktok.svg", bg: "#ffffff" },
  "Trader Joe's": { src: "logos/brand/trader-joes.svg", bg: "#ffffff" },
  Ziploc: { src: "logos/brand/ziploc.svg", bg: "#ffffff" },
};
// 비상장 항목의 로고 셀 — 지정 로고가 있으면 그걸 쓰고, 없으면 기존처럼 이름 앞 2글자 배지로 폴백
function brandNameLogoHtml(name) {
  const ov = BRAND_NAME_LOGO[name];
  if (!ov) return `<span class="ticker-logo-wrap"><span class="ticker-logo-badge" style="display:flex;">${escapeHtml(name.slice(0, 2))}</span></span>`;
  const wrapStyle = ov.bg ? ` style="background:${ov.bg}"` : "";
  return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${ov.src}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="ticker-logo-badge" style="display:none;">${escapeHtml(name.slice(0, 2))}</span></span>`;
}

function brandRepTableHtml(rows, scoreLabel) {
  const trs = rows
    .map((r) => {
      // 한글명이 있으면 한글명을 우선 쓰고, 관심종목 리스트처럼 이름(굵게)-티커(작게·아래줄)를 세로로 구분해 표시
      const displayName = r.ticker ? TICKER_TO_KOREAN_NAME[r.ticker] || r.name : r.name;
      const nameCell = r.ticker
        ? `<span class="brand-rep-name-cell">${tickerLogoHtml(r.ticker)}<span class="brand-rep-name-text"><b class="ticker-link" data-ticker="${escapeHtml(r.ticker)}">${escapeHtml(displayName)}</b><span class="muted brand-rep-ticker">${escapeHtml(r.ticker)}</span></span></span>`
        : `<span class="brand-rep-name-cell">${brandNameLogoHtml(r.name)}<span class="brand-rep-name-text"><b>${escapeHtml(displayName)}</b></span></span>`;
      let priceCell = `<span class="muted">비상장</span>`;
      if (r.ticker) {
        priceCell = r.metrics
          ? `${priceChartLink(r.ticker, fmtPrice(r.metrics.price, r.metrics.currency))}<br><span class="${r.metrics.oneYearReturn >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.metrics.oneYearChangeAmt !== null ? `${r.metrics.oneYearChangeAmt >= 0 ? "+" : ""}${fmtPrice(r.metrics.oneYearChangeAmt, r.metrics.currency)}` : ""}${r.metrics.oneYearReturn !== null ? `<br>(${fmtPct(r.metrics.oneYearReturn)})` : r.metrics.oneYearChangeAmt === null ? "N/A" : ""}</span>`
          : `<span class="muted">조회 실패</span>`;
      }
      const scoreCell = r.score !== null && r.score !== undefined ? r.score : r.prevRank ? `${r.prevRank}위` : "—";
      return `<tr><td>${r.rank}</td><td>${nameCell}</td><td>${priceCell}</td><td>${scoreCell}</td></tr>`;
    })
    .join("");
  // "인기도(Popularity)"처럼 영문 괄호가 붙는 라벨은 괄호 앞에서 줄바꿈(짧은 라벨은 괄호가 없어 그대로 유지)
  const scoreLabelHtml = escapeHtml(scoreLabel).replace(/(\()/, "<br>$1");
  return `
    <table class="top30-table brand-rep-table">
      <thead><tr><th>순위</th><th>기업</th><th>현재가<br>(1년 변동)</th><th>${scoreLabelHtml}</th></tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
}

const BRAND_PAGE_SIZE = 30;
const BRAND_PAGE_STEP = 20;
async function runInsightBrand(org) {
  insightActiveBrandOrg = org;
  setInsightBrandActive(org);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${BRAND_ORG_LABEL[org]} 데이터를 불러오는 중...`;
  results.innerHTML = "";

  const data = await getBrandData(org);
  if (!data || !Array.isArray(data.companies)) {
    status.textContent = `🚧 ${BRAND_ORG_LABEL[org]} 데이터를 가져오지 못했습니다.`;
    return;
  }
  status.style.display = "none";

  const rows = data.companies;
  let shownCount = 0;

  async function showUpTo(count) {
    const pending = rows.slice(shownCount, count).filter((r) => r.ticker && !r.metrics);
    if (pending.length) {
      const snapshot = await getBrandPriceSnapshot();
      const stillMissing = pending.filter((r) => !snapshot[r.ticker]);
      pending.forEach((r) => {
        if (snapshot[r.ticker]) r.metrics = snapshot[r.ticker];
      });
      if (stillMissing.length) {
        const metricsList = await mapWithConcurrency(stillMissing, 4, (r) => getPriceAnd1yReturn(r.ticker));
        stillMissing.forEach((r, i) => {
          r.metrics = metricsList[i];
        });
      }
    }
    shownCount = count;
    const shown = rows.slice(0, shownCount);
    const hasMore = shownCount < rows.length;
    const nextCount = Math.min(shownCount + BRAND_PAGE_STEP, rows.length);
    const confirmedNote =
      data.confirmed2026 && data.confirmed2026.length
        ? `<p class="disclaimer" style="margin-top:8px;">✅ 2026년 확인된 순위: ${data.confirmed2026.map((c) => `${escapeHtml(c.name)} ${c.rank}위`).join(" · ")}</p>`
        : "";
    results.innerHTML = `
      <p class="disclaimer tab-note">📢 ${escapeHtml(data.sourceNote)} <a href="${escapeHtml(data.sourceUrl)}" target="_blank" rel="noopener">출처 보기</a></p>
      ${brandRepTableHtml(shown, data.scoreLabel)}
      ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${nextCount}">더보기 (${shownCount}/${rows.length})</button>` : ""}
      ${confirmedNote}
    `;
  }

  results._loadMore = (count) => showUpTo(count);
  if (!results.dataset.brandMoreBound) {
    results.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      moreBtn.disabled = true;
      moreBtn.textContent = "불러오는 중...";
      results._loadMore(Number(moreBtn.dataset.nextCount));
    });
    results.dataset.brandMoreBound = "1";
  }

  await showUpTo(Math.min(BRAND_PAGE_SIZE, rows.length));
}

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
function dartMetricHeaderLabel(metric) {
  return {
    salary: "평균연봉",
    tenure: "평균근속연수",
    buyback: "자사주 취득금액<br>(최근 1년, 이사회 결정 기준)",
    headcount: "직원 증가(전년 대비)",
  }[metric];
}
function dartMetricCellHtml(r, metric) {
  if (metric === "salary") return r.avgSalary != null ? `${Math.round(r.avgSalary).toLocaleString()}원` : "N/A";
  if (metric === "tenure") return r.avgTenureYears != null ? `${r.avgTenureYears.toFixed(1)}년` : "N/A";
  if (metric === "buyback") return r.buybackAmount ? fmtCompactCurrency(r.buybackAmount, "KRW") : "N/A";
  if (metric === "headcount")
    return r.headcountChange != null ? `<span class="${r.headcountChange >= 0 ? "delta-up" : "delta-down"}">${r.headcountChange >= 0 ? "+" : ""}${r.headcountChange.toLocaleString()}명</span>` : "N/A";
  return "N/A";
}
// 평균연봉은 지주회사(임원 위주 소수 인원, 실제 사업·직원은 계열사 별도 법인 소속)가 섞이면
// 1인당 평균이 비정상적으로 치솟아 순위를 왜곡함(예: 직원 8명짜리 오리온홀딩스가 직원 수천 명인
// 오리온 본체보다 위에 뜸). 최소 인원(100명) 기준을 넘겨도 KB금융(144명)·신한지주(195명)처럼
// 금융지주·순수지주는 여전히 왜곡되므로(계열 은행 직원은 별도 법인 소속) 상호에 "지주"/"홀딩스"가
// 들어간 곳 + 상호에 안 드러나는 대표 순수지주(LG·KB금융)를 함께 제외한다. SK·삼성물산·두산처럼
// 지주회사여도 사업을 직접 운영해 직원 수가 많은 곳은 왜곡이 없어 그대로 둔다.
// HD한국조선해양도 같은 케이스 — 조선 부문 중간지주회사로, 실제 생산인력은 현대중공업·현대미포조선·
// 현대삼호중공업 등 별도 법인 소속이라 본사엔 설계·영업 인력만 남아 평균이 왜곡됨(2026-08 확인).
const DART_MIN_HEADCOUNT_FOR_SALARY = 100;
const HOLDING_COMPANY_NAME_PATTERN = /지주|홀딩스/;
const HOLDING_COMPANY_EXTRA_NAMES = new Set(["LG", "KB금융", "HD한국조선해양"]);
function isPureHoldingCompany(corpName) {
  if (!corpName) return false;
  return HOLDING_COMPANY_EXTRA_NAMES.has(corpName) || HOLDING_COMPANY_NAME_PATTERN.test(corpName);
}
const DART_METRIC_FILTER = {
  salary: (r) => r.avgSalary != null && r.headcount >= DART_MIN_HEADCOUNT_FOR_SALARY && !isPureHoldingCompany(r.corpName),
  tenure: (r) => r.avgTenureYears != null,
  buyback: (r) => r.buybackAmount > 0,
  headcount: (r) => r.headcountChange != null,
};
const DART_METRIC_SORT = {
  salary: (a, b) => (b.avgSalary ?? -Infinity) - (a.avgSalary ?? -Infinity),
  tenure: (a, b) => (b.avgTenureYears ?? -Infinity) - (a.avgTenureYears ?? -Infinity),
  buyback: (a, b) => (b.buybackAmount ?? -Infinity) - (a.buybackAmount ?? -Infinity),
  headcount: (a, b) => (b.headcountChange ?? -Infinity) - (a.headcountChange ?? -Infinity),
};
function dartRankRowHtml(r, i, metric) {
  return `
    <tr>
      <td>${i + 1}</td>
      <td><span class="ticker-cell">${tickerLogoHtml(r.symbol, r.corpName ? r.corpName.slice(0, 2) : undefined)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.corpName || r.symbol)}</b></span></td>
      <td>${dartMetricCellHtml(r, metric)}</td>
    </tr>`;
}
async function runInsightDart(metric) {
  insightActiveBrandOrg = metric;
  setInsightBrandActive(metric);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${DART_METRIC_LABEL[metric]} 데이터를 불러오는 중...`;
  results.innerHTML = "";

  const data = await getDartFinancialsData();
  if (!data || !Array.isArray(data.items)) {
    status.textContent = `🚧 다트공시 데이터를 아직 가져올 수 없습니다.`;
    return;
  }
  status.style.display = "none";

  const ranked = data.items.filter(DART_METRIC_FILTER[metric]).sort(DART_METRIC_SORT[metric]).slice(0, 50);

  function paint(count) {
    const visible = ranked.slice(0, count);
    const rest = ranked.slice(count);
    results.innerHTML = `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 코스피200+코스닥150(약 350종목) 대상, DART 전자공시(사업보고서 임직원 현황·자기주식취득결정, ${escapeHtml(String(data.dataYear || ""))}년 사업연도 기준) 데이터입니다. 자사주 취득금액은 이사회 결정(계획) 금액 합계로 실제 집행 완료 금액과 다를 수 있습니다.${metric === "salary" ? ` 직원 수 ${DART_MIN_HEADCOUNT_FOR_SALARY}명 미만 법인과 지주회사(상호에 "지주"·"홀딩스" 포함 및 LG·KB금융)는 임원 위주 소수 인원이라 1인당 평균이 왜곡될 수 있어 순위에서 제외했습니다.` : ""} 투자 자문이 아닙니다.</p>
      <table class="top30-table">
        <thead><tr><th>순위</th><th>기업</th><th>${dartMetricHeaderLabel(metric)}</th></tr></thead>
        <tbody>${visible.map((r, i) => dartRankRowHtml(r, i, metric)).join("")}</tbody>
      </table>
      ${rest.length ? `<button type="button" class="cat-btn load-more-btn" id="dartRankMoreBtn">더보기 (${visible.length}/${ranked.length})</button>` : ""}
    `;
    const moreBtn = el("dartRankMoreBtn");
    if (moreBtn) {
      moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        paint(ranked.length);
      });
    }
  }
  if (ranked.length === 0) {
    results.innerHTML = `<p class="muted">표시할 데이터가 없습니다.</p>`;
    return;
  }
  paint(20);
}

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

function techInsightCardHtml(item) {
  const sourceLabel = TECH_SOURCE_LABEL[item.sourceKey] || item.source;
  return `
    <div class="tech-insight-card">
      <img class="tech-insight-img" src="${escapeHtml(item.image)}" alt="" loading="lazy" />
      <div class="tech-insight-body">
        <span class="tech-insight-source">${escapeHtml(sourceLabel)}</span>
        <h3 class="tech-insight-title">${escapeHtml(item.title)}</h3>
        <p class="tech-insight-summary">${escapeHtml(item.summary).replace(/\n/g, "<br>")}</p>
        <a class="tech-insight-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">원문 보기(${escapeHtml(sourceLabel)}) →</a>
      </div>
    </div>`;
}

async function runInsightTech() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 신기술 인사이트를 불러오는 중...";
  results.innerHTML = "";

  const items = await getTechInsightData();
  if (!Array.isArray(items) || items.length === 0) {
    status.textContent = "🚧 신기술 인사이트는 준비 중입니다. 매일 자동 수집이 시작되면 곧 표시됩니다.";
    return;
  }
  status.style.display = "none";
  results.innerHTML = `
    <p class="disclaimer tab-note">📢 MIT Technology Review·McKinsey·IEEE Spectrum·OECD의 최신 글 핵심을 자체적으로 요약·재구성한 것이며, 정확한 내용은 원문 링크에서 확인하세요. 삽화는 AI로 생성되어 실제 사진과 다를 수 있습니다.</p>
    <div class="tech-insight-list">${items.map(techInsightCardHtml).join("")}</div>
  `;
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

// 인사이트 탭 "실적&공시 일정" 서브버튼 — 예전처럼 날짜순 텍스트 목록만 표시(그리드 없음).
// 데이터 자체는 buildCalendarEvents()를 그대로 재사용해 관심종목 실적·배당(추정)도 함께 나옴
async function runInsightCalendar() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 실적&공시 일정을 불러오는 중...";
  results.innerHTML = "";

  const { events, usingWatchlist } = await buildCalendarEvents();
  const todayISO = toISODate(new Date());
  const upcoming = events.filter((e) => e.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));

  status.style.display = "none";
  const rows = upcoming
    .map((e) => {
      if (e.type === "stock") {
        const catLabel = e.category === "earnings" ? "🏢 기업실적" : "💰 배당락";
        return `<div class="econ-cal-row"><span class="econ-cal-date">${escapeHtml(e.date)}</span><span class="econ-cal-cat">${catLabel}</span><span class="econ-cal-title">${escapeHtml(e.symbol)} ${escapeHtml(e.title)}</span></div>`;
      }
      const flag = ECON_CALENDAR_COUNTRY_FLAG[e.country] || "";
      const catLabel = ECON_CALENDAR_CATEGORY_LABEL[e.category] || e.category;
      return `<div class="econ-cal-row"><span class="econ-cal-date">${escapeHtml(e.date)}</span><span class="econ-cal-cat">${catLabel}</span><span class="econ-cal-title">${flag} ${escapeHtml(e.title)}</span></div>`;
    })
    .join("");

  const watchlistNote = usingWatchlist
    ? "🏢·💰 항목은 회원님의 관심종목 기준입니다."
    : "🏢·💰 항목은 관심종목이 없어 주요 대형주 기준으로 표시 중입니다.";

  results.innerHTML = `
    <p class="muted" style="font-size:12px;margin:0 0 8px;">*관심종목 추가시 분기 실적, 배당락일이 일정에 추가됩니다.</p>
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 실적발표·배당락은 과거 발표 주기를 바탕으로 한 추정치, 13F 공시 마감·금리 발표·CPI·고용지표는 2026년 공식 일정 조사 기준(변경될 수 있음), 옵션만기일은 매월 세 번째 금요일로 계산한 값입니다. ${escapeHtml(watchlistNote)} 투자 자문이 아닙니다.</p>
    <div class="econ-cal-list">${rows || `<p class="muted" style="text-align:center;padding:16px 0;">표시할 예정 일정이 없습니다.</p>`}</div>
  `;
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

// ---------- 5. 뉴스 ----------
// 관심종목(있으면)·없으면 주요 대형주 20개의 Yahoo Finance 뉴스를 모아 발행시각 기준 최신순으로 정렬해 TOP20 표시
const NEWS_DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "WMT",
  "V", "JNJ", "UNH", "XOM", "AVGO", "LLY", "MA", "HD", "PG", "COST",
];
async function getMultiTickerNews(symbols) {
  const perSymbol = await mapWithConcurrency(symbols, 5, async (sym) => {
    try {
      const data = await yahooSearch(sym);
      return ((data && data.news) || []).map((n) => ({ ...n, symbol: sym }));
    } catch {
      return [];
    }
  });
  return perSymbol.flat();
}

async function runInsightNews() {
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 주요기업 최신 뉴스를 불러오는 중...";
  results.innerHTML = "";

  const watchlistSymbols = getWatchlist().map((w) => w.symbol);
  const symbols = watchlistSymbols.length ? watchlistSymbols : NEWS_DEFAULT_WATCHLIST;

  const allNews = await getMultiTickerNews(symbols);
  allNews.sort((a, b) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0));
  const seenLinks = new Set();
  const top20 = [];
  for (const n of allNews) {
    if (!n.link || seenLinks.has(n.link)) continue;
    seenLinks.add(n.link);
    top20.push(n);
    if (top20.length >= 20) break;
  }

  if (top20.length === 0) {
    status.textContent = "🚧 최근 뉴스를 찾을 수 없습니다.";
    return;
  }
  status.style.display = "none";

  const translatedTitles = await Promise.all(top20.map((n) => translateToKorean(n.title || "").catch(() => n.title || "")));

  const rows = top20
    .map((n, i) => {
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      const dateStr = n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "";
      return `
      <div class="major-news-row">
        <span class="major-news-logo">${tickerLogoHtml(n.symbol)}</span>
        <div class="major-news-body">
          <a class="major-news-title" href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a>
          <div class="major-news-meta"><b class="ticker-link" data-ticker="${escapeHtml(n.symbol)}">${escapeHtml(n.symbol)}</b> · ${escapeHtml(n.publisher || "알 수 없음")}${dateStr ? " · " + escapeHtml(dateStr) : ""}</div>
        </div>
      </div>`;
    })
    .join("");

  results.innerHTML = `
    <p class="disclaimer tab-note">📢 주요기업 최신 뉴스 — ${watchlistSymbols.length ? "관심종목" : "주요 대형주 20개"} 기준으로 모은 뉴스를 발행 시각 최신순으로 정렬한 TOP20입니다(맨 위가 최신). 제목은 자동 번역되었습니다.</p>
    <div class="major-news-list">${rows}</div>
  `;
}

// ---------- 6. 미래산업 성장성 ----------
// 3개 소스를 가로 스크롤 서브버튼(futureIndustryNav)으로 전환하며 보여줌:
// 1) 자산운용사 — 블랙록·JP모건·골드만삭스 테마 리서치 공통 유망 산업(data/insight-future-industries.json, 기존 구조 유지)
// 2~3) OECD·IMF — 각 기관이 실제 발표한 보고서 기준(data/insight-future-industries-<key>.json),
//    기관마다 발표 형식이 달라 industries 플랫 리스트가 아니라 report(섹션) 단위로 구조화(섹션마다 정확한 지표명·예측기간·발표일·출처 명시)
// KDI·KIET·한국은행(BOK)은 공공누리 제4유형(상업이용+변경 모두 금지) 라이선스라 AI 재요약(변경) 자체가
// 비영리로 운영해도 위반 소지가 있어 2026-08-26에 제외함 — data/research-content-licensing.md 참고
let futureIndustryDataPromise = null;
function getFutureIndustryData() {
  if (!futureIndustryDataPromise) {
    futureIndustryDataPromise = fetch("data/insight-future-industries.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return futureIndustryDataPromise;
}
function futureIndustryGroupsHtml(data) {
  const groupsHtml = data.groups
    .map((g) => {
      const rows = [...g.industries]
        .sort((a, b) => b.cagrPct - a.cagrPct)
        .map(
          (ind) =>
            `<div class="future-ind-row"><span class="future-ind-name">${escapeHtml(ind.name)}</span><span class="future-ind-cagr delta-up">연평균 +${ind.cagrPct.toFixed(1)}%</span></div>`
        )
        .join("");
      return `
        <div class="future-ind-group">
          <h3 class="future-ind-group-title">${escapeHtml(g.institution)} <span class="muted" style="font-weight:400;font-size:12px;">· ${escapeHtml(g.focus)}</span></h3>
          <div class="future-ind-list">${rows}</div>
        </div>`;
    })
    .join("");
  return `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${escapeHtml(data.sourceNote)}</p>${groupsHtml}`;
}

const FUTURE_INDUSTRY_SOURCE_FILE = {
  oecd: "data/insight-future-industries-oecd.json",
  imf: "data/insight-future-industries-imf.json",
};
const futureIndustrySourceCache = {};
function getFutureIndustrySourceData(key) {
  if (!futureIndustrySourceCache[key]) {
    futureIndustrySourceCache[key] = fetch(FUTURE_INDUSTRY_SOURCE_FILE[key], { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return futureIndustrySourceCache[key];
}
// 기관마다 실제 공개된 산업별 성장률 전망의 형식·개수·지표가 다름(예: OECD·IMF는 전체 업종을 아우르는 표를 발표하지 않고
// 특정 산업 보고서만 있음) — sections 배열로 그 다양성을 그대로 표현하고, section마다 정확한 지표명/예측기간/발표일을 병기
function futureIndustrySectionsHtml(data) {
  const topNote = data.reportNote
    ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${escapeHtml(data.reportNote)}</p>`
    : "";
  const sectionsHtml = (data.sections || [])
    .map((sec) => {
      const rows = [...sec.industries]
        .sort((a, b) => b.growthPct - a.growthPct)
        .slice(0, 30)
        .map(
          (ind) =>
            `<div class="future-ind-row"><span class="future-ind-name">${escapeHtml(ind.name)}</span><span class="future-ind-cagr ${ind.growthPct >= 0 ? "delta-up" : "delta-down"}">${ind.growthPct >= 0 ? "+" : ""}${ind.growthPct.toFixed(1)}%</span></div>`
        )
        .join("");
      const metaBits = [sec.metricLabel, sec.forecastPeriod ? `예측기간 ${sec.forecastPeriod}` : null, sec.publishedDate ? `${sec.publishedDate} 발표` : null].filter(Boolean).join(" · ");
      const linkHtml = sec.sourceUrl ? ` · <a href="${escapeHtml(sec.sourceUrl)}" target="_blank" rel="noopener">원문</a>` : "";
      return `
        <div class="future-ind-group">
          <h3 class="future-ind-group-title">${escapeHtml(sec.reportTitle)}</h3>
          <p class="disclaimer tab-note" style="margin-top:-6px;">${escapeHtml(metaBits)}${linkHtml}</p>
          <div class="future-ind-list">${rows}</div>
        </div>`;
    })
    .join("");
  // 정성적(방향성만 확인, 정확한 %는 미확인) 참고사항 — 억지로 숫자 표에 끼워넣지 않고 별도 문단으로만 표시
  const qualHtml = data.qualitativeNote
    ? `<p class="disclaimer tab-note" style="margin-top:10px;">ℹ️ ${escapeHtml(data.qualitativeNote)}</p>`
    : "";
  return `${topNote}${sectionsHtml}${qualHtml}`;
}

async function runFutureIndustrySource(key) {
  insightActiveFutureSource = key;
  insightActiveCategory = "futureIndustry";
  setInsightCategoryActive("futureIndustry");
  updateFirmsNavVisibility();
  insightBrandNav.style.display = "none";
  futureIndustryNav.style.display = "";
  Object.entries(futureIndustryButtons).forEach(([k, b]) => b && b.classList.toggle("active", k === key));
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = "⏳ 미래산업 성장성 데이터를 불러오는 중...";
  results.innerHTML = "";

  if (key === "assetMgr") {
    const data = await getFutureIndustryData();
    if (!data || !data.groups) {
      status.textContent = "🚧 미래산업 성장성 데이터를 가져오지 못했습니다.";
      return;
    }
    status.style.display = "none";
    results.innerHTML = futureIndustryGroupsHtml(data);
    return;
  }
  const data = await getFutureIndustrySourceData(key);
  if (!data || !data.sections) {
    status.textContent = "🚧 미래산업 성장성 데이터를 가져오지 못했습니다.";
    return;
  }
  status.style.display = "none";
  results.innerHTML = futureIndustrySectionsHtml(data);
}
Object.entries(futureIndustryButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => runFutureIndustrySource(key));
});

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

// getFullMetrics(현재) + getHistoricalCompareMetrics(과거 스냅샷) 결과 쌍을 표에 쓸 행 데이터로 합침
// — 검색 상세페이지의 단일 종목 과거분석(runTickerHistorical)에서 사용
function buildHistoricalCompareRows(tickerMetricsList, historicalList) {
  return tickerMetricsList
    .map((m, i) => {
      const h = historicalList[i];
      if (!h) return null;
      const priceChangePct = h.historicalPrice ? ((m.price - h.historicalPrice) / h.historicalPrice) * 100 : null;
      const priceChangeAmt = h.historicalPrice ? m.price - h.historicalPrice : null;
      return {
        symbol: m.symbol,
        name: m.name,
        sector: m.sector,
        currentPrice: m.price,
        currency: m.currency,
        priceChangePct,
        priceChangeAmt,
        historicalAttractiveness: h.historicalAttractiveness,
        historicalRisk: h.historicalRisk,
        asOfDate: h.asOfDate,
      };
    })
    .filter(Boolean);
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
  // 스페이스X(SPCX)는 기존 자동 로고 유지 — 전역 인셋(72%)으로 축소되어 잘리지 않음
  SKHY: SKHYNIX_LOGO, // SK하이닉스 나스닥 ADR(2026-07 상장)
  SKHYV: SKHYNIX_LOGO, // 상장 초기 임시 심볼
  "000660.KS": SKHYNIX_LOGO, // 한국거래소 원주
  // FMP에 로고가 없는(404) 종목들 — 브랜드평판순 목록 131개 전수 점검 후 확인된 것만 추가(나머지는 정상 로드됨)
  LGEIY: { src: "logos/lg.svg", bg: "#ffffff" }, // LG전자 미국 OTC ADR — Wikimedia Commons(자유 이용) LG 로고
};

// FMP 로고가 순백색이라 흰 원 배경에서 안 보이는 종목들(506개 전수 픽셀 분석 결과 61개) — 어두운 배경을 깔아 흰 로고가 보이게 함
const WHITE_LOGO_BG = "#14161c";
const WHITE_LOGO_TICKERS = new Set([
  "ABBV","ADI","ADSK","AIG","ALB","ALL","AMP","ANET","APP","AVB","AWK","AXON","BA","BAX","BLK","CDNS","CEG","CRL","CSX","CTAS",
  "DD","DGX","DHI","DIS","DXCM","EQIX","ETN","FAST","HSY","IBM","JBL","KMI","KR","LCID","LEN","LI","LITE","LMT","LRCX","MAS",
  "MRVL","NIO","NKE","NTAP","NXPI","ON","RBLX","RCL","REGN","STT","SYY","TPR","UBER","ULTA","UNH","V","VRTX","WAT","WSM","WYNN","XPEV",
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
function tickerLogoHtml(symbol, badgeLabel) {
  const s = escapeHtml(symbol);
  const badge = escapeHtml(badgeLabel || symbol.slice(0, 2));
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

// buildHistoricalCompareRows 결과로 과거분석 표 HTML(범례 제외)을 생성 — moversTableHtml과 동일한 5컬럼 구성(순위/티커+원형로고/현재가(등락률)/상승 압력/투자 안정)
// rankColumnLabel·periodLabel(기본 "1년전", 한달 전 변형에선 "1개월전")만 호출부마다 다름
function historicalTableHtml(rows, rankColumnLabel, periodLabel = "1년전") {
  const tableRows = rows
    .map((r, i) => {
      return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span>${r.name ? `<br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span>` : ""}</td>
        <td>${priceChartLink(r.symbol, fmtPrice(r.currentPrice, r.currency))}<br><span class="${r.priceChangePct !== null && r.priceChangePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.priceChangeAmt !== null ? `${r.priceChangeAmt >= 0 ? "+" : ""}${fmtPrice(r.priceChangeAmt, r.currency)} ` : ""}${r.priceChangePct !== null ? `(${fmtPct(r.priceChangePct)})` : "N/A"}</span></td>
        <td>${scoreRankColorHtml(r.historicalAttractiveness, r.historicalAttractiveness)}</td>
        <td>${scoreRankColorHtml(r.historicalRisk, r.historicalRisk)}</td>
      </tr>`;
    })
    .join("");

  return `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${periodLabel} 상승 압력·투자 안정은 <b>${periodLabel} 시점</b> 기준으로 근사 계산한 참고용 점수입니다(각 10점 만점, 높을수록 상승 여력 크고·재무 안정적). 투자 자문이 아닙니다.</p>
    <table class="top30-table">
      <thead>
        <tr><th>${rankColumnLabel}</th><th>기업명</th><th>현재가<br>(등락률)</th><th>${periodLabel}<br>상승<br>압력</th><th>${periodLabel}<br>투자<br>안정</th></tr>
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
  const attractCellHtml = r.attractivenessTotal !== undefined ? scoreRankColorHtml(r.attractivenessTotal, r.attractivenessTotal) : "N/A";
  const riskCellHtml = r.riskTotal !== undefined ? scoreRankColorHtml(r.riskTotal, r.riskTotal) : "N/A";
  return `
    <tr>
      <td>${i + 1}</td>
      <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml((nameMap && nameMap.get(r.symbol)) || r.symbol)}</b></span></td>
      <td>${priceChartLink(r.symbol, fmtPrice(r.currentPrice, r.currency))}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.priceChangePct)})</span></td>
      <td>${attractCellHtml}</td>
      <td>${riskCellHtml}</td>
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

      historicalStatus.textContent = `상위 ${top50.length}개 종목의 상승압력·투자안정 점수를 계산하는 중...`;
      const { sp500Return, kospi200Return } = await getMarketReturnsCached();
      const fullMetricsList = await mapWithConcurrency(top50, 5, (r) => getFullMetricsForDividendRisk(r.symbol));
      top50.forEach((r, i) => {
        const m = fullMetricsList[i];
        if (!m) return;
        r.attractivenessTotal = computeAttractivenessScore(m).total;
        r.riskTotal = computeRiskScore(m, sp500Return, kospi200Return).total;
      });
      historicalStatus.style.display = "none";

      historicalResults.innerHTML = `
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${periodLabel}(코스피200+코스닥150 대상) 대비 ${rankLabel} 기준이며, 상승 압력·투자 안정은 <b>현재 시점</b> 점수(국내 배점 방식)입니다. 투자 자문이 아닙니다.</p>
        <p class="muted" style="font-size:12px;">시가총액 상위 ${top50.length}개 확인</p>
        <table class="top30-table">
          <thead><tr><th>${rankLabel}<br>순위</th><th>기업명</th><th>현재가<br>(등락률)</th><th>상승<br>압력</th><th>투자<br>안정</th></tr></thead>
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

// period: "month"(한달 전) | "year"(1년 전), direction: "up"(상승) | "down"(하락)
async function runHistoricalMovers(period, direction) {
  const btn = HISTORICAL_MOVERS_BUTTONS[period][direction];
  historicalResults.innerHTML = "";
  btn.disabled = true;

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

// 티커/현재가(+등락률)/상승압력/투자안정 5열 표 — 인기종목·급등주·급락주가 공유하는 렌더러
function moversTableHtml(scored, rankNote) {
  const scorePill = (score, isIPO) => (isIPO ? "IPO" : scoreRankColorHtml(scoreCellText(score, isIPO), score));

  const rows = scored
    .map((r, i) => {
      const changeClass = r.changePct >= 0 ? "delta-up" : "delta-down";
      return `
      <tr>
        <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, "$" + r.price.toFixed(2))}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.changePct)})</span></td>
        <td>${scorePill(r.attractiveness, r.isIPO)}</td>
        <td>${scorePill(r.risk, r.isIPO)}</td>
      </tr>`;
    })
    .join("");

  return `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote} 상승 압력·투자 안정은 각 10점 만점이며 투자 자문이 아닙니다.</p>
      ${SURGE_WARNING_LEGEND}
      <div class="popular-table-wrap">
        <table class="top30-table popular-table">
          <thead>
            <tr><th>순위</th><th>기업명</th><th>현재가</th><th>상승<br>압력</th><th>투자<br>안정</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
}

// 후보 목록(가벼운 조회로 얻은 심볼/현재가/등락률)에 대해 상승압력도·투자 안정성 점수를 매겨 표 HTML까지 완성
// marketReturnsPromise는 후보 목록을 모으는 동안 미리 병렬로 시작해둔 getMarketReturns() 호출을 전달받음
// initialCount만큼만 먼저 스코어링해 빠르게 보여주고, "더보기" 클릭 시 fullCount까지 나머지를 추가로 스코어링(이미 계산한 항목은 재요청하지 않음)
async function scoreAndRenderMovers(candidates, marketReturnsPromise, { statusEl, resultsEl, rankNote, initialCount, fullCount }) {
  initialCount = initialCount || candidates.length;
  fullCount = Math.min(fullCount || candidates.length, candidates.length);

  const { sp500Return } = await marketReturnsPromise;
  let scored = [];

  async function scoreUpTo(count) {
    const pending = candidates.slice(scored.length, count);
    // "더보기" 클릭으로 이어서 불러오는 중이면(이미 버튼이 있으면) 맨 위 공지 자리 대신 그 버튼 자체에 진행 상황을 표시
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (pending.length > 0) {
      if (moreBtn) {
        moreBtn.disabled = true;
        moreBtn.textContent = "상승 압력 · 투자 안정 점수를 계산하는 중...";
      } else {
        statusEl.style.display = "block";
        statusEl.textContent = "상승 압력 · 투자 안정 점수를 계산하는 중...";
      }
      // 한꺼번에 요청하면 프록시가 과부하로 실패하는 경우가 많아 동시 요청 수를 제한
      const fullMetricsList = await mapWithConcurrency(pending, 3, (r) => getFullMetrics(r.symbol));
      const newlyScored = pending.map((r, i) => {
        const m = fullMetricsList[i];
        if (!m) return { ...r, attractiveness: null, risk: null, fiveDayExtremes: null, isIPO: false };
        const isIPO = isRecentIPO(m.firstTradeDate);
        const attractiveness = computeAttractivenessScore(m);
        const risk = computeRiskScore(m, sp500Return);
        return { ...r, attractiveness: attractiveness.total, risk: risk.total, fiveDayExtremes: m.fiveDayExtremes, isIPO };
      });
      scored = scored.concat(newlyScored);
    }
    statusEl.style.display = "none";

    const hasMore = scored.length < fullCount;
    const nextCount = Math.min(scored.length + initialCount, fullCount);
    resultsEl.innerHTML =
      moversTableHtml(scored, rankNote) +
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
      if (!moreBtn) return;
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

// ---------- 지수: 환율·주요 지수·원자재·가상자산·국채를 이미지 스타일 카드로 표시 ----------
// 레이아웃: 왼쪽 = 종목명 + (날짜 | 티커), 오른쪽 = 가격 + 변동량(퍼센트). 색상은 한국식(상승=빨강, 하락=파랑)
// src="yahoo"는 야후 차트(전일 종가 대비), src="fred"는 FRED 최신 발표치(전 영업일 대비)
// vSuffix: 가격 뒤 단위 / cSuffix: 변동량 뒤 단위(미지정 시 vSuffix 사용)
// chartSymbol: 클릭 시 TradingView 차트 모달에 넘길 심볼(야후 티커와 표기가 달라 별도 매핑 필요) — 없으면(null) 클릭 비활성
// 카테고리별로 최대 10개까지 먼저 보여주고, 그보다 많으면 "더보기"로 나머지를 펼침(카테고리는 처음 볼 때만 그때그때 조회해서 캐시)
// ⚠️ 아연·니켈·납(LME 선물), 코스피100, 일본국채30년·한국채5년물은 야후·FRED 어디서도 정상적인 데이터를 못 찾아 제외함
const INDEX_CATEGORY_PAGE_SIZE = 10;
const INDEX_CATEGORIES = {
  usMarkets: {
    label: "미국주요",
    items: [
      { src: "yahoo", symbol: "^GSPC", name: "🇺🇸 S&P 500", ticker: "SPX", chartSymbol: "SP:SPX" },
      { src: "yahoo", symbol: "^DJI", name: "🇺🇸 다우 종합", ticker: "DJI", chartSymbol: "DJ:DJI" },
      { src: "yahoo", symbol: "^IXIC", name: "🇺🇸 나스닥 종합", ticker: "IXIC", chartSymbol: "NASDAQ:IXIC" },
      { src: "yahoo", symbol: "^RUT", name: "🇺🇸 러셀 2000", ticker: "RUT", chartSymbol: "TVC:RUT" },
      { src: "yahoo", symbol: "^VIX", name: "🇺🇸 S&P500 VIX", ticker: "VIX", chartSymbol: "TVC:VIX" },
      { src: "yahoo", symbol: "GC=F", name: "🟨 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD" },
      { src: "yahoo", symbol: "BTC-USD", name: "₿ 비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD", crypto: true },
      { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI 원유", ticker: "WTI", chartSymbol: "TVC:USOIL" },
    ],
  },
  // 한국주요(2026-09-01 사용자 요청): 코스피·코스닥·삼성전자·SK하이닉스·원달러 환율·비트코인·금·WTI원유까지만
  krMarkets: {
    label: "한국주요",
    items: [
      { src: "yahoo", symbol: "^KS11", name: "🇰🇷 코스피", ticker: "KOSPI", chartSymbol: "KRX:KOSPI" },
      { src: "yahoo", symbol: "^KQ11", name: "🇰🇷 코스닥", ticker: "KOSDAQ", chartSymbol: "KRX:KOSDAQ" },
      { src: "yahoo", symbol: "005930.KS", name: "🇰🇷 삼성전자", ticker: "005930", chartSymbol: "KRX:005930" },
      { src: "yahoo", symbol: "000660.KS", name: "🇰🇷 SK하이닉스", ticker: "000660", chartSymbol: "KRX:000660" },
      { src: "yahoo", symbol: "KRW=X", name: "🇰🇷 달러/원 환율", ticker: "USD/KRW", chartSymbol: "FX:USDKRW", wikiQuery: "South Korean won" },
      { src: "yahoo", symbol: "BTC-USD", name: "₿ 비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD", crypto: true },
      { src: "yahoo", symbol: "GC=F", name: "🟨 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD", wikiQuery: "Gold" },
      { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI 원유", ticker: "WTI", chartSymbol: "TVC:USOIL", wikiQuery: "West Texas Intermediate" },
    ],
  },
  indices: {
    label: "지수",
    items: [
      { src: "yahoo", symbol: "^KS11", name: "🇰🇷 코스피", ticker: "KOSPI", chartSymbol: "KRX:KOSPI" },
      { src: "yahoo", symbol: "^KQ11", name: "🇰🇷 코스닥", ticker: "KOSDAQ", chartSymbol: "KRX:KOSDAQ" },
      { src: "yahoo", symbol: "^N225", name: "🇯🇵 닛케이 225", ticker: "JP225", chartSymbol: "TVC:NI225" },
      { src: "yahoo", symbol: "^NDX", name: "🇺🇸 US Tech 100", ticker: "NDX", chartSymbol: "NASDAQ:NDX" },
      { src: "yahoo", symbol: "^HSI", name: "🇭🇰 항셍(홍콩)", ticker: "HSI", chartSymbol: "TVC:HSI" },
      { src: "yahoo", symbol: "000001.SS", name: "🇨🇳 상해종합", ticker: "SSEC", chartSymbol: "TVC:SHCOMP" },
      { src: "yahoo", symbol: "^GDAXI", name: "🇩🇪 독일 DAX", ticker: "DAX", chartSymbol: "XETR:DAX" },
      { src: "yahoo", symbol: "^FTSE", name: "🇬🇧 FTSE 100", ticker: "UKX", chartSymbol: "TVC:UKX" },
      { src: "yahoo", symbol: "^FCHI", name: "🇫🇷 프랑스 CAC 40", ticker: "CAC40", chartSymbol: "TVC:CAC40" },
      { src: "yahoo", symbol: "^AEX", name: "🇳🇱 네덜란드 AEX", ticker: "AEX", chartSymbol: "TVC:AEX" },
      { src: "yahoo", symbol: "^STOXX50E", name: "🇪🇺 Euro Stoxx 50", ticker: "SX5E", chartSymbol: "TVC:SX5E" },
      { src: "yahoo", symbol: "FTSEMIB.MI", name: "🇮🇹 이탈리아 FTSE MIB", ticker: "FTSEMIB", chartSymbol: "TVC:FTSEMIB" },
      { src: "yahoo", symbol: "^IBEX", name: "🇪🇸 IBEX 35", ticker: "IBEX35", chartSymbol: "TVC:IBEX35" },
      { src: "yahoo", symbol: "^AXJO", name: "🇦🇺 호주 S&P/ASX 200", ticker: "ASX200", chartSymbol: "ASX:XJO" },
      { src: "yahoo", symbol: "^STI", name: "🇸🇬 싱가폴 STI", ticker: "STI", chartSymbol: "TVC:STI" },
      { src: "yahoo", symbol: "^NSEI", name: "🇮🇳 인도 니프티50", ticker: "NIFTY50", chartSymbol: "NSE:NIFTY" },
    ],
  },
  crypto: {
    label: "암호화폐",
    items: [
      { src: "yahoo", symbol: "BTC-USD", name: "비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD", crypto: true },
      { src: "yahoo", symbol: "ETH-USD", name: "이더리움", ticker: "ETH", chartSymbol: "COINBASE:ETHUSD", crypto: true },
      { src: "yahoo", symbol: "USDT-USD", name: "테더", ticker: "USDT", chartSymbol: null, crypto: true },
      { src: "yahoo", symbol: "BNB-USD", name: "BNB", ticker: "BNB", chartSymbol: "BINANCE:BNBUSDT", crypto: true },
      { src: "yahoo", symbol: "USDC-USD", name: "USDC", ticker: "USDC", chartSymbol: null, crypto: true },
      { src: "yahoo", symbol: "XRP-USD", name: "XRP(리플)", ticker: "XRP", chartSymbol: "COINBASE:XRPUSD", crypto: true },
      { src: "yahoo", symbol: "SOL-USD", name: "솔라나", ticker: "SOL", chartSymbol: "COINBASE:SOLUSD", crypto: true },
      { src: "yahoo", symbol: "TRX-USD", name: "트론", ticker: "TRX", chartSymbol: "BINANCE:TRXUSDT", crypto: true },
      { src: "yahoo", symbol: "DOGE-USD", name: "도지코인", ticker: "DOGE", chartSymbol: "COINBASE:DOGEUSD", crypto: true },
    ],
  },
  commodities: {
    label: "원자재",
    items: [
      { src: "yahoo", symbol: "GC=F", name: "🟨 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD", wikiQuery: "Gold" },
      { src: "yahoo", symbol: "SI=F", name: "⬜ 은(Silver)", ticker: "SILVER", chartSymbol: "TVC:SILVER", wikiQuery: "Silver" },
      { src: "yahoo", symbol: "HG=F", name: "🟧 구리", ticker: "COPPER", chartSymbol: "COMEX:HG1!", wikiQuery: "Copper" },
      { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI유", ticker: "WTI", chartSymbol: "TVC:USOIL", wikiQuery: "West Texas Intermediate" },
      { src: "yahoo", symbol: "BZ=F", name: "🛢️ 브렌트유", ticker: "BRENT", chartSymbol: "TVC:UKOIL", wikiQuery: "Brent Crude" },
      { src: "yahoo", symbol: "NG=F", name: "🔥 천연가스", ticker: "NATGAS", chartSymbol: "NYMEX:NG1!", wikiQuery: "Natural gas" },
      { src: "yahoo", symbol: "RB=F", name: "⛽ 가솔린(RBOB)", ticker: "RBOB", chartSymbol: "NYMEX:RB1!", wikiQuery: "Gasoline" },
      { src: "yahoo", symbol: "PL=F", name: "⚪ 백금", ticker: "PLATINUM", chartSymbol: "TVC:PLATINUM", wikiQuery: "Platinum" },
      { src: "yahoo", symbol: "ALI=F", name: "🔩 알루미늄", ticker: "ALUMINUM", chartSymbol: "COMEX:ALI1!", wikiQuery: "Aluminium" },
      { src: "yahoo", symbol: "ZR=F", name: "🌾 현미", ticker: "RICE", chartSymbol: "CBOT:ZR1!", wikiQuery: "Rice" },
      { src: "yahoo", symbol: "LE=F", name: "🐄 생우", ticker: "CATTLE", chartSymbol: "CME:LE1!", wikiQuery: "Cattle" },
      { src: "yahoo", symbol: "HE=F", name: "🐖 돈육", ticker: "HOGS", chartSymbol: "CME:HE1!", wikiQuery: "Domestic pig" },
      { src: "yahoo", symbol: "ZW=F", name: "🌾 미국 소맥", ticker: "WHEAT", chartSymbol: "CBOT:ZW1!", wikiQuery: "Wheat" },
      { src: "yahoo", symbol: "ZC=F", name: "🌽 미국 옥수수", ticker: "CORN", chartSymbol: "CBOT:ZC1!", wikiQuery: "Maize" },
      { src: "yahoo", symbol: "ZS=F", name: "🌱 미국 대두", ticker: "SOYBEAN", chartSymbol: "CBOT:ZS1!", wikiQuery: "Soybean" },
      { src: "yahoo", symbol: "KC=F", name: "☕ 미국 커피", ticker: "COFFEE", chartSymbol: "ICEUS:KC1!", wikiQuery: "Coffee" },
      { src: "yahoo", symbol: "SB=F", name: "🍬 미국 설탕", ticker: "SUGAR", chartSymbol: "ICEUS:SB1!", wikiQuery: "Sugar" },
      { src: "yahoo", symbol: "CT=F", name: "🧵 미국 원면", ticker: "COTTON", chartSymbol: "ICEUS:CT1!", wikiQuery: "Cotton" },
      { src: "yahoo", symbol: "CC=F", name: "🍫 미국 코코아", ticker: "COCOA", chartSymbol: "ICEUS:CC1!", wikiQuery: "Cocoa bean" },
    ],
  },
  bonds: {
    label: "채권",
    items: [
      { src: "fred", symbol: "T10Y2Y", name: "🇺🇸 장단기 금리차(10Y-2Y)", ticker: "T10Y2Y", vSuffix: "%p", cSuffix: "%p", chartSymbol: null, wikiQuery: "Yield curve", newsSymbol: "^TNX" },
      { src: "fred", symbol: "DGS30", name: "🇺🇸 미국 30년물", ticker: "US30Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US30Y", wikiQuery: "United States Treasury security", newsSymbol: "^TYX" },
      { src: "fred", symbol: "DGS10", name: "🇺🇸 미국 10년물", ticker: "US10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US10Y", wikiQuery: "United States Treasury security", newsSymbol: "^TNX" },
      { src: "fred", symbol: "DGS2", name: "🇺🇸 미국 2년물", ticker: "US2Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US02Y", wikiQuery: "United States Treasury security", newsSymbol: "^FVX" },
      // 일본·한국 10년물은 FRED에 월간 데이터만 있어(OECD 장기금리 시리즈) 전월 대비로 표시됨(다른 항목은 전일 대비)
      { src: "fred", symbol: "IRLTLT01JPM156N", name: "🇯🇵 일본국채 10년(월간)", ticker: "JP10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:JP10Y", wikiQuery: "Japanese government bond" },
      { src: "fred", symbol: "IRLTLT01KRM156N", name: "🇰🇷 한국채 10년(월간)", ticker: "KR10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:KR10Y", wikiQuery: "Korea Treasury Bond" },
    ],
  },
  fx: {
    label: "환율",
    items: [
      { src: "yahoo", symbol: "KRW=X", name: "🇰🇷 달러/원 환율", ticker: "USD/KRW", chartSymbol: "FX:USDKRW", wikiQuery: "South Korean won" },
      { src: "yahoo", symbol: "JPY=X", name: "🇯🇵 달러/엔 환율", ticker: "USD/JPY", chartSymbol: "FX:USDJPY", wikiQuery: "Japanese yen" },
      { src: "yahoo", symbol: "EURUSD=X", name: "🇪🇺 유로/달러 환율", ticker: "EUR/USD", chartSymbol: "FX:EURUSD", wikiQuery: "Euro" },
      { src: "yahoo", symbol: "CNY=X", name: "🇨🇳 달러/위안 환율", ticker: "USD/CNY", chartSymbol: "FX:USDCNY", wikiQuery: "Renminbi" },
      { src: "yahoo", symbol: "GBPUSD=X", name: "🇬🇧 파운드/달러 환율", ticker: "GBP/USD", chartSymbol: "FX:GBPUSD", wikiQuery: "Pound sterling" },
    ],
  },
};

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
};
function cryptoBaseTicker(sym) {
  return (sym || "").toUpperCase().replace(/-USD$/, "").replace(/\d+$/, "");
}
function cryptoKoName(sym, fallbackName) {
  return CRYPTO_KO_BY_TICKER[cryptoBaseTicker(sym)] || TICKER_TO_KOREAN_NAME[sym] || (fallbackName || sym).replace(/\s+USD$/i, "");
}
// 시장 화면 암호화폐 카테고리의 9개 코인 + 심볼이 단순한 주요 코인은 시작 시점부터 한글 검색 별칭 등록
// (심볼에 숫자가 붙는 코인은 비트코인 섹션 목록을 한 번 불러올 때 실제 심볼로 자동 등록됨 — runCryptoPopular 참고)
INDEX_CATEGORIES.crypto.items.forEach((it) => {
  const ko = cryptoKoName(it.symbol, it.name);
  TICKER_TO_KOREAN_NAME[it.symbol] = ko;
  if (!KOREAN_COMPANY_NAMES[ko]) KOREAN_COMPANY_NAMES[ko] = it.symbol;
});
for (const base of ["BTC", "ETH", "USDT", "XRP", "BNB", "SOL", "USDC", "DOGE", "ADA", "TRX", "LINK", "AVAX", "XLM", "SHIB", "HBAR", "DOT", "LTC", "BCH", "UNI", "NEAR", "ICP", "AAVE", "ETC", "VET", "FIL", "ATOM", "ALGO", "CRO", "XMR", "DAI", "EOS", "XTZ", "NEO", "ZEC", "DASH"]) {
  const ko = CRYPTO_KO_BY_TICKER[base];
  const symbol = `${base}-USD`;
  if (ko && !KOREAN_COMPANY_NAMES[ko]) KOREAN_COMPANY_NAMES[ko] = symbol;
  if (!TICKER_TO_KOREAN_NAME[symbol]) TICKER_TO_KOREAN_NAME[symbol] = ko;
}

// 야후 차트 → { price, change(전일종가 대비 변동량), changePct, date }
function yahooSnapshot(chart) {
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return null;
  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  if (pairs.length < 1) return null;
  const latest = pairs[pairs.length - 1];
  const prevClose = pairs.length >= 2 ? pairs[pairs.length - 2].c : (meta.chartPreviousClose ?? null);
  const price = meta.regularMarketPrice ?? latest.c;
  const change = prevClose !== null && prevClose !== undefined && price !== null && price !== undefined ? price - prevClose : null;
  const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;
  const date = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(latest.t * 1000);
  return { price, change, changePct, date };
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

// 암호화폐 로고 — jsDelivr에 호스팅된 spothq/cryptocurrency-icons 세트를 티커(소문자)로 조회, 실패 시 🪙 배지로 폴백(추가 네트워크 호출 없음)
function cryptoLogoHtml(ticker) {
  const sym = ticker.toLowerCase();
  const src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${encodeURIComponent(sym)}.png`;
  return `<span class="crypto-logo-wrap"><img class="crypto-logo" src="${src}" alt="" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" /><span class="crypto-logo-badge" style="display:none;">🪙</span></span>`;
}

// snap.date를 "몇 시 기준 가격인지" 보여줄 라벨로 변환 — 오늘이면 시:분:초(강조), 아니면 월/일(회색)
function snapClockLabel(snap) {
  const now = new Date();
  const isToday = !!(snap && snap.date) && snap.date.getFullYear() === now.getFullYear() && snap.date.getMonth() === now.getMonth() && snap.date.getDate() === now.getDate();
  const label = snap && snap.date
    ? (isToday
        ? `${String(snap.date.getHours()).padStart(2, "0")}:${String(snap.date.getMinutes()).padStart(2, "0")}:${String(snap.date.getSeconds()).padStart(2, "0")}`
        : `${String(snap.date.getMonth() + 1).padStart(2, "0")}/${String(snap.date.getDate()).padStart(2, "0")}`)
    : "";
  const cls = isToday ? "idx-clock idx-clock-live" : "idx-clock";
  return { label, cls, isToday };
}

// 지수 카드 1행 HTML — 이미지 스타일(왼쪽 종목/날짜/티커, 오른쪽 가격/변동량(퍼센트))
// chartSymbol이 있는 종목은 클릭 시 기존 TradingView 차트 모달이 열리도록 price-chart-link 델리게이션에 태움
function indexRowHtml(item, snap, categoryKey) {
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const { label: clockLabel, cls: clockClass } = snapClockLabel(snap);
  const sub = `${clockLabel ? `<span class="${clockClass}">🕐 ${clockLabel}</span> | ` : ""}<span class="idx-ticker">${escapeHtml(item.ticker)}</span>`;
  const nameHtml = `${item.crypto ? cryptoLogoHtml(item.ticker) : ""}${escapeHtml(item.name)}`;
  // 시장탭 행 클릭 정리(2026-08-30 사용자 요청): TradingView 차트·자산 상세 연결 전부 제거 —
  // "주식" 카테고리만 종목 상세페이지로 이동(stockCardRowHtml의 ticker-link가 담당), 나머지 행은 표시 전용
  const rowClass = "idx-row";
  const rowAttrs = "";

  if (!snap || snap.price === null || snap.price === undefined) {
    return `<div class="${rowClass}"${rowAttrs}><div class="idx-left"><div class="idx-name">${nameHtml}</div><div class="idx-sub">${sub}</div></div><div class="idx-right"><div class="idx-price">N/A</div></div></div>`;
  }

  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const priceStr = num(snap.price) + vSuffix;
  const sign = (n) => (n >= 0 ? "+" : "");
  let deltaStr = "";
  let cls = "";
  if (snap.change !== null && snap.change !== undefined) {
    cls = snap.change >= 0 ? "delta-up" : "delta-down"; // 빨강=상승, 파랑=하락(앱 공통 색상)
    deltaStr = `${sign(snap.change)}${num(snap.change)}${cSuffix}`;
    // 스프레드(0 부근) 등에서 퍼센트가 비정상적으로 커지면 생략
    if (snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000) {
      deltaStr += ` (${sign(snap.changePct)}${snap.changePct.toFixed(2)}%)`;
    }
  }

  return `
    <div class="${rowClass}"${rowAttrs}>
      <div class="idx-left">
        <div class="idx-name">${nameHtml}</div>
        <div class="idx-sub">${sub}</div>
      </div>
      <div class="idx-right">
        <div class="idx-price">${priceStr}</div>
        <div class="idx-delta ${cls}">${deltaStr}</div>
      </div>
    </div>`;
}

// 개별 종목 하나의 스냅샷 조회(야후/FRED 공용) — 실패해도 조용히 null 반환(그 행만 N/A로 표시됨)
async function fetchOneIndexSnap(item) {
  try {
    if (item.src === "fred") {
      return fredSnapshot(await fetchFredSeries(item.symbol));
    }
    return yahooSnapshot(await yahooChart(item.symbol, "5d", "1d"));
  } catch {
    return null;
  }
}

// ---------- 원자재/채권/외환 상세페이지: 종목이 아니므로 재무·밸류에이션 없이 시세+개요+뉴스만 ----------
const ASSET_DETAIL_CATEGORIES = ["commodities", "bonds", "fx"];
function findAssetItem(categoryKey, ticker) {
  const cat = INDEX_CATEGORIES[categoryKey];
  return cat && cat.items.find((i) => i.ticker === ticker);
}
function getAllAssetSearchItems() {
  return ASSET_DETAIL_CATEGORIES.flatMap((categoryKey) => INDEX_CATEGORIES[categoryKey].items.map((item) => ({ ...item, categoryKey })));
}
function assetDetailPriceHtml(item, snap) {
  if (!snap || snap.price === null || snap.price === undefined) {
    return `<p class="muted">시세를 가져오지 못했습니다.</p>`;
  }
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const sign = (n) => (n >= 0 ? "+" : "");
  let cls = "";
  let deltaStr = "";
  if (snap.change !== null && snap.change !== undefined) {
    cls = snap.change >= 0 ? "delta-up" : "delta-down";
    deltaStr = `${sign(snap.change)}${num(snap.change)}${cSuffix}`;
    if (snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000) {
      deltaStr += ` (${sign(snap.changePct)}${snap.changePct.toFixed(2)}%)`;
    }
  }
  return `
    <div class="asset-detail-price-row">
      <span class="asset-detail-price">${num(snap.price)}${vSuffix}</span>
      <span class="asset-detail-delta ${cls}">${deltaStr}</span>
    </div>`;
}
let assetDetailLoadToken = 0;
async function openAssetDetail(categoryKey, ticker) {
  const item = findAssetItem(categoryKey, ticker);
  if (!item) return;
  const myToken = ++assetDetailLoadToken; // 여러 항목을 연달아 열 때 늦게 도착한 이전 요청이 화면을 덮어쓰지 않도록 방지
  el("assetDetailTitle").textContent = item.name;
  el("assetDetailPanel").style.display = "flex";
  requestAnimationFrame(() => el("assetDetailPanel").classList.add("open"));
  el("assetDetailSearchInput").value = "";
  el("assetDetailSuggest").style.display = "none";
  el("assetDetailPriceBlock").innerHTML = `<p class="muted">불러오는 중...</p>`;
  el("assetDetailOverview").innerHTML = `<p class="muted">불러오는 중...</p>`;
  el("assetDetailNews").innerHTML = `<p class="muted">불러오는 중...</p>`;

  fetchOneIndexSnap(item).then((snap) => {
    if (myToken !== assetDetailLoadToken) return;
    el("assetDetailPriceBlock").innerHTML = assetDetailPriceHtml(item, snap);
  });
  getBusinessSummaryKo(item.wikiQuery || item.name)
    .then((text) => {
      if (myToken !== assetDetailLoadToken) return;
      el("assetDetailOverview").innerHTML = `<p>${escapeHtml(text)}</p>`;
    })
    .catch(() => {
      if (myToken !== assetDetailLoadToken) return;
      el("assetDetailOverview").innerHTML = `<p class="muted">개요 정보를 찾을 수 없습니다.</p>`;
    });
  // 뉴스는 위키 검색어(설명용 영단어)가 아니라 야후가 인식하는 실제 시세 심볼로 검색해야 관련 기사가 나옴
  // (예: "Gold"로 검색하면 금 시세가 아니라 티커가 "GOLD"인 배릭골드 뉴스가 잡힘 — GC=F로 검색해야 금 관련 기사가 나옴)
  const newsQuery = item.newsSymbol || (item.src === "fred" ? item.wikiQuery || item.name : item.symbol);
  yahooSearch(newsQuery)
    .then((data) => {
      if (myToken !== assetDetailLoadToken) return;
      renderNews(data, el("assetDetailNews"));
    })
    .catch(() => {
      if (myToken !== assetDetailLoadToken) return;
      el("assetDetailNews").innerHTML = `<p class="muted">뉴스를 가져오지 못했습니다.</p>`;
    });
}
function closeAssetDetailPanel() {
  el("assetDetailPanel").classList.remove("open");
  window.setTimeout(() => {
    el("assetDetailPanel").style.display = "none";
  }, 280);
}
el("assetDetailCloseBtn").addEventListener("click", closeAssetDetailPanel);
el("assetDetailSearchInput").addEventListener("input", () => {
  const q = el("assetDetailSearchInput").value.trim();
  const suggestEl = el("assetDetailSuggest");
  if (!q) {
    suggestEl.style.display = "none";
    return;
  }
  const upperQ = q.toUpperCase();
  const matches = getAllAssetSearchItems().filter((m) => m.name.includes(q) || m.ticker.toUpperCase().includes(upperQ));
  if (matches.length === 0) {
    suggestEl.style.display = "none";
    return;
  }
  suggestEl.innerHTML = matches
    .slice(0, 8)
    .map(
      (m) =>
        `<div class="chat-ticker-option" data-asset-cat="${escapeHtml(m.categoryKey)}" data-asset-ticker="${escapeHtml(m.ticker)}">
          <span class="chat-ticker-option-name">${escapeHtml(m.name)}</span>
          <span class="chat-ticker-option-sub">${escapeHtml(m.ticker)}</span>
        </div>`
    )
    .join("");
  suggestEl.style.display = "block";
});
el("assetDetailSuggest").addEventListener("click", (e) => {
  const opt = e.target.closest(".chat-ticker-option");
  if (!opt) return;
  openAssetDetail(opt.dataset.assetCat, opt.dataset.assetTicker);
});
document.addEventListener("click", (e) => {
  if (!el("assetDetailSearchInput").contains(e.target) && !el("assetDetailSuggest").contains(e.target)) {
    el("assetDetailSuggest").style.display = "none";
  }
});

// ---------- 시장 상단 4x2 위젯: 기본 8개 지수를 카드 2장(각 2x2)으로 보여주고, ✎ 수정으로 종목을 바꿀 수 있음 ----------
const MARKET_WIDGET_KEY = "market_widget_symbols_v1";
const MARKET_WIDGET_DEFAULT_TICKERS = ["KOSPI", "KOSDAQ", "IXIC", "SPX", "GOLD", "USD/KRW", "DJI", "RUT"];

// INDEX_CATEGORIES 전체를 티커 기준으로 평탄화(같은 티커가 여러 카테고리에 중복 등장하면 처음 것을 사용)
const INDEX_ITEM_BY_TICKER = (() => {
  const map = new Map();
  Object.values(INDEX_CATEGORIES).forEach((cat) => {
    cat.items.forEach((item) => {
      if (!map.has(item.ticker)) map.set(item.ticker, item);
    });
  });
  return map;
})();

function getMarketWidgetTickers() {
  try {
    const saved = JSON.parse(localStorage.getItem(MARKET_WIDGET_KEY));
    if (Array.isArray(saved) && saved.length === 8 && saved.every((t) => INDEX_ITEM_BY_TICKER.has(t))) return saved;
  } catch {
    // 저장된 값이 없거나 손상된 경우 기본값 사용
  }
  return MARKET_WIDGET_DEFAULT_TICKERS;
}
function setMarketWidgetTickers(tickers) {
  localStorage.setItem(MARKET_WIDGET_KEY, JSON.stringify(tickers));
}

// 오늘 하루(5분봉) 종가 + 타임스탬프 + 정규장 시작/종료(currentTradingPeriod.regular)를 함께 뽑아
// 스파크라인이 "지금까지 쌓인 점 개수"가 아니라 "그날 정규장 전체 구간"을 고정된 x축으로 그릴 수 있게 함
async function fetchTodaySparkPoints(item) {
  try {
    const chart = await yahooChart(item.symbol, "1d", "5m");
    const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
    const timestamps = (result && result.timestamp) || [];
    const closes = (result && result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
    const points = timestamps
      .map((t, i) => ({ t, c: closes[i] }))
      .filter((p) => p.c !== null && p.c !== undefined);
    const regular = result && result.meta && result.meta.currentTradingPeriod && result.meta.currentTradingPeriod.regular;
    // 원자재/환율처럼 regular 세션 정보가 없는 종목은 오늘 받아온 데이터의 첫/마지막 시각으로 대체
    const sessionStart = (regular && regular.start) || (points[0] && points[0].t) || null;
    const sessionEnd = (regular && regular.end) || (points[points.length - 1] && points[points.length - 1].t) || null;
    return { points, sessionStart, sessionEnd };
  } catch {
    return { points: [], sessionStart: null, sessionEnd: null };
  }
}
// 점 개수 기준 균등 분배가 아니라 실제 시각을 정규장 시작~종료 구간에 매핑해서 그림 — 장중에는 오른쪽에
// 아직 안 지난 시간만큼 빈 공간이 남고, 데이터가 쌓일수록 실제 시간 위치에 맞게 채워짐(하루 종일 좌우로 늘어나 보이지 않음).
// 오늘 시가(첫 데이터 포인트의 가격) 높이에 가로 점선을 그어 "여기가 오늘 시작가 기준선"임을 표시
function sparklineSvg(data, isUp) {
  const points = (data && data.points) || [];
  if (points.length < 2) return `<svg class="mkt-spark" viewBox="0 0 100 28"></svg>`;
  const closes = points.map((p) => p.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const sessionStart = data.sessionStart ?? points[0].t;
  const sessionEnd = data.sessionEnd ?? points[points.length - 1].t;
  const tSpan = sessionEnd - sessionStart || 1;
  const xFn = (t) => Math.min(100, Math.max(0, ((t - sessionStart) / tSpan) * 100));
  const yFn = (c) => 26 - ((c - min) / span) * 24;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.t).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  const color = isUp ? "var(--pos)" : "var(--neg)";
  const openY = yFn(points[0].c).toFixed(1);
  return `<svg class="mkt-spark" viewBox="0 0 100 28" preserveAspectRatio="none">
    <line x1="0" y1="${openY}" x2="100" y2="${openY}" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" opacity="0.5" />
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}

function mktWidgetCellHtml(ticker, snap, points) {
  const item = INDEX_ITEM_BY_TICKER.get(ticker);
  if (!item) return `<div class="mkt-widget-cell"></div>`;
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  // 위젯 카드도 TradingView 차트 연결 제거(2026-08-30 시장탭 링크 정리) — 표시 전용
  const clickable = false;
  const cellAttrs = "";
  const { label: clockLabel, cls: clockClass } = snapClockLabel(snap);
  const nameRow = `<div class="mkt-widget-cell-name-row">
      <span class="mkt-widget-cell-name">${escapeHtml(item.name)}</span>
      ${clockLabel ? `<span class="mkt-widget-cell-clock ${clockClass}">🕐 ${clockLabel}</span>` : ""}
    </div>`;
  if (!snap || snap.price === null || snap.price === undefined) {
    return `<div class="mkt-widget-cell${clickable ? " price-chart-link" : ""}"${cellAttrs}>
      ${nameRow}
      <div class="mkt-widget-cell-price">N/A</div>
    </div>`;
  }
  const isUp = (snap.change ?? 0) >= 0;
  const cls = isUp ? "delta-up" : "delta-down";
  const sign = isUp ? "+" : "";
  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const deltaStr = snap.change !== null && snap.change !== undefined
    ? `${sign}${num(snap.change)}${cSuffix}${snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000 ? ` (${sign}${snap.changePct.toFixed(2)}%)` : ""}`
    : "";
  return `
    <div class="mkt-widget-cell${clickable ? " price-chart-link" : ""}"${cellAttrs}>
      ${nameRow}
      <div class="mkt-widget-cell-price">${num(snap.price)}${vSuffix}</div>
      <div class="mkt-widget-cell-delta ${cls}">${deltaStr}</div>
      ${sparklineSvg(points, isUp)}
    </div>`;
}

function mktWidgetCardHtml(tickers, snaps, sparks) {
  const cells = tickers.map((t, i) => mktWidgetCellHtml(t, snaps[i], sparks[i])).join("");
  return `<div class="mkt-widget-card">${cells}</div>`;
}

async function renderMarketWidget() {
  const track = el("mktWidgetTrack");
  const tickers = getMarketWidgetTickers();
  const items = tickers.map((t) => INDEX_ITEM_BY_TICKER.get(t)).filter(Boolean);
  const [snaps, sparks] = await Promise.all([
    mapWithConcurrency(items, 8, fetchOneIndexSnap),
    mapWithConcurrency(items, 8, fetchTodaySparkPoints),
  ]);
  const cardA = mktWidgetCardHtml(tickers.slice(0, 4), snaps.slice(0, 4), sparks.slice(0, 4));
  const cardB = mktWidgetCardHtml(tickers.slice(4, 8), snaps.slice(4, 8), sparks.slice(4, 8));
  track.innerHTML = cardA + cardB;
  el("mktWidgetDots").innerHTML = `<span class="mkt-widget-dot active"></span><span class="mkt-widget-dot"></span>`;
}

// 카드 스크롤 위치에 맞춰 하단 점 표시 동기화
el("mktWidgetTrack").addEventListener("scroll", () => {
  const track = el("mktWidgetTrack");
  const idx = Math.round(track.scrollLeft / track.clientWidth);
  el("mktWidgetDots").querySelectorAll(".mkt-widget-dot").forEach((dot, i) => dot.classList.toggle("active", i === idx));
});

// ---------- 시장 위젯 종목 수정(체크박스로 정확히 8개 선택 + 선택 순서를 1~8번으로 표시) ----------
function mktWidgetEditBodyHtml(orderedTickers) {
  const orderByTicker = new Map(orderedTickers.map((t, i) => [t, i + 1]));
  const seenTickers = new Set(); // 금·비트코인처럼 같은 종목이 여러 카테고리에 중복 등장하므로 처음 나온 카테고리에서만 체크박스 생성
  const groups = Object.entries(INDEX_CATEGORIES)
    .filter(([key]) => key !== "bonds") // 채권은 FRED 소스라 인트라데이 스파크라인을 그릴 수 없어 선택지에서 제외
    .map(([, cat]) => {
      const opts = cat.items
        .filter((item) => {
          if (seenTickers.has(item.ticker)) return false;
          seenTickers.add(item.ticker);
          return true;
        })
        .map((item) => {
          const order = orderByTicker.get(item.ticker);
          return `
        <label class="mkt-widget-edit-opt">
          <input type="checkbox" value="${escapeHtml(item.ticker)}" ${order ? "checked" : ""} />
          <span class="mkt-widget-edit-order">${order || ""}</span>
          <span>${escapeHtml(item.name)}</span>
        </label>`;
        })
        .join("");
      return opts ? `<div class="mkt-widget-edit-group"><p class="mkt-widget-edit-group-label">${escapeHtml(cat.label)}</p>${opts}</div>` : "";
    })
    .join("");
  return `
    <div class="mkt-widget-edit-topbar">
      <p class="mkt-widget-edit-count" id="mktWidgetEditCount">선택 ${orderedTickers.length}/8</p>
      <button type="button" class="cat-btn mkt-widget-edit-save" id="mktWidgetEditSaveBtn">저장</button>
    </div>
    ${groups}
  `;
}
function openMktWidgetEditModal() {
  el("mktWidgetEditBody").innerHTML = mktWidgetEditBodyHtml(getMarketWidgetTickers());
  el("mktWidgetEditModal").style.display = "flex";
}
function closeMktWidgetEditModal() {
  el("mktWidgetEditModal").style.display = "none";
}
el("mktWidgetEditBtn").addEventListener("click", openMktWidgetEditModal);
el("mktWidgetEditCloseBtn").addEventListener("click", closeMktWidgetEditModal);
el("mktWidgetEditBody").addEventListener("change", (e) => {
  const checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  const body = el("mktWidgetEditBody");
  const boxes = [...body.querySelectorAll('input[type="checkbox"]')];
  const checkedCount = boxes.filter((b) => b.checked).length;
  if (checkedCount > 8) {
    checkbox.checked = false;
    alert("최대 8개까지만 선택할 수 있습니다.");
    return;
  }
  const orderSpan = checkbox.closest("label").querySelector(".mkt-widget-edit-order");
  if (checkbox.checked) {
    // 누르는 순서대로 1번부터 배정 — 이미 쓰인 번호가 있으면 남은 숫자 중 가장 빠른 것을 씀
    const usedNumbers = new Set(
      boxes
        .filter((b) => b.checked && b !== checkbox)
        .map((b) => Number(b.closest("label").querySelector(".mkt-widget-edit-order").textContent))
        .filter((n) => n)
    );
    let n = 1;
    while (usedNumbers.has(n)) n++;
    orderSpan.textContent = n;
  } else {
    orderSpan.textContent = "";
  }
  el("mktWidgetEditCount").textContent = `선택 ${checkedCount}/8`;
});
el("mktWidgetEditBody").addEventListener("click", (e) => {
  if (!e.target.closest("#mktWidgetEditSaveBtn")) return;
  const boxes = [...el("mktWidgetEditBody").querySelectorAll('input[type="checkbox"]:checked')];
  if (boxes.length !== 8) {
    alert(`정확히 8개를 선택해주세요 (현재 ${boxes.length}개).`);
    return;
  }
  // 체크박스 자체는 카테고리 순서로 나열돼 있으므로, 저장 시 배정된 번호(1~8) 기준으로 정렬해 위젯에 그 순서대로 반영
  const ordered = boxes
    .map((b) => ({ ticker: b.value, order: Number(b.closest("label").querySelector(".mkt-widget-edit-order").textContent) || 99 }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.ticker);
  setMarketWidgetTickers(ordered);
  closeMktWidgetEditModal();
  renderMarketWidget();
});

// 현재 선택된 카테고리·"더보기"로 펼친 카테고리 목록은 새로고침·자동갱신(20초)에도 유지되도록 모듈 스코프에 둠
let indexActiveCategory = "stocks"; // 기본 카테고리 = 주식(2026-08-31 사용자 요청, 칩 순서도 주식이 맨 앞)
const indexExpandedCategories = new Set(); // "더보기"를 눌러 전체를 펼친 카테고리 key 모음

const indexCategoryButtons = {
  usMarkets: el("indexCatUsMarketsBtn"),
  krMarkets: el("indexCatKrMarketsBtn"),
  indices: el("indexCatIndicesBtn"),
  stocks: el("indexCatStocksBtn"),
  crypto: el("indexCatCryptoBtn"),
  commodities: el("indexCatCommoditiesBtn"),
  bonds: el("indexCatBondsBtn"),
  fx: el("indexCatFxBtn"),
};
function setIndexCategoryActive(key) {
  Object.entries(indexCategoryButtons).forEach(([k, btn]) => btn && btn.classList.toggle("active", k === key));
}
Object.entries(indexCategoryButtons).forEach(([key, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (indexActiveCategory === key) return;
    indexActiveCategory = key;
    setIndexCategoryActive(key);
    runIndexTab();
  });
});
setIndexCategoryActive(indexActiveCategory);

async function runIndexTab() {
  // "주식"은 지수 카드와 동일한 스타일(로고+이름/티커, 가격/등락)로 표시 — 순위는 거래량 기준으로 정렬만 하고 화면엔 노출하지 않음
  if (indexActiveCategory === "stocks") {
    return renderVolumeRanking(getUsStockVolumeCandidates(), {
      statusEl: indexStatus,
      resultsEl: indexResults,
      initialCount: 10,
      fullCount: 50,
      rankNote: "순위는 당일 거래량(주식 수) 기준이며, 미국 전 종목 대상입니다. 투자 자문이 아닙니다.",
      cardStyle: true,
    });
  }

  indexStatus.style.display = "block";
  indexStatus.textContent = "지수 데이터를 불러오는 중...";

  // await 도중 사용자가 다른 카테고리 탭을 눌러도 이 함수가 시작된 시점의 카테고리를 그대로 써야
  // items 배열과 categoryKey가 어긋나지 않음(indexActiveCategory는 전역 mutable 변수라 나중에 바뀔 수 있음)
  const categoryKey = indexActiveCategory;
  try {
    const cat = INDEX_CATEGORIES[categoryKey];
    const items = cat.items;
    const snaps = await mapWithConcurrency(items, 6, fetchOneIndexSnap);

    const expanded = indexExpandedCategories.has(categoryKey);
    const visibleCount = expanded ? items.length : Math.min(INDEX_CATEGORY_PAGE_SIZE, items.length);
    const rows = items.slice(0, visibleCount).map((item, i) => indexRowHtml(item, snaps[i], categoryKey)).join("");
    const moreBtnHtml =
      items.length > INDEX_CATEGORY_PAGE_SIZE
        ? `<button type="button" class="cat-btn index-toggle-btn" id="indexToggleBtn">${expanded ? "간략히 보기" : "더보기"}</button>`
        : "";

    indexStatus.style.display = "none";
    indexResults.innerHTML = `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 환율·지수·원자재·가상자산은 전일 종가 대비, 국채·금리차는 FRED 최신치(전 영업일 대비, 일본·한국 10년물은 월간 데이터라 전월 대비) 기준이며 상승은 빨강·하락은 파랑입니다.</p>
      <div class="idx-list">${rows}</div>
      ${moreBtnHtml}
    `;
    if (moreBtnHtml) {
      el("indexToggleBtn").addEventListener("click", () => {
        if (expanded) indexExpandedCategories.delete(categoryKey);
        else indexExpandedCategories.add(categoryKey);
        runIndexTab();
      });
    }
  } catch (err) {
    indexStatus.textContent = `❌ ${err.message || "지수 데이터를 가져오지 못했습니다."}`;
  }
}

// ---------- 지수 탭: 새로고침 버튼 대신 아래로 당겨서 새로고침(pull-to-refresh) ----------
// 문서/윈도우가 맨 위로 스크롤된 상태에서 지수 탭이 활성화되어 있을 때만 동작(다른 탭·스크롤 중엔 무시).
// 캐로셀 좌우 스와이프(#carouselViewport의 pointer 핸들러)는 수평 드래그만 가로채므로 수직 당김과 충돌하지 않음.
(function setupIndexPullToRefresh() {
  const panel = el("marketPanel");
  const scrollBody = panel ? panel.querySelector(".company-panel-body") : null;
  const indicator = el("indexPullToRefresh");
  if (!panel || !scrollBody || !indicator) return;
  const indicatorText = indicator.querySelector(".pull-refresh-text");
  const THRESHOLD = 60;
  let startY = null;
  let pulling = false;
  let refreshing = false;

  // 시장 패널은 window가 아니라 .company-panel-body 내부에서 자체 스크롤되므로 window.scrollY 대신
  // scrollBody.scrollTop으로 "맨 위에 있는지"를 판단해야 함
  panel.addEventListener(
    "touchstart",
    (e) => {
      if (!marketPanelOpen || scrollBody.scrollTop > 0 || refreshing) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      pulling = false;
    },
    { passive: true }
  );

  panel.addEventListener(
    "touchmove",
    (e) => {
      if (startY === null || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || scrollBody.scrollTop > 0) {
        pulling = false;
        indicator.classList.remove("pull-refresh-visible", "pull-refresh-ready");
        return;
      }
      pulling = true;
      const dist = Math.min(dy, THRESHOLD * 1.6);
      indicator.classList.add("pull-refresh-visible");
      indicator.classList.toggle("pull-refresh-ready", dist >= THRESHOLD);
      indicator.style.transform = `translateY(${dist}px)`;
      indicatorText.textContent = dist >= THRESHOLD ? "↑ 놓으면 새로고침" : "↓ 당겨서 새로고침";
    },
    { passive: true }
  );

  panel.addEventListener("touchend", () => {
    if (!pulling) {
      startY = null;
      return;
    }
    const ready = indicator.classList.contains("pull-refresh-ready");
    indicator.classList.remove("pull-refresh-visible", "pull-refresh-ready");
    indicator.style.transform = "";
    startY = null;
    pulling = false;
    if (ready && !refreshing) {
      refreshing = true;
      indicatorText.textContent = "🔄 새로고침 중...";
      indicator.classList.add("pull-refresh-visible");
      Promise.resolve(runIndexTab()).finally(() => {
        refreshing = false;
        indicator.classList.remove("pull-refresh-visible");
      });
    }
  });
})();

// ---------- 지수 자동 갱신: 지수 탭이 활성화되어 있는 동안만 주기적으로 새로고침 ----------
// 0.5초 간격은 무료 CORS 프록시·FRED에 초당 수십 건의 요청을 보내는 셈이라 곧바로 차단(429/520)당해
// 오히려 "채권이 업데이트 안 됨" 증상을 더 악화시킴 — 대신 20초마다 갱신해 체감상 실시간에 가깝게 유지하면서도
// 화면이 백그라운드에 있을 땐(document.hidden) 요청을 건너뛰어 불필요한 트래픽을 줄임.
// 이 주기 동안 어쩌다 한 번 FRED 요청이 실패해도(520 등) 다음 주기에 자동으로 다시 시도되므로
// "채권 값이 그대로 멈춰 있는" 문제도 자연스럽게 해소됨.
// (INDEX_AUTO_REFRESH_MS는 이 파일 맨 앞쪽으로 옮김 — US Markets가 기본 탭이 되면서 initApp()의 switchTab(0)이
// 페이지 로딩 초반에 곧바로 startIndexAutoRefresh()를 호출하므로, const를 여기 그대로 두면 TDZ 에러가 남)
var indexAutoRefreshTimer = null;
function startIndexAutoRefresh() {
  stopIndexAutoRefresh();
  indexAutoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    runIndexTab();
  }, INDEX_AUTO_REFRESH_MS);
}
function stopIndexAutoRefresh() {
  if (indexAutoRefreshTimer) clearInterval(indexAutoRefreshTimer);
  indexAutoRefreshTimer = null;
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
      initialCount: 10,
      fullCount: 50,
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
async function getFullMetricsForDividendRisk(symbol) {
  if (dividendRiskMetricsCache.has(symbol)) return dividendRiskMetricsCache.get(symbol);
  const m = await getFullMetrics(symbol).catch(() => null);
  dividendRiskMetricsCache.set(symbol, m);
  return m;
}

function dividendWarningHtml(r) {
  if (r.dividendWarning === "cut") return ` <span class="dividend-warn" title="직전 지급액보다 배당금이 20% 넘게 줄었습니다(배당컷 의심)">⚠️컷</span>`;
  if (r.dividendWarning === "overdue") return ` <span class="dividend-warn" title="평소 지급 주기보다 오래 배당 지급이 없습니다(지급 중단·지연 의심)">⚠️지연</span>`;
  return "";
}

// 한국 종목은 티커 대신 회사명을 그대로 표시(순위표에서 티커보다 알아보기 쉬움), 해외 종목은 기존처럼 티커를 그대로 두고
// 그 아래에 한글 별칭(없으면 영문 회사명)을 작게 덧붙임(moversTableHtml 등 다른 순위표와 같은 표기 방식)
function dividendRowHtml(r, i, nameMap) {
  const krName = nameMap && nameMap.get(r.symbol);
  const gradeCellHtml = r.isIPO ? "IPO" : r.riskTotal !== undefined ? scoreRankColorHtml(r.riskTotal, r.riskTotal) : "N/A";
  const tickerCellHtml = krName
    ? `<span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(krName)}</b></span>`
    : `<span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(TICKER_TO_KOREAN_NAME[r.symbol] || r.name || "")}</span>`;
  return `
    <tr>
      <td>${i + 1}</td>
      <td>${tickerCellHtml}</td>
      <td>${priceChartLink(r.symbol, fmtPrice(r.price, r.currency))}${
        r.changePct !== undefined && r.changePct !== null
          ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>`
          : ""
      }</td>
      <td>${r.yieldPct.toFixed(2)}%${dividendWarningHtml(r)}</td>
      <td>${gradeCellHtml}</td>
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
      const top50 = ranked.slice(0, 50);
      const hasMore = scanned < total;

      // 투자안정 점수는 재무제표까지 조회해야 해 배당률 스캔보다 무거우므로, 이미 추려낸 상위 50개에 대해서만 추가로 조회
      setProgress(`상위 ${top50.length}개 종목의 투자 안정 점수를 계산하는 중...`);
      const { sp500Return, kospi200Return } = await getMarketReturnsCached();
      const fullMetricsList = await mapWithConcurrency(top50, 5, (r) => getFullMetricsForDividendRisk(r.symbol));
      top50.forEach((r, i) => {
        const m = fullMetricsList[i];
        if (!m) return;
        r.riskTotal = computeRiskScore(m, sp500Return, kospi200Return).total;
        r.isIPO = isRecentIPO(m.firstTradeDate);
      });
      trendStatus.style.display = "none";

      trendResults.innerHTML = `
        <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 배당률은 최근 1년간 지급된 배당금 합계 ÷ 현재가 기준(${universeLabel} 대상)이며, 실제 배당 정책은 변경될 수 있습니다. <span class="dividend-warn">⚠️컷</span>은 직전 지급액보다 20% 넘게 줄어든 경우, <span class="dividend-warn">⚠️지연</span>은 평소 지급 주기보다 오래 지급이 없는 경우를 뜻합니다. 투자 자문이 아닙니다.</p>
        ${topCapNoteHtml(scanned, total, hasMore)}
        ${rankScanCaptionHtml(top50.length)}
        <table class="top30-table">
          <thead><tr><th>순위</th><th>기업명</th><th>현재가</th><th>배당률</th><th>투자<br>안정</th></tr></thead>
          <tbody>${top50.map((r, i) => dividendRowHtml(r, i, nameMap)).join("")}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${total}">전체보기 (나머지 ${total - scanned}개 · 전체 검색 시 약 1분 소요)</button>` : ""}
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
async function runTrendVolume() {
  setTrendActive(trendButtons.volume);
  trendResults.innerHTML = "";

  if (getWatchlistActiveMarket() === "KR") {
    // 해외 거래량 탭과 구성을 맞춤 — 거래대금 기준으로 정렬하되, 항목1엔 거래대금 대신 상승 압력 점수를 보여줌.
    // 전체 350종목을 무거운 재무제표 조회(ensureKrFullMetrics)로 스캔하면 로딩이 크게 느려지므로,
    // 가벼운 일별 등락(getKrDailyChanges, 차트 조회만)으로 먼저 거래대금 상위 30개만 추린 뒤
    // 그 30개에 대해서만 무거운 조회를 추가로 돌림(상승률·하락률 탭과 동일한 2단계 패턴, 기존 기업가치 탭
    // 기본 스캔 규모(30개)와 맞춰 로딩 시간이 크게 늘지 않도록 함)
    await renderKrRanking(getKrDailyChanges, "거래량", trendStatus, trendResults, {
      mapFn: async (list) => {
        const top = list.sort((a, b) => (b.dollarVolume ?? 0) - (a.dollarVolume ?? 0)).slice(0, 30);
        const { sp500Return, kospi200Return } = await getMarketReturnsCached();
        const full = (await mapWithConcurrency(top, 8, (r) => getFullMetrics(r.symbol).catch(() => null))).filter(Boolean);
        const fullBySymbol = new Map(full.map((m) => [m.symbol, m]));
        return top
          .map((r) => {
            const m = fullBySymbol.get(r.symbol);
            return m
              ? {
                  ...r,
                  attractivenessTotal: computeAttractivenessScore(m).total,
                  riskTotal: computeRiskScore(m, sp500Return, kospi200Return).total,
                  isIPO: isRecentIPO(m.firstTradeDate),
                }
              : r;
          })
          .filter((r) => r.attractivenessTotal !== undefined);
      },
      sortFn: (a, b) => (b.dollarVolume ?? 0) - (a.dollarVolume ?? 0),
      metricHeaderHtml: "상승 압력 점수",
      metricCellFn: (r) => (r.isIPO ? "IPO" : scoreRankColorHtml(r.attractivenessTotal, r.attractivenessTotal)),
      noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 순위는 당일 거래대금(거래량 × 현재가) 기준이며, 코스피200+코스닥150(약 350종목) 중 상위 30개입니다. 투자 자문이 아닙니다.</p>`,
    });
    return;
  }

  trendStatus.style.display = "block";
  trendStatus.textContent = "인기종목을 불러오는 중...";

  try {
    const marketReturnsPromise = getMarketReturns();
    const data = await yahooMostActive(50);
    const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
    if (quotes.length === 0) throw new Error("인기종목 데이터를 가져오지 못했습니다.");

    const ranked = quotes
      .filter((q) => q && q.symbol && q.regularMarketPrice !== undefined && q.regularMarketVolume !== undefined)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice,
        changePct: q.regularMarketChangePercent,
        volume: q.regularMarketVolume,
        dollarVolume: (q.regularMarketPrice || 0) * (q.regularMarketVolume || 0),
      }))
      .sort((a, b) => b.dollarVolume - a.dollarVolume)
      .slice(0, 20);

    await scoreAndRenderMovers(ranked, marketReturnsPromise, {
      statusEl: trendStatus,
      resultsEl: trendResults,
      rankNote: "순위는 당일 거래대금(거래량 × 현재가 추정) 기준입니다.",
      initialCount: 10,
      fullCount: 20,
    });
  } catch (err) {
    trendStatus.textContent = `❌ ${err.message || "인기종목을 가져오지 못했습니다."}`;
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
      noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승 압력 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래대금·모멘텀·매출 성장성을 종합한 참고용 지표이며 코스피200+코스닥150(약 350종목) 대상, 투자 자문이 아닙니다.</p>`,
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
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승 압력 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래대금·모멘텀·매출 성장성을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
  });
}

bindTrend(trendButtons.volume, runTrendVolume);
bindTrend(trendButtons.plunge, () => runMovers("plunge"));
bindTrend(trendButtons.surge, () => runMovers("surge"));
bindTrend(trendButtons.dividend, runTrendDividend);
bindTrend(trendButtons.pressure, runTrendPressure);

// US Markets 탭의 "주식" 카테고리 전용 카드 행 — 지수 카드(idx-row)와 동일한 스타일(로고+이름/티커, 가격/등락)
function stockCardRowHtml(r, { sectionMark = false } = {}) {
  const displayName = TICKER_TO_KOREAN_NAME[r.symbol] || r.name;
  const priceStr = fmtPrice(r.price, r.currency);
  const sign = (n) => (n >= 0 ? "+" : "");
  let cls = "";
  let changeAmtStr = "";
  let pctStr = "";
  if (r.changePct !== null && r.changePct !== undefined) {
    cls = r.changePct >= 0 ? "delta-up" : "delta-down";
    const arrow = r.changePct >= 0 ? "▲" : "▼";
    changeAmtStr = r.change !== null && r.change !== undefined ? `${sign(r.change)}${r.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "";
    pctStr = `${arrow} ${Math.abs(r.changePct).toFixed(2)}%`;
  }
  const volumeStr = r.volume !== null && r.volume !== undefined ? r.volume.toLocaleString() : "N/A";

  const now = new Date();
  const isToday = !!r.time && r.time.getFullYear() === now.getFullYear() && r.time.getMonth() === now.getMonth() && r.time.getDate() === now.getDate();
  const clockLabel = r.time
    ? (isToday
        ? `${String(r.time.getHours()).padStart(2, "0")}:${String(r.time.getMinutes()).padStart(2, "0")}:${String(r.time.getSeconds()).padStart(2, "0")}`
        : `${String(r.time.getMonth() + 1).padStart(2, "0")}/${String(r.time.getDate()).padStart(2, "0")}`)
    : "";
  const clockClass = isToday ? "idx-clock idx-clock-live" : "idx-clock";

  return `
    <div class="idx-row stock-card-row ticker-link idx-row-clickable" data-ticker="${escapeHtml(r.symbol)}">
      <div class="idx-left">
        <div class="idx-name">${tickerLogoHtml(r.symbol)}${escapeHtml(displayName)}${sectionMark ? sectionMarkHtml(r.symbol) : ""}</div>
        <div class="idx-sub">${clockLabel ? `<span class="${clockClass}">🕐 ${clockLabel}</span> | ` : ""}<span class="idx-ticker">${escapeHtml(r.symbol)}</span></div>
      </div>
      <div class="stock-card-right">
        <div class="stock-card-r1">
          <span class="stock-card-price ${cls}">${priceStr}</span>
          <span class="stock-card-change ${cls}">${changeAmtStr}</span>
        </div>
        <div class="stock-card-r2">
          <span class="stock-card-volume">${volumeStr}</span>
          <span class="stock-card-pct ${cls}">${pctStr}</span>
        </div>
      </div>
    </div>`;
}

// ---------- US Stock/US ETF/KR ETF 거래량 랭킹: ETF는 상승압력·투자안정 점수가 의미 없어 순위·티커·현재가·거래량만 표시하는 전용 렌더러 사용 ----------
function volumeRankingTableHtml(rows, { logoAfterName = false } = {}) {
  const trs = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${
          logoAfterName
            ? `<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b>${tickerLogoHtml(r.symbol)}`
            : `${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b>`
        }</span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, fmtPrice(r.price, r.currency))}${r.changePct !== null && r.changePct !== undefined ? `<br><span class="${r.changePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(r.changePct)})</span>` : ""}</td>
        <td>${r.volume !== null && r.volume !== undefined ? r.volume.toLocaleString() : "N/A"}</td>
      </tr>`
    )
    .join("");
  return `
    <div class="popular-table-wrap">
      <table class="top30-table popular-table">
        <thead><tr><th>순위</th><th>기업명</th><th>현재가<br>(등락률)</th><th>거래량</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

// candidatesPromise는 이미 거래량 내림차순 정렬된 전체 후보 배열(추가 API 호출 없이 already-fetched 데이터에서 더보기로 노출 범위만 넓힘)
async function renderVolumeRanking(candidatesPromise, { statusEl, resultsEl, initialCount = 10, fullCount = 30, rankNote, logoAfterName = false, cardStyle = false }) {
  statusEl.style.display = "block";
  statusEl.textContent = "거래량 데이터를 불러오는 중...";
  resultsEl.innerHTML = "";
  try {
    const all = await candidatesPromise;
    statusEl.style.display = "none";
    if (!all || all.length === 0) {
      resultsEl.innerHTML = `<p class="muted">데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }
    const capped = Math.min(fullCount, all.length);
    let shown = Math.min(initialCount, capped);
    const render = () => {
      const hasMore = shown < capped;
      const listHtml = cardStyle
        ? `<div class="idx-list">${all.slice(0, shown).map(stockCardRowHtml).join("")}</div>`
        : volumeRankingTableHtml(all.slice(0, shown), { logoAfterName });
      resultsEl.innerHTML =
        (rankNote ? `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote}</p>` : "") +
        listHtml +
        (hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${Math.min(shown + initialCount, capped)}">더보기 (${shown}/${capped})</button>` : "");
    };
    render();
    resultsEl._loadMore = (count) => {
      shown = count;
      render();
    };
    if (!resultsEl.dataset.moreBound) {
      resultsEl.addEventListener("click", (e) => {
        const moreBtn = e.target.closest(".load-more-btn");
        if (!moreBtn) return;
        resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
      });
      resultsEl.dataset.moreBound = "1";
    }
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = `❌ ${err.message || "거래량 데이터를 가져오지 못했습니다."}`;
  }
}

async function getUsStockVolumeCandidates() {
  const data = await yahooMostActive(50);
  const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
  return quotes
    .filter((q) => q && q.symbol && q.regularMarketPrice !== undefined && q.regularMarketVolume !== undefined)
    .map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume,
      time: q.regularMarketTime ? new Date(q.regularMarketTime * 1000) : null,
      currency: "USD",
    }))
    .sort((a, b) => b.volume - a.volume);
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
const FUTURE_LINE_COLORS = ["#eceef2", "#c7cbd6", "#a7acbc", "#888fa3"];

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

  // "4년 평균 기울기" = 과거 각 해의 후반부(창의 6개월 지점→12개월 지점) 변화폭의 평균
  const forwardDeltas = historicalBuckets
    .map((s) => {
      let mid = s.points[0];
      for (const p of s.points) {
        if (Math.abs(p.frac - 0.5) < Math.abs(mid.frac - 0.5)) mid = p;
      }
      const end = s.points[s.points.length - 1];
      if (end.frac < 0.9) return null; // 후반부가 거의 없는 해는 기울기 계산에서 제외
      return end.pct - mid.pct;
    })
    .filter((v) => v !== null);

  const avgForwardDelta = forwardDeltas.length ? forwardDeltas.reduce((a, b) => a + b, 0) / forwardDeltas.length : 0;
  const projectedEndPct = currentPct + avgForwardDelta;

  const currentPrice = currentBasePrice !== null ? currentBasePrice * (1 + currentPct / 100) : null;
  const forecastPrice = currentBasePrice !== null ? currentBasePrice * (1 + projectedEndPct / 100) : null;

  return {
    ticker,
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

// ---------- 요약 탭 상단 가격 차트(1일/1주/1달/1년/5년/최대) ----------
// niceStep/niceAxisBounds는 미래예측(퍼센트, 최소폭 10 고정)용이라 저가주에는 그리드가 너무 성겨져서
// 가격 스케일에 맞는 1-2-5 규칙의 범용 step 계산기를 별도로 둠
function niceStepGeneric(rawStep) {
  if (!(rawStep > 0)) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exp);
  const frac = rawStep / base;
  let niceFrac;
  if (frac < 1.5) niceFrac = 1;
  else if (frac < 3) niceFrac = 2;
  else if (frac < 7) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * base;
}
// 최댓값이 그래프 맨 위에 거의 붙도록 위쪽 여백은 아주 작게, 아래쪽은 라벨이 안 잘릴 정도만 남김(둥근 step으로 반올림하지 않음)
function priceAxisBounds(minVal, maxVal) {
  const span = Math.max(maxVal - minVal, Math.abs(maxVal || 1) * 0.001);
  const lo = minVal - span * 0.05;
  const hi = maxVal + span * 0.03;
  return { lo, hi };
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

  hitArea.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    showAt(indexFromClientX(e.clientX));
    hitArea.setPointerCapture(e.pointerId);
  });
  hitArea.addEventListener("pointermove", (e) => {
    if (e.buttons !== 1) return;
    showAt(indexFromClientX(e.clientX));
  });
  hitArea.addEventListener("pointerup", hide);
  hitArea.addEventListener("pointercancel", hide);
  hitArea.addEventListener("pointerleave", (e) => {
    if (e.buttons !== 1) hide();
  });
}

let summaryChartCurrentSymbol = null;
let summaryChartCurrentPeriod = "1y";
let summaryChartCurrentPairs = null; // OHLC 캐시 — 라인↔캔들 전환 시 재조회 없이 즉시 다시 그리기 위함
let summaryChartMode = "line"; // "line" | "candle"

function renderSummaryChartPairs(pairs, period, symbol) {
  const containerEl = el("summaryChartContainer");
  if (summaryChartMode === "candle") {
    containerEl.innerHTML = buildCandleChartSvg(pairs, period, symbol);
    setupPriceChartCrosshair(containerEl, pairs, priceChartScalesOhlc, symbol);
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

function buildFutureChartSvg(data) {
  const W = 780,
    H = 470;
  const ML = 44,
    MR = 132, // "예상" 아래 예상가($XX.XX(+YY%)) 줄이 길어져도(모바일에서 잘리지 않도록) 넉넉히 확보
    MT = 22,
    MB = 56; // (현재) 아래 오늘 기준 현재가를 한 줄 더 넣을 공간
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  const allPct = [];
  data.historicalBuckets.forEach((s) => s.points.forEach((p) => allPct.push(p.pct)));
  data.currentBucket.points.forEach((p) => allPct.push(p.pct));
  allPct.push(data.forecast.endPct);

  const { lo, hi, step } = niceAxisBounds(Math.min(...allPct), Math.max(...allPct));
  const xFn = (frac) => ML + frac * PW;
  const yFn = (val) => MT + (1 - (val - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const emphasize = Math.abs(v) < 0.001;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="${emphasize ? "#555b6b" : "#23262f"}" stroke-width="${emphasize ? 1.4 : 1}" />`;
    gridSvg += `<text x="${ML - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a90a3">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }

  let axisSvg = "";
  for (let m = 0; m <= 12; m++) {
    const frac = m / 12;
    const x = xFn(frac);
    const labelDate = addMonths(data.axisMonthStart, m);
    const isNow = m === 6;
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${isNow ? "#f5a623" : "#20232b"}" stroke-width="${isNow ? 1.6 : 1}" ${isNow ? "" : 'stroke-dasharray="2,3"'} />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${isNow ? "#f5a623" : "#8a90a3"}" font-weight="${isNow ? "700" : "400"}">${FUTURE_MONTH_NAMES_KO[labelDate.getMonth()]}</text>`;
  }
  axisSvg += `<text x="${xFn(0.5).toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(현재)</text>`;
  if (data.currentPrice !== null && data.currentPrice !== undefined) {
    axisSvg += `<text x="${xFn(0.5).toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#f5a623">$${data.currentPrice.toFixed(2)}</text>`;
  }

  let linesSvg = "";
  data.historicalBuckets.forEach((s, i) => {
    const color = FUTURE_LINE_COLORS[i % FUTURE_LINE_COLORS.length];
    linesSvg += `<path d="${pathFromPoints(s.points, xFn, yFn)}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />`;
    const last = s.points[s.points.length - 1];
    linesSvg += `<text x="${(xFn(last.frac) + 6).toFixed(1)}" y="${(yFn(last.pct) + 4).toFixed(1)}" font-size="12" font-weight="700" fill="${color}">${String(s.year).slice(2)}</text>`;
  });

  const curPoints = data.currentBucket.points;
  linesSvg += `<path d="${pathFromPoints(curPoints, xFn, yFn)}" fill="none" stroke="#e5342f" stroke-width="2.6" stroke-linejoin="round" />`;

  const lastReal = curPoints[curPoints.length - 1];
  const fx0 = xFn(lastReal.frac),
    fy0 = yFn(lastReal.pct);
  const fx1 = xFn(1),
    fy1 = yFn(data.forecast.endPct);
  linesSvg += `<line x1="${fx0.toFixed(1)}" y1="${fy0.toFixed(1)}" x2="${fx1.toFixed(1)}" y2="${fy1.toFixed(1)}" stroke="#e5342f" stroke-width="2.6" stroke-dasharray="7,6" stroke-linecap="round" />`;
  linesSvg += `<circle cx="${fx0.toFixed(1)}" cy="${fy0.toFixed(1)}" r="3.2" fill="#e5342f" />`;
  linesSvg += `<text x="${(fx1 + 6).toFixed(1)}" y="${(fy1 + 4).toFixed(1)}" font-size="12" font-weight="700" fill="#e5342f">예상</text>`;
  if (data.forecast.price !== null && data.forecast.price !== undefined) {
    // 괄호 안 퍼센트는 y축 기준(6개월 전 대비)이 아니라 "오늘 현재가 대비 예상가"의 실제 변동률이어야
    // 달러 표기($XX.XX)와 퍼센트가 서로 어긋나 보이지 않음(예: 오늘보다 비싸졌는데 마이너스로 보이는 문제 방지)
    const pctFromToday = data.currentPrice ? (data.forecast.price / data.currentPrice - 1) * 100 : data.forecast.endPct;
    const pctSign = pctFromToday >= 0 ? "+" : "";
    linesSvg += `<text x="${(fx1 + 6).toFixed(1)}" y="${(fy1 + 18).toFixed(1)}" font-size="11" font-weight="700" fill="#e5342f">$${data.forecast.price.toFixed(2)}(${pctSign}${pctFromToday.toFixed(1)}%)</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(data.ticker)} 미래예측 차트">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
  </svg>`;
}

function renderFutureChart(data) {
  el("futureChartContainer").innerHTML = buildFutureChartSvg(data);
  scrollChartToRight(el("futureChartContainer")); // 처음 열 때 가장 최근(오른쪽 끝)부터 보이게
  const yearsNote = data.historicalBuckets.length
    ? `흰색: 과거 ${data.historicalBuckets.length}개년(전후 6개월) 계절성 흐름 · `
    : `과거 데이터가 부족해 계절성 비교 없이 최근 추세만 표시했습니다 · `;
  const baseNote = `${data.ticker} · ${yearsNote}빨간 실선: 최근 6개월 실제 흐름 · 빨간 점선: ${data.hasForwardData ? "과거 흐름의 평균 기울기로 추정한 " : ""}향후 6개월 예상(참고용, 실제와 다를 수 있습니다)`;
  let forecastNote = "";
  if (data.currentPrice && data.forecast.price) {
    const pctFromToday = (data.forecast.price / data.currentPrice - 1) * 100;
    forecastNote = ` · <span style="color:var(--warn);font-weight:700;">6개월 후 예상 변동량: ${pctFromToday >= 0 ? "+" : ""}${pctFromToday.toFixed(1)}%</span>`;
  }
  el("futureChartCaption").innerHTML = `<span style="color:var(--warn);font-weight:700;">*그래프 4개 편차가 심할 경우 예측과 다를 가능성이 높습니다.</span><br>${escapeHtml(baseNote)}${forecastNote}`;
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

// ---------- 미래예측 2번째 그래프: 투자안정성 점수 구간(0~10점, 1점 단위 10구간)별 1년 수익률 최소/최대·최다분포 추이 ----------
// 데이터 출처: 백엔드 Worker가 매일 조금씩 S&P500을 스캔해 KV에 쌓고, 매달 말일에 그 달 스냅샷을 확정 발행(worker.js 참고).
// 이 기능을 막 배포한 시점에는 KV에 스냅샷이 하나도 없어 history가 빈 배열로 오는 게 정상이며, 그 경우 안내 문구만 표시한다.
const FUTURE_RISK_API = "https://us-stock.yeop2ad.workers.dev/future-risk-bands";

async function fetchFutureRiskBands(bucket) {
  const res = await fetch(`${FUTURE_RISK_API}?bucket=${bucket}`);
  if (!res.ok) throw new Error("구간별 통계를 가져오지 못했습니다.");
  return res.json();
}

// "YYYY-MM" 두 시점 사이의 개월 수 차이 — 스냅샷이 매달 한 번씩만 쌓이므로 실제 날짜 대신 월 단위 정수 인덱스로 x축을 구성
function monthIndexOf(monthKey, baseMonthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const [by, bm] = baseMonthKey.split("-").map(Number);
  return (y - by) * 12 + (m - bm);
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// actualPoints: 1번 차트의 currentBucket.points(frac 0~1이 전체 12개월 창 기준, 0~0.5가 "6개월 전~현재")를 그대로 재사용해
// 두 차트의 최근 6개월 실제 궤적이 완전히 동일한 모양·간격으로 겹쳐 보이게 함
// DB에는 10%p 단위로 쌓여 있지만, 팬아웃 라인이 너무 많아 복잡해 보이지 않도록 화면에 보여줄 때만 넓은 단위로 묶음
// (투자안정성 5~10점 구간은 표본이 더 촘촘한 편이라 20%p, 그 아래(0~5점)는 50%p로 묶음)
function groupBands(rawBands, width) {
  const buckets = new Map();
  for (const b of rawBands) {
    const bucketLo = Math.floor(b.lo / width) * width;
    const existing = buckets.get(bucketLo) || { lo: bucketLo, hi: bucketLo + width, count: 0 };
    existing.count += b.count;
    buckets.set(bucketLo, existing);
  }
  return [...buckets.values()].sort((a, b) => b.lo - a.lo);
}

function buildFutureRiskChartSvg({ history, bucket, actualPoints, axisMonthStart, currentPrice }) {
  const bands0 = history[history.length - 1];
  const rawBands = bands0.bands && bands0.bands.length ? bands0.bands : [bands0.modeBand].filter(Boolean);
  const bands = groupBands(rawBands, bucket >= 5 ? 20 : 50);
  // 최다분포(예상)도 화면에 보이는 그룹 단위 기준으로 다시 계산 — 원본 10%p 기준 modeBand와 표시가 어긋나지 않도록
  const modeBucket = bands.reduce((best, b) => (b.count > best.count ? b : best), bands[0]);
  const modeMid = (modeBucket.lo + modeBucket.hi) / 2;
  // 0~1점 구간은 표본 편차가 너무 커서 "최다분포=예상" 하나로 대표하기 부적절하므로 예상(빨간 점선) 강조를 생략
  const showForecast = bucket !== 0;

  const W = 780;
  const ML = 44,
    MR = 150, // 구간별 팬아웃 라인 끝에 붙는 라벨(예: "+80~+70%: 2건") 공간
    MT = 22,
    MB = 56;
  const nowIdx = 6; // 2월(0)~8월(6, 현재) 7칸 + 예측 지점(7)
  const forecastIdx = 7;

  // 1번 차트(actualPoints)는 "6개월 전" 시점을 0%로 잡은 값이지만, 2번 차트는 팬아웃 라인(구간별 1년 기대수익률)이
  // 전부 "오늘 기준" 값이므로 기준이 서로 다르면 안 맞음 — actualPoints를 오늘(마지막 값)이 0%가 되도록 다시 기준을 잡음
  const rawCurVal = actualPoints.length ? actualPoints[actualPoints.length - 1].pct : 0;
  const rebasedActualPoints = actualPoints.map((p) => ({ frac: p.frac, pct: p.pct - rawCurVal }));
  const curVal = 0; // 오늘(현재) 위치가 항상 기준점(0%)
  const bandTargets = bands.map((b) => (b.lo + b.hi) / 2);

  const allVals = [...rebasedActualPoints.map((p) => p.pct), curVal, modeMid, ...bandTargets];
  const { lo, hi, step } = niceAxisBounds(Math.min(...allVals), Math.max(...allVals));

  // 팬아웃 라인 라벨이 세로로 촘촘히 몰리면 겹치므로, 값 기준 y좌표를 구한 뒤 최소 간격(13px)을 강제로 벌려줌(값 순서는 유지)
  // — 그 라벨들이 모두 들어갈 만큼 플롯 높이를 넉넉히 잡아둠(그래도 넘치면 아래 svgH에서 캔버스 자체를 더 늘림)
  const H = Math.max(380, MT + bands.length * 15 + MB + 40);
  const PH = H - MT - MB;

  // 직전 6개월 구간은 기존 대비 가로 폭을 1/3로 줄이고(전체의 6/7 → 2/7), 남는 폭은 전부 1년후 구간에 몰아줘서
  // 1년후 구간이 6개월 구간보다 눈에 띄게 길게 보이도록 함
  const plotWidth = W - ML - MR;
  const historicalWidth = plotWidth * (nowIdx / forecastIdx / 3);
  const forecastWidth = plotWidth - historicalWidth;
  const xFnSlot = (slot) =>
    slot <= nowIdx ? ML + (slot / nowIdx) * historicalWidth : ML + historicalWidth + ((slot - nowIdx) / (forecastIdx - nowIdx)) * forecastWidth;
  const xFnActual = (frac) => xFnSlot(Math.min(frac / 0.5, 1) * nowIdx); // 1번 차트 frac(0~0.5=6개월전~현재)를 0~6칸에 맞춤
  const yFn = (val) => MT + (1 - (val - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    const emphasize = Math.abs(v) < 0.001;
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${W - MR}" y2="${y.toFixed(1)}" stroke="${emphasize ? "#555b6b" : "#23262f"}" stroke-width="${emphasize ? 1.4 : 1}" />`;
    gridSvg += `<text x="${ML - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a90a3">${v > 0 ? "+" : ""}${Math.round(v)}%</text>`;
  }

  const now = new Date();
  const nowX = xFnSlot(nowIdx);
  const forecastX = xFnSlot(forecastIdx);
  let axisSvg = "";
  for (let m = 0; m <= nowIdx; m++) {
    const x = xFnSlot(m);
    const labelDate = addMonths(axisMonthStart, m);
    const isNow = m === nowIdx;
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="${isNow ? "#f5a623" : "#20232b"}" stroke-width="${isNow ? 1.6 : 1}" ${isNow ? "" : 'stroke-dasharray="2,3"'} />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${isNow ? "#f5a623" : "#8a90a3"}" font-weight="${isNow ? "700" : "400"}">${FUTURE_MONTH_NAMES_KO[labelDate.getMonth()]}</text>`;
  }
  const forecastDate = addMonths(now, 12);
  axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">${String(forecastDate.getFullYear()).slice(2)}년 ${forecastDate.getMonth() + 1}월</text>`;

  // (현재)/(1년후) 아래 실제 달러 가격 — 1번 차트의 "예상가" 표기와 같은 형식
  axisSvg += `<text x="${nowX.toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(현재)</text>`;
  axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 32).toFixed(1)}" text-anchor="middle" font-size="11" fill="#f5a623" font-weight="700">(1년후)</text>`;
  let forecastPrice = null;
  if (currentPrice !== null && currentPrice !== undefined) {
    axisSvg += `<text x="${nowX.toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#f5a623">$${currentPrice.toFixed(2)}</text>`;
    if (showForecast) {
      forecastPrice = currentPrice * (1 + modeMid / 100);
      axisSvg += `<text x="${forecastX.toFixed(1)}" y="${(MT + PH + 48).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#e5342f">$${forecastPrice.toFixed(2)}</text>`;
    }
  }

  // 최근 6개월 실제 궤적 — 1번 차트와 동일한 데이터·간격을 그대로 재사용(빨간 실선)
  const actualPath = rebasedActualPoints.map((p, i) => `${i === 0 ? "M" : "L"}${xFnActual(p.frac).toFixed(1)},${yFn(p.pct).toFixed(1)}`).join(" ");
  let historySvg = actualPath ? `<path d="${actualPath}" fill="none" stroke="#e5342f" stroke-width="2.4" stroke-linejoin="round" />` : "";
  historySvg += `<circle cx="${nowX.toFixed(1)}" cy="${yFn(curVal).toFixed(1)}" r="3.2" fill="#e5342f" />`;

  // 현재 지점에서 이 구간(투자안정성 버킷) DB에 실제로 쌓인 수익률대 각각을 향해 팬아웃 —
  // 색이 너무 많으면(빨주노초파남보) 복잡해 보여서, 가장 높은 구간만 초록·가장 낮은 구간만 파랑으로 표시하고
  // 나머지는 흰색 계열로 통일하되, 그 구간에 몰린 종목 수(비중)가 클수록 더 진한(불투명한) 흰색으로 표현
  const nowY = yFn(curVal);
  const maxBandCount = Math.max(...bands.map((b) => b.count));
  let fanSvg = "";
  const labelYs = []; // 라벨 세로 겹침 방지용 — 값이 높은 밴드부터 순서대로 최소 13px씩 벌림
  bands.forEach((b, i) => {
    const isMode = showForecast && b.lo === modeBucket.lo; // 최다분포(예상) 구간은 그 줄 라벨에 "(예상)"을 붙여서 오른쪽 끝에서 바로 알아보게 함
    let color;
    if (isMode) color = "#e5342f"; // 최다분포(예상) 구간: 빨강
    else if (i === 0) color = "#3ecf6d"; // 가장 높은 수익률대: 초록
    else if (i === bands.length - 1) color = "#4a90e2"; // 가장 낮은 수익률대: 파랑
    else {
      const intensity = 0.35 + 0.55 * (b.count / maxBandCount); // 비중 클수록 진한 흰색
      color = `rgba(255,255,255,${intensity.toFixed(2)})`;
    }
    const targetVal = (b.lo + b.hi) / 2;
    const targetY = yFn(targetVal);
    const dash = isMode ? ' stroke-dasharray="7,6"' : "";
    fanSvg += `<line x1="${nowX.toFixed(1)}" y1="${nowY.toFixed(1)}" x2="${forecastX.toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="${color}" stroke-width="${isMode ? 2.6 : 2}"${dash} stroke-linecap="round" />`;
    let labelY = targetY;
    if (labelYs.length && labelY - labelYs[labelYs.length - 1] < 13) labelY = labelYs[labelYs.length - 1] + 13;
    labelYs.push(labelY);
    const hiTxt = `${b.hi > 0 ? "+" : ""}${b.hi}`;
    const loTxt = `${b.lo > 0 ? "+" : ""}${b.lo}`;
    fanSvg += `<text x="${(forecastX + 6).toFixed(1)}" y="${(labelY + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${color}">${hiTxt}~${loTxt}%: ${b.count}건${isMode ? " (예상)" : ""}</text>`;
  });

  const svgH = labelYs.length ? Math.max(H, labelYs[labelYs.length - 1] + 24) : H;
  // 이 차트는 처음부터 오늘 현재가를 기준으로 계산하므로 y축 값 자체가 곧 오늘 대비 변동률(0~1점 구간은 예상 자체를 생략)
  const forecastPctFromToday = showForecast ? modeMid : null;

  const svg = `<svg viewBox="0 0 ${W} ${svgH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="투자 안정 ${bucket}~${bucket + 1}점 구간 1년 수익률 예측">
    <rect x="0" y="0" width="${W}" height="${svgH}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${historySvg}
    ${fanSvg}
  </svg>`;

  return { svg, forecastPctFromToday, forecastPrice };
}

// ---------- 미래예측 3번째 그래프: 투자황금기 점수(VIX 공포지수 기반) 별 S&P500 30년 추이 ----------
// 검색한 종목과 무관한 시장 전체 데이터라 세션 내에서 한 번만 계산해 캐시(여러 번 검색해도 재요청하지 않음)
let macroScoreChartDataPromise = null;

// computeMacroScore와 동일한 공식을, "지금"이 아니라 임의 과거 시점 기준으로 계산 — VIX 주간 종가 시계열에서 그 시점에
// 가장 가까운 값을 사용. 점수(total)뿐 아니라 원본 VIX 값도 그대로 반환(차트에는 점수 대신 VIX 값을 라벨로 표시)
function computeMacroScoreAtDate(vixPairs, date) {
  const targetSec = Math.floor(date.getTime() / 1000);
  const point = closestPair(vixPairs, targetSec);
  const vix = point ? point.c : null;
  return { ...computeMacroScore({ vix }), vix };
}

// 매년 1월 1일 정기 포인트와 별도로, VIX가 실제로 급등했던 특정 월에도 점을 하나씩 더 찍음(날짜 텍스트 없이 점수만 동일한 형식으로 표시)
const SPECIAL_MACRO_MONTHS = [
  { y: 2020, m: 3 }, // 코로나 폭락
  { y: 2022, m: 4 }, // 2022년 금리인상 조정
  { y: 2025, m: 4 }, // 2025년 관세 충격
  { y: 2026, m: 3 },
];

async function computeMacroScoreChartData() {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const startYear = now.getFullYear() - 30;
  const startSec = Math.floor(new Date(startYear, 0, 1).getTime() / 1000);

  const [chartData, vixChartData, liveMacro] = await Promise.all([
    yahooChartRange("^GSPC", startSec, nowSec, "1wk"),
    yahooChartRange("^VIX", startSec, nowSec, "1wk"),
    getMacroMetrics(),
  ]);
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) throw new Error("S&P500 장기 데이터를 가져오지 못했습니다.");
  const vixPairs = chartClosePairs(vixChartData);
  if (vixPairs.length < 2) throw new Error("VIX 장기 데이터를 가져오지 못했습니다.");

  // 1년 간격(매년 1월 1일)으로 30년치 — 시작 연도는 오늘 기준으로 매번 다시 계산되므로 시간이 지나도 항상 최근 30년을 가리킴
  // 라벨은 그 시점의 투자황금기(VIX 환산) 점수로 표시
  const points = [];
  for (let anchor = new Date(startYear, 0, 1); anchor < now; anchor = addMonths(anchor, 12)) {
    const anchorSec = Math.floor(anchor.getTime() / 1000);
    const pricePoint = closestPair(pairs, anchorSec);
    if (!pricePoint || Math.abs(pricePoint.t - anchorSec) > 20 * 24 * 3600) continue; // 그 시점 데이터가 없으면(상장 전 등) 건너뜀
    const m = computeMacroScoreAtDate(vixPairs, anchor);
    points.push({ t: pricePoint.t, price: pricePoint.c, score: m.total, vix: m.vix, isNow: false });
  }
  // 마지막은 "지금" 실시간 점수 — 다시 볼 때마다 최신 VIX가 반영되므로 항상 현재 시점을 정확히 대표함
  const last = pairs[pairs.length - 1];
  const liveScore = computeMacroScore(liveMacro);
  points.push({ t: last.t, price: last.c, score: liveScore.total, vix: liveMacro.vix, isNow: true });

  // 특정 월(코로나 폭락 등)에도 정기 포인트와 동일한 형식(점수만, 날짜 텍스트 없음)으로 점을 추가
  for (const { y, m } of SPECIAL_MACRO_MONTHS) {
    const anchor = new Date(y, m - 1, 1);
    if (anchor >= now) continue;
    const anchorSec = Math.floor(anchor.getTime() / 1000);
    const pricePoint = closestPair(pairs, anchorSec);
    if (!pricePoint || Math.abs(pricePoint.t - anchorSec) > 20 * 24 * 3600) continue;
    const mm = computeMacroScoreAtDate(vixPairs, anchor);
    points.push({ t: pricePoint.t, price: pricePoint.c, score: mm.total, vix: mm.vix, isNow: false });
  }
  points.sort((a, b) => a.t - b.t);

  return { pairs, points };
}

function getMacroScoreChartData() {
  if (!macroScoreChartDataPromise) {
    macroScoreChartDataPromise = computeMacroScoreChartData().catch((e) => {
      macroScoreChartDataPromise = null; // 실패 시 다음 검색에서 재시도 가능하도록 캐시 초기화
      throw e;
    });
  }
  return macroScoreChartDataPromise;
}

function buildMacroScoreChartSvg(
  { pairs, points },
  highlightThreshold = 35,
  formatLabel = (v) => `${Math.round(v)}점`,
  ariaLabel = "VIX지수를 활용한 투자시점 점검표",
  m2Points = null // [{ t, yoyPct }] — 국내(FOMO) 차트에서만 "거래량"처럼 라인차트 아래에 월별 막대로 그림
) {
  // 1년 간격 점(약 30개)을 가로 스크롤로 넉넉하게 볼 수 있도록 점 개수에 비례해 캔버스 폭을 넓힘(고정 min-width는 CSS에서 강제)
  const W = Math.max(780, points.length * 45);
  const ML = 56,
    MR = 20,
    MT = 26;
  const PW = W - ML - MR;
  const PH = 354; // 메인 라인차트 플롯 높이(M2 패널 유무와 무관하게 고정 — 기존 420(=26+354+40) 레이아웃과 동일)

  const hasM2 = Array.isArray(m2Points) && m2Points.length > 0;
  const barGap = 16,
    barH = 84,
    axisLabelH = 24;
  const axisY = hasM2 ? MT + PH + barGap + barH : MT + PH; // 연도 세로 그리드선이 뻗는 하단 끝(막대 패널 있으면 그 아래까지)
  const H = hasM2 ? axisY + axisLabelH : MT + PH + 40;

  const minT = pairs[0].t;
  const maxT = pairs[pairs.length - 1].t;
  const prices = pairs.map((p) => p.c);
  const { lo: rawLo, hi, step } = niceAxisBounds(Math.min(...prices), Math.max(...prices));
  const lo = Math.max(0, rawLo); // 지수 값은 음수가 없으므로 하한을 0 밑으로 내려가지 않게 고정

  const xFn = (t) => ML + ((t - minT) / (maxT - minT)) * PW;
  const yFn = (v) => MT + (1 - (v - lo) / (hi - lo)) * PH;

  let gridSvg = "";
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) {
    const y = yFn(v);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${ML + PW}" y2="${y.toFixed(1)}" stroke="#23262f" stroke-width="1" />`;
    gridSvg += `<text x="${(ML - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#8a90a3">${Math.round(v).toLocaleString()}</text>`;
  }

  // x축: 매년 연도 라벨(가로 스크롤 가능한 넓은 캔버스라 1년 단위로 넣어도 겹치지 않음) — M2 막대 패널이 있으면
  // 세로 그리드선이 그 패널까지 관통해서 두 패널의 시간축이 시각적으로 연결되도록 하고, 연도 숫자는 맨 아래에만 적음
  let axisSvg = "";
  const firstYear = new Date(minT * 1000).getFullYear();
  const lastYear = new Date(maxT * 1000).getFullYear();
  for (let y = firstYear; y <= lastYear; y += 1) {
    const t = Math.floor(new Date(y, 0, 1).getTime() / 1000);
    if (t < minT || t > maxT) continue;
    const x = xFn(t);
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${axisY.toFixed(1)}" stroke="#1a1d24" stroke-width="1" />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(axisY + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8a90a3">${y}</text>`;
  }

  const linePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.t).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  let linesSvg = `<path d="${linePath}" fill="none" stroke="#e5342f" stroke-width="1.8" stroke-linejoin="round" />`;

  // 점(그 시점의 VIX 원본 수치, 소수점 없이 "N점" 형태로만 표시 — 날짜는 따로 적지 않음)은 빨간 선 위(그 날짜의 S&P 실제 값 높이)에
  // 정확히 얹어서 찍음 — VIX 35 이상일 때만 주황, 그 외 과거 점은 흰색. 위/아래를 번갈아 배치해 1년 간격(약 30개)이 서로 덜 겹치게 함
  points.forEach((p, i) => {
    const x = xFn(p.t);
    const y = yFn(p.price);
    const isHigh =
      p.vix !== null &&
      p.vix !== undefined &&
      (typeof highlightThreshold === "function" ? highlightThreshold(p.vix) : p.vix >= highlightThreshold);
    const dotColor = isHigh ? "#e08a2c" : "#eceef2";
    const r = p.isNow ? 4.2 : 2.6;
    linesSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dotColor}" stroke="#000" stroke-width="1" />`;
    const vixTxt = p.vix !== null && p.vix !== undefined ? formatLabel(p.vix) : "N/A";
    const fontSize = p.isNow ? 10 : 8.5;
    const rowH = p.isNow ? 12 : 9;
    const above = p.isNow || i % 2 === 0;
    const labelY = above ? y - 6 : y + rowH;
    linesSvg += `<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${dotColor}">${vixTxt}</text>`;
  });

  // M2 통화량 YoY 막대 서브패널 — 가격차트 아래 거래량 막대처럼, 메인 차트와 같은 시간축(xFn)을 공유해서 정렬
  let m2Svg = "";
  if (hasM2) {
    const barTop = MT + PH + barGap;
    const barBottom = barTop + barH;
    const m2Values = m2Points.map((p) => p.yoyPct);
    const m2Min = Math.min(0, ...m2Values);
    const m2Max = Math.max(0, ...m2Values);
    const m2Span = m2Max - m2Min || 1;
    const m2Y = (v) => barBottom - ((v - m2Min) / m2Span) * barH;
    const zeroY = m2Y(0);
    const barW = Math.max(1, (PW / m2Points.length) * 0.7);

    m2Svg += `<text x="${ML}" y="${(barTop - 6).toFixed(1)}" font-size="10" font-weight="700" fill="#8a90a3">M2 통화량 전년동월대비(%)</text>`;
    m2Svg += `<line x1="${ML}" y1="${zeroY.toFixed(1)}" x2="${ML + PW}" y2="${zeroY.toFixed(1)}" stroke="#3a3f4a" stroke-width="1" />`;
    m2Points.forEach((p) => {
      const x = xFn(p.t);
      if (x < ML - 1 || x > ML + PW + 1) return; // 메인 차트 시간 범위 밖(FOMO 시작연도 이전 등)은 생략
      const y = m2Y(p.yoyPct);
      const top = Math.min(y, zeroY);
      const h = Math.max(0.6, Math.abs(zeroY - y));
      const barColor = p.yoyPct >= 0 ? "#4c7fd1" : "#e5342f";
      m2Svg += `<rect x="${(x - barW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${barColor}" opacity="0.75" />`;
    });
    m2Svg += `<text x="${(ML - 8).toFixed(1)}" y="${(barTop + 9).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a90a3">${m2Max.toFixed(1)}%</text>`;
    m2Svg += `<text x="${(ML - 8).toFixed(1)}" y="${barBottom.toFixed(1)}" text-anchor="end" font-size="9" fill="#8a90a3">${m2Min.toFixed(1)}%</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(ariaLabel)}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
    ${m2Svg}
  </svg>`;
}

// futureMacroChartContainer는 미국(S&P500)·한국(코스피) 차트가 컨테이너를 공유하므로, 단순 boolean이 아니라
// "마지막으로 그린 게 어느 시장인지"를 추적해서 시장을 바꿔가며 검색해도 항상 맞는 차트가 보이게 함
let macroScoreChartRenderedMarket = null; // null | "US" | "KR"
async function renderMacroScoreChart() {
  el("futureMacroChartHeading").textContent = "VIX지수를 활용한 투자시점 점검표";
  if (macroScoreChartRenderedMarket === "US") return; // 검색할 때마다 다시 그릴 필요 없는 시장 전체 데이터라 최초 1회만 렌더링
  const container = el("futureMacroChartContainer");
  const caption = el("futureMacroChartCaption");
  container.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">S&amp;P500 30년 데이터를 불러오는 중...</p>`;
  try {
    const data = await getMacroScoreChartData();
    container.innerHTML = buildMacroScoreChartSvg(data);
    scrollChartToRight(container); // 처음 열 때 가장 최근(오른쪽 끝)부터 보이게
    macroScoreChartRenderedMarket = "US";
    caption.textContent =
      "빨간 선: S&P500 지수(1996~현재, 주간 종가) · 점 라벨: 1년 간격(매년 1월 1일 기준) VIX(FRED VIXCLS) 수치 그대로 · " +
      "주황 점: VIX 35 이상, 흰 점: 그 외(참고용, 투자 자문이 아닙니다)";
  } catch (err) {
    container.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ S&amp;P500 장기 데이터를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// ---------- 한국 종목용 과거분석 차트: 코스피(^KS11) 지수 + FOMO지수 과거 이력 ----------
// scripts/scan-kr-fomo-history.js(수동/주기적 배치)가 미리 역산해둔 data/kr-fomo-history.json을 읽어와
// 매년 3월·9월(6개월 간격) 포인트로 표시하고, 가장 최근("현재") 포인트만 실시간 FOMO API 값으로 채운다.
let krFomoHistoryDataPromise = null;
function getKrFomoHistoryData() {
  if (!krFomoHistoryDataPromise) {
    krFomoHistoryDataPromise = fetch("data/kr-fomo-history.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return krFomoHistoryDataPromise;
}

// M2 통화량(광의통화) 전년동월대비 증가율 — Worker(/m2-yoy)가 한국은행 ECOS를 대신 호출해 캐싱해둔 월별 시계열을 그대로 받아옴.
// 실패해도 FOMO 차트 자체는 정상 표시돼야 하므로 호출부에서 항상 catch(()=>null) 처리
let m2YoyDataPromise = null;
function getM2YoyData() {
  if (!m2YoyDataPromise) {
    m2YoyDataPromise = fetch(`${AUTH_ORIGIN}/m2-yoy`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.points)) return null;
        return data.points
          .map((p) => {
            const y = Number(p.ym.slice(0, 4));
            const m = Number(p.ym.slice(4, 6)) - 1;
            return { t: Math.floor(new Date(y, m, 1).getTime() / 1000), yoyPct: p.yoyPct };
          })
          .sort((a, b) => a.t - b.t);
      })
      .catch(() => null);
  }
  return m2YoyDataPromise;
}

let krMacroScoreChartDataPromise = null;
function getKrMacroScoreChartData() {
  if (!krMacroScoreChartDataPromise) {
    krMacroScoreChartDataPromise = computeKrMacroScoreChartData().catch((e) => {
      krMacroScoreChartDataPromise = null;
      throw e;
    });
  }
  return krMacroScoreChartDataPromise;
}

async function computeKrMacroScoreChartData() {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const startYear = 2011; // scan-kr-fomo-history.js가 역산하는 시작연도와 동일
  const startSec = Math.floor(new Date(startYear, 0, 1).getTime() / 1000);

  const [chartData, fomoHistory, liveFomo] = await Promise.all([
    yahooChartRange("^KS11", startSec, nowSec, "1d"),
    getKrFomoHistoryData(),
    getKrFomoMetrics().catch(() => ({ score: null })),
  ]);
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) throw new Error("코스피 장기 데이터를 가져오지 못했습니다.");
  if (!fomoHistory || !Array.isArray(fomoHistory.points)) throw new Error("KOSPI 공포지수 과거 이력 데이터가 아직 준비되지 않았습니다.");

  // data/kr-fomo-history.json에 있는 anchor를 전부 표시 — 기본은 매년 3/1·9/1(6개월 간격)이고,
  // 특정 시점(예: 2020-03-19 코로나 저점, 2025-11, 2026-06)을 수동 추가하면 그대로 점이 찍힘.
  // date는 "YYYY-MM"(그 달 1일로 해석) 또는 "YYYY-MM-DD" 둘 다 지원.
  const points = [];
  for (const p of fomoHistory.points) {
    if (p.score === undefined || p.score === null) continue;
    const parts = p.date.split("-").map(Number);
    const anchor = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    if (!(anchor < now)) continue;
    const anchorSec = Math.floor(anchor.getTime() / 1000);
    const idx = pairs.findIndex((pp) => pp.t >= anchorSec);
    if (idx < 0) continue;
    const pricePoint = pairs[idx];
    if (Math.abs(pricePoint.t - anchorSec) > 20 * 24 * 3600) continue;
    const pt = p.score * 100;
    points.push({ t: pricePoint.t, price: pricePoint.c, score: pt, vix: pt, isNow: false });
  }

  const last = pairs[pairs.length - 1];
  const livePt = liveFomo.score === null || liveFomo.score === undefined ? null : liveFomo.score * 100;
  points.push({ t: last.t, price: last.c, score: livePt, vix: livePt, isNow: true });
  points.sort((a, b) => a.t - b.t);

  return { pairs, points, generatedAt: fomoHistory.generatedAt };
}

async function renderKrMacroScoreChart() {
  el("futureMacroChartHeading").textContent = "KOSPI 공포지수를 활용한 투자시점 점검표";
  if (macroScoreChartRenderedMarket === "KR") return;
  const container = el("futureMacroChartContainer");
  const caption = el("futureMacroChartCaption");
  container.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">코스피 장기 데이터를 불러오는 중...</p>`;
  try {
    const [data, m2Points] = await Promise.all([getKrMacroScoreChartData(), getM2YoyData().catch(() => null)]);
    container.innerHTML = buildMacroScoreChartSvg(
      data,
      (v) => v !== null && v <= -15,
      (v) => `${v >= 0 ? "+" : ""}${Math.round(v)}%p`,
      "KOSPI 공포지수를 활용한 투자시점 점검표",
      m2Points
    );
    scrollChartToRight(container); // 처음 열 때 가장 최근(오른쪽 끝)부터 보이게
    macroScoreChartRenderedMarket = "KR";
    caption.textContent =
      "빨간 선: 코스피 지수(2011~현재, 일별 종가) · 점 라벨: KOSPI 공포지수(52주 신고가·신저가 근접 종목 비율 역산) · " +
      "주황 점: -15%p 이하(패닉), 흰 점: 그 외 · 파란/빨간 막대: M2(광의통화) 전년동월대비 증가율(월별, 한국은행 ECOS) · " +
      "과거 종목 유니버스는 현재 KODEX 200·코스닥150 편입종목 기준 근사치라 생존편향이 있을 수 있습니다(참고용, 투자 자문이 아닙니다)";
  } catch (err) {
    container.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ 코스피 장기 데이터를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 미래예측 모달 상단(틀고정 헤더): 로고-한글이름-영어티커-상승압력/투자안정성/거시경제(원형 점수)를 한 줄로 표시
async function renderFutureModalHeader(ticker, quote, metricsPromise, marketReturnsPromise) {
  const titleEl = el("futureChartModalTitle");
  const koName = TICKER_TO_KOREAN_NAME[ticker] || (quote && (quote.longname || quote.shortname)) || ticker;
  titleEl.innerHTML = `
    <span class="future-modal-identity">
      ${tickerLogoHtml(ticker)}
      <span class="future-modal-name">${escapeHtml(koName)}</span>
      <span class="future-modal-ticker">${escapeHtml(ticker)}</span>
    </span>
    <span class="future-modal-scores" id="futureModalScores">
      <span class="mini-score-circle small">·</span>
      <span class="mini-score-circle small risk">·</span>
      <span class="mini-score-circle small macro">·</span>
    </span>
  `;
  try {
    const [metrics, marketReturns] = await Promise.all([metricsPromise, marketReturnsPromise]);
    const isKr = isKrTicker(metrics.symbol);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, marketReturns.sp500Return, marketReturns.kospi200Return);
    const isIPO = isRecentIPO(metrics.firstTradeDate);
    let macroBadgeHtml;
    if (isKr) {
      const fomo = await getKrFomoMetrics().catch(() => ({ score: null }));
      macroBadgeHtml = `<span class="mini-score-circle small macro" title="KOSPI 공포지수"${fomoBgStyleAttr(fomo.score)}>${fomoDisplayValue(fomo.score)}</span>`;
    } else {
      const macroMetrics = await getMacroMetrics().catch(() => ({ vix: null }));
      const vix = macroMetrics.vix;
      macroBadgeHtml = `<span class="mini-score-circle small macro" title="S&P500 VIX"${scoreBgStyleAttr(vix, 10, 50, "fear")}>${vix !== null && vix !== undefined ? Math.round(vix) : "N/A"}</span>`;
    }
    const scoresEl = el("futureModalScores");
    if (scoresEl) {
      scoresEl.innerHTML = `
        <span class="mini-score-circle small" title="상승 압력">${isIPO ? "IPO" : attractiveness.total}</span>
        <span class="mini-score-circle small risk" title="투자 안정">${isIPO ? "IPO" : risk.total}</span>
        ${macroBadgeHtml}
      `;
    }
  } catch {
    // 점수 계산이 실패해도 로고·이름·티커는 그대로 유지
  }
}

let futureRiskRenderedTicker = null; // 투자안정성 "+자세히" 분포도가 어떤 종목 기준으로 그려져 있는지(중복 실행 방지)
const FUTURE_RISK_WARN_HTML = `<span style="color:var(--warn);font-weight:700;">*작년기준 과도하게 상승한 종목은 변동성에 주의하시기 바랍니다.</span><br>`;
async function renderFutureRiskSection(ticker, metricsPromise, marketReturnsPromise, futureData) {
  const riskContainer = el("futureRiskContainer");
  const riskCaption = el("futureRiskCaption");
  // 국내 종목: 이 분포 통계는 서버가 S&P500을 스캔해 쌓는 데이터라 코스피200·코스닥150 기준 통계는 별도 수집이 필요 — 준비 전까지 안내만 표시
  if (isKrTicker(ticker)) {
    riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">🚧 국내(코스피200·코스닥150) 점수별 분포 통계는 준비 중입니다. 먼저 해외(S&P500) 종목에서 확인해보세요.</p>`;
    riskCaption.innerHTML = FUTURE_RISK_WARN_HTML.replace(/<br>$/, "");
    futureRiskRenderedTicker = ticker.toUpperCase();
    return;
  }
  riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">투자 안정 구간별 통계를 불러오는 중...</p>`;
  riskCaption.textContent = "";

  try {
    const [metrics, marketReturns] = await Promise.all([metricsPromise, marketReturnsPromise]);
    const riskScore = computeRiskScore(metrics, marketReturns.sp500Return, marketReturns.kospi200Return);
    const bucket = clamp(Math.floor(riskScore.total), 0, 9);
    const { history } = await fetchFutureRiskBands(bucket);

    if (!history || history.length === 0) {
      riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">🚧 이 구간(투자 안정 ${bucket}~${bucket + 1}점)의 월별 통계가 아직 쌓이지 않았습니다. 서버가 매달 말일에 자동으로 갱신하며, 데이터가 쌓이는 대로 이 자리에 표시됩니다.</p>`;
      return;
    }

    const { svg, forecastPctFromToday } = buildFutureRiskChartSvg({
      history,
      bucket,
      actualPoints: futureData.currentBucket.points,
      axisMonthStart: futureData.axisMonthStart,
      currentPrice: metrics.price ?? null,
    });
    riskContainer.innerHTML = svg;
    scrollChartToRight(riskContainer); // 처음 열 때 가장 최근(오른쪽 끝)부터 보이게
    futureRiskRenderedTicker = ticker.toUpperCase();
    const last = history[history.length - 1];
    const baseNote =
      `${ticker}는 투자 안정 ${bucket}~${bucket + 1}점 구간(최근 집계 ${last.sampleSize}종목 표본) · 빨간 실선: ${ticker}의 최근 6개월 실제 흐름 · ` +
      `초록: 가장 높은 주가상승대, 파랑: 가장 낮은 주가상승대, 흰색(진할수록 비중 큼): 그 사이 구간별 종목 수`;
    if (forecastPctFromToday === null) {
      riskCaption.innerHTML = `${FUTURE_RISK_WARN_HTML}${escapeHtml(baseNote)} · <span style="color:var(--warn);font-weight:700;">0~1점 구간은 표본 편차가 너무 커서 1년 후 예상을 생략합니다.</span>`;
    } else {
      const pctSign = forecastPctFromToday >= 0 ? "+" : "";
      riskCaption.innerHTML =
        `${FUTURE_RISK_WARN_HTML}${escapeHtml(baseNote)} · 빨간 점선 "예상": 이 구간에서 가장 많이 몰린 주가상승대로 향하는 1년 후 예상(참고용, 투자 자문이 아닙니다) · ` +
        `<span style="color:var(--warn);font-weight:700;">1년 후 예상 변동량: ${pctSign}${forecastPctFromToday.toFixed(1)}%</span>`;
    }
  } catch (err) {
    riskContainer.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ 구간별 통계를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

// 기업검색 요약 페이지의 "🔮 미래예측" 토글에서 현재 보고 있는 종목으로 바로 실행(별도 티커 입력 불필요)
// metricsPromise/marketReturnsPromise를 넘겨받으면 요약 탭의 상승압력도·투자 안정성 점수와 동일한 fetch를 재사용해
// 두 화면의 점수가 서로 어긋나지 않게 함(넘겨받지 못한 경우에만 이 함수가 직접 새로 fetch)
async function runFuturePrediction(ticker, metricsPromise, marketReturnsPromise) {
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

    const sharedMetricsPromise = metricsPromise || getFullMetrics(ticker);
    const sharedMarketReturnsPromise = marketReturnsPromise || getMarketReturns();
    renderFutureModalHeader(ticker, quote, sharedMetricsPromise, sharedMarketReturnsPromise);
    renderFutureRiskSection(ticker, sharedMetricsPromise, sharedMarketReturnsPromise, data); // 실패해도 1번째 그래프는 그대로 유지
    setFutureStatus(null, null);
  } catch (err) {
    setFutureStatus("error", `❌ ${escapeHtml(err.message || "예측 차트를 불러오지 못했습니다.")}`);
  }
}
