/* ============================================================================
   AUDIT - what if a build moved a price a FULL DOLLAR instead of half?

   Today the track runs $1 to $10 with a blank cell between every number, and a
   launch slides its own good one cell down and each supplier one cell up. Two
   builds are needed to move a price a dollar. The proposal is to make every
   event worth a whole dollar - which is the same as deleting the blank cells.

   This is the single most consequential knob in the economy, so it is measured
   rather than reasoned about. The half-dollar step was introduced precisely to
   stop one build from swinging a price; the question is what was bought with
   that, and what it cost.

   Reported per industry, at every table size:
     - where prices finish, against where they start
     - how often a good ever trades below its own base
     - how often it hits $1, and how often it hits $10 (which nothing does today)
     - dollars of price movement per game - the thing a player actually feels

   Run: node audit_full_dollar_step.js [gamesPerSize]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this script"); process.exit(2); }

const NEEDLE = "const SUPPLIER_CELLS = 1, BUILT_CELLS = -1;";
if (!SRC.includes(NEEDLE)) {
  console.error("the price step constants have changed - update this script");
  process.exit(2);
}
/* Two cells is one dollar on this track, so this is exactly "a full dollar per
   event" without touching anything else - the same clamps, the same rounding,
   the same $1..$10 range. */
const FULL = "const SUPPLIER_CELLS = 2, BUILT_CELLS = -2;";

function engine(step) {
  const body = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "")
    .replace(NEEDLE, step === "full" ? FULL : NEEDLE);
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(body + `
    box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, PRICE_MIN, PRICE_MAX };
    box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, price };
  `, sandbox);
  return box;
}
const ENG = { half: engine("half"), full: engine("full") };
const E = ENG.half.E;
const INDS = E.INDUSTRIES;

const GAMES = Number(process.argv[2] || 200);
const SIZES = [2, 3, 4, 5, 6];
const se2 = (p, n) => 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n);

function playOne(seed, seats, step) {
  const E2 = ENG[step].E2;
  const st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
  if (st.players.length !== seats) throw new Error(`wanted ${seats}, got ${st.players.length}`);
  st.players[0].isHuman = false;
  if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
  const series = {};
  INDS.forEach((i) => (series[i] = []));
  const rec = () => INDS.forEach((i) => series[i].push(E2.price(st.pm, i)));
  E2.advancePlanning(st, E2.mulberry32(seed + 777), (m) => {
    if (/^▶ Year \d+, Quarter \d+/.test(String(m))) rec();
  });
  rec();
  return { series, lastQ: series[INDS[0]].length };
}

function measure(seats, step) {
  const t = {};
  INDS.forEach((i) => (t[i] = { fin: 0, below: 0, floor: 0, ceil: 0, move: 0, n: 0 }));
  let early = 0, games = 0;
  for (let s = 1; s <= GAMES; s++) {
    let g; try { g = playOne(s, seats, step); } catch { continue; }
    games += 1;
    if (g.lastQ < 12) early += 1;
    for (const i of INDS) {
      const ser = g.series[i], a = t[i];
      a.n += 1;
      a.fin += ser[ser.length - 1];
      if (ser.some((v) => v < E.BASE_PRICE[i])) a.below += 1;
      if (ser.some((v) => v === E.PRICE_MIN)) a.floor += 1;
      if (ser.some((v) => v === E.PRICE_MAX)) a.ceil += 1;
      for (let k = 1; k < ser.length; k++) a.move += Math.abs(ser[k] - ser[k - 1]);
    }
  }
  return { t, early, games };
}

console.log("Entrepreneurs - a full dollar per build, instead of half");
console.log(`${GAMES} games at each of ${SIZES.length} table sizes, played both ways\n`);
console.log("today   two builds move a good $1 down; two supplier appearances move it $1 up");
console.log("tested  ONE build moves it $1 down; ONE supplier appearance moves it $1 up\n");

const R = {};
for (const seats of SIZES) R[seats] = { half: measure(seats, "half"), full: measure(seats, "full") };

/* ------------------------------------------------------- movement felt */
console.log("=".repeat(78));
console.log("HOW MUCH THE MARKET MOVES - dollars of price change per game, all six goods");
console.log("=".repeat(78));
console.log("           half-dollar step   full-dollar step    change");
for (const seats of SIZES) {
  const mv = (k) => INDS.reduce((s, i) => s + R[seats][k].t[i].move / R[seats][k].t[i].n, 0);
  const h = mv("half"), f = mv("full");
  console.log(`${seats} players ${h.toFixed(1).padStart(12)}${f.toFixed(1).padStart(19)}`
    + `${(100 * (f / h - 1)).toFixed(0)}%`.padStart(11));
}

/* ------------------------------------------------------ the two ends */
console.log("\n" + "=".repeat(78));
console.log("THE ENDS OF THE TRACK - how often a good ever hits $1, and ever hits $10");
console.log("=".repeat(78));
console.log("                     $1 floor              $10 ceiling");
console.log("               half        full        half        full");
for (const i of INDS) {
  const c = (seats, k, f) => R[seats][k].t[i][f] / R[seats][k].t[i].n;
  /* pooled over table sizes, since the question is whether the end of the track
     is reachable at all rather than how it varies with seats */
  const pool = (k, f) => SIZES.reduce((s, z) => s + c(z, k, f), 0) / SIZES.length;
  console.log(`${E.IND_NAME[i].padEnd(13)}`
    + `${(100 * pool("half", "floor")).toFixed(0)}%`.padStart(8)
    + `${(100 * pool("full", "floor")).toFixed(0)}%`.padStart(12)
    + `${(100 * pool("half", "ceil")).toFixed(0)}%`.padStart(12)
    + `${(100 * pool("full", "ceil")).toFixed(0)}%`.padStart(12));
}

/* --------------------------------------------------- risk and finals */
const REF = 4;
console.log("\n" + "=".repeat(78));
console.log(`RISK AND FINAL PRICES at ${REF} players`);
console.log("=".repeat(78));
console.log("             base   final price        ever below base       range used");
console.log("                   half    full      half       full       half     full");
for (const i of INDS) {
  const a = R[REF].half.t[i], b = R[REF].full.t[i];
  const pb = a.below / a.n, pf = b.below / b.n;
  console.log(`${E.IND_NAME[i].padEnd(13)}$${E.BASE_PRICE[i]}`
    + `${(a.fin / a.n).toFixed(1)}`.padStart(8) + `${(b.fin / b.n).toFixed(1)}`.padStart(8)
    + `  ${(100 * pb).toFixed(0)}±${se2(pb, a.n).toFixed(0)}%`.padStart(11)
    + `  ${(100 * pf).toFixed(0)}±${se2(pf, b.n).toFixed(0)}%`.padStart(11)
    + `${(100 * a.floor / a.n).toFixed(0)}/${(100 * a.ceil / a.n).toFixed(0)}`.padStart(11)
    + `${(100 * b.floor / b.n).toFixed(0)}/${(100 * b.ceil / b.n).toFixed(0)}`.padStart(9));
}
console.log("\n  \"range used\" is % of games touching the $1 floor / the $10 ceiling.");

/* ------------------------------------------------------- game length */
console.log("\n" + "=".repeat(78));
console.log("DOES IT END GAMES EARLIER?  (share stopping before Quarter 12)");
console.log("=".repeat(78));
console.log("           half    full");
for (const seats of SIZES) {
  const h = R[seats].half, f = R[seats].full;
  console.log(`${seats} players ${(100 * h.early / h.games).toFixed(0)}%`.padStart(15)
    + `${(100 * f.early / f.games).toFixed(0)}%`.padStart(8));
}
