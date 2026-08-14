// "경제pick" — 상업적 이용 가능한(CC/미국 정부저작물) 소스 풀에서 최근 미국 경제뉴스를 모아
// 제목/링크만 저장하고, 원문은 저장하지 않은 채 Anthropic Claude로 5줄 한국어 요약을,
// OpenAI gpt-image-1로 저작권 걱정 없는 AI 삽화를 생성해 data/econpick.json + data/econpick-images/
// 로 저장한다. GitHub Actions(.github/workflows/econpick-daily.yml)에서 매일 KST 07:00에 실행됨.
//
// 로컬 수동 실행: ANTHROPIC_API_KEY=... OPENAI_API_KEY=... node scripts/scan-econpick.js
// (Node 18+ 필요 — 전역 fetch/AbortController 사용. scan-13f.js와 동일하게 무의존성 CommonJS로 작성)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const IMAGES_DIR = path.join(DATA_DIR, "econpick-images");
const ITEMS_FILE = path.join(DATA_DIR, "econpick.json");
const SEEN_FILE = path.join(DATA_DIR, "econpick-seen.json");

const MAX_ITEMS_PER_RUN = 15;
const FRESH_WINDOW_DAYS = 3; // 이보다 오래된 게시물은 후보에서 제외(신선도 유지)
const RETENTION_DAYS = 14; // 이보다 오래된 항목/이미지는 매 실행마다 정리(레포 용량 억제)
const SEEN_MAX = 500; // 재등장 방지용 이력 상한

const UA_HEADERS = { "User-Agent": "yeopinvest.com econpick-bot contact@yeopinvest.com" };
const SEC_HEADERS = { "User-Agent": "yeopinvest.com contact@yeopinvest.com" };

// ---------- 소스 풀 (풀 방식 — 사이트마다 매일 5개씩 나오지 않아도 되고, 부족하면 있는 만큼만 사용) ----------
// Technology 피드는 경제와 무관한 일반 과학/기술 기사가 많이 섞여 나와서 제외.
// White House 보도자료는 미국 정부저작물이라 퍼블릭도메인 — 대통령 관련 소식을 안전하게 다룰 수 있는 소스.
const RSS_FEEDS = [
  { name: "The Conversation (Business)", url: "https://theconversation.com/us/business/articles.atom" },
  { name: "Federal Reserve 보도자료", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "EIA Today in Energy", url: "https://www.eia.gov/rss/todayinenergy.xml" },
  { name: "White House 보도자료", url: "https://www.whitehouse.gov/news/feed" },
];

// 이 키워드가 제목에 포함된 후보는 우선적으로 선정(실적/금리/트럼프/머스크/비트코인/채권/원유/금 등 관심 토픽) —
// 다만 우리가 쓰는 소스가 CC/공공저작물 한정이라 이런 인물·자산 관련 소식이 매일 나오진 않을 수 있음
const PRIORITY_KEYWORDS = [
  "earnings", "quarterly results", "quarterly report", "results of operations", "profit", "revenue",
  "interest rate", "rate decision", "rate cut", "rate hike", "fomc", "federal funds rate",
  "trump", "white house",
  "musk", "tesla", "spacex",
  "bitcoin", "crypto", "cryptocurrency",
  "treasury bond", "bond market", "treasury yield",
  "oil", "crude", "opec", "petroleum",
  "gold price", "gold market",
];
function matchesPriorityKeyword(title) {
  const t = title.toLowerCase();
  return PRIORITY_KEYWORDS.some((k) => t.includes(k));
}

// M7 빅테크 관련 기업 이벤트(테슬라/애플/아마존 등) — SEC EDGAR 8-K(수시공시)는 미국 정부기관에
// 접수된 공개기록이라 100% 퍼블릭도메인. scan-13f.js와 동일한 SEC 조회 패턴 재사용.
const M7_WATCHLIST = {
  AAPL: { cik: "320193", name: "Apple" },
  MSFT: { cik: "789019", name: "Microsoft" },
  AMZN: { cik: "1018724", name: "Amazon" },
  GOOGL: { cik: "1652044", name: "Alphabet(Google)" },
  META: { cik: "1326801", name: "Meta" },
  TSLA: { cik: "1318605", name: "Tesla" },
  NVDA: { cik: "1045810", name: "NVIDIA" },
};

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

// RSS(<item>)와 Atom(<entry>) 피드를 모두 정규식 기반으로 파싱(외부 XML 파서 의존성 없이)
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

async function harvestRssFeed(feed) {
  const res = await fetchWithTimeout(feed.url, { headers: UA_HEADERS }, 15000);
  if (!res.ok) throw new Error(`${res.status}`);
  const xml = await res.text();
  return parseFeed(xml, feed.name);
}

// 최근 8-K(수시공시) 최대 2건까지 후보로 — items(공시 항목 코드)·primaryDocDescription을 제목에 반영
async function harvestSec8K(ticker, { cik, name }) {
  const paddedCik = cik.padStart(10, "0");
  const res = await fetchWithTimeout(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, { headers: SEC_HEADERS }, 15000);
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  const recent = data.filings.recent;
  const items = [];
  for (let i = 0; i < recent.form.length && items.length < 2; i++) {
    if (recent.form[i] !== "8-K") continue;
    const accNoDashes = recent.accessionNumber[i].replace(/-/g, "");
    const doc = recent.primaryDocument[i];
    const desc = (recent.primaryDocDescription && recent.primaryDocDescription[i]) || "";
    items.push({
      title: `${name}(${ticker}) 8-K 공시${desc ? `: ${desc}` : ""}`,
      link: `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${doc}`,
      publishedAt: new Date(recent.filingDate[i]).toISOString(),
      source: `SEC 8-K · ${name}`,
    });
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
  return stripHtml(html).slice(0, 8000);
}

// 제목 번역 + 5줄 요약을 한 번의 호출로 함께 받음(카드 헤드라인이 영문으로 보이던 문제 해결)
async function summarizeKo(title, bodyText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않음");
  const prompt =
    `다음은 미국 경제 뉴스 기사입니다. 아래 형식 그대로만 답변해줘(다른 설명 문구 없이):\n\n` +
    `[제목]\n(원문 제목을 자연스러운 한국어 뉴스 헤드라인으로 번역, 한 줄)\n\n` +
    `[요약]\n(한국어로 핵심만 최대 5문장(5줄) 이내로 간결하게 요약. 번호나 불릿 없이 자연스러운 문장으로, 각 문장은 줄바꿈으로 구분)\n\n` +
    `원문 제목: ${title}\n\n본문:\n${bodyText.slice(0, 6000)}`;
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

// 인물이 중심인 뉴스는 캐리커처로, 그 외 일반 뉴스는 2가지 플랫 일러스트 스타일을 순번대로 번갈아 사용해
// 카드가 다 비슷비슷해 보이지 않도록 다양성을 줌(PRIORITY_KEYWORDS의 인물 관련 항목 재사용 + 보강)
const PERSON_KEYWORDS = ["trump", "musk", "biden", "powell", "zuckerberg", "bezos"];
function isPersonTopic(title) {
  const t = title.toLowerCase();
  return PERSON_KEYWORDS.some((k) => t.includes(k));
}
const IMAGE_STYLE_VARIANTS = [
  "Modern flat editorial illustration, clean minimal professional business/finance magazine style, soft muted color palette, abstract or symbolic composition",
  "Bold geometric collage-style illustration, vibrant contrasting color blocks with halftone texture accents, contemporary business magazine cover style",
];
function buildImagePrompt(title, seed) {
  if (isPersonTopic(title)) {
    return {
      style: "caricature",
      prompt:
        `Colorful editorial caricature illustration for a business/finance magazine, exaggerated but respectful and recognizable likeness, ` +
        `of the public figure central to this US economic news topic: "${title}". ` +
        `Digital caricature art style, plain uncluttered background, no text, no logos, square 1:1 composition.`,
    };
  }
  const variantIdx = seed % IMAGE_STYLE_VARIANTS.length;
  return {
    style: `flat-${variantIdx}`,
    prompt:
      `${IMAGE_STYLE_VARIANTS[variantIdx]} representing this US economic news topic: "${title}". ` +
      `No text, no logos, no brand names, no real recognizable people, square 1:1 composition.`,
  };
}

async function generateImage(title, seed) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const { style, prompt } = buildImagePrompt(title, seed);
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        // gpt-image-1은 2026-10-23 API 퇴출 예정이라 후속 모델인 gpt-image-2 사용.
        // quality:"low"로 카드 썸네일 용도에 충분한 품질을 유지하며 장당 비용을 최소화(1024x1024 기준 약 $0.006/장)
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
  return { buffer: Buffer.from(b64, "base64"), style };
}

// 동시성 제한 병렬 처리 — 항목을 순차로 처리하면(요약+이미지 생성에 항목당 최대 ~1분) 전체 실행 시간이
// 길어져 "매일 07:00 업데이트" 안내와 실제 반영 시각 사이 격차가 커지므로, 몇 개씩 동시에 처리해 단축함
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

// 소스별로 한 개씩 번갈아 뽑아 특정 소스가 결과를 독점하지 않도록 함(각 리스트는 이미 최신순으로 정렬돼 있음)
function selectRoundRobin(candidatesBySource, max) {
  const sources = Object.keys(candidatesBySource);
  const result = [];
  let idx = 0;
  while (result.length < max) {
    let addedAny = false;
    for (const s of sources) {
      if (result.length >= max) break;
      const list = candidatesBySource[s];
      if (list.length > idx) {
        result.push(list[idx]);
        addedAny = true;
      }
    }
    if (!addedAny) break;
    idx++;
  }
  return result;
}

function pruneOldItems(items) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const keep = [];
  for (const it of items) {
    const t = Date.parse(it.createdAt || it.publishedAt || 0);
    if (t >= cutoff) {
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

  const freshCutoff = Date.now() - FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const priorityBySource = {};
  const normalBySource = {};
  const linksThisRun = new Set();

  function addCandidates(list) {
    for (const it of list) {
      if (!it.publishedAt || Date.parse(it.publishedAt) < freshCutoff) continue;
      if (seenLinks.has(it.link) || linksThisRun.has(it.link)) continue;
      linksThisRun.add(it.link);
      const bucket = matchesPriorityKeyword(it.title) ? priorityBySource : normalBySource;
      if (!bucket[it.source]) bucket[it.source] = [];
      bucket[it.source].push(it);
    }
  }

  for (const feed of RSS_FEEDS) {
    try {
      const items = await harvestRssFeed(feed);
      addCandidates(items);
      console.log(`[${feed.name}] ${items.length}건 수집`);
    } catch (err) {
      console.error(`[${feed.name}] 수집 실패:`, err.message);
    }
  }

  for (const [ticker, info] of Object.entries(M7_WATCHLIST)) {
    try {
      const items = await harvestSec8K(ticker, info);
      addCandidates(items);
      console.log(`[SEC 8-K · ${ticker}] ${items.length}건 수집`);
    } catch (err) {
      console.error(`[SEC 8-K · ${ticker}] 수집 실패:`, err.message);
    }
  }

  // 관심 키워드(실적/금리/트럼프/머스크/비트코인/채권/원유/금 등) 매치 후보를 먼저 채우고, 남는 자리만 일반 후보로 채움
  const prioritySelected = selectRoundRobin(priorityBySource, MAX_ITEMS_PER_RUN);
  const normalSelected = selectRoundRobin(normalBySource, Math.max(0, MAX_ITEMS_PER_RUN - prioritySelected.length));
  const selected = [...prioritySelected, ...normalSelected];
  console.log(`오늘 선정된 후보: ${selected.length}건 (키워드 매치 ${prioritySelected.length}건 포함, 최대 ${MAX_ITEMS_PER_RUN}건 중)`);

  const CONCURRENCY = 4; // OpenAI/Anthropic 레이트리밋을 넘지 않는 선에서 총 실행 시간을 크게 줄임
  const processed = await mapWithConcurrency(selected, CONCURRENCY, async (cand, i) => {
    try {
      const bodyText = await fetchArticleText(cand.link);
      const { titleKo, summaryKo } = await summarizeKo(cand.title, bodyText);
      const { buffer: imageBuffer, style } = await generateImage(cand.title, i);
      const id = makeId(cand.link);
      fs.writeFileSync(path.join(IMAGES_DIR, `${id}.webp`), imageBuffer);
      console.log(`[완료] ${cand.source} — ${titleKo} (${style})`);
      return {
        id,
        title: titleKo,
        link: cand.link,
        source: cand.source,
        summary: summaryKo,
        image: `data/econpick-images/${id}.webp`,
        publishedAt: cand.publishedAt,
        createdAt: new Date().toISOString(),
        style,
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
  console.log(`저장 완료 — 신규 ${newItems.length}건, 전체 ${pruned.length}건(보관 ${RETENTION_DAYS}일)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
