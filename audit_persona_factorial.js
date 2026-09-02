/* ============================================================================
   AUDIT - which part of the new economy broke the persona balance?

   IT DID NOT. That is the finding, and it is the opposite of what a single
   400-game run appeared to say.

   That run reported a best-to-worst spread of 14 points where an earlier build
   had shown 7, and it was read as a regression. The error was in the statistic.
   A spread is a MAX MINUS MIN of six noisy estimates, so it is biased upward -
   with six personas at 400 games it reads 8 to 9 points even when every one of
   them is exactly fair, and it wanders by several points between runs. Comparing
   one sample of it against a remembered figure, with no error bar on either, is
   not a measurement.

   Measured properly - 1600 games at each end, and the noise on a DIFFERENCE of
   two estimates - the spread is 8.7 before and 8.6 after. Of the six personas
   only two move past their own error bars, and they move in opposite directions:
   the Resort Developer, historically the weakest, gains about 4 points, and the
   White-Label Supplier loses about 4.

   The eight-cell grid below still earns its place: it says the three changes
   contribute roughly +3, +3 and 0 points of spread, that they ADD rather than
   interact, and that all of it sits inside the noise. Three factors: 

   Three binary factors, every combination, eight worlds:

     STEP    half   one build moves its own good HALF a dollar and each of its
                    suppliers half a dollar (two events to the dollar)
             full   a whole dollar each way

     MARKET  old    track $1..$10, bases UT/RE $2, HO/MA $3, HC/TE $4
             new    track $2..$12, bases UT/RE $4, HO/MA $5, HC/TE $6
             (the track moves with the bases because raising bases into the old
             ceiling is not a coherent option - it was measured and it pinned)

     RATE    $20    cash converts to points at the old rate
             $50    at the new one. This is not only scoring: the bots price
                    every decision through it, so it changes how they play.

   The measure is the SPREAD - best persona's win rate minus worst - because
   that is what regressed. Individual rates are printed too, since a factor
   might move one persona without moving the spread much.

   Every world plays the SAME seeds, so a difference between two cells is the
   rule change and not the deal.

   Run: node audit_persona_factorial.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "400", 10);
/* `corners` runs only the two ends - the game before any of this, and the game
   as shipped - so the sample can be pushed high enough to settle a single
   persona. The eight-cell grid answers "which factor"; this answers "is the
   difference real at all", which needs four times the games to halve the error. */
const CORNERS_ONLY = process.argv[3] === "corners";

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* The engine currently ships the NEW settings, so the needles are the new ones
   and the patches put the old ones back. Asserted before use either way. */
const CUR = {
  step: "const SUPPLIER_CELLS = 2, BUILT_CELLS = -2;",
  track: "const PRICE_MIN = 2, PRICE_MAX = 12;",
  base: "const BASE_PRICE = { UT: 4, RE: 4, HO: 5, MA: 5, HC: 6, TE: 6 };",
  rate: "const CASH_PER_EP = 50;",
};
const OLD = {
  step: "const SUPPLIER_CELLS = 1, BUILT_CELLS = -1;",
  track: "const PRICE_MIN = 1, PRICE_MAX = 10;",
  base: "const BASE_PRICE = { UT: 2, RE: 2, HO: 3, MA: 3, HC: 4, TE: 4 };",
  rate: "const CASH_PER_EP = 20;",
};
for (const [k, v] of Object.entries(CUR)) {
  if (!SRC.includes(v)) { console.error(`the ${k} constant is not what this probe expects - update it`); process.exit(2); }
}

function engine({ step, market, rate }) {
  let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");
  if (step === "half") logic = logic.replace(CUR.step, OLD.step);
  if (market === "old") logic = logic.replace(CUR.track, OLD.track).replace(CUR.base, OLD.base);
  if (rate === 20) logic = logic.replace(CUR.rate, OLD.rate);
  const box = {};
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.E = { PERSONAS, BASE_PRICE, PRICE_MIN, PRICE_MAX, CASH_PER_EP, INDUSTRIES };
    box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
               finalRank, epTotal, price };
  `, sandbox);
  return box;
}

/* Eight worlds, named so the table reads as a factorial rather than a list. */
const WORLDS = [];
for (const step of ["half", "full"]) {
  for (const market of ["old", "new"]) {
    for (const rate of [20, 50]) {
      if (CORNERS_ONLY && !((step === "half" && market === "old" && rate === 20)
                         || (step === "full" && market === "new" && rate === 50))) continue;
      WORLDS.push({ step, market, rate, key: `${step}/${market}/$${rate}`, eng: engine({ step, market, rate }) });
    }
  }
}
const PK = Object.keys(WORLDS[0].eng.E.PERSONAS);
const PNAME = {};
for (const k of PK) PNAME[k] = `${WORLDS[0].eng.E.PERSONAS[k].name} (${WORLDS[0].eng.E.PERSONAS[k].ind})`;

const se2 = (p, n) => (n ? 100 * 2 * Math.sqrt(Math.max(p * (1 - p), 0) / n) : 0);

function tournament(w) {
  const { E2 } = w.eng;
  const dealt = {}, wins = {};
  PK.forEach((k) => { dealt[k] = 0; wins[k] = 0; });
  let games = 0, winnerEP = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    let st;
    try {
      st = E2.initGame(3, seed, ["Seat 1"], undefined, true, undefined);   // 4 seats, personas on
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
      E2.advancePlanning(st, E2.mulberry32(seed + 777), () => {});
    } catch { continue; }
    if (st.phase !== "gameover") continue;
    games++;
    for (const p of st.players) if (p.persona) dealt[p.persona] = (dealt[p.persona] || 0) + 1;
    const ranked = [...st.players].sort(E2.finalRank);
    const winner = ranked[0];
    if (winner.persona) wins[winner.persona] = (wins[winner.persona] || 0) + 1;
    winnerEP += E2.epTotal(winner) + Math.floor(winner.cash / w.eng.E.CASH_PER_EP);
  }
  const rows = PK.map((k) => ({ k, dealt: dealt[k], wins: wins[k],
    rate: dealt[k] ? wins[k] / dealt[k] : 0 })).sort((a, b) => b.rate - a.rate);
  const spread = 100 * (rows[0].rate - rows[rows.length - 1].rate);
  /* The noise on a SPREAD is wider than on one rate, because it is a difference
     of two estimates - so they add in quadrature. Quoting a single rate's error
     against a spread would overstate how sharp this is. */
  const noise = Math.sqrt(se2(rows[0].rate, rows[0].dealt) ** 2
                        + se2(rows[rows.length - 1].rate, rows[rows.length - 1].dealt) ** 2);
  return { rows, spread, noise, games, winnerEP: winnerEP / Math.max(1, games) };
}

console.log("Entrepreneurs - which change widened the persona spread?");
console.log(`${SEEDS} four-player games in each of ${WORLDS.length} worlds, `
  + `same seeds throughout (${SEEDS * WORLDS.length} games)\n`);

const R = {};
for (const w of WORLDS) { R[w.key] = tournament(w); process.stdout.write("."); }
console.log("\n");

if (CORNERS_ONLY) {
  const a = R["half/old/$20"], b = R["full/new/$50"];
  console.log("=".repeat(76));
  console.log("THE TWO ENDS ONLY, at high sample - is any persona really worse off?");
  console.log("=".repeat(76));
  console.log("                              before          shipped        change");
  for (const k of PK) {
    const x = a.rows.find((r) => r.k === k), y = b.rows.find((r) => r.k === k);
    const ex = se2(x.rate, x.dealt), ey = se2(y.rate, y.dealt);
    const d = 100 * (y.rate - x.rate);
    const noise = Math.sqrt(ex * ex + ey * ey);
    const verdict = Math.abs(d) > noise ? (d > 0 ? "  UP" : "  DOWN") : "  --";
    console.log(`  ${PNAME[k].padEnd(28)}`
      + `${(100 * x.rate).toFixed(1)}±${ex.toFixed(1)}`.padStart(14)
      + `${(100 * y.rate).toFixed(1)}±${ey.toFixed(1)}`.padStart(16)
      + `${(d >= 0 ? "+" : "") + d.toFixed(1)}±${noise.toFixed(1)}`.padStart(14)
      + verdict);
  }
  console.log(`\n  A verdict is given only where the change is larger than the noise on the`);
  console.log(`  change itself - two estimates differenced, so the errors add in quadrature.`);
  console.log(`\n  spread: ${a.spread.toFixed(1)} ±${a.noise.toFixed(1)} before, `
    + `${b.spread.toFixed(1)} ±${b.noise.toFixed(1)} shipped`);
  console.log(`  Note the spread is a MAX MINUS MIN of six noisy rates, so it reads well`);
  console.log(`  above zero even when every persona is truly fair - which is why the`);
  console.log(`  per-persona rows above are the honest test and the spread is not.`);
  process.exit(0);
}

/* ---------------------------------------------------------- the spread */
console.log("=".repeat(76));
console.log("THE SPREAD - best persona's win rate minus worst, in points");
console.log("=".repeat(76));
console.log("                        cash $20        cash $50");
for (const step of ["half", "full"]) {
  for (const market of ["old", "new"]) {
    const a = R[`${step}/${market}/$20`], b = R[`${step}/${market}/$50`];
    const label = `${step}-dollar step, ${market} market`;
    console.log(`  ${label.padEnd(24)}`
      + `${a.spread.toFixed(1)} ±${a.noise.toFixed(1)}`.padStart(14)
      + `${b.spread.toFixed(1)} ±${b.noise.toFixed(1)}`.padStart(16));
  }
}
console.log(`
  Top left is the game as it was before any of this. Bottom right is what
  shipped. Anything in between is one or two of the three changes.`);

/* -------------------------------------------------- main effects */
console.log("\n" + "=".repeat(76));
console.log("WHAT EACH CHANGE IS WORTH ON ITS OWN");
console.log("=".repeat(76));
const mean = (pred) => {
  const xs = WORLDS.filter(pred).map((w) => R[w.key].spread);
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};
const eff = [
  ["the full-dollar step", mean((w) => w.step === "full") - mean((w) => w.step === "half")],
  ["the raised bases and track", mean((w) => w.market === "new") - mean((w) => w.market === "old")],
  ["cash at $50 instead of $20", mean((w) => w.rate === 50) - mean((w) => w.rate === 20)],
];
console.log("  averaged over every setting of the other two:\n");
for (const [name, d] of eff) {
  const bar = "#".repeat(Math.round(Math.abs(d) * 2));
  console.log(`  ${name.padEnd(30)}${(d >= 0 ? "+" : "") + d.toFixed(1)} pts`.padEnd(46) + bar);
}
console.log(`
  A positive number means that change WIDENS the spread - makes the personas
  less balanced. This is a main effect: if two changes only misbehave together,
  it will show up as both looking mild here and the corner being worse than
  their sum, so the interaction below is the check on that.`);

const base = R["half/old/$20"].spread;
const shipped = R["full/new/$50"].spread;
const sumOfParts = eff.reduce((s, [, d]) => s + d, 0);
console.log(`  before anything: ${base.toFixed(1)}   shipped: ${shipped.toFixed(1)}   `
  + `change: ${(shipped - base >= 0 ? "+" : "") + (shipped - base).toFixed(1)}`);
console.log(`  sum of the three main effects: ${(sumOfParts >= 0 ? "+" : "") + sumOfParts.toFixed(1)} - `
  + `${Math.abs(shipped - base - sumOfParts) < 3 ? "the parts add up, so this is not an interaction"
      : "the parts do NOT add up, so the changes interact"}`);

/* ------------------------------------------------- per persona */
console.log("\n" + "=".repeat(76));
console.log("WHO MOVED - win rate by persona, before and after");
console.log("=".repeat(76));
console.log("                              before   step   market   rate   shipped");
const cell = (k, key) => {
  const r = R[key].rows.find((x) => x.k === k);
  return `${(100 * r.rate).toFixed(0)}%`.padStart(8);
};
for (const k of PK) {
  console.log(`  ${PNAME[k].padEnd(28)}`
    + cell(k, "half/old/$20")
    + cell(k, "full/old/$20")
    + cell(k, "half/new/$20")
    + cell(k, "half/old/$50")
    + cell(k, "full/new/$50"));
}
console.log(`
  Columns 2-4 change ONE thing from the "before" column, so reading across a row
  says which change that persona cares about. Every rate carries roughly
  ±${se2(0.25, Math.round(SEEDS * 4 / 6)).toFixed(0)} points of noise, so only differences bigger than that mean anything.`);

console.log("\n  winning score, for reference:");
for (const w of WORLDS) console.log(`    ${w.key.padEnd(20)}${R[w.key].winnerEP.toFixed(0)} EP`);
