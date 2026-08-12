/* Shared test plumbing: drive one seat through a whole game over HTTP.

   Several tests need a *finished* game on the server - the records, the statistics,
   the nickname check - and they all want the same thing: play the simplest legal move
   at every prompt until the game is over. One copy of that, here.

   Pass a `jar` to play as a browser would, carrying the identity cookie so the
   finished record knows which browser sat in the seat.
*/
const DEFAULT_BASE = process.env.BASE || "http://127.0.0.1:8080";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A cookie jar with the same interface fetch has, so the caller can hand one in or
   leave it out. Kept to name=value, which is all a browser sends back. */
function jar() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
    headers() { return cookie ? { cookie } : {}; },
    remember(res) {
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
    },
  };
}

function client(base = DEFAULT_BASE, cookies = null) {
  const hdrs = () => (cookies ? cookies.headers() : {});
  const post = async (p, b) => {
    const r = await fetch(base + p, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hdrs() },
      body: JSON.stringify(b),
    });
    if (cookies) cookies.remember(r);
    return r.json();
  };
  const get = async (p) => {
    const r = await fetch(base + p, { cache: "no-store", headers: hdrs() });
    if (cookies) cookies.remember(r);
    return r.json();
  };
  return { post, get };
}

/* Play a full game from seat 0, with bots in the other seats. Returns
   {code, token, st} at game over, or null if it never got there. */
async function playAGame(name, bots, personas, opts = {}) {
  const base = opts.base || DEFAULT_BASE;
  const { post, get } = client(base, opts.jar || null);
  const stateOf = async (c, t) => (await get(`/api/state?code=${c}&token=${t}&since=-1`)).state;

  const { code, token } = await post("/api/create", { name, bots });
  if (personas) await post("/api/options", { code, token, personas: true });
  if (opts.variants) await post("/api/options", { code, token, variants: opts.variants });
  await post("/api/start", { code, token });
  const act = (action, data) => post("/api/action", { code, token, action, data });

  for (let step = 0; step < 4000; step++) {
    const st = await stateOf(code, token);
    if (!st) return null;
    if (st.phase === "gameover") return { code, token, st };
    const me = st.players[0];
    if (st.phase === "drafting" && st.awaitingPlayerId === 0) {
      await act("draft", { ind: Object.keys(st.decks).find((i) => st.decks[i].length) });
    } else if (st.phase === "planning" && st.planningQueue[0] === 0) {
      const track = ["ma", "rd", "raise_capital"].find((t) => st.tracks[t].some((x) => x === null)) || "raise_capital";
      await act("plan", { track });
    } else if (st.phase === "resolving" && st.pendingHumanAction && st.pendingHumanAction.playerId === 0) {
      const ent = st.pendingHumanAction;
      const ownedFree = Object.entries(st.board.owner).filter(([k, v]) => v === 0 && !(k in st.board.occupiedBy)).map(([k]) => k);
      const bpIdx = me.hand.findIndex((b) => me.cash >= b.setup && (b.ind === "RE" || b.ind === "HO" || b.ind === "HC"));
      let r = null;
      if (ent.track === "ma" && bpIdx >= 0 && ownedFree.length) r = await act("act", { type: "launch", index: bpIdx, footprint: [ownedFree[0]] });
      if ((!r || r.error) && ent.track === "ma") {
        const free = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
        if (free) r = await act("act", { type: "buyPlot", plot: free });
      }
      if ((!r || r.error) && ent.track === "raise_capital") r = await act("act", { type: "loan" });
      if (!r || r.error) await act("act", { type: "pass" });
    } else if (st.phase === "delivering" && st.awaitingPlayerId === 0) {
      await act("skipDelivery", {});
    } else if (st.phase === "liquidating" && st.awaitingPlayerId === 0) {
      await act("liquidateDone", {});
    } else if (st.phase === "repayingLoans" && st.awaitingPlayerId === 0) {
      await act("repayDone", {});
    } else if (st.phase === "placingLH" && st.turnOrder[0] === 0) {
      let placed = false;
      for (const a of Object.keys(st.board.graph)) {
        for (const b of st.board.graph[a]) {
          const ca = st.board.cellOf[a], cb = st.board.cellOf[b];
          if (ca.r === cb.r && ca.c === cb.c) continue;
          if (st.board.lhEdges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
          const res = await act("placeLH", { a, b });
          if (!res.error) { placed = true; break; }
        }
        if (placed) break;
      }
      if (!placed) return null;
    } else {
      await sleep(20);
    }
  }
  return null;
}

module.exports = { playAGame, jar, client, sleep, DEFAULT_BASE };
