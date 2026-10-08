// AI 분석 채팅 화면(MVP, 2026-10-09) — 더보기 > "AI 분석 채팅"에서 열림.
// 답변은 Worker POST /ai-chat(Claude + 시세·재무 도구)이 만들고, 여기서는 말풍선 화면과 최근 대화 보관만 담당한다.
(function () {
  const API = "https://us-stock.yeop2ad.workers.dev/ai-chat";
  const STORE_KEY = "mm_ai_chat_v1";
  const MAX_KEEP = 20;
  const SUGGESTIONS = ["삼성전자 어때?", "엔비디아 재무 요약해줘", "SK하이닉스 지금 과열이야?", "애플이랑 마이크로소프트 비교"];

  const overlay = document.getElementById("aiChatOverlay");
  if (!overlay) return;
  const listEl = document.getElementById("aiChatList");
  const formEl = document.getElementById("aiChatForm");
  const inputEl = document.getElementById("aiChatInput");
  const sendBtn = document.getElementById("aiChatSend");
  const remainEl = document.getElementById("aiChatRemain");

  let history = [];
  let busy = false;

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      if (Array.isArray(v)) history = v.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_KEEP);
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

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  // **굵게**와 줄바꿈만 지원하는 최소 렌더링(응답은 항상 이스케이프 후 가공)
  function renderText(s) {
    return escapeHtml(s).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }

  function addBubble(role, text, extraClass) {
    const div = document.createElement("div");
    div.className = "ai-msg ai-msg-" + role + (extraClass ? " " + extraClass : "");
    div.innerHTML = renderText(text);
    listEl.appendChild(div);
    listEl.scrollTop = listEl.scrollHeight;
    return div;
  }

  function renderAll() {
    listEl.innerHTML = "";
    if (!history.length) {
      const intro = document.createElement("div");
      intro.className = "ai-intro";
      intro.innerHTML =
        '<div class="ai-intro-title">무엇이든 물어보세요</div><div class="ai-intro-sub">종목명을 말하면 시세·재무·승률 데이터를 바탕으로 정리해드려요.</div><div class="ai-chips"></div>';
      const chips = intro.querySelector(".ai-chips");
      SUGGESTIONS.forEach((q) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ai-chip";
        b.textContent = q;
        b.addEventListener("click", () => send(q));
        chips.appendChild(b);
      });
      listEl.appendChild(intro);
    }
    history.forEach((m) => addBubble(m.role, m.content));
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    inputEl.value = "";
    autoGrow();
    if (!history.length) listEl.innerHTML = "";
    history.push({ role: "user", content: text });
    addBubble("user", text);
    const pending = addBubble("assistant", "분석 중…", "ai-msg-pending");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8) }),
      });
      const data = await res.json().catch(() => ({}));
      pending.classList.remove("ai-msg-pending");
      if (!res.ok || !data.reply) {
        history.pop();
        pending.classList.add("ai-msg-error");
        pending.innerHTML = renderText(data.error || "답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        if (typeof data.remaining === "number") setRemain(data.remaining);
      } else {
        history.push({ role: "assistant", content: data.reply });
        pending.innerHTML = renderText(data.reply);
        if (typeof data.remaining === "number") setRemain(data.remaining);
        save();
      }
    } catch (e) {
      history.pop();
      pending.classList.remove("ai-msg-pending");
      pending.classList.add("ai-msg-error");
      pending.textContent = "네트워크 오류가 발생했습니다. 연결을 확인해주세요.";
    }
    busy = false;
    sendBtn.disabled = false;
    listEl.scrollTop = listEl.scrollHeight;
  }

  function setRemain(n) {
    remainEl.textContent = "오늘 남은 질문 " + n + "회";
  }

  function autoGrow() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + "px";
  }

  function open() {
    load();
    renderAll();
    overlay.style.display = "flex";
    document.body.classList.add("ai-chat-open");
    listEl.scrollTop = listEl.scrollHeight;
  }
  function close() {
    overlay.style.display = "none";
    document.body.classList.remove("ai-chat-open");
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    send(inputEl.value);
  });
  inputEl.addEventListener("input", autoGrow);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(inputEl.value);
    }
  });
  document.getElementById("aiChatCloseBtn").addEventListener("click", close);
  document.getElementById("aiChatClearBtn").addEventListener("click", () => {
    if (busy) return;
    history = [];
    save();
    renderAll();
  });
  const openBtn = document.getElementById("morePanelAiBtn");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (typeof closeMorePanel === "function") closeMorePanel();
      open();
    });
  }
  window.openAiChat = open;
})();
