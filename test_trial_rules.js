/* The trial rules: round supplier bills, three earning tiers, rent by plot value.

   Three rules sit on top of v23, from the playtest sheet of 23 November 2026, and the
   printed cards carry their numbers. The engine works those numbers out from the band
   table rather than storing them, so this file pins the arithmetic against the sheet and
   against cards that are on the table - if a threshold or a payout ever drifts from what
   is printed, a player would be paid a number their card does not show.

   It also pins the way back: "printedV23" has to put the book's own three rules in place
   exactly, because that is what keeps the trial measurable against what it replaced.

   Run: node test_trial_rules.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, String, Number, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, BP_DATA, byId, activeBiz, mulberry32, doLaunch, doUpgrade, levelsOn, newBusiness,
      SCALING, runProduction, runBandRevenue, bandRevenue, bandFor, BAND_TABLE, BASE_PRICE, orthOf, plotValue,
      plotRentRate, tierTable, tierFor, bizPotBill, potShares, bizGroundRent, quarterBill, trialOn, cardPotBill,
      latticeKeyForCell, advanceDraft, startPlanning, advancePlanning, epTotal, placeBranches, VARIANTS,
      normaliseVariants, INDUSTRIES, RENT_PER_LEVEL, price, hqRentDue, OPEX_TIER, OPEX_TIER_LABEL, supplierBill,
      supplierShares, upgradeAddedBill, ENTRY_GRADE, ENTRY_GRADE_LABEL };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const card = (code) => E.BP_DATA.find((x) => x.code === code);

function connectedRun(st, n) {
  for (const start of Object.keys(st.board.cellOf)) {
    const run = [start];
    let ok = true;
    while (run.length < n) {
      const next = E.orthOf(st.board, run[run.length - 1]).find((k) => !run.includes(k));
      if (!next) { ok = false; break; }
      run.push(next);
    }
    if (ok && run.length === n) return run;
  }
  return null;
}
/* Set what the road beside a plot charges, so a plot can be made worth a chosen amount. */
const setRoad = (st, plot, v) => { st.board.priceLattice[E.latticeKeyForCell(st.board.cellOf[plot])] = v; };

/* ============================================================ which game is being played */
section("The trial rules are the game unless a variant says otherwise");
{
  const st = E.initGame(2, 3, ["You"], undefined, false, undefined);
  check("a new game plays the trial rules", E.trialOn(st));
  check("the variant list offers the way back", E.VARIANTS.some((v) => v.key === "printedV23"));
  const printed = E.initGame(2, 3, ["You"], undefined, false, { printedV23: true });
  check("'Bills and revenue as printed in v23' switches them off", !E.trialOn(printed));
  const unit = E.initGame(2, 3, ["You"], undefined, false, { unitRevenue: true });
  check("'Revenue by the unit' switches them off too - the trial cards print no production", !E.trialOn(unit));
  check("a state from before the variant existed plays the trial rules", E.normaliseVariants({ longGame: true }).printedV23 === false);
}

/* ============================================================ rule 1: pay */
section("Pay: one round total, set by the industry's OPEX tier and doubled by each level");
{
  const st = E.initGame(2, 5, ["You"], undefined, false, undefined);
  /* Written out rather than computed, because this table IS the rule: Didson's own
     figures of 24 November 2026, the totals a card pays by tier and level. */
  const TOTAL = { Low: [5, 10, 20, 40], Mid: [10, 20, 40, 80], High: [15, 30, 60, 120] };
  const TIER_OF = { UT: "Low", HO: "Low", MA: "Mid", TE: "Mid", RE: "High", HC: "High" };
  check("Low is Utilities and Hospitality, Mid Manufacturing and Technology, High Retail and Healthcare",
    E.INDUSTRIES.every((i) => E.OPEX_TIER_LABEL[E.OPEX_TIER[i]] === TIER_OF[i]),
    E.INDUSTRIES.map((i) => `${i} ${E.OPEX_TIER_LABEL[E.OPEX_TIER[i]]}`).join(" "));
  check("those are the three groups v23 prints as OPEX 6, 8 and 10 at Level 1",
    E.BP_DATA.filter((c) => c.lvl === 1).every((c) => c.opex === 4 + 2 * E.OPEX_TIER[c.ind]));
  for (const tier of ["Low", "Mid", "High"]) {
    const ind = E.INDUSTRIES.find((i) => TIER_OF[i] === tier);
    check(`${tier}: $${TOTAL[tier].join(", $")} at Levels 1 to 4`,
      same([1, 2, 3, 4].map((l) => E.supplierBill(ind, l)), TOTAL[tier]));
  }
  const wrong = [];
  for (const bp of E.BP_DATA) {
    for (const up of [false, true]) {
      const b = E.newBusiness(bp, ["a"], 1, st);
      if (up) { b.upgraded = true; b.level = bp.lvl + 1; }
      const total = TOTAL[TIER_OF[bp.ind]][b.level - 1];
      const want = bp.deps.length === 1 ? [total] : bp.deps.length === 2 ? [total / 2, total / 2] : [total / 2, total / 4, total / 4];
      const got = E.potShares(st, b);
      if (E.bizPotBill(st, b) !== total || !same(got, want) || got.some((v) => v % 5)) wrong.push(`${bp.code}${up ? "+" : ""} ${got.join("+")}`);
    }
  }
  check("all 60 cards, as printed and upgraded: one supplier takes it all, two take half each, three take a half and two quarters",
    wrong.length === 0, wrong.slice(0, 4).join("; "));
  const shares = (code, up) => {
    const bp = card(code), b = E.newBusiness(bp, ["a"], 1, st);
    if (up) { b.upgraded = true; b.level = bp.lvl + 1; }
    return E.potShares(st, b);
  };
  check("a Level 1 pays its one supplier $5, $10 or $15, and $10, $20 or $30 once upgraded",
    same([shares("UT-01"), shares("TE-01"), shares("RE-01")], [[5], [10], [15]])
    && same([shares("UT-01", true), shares("TE-01", true), shares("RE-01", true)], [[10], [20], [30]]));
  check("a Level 2 splits $10, $20 or $30 in half, and each half doubles on upgrading",
    same([shares("UT-06"), shares("MA-06"), shares("HC-06")], [[5, 5], [10, 10], [15, 15]])
    && same([shares("UT-06", true), shares("MA-06", true), shares("HC-06", true)], [[10, 10], [20, 20], [30, 30]]));
  check("a Level 3 gives half to the first supplier printed and a quarter to each of the others: $10+$5+$5, $20+$10+$10, $30+$15+$15",
    same([shares("UT-10"), shares("MA-10"), shares("HC-10")], [[10, 5, 5], [20, 10, 10], [30, 15, 15]]));
  check("...and at Level 4 each of them is doubled: $20+$10+$10, $40+$20+$20, $60+$30+$30",
    same([shares("UT-10", true), shares("MA-10", true), shares("HC-10", true)], [[20, 10, 10], [40, 20, 20], [60, 30, 30]]));
  check("the first supplier printed on a Level 3 is the one v23 made its largest dependency",
    E.BP_DATA.filter((c) => c.lvl === 3).every((c) => c.deps.every((d) => d.val <= c.deps[0].val)));
  check("each industry leads exactly one other industry's Level 3s",
    same(E.INDUSTRIES.map((i) => new Set(E.BP_DATA.filter((c) => c.lvl === 3 && c.deps[0].ind === i).map((c) => c.ind)).size), E.INDUSTRIES.map(() => 1)));
  check("the sheet's own line: a Level 2 with two suppliers pays $10 + $10 - it is a Mid card",
    same(E.potShares(st, E.newBusiness(card("MA-06"), ["a", "b"], 1, st)), [10, 10]));
  check("a card in hand is priced the same way", E.cardPotBill(st, card("HC-10")) === 60 && E.cardPotBill(st, card("RE-01")) === 15 && E.cardPotBill(st, card("UT-06")) === 10);
  const up = E.newBusiness(card("TE-10"), ["a"], 1, st);
  check("upgrading adds exactly the bill it already pays", E.upgradeAddedBill(st, up) === 40 && E.upgradeAddedBill(st, E.newBusiness(card("HO-01"), ["a"], 1, st)) === 5);
}

section("The bill lands in the suppliers' pots, whole");
{
  const st = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const me = E.byId(st, 0);
  const run = connectedRun(st, 2);
  run.forEach((k) => { st.board.owner[k] = me.id; });
  const bp = card("MA-06");                       // Auto Plant II: suppliers HO and TE
  me.hand = [bp]; me.cash = 500;
  check("the Auto Plant is built on two of its owner's plots", !!E.doLaunch(st, me, bp, E.mulberry32(1), quiet, run));
  E.INDUSTRIES.forEach((i) => { st.pots[i] = 0; });
  const before = me.cash;
  E.runProduction(st, quiet);
  check("it pays $20 in all, and no rent on its own land", before - me.cash === 20, `paid $${before - me.cash}`);
  check("Hospitality's pot takes $10 and Technology's takes $10", st.pots.HO === 10 && st.pots.TE === 10,
    E.INDUSTRIES.map((i) => `${i} ${st.pots[i]}`).join(" "));
}

/* ============================================================ rule 2: earn */
section("Earn: the tiers printed on the cards - a margin over the bill, by how hard the industry is to enter");
{
  /* Written out, because this table IS the rule (Didson, 25 November 2026): what each
     tier leaves after the supplier bill, by grade, in "little" units of $5 a level. */
  const GRADE = { HO: "Easy", UT: "Easy", RE: "Medium", TE: "Medium", MA: "Hard", HC: "Hard" };
  const MARGIN = { Easy: [-2, -1, 1], Medium: [-1, 0, 2], Hard: [0, 1, 3] };
  check("Easy: Hospitality, Utilities. Medium: Retail, Technology. Hard: Manufacturing, Healthcare",
    E.INDUSTRIES.every((i) => E.ENTRY_GRADE_LABEL[E.ENTRY_GRADE[i]] === GRADE[i]));
  const wrong = [];
  for (const ind of E.INDUSTRIES) for (let l = 1; l <= 4; l++) {
    const t = E.tierTable(ind, l), bill = E.supplierBill(ind, l), u = 5 * l;
    const want = [];
    MARGIN[GRADE[ind]].forEach((m, k) => { want.push(Math.max(k ? want[k - 1] + 5 : 0, bill + m * u)); });
    if (!same(t.pays, want)) wrong.push(`${ind} L${l} ${t.pays.join("/")} not ${want.join("/")}`);
  }
  check("every tier of every card is its bill plus its margin, never under $0, each $5 over the one below", wrong.length === 0, wrong.slice(0, 3).join("; "));
  const pins = [
    ["MA", 2, { icons: [0, 5, 8], price: [0, 4, 6], pays: [20, 30, 50] }, "Auto Plant (Hard, bill $20): breakeven, +$10, +$30"],
    ["HC", 1, { icons: [0, 2, 3], price: [0, 5, 8], pays: [15, 20, 30] }, "Urgent Care Clinic (Hard, bill $15): $15 / $20 / $30"],
    ["RE", 3, { icons: [0, 7, 12], price: [0, 3, 4], pays: [45, 60, 90] }, "a Retail Level 3 (Medium, bill $60): -$15, breakeven, +$30"],
    ["TE", 2, { icons: [0, 2, 4], price: [0, 5, 7], pays: [10, 20, 40] }, "App Startup, upgraded (Medium, bill $20): $10 / $20 / $40"],
    ["HO", 1, { icons: [0, 1, 2], price: [0, 4, 7], pays: [0, 5, 10] }, "a Hospitality Level 1 (Easy, bill $5): $0 / $5 / $10"],
    ["UT", 4, { icons: [0, 14, 24], price: [0, 3, 4], pays: [0, 20, 60] }, "a Utilities Level 4 (Easy, bill $40): $0 / $20 / $60"],
  ];
  for (const [ind, lvl, want, name] of pins) {
    const got = E.tierTable(ind, lvl);
    check(name, same(got, want), JSON.stringify(got));
  }
  const need = {};
  E.INDUSTRIES.forEach((i) => { need[i] = [1, 2, 3, 4].map((l) => { const t = E.tierTable(i, l); return t.price[2] - E.BASE_PRICE[i]; }).join(","); });
  check("the top tier needs base + $2 at Level 1, + $1 at Level 2, the base itself from Level 3",
    E.INDUSTRIES.every((i) => need[i] === "2,1,0,0"), JSON.stringify(need));
  check("the middle tier needs base - $1 at every level",
    E.INDUSTRIES.every((i) => [1, 2, 3, 4].every((l) => E.tierTable(i, l).price[1] === E.BASE_PRICE[i] - 1)));
  let rising = true, fives = true, nested = true, zeros = [];
  for (const ind of E.INDUSTRIES) for (let l = 1; l <= 4; l++) {
    const t = E.tierTable(ind, l);
    if (!(t.pays[0] < t.pays[1] && t.pays[1] < t.pays[2])) rising = false;
    if (t.pays.some((v) => v % 5 !== 0 || v < 0)) fives = false;
    if (!(t.icons[1] <= t.icons[2] && t.price[1] < t.price[2])) nested = false;
    if (t.pays[0] === 0) zeros.push(ind + l);
  }
  check("every card's three tiers rise, on every level of every industry", rising);
  check("every payout is a multiple of $5, and none is below $0", fives);
  check("only the Easy industries' Minimum pays $0 - the whole bill wasted", zeros.length > 0 && zeros.every((z) => /^(HO|UT)/.test(z)), zeros.join(" "));
  check("the top tier always asks for more than the middle", nested);
  check("no Minimum ever leaves a profit, and every top tier does",
    E.INDUSTRIES.every((i) => [1, 2, 3, 4].every((l) => { const t = E.tierTable(i, l), b = E.supplierBill(i, l); return t.pays[0] <= b && t.pays[2] > b; })));
}

section("Earn: the best tier fully met, and the Minimum otherwise");
{
  const pay = (icons, px) => E.tierFor("MA", 2, icons, px).pays;
  check("6 icons at $5 collects the middle tier, $30", pay(6, 5) === 30, `$${pay(6, 5)}`);
  check("9 icons at $5 still collects $30 - the top tier needs $6", pay(9, 5) === 30, `$${pay(9, 5)}`);
  check("9 icons at $6 collects the top tier, $50", pay(9, 6) === 50, `$${pay(9, 6)}`);
  check("3 icons at $9 collects the Minimum, $20 - a high price is not enough alone", pay(3, 9) === 20, `$${pay(3, 9)}`);
  check("no icons at all still collects the Minimum", pay(0, 2) === 20, `$${pay(0, 2)}`);
  check("exactly on both thresholds counts", pay(5, 4) === 30 && pay(8, 6) === 50);
  check("a dollar short on price drops a tier", pay(5, 3) === 20 && pay(8, 5) === 30);
}

section("Earn: a company is paid what its card says, in one go");
{
  const st = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const me = E.byId(st, 0);
  const run = connectedRun(st, 2);
  run.forEach((k) => { st.board.owner[k] = me.id; });
  const bp = card("MA-06");
  me.hand = [bp]; me.cash = 500;
  E.doLaunch(st, me, bp, E.mulberry32(1), quiet, run);
  const b = E.activeBiz(me)[0];
  const r = E.bandRevenue(st, me, b);
  const want = E.tierFor("MA", 2, r.icons, r.px);
  check("the revenue is the tier's printed amount, not a price times a multiplier",
    r.revenue === want.pays && r.band === want.tier && r.mult === null, `${r.icons} icons at $${r.px}: $${r.revenue}`);
  const before = me.cash;
  E.runBandRevenue(st, quiet);
  check("and that is what Closing pays", me.cash - before === r.revenue, `+$${me.cash - before}`);
}

/* ============================================================ rule 3: rent */
section("Rent: floors x the plot's rate, $1 for every full $5 the plot is worth");
{
  const st = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const plot = Object.keys(st.board.cellOf)[0];
  let ok = true; const seen = [];
  for (let road = 1; road <= 22; road++) {
    setRoad(st, plot, road);
    const v = E.plotValue(st, plot), rate = E.plotRentRate(st, plot);
    if (rate !== Math.max(1, Math.floor(v / 5))) ok = false;
    seen.push(`${v}:${rate}`);
  }
  check("the rate is $1 a floor up to $9, $2 from $10, $3 from $15, $4 from $20, and never less than $1", ok, seen.join(" "));
  setRoad(st, plot, 1);
  check("a $1 plot still charges $1 a floor", E.plotRentRate(st, plot) === 1);
}

section("The sheet's worked example: one Closing, one company");
{
  /* Auto Plant, Level 2, on two rented plots worth $8 and $12: pays HO $10 and TE $10,
     rent $1 + $2, and at 6 icons with Manufacturing at $5 earns the middle tier. */
  const st = E.initGame(2, 13, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0), A = st.players[1], B = st.players[2];
  const run = connectedRun(st, 2);
  st.board.owner[run[0]] = A.id; st.board.owner[run[1]] = B.id;
  const bp = card("MA-06");
  tenant.hand = [bp]; tenant.cash = 500;
  check("the Auto Plant covers both rented plots", !!E.doLaunch(st, tenant, bp, E.mulberry32(2), quiet, run));
  /* Each plot carries its own storey and touches the other, so two structures count
     toward each: road + $6. Roads of $2 and $6 make them worth $8 and $12. */
  setRoad(st, run[0], 2); setRoad(st, run[1], 6);
  const v0 = E.plotValue(st, run[0]), v1 = E.plotValue(st, run[1]);
  if (v0 === 8 && v1 === 12) {
    A.cash = 0; B.cash = 0; tenant.cash = 500;
    E.runProduction(st, quiet);
    check("the $8 plot's owner collects $1 and the $12 plot's owner $2", A.cash === 1 && B.cash === 2, `A $${A.cash}, B $${B.cash}`);
    check("the company pays $20 to its suppliers and $3 in rent: $23", 500 - tenant.cash === 23, `paid $${500 - tenant.cash}`);
    check("plus the middle tier's $30, that leaves $7 before its pot share", E.tierFor("MA", 2, 6, 5).pays - 23 === 7);
  } else {
    /* The two plots share a road on this board, so they cannot be priced apart; the
       rule is still checked against whatever they are worth. */
    A.cash = 0; B.cash = 0; tenant.cash = 500;
    const want0 = Math.max(1, Math.floor(v0 / 5)), want1 = Math.max(1, Math.floor(v1 / 5));
    E.runProduction(st, quiet);
    check(`plots worth $${v0} and $${v1} collect $${want0} and $${want1}`, A.cash === want0 && B.cash === want1, `A $${A.cash}, B $${B.cash}`);
    check("the company pays $20 to its suppliers plus that rent", 500 - tenant.cash === 20 + want0 + want1, `paid $${500 - tenant.cash}`);
  }
}

section("A stacking company pays one landlord for every floor");
{
  const st = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const tenant = E.byId(st, 0), A = st.players[1];
  const plot = connectedRun(st, 1)[0];
  st.board.owner[plot] = A.id;
  const bp = E.BP_DATA.find((x) => E.SCALING[x.ind] === "V" && x.lvl === 2);
  tenant.hand = [bp]; tenant.cash = 500;
  E.doLaunch(st, tenant, bp, E.mulberry32(1), quiet, [plot]);
  setRoad(st, plot, 9);                            // + $3 for the company itself = $12 at least
  const rate = E.plotRentRate(st, plot);
  A.cash = 0;
  E.runProduction(st, quiet);
  check(`two floors on a plot worth $${E.plotValue(st, plot)} pay 2 x $${rate}`, rate >= 2 && A.cash === 2 * rate, `landlord $${A.cash}`);
  check("what is owed is what the warning before a purchase counts", E.bizGroundRent(st, tenant, E.activeBiz(tenant)[0]) === 2 * rate);
  const own = E.initGame(2, 11, ["You"], undefined, false, undefined);
  const me = E.byId(own, 0); const mine = connectedRun(own, 1)[0];
  own.board.owner[mine] = me.id; me.hand = [bp]; me.cash = 500;
  E.doLaunch(own, me, bp, E.mulberry32(1), quiet, [mine]);
  check("nothing is owed on your own land", E.bizGroundRent(own, me, E.activeBiz(me)[0]) === 0);
}

section("A Megacorp headquarters keeps its floors");
{
  const st = E.initGame(0, 33, ["A", "B"], undefined, false, undefined);
  const [a, b] = st.players;
  const plot = Object.keys(st.board.graph)[0];
  const hq = { id: 910, bp: E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 2), footprint: [plot], levels: { [plot]: 2 }, level: 2,
    isHQ: true, megacorpName: "T", distressed: false, upgraded: false, scored: true, quarterBuilt: 1 };
  a.businesses.push(hq);
  st.board.owner[plot] = b.id; st.board.occupiedBy[plot] = hq.id;
  setRoad(st, plot, 8);                             // + $3 for the headquarters itself: worth $11 at least
  const rate = E.plotRentRate(st, plot);
  check(`two floors on a rival's plot worth $${E.plotValue(st, plot)} owe 2 x $${rate}`, rate >= 2 && E.hqRentDue(st, a) === 2 * rate, `$${E.hqRentDue(st, a)}`);
  st.board.owner[plot] = a.id;
  check("and nothing on its owner's own land", E.hqRentDue(st, a) === 0);
}

section("A Retail branch is one floor, and its rent reaches the landlord");
{
  /* Found while writing this file: a branch on a rival's plot was charged its rent and
     the landlord was never paid it. Under either set of rules the dollar has to arrive. */
  for (const variants of [undefined, { printedV23: true }]) {
    const label = variants ? "as printed in v23" : "under the trial rules";
    let done = false;
    for (let seed = 1; seed <= 40 && !done; seed++) {
      const st = E.initGame(2, seed, ["You"], undefined, false, variants);
      const tenant = E.byId(st, 0), A = st.players[1];
      const home = connectedRun(st, 1)[0];
      st.board.owner[home] = tenant.id;
      const bp = E.BP_DATA.find((x) => x.ind === "RE" && x.lvl === 2);
      tenant.hand = [bp]; tenant.cash = 500;
      /* every other plot belongs to the rival, so any branch stands on their ground */
      Object.keys(st.board.cellOf).forEach((k) => { if (k !== home) st.board.owner[k] = A.id; });
      if (!E.doLaunch(st, tenant, bp, E.mulberry32(seed), quiet, [home])) continue;
      const b = E.activeBiz(tenant)[0];
      const spots = Object.keys(st.board.branches || {}).filter((k) => st.board.branches[k].bizId === b.id);
      if (!spots.length) continue;
      const due = spots.reduce((s, k) => s + E.plotRentRate(st, k), 0);
      A.cash = 0; tenant.cash = 500;
      E.runProduction(st, quiet);
      check(`${label}: ${spots.length} branch on a rival's plot pays its owner $${due}`, A.cash === due, `landlord $${A.cash}`);
      done = true;
    }
    if (!done) check(`${label}: found a board where a chain opens a branch on a rival's plot`, false);
  }
}

/* ============================================================ the way back */
section("'Bills and revenue as printed in v23' puts the book's three rules back");
{
  const st = E.initGame(2, 11, ["You"], undefined, false, { printedV23: true });
  const tenant = E.byId(st, 0), A = st.players[1], B = st.players[2];
  const run = connectedRun(st, 2);
  st.board.owner[run[0]] = A.id; st.board.owner[run[1]] = B.id;
  const bp = card("MA-06");                        // OPEX 14: HO 8, TE 6, of which $4 is rent
  tenant.hand = [bp]; tenant.cash = 500;
  E.doLaunch(st, tenant, bp, E.mulberry32(2), quiet, run);
  const b = E.activeBiz(tenant)[0];
  check("the supplier bill is the printed OPEX less $2 a level", E.bizPotBill(st, b) === 14 - 2 * 2, `$${E.bizPotBill(st, b)}`);
  check("split in proportion to what the card owes each supplier", E.potShares(st, b).reduce((s, v) => s + v, 0) === 10 && E.potShares(st, b)[0] > E.potShares(st, b)[1],
    E.potShares(st, b).join("+"));
  setRoad(st, run[0], 12); setRoad(st, run[1], 12);
  check("rent is $2 a level whatever the plot is worth", E.plotRentRate(st, run[0]) === E.RENT_PER_LEVEL && E.bizGroundRent(st, tenant, b) === 4);
  const r = E.bandRevenue(st, tenant, b);
  check("revenue is the price times the band's multiplier", r.revenue === r.px * r.mult && r.mult === E.bandFor("MA", 2, r.icons).mult,
    `${r.icons} icons: ${r.mult} x $${r.px} = $${r.revenue}`);
}

/* ============================================================ whole games */
section("Whole games play through under the trial rules, at every table size");
{
  for (const seats of [2, 3, 4, 5, 6]) {
    let finished = 0, broken = 0, built = 0, paid = [0, 0, 0];
    for (let seed = 1; seed <= 6; seed++) {
      const lines = [];
      const st = E.initGame(seats - 1, 9000 + seats * 100 + seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      try {
        if (st.phase === "drafting") { E.advanceDraft(st, quiet); E.startPlanning(st); }
        E.advancePlanning(st, E.mulberry32(seed + 777), (m) => lines.push(m));
      } catch (e) { broken++; console.log("      ", String(e && e.message).slice(0, 160)); continue; }
      if (st.phase === "gameover") finished++;
      if (st.players.some((p) => !Number.isInteger(p.cash) || p.cash < 0) || E.INDUSTRIES.some((i) => !Number.isInteger(st.pots[i]) || st.pots[i] < 0)) broken++;
      built += st.players.reduce((n, p) => n + p.businesses.length, 0);
      lines.forEach((m) => {
        const k = m && m.k ? String(m.k) : "";
        if (k.includes("the Minimum pays")) paid[0]++;
        else if (k.includes("the middle tier pays")) paid[1]++;
        else if (k.includes("the top tier pays")) paid[2]++;
      });
    }
    check(`${seats} seats: six games reach the end with whole, non-negative money`, finished === 6 && broken === 0,
      `${finished} finished, ${built} companies, tiers paid ${paid.join("/")}`);
    check(`${seats} seats: the bots still build, and are paid by tier`, built > seats * 6 && paid[0] + paid[1] + paid[2] > 0);
  }
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
