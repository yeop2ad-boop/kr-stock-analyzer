// "오늘의 증시지도"(아침 브리핑 쇼츠)에 넣을 그림 생성 — 2026-11-27.
// 신기술(scan-techinsight.js)과 같은 방식: OpenAI gpt-image-2 로 그림을 만들어 저장소에 넣는다(키는 GitHub Secrets 의 OPENAI_API_KEY).
//
//   data/brief-images/<YYYY-MM-DD>/prompts.json  ← 이 PC 에서 대본과 함께 써서 올리는 주문 글
//       { "day": "2026-11-27", "quality": "low", "size": "1024x1536", "items": [ { "n": 1, "prompt": "..." }, ... ] }
//       style(선택) = 모든 그림 끝에 붙는 그림체 글 — 없으면 아래 STYLE_TAIL(차분한 보도 사진). 섬네일 느낌 등으로 바꿀 때 쓴다.
//   → data/brief-images/<YYYY-MM-DD>/<n>.webp  + result.json(장별 성공·실패)
//
// prompts.json 이 올라오면 .github/workflows/brief-images.yml 이 이 스크립트를 돌린다. 이미 있는 그림은 다시 만들지 않는다.
// 로컬 수동 실행: OPENAI_API_KEY=... node scripts/gen-brief-images.js [YYYY-MM-DD]
//
// 주문 글에는 실제 회사 이름·로고·사람을 넣지 않는다(글자·로고 없는 사진 느낌의 그림만).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "data", "brief-images");
const KEEP_DAYS = 7; // 이보다 오래된 날짜 폴더는 지운다(저장소 용량)
const STYLE_TAIL =
  " Photorealistic editorial news photograph, natural lighting, shallow depth of field, vertical 2:3 composition with the main subject in the upper-middle of the frame." +
  " No text, no letters, no numbers, no logos, no watermarks, no brand names, no recognizable real people.";

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function generate(prompt, size, quality) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality, output_format: "webp", output_compression: 85 }),
    },
    180000
  );
  if (!res.ok) throw new Error(`OpenAI 이미지 생성 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error("OpenAI 응답에 이미지 데이터 없음");
  return Buffer.from(b64, "base64");
}

function prune(today) {
  if (!fs.existsSync(ROOT)) return;
  const cutoff = Date.parse(today) - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(ROOT)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
    if (Date.parse(name) < cutoff) fs.rmSync(path.join(ROOT, name), { recursive: true, force: true });
  }
}

async function main() {
  const days = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.existsSync(path.join(ROOT, d, "prompts.json"))).sort()
    : [];
  const day = process.argv[2] || days[days.length - 1];
  if (!day) throw new Error("data/brief-images/<날짜>/prompts.json 이 없음");
  const dir = path.join(ROOT, day);
  const job = JSON.parse(fs.readFileSync(path.join(dir, "prompts.json"), "utf8"));
  const size = job.size || "1024x1536";
  const quality = job.quality || "low";
  const result = { day, model: "gpt-image-2", size, quality, at: new Date().toISOString(), items: [] };
  let failed = 0;
  for (const it of job.items || []) {
    const file = path.join(dir, `${it.n}.webp`);
    if (fs.existsSync(file) && !job.force) {
      result.items.push({ n: it.n, ok: true, skipped: true, bytes: fs.statSync(file).size });
      continue;
    }
    try {
      const buf = await generate((String(it.prompt).trim() + " " + String(job.style !== undefined ? job.style : STYLE_TAIL).trim()).trim(), size, quality);   // style 을 빈 글로 주면 주문 글만 그대로 보낸다
      fs.writeFileSync(file, buf);
      result.items.push({ n: it.n, ok: true, bytes: buf.length });
      console.log(`그림 ${it.n} 완료 (${buf.length} bytes)`);
    } catch (e) {
      failed++;
      result.items.push({ n: it.n, ok: false, error: String(e.message || e).slice(0, 400) });
      console.error(`그림 ${it.n} 실패: ${e.message || e}`);
    }
  }
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 1));
  prune(day);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
