// ---------- 내 시장 만들기 (2026-10-20 사용자 요청, 2026-10-21 확장) ----------
// 나만의 시장 = 섹터 원(이름·색·위치) + 종목 목록. 이 기기(localStorage)에만 저장된다.
// app.js보다 먼저 불러온다 — 여기서는 함수·상태만 정의하고, app.js가 init 때 initMyMarkets()를 부른다.
// 지도 엔진(app.js)은 원형 모드로 그리므로, 내 시장도 같은 렌더러 모양(섹터 원 + 종목 원 + 이름표)을 따르되
// 섹터 위치·크기는 저장된 값을 쓴다. app.js 쪽 연결 지점은 isMineView()/buildMineRoot()/renderMapMine() 호출 몇 군데뿐.
// 2026-10-21 추가: 종목 빼기/이동, 섹터 이동 버튼, 색 직접 고르기, 시장 복사 붙여넣기, 테마로 가져오기, 섹터 합치기·분리, 정렬.

const MY_MARKETS_KEY = "map_custom_markets_v1";
const MINE_COLORS = ["#7230f0", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#64748b", "#111827"];
const MINE_WORLD = 2000; // app.js WORLD_SIZE 와 같은 값
let MY_MARKETS = [];
let mineEditing = false;
let mineDraft = null; // 편집 중인 시장(복사본) — 완료를 눌러야 저장
let mineSelectedSectorId = null;
let mineMoveMode = false; // 이동 버튼을 켜면 섹터를 길게 누르지 않고 바로 끌어 옮김

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
// 내 시장 삭제(저장된 시장 자체) — 보기 목록 편집의 −에서도 부름
function mineDeleteMarketById(id) {
  if (mineDraft && mineDraft.id === id) {
    mineEditing = false;
    mineDraft = null;
    mineMoveMode = false;
  }
  MY_MARKETS = MY_MARKETS.filter((m) => m.id !== id);
  mineSave();
  mineRegisterViews();
  mineSyncUi();
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
  if (typeof IPO_MAP_DATA !== "undefined" && IPO_MAP_DATA) {
    add(IPO_MAP_DATA.kr && IPO_MAP_DATA.kr.companies);
    add(IPO_MAP_DATA.us && IPO_MAP_DATA.us.companies);
  }
  return idx;
}
function mineDisplayName(c) {
  if (/\.(KS|KQ)$/i.test(c.symbol)) return c.displayName || c.name || c.symbol;
  return c.displayName || c.symbol;
}
const mineUsdCap = (c) => capUsdOf(c);
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
      const live = typeof LIVE_OVERLAY !== "undefined" ? LIVE_OVERLAY.get(sym) : null; // 방금 받은 실시간 값 유지
      companies.push({ ...c, ...(live || {}), sector: sec.name, sectorKo: sec.name, displayName: mineDisplayName(c) });
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
// 다른 보기를 복사하려면 그 보기가 쓰는 데이터 파일이 필요
async function mineEnsureViewData(viewKey) {
  const v = MAP_VIEWS[viewKey];
  if (!v) return;
  await mineEnsureData();
  const jobs = [];
  if (v.ipo && typeof IPO_MAP_DATA === "undefined") jobs.push(ensureIpoMapDataLoaded());
  if (v.needNdx && typeof NDX_EXTRA_DATA === "undefined") jobs.push(ensureNdxDataLoaded());
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
  const onlyEmptyFirst = mineEditing && mineDraft && mineDraft.sectors.length === 1 && !mineDraft.sectors[0].symbols.length;
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
      if (mineEditing) {
        // 편집 중엔 종목 상세시트 대신 "섹터에서 빼기 / 다른 섹터로 옮기기" 창을 연다(2026-10-21)
        el.classList.add("mine-stock");
        el.addEventListener(
          "click",
          (ev) => {
            ev.stopImmediatePropagation();
            if (mineMoveMode) return;
            mineOpenStockSheet(leaf.data.symbol, sectorNode.data.mineId);
          },
          true
        );
      }
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
      // 처음 만든 빈 섹터 위에 "+시장 복사·붙여넣기"(2026-10-21 사용자 요청)
      if (onlyEmptyFirst) {
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "mine-copy-top";
        copy.textContent = "+ 시장 복사·붙여넣기";
        const w = Math.max(240, sectorNode.r * 1.05);
        copy.style.width = `${w}px`;
        copy.style.height = `${w * 0.2}px`;
        copy.style.fontSize = `${w * 0.075}px`;
        copy.style.left = `${sectorNode.x - w / 2}px`;
        copy.style.top = `${sectorNode.y - size / 2 - w * 0.2 - sectorNode.r * 0.06}px`;
        copy.addEventListener("click", (e) => {
          e.stopPropagation();
          mineOpenCopySheet();
        });
        box.appendChild(copy);
      }
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
// 데이터가 바뀌었을 때(이름·종목·섹터 변경) 종목-섹터 연결을 새로 계산한 뒤 다시 그림 — 이름을 바꾸면 종목이 사라지던 버그의 원인이 이 단계 누락이었음
function mineRefresh(zoomSectorId) {
  updateActiveDataForUniverseState();
  mineRerender(zoomSectorId);
  mineUpdateSelLabel();
}

// ---- 겹치지 않게 놓기 ----
function mineOverlaps(market, sec, x, y, r) {
  return market.sectors.some((o) => o.id !== sec.id && Math.hypot(o.x - x, o.y - y) < o.r + r + 14);
}
function mineInBounds(x, y, r) {
  return x - r >= 10 && y - r >= 10 && x + r <= MINE_WORLD - 10 && y + r <= MINE_WORLD - 10;
}
// 새 섹터는 기존 섹터들 "아래"에 놓는다(2026-10-21 사용자 요청). 이미 겹치지 않는 자리에 있으면 그대로 둔다.
function mineFindSpot(market, sec, below) {
  const others = market.sectors.filter((o) => o.id !== sec.id);
  if (!below && mineInBounds(sec.x, sec.y, sec.r) && !mineOverlaps(market, sec, sec.x, sec.y, sec.r)) return true;
  let r = sec.r;
  for (let shrink = 0; shrink < 8; shrink++) {
    if (others.length) {
      const bottom = Math.max(...others.map((o) => o.y + o.r));
      const left = Math.min(...others.map((o) => o.x - o.r));
      const right = Math.max(...others.map((o) => o.x + o.r));
      const cx = (left + right) / 2;
      const y = bottom + r + 16;
      for (const dx of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4]) {
        const x = cx + dx * r;
        if (mineInBounds(x, y, r) && !mineOverlaps(market, sec, x, y, r)) {
          sec.x = x;
          sec.y = y;
          sec.r = r;
          return true;
        }
      }
    }
    for (let d = 0; d <= 1500; d += 40) {
      const steps = d === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * d) / 60));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        const x = MINE_WORLD / 2 + Math.cos(a) * d;
        const y = MINE_WORLD / 2 + Math.sin(a) * d;
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
  // 자리가 없으면 기존 섹터를 전체적으로 조금 줄여 공간을 만든 뒤 한 번 더
  if (!sec.__retried && others.length) {
    sec.__retried = true;
    mineScaleAll(market, 0.8, sec);
    const ok = mineFindSpot(market, sec, true);
    delete sec.__retried;
    return ok;
  }
  return false;
}
// 모든 섹터(위치·크기)를 월드 가운데 기준으로 k배 — 새 섹터를 놓을 공간 확보용
function mineScaleAll(market, k, except) {
  const c = MINE_WORLD / 2;
  market.sectors.forEach((s) => {
    if (except && s.id === except.id) return;
    s.x = c + (s.x - c) * k;
    s.y = c + (s.y - c) * k;
    s.r = Math.max(40, s.r * k);
  });
}

// ---- 자동 배치: 정렬(센터로 모으기) / 위·아래로 쌓기 ----
const mineSecRadiusFor = (n) => (n ? Math.max(120, 100 + 52 * Math.sqrt(n)) : 190);
// 정렬(2026-10-21 사용자 요청): 크기는 그대로 두고, 센터를 향해 끌어당겨 서로 겹치지 않게 딱 붙인다
function mineGather(market) {
  const secs = market.sectors;
  const c = MINE_WORLD / 2;
  if (!secs.length) return;
  if (secs.length === 1) {
    secs[0].x = c;
    secs[0].y = c;
    return;
  }
  const nodes = secs.map((s) => ({ s, x: s.x, y: s.y, r: s.r }));
  // 같은 자리에 겹쳐 있으면 힘이 0이 되므로 살짝 흩뜨려 시작
  nodes.forEach((n, i) => {
    if (Math.hypot(n.x - c, n.y - c) < 1) {
      n.x += (i % 2 ? 1 : -1) * (5 + i);
      n.y += (i % 3 ? 1 : -1) * (3 + i);
    }
  });
  const sim = d3
    .forceSimulation(nodes)
    .alpha(1)
    .alphaDecay(0)
    .velocityDecay(0.4)
    .force("x", d3.forceX(c).strength(0.1))
    .force("y", d3.forceY(c).strength(0.1))
    .force("collide", d3.forceCollide((d) => d.r + 3).iterations(6))
    .stop();
  for (let i = 0; i < 600; i++) sim.tick();
  mineCenterAndFit(nodes.map((n) => ({ s: n.s, x: n.x, y: n.y, r: n.r })));
}
// 원 목록(x,y,r)을 월드 가운데로 옮기고, 월드보다 크면 전체를 줄여 담는다
function mineCenterAndFit(circles) {
  const c = MINE_WORLD / 2;
  const enc = d3.packEnclose(circles.map((o) => ({ x: o.x, y: o.y, r: o.r })));
  const k = enc.r > c - 30 ? (c - 30) / enc.r : 1;
  circles.forEach((o) => {
    o.s.x = c + (o.x - enc.x) * k;
    o.s.y = c + (o.y - enc.y) * k;
    o.s.r = Math.max(40, o.r * k);
  });
}
// 섹터 묶음들을 위에서 아래로 차례로 쌓는다 — 묶음 안은 촘촘히(packSiblings), 묶음 사이는 위→아래.
// 시장 복사: [새로 가져온 섹터, 기존 섹터] / 테마·섹터 추가: [기존 섹터, 새 섹터]
function mineStackGroups(groups) {
  const packs = groups
    .filter((g) => g.length)
    .map((g) => {
      const circles = g.map((s) => ({ r: s.r + 8, s })).sort((a, b) => b.r - a.r);
      d3.packSiblings(circles);
      const enc = d3.packEnclose(circles);
      return { circles, enc };
    });
  if (!packs.length) return;
  const gap = 24;
  const totalH = packs.reduce((a, p) => a + p.enc.r * 2, 0) + gap * (packs.length - 1);
  const maxW = Math.max(...packs.map((p) => p.enc.r * 2));
  const k = Math.min(1, (MINE_WORLD - 60) / totalH, (MINE_WORLD - 60) / maxW);
  let y = (MINE_WORLD - totalH * k) / 2;
  packs.forEach((p) => {
    const cy = y + p.enc.r * k;
    p.circles.forEach((o) => {
      o.s.x = MINE_WORLD / 2 + (o.x - p.enc.x) * k;
      o.s.y = cy + (o.y - p.enc.y) * k;
      o.s.r = Math.max(40, (o.r - 8) * k);
    });
    y += p.enc.r * 2 * k + gap * k;
  });
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
  const arr = document.getElementById("mineArrangeBtn");
  if (arr) arr.style.display = mine && mineEditing ? "" : "none";
  document.body.classList.toggle("mine-editing", mineEditing);
  document.body.classList.toggle("mine-moving-mode", mineEditing && mineMoveMode);
  if (!mine) document.body.classList.remove("mine-editing", "mine-moving-mode");
}
function mineEnterEdit() {
  const m = MY_MARKETS.find((x) => x.id === mineIdOf(ACTIVE_VIEW));
  if (!m) return;
  mineEditing = true;
  mineMoveMode = false;
  mineDraft = mineClone(m);
  mineSelectedSectorId = mineDraft.sectors[0] ? mineDraft.sectors[0].id : null;
  mineSyncUi();
  mineBuildBar();
  updateActiveDataForUniverseState();
  rerenderMap(false);
  const node = packedRoot && packedRoot.children.find((s) => s.data.mineId === mineSelectedSectorId);
  if (node && mineDraft.sectors.length <= 1) zoomToNode(node); // 섹터가 하나면 원이 화면에 가득 차게
  else mineFitView(false); // 여러 개면 전체가 보이게
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
  mineMoveMode = false;
  mineDraft = null;
  mineSyncUi();
  syncMapViewUi();
  if (isMineView()) {
    updateActiveDataForUniverseState();
    rerenderMap(true);
    if (save) showToast("내 시장을 저장했어요");
  }
}
// 편집 도구 줄 — 두 줄: ①섹터·시장 도구 ②선택한 섹터 색
function mineBuildBar() {
  const bar = document.getElementById("mineBar");
  if (!bar) return;
  bar.innerHTML =
    `<div class="mine-bar-row">` +
    `<button type="button" class="mine-bar-btn" id="mineAddSectorBtn">＋ 섹터</button>` +
    `<button type="button" class="mine-bar-btn" id="mineCopyBtn">⧉ 시장 복사</button>` +
    `<button type="button" class="mine-bar-btn" id="mineThemeBtn">▦ 테마</button>` +
    `<button type="button" class="mine-bar-btn" id="mineMoveBtn">✥ 이동</button>` +
    `<button type="button" class="mine-bar-btn" id="mineMergeBtn">⊕ 합치기</button>` +
    `<button type="button" class="mine-bar-btn" id="mineSplitBtn">⑂ 분리</button>` +
    `<button type="button" class="mine-bar-btn danger" id="mineDeleteBtn">시장 삭제</button>` +
    `</div><div class="mine-bar-row"><span class="mine-bar-label" id="mineSelLabel">색</span>` +
    MINE_COLORS.map((c) => `<button type="button" class="mine-swatch" data-color="${c}" style="background:${c}" aria-label="색상 ${c}"></button>`).join("") +
    `<label class="mine-swatch mine-swatch-custom" aria-label="색 직접 고르기"><input type="color" id="mineColorInput" value="#7230f0" /></label>` +
    `<span class="mine-bar-hint">종목을 누르면 빼기·이동</span></div>`;
  mineUpdateSelLabel();
}
function mineSelectedSector() {
  return mineDraft && mineDraft.sectors.find((s) => s.id === mineSelectedSectorId);
}
function mineUpdateSelLabel() {
  const lab = document.getElementById("mineSelLabel");
  if (!lab) return;
  const sec = mineSelectedSector();
  lab.textContent = sec ? `「${sec.name}」 색` : "색";
  const mv = document.getElementById("mineMoveBtn");
  if (mv) mv.classList.toggle("on", mineMoveMode);
  const ci = document.getElementById("mineColorInput");
  if (ci && sec && /^#[0-9a-f]{6}$/i.test(sec.color)) ci.value = sec.color;
}
function mineUniqueName(base) {
  const names = new Set(mineDraft.sectors.map((s) => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
function mineNewSector(name, color) {
  const idx = mineDraft.sectors.length;
  return { id: mineUid(), name: mineUniqueName(name || `섹터 ${idx + 1}`), color: color || MINE_COLORS[idx % MINE_COLORS.length], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: idx ? 340 : 620, symbols: [] };
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
// 빈 창(내용은 호출한 쪽이 채움) — 바깥을 누르면 닫힘
function mineModal(html, wide) {
  const back = document.createElement("div");
  back.className = "mine-modal-back";
  back.innerHTML = `<div class="mine-modal${wide ? " mine-modal-wide" : ""}">${html}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", (e) => e.target === back && close());
  back.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", close));
  return { back, close, box: back.querySelector(".mine-modal") };
}
const mineColorChoices = (sel) =>
  MINE_COLORS.map((c) => `<button type="button" class="mine-swatch${c === sel ? " picked" : ""}" data-color="${c}" style="background:${c}"></button>`).join("") +
  `<label class="mine-swatch mine-swatch-custom"><input type="color" data-custom value="${/^#[0-9a-f]{6}$/i.test(sel) ? sel : "#7230f0"}" /></label>`;

// ---- 섹터 길게 눌러 옮기기 / 이동 버튼을 켜면 바로 끌어 옮기기 / 탭하면 선택·이름 바꾸기 ----
let mineGesture = null;
function mineClientToWorld(e) {
  const rect = mapViewport.getBoundingClientRect();
  return { x: (e.clientX - rect.left - view.x) / view.k, y: (e.clientY - rect.top - view.y) / view.k };
}
function mineHitTest(e) {
  if (!mineEditing || !mineDraft) return null;
  const t = e.target;
  if (mineMoveMode) {
    // 이동 모드: 섹터 어디를 잡아도(종목 위든 이름표든) 그 섹터가 움직임
    const box = t.closest && t.closest(".mine-sector");
    const sec = box && mineDraft.sectors.find((s) => s.id === box.dataset.sectorId);
    return sec ? { sec, box, kind: "move" } : null;
  }
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
      e.preventDefault && hit.kind === "move" && e.preventDefault();
      mineGesture = { hit, sx: e.clientX, sy: e.clientY, pid: e.pointerId, moved: false, active: false, dx: 0, dy: 0, lastOk: { dx: 0, dy: 0 }, k: view.k };
      if (hit.kind === "move") {
        mineSelectedSectorId = hit.sec.id;
        mineMarkSelected();
        mineGesture.active = true; // 바로 끌기
        hit.box.classList.add("mine-moving");
        return;
      }
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
  mineUpdateSelLabel();
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
  if (Math.hypot(mx, my) > 4) g.moved = true;
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
        mineRefresh(); // 종목-섹터 연결을 새 이름으로 다시 계산(안 하면 종목이 사라짐)
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

// ---- 종목을 눌렀을 때: 섹터에서 빼기 / 다른 섹터로 옮기기 ----
function mineOpenStockSheet(symbol, secId) {
  if (!mineDraft) return;
  const sec = mineDraft.sectors.find((s) => s.id === secId);
  if (!sec) return;
  const c = mineCompanyIndex().get(symbol);
  const name = c ? koNameOf(symbol, c.name) : symbol;
  const others = mineDraft.sectors.filter((s) => s.id !== secId);
  const { box, close } = mineModal(
    `<b>${mineEsc(name)}</b><p class="mine-stock-sub">「${mineEsc(sec.name)}」 섹터의 종목</p>
     <button type="button" class="mine-stock-remove" data-remove>− 이 섹터에서 빼기</button>
     ${others.length ? `<p class="mine-stock-sub" style="margin-top:14px">다른 섹터로 옮기기</p><div class="mine-stock-moves">${others.map((o) => `<button type="button" class="mine-stock-move" data-move="${o.id}"><i style="background:${mineEsc(o.color)}"></i>${mineEsc(o.name)}</button>`).join("")}</div>` : ""}
     <div class="mine-modal-actions"><button type="button" data-no>닫기</button></div>`
  );
  box.querySelector("[data-remove]").addEventListener("click", () => {
    sec.symbols = sec.symbols.filter((s) => s !== symbol);
    close();
    mineRefresh();
    showToast("섹터에서 뺐어요");
  });
  box.querySelectorAll("[data-move]").forEach((b) =>
    b.addEventListener("click", () => {
      const to = mineDraft.sectors.find((s) => s.id === b.dataset.move);
      if (!to) return;
      sec.symbols = sec.symbols.filter((s) => s !== symbol);
      if (!to.symbols.includes(symbol)) to.symbols.push(symbol);
      close();
      mineRefresh();
      showToast(`「${to.name}」(으)로 옮겼어요`);
    })
  );
}

// ---- 종목 검색·추가 시트 ----
const MINE_TABS = [["kr", "한국주식"], ["us", "미국주식"], ["etf", "ETF"], ["crypto", "비트코인"]];
const MINE_PAGE = 30; // 종목 목록은 30개씩, 아래 "더보기"로 계속
let mineAddState = null; // { secId, tab, selected:Set, query }
function mineTabCompanies(tab) {
  const get = (d) => (typeof d !== "undefined" && d && d.companies ? d.companies : []);
  let list = [];
  if (tab === "kr") list = get(typeof KR_CORE_DATA !== "undefined" ? KR_CORE_DATA : undefined).concat(typeof KR_EXTRA_DATA !== "undefined" ? get(KR_EXTRA_DATA) : []);
  else if (tab === "us") list = get(typeof SP500_CORE_DATA !== "undefined" ? SP500_CORE_DATA : undefined).concat(typeof SP500_EXTRA_DATA !== "undefined" ? get(SP500_EXTRA_DATA) : []);
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
  mineAddState = { secId, tab: "kr", selected: new Set(sec.symbols), query: "", shown: MINE_PAGE };
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
    list = [...idx.values()].filter((c) => (c.symbol || "").toLowerCase().includes(q) || (koNameOf(c.symbol, c.name) || "").toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q)).sort((a, b) => mineUsdCap(b) - mineUsdCap(a));
  } else {
    list = mineTabCompanies(st.tab);
  }
  const total = list.length;
  list = list.slice(0, st.shown);
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
    if (total > list.length) box.innerHTML += `<button type="button" class="mine-more" id="mineMoreBtn">더보기 (${list.length}/${total})</button>`;
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
  const wasEmpty = !sec.symbols.length;
  sec.symbols = sel;
  sec.r = mineAutoRadius(sel.length);
  if (!mineFindSpot(mineDraft, sec, wasEmpty && mineDraft.sectors.length > 1)) showToast("놓을 자리가 부족해요. 정렬을 눌러 섹터를 모아 보세요");
  const id = sec.id;
  mineCloseAddSheet();
  mineRefresh(id);
}

// ---- 섹터 추가(이름 + 색) ----
function mineOpenAddSectorModal() {
  if (!mineDraft) return;
  const idx = mineDraft.sectors.length;
  let color = MINE_COLORS[idx % MINE_COLORS.length];
  const { box, close } = mineModal(
    `<b>새 섹터</b><input type="text" maxlength="14" placeholder="섹터 이름 (예: 반도체)" value="${mineEsc(mineUniqueName(`섹터 ${idx + 1}`))}" />
     <div class="mine-color-pick"><span>색</span><div class="mine-color-row">${mineColorChoices(color)}</div></div>
     <div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary">추가</button></div>`
  );
  const input = box.querySelector("input[type=text]");
  const mark = (c) => box.querySelectorAll(".mine-color-row .mine-swatch").forEach((s) => s.classList.toggle("picked", s.dataset.color === c));
  box.querySelector(".mine-color-row").addEventListener("click", (e) => {
    const sw = e.target.closest("button.mine-swatch");
    if (sw) {
      color = sw.dataset.color;
      mark(color);
    }
  });
  box.querySelector("input[data-custom]").addEventListener("input", (e) => {
    color = e.target.value;
    mark(null);
  });
  const ok = () => {
    const name = input.value.trim();
    if (!name) return;
    close();
    const sec = mineNewSector(name, color);
    mineDraft.sectors.push(sec);
    if (!mineFindSpot(mineDraft, sec, true)) {
      mineDraft.sectors.pop();
      showToast("놓을 자리가 부족해요. 정렬을 눌러 섹터를 모아 보세요");
      return;
    }
    mineSelectedSectorId = sec.id;
    mineRefresh(sec.id);
  };
  box.querySelector("[data-ok]").addEventListener("click", ok);
  input.addEventListener("keydown", (e) => e.key === "Enter" && ok());
  setTimeout(() => {
    input.focus();
    input.select();
  }, 60);
}

// ---- 시장 복사·붙여넣기 ----
// 지금 있는 모든 시장(코스피200 … 내가 만든 시장)을 목록으로 보여주고, 누르면 그 시장의 섹터·종목을 그대로 가져온다.
// 가져온 섹터가 위에, 기존 섹터와 앞으로 추가할 섹터는 그 아래에 놓인다.
function mineOpenCopySheet() {
  if (!mineDraft) return;
  const keys = [...MAP_VIEW_ORDER, ...mineViewKeys().filter((k) => k !== mineViewKey(mineDraft.id))].filter((k) => MAP_VIEWS[k]);
  const { box, close } = mineModal(
    `<b>복사할 시장을 고르세요</b>
     <div class="mine-copy-list">${keys.map((k) => `<button type="button" class="mine-copy-item" data-view="${mineEsc(k)}">${viewMarkHtml(k)}<span>${mineEsc(MAP_VIEWS[k].label)}</span></button>`).join("")}</div>
     <div class="mine-modal-actions"><button type="button" data-no>닫기</button></div>`,
    true
  );
  box.querySelector(".mine-copy-list").addEventListener("click", async (e) => {
    const item = e.target.closest(".mine-copy-item");
    if (!item) return;
    const key = item.dataset.view;
    item.classList.add("loading");
    item.querySelector("span").textContent = "불러오는 중...";
    try {
      await mineEnsureViewData(key);
    } catch {
      showToast("종목 데이터를 불러오지 못했어요. 다시 시도해주세요");
      close();
      return;
    }
    close();
    mineImportView(key);
  });
}
function mineImportView(viewKey) {
  if (!mineDraft) return;
  const v = MAP_VIEWS[viewKey];
  let data;
  if (v.mine) {
    const src = MY_MARKETS.find((m) => m.id === v.mine);
    data = null;
    if (src) {
      const fresh = src.sectors.map((s) => ({ name: s.name, color: s.color, symbols: s.symbols.slice() }));
      return mineAddImported(fresh, v.label);
    }
    return;
  }
  data = computeViewData(viewKey);
  const by = new Map();
  (data.companies || []).forEach((c) => {
    if (!c || !c.symbol) return;
    const name = c.sectorKo || c.sector || "기타";
    if (!by.has(name)) by.set(name, { name, rawSector: c.sector, symbols: [], cap: 0 });
    const g = by.get(name);
    g.symbols.push(c.symbol);
    g.cap += mineUsdCap(c);
  });
  const secs = [...by.values()].sort((a, b) => b.cap - a.cap).map((g) => ({ name: g.name, color: sectorColor(g.rawSector), symbols: g.symbols }));
  mineAddImported(secs, v.label);
}
function mineAddImported(secs, fromLabel) {
  if (!secs.length) {
    showToast("가져올 종목이 없어요");
    return;
  }
  // 아무것도 안 담긴 첫 섹터 하나뿐이면 그 빈 섹터는 치우고 가져온 섹터로 채움
  if (mineDraft.sectors.length === 1 && !mineDraft.sectors[0].symbols.length) mineDraft.sectors = [];
  const taken = new Set(mineDraft.sectors.flatMap((s) => s.symbols));
  const existing = mineDraft.sectors.slice();
  const fresh = [];
  let skipped = 0;
  secs.forEach((s, i) => {
    const symbols = s.symbols.filter((sym) => {
      if (taken.has(sym)) {
        skipped++;
        return false;
      }
      taken.add(sym);
      return true;
    });
    if (!symbols.length) return;
    fresh.push({ id: mineUid(), name: mineUniqueNameAmong(s.name, [...existing, ...fresh]), color: s.color || MINE_COLORS[i % MINE_COLORS.length], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: mineSecRadiusFor(symbols.length), symbols });
  });
  if (!fresh.length) {
    showToast("이미 모두 담겨 있어요");
    return;
  }
  mineDraft.sectors = [...fresh, ...existing];
  mineStackGroups([fresh, existing]); // 가져온 섹터가 위, 기존 섹터가 그 아래
  mineSelectedSectorId = fresh[0].id;
  mineRefresh();
  mineFitView(true);
  showToast(`${fromLabel}에서 섹터 ${fresh.length}개를 가져왔어요${skipped ? ` (이미 담긴 ${skipped}개 제외)` : ""}`);
}
function mineUniqueNameAmong(base, list) {
  const names = new Set(list.map((s) => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

// ---- 테마로 가져오기(한국 15 + 미국 15) ----
function mineOpenThemeSheet() {
  if (!mineDraft) return;
  if (typeof MINE_THEMES === "undefined") {
    showToast("테마 목록을 불러오지 못했어요");
    return;
  }
  const picked = new Set();
  const section = (label, key) =>
    `<div class="mine-theme-sec"><div class="mine-theme-head"><b>${label}</b><button type="button" class="mine-theme-all" data-all="${key}">전체 선택</button></div><div class="mine-theme-grid">${Object.keys(MINE_THEMES[key])
      .map((t) => `<button type="button" class="mine-theme-chip" data-key="${key}" data-theme="${mineEsc(t)}">${mineEsc(t)}<small>${MINE_THEMES[key][t].length}</small></button>`)
      .join("")}</div></div>`;
  const { box, close } = mineModal(
    `<b>테마로 가져오기</b><p class="mine-theme-note">체크한 테마마다 섹터가 만들어져요. 한 종목은 가장 대표적인 테마 1곳에만 들어 있고, 어느 테마에도 안 맞는 종목은 넣지 않았어요.</p>
     ${section("한국 테마", "kr")}${section("미국 테마", "us")}
     <div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary">추가하기</button></div>`,
    true
  );
  const okBtn = box.querySelector("[data-ok]");
  const sync = () => {
    okBtn.textContent = picked.size ? `추가하기 (${picked.size})` : "추가하기";
  };
  const idOf = (key, t) => `${key}|${t}`;
  box.addEventListener("click", (e) => {
    const chip = e.target.closest(".mine-theme-chip");
    if (chip) {
      const id = idOf(chip.dataset.key, chip.dataset.theme);
      if (picked.has(id)) picked.delete(id);
      else picked.add(id);
      chip.classList.toggle("on", picked.has(id));
      sync();
      return;
    }
    const all = e.target.closest(".mine-theme-all");
    if (all) {
      const key = all.dataset.all;
      const chips = [...box.querySelectorAll(`.mine-theme-chip[data-key="${key}"]`)];
      const allOn = chips.every((c) => picked.has(idOf(key, c.dataset.theme)));
      chips.forEach((c) => {
        const id = idOf(key, c.dataset.theme);
        if (allOn) picked.delete(id);
        else picked.add(id);
        c.classList.toggle("on", picked.has(id));
      });
      all.textContent = allOn ? "전체 선택" : "선택 해제";
      sync();
    }
  });
  okBtn.addEventListener("click", async () => {
    if (!picked.size) return;
    okBtn.textContent = "불러오는 중...";
    try {
      await mineEnsureData();
      if (typeof NDX_EXTRA_DATA === "undefined") await ensureNdxDataLoaded().catch(() => {});
    } catch {}
    close();
    const taken = new Set(mineDraft.sectors.flatMap((s) => s.symbols));
    const emptyFirst = mineDraft.sectors.length === 1 && !mineDraft.sectors[0].symbols.length;
    if (emptyFirst) mineDraft.sectors = [];
    const existing = mineDraft.sectors.slice();
    const idx = mineCompanyIndex();
    const fresh = [];
    let skipped = 0;
    [...picked].forEach((id, i) => {
      const [key, theme] = id.split("|");
      const symbols = (MINE_THEMES[key][theme] || []).filter((sym) => {
        if (!idx.has(sym)) return false;
        if (taken.has(sym)) {
          skipped++;
          return false;
        }
        taken.add(sym);
        return true;
      });
      if (!symbols.length) return;
      fresh.push({ id: mineUid(), name: mineUniqueNameAmong(`${theme} (${key === "kr" ? "한국" : "미국"})`, [...existing, ...fresh]), color: MINE_COLORS[(existing.length + fresh.length) % MINE_COLORS.length], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: mineSecRadiusFor(symbols.length), symbols });
    });
    if (!fresh.length) {
      if (emptyFirst) mineDraft.sectors = [mineNewSector("섹터 1")];
      showToast("추가할 종목이 없어요");
      return;
    }
    mineDraft.sectors = [...existing, ...fresh];
    mineStackGroups([existing, fresh]); // 기존 섹터 위, 새 테마 섹터는 그 아래
    mineSelectedSectorId = fresh[0].id;
    mineRefresh();
    mineFitView(true);
    showToast(`테마 섹터 ${fresh.length}개를 추가했어요${skipped ? ` (이미 담긴 ${skipped}개 제외)` : ""}`);
  });
}

// ---- 섹터 합치기 / 분리 ----
function mineOpenMergeModal() {
  if (!mineDraft || mineDraft.sectors.length < 2) {
    showToast("합칠 섹터가 2개 이상 필요해요");
    return;
  }
  const picked = new Set();
  const { box, close } = mineModal(
    `<b>섹터 합치기</b><p class="mine-theme-note">합칠 섹터를 2개 이상 고르세요. 종목이 한 섹터로 모여요.</p>
     <div class="mine-pick-list">${mineDraft.sectors.map((s) => `<button type="button" class="mine-pick-row" data-id="${s.id}"><i style="background:${mineEsc(s.color)}"></i><span>${mineEsc(s.name)}</span><small>${s.symbols.length}종목</small><em class="mine-check"></em></button>`).join("")}</div>
     <input type="text" maxlength="14" placeholder="합친 섹터 이름" />
     <div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary" disabled>합치기</button></div>`,
    true
  );
  const input = box.querySelector("input");
  const okBtn = box.querySelector("[data-ok]");
  box.querySelector(".mine-pick-list").addEventListener("click", (e) => {
    const row = e.target.closest(".mine-pick-row");
    if (!row) return;
    const id = row.dataset.id;
    if (picked.has(id)) picked.delete(id);
    else picked.add(id);
    row.classList.toggle("on", picked.has(id));
    okBtn.disabled = picked.size < 2;
    const first = mineDraft.sectors.find((s) => picked.has(s.id));
    if (first && !input.dataset.touched) input.value = first.name;
  });
  input.addEventListener("input", () => (input.dataset.touched = "1"));
  okBtn.addEventListener("click", () => {
    const sel = mineDraft.sectors.filter((s) => picked.has(s.id));
    if (sel.length < 2) return;
    const target = sel[0];
    const name = input.value.trim() || target.name;
    const symbols = [...new Set(sel.flatMap((s) => s.symbols))];
    mineDraft.sectors = mineDraft.sectors.filter((s) => s.id === target.id || !picked.has(s.id));
    target.symbols = symbols;
    target.name = mineUniqueNameAmong(name, mineDraft.sectors.filter((s) => s.id !== target.id));
    target.r = Math.max(target.r, mineAutoRadius(symbols.length));
    close();
    if (!mineFindSpot(mineDraft, target, false)) mineGather(mineDraft);
    mineSelectedSectorId = target.id;
    mineRefresh(target.id);
    showToast(`섹터 ${sel.length}개를 하나로 합쳤어요`);
  });
}
function mineOpenSplitModal() {
  const sec = mineSelectedSector() || (mineDraft && mineDraft.sectors[0]);
  if (!sec || sec.symbols.length < 2) {
    showToast("분리하려면 종목이 2개 이상인 섹터를 선택하세요");
    return;
  }
  const idx = mineCompanyIndex();
  const picked = new Set();
  const { box, close } = mineModal(
    `<b>「${mineEsc(sec.name)}」 분리</b><p class="mine-theme-note">새 섹터로 떼어 낼 종목을 고르세요.</p>
     <div class="mine-pick-list">${sec.symbols
       .map((sym) => {
         const c = idx.get(sym);
         return `<button type="button" class="mine-pick-row" data-sym="${mineEsc(sym)}"><span>${mineEsc(c ? koNameOf(sym, c.name) : sym)}</span><em class="mine-check"></em></button>`;
       })
       .join("")}</div>
     <input type="text" maxlength="14" placeholder="새 섹터 이름" value="${mineEsc(mineUniqueName(sec.name + " 2"))}" />
     <div class="mine-modal-actions"><button type="button" data-no>취소</button><button type="button" data-ok class="primary" disabled>분리하기</button></div>`,
    true
  );
  const okBtn = box.querySelector("[data-ok]");
  box.querySelector(".mine-pick-list").addEventListener("click", (e) => {
    const row = e.target.closest(".mine-pick-row");
    if (!row) return;
    const s = row.dataset.sym;
    if (picked.has(s)) picked.delete(s);
    else picked.add(s);
    row.classList.toggle("on", picked.has(s));
    okBtn.disabled = picked.size < 1 || picked.size >= sec.symbols.length;
  });
  okBtn.addEventListener("click", () => {
    const name = box.querySelector("input").value.trim() || mineUniqueName(sec.name + " 2");
    const moved = sec.symbols.filter((s) => picked.has(s));
    if (!moved.length || moved.length >= sec.symbols.length) return;
    sec.symbols = sec.symbols.filter((s) => !picked.has(s));
    sec.r = mineAutoRadius(sec.symbols.length);
    const ns = { id: mineUid(), name: mineUniqueName(name), color: MINE_COLORS[mineDraft.sectors.length % MINE_COLORS.length], x: MINE_WORLD / 2, y: MINE_WORLD / 2, r: mineAutoRadius(moved.length), symbols: moved };
    mineDraft.sectors.push(ns);
    close();
    if (!mineFindSpot(mineDraft, ns, true)) mineGather(mineDraft);
    mineSelectedSectorId = ns.id;
    mineRefresh();
    mineFitView(true);
    showToast(`「${ns.name}」 섹터로 분리했어요`);
  });
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
  // 완료 아래 "정렬": 센터를 중심으로 섹터끼리 겹치지 않게 딱 붙여 모음
  $("mineArrangeBtn").addEventListener("click", () => {
    if (!mineEditing || !mineDraft) return;
    mineGather(mineDraft);
    mineRefresh();
    mineFitView(true);
    showToast("섹터를 가운데로 모아 정렬했어요");
  });
  $("mineBar").addEventListener("click", (e) => {
    if (e.target.closest("#mineAddSectorBtn")) return mineOpenAddSectorModal();
    if (e.target.closest("#mineCopyBtn")) return mineOpenCopySheet();
    if (e.target.closest("#mineThemeBtn")) return mineOpenThemeSheet();
    if (e.target.closest("#mineMergeBtn")) return mineOpenMergeModal();
    if (e.target.closest("#mineSplitBtn")) return mineOpenSplitModal();
    if (e.target.closest("#mineMoveBtn")) {
      mineMoveMode = !mineMoveMode;
      mineSyncUi();
      mineUpdateSelLabel();
      showToast(mineMoveMode ? "이동 모드 — 섹터를 끌어서 옮기세요" : "이동 모드 해제");
      return;
    }
    const sw = e.target.closest(".mine-swatch[data-color]");
    if (sw) {
      const sec = mineSelectedSector();
      if (!sec) return;
      sec.color = sw.dataset.color;
      mineRerender();
      mineUpdateSelLabel();
      return;
    }
    if (e.target.closest("#mineDeleteBtn")) {
      mineConfirm(`'${mineDraft.name}' 시장을 삭제할까요? 되돌릴 수 없어요.`, "삭제", async () => {
        const id = mineDraft.id;
        mineDeleteMarketById(id);
        const keys = visibleMapViews();
        await setMapView(keys.includes("sp200") ? "sp200" : keys[0], false);
        showToast("시장을 삭제했어요");
      });
    }
  });
  // 색 직접 고르기(색상 선택기)
  $("mineBar").addEventListener("input", (e) => {
    if (e.target.id !== "mineColorInput") return;
    const sec = mineSelectedSector();
    if (!sec) return;
    sec.color = e.target.value;
    mineRerender();
  });
  // 종목 추가 시트
  $("mineAddBack").addEventListener("click", (e) => e.target === $("mineAddBack") && mineCloseAddSheet());
  $("mineTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".mine-tab");
    if (!b || !mineAddState) return;
    mineAddState.tab = b.dataset.tab;
    mineAddState.query = "";
    mineAddState.shown = MINE_PAGE;
    $("mineSearchInput").value = "";
    mineRenderAddSheet();
  });
  $("mineSearchInput").addEventListener("input", (e) => {
    if (!mineAddState) return;
    mineAddState.query = e.target.value.trim();
    mineAddState.shown = MINE_PAGE;
    mineRenderAddSheet();
  });
  $("mineAddList2").addEventListener("click", (e) => {
    if (e.target.closest(".mine-more") && mineAddState) {
      const box = $("mineAddList2");
      const top = box.scrollTop;
      mineAddState.shown += MINE_PAGE;
      mineRenderAddSheet();
      box.scrollTop = top; // 늘어난 줄만 아래에 붙고 보던 자리는 그대로
      return;
    }
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
    mineMoveMode = false;
    mineDraft = null;
    mineSyncUi();
  }
  if (mineIdOf(viewKey)) {
    const label = document.getElementById("mapViewBtnLabel");
    if (label) label.textContent = "불러오는 중...";
    try {
      await mineEnsureData();
      if (typeof IPO_MAP_DATA === "undefined" || typeof NDX_EXTRA_DATA === "undefined") {
        // 복사해 온 신규상장·나스닥 종목이 있을 수 있어 조용히 함께 불러옴(실패해도 무시)
        await Promise.all([typeof IPO_MAP_DATA === "undefined" ? ensureIpoMapDataLoaded().catch(() => {}) : null, typeof NDX_EXTRA_DATA === "undefined" ? ensureNdxDataLoaded().catch(() => {}) : null]);
      }
    } catch {
      showToast("종목 데이터를 불러오지 못했어요. 다시 시도해주세요");
      syncMapViewUi();
      return false;
    }
  }
  return true;
}
