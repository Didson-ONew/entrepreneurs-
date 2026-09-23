/* The Megacorp headquarters has to appear in the ledger, and say what it costs.

   It was invisible: activeBiz() filters out isHQ, and the Portfolio is built
   from activeBiz(), so the one thing holding a company slot and a disc for the
   rest of the game was the one thing not shown. A player could see five slots
   used and count four companies.

   This checks the card exists and reads the same numbers the engine settles
   with - the dividend, the tier it is divided by, the tithe, the rent, and
   whether the ground under it is still owned. A picture that quotes its own
   figures goes stale silently, which is the mistake the tutorial art made. */
const fs = require("fs"), vm = require("vm"), path = require("path");

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const MARK = "/* ============================== REACT UI ============================== */";
const logic = src.slice(0, src.indexOf(MARK)).replace(/^\s*(import|export)\s.*$/gm, "");
const ui = src.slice(src.indexOf(MARK));

let fails = 0;
const check = (label, ok, note = "") => {
  console.log(` ${ok ? "ok  " : "FAIL"}  ${label}${note ? `  [${note}]` : ""}`);
  if (!ok) fails++;
};

/* --- the card is there, and reads the engine rather than quoting figures --- */
const card = ui.slice(ui.indexOf("{megacorpHQs(human).map("), ui.indexOf("{!activeBiz(human).length"));
check("the ledger draws a card for every headquarters", card.length > 0 && card.length < 4000,
  `${card.length} characters`);
for (const [what, needle] of [
  ["the dividend, off the price and the tier", "brandEPFor("],
  ["the tier itself", "tierOfHQ("],
  ["the tithe, counted from the rivals beside it", "hqRivalNeighbours("],
  ["the ground rent its owner pays from pocket", "bizGroundRent("],
  ["whether the ground under it is still owned", "businessCanProduce("],
]) check(`it reads ${what}`, card.includes(needle), needle);
check("and hardcodes no figure of its own",
  !/[^A-Z_\w]\d+ EP\b/.test(card.replace(/\{[^}]*\}/g, "")), "a number typed into the card");
check("it says the slot and the disc are gone for good",
  /cannot be sold/.test(card));
check("it says what happens when the land is sold",
  /Land unowned/.test(card));

/* --- and the engine really does behave the way the card says --- */
const box = {};
vm.runInNewContext(logic + `
  box.e = { initGame, activeBiz, megacorpHQs, claimMegacorp, bestMegacorpMatch, companySlotsUsed,
            businessCanProduce, brandEPFor, tierOfHQ, price, bizInd, BP_DATA };`,
  { console, Math, Set, Object, Array, JSON, String, Date, box });
const E = box.e;

const st = E.initGame(1, 7, ["You"], undefined, false);
const me = st.players[0];
["UT", "RE", "HO"].forEach((ind, i) => {
  const bp = E.BP_DATA.find((b) => b.lvl === 1 && b.ind === ind);
  const plot = Object.keys(st.board.graph)[i * 4];
  me.businesses.push({ id: 900 + i, bp, level: 1, upgraded: false, distressed: false, isHQ: false,
                       footprint: [plot], scored: true, quarterBuilt: 1 });
  st.board.owner[plot] = me.id;
  st.board.occupiedBy[plot] = 900 + i;
});
const match = E.bestMegacorpMatch(E.activeBiz(me), st.megacorpPool);
check("three level-1 companies match a tile", !!match, match && match.tile[0]);
E.claimMegacorp(st, me, () => {}, match.have[0]);

const hqs = E.megacorpHQs(me);
check("the merge leaves exactly one headquarters", hqs.length === 1);
const hq = hqs[0];
check("which holds a company slot", E.companySlotsUsed(me) === E.activeBiz(me).length + 1,
  `${E.companySlotsUsed(me)} used, ${E.activeBiz(me).length} trading`);
check("and still stands on its ground", E.businessCanProduce(st, hq));
const ep = E.brandEPFor(E.price(st.pm, E.bizInd(hq)), E.tierOfHQ(hq));
check("its dividend is the price divided by the tier",
  ep === Math.floor(E.price(st.pm, E.bizInd(hq)) / E.tierOfHQ(hq)),
  `$${E.price(st.pm, E.bizInd(hq))} / tier ${E.tierOfHQ(hq)} = ${ep} EP`);

/* sell the ground out from under it */
delete st.board.owner[hq.footprint[0]];
check("selling the land under it stops it banking", !E.businessCanProduce(st, hq));

console.log(fails ? `\n${fails} check(s) failed\n` : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
