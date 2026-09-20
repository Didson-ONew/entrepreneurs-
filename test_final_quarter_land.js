/* A game called early on a year end pays the land awards ONCE.

   The land awards pay at every year end, and the final quarter pays them as part of
   final scoring. A second Megacorp can call Q8 as the final quarter - and then Q8 is
   both, and the leader was paid twice. This pins the quarter-close sequence: the
   year-end pass skips the awards when that quarter is the final one, and final
   scoring pays them.

   Run: node test_final_quarter_land.js */
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
    box.exports = { initGame, byId, runClosingRest, finalizeGame, landAward };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

/* Two players, one of whom owns a plot: the outright land leader. */
function table(quarter, finalQuarter) {
  const st = E.initGame(2, 99, ["Leader", "Other"], undefined, false);
  const me = E.byId(st, 0);
  const plot = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
  st.board.owner[plot] = me.id;
  st.quarter = quarter;
  if (finalQuarter) st.finalQuarter = finalQuarter;
  return { st, me };
}
const mogul = (p) => (p.epLog || []).filter((e) => e.label === "The Real-Estate Mogul");
const closeThenFinal = (st) => { E.runClosingRest(st, () => {}); E.finalizeGame(st); };

console.log("\nAn ordinary Q8 pays the awards at the year end");
{
  const { st, me } = table(8, null);
  E.runClosingRest(st, () => {});
  check(`the leader was paid once (${mogul(me).length} time(s))`, mogul(me).length === 1);
}

console.log("\nQ8 called as the final quarter pays them once, in final scoring");
{
  const { st, me } = table(8, 8);
  const sole = E.landAward(st).sole;
  closeThenFinal(st);
  const paid = mogul(me);
  check(`the leader was paid once, not twice (${paid.length} time(s))`, paid.length === 1);
  check(`for the full ${sole} EP`, paid.reduce((a, e) => a + e.amount, 0) === sole);
}

console.log("\nQ12 is unchanged: the year-end pass leaves it to final scoring");
{
  const { st, me } = table(12, null);
  closeThenFinal(st);
  check(`the leader was paid once (${mogul(me).length} time(s))`, mogul(me).length === 1);
}

console.log("\nQ4 with the final quarter set to Q5 still pays the Year 1 award");
{
  const { st, me } = table(4, 5);
  E.runClosingRest(st, () => {});
  check(`the leader was paid at Q4 (${mogul(me).length} time(s))`, mogul(me).length === 1);
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
