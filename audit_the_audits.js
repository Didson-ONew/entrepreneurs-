/* ============================================================================
   AUDIT THE AUDITS - are the simulations measuring the game, or measuring the
   particular robots that happen to be playing it?

   Every number in this repo comes from bots playing themselves. That is only
   worth anything if three things hold, and none of them had been checked:

     1. COMPOSITION. Who is actually at the table? An audit that always seats
        the same three policies is measuring those policies, not the game.

     2. STABILITY. Run the same measurement on a different set of seeds and does
        it land in the same place? If two runs of 400 diverge by more than the
        error bar says they should, the error bar is lying and every conclusion
        drawn from a single run is worth less than it looked.

     3. SENSITIVITY. If the roster changes, do the conclusions change? A finding
        that survives every roster is about the game. One that does not is about
        the robots, and must be reported that way or not at all.

   WHAT COMPOSITION FOUND, before any of the rest ran:

     initGame hands archetypes out by player id, in fixed order and never by
     chance - ARCHETYPES[(i - nHumans) % 5]. So a four-seat game is ALWAYS
     balanced, rush_cheap and upgrade_focus, on every seed ever run.

     Worse, every audit in this repo opens a game with one human name and then
     sets that player to isHuman=false to make it play itself. A human seat is
     built with `archetype: null`. So a quarter of every four-player table in
     every measurement so far has been a bot with NO archetype, taking the
     generic branch of every decision.

     And `tech_heavy` - an archetype that adds +2 to the score of every
     Technology launch - is the FOURTH in the list, so it only appears at five
     and six seats. Technology's price behaviour has therefore been measured
     with a Technology enthusiast at the table for the large games and none at
     the small ones. Any statement about Technology that does not say which is
     a statement about the roster.

   Run: node audit_the_audits.js [seedsPerBlock] [blocks]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PER = parseInt(process.argv[2] || "400", 10);
const BLOCKS = parseInt(process.argv[3] || "4", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, PRICE_MIN, PRICE_MAX, CASH_PER_EP,
            ARCHETYPES, PERSONAS };
  box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
             price, epTotal, finalRank, activeBiz, bizInd, megacorpHQs };
`, sandbox);
const E = box.E, E2 = box.E2;
const INDS = E.INDUSTRIES;
const se2 = (p, n) => (n ? 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n) : 0);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

/* ROSTERS. `default` is what every audit in this repo has actually run.
   `allBalanced` puts every seat on the same policy, which is the only way to
   ask what the RULES do rather than what the policies do. `shuffled` gives each
   seat a random archetype per game, which is the closest thing to "some mix of
   people you do not control". */
const ROSTERS = {
  default: null,
  allBalanced: () => "balanced",
  shuffled: (rng) => E.ARCHETYPES[Math.floor(rng() * E.ARCHETYPES.length)],
};

function playOne(seed, seats, roster) {
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  if (st.players.length !== seats) return null;
  st.players[0].isHuman = false;
  if (roster) {
    const rng = E2.mulberry32(seed * 7919 + 13);
    for (const p of st.players) p.archetype = roster(rng);
  }
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }

  const ser = {};
  INDS.forEach((i) => (ser[i] = []));
  const rec = () => INDS.forEach((i) => ser[i].push(E2.price(st.pm, i)));
  try {
    E2.advancePlanning(st, E2.mulberry32(seed + 777), (m) => {
      if (/^▶ Year \d+, Quarter \d+/.test(String(m))) rec();
    });
  } catch { return null; }
  rec();

  /* Companies standing at the end, by industry - the behaviour that drives the
     prices, so it has to be reported alongside them. */
  const built = {}, cash = [];
  INDS.forEach((i) => (built[i] = 0));
  for (const p of st.players) {
    for (const b of p.businesses) { const i = E2.bizInd(b); if (built[i] !== undefined) built[i]++; }
    cash.push(p.cash);
  }
  const eps = st.players.map((p) => E2.epTotal(p) + Math.floor(p.cash / E.CASH_PER_EP));
  return { ser, built, winnerEP: Math.max(...eps), quarters: ser[INDS[0]].length };
}

/* One block of seeds -> the metrics an audit would report from it. */
function block(lo, hi, seats, roster) {
  const belowN = {}, qBelow = {}, qTotal = {}, builtN = {};
  INDS.forEach((i) => { belowN[i] = 0; qBelow[i] = 0; qTotal[i] = 0; builtN[i] = 0; });
  let games = 0, winnerEP = 0;
  for (let s = lo; s <= hi; s++) {
    const g = playOne(s, seats, roster);
    if (!g) continue;
    games++;
    winnerEP += g.winnerEP;
    for (const i of INDS) {
      const v = g.ser[i];
      if (v.some((x) => x < E.BASE_PRICE[i])) belowN[i]++;
      qBelow[i] += v.filter((x) => x < E.BASE_PRICE[i]).length;
      qTotal[i] += v.length;
      builtN[i] += g.built[i];
    }
  }
  const out = { games, winnerEP: winnerEP / Math.max(1, games), below: {}, timeBelow: {}, built: {} };
  for (const i of INDS) {
    out.below[i] = belowN[i] / Math.max(1, games);
    out.timeBelow[i] = qBelow[i] / Math.max(1, qTotal[i]);
    out.built[i] = builtN[i] / Math.max(1, games);
  }
  return out;
}

/* ------------------------------------------------------------- 1. who plays */
console.log("Entrepreneurs - auditing the audits");
console.log(`${BLOCKS} disjoint blocks of ${PER} seeds, ${Object.keys(ROSTERS).length} rosters\n`);
console.log("=".repeat(78));
console.log("1. WHO IS ACTUALLY AT THE TABLE");
console.log("=".repeat(78));
console.log(`  the archetype list, in the order initGame hands it out:`);
console.log(`    ${E.ARCHETYPES.join(", ")}\n`);
for (const seats of [2, 3, 4, 5, 6]) {
  const a = E2.initGame(seats - 1, 1, ["Seat 1"], undefined, true, undefined);
  const b = E2.initGame(seats - 1, 999, ["Seat 1"], undefined, true, undefined);
  const fmt = (st) => st.players.map((p) => p.archetype || "(none)").join(", ");
  console.log(`  ${seats} seats  ${fmt(a)}`);
  if (fmt(a) !== fmt(b)) console.log(`           seed 999 differs: ${fmt(b)}`);
}
console.log(`
  Identical on every seed - the mix is a function of the player count alone.
  The "(none)" seat is the human slot the audits switch to bot control; a human
  is created with no archetype, so that bot takes the generic branch everywhere.
  tech_heavy, which adds +2 to every Technology launch, is fourth in the list
  and so only sits down at five and six seats.`);

/* --------------------------------------------------------- 2. does it hold */
console.log("\n" + "=".repeat(78));
console.log(`2. STABILITY - the same measurement on ${BLOCKS} disjoint blocks of ${PER} seeds`);
console.log("=".repeat(78));
console.log("   4 players, default roster. Each column is an independent run.\n");
const blocks = [];
for (let b = 0; b < BLOCKS; b++) blocks.push(block(b * PER + 1, (b + 1) * PER, 4, ROSTERS.default));

console.log("  ever below base, % of games");
console.log("              " + blocks.map((_, i) => `run ${i + 1}`.padStart(8)).join("")
  + "     spread   noise says");
for (const i of INDS) {
  const vals = blocks.map((b) => 100 * b.below[i]);
  const spread = Math.max(...vals) - Math.min(...vals);
  /* What the error bar predicts for the gap between the largest and smallest of
     BLOCKS independent estimates: roughly the range of that many draws, which
     for small counts is about 2-3 standard errors wide. Quote 2 SE on a single
     difference as the honest yardstick. */
  const expect = Math.sqrt(2) * se2(mean(vals) / 100, blocks[0].games);
  const flag = spread > expect * 1.25 ? "  WIDER" : "";
  console.log(`  ${E.IND_NAME[i].padEnd(12)}` + vals.map((v) => `${v.toFixed(0)}%`.padStart(8)).join("")
    + `${spread.toFixed(0)}pt`.padStart(11) + `±${expect.toFixed(0)}pt`.padStart(13) + flag);
}
{
  const eps = blocks.map((b) => b.winnerEP);
  console.log(`\n  winning score  ` + eps.map((v) => v.toFixed(0).padStart(8)).join("")
    + `     sd ${sd(eps).toFixed(1)} EP on a mean of ${mean(eps).toFixed(0)}`);
}
console.log(`
  A "WIDER" flag means two honest runs of the same measurement disagreed by more
  than the error bar allows for - which would mean the seeds are not
  interchangeable and single-run numbers cannot be trusted at face value.`);

/* ------------------------------------------------------ 3. does it survive */
console.log("\n" + "=".repeat(78));
console.log("3. SENSITIVITY - the same measurement under three different rosters");
console.log("=".repeat(78));
console.log("   4 players. Does the industry picture belong to the game or the bots?\n");
const R = {};
for (const [name, fn] of Object.entries(ROSTERS)) R[name] = block(1, PER * 2, 4, fn);
const names = Object.keys(ROSTERS);

console.log("  ever below its own base price, % of games");
console.log("              " + names.map((n) => n.padStart(13)).join(""));
for (const i of INDS) {
  console.log(`  ${E.IND_NAME[i].padEnd(12)}`
    + names.map((n) => `${(100 * R[n].below[i]).toFixed(0)}%`.padStart(13)).join(""));
}
console.log("\n  companies of that industry standing at the end, per game");
console.log("              " + names.map((n) => n.padStart(13)).join(""));
for (const i of INDS) {
  console.log(`  ${E.IND_NAME[i].padEnd(12)}`
    + names.map((n) => R[n].built[i].toFixed(1).padStart(13)).join(""));
}
console.log("\n  winning score " + names.map((n) => R[n].winnerEP.toFixed(0).padStart(13)).join(""));

/* --------------------------------------- 4. is the disparity a fairness one */
console.log("\n" + "=".repeat(78));
console.log("4. IS THE SPREAD A BALANCE PROBLEM?");
console.log("=".repeat(78));
console.log(`   Time below base is not by itself unfairness - it is what a good does when
   it is BUILT more often than it is needed. The test is whether the goods that
   spend their lives underwater are also the ones nobody wants to own.\n`);
console.log("              time below base    built per game    (default roster)");
const rows = INDS.map((i) => ({ i, t: R.default.timeBelow[i], b: R.default.built[i] }))
  .sort((a, b) => b.t - a.t);
for (const r of rows) {
  console.log("  " + E.IND_NAME[r.i].padEnd(14)
    + `${(100 * r.t).toFixed(0)}%`.padStart(8) + r.b.toFixed(1).padStart(18));
}
{
  /* Rank correlation between the two columns. If the goods that sit underwater
     are the goods everybody builds, the spread is players choosing, not the
     rules favouring. */
  const n = rows.length;
  const rt = rows.map((_, k) => k);
  const byBuilt = [...rows].sort((a, b) => b.b - a.b);
  const rb = rows.map((r) => byBuilt.indexOf(r));
  const d2 = rt.reduce((s, x, k) => s + (x - rb[k]) ** 2, 0);
  const rho = 1 - (6 * d2) / (n * (n * n - 1));
  console.log(`\n  rank correlation between the two columns: ${rho.toFixed(2)}`);
  console.log(rho > 0.6
    ? "  Strongly positive: the goods that sit below base are the goods the table\n"
      + "  keeps building. That is the price track doing its job - supply pushing a\n"
      + "  price down - rather than an industry being handed a worse deal."
    : rho < -0.3
    ? "  NEGATIVE: goods sit below base WITHOUT being built more, which would mean\n"
      + "  the rules and not the players are putting them there. That is a balance bug."
    : "  Weak: the two are not obviously linked, so neither story is supported and\n"
      + "  this needs a per-industry look at income rather than price alone.");
}
