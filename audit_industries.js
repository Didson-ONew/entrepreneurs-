/* ============================================================================
   What each industry is actually worth - not how often it is built.

   THE OLD READ was two counts: companies built per industry, and the share of
   games the winner held one. Both are shallow. Cheap industries get built more;
   companies held at the end may have been built in the last quarter to bank
   level EP off whatever cards were in hand. And the horizontal industries are
   MEANT to be built less - spreading over plots is the harder thing to arrange -
   which is what lets their price climb, which is what tempts the late gamble.

   So this reads the LEDGER of every company from the moment it is built:

     REVENUE     cash from deliveries, and the $1 a unit for what nobody bought
     COSTS       setup at launch, setup again at each upgrade, the supplier bill
                 and the ground rent every quarter it stood
     EP          level EP banked on completion and upgrade, the industry debut
     WHAT HAPPENED TO IT   sold in solvency, sold otherwise (Raise Capital, or
                 to cover a bill), merged into a Megacorp, chosen as its HQ,
                 or still standing at the end

   and RECYCLING - production that found no buyer - by industry, and by quarter
   across the whole table, which is the shape of demand against supply as the
   game goes on.

   Run: node audit_industries.js [games a table size] [seats...]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "200", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every hook is a splice on an exact line, and a line that has moved stops the probe
   rather than letting it measure half a ledger. */
const HOOKS = [
  ["a sale",     "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;",
                 "  const leftover = Math.max(0, remaining);\n  __probe.sale(state, p, biz, earned, leftover, bizProd(biz));\n  p.cash += earned + leftover * 1;"],
  ["a launch",   "  const biz = newBusiness(bp, footprint, state.quarter, state);",
                 "  const biz = newBusiness(bp, footprint, state.quarter, state);\n  __probe.launch(state, p, biz, bp.setup);"],
  ["an upgrade", "  b.upgraded = true; b.level += 1;\n  b.scored = false;",
                 "  __probe.upgrade(state, p, b, bizSetup(b));\n  b.upgraded = true; b.level += 1;\n  b.scored = false;"],
  ["the bills",  "      const cost = supplierBill + rentBill;",
                 "      const cost = supplierBill + rentBill;\n      __probe.bill(state, p, b, supplierBill, rentBill);"],
  ["a company sold", "function sellCompany(p, b, solvency = false) {\n  let recv;",
                 "function sellCompany(p, b, solvency = false) {\n  __probe.sold(b, solvency);\n  let recv;"],
  ["a merger",   "  const hq = hqChoice && match.have.includes(hqChoice) ? hqChoice : pickHQ(state, p, match.have, tierOfTile(match.tile));",
                 "  const hq = hqChoice && match.have.includes(hqChoice) ? hqChoice : pickHQ(state, p, match.have, tierOfTile(match.tile));\n  __probe.merge(state, p, match.have, hq);"],
];
for (const [what, find, put] of HOOKS) {
  if (!logic.includes(find)) { console.error(`the engine changed shape around ${what} - update this probe`); process.exit(2); }
  logic = logic.replace(find, put);
}

/* One ledger per company, keyed by industry code + business id within a game. */
let L = null;   // the current game's ledgers
const key = (b) => b.__k || (b.__k = `${b.bp.ind}#${b.id}#${b.quarterBuilt}`);
const ledger = (b) => L.get(key(b)) || (L.set(key(b), { ind: b.bp.ind, lvl0: b.bp.lvl, built: b.quarterBuilt,
  revenue: 0, recycled: 0, prod: 0, setup: 0, suppliers: 0, rent: 0, quarters: 0, upgraded: false,
  soldSolvency: false, soldOther: false, merged: false, hq: false }), L.get(key(b)));
const probe = {
  sale: (state, p, biz, earned, leftover, prod) => { const l = ledger(biz); l.revenue += earned + leftover; l.recycled += leftover; l.prod += prod;
    RQ[state.quarter] = RQ[state.quarter] || { prod: 0, left: 0 }; RQ[state.quarter].prod += prod; RQ[state.quarter].left += leftover; },
  launch: (state, p, biz, setup) => { ledger(biz).setup += setup; },
  upgrade: (state, p, b, setup) => { const l = ledger(b); l.setup += setup; l.upgraded = true; },
  bill: (state, p, b, sup, rent) => { const l = ledger(b); l.suppliers += sup; l.rent += rent; l.quarters++; },
  sold: (b, solvency) => { const l = ledger(b); if (solvency) l.soldSolvency = true; else l.soldOther = true; },
  merge: (state, p, have, hq) => { for (const b of have) { const l = ledger(b); l.merged = true; if (b === hq) l.hq = true; } },
};
let RQ = {};   // recycling by quarter, this game

const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, String, box, __probe: probe };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.E = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, INDUSTRIES, IND_NAME, SCALING, BP_DATA, levelEP, INDUSTRY_DEBUT_EP };
`, sandbox);
const E = box.E;
const bpInd = {}; E.BP_DATA.forEach((bp) => { bpInd[bp.name] = bp.ind; });

function run(seats) {
  const T = {}; E.INDUSTRIES.forEach((i) => { T[i] = { n: 0, built: 0, lvl2plus: 0, upgraded: 0, revenue: 0, recycled: 0, prod: 0,
    setup: 0, suppliers: 0, rent: 0, quarters: 0, ep: 0, soldSolvency: 0, soldOther: 0, merged: 0, hq: 0, standing: 0 }; });
  const RQall = {}; let games = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    L = new Map(); RQ = {};
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    if (st.phase !== "gameover") continue;
    games++;
    /* EP by industry from the game's own labels: "Company: <name> L<n>" and "Entered <IND>". */
    const epBy = {}; E.INDUSTRIES.forEach((i) => { epBy[i] = 0; });
    for (const p of st.players) for (const e of (p.epLog || [])) {
      const s = String(e.label);
      let m = /^Company: (.+) L\d+$/.exec(s); if (m && bpInd[m[1]]) { epBy[bpInd[m[1]]] += e.amount; continue; }
      m = /^Entered (\w\w)/.exec(s); if (m && epBy[m[1]] !== undefined) epBy[m[1]] += e.amount;
    }
    const alive = new Set(); for (const p of st.players) for (const b of p.businesses) if (!b.distressed) alive.add(key(b));
    for (const [k, l] of L) {
      const t = T[l.ind]; t.n++; t.built += l.built; if (l.lvl0 >= 2) t.lvl2plus++; if (l.upgraded) t.upgraded++;
      t.revenue += l.revenue; t.recycled += l.recycled; t.prod += l.prod; t.setup += l.setup; t.suppliers += l.suppliers; t.rent += l.rent; t.quarters += l.quarters;
      if (l.soldSolvency) t.soldSolvency++; else if (l.soldOther) t.soldOther++;
      if (l.merged) t.merged++; if (l.hq) t.hq++; if (alive.has(k) && !l.merged) t.standing++;
    }
    for (const i of E.INDUSTRIES) T[i].ep += epBy[i];
    for (const q of Object.keys(RQ)) { RQall[q] = RQall[q] || { prod: 0, left: 0 }; RQall[q].prod += RQ[q].prod; RQall[q].left += RQ[q].left; }
  }
  return { T, RQall, games };
}

const pad = (s, w) => String(s).padEnd(w), rp = (s, w) => String(s).padStart(w);
const pc = (a, b) => (b > 0 ? (100 * a / b).toFixed(0) + "%" : "-");
for (const seats of SIZES) {
  const { T, RQall, games } = run(seats);
  console.log(`\n${"=".repeat(96)}\n${seats} PLAYERS  -  ${games} games\n${"=".repeat(96)}`);
  const cols = E.INDUSTRIES.map((i) => rp(`${i} ${E.SCALING[i]}`, 12)).join("");
  const row = (label, fn) => console.log("  " + pad(label, 34) + E.INDUSTRIES.map((i) => rp(fn(T[i]), 12)).join(""));
  console.log("  " + pad("", 34) + cols);
  row("companies built a game", (t) => (t.n / games).toFixed(2));
  row("  built as a level 2-3 card", (t) => pc(t.lvl2plus, t.n));
  row("  later upgraded", (t) => pc(t.upgraded, t.n));
  row("  mean quarter built", (t) => (t.built / Math.max(1, t.n)).toFixed(1));
  row("  quarters stood, on average", (t) => (t.quarters / Math.max(1, t.n)).toFixed(1));
  console.log("  " + pad("PER COMPANY, over its life", 34));
  row("  revenue (deliveries + recycling)", (t) => "$" + (t.revenue / Math.max(1, t.n)).toFixed(0));
  row("  setup paid (launch + upgrades)", (t) => "$" + (t.setup / Math.max(1, t.n)).toFixed(0));
  row("  supplier bills", (t) => "$" + (t.suppliers / Math.max(1, t.n)).toFixed(0));
  row("  ground rent", (t) => "$" + (t.rent / Math.max(1, t.n)).toFixed(0));
  row("  NET CASH", (t) => "$" + ((t.revenue - t.setup - t.suppliers - t.rent) / Math.max(1, t.n)).toFixed(0));
  row("  net cash per $ of setup", (t) => ((t.revenue - t.setup - t.suppliers - t.rent) / Math.max(1, t.setup)).toFixed(2));
  row("  EP (levels + debut)", (t) => (t.ep / Math.max(1, t.n)).toFixed(1));
  row("  EP per $ of setup", (t) => (t.ep / Math.max(1, t.setup) * 10).toFixed(2) + "/10$");
  row("  net cash per quarter stood", (t) => "$" + ((t.revenue - t.suppliers - t.rent) / Math.max(1, t.quarters)).toFixed(1));
  console.log("  " + pad("WHAT BECAME OF IT", 34));
  row("  sold in solvency", (t) => pc(t.soldSolvency, t.n));
  row("  sold otherwise", (t) => pc(t.soldOther, t.n));
  row("  merged into a Megacorp", (t) => pc(t.merged, t.n));
  row("    ...and kept as its HQ", (t) => pc(t.hq, Math.max(1, t.merged)));
  row("  still standing at the end", (t) => pc(t.standing, t.n));
  console.log("  " + pad("RECYCLED AT $1", 34));
  row("  share of its production", (t) => pc(t.recycled, t.prod));
  const qs = Object.keys(RQall).map(Number).sort((a, b) => a - b);
  console.log("  " + pad("by quarter, whole table", 34) + qs.map((q) => rp("Q" + q, 6)).join(""));
  console.log("  " + pad("  recycled share", 34) + qs.map((q) => rp(pc(RQall[q].left, RQall[q].prod), 6)).join(""));
  console.log("  " + pad("  units made a game", 34) + qs.map((q) => rp((RQall[q].prod / games).toFixed(0), 6)).join(""));
}
console.log("");
