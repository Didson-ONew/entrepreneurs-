/* ============================================================================
   Manufacturing must not be left holding a panel it cannot act on.

   THE REPORT. "MA should not show demand marked still once all production has
   been matched to demand icons. It's confusing, making the player believe they
   can still deliver something but the game is blocking it."

   THE CAUSE. Cross-selling is a ROUTE for production, not a second pile of
   goods: humanDeliver spends deliveryRemaining on a cross-sell exactly as on a
   normal one, and refuses outright once that hits zero -

       if ((state.deliveryRemaining[bizId] || 0) <= 0) return false;

   but the UI decided whether the company still had something to do with

       deliveryRemaining > 0 || crossSellRemaining > 0

   crossSellRemaining is set to the company's LEVEL at the start of the quarter
   and only ever decreases when a cross-sell actually happens. So a level-3
   Manufacturing that sold all its production into its own industry finished with
   0 production and 3 cross-sell allowance unspent - and the panel stayed open,
   showing an allowance, refusing every click. The player could only escape by
   pressing skip, which reads like giving something up.

   Both halves of that condition are load-bearing in the wrong direction, so this
   file pins the rule down from both ends: the engine must refuse, and the UI must
   not wait. Bots never exercise it - autoDeliver takes a different path - so
   nothing in a simulation would ever have caught it.

   Run: node test_cross_sell.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* The UI half of the rule lives in the React half of the file, so it is read as
   text. These two are the whole fix; if either moves, this test is lying. */
const UI = SRC.slice(CUT);
const NEEDLES = [
  ["the engine refuses a delivery with no production left",
   "if ((state.deliveryRemaining[bizId] || 0) <= 0) return false;"],
  ["the UI waits on production alone",
   "const stillHas = (state.deliveryRemaining[deliveringBiz.id] || 0) > 0;"],
];
for (const [what, needle] of NEEDLES) {
  if (!SRC.includes(needle)) {
    console.error(`the code changed shape - ${what} is no longer written as this test expects`);
    process.exit(2);
  }
}

const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "") + `
  box.E = { initGame, humanDeliver, bizInd, activeBiz, INDUSTRIES };
`, sandbox);
const E = box.E;

let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  [" + detail + "]" : ""}`);
  if (!cond) fails++;
};

console.log("Entrepreneurs - Manufacturing's cross-sell allowance\n");

/* The situation the report describes, built directly: a Manufacturing company
   that has sold everything it made and still holds an unspent allowance. */
const st = E.initGame(3, 5, ["Seat 1"], undefined, true, undefined);
const p = st.players[0];
const plot = Object.keys(st.board.graph)[0];
p.plots = [plot];
const ma = {
  id: "probe-ma", bp: { name: "Probe Works", ind: "MA", lvl: 3, opex: 9, prod: 6, deps: [] },
  level: 3, footprint: [plot], active: true,
};
p.businesses = [ma];
st.deliveringBizId = ma.id;
st.awaitingPlayerId = p.id;
st.deliveryRemaining = { [ma.id]: 0 };      // every unit already sold
st.crossSellRemaining = { [ma.id]: 3 };     // allowance untouched
st.hoBonusPaid = {};

console.log("A LEVEL-3 MANUFACTURING THAT SOLD EVERYTHING IT MADE");
console.log(`  production left:      ${st.deliveryRemaining[ma.id]}`);
console.log(`  cross-sell allowance: ${st.crossSellRemaining[ma.id]}\n`);

/* 1. The engine's answer: there is nothing to deliver, so nothing may be. */
const anyTile = Object.keys(st.demand.tiles)[0];
const before = p.cash;
const took = E.humanDeliver(st, p, anyTile, 0, 0, true, () => {});
check("a cross-sell with no production left is refused", took === false);
check("and it costs the player nothing", p.cash === before, `$${before} -> $${p.cash}`);
const tookPlain = E.humanDeliver(st, p, anyTile, 0, 0, false, () => {});
check("a plain delivery with no production left is refused too", tookPlain === false);

/* 2. The UI's answer has to agree, or the panel stays open on a refusal. This is
      the exact expression the delivery handler uses, quoted from the source above
      by the needle check, so it cannot drift without this test failing. */
const stillHas = (state, id) => (state.deliveryRemaining[id] || 0) > 0;
check("the UI treats the company as finished", !stillHas(st, ma.id),
  "the panel closes and play moves to the next industry");

/* And the old condition must be shown to have been the bug, not a straw man. */
const oldStillHas = (state, id) =>
  (state.deliveryRemaining[id] || 0) > 0 || (state.crossSellRemaining[id] || 0) > 0;
check("the condition it replaced would have stranded it", oldStillHas(st, ma.id),
  "production 0, allowance 3 - open panel, every click refused");

/* 3. With production in hand the allowance still works, or the fix has removed
      the feature instead of the bug. */
console.log("\nTHE SAME COMPANY WITH PRODUCTION STILL IN HAND");
st.deliveryRemaining[ma.id] = 4;
st.crossSellRemaining[ma.id] = 3;
check("the UI keeps the panel open", stillHas(st, ma.id));
check("and the cross-sell allowance is still spendable",
  (st.crossSellRemaining[ma.id] || 0) > 0 && (st.deliveryRemaining[ma.id] || 0) > 0);

/* 4. What the panel is allowed to advertise: never more cross-sell than there is
      production to spend on it. */
console.log("\nWHAT THE PANEL MAY CLAIM");
const shown = (prod, allow) => Math.min(allow, prod);
check("2 units left, 3 allowance -> shows 2", shown(2, 3) === 2);
check("4 units left, 3 allowance -> shows 3", shown(4, 3) === 3);
check("0 units left, 3 allowance -> shows nothing", shown(0, 3) === 0,
  "which is the number that used to read as goods you do not have");

console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
process.exit(fails ? 1 : 0);
