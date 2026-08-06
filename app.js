// ===== 미국 기업 분석기 (API 키 불필요 버전) =====
// 데이터 소스: Yahoo Finance 비공식 엔드포인트(공개 CORS 프록시 경유) + Wikipedia(공식 CORS 지원)
// 주의: 비공식 API이므로 언제든 응답 형식이 바뀌거나 차단될 수 있습니다.

const el = (id) => document.getElementById(id);

const tickerInput = el("tickerInput");
const analyzeBtn = el("analyzeBtn");
const statusBox = el("statusBox");
const resultsView = el("resultsView");
const backHomeBtn = el("backHomeBtn");
const results = el("results");
const fixedHeader = el("fixedHeader");
const loadingSplash = el("loadingSplash");
const rankedStatus = el("rankedStatus");
const rankedResults = el("rankedResults");
const popularStatus = el("popularStatus");
const popularResults = el("popularResults");
const moversStatus = el("moversStatus");
const moversResults = el("moversResults");
const contactBtn = el("contactBtn");
const chatPanel = el("chatPanel");
const chatMessagesEl = el("chatMessages");
const chatTickerInput = el("chatTickerInput");
const chatTickerSuggest = el("chatTickerSuggest");
const chatPriceInput = el("chatPriceInput");
const chatBuyBtn = el("chatBuyBtn");
const chatSellBtn = el("chatSellBtn");
const chatSendBtn = el("chatSendBtn");
const chatError = el("chatError");
const chatCloseBtn = el("chatCloseBtn");

// ---------- 실시간 채팅(익명, 24시간 보관, 종목/평단가/매수·매도 고정 형식만 등록 가능) ----------
const CHAT_API = "https://us-stock.yeop2ad.workers.dev/chat";
const CHAT_POLL_MS = 4000;
const TICKER_PATTERN = /^[A-Z]{1,6}(\.[A-Z]{1,2})?$/;
const PRICE_PATTERN = /^\d{1,5}(\.\d{1,2})?$/;
let chatPollTimer = null;
let lastChatMessageCount = -1;
let chatSelectedSide = null;
let tickerSuggestTimer = null;

function fmtChatTime(t) {
  return new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function renderChatMessages(messages) {
  if (messages.length === 0) {
    chatMessagesEl.innerHTML = `<p class="muted chat-empty">아직 등록된 글이 없습니다. 첫 글을 남겨보세요.</p>`;
    return;
  }
  chatMessagesEl.innerHTML = messages
    .map((m) => {
      const sideLabel = m.side === "buy" ? "매수" : "매도";
      const sideClass = m.side === "buy" ? "good" : "bad";
      return `
      <div class="chat-msg">
        <span class="chat-time">${escapeHtml(fmtChatTime(m.t))}</span>
        <b class="chat-ticker">${escapeHtml(m.ticker)}</b>
        <span class="chat-text">평단가 $${escapeHtml(m.price)}</span>
        <span class="chat-side ${sideClass}">${sideLabel}</span>
      </div>`;
    })
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

function setChatSide(side) {
  chatSelectedSide = side;
  chatBuyBtn.classList.toggle("active", side === "buy");
  chatSellBtn.classList.toggle("active", side === "sell");
}

function hideTickerSuggest() {
  chatTickerSuggest.style.display = "none";
  chatTickerSuggest.innerHTML = "";
}

async function handleTickerInput() {
  const q = chatTickerInput.value.trim();
  if (tickerSuggestTimer) clearTimeout(tickerSuggestTimer);
  if (q.length < 1) {
    hideTickerSuggest();
    return;
  }
  tickerSuggestTimer = setTimeout(async () => {
    try {
      const data = await yahooSearch(q);
      const quotes = ((data && data.quotes) || []).filter((qt) => qt.symbol).slice(0, 6);
      if (quotes.length === 0) {
        hideTickerSuggest();
        return;
      }
      chatTickerSuggest.innerHTML = quotes
        .map(
          (qt) =>
            `<div class="chat-ticker-option" data-symbol="${escapeHtml(qt.symbol)}">
              <b>${escapeHtml(qt.symbol)}</b> <span class="muted">${escapeHtml(qt.shortname || qt.longname || "")}</span>
            </div>`
        )
        .join("");
      chatTickerSuggest.style.display = "block";
    } catch {
      hideTickerSuggest();
    }
  }, 300);
}

chatTickerSuggest.addEventListener("click", (e) => {
  const option = e.target.closest(".chat-ticker-option");
  if (!option) return;
  chatTickerInput.value = option.dataset.symbol;
  hideTickerSuggest();
});

async function sendChatPost() {
  const ticker = chatTickerInput.value.trim().toUpperCase();
  const price = chatPriceInput.value.trim();

  if (!TICKER_PATTERN.test(ticker)) {
    chatError.textContent = "종목 티커를 올바르게 입력해주세요.";
    chatError.style.display = "block";
    return;
  }
  if (!PRICE_PATTERN.test(price)) {
    chatError.textContent = "평단가는 숫자 5자 이내로 입력해주세요.";
    chatError.style.display = "block";
    return;
  }
  if (chatSelectedSide !== "buy" && chatSelectedSide !== "sell") {
    chatError.textContent = "매수/매도를 선택해주세요.";
    chatError.style.display = "block";
    return;
  }

  chatError.style.display = "none";
  chatSendBtn.disabled = true;
  try {
    const res = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, price, side: chatSelectedSide }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      chatError.textContent = data.error || "등록에 실패했습니다.";
      chatError.style.display = "block";
      return;
    }
    chatTickerInput.value = "";
    chatPriceInput.value = "";
    setChatSide(null);
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
chatTickerInput.addEventListener("input", handleTickerInput);
chatBuyBtn.addEventListener("click", () => setChatSide(chatSelectedSide === "buy" ? null : "buy"));
chatSellBtn.addEventListener("click", () => setChatSide(chatSelectedSide === "sell" ? null : "sell"));
chatSendBtn.addEventListener("click", sendChatPost);
chatPriceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatPost();
});
document.addEventListener("click", (e) => {
  if (chatPanel.style.display !== "none" && !chatPanel.contains(e.target) && e.target !== contactBtn) {
    chatPanel.style.display = "none";
    stopChatPolling();
  }
  if (!chatTickerInput.contains(e.target) && !chatTickerSuggest.contains(e.target)) {
    hideTickerSuggest();
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

async function yahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
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

// ---------- 종목별 지표 조회 + 가격 매력도 점수 계산 (사업요약/경쟁사비교/점수 섹션에서 공용으로 사용) ----------
function get1yReturnFromChart(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return null;
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  if (pairs.length < 2) return null;
  pairs.sort((a, b) => a.t - b.t);
  const oldest = pairs[0].c;
  const latest = pairs[pairs.length - 1].c;
  if (!oldest) return null;
  return ((latest - oldest) / oldest) * 100;
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
    yahooFundamentals(symbol, "annualTotalRevenue,annualBasicEPS,annualNetIncome,annualShareIssued").catch(() => null),
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
  const revenueSeries = resultArr ? await annualFundamentalSeries(resultArr, "annualTotalRevenue", meta.currency) : [];

  return {
    symbol,
    price: meta.regularMarketPrice,
    yearLow: meta.fiftyTwoWeekLow,
    yearHigh: meta.fiftyTwoWeekHigh,
    revenue,
    eps,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    revenueGrowth3y: avgRevenueGrowth3y(revenueSeries),
  };
}

// 시가총액 규모 + 52주 최고/최저 대비 위치 + PE 밸류에이션 + 매출 성장성을 조합한 참고용 가격 매력도 점수(10점 만점)
function computeAttractivenessScore(metrics) {
  const { price, yearLow, yearHigh, marketCap, netIncome, currency, revenueGrowth3y } = metrics;

  // 1) 시가총액 규모 가점 (0~2점) — 1조달러 이상이면 만점, 300억달러 이하면 0점 (선형)
  // 시가총액을 신뢰할 수 없어 N/A로 표시되는 경우(데이터 누락, ADR 등 통화 문제로 제외된 해외 상장 종목)는 0점 처리
  let marketCapScore = 0;
  if (marketCap !== undefined && marketCap !== null && (!currency || currency === "USD")) {
    marketCapScore = clamp((2 * (marketCap - 3e10)) / (1e12 - 3e10), 0, 2);
  }

  // 2) 52주 최고/최저 대비 위치 (0~4점) — 저점(0%)이면 만점, 고점(100%)이면 0점 (선형)
  let rangeScore = 2;
  let rangePosition = null;
  if (yearLow !== undefined && yearLow !== null && yearHigh !== undefined && yearHigh > yearLow && price !== undefined && price !== null) {
    rangePosition = (price - yearLow) / (yearHigh - yearLow);
    rangeScore = clamp(4 * (1 - rangePosition), 0, 4);
  }

  // 3) PE 밸류에이션 = 직전년도 시가총액 ÷ 순이익 (0~2점) — 10배 이하면 만점, 70배 이상이면 0점 (30배마다 1점, 선형)
  // 일부 해외 상장 종목은 시세는 USD인데 재무제표는 원래 보고 통화(KRW 등) 그대로 내려오는 경우가 있어
  // (예: SKHY) 시가총액(USD)÷순이익(현지통화)이 뒤섞여 PE가 1배 미만처럼 비정상적으로 작게 나올 수 있음 —
  // 정상적인 흑자 기업이 시총보다 큰 연간 순이익을 내는 경우는 사실상 없으므로 이런 값은 신뢰할 수 없다고 보고 제외
  // P/E를 신뢰할 수 없어 N/A로 표시되는 경우(순이익 데이터 누락, 비정상적으로 작은 값 등)도 0점 처리
  let peScore = 0;
  let pe = null;
  if (marketCap !== undefined && marketCap !== null && netIncome && netIncome > 0) {
    const rawPe = marketCap / netIncome;
    if (rawPe >= 1) pe = rawPe;
  }
  if (pe !== null) {
    peScore = clamp(2 - (pe - 10) / 30, 0, 2);
  }

  // 4) 매출 성장성 = 최근 3개 연도 전년 대비 매출 성장률 평균 (0~2점) — 30% 이상이면 만점, 0% 이하면 0점 (15%마다 1점, 선형)
  // 데이터가 부족해 성장률을 계산할 수 없는 경우(N/A)도 0점 처리
  let growthScore = 0;
  if (revenueGrowth3y !== undefined && revenueGrowth3y !== null) {
    growthScore = clamp(revenueGrowth3y / 15, 0, 2);
  }

  const total = Math.round(clamp(marketCapScore + rangeScore + peScore + growthScore, 0, 10) * 10) / 10;
  return { total, marketCapScore, rangeScore, peScore, pe, rangePosition, growthScore, revenueGrowth3y };
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

// fundamentals-timeseries 응답에서 특정 항목의 연도별 시계열(과거→최근 정렬, 환율 자동 환산)을 추출 — 매출 성장률처럼 여러 해 값이 필요한 계산용
async function annualFundamentalSeries(resultArr, key, quoteCurrency) {
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

// 최근 3개 연도의 전년 대비 매출 성장률 평균(%) — 최근 4개년 매출로 성장률 3개를 산출해 평균
function avgRevenueGrowth3y(revenueSeries) {
  const recent = (revenueSeries || []).slice(-4);
  const growthRates = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].value;
    const cur = recent[i].value;
    if (prev) growthRates.push(((cur - prev) / Math.abs(prev)) * 100);
  }
  if (growthRates.length === 0) return null;
  return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
}

// 가격 매력도 + 투자 위험도 점수 계산에 필요한 모든 지표를 한 번(차트 1회 + 재무제표 1회)에 조회 (TOP30 랭킹용)
async function getFullMetrics(symbol) {
  const [chartData, fundData] = await Promise.all([
    yahooChart(symbol),
    yahooFundamentals(
      symbol,
      "annualTotalRevenue,annualBasicEPS,annualTotalAssets,annualStockholdersEquity,annualNetIncome,annualShareIssued"
    ),
  ]);

  const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
  if (!result) throw new Error(`${symbol} 데이터를 가져오지 못했습니다.`);
  const meta = result.meta;

  let revenue = null;
  let eps = null;
  let totalAssets = null;
  let equity = null;
  let netIncome = null;
  let sharesOutstanding = null;
  const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
  for (const block of resultArr) {
    if (block.annualTotalRevenue) revenue = await latestFundamentalValue(block, "annualTotalRevenue", meta.currency);
    if (block.annualBasicEPS) eps = await latestFundamentalValue(block, "annualBasicEPS", meta.currency);
    if (block.annualTotalAssets) totalAssets = await latestFundamentalValue(block, "annualTotalAssets", meta.currency);
    if (block.annualStockholdersEquity)
      equity = await latestFundamentalValue(block, "annualStockholdersEquity", meta.currency);
    if (block.annualNetIncome) netIncome = await latestFundamentalValue(block, "annualNetIncome", meta.currency);
    if (block.annualShareIssued)
      sharesOutstanding = await latestFundamentalValue(block, "annualShareIssued", meta.currency, { convert: false });
  }
  // 총부채 = 총자산 - 자기자본 (매입채무·미지급금 등 이자를 내지 않는 부채까지 포함한 회계상 '표준' 부채비율 계산용.
  // 단순히 이자부담 차입금(장단기 대출/사채)만 쓰면 실제 대차대조표상 부채비율보다 크게 작게 나옴)
  const totalLiabilities = totalAssets !== null && equity !== null ? totalAssets - equity : null;
  const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;
  const revenueSeries = await annualFundamentalSeries(resultArr, "annualTotalRevenue", meta.currency);

  return {
    symbol,
    price: meta.regularMarketPrice,
    yearLow: meta.fiftyTwoWeekLow,
    yearHigh: meta.fiftyTwoWeekHigh,
    eps,
    revenue,
    totalLiabilities,
    totalAssets,
    equity,
    netIncome,
    marketCap,
    currency: meta.currency,
    oneYearReturn: get1yReturnFromChart(chartData),
    revenueGrowth3y: avgRevenueGrowth3y(revenueSeries),
  };
}

// S&P500 대비 모멘텀 + 부채비율 + 순이익률을 조합한 참고용 투자 위험도 점수(10점 만점, 높을수록 위험이 낮음)
function computeRiskScore(metrics, sp500Return) {
  const { oneYearReturn, totalLiabilities, totalAssets, netIncome, revenue } = metrics;

  // 1) S&P500 대비 모멘텀 (0~4점) — S&P500 연 수익률과의 차이(절대값)가 0%p면 만점,
  // 200%p 이상 벌어지면 0점 (50%p마다 1점 감점, 선형)
  let marketScore = 2;
  let relDiff = null;
  if (oneYearReturn !== null && sp500Return !== null && sp500Return !== undefined) {
    relDiff = Math.abs(sp500Return - oneYearReturn);
    marketScore = clamp(4 * (1 - relDiff / 200), 0, 4);
  }

  // 2) 부채비율 = 총부채(총자산-자기자본)÷총자산 (0~3점) — 0%면 만점, 100% 이상이면 0점 (선형)
  let debtScore = 1.5;
  let debtToAssets = null;
  if (totalAssets !== null && totalAssets > 0 && totalLiabilities !== null) {
    debtToAssets = totalLiabilities / totalAssets;
    debtScore = clamp(3 * (1 - debtToAssets), 0, 3);
  }

  // 3) 순이익률 = 순이익÷매출 (0~3점) — 0%는 0.5점, 10%p마다 0.5점씩 늘어 50% 이상이면 만점.
  // 적자(음수 순이익률)는 무조건 0점 처리
  let marginScore = 1.5;
  let netMargin = null;
  if (revenue !== null && revenue > 0 && netIncome !== null) {
    netMargin = netIncome / revenue;
    marginScore = netMargin < 0 ? 0 : clamp(0.5 + netMargin * 5, 0, 3);
  }

  const total = Math.round(clamp(marketScore + debtScore + marginScore, 0, 10) * 10) / 10;
  return { total, marketScore, debtScore, marginScore, relDiff, debtToAssets, netMargin };
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

// ---------- 나스닥-100 종목 목록 (위키백과, 프록시 불필요) ----------
let nasdaq100TickersPromise = null;
function getNasdaq100Tickers() {
  if (!nasdaq100TickersPromise) {
    nasdaq100TickersPromise = (async () => {
      const title = "List of NASDAQ-100 companies";
      const url =
        "https://en.wikipedia.org/w/api.php?action=parse&page=" +
        encodeURIComponent(title) +
        "&prop=wikitext&format=json&origin=*";
      const res = await fetch(url);
      const data = await res.json();
      const text = data && data.parse && data.parse.wikitext && data.parse.wikitext["*"];
      if (!text) throw new Error("나스닥-100 종목 목록을 가져오지 못했습니다.");

      const startIdx = text.indexOf("component stocks");
      const tableText = startIdx !== -1 ? text.slice(startIdx) : text;
      const symbols = [];
      // 이 표는 심볼이 템플릿이 아닌 일반 텍스트("| ABNB || [[Airbnb]] || ...")로 되어 있음
      const re = /\|-\n\| ([A-Z]{1,6}(?:\.[A-Z])?) \|\|/g;
      let m;
      while ((m = re.exec(tableText))) {
        symbols.push(m[1]);
      }
      if (symbols.length === 0) throw new Error("나스닥-100 종목 목록을 파싱하지 못했습니다.");
      return [...new Set(symbols)];
    })().catch((e) => {
      nasdaq100TickersPromise = null;
      throw e;
    });
  }
  return nasdaq100TickersPromise;
}

// ---------- 나스닥 종목군 근사 목록 ----------
// 시가총액 순 정렬 스크리너는 로그인 인증(crumb)이 필요해 무료로 접근할 수 없어서,
// 여러 활발한 종목 스크리너를 나스닥 거래소로 필터링해 합친 뒤 시가총액 내림차순으로 정렬한 근사치를 사용
let nasdaqUniversePromise = null;
function getNasdaqUniverse() {
  if (!nasdaqUniversePromise) {
    nasdaqUniversePromise = (async () => {
      const screenerIds = [
        "most_actives",
        "day_gainers",
        "day_losers",
        "growth_technology_stocks",
        "undervalued_large_caps",
        "undervalued_growth_stocks",
        "aggressive_small_caps",
        "small_cap_gainers",
      ];
      const results = await Promise.all(screenerIds.map((id) => yahooScreener(id, 100).catch(() => null)));

      const nasdaqExchanges = new Set(["NMS", "NGM", "NCM"]);
      const marketCapBySymbol = new Map();
      for (const data of results) {
        const quotes = (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
        for (const q of quotes) {
          if (!q || !q.symbol) continue;
          if (!nasdaqExchanges.has(q.exchange)) continue;
          if (!marketCapBySymbol.has(q.symbol)) {
            marketCapBySymbol.set(q.symbol, q.marketCap || 0);
          }
        }
      }
      if (marketCapBySymbol.size === 0) throw new Error("나스닥 종목군을 구성하지 못했습니다.");

      return [...marketCapBySymbol.entries()].sort((a, b) => b[1] - a[1]).map(([symbol]) => symbol);
    })().catch((e) => {
      nasdaqUniversePromise = null;
      throw e;
    });
  }
  return nasdaqUniversePromise;
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

// ---------- 카테고리 탭(인기종목/나스닥100/테크100/S&P100/S&P500) — 서브뷰 없이 클릭 즉시 해당 순위를 불러옴 ----------
const catButtons = {
  popular: el("catPopularBtn"),
  nasdaq100: el("catNasdaq100Btn"),
  tech100: el("catTech100Btn"),
  sp100: el("catSp100Btn"),
  sp500: el("catSp500Btn"),
  surge: el("catSurgeBtn"),
  plunge: el("catPlungeBtn"),
};
const resultGroups = {
  popular: [popularStatus, popularResults],
  ranked: [rankedStatus, rankedResults],
  movers: [moversStatus, moversResults],
};
let activeCategory = null;

function setActiveCategory(cat) {
  activeCategory = cat;
  for (const key of Object.keys(catButtons)) {
    catButtons[key].classList.toggle("active", key === activeCategory);
  }
  // 티커 분석 화면을 보고 있던 중 카테고리 탭을 누르면 그 화면부터 정리
  if (resultsView.style.display !== "none") {
    history.pushState({}, "", location.pathname);
    resultsView.style.display = "none";
  }
  syncHeaderHeight();
}

catButtons.popular.addEventListener("click", () => {
  setActiveCategory("popular");
  prepareMainView("popular");
  runPopular(20);
});
catButtons.nasdaq100.addEventListener("click", () => {
  setActiveCategory("nasdaq100");
  prepareMainView("ranked");
  runNasdaq100Universe();
});
catButtons.tech100.addEventListener("click", () => {
  setActiveCategory("tech100");
  prepareMainView("ranked");
  runTech100();
});
catButtons.sp100.addEventListener("click", () => {
  setActiveCategory("sp100");
  prepareMainView("ranked");
  runSP100();
});
catButtons.sp500.addEventListener("click", () => {
  setActiveCategory("sp500");
  prepareMainView("ranked");
  runSP500();
});
catButtons.surge.addEventListener("click", () => {
  setActiveCategory("surge");
  prepareMainView("movers");
  runMovers("surge");
});
catButtons.plunge.addEventListener("click", () => {
  setActiveCategory("plunge");
  prepareMainView("movers");
  runMovers("plunge");
});

// 메인창에 하나의 결과만 보이도록: 선택된 카테고리 외 결과 영역과 티커 분석 화면을 모두 정리
function prepareMainView(activeKey) {
  for (const key of Object.keys(resultGroups)) {
    // 활성 그룹은 인라인 display를 지워 기본값(block)으로 되돌림 — 이전에 다른 탭 전환으로 숨겨져 있었을 수 있음
    resultGroups[key].forEach((elm) => (elm.style.display = key === activeKey ? "" : "none"));
  }
  if (resultsView.style.display !== "none") {
    history.pushState({}, "", location.pathname);
  }
  resultsView.style.display = "none";
}

// ---------- 홈 ↔ 티커 분석 화면 라우팅(뒤로가기 지원, ?ticker=로 특정 종목에 바로 접속 가능) ----------
function showHomeView() {
  resultsView.style.display = "none";
  document.title = "미국 기업 분석기";
}

function showResultsView(ticker) {
  for (const key of Object.keys(resultGroups)) {
    resultGroups[key].forEach((elm) => (elm.style.display = "none"));
  }
  setActiveCategory(null);
  resultsView.style.display = "block";
  document.title = `${ticker} 분석 - 미국 기업 분석기`;
  window.scrollTo(0, 0);
}

// push=false는 popstate(뒤로/앞으로가기)나 최초 URL 진입 처리 시, 이미 있는 히스토리 상태를 다시 쌓지 않기 위함
function navigateToTicker(ticker, { push = true } = {}) {
  if (push) {
    history.pushState({ ticker }, "", "?ticker=" + encodeURIComponent(ticker));
  }
  tickerInput.value = ticker;
  showResultsView(ticker);
  runAnalysis(ticker);
}

backHomeBtn.addEventListener("click", () => {
  history.pushState({}, "", location.pathname);
  showHomeView();
});

window.addEventListener("popstate", () => {
  const ticker = new URLSearchParams(location.search).get("ticker");
  if (ticker) {
    navigateToTicker(ticker.toUpperCase(), { push: false });
  } else {
    showHomeView();
  }
});

// 종목 심볼 클릭 시 해당 종목 분석 화면으로 이동(TOP10·인기종목 표에 이벤트 위임으로 공통 적용)
document.addEventListener("click", (e) => {
  const link = e.target.closest(".ticker-link");
  if (link && link.dataset.ticker) {
    navigateToTicker(link.dataset.ticker);
  }
});

// 페이지를 ?ticker=XXX로 바로 열었을 때 홈을 거치지 않고 해당 종목 분석부터 시작
// (?ticker=가 없는 일반 접속 시에는 인기종목(상위 20개)을 기본 화면으로 바로 불러오며,
//  불러오는 동안은 검은 화면에 로고만 보여주는 스플래시로 가림)
(function initRouteFromUrl() {
  const ticker = new URLSearchParams(location.search).get("ticker");
  if (ticker) {
    loadingSplash.style.display = "none";
    navigateToTicker(ticker.toUpperCase(), { push: false });
  } else {
    setActiveCategory("popular");
    prepareMainView("popular");
    runPopular(20).finally(() => {
      loadingSplash.style.display = "none";
    });
  }
})();

// ---------- 메인 분석 흐름 ----------
function triggerSearch() {
  const ticker = tickerInput.value.trim().toUpperCase();
  if (!ticker) {
    setStatus("error", "❌ 분석할 기업의 티커를 입력해주세요. (예: AAPL)");
    return;
  }
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

    renderSummary(quote, meta, getDailyChangePercent(chartData)).catch((e) => {
      el("summarySection").innerHTML = `<p class="error-inline">사업 요약을 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderFinancials(ticker, meta.currency).catch((e) => {
      el("financialsSection").innerHTML = `<p class="error-inline">실적 데이터를 가져오지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    // 나스닥·다우존스·S&P500 1년 수익률과, 분석 대상 자신의 지표(차트+재무제표)는
    // 경쟁사 비교(3)·가격 매력도(5)·투자 위험도(6) 섹션이 각자 다시 조회하지 않고 공유해서
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
      el("scoreSection").innerHTML = `<p class="error-inline">가격 매력도 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
    });

    renderRisk(marketReturnsPromise, selfMetricsPromise).catch((e) => {
      el("riskSection").innerHTML = `<p class="error-inline">투자 위험도 점수를 계산하지 못했습니다: ${escapeHtml(e.message)}</p>`;
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

  el("summarySection").innerHTML = `
    <p class="summary-text"><b>${escapeHtml(companyName)} (${escapeHtml(meta.symbol || quote.symbol || "")})</b> — ${escapeHtml(oneLiner)}</p>
    <div class="company-meta">
      <span>업종: <b>${escapeHtml(quote.industryDisp || quote.industry || "N/A")}</b></span>
      <span>섹터: <b>${escapeHtml(quote.sectorDisp || quote.sector || "N/A")}</b></span>
      <span>거래소: <b>${escapeHtml(quote.exchDisp || meta.fullExchangeName || "N/A")}</b></span>
      <span>현재가: <b>$${(meta.regularMarketPrice ?? 0).toFixed(2)}</b> ${changePct !== null && changePct !== undefined ? `<span class="${changePct >= 0 ? "delta-up" : "delta-down"}">(${fmtPct(changePct)})</span>` : ""}</span>
    </div>
  `;
}

// 요약 카드 아래에 가격 매력도·투자 위험도·거시경제 점수를 한눈에 보는 작은 원형 배지로 가로 배치(상세 근거는 5·6·7번 섹션 참고)
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

    rowEl.innerHTML = `
      <div class="mini-score">
        <div class="mini-score-circle">${attractiveness.total}</div>
        <span class="mini-score-label">가격매력도</span>
      </div>
      <div class="mini-score">
        <div class="mini-score-circle risk">${risk.total}</div>
        <span class="mini-score-label">투자위험도</span>
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

// ---------- 3. 경쟁사 매출/주가/가격 매력도 비교 ----------
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
      const scoreClass = score.total >= 5 ? "delta-up" : "delta-down";
      return `
      <div class="peer-row">
        <span class="bar-label${d.self ? " self" : ""}">${escapeHtml(d.symbol)}</span>
        <div class="bar-track"><div class="bar-fill ${d.self ? "self" : ""}" style="width:${pct}%"></div></div>
        <span class="bar-value">${fmtCompactCurrency(d.revenue)}</span>
        <span class="peer-price">${fmtCompactCurrency(d.marketCap)}</span>
        <span class="peer-score ${scoreClass}">${score.total}</span>
      </div>`;
    })
    .join("");

  el("peersSection").innerHTML = `
    <p class="muted">최근 회계연도 매출액 기준 비교 (${bySector ? "동일 섹터 시가총액 TOP3 + 시총 유사 종목 1개" : "자동 감지된 관련 종목"})</p>
    <div class="peer-table-header">
      <span></span><span></span><span>매출액</span><span>시가총액</span><span>매력도</span>
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

// ---------- 5. 가격 매력도 점수 (52주 위치 + PE 밸류에이션 + 매출 성장성) ----------
async function renderScore(selfMetricsPromise) {
  el("scoreSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const metrics = await selfMetricsPromise;

  const score = computeAttractivenessScore(metrics);
  const { total, marketCapScore, rangeScore, peScore, pe, rangePosition, growthScore, revenueGrowth3y } = score;
  const isForeignCurrency = metrics.currency && metrics.currency !== "USD";

  el("scoreSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge">
        <div class="score-num">${total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>🏢 시가총액 밸류에이션: <b>${!isForeignCurrency && metrics.marketCap ? fmtCompactCurrency(metrics.marketCap) : "N/A" + (isForeignCurrency ? " (해외 상장 종목 제외)" : "")}</b> (1조달러 이상이면 만점, 300억달러 이하면 0점)</li>
          <li>📍 52주 최고/최저 대비 위치: ${rangePosition !== null ? `저점 대비 <b>${(rangePosition * 100).toFixed(0)}%</b> 지점` : "N/A"} (저점에 가까울수록 가점)</li>
          <li>💰 P/E(주가수익비율): <b>${pe ? pe.toFixed(1) : "N/A"}</b> (직전년도 시가총액 ÷ 순이익, 낮을수록 가점, 10배 이하 만점·70배 이상 0점)</li>
          <li>📈 매출 성장성(최근 3개년 평균): <b>${revenueGrowth3y !== null && revenueGrowth3y !== undefined ? fmtPct(revenueGrowth3y) : "N/A"}</b> (전년 대비 매출 성장률, 높을수록 가점, 30% 이상 만점·0% 이하 0점)</li>
          <li>세부 점수 — 시가총액 밸류에이션 ${marketCapScore.toFixed(1)}/2, 52주 위치 ${rangeScore.toFixed(1)}/4, PE 밸류에이션 ${peScore.toFixed(1)}/2, 매출 성장성 ${growthScore.toFixed(1)}/2</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 이 점수는 시가총액 규모, 52주 가격 위치, PE 밸류에이션, 매출 성장성을 조합한 <b>단순 참고용 정량 지표</b>이며,
          투자 자문이나 매수/매도 추천이 아닙니다. 실제 투자 판단은 재무제표 전체와 다른 정보를 종합해 본인 책임 하에 내려야 합니다.
        </p>
      </div>
    </div>
  `;
}

// ---------- 6. 투자 위험도 점수 (vs S&P500, 점수가 높을수록 위험이 낮음) ----------
async function renderRisk(marketReturnsPromise, selfMetricsPromise) {
  el("riskSection").innerHTML = `<p class="muted">불러오는 중...</p>`;

  const [metrics, { sp500Return }] = await Promise.all([selfMetricsPromise, marketReturnsPromise]);

  const { total, marketScore, debtScore, marginScore, relDiff, debtToAssets, netMargin } = computeRiskScore(
    metrics,
    sp500Return
  );

  el("riskSection").innerHTML = `
    <div class="score-wrap">
      <div class="score-badge risk">
        <div class="score-num">${total}</div>
        <div class="score-den">/ 10</div>
      </div>
      <div class="score-details">
        <ul>
          <li>📊 S&P500과의 1년 수익률 차이: ${relDiff !== null ? `<b>${relDiff.toFixed(1)}%p</b> (S&P500 <b>${fmtPct(sp500Return)}</b>)` : "N/A"} (차이가 작을수록 가점)</li>
          <li>🏦 부채비율(총부채/총자산): <b>${debtToAssets !== null ? (debtToAssets * 100).toFixed(0) + "%" : "N/A"}</b> (낮을수록 가점, 100% 이상이면 0점)</li>
          <li>💵 순이익률(순이익/매출): <b>${netMargin !== null ? (netMargin * 100).toFixed(1) + "%" : "N/A"}</b> (높을수록 가점, 적자면 0점)</li>
          <li>세부 점수 — S&P500 대비 모멘텀 ${marketScore.toFixed(1)}/4, 부채비율 ${debtScore.toFixed(1)}/3, 순이익률 ${marginScore.toFixed(1)}/3</li>
        </ul>
        <p class="disclaimer">
          ⚠️ 점수가 높을수록(10점에 가까울수록) 재무적으로 더 안정적/저위험임을 의미합니다.
          S&P500 대비 수익률, 부채비율, 순이익률을 조합한 <b>단순 참고용 정량 지표</b>이며, 투자 자문이나 매수/매도 추천이 아닙니다.
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

// ---------- 구간별 TOP N 공용 렌더러: 종목 목록을 받아 가격 매력도 + 투자 위험도 합산 상위 N개를 표시(topN 기본값 10) ----------
async function renderRankedTop10(tickers, rangeLabel, { statusEl, resultsEl, buttons, topN = 10 }) {
  buttons.forEach((btn) => (btn.disabled = true));
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";

  try {
    const { sp500Return } = await getMarketReturns();
    statusEl.textContent = `0/${tickers.length} 종목(${rangeLabel}) 분석 중...`;

    const metricsList = await mapWithConcurrency(tickers, 5, getFullMetrics, (completed, total) => {
      statusEl.textContent = `${completed}/${total} 종목(${rangeLabel}) 분석 중...`;
    });

    const ranked = metricsList
      .map((m) => {
        if (!m) return null;
        const attractiveness = computeAttractivenessScore(m);
        const risk = computeRiskScore(m, sp500Return);
        const combined = Math.round((attractiveness.total + risk.total) * 10) / 10;
        return { symbol: m.symbol, price: m.price, attractiveness: attractiveness.total, risk: risk.total, combined };
      })
      .filter(Boolean)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, topN);

    const successCount = metricsList.filter(Boolean).length;
    const failCount = tickers.length - successCount;
    statusEl.textContent = `완료 (${rangeLabel}) — ${tickers.length}개 중 ${successCount}개 분석 성공${failCount ? `, ${failCount}개는 조회 실패로 제외` : ""}`;

    if (ranked.length === 0) {
      resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
      return;
    }

    const rows = ranked
      .map(
        (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b></td>
        <td>${r.price !== undefined && r.price !== null ? "$" + r.price.toFixed(2) : "N/A"}</td>
        <td>${r.attractiveness}/10</td>
        <td>${r.risk}/10</td>
        <td><b>${r.combined}/20</b></td>
      </tr>`
      )
      .join("");

    resultsEl.innerHTML = `
      <table class="top30-table">
        <thead>
          <tr><th>순위</th><th>티커</th><th>현재가</th><th>가격<br>매력</th><th>투자<br>위험</th><th>합산 점수</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="disclaimer">
        ⚠️ 가격 매력도(10점 만점) + 투자 위험도(10점 만점)를 단순 합산한(20점 만점) 참고용 순위이며, 투자 자문이나 매수 추천이 아닙니다.
        무료 데이터 소스/프록시의 한계로 일부 종목은 조회에 실패해 순위 계산에서 제외될 수 있습니다.
      </p>
    `;
  } catch (err) {
    statusEl.textContent = `❌ ${err.message || "분석 중 오류가 발생했습니다."}`;
  } finally {
    buttons.forEach((btn) => (btn.disabled = false));
  }
}

// 나스닥 시총 상위 100(근사) 안에서 TOP20 (시가총액 순위는 인증이 필요해 막혀 있어, 여러 활발한 종목 스크리너를 합쳐 시총 내림차순으로 근사)
async function runNasdaq100Universe() {
  rankedStatus.style.display = "block";
  rankedStatus.textContent = "나스닥 종목군을 구성하는 중...";
  const universe = await getNasdaqUniverse().catch((e) => {
    rankedStatus.textContent = `❌ ${e.message || "나스닥 종목군을 가져오지 못했습니다."}`;
    return null;
  });
  if (!universe) return;
  const tickers = universe.slice(0, 100);
  await renderRankedTop10(tickers, "나스닥100(시총 근사)", {
    statusEl: rankedStatus,
    resultsEl: rankedResults,
    buttons: [catButtons.nasdaq100],
    topN: 20,
  });
}

// 테크100(나스닥-100 지수 공식 구성종목) 안에서 TOP20
async function runTech100() {
  rankedStatus.style.display = "block";
  rankedStatus.textContent = "테크100(나스닥-100) 종목 목록을 불러오는 중...";
  const tickers = await getNasdaq100Tickers().catch((e) => {
    rankedStatus.textContent = `❌ ${e.message || "테크100 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!tickers) return;
  await renderRankedTop10(tickers, "테크100(나스닥-100)", {
    statusEl: rankedStatus,
    resultsEl: rankedResults,
    buttons: [catButtons.tech100],
    topN: 20,
  });
}

// S&P500 상위 100(근사) 안에서 TOP20
async function runSP100() {
  rankedStatus.style.display = "block";
  rankedStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500Tickers().catch((e) => {
    rankedStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;
  const tickers = allTickers.slice(0, 100);
  await renderRankedTop10(tickers, "S&P100(근사)", {
    statusEl: rankedStatus,
    resultsEl: rankedResults,
    buttons: [catButtons.sp100],
    topN: 20,
  });
}

// S&P500 전체 종목 중 TOP50
async function runSP500() {
  rankedStatus.style.display = "block";
  rankedStatus.textContent = "S&P500 종목 목록을 불러오는 중...";
  const allTickers = await getSP500Tickers().catch((e) => {
    rankedStatus.textContent = `❌ ${e.message || "종목 목록을 가져오지 못했습니다."}`;
    return null;
  });
  if (!allTickers) return;
  await renderRankedTop10(allTickers, "S&P500 전체", {
    statusEl: rankedStatus,
    resultsEl: rankedResults,
    buttons: [catButtons.sp500],
    topN: 50,
  });
}

// 티커/현재가(+등락률)/가격매력/투자위험 5열 표 — 인기종목·급등주·급락주가 공유하는 렌더러
function moversTableHtml(scored, rankNote) {
  const scoreClass = (score) => (score === null ? "" : score > 5 ? "delta-up" : score < 5 ? "delta-down" : "");

  const rows = scored
    .map((r, i) => {
      const changeClass = r.changePct >= 0 ? "delta-up" : "delta-down";
      return `
      <tr>
        <td>${i + 1}</td>
        <td><b class="ticker-link" data-ticker="${escapeHtml(r.symbol)}">${escapeHtml(r.symbol)}</b><br><span class="muted" style="font-size:11px;">${escapeHtml(r.name)}</span></td>
        <td>$${r.price.toFixed(2)}<br><span class="${changeClass}" style="font-size:11px;">(${fmtPct(r.changePct)})</span></td>
        <td class="${scoreClass(r.attractiveness)}"><b>${r.attractiveness !== null ? r.attractiveness : "N/A"}</b></td>
        <td class="${scoreClass(r.risk)}"><b>${r.risk !== null ? r.risk : "N/A"}</b></td>
      </tr>`;
    })
    .join("");

  return `
      <div class="popular-table-wrap">
        <table class="top30-table popular-table">
          <thead>
            <tr><th>순위</th><th>티커</th><th>현재가</th><th>가격<br>매력</th><th>투자<br>위험</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="disclaimer">
        ⚠️ ${rankNote}
        가격 매력도·투자 위험도는 각 10점 만점 참고용 지표이며(5점보다 높으면 초록색, 낮으면 빨간색), 투자 자문이 아닙니다.
      </p>
    `;
}

// 후보 목록(가벼운 조회로 얻은 심볼/현재가/등락률)에 대해 가격 매력도·투자 위험도 점수를 매겨 표 HTML까지 완성
// marketReturnsPromise는 후보 목록을 모으는 동안 미리 병렬로 시작해둔 getMarketReturns() 호출을 전달받음
async function scoreAndRenderMovers(candidates, marketReturnsPromise, { statusEl, resultsEl, rankNote }) {
  statusEl.textContent = "가격 매력도 · 투자 위험도 점수를 계산하는 중...";

  // 한꺼번에 요청하면 프록시가 과부하로 실패하는 경우가 많아 동시 요청 수를 제한
  const [{ sp500Return }, fullMetricsList] = await Promise.all([
    marketReturnsPromise,
    mapWithConcurrency(candidates, 3, (r) => getFullMetrics(r.symbol)),
  ]);

  const scored = candidates.map((r, i) => {
    const m = fullMetricsList[i];
    if (!m) return { ...r, attractiveness: null, risk: null };
    const attractiveness = computeAttractivenessScore(m);
    const risk = computeRiskScore(m, sp500Return);
    return { ...r, attractiveness: attractiveness.total, risk: risk.total };
  });

  statusEl.style.display = "none";
  resultsEl.innerHTML = moversTableHtml(scored, rankNote);
}

// ---------- 인기종목: 당일 거래대금(가격 × 거래량) 상위 20개 ----------
async function runPopular(count = 20) {
  catButtons.popular.disabled = true;
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
      .slice(0, count);

    await scoreAndRenderMovers(ranked, marketReturnsPromise, {
      statusEl: popularStatus,
      resultsEl: popularResults,
      rankNote:
        '순위는 당일 거래대금(거래량 × 현재가 추정) 기준이며, Yahoo Finance의 "가장 활발히 거래된 종목" 목록 중 상위 50개를 기준으로 재계산했습니다.',
    });
  } catch (err) {
    popularStatus.textContent = `❌ ${err.message || "인기종목을 가져오지 못했습니다."}`;
  } finally {
    catButtons.popular.disabled = false;
  }
}

// S&P500 전 종목의 전일 등락률을 가볍게 조회(차트 1회, 5일치 일봉)해 급등주/급락주 정렬 후보로 사용
async function getSP500DailyChanges() {
  const tickers = await getSP500Tickers();
  const results = await mapWithConcurrency(tickers, 15, async (symbol) => {
    const chart = await yahooChart(symbol, "5d", "1d").catch(() => null);
    const changePct = getDailyChangePercent(chart);
    const meta = chart && chart.chart && chart.chart.result && chart.chart.result[0] && chart.chart.result[0].meta;
    if (changePct === null || !meta || meta.regularMarketPrice === undefined) return null;
    return { symbol, name: meta.shortName || meta.longName || symbol, price: meta.regularMarketPrice, changePct };
  });
  return results.filter(Boolean);
}

// ---------- 급등주/급락주: S&P500 종목 중 전일 등락률 상위·하위 50개 ----------
async function runMovers(direction) {
  const btn = direction === "surge" ? catButtons.surge : catButtons.plunge;
  const label = direction === "surge" ? "급등주" : "급락주";
  btn.disabled = true;
  moversResults.innerHTML = "";
  moversStatus.style.display = "block";
  moversStatus.textContent = `S&P500 ${label}을 불러오는 중...`;

  try {
    const marketReturnsPromise = getMarketReturns();
    const candidates = await getSP500DailyChanges();
    if (candidates.length === 0) throw new Error(`${label} 데이터를 가져오지 못했습니다.`);

    const sorted = candidates
      .sort((a, b) => (direction === "surge" ? b.changePct - a.changePct : a.changePct - b.changePct))
      .slice(0, 50);

    await scoreAndRenderMovers(sorted, marketReturnsPromise, {
      statusEl: moversStatus,
      resultsEl: moversResults,
      rankNote: `순위는 전일 대비 등락률(${direction === "surge" ? "상승률 높은" : "하락률 큰"} 순) 기준이며, S&P500 편입 종목 중 상위 50개입니다.`,
    });
  } catch (err) {
    moversStatus.textContent = `❌ ${err.message || `${label}을 가져오지 못했습니다.`}`;
  } finally {
    btn.disabled = false;
  }
}
