// ---------- 내 시장 만들기 (2026-10-20 사용자 요청) ----------
// 나만의 시장 = 섹터 원(이름·색·위치) + 종목 목록. 이 기기(localStorage)에만 저장된다.
// app.js보다 먼저 불러온다 — 여기서는 함수·상태만 정의하고, app.js가 init 때 initMyMarkets()를 부른다.
// 지도 엔진(app.js)은 원형 모드로 그리므로, 내 시장도 같은 렌더러 모양(섹터 원 + 종목 원 + 이름표)을 따르되
// 섹터 위치·크기는 저장된 값을 쓴다. app.js 쪽 연결 지점은 isMineView()/buildMineRoot()/renderMapMine() 호출 몇 군데뿐.

const MY_MARKETS_KEY = "map_custom_markets_v1";
const MINE_COLORS = ["#7230f0", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#64748b", "#111827"];
const MINE_WORLD = 2000; // app.js WORLD_SIZE 와 같은 값
let MY_MARKETS = [];
let mineEditing = false;
let mineDraft = null; // 편집 중인 시장(복사본) — 완료를 눌러야 저장
let mineSelectedSectorId = null;

const mineClone = (o) => JSON.parse(JSON.stringify(o));
const mineEsc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mineUid = () => Math.random().toString(36).slice(2, 9);
const mineViewKey = (id) => "my_" + id;
const mineIdOf = (viewKey) => (viewKey && String(viewKey).startsWith("my_") ? String(viewKey).slice(3) : null);

function mineLoad() {
  try {
    const a = JSON.parse(localStorage.getItem(MY_MARKETS_KEY));
    MY_MARKETS = Array.isArray(a) ? a.filter((m) => m && m.id && Array.isArray(m.sectors)) : [];
  } catch {
    MY_MARKETS = [];
  }
}
function mineSave() {
  try {
    localStorage.setItem(MY_MARKETS_KEY, JSON.stringify(MY_MARKETS));
  } catch {}
}
function mineRegisterViews() {
  Object.keys(MAP_VIEWS).forEach((k) => {
    if (k.startsWith("my_")) delete MAP_VIEWS[k];
  });
  MY_MARKETS.forEach((m) => {
    MAP_VIEWS[mineViewKey(m.id)] = { label: m.name, mark: "mine", market: "overseas", mine: m.id };
  });
}
let mineUiBound = false;
function initMyMarkets() {
  mineLoad();
  mineRegisterViews();
  if (!mineUiBound) {
    mineUiBound = true;
    mineBindGestures();
    mineBindUi();
  }
}
const mineViewKeys = () => MY_MARKETS.map((m) => mineViewKey(m.id));
const isMineView = (viewKey) => !!mineIdOf(viewKey === undefined ? ACTIVE_VIEW : viewKey);
function mineMarketOf(viewKey) {
  const id = mineIdOf(viewKey === undefined ? ACTIVE_VIEW : viewKey);
  if (!id) return null;
  if (mineEditing && mineDraft && mineDraft.id === id) return mineDraft;
  return MY_MARKETS.find((m) => m.id === id) || null;
}

// ---- 종목 데이터 모으기 ----
function mineCompanyIndex() {
  const idx = new Map();
  const add = (list) => (list || []).forEach((c) => c && c.symbol && !idx.has(c.symbol) && idx.set(c.symbol, c));
  if (typeof KR_CORE_DATA !== "undefined") add(KR_CORE_DATA.companies);
  if (typeof KR_EXTRA_DATA !== "undefined") add(KR_EXTRA_DATA.companies);
  if (typeof SP500_CORE_DATA !== "undefined") add(SP500_CORE_DATA.companies);
  if (typeof SP500_EXTRA_DATA !== "undefined") add(SP500_EXTRA_DATA.companies);
  if (typeof NDX_EXTRA_DATA !== "undefined") add(NDX_EXTRA_DATA.companies);
  if (typeof ETF_MAP_DATA !== "undefined") add(ETF_MAP_DATA.companies);
  if (typeof CRYPTO_MAP_DATA !== "undefined") add(CRYPTO_MAP_DATA.companies);
  return idx;
}
function mineDisplayName(c) {
  if (/\.(KS|KQ)$/i.test(c.symbol)) return c.displayName || c.name || c.symbol;
  return c.displayName || c.symbol;
}
const mineUsdCap = (c) => {
  const cap = Number(c.marketCap) || 0;
  return /\.(KS|KQ)$/i.test(c.symbol) || c.currency === "KRW" ? cap / 1400 : cap;
};
function mineBuildActiveData(market) {
  const idx = mineCompanyIndex();
  const companies = [];
  const seen = new Set();
  for (const sec of (market && market.sectors) || []) {
    for (const sym of sec.symbols || []) {
      if (seen.has(sym)) continue;
      const c = idx.get(sym);
      if (!c) continue;
      seen.add(sym);
      companies.push({ ...c, sector: sec.name, sectorKo: sec.name, displayName: mineDisplayName(c) });
    }
  }
  return { companies };
}
// 필요한 데이터 파일(국내·해외 extra, ETF·코인)을 한 번에 불러온다
async function mineEnsureData() {
  const jobs = [];
  if (typeof KR_EXTRA_DATA === "undefined" && !extraDataFor("domestic")) jobs.push(ensureExtraDataLoaded("domestic"));
  if (!extraDataFor("overseas")) jobs.push(ensureExtraDataLoaded("overseas"));
  if (typeof ETF_MAP_DATA === "undefined") jobs.push(ensureEtfCryptoDataLoaded());
  if (jobs.length) await Promise.all(jobs);
}

// ---- 레이아웃: 저장된 섹터 위치·크기대로 원을 놓고, 그 안에 종목 원을 채운다 ----
function mineAutoRadius(n) {
  if (!n) return 620; // 비어 있는 임시 섹터는 화면에 가득 차게 크게
  return Math.max(260, Math.min(900, 170 + 64 * Math.sqrt(n)));
}
function buildMineRoot(data) {
  const market = mineMarketOf();
  const bySector = new Map();
  data.companies.forEach((c) => {
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector).push(c);
  });
  const children = [];
  for (const sec of (market && market.sectors) || []) {
    const comps = (bySector.get(sec.name) || []).filter((c) => mineUsdCap(c) > 0);
    const inner = sec.r * 0.9;
    const kids = comps.map((c) => ({ data: { ...c, value: sizeMode === "equal" ? 1 : mineUsdCap(c) }, x: 0, y: 0, r: 0 }));
    if (kids.length) {
      const h = d3.hierarchy({ children: kids.map((k) => k.data) }).sum((d) => (d.value ? d.value : 0));
      d3.pack().size([inner * 2, inner * 2]).padding(2)(h);
      h.children.forEach((n, i) => {
        kids[i].x = sec.x - inner + n.x;
        kids[i].y = sec.y - inner + n.y;
        kids[i].r = n.r;
      });
    }
    children.push({ data: { name: sec.name, sectorKo: sec.name, color: sec.color, mineId: sec.id }, x: sec.x, y: sec.y, r: sec.r, children: kids });
  }
  const root = { data: { name: "root" }, children };
  root.descendants = () => [root, ...children, ...children.flatMap((s) => s.children)];
  return root;
}

// ---- 렌더링 ----
function mineMakePill(sectorNode, pos) {
  const el = document.createElement("div");
  el.className = "sector-name-bubble" + (mineEditing ? " mine-pill" : "");
  el.style.setProperty("--sc", sectorNode.data.color);
  el.style.left = `${pos.x - pos.w / 2}px`;
  el.style.top = `${pos.y - pos.h / 2}px`;
  el.style.width = `${pos.w}px`;
  el.style.height = `${pos.h}px`;
  el.style.fontSize = `${pos.fontSize}px`;
  el.textContent = pos.text;
  el.dataset.mine = "pill";
  if (!mineEditing) el.addEventListener("click", () => zoomToNode(sectorNode));
  return el;
}
function renderMapMine(root) {
  const frag = document.createDocumentFragment();
  for (const sectorNode of root.children) {
    const color = sectorNode.data.color;
    const box = document.createElement("div");
    box.className = "mine-sector";
    box.dataset.sectorId = sectorNode.data.mineId;
    const bubble = document.createElement("div");
    bubble.className = "sector-bubble" + (mineEditing ? " mine-edit" : "") + (mineEditing && sectorNode.data.mineId === mineSelectedSectorId ? " mine-selected" : "");
    bubble.dataset.sector = sectorNode.data.name;
    bubble.dataset.mine = "ring";
    bubble.style.setProperty("--sc", color);
    bubble.style.left = `${sectorNode.x - sectorNode.r}px`;
    bubble.style.top = `${sectorNode.y - sectorNode.r}px`;
    bubble.style.width = `${sectorNode.r * 2}px`;
    bubble.style.height = `${sectorNode.r * 2}px`;
    const changeEl = document.createElement("span");
    changeEl.className = "sector-bubble-change";
    changeEl.style.fontSize = `${Math.max(18, Math.min(72, sectorNode.r * 0.3))}px`;
    bubble.appendChild(changeEl);
    if (!mineEditing) {
      bubble.addEventListener("click", (e) => {
        if (e.target !== bubble && e.target !== changeEl) return;
        zoomToNode(sectorNode);
      });
    }
    box.appendChild(bubble);
    const labelPos = layoutSectorLabel(sectorNode);
    for (const leaf of sectorNode.children) {
      const el = renderCompanyBubbleCircle(leaf, color);
      if (mineEditing) el.addEventListener("click", (ev) => ev.stopImmediatePropagation(), true); // 편집 중엔 종목 상세시트를 열지 않음
      box.appendChild(el);
    }
    box.appendChild(mineMakePill(sectorNode, labelPos));
    if (mineEditing) {
      const empty = !sectorNode.children.length;
      const size = empty ? Math.max(90, sectorNode.r * 0.34) : Math.max(54, sectorNode.r * 0.11);
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "mine-plus" + (empty ? " big" : "");
      plus.textContent = "+";
      plus.setAttribute("aria-label", "종목 추가");
      plus.style.width = plus.style.height = `${size}px`;
      plus.style.fontSize = `${size * 0.8}px`;
      plus.style.left = `${sectorNode.x - size / 2}px`;
      plus.style.top = `${empty ? sectorNode.y - size / 2 : sectorNode.y + sectorNode.r - size * 1.15}px`;
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        mineSelectedSectorId = sectorNode.data.mineId;
        mineOpenAddSheet(sectorNode.data.mineId);
      });
      box.appendChild(plus);
    }
    frag.appendChild(box);
  }
  mapWorld.appendChild(frag);
}
// 보기 모드: 내 시장의 섹터들이 화면에 꽉 차게(월드 전체가 아니라 섹터가 있는 영역에 맞춤)
function mineFitView(animate) {
  const m = mineMarketOf();
  if (!m || !m.sectors.length) return;
  const x0 = Math.min(...m.sectors.map((s) => s.x - s.r));
  const x1 = Math.max(...m.sectors.map((s) => s.x + s.r));
  const y0 = Math.min(...m.sectors.map((s) => s.y - s.r));
  const y1 = Math.max(...m.sectors.map((s) => s.y + s.r));
  const vw = mapViewport.clientWidth;
  const vh = mapViewport.clientHeight;
  const k = Math.max(minK, Math.min(maxK, Math.min(vw / ((x1 - x0) * 1.06), vh / ((y1 - y0) * 1.06))));
  view.k = k;
  view.x = vw / 2 - ((x0 + x1) / 2) * k;
  view.y = vh / 2 - ((y0 + y1) / 2) * k;
  applyTransform(!!animate);
}
// 편집 중 다시 그리기(보던 위치 유지 또는 특정 섹터로 확대)
function mineRerender(zoomSectorId) {
  const keep = { x: view.x, y: view.y, k: view.k };
  rerenderMap(false);
  if (zoomSectorId && packedRoot) {
    const node = packedRoot.children.find((s) => s.data.mineId === zoomSectorId);
    if (node) {
      zoomToNode(node);
      return;
    }
  }
  view.x = keep.x;
  view.y = keep.y;
  view.k = keep.k;
  applyTransform(false);
}

// ---- 겹치지 않게 놓기 ----
function mineOverlaps(market, sec, x, y, r) {
  return market.sectors.some((o) => o.id !== sec.id && Math.hypot(o.x - x, o.y - y) < o.r + r + 14);
}
function mineInBounds(x, y, r) {
  return x - r >= 10 && y - r >= 10 && x + r <= MINE_WORLD - 10 && y + r <= MINE_WORLD - 10;
}
function mineFindSpot(market, sec) {
  let r = sec.r;
  for (let shrink = 0; shrink < 8; shrink++) {
    for (let d = 0; d <= 1500; d += 40) {
      const steps = d === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * d) / 60));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        const x = sec.x + Math.cos(a) * d;
        const y = sec.y + Math.sin(a) * d;
        if (mineInBounds(x, y, r) && !mineOverlaps(market, sec, x, y, r)) {
          sec.x = x;
          sec.y = y;
          sec.r = r;
          return true;
        }
      }
    }
    r *= 0.88;
  }
  return false;
}

// ---- 편집 모드 ----
function mineSyncUi() {
  const mine = isMineView();
  const btn = document.getElementById("mineEditBtn");
  if (btn) {
    btn.style.display = mine ? "" : "none";
    btn.textContent = mineEditing ? "완료" : "수정";
    btn.classList.toggle("on", mineEditing);
  }
  document.body.classList.toggle("mine-editing", mineEditing);
  if (!mine) document.body.classList.remove("mine-editing");
}
function mineEnterEdit() {
  const m = MY_MARKETS.find((x) => x.id === mineIdOf(ACTIVE_VIEW));
  if (!m) return;
  mineEditing = true;
  mineDraft = mineClone(m);
  mineSelectedSectorId = mineDraft.sectors[0] ? mineDraft.sectors[0].id : null;
  mineSyncUi();
  mineBuildColorBar();
  updateActiveDataForUniverseState();
  rerenderMap(false);
  const node = packedRoot && packedRoot.children.find((s) => s.data.mineId === mineSelectedSectorId);
  if (node) zoomToNode(node); // 섹터 원이 화면에 가득 차게
  mineEnsureData().catch(() => {});
}
function mineExitEdit(save) {
  if (!mineEditing) return;
  if (save && mineDraft) {
    const i = MY_MARKETS.findIndex((x) => x.id === mineDraft.id);
    if (i >= 0) MY_MARKETS[i] = mineDraft;
    mineSave();
    mineRegisterViews();
  }
  mineEditing = false;
  mineDraft = null;
  mineSyncUi();
  syncMapViewUi();
  if (isMineView()) {
    updateActiveDataForUniverseState();
    rerenderMap(true);
    if (save) showToast("내 시장을 저장했어요");
  }
}
function mineBuildColorBar() {
  const bar = document.getElementById("mineBar");
  if (!bar) return;
  bar.innerHTML =
    `<button type="button" class="mine-bar-btn" id="mineAddSectorBtn">+ 섹터</button><span class="mine-bar-label">색</span>` +
    MINE_COLORS.map((c) => `<button type="button" class="mine-swatch" data-color="${c}" style="background:${c}" aria-label="색상 ${c}"></button>`).join("") +
    `<button type="button" class="mine-bar-btn danger" id="mineDeleteBtn">시장 삭제</button>`;
}
function mineSelectedSector() {
  return mineDraft && mineDraft.sectors.find((s) => s.id === mineSelectedSectorId);
}
function mineUniqueName(base) {
  const names = new Set(mineDraft.sectors.map((s) => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
function mineNewSector() {
  const idx = mineDraft.sectors.length;
  return { id: mineUid(), name: mineUniqueName(`섹터 ${idx + 1}`), color: MINE_COLORS[idx % MINE_COLORS.length], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: idx ? 340 : 620, symbols: [] };
}

// ---- 작은 입력/확인 창 ----
function minePrompt(title, value, cb) {
  const back = document.createElement("div");
  back.className = "mine-modal-back";
  back.innerHTML = `<div class="mine-modal"><b>${mineEsc(title)}</b><input type="text" maxlength="14" value="${mineEsc(value)}" /><div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary">확인</button></div></div>`;
  document.body.appendChild(back);
  const input = back.querySelector("input");
  const close = () => back.remove();
  back.querySelector("[data-no]").addEventListener("click", close);
  back.addEventListener("click", (e) => e.target === back && close());
  const ok = () => {
    const v = input.value.trim();
    if (!v) return;
    close();
    cb(v);
  };
  back.querySelector("[data-ok]").addEventListener("click", ok);
  input.addEventListener("keydown", (e) => e.key === "Enter" && ok());
  setTimeout(() => {
    input.focus();
    input.select();
  }, 60);
}
function mineConfirm(msg, okLabel, cb) {
  const back = document.createElement("div");
  back.className = "mine-modal-back";
  back.innerHTML = `<div class="mine-modal"><p>${mineEsc(msg)}</p><div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary danger">${mineEsc(okLabel)}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector("[data-no]").addEventListener("click", close);
  back.addEventListener("click", (e) => e.target === back && close());
  back.querySelector("[data-ok]").addEventListener("click", () => {
    close();
    cb();
  });
}

// ---- 섹터 길게 눌러 옮기기 / 탭하면 선택·이름 바꾸기 ----
let mineGesture = null;
function mineClientToWorld(e) {
  const rect = mapViewport.getBoundingClientRect();
  return { x: (e.clientX - rect.left - view.x) / view.k, y: (e.clientY - rect.top - view.y) / view.k };
}
function mineHitTest(e) {
  if (!mineEditing || !mineDraft) return null;
  const t = e.target;
  const pillEl = t.closest && t.closest(".sector-name-bubble");
  if (pillEl) {
    const box = pillEl.closest(".mine-sector");
    const sec = box && mineDraft.sectors.find((s) => s.id === box.dataset.sectorId);
    return sec ? { sec, box, kind: "pill" } : null;
  }
  if (t.classList && t.classList.contains("sector-bubble")) {
    const box = t.closest(".mine-sector");
    const sec = box && mineDraft.sectors.find((s) => s.id === box.dataset.sectorId);
    if (!sec) return null;
    const w = mineClientToWorld(e);
    const dist = Math.hypot(w.x - sec.x, w.y - sec.y);
    return dist >= sec.r * 0.86 ? { sec, box, kind: "ring" } : { sec, box, kind: "inside" };
  }
  return null;
}
function mineBindGestures() {
  mapViewport.addEventListener(
    "pointerdown",
    (e) => {
      const hit = mineHitTest(e);
      if (!hit) return;
      if (hit.kind === "inside") {
        mineSelectedSectorId = hit.sec.id; // 안쪽 빈 곳은 지도 이동(팬) 그대로 두고 섹터만 선택
        mineMarkSelected();
        return;
      }
      e.__mineGrab = true; // 지도 이동 시작 방지
      mineGesture = { hit, sx: e.clientX, sy: e.clientY, pid: e.pointerId, moved: false, active: false, dx: 0, dy: 0, lastOk: { dx: 0, dy: 0 }, k: view.k };
      mineGesture.timer = setTimeout(() => {
        if (!mineGesture || mineGesture.moved) return;
        mineGesture.active = true;
        mineGesture.hit.box.classList.add("mine-moving");
        if (navigator.vibrate) navigator.vibrate(18);
      }, 480);
    },
    true
  );
}
function mineMarkSelected() {
  document.querySelectorAll(".mine-sector").forEach((b) => b.querySelector(".sector-bubble").classList.toggle("mine-selected", b.dataset.sectorId === mineSelectedSectorId));
}
window.addEventListener("pointermove", (e) => {
  const g = mineGesture;
  if (!g || e.pointerId !== g.pid) return;
  const mx = e.clientX - g.sx;
  const my = e.clientY - g.sy;
  if (!g.active) {
    if (Math.hypot(mx, my) > 9) {
      g.moved = true;
      clearTimeout(g.timer);
    }
    return;
  }
  e.preventDefault();
  const dx = mx / g.k;
  const dy = my / g.k;
  const sec = g.hit.sec;
  const nx = sec.x + dx;
  const ny = sec.y + dy;
  if (mineInBounds(nx, ny, sec.r) && !mineOverlaps(mineDraft, sec, nx, ny, sec.r)) {
    g.lastOk = { dx, dy };
  }
  g.hit.box.style.transform = `translate(${g.lastOk.dx}px, ${g.lastOk.dy}px)`;
});
function mineEndGesture(e) {
  const g = mineGesture;
  if (!g || (e && e.pointerId !== g.pid)) return;
  mineGesture = null;
  clearTimeout(g.timer);
  g.hit.box.classList.remove("mine-moving");
  const sec = g.hit.sec;
  if (g.active) {
    sec.x += g.lastOk.dx;
    sec.y += g.lastOk.dy;
    g.hit.box.style.transform = "";
    mineRerender();
    return;
  }
  if (!g.moved) {
    // 탭: 이름표면 이름 바꾸기, 테두리면 선택
    mineSelectedSectorId = sec.id;
    if (g.hit.kind === "pill") {
      minePrompt("섹터 이름", sec.name, (v) => {
        sec.name = v === sec.name ? v : mineUniqueName(v);
        mineRerender();
      });
    } else mineMarkSelected();
  }
}
window.addEventListener("pointerup", mineEndGesture);
window.addEventListener("pointercancel", mineEndGesture);

// ---- 시장 이름: 편집 중 왼쪽 위 이름을 길게 누르면 수정 ----
(() => {
  const btn = document.getElementById("mapViewBtn");
  if (!btn) return;
  let timer = null;
  btn.addEventListener("pointerdown", () => {
    if (!mineEditing) return;
    timer = setTimeout(() => {
      timer = null;
      minePrompt("시장 이름", mineDraft.name, (v) => {
        mineDraft.name = v;
        MAP_VIEWS[mineViewKey(mineDraft.id)].label = v;
        syncMapViewUi();
      });
    }, 520);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, () => timer && (clearTimeout(timer), (timer = null))));
})();

// ---- 종목 검색·추가 시트 ----
const MINE_TABS = [["kr", "한국주식"], ["us", "미국주식"], ["etf", "ETF"], ["crypto", "비트코인"]];
let mineAddState = null; // { secId, tab, selected:Set, query }
function mineTabCompanies(tab) {
  const get = (d) => (typeof d !== "undefined" && d && d.companies ? d.companies : []);
  let list = [];
  if (tab === "kr") list = get(typeof KR_CORE_DATA !== "undefined" ? KR_CORE_DATA : undefined).concat(typeof KR_EXTRA_DATA !== "undefined" ? get(KR_EXTRA_DATA) : []);
  else if (tab === "us") list = get(typeof SP500_CORE_DATA !== "undefined" ? SP500_CORE_DATA : undefined);
  else if (tab === "etf") list = get(typeof ETF_MAP_DATA !== "undefined" ? ETF_MAP_DATA : undefined);
  else list = get(typeof CRYPTO_MAP_DATA !== "undefined" ? CRYPTO_MAP_DATA : undefined);
  return list.filter((c) => c && c.symbol).sort((a, b) => mineUsdCap(b) - mineUsdCap(a));
}
function mineTabOf(c) {
  return wlCategoryOf(c.symbol, c.name);
}
function mineOpenAddSheet(secId) {
  const sec = mineDraft.sectors.find((s) => s.id === secId);
  if (!sec) return;
  mineAddState = { secId, tab: "kr", selected: new Set(sec.symbols), query: "" };
  document.getElementById("mineSearchInput").value = "";
  document.getElementById("mineAddBack").classList.add("open");
  mineRenderAddSheet();
  // 데이터가 아직 없으면 조용히 불러온 뒤 다시 그림(가장 먼저 뜨는 한국·미국은 이미 로드돼 있음)
  mineEnsureData().then(() => mineAddState && mineRenderAddSheet()).catch(() => {});
}
function mineCloseAddSheet() {
  document.getElementById("mineAddBack").classList.remove("open");
  mineAddState = null;
}
function mineRenderAddSheet() {
  const st = mineAddState;
  if (!st) return;
  const idx = mineCompanyIndex();
  // 탭 위 숫자: 이 섹터에 담긴(선택된) 종목 수
  const counts = { kr: 0, us: 0, etf: 0, crypto: 0 };
  st.selected.forEach((sym) => {
    const c = idx.get(sym);
    if (c) counts[mineTabOf(c)] = (counts[mineTabOf(c)] || 0) + 1;
  });
  document.getElementById("mineTabs").innerHTML = MINE_TABS.map(
    ([k, label]) => `<div class="mine-tab-wrap"><span class="mine-tab-n${counts[k] ? " on" : ""}">${counts[k]}</span><button type="button" class="mine-tab${!st.query && st.tab === k ? " active" : ""}" data-tab="${k}">${label}</button></div>`
  ).join("");
  let list;
  if (st.query) {
    const q = st.query.toLowerCase();
    list = [...idx.values()].filter((c) => (c.symbol || "").toLowerCase().includes(q) || (koNameOf(c.symbol, c.name) || "").toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q)).sort((a, b) => mineUsdCap(b) - mineUsdCap(a)).slice(0, 50);
  } else {
    list = mineTabCompanies(st.tab).slice(0, 50);
  }
  const box = document.getElementById("mineAddList2");
  if (!list.length) {
    const loading = !st.query && ((st.tab === "etf" || st.tab === "crypto") && typeof ETF_MAP_DATA === "undefined");
    box.innerHTML = `<p class="mine-empty">${loading ? "불러오는 중..." : st.query ? "검색 결과가 없어요" : "표시할 종목이 없어요"}</p>`;
  } else {
    box.innerHTML = list
      .map((c) => {
        const on = st.selected.has(c.symbol);
        const name = koNameOf(c.symbol, c.name);
        return `<div class="mine-row" data-sym="${mineEsc(c.symbol)}"><img class="mine-logo" loading="lazy" alt="" src="${mineEsc(logoUrl(c.symbol, "low"))}" onerror="this.style.visibility='hidden'" /><div class="mine-row-name"><b>${mineEsc(name)}</b><span>${mineEsc(c.sectorKo || c.sector || "")}</span></div><button type="button" class="mine-row-add${on ? " on" : ""}">${on ? "✓ 추가됨" : "추가"}</button></div>`;
      })
      .join("");
  }
  const n = st.selected.size;
  document.getElementById("mineAddConfirm").textContent = n ? `추가하기 (${n})` : "추가하기";
}
function mineConfirmAdd() {
  const st = mineAddState;
  if (!st || !mineDraft) return;
  const sec = mineDraft.sectors.find((s) => s.id === st.secId);
  if (!sec) return;
  const sel = [...st.selected];
  // 한 종목은 한 섹터에만 — 다른 섹터에 있던 종목은 이쪽으로 옮김
  mineDraft.sectors.forEach((o) => {
    if (o.id !== sec.id) o.symbols = o.symbols.filter((s) => !st.selected.has(s));
  });
  sec.symbols = sel;
  sec.r = mineAutoRadius(sel.length);
  if (!mineFindSpot(mineDraft, sec)) showToast("놓을 자리가 부족해요. 섹터 위치를 먼저 옮겨 주세요");
  const id = sec.id;
  mineCloseAddSheet();
  updateActiveDataForUniverseState();
  mineRerender(id);
}

// ---- 이벤트 연결 ----
function mineBindUi() {
  const $ = (id) => document.getElementById(id);
  // 보기 추가 창 맨 위 "+ 내 시장 만들기"
  $("mineCreateBtn").addEventListener("click", async () => {
    const n = MY_MARKETS.length + 1;
    const m = { id: mineUid(), name: `내 시장 ${n}`, sectors: [] };
    const first = { id: mineUid(), name: "섹터 1", color: MINE_COLORS[0], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: 620, symbols: [] };
    m.sectors.push(first);
    MY_MARKETS.push(m);
    mineSave();
    mineRegisterViews();
    $("mapAddBack").style.display = "none";
    await setMapView(mineViewKey(m.id), false);
    mineEnterEdit(); // 2026-10-20 사용자 요청: 만들자마자 자동으로 수정 모드(섹터 원이 화면에 가득)
  });
  $("mineEditBtn").addEventListener("click", () => {
    if (mineEditing) mineExitEdit(true);
    else mineEnterEdit();
  });
  $("mineBar").addEventListener("click", (e) => {
    if (e.target.closest("#mineAddSectorBtn")) {
      const sec = mineNewSector();
      mineDraft.sectors.push(sec);
      if (!mineFindSpot(mineDraft, sec)) {
        mineDraft.sectors.pop();
        showToast("놓을 자리가 부족해요. 섹터 위치를 먼저 옮겨 주세요");
        return;
      }
      mineSelectedSectorId = sec.id;
      updateActiveDataForUniverseState();
      mineRerender(sec.id);
      return;
    }
    const sw = e.target.closest(".mine-swatch");
    if (sw) {
      const sec = mineSelectedSector();
      if (!sec) return;
      sec.color = sw.dataset.color;
      mineRerender();
      return;
    }
    if (e.target.closest("#mineDeleteBtn")) {
      mineConfirm(`'${mineDraft.name}' 시장을 삭제할까요? 되돌릴 수 없어요.`, "삭제", async () => {
        const id = mineDraft.id;
        mineEditing = false;
        mineDraft = null;
        MY_MARKETS = MY_MARKETS.filter((m) => m.id !== id);
        mineSave();
        mineRegisterViews();
        mineSyncUi();
        await setMapView(visibleMapViews().includes("sp200") ? "sp200" : visibleMapViews()[0], false);
        showToast("시장을 삭제했어요");
      });
    }
  });
  // 종목 추가 시트
  $("mineAddBack").addEventListener("click", (e) => e.target === $("mineAddBack") && mineCloseAddSheet());
  $("mineTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".mine-tab");
    if (!b || !mineAddState) return;
    mineAddState.tab = b.dataset.tab;
    mineAddState.query = "";
    $("mineSearchInput").value = "";
    mineRenderAddSheet();
  });
  $("mineSearchInput").addEventListener("input", (e) => {
    if (!mineAddState) return;
    mineAddState.query = e.target.value.trim();
    mineRenderAddSheet();
  });
  $("mineAddList2").addEventListener("click", (e) => {
    const row = e.target.closest(".mine-row");
    if (!row || !mineAddState) return;
    const sym = row.dataset.sym;
    if (mineAddState.selected.has(sym)) mineAddState.selected.delete(sym);
    else mineAddState.selected.add(sym);
    const on = mineAddState.selected.has(sym);
    const btn = row.querySelector(".mine-row-add");
    btn.classList.toggle("on", on);
    btn.textContent = on ? "✓ 추가됨" : "추가";
    // 탭 숫자와 하단 버튼 숫자만 갱신(목록 전체를 다시 그리지 않아 빠르게)
    const idx = mineCompanyIndex();
    const counts = { kr: 0, us: 0, etf: 0, crypto: 0 };
    mineAddState.selected.forEach((s) => {
      const c = idx.get(s);
      if (c) counts[mineTabOf(c)]++;
    });
    document.querySelectorAll("#mineTabs .mine-tab-wrap").forEach((w, i) => {
      const n = counts[MINE_TABS[i][0]];
      const el = w.querySelector(".mine-tab-n");
      el.textContent = n;
      el.classList.toggle("on", n > 0);
    });
    const n = mineAddState.selected.size;
    $("mineAddConfirm").textContent = n ? `추가하기 (${n})` : "추가하기";
  });
  $("mineAddConfirm").addEventListener("click", mineConfirmAdd);
}

// app.js의 setMapView 맨 앞에서 부름 — 다른 보기로 가면 편집을 취소(저장 안 함), 내 시장이면 필요한 데이터를 먼저 불러옴
async function mineBeforeSetView(viewKey) {
  if (mineEditing && viewKey !== ACTIVE_VIEW) {
    mineEditing = false;
    mineDraft = null;
    mineSyncUi();
  }
  if (mineIdOf(viewKey)) {
    const label = document.getElementById("mapViewBtnLabel");
    if (label) label.textContent = "불러오는 중...";
    try {
      await mineEnsureData();
    } catch {
      showToast("종목 데이터를 불러오지 못했어요. 다시 시도해주세요");
      syncMapViewUi();
      return false;
    }
  }
  return true;
}
