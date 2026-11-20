// "○○이란?" 설명 글과 설명 그림 — 본체(별별순위·종목 상세)와 시장(지도)이 같이 쓴다(2026-11-20 사용자 요청).
//  · 예전엔 같은 지표를 본체와 지도가 서로 다른 말로 설명했다(PER: "낮을수록 싸다" vs "높을수록 비싸다", RSI: "1년 평균 대비" vs "70↑ 과열") → 한 벌로 통일.
//  · 글은 비전문가도 읽히게: ① 무엇을 뜻하는지 ② 숫자 예시.
//  · 그림은 "어떻게 구하는지"를 눈으로 보여 준다(대표 종목 비교 막대는 그 아래에 그대로 둔다). 숫자는 이해를 돕는 예시다.
// 두 페이지 모두 app.js보다 먼저 불러온다. 승률(win)은 winrate-benchmark.js의 설명을 그대로 쓴다.
const MX_TEXT = {
  ret: "10년 전에 샀다면 해마다 평균 몇 %씩 불어난 셈인지예요.\n연 10%면 100만원이 10년 뒤 약 259만원이 돼요.",
  rev: "가장 최근 석 달 매출이 1년 전 같은 석 달보다 몇 % 늘었는지예요.\n+20%면 작년 이맘때 100억 팔던 회사가 이번엔 120억을 판 거예요.",
  ret1y: "1년 전에 샀다면 지금 몇 % 올랐는지예요.\n+30%면 100만원이 130만원이 됐어요.",
  vol: "최근 3개월 동안 하루에 보통 몇 %씩 오르내렸는지예요.\n2%면 100만원어치가 하루에 2만원쯤 출렁였어요. 낮을수록 잔잔하지만 수익이 좋다는 뜻은 아니에요.",
  rsi: "최근 14주 동안 오른 힘이 전체 움직임에서 차지한 비율(0~100)이에요.\n50이 반반, 70 이상은 짧은 기간에 많이 오른 상태, 30 이하는 많이 빠진 상태예요. 사라·팔라는 신호가 아니에요.",
  ni: "가장 최근 석 달 순이익(세금까지 내고 남은 돈)이 1년 전 같은 석 달보다 몇 % 늘었는지예요.\n1년 전이 적자였거나 이익이 아주 작았으면 수백 %로 튈 수 있어요.",
  om: "100원어치를 팔아 본업으로 몇 원을 남기는지예요.\n20%면 100원 팔아 20원이 남아요.",
  roe: "주주 몫의 돈 100원으로 1년에 몇 원을 벌었는지예요.\n15%면 100원으로 15원을 번 거예요. 빚을 많이 쓴 회사는 높게 나올 수 있어 부채비율과 같이 보세요.",
  cf: "장사해서 실제로 들어온 현금이 1년 전 같은 석 달보다 몇 % 늘었는지예요.\n장부상 이익이 아니라 통장에 들어온 돈 기준이에요.",
  debt: "회사 자기 돈 100원당 빚이 몇 원인지예요.\n100%면 자기 돈만큼 빚이 있어요. 낮을수록 빚 부담이 적어요(은행·보험은 원래 높아요).",
  mcap: "회사를 지금 주가로 통째로 사려면 드는 돈, 곧 회사의 몸값이에요.\n클수록 덩치 큰 대형주예요.",
  dv: "오늘 하루 이 종목이 사고팔린 돈의 합계예요.\n클수록 사고팔기 쉬워요.",
  surge: "오늘 거래대금이 평소의 몇 배인지예요.\n1배면 평소만큼, 3배 이상이면 돈이 크게 몰린 날이에요.",
  w52: "최근 1년 중 가장 쌌던 값을 0%, 가장 비쌌던 값을 100%로 놓았을 때 지금 가격의 자리예요.\n0%에 가까우면 바닥 쪽, 100%에 가까우면 꼭대기 쪽이에요.",
  per: "지금 주가가 주식 1주가 1년에 버는 이익의 몇 배인지예요.\n10배면 지금 이익이 그대로일 때 본전을 이익으로 되찾는 데 10년 걸린다는 뜻이에요. 낮을수록 이익에 비해 싸지만, 성장이 느려서 싼 경우도 있어요. 적자 회사는 계산되지 않아요.",
  div: "지금 가격에 사서 지난 1년만큼 배당을 받는다면 1년에 몇 %를 받는지예요.\n4%면 100만원어치로 1년에 4만원쯤이에요. 주가가 급락해도 높아지고, 배당은 줄 수 있어요.",
  fee: "ETF를 들고 있으면 저절로 빠져나가는 수수료예요.\n0.1%면 1,000만원에 1년 1만원. 따로 내는 게 아니라 가격에 매일 조금씩 반영돼요.",
  aum: "이 ETF에 모여 있는 돈의 크기예요.\n클수록 거래가 활발하고 없어질(상장폐지) 위험이 낮아요.",
  chg: "어제 마지막 가격보다 오늘 몇 % 오르내렸는지예요.\n+3%면 어제 10,000원이던 것이 지금 10,300원이에요.",
};

const MXD_CSS = `
.mxd{margin:10px 0 6px;padding:12px 12px 10px;border-radius:12px;background:rgba(128,128,128,.09);font-size:12px;line-height:1.35;color:inherit}
.mxd *{box-sizing:border-box}
.mxd-row{display:flex;align-items:center;gap:8px;margin:5px 0}
.mxd-name{flex:0 0 96px;font-weight:600;opacity:.82;text-align:right;white-space:nowrap}
.mxd-track{flex:1;min-width:0;position:relative;height:22px}
.mxd-bar{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:rgba(128,128,128,.34);display:flex;align-items:center;padding:0 7px;font-weight:700;white-space:nowrap;overflow:visible}
.mxd-bar.on{background:#7230f0;color:#fff}
.mxd-out{position:absolute;top:0;bottom:0;display:flex;align-items:center;padding-left:6px;font-weight:700;white-space:nowrap}
.mxd-tag{display:flex;justify-content:flex-end;margin-top:7px}
.mxd-tag b{display:inline-block;padding:3px 10px;border-radius:999px;background:#7230f0;color:#fff;font-size:13px;font-weight:800}
.mxd-whole{position:relative;height:30px;border-radius:8px;background:rgba(128,128,128,.3);overflow:hidden}
.mxd-part{position:absolute;left:0;top:0;bottom:0;background:#7230f0}
.mxd-cap{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-weight:600}
.mxd-cap span:first-child{color:#7230f0;font-weight:800}
.mxd-cap span:last-child{opacity:.75;text-align:right}
.mxd-g{position:relative;height:14px;border-radius:999px;background:rgba(128,128,128,.3);margin:26px 6px 4px}
.mxd-zone{position:absolute;top:0;bottom:0}
.mxd-pin{position:absolute;top:-22px;transform:translateX(-50%);font-weight:800;color:#7230f0;white-space:nowrap}
.mxd-pin::after{content:"";position:absolute;left:50%;top:17px;width:3px;height:22px;margin-left:-1.5px;border-radius:2px;background:#7230f0}
.mxd-ticks{display:flex;justify-content:space-between;margin:0 6px;font-weight:600;opacity:.78}
.mxd-eq{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;font-weight:700}
.mxd-pill{padding:7px 10px;border-radius:9px;background:rgba(128,128,128,.26);text-align:center}
.mxd-pill small{display:block;font-weight:600;opacity:.75;font-size:10.5px}
.mxd-pill.on{background:#7230f0;color:#fff}
.mxd-op{font-size:15px;font-weight:800;opacity:.7}
.mxd-grow{display:flex;align-items:flex-end;gap:3px;height:74px;padding:0 2px}
.mxd-grow i{flex:1;border-radius:3px 3px 0 0;background:rgba(128,128,128,.36)}
.mxd-grow i.on{background:#7230f0}
.mxd-blocks{display:flex;gap:3px}
.mxd-blocks i{flex:1;height:24px;border-radius:4px;background:rgba(114,48,240,.22);border:1.5px solid #7230f0}
.mxd-blocks i.on{background:#7230f0}
.mxd-note{margin-top:6px;font-weight:600;opacity:.8;text-align:center}
.mxd-wave{display:flex;gap:10px}
.mxd-wave>div{flex:1;min-width:0;text-align:center;font-weight:700}
.mxd-wave svg{display:block;width:100%;height:46px}
`;
function mxdEnsureCss() {
  if (typeof document === "undefined" || document.getElementById("mxdCss")) return;
  const st = document.createElement("style");
  st.id = "mxdCss";
  st.textContent = MXD_CSS;
  document.head.appendChild(st);
}
// 가로 막대 두 줄(전·후 비교) — a가 기준(회색), b가 강조(보라). 막대가 짧아 글자가 안 들어가면 막대 밖에 쓴다
function mxdBars2(aName, aVal, aText, bName, bVal, bText, tag) {
  const max = Math.max(aVal, bVal) || 1;
  const row = (name, v, text, on) => {
    const w = Math.max(4, (v / max) * 100);
    const inside = w >= 34;
    return `<div class="mxd-row"><span class="mxd-name">${name}</span><span class="mxd-track"><span class="mxd-bar${on ? " on" : ""}" style="width:${w.toFixed(1)}%">${inside ? text : ""}</span>${inside ? "" : `<span class="mxd-out" style="left:${w.toFixed(1)}%">${text}</span>`}</span></div>`;
  };
  return `<div class="mxd">${row(aName, aVal, aText, false)}${row(bName, bVal, bText, true)}${tag ? `<div class="mxd-tag"><b>${tag}</b></div>` : ""}</div>`;
}
// 전체 중 일부(100원 중 20원)
function mxdPart(wholeText, pct, partText) {
  return `<div class="mxd"><div class="mxd-whole"><span class="mxd-part" style="width:${Math.max(3, pct).toFixed(1)}%"></span></div><div class="mxd-cap"><span>${partText}</span><span>${wholeText}</span></div></div>`;
}
// 눈금 위의 위치(0~100)
function mxdGauge(zonesHtml, pinPct, pinText, ticks) {
  return `<div class="mxd"><div class="mxd-g">${zonesHtml}<span class="mxd-pin" style="left:${pinPct}%">${pinText}</span></div><div class="mxd-ticks">${ticks.map((t) => `<span>${t}</span>`).join("")}</div></div>`;
}
function mxdEq(parts) {
  return `<div class="mxd"><div class="mxd-eq">${parts
    .map((p) => (typeof p === "string" ? `<span class="mxd-op">${p}</span>` : `<span class="mxd-pill${p.on ? " on" : ""}">${p.t}${p.s ? `<small>${p.s}</small>` : ""}</span>`))
    .join("")}</div></div>`;
}
function mxdWave(amp) {
  // 같은 모양의 오르내림을 크기만 다르게(잔잔 ↔ 출렁)
  const ys = [0, 0.6, -0.4, 0.9, -0.7, 0.3, -1, 0.8, -0.2, 0.5, -0.8, 1, -0.5, 0.2];
  const pts = ys.map((y, i) => `${(i * (100 / (ys.length - 1))).toFixed(1)},${(23 - y * amp).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 100 46" preserveAspectRatio="none"><line x1="0" y1="23" x2="100" y2="23" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 2"/><polyline points="${pts}" fill="none" stroke="#7230f0" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
// key: ret · rev · ret1y · vol · rsi · ni · om · roe · cf · debt · mcap · dv · surge · w52 · per · div · fee · aum · chg
function mxDiagramHtml(key) {
  mxdEnsureCss();
  switch (key) {
    case "ret": {
      const bars = Array.from({ length: 11 }, (_, i) => `<i class="${i === 10 ? "on" : ""}" style="height:${((Math.pow(1.1, i) / Math.pow(1.1, 10)) * 100).toFixed(1)}%"></i>`).join("");
      return `<div class="mxd"><div class="mxd-grow">${bars}</div><div class="mxd-cap"><span style="color:inherit;opacity:.8;font-weight:700">10년 전 100만원</span><span style="opacity:1;color:#7230f0;font-weight:800">지금 259만원</span></div><div class="mxd-note">해마다 10%씩 불어나면 → 10년 연평균 10%</div></div>`;
    }
    case "rev":
      return mxdBars2("1년 전 같은 석 달", 100, "100억", "최근 석 달", 120, "120억", "매출 증가 +20%");
    case "ni":
      return mxdBars2("1년 전 같은 석 달", 100, "10억", "최근 석 달", 130, "13억", "순이익 증가 +30%");
    case "cf":
      return mxdBars2("1년 전 같은 석 달", 100, "50억", "최근 석 달", 110, "55억", "현금 증가 +10%");
    case "ret1y":
      return mxdBars2("1년 전", 100, "100만원", "지금", 130, "130만원", "1년 수익률 +30%");
    case "chg":
      return mxdBars2("어제 마지막 가격", 100, "10,000원", "지금", 103, "10,300원", "등락 +3%");
    case "surge":
      return mxdBars2("평소 하루", 100, "100억", "오늘", 300, "300억", "거래 몰림 3배");
    case "debt":
      return mxdBars2("회사 자기 돈", 100, "100원", "빚", 50, "50원", "부채비율 50%");
    case "aum":
      return mxdBars2("작은 ETF", 5, "500억", "큰 ETF", 100, "20조", "");
    case "om":
      return mxdPart("판 금액 100원", 20, "본업으로 남긴 돈 20원 → 영업이익률 20%");
    case "roe":
      return mxdPart("주주 몫의 돈 100원", 15, "1년 동안 번 돈 15원 → ROE 15%");
    case "div":
      return mxdPart("산 금액 100만원", 4, "1년 배당 4만원 → 배당률 4%");
    case "fee":
      return mxdPart("맡긴 돈 1,000만원", 1, "1년 수수료 1만원 → 운용보수 0.1%");
    case "w52":
      return mxdGauge("", 70, "지금 70%", ["1년 중 가장 쌌던 값 0%", "가장 비쌌던 값 100%"]);
    case "rsi":
      return mxdGauge(
        `<span class="mxd-zone" style="left:0;width:30%;background:rgba(37,99,235,.55);border-radius:999px 0 0 999px"></span><span class="mxd-zone" style="left:70%;width:30%;background:rgba(220,38,38,.6);border-radius:0 999px 999px 0"></span>`,
        50,
        "50 = 오른 힘·내린 힘 반반",
        ["0", "30 이하 많이 빠짐", "70 이상 많이 오름", "100"]
      );
    case "vol":
      return `<div class="mxd"><div class="mxd-wave"><div>${mxdWave(4)}잔잔한 종목 · 하루 0.5%</div><div>${mxdWave(19)}출렁이는 종목 · 하루 3%</div></div></div>`;
    case "per": {
      const blocks = Array.from({ length: 10 }, (_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("");
      return `<div class="mxd"><div class="mxd-blocks">${blocks}</div><div class="mxd-cap"><span>한 칸 = 1주가 1년에 버는 이익 1,000원</span><span>주가 10,000원</span></div><div class="mxd-note">주가가 1년 이익의 10칸 → PER 10배</div></div>`;
    }
    case "mcap":
      return mxdEq([{ t: "5만원", s: "주가" }, "×", { t: "1억 주", s: "주식 수" }, "=", { t: "5조원", s: "시가총액", on: true }]);
    case "dv":
      return mxdEq([{ t: "1만원 × 100주", s: "거래 한 건" }, "+", { t: "1만원 × 50주", s: "또 한 건" }, "+ … =", { t: "거래대금", s: "오늘 하루 합계", on: true }]);
    default:
      return "";
  }
}
