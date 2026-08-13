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
const RSS_FEEDS = [
  { name: "The Conversation (Business)", url: "https://theconversation.com/us/business/articles.atom" },
  { name: "The Conversation (Technology)", url: "https://theconversation.com/us/technology/articles.atom" },
  { name: "Federal Reserve 보도자료", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "EIA Today in Energy", url: "https://www.eia.gov/todayinenergy/rss/todayinenergy.xml" },
];

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

async function summarizeKo(title, bodyText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않음");
  const prompt =
    `다음은 미국 경제 뉴스 기사입니다. 한국어로 핵심만 최대 5문장(5줄) 이내로 간결하게 요약해줘. ` +
    `번호나 불릿 없이 자연스러운 문장으로, 각 문장은 줄바꿈으로 구분해줘.\n\n` +
    `제목: ${title}\n\n본문:\n${bodyText.slice(0, 6000)}`;
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    30000
  );
  if (!res.ok) throw new Error(`Anthropic API 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || "").join("").trim();
  if (!text) throw new Error("Anthropic 응답에 텍스트 없음");
  return text;
}

async function generateImage(title) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않음");
  const prompt =
    `Modern flat editorial illustration representing this US economic news topic: "${title}". ` +
    `Clean, minimal, professional business/finance magazine style, soft muted color palette, ` +
    `abstract or symbolic composition, no text, no logos, no brand names, no real recognizable people, square 1:1 composition.`;
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
  return Buffer.from(b64, "base64");
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
  const candidatesBySource = {};
  const linksThisRun = new Set();

  function addCandidates(list) {
    for (const it of list) {
      if (!it.publishedAt || Date.parse(it.publishedAt) < freshCutoff) continue;
      if (seenLinks.has(it.link) || linksThisRun.has(it.link)) continue;
      linksThisRun.add(it.link);
      if (!candidatesBySource[it.source]) candidatesBySource[it.source] = [];
      candidatesBySource[it.source].push(it);
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

  const selected = selectRoundRobin(candidatesBySource, MAX_ITEMS_PER_RUN);
  console.log(`오늘 선정된 후보: ${selected.length}건 (최대 ${MAX_ITEMS_PER_RUN}건 중)`);

  const newItems = [];
  for (const cand of selected) {
    try {
      const bodyText = await fetchArticleText(cand.link);
      const summary = await summarizeKo(cand.title, bodyText);
      const imageBuffer = await generateImage(cand.title);
      const id = makeId(cand.link);
      fs.writeFileSync(path.join(IMAGES_DIR, `${id}.webp`), imageBuffer);
      newItems.push({
        id,
        title: cand.title,
        link: cand.link,
        source: cand.source,
        summary,
        image: `data/econpick-images/${id}.webp`,
        publishedAt: cand.publishedAt,
        createdAt: new Date().toISOString(),
      });
      seen.push({ link: cand.link, usedAt: new Date().toISOString() });
      console.log(`[완료] ${cand.source} — ${cand.title}`);
    } catch (err) {
      console.error(`[건너뜀] ${cand.source} — ${cand.title}:`, err.message);
    }
  }

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
