// Cloudflare Worker: 마켓맵 데이터 중계 서버(CORS 프록시) + 한국 시세·거래대금·검색 로그·AI 요약 API
// 허용된 호스트(Yahoo Finance, FRED, 네이버 등)로만 요청을 중계하며, 응답에 CORS 헤더를 붙여 반환합니다.
// 2026-10-20 정리: 쓰지 않는 로그인(/auth/*)·익명 채팅(/chat)·미래예측 밴드·M2 경로와 그 코드를 삭제했습니다.

const ALLOWED_HOSTS = [
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "fred.stlouisfed.org",
  "news.google.com", // 국내 종목 주요뉴스(구글 뉴스 RSS 검색, 2026-09-01) — 응답은 XML이지만 그대로 스트리밍 중계됨
  "www.bing.com", // 국내 종목 주요뉴스 2순위(Bing 뉴스 RSS) — 구글이 Cloudflare 워커 IP를 차단(503)할 때 폴백(2026-09-01)
  "finance.naver.com", // ETF 섹션 한국 ETF 시총 TOP100(네이버 ETF 목록 API, 2026-09-01)
  "m.stock.naver.com", // 국내 종목 분기 실적+애널리스트 컨센서스(finance/quarter API, 2026-09-02) — 대시보드 재배포 필요
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- 인기 검색어: 방문자 전체의 검색을 KV에 기록해 최근 24시간 기준으로 집계(검색 오버레이의 "인기 검색") ----------
const SEARCH_LOG_KEY = "search_log_events";
const SEARCH_LOG_MAX = 8000; // 저장 이벤트 상한(오래된 것부터 정리)
const SEARCH_LOG_RETENTION_SEC = 24 * 60 * 60; // 24시간
const SEARCH_POPULAR_MAX = 10;

function isValidTickerSymbol(s) {
  return typeof s === "string" && /^[A-Z0-9.\-\^]{1,10}$/.test(s);
}

async function getSearchLogEvents(env) {
  const raw = await env.CHAT_KV.get(SEARCH_LOG_KEY);
  if (!raw) return [];
  let events;
  try {
    events = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(events)) return [];
  const cutoff = Date.now() - SEARCH_LOG_RETENTION_SEC * 1000;
  return events.filter((e) => e && typeof e.t === "number" && e.t >= cutoff && typeof e.symbol === "string");
}

// 같은 사람(IP)이 한 종목을 아무리 많이 눌러도 24시간 안에 최대 10회까지만 조회수로 센다(2026-10-21).
// 조회수 = 검색 + 시장(지도)에서 종목 클릭 + 관심 등록. IP는 원문이 아니라 짧은 해시로만 저장한다.
const VIEW_PER_IP_MAX = 10;
const VIEW_KINDS = ["search", "click", "watch"];
function ipHashOf(request) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h + ip.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function handleSearchLog(request, env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }
  const symbol = body && body.symbol ? String(body.symbol).toUpperCase().trim() : "";
  if (!isValidTickerSymbol(symbol)) return jsonResponse({ error: "잘못된 티커입니다." }, 400);
  const kind = VIEW_KINDS.includes(body && body.kind) ? body.kind : "search";
  const ip = ipHashOf(request);

  const events = await getSearchLogEvents(env);
  const mine = events.reduce((n, e) => (e.ip === ip && e.symbol === symbol ? n + 1 : n), 0);
  if (mine >= VIEW_PER_IP_MAX) return jsonResponse({ ok: true, counted: false }, 200); // 한 IP당 종목별 최대 10회
  events.push({ symbol, t: Date.now(), kind, ip });
  const trimmed = events.slice(-SEARCH_LOG_MAX);
  await env.CHAT_KV.put(SEARCH_LOG_KEY, JSON.stringify(trimmed), { expirationTtl: SEARCH_LOG_RETENTION_SEC });
  return jsonResponse({ ok: true, counted: true }, 200);
}

// ?n=100 처럼 많이 달라고 하면 실시간 랭킹 화면이 투자처별로 걸러 쓴다(기본은 인기 검색 10개)
async function handleSearchPopular(env, requestUrl) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);

  const nRaw = requestUrl ? Number(requestUrl.searchParams.get("n")) : 0;
  const limit = Number.isInteger(nRaw) && nRaw > 0 ? Math.min(nRaw, 300) : SEARCH_POPULAR_MAX;
  const events = await getSearchLogEvents(env);
  const counts = {};
  for (const e of events) counts[e.symbol] = (counts[e.symbol] || 0) + 1;
  const popular = Object.entries(counts)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return jsonResponse({ popular, since: Date.now() - SEARCH_LOG_RETENTION_SEC * 1000 }, 200);
}

// ---------- 포모지수(국내 전용 "공포·과열" 지표) — VIX 대신 코스피200+코스닥150(약 350종목)의 52주 신고가/신저가 종목수 비율로 매일 계산 ----------
// 공식: (52주 신고가 종목수/전체) - (52주 신저가 종목수/전체). 값이 클수록(신고가 몰림) 시장 과열(FOMO), 작을수록(음수, 신저가 몰림) 시장 공포
// 종목 목록은 data/kr-universe-kospi200-kosdaq150.json에서 가져온 것(공식 KRX 목록이 아니라 KODEX 200·KODEX 코스닥150 ETF 보유종목 기준 근사치,
// 2026-08-20 기준) — 지수가 분기(3·6·9·12월)에 리밸런싱되므로 그 파일을 다시 조사해 갱신할 때 이 배열도 함께 교체해야 함
const KR_FOMO_UNIVERSE = [
  "005930.KS","000660.KS","402340.KS","009150.KS","005380.KS","105560.KS","055550.KS","012450.KS","028260.KS","034020.KS","000270.KS","012330.KS","086790.KS","006400.KS","068270.KS","035420.KS","032830.KS","066570.KS","005490.KS","316140.KS","034730.KS","000810.KS","373220.KS","267260.KS","009540.KS","207940.KS","010120.KS","329180.KS","033780.KS","017670.KS","010140.KS","298040.KS","035720.KS","051910.KS","042660.KS","030200.KS","079550.KS","064350.KS","015760.KS","267250.KS","003550.KS","006800.KS","042700.KS","047810.KS","096770.KS","278470.KS","010130.KS","018260.KS","138040.KS","000720.KS","011070.KS","000150.KS","071050.KS","028050.KS","086280.KS","005830.KS","323410.KS","011200.KS","003490.KS","259960.KS","010950.KS","003670.KS","007660.KS","016360.KS","003230.KS","024110.KS","180640.KS","272210.KS","006260.KS","078930.KS","021240.KS","000100.KS","009830.KS","161390.KS","352820.KS","039490.KS","090430.KS","175330.KS","005940.KS","032640.KS","443060.KS","010060.KS","138930.KS","036570.KS","064400.KS","267270.KS","326030.KS","001440.KS","066970.KS","047040.KS","241560.KS","034220.KS","062040.KS","000990.KS","001450.KS","307950.KS","271560.KS","051900.KS","082740.KS","004170.KS","454910.KS","047050.KS","128940.KS","004020.KS","139130.KS","161890.KS","483650.KS","011790.KS","009420.KS","375500.KS","192820.KS","002380.KS","014680.KS","017800.KS","088350.KS","012750.KS","204320.KS","011780.KS","052690.KS","001040.KS","377300.KS","111770.KS","035250.KS","097950.KS","004370.KS","139480.KS","450080.KS","036460.KS","103140.KS","008770.KS","028670.KS","030000.KS","457190.KS","008930.KS","282330.KS","081660.KS","029780.KS","018880.KS","071970.KS","112610.KS","251270.KS","120110.KS","069960.KS","022100.KS","011170.KS","051600.KS","302440.KS","023530.KS","007340.KS","011210.KS","007070.KS","009970.KS","383220.KS","005850.KS","298020.KS","073240.KS","000120.KS","026960.KS","017960.KS","093370.KS","006280.KS","004000.KS","002790.KS","004990.KS","192080.KS","003240.KS","000240.KS","069620.KS","361610.KS","185750.KS","000210.KS","001800.KS","001430.KS","285130.KS","000080.KS","007310.KS","034230.KS","006040.KS","456040.KS","280360.KS","001680.KS","069260.KS","298050.KS","005300.KS","300720.KS","003090.KS","009240.KS","006650.KS","005420.KS","137310.KS","071320.KS","000670.KS","008730.KS","002840.KS","003030.KS","002030.KS","014820.KS","268280.KS",
  "196170.KQ","086520.KQ","247540.KQ","036930.KQ","028300.KQ","087010.KQ","240810.KQ","277810.KQ","039030.KQ","058470.KQ","298380.KQ","403870.KQ","108490.KQ","222800.KQ","141080.KQ","214450.KQ","319660.KQ","000250.KQ","080220.KQ","347850.KQ","032820.KQ","178320.KQ","084370.KQ","310210.KQ","226950.KQ","067310.KQ","095340.KQ","095610.KQ","257720.KQ","098460.KQ","005290.KQ","237690.KQ","089970.KQ","058610.KQ","145020.KQ","089030.KQ","357780.KQ","131290.KQ","319400.KQ","475830.KQ","039200.KQ","064760.KQ","083650.KQ","140860.KQ","007390.KQ","263750.KQ","323280.KQ","035900.KQ","290650.KQ","041510.KQ","131970.KQ","078600.KQ","096530.KQ","214150.KQ","082920.KQ","068760.KQ","214370.KQ","031980.KQ","241710.KQ","218410.KQ","090710.KQ","030530.KQ","466100.KQ","101490.KQ","445680.KQ","043260.KQ","048410.KQ","328130.KQ","420770.KQ","195940.KQ","183300.KQ","166090.KQ","085660.KQ","122870.KQ","137400.KQ","124500.KQ","189300.KQ","065350.KQ","358570.KQ","090360.KQ","099320.KQ","060370.KQ","050890.KQ","033100.KQ","161580.KQ","003380.KQ","281740.KQ","032500.KQ","036540.KQ","417200.KQ","074600.KQ","121600.KQ","213420.KQ","348370.KQ","232140.KQ","293490.KQ","437730.KQ","222080.KQ","388720.KQ","014620.KQ","036810.KQ","295310.KQ","035760.KQ","025980.KQ","204270.KQ","082270.KQ","052400.KQ","171090.KQ","025320.KQ","006730.KQ","056190.KQ","060250.KQ","042000.KQ","033500.KQ","112040.KQ","214430.KQ","253450.KQ","399720.KQ","067160.KQ","053800.KQ","038500.KQ","211050.KQ","100790.KQ","015750.KQ","018290.KQ","125490.KQ","030520.KQ","348210.KQ","251970.KQ","060280.KQ","032190.KQ","041190.KQ","272290.KQ","009520.KQ","078340.KQ","278280.KQ","036620.KQ","056080.KQ","215200.KQ","376300.KQ","253590.KQ","095660.KQ","069080.KQ","225570.KQ","036830.KQ","194480.KQ","101730.KQ","025900.KQ","352480.KQ",
];
const FOMO_LATEST_KEY = "fomo_latest";
const FOMO_HISTORY_KEY = "fomo_history";
const FOMO_HISTORY_MAX = 120; // 최근 약 4개월치(일 단위)만 보관

const UPSTREAM_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; StockAnalyzerCron/1.0)" };

async function fetchYahooChart(symbol, range = "1y", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: UPSTREAM_HEADERS });
  if (!res.ok) throw new Error("chart fetch failed: " + res.status);
  return res.json();
}

async function fetchYahooFundamentals(symbol, types) {
  const now = Math.floor(Date.now() / 1000);
  const fiveYearsAgo = now - 5 * 365 * 24 * 3600;
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${fiveYearsAgo}&period2=${now}`;
  const res = await fetch(url, { headers: UPSTREAM_HEADERS });
  if (!res.ok) throw new Error("fundamentals fetch failed: " + res.status);
  return res.json();
}

function chartClosePairsWorker(chartResult) {
  const result = chartResult && chartResult.chart && chartResult.chart.result && chartResult.chart.result[0];
  if (!result) return [];
  const timestamps = result.timestamp || [];
  const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = timestamps.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
  pairs.sort((a, b) => a.t - b.t);
  return pairs;
}

async function mapWithConcurrencyWorker(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      try {
        results[current] = await worker(items[current], current);
      } catch {
        results[current] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// 52주 신고가/신저가 판정 — 종가 기준 최근 1년 최고·최저 대비 오늘 종가가 5% 이내로 근접하면
// "신고가권/신저가권" 종목으로 집계(정확히 그 값을 찍어야만 인정하면 너무 적게 잡혀서, 근처까지 온
// 종목도 포함하도록 여유폭을 5%로 넓힘)
function fiftyTwoWeekStatusFromChart(chart) {
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return null;
  const meta = result.meta || {};
  const price = meta.regularMarketPrice;
  const closes = ((result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || []).filter(
    (v) => v !== null && v !== undefined
  );
  if (price === undefined || price === null || closes.length < 2) return null;
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  return { isHigh: price >= high * 0.95, isLow: price <= low * 1.05 };
}

// 매일 한 번(Cron Trigger)씩 호출 — 코스피200+코스닥150(약 350종목)을 하루 만에 한 번에 스캔(가벼운 차트 조회 1회씩이라 500종목도
// 무리 없이 스캔하는 미래예측 배치보다도 부하가 적음)해 그날의 포모지수를 확정하고 최근 120일 히스토리에 누적
async function runFomoScanTick(env) {
  if (!env.CHAT_KV) return; // KV 바인딩이 없으면 조용히 건너뜀(기존 기능에 영향 없도록)
  const results = await mapWithConcurrencyWorker(KR_FOMO_UNIVERSE, 16, async (symbol) => {
    try {
      return fiftyTwoWeekStatusFromChart(await fetchYahooChart(symbol, "1y", "1d"));
    } catch {
      return null;
    }
  });
  const valid = results.filter(Boolean);
  const total = KR_FOMO_UNIVERSE.length;
  const highCount = valid.filter((r) => r.isHigh).length;
  const lowCount = valid.filter((r) => r.isLow).length;
  const score = highCount / total - lowCount / total;

  const snapshot = {
    date: new Date().toISOString().slice(0, 10),
    universeSize: total,
    scanned: valid.length,
    highCount,
    lowCount,
    score: Math.round(score * 1000) / 1000,
    computedAt: new Date().toISOString(),
  };
  await env.CHAT_KV.put(FOMO_LATEST_KEY, JSON.stringify(snapshot));

  const historyRaw = await env.CHAT_KV.get(FOMO_HISTORY_KEY, "json");
  const history = Array.isArray(historyRaw) ? historyRaw : [];
  const withoutToday = history.filter((h) => h && h.date !== snapshot.date); // 같은 날 재실행(run-now 등) 시 중복 방지
  withoutToday.push(snapshot);
  const trimmed = withoutToday.slice(-FOMO_HISTORY_MAX);
  await env.CHAT_KV.put(FOMO_HISTORY_KEY, JSON.stringify(trimmed));
}

async function handleFomoIndex(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  const latest = await env.CHAT_KV.get(FOMO_LATEST_KEY, "json");
  if (!latest) return jsonResponse({ error: "아직 계산된 데이터가 없습니다." }, 404);
  const historyRaw = await env.CHAT_KV.get(FOMO_HISTORY_KEY, "json");
  return jsonResponse({ ...latest, history: Array.isArray(historyRaw) ? historyRaw : [] }, 200);
}

// Cron을 기다리지 않고 지금 당장 첫 스캔을 채워 넣고 싶을 때 수동으로 호출(그 뒤로는 평소처럼 Cron이 매일 이어받음)
async function handleFomoRunNow(env) {
  await runFomoScanTick(env);
  return handleFomoIndex(env);
}

// ---------- 국내(코스피200+코스닥150) 실시간 등락률 요약 — 지도(섹터맵) 국내 모드 색상 갱신용 ----------
// Yahoo의 배치 시세(v7/finance/quote)는 최근 인증(crumb)이 필요해져 브라우저에서 직접 호출할 수 없게 됐다(확인함).
// 해외(S&P500)는 스크리너 API 한 번으로 전체를 받아오지만 KRX용 스크리너는 없어서, 이미 FOMO지수 계산에 쓰고 있는
// KR_FOMO_UNIVERSE(약 350종목)를 재사용해 서버에서 종목별로 훑은 뒤 등락률만 모아 KV에 15분 캐시해둔다.
const KR_QUOTES_CACHE_KEY = "kr_quotes_cache_v2"; // 2026-10-19: 거래대금(vals) 추가로 키 변경(옛 캐시엔 vals가 없음)
const KR_QUOTES_CACHE_TTL_MS = 15 * 60 * 1000;

// 종목 하나의 오늘 등락률 + 오늘 지금까지의 거래대금 근사값(현재가 × 당일 누적 거래량).
// 거래대금은 지도 "대금" 모드가 직전 20거래일 같은 시각 기준선(data/volume-profile.json)과 비교하는 데 쓴다(2026-10-19)
async function fetchKrQuoteSnap(symbol) {
  try {
    const chart = await fetchYahooChart(symbol, "5d", "1d");
    const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
    const meta = result && result.meta;
    if (!meta) return null;
    const val = Number.isFinite(meta.regularMarketPrice) && Number.isFinite(meta.regularMarketVolume) ? Math.round(meta.regularMarketPrice * meta.regularMarketVolume) : null;
    // 2026-10-15: 종목 상세(앱 getDailyChangePercent)와 같은 값이 나오도록 Yahoo가 직접 주는 당일 등락률을 우선 사용한다.
    // 예전엔 "일봉 뒤에서 두 번째 종가"를 전일 종가로 가정했는데, 한국 종목은 마지막 일봉이 어제(10/13)이고 현재가는 오늘(10/14)인 시간대가
    // 있어서 이틀 전 종가와 비교(예: SK이노베이션 상세 +4.08%인데 목록은 +6.81%, SK스퀘어 -0.58%인데 -13.41%)되는 오류가 있었음
    if (Number.isFinite(meta.regularMarketChangePercent)) return { chg: meta.regularMarketChangePercent, val };
    const pairs = chartClosePairsWorker(chart);
    if (!pairs.length) return null;
    const latest = pairs[pairs.length - 1];
    const price = meta.regularMarketPrice ?? latest.c;
    // 보조 계산: 마지막 일봉이 현재가와 같은 거래일(regularMarketTime의 한국 날짜)이면 그 앞 봉이, 아니면 마지막 일봉이 전일 종가
    const kstDay = (sec) => new Date((sec + 9 * 3600) * 1000).toISOString().slice(0, 10);
    const lastIsToday = Number.isFinite(meta.regularMarketTime) && kstDay(latest.t) === kstDay(meta.regularMarketTime);
    const prevClose = lastIsToday ? (pairs.length >= 2 ? pairs[pairs.length - 2].c : meta.chartPreviousClose ?? null) : latest.c;
    if (prevClose === null || prevClose === undefined || price === null || price === undefined || !prevClose) return null;
    return { chg: ((price - prevClose) / prevClose) * 100, val };
  } catch {
    return null;
  }
}

// ---------- 지도 "대금" 모드(ETF·코인 보기) — 오늘 지금까지의 거래대금을 종목 목록으로 조회 ----------
// /day-vals?symbols=VOO,069500.KS,BTC-USD … (최대 250개). 주식·ETF는 현재가 × 당일 누적 거래량, 코인은 야후 거래량이 이미 달러 거래대금(24시간)이라 그대로.
// 같은 목록 요청은 10분간 KV에 캐시한다.
async function handleDayVals(requestUrl, env) {
  const raw = (requestUrl.searchParams.get("symbols") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const symbols = [...new Set(raw)].filter((x) => /^[A-Za-z0-9.\-=^]{1,24}$/.test(x)).slice(0, 250);
  if (!symbols.length) return jsonResponse({ error: "symbols 파라미터가 필요합니다." }, 400);
  let h = 5381;
  for (const ch of symbols.join(",")) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  const cacheKey = `day_vals2_${(h >>> 0).toString(36)}_${symbols.length}`; // v2: 등락률(chgs) 포함
  if (env.CHAT_KV) {
    const cached = await env.CHAT_KV.get(cacheKey, "json");
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return jsonResponse(cached, 200);
  }
  const results = await mapWithConcurrencyWorker(symbols, 16, async (sym) => {
    try {
      const chart = await fetchYahooChart(sym, "5d", "1d");
      const r0 = chart && chart.chart && chart.chart.result && chart.chart.result[0];
      const meta = r0 && r0.meta;
      if (!meta || !Number.isFinite(meta.regularMarketVolume)) return null;
      const isCrypto = /-(USD|KRW|USDT)$/.test(sym);
      if (!isCrypto && !Number.isFinite(meta.regularMarketPrice)) return null;
      // 등락률(2026-10-21): 마지막 일봉이 오늘이면 그 앞 봉이, 아니면 마지막 일봉이 전일 종가
      let chg = null;
      try {
        const ts = r0.timestamp || [];
        const closes = (r0.indicators && r0.indicators.quote && r0.indicators.quote[0] && r0.indicators.quote[0].close) || [];
        const pairs = ts.map((t, i) => ({ t, c: closes[i] })).filter((p) => p.c !== null && p.c !== undefined);
        const latest = pairs[pairs.length - 1];
        const off = Number.isFinite(meta.gmtoffset) ? meta.gmtoffset : 0;
        const dayOf = (sec) => Math.floor((sec + off) / 86400);
        const lastIsToday = latest && Number.isFinite(meta.regularMarketTime) && dayOf(latest.t) === dayOf(meta.regularMarketTime);
        const prev = lastIsToday ? (pairs.length >= 2 ? pairs[pairs.length - 2].c : meta.chartPreviousClose) : latest && latest.c;
        if (prev && Number.isFinite(meta.regularMarketPrice)) chg = Math.round(((meta.regularMarketPrice - prev) / prev) * 10000) / 100;
        if (Number.isFinite(meta.regularMarketChangePercent)) chg = Math.round(meta.regularMarketChangePercent * 100) / 100;
      } catch {}
      return [sym, Math.round(isCrypto ? meta.regularMarketVolume : meta.regularMarketPrice * meta.regularMarketVolume), chg];
    } catch {
      return null;
    }
  });
  const vals = {};
  const chgs = {};
  for (const r of results) {
    if (!r) continue;
    vals[r[0]] = r[1];
    if (Number.isFinite(r[2])) chgs[r[0]] = r[2];
  }
  const payload = { vals, chgs, fetchedAt: Date.now() };
  if (Object.keys(vals).length && env.CHAT_KV) await env.CHAT_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: 3600 });
  return jsonResponse(payload, Object.keys(vals).length ? 200 : 502);
}


// ---------- 별별순위 실시간 값(2026-10-21) — 종목 목록(≤30개)의 현재가·등락률·거래대금·52주 고저·3개월 변동성·주간 RSI를 한 번에 ----------
// 하루 두 번 갱신되는 DB(sreport-baseline)로 순위를 매기되, 실시간이 필요한 6개 항목(52주 구간·거래대금·PER·변동성·과열도·등락률)은
// 이 경로로 목록 전체를 병렬 조회해 덮어쓴다. 6개월 일봉 하나에서 전부 뽑아 종목당 바깥 요청 1건. 3분 캐시.
// 응답: { v: { 심볼: [현재가, 등락률%, 거래대금, 52주최고, 52주최저, 변동성%, 주간RSI, 종목명] }, fetchedAt }
function rankWeeklyRsi(closesByWeek, period = 14) {
  if (closesByWeek.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closesByWeek[i] - closesByWeek[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let ag = gain / period;
  let al = loss / period;
  for (let i = period + 1; i < closesByWeek.length; i++) {
    const d = closesByWeek[i] - closesByWeek[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}
async function handleRankLive(requestUrl, env) {
  const raw = (requestUrl.searchParams.get("symbols") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const symbols = [...new Set(raw)].filter((x) => /^[A-Za-z0-9.\-=^]{1,24}$/.test(x)).slice(0, 30);
  if (!symbols.length) return jsonResponse({ error: "symbols 파라미터가 필요합니다." }, 400);
  let h = 5381;
  for (const ch of symbols.join(",")) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  const cacheKey = `rank_live_${(h >>> 0).toString(36)}_${symbols.length}`;
  if (env.CHAT_KV) {
    const cached = await env.CHAT_KV.get(cacheKey, "json");
    if (cached && Date.now() - cached.fetchedAt < 3 * 60 * 1000) return jsonResponse(cached, 200);
  }
  const results = await mapWithConcurrencyWorker(symbols, 16, async (sym) => {
    try {
      const chart = await fetchYahooChart(sym, "6mo", "1d");
      const r0 = chart && chart.chart && chart.chart.result && chart.chart.result[0];
      const meta = r0 && r0.meta;
      if (!meta || !Number.isFinite(meta.regularMarketPrice)) return null;
      const isCrypto = /-(USD|KRW|USDT)$/.test(sym);
      const ts = r0.timestamp || [];
      const q = (r0.indicators && r0.indicators.quote && r0.indicators.quote[0]) || {};
      const bars = [];
      for (let i = 0; i < ts.length; i++) if (Number.isFinite(q.close && q.close[i])) bars.push({ t: ts[i], c: q.close[i] });
      const price = meta.regularMarketPrice;
      const latest = bars[bars.length - 1];
      const off = Number.isFinite(meta.gmtoffset) ? meta.gmtoffset : 0;
      const dayOf = (sec) => Math.floor((sec + off) / 86400);
      const lastIsToday = latest && Number.isFinite(meta.regularMarketTime) && dayOf(latest.t) === dayOf(meta.regularMarketTime);
      const prev = lastIsToday ? (bars.length >= 2 ? bars[bars.length - 2].c : meta.chartPreviousClose) : latest && latest.c;
      let chg = prev ? ((price - prev) / prev) * 100 : null;
      if (Number.isFinite(meta.regularMarketChangePercent)) chg = meta.regularMarketChangePercent;
      const volume = Number.isFinite(meta.regularMarketVolume) ? meta.regularMarketVolume : null;
      const val = volume === null ? null : isCrypto ? volume : price * volume;
      // 3개월(약 63거래일) 하루 평균 변동폭 |일간 등락률|
      const lastN = bars.slice(-64);
      let sum = 0;
      let n = 0;
      for (let i = 1; i < lastN.length; i++) {
        if (lastN[i - 1].c) {
          sum += Math.abs(lastN[i].c / lastN[i - 1].c - 1) * 100;
          n++;
        }
      }
      const vol = n >= 20 ? sum / n : null;
      // 주간 종가(주의 마지막 일봉)로 와일더 RSI(14) — 진행 중인 이번 주는 현재가로 마감한 것으로 계산
      const weeks = new Map();
      for (const b of bars) weeks.set(Math.floor((dayOf(b.t) + 3) / 7), b.c); // 1970-01-01은 목요일 → +3으로 월요일 시작 주
      const weekly = [...weeks.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
      if (weekly.length) weekly[weekly.length - 1] = price;
      const rsi = rankWeeklyRsi(weekly);
      const r2 = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
      return [sym, [r2(price, 4), r2(chg), val === null ? null : Math.round(val), r2(meta.fiftyTwoWeekHigh, 4), r2(meta.fiftyTwoWeekLow, 4), r2(vol), r2(rsi, 1), meta.shortName || meta.longName || null]];
    } catch {
      return null;
    }
  });
  const v = {};
  for (const r of results) if (r) v[r[0]] = r[1];
  const payload = { v, fetchedAt: Date.now() };
  if (Object.keys(v).length && env.CHAT_KV) await env.CHAT_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: 1800 });
  return jsonResponse(payload, Object.keys(v).length ? 200 : 502);
}

// 2026-10-19: 워커 한 번 호출에서 바깥으로 나가는 요청은 50개까지라 350종목을 한 번에 훑으면 50개만 채워졌다(확인함).
// 그래서 ?part=0,1,2,… 로 45종목씩 나눠 받고(호출마다 따로 50개 한도), 클라이언트가 전부 불러 합친다. part 없이 부르면 0번(앞 45개).
const KR_QUOTES_PART_SIZE = 45;
async function handleKrQuotes(env, requestUrl) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);

  const partRaw = requestUrl ? Number(requestUrl.searchParams.get("part")) : 0;
  const part = Number.isInteger(partRaw) && partRaw >= 0 ? partRaw : 0;
  const universe = KR_FOMO_UNIVERSE.slice(part * KR_QUOTES_PART_SIZE, (part + 1) * KR_QUOTES_PART_SIZE);
  const totalParts = Math.ceil(KR_FOMO_UNIVERSE.length / KR_QUOTES_PART_SIZE);
  if (!universe.length) return jsonResponse({ quotes: {}, vals: {}, part, totalParts, fetchedAt: Date.now() }, 200);
  const cacheKey = `${KR_QUOTES_CACHE_KEY}_p${part}`;

  const cached = await env.CHAT_KV.get(cacheKey, "json");
  if (cached && Date.now() - cached.fetchedAt < KR_QUOTES_CACHE_TTL_MS) {
    return jsonResponse(cached, 200);
  }

  const results = await mapWithConcurrencyWorker(universe, 16, async (symbol) => {
    const snap = await fetchKrQuoteSnap(symbol);
    return snap === null ? null : [symbol, Math.round(snap.chg * 100) / 100, snap.val];
  });
  const quotes = {};
  const vals = {}; // 심볼 -> 오늘 지금까지 거래대금(원) 근사값
  for (const r of results) {
    if (r) {
      quotes[r[0]] = r[1];
      if (Number.isFinite(r[2])) vals[r[0]] = r[2];
    }
  }
  if (Object.keys(quotes).length > 0) {
    const payload = { quotes, vals, part, totalParts, fetchedAt: Date.now() };
    await env.CHAT_KV.put(cacheKey, JSON.stringify(payload));
    return jsonResponse(payload, 200);
  }
  if (cached) return jsonResponse(cached, 200); // 갱신 실패해도 기존 캐시가 있으면 그거라도 반환
  return jsonResponse({ error: "국내 시세를 가져오지 못했습니다." }, 502);
}

// ---------- AI 분석 채팅(MVP, 2026-10-09) ----------
// POST /ai-chat {messages:[{role,content}]} → Claude API(tool use)로 종목 질문에 답변. 키는 Worker Secret ANTHROPIC_API_KEY.
// 모델은 숫자를 지어내지 못하도록 아래 도구(종목찾기·종목데이터)로 가져온 값만 근거로 답한다. 사용량은 IP당 하루 AI_DAILY_LIMIT회로 제한(CHAT_KV 재사용).
const AI_DAILY_LIMIT_DEFAULT = 5; // Worker 변수 AI_DAILY_LIMIT(숫자)로 코드 배포 없이 조절 가능
const AI_MAX_TOOL_ROUNDS = 5;
const AI_DEFAULT_MODEL = "claude-haiku-5-5";
const AI_MAX_OUTPUT_TOKENS = 1500; // 답변은 짧게 쓰게 하지만, 모델 내부 처리에 쓰는 토큰 때문에 한도가 낮으면 답변이 중간에 끊김
const AI_SITE_ORIGIN = "https://marketmap.kr";

const AI_SYSTEM_PROMPT = [
  "당신은 '공시정보'의 AI 증권 분석 도우미입니다. 한국어로 답합니다.",
  "표시 방식: get_stock_data를 호출하면 1년 주가 차트, 52주 위치, 연간 매출·순이익 막대, 월별 수익률 막대, 핵심 지표 카드가 화면에 자동으로 표시됩니다. 따라서 텍스트는 숫자를 나열하지 말고 전체 250자 이내·최대 3문장의 핵심 해석만 쓰세요(문장을 도중에 끊지 말고 짧게 끝내기)(조회 기간 같은 기술적 표현 없이 쉬운 말로)(카드에 이미 보이는 숫자를 반복하지 않기). 여러 종목 비교는 한 줄 결론 + 차이가 큰 포인트 1~2개만 씁니다.",
  "규칙:",
  "1) 종목의 가격·재무·승률 등 모든 숫자는 반드시 도구(search_symbol, get_stock_data)로 가져온 값만 사용하고, 도구에 없는 숫자는 지어내지 않습니다. 모르면 모른다고 말합니다.",
  "1-1) 도구로 확인되지 않은 사업 구조·업황·뉴스·실적 전망·경쟁 상황은 추정해서 말하지 않습니다. 오직 도구 숫자에서 읽히는 내용만 해석합니다.",
  "2) 종목명이 나오면 먼저 search_symbol로 티커를 찾고, 그다음 get_stock_data로 데이터를 조회합니다. 한국 종목 티커는 .KS(코스피)/.KQ(코스닥)가 붙습니다.",
  "3) 투자 권유 금지: '사세요/파세요/지금이 기회' 같은 단정적 매수·매도 지시는 하지 않습니다. 장점·위험·지표 해석을 균형 있게 제시하고, 최종 판단은 이용자 몫이라고 짧게 덧붙입니다.",
  "4) 미래 주가를 예측하거나 수익을 보장하는 표현은 쓰지 않습니다.",
  "5) 주식·코인·ETF·시장 분석과 무관한 질문에는 정중히 범위 밖이라고 안내합니다.",
  "7) '사야 해?/팔아야 해?/살까/팔까/매수/매도/들어가도 될까' 처럼 매매 판단을 묻는 질문에는 사라·팔라는 결론을 내리지 않습니다. 답변은 반드시 '[요약] 현재 ~한 상태입니다.' 로 시작해 같은 줄에 이어 쓰고(줄바꿈 금지), 도구 데이터가 보여주는 현재 상태(가격 위치·과열도·최근 추세·리스크 중 핵심 2가지)를 한 문장으로 말한 뒤, 마지막에 '참고용 정보예요. 충분히 살펴보시고, 투자 결정은 본인 판단으로 편하게 정해 주세요.'만 덧붙입니다. 전체 3문장·200자 이내.",
  "6) 지표 설명: 승률=최근 10년 월봉 기준 상승한 달의 비율, RSI는 주간 RSI(70 이상 과열, 30 이하 침체 경향), 영업이익률·ROE·부채비율은 직전 분기 기준입니다.",
].join("\n");

const AI_TOOLS = [
  {
    name: "search_symbol",
    description: "회사명(한글/영문) 또는 티커로 종목을 찾아 티커 후보를 반환합니다. 종목 데이터를 조회하기 전에 티커가 확실하지 않으면 먼저 호출하세요.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "회사명 또는 티커 (예: 삼성전자, 애플, NVDA)" } }, required: ["query"] },
  },
  {
    name: "get_stock_data",
    description: "티커로 현재가·등락률·52주 위치·수익률·재무지표(매출 성장, 영업이익률, ROE, 부채비율, PER)·10년 월봉 승률·주간 RSI를 조회합니다.",
    input_schema: { type: "object", properties: { symbol: { type: "string", description: "티커 (예: 005930.KS, AAPL, BTC-USD)" } }, required: ["symbol"] },
    cache_control: { type: "ephemeral" },
  },
];

let aiNameMapCache = { at: 0, map: null };
let aiWinrateCache = { at: 0, db: null };

async function aiGetNameMap() {
  if (aiNameMapCache.map && Date.now() - aiNameMapCache.at < 3600e3) return aiNameMapCache.map;
  const map = {};
  try {
    const res = await fetch(`${AI_SITE_ORIGIN}/data/ko-company-names.js`);
    const text = await res.text();
    const re = /^\s*(?:"([^"]+)"|([^\s:"',/]+))\s*:\s*"([^"]+)"/gm;
    let m;
    while ((m = re.exec(text))) map[(m[1] || m[2]).trim()] = m[3];
  } catch {
    /* 이름표를 못 받으면 Yahoo 검색만 사용 */
  }
  // 국내 종목(코스피200+코스닥150) 이름 — 별칭표에는 미국 종목 위주라 삼성전자·SK하이닉스 같은 국내 이름은 여기서 보충
  try {
    const res = await fetch(`${AI_SITE_ORIGIN}/data/kr-universe-kospi200-kosdaq150.json`);
    const uni = await res.json();
    for (const it of [...(uni.kospi200 || []), ...(uni.kosdaq150 || [])]) {
      if (it && it.name && it.symbol && !map[it.name]) map[it.name] = it.symbol;
    }
  } catch {
    /* 무시 */
  }
  // 코인(비트코인 등)·ETF 이름 — 별칭표에 없어서 카드에 영어(Bitcoin USD)로 나오던 것을 지도 자료의 이름으로 보충
  try {
    const mapText = await (await fetch(`${AI_SITE_ORIGIN}/sector-map/data/etf-crypto-map.js`)).text();
    const re2 = /"symbol":\s*"([^"]+)",\s*"name":\s*"([^"]+)"/g;
    let m2;
    while ((m2 = re2.exec(mapText))) if (!map[m2[2]]) map[m2[2]] = m2[1];
  } catch {
    /* 무시 */
  }
  const rev = {};
  for (const [name, sym] of Object.entries(map)) if (!rev[sym]) rev[sym] = name;
  aiNameMapCache = { at: Date.now(), map, rev };
  return map;
}

async function aiGetWinrateDb() {
  if (aiWinrateCache.db && Date.now() - aiWinrateCache.at < 3600e3) return aiWinrateCache.db;
  try {
    const res = await fetch(`${AI_SITE_ORIGIN}/data/winrate-scores-us.json`);
    const db = await res.json();
    aiWinrateCache = { at: Date.now(), db };
    return db;
  } catch {
    return aiWinrateCache.db;
  }
}

let aiAnnualCache = { at: 0, us: null, kr: null };
async function aiGetAnnualFin() {
  if (aiAnnualCache.us && Date.now() - aiAnnualCache.at < 3600e3) return aiAnnualCache;
  const get = async (f) => {
    try {
      return await (await fetch(`${AI_SITE_ORIGIN}/data/${f}`)).json();
    } catch {
      return null;
    }
  };
  const [us, kr] = await Promise.all([get("us-annual-financials.json"), get("kr-annual-financials.json")]);
  aiAnnualCache = { at: Date.now(), us: us && us.items, kr: kr && kr.items };
  return aiAnnualCache;
}

async function aiSearchSymbol(query) {
  const q = String(query || "").trim().slice(0, 40);
  if (!q) return { results: [] };
  const results = [];
  const seen = new Set();
  const push = (symbol, name) => {
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      results.push({ symbol, name });
    }
  };
  const names = await aiGetNameMap();
  const lower = q.toLowerCase();
  if (names[q]) push(names[q], q);
  for (const [name, sym] of Object.entries(names)) {
    if (results.length >= 5) break;
    if (name.toLowerCase().includes(lower)) push(sym, name);
  }
  if (results.length < 3) {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=5&newsCount=0&lang=ko-KR`, { headers: UPSTREAM_HEADERS });
      const data = await res.json();
      for (const it of data.quotes || []) {
        if (results.length >= 5) break;
        push(it.symbol, it.shortname || it.longname || it.symbol);
      }
    } catch {
      /* 무시 */
    }
  }
  return { results: results.slice(0, 5) };
}

function aiSeries(resultArr, key) {
  const items = [];
  for (const block of resultArr || []) {
    for (const it of block[key] || []) {
      if (it && it.asOfDate && it.reportedValue && it.reportedValue.raw !== undefined) items.push({ date: it.asOfDate, v: it.reportedValue.raw });
    }
  }
  items.sort((a, b) => (a.date < b.date ? -1 : 1));
  return items;
}

const aiRound = (n, d = 1) => (n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

async function aiGetStockData(symbol) {
  await aiGetNameMap();
  const sym = String(symbol || "").trim().toUpperCase().slice(0, 20);
  if (!/^[A-Z0-9.\-^=]+$/.test(sym)) return { error: "잘못된 티커입니다." };
  const [chart, fund, db] = await Promise.all([
    fetchYahooChart(sym, "1y", "1d").catch(() => null),
    fetchYahooFundamentals(
      sym,
      "annualBasicEPS,quarterlyTotalRevenue,quarterlyOperatingIncome,quarterlyNetIncome,quarterlyStockholdersEquity,quarterlyTotalLiabilitiesNetMinorityInterest"
    ).catch(() => null),
    aiGetWinrateDb(),
  ]);
  const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!result) return { error: `${sym} 시세를 가져오지 못했습니다. 티커를 확인하세요.` };
  const meta = result.meta;
  const closes = ((result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || []).filter((c) => c !== null && c !== undefined);
  const price = meta.regularMarketPrice;
  const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
  const ret = (n) => (closes.length > n && closes[closes.length - 1 - n] ? (closes[closes.length - 1] / closes[closes.length - 1 - n] - 1) * 100 : null);

  const arr = (fund && fund.timeseries && fund.timeseries.result) || [];
  const rev = aiSeries(arr, "quarterlyTotalRevenue");
  const opi = aiSeries(arr, "quarterlyOperatingIncome");
  const ni = aiSeries(arr, "quarterlyNetIncome");
  const eq = aiSeries(arr, "quarterlyStockholdersEquity");
  const liab = aiSeries(arr, "quarterlyTotalLiabilitiesNetMinorityInterest");
  const epsArr = aiSeries(arr, "annualBasicEPS");
  const last = (s) => (s.length ? s[s.length - 1].v : null);
  const lastRev = last(rev);
  const revYoY = rev.length >= 5 && rev[rev.length - 5].v ? (rev[rev.length - 1].v / rev[rev.length - 5].v - 1) * 100 : null;
  const eps = last(epsArr);

  let wr = null;
  if (db) {
    for (const k of ["scores", "scoresKr", "scoresEtf", "scoresCrypto"]) {
      if (db[k] && db[k][sym]) {
        wr = db[k][sym];
        break;
      }
    }
  }
  const out = {
    symbol: sym,
    name: (aiNameMapCache.rev && aiNameMapCache.rev[sym]) || meta.shortName || meta.longName || sym,
    currency: meta.currency,
    price: aiRound(price, 2),
    changePctToday: prev ? aiRound(((price - prev) / prev) * 100, 2) : null,
    return1mPct: aiRound(ret(21)),
    return3mPct: aiRound(ret(63)),
    return1yPct: aiRound(closes.length > 1 ? (closes[closes.length - 1] / closes[0] - 1) * 100 : null),
    week52High: meta.fiftyTwoWeekHigh ?? null,
    week52Low: meta.fiftyTwoWeekLow ?? null,
    week52PositionPct:
      meta.fiftyTwoWeekHigh > meta.fiftyTwoWeekLow ? aiRound(((price - meta.fiftyTwoWeekLow) / (meta.fiftyTwoWeekHigh - meta.fiftyTwoWeekLow)) * 100, 0) : null,
    revenueGrowthYoYPct: aiRound(revYoY),
    operatingMarginPct: lastRev && last(opi) !== null ? aiRound((last(opi) / lastRev) * 100) : null,
    roeQuarterPct: last(eq) > 0 && last(ni) !== null ? aiRound((last(ni) / last(eq)) * 100) : null,
    debtRatioPct: last(eq) > 0 && last(liab) !== null ? aiRound((last(liab) / last(eq)) * 100, 0) : null,
    per: eps > 0 && price ? aiRound(price / eps) : null,
    latestQuarterEnd: rev.length ? rev[rev.length - 1].date : null,
    winRate10yPct: wr ? wr.score : null,
    winRateLast12mPct: wr ? wr.wr1y : null,
    cagr10yPct: wr ? wr.ret10y : null,
    weeklyRsi: wr ? wr.rsi : null,
    monthlyReturnsLast12m: wr ? wr.m12 : null,
    note: "재무 비율은 직전 분기 기준, 값이 null이면 데이터 없음. 화면에는 차트 카드(1년 주가, 연간 매출·순이익, 월별 수익률, 지표)가 자동으로 함께 표시됨",
  };

  // 화면용 카드(모델에는 전달하지 않고 응답 cards로만 내려감) — 1년 종가 약 70점, 연간 매출·순이익(마켓맵 자체 수집 자료), 월별 수익률
  const rawClose = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const pairs = (result.timestamp || []).map((t, i) => [t, rawClose[i]]).filter((x) => x[1] !== null && x[1] !== undefined);
  const stepN = Math.max(1, Math.ceil(pairs.length / 70));
  const series = pairs.filter((_, i) => i % stepN === 0 || i === pairs.length - 1).map((x) => [x[0], aiRound(x[1], 2)]);
  let fin = null;
  try {
    const ann = await aiGetAnnualFin();
    const row = (ann.kr && ann.kr[sym]) || (ann.us && ann.us[sym]);
    if (row && row.years) {
      fin = Object.keys(row.years)
        .sort()
        .slice(-8)
        .map((y) => ({ y, rev: row.years[y].rev, ni: row.years[y].ni }));
      if (!fin.some((r) => r.rev !== null || r.ni !== null)) fin = null;
    }
  } catch {
    fin = null;
  }
  out._card = {
    symbol: sym,
    name: out.name,
    currency: out.currency,
    price: out.price,
    changePct: out.changePctToday,
    week: { low: out.week52Low, high: out.week52High, pos: out.week52PositionPct },
    returns: { m1: out.return1mPct, m3: out.return3mPct, y1: out.return1yPct },
    series,
    metrics: { revGrowth: out.revenueGrowthYoYPct, opMargin: out.operatingMarginPct, roe: out.roeQuarterPct, debt: out.debtRatioPct, per: out.per },
    win: wr ? { score: wr.score, wr1y: wr.wr1y, cagr: wr.ret10y, rsi: wr.rsi, m12: wr.m12 } : null,
    fin,
  };
  return out;
}

async function aiRunTool(name, input) {
  try {
    if (name === "search_symbol") return await aiSearchSymbol(input && input.query);
    if (name === "get_stock_data") return await aiGetStockData(input && input.symbol);
    return { error: "알 수 없는 도구" };
  } catch (e) {
    return { error: "도구 실행 실패: " + String(e).slice(0, 100) };
  }
}

// Worker 변수 AI_GATEWAY_URL(예: https://gateway.ai.cloudflare.com/v1/<계정ID>/<게이트웨이명>/anthropic)이 있으면 Cloudflare AI Gateway를 거쳐 호출 —
// Worker가 홍콩 서버에서 실행될 때 Anthropic이 403으로 거부하는 문제를 피하고 요청·비용 로그도 대시보드에서 볼 수 있다. 없으면 직접 호출.
function aiMessagesUrl(env) {
  const base = env.AI_GATEWAY_URL ? String(env.AI_GATEWAY_URL).replace(/\/+$/, "") : "https://api.anthropic.com";
  return base + "/v1/messages";
}

// Claude API 호출 — Cloudflare Worker의 나가는 주소에 따라 간헐적으로 403(Request not allowed)·5xx가 나므로 짧게 재시도
async function aiCallClaude(env, payload, opts) {
  const attempts = (opts && opts.attempts) || 4;
  let res;
  for (let attempt = 0; attempt < attempts; attempt++) {
    res = await fetch(aiMessagesUrl(env), {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload),
      ...(opts && opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    });
    if (res.ok || !(res.status === 403 || res.status === 429 || res.status >= 500)) return res;
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  return res;
}

async function handleAiChat(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "POST만 지원합니다." }, 405);
  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: "AI 기능을 준비 중입니다.", code: "not_configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }
  const raw = Array.isArray(body && body.messages) ? body.messages.slice(-10) : [];
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return jsonResponse({ error: "질문을 입력해주세요." }, 400);

  // 하루 사용 횟수 제한(IP 기준, KST 날짜)
  const AI_DAILY_LIMIT = parseInt(env.AI_DAILY_LIMIT, 10) > 0 ? parseInt(env.AI_DAILY_LIMIT, 10) : AI_DAILY_LIMIT_DEFAULT;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const rlKey = `ai_rl:${ip}:${day}`;
  let used = 0;
  if (env.CHAT_KV) {
    used = parseInt((await env.CHAT_KV.get(rlKey)) || "0", 10) || 0;
    if (used >= AI_DAILY_LIMIT) return jsonResponse({ error: `오늘 무료 질문 ${AI_DAILY_LIMIT}회를 모두 사용했습니다. 내일 다시 이용해주세요.`, code: "limit", remaining: 0 }, 429);
    await env.CHAT_KV.put(rlKey, String(used + 1), { expirationTtl: 2 * 86400 });
  }

  // 답변을 못 만든 경우엔 차감한 횟수를 돌려줌
  const refundQuota = async () => {
    if (env.CHAT_KV) await env.CHAT_KV.put(rlKey, String(used), { expirationTtl: 2 * 86400 }).catch(() => {});
  };

  const convo = [...messages];
  const cards = [];
  let reply = "";
  let lastStop = "";
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, rounds: 0 };
  try {
    for (let round = 0; round < AI_MAX_TOOL_ROUNDS; round++) {
      const payload = {
        model: env.AI_MODEL || AI_DEFAULT_MODEL,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        system: [{ type: "text", text: AI_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: AI_TOOLS,
        messages: convo,
      };
      // 추론 강도: 요청이 low/medium을 직접 지정(시험용, 비용이 올라가는 high는 불허)하거나 Worker 변수 AI_EFFORT를 따름
      const reqEffort = body && ["low", "medium"].indexOf(body.effort) >= 0 ? body.effort : null;
      const effort = reqEffort || (["low", "medium", "high"].indexOf(env.AI_EFFORT) >= 0 ? env.AI_EFFORT : null);
      if (effort) payload.output_config = { effort };
      const res = await aiCallClaude(env, payload);
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 200);
        await refundQuota();
        return jsonResponse({ error: "AI 응답을 가져오지 못했습니다.", detail, status: res.status }, 502);
      }
      const data = await res.json();
      const u = data.usage || {};
      usage.input += u.input_tokens || 0;
      usage.output += u.output_tokens || 0;
      usage.cacheRead += u.cache_read_input_tokens || 0;
      usage.cacheWrite += u.cache_creation_input_tokens || 0;
      usage.rounds += 1;
      const blocks = data.content || [];
      lastStop = data.stop_reason;
      if (data.stop_reason !== "tool_use") {
        reply = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
        break;
      }
      convo.push({ role: "assistant", content: blocks });
      const toolResults = [];
      for (const b of blocks) {
        if (b.type === "tool_use") {
          const out = await aiRunTool(b.name, b.input);
          if (out && out._card) {
            if (!cards.some((c) => c.symbol === out._card.symbol)) cards.push(out._card);
            delete out._card;
          }
          toolResults.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out).slice(0, 6000) });
        }
      }
      convo.push({ role: "user", content: toolResults });
    }
  } catch (e) {
    await refundQuota();
    return jsonResponse({ error: "AI 처리 중 오류가 발생했습니다.", detail: String(e).slice(0, 120) }, 502);
  }
  if (!reply) reply = "답변을 만들지 못했습니다. 질문을 조금 더 구체적으로 다시 해주세요.";
  return jsonResponse({ reply, cards, stop: lastStop, remaining: Math.max(0, AI_DAILY_LIMIT - used - 1), usage }, 200);
}

// ---------- GET /news-summary?symbol=AAPL&name=애플 — 최근 뉴스 5건을 AI가 쉬운 말로 요약 ----------
// 뉴스 목록은 마켓맵 상세의 "주요 뉴스"와 같은 출처(국내: 구글 뉴스 RSS → Bing 폴백, 그 외: Yahoo Finance)를 쓰고,
// 기사 제목만 근거로 정리한다(본문은 읽지 않음). 같은 종목은 15분 동안 결과를 재사용해 AI 호출을 아낀다.
function newsXmlTag(block, tag) {
  const m = block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function parseNewsRss(xml, isBing) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const link = newsXmlTag(block, "link");
    let publisher = newsXmlTag(block, "source");
    let title = newsXmlTag(block, "title");
    while (publisher && title.endsWith(" - " + publisher)) title = title.slice(0, -(publisher.length + 3));
    if (isBing && !publisher) {
      try {
        const inner = new URL(link).searchParams.get("url");
        if (inner) publisher = new URL(inner).hostname.replace(/^www\./, "");
      } catch {}
    }
    const t = Date.parse(newsXmlTag(block, "pubDate"));
    items.push({ title, link, publisher, time: isNaN(t) ? 0 : Math.floor(t / 1000) });
  }
  return items;
}
async function fetchNewsForSymbol(symbol, name) {
  const isKr = /\.(KS|KQ)$/i.test(symbol);
  if (isKr && name) {
    try {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent('"' + name + '"')}&hl=ko&gl=KR&ceid=KR:ko`, { headers: UPSTREAM_HEADERS, signal: AbortSignal.timeout(2500) });
      if (r.ok) {
        const items = parseNewsRss(await r.text(), false);
        if (items.length) return items;
      }
    } catch {}
    try {
      const r = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(name)}&format=RSS&mkt=ko-KR&setlang=ko`, { headers: UPSTREAM_HEADERS, signal: AbortSignal.timeout(2500) });
      if (r.ok) return parseNewsRss(await r.text(), true);
    } catch {}
    return [];
  }
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=20&quotesCount=1`, { headers: UPSTREAM_HEADERS, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return [];
    const j = await r.json();
    return ((j && j.news) || []).map((n) => ({ title: n.title || "", link: n.link || "", publisher: n.publisher || "", time: n.providerPublishTime || 0 }));
  } catch {
    return [];
  }
}
const NEWS_SYSTEM_PROMPT = [
  "당신은 주식을 처음 접하는 사람(주린이)에게 최근 뉴스를 쉽게 설명해 주는 도우미입니다. 한국어로 답합니다.",
  "입력: 회사명, 티커, 최근 뉴스 목록(번호·제목·출처·날짜). 기사 본문은 없고 제목만 있습니다.",
  "출력 형식(이 형식만, 다른 말·코드블록 금지):",
  "첫 줄: 요약: (이 회사에 최근 어떤 일이 있는지 핵심을 2~3문장으로 짧고 쉬운 말로, 마지막에 투자자가 알아둘 점 한 문장)",
  "그다음 뉴스마다 한 줄: 번호|한국어 제목|한 줄 쉬운 설명(30자 안팎)",
  "- 제목이 영어면 자연스럽게 번역하고, 한국어면 그대로 씁니다. '|' 문자는 내용에 쓰지 않습니다.",
  "- 제목에 없는 사실·원인·숫자를 지어내지 않습니다. 모르면 '제목만으로는 자세한 내용을 알 수 없어요'라고 씁니다.",
  "- 매수·매도 권유, 주가 예측, 수익 보장 표현은 쓰지 않습니다.",
].join("\n");

async function handleNewsSummary(request, env, url) {
  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: "AI 기능을 준비 중입니다.", code: "not_configured" }, 503);
  const symbol = (url.searchParams.get("symbol") || "").trim().slice(0, 20);
  const name = (url.searchParams.get("name") || "").trim().slice(0, 40);
  if (!symbol) return jsonResponse({ error: "symbol이 필요합니다." }, 400);

  const NEWS_BATCH = 3; // 한 번에 2~3건만 요약해 10초 안에 끝낸다
  const offset = Math.min(18, Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0)); // 0, 3, 6, … — 더보기마다 다음 3건
  const cacheKey = new Request("https://news-summary.cache/" + encodeURIComponent(symbol) + "/" + offset);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, { status: 200, headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS_HEADERS } });

  const monthAgo = Date.now() / 1000 - 30 * 86400;
  const all = (await fetchNewsForSymbol(symbol, name))
    .filter((n) => n.title && (!n.time || n.time >= monthAgo))
    .sort((a, b) => (b.time || 0) - (a.time || 0));
  const top = all.slice(offset, offset + NEWS_BATCH);
  if (!top.length) return jsonResponse({ symbol, name, empty: true, done: offset > 0, summary: "", items: [] }, 200);

  const payload = {
    model: env.AI_MODEL || AI_DEFAULT_MODEL,
    max_tokens: 1200, // 모델 내부 처리에 쓰는 토큰이 포함돼 너무 낮으면 답이 중간에 끊긴다
    output_config: { effort: "low" }, // 추론을 줄여 10초 안에 끝낸다
    system: [{ type: "text", text: NEWS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          회사명: name || symbol,
          티커: symbol,
          뉴스: top.map((n, i) => ({ i: i + 1, 제목: n.title, 출처: n.publisher, 날짜: n.time ? new Date(n.time * 1000).toISOString().slice(0, 10) : "" })),
        }),
      },
    ],
  };
  let res;
  try {
    res = await aiCallClaude(env, payload, { attempts: 2, timeoutMs: 8000 }); // 전체 10초 안에 끝내기 위해 짧게
  } catch (e) {
    return jsonResponse({ error: "AI 요약이 오래 걸려 중단했습니다.", code: "timeout" }, 504);
  }
  if (!res.ok) return jsonResponse({ error: "AI 요약을 만들지 못했습니다.", status: res.status }, 502);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  // 줄 형식 파싱: "요약: …" + "번호|제목|설명" (JSON보다 어긋날 일이 적다)
  let summary = "";
  const byI = new Map();
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    const ms = s.match(/^요약\s*[:：]\s*(.+)$/);
    if (ms) {
      summary = ms[1].trim();
      continue;
    }
    const mi = s.match(/^(\d+)\s*[.)]?\s*\|\s*(.+?)\s*\|\s*(.+)$/);
    if (mi) byI.set(parseInt(mi[1], 10), { ko: mi[2].trim(), gist: mi[3].trim() });
  }
  if (!summary) return jsonResponse({ error: "AI 요약 형식을 읽지 못했습니다.", stop: data.stop_reason, got: text.slice(0, 200) }, 502);
  const parsed = { summary };
  const out = {
    symbol,
    name,
    summary: parsed.summary,
    items: top.map((n, i) => {
      const x = byI.get(i + 1) || byI.get(i) || {};
      return {
        title: (x.ko || n.title || "").slice(0, 200),
        gist: (x.gist || "").slice(0, 120),
        link: n.link,
        publisher: n.publisher,
        date: n.time ? new Date(n.time * 1000).toISOString().slice(0, 10) : "",
      };
    }),
    total: all.length,
    offset,
    hasMore: all.length > offset + NEWS_BATCH,
    // 스톡챗 하루 토큰 게이지용(입력+출력+캐시 쓰기, 캐시 읽기는 10%로 환산)
    usage: (() => {
      const u = data.usage || {};
      return { tokens: Math.round((u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) * 0.1) };
    })(),
  };
  const resp = new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900", ...CORS_HEADERS } });
  await cache.put(cacheKey, resp.clone());
  return resp;
}

// ---------- GET /dividends?symbol=AAPL — 최근 1년 배당 내역(배당락일·배당금·배당률·지급일·컷 표시) ----------
// 배당금·배당락일·주가는 Yahoo 차트의 배당 이벤트(한국·미국 공통), 지급일은 미국 종목에 한해 Nasdaq 배당 일정에서 맞춰 붙인다
// (한국 종목은 지급일을 알려주는 무료 자료가 없어 비워 둔다). 컷 판정은 2년치로 하되 화면에는 1년치만 내려준다. 6시간 재사용.
function divIsoFromMdy(s) {
  const m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : "";
}
async function fetchNasdaqDividendRows(symbol) {
  for (const cls of ["stocks", "etf"]) {
    try {
      const r = await fetch(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/dividends?assetclass=${cls}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36", Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const rows = j && j.data && j.data.dividends && j.data.dividends.rows;
      if (rows && rows.length) return rows;
    } catch {}
  }
  return null;
}
function divFrequencyLabel(n) {
  if (n >= 9) return "월배당";
  if (n >= 6) return "격월배당";
  if (n >= 3) return "분기배당";
  if (n === 2) return "반기배당";
  if (n === 1) return "연배당";
  return "불규칙 배당";
}
async function handleDividends(request, env, url) {
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase().slice(0, 20);
  if (!symbol) return jsonResponse({ error: "symbol이 필요합니다." }, 400);
  const cacheKey = new Request("https://dividends.cache/v2/" + encodeURIComponent(symbol));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, { status: 200, headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS_HEADERS } });

  let chart;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&events=div`, { headers: UPSTREAM_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return jsonResponse({ symbol, hasDividend: false, error: "시세 자료를 가져오지 못했습니다." }, 200);
    chart = await r.json();
  } catch {
    return jsonResponse({ symbol, hasDividend: false, error: "시세 자료를 가져오지 못했습니다." }, 200);
  }
  const res0 = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  const evs = res0 && res0.events && res0.events.dividends ? Object.values(res0.events.dividends) : [];
  if (!res0 || !evs.length) return jsonResponse({ symbol, hasDividend: false }, 200);

  const ts = res0.timestamp || [];
  const closes = (res0.indicators && res0.indicators.quote && res0.indicators.quote[0] && res0.indicators.quote[0].close) || [];
  const isoOf = (sec) => new Date(sec * 1000).toISOString().slice(0, 10);
  // 배당락일 직전 거래일 종가(없으면 그날 종가)
  const priceBefore = (sec) => {
    let best = null;
    let same = null;
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] == null) continue;
      if (ts[i] < sec - 3600) best = closes[i];
      else if (Math.abs(ts[i] - sec) <= 86400) same = closes[i];
    }
    return best != null ? best : same;
  };
  const all = evs.map((e) => ({ ts: e.date, amount: e.amount })).sort((a, b) => a.ts - b.ts); // 오래된 → 최근
  const now = Date.now() / 1000;
  const yearAgo = now - 365 * 86400;
  const recent = all.filter((d) => d.ts >= yearAgo);
  const n = Math.max(1, recent.length);
  const perYear = Math.min(12, n);
  const amounts = recent.map((d) => d.amount).sort((a, b) => a - b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;

  // 미국: Nasdaq에서 지급일·예정 배당 붙이기
  const isKr = /\.(KS|KQ)$/i.test(symbol);
  const isUsLike = !isKr && !/-USD$/i.test(symbol) && !/[\^=]/.test(symbol);
  const nas = isUsLike ? await fetchNasdaqDividendRows(symbol) : null;
  const payByEx = new Map();
  const upcoming = [];
  const todayIso = new Date().toISOString().slice(0, 10);
  (nas || []).forEach((r) => {
    const ex = divIsoFromMdy(r.exOrEffDate);
    const pay = divIsoFromMdy(r.paymentDate);
    const amt = parseFloat(String(r.amount || "").replace(/[^0-9.]/g, ""));
    if (ex) payByEx.set(ex, pay);
    if (ex && ex >= todayIso && Number.isFinite(amt)) upcoming.push({ exDate: ex, payDate: pay || null, amount: amt });
  });

  const isSpecial = (amt) => median > 0 && amt >= median * 1.4; // 평소보다 훨씬 큰 배당(결산·특별배당 등)
  const rows = all.map((d, i) => {
    // 자주 주면 직전 '정기' 배당과, 드물게 주면 작년 같은 때와 비교(특별배당은 비교 기준에서 뺀다)
    let base = null;
    if (perYear >= 3) {
      for (let k = i - 1; k >= 0; k--) {
        if (!isSpecial(all[k].amount)) {
          base = all[k].amount;
          break;
        }
      }
    } else if (i - perYear >= 0) base = all[i - perYear].amount;
    const chg = base ? ((d.amount - base) / base) * 100 : null;
    const price = priceBefore(d.ts);
    const exDate = isoOf(d.ts);
    let tag = "";
    if (chg != null && !isSpecial(d.amount)) {
      if (chg <= -30) tag = "cut"; // 배당 컷
      else if (chg <= -10) tag = "down";
      else if (chg >= 10) tag = "up";
    }
    const special = isSpecial(d.amount);
    return {
      exDate,
      payDate: payByEx.get(exDate) || null,
      amount: d.amount,
      price: price != null ? price : null,
      yieldPct: price ? (d.amount / price) * 100 : null,
      changePct: chg,
      tag,
      special,
    };
  });
  const shown = rows.filter((r) => r.exDate >= isoOf(yearAgo)).reverse(); // 최근이 위
  upcoming.forEach((u) => {
    if (!shown.some((r) => r.exDate === u.exDate)) shown.unshift({ exDate: u.exDate, payDate: u.payDate, amount: u.amount, price: null, yieldPct: null, changePct: null, tag: "", special: false, upcoming: true });
  });

  // 다음 배당이 아직 공시되지 않았으면 지난 주기·금액으로 "예상" 한 줄을 만든다(확정이 아니라 estimated 표시)
  const priceNow0 = res0.meta && res0.meta.regularMarketPrice;
  if (!shown.some((r) => r.upcoming)) {
    const gaps = [];
    for (let i = 1; i < all.length; i++) gaps.push((all[i].ts - all[i - 1].ts) / 86400);
    const tail = gaps.slice(-Math.max(1, Math.min(gaps.length, perYear))).sort((a, b) => a - b);
    const gap = perYear <= 2 ? 365 / perYear : tail.length ? tail[Math.floor(tail.length / 2)] : 365 / perYear;
    const L = all.length;
    let nextTs = perYear <= 2 && L - perYear >= 0 ? all[L - perYear].ts + 365 * 86400 : all[L - 1].ts + gap * 86400;
    while (nextTs <= now) nextTs += gap * 86400;
    let estAmt = null;
    if (perYear <= 2 && L - perYear >= 0) estAmt = all[L - perYear].amount; // 드물게 주면 작년 같은 때 금액
    else for (let k = L - 1; k >= 0; k--) if (!isSpecial(all[k].amount)) { estAmt = all[k].amount; break; }
    if (estAmt == null) estAmt = all[L - 1].amount;
    const lags = [];
    all.slice(-perYear - 1).forEach((d) => {
      const ex = isoOf(d.ts);
      const pay = payByEx.get(ex);
      if (pay) lags.push((Date.parse(pay) - Date.parse(ex)) / 86400000);
    });
    lags.sort((a, b) => a - b);
    const lag = lags.length ? lags[Math.floor(lags.length / 2)] : null;
    const exIso = isoOf(nextTs);
    shown.unshift({
      exDate: exIso,
      payDate: lag != null ? new Date(Date.parse(exIso) + lag * 86400000).toISOString().slice(0, 10) : null,
      amount: estAmt,
      price: priceNow0 || null,
      yieldPct: priceNow0 ? (estAmt / priceNow0) * 100 : null,
      changePct: null,
      tag: "",
      special: false,
      upcoming: true,
      estimated: true,
    });
  }

  const lastTs = recent.length ? recent[recent.length - 1].ts : all[all.length - 1].ts;
  const expectedGapDays = 365 / perYear;
  const delayed = (now - lastTs) / 86400 > expectedGapDays * 1.6 && !upcoming.length; // 예정보다 오래 안 줌
  const priceNow = res0.meta && res0.meta.regularMarketPrice;
  const annual = recent.reduce((s, d) => s + d.amount, 0);
  const out = {
    symbol,
    hasDividend: shown.length > 0,
    currency: (res0.meta && res0.meta.currency) || "",
    frequency: divFrequencyLabel(recent.length),
    countLastYear: recent.length,
    price: priceNow || null,
    annualAmount: annual,
    annualYieldPct: priceNow ? (annual / priceNow) * 100 : null,
    delayed,
    payDateAvailable: !!nas,
    rows: shown,
  };
  const resp = new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=21600", ...CORS_HEADERS } });
  await cache.put(cacheKey, resp.clone());
  return resp;
}

// ---------- GET /outlook?symbol=TSLA&name=테슬라&mode=general|personal — 종목 전망(주린이용 요약) ----------
// general: 요약 + 최근 상황 3줄 + 상승 요인 + 하락 위험. personal: 이용자의 상황(보유 상태·투자 기간·감내 하락·보유 단가)에 맞춘 결론·포인트·체크.
// 근거는 시세·재무·승률(aiGetStockData) + 최근 뉴스 제목 + 다음 실적 발표일뿐이고, 목표주가·가격 예측은 하지 않는다. general은 20분 재사용.
const OUTLOOK_SYSTEM_GENERAL = [
  "당신은 주식을 처음 접하는 사람(주린이)에게 종목의 앞으로 전망을 쉽게 설명해 주는 도우미입니다. 한국어로 답합니다.",
  "입력: JSON(종목명, 티커, 시세·재무·승률 지표, 다음 실적 발표일, 최근 뉴스 제목들).",
  "출력 형식(이 형식만, 다른 말·코드블록 금지):",
  "한줄: (이 종목 전망에서 가장 중요한 내용을 한 줄로, 45자 안팎. 결론이 먼저 보이게)",
  "요약: (이 종목의 앞으로 흐름에서 가장 중요한 점을 2~3문장으로, 쉬운 말로. 가장 중요한 말 2~3군데를 **이렇게** 별표 두 개로 감싸 굵게 표시)",
  "상황|(최근 상황 한 줄, 60자 이내) — 3줄",
  "상승|(주가가 오를 수 있는 요인 한 줄) — 2~3줄",
  "위험|(주가가 내릴 수 있는 위험 한 줄) — 2~3줄",
  "규칙:",
  "- 입력에 있는 사실·숫자만 씁니다. 없는 숫자·날짜·원인을 지어내지 않습니다. 모르면 생략합니다.",
  "- 목표주가·가격 예측·수익 보장·매수/매도 권유는 쓰지 않습니다. '오를 수 있다/내릴 수 있다' 같은 가능성 표현만 씁니다.",
  "- 전문 용어는 풀어서 씁니다(예: PER은 이익 대비 주가가 비싼 정도). '|' 문자는 내용에 쓰지 않습니다.",
].join("\n");
const OUTLOOK_SYSTEM_PERSONAL = [
  "당신은 주식을 처음 접하는 사람(주린이)에게, 그 사람의 상황에 맞춰 종목을 어떻게 보면 좋은지 쉽게 알려 주는 도우미입니다. 한국어로 답합니다.",
  "입력: JSON(종목명, 티커, 시세·재무·승률 지표, 다음 실적 발표일, 최근 뉴스 제목들, 이용자 상황과 계산값).",
  "출력 형식(이 형식만, 다른 말·코드블록 금지):",
  "결론: (이 이용자 상황에서 이 종목을 볼 때 가장 중요한 점 1~2문장. 핵심 말 1~2군데를 **이렇게** 별표 두 개로 감싸 굵게 표시)",
  "포인트|(상황에 맞는 해석 한 줄) — 3~4줄. 투자 기간에 맞는 볼 거리, 감내 가능한 하락폭과 이 종목의 변동성·52주 낙폭 비교, 보유 단가가 있으면 현재가와의 위치를 다룹니다.",
  "체크|(앞으로 확인하면 좋은 일정·지표 한 줄) — 2~3줄",
  "규칙:",
  "- 입력에 있는 사실·숫자와 계산값만 씁니다. 지어내지 않습니다.",
  "- 목표주가·가격 예측·수익 보장은 쓰지 않고, '사세요/파세요/더 사야 한다' 같은 매수·매도 지시도 하지 않습니다. 판단 재료만 줍니다.",
  "- 전문 용어는 풀어서 씁니다. '|' 문자는 내용에 쓰지 않습니다. 마지막에 면책 문구는 따로 쓰지 않습니다(화면이 붙입니다).",
].join("\n");

async function outlookNextEarnings(symbol) {
  try {
    const r = await fetch("https://marketmap.kr/data/earnings-calendar.json", { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const j = await r.json();
    const e = (j.us && j.us[symbol]) || (j.kr && j.kr[symbol]);
    return e && e.next ? e.next : null;
  } catch {
    return null;
  }
}
function outlookParseLines(text) {
  const out = { headline: "", summary: "", conclusion: "", situation: [], upsides: [], risks: [], points: [], checks: [] };
  for (const line of String(text || "").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let m;
    if ((m = s.match(/^한줄\s*[:：]\s*(.+)$/))) out.headline = m[1].trim().replace(/\*\*/g, "");
    else if ((m = s.match(/^요약\s*[:：]\s*(.+)$/))) out.summary = m[1].trim();
    else if ((m = s.match(/^결론\s*[:：]\s*(.+)$/))) out.conclusion = m[1].trim();
    else if ((m = s.match(/^상황\s*\|\s*(.+)$/))) out.situation.push(m[1].trim());
    else if ((m = s.match(/^상승\s*\|\s*(.+)$/))) out.upsides.push(m[1].trim());
    else if ((m = s.match(/^위험\s*\|\s*(.+)$/))) out.risks.push(m[1].trim());
    else if ((m = s.match(/^포인트\s*\|\s*(.+)$/))) out.points.push(m[1].trim());
    else if ((m = s.match(/^체크\s*\|\s*(.+)$/))) out.checks.push(m[1].trim());
  }
  return out;
}
async function handleOutlook(request, env, url) {
  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: "AI 기능을 준비 중입니다.", code: "not_configured" }, 503);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase().slice(0, 20);
  const nameIn = (url.searchParams.get("name") || "").trim().slice(0, 40);
  const mode = url.searchParams.get("mode") === "personal" ? "personal" : "general";
  if (!symbol) return jsonResponse({ error: "symbol이 필요합니다." }, 400);

  // 이용자 상황(personal)
  const status = ["holding", "considering", "adding"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "holding";
  const horizon = ["short", "mid", "long"].includes(url.searchParams.get("horizon")) ? url.searchParams.get("horizon") : "mid";
  const riskPct = Math.min(80, Math.max(5, parseInt(url.searchParams.get("risk") || "25", 10) || 25));
  const costRaw = parseFloat(url.searchParams.get("cost") || "");
  const cost = Number.isFinite(costRaw) && costRaw > 0 ? costRaw : null;

  const cacheKey = new Request("https://outlook.cache/v2/" + encodeURIComponent(symbol));
  const cache = caches.default;
  if (mode === "general") {
    const hit = await cache.match(cacheKey);
    if (hit) return new Response(hit.body, { status: 200, headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS_HEADERS } });
  }

  const monthAgo = Date.now() / 1000 - 30 * 86400;
  const [sd, newsAll, nextEarn] = await Promise.all([aiGetStockData(symbol).catch(() => null), fetchNewsForSymbol(symbol, nameIn).catch(() => []), outlookNextEarnings(symbol)]);
  if (!sd || sd.error) return jsonResponse({ error: (sd && sd.error) || "종목 자료를 가져오지 못했습니다." }, 502);
  delete sd._card;
  delete sd.note;
  const news = (newsAll || [])
    .filter((n) => n.title && (!n.time || n.time >= monthAgo))
    .sort((a, b) => (b.time || 0) - (a.time || 0))
    .slice(0, 6)
    .map((n) => ({ 제목: n.title, 출처: n.publisher, 날짜: n.time ? new Date(n.time * 1000).toISOString().slice(0, 10) : "" }));
  const name = nameIn || sd.name || symbol;

  const input = { 종목명: name, 티커: symbol, 지표: sd, 다음실적발표일: nextEarn, 최근뉴스: news };
  // 계산값(이용자 화면에도 쓰임)
  const price = sd.price;
  const numbers = {
    price,
    currency: sd.currency,
    nextEarnings: nextEarn,
    w52High: sd.week52High,
    w52Low: sd.week52Low,
    fromHighPct: sd.week52High && price ? ((price / sd.week52High - 1) * 100) : null,
    fromLowPct: sd.week52Low && price ? ((price / sd.week52Low - 1) * 100) : null,
  };
  if (mode === "personal") {
    const statusKo = { holding: "이미 보유 중", considering: "신규 매수를 고민 중", adding: "보유 중이며 추가 매수 고민 중" }[status];
    const horizonKo = { short: "단기(1~3개월)", mid: "중기(6개월~1년)", long: "장기(3년 이상)" }[horizon];
    numbers.riskPct = riskPct;
    numbers.toleranceLowPrice = price ? price * (1 - riskPct / 100) : null;
    numbers.cost = cost;
    numbers.costPnlPct = cost && price ? ((price / cost - 1) * 100) : null;
    input.이용자상황 = { 투자상태: statusKo, 투자기간: horizonKo, 감내가능하락폭퍼센트: riskPct, 보유단가: cost, 계산값: { 현재가: price, 감내하락시가격: numbers.toleranceLowPrice, 보유단가대비손익퍼센트: numbers.costPnlPct, 최근1년변동폭_52주고점대비퍼센트: numbers.fromHighPct } };
  }

  const payload = {
    model: env.AI_MODEL || AI_DEFAULT_MODEL,
    max_tokens: 1200,
    output_config: { effort: "low" },
    system: [{ type: "text", text: mode === "personal" ? OUTLOOK_SYSTEM_PERSONAL : OUTLOOK_SYSTEM_GENERAL, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(input) }],
  };
  let res;
  try {
    res = await aiCallClaude(env, payload, { attempts: 2, timeoutMs: 8500 });
  } catch (e) {
    return jsonResponse({ error: "AI 전망이 오래 걸려 중단했습니다.", code: "timeout" }, 504);
  }
  if (!res.ok) return jsonResponse({ error: "AI 전망을 만들지 못했습니다.", status: res.status }, 502);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const p = outlookParseLines(text);
  if (mode === "general" ? !p.summary : !p.conclusion) return jsonResponse({ error: "AI 전망 형식을 읽지 못했습니다.", stop: data.stop_reason, got: text.slice(0, 200) }, 502);
  const u = data.usage || {};
  const out = {
    symbol,
    name,
    mode,
    ...p,
    numbers,
    usage: { tokens: Math.round((u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) * 0.1) },
  };
  const resp = new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", ...(mode === "general" ? { "Cache-Control": "public, max-age=1200" } : {}), ...CORS_HEADERS } });
  if (mode === "general") await cache.put(cacheKey, resp.clone());
  return resp;
}

// GET /stock-card?symbol=005930.KS — AI 없이 종목 카드 데이터(1년 주가·지표·연간 매출/순이익·승률)만 돌려줌. 스톡챗의 버튼 선택 화면용(5분 캐시).
async function handleStockCard(request) {
  const sym = (new URL(request.url).searchParams.get("symbol") || "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,20}$/.test(sym)) return jsonResponse({ error: "잘못된 티커입니다." }, 400);
  let cache = null;
  let key = null;
  try {
    cache = caches.default;
    key = new Request("https://stockchat-cache.invalid/card/" + encodeURIComponent(sym));
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch {
    cache = null;
  }
  const out = await aiGetStockData(sym);
  if (out.error || !out._card) return jsonResponse({ error: out.error || "데이터를 가져오지 못했습니다." }, 404);
  const body = JSON.stringify({ card: out._card });
  if (cache && key) {
    try {
      await cache.put(key, new Response(body, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } }));
    } catch {
      /* 캐시를 못 써도 응답은 그대로 */
    }
  }
  return new Response(body, { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

// POST /answer — 스톡챗 3단계 답변의 1단계: 질문 이해 + 우리 자료 요약. 전망·예측을 물은 경우(mode=outlook)에만 낙관·비관(베스트·워스트) 시나리오를 각 최대 6줄 덧붙인다.
// 스톡챗이 보낸 자료 수치만 근거로 쓴다.
const ANSWER_BASE = [
  "당신은 증권 정보 앱 StockCHAT의 답변 도우미입니다. 사용자가 투자 초보일 수 있으니 쉬운 한국어로 짧게 답합니다.",
  "입력(JSON): 질문, 자료(우리가 가진 수치·목록). 자료에 있는 숫자와 사실만 근거로 쓰고, 자료에 없는 숫자·사실·전망 수치는 만들지 않습니다.",
  "입력에 요약초점이 있으면 요약 줄을 그 순서·초점대로 씁니다(예: 현재 주가 → 배당률 → 그래서 받을 것으로 예상되는 금액).",
  "수치는 숫자만 나열하지 말고 그래서 높은 편인지 낮은 편인지 쉬운 말로 한 마디 풀어 줍니다. 일반적인 기준: 부채비율 100% 이하 낮은 편(안정적)·200% 이상 높은 편(빚이 많은 편), PER 10배 미만 낮은 편(싸다는 뜻)·25배 이상 높은 편(비싸다는 뜻), 10년월간승률 60% 이상 높은 편·50% 안팎 보통, 52주 구간 위치 20% 이하 바닥 근처·80% 이상 고점 근처, 과열도(RSI) 30 이하 침체·70 이상 과열, 배당률 1% 미만 낮은 편·3% 이상 높은 편, ROE 10% 이상 양호. 같은 종류의 수치는 한 줄로 묶어 6줄 안에 정리합니다.",
  "문장에 '자료에 있는', '자료에는', '자료에 따르면', '제공된 자료' 같은 출처·자료 언급을 쓰지 않고 사실만 바로 말합니다. 정보가 없는 항목은 아예 언급하지 않습니다('없습니다'라고 쓰지 않음). 질문과 관계없는 수치는 덧붙이지 않습니다.",
  "출력 형식(이 형식만, 다른 말·코드블록 금지):",
  "이해: (질문이 무엇을 알고 싶은 것인지 1문장으로 풀어 씀. '자료'·'지표로 판단' 같은 말 없이 질문 내용만. 핵심 말 1~2군데를 **이렇게** 굵게. 질문이 '사도 되나·팔까·들어가도 되나' 같은 매수·매도 판단이면 반드시 이 형태로: '삼성전자를 지금 사도 되는지에 대한 결정은 할 수 없지만, 참고하실 만한 관련 내용을 보여드릴게요.' (종목·행동은 질문에 맞게))",
].join("\n");
const ANSWER_SUMMARY = ANSWER_BASE + "\n" + [
  "요약|(자료에 근거한 핵심 내용 한 줄. 최대 6줄까지 줄마다 이 형식으로. 중요한 부분은 **굵게**)",
  "규칙: 요약은 6줄을 넘기지 않습니다. 자료가 전혀 없으면 요약 줄은 쓰지 않습니다. 전망·예측·시나리오는 쓰지 않고 지금 자료로 알 수 있는 사실만 요약합니다.",
  "매수·매도를 권유하거나 목표주가·수익을 단정하지 않습니다.",
].join("\n");
const ANSWER_OUTLOOK = ANSWER_BASE + "\n" + [
  "낙관|(자료에 근거한 긍정적 시나리오(베스트) 한 줄. 최대 6줄까지 줄마다 이 형식으로. 중요한 부분은 **굵게**)",
  "비관|(자료에 근거한 부정적 시나리오(워스트)·위험 한 줄. 최대 6줄까지 줄마다 이 형식으로. 중요한 부분은 **굵게**)",
  "규칙: 낙관·비관은 각각 6줄을 넘기지 않습니다. 자료가 빈약하면 줄 수를 줄이고, 자료가 전혀 없으면 낙관·비관 줄은 쓰지 않습니다.",
  "매수·매도를 권유하거나 목표주가·수익을 단정하지 않습니다. '~할 수 있어요' 같은 가능성 표현을 씁니다.",
].join("\n");
function answerParse(text) {
  const out = { understand: "", summary: [], best: [], worst: [] };
  String(text || "").split(/\r?\n/).forEach((line) => {
    const s = line.trim();
    let m;
    if ((m = s.match(/^이해\s*[:：]\s*(.+)$/))) out.understand = m[1].trim();
    else if ((m = s.match(/^요약\s*[|:：]\s*(.+)$/)) && out.summary.length < 6) out.summary.push(m[1].trim());
    else if ((m = s.match(/^낙관\s*[|:：]\s*(.+)$/)) && out.best.length < 6) out.best.push(m[1].trim());
    else if ((m = s.match(/^비관\s*[|:：]\s*(.+)$/)) && out.worst.length < 6) out.worst.push(m[1].trim());
  });
  return out;
}
const ANSWER_PARTS = [
  "당신은 증권 정보 앱 StockCHAT의 답변 도우미입니다. 투자 초보도 이해하게 쉬운 한국어로, 자료 화면마다 위에 붙일 짧은 설명을 씁니다.",
  "입력(JSON): 질문, 종목, 필요한_부분(쓸 부분 이름 목록), 자료. 자료에 있는 숫자와 사실만 근거로 쓰고 없는 숫자는 만들지 않습니다.",
  "문장에 '자료에 있는', '자료에는', '제공된 자료' 같은 출처 언급을 쓰지 않고 사실만 바로 말합니다. 정보가 없으면 그 내용은 언급하지 않습니다.",
  "숫자를 나열하지 말고 주요한 것만 문장으로 풀어 씁니다. 부분마다 1~2문장, 중요한 부분은 **굵게**. 매수·매도를 권유하거나 목표주가를 단정하지 않습니다.",
  "출력 형식(필요한_부분에 있는 것만, 이 형식만, 다른 말·코드블록 금지): 부분이름|내용   (한 줄에 한 부분. 부분이름은 반드시 필요한_부분에 적힌 이름 그대로, 질문을 되풀이하지 않음)",
  "앞|현재 주가에 대한 한 줄 설명(현재가·오늘 등락·52주 가격대 위치 중 핵심). 질문이 '사도 되나·팔까' 같은 매수·매도 판단이면 문장 맨 앞에 '삼성전자를 지금 사도 되는지에 대한 결정은 할 수 없지만, 참고하실 만한 내용을 보여드릴게요.' 형태(종목·행동은 질문에 맞게)를 먼저 쓰고 이어서 현재 주가 1줄.",
  "핵심지표|입력의 핵심지표에서 경고(⚠️) 표시가 있으면 먼저 '현재 1일 변동성이 3.8%로 매우 높아 투자에 유의하시기 바랍니다.'처럼 유의하라고 짚고, 이어서 좋음(🔥) 표시가 있으면 '하지만 매출 성장이 +130%로 좋은 편이에요.'처럼 장점을 연결합니다. 둘 다 없으면 눈에 띄는 수치 1~2개만 높은 편/낮은 편으로 풀어 줍니다.",
  "리스크|입력의 리스크에서 위험·주의로 표시된 것만 짚습니다(양호 항목은 말하지 않음). 위험·주의가 하나도 없으면 '뚜렷한 위험 신호는 없어요.' 한 문장.",
  "배당|현재 주가 → 연 배당수익률 → 그래서 1주당 1년에 받을 것으로 예상되는 배당금(최근 1년 합계 기준) 순서로 2문장.",
  "재무|매출·이익 성장 수치 중 핵심만, 좋은 점과 유의할 점을 한 문장씩.",
  "기준: 부채비율 100% 이하 낮은 편·200% 이상 높은 편, PER 10배 미만 낮은 편·25배 이상 높은 편, 10년월간승률 60% 이상 높은 편·50% 안팎 보통, 52주 구간 위치 20% 이하 바닥 근처·80% 이상 고점 근처, 배당률 1% 미만 낮은 편·3% 이상 높은 편.",
].join("\n");
function answerPartsParse(text) {
  const out = {};
  String(text || "").split(/\r?\n/).forEach((line) => {
    const m = line.trim().match(/^(앞|핵심지표|리스크|배당|재무|개요)\s*[|:：]\s*(.+)$/);
    if (m && !out[m[1]]) out[m[1]] = m[2].trim();
  });
  return out;
}
async function handleAnswer(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "POST만 지원합니다." }, 405);
  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: "AI 기능을 준비 중입니다.", code: "not_configured" }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }
  const question = String((body && body.question) || "").trim().slice(0, 300);
  if (!question) return jsonResponse({ error: "질문이 필요합니다." }, 400);
  if (body && body.mode === "parts") {
    const need = Array.isArray(body.need) ? body.need.filter((x) => typeof x === "string").slice(0, 6) : [];
    const pPayload = {
      model: env.AI_MODEL || AI_DEFAULT_MODEL,
      max_tokens: 700,
      output_config: { effort: "low" },
      system: [{ type: "text", text: ANSWER_PARTS, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: JSON.stringify({ 질문: String(body.question || "").slice(0, 200), 종목: String(body.name || "").slice(0, 40), 필요한_부분: need, 자료: JSON.parse(JSON.stringify(body.facts || []).slice(0, 4000)) }) }],
    };
    let pr;
    try {
      pr = await aiCallClaude(env, pPayload, { attempts: 2, timeoutMs: 8500 });
    } catch (e) {
      return jsonResponse({ error: "AI 설명이 오래 걸려 중단했습니다.", code: "timeout" }, 504);
    }
    if (!pr.ok) return jsonResponse({ error: "AI 설명을 만들지 못했습니다.", status: pr.status }, 502);
    const pd = await pr.json();
    const ptext = (pd.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const parts = answerPartsParse(ptext);
    // AI가 부분 이름을 엉뚱하게 쓴 경우(예: 질문을 되풀이) — 필요한 부분이 하나면 '|' 뒤 내용을 그 부분으로
    if (need.length === 1 && !parts[need[0]]) {
      const ln = ptext.split(/\r?\n/).map((x) => x.trim()).find((x) => x.includes("|"));
      if (ln) parts[need[0]] = ln.slice(ln.indexOf("|") + 1).trim();
    }
    if (!Object.keys(parts).length) return jsonResponse({ error: "AI 설명 형식을 읽지 못했습니다.", got: ptext.slice(0, 200) }, 502);
    const pu = pd.usage || {};
    return new Response(JSON.stringify({ parts, usage: { tokens: Math.round((pu.input_tokens || 0) + (pu.output_tokens || 0) + (pu.cache_creation_input_tokens || 0) + (pu.cache_read_input_tokens || 0) * 0.1) } }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  const outlookMode = !!(body && body.mode === "outlook");
  const focus = String((body && body.focus) || "").slice(0, 160);
  const facts = JSON.stringify((body && body.facts) || []).slice(0, 4000);
  const payload = {
    model: env.AI_MODEL || AI_DEFAULT_MODEL,
    max_tokens: 900,
    output_config: { effort: "low" },
    system: [{ type: "text", text: outlookMode ? ANSWER_OUTLOOK : ANSWER_SUMMARY, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify({ 질문: question, ...(focus ? { 요약초점: focus } : {}), 자료: JSON.parse(facts) }) }],
  };
  let res;
  try {
    res = await aiCallClaude(env, payload, { attempts: 2, timeoutMs: 8500 });
  } catch (e) {
    return jsonResponse({ error: "AI 요약이 오래 걸려 중단했습니다.", code: "timeout" }, 504);
  }
  if (!res.ok) return jsonResponse({ error: "AI 요약을 만들지 못했습니다.", status: res.status }, 502);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const p = answerParse(text);
  if (!p.understand) return jsonResponse({ error: "AI 요약 형식을 읽지 못했습니다.", got: text.slice(0, 200) }, 502);
  const u = data.usage || {};
  return new Response(JSON.stringify({ ...p, usage: { tokens: Math.round((u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) * 0.1) } }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/news-summary") {
      return handleNewsSummary(request, env, requestUrl);
    }

    if (requestUrl.pathname === "/dividends") {
      return handleDividends(request, env, requestUrl);
    }

    if (requestUrl.pathname === "/outlook") {
      return handleOutlook(request, env, requestUrl);
    }

    if (requestUrl.pathname === "/answer") {
      return handleAnswer(request, env);
    }

    if (requestUrl.pathname === "/stock-card") {
      return handleStockCard(request);
    }

    if (requestUrl.pathname === "/ai-chat") {
      return handleAiChat(request, env);
    }

    if (requestUrl.pathname === "/kr-fomo-index") {
      return handleFomoIndex(env);
    }

    if (requestUrl.pathname === "/kr-fomo-index/run-now") {
      return handleFomoRunNow(env);
    }

    if (requestUrl.pathname === "/kr-quotes") {
      return handleKrQuotes(env, requestUrl);
    }

    if (requestUrl.pathname === "/day-vals") {
      return handleDayVals(requestUrl, env);
    }

    if (requestUrl.pathname === "/rank-live") {
      return handleRankLive(requestUrl, env);
    }

    if (requestUrl.pathname === "/search-log" && request.method === "POST") {
      return handleSearchLog(request, env);
    }

    if (requestUrl.pathname === "/search-popular") {
      return handleSearchPopular(env, requestUrl);
    }

    const targetUrl = requestUrl.searchParams.get("url");

    if (!targetUrl) {
      return jsonResponse({ error: "Missing url parameter" }, 400);
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return jsonResponse({ error: "Invalid url" }, 400);
    }

    if (!ALLOWED_HOSTS.includes(parsedTarget.hostname)) {
      return jsonResponse({ error: "Host not allowed: " + parsedTarget.hostname }, 403);
    }

    try {
      // GET은 그대로, POST는 요청 본문(JSON 스크리너 쿼리 등)까지 그대로 중계
      const isPost = request.method === "POST";
      const upstream = await fetch(targetUrl, {
        method: isPost ? "POST" : "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; StockAnalyzerProxy/1.0)",
          ...(isPost ? { "Content-Type": "application/json" } : {}),
        },
        body: isPost ? await request.text() : undefined,
      });
      // 응답을 문자열로 통째로 버퍼링하지 않고 그대로 스트리밍해서 큰 응답(FRED 등)도 가볍게 처리
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          ...CORS_HEADERS,
        },
      });
    } catch (e) {
      return jsonResponse({ error: "Upstream fetch failed", detail: String(e) }, 502);
    }
  },

  // Cron Trigger가 매일 호출 — 국내 포모지수를 매일 스캔해 KV에 누적
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runFomoScanTick(env));
  },
};

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
