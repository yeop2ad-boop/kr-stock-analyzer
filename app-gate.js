// ---------- 앱 최소 버전 안내 (2026-10-21 사용자 요청) ----------
// 안드로이드 앱(마켓맵, 패키지 kr.marketmap.app)은 한 번 설치하면 아이콘이 그 빌드에 박혀 있어서, 새 아이콘은 새 앱을 설치해야 바뀐다.
// 새 앱은 시작 주소에 ?app=2 가 붙고(manifest.json의 start_url), 예전 앱은 안 붙는다 → 예전 앱으로 들어온 사람에게만
// "업데이트하면 계속 쓸 수 있어요" 화면을 띄운다. 새 앱이 플레이스토어에 올라가기 전에 막으면 안 되므로
// data/app-config.json 의 minTwaVersion 을 2로 올리기 전까지는 아무에게도 보이지 않는다(기본 1 = 꺼짐).
(function () {
  var ver = 1;
  var isTwa = false;
  try {
    // 첫 진입 페이지에서 한 번 판별해 세션에 저장(지도로 넘어가면 referrer·주소 값이 사라지므로 index.html 머리 스크립트가 먼저 저장해 둠)
    isTwa = sessionStorage.getItem("mm_twa") === "1";
    ver = Number(sessionStorage.getItem("mm_twa_ver") || 1) || 1;
  } catch (e) {}
  if (!isTwa) return;
  fetch(location.pathname.indexOf("/sector-map/") >= 0 ? "../data/app-config.json" : "data/app-config.json", { cache: "no-store" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (cfg) {
      if (!cfg || !(Number(cfg.minTwaVersion) > ver)) return;
      var wrap = document.createElement("div");
      wrap.id = "appUpdateGate";
      wrap.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#7230f0;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;font-family:Pretendard,-apple-system,'Segoe UI',sans-serif;";
      var url = cfg.playUrl || "https://play.google.com/store/apps/details?id=kr.marketmap.app";
      wrap.innerHTML =
        '<div style="font-size:48px;line-height:1;margin-bottom:18px;">⬆️</div>' +
        '<div style="font-size:22px;font-weight:800;letter-spacing:-0.4px;margin-bottom:10px;">새 버전으로 업데이트해 주세요</div>' +
        '<div style="font-size:14.5px;line-height:1.6;opacity:0.92;max-width:300px;margin-bottom:26px;">앱 아이콘과 화면이 새로워졌어요.<br>업데이트하면 계속 사용할 수 있어요.</div>' +
        '<a href="' + url + '" style="display:inline-block;background:#fff;color:#7230f0;font-size:16px;font-weight:800;padding:14px 34px;border-radius:14px;text-decoration:none;">업데이트하러 가기</a>';
      document.body.appendChild(wrap);
      document.documentElement.style.overflow = "hidden";
    })
    .catch(function () {});
})();
