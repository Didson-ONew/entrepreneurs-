/* ============================================================================
   Entrepreneurs - online multiplayer server
   Zero dependencies: Node's http module + Server-Sent Events.
   The server is authoritative: it runs the same engine as the single-player
   game, validates that an action came from the player the game is waiting on,
   applies it, and pushes the new state to every client in the room.
   ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

/* ---------- load the engine out of the single source of truth ---------- */
function loadEngine() {
  const src = fs.readFileSync(path.join(ROOT, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^import.*$/m, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, startPlanning, advancePlanning, placeMeeple,
      consumePlanningTurn, advanceResolution, humanCompleteResolutionAction, humanLiquidationDone,
      finishDelivery, finishQuarterAfterLH, finishQuarterAfterRepay, doPlaceLH, skipDelivery,
      humanDeliver, doRepayLoan, doLoan, doBuyPlot, doSellPlot, doSellBP, doSellCompany,
      doLaunch, doRenovate, doDraw, doUpgrade, claimMegacorp, doReposition, byId, activeBiz,
      eligibleSlotsFor, findDistressedTargets, renovationEligible, plotValue, discsFree,
      canLaunchMore, isCrossDistrictEdge, INDUSTRIES, LOAN_REPAY_RATE, SCALING, epTotal,
      bizInd, bizSetup, bizOpex, bizProd, upgradeBlockedReason, bestMegacorpMatch, DISCS_PER_PLAYER };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

/* ---------- state <-> wire (board.graph holds Sets, which JSON drops) ---------- */
function encodeState(st) {
  const graph = {};
  for (const k of Object.keys(st.board.graph)) graph[k] = [...st.board.graph[k]];
  return JSON.stringify({ ...st, board: { ...st.board, graph } });
}

/* ---------- rooms ---------- */
const rooms = new Map();
const code = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const token = () => crypto.randomBytes(16).toString("hex");

function newRoom(hostName, bots) {
  let c; do { c = code(); } while (rooms.has(c));
  const room = {
    code: c, bots: Math.max(0, Math.min(3, bots | 0)),
    members: [{ token: token(), name: hostName || "Host", seat: 0, host: true }],
    state: null, rng: null, clients: new Set(), logs: [], version: 0,
  };
  rooms.set(c, room);
  return room;
}

function log(room) {
  return (msg, pid) => { room.logs.push({ msg, pid }); if (room.logs.length > 400) room.logs.shift(); };
}

function payloadFor(room) {
  const v = room.version || 0;
  return room.state
    ? `{"type":"state","v":${v},"state":${encodeState(room.state)},"logs":${JSON.stringify(room.logs.slice(-120))}}`
    : `{"type":"lobby","v":${v},"members":${JSON.stringify(room.members.map((m) => ({ name: m.name, seat: m.seat, host: m.host })))},"bots":${room.bots},"code":"${room.code}"}`;
}
function broadcast(room) {
  room.version = (room.version || 0) + 1;
  const payload = payloadFor(room);
  for (const res of room.clients) {
    try { res.write(`data: ${payload}\n\n`); } catch (_) { room.clients.delete(res); }
  }
}

/* Auto-resolve everything that does not need a human, then stop and wait. */
function pump(room) {
  const st = room.state, rng = room.rng, lg = log(room);
  let guard = 0;
  while (guard++ < 500) {
    if (st.phase === "planning") {
      const pid = st.planningQueue[0];
      if (pid === undefined) { E.advancePlanning(st, rng, lg); continue; }
      if (E.byId(st, pid).isHuman) return;          // wait for that player
      E.advancePlanning(st, rng, lg);
    } else if (st.phase === "resolving") {
      if (st.pendingHumanAction) return;            // wait
      E.advanceResolution(st, rng, lg);
    } else if (st.phase === "production") {
      E.advanceResolution(st, rng, lg);
    } else return;                                   // drafting / delivering / liquidating / placingLH / repayingLoans / gameover
  }
}

/* ---------- action handling (authoritative) ---------- */
function whoIsAwaited(st) {
  if (st.phase === "drafting") return st.awaitingPlayerId;
  if (st.phase === "planning") return st.planningQueue[0];
  if (st.phase === "resolving") return st.pendingHumanAction ? st.pendingHumanAction.playerId : null;
  if (["delivering", "liquidating", "repayingLoans"].includes(st.phase)) return st.awaitingPlayerId;
  if (st.phase === "placingLH") return st.turnOrder[0];
  return null;
}

function applyAction(room, seat, action, data) {
  const st = room.state, rng = room.rng, lg = log(room);
  const p = E.byId(st, seat);
  const awaited = whoIsAwaited(st);
  if (awaited !== seat) return { error: "Not your turn." };
  const d = data || {};

  switch (action) {
    case "draft": {
      if (st.phase !== "drafting") return { error: "Not drafting." };
      const deck = st.decks[d.ind];
      if (!deck || !deck.length) return { error: "That deck is empty." };
      if (p.hand.length >= (st.draftCounts[seat] || 0)) return { error: "Hand already full." };
      const card = deck.shift();
      p.hand.push(card);
      lg(`${p.name} drafts ${card.name}.`, seat);
      if (p.hand.length >= (st.draftCounts[seat] || 0)) {
        st.draftQueue = st.draftQueue.filter((x) => x !== seat);
        if (st.draftQueue.length) st.awaitingPlayerId = st.draftQueue[0];
        else {
          st.awaitingPlayerId = null;
          E.startPlanning(st); E.advancePlanning(st, rng, lg);
        }
      }
      break;
    }
    case "plan": {
      if (st.phase !== "planning") return { error: "Not planning." };
      if (!E.placeMeeple(st, seat, d.track)) return { error: "That track is full." };
      E.consumePlanningTurn(st, seat, d.track);
      lg(`${p.name} places on ${d.track}.`, seat);
      E.advancePlanning(st, rng, lg);
      break;
    }
    case "act": {
      if (st.phase !== "resolving") return { error: "Not resolving." };
      const t = d.type;
      let ok = true;
      if (t === "loan") ok = E.doLoan(st, p, lg);
      else if (t === "buyPlot") ok = E.doBuyPlot(st, p, d.plot, lg);
      else if (t === "sellPlot") ok = E.doSellPlot(st, p, d.plot, lg);
      else if (t === "sellBP") { const bp = p.hand[d.index]; ok = !!bp && (E.doSellBP(st, p, bp, lg), true); }
      else if (t === "sellCompany") { const b = p.businesses.find((x) => x.id === d.bizId); ok = !!b && (E.doSellCompany(p, b, lg), true); }
      else if (t === "launch") { const bp = p.hand[d.index]; ok = !!bp && E.doLaunch(st, p, bp, rng, lg, d.footprint); }
      else if (t === "renovate") {
        const target = E.findDistressedTargets(st).find((x) => x.id === d.bizId);
        const bp = p.hand[d.index];
        ok = !!target && !!bp && E.doRenovate(st, p, target, bp, lg);
      }
      else if (t === "research") ok = E.doDraw(st, p, d.ind, lg);
      else if (t === "upgrade") { const b = p.businesses.find((x) => x.id === d.bizId); ok = !!b && E.doUpgrade(st, p, b, rng, lg, d.plot); }
      else if (t === "megacorp") { const hq = p.businesses.find((x) => x.id === d.hqId); ok = E.claimMegacorp(st, p, lg, hq); }
      else if (t === "reposition") { E.doReposition(st, p, lg); ok = true; }
      else if (t === "pass") ok = true;
      else return { error: "Unknown action." };
      if (!ok) return { error: "That action is not available." };
      E.humanCompleteResolutionAction(st, rng, lg);
      break;
    }
    case "deliver": {
      if (st.phase !== "delivering") return { error: "Not delivering." };
      const b = p.businesses.find((x) => x.id === st.deliveringBizId);
      if (!b) return { error: "No business selected." };
      if (!E.humanDeliver(st, p, d.tileKey, d.rowIdx, d.levelIdx, !!d.cross, lg)) return { error: "Cannot deliver there." };
      if ((st.deliveryRemaining[b.id] || 0) <= 0 && (st.crossSellRemaining[b.id] || 0) <= 0) E.finishDelivery(st, lg, rng);
      break;
    }
    case "reChoice": {
      if (st.phase !== "delivering") return { error: "Not delivering." };
      st.reChoices[d.bizId] = Array.isArray(d.districts) ? d.districts : [];
      break;
    }
    case "skipDelivery": {
      if (st.phase !== "delivering") return { error: "Not delivering." };
      E.skipDelivery(st, p, st.deliveringBizId, lg);
      E.finishDelivery(st, lg, rng);
      break;
    }
    case "liquidate": {
      if (st.phase !== "liquidating") return { error: "Not liquidating." };
      if (d.type === "bp") { const bp = p.hand[d.index]; if (bp) E.doSellBP(st, p, bp, lg); }
      else if (d.type === "biz") { const b = p.businesses.find((x) => x.id === d.bizId); if (b) E.doSellCompany(p, b, lg); }
      else if (d.type === "plot") E.doSellPlot(st, p, d.plot, lg);
      break;
    }
    case "liquidateDone": {
      if (st.phase !== "liquidating") return { error: "Not liquidating." };
      E.humanLiquidationDone(st, rng, lg);
      break;
    }
    case "placeLH": {
      if (st.phase !== "placingLH") return { error: "Not placing a hub." };
      if (!E.doPlaceLH(st, d.a, d.b, lg)) return { error: "Invalid hub placement." };
      E.finishQuarterAfterLH(st, lg, rng);
      break;
    }
    case "repay": {
      if (st.phase !== "repayingLoans") return { error: "Not repaying." };
      if (!E.doRepayLoan(p, st.quarter, lg)) return { error: "Cannot repay." };
      break;
    }
    case "repayDone": {
      if (st.phase !== "repayingLoans") return { error: "Not repaying." };
      E.finishQuarterAfterRepay(st, lg, rng);
      break;
    }
    default: return { error: "Unknown action." };
  }
  pump(room);
  return { ok: true };
}

/* ---------- http plumbing ---------- */
function body(req) {
  return new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch { res({}); } }); });
}
const json = (res, obj, sc = 200) => { res.writeHead(sc, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (p === "/api/create" && req.method === "POST") {
    const b = await body(req);
    const room = newRoom(b.name, b.bots);
    return json(res, { code: room.code, token: room.members[0].token, seat: 0 });
  }

  if (p === "/api/join" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    if (room.state) return json(res, { error: "That game already started." }, 409);
    if (room.members.length >= 4) return json(res, { error: "Room is full (4 players)." }, 409);
    const m = { token: token(), name: b.name || `Player ${room.members.length + 1}`, seat: room.members.length, host: false };
    room.members.push(m);
    broadcast(room);
    return json(res, { code: room.code, token: m.token, seat: m.seat });
  }

  if (p === "/api/resume" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "That room no longer exists." }, 404);
    const me = room.members.find((m) => m.token === b.token);
    if (!me) return json(res, { error: "Unknown player." }, 403);
    return json(res, { ok: true, seat: me.seat, name: me.name, host: !!me.host, started: !!room.state });
  }

  if (p === "/api/leave" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { ok: true });
    const i = room.members.findIndex((m) => m.token === b.token);
    if (i < 0) return json(res, { ok: true });
    // Only allow tidying up before the game starts; mid-game a player must be able
    // to come back, so their seat is kept and only the local session is cleared.
    if (!room.state) {
      room.members.splice(i, 1);
      room.members.forEach((m, k) => { m.seat = k; });
      if (!room.members.length) rooms.delete(room.code);
      else { room.members[0].host = true; broadcast(room); }
    }
    return json(res, { ok: true });
  }

  if (p === "/api/start" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = room.members.find((m) => m.token === b.token);
    if (!me || !me.host) return json(res, { error: "Only the host can start." }, 403);
    if (room.state) return json(res, { error: "Already started." }, 409);
    if (room.members.length + room.bots < 2) return json(res, { error: "Need at least 2 players (add a bot or another human)." }, 400);
    const seed = Math.floor(Math.random() * 1e9);
    room.state = E.initGame(room.bots, seed, room.members.map((m) => m.name));
    room.rng = E.mulberry32(seed + 777);
    room.logs = [{ msg: `Game started: ${room.members.length} human${room.members.length > 1 ? "s" : ""}, ${room.bots} bot${room.bots === 1 ? "" : "s"}.`, pid: null }];
    pump(room);
    broadcast(room);
    return json(res, { ok: true });
  }

  if (p === "/api/action" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room || !room.state) return json(res, { error: "No active game." }, 404);
    const me = room.members.find((m) => m.token === b.token);
    if (!me) return json(res, { error: "Unknown player." }, 403);
    const r = applyAction(room, me.seat, b.action, b.data);
    if (r.error) return json(res, r, 400);
    broadcast(room);
    return json(res, { ok: true });
  }

  if (p === "/api/debug") {
    const room = rooms.get((url.searchParams.get("code") || "").toUpperCase());
    if (!room || !room.state) return json(res, { error: "no game" }, 404);
    const st = room.state;
    return json(res, {
      phase: st.phase, quarter: st.quarter,
      awaiting: st.awaitingPlayerId,
      planning0: st.planningQueue ? st.planningQueue[0] : null,
      pending: st.pendingHumanAction ? { pid: st.pendingHumanAction.playerId, track: st.pendingHumanAction.track, n: st.pendingHumanAction.actionsRemaining } : null,
      deliveringBizId: st.deliveringBizId || null,
      delQueue: st.delQueue || [], liqQueue: st.liqQueue || [], repayQueue: st.repayQueue || [],
      players: st.players.map((pl) => ({ id: pl.id, name: pl.name, h: pl.isHuman })),
      turnOrder: st.turnOrder,
    });
  }

  /* Some proxies and tunnels buffer or block text/event-stream, which would leave a
     player stuck forever waiting for a push. Clients therefore also poll this, sending
     the last version they saw; unchanged rooms return a tiny response. */
  if (p === "/api/state") {
    const room = rooms.get((url.searchParams.get("code") || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = room.members.find((m) => m.token === url.searchParams.get("token"));
    if (!me) return json(res, { error: "Unknown player." }, 403);
    const since = parseInt(url.searchParams.get("since") || "-1", 10);
    if ((room.version || 0) <= since) {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(`{"unchanged":true,"v":${room.version || 0}}`);
    }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(payloadFor(room));
  }

  if (p === "/api/stream") {
    const room = rooms.get((url.searchParams.get("code") || "").toUpperCase());
    if (!room) { res.writeHead(404); return res.end(); }
    const me = room.members.find((m) => m.token === url.searchParams.get("token"));
    if (!me) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write(`data: {"type":"hello","seat":${me.seat}}\n\n`);
    room.clients.add(res);
    const ka = setInterval(() => { try { res.write(": keepalive\n\n"); } catch (_) {} }, 20000);
    req.on("close", () => { clearInterval(ka); room.clients.delete(res); });
    broadcast(room);
    return;
  }

  // static files
  let file = p === "/" ? "/online.html" : p;
  const fp = path.join(ROOT, path.normalize(file).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Entrepreneurs server on http://localhost:${PORT}`));
