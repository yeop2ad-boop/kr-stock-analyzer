// Cloudflare Worker: 미국 기업 분석기용 CORS 중계 서버
// 허용된 호스트(Yahoo Finance, FRED)로만 요청을 중계하며, 응답에 CORS 헤더를 붙여 반환합니다.

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

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const requestUrl = new URL(request.url);
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
