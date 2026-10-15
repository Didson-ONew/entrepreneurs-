/* ============================================================================
   THE SUPPLY GRAPH: who pays whom, and who the loop quietly favours.

   Every Blueprint lists one supplier at level 1, two at level 2 and three at
   level 3. Each quarter a company pays its OPEX, of which ground rent (2 a
   level) goes to whoever owns its land and the REST goes into its suppliers'
   pots, split in proportion to the `val` printed beside each one. At Revenue
   each pot is divided equally among that industry's active companies - one
   share each whatever the level - and a pot with nobody to pay is written off at
   the end of that quarter.

   THE GRAPH IS PERFECTLY REGULAR AND THE MONEY IS NOT. Every industry buys from
   exactly three others and is listed by exactly seventeen cards, so the slot
   count is identical six ways. What differs is what flows down those slots,
   because the bill is the buyer's opex.

   And the deps list drives TWO channels, not one. Besides the pot, building a
   company moves the price track: its own industry down a dollar, each supplier
   it lists up a dollar (onLaunch). So an industry's price is lifted by how often
   its CUSTOMERS get built - which is a second, separate way the same asymmetry
   reaches the table, and this one touches every holder, not just the few who
   draw from the pot.

   Run: node audit_supply.js [games a table size] [seats...] [arms...]
        --paper    the graph, the vals and the rent leak, then stop
        --flow     demand as a rate (see audit_demand_flow.js)
        --sheet2   the proposed card set, --sheet2pay its payback-levelled setup
        --rows6    the proposed demand table   --strat  the stratified draw
        --off N    start from seed N+1, for a same-rules control block
   And candidate repairs to the loop itself:
        --carry    put back the old rule, where a pot with nobody to pay rode forward
        --bylevel  the pot splits in proportion to level, instead of one share each
        --nohq     a headquarters stops drawing a share it paid nothing into
        --graph N  re-point WHO supplies whom, holding every val and every template:
                   `prism` makes the graph fully reciprocal with the smallest edit,
                   `heavy` does the same but puts the three big payers in one triangle
        --grow N   what growing a company does to its opex, instead of doubling it
   And the configuration on the spreadsheet, whole or in thirds:
        --v3       all of it: --sheet3 --rows8 --strat --graph sheet
        --sheet3   its level-1 attributes   --rows8  its demand table
        --graph sheet   its supplier matrix, --graph sheetB the one its B2B row implies
        --v4       the next revision: --sheet4 --rows9 --strat --graph sheet4

   WHAT IT FOUND, 1500 games a table size, three players, with a disjoint block of
   the same rules as the control:

   ON PAPER the loop is nearly fair - collects spread 1.48x, nets inside $10. IN PLAY
   it spreads 3.46x (control 3.63x), because the bill is the BUYER's opex, so every
   dollar follows the build rate and not the printed val. Retail and Hospitality cost
   $10 to enter, get built constantly, and fund the whole sector ($173 and $171 a game
   out). Manufacturing costs $20, is barely built, and collects $125. Technology's
   paper net of -6.2 measures as +67.

   AND THE PER-COMPANY RETURN RUNS BACKWARDS TO THE BUILD RATE. A Hospitality company
   draws $5.40 a quarter from its pot, a Technology company $16.30 - 3.0x, and purely
   because there is nobody to share with (pots split between 1.3 and 1.8 ways). It is a
   real corrective on the setup ladder, but it is conditional on being ALONE: the second
   player in halves it. A first-mover prize, not a standing subsidy.

   THE EMPTY POT WAS THE SHARPEST EDGE ON THE BOARD AND IS NOW WRITTEN OFF. Under the
   old rule - still measurable with --carry - a pot with nobody to pay rode forward and
   grew, so the industry nobody served became the best-paid thing on the board. Over 400
   games a table size on the shipped cards, --carry banks a pot of up to $355, hands out a
   single scoop of up to $342, and pays a mean scoop of $31-$67 to whoever happens to
   enter first. Written off, the same seeds give a biggest pot of $76, a biggest scoop of
   $66 and a mean of $8-$19. Both maxima grow with the number of games measured; the means
   do not, and they are the number to quote.

   WHAT THE RULE DOES NOT DO is change WHO the pot favours. Per-company return spreads
   1.86x written off against 1.89x carried at three players, 1.96x against 1.95x at four:
   the rule scales every share down by about 40% and leaves the ranking alone. (An earlier
   run of this header claimed 3.0x -> 2.3x. That was measured on the pre-rebalance card
   set, where the spread was 3.0x to begin with.)

   AND IT IS A TRADE, NOT A FREE FIX. Quarter-to-quarter emptiness does not move - 3.40
   empty industry-quarters a game written off against 3.58 carried at three players, 2.63
   against 2.58 at four, which flips sign between table sizes and is inside noise. What
   moves is whether anybody turns up at ALL: measured in audit_setup --tails against the
   commit before the rule, the deadest industry goes a whole game unentered in 26.1% of
   games against 23.9% at three players, and 11.9% against 10.7% at four. A banked prize
   was pulling players into industries nobody else wanted, and removing it leaves those
   industries emptier. The judgement shipped is that an uncontested $342 late in a game
   decided by a few EP is the worse of the two.

   THE SECOND CHANNEL REINFORCES THE FIRST. onLaunch moves the price track too, and an
   industry's price is lifted by how often its CUSTOMERS are built. MA +$1.9 and TE +$2.1
   a game gain most on price AND collect most from pots; HO nets +$0.2 and is the biggest
   payer. Small in dollars, but aligned, so it adds to the imbalance instead of damping it.

   GROWTH IS WHERE THE MAGNITUDE COMES FROM. Growing a company DOUBLES its opex and adds
   a level, while ground rent only rises $2, so the supplier bill climbs faster than the
   level: a Retail L2 owes $9-4=$5 a quarter, the same card grown owes $18-6=$12, and a
   grown L3 owes $28-8=$20. Note the rung labels - growing adds a level, so "L3+" is a
   level-2 Blueprint that grew and a grown L3 stands at L4. Grown companies are 83% of
   Retail's entire supplier spend ($142.50 of $172.70 a game), 67% of Healthcare's and
   65% of Hospitality's - against 29% of Manufacturing's, which is $6.10 a game. A 23x
   gap in what growth contributes.

   BUT IT IS NOT WHERE THE RANKING COMES FROM, and that is the surprise. --grow 1 holds
   opex flat through growth and HALVES the money moving through the whole B2B economy
   ($477 collected a game to $248), for a spread of 2.95x against a 3.46x-3.63x baseline
   and a per-company spread that does not move at all (3.0x to 2.8x at three players, 3.0x
   to 3.0x at four). The compounding explains how BIG Retail's outflow is; the ranking
   survives flattening it, because Retail and Hospitality are still built far more often
   at every rung. A very large economy-wide change for a gain inside the noise.

   WHAT MOVES IT, ranked:
     the opex set (--sheet2)   3.46x -> 1.81x. The only thing that moves the macro flow
                               without shrinking it, and it cuts Retail's reliance on
                               growth from 83% to 63% as a side effect, by front-loading
                               the bill at level 1 (proposed MA opex is 12 against 4).
     the empty-pot rule        SHIPPED, and the one change here that reached the
                               rulebook. --carry puts the old rule back for comparison:
                               worst scoop $66 -> $342 and every share up about 40%.
     --graph heavy             per-company 3.0x -> 2.1x. Nothing on the flow (inside noise).
     both together             collects 1.84x, per-company 1.57x, worst scoop $85.

   WHAT DOES NOT, recorded so it is not tried twice:
     --bylevel   dead. Weighting a split that usually has ONE participant moves $0.1.
     --nohq      dead, and slightly the wrong way: removing a splitter RAISES every share.
     --graph prism  fully reciprocal, five slots moved - and 3.46x becomes 6.81x, with
                 Healthcare collapsing to $20 collects. A return path is worth nothing
                 when the industry at the other end never gets built. Reciprocity is not
                 the virtue; WHICH industries the heavy payers point at is.
     --rows6 --strat --flow   3.51x against 3.46x. The demand table is not a lever here.
     --grow 1 / --grow 1.5  shrinks the loop instead of rebalancing it - see above. The
                 growth multiplier is the mechanism behind the magnitude and NOT behind
                 the imbalance, so flattening it costs half the B2B economy and buys
                 nothing the cards do not buy better.
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
const CARDS_RE = /const BP_DATA = (\[.*?\]);/s;
if (!CARDS_RE.test(logic)) { console.error("BP_DATA moved - update this probe"); process.exit(2); }
const IND = ["UT", "RE", "HO", "MA", "HC", "TE"];
const CARDS0 = JSON.parse(logic.match(CARDS_RE)[1]);
const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);

/* ---- the paper half ---- */
need("const bizPotBill = (b) => Math.max(0, bizOpex(b) - RENT_PER_LEVEL * b.level);", "the supplier bill");
need("const RENT_PER_LEVEL = 2;", "the ground rent");
function paper(cards, label) {
  console.log(`\n${"=".repeat(94)}\n${label}\n${"=".repeat(94)}`);
  const bad = cards.filter((c) => c.deps.reduce((a, d) => a + d.val, 0) !== c.opex);
  console.log(`  vals sum to the card's opex on ${cards.length - bad.length} of ${cards.length} cards` +
    (bad.length ? `  !! not on ${bad.slice(0, 3).map((c) => c.code).join(", ")}` : "  - so a val IS the dollars owed"));
  console.log("\n  WHAT ACTUALLY LEAVES, after ground rent takes 2 a level off the top:");
  console.log("  " + pad("", 8) + [1, 2, 3].map((l) => rp("L" + l, 20)).join(""));
  for (const i of IND) {
    const r = [1, 2, 3].map((l) => { const c = cards.find((x) => x.ind === i && x.lvl === l);
      const pot = Math.max(0, c.opex - 2 * l); return rp(`$${pot} of $${c.opex}  ${(100 * pot / c.opex).toFixed(0)}%`, 20); });
    console.log("  " + pad(i, 8) + r.join(""));
  }
  /* dollars a quarter into each pot, one company of every card type standing */
  const M = Object.fromEntries(IND.map((a) => [a, Object.fromEntries(IND.map((b) => [b, 0]))]));
  for (const c of cards) {
    const n = cards.filter((x) => x.ind === c.ind && x.lvl === c.lvl).length;
    const pot = Math.max(0, c.opex - 2 * c.lvl), tot = c.deps.reduce((a, d) => a + d.val, 0) || 1;
    for (const d of c.deps) M[c.ind][d.ind] += pot * d.val / tot / n;
  }
  console.log("\n  DOLLARS A QUARTER INTO EACH POT, one company of every card type standing");
  console.log("  " + pad("pays ->", 10) + IND.map((i) => rp(i, 8)).join("") + rp("pays out", 10));
  for (const a of IND) console.log("  " + pad(a, 10) + IND.map((b) => rp(M[a][b] ? M[a][b].toFixed(1) : ".", 8)).join("") +
    rp(IND.reduce((s, b) => s + M[a][b], 0).toFixed(1), 10));
  const inn = IND.map((b) => IND.reduce((s, a) => s + M[a][b], 0));
  const out = IND.map((a) => IND.reduce((s, b) => s + M[a][b], 0));
  console.log("  " + pad("COLLECTS", 10) + inn.map((v) => rp(v.toFixed(1), 8)).join(""));
  console.log("  " + pad("net", 10) + inn.map((v, j) => rp((v - out[j] >= 0 ? "+" : "") + (v - out[j]).toFixed(1), 8)).join("") +
    `   top to bottom ${(Math.max(...inn) / Math.min(...inn)).toFixed(2)}x`);
  /* structure */
  const buys = Object.fromEntries(IND.map((i) => [i, new Set()]));
  for (const c of cards) for (const d of c.deps) buys[c.ind].add(d.ind);
  const recip = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++)
    if (buys[IND[a]].has(IND[b]) && buys[IND[b]].has(IND[a])) recip.push(`${IND[a]}<->${IND[b]}`);
  console.log(`\n  each industry buys from: ${IND.map((i) => `${i} ${[...buys[i]].join("")}`).join("   ")}`);
  console.log(`  MUTUAL pairs, where the money cycles instead of moving on: ${recip.join(", ")}`);
  const cnt = Object.fromEntries(IND.map((i) => [i, 0]));
  for (const r of recip) { cnt[r.slice(0, 2)]++; cnt[r.slice(-2)]++; }
  console.log(`  mutual partners each: ${IND.map((i) => `${i} ${cnt[i]}`).join("  ")}`);
}

/* Re-scale a card's vals to a new opex and keep them summing to it exactly: floor each,
   then hand the leftover dollars to the biggest fractions. Otherwise rounding breaks the
   one invariant the paper half rests on - that a val is the dollars owed. */
function reshare(deps, want) {
  const tot = deps.reduce((a, d) => a + d.val, 0) || 1;
  const exact = deps.map((d) => (d.val * want) / tot);
  const out = deps.map((d, i) => ({ ...d, val: Math.floor(exact[i]) }));
  let left = want - out.reduce((a, d) => a + d.val, 0);
  [...out.keys()].sort((a, b) => ((exact[b] % 1) - (exact[a] % 1))).forEach((i) => { if (left-- > 0) out[i].val++; });
  return out;
}

/* ---- arms ---- */
/* --grow N: growing a company doubles its opex as it doubles its production. Since the
   supplier bill is opex minus rent and rent does not double, that is where the drain
   compounds, so this is the one lever that reaches the mechanism rather than the symptom.
   It is also the broadest: opex sets profitability everywhere, not just in the pots. */
const GROW_OPEX = (() => { const i = process.argv.indexOf("--grow"); return i > 0 ? Number(process.argv[i + 1]) : null; })();
const OPEX_NOW = `const bizOpex = (b) => b.bp.opex * (b.upgraded ? 2 : 1);`;
if (GROW_OPEX !== null) {
  if (!(GROW_OPEX >= 1 && GROW_OPEX <= 4)) { console.error("--grow wants a multiplier between 1 and 4"); process.exit(2); }
  need(OPEX_NOW, "the growth multiplier");
  logic = logic.replace(OPEX_NOW, `const bizOpex = (b) => Math.round(b.bp.opex * (b.upgraded ? ${GROW_OPEX} : 1));`);
}

const CONSUME = `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : (levelIdx + 1) * exchangeRate(state, biz);`;
need(CONSUME, "the delivery rule");
if (has("--flow")) logic = logic.replace(CONSUME, "  return cross ? 1 : exchangeRate(state, biz);");
const SHEET2 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 10, opex: 8, prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 15, opex: 12, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 8, prod: 2 } };
const SHEET2_PAY = { UT: 15, RE: 20, HO: 10, MA: 20, HC: 15, TE: 10 };
/* --sheet3: the same sheet with the SETUP COLUMN OF RE AND HO SWAPPED - Retail to
   $15 and Hospitality to $10 - which is the only attribute that moves between the
   two. It pairs the six into (UT,HC) at 20, (RE,MA) at 15 and (HO,TE) at 10, and
   every one of them breaks even exactly at base price minus $2. */
const SHEET3 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 15, opex: 8, prod: 4 },
                 HO: { setup: 10, opex: 6, prod: 2 }, MA: { setup: 15, opex: 12, prod: 4 },
                 HC: { setup: 20, opex: 12, prod: 3 }, TE: { setup: 10, opex: 8, prod: 2 } };
/* --sheet4: the next revision, with the opex column brought down where it was biting -
   MA 12 to 8, HC 12 to 10, RE 8 to 10 - and setup back to RE $10 / HO $15. */
const SHEET4 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 10, opex: 10, prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 15, opex: 8,  prod: 4 },
                 HC: { setup: 20, opex: 10, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
/* --sheet5: RE setup 10 to 15 and MA setup 15 to 10, the only two cells that move.
   Opex is untouched, so the pot bills are identical to --sheet4 and any change in the
   loop comes purely from WHO GETS BUILT. */
const SHEET5 = { UT: { setup: 20, opex: 6, prod: 3 }, RE: { setup: 15, opex: 10, prod: 4 },
                 HO: { setup: 15, opex: 6, prod: 2 }, MA: { setup: 10, opex: 8,  prod: 4 },
                 HC: { setup: 20, opex: 10, prod: 3 }, TE: { setup: 10, opex: 8,  prod: 2 } };
let CARDS = CARDS0;
if (has("--sheet2") || has("--sheet2pay") || has("--sheet3") || has("--v3") || has("--sheet4") || has("--v4")
    || has("--sheet5") || has("--v5")) {
  const pay = has("--sheet2pay");
  const B = (has("--sheet5") || has("--v5")) ? SHEET5 : (has("--sheet4") || has("--v4")) ? SHEET4
          : (has("--sheet3") || has("--v3")) ? SHEET3 : SHEET2;
  const cards = JSON.parse(logic.match(CARDS_RE)[1]);
  for (const c of cards) {
    const m = 1 << (c.lvl - 1), b = B[c.ind], want = b.opex * m;
    c.deps = reshare(c.deps, want);
    c.setup = (pay ? SHEET2_PAY[c.ind] : b.setup) * m; c.opex = want; c.prod = b.prod * m;
  }
  logic = logic.replace(logic.match(CARDS_RE)[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
  CARDS = cards;
}
/* ---- re-pointing the supply graph ----
   Shipped, each industry has an ordered supplier triple and every card of that industry
   draws from it on a fixed template: at level 1 two cards on the first, two on the second,
   one on the third; at level 2 the three pairs; at level 3 all three, twice. The vals are
   positional too, so swapping a NAME at a position moves the dollars without changing how
   many there are - which makes `--graph` a clean experiment: identical money, different
   plumbing. The shipped graph has ten one-way edges, so most dollars have no return path.
   `prism` is the nearest fully reciprocal graph: two triangles, UT-HC-TE and RE-HO-MA,
   joined UT-HO, HC-MA, TE-RE. Five slots move. `heavy` is also reciprocal but groups the
   industries that actually DO the paying - RE, HO, HC - into one triangle, so their money
   cycles among themselves instead of draining into the half nobody builds. */
const TRIPLE_NOW = { UT: ["HO", "TE", "HC"], RE: ["TE", "HO", "MA"], HO: ["MA", "HC", "RE"],
                     MA: ["HC", "RE", "UT"], HC: ["RE", "UT", "TE"], TE: ["UT", "MA", "HO"] };
const GRAPHS = {
  prism: { UT: ["HO", "TE", "HC"], RE: ["TE", "HO", "MA"], HO: ["MA", "UT", "RE"],
           MA: ["HC", "RE", "HO"], HC: ["MA", "UT", "TE"], TE: ["UT", "RE", "HC"] },
  heavy: { UT: ["HO", "TE", "MA"], RE: ["TE", "HO", "HC"], HO: ["UT", "HC", "RE"],
           MA: ["HC", "TE", "UT"], HC: ["RE", "HO", "MA"], TE: ["UT", "MA", "RE"] },
  /* The matrix on the sheet, read off its S1/S2/S3 columns. It is 3-regular both
     ways, and fourteen of its eighteen edges are mutual. */
  sheet: { UT: ["TE", "MA", "HC"], RE: ["UT", "HO", "TE"], HO: ["MA", "HC", "RE"],
           MA: ["HO", "TE", "UT"], HC: ["RE", "UT", "HO"], TE: ["HC", "RE", "MA"] },
  /* The matrix the sheet's own B2B row implies instead - the two disagree. Each
     industry's B2B figure is exactly the sum of its three suppliers' opex, and only
     this assignment reproduces all six. It is NOT regular: Technology is listed by
     four industries and Retail by two, so the slot count stops being identical. */
  sheetB: { UT: ["MA", "HC", "TE"], RE: ["TE", "MA", "HC"], HO: ["UT", "RE", "TE"],
            MA: ["RE", "HO", "TE"], HC: ["UT", "HO", "MA"], TE: ["UT", "HO", "HC"] },
  /* The next revision's matrix, also 3-regular both ways. */
  sheet4: { UT: ["TE", "HC", "MA"], RE: ["UT", "HO", "TE"], HO: ["HC", "MA", "RE"],
            MA: ["HO", "TE", "UT"], HC: ["RE", "UT", "HO"], TE: ["MA", "RE", "HC"] },
};
const GRAPH = (() => { const i = process.argv.indexOf("--graph");
  return i > 0 ? process.argv[i + 1] : (has("--v4") || has("--v5")) ? "sheet4" : has("--v3") ? "sheet" : null; })();
if (GRAPH) {
  if (!GRAPHS[GRAPH]) { console.error(`no such graph '${GRAPH}' - try ${Object.keys(GRAPHS).join(" or ")}`); process.exit(2); }
  const cards = JSON.parse(JSON.stringify(CARDS));
  for (const c of cards) {
    const from = TRIPLE_NOW[c.ind], to = GRAPHS[GRAPH][c.ind];
    if (c.deps.some((d) => !from.includes(d.ind))) { console.error(`${c.code} does not draw from the triple this probe expects`); process.exit(2); }
    c.deps = c.deps.map((d) => ({ ...d, ind: to[from.indexOf(d.ind)] }));
  }
  logic = logic.replace(logic.match(CARDS_RE)[0], "const BP_DATA = " + JSON.stringify(cards) + ";");
  CARDS = cards;
}

const ROWS_NOW = `const DEMAND_ROWS = {
  R: ["UT", "RE", "HO", "UT"], C: ["RE", "UT", "MA", "RE"],
  A: ["HO", "UT", "TE", "HO"], I: ["MA", "RE", "HC", "MA"],
  FC: ["TE", "UT", "HC", "TE"], IA: ["MA", "RE", "TE", "MA"],
  CC: ["HC", "HO", "TE", "HC"], LM: ["HO", "MA", "HC", "HO"],
};`;
if (has("--rows6")) {
  need(ROWS_NOW, "the demand table");
  logic = logic.replace(ROWS_NOW, `const DEMAND_ROWS = {
  R: ["UT", "RE", "MA", "UT"], C: ["RE", "UT", "HO", "RE"],
  A: ["HO", "UT", "HC", "HO"], I: ["MA", "RE", "TE", "MA"],
  FC: ["TE", "MA", "HC", "TE"], IA: ["HC", "MA", "TE", "HC"],
  CC: ["TE", "HO", "HC", "TE"], LM: ["HC", "HO", "TE", "HC"],
};`);
}
/* --rows8: the demand table on the sheet. Volumes 14/10/10/10/10/10 and spreads
   9/8/6/8/8/9, the first-row-equals-last-row rule held in all eight families, and
   Retail and Manufacturing on no centre at all. */
const ROWS8 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "TE", "UT"], C: ["HO", "MA", "HC", "HO"],
  A: ["RE", "TE", "MA", "RE"], I: ["MA", "UT", "RE", "MA"],
  FC: ["HC", "UT", "TE", "HC"], IA: ["TE", "HO", "HC", "TE"],
  CC: ["HC", "TE", "UT", "HC"], LM: ["UT", "HC", "HO", "UT"],
};`;
/* --rows9: the next table. Volumes 12/10/12/10/10/10 and EVERY SPREAD EQUAL AT 8. */
const ROWS9 = `const DEMAND_ROWS = {
  R: ["UT", "RE", "TE", "UT"], C: ["HO", "MA", "HC", "HO"],
  A: ["RE", "TE", "HO", "RE"], I: ["MA", "UT", "RE", "MA"],
  FC: ["HC", "MA", "UT", "HC"], IA: ["TE", "HO", "HC", "TE"],
  CC: ["HC", "UT", "MA", "HC"], LM: ["TE", "HC", "HO", "TE"],
};`;
if (has("--rows8") || has("--v3")) { need(ROWS_NOW, "the demand table"); logic = logic.replace(ROWS_NOW, ROWS8); }
if (has("--rows9") || has("--v4") || has("--v5")) { need(ROWS_NOW, "the demand table"); logic = logic.replace(ROWS_NOW, ROWS9); }

const DRAW_NOW = `  const chosen = sample(SUBURB_POOL, 12, rng);`;
if (has("--strat") || has("--v3") || has("--v4") || has("--v5")) {
  need(DRAW_NOW, "the suburb draw");
  logic = logic.replace(DRAW_NOW, `  const __byFam = (f, n) => sample(SUBURB_POOL.filter((t) => t[0] === f), n, rng);
  const chosen = shuffle([...__byFam("R", 4), ...__byFam("C", 4), ...__byFam("A", 2), ...__byFam("I", 2)], rng);`);
}

if (has("--paper")) { paper(CARDS, ["--sheet2", "--sheet2pay", "--sheet3", "--sheet4", "--sheet5", "--v3", "--v4", "--v5"].some(has)
  ? "UNDER THE PROPOSED CARDS" : "AS IT SHIPS"); console.log(""); process.exit(0); }

/* --nohq: a headquarters produces nothing and pays no OPEX, yet draws an equal share.
   With one or two companies standing in an industry that is a third to a half of the pot
   going to a building that never paid into any. */
const HQ_SEAT = `      megacorpHQs(p).forEach((b) => { if (bizInd(b) === ind && businessCanProduce(state, b)) recipients.push({ p, b }); });`;
if (has("--nohq")) { need(HQ_SEAT, "the headquarters seat"); logic = logic.replace(HQ_SEAT, ""); }

/* ---- the probe ---- */
const HOOKS = [
  ["a pot credit", `        deps.forEach((d, i) => { state.pots[d.ind] += shares[i]; });`,
                   `        deps.forEach((d, i) => { __probe.pay(bizInd(b), d.ind, shares[i], b.level, !!b.upgraded); state.pots[d.ind] += shares[i]; });`],
  /* The pot is written off now; --carry puts back the rule the game had before, where
     it rode forward and the first company into an empty industry scooped the lot. */
  ["an unclaimed pot", `    if (!recipients.length) { state.pots[ind] = 0; continue; }`,
                   `    if (!recipients.length) { __probe.orphan(ind, pot); ${has("--carry") ? "" : "state.pots[ind] = 0; "}continue; }`],
  ["a pot payout", `    recipients.forEach((r) => { r.p.cash += share; });`,
                   `    __probe.payout(ind, share, recipients.length, pot);\n    recipients.forEach((r) => { r.p.cash += share; });`],
  ["a company launching", `function onLaunch(pm, ind, depInds) {`,
                   `function onLaunch(pm, ind, depInds) {\n  __probe.launch(ind, depInds);`],
];
for (const [what, find, put] of HOOKS) { need(find, what); logic = logic.replace(find, put); }

/* --bylevel: the pot splits in proportion to level, so a level-3 company draws three times
   what a level-1 does. The shipped rule pays the industry, not the building; this arm pays
   the building, which is what sized the bill in the first place. It has to be spliced after
   the hooks above, because it rewrites the very lines one of them just rewrote. */
const SPLIT = `    const share = Math.floor(pot / recipients.length);
    if (share < 1) continue;                             // too small to split: it rides forward
    __probe.payout(ind, share, recipients.length, pot);
    recipients.forEach((r) => { r.p.cash += share; });
    state.pots[ind] = pot - share * recipients.length;`;
if (has("--bylevel")) {
  need(SPLIT, "the equal split");
  logic = logic.replace(SPLIT, `    const share = Math.floor(pot / recipients.length);
    if (share < 1) continue;
    const __w = recipients.map((r) => r.b.level || 1), __W = __w.reduce((a, b) => a + b, 0);
    let __spent = 0;
    recipients.forEach((r, i) => { const c = Math.floor((pot * __w[i]) / __W); r.p.cash += c; __spent += c; });
    __probe.payout(ind, __spent / recipients.length, recipients.length, pot);
    state.pots[ind] = pot - __spent;`);
}

/* Where a dollar into the pots comes from, by the level the company is standing at and
   whether it has been upgraded. Upgrading DOUBLES the opex and ALSO adds a level, so
   "L3+" is a level-2 Blueprint that grew, not a level-3 one: a Retail L2 owes $9-4=$5 a
   quarter and $18-6=$12 once upgraded, while a printed L3 owes $14-6=$8. Ground rent
   does not double, so the supplier bill climbs faster than the level does, and that is
   why the cheap industries drain so hard - cheap entry buys more companies, more of them
   get upgraded, and every upgrade more than doubles what that one owes its suppliers.
   There is no L1+ rung, because growing out of level 1 lands you at L2+. */
const RUNGS = ["L1 ", "L2 ", "L2+", "L3 ", "L3+", "L4 ", "L4+"];
const blank = () => ({
  M: Object.fromEntries(IND.map((a) => [a, Object.fromEntries(IND.map((b) => [b, 0]))])),
  got: Object.fromEntries(IND.map((i) => [i, { paid: 0, quarters: 0, perCo: 0, nCo: 0, carried: 0 }])),
  orphan: Object.fromEntries(IND.map((i) => [i, { quarters: 0, peak: 0 }])),
  scoop: Object.fromEntries(IND.map((i) => [i, { n: 0, sum: 0, max: 0 }])),
  cells: Object.fromEntries(IND.map((i) => [i, { built: 0, bumped: 0 }])),
  byRung: Object.fromEntries(IND.map((i) => [i, Object.fromEntries(RUNGS.map((r) => [r, 0]))])),
  wasOrphan: {},
});
let P = blank();
const probe = {
  pay: (from, to, amt, lvl, up) => { P.M[from][to] += amt;
    const k = `L${lvl}${up ? "+" : " "}`; const r = P.byRung[from];
    if (!(k in r)) { console.error(`a company at rung ${k} - this probe does not know that rung`); process.exit(2); }
    r[k] += amt; },
  orphan: (ind, pot) => { P.orphan[ind].quarters++; P.wasOrphan[ind] = true;
                          if (pot > P.orphan[ind].peak) P.orphan[ind].peak = pot; },
  payout: (ind, share, n, pot) => { const g = P.got[ind];
    g.paid += share * n; g.quarters++; g.perCo += share; g.nCo += n; g.carried += pot - share * n;
    /* a pot that had nobody last time is being scooped now */
    if (P.wasOrphan[ind]) { const s = P.scoop[ind]; s.n++; s.sum += pot; if (pot > s.max) s.max = pot; P.wasOrphan[ind] = false; } },
  launch: (ind, depInds) => { P.cells[ind].built++; depInds.forEach((d) => { P.cells[d].bumped++; }); },
};
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, Map, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES };
`, sandbox);
const E = box.E;

function run(seats) {
  P = blank(); let games = 0;
  const OFF = (() => { const i = process.argv.indexOf("--off"); return i > 0 ? parseInt(process.argv[i + 1], 10) : 0; })();
  for (let seed = 1 + OFF; seed <= GAMES + OFF; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    P.wasOrphan = {};
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
  }
  return games;
}

const ARMS = ["--flow", "--sheet2", "--sheet2pay", "--sheet3", "--sheet4", "--rows6", "--rows8",
              "--rows9", "--sheet5", "--v3", "--v4", "--v5", "--strat", "--carry", "--bylevel", "--nohq"];
console.log(`\n${GAMES} games a table size.  arms: ${[...ARMS.filter(has), GRAPH ? "--graph " + GRAPH : "",
  GROW_OPEX !== null ? "--grow " + GROW_OPEX : ""].filter(Boolean).join(" ") || "as it ships"}.`);
for (const seats of SIZES) {
  const games = run(seats);
  console.log(`\n${"=".repeat(94)}\n${seats} PLAYERS  -  ${games} games\n${"=".repeat(94)}`);
  const per = (v) => (v / games).toFixed(1);
  console.log("  WHO PAID WHOM, dollars a game");
  console.log("  " + pad("pays ->", 10) + IND.map((i) => rp(i, 8)).join("") + rp("pays out", 10));
  for (const a of IND) console.log("  " + pad(a, 10) + IND.map((b) => rp(P.M[a][b] ? per(P.M[a][b]) : ".", 8)).join("") +
    rp(per(IND.reduce((s, b) => s + P.M[a][b], 0)), 10));
  const inn = IND.map((b) => IND.reduce((s, a) => s + P.M[a][b], 0));
  const out = IND.map((a) => IND.reduce((s, b) => s + P.M[a][b], 0));
  console.log("  " + pad("COLLECTS", 10) + inn.map((v) => rp(per(v), 8)).join("") + `   top to bottom ${(Math.max(...inn) / Math.min(...inn)).toFixed(2)}x`);
  console.log("  " + pad("net", 10) + inn.map((v, j) => rp((v - out[j] >= 0 ? "+" : "") + per(v - out[j]), 8)).join(""));
  console.log("\n  WHAT A COMPANY IN THAT INDUSTRY GETS BACK");
  const row = (lab, f) => console.log("  " + pad(lab, 32) + IND.map((i) => rp(f(i), 9)).join(""));
  row("  quarters the pot paid out", (i) => (P.got[i].quarters / games).toFixed(1));
  row("  mean share to each company", (i) => "$" + (P.got[i].quarters ? (P.got[i].perCo / P.got[i].quarters).toFixed(1) : "-"));
  row("  companies splitting it", (i) => (P.got[i].quarters ? (P.got[i].nCo / P.got[i].quarters).toFixed(2) : "-"));
  console.log("\n  WHERE EACH INDUSTRY'S OUTGOING DOLLARS COME FROM  (+ is upgraded, and a level up)");
  for (const r of RUNGS) {
    if (!IND.some((i) => P.byRung[i][r] > 0.005)) continue;        // a rung nobody ever stood on
    row("  " + r, (i) => "$" + (P.byRung[i][r] / games).toFixed(1));
  }

  console.log("\n  THE OTHER CHANNEL: the price track, where a build costs its own industry $1");
  console.log("  " + pad("", 32) + IND.map((i) => rp(i, 9)).join(""));
  row("  companies built in it", (i) => (P.cells[i].built / games).toFixed(1));
  row("  times bumped as a supplier", (i) => (P.cells[i].bumped / games).toFixed(1));
  row("  net, in dollars of price", (i) => { const c = P.cells[i]; const d = (c.bumped - c.built) / games;
    return (d >= 0 ? "+" : "") + d.toFixed(1); });

  console.log("\n  POTS WITH NOBODY TO PAY - the money that waits for the first company in");
  row("  quarters with no company at all", (i) => (P.orphan[i].quarters / games).toFixed(1));
  row("  biggest pot left waiting", (i) => "$" + P.orphan[i].peak.toFixed(0));
  row("  times a waiting pot was scooped", (i) => (P.scoop[i].n / games).toFixed(2));
  row("    mean size of that scoop", (i) => (P.scoop[i].n ? "$" + (P.scoop[i].sum / P.scoop[i].n).toFixed(1) : "-"));
  row("    biggest scoop seen", (i) => (P.scoop[i].max ? "$" + P.scoop[i].max.toFixed(0) : "-"));
}
console.log("");
