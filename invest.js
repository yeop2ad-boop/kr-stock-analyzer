// 내투자 탭 (2026-10-15 사용자 요청 대개편)
//  · 목표: 목표금액·초기자본·매달 추가금·목표 수익률을 PASS 앱처럼 위에서부터 한 단계씩 입력 → 목표도달 확인하기 → 그래프(목표선 회색 점선 · 내투자선 파란 실선 · 목표금액 빨간선)
//  · 모든 기록은 이 기기(localStorage)에만 저장한다.
// app.js의 전역(el, escapeHtml, yahooChart, showToast …)을 쓰므로 app.js 뒤에 불러온다. renderMyInvest()는 app.js의 자리표시자를 덮어쓴다.

const MI_KEY = "my_invest_v1";
const MI_RATES_KEY = "my_invest_rates_v1";
// 목표 수익률 5단계 — 10년 평균은 Yahoo 월봉으로 계산(금리형은 10년 평균 금리, 나머지는 10년 연평균 상승률)
const MI_RISK_TYPES = [
  { id: 1, name: "방어형", desc: "예금 수준", src: "^IRX", kind: "yield" },
  { id: 2, name: "안정형", desc: "국채 수준", src: "^TNX", kind: "yield" },
  { id: 3, name: "균형형", desc: "S&P500 수준", src: "^GSPC", kind: "cagr" },
  { id: 4, name: "성장형", desc: "반도체 지수 수준", src: "^SOX", kind: "cagr" },
  { id: 5, name: "공격형", desc: "비트코인 수준", src: "BTC-USD", kind: "cagr" },
];

// ---------- 저장소 ----------
function miLoad() {
  try {
    const v = JSON.parse(localStorage.getItem(MI_KEY) || "null");
    if (v && Array.isArray(v.goals)) return { goals: v.goals, selected: v.selected || null, records: v.records || {}, extra: v.extra || 0 };
  } catch {}
  return { goals: [], selected: null, records: {}, extra: 0 };
}
let miState = miLoad();
function miSave() {
  try {
    localStorage.setItem(MI_KEY, JSON.stringify(miState));
  } catch {
    showToast("이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.");
  }
}

// ---------- 금액 표시·계산 ----------
function miFmtWon(n) {
  n = Math.round(n || 0);
  if (n <= 0) return "0원";
  const eok = Math.floor(n / 1e8);
  const man = Math.floor((n % 1e8) / 1e4);
  const rest = n % 1e4;
  if (eok > 0) return `${eok}억${man ? ` ${man.toLocaleString("ko-KR")}만원` : "원"}`;
  if (man > 0) return `${man.toLocaleString("ko-KR")}만원`;
  return `${rest.toLocaleString("ko-KR")}원`;
}
function miFmtAxis(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
  return String(Math.round(n));
}
// 매월 복리: 달 수익률 = (1+연수익률)^(1/12)-1, 매달 말에 추가금 납입
function miMonthsToTarget(initial, monthly, ratePct, target, maxMonths = 1200) {
  if (initial >= target) return 0;
  const rm = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  let b = initial;
  for (let n = 1; n <= maxMonths; n++) {
    b = b * (1 + rm) + monthly;
    if (b >= target) return n;
  }
  return null;
}
function miPath(initial, monthly, ratePct, months) {
  const rm = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  const out = [initial];
  let b = initial;
  for (let n = 1; n <= months; n++) {
    b = b * (1 + rm) + monthly;
    out.push(b);
  }
  return out;
}
function miYmToM(ym) {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m - 1;
}
function miMToYm(m) {
  return `${Math.floor(m / 12)}.${String((m % 12) + 1).padStart(2, "0")}`;
}
function miNowM() {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
}
function miRemainText(months) {
  if (months === null) return "도달 어려움";
  if (months <= 0) return "이미 달성";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y ? `${y}년 ` : ""}${m ? `${m}개월` : y ? "" : "0개월"} 남음`.replace("  ", " ");
}
// 목표 하나의 계산 결과: 시작월부터 몇 달 만에 도달하는지, 도달 예정월, 지금 기준 남은 달
function miGoalResult(g) {
  const startM = miYmToM(g.start);
  const total = miMonthsToTarget(g.initial, g.monthly, g.rate, g.amount);
  const endM = total === null ? null : startM + total;
  const remain = endM === null ? null : Math.max(0, endM - miNowM());
  return { startM, total, endM, remain };
}
function miGoalLabel(g, i) {
  return `목표${i + 1}(${g.typeName || "직접입력"})`;
}

// ---------- 10년 평균 수익률(하루 한 번 계산해 저장) ----------
async function miLoadRates() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const c = JSON.parse(localStorage.getItem(MI_RATES_KEY) || "null");
    if (c && c.date === today && c.rates && Object.keys(c.rates).length === MI_RISK_TYPES.length) return c.rates;
  } catch {}
  const rates = {};
  await Promise.all(
    MI_RISK_TYPES.map(async (t) => {
      try {
        const ch = await yahooChart(t.src, "10y", "1mo");
        const r = ch && ch.chart && ch.chart.result && ch.chart.result[0];
        const closes = (r.indicators.quote[0].close || []).map((c, i) => ({ t: r.timestamp[i], c })).filter((p) => Number.isFinite(p.c) && p.c > 0);
        if (closes.length < 24) return;
        let v;
        if (t.kind === "yield") v = closes.reduce((a, p) => a + p.c, 0) / closes.length;
        else {
          const yrs = (closes[closes.length - 1].t - closes[0].t) / (365.25 * 86400);
          v = (Math.pow(closes[closes.length - 1].c / closes[0].c, 1 / yrs) - 1) * 100;
        }
        rates[t.id] = Math.round(v * 100) / 100;
      } catch {}
    })
  );
  if (Object.keys(rates).length) {
    try {
      localStorage.setItem(MI_RATES_KEY, JSON.stringify({ date: today, rates }));
    } catch {}
  }
  return rates;
}

// ---------- 그래프 ----------
function miChartHtml(goal, recordsSeries) {
  const W = 340,
    H = 220,
    L = 46,
    R = 16,
    T = 14,
    B = 28;
  const nowM = miNowM();
  const res = goal ? miGoalResult(goal) : null;
  const startM = goal ? res.startM : nowM;
  // 목표선(예상): 시작월 초기자본에서 목표 도달(또는 최대 30년)까지
  let path = [];
  if (goal) {
    const months = res.total === null ? 360 : res.total;
    path = miPath(goal.initial, goal.monthly, goal.rate, months).map((v, i) => ({ m: startM + i, v }));
  }
  // 내투자선(파란 실선): 시작점(초기자본) + 투자기록 월별 추정자산
  const blue = [];
  if (goal) blue.push({ m: startM, v: goal.initial });
  recordsSeries.forEach((p) => {
    if (!goal || p.m > startM) blue.push(p);
    else if (p.m === startM) blue[0] = p;
  });
  const allM = [...path.map((p) => p.m), ...blue.map((p) => p.m), nowM];
  const minM = Math.min(...allM);
  let maxM = Math.max(...allM);
  if (maxM === minM) maxM = minM + 12;
  const vals = [...path.map((p) => p.v), ...blue.map((p) => p.v), goal ? goal.amount : 0];
  // 세로 눈금은 5천만·1억처럼 딱 떨어지는 값으로(1·2·2.5·5×10^n)
  const rawMax = Math.max(...vals, 1) * 1.08;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rawMax / 4)));
  const f = rawMax / 4 / pow10;
  const tickStep = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow10;
  const tickN = Math.ceil(rawMax / tickStep);
  const maxV = tickStep * tickN;
  const x = (m) => L + ((m - minM) / (maxM - minM)) * (W - L - R);
  const y = (v) => T + (1 - v / maxV) * (H - T - B);
  const poly = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.m).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  // 눈금
  let grid = "";
  for (let i = 0; i <= tickN; i++) {
    const v = tickStep * i;
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="mi-grid"/><text x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" class="mi-axis">${i ? miFmtAxis(v) : "0"}</text>`;
  }
  let xt = "";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const m = Math.round(minM + ((maxM - minM) * i) / ticks);
    xt += `<text x="${x(m).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === ticks ? "end" : "middle"}" class="mi-axis">${miMToYm(m).slice(2)}</text>`;
  }
  let target = "";
  if (goal) {
    const ty = y(goal.amount).toFixed(1);
    target += `<line x1="${L}" x2="${W - R}" y1="${ty}" y2="${ty}" class="mi-target"/>`;
    target += `<text x="${W - R}" y="${(+ty - 5).toFixed(1)}" text-anchor="end" class="mi-target-t">목표 ${miFmtWon(goal.amount)}</text>`;
    if (res.endM !== null) {
      const ex = x(res.endM).toFixed(1);
      target += `<line x1="${ex}" x2="${ex}" y1="${ty}" y2="${H - B}" class="mi-target-v"/><circle cx="${ex}" cy="${ty}" r="4" class="mi-target-dot"/>`;
      const anchor = +ex > W - 80 ? "end" : "middle";
      target += `<text x="${ex}" y="${(+ty + 17).toFixed(1)}" text-anchor="${anchor}" class="mi-target-t2">${miMToYm(res.endM)} 예상</text>`;
    }
  }
  const lastBlue = blue[blue.length - 1];
  return `<svg class="mi-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="목표 그래프">
    ${grid}${xt}
    ${path.length ? `<path d="${poly(path)}" class="mi-line-goal"/>` : ""}
    ${target}
    ${blue.length > 1 ? `<path d="${poly(blue)}" class="mi-line-me"/>` : ""}
    ${lastBlue ? `<circle cx="${x(lastBlue.m).toFixed(1)}" cy="${y(lastBlue.v).toFixed(1)}" r="4" class="mi-me-dot"/>` : ""}
  </svg>`;
}

// ---------- 화면 ----------
function miRecordsSeries() {
  // 투자기록 월별 추정자산(저장된 totals) — 투자기록 단계에서 채워짐
  const t = miState.totals || {};
  return Object.keys(t)
    .sort()
    .map((ym) => ({ m: miYmToM(ym), v: t[ym] }));
}
function renderMyInvest() {
  const root = el("myInvestRoot");
  if (!root) return;
  const goals = miState.goals;
  if (goals.length && !goals.some((g) => g.id === miState.selected)) miState.selected = goals[0].id;
  const sel = goals.find((g) => g.id === miState.selected) || null;

  const goalRows = goals
    .map((g, i) => {
      const r = miGoalResult(g);
      return `<div class="mi-goal${g.id === miState.selected ? " active" : ""}" data-goal="${g.id}">
        <button type="button" class="mi-goal-main" data-pick="${g.id}">
          <b class="mi-goal-name">${escapeHtml(miGoalLabel(g, i))}</b>
          <span class="mi-goal-amt">${miFmtWon(g.amount)}</span>
          <span class="mi-goal-when">${r.endM === null ? "도달 어려움" : `${miMToYm(r.endM)} 예상 · ${miRemainText(r.remain)}`}</span>
        </button>
        <button type="button" class="mi-goal-edit" data-edit="${g.id}" aria-label="수정">수정</button>
      </div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="mi-sec-head"><h2 class="mi-h">목표</h2><button type="button" class="mi-mini" id="miAddGoal">＋ 목표 추가</button></div>
    ${goals.length ? `<div class="mi-goals">${goalRows}</div>` : ""}
    <div class="mi-chart-wrap">
      ${miChartHtml(sel, miRecordsSeries())}
      ${goals.length ? "" : `<div class="mi-empty"><p>목표를 정하면 목표선과 내 투자선이<br>한 그래프에 나타나요.</p><button type="button" class="mi-primary" id="miFirstGoal">목표 설정하기</button></div>`}
    </div>
    <div class="mi-legend"><span><i class="lg lg-goal"></i>목표선(예상)</span><span><i class="lg lg-me"></i>내투자선</span><span><i class="lg lg-target"></i>목표금액</span></div>
    <div id="miRecordsRoot"></div>`;

  root.querySelector("#miAddGoal").addEventListener("click", () => miOpenWizard(null));
  const first = root.querySelector("#miFirstGoal");
  if (first) first.addEventListener("click", () => miOpenWizard(null));
  root.querySelectorAll("[data-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      miState.selected = b.dataset.pick;
      miSave();
      renderMyInvest();
    })
  );
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => miOpenWizard(b.dataset.edit)));
  if (typeof miRenderRecords === "function") miRenderRecords(el("miRecordsRoot"));
}

// ---------- 목표 입력 마법사(PASS처럼 위에서부터 한 단계씩) ----------
function miOpenWizard(goalId) {
  const editing = goalId ? miState.goals.find((g) => g.id === goalId) : null;
  const d = {
    amount: editing ? editing.amount : null,
    initial: editing ? editing.initial : null,
    monthly: editing ? editing.monthly : 0,
    rate: editing ? editing.rate : null,
    type: editing ? editing.type : 0,
    typeName: editing ? editing.typeName : "직접입력",
  };
  let step = editing ? 5 : 1; // 수정할 땐 모든 단계를 펼쳐 둠
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

  const eokMan = (won) => {
    if (won === null || won === undefined) return { eok: "", man: "" };
    return { eok: Math.floor(won / 1e8) || "", man: Math.floor((won % 1e8) / 1e4) || "" };
  };
  const stepTitle = (n, t, sub) => `<div class="mi-step-title"><span class="mi-step-n">${n}</span><div><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</div></div>`;
  const amountInputs = (key) => {
    const v = eokMan(d[key]);
    return `<div class="mi-amount" data-key="${key}">
      <label><input type="text" inputmode="numeric" maxlength="5" class="mi-eok" placeholder="0" value="${v.eok}"><span>억</span></label>
      <label><input type="text" inputmode="numeric" maxlength="5" class="mi-man" placeholder="0" value="${v.man}"><span>만원</span></label>
    </div>`;
  };

  const draw = () => {
    const monthlyMan = Math.round(d.monthly / 1e4);
    sheet.innerHTML = `
      <div class="mi-sheet-grab"></div>
      <div class="mi-sheet-head"><h3>${editing ? "목표 수정" : "새 목표"}</h3><button type="button" class="mi-x" aria-label="닫기">✕</button></div>
      <div class="mi-sheet-body">
        <section class="mi-step">${stepTitle(1, "목표금액", "모으고 싶은 금액")}${amountInputs("amount")}
          ${step === 1 ? `<button type="button" class="mi-next" data-next="2" disabled>확인</button>` : ""}</section>
        ${
          step >= 2
            ? `<section class="mi-step mi-in">${stepTitle(2, "초기자본", "지금 투자할 수 있는 금액")}${amountInputs("initial")}
          ${step === 2 ? `<button type="button" class="mi-next" data-next="3" disabled>확인</button>` : ""}</section>`
            : ""
        }
        ${
          step >= 3
            ? `<section class="mi-step mi-in">${stepTitle(3, "매달 추가금(예상)", "10만원 단위로 돌려서 고르세요")}
          <div class="mi-dial" id="miDial"><div class="mi-dial-mark"></div><div class="mi-dial-list" id="miDialList">${Array.from({ length: 101 }, (_, i) => `<div class="mi-dial-item" data-v="${i * 10}">${i ? `월 ${(i * 10).toLocaleString("ko-KR")}만원` : "추가 없음"}</div>`).join("")}</div></div>
          <div class="mi-dial-value" id="miDialValue">${monthlyMan ? `월 ${monthlyMan.toLocaleString("ko-KR")}만원` : "추가 없음"}</div>
          ${step === 3 ? `<button type="button" class="mi-next" data-next="4">확인</button>` : ""}</section>`
            : ""
        }
        ${
          step >= 4
            ? `<section class="mi-step mi-in">${stepTitle(4, "목표 수익률", "연 수익률(%) — 아래 번호를 누르면 자동으로 입력돼요")}
          <div class="mi-rate"><input type="text" inputmode="decimal" id="miRateInput" maxlength="6" placeholder="직접 입력" value="${d.rate === null ? "" : d.rate}"><span>%</span></div>
          <div class="mi-risks" id="miRisks">${MI_RISK_TYPES.map((t) => `<button type="button" class="mi-risk${d.type === t.id ? " active" : ""}" data-risk="${t.id}"><i>${t.id}</i><b>${t.name}</b><em id="miRate${t.id}">…</em><small>${t.desc}</small></button>`).join("")}</div>
          <p class="mi-note">10년 평균 기준(금리형은 평균 금리, 나머지는 연평균 상승률)이며 미래 수익을 보장하지 않아요.</p>
          ${step === 4 ? `<button type="button" class="mi-next" data-next="5" disabled>확인</button>` : ""}</section>`
            : ""
        }
        ${
          step >= 5
            ? `<div class="mi-final mi-in"><button type="button" class="mi-primary" id="miConfirm" disabled>${editing ? "저장하고 목표도달 확인하기" : "목표도달 확인하기"}</button>
          ${editing ? `<button type="button" class="mi-del" id="miDelete">이 목표 삭제</button>` : ""}</div>`
            : ""
        }
      </div>`;
    bind();
  };

  const readAmount = (key) => {
    const box = sheet.querySelector(`.mi-amount[data-key="${key}"]`);
    if (!box) return null;
    const eok = parseInt(box.querySelector(".mi-eok").value.replace(/\D/g, "") || "0", 10);
    const man = parseInt(box.querySelector(".mi-man").value.replace(/\D/g, "") || "0", 10);
    const won = eok * 1e8 + man * 1e4;
    return box.querySelector(".mi-eok").value === "" && box.querySelector(".mi-man").value === "" ? null : won;
  };
  const refreshButtons = () => {
    sheet.querySelectorAll(".mi-next").forEach((b) => {
      const n = +b.dataset.next;
      if (n === 2) b.disabled = !(d.amount > 0);
      if (n === 4) b.disabled = false;
      if (n === 5) b.disabled = !(d.rate > 0);
    });
    const c = sheet.querySelector("#miConfirm");
    if (c) c.disabled = !(d.amount > 0 && d.initial !== null && d.initial >= 0 && d.rate > 0);
    const n2 = sheet.querySelector('.mi-next[data-next="3"]');
    if (n2) n2.disabled = !(d.initial !== null);
  };

  const bind = () => {
    sheet.querySelector(".mi-x").addEventListener("click", close);
    sheet.querySelectorAll(".mi-amount").forEach((box) => {
      const key = box.dataset.key;
      box.querySelectorAll("input").forEach((inp) =>
        inp.addEventListener("input", () => {
          inp.value = inp.value.replace(/\D/g, "");
          d[key] = readAmount(key);
          refreshButtons();
        })
      );
    });
    sheet.querySelectorAll(".mi-next").forEach((b) =>
      b.addEventListener("click", () => {
        step = Math.max(step, +b.dataset.next);
        draw();
        const last = sheet.querySelector(".mi-sheet-body").lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (step === 3) setTimeout(initDial, 30);
      })
    );
    if (step >= 3) initDial();
    const rateInput = sheet.querySelector("#miRateInput");
    if (rateInput) {
      rateInput.addEventListener("input", () => {
        rateInput.value = rateInput.value.replace(/[^0-9.]/g, "");
        const v = parseFloat(rateInput.value);
        d.rate = Number.isFinite(v) ? v : null;
        d.type = 0;
        d.typeName = "직접입력";
        sheet.querySelectorAll(".mi-risk").forEach((r) => r.classList.remove("active"));
        refreshButtons();
      });
      miLoadRates().then((rates) => {
        MI_RISK_TYPES.forEach((t) => {
          const e = sheet.querySelector(`#miRate${t.id}`);
          if (e) e.textContent = rates[t.id] !== undefined ? `+${rates[t.id].toFixed(2)}%` : "-";
        });
        sheet.querySelectorAll(".mi-risk").forEach((btn) => {
          btn.addEventListener("click", () => {
            const t = MI_RISK_TYPES.find((x) => x.id === +btn.dataset.risk);
            if (rates[t.id] === undefined) return showToast("수익률을 불러오지 못했어요. 직접 입력해 주세요.");
            d.rate = rates[t.id];
            d.type = t.id;
            d.typeName = t.name;
            rateInput.value = String(d.rate);
            sheet.querySelectorAll(".mi-risk").forEach((r) => r.classList.toggle("active", r === btn));
            refreshButtons();
          });
        });
      });
    }
    const confirm = sheet.querySelector("#miConfirm");
    if (confirm)
      confirm.addEventListener("click", () => {
        const now = new Date();
        const g = {
          id: editing ? editing.id : `g${Date.now()}`,
          amount: d.amount,
          initial: d.initial || 0,
          monthly: d.monthly || 0,
          rate: d.rate,
          type: d.type,
          typeName: d.typeName,
          start: editing ? editing.start : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        };
        if (editing) miState.goals = miState.goals.map((x) => (x.id === g.id ? g : x));
        else miState.goals.push(g);
        miState.selected = g.id;
        miSave();
        close();
        renderMyInvest();
        const r = miGoalResult(g);
        showToast(r.endM === null ? "이 조건으로는 목표 도달이 어려워요" : `${miMToYm(r.endM)} 도달 예상 · ${miRemainText(r.remain)}`);
      });
    const del = sheet.querySelector("#miDelete");
    if (del)
      del.addEventListener("click", () => {
        if (!window.confirm("이 목표를 삭제할까요?")) return;
        miState.goals = miState.goals.filter((x) => x.id !== editing.id);
        miSave();
        close();
        renderMyInvest();
      });
    refreshButtons();
  };

  // 매달 추가금 다이얼: 세로로 돌려서(스크롤 스냅) 10만원 단위 선택
  const initDial = () => {
    const list = sheet.querySelector("#miDialList");
    if (!list || list.dataset.ready) return;
    list.dataset.ready = "1";
    const ITEM = 40;
    list.scrollTop = Math.round(d.monthly / 1e5) * ITEM; // 10만원 = 1칸
    let timer = null;
    list.addEventListener("scroll", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const idx = Math.max(0, Math.min(100, Math.round(list.scrollTop / ITEM)));
        d.monthly = idx * 10 * 1e4;
        const val = sheet.querySelector("#miDialValue");
        if (val) val.textContent = idx ? `월 ${(idx * 10).toLocaleString("ko-KR")}만원` : "추가 없음";
        list.querySelectorAll(".mi-dial-item").forEach((it, i) => it.classList.toggle("on", i === idx));
      }, 60);
    });
    list.querySelectorAll(".mi-dial-item").forEach((it, i) => it.classList.toggle("on", i === Math.round(d.monthly / 1e5)));
  };

  draw();
  if (editing) setTimeout(initDial, 30);
}
