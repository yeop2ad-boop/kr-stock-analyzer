// 대표자산 10년평균 승률 비교(데이터 + 그래프) — 본체(app.js)의 INVEST점수 +자세히·인기종목 +승률이란과
// 마켓맵(sector-map) 승률 버튼의 "+승률이란?"이 같이 쓴다(2026-10-06 공용 파일로 분리). 두 페이지 모두 app.js보다 먼저 불러온다.
const WINRATE_BENCHMARKS = [
  // short: 그래프 이름표용 짧은 이름(2026-09-13 그래프 확대 — 긴 이름은 서로 겹침)
  { name: "서울 부동산", short: "서울부동산", sub: "서울 아파트 지수", up: 94, down: 26, score: 78.3, color: "#8b5a2b" },
  { name: "SPY", short: "SPY", sub: "S&P500", up: 82, down: 38, score: 68.3, color: "#1f77b4" },
  { name: "QQQ", short: "QQQ", sub: "나스닥100", up: 78, down: 42, score: 65.0, color: "#ff7f0e" },
  { name: "필라델피아 반도체", short: "SOX", sub: "SOX", up: 77, down: 43, score: 64.2, color: "#2ca02c" },
  { name: "코스피200", short: "코스피200", sub: "KODEX200", up: 69, down: 51, score: 57.5, color: "#d62728" },
  { name: "BTC", short: "BTC", sub: "비트코인", up: 67, down: 53, score: 55.8, color: "#f7931a" },
  { name: "코스닥150", short: "코스닥150", sub: "KODEX코스닥150", up: 65, down: 55, score: 54.2, color: "#e377c2" },
  { name: "금 GOLD", short: "금", sub: "GLD", up: 63, down: 57, score: 52.5, color: "#d4af37" },
  { name: "이더리움", short: "ETH", sub: "ETH", up: 53, down: 52, score: 50.5, color: "#627eea" },
  { name: "코스피 인버스x1", short: "코스피인버스", sub: "KODEX인버스", up: 48, down: 72, score: 40.0, color: "#17becf" },
  { name: "나스닥 인버스x1", short: "나스닥인버스", sub: "PSQ", up: 38, down: 82, score: 31.7, color: "#9467bd" },
];
// 그래프(SVG 문자열)만 만든다 — 표·설명은 각 페이지가 자기 스타일로 붙인다.
// 2026-10-06 사용자 요청(마켓맵에서 깨짐·선 정리): 점+이름표(이름이 몰려 겹치고, 축 색이 본체 전용 변수라 마켓맵에선 안 보임)
// → 가로 막대그래프. 위에서부터 예금·적금(100%) → 승률 높은 순, 50%(오른 달·내린 달 반반) 점선 기준선.
// 글자·눈금은 currentColor라 흰 화면·검은 화면, 본체·마켓맵 어디서나 보인다.
function buildWinRateBenchmarkSvg() {
  const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rows = [{ name: "예금·적금", short: "예금·적금", score: 100, color: "#0f766e" }, ...WINRATE_BENCHMARKS.slice().sort((a, b) => b.score - a.score)];
  const W = 360;
  const LABEL_W = 92; // 이름 칸
  const X0 = LABEL_W;
  const X1 = W - 48; // 오른쪽 값 글자 자리
  const ROW = 22;
  const TOP = 22;
  const H = TOP + rows.length * ROW + 6;
  const xOf = (v) => X0 + (v / 100) * (X1 - X0);
  let grid = "";
  [0, 25, 50, 75, 100].forEach((v) => {
    const x = xOf(v).toFixed(1);
    const isHalf = v === 50;
    grid += `<line x1="${x}" y1="${TOP - 6}" x2="${x}" y2="${H - 4}" stroke="currentColor" stroke-opacity="${isHalf ? 0.45 : 0.12}" stroke-width="1" ${isHalf ? 'stroke-dasharray="3 3"' : ""}/>`;
    grid += `<text x="${x}" y="${TOP - 10}" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.6">${v}%</text>`;
  });
  const bars = rows
    .map((b, i) => {
      const y = TOP + i * ROW;
      const w = Math.max(1, xOf(b.score) - X0);
      return `
      <text x="${X0 - 8}" y="${y + 14}" text-anchor="end" font-size="12" font-weight="700" fill="currentColor">${escapeHtml(b.short || b.name)}</text>
      <rect x="${X0}" y="${y + 4}" width="${w.toFixed(1)}" height="13" rx="3" fill="${b.color}" />
      <text x="${(X0 + w + 5).toFixed(1)}" y="${y + 14.5}" font-size="11.5" font-weight="800" fill="${b.color}">${b.score === 100 ? "100%" : b.score.toFixed(1) + "%"}</text>`;
    })
    .join("");
  const svg = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" role="img" aria-label="대표 자산 10년평균 승률 비교 막대그래프">
      ${grid}${bars}
    </svg>
    <p style="margin:4px 0 0;font-size:11px;opacity:0.65;text-align:right;">점선 = 50%(오른 달·내린 달이 반반)</p>`;
  return svg;
}
// 맨 위 설명 문구(2026-09-13 사용자 지정)
const WINRATE_INTRO_HTML = `
    <div class="wr-intro">
      <p class="wr-intro-q">10년평균 승률이란?</p>
      <p class="wr-intro-def">최근 10년(최대 120개월) 동안 <b>전달보다 오르며 마감한 달의 비율</b>입니다. 수익률의 크기가 아니라 <b>이긴 횟수</b>라, <b class="wr-intro-key">높을수록 꾸준히 우상향했다는 뜻입니다.</b></p>
    </div>`;
