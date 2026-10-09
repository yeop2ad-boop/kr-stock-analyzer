// 스톡챗 차트 카드 — Worker가 내려준 cards(종목별 시세·재무·승률 자료)를 SVG/HTML 카드로 그린다.
// 상승=빨강, 하락=파랑(한국식). 색은 style.css 변수(--up/--down)를 따라 다크모드에서도 자동 전환.
window.StockCards = (function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  const isNum = (v) => typeof v === "number" && isFinite(v);

  function pct(v, d) {
    if (!isNum(v)) return "–";
    return (v > 0 ? "+" : "") + v.toFixed(d == null ? 1 : d) + "%";
  }
  function plain(v, d, suffix) {
    return isNum(v) ? v.toFixed(d == null ? 1 : d) + (suffix || "") : "–";
  }
  function dir(v) {
    return !isNum(v) || v === 0 ? "flat" : v > 0 ? "up" : "down";
  }
  function price(v, cur) {
    if (!isNum(v)) return "–";
    if (cur === "KRW") return Math.round(v).toLocaleString("ko-KR") + "원";
    if (cur === "USD") return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " " + (cur || "");
  }
  function money(v, cur) {
    if (!isNum(v)) return "–";
    const a = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (cur === "KRW") {
      if (a >= 1e12) return sign + (a / 1e12).toFixed(1) + "조";
      if (a >= 1e8) return sign + Math.round(a / 1e8).toLocaleString("ko-KR") + "억";
      return sign + Math.round(a).toLocaleString("ko-KR");
    }
    const unit = cur === "USD" ? "$" : "";
    if (a >= 1e9) return sign + unit + (a / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return sign + unit + Math.round(a / 1e6) + "M";
    return sign + unit + Math.round(a).toLocaleString("en-US");
  }
  function ymd(ts) {
    const d = new Date(ts * 1000);
    return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0");
  }

  // ---- 1년 주가 선 차트(면적 포함) ----
  function lineChart(series, d) {
    if (!series || series.length < 2) return "";
    const W = 320, H = 110, padT = 8, padB = 6;
    const vals = series.map((p) => p[1]);
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = max - min || 1;
    const x = (i) => (i / (series.length - 1)) * W;
    const y = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);
    const pts = series.map((p, i) => x(i).toFixed(1) + "," + y(p[1]).toFixed(1));
    const line = "M" + pts.join(" L");
    const area = line + " L" + W + "," + H + " L0," + H + " Z";
    return (
      '<div class="sc-chart ' + d + '"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="1년 주가">' +
      '<path class="sc-area" d="' + area + '"/><path class="sc-line" d="' + line + '"/></svg></div>' +
      '<div class="sc-axis"><span>' + ymd(series[0][0]) + "</span><span>1년 주가</span><span>지금</span></div>"
    );
  }

  // ---- 52주 위치 바 ----
  function weekBar(c) {
    const w = c.week || {};
    if (!isNum(w.pos)) return "";
    const pos = Math.max(0, Math.min(100, w.pos));
    return (
      '<div class="sc-row-title">52주 가격 위치 <b>' + Math.round(pos) + "%</b></div>" +
      '<div class="sc-range"><i style="left:' + pos + '%"></i></div>' +
      '<div class="sc-range-labels"><span>' + price(w.low, c.currency) + "</span><span>" + price(w.high, c.currency) + "</span></div>"
    );
  }

  function returnChips(r) {
    r = r || {};
    const item = (label, v) => '<div class="sc-chip ' + dir(v) + '"><small>' + label + "</small><b>" + pct(v) + "</b></div>";
    return '<div class="sc-chips">' + item("1개월", r.m1) + item("3개월", r.m3) + item("1년", r.y1) + "</div>";
  }

  function metricTiles(m) {
    m = m || {};
    const tile = (label, text, d) => '<div class="sc-tile ' + (d || "") + '"><small>' + label + "</small><b>" + text + "</b></div>";
    return (
      '<div class="sc-tiles">' +
      tile("매출 성장(YoY)", pct(m.revGrowth), dir(m.revGrowth)) +
      tile("영업이익률", plain(m.opMargin, 1, "%"), isNum(m.opMargin) && m.opMargin < 0 ? "down" : "") +
      tile("ROE(분기)", plain(m.roe, 1, "%")) +
      tile("부채비율", plain(m.debt, 0, "%"), isNum(m.debt) && m.debt > 200 ? "warn" : "") +
      tile("PER", plain(m.per, 1, "배")) +
      "</div>"
    );
  }

  function stockCard(c) {
    const d = dir(c.changePct);
    const trend = c.returns && isNum(c.returns.y1) ? dir(c.returns.y1) : d;
    return (
      '<section class="sc-card">' +
      '<div class="sc-head"><div><div class="sc-name">' + esc(c.name) + '</div><div class="sc-sym">' + esc(c.symbol) + "</div></div>" +
      '<div class="sc-price ' + d + '"><b>' + price(c.price, c.currency) + "</b><span>" + pct(c.changePct, 2) + "</span></div></div>" +
      lineChart(c.series, trend) +
      returnChips(c.returns) +
      weekBar(c) +
      "</section>"
    );
  }

  function metricCard(c) {
    return '<section class="sc-card"><div class="sc-title">핵심 지표 <small>직전 분기 기준</small></div>' + metricTiles(c.metrics) + "</section>";
  }

  // ---- 연간 매출·순이익 막대(마켓맵 수집 자료) ----
  function finCard(c) {
    const fin = c.fin;
    if (!fin || !fin.length) return "";
    const W = 320, H = 132, top = 14, bottom = 104;
    const vals = [0];
    fin.forEach((r) => {
      if (isNum(r.rev)) vals.push(r.rev);
      if (isNum(r.ni)) vals.push(r.ni);
    });
    const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    const span = max - min || 1;
    const y = (v) => top + ((max - v) / span) * (bottom - top);
    const zero = y(0);
    const gw = W / fin.length;
    const bw = gw * 0.3;
    let bars = "";
    fin.forEach((r, i) => {
      const gx = i * gw + gw / 2;
      const draw = (v, cls, off) => {
        if (!isNum(v)) return "";
        const yy = y(v);
        const h = Math.max(1, Math.abs(zero - yy));
        return '<rect class="' + cls + '" x="' + (gx + off).toFixed(1) + '" y="' + Math.min(yy, zero).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5"/>';
      };
      bars += draw(r.rev, "sc-b-rev", -bw - 1) + draw(r.ni, r.ni < 0 ? "sc-b-neg" : "sc-b-ni", 1);
      bars += '<text class="sc-t" x="' + gx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(String(r.y).slice(2)) + "</text>";
    });
    const last = fin[fin.length - 1];
    return (
      '<section class="sc-card"><div class="sc-title">연간 매출 · 순이익 <small>' + esc(fin[0].y) + "~" + esc(last.y) + "</small></div>" +
      '<svg class="sc-bars" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="연간 매출 순이익">' +
      '<line class="sc-zero" x1="0" x2="' + W + '" y1="' + zero.toFixed(1) + '" y2="' + zero.toFixed(1) + '"/>' + bars + "</svg>" +
      '<div class="sc-legend"><span><i class="l-rev"></i>매출 ' + money(last.rev, c.currency) + '</span><span><i class="l-ni"></i>순이익 ' + money(last.ni, c.currency) + "</span><em>(" + esc(last.y) + ")</em></div>" +
      "</section>"
    );
  }

  // ---- 월별 수익률 + 승률/RSI 게이지 ----
  function winCard(c) {
    const w = c.win;
    if (!w) return "";
    let monthly = "";
    if (w.m12 && w.m12.length) {
      const W = 320, H = 108, mid = 54;
      const vals = w.m12.filter(isNum);
      const maxAbs = Math.max.apply(null, vals.map(Math.abs).concat([1]));
      const gw = W / w.m12.length;
      let bars = "";
      w.m12.forEach((v, i) => {
        if (!isNum(v)) return;
        const h = (Math.abs(v) / maxAbs) * 40;
        const x = i * gw + gw * 0.18;
        const up = v >= 0;
        bars += '<rect class="' + (up ? "sc-up-fill" : "sc-down-fill") + '" x="' + x.toFixed(1) + '" y="' + (up ? mid - h : mid).toFixed(1) + '" width="' + (gw * 0.64).toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="1.5"/>';
        bars += '<text class="sc-t" x="' + (i * gw + gw / 2).toFixed(1) + '" y="' + (up ? mid - h - 3 : mid + h + 9).toFixed(1) + '" text-anchor="middle">' + Math.round(v) + "</text>";
      });
      monthly =
        '<div class="sc-row-title">최근 12개월 월별 수익률(%)</div><svg class="sc-bars" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="월별 수익률">' +
        '<line class="sc-zero" x1="0" x2="' + W + '" y1="' + mid + '" y2="' + mid + '"/>' + bars + "</svg>" +
        '<div class="sc-axis"><span>12개월 전</span><span></span><span>최근</span></div>';
    }
    const gauge = (label, v, suffix, marks) =>
      !isNum(v)
        ? ""
        : '<div class="sc-gauge"><div class="sc-gauge-top"><span>' + label + "</span><b>" + v.toFixed(1) + suffix + '</b></div><div class="sc-track">' + (marks || "") + '<i style="width:' + Math.max(0, Math.min(100, v)) + '%"></i></div></div>';
    const rsiMarks = '<u style="left:30%"></u><u style="left:70%"></u>';
    return (
      '<section class="sc-card"><div class="sc-title">승률 · 과열도 <small>10년 월봉 기준</small></div>' +
      monthly +
      gauge("10년 월봉 승률(오른 달 비율)", w.score, "%", '<u style="left:50%"></u>') +
      gauge("최근 12개월 승률", w.wr1y, "%", '<u style="left:50%"></u>') +
      gauge("주간 RSI (30 침체 · 70 과열)", w.rsi, "", rsiMarks) +
      (isNum(w.cagr) ? '<div class="sc-foot">10년 연평균 수익률 <b class="' + dir(w.cagr) + '">' + pct(w.cagr) + "</b></div>" : "") +
      "</section>"
    );
  }

  // ---- 2개 이상 종목 비교(가로 막대) ----
  function compareCard(cards) {
    const list = cards.slice(0, 3);
    const rows = [
      ["1년 수익률", (c) => c.returns && c.returns.y1, "%"],
      ["매출 성장", (c) => c.metrics && c.metrics.revGrowth, "%"],
      ["영업이익률", (c) => c.metrics && c.metrics.opMargin, "%"],
      ["ROE(분기)", (c) => c.metrics && c.metrics.roe, "%"],
      ["10년 월봉 승률", (c) => c.win && c.win.score, "%"],
    ];
    const palette = ["a", "b", "c"];
    let html = '<section class="sc-card"><div class="sc-title">종목 비교</div><div class="sc-legend sc-legend-top">';
    list.forEach((c, i) => {
      html += '<span><i class="cmp-' + palette[i] + '"></i>' + esc(c.name) + "</span>";
    });
    html += "</div>";
    rows.forEach((r) => {
      const vals = list.map((c) => r[1](c));
      if (!vals.some(isNum)) return;
      const maxAbs = Math.max.apply(null, vals.filter(isNum).map(Math.abs).concat([1]));
      html += '<div class="sc-cmp-row"><div class="sc-cmp-label">' + r[0] + "</div>";
      vals.forEach((v, i) => {
        const w = isNum(v) ? Math.max(2, (Math.abs(v) / maxAbs) * 100) : 0;
        html += '<div class="sc-cmp-bar"><i class="cmp-' + palette[i] + (isNum(v) && v < 0 ? " neg" : "") + '" style="width:' + w + '%"></i><span>' + (isNum(v) ? v.toFixed(1) + r[2] : "–") + "</span></div>";
      });
      html += "</div>";
    });
    return html + "</section>";
  }

  // 답변마다 카드는 1개만: 한 종목이면 가격·차트 카드, 둘 이상이면 비교 카드.
  // 재무·핵심지표·리스크·뉴스는 답변 아래 버튼으로 마켓맵 화면을 그대로 열어 본다.
  function render(cards) {
    if (!cards || !cards.length) return "";
    return cards.length >= 2 ? compareCard(cards) : stockCard(cards[0]);
  }

  return { render: render, fmt: { pct: pct, plain: plain, dir: dir, price: price, money: money, esc: esc, isNum: isNum } };
})();
