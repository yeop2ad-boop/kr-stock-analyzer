// ---------- 별별순위 빠른 순위 엔진 (2026-10-21 사용자 요청) ----------
// 예전: 시가총액 상위 30개만 먼저 조회·정렬하고 "전체보기"를 누르면 약 1분간 종목마다 재무제표를 불러왔다.
// 지금: ① 순위는 항상 "전체 종목"(한국 350 · 미국 S&P500 · ETF · 비트코인 200) 중에서 매기고 30위씩 더보기,
//       ② 값은 하루 두 번(한국 18시·미국 6시, ETF·코인은 둘 다) 갱신되는 DB(data/sreport-baseline.json)에서 즉시 읽고,
//       ③ 실시간이 필요한 6개 항목(52주 구간·거래대금·PER·변동성·과열도·등락률)은 워커 /rank-live로 30종목씩 병렬 취합해 덮어쓴다.
// 실시간 항목이 걸리는 시간을 재서(rank_live_ms_v1) DB 항목도 비슷한 시간 동안 "불러오는 중" 화면을 보여 준다(사용자 요청: 항목마다 대기시간이 들쭉날쭉하지 않게).
// app.js 다음에 불러온다 — app.js의 표 도우미(rankNameCellHtml·rankPriceCellHtml 등)를 그대로 쓴다.

const RF_PAGE = 30;
const RF_API = "https://us-stock.yeop2ad.workers.dev";
const RF_LIVE_MS_KEY = "rank_live_ms_v1";
const RF_LIVE_FIELDS = new Set(["w52", "dv", "per", "vol", "rsi"]); // 값 자체가 실시간으로 바뀌는 항목(등락률·현재가는 모든 순위의 현재가 칸에 반영)

// 항목 설정: dir=정렬방향(desc 큰 값이 1위, asc 작은 값이 1위), positive=0 이하는 순위에서 제외, th=머리글, sub=머리글 둘째 줄
const RF_ITEMS = {
  win: { label: "10년월간승률", dir: "desc", th: RANK_TH_WINRATE },
  ret: { label: "연평균 상승", dir: "desc", th: RANK_TH_RET10 },
  rev: { label: "매출 증가율", dir: "desc", th: `매출 증가율${THEAD_SUB("작년 대비")}`, assetLabel: "수익률", assetTh: RANK_TH_RET1Y },
  vol: { label: "변동성", dir: "asc", th: `변동성${THEAD_SUB("3개월")}` },
  rsi: { label: "과열도(RSI)", dir: "asc", th: RANK_TH_RSI },
  ni: { label: "순이익 증가", dir: "desc", th: `순이익 증가${THEAD_SUB("작년 대비")}` },
  om: { label: "영업이익률", dir: "desc", th: `영업이익률${THEAD_SUB("직전분기")}` },
  roe: { label: "ROE", dir: "desc", th: `ROE${THEAD_SUB("최근 1년")}` },
  cf: { label: "현금흐름 증가", dir: "desc", th: `현금흐름 증가${THEAD_SUB("작년 대비")}` },
  debt: { label: "부채비율", dir: "asc", positive: true, th: `부채비율${THEAD_SUB("직전분기")}` },
  mcap: { label: "시가총액", dir: "desc", th: "시가총액" },
  dv: { label: "거래대금", dir: "desc", th: `거래대금${THEAD_SUB("오늘")}` },
  w52: { label: "52주 구간", dir: "asc", th: `52주 위치${THEAD_SUB("0=최저")}` },
  per: { label: "PER", dir: "asc", positive: true, th: `PER${THEAD_SUB("현재가")}` },
  div: { label: "배당률", dir: "desc", th: `배당률${THEAD_SUB("최근 1년")}` },
  fee: { label: "운용보수", dir: "asc", positive: true, th: `운용보수${THEAD_SUB("연 총보수")}` },
  aum: { label: "규모", dir: "desc", th: `규모${THEAD_SUB("순자산")}` },
};
// 데이터에 이 값이 없을 때(예: ETF 규모) 쓰는 별도 공급자
const rfState = { sec: "stocks", market: "kr", key: "win", shown: RF_PAGE, rows: null, token: 0, liveFailed: false, reverse: false };

function rfLiveMsGet() {
  try {
    const v = Number(localStorage.getItem(RF_LIVE_MS_KEY));
    if (Number.isFinite(v) && v > 800) return v;
  } catch {}
  return 4500; // 아직 재 본 적이 없으면 4.5초 정도로 가정
}
function rfLiveMsPut(ms) {
  try {
    const prev = rfLiveMsGet();
    const next = Math.round(prev * 0.6 + Math.min(20000, Math.max(800, ms)) * 0.4); // 이동 평균
    localStorage.setItem(RF_LIVE_MS_KEY, String(next));
  } catch {}
}

// ---- 실시간 값(워커) ----
const rfLiveCache = new Map(); // symbol -> { at, v:[price, chg, val, hi, lo, vol, rsi] }
const RF_LIVE_TTL = 3 * 60 * 1000;
async function rfFetchLiveChunk(symbols) {
  const res = await fetch(`${RF_API}/rank-live?symbols=${encodeURIComponent(symbols.join(","))}`);
  if (!res.ok) throw new Error(`rank-live ${res.status}`);
  const data = await res.json();
  const now = Date.now();
  for (const [sym, v] of Object.entries((data && data.v) || {})) rfLiveCache.set(sym, { at: now, v });
}
// symbols 중 최근 값이 없는 것만 30개씩 나눠 병렬 조회. 일부가 실패해도 가져온 것만 쓴다
async function rfFetchLive(symbols, onProgress, force) {
  const need = symbols.filter((s) => force || !rfLiveCache.has(s) || Date.now() - rfLiveCache.get(s).at > RF_LIVE_TTL);
  if (!need.length) return true;
  const chunks = [];
  for (let i = 0; i < need.length; i += 30) chunks.push(need.slice(i, i + 30));
  let done = 0;
  let ok = 0;
  let idx = 0;
  const worker = async () => {
    while (idx < chunks.length) {
      const chunk = chunks[idx++];
      try {
        await rfFetchLiveChunk(chunk);
        ok++;
      } catch {}
      done += chunk.length;
      if (onProgress) onProgress(Math.min(done, need.length), need.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, chunks.length) }, worker));
  return ok > 0;
}
// 워커가 아직 새 경로를 모르면(재배포 전) 화면에 보이는 종목만 예전 방식(차트 프록시)으로 현재가·등락률을 채운다
async function rfFallbackQuotes(symbols) {
  await mapWithConcurrency(
    symbols.filter((s) => !rfLiveCache.has(s)),
    6,
    async (sym) => {
      try {
        const chart = await yahooChart(sym, "5d", "1d");
        const r0 = chart && chart.chart && chart.chart.result && chart.chart.result[0];
        if (!r0 || !r0.meta) return;
        const meta = r0.meta;
        rfLiveCache.set(sym, { at: Date.now(), v: [meta.regularMarketPrice ?? null, getDailyChangePercent(chart), null, meta.fiftyTwoWeekHigh ?? null, meta.fiftyTwoWeekLow ?? null, null, null, meta.shortName || meta.longName || null], fallback: true });
      } catch {}
    },
    () => {}
  );
}

// ---- 목록 만들기 ----
function rfGroupKey() {
  if (rfState.sec === "etf") return rfState.market === "kr" ? "etfKr" : "etfUs";
  if (rfState.sec === "crypto") return "crypto200";
  return rfState.market === "kr" ? "kr350" : "sp500";
}
function rfLabelOf(key) {
  const it = RF_ITEMS[key];
  return rfState.sec !== "stocks" && it.assetLabel ? it.assetLabel : it.label;
}
function rfCurrencyOf(sym) {
  return /\.(KS|KQ)$/.test(sym) || /^KRW-/.test(sym) ? "KRW" : "USD";
}
function rfValueOf(sym, m, key) {
  const live = rfLiveCache.get(sym);
  const lv = live && !live.fallback ? live.v : null;
  if (lv) {
    if (key === "dv" && Number.isFinite(lv[2])) return lv[2];
    if (key === "w52" && Number.isFinite(lv[3]) && Number.isFinite(lv[4]) && lv[3] > lv[4] && Number.isFinite(lv[0])) return Math.max(0, Math.min(100, ((lv[0] - lv[4]) / (lv[3] - lv[4])) * 100));
    if (key === "per" && Number.isFinite(lv[0]) && Number.isFinite(m.eps) && m.eps > 0) return lv[0] / m.eps;
    if (key === "vol" && Number.isFinite(lv[5])) return lv[5];
    if (key === "rsi" && Number.isFinite(lv[6])) return lv[6];
  }
  if (key === "aum") return Number.isFinite(rfAumMap.get(sym)) ? rfAumMap.get(sym) : null;
  return Number.isFinite(m[key]) ? m[key] : null;
}
const rfAumMap = new Map();
async function rfLoadAum() {
  if (rfAumMap.size) return;
  try {
    const mdb = await getEtfMarketCapDb();
    ((mdb && mdb.kr) || []).forEach((x) => rfAumMap.set(x.s, x.m));
    ((mdb && mdb.us) || []).forEach((x) => rfAumMap.set(x.s, x.a));
  } catch {}
}
function rfBuildRows(baseline) {
  const gk = rfGroupKey();
  const item = RF_ITEMS[rfState.key];
  const rows = [];
  for (const [sym, m] of Object.entries((baseline && baseline.members) || {})) {
    if (m.g !== gk) continue;
    const v = rfValueOf(sym, m, rfState.key);
    if (!Number.isFinite(v)) continue;
    if (item.positive && v <= 0) continue;
    rows.push({ symbol: sym, m, v });
  }
  rows.sort(item.dir === "asc" ? (a, b) => a.v - b.v : (a, b) => b.v - a.v);
  return rows;
}

// ---- 셀 ----
function rfWrTotal(sym) {
  const db = typeof winRateDbResolved !== "undefined" ? winRateDbResolved : null;
  if (!db) return null;
  const map = rfState.sec === "etf" ? db.scoresEtf : rfState.sec === "crypto" ? db.scoresCrypto : isKrTicker(sym) ? db.scoresKr : db.scores;
  const e = map && map[sym];
  return e && Number.isFinite(e.total) ? e.total : null;
}
// 2026-10-22 사용자 요청: 상장 10년(코인 7년) 미만이면 ⚠️ 대신 값 아래 줄에 작게 "(2년10개월)" — 몇 년 평균인지
function rfPeriodLine(sym) {
  const total = rfWrTotal(sym);
  if (!Number.isFinite(total) || total >= partialMonthsFor(sym)) return "";
  return `<br><span class="rf-period">(${srMonthsText(total)})</span>`;
}
function rfCell(key, v, sym) {
  const cur = rfCurrencyOf(sym);
  switch (key) {
    case "win":
      return `${winRatePctCellHtml(v, null, false)}${rfPeriodLine(sym)}`;
    case "ret":
      return `${ret1yCellHtml(v)}${rfPeriodLine(sym)}`;
    case "rev":
      return rfState.sec === "stocks" ? fmtGrowthCell(v) : ret1yCellHtml(v);
    case "ni":
    case "cf":
      return fmtGrowthCell(v);
    case "vol":
      return `<b class="rank-hl">${v.toFixed(2)}%</b>`;
    case "rsi":
      return rsiRankCellHtml(Math.round(v * 10) / 10);
    case "om":
    case "roe":
    case "debt":
      return `<b class="rank-hl">${v.toFixed(1)}%</b>`;
    case "div":
    case "fee":
      return `<b class="rank-hl">${v.toFixed(2)}%</b>`;
    case "mcap":
    case "dv":
    case "aum":
      return `<b class="rank-hl">${fmtAmountUnified(v, cur)}</b>`;
    case "per":
      return `<b class="rank-hl">${v.toFixed(1)}배</b>`;
    case "w52":
      return `<b class="rank-hl">${v.toFixed(0)}%</b><br><span class="week52-pos-hint">${v >= 50 ? "(100%: 최고)" : "(0%: 최저)"}</span>`;
    default:
      return String(v);
  }
}
let rfKrNames = null;
async function rfNameCell(sym, liveName) {
  if (rfState.sec === "etf") {
    const isKr = isKrTicker(sym);
    return etfRankNameCellHtml({ symbol: sym, name: liveName || "" }, isKr);
  }
  if (rfState.sec === "crypto") {
    return rankNameCellHtml(sym, tickerLogoHtml(sym), cryptoKoName(sym, liveName || sym), rankCodeLabel(sym));
  }
  const isKr = rfState.market === "kr";
  let name = TICKER_TO_KOREAN_NAME[sym] || liveName || sym; // 한글명 → (없으면) 시세에서 받은 영문명 → 티커
  if (isKr) {
    if (!rfKrNames) rfKrNames = await getKrSymbolNameMap().catch(() => new Map());
    name = rfKrNames.get(sym) || name;
  }
  return rankNameCellHtml(sym, tickerLogoHtml(sym), isKr ? name : rankDisplayName(sym, name, false));
}

// ---- 화면 ----
const rfSleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rfRender(opts) {
  const statusEl = el("trendStatus");
  const resultsEl = el("trendResults");
  const token = ++rfState.token;
  const t0 = performance.now();
  const key = rfState.key;
  const isLiveKey = RF_LIVE_FIELDS.has(key);
  showRankingGroup("trend");
  resultsEl.innerHTML = "";
  statusEl.style.display = "block";
  statusEl.textContent = `${rfLabelOf(key)} 순위를 불러오는 중...`;
  const baseline = await getSReportBaseline();
  if (token !== rfState.token) return;
  if (!baseline || !baseline.members) {
    statusEl.textContent = "❌ 순위 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
    return;
  }
  rfState.asOf = baseline.generatedAt || "";
  if (key === "aum") await rfLoadAum();
  await ensureWinRateDbResolved().catch(() => {});
  const gk = rfGroupKey();
  const universe = Object.entries(baseline.members).filter(([, m]) => m.g === gk).map(([s]) => s);
  rfState.liveFailed = false;
  let liveOk = true;
  if (isLiveKey) {
    // 실시간 항목: 전체 종목의 현재 값을 병렬로 모아서 정렬(걸린 시간을 기록해 둠)
    liveOk = await rfFetchLive(
      universe,
      (done, total) => {
        if (token === rfState.token) statusEl.textContent = `${rfLabelOf(key)} 실시간 값 취합 중... (${done}/${total}종목)`;
      },
      !!(opts && opts.force)
    );
    if (token !== rfState.token) return;
    if (liveOk) rfLiveMsPut(performance.now() - t0);
    else rfState.liveFailed = true;
  }
  rfState.rows = rfBuildRows(baseline);
  if (token !== rfState.token) return;
  // 화면에 보일 종목의 현재가·등락률(DB 항목은 이것만 조회)
  const visible = rfState.rows.slice(0, rfState.shown).map((r) => r.symbol);
  if (!isLiveKey) {
    // DB 항목: 보이는 종목의 현재가를 받는 동안, 실시간 항목과 비슷한 시간 동안 같은 "불러오는 중" 화면을 보여 줌
    // (항목마다 대기시간이 들쭉날쭉하지 않게 — 사용자 요청). 현재가 조회와 대기는 동시에 진행
    const target = Math.min(9000, rfLiveMsGet());
    const livePart = (async () => {
      const ok = await rfFetchLive(visible, null, !!(opts && opts.force)).catch(() => false);
      if (!ok) await rfFallbackQuotes(visible);
    })();
    const waitPart = (async () => {
      const total = universe.length;
      const steps = 12;
      const spent = performance.now() - t0;
      if (spent >= target) return;
      const wait = target - spent;
      for (let i = 1; i <= steps; i++) {
        await rfSleep(wait / steps);
        if (token !== rfState.token) return;
        statusEl.textContent = `${rfLabelOf(key)} 순위 계산 중... (${Math.round((total * i) / steps)}/${total}종목)`;
      }
    })();
    await Promise.all([livePart, waitPart]);
    if (token !== rfState.token) return;
    liveOk = true;
  }
  if (!liveOk) await rfFallbackQuotes(visible);
  if (token !== rfState.token) return;
  statusEl.style.display = "none";
  await rfPaint();
}
async function rfPaint() {
  const resultsEl = el("trendResults");
  const key = rfState.key;
  const item = RF_ITEMS[key];
  const rows = rfState.rows || [];
  if (!rows.length) {
    resultsEl.innerHTML = `<p class="muted">순위를 계산하지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
    return;
  }
  const ordered = rfState.reverse ? rows.slice().reverse() : rows; // 뒤에서부터 보기(꼴찌부터)
  const shown = ordered.slice(0, rfState.shown);
  const isAsset = rfState.sec !== "stocks";
  const body = (
    await Promise.all(
      shown.map(async (r) => {
        const live = rfLiveCache.get(r.symbol);
        const price = live && Number.isFinite(live.v[0]) ? live.v[0] : null;
        const chg = live && Number.isFinite(live.v[1]) ? live.v[1] : null;
        const nameCell = await rfNameCell(r.symbol, live && live.v ? live.v[7] : null);
        return `<tr><td>${nameCell}</td><td>${rankPriceCellHtml(r.symbol, price, rfCurrencyOf(r.symbol), chg)}</td><td>${rfCell(key, r.v, r.symbol)}</td></tr>`;
      })
    )
  ).join("");
  const th = isAsset && item.assetTh ? item.assetTh : item.th;
  const thHtml = th.startsWith("<th") ? th : `<th data-explain="${escapeHtml(S_REPORT_EXPLAIN[key] || "")}">${th}</th>`;
  const total = rows.length;
  const more = shown.length < total;
  const nextN = Math.min(RF_PAGE, total - shown.length);
  const groupLabel = isAsset ? (rfState.sec === "etf" ? (rfState.market === "kr" ? "국내 상장 ETF" : "미국 상장 ETF") : "비트코인 시총 상위") : rfState.market === "kr" ? "코스피200+코스닥150" : "S&P500";
  const liveNote = RF_LIVE_FIELDS.has(key) ? "실시간 값 기준" : `DB 기준(하루 2번 갱신${rfState.asOf ? " · " + String(rfState.asOf).slice(0, 10) : ""})`;
  resultsEl.innerHTML = `
    ${rfHeadHtml(key)}
    <table class="top30-table rk-table">
      <thead><tr>${isAsset ? RANK_TH_NAME_ETF : RANK_TH_NAME}${RANK_TH_PRICE}${thHtml}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${more ? `<button type="button" class="cat-btn load-more-btn rf-more">더보기 (${nextN}개 더 · 전체 ${total.toLocaleString()}개 중 ${rfState.reverse ? `뒤에서 ${shown.length}위까지` : `${shown.length}위까지`})</button>` : ""}
    <p class="disclaimer tab-note"><span style="filter:grayscale(1);">📢</span> ${groupLabel} ${total.toLocaleString()}개 전체를 대상으로 매긴 순위(${liveNote})이며, 현재가·등락률은 실시간입니다.${rfState.liveFailed ? " <b>※ 지금은 실시간 값을 못 받아 최근 갱신 값으로 매겼어요.</b>" : ""} 투자 자문이 아닙니다.</p>`;
}
// 머리줄: 안내 + 오른쪽 "+○○이란" (승률은 기존 "+승률이란" 자리 그대로)
function rfHeadHtml(key) {
  const btn = `<button type="button" class="score-method-detail-btn metric-explain-btn" data-rf-explain="${key}">${rfExplainLabel(key)}</button>`;
  const rev = `<button type="button" class="score-method-detail-btn rf-rev-btn${rfState.reverse ? " on" : ""}" data-rf-reverse="1">${rfState.reverse ? "앞에서부터" : "뒤에서부터"}</button>`;
  return `<div class="popular-head-row"><span class="tap-hint pop-hint">${RANK_HINT_SPAN}</span><span class="rf-head-btns">${rev}${btn}</span></div>`;
}
function rfHasBatchim(nm) {
  const last = nm.charCodeAt(nm.length - 1);
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
}

// ---- 진입점(app.js의 openSReportRank가 부름) ----
function fastRankOpen(itemKey, section, market) {
  rfState.sec = section === "etf" || section === "crypto" ? section : "stocks";
  rfState.market = market === "kr" ? "kr" : "us";
  if (rfState.sec === "etf") rfState.market = etfPopularRegion === "kr" ? "kr" : "us";
  if (!RF_ITEMS[itemKey]) itemKey = "win";
  rfState.key = itemKey;
  rfState.shown = RF_PAGE;
  rfState.reverse = false;
  rfRender();
}
function fastRankRefresh() {
  rfRender({ force: true });
}
document.addEventListener("click", async (e) => {
  const more = e.target.closest(".rf-more");
  if (more) {
    e.preventDefault();
    more.disabled = true;
    more.textContent = "불러오는 중...";
    rfState.shown += RF_PAGE;
    const ord2 = rfState.reverse ? (rfState.rows || []).slice().reverse() : rfState.rows || [];
    const visible = ord2.slice(0, rfState.shown).map((r) => r.symbol);
    const ok = await rfFetchLive(visible, null, false).catch(() => false);
    if (!ok) await rfFallbackQuotes(visible);
    await rfPaint();
    return;
  }
  const rv = e.target.closest("[data-rf-reverse]");
  if (rv) {
    e.preventDefault();
    e.stopPropagation();
    rfState.reverse = !rfState.reverse;
    rfState.shown = RF_PAGE;
    const ord = rfState.reverse ? (rfState.rows || []).slice().reverse() : rfState.rows || [];
    const visible = ord.slice(0, RF_PAGE).map((r) => r.symbol);
    const ok = await rfFetchLive(visible, null, false).catch(() => false);
    if (!ok) await rfFallbackQuotes(visible);
    await rfPaint();
    return;
  }
  const ex = e.target.closest("[data-rf-explain]");
  if (ex) {
    e.preventDefault();
    e.stopPropagation();
    const head = ex.closest(".popular-head-row");
    const next = head && head.nextElementSibling;
    const nm = rfExplainName(ex.dataset.rfExplain);
    const label = rfExplainLabel(ex.dataset.rfExplain);
    if (next && next.classList.contains("rf-explain-box")) {
      next.remove();
      ex.textContent = label;
      return;
    }
    if (head) {
      head.insertAdjacentHTML("afterend", `<div class="chart-detail-wrap chart-detail-expanded rf-explain-box"><p class="muted" style="padding:8px 2px;">불러오는 중...</p></div>`);
      const box = head.nextElementSibling;
      ex.textContent = `−${nm}${rfHasBatchim(nm) ? "이란" : "란"} 닫기`;
      const sec = rfState.sec === "stocks" ? (rfState.market === "kr" ? "kr" : "us") : rfState.sec;
      box.innerHTML = await buildMetricExplainHtml(ex.dataset.rfExplain, sec);
    }
  }
});

// ---------- "+○○이란" 설명(2026-10-21 사용자 요청) — 지도의 "+RSI란?" 같은 설명을 별별순위·검색상세에서 그대로 ----------
// 글(2줄) + 대표 종목들의 지금 값을 색깔 막대로 비교. 값은 DB(sreport-baseline)에서 읽어 별도 조회가 없다.
const RF_EXPLAIN_NAME = {
  win: "승률", ret: "상승률", rev: "매출성장률", vol: "변동성", rsi: "RSI", ni: "순이익", om: "영업이익률", roe: "ROE", cf: "현금흐름",
  debt: "부채비율", mcap: "시가총액", dv: "거래대금", w52: "52주 구간", per: "PER", div: "배당률", fee: "운용보수", aum: "규모", ret1y: "수익률",
};
// section: 지금 화면의 투자처(기본은 별별순위 상태) — ETF·코인에서 "매출성장률" 자리는 "수익률"
function rfExplainName(key, section) {
  const sec = section || (rfState.sec === "stocks" ? "stocks" : rfState.sec);
  if (key === "rev" && sec !== "stocks" && sec !== "kr" && sec !== "us") return "수익률";
  return RF_EXPLAIN_NAME[key] || (RF_ITEMS[key] && RF_ITEMS[key].label) || key;
}
function rfExplainLabel(key, section) {
  const nm = rfExplainName(key, section);
  return `+${nm}${rfHasBatchim(nm) ? "이란" : "란"}`;
}
const RF_REPS = {
  kr: ["005930.KS", "000660.KS", "005380.KS", "035420.KS", "373220.KS", "207940.KS", "051910.KS", "105560.KS"],
  us: ["AAPL", "MSFT", "NVDA", "TSLA", "KO", "JPM", "XOM", "JNJ"],
  etf: ["SPY", "QQQ", "VOO", "SCHD", "TLT", "GLD", "069500.KS", "360750.KS"],
  crypto: ["BTC-USD", "ETH-USD", "XRP-USD", "SOL-USD", "BNB-USD", "DOGE-USD", "ADA-USD", "TRX-USD"],
};
const RF_COLORS = ["#ef4444", "#3b82f6", "#16a34a", "#f59e0b", "#8b5cf6", "#ec4899", "#0ea5e9", "#84cc16"];
// ETF는 이름이 길어 표에서 잘리므로 "티커 · 간단 설명"만(2026-10-21 사용자 요청)
const ETF_SHORT_DESC = {
  SPY: "S&P500", VOO: "S&P500", IVV: "S&P500", SPLG: "S&P500", QQQ: "나스닥100", QQQM: "나스닥100", VTI: "미국 전체", VT: "전세계", SCHD: "배당성장", VYM: "고배당",
  TLT: "미국 장기채", IEF: "미국 중기채", BND: "미국 종합채권", AGG: "미국 종합채권", GLD: "금", IAU: "금", SLV: "은", IBIT: "비트코인", FBTC: "비트코인", ETHA: "이더리움",
  JEPI: "월배당 커버드콜", JEPQ: "나스닥 커버드콜", QYLD: "나스닥 커버드콜", ARKK: "혁신성장", XLK: "기술주", XLF: "금융주", XLE: "에너지", XLV: "헬스케어", SMH: "반도체", SOXX: "반도체", SOXL: "반도체 3배", TQQQ: "나스닥 3배", SQQQ: "나스닥 인버스3배",
  EEM: "신흥국", VWO: "신흥국", VEA: "선진국", EFA: "선진국", IWM: "러셀2000", IWF: "미국 성장주", VUG: "미국 성장주", VTV: "미국 가치주", DIA: "다우존스", USO: "원유", LQD: "투자등급 회사채", HYG: "하이일드",
  "069500.KS": "코스피200", "102110.KS": "코스피200", "360750.KS": "미국 S&P500", "133690.KS": "미국 나스닥100", "305720.KS": "2차전지", "091160.KS": "반도체", "229200.KS": "코스닥150", "114800.KS": "코스피 인버스", "122630.KS": "코스피 레버리지",
};
function etfShortLabel(sym, name) {
  const code = String(sym).replace(/\.(KS|KQ)$/, "");
  const desc = ETF_SHORT_DESC[sym] || (name ? String(name).replace(/^(KODEX|TIGER|ACE|KBSTAR|SOL|HANARO|ARIRANG|KOSEF|PLUS|RISE)\s*/i, "").slice(0, 10) : "");
  return desc ? `${code} · ${desc}` : code;
}
const RF_PCT_KEYS = new Set(["win", "ret", "rev", "ni", "cf", "om", "roe", "debt", "div", "fee", "vol", "ret1y"]);
const RF_AMT_KEYS = new Set(["mcap", "dv", "aum"]);
async function buildMetricExplainHtml(key, section) {
  if (key === "win") return buildWinRateBenchmarkHtml();
  const baseline = await getSReportBaseline();
  const desc = S_REPORT_EXPLAIN[key === "ret1y" ? "rev" : key] || "";
  const nm = rfExplainName(key, section);
  const intro = `<p class="rf-explain-intro">${escapeHtml(desc).replace(/\n/g, "<br>")}</p>`;
  if (key === "rsi") {
    // RSI는 SPY 5년 주봉 그래프 예시가 이미 있어 같이 보여줌
    try {
      const chart = await buildRsiSpyDetailHtml();
      return `${intro}${chart}`;
    } catch {}
  }
  if (!baseline || !baseline.members) return `${intro}<p class="muted">비교할 대표 종목 값을 아직 불러오지 못했어요.</p>`;
  const reps = RF_REPS[section] || RF_REPS.us;
  const rows = [];
  reps.forEach((sym, i) => {
    const m = baseline.members[sym];
    let v = m ? m[key === "ret1y" ? "rev" : key] : null;
    if (key === "aum" && rfAumMap.size) v = rfAumMap.get(sym);
    if (Number.isFinite(v)) {
      const isEtf = section === "etf";
      const label = isEtf ? etfShortLabel(sym, "") : section === "crypto" ? cryptoKoName(sym, sym) : TICKER_TO_KOREAN_NAME[sym] || sym;
      rows.push({ sym, v, label, color: RF_COLORS[rows.length % RF_COLORS.length] });
    }
  });
  if (rows.length < 3) return `${intro}<p class="muted">비교할 대표 종목 값을 아직 불러오지 못했어요.</p>`;
  const isAmt = RF_AMT_KEYS.has(key);
  const vals = rows.map((r) => r.v);
  const vmin = isAmt ? 0 : Math.min(0, ...vals);
  const vmax = Math.max(0, ...vals);
  const scale = isAmt ? (x) => Math.sqrt(Math.max(x, 0)) : (x) => x;
  const lo = scale(vmin);
  const hi = scale(vmax);
  const span = hi - lo || 1;
  const zeroPct = ((scale(0) - lo) / span) * 100;
  const fmt = (v, sym) => (isAmt ? fmtAmountUnified(v, rfCurrencyOf(sym)) : key === "fee" || key === "div" ? `${v.toFixed(2)}%` : key === "per" ? `${v.toFixed(1)}배` : key === "rsi" ? v.toFixed(0) : key === "w52" ? `${v.toFixed(0)}%` : `${v > 0 && !["om", "roe", "debt", "div", "fee", "vol"].includes(key) ? "+" : ""}${Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)}%`);
  const body = rows
    .sort((a, b) => b.v - a.v)
    .map(({ sym, v, label, color }) => {
      const x = ((scale(v) - lo) / span) * 100;
      const left = Math.min(x, zeroPct);
      const width = Math.max(1.2, Math.abs(x - zeroPct));
      return `<div class="mx-row"><span class="mx-name"><i style="background:${color}"></i>${escapeHtml(label)}</span><span class="mx-track"><span class="mx-zero" style="left:${zeroPct.toFixed(1)}%"></span><span class="mx-bar" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${color}"></span></span><b class="mx-val">${escapeHtml(fmt(v, sym))}</b></div>`;
    })
    .join("");
  return `${intro}<h3 class="wr-bench-title">대표 종목 ${nm} 비교</h3><div class="mx-chart">${body}</div><p class="wr-bench-note">대표 종목의 최근 값이에요. 과거·현재 데이터이며 미래 수익을 보장하지 않고 투자 자문이 아닙니다.</p>`;
}
