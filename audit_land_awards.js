/* ============================================================================
   What should the two land awards be worth?

   THE PROBLEM. audit_state_of_play puts land at 6% of a winning score at four
   players, 4% at five and 3% at six. A mechanic that decides three per cent of
   the game at a full table is not a decision anybody makes; it is a rounding
   error with a rulebook entry. The Real-Estate Mogul and The Omnipresent are
   paid at every year end and almost nobody races for them.

   WHAT IS BEING TESTED. Going back to a ranked award: 10 EP to the outright
   leader and 5 to second, in each of the two categories, splitting between ties.
   That is not a new idea - it is what the game USED to pay, before it was cut to
   5-for-the-leader-only (see audit_scoring.js, which swept that change). The
   economy has moved a long way since, so it is worth asking again rather than
   assuming the old answer still holds.

   THE TRAP THIS AVOIDS. The bots price land through LAND_AWARD.sole - see
   worthChasingLand in the engine, which multiplies it by 0.5/0.6/0.35 to decide
   whether a plot is worth buying. Change what the award PAYS without changing
   what the bots think it is worth and you measure the new rule being played by
   people who have not heard about it. So there are three arms, not two, and the
   gap between the last two is how much that blindness was costing:

     A  as it ships          5 to the sole leader, 2 each on a two-way tie
     B  10/5, bots unaware   the award changes, the bots' valuation does not
     C  10/5, bots aware     the award changes and LAND_AWARD.sole goes to 10

   C is the honest measurement of the proposal. B is here to show that it is.

   THE SECOND PROPOSAL: STOP RANKING. Every ranked prize has the same problem - the
   expected value of chasing land is roughly the prize divided by the number of
   players, so a prize big enough to matter at six seats is overwhelming at two, and
   one tuned for two seats disappears at six. Paying for what you actually hold has
   no such term in it: hold four plots, collect four, whoever else is holding what.
   It scales itself.

     D  granular, bots unaware   1 EP per plot and 1 EP per district, every payout
     E  granular, bots aware     the same, and the bots price a plot accordingly

   AND A GRANULAR RULE THAT COUNTS SOMETHING HARDER TO GET. The trouble with paying
   for raw holdings is that everybody ends up holding roughly the same amount, so the
   award pays out enormously and separates nobody. Counting ground you actually
   CONTROL - districts where you own more plots than any single opponent - is the same
   kind of rule, just as countable, but it is a thing you can be denied.

     F  controlled ground, bots unaware   1 EP per plot in a district you control,
                                          plus 2 EP per controlled district
     G  the same, bots aware

   Run: node audit_land_awards.js [games] [seats...]
        node audit_land_awards.js 400 5 6
        node audit_land_awards.js 800 2 3 4 5 6 --seeds=50000
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "400", 10);
/* A second run on a DIFFERENT block of seeds is how you tell a real effect from a
   lucky one, so the block is selectable: node audit_land_awards.js 800 5 6 --seeds=50000 */
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
const TABLES = SEATS.length ? SEATS : [5, 6];

const src = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const cut = src.indexOf("/* ============================== REACT UI ============================== */");
const base = src.slice(0, cut).replace(/^\s*(import|export)\s.*$/gm, "");

/* Everything this probe splices into. Each is checked before anything runs, so a
   moved anchor stops the audit rather than quietly measuring the wrong thing. */
const NEEDLES = {
  landConst: "const LAND_AWARD = { sole: 5, two: 2, many: 1 };",
  /* The whole body is replaced, not a prefix of it, so no dead half of the old loop
     is left behind to unbalance the braces. */
  awardBody: `  const top = Math.max(...scores.map((x) => x.s));
  const leaders = scores.filter((x) => x.s === top);
  const share = leaders.length === 1 ? LAND_AWARD.sole
    : leaders.length === 2 ? LAND_AWARD.two : LAND_AWARD.many;
  for (const { p } of leaders) {
    // stamp the quarter it was actually awarded in - the land awards pay at every year
    // end, and hardcoding 12 made the scoring log claim otherwise
    addEP(p, share, label, state.quarter);
    if (log) log(\`\${p.name} earns \${label} (+\${share} EP).\`, p.id);
  }`,
  quarterEnd: "function finishQuarterAfterLH(state, log, rng) {\n  runClosingRest(state, log);",
  mogulCall: '(p) => plotCount(state, p), "The Real-Estate Mogul"',
  omniCall: '(p) => districtCount(state, p), "The Omnipresent"',
  /* Arm E rewrites this whole function, so its signature has to be exactly here. */
  weightFn: `function landEPWeight(state, p) {
  const payouts = landPayouts(state);
  if (!p) return payouts * LAND_AWARD.sole * 0.5;`,
};
for (const [k, v] of Object.entries(NEEDLES)) {
  if (!base.includes(v)) {
    console.error(`the engine changed shape around ${k} - update this probe`);
    process.exit(2);
  }
}

/* The ranked award, as it was before the cut: 10 for first, 5 for second, a tie
   splitting whatever its places cover between them. */
const RANKED_BODY = `  scores.sort((a, b) => b.s - a.s);
  const values = [10, 5];
  let i = 0;
  while (i < scores.length && i < values.length) {
    let j = i;
    while (j + 1 < scores.length && scores[j + 1].s === scores[i].s) j++;
    const tiedCount = j - i + 1;
    const pot = values.slice(i, Math.min(j + 1, values.length)).reduce((a, b) => a + b, 0);
    const share = Math.floor(pot / tiedCount);
    if (share > 0) {
      for (let k = i; k <= j; k++) {
        addEP(scores[k].p, share, label, state.quarter);
        if (log) log(\`\${scores[k].p.name} earns \${label} (+\${share} EP).\`, scores[k].p.id);
      }
    }
    i = j + 1;
  }`;

/* Pay what you hold. awardRanked is called once with plotCount and once with
   districtCount, so ONE body serves both categories: x.s is already whichever count
   this call is scoring, and there is no ranking left to do. scores has been filtered
   to x.s > 0 upstream, so a player holding nothing is simply not in it. */
const GRAIN = 1;
const GRANULAR_BODY = `  for (const x of scores) {
    const share = ${GRAIN} * x.s;
    addEP(x.p, share, label, state.quarter);
    if (log) log(\`\${x.p.name} earns \${label} (+\${share} EP).\`, x.p.id);
  }`;

/* Telling the bots about the granular rule takes more than moving a number. Under a
   ranked award a plot is worth something only to a player who can still win the race,
   which is what the 0.6 / 0.35 / 0 ladder in landEPWeight encodes. Under the granular
   rule that ladder is simply wrong: the marginal plot pays GRAIN per payout to
   everybody, leader or not. So arm E replaces the function rather than the constant.

   The 1.5 is the plot award plus a part share of the district one - a new plot lands
   in a district you are not in yet perhaps half the time. Deliberately on the low
   side: if it is wrong, it under-prices land, and arm E then understates its own
   proposal rather than flattering it. */
const GRANULAR_WEIGHT = `function landEPWeight(state, p) {
  return landPayouts(state) * ${GRAIN} * 1.5;
}`;

/* Ground you CONTROL: a district where you own strictly more plots than any one
   opponent. Returns both the plots standing on it and the number of such districts,
   so the two awards can keep their separate identities. Injected into the engine
   rather than computed out here, because the award runs inside it. */
const CONTROL_HELPER = `
function controlledGround(state, p) {
  const mine = {}, theirs = {};
  for (const [plot, id] of Object.entries(state.board.owner)) {
    const cell = state.board.cellOf[plot];
    const k = cell.r + "," + cell.c;
    if (id === p.id) mine[k] = (mine[k] || 0) + 1;
    else { (theirs[k] = theirs[k] || {})[id] = (theirs[k][id] || 0) + 1; }
  }
  let plots = 0, districts = 0;
  for (const k of Object.keys(mine)) {
    const best = theirs[k] ? Math.max(...Object.values(theirs[k])) : 0;
    if (mine[k] > best) { plots += mine[k]; districts++; }
  }
  return { plots, districts };
}
`;

/* Under arm G a plot is worth chasing only where it buys control, which is roughly
   half the board, so the rate is halved against arm E's. */
const CONTROL_WEIGHT = `function landEPWeight(state, p) {
  return landPayouts(state) * ${GRAIN} * 0.9;
}`;

const ARMS = [
  { key: "A", name: "as it ships (5 sole)", ranked: false, botsAware: false },
  { key: "B", name: "10/5, bots unaware", ranked: true, botsAware: false },
  { key: "C", name: "10/5, bots aware", ranked: true, botsAware: true },
  { key: "D", name: "per plot, unaware", granular: true, botsAware: false },
  { key: "E", name: "per plot, bots aware", granular: true, botsAware: true },
  { key: "F", name: "controlled, unaware", granular: true, control: true, botsAware: false },
  { key: "G", name: "controlled, aware", granular: true, control: true, botsAware: true },
];

function engineFor(arm) {
  let logic = base;
  /* First, before any other splice: arm C rewrites the LAND_AWARD line this is
     anchored to, and a splice that runs after it would quietly do nothing. */
  logic = logic.replace(NEEDLES.landConst, NEEDLES.landConst + CONTROL_HELPER);
  if (arm.ranked) logic = logic.replace(NEEDLES.awardBody, RANKED_BODY);
  if (arm.granular) logic = logic.replace(NEEDLES.awardBody, GRANULAR_BODY);
  if (arm.control) {
    /* Both award call sites - the year-end one and the one in finalizeGame. */
    logic = logic.split(NEEDLES.mogulCall)
      .join('(p) => controlledGround(state, p).plots, "The Real-Estate Mogul"');
    logic = logic.split(NEEDLES.omniCall)
      .join('(p) => 2 * controlledGround(state, p).districts, "The Omnipresent"');
  }
  if (arm.botsAware) {
    if (arm.control) {
      const at = logic.indexOf(NEEDLES.weightFn);
      logic = logic.slice(0, at) + CONTROL_WEIGHT + logic.slice(logic.indexOf("\n}", at) + 2);
    } else if (arm.granular) {
      /* Replace the body of landEPWeight up to its closing brace. The needle is its
         first three lines; everything from there to the matching brace goes. */
      const at = logic.indexOf(NEEDLES.weightFn);
      const end = logic.indexOf("\n}", at);
      logic = logic.slice(0, at) + GRANULAR_WEIGHT + logic.slice(end + 2);
    } else {
      logic = logic.replace(NEEDLES.landConst, "const LAND_AWARD = { sole: 10, two: 5, many: 3 };");
    }
  }
  /* Snapshot the standings at every year end so the runaway question can be asked
     of the same games rather than a second run. */
  logic = logic.replace(NEEDLES.quarterEnd,
    NEEDLES.quarterEnd + "\n  box.snap(state);");

  const box = { snaps: [], snap(state) {
    box.snaps.push({ q: state.quarter, ep: state.players.map((p) => box.ep(p)) });
  } };
  const sandbox = { console, Math, Set, Object, Array, JSON, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.ep = epTotal;
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      epTotal, activeBiz, plotCount, districtCount,
      controlled: (s, p) => controlledGround(s, p).plots };
  `, sandbox);
  return { E: box.exports, box };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const LAND_LABELS = ["The Real-Estate Mogul", "The Omnipresent"];
const landEP = (p) => (p.epLog || [])
  .filter((e) => LAND_LABELS.includes(e.label))
  .reduce((s, e) => s + e.amount, 0);

function run(arm, seats, n) {
  const { E, box } = engineFor(arm);
  const out = {
    games: 0, winEP: [], margin: [], lastQ: [],
    landWinner: [], landSeat: [], landShare: [],
    plotsW: [], districtsW: [],
    /* How far ahead the player holding the MOST ground is of the table average.
       A per-unit award can only ever differentiate by this much, times the rate,
       times the number of payouts - so if it is small, no rate fixes it. */
    plotSpread: [], districtSpread: [], ctrlW: [], ctrlSpread: [],
    plotLeaderWon: 0, districtLeaderWon: 0, clearPlotLeader: 0, clearDistrictLeader: 0,
    q6LeaderWon: 0, q6Clear: 0,
    /* Land pays at every year end, so how MANY year ends a game reaches is the
       thing that decides how much land can compound. That is the suspected reason
       five and six seats answer differently. */
    landRounds: [], reachedQ12: 0,
    q6WonLong: 0, q6ClearLong: 0, q6WonShort: 0, q6ClearShort: 0,
  };
  for (let seed = SEED0; out.games < n && seed < SEED0 + n * 5; seed++) {
    let st;
    box.snaps.length = 0;
    try {
      st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
      st.players[0].isHuman = false;
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    } catch (e) { continue; }
    if (!st || st.phase !== "gameover") continue;
    out.games++;

    const eps = st.players.map((p) => E.epTotal(p));
    const order = st.players.map((p, i) => [i, eps[i]]).sort((a, b) => b[1] - a[1]);
    const winner = st.players[order[0][0]];
    out.winEP.push(Math.round(order[0][1]));
    out.margin.push(Math.round(order[0][1] - order[1][1]));
    out.lastQ.push(st.quarter);

    const lw = landEP(winner);
    out.landWinner.push(lw);
    out.landShare.push(order[0][1] > 0 ? (100 * lw) / order[0][1] : 0);
    st.players.forEach((p) => out.landSeat.push(landEP(p)));
    out.plotsW.push(E.plotCount(st, winner));
    out.districtsW.push(E.districtCount(st, winner));
    const allPlots = st.players.map((p) => E.plotCount(st, p));
    const allDist = st.players.map((p) => E.districtCount(st, p));
    const allCtrl = st.players.map((p) => E.controlled(st, p));
    out.ctrlW.push(allCtrl[order[0][0]]);
    out.ctrlSpread.push(Math.max(...allCtrl) - mean(allCtrl));
    out.plotSpread.push(Math.max(...allPlots) - mean(allPlots));
    out.districtSpread.push(Math.max(...allDist) - mean(allDist));

    /* Does holding the most ground actually predict winning? Only counted where
       there IS a clear leader - a four-way tie says nothing either way. */
    const byPlot = st.players.map((p) => E.plotCount(st, p));
    const topPlot = Math.max(...byPlot);
    if (byPlot.filter((v) => v === topPlot).length === 1) {
      out.clearPlotLeader++;
      if (st.players[byPlot.indexOf(topPlot)] === winner) out.plotLeaderWon++;
    }
    const byDist = st.players.map((p) => E.districtCount(st, p));
    const topDist = Math.max(...byDist);
    if (byDist.filter((v) => v === topDist).length === 1) {
      out.clearDistrictLeader++;
      if (st.players[byDist.indexOf(topDist)] === winner) out.districtLeaderWon++;
    }

    /* How many times the land awards actually paid in this game. */
    const rounds = new Set();
    st.players.forEach((p) => (p.epLog || []).forEach((e) => {
      if (LAND_LABELS.includes(e.label)) rounds.add(e.quarter);
    }));
    out.landRounds.push(rounds.size);
    const long = st.quarter >= 12;
    if (long) out.reachedQ12++;

    /* Q6 is the halfway mark; the snapshot nearest it that exists. */
    const snap = box.snaps.filter((s) => s.q <= 6).pop();
    if (snap) {
      const top = Math.max(...snap.ep);
      if (snap.ep.filter((v) => v === top).length === 1) {
        out.q6Clear++;
        const won = snap.ep.indexOf(top) === order[0][0];
        if (won) out.q6LeaderWon++;
        if (long) { out.q6ClearLong++; if (won) out.q6WonLong++; }
        else { out.q6ClearShort++; if (won) out.q6WonShort++; }
      }
    }
  }
  return out;
}

const pct = (a, b) => (b ? (100 * a) / b : 0);
const f1 = (x) => x.toFixed(1);

console.log(`Land awards: what the two land prizes should be worth`);
console.log(`${GAMES} games per arm per table size, personas on, everything else as it ships.\n`);

for (const seats of TABLES) {
  console.log("=".repeat(92));
  console.log(`${seats} PLAYERS   (a seat wins ${f1(100 / seats)}% by chance)`);
  console.log("=".repeat(92));

  const res = ARMS.map((a) => ({ arm: a, r: run(a, seats, GAMES) }));

  const row = (label, get) =>
    console.log("  " + label.padEnd(36) + res.map(({ r }) => String(get(r)).padStart(16)).join(""));

  console.log("  " + "".padEnd(36) + ARMS.map((a) => ("  " + a.key + "  " + a.name).slice(0, 16).padStart(16)).join(""));
  row("games played", (r) => r.games);
  row("winning score", (r) => f1(mean(r.winEP)));
  row("winner's margin over 2nd", (r) => f1(mean(r.margin)));
  row("game ended on quarter", (r) => f1(mean(r.lastQ)));
  console.log("");
  row("land EP, the winner", (r) => f1(mean(r.landWinner)));
  row("land EP, any seat", (r) => f1(mean(r.landSeat)));
  /* The one that decides whether a land rule is a DECISION or a subsidy: a rule that
     pays every player the same amount changes no result, however large the amount. */
  row("land EP, winner over table avg", (r) => f1(mean(r.landWinner) - mean(r.landSeat)));
  row("land as % of winner's score", (r) => f1(mean(r.landShare)) + "%");
  console.log("");
  row("winner's plots held", (r) => f1(mean(r.plotsW)));
  row("winner's districts", (r) => f1(mean(r.districtsW)));
  row("top plot-holder over table avg", (r) => f1(mean(r.plotSpread)));
  row("top district-holder over avg", (r) => f1(mean(r.districtSpread)));
  row("winner's controlled plots", (r) => f1(mean(r.ctrlW)));
  row("top controller over table avg", (r) => f1(mean(r.ctrlSpread)));
  row("plot leader won", (r) => f1(pct(r.plotLeaderWon, r.clearPlotLeader)) + "%");
  row("district leader won", (r) => f1(pct(r.districtLeaderWon, r.clearDistrictLeader)) + "%");
  console.log("");
  row("Q6 leader went on to win", (r) => f1(pct(r.q6LeaderWon, r.q6Clear)) + "%");
  row("  ...in games reaching Q12", (r) => f1(pct(r.q6WonLong, r.q6ClearLong)) + "%");
  row("  ...in games that ended early", (r) => f1(pct(r.q6WonShort, r.q6ClearShort)) + "%");
  console.log("");
  row("land paid this many times", (r) => f1(mean(r.landRounds)));
  row("games reaching Q12", (r) => f1(pct(r.reachedQ12, r.games)) + "%");

  /* The number that actually decides the question is C minus A, and the band on a
     DIFFERENCE of two proportions is the two bands in quadrature - not either alone. */
  const A = res[0].r;
  const p1 = pct(A.q6LeaderWon, A.q6Clear);
  console.log("\n  RUNAWAY COST, each arm against A (does the Q6 leader win more often?)");
  for (const { arm, r } of res.slice(1)) {
    const p2 = pct(r.q6LeaderWon, r.q6Clear);
    const se = Math.sqrt((p1 * (100 - p1)) / A.q6Clear + (p2 * (100 - p2)) / r.q6Clear);
    const diff = p2 - p1;
    console.log(`    ${arm.key} - A: ${(diff >= 0 ? "+" : "") + f1(diff)} points`.padEnd(26)
      + `two standard errors +/-${f1(2 * se)}  -> ${Math.abs(diff) > 2 * se ? "REAL" : "inside the noise"}`);
  }

  const band = 2 * Math.sqrt(0.25 * 0.75 / GAMES) * 100;
  console.log(`\n  Two standard errors on a percentage here is about ${f1(band)} points.`);
  console.log(`  B minus A is the rule alone; C minus B is what the bots noticing it adds.`);
  console.log("");
}

console.log("(Bots play every seat. They buy ground through one heuristic that reads");
console.log(" LAND_AWARD.sole, so C, E and G are the closest thing to a table that has read");
console.log(" the new rule - and B, D and F are what the same rules look like if nobody has.)");
