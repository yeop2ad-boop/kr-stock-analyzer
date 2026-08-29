// PWA 설치(홈 화면에 추가) 요건 충족용 최소 서비스워커.
// 실시간 시세·재무 데이터를 다루는 앱이라 캐시로 오래된 데이터가 보이는 위험을 피하기 위해 캐싱 로직 없음.
// 주의: respondWith(fetch(...)) 패스스루는 일부 기기/인앱 브라우저에서 간헐적으로 요청을 실패시켜
// "+전체보기" 데이터 로드가 계속 실패하는 원인이 됐음 — respondWith를 아예 부르지 않으면
// 브라우저가 기본 네트워크 처리를 그대로 수행해 서비스워커가 요청에 일절 개입하지 않음.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
