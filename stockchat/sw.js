// 최소 서비스워커(설치 요건용) — 시세 데이터를 다루므로 캐싱 없이 브라우저 기본 네트워크 처리를 그대로 둠
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
