// 스톡챗 버튼 선택 흐름 — AI 없이, 마켓맵 화면을 그대로 채팅 안에 끼워 넣는다.
//  · 화면(순위 표·종목 상세·핵심지표·리스크·투자분석)은 마켓맵 본체를 ?embed= 모드로 불러온 것이라
//    디자인·로딩 모션·3단 구조(기업명/현재가/승률)·전체보기·350종목 비교까지 마켓맵과 완전히 같다.
//  · 이 파일은 "어떤 화면을 언제 올릴지"(질문→선택→화면)만 맡는다.
// 글로 직접 묻는 질문은 app.js의 AI 채팅(/ai-chat)이 따로 처리한다.
window.SCFlow = (function () {
  const WORKER = "https://us-stock.yeop2ad.workers.dev";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const listEl = () => document.getElementById("list");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let token = 0;
  const alive = (t) => t === token;

  // 마켓맵의 투자처 마크(한국·미국 국기, ETF, 비트코인)
  const MARK_ICON = {
    kr: `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#fff" stroke="rgba(0,0,0,0.22)"/><g transform="translate(10.5,7) scale(0.155)"><g stroke="#000" stroke-width="4" fill="none"><path transform="rotate(33.69)" d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11"/><path transform="rotate(-33.69)" d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11"/></g><g transform="rotate(33.69)"><path fill="#cd2e3a" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0"/><path fill="#0047a0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0"/></g></g></svg>`,
    us: `<svg viewBox="0 0 21 14" width="21" height="14"><defs><clipPath id="scUsFlag"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5"/></clipPath></defs><g clip-path="url(#scUsFlag)"><rect x="0" y="0" width="21" height="14" fill="#fff"/><rect x="0" y="0.5" width="21" height="1.9" fill="#b22234"/><rect x="0" y="4.3" width="21" height="1.9" fill="#b22234"/><rect x="0" y="8.1" width="21" height="1.9" fill="#b22234"/><rect x="0" y="11.9" width="21" height="1.9" fill="#b22234"/><rect x="0" y="0" width="9.5" height="6.2" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.4" cy="1.8" r="0.55"/><circle cx="4.8" cy="1.8" r="0.55"/><circle cx="7.2" cy="1.8" r="0.55"/><circle cx="2.4" cy="4.2" r="0.55"/><circle cx="4.8" cy="4.2" r="0.55"/><circle cx="7.2" cy="4.2" r="0.55"/></g></g><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="none" stroke="rgba(0,0,0,0.22)"/></svg>`,
    etf: `<svg viewBox="0 0 21 14" width="21" height="14"><rect x="0.5" y="0.5" width="20" height="13" rx="2.5" fill="#2f6bd8" stroke="rgba(0,0,0,0.15)"/><text x="10.5" y="10" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif" letter-spacing="0.3">ETF</text></svg>`,
    crypto: `<svg viewBox="0 0 21 14" width="21" height="14"><circle cx="10.5" cy="7" r="6.6" fill="#f7931a"/><text x="10.6" y="9.9" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="-apple-system,'Segoe UI',sans-serif">₿</text></svg>`,
  };
  const iconOf = (k) => (MARK_ICON[k] ? '<span class="fl-ico">' + MARK_ICON[k] + "</span>" : "");
  // 화면을 올리기 직전 안내: 말풍선이 먼저 나오고 → "불러옵니다"가 붙고 → 잠깐 뒤에 마켓맵 화면이 올라온다(너무 빠르게 올라오지 않게)
  async function announce(html, t) {
    const el = await bot(html, t, 550);
    if (!el || !alive(t)) return null;
    await sleep(450);
    if (!alive(t)) return null;
    if (html.indexOf("가져와요") < 0) el.innerHTML = html + ' <span class="st-ld">— 불러옵니다…</span>';
    scroll();
    await sleep(650);
    return alive(t) ? el : null;
  }

  // ---------- 단일 종목 화면 머리말: [로고] 이름(티커)에 대한 ○○입니다 ----------
  const tickerOf = (sym) => String(sym || "").replace(/\.(KS|KQ)$/i, "").replace(/-USD$/i, "");
  function stockHead(symbol, name, what) {
    const sym = String(symbol || "");
    const fmp = "https://financialmodelingprep.com/image-stock/" + encodeURIComponent(/-USD$/i.test(sym) ? sym.replace(/-USD$/i, "USD") : sym) + ".png";
    const badge = esc(String(name || sym).replace(/\s/g, "").slice(0, 2));
    return (
      '<span class="st-logo"><img src="' + esc(fmp) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;flex&quot;" /><i>' + badge + "</i></span>" +
      "<b>" + esc(name) + "</b> <span class=\"st-tk\">(" + esc(tickerOf(sym)) + ")</span>에 대한 " + esc(what) + "입니다"
    );
  }

  // 지나간 버튼을 다시 눌렀을 때: 새 흐름으로 그 항목을 처음부터 만든다
  const fresh = (fn) => {
    token++;
    return fn();
  };

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
      w.className = "fl-choices cols-" + (opts.cols || 2) + (opts.chips ? " chips-mode" : "") + (opts.stack ? " stack" : "");
      items.forEach((it) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fl-btn" + (it.accent ? " accent" : "");
        b.innerHTML = (it.mark && !it.icon ? '<span class="fl-mark">' + esc(it.mark) + "</span>" : "") + "<b>" + (it.icon ? iconOf(it.icon) : "") + esc(it.label) + "</b>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "");
        if (it.redo) b.classList.add("redo");
        b.addEventListener("click", () => {
          if (w.classList.contains("done")) {
            if (it.redo) {
              user(it.chat || it.label);
              it.redo(); // 이미 지나간 버튼도 다시 누르면 그 항목을 새로 만든다
            }
            return;
          }
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
          if (it.redo) b.classList.add("redo");
          b.addEventListener("click", () => {
            if (wrap.classList.contains("done")) {
              if (it.redo) {
                user(it.label);
                it.redo();
              }
              return;
            }
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
  const ROW_VIEWS = ["rank", "entry"];
  const ROW_FIRST = 6;
  const ROW_STEP = 10;
  const CAP_H = 480;
  const CAP_VIEWS = ["rank", "entry", "popular", "tab", "insight", "overlay", "calendar", "market"];
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
      if (em.capped) em.wrap.classList.toggle("overflow", d.h > CAP_H + 30); // 한 화면 분량을 넘을 때만 "더보기"
      if (em.stick) scroll();
    } else if (d.type === "scan") {
      scanMark(em, d);
    } else if (d.type === "rows") {
      em.total = d.total;
      syncMore(em);
    } else if (d.type === "open" && em.onOpen) {
      em.onOpen(d.symbol);
    }
  });
  // ---------- 전체 검색 진행 책갈피: 오른쪽 가장자리에 붙어 있고 누르면 그 화면으로 이동, 색이 차오르다 끝나면 완료 표시 ----------
  // 책갈피는 해당 화면·말풍선 옆에 붙어 같이 움직인다(스크롤하면 같이 올라가고 내려감).
  // 화면이 위·아래로 벗어나면 가장자리에 붙어 남아 있어서, 눌러서 바로 돌아갈 수 있다. 완료 후 누르면 사라진다.
  // 전체 검색(350·500종목)과 AI 뉴스 요약처럼 시간이 걸리는 일마다 하나씩 생긴다.
  const marks = [];
  function placeMark() {
    if (!marks.length) return;
    const list = listEl();
    const lr = list.getBoundingClientRect();
    const ar = list.parentElement.getBoundingClientRect();
    const h = 30;
    const minTop = lr.top - ar.top + 6;
    const maxTop = lr.bottom - ar.top - h - 6;
    const rows = marks.map((m) => {
      const wr = m.anchor.getBoundingClientRect();
      m.el.dataset.off = wr.bottom < lr.top + 40 ? "above" : wr.top > lr.bottom - 40 ? "below" : "";
      return { m, top: Math.max(minTop, Math.min(maxTop, wr.top - ar.top + 14)) };
    });
    rows.sort((a, b) => a.top - b.top);
    let last = -1e9;
    rows.forEach((r) => {
      let top = Math.max(r.top, last + h + 6); // 겹치지 않게 아래로 밀기
      top = Math.min(top, maxTop);
      r.m.el.style.top = Math.round(top) + "px";
      last = top;
    });
  }
  setInterval(placeMark, 150);
  window.addEventListener("resize", placeMark);
  document.addEventListener("scroll", placeMark, true);
  function removeMark(m) {
    m.el.remove();
    const k = marks.indexOf(m);
    if (k >= 0) marks.splice(k, 1);
  }
  // 책갈피 하나 만들기: ctl.set(퍼센트|null, 설명) / ctl.done(설명) / ctl.remove()
  function addMark(anchor, label) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "scan-mark";
    el.setAttribute("aria-label", label + " 진행 상황, 누르면 해당 화면으로 이동");
    el.innerHTML = '<span class="sm-fill"></span><svg class="sm-logo" viewBox="0 0 64 64" aria-hidden="true"><polyline points="14,47 27,31 36,40 50,18" fill="none" stroke="#fffaf3" stroke-width="8" stroke-linejoin="miter" stroke-linecap="butt"/></svg><span class="sm-txt"></span>';
    const m = { anchor, el };
    el.addEventListener("click", () => {
      anchor.scrollIntoView({ block: "start", behavior: "smooth" });
      if (el.classList.contains("done")) removeMark(m); // 완료 후 누르면 사라진다
    });
    document.querySelector(".app").appendChild(el);
    marks.push(m);
    placeMark();
    return {
      m,
      set(pct, title) {
        el.classList.remove("done");
        el.classList.toggle("indet", pct == null);
        el.querySelector(".sm-fill").style.height = (pct == null ? 100 : pct) + "%";
        el.title = title || label;
      },
      done(title) {
        el.classList.remove("indet");
        el.classList.add("done");
        el.querySelector(".sm-fill").style.height = "100%";
        el.title = title || label + " 완료 — 눌러서 보기";
      },
      remove() {
        removeMark(m);
      },
    };
  }
  function scanMark(em, d) {
    let m = marks.find((x) => x.anchor === em.wrap);
    if (d.state === "run") {
      if (!m) {
        const c = addMark(em.wrap, "전체 검색");
        m = c.m;
        m.ctl = c;
      }
      const pct = d.total ? Math.min(100, Math.round((d.done / d.total) * 100)) : null;
      m.ctl.set(pct, pct == null ? "전체 검색 중" : "전체 검색 중 " + pct + "%");
    } else if (d.state === "done" && m && m.ctl) {
      m.ctl.done("검색 완료 — 눌러서 보기");
    }
  }
  // 순위 표 "더보기" 버튼 상태: 남은 줄이 있으면 "더보기 (+N개)", 다 보였으면 "접기"
  function syncMore(em) {
    const more = em.wrap.querySelector(".embed-more");
    if (!more) return;
    em.wrap.classList.toggle("has-more", em.total > ROW_FIRST);
    const all = em.limit >= em.total;
    em.wrap.classList.toggle("all", all);
    more.textContent = all ? "접기" : Math.min(ROW_STEP, em.total - em.limit) + "개 더보기";
  }
  // params: {view, market, item, region, ticker, sub} — 마켓맵 본체의 ?embed= 주소로 불러온다
  function embed(params, onOpen) {
    const id = "e" + ++embedSeq;
    const rowMode = ROW_VIEWS.indexOf(params.view) >= 0; // 순위 표: 처음 6줄 → 더보기로 10줄씩
    if (rowMode) params = Object.assign({}, params, { limit: ROW_FIRST });
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
    frame.title = "공시정보 화면";
    frame.loading = "eager";
    frame.src = url.href;
    wrap.appendChild(frame);
    listEl().appendChild(wrap);
    // 목록형 화면은 처음엔 한 화면(종목 5~6개)만 보여주고 나머지는 "더보기"로 펼친다(종목 상세·설명 화면은 그대로)
    const capped = rowMode || CAP_VIEWS.indexOf(params.view) >= 0;
    if (capped) {
      wrap.classList.add(rowMode ? "rows" : "capped");
      const more = document.createElement("button");
      more.type = "button";
      more.className = "embed-more";
      more.textContent = "더보기";
      more.addEventListener("click", () => {
        if (rowMode) {
          const em = embeds[id];
          em.limit = em.limit >= em.total ? ROW_FIRST : em.limit + ROW_STEP; // 다 보이면 다시 접는다
          em.frame.contentWindow.postMessage({ sc: true, type: "limit", n: em.limit }, location.origin);
          syncMore(em);
          return;
        }
        const open = wrap.classList.toggle("open");
        more.textContent = open ? "접기" : "더보기";
        if (!open) wrap.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      wrap.appendChild(more);
    }
    embeds[id] = { wrap, frame, onOpen, stick: true, capped, rowMode, limit: ROW_FIRST, total: 0 };
    setTimeout(() => embeds[id] && (embeds[id].stick = false), 4000);
    scroll();
    return embeds[id];
  }

  // ---------- 간편검색 항목(마켓맵 간편검색과 동일) ----------
  const STOCK_LABEL = { win: "10년평균 승률", ret: "연평균 상승률", rev: "매출액", vol: "1일 변동성", rsi: "과열도", ni: "순이익", om: "영업이익", roe: "ROE", cf: "현금흐름", debt: "부채비율", mcap: "시가총액", dv: "거래대금", w52: "52주구간", per: "PER", div: "배당률" };
  const ASSET_LABEL = { win: "10년평균 승률", ret: "연평균 상승률", rev: "수익률", vol: "1일 변동성", rsi: "과열도", div: "배당률", fee: "운용보수", mcap: "규모", aum: "규모", w52: "52주구간" };
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
  // 순위 화면 아래에 붙이는 안내(마켓맵 순위 화면은 시가총액 상위 30개를 먼저 보여주고 "전체보기"로 나머지를 검색한다)
  const RANK_NOTE = {
    kr: "해당 순위는 시가총액 30위까지의 결과입니다. 코스피200+코스닥150 총 350종목으로 비교하는 전체보기를 원하시면 아래 버튼을 눌러주세요.",
    us: "해당 순위는 시가총액 30위까지의 결과입니다. S&P500 총 500종목으로 비교하는 전체보기를 원하시면 아래 버튼을 눌러주세요.",
    etf: "해당 순위는 상위 종목만 먼저 보여드린 결과입니다. ETF 전체로 비교하는 전체보기를 원하시면 아래 버튼을 눌러주세요.",
    crypto: "해당 순위는 시가총액 30위까지의 결과입니다. 코인 200종목으로 비교하는 전체보기를 원하시면 아래 버튼을 눌러주세요.",
  };
  const MARKET_NAME = { kr: "한국주식", us: "미국주식", etf: "ETF", crypto: "비트코인" };
  const labelOf = (m, k) => (m === "kr" || m === "us" ? STOCK_LABEL[k] : ASSET_LABEL[k]);
  const groupsOf = (m) => (m === "kr" || m === "us" ? GROUPS.stock : GROUPS[m]);

  // 종목 하위 항목 버튼: 증권을 처음 접하는 사람도 알 수 있게 "~해줘" 말투로 풀어 쓰고, 어려운 이름은 괄호로 함께 알려준다
  const PLAIN = {
    revenue: { id: "revenue", label: "회사 매출 상태 확인해줘", sub: "돈을 잘 벌고 있는지 (매출·순이익)", what: "매출·이익 상태(재무제표)" },
    sreport: { id: "sreport", label: "이 종목 성적표 보여줘", sub: "오래 들고 있으면 어땠는지 등 핵심 5가지", what: "성적표(핵심지표)" },
    risk: { id: "risk", label: "위험한 점은 없는지 점검해줘", sub: "빚·적자·급락 같은 위험 신호 체크", what: "위험 신호 점검(리스크)" },
    news: { id: "news", label: "요즘 무슨 일 있는지 알려줘", sub: "이 회사의 최근 뉴스", what: "최근 소식(뉴스)" },
    summary: { id: "summary", label: "지금 주가랑 차트 보여줘", sub: "현재 가격과 지금까지의 흐름", what: "현재 주가·차트(개요)" },
  };

  // ---------- 주요 뉴스: AI가 최근 5건을 쉬운 말로 요약 + "뉴스 더보기"(마켓맵 뉴스 목록) ----------
  // 요약은 Worker(/news-summary)가 기사 제목을 근거로 만든다(15분 재사용). 실패하면 마켓맵 뉴스 목록을 바로 보여준다.
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? u : "#");
  const shortDate = (d) => (d ? String(d).slice(5).replace("-", "/") : "");
  async function botWhile(promise, t, onEl) {
    const el = document.createElement("div");
    el.className = "msg msg-assistant msg-pending";
    el.innerHTML = DOTS;
    listEl().appendChild(el);
    scroll();
    if (onEl) onEl(el);
    const res = await promise;
    if (!alive(t)) {
      el.remove();
      return { el: null, res };
    }
    el.classList.remove("msg-pending");
    return { el, res };
  }
  // offset: 0 = 최근 5건, 5 = 그다음 5건 … (더보기를 누를 때마다 다음 5건을 AI가 같은 형식으로 요약)
  const NEWS_BATCH = 3;
  async function newsFlow(symbol, name, t, offset) {
    offset = offset || 0;
    const head = offset ? "<b>" + esc(name) + "</b>의 이전 뉴스 " + (offset + 1) + "~" + (offset + NEWS_BATCH) + "번째를 정리해요" : stockHead(symbol, name, PLAIN.news.what);
    if (!(await announce(head, t))) return;
    // 10초 안에 못 끝나면 기다리지 않고 안내(뉴스 요약은 한 번에 3건만)
    const req = fetch(WORKER + "/news-summary?symbol=" + encodeURIComponent(symbol) + "&name=" + encodeURIComponent(name) + "&offset=" + offset, { signal: AbortSignal.timeout(10000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    // 요약이 만들어지는 동안 책갈피(로고)가 10초 기준으로 차오르다가, 끝나면 완료 표시. 누르면 이 요약으로 이동하고 사라진다
    let ctl = null;
    let timer = null;
    const t0 = Date.now();
    const { el, res } = await botWhile(req, t, (bubble) => {
      ctl = addMark(bubble, "뉴스 요약");
      ctl.set(0, "뉴스 요약 중");
      timer = setInterval(() => ctl && ctl.set(Math.min(92, Math.round(((Date.now() - t0) / 9000) * 92)), "뉴스 요약 중"), 200);
    });
    clearInterval(timer);
    if (!el || !res || !res.summary) {
      if (ctl) ctl.remove(); // 실패·취소면 책갈피를 남기지 않는다
    } else if (ctl) {
      ctl.done("뉴스 요약 완료 — 눌러서 보기");
    }
    if (!el) return;
    if (res && res.empty) {
      el.textContent = offset ? "더 오래된 뉴스는 없어요. 최근 1개월 안의 뉴스는 모두 정리했어요." : "최근 1개월 안의 뉴스를 찾지 못했어요.";
      return;
    }
    if (!res || !res.summary) {
      el.textContent = "뉴스 요약이 오래 걸리고 있어요. 잠시 후 '뉴스'를 다시 눌러주세요.";
      return;
    }
    if (window.SCUsage && res.usage) window.SCUsage.add(res.usage.tokens, "뉴스 요약");
    const items = (res.items || [])
      .map(
        (it, i) =>
          '<li value="' + (offset + i + 1) + '"><b>' + esc(it.title) + "</b>" +
          (it.gist ? "<br><span>" + esc(it.gist) + "</span>" : "") +
          "<small>" + esc([it.publisher, shortDate(it.date)].filter(Boolean).join(" · ")) +
          '<a class="news-go" href="' + esc(safeUrl(it.link)) + '" target="_blank" rel="noopener" aria-label="원문 보기" title="원문(출처)으로 이동"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></a></small></li>'
      )
      .join("");
    el.innerHTML =
      "<b>AI가 " + (offset ? "이전 " : "최근 ") + "뉴스 " + (res.items || []).length + "건을 읽고 정리했어요</b>" +
      '<p class="news-sum">' + esc(res.summary) + "</p>" +
      '<ol class="news-ai">' + items + "</ol>" +
      '<p class="news-note">AI가 기사 제목을 바탕으로 정리한 내용이라 정확한 내용은 원문에서 확인하세요. 투자 권유가 아닙니다.</p>';
    scroll();
    if (res.hasMore) {
      // 더보기: 그다음 5건을 같은 방식으로 요약 — 다른 흐름을 끊지 않도록 따로 기다린다
      const next = () => {
        const t2 = token;
        newsFlow(symbol, name, t2, offset + NEWS_BATCH);
      };
      choose([{ id: "more", label: "뉴스 더보기", sub: "그다음 뉴스 3건도 AI가 정리해줘요", accent: true, redo: next }], { cols: 1, stack: true }).then(next);
    }
  }

  // 종목 상세 화면 하나를 올린다(지나간 버튼을 다시 눌렀을 때도 사용)
  async function detailOne(symbol, name, a) {
    const t = token;
    if (a.id === "news") return newsFlow(symbol, name, t);
    if (await announce(stockHead(symbol, name, a.what || a.label), t)) embed({ view: "detail", ticker: symbol, sub: a.id });
  }

  // ---------- 종목 → 핵심정보 / 리스크점검 ----------
  async function stockMenu(symbol, name, t, fromRank) {
    const info = await SCData.lookup(symbol);
    const isStock = !info || info.market === "kr" || info.market === "us";
    for (;;) {
      await bot(stockHead(symbol, name, "분석 항목") .replace("에 대한 분석 항목입니다", "") + " — 무엇을 볼까요?", t);
      if (!alive(t)) return;
      const act = await choose(
        [
          PLAIN.sreport,
          isStock && PLAIN.risk,
          PLAIN.summary,
        ].filter(Boolean).map((a) => ({ ...a, redo: () => fresh(() => detailOne(symbol, name, a)) })),
        { cols: 1, stack: true }
      );
      if (!alive(t)) return;
      if (!(await announce(stockHead(symbol, name, act.what), t))) return;
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

  // ---------- 전체보기: 마지막으로 올린 순위 화면에서 마켓맵의 "전체보기"(나머지 종목 검색)를 실행 ----------
  let lastRank = null;
  async function fullView(t) {
    const em = lastRank;
    if (!em || !em.frame.contentWindow) return false;
    em.limit = ROW_FIRST; // 500개를 검색해도 처음엔 6줄만, 나머지는 더보기로
    em.frame.contentWindow.postMessage({ sc: true, type: "limit", n: ROW_FIRST }, location.origin);
    em.wrap.scrollIntoView({ block: "start", behavior: "smooth" });
    em.frame.contentWindow.postMessage({ sc: true, type: "loadAll" }, location.origin);
    await bot("전체 종목을 검색하고 있어요. 약 1분 걸려요. 결과가 나오면 6개만 먼저 보여드리고, 더보기로 10개씩 더 볼 수 있어요.", t == null ? token : t, 300);
    return true;
  }
  // 글로 "전체보기"라고 친 경우
  function matchFullView(text) {
    return !!lastRank && /^(?:(?:전체보기|전체비교|전체종목|전체)(?:눌러줘|눌러주세요|눌러|눌러봐|해줘|보여줘|보기)?|눌러줘|눌러주세요|눌러|눌러봐)$/.test(String(text || "").replace(/[\s?!.,~]/g, ""));
  }
  function fullViewNow() {
    return fullView(token);
  }

  // ---------- 1. 간편검색 ----------
  async function searchFlow(preset) {
    const t = token;
    let market, region = null, key = null;
    if (preset) {
      market = preset.market;
      key = preset.key;
      region = preset.region || null;
    } else {
      user("간편검색");
      await bot("어떤 투자처를 찾아볼까요?", t);
      if (!alive(t)) return;
      market = (await choose(MARKETS.map((m) => ({ ...m, icon: m.id, chat: m.label, redo: () => fresh(() => searchFlow({ market: m.id })) })), { cols: 1 })).id;
    }
    for (;;) {
      if (market === "etf" && !region) {
        await bot("어느 시장의 ETF를 볼까요?", t);
        region = (await choose([{ id: "kr", icon: "kr", label: "한국 ETF", redo: () => fresh(() => searchFlow({ market: "etf", region: "kr" })) }, { id: "us", icon: "us", label: "미국 ETF", redo: () => fresh(() => searchFlow({ market: "etf", region: "us" })) }], { cols: 2 })).id;
      }
      if (!key) {
        await bot("[" + MARKET_NAME[market] + (region ? " · " + (region === "kr" ? "한국" : "미국") : "") + "] 어떤 순위를 볼까요?", t);
        if (!alive(t)) return;
        key = (await chooseGrouped(groupsOf(market).map(([title, keys]) => [title, keys.map((k) => ({ id: k, label: labelOf(market, k), redo: () => fresh(() => searchFlow({ market, region, key: k })) }))]))).id;
      }
      for (;;) {
        await announce("[" + MARKET_NAME[market] + "] " + labelOf(market, key) + " 순위를 가져와요", t);
        if (!alive(t)) return;
        lastRank = embed({ view: "rank", market, item: key, region }, async (sym) => {
          const name = await SCData.nameOf(sym, sym);
          user(name);
          stockMenu(sym, name, t, true);
        });
        await bot(esc(RANK_NOTE[market] || "") + "<br>종목을 누르면 자세히 볼 수 있어요. 다른 순위도 볼까요?", t, 500);
        const same = groupsOf(market).find(([, ks]) => ks.includes(key))[1].filter((k) => k !== key);
        let next;
        for (;;) {
          next = await choose(
          [{ id: "full", label: "전체보기", accent: true }].concat(same.map((k) => ({ id: "k:" + k, label: labelOf(market, k), redo: () => fresh(() => searchFlow({ market, region, key: k })) })).concat([{ id: "market", label: "다른 투자처", accent: true }, { id: "home", label: "처음으로", accent: true }])),
          { cols: 3, chips: true }
          );
          if (!alive(t)) return;
          if (next.id !== "full") break;
          await fullView(t);
          await bot("다른 순위도 볼까요?", t, 300);
          if (!alive(t)) return;
        }
        if (next.id === "home") return home();
        if (next.id === "market") {
          await bot("어떤 투자처를 찾아볼까요?", t);
          market = (await choose(MARKETS.map((m) => ({ ...m, icon: m.id, chat: m.label, redo: () => fresh(() => searchFlow({ market: m.id })) })), { cols: 1 })).id;
          region = null;
          key = null;
          break;
        }
        key = next.id.slice(2);
      }
    }
  }

  // ---------- 글로 친 순위 항목 이름(예: "상승률") → 투자처별 순위 버튼 ----------
  const ALL4 = (k) => ({ kr: k, us: k, etf: k, crypto: k });
  const RANK_WORDS = [
    { label: "10년평균 승률", words: ["승률", "10년승률", "10년평균승률"], keys: ALL4("win") },
    { label: "연평균 상승률", words: ["상승률", "연평균상승", "연평균상승률"], keys: ALL4("ret") },
    { label: "수익률", words: ["수익률"], keys: { kr: "ret", us: "ret", etf: "rev", crypto: "rev" } },
    { label: "1일 변동성", words: ["변동성"], keys: ALL4("vol") },
    { label: "과열도", words: ["과열도", "과열", "rsi"], keys: ALL4("rsi") },
    { label: "52주구간", words: ["52주구간", "52주", "52주최저", "52주최고"], keys: ALL4("w52") },
    { label: "시가총액", noMention: ["규모"], words: ["시가총액", "시총", "규모"], keys: { kr: "mcap", us: "mcap", etf: "aum", crypto: "mcap" } },
    { label: "매출액", words: ["매출액", "매출", "매출성장", "매출증가"], keys: { kr: "rev", us: "rev" } },
    { label: "순이익", words: ["순이익", "순이익증가"], keys: { kr: "ni", us: "ni" } },
    { label: "영업이익", words: ["영업이익", "영업이익률"], keys: { kr: "om", us: "om" } },
    { label: "ROE", words: ["roe"], keys: { kr: "roe", us: "roe" } },
    { label: "현금흐름", words: ["현금흐름", "현금흐름증가"], keys: { kr: "cf", us: "cf" } },
    { label: "부채비율", words: ["부채비율", "부채"], keys: { kr: "debt", us: "debt" } },
    { label: "거래대금", words: ["거래대금", "거래량"], keys: { kr: "dv", us: "dv" } },
    { label: "PER", words: ["per"], keys: { kr: "per", us: "per" } },
    { label: "배당률", words: ["배당률", "배당", "배당수익률"], keys: { kr: "div", us: "div", etf: "div" } },
    { label: "운용보수", noMention: ["보수"], words: ["운용보수", "보수"], keys: { etf: "fee" } },
    // 거시경제 · 공포지수 · 투자시기 → 코스피 공포지수 / S&P 공포지수 / 알트코인 시즌지수 (마켓맵 더보기의 같은 그룹)
    { label: "공포지수", fear: true, noMention: ["공포", "타이밍", "거시경제"], words: ["거시경제지표", "거시경제", "공포지수", "공포", "vix", "알트시즌지수", "알트코인시즌지수", "알트시즌", "알트코인시즌", "투자시기", "투자시점", "투자타이밍", "타이밍", "포모지수", "fomo지수"], keys: { kr: "fear", us: "fear", crypto: "fear" } },
  ];
  // "순위·보여줘" 같은 꼬리말만 붙은 짧은 요청일 때만 버튼으로 처리하고, 뜻을 묻거나 종목이 섞인 질문은 AI에게 맡긴다
  //  · "미국 PER 낮은 종목"처럼 투자처 말머리·방향 말(낮은/높은)이 붙어도 인식한다. 방향이 마켓맵 화면(고정 방향)과 반대면 AI에게 넘긴다.
  const TAIL = "(?:순위|랭킹|top\\d*|상위|보기|보여줘|알려줘|찾아줘|찾기|높은종목|높은순|많은종목|종목|주식|리스트|목록|줘|좀|요|를|을|은|는|이|가|도|낮은|높은|많은|큰|작은|적은|좋은|싼|저평가된|과열된|오늘|요즘|지금|회사|기업|근처|부근|최저가|최고가)*";
  const RANK_RE = RANK_WORDS.map((m) => ({ m, re: new RegExp("^(?:" + m.words.slice().sort((a, b) => b.length - a.length).join("|") + ")" + TAIL + "$", "i") }));
  const MARKET_PREFIX = [
    ["kr", ["한국주식", "국내주식", "코스피", "코스닥", "한국", "국내"]],
    ["us", ["미국주식", "해외주식", "나스닥", "미국", "해외"]],
    ["etf", ["etf"]],
    ["crypto", ["비트코인", "암호화폐", "코인"]],
  ];
  function splitMarket(s) {
    for (const [id, ws] of MARKET_PREFIX) for (const w of ws) if (s.startsWith(w)) return { market: id, rest: s.slice(w.length).replace(/^(주식|종목)/, "") };
    return { market: null, rest: s };
  }
  const WANT_LOW = /(낮은|작은|적은|싼|저평가)/;
  const WANT_HIGH = /(높은|많은|큰|좋은)/;
  // 마켓맵 순위 화면의 정렬 방향(고정): high=큰 값이 위, low=작은 값이 위
  const DIR = { "10년평균 승률": "high", "연평균 상승률": "high", 수익률: "high", 과열도: "high", 시가총액: "high", 매출액: "high", 순이익: "high", 영업이익: "high", ROE: "high", 현금흐름: "high", 거래대금: "high", 배당률: "high", PER: "low", 부채비율: "low", 운용보수: "low", "52주구간": "low" };
  function matchRanking(text) {
    let s = String(text || "").toLowerCase().replace(/[\s?!.,~]/g, "");
    if (!s || s.length > 30) return null;
    const sp = splitMarket(s);
    s = sp.rest || s;
    const hit = RANK_RE.find((x) => x.re.test(s));
    if (!hit) return null;
    const want = DIR[hit.m.label];
    if ((want === "high" && WANT_LOW.test(s)) || (want === "low" && WANT_HIGH.test(s))) return null; // 반대 방향 순위는 아직 화면이 없어 AI에게
    if (!want && (WANT_LOW.test(s) || WANT_HIGH.test(s))) return null;
    return sp.market && hit.m.keys[sp.market] ? Object.assign({}, hit.m, { presetMarket: sp.market }) : hit.m;
  }
  // 문장 속에 순위 항목 이름이 들어 있는지(AI 답변 뒤에 순위 버튼을 이어 붙일 때 사용) — 가장 긴 이름을 우선
  function findMention(text) {
    const s = String(text || "").toLowerCase();
    let best = null;
    RANK_WORDS.forEach((m) =>
      m.words.forEach((w) => {
        if (m.noMention && m.noMention.indexOf(w) >= 0) return;
        const hit = /^[a-z0-9]+$/.test(w) ? new RegExp("(^|[^a-z0-9])" + w + "([^a-z0-9]|$)").test(s) : s.indexOf(w) >= 0;
        if (hit && (!best || w.length > best.len)) best = { m: m, len: w.length };
      })
    );
    return best ? best.m : null;
  }
  async function rankFromText(m, opts) {
    token++;
    const t = token;
    clearIntro();
    const follow = opts && opts.followUp;
    await bot(m.presetMarket ? "<b>" + esc(MARKET_NAME[m.presetMarket]) + " " + esc(m.label) + "</b> 순위를 가져와요" : follow ? "<b>" + esc(m.label) + "</b> 순위도 바로 볼 수 있어요. 어느 투자처를 볼까요?" : "어느 투자처의 <b>" + esc(m.label) + "</b> 순위를 볼까요?", t, follow ? 300 : 420);
    if (!alive(t)) return;
    if (m.fear) return fearFlow(t);
    if (m.presetMarket) return searchFlow({ market: m.presetMarket, key: m.keys[m.presetMarket] });
    const items = ["kr", "us", "etf", "crypto"].filter((k) => m.keys[k]).map((k) => ({ id: k, icon: k, label: MARKET_NAME[k] + " " + labelOf(k, m.keys[k]) + " 순위", redo: () => fresh(() => searchFlow({ market: k, key: m.keys[k] })) }));
    const pick = await choose(items, { cols: 2 });
    if (!alive(t)) return;
    return searchFlow({ market: pick.id, key: m.keys[pick.id] });
  }

  // 거시경제 · 공포지수 · 투자시기: 세 지수를 버튼으로 고르면 마켓맵 화면 그대로
  const FEAR_ITEMS = [
    { id: "kr", label: "코스피 공포지수" },
    { id: "us", label: "S&P 공포지수" },
    { id: "crypto", label: "알트코인 시즌지수" },
  ];
  async function fearOne(i) {
    const t = token;
    if (await announce("<b>" + esc(i.label) + "</b> 화면을 가져와요", t)) embed({ view: "fear", market: i.id });
  }
  async function fearFlow(t) {
    const done = new Set();
    for (;;) {
      const left = FEAR_ITEMS.filter((i) => !done.has(i.id));
      if (!left.length) return;
      if (!done.size) await bot("어느 지수를 볼까요? (투자시기 점검)", t, 300);
      else await bot("다른 지수도 볼까요?", t, 300);
      if (!alive(t)) return;
      const pick = await choose(left.map((i) => ({ ...i, redo: () => fresh(() => fearOne(i)) })).concat(done.size ? [{ id: "home", label: "처음으로", accent: true }] : []), { cols: 1 });
      if (!alive(t)) return;
      if (pick.id === "home") return home();
      done.add(pick.id);
      await announce("<b>" + esc(pick.label) + "</b> 화면을 가져와요", t);
      if (!alive(t)) return;
      embed({ view: "fear", market: pick.id });
    }
  }

  // 질문에 종목과 순위 항목이 함께 있을 때(예: "삼성전자 상승률 어때") — [종목 핵심지표] [종목 리스크] [투자처 항목 순위]
  async function offerForStock(st, m) {
    token++;
    const t = token;
    clearIntro();
    const item = await SCData.lookup(st.symbol);
    const sym = String(st.symbol || "");
    const market = item ? item.market : /\.(KS|KQ)$/.test(sym) ? "kr" : /-USD$/.test(sym) ? "crypto" : "us";
    const region = item && item.region ? item.region : null;
    // 마켓맵 상세 화면에는 코인·ETF에 재무제표(매출·순이익)·리스크 항목이 없어서 주식일 때만 보여준다
    const isStock = market === "kr" || market === "us";
    const all = [
      isStock && PLAIN.revenue,
      PLAIN.sreport,
      isStock && PLAIN.risk,
      PLAIN.news,
    ].filter(Boolean);
    if (m && !m.fear && m.keys[market]) all.push({ id: "rank", label: MARKET_NAME[market] + (market === "etf" && region ? " " + (region === "kr" ? "한국" : "미국") : "") + " " + labelOf(market, m.keys[market]) + " 순위", key: m.keys[market] });
    const done = new Set();
    let first = true;
    for (;;) {
      const left = all.filter((i) => !done.has(i.id));
      if (!left.length) return;
      await bot(first ? stockHead(st.symbol, st.name, "정보").replace("에 대한 정보입니다", "") + " — 더 볼까요?" : "이어서 볼까요?", t, 300);
      first = false;
      if (!alive(t)) return;
      const pick = await choose(left.map((i) => ({ ...i, redo: () => fresh(() => (i.id === "rank" ? searchFlow({ market, key: i.key, region }) : detailOne(st.symbol, st.name, { id: i.id, label: i.what }))) })).concat([{ id: "home", label: "처음으로", accent: true }]), { cols: 1, stack: true });
      if (!alive(t)) return;
      if (pick.id === "home") return home();
      done.add(pick.id);
      if (pick.id === "rank") return searchFlow({ market, key: pick.key, region });
      if (pick.id === "news") {
        await newsFlow(st.symbol, st.name, t);
        continue;
      }
      await announce(stockHead(st.symbol, st.name, pick.what), t);
      if (!alive(t)) return;
      embed({ view: "detail", ticker: st.symbol, sub: pick.id });
    }
  }

  // ---------- 매수·매도 질문 → 마켓맵 [요약] 그대로 ----------
  // "삼성전자 지금 사야해?"처럼 매매 판단을 묻는 질문은 AI의 글 대신 마켓맵의 S리포트 요약(핵심 5개 지표·평가 한 줄)을
  // 그대로 보여주고, 그 아래에 데이터로만 만든 "현재 ~ 상태입니다" 한 문장과 하위 항목 버튼을 붙인다(사라/팔라는 말은 하지 않음).
  const BUYSELL = /(사야|사도|살까|살만|사볼|매수|팔아야|팔까|팔아도|매도|들어가도|들어갈까|담아도|손절|익절|물타기|존버)/;
  async function matchBuySell(text) {
    if (!BUYSELL.test(String(text || ""))) return null;
    try {
      return await SCData.findInText(text);
    } catch (e) {
      return null;
    }
  }
  async function fetchCard(sym) {
    const res = await fetch(WORKER + "/stock-card?symbol=" + encodeURIComponent(sym));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.card) throw new Error(data.error || "no card");
    return data.card;
  }
  function stateSentence(c) {
    const n = (v) => typeof v === "number" && isFinite(v);
    const parts = [];
    const pos = c.week && c.week.pos;
    if (n(pos)) parts.push("1년 가격 범위의 " + Math.round(pos) + "% 지점(" + (pos >= 80 ? "고점 부근" : pos <= 20 ? "저점 부근" : "중간대") + ")에 있고");
    const rsi = c.win && c.win.rsi;
    if (n(rsi)) parts.push("과열도는 " + (rsi >= 70 ? "높은 편" : rsi <= 30 ? "낮은 침체 구간" : "보통") + "(RSI " + Math.round(rsi) + ")이며");
    const m3 = c.returns && c.returns.m3;
    if (n(m3)) parts.push("최근 3개월은 " + (m3 >= 10 ? "상승 흐름" : m3 <= -10 ? "하락 흐름" : "횡보") + "(" + (m3 > 0 ? "+" : "") + m3.toFixed(1) + "%)인");
    return parts.length ? "현재 " + parts.join(" ") + " 상태입니다." : "";
  }
  async function buySellSummary(st) {
    token++;
    const t = token;
    clearIntro();
    await announce(stockHead(st.symbol, st.name, "[요약]"), t);
    if (!alive(t)) return;
    embed({ view: "detail", ticker: st.symbol, sub: "summary" }); // 마켓맵 상세 맨 위: 그래프·기본정보·과거분석/미래예측/공포지수 버튼
    let line = "";
    try {
      line = stateSentence(await fetchCard(st.symbol));
    } catch (e) {
      line = "";
    }
    if (!alive(t)) return;
    await bot((line ? esc(line) + "<br>" : "") + "참고용 정보예요. 충분히 살펴보시고, 투자 결정은 본인 판단으로 편하게 정해 주세요.", t, 700);
    if (!alive(t)) return;
    return offerForStock(st, null);
  }

  // ---------- "승률이 뭐야" → 마켓맵의 "+승률이란" 내용 그대로 ----------
  // 승률(10년 평균 승률)의 뜻을 묻는 질문이고 특정 종목이 섞여 있지 않으면, AI 대신 마켓맵에 만들어 둔 "승률이란?" 화면을 보여준다.
  // "상승률"은 다른 지표라 제외한다.
  const WIN_WORD = /(^|[^상])(10년평균승률|10년승률|평균승률|승률)/;
  const DEFINE_WORD = /(뭐야|뭐지|뭔데|뭔가요|뭐예요|뭐에요|무엇|뜻|의미|정의|설명|란$|이란|란\?|계산|산출)/;
  async function matchExplain(text) {
    const s = String(text || "").toLowerCase().replace(/[\s?!.,~]/g, "");
    if (!s || s.length > 30 || !WIN_WORD.test(s) || !DEFINE_WORD.test(s)) return null;
    try {
      if (await SCData.findInText(text)) return null; // 종목이 들어 있으면 AI가 그 종목 기준으로 답한다
    } catch (e) {
      /* 이름표를 못 읽어도 설명은 보여줌 */
    }
    return { topic: "winrate" };
  }
  async function explainShow() {
    token++;
    const t = token;
    clearIntro();
    await bot("공시정보의 <b>승률이란?</b>이에요", t, 300);
    if (!alive(t)) return;
    embed({ view: "info", topic: "winrate" });
    await bot("<b>승률</b> 순위도 바로 볼 수 있어요. 어느 투자처를 볼까요?", t, 500);
    if (!alive(t)) return;
    const m = RANK_WORDS.find((x) => x.label === "10년평균 승률");
    const items = ["kr", "us", "etf", "crypto"].filter((k) => m.keys[k]).map((k) => ({ id: k, icon: k, label: MARKET_NAME[k] + " " + labelOf(k, m.keys[k]) + " 순위", redo: () => fresh(() => searchFlow({ market: k, key: m.keys[k] })) }));
    const pick = await choose(items, { cols: 2 });
    if (!alive(t)) return;
    return searchFlow({ market: pick.id, key: m.keys[pick.id] });
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
      await bot("내 포트폴리오를 점검해요. 공시정보의 관심종목 기준으로 보여드려요.", t);
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

  // ---------- 마켓맵 화면을 글로 바로 열기(AI 0원) ----------
  // 급등주·급락주·인기종목·실적·IPO·캘린더·뉴스·자동추적·기관보유·섹터승률·상관관계·시총순위상승·다트공시·신기술·브랜드평판·최대낙폭·시장지수·투자방법/포트폴리오
  // 짧은 질문에 이 이름이 들어 있고 종목이 섞이지 않았을 때, 투자처를 고르게 한 뒤 마켓맵 화면을 그대로 끼워 넣는다.
  const ALL_M = ["kr", "us", "etf", "crypto"];
  const SCREENS = [
    { id: "surge", label: "급등주", words: ["급등주", "급등", "오늘오른", "많이오른", "오늘상승", "상승종목", "상한가"], markets: ["kr", "us"], embed: (m) => ({ view: "entry", market: m, label: "상승률" }) },
    { id: "plunge", label: "급락주", words: ["급락주", "급락", "폭락", "오늘하락", "오늘떨어진", "많이떨어진", "하락종목", "하한가"], markets: ["kr", "us"], embed: (m) => ({ view: "entry", market: m, label: "하락률" }) },
    { id: "popular", label: "인기종목", words: ["인기종목", "인기주", "인기검색", "핫한종목", "요즘뜨는", "뜨는종목", "화제종목"], markets: ALL_M, embed: (m) => ({ view: "popular", market: m }) },
    { id: "earnings", label: "실적 일정", words: ["실적발표", "실적일정", "어닝", "실적시즌", "최근실적", "실적언제"], markets: ["kr", "us"], embed: (m) => ({ view: "tab", name: "earnings", market: m }) },
    { id: "ipo", label: "신규상장(IPO)", words: ["ipo", "신규상장", "공모주", "상장일정", "신규상장주", "새로상장"], markets: ["kr", "us"], embed: (m) => ({ view: "tab", name: "ipo", market: m }) },
    { id: "autotrack", label: "자동추적", words: ["자동추적", "신호등", "매수신호", "매도신호"], markets: ALL_M, embed: (m) => ({ view: "tab", name: "autotrack", market: m }) },
    { id: "drawdown", label: "최대낙폭", words: ["최대낙폭", "낙폭", "mdd"], markets: ["crypto"], embed: (m) => ({ view: "tab", name: "drawdown", market: m }) },
    { id: "calendar", label: "캘린더", words: ["캘린더", "경제일정", "투자일정", "fomc", "금리발표", "cpi발표", "고용지표", "이번주일정", "이번달일정"], markets: null, embed: () => ({ view: "calendar" }) },
    { id: "news", label: "시장 뉴스", words: ["시장뉴스", "오늘뉴스", "주요뉴스", "속보", "관심종목뉴스", "최신뉴스", "뉴스모아", "뉴스"], markets: null, embed: () => ({ view: "overlay", cat: "news", market: "us" }) },
    { id: "tech", label: "신기술", words: ["신기술", "기술뉴스", "신기술뉴스"], markets: null, embed: () => ({ view: "overlay", cat: "tech", market: "us" }) },
    { id: "brand", label: "브랜드평판", words: ["브랜드평판", "평판순", "브랜드순위", "해리스", "reptrak", "yougov"], markets: null, embed: () => ({ view: "overlay", cat: "brand", market: "us" }) },
    { id: "dart", label: "다트공시(연봉·근속·인원·자사주)", words: ["다트공시", "다트", "평균연봉", "연봉순위", "연봉", "근속연수", "평균근속", "인원감축", "인원변동", "직원수", "자사주매입", "자사주", "임금"], markets: null, embed: () => ({ view: "overlay", cat: "brand", market: "kr" }) },
    { id: "firms", noStock: true, label: "기관·자산운용사 보유", words: ["기관투자자", "자산운용사", "기관보유", "13f", "블랙록", "뱅가드", "버크셔", "국민연금", "삼성자산운용", "미래에셋자산운용", "큰손", "기관"], markets: ["kr", "us"], embed: (m) => ({ view: "insight", cat: "firms", market: m }) },
    { id: "rankup", label: "시총 순위 상승", words: ["순위상승", "시총순위상승", "순위급상승", "시총순위"], markets: ["kr", "us", "crypto"], embed: (m) => ({ view: "insight", cat: "rankup", market: m }) },
    { id: "corr", label: "상관관계", words: ["상관관계", "상관관계도", "적중순위"], markets: ["kr", "us", "crypto"], embed: (m) => ({ view: "insight", cat: "corr", market: m }) },
    { id: "sectorWin", label: "섹터 승률", words: ["섹터승률", "섹터별승률", "업종승률", "섹터순위", "섹터"], markets: ["kr", "us", "crypto"], embed: (m) => ({ view: "insight", cat: "sectorWin", market: m }) },
    { id: "index", label: "시장 지수 현황", words: ["시장지수", "지수현황", "시장현황", "코스피지수", "나스닥지수", "오늘지수"], markets: null, embed: () => ({ view: "market" }) },
    { id: "method", label: "투자방법 비교", words: ["투자방법", "투자방법비교", "투자전략", "전략비교", "투자법"], markets: null, embed: () => ({ view: "analysis" }) },
    { id: "pf", label: "내 포트폴리오", words: ["내포트폴리오", "포트폴리오", "포트폴리오점검", "내자산", "내주식점검"], markets: null, embed: () => ({ view: "analysis" }) },
  ];
  // 종목 이름이 섞이면 종목 중심으로 처리해야 하는 화면(뉴스·실적·일정·급등락 등). 나머지(기관·섹터 등)는 종목 확인을 하지 않는다
  const STOCK_CHECK = ["surge", "plunge", "popular", "earnings", "ipo", "calendar", "news"];
  const SCREEN_TAIL = /(보여줘|보여|알려줘|알려|보기|궁금|어때|어디|뭐야|뭐있어|있어|언제|뭐가|좀|줘|요|는|은|이|가|를|을|도|\?)/g;
  async function matchScreen(text) {
    const raw = String(text || "").toLowerCase().replace(/[\s?!.,~]/g, "");
    if (!raw || raw.length > 28) return null;
    if (/(뜻|의미|란$|이란|설명|이유|원인|왜)/.test(raw)) return null; // 설명·이유를 묻는 말은 AI가
    let hit = null;
    SCREENS.forEach((sc) =>
      sc.words.forEach((w) => {
        if (raw.indexOf(w) >= 0 && (!hit || w.length > hit.len)) hit = { sc, w, len: w.length };
      })
    );
    if (!hit) return null;
    // 화면 이름과 말머리(투자처)·꼬리말을 뺀 나머지가 길면(복잡한 질문) 화면 연결이 아니라 AI에게
    const sp = splitMarket(raw.replace(hit.w, ""));
    if (sp.rest.replace(SCREEN_TAIL, "").replace(/(오늘|이번주|이번달|이번|요즘|지금|최근|주식|종목|일정)/g, "").length > 3) return null;
    if (STOCK_CHECK.indexOf(hit.sc.id) >= 0 && !(sp.market && !sp.rest.replace(SCREEN_TAIL, ""))) {
      try {
        if (await SCData.findInText(text)) return null; // 종목이 섞이면 종목 중심(AI·버튼)으로
      } catch (e) {
        /* 이름표를 못 읽어도 화면 연결은 가능 */
      }
    }
    const pre = splitMarket(raw).market || sp.market;
    return { sc: hit.sc, market: pre && hit.sc.markets && hit.sc.markets.indexOf(pre) >= 0 ? pre : null };
  }
  async function screenFlow(found) {
    token++;
    const t = token;
    clearIntro();
    const sc = found.sc;
    let market = found.market;
    if (sc.markets && !market) {
      if (sc.markets.length === 1) market = sc.markets[0];
      else {
        await bot("어느 투자처의 <b>" + esc(sc.label) + "</b>을(를) 볼까요?", t, 360);
        if (!alive(t)) return;
        const pick = await choose(sc.markets.map((k) => ({ id: k, icon: k, label: MARKET_NAME[k] + " " + sc.label, redo: () => fresh(() => screenFlow({ sc, market: k })) })), { cols: 2 });
        if (!alive(t)) return;
        market = pick.id;
      }
    }
    for (;;) {
      await announce("<b>" + esc((market ? MARKET_NAME[market] + " " : "") + sc.label) + "</b> 화면을 가져와요", t);
      if (!alive(t)) return;
      embed(sc.embed(market), async (sym) => {
        const name = await SCData.nameOf(sym, sym);
        user(name);
        stockMenu(sym, name, t, true);
      });
      const others = sc.markets && sc.markets.length > 1 ? sc.markets.filter((k) => k !== market) : [];
      await bot(sc.markets ? "종목을 누르면 자세히 볼 수 있어요." : "이어서 볼까요?", t, 500);
      const next = await choose(
        others.map((k) => ({ id: "m:" + k, icon: k, label: MARKET_NAME[k] + " " + sc.label, redo: () => fresh(() => screenFlow({ sc, market: k })) })).concat([{ id: "home", label: "처음으로", accent: true }]),
        { cols: 2, chips: true }
      );
      if (!alive(t)) return;
      if (next.id === "home") return home();
      market = next.id.slice(2);
    }
  }

  // ---------- 종목 + 뉴스/리스크/재무/차트 → 해당 화면 바로 ----------
  const STOCK_ACTIONS = [
    { sub: "news", label: PLAIN.news.what, words: ["뉴스", "악재", "호재", "소식", "이슈", "최근기사"] },
    { sub: "risk", label: PLAIN.risk.what, words: ["리스크", "위험신호", "위험", "안전한가", "상장폐지"] },
    { sub: "revenue", label: PLAIN.revenue.what, words: ["재무제표", "재무", "매출", "순이익", "영업이익", "적자", "흑자", "현금흐름"] },
    { sub: "summary", label: PLAIN.summary.what, words: ["차트", "시세", "현재가", "기본정보", "미래예측", "6개월후", "계절성"] },
    { sub: "sreport", label: PLAIN.sreport.what, words: ["핵심지표", "핵심정보"] },
  ];
  async function matchStockAction(text) {
    const raw = String(text || "").toLowerCase().replace(/[\s?!.,~]/g, "");
    if (!raw || raw.length > 36 || BUYSELL.test(raw)) return null;
    if (/(뜻|의미|설명|이유|원인|왜|비교|vs|랑|하고)/.test(raw)) return null;
    let act = null;
    STOCK_ACTIONS.forEach((a) =>
      a.words.forEach((w) => {
        if (raw.indexOf(w) >= 0 && (!act || w.length > act.len)) act = { a, len: w.length };
      })
    );
    if (!act) return null;
    let st = null;
    try {
      st = await SCData.findInText(text);
    } catch (e) {
      st = null;
    }
    return st ? { st, act: act.a } : null;
  }
  async function stockActionShow(f) {
    token++;
    const t = token;
    clearIntro();
    if (f.act.sub === "news") {
      await newsFlow(f.st.symbol, f.st.name, t);
      return offerForStock(f.st, null);
    }
    await announce(stockHead(f.st.symbol, f.st.name, f.act.label), t);
    if (!alive(t)) return;
    embed({ view: "detail", ticker: f.st.symbol, sub: f.act.sub });
    return offerForStock(f.st, null);
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
    marks.slice().forEach(removeMark);
    token++;
  }
  return { matchFullView, fullViewNow, matchScreen, screenFlow, matchStockAction, stockActionShow, start, reset, home, matchRanking, findMention, rankFromText, offerForStock, matchBuySell, buySellSummary, matchExplain, explainShow };
})();
