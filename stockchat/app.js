// 스톡챗 — 채팅 전용 화면. 답변은 마켓맵 Worker(/ai-chat)가 시세·재무·승률 도구로 만든다.
(function () {
  const API = "https://us-stock.yeop2ad.workers.dev/ai-chat";
  const STORE_KEY = "stockchat_history_v1";
  const MAX_KEEP = 20;
  const SUGGESTIONS = ["삼성전자 어때?", "엔비디아 재무 요약해줘", "SK하이닉스 지금 과열이야?", "애플이랑 마이크로소프트 비교"];

  const listEl = document.getElementById("list");
  const formEl = document.getElementById("form");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const remainEl = document.getElementById("remain");

  let history = [];
  let busy = false;

  // ---------- 하루 AI 사용량(토큰) 게이지 ----------
  // 앞으로 토큰 방식으로 가는 것을 미리 보여주는 화면 효과다. 지금은 테스트 중이라 실제로 막지는 않고,
  // AI를 많이 쓰는 기능(뉴스 요약 등)일수록 게이지가 빨리 차서 한도에 가까워지는 모습만 보여준다.
  const USAGE_KEY = "stockchat_usage_v1";
  const TEST_DAILY_TOKENS = 20000;
  const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const fmtTok = (n) => Math.round(n).toLocaleString("ko-KR");
  const tokensOf = (u) => Math.round((u.input || 0) + (u.output || 0) + (u.cacheWrite || 0) + (u.cacheRead || 0) * 0.1);
  function loadUsage() {
    try {
      const v = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
      if (v && v.day === kstDay()) return v;
    } catch (e) {
      /* 저장소를 못 읽어도 화면은 동작 */
    }
    return { day: kstDay(), used: 0, warned: false };
  }
  const usage = loadUsage();
  function renderUsage() {
    const box = document.getElementById("usage");
    if (!box) return;
    const pct = Math.min(100, (usage.used / TEST_DAILY_TOKENS) * 100);
    box.querySelector(".u-bar i").style.width = pct + "%";
    box.querySelector(".u-num").textContent = fmtTok(usage.used) + " / " + fmtTok(TEST_DAILY_TOKENS) + " 토큰";
    box.classList.toggle("show", pct >= 80); // 80% 이상일 때만 게이지와 멘트를 보여준다
    box.classList.toggle("warn", pct >= 80 && pct < 100);
    box.classList.toggle("full", pct >= 100);
    box.querySelector(".u-label").textContent = pct >= 100 ? "오늘 한도에 도달했어요" : "오늘 한도에 가까워요";
  }
  window.SCUsage = {
    add(tokens, label) {
      tokens = Math.round(tokens || 0);
      if (tokens <= 0) return;
      usage.used += tokens;
      try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
      } catch (e) {
        /* 저장 실패해도 계속 */
      }
      renderUsage();
      const box = document.getElementById("usage");
      if (box) {
        const pop = document.createElement("span");
        pop.className = "u-pop";
        pop.textContent = "+" + fmtTok(tokens) + (label ? " · " + label : "");
        box.appendChild(pop);
        setTimeout(() => pop.remove(), 1800);
      }
      if (usage.used >= TEST_DAILY_TOKENS && !usage.warned) {
        usage.warned = true;
        try {
          localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
        } catch (e) {
          /* ignore */
        }
        bubble("assistant", "<b>오늘 AI 사용 한도에 도달했어요</b><br>정식 서비스에서는 여기서 내일까지 AI 답변·뉴스 요약이 잠깁니다. 지금은 테스트 중이라 제한 없이 계속 쓸 수 있어요. 마켓맵 화면(순위·차트 등)은 AI를 쓰지 않아 한도와 상관없이 볼 수 있어요.");
      }
    },
  };

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      if (Array.isArray(v)) history = v.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_KEEP);
      // 저장 용량 보호: 최근 4개 답변의 카드만 유지
      history.filter((m) => m.cards && m.cards.length).slice(0, -4).forEach((m) => delete m.cards);
    } catch (e) {
      history = [];
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-MAX_KEEP)));
    } catch (e) {
      /* 저장 실패해도 대화는 계속 가능 */
    }
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function inline(s) {
    return esc(s).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  }
  // 최소 마크다운: 문단, "- " 목록, **굵게** (항상 이스케이프 후 가공)
  function render(text) {
    const out = [];
    let inList = false;
    text.split("\n").forEach((line) => {
      const m = line.match(/^\s*[-•*]\s+(.*)$/);
      if (m) {
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push("<li>" + inline(m[1]) + "</li>");
      } else {
        if (inList) {
          out.push("</ul>");
          inList = false;
        }
        if (line.trim()) out.push("<p>" + inline(line) + "</p>");
      }
    });
    if (inList) out.push("</ul>");
    return out.join("");
  }

  function bubble(role, html, cls) {
    const div = document.createElement("div");
    div.className = "msg msg-" + role + (cls ? " " + cls : "");
    div.innerHTML = html;
    listEl.appendChild(div);
    listEl.scrollTop = listEl.scrollHeight;
    return div;
  }

  function renderAll() {
    listEl.innerHTML = "";
    if (window.SCFlow) window.SCFlow.reset();
    if (!history.length) {
      const intro = document.createElement("div");
      intro.className = "intro";
      intro.innerHTML =
        '<h1>종목, 이제 쉽게 찾고 분석해요</h1><p>버튼으로 고르면 마켓맵 자료를 바로 보여드려요.<br>궁금한 건 아래에 직접 물어보면 AI가 답해요.</p>' +
        '<div class="home-tiles">' +
        '<button type="button" class="home-tile" data-flow="search"><span class="ht-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.3" y2="15.3"/></svg></span><b>간편검색</b><small>내투자를 찾고있어요</small></button>' +
        '<button type="button" class="home-tile alt" data-flow="analyze"><span class="ht-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/></svg></span><b>투자분석</b><small>내투자를 분석해주세요</small></button>' +
        "</div>";
      intro.querySelectorAll(".home-tile").forEach((b) => b.addEventListener("click", () => window.SCFlow && window.SCFlow.start(b.dataset.flow)));
      listEl.appendChild(intro);
    }
    history.forEach((m) => {
      if (m.role === "assistant" && m.cards && m.cards.length) addCards(m.cards);
      bubble(m.role, m.role === "user" ? esc(m.content) : render(m.content));
    });
  }

  // 차트 카드 묶음(말풍선 위에 표시) — pendingEl이 있으면 그 앞에 끼워 넣음
  function addCards(cards, beforeEl) {
    if (!window.StockCards) return;
    const html = window.StockCards.render(cards);
    if (!html) return;
    const wrap = document.createElement("div");
    wrap.className = "cards";
    wrap.innerHTML = html;
    if (beforeEl) listEl.insertBefore(wrap, beforeEl);
    else listEl.appendChild(wrap);
    listEl.scrollTop = listEl.scrollHeight;
  }

  // 답변이 글자 단위로 나타나는 효과(서버 응답은 한 번에 오지만 읽기 편하게)
  function reveal(el, text) {
    return new Promise((resolve) => {
      let i = 0;
      const step = Math.max(2, Math.ceil(text.length / 90));
      const timer = setInterval(() => {
        i = Math.min(text.length, i + step);
        el.innerHTML = render(text.slice(0, i));
        listEl.scrollTop = listEl.scrollHeight;
        if (i >= text.length) {
          clearInterval(timer);
          resolve();
        }
      }, 16);
    });
  }

  function setRemain() {
    remainEl.textContent = ""; // 질문 횟수 대신 토큰 게이지(#usage)를 쓴다
  }
  function grow() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    // "승률이 뭐야" 같은 뜻 질문(종목 없음): AI 대신 마켓맵의 "승률이란?" 내용을 그대로 보여줌
    const ex = window.SCFlow ? await window.SCFlow.matchExplain(text) : null;
    if (ex) {
      inputEl.value = "";
      grow();
      const introEl2 = listEl.querySelector(".intro");
      if (introEl2) introEl2.remove();
      bubble("user", esc(text));
      window.SCFlow.explainShow();
      return;
    }
    // "삼성전자 지금 사야해?"처럼 종목이 들어 있는 매수·매도 질문: AI 글 대신 마켓맵 [요약]을 그대로 보여줌
    const bs = window.SCFlow ? await window.SCFlow.matchBuySell(text) : null;
    if (bs) {
      inputEl.value = "";
      grow();
      const introEl1 = listEl.querySelector(".intro");
      if (introEl1) introEl1.remove();
      bubble("user", esc(text));
      window.SCFlow.buySellSummary(bs);
      return;
    }
    // 순위 화면 뒤에 "전체보기"라고 친 경우: 그 순위 화면의 나머지 종목 검색을 실행
    if (window.SCFlow && window.SCFlow.matchFullView(text)) {
      inputEl.value = "";
      grow();
      bubble("user", esc(text));
      window.SCFlow.fullViewNow();
      return;
    }
    // "삼성전자 뉴스/리스크/재무제표/차트"처럼 종목 + 하위 항목: AI 없이 해당 마켓맵 화면 바로
    const sa = window.SCFlow ? await window.SCFlow.matchStockAction(text) : null;
    if (sa) {
      inputEl.value = "";
      grow();
      const introEl3 = listEl.querySelector(".intro");
      if (introEl3) introEl3.remove();
      bubble("user", esc(text));
      window.SCFlow.stockActionShow(sa);
      return;
    }
    // "급등주/실적 일정/캘린더/뉴스…"처럼 마켓맵 화면 이름을 친 경우: AI 없이 그 화면(투자처 고르기 포함)
    const sc = window.SCFlow ? await window.SCFlow.matchScreen(text) : null;
    if (sc) {
      inputEl.value = "";
      grow();
      const introEl4 = listEl.querySelector(".intro");
      if (introEl4) introEl4.remove();
      bubble("user", esc(text));
      window.SCFlow.screenFlow(sc);
      return;
    }
    // "상승률"처럼 순위 항목 이름만 친 경우: AI 대신 투자처별 순위 버튼 4개(마켓맵 순위 화면으로 연결)
    const rk = window.SCFlow && window.SCFlow.matchRanking(text);
    if (rk) {
      inputEl.value = "";
      grow();
      const introEl0 = listEl.querySelector(".intro");
      if (introEl0) introEl0.remove();
      bubble("user", esc(text));
      window.SCFlow.rankFromText(rk);
      return;
    }
    busy = true;
    sendBtn.disabled = true;
    inputEl.value = "";
    grow();
    requestAnimationFrame(grow);
    const introEl = listEl.querySelector(".intro");
    if (introEl) introEl.remove();
    history.push({ role: "user", content: text });
    bubble("user", esc(text));
    const pending = bubble("assistant", '<span class="dots"><span></span><span></span><span></span></span>', "msg-pending");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8).map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json().catch(() => ({}));
      pending.classList.remove("msg-pending");
      if (typeof data.remaining === "number") setRemain(data.remaining);
      if (!res.ok || !data.reply) {
        history.pop();
        pending.classList.add("msg-error");
        pending.textContent = data.error || "답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.";
      } else {
        if (data.usage) window.SCUsage.add(tokensOf(data.usage), "AI 답변");
        data.reply = String(data.reply).replace(/^\[요약\]\s*\n+/, "[요약] "); // [요약]만 한 줄 차지하지 않게
        const cards = Array.isArray(data.cards) ? data.cards : [];
        history.push({ role: "assistant", content: data.reply, cards });
        save();
        addCards(cards, pending);
        await reveal(pending, data.reply);
        // 질문에 순위 항목 이름(예: 상승률)이 들어 있으면 답변 뒤에 투자처별 순위 버튼을 이어서 보여줌
        const mention = window.SCFlow && window.SCFlow.findMention(text);
        // 종목 1개를 조회한 답변이면 [종목 핵심지표][종목 리스크](+질문 속 항목이 있으면 [투자처 항목 순위]) 버튼
        if (cards.length === 1) window.SCFlow.offerForStock({ symbol: cards[0].symbol, name: cards[0].name }, mention || null);
        else if (mention) window.SCFlow.rankFromText(mention, { followUp: true });
      }
    } catch (e) {
      history.pop();
      pending.classList.remove("msg-pending");
      pending.classList.add("msg-error");
      pending.textContent = "네트워크 오류가 발생했습니다. 연결을 확인해주세요.";
    }
    busy = false;
    sendBtn.disabled = false;
    listEl.scrollTop = listEl.scrollHeight;
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    send(inputEl.value);
  });
  inputEl.addEventListener("input", grow);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(inputEl.value);
    }
  });
  document.getElementById("newChatBtn").addEventListener("click", () => {
    if (busy) return;
    history = [];
    save();
    renderAll();
  });

  // 하단 안내문 "자세히" 펼치기/접기
  const noticeMore = document.getElementById("noticeMore");
  if (noticeMore) {
    noticeMore.addEventListener("click", () => {
      const full = document.getElementById("noticeFull");
      const open = full.hidden;
      full.hidden = !open;
      noticeMore.setAttribute("aria-expanded", String(open));
      noticeMore.textContent = open ? "접기" : "자세히";
    });
  }

  load();
  renderAll();
  renderUsage();
})();
