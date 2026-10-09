// 스톡챗 끼워 넣기 모드 — 주소에 ?embed=1이 있을 때만 동작하고, 평소 마켓맵 사용에는 아무 영향이 없다.
//   ?embed=1&view=rank&market=kr|us|etf|crypto&item=win&region=kr|us   → 간편검색 순위 화면 그대로
//   ?embed=1&view=detail&ticker=005930.KS&sub=sreport|risk|summary       → 종목 상세(핵심지표/리스크) 그대로
//   ?embed=1&view=info&topic=winrate                                    → 순위 화면의 "+승률이란" 내용 그대로
//   ?embed=1&view=fear&market=kr|us|crypto         → 더보기 공포지수 화면 그대로
//   ?embed=1&view=analysis                                                → 투자분석 탭(투자방법 비교·내 포트폴리오) 그대로
// 부모(스톡챗)에는 postMessage로 ①화면 높이 ②종목을 눌렀다는 신호만 보낸다.
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.get("embed")) return;
  var view = q.get("view") || "rank";
  var id = q.get("id") || "";
  var root = document.documentElement;
  root.classList.add("embed-mode", "embed-" + view);
  if (view === "detail" && q.get("sub")) root.setAttribute("data-embed-sub", q.get("sub"));

  function post(msg) {
    try {
      msg.sc = true;
      msg.id = id;
      parent.postMessage(msg, location.origin);
    } catch (e) {
      /* 부모가 없으면(직접 열었을 때) 무시 */
    }
  }

  // 시장 선택(국내/해외)을 마켓맵 본체의 저장공간에 쓰지 않고 이 화면 안에서만 기억
  var mem = q.get("market") === "kr" ? "KR" : "US";
  window.getWatchlistActiveMarket = function () {
    return mem;
  };
  window.setWatchlistActiveMarket = function (m) {
    mem = m === "KR" ? "KR" : "US";
  };

  // 순위·분석 화면에서 종목을 누르면 이 안에서 열지 않고 부모(채팅)에 알려 새 블록으로 이어가게 함
  if (view !== "detail") {
    window.navigateToTicker = function (t) {
      post({ type: "open", symbol: String(t || "").toUpperCase() });
    };
  }

  // 테마: 부모 화면과 같게
  function applyTheme() {
    var t = q.get("theme");
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else if (t === "light") root.removeAttribute("data-theme");
  }

  // 높이 보고 — 내용이 바뀔 때마다(데이터가 늘어나는 3단계 로딩 포함) 부모가 iframe 높이를 맞춘다
  var lastH = 0;
  function report() {
    var h = Math.ceil(Math.max(document.body.scrollHeight, root.scrollHeight, document.body.offsetHeight));
    if (h && Math.abs(h - lastH) > 1) {
      lastH = h;
      post({ type: "height", h: h });
    }
  }
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  new MutationObserver(report).observe(document.body, { childList: true, subtree: true, attributes: true });
  setInterval(report, 500);

  function run() {
    applyTheme();
    try {
      if (view === "rank") {
        var market = q.get("market") || "kr";
        if (market === "etf") etfPopularRegion = q.get("region") === "kr" ? "kr" : "us";
        openSReportRank(q.get("item"), market === "etf" || market === "crypto" ? market : "stocks", market === "kr" ? "kr" : "us");
      } else if (view === "detail") {
        navigateToTicker(q.get("ticker"), { push: false });
      } else if (view === "info") {
        // 마켓맵 순위 화면의 "+승률이란"을 눌렀을 때 펼쳐지는 내용(설명 + 대표자산 10년평균 승률 비교)을 그대로
        var box = document.createElement("div");
        box.id = "embedInfo";
        box.className = "chart-detail-wrap chart-detail-expanded popular-winrate-info";
        box.innerHTML = '<div class="embed-info-title">승률이란?</div>' + buildWinRateBenchmarkHtml();
        document.body.appendChild(box);
      } else if (view === "fear") {
        openFearPanel(q.get("market") || "kr");
      } else if (view === "analysis") {
        var tab = document.querySelector('[data-fhtab="tab.analysis"]');
        if (tab) tab.click();
      }
    } catch (e) {
      post({ type: "error", message: String(e && e.message ? e.message : e) });
    }
    setTimeout(report, 300);
  }
  // app.js의 시작 코드(setTimeout 0)가 끝난 뒤에 실행
  setTimeout(run, 150);
})();
