// 내투자 > 투자기록 (2026-10-15)
//  · 월(1일 기준)별 보유종목·주식수를 기록하면 그 시점 시세로 추정 합산가격을 계산해 위 그래프의 "내투자선"을 그린다.
//  · 기록·계산 결과는 이 기기(localStorage)에만 저장한다. 증권사·거래소 API 자동 연동은 안내 화면만 있고 실제 자동 가져오기는 아직 없다(아래 miOpenConnect 참고).
// invest.js의 miState·miSave·miFmtWon 등과 app.js의 yahooChart·yahooSearch·resolveKoreanTicker·showToast를 쓴다.

const MI_PRICE_KEY = "my_invest_prices_v1";
const MI_PRICE_TTL = 6 * 3600 * 1000;
const miHist = {}; // sym -> { cur, last, opens:{ym:price}, cagr10 }
const miVal = {}; // ym -> { items:[{sym,name,shares,price,value,w}], total } (원)
let miCalc = null; // 마지막 계산 결과(통계)
let miMoreOpen = false;

// ---------- 시세 ----------
function miLoadPriceCache() {
  try {
    return JSON.parse(localStorage.getItem(MI_PRICE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
async function miHistory(sym, force) {
  if (miHist[sym] && !force) return miHist[sym];
  const cache = miLoadPriceCache();
  const c = cache[sym];
  if (!force && c && Date.now() - c.t < MI_PRICE_TTL) return (miHist[sym] = c.d);
  const ch = await yahooChart(sym, "10y", "1mo");
  const r = ch && ch.chart && ch.chart.result && ch.chart.result[0];
  if (!r) throw new Error(`${sym} 시세를 가져오지 못했습니다.`);
  const meta = r.meta || {};
  const off = meta.gmtoffset || 0;
  const q = r.indicators.quote[0];
  const opens = {};
  const closes = [];
  (r.timestamp || []).forEach((t, i) => {
    const d = new Date((t + off) * 1000);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const o = Number.isFinite(q.open[i]) ? q.open[i] : Number.isFinite(q.close[i]) ? q.close[i] : null;
    if (o !== null) opens[ym] = o;
    if (Number.isFinite(q.close[i]) && q.close[i] > 0) closes.push({ t, c: q.close[i] });
  });
  let cagr10 = null;
  if (closes.length >= 24) {
    const yrs = (closes[closes.length - 1].t - closes[0].t) / (365.25 * 86400);
    cagr10 = (Math.pow(closes[closes.length - 1].c / closes[0].c, 1 / yrs) - 1) * 100;
  }
  const last = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : closes.length ? closes[closes.length - 1].c : null;
  const d = { cur: meta.currency || "KRW", last, opens, cagr10 };
  miHist[sym] = d;
  cache[sym] = { t: Date.now(), d };
  try {
    localStorage.setItem(MI_PRICE_KEY, JSON.stringify(cache));
  } catch {}
  return d;
}
function miPriceAt(h, ym) {
  if (!ym) return h.last;
  if (h.opens[ym] !== undefined) return h.opens[ym];
  const keys = Object.keys(h.opens).sort();
  const before = keys.filter((k) => k <= ym).pop();
  return before ? h.opens[before] : h.last;
}
// 원화 환산 배율 — KRW=1, USD 등은 환율 월 시가
async function miFxHist(cur, force) {
  if (cur === "KRW") return null;
  return miHistory(cur === "USD" ? "KRW=X" : `${cur}KRW=X`, force);
}
function miKrwPrice(h, fx, ym) {
  const p = miPriceAt(h, ym);
  if (!Number.isFinite(p)) return null;
  if (!fx) return p;
  const f = miPriceAt(fx, ym);
  return Number.isFinite(f) ? p * f : null;
}

// ---------- 계산 ----------
function miMonths() {
  return Object.keys(miState.records || {}).filter((ym) => (miState.records[ym] || []).length).sort();
}
async function miCompute(force) {
  const months = miMonths();
  const syms = [...new Set(months.flatMap((ym) => miState.records[ym].map((r) => r.sym)))];
  const hists = {};
  const fxs = {};
  await Promise.all(
    syms.map(async (s) => {
      try {
        hists[s] = await miHistory(s, force);
        fxs[s] = await miFxHist(hists[s].cur, force);
      } catch {}
    })
  );
  const valOf = (rows, ym) => {
    const items = rows
      .map((r) => {
        const h = hists[r.sym];
        if (!h) return { ...r, price: null, value: 0 };
        const price = miKrwPrice(h, fxs[r.sym], ym);
        return { ...r, price, value: price === null ? 0 : price * r.shares };
      })
      .filter((it) => it.shares > 0);
    const total = items.reduce((a, it) => a + it.value, 0);
    items.forEach((it) => (it.w = total ? (it.value / total) * 100 : 0));
    items.sort((a, b) => b.value - a.value);
    return { items, total };
  };
  months.forEach((ym) => (miVal[ym] = valOf(miState.records[ym], ym)));
  const nowRows = months.length ? miState.records[months[months.length - 1]] : [];
  const now = nowRows.length ? valOf(nowRows, null) : { items: [], total: 0 };
  // 수익률: 보유 주식수를 고정한 채 다음 시점까지의 가격 변화만 연결(입출금 영향 제외, 시간가중)
  const ret = (rowsA, ymA, ymB) => {
    const a = valOf(rowsA, ymA);
    const b = valOf(rowsA, ymB);
    return a.total > 0 ? b.total / a.total - 1 : 0;
  };
  const segs = [];
  for (let i = 0; i < months.length; i++) {
    const ymA = months[i];
    const ymB = i + 1 < months.length ? months[i + 1] : null;
    segs.push({ end: ymB, r: ret(miState.records[ymA], ymA, ymB) });
  }
  const yr = String(new Date().getFullYear());
  const cum = segs.reduce((a, s) => a * (1 + s.r), 1) - 1;
  const ytd = segs.filter((s) => (s.end || `${yr}-12`).slice(0, 4) === yr).reduce((a, s) => a * (1 + s.r), 1) - 1;
  // 예상 수익률 = 보유 비중 × 각 종목 10년 연평균 상승률
  let wsum = 0;
  let rsum = 0;
  now.items.forEach((it) => {
    const h = hists[it.sym];
    if (h && Number.isFinite(h.cagr10)) {
      wsum += it.w;
      rsum += it.w * h.cagr10;
    }
  });
  const expected = wsum > 0 ? rsum / wsum : null;
  const totals = {};
  months.forEach((ym) => (totals[ym] = Math.round(miVal[ym].total)));
  miState.totals = totals;
  miState.currentValue = Math.round(now.total);
  miState.updatedAt = Date.now();
  miSave();
  miCalc = { months, now, cum: months.length ? cum * 100 : null, ytd: months.length ? ytd * 100 : null, expected, hists };
  return miCalc;
}
// 목표 달성 예정일(현재 추정자산 + 매달 추가금, 예상 수익률로)
function miEtaMonths(goal, extra) {
  if (!miCalc || !goal || miCalc.expected === null || !(miState.currentValue > 0)) return null;
  return miMonthsToTarget(miState.currentValue, extra, miCalc.expected, goal.amount);
}

// ---------- 화면 ----------
function miWonFull(n) {
  return `${Math.round(n || 0).toLocaleString("ko-KR")}원`;
}
function miPct(v, plus = true) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return `${plus && v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function miRenderRecords(root) {
  if (!root) return;
  const months = miMonths();
  const sel = miState.goals.find((g) => g.id === miState.selected) || miState.goals[0] || null;
  const head = `<div class="mi-sec-head mi-rec-head"><h2 class="mi-h">투자기록</h2><button type="button" class="mi-mini" id="miExtraBtn">＋추가금액</button></div>
    <p class="mi-caption">+추가금액: 매달 정기투자 예정이라면 눌러주세요${miState.extra ? ` · 현재 매달 +${Math.round(miState.extra / 1e4).toLocaleString("ko-KR")}만원` : ""}</p>`;
  const actions = `<div class="mi-actions">
      <button type="button" class="mi-act mi-act-main" id="miConnectBtn">내 증권 연동하기</button>
      <button type="button" class="mi-act" id="miAddRecBtn">＋ 월 기록 추가</button>
      <button type="button" class="mi-act" id="miUpdateBtn">업데이트하기</button>
    </div>`;
  if (!months.length) {
    root.innerHTML = `${head}
      <div class="mi-rec-empty"><b>아직 투자기록이 없어요</b><p>월 초(1일) 기준으로 가지고 있던 종목과 주식수를 적으면<br>그 시점 시세로 추정 합산가격을 계산해<br>위 그래프에 내투자선(파란 실선)을 그려요.</p></div>
      ${actions}`;
    miBindRecords(root);
    return;
  }
  root.innerHTML = `${head}<div class="mi-summary" id="miSummary"><p class="muted today-empty">시세를 불러와 계산하는 중...</p></div>${actions}<div id="miMonths"></div>`;
  miBindRecords(root);
  miCompute(false)
    .then(() => {
      // 계산이 끝나면 그래프도 새 값으로 다시 그림
      const wrap = document.querySelector(".mi-chart-wrap");
      if (wrap) {
        const svg = wrap.querySelector("svg.mi-chart");
        const goal = miState.goals.find((g) => g.id === miState.selected) || null;
        if (svg) svg.outerHTML = miChartHtml(goal, miRecordsSeries());
      }
      miPaintSummary(root, sel);
      miPaintMonths(root);
    })
    .catch(() => {
      const s = root.querySelector("#miSummary");
      if (s) s.innerHTML = `<p class="muted today-empty">시세를 불러오지 못했어요. 잠시 후 '업데이트하기'를 눌러 주세요.</p>`;
    });
}
function miPaintSummary(root, goal) {
  const box = root.querySelector("#miSummary");
  if (!box || !miCalc) return;
  const eta = goal ? miEtaMonths(goal, miState.extra || 0) : null;
  const etaText = !goal ? "목표 없음" : eta === null ? "예측 불가" : eta === 0 ? "이미 달성" : `${miMToYm(miNowM() + eta)} (${miRemainText(eta)})`;
  const cls = (v) => (v > 0 ? "up" : v < 0 ? "down" : "");
  box.innerHTML = `<div class="mi-asset"><small>추정자산</small><b>${miWonFull(miState.currentValue)}</b></div>
    <div class="mi-stats">
      <div><small>누적 수익률</small><b class="${cls(miCalc.cum)}">${miPct(miCalc.cum)}</b></div>
      <div><small>올해 수익률</small><b class="${cls(miCalc.ytd)}">${miPct(miCalc.ytd)}</b></div>
      <div><small>목표달성 예정일</small><b>${etaText}</b></div>
      <div><small>목표금액</small><b>${goal ? miFmtWon(goal.amount) : "-"}</b></div>
    </div>
    <p class="mi-fine">${miCalc.expected !== null ? `예정일은 현재 보유종목의 10년 연평균 상승률을 비중으로 평균한 ${miCalc.expected.toFixed(2)}%로 계산했어요(추정). ` : ""}수익률은 입출금을 뺀 주가 변동 기준이에요.</p>`;
}
function miPaintMonths(root) {
  const box = root.querySelector("#miMonths");
  if (!box) return;
  const months = miMonths().slice().reverse(); // 최근순
  const show = miMoreOpen ? months : months.slice(0, 6);
  const card = (ym) => {
    const v = miVal[ym];
    if (!v) return "";
    const rows = v.items
      .map((it) => `<tr><td class="n">${escapeHtml(it.name || it.sym)}</td><td>${it.shares.toLocaleString("ko-KR")}</td><td>${it.price === null ? "-" : Math.round(it.price).toLocaleString("ko-KR")}</td><td>${it.w.toFixed(1)}%</td></tr>`)
      .join("");
    return `<section class="mi-month">
      <div class="mi-month-head"><b>${ym.slice(2).replace("-", ".")}</b><span>추정 ${miWonFull(v.total)}</span><button type="button" class="mi-month-edit" data-ym="${ym}">수정</button></div>
      <table class="mi-table"><thead><tr><th class="n">기업명</th><th>주식수</th><th>가격(원)</th><th>비중</th></tr></thead><tbody>${rows}</tbody></table>
    </section>`;
  };
  box.innerHTML = `${show.map(card).join("")}${months.length > 6 ? `<button type="button" class="cat-btn load-more-btn" id="miMoreBtn">${miMoreOpen ? "− 접기" : `+더보기 (이전 ${months.length - 6}개월)`}</button>` : ""}`;
  box.querySelectorAll(".mi-month-edit").forEach((b) => b.addEventListener("click", () => miOpenRecordSheet(b.dataset.ym)));
  const more = box.querySelector("#miMoreBtn");
  if (more)
    more.addEventListener("click", () => {
      miMoreOpen = !miMoreOpen;
      miPaintMonths(root);
    });
}
function miBindRecords(root) {
  root.querySelector("#miExtraBtn").addEventListener("click", miOpenExtra);
  root.querySelector("#miConnectBtn").addEventListener("click", miOpenConnect);
  root.querySelector("#miAddRecBtn").addEventListener("click", () => miOpenRecordSheet(null));
  root.querySelector("#miUpdateBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!miMonths().length) return showToast("먼저 월 기록을 추가해 주세요.");
    btn.disabled = true;
    btn.textContent = "업데이트 중...";
    try {
      await miCompute(true);
      showToast("최신 시세로 다시 계산해 이 기기에 저장했어요");
      renderMyInvest();
    } catch {
      showToast("업데이트에 실패했어요. 잠시 후 다시 시도해 주세요.");
      btn.disabled = false;
      btn.textContent = "업데이트하기";
    }
  });
}

// ---------- 월 기록 추가/수정 ----------
function miOpenRecordSheet(ymEdit) {
  const months = miMonths();
  const nowD = new Date();
  const curYm = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
  let ym = ymEdit || curYm;
  let rows = ymEdit ? miState.records[ymEdit].map((r) => ({ ...r })) : months.length ? miState.records[months[months.length - 1]].map((r) => ({ ...r })) : [];
  if (!rows.length) rows = [{ sym: "", name: "", shares: "" }];
  const back = document.createElement("div");
  back.className = "mi-sheet-back";
  const sheet = document.createElement("div");
  sheet.className = "mi-sheet";
  back.appendChild(sheet);
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", (e) => {
    if (e.target === back) close();
  });
  const draw = () => {
    sheet.innerHTML = `<div class="mi-sheet-grab"></div>
      <div class="mi-sheet-head"><h3>${ymEdit ? "월 기록 수정" : "월 기록 추가"}</h3><button type="button" class="mi-x" aria-label="닫기">✕</button></div>
      <div class="mi-sheet-body">
        <section class="mi-step"><div class="mi-step-title"><span class="mi-step-n">1</span><div><b>기준 월</b><small>그 달 1일에 가지고 있던 종목</small></div></div>
          <input type="month" id="miYm" class="mi-month-input" value="${ym}" max="${curYm}"></section>
        <section class="mi-step"><div class="mi-step-title"><span class="mi-step-n">2</span><div><b>보유 종목과 주식수</b><small>종목 이름이나 티커를 검색해서 고르세요</small></div></div>
          <div id="miRows">${rows.map(rowHtml).join("")}</div>
          <button type="button" class="mi-addrow" id="miAddRow">＋ 종목 추가</button></section>
        <div class="mi-final"><button type="button" class="mi-primary" id="miSaveRec">저장하기</button>
          ${ymEdit ? `<button type="button" class="mi-del" id="miDelRec">이 달 기록 삭제</button>` : ""}
          <button type="button" class="mi-del" id="miPasteBtn" style="color:var(--muted)">여러 달 한꺼번에 붙여넣기(엑셀/CSV)</button></div>
      </div>`;
    bind();
  };
  const rowHtml = (r, i) => `<div class="mi-row" data-i="${i}">
      <div class="mi-row-name"><input type="text" class="mi-sym-input" placeholder="종목 검색" value="${escapeHtml(r.name || r.sym || "")}" autocomplete="off"><div class="mi-suggest"></div></div>
      <input type="text" inputmode="decimal" class="mi-shares" placeholder="주식수" value="${r.shares === "" ? "" : r.shares}">
      <button type="button" class="mi-rm" aria-label="삭제">✕</button></div>`;
  const bind = () => {
    sheet.querySelector(".mi-x").addEventListener("click", close);
    sheet.querySelector("#miYm").addEventListener("change", (e) => (ym = e.target.value || ym));
    sheet.querySelector("#miAddRow").addEventListener("click", () => {
      collect();
      rows.push({ sym: "", name: "", shares: "" });
      draw();
    });
    sheet.querySelectorAll(".mi-row").forEach((rowEl) => {
      const i = +rowEl.dataset.i;
      const inp = rowEl.querySelector(".mi-sym-input");
      const sug = rowEl.querySelector(".mi-suggest");
      let timer = null;
      inp.addEventListener("input", () => {
        rows[i].sym = "";
        rows[i].name = inp.value;
        clearTimeout(timer);
        timer = setTimeout(() => miSuggest(inp.value.trim(), sug, (it) => {
          rows[i].sym = it.symbol;
          rows[i].name = it.name;
          inp.value = it.name;
          sug.innerHTML = "";
        }), 200);
      });
      rowEl.querySelector(".mi-shares").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9.]/g, "");
        rows[i].shares = e.target.value;
      });
      rowEl.querySelector(".mi-rm").addEventListener("click", () => {
        collect();
        rows.splice(i, 1);
        if (!rows.length) rows.push({ sym: "", name: "", shares: "" });
        draw();
      });
    });
    sheet.querySelector("#miSaveRec").addEventListener("click", save);
    const del = sheet.querySelector("#miDelRec");
    if (del)
      del.addEventListener("click", () => {
        if (!window.confirm(`${ymEdit.slice(2).replace("-", ".")} 기록을 삭제할까요?`)) return;
        delete miState.records[ymEdit];
        if (miState.totals) delete miState.totals[ymEdit];
        miSave();
        close();
        renderMyInvest();
      });
    sheet.querySelector("#miPasteBtn").addEventListener("click", () => {
      close();
      miOpenPaste();
    });
  };
  const collect = () => {
    sheet.querySelectorAll(".mi-row").forEach((rowEl) => {
      const i = +rowEl.dataset.i;
      rows[i].shares = rowEl.querySelector(".mi-shares").value;
      rows[i].name = rowEl.querySelector(".mi-sym-input").value;
    });
  };
  const save = () => {
    collect();
    const clean = [];
    for (const r of rows) {
      const shares = parseFloat(r.shares);
      if (!r.name && !r.sym) continue;
      if (!(shares > 0)) return showToast("주식수를 확인해 주세요.");
      const sym = r.sym || resolveKoreanTicker(r.name);
      if (!sym) return showToast("종목을 목록에서 골라 주세요.");
      clean.push({ sym, name: r.name || sym, shares });
    }
    if (!clean.length) return showToast("보유 종목을 하나 이상 입력해 주세요.");
    if (ymEdit && ymEdit !== ym) delete miState.records[ymEdit];
    miState.records[ym] = clean;
    miSave();
    close();
    renderMyInvest();
    showToast("기록을 저장했어요. 시세로 추정 가격을 계산합니다.");
  };
  draw();
}
// 종목 검색 제안(한글 이름은 앱 내 목록, 영문·티커는 야후 검색)
async function miSuggest(q, box, onPick) {
  if (!q) {
    box.innerHTML = "";
    return;
  }
  const out = [];
  Object.entries(KOREAN_COMPANY_NAMES || {}).forEach(([name, symbol]) => name.includes(q) && out.push({ symbol, name }));
  Object.entries(KR_NAME_TO_TICKER || {}).forEach(([name, symbol]) => name.includes(q) && out.push({ symbol, name }));
  const render = (list) => {
    const seen = new Set();
    const uniq = list.filter((it) => !seen.has(it.symbol) && seen.add(it.symbol)).slice(0, 6);
    box.innerHTML = uniq.map((it) => `<button type="button" class="mi-sg" data-sym="${escapeHtml(it.symbol)}" data-name="${escapeHtml(it.name)}"><b>${escapeHtml(it.name)}</b><small>${escapeHtml(it.symbol)}</small></button>`).join("");
    box.querySelectorAll(".mi-sg").forEach((b) => b.addEventListener("click", () => onPick({ symbol: b.dataset.sym, name: b.dataset.name })));
  };
  render(out);
  try {
    const data = await yahooSearch(q);
    const eng = ((data && data.quotes) || []).filter((x) => x.symbol).map((x) => ({ symbol: x.symbol, name: TICKER_TO_KOREAN_NAME[x.symbol] || x.shortname || x.longname || x.symbol }));
    render([...out, ...eng]);
  } catch {}
}
// 여러 달 한꺼번에 붙여넣기: "2026-10, 삼성전자, 100" 한 줄에 하나
function miOpenPaste() {
  const back = document.createElement("div");
  back.className = "mi-sheet-back";
  back.innerHTML = `<div class="mi-sheet"><div class="mi-sheet-grab"></div>
    <div class="mi-sheet-head"><h3>한꺼번에 붙여넣기</h3><button type="button" class="mi-x" aria-label="닫기">✕</button></div>
    <div class="mi-sheet-body"><p class="mi-note" style="margin:0 0 10px">한 줄에 하나씩 <b>월, 종목, 주식수</b>를 쉼표나 탭으로 구분해 붙여넣으세요.<br>예) 2026-10, 삼성전자, 100 / 2026-10, AAPL, 20</p>
      <textarea id="miPasteArea" class="mi-paste" rows="9" placeholder="2026-10, 삼성전자, 100&#10;2026-10, AAPL, 20&#10;2026-09, 삼성전자, 80"></textarea>
      <div class="mi-final"><button type="button" class="mi-primary" id="miPasteSave">가져오기</button></div></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", (e) => e.target === back && close());
  back.querySelector(".mi-x").addEventListener("click", close);
  back.querySelector("#miPasteSave").addEventListener("click", () => {
    const lines = back.querySelector("#miPasteArea").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let n = 0;
    const bad = [];
    lines.forEach((line) => {
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      const ym = (parts[0] || "").replace(/\./g, "-").replace(/^(\d{4})-(\d)$/, "$1-0$2");
      const shares = parseFloat((parts[2] || "").replace(/,/g, ""));
      if (!/^\d{4}-\d{2}$/.test(ym) || !parts[1] || !(shares > 0)) return bad.push(line);
      const sym = resolveKoreanTicker(parts[1]);
      (miState.records[ym] = miState.records[ym] || []).push({ sym, name: parts[1], shares });
      n++;
    });
    if (!n) return showToast("읽을 수 있는 줄이 없어요. 형식을 확인해 주세요.");
    miSave();
    close();
    renderMyInvest();
    showToast(`${n}줄을 가져왔어요${bad.length ? ` (${bad.length}줄은 건너뜀)` : ""}`);
  });
}

// ---------- 추가금액(매달 정기투자) ----------
function miOpenExtra() {
  const goal = miState.goals.find((g) => g.id === miState.selected) || miState.goals[0] || null;
  let value = miState.extra || 0;
  const before = miCalc && goal ? miEtaMonths(goal, miState.extra || 0) : null;
  const back = document.createElement("div");
  back.className = "mi-sheet-back";
  back.innerHTML = `<div class="mi-sheet"><div class="mi-sheet-grab"></div>
    <div class="mi-sheet-head"><h3>매달 추가금액</h3><button type="button" class="mi-x" aria-label="닫기">✕</button></div>
    <div class="mi-sheet-body"><p class="mi-note" style="margin:0 0 10px">매달 정기투자할 금액을 5만원 단위로 고르세요. 지금 보유한 종목과 <b>같은 비율로 매수</b>한다고 보고 목표 달성일을 다시 계산해요.</p>
      <div class="mi-dial"><div class="mi-dial-mark"></div><div class="mi-dial-list" id="miExtraList">${Array.from({ length: 101 }, (_, i) => `<div class="mi-dial-item" data-i="${i}">${i ? `+${i * 5}만원` : "추가 없음"}</div>`).join("")}</div></div>
      <div class="mi-dial-value" id="miExtraVal"></div>
      <div class="mi-final"><button type="button" class="mi-primary" id="miExtraSave">설정하기</button></div></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", (e) => e.target === back && close());
  back.querySelector(".mi-x").addEventListener("click", close);
  const list = back.querySelector("#miExtraList");
  const val = back.querySelector("#miExtraVal");
  const paint = (idx) => {
    val.textContent = idx ? `매달 +${idx * 5}만원` : "추가 없음";
    list.querySelectorAll(".mi-dial-item").forEach((it, i) => it.classList.toggle("on", i === idx));
  };
  const startIdx = Math.round(value / 5e4);
  list.scrollTop = startIdx * 40;
  paint(startIdx);
  let timer = null;
  list.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const idx = Math.max(0, Math.min(100, Math.round(list.scrollTop / 40)));
      value = idx * 5e4;
      paint(idx);
    }, 60);
  });
  back.querySelector("#miExtraSave").addEventListener("click", () => {
    miState.extra = value;
    miSave();
    close();
    renderMyInvest();
    if (goal && miCalc) {
      const after = miEtaMonths(goal, value);
      if (before !== null && after !== null && after < before) {
        const d = before - after;
        showToast(`목표 달성이 ${d >= 12 ? `${Math.floor(d / 12)}년 ` : ""}${d % 12 ? `${d % 12}개월` : ""} 당겨졌어요`.replace("  ", " "));
      } else showToast(value ? `매달 +${Math.round(value / 1e4)}만원으로 설정했어요` : "추가금액을 해제했어요");
    }
  });
}

// ---------- 내 증권 연동하기 ----------
// 증권사·거래소가 공식으로 여는 API 안내 페이지로 보내 준다. API 키를 이 앱이 받아 자동으로 거래내역을 가져오는 기능은
// (키를 브라우저에 저장하면 위험하고, 업비트·빗썸은 허용 IP 등록이 필요해 서버가 있어야 함) 아직 만들지 않았다.
const MI_BROKERS = {
  증권사: [
    ["한국투자증권", "KIS Developers", "https://apiportal.koreainvestment.com"],
    ["키움증권", "키움 REST API", "https://openapi.kiwoom.com"],
    ["LS증권", "LS OpenAPI", "https://openapi.ls-sec.co.kr"],
  ],
  암호화폐: [
    ["업비트", "Open API 안내", "https://upbit.com/service_center/open_api_guide"],
    ["빗썸", "API 문서", "https://apidocs.bithumb.com"],
    ["코인원", "API 문서", "https://docs.coinone.co.kr"],
    ["코빗", "API 문서", "https://apidocs.korbit.co.kr"],
  ],
};
function miOpenConnect() {
  let tab = "증권사";
  const back = document.createElement("div");
  back.className = "mi-sheet-back";
  const sheet = document.createElement("div");
  sheet.className = "mi-sheet";
  back.appendChild(sheet);
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", (e) => e.target === back && close());
  const draw = () => {
    sheet.innerHTML = `<div class="mi-sheet-grab"></div>
      <div class="mi-sheet-head"><h3>내 증권 연동하기</h3><button type="button" class="mi-x" aria-label="닫기">✕</button></div>
      <div class="mi-sheet-body">
        <div class="mi-tabs">${Object.keys(MI_BROKERS).map((k) => `<button type="button" class="mi-tab${k === tab ? " active" : ""}" data-tab="${k}">${k}</button>`).join("")}</div>
        <div class="mi-brokers">${MI_BROKERS[tab].map(([name, sub, url]) => `<a class="mi-broker" href="${url}" target="_blank" rel="noopener"><b>${name}</b><small>${sub}</small><span>API 연결 페이지 ›</span></a>`).join("")}</div>
        <p class="mi-note" style="margin-top:14px">연결 페이지에서 읽기 전용 API 키를 발급받을 수 있어요. <b>자동으로 거래내역을 가져오는 기능은 아직 준비 중</b>이라, 지금은 위의 <b>＋ 월 기록 추가</b>나 <b>엑셀/CSV 붙여넣기</b>로 입력해 주세요. API 키는 절대 이 앱에 입력하지 마세요.</p>
      </div>`;
    sheet.querySelector(".mi-x").addEventListener("click", close);
    sheet.querySelectorAll(".mi-tab").forEach((b) => b.addEventListener("click", () => ((tab = b.dataset.tab), draw())));
  };
  draw();
}
