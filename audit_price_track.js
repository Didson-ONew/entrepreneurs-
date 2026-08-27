/* ============================================================================
   The price track, and what to do about what it costs.

   THE CHANGE. Each industry now has a marker on a track from $1 to $10 with a
   blank cell between each number. Appearing as a SUPPLIER moves it up two cells
   - a whole dollar at once, where it used to take two appearances - and being
   BUILT moves that industry's own marker down one, so two companies still cost a
   dollar. The ends are hard stops.

   THE PROBLEM. Measured over 200 games a table size, the faster climb works, and
   it costs more than it looks. Against the previous ruleset at six seats:

       winning score            111  ->  173
       cash a seat ends with   $196  -> $471
       cash as a share of the
         winner's score          30% ->  ~50%
       winner's lead over 2nd   16.8 ->  33.7
       industry spread          10pts -> 31pts

   The winner's margin doubling is the one that matters: every measurement in
   this repo has been pushing the other way. So the question is not whether the
   track is right - it is what else has to move with it.

   THE SUSPICION THIS TESTS. The inflation is real money doing real work, and
   there is nothing wrong with a bigger economy. What turns it into a problem is
   that CASH IS SCORED AT A RATE SET FOR THE OLD ECONOMY - 1 EP per $10. Double
   the money in the game and that line doubles too, which is exactly what the
   share table above shows. If that is the mechanism, then dividing cash by $20
   should pull the score and the margin back without touching the track at all.

   The alternative, if it is not, is to halve the climb: keep the track, the
   blank cells and the hard stops, but leave a supplier appearance worth one cell
   as it always was. That gives back the old economy and keeps the parts of the
   change that were plainly improvements.

   Four rulesets, measured on the same seeds:

     A  track as specified, cash per $10      what is on the branch now
     B  track as specified, cash per $20      the cash-rate fix
     C  half climb, cash per $10              the old economy, new track
     D  half climb, cash per $20              both, for the corners of the grid

   WHAT IT FOUND. THE SUSPICION IS CORRECT, AND THE FIX IS THE CASH RATE.
   120 games a ruleset a table size, same seeds throughout.

     4 players            before    A       B       C       D
       winning score        103    155     116     116      97
       lead over 2nd       20.7   35.9    23.2    23.6    19.5
       cash % of winner     31%    51%     32%     34%     19%
       Q6 leader won        35%    34%     33%     39%     38%

     6 players            before    A       B       C       D
       winning score        111    168     128     123     104
       lead over 2nd       16.8   30.3    21.3    22.3    17.5
       cash % of winner     30%    51%     29%     32%     16%
       industry spread    10 pts 22 pts  19 pts   8 pts   9 pts

   B - the track exactly as specified, with cash scored per $20 instead of per
   $10 - puts the cash share back where it was almost exactly (32% and 29%
   against 31% and 30%) and takes most of the margin back out (35.9 to 23.2 at
   four seats, 30.3 to 21.3 at six). It does this WITHOUT touching the track, so
   the rule as written survives intact. The inflation was never the problem: the
   problem was scoring a doubled economy at a rate set for the old one.

   D overshoots. Halving the climb AND halving the cash rate leaves cash at
   16-19% of a score, which is less than land and Megacorps combined - a
   different game, and not the one being aimed at.

   TWO THINGS B DOES NOT FIX, and they should be said plainly:

     THE MARGIN IS STILL WIDER than before - 21.3 EP at six seats against 16.8.
     Better than 30.3, not back to where it was.

     THE INDUSTRIES SPREAD OUT. They sat inside 10 points of each other at a
     full table and B leaves them at 19. C, the halved climb, is the only column
     that keeps that spread (8 points), because a slower climb means an unbuilt
     industry does not run away from the built ones. That is the genuine cost of
     the faster climb, and no cash rate can pay it.

   SHIPPED: D - one cell each way, cash per $20. Chosen over B deliberately, with
   the cash consequence known in advance. Re-measured at 200 games a table size
   afterwards, against the ruleset before any of this landed:

                            before      shipped
       winning score, 6p       111          101
       winner's lead, 6p      16.8         16.9
       industry spread, 6p   10 pts       10 pts
       industry spread, 4p   25 pts       12 pts
       cash % of winner        30%      15-18%
       companies % of winner 31-33%      37-39%

   Industry parity came back exactly, and at four seats it is better than it has
   ever been. The margin is back to where it was. What moved is what the game
   rewards: cash halved from about a third of a winning score to a sixth, and
   BUILDING absorbed it, from 31-33% to 37-39%, with the Megacorp lines taking
   the rest. That is a real change of emphasis, not a neutral rebalance, and it
   is the thing to watch at a table.

   ONE NUMBER WENT THE WRONG WAY and is recorded here rather than buried: the Q6
   leader at six seats won 20% of games before and 32% now. Two standard errors
   on each is about 7 points, so a 12-point gap is probably real rather than
   noise. Nothing else in the runaway table moved - the margin, the wire-to-wire
   rate and the bottom-half comeback rate are all where they were - so this may
   be the halfway snapshot catching a game that now resolves earlier rather than
   a leader who is harder to catch. It wants a second look before anything is
   done about it.

   Run: node audit_price_track.js [seeds]      (default 100 a size a ruleset)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "100", 10);
const SIZES = [2, 4, 6];       // the shape is clear from three; five would be 40 min

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* The two knobs, as they are written in the engine. If either moves, every number
   below would silently describe the wrong thing. */
const CLIMB = "const SUPPLIER_CELLS = 2, BUILT_CELLS = -1;";
const CASH = "    const cashEP = Math.floor(p.cash / 10);";
for (const [what, needle] of [["the climb", CLIMB], ["the cash rate", CASH]]) {
  if (!SRC.includes(needle)) {
    console.error(`the engine changed shape - ${what} is no longer written as this probe expects`);
    process.exit(2);
  }
}

const RULESETS = [
  { key: "A", label: "as specified", climb: 2, cash: 10 },
  { key: "B", label: "cash per $20", climb: 2, cash: 20 },
  { key: "C", label: "half climb", climb: 1, cash: 10 },
  { key: "D", label: "half + $20", climb: 1, cash: 20 },
];

function engineFor(rs) {
  let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  logic = logic.replace(CLIMB, `const SUPPLIER_CELLS = ${rs.climb}, BUILT_CELLS = -1;`);
  logic = logic.replace(CASH, `    const cashEP = Math.floor(p.cash / ${rs.cash});`);
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, price, INDUSTRIES };
  `, sandbox);
  return box.E;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

/* One ruleset at one table size. Same seeds everywhere, so a difference between
   two columns is the rule and not the luck. */
function run(E, seats) {
  const T = {
    games: 0, winnerEP: 0, secondEP: 0, lastEP: 0, lead: 0,
    q6Won: 0, q6Known: 0, endCash: 0, seatsCounted: 0,
    winnerCash: 0, winnerTotal: 0, has: {}, endQ: 0, priceSum: 0, priceN: 0,
  };
  E.INDUSTRIES.forEach((i) => { T.has[i] = 0; });
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    const snap = {};
    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) snap[+m[1]] = st.players.map((p) => ({ id: p.id, ep: E.epTotal(p) }));
    });
    if (st.phase !== "gameover") continue;
    T.games++;
    const ranked = [...st.players].sort(E.finalRank);
    const w = ranked[0];
    const eps = st.players.map((p) => E.epTotal(p)).sort((a, b) => b - a);
    T.winnerEP += eps[0];
    T.secondEP += eps.length > 1 ? eps[1] : eps[0];
    T.lastEP += eps[eps.length - 1];
    T.lead += eps[0] - (eps.length > 1 ? eps[1] : eps[0]);
    T.endQ += st.quarter;
    for (const ind of E.INDUSTRIES) { T.priceSum += E.price(st.pm, ind); T.priceN++; }
    for (const p of st.players) { T.endCash += p.cash; T.seatsCounted++; }
    /* Cash as a share of the winner's score, straight off the EP ledger. */
    for (const line of (w.epLog || [])) {
      T.winnerTotal += line.amount;
      if (String(line.label).startsWith("Cash on hand")) T.winnerCash += line.amount;
    }
    const s6 = snap[6];
    if (s6) {
      const sorted = [...s6].sort((a, b) => b.ep - a.ep);
      const leaders = sorted.filter((x) => x.ep === sorted[0].ep);
      if (leaders.length === 1) { T.q6Known++; if (leaders[0].id === w.id) T.q6Won++; }
    }
    const inds = new Set(E.activeBiz(w).concat(E.megacorpHQs(w)).map(E.bizInd));
    inds.forEach((i) => { if (T.has[i] !== undefined) T.has[i]++; });
  }
  return T;
}

console.log("Entrepreneurs - the price track, and what has to move with it");
console.log(`${SEEDS} games per ruleset per table size, personas on, same seeds throughout.\n`);
console.log("  A  track as specified, cash per $10   (what is on the branch now)");
console.log("  B  track as specified, cash per $20   (the cash-rate fix)");
console.log("  C  half climb, cash per $10           (the old economy, new track)");
console.log("  D  half climb, cash per $20\n");

const results = {};
for (const rs of RULESETS) {
  const E = engineFor(rs);
  results[rs.key] = {};
  for (const seats of SIZES) results[rs.key][seats] = run(E, seats);
}

const W = 13;
const head = () => console.log(pad("", 34) + RULESETS.map((r) => rp(`${r.key} ${r.label}`, W)).join(""));
const row = (seats, name, fn, dp = 1) =>
  console.log(pad("  " + name, 34) + RULESETS.map((r) => rp(fn(results[r.key][seats]).toFixed(dp), W)).join(""));
const pct = (seats, name, fn) =>
  console.log(pad("  " + name, 34) + RULESETS.map((r) => rp(`${(100 * fn(results[r.key][seats])).toFixed(0)}%`, W)).join(""));
const money = (seats, name, fn) =>
  console.log(pad("  " + name, 34) + RULESETS.map((r) => rp(`$${fn(results[r.key][seats]).toFixed(0)}`, W)).join(""));

/* What the previous ruleset measured, so every column has something to beat.
   From audit_state_of_play.js at 250 seeds, before the track landed. */
const BEFORE = {
  2: { win: 93, lead: 28.8, cash: 0.30, q6: 0.65, spread: 30 },
  4: { win: 103, lead: 20.7, cash: 0.31, q6: 0.35, spread: 25 },
  6: { win: 111, lead: 16.8, cash: 0.30, q6: 0.20, spread: 10 },
};

for (const seats of SIZES) {
  console.log("=".repeat(34 + W * RULESETS.length));
  console.log(`${seats} PLAYERS      (before the track: winning score ${BEFORE[seats].win}, `
    + `lead ${BEFORE[seats].lead}, cash ${(100 * BEFORE[seats].cash).toFixed(0)}%, `
    + `Q6 leader ${(100 * BEFORE[seats].q6).toFixed(0)}%, spread ${BEFORE[seats].spread} pts)`);
  console.log("=".repeat(34 + W * RULESETS.length));
  row(seats, "winning score", (T) => T.winnerEP / T.games, 0);
  row(seats, "second place", (T) => T.secondEP / T.games, 0);
  row(seats, "last place", (T) => T.lastEP / T.games, 0);
  row(seats, "winner's lead over 2nd", (T) => T.lead / T.games, 1);
  pct(seats, "cash as share of winner's score", (T) => T.winnerCash / T.winnerTotal);
  pct(seats, "Q6 leader went on to win", (T) => (T.q6Known ? T.q6Won / T.q6Known : 0));
  money(seats, "cash a seat ends with", (T) => T.endCash / T.seatsCounted);
  money(seats, "mean industry price at the end", (T) => T.priceSum / T.priceN);
  const spread = (T) => {
    const v = Object.values(T.has).map((n) => (T.games ? 100 * n / T.games : 0));
    return Math.max(...v) - Math.min(...v);
  };
  row(seats, "industry spread, best minus worst", spread, 0);
  row(seats, "mean final quarter", (T) => T.endQ / T.games, 2);
  console.log("");
}

console.log(`two standard errors on a 50% rate at ${SEEDS} games is about `
  + `±${(100 * 2 * Math.sqrt(0.25 / SEEDS)).toFixed(0)} points.`);
console.log("A difference smaller than that is not a finding.\n");
