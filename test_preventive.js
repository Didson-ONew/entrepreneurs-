/* The Preventive Doctor persona: a Healthcare company of any level may serve any
   column of a Healthcare row, instead of only columns up to its own level.

   This checks the ability end to end for a HUMAN player, which is where it was
   broken: the engine honoured it, but the demand grid the human clicks gated on
   `levelIdx < biz.level` and never offered the extra columns, so the persona did
   nothing at all for the person who had it. Bots were unaffected because they
   deliver through eligibleSlotsFor().

   Run: node test_preventive.js
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
    box.exports = { initGame, mulberry32, eligibleSlotsFor, deliverToSlot, humanDeliver,
      deliveryColumnCap, bizInd, activeBiz, byId, PERSONAS, INDUSTRIES, price, reachableDistricts };
  `, sandbox);
  return box.exports;
}
const E = loadEngine();

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}`);
  if (!cond) failures++;
};

/* Build a game, then plant a level-1 Healthcare company for the human on a plot in
   a district whose demand grid has a Healthcare row. */
function scenario(persona) {
  const st = E.initGame(1, 4242, ["You"], undefined, false);
  const me = E.byId(st, 0);
  me.persona = persona;

  // find a district carrying an HC row, and a free plot inside it
  let plot = null, tileKey = null;
  for (const [k, t] of Object.entries(st.demand.tiles)) {
    if (!t.rows.includes("HC")) continue;
    const inTile = Object.keys(st.board.cellOf).filter((pk) => {
      const c = st.board.cellOf[pk];
      return `${c.r},${c.c}` === k && !(pk in st.board.occupiedBy);
    });
    if (inTile.length) { plot = inTile[0]; tileKey = k; break; }
  }
  if (!plot) throw new Error("no district with a Healthcare row - seed changed?");

  const hcBp = { code: "HC-TEST", ind: "HC", name: "Test Clinic I", lvl: 1,
    setup: 20, opex: 5, deps: [{ ind: "RE", val: 5 }], prod: 8 };
  st.board.owner[plot] = me.id;
  me.cash = 500;
  me.hand = [hcBp];
  return { st, me, plot, tileKey, hcBp };
}

// initGame is enough; launch by hand so the test does not depend on turn order
function plant(st, me, plot, hcBp) {
  const biz = { id: 9001, bp: hcBp, footprint: [plot], level: 1, upgraded: false,
    distressed: false, scored: false, epOnCard: 0, quarterBuilt: 1 };
  st.board.occupiedBy[plot] = biz.id;
  me.businesses.push(biz);
  st.quarter = 5;            // rows 3-4 open, so every column is live
  return biz;
}

console.log("\nWithout the persona - a level-1 clinic may only serve column 1");
{
  const { st, me, plot, tileKey, hcBp } = scenario(null);
  const biz = plant(st, me, plot, hcBp);
  const cols = new Set(E.eligibleSlotsFor(st, biz).filter((s) => !s.cross).map((s) => s.levelIdx));
  check(`engine offers only column 1 (got ${[...cols].map((c) => c + 1).join(",") || "none"})`,
    cols.size > 0 && [...cols].every((c) => c === 0));
  check("engine refuses a column-2 delivery",
    E.deliverToSlot(st, biz, tileKey, st.demand.tiles[tileKey].rows.indexOf("HC"), 1, false) === 0);
  check("the grid offers 1 of 4 columns", E.deliveryColumnCap(st, biz, me) === 1);
}

console.log("\nWith the persona - the same clinic may serve every column");
{
  const { st, me, plot, tileKey, hcBp } = scenario("preventive");
  const biz = plant(st, me, plot, hcBp);
  // snapshot before anything is delivered, so the probes below start from an empty row
  const pristine = JSON.parse(JSON.stringify(st.demand));
  const cols = new Set(E.eligibleSlotsFor(st, biz).filter((s) => !s.cross).map((s) => s.levelIdx));
  check(`engine offers columns beyond 1 (got ${[...cols].map((c) => c + 1).join(",") || "none"})`,
    [...cols].some((c) => c > 0));
  const hcRow = st.demand.tiles[tileKey].rows.indexOf("HC");
  check("engine accepts a column-2 delivery",
    E.deliverToSlot(st, biz, tileKey, hcRow, 1, false) > 0);

  /* The regression this guards. The human's demand grid decides what is clickable
     from deliveryColumnCap, the same function the engine checks against, so the
     columns it offers and the columns it accepts cannot drift apart again. The old
     grid used a bare `levelIdx < biz.level`, which offered exactly 1 of 4. */
  const cap = E.deliveryColumnCap(st, biz, me);
  check(`the grid offers all 4 columns (got ${cap})`, cap === 4);

  const engineAccepts = [0, 1, 2, 3].filter((levelIdx) => {
    const probe = { ...st, demand: JSON.parse(JSON.stringify(pristine)) };
    return E.deliverToSlot(probe, biz, tileKey, hcRow, levelIdx, false) > 0;
  }).length;
  const gridOffers = [0, 1, 2, 3].filter((levelIdx) => levelIdx < cap).length;
  check(`grid offers ${gridOffers} columns and the engine accepts ${engineAccepts} - they agree`,
    gridOffers === engineAccepts);
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
