/* A company scores ONCE per build and once per upgrade - never once per year.

   Standard rules (v13): the moment it is finished. Building pays 3 EP per level onto
   its card; upgrading vests what is on the card into the bank and scores it afresh at
   the new level, immediately.

   "Score at the year end": the same one score per build or upgrade, only it waits for
   the next year end - which is how the game worked before v13.

   The failure this guards against is a per-year income, which would roughly treble
   what a company is worth over a game.

   Run: node test_scoring_once.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
  const cut = src.indexOf("/* ============================== REACT UI ============================== */");
  const logic = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, BP_DATA, runClosingRest, doUpgrade, activeBiz, epTotal,
      levelEP, vest, sellCompany, claimMegacorp, megacorpWorthIt, bestMegacorpMatch,
      scoreCompanyOnCompletion, mulberry32, hasVariant };
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

const game = (variants) => E.initGame(3, 11, ["You"], undefined, false, variants);

/* Put a company on the board directly - the action economy is not what is under test. */
function plant(st, p, ind, plot, level = 1) {
  const bp = E.BP_DATA.find((x) => x.ind === ind && x.lvl === 1);
  const biz = { id: 7000 + p.businesses.length, bp, footprint: [plot], level,
    upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: st.quarter };
  st.board.occupiedBy[plot] = biz.id;
  p.businesses.push(biz);
  E.scoreCompanyOnCompletion(st, biz);     // the build hook, as doLaunch would call it
  return biz;
}
/* Run the closing of a given quarter without playing the quarter. */
const closeYear = (st, q) => { st.quarter = q; E.runClosingRest(st, quiet); };
/* Players start owning nothing, so hand this one a handful of plots to build on. */
function giveLand(st, p, n = 6) {
  const plots = Object.keys(st.board.graph).slice(0, n);
  plots.forEach((k) => { st.board.owner[k] = p.id; });
  return plots;
}
const freePlot = (st, p) => Object.keys(st.board.owner)
  .find((k) => st.board.owner[k] === p.id && !st.board.occupiedBy[k]);
/* Everything a company has paid this player: what has vested into the bank plus what
   is still sitting on its card. Reading p.epBank alone would also pick up the two land
   awards, which are now paid at every year end and have nothing to do with the company. */
const fromCompanies = (p) =>
  (p.epLog || []).filter((e) => String(e.label).startsWith("Vested:")).reduce((n, e) => n + e.amount, 0)
  + p.businesses.reduce((n, b) => n + (b.epOnCard || 0), 0);

/* ------------------------------------------------------- standard rules */
section("Standard rules - a company scores the moment it is built");
{
  const st = game(undefined);
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 2);
  check("a level is worth 3 EP", E.levelEP(st) === 3);
  check("building puts 6 EP on the card at once", biz.epOnCard === 6 && biz.scored === true, `${biz.epOnCard} EP`);

  closeYear(st, 4);
  check("the year end finds it already scored and leaves it", biz.epOnCard === 6, `${biz.epOnCard} EP`);
  closeYear(st, 8);
  check("so does the next one - this is not an income", biz.epOnCard === 6, `${biz.epOnCard} EP`);

  closeYear(st, 12);
  check("6 EP for the whole game, and no more", fromCompanies(p) === 6, `${fromCompanies(p)} EP`);
  check("and the end of the game vests the card into the bank", biz.epOnCard === 0);
}

section("Upgrading scores again, on the spot");
{
  const st = game(undefined);
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 1);   // vertical scaling: an upgrade needs no new plot
  check("it scores 3 for level 1, immediately", biz.epOnCard === 3);

  const bankBefore = p.epBank;
  st.quarter = 5;
  p.cash = 500;
  const ok = E.doUpgrade(st, p, biz, quiet, E.mulberry32(3));
  check("the upgrade went through", ok === true && biz.level === 2, `level ${biz.level}`);
  check("the old EP vested into the bank", p.epBank === bankBefore + 3, `bank +${p.epBank - bankBefore}`);
  check("and the new level is on the card at once", biz.epOnCard === 6 && biz.scored === true, `${biz.epOnCard} EP`);

  closeYear(st, 8);
  check("the year end adds nothing", biz.epOnCard === 6, `${biz.epOnCard} EP`);
  check("the company has paid 3 + 6, not 3 a year", fromCompanies(p) === 9, `${fromCompanies(p)}`);
}

/* ------------------------------------------------- the older way, as a variant */
section("Score at the year end - the same one score, only later");
{
  const st = game({ classicScoring: true });
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 2);
  check("nothing is on the card yet", biz.epOnCard === 0 && biz.scored === false);

  closeYear(st, 4);
  check("the year end scores it", biz.epOnCard === 6 && biz.scored === true, `${biz.epOnCard} EP`);
  closeYear(st, 8);
  check("and the next one leaves it alone", biz.epOnCard === 6, `${biz.epOnCard} EP`);

  const vestedBefore = fromCompanies(p);
  st.quarter = 9;
  p.cash = 500;
  E.doUpgrade(st, p, biz, quiet, E.mulberry32(3));
  check("upgrading vests the old level", fromCompanies(p) === vestedBefore, `${fromCompanies(p)}`);
  check("but the card waits for the year end again", biz.epOnCard === 0 && biz.scored === false);
  closeYear(st, 12);
  check("the company has paid 6 + 9", fromCompanies(p) === 15, `${fromCompanies(p)}`);
}

section("Levels score single - the other switch");
{
  const st = game({ singleLevelEP: true });
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 2);
  check("a level is worth 1 EP", E.levelEP(st) === 1);
  check("so a level 2 company scores 2, not 6", biz.epOnCard === 2, `${biz.epOnCard} EP`);
}

section("Both modes pay a company the same, whatever the timing");
{
  const total = (variants) => {
    const st = game(variants);
    const p = st.players[0];
    giveLand(st, p);
    const b = plant(st, p, "RE", freePlot(st, p), 1);
    closeYear(st, 4);
    st.quarter = 5; p.cash = 500;
    E.doUpgrade(st, p, b, quiet, E.mulberry32(3));
    closeYear(st, 8);
    closeYear(st, 12);
    return fromCompanies(p);
  };
  const std = total(undefined);
  const late = total({ classicScoring: true });
  check("build at level 1, upgrade once: same EP whichever timing", std === late,
    `on completion ${std}, at the year end ${late}`);
  check("and that total is 3 + 6 at three EP a level", std === 9, `${std}`);
}

/* ---------------------------------------------- what the bots believe */
section("The bots price a company the same way");
{
  /* megacorpWorthIt weighs a tile against the level EP the merged companies had NOT
     scored yet. Once they have scored, that EP is on their cards and merging vests it,
     so it is not at risk and must not count against the tile. */
  /* Only (players + 1) of the sixteen tiles are in play, so hunt for a table whose
     pool actually offers something three level-1 companies can claim. */
  let st = null, p = null, built = null, match = null;
  for (let seed = 1; seed <= 60 && !match; seed++) {
    st = E.initGame(3, seed, ["You"], undefined, false, undefined);
    p = st.players[0];
    giveLand(st, p);
    const plots = Object.keys(st.board.owner).filter((k) => st.board.owner[k] === p.id).slice(0, 3);
    const inds = ["HC", "TE", "RE"];
    built = plots.map((k, i) => plant(st, p, inds[i], k, 1));
    match = E.bestMegacorpMatch(E.activeBiz(p), st.megacorpPool);
  }
  if (!match) { check("a merger combination exists to test with", false, "none in 60 seeds"); }
  else {
    const beforeScoring = E.megacorpWorthIt(st, p, match);
    closeYear(st, 4);
    const afterScoring = E.megacorpWorthIt(st, p, match);
    check("scored companies cost nothing to merge, so a merger is never worse after a year end",
      afterScoring === true || afterScoring === beforeScoring,
      `before ${beforeScoring}, after ${afterScoring}`);
    check("all three had scored by then", built.every((b) => b.scored));
  }
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
