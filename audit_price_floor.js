/* ============================================================================
   AUDIT - where should the bottom of the price track be?

   Doubling the step to a full dollar per build fixed the top of the track and
   made every industry genuinely risky, but it pinned the two cheap goods to the
   floor: Utilities on $1 in 52% of four player games, Retail in 70%. A price
   that is stuck is not a price. Two ways out, both measured here.

     FLOOR $2   the track runs $2..$10 and $1 stops being a market price at all.
                It becomes purely the recycling rate, which is already what the
                engine pays for production the demand board cannot absorb - so
                the gap between "worst possible sale" and "throw it away" opens
                up for the first time. The snag the proposal names itself:
                Utilities and Retail have a $2 base, so they would START at the
                floor with nowhere to fall.

     BASE +$1   every industry opens a dollar higher - UT/RE $3, HO/MA $4,
                HC/TE $5 - and the floor stays at $1. Everything gains a dollar
                of room to fall through.

     BOTH       floor $2 and every base up a dollar. Nothing starts at the
                floor, and nothing can be sold below recycling. This is the
                combination the first two each half-solve, so it is measured
                alongside them rather than left to be guessed at.

   Each is played at both step sizes, because the floor only became a problem
   once the step doubled and the right answer may differ between them.

   Run: node audit_price_floor.js [gamesPerSize]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this script"); process.exit(2); }

const N = {
  step: "const SUPPLIER_CELLS = 1, BUILT_CELLS = -1;",
  floor: "const PRICE_MIN = 1, PRICE_MAX = 10;",
  base: "const BASE_PRICE = { UT: 2, RE: 2, HO: 3, MA: 3, HC: 4, TE: 4 };",
};
for (const [k, v] of Object.entries(N)) {
  if (!SRC.includes(v)) { console.error(`the ${k} constants have changed - update this script`); process.exit(2); }
}
const P = {
  step: "const SUPPLIER_CELLS = 2, BUILT_CELLS = -2;",
  floor: "const PRICE_MIN = 2, PRICE_MAX = 10;",
  base: "const BASE_PRICE = { UT: 3, RE: 3, HO: 4, MA: 4, HC: 5, TE: 5 };",
};

/* The recycling rate is a hardcoded $1 in the payout and in the bot's
   valuation, and it is deliberately NOT touched by any of these: the whole
   point of a $2 floor is that recycling stays where it is while the market
   stops coming down to meet it. */
function engine(step, econ) {
  let body = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  if (step === "full") body = body.replace(N.step, P.step);
  if (econ === "floor2" || econ === "both") body = body.replace(N.floor, P.floor);
  if (econ === "base+1" || econ === "both") body = body.replace(N.base, P.base);
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(body + `
    box.E = { INDUSTRIES, IND_NAME, BASE_PRICE, PRICE_MIN, PRICE_MAX };
    box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, price };
  `, sandbox);
  return box;
}

const STEPS = ["half", "full"];
const ECONS = ["today", "floor2", "base+1", "both"];
const ENG = {};
for (const s of STEPS) for (const e of ECONS) ENG[`${s}|${e}`] = engine(s, e);

const E0 = ENG["half|today"].E;
const INDS = E0.INDUSTRIES;
const GAMES = Number(process.argv[2] || 150);
const SIZES = [3, 4, 5, 6];
const se2 = (p, n) => 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n);

function measure(seats, step, econ) {
  const key = `${step}|${econ}`;
  const { E, E2 } = ENG[key];
  const t = {};
  INDS.forEach((i) => (t[i] = { fin: 0, below: 0, floor: 0, ceil: 0, move: 0, pinned: 0, qs: 0, n: 0 }));
  let games = 0, early = 0;
  for (let s = 1; s <= GAMES; s++) {
    let st;
    try {
      st = E2.initGame(seats - 1, s, ["Seat 1"], undefined, true, undefined);
      if (st.players.length !== seats) continue;
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
    } catch { continue; }
    const ser = {};
    INDS.forEach((i) => (ser[i] = []));
    const rec = () => INDS.forEach((i) => ser[i].push(E2.price(st.pm, i)));
    try {
      E2.advancePlanning(st, E2.mulberry32(s + 777), (m) => {
        if (/^▶ Year \d+, Quarter \d+/.test(String(m))) rec();
      });
    } catch { continue; }
    rec();
    games += 1;
    if (ser[INDS[0]].length < 12) early += 1;
    for (const i of INDS) {
      const v = ser[i], a = t[i];
      a.n += 1;
      a.fin += v[v.length - 1];
      if (v.some((x) => x < E.BASE_PRICE[i])) a.below += 1;
      if (v.some((x) => x === E.PRICE_MIN)) a.floor += 1;
      if (v.some((x) => x === E.PRICE_MAX)) a.ceil += 1;
      /* "pinned" is the share of QUARTERS spent sitting on the floor, which is
         the thing that actually hurts - touching $1 once is drama, living
         there for six quarters is a dead industry. */
      a.pinned += v.filter((x) => x === E.PRICE_MIN).length;
      a.qs += v.length;
      for (let k = 1; k < v.length; k++) a.move += Math.abs(v[k] - v[k - 1]);
    }
  }
  return { t, games, early, E };
}

const R = {};
for (const s of STEPS) for (const e of ECONS) for (const z of SIZES) R[`${s}|${e}|${z}`] = measure(z, s, e);

console.log("Entrepreneurs - where the bottom of the price track should sit");
console.log(`${GAMES} games at each of ${SIZES.length} table sizes, `
  + `${STEPS.length} step sizes x ${ECONS.length} economies `
  + `= ${GAMES * SIZES.length * STEPS.length * ECONS.length} games\n`);
console.log("  today   $1..$10, bases UT/RE $2, HO/MA $3, HC/TE $4");
console.log("  floor2  $2..$10, same bases - UT and RE therefore OPEN on the floor");
console.log("  base+1  $1..$10, bases UT/RE $3, HO/MA $4, HC/TE $5");
console.log("  both    $2..$10, bases raised - nothing opens on the floor\n");

for (const step of STEPS) {
  const label = step === "full" ? "FULL-DOLLAR STEP (one build = $1)" : "HALF-DOLLAR STEP (as it ships today)";
  console.log("=".repeat(78));
  console.log(label);
  console.log("=".repeat(78));

  console.log("\n  Share of ALL QUARTERS a good spends sitting on the floor, 4 players");
  console.log("               " + ECONS.map((e) => e.padStart(9)).join(""));
  for (const i of INDS) {
    console.log(`  ${E0.IND_NAME[i].padEnd(13)}`
      + ECONS.map((e) => {
        const a = R[`${step}|${e}|4`].t[i];
        return `${(100 * a.pinned / a.qs).toFixed(0)}%`.padStart(9);
      }).join(""));
  }

  console.log("\n  Ever trades below its own base, 4 players (the whole point of a market)");
  console.log("               " + ECONS.map((e) => e.padStart(9)).join(""));
  for (const i of INDS) {
    console.log(`  ${E0.IND_NAME[i].padEnd(13)}`
      + ECONS.map((e) => {
        const a = R[`${step}|${e}|4`].t[i];
        return `${(100 * a.below / a.n).toFixed(0)}%`.padStart(9);
      }).join(""));
  }

  console.log("\n  Ever reaches the $10 ceiling, pooled over table sizes");
  console.log("               " + ECONS.map((e) => e.padStart(9)).join(""));
  for (const i of INDS) {
    console.log(`  ${E0.IND_NAME[i].padEnd(13)}`
      + ECONS.map((e) => {
        const p = SIZES.reduce((s, z) => {
          const a = R[`${step}|${e}|${z}`].t[i];
          return s + a.ceil / a.n;
        }, 0) / SIZES.length;
        return `${(100 * p).toFixed(0)}%`.padStart(9);
      }).join(""));
  }

  console.log("\n  Dollars of price movement per game, all six goods");
  console.log("               " + ECONS.map((e) => e.padStart(9)).join(""));
  for (const z of SIZES) {
    console.log(`  ${z} players    `
      + ECONS.map((e) => {
        const r = R[`${step}|${e}|${z}`];
        return INDS.reduce((s, i) => s + r.t[i].move / r.t[i].n, 0).toFixed(1).padStart(9);
      }).join(""));
  }

  console.log("\n  Final price, averaged over the six goods and the four table sizes");
  console.log("               " + ECONS.map((e) => e.padStart(9)).join(""));
  console.log("  average      "
    + ECONS.map((e) => {
      let tot = 0, k = 0;
      for (const z of SIZES) for (const i of INDS) {
        const a = R[`${step}|${e}|${z}`].t[i]; tot += a.fin / a.n; k += 1;
      }
      return `$${(tot / k).toFixed(2)}`.padStart(9);
    }).join(""));
  console.log("  above base   "
    + ECONS.map((e) => {
      let tot = 0, k = 0;
      for (const z of SIZES) for (const i of INDS) {
        const r = R[`${step}|${e}|${z}`];
        tot += r.t[i].fin / r.t[i].n - r.E.BASE_PRICE[i]; k += 1;
      }
      return `+$${(tot / k).toFixed(2)}`.padStart(9);
    }).join(""));
  console.log("");
}

/* ---------------------------------------------------------- one summary */
console.log("=".repeat(78));
console.log("THE TRADE, IN ONE TABLE - full-dollar step, pooled over all table sizes");
console.log("=".repeat(78));
console.log("            quarters   games ever    games ever    $ moved   goods opening");
console.log("            on floor   below base    at ceiling    per game    on the floor");
for (const e of ECONS) {
  let pin = 0, bel = 0, cei = 0, mv = 0, k = 0, mvk = 0;
  const Ee = R[`full|${e}|4`].E;
  for (const z of SIZES) {
    const r = R[`full|${e}|${z}`];
    mv += INDS.reduce((s, i) => s + r.t[i].move / r.t[i].n, 0); mvk += 1;
    for (const i of INDS) {
      const a = r.t[i];
      pin += a.pinned / a.qs; bel += a.below / a.n; cei += a.ceil / a.n; k += 1;
    }
  }
  const opening = INDS.filter((i) => Ee.BASE_PRICE[i] === Ee.PRICE_MIN).length;
  console.log(`${e.padEnd(11)}${(100 * pin / k).toFixed(0)}%`.padStart(20)
    + `${(100 * bel / k).toFixed(0)}%`.padStart(13)
    + `${(100 * cei / k).toFixed(0)}%`.padStart(14)
    + `${(mv / mvk).toFixed(1)}`.padStart(12)
    + `${opening} of 6`.padStart(15));
}
