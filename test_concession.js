/* The Concession Holder decides, every quarter, whether to sell Utilities at $1 over
   the price - and pays for it with a step off the Utilities market at quarter end.

   The persona used to be a flat +$1 with no decision in it. This proves the switch is
   off until somebody flips it, that a human is asked in the supplyChain phase and a bot
   answers for itself, and that the bill is charged exactly once per quarter used.

   Run: node test_concession.js */
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
    box.exports = { initGame, byId, price, unitPrice, autoDeliver, PRICE_MIN, moveMarker, trackCell,
      concessionOn, concessionAvailable, botWantsConcession, setConcession, runConcessionErosion,
      humansNeedingSupplyChain, applySupplyChainBump, chooseSupplyChain, noteConcessionSale, bizInd };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}`);
  if (!cond) failures++;
};

/* A holder with a producing level-1 Utilities company on a plot in a district that
   carries a Utilities row, so its delivery can actually sell something. */
function scenario(isHuman) {
  const st = E.initGame(2, 777, ["Holder", "Other"], undefined, false);
  const me = E.byId(st, 0);
  me.persona = "gov_rel";
  me.isHuman = isHuman;
  let plot = null;
  for (const [k, t] of Object.entries(st.demand.tiles)) {
    if (!t.rows.includes("UT")) continue;
    const inTile = Object.keys(st.board.cellOf).filter((pk) => {
      const c = st.board.cellOf[pk];
      return `${c.r},${c.c}` === k && !(pk in st.board.occupiedBy);
    });
    if (inTile.length) { plot = inTile[0]; break; }
  }
  if (!plot) throw new Error("no district with a Utilities row - seed changed?");
  const bp = { code: "UT-TEST", ind: "UT", name: "Test Waterworks I", lvl: 1, setup: 20, opex: 5, deps: [], prod: 4 };
  st.board.owner[plot] = me.id;
  const biz = { id: 9001, bp, footprint: [plot], level: 1, upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 };
  st.board.occupiedBy[plot] = biz.id;
  me.businesses.push(biz);
  me.cash = 200;
  st.quarter = 3;
  return { st, me, biz };
}

console.log("\nOff until switched on");
{
  const { st, me, biz } = scenario(true);
  const base = E.price(st.pm, "UT");
  check("the holder has a decision to make", E.concessionAvailable(st, me));
  check("a rival without the persona does not", !E.concessionAvailable(st, E.byId(st, 1)));
  check("nothing is on at the start", !E.concessionOn(st, me));
  check(`Utilities sells at the plain price $${base}`, E.unitPrice(st, me, biz) === base);
  check("a human holder is queued for the supplyChain prompt", E.humansNeedingSupplyChain(st).includes(me.id));
  st.phase = "supplyChain"; st.scQueue = [me.id]; st.awaitingPlayerId = me.id;
  check("the human's answer 'concession:on' is accepted", E.chooseSupplyChain(st, me, "concession:on", () => {}, () => 0.5));
  check("and the concession is on", E.concessionOn(st, me));
  check(`Utilities now sells at $${base + 1}`, E.unitPrice(st, me, biz) === base + 1);
}

console.log("\nThe bill comes once, at quarter end, only if the premium was used");
{
  const { st, me, biz } = scenario(true);
  const base = E.price(st.pm, "UT");
  E.setConcession(st, me, true);
  E.runConcessionErosion(st, () => {});
  check("switched on but nothing sold: no step off the market", E.price(st.pm, "UT") === base);
  check("...and the switch resets for the next quarter", !E.concessionOn(st, me));
  E.setConcession(st, me, true);
  E.noteConcessionSale(st, me, biz, 2);
  E.noteConcessionSale(st, me, biz, 2);
  E.runConcessionErosion(st, () => {});
  check("two premium sales in one quarter cost one step, not two", E.price(st.pm, "UT") === base - 1);
  E.runConcessionErosion(st, () => {});
  check("the next quarter charges nothing on its own", E.price(st.pm, "UT") === base - 1);
}

console.log("\nA bot's delivery pays the premium and takes the bill");
{
  const { st, me, biz } = scenario(false);
  E.moveMarker(st.pm, "UT", 6);   // lift the market so the bot has room to spend a step
  const base = E.price(st.pm, "UT");
  check(`at $${base} the bot wants the concession`, E.botWantsConcession(st, me));
  E.applySupplyChainBump(st, () => {});
  check("applySupplyChainBump switched it on for the bot", E.concessionOn(st, me));
  const cash = me.cash;
  E.autoDeliver(st, me, biz);
  const earned = me.cash - cash;
  check(`the delivery earned $${earned} - at least one unit at $${base + 1}`, earned >= base + 1);
  check("the sale was noted", !!(st.concessionUsed && st.concessionUsed[me.id]));
  E.runConcessionErosion(st, () => {});
  check(`Utilities fell to $${base - 1}`, E.price(st.pm, "UT") === base - 1);
}

console.log("\nA bot protects a low market");
{
  const { st, me } = scenario(false);
  st.pm.cell = st.pm.cell || {};
  st.pm.cell.UT = 0;   // the floor
  check(`at the floor ($${E.PRICE_MIN}) the bot leaves it off`, !E.botWantsConcession(st, me));
  E.moveMarker(st.pm, "UT", 2);
  check(`one step up ($${E.price(st.pm, "UT")}) is still not worth eroding`, !E.botWantsConcession(st, me));
  E.moveMarker(st.pm, "UT", 2);
  check(`two steps up ($${E.price(st.pm, "UT")}) the bot takes it`, E.botWantsConcession(st, me));
  st.pm.cell.UT = 0;
  st.quarter = 12;
  check("in the final quarter there is nothing to protect, so it always takes it", E.botWantsConcession(st, me));
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
