/* A company scores ONCE - not once per year.

   Standard rules: at the first year end after it is built. Upgrading vests what is
   on the card into the bank and lets it score again, at the new level, at the next
   year end.

   Score on completion: the same one score per build or upgrade, only it happens the
   moment the work is done. Upgrading vests immediately and puts the new level on the
   card there and then.

   This is easy to get wrong in the direction of a per-year income, which would roughly
   triple what companies are worth, so it is pinned here.

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
      scoreCompanyIfImmediate, mulberry32 };
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
  E.scoreCompanyIfImmediate(st, biz);      // the build hook, as doLaunch would call it
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

/* ------------------------------------------------------- standard rules */
section("Standard rules - one score, at the first year end after building");
{
  const st = game(undefined);
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 2);
  check("nothing is on the card before a year end", biz.epOnCard === 0 && biz.scored === false);

  closeYear(st, 4);
  check("Year 1 puts its level on the card", biz.epOnCard === 2 && biz.scored === true, `${biz.epOnCard} EP`);

  closeYear(st, 8);
  check("Year 2 leaves it alone - this is not an income", biz.epOnCard === 2, `${biz.epOnCard} EP`);

  const bank = p.epBank;
  closeYear(st, 12);
  check("Year 3 adds nothing either", p.epBank + biz.epOnCard === bank + 2,
    `${p.epBank + biz.epOnCard - bank} EP for the whole game`);
  check("and the end of the game vests the card into the bank",
    biz.epOnCard === 0 && p.epBank === bank + 2, `bank +${p.epBank - bank}`);
}

section("Upgrading is what makes it score again");
{
  const st = game(undefined);
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 1);   // vertical scaling: an upgrade needs no new plot
  closeYear(st, 4);
  check("it scores 1 for level 1", biz.epOnCard === 1);

  const bankBefore = p.epBank;
  st.quarter = 5;
  p.cash = 500;
  const ok = E.doUpgrade(st, p, biz, quiet, E.mulberry32(3));
  check("the upgrade went through", ok === true && biz.level === 2, `level ${biz.level}`);
  check("the old EP vested on upgrade", p.epBank === bankBefore + 1, `bank ${p.epBank - bankBefore}`);
  check("and the card is empty, waiting for the year end", biz.epOnCard === 0 && biz.scored === false);

  closeYear(st, 8);
  check("the next year end scores it at its NEW level", biz.epOnCard === 2, `${biz.epOnCard} EP`);
  check("total credited is 1 + 2, not 1 per year", p.epBank + biz.epOnCard === bankBefore + 3,
    `${p.epBank + biz.epOnCard - bankBefore}`);
}

/* --------------------------------------------------- score on completion */
section("Score on completion - the same one score, only sooner");
{
  const st = game({ immediateScoring: true });
  const p = st.players[0];
  giveLand(st, p);
  const biz = plant(st, p, "HC", freePlot(st, p), 2);
  check("building scores it there and then", biz.epOnCard === 2 && biz.scored === true, `${biz.epOnCard} EP`);

  closeYear(st, 4);
  check("the year end finds it already scored and leaves it", biz.epOnCard === 2, `${biz.epOnCard} EP`);

  const bankBefore = p.epBank;
  st.quarter = 5;
  p.cash = 500;
  E.doUpgrade(st, p, biz, quiet, E.mulberry32(3));
  check("upgrading vests the old level immediately", p.epBank === bankBefore + 2, `bank +${p.epBank - bankBefore}`);
  check("and puts the new level on the card at once", biz.epOnCard === 3 && biz.scored === true, `${biz.epOnCard} EP`);

  closeYear(st, 8);
  check("the year end still leaves it alone", biz.epOnCard === 3, `${biz.epOnCard} EP`);
  check("total is 2 + 3 either way", p.epBank + biz.epOnCard === bankBefore + 5,
    `${p.epBank + biz.epOnCard - bankBefore}`);
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
    return p.epBank + b.epOnCard;
  };
  const std = total(undefined);
  const imm = total({ immediateScoring: true });
  check("build at level 1, upgrade once: same EP under both", std === imm, `standard ${std}, immediate ${imm}`);
}

/* ---------------------------------------------- what the bots believe */
section("The bots price a company the same way");
{
  /* megacorpWorthIt weighs a tile against the level EP the merged companies had NOT
     scored yet. Once they have scored, that EP is on their cards and merging vests it,
     so it is not at risk and must not count against the tile. */
  const st = game(undefined);
  const p = st.players[0];
  giveLand(st, p);
  const plots = Object.keys(st.board.owner).filter((k) => st.board.owner[k] === p.id).slice(0, 3);
  const inds = ["HC", "TE", "RE"];
  const built = plots.map((k, i) => plant(st, p, inds[i], k, 1));
  const match = E.bestMegacorpMatch(E.activeBiz(p), st.megacorpPool);
  if (!match) { check("a merger combination exists to test with", false, "no match"); }
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
