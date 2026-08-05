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
// 자유 텍스트가 아닌 고정 항목(종목/평단가/매수·매도)만 입력받는 구조라 URL·욕설이 들어갈 자리가 없음 —
// 대신 각 필드 형식을 엄격하게 검증해 티커 칸에 임의 문자열을 밀어넣는 우회를 막는다
const CHAT_KEY = "chat_messages";
const CHAT_MAX_MESSAGES = 200;
const CHAT_RETENTION_SEC = 24 * 60 * 60; // 24시간
const CHAT_RATE_LIMIT_SEC = 20; // 같은 IP는 20초에 한 번만 등록 가능

const TICKER_PATTERN = /^[A-Z]{1,6}(\.[A-Z]{1,2})?$/;
const PRICE_PATTERN = /^\d{1,5}(\.\d{1,2})?$/;

function validatePost(body) {
  const ticker = (body && typeof body.ticker === "string" ? body.ticker : "").trim().toUpperCase();
  const price = (body && typeof body.price === "string" ? body.price : "").trim();
  const side = body && typeof body.side === "string" ? body.side : "";

  if (!TICKER_PATTERN.test(ticker)) return { error: "종목 티커 형식이 올바르지 않습니다." };
  if (price.length === 0 || price.length > 5 || !PRICE_PATTERN.test(price)) {
    return { error: "평단가는 숫자 5자 이내로 입력해주세요." };
  }
  if (side !== "buy" && side !== "sell") return { error: "매수/매도를 선택해주세요." };

  return { post: { ticker, price, side } };
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
  return messages.filter(
    (m) => m && typeof m.t === "number" && m.t >= cutoff && typeof m.ticker === "string" && typeof m.price === "string"
  );
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
