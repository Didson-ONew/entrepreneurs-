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
      normaliseVariants, INDUSTRIES, RENT_PER_LEVEL, price, hqRentDue };
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
section("Pay: one round amount to each supplier, by the company's level");
{
  const st = E.initGame(2, 5, ["You"], undefined, false, undefined);
  const want = { 1: 5, 2: 10, 3: 20, 4: 40 };
  for (const bp of [card("TE-01"), card("MA-06"), card("HC-10")]) {
    for (const up of [false, true]) {
      const b = E.newBusiness(bp, ["a"], 1, st);
      if (up) { b.upgraded = true; b.level = bp.lvl + 1; }
      const unit = want[b.level], n = bp.deps.length;
      check(`${bp.name}${up ? ", upgraded" : ""}: ${n} supplier${n > 1 ? "s" : ""} at $${unit} each`,
        E.bizPotBill(st, b) === unit * n && same(E.potShares(st, b), bp.deps.map(() => unit)),
        `bill $${E.bizPotBill(st, b)}, shares ${E.potShares(st, b).join("+")}`);
    }
  }
  check("the sheet's own line: a Level 2 with two suppliers pays $10 + $10",
    same(E.potShares(st, E.newBusiness(card("MA-06"), ["a", "b"], 1, st)), [10, 10]));
  check("a card in hand is priced the same way", E.cardPotBill(st, card("HC-10")) === 60 && E.cardPotBill(st, card("RE-01")) === 5);
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
section("Earn: the tiers printed on the cards");
{
  const pins = [
    ["MA", 2, { icons: [0, 5, 8], price: [0, 4, 7], pays: [10, 35, 55] }, "Auto Plant, the card in the sheet's examples"],
    ["HC", 1, { icons: [0, 2, 3], price: [0, 5, 8], pays: [5, 10, 25] }, "Urgent Care Clinic"],
    ["HC", 2, { icons: [0, 4, 6], price: [0, 5, 8], pays: [10, 25, 50] }, "Urgent Care Clinic, upgraded"],
    ["TE", 1, { icons: [0, 1, 2], price: [0, 5, 8], pays: [5, 10, 15] }, "App Startup"],
    ["TE", 2, { icons: [0, 2, 4], price: [0, 5, 8], pays: [5, 25, 30] }, "App Startup, upgraded"],
  ];
  for (const [ind, lvl, want, name] of pins) {
    const got = E.tierTable(ind, lvl);
    check(`${name}: ${want.pays.map((v) => "$" + v).join(" / ")}`, same(got, want), JSON.stringify(got));
  }
  const need = {};
  E.INDUSTRIES.forEach((i) => { const t = E.tierTable(i, 1); need[i] = `$${t.price[1]} · $${t.price[2]}`; });
  check("the price a tier asks for depends on the industry alone: $3 · $6, $4 · $7, $5 · $8",
    need.UT === "$3 · $6" && need.RE === "$3 · $6" && need.HO === "$4 · $7" && need.MA === "$4 · $7" && need.HC === "$5 · $8" && need.TE === "$5 · $8",
    JSON.stringify(need));
  let rising = true, fives = true, nested = true;
  for (const ind of E.INDUSTRIES) for (let l = 1; l <= 4; l++) {
    const t = E.tierTable(ind, l);
    if (!(t.pays[0] < t.pays[1] && t.pays[1] < t.pays[2])) rising = false;
    if (t.pays.some((v) => v % 5 !== 0 || v < 5)) fives = false;
    if (!(t.icons[1] <= t.icons[2] && t.price[1] < t.price[2])) nested = false;
  }
  check("every card's three tiers rise, on every level of every industry", rising);
  check("every payout is a multiple of $5, and none is below $5", fives);
  check("the top tier always asks for at least what the middle asks", nested);
}

section("Earn: the best tier fully met, and the Minimum otherwise");
{
  const pay = (icons, px) => E.tierFor("MA", 2, icons, px).pays;
  check("6 icons at $5 collects the middle tier, $35", pay(6, 5) === 35, `$${pay(6, 5)}`);
  check("9 icons at $5 still collects $35 - the top tier needs $7", pay(9, 5) === 35, `$${pay(9, 5)}`);
  check("9 icons at $7 collects the top tier, $55", pay(9, 7) === 55, `$${pay(9, 7)}`);
  check("3 icons at $9 collects the Minimum, $10 - a high price is not enough alone", pay(3, 9) === 10, `$${pay(3, 9)}`);
  check("no icons at all still collects the Minimum", pay(0, 2) === 10, `$${pay(0, 2)}`);
  check("exactly on both thresholds counts", pay(5, 4) === 35 && pay(8, 7) === 55);
  check("a dollar short on price drops a tier", pay(5, 3) === 10 && pay(8, 6) === 35);
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
    check("less the middle tier's $35, that leaves $12 before its pot share", E.tierFor("MA", 2, 6, 5).pays - 23 === 12);
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
