/* ============================================================================
   AUDIT - the whole proposal at once, and what it does to the size of the
   economy.

   The ruleset under test, against the game as it ships:

     bases   every industry up $2 - UT/RE $4, HO/MA $5, HC/TE $6
     floor   the track starts at $2, so $1 stops being a market price and
             becomes purely the recycling rate
     step    one build moves its own good a FULL dollar down and each of its
             suppliers a full dollar up, instead of half

   Two versions of it, because the first raised the bases into a ceiling that
   was still $10 and turned a floor problem into a ceiling one:

     ceil10  $2..$10, cash still scores at $20 per EP
     ceil12  $2..$12, cash scores at $50 per EP - the ceiling moved up to give
             the raised bases somewhere to go, and the cash rate moved with the
             takings so the scores do not inflate

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
  base: "const BASE_PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };",
  rate: "const CASH_PER_EP = 20;",
};
if (!SRC.includes(P.rate)) { console.error("CASH_PER_EP has changed - update this probe"); process.exit(2); }

/* The three worlds. `ceiling` and `rate` are what separate the two proposals. */
const WORLDS = {
  today:  { label: "today",  patch: (l) => l },
  ceil10: { label: "ceil10", ceiling: 10, rate: 20 },
  ceil12: { label: "ceil12", ceiling: 12, rate: 50 },
};
const NAMES = Object.keys(WORLDS);
const SALE_HOOK = "  const leftover = Math.max(0, remaining);\n"
  + "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n"
  + "  p.cash += earned + leftover * 1;";

/* Recycling stays $1 in both worlds. Under the proposal it sits a full dollar
   BELOW the worst price the market can offer, which is the point of the floor:
   today a flooded good and a binned good are worth the same. */
function engine(which) {
  let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  const w = WORLDS[which];
  if (which !== "today") {
    logic = logic
      .replace(N.step, P.step)
      .replace(N.floor, `const PRICE_MIN = 2, PRICE_MAX = ${w.ceiling};`)
      .replace(N.base, P.base)
      .replace(P.rate, `const CASH_PER_EP = ${w.rate};`);
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
const ENG = {};
for (const n of NAMES) ENG[n] = engine(n);
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
for (const w of NAMES) for (const z of SIZES) R[`${w}|${z}`] = run(z, w);

const Et = ENG.today.E;
const W = (n) => ENG[n].E;
console.log("Entrepreneurs - raising the bases, the ceiling and the cash rate");
console.log(`${SEEDS} games at each of ${SIZES.length} table sizes, ${NAMES.length} ways `
  + `(${SEEDS * SIZES.length * NAMES.length} games)\n`);
for (const n of NAMES) {
  const E = W(n);
  console.log(`  ${n.padEnd(9)} $${E.PRICE_MIN}..$${E.PRICE_MAX}   bases `
    + INDS.map((i) => `${i} $${E.BASE_PRICE[i]}`).join(" ")
    + `   $${E.CASH_PER_EP}/EP   ${n === "today" ? "half" : "full"}-dollar step`);
}
console.log("  recycling stays $1 in all three\n");

const col = (v) => String(v).padStart(9);
const hdr = "             " + NAMES.map((n) => col(n)).join("");

/* ------------------------------------------------------- the market */
console.log("=".repeat(78));
console.log("DOES THE MARKET STILL WORK?  (4 players)");
console.log("=".repeat(78));

console.log("\n  Room below / above the base, in dollars");
console.log(hdr);
for (const i of INDS) {
  console.log(`  ${Et.IND_NAME[i].padEnd(11)}`
    + NAMES.map((n) => {
      const E = W(n);
      return col(`${E.BASE_PRICE[i] - E.PRICE_MIN}/${E.PRICE_MAX - E.BASE_PRICE[i]}`);
    }).join(""));
}

const pctRow = (field) => {
  console.log(hdr);
  for (const i of INDS) {
    console.log(`  ${Et.IND_NAME[i].padEnd(11)}`
      + NAMES.map((n) => {
        const t = R[`${n}|4`];
        return col(`${(100 * t[field][i] / t.gamesInd).toFixed(0)}%`);
      }).join(""));
  }
};
console.log("\n  Ever trades BELOW its own base - the market working in the player's favour");
pctRow("below");
console.log("\n  Ever reaches the FLOOR");
pctRow("floorEver");
console.log("\n  Ever reaches the CEILING");
pctRow("ceilEver");

console.log("\n  Share of all quarters spent pinned against an end of the track");
console.log(hdr);
console.log("  on the floor"
  + NAMES.map((n) => { const t = R[`${n}|4`]; return col(`${(100 * t.pinned / t.cells).toFixed(0)}%`); }).join(""));
console.log("  on the ceiling"
  + NAMES.map((n) => { const t = R[`${n}|4`]; return col(`${(100 * t.atCeil / t.cells).toFixed(0)}%`); }).join("").slice(2));

console.log("\n  Mean price by year, 4 players");
console.log("             Y1     Y2     Y3");
for (const n of NAMES) {
  const t = R[`${n}|4`];
  console.log(`  ${n.padEnd(10)}` + [1, 2, 3].map((y) =>
    `$${(t.priceByYear[y] / t.priceN[y]).toFixed(2)}`.padStart(7)).join(""));
}

/* -------------------------------------------------- size of economy */
console.log("\n" + "=".repeat(78));
console.log("THE SIZE OF THE ECONOMY, by table size");
console.log("=".repeat(78));
const line = (label, f, fmt = (v) => `$${v.toFixed(0)}`) => {
  console.log(`  ${label.padEnd(28)}`
    + SIZES.map((z) => NAMES.map((n) => fmt(f(R[`${n}|${z}`]))).join("/").padStart(19)).join(""));
};
console.log(`  ${"".padEnd(28)}` + SIZES.map((z) => `${z} players`.padStart(19)).join(""));
console.log(`  ${"(today / ceil10 / ceil12)".padEnd(28)}`);
line("cash per seat, mean", (t) => t.cashSeat / (t.samples * (t.endSeats / Math.max(1, t.games))));
line("cash on the table, mean", (t) => t.cashTable / t.samples);
line("cash on the table, peak", (t) => t.peakTable);
line("most one seat ever held", (t) => t.peakSeat);
line("largest single pot", (t) => t.potMax);
line("takings per game", (t) => t.earned / t.games);
console.log("");
line("winning score", (t) => t.winnerEP / t.games, (v) => v.toFixed(0));
line("spread, first to last", (t) => t.epSpread / t.games, (v) => v.toFixed(0));
line("output recycled", (t) => 100 * t.recycled / Math.max(1, t.prod), (v) => `${v.toFixed(0)}%`);

/* ------------------------------------------------------ the verdict */
console.log("\n" + "=".repeat(78));
console.log("DID THE CASH RATE LAND?");
console.log("=".repeat(78));
console.log("  Cash converts to points at a fixed rate, so if takings rise and the rate does");
console.log("  not, every score inflates and cash quietly outweighs building. $50/EP was");
console.log("  chosen against a measured 92% growth in takings; this is whether it held.");
console.log("");
console.log("            takings/game        winning score       score vs today");
console.log("          today  c10   c12    today  c10   c12    c10      c12");
for (const z of SIZES) {
  const g = (n) => R[`${n}|${z}`];
  const tk = (n) => g(n).earned / g(n).games;
  const sc = (n) => g(n).winnerEP / g(n).games;
  console.log(`  ${z}p  ` + NAMES.map((n) => `$${tk(n).toFixed(0)}`.padStart(7)).join("")
    + "   " + NAMES.map((n) => sc(n).toFixed(0).padStart(6)).join("")
    + `   ${((sc("ceil10") / sc("today") - 1) * 100).toFixed(0)}%`.padStart(8)
    + `   ${((sc("ceil12") / sc("today") - 1) * 100).toFixed(0)}%`.padStart(8));
}
{
  const tot = (n, f) => SIZES.reduce((s, z) => s + f(R[`${n}|${z}`]), 0) / SIZES.length;
  const scT = tot("today", (t) => t.winnerEP / t.games);
  const sc10 = tot("ceil10", (t) => t.winnerEP / t.games);
  const sc12 = tot("ceil12", (t) => t.winnerEP / t.games);
  const tkT = tot("today", (t) => t.earned / t.games);
  const tk12 = tot("ceil12", (t) => t.earned / t.games);
  console.log(`\n  Pooled: takings ${((tk12 / tkT - 1) * 100).toFixed(0)}% higher, `
    + `winning score ${((sc12 / scT - 1) * 100).toFixed(0)}% `
    + `with $${W("ceil12").CASH_PER_EP}/EP`);
  console.log(`  (leaving the rate at $${Et.CASH_PER_EP} instead gives ${((sc10 / scT - 1) * 100).toFixed(0)}%)`);
  const ideal = Et.CASH_PER_EP * (tk12 / tkT);
  console.log(`  A rate that exactly tracked takings would be $${ideal.toFixed(0)}/EP.`);
}
