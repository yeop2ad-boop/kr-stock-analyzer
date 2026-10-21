// ---------- 실시간 랭킹 (2026-10-21 사용자 요청) ----------
// 시장(지도) 왼쪽 위 시계 위에 "실시간 1 종목명 ›" 버튼이 1위~10위를 위로 올라오며 돌아가고, 누르면 실시간 랭킹 페이지로.
// 페이지: 인기 / 거래량 / 상승 / 하락 — 각 20개, 오른쪽 위 지역 선택으로 한국주식·미국주식·ETF·비트코인 중에서 순위.
// 조회수 = 최근 24시간 [검색 + 시장에서 종목 클릭 + 관심 등록], 한 IP당 24시간에 최대 30회까지만 셈(서버 /search-log, /search-popular).
// app.js 다음에 불러온다(app.js의 함수·데이터를 그대로 사용).

const RT_API = "https://us-stock.yeop2ad.workers.dev";
const RT_GROUPS = [["kr", "한국주식"], ["us", "미국주식"], ["etf", "ETF"], ["crypto", "비트코인"]];
const RT_TABS = [["popular", "인기"], ["volume", "거래량"], ["up", "상승"], ["down", "하락"]];
// 아직 조회가 쌓이지 않았을 때 1~10위를 채우는 기본 종목(시가총액 큰 순)
const RT_FALLBACK = ["005930.KS", "NVDA", "000660.KS", "TSLA", "AAPL", "MSFT", "035420.KS", "GOOGL", "AMZN", "META"];

let rtGroup = "kr";
let rtTab = "popular";
let rtPopular = null; // [{symbol, count}] 최근 24시간 전체
let rtPopularAt = 0;
let rtTickerList = [];
let rtTickerIdx = 0;
let rtTickerTimer = null;
const rtLiveCache = {}; // group -> { at, map: Map(symbol -> {chg, val}) }
const rtEl = (id) => document.getElementById(id);

async function rtFetchPopular(force) {
  if (!force && rtPopular && Date.now() - rtPopularAt < 120000) return rtPopular;
  try {
    const res = await fetch(`${RT_API}/search-popular?n=300`);
    const data = await res.json();
    rtPopular = (data && data.popular) || [];
  } catch {
    rtPopular = rtPopular || [];
  }
  rtPopularAt = Date.now();
  return rtPopular;
}

// ---- 왼쪽 위 롤링 버튼 ----
function rtNameOf(sym) {
  const n = koNameOf(sym, sym);
  return n === sym ? sym.replace(/-(USD|KRW|USDT)$/, "").replace(/^KRW-/, "") : n; // 코인은 BTC처럼 기본 티커만
}
async function rtRefreshTicker() {
  const pop = await rtFetchPopular(true);
  const list = pop.map((p) => p.symbol).slice(0, 10);
  RT_FALLBACK.forEach((s) => list.length < 10 && !list.includes(s) && list.push(s));
  rtTickerList = list.slice(0, 10);
  if (!rtTickerList[rtTickerIdx]) rtTickerIdx = 0;
  // 핵심 목록(core)에 없어 이름을 못 찾는 종목이 있으면 그 시장의 전체 목록만 조용히 불러와 이름표를 다시 만듦(코스닥 등)
  const unknown = rtTickerList.filter((sym) => koNameOf(sym, sym) === sym && !/-(USD|KRW|USDT)$/.test(sym) && !/^KRW-/.test(sym));
  const loads = [];
  if (unknown.some((sym) => /\.(KS|KQ)$/.test(sym)) && typeof KR_EXTRA_DATA === "undefined") loads.push(ensureExtraDataLoaded("domestic").catch(() => {}));
  if (unknown.some((sym) => !/\.(KS|KQ)$/.test(sym)) && !extraDataFor("overseas")) loads.push(ensureExtraDataLoaded("overseas").catch(() => {}));
  if (loads.length) {
    await Promise.all(loads);
    ALL_DATASET_NAMES = null;
  }
}
function rtShowTicker(animate) {
  const slot = rtEl("rtTickerSlot");
  if (!slot || !rtTickerList.length) return;
  const sym = rtTickerList[rtTickerIdx % rtTickerList.length];
  const html = `<span class="rt-n">${(rtTickerIdx % rtTickerList.length) + 1}</span><span class="rt-nm">${mineEsc(rtNameOf(sym))}</span>`;
  const next = document.createElement("span");
  next.className = "rt-line" + (animate ? " rt-enter" : "");
  next.innerHTML = html;
  const old = slot.querySelector(".rt-line");
  slot.appendChild(next);
  if (old) {
    old.classList.add("rt-leave");
    setTimeout(() => old.remove(), 450);
  }
  if (animate) requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("rt-enter")));
}
function rtStartTicker() {
  clearInterval(rtTickerTimer);
  rtShowTicker(false);
  rtTickerTimer = setInterval(() => {
    if (document.hidden) return;
    rtTickerIdx = (rtTickerIdx + 1) % Math.max(1, rtTickerList.length); // 10위까지 가면 다시 1위부터
    rtShowTicker(true);
  }, 2800);
}

// ---- 페이지 ----
async function rtLoadUniverse(g) {
  if (g === "kr") {
    if (typeof KR_EXTRA_DATA === "undefined") await ensureExtraDataLoaded("domestic").catch(() => {});
    return allKrStocks();
  }
  if (g === "us") {
    if (!extraDataFor("overseas")) await ensureExtraDataLoaded("overseas").catch(() => {});
    return allUsStocks();
  }
  if (typeof ETF_MAP_DATA === "undefined") await ensureEtfCryptoDataLoaded().catch(() => {});
  if (g === "etf") return typeof ETF_MAP_DATA !== "undefined" ? ETF_MAP_DATA.companies : [];
  return typeof CRYPTO_MAP_DATA !== "undefined" ? CRYPTO_MAP_DATA.companies : [];
}
// 지금 값(등락률·거래대금) — 투자처마다 가장 빠른 길로(한국: 워커 /kr-quotes, 미국: 섹터 스크리너, ETF·코인: 워커 /day-vals). 3분 캐시
async function rtLiveFor(g, list) {
  const hit = rtLiveCache[g];
  if (hit && Date.now() - hit.at < 180000) return hit.map;
  const map = new Map();
  try {
    if (g === "kr") {
      const { quotes, vals } = await fetchKrQuotesAll();
      for (const [sym, chg] of Object.entries(quotes || {})) map.set(sym, { chg, val: (vals || {})[sym] });
    } else if (g === "us") {
      const ids = Object.values(LIVE_SECTOR_SCREENER_ID);
      const known = new Set(list.map((c) => c.symbol));
      let i = 0;
      const worker = async () => {
        while (i < ids.length) {
          const quotes = await fetchSectorScreenerLive(ids[i++]).catch(() => null);
          for (const q of quotes || []) {
            if (!q || !q.symbol) continue;
            const sym = known.has(q.symbol) ? q.symbol : q.symbol.replace("-", ".");
            map.set(sym, {
              chg: typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : undefined,
              val: typeof q.regularMarketPrice === "number" && typeof q.regularMarketVolume === "number" ? q.regularMarketPrice * q.regularMarketVolume : undefined,
            });
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    } else {
      const syms = list.map((c) => c.symbol);
      const chunks = [];
      for (let i = 0; i < syms.length; i += 45) chunks.push(syms.slice(i, i + 45));
      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const res = await fetch(`${RT_API}/day-vals?symbols=${encodeURIComponent(chunk.join(","))}`);
            if (!res.ok) return;
            const d = await res.json();
            for (const [sym, v] of Object.entries(d.vals || {})) map.set(sym, { ...(map.get(sym) || {}), val: v });
            for (const [sym, p] of Object.entries(d.chgs || {})) map.set(sym, { ...(map.get(sym) || {}), chg: p });
          } catch {}
        })
      );
    }
  } catch {}
  rtLiveCache[g] = { at: Date.now(), map };
  return map;
}
const rtIsKrw = (sym) => /\.(KS|KQ)$/.test(sym) || /^KRW-/.test(sym);
function rtFmtVal(sym, v) {
  if (!Number.isFinite(v)) return "-";
  if (rtIsKrw(sym)) return fmtWonCompact(v);
  const b = 1e9;
  return v >= b ? `$${(v / b).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`;
}
function rtRowHtml(i, c, right, rightCls) {
  const name = c.displayName && /^[가-힣]/.test(c.displayName) ? c.displayName : koNameOf(c.symbol, c.name);
  return `<button type="button" class="rt-row" data-sym="${mineEsc(c.symbol)}"><span class="rt-rk${i < 3 ? " top" : ""}">${i + 1}</span><img class="rt-logo" loading="lazy" alt="" src="${mineEsc(logoUrl(c.symbol, "low"))}" onerror="this.style.visibility='hidden'" /><span class="rt-nm2"><b>${mineEsc(name)}</b><small>${mineEsc(c.symbol)}</small></span><span class="rt-val ${rightCls || ""}">${right}</span></button>`;
}
let rtRenderToken = 0;
async function rtRenderList() {
  const token = ++rtRenderToken;
  const box = rtEl("rtList");
  box.innerHTML = `<p class="rt-empty">불러오는 중...</p>`;
  const g = rtGroup;
  const list = await rtLoadUniverse(g);
  if (token !== rtRenderToken) return;
  const bySym = new Map(list.map((c) => [c.symbol, c]));
  let rows = [];
  if (rtTab === "popular") {
    const pop = await rtFetchPopular(true);
    if (token !== rtRenderToken) return;
    const ranked = pop.filter((p) => bySym.has(p.symbol)).slice(0, 20);
    const used = new Set(ranked.map((p) => p.symbol));
    // 조회가 20개에 못 미치면 시가총액 큰 종목으로 채움(조회수 0회)
    const filler = list.filter((c) => !used.has(c.symbol) && c.marketCap > 0).sort((a, b) => capUsdOf(b) - capUsdOf(a));
    const merged = ranked.map((p) => ({ c: bySym.get(p.symbol), n: p.count }));
    for (const c of filler) {
      if (merged.length >= 20) break;
      merged.push({ c, n: 0 });
    }
    rows = merged.map((m, i) => rtRowHtml(i, m.c, `${m.n.toLocaleString()}회`, ""));
  } else {
    const live = await rtLiveFor(g, list);
    if (token !== rtRenderToken) return;
    const items = list
      .map((c) => {
        const l = live.get(c.symbol) || {};
        return { c, chg: Number.isFinite(l.chg) ? l.chg : c.changePercent, val: Number.isFinite(l.val) ? l.val : c.dollarVolume };
      })
      .filter((x) => (rtTab === "volume" ? Number.isFinite(x.val) : Number.isFinite(x.chg)));
    const usd = (x) => (rtIsKrw(x.c.symbol) ? x.val / 1400 : x.val); // 원화·달러가 섞인 투자처(ETF·코인)도 같은 단위로 비교
    if (rtTab === "volume") items.sort((a, b) => usd(b) - usd(a));
    else if (rtTab === "up") items.sort((a, b) => b.chg - a.chg);
    else items.sort((a, b) => a.chg - b.chg);
    rows = items.slice(0, 20).map((x, i) =>
      rtTab === "volume"
        ? rtRowHtml(i, x.c, rtFmtVal(x.c.symbol, x.val), "")
        : rtRowHtml(i, x.c, `${x.chg >= 0 ? "+" : ""}${x.chg.toFixed(2)}%`, x.chg >= 0 ? "rt-up" : "rt-down")
    );
  }
  box.innerHTML = rows.length ? rows.join("") : `<p class="rt-empty">표시할 종목이 없어요</p>`;
}
function rtSyncHead() {
  rtEl("rtRegionLabel").textContent = (RT_GROUPS.find((x) => x[0] === rtGroup) || [])[1];
  rtEl("rtTabs").innerHTML = RT_TABS.map(([k, l]) => `<button type="button" class="rt-tab${k === rtTab ? " active" : ""}" data-tab="${k}">${l}</button>`).join("");
  rtEl("rtRegionMenu").innerHTML = RT_GROUPS.map(([k, l]) => `<button type="button" class="rt-region-item${k === rtGroup ? " active" : ""}" data-group="${k}">${l}</button>`).join("");
  rtEl("rtSub").textContent =
    rtTab === "popular"
      ? "최근 24시간 · 검색 + 시장 종목 클릭 + 관심 등록 · 한 사람이 하루 최대 30회까지만 집계"
      : rtTab === "volume"
      ? "지금까지 거래대금이 큰 순서 (실시간)"
      : rtTab === "up"
      ? "오늘 가장 많이 오른 순서 (실시간)"
      : "오늘 가장 많이 내린 순서 (실시간)";
}
function rtOpen() {
  rtEl("rtPage").classList.add("open");
  rtSyncHead();
  rtRenderList();
}
function rtClose() {
  rtEl("rtPage").classList.remove("open");
  rtEl("rtRegion").classList.remove("open");
}
function rtInit() {
  const btn = rtEl("rtTicker");
  if (!btn) return;
  btn.addEventListener("click", rtOpen);
  rtEl("rtBackBtn").addEventListener("click", rtClose);
  rtEl("rtTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".rt-tab");
    if (!b) return;
    rtTab = b.dataset.tab;
    rtSyncHead();
    rtRenderList();
  });
  rtEl("rtRegionBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    rtEl("rtRegion").classList.toggle("open");
  });
  rtEl("rtRegionMenu").addEventListener("click", (e) => {
    const b = e.target.closest(".rt-region-item");
    if (!b) return;
    rtGroup = b.dataset.group;
    rtEl("rtRegion").classList.remove("open");
    rtSyncHead();
    rtRenderList();
  });
  rtEl("rtPage").addEventListener("click", (e) => {
    if (!e.target.closest("#rtRegion")) rtEl("rtRegion").classList.remove("open");
    const row = e.target.closest(".rt-row");
    if (row) openDetailFromMap(row.dataset.sym); // 종목 상세(검색상세)로
  });
  // 처음엔 기본 종목으로 바로 돌리고, 서버에서 받은 실제 인기 순위가 오면 갈아 끼움 — 5분마다 갱신
  rtTickerList = RT_FALLBACK.slice();
  rtStartTicker();
  rtRefreshTicker().then(() => {
    rtTickerIdx = 0;
    rtShowTicker(false);
  });
  setInterval(() => rtRefreshTicker().catch(() => {}), 5 * 60 * 1000);
  // 뒤로가기(휴대폰 뒤로 버튼)로 페이지 닫기
  window.__rtPageOpen = () => rtEl("rtPage").classList.contains("open");
  window.__rtPageClose = rtClose;
}
rtInit();
