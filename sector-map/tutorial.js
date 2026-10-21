// ---------- 튜토리얼 (2026-10-22 사용자 요청) ----------
// 게임처럼 아주 간단하게: 어두운 화면에서 눌러야 할 곳을 밝게 비추고, 빨간 화살표가 통통 움직이며 한 줄로 설명 → 화면을 누르면 다음.
// 처음 접속한 사람에게 1회 자동 실행, X(종료 확인) 가능, 시장 목록의 "튜토리얼"을 누르면 언제든 다시 볼 수 있다.
// app.js 다음에 불러온다(MAP_VIEWS·mapViewSelect 등을 그대로 사용).

const TUT_DONE_KEY = "map_tutorial_done_v1";
// dir: 화살표가 대상의 어느 쪽에서 가리키는지 — up(대상 아래에서 위로) / down(대상 위에서 아래로) / right(대상 왼쪽에서 오른쪽으로)
// 1 시장추가 · 2 상단 필터 · 3 오른쪽 보기방법 · 4 실시간 랭킹
const TUT_STEPS = [
  { target: "#mapViewBtn", dir: "up", text: "여기를 눌러 보고 싶은 시장을 바꿔요", group: "시장추가" },
  { target: ".map-view-foot", dir: "up", text: "＋ 로 시장을 더하고, 편집으로 순서·삭제를 해요", group: "시장추가", enter: () => tutMenu(true), leave: () => tutMenu(false) },
  { target: ".filter-bar", dir: "up", text: "상단 버튼을 누르면 조건에 맞는 종목만 골라 볼 수 있어요", group: "상단 필터" },
  { target: "#allFiltersBtn", dir: "up", text: "여기서 모든 버튼을 보고, 편집으로 순서를 바꿔요", group: "상단 필터" },
  { target: "#sizeModeBtn", dir: "right", text: "균등: 원 크기를 같게 / 시총: 시가총액만큼 크게", group: "오른쪽 보기" },
  { target: "#volModeBtn", dir: "right", text: "대금: 거래대금이 터진 종목을 색으로 보여줘요", group: "오른쪽 보기" },
  { target: "#changeModeBtn", dir: "right", text: "등락: 오늘 오른 곳은 빨강, 내린 곳은 파랑", group: "오른쪽 보기" },
  { target: "#watchFilterBtn", dir: "right", text: "관심: 내가 찜한 종목만 모아서 봐요", group: "오른쪽 보기" },
  { target: "#rtTicker", dir: "down", text: "실시간 인기 종목이 돌아가요. 누르면 거래량·상승·하락 랭킹!", group: "실시간 랭킹" },
  { target: null, text: "끝! 튜토리얼은 시장 목록에서 언제든 다시 볼 수 있어요", group: "완료" },
];

let tutIdx = -1;
let tutRoot = null;
const tutVisible = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden" ? r : null;
};
function tutMenu(open) {
  const sel = document.getElementById("mapViewSelect");
  if (!sel) return;
  sel.classList.toggle("open", !!open);
}

function tutStart() {
  if (tutRoot) return;
  try {
    localStorage.setItem(TUT_DONE_KEY, "1");
  } catch {}
  // 열려 있는 창·편집 모드는 닫고 시작
  tutMenu(false);
  if (window.__rtPageOpen && window.__rtPageOpen()) window.__rtPageClose();
  const cs = document.getElementById("companySheet");
  if (cs && cs.classList.contains("open")) cs.classList.remove("open");
  tutRoot = document.createElement("div");
  tutRoot.className = "tut-root";
  tutRoot.innerHTML =
    `<div class="tut-hole"></div>` +
    `<div class="tut-arrow"><svg viewBox="0 0 48 56" width="44" height="52" aria-hidden="true"><path d="M24 54 L4 28 H16 V2 H32 V28 H44 Z" fill="#ff2d2d" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg></div>` +
    `<div class="tut-bubble"><span class="tut-step"></span><b class="tut-text"></b><span class="tut-next">화면을 누르면 다음 ▶</span></div>` +
    `<button type="button" class="tut-x" aria-label="튜토리얼 종료">✕</button>`;
  document.body.appendChild(tutRoot);
  tutRoot.addEventListener("click", (e) => {
    e.stopPropagation(); // 지도 쪽 "밖을 누르면 메뉴 닫기" 같은 동작이 같이 실행되지 않게
    if (e.target.closest(".tut-x")) return tutAskClose();
    if (e.target.closest(".tut-confirm")) return;
    tutGo(tutIdx + 1);
  });
  window.addEventListener("resize", tutLayoutSoon);
  tutIdx = -1;
  tutGo(0);
}

function tutEnd() {
  if (!tutRoot) return;
  const cur = TUT_STEPS[tutIdx];
  if (cur && cur.leave) cur.leave();
  tutRoot.remove();
  tutRoot = null;
  tutIdx = -1;
  window.removeEventListener("resize", tutLayoutSoon);
}

function tutAskClose() {
  if (!tutRoot || tutRoot.querySelector(".tut-confirm")) return;
  const box = document.createElement("div");
  box.className = "tut-confirm";
  box.innerHTML = `<div class="tut-confirm-box"><b>튜토리얼을 종료하시겠습니까?</b><div class="tut-confirm-btns"><button type="button" data-no>계속하기</button><button type="button" data-ok class="primary">종료</button></div></div>`;
  tutRoot.appendChild(box);
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.closest("[data-ok]")) tutEnd();
    else if (e.target.closest("[data-no]") || e.target === box) box.remove();
  });
}

function tutGo(i) {
  if (!tutRoot) return;
  const prev = TUT_STEPS[tutIdx];
  if (prev && prev.leave) prev.leave();
  // 지금 화면에 없는 대상(예: 보기에 따라 숨겨진 버튼)은 건너뜀
  while (i < TUT_STEPS.length && TUT_STEPS[i].target && !tutVisible(tutFind(TUT_STEPS[i]))) {
    if (TUT_STEPS[i].enter) {
      TUT_STEPS[i].enter(); // 메뉴처럼 먼저 열어야 보이는 대상
      break;
    }
    i++;
  }
  if (i >= TUT_STEPS.length) return tutEnd();
  tutIdx = i;
  const step = TUT_STEPS[i];
  if (step.enter) step.enter();
  tutRoot.querySelector(".tut-step").textContent = `${i + 1} / ${TUT_STEPS.length} · ${step.group}`;
  tutRoot.querySelector(".tut-text").textContent = step.text;
  tutRoot.querySelector(".tut-next").textContent = i === TUT_STEPS.length - 1 ? "화면을 누르면 끝내요" : "화면을 누르면 다음 ▶";
  tutLayoutSoon(step.enter ? 280 : 30);
}
const tutFind = (step) => document.querySelector(step.target);
let tutLayoutTimer = null;
function tutLayoutSoon(ms) {
  clearTimeout(tutLayoutTimer);
  tutLayoutTimer = setTimeout(tutLayout, typeof ms === "number" ? ms : 60);
}

function tutLayout() {
  if (!tutRoot) return;
  const step = TUT_STEPS[tutIdx];
  if (!step) return;
  const hole = tutRoot.querySelector(".tut-hole");
  const arrow = tutRoot.querySelector(".tut-arrow");
  const bubble = tutRoot.querySelector(".tut-bubble");
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = step.target ? tutVisible(tutFind(step)) : null;
  bubble.style.left = bubble.style.top = "";
  if (!r) {
    // 대상이 없는 마지막 장 — 한가운데 말풍선만
    hole.style.cssText = "left:50%;top:50%;width:0;height:0;";
    arrow.style.display = "none";
    bubble.style.left = `${Math.max(12, (vw - bubble.offsetWidth) / 2)}px`;
    bubble.style.top = `${Math.max(12, (vh - bubble.offsetHeight) / 2)}px`;
    return;
  }
  const pad = 6;
  hole.style.left = `${r.left - pad}px`;
  hole.style.top = `${r.top - pad}px`;
  hole.style.width = `${r.width + pad * 2}px`;
  hole.style.height = `${r.height + pad * 2}px`;
  hole.style.borderRadius = r.height > 60 ? "18px" : "999px";
  arrow.style.display = "";
  const AW = 44;
  const AH = 52;
  const gap = 10;
  let dir = step.dir;
  if (dir === "down" && r.top - pad - gap - AH - 12 - 100 < 10) dir = "up"; // 위쪽 공간이 모자라면 아래에서 가리킴
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let ax, ay, rot;
  if (dir === "down") {
    ax = cx - AW / 2;
    ay = r.top - pad - gap - AH;
    rot = 0;
  } else if (dir === "right") {
    // 대상 왼쪽에서 오른쪽을 가리킴(오른쪽 위쪽 버튼들)
    ax = r.left - pad - gap - AH / 2 - AW / 2;
    ay = cy - AH / 2;
    rot = -90;
  } else {
    ax = cx - AW / 2;
    ay = r.bottom + pad + gap;
    rot = 180;
  }
  ax = Math.max(4, Math.min(vw - AW - 4, ax));
  arrow.style.left = `${ax}px`;
  arrow.style.top = `${ay}px`;
  arrow.style.setProperty("--rot", `${rot}deg`);
  // 말풍선 — 화살표 반대편(화면 위쪽 대상이면 아래, 아래쪽 대상이면 위)에 한 줄
  const bw = Math.min(320, vw - 24);
  bubble.style.width = `${bw}px`;
  const bh = bubble.offsetHeight;
  let by;
  if (dir === "down") by = ay - 12 - bh;
  else if (dir === "up") by = ay + AH + 12;
  else by = cy < vh / 2 ? r.bottom + pad + 14 : r.top - pad - 14 - bh;
  by = Math.max(10, Math.min(vh - bh - 10, by));
  let bx = dir === "right" ? vw - bw - 12 : cx - bw / 2;
  bx = Math.max(12, Math.min(vw - bw - 12, bx));
  bubble.style.left = `${bx}px`;
  bubble.style.top = `${by}px`;
}

// 시장 목록의 "튜토리얼"
window.startTutorial = tutStart;

// 처음 접속한 사람에게 1회 자동 실행 — 지도가 다 뜬 뒤에
(function tutAuto() {
  let seen = false;
  try {
    seen = !!localStorage.getItem(TUT_DONE_KEY);
  } catch {}
  if (seen) return;
  if (/[?&]notut=1/.test(location.search)) return;
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const loading = document.getElementById("loadingIndicator");
    const splash = document.querySelector(".loading-splash");
    const busy = (loading && !loading.classList.contains("hidden") && getComputedStyle(loading).opacity !== "0") || (splash && getComputedStyle(splash).display !== "none" && splash.offsetHeight > 0 && getComputedStyle(splash).opacity !== "0");
    if (!busy && tries > 3) {
      clearInterval(timer);
      setTimeout(() => {
        // 그 사이 다른 창(상세시트·랭킹 등)이 열렸으면 건드리지 않음
        if (!tutRoot) tutStart();
      }, 900);
    } else if (tries > 60) {
      clearInterval(timer);
    }
  }, 400);
})();
