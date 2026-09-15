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

   Run: node audit_land_awards.js [games] [seats...]
        node audit_land_awards.js 400 5 6
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "400", 10);
const SEATS = process.argv.slice(3).map(Number).filter(Boolean);
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

const ARMS = [
  { key: "A", name: "as it ships (5 sole)", ranked: false, botsAware: false },
  { key: "B", name: "10/5, bots unaware", ranked: true, botsAware: false },
  { key: "C", name: "10/5, bots aware", ranked: true, botsAware: true },
];

function engineFor(arm) {
  let logic = base;
  if (arm.ranked) logic = logic.replace(NEEDLES.awardBody, RANKED_BODY);
  if (arm.botsAware) {
    logic = logic.replace(NEEDLES.landConst, "const LAND_AWARD = { sole: 10, two: 5, many: 3 };");
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
      epTotal, activeBiz, plotCount, districtCount };
  `, sandbox);
  return { E: box.exports, box };
}

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
    plotLeaderWon: 0, districtLeaderWon: 0, clearPlotLeader: 0, clearDistrictLeader: 0,
    q6LeaderWon: 0, q6Clear: 0,
  };
  for (let seed = 1; out.games < n && seed < n * 5; seed++) {
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

    /* Q6 is the halfway mark; the snapshot nearest it that exists. */
    const snap = box.snaps.filter((s) => s.q <= 6).pop();
    if (snap) {
      const top = Math.max(...snap.ep);
      if (snap.ep.filter((v) => v === top).length === 1) {
        out.q6Clear++;
        if (snap.ep.indexOf(top) === order[0][0]) out.q6LeaderWon++;
      }
    }
  }
  return out;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
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
  row("land as % of winner's score", (r) => f1(mean(r.landShare)) + "%");
  console.log("");
  row("winner's plots held", (r) => f1(mean(r.plotsW)));
  row("winner's districts", (r) => f1(mean(r.districtsW)));
  row("plot leader won", (r) => f1(pct(r.plotLeaderWon, r.clearPlotLeader)) + "%");
  row("district leader won", (r) => f1(pct(r.districtLeaderWon, r.clearDistrictLeader)) + "%");
  console.log("");
  row("Q6 leader went on to win", (r) => f1(pct(r.q6LeaderWon, r.q6Clear)) + "%");

  const band = 2 * Math.sqrt(0.25 * 0.75 / GAMES) * 100;
  console.log(`\n  Two standard errors on a percentage here is about ${f1(band)} points.`);
  console.log(`  B minus A is the rule alone; C minus B is what the bots noticing it adds.`);
  console.log("");
}

console.log("(Bots play every seat. They buy ground through one heuristic that reads");
console.log(" LAND_AWARD.sole, so arm C is the closest thing to a table that has read");
console.log(" the new rule - and arm B is what the same rule looks like if nobody has.)");
