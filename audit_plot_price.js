/* ============================================================================
   What should a plot cost?

   THE PROPOSAL. Price of a plot = its position tag + $2 per adjacent structure,
   counting orthogonal neighbours only, with diagonals not counting.

   WHAT THE ENGINE DOES TODAY. plotValue already has exactly that shape:

     base (the position tag, 1-6 off the price lattice)
       + one dollar per occupied neighbour
       + one dollar if the plot carries a Logistic Hub

   So the proposal is TWO changes wearing one coat, and they pull in opposite
   directions:

     the rate       $1 per neighbour  ->  $2 per neighbour          (prices up)
     the adjacency  board.graph       ->  board.orth                (prices down)

   board.graph is deliberately loose - it counts diagonals inside a district, so
   a plot can have up to seven neighbours. board.orth already exists in the
   engine, built for hubs placed on plots, and holds only the at-most-four that
   share an edge. Dropping diagonals removes neighbours; doubling the rate
   multiplies whatever is left. Whether the plot ends up dearer or cheaper
   depends on the shape of what is standing next to it, which is not something
   to reason about in your head.

   Hence four arms rather than two. B and C are not proposals, they are how you
   read D: if D looks like A, that is two changes cancelling, not a rule with no
   effect, and the arms show which half did what.

     A  as it ships       graph, $1 per neighbour
     B  diagonals cut     orth,  $1 per neighbour
     C  rate doubled      graph, $2 per neighbour
     D  the proposal      orth,  $2 per neighbour

   THE BOTS COME ALONG FOR FREE. Every bot valuation of a plot goes through
   plotValue - the acquisition scorer, the footprint costing, the buy loop and
   the affordability filter all call it. So unlike audit_land_awards, no arm
   here needs a bots-aware twin: change the price and the bots are already
   paying it. Worth stating, because the opposite mistake is easy to make and
   measures a new rule being played by people who have not heard of it.

   WHAT ELSE MOVES, AND IS EASY TO FORGET. plotValue is not only a purchase
   price. It is also what a plot SELLS for, and half of it is what a distressed
   player raises in a solvency sale. Making land dearer makes it a better
   emergency asset in the same stroke, so this measures both ends.

   WHAT IT FOUND - 300 games per arm per table, seeds from 1, all five counts.

   The proposal (D) against what ships (A), on price paid per plot: +0% at two
   seats, +3% at three and four, +4% at five and six. Plots bought moved 0-1%,
   plots held 1%, winning score 0-2%, and Q6-leader-wins not at all. Land spend
   tracked price exactly, which is the tell that nobody changed their mind about
   anything - the same plots were bought at a slightly higher price.

   The arms say why it is small: dropping diagonals takes about 5% off and
   doubling the rate puts about 12% on, so most of the proposal is one half
   cancelling the other.

   AND THE REASON UNDERNEATH, which is the useful part. At the moment of
   purchase a plot has 0.33 occupied neighbours at two seats rising to 0.48 at
   six, and 0.17 to 0.32 counting orthogonally. So the adjacency term is worth
   about 35 cents on a $3.30 plot: 84% of what anybody pays is the position tag.
   Doubling a rate applied to a term that is near zero cannot move an economy.

   That is a fact about WHEN land is bought, not about the formula. The board
   has 64 plots and a four-player game ends with 45% owned and 36% built on.
   Land is not scarce, so it is bought empty and nobody pays a premium for
   position: every game at every count ends with a plot going begging at $1.1
   to $1.8 that 100% of the table can afford.

   So the coefficient is not the lever. Anything that makes a SPECIFIC plot
   necessary - a smaller board, more players per plot, a reason to want that
   corner rather than any corner - would make the existing $1 bite harder than
   $2 does on a board where you can always build somewhere else.

   THEN THE GOAL TURNED OUT TO BE A DIFFERENT ONE, and it changes the answer.
   Orthogonal adjacency is not being chosen to move the economy, it is being
   chosen because a person has to count it at a table, with the demand block
   and the district seams in the way of anything diagonal. On that footing it
   wins on its own, before any number is measured: the rulebook already teaches
   that adjacent means sharing an edge and that plots meeting at a corner are
   NOT adjacent (it is the rule for building and for upgrading), and then has
   to interrupt itself under plot value to say corners count after all. Pricing
   is the only rule in this game that counts a corner. Going orthogonal deletes
   a special case rather than adding one.

   So the adjacency is fixed and the rate is the free variable, which is what
   arms E through H sweep. A quarter of the board (25.9% of plots, over 60
   boards) has no orthogonal neighbour at all and can never carry a premium, so
   a higher rate sharpens a two-tier board rather than lifting it evenly.

   THE RATE, 300 games per arm per table. The question is not what a premium
   costs, it is whether anybody pays it - land is abundant, so a player who
   dislikes the price buys an empty plot instead. Share of purchases made next
   to a structure, and what that neighbour cost:

                    2p            4p            6p
     ships      18.0%  +$1.52   22.4%  +$1.85   27.8%  +$1.90
     orth x$1   17.1%  +$1.65   21.5%  +$1.86   27.0%  +$1.98
     orth x$3   14.9%  +$3.83   20.1%  +$4.15   24.4%  +$4.36
     orth x$4   14.7%  +$4.94   19.1%  +$5.28   23.3%  +$5.44
     orth x$8   13.8%  +$9.23   17.4%  +$9.81   20.8% +$10.07

   Going from $1 to $4 deters about one adjacent purchase in eight. That is
   price sensitivity, not avoidance: the premium is paid. At $3 a contested
   plot costs about double an empty one, at $4 nearly triple, against a flat
   ~$2.80 for empty ground at every rate.

   NOTHING ELSE MOVES, from $1 through $8, at every table size: winning score,
   margin, companies built, cash and Q6-leader-wins are all flat. Land spend
   rises 9% at $3 and 14% at $4, on a game that ends with roughly $500 in hand,
   which is why the economy does not notice. One cell looked soft - $4 at six
   seats, winning score 106.2 against 108.6 - and a re-run on seed block 50000
   did not reproduce it (108.4 against 109.9, with the baseline moving as much
   as the arm). It was noise.

   $3 IS THE RECOMMENDATION over $4: it roughly doubles the premium, which was
   the goal, at the smallest cost in deterrence, and it leaves headroom. Going
   up after table play is easy; discovering an overshoot is not.

   TWO THINGS THE RATE DOES NOT DO. Land's share of the winner's score stays at
   18-25% whatever the rate, so this makes land a bigger CASH decision and not
   a bigger scoring one. And because plotValue is also the sale price, every
   rate rise buffs land as collateral as much as it taxes buying it - revenue
   per sale went $7 to $10 at four seats.

   ONE REAL EFFECT, worth not missing. plotValue is also the SALE price, and
   half of it is a solvency raise, so any rate rise is a buff to land as
   collateral as much as a tax on buying it. Revenue per sale rose in both
   doubled arms at every table size.

   Run: node audit_plot_price.js [games] [seats...]
        node audit_plot_price.js 200 4
        node audit_plot_price.js 150 2 3 4 5 6
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "120", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
const TABLES = SEATS.length ? SEATS : [2, 3, 4, 5, 6];

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

/* Every fragment this probe rewrites, asserted before a single game is played.
   A .replace() that matches nothing does not throw - it hands back the source
   unchanged, the arm silently becomes a copy of A, and the table reads as "no
   effect". That is the failure this file must not have. */
const NEEDLES = {
  priceBody: `  const occupiedNeighbors = [...board.graph[plotKeyStr]].filter((n) => n in board.occupiedBy).length;
  const lhBonus = plotHasLH(board, plotKeyStr) ? 1 : 0;
  return base + occupiedNeighbors + lhBonus;`,
  buy: `  const cost = plotValue(state, plotKeyStr);
  if (p.cash < cost) return false;
  p.cash -= cost;`,
  sell: `  delete state.board.owner[plotKeyStr];
  p.cash += val;`,
  /* Where a year ends, for the standings snapshot. */
  quarterEnd: "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);",
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) {
    console.error(`the engine changed shape around ${k} - update this probe`);
    process.exit(2);
  }
}

/* board.orth is an array and board.graph is a Set; [...x] takes either, so the
   arms differ by a property name and a multiplier and nothing else. */
const ARMS = {
  A: { adj: "graph", rate: 1, label: "ships      graph x$1" },
  B: { adj: "orth", rate: 1, label: "orth only  orth  x$1" },
  C: { adj: "graph", rate: 2, label: "rate only  graph x$2" },
  D: { adj: "orth", rate: 2, label: "orth       orth  x$2" },
  /* THE RATE SWEEP. Orthogonal adjacency is now the fixed choice - it is what
     a person can actually count at a table, with the demand block and the
     district seams in the way of anything diagonal - so the only free variable
     left is the rate, and these ask how far it has to go before location is
     worth anything. */
  E: { adj: "orth", rate: 3, label: "sweep      orth  x$3" },
  F: { adj: "orth", rate: 4, label: "sweep      orth  x$4" },
  G: { adj: "orth", rate: 6, label: "sweep      orth  x$6" },
  H: { adj: "orth", rate: 8, label: "sweep      orth  x$8" },
};

function engineFor(arm) {
  const { adj, rate } = ARMS[arm];
  let logic = base;

  logic = logic.replace(NEEDLES.priceBody,
    `  const occupiedNeighbors = [...(board.${adj}[plotKeyStr] || [])].filter((n) => n in board.occupiedBy).length;
  const lhBonus = plotHasLH(board, plotKeyStr) ? 1 : 0;
  return base + ${rate} * occupiedNeighbors + lhBonus;`);

  /* Record what the price was MADE OF, not just what it came to. If the
     adjacency term is small at the moment people actually buy, then no rate
     applied to it can move much, and that is a fact about when land gets
     bought rather than about the rule. Both neighbour counts are taken on
     every arm, so the cost of dropping diagonals is visible even in arm A. */
  logic = logic.replace(NEEDLES.buy,
    NEEDLES.buy + `
  box.buy(cost, state.quarter, (() => {
    const cell = state.board.cellOf[plotKeyStr];
    const tag = (cell && state.board.priceLattice
      && state.board.priceLattice[latticeKeyForCell(cell)] !== undefined)
      ? state.board.priceLattice[latticeKeyForCell(cell)] : 1;
    const occ = (list) => [...(list || [])].filter((n) => n in state.board.occupiedBy).length;
    return { tag, gnb: occ(state.board.graph[plotKeyStr]), onb: occ(state.board.orth[plotKeyStr]) };
  })());`);

  logic = logic.replace(NEEDLES.sell,
    NEEDLES.sell + "\n  box.sell(val, solvency);");

  logic = logic.replace(NEEDLES.quarterEnd,
    NEEDLES.quarterEnd + "\n  box.snap(state);");

  const box = {
    buys: [], sells: [], snaps: [],
    buy(cost, q, parts) { box.buys.push({ cost, q, ...parts }); },
    sell(val, solvency) { box.sells.push({ val, solvency: !!solvency }); },
    snap(state) { box.snaps.push({ q: state.quarter, ep: state.players.map((p) => box.ep(p)) }); },
  };
  const sandbox = { console, Math, Set, Map, Object, Array, JSON, box, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.ep = epTotal;
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      epTotal, activeBiz, plotCount, districtCount, plotValue };
  `, sandbox);
  return { E: box.exports, box };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const med = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const pct = (n, d) => (d ? (100 * n) / d : 0);
const LAND_LABELS = ["The Real-Estate Mogul", "The Omnipresent"];
const landEP = (p) => (p.epLog || [])
  .filter((e) => LAND_LABELS.includes(e.label))
  .reduce((s, e) => s + e.amount, 0);

function run(arm, seats, n) {
  const { E, box } = engineFor(arm);
  const o = {
    games: 0,
    buysPerGame: [], priceEach: [], priceMax: [], spendPerGame: [],
    earlyPrice: [], latePrice: [],
    tagPaid: [], gnb: [], onb: [], adjShare: [],
    /* THE AVOIDANCE QUESTION, and the one that decides this. Land is abundant,
       so a player who does not like the premium does not pay it - they buy an
       empty plot somewhere else. If raising the rate does not raise the share
       of purchases that have a neighbour at all, then the rule is not being
       paid, it is being dodged, and a higher number on the card changes
       nothing except how often people walk away from a corner. */
    boughtAdjacent: 0, boughtTotal: 0, priceWhenAdjacent: [], priceWhenEmpty: [],
    sellsPerGame: [], sellRevenue: [], solvencySells: [],
    plotsWinner: [], plotsMean: [], plotSpread: [],
    landEPWinner: [], landShare: [],
    winEP: [], margin: [], cashEnd: [], bizEnd: [],
    cheapestLeft: [], affordCheapest: [],
    q6LeaderWon: 0, snapped: 0,
  };
  for (let seed = SEED0; o.games < n && seed < SEED0 + n * 5; seed++) {
    let st;
    box.buys.length = 0; box.sells.length = 0; box.snaps.length = 0;
    try {
      st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    } catch (e) { continue; }
    if (!st || st.phase !== "gameover") continue;
    o.games++;

    /* --- the land market itself ---------------------------------------- */
    const costs = box.buys.map((b) => b.cost);
    o.buysPerGame.push(box.buys.length);
    costs.forEach((c) => o.priceEach.push(c));
    o.priceMax.push(costs.length ? Math.max(...costs) : 0);
    o.spendPerGame.push(costs.reduce((a, b) => a + b, 0));
    /* Half the game each side, which is the question "does it get dear late?" */
    box.buys.forEach((b) => {
      o.tagPaid.push(b.tag);
      o.gnb.push(b.gnb);
      o.onb.push(b.onb);
      o.adjShare.push(b.cost > 0 ? pct(b.cost - b.tag, b.cost) : 0);
      o.boughtTotal++;
      if (b.onb > 0) { o.boughtAdjacent++; o.priceWhenAdjacent.push(b.cost); }
      else o.priceWhenEmpty.push(b.cost);
    });
    const early = box.buys.filter((b) => b.q <= 6).map((b) => b.cost);
    const late = box.buys.filter((b) => b.q > 6).map((b) => b.cost);
    if (early.length) o.earlyPrice.push(mean(early));
    if (late.length) o.latePrice.push(mean(late));

    o.sellsPerGame.push(box.sells.length);
    o.sellRevenue.push(box.sells.reduce((a, b) => a + b.val, 0));
    o.solvencySells.push(box.sells.filter((s) => s.solvency).length);

    /* --- who ended up holding ground ------------------------------------ */
    const eps = st.players.map((p) => E.epTotal(p));
    const order = st.players.map((p, i) => [i, eps[i]]).sort((a, b) => b[1] - a[1]);
    const winner = st.players[order[0][0]];
    o.winEP.push(order[0][1]);
    o.margin.push(order[0][1] - order[1][1]);
    o.cashEnd.push(mean(st.players.map((p) => p.cash)));
    o.bizEnd.push(mean(st.players.map((p) => E.activeBiz(p).length)));

    const plots = st.players.map((p) => E.plotCount(st, p));
    o.plotsWinner.push(E.plotCount(st, winner));
    o.plotsMean.push(mean(plots));
    o.plotSpread.push(Math.max(...plots) - mean(plots));

    const lw = landEP(winner);
    o.landEPWinner.push(lw);
    o.landShare.push(order[0][1] > 0 ? pct(lw, order[0][1]) : 0);

    /* --- is anyone priced out at the end? ------------------------------- */
    const unowned = Object.keys(st.board.graph).filter((k) => !(k in st.board.owner));
    if (unowned.length) {
      const prices = unowned.map((k) => E.plotValue(st, k));
      const cheapest = Math.min(...prices);
      o.cheapestLeft.push(cheapest);
      o.affordCheapest.push(pct(st.players.filter((p) => p.cash >= cheapest).length, st.players.length));
    }

    /* --- one tension reading, on the same games ------------------------- */
    const q6 = box.snaps.filter((s) => s.q <= 7).pop();
    if (q6) {
      o.snapped++;
      const top = Math.max(...q6.ep);
      const leaders = q6.ep.map((e, i) => [e, i]).filter(([e]) => e === top);
      if (leaders.length === 1 && st.players[leaders[0][1]] === winner) o.q6LeaderWon++;
    }
  }
  return o;
}

/* -------------------------------------------------------------------- report */
console.log(`\n${GAMES} games per arm per table, seeds from ${SEED0}\n`);

const summary = {};
for (const seats of TABLES) {
  console.log(`${"=".repeat(78)}\n${seats} PLAYERS\n`);
  console.log("arm                    buys  $each  $med  $max  spend   early  late"
    + "   plots  landEP%");
  const rows = {};
  for (const arm of Object.keys(ARMS)) {
    const o = run(arm, seats, GAMES);
    rows[arm] = o;
    console.log(
      `${arm} ${ARMS[arm].label.padEnd(20)} `
      + `${mean(o.buysPerGame).toFixed(1).padStart(4)} `
      + `${mean(o.priceEach).toFixed(1).padStart(6)} `
      + `${med(o.priceEach).toFixed(0).padStart(5)} `
      + `${mean(o.priceMax).toFixed(1).padStart(5)} `
      + `${mean(o.spendPerGame).toFixed(0).padStart(6)} `
      + `${mean(o.earlyPrice).toFixed(1).padStart(7)} `
      + `${mean(o.latePrice).toFixed(1).padStart(5)} `
      + `${mean(o.plotsMean).toFixed(1).padStart(7)} `
      + `${mean(o.landShare).toFixed(1).padStart(7)}`);
  }
  console.log("\narm                    sells  $sold  solvency   winEP  margin   cash"
    + "   biz   Q6->win");
  for (const arm of Object.keys(ARMS)) {
    const o = rows[arm];
    console.log(
      `${arm} ${ARMS[arm].label.padEnd(20)} `
      + `${mean(o.sellsPerGame).toFixed(1).padStart(5)} `
      + `${mean(o.sellRevenue).toFixed(0).padStart(6)} `
      + `${mean(o.solvencySells).toFixed(2).padStart(9)} `
      + `${mean(o.winEP).toFixed(1).padStart(7)} `
      + `${mean(o.margin).toFixed(1).padStart(7)} `
      + `${mean(o.cashEnd).toFixed(0).padStart(6)} `
      + `${mean(o.bizEnd).toFixed(1).padStart(5)} `
      + `${pct(o.q6LeaderWon, o.snapped).toFixed(0).padStart(8)}%`);
  }
  console.log("\n  what the price was made of at the moment of purchase:");
  console.log("    arm    tag   occupied neighbours     share of price");
  console.log("                 all(graph)  orth-only   not from the tag");
  for (const arm of Object.keys(ARMS)) {
    const o = rows[arm];
    console.log(`    ${arm}    ${mean(o.tagPaid).toFixed(2)}      `
      + `${mean(o.gnb).toFixed(2).padStart(4)}       ${mean(o.onb).toFixed(2).padStart(4)}          `
      + `${mean(o.adjShare).toFixed(0).padStart(3)}%`);
  }

  console.log("\n  paid or dodged?  a plot only costs more if you buy one that HAS"
    + " a neighbour:");
  console.log("    arm    bought next to a structure    $ paid there   $ paid empty   premium");
  for (const arm of Object.keys(ARMS)) {
    const o = rows[arm];
    const adj = mean(o.priceWhenAdjacent), emp = mean(o.priceWhenEmpty);
    console.log(`    ${arm}           ${pct(o.boughtAdjacent, o.boughtTotal).toFixed(1).padStart(5)}%              `
      + `${adj.toFixed(2).padStart(5)}          ${emp.toFixed(2).padStart(5)}        `
      + `${(adj - emp >= 0 ? "+" : "")}${(adj - emp).toFixed(2)}`);
  }

  console.log("\n  cheapest plot still unsold at the end, and the share of the table"
    + " that could buy it:");
  for (const arm of Object.keys(ARMS)) {
    const o = rows[arm];
    console.log(`    ${arm}  $${mean(o.cheapestLeft).toFixed(1).padStart(4)}   `
      + `${mean(o.affordCheapest).toFixed(0)}% of players`);
  }
  console.log("");
  summary[seats] = rows;
}

/* The one line that answers the question, per table size. */
console.log(`${"=".repeat(78)}\nTHE PROPOSAL (D) AGAINST WHAT SHIPS (A)\n`);
console.log("seats   price/plot      plots bought     land spend     plots held   winEP");
for (const seats of TABLES) {
  const A = summary[seats].A, D = summary[seats].D;
  const d = (f) => {
    const a = f(A), b = f(D);
    const sign = b >= a ? "+" : "";
    return `${b.toFixed(1)} (${sign}${a ? (100 * (b - a) / a).toFixed(0) : "-"}%)`;
  };
  console.log(`  ${seats}   ${d((o) => mean(o.priceEach)).padEnd(15)} `
    + `${d((o) => mean(o.buysPerGame)).padEnd(16)} `
    + `${d((o) => mean(o.spendPerGame)).padEnd(14)} `
    + `${d((o) => mean(o.plotsMean)).padEnd(12)} `
    + `${d((o) => mean(o.winEP))}`);
}
console.log("");
