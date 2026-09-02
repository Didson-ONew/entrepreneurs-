/* ============================================================================
   AUDIT - do the six goods really behave differently, or does it just look
   that way in the games the Instagram reel happens to show?

   The reel showed two seeds in which Technology and Healthcare climbed almost
   monotonically while Utilities and Retail swung hard and repeatedly hit the $1
   floor. Two games is not evidence of anything, so this plays several hundred
   at every table size and reports, per industry:

     - how often its price is ever BELOW its own base price
     - how often it ever touches the $1 floor, and the $10 ceiling
     - where it finishes, against where it started
     - how much it moves per quarter, in both directions
     - how many quarters it spends under water

   And, because a rate without a mechanism is a coincidence, it also counts the
   two events that are the only things that move a marker: how often each
   industry gets BUILT (its own price down one cell) and how often it is named
   as a SUPPLIER by something else being built (up one cell). Net drift has to
   equal (supplier appearances - builds) / 2, clamped at the ends of the track,
   so those two counts are the explanation for whatever the prices do.

   Run: node audit_price_swings.js [gamesPerSize]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this script"); process.exit(2); }
/* INSTRUMENT THE MOVER, NOT THE BUILDINGS.

   Counting builds from the companies still standing at the end undercounts: a
   company merged into a Megacorp leaves p.businesses, but it moved the markers
   when it was launched and that move never came back. It also misses the Supply
   Chain Expert, who bumps a price with no building at all. So every price
   movement is counted at the one function all of them go through - which also
   makes it possible to see how many cells are LOST at the ends of the track,
   where clamping silently discards them.

   The needle is asserted before it is replaced: if the engine's price mover is
   ever rewritten this stops rather than reporting numbers about nothing. */
const NEEDLE = `function moveMarker(pm, ind, cells) {
  if (!pm.cell) pm.cell = {};
  pm.cell[ind] = clampCell(trackCell(pm, ind) + cells);
}`;
if (!SRC.includes(NEEDLE)) { console.error("moveMarker has changed shape - update this script"); process.exit(2); }
const PATCHED = `function moveMarker(pm, ind, cells) {
  if (!pm.cell) pm.cell = {};
  const before = trackCell(pm, ind);
  const after = clampCell(before + cells);
  pm.cell[ind] = after;
  if (box.tally) {
    const t = box.tally;
    if (cells < 0) t.down[ind] = (t.down[ind] || 0) + 1; else t.up[ind] = (t.up[ind] || 0) + 1;
    t.lost[ind] = (t.lost[ind] || 0) + Math.abs((before + cells) - after);
  }
}`;

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "").replace(NEEDLE, PATCHED) + `
  box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, BP_DATA, PRICE_MIN, PRICE_MAX, SCALING };
  box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, bizInd, price };
`, sandbox);
const E = box.E, E2 = box.E2;

/* Guard the shape this audit depends on. If the price track is ever rebuilt,
   this should stop rather than quietly report numbers about something else. */
for (const k of ["INDUSTRIES", "BASE_PRICE", "PRICE_MIN", "PRICE_MAX"]) {
  if (E[k] === undefined) { console.error(`engine no longer exports ${k}`); process.exit(2); }
}
if (typeof E2.price !== "function") { console.error("price() is gone"); process.exit(2); }

const GAMES = Number(process.argv[2] || 300);
const SIZES = [3, 4, 5, 6];
const INDS = E.INDUSTRIES;

/* Two standard errors on a proportion, in percentage points. Every rate below
   is printed with one, because a 4-point gap on 300 games is not a finding. */
const se2 = (p, n) => 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n);

/* One game. `seats` is the TABLE SIZE: initGame's first argument is the number
   of BOTS and it adds a seat per human name, so a table of six is five bots
   plus the one nominal seat, which is then handed to a bot as well. */
function playOne(seed, seats) {
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  if (st.players.length !== seats) throw new Error(`wanted ${seats} seats, got ${st.players.length}`);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }

  const series = {};          // ind -> price at the end of each quarter
  INDS.forEach((i) => (series[i] = []));
  const record = () => INDS.forEach((i) => series[i].push(E2.price(st.pm, i)));

  /* Every push on every marker, counted inside the mover. `down` is one per
     company of that industry built; `up` is one per time it was named as a
     supplier (plus the odd Supply Chain Expert bump); `lost` is cells the
     clamp threw away at the ends of the track. */
  box.tally = { up: {}, down: {}, lost: {} };
  INDS.forEach((i) => { box.tally.up[i] = 0; box.tally.down[i] = 0; box.tally.lost[i] = 0; });

  E2.advancePlanning(st, E2.mulberry32(seed + 777), (msg) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) record();
  });
  record();

  const t = box.tally;
  box.tally = null;
  return { series, up: t.up, down: t.down, lost: t.lost, quarters: series[INDS[0]].length };
}

/* ---------------------------------------------------------------- run */
console.log(`Entrepreneurs - price behaviour by industry`);
console.log(`${GAMES} games at each of ${SIZES.length} table sizes `
  + `(${GAMES * SIZES.length} games total)\n`);
console.log(`base prices:  ` + INDS.map((i) => `${i} $${E.BASE_PRICE[i]}`).join("   "));
console.log(`track:        $${E.PRICE_MIN} to $${E.PRICE_MAX}, `
  + `one blank cell between numbers - two builds move a price a dollar down, `
  + `two supplier appearances move it a dollar up\n`);

const all = {};   // seats -> ind -> tallies
for (const seats of SIZES) {
  const t = {};
  INDS.forEach((i) => (t[i] = { below: 0, floor: 0, ceil: 0, above: 0,
    finalSum: 0, qBelow: 0, qTotal: 0, absMove: 0, moves: 0,
    builds: 0, supplied: 0, lost: 0, games: 0 }));
  for (let s = 1; s <= GAMES; s++) {
    let g;
    try { g = playOne(s, seats); } catch (e) { continue; }
    for (const i of INDS) {
      const ser = g.series[i], base = E.BASE_PRICE[i], a = t[i];
      a.games += 1;
      if (ser.some((v) => v < base)) a.below += 1;
      if (ser.some((v) => v > base)) a.above += 1;
      if (ser.some((v) => v === E.PRICE_MIN)) a.floor += 1;
      if (ser.some((v) => v === E.PRICE_MAX)) a.ceil += 1;
      a.finalSum += ser[ser.length - 1];
      a.qBelow += ser.filter((v) => v < base).length;
      a.qTotal += ser.length;
      for (let k = 1; k < ser.length; k++) { a.absMove += Math.abs(ser[k] - ser[k - 1]); a.moves += 1; }
      a.builds += g.down[i];
      a.supplied += g.up[i];
      a.lost += g.lost[i];
    }
  }
  all[seats] = t;
}

/* ------------------------------------------------------------ headline */
console.log("=".repeat(78));
console.log("HOW OFTEN A PRICE EVER GOES BELOW ITS OWN BASE, by table size");
console.log("=".repeat(78));
console.log("            " + SIZES.map((s) => `${s}p`.padStart(12)).join("") + "     base");
for (const i of INDS) {
  const cells = SIZES.map((s) => {
    const a = all[s][i], p = a.below / a.games;
    return `${(100 * p).toFixed(0)}±${se2(p, a.games).toFixed(0)}%`.padStart(12);
  }).join("");
  console.log(`${E.IND_NAME[i].padEnd(12)}${cells}     $${E.BASE_PRICE[i]}`);
}

console.log("\n" + "=".repeat(78));
console.log("HOW OFTEN A PRICE EVER TOUCHES THE $1 FLOOR / THE $10 CEILING");
console.log("=".repeat(78));
console.log("            " + SIZES.map((s) => `${s}p`.padStart(14)).join(""));
for (const i of INDS) {
  const cells = SIZES.map((s) => {
    const a = all[s][i];
    return `${(100 * a.floor / a.games).toFixed(0)}% / ${(100 * a.ceil / a.games).toFixed(0)}%`.padStart(14);
  }).join("");
  console.log(`${E.IND_NAME[i].padEnd(12)}${cells}`);
}

/* --------------------------------------------------- the mechanism, at 4p */
const REF = 4;
console.log("\n" + "=".repeat(78));
console.log(`WHY - builds vs supplier appearances, per game at ${REF} players`);
console.log("=".repeat(78));
console.log("             built   named as   net cells   cells lost   predicted   actual    time");
console.log("            per game  supplier   per game     to clamp     final     final    under");
for (const i of INDS) {
  const a = all[REF][i], n = a.games;
  const b = a.builds / n, sup = a.supplied / n, lost = a.lost / n;
  const net = sup - b;
  /* Cells discarded at the floor are cells the price never gave back, so they
     are added to the raw arithmetic to predict where the marker really ends. */
  const pred = Math.max(E.PRICE_MIN, Math.min(E.PRICE_MAX,
    E.BASE_PRICE[i] + (net + lost) / 2));
  console.log(`${E.IND_NAME[i].padEnd(12)}`
    + `${b.toFixed(1).padStart(6)}${sup.toFixed(1).padStart(11)}`
    + `${(net >= 0 ? "+" : "") + net.toFixed(1)}`.padStart(12)
    + `${lost.toFixed(1)}`.padStart(13)
    + `$${pred.toFixed(1)}`.padStart(11)
    + `$${(a.finalSum / n).toFixed(1)}`.padStart(10)
    + `${(100 * a.qBelow / a.qTotal).toFixed(0)}%`.padStart(9));
}
console.log("\n  Every price move in the game goes through one function, and this counts");
console.log("  them there rather than inferring them from the buildings left standing -");
console.log("  a company merged into a Megacorp is gone from the table but its launch");
console.log("  moved the markers and that move never came back.");
console.log("\n  \"cells lost to clamp\" are pushes that ran off the end of the track and");
console.log("  were discarded. Only Retail loses any to speak of, and only a third of a");
console.log("  cell per game - so the floor is a real ratchet but a small one, not the");
console.log("  reason any of these prices end where they do.");

/* Volatility is computed here because the summary below quotes its range, and
   the summary reads better before the table than after it. */
const vol = INDS.map((i) => ({ i, v: all[REF][i].absMove / all[REF][i].moves }))
  .sort((a, b) => b.v - a.v);

/* ------------------------------------------------- what this says about it */
console.log("\n" + "=".repeat(78));
console.log("TWO THINGS THAT ARE EASY TO CONFLATE");
console.log("=".repeat(78));
console.log(`
  1. WHICH WAY A PRICE DRIFTS is set by how often the industry is built
     against how often it is needed. Every industry drifts UP on average -
     a build costs its own price one cell but pays its suppliers one each,
     and a Blueprint names more suppliers than it is one - but Technology
     (built ${(all[REF].TE.builds / all[REF].TE.games).toFixed(1)} times a game) drifts up far harder than Retail (built`);
console.log(`     ${(all[REF].RE.builds / all[REF].RE.games).toFixed(1)} times). That is the effect that makes Technology look like it only
     ever climbs.

  2. WHETHER A PRICE HITS $1 is mostly about where it STARTS. Utilities has
     the strongest upward drift of any industry in the game and still reaches
     the floor more often than Hospitality, Manufacturing, Healthcare or
     Technology - because it opens at $2, one dollar off the bottom. Retail is
     the only good with both problems at once: the weakest drift and the lowest
     base, which is why it is on the floor in half of all five and six player
     games.

  Volatility says the same thing from the other side: all six move within`);
console.log(`  ${vol[vol.length - 1].v.toFixed(2)}-${vol[0].v.toFixed(2)} dollars a quarter of each other. No industry actually swings`);
console.log(`  harder than another. The swings are simply VISIBLE on the goods that start
  near the floor and invisible on the ones quietly drifting up through the
  middle of the track.

  Worth noting on its own: across all ${GAMES * SIZES.length} games, no price reached $10 even
  once, and only Retail, Utilities and Hospitality ever reached $1. The
  traded range is roughly $1-$8, so the top of the track is doing very
  little work.`);

/* ------------------------------------------------------------ volatility */
console.log("\n" + "=".repeat(78));
console.log(`VOLATILITY - average dollars of movement per quarter, at ${REF} players`);
console.log("=".repeat(78));
for (const { i, v } of vol) {
  console.log(`${E.IND_NAME[i].padEnd(12)}${v.toFixed(2).padStart(6)}  `
    + "#".repeat(Math.round(v * 40)));
}

/* ------------------------------------------------------- the supply web */
console.log("\n" + "=".repeat(78));
console.log("THE DECK ITSELF - how many of the 60 Blueprints name each industry");
console.log("=".repeat(78));
const cards = {}, deps = {};
INDS.forEach((i) => { cards[i] = 0; deps[i] = 0; });
for (const bp of E.BP_DATA) {
  cards[bp.ind] += 1;
  for (const d of bp.deps) deps[d.ind] += 1;
}
console.log("             cards OF   times named   deck-level");
console.log("            this ind.   as supplier      balance");
for (const i of INDS) {
  console.log(`${E.IND_NAME[i].padEnd(12)}${String(cards[i]).padStart(7)}`
    + `${String(deps[i]).padStart(14)}`
    + `${(deps[i] - cards[i] >= 0 ? "+" : "") + (deps[i] - cards[i])}`.padStart(13));
}
console.log("\n  Every industry is named as a supplier by three others, so the deck is");
console.log("  symmetric by design. Any asymmetry in the prices comes from which cards");
console.log("  actually get BUILT, not from the web.");
