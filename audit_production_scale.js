/* ============================================================================
   Lowering everybody's production, proportionally.

   audit_economy_size.js found that about two thirds of all production is
   recycled at $1 - 64-67% at every table size, flat across company levels -
   while only 11-25% of the demand grid is ever filled. The cause is REACH, not
   exhausted demand: the units exist, the icons exist, and they cannot meet.

   The proposal is the obvious one. If a company produces three times what it
   can sell, print smaller numbers on the cards. Cutting every Blueprint's
   production by the same factor keeps the cards' relationship to each other
   exactly as designed, and only changes how much of the output is real.

   THE QUESTION THIS HAS TO ANSWER IS NOT "does waste fall" - it must, by
   construction. It is whether anything ELSE moves:

     DOES INCOME SURVIVE? Recycling at $1 is not nothing; it is a floor that
     currently carries a third of the units. Cut production and you cut the
     floor as well as the waste, so trade income can fall further than the waste
     does. A company that stops covering its OPEX is a different game.

     DOES THE MARKET STILL WORK? Prices move on what gets built, not on what
     gets sold, so they should hold - but pot sizes depend on OPEX, and if the
     table builds fewer companies because they earn less, the whole loop cools.

     DO THE INDUSTRIES STAY LEVEL? The waste is very unevenly spread - Retail
     71-77% against Technology 34-58% - so an across-the-board cut is NOT
     across-the-board in effect. It takes most from whoever was wasting least,
     which is exactly backwards, and it could easily hand the game to Retail.

     DOES THE HOSPITALITY BONUS BREAK? HO's neighbour trade is a fixed number of
     extra units per adjacent building, and it is NOT scaled here (it is a rule,
     not a printed number). Below some factor that bonus is larger than the
     company's own production, which would be absurd.

   Factors are applied with Math.max(1, Math.round(prod * f)) so no card ever
   drops to zero production.

   WHAT IT FOUND: IT WORKS SLOWLY AND COSTS A LOT. DO NOT CUT DEEP.

   Production alone, at four seats:

     factor        x1.00   x0.80   x0.65   x0.50   x0.35
     waste           64%     57%     52%     41%     28%
     covering OPEX   91%     73%     54%     29%      2%

   The waste does fall, but the margin falls faster, because OPEX is printed
   against the ORIGINAL production. At x0.65 barely half the companies on the
   board can cover their own bill at market price; at x0.50 loan discs per seat
   quadruple; at x0.35 the economy is dead - 2% of companies pay for themselves.

   Scaling OPEX by the same factor is the coherent version of the idea and it
   rescues most of that, but not all of it:

     prod+opex     x1.00   x0.80   x0.65   x0.50
     waste           64%     58%     52%     43%
     covering OPEX   91%     86%     72%     67%
     winning score    92      90      84      82
     loan discs     0.20    0.28    0.45    0.60

   THE REASON THE RETURN IS SO POOR IS THAT WASTE IS NOT A VOLUME PROBLEM. It is
   a REACH problem - audit_economy_size.js found only 11-25% of demand slots ever
   filled, so the icons are there and the units cannot get to them. Cutting
   production shrinks the numerator and the denominator together, so the RATIO
   improves slowly while the absolute economy shrinks fast. A 20% cut buys six
   points of waste; a 35% cut buys twelve and starts costing companies.

   AND THE CUT IS NOT EVEN-HANDED, which is the part that would not show up in
   playtesting for months. Waste is very unevenly spread - Retail 74% against
   Technology 48% at x1.00 - so an across-the-board cut takes proportionally most
   from the industries that were wasting LEAST, exactly backwards. The industry
   spread in the winner's portfolio wobbles between 14 and 31 points across these
   factors with no trend, against a two-standard-error band of about 8 points,
   which is a sign the cut is shuffling the balance rather than preserving it.

   RECOMMENDATION. If the goal is that recycling should feel less like failure,
   x0.80 on production AND OPEX together is the only factor here that is close to
   free: waste 64% to 58%, OPEX coverage 91% to 86%, winning score 92 to 90,
   everything else inside noise. It is also barely worth doing - six points.
   Anything deeper trades the economy for the ratio.

   The lever that would actually move this is REACH: more demand a company can
   sell into, not less production to sell. That is a different change and is not
   tested here.

   Run: node audit_production_scale.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const PROD_NEEDLE = "const bizProd = (b) => b.bp.prod * (b.upgraded ? 2 : 1);";
if (!BASE.includes(PROD_NEEDLE)) { console.error("bizProd changed shape - update this probe"); process.exit(2); }

const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!BASE.includes(SALE_NEEDLE)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }

const econ = { prod: 0, left: 0, earned: 0, byInd: {} };
function loadEngine(factor) {
  let logic = BASE.replace(PROD_NEEDLE,
    `const __PF = ${factor};
     const bizProd = (b) => Math.max(1, Math.round(b.bp.prod * __PF)) * (b.upgraded ? 2 : 1);`);
  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz));\n" +
    "  p.cash += earned + leftover * 1;");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    sale: (earned, left, prod, ind) => {
      econ.earned += earned; econ.left += left; econ.prod += prod;
      const I = econ.byInd[ind] || (econ.byInd[ind] = { prod: 0, left: 0, win: 0 });
      I.prod += prod; I.left += left;
    },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, price,
      plotCount, INDUSTRIES, BP_DATA, hoBonusUnits };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const FACTORS = [1.0, 0.8, 0.65, 0.5, 0.35];
const SEATS = 4;
const rows = [];

for (const f of FACTORS) {
  econ.prod = econ.left = econ.earned = 0; econ.byInd = {};
  const E = loadEngine(f);
  const T = {
    f, games: 0, players: 0,
    winnerEP: 0, spread: 0, gapSecond: 0,
    companies: 0, upgrades: 0, cash: 0, loans: 0, plots: 0,
    endQ: 0, hqs: 0,
    indWin: {}, indBuilt: {},
    profitable: 0, companyQuarters: 0,
    /* printed production of the average level-1 card, for the rulebook table */
    cardProd: E.BP_DATA.filter((b) => b.lvl === 1).reduce((s, b) => s + Math.max(1, Math.round(b.prod * f)), 0)
      / E.BP_DATA.filter((b) => b.lvl === 1).length,
  };
  for (const i of E.INDUSTRIES) { T.indWin[i] = 0; T.indBuilt[i] = 0; }

  for (let seed = 1; seed <= SEEDS; seed++) {
    const st = E.initGame(SEATS - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    T.games++;
    T.endQ += st.quarter;

    const ranked = [...st.players].sort(E.finalRank);
    const winner = ranked[0];
    T.winnerEP += E.epTotal(winner);
    T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
    T.gapSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);

    const wInds = new Set([...E.activeBiz(winner), ...E.megacorpHQs(winner)].map(E.bizInd));
    for (const i of wInds) T.indWin[i]++;

    for (const p of st.players) {
      T.players++;
      T.companies += E.activeBiz(p).length;
      T.upgrades += p.businesses.filter((b) => b.upgraded).length;
      T.cash += p.cash;
      T.loans += p.discsInBank;
      T.plots += E.plotCount(st, p);
      T.hqs += E.megacorpHQs(p).length;
      for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
        T.indBuilt[E.bizInd(b)]++;
        /* would this company cover its own OPEX selling everything at market? */
        T.companyQuarters++;
        const best = E.bizProd(b) * E.price(st.pm, E.bizInd(b));
        if (best >= E.bizOpex(b) + 3 * b.level) T.profitable++;
      }
    }
  }
  T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
  T.byInd = JSON.parse(JSON.stringify(econ.byInd));
  rows.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - lowering every card's production, proportionally");
console.log(`${SEEDS} games each at ${SEATS} seats, personas on. Factor 1.00 is the shipped game.\n`);

const W = 13;
const head = () => console.log(pad("", 40) + rows.map((T) => rp(`x${T.f.toFixed(2)}`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 40) + rows.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 40) + rows.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));
const cash = (name, fn) =>
  console.log(pad(name, 40) + rows.map((T) => rp(`$${Math.round(fn(T))}`, W)).join(""));

console.log("THE THING IT IS MEANT TO FIX");
head();
console.log("─".repeat(40 + W * rows.length));
pct("  production recycled at $1", (T) => T.left / Math.max(1, T.prod));
row("  avg printed prod, a level-1 card", (T) => T.cardProd, 2);
row("  units produced per seat", (T) => T.prod / Math.max(1, T.players), 1);
row("  units sold per seat", (T) => (T.prod - T.left) / Math.max(1, T.players), 1);

console.log("\nDOES INCOME SURVIVE?");
head();
cash("  trade income per seat per game", (T) => T.earned / Math.max(1, T.players));
pct("  companies covering OPEX at market", (T) => T.profitable / Math.max(1, T.companyQuarters));
cash("  cash a seat ends with", (T) => T.cash / Math.max(1, T.players));
row("  unpaid loan discs per seat", (T) => T.loans / Math.max(1, T.players), 2);

console.log("\nDOES THE GAME STILL LOOK LIKE ITSELF?");
head();
row("  winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
row("  winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
row("  winner's lead over last", (T) => T.spread / Math.max(1, T.games));
row("  companies standing per seat", (T) => T.companies / Math.max(1, T.players), 2);
row("  of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
row("  plots per seat", (T) => T.plots / Math.max(1, T.players), 2);
row("  Megacorps per game", (T) => T.hqs / Math.max(1, T.games), 2);
row("  quarter the game ended", (T) => T.endQ / Math.max(1, T.games), 1);

console.log("\nDO THE INDUSTRIES STAY LEVEL?  (share of games in the winner's portfolio)");
head();
console.log("─".repeat(40 + W * rows.length));
{
  const E0 = loadEngine(1);
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 40) + rows.map((T) =>
      rp(`${(100 * T.indWin[ind] / Math.max(1, T.games)).toFixed(0)}%`, W)).join(""));
  }
  console.log(pad("  spread, best minus worst", 40) + rows.map((T) => {
    const v = E0.INDUSTRIES.map((i) => 100 * T.indWin[i] / Math.max(1, T.games));
    return rp(`${(Math.max(...v) - Math.min(...v)).toFixed(0)} pts`, W);
  }).join(""));
  console.log(`\n  two standard errors on each of those shares is about ±${noise(0.5, rows[0].games).toFixed(1)} points.`);

  console.log("\nRecycled share by industry (the cut is not even-handed)");
  head();
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind}`, 40) + rows.map((T) => {
      const d = T.byInd[ind];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
}
console.log("");
