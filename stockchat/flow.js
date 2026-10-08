// 스톡챗 버튼 선택 흐름 — AI 없이 마켓맵 자료만으로 메시지가 하나씩 올라오고, 고르면 다음 단계가 이어진다.
//  1) 간편검색: 투자처 → 순위 항목 → 순위 목록 → 종목 카드(+리스크 점검)
//  2) 투자분석: 내 종목(핵심정보 · 리스크점검) / 내 포트폴리오(자산의 방향점검)
// 글로 직접 묻는 질문은 app.js의 AI 채팅(/ai-chat)이 따로 처리한다.
window.SCFlow = (function () {
  const WORKER = "https://us-stock.yeop2ad.workers.dev";
  const F = () => window.StockCards.fmt;
  const esc = (s) => F().esc(s);
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
  function block(html, cls) {
    const w = document.createElement("div");
    w.className = "cards " + (cls || "");
    w.innerHTML = html;
    listEl().appendChild(w);
    scroll();
    return w;
  }

  // 고르기: items = [{id,label,sub}] → 눌린 항목을 돌려줌(눌리면 나머지는 흐리게, 내 말풍선으로 남김)
  function choose(items, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const w = document.createElement("div");
      w.className = "fl-choices cols-" + (opts.cols || 2) + (opts.chips ? " chips-mode" : "");
      items.forEach((it) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fl-btn" + (it.accent ? " accent" : "");
        b.innerHTML = (it.mark ? '<span class="fl-mark">' + it.mark + "</span>" : "") + "<b>" + esc(it.label) + "</b>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "");
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

  // ---------- 순위 정의(간편검색 그대로: 투자처 → 15개 항목) ----------
  const P = (v) => (v > 0 ? "+" : "") + v.toFixed(1) + "%";
  const RANKS = {
    win: { label: "승률", key: "win", dir: "desc", fmt: (v) => v.toFixed(1) + "%", desc: "최근 10년 월봉에서 주가가 오른 달의 비율이에요. 높을수록 꾸준히 올랐다는 뜻이에요." },
    ret: { label: "상승률", key: "ret", dir: "desc", fmt: P, desc: "10년 연평균 수익률(복리)이에요." },
    rev: { label: "매출 성장", key: "revG", dir: "desc", fmt: P, desc: "최근 매출이 전년 같은 기간보다 얼마나 늘었는지예요." },
    vol: { label: "변동성", key: "vol", dir: "asc", fmt: (v) => v.toFixed(2) + "%", needVol: true, desc: "최근 3개월 하루 평균 등락폭이에요. 낮은 순으로 보여드려요(흔들림이 적은 종목)." },
    rsi: { label: "과열도", key: "rsi", dir: "desc", fmt: (v) => v.toFixed(0), desc: "주간 RSI예요. 70 이상이면 과열, 30 이하면 침체 구간으로 봐요." },
    ni: { label: "순이익 증가", key: "niG", dir: "desc", fmt: P, desc: "순이익이 이전보다 얼마나 늘었는지예요." },
    om: { label: "영업이익률", key: "opm", dir: "desc", fmt: (v) => v.toFixed(1) + "%", desc: "매출에서 영업이익이 차지하는 비율이에요. 높을수록 본업이 잘 벌어요." },
    roe: { label: "ROE", key: "roe", dir: "desc", fmt: (v) => (v >= 1000 ? "1,000%+" : v.toFixed(1) + "%"), desc: "자기자본으로 얼마나 이익을 냈는지예요. 자기자본이 거의 없는 회사는 수치가 매우 크게 나와요." },
    cf: { label: "현금흐름 증가", key: "cfG", dir: "desc", fmt: P, desc: "영업활동으로 들어온 현금이 얼마나 늘었는지예요." },
    debt: { label: "부채비율", key: "debt", dir: "asc", min: 0, fmt: (v) => (v >= 1000 ? "1,000%+" : v.toFixed(0) + "%"), desc: "자기자본 대비 빚의 비율이에요. 낮은 순으로 보여드려요. 업종에 따라 적정 수준이 달라요." },
    mcap: { label: "시가총액", key: "mcap", dir: "desc", money: true, desc: "회사의 전체 시장 가치예요." },
    dv: { label: "거래대금", key: "dv", dir: "desc", money: true, desc: "최근 하루 거래된 금액이에요. 많을수록 사람들이 많이 사고팔아요." },
    w52: { label: "52주 구간", key: "w52", dir: "asc", fmt: (v) => v.toFixed(0) + "%", desc: "1년 최저가를 0%, 최고가를 100%로 봤을 때 현재 위치예요. 낮은 순(저점 근처)으로 보여드려요." },
    per: { label: "PER", key: "per", dir: "asc", min: 0.0001, fmt: (v) => v.toFixed(1) + "배", desc: "현재가를 주당순이익으로 나눈 배수예요. 낮은 순(저평가 후보)으로 보여드려요. 적자 기업은 빠져요." },
    div: { label: "배당률", key: "div", dir: "desc", min: 0.0001, fmt: (v) => v.toFixed(2) + "%", desc: "주가 대비 1년 배당금 비율이에요." },
  };
  const MARKETS = [
    { id: "kr", label: "한국주식", sub: "코스피200 + 코스닥150 350종목", mark: "KR" },
    { id: "us", label: "미국주식", sub: "S&P500", mark: "US" },
    { id: "etf", label: "ETF", sub: "한국·미국 상장지수펀드", mark: "ETF" },
    { id: "crypto", label: "비트코인", sub: "암호화폐 시가총액 상위 200", mark: "₿" },
  ];
  const MARKET_NAME = { kr: "한국주식", us: "미국주식", etf: "ETF", crypto: "비트코인·코인" };
  const GROUPS_STOCK = [
    ["성장 · 추세", ["win", "ret", "rev", "vol", "rsi"]],
    ["수익성 · 재무", ["ni", "om", "roe", "cf", "debt"]],
    ["시장", ["mcap", "dv", "w52", "per", "div"]],
  ];
  const GROUPS_ASSET = { etf: [["항목", ["win", "ret", "rsi", "vol", "mcap", "dv", "w52"]]], crypto: [["항목", ["win", "ret", "rsi", "vol", "mcap", "w52"]]] };
  const groupsFor = (m) => (m === "kr" || m === "us" ? GROUPS_STOCK : GROUPS_ASSET[m]);
  const LABEL_OVERRIDE = { etf: { mcap: "규모" }, crypto: { mcap: "시가총액" } };
  const rankLabel = (m, k) => (LABEL_OVERRIDE[m] && LABEL_OVERRIDE[m][k]) || RANKS[k].label;

  function rowValue(def, it) {
    const v = it[def.key];
    return def.money ? F().money(v, def.key === "dv" ? it.dvCurrency || it.currency : it.currency) : def.fmt(v);
  }

  function rankRows(def, items) {
    let rows = items.filter((it) => it[def.key] !== null && it[def.key] !== undefined && (def.min === undefined || it[def.key] >= def.min));
    rows.sort((a, b) => (def.dir === "asc" ? a[def.key] - b[def.key] : b[def.key] - a[def.key]));
    return rows;
  }

  function rankCardHtml(titleText, def, rows, shown) {
    const list = rows
      .slice(0, shown)
      .map((it, i) => {
        const chg = F().isNum(it.chg) ? '<small class="' + F().dir(it.chg) + '">' + F().pct(it.chg, 2) + "</small>" : "";
        return (
          '<li class="rk-row" data-sym="' + esc(it.symbol) + '" data-name="' + esc(it.name) + '"><span class="rk-n">' + (i + 1) + '</span><div class="rk-name"><b>' + esc(it.name) + "</b><small>" + esc(it.sub) + '</small></div><div class="rk-val"><b>' + esc(rowValue(def, it)) + "</b>" + chg + "</div></li>"
        );
      })
      .join("");
    const more = shown < Math.min(rows.length, 30) ? '<button type="button" class="rk-more">더 보기</button>' : "";
    return (
      '<section class="sc-card"><div class="sc-title">' + esc(titleText) + " <small>TOP " + Math.min(shown, rows.length) + '</small></div><p class="rk-desc">' + esc(def.desc) + "</p><ol class=\"rk-list\">" + list + "</ol>" + more + '<p class="rk-hint">종목을 누르면 자세히 볼 수 있어요</p></section>'
    );
  }

  // ---------- 종목 카드(서버 /stock-card, AI 아님) ----------
  const cardCache = {};
  async function fetchCard(sym) {
    if (cardCache[sym]) return cardCache[sym];
    const res = await fetch(WORKER + "/stock-card?symbol=" + encodeURIComponent(sym));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.card) throw new Error(data.error || "데이터를 가져오지 못했어요.");
    cardCache[sym] = data.card;
    return data.card;
  }

  // ---------- 리스크 점검(규칙 기반 — AI 아님) ----------
  function riskItems(c) {
    const m = c.metrics || {};
    const w = c.win || {};
    const wk = c.week || {};
    const r = c.returns || {};
    const items = [];
    const add = (label, level, text) => items.push({ label, level, text });
    const n = F().isNum;

    if (!n(m.per)) add("밸류에이션(PER)", "warn", "적자이거나 이익 자료가 없어 PER을 계산할 수 없어요.");
    else if (m.per >= 40) add("밸류에이션(PER)", "bad", "PER " + m.per.toFixed(1) + "배로 높은 편이에요. 기대가 주가에 많이 반영된 구간일 수 있어요.");
    else if (m.per >= 25) add("밸류에이션(PER)", "warn", "PER " + m.per.toFixed(1) + "배로 다소 높아요.");
    else add("밸류에이션(PER)", "good", "PER " + m.per.toFixed(1) + "배로 부담이 크지 않아요.");

    if (!n(m.debt)) add("재무 건전성(부채비율)", "na", "부채비율 자료가 없어요.");
    else if (m.debt >= 400) add("재무 건전성(부채비율)", "bad", "부채비율 " + m.debt.toFixed(0) + "%로 매우 높아요. 금융업 등은 원래 높을 수 있어요.");
    else if (m.debt >= 200) add("재무 건전성(부채비율)", "warn", "부채비율 " + m.debt.toFixed(0) + "%로 높은 편이에요.");
    else add("재무 건전성(부채비율)", "good", "부채비율 " + m.debt.toFixed(0) + "%로 빚 부담이 크지 않아요.");

    if (!n(m.opMargin)) add("수익성(영업이익률)", "na", "영업이익률 자료가 없어요.");
    else if (m.opMargin < 0) add("수익성(영업이익률)", "bad", "영업이익률이 " + m.opMargin.toFixed(1) + "%로 적자예요.");
    else if (m.opMargin < 5) add("수익성(영업이익률)", "warn", "영업이익률 " + m.opMargin.toFixed(1) + "%로 낮은 편이에요.");
    else add("수익성(영업이익률)", "good", "영업이익률 " + m.opMargin.toFixed(1) + "%로 본업이 잘 벌고 있어요.");

    if (!n(m.revGrowth)) add("성장성(매출)", "na", "매출 성장 자료가 없어요.");
    else if (m.revGrowth < 0) add("성장성(매출)", "warn", "매출이 전년보다 " + Math.abs(m.revGrowth).toFixed(1) + "% 줄었어요.");
    else add("성장성(매출)", "good", "매출이 전년보다 " + m.revGrowth.toFixed(1) + "% 늘었어요.");

    if (!n(w.rsi)) add("과열도(주간 RSI)", "na", "RSI 자료가 없어요.");
    else if (w.rsi >= 80) add("과열도(주간 RSI)", "bad", "RSI " + w.rsi.toFixed(0) + "로 강한 과열 구간이에요.");
    else if (w.rsi >= 70) add("과열도(주간 RSI)", "warn", "RSI " + w.rsi.toFixed(0) + "로 과열 구간에 들어섰어요.");
    else if (w.rsi <= 30) add("과열도(주간 RSI)", "warn", "RSI " + w.rsi.toFixed(0) + "로 침체 구간이에요(반등 또는 추가 하락 모두 가능).");
    else add("과열도(주간 RSI)", "good", "RSI " + w.rsi.toFixed(0) + "로 과열도 침체도 아니에요.");

    if (!n(wk.pos)) add("가격 위치(52주)", "na", "52주 위치 자료가 없어요.");
    else if (wk.pos >= 90) add("가격 위치(52주)", "warn", "1년 최고가 근처(" + Math.round(wk.pos) + "%)예요. 단기 되돌림 가능성에 유의하세요.");
    else if (wk.pos <= 10) add("가격 위치(52주)", "warn", "1년 최저가 근처(" + Math.round(wk.pos) + "%)예요. 하락 추세가 이어지는지 확인이 필요해요.");
    else add("가격 위치(52주)", "good", "1년 범위의 " + Math.round(wk.pos) + "% 지점이에요.");

    const m12 = (w.m12 || []).filter(n);
    if (m12.length >= 6) {
      const mean = m12.reduce((a, b) => a + b, 0) / m12.length;
      const sd = Math.sqrt(m12.reduce((a, b) => a + (b - mean) * (b - mean), 0) / m12.length);
      const worst = Math.min.apply(null, m12);
      if (sd >= 15) add("변동성(월별)", "bad", "월별 수익률이 크게 출렁여요(표준편차 " + sd.toFixed(0) + "%p, 최악의 달 " + worst.toFixed(0) + "%).");
      else if (sd >= 8) add("변동성(월별)", "warn", "월별 등락이 큰 편이에요(표준편차 " + sd.toFixed(0) + "%p, 최악의 달 " + worst.toFixed(0) + "%).");
      else add("변동성(월별)", "good", "월별 등락이 비교적 안정적이에요(표준편차 " + sd.toFixed(0) + "%p).");
    }

    if (n(r.m3) && r.m3 <= -20) add("최근 추세(3개월)", "bad", "최근 3개월 " + r.m3.toFixed(1) + "% 하락했어요.");
    else if (n(r.m3) && r.m3 <= -10) add("최근 추세(3개월)", "warn", "최근 3개월 " + r.m3.toFixed(1) + "% 하락했어요.");
    else if (n(r.m3)) add("최근 추세(3개월)", "good", "최근 3개월 " + (r.m3 > 0 ? "+" : "") + r.m3.toFixed(1) + "%예요.");
    return items;
  }

  function riskCardHtml(c) {
    const items = riskItems(c);
    const bad = items.filter((i) => i.level === "bad").length;
    const warn = items.filter((i) => i.level === "warn").length;
    const good = items.filter((i) => i.level === "good").length;
    const tag = { good: "양호", warn: "주의", bad: "위험", na: "확인불가" };
    const head = bad ? "위험 신호가 " + bad + "개 있어요" : warn ? "주의할 점이 " + warn + "개 있어요" : "큰 위험 신호는 보이지 않아요";
    return (
      '<section class="sc-card"><div class="sc-title">' + esc(c.name) + ' 리스크 점검 <small>규칙 기반</small></div>' +
      '<div class="rs-sum ' + (bad ? "bad" : warn ? "warn" : "good") + '"><b>' + head + '</b><span>위험 ' + bad + " · 주의 " + warn + " · 양호 " + good + "</span></div>" +
      '<ul class="rs-list">' +
      items.map((i) => '<li class="rs-item ' + i.level + '"><div class="rs-top"><span>' + esc(i.label) + '</span><em>' + tag[i.level] + "</em></div><p>" + esc(i.text) + "</p></li>").join("") +
      '</ul><p class="rk-hint">투자 권유가 아니라, 공개된 숫자를 기준으로 한 점검이에요.</p></section>'
    );
  }

  // ---------- 종목 고르기(관심종목 + 직접 검색) ----------
  function chooseStock(promptWatch) {
    return new Promise(async (resolve) => {
      const w = document.createElement("div");
      w.className = "fl-pick";
      const wl = promptWatch ? SCData.watchlist().slice(0, 12) : [];
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
  async function showStockCards(sym, name, t) {
    const pending = await bot(esc(name) + "의 핵심 정보를 가져오고 있어요", t, 300);
    if (!pending) return null;
    try {
      const card = await fetchCard(sym);
      if (!alive(t)) return null;
      card.name = name || card.name;
      block(window.StockCards.render([card]));
      return card;
    } catch (e) {
      bot(esc(e.message || "데이터를 가져오지 못했어요."), t, 100);
      return null;
    }
  }

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
      const groups = groupsFor(market);
      let key = null;
      while (!key) {
        const items = [];
        groups.forEach(([title, keys]) => keys.forEach((k) => items.push({ id: k, label: rankLabel(market, k), group: title })));
        // 묶음 제목을 구분해 보여주기 위해 묶음별로 따로 그린다
        key = await new Promise((resolve) => {
          const wrap = document.createElement("div");
          wrap.className = "fl-groups";
          groups.forEach(([title, keys]) => {
            const g = document.createElement("div");
            g.className = "fl-group";
            if (groups.length > 1) g.innerHTML = '<div class="fl-sub">' + esc(title) + "</div>";
            const row = document.createElement("div");
            row.className = "fl-choices chips-mode cols-3";
            keys.forEach((k) => {
              const b = document.createElement("button");
              b.type = "button";
              b.className = "fl-btn";
              b.innerHTML = "<b>" + esc(rankLabel(market, k)) + "</b>";
              b.addEventListener("click", () => {
                if (wrap.classList.contains("done")) return;
                wrap.classList.add("done");
                b.classList.add("on");
                user(rankLabel(market, k));
                resolve(k);
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
      // 순위 목록
      for (;;) {
        const def = RANKS[key];
        const pending = await bot("[" + MARKET_NAME[market] + "] " + rankLabel(market, key) + " 순위를 가져오고 있어요", t, 300);
        if (!pending) return;
        let items;
        try {
          items = await SCData.loadMarket(market);
          if (def.needVol) await SCData.withVol(items);
        } catch (e) {
          await bot("자료를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.", t, 100);
          return;
        }
        if (!alive(t)) return;
        if (region) items = items.filter((it) => it.region === region);
        const rows = rankRows(def, items);
        let shown = 10;
        const title = MARKET_NAME[market] + (region ? " " + (region === "kr" ? "한국" : "미국") : "") + " · " + rankLabel(market, key);
        const blk = block(rankCardHtml(title, def, rows, shown));
        blk.addEventListener("click", async (e) => {
          if (e.target.closest(".rk-more")) {
            shown = Math.min(30, rows.length);
            blk.innerHTML = rankCardHtml(title, def, rows, shown);
            return;
          }
          const li = e.target.closest(".rk-row");
          if (!li || blk.dataset.busy) return;
          blk.dataset.busy = "1";
          user(li.dataset.name);
          const card = await showStockCards(li.dataset.sym, li.dataset.name, t);
          blk.dataset.busy = "";
          if (card) {
            const act = await choose([{ id: "risk", label: "리스크 점검", sub: li.dataset.name }, { id: "skip", label: "괜찮아요" }], { cols: 2, chips: true });
            if (act.id === "risk" && alive(t)) block(riskCardHtml(card));
          }
        });
        // 다음 선택: 같은 묶음의 다른 순위 / 다른 투자처 / 처음으로
        await bot("다른 순위도 볼까요?", t, 350);
        const same = groups.find(([, ks]) => ks.includes(key))[1].filter((k) => k !== key);
        const next = await choose(
          same.map((k) => ({ id: "k:" + k, label: rankLabel(market, k) })).concat([{ id: "market", label: "다른 투자처", accent: true }, { id: "home", label: "처음으로", accent: true }]),
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
  async function stockAnalyzeFlow(t) {
    await bot("분석할 종목을 골라주세요. 관심종목에서 고르거나 직접 검색할 수 있어요.", t);
    if (!alive(t)) return;
    const pick = await chooseStock(true);
    if (!alive(t)) return;
    let card = null;
    const done = new Set();
    for (;;) {
      await bot(esc(pick.name) + " — 무엇을 볼까요?", t);
      const items = [{ id: "core", label: "핵심정보", sub: "시세·지표·매출·승률" }, { id: "risk", label: "리스크 점검", sub: "과열·부채·변동성" }];
      const act = await choose(items, { cols: 2 });
      if (!alive(t)) return;
      if (!card) {
        const pending = await bot(esc(pick.name) + " 자료를 가져오고 있어요", t, 250);
        if (!pending) return;
        try {
          card = await fetchCard(pick.symbol);
          card = { ...card, name: pick.name || card.name };
        } catch (e) {
          await bot(esc(e.message || "데이터를 가져오지 못했어요."), t, 100);
          return;
        }
      }
      if (act.id === "core") block(window.StockCards.render([card]));
      else block(riskCardHtml(card));
      done.add(act.id);
      await bot("이어서 볼까요?", t, 300);
      const next = await choose(
        [
          done.has("core") ? null : { id: "core", label: "핵심정보" },
          done.has("risk") ? null : { id: "risk", label: "리스크 점검" },
          { id: "other", label: "다른 종목", accent: true },
          { id: "home", label: "처음으로", accent: true },
        ].filter(Boolean),
        { cols: 2, chips: true }
      );
      if (!alive(t)) return;
      if (next.id === "home") return home();
      if (next.id === "other") return stockAnalyzeFlow(t);
      // core/risk 중 남은 항목 바로 실행
      block(next.id === "core" ? window.StockCards.render([card]) : riskCardHtml(card));
      done.add(next.id);
      await bot("다른 종목도 볼까요?", t, 300);
      const last = await choose([{ id: "other", label: "다른 종목" }, { id: "home", label: "처음으로", accent: true }], { cols: 2, chips: true });
      if (!alive(t)) return;
      return last.id === "home" ? home() : stockAnalyzeFlow(t);
    }
  }

  // 포트폴리오: 보유 종목 고르기(여러 개) + 비중 입력
  function pickHoldings() {
    return new Promise(async (resolve) => {
      const wl = SCData.watchlist();
      const names = await Promise.all(wl.map((x) => SCData.nameOf(x.symbol, x.name)));
      const chosen = new Map();
      const w = document.createElement("div");
      w.className = "fl-pick pf-pick";
      w.innerHTML =
        (wl.length ? '<div class="fl-sub">내 관심종목에서 고르기</div><div class="fl-choices chips-mode cols-2 wl"></div>' : '<div class="fl-sub">관심종목이 비어 있어요. 아래에서 검색해 담아주세요.</div>') +
        '<div class="fl-sub">종목 검색해서 추가</div><div class="fl-search"><input type="text" placeholder="종목명이나 티커" autocomplete="off"/><div class="fl-suggest"></div></div>' +
        '<div class="pf-sel"></div><button type="button" class="pf-next" disabled>비중 정하기</button>';
      listEl().appendChild(w);
      scroll();
      const selEl = w.querySelector(".pf-sel");
      const nextBtn = w.querySelector(".pf-next");
      const renderSel = () => {
        selEl.innerHTML = [...chosen.values()].map((h) => '<span class="pf-tag" data-sym="' + esc(h.symbol) + '">' + esc(h.name) + " ✕</span>").join("");
        nextBtn.disabled = chosen.size === 0;
        nextBtn.textContent = chosen.size ? "비중 정하기 (" + chosen.size + "개)" : "비중 정하기";
        w.querySelectorAll(".wl .fl-btn").forEach((b) => b.classList.toggle("on", chosen.has(b.dataset.sym)));
      };
      const toggle = (h) => {
        if (chosen.has(h.symbol)) chosen.delete(h.symbol);
        else if (chosen.size < 12) chosen.set(h.symbol, h);
        renderSel();
      };
      const box = w.querySelector(".wl");
      if (box) {
        wl.forEach((x, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "fl-btn";
          b.dataset.sym = x.symbol;
          b.innerHTML = "<b>" + esc(names[i]) + "</b>";
          b.addEventListener("click", () => toggle({ symbol: x.symbol, name: names[i] }));
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
          if (!q) return (sug.innerHTML = "");
          const res = await SCData.search(q, 6);
          sug.innerHTML = res.length ? res.map((it) => '<button type="button" class="fl-sg" data-sym="' + esc(it.symbol) + '" data-name="' + esc(it.name) + '"><b>' + esc(it.name) + "</b><small>" + esc(it.sub) + "</small></button>").join("") : '<div class="fl-none">일치하는 종목이 없어요</div>';
        }, 160);
      });
      sug.addEventListener("click", (e) => {
        const b = e.target.closest(".fl-sg");
        if (!b) return;
        toggle({ symbol: b.dataset.sym, name: b.dataset.name });
        input.value = "";
        sug.innerHTML = "";
      });
      selEl.addEventListener("click", (e) => {
        const tag = e.target.closest(".pf-tag");
        if (tag) {
          chosen.delete(tag.dataset.sym);
          renderSel();
        }
      });
      nextBtn.addEventListener("click", () => {
        if (!chosen.size) return;
        w.classList.add("done");
        const list = [...chosen.values()];
        user(list.map((h) => h.name).join(", "));
        resolve(list);
      });
    });
  }

  function askWeights(holdings) {
    return new Promise((resolve) => {
      const w = document.createElement("div");
      w.className = "fl-pick pf-weights";
      const eq = Math.round((100 / holdings.length) * 10) / 10;
      w.innerHTML =
        '<div class="fl-sub">종목별 비중(%) — 비워두면 균등하게 계산해요</div>' +
        holdings.map((h) => '<label class="pf-w"><span>' + esc(h.name) + '</span><input type="number" inputmode="decimal" min="0" max="100" step="0.1" data-sym="' + esc(h.symbol) + '" placeholder="' + eq + '"/><em>%</em></label>').join("") +
        '<button type="button" class="pf-next">점검하기</button>';
      listEl().appendChild(w);
      scroll();
      w.querySelector(".pf-next").addEventListener("click", () => {
        w.classList.add("done");
        const out = holdings.map((h) => {
          const v = parseFloat(w.querySelector('input[data-sym="' + CSS.escape(h.symbol) + '"]').value);
          return { ...h, weight: isFinite(v) && v > 0 ? v : null };
        });
        const given = out.filter((h) => h.weight !== null);
        const rest = out.length - given.length;
        const sumGiven = given.reduce((a, h) => a + h.weight, 0);
        const fill = rest ? Math.max(0, 100 - sumGiven) / rest || 100 / out.length : 0;
        out.forEach((h) => (h.weight = h.weight === null ? (given.length ? fill : 100 / out.length) : h.weight));
        const total = out.reduce((a, h) => a + h.weight, 0) || 1;
        out.forEach((h) => (h.w = h.weight / total));
        user("비중 확정");
        resolve(out);
      });
    });
  }

  const MARKET_COLOR = { kr: "#d97757", us: "#2b2a27", etf: "#6b9bff", crypto: "#e0a64a" };
  function portfolioHtml(rows) {
    const n = F().isNum;
    const known = rows.filter((r) => r.it);
    const unknown = rows.filter((r) => !r.it);
    const wavg = (key) => {
      const have = known.filter((r) => n(r.it[key]));
      const sw = have.reduce((a, r) => a + r.w, 0);
      return sw ? have.reduce((a, r) => a + r.w * r.it[key], 0) / sw : null;
    };
    const avg = { win: wavg("win"), rsi: wavg("rsi"), w52: wavg("w52"), ret: wavg("ret"), chg: wavg("chg") };
    // 방향 신호(규칙)
    let dir = { text: "자료가 부족해요", tone: "na", sub: "" };
    if (n(avg.rsi) && n(avg.w52)) {
      if (avg.rsi >= 65 && avg.w52 >= 75) dir = { text: "상승 흐름 · 과열 주의", tone: "warn", sub: "많이 오른 구간이라 단기 되돌림에 유의하세요." };
      else if (avg.rsi <= 40 && avg.w52 <= 35) dir = { text: "조정 구간 · 저점권", tone: "warn", sub: "많이 내린 구간이에요. 추세 반전 여부를 지켜보세요." };
      else if (avg.rsi >= 50 && avg.w52 >= 50) dir = { text: "완만한 상승 흐름", tone: "good", sub: "과열은 아니고 위쪽 방향이에요." };
      else if (avg.rsi < 50 && avg.w52 < 50) dir = { text: "약세 흐름", tone: "bad", sub: "전반적으로 아래쪽 방향이에요." };
      else dir = { text: "엇갈리는 흐름", tone: "neutral", sub: "종목마다 방향이 달라요." };
    }
    // 구성
    const byMarket = {};
    known.forEach((r) => (byMarket[r.it.market] = (byMarket[r.it.market] || 0) + r.w));
    const bySector = {};
    known.forEach((r) => {
      const k = r.it.market === "etf" ? "ETF" : r.it.market === "crypto" ? "코인" : r.it.sector || "기타";
      bySector[k] = (bySector[k] || 0) + r.w;
    });
    const stack = Object.entries(byMarket)
      .map(([m, v]) => '<i style="width:' + (v * 100).toFixed(1) + "%;background:" + MARKET_COLOR[m] + '"></i>')
      .join("");
    const legend = Object.entries(byMarket)
      .map(([m, v]) => '<span><i style="background:' + MARKET_COLOR[m] + '"></i>' + MARKET_NAME[m] + " " + (v * 100).toFixed(0) + "%</span>")
      .join("");
    const sectors = Object.entries(bySector)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => '<div class="pf-bar"><span>' + esc(k) + '</span><div><i style="width:' + (v * 100).toFixed(1) + '%"></i></div><b>' + (v * 100).toFixed(0) + "%</b></div>")
      .join("");
    // 경고(쏠림·과열)
    const warns = [];
    known.forEach((r) => r.w >= 0.4 && warns.push(esc(r.name) + " 비중이 " + (r.w * 100).toFixed(0) + "%로 한 종목에 쏠려 있어요."));
    Object.entries(byMarket).forEach(([m, v]) => v >= 0.8 && known.length > 1 && warns.push(MARKET_NAME[m] + "에만 " + (v * 100).toFixed(0) + "%가 몰려 있어요."));
    Object.entries(bySector).forEach(([k, v]) => v >= 0.5 && known.length > 2 && !["ETF", "코인"].includes(k) && warns.push(k + " 업종 비중이 " + (v * 100).toFixed(0) + "%예요."));
    if ((byMarket.crypto || 0) >= 0.3) warns.push("코인 비중이 " + ((byMarket.crypto || 0) * 100).toFixed(0) + "%로 높아요. 변동성이 큰 자산이에요.");
    const hot = known.filter((r) => n(r.it.rsi) && r.it.rsi >= 70).reduce((a, r) => a + r.w, 0);
    if (hot >= 0.4) warns.push("과열 구간(RSI 70 이상) 종목이 " + (hot * 100).toFixed(0) + "%를 차지해요.");
    const top = known.filter((r) => n(r.it.w52) && r.it.w52 >= 90).reduce((a, r) => a + r.w, 0);
    if (top >= 0.5) warns.push("1년 최고가 근처 종목이 " + (top * 100).toFixed(0) + "%예요.");
    // 종목 표
    const gauge = (label, v, suffix, marks) => (n(v) ? '<div class="sc-gauge"><div class="sc-gauge-top"><span>' + label + "</span><b>" + v.toFixed(1) + suffix + '</b></div><div class="sc-track">' + (marks || "") + '<i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></div></div>' : "");
    const table = rows
      .map((r) => {
        if (!r.it) return '<li class="pf-row"><div class="rk-name"><b>' + esc(r.name) + '</b><small>자료 없음</small></div><div class="rk-val"><b>' + (r.w * 100).toFixed(0) + "%</b></div></li>";
        const rsi = n(r.it.rsi) ? (r.it.rsi >= 70 ? "과열" : r.it.rsi <= 30 ? "침체" : "보통") : "–";
        return (
          '<li class="pf-row"><div class="rk-name"><b>' + esc(r.name) + "</b><small>" + esc(r.it.sub) + '</small></div><div class="pf-cells"><span>승률 ' + (n(r.it.win) ? r.it.win.toFixed(0) + "%" : "–") + "</span><span>과열도 " + rsi + "</span><span>52주 " + (n(r.it.w52) ? r.it.w52.toFixed(0) + "%" : "–") +
          '</span></div><div class="rk-val"><b>' + (r.w * 100).toFixed(0) + "%</b></div></li>"
        );
      })
      .join("");
    return (
      '<section class="sc-card"><div class="sc-title">내 포트폴리오 방향 점검 <small>' + rows.length + '개 종목</small></div>' +
      '<div class="rs-sum ' + dir.tone + '"><b>' + esc(dir.text) + "</b><span>" + esc(dir.sub) + "</span></div>" +
      '<div class="sc-row-title">투자처 구성</div><div class="pf-stack">' + stack + '</div><div class="sc-legend pf-legend">' + legend + "</div>" +
      '<div class="sc-row-title">업종 구성</div>' + sectors +
      gauge("평균 승률(10년 월봉)", avg.win, "%", '<u style="left:50%"></u>') +
      gauge("평균 과열도(주간 RSI)", avg.rsi, "", '<u style="left:30%"></u><u style="left:70%"></u>') +
      gauge("평균 52주 위치", avg.w52, "%", '<u style="left:50%"></u>') +
      (warns.length ? '<div class="sc-row-title">쏠림 · 과열 점검</div><ul class="pf-warns">' + warns.map((x) => "<li>" + x + "</li>").join("") + "</ul>" : '<p class="pf-ok">비중 쏠림이나 과열 신호는 크지 않아요.</p>') +
      '<div class="sc-row-title">종목별</div><ul class="pf-rows">' + table + "</ul>" +
      (unknown.length ? '<p class="rk-hint">' + unknown.map((r) => esc(r.name)).join(", ") + "은(는) 마켓맵 순위 자료에 없어 계산에서 빠졌어요.</p>" : "") +
      '<p class="rk-hint">투자 권유가 아니라, 공개된 숫자를 기준으로 한 점검이에요.</p></section>'
    );
  }

  async function portfolioFlow(t) {
    await bot("보유 종목을 골라주세요. 여러 개 담을 수 있어요(최대 12개).", t);
    if (!alive(t)) return;
    const holdings = await pickHoldings();
    if (!alive(t)) return;
    await bot("종목별 비중을 정해주세요.", t, 300);
    const weighted = await askWeights(holdings);
    if (!alive(t)) return;
    const pending = await bot("포트폴리오 방향을 점검하고 있어요", t, 350);
    if (!pending) return;
    let all = [];
    try {
      all = await SCData.loadAll();
    } catch (e) {
      await bot("자료를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.", t, 100);
      return;
    }
    const map = new Map(all.map((it) => [it.symbol, it]));
    const rows = weighted.map((h) => ({ ...h, it: map.get(h.symbol) || null }));
    if (!alive(t)) return;
    block(portfolioHtml(rows));
    await bot("다른 점검도 해볼까요?", t, 300);
    const next = await choose([{ id: "again", label: "다시 구성" }, { id: "stock", label: "내 종목 분석" }, { id: "home", label: "처음으로", accent: true }], { cols: 3, chips: true });
    if (!alive(t)) return;
    if (next.id === "home") return home();
    if (next.id === "stock") return stockAnalyzeFlow(t);
    return portfolioFlow(t);
  }

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
    return pick.id === "stock" ? stockAnalyzeFlow(t) : portfolioFlow(t);
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
