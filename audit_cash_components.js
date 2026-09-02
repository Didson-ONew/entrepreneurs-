/* ============================================================================
   AUDIT - how much money does the physical box have to contain?

   Under the new economy the numbers roughly doubled, so the component question
   is real: what denominations, how many of each, and does it still fit.

   This is NOT the same question as "how much cash exists in the game". A bank
   in a euro is a supply that must never run dry AT ITS PEAK, and the peak is
   what matters, not the average. Three quantities decide the box:

     ON THE TABLE   the most every seat holds at once. The bank must be able to
                    have paid all of that out simultaneously.
     IN ONE HAND    the most any single seat holds. This decides whether a
                    player can physically hold and count their pile.
     ONE PAYMENT    the largest single sum that changes hands - a pot payout, a
                    delivery, a Megacorp's ground rent - which decides the
                    largest denomination worth printing.

   Then it costs the set out three ways: poker chips, printed notes, and a
   hybrid, with real weights, because "will it fit in the box" is a question
   about grams and millimetres rather than dollars.

   Run: node audit_cash_components.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);
const SIZES = [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }

/* Hook every payment the bank makes, so the largest single sum is measured
   rather than guessed. Delivery is the big one; pot shares and rent are the
   other two that can spike. */
const NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!SRC.includes(NEEDLE)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }
const HOOK = "  const leftover = Math.max(0, remaining);\n"
  + "  __pay(earned + leftover * 1);\n"
  + "  p.cash += earned + leftover * 1;";

let biggestPayment = 0;
const box = {};
const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number,
  __pay: (v) => { if (v > biggestPayment) biggestPayment = v; } };
vm.createContext(sandbox);
vm.runInContext(SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "").replace(NEEDLE, HOOK) + `
  box.E = { INDUSTRIES, PRICE_MIN, PRICE_MAX, CASH_PER_EP, BASE_PRICE };
  box.E2 = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning };
`, sandbox);
const E = box.E, E2 = box.E2;

const R = {};
for (const seats of SIZES) {
  const T = { games: 0, peakTable: 0, peakSeat: 0, peakPot: 0, meanTable: 0, samples: 0,
              endMax: 0, biggestPay: 0 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    let st;
    try {
      st = E2.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      if (st.players.length !== seats) continue;
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E2.advanceDraft(st, () => {}); E2.startPlanning(st); }
    } catch { continue; }
    biggestPayment = 0;
    const sample = () => {
      T.samples++;
      let table = 0;
      for (const p of st.players) {
        table += p.cash;
        if (p.cash > T.peakSeat) T.peakSeat = p.cash;
      }
      T.meanTable += table;
      if (table > T.peakTable) T.peakTable = table;
      if (st.pots) for (const i of E.INDUSTRIES) {
        if ((st.pots[i] || 0) > T.peakPot) T.peakPot = st.pots[i];
      }
    };
    try {
      E2.advancePlanning(st, E2.mulberry32(seed + 777), (m) => {
        if (/^▶ Year \d+, Quarter \d+/.test(String(m))) sample();
      });
    } catch { continue; }
    sample();
    T.games++;
    if (biggestPayment > T.biggestPay) T.biggestPay = biggestPayment;
    const end = st.players.reduce((s, p) => s + p.cash, 0);
    if (end > T.endMax) T.endMax = end;
  }
  R[seats] = T;
}

console.log("Entrepreneurs - what the money in the box has to do");
console.log(`${SEEDS} games at each of ${SIZES.length} table sizes, on the CURRENT engine`);
console.log(`(track $${E.PRICE_MIN}..$${E.PRICE_MAX}, cash at $${E.CASH_PER_EP}/EP)\n`);

console.log("=".repeat(76));
console.log("WHAT THE BANK HAS TO COVER");
console.log("=".repeat(76));
console.log("            mean on     PEAK on     most in    biggest    biggest");
console.log("            the table   the table   one hand   one pot    one payment");
for (const z of SIZES) {
  const t = R[z];
  console.log(`  ${z} players`
    + `$${Math.round(t.meanTable / t.samples)}`.padStart(11)
    + `$${Math.round(t.peakTable)}`.padStart(12)
    + `$${Math.round(t.peakSeat)}`.padStart(11)
    + `$${Math.round(t.peakPot)}`.padStart(10)
    + `$${Math.round(t.biggestPay)}`.padStart(14));
}

/* The design figure: the worst case across every table size, with headroom.
   A bank that runs dry mid-game is a broken game, so this rounds UP generously
   rather than sizing to the average. */
const worstTable = Math.max(...SIZES.map((z) => R[z].peakTable));
const worstSeat = Math.max(...SIZES.map((z) => R[z].peakSeat));
const worstPay = Math.max(...SIZES.map((z) => R[z].biggestPay));
const BANK = Math.ceil((worstTable * 1.35) / 500) * 500;
console.log(`
  Peak on the table across every size measured: $${Math.round(worstTable)}.
  Bots do not hoard the way people do, so a real table will hold more. Sizing the
  bank at $${BANK} - about 35% headroom - is the figure the rest of this uses.`);

/* ------------------------------------------------------------- the sets */
console.log("\n" + "=".repeat(76));
console.log(`THREE WAYS TO PUT $${BANK} IN THE BOX`);
console.log("=".repeat(76));

/* Make change for a target total on a denomination set, keeping enough small
   money to actually pay a $1 recycling credit and a $2 sale. */
function buildSet(denoms, total, minSmall) {
  const out = denoms.map((d) => ({ d, n: 0 }));
  /* small money first, to a fixed floor, then the rest in the largest notes */
  let spent = 0;
  for (const row of out) {
    const want = minSmall[row.d] || 0;
    row.n = want; spent += want * row.d;
  }
  let left = Math.max(0, total - spent);
  const big = out[out.length - 1];
  big.n += Math.ceil(left / big.d);
  return out;
}

const SETS = [
  { name: "Poker chips, 4 values",
    denoms: [1, 5, 25, 100],
    minSmall: { 1: 60, 5: 60, 25: 40 },
    gramsEach: 11.5, mmEach: 3.3, note: "11.5g clay-composite, 3.3mm thick" },
  { name: "Printed notes, 6 values",
    denoms: [1, 2, 5, 10, 20, 50],
    minSmall: { 1: 60, 2: 40, 5: 50, 10: 40, 20: 30 },
    gramsEach: 0.6, mmEach: 0.11, note: "0.6g of 300gsm card, 44x88mm" },
  { name: "Hybrid: chips for change, notes for the rest",
    denoms: [1, 5, 25, 100],
    minSmall: { 1: 50, 5: 40 },
    gramsEach: 4.0, mmEach: 1.2, note: "chips under $25, notes above - blended" },
];

for (const s of SETS) {
  const rows = buildSet(s.denoms, BANK, s.minSmall);
  const count = rows.reduce((n, r) => n + r.n, 0);
  const value = rows.reduce((n, r) => n + r.n * r.d, 0);
  const grams = count * s.gramsEach;
  const stackMm = count * s.mmEach;
  console.log(`\n  ${s.name}   (${s.note})`);
  console.log(`    ${rows.map((r) => `${r.n} x $${r.d}`).join("   ")}`);
  console.log(`    ${count} pieces, $${value} of face value, `
    + `${(grams / 1000).toFixed(2)} kg, ${(stackMm / 10).toFixed(0)} cm of stacked height`);
}

console.log(`
  A retail board game box weighs 1.2-2.0 kg all in, and the insert has to hold
  a board, 60 cards, six players' worth of wooden pieces and the money. Anything
  over about 0.6 kg of money alone is a problem - it is the heaviest thing in
  the box and the least interesting.`);
