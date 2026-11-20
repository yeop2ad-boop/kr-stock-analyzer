// "○○이란?" 설명 글과 계산식 카드 — 본체(별별순위·종목 상세)와 시장(지도)이 같이 쓴다(2026-11-20 사용자 요청).
//  · 예전엔 같은 지표를 본체와 지도가 서로 다른 말로 설명했다(PER: "낮을수록 싸다" vs "높을수록 비싸다", RSI: "1년 평균 대비" vs "70↑ 과열") → 한 벌로 통일.
//  · 글은 비전문가도 읽히게: ① 무엇을 뜻하는지 ② 숫자 예시.
//  · 그림(2026-11-20 2차): 처음 만든 막대·눈금 그림은 "이해하기 어렵다"는 사용자 의견 → 다른 증권사·금융 앱(토스피드·토스뱅크·KB 용어사전 등)이 쓰는 방식,
//    곧 "분수 모양 계산식 한 줄 + 숫자를 넣은 예시 한 줄"로 바꿨다. 대표 종목 비교 막대는 그 아래에 그대로 둔다. 숫자는 이해를 돕는 예시다.
// 두 페이지 모두 app.js보다 먼저 불러온다. 승률(win)은 winrate-benchmark.js의 설명을 그대로 쓴다.
const MX_TEXT = {
  ret: "최근 10년 동안 1년에 평균 몇 %씩 올랐는지예요.\n10%면 10년 전 100만원이 지금 약 259만원이 된 거예요.",
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
.mxd{margin:10px 0 6px;padding:14px 12px 12px;border-radius:12px;background:rgba(128,128,128,.09);font-size:13px;line-height:1.35;color:inherit}
.mxd *{box-sizing:border-box}
.mxd-line{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 8px;font-weight:700}
.mxd-line + .mxd-line{margin-top:12px;padding-top:12px;border-top:1px dashed rgba(128,128,128,.4)}
.mxd-name{font-weight:800}
.mxd-ex{flex:0 0 auto;padding:2px 8px;border-radius:999px;background:rgba(128,128,128,.22);font-size:11px;font-weight:800}
.mxd-op{font-weight:800;opacity:.75}
.mxd-frac{display:inline-flex;flex-direction:column;align-items:center;text-align:center;min-width:0}
.mxd-frac i{font-style:normal;padding:2px 6px;white-space:nowrap}
.mxd-frac i:first-child{border-bottom:2px solid currentColor}
.mxd-res{display:inline-block;padding:3px 10px;border-radius:999px;background:#7230f0;color:#fff;font-weight:800;white-space:nowrap}
.mxd-term{white-space:nowrap}
@media (max-width:360px){.mxd{font-size:12px}}
`;
function mxdEnsureCss() {
  if (typeof document === "undefined" || document.getElementById("mxdCss")) return;
  const st = document.createElement("style");
  st.id = "mxdCss";
  st.textContent = MXD_CSS;
  document.head.appendChild(st);
}
const mxdFrac = (top, bottom) => `<span class="mxd-frac"><i>${top}</i><i>${bottom}</i></span>`;
// 계산식 한 줄 + 숫자를 넣은 예시 한 줄.  formula·example: 가운데 들어갈 HTML(분수·곱셈 등), tail: 분수 뒤에 붙는 말("× 100" 등)
function mxdCard(name, formula, example, result, tail) {
  return `<div class="mxd"><div class="mxd-line"><span class="mxd-name">${name}</span><span class="mxd-op">=</span>${formula}${tail ? `<span class="mxd-op">${tail}</span>` : ""}</div><div class="mxd-line"><span class="mxd-ex">예</span>${example}${tail ? `<span class="mxd-op">${tail}</span>` : ""}<span class="mxd-op">=</span><span class="mxd-res">${result}</span></div></div>`;
}
const mxdMul = (a, b) => `<span class="mxd-term">${a}</span><span class="mxd-op">×</span><span class="mxd-term">${b}</span>`;
// key: ret · rev · ret1y · vol · rsi · ni · om · roe · cf · debt · mcap · dv · surge · w52 · per · div · fee · chg  (aum은 계산식이 없어 글만)
function mxDiagramHtml(key) {
  mxdEnsureCss();
  switch (key) {
    case "per":
      return mxdCard("PER", mxdFrac("주가", "1주가 1년에 버는 이익"), mxdFrac("10,000원", "1,000원"), "10배");
    case "dv":
      return mxdCard("거래대금", mxdMul("주가", "오늘 거래된 주식 수"), mxdMul("10,000원", "100만 주"), "100억원");
    case "surge":
      return mxdCard("거래 몰림", mxdFrac("오늘 거래대금", "평소 하루 거래대금"), mxdFrac("300억원", "100억원"), "3배");
    case "mcap":
      return mxdCard("시가총액", mxdMul("주가", "전체 주식 수"), mxdMul("5만원", "1억 주"), "5조원");
    case "rev":
      return mxdCard("매출 증가", mxdFrac("이번 매출 − 1년 전 매출", "1년 전 매출"), mxdFrac("120억 − 100억", "100억"), "+20%");
    case "ni":
      return mxdCard("순이익 증가", mxdFrac("이번 순이익 − 1년 전 순이익", "1년 전 순이익"), mxdFrac("13억 − 10억", "10억"), "+30%");
    case "cf":
      return mxdCard("현금 증가", mxdFrac("이번에 들어온 현금 − 1년 전", "1년 전에 들어온 현금"), mxdFrac("55억 − 50억", "50억"), "+10%");
    case "om":
      return mxdCard("영업이익률", mxdFrac("본업으로 남긴 돈(영업이익)", "판 금액(매출)"), mxdFrac("20원", "100원"), "20%");
    case "roe":
      return mxdCard("ROE", mxdFrac("1년 동안 번 돈(순이익)", "주주 몫의 돈(자기자본)"), mxdFrac("15원", "100원"), "15%");
    case "debt":
      return mxdCard("부채비율", mxdFrac("빚", "회사 자기 돈"), mxdFrac("50원", "100원"), "50%");
    case "div":
      return mxdCard("배당률", mxdFrac("1년 동안 받은 배당금", "지금 주가"), mxdFrac("400원", "10,000원"), "4%");
    case "fee":
      return mxdCard("운용보수", mxdFrac("1년 수수료", "맡긴 돈"), mxdFrac("1만원", "1,000만원"), "0.1%");
    case "ret1y":
      return mxdCard("1년 수익률", mxdFrac("지금 가격 − 1년 전 가격", "1년 전 가격"), mxdFrac("130만원 − 100만원", "100만원"), "+30%");
    case "chg":
      return mxdCard("등락", mxdFrac("지금 가격 − 어제 마지막 가격", "어제 마지막 가격"), mxdFrac("10,300원 − 10,000원", "10,000원"), "+3%");
    case "w52":
      return mxdCard("52주 위치", mxdFrac("지금 가격 − 1년 최저가", "1년 최고가 − 1년 최저가"), mxdFrac("17,000 − 10,000", "20,000 − 10,000"), "70%");
    case "rsi":
      return mxdCard("과열도(RSI)", mxdFrac("오른 폭", "오른 폭 + 내린 폭"), mxdFrac("3", "3 + 1"), "75", "× 100");
    case "vol":
      return mxdCard("하루 변동폭", mxdFrac("하루하루 오르내린 크기를 더한 값", "날짜 수"), mxdFrac("2% + 1% + 3%", "3일"), "2%");
    case "ret":
      return `<div class="mxd"><div class="mxd-line"><span class="mxd-name">1년상승(10년 평균)</span><span class="mxd-op">=</span><span class="mxd-term">10년 동안 오른 것을 1년 평균으로 나눈 값</span></div><div class="mxd-line"><span class="mxd-ex">예</span><span class="mxd-term">10년 전 100만원</span><span class="mxd-op">→</span><span class="mxd-term">지금 259만원</span><span class="mxd-op">=</span><span class="mxd-res">해마다 10%씩</span></div></div>`;
    default:
      return "";
  }
}
