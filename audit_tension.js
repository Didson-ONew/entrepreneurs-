/* ============================================================================
   Is the game TENSE? Not "does the leader win" - how much the lead moves.

   WHY THE OLD NUMBER WAS NOT GOOD ENOUGH. Every probe here has judged runaway by
   the share of games the Q6 leader goes on to win. That statistic cannot tell
   two completely different games apart:

     a seat leads from Q4 to the end, nobody else is ever in front      - a runaway
     four seats trade the lead nine times, the Q6 leader takes it back
     in Q11 and holds on                                                - a good game

   Both score "the Q6 leader won". The second is the game you want and the first
   is the one you are trying to avoid, so the measurement has to look at the whole
   trajectory rather than two endpoints.

   WHAT IS MEASURED, on the running EP bank at the start of every quarter plus one
   final reading after end-of-game scoring:

     LEAD CHANGES      how many times the player in front is replaced. Ties are
                       handled by incumbency - a leader who is levelled with but
                       not passed has not lost the lead.
     WHO EVER LED      how many of the players were in front at some point, as a
                       share of the table. A game where one seat leads throughout
                       scores 1/N; a game everybody fronts at some point scores 1.
     DECIDED AT        the quarter the eventual winner took the lead for the last
                       time. Late is tense. Q1 means it was over before it began.
     THE WINNER'S TIME how much of the game the winner spent in front.
     THE LAST WORD     how often final scoring - land awards, cash, Megacorp
                       districts - hands the game to somebody who was not leading
                       when the last quarter ended.

   Run: node audit_tension.js [games a table size] [seats...]
        node audit_tension.js 250 4 5 6
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAMES = parseInt(process.argv[2] || "250", 10);
const seedArg = process.argv.find((a) => a.startsWith("--seeds="));
const SEED0 = seedArg ? parseInt(seedArg.slice(8), 10) : 1;
const SEATS = process.argv.slice(3).filter((a) => !a.startsWith("--")).map(Number).filter(Boolean);
const SIZES = SEATS.length ? SEATS : [2, 3, 4, 5, 6];

const SRC = fs.readFileSync(path.join(__dirname, "EntrepreneursGame.jsx"), "utf8");
const CUT = SRC.indexOf("/* ============================== REACT UI ============================== */");
if (CUT < 0) { console.error("the engine marker moved - update this probe"); process.exit(2); }
const base = SRC.slice(0, CUT).replace(/^\s*(import|export)\s.*$/gm, "");

const N = {
  landConst: "const LAND_AWARD = { sole: 5, two: 2, many: 1 };",
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
  levelEP: 'const levelEP = (state) => (hasVariant(state, "heavyLevelEP") ? 3 : 2);',
  hqHelper: "function hqNeighbours(state, hq) {",
  dividend: "function runMegacorpDividend(state, log) {\n  for (const p of state.players) {",
  mcPayout: `  for (const p of state.players) {
    for (const hq of megacorpHQs(p)) {
      const n = hqNeighbours(state, hq);
      if (n) addEP(p, MEGACORP_NEIGHBOUR_EP * n, \`Megacorp district: \${hq.megacorpName}\`, state.quarter);
    }
  }`,
  botPrice: "  const districtEP = MEGACORP_NEIGHBOUR_EP * hqNeighbours(state, hq);",
  tileEP: "  const [name, combo, ep] = match.tile;",
  brandFn: "const brandEPFor = (price, tier) => Math.floor(price / tier);",
  resolution: `  const queue = [];
  for (const tn of ["raise_capital", "ma", "rd"]) {
    trackBonusOrder(state.tracks[tn]).forEach((e) => queue.push({ track: tn, playerId: e.playerId, actionsRemaining: e.actions }));
  }
  const bmFilled = [];
  state.tracks.board_meeting.forEach((pid, i) => { if (pid !== null) bmFilled.push(i); });
  bmFilled.sort((a, b) => b - a).forEach((i) => queue.push({ track: "board_meeting", playerId: state.tracks.board_meeting[i], actionsRemaining: 1 }));
  return queue;`,
};
for (const [k, v] of Object.entries(N)) {
  if (!base.includes(v)) { console.error(`the engine changed shape around ${k} - update this probe`); process.exit(2); }
}
function splice(src, find, put, what) {
  const out = src.replace(find, put);
  if (out === src) { console.error(`the ${what} splice changed nothing - update this probe`); process.exit(2); }
  return out;
}

const SOLE10 = `  scores.sort((a, b) => b.s - a.s);
  const values = [10];
  let i = 0;
  while (i < scores.length && i < values.length) {
    let j = i;
    while (j + 1 < scores.length && scores[j + 1].s === scores[i].s) j++;
    const pot = values.slice(i, Math.min(j + 1, values.length)).reduce((a, b) => a + b, 0);
    const share = Math.floor(pot / (j - i + 1));
    if (share > 0) for (let k = i; k <= j; k++) addEP(scores[k].p, share, label, state.quarter);
    i = j + 1;
  }`;
const OWNER_HELPER = `
function hqNeighbourOwners(state, hq) {
  const seen = new Set(), byOwner = {};
  hq.footprint.forEach((pk) => orthOf(state.board, pk).forEach((n) => {
    if (hq.footprint.includes(n)) return;
    const id = state.board.occupiedBy[n];
    if (id === undefined || id === hq.id || seen.has(id)) return;
    for (const q of state.players) {
      const b = q.businesses.find((x) => x.id === id);
      if (b && !b.distressed) { seen.add(id); byOwner[q.id] = (byOwner[q.id] || 0) + 1; return; }
    }
  }));
  return byOwner;
}
`;
const TITHE = `function runMegacorpDividend(state, log) {
  for (const p of state.players) {
    for (const hq of megacorpHQs(p)) {
      for (const [id, n] of Object.entries(hqNeighbourOwners(state, hq))) {
        const q = state.players.find((x) => String(x.id) === String(id));
        if (!q) continue;
        addEP(q, 1 * n, \`Megacorp orbit: \${hq.megacorpName}\`, state.quarter);
        addEP(p, -1 * n, \`Megacorp tithe: \${hq.megacorpName}\`, state.quarter);
      }
    }
  }
  for (const p of state.players) {`;
const TITHE_PRICE = `  const __nb = hqNeighbourOwners(state, hq);
  const districtEP = -1 * Object.entries(__nb).reduce((a, [id, n]) => a + (String(id) === String(p.id) ? 0 : n), 0) * qLeft;`;
const BM_FIRST = `  const queue = [];
  const bmFilled = [];
  state.tracks.board_meeting.forEach((pid, i) => { if (pid !== null) bmFilled.push(i); });
  bmFilled.sort((a, b) => b - a).forEach((i) => queue.push({ track: "board_meeting", playerId: state.tracks.board_meeting[i], actionsRemaining: 1 }));
  for (const tn of ["raise_capital", "ma", "rd"]) {
    trackBonusOrder(state.tracks[tn]).forEach((e) => queue.push({ track: tn, playerId: e.playerId, actionsRemaining: e.actions }));
  }
  return queue;`;

const ARMS = [
  { key: "current", name: "as it ships" },
  { key: "land10", name: "land: 10 to the sole leader", land: true },
  { key: "lvl1", name: "companies: 1 EP a level", level: 1 },
  { key: "tithe", name: "Megacorps: 1 EP a quarter to every neighbour", tithe: true },
  { key: "half+tithe", name: "Megacorps: half value AND the tithe", tithe: true, half: true },
  { key: "bmFirst", name: "Board Meeting resolves first", bmFirst: true },
];

function engineFor(arm) {
  let logic = splice(base, N.hqHelper, OWNER_HELPER + N.hqHelper, "neighbour-owner helper");
  if (arm.land) {
    logic = splice(logic, N.awardBody, SOLE10, "ranked land award");
    logic = splice(logic, N.landConst, "const LAND_AWARD = { sole: 10, two: 5, many: 3 };", "land constant");
  }
  if (arm.level !== undefined) logic = splice(logic, N.levelEP, `const levelEP = (state) => ${arm.level};`, "level EP");
  if (arm.tithe) {
    logic = splice(logic, N.mcPayout, "", "megacorp district payout removed");
    logic = splice(logic, N.dividend, TITHE, "quarterly tithe");
    logic = splice(logic, N.botPrice, TITHE_PRICE, "bot merge price");
  }
  if (arm.half) {
    logic = splice(logic, N.tileEP, "  const [name, combo, __raw] = match.tile;\n  const ep = Math.round(__raw / 2);", "half tile");
    logic = splice(logic, N.brandFn, "const brandEPFor = (price, tier) => Math.floor(price / (2 * tier));", "half brand");
  }
  if (arm.bmFirst) logic = splice(logic, N.resolution, BM_FIRST, "board meeting first");
  const box = {};
  const sandbox = { console, Math, Set, Object, Array, JSON, String, box };
  vm.createContext(sandbox);
  vm.runInContext(logic + `
    box.exports = { initGame, mulberry32, advanceDraft, startPlanning, advancePlanning, epTotal, finalRank };
  `, sandbox);
  return box.exports;
}

function run(E, seats) {
  const T = { games: 0, changes: 0, everLed: 0, decidedAt: 0, decidedLate: 0,
    winnerTime: 0, checkpoints: 0, lastWordFlips: 0, wireToWire: 0 };
  for (let s = SEED0; s < SEED0 + GAMES; s++) {
    const st = E.initGame(seats - 1, s, ["Seat 1"], undefined, true, undefined);
    st.players[0].isHuman = false;
    if (st.phase === "drafting") { E.advanceDraft(st, () => {}); E.startPlanning(st); }
    const marks = [];
    E.advancePlanning(st, E.mulberry32(s + 777), (msg) => {
      const m = /^▶ Year \d+, Quarter (\d+)/.exec(String(msg));
      if (m) marks.push({ q: +m[1], eps: st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) })) });
    });
    if (st.phase !== "gameover") continue;
    T.games++;
    const winner = [...st.players].sort(E.finalRank)[0];
    /* One last reading AFTER end-of-game scoring, so the land awards, the cash and the
       Megacorp districts get to have their say - that swing is itself a tension
       measure, and stopping at the last quarter would hide it. */
    marks.push({ q: 13, eps: st.players.map((x) => ({ id: x.id, ep: E.epTotal(x) })) });

    let leader = null, changes = 0, winnerTime = 0, lastTook = null;
    const led = new Set();
    let beforeFinal = null;
    for (const mk of marks) {
      const top = Math.max(...mk.eps.map((x) => x.ep));
      if (top <= 0) continue;                       // nobody has scored yet
      const tied = mk.eps.filter((x) => x.ep === top).map((x) => x.id);
      tied.forEach((id) => led.add(id));
      /* Incumbency: being LEVELLED WITH is not being passed, so a leader who is still
         on top of the pile keeps the lead and no change is counted. */
      if (leader === null || !tied.includes(leader)) {
        if (leader !== null) changes++;
        leader = tied[0];
        if (leader === winner.id) lastTook = mk.q;
      }
      if (leader === winner.id) { winnerTime++; }
      T.checkpoints++;
      if (mk.q === 13) break;
      beforeFinal = leader;
    }
    T.changes += changes;
    T.everLed += led.size / seats;
    if (lastTook !== null) { T.decidedAt += Math.min(12, lastTook); if (lastTook >= 9) T.decidedLate++; }
    T.winnerTime += winnerTime / Math.max(1, marks.length);
    if (beforeFinal !== null && beforeFinal !== winner.id) T.lastWordFlips++;
    if (changes === 0) T.wireToWire++;
  }
  return T;
}

const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const pc = (x, tot) => (tot > 0 ? (100 * x / tot).toFixed(1) + "%" : "-");

const R = {};
for (const arm of ARMS) { const E = engineFor(arm); R[arm.key] = {}; for (const n of SIZES) R[arm.key][n] = run(E, n); }

console.log(`\n${GAMES} games a table size, seeds ${SEED0}..${SEED0 + GAMES - 1}, all-bot tables.`);
for (const a of ARMS) console.log(`  ${pad(a.key, 12)} ${a.name}`);
console.log("\n  " + pad("", 30) + SIZES.map((n) => rp(n + "p", 9)).join(""));
const block = (title, fn) => {
  console.log("  " + title);
  for (const arm of ARMS) console.log("    " + pad(arm.key, 28) + SIZES.map((n) => rp(fn(R[arm.key][n], n), 9)).join(""));
};
block("LEAD CHANGES a game", (T) => (T.changes / Math.max(1, T.games)).toFixed(2));
block("games nobody was ever passed (wire to wire)", (T) => pc(T.wireToWire, T.games));
block("share of the table that led at some point", (T) => pc(T.everLed, T.games));
block("DECIDED AT: quarter the winner last took the lead", (T) => (T.decidedAt / Math.max(1, T.games)).toFixed(1));
block("...games decided in the last third (Q9+)", (T) => pc(T.decidedLate, T.games));
block("share of the game the winner spent in front", (T) => pc(T.winnerTime, T.games));
block("THE LAST WORD: final scoring changed the winner", (T) => pc(T.lastWordFlips, T.games));
console.log("");
