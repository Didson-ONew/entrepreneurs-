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

   WHAT IT FOUND, over 100 games per schedule per table size
   ------------------------------------------------------------------------

   THE RAMP IS FIVE TIMES FLATTER THAN THE STEP. Spread of land's share of a
   winning score across the five table sizes, max minus min:

       step@4 (ships)   17.3 pts     20% 12% 29% 21% 17%
       step@5           13.5 pts     20% 12%  8% 21% 17%
       ramp              3.3 pts     20% 17% 19% 18% 17%
       scaled           18.6 pts     20% 26% 29% 33% 38%

   MOVING THE STEP TO FIVE PLAYERS IS WORSE THAN LEAVING IT. It does not remove
   the cliff, it deepens it: land falls to 8% of a winning score at four seats,
   and the seat holding the most ground wins 16% of the time against a 25%
   chance line. That is the only cell in the whole measurement that sits BELOW
   chance, and it is precisely the failure the doubling was introduced to fix -
   at the small rate, chasing land is a trap. Rule it out.

   SCALING FULLY OVERSHOOTS AND SETTLES THE GAME. Land reaches 38% of a winning
   score at six seats, the land leader wins 51% against a 17% chance line, the
   Q6 leader's win rate climbs from 40% to 62%, and the winner's margin goes
   from 19.0 to 27.4. A prize that big for a position held all game is a
   runaway. Rule it out too.

   THE RAMP PASSES BOTH GUARDS, AND IMPROVES THEM. The land leader wins at or
   above chance at every count (53/43/32/35/25 against 50/33/25/20/17). The game
   settles LESS than it does now, not more - the Q6 leader's win rate falls from
   64% to 46% at four seats and 42% to 36% at five. The winner's margin narrows
   slightly at every count. Winning scores barely move.

   SO THE BALANCE CASE IS SETTLED AND THE COST IS ELSEWHERE. The ramp is five
   numbers - 5/6/8/9/10 - where the step is two. On a printed card that is a
   small table instead of one sentence, and the playtest feedback on the
   physical game says rules clarity is already the weakest thing about it. This
   probe cannot weigh that. It can only say that if the award is allowed five
   values, the cliff disappears and nothing else gets worse.

   AND THE ONE-SENTENCE RAMP MEASURES THE SAME. "4 plus the number of players"
   gives 6/7/8/9/10 and was added afterwards. It differs from the ramp only at
   two and three seats, and on every number that matters it is the ramp:

                        spread   land share            land leader   Q6 leader
       ramp             3.3 pts  20 17 19 18 17        53 43 32 35 25   69 48 46 36 40
       n+4              4.4 pts  22 21 19 18 17        50 46 32 35 25   69 49 46 36 40
       chance line                                     50 33 25 20 17

   The 1.1 point gap in spread is not a finding. Two standard errors on a rate
   measured over 100 games is about +/-10 points, so 22 against 20 and 50
   against 53 are the same number twice. What IS visible is the SHAPE: n+4
   declines monotonically, 22/21/19/18/17, while the ramp dips at three seats
   and comes back up, 20/17/19/18/17. A rule whose weight falls smoothly as the
   table grows has a story - fewer people chasing the same ground - and the
   ramp's dip at three seats has none.

   So the recommendation is n+4, and it is a recommendation about TEACHING, not
   about balance: the balance case between the two is a tie, and one of them is
   a sentence while the other is a lookup table. The only place to watch is two
   seats, where n+4 lifts the award from 5 to 6 and the land leader wins exactly
   at chance rather than a whisker above it. If that matters, measure two-player
   games on their own at a few hundred games rather than trusting this row.

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
const NEEDLE = `const landAwardFor = (n) => {
  const sole = landAwardSole(n);
  return { sole, two: Math.max(1, Math.round(sole * 0.4)), many: Math.max(1, Math.round(sole * 0.2)) };
};`;
if (!BASE.includes(NEEDLE)) {
  console.error("landAwardFor changed shape - update this probe"); process.exit(2);
}

/* sole EP by head count. A tie pays 40% of it, three or more 20% - the ratios the
   shipped 5/2/1 and 10/4/2 already use, so `step@4` below IS the shipped rule. */
const SCHEDULES = [
  { key: "step@4", sole: { 2: 5, 3: 5, 4: 10, 5: 10, 6: 10 }, note: "the step this replaced" },
  { key: "step@5", sole: { 2: 5, 3: 5, 4: 5, 5: 10, 6: 10 }, note: "step moved one seat later" },
  { key: "ramp", sole: { 2: 5, 3: 6, 4: 8, 5: 9, 6: 10 }, note: "smooth, same endpoints" },
  /* The ramp with one sentence instead of a table: "the award is 4 plus the number
     of players". It differs from the ramp only at two seats, and a rule a teacher
     can say out loud is worth measuring separately from one they have to point at. */
  { key: "n+4", sole: { 2: 6, 3: 7, 4: 8, 5: 9, 6: 10 }, note: "4 plus the player count - WHAT SHIPS" },
  { key: "scaled", sole: { 2: 5, 3: 8, 4: 10, 5: 13, 6: 15 }, note: "2.5 EP a seat" },
];

function engineFor(sched) {
  const table = JSON.stringify(sched.sole);
  const repl = `const __SOLE_BY_SEATS = ${table};
const landAwardFor = (n) => {
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
