/* ============================================================================
   What is being first player actually worth, and which part of it?

   REPOSITION pays FOUR ways, and only one of them is the one people argue about:

     1 THE STEAL      doReposition rewrites state.turnOrder during resolution, and
                      deliveryOrder is snapshotted from turnOrder AFTER resolution
                      ends - so the repositioning player sells first in the very
                      quarter they took the action, ahead of people who planned
                      that quarter expecting to sell before them.
     2 THE ORDER      first in turn order, and it keeps until somebody else takes
                      REPOSITION. That is a long time at three players and about
                      one quarter at six.
     3 THE DOUBLE     doubleFirstPlayer gives the first TWO planning placements of
                      next quarter back to back (three at two players, where
                      workersPerPlayer is 3).
     4 THE HUB        runClosing hands the new Logistic Hub to state.turnOrder[0],
                      every quarter, for as long as they hold first.

   AND A WARNING ABOUT NUMBER 4. placeNewLH picks uniformly at random from the
   legal spots. It does not take a player argument and never looks at whose
   buildings it would connect. So on an all-bot table - which is every probe in
   this repository - benefit 4 IS WORTH EXACTLY ZERO, and every figure anyone has
   quoted about first-player strength was measured in a game where the one
   privilege that never expires does not exist. The lhSmart arm below is what it
   looks like when somebody actually uses it.

   THE ARMS
     current    as it ships
     noSteal    deliveryOrder is fixed when planning opens, so REPOSITION cannot
                reorder a quarter already in flight. Dejan's complaint, answered
                by moving the snapshot rather than deferring the action.
     bmFirst    Board Meeting resolves FIRST instead of last. The steal survives
                in full, but it lands before anybody acts, so nothing is
                retroactive and no action resolves out of band.
     noDouble   benefit 3 removed, everything else kept.
     lhSmart    benefit 4 switched on: the first player places the hub where it
                joins the most of their own buildings.

   Run: node audit_first_player.js [games a table size] [seats...]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "250", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const base = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const NEEDLES = {
  deliverySnapshot: "  state.deliveryOrder = [...state.turnOrder];",
  planningQueue: `  if (state.doubleFirstPlayer !== null && state.doubleFirstPlayer !== undefined) {
    const dp = state.doubleFirstPlayer;
    const rest = state.turnOrder.filter((id) => id !== dp);
    state.planningQueue = [dp, dp, ...rep(rest, W), ...(W > 2 ? [dp] : [])];
    state.doubleFirstPlayer = null; // one-time bonus, consumed
  } else {
    state.planningQueue = rep(state.turnOrder, W);
  }`,
  resolutionOrder: `  const queue = [];
  for (const tn of ["raise_capital", "ma", "rd"]) {
    trackBonusOrder(state.tracks[tn]).forEach((e) => queue.push({ track: tn, playerId: e.playerId, actionsRemaining: e.actions }));
  }
  const bmFilled = [];
  state.tracks.board_meeting.forEach((pid, i) => { if (pid !== null) bmFilled.push(i); });
  bmFilled.sort((a, b) => b - a).forEach((i) => queue.push({ track: "board_meeting", playerId: state.tracks.board_meeting[i], actionsRemaining: 1 }));
  return queue;`,
  /* The PLOTS branch, which is the live one: board.lhOnPlots is !roadHubs, and
     roadHubs is off by default, so hubs stand on plots. An earlier version of this
     probe patched the road-edge branch instead and the arm silently measured the
     shipped game. */
  lhRandom: "    const plot = pool[Math.floor(rng() * pool.length)];",
  startPlanning: "function startPlanning(state) {",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}
function splice(src, find, put, what) {
  const out = src.replace(find, put);
  if (out === src) { console.error(`the ${what} splice changed nothing - update this probe`); process.exit(2); }
  return out;
}

/* noSteal: freeze the quarter's selling order when planning opens. REPOSITION still
   moves turnOrder immediately - it still takes first place for everything that comes
   after - it just cannot rewrite an order the quarter was already being played on. */
const FREEZE = `function startPlanning(state) {
  state.quarterOrder = [...state.turnOrder];`;
const USE_FROZEN = "  state.deliveryOrder = [...(state.quarterOrder || state.turnOrder)];";

/* bmFirst: the same queue, built with Board Meeting at the front. */
const BM_FIRST = `  const queue = [];
  const bmFilled = [];
  state.tracks.board_meeting.forEach((pid, i) => { if (pid !== null) bmFilled.push(i); });
  bmFilled.sort((a, b) => b - a).forEach((i) => queue.push({ track: "board_meeting", playerId: state.tracks.board_meeting[i], actionsRemaining: 1 }));
  for (const tn of ["raise_capital", "ma", "rd"]) {
    trackBonusOrder(state.tracks[tn]).forEach((e) => queue.push({ track: tn, playerId: e.playerId, actionsRemaining: e.actions }));
  }
  return queue;`;

const NO_DOUBLE = `  state.doubleFirstPlayer = null;
  state.planningQueue = rep(state.turnOrder, W);`;

/* lhSmart: the first player puts the hub where it joins the most of their own
   buildings, which is what benefit 4 is for. Ties keep the random pick, so the arm
   measures the CHOICE and not a change of distribution. */
const LH_SMART = `    const __fp = state.turnOrder[0];
    const __mine = (k0) => {
      const seen = new Set();
      for (const k of orthOf(state.board, k0)) {
        const id = state.board.occupiedBy[k];
        if (id === undefined || seen.has(id)) continue;
        const owner = state.players.find((q) => q.businesses.some((x) => x.id === id));
        if (owner && owner.id === __fp) seen.add(id);
      }
      return seen.size;
    };
    let __best = -1, __pick = [];
    for (const sp of pool) {
      const v = __mine(sp);
      if (v > __best) { __best = v; __pick = [sp]; } else if (v === __best) __pick.push(sp);
    }
    const plot = __pick[Math.floor(rng() * __pick.length)];`;

const ARMS = [
  { key: "current", name: "as it ships" },
  { key: "noSteal", name: "1 removed: no in-quarter reorder" },
  { key: "bmFirst", name: "Board Meeting resolves first (steal kept, nothing retroactive)" },
  { key: "noDouble", name: "3 removed: no double placement" },
  { key: "lhSmart", name: "4 switched on: the first player aims the hub" },
];

function engineFor(arm) {
  let logic = base;
  if (arm.key === "noSteal") {
    logic = splice(logic, NEEDLES.startPlanning, FREEZE, "freeze the quarter order");
    logic = splice(logic, NEEDLES.deliverySnapshot, USE_FROZEN, "use the frozen order");
  }
  if (arm.key === "bmFirst") logic = splice(logic, NEEDLES.resolutionOrder, BM_FIRST, "board meeting first");
  if (arm.key === "noDouble") logic = splice(logic, NEEDLES.planningQueue, NO_DOUBLE, "no double placement");
  if (arm.key === "lhSmart") logic = splice(logic, NEEDLES.lhRandom, LH_SMART, "aimed hub");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank };
  `, sandbox);
  return box.exports;
}

function run(E, seats) {
  const T = { games: 0, repos: 0, quarters: 0, runs: 0, runLen: 0, topHeldWon: 0, topHeldKnown: 0,
    margin: 0, winnerEP: 0, q6Known: 0, q6Won: 0, heldByWinner: 0, heldTotal: 0 };
  for (let s = SEED0; s < SEED0 + GAMES; s++) {
    const st = E.initGame(seats - 1, s, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    const held = {}, snap = {};
    let last = null, runLen = 0;
    E.advancePlanning(st, E.mulberry32(s + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) {
        snap[+m[1]] = st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) }));
        /* Who holds first as the quarter opens, and for how many quarters in a row.
           The run length is the claim worth checking: it should be long at three
           seats and about one at six, if somebody repositions nearly every quarter. */
        const fp = st.turnOrder[0];
        held[fp] = (held[fp] || 0) + 1;
        T.quarters++;
        if (fp === last) runLen++;
        else { if (last !== null) { T.runs++; T.runLen += runLen; } last = fp; runLen = 1; }
      }
      if (/takes REPOSITION/.test(String(msg))) T.repos++;
    });
    if (st.phase !== "gameover") continue;
    if (last !== null) { T.runs++; T.runLen += runLen; }
    T.games++;
    const winner = [...st.players].sort(E.finalRank)[0];
    const eps = st.players.map((x) => E.epTotal(x)).sort((a, b) => b - a);
    T.winnerEP += eps[0];
    T.margin += eps[0] - (eps[1] !== undefined ? eps[1] : eps[0]);
    T.heldTotal += Object.values(held).reduce((a, b) => a + b, 0);
    T.heldByWinner += held[winner.id] || 0;
    /* The seat that spent most of the game as first player - does it win? Games where
       two seats tie on that are evidence neither way. */
    const top = Math.max(0, ...Object.values(held));
    const leaders = Object.keys(held).filter((k) => held[k] === top);
    if (top > 0 && leaders.length === 1) {
      T.topHeldKnown++;
      if (String(leaders[0]) === String(winner.id)) T.topHeldWon++;
    }
    const s6 = snap[6] && [...snap[6]].sort((a, b) => b.ep - a.ep);
    if (s6 && s6.filter((x) => x.ep === s6[0].ep).length === 1) {
      T.q6Known++;
      if (s6[0].id === winner.id) T.q6Won++;
    }
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pc = (x, tot) => (tot > 0 ? (100 * x / tot).toFixed(1) + "%" : "-");

const R = {};
for (const arm of ARMS) { const E = engineFor(arm); R[arm.key] = {}; for (const n of SIZES) R[arm.key][n] = run(E, n); }

console.log(`\n${GAMES} games a table size, seeds ${SEED0}..${SEED0 + GAMES - 1}, all-bot tables.`);
for (const a of ARMS) console.log(`  ${pad(a.key, 10)} ${a.name}`);
console.log("\n  " + pad("", 30) + SIZES.map((n) => rp(n + "p", 9)).join(""));
const block = (title, fn) => {
  console.log("  " + title);
  for (const arm of ARMS) console.log("    " + pad(arm.key, 28) + SIZES.map((n) => rp(fn(R[arm.key][n], n), 9)).join(""));
};
block("HOW OFTEN IS IT TAKEN? repositions a game", (T) => (T.repos / Math.max(1, T.games)).toFixed(2));
block("quarters a player holds first, in a row", (T) => (T.runLen / Math.max(1, T.runs)).toFixed(2));
block("WHAT IS IT WORTH? the seat that held first most wins", (T) => pc(T.topHeldWon, T.topHeldKnown));
console.log("    " + pad("chance would give", 28) + SIZES.map((n) => rp((100 / n).toFixed(1) + "%", 9)).join(""));
block("quarters as first player, winner's share", (T) => pc(T.heldByWinner, T.heldTotal));
block("the Q6 leader goes on to win", (T) => pc(T.q6Won, T.q6Known));
block("the winner's margin over second (EP)", (T) => (T.margin / Math.max(1, T.games)).toFixed(1));
block("winning score (EP)", (T) => (T.winnerEP / Math.max(1, T.games)).toFixed(1));
console.log("");
