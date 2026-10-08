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
    if (!history.length) {
      const intro = document.createElement("div");
      intro.className = "intro";
      intro.innerHTML = "<h1>종목, 물어보면 바로 분석해요</h1><p>종목명을 말하면 시세·재무·10년 승률 데이터를<br>바탕으로 정리해드려요.</p><div class=\"chips\"></div>";
      const chips = intro.querySelector(".chips");
      SUGGESTIONS.forEach((q) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = q;
        b.addEventListener("click", () => send(q));
        chips.appendChild(b);
      });
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

  function setRemain(n) {
    remainEl.textContent = "오늘 남은 질문 " + n + "회";
  }
  function grow() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    inputEl.value = "";
    grow();
    requestAnimationFrame(grow);
    if (!history.length) listEl.innerHTML = "";
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
        const cards = Array.isArray(data.cards) ? data.cards : [];
        history.push({ role: "assistant", content: data.reply, cards });
        save();
        addCards(cards, pending);
        await reveal(pending, data.reply);
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

  load();
  renderAll();
})();
