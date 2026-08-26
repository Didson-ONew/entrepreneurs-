/* ============================================================================
   Entrepreneurs - where the game stands, at every table size.

   One full read of the shipped ruleset across 2, 3, 4, 5 and 6 seats. Six
   questions, all measured on the same games so the answers are consistent with
   each other:

     RUNAWAY LEADERS   does an early lead decide the game? Measured as the share
                       of games the halfway (Q6) leader goes on to win, against
                       the share pure chance would give that seat, plus how often
                       somebody from the bottom half at Q6 comes back to win, and
                       how the winner's margin over second place moves.

     INDUSTRIES        which of the six get built, and which turn up in the
                       winner's portfolio more often than they turn up at all.
                       The gap between those two numbers is the interesting one:
                       a popular industry that does not win is a trap.

     SCORE SPREAD      what a winning score looks like, what last place looks
                       like, and how wide the table finishes.

     BIGGEST SCORERS   which EP source actually pays. Every point in this game is
                       stamped with a label when it is banked, so this is a
                       direct read of p.epLog, not an inference.

     EARLY FINISHES    how often the game ends before Q12, and by which trigger.
                       The deadline (two Megacorps) calls the final quarter; the
                       twelve-quarter limit is the backstop.

     ECONOMY           the numbers that decide whether the box is the right size
                       for the count: discs in use, cards left, cash per seat,
                       and how much production had nowhere to go.

   HOW TO READ THE NUMBERS. Bots play every seat. They do not hoard, sandbag,
   bluff or misread a market, so every pressure here is a FLOOR - a table of
   people will press at least this hard. Two standard errors are printed for the
   rates that matter, and any gap smaller than that is not a finding.

   WHAT IT FOUND, over 250 games a table size
   ------------------------------------------------------------------------

   NO RUNAWAY PROBLEM, AND IT GETS BETTER AS THE TABLE GROWS. The share of
   games the Q6 leader goes on to win, against what chance alone would give:

                        2p    3p    4p    5p    6p
       Q6 leader won    65%   50%   35%   31%   20%
       chance           50%   33%   25%   20%   17%
       lift            1.3x  1.5x  1.4x  1.6x  1.2x

   A halfway lead is worth something at every count, but never close to
   decisive - and at six seats it is barely better than a coin the size of the
   table. The sharper number is the wire-to-wire rate, leading at BOTH Q4 and
   Q8 and going on to win: 49% at two seats, then 28%, 16%, 14%, 11%. Holding
   a lead the whole way is a two-player phenomenon. From four seats up, three
   games in four are won by somebody who was not in front at both checkpoints.
   The winner's final margin shrinks the same way: 28.8 EP at two seats down to
   16.8 at six.

   NOBODY IS RUNNING AWAY, BUT NOBODY IS BEING DRAGGED BACK EITHER. The catch-
   up is structural, not rubber-banded: a seat in the bottom half at Q6 still
   wins 24-38% of the time at four seats and up, which is under the 50% that a
   coin would give the whole bottom half. That is the right shape - being
   behind is bad, it is just not fatal.

   TWO SEATS IS THE OUTLIER, AND IT IS THE COUNT TO WATCH. Highest leader
   persistence, biggest margin, most discs committed (10.6 of 12), least of the
   card supply used (25%), narrowest final spread (29 EP) and the widest
   industry imbalance. It works, but it is a different, tighter game than the
   one four to six players are playing.

   THE WINNING SCORE IS TWO THINGS: COMPANIES AND CASH. Share of the winner's
   points, stable across every table size:

       companies and upgrades   31-33%
       cash on hand             26-31%
       entering an industry     12-13%
       forming a Megacorp        7-13%   (rises with the count)
       land awards              18% -> 5% (FALLS hard with the count)
       Megacorp brand           2-5%
       Megacorp districts       1-4%

   Two findings hide in that table. CASH ON HAND IS ABOUT A THIRD OF EVERY
   WINNING SCORE, which is a great deal of weight for a rule that reads as a
   rounding-up of leftovers - a player who simply does not spend is scoring
   comparably to one who builds. And THE LAND AWARDS COLLAPSE AS THE TABLE
   GROWS, 18% of the winner's points at two seats to 5% at six, because the
   two 10 EP awards are a fixed prize split across more claimants while every
   other source scales with how much you do.

   THE INDUSTRIES ARE LEVEL AT A FULL TABLE AND SKEWED AT A SMALL ONE. Share
   of games the winner held that industry, best to worst:

       6 players   HO 54  HC 53  MA 49  RE 48  TE 45  UT 44   spread 10 pts
       4 players   HO 68  RE 56  HC 52  MA 49  UT 47  TE 43   spread 25 pts
       2 players   RE 64  HO 62  MA 56  HC 51  TE 36  UT 34   spread 30 pts

   Two standard errors is +/-6 points, so the six-seat spread is inside the
   noise - at a full table the six industries are genuinely interchangeable.
   At two seats Utilities and Technology are measurably weaker than Retail and
   Hospitality, and that gap is real. Both are the industries that want a big
   board and other people's demand to sell into; at two seats there is neither.

   EARLY FINISHES ARE A BIG-TABLE EVENT, WHICH IS WHAT THE RULE IS FOR.

       finished before Q12    10%    1%    8%   21%   36%
       deadline called        20%   16%   25%   54%   82%

   At six seats the deadline is called in four games out of five and lands
   early enough to actually shorten one in three. At three seats the game
   essentially always runs the full twelve quarters. The gap between the two
   rows is games where somebody's second Megacorp arrives in Q11 or Q12, so the
   final quarter it names is one the game was going to play anyway.

   Run: node audit_state_of_play.js [seeds]     (default 250 a table size)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "250", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* One hook, on the delivery that pays: it is the only place that knows how much
   production found a buyer and how much was recycled at $1. */
const NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!logic.includes(NEEDLE)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }
logic = logic.replace(NEEDLE,
  "  const leftover = Math.max(0, remaining);\n" +
  "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz));\n" +
  "  p.cash += earned + leftover * 1;");

/* Shape guards for everything this probe reads back out of the engine. */
for (const [what, needle] of [
  ["EP is labelled as it is banked", "p.epLog.push({ label, amount, quarter });"],
  ["the land awards are named", 'awardRanked(state, (p) => plotCount(state, p), "The Real-Estate Mogul", log);'],
  ["the deadline names a final quarter", "state.finalQuarter = Math.min(12, state.quarter + 1);"],
]) {
  if (!SRC.includes(needle)) { console.error(`the engine changed shape - ${what}`); process.exit(2); }
}

const econ = { recycled: 0, prod: 0, earned: 0 };
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
  sale: (earned, leftover, prod) => { econ.earned += earned; econ.recycled += leftover; econ.prod += prod; },
} };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    epTotal, finalRank, activeBiz, megacorpHQs, bizInd, discsFree, plotCount,
    INDUSTRIES, IND_NAME, DISCS_PER_PLAYER, BP_DATA };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const SIZES = [2, 3, 4, 5, 6];
/* Two standard errors on a rate, in percentage points. */
const se2 = (p, n) => (n > 0 ? 100 * 2 * Math.sqrt(Math.max(0, p * (1 - p)) / n) : 0);

/* Which bucket a banked EP line belongs to. The labels are written at the point
   the points are awarded, so this is the game's own accounting. */
function bucketOf(label) {
  if (label.startsWith("Company:")) return "Companies and upgrades";
  if (label.startsWith("Entered ")) return "Entering an industry";
  if (label.startsWith("Megacorp brand:")) return "Megacorp brand dividend";
  if (label.startsWith("Megacorp district:")) return "Megacorp districts";
  if (label.startsWith("Megacorp:")) return "Forming a Megacorp";
  if (label === "The Real-Estate Mogul" || label === "The Omnipresent") return "Land awards";
  if (label.startsWith("Cash on hand")) return "Cash on hand";
  if (label.startsWith("Unpaid loans")) return "Unpaid loans (penalty)";
  return "Other";
}
const BUCKETS = ["Companies and upgrades", "Entering an industry", "Land awards",
  "Forming a Megacorp", "Megacorp brand dividend", "Megacorp districts",
  "Cash on hand", "Unpaid loans (penalty)", "Other"];

const runs = [];
for (const seats of SIZES) {
  const T = {
    seats, games: 0,
    q6LeaderWon: 0, q6Known: 0, bottomHalfWon: 0, wireToWire: 0,
    leadOver2nd: 0, gapQ4: 0, gapQ8: 0, gapN: 0,
    winnerEP: 0, secondEP: 0, lastEP: 0, medianEP: 0, allEP: [], winnerEPs: [],
    endQuarter: 0, early: 0, byEndQ: {}, deadlineCalled: 0,
    launches: {}, winnerHas: {}, anyHas: {},
    epByBucket: {}, epWinnerByBucket: {}, epTotalAll: 0, epTotalWinner: 0,
    discsUsed: 0, discSamples: 0, discsNoneFree: 0, deckLeft: 0,
    endCash: 0, endPlayers: 0, prod: 0, recycled: 0, loans: 0,
  };
  E.INDUSTRIES.forEach((i) => { T.launches[i] = 0; T.winnerHas[i] = 0; T.anyHas[i] = 0; });
  BUCKETS.forEach((b) => { T.epByBucket[b] = 0; T.epWinnerByBucket[b] = 0; });

  for (let seed = 1; seed <= SEEDS; seed++) {
    econ.prod = econ.recycled = econ.earned = 0;
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;          // an all-bot table, as every probe here uses
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

    /* Standings are sampled at the quarter boundary, from the running EP bank -
       there is no vesting, so the bank IS the score at any moment. */
    const snap = {};
    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (!m) return;
      const q = parseInt(m[1], 10);
      snap[q] = st.players.map((p) => ({ id: p.id, ep: E.epTotal(p) }));
    });
    if (st.phase !== "gameover") continue;
    T.games++;

    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    const eps = st.players.map((p) => E.epTotal(p)).sort((a, b) => b - a);

    /* --- runaway leaders ------------------------------------------------- */
    const at = (q) => {
      const s = snap[q];
      if (!s) return null;
      return [...s].sort((a, b) => b.ep - a.ep);
    };
    const s6 = at(6);
    if (s6) {
      T.q6Known++;
      const top = s6[0].ep;
      const leaders = s6.filter((x) => x.ep === top);
      /* A shared lead is not a lead. Only count games where one seat was clear at
         Q6, or the "leader" is an artefact of everybody being on the same score. */
      if (leaders.length === 1) {
        if (leaders[0].id === winner.id) T.q6LeaderWon++;
        const half = Math.floor(s6.length / 2);
        const bottom = new Set(s6.slice(s6.length - half).map((x) => x.id));
        if (bottom.has(winner.id)) T.bottomHalfWon++;
      } else {
        T.q6Known--;   // undecided at halfway: not evidence either way
      }
    }
    const s4 = at(4), s8 = at(8);
    if (s4 && s4.length > 1) { T.gapQ4 += s4[0].ep - s4[1].ep; }
    if (s8 && s8.length > 1) { T.gapQ8 += s8[0].ep - s8[1].ep; T.gapN++; }
    if (s4 && s8 && s4[0].id === winner.id && s8[0].id === winner.id) T.wireToWire++;

    /* --- scores ---------------------------------------------------------- */
    T.winnerEP += eps[0];
    T.secondEP += eps.length > 1 ? eps[1] : eps[0];
    T.lastEP += eps[eps.length - 1];
    T.medianEP += eps[Math.floor(eps.length / 2)];
    T.leadOver2nd += eps[0] - (eps.length > 1 ? eps[1] : eps[0]);
    T.winnerEPs.push(eps[0]);
    eps.forEach((e) => T.allEP.push(e));

    /* --- how the game ended ---------------------------------------------- */
    const endQ = st.quarter;
    T.endQuarter += endQ;
    T.byEndQ[endQ] = (T.byEndQ[endQ] || 0) + 1;
    if (endQ < 12) T.early++;
    if (st.finalQuarter) T.deadlineCalled++;

    /* --- industries ------------------------------------------------------ */
    const winnerInds = new Set(E.activeBiz(winner).concat(E.megacorpHQs(winner)).map(E.bizInd));
    winnerInds.forEach((i) => { if (T.winnerHas[i] !== undefined) T.winnerHas[i]++; });
    const seenThisGame = {};
    for (const p of st.players) {
      for (const b of E.activeBiz(p).concat(E.megacorpHQs(p))) {
        const i = E.bizInd(b);
        if (T.launches[i] !== undefined) T.launches[i]++;
        seenThisGame[i] = true;
      }
    }
    Object.keys(seenThisGame).forEach((i) => { if (T.anyHas[i] !== undefined) T.anyHas[i]++; });

    /* --- where the points came from -------------------------------------- */
    for (const p of st.players) {
      for (const line of (p.epLog || [])) {
        const b = bucketOf(String(line.label));
        T.epByBucket[b] = (T.epByBucket[b] || 0) + line.amount;
        T.epTotalAll += line.amount;
        if (p.id === winner.id) {
          T.epWinnerByBucket[b] = (T.epWinnerByBucket[b] || 0) + line.amount;
          T.epTotalWinner += line.amount;
        }
      }
    }

    /* --- economy --------------------------------------------------------- */
    for (const ind of E.INDUSTRIES) T.deckLeft += (st.decks[ind] || []).length;
    for (const p of st.players) {
      T.endPlayers++;
      T.endCash += p.cash;
      T.loans += p.discsInBank;
      const free = E.discsFree(st, p);
      T.discsUsed += E.DISCS_PER_PLAYER - free;
      T.discSamples++;
      if (free <= 0) T.discsNoneFree++;
    }
    T.prod += econ.prod; T.recycled += econ.recycled;
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
const W = 12;
const head = () => console.log(pad("", 40) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const rule = (n = 40 + W * SIZES.length) => console.log("  " + "─".repeat(n - 2));
const row = (name, fn, dp = 1) => console.log(pad("  " + name, 40) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pctRow = (name, fn) => console.log(pad("  " + name, 40) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));
const cashRow = (name, fn) => console.log(pad("  " + name, 40) + runs.map((T) => rp(`$${fn(T).toFixed(0)}`, W)).join(""));

console.log("Entrepreneurs - the state of play");
console.log(`${SEEDS} games per table size, personas on, rules exactly as shipped.\n`);

console.log("=".repeat(40 + W * SIZES.length));
console.log("1. RUNAWAY LEADERS");
console.log("=".repeat(40 + W * SIZES.length));
head();
pctRow("Q6 leader went on to win", (T) => T.q6Known ? T.q6LeaderWon / T.q6Known : 0);
pctRow("  what chance alone would give", (T) => 1 / T.seats);
console.log(pad("  two standard errors on that", 40)
  + runs.map((T) => rp(`±${se2(T.q6Known ? T.q6LeaderWon / T.q6Known : 0, T.q6Known).toFixed(0)} pts`, W)).join(""));
pctRow("bottom half at Q6 still won", (T) => T.q6Known ? T.bottomHalfWon / T.q6Known : 0);
pctRow("led at Q4 AND Q8 and won", (T) => T.games ? T.wireToWire / T.games : 0);
row("winner's lead over 2nd (EP)", (T) => T.games ? T.leadOver2nd / T.games : 0);
row("lead of 1st over 2nd at Q4", (T) => T.gapN ? T.gapQ4 / T.gapN : 0);
row("lead of 1st over 2nd at Q8", (T) => T.gapN ? T.gapQ8 / T.gapN : 0);

console.log("\n" + "=".repeat(40 + W * SIZES.length));
console.log("2. FINAL SCORE DISTRIBUTION");
console.log("=".repeat(40 + W * SIZES.length));
head();
row("winning score", (T) => T.games ? T.winnerEP / T.games : 0, 0);
row("second place", (T) => T.games ? T.secondEP / T.games : 0, 0);
row("median seat", (T) => T.games ? T.medianEP / T.games : 0, 0);
row("last place", (T) => T.games ? T.lastEP / T.games : 0, 0);
row("spread, winner minus last", (T) => T.games ? (T.winnerEP - T.lastEP) / T.games : 0, 0);
const q = (arr, f) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
row("winning score, 10th percentile", (T) => q(T.winnerEPs, 0.1), 0);
row("winning score, 90th percentile", (T) => q(T.winnerEPs, 0.9), 0);
row("any seat, 10th percentile", (T) => q(T.allEP, 0.1), 0);
row("any seat, 90th percentile", (T) => q(T.allEP, 0.9), 0);

console.log("\n" + "=".repeat(40 + W * SIZES.length));
console.log("3. WHERE THE POINTS COME FROM  (share of the WINNER's total)");
console.log("=".repeat(40 + W * SIZES.length));
head();
for (const b of BUCKETS) {
  if (!runs.some((T) => Math.abs(T.epWinnerByBucket[b] || 0) > 0)) continue;
  pctRow(b, (T) => T.epTotalWinner ? (T.epWinnerByBucket[b] || 0) / T.epTotalWinner : 0);
}
console.log("\n  the same, across EVERY seat");
head();
for (const b of BUCKETS) {
  if (!runs.some((T) => Math.abs(T.epByBucket[b] || 0) > 0)) continue;
  pctRow(b, (T) => T.epTotalAll ? (T.epByBucket[b] || 0) / T.epTotalAll : 0);
}

console.log("\n" + "=".repeat(40 + W * SIZES.length));
console.log("4. INDUSTRIES");
console.log("=".repeat(40 + W * SIZES.length));
console.log("  Share of games the WINNER had a company in that industry.");
head();
for (const i of E.INDUSTRIES) pctRow(`${E.IND_NAME[i]} (${i})`, (T) => T.games ? T.winnerHas[i] / T.games : 0);
console.log(pad("  two standard errors on each", 40)
  + runs.map((T) => rp(`±${se2(0.5, T.games).toFixed(0)} pts`, W)).join(""));
console.log("\n  Companies built in that industry, per game, by the whole table.");
head();
for (const i of E.INDUSTRIES) row(`${E.IND_NAME[i]} (${i})`, (T) => T.games ? T.launches[i] / T.games : 0, 2);

console.log("\n" + "=".repeat(40 + W * SIZES.length));
console.log("5. HOW OFTEN THE GAME ENDS EARLY");
console.log("=".repeat(40 + W * SIZES.length));
head();
pctRow("finished before Q12", (T) => T.games ? T.early / T.games : 0);
console.log(pad("  two standard errors on that", 40)
  + runs.map((T) => rp(`±${se2(T.games ? T.early / T.games : 0, T.games).toFixed(0)} pts`, W)).join(""));
pctRow("deadline was called at all", (T) => T.games ? T.deadlineCalled / T.games : 0);
row("mean final quarter", (T) => T.games ? T.endQuarter / T.games : 0, 2);
console.log("\n  distribution of the final quarter");
const endQs = [...new Set(runs.flatMap((T) => Object.keys(T.byEndQ).map(Number)))].sort((a, b) => a - b);
head();
for (const eq of endQs) pctRow(`ended in Q${eq}`, (T) => T.games ? (T.byEndQ[eq] || 0) / T.games : 0);

console.log("\n" + "=".repeat(40 + W * SIZES.length));
console.log("6. ECONOMY SIZE");
console.log("=".repeat(40 + W * SIZES.length));
head();
row("discs in use per seat, of 12", (T) => T.discSamples ? T.discsUsed / T.discSamples : 0, 1);
pctRow("seats ending with no disc free", (T) => T.discSamples ? T.discsNoneFree / T.discSamples : 0);
row("Blueprint cards left, of 60", (T) => T.games ? T.deckLeft / T.games : 0, 1);
pctRow("  share of the card supply used", (T) => T.games ? 1 - (T.deckLeft / T.games) / 60 : 0);
cashRow("cash a seat ends with", (T) => T.endPlayers ? T.endCash / T.endPlayers : 0);
cashRow("cash on the table at the end", (T) => T.games ? T.endCash / T.games : 0);
row("unpaid loan discs per seat", (T) => T.endPlayers ? T.loans / T.endPlayers : 0, 2);
pctRow("production recycled at $1", (T) => T.prod ? T.recycled / T.prod : 0);

console.log("\n(Bots play every seat: they do not hoard, sandbag or misread a market, so");
console.log(" every pressure above is a floor, not a ceiling.)\n");
