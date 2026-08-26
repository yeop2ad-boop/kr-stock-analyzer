// PWA 설치(홈 화면에 추가) 요건 충족용 최소 서비스워커.
// 실시간 시세·재무 데이터를 다루는 앱이라 캐시로 오래된 데이터가 보이는 위험을 피하기 위해
// 의도적으로 캐싱 로직 없이 모든 요청을 그대로 네트워크에 통과시킴.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
