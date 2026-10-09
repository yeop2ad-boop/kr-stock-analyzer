// 스톡챗 자료 로더 — 마켓맵이 미리 만들어 둔 순위·지표 자료(지도 자료)를 AI 없이 그대로 읽어 쓴다.
// 같은 도메인(marketmap.kr)이라 /sector-map/data, /data 파일과 메인 앱의 관심종목(localStorage)을 바로 읽을 수 있다.
window.SCData = (function () {
  const ROOT = new URL("../", document.baseURI).href;
  const memo = {};
  const once = (key, fn) => memo[key] || (memo[key] = fn());

  const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

  function norm(c, market) {
    const isCrypto = market === "crypto";
    const isEtf = market === "etf";
    const ticker = String(c.symbol || "").replace(/\.(KS|KQ)$/, "").replace(/-USD$/, "");
    return {
      symbol: c.symbol,
      market,
      name: c.name || c.displayName || c.symbol,
      sub: isCrypto ? c.displayName || ticker : isEtf ? c.displayName || ticker : (c.sectorKo ? ticker + " · " + c.sectorKo : ticker),
      sector: c.sectorKo || "",
      region: isEtf ? (/한국|KR/i.test(c.sectorKo || c.sector || "") ? "kr" : "us") : null,
      currency: c.marketCapKrw ? "KRW" : c.currency || (market === "kr" ? "KRW" : "USD"),
      dvCurrency: isEtf || isCrypto ? "USD" : c.currency || "KRW",
      mcap: num(c.marketCapKrw || c.marketCap),
      chg: num(c.changePercent),
      per: num(c.per),
      div: num(c.dividendYield),
      dv: num(c.dollarVolume),
      revG: num(c.revenueGrowth),
      niG: num(c.netIncomeGrowth),
      cfG: num(c.cashFlowGrowth),
      opm: num(c.operatingMargin),
      roe: num(c.roe),
      debt: num(c.debtRatio),
      w52: num(c.week52RangePct),
      win: num(c.winRateScore),
      rsi: num(c.rsiWeekly),
      ret: num(c.ret10yAvg),
      vol: null,
    };
  }

  async function getJson(path) {
    const res = await fetch(ROOT + path);
    if (!res.ok) throw new Error(path + " " + res.status);
    return res.json();
  }

  function loadMarket(market) {
    return once("m:" + market, async () => {
      if (market === "kr") return (await getJson("sector-map/data/kr-sectors.json")).companies.map((c) => norm(c, "kr"));
      if (market === "us") return (await getJson("sector-map/data/sp500-sectors.json")).companies.map((c) => norm(c, "us"));
      const text = await (await fetch(ROOT + "sector-map/data/etf-crypto-map.js")).text();
      const maps = new Function(text + "\n;return {e: ETF_MAP_DATA, c: CRYPTO_MAP_DATA};")();
      memo["m:etf"] = Promise.resolve(maps.e.companies.map((c) => norm(c, "etf")));
      memo["m:crypto"] = Promise.resolve(maps.c.companies.map((c) => norm(c, "crypto")));
      return market === "etf" ? memo["m:etf"] : memo["m:crypto"];
    });
  }

  // 변동성(최근 3개월 일간 등락 절댓값 평균%)은 승률 자료에 들어 있어 필요할 때만 붙인다
  function loadVol() {
    return once("vol", async () => {
      const db = await getJson("data/winrate-scores-us.json");
      const map = {};
      ["scores", "scoresKr", "scoresEtf", "scoresCrypto"].forEach((k) => Object.entries(db[k] || {}).forEach(([sym, v]) => (map[sym] = num(v.vol3m))));
      return map;
    });
  }
  async function withVol(items) {
    const map = await loadVol();
    items.forEach((it) => {
      if (it.vol === null) it.vol = map[it.symbol] ?? null;
    });
    return items;
  }

  function loadAliases() {
    return once("alias", () =>
      new Promise((resolve) => {
        if (window.KOREAN_COMPANY_NAMES) return resolve(window.KOREAN_COMPANY_NAMES);
        const s = document.createElement("script");
        s.src = ROOT + "data/ko-company-names.js?v=20260911e";
        s.onload = () => resolve(window.KOREAN_COMPANY_NAMES || {});
        s.onerror = () => resolve({});
        document.head.appendChild(s);
      })
    );
  }

  let allCache = null;
  async function loadAll() {
    if (allCache) return allCache;
    const parts = await Promise.all(["kr", "us", "etf", "crypto"].map(loadMarket));
    allCache = parts.flat();
    return allCache;
  }

  // 종목 검색(한글·영문·티커) — 간단한 포함 검색, AI를 쓰지 않는다
  async function search(q, limit) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    const [all, alias] = await Promise.all([loadAll(), loadAliases()]);
    const out = [];
    const seen = new Set();
    const push = (it) => {
      if (it && !seen.has(it.symbol) && out.length < (limit || 8)) {
        seen.add(it.symbol);
        out.push(it);
      }
    };
    const bySym = new Map(all.map((it) => [it.symbol, it]));
    Object.entries(alias).forEach(([name, sym]) => {
      if (name.toLowerCase().includes(q)) {
        const it = bySym.get(sym);
        if (it) push({ ...it, name: name });
      }
    });
    all.forEach((it) => {
      if (it.name.toLowerCase().includes(q) || it.symbol.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q)) push(it);
    });
    return out;
  }

  // 메인 앱 관심종목(같은 브라우저의 localStorage) — 그룹과 상관없이 전체
  function watchlist() {
    try {
      const list = JSON.parse(localStorage.getItem("watchlist_v1_all"));
      return (Array.isArray(list) ? list : []).filter((w) => w && w.symbol).map((w) => ({ symbol: String(w.symbol).toUpperCase(), name: w.name || w.symbol }));
    } catch (e) {
      return [];
    }
  }

  async function nameOf(symbol, fallback) {
    try {
      const all = await loadAll();
      const alias = await loadAliases();
      const rev = Object.entries(alias).find(([, s]) => s === symbol);
      if (rev) return rev[0];
      const hit = all.find((it) => it.symbol === symbol);
      if (hit) return hit.name;
    } catch (e) {
      /* 이름표를 못 읽어도 원래 이름 사용 */
    }
    return fallback || symbol;
  }

  // 티커 하나의 자료(투자처·지역 포함) — 못 찾으면 null
  async function lookup(symbol) {
    try {
      const all = await loadAll();
      return all.find((it) => it.symbol === symbol) || null;
    } catch (e) {
      return null;
    }
  }

  // 문장 속에서 종목 찾기(예: "삼성전자 지금 사야해?" → 삼성전자) — 가장 긴 이름 우선, 없으면 영문 티커
  async function findInText(text) {
    const raw = String(text || "");
    const s = raw.toLowerCase().replace(/\s+/g, "");
    if (!s) return null;
    const [all, alias] = await Promise.all([loadAll(), loadAliases()]);
    let best = null;
    const consider = (name, symbol, shown) => {
      const n = String(name).toLowerCase().replace(/\s+/g, "");
      if (n.length >= 2 && s.indexOf(n) >= 0 && (!best || n.length > best.len)) best = { len: n.length, symbol: symbol, name: shown };
    };
    Object.entries(alias).forEach(([name, sym]) => consider(name, sym, name));
    all.forEach((it) => consider(it.name, it.symbol, it.name));
    if (!best) {
      const bySym = new Map(all.map((i) => [i.symbol.toUpperCase(), i]));
      const toks = (raw.match(/[A-Za-z0-9.-]{2,}/g) || []).map((x) => x.toUpperCase());
      for (const tk of toks) {
        const it = bySym.get(tk) || bySym.get(tk + "-USD");
        if (it) best = { len: tk.length, symbol: it.symbol, name: it.name };
      }
    }
    return best ? { symbol: best.symbol, name: best.name } : null;
  }

  return { findInText, lookup, loadMarket, withVol, loadAll, search, watchlist, nameOf };
})();
