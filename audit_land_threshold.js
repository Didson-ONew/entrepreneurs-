/* ============================================================================
   The land award's step, and whether it should be a step at all.

   THE PROBLEM THIS MEASURES. The two land awards pay a FIXED pot per game -
   roughly seven payouts across the three year ends, whatever the head count -
   so their weight in a winning score is that pot divided by a score that grows
   with the table. A flat rate therefore collapsed as seats were added: 17% of a
   winning score at two players, 3.5% at six.

   The fix was to double the rate from four players up (5/2/1 below, 10/4/2 at
   four and over). It worked, but a step has a cliff in it, and the cliff is
   sharp: measured on the shipped rules, land is 13% of a winning score at three
   players and 27% at four. One extra seat doubles the weight of the same race,
   and four players ends up the most land-heavy game there is - it is the first
   count on the doubled pot and has the fewest rivals to split it.

   FOUR SCHEDULES, on the same seeds:

     step@4     5/2/1 up to three players, 10/4/2 from four.  WHAT SHIPS.
     step@5     the same step moved one seat later, so four players keeps the
                small rate. Removes the 3-to-4 cliff by pushing it to 4-to-5.
     ramp       a smooth line between the same endpoints the step has - 5 at two
                players through 10 at six - so nothing jumps anywhere.
     scaled     fully proportional to the head count, 2.5 EP a seat. Holds the
                pot per player constant instead of the pot per game.

   Every schedule keeps the shipped SHAPE of a payout: a tie pays 40% of the sole
   rate, three or more pay 20%. That reproduces 5/2/1 and 10/4/2 exactly, so
   step@4 is the shipped rule and not an approximation of it.

   WHAT TO READ. The headline is land's share of a winning score, and whether it
   is FLAT across the table sizes - that is the thing a step cannot give you. But
   a flat share is worthless if it breaks the race, so two guards come with it:

     DOES THE LAND LEADER WIN? Against 1/n chance. The rate was doubled in the
     first place because at 5 EP the player holding the most ground won BELOW
     what an indifferent seat would take - chasing land was a trap. Any schedule
     that puts a count back under its chance line has broken the race there.

     DOES THE GAME SETTLE? A bigger fixed prize for a position held all game is
     a runaway risk. The Q6-leader win rate and the winner's margin say whether
     it is being bought.

   Run: node audit_land_threshold.js [gamesPerCell]      (default 100)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { logText } = require("./logtext.js");

const GAMES = parseInt(process.argv[2] || "100", 10);
const SIZES = [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* The one function every land payout goes through, and the one the bots price a
   plot with. Replacing it moves the scoring AND the bots together, which is the
   only way to measure a rate rather than measure bots playing the wrong one. */
const NEEDLE = `const landAward = (state) => (state && state.players && state.players.length >= LAND_AWARD_LARGE_FROM
  ? LAND_AWARD_LARGE : LAND_AWARD);`;
if (!BASE.includes(NEEDLE)) {
  console.error("landAward changed shape - update this probe"); process.exit(2);
}

/* sole EP by head count. A tie pays 40% of it, three or more 20% - the ratios the
   shipped 5/2/1 and 10/4/2 already use, so `step@4` below IS the shipped rule. */
const SCHEDULES = [
  { key: "step@4", sole: { 2: 5, 3: 5, 4: 10, 5: 10, 6: 10 }, note: "what ships" },
  { key: "step@5", sole: { 2: 5, 3: 5, 4: 5, 5: 10, 6: 10 }, note: "step moved one seat later" },
  { key: "ramp", sole: { 2: 5, 3: 6, 4: 8, 5: 9, 6: 10 }, note: "smooth, same endpoints" },
  { key: "scaled", sole: { 2: 5, 3: 8, 4: 10, 5: 13, 6: 15 }, note: "2.5 EP a seat" },
];

function engineFor(sched) {
  const table = JSON.stringify(sched.sole);
  const repl = `const __SOLE_BY_SEATS = ${table};
const landAward = (state) => {
  const n = (state && state.players && state.players.length) || 4;
  const s = __SOLE_BY_SEATS[n] !== undefined ? __SOLE_BY_SEATS[n] : 10;
  return { sole: s, two: Math.max(1, Math.round(s * 0.4)), many: Math.max(1, Math.round(s * 0.2)) };
};`;
  const logic = BASE.replace(NEEDLE, repl);
  if (logic === BASE) { console.error("the landAward splice changed nothing - update this probe"); process.exit(2); }
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
              epTotal, finalRank, plotCount, districtCount, landAward, activeBiz };
  `, sandbox);
  return box.E;
}

const LAND_LABELS = new Set(["The Real-Estate Mogul", "The Omnipresent"]);

function measure(E, seats) {
  const T = { games: 0, seats: 0, winLand: 0, winTot: 0, allLand: 0, allTot: 0,
              landLeaderWon: 0, landLeaderKnown: 0, q6LeaderWon: 0, q6Known: 0,
              margin: 0, payouts: 0, lines: 0, potPerGame: 0 };
  for (let seed = 1; seed <= GAMES; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    if (st.players.length !== seats) continue;
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

    /* standings at the halfway mark, off the quarter marker in the log */
    const snap = {};
    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      const m = /Year \d+, Quarter (\d+)/.exec(logText(msg));
      if (m) snap[parseInt(m[1], 10)] = st.players.map((p) => ({ id: p.id, ep: E.epTotal(p) }));
    });
    if (st.phase !== "gameover") continue;
    T.games++;

    const ranked = [...st.players].sort(E.finalRank);
    const win = ranked[0];
    T.margin += E.epTotal(ranked[0]) - E.epTotal(ranked[1] || ranked[0]);

    let pot = 0;
    for (const p of st.players) {
      T.seats++;
      const tot = E.epTotal(p);
      let land = 0;
      for (const e of (p.epLog || [])) {
        if (!LAND_LABELS.has(String(e.label))) continue;
        land += e.amount; pot += e.amount; T.lines++; T.payouts += e.amount;
      }
      T.allLand += land; T.allTot += tot;
      if (p.id === win.id) { T.winLand += land; T.winTot += tot; }
    }
    T.potPerGame += pot;

    /* did the seat holding the most ground at the end win the game? */
    const best = Math.max(...st.players.map((p) => E.plotCount(st, p)));
    const leaders = st.players.filter((p) => E.plotCount(st, p) === best);
    if (leaders.length === 1) {
      T.landLeaderKnown++;
      if (leaders[0].id === win.id) T.landLeaderWon++;
    }

    const s6 = snap[6];
    if (s6) {
      const sorted = [...s6].sort((a, b) => b.ep - a.ep);
      const top = sorted[0].ep;
      const tied = sorted.filter((x) => x.ep === top);
      if (tied.length === 1) { T.q6Known++; if (tied[0].id === win.id) T.q6LeaderWon++; }
    }
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const W = 10;

console.log("Entrepreneurs - should the land award step, or scale?");
console.log(`${GAMES} games per schedule per table size, personas on, same seeds throughout.\n`);
for (const s of SCHEDULES) {
  console.log(`  ${pad(s.key, 9)} ` + SIZES.map((z) => rp(`${z}p:${s.sole[z]}`, 8)).join("")
    + `   ${s.note}`);
}
console.log("  a tie pays 40% of the sole rate, three or more 20%\n");

const R = {};
for (const sched of SCHEDULES) {
  const E = engineFor(sched);
  for (const z of SIZES) R[`${sched.key}|${z}`] = measure(E, z);
}

function table(title, fn, dp = 0, suffix = "") {
  console.log("=".repeat(34 + W * SIZES.length));
  console.log(title);
  console.log(pad("", 34) + SIZES.map((z) => rp(`${z}p`, W)).join(""));
  for (const sched of SCHEDULES) {
    console.log(pad("  " + sched.key, 34)
      + SIZES.map((z) => rp(fn(R[`${sched.key}|${z}`]).toFixed(dp) + suffix, W)).join(""));
  }
  console.log("");
}

table("LAND AS A SHARE OF A WINNING SCORE  <- the one to flatten",
  (T) => 100 * T.winLand / Math.max(1, T.winTot), 0, "%");
table("the same, across every seat",
  (T) => 100 * T.allLand / Math.max(1, T.allTot), 0, "%");
table("total land EP paid out per game",
  (T) => T.potPerGame / Math.max(1, T.games), 1);

console.log("=".repeat(34 + W * SIZES.length));
console.log("DOES THE LAND LEADER WIN?  chance is 1/n, shown first");
console.log(pad("", 34) + SIZES.map((z) => rp(`${z}p`, W)).join(""));
console.log(pad("  chance", 34) + SIZES.map((z) => rp(`${(100 / z).toFixed(0)}%`, W)).join(""));
for (const sched of SCHEDULES) {
  console.log(pad("  " + sched.key, 34) + SIZES.map((z) => {
    const T = R[`${sched.key}|${z}`];
    const pc = 100 * T.landLeaderWon / Math.max(1, T.landLeaderKnown);
    const chance = 100 / z;
    return rp(`${pc.toFixed(0)}%${pc >= chance ? "" : " -"}`, W);
  }).join(""));
}
console.log("  a '-' marks a count where holding the most ground wins BELOW chance\n");

table("DOES THE GAME SETTLE?  Q6 leader went on to win",
  (T) => 100 * T.q6LeaderWon / Math.max(1, T.q6Known), 0, "%");
table("winner's margin over second (EP)",
  (T) => T.margin / Math.max(1, T.games), 1);
table("winning score",
  (T) => T.winTot / Math.max(1, T.games), 0);

/* The single number the question turns on: how much land's share MOVES across
   the table sizes. A step cannot make this small; that is the whole point. */
console.log("=".repeat(60));
console.log("SPREAD of land's share across the five table sizes");
console.log("  (max - min, in points of a winning score - smaller is flatter)");
for (const sched of SCHEDULES) {
  const shares = SIZES.map((z) => {
    const T = R[`${sched.key}|${z}`];
    return 100 * T.winLand / Math.max(1, T.winTot);
  });
  const spread = Math.max(...shares) - Math.min(...shares);
  console.log(`  ${pad(sched.key, 10)} ${rp(spread.toFixed(1), 6)} pts`
    + `   (${shares.map((x) => x.toFixed(0) + "%").join(" ")})`);
}
console.log("");
