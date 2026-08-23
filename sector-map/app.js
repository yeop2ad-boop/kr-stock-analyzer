// ---------- 섹터맵 (S&P 500 원형 버블맵) ----------
// data/sp500-data.js 가 만들어둔 전역 SP500_DATA({companies:[{symbol,name,sector,sectorKo,marketCap}]})를
// d3-hierarchy의 pack 레이아웃(원형 트리맵)에 태워 섹터별로 묶은 원들을 그린 뒤, 지도앱처럼 손가락/휠로 확대·축소·이동한다.

const WORLD_SIZE = 2000; // .map-world 의 world-space 좌표 크기(px, CSS와 동일해야 함)

const SECTOR_COLOR_VAR = {
  "Information Technology": "--sector-technology",
  "Health Care": "--sector-healthcare",
  Financials: "--sector-financials",
  "Consumer Discretionary": "--sector-consumer-discretionary",
  "Consumer Staples": "--sector-consumer-staples",
  "Communication Services": "--sector-communication",
  Industrials: "--sector-industrials",
  Energy: "--sector-energy",
  Utilities: "--sector-utilities",
  "Real Estate": "--sector-real-estate",
  Materials: "--sector-materials",
};

function sectorColor(sector) {
  const varName = SECTOR_COLOR_VAR[sector] || "--sector-industrials";
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#888";
}

// 등락률 색상: finviz map 방식 — +3% 이상 빨강, 0%(=배경색인 흰색) 기준, -3% 이하 진한 파랑으로 선형 보간
const CHG_BG = [255, 255, 255]; // 지도 배경색(--bg-map)과 동일
const CHG_POS_MAX = [230, 25, 25]; // 빨강
const CHG_NEG_MAX = [21, 71, 199]; // 진한 파랑
const CHG_CLAMP = 3; // %

function mixRgb(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

function changeColor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return { rgb: CHG_BG, css: `rgb(${CHG_BG.join(",")})`, t: 0 };
  }
  const clamped = Math.max(-CHG_CLAMP, Math.min(CHG_CLAMP, pct));
  const t = clamped / CHG_CLAMP; // -1..1
  const rgb = t >= 0 ? mixRgb(CHG_BG, CHG_POS_MAX, t) : mixRgb(CHG_BG, CHG_NEG_MAX, -t);
  return { rgb, css: `rgb(${rgb.join(",")})`, t };
}

// 위 changeColor()는 어두운 지도 배경 위 테두리용(0%=배경색과 동일한 검정에 수렴).
// 흰 배경인 상세 시트의 텍스트에 그대로 쓰면 0%일 때 거의 안 보이므로, 0%를 중간 회색으로 둔 텍스트 전용 버전을 따로 둔다.
const CHG_TEXT_NEUTRAL = [107, 114, 128]; // --text-mid
function changeColorForText(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return `rgb(${CHG_TEXT_NEUTRAL.join(",")})`;
  const clamped = Math.max(-CHG_CLAMP, Math.min(CHG_CLAMP, pct));
  const t = clamped / CHG_CLAMP;
  const rgb = t >= 0 ? mixRgb(CHG_TEXT_NEUTRAL, CHG_POS_MAX, t) : mixRgb(CHG_TEXT_NEUTRAL, CHG_NEG_MAX, -t);
  return `rgb(${rgb.join(",")})`;
}

// 매번 외부(financialmodelingprep)에서 개별 요청하면 느려서, 미리 받아둔 로컬 캐시(logos/)를 우선 쓰고
// 혹시 못 받아둔 심볼만 그때그때 외부 URL로 폴백한다(logo-failed 클래스가 붙기 전 마지막 시도).
// 로컬 캐시는 저(32px)/중(80px)/고(250px, 원본) 3단계로 나눠서, 화면에 실제로 보이는 크기에 맞는 것만 불러온다
// (지도를 축소해서 보면 대부분 low만, 특정 섹터로 확대했을 때만 그 종목들이 mid/high로 자동 승급됨).
function logoUrl(symbol, tier) {
  return `logos/${tier || "low"}/${encodeURIComponent(symbol)}.png`;
}
function logoUrlFallback(symbol) {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}
function pickLogoTier(onScreenRadiusPx) {
  if (onScreenRadiusPx >= 55) return "high";
  if (onScreenRadiusPx >= 20) return "mid";
  return "low";
}

function fmtMarketCap(n) {
  if (n === null || n === undefined) return "정보 없음";
  const t = 1e12, b = 1e9, m = 1e6;
  if (n >= t) return `$${(n / t).toFixed(2)}조`;
  if (n >= b) return `$${(n / b).toFixed(1)}십억`;
  if (n >= m) return `$${(n / m).toFixed(0)}백만`;
  return `$${n.toLocaleString()}`;
}

// 원화 금액용 — 억/조 단위(한국식 그룹핑)로 표기
function fmtWonCompact(n) {
  if (n === null || n === undefined) return "정보 없음";
  const sign = n < 0 ? "-" : "";
  const eok = Math.round(Math.abs(n) / 1e8);
  const jo = Math.floor(eok / 10000);
  const rest = eok % 10000;
  if (jo > 0 && rest > 0) return `${sign}${jo}조 ${rest.toLocaleString()}억원`;
  if (jo > 0) return `${sign}${jo}조원`;
  if (eok > 0) return `${sign}${eok.toLocaleString()}억원`;
  return `${sign}${Math.round(Math.abs(n)).toLocaleString()}원`;
}

// ---------- 1) pack 레이아웃 데이터 만들기 ----------
function buildPackedRoot(data) {
  const bySector = new Map();
  for (const c of data.companies) {
    if (!c.marketCap) continue;
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector).push(c);
  }
  const children = [...bySector.entries()].map(([sector, companies]) => ({
    name: sector,
    sectorKo: companies[0].sectorKo,
    children: companies.map((c) => ({ ...c, value: c.marketCap })),
  }));

  const root = d3.hierarchy({ name: "root", children }).sum((d) => d.value).sort((a, b) => b.value - a.value);

  d3.pack().size([WORLD_SIZE, WORLD_SIZE]).padding((d) => (d.depth === 1 ? 30 : 2))(root);

  return root;
}

// ---------- 2) DOM 렌더링 ----------
const mapWorld = document.getElementById("mapWorld");
const mapViewport = document.getElementById("mapViewport");
const loadingIndicator = document.getElementById("loadingIndicator");
const bubbleBySymbol = new Map(); // symbol -> .company-bubble 엘리먼트(지표 범위 필터 적용 시 빠르게 찾기용)

// 국내/해외 전환 — 지금 화면에 그려진 데이터셋. KR_SECTOR_DATA는 data/kr-data.js가 만들어둠(없으면 국내 전환 시 안내만 표시)
let ACTIVE_MARKET = "overseas";
let ACTIVE_DATA = SP500_DATA;

// 섹터 이름표를 "로고 하나"처럼 취급 — 섹터 원 맨 위 가장자리에 딱 붙여 고정하고,
// d3-force로 (1) 종목 원끼리 절대 안 겹치게(사이즈별 최소 간격), (2) 이름표(알약 모양 사각형)와도 안 겹치게 풀어낸다.
// 이름표 회피는 원형이 아니라 실제 알약 모양(둥근 사각형)에 맞춰 계산해서, 필요한 곳(제목 바로 위/아래)만
// 자연스럽게 비켜가고 엉뚱하게 큰 원형으로 밀려나지 않도록 한다. 원래 pack 위치에서 최대한 적게 움직이도록
// 약한 복원력(forceX/forceY)도 함께 걸어서, 꼭 필요한 원들만 자리를 살짝 양보하게 만든다.
function layoutSectorLabel(sectorNode) {
  const kids = sectorNode.children;
  const fontSize = Math.max(13, Math.min(30, sectorNode.r * 0.11));
  const text = `${sectorNode.data.sectorKo} · ${kids.length}`;
  const pillW = text.length * fontSize * 0.62 + 28;
  const pillH = fontSize * 1.9;
  const labelX = sectorNode.x;
  const labelY = sectorNode.y - sectorNode.r + pillH * 0.42; // 섹터 원 맨 위 가장자리에 딱 붙임(경계에 걸치도록)
  const halfW = pillW / 2 + 3;
  const halfH = pillH / 2 + 3;

  for (const c of kids) {
    c.x0 = c.x;
    c.y0 = c.y;
  }

  const sim = d3
    .forceSimulation(kids)
    .force(
      "collide",
      // forceCollide는 충돌한 두 노드의 반지름을 더해서 최소 거리로 쓰므로, 노드별로 반지름을 살짝 부풀려두면
      // 두 노드 사이 실제 간격이 (원래 반지름 합) + (사이즈 비례 여백)이 되어 사이즈별 최소 간격 효과를 낸다.
      d3.forceCollide((d) => d.r * 1.045 + 0.8).iterations(4)
    )
    .force("pullX", d3.forceX((d) => d.x0).strength(0.25))
    .force("pullY", d3.forceY((d) => d.y0).strength(0.25))
    .force("avoidLabel", () => {
      for (const n of kids) {
        const dx = n.x - labelX;
        const dy = n.y - labelY;
        const insideX = Math.abs(dx) < halfW;
        const insideY = Math.abs(dy) < halfH;
        if (insideX && insideY) {
          // 중심이 알약 사각형 안에 있으면 가장 가까운 변으로 밀어냄
          const toRight = halfW - dx, toLeft = halfW + dx;
          const toBottom = halfH - dy, toTop = halfH + dy;
          const m = Math.min(toRight, toLeft, toBottom, toTop);
          if (m === toRight) n.x = labelX + halfW + n.r;
          else if (m === toLeft) n.x = labelX - halfW - n.r;
          else if (m === toBottom) n.y = labelY + halfH + n.r;
          else n.y = labelY - halfH - n.r;
          continue;
        }
        const cx = Math.max(labelX - halfW, Math.min(n.x, labelX + halfW));
        const cy = Math.max(labelY - halfH, Math.min(n.y, labelY + halfH));
        const ddx = n.x - cx;
        const ddy = n.y - cy;
        const d = Math.hypot(ddx, ddy);
        if (d < n.r) {
          const ux = d < 1e-6 ? 0 : ddx / d;
          const uy = d < 1e-6 ? -1 : ddy / d;
          n.x = cx + ux * n.r;
          n.y = cy + uy * n.r;
        }
      }
    })
    .force("boundary", () => {
      for (const n of kids) {
        const dx = n.x - sectorNode.x;
        const dy = n.y - sectorNode.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const maxD = sectorNode.r - n.r - 1.5;
        if (d > maxD && maxD > 0) {
          const k = maxD / d;
          n.x = sectorNode.x + dx * k;
          n.y = sectorNode.y + dy * k;
        }
      }
    })
    .stop();

  for (let i = 0; i < 150; i++) sim.tick();

  for (const c of kids) {
    delete c.x0;
    delete c.y0;
  }

  const labelR = Math.hypot(pillW, pillH) / 2;

  return { x: labelX, y: labelY, r: labelR, w: pillW, h: pillH, fontSize, text };
}

function renderSectorNameBubble(sectorNode, pos, color) {
  const el = document.createElement("div");
  el.className = "sector-name-bubble";
  el.style.setProperty("--sc", color);
  el.style.left = `${pos.x - pos.w / 2}px`;
  el.style.top = `${pos.y - pos.h / 2}px`;
  el.style.width = `${pos.w}px`;
  el.style.height = `${pos.h}px`;
  el.style.fontSize = `${pos.fontSize}px`;
  el.textContent = pos.text;
  el.addEventListener("click", () => zoomToNode(sectorNode));
  return el;
}

function renderMap(root) {
  const frag = document.createDocumentFragment();

  for (const sectorNode of root.children) {
    const color = sectorColor(sectorNode.data.name);
    const bubble = document.createElement("div");
    bubble.className = "sector-bubble";
    bubble.style.setProperty("--sc", color);
    bubble.style.left = `${sectorNode.x - sectorNode.r}px`;
    bubble.style.top = `${sectorNode.y - sectorNode.r}px`;
    bubble.style.width = `${sectorNode.r * 2}px`;
    bubble.style.height = `${sectorNode.r * 2}px`;

    bubble.addEventListener("click", (e) => {
      if (e.target !== bubble) return; // 하위 종목 클릭과 구분
      zoomToNode(sectorNode);
    });

    frag.appendChild(bubble);

    const labelPos = layoutSectorLabel(sectorNode);

    for (const leaf of sectorNode.children) {
      frag.appendChild(renderCompanyBubble(leaf, color));
    }

    frag.appendChild(renderSectorNameBubble(sectorNode, labelPos, color));
  }

  mapWorld.appendChild(frag);
}

function renderCompanyBubble(leaf, sectorColorValue) {
  const d = leaf.data;
  const el = document.createElement("div");
  el.className = "company-bubble";
  el.style.setProperty("--sc", sectorColorValue);
  const chg = changeColor(d.changePercent);
  el.style.setProperty("--chg", chg.css);
  const glowStrength = Math.abs(chg.t);
  if (glowStrength > 0.08) {
    el.style.setProperty("--chg-glow", `0 0 ${4 + glowStrength * 10}px ${chg.css}`);
  }
  el.style.left = `${leaf.x - leaf.r}px`;
  el.style.top = `${leaf.y - leaf.r}px`;
  el.style.width = `${leaf.r * 2}px`;
  el.style.height = `${leaf.r * 2}px`;

  const img = document.createElement("img");
  img.className = "company-logo-img";
  img.loading = "lazy";
  img.alt = d.symbol;
  img.dataset.tier = "low";
  img.src = logoUrl(d.symbol, "low");
  img.addEventListener("error", () => {
    if (!img.dataset.triedFallback) {
      img.dataset.triedFallback = "1";
      img.src = logoUrlFallback(d.symbol);
    } else {
      el.classList.add("logo-failed");
    }
  });
  el.appendChild(img);
  el.dataset.r = leaf.r; // 월드 좌표 반지름 — 화면상 크기 계산용(저/중/고화질 전환)

  const fallback = document.createElement("div");
  fallback.className = "company-fallback-badge";
  fallback.style.setProperty("--sc", sectorColorValue);
  fallback.style.fontSize = `${Math.max(9, Math.min(22, leaf.r * 0.32))}px`;
  fallback.textContent = d.symbol;
  el.appendChild(fallback);

  if (leaf.r > 26) {
    const tag = document.createElement("div");
    tag.className = "company-ticker-tag";
    tag.textContent = d.symbol;
    el.appendChild(tag);
  }

  el.addEventListener("click", () => openCompanySheet(d));

  bubbleBySymbol.set(d.symbol, el);
  return el;
}

// ---------- 3) 지도앱처럼 확대/축소/이동 ----------
const view = { x: 0, y: 0, k: 1 };
let fitK = 1;
let minK = 0.4;
const maxK = 10;

function applyTransform(animate) {
  mapWorld.style.transition = animate ? "transform 0.35s cubic-bezier(.2,.8,.3,1)" : "none";
  mapWorld.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
  scheduleLogoQualityUpdate();
}

// 화면에 실제로 보이는 크기(월드 반지름 x 현재 배율)에 맞춰 로고 화질을 저/중/고로 자동 전환.
// 드래그/휠 중에는 매 프레임 부르지 않고, 움직임이 멈춘 뒤 한 번만 전체를 훑도록 디바운스.
let logoQualityTimer = null;
function scheduleLogoQualityUpdate() {
  clearTimeout(logoQualityTimer);
  logoQualityTimer = setTimeout(updateLogoQuality, 180);
}
function updateLogoQuality() {
  for (const [symbol, el] of bubbleBySymbol) {
    if (el.classList.contains("logo-failed")) continue;
    const img = el.querySelector(".company-logo-img");
    if (!img || img.dataset.triedFallback) continue;
    const r = parseFloat(el.dataset.r || "0");
    const tier = pickLogoTier(r * view.k);
    if (img.dataset.tier !== tier) {
      img.dataset.tier = tier;
      img.src = logoUrl(symbol, tier);
    }
  }
}

function clampView() {
  view.k = Math.min(maxK, Math.max(minK, view.k));
}

function fitToViewport(animate) {
  const vw = mapViewport.clientWidth;
  const vh = mapViewport.clientHeight;
  fitK = Math.min(vw, vh) / WORLD_SIZE;
  minK = fitK * 0.55;
  view.k = fitK;
  view.x = (vw - WORLD_SIZE * view.k) / 2;
  view.y = (vh - WORLD_SIZE * view.k) / 2;
  applyTransform(animate);
}

function zoomToNode(node) {
  const vw = mapViewport.clientWidth;
  const vh = mapViewport.clientHeight;
  const targetK = Math.min(maxK, (Math.min(vw, vh) / (node.r * 2)) * 0.92);
  view.k = targetK;
  view.x = vw / 2 - node.x * targetK;
  view.y = vh / 2 - node.y * targetK;
  applyTransform(true);
}

// -- 마우스 휠 확대/축소(포인터 위치를 기준으로) --
mapViewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = mapViewport.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const worldX = (px - view.x) / view.k;
    const worldY = (py - view.y) / view.k;
    const factor = Math.exp(-e.deltaY * 0.0016);
    view.k *= factor;
    clampView();
    view.x = px - worldX * view.k;
    view.y = py - worldY * view.k;
    applyTransform(false);
  },
  { passive: false }
);

// -- 포인터(마우스/터치) 드래그 이동 + 두 손가락 핀치 줌 --
const activePointers = new Map();
let dragLast = null;
let pinchStartDist = null;
let pinchStartK = null;

mapViewport.addEventListener("pointerdown", (e) => {
  mapViewport.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  mapViewport.classList.add("grabbing");
  if (activePointers.size === 1) {
    dragLast = { x: e.clientX, y: e.clientY };
  } else if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchStartK = view.k;
  }
});

mapViewport.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1 && dragLast) {
    view.x += e.clientX - dragLast.x;
    view.y += e.clientY - dragLast.y;
    dragLast = { x: e.clientX, y: e.clientY };
    applyTransform(false);
  } else if (activePointers.size === 2 && pinchStartDist) {
    const pts = [...activePointers.values()];
    const rect = mapViewport.getBoundingClientRect();
    const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
    const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const worldX = (midX - view.x) / view.k;
    const worldY = (midY - view.y) / view.k;
    view.k = pinchStartK * (dist / pinchStartDist);
    clampView();
    view.x = midX - worldX * view.k;
    view.y = midY - worldY * view.k;
    applyTransform(false);
  }
});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size === 0) {
    dragLast = null;
    mapViewport.classList.remove("grabbing");
  } else if (activePointers.size === 1) {
    const [remaining] = activePointers.values();
    dragLast = { x: remaining.x, y: remaining.y };
    pinchStartDist = null;
  }
}
mapViewport.addEventListener("pointerup", endPointer);
mapViewport.addEventListener("pointercancel", endPointer);
mapViewport.addEventListener("pointerleave", (e) => {
  if (e.pointerId != null && activePointers.has(e.pointerId)) endPointer(e);
});

// ---------- 4) 종목 상세 바텀시트 ----------
const companySheet = document.getElementById("companySheet");
const companySheetBody = document.getElementById("companySheetBody");

function openCompanySheet(d) {
  const color = sectorColor(d.sector);
  const chgTextColor = changeColorForText(d.changePercent);
  const chgText =
    d.changePercent === null || d.changePercent === undefined
      ? "정보 없음"
      : `${d.changePercent > 0 ? "+" : ""}${d.changePercent.toFixed(2)}%`;
  companySheetBody.innerHTML = `
    <button type="button" class="sheet-close" id="sheetCloseBtn" aria-label="닫기">&times;</button>
    <div class="sheet-top-row">
      <img class="sheet-logo" src="${logoUrl(d.symbol, "mid")}" alt="${d.symbol}" onerror="if(!this.dataset.tf){this.dataset.tf='1';this.src='${logoUrlFallback(d.symbol)}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" />
      <div class="sheet-fallback-badge" style="display:none; background:${color};">${d.symbol}</div>
      <div>
        <div class="sheet-name">${d.name}</div>
        <div class="sheet-symbol">${d.symbol} · ${d.sectorKo}</div>
      </div>
    </div>
    <div class="sheet-stats">
      <div>
        <div class="sheet-stat-label">시가총액</div>
        <div class="sheet-stat-value">${d.currency === "KRW" ? fmtWonCompact(d.marketCap) : fmtMarketCap(d.marketCap)}</div>
      </div>
      <div>
        <div class="sheet-stat-label">등락률</div>
        <div class="sheet-stat-value" style="color:${chgTextColor};">${chgText}</div>
      </div>
      <div>
        <div class="sheet-stat-label">섹터</div>
        <div class="sheet-stat-value">${d.sectorKo}</div>
      </div>
    </div>
  `;
  companySheet.classList.add("open");
  document.getElementById("sheetCloseBtn").addEventListener("click", closeCompanySheet);
}
function closeCompanySheet() {
  companySheet.classList.remove("open");
}
mapViewport.addEventListener("pointerdown", (e) => {
  if (companySheet.classList.contains("open") && !companySheet.contains(e.target)) closeCompanySheet();
  if (
    rangeSheet.classList.contains("open") &&
    !rangeSheet.contains(e.target) &&
    !e.target.closest(".metric-chip")
  ) {
    closeRangeSheet();
  }
});

// ---------- 5) 상단/하단 임시 버튼 토스트 + 국내/해외 토글 ----------
const toastEl = document.getElementById("toast");
let toastTimer = null;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toast]");
  if (btn) showToast(btn.dataset.toast);
});

document.querySelectorAll(".bottom-nav-btn, .side-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.parentElement;
    group.querySelectorAll(".active").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.getElementById("colorOnlyToggle").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const on = mapWorld.classList.toggle("color-only");
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
});

document.getElementById("resetViewBtn").addEventListener("click", () => fitToViewport(true));
document.getElementById("fitAllBtn").addEventListener("click", () => fitToViewport(true));

// ---------- 6) 상단 10개 지표 버튼 → 범위 지정 바텀시트(실시간 필터) ----------
// 해외(S&P500): 매출액·현금흐름·순이익 증가율/EPS/PER/시가총액/배당률은 하루 1회 배치, 상승률·하락률·인기종목은
// 페이지가 열릴 때마다 Yahoo에서 실시간으로 새로 받아온다(refreshLiveData). 국내(KOSPI200+KOSDAQ150)는 섹터 스크리너가
// 없어 종목별로 하나씩 조회해야 해서, 10개 지표 전부 하루 1회 배치 스냅샷 값을 쓴다(배당률만 아직 수집 로직이 없어 준비중).
function buildMetrics(market) {
  const isKr = market === "domestic";
  const capFmt = isKr ? fmtWonCompact : fmtMarketCap;
  const epsFmt = isKr ? (v) => `₩${Math.round(v).toLocaleString()}` : (v) => `$${v.toFixed(2)}`;
  return {
    revenueGrowth: { label: "매출액 증가", hasData: true, get: (c) => c.revenueGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    cashFlowGrowth: { label: "현금흐름 증가", hasData: true, get: (c) => c.cashFlowGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    netIncomeGrowth: { label: "순이익 증가", hasData: true, get: (c) => c.netIncomeGrowth, fmt: (v) => `${v.toFixed(1)}%`, domainMax: 60, domainMin: -30 },
    eps: { label: "EPS", hasData: true, get: (c) => c.eps, fmt: epsFmt },
    per: { label: "PER", hasData: true, get: (c) => c.per, fmt: (v) => `${v.toFixed(1)}배`, domainMax: 80 },
    marketCap: { label: "시가총액", hasData: true, get: (c) => c.marketCap, fmt: capFmt },
    popularStocks: {
      label: "인기종목",
      hasData: true,
      needsLive: !isKr,
      get: (c) => c.dollarVolume,
      fmt: (v) => capFmt(v) + "/일",
    },
    riseRate: { label: "상승률", hasData: true, live: !isKr, get: (c) => c.changePercent, onlyPositive: true, fmt: (v) => `${v.toFixed(1)}%` },
    fallRate: { label: "하락률", hasData: true, live: !isKr, get: (c) => c.changePercent, onlyNegative: true, fmt: (v) => `${v.toFixed(1)}%` },
    dividendYield: { label: "배당률", hasData: !isKr, get: (c) => c.dividendYield, fmt: (v) => `${v.toFixed(2)}%` },
  };
}
let METRICS = buildMetrics("overseas");

function getMetricDomain(key) {
  const m = METRICS[key];
  // 실시간으로 값이 바뀌는 지표는 열 때마다 도메인을 새로 계산(캐시하면 실시간 갱신 후에도 옛 범위로 고정돼버림)
  if (m.domain && !m.live && !m.needsLive) return m.domain;
  let values = ACTIVE_DATA.companies.map(m.get).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (m.onlyPositive) values = values.filter((v) => v >= 0);
  if (m.onlyNegative) values = values.filter((v) => v <= 0);
  let min = values.length ? Math.min(...values) : 0;
  let max = values.length ? Math.max(...values) : 1;
  if (m.onlyPositive) min = 0;
  if (m.onlyNegative) max = 0;
  if (m.domainMax !== undefined) max = Math.min(max, m.domainMax);
  if (m.domainMin !== undefined) min = Math.max(min, m.domainMin);
  if (min === max) max = min + 1;
  m.domain = [min, max];
  return m.domain;
}

let activeMetricKey = null;
let activeRange = null;

const rangeSheet = document.getElementById("rangeSheet");
const rangeSheetTitle = document.getElementById("rangeSheetTitle");
const rangeSheetResetBtn = document.getElementById("rangeSheetResetBtn");
const rangeSlider = document.getElementById("rangeSlider");
const rangeSliderFill = document.getElementById("rangeSliderFill");
const rangeThumbMin = document.getElementById("rangeThumbMin");
const rangeThumbMax = document.getElementById("rangeThumbMax");
const rangeSliderLabels = document.getElementById("rangeSliderLabels");
const rangeSheetNote = document.getElementById("rangeSheetNote");
let liveDataLoaded = false; // 상승률/하락률/인기종목이 실시간 데이터로 한 번이라도 갱신됐는지

function clearMetricFilter() {
  for (const el of bubbleBySymbol.values()) el.style.display = "";
}

// 슬라이더가 움직일 때마다 바로 호출 — 500개 원을 한 번씩 훑어서 범위 밖이면 즉시 숨김(실시간 반응)
function applyMetricFilter(key, range) {
  const m = METRICS[key];
  const [selMin, selMax] = range;
  const [domMin, domMax] = m.domain;
  const isFull = selMin <= domMin && selMax >= domMax;
  for (const c of ACTIVE_DATA.companies) {
    const el = bubbleBySymbol.get(c.symbol);
    if (!el) continue;
    if (isFull) {
      el.style.display = "";
      continue;
    }
    const v = m.get(c);
    const pass = typeof v === "number" && Number.isFinite(v) && v >= selMin && v <= selMax;
    el.style.display = pass ? "" : "none";
  }
}

function updateSliderVisual() {
  const m = METRICS[activeMetricKey];
  const [domMin, domMax] = m.domain;
  const [selMin, selMax] = activeRange;
  const span = domMax - domMin || 1;
  const tMin = (selMin - domMin) / span;
  const tMax = (selMax - domMin) / span;
  rangeThumbMin.style.left = `${tMin * 100}%`;
  rangeThumbMax.style.left = `${tMax * 100}%`;
  rangeSliderFill.style.left = `${tMin * 100}%`;
  rangeSliderFill.style.right = `${(1 - tMax) * 100}%`;
}

// 슬라이더 아래 눈금 — 최소·최대만 찍지 않고 도메인을 6구간(5등분)으로 나눠 중간값도 같이 보여줌.
// 맨 끝(오른쪽)은 실제 숫자 대신 "최대"로 표기(사진 속 평형 슬라이더와 동일한 규칙).
function renderSliderTicks() {
  const m = METRICS[activeMetricKey];
  const [domMin, domMax] = m.domain;
  const steps = 5; // 6개 눈금 = 5등분
  rangeSliderLabels.innerHTML = "";
  for (let i = 0; i <= steps; i++) {
    const v = domMin + ((domMax - domMin) * i) / steps;
    const span = document.createElement("span");
    span.textContent = i === steps ? "최대" : m.fmt(v);
    rangeSliderLabels.appendChild(span);
  }
}

function openRangeSheet(key) {
  closeCompanySheet();
  activeMetricKey = key;
  const m = METRICS[key];
  rangeSheetTitle.textContent = m.label;
  document.querySelectorAll(".metric-chip").forEach((b) => b.classList.toggle("active", b.dataset.metric === key));

  clearMetricFilter();
  if (!m.hasData || (m.needsLive && !liveDataLoaded)) {
    rangeSheetNote.textContent = m.needsLive && !liveDataLoaded ? "실시간 데이터를 불러오는 중입니다..." : "데이터 준비중입니다";
    rangeSheet.classList.add("no-data");
    rangeSheet.classList.add("open");
    return;
  }
  rangeSheet.classList.remove("no-data");
  const domain = getMetricDomain(key);
  activeRange = [domain[0], domain[1]]; // 처음엔 항상 "전체" 범위
  renderSliderTicks();
  updateSliderVisual();
  rangeSheet.classList.add("open");
}

function closeRangeSheet() {
  rangeSheet.classList.remove("open");
  document.querySelectorAll(".metric-chip").forEach((b) => b.classList.remove("active"));
}

document.querySelectorAll(".metric-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.metric;
    if (activeMetricKey === key && rangeSheet.classList.contains("open")) {
      closeRangeSheet();
      clearMetricFilter();
      activeMetricKey = null;
      return;
    }
    openRangeSheet(key);
  });
});

rangeSheetResetBtn.addEventListener("click", () => {
  if (!activeMetricKey || !METRICS[activeMetricKey].hasData) return;
  const domain = getMetricDomain(activeMetricKey);
  activeRange = [domain[0], domain[1]];
  updateSliderVisual();
  clearMetricFilter();
});

let draggingThumb = null;
function pointerToValue(clientX) {
  const rect = rangeSlider.getBoundingClientRect();
  const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const [domMin, domMax] = METRICS[activeMetricKey].domain;
  return domMin + t * (domMax - domMin);
}
function bindThumb(thumbEl, which) {
  thumbEl.addEventListener("pointerdown", (e) => {
    draggingThumb = which;
    thumbEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
}
bindThumb(rangeThumbMin, "min");
bindThumb(rangeThumbMax, "max");

rangeSlider.addEventListener("pointermove", (e) => {
  if (!draggingThumb || !activeMetricKey) return;
  const v = pointerToValue(e.clientX);
  if (draggingThumb === "min") {
    activeRange[0] = Math.min(v, activeRange[1]);
  } else {
    activeRange[1] = Math.max(v, activeRange[0]);
  }
  updateSliderVisual();
  applyMetricFilter(activeMetricKey, activeRange); // 매 프레임 즉시 반영
});
window.addEventListener("pointerup", () => {
  draggingThumb = null;
});
window.addEventListener("pointercancel", () => {
  draggingThumb = null;
});

// ---------- 7) 상승률·하락률·인기종목 실시간 갱신 ----------
// 브라우저에서 직접 Yahoo Finance로 요청하면 CORS에 막히므로, 내투자닷컴 본체와 같은 방식으로
// 공개 CORS 프록시(corsproxy.io → 실패 시 allorigins)를 거쳐서 가져온다.
async function proxyFetchJson(targetUrl) {
  const proxies = [
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  ];
  let lastErr;
  for (const build of proxies) {
    try {
      const res = await fetch(build(targetUrl));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const LIVE_SECTOR_SCREENER_ID = {
  "Information Technology": "ms_technology",
  "Health Care": "ms_healthcare",
  Financials: "ms_financial_services",
  "Consumer Discretionary": "ms_consumer_cyclical",
  "Consumer Staples": "ms_consumer_defensive",
  "Communication Services": "ms_communication_services",
  Industrials: "ms_industrials",
  Energy: "ms_energy",
  Utilities: "ms_utilities",
  "Real Estate": "ms_real_estate",
  Materials: "ms_basic_materials",
};

async function fetchSectorScreenerLive(scrId) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=250`;
  const data = await proxyFetchJson(url);
  return (data && data.finance && data.finance.result && data.finance.result[0] && data.finance.result[0].quotes) || [];
}

// 동시에 너무 많이 쏘지 않도록 3개씩 묶어서 순차 처리
async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await worker(items[idx]);
      } catch {
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function refreshLiveData() {
  const companyBySymbol = new Map(ACTIVE_DATA.companies.map((c) => [c.symbol, c]));
  const sectorIds = Object.values(LIVE_SECTOR_SCREENER_ID);

  const results = await mapWithConcurrency(sectorIds, 3, fetchSectorScreenerLive);

  let updated = 0;
  for (const quotes of results) {
    if (!quotes) continue;
    for (const q of quotes) {
      if (!q || !q.symbol) continue;
      let c = companyBySymbol.get(q.symbol) || companyBySymbol.get(q.symbol.replace("-", "."));
      if (!c) continue;
      if (typeof q.regularMarketChangePercent === "number") c.changePercent = q.regularMarketChangePercent;
      if (typeof q.regularMarketPrice === "number" && typeof q.regularMarketVolume === "number") {
        c.dollarVolume = q.regularMarketPrice * q.regularMarketVolume;
      }
      updated++;
    }
  }

  if (updated === 0) return false; // 전부 실패(프록시 다운 등) — 정적 스냅샷 값 유지
  liveDataLoaded = true;
  refreshAllBubbleColors();
  if (activeMetricKey && METRICS[activeMetricKey] && (METRICS[activeMetricKey].live || METRICS[activeMetricKey].needsLive)) {
    openRangeSheet(activeMetricKey); // 지금 상승률/하락률/인기종목 시트가 열려 있으면 새 데이터로 다시 그림
  }
  showToast("실시간 시세로 갱신됨");
  return true;
}

// 원 배경/테두리 색을 최신 changePercent 기준으로 다시 칠함(값 자체는 그대로 두고 색만 갱신)
function refreshAllBubbleColors() {
  for (const c of ACTIVE_DATA.companies) {
    const el = bubbleBySymbol.get(c.symbol);
    if (!el) continue;
    const chg = changeColor(c.changePercent);
    el.style.setProperty("--chg", chg.css);
    const glowStrength = Math.abs(chg.t);
    el.style.setProperty("--chg-glow", glowStrength > 0.08 ? `0 0 ${4 + glowStrength * 10}px ${chg.css}` : "");
  }
}

// ---------- 8) 국내/해외 전환 ----------
let packedRoot = null;

function loadMarket(mode, animate) {
  ACTIVE_MARKET = mode;
  ACTIVE_DATA = mode === "domestic" ? KR_SECTOR_DATA : SP500_DATA;
  METRICS = buildMetrics(mode);

  closeCompanySheet();
  closeRangeSheet();
  activeMetricKey = null;
  activeRange = null;

  mapWorld.innerHTML = "";
  bubbleBySymbol.clear();

  packedRoot = buildPackedRoot(ACTIVE_DATA);
  renderMap(packedRoot);
  fitToViewport(!!animate);

  if (mode === "overseas") {
    refreshLiveData().catch(() => {});
  }
}

document.getElementById("marketTogglePill").addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  const mode = btn.dataset.market;
  if (mode === ACTIVE_MARKET) return;
  if (mode === "domestic" && (typeof KR_SECTOR_DATA === "undefined" || !KR_SECTOR_DATA.companies || !KR_SECTOR_DATA.companies.length)) {
    showToast("국내 섹터맵 데이터를 아직 못 불러왔어요");
    return;
  }
  document.querySelectorAll("#marketTogglePill .toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadMarket(mode, true);
});

document.getElementById("brandLogoBtn").addEventListener("click", () => {
  // 본체(내투자닷컴)로 돌아가기 — 세션 동안은 다시 섹터맵으로 안 튕기도록 플래그를 남김
  try {
    sessionStorage.setItem("ntj_skip_map_redirect", "1");
  } catch {}
  window.location.href = "../index.html";
});

// ---------- 초기화 ----------
window.addEventListener("resize", () => fitToViewport(false));

// 내투자닷컴 첫 화면에서 넘어온 경우 ?market=domestic 으로 국내를 기본값으로 염(데이터 없으면 해외로 대체)
const requestedMarket = new URLSearchParams(window.location.search).get("market");
const initialMarket =
  requestedMarket === "domestic" && typeof KR_SECTOR_DATA !== "undefined" && KR_SECTOR_DATA.companies && KR_SECTOR_DATA.companies.length
    ? "domestic"
    : "overseas";
document.querySelectorAll("#marketTogglePill .toggle-btn").forEach((b) => {
  b.classList.toggle("active", b.dataset.market === initialMarket);
});
loadMarket(initialMarket, false);
loadingIndicator.classList.add("hidden");
