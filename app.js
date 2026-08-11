// ===== 미국 기업 분석기 (API 키 불필요 버전) =====
// 데이터 소스: Yahoo Finance 비공식 엔드포인트(공개 CORS 프록시 경유) + Wikipedia(공식 CORS 지원)
// 주의: 비공식 API이므로 언제든 응답 형식이 바뀌거나 차단될 수 있습니다.

const el = (id) => document.getElementById(id);

const tickerInput = el("tickerInput");
const tickerSuggest = el("tickerSuggest");
const analyzeBtn = el("analyzeBtn");
const statusBox = el("statusBox");
const siteLogo = el("siteLogo");
const results = el("results");
const fixedHeader = el("fixedHeader");
const loadingSplash = el("loadingSplash");
const carouselViewport = el("carouselViewport");
const historicalStatus = el("historicalStatus");
const historicalResults = el("historicalResults");
const historicalFullUpBtn = el("historicalFullUpBtn");
const historicalFullDownBtn = el("historicalFullDownBtn");
const popularStatus = el("popularStatus");
const popularResults = el("popularResults");
const indexStatus = el("indexStatus");
const indexResults = el("indexResults");
const valuationStatus = el("valuationStatus");
const valuationResults = el("valuationResults");
const trendStatus = el("trendStatus");
const trendResults = el("trendResults");
const futureTickerInput = el("futureTickerInput");
const futureAnalyzeBtn = el("futureAnalyzeBtn");
const futureStatus = el("futureStatus");
const contactBtn = el("contactBtn");
const chatPanel = el("chatPanel");
const chatMessagesEl = el("chatMessages");
const chatTextInput = el("chatTextInput");
const chatSendBtn = el("chatSendBtn");
const chatError = el("chatError");
const chatCloseBtn = el("chatCloseBtn");

// ---------- 자유토론방(익명, 24시간 보관, 자유 텍스트 최대 30자) ----------
const CHAT_API = "https://us-stock.yeop2ad.workers.dev/chat";
const CHAT_POLL_MS = 4000;
const CHAT_MAX_LEN = 30;
const CHAT_CLIENT_COOLDOWN_MS = 10000; // 연속 전송 시 10초 제한(서버에서도 동일하게 최종 검증)
let chatPollTimer = null;
let lastChatMessageCount = -1;
let lastChatSentAt = 0;

function fmtChatTime(t) {
  return new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function renderChatMessages(messages) {
  if (messages.length === 0) {
    chatMessagesEl.innerHTML = `<p class="muted chat-empty">아직 등록된 글이 없습니다. 첫 글을 남겨보세요.</p>`;
    return;
  }
  chatMessagesEl.innerHTML = messages
    .map(
      (m) => `
      <div class="chat-msg">
        <span class="chat-time">${escapeHtml(fmtChatTime(m.t))}</span>
        <span class="chat-text">${escapeHtml(m.text)}</span>
      </div>`
    )
    .join("");
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function loadChatMessages() {
  try {
    const res = await fetch(CHAT_API);
    const data = await res.json();
    const messages = (data && data.messages) || [];
    if (messages.length !== lastChatMessageCount) {
      lastChatMessageCount = messages.length;
      renderChatMessages(messages);
    }
  } catch {
    // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
  }
}

function startChatPolling() {
  loadChatMessages();
  stopChatPolling();
  chatPollTimer = setInterval(loadChatMessages, CHAT_POLL_MS);
}

function stopChatPolling() {
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = null;
}

// 서버와 동일한 기준을 클라이언트에서 먼저 확인해 불필요한 요청과 대기를 줄임(최종 검증은 항상 서버에서)
function validateChatText(text) {
  if (text.length === 0) return "메시지를 입력해주세요.";
  if (text.length > CHAT_MAX_LEN) return `메시지는 최대 ${CHAT_MAX_LEN}자까지 입력할 수 있습니다.`;
  if (/https?:\/\/|www\.|\.(com|net|org|kr|io|co)\b/i.test(text)) return "URL 주소는 등록할 수 없습니다.";
  if (/(.)\1{4,}/.test(text)) return "같은 글자를 반복해서 입력할 수 없습니다.";
  return null;
}

async function sendChatPost() {
  const text = chatTextInput.value.trim();
  const validationError = validateChatText(text);
  if (validationError) {
    chatError.textContent = validationError;
    chatError.style.display = "block";
    return;
  }
  const now = Date.now();
  if (now - lastChatSentAt < CHAT_CLIENT_COOLDOWN_MS) {
    chatError.textContent = `너무 빠르게 전송했습니다. ${Math.ceil((CHAT_CLIENT_COOLDOWN_MS - (now - lastChatSentAt)) / 1000)}초 후 다시 시도해주세요.`;
    chatError.style.display = "block";
    return;
  }

  chatError.style.display = "none";
  chatSendBtn.disabled = true;
  try {
    const res = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      chatError.textContent = data.error || "등록에 실패했습니다.";
      chatError.style.display = "block";
      return;
    }
    lastChatSentAt = now;
    chatTextInput.value = "";
    const messages = data.messages || [];
    lastChatMessageCount = messages.length;
    renderChatMessages(messages);
  } catch {
    chatError.textContent = "등록에 실패했습니다. 잠시 후 다시 시도해주세요.";
    chatError.style.display = "block";
  } finally {
    chatSendBtn.disabled = false;
  }
}

contactBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = chatPanel.style.display !== "none";
  chatPanel.style.display = isOpen ? "none" : "flex";
  if (isOpen) {
    stopChatPolling();
  } else {
    chatError.style.display = "none";
    startChatPolling();
  }
});
chatCloseBtn.addEventListener("click", () => {
  chatPanel.style.display = "none";
  stopChatPolling();
});
chatSendBtn.addEventListener("click", sendChatPost);
chatTextInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatPost();
});

// 가격/차트보기 링크 클릭 시 새 탭 대신 앱 내 전체화면 모달로 TradingView 차트를 띄움(요약 카드·순위표 등 여러 곳에서 동적으로 삽입되므로 이벤트 위임 사용)
el("chartModalCloseBtn").addEventListener("click", closeChartModal);
document.addEventListener("click", (e) => {
  const linkEl = e.target.closest(".price-chart-link, .chart-link-btn");
  if (!linkEl) return;
  e.preventDefault();
  openChartModal(linkEl.dataset.chartSymbol);
});
// 지수 카드는 <a>가 아니라 role="button" div라 클릭 외에 키보드(Enter/Space) 접근성도 함께 지원
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const rowEl = e.target.closest(".idx-row-clickable");
  if (!rowEl) return;
  e.preventDefault();
  openChartModal(rowEl.dataset.chartSymbol);
});
document.addEventListener("click", (e) => {
  if (chatPanel.style.display !== "none" && !chatPanel.contains(e.target) && e.target !== contactBtn) {
    chatPanel.style.display = "none";
    stopChatPolling();
  }
});

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

// ---------- Yahoo Finance 헬퍼 ----------
async function yahooSearch(ticker) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=4&quotesCount=1`;
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

// 동일 섹터 종목을 시가총액 내림차순으로 반환(자기 자신 제외) — 경쟁사 TOP3 + 시총 유사 종목 선정에 사용
async function getSectorPeerCandidates(sector, selfSymbol) {
  const scrId = SECTOR_SCREENER_ID[sector];
  if (!scrId) return null;
  const data = await yahooScreener(scrId, 60);
  const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
  return quotes
    .filter((q) => q && q.symbol && q.symbol !== selfSymbol && q.marketCap !== undefined && q.marketCap !== null)
    .map((q) => ({ symbol: q.symbol, marketCap: q.marketCap }))
    .sort((a, b) => b.marketCap - a.marketCap);
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
      const [m2Points, curvePoints] = await Promise.all([fetchFredSeries("M2SL"), fetchFredSeries("T10Y2Y")]);

      const latestM2 = m2Points[m2Points.length - 1];
      const yearAgoTarget = new Date(latestM2[0]);
      yearAgoTarget.setFullYear(yearAgoTarget.getFullYear() - 1);
      let closest = m2Points[0];
      let minDiff = Infinity;
      for (const p of m2Points) {
        const diff = Math.abs(new Date(p[0]) - yearAgoTarget);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      const m2Yoy = closest[1] ? ((latestM2[1] - closest[1]) / closest[1]) * 100 : null;

      const latestSpread = curvePoints[curvePoints.length - 1];

      return {
        m2Yoy,
        m2Value: latestM2[1],
        m2Date: new Date(latestM2[0]),
        spread: latestSpread[1],
        spreadDate: new Date(latestSpread[0]),
      };
    })().catch((e) => {
      macroMetricsPromise = null; // 실패 시 다음 조회에서 재시도할 수 있도록 캐시 초기화
      throw e;
    });
  }
  return macroMetricsPromise;
}

// M2 통화량 증가폭(YoY) + 미국 장단기(10년-2년) 금리차를 조합한 참고용 거시경제 점수(10점 만점)
function computeMacroScore({ m2Yoy, spread }) {
  // 1) M2 통화량 YoY 증가율 (0~5점) — +10%면 만점, 0% 이하면 0점 (2%p마다 1점, 선형)
  let m2Score = 2.5;
  if (m2Yoy !== null && m2Yoy !== undefined) {
    m2Score = clamp(m2Yoy / 2, 0, 5);
  }

  // 2) 장단기 금리차(10Y-2Y) (0~5점) — 2 이상이면 만점, -0.5 이하면 0점 (0.5마다 1점, 선형)
  let curveScore = 2.5;
  if (spread !== null && spread !== undefined) {
    curveScore = clamp((spread + 0.5) / 0.5, 0, 5);
  }

  const total = Math.round(clamp(m2Score + curveScore, 0, 10) * 10) / 10;
  return { total, m2Score, curveScore };
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
    const [nasdaqChart, dowChart, sp500Chart] = await Promise.all([
      yahooChart("^IXIC"),
      yahooChart("^DJI"),
      yahooChart("^GSPC"),
    ]);
    const nasdaqReturn = get1yReturnFromChart(nasdaqChart);
    const dowReturn = get1yReturnFromChart(dowChart);
    const sp500Return = get1yReturnFromChart(sp500Chart);
    const valid = [nasdaqReturn, dowReturn].filter((v) => v !== null);
    const avgIndexReturn = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    return { nasdaqReturn, dowReturn, sp500Return, avgIndexReturn };
  } catch {
    return { nasdaqReturn: null, dowReturn: null, sp500Return: null, avgIndexReturn: null };
  }
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
      "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued,quarterlyTotalRevenue,annualOperatingCashFlow"
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
  const { recent5dAvg, avg1y } = currentDollarVolumeStats(chartData);

  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    price: meta.regularMarketPrice,
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
const CREDIT_RATING_SCORE = {
  AAA: 4, "AA+": 3.5, AA: 3, "AA-": 2.5, "A+": 2, A: 1.5, "A-": 1, "BBB+": 0.5,
};

// 투자등급(신용등급) + S&P500 대비 모멘텀 + 순이익률 + 시가총액 가점을 조합한 참고용 투자 안정성 점수(10점 만점, 높을수록 위험이 낮음)
function computeRiskScore(metrics, sp500Return) {
  const { symbol, oneYearReturn, netIncome, revenue, marketCap, currency } = metrics;

  // 1) 투자등급 (0~4점) — S&P 신용등급 기준. AAA 4점, AA+ 3.5점, AA 3점, AA- 2.5점, A+ 2점, A 1.5점, A- 1점, BBB+ 0.5점, BBB 이하 0점
  // 회사채 자체가 없는 종목(NO_DEBT_RATING)은 2점, S&P 미평가(UNRATED_REASON)·목록 미포함은 1점 처리
  let creditScore = 1;
  const rating = symbol ? TICKER_CREDIT_RATING[symbol] : undefined;
  if (rating === NO_DEBT_RATING) {
    creditScore = 2;
  } else if (rating === UNRATED_REASON) {
    creditScore = 1;
  } else if (rating !== undefined) {
    creditScore = CREDIT_RATING_SCORE[rating] !== undefined ? CREDIT_RATING_SCORE[rating] : 0;
  }

  // 2) S&P500 대비 모멘텀 (0~2점) — S&P500 연 수익률과의 차이(절대값)가 0%p면 만점,
  // 200%p 이상 벌어지면 0점 (50%p 멀어질 때마다 0.5점 감점, 선형)
  let marketScore = 1;
  let relDiff = null;
  if (oneYearReturn !== null && sp500Return !== null && sp500Return !== undefined) {
    relDiff = Math.abs(sp500Return - oneYearReturn);
    marketScore = clamp(2 * (1 - relDiff / 200), 0, 2);
  }

  // 3) 순이익률 = 순이익÷매출 (0~2점) — 0%는 1/3점, 10%p마다 1/3점씩 늘어 50% 이상이면 만점.
  // 적자(음수 순이익률)는 무조건 0점 처리
  let marginScore = 1;
  let netMargin = null;
  if (revenue !== null && revenue > 0 && netIncome !== null) {
    netMargin = netIncome / revenue;
    marginScore = netMargin < 0 ? 0 : clamp(((2 / 3) * (0.5 + netMargin * 5)), 0, 2);
  }

  // 4) 시가총액 가점 = 시가총액 ÷ 미국 시장 전체 시가총액 추정치(VTSAX 등 인덱스펀드가 이 비중만큼 보유한다고 가정) (0~2점)
  // 6% 이상이면 만점, 0%면 0점 (3%p마다 1점, 선형). 시가총액을 신뢰할 수 없는 경우(N/A)는 0.1점 처리
  let vtsaxScore = 0.1;
  let vtsaxWeightPct = null;
  if (marketCap !== undefined && marketCap !== null && (!currency || currency === "USD")) {
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
function fmtCompactCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
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

// 최근 5거래일 중 하루라도 ±10% 이상 급등/급락한 종목에 붙일 이모지(급등 🔥, 급락 ⚠️, 해당 없으면 빈 문자열)
const SURGE_WARNING_TITLE = "최근 5거래일 중 하루라도 ±10% 이상 급등락";
function surgeWarningEmoji(fiveDayExtremes) {
  if (!fiveDayExtremes) return "";
  const { hasSurge, hasPlunge } = fiveDayExtremes;
  if (!hasSurge && !hasPlunge) return "";
  const icons = `${hasSurge ? "🔥" : ""}${hasPlunge ? "⚠️" : ""}`;
  return ` <span title="${SURGE_WARNING_TITLE}">${icons}</span>`;
}
// 순위 표 위에 붙이는 경고 이모지 범례 + 상승압력/투자안정 점수 의미 설명
const SURGE_WARNING_LEGEND = `
  <p class="muted" style="font-size:11px;margin:0 0 4px;opacity:0.65;">🔥 급등 · ⚠️ 급락 — ${SURGE_WARNING_TITLE}</p>
  <p class="muted" style="font-size:11px;margin:0 0 2px;opacity:0.65;">📈 상승압력 — 현재 상승 압력이 높음을 의미<br>🛡️ 투자안정 — 1년 후 하락 가능성이 낮음을 의미</p>
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

// 실시간 시세 차트(TradingView)를 앱 내 전체화면 모달로 띄우기 위한 임베드 위젯 URL
// Yahoo Finance 차트보다 반응 속도가 빠름. TradingView는 클래스주 표기에 "-" 대신 "." 를 쓰므로(예: BRK-B → BRK.B) 변환 필요.
// 검은 배경 + 1년(12M) 기본 범위 + 좌측 그리기 툴바 숨김으로 모바일에서 차트만 크게 보이도록 구성
function tradingViewEmbedUrl(symbol) {
  const config = {
    symbol: symbol.replace(/-/g, "."),
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

function openChartModal(symbol) {
  if (!symbol) return;
  el("chartModalTitle").textContent = symbol;
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

// ---------- 고정 헤더 높이 동기화(카테고리 서브툴바가 열리고 닫힐 때마다 본문 padding-top을 다시 맞춤) ----------
function syncHeaderHeight() {
  document.documentElement.style.setProperty("--fixed-header-h", fixedHeader.offsetHeight + "px");
}
window.addEventListener("resize", syncHeaderHeight);
new ResizeObserver(syncHeaderHeight).observe(fixedHeader);
syncHeaderHeight();

// ---------- 스와이프 캐로셀(기업검색/인기종목/지수/과거분석/가치평가/추세평가/인사이트/미래예측) ----------
const TAB_ORDER = ["search", "popular", "index", "historical", "valuation", "trend", "insight", "future"];
const panels = {
  search: el("panelSearch"),
  popular: el("panelPopular"),
  index: el("panelIndex"),
  historical: el("panelHistorical"),
  valuation: el("panelValuation"),
  trend: el("panelTrend"),
  insight: el("panelInsight"),
  future: el("panelFuture"),
};
const tabButtons = {
  search: el("tabSearchBtn"),
  popular: el("tabPopularBtn"),
  index: el("tabIndexBtn"),
  historical: el("tabHistoricalBtn"),
  valuation: el("tabValuationBtn"),
  trend: el("tabTrendBtn"),
  insight: el("tabInsightBtn"),
  future: el("tabFutureBtn"),
};
const valuationButtons = {
  revenue: el("valuationRevenueBtn"),
  cashFlow: el("valuationCashFlowBtn"),
  netIncome: el("valuationNetIncomeBtn"),
  per: el("valuationPerBtn"),
  stability: el("valuationStabilityBtn"),
  marketCap: el("valuationMarketCapBtn"),
};
const trendButtons = {
  korea: el("trendKoreaBtn"),
  volume: el("trendVolumeBtn"),
  plunge: el("trendPlungeBtn"),
  surge: el("trendSurgeBtn"),
  pressure: el("trendPressureBtn"),
};
const insightButtons = {
  blackrock: el("insightBlackrockBtn"),
  vanguard: el("insightVanguardBtn"),
  berkshire: el("insightBerkshireBtn"),
  goldman: el("insightGoldmanBtn"),
  morganStanley: el("insightMorganStanleyBtn"),
  jpmorgan: el("insightJpmorganBtn"),
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
}

function switchTab(index) {
  index = Math.max(0, Math.min(TAB_ORDER.length - 1, index));
  activeTabIndex = index;
  TAB_ORDER.forEach((key) => panels[key].classList.add("snapping"));
  layoutPanels(0);
  updateTabBarActive();
  syncCarouselHeight();
  window.setTimeout(() => {
    TAB_ORDER.forEach((key) => panels[key].classList.remove("snapping"));
  }, 320);
  ensureTabLoaded(TAB_ORDER[index]);
  // 지수 탭에 있을 때만 자동 갱신(다른 탭으로 나가면 즉시 중단해 불필요한 요청을 만들지 않음)
  if (TAB_ORDER[index] === "index") startIndexAutoRefresh();
  else stopIndexAutoRefresh();
}

TAB_ORDER.forEach((key, i) => {
  tabButtons[key].addEventListener("click", () => switchTab(i));
});

// ---------- 탭별 데이터 로딩 캐싱: 한 번 로딩된 탭은 다시 방문해도 재요청하지 않음 ----------
const TAB_LOADERS = {
  popular: () => runPopular(),
  index: () => runIndexTab(),
  historical: () => runHistoricalQuick(),
  valuation: () => runValueRevenue(), // 가치평가 진입 시 첫 버튼(매출액 증가)을 자동 표시
  trend: () => runTrendVolume(), // 추세평가 진입 시 거래량을 자동 표시(한국보유는 아직 준비 중이라 기본값에서 제외)
  insight: () => runInsight("blackrock"), // 인사이트 진입 시 첫 버튼(블랙록)을 자동 표시
  // search: navigateToTicker()가 직접 담당(항상 최신 검색어를 반영해야 하므로 캐시 대상에서 제외)
  // future: 준비중 안내만
};
const tabLoadPromises = {};
function ensureTabLoaded(key) {
  if (tabLoadPromises[key]) return tabLoadPromises[key];
  const loader = TAB_LOADERS[key];
  tabLoadPromises[key] = loader ? Promise.resolve().then(loader).catch(() => {}) : Promise.resolve();
  return tabLoadPromises[key];
}

// ---------- 가로 스와이프(포인터 드래그로 손가락을 따라 화면이 끌려오는 캐로셀) ----------
let dragState = null;

carouselViewport.addEventListener("pointerdown", (e) => {
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

// ---------- 티커 검색/클릭 → 항상 탭1(기업검색)로 전환하며 그 종목을 로딩 ----------
// push=false는 popstate(뒤로/앞으로가기)나 최초 URL 진입 처리 시, 이미 있는 히스토리 상태를 다시 쌓지 않기 위함
function navigateToTicker(ticker, { push = true } = {}) {
  ticker = ticker.toUpperCase();
  if (push) {
    history.pushState({ ticker }, "", "?ticker=" + encodeURIComponent(ticker));
  }
  tickerInput.value = ticker;
  document.title = `${ticker} 분석 - 미국 기업 분석기 (yeopinvest.com)`;
  switchTab(TAB_ORDER.indexOf("search"));
  runAnalysis(ticker);
}

// 좌측 상단 로고를 누르면 기업검색 탭으로 이동(마지막으로 보던 종목은 유지)
siteLogo.addEventListener("click", () => switchTab(TAB_ORDER.indexOf("search")));
siteLogo.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    siteLogo.click();
  }
});

window.addEventListener("popstate", () => {
  const ticker = new URLSearchParams(location.search).get("ticker");
  navigateToTicker(ticker || "AAPL", { push: false });
});

// 종목 심볼 클릭 시 탭1(기업검색)로 전환하며 해당 종목 분석으로 이동(TOP10·인기종목 표에 이벤트 위임으로 공통 적용)
document.addEventListener("click", (e) => {
  const link = e.target.closest(".ticker-link");
  if (link && link.dataset.ticker) {
    navigateToTicker(link.dataset.ticker);
  }
});

// ---------- 초기 부팅: 탭1(기업검색)을 즉시 렌더한 뒤, 탭2~5를 순차적으로 백그라운드 로딩 ----------
(function initApp() {
  layoutPanels(0);
  updateTabBarActive();

  const initialTicker = new URLSearchParams(location.search).get("ticker") || "AAPL";
  navigateToTicker(initialTicker, { push: false });
  syncCarouselHeight();
  loadingSplash.style.display = "none";

  // 무료 프록시 과부하를 피하려고 한 탭씩 순서대로 로딩(사용자가 먼저 스와이프해서 들어가면 ensureTabLoaded가 그 자리에서 바로 시작함)
  (async () => {
    await ensureTabLoaded("popular");
    await ensureTabLoaded("index");
    await ensureTabLoaded("historical");
    await ensureTabLoaded("top30"); // 급등주 미리 로딩(진입 시 바로 표시)
  })();
})();

// 한국어 회사명으로도 검색할 수 있도록 자주 찾는 미국 기업 위주로 별도 매핑(야후 검색 API는 한국어 매칭을 지원하지 않음)
const KOREAN_COMPANY_NAMES = {
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
};

// 티커 → 한글명 역매핑(KOREAN_COMPANY_NAMES 재사용) — 같은 티커에 별칭이 여러 개면 먼저 나오는 것을 사용
const TICKER_TO_KOREAN_NAME = {};
for (const [ko, tk] of Object.entries(KOREAN_COMPANY_NAMES)) {
  if (!TICKER_TO_KOREAN_NAME[tk]) TICKER_TO_KOREAN_NAME[tk] = ko;
}

let mainTickerSuggestTimer = null;
function hideMainTickerSuggest() {
  tickerSuggest.style.display = "none";
  tickerSuggest.innerHTML = "";
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
function renderMainTickerSuggest(items) {
  if (items.length === 0) {
    hideMainTickerSuggest();
    return;
  }
  tickerSuggest.innerHTML = items
    .map(
      (it) =>
        `<div class="chat-ticker-option" data-symbol="${escapeHtml(it.symbol)}">
          <b>${escapeHtml(it.symbol)}</b> <span class="muted">${escapeHtml(it.name || "")}</span>${it.exchange ? ` <span class="muted">(${escapeHtml(it.exchange)})</span>` : ""}
        </div>`
    )
    .join("");
  tickerSuggest.style.display = "block";
}
async function handleMainTickerInput() {
  const q = tickerInput.value.trim();
  if (mainTickerSuggestTimer) clearTimeout(mainTickerSuggestTimer);
  if (q.length < 1) {
    hideMainTickerSuggest();
    return;
  }

  // 한국어 회사명 매칭은 목록이 작아 네트워크 응답을 기다리지 않고 바로 화면에 표시(거래소는 영문 결과에서 보강)
  const koreanMatches = Object.entries(KOREAN_COMPANY_NAMES)
    .filter(([name]) => name.includes(q))
    .map(([name, symbol]) => ({ symbol, name, exchange: null }));
  renderMainTickerSuggest(koreanMatches.slice(0, 8));

  mainTickerSuggestTimer = setTimeout(async () => {
    let englishMatches = [];
    try {
      const data = await yahooSearch(q);
      englishMatches = ((data && data.quotes) || [])
        .filter((qt) => qt.symbol)
        .map((qt) => ({ symbol: qt.symbol, name: qt.shortname || qt.longname || "", exchange: normalizeExchange(qt) }));
    } catch {
      // 검색 실패 시 한국어 매칭 결과만이라도 유지
    }
    if (tickerInput.value.trim() !== q) return; // 응답이 오는 사이 검색어가 바뀌었으면 무시(경쟁 상태 방지)
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
    renderMainTickerSuggest(merged.slice(0, 8));
  }, 250);
}

tickerSuggest.addEventListener("click", (e) => {
  const option = e.target.closest(".chat-ticker-option");
  if (!option) return;
  tickerInput.value = option.dataset.symbol;
  hideMainTickerSuggest();
  triggerSearch();
});
tickerInput.addEventListener("input", handleMainTickerInput);
document.addEventListener("click", (e) => {
  if (!tickerInput.contains(e.target) && !tickerSuggest.contains(e.target)) {
    hideMainTickerSuggest();
  }
});

// ---------- 메인 분석 흐름 ----------
// 입력값을 티커로 해석 — 한글 회사명(예: "애플" → AAPL), "애플(AAPL)"처럼 괄호 안 티커 표기, 영문 티커를 모두 지원
function resolveKoreanTicker(input) {
  const raw = (input || "").trim();
  const paren = raw.match(/\(([A-Za-z][A-Za-z.\-]{0,6})\)/); // "이름(TICKER)" 형태면 괄호 안 티커 우선
  if (paren) return paren[1].toUpperCase();
  const key = raw.replace(/\s+/g, ""); // 공백 제거 후 한글명 매핑 조회("존슨 앤 존슨" 등 대응)
  if (KOREAN_COMPANY_NAMES[key]) return KOREAN_COMPANY_NAMES[key];
  return raw.toUpperCase();
}

function triggerSearch() {
  if (!tickerInput.value.trim()) {
    setStatus("error", "❌ 분석할 기업의 티커나 한글 회사명을 입력해주세요. (예: AAPL, 애플)");
    return;
  }
  const ticker = resolveKoreanTicker(tickerInput.value);
  hideMainTickerSuggest();
  navigateToTicker(ticker);
}
analyzeBtn.addEventListener("click", triggerSearch);
tickerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});
async function runAnalysis(ticker) {
  analyzeBtn.disabled = true;
  results.style.display = "none";
  setStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];

    if (!quote) {
      throw new Error(`'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`);
    }

    const chartData = await yahooChart(ticker);
    if (!chartData || !chartData.chart || !chartData.chart.result) {
      throw new Error(`'${ticker}'의 시세 데이터를 가져오지 못했습니다.`);
    }
    const meta = chartData.chart.result[0].meta;

    results.style.display = "block";
    setStatus("loading", "섹션별 데이터를 정리하는 중입니다...");

    // 최근 5거래일간 ±10% 이상 급등락한 종목은 "요약" 제목 옆에 경고 이모지 표시
    el("summaryHeading").innerHTML = `1️⃣ 요약${surgeWarningEmoji(get5dExtremeMoves(chartData))}`;

    renderSummary(quote, meta, getDailyChangePercent(chartData)).catch((e) => {
      el("summarySection").innerHTML = `<p class="error-inline">사업 요약을 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderFinancials(ticker, meta.currency).catch((e) => {
      el("financialsSection").innerHTML = `<p class="error-inline">실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    // 나스닥·다우존스·S&P500 1년 수익률과, 분석 대상 자신의 지표(차트+재무제표)는
    // 경쟁사 비교(3)·상승압력도(5)·투자 안정성(6) 섹션이 각자 다시 조회하지 않고 공유해서
    // 프록시 요청 수를 줄이고(속도·안정성 향상) 값도 서로 어긋나지 않도록 함
    const marketReturnsPromise = getMarketReturns();
    const selfMetricsPromise = getFullMetrics(ticker);

    renderSummaryScoreRow(selfMetricsPromise, marketReturnsPromise);

    renderPeers(ticker, selfMetricsPromise, quote.sector || quote.sectorDisp).catch((e) => {
      el("peersSection").innerHTML = `<p class="error-inline">경쟁사 비교 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderNews(searchData).catch((e) => {
      el("newsSection").innerHTML = `<p class="error-inline">뉴스를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderScore(selfMetricsPromise).catch((e) => {
      el("scoreSection").innerHTML = `<p class="error-inline">상승압력도 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderRisk(marketReturnsPromise, selfMetricsPromise).catch((e) => {
      el("riskSection").innerHTML = `<p class="error-inline">투자 안정성 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderMacro().catch((e) => {
      el("macroSection").innerHTML = `<p class="error-inline">거시경제 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    setStatus(null, null);
  } catch (err) {
    setStatus("error", `❌ ${escapeHtml(err.message || "알 수 없는 오류가 발생했습니다.")}`);
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ---------- 1. 사업 요약 ----------
async function renderSummary(quote, meta, changePct) {
  el("summarySection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const companyName = quote.longname || quote.shortname || meta.longName || meta.symbol;
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
        <span>거래소: <b>${escapeHtml(quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>
        <span>현재가: <b>$${(meta.regularMarketPrice ?? 0).toFixed(2)}</b> ${changePct !== null && changePct !== undefined ? `<span class="${changePct >= 0 ? "delta-up" : "delta-down"}">(${fmtPct(changePct)})</span>` : ""}<a class="chart-link-btn" href="#" data-chart-symbol="${escapeHtml(symbol)}">📈 차트보기</a><button type="button" class="cat-btn ticker-historical-toggle-btn" id="tickerHistoricalToggleBtn" data-ticker="${escapeHtml(symbol)}">🕰️ 과거분석</button></span>
      </div>
    </div>
    <div id="tickerHistoricalRow" style="display:none;"></div>
  `;

  const toggleBtn = el("tickerHistoricalToggleBtn");
  let tickerHistoricalLoaded = false;
  toggleBtn.addEventListener("click", async () => {
    const row = el("tickerHistoricalRow");
    const isOpen = row.style.display !== "none";
    if (isOpen) {
      row.style.display = "none";
      toggleBtn.classList.remove("active");
      return;
    }
    row.style.display = "block";
    toggleBtn.classList.add("active");
    if (!tickerHistoricalLoaded) {
      tickerHistoricalLoaded = true;
      await runTickerHistorical(symbol, row);
    }
  });
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
    const [metrics, { sp500Return }, macroMetrics] = await Promise.all([
      selfMetricsPromise,
      marketReturnsPromise,
      getMacroMetrics().catch(() => ({ m2Yoy: null, spread: null })),
    ]);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, sp500Return);
    const macro = computeMacroScore(macroMetrics);
    const isIPO = isRecentIPO(metrics.firstTradeDate);

    rowEl.innerHTML = `
      <div class="mini-score">
        <div class="mini-score-circle">${isIPO ? "IPO" : attractiveness.total}</div>
        <span class="mini-score-label">상승압력도</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle risk">${isIPO ? "IPO" : risk.total}</div>
        <span class="mini-score-label">투자안정성</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle macro">${macro.total}</div>
        <span class="mini-score-label">거시경제</span>
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

    rows += `
      <tr>
        <td>${escapeHtml(year)}</td>
        <td>${fmtCompactCurrency(cur.revenue)}</td>
        <td>${revDelta}</td>
        <td>${cur.eps !== null && cur.eps !== undefined ? "$" + cur.eps.toFixed(2) : "N/A"}</td>
        <td>${epsDelta}</td>
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
          <span class="bar-revenue-label">${fmtCompactCurrency(rev)}</span>
        </div>
      </div>`;
    })
    .join("");

  el("financialsSection").innerHTML = `
    <table class="fin-table">
      <thead>
        <tr><th>연도</th><th>매출액</th><th>YoY</th><th>EPS</th><th>YoY</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="bar-chart">${revBars}</div>
  `;

  const lastYear = recentYears[recentYears.length - 1];
  return byYear[lastYear]?.eps ?? null;
}

// ---------- 3. 경쟁사 매출/주가/상승압력도 비교 ----------
// 경쟁사 4개 = 동일 섹터 시가총액 TOP3 + 시가총액이 자신과 가장 가까운 종목 1개
// (섹터를 알 수 없는 경우엔 Yahoo의 연관 종목 추천으로 대체)
async function renderPeers(ticker, selfMetricsPromise, sector) {
  el("peersSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const [sectorCandidates, selfMetrics] = await Promise.all([
    sector ? getSectorPeerCandidates(sector, ticker).catch(() => null) : Promise.resolve(null),
    selfMetricsPromise.then((m) => ({ ...m, self: true })).catch(() => null),
  ]);

  let peerTickers = [];
  let bySector = false;

  if (sectorCandidates && sectorCandidates.length > 0) {
    const top3 = sectorCandidates.slice(0, 3);
    const rest = sectorCandidates.slice(3);
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
  const rows = all
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .map((d) => {
      const pct = clamp(((d.revenue || 0) / maxRev) * 100, 2, 100);
      const score = computeAttractivenessScore(d);
      const isIPO = isRecentIPO(d.firstTradeDate);
      const scoreClass = isIPO ? "" : score.total >= 5 ? "delta-up" : "delta-down";
      return `
      <div class="peer-row">
        <span class="bar-label${d.self ? " self" : ""}">${escapeHtml(d.symbol)}</span>
        <div class="bar-track"><div class="bar-fill ${d.self ? "self" : ""}" style="width:${pct}%"></div></div>
        <span class="bar-value">${fmtCompactCurrency(d.revenue)}</span>
        <span class="peer-price">${fmtCompactCurrency(d.marketCap)}</span>
        <span class="peer-score ${scoreClass}">${isIPO ? "IPO" : score.total}</span>
      </div>`;
    })
    .join("");

  el("peersSection").innerHTML = `
    <p class="muted">최근 회계연도 매출액 기준 비교 (${bySector ? "동일 섹터 시가총액 TOP3 + 시총 유사 종목 1개" : "자동 감지된 관련 종목"})</p>
    <div class="peer-table-header">
      <span></span><span></span><span>매출액</span><span>시가총액</span><span>상승력</span>
    </div>
    <div class="bar-chart">${rows}</div>
  `;
}

// ---------- 4. 주요 뉴스 2건 ----------
async function renderNews(searchData) {
  el("newsSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const news = (searchData && searchData.news) || [];

  if (news.length === 0) {
    el("newsSection").innerHTML = `<p class="muted">최근 뉴스를 찾을 수 없습니다.</p>`;
    return;
  }

  const topNews = news.slice(0, 2);
  const translatedTitles = await Promise.all(
    topNews.map((n) => translateToKorean(n.title || "").catch(() => n.title || ""))
  );

  const items = topNews
    .map((n, i) => {
      const date = n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString("ko-KR") : "";
      const koTitle = translatedTitles[i] || n.title || "제목 없음";
      return `
      <div class="news-item">
        <div class="news-title"><a href="${escapeHtml(n.link || "#")}" target="_blank" rel="noopener">${escapeHtml(koTitle)}</a></div>
        <div class="news-meta">${escapeHtml(n.publisher || "")} · ${escapeHtml(date)}</div>
        <div class="news-original">원문: ${escapeHtml(n.title || "")}</div>
      </div>`;
    })
    .join("");

  el("newsSection").innerHTML = `
    ${items}
    <p class="muted" style="font-size:12px;margin-top:8px;">※ 제목은 자동 번역되었으며, 본문 요약은 제공되지 않습니다.</p>
  `;
}

// ---------- 5. 상승압력도 점수 (총 거래대금 + 매출 성장성 + 상승 모멘텀) ----------
async function renderScore(selfMetricsPromise) {
  el("scoreSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const metrics = await selfMetricsPromise;

  const score = computeAttractivenessScore(metrics);
  const { total, volumeScore, volumeRatio, growthScore, revenueGrowthYoY, momentumScore, momentum3m } = score;
  const isIPO = isRecentIPO(metrics.firstTradeDate);

  el("scoreSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>📊 총 거래대금(최근 5거래일 평균, 1년 평균 대비): <b>${volumeRatio !== null ? volumeRatio.toFixed(2) + "배" : "N/A"}</b> (2배 이상 만점, 1.5배 2점, 1배 1점, 0.5배 이하 0점)</li>
          <li>📈 매출 성장성(최근 분기 YoY): <b>${revenueGrowthYoY !== null && revenueGrowthYoY !== undefined ? fmtPct(revenueGrowthYoY) : "N/A"}</b> (가장 최근 분기 매출의 전년 동기 대비 성장률, 높을수록 가점, 30% 이상 만점·0% 이하 0점)</li>
          <li>🚀 상승 모멘텀(최근 3개월 수익률): <b>${momentum3m !== null && momentum3m !== undefined ? fmtPct(momentum3m) : "N/A"}</b> (높을수록 가점, 25% 이상 만점·0% 이하 0점)</li>
          <li>세부 점수 — 총 거래대금 ${volumeScore.toFixed(1)}/3, 매출 성장성 ${growthScore.toFixed(1)}/3, 상승 모멘텀 ${momentumScore.toFixed(1)}/4</li>
        </ul>
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

  const [metrics, { sp500Return }] = await Promise.all([selfMetricsPromise, marketReturnsPromise]);

  const {
    total,
    creditScore,
    rating,
    marketScore,
    marginScore,
    relDiff,
    netMargin,
    vtsaxScore,
    vtsaxWeightPct,
  } = computeRiskScore(metrics, sp500Return);
  const isIPO = isRecentIPO(metrics.firstTradeDate);

  el("riskSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge risk">
        <div class="score-num${isIPO ? " ipo-label" : ""}">${isIPO ? "IPO" : total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>🏅 투자등급(신용등급): <b>${rating ? rating : "S&P 등급 없음"}</b> (AAA 4점 만점, BBB+ 0.5점, BBB 이하 0점, 회사채 없음 2점, 미평가·목록없음 1점)</li>
          <li>📊 S&P500과의 1년 수익률 차이: ${relDiff !== null ? `<b>${relDiff.toFixed(1)}%p</b> (S&P500 <b>${fmtPct(sp500Return)}</b>)` : "N/A"} (차이가 작을수록 가점)</li>
          <li>💵 순이익률(순이익/매출): <b>${netMargin !== null ? (netMargin * 100).toFixed(1) + "%" : "N/A"}</b> (높을수록 가점, 적자면 0점)</li>
          <li>🏦 시가총액 가점(미국 전체 시장 내 시총 비중): <b>${vtsaxWeightPct !== null ? vtsaxWeightPct.toFixed(2) + "%" : "N/A"}</b> (VTSAX 등 인덱스펀드 예상 비중 근사, 6% 이상 만점·0% 0점)</li>
          <li>세부 점수 — 투자등급 ${rating === NO_DEBT_RATING || rating === UNRATED_REASON ? rating : creditScore.toFixed(1) + "/4"}, S&P500 대비 모멘텀 ${marketScore.toFixed(1)}/2, 순이익률 ${marginScore.toFixed(1)}/2, 시가총액 가점 ${vtsaxScore.toFixed(1)}/2</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 점수가 높을수록(10점에 가까울수록) 재무적으로 더 안정적/저위험임을 의미합니다.
          투자등급, S&P500 대비 수익률, 순이익률, 시가총액 가점을 조합한 <b>단순 참고용 정량 지표</b>이며, 투자 자문이나 매수/매도 추천이 아닙니다.
          투자등급은 S&P 신용등급을 기준으로 자체 조사해 수동으로 입력한 참고용 데이터로, 실시간 갱신되지 않으며 목록에 없는 종목은 중립 처리됩니다.
          시가총액 가점은 실제 펀드 편입 비중이 아니라 시가총액 기준 추정치입니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 7. 거시경제 점수 (M2 통화량 증가폭 + 미국 장단기 금리차, 종목과 무관) ----------
async function renderMacro() {
  el("macroSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const { m2Yoy, m2Date, spread, spreadDate } = await getMacroMetrics();
  const { total, m2Score, curveScore } = computeMacroScore({ m2Yoy, spread });

  const m2DateStr = m2Date ? `${m2Date.getFullYear()}.${m2Date.getMonth() + 1}` : "";
  const spreadDateStr = spreadDate ? spreadDate.toLocaleDateString("ko-KR") : "";

  el("macroSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge macro">
        <div class="score-num">${total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>💵 M2 통화량 증가율(전년 동월 대비, ${escapeHtml(m2DateStr)} 기준): <b>${fmtPct(m2Yoy)}</b> (10% 이상이면 만점, 0% 이하면 0점)</li>
          <li>📐 미국 장단기(10년-2년) 금리차(${escapeHtml(spreadDateStr)} 기준): <b>${spread !== null && spread !== undefined ? spread.toFixed(2) + "%p" : "N/A"}</b> (2 이상이면 만점, -0.5 이하면 0점)</li>
          <li>세부 점수 — M2 증가율 ${m2Score.toFixed(1)}/5, 장단기 금리차 ${curveScore.toFixed(1)}/5</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 이 점수는 특정 종목과 무관한 미국 전체 거시경제 지표(연방준비은행 FRED 데이터 기반)이며,
          M2 통화량 증가율과 장단기 금리차를 조합한 <b>단순 참고용 정량 지표</b>입니다. 투자 자문이나 매수/매도 추천이 아니며,
          FRED의 비공식/내부 데이터 엔드포인트를 사용하므로 일시적으로 조회가 안 될 수 있습니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 가치평가 탭 공용 렌더러 ----------
// 처음엔 시가총액 상위 약 30개만 빠르게 조회·계산해서 보여주고(tickers는 호출부에서 이미 시총 상위 30개가
// 앞쪽에 오도록 정렬해서 넘김), "전체보기"를 누르면 나머지 S&P500 전 종목(약 470개)을 마저 조회해 다시 정렬함
async function renderValueRanking(
  tickers,
  label,
  { statusEl, resultsEl, buttons, mapFn = (list) => list, sortFn, metricHeaderHtml, metricCellFn, noteHtml, initialCount = 30 }
) {
  buttons.forEach((btn) => (btn.disabled = true));
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";

  let cursor = 0;
  let rawScored = [];

  async function scoreUpTo(targetCursor) {
    targetCursor = Math.min(targetCursor, tickers.length);
    const isFullScan = targetCursor - cursor > initialCount; // 초기 배치보다 큰 구간을 한 번에 요청하면 "전체보기" 클릭으로 간주
    try {
      const pending = tickers.slice(cursor, targetCursor);
      if (pending.length > 0) {
        const startCursor = cursor;
        statusEl.style.display = "block";
        const label2 = isFullScan ? `전체 검색 중(약 1분 소요될 수 있어요)` : `${label} 확인 중`;
        statusEl.textContent = `${startCursor}/${targetCursor} 종목 ${label2}...`;
        const metricsList = await mapWithConcurrency(pending, 5, getFullMetrics, (completed) => {
          statusEl.textContent = `${startCursor + completed}/${targetCursor} 종목 ${label2}...`;
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

      const rows = ranked
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
      resultsEl.innerHTML = `
        ${noteHtml || ""}
        <p class="muted" style="font-size:12px;">시가총액 상위 ${Math.min(cursor, initialCount)}개${cursor > initialCount ? ` + 나머지 ${cursor - initialCount}개` : ""} 확인(S&amp;P500 ${tickers.length}개 중 ${cursor}개, ${ranked.length}개 성공)</p>
        <table class="top30-table">
          <thead><tr><th>순위</th><th>티커</th><th>현재가</th><th>${metricHeaderHtml}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasMore ? `<button type="button" class="cat-btn load-more-btn" data-next-count="${tickers.length}">전체보기 (나머지 ${tickers.length - cursor}개 · 500개 전부 검색 시 약 1분 소요)</button>` : ""}
      `;
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || "분석 중 오류가 발생했습니다."}`;
    }
  }

  resultsEl._loadMore = (count) => {
    const moreBtn = resultsEl.querySelector(".load-more-btn");
    if (moreBtn) {
      moreBtn.disabled = true;
      moreBtn.textContent = "전체 검색 중...";
    }
    scoreUpTo(count);
  };
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  await scoreUpTo(initialCount);
  buttons.forEach((btn) => (btn.disabled = false));
}

const VALUE_DISCLAIMER = `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> S&amp;P500 편입 종목 전체를 대상으로 계산한 순위이며 투자 자문이 아닙니다.</p>`;

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

async function runValuePer() {
  await runValueScreenFromSP500(valuationButtons.per, "PER", {
    sortFn: (a, b) => (a.per ?? Infinity) - (b.per ?? Infinity),
    metricHeaderHtml: "PER(현재가 기준)",
    metricCellFn: (r) => (r.per === null || r.per === undefined ? "N/A" : `${r.per.toFixed(1)}배`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> PER = 현재가 ÷ 최근 회계연도 EPS(낮을수록 저평가), 적자 기업은 N/A 처리되어 순위에서 제외됩니다. 투자 자문이 아닙니다.</p>`,
  });
}

async function runValueStability() {
  const { sp500Return } = await getMarketReturns();
  await runValueScreenFromSP500(valuationButtons.stability, "투자안정", {
    mapFn: (list) =>
      list.map((m) => ({ ...m, riskTotal: computeRiskScore(m, sp500Return).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.riskTotal - a.riskTotal,
    metricHeaderHtml: "투자안정성 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : `<b>${r.riskTotal}/10</b>`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 투자안정성 점수(10점 만점, 높을수록 재무적으로 안정적)는 신용등급·모멘텀·수익성·시가총액을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
  });
}

async function runValueMarketCap() {
  await runValueScreenFromSP500(valuationButtons.marketCap, "시가총액", {
    sortFn: (a, b) => (b.marketCap || 0) - (a.marketCap || 0),
    metricHeaderHtml: "시가총액",
    metricCellFn: (r) => (r.marketCap ? fmtCompactCurrency(r.marketCap) : "N/A"),
    noteHtml: VALUE_DISCLAIMER,
  });
}

bindValuation(valuationButtons.revenue, runValueRevenue);
bindValuation(valuationButtons.cashFlow, runValueCashFlow);
bindValuation(valuationButtons.netIncome, runValueNetIncome);
bindValuation(valuationButtons.per, runValuePer);
bindValuation(valuationButtons.stability, runValueStability);
bindValuation(valuationButtons.marketCap, runValueMarketCap);

// 인사이트 서브내비(거대기업 13F 보유종목)에서 현재 선택된 버튼만 활성 표시
function setInsightActive(activeBtn) {
  Object.values(insightButtons).forEach((b) => b && b.classList.toggle("active", b === activeBtn));
}
const bindInsight = (btn, institution) =>
  btn.addEventListener("click", () => {
    setInsightActive(btn);
    runInsight(institution);
  });
bindInsight(insightButtons.blackrock, "blackrock");
bindInsight(insightButtons.vanguard, "vanguard");
bindInsight(insightButtons.berkshire, "berkshire");
bindInsight(insightButtons.goldman, "goldman");
bindInsight(insightButtons.morganStanley, "morganStanley");
bindInsight(insightButtons.jpmorgan, "jpmorgan");

// 거대기업(블랙록·뱅가드·버크셔 등) 13F 공시 기반 보유종목 TOP20
// SEC EDGAR 13F-HR(분기 공시)에서 직접 집계한 데이터. 13F는 분기 1회(최대 45일 지연)만 갱신되므로
// 실시간 백엔드 대신 분기마다 이 스냅샷을 갱신하는 방식으로 운영(자세한 내용은 각 institution 데이터의 asOf/prevAsOf 참고)
const INSIGHT_INSTITUTION_LABELS = {
  blackrock: "블랙록",
  vanguard: "뱅가드",
  berkshire: "버크셔 해서웨이",
  goldman: "골드만삭스",
  morganStanley: "모건스탠리",
  jpmorgan: "JP모건 체이스",
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
          ? `${h.weightPct.toFixed(2)}%<br><span class="muted" style="font-size:11px;">(신규)</span>`
          : `${h.weightPct.toFixed(2)}%<br><span class="${h.weightChangePt >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">(${fmtPct(h.weightChangePt, 2)}p)</span>`;
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
    <table class="top30-table">
      <thead>
        <tr><th>순위</th><th>종목</th><th>${data.filedDate.slice(5)}<br>비중 (변동)</th><th>총 신고가치<br>(금액변동)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function runInsight(institution) {
  setInsightActive(insightButtons[institution]);
  const status = el("insightStatus");
  const results = el("insightResults");
  status.style.display = "";
  status.textContent = `⏳ ${INSIGHT_INSTITUTION_LABELS[institution]} 데이터를 불러오는 중...`;
  results.innerHTML = "";
  const data = await getInsightData(institution);
  if (!data) {
    status.textContent = `🚧 ${INSIGHT_INSTITUTION_LABELS[institution]} 보유종목 데이터는 준비 중입니다. SEC 13F 공시(분기 공개, 최대 45일 지연)를 기반으로 곧 제공될 예정입니다.`;
    return;
  }
  status.style.display = "none";
  results.innerHTML = insightTableHtml(data);
}

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
// — 과거분석 전체(runHistoricalAnalysis)와 탭3 기본 퀵뷰(runHistoricalQuick)가 공유
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

function tickerLogoHtml(symbol) {
  const s = escapeHtml(symbol);
  const ov = LOGO_OVERRIDE[symbol];
  const bg = logoBg(symbol);
  const wrapStyle = bg ? ` style="background:${bg}"` : "";
  if (ov && ov.src) {
    return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${ov.src}" alt="${s}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="ticker-logo-badge" style="display:none;">${s.slice(0, 2)}</span></span>`;
  }
  const { primary, fmp, useFallback } = logoSources(symbol, 80);
  const fb = useFallback ? ` data-fallback="${fmp}"` : "";
  return `<span class="ticker-logo-wrap"${wrapStyle}><img class="ticker-logo" src="${primary}" alt="${s}" loading="lazy"${fb} onerror="${LOGO_ONERROR}" /><span class="ticker-logo-badge" style="display:none;">${s.slice(0, 2)}</span></span>`;
}

// buildHistoricalCompareRows 결과로 과거분석 표 HTML(범례 제외)을 생성 — moversTableHtml과 동일한 5컬럼 구성(순위/티커+원형로고/현재가(등락률)/상승압력/투자안정)
// rankColumnLabel만 호출부마다 다름
function historicalTableHtml(rows, rankColumnLabel) {
  const scoreClass = (score) => (score === null ? "" : score > 5 ? "delta-up" : score < 5 ? "delta-down" : "");
  const tableRows = rows
    .map((r, i) => {
      return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span>${r.name ? `<br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span>` : ""}</td>
        <td>${priceChartLink(r.symbol, "$" + r.currentPrice.toFixed(2))}<br><span class="${r.priceChangePct !== null && r.priceChangePct >= 0 ? "delta-up" : "delta-down"}" style="font-size:11px;">${r.priceChangeAmt !== null ? `${r.priceChangeAmt >= 0 ? "+" : ""}$${r.priceChangeAmt.toFixed(2)} ` : ""}${r.priceChangePct !== null ? `(${fmtPct(r.priceChangePct)})` : "N/A"}</span></td>
        <td class="${scoreClass(r.historicalAttractiveness)}"><b>${r.historicalAttractiveness}</b></td>
        <td class="${scoreClass(r.historicalRisk)}"><b>${r.historicalRisk}</b></td>
      </tr>`;
    })
    .join("");

  return `
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 1년전 상승압력·투자안정은 <b>1년 전 시점</b> 기준으로 근사 계산한 참고용 점수입니다(각 10점 만점, 높을수록 상승 여력 크고·재무 안정적 / 5점보다 높으면 초록·낮으면 빨강). 투자 자문이 아닙니다.</p>
    <table class="top30-table">
      <thead>
        <tr><th>${rankColumnLabel}</th><th>티커</th><th>현재가<br>(등락률)</th><th>1년전<br>상승압력</th><th>1년전<br>투자안정</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// S&P500 전체 종목 중 1년 등락률 TOP50을, 과거분석 기준 시점(1년 전 + 이번 달 1일 이후 첫 거래일) 스냅샷과 비교
// direction: "up" — S&P500 중 1년 상승률 상위 50개 / "down" — S&P500 중 1년 하락률 상위(가장 많이 내린) 50개
async function runHistoricalAnalysis(direction) {
  const isUp = direction === "up";
  const btn = isUp ? historicalFullUpBtn : historicalFullDownBtn;
  const rankLabel = isUp ? "상승률" : "하락률";

  historicalStatus.style.display = "block";
  historicalResults.innerHTML = "";
  btn.disabled = true;

  const refDate = getHistoricalReferenceDate();
  const introYearMonthStr = `${String(refDate.getFullYear()).slice(-2)}.${refDate.getMonth() + 1}월`;
  const introMsg = `📢 과거 1년전(${introYearMonthStr}) 데이터를 분석하여 ${isUp ? "상승량" : "하락량"} TOP50을 비교합니다. 또한 당시 점수를 반영합니다.`;
  const setStatus = (msg) => {
    historicalStatus.innerHTML = `${introMsg}<br><span style="font-size:12px;">${msg}</span>`;
  };

  try {
    setStatus("S&P500 종목 목록을 불러오는 중...");
    const allTickers = await getSP500Tickers();

    setStatus(`0/${allTickers.length} 종목 분석 중(S&P500 전체 중 1년 ${rankLabel} 상위 50 선정)...`);
    const allMetricsList = await mapWithConcurrency(allTickers, 5, getFullMetrics, (completed, total) => {
      setStatus(`${completed}/${total} 종목 분석 중(S&P500 전체 중 1년 ${rankLabel} 상위 50 선정)...`);
    });

    const top30 = allMetricsList
      .filter((m) => m && m.oneYearReturn !== null && m.oneYearReturn !== undefined)
      .sort((a, b) => (isUp ? b.oneYearReturn - a.oneYearReturn : a.oneYearReturn - b.oneYearReturn))
      .slice(0, 50);

    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);

    let done = 0;
    setStatus(`0/${top30.length} 종목의 기준 시점 데이터 조회 중...`);
    const historicalList = await mapWithConcurrency(top30, 3, async (m) => {
      const h = await getHistoricalCompareMetrics(m.symbol, sp500PairsPromise);
      done++;
      setStatus(`${done}/${top30.length} 종목의 기준 시점 데이터 조회 중...`);
      return h;
    });

    const rows = buildHistoricalCompareRows(top30, historicalList).sort((a, b) =>
      isUp
        ? (b.priceChangePct ?? -Infinity) - (a.priceChangePct ?? -Infinity)
        : (a.priceChangePct ?? Infinity) - (b.priceChangePct ?? Infinity)
    );

    const successCount = rows.length;
    const failCount = top30.length - successCount;
    const refDateStr = rows[0] ? rows[0].asOfDate.toLocaleDateString("ko-KR") : "";
    setStatus(`완료 (기준일 ${refDateStr}) — S&P500 중 ${rankLabel} 상위 50개 중 ${successCount}개 비교 성공${failCount ? `, ${failCount}개는 조회 실패로 제외` : ""}`);

    if (rows.length === 0) {
      historicalResults.innerHTML = `<p class="muted">데이터를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }

    historicalResults.innerHTML = historicalTableHtml(rows, `${rankLabel}<br>순위`);
  } catch (err) {
    setStatus(`❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`);
  } finally {
    btn.disabled = false;
  }
}

historicalFullUpBtn.addEventListener("click", () => runHistoricalAnalysis("up"));
historicalFullDownBtn.addEventListener("click", () => runHistoricalAnalysis("down"));

// 과거분석 탭 기본 퀵뷰: 고정 10종목만 현재가+과거 스냅샷을 비교(전체 500종목 스크리닝 없이 빠르게)
const HISTORICAL_QUICK_TICKERS = ["NVDA", "AAPL", "GOOGL", "MSFT", "AMZN", "AVGO", "META", "JPM", "ORCL", "TSLA"];
async function runHistoricalQuick() {
  historicalStatus.style.display = "block";
  historicalStatus.textContent = `주요 10종목 분석 중...`;

  try {
    const sp500PairsPromise = yahooChart("^GSPC", "2y").then(chartClosePairs);
    const [tickerMetricsList, historicalList] = await Promise.all([
      mapWithConcurrency(HISTORICAL_QUICK_TICKERS, 5, getFullMetrics),
      mapWithConcurrency(HISTORICAL_QUICK_TICKERS, 3, (symbol) => getHistoricalCompareMetrics(symbol, sp500PairsPromise)),
    ]);

    const validIndices = tickerMetricsList.map((m, i) => (m ? i : null)).filter((i) => i !== null);
    const validMetrics = validIndices.map((i) => tickerMetricsList[i]);
    const validHistorical = validIndices.map((i) => historicalList[i]);
    const rows = buildHistoricalCompareRows(validMetrics, validHistorical).sort(
      (a, b) => (b.priceChangePct ?? -Infinity) - (a.priceChangePct ?? -Infinity)
    );

    if (rows.length === 0) {
      historicalStatus.textContent = "❌ 데이터를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.";
      return;
    }

    const refDateStr = rows[0].asOfDate.toLocaleDateString("ko-KR");
    historicalStatus.textContent = `주요 10종목 비교 (기준일 ${refDateStr}) — 더 많은 종목은 아래 버튼으로 전체 분석하세요`;
    historicalResults.innerHTML = historicalTableHtml(rows, "순위");
  } catch (err) {
    historicalStatus.textContent = `❌ ${err.message || "과거분석 데이터를 가져오지 못했습니다."}`;
  }
}

// 티커/현재가(+등락률)/상승압력/투자안정 5열 표 — 인기종목·급등주·급락주가 공유하는 렌더러
function moversTableHtml(scored, rankNote) {
  const scoreClass = (score) => (score === null ? "" : score > 5 ? "delta-up" : score < 5 ? "delta-down" : "");

  const rows = scored
    .map((r, i) => {
      const changeClass = r.changePct >= 0 ? "delta-up" : "delta-down";
      return `
      <tr>
        <td>${i + 1}${surgeWarningEmoji(r.fiveDayExtremes)}</td>
        <td><span class="ticker-cell">${tickerLogoHtml(r.symbol)}<b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></span><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>${priceChartLink(r.symbol, "$" + r.price.toFixed(2))}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.changePct)})</span></td>
        <td class="${r.isIPO ? "" : scoreClass(r.attractiveness)}"><b>${scoreCellText(r.attractiveness, r.isIPO)}</b></td>
        <td class="${r.isIPO ? "" : scoreClass(r.risk)}"><b>${scoreCellText(r.risk, r.isIPO)}</b></td>
      </tr>`;
    })
    .join("");

  return `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${rankNote} 상승압력·투자안정은 각 10점 만점(5점보다 높으면 초록·낮으면 빨강)이며 투자 자문이 아닙니다.</p>
      ${SURGE_WARNING_LEGEND}
      <div class="popular-table-wrap">
        <table class="top30-table popular-table">
          <thead>
            <tr><th>순위</th><th>티커</th><th>현재가</th><th>상승<br>압력</th><th>투자<br>안정</th></tr>
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
    if (pending.length > 0) {
      statusEl.style.display = "block";
      statusEl.textContent = "상승압력도 · 투자 안정성 점수를 계산하는 중...";
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
  resultsEl._loadMore = (count) => scoreUpTo(count);
  if (!resultsEl.dataset.moreBound) {
    resultsEl.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".load-more-btn");
      if (!moreBtn) return;
      moreBtn.disabled = true;
      moreBtn.textContent = "불러오는 중...";
      resultsEl._loadMore(Number(moreBtn.dataset.nextCount));
    });
    resultsEl.dataset.moreBound = "1";
  }

  await scoreUpTo(initialCount);
}

// ---------- 지수: 환율·주요 지수·원자재·가상자산·국채를 이미지 스타일 카드로 표시 ----------
// 레이아웃: 왼쪽 = 종목명 + (날짜 | 티커), 오른쪽 = 가격 + 변동량(퍼센트). 색상은 한국식(상승=빨강, 하락=파랑)
// src="yahoo"는 야후 차트(전일 종가 대비), src="fred"는 FRED 최신 발표치(전 영업일 대비)
// vSuffix: 가격 뒤 단위 / cSuffix: 변동량 뒤 단위(미지정 시 vSuffix 사용)
// chartSymbol: 클릭 시 TradingView 차트 모달에 넘길 심볼(야후 티커와 표기가 달라 별도 매핑 필요) — 없으면(null) 클릭 비활성
const INDEX_LIST = [
  { src: "yahoo", symbol: "KRW=X", name: "🇰🇷 달러/원 환율", ticker: "USD/KRW", chartSymbol: "FX:USDKRW" },
  { src: "yahoo", symbol: "JPY=X", name: "🇯🇵 달러/엔 환율", ticker: "USD/JPY", chartSymbol: "FX:USDJPY" },
  { src: "yahoo", symbol: "^GSPC", name: "🇺🇸 S&P 500", ticker: "SPX", chartSymbol: "SP:SPX" },
  { src: "yahoo", symbol: "^NDX", name: "🇺🇸 US Tech 100", ticker: "NDX", chartSymbol: "NASDAQ:NDX" },
  { src: "yahoo", symbol: "^DJI", name: "🇺🇸 다우 종합", ticker: "DJI", chartSymbol: "DJ:DJI" },
  { src: "yahoo", symbol: "^IXIC", name: "🇺🇸 나스닥 종합", ticker: "IXIC", chartSymbol: "NASDAQ:IXIC" },
  { src: "yahoo", symbol: "^RUT", name: "🇺🇸 러셀 2000", ticker: "RUT", chartSymbol: "TVC:RUT" },
  { src: "yahoo", symbol: "^VIX", name: "🇺🇸 S&P500 VIX", ticker: "VIX", chartSymbol: "TVC:VIX" },
  { src: "yahoo", symbol: "^KS11", name: "🇰🇷 코스피", ticker: "KOSPI", chartSymbol: "KRX:KOSPI" },
  { src: "yahoo", symbol: "^KQ11", name: "🇰🇷 코스닥", ticker: "KOSDAQ", chartSymbol: "KRX:KOSDAQ" },
  { src: "yahoo", symbol: "^N225", name: "🇯🇵 닛케이 225", ticker: "JP225", chartSymbol: "TVC:NI225" },
  { src: "yahoo", symbol: "^HSI", name: "🇭🇰 홍콩 항셍", ticker: "HSI", chartSymbol: "TVC:HSI" },
  { src: "yahoo", symbol: "XIN9.FGI", name: "🇨🇳 차이나 A50", ticker: "CHINA50", chartSymbol: "TVC:CN50" },
  { src: "yahoo", symbol: "BTC-USD", name: "₿ 비트코인", ticker: "BTC", chartSymbol: "COINBASE:BTCUSD" },
  { src: "yahoo", symbol: "ETH-USD", name: "Ξ 이더리움", ticker: "ETH", chartSymbol: "COINBASE:ETHUSD" },
  { src: "yahoo", symbol: "GC=F", name: "🥇 금(Gold)", ticker: "GOLD", chartSymbol: "TVC:GOLD" },
  { src: "yahoo", symbol: "SI=F", name: "🥈 은(Silver)", ticker: "SILVER", chartSymbol: "TVC:SILVER" },
  { src: "yahoo", symbol: "CL=F", name: "🛢️ WTI 원유", ticker: "WTI", chartSymbol: "TVC:USOIL" },
  { src: "yahoo", symbol: "BZ=F", name: "🛢️ 브렌트유", ticker: "BRENT", chartSymbol: "TVC:UKOIL" },
  { src: "fred", symbol: "T10Y2Y", name: "🇺🇸 장단기 금리차(10Y-2Y)", ticker: "T10Y2Y", vSuffix: "%p", cSuffix: "%p", chartSymbol: null },
  { src: "fred", symbol: "DGS2", name: "🇺🇸 미국 2년물 국채", ticker: "US2Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US02Y" },
  { src: "fred", symbol: "DGS10", name: "🇺🇸 미국 10년물 국채", ticker: "US10Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US10Y" },
  { src: "fred", symbol: "DGS30", name: "🇺🇸 미국 30년물 국채", ticker: "US30Y", vSuffix: "%", cSuffix: "%p", chartSymbol: "TVC:US30Y" },
];

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

// 지수 카드 1행 HTML — 이미지 스타일(왼쪽 종목/날짜/티커, 오른쪽 가격/변동량(퍼센트))
// chartSymbol이 있는 종목은 클릭 시 기존 TradingView 차트 모달이 열리도록 price-chart-link 델리게이션에 태움
function indexRowHtml(item, snap) {
  const num = (n, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateStr = snap && snap.date ? `${String(snap.date.getMonth() + 1).padStart(2, "0")}/${String(snap.date.getDate()).padStart(2, "0")}` : "";
  const sub = `${dateStr ? `<span class="idx-clock">🕐 ${dateStr}</span> | ` : ""}<span class="idx-ticker">${escapeHtml(item.ticker)}</span>`;
  const clickable = !!item.chartSymbol;
  const rowClass = `idx-row${clickable ? " price-chart-link idx-row-clickable" : ""}`;
  const rowAttrs = clickable ? ` data-chart-symbol="${escapeHtml(item.chartSymbol)}" role="button" tabindex="0"` : "";

  if (!snap || snap.price === null || snap.price === undefined) {
    return `<div class="${rowClass}"${rowAttrs}><div class="idx-left"><div class="idx-name">${escapeHtml(item.name)}</div><div class="idx-sub">${sub}</div></div><div class="idx-right"><div class="idx-price">N/A</div></div></div>`;
  }

  const vSuffix = item.vSuffix || "";
  const cSuffix = item.cSuffix || vSuffix;
  const priceStr = num(snap.price) + vSuffix;
  const sign = (n) => (n >= 0 ? "+" : "");
  let deltaStr = "";
  let cls = "";
  if (snap.change !== null && snap.change !== undefined) {
    cls = snap.change >= 0 ? "delta-up" : "delta-down"; // 초록=상승, 빨강=하락(앱 공통 색상)
    deltaStr = `${sign(snap.change)}${num(snap.change)}${cSuffix}`;
    // 스프레드(0 부근) 등에서 퍼센트가 비정상적으로 커지면 생략
    if (snap.changePct !== null && snap.changePct !== undefined && Number.isFinite(snap.changePct) && Math.abs(snap.changePct) < 1000) {
      deltaStr += ` (${sign(snap.changePct)}${snap.changePct.toFixed(2)}%)`;
    }
  }

  return `
    <div class="${rowClass}"${rowAttrs}>
      <div class="idx-left">
        <div class="idx-name">${escapeHtml(item.name)}</div>
        <div class="idx-sub">${sub}</div>
      </div>
      <div class="idx-right">
        <div class="idx-price">${priceStr}</div>
        <div class="idx-delta ${cls}">${deltaStr}</div>
      </div>
    </div>`;
}

async function runIndexTab() {
  indexStatus.style.display = "block";
  indexStatus.textContent = "지수 데이터를 불러오는 중...";

  try {
    const snaps = await mapWithConcurrency(INDEX_LIST, 6, async (item) => {
      try {
        if (item.src === "fred") {
          return fredSnapshot(await fetchFredSeries(item.symbol));
        }
        return yahooSnapshot(await yahooChart(item.symbol, "5d", "1d"));
      } catch {
        return null;
      }
    });

    const rows = INDEX_LIST.map((item, i) => indexRowHtml(item, snaps[i])).join("");

    indexStatus.style.display = "none";
    indexResults.innerHTML = `
      <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 환율·지수·원자재·가상자산은 전일 종가 대비, 국채·금리차는 FRED 최신치(전 영업일 대비) 기준이며 상승은 초록·하락은 빨강입니다.</p>
      <div class="idx-list">${rows}</div>
    `;
  } catch (err) {
    indexStatus.textContent = `❌ ${err.message || "지수 데이터를 가져오지 못했습니다."}`;
  }
}
el("indexRefreshBtn").addEventListener("click", () => runIndexTab());

// ---------- 지수 자동 갱신: 지수 탭이 활성화되어 있는 동안만 주기적으로 새로고침 ----------
// 0.5초 간격은 무료 CORS 프록시·FRED에 초당 수십 건의 요청을 보내는 셈이라 곧바로 차단(429/520)당해
// 오히려 "채권이 업데이트 안 됨" 증상을 더 악화시킴 — 대신 20초마다 갱신해 체감상 실시간에 가깝게 유지하면서도
// 화면이 백그라운드에 있을 땐(document.hidden) 요청을 건너뛰어 불필요한 트래픽을 줄임.
// 이 주기 동안 어쩌다 한 번 FRED 요청이 실패해도(520 등) 다음 주기에 자동으로 다시 시도되므로
// "채권 값이 그대로 멈춰 있는" 문제도 자연스럽게 해소됨.
const INDEX_AUTO_REFRESH_MS = 20000;
// var를 씀(let/const 아님) — 이 파일 맨 앞쪽 initApp()이 페이지 로딩 초반에 곧바로 switchTab(0)을 호출하는데,
// 그 안에서 stopIndexAutoRefresh()가 이 변수를 즉시 참조하므로, 아직 이 줄까지 실행되지 않은 시점에도
// TDZ(Temporal Dead Zone) 에러 없이 안전하게 접근되도록 var로 선언(var는 스크립트 시작 시 즉시 undefined로 호이스팅됨)
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

// ---------- 인기종목: 당일 거래대금(가격 × 거래량) 상위 20개, 접속 시 10개만 먼저 표시 ----------
async function runPopular() {
  popularResults.innerHTML = "";
  popularStatus.style.display = "block";
  popularStatus.textContent = "인기종목을 불러오는 중...";

  try {
    const marketReturnsPromise = getMarketReturns();
    const data = await yahooMostActive(50);
    const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];

    if (quotes.length === 0) {
      throw new Error("인기종목 데이터를 가져오지 못했습니다.");
    }

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
      statusEl: popularStatus,
      resultsEl: popularResults,
      rankNote: "순위는 당일 거래대금(거래량 × 현재가 추정) 기준입니다.",
      initialCount: 10,
      fullCount: 20,
    });
  } catch (err) {
    popularStatus.textContent = `❌ ${err.message || "인기종목을 가져오지 못했습니다."}`;
  }
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
  const label = direction === "surge" ? "급등주" : "급락주";
  setTrendActive(direction === "surge" ? trendButtons.surge : trendButtons.plunge);
  trendResults.innerHTML = "";
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

// ---------- 거래량: 인기종목(당일 거래대금 상위)과 동일한 데이터·로직을 추세평가 탭에도 표시 ----------
async function runTrendVolume() {
  setTrendActive(trendButtons.volume);
  trendResults.innerHTML = "";
  trendStatus.style.display = "block";
  trendStatus.textContent = "거래량을 불러오는 중...";

  try {
    const marketReturnsPromise = getMarketReturns();
    const data = await yahooMostActive(50);
    const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
    if (quotes.length === 0) throw new Error("거래량 데이터를 가져오지 못했습니다.");

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
    trendStatus.textContent = `❌ ${err.message || "거래량 데이터를 가져오지 못했습니다."}`;
  }
}

// ---------- 상승압력: S&P500 전 종목 중 상승압력도 점수가 높은 순(가치평가 탭과 같은 방식의 정렬+더보기 렌더러 재사용) ----------
async function runTrendPressure() {
  setTrendActive(trendButtons.pressure);
  trendStatus.style.display = "block";
  trendStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500PriorityOrder().catch((e) => {
    trendStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;

  await renderValueRanking(allTickers, "상승압력", {
    statusEl: trendStatus,
    resultsEl: trendResults,
    buttons: [trendButtons.pressure],
    mapFn: (list) => list.map((m) => ({ ...m, attractivenessTotal: computeAttractivenessScore(m).total, isIPO: isRecentIPO(m.firstTradeDate) })),
    sortFn: (a, b) => b.attractivenessTotal - a.attractivenessTotal,
    metricHeaderHtml: "상승압력도 점수",
    metricCellFn: (r) => (r.isIPO ? "IPO" : `<b>${r.attractivenessTotal}/10</b>`),
    noteHtml: `<p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> 상승압력도 점수(10점 만점, 높을수록 단기 상승 여력 참고치가 큼)는 거래대금·모멘텀·매출 성장성을 종합한 참고용 지표이며 투자 자문이 아닙니다.</p>`,
  });
}

// ---------- 한국보유 비중: 한국예탁결제원(SEIBro) 종목별 외화증권 보관 현황 API 연동 필요 — API 키 발급 전까지 준비중 안내만 표시 ----------
function runTrendKorea() {
  setTrendActive(trendButtons.korea);
  trendResults.innerHTML = "";
  trendStatus.style.display = "";
  trendStatus.textContent =
    "🚧 한국보유 비중 데이터는 준비 중입니다. 한국예탁결제원(SEIBro) 오픈API 연동이 필요하며, API 키 발급 후 제공될 예정입니다.";
}

bindTrend(trendButtons.korea, runTrendKorea);
bindTrend(trendButtons.volume, runTrendVolume);
bindTrend(trendButtons.plunge, () => runMovers("plunge"));
bindTrend(trendButtons.surge, () => runMovers("surge"));
bindTrend(trendButtons.pressure, runTrendPressure);

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
  const yearsNote = data.historicalBuckets.length
    ? `흰색: 과거 ${data.historicalBuckets.length}개년(전후 6개월) 계절성 흐름 · `
    : `과거 데이터가 부족해 계절성 비교 없이 최근 추세만 표시했습니다 · `;
  const baseNote = `${data.ticker} · ${yearsNote}빨간 실선: 최근 6개월 실제 흐름 · 빨간 점선: ${data.hasForwardData ? "과거 흐름의 평균 기울기로 추정한 " : ""}향후 6개월 예상(참고용, 실제와 다를 수 있습니다)`;
  let forecastNote = "";
  if (data.currentPrice && data.forecast.price) {
    const pctFromToday = (data.forecast.price / data.currentPrice - 1) * 100;
    forecastNote = ` · <span style="color:var(--warn);font-weight:700;">6개월 후 예상 변동량: ${pctFromToday >= 0 ? "+" : ""}${pctFromToday.toFixed(1)}%</span>`;
  }
  el("futureChartCaption").innerHTML = `${escapeHtml(baseNote)}${forecastNote}`;
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

  const svg = `<svg viewBox="0 0 ${W} ${svgH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="투자안정성 ${bucket}~${bucket + 1}점 구간 1년 수익률 예측">
    <rect x="0" y="0" width="${W}" height="${svgH}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${historySvg}
    ${fanSvg}
  </svg>`;

  return { svg, forecastPctFromToday, forecastPrice };
}

// ---------- 미래예측 3번째 그래프: 거시경제 점수별 S&P500 30년 추이 ----------
// 검색한 종목과 무관한 시장 전체 데이터라 세션 내에서 한 번만 계산해 캐시(여러 번 검색해도 재요청하지 않음)
let macroScoreChartDataPromise = null;

// FRED 시계열([date, value] 배열)에서 목표 날짜와 가장 가까운 관측치 하나를 찾음(getMacroMetrics의 "최신값 찾기"를 임의 과거 시점으로 일반화)
function closestFredPoint(points, targetDate) {
  const targetTime = targetDate.getTime();
  let closest = points[0];
  let minDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(new Date(p[0]).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

// computeMacroScore와 동일한 공식을, "지금"이 아니라 임의 과거 시점 기준으로 계산 — M2 YoY·금리차 모두 그 시점에 가장 가까운 FRED 관측치를 사용
// 점수(total)뿐 아니라 원본 지표(m2Yoy, spread)도 그대로 반환 — 차트에는 점수 대신 이 두 원본 값을 라벨로 표시
function computeMacroScoreAtDate(m2Points, curvePoints, date) {
  const m2Now = closestFredPoint(m2Points, date);
  const yearAgo = new Date(date);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const m2YearAgo = closestFredPoint(m2Points, yearAgo);
  const m2Yoy = m2YearAgo[1] ? ((m2Now[1] - m2YearAgo[1]) / m2YearAgo[1]) * 100 : null;
  const spreadPoint = closestFredPoint(curvePoints, date);
  const spread = spreadPoint[1];
  return { ...computeMacroScore({ m2Yoy, spread }), m2Yoy, spread };
}

async function computeMacroScoreChartData() {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const startYear = now.getFullYear() - 30;
  const startSec = Math.floor(new Date(startYear, 0, 1).getTime() / 1000);

  const [chartData, m2Points, curvePoints, liveMacro] = await Promise.all([
    yahooChartRange("^GSPC", startSec, nowSec, "1wk"),
    fetchFredSeries("M2SL"),
    fetchFredSeries("T10Y2Y"),
    getMacroMetrics(),
  ]);
  const pairs = chartClosePairs(chartData);
  if (pairs.length < 2) throw new Error("S&P500 장기 데이터를 가져오지 못했습니다.");

  // 6개월 간격(2월 1일/8월 1일)으로 30년치 — 시작 연도는 오늘 기준으로 매번 다시 계산되므로 시간이 지나도 항상 최근 30년을 가리킴
  // 라벨은 점수 대신 원본 지표 두 줄(윗줄: 장단기금리차, 아랫줄: M2 통화량 YoY %)로 표시
  const points = [];
  for (let anchor = new Date(startYear, 1, 1); anchor < now; anchor = addMonths(anchor, 6)) {
    const anchorSec = Math.floor(anchor.getTime() / 1000);
    const pricePoint = closestPair(pairs, anchorSec);
    if (!pricePoint || Math.abs(pricePoint.t - anchorSec) > 20 * 24 * 3600) continue; // 그 시점 데이터가 없으면(상장 전 등) 건너뜀
    const m = computeMacroScoreAtDate(m2Points, curvePoints, anchor);
    points.push({ t: pricePoint.t, price: pricePoint.c, score: m.total, spread: m.spread, m2Yoy: m.m2Yoy, isNow: false });
  }
  // 마지막은 "지금" 실시간 점수 — 매달 1일 기준으로 다시 볼 때마다 최신 M2·금리차가 반영되므로 항상 현재 시점을 정확히 대표함
  const last = pairs[pairs.length - 1];
  const liveScore = computeMacroScore(liveMacro);
  points.push({ t: last.t, price: last.c, score: liveScore.total, spread: liveMacro.spread, m2Yoy: liveMacro.m2Yoy, isNow: true });

  // 각 점 시점부터 다음 6개월 구간 동안 S&P500이 20% 이상 급락했는지 표시(라벨을 노란색으로 강조)
  for (let i = 0; i < points.length - 1; i++) {
    const pct = (points[i + 1].price / points[i].price - 1) * 100;
    points[i].crashWarn = pct <= -20;
  }

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

function buildMacroScoreChartSvg({ pairs, points }) {
  const W = 780,
    H = 420;
  const ML = 56,
    MR = 20,
    MT = 26,
    MB = 40;
  const PW = W - ML - MR;
  const PH = H - MT - MB;

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

  // x축: 5년 단위로 연도 라벨(30년치를 1년 단위로 다 넣으면 서로 겹쳐서 5년 단위로 성기게 표시)
  let axisSvg = "";
  const firstYear = new Date(minT * 1000).getFullYear();
  const lastYear = new Date(maxT * 1000).getFullYear();
  for (let y = Math.ceil(firstYear / 5) * 5; y <= lastYear; y += 5) {
    const t = Math.floor(new Date(y, 0, 1).getTime() / 1000);
    if (t < minT || t > maxT) continue;
    const x = xFn(t);
    axisSvg += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + PH}" stroke="#1a1d24" stroke-width="1" />`;
    axisSvg += `<text x="${x.toFixed(1)}" y="${(MT + PH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8a90a3">${y}</text>`;
  }

  const linePath = pairs.map((p, i) => `${i === 0 ? "M" : "L"}${xFn(p.t).toFixed(1)},${yFn(p.c).toFixed(1)}`).join(" ");
  let linesSvg = `<path d="${linePath}" fill="none" stroke="#e5342f" stroke-width="1.8" stroke-linejoin="round" />`;

  // 점(그 시점의 거시경제 점수)은 빨간 선 위(그 날짜의 S&P 실제 값 높이)에 정확히 얹어서 찍음 — 8~10점 구간은(지금 점도 포함) 주황,
  // 그 외 과거 점은 흰색. 라벨은 점수 대신 원본 지표 두 줄(윗줄: 장단기금리차, 아랫줄: M2 통화량 YoY %)로 표시하고,
  // 위/아래를 번갈아 배치해 6개월 간격(약 60개)이 서로 덜 겹치게 함
  points.forEach((p, i) => {
    const x = xFn(p.t);
    const y = yFn(p.price);
    const isHigh = p.isNow || p.score >= 8;
    const dotColor = isHigh ? "#f5a623" : "#eceef2";
    const textColor = p.crashWarn ? "#f5d90a" : dotColor;
    const r = p.isNow ? 4.2 : 2.6;
    linesSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dotColor}" stroke="#000" stroke-width="1" />`;
    const spreadTxt = p.spread !== null && p.spread !== undefined ? `${p.spread >= 0 ? "+" : ""}${p.spread.toFixed(2)}%p` : "N/A";
    const m2Txt = p.m2Yoy !== null && p.m2Yoy !== undefined ? `${p.m2Yoy >= 0 ? "+" : ""}${p.m2Yoy.toFixed(1)}%` : "N/A";
    const fontSize = p.isNow ? 10 : 7.5;
    const rowH = p.isNow ? 12 : 9;
    const above = p.isNow || i % 2 === 0;
    let spreadY, m2Y;
    if (above) {
      m2Y = y - 6;
      spreadY = m2Y - rowH;
    } else {
      spreadY = y + rowH;
      m2Y = spreadY + rowH;
    }
    linesSvg += `<text x="${x.toFixed(1)}" y="${spreadY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${textColor}">${spreadTxt}</text>`;
    linesSvg += `<text x="${x.toFixed(1)}" y="${m2Y.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${textColor}">${m2Txt}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="거시경제 점수별 S&P500 30년 추이">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#000" />
    ${gridSvg}
    ${axisSvg}
    ${linesSvg}
  </svg>`;
}

let macroScoreChartRendered = false;
async function renderMacroScoreChart() {
  if (macroScoreChartRendered) return; // 검색할 때마다 다시 그릴 필요 없는 시장 전체 데이터라 최초 1회만 렌더링
  const container = el("futureMacroChartContainer");
  const caption = el("futureMacroChartCaption");
  container.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">S&amp;P500 30년 데이터를 불러오는 중...</p>`;
  try {
    const data = await getMacroScoreChartData();
    container.innerHTML = buildMacroScoreChartSvg(data);
    macroScoreChartRendered = true;
    caption.textContent =
      "빨간 선: S&P500 지수(1996~현재, 주간 종가) · 점 라벨: 6개월 간격(2월/8월 1일 기준) 윗줄 장단기금리차(10Y-2Y)·아랫줄 M2 통화량 YoY % · " +
      "주황 점: 거시경제 점수 8~10점 구간(현재 포함), 흰 점: 그 외 · 노란 글씨: 그 시점 이후 6개월간 20% 이상 급락(참고용, 투자 자문이 아닙니다)";
  } catch (err) {
    container.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ S&amp;P500 장기 데이터를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
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
    const [metrics, marketReturns, macroMetrics] = await Promise.all([
      metricsPromise,
      marketReturnsPromise,
      getMacroMetrics().catch(() => ({ m2Yoy: null, spread: null })),
    ]);
    const attractiveness = computeAttractivenessScore(metrics);
    const risk = computeRiskScore(metrics, marketReturns.sp500Return);
    const macro = computeMacroScore(macroMetrics);
    const isIPO = isRecentIPO(metrics.firstTradeDate);
    const scoresEl = el("futureModalScores");
    if (scoresEl) {
      scoresEl.innerHTML = `
        <span class="mini-score-circle small" title="상승압력도">${isIPO ? "IPO" : attractiveness.total}</span>
        <span class="mini-score-circle small risk" title="투자안정성">${isIPO ? "IPO" : risk.total}</span>
        <span class="mini-score-circle small macro" title="거시경제">${macro.total}</span>
      `;
    }
  } catch {
    // 점수 계산이 실패해도 로고·이름·티커는 그대로 유지
  }
}

async function renderFutureRiskSection(ticker, metricsPromise, marketReturnsPromise, futureData) {
  const riskContainer = el("futureRiskContainer");
  const riskCaption = el("futureRiskCaption");
  riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">투자안정성 구간별 통계를 불러오는 중...</p>`;
  riskCaption.textContent = "";

  try {
    const [metrics, marketReturns] = await Promise.all([metricsPromise, marketReturnsPromise]);
    const riskScore = computeRiskScore(metrics, marketReturns.sp500Return);
    const bucket = clamp(Math.floor(riskScore.total), 0, 9);
    const { history } = await fetchFutureRiskBands(bucket);

    if (!history || history.length === 0) {
      riskContainer.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0;">🚧 이 구간(투자안정성 ${bucket}~${bucket + 1}점)의 월별 통계가 아직 쌓이지 않았습니다. 서버가 매달 말일에 자동으로 갱신하며, 데이터가 쌓이는 대로 이 자리에 표시됩니다.</p>`;
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
    const last = history[history.length - 1];
    const baseNote =
      `${ticker}는 투자안정성 ${bucket}~${bucket + 1}점 구간(최근 집계 ${last.sampleSize}종목 표본) · 빨간 실선: ${ticker}의 최근 6개월 실제 흐름(위 차트와 동일) · ` +
      `초록: 가장 높은 수익률대, 파랑: 가장 낮은 수익률대, 흰색(진할수록 비중 큼): 그 사이 구간별 종목 수`;
    if (forecastPctFromToday === null) {
      riskCaption.innerHTML = `${escapeHtml(baseNote)} · <span style="color:var(--warn);font-weight:700;">0~1점 구간은 표본 편차가 너무 커서 1년 후 예상을 생략합니다.</span>`;
    } else {
      const pctSign = forecastPctFromToday >= 0 ? "+" : "";
      riskCaption.innerHTML =
        `${escapeHtml(baseNote)} · 빨간 점선 "예상": 이 구간에서 가장 많이 몰린 수익률대로 향하는 1년 후 예상(참고용, 투자 자문이 아닙니다) · ` +
        `<span style="color:var(--warn);font-weight:700;">1년 후 예상 변동량: ${pctSign}${forecastPctFromToday.toFixed(1)}%</span>`;
    }
  } catch (err) {
    riskContainer.innerHTML = `<p class="error-inline" style="text-align:center;padding:20px 0;">❌ 구간별 통계를 불러오지 못했습니다: ${escapeHtml(err.message || "")}</p>`;
  }
}

async function runFuturePrediction() {
  if (!futureTickerInput.value.trim()) {
    setFutureStatus("error", "❌ 예측할 기업의 티커나 한글 회사명을 입력해주세요. (예: AAPL, 애플)");
    return;
  }
  const ticker = resolveKoreanTicker(futureTickerInput.value);
  futureAnalyzeBtn.disabled = true;
  setFutureStatus("loading", `${ticker} 데이터를 불러오는 중입니다...`);

  try {
    const searchData = await yahooSearch(ticker);
    const quote = searchData && searchData.quotes && searchData.quotes[0];
    if (!quote) {
      throw new Error(`'${ticker}' 티커를 찾을 수 없습니다. 정확한 미국 상장 티커인지 확인해주세요.`);
    }
    const data = await computeFuturePrediction(ticker);
    renderFutureChart(data);

    // 상단 틀고정 헤더(로고·이름·점수)와 2번째 그래프가 같은 지표(상승압력도/투자안정성)를 쓰므로 fetch를 한 번만 공유
    const metricsPromise = getFullMetrics(ticker);
    const marketReturnsPromise = getMarketReturns();
    renderFutureModalHeader(ticker, quote, metricsPromise, marketReturnsPromise);
    renderFutureRiskSection(ticker, metricsPromise, marketReturnsPromise, data); // 실패해도 1번째 그래프는 그대로 유지
    renderMacroScoreChart(); // 종목과 무관한 시장 전체 차트라 최초 1회만 그리고 이후 검색부터는 캐시된 결과를 재사용
    setFutureStatus(null, null);
  } catch (err) {
    setFutureStatus("error", `❌ ${escapeHtml(err.message || "예측 차트를 불러오지 못했습니다.")}`);
  } finally {
    futureAnalyzeBtn.disabled = false;
  }
}
futureAnalyzeBtn.addEventListener("click", runFuturePrediction);
futureTickerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runFuturePrediction();
});
