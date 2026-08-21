// "신기술" — 공신력 있는 4개 기관(MIT Technology Review, McKinsey, IEEE Spectrum, OECD)의 최신 글을
// 하나씩 골라 원문은 저장하지 않은 채 Anthropic Claude로 한국어 요약(자신의 문장으로 재작성)을,
// OpenAI gpt-image-2로 저작권 걱정 없는 AI 삽화를 생성해 data/techinsight.json + data/techinsight-images/
// 로 저장한다. scan-econpick.js와 같은 무의존성 CommonJS 패턴. GitHub Actions(.github/workflows/techinsight-daily.yml)에서
// 매일 KST 08:00에 실행됨.
//
// 로컬 수동 실행: ANTHROPIC_API_KEY=... OPENAI_API_KEY=... node scripts/scan-techinsight.js

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const IMAGES_DIR = path.join(DATA_DIR, "techinsight-images");
const ITEMS_FILE = path.join(DATA_DIR, "techinsight.json");
const SEEN_FILE = path.join(DATA_DIR, "techinsight-seen.json");

const RETENTION_DAYS = 30; // 이보다 오래된 항목/이미지는 매 실행마다 정리(레포 용량 억제)
const MAX_ITEMS = 20; // 30일이 안 지났어도 최신순으로 이 개수를 넘으면 오래된 것부터 정리(보관량 상한)
const SEEN_MAX = 400;

const UA_HEADERS = { "User-Agent": "netuja.com techinsight-bot contact@netuja.com" };

// ---------- 소스 4곳(기관당 이번 실행에서 최신 글 1건씩만 후보로 사용) ----------
// MIT Technology Review·IEEE Spectrum·McKinsey는 표준 RSS 제공. OECD는 RSS가 없어져 AI 정책 블로그
// "The AI Wonk"(oecd.ai/en/wonk, 서버렌더링 HTML 확인됨)를 정규식으로 직접 파싱.
const RSS_SOURCES = [
  { key: "mit", name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
  { key: "mckinsey", name: "McKinsey", url: "https://www.mckinsey.com/insights/rss" },
  { key: "ieee", name: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/feed.rss" },
];
const OECD_WONK_URL = "https://oecd.ai/en/wonk";
const OECD_SOURCE = { key: "oecd", name: "OECD" };

function makeId(link) {
  return crypto.createHash("sha1").update(link).digest("hex").slice(0, 12);
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  let t = m[1].trim();
  const cdata = t.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) t = cdata[1];
  return decodeEntities(t.replace(/<[^>]+>/g, "")).trim();
}

// RSS(<item>)와 Atom(<entry>) 피드를 모두 정규식 기반으로 파싱(외부 XML 파서 의존성 없이) — scan-econpick.js와 동일
function parseFeed(xml, sourceName) {
  let blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  let isAtom = false;
  if (blocks.length === 0) {
    blocks = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
    isAtom = true;
  }
  const items = [];
  for (const m of blocks) {
    const block = m[1];
    const title = extractTag(block, "title");
    let link = "";
    if (isAtom) {
      const linkMatch = block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
      link = linkMatch ? linkMatch[1] : "";
    } else {
      link = extractTag(block, "link");
    }
    const dateStr = extractTag(block, "pubDate") || extractTag(block, "updated") || extractTag(block, "published");
    const publishedAt = dateStr && !isNaN(Date.parse(dateStr)) ? new Date(dateStr).toISOString() : null;
    if (title && link) items.push({ title, link: link.trim(), publishedAt, source: sourceName });
  }
  return items;
}

async function harvestRssSource(src) {
  const res = await fetchWithTimeout(src.url, { headers: UA_HEADERS }, 15000);
  if (!res.ok) throw new Error(`${res.status}`);
  const xml = await res.text();
  return parseFeed(xml, src.name);
}

// OECD "The AI Wonk"는 RSS가 없어 서버렌더링된 목록 페이지 HTML에서 /en/wonk/<slug> 링크 + 카드 제목을 직접 추출
async function harvestOecdWonk() {
  const res = await fetchWithTimeout(OECD_WONK_URL, { headers: UA_HEADERS }, 15000);
  if (!res.ok) throw new Error(`${res.status}`);
  const html = await res.text();
  const linkRe = /href="(https:\/\/oecd\.ai\/en\/wonk\/[a-z0-9-]+)"[^>]*>\s*<[^>]*>?\s*([^<]{8,140})</gi;
  const seenLinks = new Set();
  const items = [];
  for (const m of html.matchAll(linkRe)) {
    const link = m[1];
    const title = decodeEntities(m[2]).trim();
    if (seenLinks.has(link) || !title) continue;
    seenLinks.add(link);
    items.push({ title, link, publishedAt: null, source: OECD_SOURCE.name });
  }
  return items;
}

function stripHtml(html) {
  const noScriptStyle = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const text = decodeEntities(noScriptStyle.replace(/<[^>]+>/g, " "));
  return text.replace(/\s+/g, " ").trim();
}

async function fetchArticleText(url) {
  const res = await fetchWithTimeout(url, { headers: UA_HEADERS }, 15000);
  if (!res.ok) throw new Error(`원문 fetch 실패: ${res.status}`);
  const html = await res.text();
  return stripHtml(html).slice(0, 9000);
}

// 제목 번역 + 핵심 요약(자신의 문장으로 재작성)을 한 번의 호출로 함께 받음
async function summarizeKo(title, bodyText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않음");
  const prompt =
    `다음은 신기술 관련 글입니다. 아래 형식 그대로만 답변해줘(다른 설명 문구 없이):\n\n` +
    `[제목]\n(원문 제목을 자연스러운 한국어 헤드라인으로 번역, 한 줄)\n\n` +
    `[요약]\n(원문을 그대로 옮기지 말고, 핵심 내용을 이해한 뒤 너 자신의 문장으로 재작성해서 한국어로 최대 5문장(5줄) 이내로 간결하게 요약. ` +
    `번호나 불릿 없이 자연스러운 문장으로, 각 문장은 줄바꿈으로 구분)\n\n` +
    `원문 제목: ${title}\n\n본문:\n${bodyText.slice(0, 7000)}`;
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    30000
  );
  if (!res.ok) throw new Error(`Anthropic API 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || "").join("").trim();
  if (!text) throw new Error("Anthropic 응답에 텍스트 없음");
  const titleMatch = text.match(/\[제목\]\s*\n?([\s\S]*?)(?:\n\[요약\]|$)/);
  const summaryMatch = text.match(/\[요약\]\s*\n?([\s\S]*)$/);
  const titleKo = titleMatch && titleMatch[1].trim() ? titleMatch[1].trim() : title;
  const summaryKo = summaryMatch && summaryMatch[1].trim() ? summaryMatch[1].trim() : text;
  return { titleKo, summaryKo };
}

// 신기술 주제에 맞는 미래지향적·인포그래픽풍 삽화 스타일 4종을 기관별로 고정 배정해 카드 톤을 구분
const IMAGE_STYLE_BY_SOURCE = {
  mit: "Modern flat editorial illustration, futuristic technology magazine cover style, cool blue and violet palette, abstract circuit or network motif",
  mckinsey: "Clean corporate infographic-style illustration, minimal geometric shapes, navy and teal palette, business technology strategy theme",
  ieee: "Technical blueprint-inspired illustration, engineering diagram aesthetic, cyan and dark navy palette, hardware or robotics motif",
  oecd: "Flat institutional illustration, policy and globe motifs, warm gold and deep blue palette, global cooperation on technology theme",
};
function buildImagePrompt(sourceKey, title) {
  const style = IMAGE_STYLE_BY_SOURCE[sourceKey] || IMAGE_STYLE_BY_SOURCE.mit;
  return (
    `${style} representing this emerging-technology topic: "${title}". ` +
    `No text, no logos, no brand names, no real recognizable people, square 1:1 composition.`
  );
}

async function generateImage(sourceKey, title) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const prompt = buildImagePrompt(sourceKey, title);
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        size: "1024x1024",
        quality: "low",
        output_format: "webp",
        output_compression: 70,
      }),
    },
    60000
  );
  if (!res.ok) throw new Error(`OpenAI 이미지 생성 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error("OpenAI 응답에 이미지 데이터 없음");
  return Buffer.from(b64, "base64");
}

// items는 호출 전 이미 최신순(createdAt 내림차순)으로 정렬돼 있어야 함 — 30일이 지났거나(시간 상한),
// 그 안이어도 최신 MAX_ITEMS개를 넘는(개수 상한) 항목은 모두 제외하고 이미지 파일도 함께 정리
function pruneOldItems(items) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const keep = [];
  for (const [i, it] of items.entries()) {
    const t = Date.parse(it.createdAt || it.publishedAt || 0);
    if (t >= cutoff && i < MAX_ITEMS) {
      keep.push(it);
    } else if (it.image) {
      const imgPath = path.join(__dirname, "..", it.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
  }
  return keep;
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  let existingItems = [];
  if (fs.existsSync(ITEMS_FILE)) existingItems = JSON.parse(fs.readFileSync(ITEMS_FILE, "utf8"));
  let seen = [];
  if (fs.existsSync(SEEN_FILE)) seen = JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
  const seenLinks = new Set(seen.map((s) => s.link));

  // 기관별로 최신순 후보 목록을 모으고, 하루 목표 건수(TARGET_COUNT)를 채울 때까지 기관을 돌아가며
  // 아직 쓰지 않은 항목을 하나씩 뽑음(기관 4곳 × 최대 1건이면 최대 4건뿐이라 목표를 못 채우므로,
  // 필요하면 한 기관에서 여러 건을 더 뽑아 채움 — 다만 매 라운드 모든 기관에 고르게 기회를 먼저 줌)
  const TARGET_COUNT = 6;
  const candidatesBySource = {};
  for (const src of RSS_SOURCES) {
    try {
      candidatesBySource[src.key] = await harvestRssSource(src);
      console.log(`[${src.name}] ${candidatesBySource[src.key].length}건 수집`);
    } catch (err) {
      candidatesBySource[src.key] = [];
      console.error(`[${src.name}] 수집 실패:`, err.message);
    }
  }
  try {
    candidatesBySource.oecd = await harvestOecdWonk();
    console.log(`[${OECD_SOURCE.name}] ${candidatesBySource.oecd.length}건 수집`);
  } catch (err) {
    candidatesBySource.oecd = [];
    console.error(`[${OECD_SOURCE.name}] 수집 실패:`, err.message);
  }

  const sourceKeys = Object.keys(candidatesBySource);
  const cursors = Object.fromEntries(sourceKeys.map((k) => [k, 0]));
  const selected = [];
  let progressed = true;
  while (selected.length < TARGET_COUNT && progressed) {
    progressed = false;
    for (const key of sourceKeys) {
      if (selected.length >= TARGET_COUNT) break;
      const list = candidatesBySource[key];
      while (cursors[key] < list.length) {
        const cand = list[cursors[key]++];
        if (!seenLinks.has(cand.link)) {
          selected.push({ ...cand, sourceKey: key });
          progressed = true;
          break;
        }
      }
    }
  }
  console.log(`오늘 선정된 후보: ${selected.length}건(목표 ${TARGET_COUNT}건, 기관 돌아가며 선정)`);

  const CONCURRENCY = 4;
  async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < items.length) {
        const i = nextIndex++;
        results[i] = await fn(items[i], i);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  const processed = await mapWithConcurrency(selected, CONCURRENCY, async (cand) => {
    try {
      const bodyText = await fetchArticleText(cand.link);
      const { titleKo, summaryKo } = await summarizeKo(cand.title, bodyText);
      const imageBuffer = await generateImage(cand.sourceKey, cand.title);
      const id = makeId(cand.link);
      fs.writeFileSync(path.join(IMAGES_DIR, `${id}.webp`), imageBuffer);
      console.log(`[완료] ${cand.source} — ${titleKo}`);
      return {
        id,
        sourceKey: cand.sourceKey,
        source: cand.source,
        title: titleKo,
        originalTitle: cand.title,
        link: cand.link,
        summary: summaryKo,
        image: `data/techinsight-images/${id}.webp`,
        publishedAt: cand.publishedAt,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[건너뜀] ${cand.source} — ${cand.title}:`, err.message);
      return null;
    }
  });
  const newItems = processed.filter(Boolean);
  for (const item of newItems) seen.push({ link: item.link, usedAt: item.createdAt });

  const merged = [...newItems, ...existingItems];
  merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const pruned = pruneOldItems(merged);

  fs.writeFileSync(ITEMS_FILE, JSON.stringify(pruned, null, 2));
  const trimmedSeen = seen.slice(Math.max(0, seen.length - SEEN_MAX));
  fs.writeFileSync(SEEN_FILE, JSON.stringify(trimmedSeen, null, 2));
  console.log(`저장 완료 — 신규 ${newItems.length}건, 전체 ${pruned.length}건(최대 ${MAX_ITEMS}건, 보관 ${RETENTION_DAYS}일)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
