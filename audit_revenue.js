/* ============================================================================
   REVENUE, SIMPLIFIED: what each way of cutting the arithmetic does to the game.

   READ THIS FIRST. Every figure in this header was measured on the engine as it
   played before v22, where an icon absorbed its column and was used up. v22 ships
   the rate rule (--flow below, now the default); --stock reproduces the engine the
   findings were taken on, so they can still be checked.

   The table says Revenue is where the game stalls. Abner's one wish was "The
   Revenue, the most complex part of the game"; Tiago found it "a bit difficult to
   understand at first"; the designer watched players "calculating the demand
   reachable x price of that industry + unmatched production x $1" every quarter.
   The shipped rule, per company, is: find the districts you reach, find your
   industry's rows, take the open icons in columns up to your level, remember that
   a column-c icon swallows c units, stop when production runs out, pay the price
   per unit, recycle the rest at $1 - and Hospitality and Manufacturing each have a
   second route for leftovers. Six steps and two multiplications before the money
   moves, for every company, every quarter.

   THE PROPOSAL on the table is a BAND: count the demand icons the company can
   reach and pay a flat amount by band - few icons $, some $$, many $$$. One count,
   one lookup, no production arithmetic at all. This probe measures it, and three
   other ways of taking steps out, against the shipped rule.

   THE ARMS
     current    as it ships
     flat1      an icon takes ONE unit whatever its column. Removes the "column c
                swallows c units" step. audit_demand_depth shipped the column rule
                because without it two thirds of production was recycled; this is
                the honest price of taking it back out.
     norecycle  unsold production is worth nothing. Removes the "+ leftover x $1"
                term, and the safety net under it.
     count      pay = price x icons filled, up to twice the company's level, and
                production is not a number any more. The band proposal without the
                plateaus - a control, to separate "dropping production" from
                "rounding into bands".
     ranged     the designer's own ranges in UNITS reached, per industry and level,
                with a floor - see THE DEMAND MODEL below, and ranged_table.json.
     band       the proposal. n = icons reached (own rows in columns up to level,
                Technology's counted twice, plus Manufacturing's cross-sell icons up
                to its level and Hospitality's neighbours). Band 1 if n < level,
                band 2 if n < 2 x level, band 3 at 2 x level or more; nothing
                reachable pays band 0. Pay = price x level x K[band]. Price and
                level stay in the game, and the table reads price x level off a
                44-cell grid on the market board, then halves or doubles it.
                --k a,b,c,d sets K for bands 0-3.

   The bots' four sales estimates - card valuation, both sides of the upgrade
   decision, and the trade a Megacorp gives up - are patched to match each arm, so
   the bots play the rule they are being measured on rather than the shipped one.
   placeableFor already counts in icons when told to, and the band arm tells it to.

   WHAT IS MEASURED, per arm and table size:
     the economy      revenue a company-quarter by industry and by level, trade
                      income a game, recycled share, solvency events
     who wins         vertical v horizontal most-EP share (land awards attributed
                      as audit_setup does), win rate by seat
     the game's shape lead changes, wire-to-wire, quarter the winner last took the lead
     does price matter  correlation of a company's revenue with its industry's price
     is there a decision  share of company-quarters where ONE MORE ICON would have
                      paid - under the shipped rule, that is every quarter production
                      outran demand; under a band, only the quarters sitting one
                      icon under a threshold

   WHAT IT FOUND - 300 games an arm a table size, three and four players.

   FIRST, WHY REVENUE FEELS HEAVY, which the shipped arm measures on its own: IN
   HALF OF ALL COMPANY-QUARTERS THERE IS NOTHING TO COMPUTE. A level-1 company
   reaches zero open icons in 49% of its quarters, a level-2 in 26%, a level-3 in
   21% - an icon is filled once a year, so a small company sells into its own
   district in the first quarter and recycles everything until Q9. The arithmetic
   the table dreads lives in the big companies: 37% of level-3 quarters and 55% of
   level-4 quarters see nine icons or more, across several districts, and that is
   where somebody is summing columns, capping at production and multiplying.

   THE TWO CHEAP CUTS ARE WORSE THAN THEY LOOK. flat1 (an icon takes one unit) is
   one step fewer and puts back exactly what audit_demand_depth took out: recycled
   output 45% -> 60%, trade income down 27%, a level-4 company from $88 to $55 a
   quarter. norecycle (unsold pays nothing) removes the "+ leftover" term and
   leaves a third of all company-quarters paying $0 - a table reads that as "my
   company did nothing this quarter" - and at three players widens the seat spread
   from 12.7 to 19.7 points.

   THE BAND ON PRICE x LEVEL (K = 1/2, 1/2, 1, 2) KEEPS THE GAME'S SHAPE AND LOSES
   HALF ITS MONEY. Vertical industries bank most EP in 69.8% of three-player games
   against 69.7% shipped; seat spread 11.7 against 12.7; lead changes 1.97 against
   1.95; the quarter the winner last took the lead 7.6 against 7.4. Nothing the
   last fortnight balanced moves. But trade income falls from $937 to $450 a game,
   and the level ladder - $7.5 / $21 / $42 / $88 shipped - compresses to
   $5.9 / $14 / $21 / $32, because "price x level" is linear in level and the
   shipped rule is not: a clean row gives a level-4 company 1+2+3+4 = 10 units.
   Winning scores drop 13 EP with it, since less cash is fewer upgrades.

   PAYING MORE DOES NOT FIX THE SHAPE. K = 1/2, 1, 2, 3 brings the total back
   ($870) but puts it in the wrong places - level 1 up 20%, level 4 still down a
   third - and it hands the richest band to whoever delivers first: three-player
   seat spread 18.7, and at four players the last seat wins 14.0% of games against
   a 25% baseline. A thresholded payout with a rich top step is a prize for early
   delivery.

   THE PLATEAUS ARE NOT THE PROBLEM; DROPPING PRODUCTION IS. The count control -
   price x icons filled, no bands, no production - shrinks the economy by 60%,
   worse than the band does. Rounding into bands costs almost nothing against the
   continuous version of itself. What costs is that production used to carry the
   level scaling, and icons do not.

   SO PAY BY THE TRIANGLE OF THE LEVEL, AND THE SHIPPED ECONOMY COMES BACK. --tri
   reads the cell as price x {1, 3, 6, 10} for levels 1-4 - which is exactly what
   one clean row absorbs under the shipped rule - with K = 1/2, 1/2, 1, 2:

                              shipped       tri band       shift
     trade income, 3p / 4p    $937 / $1460  $913 / $1491   $877 / $1390
     a quarter at level 1     $7.5 / $7.9   $6.0 / $6.3    $8.0 / $8.3
     level 2                  $21 / $22     $22 / $23      $21 / $22
     level 3                  $42 / $46     $43 / $47      $38 / $41
     level 4                  $88 / $93     $89 / $94      $69 / $74
     winning score            70.8 / 78.8   69.5 / 81.2    68.3 / 80.0
     vertical bank most EP    69.7 / 71.8   71.7 / 75.8    70.5 / 75.8
     seat spread              12.7 / 8.7    10.7 / 6.0     15.0 / 7.7
     lead changes a game      1.95 / 2.61   1.97 / 2.59    2.01 / 2.66
     wire to wire             10.3 / 4.3    11.0 / 4.7     10.0 / 2.0
     winner last led from Q   7.4 / 8.4     7.4 / 8.3      7.7 / 8.4
     revenue-price corr.      .36 / .35     .41 / .42      .46 / .46
     one more icon pays       63% / 64%     30% / 31%      32% / 32%

   The triangle band reproduces the ladder to within a dollar at every level, the
   winning score, the lead-change profile and the vertical share, and comes in
   two points better on seat spread at both sizes. The four-player vertical share
   is four points higher, which is inside noise at 300 games and is noted rather
   than claimed either way.

   --shift is the same rule with no arithmetic at all - the band moves WHICH
   COLUMN you read, one level down or up - and it is close, but leaner at the top
   (level 4 at $69) and worse on three-player seats. Halving and doubling one
   number is the cheaper price to pay for the ladder.

   WHAT THE TABLE DOES UNDER THE TRIANGLE BAND. Count the icons you can reach: your
   industry's rows in the districts you reach, columns up to your level, Technology
   counting each twice, Manufacturing adding the other-industry icons in its home
   district up to its level, Hospitality adding its neighbours. Read the cell for
   your industry's price and your level on the market board - a grid of 11 prices
   by 4 levels, headed 1, 3, 6, 10. Fewer icons than your level: half the cell. At
   least your level: the cell. Twice your level or more: double it. Mark icons up
   to twice your level and leave the rest. No production number, no column sums,
   no min, no recycling line.

   WHAT IT COSTS, stated so it is chosen and not discovered: the marginal icon
   matters in 31% of company-quarters instead of 63%. In two quarters out of three
   WHERE you deliver does not change what you are paid - it still changes what a
   rival can reach, since icons are still consumed first come first served. And
   price matters MORE (correlation .41 against .36), because every payout is a
   multiple of it, where the shipped rule pays half its dollars at a flat $1.

   NOT MEASURED, and the honest reason a table may differ: bots do not play to a
   band edge. A human one icon short of doubling their payout will go and get
   that icon - build towards it, branch towards it, reposition for it. That is a
   decision the shipped rule does not offer in that form, and this probe cannot
   price it either way.

   ------------------------------------------------------------------------
   THE DEMAND MODEL THE TABLE ACTUALLY PLAYS, found while measuring the above.

   Everything up to here assumes an icon is used up when it is sold to, because
   that is what the engine does and what Rulebook v21 says ("each icon can be
   sold to once, by whoever gets there first"). The physical prototype does not:
   it plays with no cubes on the grid, so an icon is open to everyone every
   quarter. audit_demand_flow.js measured that rule in an earlier session, found
   that it works and costs one constant, and it was never shipped. The designer
   believed it had been. Two readings of it, 200 games a table size, on the
   shipped Revenue arithmetic:

                              consumed       persistent     flow
                              (engine)       (no cubes)     (no cubes, 1 unit an icon)
     trade income 3p / 4p     $915 / $1476   $1324 / $2202  $1150 / $1864
     level 1 / 2 / 3 / 4      7 / 21 / 41 / 87   11 / 26 / 53 / 117   10 / 25 / 46 / 101
     production recycled      45% / 46%      22% / 23%      31% / 30%
     vertical bank most EP    70.5 / 72.8    73.0 / 78.0    74.0 / 74.5
     seat spread              18.5 / 12.5    22.5 / 8.0     8.0 / 8.0
     one more icon pays       63% / 64%      42% / 43%      50% / 49%
     level-1 quarters at 0    48%            23%            24%

   FLOW IS THE ONE TO SHIP IF THE TABLE'S RULE IS TO BE THE ENGINE'S. It removes
   the race (seat spread 8.0 at both sizes, against 18.5 and 12.5 with consumed
   icons - delivery order stops being worth anything), halves the share of
   small-company quarters that see no demand at all, and grows the economy by a
   quarter rather than a half. Persistent demand WITH column absorption is too
   rich - a level-4 company at $117 a quarter - and makes three-player seats
   worse, because the big absorbing icons are now permanent income for whoever
   stands nearest them.

   DEMAND REACHED IN UNITS UNDER FLOW, by industry and level - median, 90th
   percentile and max over 200 three-player games, which is what any range
   written in units has to be read against:

                level 1          level 2          level 3          level 4
     UT         1 /  2 /  2      8 / 10 / 14     21 / 27 / 30     44 / 52 / 52
     RE         1 /  3 /  6      4 /  8 / 14      6 / 15 / 21     12 / 24 / 24
     HO         2 /  8 / 13      4 / 16 / 23      8 / 26 / 38     25 / 38 / 49
     MA         4 /  8 / 11     10 / 18 / 24     21 / 30 / 33     28 / 28 / 28
     HC         8 / 28 / 36     12 / 24 / 40     20 / 28 / 36     24 / 32 / 36
     TE         2 / 10 / 16      8 / 24 / 32     24 / 42 / 48     40 / 56 / 56

   Two things in that table matter for any ranged payout. The designer's Retail
   maxima - 2, 8, 18, 32 - sit close to the engine's 90th percentiles of 3, 8, 15,
   24. And PRODUCTION IS NOT THE ONLY AXIS: Healthcare makes 3 units at level 1
   and reaches 28 at the 90th percentile, because it is on the hub network
   natively; Utilities makes 3 and reaches 2, because its block is one district
   wide. A range scaled from production alone would hand Healthcare the top band
   for standing still and never let a level-1 Utility out of the bottom one.

   THE DESIGNER'S OWN RANGE (--ranged) is a different band from the one above: it
   is written in units reached, with thresholds and multipliers per industry and
   level, and it has a floor - a company with no demand at all still earns its
   lowest multiplier of the price. Retail is given: level 1 pays 1/2/3 x price at
   0/1/2 units; level 3 pays 5/8/10 below 10, 10-14, above 14. The rest of the
   table in this file is a provisional extrapolation and is labelled as such on
   every run; ranged_table.json beside this file replaces it. Under flow, the
   provisional table reproduces level 1 to the dollar ($10 against $10), caps
   level 3 at $30 against $46 and level 4 at $49 against $101, cuts trade income
   30%, lifts the revenue-price correlation to .58 and leaves the marginal unit
   mattering in 26% of quarters. The floor is right; the top of the provisional
   multipliers is too low, and that is the designer's number to set, not this
   probe's.

   --rowsOld swaps in the v20 demand table. Measured on v22 rules: Retail's reach
   distribution is identical to the dollar at every level (the chain is bounded by
   adjacency, not by the pool), HC and TE lose Year-1 demand, Hospitality gains.
   See audit_setup.js --rowsOld for the balance figures.

   Run: node audit_revenue.js [games a table size] [seats...] [arms...] [--k a,b,c,d] [--tri | --shift] [--stock] [--rowsOld]
        arms: --current --flat1 --norecycle --count --band --all   (default: current band)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
/* The quarter marker is read through the shared helper, never by String()ing a log
   message - the log is { k, a } now, and test_audit_log_contract.js exists because
   thirteen audits once String()ed it and quietly reported zeros. */
const { quarterOf, seenCounter } = require("./logtext.js");

const ARGV = process.argv.slice(2);
const has = (f) => ARGV.includes(f);
const opt = (f, d) => { const i = ARGV.indexOf(f); return i >= 0 && ARGV[i + 1] !== undefined ? ARGV[i + 1] : d; };
const K = opt("--k", "0.5,0.5,1,2").split(",").map(Number);
/* --tri pays by the TRIANGLE of the level instead of the level - 1, 3, 6, 10 - which
   is exactly what one clean row of the company's industry absorbs under the shipped
   rule (columns 1..level, each taking its own number). The grid on the market board
   stays 44 cells; only the column headers change. */
const TRI = has("--tri");
/* --shift is the triangle band with NO arithmetic at all: the band moves which column
   of the grid you read. Band 2 reads your level's cell, band 1 the cell one level
   down, band 3 the cell one level up - so a level-3 company reads 3, 6 or 10 times
   the price, a level-1 company half, one or three times it. */
const SHIFT = has("--shift");
/* THE DEMAND MODEL, which the physical prototype and the engine disagree on. The
   engine consumes an icon when it is sold to; the table plays with no cubes, so an
   icon is open to everyone every quarter. --persist stops consuming; --flow stops
   consuming AND makes every icon absorb one unit, which is the rule
   audit_demand_flow.js measured. Either applies to whichever arms are run. */
const STOCK = has("--stock");
const PERSIST = !STOCK, ONEUNIT = !STOCK;   // --persist and --flow are what ships now; accepted, no-ops
/* --ranged is the designer's own band: thresholds and multipliers per industry and
   level, in UNITS of demand reached, read from ranged_table.json beside this file
   when it exists and from the provisional table below when it does not. */
/* --rowsOld swaps in the v20 demand table - the one before v21 redrew the rows - so
   the reach and income of every industry can be read under it on today's rules. */
const ROWS_OLD = has("--rowsOld");
const ROWS_OLD_TABLE = `const DEMAND_ROWS = {
  R: ["UT", "RE", "HO", "UT"], C: ["RE", "UT", "MA", "RE"],
  A: ["HO", "UT", "TE", "HO"], I: ["MA", "RE", "HC", "MA"],
  FC: ["TE", "UT", "HC", "TE"], IA: ["MA", "RE", "TE", "MA"],
  CC: ["HC", "HO", "TE", "HC"], LM: ["HO", "MA", "HC", "HO"],
};`;
const RANGED_FILE = path.join(__dirname, "ranged_table.json");
const RANGED = fs.existsSync(RANGED_FILE) ? JSON.parse(fs.readFileSync(RANGED_FILE, "utf8")) : (() => {
  /* Retail is the designer's: level 1 pays 1/2/3 x price at 0/1/2 units, level 3
     pays 5/8/10 below 10, 10-14, above 14. Levels 2 and 4 interpolate. Every other
     industry scales Retail's thresholds and multipliers by its production relative
     to Retail's, which is the stated principle - the more a company makes, the more
     demand it has to find before the top band pays. PROVISIONAL until replaced. */
  const RE = { 1: { a: 1, b: 2, m: [1, 2, 3] }, 2: { a: 4, b: 7, m: [3, 5, 6] },
               3: { a: 10, b: 15, m: [5, 8, 10] }, 4: { a: 18, b: 27, m: [8, 12, 16] } };
  const scale = { UT: 0.75, RE: 1, HO: 0.5, MA: 1, HC: 0.75, TE: 0.5 };
  const out = {};
  for (const [ind, k] of Object.entries(scale)) {
    out[ind] = {};
    for (const L of [1, 2, 3, 4]) {
      const r = RE[L];
      const a = Math.max(1, Math.round(r.a * k)), b = Math.max(a + 1, Math.round(r.b * k));
      out[ind][L] = { a, b, m: r.m.map((x) => Math.max(1, Math.round(x * k))) };
    }
  }
  return out;
})();
if (K.length !== 4 || K.some((x) => !isFinite(x))) { console.error("--k wants four numbers, K for bands 0..3"); process.exit(2); }
const positional = ARGV.filter((a, i) => !a.startsWith("--") && ARGV[i - 1] !== "--k");
const GAMES = parseInt(positional[0] || "300", 10);
const SEATS = positional.slice(1).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [3, 4];
const ALL = ["current", "flat1", "norecycle", "count", "band", "ranged"];
let ARMS = ALL.filter((a) => has("--" + a));
if (has("--all")) ARMS = ALL;
if (!ARMS.length) ARMS = ["current", "band"];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every splice is on an exact line, and a line that has moved stops the probe. */
const need = (src, s, what) => { if (!src.includes(s)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); } };
const splice = (src, from, to, what) => { need(src, from, what); return src.replace(from, to); };

const N = {
  absorb: "  return cross ? 1 : exchangeRate(state, biz);",
  placeable: "  const direct = slots.filter((s) => !s.cross).length * exchangeRate(state, biz);",
  slotOpen: "  return bizId === undefined || !slotUsedBy(pool, bizId, tileKey, rowIdx, levelIdx);",
  reset: "  resetDeliveries(state.demand);   // every icon is open to everyone again",
  closing: "  if (quarter === 4) unlockY2(demand);",
  deliverHead: "  let remaining = bizProd(biz);\n  let crossAllowance = bizInd(biz) === \"MA\" ? biz.level : 0;\n  let earned = 0;",
  deliverTail: "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;\n}",
  cardValue: "  let perQuarter = sellable * px + waste * 1 - effOpex;",
  upNow: "  const nowUnits = Math.min(bizProd(b), sellableForBiz(state, p, b));\n  const nowNet = nowUnits * px + Math.max(0, bizProd(b) - nowUnits) * 1\n    - bizOpex(b) - RENT_PER_LEVEL * b.level;",
  upGrown: "  const grownUnits = Math.min(grownProd, sellableForBiz(state, p, grown));\n  const grownNet = grownUnits * px + Math.max(0, grownProd - grownUnits) * 1\n    - bizOpex(grown) - 3 * grown.level;",
  mcTrade: "    const units = Math.min(bizProd(b), sellableForBiz(state, p, b));\n    const trade = units * price(state.pm, bizInd(b))\n      + Math.max(0, bizProd(b) - units) * 1 - bizOpex(b) - RENT_PER_LEVEL * b.level;",
  land: "    addEP(p, share, label, state.quarter);",
};
/* Demand reached, in UNITS - what the designer's ranges are written in. Under the
   shipped rule an icon is worth its column; under --flow it is worth one. */
const UNITS_EXPR = `(a.filter((s) => !s.cross).reduce((x, s) => x + ${STOCK ? "(s.levelIdx + 1)" : "1"}, 0) * exchangeRate(state, biz)
      + (bizInd(biz) === "MA" ? Math.min(biz.level, a.filter((s) => s.cross).length) : 0)
      + (bizInd(biz) === "HO" ? hoBonusUnits(state, biz, p) : 0))`;
for (const [k, v] of Object.entries(N)) need(BASE, v, k);

/* What the probe needs to know about a sale: who sold, how big, how much demand it
   saw, what it was paid, at what price, and what went to the recycler. */
const N_PROBE = `  const __n = (() => { const a = eligibleSlotsFor(state, biz);
    return a.filter((s) => !s.cross).length * exchangeRate(state, biz)
      + (bizInd(biz) === "MA" ? Math.min(biz.level, a.filter((s) => s.cross).length) : 0)
      + (bizInd(biz) === "HO" ? hoBonusUnits(state, biz, p) : 0); })();
  const __u = (() => { const a = eligibleSlotsFor(state, biz); return ${UNITS_EXPR}; })();`;

const BAND_BODY = `  const __all = eligibleSlotsFor(state, biz);
  const __own = __all.filter((s) => !s.cross);
  const __cross = bizInd(biz) === "MA" ? __all.filter((s) => s.cross).slice(0, biz.level) : [];
  const __ho = bizInd(biz) === "HO" ? hoBonusUnits(state, biz, p) : 0;
  const __rate = exchangeRate(state, biz);
  const __n = __own.length * __rate + __cross.length + __ho;
  /* Fill what counts towards the top band and leave the rest open: a company that
     reaches nine icons and needs six takes six. */
  const __need = 2 * biz.level;
  let __filled = 0;
  for (const s of __own) { if (__filled * __rate >= __need) break; if (deliverToSlot(state, biz, s.tileKey, s.rowIdx, s.levelIdx, false) > 0) __filled++; }
  for (const s of __cross) { if (__filled >= __need) break; if (deliverToSlot(state, biz, s.tileKey, s.rowIdx, s.levelIdx, true) > 0) __filled++; }
  const __px = unitPrice(state, p, biz);
  const __u = (() => { const a = __all; return ${UNITS_EXPR}; })();
  const __earned = __pay(__px, biz.level, __RANGED_BY_UNITS ? __u : __n, bizInd(biz));
  noteConcessionSale(state, p, biz, __earned > 0 ? 1 : 0);
  __probe.sale(bizInd(biz), biz.level, __n, __earned, 0, __px, bizProd(biz), __u);
  p.cash += __earned;
}`;

const LAND_PROBE = `    __probe.land(label, share, (() => {
      const w = {}; let bare = 0;
      const mine = activeBiz(p), inCo = new Set();
      mine.forEach((b) => b.footprint.forEach((x) => inCo.add(String(x))));
      if (label === "The Real-Estate Mogul") {
        mine.forEach((b) => { w[bizInd(b)] = (w[bizInd(b)] || 0) + b.footprint.length; });
      } else {
        const touch = {};
        const mark = (plot, who) => { const c = state.board.cellOf[plot]; if (!c) return;
          const k = c.r + "," + c.c; (touch[k] = touch[k] || new Set()).add(who); };
        mine.forEach((b) => b.footprint.forEach((plot) => mark(plot, bizInd(b))));
        Object.keys(touch).forEach((k) => { const set = Array.from(touch[k]);
          set.forEach((who) => { w[who] = (w[who] || 0) + 1 / set.length; }); });
      }
      return { w: w, bare: bare }; })());
    addEP(p, share, label, state.quarter);`;

function engine(arm) {
  let L = BASE;
  if (ROWS_OLD) {
    const now = (L.match(/const DEMAND_ROWS = \{[\s\S]*?\};/) || [null])[0];
    if (!now) { console.error("the demand table moved - update this probe"); process.exit(2); }
    L = L.replace(now, ROWS_OLD_TABLE);
  }
  const PAY = arm === "ranged"
    ? `const __R = ${JSON.stringify(RANGED)};
       const __pay = (px, lvl, u, ind) => { const r = (__R[ind] || {})[Math.min(4, lvl)]; if (!r) return 0;
         const m = u < r.a ? r.m[0] : u >= r.b ? r.m[2] : r.m[1]; return Math.round(px * m); };`
    : arm === "count"
    ? `const __pay = (px, lvl, n) => px * Math.min(n, 2 * lvl);`
    : SHIFT ? `const __S = [0.5, 1, 3, 6, 10, 15];
       const __pay = (px, lvl, n) => { const b = n < lvl ? 1 : n < 2 * lvl ? 2 : 3; return Math.round(px * __S[Math.max(0, Math.min(5, lvl + b - 2))]); };`
    : `const __K = ${JSON.stringify(K)};
       const __T = ${TRI ? "[0, 1, 3, 6, 10]" : "[0, 1, 2, 3, 4]"};
       const __pay = (px, lvl, n) => { const b = n <= 0 ? 0 : n < lvl ? 1 : n < 2 * lvl ? 2 : 3; return Math.round(px * __T[Math.min(4, lvl)] * __K[b]); };`;
  L = PAY + `\nconst __RANGED_BY_UNITS = ${arm === "ranged"};\n` + L;
  /* The engine ships the rate rule (v22). --stock puts the consumed-icon engine back,
     which is what every figure in this header was measured on: an icon used by anybody
     stays used, nothing resets at Production, the grid wipes at Quarter 8, and an icon
     absorbs its column - unless the arm is one of the one-unit ones. */
  const flatIcons = arm === "flat1" || arm === "count" || arm === "band";
  if (STOCK) {
    L = splice(L, N.slotOpen, "  return !Object.values(pool.used || {}).some((u) => u[slotKey(tileKey, rowIdx, levelIdx)]);", "slotOpen");
    L = splice(L, N.reset, "", "delivery reset");
    L = splice(L, N.closing, "  if (quarter === 4) unlockY2(demand);\n  if (quarter === 8) resetDeliveries(demand);", "closing");
    if (!flatIcons) {
      L = splice(L, N.absorb, "  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);", "icon absorption");
      L = splice(L, N.placeable, "  const direct = slots.filter((s) => !s.cross)\n    .reduce((n, s) => n + (s.levelIdx + 1), 0) * exchangeRate(state, biz);", "placeableFor");
    }
  }
  if (arm === "count" || arm === "band" || arm === "ranged") {
    /* The whole delivery is the band rule; nothing in the old body survives. */
    const from = L.indexOf(N.deliverHead), to = L.indexOf(N.deliverTail) + N.deliverTail.length;
    if (from < 0 || to < from) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }
    L = L.slice(0, from) + BAND_BODY + L.slice(to);
    L = splice(L, N.cardValue, "  let perQuarter = __pay(px, bp.lvl, reach === null ? 2 * bp.lvl : reach, bp.ind) - effOpex;", "card valuation");
    L = splice(L, N.upNow, "  const nowNet = __pay(px, b.level, sellableForBiz(state, p, b), bizInd(b)) - bizOpex(b) - RENT_PER_LEVEL * b.level;", "upgrade valuation (now)");
    L = splice(L, N.upGrown, "  const grownNet = __pay(px, grown.level, sellableForBiz(state, p, grown), bizInd(grown)) - bizOpex(grown) - 3 * grown.level;", "upgrade valuation (grown)");
    L = splice(L, N.mcTrade, "    const trade = __pay(price(state.pm, bizInd(b)), b.level, sellableForBiz(state, p, b), bizInd(b)) - bizOpex(b) - RENT_PER_LEVEL * b.level;", "megacorp trade");
  } else {
    const recycle = arm === "norecycle" ? 0 : 1;
    L = splice(L, N.deliverHead, N.deliverHead + "\n" + N_PROBE, "autoDeliver head");
    L = splice(L, N.deliverTail,
      `  const leftover = Math.max(0, remaining);\n  __probe.sale(bizInd(biz), biz.level, __n, earned, leftover, unitPrice(state, p, biz), bizProd(biz), __u);\n  p.cash += earned + leftover * ${recycle};\n}`, "autoDeliver tail");
    if (arm === "norecycle") {
      L = splice(L, N.cardValue, "  let perQuarter = sellable * px - effOpex;", "card valuation");
      L = splice(L, N.upNow, N.upNow.replace("* 1\n", "* 0\n"), "upgrade valuation (now)");
      L = splice(L, N.upGrown, N.upGrown.replace("* 1\n", "* 0\n"), "upgrade valuation (grown)");
      L = splice(L, N.mcTrade, N.mcTrade.replace("* 1 -", "* 0 -"), "megacorp trade");
    }
  }
  L = splice(L, N.land, LAND_PROBE, "land award");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, String, box, __probe: PROBE };
  vm.createContext(sandbox);
  vm.runInContext(L + `
    box.e = { initGame, advanceDraft, startPlanning, advancePlanning, epTotal, finalRank, activeBiz, bizInd, mulberry32,
              INDUSTRIES, SCALING, BP_DATA, CASH_PER_EP };
  `, sandbox);
  return box.e;
}

/* ---------------------------------------------------------------- the probe */
let CUR = null;                 // the per-game accumulator the engine writes into
const PROBE = {
  sale: (ind, lvl, n, earned, leftover, px, prod, u) => { if (CUR) CUR.sales.push({ ind, lvl, n, u, rev: earned + leftover * (CUR.recycle ? 1 : 0), leftover, px, prod, earned }); },
  land: (label, share, split) => { if (CUR) CUR.land.push({ share, split }); },
};

const quiet = () => {};
const QUARTERS = seenCounter("quarter markers on the log");
function play(E, arm, seats, seed) {
  CUR = { sales: [], land: [], recycle: arm !== "norecycle" };
  let st, seating;
  const marks = [];
  try {
    st = E.initGame(seats - 1, seed, ["Seat"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
    seating = [...st.turnOrder];
    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      const q = quarterOf(msg);
      if (q !== null) { QUARTERS.hit(); marks.push({ q, eps: st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) })) }); }
    });
  } catch (e) { CUR = null; return null; }
  if (!st || st.phase !== "gameover") { CUR = null; return null; }
  marks.push({ q: 13, eps: st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) })) });
  const out = CUR; CUR = null;
  out.st = st; out.seating = seating; out.marks = marks;
  return out;
}

function run(E, arm, seats) {
  const IND = E.INDUSTRIES;
  const bpInd = Object.fromEntries(E.BP_DATA.map((b) => [b.name, b.ind]));
  const T = {
    games: 0, trade: 0, solvency: 0, recycledUnits: 0, producedUnits: 0, winnerEP: 0,
    byInd: Object.fromEntries(IND.map((i) => [i, { rev: 0, n: 0 }])),
    byLvl: { 1: { rev: 0, n: 0 }, 2: { rev: 0, n: 0 }, 3: { rev: 0, n: 0 }, 4: { rev: 0, n: 0 } },
    hist: { 1: {}, 2: {}, 3: {}, 4: {} },           // icons reached, by level
    units: Object.fromEntries(IND.map((i) => [i, { 1: [], 2: [], 3: [], 4: [] }])),   // demand reached in units
    margin: 0, saleCount: 0, zero: 0,
    sx: 0, sy: 0, sxy: 0, sxx: 0, syy: 0,
    vTop: 0, hTop: 0, wins: new Array(seats).fill(0),
    changes: 0, wire: 0, decidedAt: 0, decided: 0,
  };
  for (let g = 1; g <= GAMES; g++) {
    const r = play(E, arm, seats, g);
    if (!r) continue;
    T.games++;
    const st = r.st;
    T.solvency += st.solvencyEvents || 0;
    for (const s of r.sales) {
      T.trade += s.rev; T.saleCount++;
      T.byInd[s.ind].rev += s.rev; T.byInd[s.ind].n++;
      const L = Math.min(4, Math.max(1, s.lvl));
      T.byLvl[L].rev += s.rev; T.byLvl[L].n++;
      T.hist[L][s.n] = (T.hist[L][s.n] || 0) + 1;
      T.units[s.ind][L].push(s.u);
      T.producedUnits += s.prod; T.recycledUnits += s.leftover;
      if (s.rev === 0) T.zero++;
      /* Would one more icon have paid? Under the shipped rule and flat1, yes whenever
         production outran the icons; under norecycle the same; under count whenever
         the company was under its cap; under band only one icon short of a step. */
      const oneMore = (arm === "ranged") ? (() => { const r = (RANGED[s.ind] || {})[Math.min(4, s.lvl)]; return !!r && (s.u === r.a - 1 || s.u === r.b - 1); })()
        : (arm === "band") ? (s.n === s.lvl - 1 || s.n === 2 * s.lvl - 1)
        : (arm === "count") ? (s.n < 2 * s.lvl)
        : (s.leftover > 0);
      if (oneMore) T.margin++;
      T.sx += s.px; T.sy += s.rev; T.sxy += s.px * s.rev; T.sxx += s.px * s.px; T.syy += s.rev * s.rev;
    }
    /* EP by industry: what companies banked, what debuts paid, and the land awards
       split across whatever earned them. */
    const epBy = Object.fromEntries(IND.map((i) => [i, 0]));
    for (const p of st.players) for (const e of (p.epLog || [])) {
      const s = String((e.label && e.label.k) || e.label);
      let m = /^Company: (.+) L\d+$/.exec(s); if (m && bpInd[m[1]]) { epBy[bpInd[m[1]]] += e.amount; continue; }
      m = /^Entered (\w\w)/.exec(s); if (m && epBy[m[1]] !== undefined) epBy[m[1]] += e.amount;
    }
    for (const a of r.land) {
      const tot = Object.values(a.split.w).reduce((x, y) => x + y, 0) + a.split.bare;
      if (tot <= 0) continue;
      for (const i of IND) if (a.split.w[i]) epBy[i] += (a.share * a.split.w[i]) / tot;
    }
    const best = Math.max(...IND.map((i) => epBy[i]));
    const tops = IND.filter((i) => epBy[i] === best);
    for (const i of tops) { if (E.SCALING[i] === "V") T.vTop += 1 / tops.length; else T.hTop += 1 / tops.length; }
    /* The winner, by seat. */
    const winner = [...st.players].sort(E.finalRank)[0];
    T.winnerEP += E.epTotal(winner);
    const seat = r.seating.indexOf(winner.id);
    if (seat >= 0) T.wins[seat]++;
    /* Lead changes, as audit_tension counts them. */
    let leader = null, changes = 0, lastTook = null;
    for (const mk of r.marks) {
      const top = Math.max(...mk.eps.map((x) => x.ep));
      if (top <= 0) continue;
      const tied = mk.eps.filter((x) => x.ep === top).map((x) => x.id);
      if (leader === null || !tied.includes(leader)) {
        if (leader !== null) changes++;
        leader = tied[0];
        if (leader === winner.id) lastTook = mk.q;
      }
    }
    T.changes += changes; if (changes === 0) T.wire++;
    if (lastTook !== null) { T.decidedAt += Math.min(12, lastTook); T.decided++; }
  }
  return T;
}

/* ---------------------------------------------------------------- report */
const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pct = (x, t) => (t > 0 ? (100 * x / t).toFixed(1) + "%" : "-");
const money = (x) => "$" + x.toFixed(x < 10 ? 1 : 0);

console.log(`\n${GAMES} games an arm a table size, seeds 1..${GAMES}, all-bot tables.  ` +
  (SHIFT ? "Band SHIFTS the column read: triangle 0.5/1/3/6/10/15 at level + band - 2." : `Band K = ${K.join("/")}${TRI ? ", paid by the triangle of the level (1/3/6/10)" : ", paid by the level"}.`) +
  (STOCK ? "  --stock: icons consumed and absorbing their column, as the engine played before v22." : "  Demand is a rate, as the engine ships since v22: never consumed, one unit an icon.") +
  (ROWS_OLD ? "  DEMAND TABLE: the v20 rows (before the redraw)." : ""));
if (ARMS.includes("ranged")) console.log("  ranged table " + (fs.existsSync(RANGED_FILE) ? "from ranged_table.json" : "PROVISIONAL, built in") + ": " +
  Object.entries(RANGED).map(([i, t]) => i + " " + [1, 2, 3, 4].map((L) => `${t[L].a}/${t[L].b}:${t[L].m.join("-")}`).join(" ")).join("  "));
console.log("  " + ["current  as it ships", "flat1    an icon takes one unit", "norecycle  unsold production pays nothing",
  "count    price x icons filled, up to 2 x level", "band     price x level x K by band", "ranged   the designer's ranges, by units of demand reached"].filter((d) => ARMS.includes(d.split(/\s+/)[0])).join("\n  "));

const R = {};
for (const arm of ARMS) {
  const E = engine(arm);
  R[arm] = {};
  for (const n of SIZES) R[arm][n] = { T: run(E, arm, n), IND: E.INDUSTRIES };
}
QUARTERS.assert();   // the lead-change columns are read off the log; silence there is a bug, not a result

for (const n of SIZES) {
  console.log("\n" + "=".repeat(78));
  console.log(`${n} PLAYERS`);
  console.log("=".repeat(78));
  const IND = R[ARMS[0]][n].IND;
  const line = (label, f) => console.log("  " + pad(label, 34) + ARMS.map((a) => rp(f(R[a][n].T, a), 11)).join(""));
  console.log("  " + pad("", 34) + ARMS.map((a) => rp(a, 11)).join(""));
  console.log("  THE ECONOMY");
  line("trade income a game", (T) => money(T.trade / Math.max(1, T.games)));
  line("revenue a company-quarter", (T) => money(T.trade / Math.max(1, T.saleCount)));
  for (const i of IND) line("    " + i, (T) => (T.byInd[i].n ? money(T.byInd[i].rev / T.byInd[i].n) : "-"));
  for (const L of [1, 2, 3, 4]) line("    level " + L, (T) => (T.byLvl[L].n ? money(T.byLvl[L].rev / T.byLvl[L].n) : "-"));
  line("quarters a company earned $0", (T) => pct(T.zero, T.saleCount));
  line("production recycled", (T, a) => (a === "band" || a === "count") ? "n/a" : pct(T.recycledUnits, T.producedUnits));
  line("solvency events a game", (T) => (T.solvency / Math.max(1, T.games)).toFixed(2));
  line("winning score (EP)", (T) => (T.winnerEP / Math.max(1, T.games)).toFixed(1));
  console.log("  WHO WINS");
  line("vertical RE HO HC bank most EP", (T) => pct(T.vTop, T.games));
  line("horizontal UT MA TE", (T) => pct(T.hTop, T.games));
  for (let s = 0; s < n; s++) line("    win rate, seat " + (s + 1), (T) => pct(T.wins[s], T.games));
  line("    seat spread", (T) => ((100 * (Math.max(...T.wins) - Math.min(...T.wins))) / Math.max(1, T.games)).toFixed(1));
  console.log("  THE SHAPE OF THE GAME");
  line("lead changes a game", (T) => (T.changes / Math.max(1, T.games)).toFixed(2));
  line("wire to wire", (T) => pct(T.wire, T.games));
  line("winner last took the lead, Q", (T) => (T.decidedAt / Math.max(1, T.decided)).toFixed(1));
  console.log("  WHAT THE TABLE IS DOING");
  line("revenue-price correlation", (T) => {
    const m = T.saleCount; if (!m) return "-";
    const cov = T.sxy / m - (T.sx / m) * (T.sy / m);
    const vx = T.sxx / m - (T.sx / m) ** 2, vy = T.syy / m - (T.sy / m) ** 2;
    return vx > 0 && vy > 0 ? (cov / Math.sqrt(vx * vy)).toFixed(2) : "-";
  });
  line("one more icon would have paid", (T) => pct(T.margin, T.saleCount));
  /* How much demand a company actually sees - the figure the band thresholds have
     to be read against. Printed for the first arm only: icons by level, then UNITS by
     industry and level, which is what the designer's ranges are written in. */
  const T0 = R[ARMS[0]][n].T;
  console.log(`\n  DEMAND REACHED, IN UNITS, by industry and level (${ARMS[0]} arm) - share at zero, median, 90th percentile, max`);
  console.log("  " + pad("", 8) + [1, 2, 3, 4].map((L) => rp("level " + L, 22)).join(""));
  for (const i of IND) {
    const cells = [1, 2, 3, 4].map((L) => {
      const a = T0.units[i][L].slice().sort((x, y) => x - y); if (!a.length) return rp("-", 22);
      const q = (f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
      const zero = a.filter((x) => x === 0).length;
      return rp(`${(100 * zero / a.length).toFixed(0)}%0 ${q(0.5)} ${q(0.9)} max${a[a.length - 1]} (${a.length})`, 22);
    });
    console.log("  " + pad(i, 8) + cells.join(""));
  }
  console.log(`\n  ICONS REACHED BY A COMPANY, by level (${ARMS[0]} arm) - share of company-quarters`);
  console.log("  " + pad("", 12) + [0, 1, 2, 3, 4, 5, 6, 7, 8, "9+"].map((k) => rp(k, 6)).join(""));
  for (const L of [1, 2, 3, 4]) {
    const h = T0.hist[L], tot = Object.values(h).reduce((a, b) => a + b, 0);
    if (!tot) continue;
    const cell = (k) => { let c = 0; for (const [nn, v] of Object.entries(h)) { const x = +nn; if ((k === "9+" && x >= 9) || x === k) c += v; } return (100 * c / tot).toFixed(0) + "%"; };
    console.log("  " + pad("level " + L + "  (" + tot + ")", 12) + [0, 1, 2, 3, 4, 5, 6, 7, 8, "9+"].map((k) => rp(cell(k), 6)).join(""));
  }
}
console.log("");
