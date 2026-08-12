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
const matchlog = require("./matchlog.js");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

/* ---------- load the engine out of the single source of truth ---------- */
function loadEngine() {
  const src = fs.readFileSync(path.join(ROOT, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  // strip every ESM import: this file is evaluated as a plain script, not a module
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
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
      canLaunchMore, isCrossDistrictEdge, INDUSTRIES, LOAN_REPAY_RATE, SCALING, epTotal, canGoPublic, doReclaim, canReclaim,
      botResolveOneAction, botRepayLoans, nextDeliveryTarget, humansNeedingDelivery, ENGINE_VERSION,
      bizInd, bizSetup, bizOpex, bizProd, upgradeBlockedReason, bestMegacorpMatch, DISCS_PER_PLAYER,
      PERSONAS, MEGACORP_TILES, VARIANTS, VARIANT_KEYS, normaliseVariants };
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
/* Every match ever recorded, read once at boot and appended to as games end.
   Summarising is pure, so the answer is cached until the next match lands. */
const MATCHES = matchlog.load();
let STATS_CACHE = null;

const rooms = new Map();
const code = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const token = () => crypto.randomBytes(16).toString("hex");

function newRoom(hostName, bots) {
  let c; do { c = code(); } while (rooms.has(c));
  const room = {
    code: c, bots: Math.max(0, Math.min(3, bots | 0)),
    members: [{ token: token(), name: hostName || "Host", seat: 0, host: true }],
    spectators: [],
    state: null, rng: null, clients: new Set(), logs: [], version: 0, chat: [], personas: false,
    variants: E.normaliseVariants(null), startedAt: null, recorded: false,
  };
  rooms.set(c, room);
  return room;
}

/* ---------- presence ----------
   Every page pings /api/presence on a timer, from every screen including the join
   page, so the counters can report the whole site rather than only the people who
   have already sat down at a table. A client that stops pinging ages out. */
const presence = new Map();          // client id -> last time we heard from it
const PRESENCE_TTL = 30000;
const PRESENCE_MAX = 10000;          // ids are client-supplied; do not grow without bound
function countOnline() {
  const cutoff = Date.now() - PRESENCE_TTL;
  for (const [id, seen] of presence) if (seen < cutoff) presence.delete(id);
  return presence.size;
}
/* A room is a match once it has a game state and that game is not over; before
   that it is a lobby still looking for people. */
function countRooms() {
  let matches = 0, waiting = 0, seated = 0;
  for (const room of rooms.values()) {
    if (!room.state) { waiting++; continue; }
    if (room.state.phase === "gameover") continue;
    matches++;
    seated += room.members.length;
  }
  return { matches, waiting, seated };
}

/* Spectators are full members of the room for chat, voice and watching, but hold no
   seat and are refused every game action. Seats 100+ keep them clear of player ids. */
const SPECTATOR_SEAT_BASE = 100;
function anyMember(room, tok) {
  return room.members.find((m) => m.token === tok) || (room.spectators || []).find((m) => m.token === tok);
}
function log(room) {
  return (msg, pid) => { room.logs.push({ msg, pid }); if (room.logs.length > 400) room.logs.shift(); };
}

function payloadFor(room) {
  const v = room.version || 0;
  return room.state
    ? `{"type":"state","v":${v},"engine":"${E.ENGINE_VERSION}","chat":${JSON.stringify(room.chat.slice(-60))},"watchers":${JSON.stringify((room.spectators || []).map((m) => m.name))},"state":${encodeState(room.state)},"logs":${JSON.stringify(room.logs.slice(-120))}}`
    : `{"type":"lobby","v":${v},"engine":"${E.ENGINE_VERSION}","chat":${JSON.stringify(room.chat.slice(-60))},"members":${JSON.stringify(room.members.map((m) => ({ name: m.name, seat: m.seat, host: m.host })))},"bots":${room.bots},"personas":${room.personas ? "true" : "false"},"variants":${JSON.stringify(room.variants)},"code":"${room.code}","watchers":${JSON.stringify((room.spectators || []).map((m) => m.name))}}`;
}
/* Every finished game is written down exactly once. This hangs off broadcast
   because broadcast is the one thing that runs on every state change, whichever
   path got there - a human's last delivery, a bot resolving, a takeover. */
function recordIfFinished(room) {
  if (!room.state || room.state.phase !== "gameover" || room.recorded) return;
  room.recorded = true;
  try {
    const rec = matchlog.buildRecord(E, room);
    if (matchlog.append(rec)) {
      MATCHES.push(rec);
      STATS_CACHE = null;
      console.log(`match ${rec.id} recorded: ${rec.players.map((p) => `${p.name} ${p.ep}EP`).join(", ")}`);
    }
  } catch (e) {
    console.error(`could not build the match record: ${e.message}`);
  }
}
function broadcast(room) {
  recordIfFinished(room);
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

/* Hand a human seat to a bot. Used when a player disconnects for good, so the rest of
   the table is not held hostage by someone who has closed their browser. */
function convertToBot(room, seat) {
  const st = room.state;
  if (!st) return false;
  const p = E.byId(st, seat);
  if (!p || !p.isHuman) return false;
  const lg = log(room);
  p.isHuman = false;
  p.archetype = "balanced";
  if (!/\(bot\)$/.test(p.name)) p.name = `${p.name} (bot)`;
  const drop = (q) => (st[q] || []).filter((x) => x !== seat);
  st.draftQueue = drop("draftQueue");
  st.delQueue = drop("delQueue");
  st.liqQueue = drop("liqQueue");
  st.repayQueue = drop("repayQueue");
  lg(`${p.name} is now played by a bot.`, seat);

  // if the game was waiting on this seat, resolve that step as the bot
  const waiting = whoIsAwaited(st) === seat;
  if (waiting) {
    if (st.phase === "drafting") {
      const need = (st.draftCounts || {})[seat] || 0;
      while (p.hand.length < need) {
        const avail = E.INDUSTRIES.filter((i) => st.decks[i] && st.decks[i].length);
        if (!avail.length) break;
        p.hand.push(st.decks[avail[Math.floor(room.rng() * avail.length)]].shift());
      }
      if (st.draftQueue.length) st.awaitingPlayerId = st.draftQueue[0];
      else { st.awaitingPlayerId = null; E.startPlanning(st); E.advancePlanning(st, room.rng, lg); }
    } else if (st.phase === "resolving" && st.pendingHumanAction) {
      E.botResolveOneAction(st, p, st.pendingHumanAction.track, room.rng, lg);
      E.humanCompleteResolutionAction(st, room.rng, lg);
    } else if (st.phase === "delivering") {
      let guard = 0;
      while (E.nextDeliveryTarget(st) && guard++ < 40) E.skipDelivery(st, p, st.deliveringBizId, lg);
      E.finishDelivery(st, lg, room.rng);
    } else if (st.phase === "liquidating") {
      E.humanLiquidationDone(st, room.rng, lg);
    } else if (st.phase === "placingLH") {
      const g = st.board.graph;
      let done = false;
      for (const a of Object.keys(g)) {
        for (const b of g[a]) {
          if (!E.isCrossDistrictEdge(st.board, a, b)) continue;
          if (E.doPlaceLH(st, a, b, lg)) { done = true; break; }
        }
        if (done) break;
      }
      E.finishQuarterAfterLH(st, lg, room.rng);
    } else if (st.phase === "repayingLoans") {
      E.botRepayLoans(st, p, st.quarter, lg);
      E.finishQuarterAfterRepay(st, lg, room.rng);
    }
  }
  pump(room);
  return true;
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
      st.draftTaken = st.draftTaken || [];
      st.draftTaken.push(card.ind);
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
      else if (t === "reclaim") {
        const target = E.findDistressedTargets(st).find((x) => x.id === d.bizId);
        ok = !!target && E.doReclaim(st, p, target, lg);
      }
      else if (t === "renovate") {
        const target = E.findDistressedTargets(st).find((x) => x.id === d.bizId);
        const bp = p.hand[d.index];
        ok = !!target && !!bp && E.doRenovate(st, p, target, bp, lg);
      }
      else if (t === "research") ok = E.doDraw(st, p, d.ind, lg);
      else if (t === "upgrade") { const b = p.businesses.find((x) => x.id === d.bizId); ok = !!b && E.doUpgrade(st, p, b, rng, lg, d.plot); }
      else if (t === "megacorp") {
        if (!E.canGoPublic(st, p)) return { error: "You cannot go public: no Megacorp tile matches your companies." };
        const hq = p.businesses.find((x) => x.id === d.hqId); ok = E.claimMegacorp(st, p, lg, hq);
      }
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
const json = (res, obj, sc = 200, extra) => {
  res.writeHead(sc, { "Content-Type": "application/json", "Cache-Control": "no-store", ...(extra || {}) });
  res.end(JSON.stringify(obj));
};

/* ---------- who is this? ----------
   A small cookie so a returning player does not retype their name. It holds a random
   id and the last name they used, and nothing else.

   It is HttpOnly, so the page cannot read it - the name comes back from /api/whoami
   instead. That is deliberate but it is not a security boundary: the cookie is not
   signed and a determined player can forge one, so it must never be what grants
   anything. Room membership and host rights still ride on the per-room token the
   server mints, which this does not touch. */
const COOKIE = "ent_player";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;   // a year; a game night is not a session

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (_) { /* ignore junk */ }
  }
  return out;
}
const cleanName = (s) => String(s == null ? "" : s).trim().replace(/\s+/g, " ").slice(0, 24);
/* Read the identity off the request, or mint a fresh one. Anything malformed is
   treated as a first visit rather than trusted. */
function identityOf(req) {
  const raw = readCookies(req)[COOKIE];
  if (raw) {
    try {
      const v = JSON.parse(raw);
      if (v && typeof v.id === "string" && /^[a-f0-9]{16,32}$/.test(v.id)) {
        return { id: v.id, name: cleanName(v.name), fresh: false };
      }
    } catch (_) { /* fall through and mint a new one */ }
  }
  return { id: crypto.randomBytes(12).toString("hex"), name: "", fresh: true };
}
function identityCookie(req, id, name) {
  // Render and most hosts terminate TLS in front of us, so trust the forwarded scheme
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = proto === "https";
  const value = encodeURIComponent(JSON.stringify({ id, name: cleanName(name) }));
  return [`${COOKIE}=${value}`, "Path=/", `Max-Age=${COOKIE_MAX_AGE}`, "SameSite=Lax", "HttpOnly"]
    .concat(secure ? ["Secure"] : []).join("; ");
}
/* Remember this name against whoever is asking, and hand back the header to send. */
function rememberName(req, name) {
  const me = identityOf(req);
  const nm = cleanName(name) || me.name;
  return { id: me.id, name: nm, header: { "Set-Cookie": identityCookie(req, me.id, nm) } };
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  /* How busy the site is. Open to anyone: it is shown on every screen, including
     the join page, where the visitor has no room and no token yet. */
  if (p === "/api/presence") {
    const id = url.searchParams.get("id");
    if (id && (presence.has(id) || presence.size < PRESENCE_MAX)) presence.set(id, Date.now());
    const { matches, waiting, seated } = countRooms();
    return json(res, { online: countOnline(), matches, waiting, seated });
  }

  /* Statistics and the hall of fame, drawn from every match the server has run.
     Open like /api/presence: it is shown on every screen and holds nothing private
     beyond the display names players chose for themselves. */
  /* Who the browser says it is, so the join screen can fill the name in. Returns a
     fresh identity (and sets the cookie) on a first visit. */
  if (p === "/api/whoami" && req.method === "GET") {
    const me = identityOf(req);
    return json(res, { id: me.id, name: me.name, returning: !me.fresh && !!me.name },
      200, { "Set-Cookie": identityCookie(req, me.id, me.name) });
  }
  if (p === "/api/whoami" && req.method === "POST") {
    const bd = await body(req);
    const me = rememberName(req, bd.name);
    return json(res, { id: me.id, name: me.name }, 200, me.header);
  }

  /* The variant catalogue, so the lobby renders whatever the engine actually has
     rather than a copy of the list that can fall out of step with it. */
  if (p === "/api/variants") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ variants: E.VARIANTS }));
  }

  if (p === "/api/stats") {
    if (!STATS_CACHE) STATS_CACHE = matchlog.summarise(MATCHES, E.PERSONAS);
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(STATS_CACHE));
  }

  if (p === "/api/create" && req.method === "POST") {
    const b = await body(req);
    const room = newRoom(b.name, b.bots);
    const me = rememberName(req, b.name);
    return json(res, { code: room.code, token: room.members[0].token, seat: 0 }, 200, me.header);
  }

  if (p === "/api/join" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const full = room.members.length >= 4;
    if (room.state || full) {
      // the seat is gone, but they can still pull up a chair and watch
      const sp = {
        token: token(),
        name: b.name || `Watcher ${(room.spectators || []).length + 1}`,
        seat: SPECTATOR_SEAT_BASE + (room.spectators || []).length,
        spectator: true, host: false,
      };
      room.spectators = room.spectators || [];
      room.spectators.push(sp);
      broadcast(room);
      const meSp = rememberName(req, b.name);
      return json(res, { code: room.code, token: sp.token, seat: sp.seat, spectator: true,
        reason: room.state ? "started" : "full" }, 200, meSp.header);
    }
    const m = { token: token(), name: b.name || `Player ${room.members.length + 1}`, seat: room.members.length, host: false };
    room.members.push(m);
    broadcast(room);
    const me2 = rememberName(req, b.name);
    return json(res, { code: room.code, token: m.token, seat: m.seat }, 200, me2.header);
  }

  if (p === "/api/resume" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "That room no longer exists." }, 404);
    const me = anyMember(room, b.token);
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

  if (p === "/api/chat" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = anyMember(room, b.token);
    if (!me) return json(res, { error: "Unknown player." }, 403);
    const raw = typeof b.text === "string" ? b.text.trim() : "";
    if (!raw) return json(res, { ok: true });
    room.chat.push({
      id: crypto.randomBytes(6).toString("hex"),
      seat: me.seat, name: me.name,
      text: raw.slice(0, 400),          // keep messages short; the panel is small
      t: Date.now(),
    });
    if (room.chat.length > 200) room.chat.shift();
    broadcast(room);
    return json(res, { ok: true });
  }

  /* ---- voice: the server only relays WebRTC handshakes, never audio ----
     Audio flows peer to peer. Each member has a small inbox that the browser drains
     while a call is running. */
  if (p === "/api/signal" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = anyMember(room, b.token);
    if (!me) return json(res, { error: "Unknown player." }, 403);
    if (b.type === "join" || b.type === "leave") {
      me.voice = b.type === "join";
      // tell everyone else who is on the call now
      [...room.members, ...(room.spectators || [])].forEach((m) => {
        if (m === me) return;
        m.inbox = m.inbox || [];
        m.inbox.push({ kind: "presence", from: me.seat, name: me.name, on: me.voice });
      });
      return json(res, { ok: true, peers: [...room.members, ...(room.spectators || [])].filter((m) => m.voice && m !== me).map((m) => ({ seat: m.seat, name: m.name })) });
    }
    const target = [...room.members, ...(room.spectators || [])].find((m) => m.seat === (b.to | 0));
    if (!target) return json(res, { error: "No such player." }, 404);
    target.inbox = target.inbox || [];
    target.inbox.push({ kind: b.kind, from: me.seat, name: me.name, payload: b.payload });
    if (target.inbox.length > 60) target.inbox.shift();
    return json(res, { ok: true });
  }

  if (p === "/api/signals") {
    const room = rooms.get((url.searchParams.get("code") || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = anyMember(room, url.searchParams.get("token"));
    if (!me) return json(res, { error: "Unknown player." }, 403);
    const mail = me.inbox || [];
    me.inbox = [];
    return json(res, {
      mail,
      peers: [...room.members, ...(room.spectators || [])].filter((m) => m.voice && m !== me).map((m) => ({ seat: m.seat, name: m.name })),
    });
  }

  if (p === "/api/rematch" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = room.members.find((m) => m.token === b.token);
    if (!me || !me.host) return json(res, { error: "Only the host can start a rematch." }, 403);
    // Keep the same people and seats; just clear the finished game so everyone lands
    // back in the waiting room ready to go again.
    room.state = null;
    room.rng = null;
    room.logs = [];
    room.recorded = false;
    room.startedAt = null;
    room.members.forEach((m) => { m.replaced = false; });
    broadcast(room);
    return json(res, { ok: true });
  }

  if (p === "/api/kick" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const host = room.members.find((m) => m.token === b.token);
    if (!host || !host.host) return json(res, { error: "Only the host can do that." }, 403);
    const target = room.members.find((m) => m.seat === (b.seat | 0));
    if (!target) return json(res, { error: "No such player." }, 404);
    if (target.host) return json(res, { error: "The host cannot remove themselves." }, 400);
    if (!room.state) {
      // still in the lobby: drop them and renumber the seats
      room.members = room.members.filter((m) => m !== target);
      room.members.forEach((m, k) => { m.seat = k; });
      broadcast(room);
      return json(res, { ok: true, removed: true });
    }
    // mid-game: a bot takes the seat over so play can continue
    if (!convertToBot(room, target.seat)) return json(res, { error: "That seat is already a bot." }, 400);
    target.replaced = true;
    broadcast(room);
    return json(res, { ok: true, replaced: true });
  }

  if (p === "/api/options" && req.method === "POST") {
    const b = await body(req);
    const room = rooms.get((b.code || "").toUpperCase());
    if (!room) return json(res, { error: "No such room." }, 404);
    const me = room.members.find((m) => m.token === b.token);
    if (!me || !me.host) return json(res, { error: "Only the host can change the setup." }, 403);
    if (room.state) return json(res, { error: "The game has already started." }, 409);
    if (typeof b.personas === "boolean") room.personas = b.personas;
    /* Merge rather than replace: a caller that names one variant should not
       silently switch the others off, and normalise still drops anything the
       engine does not recognise. */
    if (b.variants && typeof b.variants === "object") {
      room.variants = E.normaliseVariants({ ...room.variants, ...b.variants });
    }
    if (typeof b.bots === "number") room.bots = Math.max(0, Math.min(3, b.bots | 0));
    broadcast(room);
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
    room.state = E.initGame(room.bots, seed, room.members.map((m) => m.name), undefined, room.personas, room.variants);
    room.rng = E.mulberry32(seed + 777);
    room.startedAt = Date.now();
    room.recorded = false;
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
    if (!me) {
      const sp = (room.spectators || []).find((m) => m.token === b.token);
      if (sp) return json(res, { error: "You are watching this game, not playing it." }, 403);
      return json(res, { error: "Unknown player." }, 403);
    }
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
    const me = anyMember(room, url.searchParams.get("token"));
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
    const me = anyMember(room, url.searchParams.get("token"));
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

server.listen(PORT, () => {
  console.log(`Entrepreneurs server on http://localhost:${PORT}`);
  console.log(`Rules engine ${E.ENGINE_VERSION} (loaded from EntrepreneursGame.jsx)`);
});
