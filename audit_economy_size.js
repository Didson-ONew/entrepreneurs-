/* ============================================================================
   How big should the economy be at each player count?

   The board does not change with the number of players. Sixteen districts, the
   same demand grid, the same six decks of ten, the same pots. Two players and
   six players fish the same pond. This probe asks, for every table size, WHICH
   RESOURCE IS ACTUALLY SCARCE - because that is what "economy size" means in
   practice, and it decides whether anything needs to scale with the count.

   Six resources are tracked, each sampled at every quarter boundary rather than
   read off the wreckage at the end (the demand grid RESETS in Year 3, so an
   end-of-game count would report a third of the truth):

     DEMAND     what share of the open demand slots on the board are filled, and
                how much production had to be recycled at $1 because there was
                nowhere to sell it. This is the pond.

     LAND       plots owned against plots existing, and districts that have at
                least one building standing in them.

     MONEY      cash held per seat, cash on the table, and how much of it moves
                per quarter. A pond that is fished harder should show thinner
                margins, not thicker ones.

     PRICES     the mean industry price by year. The closed loop is supposed to
                push crowded industries toward $1 and starve-fed ones upward; if
                every price collapses the economy is too small for the table.

     DECKS      Blueprint cards left. Sixty cards for six players is ten each.

     COMPONENTS peak discs in use by any one seat, and the largest pot, which is
                what a physical edition has to be able to pay out.

   What it CANNOT tell you is how a person would play. Bots do not hoard for the
   sake of it and do not misread the market, so every scarcity here is a floor:
   a table of people will press on the same limits at least this hard.

   WHAT IT FOUND, over 150 games a table size

   THE ECONOMY DOES NOT NEED TO SCALE WITH THE PLAYER COUNT. It already does,
   on its own. Cash on the table grows almost exactly linearly - $167 at two
   seats to $510 at six - while cash PER SEAT stays flat at $67-$85 and prices
   rise from a mean of $3 in Year 1 to $4 in Year 3 at every count. A closed
   loop with more players in it simply circulates more money among more hands.
   Nothing about the money supply, the pots or the price ladder wants adjusting.

   THE BINDING CONSTRAINT AT EVERY TABLE SIZE IS THE DISCS, NOT THE BOARD. A
   seat uses 7.1-8.5 of its twelve on average and 21-34% of seats end with none
   free, while the city stays mostly empty: 16-38% of plots owned and only
   11-25% of open demand slots ever filled. Two players use 11% of the demand
   grid. The pond is not the limit; the fishing licence is.

   THE ONE THING THAT REALLY DOES SCALE IS THE BLUEPRINT DECKS. Cards left of
   sixty: 44.6 at two seats, 41.1 at three, 31.6 at four, 23.4 at five, 13.6 at
   SIX. Six players consume 77% of the card supply. That is the number that says
   six is the ceiling for this box - a seventh seat would run the decks dry
   before Year 3, and nothing else in the game is close to its limit.

   SO THE RECOMMENDED "ECONOMY SIZE" PER COUNT IS:

     2 players   the board is roughly twice the city this game needs. 11% demand
                 use, 16% land use, 25% of districts ever built in. Playable and
                 measured as balanced, but it plays in a ghost town. The only
                 count where trimming the map (say eight suburb districts rather
                 than twelve) would tighten the game rather than break it.
     3 players   slightly loose - 12% demand, 19% land. Trimming optional.
     4 players   the reference. Every resource comfortably inside its limit.
     5 players   healthy. Decks at 61% consumed.
     6 players   the ceiling, and the decks are what set it. Everything else has
                 room; the cards do not.
     7+          would need more Blueprints before anything else is considered.

   TWO THINGS TURNED UP THAT ARE NOT ABOUT TABLE SIZE AT ALL:

   ABOUT TWO THIRDS OF ALL PRODUCTION IS RECYCLED AT $1. 64-67% at every table
   size, and roughly flat across company levels (60-75%), so it is structural
   rather than a big-company problem. It splits hard by industry, though:
   Technology wastes 34-58% and Healthcare 45-65%, against Utilities 71-76% and
   Retail 71-77%. Since only 11-25% of demand slots are ever filled, the cause
   is REACH, not exhausted demand - production cannot get to the icons that are
   sitting open. Whether that is a fault or a feature is a design decision, not
   a measurement: the $1 floor is a deliberate rule and companies stay
   profitable. But it does mean the production numbers printed on the cards are
   roughly three times what the board absorbs, and that the $2 industries are
   the ones paying for it.

   THE 12-DISC LIMIT LEAKS, RARELY. Peak observed use is 13 discs at four and
   six seats and 14 at two, against a limit of twelve - about 0.4% of samples at
   two players and effectively none elsewhere. The example case is ten plots
   plus four company slots with no loans outstanding. doLoan checks discsFree
   but some other acquisition path evidently does not. It is rare enough not to
   affect any balance number here, and it matters for a physical edition, where
   the box has to contain enough discs for whatever the rules permit.

   Run: node audit_economy_size.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "200", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
let logic = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* One hook: every delivery, so sold units can be told from recycled ones. */
const NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!logic.includes(NEEDLE)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }
/* Hospitality's neighbour trade and Manufacturing's cross-sell are ROUTES for the
   same production, not extra output, so the unit total is bizProd(biz) alone.
   An earlier draft added hoBonus on top and undercounted the waste. */
logic = logic.replace(NEEDLE,
  "  const leftover = Math.max(0, remaining);\n" +
  "  __econ.sale(earned, leftover, bizProd(biz), bizInd(biz), biz.level);\n" +
  "  p.cash += earned + leftover * 1;");

const econ = { prod: 0, recycled: 0, earned: 0, byLevel: {}, byInd: {} };
const box = {};
const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
  sale: (earned, leftover, prod, ind, level) => {
    econ.earned += earned; econ.recycled += leftover; econ.prod += prod;
    const L = econ.byLevel[level] || (econ.byLevel[level] = { prod: 0, left: 0 });
    L.prod += prod; L.left += leftover;
    const I = econ.byInd[ind] || (econ.byInd[ind] = { prod: 0, left: 0 });
    I.prod += prod; I.left += leftover;
  },
} };
vm.createContext(sandbox);
vm.runInContext(logic + `
  box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
    epTotal, finalRank, activeBiz, megacorpHQs, plotCount, districtCount, discsFree,
    price, INDUSTRIES, DISCS_PER_PLAYER, BP_DATA };
`, sandbox);
const E = box.exports;

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

const SIZES = [2, 3, 4, 5, 6];
const runs = [];

for (const seats of SIZES) {
  const T = {
    seats, games: 0, samples: 0,
    slotsOpen: 0, slotsFilled: 0,
    plotsOwned: 0, plotsTotal: 0, districtsLive: 0, districtsTotal: 0,
    cashSeat: 0, cashTable: 0, peakSeat: 0, peakTable: 0,
    priceByYear: { 1: 0, 2: 0, 3: 0 }, priceN: { 1: 0, 2: 0, 3: 0 },
    potTotal: 0, potMax: 0,
    deckLeft: 0, companies: 0, discsUsed: 0, peakDiscs: 0, loans: 0,
    prod: 0, recycled: 0, earned: 0,
    byLevel: {}, byInd: {}, discOver: 0, discPeak: 0, discSamples: 0,
    endCash: 0, endPlayers: 0, winnerEP: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    econ.prod = econ.recycled = econ.earned = 0;
    econ.byLevel = {}; econ.byInd = {};
    const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }

    const sample = () => {
      T.samples++;
      /* demand: a slot counts as OPEN only if the quarter has unlocked its row */
      const tiles = st.demand && st.demand.tiles ? Object.values(st.demand.tiles) : [];
      for (const t of tiles) {
        t.rows.forEach((ind, r) => {
          if (r >= 2 && st.quarter <= 4) return;      // rows 3-4 open from Q5
          for (let l = 0; l < 4; l++) { T.slotsOpen++; if (t.filled[r][l]) T.slotsFilled++; }
        });
      }
      /* land */
      const allPlots = Object.keys(st.board.cellOf).length;
      T.plotsTotal += allPlots;
      T.plotsOwned += Object.keys(st.board.owner).length;
      const live = new Set();
      for (const [plot, bizId] of Object.entries(st.board.occupiedBy)) {
        if (bizId === undefined) continue;
        const c = st.board.cellOf[plot];
        live.add(`${c.r},${c.c}`);
      }
      T.districtsLive += live.size;
      T.districtsTotal += new Set(Object.values(st.board.cellOf).map((c) => `${c.r},${c.c}`)).size;
      /* money */
      let table = 0;
      for (const p of st.players) {
        T.cashSeat += p.cash;
        table += p.cash;
        if (p.cash > T.peakSeat) T.peakSeat = p.cash;
        const used = E.DISCS_PER_PLAYER - E.discsFree(st, p);
        T.discsUsed += used;
        T.discSamples++;
        if (used > E.DISCS_PER_PLAYER) T.discOver++;
        if (used > T.peakDiscs) T.peakDiscs = used;
      }
      T.cashTable += table;
      if (table > T.peakTable) T.peakTable = table;
      /* prices and pots */
      const yr = Math.min(3, Math.max(1, Math.ceil(st.quarter / 4)));
      for (const ind of E.INDUSTRIES) { T.priceByYear[yr] += E.price(st.pm, ind); T.priceN[yr]++; }
      if (st.pots) {
        for (const ind of E.INDUSTRIES) {
          T.potTotal += st.pots[ind] || 0;
          if ((st.pots[ind] || 0) > T.potMax) T.potMax = st.pots[ind];
        }
      }
    };

    E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
      if (/^▶ Year \d+, Quarter \d+/.test(String(msg))) sample();
    });
    if (st.phase !== "gameover") continue;
    sample();
    T.games++;
    T.prod += econ.prod; T.recycled += econ.recycled; T.earned += econ.earned;
    for (const [k, v] of Object.entries(econ.byLevel)) {
      const d = T.byLevel[k] || (T.byLevel[k] = { prod: 0, left: 0 });
      d.prod += v.prod; d.left += v.left;
    }
    for (const [k, v] of Object.entries(econ.byInd)) {
      const d = T.byInd[k] || (T.byInd[k] = { prod: 0, left: 0 });
      d.prod += v.prod; d.left += v.left;
    }

    for (const ind of E.INDUSTRIES) T.deckLeft += (st.decks[ind] || []).length;
    for (const p of st.players) {
      T.endPlayers++;
      T.endCash += p.cash;
      T.companies += E.activeBiz(p).length + E.megacorpHQs(p).length;
      T.loans += p.discsInBank;
    }
    T.winnerEP += E.epTotal([...st.players].sort(E.finalRank)[0]);
  }
  runs.push(T);
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - how big is the economy at each table size?");
console.log(`${SEEDS} games per table size, personas on, rules as they stand.`);
console.log("Everything is sampled at every quarter boundary, not just at the end.\n");

const W = 14;
const head = () => console.log(pad("", 40) + runs.map((T) => rp(`${T.seats} players`, W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 40) + runs.map((T) => rp(fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 40) + runs.map((T) => rp(`${(100 * fn(T)).toFixed(0)}%`, W)).join(""));
const cash = (name, fn) =>
  console.log(pad(name, 40) + runs.map((T) => rp(`$${Math.round(fn(T))}`, W)).join(""));

console.log("THE POND: demand and what could not be sold");
head();
console.log("─".repeat(40 + W * runs.length));
pct("  open demand slots filled", (T) => T.slotsFilled / Math.max(1, T.slotsOpen));
pct("  production recycled at $1", (T) => T.recycled / Math.max(1, T.prod));
row("  units produced per seat per game", (T) => T.prod / Math.max(1, T.endPlayers), 1);
row("  units actually sold per seat", (T) => (T.prod - T.recycled) / Math.max(1, T.endPlayers), 1);
cash("  trade income per seat per game", (T) => T.earned / Math.max(1, T.endPlayers));

console.log("\nTHE GROUND");
head();
pct("  plots owned", (T) => T.plotsOwned / Math.max(1, T.plotsTotal));
pct("  districts with a building in them", (T) => T.districtsLive / Math.max(1, T.districtsTotal));
row("  companies standing per seat", (T) => T.companies / Math.max(1, T.endPlayers), 2);

console.log("\nTHE MONEY");
head();
cash("  cash a seat holds (average)", (T) => T.cashSeat / Math.max(1, T.samples * T.seats));
cash("  cash on the table (average)", (T) => T.cashTable / Math.max(1, T.samples));
cash("  most one seat ever held", (T) => T.peakSeat);
cash("  most on the table at once", (T) => T.peakTable);
cash("  cash a seat ends with", (T) => T.endCash / Math.max(1, T.endPlayers));

console.log("\nTHE MARKET");
head();
for (const y of [1, 2, 3]) {
  cash(`  mean industry price, Year ${y}`, (T) => T.priceByYear[y] / Math.max(1, T.priceN[y]));
}
cash("  money sitting in the pots", (T) => T.potTotal / Math.max(1, T.samples * 6));
cash("  largest single pot seen", (T) => T.potMax);

console.log("\nTHE COMPONENTS");
head();
row("  discs in use per seat (of 12)", (T) => T.discsUsed / Math.max(1, T.samples * T.seats), 2);
row("  most discs one seat ever used", (T) => T.peakDiscs, 0);
pct("  samples over the 12-disc limit", (T) => T.discOver / Math.max(1, T.discSamples));
row("  Blueprint cards left of 60", (T) => T.deckLeft / Math.max(1, T.games), 1);
row("  unpaid loan discs per seat", (T) => T.loans / Math.max(1, T.endPlayers), 2);
row("  winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);

console.log("\n\nWHERE THE WASTE IS: recycled share by company level");
head();
console.log("─".repeat(40 + W * runs.length));
for (const lv of [1, 2, 3, 4]) {
  const any = runs.some((T) => T.byLevel[lv] && T.byLevel[lv].prod > 0);
  if (!any) continue;
  console.log(pad(`  level ${lv}`, 40) + runs.map((T) => {
    const d = T.byLevel[lv];
    return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
  }).join(""));
}
console.log(pad("  units produced at each level (4p)", 40));
{
  const T = runs.find((r) => r.seats === 4) || runs[0];
  for (const lv of [1, 2, 3, 4]) {
    const d = T.byLevel[lv];
    if (d && d.prod) console.log(pad(`    level ${lv}`, 40) + rp(`${(100 * d.prod / T.prod).toFixed(0)}% of output`, W));
  }
}

console.log("\nRecycled share by industry");
head();
for (const ind of E.INDUSTRIES) {
  console.log(pad(`  ${ind}`, 40) + runs.map((T) => {
    const d = T.byInd[ind];
    return rp(d && d.prod ? `${(100 * d.left / d.prod).toFixed(0)}%` : "-", W);
  }).join(""));
}

/* ------------------------------------------------------------ the verdict */
console.log("\n\nWHICH RESOURCE BINDS FIRST, PER TABLE SIZE");
console.log("(each line names the tightest thing at that count, and by how much room is left)\n");
for (const T of runs) {
  const demandUse = T.slotsFilled / Math.max(1, T.slotsOpen);
  const landUse = T.plotsOwned / Math.max(1, T.plotsTotal);
  const discUse = (T.discsUsed / Math.max(1, T.samples * T.seats)) / 12;
  const deckUse = 1 - (T.deckLeft / Math.max(1, T.games)) / 60;
  const waste = T.recycled / Math.max(1, T.prod);
  const items = [
    ["demand", demandUse], ["land", landUse], ["discs", discUse], ["Blueprint decks", deckUse],
  ].sort((a, b) => b[1] - a[1]);
  console.log(`  ${T.seats} players`);
  for (const [k, v] of items) {
    const bar = "█".repeat(Math.round(v * 24)).padEnd(24, "·");
    console.log(`    ${pad(k, 17)} ${bar} ${(100 * v).toFixed(0)}% used`);
  }
  console.log(`    ${pad("production wasted", 17)} ${(100 * waste).toFixed(0)}% recycled at $1\n`);
}
console.log("");
