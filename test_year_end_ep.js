/* Cash has to be SPENT to score, in the beginner game only.

   The full game has three places money wants to go - land, upgrades, a Megacorp -
   and cash is a healthy ~14% of a winning score there. The beginner game has none
   of them, and it showed: a seat ended it holding about as much money as a full
   game three quarters longer, and cash was a quarter of the winning score.

   So there, cash scores nowhere except at a year end, where it buys EP outright,
   and the price RISES each year - counted backwards from the end, so the last
   window of the game is always the dearest whether the game is two years or
   three. Money still on the table when the game ends bought nothing.

   The full game is deliberately untouched, and half of what is below checks that.

   Run: node test_year_end_ep.js
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
    box.exports = { initGame, byId, epPrice, doBuyEP, botBuyEP, finalizeGame, epTotal,
      yearEndsOf, finalQuarterOf, humansNeedingRepay, cashToEpRate, CASH_PER_EP };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let fails = 0;
const check = (label, cond, detail) => {
  if (!cond) fails++;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? `  [${detail}]` : ""}`);
};
const section = (t) => console.log(`\n${t}`);
const quiet = () => {};

const beginner = () => E.initGame(1, 7, ["You"], 0, true, { beginner: true });
const full = () => E.initGame(1, 7, ["You"], 0, true, undefined);

section("the price rises, counting back from the end of the game");
{
  const b = beginner(), f = full();
  check("the beginner game has two year ends", E.yearEndsOf(b).join(",") === "4,8", E.yearEndsOf(b).join(","));
  check("its first window is $50", E.epPrice(b, 4) === 50, `$${E.epPrice(b, 4)}`);
  check("and its last is $100 - the dearest, because it is last",
    E.epPrice(b, 8) === 100, `$${E.epPrice(b, 8)}`);
  check("a quarter that is not a year end sells nothing", E.epPrice(b, 5) === 0, `$${E.epPrice(b, 5)}`);
  check("the full game sells no EP at all", E.epPrice(f, 4) === 0 && E.epPrice(f, 12) === 0);
}

section("buying converts cash into points at that price");
{
  const st = beginner();
  const p = E.byId(st, 0);
  st.quarter = 4;
  p.cash = 260;
  const epBefore = E.epTotal(p);
  check("buying 3 EP at the $50 window costs $150",
    E.doBuyEP(st, p, 4, 3, quiet) === true && p.cash === 110, `cash $${p.cash}`);
  check("and the 3 EP are banked", E.epTotal(p) === epBefore + 3, `${epBefore} -> ${E.epTotal(p)}`);
  check("buying more than the cash covers is refused",
    E.doBuyEP(st, p, 4, 99, quiet) === false && p.cash === 110, `cash $${p.cash}`);
  check("and so is buying outside a year end", E.doBuyEP(st, p, 5, 1, quiet) === false);
}

section("money left on the table scores nothing in the beginner game");
{
  const st = beginner();
  const p = E.byId(st, 0);
  st.quarter = E.finalQuarterOf(st);
  p.cash = 500;
  const before = E.epTotal(p);
  E.finalizeGame(st);
  check("$500 unspent is worth no EP at all", E.epTotal(p) === before,
    `${before} -> ${E.epTotal(p)}`);
}

section("the full game still scores cash exactly as it did");
{
  const st = full();
  const p = E.byId(st, 0);
  st.quarter = E.finalQuarterOf(st);
  p.cash = 500;
  const before = E.epTotal(p);
  E.finalizeGame(st);
  check("$500 is still 10 EP at $50 each", E.epTotal(p) === before + 10,
    `${before} -> ${E.epTotal(p)}`);
  check("and a bot is told cash is worth the old flat rate",
    E.cashToEpRate(st) === E.CASH_PER_EP, `${E.cashToEpRate(st)}`);
}

section("a bot spends down to a reserve, and spends everything at the last window");
{
  const st = beginner();
  const p = st.players.find((x) => !x.isHuman);
  st.quarter = 4;
  p.cash = 400;
  E.botBuyEP(st, p, 4, quiet);
  check("at a mid-game window it keeps something back", p.cash > 0 && p.cash < 400, `$${p.cash} left`);

  const st2 = beginner();
  const p2 = st2.players.find((x) => !x.isHuman);
  st2.quarter = E.finalQuarterOf(st2);
  p2.cash = 400;
  E.botBuyEP(st2, p2, st2.quarter, quiet);
  check("at the last window it converts down to the change",
    p2.cash < E.epPrice(st2, st2.quarter), `$${p2.cash} left, price $${E.epPrice(st2, st2.quarter)}`);
}

section("the year-end window opens for a human who only has cash");
{
  const st = beginner();
  st.quarter = 4;
  const human = st.players.find((x) => x.isHuman);
  human.discsInBank = 0;
  human.cash = 0;
  check("broke and debt-free, there is nothing to stop for",
    !E.humansNeedingRepay(st).includes(human.id));
  human.cash = 60;
  check("with enough for one EP, the window opens",
    E.humansNeedingRepay(st).includes(human.id), `$${human.cash} vs $${E.epPrice(st, 4)}`);

  const f = full();
  f.quarter = 4;
  const fh = f.players.find((x) => x.isHuman);
  fh.discsInBank = 0; fh.cash = 9999;
  check("in the full game cash alone never opens it",
    !E.humansNeedingRepay(f).includes(fh.id));
}

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
