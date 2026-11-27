// "오늘의 증시지도"(아침 브리핑 쇼츠) 대본을 음성으로 — 2026-11-27.
// 그림(gen-brief-images.js)과 같은 방식: 주문 파일이 올라오면 GitHub Actions 에서 음성을 만들어 같은 폴더에 넣는다.
//
//   data/brief-voice/<YYYY-MM-DD…>/job.json
//       { "day": "2026-11-27", "provider": "openai" | "gemini", "voice": "marin", "instructions": "…읽는 말투…",
//         "items": [ { "id": "L00", "text": "…", "voice": "(없으면 위의 voice)" }, ... ] }
//   → 같은 폴더에 <id>.mp3(OpenAI) 또는 <id>.wav(Gemini)  + result.json(문장별 성공·실패)
//
// provider
//   openai (기본) : gpt-4o-mini-tts · 키 OPENAI_API_KEY
//   gemini        : gemini-3.8-flash-tts(Interactions API · 2026-11-27 공식 문서 기준) · 키 GEMINI_API_KEY · WAV(24kHz 모노)로 받음
//                   무료 한도 = 하루 10번(2026-11-27 거절 글로 확인: "limit: 10 requests per day on Free Tier") — 문장마다 부르면 모자란다.
//                   주문의 model 로 gemini-3.8-flash-lite-tts(가벼운 모델 · 한도 따로)를 고를 수 있다.
//
// 폴더를 지정하지 않으면 주문이 있는 폴더를 모두 보고, 아직 없는 파일만 만든다(job.force 가 true 면 다시 만듦).
// 로컬 수동 실행: OPENAI_API_KEY=... node scripts/gen-brief-voice.js [폴더 이름]

const fs = require("fs");
const path = require("path");

// BRIEF_VOICE_ROOT 를 주면 그 폴더에서 주문을 읽고 거기에 만든다(이 PC 에서 바로 만들 때 — 저장소 밖 폴더)
const ROOT = process.env.BRIEF_VOICE_ROOT || path.join(__dirname, "..", "data", "brief-voice");
const KEEP_DAYS = 7;
const DEFAULT_STYLE = "차분하고 또렷한 한국어 아침 뉴스 앵커의 말투로, 조금 빠르고 밝게 읽습니다. 숫자와 종목 이름은 정확하게 발음합니다.";
const DEFAULT_STYLE_GEMINI = "calm, clear Korean morning news anchor; slightly fast and bright; numbers and company names pronounced precisely";

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function speakOpenAI(text, voice, instructions, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || "gpt-4o-mini-tts", voice, input: text, instructions: instructions || DEFAULT_STYLE, response_format: "mp3" }),
    },
    90000
  );
  if (!res.ok) throw new Error(`OpenAI 음성 생성 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function speakGemini(text, voice, style, model) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않음(GitHub Secrets 에 GEMINI_API_KEY 가 없음)");
  const res = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: model || "gemini-3.8-flash-tts",
        input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: style || DEFAULT_STYLE_GEMINI }] }] }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice }] },
      }),
    },
    120000
  );
  if (!res.ok) throw new Error(`Gemini 음성 생성 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  let b64 = null;
  for (const step of data.steps || []) {
    if (step.type !== "model_output") continue;
    for (const c of step.content || []) if (c.type === "audio" && c.data) b64 = c.data;
  }
  if (!b64) throw new Error("Gemini 응답에 음성 데이터 없음: " + JSON.stringify(data).slice(0, 300));
  return Buffer.from(b64, "base64");
}

function prune(today) {
  if (!fs.existsSync(ROOT)) return;
  const cutoff = Date.parse(today.slice(0, 10)) - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(ROOT)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(name)) continue;
    if (Date.parse(name.slice(0, 10)) < cutoff) fs.rmSync(path.join(ROOT, name), { recursive: true, force: true });
  }
}

async function runDay(day) {
  const dir = path.join(ROOT, day);
  const job = JSON.parse(fs.readFileSync(path.join(dir, "job.json"), "utf8"));
  const result = { day, at: new Date().toISOString(), items: [] };
  let failed = 0;
  let made = 0;
  for (const it of job.items || []) {
    const id = String(it.id).replace(/[^A-Za-z0-9_-]/g, "");
    const provider = it.provider || job.provider || "openai";
    const ext = provider === "gemini" ? "wav" : "mp3";
    const file = path.join(dir, `${id}.${ext}`);
    const voice = it.voice || job.voice || (provider === "gemini" ? "Kore" : "coral");
    if (fs.existsSync(file) && !job.force) {
      result.items.push({ id, provider, voice, ok: true, skipped: true, bytes: fs.statSync(file).size });
      continue;
    }
    try {
      const style = it.instructions || job.instructions;
      let buf = null;
      for (let attempt = 1; ; attempt++) {
        try {
          buf = provider === "gemini" ? await speakGemini(String(it.text), voice, style, job.model) : await speakOpenAI(String(it.text), voice, style, job.model);
          break;
        } catch (e) {
          // 잠깐 몰려서 거절(429)되거나 서버가 바쁠 때(5xx)만 기다렸다가 다시 — 다른 실패는 그대로 실패 처리
          // 하루 한도(per day)에 걸린 것은 기다려도 소용없으니 바로 실패 처리
          if (attempt >= 5 || /per day/i.test(String(e.message || e)) || !/ (429|500|502|503|504) /.test(String(e.message || e))) throw e;
          console.error(`[${day}] 음성 ${id} 다시 시도(${attempt}) — ${String(e.message || e).slice(0, 120)}`);
          await new Promise((r) => setTimeout(r, 25000));
        }
      }
      fs.writeFileSync(file, buf);
      made++;
      // 제미나이는 짧은 시간에 여러 번 부르면 한동안 거절한다(2026-11-27: 8번 연달아 뒤부터 느려지다 멈춤) → 한 문장 만들고 조금 쉰다
      if (provider === "gemini") await new Promise((r) => setTimeout(r, Number(job.pace_ms || 7000)));
      result.items.push({ id, provider, voice, ok: true, bytes: buf.length });
      console.log(`[${day}] 음성 ${id}(${provider} ${voice}) 완료 (${buf.length} bytes)`);
    } catch (e) {
      failed++;
      result.items.push({ id, provider, voice, ok: false, error: String(e.message || e).slice(0, 400) });
      console.error(`[${day}] 음성 ${id}(${provider} ${voice}) 실패: ${e.message || e}`);
    }
  }
  // 새로 만든 것도 실패도 없으면(전부 이미 있음) 결과 파일을 건드리지 않는다
  if (made || failed || !fs.existsSync(path.join(dir, "result.json"))) fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 1));
  return failed;
}

async function main() {
  const days = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d) && fs.existsSync(path.join(ROOT, d, "job.json"))).sort()
    : [];
  const targets = process.argv[2] ? [process.argv[2]] : days;
  if (!targets.length) throw new Error("data/brief-voice/<날짜>/job.json 이 없음");
  let failed = 0;
  for (const day of targets) failed += await runDay(day);
  prune(targets[targets.length - 1]);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
