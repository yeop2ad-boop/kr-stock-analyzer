// 검색용 종목 페이지 공용 스크립트 (2026-11-25) — scripts/build-stock-pages.py 가 만드는 페이지가 쓴다.
//  1) 종목 페이지: 날마다 바뀌는 숫자(시가총액·PER·배당·52주 위치)를 q-kr.json / q-us.json 의 최신 값으로 덮는다.
//     (페이지 파일은 내용이 바뀔 때만 다시 쓰므로, 박혀 있는 값은 며칠 묵었을 수 있다)
//  2) 목록 페이지: 이름·코드로 거르기, 한국/미국 바꾸기.
(function () {
  var d = document;
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  // 생성기(money_kr / money_us)와 같은 규칙. 단위: 한국 = 억 원, 미국 = 백만 달러
  function capKr(e) { var j = e / 1e4; return j >= 1000 ? comma(Math.round(j)) + "조원" : j >= 1 ? j.toFixed(1) + "조원" : comma(Math.round(e)) + "억원"; }
  function capUs(m) { var j = m / 1e6, e = m / 100; return j >= 1 ? j.toFixed(2) + "조 달러" : e >= 100 ? comma(Math.round(e)) + "억 달러" : e.toFixed(1) + "억 달러"; }
  function put(k, t) { var el = d.querySelector('[data-f="' + k + '"]'); if (el && t != null) el.textContent = t; }

  var b = d.body, mk = b.getAttribute("data-q"), slug = b.getAttribute("data-s");
  if (mk && slug && window.fetch) {
    fetch("/stock/q-" + mk + ".json").then(function (r) { return r.ok ? r.json() : null; }).then(function (q) {
      var v = q && q.d && q.d[slug]; if (!v) return;
      if (v[0] != null) put("mcap", mk === "kr" ? capKr(v[0]) : capUs(v[0]));
      put("per", v[1] != null && v[1] > 0 ? v[1].toFixed(1) + "배" : "–");
      put("div", v[2] != null ? v[2].toFixed(1) + "%" : "–");
      if (v[3] != null) {
        put("w52", Math.round(v[3]) + "%");
        var dot = d.querySelector('[data-f="w52dot"]'); if (dot) dot.style.left = Math.max(0, Math.min(100, v[3])) + "%";
      }
      put("asof", q.t);
    }).catch(function () {});
  }

  var find = d.getElementById("find");
  if (find) {
    var items = [].slice.call(d.querySelectorAll(".list li")), groups = [].slice.call(d.querySelectorAll(".grp")),
      mkts = [].slice.call(d.querySelectorAll(".mkt")), tabs = [].slice.call(d.querySelectorAll(".seg button")), cur = "kr";
    var apply = function () {
      var q = find.value.trim().toLowerCase();
      mkts.forEach(function (m) { m.hidden = !q && m.id !== cur; });
      items.forEach(function (li) { li.hidden = !!q && li.getAttribute("data-n").indexOf(q) < 0; });
      groups.forEach(function (g) { g.hidden = !g.querySelector("li:not([hidden])"); });
      tabs.forEach(function (t) { t.setAttribute("aria-pressed", !q && t.getAttribute("data-m") === cur ? "true" : "false"); });
    };
    tabs.forEach(function (t) { t.addEventListener("click", function () { cur = t.getAttribute("data-m"); find.value = ""; apply(); }); });
    find.addEventListener("input", apply);
    if (location.hash === "#us") cur = "us";
    apply();
  }
})();
