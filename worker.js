// Cloudflare Worker: 미국 기업 분석기용 CORS 중계 서버 + 익명 실시간 채팅 API
// 허용된 호스트(Yahoo Finance, FRED)로만 요청을 중계하며, 응답에 CORS 헤더를 붙여 반환합니다.
// /chat 경로는 KV(CHAT_KV)에 최근 24시간 메시지만 저장하는 익명 공개 채팅을 제공합니다.

const ALLOWED_HOSTS = [
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "fred.stlouisfed.org",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- 채팅 설정 ----------
const CHAT_KEY = "chat_messages";
const CHAT_MAX_LEN = 200;
const CHAT_MAX_MESSAGES = 200;
const CHAT_RETENTION_SEC = 24 * 60 * 60; // 24시간
const CHAT_RATE_LIMIT_SEC = 3; // 같은 IP는 3초에 한 번만 전송 가능

// 웹사이트 주소로 보이는 문자열(http/https, www., 흔한 도메인 형태)을 차단
const URL_PATTERN = /(https?:\/\/|www\.)\S+/i;
const DOMAIN_PATTERN =
  /\b[a-z0-9-]+\.(com|net|org|co|io|me|xyz|info|biz|kr|shop|site|online|click|link|gg|tv|app|dev)\b/i;

// 흔한 한글/영문 욕설·비방 표현(완전한 목록은 아니며, 사전 필터링 용도)
const BANNED_WORDS = [
  "씨발", "시발", "씨팔", "시팔", "ㅅㅂ", "ㅆㅂ", "개새끼", "병신", "ㅂㅅ",
  "미친놈", "미친년", "좆", "존나", "지랄", "새끼", "썅", "닥쳐", "꺼져",
  "죽어라", "개소리", "fuck", "shit", "bitch", "asshole", "retard",
];

function containsBannedContent(text) {
  if (URL_PATTERN.test(text) || DOMAIN_PATTERN.test(text)) return "url";
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  for (const w of BANNED_WORDS) {
    if (normalized.includes(w)) return "profanity";
  }
  return null;
}

async function getChatMessages(env) {
  const raw = await env.CHAT_KV.get(CHAT_KEY);
  if (!raw) return [];
  let messages;
  try {
    messages = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(messages)) return [];
  const cutoff = Date.now() - CHAT_RETENTION_SEC * 1000;
  return messages.filter((m) => m && typeof m.t === "number" && m.t >= cutoff && typeof m.text === "string");
}

async function handleChat(request, env) {
  if (!env.CHAT_KV) {
    return jsonResponse({ error: "CHAT_KV binding이 설정되지 않았습니다." }, 500);
  }

  if (request.method === "GET") {
    const messages = await getChatMessages(env);
    return jsonResponse({ messages }, 200);
  }

  if (request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = "rl_" + ip;
    const recentlyPosted = await env.CHAT_KV.get(rlKey);
    if (recentlyPosted) {
      return jsonResponse({ error: "너무 빠르게 전송했습니다. 잠시 후 다시 시도해주세요." }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "잘못된 요청입니다." }, 400);
    }

    const text = (body && typeof body.text === "string" ? body.text : "").trim();
    if (!text) return jsonResponse({ error: "메시지를 입력해주세요." }, 400);
    if (text.length > CHAT_MAX_LEN) {
      return jsonResponse({ error: `메시지는 ${CHAT_MAX_LEN}자 이내로 작성해주세요.` }, 400);
    }

    const banned = containsBannedContent(text);
    if (banned === "url") return jsonResponse({ error: "웹사이트 주소는 입력할 수 없습니다." }, 400);
    if (banned === "profanity") return jsonResponse({ error: "부적절한 표현이 포함되어 있습니다." }, 400);

    const messages = await getChatMessages(env);
    messages.push({ t: Date.now(), text });
    const trimmed = messages.slice(-CHAT_MAX_MESSAGES);

    await env.CHAT_KV.put(CHAT_KEY, JSON.stringify(trimmed), { expirationTtl: CHAT_RETENTION_SEC });
    await env.CHAT_KV.put(rlKey, "1", { expirationTtl: CHAT_RATE_LIMIT_SEC });

    return jsonResponse({ messages: trimmed }, 200);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/chat") {
      return handleChat(request, env);
    }

    const targetUrl = requestUrl.searchParams.get("url");

    if (!targetUrl) {
      return jsonResponse({ error: "Missing url parameter" }, 400);
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return jsonResponse({ error: "Invalid url" }, 400);
    }

    if (!ALLOWED_HOSTS.includes(parsedTarget.hostname)) {
      return jsonResponse({ error: "Host not allowed: " + parsedTarget.hostname }, 403);
    }

    try {
      // GET은 그대로, POST는 요청 본문(JSON 스크리너 쿼리 등)까지 그대로 중계
      const isPost = request.method === "POST";
      const upstream = await fetch(targetUrl, {
        method: isPost ? "POST" : "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; StockAnalyzerProxy/1.0)",
          ...(isPost ? { "Content-Type": "application/json" } : {}),
        },
        body: isPost ? await request.text() : undefined,
      });
      // 응답을 문자열로 통째로 버퍼링하지 않고 그대로 스트리밍해서 큰 응답(FRED 등)도 가볍게 처리
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          ...CORS_HEADERS,
        },
      });
    } catch (e) {
      return jsonResponse({ error: "Upstream fetch failed", detail: String(e) }, 502);
    }
  },
};

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
