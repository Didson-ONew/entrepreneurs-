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
/* --rows2  the proposed demand table. Same 16-district board and same suburb
            pool (R5 C5 A3 I3, twelve placed), only which industries each family
            prints. Expected volume 13.25/13.25/10.25/10.25/8.5/8.5 against
            today's 14.5/14.5/11.25/11.25/6.25/6.25, and expected spread
            9.5/9.5/7/7/7.5/7.5 against 10.75/10.75/8/8/5.25/5.25 - which is the
            first arrangement in this repo where the spread order stops matching
            the volume order, because HC and TE now touch five families each. */
const ROWS2 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "MA", "UT"], C: ["RE", "UT", "HO", "RE"],
  A: ["HO", "TE", "HC", "HO"], I: ["MA", "HC", "TE", "MA"],
  FC: ["TE", "HC", "RE", "TE"], IA: ["HC", "TE", "UT", "HC"],
  CC: ["MA", "RE", "HC", "MA"], LM: ["HO", "UT", "TE", "HO"],
};`;
const ROWS_NOW = `const DEMAND_ROWS = {
  R: ["UT", "RE", "HO", "UT"], C: ["RE", "UT", "MA", "RE"],
  A: ["HO", "UT", "TE", "HO"], I: ["MA", "RE", "HC", "MA"],
  FC: ["TE", "UT", "HC", "TE"], IA: ["MA", "RE", "TE", "MA"],
  CC: ["HC", "HO", "TE", "HC"], LM: ["HO", "MA", "HC", "HO"],
};`;
if (has("--rows2")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS2);
}

/* --rows3  the board-exact table. Every pair - UT/RE, HO/MA, HC/TE - has the
            same row count in each of R, C, A, I and the same total across the
            four centres, which is exactly the condition for two industries to
            land on identical demand on EVERY draw. Volumes are held at
            13.25/13.25/10.25/10.25/8.5/8.5 and the spread order still re-pairs
            (UT/RE 10.00, HC/TE 8.50, HO/MA 8.00). The price is the family
            shape: only FC and IA still print three distinct industries. */
const ROWS3 = `const DEMAND_ROWS = {
  R: ["HO", "MA", "HC", "TE"], C: ["UT", "RE", "HC", "TE"],
  A: ["HO", "HO", "MA", "MA"], I: ["UT", "UT", "RE", "RE"],
  FC: ["UT", "UT", "RE", "HC"], IA: ["UT", "RE", "RE", "HO"],
  CC: ["HO", "RE", "UT", "MA"], LM: ["MA", "TE", "UT", "RE"],
};`;
if (has("--rows3")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS3);
}

/* --rows4  the table that keeps the first-row = last-row rule in all eight
            families, holds the proposal's volumes, and puts the spread order
            back the way round it was meant to be: UT/RE 11.25, HO/MA 8.00,
            HC/TE 4.75 - evenly spaced, 3.25 between each tier. UT and RE also
            come out board-exact, landing identical on every draw. Within a
            weight class the families are interchangeable ({R,C}, {A,I} and the
            four centres), so these eight patterns can be permuted freely to
            suit the theme without changing any number. */
const ROWS4 = `const DEMAND_ROWS = {
  R: ["HC", "UT", "RE", "HC"], C: ["TE", "HO", "MA", "TE"],
  A: ["HO", "UT", "RE", "HO"], I: ["MA", "UT", "RE", "MA"],
  FC: ["UT", "RE", "HO", "UT"], IA: ["UT", "HO", "MA", "UT"],
  CC: ["RE", "UT", "MA", "RE"], LM: ["RE", "HC", "TE", "RE"],
};`;
if (has("--rows4")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS4);
}

/* --rows5  the table as sent: first row = last row in all eight families, all
            eight patterns distinct, UT and RE in suburbs only, and the spread
            order back the right way round - UT/RE 9.75, HO/MA 8.00, HC/TE 6.25
            on the free twelve-of-sixteen draw the engine uses, or exactly
            10/8/6 if the draw is stratified to 4 R, 4 C, 2 A, 2 I. */
const ROWS5 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "MA", "UT"], C: ["RE", "UT", "HO", "RE"],
  A: ["HO", "TE", "RE", "HO"], I: ["MA", "HC", "UT", "MA"],
  FC: ["TE", "MA", "HC", "TE"], IA: ["HC", "MA", "TE", "HC"],
  CC: ["TE", "HO", "HC", "TE"], LM: ["HC", "HO", "TE", "HC"],
};`;
if (has("--rows5")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS5);
}

/* --strat  draw the suburbs stratified instead of free: four of the five R
           tiles, four of the five C, two of the three A, two of the three I.
           Twelve tiles either way, but every game then has exactly 4 R, 4 C,
           2 A, 2 I, so each industry's demand is the same in every game and the
           two halves of every pair are identical by construction. Variety stays
           in WHICH tiles are drawn and where they sit, not in how many. */
const DRAW_NOW = `  const chosen = sample(SUBURB_POOL, 12, rng);`;
if (has("--strat")) {
  if (!logic.includes(DRAW_NOW)) { console.error("the suburb draw moved - update this probe"); process.exit(2); }
  logic = logic.replace(DRAW_NOW, `  const __byFam = (f, n) => sample(SUBURB_POOL.filter((t) => t[0] === f), n, rng);
  const chosen = shuffle([...__byFam("R", 4), ...__byFam("C", 4), ...__byFam("A", 2), ...__byFam("I", 2)], rng);`);
}

/* --rows6  the table that adds the Year-1 / Year-2 swing. Same volumes and
            spreads as --rows5 (14/10/8 and 10/8/6 on the stratified board), the
            same rules, and ONLY TWO FAMILIES TOUCHED - A and I swap which
            industry sits in their Year-1 row and which in their Year-2 row.
            Everything else is the table it came from. Availability now tilts
            across the years:
              Year 1  UT/RE 10   HO/MA 4   HC/TE 2
              Year 2  UT/RE  4   HO/MA 6   HC/TE 6 */
const ROWS6 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "MA", "UT"], C: ["RE", "UT", "HO", "RE"],
  A: ["HO", "UT", "HC", "HO"], I: ["MA", "RE", "TE", "MA"],
  FC: ["TE", "MA", "HC", "TE"], IA: ["HC", "MA", "TE", "HC"],
  CC: ["TE", "HO", "HC", "TE"], LM: ["HC", "HO", "TE", "HC"],
};`;
if (has("--rows6")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS6);
}

/* --rows7  the configuration with Year 1 at 9/6/1 and Year 2 at 5/4/7. Volumes
            stay 14/10/8 but the spread compresses to 9/8/7, Healthcare and
            Technology drop to ONE district of Year-1 demand on the whole board,
            and Utilities and Retail pick up three centres each. */
const ROWS7 = `const DEMAND_ROWS = {
  R: ["UT", "HO", "TE", "UT"], C: ["RE", "MA", "HC", "RE"],
  A: ["HO", "RE", "MA", "HO"], I: ["MA", "UT", "HO", "MA"],
  FC: ["HC", "UT", "TE", "HC"], IA: ["TE", "RE", "HC", "TE"],
  CC: ["UT", "RE", "HC", "UT"], LM: ["RE", "UT", "TE", "RE"],
};`;
if (has("--rows7")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS7);
}







/* v22 SHIPPED THE RATE RULE: an icon absorbs one unit from every company that reaches it,
   every quarter, and is never used up. The needles below anchor on that shape. */
const CONSUME = `  markSlotUsed(state.demand, biz.id, tileKey, rowIdx, levelIdx);
  return cross ? 1 : exchangeRate(state, biz);`;
need(CONSUME, "the delivery rule");
/* --flow SHIPPED in v22 - the engine plays the rate rule; the flag is accepted and does nothing. */
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
/* --sheet   the spreadsheet revamp: setup, running cost and production all
             re-set at level 1, doubling per level as the sheet's level-2 row
             shows. Base prices are unchanged. Its design property is that every
             industry loses exactly $3 at two bumps below its base price. */
const SHEET_L1 = {
  UT: { setup: 20, opex: 9,  prod: 3 }, RE: { setup: 10, opex: 11, prod: 4 },
  HO: { setup: 15, opex: 9,  prod: 2 }, MA: { setup: 15, opex: 15, prod: 4 },
  HC: { setup: 20, opex: 15, prod: 3 }, TE: { setup: 10, opex: 11, prod: 2 },
};
/* --sheetFix  the same sheet with ONE column changed. Holding the -$3 cliff fixes
                EBIT at 2*prod-3, so equal payback needs setup in the ratio 1:3:5
                across production 2:3:4, not the 2:3:4 the sheet uses. This is that
                re-assignment: still three values, two industries each, every other
                column untouched. */
const SHEETFIX_SETUP = { UT: 15, RE: 25, HO: 5, MA: 25, HC: 15, TE: 5 };
/* --cliff3  the sheet's idea with the cliff moved one bump further down. Fixing
             margin at -$3 at base-3 instead of base-2 gives EBIT = 3*prod-3 =
             3/6/9 rather than 1/3/5, so companies keep a workable margin, and
             setup in the ratio 1:2:3 lands payback at 3.33 quarters for all six. */
/* --sheet2     the revised sheet: running costs cut $3 across the board, so every
                industry now breaks even EXACTLY at base-2 rather than losing $3.
                That pins EBIT = 2*prod, and payback = setup/(2*prod).
   --sheet2pay  the same sheet with the setup column re-assigned so payback comes
                out level at 2.50 quarters - still three values, two each. */
const SHEET2 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 10, opex: 8,  prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 15, opex: 12, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 8, prod: 2 } };
const SHEET2_PAY = { UT: 15, RE: 20, HO: 10, MA: 20, HC: 15, TE: 10 };
const sheet2Card = (c, pay) => { const m = 1 << (c.lvl - 1), b = SHEET2[c.ind];
  return { ...c, setup: (pay ? SHEET2_PAY[c.ind] : b.setup) * m, opex: b.opex * m, prod: b.prod * m }; };
const CLIFF3 = { UT: { setup: 20, opex: 6,  prod: 3 }, RE: { setup: 30, opex: 7,  prod: 4 },
                 HO: { setup: 10, opex: 7,  prod: 2 }, MA: { setup: 30, opex: 11, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 9,  prod: 2 } };
const cliffCard = (c) => { const m = 1 << (c.lvl - 1), b = CLIFF3[c.ind];
  return { ...c, setup: b.setup * m, opex: b.opex * m, prod: b.prod * m }; };
const sheetCard = (c, fix) => { const m = 1 << (c.lvl - 1), b = SHEET_L1[c.ind];
  return { ...c, setup: (fix ? SHEETFIX_SETUP[c.ind] : b.setup) * m, opex: b.opex * m, prod: b.prod * m }; };
  for (const k of Object.keys(ROOM)) if (has("--" + k)) {
    for (const c of cards) { c.opex = ROOM[k].opex[c.ind][c.lvl - 1]; c.setup = ROOM[k].setup[c.ind][c.lvl - 1]; }
    touched = true;
  }
  if (has("--sheet") || has("--sheetFix")) { const fx = has("--sheetFix"); cards.forEach((c, n) => { cards[n] = sheetCard(c, fx); }); touched = true; }
  if (has("--cliff3")) { cards.forEach((c, n) => { cards[n] = cliffCard(c); }); touched = true; }
  if (has("--sheet2") || has("--sheet2pay")) { const pay = has("--sheet2pay"); cards.forEach((c, n) => { cards[n] = sheet2Card(c, pay); }); touched = true; }
  if (touched) logic = logic.replace(logic.match(CARDS_RE)[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
  var CARDS = cards;
}


/* ---- the configuration on the spreadsheet ----
   --sheet3  its level-1 attributes. The same set as --sheet2 with the SETUP COLUMN
             OF RE AND HO SWAPPED, Retail to $15 and Hospitality to $10, which is the
             only attribute that moves between the two. It pairs the six into (UT,HC)
             at 20, (RE,MA) at 15 and (HO,TE) at 10, every one of them breaking even
             exactly at base price minus $2, and payback at base of 3.33 / 1.88 / 2.50.
   --rows8   its demand table. Volumes 14/10/10/10/10/10, spreads 9/8/6/8/8/9, the
             first-row-equals-last-row rule held in all eight families, and Retail and
             Manufacturing printed on no centre at all.
   --deps3   its supplier matrix, read off the S1/S2/S3 columns: 3-regular both ways,
             fourteen of eighteen edges mutual.
   --deps3b  the matrix the sheet's own B2B row implies instead. The two disagree.
             Each B2B figure is exactly the sum of that industry's three suppliers'
             opex, and only this assignment reproduces all six - but it is NOT regular,
             with Technology listed by four industries and Retail by two.
   --lvlkeep when the sheet's level-1 values are applied, scale levels 2 and 3 by
             each industry's OWN printed curve instead of doubling. The sheet only
             states level 1, and doubling is a guess: it puts a Utilities level 3 at
             $80 of setup against the $30 printed today. This arm reads the same
             sheet the other way, so the two together bracket the answer.
   --v3      all three together, on the stratified draw.                            */
const SHEET3 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 15, opex: 8,  prod: 4 },
                 HO: { setup: 10, opex: 6, prod: 2 }, MA: { setup: 15, opex: 12, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
const ROWS8 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "TE", "UT"], C: ["HO", "MA", "HC", "HO"],
  A: ["RE", "TE", "MA", "RE"], I: ["MA", "UT", "RE", "MA"],
  FC: ["HC", "UT", "TE", "HC"], IA: ["TE", "HO", "HC", "TE"],
  CC: ["HC", "TE", "UT", "HC"], LM: ["UT", "HC", "HO", "UT"],
};`;
/* Each industry's suppliers sit in a fixed order on its cards and the vals are
   positional, so re-pointing by position moves the dollars without changing how
   many there are. */
const TRIPLE_NOW = { UT: ["HO", "TE", "HC"], RE: ["TE", "HO", "MA"], HO: ["MA", "HC", "RE"],
                     MA: ["HC", "RE", "UT"], HC: ["RE", "UT", "TE"], TE: ["UT", "MA", "HO"] };
const DEPS3 = { UT: ["TE", "MA", "HC"], RE: ["UT", "HO", "TE"], HO: ["MA", "HC", "RE"],
                MA: ["HO", "TE", "UT"], HC: ["RE", "UT", "HO"], TE: ["HC", "RE", "MA"] };
const DEPS3B = { UT: ["MA", "HC", "TE"], RE: ["TE", "MA", "HC"], HO: ["UT", "RE", "TE"],
                 MA: ["RE", "HO", "TE"], HC: ["UT", "HO", "MA"], TE: ["UT", "HO", "HC"] };
/* ---- and the next revision of it ----
   --sheet4  its level-1 attributes. Setup goes back to RE $10 / HO $15, and the OPEX
             column comes DOWN where it was biting: MA 12 to 8 and HC 12 to 10, with RE
             8 to 10. Total running cost 48 against the previous 52. That breaks the
             uniform break-even on purpose - at base price minus $2 the six now sit at
             UT 0, RE -2, HO 0, MA +4, HC +2, TE 0, so price headroom finally differs by
             industry. It costs payback spread to buy it: 3.00x against the previous
             1.78x, because MA falls to 1.25 quarters and HO rises to 3.75.
   --rows9   its demand table. Volumes 12/10/12/10/10/10 and EVERY SPREAD EQUAL AT 8.
             Hospitality picks up the A family and two centres, which is what cures the
             3.00x draw-to-draw swing the previous table left it with.
   --deps4   its supplier matrix: 3-regular both ways, like the last one.
   --v4      all three, on the stratified draw.                                      */
const SHEET4 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 10, opex: 10, prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 15, opex: 8,  prod: 4 },
                 HC: { setup: 20, opex: 10, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
const ROWS9 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "TE", "UT"], C: ["HO", "MA", "HC", "HO"],
  A: ["RE", "TE", "HO", "RE"], I: ["MA", "UT", "RE", "MA"],
  FC: ["HC", "MA", "UT", "HC"], IA: ["TE", "HO", "HC", "TE"],
  CC: ["HC", "UT", "MA", "HC"], LM: ["TE", "HC", "HO", "TE"],
};`;
const DEPS4 = { UT: ["TE", "HC", "MA"], RE: ["UT", "HO", "TE"], HO: ["HC", "MA", "RE"],
                MA: ["HO", "TE", "UT"], HC: ["RE", "UT", "HO"], TE: ["MA", "RE", "HC"] };
/* ---- and the revision after that ----
   --sheet5  RE setup 10 to 15 and MA setup 15 to 10, the only two cells that move.
             Everything else - opex, prod, base price, the demand table, the supplier
             matrix - is the previous revision unchanged. Its B2B row now reconciles
             exactly: every figure is the sum of that industry's three suppliers' opex,
             six for six, which confirms the matrix.
   --sheet5b the same with MA at 18 instead of 10. The sheet's own payback cell for MA
             reads 1.50, which needs setup 18, while its setup cell reads 10, which
             gives 0.83. The other five cells agree with setup/EBIT exactly, so one of
             the two MA cells is stale. Both are measured rather than guessed.
   --v5      sheet5 with the demand table, the matrix and the stratified draw, on each
             industry's own printed level curve - the stated rule is that base cards
             follow the curve while UPGRADING keeps doubling, which is what the engine
             already does to a grown company's opex and production.              */
const SHEET5 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 15, opex: 10, prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 10, opex: 8,  prod: 4 },
                 HC: { setup: 20, opex: 10, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
const SHEET5B = { ...SHEET5, MA: { setup: 18, opex: 8, prod: 4 } };
/* --sheet6: the setup column alone moves again - UT 20 to 15, HO 15 to 10, MA 10 to 20 -
   which pairs it (HO,TE) 10, (UT,RE) 15, (MA,HC) 20 and lands payback LEVEL at 2.50
   quarters for five of six, Manufacturing alone at 1.67. */
const SHEET6 = { UT: { setup: 15, opex: 6, prod: 3 }, RE: { setup: 15, opex: 10, prod: 4 },
                 HO: { setup: 10, opex: 6, prod: 2 }, MA: { setup: 20, opex: 8,  prod: 4 },
                 HC: { setup: 20, opex: 10, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
const V6 = process.argv.includes("--v6");
const V5 = process.argv.includes("--v5") || process.argv.includes("--v5b") || V6;
const V4 = process.argv.includes("--v4");
const v3 = (f) => process.argv.includes(f) || process.argv.includes("--v3") ||
  ((V4 || V5) && ["--rows8", "--strat", "--sheet3", "--deps3"].includes(f));
function applySheet3(logicIn) {
  let out = logicIn;
  if (v3("--rows8")) {
    if (!out.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
    out = out.replace(ROWS_NOW, (V4 || V5) ? ROWS9 : ROWS8);
  }
  if (v3("--strat")) {
    const d = `  const chosen = sample(SUBURB_POOL, 12, rng);`;
    if (!out.includes(d)) { console.error("the suburb draw moved - update this probe"); process.exit(2); }
    out = out.replace(d, `  const __byFam = (f, n) => sample(SUBURB_POOL.filter((t) => t[0] === f), n, rng);
  const chosen = shuffle([...__byFam("R", 4), ...__byFam("C", 4), ...__byFam("A", 2), ...__byFam("I", 2)], rng);`);
  }
  const wantCards = v3("--sheet3") || v3("--deps3") || v3("--deps3b");
  if (!wantCards) return out;
  const m = out.match(/const BP_DATA = (\[.*?\]);/s);
  if (!m) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
  const cards = JSON.parse(m[1]);
  const G = v3("--deps3b") ? DEPS3B : (V4 || V5) ? DEPS4 : v3("--deps3") ? DEPS3 : null;
  for (const c of cards) {
    if (G) {
      const from = TRIPLE_NOW[c.ind], to = G[c.ind];
      if (c.deps.some((d) => !from.includes(d.ind))) { console.error(`${c.code} does not draw from the triple this probe expects`); process.exit(2); }
      c.deps = c.deps.map((d) => ({ ...d, ind: to[from.indexOf(d.ind)] }));
    }
    if (v3("--sheet3")) {
      const mul = 1 << (c.lvl - 1);
      const b = (V6 ? SHEET6 : process.argv.includes("--v5b") ? SHEET5B : V5 ? SHEET5 : V4 ? SHEET4 : SHEET3)[c.ind];
      if (process.argv.includes("--lvlkeep") || (V5 && !process.argv.includes("--double"))) {
        const base = CARDS0.find((x) => x.ind === c.ind && x.lvl === 1);
        c.setup = Math.round((b.setup * c.setup) / base.setup);
        c.opex = Math.round((b.opex * c.opex) / base.opex);
      } else { c.setup = b.setup * mul; c.opex = b.opex * mul; }
      c.prod = b.prod * mul;
    }
  }
  CARDS = cards;                                      // so the banner prints what ran
  return out.replace(m[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
}
logic = applySheet3(logic);


/* --builtland: the two land awards count BUILT ground instead of OWNED ground.
   As it stands, plotCount and districtCount both read board.owner, so a plot bought
   and left bare scores exactly as much as one with a factory on it - and measured, 78%
   of all land-award EP goes to ground with nothing standing on it. That buries the
   effect the awards were written for: "one disc can span several districts" is the
   reason a horizontal industry is worth drafting, and it cannot show through a count
   that is dominated by land banking. This arm counts only plots under an active
   company, keeping branches in the district count (a shopfront is somewhere you ARE)
   and out of the plot count (it is not a holding), which is the distinction the
   shipped rule already draws. */
const DISTRICT_OWNED = [
  "  const districts = new Set();",
  "  Object.entries(state.board.owner).forEach(([plot, id]) => {",
  "    if (id === p.id) districts.add(`${state.board.cellOf[plot].r},${state.board.cellOf[plot].c}`);",
  "  });",
].join("\n");
const DISTRICT_BUILT = [
  "  const districts = new Set();",
  "  Object.entries(state.board.branches || {}).forEach(([plot, br]) => {",
  "    if (br && br.playerId === p.id) { const c = state.board.cellOf[plot]; if (c) districts.add(`${c.r},${c.c}`); }",
  "  });",
].join("\n");
const PLOT_OWNED = [
  "  const br = state.board.branches || {};",
  "  return Object.entries(state.board.owner).filter(([k, id]) => id === p.id && !(k in br)).length;",
].join("\n");
const PLOT_BUILT = [
  "  const br = state.board.branches || {};",
  "  const built = new Set();",
  "  activeBiz(p).forEach((b) => b.footprint.forEach((x) => { if (!(String(x) in br)) built.add(String(x)); }));",
  "  return built.size;",
].join("\n");
/* The engine counts BUILT ground now, so this arm runs the other way: --ownedland puts
   back the rule the game had before the rebalance, for comparison. */
if (has("--ownedland")) {
  need(DISTRICT_BUILT, "the district count");
  logic = logic.replace(DISTRICT_BUILT, DISTRICT_OWNED);
  need(PLOT_BUILT, "the plot count");
  logic = logic.replace(PLOT_BUILT, PLOT_OWNED);
}


/* ---- what a Retail branch costs ----
   As it stands a branch takes ground for NOTHING: branchSpot looks only at plots nobody
   owns, and placeBranches then writes board.owner[spot] = p.id. The only price is a
   disc. Buying that same plot through BUY costs plotValue in cash AND a disc, so Retail
   scales its reach for free while every other industry pays for its ground.

   --branchbuy   a branch may only open on a plot the player ALREADY OWNS, so the land
                 is bought first at the normal price. Rent follows the normal rule and
                 comes to nothing, because you cannot owe yourself.
   --branchrent  a branch may open on any plot SOMEBODY owns, yours or a rival's, and a
                 branch on a rival's plot pays them ground rent every quarter like any
                 other structure. This is the reading where "pay rent as normal" bites.
   Both stop a branch from seizing free land, which is the bulk of the change either way. */
const SPOT_FREE = "    if (k in board.owner || !plotFree(board, k)) continue;";
const SPOT_OWN  = "    if (board.owner[k] !== p.id || !plotFree(board, k)) continue;";
const SPOT_ANY  = "    if (!(k in board.owner) || !plotFree(board, k)) continue;";
const TAKE_LAND = "    board.owner[spot] = p.id;                      // holds the ground, so it costs a disc";
const RENT_NOW = [
  "const bizGroundRent = (state, p, b) => b.footprint.reduce((s, plot) => {",
  "  const ownerId = state.board.owner[plot];",
  "  if (ownerId === undefined || ownerId === p.id) return s;",
  "  return s + RENT_PER_LEVEL * levelsOn(b, plot);",
  "}, 0);",
].join("\n");
const RENT_WITH_BRANCHES = [
  "const bizGroundRent = (state, p, b) => b.footprint.reduce((s, plot) => {",
  "  const ownerId = state.board.owner[plot];",
  "  if (ownerId === undefined || ownerId === p.id) return s;",
  "  return s + RENT_PER_LEVEL * levelsOn(b, plot);",
  "}, 0) + Object.keys(state.board.branches || {}).reduce((s, k) => {",
  "  const br = state.board.branches[k];",
  "  if (!br || br.bizId !== b.id) return s;",
  "  const o = state.board.owner[k];",
  "  return (o === undefined || o === p.id) ? s : s + RENT_PER_LEVEL;",
  "}, 0);",
].join("\n");
/* --branchpay: the middle road. A branch still reaches wherever the chain can, and
   still takes the ground, but it PAYS plotValue for it in cash the way BUY does - so
   Retail keeps its own special scaling and simply stops getting the land free. Neither
   of the arms above can show this, because both work by denying the plot rather than
   pricing it, and --branchbuy in particular collapses the mechanic against a bot that
   does not know to buy ground ahead of its chain. */
const BRANCH_PAY = [
  "    const __cost = plotValue(state, spot);",
  "    if (p.cash < __cost) break;                 // a branch you cannot buy the ground for is not opened",
  "    p.cash -= __cost;",
  "    board.owner[spot] = p.id;                      // holds the ground, so it costs a disc",
].join("\n");
if (has("--branchpay")) {
  need(TAKE_LAND, "a branch taking the ground");
  logic = logic.replace(TAKE_LAND, BRANCH_PAY);
}
if (has("--branchbuy") || has("--branchrent")) {
  need(SPOT_FREE, "where a branch may open");
  logic = logic.replace(SPOT_FREE, has("--branchrent") ? SPOT_ANY : SPOT_OWN);
  need(TAKE_LAND, "a branch taking the ground");
  logic = logic.replace(TAKE_LAND, "    /* the ground is already owned - a branch no longer takes it */");
  if (has("--branchrent")) { need(RENT_NOW, "the ground rent"); logic = logic.replace(RENT_NOW, RENT_WITH_BRANCHES); }
}

/* ---- the probe: one ledger a company, stamped by quarter so payback is measured
   rather than assumed, and valued in dollars so the metric does not move with
   the thing being changed. ---- */
/* Bare ground earns nothing now, so the attribution must not credit it either, or the
   report would show a bare-land share the rules no longer have. Only --ownedland, which
   puts the old rule back, puts bare plots back into the split. */
const SPARE_EXPR = has("--ownedland")
  ? "Object.entries(state.board.owner).filter((e) => e[1] === p.id && !inCo.has(String(e[0]))).map((e) => e[0])"
  : "[]";
const HOOKS = [
  /* A land award is EP that no company banks, and it is the channel the horizontal
     industries are MEANT to win: The Real-Estate Mogul ranks raw plots, The Omnipresent
     ranks DISTRICTS, and one horizontal disc spans several. Attributing only
     "Company: ..." and "Entered ..." lines counts the half of the score where vertical
     industries are strong and drops the half built to pay horizontal play back.
     So split each award across what earned it: by footprint for the Mogul, and for the
     Omnipresent by district with each district divided equally among whatever of the
     player's touches it. Plots owned with nothing standing on them earn their share
     too and belong to no industry, so they go to a bare-land bucket, visible rather
     than hidden. */
  ["a branch opening", `    board.branches[spot] = { playerId: p.id, bizId: biz.id };`,
                       `    board.branches[spot] = { playerId: p.id, bizId: biz.id }; __probe.branch();`],
  ["a land award", `    addEP(p, share, label, state.quarter);`,
   `    __probe.land(label, share, (() => {
      const w = {}; let bare = 0;
      const mine = activeBiz(p), inCo = new Set();
      mine.forEach((b) => b.footprint.forEach((x) => inCo.add(String(x))));
      const spare = ${SPARE_EXPR};
      if (label === "The Real-Estate Mogul") {
        mine.forEach((b) => { w[bizInd(b)] = (w[bizInd(b)] || 0) + b.footprint.length; });
        bare = spare.length;
      } else {
        const touch = {};
        const mark = (plot, who) => { const c = state.board.cellOf[plot]; if (!c) return;
          const k = c.r + "," + c.c; (touch[k] = touch[k] || new Set()).add(who); };
        mine.forEach((b) => b.footprint.forEach((plot) => mark(plot, bizInd(b))));
        spare.forEach((plot) => mark(plot, "__bare"));
        Object.keys(touch).forEach((k) => { const set = Array.from(touch[k]);
          set.forEach((who) => { if (who === "__bare") bare += 1 / set.length;
                                 else w[who] = (w[who] || 0) + 1 / set.length; }); });
      }
      return { w: w, bare: bare }; })());
    addEP(p, share, label, state.quarter);`],
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

let L = null, LAND = [], BRANCHES = 0;
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
  land:    (label, share, split) => { LAND.push({ label: label, share: share, split: split }); },
  branch:  () => { BRANCHES++; },
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
  const T = Object.fromEntries(E.INDUSTRIES.map((i) => [i, { n: 0, outlay: 0, in: 0, out: 0, quarters: 0, built: 0, ep: 0, land: 0, paid: 0, payback: 0, lvl0: 0, plots: 0 }]));
  /* One row a game, so the TAILS can be read and not just the mean. A spread of means
     says nothing about whether an industry is ever dead or ever runs away with it. */
  const perGame = Object.fromEntries(E.INDUSTRIES.map((i) => [i, []]));
  let games = 0, bareEP = 0, landTotal = 0;
  BRANCHES = 0;
  const OFF = (() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) : 0; })();
  for (let seed = 1 + OFF; seed <= GAMES + OFF; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;      // seat 0 is a human by default and would stall
    L = new Map(); LAND = [];
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
    const nBy = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
    for (const l of L.values()) nBy[l.ind]++;
    /* Land EP, split across whatever earned it, added on top of what the companies banked. */
    const landBy = Object.fromEntries(E.INDUSTRIES.map((i) => [i, 0]));
    for (const a of LAND) {
      const tot = Object.values(a.split.w).reduce((x, y) => x + y, 0) + a.split.bare;
      if (tot <= 0) { bareEP += a.share; landTotal += a.share; continue; }
      for (const i of E.INDUSTRIES) if (a.split.w[i]) landBy[i] += (a.share * a.split.w[i]) / tot;
      bareEP += (a.share * a.split.bare) / tot;
      landTotal += a.share;
    }
    for (const i of E.INDUSTRIES) {
      T[i].ep += epBy[i]; T[i].land += landBy[i];
      perGame[i].push({ ep: epBy[i] + landBy[i], epCo: epBy[i], n: nBy[i] });
    }
  }
  return { T, games, perGame, bareEP, landTotal, branches: BRANCHES };
}

const EPV = E.CASH_PER_EP;
console.log(`\n${GAMES} games a table size, seeds from ${(() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) + 1 : 1; })()}.` +
  `  arms: ${["--flow", "--tuned", "--flip", "--flat", "--roomA", "--roomMax", "--sheet", "--sheetFix", "--cliff3", "--sheet2", "--sheet2pay", "--sheet3", "--rows8", "--deps3", "--deps3b", "--strat", "--v3", "--sheet4", "--rows9", "--deps4", "--v4", "--v5", "--v5b", "--v6", "--lvlkeep", "--double", "--tails", "--ownedland", "--branchbuy", "--branchrent", "--branchpay"].filter(has).join(" ") || "as it ships"}.  EP valued at $${EPV}.`);
console.log(`setup printed:  ${IND.map((i) => `${i} ${ladderOf(CARDS, i).join("/")}`).join("   ")}`);
for (const seats of SIZES) {
  const { T, games, perGame, bareEP, landTotal, branches } = run(seats);
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
  /* ---- the tails ----
     The brief is not that the six come out level, it is that no industry is dead or
     dominant with any real frequency once personas, tiles, prices, draws, plots, seat
     order, hubs and pots have all had their say. A spread of means cannot answer that;
     the per-game distribution can. "Ran the table" means that industry banked the most
     EP of the six in that game, ties shared. */
  if (has("--tails")) {
    const q = (a, f) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
    const eps = Object.fromEntries(IND.map((i) => [i, perGame[i].map((g) => g.ep)]));
    let topCount = Object.fromEntries(IND.map((i) => [i, 0])), deadCount = Object.fromEntries(IND.map((i) => [i, 0]));
    for (let g = 0; g < games; g++) {
      const best = Math.max(...IND.map((i) => eps[i][g]));
      const win = IND.filter((i) => eps[i][g] === best);
      for (const i of win) topCount[i] += 1 / win.length;
      for (const i of IND) if (perGame[i][g].n === 0) deadCount[i]++;
    }
    console.log("\n  THE TAILS, not the means - one row a game over " + games + " games");
    const trow = (lab, fn) => console.log("  " + pad(lab, 32) + IND.map((i) => rp(fn(i), 10)).join(""));
    trow("  games with nothing built in it", (i) => (100 * deadCount[i] / games).toFixed(1) + "%");
    trow("  games it banked the most EP", (i) => (100 * topCount[i] / games).toFixed(1) + "%");
    trow("    of it, land award EP", (i) => (T[i].land / games).toFixed(1));
    trow("    company + debut EP", (i) => (T[i].ep / games).toFixed(1));
    trow("  EP a game, 10th percentile", (i) => q(eps[i], 0.10).toFixed(1));
    trow("  EP a game, median", (i) => q(eps[i], 0.50).toFixed(1));
    trow("  EP a game, 90th percentile", (i) => q(eps[i], 0.90).toFixed(1));
    const tc = IND.map((i) => topCount[i] / games), dc = IND.map((i) => deadCount[i] / games);
    console.log(`    most-EP share runs ${(100 * Math.min(...tc)).toFixed(1)}% to ${(100 * Math.max(...tc)).toFixed(1)}% against an even 16.7%` +
      `, and the deadest industry is empty in ${(100 * Math.max(...dc)).toFixed(1)}% of games`);
    const landInd = IND.reduce((x, i) => x + T[i].land, 0), coEP = IND.reduce((x, i) => x + T[i].ep, 0);
    console.log(`    land awards are $${(landTotal / games).toFixed(1)} EP a game of ${((landTotal + coEP) / games).toFixed(1)} attributed` +
      ` (${(100 * landTotal / (landTotal + coEP)).toFixed(0)}%), of which ${(bareEP / games).toFixed(1)} went to plots with nothing on them`);
    console.log(`    Retail opened ${(branches / games).toFixed(2)} branches a game`);
    const V = ["RE", "HO", "HC"], H = ["UT", "MA", "TE"];
    const sh = (g) => 100 * g.reduce((x, i) => x + topCount[i], 0) / games;
    console.log(`    vertical RE HO HC take ${sh(V).toFixed(1)}% of games against horizontal UT MA TE on ${sh(H).toFixed(1)}%`);
  }

  console.log("\n  BY HOW THE COMPANY GROWS, which no card number can change");
  console.log(`    vertical   ${V.join(" ")}  - one plot, whatever the level   net value a game $${grp(V, val).toFixed(0)}   spread inside the group ${within(V).toFixed(2)}x`);
  console.log(`    horizontal ${H.join(" ")}  - a plot for every level         net value a game $${grp(H, val).toFixed(0)}   spread inside the group ${within(H).toFixed(2)}x`);
  console.log(`    vertical is worth ${(grp(V, val) / grp(H, val)).toFixed(2)}x a horizontal company` +
    `, on ${grp(V, (t) => per(t, (x) => x.plots)).toFixed(2)} plots against ${grp(H, (t) => per(t, (x) => x.plots)).toFixed(2)}`);
}
console.log("");
