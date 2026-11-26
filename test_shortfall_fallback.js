/* The bank sells for a short player at the SAME half rates the shortfall window charges.

   The shortfall window lets a human choose what to sell, at half price. What it did
   not say was that a human who closed the window without selling let the engine sell
   for them at FULL price - and then hand them a $20 loan with no disc check. Using the
   window was strictly worse than ignoring it. This pins the fallback to the window's
   rates and to the absence of any hidden loan.

   Run: node test_shortfall_fallback.js */
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
    box.exports = { initGame, byId, runProduction, quarterBill, BP_SOLVENCY_PRICE, BP_SELL_PRICE, BP_DATA,
      plotValue, activeBiz, bizSetup, voluntarySalePrice };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

/* A player with one company, a bill they cannot pay, and exactly one thing to sell. */
function short(kind) {
  const st = E.initGame(1, 4242, ["Short"], undefined, false);
  const me = E.byId(st, 0);
  /* A copy of the card with nothing to sell. These checks are about what happens when
     the bill CANNOT be met, so the company must not earn its way out of the shortfall -
     and tying that to where Retail demand happens to sit makes the test hostage to the
     demand table. Production zero guarantees the shortfall whatever the cards say. The
     spread is a copy, because BP_DATA is shared with every other test in this process. */
  const bp = { ...E.BP_DATA.find((b) => b.ind === "RE" && b.lvl === 2), prod: 0 };
  const plot = Object.keys(st.board.graph).find((k) => !(k in st.board.owner));
  st.board.owner[plot] = me.id;
  const biz = { id: 9001, bp, footprint: [plot], level: 2, upgraded: false, distressed: false, scored: true, epOnCard: 0, quarterBuilt: 1 };
  st.board.occupiedBy[plot] = biz.id;
  me.businesses.push(biz);
  me.hand = [];
  me.cash = 0;
  me.discsInBank = 0;
  if (kind === "bp") me.hand = [E.BP_DATA.find((b) => b.lvl === 3)];
  if (kind === "plot") { const other = Object.keys(st.board.graph).find((k) => !(k in st.board.owner)); st.board.owner[other] = me.id; }
  st.quarter = 3;
  return { st, me, biz };
}

console.log("\nA Blueprint sold for you goes at the solvency price, not the planned-sale price");
{
  const { st, me } = short("bp");
  const bp = me.hand[0];
  const bill = E.quarterBill(st, me);
  /* Cash set so that exactly a solvency-price sale covers the bill, the same way the
     plot case below does it. The window's price leaves nothing; the planned-sale price
     would leave the difference sitting in hand. Reading it this way separates the two
     prices cleanly and does not care what the bill happens to be, so a rebalance of the
     cards cannot quietly turn the check into a tautology. */
  me.cash = bill - E.BP_SOLVENCY_PRICE[bp.lvl];
  const discs = me.discsInBank;
  E.runProduction(st, () => {});
  check("the Blueprint was sold for you", me.hand.length === 0);
  check(`it fetched the window's $${E.BP_SOLVENCY_PRICE[bp.lvl]}, not $${E.BP_SELL_PRICE[bp.lvl]}`, me.cash === 0);
  check("no hidden loan was taken", me.discsInBank === discs);
}

console.log("\nA plot sold for you goes at half its value");
{
  const { st, me, biz } = short("plot");
  const spare = Object.keys(st.board.owner).find((k) => st.board.owner[k] === me.id && !(k in st.board.occupiedBy));
  const value = E.plotValue(st, spare);
  const half = Math.floor(value / 2);
  const bill = E.quarterBill(st, me);
  /* Cash set so that exactly a half-price sale covers the bill: full price would leave
     the difference in hand, half price leaves nothing and nothing else is touched. */
  me.cash = bill - half;
  const discs = me.discsInBank;
  E.runProduction(st, () => {});
  check("the spare plot was sold", !(spare in st.board.owner));
  check(`the sale raised $${half} (half of $${value}), so the bill left $0 - not $${value - half}`, me.cash === 0);
  check("the company itself was untouched", biz.distressed === false);
  check("no hidden loan was taken", me.discsInBank === discs);
}

console.log("\nWith nothing left to sell there is no free $20: the company goes into solvency");
{
  const { st, me, biz } = short("none");
  const discs = me.discsInBank;
  E.runProduction(st, () => {});
  check("no disc was pledged behind the player's back", me.discsInBank === discs);
  check("the company that could not be paid for went distressed", biz.distressed === true);
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
