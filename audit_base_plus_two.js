/* ============================================================================
   AUDIT - the whole proposal at once, and what it does to the size of the
   economy.

   The ruleset under test, against the game as it ships:

     bases   every industry up $2 - UT/RE $4, HO/MA $5, HC/TE $6
     floor   the track runs $2..$10, so $1 stops being a market price and
             becomes purely the recycling rate
     step    one build moves its own good a FULL dollar down and each of its
             suppliers a full dollar up, instead of half

   The first half of this measures whether the market behaves: how much room a
   price has above and below where it starts, how often it is pinned, how often
   it reaches either end.

   The second half is the part that decides whether the change is affordable.
   Raising every price raises every sale, and the money multiplies through a
   closed loop - rent, OPEX and pot shares are all paid out of the same takings.
   So this measures the SIZE OF THE ECONOMY the new prices produce: cash per
   seat, cash on the table, the largest pot a physical edition has to be able to
   pay out, total takings, and what it does to the final scores.

   THE SCORE IS THE THING TO WATCH. Cash converts to points at CASH_PER_EP, a
   fixed $20 per point. If takings rise 60% and that rate does not move, every
   score inflates and the cash half of the game quietly outweighs the building
   half - which is exactly what happened the last time the economy was rescaled
   and the rate was left alone.

   Run: node audit_base_plus_two.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);
const SIZES = [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

const N = {
  step: "const SUPPLIER_CELLS = 1, BUILT_CELLS = -1;",
  floor: "const PRICE_MIN = 1, PRICE_MAX = 10;",
  base: "const BASE_PRICE = { UT: 2, RE: 2, HO: 3, MA: 3, HC: 4, TE: 4 };",
  /* the delivery hook, so sold units can be told from recycled ones */
  sale: "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;",
};
for (const [k, v] of Object.entries(N)) {
  if (!SRC.includes(v)) { console.error(`the ${k} path has changed shape - update this probe`); process.exit(2); }
}
const P = {
  step: "const SUPPLIER_CELLS = 2, BUILT_CELLS = -2;",
  floor: "const PRICE_MIN = 2, PRICE_MAX = 10;",
  base: "const BASE_PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };",
};
const SALE_HOOK = "  const leftover = Math.max(0, remaining);\n"
  + "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n"
  + "  p.cash += earned + leftover * 1;";

/* Recycling stays $1 in both worlds. Under the proposal it sits a full dollar
   BELOW the worst price the market can offer, which is the point of the floor:
   today a flooded good and a binned good are worth the same. */
function engine(which) {
  let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  if (which === "proposed") {
    logic = logic.replace(N.step, P.step).replace(N.floor, P.floor).replace(N.base, P.base);
  }
  logic = logic.replace(N.sale, SALE_HOOK);
  const econ = { earned: 0, recycled: 0, prod: 0 };
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number,
    __econ: { sale: (earned, leftover, prod) => {
      econ.earned += earned; econ.recycled += leftover; econ.prod += prod;
    } } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, PRICE_MIN, PRICE_MAX, CASH_PER_EP,
              DISCS_PER_PLAYER };
    box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
               price, epTotal, finalRank, activeBiz, discsFree };
  `, sandbox);
  return { ...box, econ };
}
const ENG = { today: engine("today"), proposed: engine("proposed") };
const INDS = ENG.today.E.INDUSTRIES;

function run(seats, which) {
  const { E, E2, econ } = ENG[which];
  const T = {
    games: 0, samples: 0,
    cashSeat: 0, cashTable: 0, peakSeat: 0, peakTable: 0,
    potMax: 0, potTotal: 0, potN: 0,
    earned: 0, recycled: 0, prod: 0,
    priceByYear: { 1: 0, 2: 0, 3: 0 }, priceN: { 1: 0, 2: 0, 3: 0 },
    endCashTotal: 0, winnerEP: 0, epSpread: 0, endSeats: 0,
    pinned: 0, atCeil: 0, cells: 0,
    below: {}, floorEver: {}, ceilEver: {}, fin: {}, gamesInd: 0,
  };
  INDS.forEach((i) => { T.below[i] = 0; T.floorEver[i] = 0; T.ceilEver[i] = 0; T.fin[i] = 0; });

  for (let seed = 1; seed <= SEEDS; seed++) {
    econ.earned = econ.recycled = econ.prod = 0;
    let st;
    try {
      st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      if (st.players.length !== seats) continue;
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
    } catch { continue; }

    const ser = {};
    INDS.forEach((i) => (ser[i] = []));
    const sample = () => {
      T.samples++;
      let table = 0;
      for (const p of st.players) {
        T.cashSeat += p.cash; table += p.cash;
        if (p.cash > T.peakSeat) T.peakSeat = p.cash;
      }
      T.cashTable += table;
      if (table > T.peakTable) T.peakTable = table;
      const yr = Math.min(3, Math.max(1, Math.ceil(st.quarter / 4)));
      for (const ind of INDS) {
        const v = E2.price(st.pm, ind);
        ser[ind].push(v);
        T.priceByYear[yr] += v; T.priceN[yr]++;
        T.cells++;
        if (v === E.PRICE_MIN) T.pinned++;
        if (v === E.PRICE_MAX) T.atCeil++;
      }
      if (st.pots) for (const ind of INDS) {
        const v = st.pots[ind] || 0;
        T.potTotal += v; T.potN++;
        if (v > T.potMax) T.potMax = v;
      }
    };
    try {
      E2.advancePlanning(st, E2.mulberry32(seed + 777), (m) => {
        if (/^▶ Year \d+, Quarter \d+/.test(String(m))) sample();
      });
    } catch { continue; }
    sample();
    T.games++;
    T.earned += econ.earned; T.recycled += econ.recycled; T.prod += econ.prod;
    for (const p of st.players) T.endCashTotal += p.cash;
    T.endSeats += st.players.length;
    /* epTotal takes the player alone and returns the banked EP. The cash a
       player is still holding scores on top of it at CASH_PER_EP, which is the
       whole reason the rate matters here - so the score measured is both. */
    const eps = st.players
      .map((p) => E2.epTotal(p) + Math.floor(p.cash / E.CASH_PER_EP))
      .sort((a, b) => b - a);
    T.winnerEP += eps[0];
    T.epSpread += eps[0] - eps[eps.length - 1];
    T.gamesInd++;
    for (const i of INDS) {
      const v = ser[i];
      T.fin[i] += v[v.length - 1];
      if (v.some((x) => x < E.BASE_PRICE[i])) T.below[i]++;
      if (v.some((x) => x === E.PRICE_MIN)) T.floorEver[i]++;
      if (v.some((x) => x === E.PRICE_MAX)) T.ceilEver[i]++;
    }
  }
  return T;
}

const R = {};
for (const w of ["today", "proposed"]) for (const z of SIZES) R[`${w}|${z}`] = run(z, w);

const Et = ENG.today.E, Ep = ENG.proposed.E;
console.log("Entrepreneurs - bases +$2, a $2 floor, and a full dollar per build");
console.log(`${SEEDS} games at each of ${SIZES.length} table sizes, both ways `
  + `(${SEEDS * SIZES.length * 2} games)\n`);
console.log("  today      $1..$10   bases " + INDS.map((i) => `${i} $${Et.BASE_PRICE[i]}`).join(" ")
  + "   half-dollar step");
console.log("  proposed   $2..$10   bases " + INDS.map((i) => `${i} $${Ep.BASE_PRICE[i]}`).join(" ")
  + "   full-dollar step");
console.log("  recycling stays $1 in both\n");

/* ------------------------------------------------------- the market */
console.log("=".repeat(78));
console.log("DOES THE MARKET STILL WORK?  (4 players)");
console.log("=".repeat(78));
console.log("             room below/above base      ever below   ever at $1   ever at $10");
console.log("              today      proposed      today prop   today prop   today prop");
for (const i of INDS) {
  const a = R["today|4"], b = R["proposed|4"];
  const rt = `${Et.BASE_PRICE[i] - Et.PRICE_MIN}/${Et.PRICE_MAX - Et.BASE_PRICE[i]}`;
  const rp = `${Ep.BASE_PRICE[i] - Ep.PRICE_MIN}/${Ep.PRICE_MAX - Ep.BASE_PRICE[i]}`;
  const pc = (t, f) => `${(100 * t[f][i] / t.gamesInd).toFixed(0)}%`;
  console.log(`${Et.IND_NAME[i].padEnd(13)}${rt.padStart(6)}${rp.padStart(14)}`
    + `${pc(a, "below").padStart(11)}${pc(b, "below").padStart(6)}`
    + `${pc(a, "floorEver").padStart(9)}${pc(b, "floorEver").padStart(6)}`
    + `${pc(a, "ceilEver").padStart(9)}${pc(b, "ceilEver").padStart(6)}`);
}
console.log("\n  \"room below/above\" is dollars between the base and each end of the track.");
{
  const a = R["today|4"], b = R["proposed|4"];
  console.log(`  quarters spent pinned on the floor:  today ${(100 * a.pinned / a.cells).toFixed(0)}%`
    + `   proposed ${(100 * b.pinned / b.cells).toFixed(0)}%`);
  console.log(`  quarters spent pinned on the ceiling: today ${(100 * a.atCeil / a.cells).toFixed(0)}%`
    + `   proposed ${(100 * b.atCeil / b.cells).toFixed(0)}%`);
}

console.log("\n  mean price by year, 4 players");
console.log("             Y1     Y2     Y3");
for (const w of ["today", "proposed"]) {
  const t = R[`${w}|4`];
  console.log(`  ${w.padEnd(10)}` + [1, 2, 3].map((y) =>
    `$${(t.priceByYear[y] / t.priceN[y]).toFixed(2)}`.padStart(7)).join(""));
}

/* -------------------------------------------------- size of economy */
console.log("\n" + "=".repeat(78));
console.log("THE SIZE OF THE ECONOMY");
console.log("=".repeat(78));
const line = (label, f, fmt = (v) => `$${v.toFixed(0)}`) => {
  console.log(`  ${label.padEnd(30)}`
    + SIZES.map((z) => {
      const a = f(R[`today|${z}`]), b = f(R[`proposed|${z}`]);
      return `${fmt(a)}→${fmt(b)}`.padStart(15);
    }).join(""));
};
console.log("  " + " ".repeat(30) + SIZES.map((z) => `${z} players`.padStart(15)).join(""));
line("cash per seat, mean", (t) => t.cashSeat / (t.samples * (t.endSeats / Math.max(1, t.games))));
line("cash on the table, mean", (t) => t.cashTable / t.samples);
line("cash on the table, peak", (t) => t.peakTable);
line("most one seat ever held", (t) => t.peakSeat);
line("largest single pot", (t) => t.potMax);
line("takings per game (all sales)", (t) => t.earned / t.games);
line("cash held at the final bell", (t) => t.endCashTotal / t.games);

console.log("");
line("winning EP", (t) => t.winnerEP / t.games, (v) => v.toFixed(0));
line("EP spread, first to last", (t) => t.epSpread / t.games, (v) => v.toFixed(0));
line("units recycled per game", (t) => t.recycled / t.games, (v) => v.toFixed(0));
line("share of output recycled", (t) => 100 * t.recycled / Math.max(1, t.prod), (v) => `${v.toFixed(0)}%`);

/* ------------------------------------------------ what it costs to fix */
console.log("\n" + "=".repeat(78));
console.log("WHAT THE CASH RATE WOULD HAVE TO BECOME");
console.log("=".repeat(78));
console.log(`  Cash scores at $${Et.CASH_PER_EP} per EP. If takings rise and that rate does not,`);
console.log("  every score inflates and the cash half of the game outweighs the building half.");
console.log("");
console.log("            takings    growth    $/EP to hold    rounded");
console.log("            per game             scores level");
for (const z of SIZES) {
  const a = R[`today|${z}`], b = R[`proposed|${z}`];
  const ea = a.earned / a.games, eb = b.earned / b.games;
  const g = eb / ea;
  const want = Et.CASH_PER_EP * g;
  console.log(`  ${z} players ${`$${ea.toFixed(0)}→$${eb.toFixed(0)}`.padStart(12)}`
    + `${`${((g - 1) * 100).toFixed(0)}%`.padStart(10)}`
    + `${`$${want.toFixed(1)}`.padStart(16)}`
    + `${`$${(Math.round(want / 5) * 5).toFixed(0)}`.padStart(11)}`);
}
{
  let ga = 0, gb = 0;
  for (const z of SIZES) { ga += R[`today|${z}`].earned / R[`today|${z}`].games;
                           gb += R[`proposed|${z}`].earned / R[`proposed|${z}`].games; }
  const g = gb / ga;
  console.log(`\n  Pooled over every table size, takings grow ${((g - 1) * 100).toFixed(0)}%, `
    + `so the rate wants to go`);
  console.log(`  from $${Et.CASH_PER_EP} to about $${(Et.CASH_PER_EP * g).toFixed(0)} per EP `
    + `to leave the balance between cash and building where it is.`);
}
