// 실적 화면 DB(data/earnings-view.json)를 만든다 — 최근실적(지난 7일)·예정(한국 3주·미국 2주) 종목의 매출 예상/실제와 분기 그래프 데이터.
// 앱이 종목마다 그 자리에서 계산하던 것(느림)을 하루 두 번 미리 계산해 두고, 화면은 이 파일 하나만 읽어 바로 그린다.
// 계산은 앱 자신의 코드(app.js의 window.__buildEarningsDb)를 그대로 쓴다 — 화면과 값이 어긋나지 않게 하려고 헤드리스 크롬으로 앱을 열어 실행한다.
//
// 실행: (저장소 루트에서 정적 서버를 8090에 띄운 뒤) node scripts/build-earnings-view.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.EARN_BASE || "http://localhost:8090";
const OUT = path.join(__dirname, "..", "data", "earnings-view.json");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 200)));
  await page.goto(`${BASE}/index.html?open=earn`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__buildEarningsDb === "function", null, { timeout: 90000 });
  const t0 = Date.now();
  const db = await page.evaluate(() => window.__buildEarningsDb());
  await browser.close();
  const nKr = Object.keys(db.kr || {}).length;
  const nUs = Object.keys(db.us || {}).length;
  console.log(`한국 ${nKr}종목, 미국 ${nUs}종목, ${Math.round((Date.now() - t0) / 1000)}초`);
  // 거의 다 비면(프록시 장애 등) 어제 파일을 지우지 않는다
  if (nKr + nUs < 20) {
    console.error("계산된 종목이 너무 적어 파일을 덮어쓰지 않습니다");
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(db));
  console.log("wrote", OUT, fs.statSync(OUT).size);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
