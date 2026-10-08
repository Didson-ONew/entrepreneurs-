/* ============================================================================
   SETUP COST IS TWO THIRDS OF THE INDUSTRY IMBALANCE, AND IT IS ON THE CARDS.

   audit_industries measures Retail earning 5 to 8 times what Healthcare earns
   per dollar of setup, and audit_demand_table rules the demand board out as the
   cause. Most of what is left is visible on the eighteen card types without
   simulating anything, and one re-assignment of numbers the game already prints
   takes the measured spread from 4.2x to 2.7x. The rest is not a card number at
   all - it is the difference between a company that stacks upwards and one that
   has to spread sideways - and the last section is about that.

   GROSS REVENUE IS ALREADY FLAT BY CONSTRUCTION. Production falls as the price
   rises, and the two very nearly cancel:

     production    UT 4   RE 4   HO 3   MA 3   HC 2   TE 2
     base price    $4     $4     $5     $5     $6     $6
     gross a qtr   $16    $16    $15    $15    $12    $12      1.33x, top to bottom

   That is clearly deliberate and it works. Subtract the running cost and it is
   still close: net $12 / $11 / $9 / $11 / $7 / $6, a 2.0x spread.

   AND THEN SETUP RUNS THE OTHER WAY.

     setup, L1     $15    $10    $10    $20    $20    $15
     PAYBACK       1.25q  0.91q  1.11q  1.82q  2.86q  2.50q    3.14x

   Retail has the joint highest net income in the game and the joint lowest
   entry cost. Healthcare has the lowest net income and the joint highest entry
   cost. The two attributes are anti-correlated, so their ratio spans 3.14x at
   level 1, 3.58x at level 2 and 3.53x at level 3 - and that ratio is what a
   player is actually choosing between when they look at a hand of Blueprints.

   PAYBACK PREDICTS THE MEASURED ORDER ALMOST EXACTLY. Paper payback, best
   first, against the net cash per dollar of setup audit_industries measures:

     paper      RE 0.91  HO 1.11  UT 1.25  MA 1.82  TE 2.50  HC 2.86
     measured   RE 8.36  HO 4.98  UT 3.34  MA 2.45  HC 1.66  TE 1.57

   The first four are in the same order; HC and TE swap at the bottom and sit
   inside each other's noise. One paper ratio, computable in a spreadsheet,
   accounts for the whole ladder.

   WHY IT WAS MISSED. The eight-attribute comparison table the retune was built
   against lists entry cost, running cost, production and price as four SEPARATE
   attributes, each balanced two-Good two-Average two-Bad. A table can be
   perfectly balanced that way and barely move payback. Proposal P1 re-pairs
   setup and opex to make every industry's weight zero, and its payback spread
   is 2.50x at level 1 and 3.03x at worst - against a shipped 3.14x and 3.58x.
   Three quarters of the imbalance survives a table that scores as balanced,
   because a ratio of two balanced attributes is not itself balanced. Payback
   was never a row on the table: it is not an attribute, it is two of them
   divided.

   THE FIX NEEDS NO NEW NUMBERS. The game already prints three clean setup
   ladders plus one stray. Re-assign them so the ladder tracks net income
   instead of opposing it, and the stray ($15/20/30, Utilities only) disappears:

                  today            re-assigned
     UT, RE       15/20/30, 10/15/25   ->  20/35/60      (dear)
     HO, MA       10/15/25, 20/35/60   ->  15/25/40      (mid)
     HC, TE       20/35/60, 15/25/40   ->  10/15/25      (cheap)

   Payback spread falls from 3.14x to 1.33x at level 1 and from 3.58x to 1.63x
   at worst. Total money printed across the eighteen card types moves by $15,
   from $475 to $490. The attribute goes from four values to three, with the
   industry pairs intact. On the eight-axis table the weights go from
   +4 +2 +1 +1 -3 -4 to +3 0 0 +2 -1 -3.

   SEARCHING THE LADDER VALUES TOO buys 0.03x and costs two things that matter.
   Over every ladder on multiples of 5 (--search) the best reachable worst-level
   spread is 1.30x, at 30/35/40, 25/30/35 and 15/20/25. Those ladders barely
   rise, so a level 3 costs a third more than a level 1 and "size pays late"
   stops being true. And their cheapest level 1 is $15 against a last seat that
   starts on $16, which leaves that seat no money for the plot under it. 1.63x
   for no new numbers beats 1.30x for a flatter game and a stranded last seat.

   MEASURED, IT IS WORTH MORE THAN THE ARITHMETIC PROMISED. 2000 games a seat
   count, demand-as-a-rate in every arm, EP valued at $50. The figure is an
   industry's WHOLE ledger across the table divided by games - cash in, less
   bills, less outlay, plus EP - because a per-company figure is confounded the
   moment an arm changes how often something gets built.

     net value a game, 3 players
       shipped    UT 609   RE 1876   HO 1503   MA 615   HC  953   TE 443   4.23x
       --flip     UT 602   RE 1243   HO 1157   MA 656   HC 1522   TE 557   2.73x
     net value a game, 4 players
       shipped    UT 887   RE 2582   HO 2137   MA 907   HC 1493   TE 691   3.74x
       --flip     UT 868   RE 1904   HO 1716   MA 972   HC 2201   TE 817   2.69x

   The same rules on a disjoint block of 2000 seeds move each of those figures
   by at most 30, so every change above is real. Retail's contribution falls by
   a third and Healthcare's rises by 60%, at both counts.

   WHAT ELSE MOVES, all at three players:

     when it gets built    RE quarter 3.3 and HC 7.3, a 2.21x spread, becomes
                           5.0 to 5.8 across all six - a 1.16x spread. Retail
                           stops being the automatic first build and Healthcare
                           stops being the thing you do in year three.
     how often             2.39x spread to 1.83x. RE 2.18 a game to 1.54,
                           HC 1.50 to 2.29.
     does it ever pay off  RE 89% against HC 48% becomes RE 75% against HC 68%.
                           This is the payback claim landing: the paper spread
                           was in WHETHER a company clears its outlay, not in
                           how long the ones that clear it take.

   AND IT OVERSHOOTS, mildly. Healthcare ends the top industry, 1.22x ahead of
   Retail. That is a far smaller lead than the 1.97x Retail holds over
   Healthcare today, and the price track pushes back on it - every Healthcare
   built drops Healthcare's price - but it is a new leader, not a flat field.

   THE SEARCHED OPTIMUM IS A WARNING ABOUT MY OWN OBJECTIVE. --flat has the
   better paper number, 1.30x against 1.63x, and a slightly better net value a
   game, 2.54x against 2.73x. It is still the wrong change:

     - per company it is WORSE than shipped, 2.11x against 1.95x, and it leaves
       Retail higher than --flip does (1364 against 1243) - the actual complaint
     - its ladders barely rise, so a level 3 costs a third more than a level 1.
       Scale is exactly where Retail's advantage lives, so a compressed ladder
       hands the biggest companies the cheapest entry and "size pays late",
       which the whole scoring design rests on, stops being true
     - its cheapest level 1 is $15 and the last seat starts on $16, leaving that
       seat nothing for the plot underneath it
     - it needs three new ladders; --flip needs none

   The lesson for the next retune: the LEVEL of a ladder is the lever on entry
   advantage and the STEEPNESS is the lever on scale advantage. Optimising
   payback level by level cannot see the second one, because it treats each
   level as a separate decision when a player is choosing a path.

   WHAT SETUP CANNOT FIX, WHICH IS THE NEXT LEVER. Split the six industries by
   how a company GROWS instead of by what it costs. A vertical company stacks on
   one plot at every level; a horizontal one needs a plot for every level, so it
   buys more land, spends more ownership discs and has to find adjacent space.
   Measured, they stand on 1.02 plots against 1.57. Grouped that way, at three
   players:

                        net value a game        spread inside the group
       shipped   V  RE HO HC   $1444                  1.97x
                 H  UT MA TE   $ 556                  1.39x      V/H 2.60x
       --flip    V  RE HO HC   $1307                  1.32x
                 H  UT MA TE   $ 605                  1.18x      V/H 2.16x

   Four players is the same shape: within-vertical 1.73x to 1.28x, V/H 2.50x to
   2.19x. The three best industries are the three vertical ones and the three
   worst are the three horizontal ones, before the change and after it.

   So the re-assignment very nearly finishes the job it can do - the spread
   INSIDE each architecture falls to 1.32x and 1.18x - and barely touches the
   one it cannot. Setup cost explained the imbalance between industries that
   grow the same way. The remaining 2.2x is the cost of growing sideways, and it
   is not printed on any card: it is plots, discs and adjacency. That is where
   to go next, and it should not be papered over inside the setup numbers,
   because doing so would un-balance payback and hide the cause.

   Run: node audit_setup.js [games a table size] [seats...] [arms...]
        --flip     the re-assignment above
        --flat     the searched optimum, 30/35/40 25/30/35 15/20/25
        --flow     demand as a rate (see audit_demand_flow.js)
        --tuned    + $65 an EP and the P1 ladders, to measure against the retune
        --off N    start from seed N+1, for a same-rules control block
        --paper    print the arithmetic and the ladder search, then stop
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

/* ---- the cards, and the paper arithmetic ---- */
const CARDS_RE = /const BP_DATA = (\[.*?\]);/s;
if (!CARDS_RE.test(logic)) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
need("const BASE_PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };", "the base prices");
need('const SCALING = { UT: "H", MA: "H", TE: "H", RE: "V", HO: "V", HC: "V" };', "the growth directions");
const CARDS0 = JSON.parse(logic.match(CARDS_RE)[1]);
const IND = ["UT", "RE", "HO", "MA", "HC", "TE"];
const PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };
const card = (cs, i, l) => cs.find((c) => c.ind === i && c.lvl === l);
const netQ = (cs, i, l) => { const c = card(cs, i, l); return c.prod * PRICE[i] - c.opex; };
const ladderOf = (cs, i) => [1, 2, 3].map((l) => card(cs, i, l).setup);

/* the three ladders the game already prints, re-assigned to follow net income */
const FLIP  = { UT: [20, 35, 60], RE: [20, 35, 60], HO: [15, 25, 40], MA: [15, 25, 40], HC: [10, 15, 25], TE: [10, 15, 25] };
const FLAT  = { UT: [30, 35, 40], RE: [30, 35, 40], HO: [25, 30, 35], MA: [25, 30, 35], HC: [15, 20, 25], TE: [15, 20, 25] };
/* the P1 pairing the eight-axis retune proposed, for the comparison */
const P1_SETUP = { UT: [15, 25, 40], RE: [10, 15, 25], HO: [10, 15, 25], MA: [20, 35, 60], HC: [20, 35, 60], TE: [15, 25, 40] };
const P1_OPEX  = { UT: [5, 9, 14],  RE: [6, 10, 16], HO: [6, 10, 16], MA: [4, 7, 10], HC: [4, 7, 10], TE: [5, 9, 14] };

const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
function paper(cs, label) {
  const lad = Object.fromEntries(IND.map((i) => [i, ladderOf(cs, i)]));
  const out = [`\n  ${label}`];
  out.push(`    ladders  ${IND.map((i) => `${i} ${lad[i].join("/")}`).join("   ")}`);
  let worst = 0;
  for (let l = 1; l <= 3; l++) {
    const q = IND.map((i) => lad[i][l - 1] / netQ(cs, i, l));
    const sp = Math.max(...q) / Math.min(...q); worst = Math.max(worst, sp);
    out.push(`    L${l} payback  ${IND.map((i, n) => `${i} ${q[n].toFixed(2)}`).join("  ")}   ${sp.toFixed(2)}x`);
  }
  const total = IND.reduce((s, i) => s + lad[i].reduce((a, b) => a + b, 0), 0);
  out.push(`    worst-level spread ${worst.toFixed(2)}x   -   $${total} printed across the 18 card types   -   cheapest level 1 $${Math.min(...IND.map((i) => lad[i][0]))}`);
  console.log(out.join("\n"));
  return worst;
}

if (has("--paper")) {
  console.log("\nGROSS REVENUE A QUARTER, at base price - production and price nearly cancel");
  console.log("  " + pad("", 12) + IND.map((i) => rp(i, 8)).join(""));
  const prow = (lab, f, d = 0) => console.log("  " + pad(lab, 12) + IND.map((i) => rp(typeof f(i) === "number" ? f(i).toFixed(d) : f(i), 8)).join(""));
  prow("production", (i) => card(CARDS0, i, 1).prod);
  prow("base price", (i) => "$" + PRICE[i]);
  prow("gross/q", (i) => "$" + card(CARDS0, i, 1).prod * PRICE[i]);
  prow("opex", (i) => "$" + card(CARDS0, i, 1).opex);
  prow("net/q", (i) => "$" + netQ(CARDS0, i, 1));
  const g = IND.map((i) => card(CARDS0, i, 1).prod * PRICE[i]), n = IND.map((i) => netQ(CARDS0, i, 1));
  console.log(`\n  gross spans ${(Math.max(...g) / Math.min(...g)).toFixed(2)}x, net ${(Math.max(...n) / Math.min(...n)).toFixed(2)}x - and then setup runs the other way:`);
  paper(CARDS0, "AS IT SHIPS");
  paper(CARDS0.map((c) => ({ ...c, setup: P1_SETUP[c.ind][c.lvl - 1], opex: P1_OPEX[c.ind][c.lvl - 1] })),
        "P1, the eight-axis retune - balanced on paper, unchanged here");
  paper(CARDS0.map((c) => ({ ...c, setup: FLIP[c.ind][c.lvl - 1] })), "RE-ASSIGNED (--flip) - the same three ladders, following net income");
  paper(CARDS0.map((c) => ({ ...c, setup: FLAT[c.ind][c.lvl - 1] })), "THE SEARCHED OPTIMUM (--flat) - best on multiples of 5, at the cost of the level curve");

  /* The claim that no ladder on multiples of 5 beats 1.30x is checked rather
     than remembered, but 608 candidates in each of three slots is 225 million
     triples, so it waits for --search and prunes on the best found so far.
     Slot k always takes pair k: the ladder VALUES are free, so every assignment
     is already covered by relabelling them. */
  if (has("--search")) {
    const vals = (lo, hi, st) => { const o = []; for (let v = lo; v <= hi; v += st) o.push(v); return o; };
    const ladders = [];
    for (const a of vals(5, 30, 5)) for (const b of vals(10, 60, 5)) for (const c of vals(15, 100, 5)) if (b > a && c > b) ladders.push([a, b, c]);
    const PAIRS = [["UT", "RE"], ["HO", "MA"], ["HC", "TE"]];
    const N = ladders.length;
    /* per pair, per ladder, per level: the shortest and longest payback of the two */
    const lo3 = [], hi3 = [];
    for (let k = 0; k < 3; k++) {
      const a = new Float64Array(N * 3), b = new Float64Array(N * 3);
      for (let j = 0; j < N; j++) for (let l = 0; l < 3; l++) {
        const q = PAIRS[k].map((i) => ladders[j][l] / netQ(CARDS0, i, l + 1));
        a[j * 3 + l] = Math.min(...q); b[j * 3 + l] = Math.max(...q);
      }
      lo3.push(a); hi3.push(b);
    }
    let bw = Infinity, ba = -1, bb = -1, bc = -1;
    const mn = new Float64Array(3), mx = new Float64Array(3);
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      let skip = false;
      for (let l = 0; l < 3; l++) {
        if (ladders[x][l] === ladders[y][l]) { skip = true; break; }
        mn[l] = Math.min(lo3[0][x * 3 + l], lo3[1][y * 3 + l]);
        mx[l] = Math.max(hi3[0][x * 3 + l], hi3[1][y * 3 + l]);
      }
      if (skip) continue;
      /* two pairs already out of reach can never be rescued by the third, which
         can only widen the band */
      let partial = 0;
      for (let l = 0; l < 3; l++) partial = Math.max(partial, mx[l] / mn[l]);
      if (partial >= bw) continue;
      for (let z = 0; z < N; z++) {
        let w = 0, ok = true;
        for (let l = 0; l < 3; l++) {
          if (ladders[z][l] === ladders[x][l] || ladders[z][l] === ladders[y][l]) { ok = false; break; }
          const a = Math.min(mn[l], lo3[2][z * 3 + l]), b = Math.max(mx[l], hi3[2][z * 3 + l]);
          w = Math.max(w, b / a);
          if (w >= bw) { ok = false; break; }
        }
        if (ok) { bw = w; ba = x; bb = y; bc = z; }
      }
    }
    console.log(`\n  exhaustive over ${N} ladders in each of three slots, industry pairs kept:`);
    console.log(`    best reachable worst-level spread ${bw.toFixed(2)}x, at  UT/RE ${ladders[ba].join("/")}   HO/MA ${ladders[bb].join("/")}   HC/TE ${ladders[bc].join("/")}`);
    console.log(`    re-assigning the three ladders the game already prints reaches 1.63x, for no new numbers.`);
  } else {
    console.log("\n  (pass --search to re-check by exhaustive enumeration that no ladder on");
    console.log("   multiples of 5 beats 1.30x; it is 225 million triples and takes a minute)");
  }
  console.log("");
  process.exit(0);
}

/* ---- arms ---- */
const CONSUME = `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`;
need(CONSUME, "the delivery rule");
if (has("--flow")) logic = logic.replace(CONSUME, "  return cross ? 1 : exchangeRate(state, biz);");
if (has("--tuned")) { need("const CASH_PER_EP = 50;", "the cash-to-EP rate"); logic = logic.replace("const CASH_PER_EP = 50;", "const CASH_PER_EP = 65;"); }
{
  const cards = JSON.parse(logic.match(CARDS_RE)[1]);
  let touched = false;
  if (has("--tuned")) { for (const c of cards) { c.setup = P1_SETUP[c.ind][c.lvl - 1]; c.opex = P1_OPEX[c.ind][c.lvl - 1]; } touched = true; }
  if (has("--flip")) { for (const c of cards) c.setup = FLIP[c.ind][c.lvl - 1]; touched = true; }
  if (has("--flat")) { for (const c of cards) c.setup = FLAT[c.ind][c.lvl - 1]; touched = true; }
  /* The two candidates from audit_price_room, where the break-even price is set
     deliberately and the setup ladder follows the net income that implies. Both
     move running cost as well as setup, so they are the only arms here that
     change what a company earns rather than only what it costs. */
  const ROOM = {
    roomA:   { opex:  { UT: [12, 24, 48], RE: [12, 24, 48], HO: [9, 18, 36], MA: [9, 18, 36], HC: [4, 8, 16], TE: [4, 8, 16] },
               setup: { UT: [10, 20, 40], RE: [10, 20, 40], HO: [15, 30, 60], MA: [15, 30, 60], HC: [20, 40, 80], TE: [20, 40, 80] } },
    roomMax: { opex:  { UT: [8, 16, 32], RE: [8, 16, 32], HO: [6, 12, 24], MA: [6, 12, 24], HC: [4, 8, 16], TE: [4, 8, 16] },
               setup: { UT: [15, 30, 60], RE: [15, 30, 60], HO: [15, 30, 60], MA: [15, 30, 60], HC: [15, 30, 60], TE: [15, 30, 60] } },
  };
  for (const k of Object.keys(ROOM)) if (has("--" + k)) {
    for (const c of cards) { c.opex = ROOM[k].opex[c.ind][c.lvl - 1]; c.setup = ROOM[k].setup[c.ind][c.lvl - 1]; }
    touched = true;
  }
  if (touched) logic = logic.replace(logic.match(CARDS_RE)[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
  var CARDS = cards;
}

/* ---- the probe: one ledger a company, stamped by quarter so payback is measured
   rather than assumed, and valued in dollars so the metric does not move with
   the thing being changed. ---- */
const HOOKS = [
  ["a sale",     "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;",
                 "  const leftover = Math.max(0, remaining);\n  __probe.sale(state, biz, earned + leftover * 1);\n  p.cash += earned + leftover * 1;"],
  ["a launch",   "  const biz = newBusiness(bp, footprint, state.quarter, state);",
                 "  const biz = newBusiness(bp, footprint, state.quarter, state);\n  __probe.launch(state, biz, bp.setup);"],
  ["an upgrade", "  b.upgraded = true; b.level += 1;\n  b.scored = false;",
                 "  __probe.upgrade(state, b, bizSetup(b));\n  b.upgraded = true; b.level += 1;\n  b.scored = false;"],
  ["the bills",  "      const cost = supplierBill + rentBill;",
                 "      const cost = supplierBill + rentBill;\n      __probe.bill(state, b, supplierBill + rentBill);"],
];
for (const [what, find, put] of HOOKS) { need(find, what); logic = logic.replace(find, put); }

let L = null;
const key = (b) => b.__k || (b.__k = `${b.bp.ind}#${b.id}#${b.quarterBuilt}`);
const ledger = (b) => {
  const k = key(b);
  if (!L.has(k)) L.set(k, { ind: b.bp.ind, lvl0: b.bp.lvl, built: b.quarterBuilt, outlay: 0, in: 0, out: 0, quarters: 0, plots: 0, payback: null });
  return L.get(k);
};
const probe = {
  launch:  (st, b, setup) => { const l = ledger(b); l.outlay += setup; },
  upgrade: (st, b, setup) => { const l = ledger(b); l.outlay += setup; },
  sale:    (st, b, got)   => { ledger(b).in += got; },
  bill:    (st, b, paid)  => { const l = ledger(b); l.out += paid; l.quarters++;
                               /* a horizontal company needs a plot per level and a
                                  vertical one needs exactly one, which is an entry
                                  cost that is printed on no card */
                               l.plots = Math.max(l.plots, b.footprint.length);
                               /* cumulative net against total outlay, read once a quarter */
                               if (l.payback === null && l.in - l.out >= l.outlay) l.payback = st.quarter - l.built + 1; },
};

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, Map, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES, BP_DATA, CASH_PER_EP, SCALING };
`, sandbox);
const E = box.E;
const bpInd = {}; E.BP_DATA.forEach((bp) => { bpInd[bp.name] = bp.ind; });

function run(seats) {
  const T = Object.fromEntries(E.INDUSTRIES.map((i) => [i, { n: 0, outlay: 0, in: 0, out: 0, quarters: 0, built: 0, ep: 0, paid: 0, payback: 0, lvl0: 0, plots: 0 }]));
  let games = 0;
  const OFF = (() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) : 0; })();
  for (let seed = 1 + OFF; seed <= GAMES + OFF; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;      // seat 0 is a human by default and would stall
    L = new Map();
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
    const epBy = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
    for (const p of st.players) for (const e of (p.epLog || [])) {
      const s = String((e.label && e.label.k) || e.label);
      let m = /^Company: (.+) L\d+$/.exec(s); if (m && bpInd[m[1]]) { epBy[bpInd[m[1]]] += e.amount; continue; }
      m = /^Entered (\w\w)/.exec(s); if (m && epBy[m[1]] !== undefined) epBy[m[1]] += e.amount;
    }
    for (const l of L.values()) {
      const t = T[l.ind];
      t.n++; t.outlay += l.outlay; t.in += l.in; t.out += l.out; t.quarters += l.quarters; t.built += l.built; t.lvl0 += l.lvl0; t.plots += l.plots;
      if (l.payback !== null) { t.paid++; t.payback += l.payback; }
    }
    for (const i of E.INDUSTRIES) T[i].ep += epBy[i];
  }
  return { T, games };
}

const EPV = E.CASH_PER_EP;
console.log(`\n${GAMES} games a table size, seeds from ${(() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) + 1 : 1; })()}.` +
  `  arms: ${["--flow", "--tuned", "--flip", "--flat", "--roomA", "--roomMax"].filter(has).join(" ") || "as it ships"}.  EP valued at $${EPV}.`);
console.log(`setup printed:  ${IND.map((i) => `${i} ${ladderOf(CARDS, i).join("/")}`).join("   ")}`);
for (const seats of SIZES) {
  const { T, games } = run(seats);
  console.log(`\n${"=".repeat(92)}\n${seats} PLAYERS  -  ${games} games\n${"=".repeat(92)}`);
  console.log("  " + pad("", 32) + IND.map((i) => rp(i, 10)).join(""));
  const row = (label, fn, note) => {
    const v = IND.map((i) => fn(T[i]));
    const nums = v.filter((x) => typeof x === "number" && isFinite(x) && x > 0);
    const sp = note === "spread" && nums.length === 6 ? `   ${(Math.max(...nums) / Math.min(...nums)).toFixed(2)}x` : "";
    console.log("  " + pad(label, 32) + v.map((x) => rp(typeof x === "number" ? (Number.isInteger(x) ? x : x.toFixed(2)) : x, 10)).join("") + sp);
  };
  const per = (t, f) => (t.n ? f(t) / t.n : 0);
  row("companies built a game", (t) => +(t.n / games).toFixed(2), "spread");
  row("  mean level of the card", (t) => +per(t, (x) => x.lvl0).toFixed(2));
  row("  mean quarter built", (t) => +per(t, (x) => x.built).toFixed(1));
  row("  quarters it then stood", (t) => +per(t, (x) => x.quarters).toFixed(1));
  console.log("  " + pad("PER COMPANY, IN DOLLARS", 32));
  row("  outlay (setup + upgrades)", (t) => "$" + per(t, (x) => x.outlay).toFixed(0));
  row("  revenue in", (t) => "$" + per(t, (x) => x.in).toFixed(0));
  row("  bills out", (t) => "$" + per(t, (x) => x.out).toFixed(0));
  row("  NET CASH", (t) => "$" + per(t, (x) => x.in - x.out - x.outlay).toFixed(0));
  row("  EP banked", (t) => +per(t, (x) => x.ep).toFixed(1));
  row("  NET VALUE  (cash + EP x $" + EPV + ")", (t) => +per(t, (x) => x.in - x.out - x.outlay + x.ep * EPV).toFixed(0), "spread");
  /* Per company is confounded the moment an arm changes how often an industry
     gets built: stop building the marginal Retails and the surviving ones look
     better each. The industry's whole ledger over the whole table, divided by
     games and by nothing else, is the figure that cannot be gamed that way. */
  console.log("  " + pad("PER GAME, WHOLE TABLE", 32));
  row("  NET VALUE a game", (t) => +((t.in - t.out - t.outlay + t.ep * EPV) / games).toFixed(0), "spread");
  row("  plots it stood on", (t) => +per(t, (x) => x.plots).toFixed(2));
  console.log("  " + pad("PAYBACK, MEASURED", 32));
  row("  share that ever paid for itself", (t) => (t.n ? (100 * t.paid / t.n).toFixed(0) + "%" : "-"), "spread");
  row("  quarters to, when it did", (t) => (t.paid ? +(t.payback / t.paid).toFixed(2) : "never"), "spread");

  /* Setup is a card number and can only balance what cards decide. Group the
     same figures by how a company GROWS - a vertical one stacks on one plot, a
     horizontal one needs a plot per level - and see what is left over. */
  const V = IND.filter((i) => E.SCALING[i] === "V"), H = IND.filter((i) => E.SCALING[i] === "H");
  const grp = (g, f) => g.reduce((a, i) => a + f(T[i]), 0) / g.length;
  const val = (t) => (t.in - t.out - t.outlay + t.ep * EPV) / games;
  const within = (g) => { const v = g.map((i) => val(T[i])); return Math.max(...v) / Math.min(...v); };
  console.log("\n  BY HOW THE COMPANY GROWS, which no card number can change");
  console.log(`    vertical   ${V.join(" ")}  - one plot, whatever the level   net value a game $${grp(V, val).toFixed(0)}   spread inside the group ${within(V).toFixed(2)}x`);
  console.log(`    horizontal ${H.join(" ")}  - a plot for every level         net value a game $${grp(H, val).toFixed(0)}   spread inside the group ${within(H).toFixed(2)}x`);
  console.log(`    vertical is worth ${(grp(V, val) / grp(H, val)).toFixed(2)}x a horizontal company` +
    `, on ${grp(V, (t) => per(t, (x) => x.plots)).toFixed(2)} plots against ${grp(H, (t) => per(t, (x) => x.plots)).toFixed(2)}`);
}
console.log("");
