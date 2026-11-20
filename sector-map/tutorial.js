// ---------- 튜토리얼 (2026-10-22 사용자 요청 · 2026-11-20 사용자 요청으로 필터 사용법만 남김) ----------
// 필터 하나만, 세 번 누르면 끝: ① 조건 버튼 → ② 동그라미를 밀면 조건에 맞는 종목만 남음(직접 움직여 보여 줌) → ③ ✕ 로 원래대로.
// 화면 아무 곳이나 누르면 다음으로 넘어가고, 끝나면 걸어 둔 조건은 시작 전 상태로 되돌린다.
// 처음 접속한 사람에게 1회 자동 실행, X(종료 확인) 가능, 보기 목록의 "튜토리얼"을 누르면 언제든 다시 볼 수 있다.
// app.js 다음에 불러온다(METRICS·openRangeSheet·setFilterRange 등을 그대로 사용).

const TUT_DONE_KEY = "map_tutorial_done_v1";
// find: 빨간 테두리를 두를 곳 · dir: 화살표가 어느 쪽에서 가리키는지 — up(아래에서 위로) / down(위에서 아래로)
// edge: 화살표를 세울 기준(없으면 테두리 자리) — 조건 창 안의 글자를 가리지 않게 창 바깥에 세울 때
// aim: 화살표의 가로 위치를 맞출 곳(없으면 테두리 가운데) · clear: 화면을 어둡게 덮지 않음(종목이 걸러지는 모습이 보여야 하는 장)
const TUT_STEPS = [
  { find: () => tutChip, dir: "up", text: "조건 버튼을 눌러요" },
  { find: () => document.getElementById("rangeSlider"), edge: () => document.getElementById("rangeSheet"), dir: "down", clear: true, text: "동그라미를 밀면 조건에 맞는 종목만 남아요", enter: tutDemoSlide, wait: 340 },
  { find: () => tutChip, aim: () => tutChip && tutChip.querySelector(".chip-reset"), dir: "up", clear: true, text: "✕ 를 누르면 원래대로 돌아가요", enter: tutDemoResult, wait: 60 },
];

let tutIdx = -1;
let tutRoot = null;
let tutChip = null; // 시연에 쓰는 조건 버튼(지금 화면에서 값이 있는 첫 버튼)
let tutPrevRange = null; // 시작 전에 그 조건에 걸려 있던 범위(없으면 null) — 끝날 때 되돌림
let tutDemoTimer = null;
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

// 지금 화면에서 시연할 수 있는 첫 조건 버튼 — 보이고, 값이 준비돼 있고, 종목마다 값이 달라야 한다
function tutMetricValues(key) {
  const m = METRICS[key];
  if (!m || !m.hasData || (m.needsLive && !liveDataLoaded)) return [];
  return ACTIVE_DATA.companies.map(m.get).filter((v) => typeof v === "number" && Number.isFinite(v));
}
function tutPickChip() {
  const bar = document.querySelector(".filter-bar");
  if (!bar || !tutVisible(bar)) return null;
  bar.scrollLeft = 0;
  for (const b of bar.querySelectorAll(".metric-chip")) {
    const r = tutVisible(b);
    if (!r || r.left < 0 || r.right > window.innerWidth) continue;
    if (tutMetricValues(b.dataset.metric).length >= 4 && tutDemoRange(b.dataset.metric)) return b;
  }
  return null;
}
// 시연 범위 — 가운데 값(중앙값) 이상만 남겨 절반쯤 걸러지게. 중앙값이 눈금 끝이면 눈금 한가운데로
function tutDemoRange(key) {
  const [d0, d1] = getMetricDomain(key);
  const vals = tutMetricValues(key).sort((a, b) => a - b);
  let cut = vals[Math.floor(vals.length / 2)];
  const edge = (d1 - d0) * 0.05;
  if (!(cut > d0 + edge && cut < d1 - edge)) cut = d0 + (d1 - d0) / 2;
  return cut > d0 && cut < d1 ? [cut, d1] : null;
}
function tutSetRange(range) {
  setFilterRange(tutChip.dataset.metric, range);
  quickSliderCtrl.refresh();
}

// ② 조건 창을 열고 왼쪽 동그라미가 스스로 밀려 가는 모습을 보여 줌
function tutDemoSlide() {
  const key = tutChip.dataset.metric;
  const [d0, d1] = getMetricDomain(key);
  const goal = tutDemoRange(key);
  tutSetRange([d0, d1]);
  openRangeSheet(key);
  clearInterval(tutDemoTimer);
  const t0 = Date.now() + 450; // 창이 다 올라온 뒤부터
  tutDemoTimer = setInterval(() => {
    const t = Math.max(0, Math.min(1, (Date.now() - t0) / 1100));
    const e = 1 - Math.pow(1 - t, 3);
    tutSetRange([d0 + (goal[0] - d0) * e, d1]);
    if (t >= 1) clearInterval(tutDemoTimer);
  }, 30);
}
// ③ 조건 창을 닫고 걸러진 지도와 버튼의 ✕ 를 보여 줌
function tutDemoResult() {
  clearInterval(tutDemoTimer);
  tutSetRange(tutDemoRange(tutChip.dataset.metric));
  closeRangeSheet();
}
// 끝날 때: 시연으로 건 조건을 시작 전 상태로
function tutDemoRestore() {
  clearInterval(tutDemoTimer);
  if (!tutChip) return;
  const key = tutChip.dataset.metric;
  try {
    tutSetRange(tutPrevRange || getMetricDomain(key));
    panelControllers.forEach((ctrl) => ctrl.refresh());
    closeRangeSheet();
  } catch {}
  tutChip = null;
  tutPrevRange = null;
}

function tutStart() {
  if (tutRoot) return true;
  // 열려 있는 창은 닫고 시작
  tutMenu(false);
  if (window.__rtPageOpen && window.__rtPageOpen()) window.__rtPageClose();
  const cs = document.getElementById("companySheet");
  if (cs && cs.classList.contains("open")) cs.classList.remove("open");
  closeRangeSheet();
  tutChip = tutPickChip();
  if (!tutChip) return false; // 조건 버튼이 없는 화면(내 보기 편집 중 등)
  try {
    localStorage.setItem(TUT_DONE_KEY, "1");
  } catch {}
  const key = tutChip.dataset.metric;
  tutPrevRange = activeFilters.has(key) ? [...activeFilters.get(key)] : null;
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
  return true;
}

function tutEnd() {
  if (!tutRoot) return;
  tutRoot.remove();
  tutRoot = null;
  tutIdx = -1;
  window.removeEventListener("resize", tutLayoutSoon);
  tutDemoRestore();
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
  if (i >= TUT_STEPS.length) return tutEnd();
  tutIdx = i;
  const step = TUT_STEPS[i];
  if (step.enter) step.enter();
  tutRoot.classList.toggle("tut-clear", !!step.clear);
  tutRoot.querySelector(".tut-step").textContent = `${i + 1} / ${TUT_STEPS.length}`;
  tutRoot.querySelector(".tut-text").textContent = step.text;
  tutRoot.querySelector(".tut-next").textContent = i === TUT_STEPS.length - 1 ? "화면을 누르면 끝내요" : "화면을 누르면 다음 ▶";
  tutLayoutSoon(step.wait || 30);
}
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
  const r = tutVisible(step.find());
  bubble.style.left = bubble.style.top = "";
  if (!r) {
    // 대상을 못 찾으면 한가운데 말풍선만
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
  const dir = step.dir;
  const er = (step.edge && tutVisible(step.edge())) || r; // 화살표를 세울 기준
  const mr = (step.aim && tutVisible(step.aim())) || r; // 화살표 가로 위치
  const cx = mr.left + mr.width / 2;
  let ax = cx - AW / 2;
  let ay, rot;
  if (dir === "down") {
    ay = er.top - (er === r ? pad + gap : 14) - AH;
    rot = 0;
  } else {
    ay = er.bottom + (er === r ? pad + gap : 14);
    rot = 180;
  }
  ax = Math.max(4, Math.min(vw - AW - 4, ax));
  arrow.style.left = `${ax}px`;
  arrow.style.top = `${ay}px`;
  arrow.style.setProperty("--rot", `${rot}deg`);
  // 말풍선 — 화살표 바깥쪽(위쪽 대상이면 화살표 아래, 아래쪽 대상이면 화살표 위)에 한 줄
  const bw = Math.min(320, vw - 24);
  bubble.style.width = `${bw}px`;
  const bh = bubble.offsetHeight;
  let by = dir === "down" ? ay - 12 - bh : ay + AH + 12;
  by = Math.max(10, Math.min(vh - bh - 10, by));
  const bx = Math.max(12, Math.min(vw - bw - 12, cx - bw / 2));
  bubble.style.left = `${bx}px`;
  bubble.style.top = `${by}px`;
}

// 보기 목록의 "튜토리얼" — 조건 버튼이 없는 화면(내 보기 편집 중 등)에서는 시작하지 않고 알려 줌
window.startTutorial = () => {
  if (!tutStart() && typeof showToast === "function") showToast("조건 버튼이 보이는 화면에서 다시 눌러 주세요");
};

// 처음 접속한 사람에게 1회 자동 실행 — 지도가 다 뜨고 조건 버튼에 값이 준비된 뒤에
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
    if (!busy && tries > 3 && tutPickChip()) {
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
