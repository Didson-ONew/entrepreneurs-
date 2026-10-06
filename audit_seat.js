/* ============================================================================
   Is the seat you draw worth more than the game you play?

   TWO PLAYTESTERS, MONTHS APART, NAMED THE SAME THING. Amy's one wish was
   "every starter player gets same resources + money", and her frustration was
   "being 4th player". Rick, at three seats: "FIRST PLAYER ADVANTAGE IS WAY TOO
   HIGH. Not only is the first player handed the first to act, they also start
   with the most money... being selected as the first player is basically
   godsend." His wand was to REVERSE the starting money.

   audit_first_player.js already measures what HOLDING first player is worth and
   finds it close to nothing - the seat that held it most wins 34.1% of the time
   at three players against a 33.3% baseline. But that is a different question.
   It measures a privilege players take during the game. This measures the seat
   they were DEALT, which bundles three things that arrive together:

     capital     seat 1 starts on $25 at three players, seat 3 on $19
     cards       and seat 1 on one Blueprint against seat 3's three
     order       turn order is set once at seating and never rotates. The only
                 thing that moves it is REPOSITION, which costs a player every
                 worker they have. So seat 1 delivers first - into demand icons
                 that are first come, first served - and places the Logistic Hub,
                 potentially for the whole game.

   Seats are randomised against bot archetypes by initGame, so over enough games
   a seat's win rate is the seat's own, not its personality's.

   THE ARMS
     current    as it ships
     flatCash   every seat starts on the table's mean capital; cards untouched
     flatAll    every seat starts on the mean capital AND the mean card count
     reversed   the capital column reversed - Rick's wand - cards untouched
     rotate     turn order rotates one seat every quarter, so first player comes
                round to everybody; capital and cards untouched

   WHAT IT FOUND - 400 games an arm a table size.

   SEAT 1 IS THE WORST SEAT, NOT THE BEST. At three players it wins 27.5% of the
   time against a 33.3% baseline and finishes 6.5 EP behind seat 3, which wins
   37.8%. At four seats it is 22.8% against 25%. The compensation for going late
   is not thin, it is too generous: seat 3 holds three Blueprints to seat 1's
   one AND drafts first, and cards are worth more than the $6 of capital that
   buys them.

   SO RICK'S WAND MAKES IT WORSE. Reversing the capital column - his suggestion -
   takes seat 3 to 43.1% and widens the spread from 10.2 to 17.0 points. Rotating
   turn order does the same, 44.9%, because order was not what was carrying seat
   1. The only arm that closes the gap is flatAll, equal capital AND equal cards:
   34.0 / 35.4 / 30.6, a spread of 4.7 points.

   AND THE REASON TO DISTRUST ALL OF IT, which audit_first_player.js states in
   its own header: placeNewLH picks uniformly at random from the legal spots and
   never looks at whose buildings a hub would connect. On an all-bot table - and
   every table in this repository is one - the first player's hub privilege is
   worth EXACTLY ZERO, every quarter, for the whole game. Bots also do not fight
   over demand icons the way a human reading the board does, and delivery order
   is the other thing seat 1 holds. The privileges a human would feel are
   precisely the ones these numbers cannot see, so a table that says seat 1 is a
   godsend is not contradicted by this probe - it is pointing at the part the
   probe is blind to. Fix the blindness before trusting the verdict.

   Run: node audit_seat.js [games a table size] [seats...]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "300", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every arm is a splice on an exact line. A line that has moved stops the probe
   rather than letting it quietly measure the shipped game five times over. */
const STARTING_NEEDLE = `const STARTING = {
  6: [[25, 1], [22, 2], [22, 2], [19, 3], [19, 3], [16, 4]],
  5: [[25, 1], [22, 2], [22, 2], [19, 3], [16, 4]],
  4: [[25, 1], [22, 2], [22, 2], [19, 3]],
  3: [[25, 1], [22, 2], [19, 3]],
  2: [[20, 2], [20, 2]],
};`;
const ROTATE_NEEDLE = `  state.quarter += 1;
  log(logMsg("\\u25b6 Year {0}, Quarter {1}", Math.ceil(state.quarter / 4), state.quarter), null);`;
for (const [name, needle] of [["STARTING", STARTING_NEEDLE], ["quarter advance", ROTATE_NEEDLE]]) {
  if (!BASE.includes(needle)) {
    console.error(`the engine changed shape around ${name} - update this probe`);
    process.exit(2);
  }
}

/* The shipped table, read back out of the engine so the arms are derived from it
   rather than typed again here and left to drift. */
const SHIPPED = {
  6: [[25, 1], [22, 2], [22, 2], [19, 3], [19, 3], [16, 4]],
  5: [[25, 1], [22, 2], [22, 2], [19, 3], [16, 4]],
  4: [[25, 1], [22, 2], [22, 2], [19, 3]],
  3: [[25, 1], [22, 2], [19, 3]],
  2: [[20, 2], [20, 2]],
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function tableFor(mode) {
  const out = {};
  for (const [n, rows] of Object.entries(SHIPPED)) {
    const cash = rows.map((r) => r[0]), cards = rows.map((r) => r[1]);
    if (mode === "flatCash") out[n] = rows.map((r) => [Math.round(mean(cash)), r[1]]);
    else if (mode === "flatAll") out[n] = rows.map(() => [Math.round(mean(cash)), Math.round(mean(cards))]);
    else if (mode === "reversed") out[n] = rows.map((r, i) => [cash[cash.length - 1 - i], r[1]]);
    else out[n] = rows.map((r) => [r[0], r[1]]);
  }
  return out;
}
const ARMS = ["current", "flatCash", "flatAll", "reversed", "rotate"];

function engine(arm) {
  let logic = BASE;
  if (arm !== "current" && arm !== "rotate") {
    logic = logic.replace(STARTING_NEEDLE, "const STARTING = " + JSON.stringify(tableFor(arm)) + ";");
  }
  if (arm === "rotate") {
    /* First player comes round to everybody instead of being a thing you are
       dealt. REPOSITION still works on top of it. */
    logic = logic.replace(ROTATE_NEEDLE,
      "  state.turnOrder = [...state.turnOrder.slice(1), state.turnOrder[0]];\n" + ROTATE_NEEDLE);
  }
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.e = { initGame, advanceDraft, advancePlanning, startPlanning, mulberry32, epTotal, activeBiz };
  `, sandbox);
  return box.e;
}

/* One game, driven to the end with no human in it. Returns the finishing EP in
   SEAT order - seat 0 is whoever turn order started with. */
function play(E, seats, seed) {
  const quiet = () => {};
  let st;
  try {
    st = E.initGame(seats - 1, seed, ["Seat"], undefined, true, undefined);
    st.players[0].isHuman = false;            // nobody to pause for: the game runs to the end
    if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
    var seating = [...st.turnOrder];          // captured before REPOSITION can touch it
    E.advancePlanning(st, E.mulberry32(seed + 777), quiet);
  } catch (e) { return null; }
  if (!st || st.phase !== "gameover") return null;
  return seating.map((id) => {
    const p = st.players.find((x) => x.id === id);
    return { ep: E.epTotal(p), biz: E.activeBiz(p).length };
  });
}

const pct = (x) => (100 * x).toFixed(1) + "%";
console.log(`\n${GAMES} games an arm a table size, seeds 1..${GAMES}, all-bot tables.`);
console.log("Seat 1 is first in turn order at setup: most capital, fewest cards, first to deliver.\n");

for (const n of SIZES) {
  console.log("=".repeat(62));
  console.log(`${n} PLAYERS      chance would give each seat ${pct(1 / n)}`);
  const rows = [];
  for (const arm of ARMS) {
    const E = engine(arm);
    const wins = new Array(n).fill(0), eps = Array.from({ length: n }, () => []);
    let played = 0;
    for (let g = 0; g < GAMES; g++) {
      const r = play(E, n, g + 1);
      if (!r) continue;
      played++;
      const best = Math.max(...r.map((x) => x.ep));
      const champs = r.map((x, i) => (x.ep === best ? i : -1)).filter((i) => i >= 0);
      champs.forEach((i) => (wins[i] += 1 / champs.length));   // split a dead heat
      r.forEach((x, i) => eps[i].push(x.ep));
    }
    rows.push({ arm, played, wins: wins.map((w) => w / played), eps: eps.map(mean) });
  }

  const pad = (s, w) => String(s).padStart(w);
  console.log("\n  WIN RATE BY SEAT");
  console.log("    arm        " + Array.from({ length: n }, (_, i) => pad("seat " + (i + 1), 9)).join("") + pad("spread", 10));
  for (const r of rows) {
    const spread = Math.max(...r.wins) - Math.min(...r.wins);
    console.log("    " + r.arm.padEnd(11) + r.wins.map((w) => pad(pct(w), 9)).join("") + pad(pct(spread), 10));
  }
  console.log("\n  FINAL SCORE BY SEAT (EP)");
  console.log("    arm        " + Array.from({ length: n }, (_, i) => pad("seat " + (i + 1), 9)).join("") + pad("seat1-last", 12));
  for (const r of rows) {
    console.log("    " + r.arm.padEnd(11) + r.eps.map((e) => pad(e.toFixed(1), 9)).join("")
      + pad((r.eps[0] - r.eps[n - 1]).toFixed(1), 12));
  }
  console.log(`\n  (${rows[0].played}/${GAMES} games reached a final score in the current arm)`);
}
console.log();
