// 슬라임금님 '최후의생존 모드' 실시간 서버 (Cloudflare Worker + Durable Object) — 2026-11-18
//  주소: wss://slime-pvp.<계정>.workers.dev/pvp   (게임: slime-dungeon/parts/p8s7_pvp.html 의 PVP_WS)
//  하는 일은 두 가지뿐: ① 기다리는 사람들을 한 방(최대 8명)에 모은다 ② 판이 시작되면 받은 글을 그대로 같은 방 사람들에게 넘긴다(게임 계산은 안 함)
//  · 첫 글 {t:'hello', v, name, color, wid, wlv, lvl, wq} → 열린 방에 넣거나 새 방을 만든다. 방 사람들에게 {t:'lobby', n, left}(모인 수 · 시작까지 남은 ms)
//      들어갈 수 있는 방 = 같은 버전(v) · 8명 미만 · 유물 등급(wq)이 방 등급과 한 등급 차이까지(방이 20초를 넘겼거나 누가 {t:'any'} 를 보냈으면 등급 무관)
//  · 8명이 차면 바로, 아니면 방이 생긴 지 30초 뒤에 누군가 {t:'go'} 를 보내면 시작: 모두에게 {t:'match', i, n, seed, peers, wq}
//      (i = 내 번호 0~n-1 · peers = 사람들의 모습 · 모자란 자리는 게임이 AI로 채운다)
//  · {t:'any'}(20초 넘게 기다림): 다른 대기 방과 합칠 수 있으면 합친다(오래된 방으로)
//  · 판 중에 한 사람이 끊기면 같은 방 사람들에게 {t:'bye', i}
//  · 시험용 로컬 서버(slime-dungeon/bench/rec_server.py 의 /pvp)와 같은 규칙 — 둘을 같이 고친다
//  배포: 이 폴더에서 `npx wrangler deploy`. Durable Object 는 대시보드 붙여넣기로는 만들 수 없다.
//  상태는 전부 소켓 첨부(serializeAttachment)에 둔다 → 서버가 잠들었다 깨어나도(hibernation) 방이 유지된다. 방별 소켓 목록만 메모리에 잠깐 적어 둔다(this.rc).
import { DurableObject } from "cloudflare:workers";

const MAXP = 8, START_MS = 30000, ANY_MS = 20000;
const PROF = (h) => ({
  name: String(h.name || "").replace(/[<>]/g, "").slice(0, 12),
  color: Math.max(0, Math.min(9, h.color | 0)),
  wid: /^[a-z0-9_]{1,24}$/.test(String(h.wid || "")) ? String(h.wid) : "",
  wlv: Math.max(0, Math.min(35, h.wlv | 0)),
  lvl: Math.max(0, Math.min(999, h.lvl | 0)),
});
const J = (o) => JSON.stringify(o);
const tell = (s, o) => { try { s.send(typeof o === "string" || o instanceof ArrayBuffer ? o : J(o)); return true; } catch (e) { return false; } };

export class PvpLobby extends DurableObject {
  async fetch(request) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ sid: crypto.randomUUID(), st: "new" });
    return new Response(null, { status: 101, webSocket: client });
  }

  // 방 사람들(st 로 거름). 진행 중인 방은 메모리에 적어 둔다 — 글 하나 넘길 때마다 모든 소켓을 뒤지지 않게
  members(room, st) {
    const L = [];
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment();
      if (a && a.room === room && a.st === st) L.push({ s, a });
    }
    return L;
  }
  playing(room) {
    if (!this.rc) this.rc = new Map();
    let L = this.rc.get(room);
    if (!L) { L = this.members(room, "play").map((m) => m.s); this.rc.set(room, L); }
    return L;
  }

  lobby(room) {
    const M = this.members(room, "wait");
    if (!M.length) return;
    const t0 = Math.min(...M.map((m) => m.a.t0)), msg = J({ t: "lobby", n: M.length, left: Math.max(0, START_MS - (Date.now() - t0)) });
    for (const m of M) tell(m.s, msg);
  }

  start(room) {
    const M = this.members(room, "wait").sort((x, y) => x.a.tj - y.a.tj).slice(0, MAXP);
    if (!M.length) return;
    const seed = ((Math.random() * 2147483646) | 0) + 1, peers = M.map((m) => m.a.prof), wq = M[0].a.rwq | 0;
    M.forEach((m, i) => {
      m.s.serializeAttachment({ sid: m.a.sid, st: "play", room, idx: i });
      tell(m.s, { t: "match", i, n: M.length, seed, peers, wq });
    });
    this.rc = null;
  }

  // 대기 방 목록(같은 버전)
  rooms(v) {
    const R = new Map();
    for (const s of this.ctx.getWebSockets()) {
      const b = s.deserializeAttachment();
      if (!b || b.st !== "wait" || b.v !== v) continue;
      let r = R.get(b.room);
      if (!r) R.set(b.room, (r = { room: b.room, t0: b.t0, rwq: b.rwq | 0, any: false, n: 0 }));
      r.n++; r.t0 = Math.min(r.t0, b.t0); if (b.any) r.any = true;
    }
    return R;
  }

  async webSocketMessage(ws, message) {
    const a = ws.deserializeAttachment() || {};
    if (a.st === "play") {
      // 판 중: 같은 방 사람들에게 그대로(문자·이진 모두)
      for (const s of this.playing(a.room)) if (s !== ws) tell(s, message);
      return;
    }
    if (typeof message !== "string" || message.length > 600) return;
    let h;
    try { h = JSON.parse(message); } catch (e) { return; }
    if (!h) return;
    const now = Date.now();
    if (a.st === "new" && h.t === "hello") {
      const v = String(h.v || "").slice(0, 16), wq = Math.max(0, Math.min(5, h.wq | 0));
      let best = null;
      for (const r of this.rooms(v).values()) {
        const age = now - r.t0;
        if (r.n >= MAXP || age >= START_MS + 5000) continue;
        if (Math.abs(r.rwq - wq) > 1 && !r.any && age < ANY_MS) continue;
        if (!best || r.t0 < best.t0) best = r;
      }
      const me = { sid: a.sid, st: "wait", v, prof: PROF(h), wq, tj: now, room: best ? best.room : crypto.randomUUID(), t0: best ? best.t0 : now, rwq: best ? best.rwq : wq, any: false };
      ws.serializeAttachment(me);
      if (best && best.n + 1 >= MAXP) this.start(me.room); else this.lobby(me.room);
      return;
    }
    if (a.st !== "wait") return;
    if (h.t === "go") {
      // 방이 생긴 지 30초가 지났으면 시작(모자란 자리는 게임이 AI로)
      const M = this.members(a.room, "wait"), t0 = Math.min(...M.map((m) => m.a.t0));
      if (now - t0 >= START_MS - 800) this.start(a.room); else this.lobby(a.room);
      return;
    }
    if (h.t === "any" && !a.any) {
      // 20초 넘게 기다렸다 → 등급 무관: 다른 대기 방과 합칠 수 있으면 오래된 방으로 합친다
      a.any = true; ws.serializeAttachment(a);
      const R = this.rooms(a.v), mine = R.get(a.room);
      let other = null;
      for (const r of R.values()) { if (r.room === a.room || r.n + (mine ? mine.n : 1) > MAXP) continue; if (!other || r.t0 < other.t0) other = r; }
      if (other && mine) {
        const [from, to] = other.t0 <= mine.t0 ? [mine, other] : [other, mine];
        for (const m of this.members(from.room, "wait")) { m.a.room = to.room; m.a.t0 = to.t0; m.a.rwq = to.rwq; m.a.any = true; m.s.serializeAttachment(m.a); }
        if (from.n + to.n >= MAXP) this.start(to.room); else this.lobby(to.room);
      }
    }
  }

  drop(ws) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    try { ws.serializeAttachment({ sid: a.sid, st: "done" }); } catch (e) {}
    if (a.st === "play") { this.rc = null; for (const s of this.playing(a.room)) if (s !== ws) tell(s, { t: "bye", i: a.idx | 0 }); }
    else if (a.st === "wait") this.lobby(a.room);
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
