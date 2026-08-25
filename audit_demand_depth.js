/* ============================================================================
   Demand icons that absorb their own level, not one unit each.

   THE PROPOSAL. A demand icon in the level-N column swallows N units instead of
   one. A level-3 Retail company reaches columns 1, 2 and 3, so a single clean
   Retail row now takes 1 + 2 + 3 = 6 of its units rather than 3. Saleable output
   grows with company level the same way production does, instead of production
   scaling while the board's appetite stays flat.

   WHY THIS IS THE RIGHT SHAPE OF FIX. audit_economy_size.js found two thirds of
   all production recycled at $1 while only 11-25% of demand slots were ever
   filled - the icons were open and the units could not reach them.
   audit_production_scale.js then showed that cutting production attacks the
   ratio from the wrong end: it shrinks the numerator and the denominator
   together, so waste falls slowly while the economy shrinks fast. This changes
   the DENOMINATOR OF REACH instead, which is where the problem actually is.

   TWO PLACES HAVE TO MOVE TOGETHER. deliverToSlot decides what a slot absorbs,
   and placeableFor is the bot's estimate of what a company could sell from a
   given plot - it drives what gets built and where. Patch only the first and
   the bots keep building to the old, smaller appetite and the measurement is
   meaningless. Both are patched here.

   WHAT COULD GO WRONG, and is therefore measured:

     TECHNOLOGY. Its doubler already returns 2 units per icon. If the icon's
     level multiplies that, a level-3 Technology takes 2 x (1+2+3) = 12 units
     from one row, which may simply be the best card in the game. Both readings
     are run: MULTIPLY (level x doubler) and ADD (level + 1 extra unit).

     THE WHOLE ECONOMY GETTING RICH. Selling three times as much at market price
     instead of recycling at $1 is a large raise. Trade income, end cash, and
     whether companies now trivially cover OPEX are all tracked.

     THE BIG COMPANY RUNNING AWAY. Level scaling is superlinear here - level 3
     sells six units to a row, level 1 sells one - so upgrading may become the
     only move worth making.

     VERTICAL VS HORIZONTAL. Vertical industries stack levels on one plot,
     horizontal ones spread across plots. Only level drives the new absorption,
     so this may quietly favour whichever scaling shape reaches more rows.

   WHAT IT FOUND: SHIPPED. This is the fix production cuts could not be.

   Waste falls from 65% to 49% at four seats, 65% to 51% at two, 67% to 52% at
   six - a 14-16 point drop for free, against the 24 points that cutting
   production to HALF bought while dropping OPEX coverage from 91% to 29%.

   AND IT FALLS WHERE IT SHOULD, which is the whole point of the proposal:

     recycled by level   as it stands   with depth
     level 1                     71%          70%
     level 2                     61%          52%
     level 3                     61%          39%
     level 4                     70%          42%

   A level-1 company is unchanged, because it still only reaches the level-1
   icon and that icon still takes one unit. Growth is what buys the appetite,
   exactly as intended.

   NOTHING BREAKS. Companies covering their OPEX at market: 91% before, 91%
   after, at every table size. Industry spread in the winner's portfolio: 26
   points before, 26 after, against a two-standard-error band of 9 - Healthcare
   improves (37% to 46%) and Manufacturing softens (56% to 47%), both inside
   noise. The vertical/horizontal split does not move. Upgrades per seat rise
   from 1.38 to 1.64, which is the intended consequence and not a distortion.

   THE MULTIPLY AND ADD READINGS OF TECHNOLOGY ARE INDISTINGUISHABLE. Whether
   the icon's level multiplies TE's doubler or merely adds to it, every column
   here lands inside noise of the other. MULTIPLY is shipped because it leaves
   Technology's printed ability - "2 units per icon, paid for both" - true
   exactly as written, rather than needing an exception.

   WHAT IT COSTS, and this is the honest part. The economy gets materially
   richer: trade income per seat goes from $178 to $275, end cash from $164 to
   $227, and the winning score from 93 to 108 at four seats. More seriously, the
   winner's lead over SECOND widens from 14.6 to 20.5 at four seats - about 40%.
   Bigger companies selling more of what they make is a bigger reward for
   getting ahead, and that shows up in the margin. It is worth watching in
   playtest, and if it needs answering, trimming production is now nearly free
   in a way it was not before: with waste at 49% instead of 65%, a x0.8 cut
   costs much less of the floor than audit_production_scale.js measured.

   Run: node audit_demand_depth.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const DELIVER_NEEDLE = `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : exchangeRate(state, biz);`;
const PLACEABLE_NEEDLE = `  const direct = slots.filter((s) => !s.cross).length * exchangeRate(state, biz);`;
const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
for (const [n, w] of [[DELIVER_NEEDLE, "deliverToSlot"], [PLACEABLE_NEEDLE, "placeableFor"], [SALE_NEEDLE, "autoDeliver"]]) {
  if (!BASE.includes(n)) { console.error(`the engine changed shape around ${w} - update this probe`); process.exit(2); }
}

const econ = { prod: 0, left: 0, earned: 0, byInd: {}, byLevel: {} };

/* mode: "off" | "mul" | "add" */
function loadEngine(mode) {
  let logic = BASE;
  if (mode !== "off") {
    const absorb = mode === "mul"
      ? "(levelIdx + 1) * exchangeRate(state, biz)"
      : "((levelIdx + 1) + (exchangeRate(state, biz) - 1))";
    logic = logic.replace(DELIVER_NEEDLE,
      `  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : ${absorb};`);
    const est = mode === "mul"
      ? "slots.filter((s) => !s.cross).reduce((n, s) => n + (s.levelIdx + 1), 0) * exchangeRate(state, biz)"
      : "slots.filter((s) => !s.cross).reduce((n, s) => n + (s.levelIdx + 1) + (exchangeRate(state, biz) - 1), 0)";
    logic = logic.replace(PLACEABLE_NEEDLE, `  const direct = ${est};`);
  }
  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n" +
    "  p.cash += earned + leftover * 1;");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    sale: (earned, left, prod, ind, lvl) => {
      econ.earned += earned; econ.left += left; econ.prod += prod;
      const I = econ.byInd[ind] || (econ.byInd[ind] = { prod: 0, left: 0 });
      I.prod += prod; I.left += left;
      const L = econ.byLevel[lvl] || (econ.byLevel[lvl] = { prod: 0, left: 0 });
      L.prod += prod; L.left += left;
    },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, price,
      plotCount, INDUSTRIES, SCALING, RENT_PER_LEVEL };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const noise = (p, n) => 100 * 2 * Math.sqrt((p * (1 - p)) / Math.max(1, n));

const MODES = [["off", "as it stands"], ["mul", "level x doubler"], ["add", "level + doubler"]];
const SEATS = [2, 4, 6];
const results = {};

for (const [mode, label] of MODES) {
  for (const seats of SEATS) {
    econ.prod = econ.left = econ.earned = 0; econ.byInd = {}; econ.byLevel = {};
    const E = loadEngine(mode);
    const T = {
      mode, label, seats, games: 0, players: 0,
      winnerEP: 0, spread: 0, gapSecond: 0, endQ: 0, early: 0,
      companies: 0, upgrades: 0, cash: 0, loans: 0, plots: 0, hqs: 0,
      slotsOpen: 0, slotsFilled: 0,
      profitable: 0, cq: 0,
      indWin: {}, vert: 0, horiz: 0,
    };
    for (const i of E.INDUSTRIES) T.indWin[i] = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      const sample = () => {
        const tiles = st.demand && st.demand.tiles ? Object.values(st.demand.tiles) : [];
        for (const t of tiles) {
          t.rows.forEach((ind, r) => {
            if (r >= 2 && st.quarter <= 4) return;
            for (let l = 0; l < 4; l++) { T.slotsOpen++; if (t.filled[r][l]) T.slotsFilled++; }
          });
        }
      };
      E.advancePlanning(st, E.mulberry32(seed + 777), (m) => {
        if (/^▶ Year \d+, Quarter \d+/.test(String(m))) sample();
      });
      if (st.phase !== "gameover") continue;
      sample();
      T.games++;
      T.endQ += st.quarter;
      if (st.quarter < 12) T.early++;

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);
      T.gapSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);
      const wInds = new Set([...E.activeBiz(winner), ...E.megacorpHQs(winner)].map(E.bizInd));
      for (const i of wInds) T.indWin[i]++;

      for (const p of st.players) {
        T.players++;
        T.companies += E.activeBiz(p).length;
        T.upgrades += p.businesses.filter((b) => b.upgraded).length;
        T.cash += p.cash; T.loans += p.discsInBank;
        T.plots += E.plotCount(st, p);
        T.hqs += E.megacorpHQs(p).length;
        for (const b of [...E.activeBiz(p), ...E.megacorpHQs(p)]) {
          T.cq++;
          if (E.bizProd(b) * E.price(st.pm, E.bizInd(b)) >= E.bizOpex(b) + E.RENT_PER_LEVEL * b.level) T.profitable++;
          if (E.SCALING[E.bizInd(b)] === "V") T.vert++; else T.horiz++;
        }
      }
    }
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    T.byInd = JSON.parse(JSON.stringify(econ.byInd));
    T.byLevel = JSON.parse(JSON.stringify(econ.byLevel));
    results[`${mode}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - demand icons that absorb their own level");
console.log(`${SEEDS} games per mode per table size, personas on.`);
console.log("A level-3 company reaches columns 1-3, so a clean row takes 1+2+3 = 6 units.\n");

const W = 17;
const cols = MODES.map(([m]) => m);
const head = (seats) => console.log(pad(`  ${seats} players`, 34) + MODES.map(([, l]) => rp(l, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 34) + cols.map((m) => rp(fn(results[`${m}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 34) + cols.map((m) => rp(`${(100 * fn(results[`${m}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 34) + cols.map((m) => rp(`$${Math.round(fn(results[`${m}|${seats}`]))}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(34 + W * 3));
  head(seats);
  console.log("=".repeat(34 + W * 3));
  lpct(seats, "  production recycled at $1", (T) => T.left / Math.max(1, T.prod));
  lpct(seats, "  demand slots filled", (T) => T.slotsFilled / Math.max(1, T.slotsOpen));
  lcash(seats, "  trade income per seat", (T) => T.earned / Math.max(1, T.players));
  lpct(seats, "  companies covering OPEX", (T) => T.profitable / Math.max(1, T.cq));
  console.log("");
  line(seats, "  winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  line(seats, "  winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  line(seats, "  winner's lead over last", (T) => T.spread / Math.max(1, T.games));
  lcash(seats, "  cash a seat ends with", (T) => T.cash / Math.max(1, T.players));
  console.log("");
  line(seats, "  companies per seat", (T) => T.companies / Math.max(1, T.players), 2);
  line(seats, "  of them upgraded", (T) => T.upgrades / Math.max(1, T.players), 2);
  line(seats, "  plots per seat", (T) => T.plots / Math.max(1, T.players), 2);
  line(seats, "  Megacorps per game", (T) => T.hqs / Math.max(1, T.games), 2);
  line(seats, "  quarter the game ended", (T) => T.endQ / Math.max(1, T.games), 1);
  lpct(seats, "  vertical share of companies", (T) => T.vert / Math.max(1, T.vert + T.horiz));
}

console.log("\n\nRECYCLED SHARE BY INDUSTRY, at 4 seats");
{
  const E0 = loadEngine("off");
  console.log(pad("", 34) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind} (${E0.SCALING[ind]})`, 34) + cols.map((m) => {
      const d = results[`${m}|4`].byInd[ind];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
  console.log("\nSHARE OF GAMES IN THE WINNER'S PORTFOLIO, at 4 seats");
  console.log(pad("", 34) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const ind of E0.INDUSTRIES) {
    console.log(pad(`  ${ind} (${E0.SCALING[ind]})`, 34) + cols.map((m) => {
      const T = results[`${m}|4`];
      return rp(`${(100 * T.indWin[ind] / Math.max(1, T.games)).toFixed(0)}%`, W);
    }).join(""));
  }
  console.log(pad("  spread, best minus worst", 34) + cols.map((m) => {
    const T = results[`${m}|4`];
    const v = E0.INDUSTRIES.map((i) => 100 * T.indWin[i] / Math.max(1, T.games));
    return rp(`${(Math.max(...v) - Math.min(...v)).toFixed(0)} pts`, W);
  }).join(""));
  console.log(`\n  two standard errors on each share is about ±${noise(0.5, results["off|4"].games).toFixed(1)} points.`);

  console.log("\nRECYCLED SHARE BY COMPANY LEVEL, at 4 seats");
  console.log(pad("", 34) + MODES.map(([, l]) => rp(l, W)).join(""));
  for (const lv of [1, 2, 3, 4]) {
    console.log(pad(`  level ${lv}`, 34) + cols.map((m) => {
      const d = results[`${m}|4`].byLevel[lv];
      return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
    }).join(""));
  }
}
console.log("");
