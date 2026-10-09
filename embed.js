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
    // root.scrollHeight는 iframe 자신의 높이 이상이라 내용이 줄어도 줄지 않는다(검색 중 흰 화면의 원인) → 내용(body) 높이만 잰다
    var h = Math.ceil(Math.max(document.body.scrollHeight, document.body.offsetHeight));
    if (h && Math.abs(h - lastH) > 1) {
      lastH = h;
      post({ type: "height", h: h });
    }
  }
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  new MutationObserver(report).observe(document.body, { childList: true, subtree: true, attributes: true });
  setInterval(report, 500);


  // ---- 마켓맵 화면을 더 끼워 넣기: 인기종목·급등/급락·실적·IPO·자동추적·인사이트·캘린더·뉴스 등 ----
  //   ?embed=1&view=popular|entry|tab|insight|overlay|calendar|market&market=kr|us|etf|crypto
  //     entry: label=상승률|하락률|거래대금|시가총액|PER|ROE|영업이익률|현금흐름 증가 …(RANKING_ENTRIES 이름)
  //     tab:   name=earnings|ipo|autotrack|drawdown
  //     insight: cat=firms|rankup|corr|sectorWin  / overlay: cat=news|brand|tech
  function setMarket(m) {
    if (m === "kr") bottomNavKrBtn.click();
    else if (m === "etf") bottomNavButtons.etf.click();
    else if (m === "crypto") bottomNavButtons.crypto.click();
    else bottomNavUsBtn.click();
  }
  function runExtra() {
    var m = q.get("market") || "us";
    if (view === "popular") {
      setMarket(m);
    } else if (view === "entry") {
      setMarket(m);
      var label = q.get("label");
      var idx = RANKING_ENTRIES.findIndex(function (e) { return e.label === label; });
      if (idx >= 0) setTimeout(function () { goToRankingEntry(idx); }, 120);
    } else if (view === "tab") {
      setMarket(m);
      var name = q.get("name");
      setTimeout(function () {
        if (name === "earnings") showOnlyCarouselView(function () { openEarningsTab(); });
        else if (name === "ipo") showOnlyCarouselView(function () { openIpoList(); });
        else if (name === "autotrack") goAutoTrackSection(m);
        else if (name === "drawdown") showOnlyCarouselView(function () { openCryptoMetricTab("drawdown"); });
      }, 120);
    } else if (view === "insight") {
      openInsightSectionOverlay(m, q.get("cat"));
    } else if (view === "overlay") {
      var cat = q.get("cat");
      if (cat === "brand") setMarket(m);
      openInsightOverlay(cat, cat === "news" ? "뉴스" : cat === "tech" ? "신기술" : m === "kr" ? "다트공시" : "브랜드평판순");
    } else if (view === "calendar") {
      openCalendarPanel();
    } else if (view === "market") {
      openMarketPanel();
    }
  }

  // 부모(스톡챗)가 "전체보기"를 요청하면 이 화면의 전체보기(나머지 종목 검색) 버튼을 대신 눌러준다
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin || !ev.data || !ev.data.sc || ev.data.type !== "loadAll") return;
    var btn = document.querySelector(".load-more-btn");
    if (btn) btn.click();
  });

  // 전체 검색(350·500종목)이 진행 중이면 "n/500 종목 전체 검색 중" 문구를 읽어 부모에 진행률을 알린다(숫자 없는 화면은 진행 중/끝만)
  var scanning = false, lastScan = "";
  function scanProgress() {
    var found = null;
    document.querySelectorAll(".top30-status").forEach(function (el) {
      if (found || el.offsetParent === null) return;
      var t = el.textContent || "";
      if (t.indexOf("전체 검색 중") >= 0) found = t;
    });
    if (found) {
      var m = found.match(/(\d+)\s*\/\s*(\d+)\s*종목/);
      var msg = m ? { done: +m[1], total: +m[2] } : { done: 0, total: 0 };
      var key = msg.done + "/" + msg.total;
      if (!scanning || key !== lastScan) {
        scanning = true;
        lastScan = key;
        post({ type: "scan", state: "run", done: msg.done, total: msg.total });
      }
    } else if (scanning) {
      scanning = false;
      lastScan = "";
      post({ type: "scan", state: "done" });
    }
  }
  setInterval(scanProgress, 400);

  // 순위 표는 처음엔 N줄만 보이고 부모(스톡챗)의 "더보기"로 10줄씩 늘린다(?limit=6, 이후 message {type:"limit"})
  var limitN = q.get("limit") ? parseInt(q.get("limit"), 10) : null;
  var lastTotal = -1;
  function applyLimit() {
    if (limitN == null) return;
    var bestN = 0;
    var tabs = document.querySelectorAll(".container table.rk-table"); // 순위 표(보이지 않는 다른 탭의 표는 제외)
    if (!tabs.length) tabs = document.querySelectorAll(".container table");
    tabs.forEach(function (t) {
      if (t.offsetParent === null) return;
      var rows = t.querySelectorAll("tbody tr");
      if (rows.length > bestN) bestN = rows.length;
      rows.forEach(function (r, i) {
        var want = i < limitN ? "" : "none";
        if (r.style.display !== want) r.style.display = want;
      });
    });
    if (bestN && bestN !== lastTotal) {
      lastTotal = bestN;
      post({ type: "rows", total: bestN });
    }
  }
  if (limitN != null) {
    new MutationObserver(applyLimit).observe(document.body, { childList: true, subtree: true });
    setInterval(applyLimit, 400);
  }
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin || !ev.data || !ev.data.sc || ev.data.type !== "limit") return;
    limitN = parseInt(ev.data.n, 10);
    lastTotal = -1;
    applyLimit();
    report();
  });

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
      } else {
        runExtra();
      }
    } catch (e) {
      post({ type: "error", message: String(e && e.message ? e.message : e) });
    }
    setTimeout(report, 300);
  }
  // app.js의 시작 코드(setTimeout 0)가 끝난 뒤에 실행
  setTimeout(run, 150);
})();
