/* ============================================================================
   Is there actually a runaway-leader problem?

   Every catch-up mechanic proposed for this game so far has been argued from
   the winner's LEAD OVER LAST, which runs 47-58 EP on scores near 100 and looks
   alarming. But a big gap to last place is not a runaway - it is what happens
   when somebody plays badly, and no catch-up rule should be designed to rescue
   them. A runaway is something narrower and testable: THE GAME BEING DECIDED
   EARLY. If you can read the winner off the standings at the halfway mark, the
   back half of the game is ceremony.

   So this measures persistence, not spread:

     LEAD-TO-WIN, quarter by quarter. Who was top of the standings at the end of
     Q2, Q4, Q6, Q8, Q10 - and did they win? Read it against the chance line for
     that table size. A game with no persistence sits near chance early and
     climbs to 100% only at the very end. A runaway is already high by Q6.

     WIRE-TO-WIRE. How often the eventual winner led at every single checkpoint
     from Q6 on, never once surrendering the lead.

     LEAD CHANGES. How many times the top of the standings changes hands after
     the halfway mark. Zero means the second half decides nothing.

     RECOVERY. How often somebody in the bottom half at Q6 goes on to win, and
     how often the Q6 leader finishes outside the top two.

     THE GAP, in the two forms that matter: to SECOND (the real contest) and to
     LAST (the one that looks bad but usually is not).

   Standings are rebuilt from each player's EP log, which records the quarter
   every point was scored in, so a checkpoint is exactly what the table could
   have seen at the time. End-of-game awards land in the final quarter and are
   therefore correctly absent from every earlier checkpoint.

   WHAT IT FOUND, over 300 games a table size

   THERE IS NO RUNAWAY PROBLEM AT FOUR SEATS OR MORE, and the widely-quoted
   "winner leads last place by 47-58 EP" was never evidence of one. That is the
   gap to the WORST player. The gap to SECOND - the actual contest - is 16-18%
   of the winning score at four, five and six seats, which is an ordinary
   winning margin.

   Leading at the half is predictive, as it should be: the Q6 leader wins 29-63%
   against chance lines of 17-50%, a +12.6 to +19.1 point edge that is outside
   two standard errors at every table size. That is skill showing up in the
   standings, not a runaway. A game where the halfway leader wins no more often
   than anyone else would be a game where the first half does not matter.

   And the second half genuinely decides things:

     the Q6 leader finishes OUTSIDE THE TOP TWO in 35% of four-seat games, 44%
     of five-seat and 53% of six-seat games. At six players the halfway leader
     is more likely than not to end up third or worse.

     somebody from the BOTTOM HALF at Q6 wins 25-30% of the time at four seats
     and up.

     the lead changes hands 1.1-1.3 times after Q6, and the winner led at every
     checkpoint from Q6 in only 18-29% of games.

   THE ONE PLACE PERSISTENCE IS REAL IS THE TWO-PLAYER GAME: the Q6 leader wins
   63%, leads wire-to-wire 52% of the time, the lead changes 0.62 times, and the
   final gap is 29% of the score. But with two players "the leader usually wins"
   is close to a tautology, and the head-to-head is the format least in need of
   a rubber band.

   So a catch-up mechanic would be solving a problem the numbers do not show,
   and it would be spending the thing the game currently gets right - that being
   ahead at the half is worth something but settles nothing. Note also that the
   one catch-up-shaped change measured on this game BACKFIRED: paying the land
   awards every quarter instead of every year took leader-then-won from 49% to
   76%, because the player who is ahead is usually ahead on land too. Any
   proposal here should be measured against that precedent before it is built.

   Run: node audit_runaway.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    epTotal, finalRank, activeBiz, megacorpHQs, plotCount };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const CHECKS = [2, 4, 6, 8, 10];
const SIZES = [2, 3, 4, 5, 6];
const runs = [];

for (const seats of SIZES) {
  const T = {
    seats, games: 0,
    ledAndWon: Object.fromEntries(CHECKS.map((q) => [q, 0])),
    ledGames: Object.fromEntries(CHECKS.map((q) => [q, 0])),
    wireToWire: 0, leadChanges: 0, changeGames: 0,
    bottomHalfWon: 0, bottomHalfGames: 0,
    q6LeaderOutOfTop2: 0, q6Games: 0,
    gapSecond: 0, gapLast: 0, winnerEP: 0,
    gapSecondAt6: 0, spreadAt6: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;

    /* what the standings looked like at the close of quarter q */
    const standingsAt = (q) => st.players
      .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter <= q).reduce((s, e) => s + e.amount, 0) }))
      .sort((a, b) => b.ep - a.ep);

    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    const eps = ranked.map((p) => E.epTotal(p));
    T.winnerEP += eps[0];
    T.gapSecond += eps[0] - eps[1];
    T.gapLast += eps[0] - eps[eps.length - 1];

    for (const q of CHECKS) {
      if (q > st.quarter) continue;
      const board = standingsAt(q);
      if (board.length < 2 || board[0].ep === board[1].ep) continue;   // no clear leader
      T.ledGames[q]++;
      if (board[0].p === winner) T.ledAndWon[q]++;
    }

    /* wire to wire, and how often the top changes hands after the half */
    const late = CHECKS.filter((q) => q >= 6 && q <= st.quarter).map((q) => standingsAt(q)[0].p);
    if (late.length && late.every((p) => p === winner)) T.wireToWire++;
    if (late.length > 1) {
      T.changeGames++;
      let ch = 0;
      for (let i = 1; i < late.length; i++) if (late[i] !== late[i - 1]) ch++;
      if (late[late.length - 1] !== winner) ch++;   // and the final flip, if any
      T.leadChanges += ch;
    }

    /* recovery from the bottom half at the halfway mark */
    if (st.quarter >= 6) {
      const at6 = standingsAt(6);
      T.q6Games++;
      const half = Math.ceil(at6.length / 2);
      const bottom = at6.slice(half).map((x) => x.p);
      if (bottom.length) {
        T.bottomHalfGames++;
        if (bottom.includes(winner)) T.bottomHalfWon++;
      }
      if (ranked.indexOf(at6[0].p) > 1) T.q6LeaderOutOfTop2++;
      T.gapSecondAt6 += at6.length > 1 ? at6[0].ep - at6[1].ep : 0;
      T.spreadAt6 += at6.length > 1 ? at6[0].ep - at6[at6.length - 1].ep : 0;
    }
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - is the game decided early?");
console.log(`${SEEDS} games per table size, personas on, rules as they stand.\n`);

const W = 14;
const head = () => console.log(pad("", 40) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 40) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 40) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

console.log("LEADING AT THE CLOSE OF Q_, AND GOING ON TO WIN");
head();
console.log("─".repeat(40 + W * runs.length));
for (const q of CHECKS) {
  pct(`  led at Q${q}`, (T) => T.ledAndWon[q] / Math.max(1, T.ledGames[q]));
}
console.log(pad("  chance at this table size", 40) + runs.map((T) => rp(`${(100 / T.seats).toFixed(0)}%`, W)).join(""));

console.log("\nHOW SETTLED THE SECOND HALF IS");
head();
pct("  winner led at every check from Q6", (T) => T.wireToWire / Math.max(1, T.games));
row("  lead changes after Q6", (T) => T.leadChanges / Math.max(1, T.changeGames), 2);
pct("  bottom half at Q6 went on to win", (T) => T.bottomHalfWon / Math.max(1, T.bottomHalfGames));
pct("  Q6 leader finished outside top 2", (T) => T.q6LeaderOutOfTop2 / Math.max(1, T.q6Games));

console.log("\nTHE GAP, AT THE HALF AND AT THE END");
head();
row("  leader's gap to 2nd at Q6", (T) => T.gapSecondAt6 / Math.max(1, T.q6Games));
row("  winner's gap to 2nd at the end", (T) => T.gapSecond / Math.max(1, T.games));
row("  winner's gap to LAST at the end", (T) => T.gapLast / Math.max(1, T.games));
row("  winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
pct("  gap to 2nd as a share of the score", (T) => T.gapSecond / Math.max(1, T.winnerEP));

console.log("\nIS THE Q6 SIGNAL REAL, OR IS IT NOISE?");
for (const T of runs) {
  const n = T.ledGames[6], r = T.ledAndWon[6] / Math.max(1, n), c = 1 / T.seats;
  const band = noise(c, n);
  const d = 100 * (r - c);
  console.log(`  ${T.seats} players   ${n} games with a clear Q6 leader   `
    + `${(100 * r).toFixed(1)}% vs ${(100 * c).toFixed(1)}% chance   `
    + `${d >= 0 ? "+" : ""}${d.toFixed(1)}   `
    + `${Math.abs(d) > band ? `OUTSIDE THE NOISE (±${band.toFixed(1)})` : `inside the noise (±${band.toFixed(1)})`}`);
}
console.log("");
