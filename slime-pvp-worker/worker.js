// 슬라임금님 PVP 실시간 서버 (Cloudflare Worker + Durable Object) — 2026-11-18
//  주소: wss://slime-pvp.<계정>.workers.dev/pvp   (게임: slime-dungeon/parts/p8s7_pvp.html 의 PVP_WS)
//  하는 일은 두 가지뿐: ① 같은 버전으로 기다리는 사람끼리 짝을 지어 준다 ② 짝이 된 뒤에는 받은 글을 그대로 상대에게 넘긴다(게임 계산은 안 함)
//  · 첫 글 {t:'hello', v, name, color, wid, wlv, lvl, wq} → 유물 등급(wq)이 비슷한(한 등급 차이까지) 사람이 기다리고 있으면 둘에게 {t:'match', i, seed, peer} · 없으면 {t:'wait'}
//  · 기다리던 쪽이 20초 뒤에 {t:'any'} 를 보내면 그때부터 등급 무관(게임은 30초에 연결을 끊고 AI와 붙는다)
//  · 한쪽이 끊기면 상대에게 {t:'bye'}
//  · 시험용 로컬 서버(slime-dungeon/bench/rec_server.py 의 /pvp)와 같은 규칙 — 둘을 같이 고친다
//  배포: 이 폴더에서 `npx wrangler deploy` (또는 Cloudflare 대시보드 Workers Builds 로 이 폴더를 연결). Durable Object 는 대시보드 붙여넣기로는 만들 수 없다.
//  상태는 전부 소켓 첨부(serializeAttachment)에 둔다 → 서버가 잠들었다 깨어나도(hibernation) 짝이 유지된다.
import { DurableObject } from "cloudflare:workers";

const PROF = (h) => ({
  name: String(h.name || "").replace(/[<>]/g, "").slice(0, 12),
  color: Math.max(0, Math.min(9, h.color | 0)),
  wid: /^[a-z0-9_]{1,24}$/.test(String(h.wid || "")) ? String(h.wid) : "",
  wlv: Math.max(0, Math.min(35, h.wlv | 0)),
  lvl: Math.max(0, Math.min(999, h.lvl | 0)),
});

export class PvpLobby extends DurableObject {
  async fetch(request) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const sid = crypto.randomUUID();
    this.ctx.acceptWebSocket(server, [sid]); // 꼬리표 = 소켓 번호(상대를 바로 찾는다)
    server.serializeAttachment({ sid, st: "new" });
    return new Response(null, { status: 101, webSocket: client });
  }

  peerOf(a) {
    if (!a || !a.peer) return null;
    const l = this.ctx.getWebSockets(a.peer);
    return l.length ? l[0] : null;
  }

  // 짝 찾기(2026-11-18 2차): 유물 등급(wq)이 한 등급 차이까지인 사람과 먼저 · 둘 중 한쪽이 20초를 넘게 기다렸으면(any) 등급 무관 · 등급 차이가 작은 사람, 오래 기다린 사람 순
  tryMatch(ws, me) {
    const C = [];
    for (const s of this.ctx.getWebSockets()) {
      if (s === ws) continue;
      const b = s.deserializeAttachment();
      if (!b || b.st !== "wait" || b.v !== me.v) continue;
      const d = Math.abs((b.wq | 0) - (me.wq | 0));
      if (d > 1 && !b.any && !me.any) continue;
      C.push({ s, b, d });
    }
    C.sort((x, y) => x.d - y.d || (x.b.t || 0) - (y.b.t || 0));
    const seed = ((Math.random() * 2147483646) | 0) + 1;
    for (const { s, b } of C) {
      try { s.send(JSON.stringify({ t: "match", i: 0, seed, peer: me.prof })); } catch (e) { continue; } // 이미 끊긴 소켓이면 다음 사람
      s.serializeAttachment({ sid: b.sid, st: "play", peer: me.sid });
      ws.serializeAttachment({ sid: me.sid, st: "play", peer: b.sid });
      ws.send(JSON.stringify({ t: "match", i: 1, seed, peer: b.prof }));
      return true;
    }
    return false;
  }

  async webSocketMessage(ws, message) {
    const a = ws.deserializeAttachment() || {};
    if (a.st === "play") {
      // 짝이 된 뒤: 그대로 넘긴다(문자·이진 모두)
      const p = this.peerOf(a);
      if (p) { try { p.send(message); } catch (e) {} }
      return;
    }
    if (typeof message !== "string" || message.length > 600) return;
    let h;
    try { h = JSON.parse(message); } catch (e) { return; }
    if (!h) return;
    if (a.st === "new" && h.t === "hello") {
      const me = { sid: a.sid, st: "wait", v: String(h.v || "").slice(0, 16), prof: PROF(h), wq: Math.max(0, Math.min(5, h.wq | 0)), any: false, t: Date.now() };
      if (!this.tryMatch(ws, me)) { ws.serializeAttachment(me); ws.send(JSON.stringify({ t: "wait" })); }
      return;
    }
    if (a.st === "wait" && h.t === "any" && !a.any) {
      a.any = true; // 20초를 넘게 기다렸다 → 등급 무관
      if (!this.tryMatch(ws, a)) ws.serializeAttachment(a);
    }
  }

  drop(ws) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    if (a.st === "play") {
      const p = this.peerOf(a);
      if (p) {
        const b = p.deserializeAttachment();
        if (b && b.peer === a.sid) {
          p.serializeAttachment({ sid: b.sid, st: "done" });
          try { p.send(JSON.stringify({ t: "bye" })); } catch (e) {}
        }
      }
    }
    try { ws.serializeAttachment({ sid: a.sid, st: "done" }); } catch (e) {}
  }

  async webSocketClose(ws, code, reason, wasClean) {
    this.drop(ws);
    // 닫는 인사에 답한다(1005·1006 같은 '코드 없음'은 close()에 넣을 수 없어 1000으로)
    try { ws.close(code === 1005 || code === 1006 || !code ? 1000 : code, reason || ""); } catch (e) { try { ws.close(1000); } catch (e2) {} }
  }

  async webSocketError(ws, error) {
    this.drop(ws);
  }
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname === "/pvp") return env.PVP.get(env.PVP.idFromName("lobby")).fetch(request);
    return new Response("slime pvp", { status: 200 });
  },
};
