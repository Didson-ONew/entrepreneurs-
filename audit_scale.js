/* ============================================================================
   Six players, and a fourth year. What breaks, what it costs, how long it runs.

   Both were asked as "could we?", and both have two separate answers: whether
   the code allows it, and whether the game survives it.

   THE SIX-PLAYER HALF HAS SINCE BEEN IMPLEMENTED. The table seats two to six,
   and audit_tables.js is where those games are now measured. What is left here
   is the record of what stood in the way, and the fourth-year question, which
   has not been implemented and is still only a measurement.

   WHAT USED TO STOP A SIX-PLAYER GAME - AND WHAT WAS DONE ABOUT IT

     This section is kept as a record. Everything in it was true when this probe
     was written, and the first four items have since been fixed; the game seats
     two to six. audit_tables.js measures how the table actually plays at each
     size. What follows is what the obstacles were, and what each one became.

     STARTING had rows for 2, 3 and 4 seats and nothing else, so initGame threw
     on the fifth player before a card was dealt. That was the hard stop.
     FIXED: rows for 5 and 6 continue the same reverse-order slope.

     The action tracks did not scale. There were 14 worker slots on the board -
     four each on Raise Capital, M&A and R&D, two on Board Meeting, one of which
     is sealed until somebody goes public. Every player places two workers. Four
     players fill 8 of 13; six players filled 12 of 13, so the last player to
     place had no choice at all. This was the constraint that decided whether six
     was a game or a queue, and it measured 7% forced placements.
     FIXED: one extra slot on each working track per player above four - 17 slots
     at five seats, 20 at six. Board Meeting was left at two on purpose.

     64 plots on the board against 12 discs a player. Six players could commit
     72 discs to land alone. MEASURED, NOT FIXED: nobody gets near it. Six-seat
     games end with about 6 plots a seat and 27 plots never bought, and land
     falls from 15% of a winning score at four seats to 9% at six precisely
     because the board stops being scarce enough to fight over.

     The Megacorp pool drew two tiles per tier - eight at four players, which is
     the 2n the rules promise. At six it would still be eight, not twelve.
     UNCHANGED, DELIBERATELY: there are only sixteen tiles and four tiers, so
     eight is every tier twice. A bigger table competes over the same box.

     The lobby capped a room at three bots, and there were four player colours
     and six personas. FIXED: the room seats six in any mix, and there are six
     colours. Six personas for six seats means nobody now sits out - which is
     itself visible in the numbers, and is why the persona win rates at six
     players sit closer together than at any smaller table.

   WHAT STOPS A FOURTH YEAR

     The end of the game is `quarter >= 12`. Around it: year ends are the literal
     list [4, 8, 12] in three places, "quarters left" is `13 - quarter` in four,
     loan buy-back prices are a table of three, and the demand board is refreshed
     once, at Q8. A fourth year with no fourth refresh plays its last four
     quarters on a board that is already full.

   Everything below is patched into the engine inside a sandbox; the repo file is
   never touched, and none of this is a rule the game plays by.

   HOW LONG WOULD IT TAKE HUMANS? Nobody knows, and this does not pretend to.
   The match log holds 54 finished games and every one of them is a bot game that
   ran in under a minute, so there is no human timing to draw on. What this can
   count is DECISIONS - every moment the game stops and waits for a person - and
   it reports that count alongside what it comes to at several seconds each.

   WHAT IT FOUND

   1. SIX PLAYERS WORKS, once STARTING has a row for it. The winning score rises
      from 92 to 104 and the winner's lead over last from 46.7 to 56.0, which is
      the ordinary cost of more people rather than a broken game. SHIPPED.

   2. THE WORKER BOARD IS THE REAL CONSTRAINT, and it is smaller than it looks.
      At six players 7% of placements had only one track left open - no decision
      at all - against 0% at four, and the average number of tracks to choose
      between fell from 3.23 to 2.86. Six slots a track instead of four took it
      straight back to 0% and 3.29. One line, and it is the line that decided
      whether a sixth seat was playing or queueing. SHIPPED, as one extra slot per
      player above four rather than a flat six, so nothing changes below five
      seats.

   3. NOTHING ELSE RUNS OUT. Six players use 49% of the demand board against 38%
      at four, and leave 27 of the 64 plots unowned. The board is big enough.

   4. A FOURTH YEAR IS ARITHMETIC, NOT DESIGN. It runs, and it inflates: 136 EP
      to win at four players against 92, with the lead over last going 46.7 to
      63.5. Everything scales with it because everything in the scoring is
      per-quarter. The one thing that needs a decision rather than a constant is
      the demand board, which is only refreshed once, at Q8 - a fourth year needs
      a second refresh or it is played out on a board with nothing left on it.

   5. TWO THIRDS OF EVERY GAME IS THE DELIVERY PHASE. 42.8 of a player's 64.9
      decisions are single delivery clicks. If a table ever complains the game is
      long, that is where the time is - and most of those clicks are obvious ones
      the player would happily hand to a "sell the rest for me" button.

   Run: node audit_scale.js [seeds]
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEEDS = parseInt(process.argv[2] || "300", 10);

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
const BASE = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

/* The engine seats two to six on its own now, so nothing here patches the table size
   any more - `seats` goes straight to initGame, and STARTING, the tracks and the tile
   draw are whatever the shipped rules say. What is still patched is the fourth year,
   which the game does not play. */
const N = {
  over: "  if (state.quarter >= 12 || rushers.length) {",
  yearEndsClosing: "  if ([4, 8, 12].includes(quarter)) {",
  yearEndsRepay: "  if ([4, 8, 12].includes(state.quarter)) {",
  landPayouts: "  return [4, 8, 12].filter((q) => q >= state.quarter).length || 1;",
  repayRates: "const LOAN_REPAY_RATE = { 4: 30, 8: 35, 12: 40 };",
  refresh: "  if (quarter === 8) refreshY3(demand);",
  botLast: "  if (quarter === 12) {",
  /* counters */
  meeple: "function placeMeeple(state, playerId, track) {",
  deliver: "  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;",
};
for (const [k, v] of Object.entries(N)) {
  if (!BASE.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}

function engineFor({ quarters = 12 } = {}) {
  let logic = BASE;
  const last = quarters;

  if (quarters !== 12) {
    const ends = [];
    for (let q = 4; q <= last; q += 4) ends.push(q);
    const endsSrc = `[${ends.join(", ")}]`;
    /* keep the second-Megacorp deadline; only the year count moves */
    logic = logic.replace(N.over, `  if (state.quarter >= ${last} || rushers.length) {`);
    logic = logic.replace(N.yearEndsClosing, `  if (${endsSrc}.includes(quarter)) {`);
    logic = logic.replace(N.yearEndsRepay, `  if (${endsSrc}.includes(state.quarter)) {`);
    logic = logic.replace(N.landPayouts, `  return ${endsSrc}.filter((q) => q >= state.quarter).length || 1;`);
    logic = logic.replace(N.botLast, `  if (quarter === ${last}) {`);
    /* Prices rise a little each year, as they already do. */
    const rates = ends.map((q, i) => `${q}: ${30 + i * 5}`).join(", ");
    logic = logic.replace(N.repayRates, `const LOAN_REPAY_RATE = { ${rates} };`);
    /* The demand board is wiped once, at Q8. A fourth year needs another wipe or
       it plays out on a board with nothing left on it. */
    logic = logic.replace(N.refresh,
      `  if (quarter === 8) refreshY3(demand);\n  if (quarter === 12 && ${last} > 12) refreshY3(demand);`);
    logic = logic.replace(/13 - \(state\.quarter \|\| 1\)/g, `${last + 1} - (state.quarter || 1)`);
    logic = logic.replace(/13 - state\.quarter/g, `${last + 1} - state.quarter`);
  }

  /* Count the moments a person would be asked to do something. */
  /* Count the choice the player actually had: how many tracks still had a free slot
     at the moment they placed. One is not a decision, it is a queue. */
  logic = logic.replace(N.meeple, "function placeMeeple(state, playerId, track) { __tick('place', "
    + "Object.keys(state.tracks).filter((t) => (t !== 'board_meeting' || state.ipoTileClaimed) "
    + "&& state.tracks[t].some((x) => x === null)).length);");
  logic = logic.replace(N.deliver, "  __tick('deliver');\n" + N.deliver);

  const box = {};
  const counts = { place: 0, deliver: 0, choiceSum: 0, forced: 0 };
  const sandbox = { console, Math, Set, Object, Array, JSON, box,
    __tick: (k, open) => {
      counts[k] = (counts[k] || 0) + 1;
      if (k === "place" && typeof open === "number") {
        counts.choiceSum += open;
        if (open <= 1) counts.forced += 1;
      }
    } };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advancePlanning, advanceDraft, startPlanning,
      activeBiz, megacorpHQs, epTotal, finalRank, plotCount, allDistrictKeys,
      MEGACORP_TIER, DISCS_PER_PLAYER };
  `, sandbox);
  return { E: box.exports, counts };
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);

function run(cfg) {
  const { E, counts } = engineFor(cfg);
  const seats = cfg.seats || 4;
  const T = { seats, quarters: cfg.quarters || 12, games: 0, players: 0, threw: null,
    winnerEP: 0, lastEP: 0, spread: 0, plots: 0, companies: 0, hqs: 0, tiles: 0,
    demandUsed: 0, demandTotal: 0, place: 0, deliver: 0, unowned: 0, loans: 0 };
  for (let seed = 1; seed <= SEEDS; seed++) {
    let st;
    try {
      st = E.initGame(seats - 1, seed, ["Seat 1"], undefined, true, undefined);
    } catch (e) { T.threw = e.message; return T; }
    st.players[0].isHuman = false;
    try {
      if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
      E.advancePlanning(st, E.mulberry32(seed + 777), () => {});
    } catch (e) { T.threw = e.message; return T; }
    if (st.phase !== "gameover") continue;
    T.games++;
    T.tiles += st.megacorpPool.length;
    const ranked = [...st.players].sort(E.finalRank);
    const eps = ranked.map((p) => E.epTotal(p));
    T.winnerEP += eps[0];
    T.lastEP += eps[eps.length - 1];
    T.spread += eps[0] - eps[eps.length - 1];
    for (const p of st.players) {
      T.players++;
      T.plots += E.plotCount(st, p);
      T.companies += E.activeBiz(p).length;
      T.hqs += E.megacorpHQs(p).length;
      T.loans += p.discsInBank;
    }
    T.unowned += Object.keys(st.board.graph).filter((k) => !(k in st.board.owner)).length;
    /* How much of the demand board actually got used. */
    for (const k of Object.keys(st.demand.tiles)) {
      const t = st.demand.tiles[k];
      t.filled.forEach((row) => row.forEach((v) => { T.demandTotal++; if (v) T.demandUsed++; }));
    }
  }
  T.place = counts.place; T.deliver = counts.deliver;
  T.choiceSum = counts.choiceSum; T.forced = counts.forced;
  return T;
}

/* ------------------------------------------------------------------ report */
console.log("Entrepreneurs - six players, and a fourth year\n");

console.log("Does it run at all, as the code stands?");
{
  const box = {}; const sb = { console, Math, Set, Object, Array, JSON, box, __tick: () => {} };
  vm.createContext(sb);
  vm.runInContext(BASE + "box.exports = { initGame, workingTrackSlots };", sb);
  for (const seats of [2, 4, 5, 6]) {
    let how = "started";
    try {
      const st = box.exports.initGame(seats - 1, 1, ["Seat 1"], undefined, true, undefined);
      const t = st.tracks;
      how = `started - ${t.raise_capital.length} slots a working track, `
        + `${t.raise_capital.length * 3 + 2} in all, ${st.megacorpPool.length} Megacorp tiles`;
    } catch (e) { how = `THREW: ${e.message}`; }
    console.log(`  ${seats} players, engine as it ships   ${how}`);
  }
  console.log("  Six seats used to throw on STARTING. It no longer does; see audit_tables.js\n"
    + "  for how those games actually play.\n");
}

/* Six seats no longer need patching, so the only dial left is the year count.
   Both table sizes are kept in the table because the fourth year inflates the
   score differently at each. */
const CASES = [
  { label: "4 players, 3 years", seats: 4, quarters: 12 },
  { label: "6 players, 3 years", seats: 6, quarters: 12 },
  { label: "4 players, 4 years", seats: 4, quarters: 16 },
  { label: "6 players, 4 years", seats: 6, quarters: 16 },
];
const runs = CASES.map(run);

const W = 17;
const head = () => console.log(pad("", 32) + CASES.map((c) => rp(c.label.replace(", ", "/"), W)).join(""));
const row = (name, fn, dp = 1) =>
  console.log(pad(name, 32) + runs.map((T) => rp(T.threw ? "-" : fn(T).toFixed(dp), W)).join(""));
const pct = (name, fn) =>
  console.log(pad(name, 32) + runs.map((T) => rp(T.threw ? "-" : `${(100 * fn(T)).toFixed(0)}%`, W)).join(""));

head();
console.log("─".repeat(32 + W * runs.length));
row("games completed", (T) => T.games, 0);
row("winning score", (T) => T.winnerEP / T.games, 0);
row("last place", (T) => T.lastEP / T.games, 0);
row("winner's lead over last", (T) => T.spread / T.games);
console.log("");
row("companies per seat", (T) => T.companies / T.players, 2);
row("plots per seat", (T) => T.plots / T.players, 2);
row("plots left unowned (of 64)", (T) => T.unowned / T.games, 1);
row("unpaid loan discs per seat", (T) => T.loans / T.players, 2);
console.log("");
row("Megacorp tiles left over", (T) => T.tiles / T.games, 1);
row("Megacorps formed per game", (T) => T.hqs / T.games, 2);
pct("demand board used up", (T) => T.demandUsed / T.demandTotal);

console.log("\n\nHOW MUCH IS THERE TO DO?");
console.log("Every moment the game stops and waits for a person, counted per player.\n");
head();
console.log("─".repeat(32 + W * runs.length));
row("worker placements each", (T) => T.place / T.players, 1);
row("  tracks open when placing", (T) => T.choiceSum / Math.max(1, T.place), 2);
pct("  placements with no choice", (T) => T.forced / Math.max(1, T.place));
row("delivery clicks each", (T) => T.deliver / T.players, 1);
row("decisions each, all told", (T) => (T.place + T.deliver) / T.players, 1);
row("decisions at the table", (T) => (T.place + T.deliver) / T.games, 0);

console.log("\nWhat that comes to, at seconds per decision");
console.log(pad("", 32) + CASES.map((c) => rp(c.label.replace(", ", "/"), W)).join(""));
console.log("─".repeat(32 + W * runs.length));
for (const secs of [5, 10, 15, 20]) {
  console.log(pad(`  ${secs}s each`, 32) + runs.map((T) => {
    if (T.threw) return rp("-", W);
    const mins = ((T.place + T.deliver) / T.games) * secs / 60;
    return rp(`${Math.round(mins)}m`, W);
  }).join(""));
}
console.log("\n  These count only the moments the engine pauses for a decision. Real tables");
console.log("  also spend time reading the board, arguing, and waiting for the slow player,");
console.log("  and none of that is in here. Treat the 10s row as a floor, not a forecast.");
console.log("");
