/* ============================================================================
   What each industry is actually worth - not how often it is built.

   THE OLD READ was two counts: companies built per industry, and the share of
   games the winner held one. Both are shallow. Cheap industries get built more;
   companies held at the end may have been built in the last quarter to bank
   level EP off whatever cards were in hand. And the horizontal industries are
   MEANT to be built less - spreading over plots is the harder thing to arrange -
   which is what lets their price climb, which is what tempts the late gamble.

   So this reads the LEDGER of every company from the moment it is built:

     REVENUE     cash from deliveries, and the $1 a unit for what nobody bought
     COSTS       setup at launch, setup again at each upgrade, the supplier bill
                 and the ground rent every quarter it stood
     EP          level EP banked on completion and upgrade, the industry debut
     WHAT HAPPENED TO IT   sold in solvency, sold otherwise (Raise Capital, or
                 to cover a bill), merged into a Megacorp, chosen as its HQ,
                 or still standing at the end

   and RECYCLING - production that found no buyer - by industry, and by quarter
   across the whole table, which is the shape of demand against supply as the
   game goes on.

   WHAT IT FOUND - 200 games at three seats, 150 at four.

   RETAIL IS NOT IN THE SAME GAME AS THE REST. Net cash per dollar of setup,
   over a company's whole life:

     RE 6.16   HO 2.87   UT 2.29   MA 1.21   TE 0.97   HC 0.53     (3 players)
     RE 5.82   HO 3.38   UT 2.73   MA 1.51   TE 0.93   HC 0.62     (4 players)

   More than twice the next best at both counts. It is also built most often
   (2.46 a game at three seats), built earliest (mean quarter 4.0), upgraded
   most (82%) and stands longest (7.7 quarters). It earns $307 a company where
   Technology earns $90. Three playtesters have said the industries feel
   unbalanced without naming which; this is which.

   Healthcare and Technology are the other end, and they fail differently.
   Healthcare is an EP play that loses money - 11.7 EP a company, the joint
   best, on 0.53 cash per dollar - while Technology is neither, at 0.97 cash
   and 9.5 EP, built last (mean quarter 7.4) and least (0.96 a game).

   AND THE DEMAND BOARD SATURATES. Production outruns the icons badly, and the
   share of everything made that gets recycled at $1 climbs through the game:

     3 players   55% 49% 47% 53% | 27% 44% 54% 59% | 10% 23% 39% 56%
     4 players   55% 54% 50% 54% | 27% 46% 56% 63% | 11% 26% 49% 66%

   The two drops are Q5, when rows 3 and 4 open, and Q9, after the grid is
   wiped at the end of Q8 - both work, and both are swallowed again within
   three quarters. By the last quarter of a four-player game TWO THIRDS of
   everything produced is being thrown away at a dollar. That is the economic
   shape behind "I couldn't sell my products due to market limitations" and
   behind the late game feeling flat: the third year is played on a board that
   cannot absorb what the table builds. It also means a shorter game loses
   less than the clock suggests, because the quarters being cut are the ones
   where half of production is already worthless.

   ARMS, added later. By default this reads the shipped game; the flags listed
   above the splices let the same ledger be read against the proposed retune.
   Two warnings from using them. The arms STACK, so --pool2 alone is the shipped
   economy on a different board, not the proposal. And 200 games is not enough
   to compare industries this way: three disjoint 200-game blocks of identical
   rules put Hospitality's net cash per dollar at 4.25, 5.93 and 5.43. Run 2000,
   and run a second block with --off to see the noise before believing a gap.

   Run: node audit_industries.js [games a table size] [seats...] [arms...]
        node audit_industries.js 2000 3 4 --flow --tuned
        node audit_industries.js 2000 3 4 --flow --tuned --off 5000   (control)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "200", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* ---------------------------------------------------------------------------
   ARMS. By default this reads the shipped game. Each flag below swaps one part
   of the proposed retune in, so the per-company ledger can be read against a
   rule the repo does not implement yet. They stack in the order written.

     --flow    demand as a rate: an icon absorbs one unit, is never consumed,
               and stays open to everyone (audit_demand_flow.js owns this one)
     --tuned   + cash at $65 an EP and the three-value setup/opex ladders
     --p2      with --tuned, the second ladder pairing instead of the first
     --pool    the suburb pool flattened to R4 C4 A4 I4
     --pool2   the suburb pool tipped to R3 C3 A5 I5
     --off N   start from seed N+1 instead of 1, for a disjoint sample

   Every flag is a splice on an exact fragment, so a fragment that has moved
   stops the probe rather than letting it quietly measure the shipped game.
   --------------------------------------------------------------------------- */
function need(frag, what) {
  if (!logic.includes(frag)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); }
}
/* v22 SHIPPED THE RATE RULE: an icon absorbs one unit from every company that reaches it,
   every quarter, and is never used up. The needles below anchor on that shape. */
const CONSUME = `  markSlotUsed(state.demand, biz.id, tileKey, rowIdx, levelIdx);
  return cross ? 1 : exchangeRate(state, biz);`;
need(CONSUME, "the delivery rule");
/* --flow SHIPPED in v22 - the engine plays the rate rule; the flag is accepted and does nothing. */

if (process.argv.includes("--tuned")) {
  need("const CASH_PER_EP = 50;", "the cash-to-EP rate");
  logic = logic.replace("const CASH_PER_EP = 50;", "const CASH_PER_EP = 65;");
  /* The card economics live in one JSON literal, so they are retuned by parsing
     it, changing the numbers and putting it back, not by a text substitution
     that would have to match every card individually. */
  const m = logic.match(/const BP_DATA = (\[.*?\]);/s);
  if (!m) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
  const cards = JSON.parse(m[1]);
  const SETUP = { cheap: [10, 15, 25], mid: [15, 25, 40], dear: [20, 35, 60] };
  const OPEX  = { low:   [4, 7, 10],   mid: [5, 9, 14],   high: [6, 10, 16] };
  /* P1: the mid setup ladder is unified at 15/25/40 so the attribute has three
     values rather than four, and opex is re-paired - UT swaps with HC, RE with
     TE - which is the fewest moves that makes every industry's weight zero. */
  const P1_SETUP = { UT: "mid", RE: "cheap", HO: "cheap", MA: "dear", HC: "dear", TE: "mid" };
  const P1_OPEX  = { UT: "mid", RE: "high",  HO: "high",  MA: "low",  HC: "low",  TE: "mid" };
  /* P2: opex untouched, setup re-paired instead - cheap goes to HO and TE, mid
     to RE and HC, dear to UT and MA. */
  const P2_SETUP = { UT: "dear", RE: "mid", HO: "cheap", MA: "dear", HC: "mid", TE: "cheap" };
  const P2_OPEX  = { UT: "low",  RE: "mid", HO: "high",  MA: "low",  HC: "mid", TE: "high" };
  const P = process.argv.includes("--p2") ? { s: P2_SETUP, o: P2_OPEX } : { s: P1_SETUP, o: P1_OPEX };
  for (const c of cards) {
    c.setup = SETUP[P.s[c.ind]][c.lvl - 1];
    c.opex  = OPEX[P.o[c.ind]][c.lvl - 1];
  }
  logic = logic.replace(m[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
}

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
if (process.argv.includes("--rows2")) {
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
if (process.argv.includes("--rows3")) {
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
if (process.argv.includes("--rows4")) {
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
if (process.argv.includes("--rows5")) {
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
if (process.argv.includes("--strat")) {
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
if (process.argv.includes("--rows6")) {
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
if (process.argv.includes("--rows7")) {
  if (!logic.includes(ROWS_NOW)) { console.error("the demand table moved - update this probe"); process.exit(2); }
  logic = logic.replace(ROWS_NOW, ROWS7);
}







/* --sheet2 / --sheet2pay: the spreadsheet revamp's level-1 set, doubling per
   level. Carried here so the per-industry LEDGER - and in particular the share
   of production that finds no icon - can be read against it. */
const SHEET2 = { UT: { setup: 20, opex: 6,  prod: 3 }, RE: { setup: 10, opex: 8,  prod: 4 },
                 HO: { setup: 15, opex: 6,  prod: 2 }, MA: { setup: 15, opex: 12, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
const SHEET2_PAY = { UT: 15, RE: 20, HO: 10, MA: 20, HC: 15, TE: 10 };
if (process.argv.includes("--sheet2") || process.argv.includes("--sheet2pay")) {
  const pay = process.argv.includes("--sheet2pay");
  const m = logic.match(/const BP_DATA = (\[.*?\]);/s);
  if (!m) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
  const cards = JSON.parse(m[1]);
  for (const c of cards) {
    const mul = 1 << (c.lvl - 1), b = SHEET2[c.ind];
    c.setup = (pay ? SHEET2_PAY[c.ind] : b.setup) * mul;
    c.opex = b.opex * mul; c.prod = b.prod * mul;
  }
  logic = logic.replace(m[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
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
const CARDS0 = JSON.parse(logic.match(/const BP_DATA = (\[.*?\]);/s)[1]);   // as printed today
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
const V5 = process.argv.includes("--v5") || process.argv.includes("--v5b");
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
      const b = (process.argv.includes("--v5b") ? SHEET5B : V5 ? SHEET5 : V4 ? SHEET4 : SHEET3)[c.ind];
      if (process.argv.includes("--lvlkeep") || (V5 && !process.argv.includes("--double"))) {
        const base = CARDS0.find((x) => x.ind === c.ind && x.lvl === 1);
        c.setup = Math.round((b.setup * c.setup) / base.setup);
        c.opex = Math.round((b.opex * c.opex) / base.opex);
      } else { c.setup = b.setup * mul; c.opex = b.opex * mul; }
      c.prod = b.prod * mul;
    }
  }
  return out.replace(m[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
}
logic = applySheet3(logic);

/* The demand table itself cannot be re-paired - audit_demand_table.js proves
   that by enumeration. The one lever that moves demand volume or spread is the
   SUBURB POOL: how many of the sixteen suburb tiles belong to each family, since
   both numbers are weighted sums of those counts. A tile keeps its four plot
   positions when it changes family, so the only physical change is which 4x4
   demand grid is printed on it. */
const POOL_LINE = `const SUBURB_POOL = ["R1", "R2", "R3", "R4", "R5", "C1", "C2", "C3", "C4", "C5", "A1", "A2", "A3", "I1", "I2", "I3"];`;
function relabel(renames, pool) {
  need(POOL_LINE, "the suburb pool");
  for (const [from, to] of Object.entries(renames)) {
    const frag = `${from}: [`;
    const hits = logic.split(frag).length - 1;
    if (hits !== 1) { console.error(`tile ${from} is declared ${hits} times - update this probe`); process.exit(2); }
    logic = logic.replace(frag, `${to}: [`);
  }
  logic = logic.replace(POOL_LINE, `const SUBURB_POOL = ${JSON.stringify(pool)};`);
}
if (process.argv.includes("--pool"))
  relabel({ R5: "A4", C5: "I4" },
    ["R1", "R2", "R3", "R4", "C1", "C2", "C3", "C4", "A1", "A2", "A3", "A4", "I1", "I2", "I3", "I4"]);
if (process.argv.includes("--pool2"))
  relabel({ R4: "A4", R5: "A5", C4: "I4", C5: "I5" },
    ["R1", "R2", "R3", "C1", "C2", "C3", "A1", "A2", "A3", "A4", "A5", "I1", "I2", "I3", "I4", "I5"]);

/* Every hook is a splice on an exact line, and a line that has moved stops the probe
   rather than letting it measure half a ledger. */
const HOOKS = [
  ["a sale",     "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;",
                 "  const leftover = Math.max(0, remaining);\n  __probe.sale(state, p, biz, earned, leftover, bizProd(biz));\n  p.cash += earned + leftover * 1;"],
  ["a launch",   "  const biz = newBusiness(bp, footprint, state.quarter, state);",
                 "  const biz = newBusiness(bp, footprint, state.quarter, state);\n  __probe.launch(state, p, biz, bp.setup);"],
  ["an upgrade", "  b.upgraded = true; b.level += 1;\n  b.scored = false;",
                 "  __probe.upgrade(state, p, b, bizSetup(b));\n  b.upgraded = true; b.level += 1;\n  b.scored = false;"],
  ["the bills",  "      const cost = supplierBill + rentBill;",
                 "      const cost = supplierBill + rentBill;\n      __probe.bill(state, p, b, supplierBill, rentBill);"],
  ["a company sold", "function sellCompany(state, p, b, solvency = false) {\n  let recv;",
                 "function sellCompany(state, p, b, solvency = false) {\n  __probe.sold(b, solvency);\n  let recv;"],
  ["a merger",   "  const hq = hqChoice && match.have.includes(hqChoice) ? hqChoice : pickHQ(state, p, match.have, tierOfTile(match.tile));",
                 "  const hq = hqChoice && match.have.includes(hqChoice) ? hqChoice : pickHQ(state, p, match.have, tierOfTile(match.tile));\n  __probe.merge(state, p, match.have, hq);"],
];
for (const [what, find, put] of HOOKS) {
  if (!logic.includes(find)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); }
  logic = logic.replace(find, put);
}

/* One ledger per company, keyed by industry code + business id within a game. */
let L = null;   // the current game's ledgers
const key = (b) => b.__k || (b.__k = `${b.bp.ind}#${b.id}#${b.quarterBuilt}`);
const ledger = (b) => L.get(key(b)) || (L.set(key(b), { ind: b.bp.ind, lvl0: b.bp.lvl, built: b.quarterBuilt,
  revenue: 0, recycled: 0, prod: 0, y1rev: 0, y1prod: 0, y1left: 0, setup: 0, suppliers: 0, rent: 0, quarters: 0, upgraded: false,
  soldSolvency: false, soldOther: false, merged: false, hq: false }), L.get(key(b)));
const probe = {
  sale: (state, p, biz, earned, leftover, prod) => { const l = ledger(biz); l.revenue += earned + leftover; l.recycled += leftover; l.prod += prod;
    if (state.quarter <= 4) { l.y1rev += earned + leftover; l.y1prod += prod; l.y1left += leftover; }
    RQ[state.quarter] = RQ[state.quarter] || { prod: 0, left: 0 }; RQ[state.quarter].prod += prod; RQ[state.quarter].left += leftover; },
  launch: (state, p, biz, setup) => { ledger(biz).setup += setup; },
  upgrade: (state, p, b, setup) => { const l = ledger(b); l.setup += setup; l.upgraded = true; },
  bill: (state, p, b, sup, rent) => { const l = ledger(b); l.suppliers += sup; l.rent += rent; l.quarters++; },
  sold: (b, solvency) => { const l = ledger(b); if (solvency) l.soldSolvency = true; else l.soldOther = true; },
  merge: (state, p, have, hq) => { for (const b of have) { const l = ledger(b); l.merged = true; if (b === hq) l.hq = true; } },
};
let RQ = {};   // recycling by quarter, this game

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES, IND_NAME, SCALING, BP_DATA, levelEP, INDUSTRY_DEBUT_EP };
`, sandbox);
const E = box.E;
const bpInd = {}; E.BP_DATA.forEach((bp) => { bpInd[bp.name] = bp.ind; });

function run(seats) {
  const T = {}; E.INDUSTRIES.forEach((i) => { T[i] = { n: 0, built: 0, lvl2plus: 0, upgraded: 0, revenue: 0, recycled: 0, prod: 0, y1rev: 0, y1prod: 0, y1left: 0, bornY1: 0,
    setup: 0, suppliers: 0, rent: 0, quarters: 0, ep: 0, soldSolvency: 0, soldOther: 0, merged: 0, hq: 0, standing: 0 }; });
  const RQall = {}; let games = 0;
  const OFF = (() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) : 0; })();
  for (let seed = 1 + OFF; seed <= GAMES + OFF; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    L = new Map(); RQ = {};
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
    /* EP by industry from the game's own labels: "Company: <name> L<n>" and "Entered <IND>". */
    const epBy = {}; E.INDUSTRIES.forEach((i) => { epBy[i] = 0; });
    for (const p of st.players) for (const e of (p.epLog || [])) {
      const s = String(e.label);
      let m = /^Company: (.+) L\d+$/.exec(s); if (m && bpInd[m[1]]) { epBy[bpInd[m[1]]] += e.amount; continue; }
      m = /^Entered (\w\w)/.exec(s); if (m && epBy[m[1]] !== undefined) epBy[m[1]] += e.amount;
    }
    const alive = new Set(); for (const p of st.players) for (const b of p.businesses) if (!b.distressed) alive.add(key(b));
    for (const [k, l] of L) {
      const t = T[l.ind]; t.n++; t.built += l.built; if (l.lvl0 >= 2) t.lvl2plus++; if (l.upgraded) t.upgraded++;
      t.revenue += l.revenue; t.recycled += l.recycled; t.prod += l.prod; t.y1rev += l.y1rev; t.y1prod += l.y1prod; t.y1left += l.y1left;
      if (l.built <= 4) t.bornY1++; t.setup += l.setup; t.suppliers += l.suppliers; t.rent += l.rent; t.quarters += l.quarters;
      if (l.soldSolvency) t.soldSolvency++; else if (l.soldOther) t.soldOther++;
      if (l.merged) t.merged++; if (l.hq) t.hq++; if (alive.has(k) && !l.merged) t.standing++;
    }
    for (const i of E.INDUSTRIES) T[i].ep += epBy[i];
    for (const q of Object.keys(RQ)) { RQall[q] = RQall[q] || { prod: 0, left: 0 }; RQall[q].prod += RQ[q].prod; RQall[q].left += RQ[q].left; }
  }
  return { T, RQall, games };
}

const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
const pc = (a, b) => (b > 0 ? (100 * a / b).toFixed(0) + "%" : "-");
for (const seats of SIZES) {
  const { T, RQall, games } = run(seats);
  console.log(`\n${"=".repeat(96)}\n${seats} PLAYERS  -  ${games} games\n${"=".repeat(96)}`);
  const cols = E.INDUSTRIES.map((i) => rp(`${i} ${E.SCALING[i]}`, 12)).join("");
  const row = (label, fn) => console.log("  " + pad(label, 34) + E.INDUSTRIES.map((i) => rp(fn(T[i]), 12)).join(""));
  console.log("  " + pad("", 34) + cols);
  row("companies built a game", (t) => (t.n / games).toFixed(2));
  row("  built as a level 2-3 card", (t) => pc(t.lvl2plus, t.n));
  row("  later upgraded", (t) => pc(t.upgraded, t.n));
  row("  mean quarter built", (t) => (t.built / Math.max(1, t.n)).toFixed(1));
  row("  quarters stood, on average", (t) => (t.quarters / Math.max(1, t.n)).toFixed(1));
  console.log("  " + pad("PER COMPANY, over its life", 34));
  row("  revenue (deliveries + recycling)", (t) => "$" + (t.revenue / Math.max(1, t.n)).toFixed(0));
  row("  setup paid (launch + upgrades)", (t) => "$" + (t.setup / Math.max(1, t.n)).toFixed(0));
  row("  supplier bills", (t) => "$" + (t.suppliers / Math.max(1, t.n)).toFixed(0));
  row("  ground rent", (t) => "$" + (t.rent / Math.max(1, t.n)).toFixed(0));
  row("  NET CASH", (t) => "$" + ((t.revenue - t.setup - t.suppliers - t.rent) / Math.max(1, t.n)).toFixed(0));
  row("  net cash per $ of setup", (t) => ((t.revenue - t.setup - t.suppliers - t.rent) / Math.max(1, t.setup)).toFixed(2));
  row("  EP (levels + debut)", (t) => (t.ep / Math.max(1, t.n)).toFixed(1));
  row("  EP per $ of setup", (t) => (t.ep / Math.max(1, t.setup) * 10).toFixed(2) + "/10$");
  row("  net cash per quarter stood", (t) => "$" + ((t.revenue - t.suppliers - t.rent) / Math.max(1, t.quarters)).toFixed(1));
  console.log("  " + pad("WHAT BECAME OF IT", 34));
  row("  sold in solvency", (t) => pc(t.soldSolvency, t.n));
  row("  sold otherwise", (t) => pc(t.soldOther, t.n));
  row("  merged into a Megacorp", (t) => pc(t.merged, t.n));
  row("    ...and kept as its HQ", (t) => pc(t.hq, Math.max(1, t.merged)));
  row("  still standing at the end", (t) => pc(t.standing, t.n));
  console.log("  " + pad("HOW MUCH OF IT IS YEAR 1", 34));
  row("  built in Q1-Q4", (t) => pc(t.bornY1, t.n));
  row("  of its production, made in Y1", (t) => pc(t.y1prod, t.prod));
  row("  of its revenue, earned in Y1", (t) => pc(t.y1rev, t.revenue));
  row("  Y1 production recycled", (t) => pc(t.y1left, t.y1prod));
  console.log("  " + pad("RECYCLED AT $1", 34));
  row("  share of its production", (t) => pc(t.recycled, t.prod));
  const qs = Object.keys(RQall).map(Number).sort((a, b) => a - b);
  console.log("  " + pad("by quarter, whole table", 34) + qs.map((q) => rp("Q" + q, 6)).join(""));
  console.log("  " + pad("  recycled share", 34) + qs.map((q) => rp(pc(RQall[q].left, RQall[q].prod), 6)).join(""));
  console.log("  " + pad("  units made a game", 34) + qs.map((q) => rp((RQall[q].prod / games).toFixed(0), 6)).join(""));
}
console.log("");
