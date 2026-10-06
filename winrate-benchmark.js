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
// 그래프(SVG 문자열)만 만든다 — 표·설명은 각 페이지가 자기 스타일로 붙인다
function buildWinRateBenchmarkSvg() {
  const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const X_ZERO = 16;
  const X_HUNDRED = 350;
  const X0 = 44;
  const X1 = 318;
  const MIN = 28;
  const MAX = 85;
  const AXIS_Y = 122;
  const xOf = (score) => X0 + ((score - MIN) / (MAX - MIN)) * (X1 - X0);
  const breakMark = (x) =>
    `<line x1="${x - 5}" y1="${AXIS_Y + 5}" x2="${x - 1}" y2="${AXIS_Y - 5}" stroke="var(--muted)" stroke-width="1.4"/><line x1="${x + 1}" y1="${AXIS_Y + 5}" x2="${x + 5}" y2="${AXIS_Y - 5}" stroke="var(--muted)" stroke-width="1.4"/>`;
  const DEPOSIT_COLOR = "#0f766e";
  // 점수가 몰려 있어 이름표를 위 3단·아래 2단으로 번갈아 배치(리더 선으로 연결)
  const tierYs = [98, 64, 30, 154, 190];
  const dots = WINRATE_BENCHMARKS.map((b, i) => {
    const x = xOf(b.score);
    const tier = tierYs[i % tierYs.length];
    const above = tier < AXIS_Y;
    const labelY = above ? tier : tier + 4;
    return `
      <line x1="${x}" y1="${AXIS_Y}" x2="${x}" y2="${above ? tier + 16 : tier - 12}" stroke="${b.color}" stroke-width="1" stroke-dasharray="2 2" opacity="0.8"/>
      <circle cx="${x}" cy="${AXIS_Y}" r="5" fill="${b.color}" stroke="#fff" stroke-width="1.4"/>
      <text x="${x}" y="${labelY}" text-anchor="middle" font-size="14.5" font-weight="800" fill="${b.color}">${escapeHtml(b.short || b.name)}</text>
      <text x="${x}" y="${labelY + 15}" text-anchor="middle" font-size="13" font-weight="700" fill="${b.color}">${b.score}%</text>`;
  }).join("");
  const svg = `
    <svg viewBox="0 0 380 212" style="width:100%;height:auto;display:block;" role="img" aria-label="대표 자산 10년평균 승률 비교선">
      ${[
        [X_ZERO, (X_ZERO + X0) / 2 - 4],
        [(X_ZERO + X0) / 2 + 4, (X1 + X_HUNDRED) / 2 - 4],
        [(X1 + X_HUNDRED) / 2 + 4, X_HUNDRED],
      ].map(([a, b]) => `<line x1="${a}" y1="${AXIS_Y}" x2="${b}" y2="${AXIS_Y}" stroke="var(--muted)" stroke-width="2"/>`).join("")}
      ${[30, 40, 50, 60, 70, 80].map((v) => `<line x1="${xOf(v)}" y1="${AXIS_Y - 3}" x2="${xOf(v)}" y2="${AXIS_Y + 3}" stroke="var(--muted)" stroke-width="1.2"/>`).join("")}
      ${breakMark((X_ZERO + X0) / 2)}${breakMark((X1 + X_HUNDRED) / 2)}
      <line x1="${X_ZERO}" y1="${AXIS_Y - 6}" x2="${X_ZERO}" y2="${AXIS_Y + 6}" stroke="var(--muted)" stroke-width="2"/>
      <text x="${X_ZERO}" y="${AXIS_Y + 20}" text-anchor="middle" font-size="12.5" font-weight="800" fill="var(--text)">0%</text>
      <text x="${X_HUNDRED}" y="${AXIS_Y + 20}" text-anchor="middle" font-size="12.5" font-weight="800" fill="var(--text)">100%</text>
      <line x1="${X_HUNDRED}" y1="${AXIS_Y}" x2="${X_HUNDRED}" y2="${80}" stroke="${DEPOSIT_COLOR}" stroke-width="1" stroke-dasharray="2 2" opacity="0.8"/>
      <circle cx="${X_HUNDRED}" cy="${AXIS_Y}" r="5" fill="${DEPOSIT_COLOR}" stroke="#fff" stroke-width="1.4"/>
      <text x="376" y="64" text-anchor="end" font-size="14.5" font-weight="800" fill="${DEPOSIT_COLOR}">예금·적금</text>
      <text x="376" y="79" text-anchor="end" font-size="13" font-weight="700" fill="${DEPOSIT_COLOR}">100%</text>
      ${dots}
    </svg>`;
  return svg;
}
// 맨 위 설명 문구(2026-09-13 사용자 지정)
const WINRATE_INTRO_HTML = `
    <div class="wr-intro">
      <p class="wr-intro-q">10년평균 승률이란?</p>
      <p class="wr-intro-def">최근 10년(최대 120개월) 동안 <b>전달보다 오르며 마감한 달의 비율</b>입니다. 수익률의 크기가 아니라 <b>이긴 횟수</b>라, <b class="wr-intro-key">높을수록 꾸준히 우상향했다는 뜻입니다.</b></p>
    </div>`;
