// Cloudflare Worker: 미국 기업 분석기용 CORS 중계 서버 + 익명 자유토론방 채팅 API
// 허용된 호스트(Yahoo Finance, FRED)로만 요청을 중계하며, 응답에 CORS 헤더를 붙여 반환합니다.
// /chat 경로는 KV(CHAT_KV)에 최근 24시간 메시지만 저장하는 익명 공개 자유토론방(자유 텍스트 최대 30자)을 제공합니다.

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

// ---------- 채팅 설정(자유토론방: 익명, 24시간 보관, 자유 텍스트 최대 30자) ----------
const CHAT_KEY = "freechat_messages";
const CHAT_MAX_MESSAGES = 200;
const CHAT_RETENTION_SEC = 24 * 60 * 60; // 24시간
const CHAT_RATE_LIMIT_SEC = 10; // 같은 IP는 10초에 한 번만 등록 가능(연속 전송 방지)
const CHAT_MAX_LEN = 30;

// 자주 신고되는 한국어·영어 비속어 위주 기본 필터 — 완벽한 차단은 아니며 명백한 욕설만 1차로 걸러냄
const BANNED_WORDS = [
  "씨발", "시발", "씨팔", "시팔", "ㅅㅂ", "병신", "존나", "졸라", "개새끼", "개새기",
  "새끼", "지랄", "좆", "미친놈", "미친년", "걸레", "창녀", "잡놈",
  "fuck", "shit", "bitch", "asshole", "cunt", "bastard",
];

function containsBannedWord(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  return BANNED_WORDS.some((w) => normalized.includes(w));
}

function validatePost(body) {
  const text = (body && typeof body.text === "string" ? body.text : "").trim();

  if (text.length === 0) return { error: "메시지를 입력해주세요." };
  if (text.length > CHAT_MAX_LEN) return { error: `메시지는 최대 ${CHAT_MAX_LEN}자까지 입력할 수 있습니다.` };
  if (/https?:\/\/|www\.|\.(com|net|org|kr|io|co)\b/i.test(text)) return { error: "URL 주소는 등록할 수 없습니다." };
  if (/(.)\1{4,}/.test(text)) return { error: "같은 글자를 반복해서 입력할 수 없습니다." };
  if (containsBannedWord(text)) return { error: "부적절한 표현이 포함되어 있습니다." };

  return { post: { text } };
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
    // KV expirationTtl은 60초 미만을 허용하지 않으므로, 실제 3초 판정은 저장된 타임스탬프로 직접 계산하고
    // TTL은 정리(cleanup) 목적으로만 넉넉히 60초를 준다
    const lastPostedRaw = await env.CHAT_KV.get(rlKey);
    if (lastPostedRaw) {
      const lastPostedAt = Number(lastPostedRaw);
      if (!Number.isNaN(lastPostedAt) && Date.now() - lastPostedAt < CHAT_RATE_LIMIT_SEC * 1000) {
        return jsonResponse({ error: "너무 빠르게 전송했습니다. 잠시 후 다시 시도해주세요." }, 429);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "잘못된 요청입니다." }, 400);
    }

    const { post, error } = validatePost(body);
    if (error) return jsonResponse({ error }, 400);

    const messages = await getChatMessages(env);
    messages.push({ t: Date.now(), ...post });
    const trimmed = messages.slice(-CHAT_MAX_MESSAGES);

    await env.CHAT_KV.put(CHAT_KEY, JSON.stringify(trimmed), { expirationTtl: CHAT_RETENTION_SEC });
    await env.CHAT_KV.put(rlKey, String(Date.now()), { expirationTtl: 60 });

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
