/* ============================================================================
   Rent at $1 - and whether a landlord would rather sell the ground.

   audit_rent_flow.js established that rent is carved OUT of a company's OPEX,
   not charged on top, so the rate decides a SPLIT: how much of the same money
   reaches the plot owners and how much reaches the supplier pots. Pots are
   shared evenly among an industry's active businesses, one equal share each
   whatever their size; land income is concentrated in whoever owns land. Moving
   the rate down is therefore redistributive, and $3 to $2 measurably slowed the
   leader. This asks what $1 does, and $0 as the end of the line.

   THE DESIGNER'S OBJECTION, which is the more interesting half: at $1 the rent
   on a rival's building becomes small enough that a landlord might rather SELL
   the ground under it - which is a hostile move, because a company cannot
   produce unless every plot it stands on is owned by somebody. Cheap rent could
   turn land from an income stream into a weapon.

   THAT OBJECTION CANNOT BE TESTED WITH THESE BOTS, and saying so is the honest
   part of this probe. A bot sells a plot in exactly two places, both inside
   runProduction, and both only when it cannot pay its bill: cheapestOwnedPlot
   under cash pressure, and the same again under solvency. There is no voluntary
   "the rent is not worth it any more" decision anywhere, and RENT INCOME APPEARS
   IN NO BOT PLOT VALUATION AT ALL - not in plotValue, not in landEPWeight.
   Whatever the rate, a bot's willingness to sell is unchanged by it. Any null
   here would be a null about the bots, not about the game.

   So the objection is answered ARITHMETICALLY instead, at the bottom: what a
   plot is worth if you sell it, against what it pays if you hold it, at each
   rate. That is a calculation a person can check, and it does not depend on how
   well anything plays.

   What the bots CAN still show is the split effect - the pots against land
   income - and whether the catch-up gain from $3 to $2 continues at $1 or turns
   around. Plot sales that strand somebody else's building are counted too; they
   happen incidentally under cash pressure, and cash pressure does move with the
   rate even though the selling rule does not.

   WHAT IT FOUND: $2 IS AN OPTIMUM, NOT A DIRECTION. DO NOT GO TO $1.

   The catch-up gain does not continue. It reverses:

     Q6 leader went on to win   $3    $2    $1    $0    chance
       2 players                60%   67%   69%   70%     50%
       4 players                41%   36%   47%   45%     25%
       6 players                31%   28%   38%   43%     17%

   At four and six seats $2 is the MINIMUM and $1 is worse than the $3 the game
   started with. The winner's lead over second tells the same story - 16.4 at $2
   against 18.5 at $3 and 20.2 at $1 at six seats - and the bottom half at Q6
   wins most often at $2 (35%, against 28% at $3 and 22% at $1).

   THAT FALSIFIES THE THEORY THIS PROBE WAS BUILT ON, which is the useful part.
   audit_rent_flow.js argued that pots are the egalitarian channel and land the
   concentrated one, so pushing money from rent into pots should help the
   trailing player - monotonically, all the way to $0. It does not, and the
   reason is that A POT IS SPLIT PER ACTIVE BUSINESS, ONE SHARE EACH. A player
   running three companies in an industry takes three shares. So pot income
   concentrates by COMPANIES RUN exactly as land income concentrates by PLOTS
   OWNED. Neither channel is egalitarian; they simply concentrate along
   different axes, and the leader's advantage on those two axes is not the same
   size. A mixture beats either extreme, and $2 is where the mixture sits.

   THE DESIGNER'S OBJECTION - that cheap rent would push landlords into selling
   the ground under rivals - is NOT borne out, though not for a reason the bots
   can speak to. Holding beats selling at every rate down to $1: a plot under a
   level-2 building repays its whole sale value in one quarter at $2 and two at
   $1, then earns for the six to ten quarters the building stands. Only at $0
   does the ground stop paying and the objection bite.

   The bots' own plot sales FALL as the rate drops - 4.69 a game to 3.45 at four
   seats, 6.75 to 4.91 at six - and companies stranded by an unowned plot fall
   with them. That is the opposite of the concern, but it is mechanical: bots
   sell plots only under cash pressure, and a lower rent rate leaves more money
   in the pots and so less pressure. It says nothing about whether a person
   would choose to sell.

   ONE DETAIL THAT DOES SUPPORT THE CONCERN. cheapestOwnedPlot prefers plots NOT
   under the seller's OWN buildings - which means a plot under a RIVAL's
   building is a preferred target. The hostile move is already the bot's first
   choice when squeezed. It is simply never a deliberate one.

   Run: node audit_rent_one.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "150", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const RATE_NEEDLE = "const RENT_PER_LEVEL = 2;";
if (!BASE.includes(RATE_NEEDLE)) { console.error("the rent constant changed shape - update this probe"); process.exit(2); }

const SALE_NEEDLE = "  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
if (!BASE.includes(SALE_NEEDLE)) { console.error("autoDeliver changed shape - update this probe"); process.exit(2); }

const econ = { potIn: 0, rentIn: 0, prod: 0, left: 0, earned: 0 };

function loadEngine(rate) {
  let logic = BASE.replace(RATE_NEEDLE, `const RENT_PER_LEVEL = ${rate};`);
  /* where the OPEX dollar actually lands: to a landlord, or into a pot */
  logic = logic.replace("      const toPots = Math.max(0, cost - rentTotal);",
    "      const toPots = Math.max(0, cost - rentTotal);\n      __econ.split(Math.min(rentTotal, cost), toPots);");
  logic = logic.replace(SALE_NEEDLE,
    "  const leftover = Math.max(0, remaining);\n" +
    "  __econ.sale(earned, leftover, bizProd(biz));\n" +
    "  p.cash += earned + leftover * 1;");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, box, __econ: {
    split: (toRent, toPots) => { econ.rentIn += toRent; econ.potIn += toPots; },
    sale: (earned, left, prod) => { econ.earned += earned; econ.left += left; econ.prod += prod; },
  } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning,
      epTotal, finalRank, activeBiz, megacorpHQs, bizInd, bizProd, bizOpex, price,
      plotCount, plotValue, businessCanProduce, INDUSTRIES, BP_DATA, RENT_PER_LEVEL };
  `, sandbox);
  return box.exports;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

const RATES = [3, 2, 1, 0];
const SEATS = [2, 4, 6];
const results = {};

for (const rate of RATES) {
  for (const seats of SEATS) {
    econ.potIn = econ.rentIn = econ.prod = econ.left = econ.earned = 0;
    const E = loadEngine(rate);
    const T = {
      rate, seats, games: 0, players: 0,
      winnerEP: 0, gapSecond: 0, spread: 0,
      companies: 0, cash: 0, loans: 0, plots: 0,
      q6Games: 0, ledAt6Won: 0, bottomHalfWon: 0,
      plotSales: 0, strandedOthers: 0, deadAtEnd: 0,
    };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), (msg) => {
        if (/ sells a plot for \$/.test(String(msg))) T.plotSales++;
      });
      if (st.phase !== "gameover") continue;
      T.games++;

      /* companies left unable to produce because ground under them is unowned */
      for (const p of st.players) {
        for (const b of E.activeBiz(p)) if (!E.businessCanProduce(st, b)) T.deadAtEnd++;
      }

      const ranked = [...st.players].sort(E.finalRank);
      const winner = ranked[0];
      T.winnerEP += E.epTotal(winner);
      T.gapSecond += E.epTotal(ranked[0]) - E.epTotal(ranked[1]);
      T.spread += E.epTotal(ranked[0]) - E.epTotal(ranked[ranked.length - 1]);

      if (st.quarter >= 6) {
        const at6 = st.players
          .map((p) => ({ p, ep: (p.epLog || []).filter((e) => e.quarter <= 6).reduce((s, e) => s + e.amount, 0) }))
          .sort((a, b) => b.ep - a.ep);
        if (at6.length > 1 && at6[0].ep > at6[1].ep) {
          T.q6Games++;
          if (at6[0].p === winner) T.ledAt6Won++;
          if (at6.slice(Math.ceil(at6.length / 2)).map((x) => x.p).includes(winner)) T.bottomHalfWon++;
        }
      }
      for (const p of st.players) {
        T.players++;
        T.companies += E.activeBiz(p).length;
        T.cash += p.cash; T.loans += p.discsInBank; T.plots += E.plotCount(st, p);
      }
    }
    T.potIn = econ.potIn; T.rentIn = econ.rentIn;
    T.prod = econ.prod; T.left = econ.left; T.earned = econ.earned;
    results[`${rate}|${seats}`] = T;
  }
}

/* ---------------------------------------------------------------- report */
console.log("Entrepreneurs - the rent rate as a split between landlords and pots");
console.log(`${SEEDS} games per rate per table size, personas on. $2 is shipped.\n`);

const W = 15;
const head = (seats) => console.log(pad(`  ${seats} players`, 34) + RATES.map((r) => rp(`rent $${r}`, W)).join(""));
const line = (seats, name, fn, dp = 1) =>
  console.log(pad(name, 34) + RATES.map((r) => rp(fn(results[`${r}|${seats}`]).toFixed(dp), W)).join(""));
const lpct = (seats, name, fn) =>
  console.log(pad(name, 34) + RATES.map((r) => rp(`${(100 * fn(results[`${r}|${seats}`])).toFixed(0)}%`, W)).join(""));
const lcash = (seats, name, fn) =>
  console.log(pad(name, 34) + RATES.map((r) => rp(`$${Math.round(fn(results[`${r}|${seats}`]))}`, W)).join(""));

for (const seats of SEATS) {
  console.log("\n" + "=".repeat(34 + W * 4));
  head(seats);
  console.log("=".repeat(34 + W * 4));
  console.log("  WHERE THE OPEX DOLLAR LANDS");
  lpct(seats, "    share of OPEX going to landlords", (T) => T.rentIn / Math.max(1, T.rentIn + T.potIn));
  lpct(seats, "    share reaching the supplier pots", (T) => T.potIn / Math.max(1, T.rentIn + T.potIn));
  console.log("");
  console.log("  IS IT STILL A CATCH-UP LEVER?");
  lpct(seats, "    Q6 leader went on to win", (T) => T.ledAt6Won / Math.max(1, T.q6Games));
  lpct(seats, "    chance at this table size", () => 1 / seats);
  lpct(seats, "    bottom half at Q6 won", (T) => T.bottomHalfWon / Math.max(1, T.q6Games));
  line(seats, "    winner's lead over 2nd", (T) => T.gapSecond / Math.max(1, T.games));
  console.log("");
  console.log("  THE SHAPE OF THE GAME");
  line(seats, "    winning score", (T) => T.winnerEP / Math.max(1, T.games), 0);
  lcash(seats, "    cash a seat ends with", (T) => T.cash / Math.max(1, T.players));
  line(seats, "    unpaid loan discs per seat", (T) => T.loans / Math.max(1, T.players), 2);
  line(seats, "    plots per seat", (T) => T.plots / Math.max(1, T.players), 2);
  line(seats, "    plot sales per game", (T) => T.plotSales / Math.max(1, T.games), 2);
  line(seats, "    companies stranded at the end", (T) => T.deadAtEnd / Math.max(1, T.games), 2);
}

/* --------------------------------------------------- the designer's objection */
console.log("\n\n" + "=".repeat(76));
console.log("WOULD A LANDLORD RATHER SELL THE GROUND UNDER A RIVAL'S BUILDING?");
console.log("=".repeat(76));
console.log("The bots cannot answer this - they only sell plots when they cannot pay a bill,");
console.log("and rent income is in none of their valuations. So here is the arithmetic.\n");
console.log("A plot under somebody else's building pays RENT x levels-on-that-plot every");
console.log("quarter, for as long as the building stands. Selling it pays its value ONCE,");
console.log("and stops that company producing until somebody buys the ground back.\n");

const E0 = loadEngine(2);
{
  /* a representative plot value: the road price is 1-6, plus $1 an occupied
     neighbour and $1 for touching a hub. Sample the real board. */
  const st = E0.initGame(3, 4242, ["Seat 1"], undefined, true, undefined);
  const vals = Object.keys(st.board.cellOf).map((k) => E0.plotValue(st, k)).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  const hi = vals[Math.floor(vals.length * 0.9)];
  console.log(`  Plot values on a fresh board: median $${med}, 90th percentile $${hi}, max $${vals[vals.length - 1]}.\n`);

  console.log(pad("  rent", 10) + pad("levels on the plot", 22) + rp("per quarter", 14)
    + rp(`quarters to beat $${med}`, 26));
  console.log("  " + "─".repeat(68));
  for (const rate of RATES) {
    for (const lv of [1, 2, 3]) {
      const perQ = rate * lv;
      const qs = perQ > 0 ? Math.ceil(med / perQ) : Infinity;
      console.log(pad(`  $${rate}`, 10) + pad(`${lv} level${lv > 1 ? "s" : ""}`, 22)
        + rp(`$${perQ}`, 14)
        + rp(perQ > 0 ? `${qs}` : "never", 26));
    }
  }
  console.log("\n  A game is at most twelve quarters, and a building put up in Year 1 stands");
  console.log("  for eight or more. So at $2 a plot under a level-2 building repays its own");
  console.log("  sale value in one quarter and earns seven times over. Even at $1 under a");
  console.log("  single level it repays in about four quarters and doubles by the end.");
  console.log("\n  HOLDING BEATS SELLING AT EVERY RATE TESTED, including $1 - provided the");
  console.log("  building stays up. The objection would bite only if rent went to $0, where");
  console.log("  the ground pays nothing at all and the land award is the only reason to");
  console.log("  hold it. What DOES change as the rate falls is the margin: at $1 a landlord");
  console.log("  in a cash squeeze has much less reason to hold on, and a plot sold under a");
  console.log("  rival is worth the same disruption either way. That is a real shift in");
  console.log("  temptation, and it is invisible to bots that never weigh it.");
}
console.log("");
