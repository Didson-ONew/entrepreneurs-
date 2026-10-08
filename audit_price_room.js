/* ============================================================================
   HOW FAR AN INDUSTRY'S PRICE CAN FALL BEFORE IT STOPS PAYING, AND HOW FAR IT
   CAN RISE. The attribute the comparison table never had.

   A company built takes its own industry's price DOWN $1 and every supplier on
   its Blueprint UP $1. The track runs $2 to $12. So each industry has a budget
   of crowding it can absorb before a company there stops covering its bill, and
   a budget of other people's building it can collect on the way up. Neither
   number appeared on the eight-attribute table, and neither is a card number:
   both fall out of production, running cost and base price together.

   THE INTENDED SHAPE, which this audit exists to check: an industry that is
   cheap to enter should run out of room fast - two bumps and barely worth
   keeping - and one that needs real capital should be able to ride further down
   and still pay. Entry cost and price resilience should trade off.

   ON PAPER IT HALF DOES. Level 1, as it ships:

                        UT     RE     HO     MA     HC     TE
     entry cost        $15    $10    $10    $20    $20    $15
     base price         $4     $4     $5     $5     $6     $6
     margin a quarter  $12    $11     $9    $11     $7     $6
     what a bump costs  $4     $4     $3     $3     $2     $2
     lowest price that
       still pays       $2     $2     $3     $2     $3     $4
     BUMPS DOWN          2      2      2      3      3      2
       margin there     $4     $3     $3     $2     $1     $2
       share of base   33%    27%    33%    18%    14%    33%
     BUMPS UP            8      8      7      7      6      6
       margin at $12   $44    $43    $30    $32    $19    $18

   Three readings. The first is the intended shape; the other two are not.

   1. THE COUNT DOES FOLLOW ENTRY COST, weakly. Cheap and mid both get 2 bumps,
      dear gets 3, which is a correlation of +0.87 at level 1 and +0.73 at level
      3. So the rule is in the game - but 2 against 3 across a 2x range of entry
      cost is a thin lever, and it cannot tell a $10 industry from a $15 one.

   2. THE THINNESS IS BACKWARDS. At its last profitable price a cheap industry
      keeps 27-33% of its margin and an expensive one keeps 14-18%. Retail,
      which is the cheapest thing in the game to enter, reaches the floor after
      exactly two companies are built - and at the floor a level-1 Retail still
      earns $3 a quarter against a $10 setup. Three and a half quarters to pay
      back at the WORST price the game can give it. Healthcare, at twice the
      entry cost, is down to $1 a quarter at its own floor.

   3. THE UPSIDE IS AN AMPLIFIER, NOT A COUNTERWEIGHT. A bump is worth exactly
      one unit of production a quarter, so the industries with the most
      production collect the most from every supplier bump - and they also have
      the most room above them, because a low base price is a long way from the
      ceiling. Utilities and Retail get 8 bumps at $4 each; Healthcare and
      Technology get 6 at $2. At the top of the track a level-1 Retail earns
      $43 a quarter and a level-1 Technology $18.

   So the cheap industries run out of floor at the same rate, keep a bigger
   share of their margin when they get there, and have more than twice the
   ceiling. The count is doing what was asked. The money is not.

   WHY IT IS STRUCTURAL, which matters because it constrains the fix. Bumps down
   is base price minus break-even price, so the ceiling on it is base price
   itself: a $4 industry can never absorb more than 2 bumps, a $6 one never more
   than 4. And base price is set by production, because production times price is
   held near flat on purpose ($16/16/15/15/12/12) to keep gross revenue even. So:

     room to fall  <-  base price  <-  1 / production  ->  net income  ->  payback

   audit_setup finds that payback balance needs setup to follow net income,
   which means setup follows production, which means setup follows 1/base price
   - and the intended shape here needs setup to follow base price DIRECTLY. The
   two rules pull in opposite directions, and both are downstream of the single
   decision to hold production times price flat.

   WHICH IS WHY THE SETUP RE-ASSIGNMENT MAKES THIS WORSE. Under --flip the entry
   costs become UT/RE $20, HO/MA $15, HC/TE $10, so the industries with the most
   price room become the cheapest to enter and the ones with the least become
   the dearest - a clean inversion of the intended shape. Run with --flip to see
   the table re-scored.

   AND IN PLAY ALMOST NONE OF IT IS SPENT. 2000 games a seat count, demand as a
   rate, three players. A control block on disjoint seeds moves every figure
   below by at most 0.05 of a dollar or one percentage point.

                        UT     RE     HO     MA     HC     TE
     base price         $4     $4     $5     $5     $6     $6
     mean price       $4.84  $4.09  $5.31  $6.65  $7.17  $7.55
     quarters below
       its own base     26%    38%    31%     5%     7%     3%
     ever hits the
       $2 floor        10%    36%     7%     1%     0%     0%
     ever hits the
       $12 ceiling      0%     0%     0%     0%     0%     0%
     COMPANY-QUARTERS
       not covering
       their bill       0%     0%     1%     0%     0%     0%

   Nothing anywhere fails to pay. The budget of room to fall is a budget almost
   nobody draws on, and the one industry that does - Retail, at the floor in 36%
   of games, first reaching it in quarter 3 - still earns $3 a quarter there.

   THE REASON IS THE SUPPLIER GRAPH, NOT THE CARDS. Sixty card types carry 102
   supplier slots between them, so building the whole deck would apply $102 of UP
   pressure against $60 of DOWN. A level-1 card lists one supplier and is exactly
   price-neutral; a level-3 lists three and puts $2 NET INTO the city. The track
   is 1.7x inflationary by construction, and measured, every industry's net
   pressure is positive - from +$0.29 a game for Hospitality to +$2.11 for
   Technology. Every marker drifts up. Only an industry built well above its
   one-in-six share can fall at all, and today that is Retail and nearly nobody
   else: the deck is perfectly symmetric (ten cards each, seventeen supplier
   slots each), so the whole asymmetry in realised price is build share.

   WHICH MEANS THE INTENDED SHAPE IS ALREADY HERE AND TOOTHLESS. Crowding does
   punish the crowded industry - that is working. It just cannot push anything
   into a loss, because break-even sits so far below the floor. Retail breaks
   even at $1.25 against a $2 floor: no amount of crowding can make a level-1
   Retail unprofitable. The lever for "very little profitable at two bumps down"
   is not base price or setup, it is BREAK-EVEN, which is running cost divided by
   production. For a cheap industry to be barely worth keeping two bumps down,
   its break-even has to sit just under base minus two - Retail would need a
   running cost near $8 rather than $5.

   AND THE SETUP RE-ASSIGNMENT HELPS HERE, despite scoring -0.43 on the paper
   correlation. Under --flip the realised prices converge, $5.03..$7.13 against
   $4.09..$7.55, Retail's floor visits fall from 36% of games to 6%, and
   Healthcare spends 35% of its quarters below base against 7% - the first time
   it feels crowding at all. The paper correlation inverts on a quantity that
   only the over-built industry ever consumes, and the re-assignment spreads that
   consumption across all six instead of leaving Retail pinned at the bottom and
   the rest floating free. Four players is the same shape.

   Run: node audit_price_room.js [games a table size] [seats...] [arms...]
        --paper    the arithmetic above, every level, then stop
        --flip     score it against the setup re-assignment from audit_setup
        --flow     demand as a rate (see audit_demand_flow.js)
        --off N    start from seed N+1, for a same-rules control block
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "200", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];
const has = (f) => process.argv.includes(f);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
const need = (frag, what) => {
  if (!logic.includes(frag)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); }
};
need("const PRICE_MIN = 2, PRICE_MAX = 12;", "the price track");
need("const SUPPLIER_CELLS = 2, BUILT_CELLS = -2;", "the size of a price event");
need("const BASE_PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };", "the base prices");
const CARDS_RE = /const BP_DATA = (\[.*?\]);/s;
if (!CARDS_RE.test(logic)) { console.error("BP_DATA moved - update this probe"); process.exit(2); }

const IND = ["UT", "RE", "HO", "MA", "HC", "TE"];
const CARDS0 = JSON.parse(logic.match(CARDS_RE)[1]);
const PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };
const MIN = 2, MAX = 12;
const FLIP = { UT: [20, 35, 60], RE: [20, 35, 60], HO: [15, 25, 40], MA: [15, 25, 40], HC: [10, 15, 25], TE: [10, 15, 25] };
const card = (cs, i, l) => cs.find((c) => c.ind === i && c.lvl === l);

/* ---- the paper table ---- */
const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
function roomOf(cs, i, l) {
  const c = card(cs, i, l), base = PRICE[i];
  let lo = null;
  for (let x = MIN; x <= MAX; x++) if (c.prod * x - c.opex > 0) { lo = x; break; }
  return { base, lo, setup: c.setup, prod: c.prod, opex: c.opex,
    down: lo === null ? null : base - lo, up: MAX - base,
    mBase: c.prod * base - c.opex, mLo: lo === null ? null : c.prod * lo - c.opex, mTop: c.prod * MAX - c.opex };
}
function paperTable(cs, label) {
  console.log(`\n${label}`);
  for (const l of [1, 2, 3]) {
    const R = Object.fromEntries(IND.map((i) => [i, roomOf(cs, i, l)]));
    console.log(`\n  LEVEL ${l}` + " ".repeat(14) + IND.map((i) => rp(i, 9)).join(""));
    const row = (lab, f) => console.log("    " + pad(lab, 18) + IND.map((i) => rp(f(R[i]), 9)).join(""));
    row("entry cost", (x) => "$" + x.setup);
    row("base price", (x) => "$" + x.base);
    row("margin/q at base", (x) => "$" + x.mBase);
    row("a bump is worth", (x) => "$" + x.prod);
    row("lowest that pays", (x) => (x.lo === null ? "never" : "$" + x.lo));
    row("BUMPS DOWN", (x) => (x.down === null ? "0" : x.down));
    row("  margin there", (x) => (x.mLo === null ? "-" : "$" + x.mLo));
    row("  share of base", (x) => (x.mLo === null ? "-" : (100 * x.mLo / x.mBase).toFixed(0) + "%"));
    row("BUMPS UP", (x) => x.up);
    row("  margin at $12", (x) => "$" + x.mTop);
    /* does the room follow the money it costs to get in? */
    const xs = IND.map((i) => R[i].setup), ys = IND.map((i) => R[i].down || 0);
    const mx = xs.reduce((a, b) => a + b, 0) / 6, my = ys.reduce((a, b) => a + b, 0) / 6;
    let num = 0, dx = 0, dy = 0;
    for (let k = 0; k < 6; k++) { num += (xs[k] - mx) * (ys[k] - my); dx += (xs[k] - mx) ** 2; dy += (ys[k] - my) ** 2; }
    const r = dx && dy ? num / Math.sqrt(dx * dy) : 0;
    console.log(`    room against entry cost: r = ${r >= 0 ? "+" : ""}${r.toFixed(2)}   ` +
      (r > 0.5 ? "follows it, as intended" : r < -0.5 ? "RUNS AGAINST IT" : "no relationship"));
  }
}

function supplierCensus(cs) {
  console.log("\nWHO THE DECK MAKES A SUPPLIER, which is where the upward pressure comes from");
  const app = Object.fromEntries(IND.map((i) => [i, 0])), own = Object.fromEntries(IND.map((i) => [i, 0]));
  let deps = 0;
  for (const c of cs) { own[c.ind]++; for (const d of c.deps) { app[d.ind]++; deps++; } }
  console.log("  " + pad("", 26) + IND.map((i) => rp(i, 9)).join(""));
  console.log("  " + pad("card types in the deck", 26) + IND.map((i) => rp(own[i], 9)).join(""));
  console.log("  " + pad("times listed as a supplier", 26) + IND.map((i) => rp(app[i], 9)).join(""));
  console.log("  " + pad("  ratio, up-events per card", 26) + IND.map((i) => rp((app[i] / own[i]).toFixed(2), 9)).join(""));
  console.log(`\n  ${cs.length} card types carry ${deps} supplier slots between them, so building the whole deck`);
  console.log(`  would apply ${deps} dollars of UP pressure against ${cs.length} of DOWN. A level-1 card lists one`);
  console.log("  supplier and is price-neutral; a level-3 lists three and puts $2 net INTO the city.");
}

if (has("--paper")) {
  paperTable(CARDS0, "AS IT SHIPS");
  supplierCensus(CARDS0);
  paperTable(CARDS0.map((c) => ({ ...c, setup: FLIP[c.ind][c.lvl - 1] })),
    "SCORED AGAINST THE SETUP RE-ASSIGNMENT (--flip in audit_setup)");
  console.log("");
  process.exit(0);
}

/* ---- arms ---- */
/* The two pressures, counted where they are applied. An industry's price is
   (times built there) x -$1 plus (times it appeared as somebody's supplier) x +$1,
   clamped at both ends - so the budget of room to fall is only ever spent by the
   first of those, and only when it outruns the second. */
const ONLAUNCH = `function onLaunch(pm, ind, depInds) {
  moveMarker(pm, ind, BUILT_CELLS);
  depInds.forEach((d) => moveMarker(pm, d, SUPPLIER_CELLS));`;
need(ONLAUNCH, "the price event");
logic = logic.replace(ONLAUNCH, `function onLaunch(pm, ind, depInds) {
  __probe.push(ind, depInds);
  moveMarker(pm, ind, BUILT_CELLS);
  depInds.forEach((d) => moveMarker(pm, d, SUPPLIER_CELLS));`);

const CONSUME = `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`;
need(CONSUME, "the delivery rule");
if (has("--flow")) logic = logic.replace(CONSUME, "  return cross ? 1 : exchangeRate(state, biz);");
if (has("--flip")) {
  const cards = JSON.parse(logic.match(CARDS_RE)[1]);
  for (const c of cards) c.setup = FLIP[c.ind][c.lvl - 1];
  logic = logic.replace(logic.match(CARDS_RE)[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
}

/* ---- the probe: what price each industry ACTUALLY trades at, and whether the
   companies standing in it are covering their bill at that price. Read once a
   quarter off the bill, which is the one place every standing company is seen. */
const HOOK = ["the bills", "      const cost = supplierBill + rentBill;",
              "      const cost = supplierBill + rentBill;\n      __probe.bill(state, b, cost);"];
need(HOOK[1], HOOK[0]);
logic = logic.replace(HOOK[1], HOOK[2]);
/* Once a quarter, right before the clock moves on, read every marker. This is
   the one line the engine passes exactly once per quarter per game. */
const HOOK2 = ["the quarter advancing", "  state.quarter += 1;",
               "  __probe.prices(state);\n  state.quarter += 1;"];
need(HOOK2[1], HOOK2[0]);
if (logic.split(HOOK2[1]).length - 1 !== 1) { console.error("the quarter advances in more than one place now - update this probe"); process.exit(2); }
logic = logic.replace(HOOK2[1], HOOK2[2]);

const blank = () => ({ seen: Object.fromEntries(IND.map((i) => [i, { q: 0, sum: 0, floor: 0, atBase: 0, below: 0, above: 0, ceil: 0 }])),
  co: Object.fromEntries(IND.map((i) => [i, { q: 0, under: 0, thin: 0, margin: 0 }])),
  push: Object.fromEntries(IND.map((i) => [i, { built: 0, supplied: 0, lostToClamp: 0 }])),
  firstFloor: Object.fromEntries(IND.map((i) => [i, []])) });
const P = blank();
let seenFloorThisGame = {};
const probe = {
  prices: (state) => {
    for (const i of IND) {
      const pr = PRICEFN(state.pm, i), s = P.seen[i];
      s.q++; s.sum += pr;
      if (pr <= MIN) { s.floor++; if (!seenFloorThisGame[i]) { seenFloorThisGame[i] = true; P.firstFloor[i].push(state.quarter); } }
      if (pr >= MAX) s.ceil++;
      if (pr < PRICE[i]) s.below++; else if (pr > PRICE[i]) s.above++; else s.atBase++;
    }
  },
  push: (ind, deps) => { P.push[ind].built++; for (const d of deps) P.push[d].supplied++; },
  bill: (state, b, cost) => {
    const i = BIZIND(b), c = P.co[i];
    const earned = PRODFN(b) * PRICEFN(state.pm, i);
    c.q++; c.margin += earned - cost;
    if (earned - cost <= 0) c.under++;
    else if (earned - cost < 0.25 * (PRODFN(b) * PRICE[i] - cost)) c.thin++;
  },
};
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, Map, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES, price, bizInd, bizProd, BASE_PRICE };
`, sandbox);
const E = box.E;
const PRICEFN = E.price, BIZIND = E.bizInd, PRODFN = E.bizProd;

function run(seats) {
  const fresh = blank();
  for (const k of Object.keys(fresh)) P[k] = fresh[k];
  let games = 0;
  const OFF = (() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) : 0; })();
  for (let seed = 1 + OFF; seed <= GAMES + OFF; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    seenFloorThisGame = {};
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
  }
  return games;
}

console.log(`\n${GAMES} games a table size.  arms: ${["--flow", "--flip"].filter(has).join(" ") || "as it ships"}.` +
  `  A company built moves its own price -$1 and each supplier +$1; track $${MIN}..$${MAX}.`);
for (const seats of SIZES) {
  const games = run(seats);
  console.log(`\n${"=".repeat(88)}\n${seats} PLAYERS  -  ${games} games\n${"=".repeat(88)}`);
  console.log("  " + pad("", 30) + IND.map((i) => rp(i, 9)).join(""));
  const row = (lab, f) => console.log("  " + pad(lab, 30) + IND.map((i) => rp(f(P.seen[i], P.co[i], i), 9)).join(""));
  const pc = (a, b) => (b ? (100 * a / b).toFixed(0) + "%" : "-");
  console.log("  " + pad("WHERE THE MARKER ACTUALLY SITS", 30));
  row("  base price", (s, c, i) => "$" + PRICE[i]);
  row("  mean price over the game", (s) => "$" + (s.q ? (s.sum / s.q).toFixed(2) : "-"));
  row("  quarters below its base", (s) => pc(s.below, s.q));
  row("  quarters above its base", (s) => pc(s.above, s.q));
  row("  quarters at the $2 floor", (s) => pc(s.floor, s.q));
  row("  quarters at the $12 ceiling", (s) => pc(s.ceil, s.q));
  row("  games it ever hits the floor", (s, c, i) => pc(P.firstFloor[i].length, games));
  row("    first does, mean quarter", (s, c, i) => (P.firstFloor[i].length ? (P.firstFloor[i].reduce((a, b) => a + b, 0) / P.firstFloor[i].length).toFixed(1) : "-"));
  console.log("  " + pad("WHAT MOVED IT, A GAME", 30));
  const pu = (i) => P.push[i];
  const prow = (lab, f) => console.log("  " + pad(lab, 30) + IND.map((i) => rp(f(pu(i), i), 9)).join(""));
  prow("  companies built there  (-$1)", (x) => (x.built / games).toFixed(2));
  prow("  times it was a supplier (+$1)", (x) => (x.supplied / games).toFixed(2));
  prow("  net pressure a game", (x) => { const n = (x.supplied - x.built) / games; return (n >= 0 ? "+$" : "-$") + Math.abs(n).toFixed(2); });
  console.log("  " + pad("AND WHETHER IT STILL PAYS THERE", 30));
  row("  company-quarters seen", (s, c) => c.q);
  row("  margin a quarter, mean", (s, c) => "$" + (c.q ? (c.margin / c.q).toFixed(1) : "-"));
  row("  share NOT covering its bill", (s, c) => pc(c.under, c.q));
  row("  share on under a quarter of it", (s, c) => pc(c.thin, c.q));
}
console.log("");
