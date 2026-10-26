/* A human is paid for exactly one unit an icon, exactly as a bot is - and cannot
   sell into the same icon twice in a quarter.

   An icon takes ONE unit from each company that reaches it, every quarter (v22; it
   used to take its column, once). A bot delivers one unit per icon (autoDeliver);
   a human clicking an icon is paid for one, whatever they have left, and the icon
   is then closed to THAT company until the next quarter while staying open to
   everybody else.

   Run: node test_deliver_pay_cap.js */
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
    box.exports = { initGame, byId, humanDeliver, unitPrice, BP_DATA, eligibleSlotsFor, slotUsedBy };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => { console.log(`${cond ? "  ok  " : " FAIL "} ${label}`); if (!cond) failures++; };

/* A level-3 Retail company in a district with a Retail row, all four columns open. */
function scenario() {
  const st = E.initGame(1, 4242, ["You"], undefined, false);
  const me = E.byId(st, 0);
  let plot = null, tileKey = null;
  for (const [k, t] of Object.entries(st.demand.tiles)) {
    if (!t.rows.includes("RE")) continue;
    const inTile = Object.keys(st.board.cellOf).filter((pk) => { const c = st.board.cellOf[pk]; return `${c.r},${c.c}` === k && !(pk in st.board.occupiedBy); });
    if (inTile.length) { plot = inTile[0]; tileKey = k; break; }
  }
  const bp = E.BP_DATA.find((b) => b.ind === "RE" && b.lvl === 3);
  st.board.owner[plot] = me.id;
  const biz = { id: 9001, bp, footprint: [plot], level: 3, upgraded: false, distressed: false, scored: true, epOnCard: 0, quarterBuilt: 1 };
  st.board.occupiedBy[plot] = biz.id;
  me.businesses.push(biz);
  st.quarter = 5;
  st.deliveringBizId = biz.id;
  st.crossSellRemaining = {};
  st.reChoices = { [biz.id]: [] };
  return { st, me, biz, tileKey, reRow: st.demand.tiles[tileKey].rows.indexOf("RE") };
}

console.log("\nOne unit left, a column-3 icon clicked");
{
  const { st, me, biz, tileKey, reRow } = scenario();
  st.deliveryRemaining = { [biz.id]: 1 };
  const price = E.unitPrice(st, me, biz);
  const cash = me.cash;
  const ok = E.humanDeliver(st, me, tileKey, reRow, 2, false, () => {});
  check("the delivery went through", ok);
  check("the icon is marked sold-to for this company", E.slotUsedBy(st.demand, biz.id, tileKey, reRow, 2));
  check(`paid for 1 unit ($${price}) (got $${me.cash - cash})`, me.cash - cash === price);
  check("nothing is left to deliver", (st.deliveryRemaining[biz.id] || 0) === 0);
}

console.log("\nPlenty left: an icon still takes one unit, not its column");
{
  const { st, me, biz, tileKey, reRow } = scenario();
  st.deliveryRemaining = { [biz.id]: 16 };
  const price = E.unitPrice(st, me, biz);
  const cash = me.cash;
  E.humanDeliver(st, me, tileKey, reRow, 2, false, () => {});
  check(`paid for 1 unit ($${price}) (got $${me.cash - cash})`, me.cash - cash === price);
  check("15 units remain", st.deliveryRemaining[biz.id] === 15);
  const again = E.humanDeliver(st, me, tileKey, reRow, 2, false, () => {});
  check("the same icon cannot be sold into twice in one quarter", again === false && st.deliveryRemaining[biz.id] === 15);
  check("but the icon is not closed to anybody else", !E.slotUsedBy(st.demand, 9002, tileKey, reRow, 2));
  const other = E.humanDeliver(st, me, tileKey, reRow, 1, false, () => {});
  check("and the next column is still open to this company", other === true && st.deliveryRemaining[biz.id] === 14);
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
