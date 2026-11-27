// "오늘의 증시지도"(아침 브리핑 쇼츠) 대본을 음성으로 — 2026-11-27.
// 그림(gen-brief-images.js)과 같은 방식: 주문 파일이 올라오면 GitHub Actions 에서 OpenAI 음성(gpt-4o-mini-tts)으로 만들어 같은 폴더에 넣는다.
//
//   data/brief-voice/<YYYY-MM-DD>/job.json
//       { "day": "2026-11-27", "voice": "coral", "instructions": "…읽는 말투…", "items": [ { "id": "L00", "text": "…", "voice": "(없으면 위의 voice)" }, ... ] }
//   → data/brief-voice/<YYYY-MM-DD>/<id>.mp3  + result.json(문장별 성공·실패)
//
// 이미 있는 파일은 다시 만들지 않는다(job.force 가 true 면 다시 만듦). 로컬 수동 실행: OPENAI_API_KEY=... node scripts/gen-brief-voice.js [YYYY-MM-DD]

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "data", "brief-voice");
const KEEP_DAYS = 7;
const DEFAULT_STYLE = "차분하고 또렷한 한국어 아침 뉴스 앵커의 말투로, 조금 빠르고 밝게 읽습니다. 숫자와 종목 이름은 정확하게 발음합니다.";

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function speak(text, voice, instructions, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, voice, input: text, instructions, response_format: "mp3" }),
    },
    90000
  );
  if (!res.ok) throw new Error(`OpenAI 음성 생성 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

function prune(today) {
  if (!fs.existsSync(ROOT)) return;
  const cutoff = Date.parse(today.slice(0, 10)) - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(ROOT)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(name)) continue;
    if (Date.parse(name.slice(0, 10)) < cutoff) fs.rmSync(path.join(ROOT, name), { recursive: true, force: true });
  }
}

async function main() {
  const days = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d) && fs.existsSync(path.join(ROOT, d, "job.json"))).sort()
    : [];
  const day = process.argv[2] || days[days.length - 1];
  if (!day) throw new Error("data/brief-voice/<날짜>/job.json 이 없음");
  const dir = path.join(ROOT, day);
  const job = JSON.parse(fs.readFileSync(path.join(dir, "job.json"), "utf8"));
  const model = job.model || "gpt-4o-mini-tts";
  const result = { day, model, at: new Date().toISOString(), items: [] };
  let failed = 0;
  for (const it of job.items || []) {
    const id = String(it.id).replace(/[^A-Za-z0-9_-]/g, "");
    const file = path.join(dir, `${id}.mp3`);
    const voice = it.voice || job.voice || "coral";
    if (fs.existsSync(file) && !job.force) {
      result.items.push({ id, voice, ok: true, skipped: true, bytes: fs.statSync(file).size });
      continue;
    }
    try {
      const buf = await speak(String(it.text), voice, it.instructions || job.instructions || DEFAULT_STYLE, model);
      fs.writeFileSync(file, buf);
      result.items.push({ id, voice, ok: true, bytes: buf.length });
      console.log(`음성 ${id}(${voice}) 완료 (${buf.length} bytes)`);
    } catch (e) {
      failed++;
      result.items.push({ id, voice, ok: false, error: String(e.message || e).slice(0, 400) });
      console.error(`음성 ${id}(${voice}) 실패: ${e.message || e}`);
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
