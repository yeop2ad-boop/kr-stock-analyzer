// ---------- 실시간 랭킹 (2026-10-21 사용자 요청) ----------
// 시장(지도) 왼쪽 위 시계 위에 "실시간 1 종목명 ›" 버튼이 1위~10위를 위로 올라오며 돌아가고, 누르면 실시간 랭킹 페이지로.
// 페이지: 인기 / 거래량 / 상승 / 하락 — 각 20개, 오른쪽 위 지역 선택으로 한국주식·미국주식·ETF·비트코인 중에서 순위.
// 조회수 = 최근 24시간 [검색 + 시장에서 종목 클릭 + 관심 등록], 제한 없이 모두 셈(서버 /search-log, /search-popular).
// app.js 다음에 불러온다(app.js의 함수·데이터를 그대로 사용).

const RT_API = "https://us-stock.yeop2ad.workers.dev";
const RT_GROUPS = [["all", "통합"], ["kr", "한국주식"], ["us", "미국주식"], ["etf", "ETF"], ["crypto", "비트코인"]];
const RT_MARK = { all: "mix", kr: "kr", us: "us", etf: "etf", crypto: "crypto" }; // 앱 안에서 쓰는 시장 마크(VIEW_MARK_SVG)
const RT_PAGE = 20; // 처음 20개, "더보기"를 누르면 최대 40개
const RT_MAX = 40;
const RT_TABS = [["popular", "인기"], ["volume", "거래량"], ["up", "상승"], ["down", "하락"]];
// 아직 조회가 쌓이지 않았을 때 1~10위를 채우는 기본 종목(시가총액 큰 순)
const RT_FALLBACK = ["005930.KS", "NVDA", "000660.KS", "TSLA", "AAPL", "MSFT", "035420.KS", "GOOGL", "AMZN", "META"];

// 지금 보고 있는 시장(한국·미국·ETF·코인) — 우량주 모음·내 시장처럼 하나로 안 정해지면 null
function rtViewGroup() {
  try {
    const m = MAP_VIEWS[ACTIVE_VIEW] && MAP_VIEWS[ACTIVE_VIEW].mark;
    return m === "kr" || m === "us" || m === "etf" || m === "crypto" ? m : null;
  } catch {
    return null;
  }
}
let rtGroup = "all";
let rtTab = "popular";
let rtShown = RT_PAGE;
let rtRowsHtml = [];
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
// 이름은 항상 기업명(한글)으로 — 목록의 종목 데이터에서 찾고, 그래도 없으면 티커에서 접미사만 뗀 기본 이름
let rtEtfSyms = null;
function rtNameFrom(sym, c, full) {
  // 미국 ETF는 긴 영어 이름 대신 티커(SPY·QQQ)로 — 한국 ETF는 한글 상품명 그대로
  if (!full && typeof ETF_MAP_DATA !== "undefined" && !/\.(KS|KQ)$/.test(sym)) {
    if (!rtEtfSyms) rtEtfSyms = new Set((ETF_MAP_DATA.companies || []).map((x) => x.symbol));
    if (rtEtfSyms.has(sym)) return sym;
  }
  if (c && c.displayName && /^[가-힣]/.test(c.displayName)) return c.displayName;
  if (/-(USD|KRW|USDT)$/.test(sym) || /^KRW-/.test(sym)) {
    if (typeof cryptoKoName === "function") {
      const k = cryptoKoName(sym, (c && c.name) || sym);
      if (k && k !== sym) return k;
    }
  }
  const n = koNameOf(sym, c && c.name);
  return n === sym ? sym.replace(/-(USD|KRW|USDT)$/, "").replace(/^KRW-/, "").replace(/\.(KS|KQ)$/, "") : n;
}
function rtNameOf(sym) {
  return rtNameFrom(sym, null);
}
// 2026-10-22 사용자 요청: 시장별 문구는 되돌리고, 예전처럼 "실시간" + 모든 종목 통합 1~10위
async function rtRefreshTicker() {
  const pop = await rtFetchPopular(true);
  const list = pop.map((p) => p.symbol).slice(0, 10);
  RT_FALLBACK.forEach((s) => list.length < 10 && !list.includes(s) && list.push(s));
  // 핵심 목록(core)에 없어 이름을 못 찾는 종목이 있으면 그 시장의 전체 목록만 조용히 불러와 이름표를 다시 만듦(코스닥 등)
  const unknown = list.filter((sym) => koNameOf(sym, sym) === sym && !/-(USD|KRW|USDT)$/.test(sym) && !/^KRW-/.test(sym));
  const loads = [];
  if (unknown.some((sym) => /\.(KS|KQ)$/.test(sym)) && typeof KR_EXTRA_DATA === "undefined") loads.push(ensureExtraDataLoaded("domestic").catch(() => {}));
  if (unknown.some((sym) => !/\.(KS|KQ)$/.test(sym)) && !extraDataFor("overseas")) loads.push(ensureExtraDataLoaded("overseas").catch(() => {}));
  if (loads.length) {
    await Promise.all(loads);
    ALL_DATASET_NAMES = null;
  }
  rtTickerList = list.slice(0, 10);
  if (!rtTickerList[rtTickerIdx]) rtTickerIdx = 0;
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
  if (g === "all") {
    // 한국·미국·ETF·코인을 한데 모음(인기 탭 통합 순위용)
    const parts = await Promise.all(["kr", "us", "etf", "crypto"].map((k) => rtLoadUniverse(k).catch(() => [])));
    const seen = new Set();
    return parts.flat().filter((c) => c && !seen.has(c.symbol) && seen.add(c.symbol));
  }
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
function rtLogoHtml(sym, name, c) {
  const ch = mineEsc(String(name || sym).replace(/^KODEX|^TIGER|^ACE|^SOL|^RISE|^KBSTAR|^HANARO/i, "").trim().charAt(0) || "?");
  // 2026-10-22: 로고가 안 뜨던 문제 — 내 서버 로고(low) → 선명한 로고(mid) → 외부 로고(미국 종목만) 순으로 차례로 시도하고, 다 안 되면 글자 사각형(검색상세처럼)
  const chain = rtLogoChain(sym, name, c);
  return `<span class="rt-logo"><img decoding="async" alt="" data-sym="${mineEsc(sym)}" data-step="0" src="${mineEsc(chain[0])}" onerror="rtLogoErr(this)" /><i>${ch}</i></span>`;
}
// 종목 종류마다 로고가 있는 곳이 달라서(코인·한국 ETF는 ../logos 아래 별도 폴더) 후보를 순서대로 모아 둔다
const RT_KR_ETF_LOGO = { KODEX: "kodex.png", TIGER: "tiger.png", RISE: "rise.png", KBSTAR: "rise.png", ACE: "ace.png", PLUS: "plus.png", ARIRANG: "plus.png", KIWOOM: "kiwoom.png", KOSEF: "kiwoom.png", FOCUS: "focus.png", TREX: "trex.png", "파워": "power.png", SOL: "sol.png", HANARO: "hanaro.png", "1Q": "oneq.svg", KoAct: "koact.svg", TIME: "time.png", TIMEFOLIO: "time.png", WON: "won.png", IBK: "ibk.svg" };
const RT_LOGO_OVERRIDE = { "323410.KS": "kakaobank.png", "000660.KS": "skhynix.png", "000880.KS": "hanwha.png", "042660.KS": "hanwha-ocean.png", "298040.KS": "hyosung-heavy.png", "010950.KS": "soil.png", "011200.KS": "hmm.png", "018260.KS": "samsung-sds.png", "120110.KS": "kolon.png", "000240.KS": "hankook-company.png", "000720.KS": "hyundai-enc.png", "064350.KS": "hyundai-rotem.png", "081660.KS": "fila-holdings.png", "112610.KS": "cswind.png", "003030.KS": "seah-steel.png", "003550.KS": "lg.svg", "012750.KS": "s1-corp.png", "251270.KS": "netmarble.png", "010120.KS": "ls-electric.png", "011210.KS": "hyundai-wia.png", "069620.KS": "daewoong.png" };
const rtLogoChains = {};
function rtLogoChain(sym, name, c) {
  if (rtLogoChains[sym]) return rtLogoChains[sym];
  const enc = encodeURIComponent(sym);
  const chain = [];
  if (/-USD$/.test(sym) || /^KRW-/.test(sym)) {
    // 코인: 내려받아 둔 코인 로고(../logos/crypto/BTC.png)
    const base = sym.replace(/^KRW-/, "").replace(/-USD$/, "").toUpperCase().replace(/\d+$/, "");
    chain.push(`../logos/crypto/${encodeURIComponent(base)}.png`, `../logos/crypto/${encodeURIComponent(sym.replace(/-USD$/, "").toUpperCase())}.png`);
  } else if (/\.(KS|KQ)$/.test(sym)) {
    if (RT_LOGO_OVERRIDE[sym]) chain.push(`../logos/${RT_LOGO_OVERRIDE[sym]}`);
    const brand = String((c && c.name) || name || "").split(" ")[0];
    if (RT_KR_ETF_LOGO[brand]) chain.push(`../logos/etf/${RT_KR_ETF_LOGO[brand]}`);
    chain.push(logoUrl(sym, "low"), logoUrl(sym, "mid"));
    chain.push(`https://ssl.pstatic.net/imgstock/fn/real/logo/stock/Stock${sym.slice(0, 6)}.svg`); // 코스닥 소형주 등 내 로고 모음에 없는 종목
  } else {
    chain.push(logoUrl(sym, "low"), logoUrl(sym, "mid"));
    if (/^[A-Z.\-]{1,6}$/.test(sym)) chain.push(logoUrlFallback(sym));
  }
  rtLogoChains[sym] = chain;
  return chain;
}
function rtLogoErr(img) {
  const chain = rtLogoChains[img.dataset.sym] || [];
  const step = +img.dataset.step + 1;
  img.dataset.step = step;
  if (chain[step]) img.src = chain[step];
  else {
    img.parentNode.classList.add("nologo");
    img.remove();
  }
}
window.rtLogoErr = rtLogoErr;
function rtRowHtml(i, c, right, rightCls) {
  const name = rtNameFrom(c.symbol, c, true);
  const sub = /\.KS$/.test(c.symbol) ? "코스피" : /\.KQ$/.test(c.symbol) ? "코스닥" : /^KRW-/.test(c.symbol) || /-(USD|KRW|USDT)$/.test(c.symbol) ? c.symbol.replace(/-(USD|KRW|USDT)$/, "").replace(/^KRW-/, "") : c.symbol;
  return `<button type="button" class="rt-row" data-sym="${mineEsc(c.symbol)}"><span class="rt-rk${i < 3 ? " top" : ""}">${i + 1}</span>${rtLogoHtml(c.symbol, name, c)}<span class="rt-nm2"><b>${mineEsc(name)}</b><small>${mineEsc(sub)}</small></span><span class="rt-val ${rightCls || ""}">${right}</span></button>`;
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
    const ranked = pop.filter((p) => bySym.has(p.symbol)).slice(0, RT_MAX);
    const used = new Set(ranked.map((p) => p.symbol));
    // 조회가 40개에 못 미치면 시가총액 큰 종목으로 채움(조회수 0회)
    const filler = list.filter((c) => !used.has(c.symbol) && c.marketCap > 0).sort((a, b) => capUsdOf(b) - capUsdOf(a));
    const merged = ranked.map((p) => ({ c: bySym.get(p.symbol), n: p.count }));
    for (const c of filler) {
      if (merged.length >= RT_MAX) break;
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
    rows = items.slice(0, RT_MAX).map((x, i) =>
      rtTab === "volume"
        ? rtRowHtml(i, x.c, rtFmtVal(x.c.symbol, x.val), "")
        : rtRowHtml(i, x.c, `${x.chg >= 0 ? "+" : ""}${x.chg.toFixed(2)}%`, x.chg >= 0 ? "rt-up" : "rt-down")
    );
  }
  rtRowsHtml = rows;
  rtPaint();
}
// 처음 20개만 보여주고, 아래 "더보기"를 누르면 최대 40개까지
function rtPaint() {
  const box = rtEl("rtList");
  if (!rtRowsHtml.length) {
    box.innerHTML = `<p class="rt-empty">표시할 종목이 없어요</p>`;
    return;
  }
  const more = rtShown < Math.min(RT_MAX, rtRowsHtml.length);
  box.innerHTML = rtRowsHtml.slice(0, rtShown).join("") + (more ? `<button type="button" class="rt-more" id="rtMoreBtn">더보기 (${rtShown}/${Math.min(RT_MAX, rtRowsHtml.length)})</button>` : "");
}
const rtMarkHtml = (g) => `<span class="rt-mark">${(typeof VIEW_MARK_SVG !== "undefined" && VIEW_MARK_SVG[RT_MARK[g]]) || ""}</span>`;
function rtSyncHead() {
  // 통합은 인기 탭에서만 — 거래량·상승·하락은 시장 하나를 골라 비교
  const groups = RT_GROUPS.filter(([k]) => k !== "all" || rtTab === "popular");
  const cur = RT_GROUPS.find((x) => x[0] === rtGroup) || RT_GROUPS[0];
  rtEl("rtRegionLabel").innerHTML = `${rtMarkHtml(cur[0])}<span>${cur[1]}</span>`;
  rtEl("rtTabs").innerHTML = RT_TABS.map(([k, l]) => `<button type="button" class="rt-tab${k === rtTab ? " active" : ""}" data-tab="${k}">${l}</button>`).join("");
  rtEl("rtRegionMenu").innerHTML = groups.map(([k, l]) => `<button type="button" class="rt-region-item${k === rtGroup ? " active" : ""}" data-group="${k}">${rtMarkHtml(k)}<span>${l}</span></button>`).join("");
  rtEl("rtSub").textContent =
    rtTab === "popular"
      ? "최근 24시간 · 검색 + 시장 종목 클릭 + 관심 등록"
      : rtTab === "volume"
      ? "지금까지 거래대금이 큰 순서 (실시간)"
      : rtTab === "up"
      ? "오늘 가장 많이 오른 순서 (실시간)"
      : "오늘 가장 많이 내린 순서 (실시간)";
}
function rtOpen() {
  // 처음 열면 맨 앞 "인기" = 한국·미국·ETF·코인 통합. 거래량·상승·하락을 누르면 보던 시장의 순위부터 보여줌
  rtTab = "popular";
  rtGroup = "all";
  rtShown = RT_PAGE;
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
    rtShown = RT_PAGE;
    if (rtTab === "popular") rtGroup = "all";
    else if (rtGroup === "all") rtGroup = rtViewGroup() || "kr"; // 지금 보던 시장(미국을 보다 왔으면 미국주식)의 거래량·상승·하락
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
    rtShown = RT_PAGE;
    rtEl("rtRegion").classList.remove("open");
    rtSyncHead();
    rtRenderList();
  });
  rtEl("rtPage").addEventListener("click", (e) => {
    if (!e.target.closest("#rtRegion")) rtEl("rtRegion").classList.remove("open");
    if (e.target.closest("#rtMoreBtn")) {
      const top = rtEl("rtList").scrollTop;
      rtShown = RT_MAX;
      rtPaint();
      rtEl("rtList").scrollTop = top;
      return;
    }
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
