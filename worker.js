// Cloudflare Worker: 미국 기업 분석기용 CORS 중계 서버 + 익명 자유토론방 채팅 API
// 허용된 호스트(Yahoo Finance, FRED)로만 요청을 중계하며, 응답에 CORS 헤더를 붙여 반환합니다.
// /chat 경로는 KV(CHAT_KV)에 최근 24시간 메시지만 저장하는 익명 공개 자유토론방(자유 텍스트 최대 30자)을 제공합니다.

const ALLOWED_HOSTS = [
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "fred.stlouisfed.org",
  "news.google.com", // 국내 종목 주요뉴스(구글 뉴스 RSS 검색, 2026-09-01) — 응답은 XML이지만 그대로 스트리밍 중계됨
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- 채팅 설정(자유토론방: 익명, 24시간 보관, 자유 텍스트 최대 30자) ----------
const CHAT_KEY = "freechat_messages";
const CHAT_MAX_MESSAGES = 200;
const CHAT_RETENTION_SEC = 24 * 60 * 60; // 24시간
const CHAT_RATE_LIMIT_SEC = 10; // 같은 IP는 10초에 한 번만 등록 가능(연속 전송 방지)
const CHAT_MAX_LEN = 30;

// 자주 신고되는 한국어·영어 비속어 위주 기본 필터 — 완벽한 차단은 아니며 명백한 욕설만 1차로 걸러냄
const BANNED_WORDS = [
  "씨발", "시발", "씨팔", "시팔", "ㅅㅂ", "병신", "존나", "졸라", "개새끼", "개새기",
  "새끼", "지랄", "좆", "미친놈", "미친년", "걸레", "창녀", "잡놈",
  "fuck", "shit", "bitch", "asshole", "cunt", "bastard",
];

function containsBannedWord(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  return BANNED_WORDS.some((w) => normalized.includes(w));
}

function validatePost(body) {
  const text = (body && typeof body.text === "string" ? body.text : "").trim();

  if (text.length === 0) return { error: "메시지를 입력해주세요." };
  if (text.length > CHAT_MAX_LEN) return { error: `메시지는 최대 ${CHAT_MAX_LEN}자까지 입력할 수 있습니다.` };
  if (/https?:\/\/|www\.|\.(com|net|org|kr|io|co)\b/i.test(text)) return { error: "URL 주소는 등록할 수 없습니다." };
  if (/(.)\1{4,}/.test(text)) return { error: "같은 글자를 반복해서 입력할 수 없습니다." };
  if (containsBannedWord(text)) return { error: "부적절한 표현이 포함되어 있습니다." };

  return { post: { text } };
}

async function getChatMessages(env) {
  const raw = await env.CHAT_KV.get(CHAT_KEY);
  if (!raw) return [];
  let messages;
  try {
    messages = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(messages)) return [];
  const cutoff = Date.now() - CHAT_RETENTION_SEC * 1000;
  return messages.filter((m) => m && typeof m.t === "number" && m.t >= cutoff && typeof m.text === "string");
}

async function handleChat(request, env) {
  if (!env.CHAT_KV) {
    return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  }

  if (request.method === "GET") {
    const messages = await getChatMessages(env);
    return jsonResponse({ messages }, 200);
  }

  if (request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = "rl_" + ip;
    // KV expirationTtl은 60초 미만을 허용하지 않으므로, 실제 3초 판정은 저장된 타임스탬프로 직접 계산하고
    // TTL은 정리(cleanup) 목적으로만 넉넉히 60초를 준다
    const lastPostedRaw = await env.CHAT_KV.get(rlKey);
    if (lastPostedRaw) {
      const lastPostedAt = Number(lastPostedRaw);
      if (!Number.isNaN(lastPostedAt) && Date.now() - lastPostedAt < CHAT_RATE_LIMIT_SEC * 1000) {
        return jsonResponse({ error: "너무 빠르게 전송했습니다. 잠시 후 다시 시도해주세요." }, 429);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "잘못된 요청입니다." }, 400);
    }

    const { post, error } = validatePost(body);
    if (error) return jsonResponse({ error }, 400);

    const messages = await getChatMessages(env);
    messages.push({ t: Date.now(), ...post });
    const trimmed = messages.slice(-CHAT_MAX_MESSAGES);

    await env.CHAT_KV.put(CHAT_KEY, JSON.stringify(trimmed), { expirationTtl: CHAT_RETENTION_SEC });
    await env.CHAT_KV.put(rlKey, String(Date.now()), { expirationTtl: 60 });

    return jsonResponse({ messages: trimmed }, 200);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ---------- 인기 검색어: 방문자 전체의 검색을 KV에 기록해 최근 24시간 기준으로 집계(검색 오버레이의 "인기 검색") ----------
const SEARCH_LOG_KEY = "search_log_events";
const SEARCH_LOG_MAX = 3000; // 저장 이벤트 상한(오래된 것부터 정리)
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

  const events = await getSearchLogEvents(env);
  events.push({ symbol, t: Date.now() });
  const trimmed = events.slice(-SEARCH_LOG_MAX);
  await env.CHAT_KV.put(SEARCH_LOG_KEY, JSON.stringify(trimmed), { expirationTtl: SEARCH_LOG_RETENTION_SEC });
  return jsonResponse({ ok: true }, 200);
}

async function handleSearchPopular(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);

  const events = await getSearchLogEvents(env);
  const counts = {};
  for (const e of events) counts[e.symbol] = (counts[e.symbol] || 0) + 1;
  const popular = Object.entries(counts)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, SEARCH_POPULAR_MAX);
  return jsonResponse({ popular }, 200);
}

// ---------- 미래예측 2번째 그래프: 투자안정성 점수 구간별 1년 수익률 통계를 매달 집계하는 Cron 작업 ----------
// Workers 유료 플랜(2026-02 변경 이후 기본 10,000 subrequests/invocation, CPU 30초 기본·최대 5분)으로 전환하면서
// 무료 플랜의 50 subrequest 제한이 사라져 S&P500 500종목을 하루 만에 다 훑을 수 있음 — 배치/이어하기 로직 자체는
// (혹시 모를 타임아웃에 대비한 안전장치로) 그대로 두되 크기만 500으로 키움. 이제 대부분 하루 만에 그 달 스냅샷이 확정됨.
// ⚠️ 아래 신용등급 표(TICKER_CREDIT_RATING)는 app.js의 동일한 표를 그대로 복사한 것이다 — app.js를 수정할 때 여기도 함께 갱신해야
// 두 곳의 점수가 어긋나지 않는다(브라우저 스크립트와 Worker는 서로 다른 파일이라 상수를 공유할 수 없음).
const FUTURE_BATCH_SIZE = 500;
const FUTURE_PROGRESS_KEY = "future_progress";
const FUTURE_SNAPSHOT_PREFIX = "future_snapshot_";

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

const US_TOTAL_MARKET_CAP_ESTIMATE = 87.4e12;
const NO_DEBT_RATING = "회사채 없음";
const UNRATED_REASON = "미평가";

const TICKER_CREDIT_RATING = {
  PLTR: NO_DEBT_RATING,
  CRCL: NO_DEBT_RATING,
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

  VEEV: NO_DEBT_RATING, RMD: UNRATED_REASON, DXCM: UNRATED_REASON,
  ADM: "A", KVUE: "A", CINF: "A+",
  DGX: "BBB+", VMC: "BBB+", NTAP: "BBB+", ZTS: "BBB+", OMC: "BBB+", BIIB: "BBB+", IBKR: "BBB+",
  LVS: "BBB", LII: "BBB", IR: "BBB", EFX: "BBB",
  IRM: "BB-",

  HAL: "BBB+", MLM: "BBB+", WTW: "BBB+", EXR: "BBB+", ARES: "BBB+", CHD: "BBB+",
  TPR: "BBB", GEHC: "BBB", CCI: "BBB", TDY: "BBB", OTIS: "BBB", KHC: "BBB", XYL: "BBB", TSCO: "BBB", ZBH: "BBB", NDSN: "BBB",
  EQT: "BBB-", CASY: "BBB-", IT: "BBB-",

  CMG: NO_DEBT_RATING,
  KMB: "A", HSY: "A",
  ROP: "BBB+", CBRE: "BBB+", PAYX: "BBB+", A: "BBB+", PEG: "BBB+",
  LUV: "BBB", FISV: "BBB",
  CCL: "BBB-", KDP: "BBB-",
  BALL: "BB+", UAL: "BB+", YUM: "BB+", CNC: "BB+",
  LYV: "BB-", COIN: "BB-",

  FIX: NO_DEBT_RATING,
  PCAR: "A+",
  APD: "A", APO: "A",
  EOG: "A-", AON: "A-",
  ORLY: "BBB+", CRH: "BBB+", PPG: "BBB+",
  SNPS: "BBB", HUM: "BBB", FDX: "BBB", STLD: "BBB", HPE: "BBB", KEYS: "BBB",
  MSI: "BBB-", VST: "BBB-",
  WBD: "BB+",
  TDG: "BB-",

  ODFL: NO_DEBT_RATING, MCHP: UNRATED_REASON,
  NTRS: "A+",
  HIG: "A-", EXC: "A-", RJF: "A-",
  FERG: "BBB+", XEL: "BBB+", CFG: "BBB+", MTB: "BBB+", JBHT: "BBB+", VTR: "BBB+",
  WAB: "BBB", WDAY: "BBB",
  EME: "BBB-", FLEX: "BBB-",
  XYZ: "BB+",
  PCG: "BB",
  CVNA: "B",

  WRB: "A-", PFG: "A-", RL: "A-", EL: "A-", CTVA: "A-",
  NDAQ: "BBB+", DOV: "BBB+", SRE: "BBB+", HONA: "BBB+", ADSK: "BBB+", FITB: "BBB+",
  OKE: "BBB", LHX: "BBB", FANG: "BBB", AZO: "BBB", TTWO: "BBB",
  AXON: "BB+", CPAY: "BB+", ON: "BB+",

  FSLR: NO_DEBT_RATING, WST: NO_DEBT_RATING,
  AWK: "A",
  PPL: "A-", AVB: "A-",
  HUBB: "BBB+", CHRW: "BBB+", CNP: "BBB+", PHM: "BBB+",
  FIS: "BBB", FOXA: "BBB", LEN: "BBB", LH: "BBB", IP: "BBB", TSN: "BBB", DLTR: "BBB",
  EIX: "BBB-",
  ZBRA: "BB+",
  ECHO: "CCC+",

  WSM: NO_DEBT_RATING, CPRT: NO_DEBT_RATING, CTSH: UNRATED_REASON,
  SNA: "A-", ATO: "A-",
  AEE: "BBB+", DTE: "BBB+", RF: "BBB+", DVN: "BBB+", EG: "BBB+", ES: "BBB+", HBAN: "BBB+", FE: "BBB+",
  STZ: "BBB", KEY: "BBB", DG: "BBB", GIS: "BBB", HPQ: "BBB",
  Q: "BB+",

  GRMN: NO_DEBT_RATING, FAST: NO_DEBT_RATING, TER: NO_DEBT_RATING, IDXX: UNRATED_REASON, CIEN: "BB+",
  NKE: "A+",
  ACGL: "A", BKR: "A",
  ETR: "BBB+", DHI: "BBB+", CARR: "BBB+", D: "BBB+",
  ROK: "A-", O: "A-",
  TRGP: "BBB", EW: "BBB",
  DAL: "BBB-",
  IQV: "BB+",
  LITE: "B",

  JKHY: NO_DEBT_RATING, COO: UNRATED_REASON, TYL: UNRATED_REASON, LULU: "BBB",
  GL: "A",
  KIM: "A-", MAA: "A-",
  BBY: "BBB+", DOC: "BBB+",
  MAS: "BBB", TXT: "BBB", AIZ: "BBB", ALLE: "BBB",
  AKAM: "BBB-", HST: "BBB-", NWSA: "BBB-", ALB: "BBB-",
  GNRC: "BB+",
  TKO: "B+",

  ERIE: NO_DEBT_RATING,
  BG: "A-",
  CMS: "BBB+", IEX: "BBB+", NI: "BBB+", DD: "BBB+", EVRG: "BBB+",
  AMCR: "BBB", AVY: "BBB", HAS: "BBB", LYB: "BBB", SBAC: "BBB", BR: "BBB",
  EXE: "BBB-", FDXF: "BBB-", GPN: "BBB-", BAX: "BBB-",
  VTRS: "BB+", CHTR: "BB+",

  SMCI: UNRATED_REASON,
  BEN: "A",
  SWK: "BBB+", IVZ: "BBB+", LNT: "BBB+",
  INVH: "BBB", WY: "BBB", ROL: "BBB", SJM: "BBB", CF: "BBB",
  GPC: "BBB-", APA: "BBB-", NWS: "BBB-", CDW: "BBB-", HII: "BBB-", LDOS: "BBB-", J: "BBB-",
  PTC: "BB+",
  GEN: "BB",

  DECK: NO_DEBT_RATING, ALGN: NO_DEBT_RATING, CSGP: UNRATED_REASON, FDS: UNRATED_REASON,
  REG: "A-", HRL: "A-", CPT: "A-",
  CLX: "BBB+", UDR: "BBB+", PNW: "BBB+",
  SOLV: "BBB", MKC: "BBB", RVTY: "BBB",
  TRMB: "BBB-", AES: "BBB-",
  CRL: "BB+",
  WYNN: "BB-",
  DVA: "BB", GDDY: "BB",

  EXPD: NO_DEBT_RATING, INCY: NO_DEBT_RATING, TPL: NO_DEBT_RATING, MRNA: NO_DEBT_RATING,
  TROW: "A+", L: "A",
  ULTA: "BBB", SW: "BBB", VLTO: "BBB", DRI: "BBB", FOX: "BBB", IFF: "BBB",
  BRO: "BBB-", STE: "BBB-",
  NRG: "BB",

  FFIV: NO_DEBT_RATING,
  PKG: "BBB", FTV: "BBB",
  DOW: "BBB-",

  TSM: "AA-", BABA: "A+",
  DKNG: "BB", SNAP: "BB-",
  MSTR: "B-",
  ARM: NO_DEBT_RATING, IONQ: NO_DEBT_RATING, PDD: NO_DEBT_RATING, LI: NO_DEBT_RATING,
  CELH: NO_DEBT_RATING, GME: NO_DEBT_RATING, RDDT: NO_DEBT_RATING,
  HOOD: UNRATED_REASON, CPNG: UNRATED_REASON, SOFI: UNRATED_REASON,
  RIVN: UNRATED_REASON, NIO: UNRATED_REASON, LCID: UNRATED_REASON,
  RKLB: UNRATED_REASON, RBLX: UNRATED_REASON, U: UNRATED_REASON,
  XPEV: UNRATED_REASON, AFRM: UNRATED_REASON,
};

const CREDIT_RATING_SCORE = {
  AAA: 4, "AA+": 3.5, AA: 3, "AA-": 2.5, "A+": 2, A: 1.5, "A-": 1, "BBB+": 0.5,
};

function clampWorker(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// app.js의 computeRiskScore(투자 안정성 점수)와 동일한 계산식 — 신용등급 + S&P500 대비 모멘텀 + 순이익률 + 시가총액 가점(10점 만점)
function computeInvestmentStabilityScore(metrics, sp500Return) {
  const { symbol, oneYearReturn, netIncome, revenue, marketCap, currency } = metrics;

  let creditScore = 1;
  const rating = symbol ? TICKER_CREDIT_RATING[symbol] : undefined;
  if (rating === NO_DEBT_RATING) creditScore = 2;
  else if (rating === UNRATED_REASON) creditScore = 1;
  else if (rating !== undefined) creditScore = CREDIT_RATING_SCORE[rating] !== undefined ? CREDIT_RATING_SCORE[rating] : 0;

  let marketScore = 1;
  if (oneYearReturn !== null && sp500Return !== null && sp500Return !== undefined) {
    const relDiff = Math.abs(sp500Return - oneYearReturn);
    marketScore = clampWorker(2 * (1 - relDiff / 200), 0, 2);
  }

  let marginScore = 1;
  if (revenue !== null && revenue > 0 && netIncome !== null) {
    const netMargin = netIncome / revenue;
    marginScore = netMargin < 0 ? 0 : clampWorker((2 / 3) * (0.5 + netMargin * 5), 0, 2);
  }

  let vtsaxScore = 0.1;
  if (marketCap !== undefined && marketCap !== null && (!currency || currency === "USD")) {
    const vtsaxWeightPct = (marketCap / US_TOTAL_MARKET_CAP_ESTIMATE) * 100;
    vtsaxScore = clampWorker((vtsaxWeightPct / 6) * 2, 0, 2);
  }

  const total = Math.round(clampWorker(creditScore + marketScore + marginScore + vtsaxScore, 0, 10) * 10) / 10;
  return { total };
}

// ---------- 시세/재무 조회 헬퍼(Worker는 서버 사이드라 브라우저용 CORS 프록시 없이 Yahoo에 직접 접근 가능) ----------
const YEAR_SECONDS_W = 365.25 * 24 * 3600;
const HISTORY_TOLERANCE_SECONDS_W = 20 * 24 * 3600;
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

function closestPairWorker(pairs, targetTimestamp) {
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

function get1yReturnFromChartWorker(chartResult) {
  const pairs = chartClosePairsWorker(chartResult);
  if (pairs.length < 2) return null;
  const latest = pairs[pairs.length - 1];
  const target = latest.t - YEAR_SECONDS_W;
  if (pairs[0].t > target + HISTORY_TOLERANCE_SECONDS_W) return null;
  const base = closestPairWorker(pairs, target);
  if (!base || !base.c) return null;
  return ((latest.c - base.c) / base.c) * 100;
}

const fxRateCacheWorker = new Map();
async function getFxRateWorker(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return 1;
  const key = fromCurrency + toCurrency;
  if (fxRateCacheWorker.has(key)) return fxRateCacheWorker.get(key);
  const rate = await fetchYahooChart(`${fromCurrency}${toCurrency}=X`)
    .then((c) => (c && c.chart && c.chart.result && c.chart.result[0] && c.chart.result[0].meta && c.chart.result[0].meta.regularMarketPrice) ?? null)
    .catch(() => null);
  fxRateCacheWorker.set(key, rate);
  return rate;
}

async function latestFundamentalValueWorker(block, key, quoteCurrency, { convert = true } = {}) {
  const items = (block && block[key]) || [];
  const valid = items.filter((it) => it && it.reportedValue && it.reportedValue.raw !== undefined);
  if (!valid.length) return null;
  valid.sort((a, b) => new Date(a.asOfDate) - new Date(b.asOfDate));
  const latest = valid[valid.length - 1];
  const raw = latest.reportedValue.raw;
  if (!latest.currencyCode || latest.currencyCode === quoteCurrency) return raw;
  if (!convert) return null;
  const rate = await getFxRateWorker(latest.currencyCode, quoteCurrency);
  return rate !== null ? raw * rate : null;
}

async function getSP500TickersWorker() {
  const title = "List of S&P 500 companies";
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent(title) +
    "&prop=wikitext&section=1&format=json&origin=*";
  const res = await fetch(url, { headers: UPSTREAM_HEADERS });
  const data = await res.json();
  const text = data && data.parse && data.parse.wikitext && data.parse.wikitext["*"];
  if (!text) throw new Error("S&P500 종목 목록을 가져오지 못했습니다.");
  const symbols = [];
  const re = /\{\{\w+Symbol\|([A-Za-z0-9.\-]+)\}\}/g;
  let m;
  while ((m = re.exec(text))) symbols.push(m[1].toUpperCase());
  if (symbols.length === 0) throw new Error("S&P500 종목 목록을 파싱하지 못했습니다.");
  return [...new Set(symbols)];
}

async function getSp500ReturnWorker() {
  try {
    const chart = await fetchYahooChart("^GSPC");
    return get1yReturnFromChartWorker(chart);
  } catch {
    return null;
  }
}

// 종목 하나의 투자안정성 점수 계산에 필요한 최소 입력(1년 수익률·순이익·매출·시가총액·통화)만 조회 — 상승압력도 등 다른 지표는 이 그래프에 필요 없어 생략
async function fetchRiskInputs(symbol) {
  try {
    const [chartData, fundData] = await Promise.all([
      fetchYahooChart(symbol),
      fetchYahooFundamentals(symbol, "annualTotalRevenue,annualNetIncome,annualShareIssued"),
    ]);
    const result = chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0];
    if (!result) return null;
    const meta = result.meta;

    let revenue = null;
    let netIncome = null;
    let sharesOutstanding = null;
    const resultArr = (fundData && fundData.timeseries && fundData.timeseries.result) || [];
    for (const block of resultArr) {
      if (block.annualTotalRevenue) revenue = await latestFundamentalValueWorker(block, "annualTotalRevenue", meta.currency);
      if (block.annualNetIncome) netIncome = await latestFundamentalValueWorker(block, "annualNetIncome", meta.currency);
      if (block.annualShareIssued) sharesOutstanding = await latestFundamentalValueWorker(block, "annualShareIssued", meta.currency, { convert: false });
    }
    const marketCap = meta.regularMarketPrice !== undefined && sharesOutstanding ? meta.regularMarketPrice * sharesOutstanding : null;

    return {
      symbol,
      oneYearReturn: get1yReturnFromChartWorker(chartData),
      netIncome,
      revenue,
      marketCap,
      currency: meta.currency,
    };
  } catch {
    return null;
  }
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

function round1(n) {
  return Math.round(n * 10) / 10;
}

function monthKeyOf(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Worker는 UTC로 동작하므로 "그 달의 마지막 날"도 UTC 기준으로 판정
function isLastDayOfMonth(date) {
  const tomorrow = new Date(date.getTime() + 24 * 3600 * 1000);
  return tomorrow.getUTCMonth() !== date.getUTCMonth();
}

// 투자안정성 점수(0~10) 10개 구간별로 1년 수익률의 최소·최대·10%p 단위 최다분포 구간(mode)을 집계
function computeDecileSnapshot(monthKey, results) {
  const buckets = Array.from({ length: 10 }, () => []);
  for (const r of results) {
    if (!r || r.total === null || r.total === undefined || r.oneYearReturn === null || r.oneYearReturn === undefined) continue;
    const idx = clampWorker(Math.floor(r.total), 0, 9);
    buckets[idx].push(r.oneYearReturn);
  }

  const deciles = buckets.map((returns, idx) => {
    if (returns.length === 0) return { bucket: idx, count: 0, min: null, max: null, modeBand: null, modeMid: null };
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const bandCounts = new Map();
    for (const ret of returns) {
      const bandLo = Math.floor(ret / 10) * 10;
      bandCounts.set(bandLo, (bandCounts.get(bandLo) || 0) + 1);
    }
    let modeLo = null;
    let modeCount = -1;
    for (const [lo, count] of bandCounts) {
      if (count > modeCount) {
        modeCount = count;
        modeLo = lo;
      }
    }
    // 최다분포 구간뿐 아니라 실제로 데이터가 있는 모든 10%p 구간을 높은 순으로 나열 — 우측 구간별 범례에 사용
    const bands = [...bandCounts.entries()]
      .map(([lo, count]) => ({ lo, hi: lo + 10, count }))
      .sort((a, b) => b.lo - a.lo);
    return {
      bucket: idx,
      count: returns.length,
      min: round1(min),
      max: round1(max),
      modeBand: { lo: modeLo, hi: modeLo + 10, count: modeCount },
      modeMid: round1(modeLo + 5),
      bands,
    };
  });

  return { monthKey, computedAt: new Date().toISOString(), sampleSize: results.length, deciles };
}

// 매일 한 번(Cron Trigger)씩 호출되어 하루치 배치를 스캔하고, 그 달 마지막 날엔 지금까지의 결과로 스냅샷을 확정 발행
// 새 KV 네임스페이스를 따로 만들 필요 없이, 채팅 기능이 이미 쓰고 있는 CHAT_KV를 그대로 재사용한다
// (키 이름이 "future_"로 시작해 채팅 키("freechat_messages", "rl_*")와 절대 겹치지 않음)
async function runFutureScanTick(env) {
  if (!env.CHAT_KV) return; // KV 바인딩이 없으면 조용히 건너뜀(기존 기능에 영향 없도록)
  const now = new Date();
  let progress = await env.CHAT_KV.get(FUTURE_PROGRESS_KEY, "json");

  // 새 사이클: 이번 달 처음 실행되거나(진행 상황이 아예 없음) 저장된 사이클이 지난 달 것이면 이번 달 기준으로 새로 시작
  if (!progress || progress.monthKey !== monthKeyOf(now)) {
    const [tickers, sp500Return] = await Promise.all([getSP500TickersWorker(), getSp500ReturnWorker()]);
    progress = { monthKey: monthKeyOf(now), remaining: tickers, results: [], sp500Return, startedAt: now.toISOString() };
  }

  const batch = progress.remaining.slice(0, FUTURE_BATCH_SIZE);
  progress.remaining = progress.remaining.slice(FUTURE_BATCH_SIZE);

  // 동시성도 4 → 16으로 올림(너무 높이면 Yahoo 비공식 API 자체의 요청 빈도 제한에 걸릴 수 있어 무제한으로 올리지는 않음 —
  // 이건 Cloudflare 플랜과 무관하게 데이터 출처 쪽 제약이라 그대로 유지)
  const batchResults = await mapWithConcurrencyWorker(batch, 16, async (symbol) => {
    const inputs = await fetchRiskInputs(symbol);
    if (!inputs || inputs.oneYearReturn === null || inputs.oneYearReturn === undefined) return null;
    const score = computeInvestmentStabilityScore(inputs, progress.sp500Return);
    return { symbol, total: score.total, oneYearReturn: round1(inputs.oneYearReturn) };
  });
  progress.results.push(...batchResults.filter(Boolean));

  // 스캔이 이번 달 안에 다 끝났거나, 다 못 끝났어도 이번 달 마지막 날이 됐으면 지금까지 모인 결과로 스냅샷을 확정 발행
  if (progress.remaining.length === 0 || isLastDayOfMonth(now)) {
    const snapshot = computeDecileSnapshot(progress.monthKey, progress.results);
    await env.CHAT_KV.put(FUTURE_SNAPSHOT_PREFIX + progress.monthKey, JSON.stringify(snapshot));
  }

  if (isLastDayOfMonth(now)) {
    await env.CHAT_KV.delete(FUTURE_PROGRESS_KEY); // 다음 실행(다음 달 1일)에 새 사이클로 초기화되도록
  } else {
    await env.CHAT_KV.put(FUTURE_PROGRESS_KEY, JSON.stringify(progress));
  }
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

async function handleFutureRiskBands(request, env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  const bucket = Number(new URL(request.url).searchParams.get("bucket"));
  if (!Number.isInteger(bucket) || bucket < 0 || bucket > 9) {
    return jsonResponse({ error: "bucket 파라미터는 0~9 정수여야 합니다." }, 400);
  }
  const list = await env.CHAT_KV.list({ prefix: FUTURE_SNAPSHOT_PREFIX });
  const snapshots = await Promise.all(list.keys.map((k) => env.CHAT_KV.get(k.name, "json")));
  const history = snapshots
    .filter(Boolean)
    .map((snap) => {
      const d = snap.deciles && snap.deciles[bucket];
      if (!d || d.count === 0) return null;
      return { monthKey: snap.monthKey, min: d.min, max: d.max, count: d.count, modeBand: d.modeBand, modeMid: d.modeMid, bands: d.bands || [], sampleSize: snap.sampleSize };
    })
    .filter(Boolean)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  return jsonResponse({ bucket, history }, 200);
}

async function handleFutureRiskStatus(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  const progress = await env.CHAT_KV.get(FUTURE_PROGRESS_KEY, "json");
  const list = await env.CHAT_KV.list({ prefix: FUTURE_SNAPSHOT_PREFIX });
  return jsonResponse(
    {
      monthKey: progress ? progress.monthKey : null,
      processed: progress ? progress.results.length : 0,
      remaining: progress ? progress.remaining.length : 0,
      publishedMonths: list.keys.map((k) => k.name.replace(FUTURE_SNAPSHOT_PREFIX, "")).sort(),
    },
    200
  );
}

// 배치를 즉시 한 번 실행 — FUTURE_BATCH_SIZE가 500(S&P500 전체)이라 보통 한 번 호출로 이번 달 스냅샷이 바로 확정됨.
// Cron을 기다리지 않고 지금 당장 채워 넣고 싶을 때 수동으로 호출(그 뒤로는 평소처럼 Cron이 자동으로 이어받음)
async function handleFutureRunNow(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  await runFutureScanTick(env);
  return handleFutureRiskStatus(env);
}

// ---------- 국내(코스피200+코스닥150) 실시간 등락률 요약 — 지도(섹터맵) 국내 모드 색상 갱신용 ----------
// Yahoo의 배치 시세(v7/finance/quote)는 최근 인증(crumb)이 필요해져 브라우저에서 직접 호출할 수 없게 됐다(확인함).
// 해외(S&P500)는 스크리너 API 한 번으로 전체를 받아오지만 KRX용 스크리너는 없어서, 이미 FOMO지수 계산에 쓰고 있는
// KR_FOMO_UNIVERSE(약 350종목)를 재사용해 서버에서 종목별로 훑은 뒤 등락률만 모아 KV에 15분 캐시해둔다.
const KR_QUOTES_CACHE_KEY = "kr_quotes_cache";
const KR_QUOTES_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchKrQuoteChangePct(symbol) {
  try {
    const chart = await fetchYahooChart(symbol, "5d", "1d");
    const result = chart && chart.chart && chart.chart.result && chart.chart.result[0];
    const meta = result && result.meta;
    if (!meta) return null;
    const pairs = chartClosePairsWorker(chart);
    if (!pairs.length) return null;
    const latest = pairs[pairs.length - 1];
    const prevClose = pairs.length >= 2 ? pairs[pairs.length - 2].c : meta.chartPreviousClose ?? null;
    const price = meta.regularMarketPrice ?? latest.c;
    if (prevClose === null || prevClose === undefined || price === null || price === undefined || !prevClose) return null;
    return ((price - prevClose) / prevClose) * 100;
  } catch {
    return null;
  }
}

async function handleKrQuotes(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);

  const cached = await env.CHAT_KV.get(KR_QUOTES_CACHE_KEY, "json");
  if (cached && Date.now() - cached.fetchedAt < KR_QUOTES_CACHE_TTL_MS) {
    return jsonResponse(cached, 200);
  }

  const results = await mapWithConcurrencyWorker(KR_FOMO_UNIVERSE, 16, async (symbol) => {
    const chg = await fetchKrQuoteChangePct(symbol);
    return chg === null ? null : [symbol, Math.round(chg * 100) / 100];
  });
  const quotes = {};
  for (const r of results) {
    if (r) quotes[r[0]] = r[1];
  }
  if (Object.keys(quotes).length > 0) {
    const payload = { quotes, fetchedAt: Date.now() };
    await env.CHAT_KV.put(KR_QUOTES_CACHE_KEY, JSON.stringify(payload));
    return jsonResponse(payload, 200);
  }
  if (cached) return jsonResponse(cached, 200); // 갱신 실패해도 기존 캐시가 있으면 그거라도 반환
  return jsonResponse({ error: "국내 시세를 가져오지 못했습니다." }, 502);
}

// ---------- M2 통화량(광의통화) 전년동월비 — 한국은행 ECOS Open API ----------
// 통계표 161Y006("M2 상품별 구성내역(평잔, 원계열)") / 항목 BBHA00("M2(평잔, 원계열)")가 현재 계속 갱신되는 활성
// 테이블임(구 101Y003/101Y004는 2003~2004년에 데이터가 끊긴 폐기 테이블이라 사용하지 않음 — 직접 호출로 확인).
// 월별 데이터라 자주 바뀌지 않으므로 KV에 24시간 캐시해서 ECOS API 호출 빈도를 낮춘다.
const ECOS_M2_STAT_CODE = "161Y006";
const ECOS_M2_ITEM_CODE = "BBHA00";
const M2_YOY_CACHE_KEY = "m2_yoy_cache";
const M2_YOY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function ymKeyWorker(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function fetchEcosM2Series(env) {
  const now = new Date();
  const end = ymKeyWorker(now);
  // FOMO 차트가 2011년부터 시작하므로 YoY 계산에 필요한 전년치까지 여유 있게 2009년부터 가져옴
  const start = ymKeyWorker(new Date(Date.UTC(2009, 0, 1)));
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${env.ECOS_API_KEY}/json/kr/1/500/${ECOS_M2_STAT_CODE}/M/${start}/${end}/${ECOS_M2_ITEM_CODE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ECOS fetch failed: " + res.status);
  const data = await res.json();
  const rows = (data && data.StatisticSearch && data.StatisticSearch.row) || [];
  if (!rows.length) throw new Error((data && data.RESULT && data.RESULT.MESSAGE) || "ECOS 응답에 데이터가 없습니다.");
  return rows
    .map((r) => ({ ym: r.TIME, value: Number(r.DATA_VALUE) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}

// 같은 달(YYYYMM) 전년 동월 대비 증감률(%)만 남김 — 전년치가 없는 가장 이른 구간은 자연히 제외됨
function computeM2YoyPoints(series) {
  const byYm = new Map(series.map((r) => [r.ym, r.value]));
  const points = [];
  for (const { ym, value } of series) {
    const y = Number(ym.slice(0, 4));
    const m = ym.slice(4, 6);
    const prevValue = byYm.get(`${y - 1}${m}`);
    if (!prevValue) continue;
    points.push({ ym, yoyPct: ((value - prevValue) / prevValue) * 100 });
  }
  return points;
}

async function handleM2Yoy(env) {
  if (!env.CHAT_KV) return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  if (!env.ECOS_API_KEY) return jsonResponse({ error: "ECOS_API_KEY 환경변수가 설정되지 않았습니다." }, 500);

  const cached = await env.CHAT_KV.get(M2_YOY_CACHE_KEY, "json");
  if (cached && Date.now() - cached.fetchedAt < M2_YOY_CACHE_TTL_MS) {
    return jsonResponse(cached, 200);
  }

  try {
    const points = computeM2YoyPoints(await fetchEcosM2Series(env));
    const payload = { points, fetchedAt: Date.now() };
    await env.CHAT_KV.put(M2_YOY_CACHE_KEY, JSON.stringify(payload));
    return jsonResponse(payload, 200);
  } catch (e) {
    if (cached) return jsonResponse(cached, 200); // 갱신 실패해도 기존 캐시가 있으면 그거라도 반환
    return jsonResponse({ error: "M2 데이터를 가져오지 못했습니다.", detail: String(e) }, 502);
  }
}

// ---------- 로그인: 카카오/네이버 OAuth 검증 + Firebase 커스텀 토큰 발급 ----------
// 카카오/네이버는 Firebase가 네이티브 지원하지 않으므로, 프론트엔드가 각 제공업체의 OAuth authorization
// code를 여기로 보내면 code→access token 교환, 사용자 프로필 조회로 신원을 검증한 뒤 Firebase 서비스
// 계정 키로 직접 서명한 커스텀 토큰(RS256 JWT)을 발급한다. firebase-admin 패키지 없이 Web Crypto API만으로
// Firebase 커스텀 토큰 스펙(iss/sub=서비스 계정 이메일, aud 고정값, 최대 만료 1시간)을 그대로 구현한 것.
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";
const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_USER_URL = "https://openapi.naver.com/v1/nid/me";
const FIREBASE_TOKEN_AUD = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlEncodeString(str) {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}
function pemToArrayBuffer(pem) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function mintFirebaseCustomToken(uid, extraClaims, env) {
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error("FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY 환경변수가 설정되지 않았습니다.");
  }
  // Cloudflare 대시보드 환경변수에 줄바꿈이 포함된 PEM을 넣으면 "\n" 리터럴 문자열로 저장되는 경우가 흔해 실제 개행으로 복원
  const privateKeyPem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: FIREBASE_TOKEN_AUD,
    iat: now,
    exp: now + 3600,
    uid,
    claims: extraClaims || {},
  };
  const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncodeBytes(signature)}`;
}

async function handleKakaoAuth(request, env) {
  if (!env.KAKAO_REST_API_KEY) return jsonResponse({ error: "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }
  const { code, redirectUri } = body;
  if (!code || !redirectUri) return jsonResponse({ error: "code, redirectUri가 필요합니다." }, 400);

  const tokenRes = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KAKAO_REST_API_KEY,
      client_secret: env.KAKAO_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    return jsonResponse({ error: "카카오 인증에 실패했습니다.", detail: tokenData }, 401);
  }

  const userRes = await fetch(KAKAO_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
  const userData = await userRes.json();
  if (!userRes.ok || !userData.id) {
    return jsonResponse({ error: "카카오 사용자 정보를 가져오지 못했습니다." }, 401);
  }

  const kakaoAccount = userData.kakao_account || {};
  const profile = kakaoAccount.profile || {};
  const name = profile.nickname || null;
  const picture = profile.profile_image_url || null;
  const email = kakaoAccount.email || null;
  try {
    const customToken = await mintFirebaseCustomToken(`kakao:${userData.id}`, { provider: "kakao", email, name, picture }, env);
    return jsonResponse({ customToken, profile: { name, email, picture } }, 200);
  } catch (e) {
    return jsonResponse({ error: "토큰 발급에 실패했습니다.", detail: String(e) }, 500);
  }
}

async function handleNaverAuth(request, env) {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
    return jsonResponse({ error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청입니다." }, 400);
  }
  const { code, state } = body;
  if (!code || !state) return jsonResponse({ error: "code, state가 필요합니다." }, 400);

  const tokenUrl = `${NAVER_TOKEN_URL}?grant_type=authorization_code&client_id=${encodeURIComponent(env.NAVER_CLIENT_ID)}&client_secret=${encodeURIComponent(env.NAVER_CLIENT_SECRET)}&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    return jsonResponse({ error: "네이버 인증에 실패했습니다.", detail: tokenData }, 401);
  }

  const userRes = await fetch(NAVER_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
  const userData = await userRes.json();
  const profile = userData.response;
  if (!userRes.ok || !profile || !profile.id) {
    return jsonResponse({ error: "네이버 사용자 정보를 가져오지 못했습니다." }, 401);
  }

  const name = profile.name || profile.nickname || null;
  const picture = profile.profile_image || null;
  const email = profile.email || null;
  try {
    const customToken = await mintFirebaseCustomToken(`naver:${profile.id}`, { provider: "naver", email, name, picture }, env);
    return jsonResponse({ customToken, profile: { name, email, picture } }, 200);
  } catch (e) {
    return jsonResponse({ error: "토큰 발급에 실패했습니다.", detail: String(e) }, 500);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/chat") {
      return handleChat(request, env);
    }

    if (requestUrl.pathname === "/future-risk-bands") {
      return handleFutureRiskBands(request, env);
    }

    if (requestUrl.pathname === "/future-risk-bands/status") {
      return handleFutureRiskStatus(env);
    }

    if (requestUrl.pathname === "/future-risk-bands/run-now") {
      return handleFutureRunNow(env);
    }

    if (requestUrl.pathname === "/kr-fomo-index") {
      return handleFomoIndex(env);
    }

    if (requestUrl.pathname === "/kr-fomo-index/run-now") {
      return handleFomoRunNow(env);
    }

    if (requestUrl.pathname === "/m2-yoy") {
      return handleM2Yoy(env);
    }

    if (requestUrl.pathname === "/kr-quotes") {
      return handleKrQuotes(env);
    }

    if (requestUrl.pathname === "/auth/kakao" && request.method === "POST") {
      return handleKakaoAuth(request, env);
    }

    if (requestUrl.pathname === "/auth/naver" && request.method === "POST") {
      return handleNaverAuth(request, env);
    }

    if (requestUrl.pathname === "/search-log" && request.method === "POST") {
      return handleSearchLog(request, env);
    }

    if (requestUrl.pathname === "/search-popular") {
      return handleSearchPopular(env);
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

  // Cron Trigger가 매일 호출 — 미래예측 2번째 그래프용 투자안정성 구간 통계 + 국내 포모지수를 매일 스캔해 KV에 누적
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runFutureScanTick(env));
    ctx.waitUntil(runFomoScanTick(env));
  },
};

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
