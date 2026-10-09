// 스톡챗 버튼 선택 흐름 — AI 없이, 마켓맵 화면을 그대로 채팅 안에 끼워 넣는다.
//  · 화면(순위 표·종목 상세·핵심지표·리스크·투자분석)은 마켓맵 본체를 ?embed= 모드로 불러온 것이라
//    디자인·로딩 모션·3단 구조(기업명/현재가/승률)·전체보기·350종목 비교까지 마켓맵과 완전히 같다.
//  · 이 파일은 "어떤 화면을 언제 올릴지"(질문→선택→화면)만 맡는다.
// 글로 직접 묻는 질문은 app.js의 AI 채팅(/ai-chat)이 따로 처리한다.
window.SCFlow = (function () {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const listEl = () => document.getElementById("list");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let token = 0;
  const alive = (t) => t === token;

  // ---------- 말풍선·블록 ----------
  const DOTS = '<span class="dots"><span></span><span></span><span></span></span>';
  function scroll() {
    const l = listEl();
    l.scrollTop = l.scrollHeight;
  }
  function clearIntro() {
    const i = listEl().querySelector(".intro");
    if (i) i.remove();
  }
  async function bot(html, t, delay) {
    const el = document.createElement("div");
    el.className = "msg msg-assistant msg-pending";
    el.innerHTML = DOTS;
    listEl().appendChild(el);
    scroll();
    await sleep(delay == null ? 420 : delay);
    if (!alive(t)) return null;
    el.classList.remove("msg-pending");
    el.innerHTML = html;
    scroll();
    return el;
  }
  function user(text) {
    const el = document.createElement("div");
    el.className = "msg msg-user";
    el.textContent = text;
    listEl().appendChild(el);
    scroll();
  }

  // 고르기: items = [{id,label,sub,mark,accent,chat}] → 눌린 항목을 돌려줌(나머지는 흐리게, 내 말풍선으로 남김)
  function choose(items, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const w = document.createElement("div");
      w.className = "fl-choices cols-" + (opts.cols || 2) + (opts.chips ? " chips-mode" : "");
      items.forEach((it) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fl-btn" + (it.accent ? " accent" : "");
        b.innerHTML = (it.mark ? '<span class="fl-mark">' + esc(it.mark) + "</span>" : "") + "<b>" + esc(it.label) + "</b>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "");
        b.addEventListener("click", () => {
          if (w.classList.contains("done")) return;
          w.classList.add("done");
          b.classList.add("on");
          if (!opts.silent) user(it.chat || it.label);
          resolve(it);
        });
        w.appendChild(b);
      });
      listEl().appendChild(w);
      scroll();
    });
  }

  // 묶음 제목이 있는 고르기(순위 항목 15개 등) — groups = [[제목, [{id,label}]]]
  function chooseGrouped(groups) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "fl-groups";
      groups.forEach(([title, items]) => {
        const g = document.createElement("div");
        g.className = "fl-group";
        if (title) g.innerHTML = '<div class="fl-sub">' + esc(title) + "</div>";
        const row = document.createElement("div");
        row.className = "fl-choices chips-mode cols-3";
        items.forEach((it) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "fl-btn";
          b.innerHTML = "<b>" + esc(it.label) + "</b>";
          b.addEventListener("click", () => {
            if (wrap.classList.contains("done")) return;
            wrap.classList.add("done");
            b.classList.add("on");
            user(it.label);
            resolve(it);
          });
          row.appendChild(b);
        });
        g.appendChild(row);
        wrap.appendChild(g);
      });
      listEl().appendChild(wrap);
      scroll();
    });
  }

  // ---------- 마켓맵 화면 끼워 넣기(iframe) ----------
  let embedSeq = 0;
  const embeds = {};
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    const d = e.data;
    if (!d || !d.sc || !embeds[d.id]) return;
    const em = embeds[d.id];
    if (d.type === "height" && d.h > 40) {
      em.frame.style.height = d.h + "px";
      em.wrap.classList.add("ready");
      if (em.stick) scroll();
    } else if (d.type === "open" && em.onOpen) {
      em.onOpen(d.symbol);
    }
  });
  // params: {view, market, item, region, ticker, sub} — 마켓맵 본체의 ?embed= 주소로 불러온다
  function embed(params, onOpen) {
    const id = "e" + ++embedSeq;
    const url = new URL("../index.html", document.baseURI);
    url.searchParams.set("embed", "1");
    url.searchParams.set("id", id);
    url.searchParams.set("theme", window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    const wrap = document.createElement("div");
    wrap.className = "embed-block";
    wrap.innerHTML = '<div class="embed-loading"><i></i><i></i><i></i></div>';
    const frame = document.createElement("iframe");
    frame.className = "embed-frame";
    frame.title = "마켓맵 화면";
    frame.loading = "eager";
    frame.src = url.href;
    wrap.appendChild(frame);
    listEl().appendChild(wrap);
    embeds[id] = { wrap, frame, onOpen, stick: true };
    setTimeout(() => embeds[id] && (embeds[id].stick = false), 4000);
    scroll();
    return embeds[id];
  }

  // ---------- 간편검색 항목(마켓맵 간편검색과 동일) ----------
  const STOCK_LABEL = { win: "승률", ret: "상승률", rev: "매출액", vol: "변동성", rsi: "과열도", ni: "순이익", om: "영업이익", roe: "ROE", cf: "현금흐름", debt: "부채비율", mcap: "시가총액", dv: "거래대금", w52: "52주구간", per: "PER", div: "배당률" };
  const ASSET_LABEL = { win: "승률", ret: "상승률", rev: "수익률", vol: "변동성", rsi: "과열도", div: "배당률", fee: "운용보수", mcap: "규모", aum: "규모", w52: "52주구간" };
  const GROUPS = {
    stock: [
      ["성장 · 추세", ["win", "ret", "rev", "vol", "rsi"]],
      ["수익성 · 재무", ["ni", "om", "roe", "cf", "debt"]],
      ["시장", ["mcap", "dv", "w52", "per", "div"]],
    ],
    etf: [["", ["win", "ret", "vol", "aum", "fee"]], ["", ["rsi", "rev", "div", "w52"]]],
    crypto: [["", ["win", "ret", "vol", "mcap"]], ["", ["rsi", "rev", "w52"]]],
  };
  const MARKETS = [
    { id: "kr", label: "한국주식", sub: "코스피200 + 코스닥150 350종목", mark: "KR" },
    { id: "us", label: "미국주식", sub: "S&P500", mark: "US" },
    { id: "etf", label: "ETF", sub: "한국·미국 상장지수펀드 200종목", mark: "ETF" },
    { id: "crypto", label: "비트코인", sub: "암호화폐 시가총액 상위 200", mark: "₿" },
  ];
  const MARKET_NAME = { kr: "한국주식", us: "미국주식", etf: "ETF", crypto: "비트코인" };
  const labelOf = (m, k) => (m === "kr" || m === "us" ? STOCK_LABEL[k] : ASSET_LABEL[k]);
  const groupsOf = (m) => (m === "kr" || m === "us" ? GROUPS.stock : GROUPS[m]);

  // ---------- 종목 → 핵심정보 / 리스크점검 ----------
  async function stockMenu(symbol, name, t, fromRank) {
    for (;;) {
      await bot(esc(name) + " — 무엇을 볼까요?", t);
      if (!alive(t)) return;
      const act = await choose(
        [
          { id: "sreport", label: "핵심정보", sub: "핵심 5개 지표·순위" },
          { id: "risk", label: "리스크점검", sub: "위험·주의·양호 점검" },
          { id: "summary", label: "개요", sub: "시세·차트" },
        ],
        { cols: 3 }
      );
      if (!alive(t)) return;
      await bot(esc(name) + " " + act.label + "을(를) 가져와요", t, 260);
      if (!alive(t)) return;
      embed({ view: "detail", ticker: symbol, sub: act.id });
      await bot("이어서 볼까요?", t, 500);
      const next = await choose(
        [{ id: "again", label: "다른 항목 보기" }, { id: "other", label: fromRank ? "다른 종목 순위" : "다른 종목", accent: true }, { id: "home", label: "처음으로", accent: true }],
        { cols: 3, chips: true }
      );
      if (!alive(t)) return;
      if (next.id === "home") return home();
      if (next.id === "other") return "other";
    }
  }

  // ---------- 종목 고르기(관심종목 + 직접 검색, AI 아님) ----------
  function chooseStock() {
    return new Promise(async (resolve) => {
      const w = document.createElement("div");
      w.className = "fl-pick";
      const wl = SCData.watchlist().slice(0, 12);
      w.innerHTML =
        (wl.length ? '<div class="fl-sub">내 관심종목</div><div class="fl-choices chips-mode cols-2 wl"></div>' : "") +
        '<div class="fl-sub">종목 검색</div><div class="fl-search"><input type="text" placeholder="종목명이나 티커 (예: 삼성전자, AAPL)" autocomplete="off"/><div class="fl-suggest"></div></div>';
      listEl().appendChild(w);
      scroll();
      const done = (it) => {
        if (w.classList.contains("done")) return;
        w.classList.add("done");
        user(it.name);
        resolve(it);
      };
      const box = w.querySelector(".wl");
      if (box) {
        const names = await Promise.all(wl.map((x) => SCData.nameOf(x.symbol, x.name)));
        wl.forEach((x, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "fl-btn";
          b.innerHTML = "<b>" + esc(names[i]) + "</b>";
          b.addEventListener("click", () => done({ symbol: x.symbol, name: names[i] }));
          box.appendChild(b);
        });
      }
      const input = w.querySelector("input");
      const sug = w.querySelector(".fl-suggest");
      let timer = null;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const q = input.value.trim();
          if (!q) {
            sug.innerHTML = "";
            return;
          }
          const res = await SCData.search(q, 8);
          sug.innerHTML = res.length
            ? res.map((it) => '<button type="button" class="fl-sg" data-sym="' + esc(it.symbol) + '" data-name="' + esc(it.name) + '"><b>' + esc(it.name) + "</b><small>" + esc(it.sub) + "</small></button>").join("")
            : '<div class="fl-none">일치하는 종목이 없어요</div>';
        }, 160);
      });
      sug.addEventListener("click", (e) => {
        const b = e.target.closest(".fl-sg");
        if (b) done({ symbol: b.dataset.sym, name: b.dataset.name });
      });
    });
  }

  // ---------- 1. 간편검색 ----------
  async function searchFlow() {
    const t = token;
    user("간편검색");
    await bot("어떤 투자처를 찾아볼까요?", t);
    if (!alive(t)) return;
    let market = (await choose(MARKETS.map((m) => ({ ...m, chat: m.label })), { cols: 1 })).id;
    let region = null;
    for (;;) {
      if (market === "etf" && !region) {
        await bot("어느 시장의 ETF를 볼까요?", t);
        region = (await choose([{ id: "kr", label: "한국 ETF" }, { id: "us", label: "미국 ETF" }], { cols: 2 })).id;
      }
      await bot("[" + MARKET_NAME[market] + (region ? " · " + (region === "kr" ? "한국" : "미국") : "") + "] 어떤 순위를 볼까요?", t);
      if (!alive(t)) return;
      let key = (await chooseGrouped(groupsOf(market).map(([title, keys]) => [title, keys.map((k) => ({ id: k, label: labelOf(market, k) }))]))).id;
      for (;;) {
        await bot("[" + MARKET_NAME[market] + "] " + labelOf(market, key) + " 순위를 가져와요", t, 300);
        if (!alive(t)) return;
        embed({ view: "rank", market, item: key, region }, async (sym) => {
          const name = await SCData.nameOf(sym, sym);
          user(name);
          stockMenu(sym, name, t, true);
        });
        await bot("종목을 누르면 자세히 볼 수 있어요. 다른 순위도 볼까요?", t, 500);
        const same = groupsOf(market).find(([, ks]) => ks.includes(key))[1].filter((k) => k !== key);
        const next = await choose(
          same.map((k) => ({ id: "k:" + k, label: labelOf(market, k) })).concat([{ id: "market", label: "다른 투자처", accent: true }, { id: "home", label: "처음으로", accent: true }]),
          { cols: 3, chips: true }
        );
        if (!alive(t)) return;
        if (next.id === "home") return home();
        if (next.id === "market") {
          await bot("어떤 투자처를 찾아볼까요?", t);
          market = (await choose(MARKETS.map((m) => ({ ...m, chat: m.label })), { cols: 1 })).id;
          region = null;
          break;
        }
        key = next.id.slice(2);
      }
    }
  }

  // ---------- 2. 투자분석 ----------
  async function analyzeFlow() {
    const t = token;
    user("투자분석");
    await bot("어떤 분석을 도와드릴까요?", t);
    if (!alive(t)) return;
    const pick = await choose(
      [
        { id: "stock", label: "내 종목", sub: "핵심정보 · 리스크점검" },
        { id: "pf", label: "내 포트폴리오", sub: "자산의 방향점검" },
      ],
      { cols: 2 }
    );
    if (!alive(t)) return;
    if (pick.id === "stock") {
      for (;;) {
        await bot("분석할 종목을 골라주세요. 관심종목에서 고르거나 직접 검색할 수 있어요.", t);
        const s = await chooseStock();
        if (!alive(t)) return;
        const r = await stockMenu(s.symbol, s.name, t, false);
        if (r !== "other") return;
      }
    } else {
      await bot("내 포트폴리오를 점검해요. 마켓맵의 관심종목 기준으로 보여드려요.", t);
      if (!alive(t)) return;
      embed({ view: "analysis" }, async (sym) => {
        const name = await SCData.nameOf(sym, sym);
        user(name);
        stockMenu(sym, name, t, false);
      });
      await bot("이어서 볼까요?", t, 600);
      const next = await choose([{ id: "stock", label: "내 종목 분석" }, { id: "home", label: "처음으로", accent: true }], { cols: 2, chips: true });
      if (!alive(t)) return;
      if (next.id === "home") return home();
      return analyzeStockOnly(t);
    }
  }
  async function analyzeStockOnly(t) {
    for (;;) {
      await bot("분석할 종목을 골라주세요.", t);
      const s = await chooseStock();
      if (!alive(t)) return;
      const r = await stockMenu(s.symbol, s.name, t, false);
      if (r !== "other") return;
    }
  }

  // ---------- 진입 ----------
  function home() {
    token++;
    const btn = document.getElementById("newChatBtn");
    if (btn) btn.click();
  }
  function start(kind) {
    token++;
    clearIntro();
    if (kind === "search") searchFlow();
    else analyzeFlow();
  }
  function reset() {
    token++;
  }
  return { start, reset, home };
})();
